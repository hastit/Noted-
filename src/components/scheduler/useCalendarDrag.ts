import {useCallback, useRef, useState} from 'react';
import type {ScheduledBlock} from '../../types/scheduler';

const SNAP_MIN = 15;
const DRAG_THRESHOLD_PX = 6;
const AUTO_SCROLL_ZONE_PX = 80;
const AUTO_SCROLL_SPEED_PX = 5;
const TOAST_MS = 5000;

type DragState = {
  block: ScheduledBlock;
  pointerId: number;
  grabOffsetX: number;
  grabOffsetY: number;
  blockWidth: number;
  blockHeight: number;
  startX: number;
  startY: number;
  hasMoved: boolean;
  lastClientX: number;
  lastClientY: number;
  rafId: number | null;
};

export type DragVisual = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DropPreview = {
  dayKey: string;
  startTime: number;
  endTime: number;
};

export type UndoToast = {
  blockId: string;
  message: string;
  originalDate: string;
  originalStart: number;
  originalEnd: number;
};

type Options = {
  pxPerMinute: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  bodyStartRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, patch: Partial<ScheduledBlock>) => void;
  onRecurringDrop?: (block: ScheduledBlock, preview: DropPreview) => void;
};

export type CalendarDragReturn = {
  draggingId: string | null;
  dragVisual: DragVisual | null;
  dropPreview: DropPreview | null;
  undoToast: UndoToast | null;
  dismissToast: () => void;
  startDrag: (e: React.PointerEvent, block: ScheduledBlock) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function fmtMin(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad2(m)} ${suffix}`;
}

function suppressClick(e: MouseEvent) {
  e.stopPropagation();
}

export function useCalendarDrag({
  pxPerMinute,
  scrollRef,
  bodyStartRef,
  onUpdate,
  onRecurringDrop,
}: Options): CalendarDragReturn {
  const dragRef = useRef<DragState | null>(null);
  const lastPreviewRef = useRef<DropPreview | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs so closures inside startDrag always see the latest values
  const pxPerMinRef = useRef(pxPerMinute);
  pxPerMinRef.current = pxPerMinute;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onRecurringDropRef = useRef(onRecurringDrop);
  onRecurringDropRef.current = onRecurringDrop;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setUndoToast(null);
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent, block: ScheduledBlock) => {
      // Guard: skip if already tracking a drag
      if (dragRef.current) return;

      // Capture the pointer so fast moves still reach this element's listeners
      const blockEl = e.currentTarget as HTMLElement;
      const blockRect = blockEl.getBoundingClientRect();

      try {
        blockEl.setPointerCapture(e.pointerId);
      } catch (_) {
        // setPointerCapture may fail in some environments; proceed anyway
      }

      dragRef.current = {
        block,
        pointerId: e.pointerId,
        grabOffsetX: e.clientX - blockRect.left,
        grabOffsetY: e.clientY - blockRect.top,
        blockWidth: blockRect.width,
        blockHeight: blockRect.height,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        rafId: null,
      };

      // ── Resolve drop target ──────────────────────────────────────────────────
      function resolvePreview(clientX: number, clientY: number): DropPreview | null {
        const ref = dragRef.current;
        const bodyEl = bodyStartRef.current;
        if (!ref || !bodyEl) return null;

        // Walk every element at the cursor; use closest() to find the day column
        // even when the cursor is over a child element (HourGrid row, block, etc.)
        let colEl: HTMLElement | null = null;
        const elements = document.elementsFromPoint(clientX, clientY);
        for (const el of elements) {
          const found = (el as HTMLElement).closest?.('[data-col-day]') as HTMLElement | null;
          if (found) { colEl = found; break; }
        }
        if (!colEl) return null;

        const dayKey = colEl.dataset.colDay;
        if (!dayKey) return null;

        const bodyTop = bodyEl.getBoundingClientRect().top;
        const ppm = pxPerMinRef.current;
        const blockTopMin = (clientY - bodyTop - ref.grabOffsetY) / ppm;
        const duration = ref.block.endTime - ref.block.startTime;
        const snapped = Math.round(blockTopMin / SNAP_MIN) * SNAP_MIN;
        const startTime = Math.max(0, Math.min(24 * 60 - duration, snapped));
        return {dayKey, startTime, endTime: startTime + duration};
      }

      // ── Auto-scroll ──────────────────────────────────────────────────────────
      function scrollTick() {
        const ref = dragRef.current;
        const scrollEl = scrollRef.current;
        if (!ref) return;
        if (scrollEl) {
          const rect = scrollEl.getBoundingClientRect();
          const py = ref.lastClientY;
          if (py - rect.top < AUTO_SCROLL_ZONE_PX) scrollEl.scrollTop -= AUTO_SCROLL_SPEED_PX;
          else if (rect.bottom - py < AUTO_SCROLL_ZONE_PX) scrollEl.scrollTop += AUTO_SCROLL_SPEED_PX;
        }
        ref.rafId = requestAnimationFrame(scrollTick);
      }

      // ── Pointer move ─────────────────────────────────────────────────────────
      function onMove(ev: PointerEvent) {
        const ref = dragRef.current;
        if (!ref) return;

        // Prevent browser scroll/pan during an active drag (non-passive listener)
        if (ref.hasMoved) ev.preventDefault();

        ref.lastClientX = ev.clientX;
        ref.lastClientY = ev.clientY;

        const dist = Math.hypot(ev.clientX - ref.startX, ev.clientY - ref.startY);

        if (!ref.hasMoved) {
          if (dist < DRAG_THRESHOLD_PX) return;

          // Threshold exceeded → activate drag
          ref.hasMoved = true;
          ev.preventDefault(); // Prevent scroll on the activating move event too
          setDraggingId(ref.block.id);
          document.body.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
          ref.rafId = requestAnimationFrame(scrollTick);
        }

        setDragVisual({
          x: ev.clientX - ref.grabOffsetX,
          y: ev.clientY - ref.grabOffsetY,
          width: ref.blockWidth,
          height: ref.blockHeight,
        });
        const computed = resolvePreview(ev.clientX, ev.clientY);
        // Keep the last valid preview so onUp can commit it even if the pointer
        // drifts off-column in the final frame before release.
        if (computed) lastPreviewRef.current = computed;
        setDropPreview(computed);
      }

      // ── Cleanup ──────────────────────────────────────────────────────────────
      function cleanup() {
        document.removeEventListener('pointermove', onMove, {capture: false} as EventListenerOptions);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        document.removeEventListener('keydown', onKeyDown);
        const ref = dragRef.current;
        if (ref?.rafId != null) cancelAnimationFrame(ref.rafId);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        lastPreviewRef.current = null;
      }

      // ── Pointer up ───────────────────────────────────────────────────────────
      function onUp(ev: PointerEvent) {
        const ref = dragRef.current;
        const moved = ref?.hasMoved ?? false;

        // Read the last stored preview BEFORE cleanup clears it and BEFORE
        // dragRef is nulled — resolvePreview reads dragRef.current internally.
        // Fallback: recompute from pointer position (dragRef still valid here).
        const preview = moved
          ? (lastPreviewRef.current ?? resolvePreview(ev.clientX, ev.clientY))
          : null;

        cleanup(); // clears lastPreviewRef, cancels RAF, removes listeners
        dragRef.current = null;
        setDraggingId(null);
        setDragVisual(null);
        setDropPreview(null);

        if (!ref || !moved) return;

        // Suppress the synthetic click that fires after pointerup on desktop
        window.addEventListener('click', suppressClick, {capture: true, once: true});

        if (
          preview &&
          (preview.dayKey !== ref.block.date || preview.startTime !== ref.block.startTime)
        ) {
          if (ref.block.source === 'recurring') {
            // Delegate to the confirmation dialog — CalendarView handles the rest.
            onRecurringDropRef.current?.(ref.block, preview);
            return;
          }

          const duration = ref.block.endTime - ref.block.startTime;
          onUpdateRef.current(ref.block.id, {
            date: preview.dayKey,
            startTime: preview.startTime,
            endTime: preview.endTime,
            durationMinutes: duration,
          });

          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          setUndoToast({
            blockId: ref.block.id,
            message: `Moved to ${fmtMin(preview.startTime)} – ${fmtMin(preview.endTime)}`,
            originalDate: ref.block.date,
            originalStart: ref.block.startTime,
            originalEnd: ref.block.endTime,
          });
          toastTimerRef.current = setTimeout(() => setUndoToast(null), TOAST_MS);
        }
      }

      // ── Escape cancels ───────────────────────────────────────────────────────
      function onKeyDown(ev: KeyboardEvent) {
        if (ev.key !== 'Escape') return;
        cleanup();
        dragRef.current = null;
        setDraggingId(null);
        setDragVisual(null);
        setDropPreview(null);
      }

      // Attach to document so events fire even when pointer moves outside the element.
      // {passive: false} on pointermove is required so ev.preventDefault() works.
      document.addEventListener('pointermove', onMove, {passive: false});
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
      document.addEventListener('keydown', onKeyDown);
    },
    [bodyStartRef, scrollRef],
  );

  return {draggingId, dragVisual, dropPreview, undoToast, dismissToast, startDrag};
}
