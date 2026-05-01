import {useEffect, useMemo, useRef, useState} from 'react';
import type {ScheduledBlock} from '../../types/scheduler';
import BlockEditPopover from './BlockEditPopover';
import CalendarBlock from './CalendarBlock';
import HourGrid from './HourGrid';
import ViewSwitcher from './ViewSwitcher';

type Props = {
  items: ScheduledBlock[];
  deadline?: string | null;
  onUpdate: (id: string, patch: Partial<ScheduledBlock>) => void;
  onDelete: (id: string) => void;
};

type SubView = 'day' | 'week';

type Layout = {
  item: ScheduledBlock;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

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
    <div className="border-r border-[#F3F4F6]">
      {Array.from({length: 24}, (_, hour) => (
        <div key={hour} className="px-2 text-right text-[12px] font-normal text-[#9CA3AF]" style={{height: rowHeight}}>
          <span className="relative inline-block" style={{top: -labelOffsetPx}}>
            {formatHour(hour)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CalendarView({items, deadline, onUpdate, onDelete}: Props) {
  const [subView, setSubView] = useState<SubView>('week');
  const [cursorDate, setCursorDate] = useState<Date>(new Date());
  const [selected, setSelected] = useState<{block: ScheduledBlock; rect: DOMRect} | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [now, setNow] = useState<Date>(new Date());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bodyStartRef = useRef<HTMLDivElement | null>(null);
  const [bodyOffsetTop, setBodyOffsetTop] = useState(0);

  const rowHeight = isMobile ? HOUR_ROW_HEIGHT_PX.mobile : HOUR_ROW_HEIGHT_PX.desktop;
  const pxPerMinute = rowHeight / 60;
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
      if (event.key === 'Escape') setSelected(null);
    };
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-block-id]') || target.closest('[data-block-popover]')) return;
      setSelected(null);
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
    const hour = now.getHours();
    const targetHour = hour < 7 || hour > 23 ? 8 : hour;
    const top = Math.max(0, targetHour * rowHeight - rowHeight * 1.3);
    container.scrollTo({top, behavior: 'smooth'});
  }, [rowHeight, subView, cursorDate, now]);

  return (
    <div className="rounded-2xl border border-[#F3F4F6] bg-white p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ViewSwitcher<SubView>
          value={subView}
          onChange={setSubView}
          options={[
            {id: 'day', label: 'Day'},
            {id: 'week', label: 'Week'},
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-[#6B7280] hover:bg-[#F9FAFB]"
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
          <button type="button" className="rounded-md px-2 py-1 text-xs text-[#374151] hover:bg-[#F9FAFB]" onClick={() => setCursorDate(new Date())}>
            Today
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-[#6B7280] hover:bg-[#F9FAFB]"
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
              className="ml-1 rounded-md bg-[#EFF6FF] px-2 py-1 text-xs text-[#2563EB]"
              onClick={() => setCursorDate(fromDateKey(deadline))}
            >
              Jump to deadline
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[68vh] overflow-auto">
        <div className="min-w-[980px]">
          <div className="relative grid" style={{gridTemplateColumns: `56px repeat(${visibleDays.length}, minmax(140px, 1fr)) 56px`}}>
            <div className="sticky top-0 z-20 bg-white" />
            {visibleDays.map(day => {
              const isToday = day.key === todayKey;
              return (
                <div key={day.key} className={`sticky top-0 z-20 border-x border-[#F3F4F6] pb-3 pt-1 text-center ${isToday ? 'bg-[#EEF6FF]' : 'bg-white'}`}>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                    {day.date.toLocaleDateString(undefined, {weekday: 'short'})}
                  </div>
                  {isToday ? (
                    <div className="mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#60A5FA] text-[20px] leading-none text-white">
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
            <div className="sticky top-0 z-20 bg-white text-right text-[11px] font-normal text-[#9CA3AF]">
              <div className="pr-2 pt-1">EST</div>
              <div className="pr-2">GMT-5</div>
            </div>

            <div ref={bodyStartRef} className="relative">
              <TimeColumn rowHeight={rowHeight} />
              <div className="pointer-events-none absolute left-1 top-0 z-30 -translate-y-1/2 rounded-full bg-[#60A5FA] px-2 py-0.5 text-[11px] text-white" style={{top: nowMinutes * pxPerMinute}}>
                {formatNowLabel(now)}
              </div>
            </div>

            {visibleDays.map(day => {
              const dayItems = items.filter(item => item.date === day.key);
              const layouts = buildLayouts(dayItems, pxPerMinute);
              const isToday = day.key === todayKey;
              return (
                <div key={day.key} className="relative border-r border-[#F3F4F6]" style={{backgroundColor: isToday ? '#EFF6FF' : '#FFFFFF'}}>
                  <HourGrid rowHeight={rowHeight} />
                  {isToday && (
                    <div
                      className="pointer-events-none absolute z-[11] h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3B82F6]"
                      style={{left: 0, top: nowMinutes * pxPerMinute}}
                    />
                  )}
                  {layouts.map(layout => (
                    <CalendarBlock
                      key={layout.item.id}
                      item={layout.item}
                      layout={layout}
                      compact={subView === 'week'}
                      isActive={selected?.block.id === layout.item.id}
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
              className="pointer-events-none absolute z-10 bg-[#3B82F6]"
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
    </div>
  );
}
