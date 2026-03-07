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
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function AppContent() {
  const { t } = useLanguage();
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-black/5 border-t-black/20 mb-4"
        />
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-light tracking-widest text-black/40 uppercase"
        >
          Preparing your study space
        </motion.p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="h-20 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <div className="w-4 h-4 rounded-sm bg-white rotate-45" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Noty</span>
        </div>

        <nav className="relative flex items-center gap-1 bg-black/5 p-1 rounded-2xl backdrop-blur-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  isActive ? 'text-black' : 'text-black/40 hover:text-black/60'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-beam"
                    className="absolute inset-0 bg-white shadow-sm rounded-xl z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10 text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <button className="p-2 text-black/40 hover:text-black transition-colors" title={t('search')}>
            <Search size={20} />
          </button>
          <button className="p-2 text-black/40 hover:text-black transition-colors">
            <Bell size={20} />
          </button>
          <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            <User size={20} className="text-black/60" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative px-8 pb-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full"
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
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Decorative Background Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-100/30 blur-[120px] rounded-full -z-10" />
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
