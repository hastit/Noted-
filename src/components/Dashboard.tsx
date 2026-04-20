import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Book, Calendar as CalendarIcon, ArrowRight, PenLine,
  CheckSquare, Clock, Sparkles, ChevronRight, Circle, CheckCircle2, StickyNote,
} from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';
import { CalendarDayView } from './CalendarDayView';
import { CalendarEvent, Notebook, Note, QuickNote, Tag, Task } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { getDisplayName } from '../lib/displayName';
import { DashboardThemeId, getDashboardTheme } from '../lib/dashboardThemes';

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

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Small steps every day lead to big results.", author: "" },
  { text: "Your future is created by what you do today.", author: "" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
];

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function Dashboard({ events, tags, notebooks, notes = [], quickNotes = [], tasks = [], dashboardTheme, onCompleteTask, onNavigate }: DashboardProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const displayName = getDisplayName(user);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hour < 12 ? '☀️' : hour < 18 ? '👋' : '🌙';

  const todayStr = now.toISOString().split('T')[0];
  const todayEvents = useMemo(() => events.filter(e => e.date === todayStr)
    .sort((a, b) => a.startTime - b.startTime), [events, todayStr]);

  const upcomingEvents = useMemo(() => events
    .filter(e => e.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3), [events, todayStr]);

  const todayTasks = useMemo(() => tasks.filter(t => t.dueDate === todayStr), [tasks, todayStr]);
  const pendingTasks = todayTasks.filter(t => t.status !== 'done');
  const doneTasks = todayTasks.filter(t => t.status === 'done');
  const dashboardTodayTasks = useMemo(() => tasks.filter(t => t.dueDate === todayStr), [tasks, todayStr]);

  const recentNotebooks = notebooks.slice(0, 5);
  const dashboardQuickNotes = useMemo(
    () => [...quickNotes].sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()),
    [quickNotes],
  );
  const quote = useMemo(() => QUOTES[new Date().getDay() % QUOTES.length], []);
  const theme = getDashboardTheme(dashboardTheme);

  const dateLabel = now.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden pb-10 [scrollbar-width:thin]">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 md:gap-7">

        {/* ── Hero Header ── */}
        <motion.div {...fade(0)} className="pt-0">
          <div className="px-3 py-5 sm:px-6 sm:py-7 md:px-10 md:py-9">
            <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-white/75 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">{dateLabel}</p>
                <h1 className="text-white text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                  {greetingEmoji} {greeting},<br className="md:hidden" /> {displayName}
                </h1>
                <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-sm">
                  {todayEvents.length > 0
                    ? `You have ${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today${pendingTasks.length > 0 ? ` and ${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} to do` : ''}.`
                    : pendingTasks.length > 0
                      ? `${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} on your list today.`
                      : 'Your schedule is clear. Make it count.'}
                </p>
              </div>

              {/* Live clock */}
              <div className="flex items-end gap-6 md:gap-8 shrink-0">
                <div className="text-right">
                  <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mb-1">Time</p>
                  <p className="text-white text-3xl md:text-4xl font-bold tabular-nums tracking-tight leading-none">
                    {pad(hour % 12 || 12)}:{pad(now.getMinutes())}
                    <span className="text-white/40 text-base font-semibold ml-1">{hour >= 12 ? 'PM' : 'AM'}</span>
                  </p>
                </div>

                {/* Today stats pills */}
                <div className="hidden md:flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-sm">
                    <CalendarIcon size={12} className="text-rose-100" />
                    <span className="text-white/70 text-xs font-medium tabular-nums">{todayEvents.length} events</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-sm">
                    <CheckSquare size={12} className="text-emerald-300" />
                    <span className="text-white/70 text-xs font-medium tabular-nums">{doneTasks.length}/{todayTasks.length} tasks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="relative z-10 flex flex-wrap gap-2 mt-6">
              {[
                { label: 'New Note', icon: PenLine, tab: 'notes' as const, color: 'bg-white/10 hover:bg-white/15 text-white' },
                { label: 'Tasks', icon: CheckSquare, tab: 'tasks' as const, color: 'bg-white/10 hover:bg-white/15 text-white' },
                { label: 'Calendar', icon: CalendarIcon, tab: 'calendar' as const, color: 'bg-white/10 hover:bg-white/15 text-white' },
              ].map(({ label, icon: Icon, tab, color }) => (
                <button
                  key={tab}
                  onClick={() => onNavigate(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${color}`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">

          {/* Left column */}
          <div className="md:col-span-5 flex flex-col gap-4">

            {/* Today's Schedule */}
            <motion.div {...fade(0.08)}>
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <CalendarIcon size={14} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-black">Today's Schedule</span>
                  </div>
                  <button onClick={() => onNavigate('calendar')}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5">
                    View all <ChevronRight size={12} />
                  </button>
                </div>

                <div className="h-[300px] border-b border-black/[0.04] bg-[#f8f8f8]/45">
                  <CalendarDayView
                    events={events}
                    tags={tags}
                    currentDate={now}
                    compact
                  />
                </div>

                {/* Upcoming */}
                {upcomingEvents.length > 0 && (
                  <div className="px-4 pb-4 pt-1 border-t border-black/[0.04] mt-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/25 mb-2.5 px-0.5">Upcoming</p>
                    <div className="flex flex-col gap-1.5">
                      {upcomingEvents.map(ev => (
                        <div key={ev.id} className="flex items-center gap-2.5 px-0.5 cursor-pointer" onClick={() => onNavigate('calendar')}>
                          <Clock size={11} className="text-black/25 shrink-0" />
                          <span className="text-xs text-black/50 font-medium truncate flex-1">{ev.title}</span>
                          <span className="text-[10px] text-black/30 shrink-0">
                            {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Tasks */}
            <motion.div {...fade(0.14)}>
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <CheckSquare size={14} className="text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold text-black">Tasks</span>
                    {pendingTasks.length > 0 && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full tabular-nums">
                        {pendingTasks.length}
                      </span>
                    )}
                  </div>
                  <button onClick={() => onNavigate('tasks')}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-0.5">
                    View all <ChevronRight size={12} />
                  </button>
                </div>

                <div className="p-4 flex flex-col gap-1.5">
                  {dashboardTodayTasks.length === 0 ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-black/[0.03] flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      </div>
                      <p className="text-sm text-black/30 font-medium">No tasks due today.</p>
                      <button onClick={() => onNavigate('tasks')}
                        className="text-xs text-emerald-600 font-semibold hover:text-emerald-800 transition-colors">
                        Add a task →
                      </button>
                    </div>
                  ) : (
                    dashboardTodayTasks.map(task => (
                      <div key={task.id}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/[0.02] transition-colors group cursor-pointer"
                        onClick={() => onNavigate('tasks')}>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onCompleteTask(task);
                          }}
                          className="mt-0.5 shrink-0 rounded-full p-0.5 text-black/15 hover:text-emerald-500 transition-colors"
                          title={task.status === 'done' ? 'Completed' : 'Mark as done'}
                          aria-label={task.status === 'done' ? `${task.title} is completed` : `Mark ${task.title} as done`}
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <Circle size={15} className="group-hover:text-emerald-400 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight truncate ${task.status === 'done' ? 'text-black/35 line-through' : 'text-black/70'}`}>
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-[10px] text-black/30 mt-0.5 font-medium">
                              {task.status === 'done'
                                ? 'Completed today'
                                : `Due ${task.dueDate === todayStr ? 'today' : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            </p>
                          )}
                        </div>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-1 h-1 rounded-full mt-1.5 ${i <= task.importance ? 'bg-amber-400' : 'bg-black/10'}`} />
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="md:col-span-7 flex flex-col gap-4">

            {/* Recent notebooks */}
            <motion.div {...fade(0.1)}>
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Book size={14} className="text-violet-600" />
                    </div>
                    <span className="text-sm font-semibold text-black">Recent Notebooks</span>
                  </div>
                  <button onClick={() => onNavigate('notes')}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-0.5">
                    View all <ChevronRight size={12} />
                  </button>
                </div>

                <div className="p-4">
                  {recentNotebooks.length === 0 ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-black/[0.03] flex items-center justify-center">
                        <Book size={18} className="text-black/20" />
                      </div>
                      <p className="text-sm text-black/30 font-medium">No notebooks yet</p>
                      <button onClick={() => onNavigate('notes')}
                        className="text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors">
                        Create your first notebook →
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
                      {recentNotebooks.map((nb, i) => {
                        const count = notes.filter(n => n.notebookId === nb.id).length;
                        return (
                          <motion.button
                            key={nb.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.12 + i * 0.05 }}
                            whileHover={{ y: -3, transition: { duration: 0.15 } }}
                            onClick={() => onNavigate('notes', nb.id)}
                            className="shrink-0 w-[110px] md:w-[120px] cursor-pointer group"
                          >
                            <div className="aspect-[3/4] rounded-xl relative overflow-hidden flex flex-col shadow-sm w-full"
                              style={{ backgroundColor: nb.color }}>
                              {/* Spine */}
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/[0.08]" />
                              {/* Lines */}
                              <div className="pointer-events-none absolute inset-0 flex flex-col"
                                style={{ paddingLeft: 10, paddingTop: '38%', paddingBottom: '28%' }}>
                                {[...Array(5)].map((_, j) => (
                                  <div key={j} className="flex-1 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }} />
                                ))}
                              </div>
                              {/* Content */}
                              <div className="relative z-10 flex flex-col h-full p-3 gap-1">
                                <div className="text-base leading-none">
                                  {nb.emoji ?? <Book size={14} className="text-black/20" />}
                                </div>
                                <div className="mt-auto">
                                  <p className="text-[11px] font-bold text-black/75 leading-tight line-clamp-2">{nb.title}</p>
                                  <p className="text-[9px] font-bold text-black/30 uppercase tracking-wide mt-0.5">{count} {count === 1 ? 'page' : 'pages'}</p>
                                </div>
                              </div>
                              {/* Hover arrow */}
                              <div className="absolute bottom-2 right-2 w-6 h-6 rounded-lg bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <ArrowRight size={9} color="white" />
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                      {/* New notebook shortcut */}
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.35 }}
                        onClick={() => onNavigate('notes')}
                        className="shrink-0 w-[110px] md:w-[120px] cursor-pointer"
                      >
                        <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-black/[0.08] flex flex-col items-center justify-center gap-2 bg-black/[0.01] hover:bg-black/[0.03] transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-black/[0.05] flex items-center justify-center">
                            <PenLine size={13} className="text-black/30" />
                          </div>
                          <p className="text-[10px] font-semibold text-black/30 text-center leading-tight px-2">New notebook</p>
                        </div>
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Daily Spark — full width */}
            <motion.div {...fade(0.18)} className="w-full">
              <div className="rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden relative min-h-[140px] sm:min-h-[160px]"
                style={{ background: theme.gradient }}>
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute top-[-32%] right-[-8%] w-56 h-56 rounded-full blur-3xl opacity-20" style={{background: theme.orbA}} />
                  <div className="absolute bottom-[-40%] left-[8%] w-44 h-44 rounded-full blur-3xl opacity-15" style={{background: theme.orbB}} />
                </div>
                <div className="absolute top-3 right-3 opacity-10">
                  <Sparkles size={48} className="text-white" />
                </div>
                <div className="relative z-10 p-5 sm:p-6 md:p-7 flex flex-col gap-3 justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75 mb-3">Daily Spark</p>
                    <p className="text-sm sm:text-base font-semibold text-white leading-relaxed max-w-3xl">"{quote.text}"</p>
                    {quote.author && (
                      <p className="text-[11px] text-white/35 font-medium mt-2 uppercase tracking-widest">— {quote.author}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Post-its */}
            <motion.div {...fade(0.22)} className="w-full">
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                      <StickyNote size={14} className="text-amber-600" />
                    </div>
                    <span className="text-sm font-semibold text-black">Post-its</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('notes')}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5"
                  >
                    {t('my_notes')} <ChevronRight size={12} />
                  </button>
                </div>
                <div className="px-4 py-4 sm:px-5 sm:py-5">
                  {dashboardQuickNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl bg-black/[0.02] border border-dashed border-black/[0.06]">
                      <StickyNote size={28} className="text-black/15 mb-3" />
                      <p className="text-sm font-medium text-black/45 mb-1">No post-its yet</p>
                      <p className="text-xs text-black/30 mb-4 max-w-xs">Create colorful quick notes in Notes — they will show up here.</p>
                      <button
                        type="button"
                        onClick={() => onNavigate('notes')}
                        className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800"
                      >
                        Go to Notes
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1 min-w-0 overscroll-x-contain [scrollbar-width:thin] touch-pan-x">
                      <div className="flex flex-nowrap items-stretch gap-3 w-max pr-1">
                        {dashboardQuickNotes.map(qn => (
                          <button
                            key={qn.id}
                            type="button"
                            onClick={() => onNavigate('notes')}
                            className="shrink-0 w-[148px] sm:w-[168px] rounded-xl shadow-sm text-left flex flex-col justify-between aspect-[1.02/1] p-3 relative overflow-hidden border border-black/[0.04] hover:brightness-[0.98] active:scale-[0.99] transition-all"
                            style={{ backgroundColor: qn.color }}
                          >
                            <div className="min-h-0 flex flex-col gap-1">
                              <p className="text-[7px] font-bold text-black/30 uppercase tracking-wider">
                                {new Date(qn.createdAt).toLocaleDateString()}
                              </p>
                              <h4 className="font-display font-bold text-[13px] leading-snug line-clamp-2 text-black/85">
                                {qn.title || 'Untitled'}
                              </h4>
                              <p className="text-[11px] text-black/55 line-clamp-3 leading-snug">
                                {qn.content || '—'}
                              </p>
                            </div>
                            <p className="text-[7px] font-bold text-black/25 uppercase tracking-wider pt-1 truncate">
                              {new Date(qn.lastUsedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Focus Timer ── */}
        <motion.div {...fade(0.3)} className="shrink-0">
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <p className="text-sm font-semibold text-black/60">Focus Session</p>
          </div>
          <PomodoroTimer embedded />
        </motion.div>

      </div>
    </div>
  );
}
