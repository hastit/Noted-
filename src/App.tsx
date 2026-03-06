import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Settings as SettingsIcon,
  Bell,
  Search,
  User
} from 'lucide-react';
import { TabType, CalendarEvent, Tag, Notebook, Folder, Note, QuickNote } from './types';
import { DEFAULT_TAGS, MOCK_EVENTS, MOCK_NOTEBOOKS, MOCK_FOLDERS, MOCK_NOTES, MOCK_QUICK_NOTES } from './constants';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Notes from './components/Notes';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function AppContent() {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  
  // Notes State
  const [notebooks, setNotebooks] = useState<Notebook[]>(MOCK_NOTEBOOKS);
  const [folders, setFolders] = useState<Folder[]>(MOCK_FOLDERS);
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(MOCK_QUICK_NOTES);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const tabs = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'tasks', label: t('tasks'), icon: CheckSquare },
    { id: 'notes', label: t('notes'), icon: BookOpen },
    { id: 'calendar', label: t('calendar'), icon: CalendarIcon },
    { id: 'settings', label: t('settings'), icon: SettingsIcon },
  ];

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-canvas">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-12 h-12 rounded-2xl bg-ink flex items-center justify-center mb-6"
        >
          <div className="w-6 h-6 rounded-sm bg-white rotate-45" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-bold tracking-[0.3em] text-ink/20 uppercase"
        >
          {t('loading')}
        </motion.p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onSignIn={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-canvas selection:bg-ink selection:text-white">
      {/* Top Header - Minimal */}
      <header className="h-16 flex items-center justify-between px-10 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-ink flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-white rotate-45" />
          </div>
          <span className="font-bold text-lg tracking-tight">Noty</span>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-ink/40 hover:text-ink transition-colors">
            <Search size={18} />
          </button>
          <button className="text-ink/40 hover:text-ink transition-colors">
            <Bell size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            <User size={16} className="text-ink/60" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative px-10 pb-32 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="h-full w-full max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                events={events} 
                tags={tags} 
                onNavigate={(tab, notebookId) => {
                  if (notebookId) setSelectedNotebookId(notebookId);
                  setActiveTab(tab);
                }} 
              />
            )}
            {activeTab === 'tasks' && <Tasks />}
            {activeTab === 'notes' && (
              <Notes 
                notebooks={notebooks}
                folders={folders}
                notes={notes}
                quickNotes={quickNotes}
                onNotebooksChange={setNotebooks}
                onFoldersChange={setFolders}
                onNotesChange={setNotes}
                onQuickNotesChange={setQuickNotes}
                initialNotebookId={selectedNotebookId}
                onClearInitialNotebook={() => setSelectedNotebookId(null)}
              />
            )}
            {activeTab === 'calendar' && (
              <Calendar 
                events={events} 
                tags={tags} 
                onEventsChange={setEvents} 
                onTagsChange={setTags} 
              />
            )}
            {activeTab === 'settings' && <Settings onSignOut={() => setIsAuthenticated(false)} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Dock Navigation */}
      <div className="dock-container">
        <nav className="dock">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`dock-item ${isActive ? 'dock-item-active' : ''}`}
                title={tab.label}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
