import {CalendarRange, Plus, Repeat2, Upload, X} from 'lucide-react';
import {createPortal} from 'react-dom';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {ScheduledBlock} from '../../types/scheduler';
import BlockEditPopover from './BlockEditPopover';
import CalendarBlock from './CalendarBlock';
import HourGrid from './HourGrid';
import {useCalendarDrag, type DropPreview} from './useCalendarDrag';
import ViewSwitcher from './ViewSwitcher';

type QuickAddType = 'manage-events' | 'routine' | 'import';

type SlotAdd = {
  dayKey: string;
  hour: number;
  pos: {top: number; left: number; openLeft: boolean};
};

type Props = {
  items: ScheduledBlock[];
  deadline?: string | null;
  onUpdate: (id: string, patch: Partial<ScheduledBlock>) => void;
  onDelete: (id: string) => void;
  onQuickAdd?: (type: QuickAddType) => void;
  onSlotCreate?: (dayKey: string, startMinute: number, durationMinutes: number, title: string) => void;
  onCommitRecurringDrop?: (block: ScheduledBlock, preview: DropPreview) => Promise<{undoId: string}>;
  onUndoRecurringDrop?: (undoId: string) => Promise<void>;
};

type SubView = 'day' | 'week';

type Layout = {
  item: ScheduledBlock;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

const QUICK_ADD_OPTIONS: Array<{
  type: QuickAddType;
  Icon: React.ComponentType<{size: number}>;
  label: string;
  desc: string;
  iconCls: string;
}> = [
  {
    type: 'manage-events',
    Icon: CalendarRange,
    label: 'Manage events',
    desc: 'Add or view your scheduled events',
    iconCls: 'border-violet-100/80 bg-violet-50/60 text-violet-500',
  },
  {
    type: 'routine',
    Icon: Repeat2,
    label: 'Add recurring routine',
    desc: 'Create something that repeats weekly',
    iconCls: 'border-indigo-100/80 bg-indigo-50/60 text-indigo-500',
  },
  {
    type: 'import',
    Icon: Upload,
    label: 'Import timetable',
    desc: 'Upload a school or work schedule',
    iconCls: 'border-rose-100/80 bg-rose-50/60 text-rose-500',
  },
];

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function startOfWeekSunday(d: Date) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${suffix}`;
}

function formatNowLabel(d: Date) {
  const h24 = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m} ${suffix}`;
}

function overlaps(a: ScheduledBlock, b: ScheduledBlock) {
  return !(a.endTime <= b.startTime || a.startTime >= b.endTime);
}

function buildLayouts(dayItems: ScheduledBlock[], pxPerMinute: number): Layout[] {
  const sorted = [...dayItems].sort((a, b) => a.startTime - b.startTime);
  const colEnds: number[] = [];
  const colIndex = new Map<string, number>();
  for (const item of sorted) {
    let found = -1;
    for (let i = 0; i < colEnds.length; i += 1) {
      if (colEnds[i] <= item.startTime) {
        found = i;
        break;
      }
    }
    const idx = found === -1 ? colEnds.length : found;
    if (found === -1) colEnds.push(item.endTime);
    else colEnds[idx] = item.endTime;
    colIndex.set(item.id, idx);
  }

  return sorted.map(item => {
    const overlapCount = Math.max(1, sorted.filter(other => overlaps(item, other)).length);
    const widthPct = 100 / overlapCount;
    const idx = colIndex.get(item.id) ?? 0;
    return {
      item,
      top: item.startTime * pxPerMinute,
      height: (item.endTime - item.startTime) * pxPerMinute,
      leftPct: idx * widthPct,
      widthPct,
    };
  });
}

/** Pixels per hour in the grid; all vertical positions use pxPerMinute = rowHeight / 60. */
const HOUR_ROW_HEIGHT_PX = {mobile: 80, desktop: 96} as const;

function TimeColumn({rowHeight}: {rowHeight: number}) {
  const labelOffsetPx = Math.round((7 * rowHeight) / 60);
  return (
    <div className="border-r border-black/[0.04]">
      {Array.from({length: 24}, (_, hour) => (
        <div key={hour} className="px-2 text-right text-[12px] font-normal text-[#B8C1D0]" style={{height: rowHeight}}>
          <span className="relative inline-block" style={{top: -labelOffsetPx}}>
            {formatHour(hour)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CalendarView({items, deadline, onUpdate, onDelete, onQuickAdd, onSlotCreate, onCommitRecurringDrop, onUndoRecurringDrop}: Props) {
  const [subView, setSubView] = useState<SubView>('week');
  const [cursorDate, setCursorDate] = useState<Date>(new Date());
  const [selected, setSelected] = useState<{block: ScheduledBlock; rect: DOMRect} | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [now, setNow] = useState<Date>(new Date());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bodyStartRef = useRef<HTMLDivElement | null>(null);
  const quickAddRef = useRef<HTMLDivElement | null>(null);
  const hasUserScrolledRef = useRef(false);
  const [bodyOffsetTop, setBodyOffsetTop] = useState(0);

  const [pendingRecurringDrop, setPendingRecurringDrop] = useState<{block: ScheduledBlock; preview: DropPreview} | null>(null);
  const [recurringUndoToast, setRecurringUndoToast] = useState<{undoId: string; message: string} | null>(null);
  const recurringToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recurringConfirmBusy, setRecurringConfirmBusy] = useState(false);
  const [recurringConfirmError, setRecurringConfirmError] = useState<string | null>(null);

  const [slotAdd, setSlotAdd] = useState<SlotAdd | null>(null);
  const [slotTitle, setSlotTitle] = useState('');
  const [slotDuration, setSlotDuration] = useState(60);
  const slotInputRef = useRef<HTMLInputElement | null>(null);

  const rowHeight = isMobile ? HOUR_ROW_HEIGHT_PX.mobile : HOUR_ROW_HEIGHT_PX.desktop;
  const pxPerMinute = rowHeight / 60;

  const {draggingId, dragVisual, dropPreview, undoToast, dismissToast, startDrag} = useCalendarDrag({
    pxPerMinute,
    scrollRef,
    bodyStartRef,
    onUpdate,
    onRecurringDrop: (block, preview) => setPendingRecurringDrop({block, preview}),
  });
  const todayKey = dateKey(new Date());
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dayKey = dateKey(cursorDate);

  const weekDays = useMemo(() => {
    const start = startOfWeekSunday(cursorDate);
    return Array.from({length: 7}, (_, idx) => {
      const date = new Date(start);
      date.setDate(start.getDate() + idx);
      return {date, key: dateKey(date)};
    });
  }, [cursorDate]);

  const visibleDays = subView === 'day' ? [{date: cursorDate, key: dayKey}] : weekDays;

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    const timer = window.setInterval(updateNow, 60_000);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
        setQuickAddOpen(false);
        setSlotAdd(null);
      }
    };
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-block-id]') || target.closest('[data-block-popover]')) return;
      if (target.closest('[data-slot-add-popover]')) return;
      setSelected(null);
      setSlotAdd(null);
      if (quickAddRef.current && !quickAddRef.current.contains(target as Node)) {
        setQuickAddOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  useEffect(() => {
    const updateBodyOffset = () => {
      if (!bodyStartRef.current) return;
      setBodyOffsetTop(bodyStartRef.current.offsetTop);
    };
    updateBodyOffset();
    window.addEventListener('resize', updateBodyOffset);
    return () => window.removeEventListener('resize', updateBodyOffset);
  }, [subView, cursorDate, rowHeight]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    hasUserScrolledRef.current = false;
    const onUserScroll = () => { hasUserScrolledRef.current = true; };
    container.addEventListener('scroll', onUserScroll, {once: true});
    const hour = now.getHours();
    const targetHour = hour < 7 || hour > 23 ? 8 : hour;
    const top = Math.max(0, targetHour * rowHeight - rowHeight * 1.3);
    if (!hasUserScrolledRef.current) container.scrollTo({top, behavior: 'smooth'});
    return () => container.removeEventListener('scroll', onUserScroll);
  }, [rowHeight, subView, cursorDate]); // intentionally excludes `now` — clock ticks must not re-scroll

  const POPOVER_W = 228;
  const POPOVER_H = 152;

  const openSlotAdd = (dayKey: string, hour: number, slotEl: HTMLElement) => {
    if (!onSlotCreate) return;
    const rect = slotEl.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const openLeft = spaceRight < POPOVER_W + 12;
    const left = openLeft ? rect.left - POPOVER_W - 4 : rect.right + 4;
    let top = rect.top;
    if (top + POPOVER_H > window.innerHeight - 12) top = window.innerHeight - POPOVER_H - 12;
    setSlotAdd({dayKey, hour, pos: {top, left, openLeft}});
    setSlotTitle('');
    setSlotDuration(60);
    setTimeout(() => slotInputRef.current?.focus(), 30);
  };

  const commitSlotAdd = () => {
    if (!slotAdd || !slotTitle.trim() || !onSlotCreate) return;
    onSlotCreate(slotAdd.dayKey, slotAdd.hour * 60, slotDuration, slotTitle.trim());
    setSlotAdd(null);
    setSlotTitle('');
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white/80 p-5 shadow-[0_4px_40px_-12px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
      <style>{`
        @keyframes qa-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>

      {/* ─── Header ─── */}
      <div className="mb-5 flex flex-col gap-4 border-b border-black/[0.04] pb-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-[19px] font-semibold tracking-tight text-[#111827]">Calendar</h3>
          <p className="mt-1 text-[13px] leading-5 text-[#6B7280]">
            See how your routines and AI-planned sessions fit together.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2.5 md:items-end">
          {/* Top row: Quick add pill + Day/Week switcher */}
          <div className="flex items-center gap-3">

            {/* ── Quick add pill ── */}
            {onQuickAdd && (
              <div ref={quickAddRef} className="relative">
                <button
                  type="button"
                  aria-label="Quick add"
                  onClick={() => setQuickAddOpen(v => !v)}
                  className={`
                    inline-flex items-center gap-2 rounded-full border
                    px-4 py-2 text-[13px] font-semibold
                    backdrop-blur-md transition-all duration-200
                    active:scale-[0.97]
                    ${quickAddOpen
                      ? 'border-violet-200/60 bg-gradient-to-r from-rose-100/80 via-violet-100/70 to-sky-100/60 text-[#374151] shadow-[0_6px_28px_rgba(139,92,246,0.22),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]'
                      : 'border-white/70 bg-gradient-to-r from-rose-50/90 via-violet-50/70 to-sky-50/60 text-[#4B5563] shadow-[0_2px_16px_rgba(139,92,246,0.14),0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.95)] hover:-translate-y-px hover:border-violet-200/50 hover:shadow-[0_6px_26px_rgba(139,92,246,0.22),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]'
                    }
                  `}
                >
                  {/* Gradient plus icon */}
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-colors ${
                      quickAddOpen ? 'bg-violet-500/15' : 'bg-violet-400/12'
                    }`}
                  >
                    <Plus
                      size={11}
                      strokeWidth={2.8}
                      className={quickAddOpen ? 'text-violet-600' : 'text-violet-500'}
                    />
                  </span>
                  <span className="hidden sm:inline">Quick add</span>
                </button>

                {/* ── Popover ── */}
                {quickAddOpen && (
                  <div
                    style={{animation: 'qa-in 180ms cubic-bezier(0.22,1,0.36,1)'}}
                    className="absolute right-0 top-full z-[70] mt-3 w-[268px] overflow-hidden rounded-2xl border border-black/[0.07] bg-white/[0.97] shadow-[0_16px_48px_-8px_rgba(15,23,42,0.18),0_4px_16px_-2px_rgba(15,23,42,0.06)] backdrop-blur-xl"
                  >
                    {/* Gradient accent bar at top */}
                    <div className="h-[3px] bg-gradient-to-r from-rose-300/80 via-violet-300/80 to-sky-300/80" />
                    {/* Inner glass highlight */}
                    <div className="pointer-events-none absolute inset-x-0 top-[3px] h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

                    <div className="space-y-px p-2">
                      {QUICK_ADD_OPTIONS.map(opt => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            onQuickAdd(opt.type);
                            setQuickAddOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 hover:bg-black/[0.035]"
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${opt.iconCls} shadow-[0_1px_3px_rgba(0,0,0,0.05)]`}>
                            <opt.Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#111827]">{opt.label}</div>
                            <div className="mt-px text-[11.5px] leading-[1.35] text-[#9CA3AF]">{opt.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Separator */}
            {onQuickAdd && (
              <div className="hidden h-5 w-px bg-black/[0.07] sm:block" />
            )}

            <ViewSwitcher<SubView>
              value={subView}
              onChange={setSubView}
              options={[
                {id: 'day', label: 'Day'},
                {id: 'week', label: 'Week'},
              ]}
            />
          </div>

          {/* Bottom row: navigation */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-black/[0.06] bg-white/60 p-1 backdrop-blur-sm">
            <button
              type="button"
              className="rounded-xl px-2.5 py-1.5 text-xs text-[#6B7280] transition hover:bg-white/90"
              onClick={() =>
                setCursorDate(prev => {
                  const next = new Date(prev);
                  next.setDate(prev.getDate() - (subView === 'week' ? 7 : 1));
                  return next;
                })
              }
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#374151] transition hover:bg-white/90"
              onClick={() => setCursorDate(new Date())}
            >
              Today
            </button>
            <button
              type="button"
              className="rounded-xl px-2.5 py-1.5 text-xs text-[#6B7280] transition hover:bg-white/90"
              onClick={() =>
                setCursorDate(prev => {
                  const next = new Date(prev);
                  next.setDate(prev.getDate() + (subView === 'week' ? 7 : 1));
                  return next;
                })
              }
            >
              Next
            </button>
            {deadline && (
              <button
                type="button"
                className="ml-1 rounded-xl bg-rose-50/80 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100/80"
                onClick={() => setCursorDate(fromDateKey(deadline))}
              >
                Jump to deadline
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Calendar grid ─── */}
      <div ref={scrollRef} className="max-h-[68vh] overflow-auto">
        <div className="min-w-[980px]">
          <div className="relative grid" style={{gridTemplateColumns: `56px repeat(${visibleDays.length}, minmax(140px, 1fr)) 56px`}}>
            <div className="sticky top-0 z-[60] bg-white/95 backdrop-blur-sm" />
            {visibleDays.map(day => {
              const isToday = day.key === todayKey;
              return (
                <div key={day.key} className={`sticky top-0 z-[60] border-x border-black/[0.04] pb-3 pt-1 text-center backdrop-blur-sm ${isToday ? 'bg-indigo-50/80' : 'bg-white/95'}`}>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                    {day.date.toLocaleDateString(undefined, {weekday: 'short'})}
                  </div>
                  {isToday ? (
                    <div className="mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-400 text-[20px] leading-none text-white">
                      {day.date.toLocaleDateString(undefined, {day: 'numeric'})}
                    </div>
                  ) : (
                    <div className="mt-1 text-[30px] font-normal leading-none text-[#1F2937]">
                      {day.date.toLocaleDateString(undefined, {day: 'numeric'})}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="sticky top-0 z-[60] bg-white/95 text-right text-[11px] font-normal text-[#B8C1D0] backdrop-blur-sm">
              <div className="pr-2 pt-1">EST</div>
              <div className="pr-2">GMT-5</div>
            </div>

            <div ref={bodyStartRef} className="relative">
              <TimeColumn rowHeight={rowHeight} />
              <div className="pointer-events-none absolute left-1 top-0 z-30 -translate-y-1/2 rounded-full bg-rose-400/85 px-2 py-0.5 text-[10px] font-medium text-white" style={{top: nowMinutes * pxPerMinute}}>
                {formatNowLabel(now)}
              </div>
            </div>

            {visibleDays.map(day => {
              const dayItems = items.filter(item => item.date === day.key);
              const layouts = buildLayouts(dayItems, pxPerMinute);
              const isToday = day.key === todayKey;
              return (
                <div
                  key={day.key}
                  data-col-day={day.key}
                  className="relative border-r border-black/[0.04]"
                  style={{backgroundColor: isToday ? 'rgba(235,233,255,0.45)' : 'transparent'}}
                >
                  <HourGrid
                    rowHeight={rowHeight}
                    onSlotClick={onSlotCreate ? (hour, el) => openSlotAdd(day.key, hour, el) : undefined}
                  />
                  {isToday && (
                    <div
                      className="pointer-events-none absolute z-[11] h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-400"
                      style={{left: 0, top: nowMinutes * pxPerMinute}}
                    />
                  )}
                  {/* Drop preview ghost */}
                  {dropPreview && dropPreview.dayKey === day.key && (
                    <div
                      className="pointer-events-none absolute z-[25] rounded-[8px]"
                      style={{
                        top: dropPreview.startTime * pxPerMinute,
                        height: (dropPreview.endTime - dropPreview.startTime) * pxPerMinute,
                        left: 2,
                        right: 2,
                        border: '2px dashed rgba(99,102,241,0.55)',
                        backgroundColor: 'rgba(238,242,255,0.45)',
                      }}
                    />
                  )}
                  {layouts.map(layout => (
                    <CalendarBlock
                      key={layout.item.id}
                      item={layout.item}
                      layout={layout}
                      compact={subView === 'week'}
                      isActive={selected?.block.id === layout.item.id}
                      isDragging={draggingId === layout.item.id}
                      onDragStart={startDrag}
                      onClick={(block, el) => {
                        if (block.source === 'recurring') return;
                        setSelected({block, rect: el.getBoundingClientRect()});
                      }}
                    />
                  ))}
                </div>
              );
            })}

            <TimeColumn rowHeight={rowHeight} />

            <div
              className="pointer-events-none absolute z-10 bg-rose-400/55"
              style={{
                left: 56,
                right: 56,
                top: bodyOffsetTop + nowMinutes * pxPerMinute,
                height: 1.5,
              }}
            />
          </div>
        </div>
      </div>

      {selected && (
        <BlockEditPopover
          block={selected.block}
          anchorRect={selected.rect}
          onClose={() => setSelected(null)}
          onSave={updated => {
            onUpdate(updated.id, {
              title: updated.title,
              date: updated.date,
              startTime: updated.startTime,
              endTime: updated.endTime,
              durationMinutes: updated.durationMinutes,
            });
          }}
          onDelete={id => onDelete(id)}
        />
      )}

      {/* ── Floating drag clone (fixed, follows cursor) ── */}
      {dragVisual && draggingId && (() => {
        const block = items.find(b => b.id === draggingId);
        if (!block) return null;
        let bg: string, border: string, stripe: string, text: string;
        if (block.source === 'recurring') {
          bg = '#F5F3FF'; border = '#DDD6FE'; stripe = '#7C3AED'; text = '#3B0764';
        } else if (block.source === 'ai') {
          bg = '#EEEEFF'; border = '#C4C4FA'; stripe = '#6366F1'; text = '#312E81';
        } else {
          bg = '#FFF8EE'; border = '#FDE4A0'; stripe = '#D97706'; text = '#78350F';
        }
        return (
          <div
            style={{
              position: 'fixed',
              top: dragVisual.y,
              left: dragVisual.x,
              width: dragVisual.width,
              height: dragVisual.height,
              pointerEvents: 'none',
              zIndex: 9999,
              opacity: 0.92,
              transform: 'scale(1.03) rotate(-0.4deg)',
              transformOrigin: 'top left',
              boxShadow: '0 12px 40px -8px rgba(99,102,241,0.35), 0 4px 16px rgba(0,0,0,0.12)',
              borderRadius: 8,
              backgroundColor: bg,
              border: `1px solid ${border}`,
              borderLeft: `3px solid ${stripe}`,
              overflow: 'hidden',
              padding: '4px 8px 4px 10px',
              color: text,
            }}
          >
            <div style={{fontSize: 12, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>
              {block.title}
            </div>
          </div>
        );
      })()}

      {/* ── Recurring occurrence confirmation dialog ── */}
      {pendingRecurringDrop && (() => {
        const {block, preview} = pendingRecurringDrop;
        const fmtDate = (ymd: string) => {
          const d = new Date(`${ymd}T12:00:00`);
          return d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
        };
        const fmtTime = (min: number) => {
          const h24 = Math.floor(min / 60);
          const m = String(min % 60).padStart(2, '0');
          const suffix = h24 >= 12 ? 'PM' : 'AM';
          const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
          return `${h12}:${m} ${suffix}`;
        };
        const targetDate = fmtDate(preview.dayKey);
        const targetTime = `${fmtTime(preview.startTime)} – ${fmtTime(preview.endTime)}`;
        const isSameDay = preview.dayKey === block.date;
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-[2px]"
              onClick={() => { if (!recurringConfirmBusy) { setPendingRecurringDrop(null); setRecurringConfirmError(null); } }}
            />
            {/* Dialog */}
            <div className="fixed left-1/2 top-1/2 z-[10001] w-[calc(100vw-2rem)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/[0.08] bg-white px-5 py-5 shadow-[0_24px_64px_-12px_rgba(15,23,42,0.22)]">
              <div className="mb-1 text-[15px] font-semibold text-[#1E293B]">Move this occurrence?</div>
              <p className="mb-4 text-[13px] leading-[1.5] text-[#64748B]">
                {isSameDay
                  ? <>This will only move <span className="font-medium text-[#334155]">{block.title}</span> on {targetDate} to {targetTime}. Your recurring routine stays the same.</>
                  : <>This will only move <span className="font-medium text-[#334155]">{block.title}</span> to {targetDate} at {targetTime}. Your recurring routine stays the same.</>
                }
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={recurringConfirmBusy}
                  className="flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  onClick={async () => {
                    if (!onCommitRecurringDrop || recurringConfirmBusy) return;
                    setRecurringConfirmBusy(true);
                    setRecurringConfirmError(null);
                    try {
                      const {undoId} = await onCommitRecurringDrop(block, preview);
                      const msg = isSameDay
                        ? `Moved "${block.title}" to ${targetTime}`
                        : `Moved "${block.title}" to ${targetDate}, ${targetTime}`;
                      setPendingRecurringDrop(null);
                      setRecurringConfirmError(null);
                      if (recurringToastTimerRef.current) clearTimeout(recurringToastTimerRef.current);
                      setRecurringUndoToast({undoId, message: msg});
                      recurringToastTimerRef.current = setTimeout(() => setRecurringUndoToast(null), 6000);
                    } catch (err) {
                      setRecurringConfirmError(err instanceof Error ? err.message : 'Failed to move this occurrence.');
                    } finally {
                      setRecurringConfirmBusy(false);
                    }
                  }}
                >
                  {recurringConfirmBusy ? 'Moving…' : 'Move this occurrence'}
                </button>
                {recurringConfirmError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{recurringConfirmError}</p>
                )}
                <button
                  type="button"
                  disabled={recurringConfirmBusy}
                  className="rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[13px] font-medium text-[#374151] transition hover:bg-[#F8FAFC] disabled:opacity-60"
                  onClick={() => { setPendingRecurringDrop(null); setRecurringConfirmError(null); }}
                >
                  Cancel
                </button>
                <div className="mt-0.5 text-center text-[11px] text-[#94A3B8]">
                  Entire routine · Coming soon
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Undo toast (non-recurring) ── */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/[0.97] px-4 py-3 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <span className="text-[13px] text-[#374151]">{undoToast.message}</span>
          <button
            type="button"
            className="text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-700"
            onClick={() => {
              onUpdate(undoToast.blockId, {
                date: undoToast.originalDate,
                startTime: undoToast.originalStart,
                endTime: undoToast.originalEnd,
                durationMinutes: undoToast.originalEnd - undoToast.originalStart,
              });
              dismissToast();
            }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={dismissToast}
            className="text-[#94A3B8] transition hover:text-[#475569]"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Slot add popover ── */}
      {slotAdd && createPortal(
        <div
          data-slot-add-popover
          style={{
            position: 'fixed',
            top: slotAdd.pos.top,
            left: slotAdd.pos.left,
            width: POPOVER_W,
            zIndex: 10050,
          }}
          className="rounded-2xl border border-black/[0.08] bg-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18),0_4px_12px_-2px_rgba(15,23,42,0.06)] overflow-hidden"
        >
          {/* Accent bar */}
          <div className="h-[2.5px] bg-gradient-to-r from-indigo-300/80 via-violet-300/80 to-sky-300/80" />

          <div className="p-3">
            {/* Time label */}
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-[#94A3B8]">
              {(() => {
                const h = slotAdd.hour;
                const suffix = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 === 0 ? 12 : h % 12;
                return `${h12}:00 ${suffix} · ${new Date(`${slotAdd.dayKey}T12:00:00`).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}`;
              })()}
            </p>

            {/* Title input */}
            <input
              ref={slotInputRef}
              type="text"
              value={slotTitle}
              onChange={e => setSlotTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitSlotAdd();
                if (e.key === 'Escape') setSlotAdd(null);
              }}
              placeholder="Event title…"
              className="mb-2.5 w-full rounded-xl border-none bg-black/[0.04] px-3 py-2 text-[13px] font-medium text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
            />

            {/* Duration pills */}
            <div className="mb-3 flex gap-1.5">
              {[
                {label: '30m', val: 30},
                {label: '1h', val: 60},
                {label: '2h', val: 120},
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSlotDuration(opt.val)}
                  className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
                    slotDuration === opt.val
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-black/[0.04] text-[#6B7280] hover:bg-black/[0.07]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!slotTitle.trim()}
                onClick={commitSlotAdd}
                className="flex-1 rounded-xl bg-indigo-600 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setSlotAdd(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/[0.04] text-[#94A3B8] transition hover:bg-black/[0.08] hover:text-[#475569]"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Undo toast (recurring occurrence) ── */}
      {recurringUndoToast && (
        <div className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/[0.97] px-4 py-3 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <span className="text-[13px] text-[#374151]">{recurringUndoToast.message}</span>
          <button
            type="button"
            className="text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-700"
            onClick={async () => {
              const {undoId} = recurringUndoToast;
              if (recurringToastTimerRef.current) clearTimeout(recurringToastTimerRef.current);
              setRecurringUndoToast(null);
              await onUndoRecurringDrop?.(undoId);
            }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              if (recurringToastTimerRef.current) clearTimeout(recurringToastTimerRef.current);
              setRecurringUndoToast(null);
            }}
            className="text-[#94A3B8] transition hover:text-[#475569]"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
