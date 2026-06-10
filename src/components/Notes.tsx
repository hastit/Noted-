import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Folder, Search, MoreVertical, Book, ChevronRight, X, FileText, ArrowLeft, Upload, Type, Trash2, List } from 'lucide-react';
import NoteEditor from './NoteEditor';
import { Notebook, Folder as FolderType, Note, PDFFile, QuickNote, Task } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';
import * as pdfService from '../lib/pdfFiles';
import { LIMITS, limitError } from '../lib/limits';
import MobileFab from './MobileFab';

const NOTEBOOK_COLORS = [
  '#DDE6FF', '#FFF9E7', '#D9FFF3', '#FFD9DC', '#E8D9FF', '#F4F4F4'
];

const EMOJI_OPTIONS = [
  '📚', '📖', '📝', '✏️', '🖊️', '📓', '📔', '📒', '📕', '📗', '📘', '📙',
  '🔬', '🧪', '🧬', '🧫', '🔭', '⚗️', '🧲', '💡', '🔋', '⚡',
  '📐', '📏', '🧮', '➕', '➖', '🔢',
  '🎨', '🎭', '🎬', '🎵', '🎸', '🎹', '🎺', '🎻', '🖌️',
  '🌱', '🌿', '🌍', '🌊', '☀️', '🌙', '⭐', '🌸',
  '🏆', '💯', '🎯', '🚀', '🔑', '💎', '🧠', '💻', '🖥️', '📱',
  '🏛️', '⚔️', '🗺️', '🌐', '🏺', '📜', '🗿',
  '🐾', '🦁', '🐬', '🦋', '🌺', '🍃', '🦊',
];

export type SupabaseNotesBridge = {
  createNote: (notebookId: string, partial: { title: string; content: string }) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  persistNote: (note: Note) => void;
};

interface NotesProps {
  notebooks: Notebook[];
  folders: FolderType[];
  notes: Note[];
  quickNotes: QuickNote[];
  onImmersiveModeChange?: (immersive: boolean) => void;
  onNotebooksChange: (notebooks: Notebook[]) => void;
  onFoldersChange: (folders: FolderType[]) => void;
  onNotesChange: (notes: Note[]) => void;
  onQuickNotesChange: (quickNotes: QuickNote[]) => void;
  initialNotebookId?: string | null;
  onClearInitialNotebook?: () => void;
  tasks?: Task[];
  onTasksChange?: (tasks: Task[]) => void;
  onNavigateToTasks?: () => void;
  supabaseNotes?: SupabaseNotesBridge;
}

function NotebookCard({
  notebook,
  count,
  recentNote,
  index,
  onClick,
  onRename,
  onDelete,
}: {
  notebook: Notebook;
  count: number;
  recentNote?: Note;
  index: number;
  onClick: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div
        className="aspect-[3/4] rounded-xl relative overflow-hidden w-full transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
        style={{ backgroundColor: notebook.color }}
      >
        {/* Spine */}
        <div className="absolute left-0 top-0 bottom-0 w-[22%] bg-black/[0.18]" />
        {/* Binding rings */}
        {[14, 36, 58, 80].map((pct) => (
          <div
            key={pct}
            className="absolute"
            style={{ top: `${pct}%`, left: '11%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3 h-3 rounded-full border-[2px] border-white/55 bg-black/[0.12]" />
          </div>
        ))}
        {/* Ruled lines on lower cover */}
        <div className="absolute left-[22%] right-0 bottom-0 h-[40%] pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, j) => (
            <div
              key={j}
              className="absolute w-full border-b border-black/[0.08]"
              style={{ top: `${j * 20}%` }}
            />
          ))}
        </div>
        {/* Content */}
        <div className="absolute inset-0 flex flex-col pl-[26%] pr-2.5 pt-2.5 pb-3">
          <div className="flex justify-end items-start gap-0.5 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRename(notebook.id); }}
              className="p-1 hover:bg-black/10 rounded text-black/30 hover:text-black/60 transition-colors"
            >
              <Type size={10} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(notebook.id); }}
              className="p-1 hover:bg-red-50/60 rounded text-black/25 hover:text-red-400 transition-colors"
            >
              <Trash2 size={10} />
            </button>
          </div>
          <div className="mt-auto min-w-0">
            {notebook.emoji ? (
              <span className="text-xl leading-none block mb-2">{notebook.emoji}</span>
            ) : (
              <div className="w-6 h-6 mb-2 rounded-md bg-black/[0.08] flex items-center justify-center">
                <Book size={12} className="text-black/40" />
              </div>
            )}
            <h4 className="font-bold text-[12px] leading-snug line-clamp-2 text-black/80 mb-1">
              {notebook.title}
            </h4>
            {recentNote && (
              <p className="text-[9px] text-black/35 truncate mb-0.5">{recentNote.title}</p>
            )}
            <p className="text-[9px] font-semibold text-black/25 uppercase tracking-wide">
              {count} {count === 1 ? 'page' : 'pages'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Notes({
  notebooks,
  folders,
  notes,
  quickNotes,
  onImmersiveModeChange,
  onNotebooksChange,
  onFoldersChange,
  onNotesChange,
  onQuickNotesChange,
  initialNotebookId,
  onClearInitialNotebook,
  tasks = [],
  onTasksChange,
  onNavigateToTasks,
  supabaseNotes,
}: NotesProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [pdfUploading, setPdfUploading] = useState(false);

  useEffect(() => {
    pdfService.getPdfs().then(setPdfs).catch(console.error);
  }, []);

  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedQuickNote, setSelectedQuickNote] = useState<QuickNote | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<PDFFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState(NOTEBOOK_COLORS[0]);
  const [newNotebookEmoji, setNewNotebookEmoji] = useState<string>('');
  const [folderTab, setFolderTab] = useState<'todays' | 'week' | 'month'>('week');
  const [noteTab, setNoteTab] = useState<'todays' | 'week' | 'month'>('todays');

  const TODAY = new Date();

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toDateString() === TODAY.toDateString();
  };

  const isThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const startOfWeek = new Date(TODAY);
    startOfWeek.setDate(TODAY.getDate() - TODAY.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek && d <= TODAY;
  };

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear();
  };

  const filterByTab = (items: any[], tab: 'todays' | 'week' | 'month') => {
    return items.filter(item => {
      const date = item.lastUsedAt || item.updatedAt || item.createdAt || item.uploadedAt;
      if (!date) return false;
      if (tab === 'todays') return isToday(date);
      if (tab === 'week') return isThisWeek(date);
      if (tab === 'month') return isThisMonth(date);
      return true;
    });
  };

  React.useEffect(() => {
    if (initialNotebookId) {
      const notebook = notebooks.find(nb => nb.id === initialNotebookId);
      if (notebook) {
        setSelectedNotebook(notebook);
        setSelectedNote(null);
        if (onClearInitialNotebook) onClearInitialNotebook();
      }
    }
  }, [initialNotebookId, notebooks, onClearInitialNotebook]);

  const pdfInputRef = useRef<HTMLInputElement>(null);

  const filteredNotebooks = useMemo(() => {
    if (!searchQuery) return notebooks;
    const query = searchQuery.toLowerCase();
    return notebooks.filter(nb =>
      nb.title.toLowerCase().includes(query) ||
      notes.some(n => n.notebookId === nb.id && (n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)))
    );
  }, [notebooks, notes, searchQuery]);

  const handleCreateNotebook = () => {
    if (!newNotebookTitle.trim()) return;
    if (notebooks.length >= LIMITS.notebooks) {
      alert(limitError('notebooks', LIMITS.notebooks));
      return;
    }
    const newNb: Notebook = {
      id: crypto.randomUUID(),
      title: newNotebookTitle,
      color: newNotebookColor,
      emoji: newNotebookEmoji || undefined,
      folderId: selectedFolder?.id,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onNotebooksChange([...notebooks, newNb]);
    setNewNotebookTitle('');
    setNewNotebookEmoji('');
    setIsCreatingNotebook(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderTitle.trim()) return;
    const newFolder: FolderType = {
      id: crypto.randomUUID(),
      title: newFolderTitle,
      color: NOTEBOOK_COLORS[Math.floor(Math.random() * NOTEBOOK_COLORS.length)],
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onFoldersChange([...folders, newFolder]);
    setNewFolderTitle('');
    setIsCreatingFolder(false);
  };

  const handleRenameFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const nextTitle = prompt('Enter folder title', folder.title);
    if (!nextTitle) return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    onFoldersChange(folders.map(f => (f.id === folderId ? { ...f, title: trimmed } : f)));
    if (selectedFolder?.id === folderId) setSelectedFolder({ ...selectedFolder, title: trimmed });
  };

  const handleCreateQuickNote = () => {
    if (quickNotes.length >= LIMITS.quickNotes) {
      alert(limitError('quick notes', LIMITS.quickNotes));
      return;
    }
    const newNote: QuickNote = {
      id: crypto.randomUUID(),
      title: t('untitled_note'),
      content: '',
      color: NOTEBOOK_COLORS[Math.floor(Math.random() * NOTEBOOK_COLORS.length)],
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onQuickNotesChange([...quickNotes, newNote]);
    setSelectedQuickNote(newNote);
  };

  const handleUpdateQuickNote = (noteId: string, updates: Partial<QuickNote>) => {
    const lastUsedAt = new Date().toISOString();
    onQuickNotesChange(quickNotes.map(n => n.id === noteId ? { ...n, ...updates, lastUsedAt } : n));
    if (selectedQuickNote?.id === noteId) {
      setSelectedQuickNote(prev => prev ? { ...prev, ...updates, lastUsedAt } : null);
    }
  };

  const handleDeleteQuickNote = (noteId: string) => {
    if (confirm(t('delete_note_confirm'))) {
      onQuickNotesChange(quickNotes.filter(n => n.id !== noteId));
      if (selectedQuickNote?.id === noteId) setSelectedQuickNote(null);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;
    e.target.value = '';
    setPdfUploading(true);
    try {
      const newPdf = await pdfService.uploadPdf(file, selectedFolder.id);
      setPdfs(prev => [newPdf, ...prev]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload PDF.';
      if (msg.includes('too large') || msg.includes('limit of')) {
        alert(msg);
        return;
      }
      console.error('PDF upload failed, using local fallback:', err);
      const localPdf: PDFFile = {
        id: crypto.randomUUID(),
        title: file.name,
        url: URL.createObjectURL(file),
        folderId: selectedFolder.id,
        uploadedAt: new Date().toISOString(),
      };
      setPdfs(prev => [localPdf, ...prev]);
    } finally {
      setPdfUploading(false);
    }
  };

  const handleCreateNote = async (notebookId: string) => {
    const notesInNotebook = notes.filter(n => n.notebookId === notebookId).length;
    if (notesInNotebook >= LIMITS.notesPerNotebook) {
      alert(limitError('notes in this notebook', LIMITS.notesPerNotebook));
      return;
    }
    const localDraft: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: t('untitled_page'),
      content: '',
      notebookId,
      updatedAt: new Date().toISOString(),
    };
    if (supabaseNotes) {
      try {
        const created = await supabaseNotes.createNote(notebookId, { title: localDraft.title, content: localDraft.content });
        onNotesChange([...notes, created]);
        setSelectedNote(created);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    onNotesChange([...notes, localDraft]);
    setSelectedNote(localDraft);
  };

  const handleUpdateNote = (noteId: string, updates: Partial<Note>) => {
    const updatedAt = new Date().toISOString();
    const nextList = notes.map(n => (n.id === noteId ? { ...n, ...updates, updatedAt } : n));
    onNotesChange(nextList);
    if (selectedNote?.id === noteId) {
      setSelectedNote(prev => (prev ? { ...prev, ...updates, updatedAt } : null));
    }
    const persisted = nextList.find(n => n.id === noteId);
    if (persisted && supabaseNotes) supabaseNotes.persistNote(persisted);
  };

  const handleUpdateNoteTitle = (noteId: string, newTitle: string) => {
    handleUpdateNote(noteId, { title: newTitle || t('untitled_page') });
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(t('delete_page_confirm'))) return;
    if (supabaseNotes) {
      try {
        await supabaseNotes.deleteNote(noteId);
      } catch (e) {
        console.error(e);
        return;
      }
    }
    onNotesChange(notes.filter(n => n.id !== noteId));
    if (selectedNote?.id === noteId) setSelectedNote(null);
  };

  const handleRenameNotebook = (notebookId: string) => {
    const notebook = notebooks.find(nb => nb.id === notebookId);
    if (!notebook) return;
    const newTitle = prompt(t('enter_notebook_title'), notebook.title);
    if (newTitle && newTitle.trim()) {
      onNotebooksChange(notebooks.map(nb => nb.id === notebookId ? { ...nb, title: newTitle.trim() } : nb));
    }
  };

  const handleDeleteNotebook = (notebookId: string) => {
    if (confirm(t('delete_notebook_confirm'))) {
      onNotebooksChange(notebooks.filter(nb => nb.id !== notebookId));
      onNotesChange(notes.filter(n => n.notebookId !== notebookId));
      if (selectedNotebook?.id === notebookId) {
        setSelectedNotebook(null);
        setSelectedNote(null);
      }
    }
  };

  const notebookNotes = useMemo(() => {
    if (!selectedNotebook) return [];
    return notes.filter(n => n.notebookId === selectedNotebook.id);
  }, [notes, selectedNotebook]);

  React.useEffect(() => {
    if (isMobile) return;
    if (selectedNotebook && !selectedNote) {
      const firstNote = notes.find(n => n.notebookId === selectedNotebook.id);
      if (firstNote) setSelectedNote(firstNote);
    }
  }, [selectedNotebook, notes, isMobile]);

  useEffect(() => {
    if (!onImmersiveModeChange) return;
    onImmersiveModeChange(Boolean(selectedNotebook || selectedPdf));
    return () => onImmersiveModeChange(false);
  }, [selectedNotebook, selectedPdf, onImmersiveModeChange]);

  const TabPills = ({
    value,
    onChange,
  }: {
    value: 'todays' | 'week' | 'month';
    onChange: (v: 'todays' | 'week' | 'month') => void;
  }) => (
    <div className="flex gap-1">
      {(['todays', 'week', 'month'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all ${
            value === tab
              ? 'bg-black text-white'
              : 'text-black/30 hover:text-black/55 hover:bg-black/[0.05]'
          }`}
        >
          {tab === 'todays' ? 'Today' : tab === 'week' ? 'Week' : 'Month'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full min-h-0 flex flex-col overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!selectedFolder ? (
          <motion.div
            key="main-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8 max-md:mb-6 min-w-0 max-md:pt-1">
              <div className="min-w-0">
                <h1 className="text-2xl max-md:text-[20px] font-bold tracking-tight truncate leading-tight">
                  {t('notes_title')}
                </h1>
                <p className="text-black/35 text-sm max-md:text-[13px] mt-0.5">{t('notes_subtitle')}</p>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3.5 py-2 bg-black/[0.04] hover:bg-black/[0.06] rounded-xl transition-colors min-w-0 flex-1 sm:flex-initial">
                  <Search size={14} className="text-black/25 shrink-0" />
                  <input
                    type="text"
                    placeholder={t('search_notes')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm max-md:text-[13px] w-full sm:w-44 placeholder:text-black/25"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto space-y-10 max-md:space-y-8 [scrollbar-width:thin]">

              {/* Quick Notes */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BDC8]">
                    {t('my_notes')}
                  </p>
                  <TabPills value={noteTab} onChange={setNoteTab} />
                </div>
                <div className="overflow-x-auto overflow-y-hidden pb-3 -mx-1 px-1 min-w-0 overscroll-x-contain [scrollbar-width:thin] touch-pan-x">
                  <div className="flex flex-nowrap gap-3 w-max pr-1">
                    {filterByTab(quickNotes, noteTab).map((note) => (
                      <motion.div
                        key={note.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setSelectedQuickNote(note)}
                        className="shrink-0 w-[152px] md:w-[172px] rounded-xl shadow-sm cursor-pointer flex flex-col justify-between aspect-square p-3 relative overflow-hidden"
                        style={{ backgroundColor: note.color }}
                      >
                        <div className="min-h-0">
                          <p className="text-[8px] font-semibold text-black/25 uppercase tracking-wider mb-1.5">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                          <h4 className="font-bold text-[13px] leading-snug line-clamp-1 mb-1">{note.title}</h4>
                          <p className="text-[11px] text-black/55 line-clamp-4 leading-snug">{note.content}</p>
                        </div>
                        <p className="text-[8px] font-semibold text-black/30 uppercase tracking-wider mt-2">
                          {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </motion.div>
                    ))}
                    <button
                      type="button"
                      onClick={handleCreateQuickNote}
                      className="shrink-0 w-[152px] md:w-[172px] rounded-xl border-2 border-dashed border-black/[0.08] flex flex-col items-center justify-center gap-2 text-black/25 hover:text-black/45 hover:border-black/[0.16] hover:bg-black/[0.02] transition-all aspect-square"
                    >
                      <div className="w-8 h-8 rounded-xl bg-black/[0.05] flex items-center justify-center">
                        <Plus size={16} />
                      </div>
                      <span className="font-semibold text-[11px]">{t('new_note')}</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Notebooks */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BDC8]">
                    {t('notebooks')}
                  </p>
                  <button
                    onClick={() => setIsCreatingNotebook(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-[11px] font-semibold hover:opacity-80 transition-opacity"
                  >
                    <Plus size={12} />
                    New
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredNotebooks.map((notebook, i) => {
                    const count = notes.filter(n => n.notebookId === notebook.id).length;
                    const recentNote = notes
                      .filter(n => n.notebookId === notebook.id)
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                    return (
                      <NotebookCard
                        key={notebook.id}
                        notebook={notebook}
                        count={count}
                        recentNote={recentNote}
                        index={i}
                        onClick={() => { setSelectedNotebook(notebook); setSelectedNote(null); }}
                        onRename={handleRenameNotebook}
                        onDelete={handleDeleteNotebook}
                      />
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCreatingNotebook(true)}
                    className="aspect-[3/4] rounded-xl border-2 border-dashed border-black/[0.07] flex flex-col items-center justify-center gap-2 text-black/20 hover:text-black/35 hover:border-black/[0.14] hover:bg-black/[0.02] transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                    <span className="font-semibold text-[11px]">{t('new_notebook')}</span>
                  </button>
                </div>
              </section>

              {/* Folders */}
              <section className="pb-10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BDC8]">
                    {t('recent_folders')}
                  </p>
                  <TabPills value={folderTab} onChange={setFolderTab} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filterByTab(folders, folderTab).map((folder) => (
                    <motion.div
                      key={folder.id}
                      whileHover={{ y: -3 }}
                      onClick={() => setSelectedFolder(folder)}
                      className="rounded-2xl border border-black/[0.07] bg-white shadow-sm cursor-pointer group flex flex-col justify-between p-4 aspect-[3/2] min-h-0"
                    >
                      <div className="flex justify-between items-start">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${folder.color}90` }}
                        >
                          <Folder size={16} className="text-black/50" />
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleRenameFolder(folder.id); }}
                          className="p-1 text-black/20 hover:text-black/50 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-all rounded-lg hover:bg-black/[0.05]"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[13px] leading-tight truncate">{folder.title}</h4>
                        <p className="text-[10px] text-black/30 font-semibold uppercase tracking-wider mt-0.5">
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(true)}
                    className="rounded-2xl border-2 border-dashed border-black/[0.07] flex flex-col items-center justify-center gap-2 text-black/20 hover:text-black/35 hover:border-black/[0.14] hover:bg-black/[0.02] transition-all aspect-[3/2]"
                  >
                    <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center">
                      <Plus size={15} />
                    </div>
                    <span className="font-semibold text-[11px]">{t('new_folder')}</span>
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        ) : (
          /* Folder view */
          <motion.div
            key="folder-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 max-md:mb-6 min-w-0 max-md:pt-1">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="w-9 h-9 rounded-xl bg-black/[0.05] flex items-center justify-center hover:bg-black/10 transition-colors shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <h1 className="text-2xl max-md:text-xl font-bold tracking-tight truncate">{selectedFolder.title}</h1>
                  <p className="text-black/35 text-sm max-md:text-[13px] mt-0.5">{t('manage_notebooks')}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={pdfUploading}
                  className="px-4 h-10 bg-black/[0.05] text-black/55 rounded-xl flex items-center gap-2 hover:bg-black/10 transition-colors font-semibold text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Upload size={15} />
                  {pdfUploading ? 'Uploading…' : t('upload_pdf')}
                </button>
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={e => void handlePdfUpload(e)}
                  accept="application/pdf"
                  className="hidden"
                />
                <button
                  onClick={() => setIsCreatingNotebook(true)}
                  className="px-4 h-10 bg-black text-white rounded-xl flex items-center gap-2 hover:opacity-80 transition-opacity font-semibold text-sm"
                >
                  <Plus size={16} />
                  {t('new_notebook')}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto [scrollbar-width:thin] space-y-10">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BDC8] mb-4">{t('notebooks')}</p>
                {notebooks.filter(nb => nb.folderId === selectedFolder.id).length === 0 ? (
                  <div className="py-14 text-center rounded-2xl border-2 border-dashed border-black/[0.07] text-black/20 text-sm font-medium">
                    {t('no_notebooks')}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {notebooks.filter(nb => nb.folderId === selectedFolder.id).map((notebook, i) => {
                      const count = notes.filter(n => n.notebookId === notebook.id).length;
                      const recentNote = notes
                        .filter(n => n.notebookId === notebook.id)
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                      return (
                        <NotebookCard
                          key={notebook.id}
                          notebook={notebook}
                          count={count}
                          recentNote={recentNote}
                          index={i}
                          onClick={() => { setSelectedNotebook(notebook); setSelectedNote(null); }}
                          onRename={handleRenameNotebook}
                          onDelete={handleDeleteNotebook}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pb-10">
                <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BDC8] mb-4">{t('documents')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pdfs.filter(pdf => pdf.folderId === selectedFolder.id).map((pdf) => (
                    <div
                      key={pdf.id}
                      onClick={() => setSelectedPdf(pdf)}
                      className="rounded-2xl border border-black/[0.07] bg-white p-4 flex items-center justify-between gap-3 group cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-400 shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-[13px] truncate max-w-[180px]">{pdf.title}</h4>
                          <p className="text-[10px] text-black/30 font-semibold uppercase tracking-wider mt-0.5">
                            {new Date(pdf.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-black/20 group-hover:text-black/40 transition-colors shrink-0" />
                    </div>
                  ))}
                  {pdfs.filter(pdf => pdf.folderId === selectedFolder.id).length === 0 && (
                    <div className="col-span-full py-14 text-center rounded-2xl border-2 border-dashed border-black/[0.07] text-black/20 text-sm font-medium">
                      No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Note Modal */}
      <AnimatePresence>
        {selectedQuickNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm p-8 max-md:p-4"
            onClick={() => setSelectedQuickNote(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="w-full max-w-lg rounded-[36px] p-10 shadow-2xl relative overflow-hidden max-md:max-h-[88vh] max-md:p-7 max-md:rounded-3xl max-md:flex max-md:flex-col"
              style={{ backgroundColor: selectedQuickNote.color }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-7 max-md:mb-5 max-md:shrink-0">
                <p className="text-[10px] font-semibold text-black/30 uppercase tracking-widest leading-relaxed pr-4">
                  {new Date(selectedQuickNote.createdAt).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDeleteQuickNote(selectedQuickNote.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-black/25 hover:text-red-500 hover:bg-black/5 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedQuickNote(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-black/25 hover:text-black hover:bg-black/5 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={selectedQuickNote.title === 'Untitled Note' ? '' : selectedQuickNote.title}
                onChange={(e) => handleUpdateQuickNote(selectedQuickNote.id, { title: e.target.value })}
                onBlur={(e) => {
                  if (!e.target.value.trim()) handleUpdateQuickNote(selectedQuickNote.id, { title: 'Untitled Note' });
                }}
                className="w-full text-[28px] max-md:text-2xl font-bold bg-transparent border-none outline-none mb-5 max-md:mb-4 placeholder:text-black/15 leading-tight max-md:shrink-0"
                placeholder="Untitled Note"
                autoFocus={selectedQuickNote.title === 'Untitled Note'}
              />

              <textarea
                value={selectedQuickNote.content}
                onChange={(e) => handleUpdateQuickNote(selectedQuickNote.id, { content: e.target.value })}
                className="w-full text-[15px] text-black/60 bg-transparent border-none outline-none resize-none h-52 placeholder:text-black/15 leading-relaxed max-md:flex-1 max-md:min-h-0 max-md:h-auto [scrollbar-width:thin]"
                placeholder="Start writing..."
              />

              <div className="mt-7 pt-6 border-t border-black/[0.08] flex items-center justify-between max-md:mt-5 max-md:pt-5 max-md:shrink-0">
                <p className="text-[10px] font-semibold text-black/30 uppercase tracking-widest">
                  Last modified {new Date(selectedQuickNote.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <button
                  onClick={() => setSelectedQuickNote(null)}
                  className="px-6 py-2.5 bg-black text-white rounded-xl font-semibold text-sm shadow-lg shadow-black/10 hover:opacity-80 transition-opacity"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notebook Editor Overlay */}
      <AnimatePresence>
        {selectedNotebook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col min-h-0 overflow-hidden"
          >
            {/* Top bar */}
            <div className="min-h-[44px] border-b border-black/[0.07] flex items-center px-2 sm:px-3 gap-1 sm:gap-2 shrink-0 bg-white min-w-0">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedNote) setSelectedNote(null);
                    else { setSelectedNotebook(null); setSelectedNote(null); }
                  }}
                  className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-xl text-black/45 active:bg-black/[0.06]"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              {!isMobile && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-1.5 rounded-lg text-black/25 hover:text-black/55 hover:bg-black/[0.04] transition-all"
                    title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                  >
                    <List size={16} />
                  </button>
                  <div className="w-px h-4 bg-black/10 mx-0.5" />
                </>
              )}
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => { setSelectedNotebook(null); setSelectedNote(null); }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-black/40 hover:text-black/70 hover:bg-black/[0.04] transition-all shrink-0"
                >
                  {selectedNotebook.emoji ? (
                    <span className="text-sm leading-none">{selectedNotebook.emoji}</span>
                  ) : (
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: selectedNotebook.color }} />
                  )}
                  <span className="text-xs font-medium">{selectedNotebook.title}</span>
                </button>
                {selectedNote && (
                  <>
                    <ChevronRight size={13} className="text-black/20 shrink-0" />
                    <span className="text-xs font-medium text-black/55 truncate max-w-[200px]">{selectedNote.title}</span>
                  </>
                )}
              </div>
              <div className="flex-1" />
              {selectedNote && (
                <span className="text-[10px] text-black/20 font-medium mr-1 shrink-0">
                  Saved {new Date(selectedNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => { setSelectedNotebook(null); setSelectedNote(null); }}
                className="p-1.5 rounded-lg text-black/25 hover:text-black/55 hover:bg-black/[0.04] transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 flex overflow-hidden min-w-0">
              {/* Sidebar (desktop) */}
              {!isMobile && (
                <motion.div
                  animate={{ width: isSidebarOpen ? 240 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                  className="border-r border-black/[0.06] flex flex-col bg-[#f7f6f3] overflow-hidden shrink-0"
                >
                  <div className="flex flex-col h-full w-60 min-w-[240px] overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
                    <div className="px-3 pt-5 pb-2">
                      <div className="flex items-center gap-2 px-2 py-1">
                        {selectedNotebook.emoji ? (
                          <span className="text-base leading-none shrink-0">{selectedNotebook.emoji}</span>
                        ) : (
                          <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: selectedNotebook.color }} />
                        )}
                        <span className="font-semibold text-sm text-black/65 truncate">{selectedNotebook.title}</span>
                      </div>
                    </div>
                    <div className="px-4 mb-1.5">
                      <p className="text-[10px] font-semibold text-black/25 uppercase tracking-wider">Pages</p>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar px-2">
                      {notebookNotes.map(note => (
                        <button
                          key={note.id}
                          onClick={() => setSelectedNote(note)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left group transition-all ${
                            selectedNote?.id === note.id
                              ? 'bg-black/[0.08] text-black'
                              : 'text-black/40 hover:bg-black/[0.04] hover:text-black/65'
                          }`}
                        >
                          <FileText size={13} className="shrink-0 opacity-50" />
                          <span className="flex-1 text-[13px] truncate font-medium">{note.title}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                            className="opacity-0 group-hover:opacity-100 min-h-9 min-w-9 flex items-center justify-center p-0.5 rounded text-black/20 hover:text-red-400 transition-all shrink-0"
                          >
                            <Trash2 size={11} />
                          </button>
                        </button>
                      ))}
                      {notebookNotes.length === 0 && (
                        <p className="py-10 text-center text-[11px] text-black/20 italic">No pages yet</p>
                      )}
                    </div>
                    <div className="px-2 pb-2 pt-2 border-t border-black/[0.06]">
                      <button
                        onClick={() => void handleCreateNote(selectedNotebook.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-black/35 hover:bg-black/[0.04] hover:text-black/55 transition-all"
                      >
                        <Plus size={14} />
                        <span>New page</span>
                      </button>
                    </div>
                    {/* Linked Tasks */}
                    {(() => {
                      const linkedTasks = tasks.filter(t => t.notebookId === selectedNotebook.id);
                      return (
                        <div className="border-t border-black/[0.06] px-4 pt-3 pb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-semibold text-black/25 uppercase tracking-wider">Linked Tasks</p>
                            {linkedTasks.length > 0 && onNavigateToTasks && (
                              <button
                                onClick={onNavigateToTasks}
                                className="text-[10px] text-black/30 hover:text-black/55 transition-colors"
                              >
                                View all
                              </button>
                            )}
                          </div>
                          {linkedTasks.length === 0 ? (
                            <p className="text-[11px] text-black/20 italic py-1">No linked tasks</p>
                          ) : (
                            <div className="space-y-0.5">
                              {linkedTasks.map(task => (
                                <button
                                  key={task.id}
                                  onClick={onNavigateToTasks}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-black/[0.04] transition-all group"
                                >
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                                    task.status === 'done' ? 'bg-emerald-400' :
                                    task.status === 'started' ? 'bg-amber-400' : 'bg-black/20'
                                  }`} />
                                  <span className={`flex-1 text-[12px] truncate font-medium ${
                                    task.status === 'done' ? 'line-through text-black/25' : 'text-black/50 group-hover:text-black/70'
                                  }`}>{task.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}

              {/* Editor / mobile page list */}
              <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
                {isMobile && selectedNotebook && !selectedNote ? (
                  <div className="flex flex-col min-h-0 px-4 py-3 overflow-y-auto">
                    <div className="py-3 border-b border-black/[0.06] mb-4">
                      <p className="text-[10px] font-semibold text-black/30 uppercase tracking-wider">{t('my_notes')}</p>
                      <p className="text-sm font-semibold text-black truncate mt-0.5">{selectedNotebook.title}</p>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {notebookNotes.map(note => (
                        <div key={note.id} className="flex items-stretch gap-2 min-h-[52px]">
                          <button
                            type="button"
                            onClick={() => setSelectedNote(note)}
                            className="flex-1 min-h-[52px] flex items-center gap-3.5 rounded-xl px-4 text-left border border-black/[0.07] bg-white shadow-sm active:bg-black/[0.04] transition-colors"
                          >
                            <FileText size={16} className="shrink-0 text-black/30" />
                            <span className="flex-1 text-sm font-medium text-black truncate">{note.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="min-h-[52px] min-w-[52px] shrink-0 flex items-center justify-center rounded-xl border border-black/[0.07] bg-white text-black/25 active:bg-red-50 active:text-red-500"
                            aria-label="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {notebookNotes.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-14 text-center gap-4 px-4">
                        <p className="text-sm text-black/35">No pages yet</p>
                        <button
                          type="button"
                          onClick={() => void handleCreateNote(selectedNotebook.id)}
                          className="w-full min-h-12 rounded-xl bg-black text-white text-sm font-semibold"
                        >
                          Create first page
                        </button>
                      </div>
                    )}
                    {notebookNotes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleCreateNote(selectedNotebook.id)}
                        className="mt-5 w-full min-h-[52px] rounded-xl border border-black/[0.09] text-sm font-semibold text-black/60 active:bg-black/[0.04]"
                      >
                        + New page
                      </button>
                    )}
                  </div>
                ) : selectedNote ? (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <NoteEditor
                      key={selectedNote.id}
                      content={selectedNote.content}
                      onChange={(html) => handleUpdateNote(selectedNote.id, { content: html })}
                      onDelete={() => handleDeleteNote(selectedNote.id)}
                      placeholder={t('type_something')}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-8">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: selectedNotebook.color }}
                    >
                      {selectedNotebook.emoji ? (
                        <span className="text-2xl">{selectedNotebook.emoji}</span>
                      ) : (
                        <Book size={24} className="text-black/40" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-black/40 mb-1">No page selected</p>
                      <p className="text-sm text-black/25">Choose a page from the sidebar or create a new one</p>
                    </div>
                    <button
                      onClick={() => void handleCreateNote(selectedNotebook.id)}
                      className="mt-1 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
                    >
                      Create first page
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Notebook Modal */}
      <AnimatePresence>
        {isCreatingNotebook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-8 max-md:p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsCreatingNotebook(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="w-full max-w-md bg-white rounded-[36px] p-10 max-md:p-7 max-md:rounded-3xl shadow-2xl border border-black/[0.06]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8 max-md:mb-6">
                <h2 className="text-xl font-bold">New Notebook</h2>
                <button onClick={() => setIsCreatingNotebook(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/25 hover:text-black hover:bg-black/[0.05] transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-7 max-md:space-y-6">
                <div>
                  <label className="text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-3 block">Title</label>
                  <input
                    type="text"
                    autoFocus
                    value={newNotebookTitle}
                    onChange={(e) => setNewNotebookTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
                    placeholder="e.g. Product Strategy"
                    className="w-full bg-black/[0.04] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-3 block">Cover Color</label>
                  <div className="flex gap-2.5">
                    {NOTEBOOK_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewNotebookColor(color)}
                        className={`w-9 h-9 rounded-full transition-all ${newNotebookColor === color ? 'ring-4 ring-black/10 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-semibold text-black/30 uppercase tracking-widest">
                      Emoji <span className="normal-case font-normal opacity-60">(optional)</span>
                    </label>
                    {newNotebookEmoji && (
                      <button onClick={() => setNewNotebookEmoji('')} className="text-[10px] text-black/30 hover:text-black/60 transition-colors">
                        Clear
                      </button>
                    )}
                  </div>
                  {newNotebookEmoji && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-black/[0.03] border border-black/[0.06]">
                      <span className="text-2xl">{newNotebookEmoji}</span>
                      <span className="text-xs text-black/40 font-medium">Selected</span>
                    </div>
                  )}
                  <div className="grid grid-cols-7 sm:grid-cols-9 gap-1 max-h-32 overflow-y-auto [scrollbar-width:thin] p-1 rounded-xl bg-black/[0.02] border border-black/[0.05]">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setNewNotebookEmoji(emoji === newNotebookEmoji ? '' : emoji)}
                        className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all hover:scale-110 ${
                          newNotebookEmoji === emoji ? 'bg-black/10 scale-110' : 'hover:bg-black/[0.05]'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateNotebook}
                  className="w-full py-4 bg-black text-white rounded-2xl font-semibold text-sm hover:opacity-80 active:scale-[0.98] transition-all shadow-lg shadow-black/10"
                >
                  Create Notebook
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Folder Modal */}
      <AnimatePresence>
        {isCreatingFolder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-8 max-md:p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsCreatingFolder(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="w-full max-w-md bg-white rounded-[36px] p-10 max-md:p-7 max-md:rounded-3xl shadow-2xl border border-black/[0.06]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8 max-md:mb-6">
                <h2 className="text-xl font-bold">New Folder</h2>
                <button onClick={() => setIsCreatingFolder(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/25 hover:text-black hover:bg-black/[0.05] transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-7">
                <div>
                  <label className="text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-3 block">Folder Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={newFolderTitle}
                    onChange={(e) => setNewFolderTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    placeholder="e.g. Work Projects"
                    className="w-full bg-black/[0.04] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                  />
                </div>

                <button
                  onClick={handleCreateFolder}
                  className="w-full py-4 bg-black text-white rounded-2xl font-semibold text-sm hover:opacity-80 active:scale-[0.98] transition-all shadow-lg shadow-black/10"
                >
                  Create Folder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {selectedPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-8 max-md:p-3 bg-black/40 backdrop-blur-md"
            onClick={() => setSelectedPdf(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="w-full max-w-6xl h-full bg-white rounded-[36px] max-md:rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-black/[0.06]"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-[#FAFAFA]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-400">
                    <FileText size={17} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px]">{selectedPdf.title}</h3>
                    <p className="text-[10px] text-black/30 font-semibold uppercase tracking-widest">Document</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPdf(null)}
                  className="w-9 h-9 rounded-xl bg-black/[0.05] flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 bg-[#F5F5F5] p-6 max-md:p-3 overflow-hidden">
                <iframe
                  src={selectedPdf.url}
                  className="w-full h-full rounded-2xl shadow-inner bg-white border-none"
                  title={selectedPdf.title}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMobile &&
        !selectedFolder &&
        !selectedQuickNote &&
        !isCreatingNotebook &&
        !isCreatingFolder &&
        !selectedPdf && (
          <MobileFab
            label={t('new_note')}
            onClick={() => {
              if (selectedNotebook) void handleCreateNote(selectedNotebook.id);
              else handleCreateQuickNote();
            }}
          />
        )}
    </div>
  );
}
