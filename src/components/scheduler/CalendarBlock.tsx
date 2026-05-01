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
  onClick?: (item: ScheduledBlock, el: HTMLElement) => void;
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

function relativeLuminance(r: number, g: number, b: number) {
  const c = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function darken(hex: string, amount = 0.2) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const scale = 1 - amount;
  const r = Math.max(0, Math.floor(rgb.r * scale));
  const g = Math.max(0, Math.floor(rgb.g * scale));
  const b = Math.max(0, Math.floor(rgb.b * scale));
  return `rgb(${r}, ${g}, ${b})`;
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

export default function CalendarBlock({item, layout, compact = false, isActive = false, onClick}: Props) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleTruncated, setTitleTruncated] = useState(false);

  const isRecurring = item.source === 'recurring';
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

  let backgroundColor = categoryStyle.bg;
  let borderColor = categoryStyle.border;
  let textColor = categoryStyle.text;
  let recurringIconColor = 'currentColor';

  if (isRecurring) {
    const base = customColor ?? categoryStyle.border;
    backgroundColor = base;
    borderColor = darken(base, 0.2);
    const rgb = hexToRgb(base);
    const luminance = rgb ? relativeLuminance(rgb.r, rgb.g, rgb.b) : 0;
    textColor = luminance > 0.58 ? '#111827' : '#FFFFFF';
    recurringIconColor = luminance > 0.58 ? '#111827' : '#FFFFFF';
  }

  const padClass =
    tier === 'xs'
      ? 'px-1.5 py-0.5'
      : tier === 'sm'
        ? compact
          ? 'px-1.5 py-0.5'
          : 'px-2 py-1'
        : compact
          ? 'px-2 py-1.5'
          : 'px-3 py-2';

  const titleSizeClass = tier === 'xs' ? 'text-[11px]' : tier === 'sm' ? 'text-[12px]' : 'text-[13px]';
  const titleClamp = tier === 'xs' ? 1 : 2;
  const showTimeRow = tier === 'sm' || tier === 'lg';
  const showCategoryRow = tier === 'lg';
  const showRecurringIcon = isRecurring && heightPx >= 22;
  const hoverLift = heightPx > 40;

  return (
    <button
      type="button"
      data-block-id={item.id}
      title={needsRichTooltip ? fullTooltip : undefined}
      className={`absolute z-20 flex min-h-0 cursor-pointer flex-col rounded-[8px] border border-black/[0.08] text-left shadow-sm transition duration-150 ease-out dark:border-white/[0.12] ${padClass} ${
        isActive
          ? 'z-30 ring-2 ring-[#60A5FA] ring-offset-0 shadow-md'
          : `ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] ${hoverLift ? 'hover:z-30 hover:scale-[1.01] hover:shadow-md' : 'hover:z-30'}`
      } `}
      style={{
        top,
        left,
        width,
        height: heightPx,
        backgroundColor,
        borderColor,
        color: textColor,
        opacity: 1,
        overflow: 'hidden',
      }}
      onClick={evt => {
        if (!onClick) return;
        onClick(item, evt.currentTarget);
      }}
    >
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
            <span className="shrink-0 text-[10px] leading-none opacity-95" style={{color: recurringIconColor}}>
              ↻
            </span>
          )}
        </div>
        {showTimeRow && (
          <div className="shrink-0 truncate text-[12px] leading-[1.2] opacity-80">{formatRange(item.startTime, item.endTime)}</div>
        )}
        {showCategoryRow && (
          <div className="shrink-0 truncate text-[10px] leading-[1.2] opacity-70">{categoryLabelForItem(item)}</div>
        )}
      </div>
    </button>
  );
}
