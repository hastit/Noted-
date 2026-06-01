import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {ScheduledBlock} from '../../types/scheduler';
import {categorizeBlock, styleFromRecurringCategory} from '../../utils/blockCategories';

type Layout = {
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

type Props = {
  item: ScheduledBlock;
  layout: Layout;
  compact?: boolean;
  isActive?: boolean;
  isDragging?: boolean;
  onClick?: (item: ScheduledBlock, el: HTMLElement) => void;
  onDragStart?: (e: React.PointerEvent, item: ScheduledBlock) => void;
};

/** Tiers match ~15 min / ~30–45 min / ~60+ min at 96px per hour (after vertical inset). */
type HeightTier = 'xs' | 'sm' | 'lg';

function formatTime(minutesFromMidnight: number) {
  const h24 = Math.floor(minutesFromMidnight / 60);
  const min = String(minutesFromMidnight % 60).padStart(2, '0');
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min}`;
}

function formatRange(start: number, end: number) {
  const endH24 = Math.floor(end / 60);
  const suffix = endH24 >= 12 ? 'PM' : 'AM';
  return `${formatTime(start)} - ${formatTime(end)} ${suffix}`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/** Blend hex color toward white at the given amount (0 = full color, 1 = pure white). */
function toPastel(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#F1F5F9';
  const r = Math.round(rgb.r * amount + 255 * (1 - amount));
  const g = Math.round(rgb.g * amount + 255 * (1 - amount));
  const b = Math.round(rgb.b * amount + 255 * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

function toRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function categoryLabelForItem(item: ScheduledBlock): string {
  if (item.colorCategory) {
    const c = item.colorCategory;
    return c.charAt(0).toUpperCase() + c.slice(1);
  }
  const t = item.title.toLowerCase();
  if (['study', 'exam', 'homework', 'read', 'notes', 'flashcards', 'review', 'quiz'].some(k => t.includes(k))) return 'Study';
  if (['work', 'meeting', 'email', 'project', 'deadline', 'task'].some(k => t.includes(k))) return 'Work';
  if (['workout', 'gym', 'run', 'exercise', 'sport', 'yoga'].some(k => t.includes(k))) return 'Sport';
  if (['personal', 'errand', 'appointment', 'call', 'grocery'].some(k => t.includes(k))) return 'Personal';
  return 'General';
}

function tierForHeight(heightPx: number): HeightTier {
  if (heightPx < 32) return 'xs';
  if (heightPx < 88) return 'sm';
  return 'lg';
}

export default function CalendarBlock({item, layout, compact = false, isActive = false, isDragging = false, onClick, onDragStart}: Props) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleTruncated, setTitleTruncated] = useState(false);

  const isRecurring = item.source === 'recurring';
  const isDraggable = !!onDragStart;
  const categoryStyle = isRecurring ? styleFromRecurringCategory(item.colorCategory) : categorizeBlock(item.title);
  const customColor = item.customColor && /^#[0-9A-Fa-f]{6}$/.test(item.customColor) ? item.customColor : null;
  const horizontalGap = compact ? 2 : 3;
  const width = `calc(${layout.widthPct}% - ${horizontalGap * 2}px)`;
  const left = `calc(${layout.leftPct}% + ${horizontalGap}px)`;

  /** 1px inset top + bottom so adjacent blocks read as separate tiles */
  const verticalInset = 2;
  const top = layout.top + verticalInset / 2;
  const rawInner = Math.max(0, layout.height - verticalInset);
  /** At least 24px when the slot is tall enough; otherwise fill the slot minus gap (15 min ≈ 22px). */
  const heightPx = rawInner === 0 ? 24 : rawInner < 24 ? rawInner : Math.max(24, rawInner);

  const tier = tierForHeight(heightPx);
  const hasStripe = tier !== 'xs';

  const fullTooltip = useMemo(() => {
    const timeStr = formatRange(item.startTime, item.endTime);
    return `${item.title} — ${timeStr} — ${categoryLabelForItem(item)}`;
  }, [item]);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) {
      setTitleTruncated(false);
      return;
    }
    const yOverflow = el.scrollHeight > el.clientHeight + 1;
    const xOverflow = el.scrollWidth > el.clientWidth + 1;
    setTitleTruncated(yOverflow || xOverflow);
  }, [item.title, heightPx, tier, compact]);

  const needsRichTooltip = heightPx < 88 || titleTruncated;

  // Base from category
  let backgroundColor = categoryStyle.bg;
  let borderColor = categoryStyle.border;
  let textColor = categoryStyle.text;
  let accentStripeColor: string = categoryStyle.border;
  let recurringIconColor = categoryStyle.border;

  if (isRecurring) {
    // Recurring events: soft pastel background from custom/category color + colored stripe
    const base = customColor ?? categoryStyle.border;
    backgroundColor = toPastel(base, 0.15);
    borderColor = toRgba(base, 0.25);
    accentStripeColor = base;
    recurringIconColor = base;
    textColor = '#1e293b'; // always dark on pastel background
  } else if (item.source === 'ai') {
    // AI-generated (saved) sessions: soft indigo
    backgroundColor = '#EEEEFF';
    borderColor = '#C4C4FA';
    accentStripeColor = '#6366F1';
    textColor = '#312E81';
  } else if (item.source === 'task') {
    // Task-derived blocks: warm amber
    backgroundColor = '#FFF8EE';
    borderColor = '#FDE4A0';
    accentStripeColor = '#D97706';
    textColor = '#78350F';
  }

  // Extra left padding when stripe is shown (3px stripe + breathing room)
  const padClass =
    tier === 'xs'
      ? 'px-1.5 py-0.5'
      : tier === 'sm'
        ? compact
          ? 'pl-[10px] pr-1.5 py-0.5'
          : 'pl-3 pr-2 py-1'
        : compact
          ? 'pl-3 pr-2 py-1.5'
          : 'pl-3.5 pr-3 py-2';

  const titleSizeClass = tier === 'xs' ? 'text-[11px]' : tier === 'sm' ? 'text-[12px]' : 'text-[13px]';
  const titleClamp = tier === 'xs' ? 1 : 2;
  const showTimeRow = tier === 'sm' || tier === 'lg';
  const showCategoryRow = tier === 'lg';
  const showRecurringIcon = isRecurring && heightPx >= 22;
  const hoverLift = heightPx > 40;

  return (
    <div
      role="button"
      tabIndex={0}
      data-block-id={item.id}
      data-calendar-draggable={isDraggable ? 'true' : undefined}
      title={needsRichTooltip ? fullTooltip : undefined}
      className={`absolute z-20 flex min-h-0 flex-col rounded-[8px] border text-left shadow-[0_1px_3px_rgba(0,0,0,0.07)] transition duration-150 ease-out ${padClass} ${
        isActive
          ? 'z-30 shadow-lg ring-2 ring-[#818CF8]/60 ring-offset-1'
          : `ring-1 ring-inset ring-black/[0.05] ${hoverLift ? 'hover:z-30 hover:brightness-[0.97] hover:shadow-md' : 'hover:z-30'}`
      }`}
      style={{
        top,
        left,
        width,
        height: heightPx,
        backgroundColor,
        borderColor,
        color: textColor,
        overflow: 'hidden',
        opacity: isDragging ? 0 : 1,
        cursor: isDraggable ? 'grab' : 'pointer',
        touchAction: isDraggable ? 'none' : 'auto',
        userSelect: 'none',
      }}
      onPointerDown={(ev: React.PointerEvent<HTMLDivElement>) => {
        if (ev.button !== 0) return;
        // Do NOT call preventDefault here — it silently kills the click event,
        // breaking click-to-edit. preventDefault is handled in pointermove instead.
        if (onDragStart) onDragStart(ev, item);
      }}
      onClick={evt => {
        if (!onClick) return;
        onClick(item, evt.currentTarget as HTMLElement);
      }}
      onKeyDown={evt => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          if (!onClick) return;
          onClick(item, evt.currentTarget as HTMLElement);
        }
      }}
    >
      {/* Colored left accent stripe for sm/lg blocks */}
      {hasStripe && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 top-0 w-[3px]"
          style={{backgroundColor: accentStripeColor}}
        />
      )}

      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 items-start gap-0.5 overflow-hidden">
          <div
            ref={titleRef}
            className={`min-h-0 min-w-0 flex-1 font-semibold leading-tight ${titleSizeClass}`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: titleClamp,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </div>
          {showRecurringIcon && (
            <span className="shrink-0 text-[10px] leading-none opacity-75" style={{color: recurringIconColor}}>
              ↻
            </span>
          )}
        </div>
        {showTimeRow && (
          <div className="shrink-0 truncate text-[12px] leading-[1.2] opacity-65">{formatRange(item.startTime, item.endTime)}</div>
        )}
        {showCategoryRow && (
          <div className="shrink-0 truncate text-[10px] leading-[1.2] opacity-55">{categoryLabelForItem(item)}</div>
        )}
      </div>
      {/* Visible drag handle — confirms block is draggable */}
      {isDraggable && tier !== 'xs' && (
        <div className="pointer-events-none absolute right-1.5 top-1 select-none text-[9px] leading-none opacity-20">⠿</div>
      )}
    </div>
  );
}
