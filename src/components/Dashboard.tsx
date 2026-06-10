import React, {useState, useEffect, useMemo} from 'react';
import {motion} from 'motion/react';
import {
  Book,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronRight,
  Circle,
  CheckCircle2,
  Clock3,
  Lightbulb,
  StickyNote,
} from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';
import PinWall from './PinWall';
import {CalendarEvent, Notebook, Note, QuickNote, Tag, Task} from '../types';
import {useLanguage} from '../context/LanguageContext';
import {useAuth} from '../context/AuthContext';
import {getDisplayName} from '../lib/displayName';
import {DashboardThemeId} from '../lib/dashboardThemes';

interface DashboardProps {
  events: CalendarEvent[];
  tags: Tag[];
  notebooks: Notebook[];
  notes?: Note[];
  quickNotes?: QuickNote[];
  tasks?: Task[];
  dashboardTheme: DashboardThemeId;
  onCompleteTask: (task: Task) => void;
  onNavigate: (tab: 'dashboard' | 'tasks' | 'notes' | 'calendar' | 'settings', notebookId?: string) => void;
}

const CARD =
  'rounded-3xl border border-black/[0.06] bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] overflow-hidden';
const CARD_HEADER = 'flex items-center justify-between gap-3 px-5 py-4 border-b border-black/[0.05]';
const CARD_BODY = 'px-5 py-4';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fmt12h(min: number) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

function fmtDur(min: number) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const r = min % 60;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
  }
  return `${min}m`;
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

function formatShortDate(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
}

// ─── Daily timeline ───────────────────────────────────────────────────────────

const T_START = 7 * 60;
const T_END = 22 * 60;
const T_RANGE = T_END - T_START;

function DailyTimeline({events, tags, nowMinutes}: {events: CalendarEvent[]; tags: Tag[]; nowMinutes: number}) {
  const pct = (m: number) => `${Math.min(100, Math.max(0, ((m - T_START) / T_RANGE) * 100))}%`;
  const showNow = nowMinutes >= T_START && nowMinutes <= T_END;

  return (
    <div>
      <div className="relative h-2 bg-black/[0.04] rounded-full overflow-hidden">
        {events.map(ev => {
          const left = Math.max(0, ((ev.startTime - T_START) / T_RANGE) * 100);
          const width = Math.min(100 - left, ((ev.endTime - ev.startTime) / T_RANGE) * 100);
          if (width < 0.4) return null;
          const color = tags.find(t => t.id === ev.tagId)?.color ?? '#94a3b8';
          return (
            <div
              key={ev.id}
              title={`${ev.title} · ${fmt12h(ev.startTime)}–${fmt12h(ev.endTime)}`}
              className="absolute top-0 bottom-0 rounded-full opacity-80"
              style={{left: `${left}%`, width: `${width}%`, backgroundColor: color}}
            />
          );
        })}
        {showNow && <div className="absolute top-0 bottom-0 w-0.5 bg-[#18181b] z-10" style={{left: pct(nowMinutes)}} />}
      </div>
      <div className="flex justify-between mt-2 text-[11px] font-medium text-[#9CA3AF]">
        <span>7 AM</span>
        <span>1 PM</span>
        <span>10 PM</span>
      </div>
    </div>
  );
}

// ─── Week strip (compact) ─────────────────────────────────────────────────────

function WeekStrip({
  events,
  tasks,
  todayStr,
  selectedDayStr,
  onSelectDay,
}: {
  events: CalendarEvent[];
  tasks: Task[];
  todayStr: string;
  selectedDayStr: string;
  onSelectDay: (ymd: string) => void;
}) {
  const days = useMemo(() => {
    const base = new Date(`${todayStr}T12:00:00`);
    const dow = base.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + diffToMon + i);
      const ymd = toYmd(d);
      return {
        ymd,
        n: d.getDate(),
        hasDot: events.some(e => e.date === ymd) || tasks.some(t => t.dueDate === ymd && t.status !== 'done'),
        isToday: ymd === todayStr,
        isSelected: ymd === selectedDayStr,
        isPast: ymd < todayStr,
      };
    });
  }, [events, tasks, todayStr, selectedDayStr]);

  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map(({ymd, n, hasDot, isToday, isSelected, isPast}, i) => (
        <button
          key={ymd}
          type="button"
          onClick={() => onSelectDay(ymd)}
          className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors ${
            isSelected
              ? 'bg-[#18181b] text-white'
              : isToday
                ? 'ring-1 ring-inset ring-[#18181b]/30 text-[#111827] hover:bg-black/[0.04]'
                : 'hover:bg-black/[0.04] text-[#374151]'
          }`}
        >
          <span className={`text-[10px] font-semibold ${isSelected ? 'text-white/50' : 'text-[#9CA3AF]'}`}>{labels[i]}</span>
          <span className={`text-sm font-semibold tabular-nums ${isPast && !isSelected ? 'text-[#9CA3AF]' : ''}`}>{n}</span>
          <div className={`h-1 w-1 rounded-full ${hasDot ? (isSelected ? 'bg-white/70' : 'bg-[#18181b]/35') : 'bg-transparent'}`} />
        </button>
      ))}
    </div>
  );
}

// ─── Now / next ─────────────────────────────────────────────────────────────────

function NowNextCard({
  events,
  tags,
  nowMinutes,
  onNavigate,
}: {
  events: CalendarEvent[];
  tags: Tag[];
  nowMinutes: number;
  onNavigate: DashboardProps['onNavigate'];
}) {
  const sorted = useMemo(() => [...events].sort((a, b) => a.startTime - b.startTime), [events]);
  const current = sorted.find(e => e.startTime <= nowMinutes && e.endTime > nowMinutes);
  const next = sorted.find(e => e.startTime > nowMinutes);

  if (current) {
    const color = tags.find(t => t.id === current.tagId)?.color ?? '#2563eb';
    const left = current.endTime - nowMinutes;
    return (
      <div className="flex items-center gap-4" style={{borderLeft: `3px solid ${color}`, paddingLeft: 14}}>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[#6B7280]">Happening now</p>
          <p className="text-[15px] font-semibold text-[#111827] truncate mt-0.5">{current.title}</p>
          <p className="text-[13px] text-[#6B7280] mt-1">
            {fmt12h(current.startTime)} – {fmt12h(current.endTime)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-[#111827] leading-none">{fmtDur(left)}</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">left</p>
        </div>
      </div>
    );
  }

  if (next) {
    const until = next.startTime - nowMinutes;
    return (
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[#6B7280]">Up next</p>
          <p className="text-[15px] font-semibold text-[#111827] truncate mt-0.5">{next.title}</p>
          <p className="text-[13px] text-[#6B7280] mt-1">Starts at {fmt12h(next.startTime)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-[#111827] leading-none">{fmtDur(until)}</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">until start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[12px] font-medium text-[#6B7280]">Right now</p>
        <p className="text-[15px] font-semibold text-[#111827] mt-0.5">Your schedule is clear</p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('calendar')}
        className="shrink-0 rounded-2xl border border-black/[0.08] bg-[#18181b] px-4 py-2 text-[12.5px] font-semibold text-white"
      >
        Plan day
      </button>
    </div>
  );
}

function buildBriefing(parts: {events: number; pending: number; freeMin: number; overdue: number}) {
  const items: string[] = [];
  if (parts.events > 0) items.push(`${parts.events} event${parts.events !== 1 ? 's' : ''}`);
  if (parts.pending > 0) items.push(`${parts.pending} task${parts.pending !== 1 ? 's' : ''} left`);
  else if (parts.events === 0) items.push('No tasks due today');
  if (parts.freeMin >= 15) items.push(`${fmtDur(parts.freeMin)} free`);
  if (parts.overdue > 0) items.push(`${parts.overdue} overdue`);
  return items.length ? items.join(' · ') : 'A clear day ahead.';
}

function buildSuggestion(opts: {
  todayEvents: CalendarEvent[];
  pendingToday: Task[];
  freeMinutes: number;
  nowMinutes: number;
}): string | null {
  const {todayEvents, pendingToday, freeMinutes, nowMinutes} = opts;
  const sorted = [...todayEvents].sort((a, b) => a.startTime - b.startTime);
  const next = sorted.find(e => e.startTime > nowMinutes);
  const topTask = pendingToday.find(t => t.status !== 'done');

  if (todayEvents.length === 0) {
    return 'No events on the calendar — open the AI scheduler to draft a plan.';
  }
  if (freeMinutes >= 45 && topTask) {
    return `You have about ${fmtDur(freeMinutes)} open — a good window for “${topTask.title}”.`;
  }
  if (next && topTask) {
    return `Next up: ${next.title} at ${fmt12h(next.startTime)}. Prep “${topTask.title}” before then?`;
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Dashboard({
  events,
  tags,
  notebooks,
  notes = [],
  quickNotes = [],
  tasks = [],
  dashboardTheme: _dashboardTheme,
  onCompleteTask,
  onNavigate,
}: DashboardProps) {
  const {language} = useLanguage();
  const {user} = useAuth();
  const displayName = getDisplayName(user);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const nowMinutes = hour * 60 + now.getMinutes();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayStr = toYmd(now);
  const horizonStr = addDaysYmd(todayStr, 2);

  const [selectedDayStr, setSelectedDayStr] = useState(todayStr);

  // Always-today data (for NowNextCard + free time)
  const todayEvents = useMemo(
    () => events.filter(e => e.date === todayStr).sort((a, b) => a.startTime - b.startTime),
    [events, todayStr],
  );

  // Selected-day data (for schedule + tasks cards)
  const selectedDayEvents = useMemo(
    () => events.filter(e => e.date === selectedDayStr).sort((a, b) => a.startTime - b.startTime),
    [events, selectedDayStr],
  );
  const selectedDayTasks = useMemo(
    () => tasks.filter(t => t.dueDate === selectedDayStr),
    [tasks, selectedDayStr],
  );
  const isViewingToday = selectedDayStr === todayStr;

  const selectedDayLabel = isViewingToday
    ? 'Today'
    : new Date(`${selectedDayStr}T12:00:00`).toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});

  const overdueTasks = useMemo(
    () => tasks.filter(t => t.dueDate < todayStr && t.status !== 'done'),
    [tasks, todayStr],
  );
  const upcomingDeadlines = useMemo(
    () =>
      tasks
        .filter(t => t.dueDate > todayStr && t.dueDate <= horizonStr && t.status !== 'done')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 3),
    [tasks, todayStr, horizonStr],
  );

  const pendingSelected = selectedDayTasks.filter(t => t.status !== 'done');
  const doneSelectedCount = selectedDayTasks.filter(t => t.status === 'done').length;
  const taskProgress = selectedDayTasks.length ? doneSelectedCount / selectedDayTasks.length : 0;

  const freeMinutes = useMemo(() => {
    const END = 21 * 60;
    const sorted = [...todayEvents].sort((a, b) => a.startTime - b.startTime);
    let free = 0;
    let cursor = Math.max(nowMinutes, 8 * 60);
    for (const ev of sorted) {
      if (ev.endTime <= cursor) continue;
      free += Math.max(0, Math.min(ev.startTime, END) - cursor);
      cursor = Math.max(cursor, ev.endTime);
    }
    free += Math.max(0, END - cursor);
    return Math.max(0, free);
  }, [todayEvents, nowMinutes]);

  const pendingToday = todayEvents.length > 0
    ? tasks.filter(t => t.dueDate === todayStr && t.status !== 'done')
    : [];

  const briefing = buildBriefing({
    events: todayEvents.length,
    pending: pendingToday.length,
    freeMin: freeMinutes,
    overdue: overdueTasks.length,
  });

  const suggestion = buildSuggestion({todayEvents, pendingToday, freeMinutes, nowMinutes});

  const recentNotebooks = useMemo(
    () => [...notebooks].sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()).slice(0, 3),
    [notebooks],
  );

  const recentQuickNotes = useMemo(
    () => [...quickNotes].sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()).slice(0, 3),
    [quickNotes],
  );

  const continueNotebook = recentNotebooks[0] ?? null;

  const dateLabel = now.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const timeLabel = now.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});

  return (
    <div className="h-full min-h-0 flex overflow-hidden">
      {/* Left: scrollable main content */}
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-12 [scrollbar-width:thin]">
      <motion.div
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.35, ease: [0.22, 1, 0.36, 1]}}
        className="max-w-3xl mx-auto flex flex-col gap-8 md:gap-10 px-1 md:px-0"
      >
        {/* Header */}
        <header className="flex flex-col gap-7 pt-2 md:pt-0">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#9CA3AF] tracking-wide">{dateLabel}</p>
              <h1 className="mt-1.5 text-[26px] md:text-[32px] font-bold tracking-tight text-[#111827] leading-tight">
                {greeting}, {displayName}
              </h1>
              <p className="mt-2.5 text-[14px] text-[#6B7280] leading-relaxed">{briefing}</p>
            </div>
            <p className="hidden sm:block shrink-0 text-[36px] font-bold tabular-nums text-[#111827] leading-none tracking-tight mt-0.5">
              {timeLabel}
            </p>
          </div>

          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#C4C9D4] mb-3">
              This week
            </p>
            <WeekStrip
              events={events}
              tasks={tasks}
              todayStr={todayStr}
              selectedDayStr={selectedDayStr}
              onSelectDay={setSelectedDayStr}
            />
          </div>
        </header>

        {suggestion && (
          <div className="flex gap-3 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] px-4 py-3.5">
            <Lightbulb size={18} className="text-[#6B7280] shrink-0 mt-0.5" />
            <p className="text-[13px] leading-5 text-[#4B5563]">{suggestion}</p>
          </div>
        )}

        {/* Hero: now + focus */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <section className={CARD}>
            <div className={CARD_HEADER}>
              <h2 className="text-[15px] font-semibold text-[#111827]">Now</h2>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] flex items-center gap-0.5"
              >
                Calendar <ChevronRight size={14} />
              </button>
            </div>
            <div className={CARD_BODY}>
              <NowNextCard events={todayEvents} tags={tags} nowMinutes={nowMinutes} onNavigate={onNavigate} />
            </div>
          </section>

          <section className={CARD}>
            <div className={CARD_HEADER}>
              <h2 className="text-[15px] font-semibold text-[#111827]">Focus</h2>
              <span className="text-[12px] font-medium text-[#9CA3AF]">Pomodoro</span>
            </div>
            <PomodoroTimer embedded compact />
          </section>
        </div>

        {/* Selected day schedule */}
        <section className={CARD}>
          <div className={CARD_HEADER}>
            <div className="flex items-center gap-2 min-w-0">
              <CalendarIcon size={16} className="text-[#6B7280] shrink-0" />
              <h2 className="text-[15px] font-semibold text-[#111827]">{selectedDayLabel}</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] flex items-center gap-0.5 shrink-0"
            >
              Open <ChevronRight size={14} />
            </button>
          </div>

          <div className={`${CARD_BODY} pt-0`}>
            {selectedDayEvents.length > 0 && (
              <div className="mb-5">
                <DailyTimeline
                  events={selectedDayEvents}
                  tags={tags}
                  nowMinutes={isViewingToday ? nowMinutes : -1}
                />
              </div>
            )}

            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[15px] font-medium text-[#6B7280]">
                  Nothing scheduled{isViewingToday ? ' for today' : ` for ${selectedDayLabel}`}
                </p>
                {isViewingToday && (
                  <button
                    type="button"
                    onClick={() => onNavigate('calendar')}
                    className="mt-3 text-[13px] font-semibold text-[#111827] underline-offset-2 hover:underline"
                  >
                    Plan with AI →
                  </button>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {selectedDayEvents.slice(0, 5).map(ev => {
                  const tag = tags.find(t => t.id === ev.tagId);
                  const isNow = isViewingToday && ev.startTime <= nowMinutes && ev.endTime > nowMinutes;
                  const isPast = isViewingToday && ev.endTime <= nowMinutes;
                  return (
                    <li key={ev.id}>
                      <div
                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${isNow ? 'bg-black/[0.04]' : ''}`}
                      >
                        <div
                          className="w-1 h-10 rounded-full shrink-0"
                          style={{backgroundColor: tag?.color ?? '#94a3b8', opacity: isPast ? 0.35 : 1}}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-semibold truncate ${isPast ? 'text-[#9CA3AF]' : 'text-[#111827]'}`}>
                            {ev.title}
                          </p>
                          <p className="text-[13px] text-[#6B7280] mt-0.5">
                            {fmt12h(ev.startTime)} – {fmt12h(ev.endTime)}
                          </p>
                        </div>
                        {isNow && (
                          <span className="text-[11px] font-semibold text-[#374151] bg-black/[0.06] px-2 py-1 rounded-full shrink-0">
                            Now
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
                {selectedDayEvents.length > 5 && (
                  <button
                    type="button"
                    onClick={() => onNavigate('calendar')}
                    className="text-[13px] font-semibold text-[#6B7280] px-3 py-2 hover:text-[#111827]"
                  >
                    +{selectedDayEvents.length - 5} more
                  </button>
                )}
              </ul>
            )}
          </div>
        </section>

        {/* Tasks + Continue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <section className={CARD}>
            <div className={CARD_HEADER}>
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-[#6B7280]" />
                <h2 className="text-[15px] font-semibold text-[#111827]">Tasks</h2>
                {pendingSelected.length > 0 && (
                  <span className="text-[12px] font-semibold text-[#6B7280] tabular-nums">{pendingSelected.length}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] flex items-center gap-0.5"
              >
                All <ChevronRight size={14} />
              </button>
            </div>

            {selectedDayTasks.length > 0 && (
              <div className="px-5 pb-2">
                <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#18181b] transition-all duration-500"
                    style={{width: `${Math.round(taskProgress * 100)}%`}}
                  />
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-1.5 font-medium">
                  {doneSelectedCount} of {selectedDayTasks.length} done
                </p>
              </div>
            )}

            <div className={`${CARD_BODY} ${selectedDayTasks.length > 0 ? 'pt-2' : ''} flex flex-col gap-0.5`}>
              {isViewingToday && overdueTasks.length > 0 && (
                <div className="mb-3">
                  <p className="text-[12px] font-semibold text-red-600/90 mb-2 px-1">
                    {overdueTasks.length} overdue
                  </p>
                  {overdueTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-red-50/50 cursor-pointer"
                      onClick={() => onNavigate('tasks')}
                    >
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onCompleteTask(task);
                        }}
                        className="shrink-0 text-red-300 hover:text-emerald-600 transition-colors"
                      >
                        <Circle size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-red-700/90 truncate">{task.title}</p>
                        <p className="text-[12px] text-red-500/80">{formatShortDate(task.dueDate)}</p>
                      </div>
                    </div>
                  ))}
                  {overdueTasks.length > 3 && (
                    <button
                      type="button"
                      onClick={() => onNavigate('tasks')}
                      className="text-[12px] font-semibold text-red-500 px-3 py-1"
                    >
                      View all overdue
                    </button>
                  )}
                </div>
              )}

              {selectedDayTasks.length === 0 && !(isViewingToday && overdueTasks.length > 0) ? (
                <div className="py-10 text-center">
                  <CheckCircle2 size={24} className="text-[#9CA3AF] mx-auto mb-2" />
                  <p className="text-[15px] font-medium text-[#6B7280]">
                    {isViewingToday ? 'Nothing due today' : `No tasks for ${selectedDayLabel}`}
                  </p>
                  {isViewingToday && (
                    <button
                      type="button"
                      onClick={() => onNavigate('tasks')}
                      className="mt-2 text-[13px] font-semibold text-[#111827]"
                    >
                      Add a task →
                    </button>
                  )}
                </div>
              ) : (
                selectedDayTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-black/[0.02] cursor-pointer"
                    onClick={() => onNavigate('tasks')}
                  >
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onCompleteTask(task);
                      }}
                      className="shrink-0 text-[#D1D5DB] hover:text-emerald-600 transition-colors"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 size={17} className="text-emerald-600" />
                      ) : (
                        <Circle size={16} />
                      )}
                    </button>
                    <p
                      className={`flex-1 text-[14px] font-semibold truncate ${
                        task.status === 'done' ? 'text-[#9CA3AF] line-through' : 'text-[#111827]'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.status !== 'done' && task.importance >= 4 && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600/80 shrink-0">
                        High
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={CARD}>
            <div className={CARD_HEADER}>
              <div className="flex items-center gap-2">
                <Book size={16} className="text-[#6B7280]" />
                <h2 className="text-[15px] font-semibold text-[#111827]">Continue</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('notes')}
                className="text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] flex items-center gap-0.5"
              >
                Notes <ChevronRight size={14} />
              </button>
            </div>

            <div className={`${CARD_BODY} flex flex-col gap-5`}>
              {continueNotebook && (
                <button
                  type="button"
                  onClick={() => onNavigate('notes', continueNotebook.id)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] p-4 text-left hover:bg-black/[0.02] transition-colors"
                >
                  <div
                    className="w-12 h-14 rounded-xl shrink-0 flex items-center justify-center text-xl shadow-sm"
                    style={{backgroundColor: continueNotebook.color}}
                  >
                    {continueNotebook.emoji ?? '📓'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#6B7280]">Pick up where you left off</p>
                    <p className="text-[15px] font-semibold text-[#111827] truncate mt-0.5">{continueNotebook.title}</p>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                      {notes.filter(n => n.notebookId === continueNotebook.id).length} pages
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-[#9CA3AF] shrink-0" />
                </button>
              )}

              {recentNotebooks.length > (continueNotebook ? 1 : 0) && (
                <div>
                  <p className="text-[12px] font-semibold text-[#9CA3AF] mb-2 px-1">Notebooks</p>
                  <ul className="flex flex-col gap-0.5">
                    {recentNotebooks
                      .filter(nb => nb.id !== continueNotebook?.id)
                      .slice(0, 2)
                      .map(nb => (
                        <li key={nb.id}>
                          <button
                            type="button"
                            onClick={() => onNavigate('notes', nb.id)}
                            className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-black/[0.02] text-left"
                          >
                            <span
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                              style={{backgroundColor: nb.color}}
                            >
                              {nb.emoji ?? '📓'}
                            </span>
                            <span className="flex-1 text-[14px] font-semibold text-[#111827] truncate">{nb.title}</span>
                            <span className="text-[12px] text-[#9CA3AF] shrink-0">
                              {notes.filter(n => n.notebookId === nb.id).length}p
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {recentQuickNotes.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-[#9CA3AF] mb-2 px-1">Quick notes</p>
                  <ul className="flex flex-col gap-0.5">
                    {recentQuickNotes.map(qn => (
                      <li key={qn.id}>
                        <button
                          type="button"
                          onClick={() => onNavigate('notes')}
                          className="w-full flex items-start gap-3 rounded-2xl px-3 py-2.5 hover:bg-black/[0.02] text-left"
                        >
                          <StickyNote size={16} className="text-[#9CA3AF] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold text-[#111827] truncate">{qn.title || 'Untitled'}</p>
                            <p className="text-[13px] text-[#6B7280] line-clamp-1 mt-0.5">{qn.content || 'Empty note'}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {upcomingDeadlines.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-[#9CA3AF] mb-2 px-1 flex items-center gap-1.5">
                    <Clock3 size={12} />
                    Due soon
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {upcomingDeadlines.map(task => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => onNavigate('tasks')}
                          className="w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-black/[0.02] text-left"
                        >
                          <span className="text-[14px] font-semibold text-[#111827] truncate">{task.title}</span>
                          <span className="text-[12px] text-[#6B7280] shrink-0">{formatShortDate(task.dueDate)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {notebooks.length === 0 && recentQuickNotes.length === 0 && (
                <div className="py-8 text-center">
                  <Book size={22} className="text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-[15px] font-medium text-[#6B7280]">No notes yet</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('notes')}
                    className="mt-2 text-[13px] font-semibold text-[#111827]"
                  >
                    Create a notebook →
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </motion.div>
      </div>

      {/* Right: Pin Wall — visible on xl+ */}
      <div className="hidden xl:flex flex-col w-[340px] shrink-0 border-l border-black/[0.06] bg-[#FAFAFA]">
        <PinWall />
      </div>
    </div>
  );
}
