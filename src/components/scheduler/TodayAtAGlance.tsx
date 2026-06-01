import {CalendarDays, CheckCircle2, Clock3, Play, SkipForward, Sparkles, Zap} from 'lucide-react';
import {useState} from 'react';
import type {ScheduledBlock} from '../../types/scheduler';
import {categorizeBlock} from '../../utils/blockCategories';
import {usePomodoro} from '../../context/PomodoroContext';

type Props = {
  items: ScheduledBlock[];
  onUpdate?: (id: string, patch: Partial<ScheduledBlock>) => void;
  onDelete?: (id: string) => void;
};

const DAY_START = 8 * 60;
const DAY_END = 21 * 60;

// ─── Formatting helpers ───────────────────────────────────────────────────────

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fmtHM(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

function fmt12h(min: number) {
  const h24 = Math.floor(min / 60);
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(min % 60)} ${suffix}`;
}

function fmtDur(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  return `${minutes}m`;
}

function fmtDateLong(date: Date) {
  return date.toLocaleDateString(undefined, {weekday: 'long', day: 'numeric', month: 'long'});
}

function dayLabel(dateYmd: string) {
  const today = new Date();
  const target = new Date(`${dateYmd}T12:00:00`);
  const todayMid = new Date(`${toYmd(today)}T12:00:00`);
  const diff = Math.round((target.getTime() - todayMid.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 1) return 'Tomorrow';
  if (diff === 2) return 'In 2 days';
  if (diff > 2 && diff < 7) return `In ${diff} days`;
  return target.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
}

function sourceLabel(item: ScheduledBlock) {
  if (item.source === 'recurring') return 'Routine';
  if (item.source === 'task') return 'Task';
  return 'AI';
}

// ─── Free slot computation ────────────────────────────────────────────────────

type FreeSlot = {start: number; end: number; duration: number};

function computeFreeSlots(todayItems: ScheduledBlock[], fromMinutes: number): FreeSlot[] {
  const sorted = [...todayItems].sort((a, b) => a.startTime - b.startTime);
  const slots: FreeSlot[] = [];
  let cursor = Math.max(fromMinutes, DAY_START);

  for (const item of sorted) {
    if (item.endTime <= cursor) continue;
    const blockStart = item.startTime;
    if (blockStart > cursor + 14) {
      slots.push({start: cursor, end: blockStart, duration: blockStart - cursor});
    }
    cursor = Math.max(cursor, item.endTime);
  }

  if (cursor < DAY_END - 14) {
    slots.push({start: cursor, end: Math.min(cursor + DAY_END, DAY_END), duration: DAY_END - cursor});
  }

  return slots.filter(s => s.duration >= 15);
}

function energyLabel(slot: FreeSlot, sessionCount: number): string {
  const hour = Math.floor(slot.start / 60);
  const dur = slot.duration;
  if (dur < 25) return 'Quick task or short break';
  if (hour < 11 && dur >= 90) return 'Best for deep work';
  if (hour < 11 && dur >= 30) return 'Good for focused review';
  if (hour < 11) return 'Good for a short task';
  if (hour >= 11 && hour < 14 && dur >= 60) return 'Good for review or study';
  if (hour >= 11 && hour < 14) return 'Good for light tasks';
  if (hour >= 14 && hour < 17 && dur >= 60) return 'Good for a focus session';
  if (hour >= 14 && hour < 17) return 'Good for reading or notes';
  if (hour >= 17 && sessionCount >= 4) return 'Consider winding down';
  if (hour >= 17) return 'Good for light revision';
  return 'Good for rest';
}

// ─── Hero card state ──────────────────────────────────────────────────────────

type HeroState =
  | {kind: 'in-progress'; item: ScheduledBlock; minutesLeft: number}
  | {kind: 'coming-up'; item: ScheduledBlock; minutesUntil: number}
  | {kind: 'free'; slot: FreeSlot}
  | {kind: 'clear'};

function computeHeroState(todayItems: ScheduledBlock[], nowMinutes: number, freeSlots: FreeSlot[]): HeroState {
  const current = todayItems.find(i => i.startTime <= nowMinutes && i.endTime > nowMinutes);
  if (current) return {kind: 'in-progress', item: current, minutesLeft: current.endTime - nowMinutes};

  const next = todayItems.find(i => i.startTime > nowMinutes);
  if (next) {
    const minutesUntil = next.startTime - nowMinutes;
    if (minutesUntil <= 75 || freeSlots.length === 0) return {kind: 'coming-up', item: next, minutesUntil};
    return {kind: 'free', slot: freeSlots[0]};
  }

  if (freeSlots.length > 0) return {kind: 'free', slot: freeSlots[0]};
  return {kind: 'clear'};
}

// ─── AI insight text ──────────────────────────────────────────────────────────

function aiInsight(todayItems: ScheduledBlock[], freeSlots: FreeSlot[], nowMinutes: number): string {
  const remaining = todayItems.filter(i => i.endTime > nowMinutes);
  const totalRemaining = remaining.reduce((s, i) => s + i.durationMinutes, 0);
  const bigSlot = freeSlots.find(s => s.duration >= 75);
  const next = remaining[0];

  if (remaining.length === 0) {
    return "You're done for today. A great time to prepare tomorrow's notes or wind down.";
  }
  if (remaining.length >= 5) {
    return `You have ${remaining.length} sessions still ahead. Keep your energy steady — pace yourself through the rest of the day.`;
  }
  if (bigSlot) {
    const context = next ? `before ${fmt12h(next.startTime)}` : `from ${fmt12h(bigSlot.start)}`;
    return `There's a ${fmtDur(bigSlot.duration)} window ${context}. A solid opportunity for deep work or a focused review session.`;
  }
  if (next) {
    const gap = next.startTime - nowMinutes;
    if (gap >= 30) {
      return `${next.title} starts in ${fmtDur(gap)}. Use the buffer to review your notes and get in the right headspace.`;
    }
    return `${totalRemaining >= 90 ? fmtDur(totalRemaining) + ' of planned time remaining' : next.title + ' is up next'}. Stay consistent and you'll finish strong.`;
  }
  return 'Keep the momentum going — you\'re doing well today.';
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TodayAtAGlance({items, onUpdate, onDelete}: Props) {
  const {switchMode, setIsRunning} = usePomodoro();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = toYmd(now);

  const [localDone, setLocalDone] = useState<Set<string>>(new Set());

  const allTodayItems = items
    .filter(item => item.date === today)
    .sort((a, b) => a.startTime - b.startTime);

  const todayItems = allTodayItems.filter(item => !localDone.has(item.id));
  const timelineItems = todayItems.filter(item => item.endTime > nowMinutes);

  const completedCount = allTodayItems.filter(
    item => item.endTime <= nowMinutes || localDone.has(item.id),
  ).length;
  const totalCount = allTodayItems.length;

  const completedMinutes = allTodayItems
    .filter(item => item.endTime <= nowMinutes && !localDone.has(item.id))
    .reduce((sum, item) => sum + item.durationMinutes, 0);

  const remainingMinutes = timelineItems.reduce(
    (sum, item) => sum + Math.max(0, item.endTime - Math.max(item.startTime, nowMinutes)),
    0,
  );

  const freeSlots = computeFreeSlots(todayItems, nowMinutes);
  const heroState = computeHeroState(todayItems, nowMinutes, freeSlots);
  const insight = aiInsight(todayItems, freeSlots, nowMinutes);

  const nextItems = items
    .filter(item => item.date > today)
    .sort((a, b) => a.date === b.date ? a.startTime - b.startTime : a.date.localeCompare(b.date))
    .slice(0, 4);

  const startFocus = () => {
    switchMode('focus');
    setIsRunning(true);
  };

  const markDone = (item: ScheduledBlock) => {
    setLocalDone(prev => new Set([...prev, item.id]));
    if (item.source !== 'recurring') onDelete?.(item.id);
  };

  const delayItem = (item: ScheduledBlock) => {
    if (item.source === 'recurring') return;
    onUpdate?.(item.id, {startTime: item.startTime + 15, endTime: item.endTime + 15});
  };

  // ─── Hero card content ──────────────────────────────────────────────────────

  const hero = (() => {
    switch (heroState.kind) {
      case 'in-progress': {
        const cat = categorizeBlock(heroState.item.title);
        return {
          eyebrow: 'In progress',
          headline: heroState.item.title,
          sub: `Ends at ${fmt12h(heroState.item.endTime)} · ${fmtDur(heroState.minutesLeft)} remaining`,
          wrapCls: 'bg-gradient-to-br from-indigo-50/70 to-blue-50/40 border-indigo-100/60',
          dotColor: cat.text,
          actions: (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startFocus}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#18181b] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.28)] transition hover:bg-[#27272a] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.32)]">
                <Play size={12} />Start focus
              </button>
              <button type="button" onClick={() => markDone(heroState.item)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-2 text-[12.5px] font-medium text-[#374151] transition hover:bg-white hover:text-[#111827]">
                <CheckCircle2 size={12} />Mark done
              </button>
            </div>
          ),
        };
      }
      case 'coming-up': {
        const cat = categorizeBlock(heroState.item.title);
        return {
          eyebrow: `Coming up · ${fmtDur(heroState.minutesUntil)}`,
          headline: heroState.item.title,
          sub: `Starts at ${fmt12h(heroState.item.startTime)} · ${fmtDur(heroState.item.durationMinutes)}`,
          wrapCls: 'bg-gradient-to-br from-amber-50/60 to-yellow-50/40 border-amber-100/60',
          dotColor: cat.text,
          actions: (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startFocus}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#18181b] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.28)] transition hover:bg-[#27272a]">
                <Play size={12} />Start focus
              </button>
              {heroState.item.source !== 'recurring' && onUpdate && (
                <button type="button" onClick={() => delayItem(heroState.item)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-2 text-[12.5px] font-medium text-[#374151] transition hover:bg-white">
                  <SkipForward size={12} />Delay 15 min
                </button>
              )}
            </div>
          ),
        };
      }
      case 'free': {
        const label = energyLabel(heroState.slot, totalCount);
        return {
          eyebrow: `Free window · ${fmtDur(heroState.slot.duration)}`,
          headline: label,
          sub: `${fmt12h(heroState.slot.start)} – ${fmt12h(heroState.slot.end)}`,
          wrapCls: 'bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border-emerald-100/60',
          dotColor: '#10B981',
          actions: (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startFocus}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#18181b] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.28)] transition hover:bg-[#27272a]">
                <Play size={12} />Start focus session
              </button>
            </div>
          ),
        };
      }
      default:
        return {
          eyebrow: 'All clear',
          headline: "You're free for the rest of today.",
          sub: 'A good time to get ahead or take a well-earned break.',
          wrapCls: 'bg-gradient-to-br from-slate-50/60 to-gray-50/40 border-black/[0.05]',
          dotColor: '#9CA3AF',
          actions: (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startFocus}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#18181b] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.28)] transition hover:bg-[#27272a]">
                <Play size={12} />Start focus session
              </button>
            </div>
          ),
        };
    }
  })();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white/80 shadow-[0_4px_40px_-12px_rgba(15,23,42,0.1)] backdrop-blur-xl">

      {/* Section header */}
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[21px] font-semibold tracking-tight text-[#1F2937]">Daily Guidance</h3>
          <p className="text-[12.5px] text-[#9CA3AF]">{fmtDateLong(now)}</p>
        </div>
        <p className="mt-1 text-[13px] text-[#9CA3AF]">
          What to focus on, where you have time, and what's coming next.
        </p>
      </div>

      <div className="p-5 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* ══ LEFT COLUMN ══ */}
          <div className="flex flex-col gap-5">

            {/* Hero: Now / Next Focus */}
            <div className={`rounded-2xl border p-5 ${hero.wrapCls}`}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor: hero.dotColor}} />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                  {hero.eyebrow}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[19px] font-semibold leading-snug tracking-tight text-[#111827]">
                  {hero.headline}
                </p>
                <p className="mt-1 text-[13px] text-[#6B7280]">{hero.sub}</p>
              </div>
              <div className="mt-4">{hero.actions}</div>
            </div>

            {/* Today's timeline */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-[#111827]">Today's timeline</h4>
                <span className="text-[11.5px] text-[#9CA3AF]">
                  {timelineItems.length === 0
                    ? 'Wrapped up'
                    : `${timelineItems.length} session${timelineItems.length === 1 ? '' : 's'} ahead`}
                </span>
              </div>

              {timelineItems.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-black/[0.06] bg-white/40 px-4 py-5">
                  <Clock3 size={15} className="shrink-0 text-[#D1D5DB]" />
                  <p className="text-[13px] text-[#9CA3AF]">No more sessions left for today.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.04]">
                  {timelineItems.map(item => {
                    const cat = categorizeBlock(item.title);
                    const isCurrent = item.startTime <= nowMinutes && item.endTime > nowMinutes;
                    const canAct = item.source !== 'recurring';
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/60"
                      >
                        {/* Time */}
                        <div className="w-11 shrink-0 text-right text-[12px] font-medium text-[#9CA3AF]">
                          {fmtHM(item.startTime)}
                        </div>

                        {/* Color accent */}
                        <div
                          className="h-7 w-[3px] shrink-0 rounded-full"
                          style={{backgroundColor: cat.text, opacity: 0.7}}
                        />

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-[13.5px] font-medium text-[#111827]">
                              {item.title}
                            </span>
                            <span
                              className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium"
                              style={{backgroundColor: `${cat.text}15`, color: cat.text}}
                            >
                              {sourceLabel(item)}
                            </span>
                            {isCurrent && (
                              <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-600">
                                Now
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-[#B8C1D0]">
                            {fmt12h(item.startTime)} · {fmtDur(item.durationMinutes)}
                          </div>
                        </div>

                        {/* Hover actions */}
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {canAct && onUpdate && (
                            <button
                              type="button"
                              onClick={() => delayItem(item)}
                              className="rounded-lg px-2 py-1 text-[11px] text-[#9CA3AF] transition hover:bg-amber-50 hover:text-amber-600"
                              title="Delay 15 min"
                            >
                              +15m
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => markDone(item)}
                            className="rounded-lg px-2 py-1 text-[11px] text-[#9CA3AF] transition hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            Done
                          </button>
                          {canAct && onDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setLocalDone(prev => new Set([...prev, item.id]));
                                onDelete(item.id);
                              }}
                              className="rounded-lg px-2 py-1 text-[11px] text-[#9CA3AF] transition hover:bg-rose-50 hover:text-rose-500"
                            >
                              Skip
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="flex flex-col gap-5">

            {/* Mini progress */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {label: 'Done', value: `${completedCount} / ${totalCount}`, sub: 'sessions'},
                {label: 'Focused', value: completedMinutes > 0 ? fmtDur(completedMinutes) : '—', sub: 'so far'},
                {label: 'Ahead', value: remainingMinutes > 0 ? fmtDur(remainingMinutes) : '—', sub: 'planned'},
              ].map(stat => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-black/[0.05] bg-white/50 px-2.5 py-3 text-center backdrop-blur-sm"
                >
                  <div className="text-[15px] font-semibold text-[#111827]">{stat.value}</div>
                  <div className="mt-px text-[10px] font-medium uppercase tracking-wider text-[#C4C9D4]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Insight */}
            <div className="rounded-2xl border border-rose-100/70 bg-gradient-to-br from-rose-50/50 to-pink-50/30 p-4">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-rose-500">
                <Sparkles size={12} />
                AI insight
              </div>
              <p className="text-[13px] leading-[1.65] text-[#374151]">{insight}</p>
              <button
                type="button"
                onClick={startFocus}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[#18181b] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.28)] transition hover:bg-[#27272a]"
              >
                <Play size={11} />
                Start focus
              </button>
            </div>

            {/* Smart Gap Finder */}
            <div>
              <div className="mb-2.5 flex items-center gap-2">
                <Zap size={12} className="shrink-0 text-[#C4C9D4]" />
                <h4 className="text-[13px] font-semibold text-[#111827]">Free windows</h4>
                {freeSlots.length > 0 && (
                  <span className="ml-auto text-[11px] text-[#C4C9D4]">
                    {freeSlots.length} slot{freeSlots.length === 1 ? '' : 's'} today
                  </span>
                )}
              </div>

              {freeSlots.length === 0 ? (
                <p className="text-[12.5px] text-[#B8C1D0]">
                  No significant free windows remaining today.
                </p>
              ) : (
                <div className="space-y-px">
                  {freeSlots.slice(0, 3).map((slot, i) => (
                    <div
                      key={i}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[12.5px] font-medium text-[#374151]">
                            {fmt12h(slot.start)} – {fmt12h(slot.end)}
                          </span>
                          <span className="rounded-full bg-black/[0.04] px-1.5 py-px text-[10px] font-medium text-[#6B7280]">
                            {fmtDur(slot.duration)}
                          </span>
                        </div>
                        <div className="mt-px text-[11px] text-[#9CA3AF]">
                          {energyLabel(slot, totalCount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={startFocus}
                        className="shrink-0 rounded-lg border border-black/[0.07] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151] opacity-0 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition group-hover:opacity-100 hover:bg-white/90"
                      >
                        Focus
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-black/[0.04]" />

            {/* Up Next */}
            <div>
              <div className="mb-2.5 flex items-center gap-2">
                <CalendarDays size={12} className="shrink-0 text-[#C4C9D4]" />
                <h4 className="text-[13px] font-semibold text-[#111827]">Up next</h4>
              </div>

              {nextItems.length === 0 ? (
                <p className="text-[12.5px] text-[#B8C1D0]">
                  No upcoming sessions yet.
                </p>
              ) : (
                <div className="space-y-px">
                  {nextItems.map(item => {
                    const cat = categorizeBlock(item.title);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/60"
                      >
                        <div
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{backgroundColor: cat.text}}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-[#111827]">
                            {item.title}
                          </div>
                          <div className="mt-px text-[11px] text-[#9CA3AF]">
                            {dayLabel(item.date)} · {fmt12h(item.startTime)} · {fmtDur(item.durationMinutes)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Adjust My Day */}
            <div className="border-t border-black/[0.04] pt-4">
              <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#C4C9D4]">
                Adjust my day
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={startFocus}
                  className="rounded-full border border-black/[0.07] bg-white/70 px-3 py-1.5 text-[11.5px] text-[#4B5563] transition hover:bg-white hover:text-[#111827] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                >
                  Start focus session
                </button>
                {timelineItems.length > 0 && timelineItems[0].source !== 'recurring' && onDelete && (
                  <button
                    type="button"
                    onClick={() => markDone(timelineItems[0])}
                    className="rounded-full border border-black/[0.07] bg-white/70 px-3 py-1.5 text-[11.5px] text-[#4B5563] transition hover:bg-white hover:text-[#111827] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  >
                    Skip next session
                  </button>
                )}
                {timelineItems.length > 0 && timelineItems[0].source !== 'recurring' && onUpdate && (
                  <button
                    type="button"
                    onClick={() => delayItem(timelineItems[0])}
                    className="rounded-full border border-black/[0.07] bg-white/70 px-3 py-1.5 text-[11.5px] text-[#4B5563] transition hover:bg-white hover:text-[#111827] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  >
                    Delay next 15 min
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
