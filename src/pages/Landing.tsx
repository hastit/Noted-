import React, {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {
  AlarmClock,
  ArrowDown,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock3,
  Dumbbell,
  FileText,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings as SettingsIcon,
  Smartphone,
  Sparkles,
  SquarePen,
  StickyNote,
  Sun,
} from 'lucide-react';

const ShaderHeroBackground = lazy(() => import('./ShaderHeroBackground'));

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

function FadeUp({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{opacity: 0, y: 30}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-48px'}}
      transition={{duration: 0.6, ease: easeOut, delay}}
    >
      {children}
    </motion.div>
  );
}

/* ── Shared mockup chrome ── */

function BrowserFrame({children, className = ''}: {children: React.ReactNode; className?: string}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#FAFAF8] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-1 text-[11px] font-medium text-neutral-500">
          <span className="text-[9px]">🔒</span> noted.app
        </div>
        <div className="w-10" />
      </div>
      {children}
    </div>
  );
}

function PhoneShell({
  children,
  className = '',
  small = false,
}: {
  children: React.ReactNode;
  className?: string;
  small?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none rounded-[30px] bg-[#E8E8EA] p-2 shadow-[0_24px_50px_-20px_rgba(20,20,25,0.5)] ${className}`}
    >
      <div
        className={`relative overflow-hidden rounded-[24px] bg-white ${small ? 'h-[320px] w-[156px]' : 'h-[370px] w-[180px]'}`}
      >
        {children}
      </div>
    </div>
  );
}

/* ── 01 · Notes: library + AI filing ── */

type MiniNote = {id: string; t: string; p: string; d: string; src: string[]};

const MINI_NOTES: MiniNote[] = [
  {id: 'm1', t: "Menu ideas for Sara's dinner", p: 'Start with the burrata, then the lemon pasta…', d: 'Today', src: ['quick', 'recipes']},
  {id: 'm2', t: 'Call landlord about heating', p: 'Before Friday — mention the thermostat.', d: 'Today', src: ['quick']},
  {id: 'm3', t: 'Lecture 12 — memory', p: 'Encoding vs retrieval; the serial position curve…', d: 'Yesterday', src: ['uni']},
  {id: 'm4', t: 'Reading list', p: 'Tomorrow, and Tomorrow, and Tomorrow — then…', d: 'Yesterday', src: ['personal']},
  {id: 'm5', t: "Grandma's pasta", p: 'The trick is cold butter right at the end…', d: 'Previous 7 Days', src: ['recipes']},
  {id: 'm6', t: 'Sunday journal', p: 'Slow morning, long walk, finally called home.', d: 'Previous 7 Days', src: ['personal']},
  {id: 'm7', t: 'App concept: field notes', p: 'Tiny voice memos that transcribe into notes…', d: 'Previous 30 Days', src: ['ideas']},
];

const NOTE_DATE_ORDER = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days'];

const NOTE_NOTEBOOKS = [
  {id: 'personal', emoji: '📓', label: 'Personal'},
  {id: 'recipes', emoji: '🍳', label: 'Recipes'},
  {id: 'uni', emoji: '🎓', label: 'Uni'},
  {id: 'ideas', emoji: '💡', label: 'Ideas'},
];

function NotesFeature() {
  const [source, setSource] = useState('quick');
  const [selectedId, setSelectedId] = useState<string | null>(MINI_NOTES[0].id);
  const reduced = useReducedMotion();
  const [toastOn, setToastOn] = useState(true);

  useEffect(() => {
    if (reduced) return;
    const iv = window.setInterval(() => setToastOn(v => !v), 2800);
    return () => window.clearInterval(iv);
  }, [reduced]);

  const notes = source === 'all' ? MINI_NOTES : MINI_NOTES.filter(n => n.src.includes(source));
  const selected = notes.find(n => n.id === selectedId) ?? notes[0] ?? null;
  const count = (s: string) => (s === 'all' ? MINI_NOTES.length : MINI_NOTES.filter(n => n.src.includes(s)).length);

  const sideBtn = (id: string, icon: React.ReactNode, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setSource(id);
        setSelectedId(null);
      }}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition ${
        source === id ? 'bg-black/[0.06] text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
      }`}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[10px] font-medium text-neutral-400">{count(id)}</span>
    </button>
  );

  return (
    <div className="relative w-full max-w-[560px]">
      <BrowserFrame>
        <div className="flex h-[380px]">
          {/* Sidebar */}
          <div className="flex w-[136px] shrink-0 flex-col border-r border-black/[0.05] bg-[#FAFAF8] p-2">
            <p className="px-2 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Library</p>
            {sideBtn('quick', <StickyNote size={12} className="shrink-0 text-amber-500/80" />, 'Quick Notes')}
            {sideBtn('all', <FileText size={12} className="shrink-0 text-neutral-400" />, 'All Notes')}
            <p className="px-2 pb-1 pt-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Notebooks</p>
            {NOTE_NOTEBOOKS.map(nb => sideBtn(nb.id, <span className="text-[11px] leading-none">{nb.emoji}</span>, nb.label))}
            <div className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-[#18181b] px-2 py-1.5 text-[10px] font-semibold text-white">
              <SquarePen size={10} /> New note
            </div>
          </div>

          {/* Note list */}
          <div className="flex w-[158px] shrink-0 flex-col border-r border-black/[0.05]">
            <div className="p-2 pb-1">
              <div className="flex items-center gap-1.5 rounded-lg bg-black/[0.04] px-2 py-1.5 text-[10px] text-neutral-400">
                <Search size={10} /> Search notes
              </div>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-2">
              {NOTE_DATE_ORDER.map(day => {
                const dayNotes = notes.filter(n => n.d === day);
                if (!dayNotes.length) return null;
                return (
                  <div key={day}>
                    <p className="px-1 pb-1 pt-2 text-[8.5px] font-bold uppercase tracking-wide text-[#9CA3AF]">{day}</p>
                    {dayNotes.map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedId(n.id)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left transition ${
                          selected?.id === n.id ? 'bg-black/[0.05]' : 'hover:bg-black/[0.03]'
                        }`}
                      >
                        <p className="truncate text-[10.5px] font-bold text-neutral-900">{n.t}</p>
                        <p className="truncate text-[9px] text-neutral-400">{n.p}</p>
                      </button>
                    ))}
                  </div>
                );
              })}
              {!notes.length && <p className="px-2 pt-6 text-center text-[9.5px] text-neutral-400">No notes yet</p>}
            </div>
          </div>

          {/* Editor */}
          <div className="hidden min-w-0 flex-1 flex-col p-4 lg:flex">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{opacity: 0, y: 6}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.25, ease: easeOut}}
              >
                <p className="font-display text-[16px] font-bold text-neutral-900">{selected.t}</p>
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-neutral-500">{selected.p}</p>
                <div className="mt-3 space-y-2">
                  <div className="h-1.5 w-full rounded-full bg-black/[0.05]" />
                  <div className="h-1.5 w-[88%] rounded-full bg-black/[0.05]" />
                  <div className="h-1.5 w-[72%] rounded-full bg-black/[0.04]" />
                  <div className="h-1.5 w-[80%] rounded-full bg-black/[0.04]" />
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-neutral-400">
                <SquarePen size={16} />
                <p className="text-[10px] font-medium">No note selected</p>
              </div>
            )}
          </div>
        </div>
      </BrowserFrame>

      {/* iPhone companion: quick capture + AI filing */}
      <PhoneShell className="absolute -bottom-10 -right-2 hidden rotate-3 sm:block md:-right-5">
        <div className="flex h-full flex-col px-3 pt-4">
          <p className="text-[7px] font-bold tracking-[0.12em] text-[#9CA3AF]">✎ TODAY</p>
          <p className="mt-1.5 font-display text-[13px] font-bold leading-snug text-neutral-900">
            Menu ideas for Sara&apos;s dinner
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-neutral-400">Start with the burrata, then the lemon pasta —</p>
          <div className="mt-2 space-y-1.5">
            <div className="h-1 w-[85%] rounded-full bg-black/[0.05]" />
            <div className="h-1 w-[65%] rounded-full bg-black/[0.05]" />
          </div>
          <div className="mt-auto flex items-center justify-between pb-12">
            <span className="text-[7.5px] font-medium text-[#9CA3AF]">⚡ AI will file this away</span>
            <span className="rounded-full bg-[#18181B] px-2.5 py-1 text-[8px] font-bold text-white">✓ Done</span>
          </div>
          <AnimatePresence>
            {toastOn && (
              <motion.div
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: 8}}
                transition={{duration: 0.3, ease: easeOut}}
                className="absolute inset-x-2.5 bottom-3 flex items-center gap-1.5 rounded-full bg-[#18181B] px-3 py-1.5 text-[8px] font-medium text-[#F5F5F7] shadow-lg"
              >
                <span className="text-emerald-400">✓</span> Filed under Recipes
                <span className="ml-auto font-bold text-indigo-300">Move</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneShell>

      <p className="mt-5 text-[13px] font-medium text-[#888] sm:pr-48">Click around — pick a notebook, open a note.</p>
    </div>
  );
}

/* ── 02 · Tasks: kanban with momentum ── */

type MiniTask = {id: string; t: string; due?: string; imp: number; status: 'todo' | 'started' | 'done'};

const INITIAL_TASKS: MiniTask[] = [
  {id: 't1', t: 'Read chapter 4', due: 'Apr 14', imp: 3, status: 'todo'},
  {id: 't2', t: 'Email professor', due: 'Apr 12', imp: 2, status: 'todo'},
  {id: 't3', t: 'Book study room', imp: 1, status: 'todo'},
  {id: 't4', t: 'Lab report', due: 'Apr 15', imp: 4, status: 'started'},
  {id: 't5', t: 'Essay draft', due: 'Apr 16', imp: 3, status: 'started'},
  {id: 't6', t: 'Outline', imp: 2, status: 'done'},
];

const TASK_COLUMNS = [
  {id: 'todo', label: 'To Do', dot: 'bg-black/20', chip: 'bg-black/[0.06] text-neutral-500'},
  {id: 'started', label: 'Started', dot: 'bg-[#1d4ed8]', chip: 'bg-[#dbeafe] text-[#1d4ed8]'},
  {id: 'done', label: 'Done', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600'},
] as const;

const NEXT_STATUS: Record<MiniTask['status'], MiniTask['status']> = {todo: 'started', started: 'done', done: 'todo'};

function ImportanceDots({imp}: {imp: number}) {
  const fill = imp >= 4 ? 'bg-red-400' : imp >= 3 ? 'bg-amber-400' : 'bg-black/30';
  return (
    <span className="flex items-center gap-[3px]">
      {Array.from({length: 5}, (_, i) => (
        <span key={i} className={`h-1 w-1 rounded-full ${i < imp ? fill : 'bg-black/10'}`} />
      ))}
    </span>
  );
}

function TasksFeature() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const advance = (id: string) => setTasks(ts => ts.map(t => (t.id === id ? {...t, status: NEXT_STATUS[t.status]} : t)));
  const pct = Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);

  return (
    <div className="relative w-full max-w-[560px]">
      <BrowserFrame>
        <div className="flex h-[380px] flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-display text-[15px] font-bold text-neutral-900">Tasks</p>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-14 overflow-hidden rounded-full bg-black/10">
                  <motion.span
                    className="block h-full rounded-full bg-[#1d4ed8]"
                    animate={{width: `${pct}%`}}
                    transition={{duration: 0.5, ease: easeOut}}
                  />
                </span>
                <span className="whitespace-nowrap text-[9px] font-semibold text-neutral-500">{pct}% done</span>
              </div>
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1d4ed8] px-2.5 py-1 text-[9px] font-semibold text-white">
                <Plus size={9} /> New Task
              </span>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
            {TASK_COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-black/[0.025] p-1.5">
                  <div className="flex items-center gap-1.5 px-1 pt-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                    <span className="text-[9.5px] font-bold text-neutral-700">{col.label}</span>
                    <span className={`ml-auto rounded-full px-1.5 py-px text-[8px] font-bold ${col.chip}`}>
                      {colTasks.length}
                    </span>
                  </div>
                  {colTasks.map(task => (
                    <motion.button
                      key={task.id}
                      layout
                      type="button"
                      onClick={() => advance(task.id)}
                      transition={{type: 'spring', bounce: 0.22, duration: 0.55}}
                      whileHover={{y: -2}}
                      className="rounded-xl border border-black/[0.05] bg-white p-2 text-left shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p
                          className={`text-[10px] font-semibold leading-tight ${
                            task.status === 'done' ? 'text-neutral-400 line-through' : 'text-neutral-800'
                          }`}
                        >
                          {task.t}
                        </p>
                        {task.status === 'todo' && <Circle size={9} className="mt-px shrink-0 text-black/20" />}
                        {task.status === 'started' && (
                          <span className="mt-px h-[9px] w-[9px] shrink-0 rounded-full border-[2.5px] border-[#1d4ed8]" />
                        )}
                        {task.status === 'done' && <CheckCircle2 size={10} className="mt-px shrink-0 text-emerald-500" />}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[8px] font-medium text-neutral-400">
                          {task.due && (
                            <>
                              <CalendarDays size={8} /> {task.due}
                            </>
                          )}
                        </span>
                        <ImportanceDots imp={task.imp} />
                      </div>
                    </motion.button>
                  ))}
                  <div className="rounded-lg border border-dashed border-black/10 py-1 text-center text-[8.5px] font-medium text-neutral-400">
                    + Add task
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BrowserFrame>

      {/* iPhone companion: mobile tasks */}
      <PhoneShell small className="absolute -bottom-16 -left-4 hidden -rotate-6 sm:block md:-left-10">
        <div className="flex h-full flex-col px-3 pt-4">
          <p className="font-display text-[13px] font-bold text-neutral-900">Tasks</p>
          <p className="text-[7.5px] font-medium text-neutral-400">2 of 6 done</p>
          <div className="mt-2 flex rounded-full bg-black/[0.05] p-0.5 text-[8px] font-semibold text-neutral-500">
            <span className="flex-1 rounded-full py-1 text-center">To Do</span>
            <span className="flex-1 rounded-full bg-white py-1 text-center text-neutral-900 shadow-sm">Started</span>
            <span className="flex-1 rounded-full py-1 text-center">Done</span>
          </div>
          <div className="mt-2.5 space-y-2">
            <div className="rounded-xl border border-black/[0.05] bg-white p-2.5 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-[9.5px] font-semibold text-neutral-800">Lab report</p>
                <span className="h-2 w-2 rounded-full border-2 border-[#1d4ed8]" />
              </div>
              <p className="mt-0.5 text-[6.5px] font-bold uppercase tracking-wide text-[#1d4ed8]">Started on Apr 10</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[7.5px] text-neutral-400">
                  <CalendarDays size={7} /> Apr 15
                </span>
                <ImportanceDots imp={4} />
              </div>
            </div>
            <div className="rounded-xl border border-black/[0.05] bg-white p-2.5 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-[9.5px] font-semibold text-neutral-800">Essay draft</p>
                <span className="h-2 w-2 rounded-full border-2 border-[#1d4ed8]" />
              </div>
              <p className="mt-0.5 text-[6.5px] font-bold uppercase tracking-wide text-[#1d4ed8]">Started on Apr 11</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[7.5px] text-neutral-400">
                  <CalendarDays size={7} /> Apr 16
                </span>
                <ImportanceDots imp={3} />
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#1d4ed8] text-white shadow-lg">
            <Plus size={16} />
          </div>
        </div>
      </PhoneShell>

      <p className="mt-5 text-[13px] font-medium text-[#888] sm:pl-36">Try it — click any card to move it forward.</p>
    </div>
  );
}

/* ── 03 · AI Scheduler: Plan with AI + day timeline ── */

const AI_PROMPT = 'I have a chemistry test next Friday and a 4-page essay due Wednesday.';

const DRAFT_SESSIONS = [
  {t: 'Chemistry — flashcards', when: 'Mon · 16:00 – 17:00'},
  {t: 'Essay — outline & first draft', when: 'Tue · 15:30 – 17:30'},
  {t: 'Chemistry — practice test', when: 'Thu · 16:00 – 17:30'},
];

type PlanPhase = 'idle' | 'typing' | 'ready' | 'generating' | 'draft' | 'saved';

function TimelineBlock({
  icon: Icon,
  bg,
  border,
  fg,
  time,
  title,
  ai = false,
}: {
  icon: typeof BookOpen;
  bg: string;
  border: string;
  fg: string;
  time: string;
  title: string;
  ai?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white"
        style={{background: bg, border: `1px solid ${border}`, color: fg}}
      >
        <Icon size={11} />
      </span>
      <div className="min-w-0">
        <p className="text-[7px] font-medium text-neutral-400">{time}</p>
        <p className="flex items-center gap-1 truncate text-[9px] font-bold text-neutral-800">
          {title}
          {ai && <span className="rounded-full bg-[#EEEEFF] px-1 py-px text-[6px] font-bold text-[#6366F1]">AI</span>}
        </p>
      </div>
    </div>
  );
}

function SchedulerFeature() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<PlanPhase>('idle');
  const [typed, setTyped] = useState(0);
  const [toast, setToast] = useState(false);
  const autoRan = useRef(false);

  const generate = () => {
    autoRan.current = true;
    setPhase('generating');
    window.setTimeout(() => setPhase('draft'), 1500);
  };

  const begin = () => {
    if (phase !== 'idle') return;
    if (reduced) {
      setTyped(AI_PROMPT.length);
      setPhase('ready');
      return;
    }
    setPhase('typing');
  };

  useEffect(() => {
    if (phase !== 'typing') return;
    if (typed >= AI_PROMPT.length) {
      setPhase('ready');
      return;
    }
    const t = window.setTimeout(() => setTyped(typed + 1), 28);
    return () => window.clearTimeout(t);
  }, [phase, typed]);

  useEffect(() => {
    if (phase !== 'ready' || autoRan.current || reduced) return;
    const t = window.setTimeout(generate, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'saved') return;
    setToast(true);
    const t = window.setTimeout(() => setToast(false), 2400);
    return () => window.clearTimeout(t);
  }, [phase]);

  const canGenerate = phase === 'ready' || phase === 'draft' || phase === 'saved';

  return (
    <div className="relative w-full max-w-[560px]">
      <motion.div onViewportEnter={begin} viewport={{margin: '-100px'}}>
        <BrowserFrame>
          <div className="relative flex h-[430px] flex-col gap-3 overflow-hidden p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-violet-500 text-white shadow-sm">
                <Sparkles size={14} />
              </div>
              <div>
                <p className="font-display text-[14px] font-bold leading-tight text-neutral-900">Plan with AI</p>
                <p className="text-[9.5px] text-neutral-400">Describe your week — Noted builds a schedule around it.</p>
              </div>
            </div>

            <div className="min-h-[64px] rounded-xl border border-black/[0.08] bg-white p-3 text-[11px] leading-relaxed text-neutral-700">
              {phase === 'idle' ? (
                <span className="text-neutral-300">e.g. I have a chemistry test next Friday…</span>
              ) : (
                <>
                  {AI_PROMPT.slice(0, typed)}
                  {phase === 'typing' && (
                    <span className="ml-px inline-block h-[11px] w-[2px] animate-pulse bg-neutral-800 align-middle" />
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => canGenerate && generate()}
                className={`flex items-center gap-1.5 rounded-full bg-[#18181b] px-4 py-2 text-[10.5px] font-semibold text-white transition ${
                  phase === 'generating' ? 'opacity-80' : 'hover:bg-neutral-800'
                }`}
              >
                {phase === 'generating' ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" /> Generating draft…
                  </>
                ) : (
                  <>
                    <Sparkles size={11} /> Generate draft schedule
                  </>
                )}
              </button>
              <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[9px] font-semibold text-neutral-500">
                3 drafts left today
              </span>
            </div>

            {phase === 'generating' && (
              <p className="text-[9.5px] italic text-neutral-400">
                Building your schedule around what&apos;s already on your calendar…
              </p>
            )}

            <AnimatePresence>
              {(phase === 'draft' || phase === 'saved') && (
                <motion.div
                  initial={{opacity: 0, y: 12}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0}}
                  transition={{duration: 0.35, ease: easeOut}}
                  className="rounded-2xl border border-[#BFDBFE] bg-[#F8FBFF] p-3 sm:mr-40"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10.5px] font-bold text-neutral-800">AI Draft Plan</p>
                    {phase === 'saved' ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8.5px] font-bold text-emerald-700">
                        Saved ✓
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8.5px] font-bold text-amber-700">
                        Not saved yet
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {DRAFT_SESSIONS.map((s, i) => (
                      <motion.div
                        key={s.t}
                        initial={{opacity: 0, x: -8}}
                        animate={{opacity: 1, x: 0}}
                        transition={{delay: 0.12 * i, duration: 0.3, ease: easeOut}}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#C4C4FA] bg-[#EEEEFF] px-2.5 py-1.5"
                      >
                        <span className="truncate text-[10px] font-semibold text-[#312E81]">{s.t}</span>
                        <span className="whitespace-nowrap text-[9px] font-medium text-[#312E81]/60">{s.when}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPhase('saved')}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[9.5px] font-semibold text-white transition ${
                        phase === 'saved' ? 'bg-emerald-500' : 'bg-[#1D4ED8] hover:bg-[#1e40af]'
                      }`}
                    >
                      <Save size={10} /> {phase === 'saved' ? 'Saved to calendar' : 'Save to calendar'}
                    </button>
                    <button
                      type="button"
                      onClick={generate}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[9.5px] font-semibold text-neutral-500 transition hover:text-neutral-800"
                    >
                      <RefreshCw size={10} /> Regenerate
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{opacity: 0, y: 12}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: 8}}
                  transition={{duration: 0.3, ease: easeOut}}
                  className="absolute inset-x-4 bottom-3 flex items-center gap-2 rounded-full bg-[#18181B] px-4 py-2 text-[10px] font-medium text-[#F5F5F7] shadow-lg"
                >
                  <span className="text-emerald-400">✓</span> Draft saved to calendar.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </BrowserFrame>
      </motion.div>

      {/* iPhone companion: day timeline */}
      <PhoneShell className="absolute -bottom-10 -right-2 hidden rotate-3 sm:block md:-right-5">
        <div className="relative flex h-full flex-col px-3 pt-4">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-[13px] font-bold text-neutral-900">Today</p>
            <p className="text-[7.5px] font-medium text-neutral-400">Thu, Apr 9</p>
          </div>
          <div className="relative mt-3 flex-1">
            <div className="absolute bottom-3 left-[13px] top-1 w-[2px] rounded-full bg-[#DDE3EA]" />
            <div className="absolute left-[13px] top-1 h-[40%] w-[2px] rounded-full bg-gradient-to-b from-violet-400 to-sky-400" />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-center gap-2 pl-[2px]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-violet-500 text-white ring-2 ring-white">
                  <AlarmClock size={10} />
                </span>
                <div>
                  <p className="text-[8.5px] font-bold text-neutral-800">Wake up!</p>
                  <p className="text-[7px] text-neutral-400">08:30</p>
                </div>
              </div>
              <TimelineBlock icon={BookOpen} bg="#EEEEFF" border="#C4C4FA" fg="#6366F1" time="09:00 — 10:30" title="Essay — deep work" ai />
              <TimelineBlock icon={Briefcase} bg="#E0F7FA" border="#A5E8F2" fg="#0891B2" time="11:00 — 12:30" title="Lecture — CHEM 201" />
              <div className="flex items-center gap-2 pl-[7px]">
                <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full bg-violet-400/50"
                    animate={{scale: [1, 1.9], opacity: [0.55, 0]}}
                    transition={{duration: 1.8, repeat: Infinity, ease: 'easeOut'}}
                  />
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-500 to-sky-400 shadow-[0_0_0_3px_rgba(139,92,246,0.2)] ring-2 ring-white" />
                </span>
                <p className="text-[7.5px] font-bold text-violet-500">12:47 · now</p>
              </div>
              <div className="flex items-center gap-2 pl-[9px]">
                <Clock3 size={9} className="shrink-0 text-neutral-300" />
                <p className="text-[7.5px] text-neutral-400">45m free — take a pause</p>
                <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-white">
                  <Plus size={8} />
                </span>
              </div>
              <TimelineBlock icon={Dumbbell} bg="#E0F2FE" border="#BAE0FD" fg="#0C4A6E" time="14:00 — 15:00" title="Gym" />
              <TimelineBlock icon={Sparkles} bg="#EEEEFF" border="#C4C4FA" fg="#6366F1" time="16:00 — 17:00" title="Chemistry — flashcards" ai />
              <div className="flex items-center gap-2 pl-[2px]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 ring-2 ring-white">
                  <Moon size={10} />
                </span>
                <p className="text-[8.5px] font-semibold text-neutral-400">Sleep well!</p>
              </div>
            </div>
          </div>
        </div>
      </PhoneShell>

      <p className="mt-5 text-[13px] font-medium text-[#888] sm:pr-48">
        The real flow — generate a draft, then save it to your calendar.
      </p>
    </div>
  );
}

/* ── Everywhere: web + iPhone showcase ── */

const APP_STORE_URL = '#'; // TODO: swap in the real App Store link once the app is live

function AppleLogo({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 140.3 4 183.9 4 272.6q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function AppStoreBadge({className = ''}: {className?: string}) {
  return (
    <a
      href={APP_STORE_URL}
      className={`inline-flex min-h-14 items-center gap-3 rounded-2xl bg-black px-5 text-white shadow-lg ring-1 ring-white/10 transition hover:scale-[1.02] active:scale-[0.98] ${className}`}
      aria-label="Download Noted on the App Store"
    >
      <AppleLogo className="h-7 w-7" />
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-medium tracking-wide text-white/70">Download on the</span>
        <span className="font-display text-lg font-bold leading-tight">App Store</span>
      </span>
    </a>
  );
}

const phoneThemes = {
  light: {
    frame: '#E8E8EA',
    bg: '#FFFFFF',
    text: '#111827',
    textSecondary: 'rgba(0,0,0,0.45)',
    textMuted: '#9CA3AF',
    card: '#FAFAFA',
    chip: 'rgba(0,0,0,0.05)',
    chipActive: '#18181B',
    chipTextActive: '#FFFFFF',
    tabbarBg: 'rgba(255,255,255,0.92)',
    tabbarBorder: 'rgba(0,0,0,0.06)',
  },
  dark: {
    frame: '#050506',
    bg: '#0A0A0B',
    text: '#F4F4F5',
    textSecondary: 'rgba(255,255,255,0.55)',
    textMuted: '#71717A',
    card: '#1C1C1F',
    chip: 'rgba(255,255,255,0.08)',
    chipActive: '#F4F4F5',
    chipTextActive: '#0A0A0B',
    tabbarBg: 'rgba(28,28,30,0.94)',
    tabbarBorder: 'rgba(255,255,255,0.08)',
  },
} as const;

// Mirrors notebookTint() in the mobile app so tile colors match the real algorithm.
function notebookTint(id: string, isDark: boolean) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return isDark ? `hsla(${hue}, 60%, 65%, 0.14)` : `hsla(${hue}, 72%, 94%, 1)`;
}

const CANVAS_TITLE = "Menu ideas for Sara's dinner";
const CANVAS_BODY = 'Start with the burrata, then—';

type CanvasStep = 'empty' | 'typing' | 'done' | 'filed';

function useCanvasStory(enabled: boolean) {
  const [step, setStep] = useState<CanvasStep>('filed');
  const [typed, setTyped] = useState(CANVAS_TITLE.length + CANVAS_BODY.length);

  useEffect(() => {
    if (!enabled) return; // reduced motion: rest on the finished state
    let cancelled = false;
    let timer = 0;
    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        timer = window.setTimeout(resolve, ms);
      });
    (async () => {
      while (!cancelled) {
        setStep('empty');
        setTyped(0);
        await wait(1600);
        if (cancelled) return;
        setStep('typing');
        const total = CANVAS_TITLE.length + CANVAS_BODY.length;
        for (let i = 1; i <= total; i++) {
          setTyped(i);
          await wait(38);
          if (cancelled) return;
        }
        await wait(450);
        if (cancelled) return;
        setStep('done');
        await wait(1300);
        if (cancelled) return;
        setStep('filed');
        await wait(3000);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return {step, typed};
}

function PhoneMockup() {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');
  const reducedMotion = useReducedMotion();
  const {step, typed} = useCanvasStory(!reducedMotion);
  const t = phoneThemes[scheme];
  const isDark = scheme === 'dark';

  const typedTitle = CANVAS_TITLE.slice(0, Math.min(typed, CANVAS_TITLE.length));
  const typedBody = typed > CANVAS_TITLE.length ? CANVAS_BODY.slice(0, typed - CANVAS_TITLE.length) : '';
  const filed = step === 'filed';
  const noteCount = filed ? 13 : 12;

  const notebooks = [
    {id: 'personal', emoji: '📓', title: 'Personal', count: '5 notes'},
    {id: 'recipes', emoji: '🍳', title: 'Recipes', count: filed ? '3 notes' : '2 notes'},
    {id: 'travel', emoji: '✈️', title: 'Travel', count: 'Empty'},
    {id: 'ideas', emoji: '💡', title: 'Ideas', count: '1 note'},
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Light / dark toggle */}
      <div className="inline-flex rounded-full border border-black/[0.08] bg-white p-1 shadow-sm">
        {(
          [
            {key: 'light', label: 'Light', icon: Sun},
            {key: 'dark', label: 'Dark', icon: Moon},
          ] as const
        ).map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setScheme(opt.key)}
            className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              scheme === opt.key ? 'text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
            aria-pressed={scheme === opt.key}
          >
            {scheme === opt.key && (
              <motion.span
                layoutId="phone-scheme-pill"
                className="absolute inset-0 rounded-full bg-neutral-900"
                transition={{type: 'spring', bounce: 0.2, duration: 0.5}}
              />
            )}
            <opt.icon size={13} className="relative z-10" strokeWidth={2} />
            <span className="relative z-10">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Phone frame */}
      <div
        className="rounded-[44px] p-3 shadow-[0_30px_60px_-25px_rgba(20,20,25,0.45)] transition-colors duration-500"
        style={{background: t.frame}}
      >
        <div
          className="relative flex h-[660px] w-[300px] flex-col overflow-hidden rounded-[32px] transition-colors duration-500"
          style={{background: t.bg, color: t.text}}
        >
          <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-3 pt-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-[22px] font-bold leading-none tracking-tight">Notes</p>
                <p className="mt-1.5 text-[11px] font-medium" style={{color: t.textMuted}}>
                  {noteCount} notes · 4 notebooks
                </p>
              </div>
              <div className="flex gap-1.5 pt-0.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-[10px] text-[11px]"
                  style={{background: t.chip}}
                >
                  📁
                </div>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-[10px] text-[13px] font-semibold"
                  style={{background: t.chip}}
                >
                  +
                </div>
              </div>
            </div>

            {/* Write canvas */}
            <div className="rounded-2xl px-4 py-3.5 transition-colors duration-500" style={{background: t.card}}>
              <p
                className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.1em]"
                style={{color: t.textMuted}}
              >
                ✎ TODAY
              </p>
              <p
                className="mt-1.5 font-display text-[16px] font-semibold leading-snug tracking-tight"
                style={{color: step === 'empty' ? t.textMuted : t.text}}
              >
                {step === 'empty' ? 'Untitled' : typedTitle}
                {step === 'typing' && typed <= CANVAS_TITLE.length && (
                  <span className="ml-px inline-block h-[14px] w-[2px] animate-pulse bg-current align-middle" />
                )}
              </p>
              <p className="mt-1 min-h-[18px] text-[12.5px] leading-relaxed" style={{color: t.textMuted}}>
                {step === 'empty' ? (
                  'Write anything — a thought, a plan, a list…'
                ) : (
                  <>
                    {typedBody}
                    {step === 'typing' && typed > CANVAS_TITLE.length && (
                      <span className="ml-px inline-block h-[12px] w-[2px] animate-pulse bg-current align-middle" />
                    )}
                  </>
                )}
              </p>
              <AnimatePresence>
                {(step === 'done' || step === 'filed') && (
                  <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    transition={{duration: 0.3, ease: easeOut}}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between pt-3">
                      <span className="flex items-center gap-1 text-[10px] font-medium" style={{color: t.textMuted}}>
                        ⚡ AI will file this away
                      </span>
                      <span
                        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10.5px] font-bold"
                        style={{background: t.chipActive, color: t.chipTextActive}}
                      >
                        ✓ Done
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Library */}
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em]" style={{color: t.textMuted}}>
                Library
              </p>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {[
                  {icon: '📄', label: 'All Notes', count: String(noteCount)},
                  {icon: '•', label: 'Quick Notes', count: '3', dot: true},
                  {icon: '📥', label: 'Unsorted', count: '2'},
                ].map(chip => (
                  <span
                    key={chip.label}
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                    style={{background: t.chip}}
                  >
                    {chip.dot ? <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> : <span>{chip.icon}</span>}
                    {chip.label} <span className="font-medium" style={{color: t.textMuted}}>{chip.count}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em]" style={{color: t.textMuted}}>
                Groups
              </p>
              <div className="overflow-hidden rounded-2xl transition-colors duration-500" style={{background: t.card}}>
                <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold">
                  <span>📂</span>
                  <span className="flex-1">Work</span>
                  <span style={{color: t.textMuted}}>7</span>
                  <span className="text-[9px]" style={{color: t.textMuted}}>⌃</span>
                </div>
                <div className="flex gap-2 px-3 pb-3">
                  {[
                    {id: 'clients', emoji: '💼', title: 'Clients', count: '4 notes'},
                    {id: 'standups', emoji: '🗒️', title: 'Standups', count: '3 notes'},
                  ].map(tile => (
                    <div
                      key={tile.id}
                      className="flex flex-1 flex-col gap-0.5 rounded-xl p-2"
                      style={{background: notebookTint(tile.id, isDark)}}
                    >
                      <span className="text-[15px]">{tile.emoji}</span>
                      <span className="text-[11px] font-semibold">{tile.title}</span>
                      <span className="text-[9.5px] font-medium" style={{color: t.textSecondary}}>
                        {tile.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notebooks */}
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em]" style={{color: t.textMuted}}>
                Notebooks
              </p>
              <div className="grid grid-cols-2 gap-2">
                {notebooks.map(tile => (
                  <div
                    key={tile.id}
                    className="flex flex-col gap-0.5 rounded-xl p-2"
                    style={{background: notebookTint(tile.id, isDark)}}
                  >
                    <span className="text-[15px]">{tile.emoji}</span>
                    <span className="text-[11px] font-semibold">{tile.title}</span>
                    <span className="text-[9.5px] font-medium" style={{color: t.textSecondary}}>
                      {tile.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filed toast */}
          <AnimatePresence>
            {filed && (
              <motion.div
                initial={{opacity: 0, y: 14}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: 10}}
                transition={{duration: 0.3, ease: easeOut}}
                className="absolute inset-x-3 bottom-[60px] flex items-center gap-2 rounded-full bg-[#18181B] px-4 py-2.5 text-[11px] font-medium text-[#F5F5F7] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.4)] ring-1 ring-white/15"
              >
                <span className="text-emerald-400">✓</span> Filed under Recipes
                <span className="ml-auto font-bold text-indigo-300">Move</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab bar */}
          <div
            className="flex h-12 items-center justify-around border-t text-[9px] font-semibold transition-colors duration-500"
            style={{background: t.tabbarBg, borderColor: t.tabbarBorder, color: t.textMuted}}
          >
            {['Today', 'Notes', 'Tasks', 'Plan', 'Settings'].map(tab => (
              <span key={tab} style={tab === 'Notes' ? {color: t.text} : undefined}>
                {tab}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type WebTab = 'dashboard' | 'notes' | 'tasks' | 'calendar' | 'settings';

/**
 * Mirrors the real authenticated `/app` desktop shell (top pill nav),
 * so Sign in expectations match what users actually open — not the iPhone companion.
 */
function WebAppMockup() {
  const [tab, setTab] = useState<WebTab>('notes');

  const navItems = [
    {key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard},
    {key: 'notes' as const, label: 'Notes', icon: BookOpen},
    {key: 'tasks' as const, label: 'Tasks', icon: CheckSquare},
    {key: 'calendar' as const, label: 'Calendar', icon: CalendarDays},
    {key: 'settings' as const, label: 'Settings', icon: SettingsIcon},
  ];

  const kanbanCol = (title: string, items: string[], tint: string) => (
    <div key={title} className={`flex min-w-0 flex-1 flex-col gap-2 rounded-xl p-2 ${tint}`}>
      <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-black/40">{title}</p>
      {items.map(item => (
        <div
          key={item}
          className="rounded-lg border border-black/[0.05] bg-white px-2.5 py-2 text-[11px] font-medium text-neutral-700 shadow-sm"
        >
          {item}
        </div>
      ))}
    </div>
  );

  const calendarEvents: Record<number, {label: string; color: string}> = {
    3: {label: 'Study', color: 'bg-blue-500'},
    8: {label: 'Exam', color: 'bg-rose-500'},
    12: {label: 'Club', color: 'bg-violet-500'},
    17: {label: 'Gym', color: 'bg-emerald-500'},
    24: {label: 'Due', color: 'bg-amber-500'},
  };

  return (
    <div className="w-full max-w-[760px] overflow-hidden rounded-2xl border border-black/[0.08] bg-[#f8f9fa] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.25)]">
      {/* Browser chrome — same SPA after Sign in lands on /app */}
      <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#FAFAF8] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-black/[0.05] px-4 py-1 text-[11px] font-medium text-neutral-500">
          <span className="text-[9px]">🔒</span> noted.app/app
        </div>
        <div className="w-10" />
      </div>

      {/* Real desktop shell: logo left + centered top pill nav */}
      <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-black/[0.04] bg-white/80 px-4">
        <div className="flex items-center gap-2 justify-self-start">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
            <div className="h-3 w-3 rotate-45 rounded-[2px] bg-white" />
          </div>
          <span className="font-display text-sm font-bold tracking-tight text-neutral-900">Noted</span>
        </div>

        <nav className="justify-self-center">
          <div className="relative flex w-max items-center gap-0.5 rounded-2xl bg-black/5 p-1">
            {navItems.map(item => {
              const isActive = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition ${
                    isActive ? 'text-black' : 'text-black/40 hover:text-black/60'
                  }`}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.span
                      layoutId="web-nav-pill"
                      className="absolute inset-0 rounded-xl bg-white shadow-sm"
                      transition={{type: 'spring', bounce: 0.2, duration: 0.45}}
                    />
                  )}
                  <item.icon size={14} strokeWidth={2} className="relative z-10" />
                  <span className="relative z-10 hidden text-[11px] font-medium sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div aria-hidden="true" />
      </div>

      <div className="relative h-[380px] overflow-hidden bg-[#f8f9fa] p-5">
        <AnimatePresence mode="wait">
          {tab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.25, ease: easeOut}}
              className="space-y-3"
            >
              <p className="font-display text-lg font-bold text-neutral-900">Good afternoon</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label: 'Focus', value: '25 min', tint: 'bg-blue-50'},
                  {label: 'Tasks left', value: '4', tint: 'bg-amber-50'},
                  {label: 'Notes today', value: '2', tint: 'bg-emerald-50'},
                ].map(card => (
                  <div key={card.label} className={`rounded-xl border border-black/[0.05] ${card.tint} p-3`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-black/40">{card.label}</p>
                    <p className="mt-1 font-display text-base font-bold text-neutral-900">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-black/35">Up next</p>
                <p className="mt-1.5 text-[13px] font-semibold text-neutral-900">Study block · 3:00–4:00 PM</p>
              </div>
            </motion.div>
          )}
          {tab === 'notes' && (
            <motion.div
              key="notes"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.25, ease: easeOut}}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="font-display text-lg font-bold text-neutral-900">Notes</p>
                <span className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white">+ New note</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {title: 'Ideas for the essay', tag: 'Draft', tagCls: 'bg-amber-100 text-amber-800'},
                  {title: 'Lecture 12 — memory', tag: 'Uni', tagCls: 'bg-blue-100 text-blue-800'},
                  {title: 'Weekend trip packing', tag: 'Travel', tagCls: 'bg-emerald-100 text-emerald-800'},
                  {title: 'Reading list', tag: 'Personal', tagCls: 'bg-rose-100 text-rose-800'},
                ].map(note => (
                  <div key={note.title} className="rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-sm">
                    <p className="font-display text-[13px] font-bold text-neutral-900">{note.title}</p>
                    <div className="mt-2.5 space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-black/[0.06]" />
                      <div className="h-1.5 w-[80%] rounded-full bg-black/[0.05]" />
                    </div>
                    <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${note.tagCls}`}>
                      {note.tag}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {tab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.25, ease: easeOut}}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="font-display text-lg font-bold text-neutral-900">Tasks</p>
                <span className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white">+ Add task</span>
              </div>
              <div className="flex gap-2.5">
                {kanbanCol('To-Do', ['Read chapter 4', 'Email professor', 'Book study room'], 'bg-slate-50/80')}
                {kanbanCol('Started', ['Lab report', 'Essay draft'], 'bg-blue-50/60')}
                {kanbanCol('Done', ['Outline', 'Bibliography'], 'bg-emerald-50/70')}
              </div>
            </motion.div>
          )}
          {tab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.25, ease: easeOut}}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="font-display text-lg font-bold text-neutral-900">April 2026</p>
                <span className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white">+ Event</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
                <div className="grid grid-cols-7 border-b border-black/[0.05] bg-[#FAFAF8] py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-black/35">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-black/[0.04]">
                  {Array.from({length: 28}, (_, i) => i + 1).map(d => (
                    <div key={d} className="flex min-h-[38px] flex-col gap-0.5 bg-white p-1">
                      <span className="text-[9px] font-semibold text-black/40">{d}</span>
                      {calendarEvents[d] && (
                        <span
                          className={`truncate rounded px-1 py-px text-[7.5px] font-semibold text-white ${calendarEvents[d].color}`}
                        >
                          {calendarEvents[d].label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {tab === 'settings' && (
            <motion.div
              key="settings"
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.25, ease: easeOut}}
              className="space-y-3"
            >
              <p className="font-display text-lg font-bold text-neutral-900">Settings</p>
              {['Account', 'Theme', 'Export data'].map(row => (
                <div
                  key={row}
                  className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 text-[13px] font-medium text-neutral-800 shadow-sm"
                >
                  {row}
                  <span className="text-black/25">›</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlatformShowcase() {
  const [device, setDevice] = useState<'web' | 'iphone'>('web');

  return (
    <section
      id="download"
      className="border-t border-black/[0.04] bg-[#FAF8F5] px-5 py-20 sm:px-8 md:py-28"
      aria-labelledby="chapter-everywhere"
    >
      <div className="mx-auto max-w-6xl">
        <FadeUp className="text-center">
          <p id="chapter-everywhere" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-600">
            04 — Everywhere
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[48px]">
            One workspace. Every screen.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-[1.7] text-[#555]">
            Sign in opens the Noted web workspace in your browser. The iPhone companion is a separate App Store app that
            stays in sync — logging in here never launches the native mobile app.
          </p>
        </FadeUp>

        <FadeUp delay={0.1} className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-black/[0.08] bg-white p-1 shadow-sm">
            {(
              [
                {key: 'web', label: 'Web app', icon: Globe},
                {key: 'iphone', label: 'iPhone app', icon: Smartphone},
              ] as const
            ).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDevice(opt.key)}
                className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  device === opt.key ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
                aria-pressed={device === opt.key}
              >
                {device === opt.key && (
                  <motion.span
                    layoutId="device-pill"
                    className="absolute inset-0 rounded-full bg-neutral-900"
                    transition={{type: 'spring', bounce: 0.2, duration: 0.5}}
                  />
                )}
                <opt.icon size={16} className="relative z-10" strokeWidth={2} />
                <span className="relative z-10">{opt.label}</span>
              </button>
            ))}
          </div>
        </FadeUp>

        <div className="mt-10 flex min-h-[540px] items-start justify-center md:mt-12 md:min-h-[720px]">
          <AnimatePresence mode="wait">
            {device === 'web' ? (
              <motion.div
                key="web"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -12}}
                transition={{duration: 0.35, ease: easeOut}}
                className="flex w-full flex-col items-center gap-4"
              >
                <WebAppMockup />
                <p className="max-w-md text-center text-sm leading-relaxed text-[#777]">
                  This is what Sign in opens — the browser workspace with the top pill nav. On a narrow phone screen the
                  same website uses a compact bottom tab bar; that is still the web app, not the native iPhone app.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="iphone"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -12}}
                transition={{duration: 0.35, ease: easeOut}}
                className="flex flex-col items-center gap-4"
              >
                <PhoneMockup />
                <p className="max-w-sm text-center text-sm leading-relaxed text-[#777]">
                  Preview of the separate iPhone companion. Install it from the App Store — Sign in on this site always
                  opens the browser workspace instead.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <FadeUp className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-neutral-900 px-8 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:bg-neutral-800 active:scale-[0.98]"
          >
            Open Noted in your browser →
          </Link>
          <AppStoreBadge />
        </FadeUp>
      </div>
    </section>
  );
}

const timelineSteps = [
  {
    n: 1,
    icon: Sparkles,
    title: 'Sign up in seconds',
    desc: 'Create your account and land in a clean workspace.',
  },
  {
    n: 2,
    icon: LayoutGrid,
    title: 'Set up your workspace',
    desc: 'Notebooks, tags, and views that match how you work.',
  },
  {
    n: 3,
    icon: CheckCircle2,
    title: 'Capture, plan, focus',
    desc: 'Notes, tasks, and calendar stay in sync — one flow.',
  },
  {
    n: 4,
    icon: Smartphone,
    title: 'Take it everywhere',
    desc: 'Pick up on the web or in the iPhone app — always in sync.',
  },
] as const;

export default function Landing() {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const [navSolid, setNavSolid] = useState(false);

  const onScroll = useCallback(() => {
    const el = scrollRootRef.current;
    const top = el ? el.scrollTop : 0;
    setNavSolid(top > 50);
  }, []);

  useEffect(() => {
    const el = scrollRootRef.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, {passive: true});
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  return (
    <div
      ref={scrollRootRef}
      className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-white [scrollbar-width:thin]"
    >
      {/* Nav */}
      <header
        className={`fixed left-0 right-0 top-0 z-[100] transition-all duration-300 ${
          navSolid ? 'border-b border-black/[0.06] bg-white/85 shadow-sm backdrop-blur-[12px]' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black">
              <div className="h-3.5 w-3.5 rotate-45 rounded-sm bg-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-neutral-900">Noted</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className={`rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                navSolid ? 'text-neutral-700 hover:bg-black/[0.05]' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 ${
                navSolid ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-white text-neutral-900 hover:bg-white/95'
              }`}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-24 sm:px-8"
        aria-label="Hero"
      >
        <Suspense
          fallback={
            <div
              className="absolute inset-0 z-0 bg-gradient-to-br from-[#F57799] via-[#dbba95] to-[#FAAC68]"
              aria-hidden
            />
          }
        >
          <ShaderHeroBackground />
        </Suspense>

        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/10 to-black/30" aria-hidden />

        <div className="relative z-[2] mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <motion.div
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut}}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-md"
          >
            <span className="text-base leading-none">✦</span>
            <span>Your calm productivity space</span>
          </motion.div>

          <motion.h1
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut, delay: 0.08}}
            className="font-display text-[36px] font-bold leading-[1.1] tracking-tight text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.25)] sm:text-5xl md:text-[64px]"
          >
            Everything you need.
            <br className="hidden sm:block" /> Nothing you don&apos;t.
          </motion.h1>

          <motion.p
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut, delay: 0.16}}
            className="mt-5 max-w-xl text-lg leading-relaxed text-white/60"
          >
            Notes, tasks, and calendar — beautifully unified.
          </motion.p>

          <motion.div
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut, delay: 0.24}}
            className="relative z-[2] mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              to="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-neutral-900 shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Get started free
            </Link>
            <button
              type="button"
              onClick={scrollToFeatures}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98]"
            >
              See how it works
            </button>
          </motion.div>

          <motion.p
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.6, delay: 0.35}}
            className="mt-8 text-sm font-medium text-white/55"
          >
            Built for students & creators · Free to start
          </motion.p>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 z-[2] -translate-x-1/2 text-white/70"
          animate={{y: [0, 8, 0]}}
          transition={{duration: 1.8, repeat: Infinity, ease: 'easeInOut'}}
          aria-hidden
        >
          <ArrowDown className="h-6 w-6" strokeWidth={1.5} />
        </motion.div>
      </section>

      {/* ── Story: Notes ── */}
      <section
        id="features"
        ref={featuresRef}
        className="border-t border-black/[0.04] bg-[#FAFAF8] px-5 py-20 sm:px-8 md:py-28"
        aria-labelledby="chapter-notes"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-14 lg:gap-20">
          <div className="order-2 md:order-1">
            <FadeUp delay={0}>
              <p id="chapter-notes" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-500">
                01 — Capture
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[44px]">
                Notes that file themselves.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-[1.7] text-[#555]">
                Jot a quick note anywhere — AI tucks it into the right notebook. Organize the rest your way with
                notebooks, groups, and a library that stays tidy.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['⚡ AI filing', '📓 Notebooks', '🗂️ Groups', '✍️ Quick notes'].map(f => (
                  <span key={f} className="rounded-full bg-black/[0.05] px-3 py-1.5 text-[11px] font-semibold text-neutral-600">
                    {f}
                  </span>
                ))}
              </div>
            </FadeUp>
          </div>
          <FadeUp delay={0.1} className="order-1 md:order-2">
            <NotesFeature />
          </FadeUp>
        </div>
      </section>

      {/* ── Story: Tasks ── */}
      <section className="border-t border-black/[0.04] bg-[#F5F7FA] px-5 py-20 sm:px-8 md:py-28" aria-labelledby="chapter-tasks">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-14 lg:gap-20">
          <FadeUp delay={0.1} className="md:order-1">
            <TasksFeature />
          </FadeUp>
          <div className="md:order-2">
            <FadeUp delay={0}>
              <p id="chapter-tasks" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600">
                02 — Focus
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[44px]">
                From to-do to done, with momentum.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-[1.7] text-[#555]">
                A board that fits how you think. Give every task an importance, link it to a notebook, and watch the
                progress bar fill as things move from To Do to Done.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['📊 Progress tracking', '🔥 Importance levels', '📔 Notebook links', '🖱️ Drag & drop'].map(f => (
                  <span key={f} className="rounded-full bg-black/[0.05] px-3 py-1.5 text-[11px] font-semibold text-neutral-600">
                    {f}
                  </span>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Story: Calendar ── */}
      <section className="border-t border-black/[0.04] bg-[#F7F5FA] px-5 py-20 sm:px-8 md:py-28" aria-labelledby="chapter-calendar">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-14 lg:gap-20">
          <div className="order-2 md:order-1">
            <FadeUp delay={0}>
              <p id="chapter-calendar" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-600">
                03 — Plan
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[44px]">
                Describe your week. It plans your days.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-[1.7] text-[#555]">
                Tell Noted what&apos;s coming — a test on Friday, an essay due Wednesday — and it drafts a balanced
                schedule around what&apos;s already on your calendar. Approve it, and your day becomes a timeline you
                can actually follow.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['💬 Plain-English planning', '🧠 Overlap-aware', '📆 Day timeline', '🔁 Routines'].map(f => (
                  <span key={f} className="rounded-full bg-black/[0.05] px-3 py-1.5 text-[11px] font-semibold text-neutral-600">
                    {f}
                  </span>
                ))}
              </div>
            </FadeUp>
          </div>
          <FadeUp delay={0.1} className="order-1 md:order-2">
            <SchedulerFeature />
          </FadeUp>
        </div>
      </section>

      {/* ── Story: Everywhere (web + iPhone) ── */}
      <PlatformShowcase />

      {/* ── How it works ── */}
      <section className="border-t border-black/[0.04] bg-white px-5 py-20 sm:px-8 md:py-28" aria-labelledby="how-heading">
        <FadeUp>
          <h2 id="how-heading" className="text-center font-display text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-base leading-relaxed text-[#555]">
            From first click to daily rhythm — a path that stays simple.
          </p>
        </FadeUp>

        {/* Desktop: horizontal timeline + connector line */}
        <div className="mx-auto mt-16 hidden max-w-5xl md:block">
          <div className="relative grid grid-cols-4 gap-3 lg:gap-6">
            <div
              className="pointer-events-none absolute left-[12%] right-[12%] top-6 z-0 h-px bg-gradient-to-r from-transparent via-black/12 to-transparent"
              aria-hidden
            />
            {timelineSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.n}
                  className="relative z-10 flex flex-col items-center px-1 text-center"
                  initial={{opacity: 0, y: 28}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-40px'}}
                  transition={{duration: 0.6, ease: easeOut, delay: i * 0.1}}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.06] bg-white text-neutral-800 shadow-sm ring-4 ring-white">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <span className="mt-4 font-display text-xs font-bold text-black/30">0{step.n}</span>
                  <h3 className="mt-1 font-display text-base font-bold text-neutral-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555]">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="mx-auto mt-12 max-w-md md:mt-16 md:hidden">
          <div className="relative pl-8">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-black/[0.1]" aria-hidden />
            {timelineSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.n}
                  className="relative pb-10 last:pb-0"
                  initial={{opacity: 0, y: 24}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-24px'}}
                  transition={{duration: 0.6, ease: easeOut, delay: i * 0.1}}
                >
                  <div className="absolute left-0 top-0 flex h-8 w-8 -translate-x-[2px] items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-800 shadow-sm">
                    <Icon size={16} strokeWidth={1.75} />
                  </div>
                  <div className="pl-10">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/35">Step {step.n}</span>
                    <h3 className="mt-1 font-display text-lg font-bold text-neutral-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#555]">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        className="border-t border-black/[0.04] px-5 py-24 sm:px-8 md:py-32"
        style={{
          background: 'linear-gradient(135deg, #F57799, #dbba95, #FAAC68)',
        }}
        aria-labelledby="cta-heading"
      >
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <h2 id="cta-heading" className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl">
              Ready to get noted?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/90">
              Join thousands of students and creators who stay organized with Noted.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.div whileHover={{scale: 1.03}} whileTap={{scale: 0.98}}>
                <Link
                  to="/signup"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-10 text-base font-semibold text-neutral-900 shadow-lg"
                >
                  Start for free →
                </Link>
              </motion.div>
              <AppStoreBadge />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0D0D0D] px-5 py-14 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="text-center md:text-left">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                <div className="h-3 w-3 rotate-45 rounded-sm bg-neutral-900" />
              </div>
              <span className="font-display text-lg font-bold">Noted</span>
            </Link>
            <p className="mt-2 text-sm text-white/50">Your calm space.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-white/70 md:gap-8">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#download" className="transition hover:text-white">
              iPhone app
            </a>
            <Link to="/login" className="transition hover:text-white">
              Sign in
            </Link>
            <Link to="/signup" className="transition hover:text-white">
              Get started
            </Link>
          </nav>
          <p className="text-center text-xs text-white/40 md:text-right">© 2025 Noted. Made with care.</p>
        </div>
      </footer>
    </div>
  );
}
