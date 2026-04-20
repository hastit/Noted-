import React, {lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {motion, AnimatePresence} from 'motion/react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  Bell,
  Search,
  User,
} from 'lucide-react';
import {TabType, CalendarEvent, Tag, Notebook, Folder, Note, QuickNote, Task} from './types';
import {DEFAULT_TAGS} from './constants';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Notes from './components/Notes';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import AuthScreen from './components/AuthScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import MobileBottomNav from './components/MobileBottomNav';
import {LanguageProvider, useLanguage} from './context/LanguageContext';
import {AuthProvider, useAuth} from './context/AuthContext';
import * as notesService from './lib/notes';
import * as tasksService from './lib/tasks';
import * as calendarService from './lib/calendar';
import {isRecoveryImplicitHash} from './lib/authRecoveryHash';

const Landing = lazy(() => import('./pages/Landing'));

const LS_NOTEBOOKS = 'noted-notebooks-v1';
const LS_FOLDERS = 'noted-folders-v1';
const LS_QUICK = 'noted-quick-notes-v1';

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeNotebooksForNotes(notebooks: Notebook[], notes: Note[]): Notebook[] {
  const seen = new Set(notebooks.map(n => n.id));
  const extra: Notebook[] = [];
  for (const note of notes) {
    if (!seen.has(note.notebookId)) {
      seen.add(note.notebookId);
      extra.push({
        id: note.notebookId,
        title: 'Notebook',
        color: '#F4F4F4',
        createdAt: new Date().toISOString(),
        lastUsedAt: note.updatedAt,
      });
    }
  }
  return [...notebooks, ...extra];
}

function SessionLoadingScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
      <motion.div
        animate={{rotate: 360}}
        transition={{duration: 2, repeat: Infinity, ease: 'linear'}}
        className="w-16 h-16 rounded-full border-4 border-black/5 border-t-black/20 mb-4"
      />
      <p className="text-sm font-light tracking-widest text-black/40 uppercase">Loading session</p>
    </div>
  );
}

function PublicHome() {
  const {session, loading} = useAuth();

  /** Recovery must run on `/reset-password`; if the email opened `/` with a hash, move tokens before auth consumes them. */
  useLayoutEffect(() => {
    const {pathname, hash} = window.location;
    if ((pathname === '/' || pathname === '') && isRecoveryImplicitHash(hash)) {
      window.location.replace(`${window.location.origin}/reset-password${hash}`);
    }
  }, []);

  if (loading) return <SessionLoadingScreen />;
  if (session) return <Navigate to="/app" replace />;
  return (
    <Suspense fallback={<SessionLoadingScreen />}>
      <Landing />
    </Suspense>
  );
}

function AuthRoute({mode}: {mode: 'login' | 'signup'}) {
  const {session, loading} = useAuth();

  useLayoutEffect(() => {
    const {hash} = window.location;
    if (isRecoveryImplicitHash(hash)) {
      window.location.replace(`${window.location.origin}/reset-password${hash}`);
    }
  }, []);

  if (loading) return <SessionLoadingScreen />;
  if (session) return <Navigate to="/app" replace />;
  return <AuthScreen initialMode={mode} />;
}

function AppShell() {
  const {session, loading} = useAuth();
  if (loading) return <SessionLoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <LanguageProvider>
      <AuthenticatedApp />
    </LanguageProvider>
  );
}

function AuthenticatedApp() {
  const {t} = useLanguage();
  const {user} = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dataLoading, setDataLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notebooks, setNotebooksState] = useState<Notebook[]>(() => loadLS<Notebook[]>(LS_NOTEBOOKS, []));
  const [folders, setFoldersState] = useState<Folder[]>(() => loadLS<Folder[]>(LS_FOLDERS, []));
  const [notes, setNotes] = useState<Note[]>([]);
  const [quickNotes, setQuickNotesState] = useState<QuickNote[]>(() => loadLS<QuickNote[]>(LS_QUICK, []));
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);

  const notePersistTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setNotebooks = useCallback((nbs: Notebook[]) => {
    setNotebooksState(nbs);
    saveLS(LS_NOTEBOOKS, nbs);
  }, []);

  const setFolders = useCallback((f: Folder[]) => {
    setFoldersState(f);
    saveLS(LS_FOLDERS, f);
  }, []);

  const setQuickNotes = useCallback((q: QuickNote[]) => {
    setQuickNotesState(q);
    saveLS(LS_QUICK, q);
  }, []);

  const mergedNotebooks = useMemo(() => mergeNotebooksForNotes(notebooks, notes), [notebooks, notes]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const [n, t, e] = await Promise.all([
          notesService.getNotes(),
          tasksService.getTasks(),
          calendarService.getEvents(),
        ]);
        if (!cancelled) {
          setNotes(n);
          setTasks(t);
          setEvents(e);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const scheduleNotePersist = useCallback((note: Note) => {
    const prev = notePersistTimers.current.get(note.id);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      notePersistTimers.current.delete(note.id);
      void notesService
        .updateNote(note.id, {
          title: note.title,
          content: note.content,
          notebookId: note.notebookId,
        })
        .catch(err => console.error(err));
    }, 650);
    notePersistTimers.current.set(note.id, timer);
  }, []);

  const supabaseNotes = useMemo(
    () => ({
      createNote: (notebookId: string, partial: {title: string; content: string}) =>
        notesService.createNote({notebookId, title: partial.title, content: partial.content}),
      deleteNote: (id: string) => notesService.deleteNote(id),
      persistNote: scheduleNotePersist,
    }),
    [scheduleNotePersist],
  );

  const remoteTasks = useMemo(
    () => ({
      create: (partial: Omit<Task, 'id' | 'status'>, status: Task['status']) =>
        tasksService.createTask({...partial, status} as Omit<Task, 'id'>),
      update: (task: Task) => tasksService.updateTask(task.id, task),
    }),
    [],
  );

  const remoteEvents = useMemo(
    () => ({
      create: (ev: Omit<CalendarEvent, 'id'>) => calendarService.createEvent(ev),
    }),
    [],
  );

  const tabs = [
    {id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard},
    {id: 'tasks', label: t('tasks'), icon: CheckSquare},
    {id: 'notes', label: t('notes'), icon: BookOpen},
    {id: 'calendar', label: t('calendar'), icon: CalendarIcon},
    {id: 'settings', label: t('settings'), icon: SettingsIcon},
  ];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative min-h-0">
      {dataLoading && (
        <div className="absolute inset-0 z-[150] flex flex-col items-center justify-center bg-[#f8f9fa]/80 backdrop-blur-[2px] pointer-events-none">
          <motion.div
            animate={{rotate: 360}}
            transition={{duration: 1.2, repeat: Infinity, ease: 'linear'}}
            className="w-9 h-9 rounded-full border-2 border-black/5 border-t-black/25 mb-3 pointer-events-auto"
          />
          <p className="text-xs font-medium text-black/35 tracking-wide pointer-events-auto">Loading your data…</p>
        </div>
      )}

      <header className="hidden md:grid h-16 sm:h-20 shrink-0 z-50 grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] items-center gap-2 sm:gap-3 px-3 sm:px-5 lg:px-8 min-w-0 border-b border-black/[0.04]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 pr-1">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-black flex items-center justify-center">
            <div className="w-4 h-4 rounded-sm bg-white rotate-45" />
          </div>
          <span className="font-display font-bold text-lg sm:text-xl tracking-tight truncate">Noted</span>
        </div>

        <nav className="min-w-0 justify-self-stretch max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:thin] py-0.5">
          <div className="relative flex w-max min-w-0 max-w-full mx-auto items-center gap-0.5 sm:gap-1 bg-black/5 p-1 rounded-2xl backdrop-blur-md">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`relative flex items-center gap-1.5 sm:gap-2 shrink-0 px-2 sm:px-3 lg:px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-black' : 'text-black/40 hover:text-black/60'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-beam"
                      className="absolute inset-0 bg-white shadow-sm rounded-xl z-0"
                      transition={{type: 'spring', bounce: 0.2, duration: 0.6}}
                    />
                  )}
                  <Icon size={18} className="relative z-10 shrink-0" />
                  <span className="relative z-10 text-xs sm:text-sm font-medium hidden md:inline max-w-[5.5rem] lg:max-w-none truncate">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center justify-end gap-1 sm:gap-2 lg:gap-4 shrink-0 pl-1">
          <button
            type="button"
            className="p-2 text-black/40 hover:text-black transition-colors shrink-0"
            title={t('search')}
          >
            <Search size={20} />
          </button>
          <button type="button" className="p-2 text-black/40 hover:text-black transition-colors shrink-0 max-sm:hidden">
            <Bell size={20} />
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full glass-panel flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            <User size={20} className="text-black/60" />
          </div>
        </div>
      </header>

      <header className="md:hidden flex h-12 max-h-12 shrink-0 z-50 items-center justify-between gap-2 px-3 min-w-0 border-b border-black/[0.04] bg-[#f8f9fa]/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-md bg-black flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-white rotate-45" />
          </div>
          <span className="font-display font-bold text-[15px] tracking-tight truncate">Noted</span>
        </div>
        <div className="w-9 h-9 min-w-9 min-h-9 rounded-full glass-panel flex items-center justify-center shrink-0">
          <User size={18} className="text-black/60" />
        </div>
      </header>

      <main className="flex-1 min-h-0 min-w-0 flex flex-col relative px-3 sm:px-5 lg:px-8 max-md:px-3 max-md:pt-2 md:pt-6 lg:pt-7 pb-4 sm:pb-6 lg:pb-8 max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] overflow-x-visible overflow-y-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -10}}
            transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
            className="h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-visible"
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                events={events}
                tags={tags}
                notebooks={mergedNotebooks}
                notes={notes}
                onNavigate={(tab, notebookId) => {
                  if (notebookId) setSelectedNotebookId(notebookId);
                  setActiveTab(tab);
                }}
              />
            )}
            {activeTab === 'tasks' && (
              <Tasks
                tasks={tasks}
                onTasksChange={setTasks}
                notebooks={mergedNotebooks}
                remoteTasks={remoteTasks}
                onNavigate={(tab, notebookId) => {
                  if (notebookId) setSelectedNotebookId(notebookId);
                  setActiveTab(tab);
                }}
              />
            )}
            {activeTab === 'notes' && (
              <Notes
                notebooks={mergedNotebooks}
                folders={folders}
                notes={notes}
                quickNotes={quickNotes}
                onNotebooksChange={setNotebooks}
                onFoldersChange={setFolders}
                onNotesChange={setNotes}
                onQuickNotesChange={setQuickNotes}
                initialNotebookId={selectedNotebookId}
                onClearInitialNotebook={() => setSelectedNotebookId(null)}
                tasks={tasks}
                onTasksChange={setTasks}
                onNavigateToTasks={() => setActiveTab('tasks')}
                supabaseNotes={supabaseNotes}
              />
            )}
            {activeTab === 'calendar' && (
              <Calendar
                events={events}
                tags={tags}
                onEventsChange={setEvents}
                onTagsChange={setTags}
                remoteEvents={remoteEvents}
              />
            )}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileBottomNav active={activeTab} onChange={setActiveTab} />

      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-100/30 blur-[120px] rounded-full -z-10" />
    </div>
  );
}

/**
 * All URLs are served by the same Vite dev server (default port 5173).
 * `/` = marketing landing (guests); `/app` = SPA shell (session required); auth routes stay public.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<AuthRoute mode="login" />} />
      <Route path="/signup" element={<AuthRoute mode="signup" />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/app" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
