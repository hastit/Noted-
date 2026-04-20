import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Folder, Search, MoreVertical, Book, ChevronRight, ChevronDown, X, Save, Trash2, Type, Heading1, Heading2, Heading3, Image as ImageIcon, FileText, ArrowLeft, Upload, List, ListOrdered, ListTodo, CheckSquare } from 'lucide-react';
import { MOCK_NOTEBOOKS, MOCK_FOLDERS, MOCK_NOTES, MOCK_QUICK_NOTES } from '../constants';
import { Notebook, Folder as FolderType, Note, PDFFile, QuickNote, Task } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';
import * as pdfService from '../lib/pdfFiles';
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

interface NoteBlock {
  id: string;
  type: 'h1' | 'h2' | 'h3' | 'text' | 'image' | 'bullet' | 'number' | 'todo' | 'toggle';
  content: string;
  checked?: boolean;
  isOpen?: boolean;
}

const AutoExpandingTextarea = ({ value, onChange, onKeyDown, onFocus, placeholder, className, autoFocus }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; 
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  placeholder?: string; 
  className?: string;
  autoFocus?: boolean;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      placeholder={placeholder}
      className={className}
      rows={1}
      autoFocus={autoFocus}
    />
  );
};

export type SupabaseNotesBridge = {
  createNote: (notebookId: string, partial: {title: string; content: string}) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  persistNote: (note: Note) => void;
};

interface NotesProps {
  notebooks: Notebook[];
  folders: FolderType[];
  notes: Note[];
  quickNotes: QuickNote[];
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

export default function Notes({
  notebooks,
  folders,
  notes,
  quickNotes,
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
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  
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

  // Handle initial notebook selection from dashboard
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const parseBlocks = (content: string): NoteBlock[] => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Fallback for legacy plain text notes
      return [{ id: 'b1', type: 'text', content }];
    }
    return [{ id: 'b1', type: 'text', content: '' }];
  };

  const stringifyBlocks = (blocks: NoteBlock[]): string => {
    return JSON.stringify(blocks);
  };

  const currentBlocks = useMemo(() => {
    if (!selectedNote) return [];
    return parseBlocks(selectedNote.content);
  }, [selectedNote]);

  const handleUpdateBlocks = (newBlocks: NoteBlock[]) => {
    if (!selectedNote) return;
    handleUpdateNote(selectedNote.id, { content: stringifyBlocks(newBlocks) });
  };

  const addBlock = (type: NoteBlock['type'], content: string = '', afterId?: string) => {
    // If we're adding from the toolbar and the currently focused block is empty, convert it instead
    if (!afterId && focusedBlockId) {
      const focusedBlock = currentBlocks.find(b => b.id === focusedBlockId);
      if (focusedBlock && focusedBlock.content.trim() === '' && focusedBlock.type === 'text') {
        updateBlock(focusedBlockId, '', { type, checked: false, isOpen: false });
        return;
      }
    }

    const newBlock: NoteBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      checked: false,
      isOpen: false,
    };
    
    let newBlocks;
    if (afterId) {
      const index = currentBlocks.findIndex(b => b.id === afterId);
      newBlocks = [...currentBlocks];
      newBlocks.splice(index + 1, 0, newBlock);
    } else {
      newBlocks = [...currentBlocks, newBlock];
    }
    
    handleUpdateBlocks(newBlocks);
    setFocusedBlockId(newBlock.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, block: NoteBlock) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If it's a list type, create a new item of the same type
      if (['bullet', 'number', 'todo'].includes(block.type)) {
        addBlock(block.type as any, '', block.id);
      } else {
        addBlock('text', '', block.id);
      }
    } else if (e.key === 'Backspace' && block.content === '') {
      // If backspace on empty list item, convert to text or delete if already text
      if (block.type !== 'text') {
        e.preventDefault();
        updateBlock(block.id, '', { type: 'text' });
      } else if (currentBlocks.length > 1) {
        e.preventDefault();
        const currentIndex = currentBlocks.findIndex(b => b.id === block.id);
        const prevBlock = currentBlocks[currentIndex - 1];
        deleteBlock(block.id);
        if (prevBlock) {
          setFocusedBlockId(prevBlock.id);
        }
      }
    }
  };

  const updateBlock = (blockId: string, content: string, extra?: Partial<NoteBlock>) => {
    const newBlocks = currentBlocks.map(b => b.id === blockId ? { ...b, content, ...extra } : b);
    handleUpdateBlocks(newBlocks);

    // If editing the first block and it's an H1, sync it back to the note title
    if (selectedNote && blockId === currentBlocks[0]?.id && currentBlocks[0]?.type === 'h1') {
      handleUpdateNote(selectedNote.id, { title: content || t('untitled_page') });
    }
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = currentBlocks.filter(b => b.id !== blockId);
    handleUpdateBlocks(newBlocks);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageBlock: NoteBlock = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        content: reader.result as string,
      };
      const textBlock: NoteBlock = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        content: '',
      };
      
      let newBlocks;
      if (focusedBlockId) {
        const index = currentBlocks.findIndex(b => b.id === focusedBlockId);
        newBlocks = [...currentBlocks];
        newBlocks.splice(index + 1, 0, imageBlock, textBlock);
      } else {
        newBlocks = [...currentBlocks, imageBlock, textBlock];
      }
      
      handleUpdateBlocks(newBlocks);
      setFocusedBlockId(textBlock.id);
    };
    reader.readAsDataURL(file);
  };

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

  const handleCreateQuickNote = () => {
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
      if (selectedQuickNote?.id === noteId) {
        setSelectedQuickNote(null);
      }
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
      console.error('PDF upload failed, using local fallback:', err);
      // Fallback: show PDF locally for this session while storage is being set up
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
    const initialBlocks: NoteBlock[] = [{ id: 'b1', type: 'text', content: '' }];
    const localDraft: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: t('untitled_page'),
      content: stringifyBlocks(initialBlocks),
      notebookId,
      updatedAt: new Date().toISOString(),
    };
    if (supabaseNotes) {
      try {
        const created = await supabaseNotes.createNote(notebookId, {
          title: localDraft.title,
          content: localDraft.content,
        });
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
    const nextList = notes.map(n => (n.id === noteId ? {...n, ...updates, updatedAt} : n));
    onNotesChange(nextList);
    if (selectedNote?.id === noteId) {
      setSelectedNote(prev => (prev ? {...prev, ...updates, updatedAt} : null));
    }
    const persisted = nextList.find(n => n.id === noteId);
    if (persisted && supabaseNotes) {
      supabaseNotes.persistNote(persisted);
    }
  };

  const handleUpdateNoteTitle = (noteId: string, newTitle: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const blocks = parseBlocks(note.content);
    // If the first block is an H1, keep it in sync with the note title
    if (blocks[0]?.type === 'h1') {
      blocks[0].content = newTitle;
    }

    handleUpdateNote(noteId, { 
      title: newTitle || t('untitled_page'), 
      content: stringifyBlocks(blocks) 
    });
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
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
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

  // Set initial selected note when opening a notebook (desktop uniquement — sur mobile on affiche d’abord la liste)
  React.useEffect(() => {
    if (isMobile) return;
    if (selectedNotebook && !selectedNote) {
      const firstNote = notes.find(n => n.notebookId === selectedNotebook.id);
      if (firstNote) {
        setSelectedNote(firstNote);
      }
    }
  }, [selectedNotebook, notes, isMobile]);

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
            <div className="flex flex-col gap-3 max-md:gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 max-md:mb-5 sm:mb-8 md:mb-4 min-w-0 max-md:pt-1">
              <div className="min-w-0">
                <h1 className="text-2xl max-md:text-[20px] sm:text-3xl md:text-[1.65rem] font-display font-bold tracking-tight truncate leading-tight md:leading-snug">
                  {t('notes_title')}
                </h1>
                <p className="text-black/40 text-sm max-md:text-[13px] mt-0.5 max-md:mt-1 md:text-[13px] md:mt-0.5">{t('notes_subtitle')}</p>
              </div>
              <div className="flex gap-3 max-md:gap-3 shrink-0 w-full sm:w-auto">
                <div className="glass-panel px-3 max-md:px-3 sm:px-4 py-2 max-md:h-9 max-md:py-0 max-md:rounded-xl rounded-2xl flex items-center gap-2 min-w-0 flex-1 sm:flex-initial sm:max-w-xs">
                  <Search size={16} className="text-black/20 shrink-0" />
                  <input 
                    type="text" 
                    placeholder={t('search_notes')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm max-md:text-[13px] w-full min-w-0 sm:w-48 placeholder:text-black/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-visible space-y-10 max-md:space-y-6 sm:space-y-12 md:space-y-4 lg:space-y-5 [scrollbar-width:thin]">
              {/* Recent Folders */}
              <section>
                <div className="flex items-center justify-between mb-6 max-md:mb-4 md:mb-2">
                  <h2 className="text-2xl max-md:text-[15px] md:text-lg font-display font-bold">{t('recent_folders')}</h2>
                </div>
                <div className="flex gap-8 max-md:gap-5 md:gap-6 mb-8 max-md:mb-5 md:mb-3 border-b border-black/5">
                  {(['todays', 'week', 'month'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFolderTab(tab)}
                      className={`pb-4 max-md:pb-3.5 md:pb-2 text-sm max-md:text-[11px] md:text-xs font-bold uppercase tracking-widest max-md:tracking-wide md:tracking-wide transition-all relative ${
                        folderTab === tab ? 'text-black' : 'text-black/20 hover:text-black/40'
                      }`}
                    >
                      {tab === 'todays' ? t('todays') : tab === 'week' ? t('this_week') : t('this_month')}
                      {folderTab === tab && (
                        <motion.div 
                          layoutId="folderTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 max-md:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-md:gap-3 sm:gap-6 md:gap-2.5 lg:gap-3 min-w-0">
                  {filterByTab(folders, folderTab).map((folder) => (
                    <motion.div 
                      key={folder.id}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedFolder(folder)}
                      className="rounded-[32px] md:rounded-xl shadow-sm cursor-pointer group relative overflow-hidden flex flex-col justify-between aspect-[1.4/1] md:aspect-[2.55/1] p-6 md:p-2.5 max-md:overflow-visible max-md:aspect-auto max-md:mt-1 max-md:h-[56px] max-md:min-h-[56px] max-md:max-h-[56px] max-md:flex-row max-md:items-center max-md:justify-between max-md:gap-3 max-md:rounded-br-lg max-md:rounded-bl-lg max-md:rounded-tr-lg max-md:rounded-tl-md max-md:border max-md:border-black/[0.06] max-md:bg-[#dfe8f0] max-md:px-3.5 max-md:py-2.5 max-md:shadow-sm max-md:before:pointer-events-none max-md:before:absolute max-md:before:left-0 max-md:before:top-0 max-md:before:z-[2] max-md:before:h-2.5 max-md:before:w-[40%] max-md:before:-translate-y-full max-md:before:rounded-t-lg max-md:before:bg-[#dfe8f0] max-md:before:content-['']"
                      style={!isMobile ? { backgroundColor: folder.color || '#F4F4F4' } : undefined}
                    >
                      <div className="hidden md:flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                          <div className="w-8 h-8 md:w-7 md:h-7 rounded-lg bg-white/40 flex items-center justify-center">
                            <Folder size={17} className="text-black/60 md:w-[15px] md:h-[15px]" />
                          </div>
                          <button type="button" className="p-1 text-black/20 hover:text-black/40 md:p-0.5">
                            <MoreVertical size={16} className="md:w-[14px] md:h-[14px]" />
                          </button>
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-[15px] md:text-[13px] leading-tight line-clamp-1">
                            {folder.title}
                          </h4>
                          <p className="text-[8px] md:text-[7px] font-bold text-black/30 uppercase tracking-wider mt-0.5 md:mt-0">
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex md:hidden items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-white/40 flex items-center justify-center shrink-0">
                          <Folder size={14} className="text-black/60" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-semibold text-black leading-tight truncate">
                            {folder.title}
                          </h4>
                          <p className="text-[11px] text-black/40 truncate mt-0.5">
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); }}
                          className="shrink-0 p-1.5 rounded-md text-black/25 active:bg-black/10"
                          aria-label="Menu"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setIsCreatingFolder(true)}
                    className="rounded-[32px] md:rounded-xl border-2 border-dashed border-black/5 flex flex-col items-center justify-center gap-3 md:gap-1.5 p-6 md:p-2.5 text-black/20 hover:text-black/40 hover:border-black/10 transition-all aspect-[1.4/1] md:aspect-[2.55/1] max-md:relative max-md:overflow-visible max-md:aspect-auto max-md:mt-1 max-md:h-[56px] max-md:min-h-[56px] max-md:max-h-[56px] max-md:flex-row max-md:rounded-br-lg max-md:rounded-bl-lg max-md:rounded-tr-lg max-md:rounded-tl-md max-md:gap-3 max-md:px-3.5 max-md:py-0 max-md:justify-center max-md:bg-[#eef3f8] max-md:before:pointer-events-none max-md:before:absolute max-md:before:left-0 max-md:before:top-0 max-md:before:z-[2] max-md:before:h-2.5 max-md:before:w-[40%] max-md:before:-translate-y-full max-md:before:rounded-t-lg max-md:before:bg-[#eef3f8] max-md:before:content-['']"
                  >
                    <div className="w-12 h-12 md:w-7 md:h-7 rounded-2xl md:rounded-lg bg-black/5 flex items-center justify-center max-md:w-8 max-md:h-8 max-md:rounded-lg">
                      <Plus size={isMobile ? 16 : 15} className="md:w-[15px] md:h-[15px]" />
                    </div>
                    <span className="font-bold text-sm max-md:text-[13px] md:text-[11px]">{t('new_folder')}</span>
                  </button>
                </div>
              </section>

              {/* My Notes */}
              <section>
                <div className="flex items-center justify-between mb-6 max-md:mb-4 md:mb-2">
                  <h2 className="text-2xl max-md:text-[15px] md:text-lg font-display font-bold">{t('my_notes')}</h2>
                  <div className="flex items-center gap-4 md:gap-2 text-black/20">
                    <button type="button" className="p-1 hover:text-black transition-colors md:p-0.5" aria-label="Previous month">
                      <ChevronRight size={18} className="rotate-180" />
                    </button>
                    <span className="text-[10px] md:text-[9px] font-bold uppercase tracking-widest">February 2026</span>
                    <button type="button" className="p-1 hover:text-black transition-colors md:p-0.5" aria-label="Next month">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-8 mb-8 max-md:mb-5 md:mb-3 md:gap-6 border-b border-black/5">
                  {(['todays', 'week', 'month'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setNoteTab(tab)}
                      className={`pb-4 max-md:pb-3.5 md:pb-2 text-sm max-md:text-[11px] md:text-xs font-bold uppercase tracking-widest max-md:tracking-wide md:tracking-wide transition-all relative ${
                        noteTab === tab ? 'text-black' : 'text-black/20 hover:text-black/40'
                      }`}
                    >
                      {tab === 'todays' ? t('todays') : tab === 'week' ? t('this_week') : t('this_month')}
                      {noteTab === tab && (
                        <motion.div 
                          layoutId="noteTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 min-w-0 overscroll-x-contain [scrollbar-width:thin] touch-pan-x">
                  <div className="flex flex-nowrap items-stretch gap-2 sm:gap-2 md:gap-2 w-max pr-1">
                  {filterByTab(quickNotes, noteTab).map((note) => (
                    <motion.div 
                      key={note.id}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedQuickNote(note)}
                      className="shrink-0 w-[148px] md:w-[176px] lg:w-[190px] rounded-xl shadow-sm cursor-pointer group flex flex-col justify-between aspect-[1.02/1] p-2.5 md:p-3 relative overflow-hidden"
                      style={{ backgroundColor: note.color }}
                    >
                      <div className="flex flex-col flex-1 justify-between min-h-0 gap-0.5">
                        <div className="min-h-0">
                          <p className="text-[7px] md:text-[8px] font-bold text-black/30 uppercase tracking-wider mb-1">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex justify-between items-start gap-1.5 mb-1">
                            <h4 className="font-display font-bold text-[13px] md:text-[15px] leading-snug line-clamp-1 min-w-0">{note.title}</h4>
                            <button type="button" className="p-0.5 bg-black rounded text-white opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity min-h-6 min-w-6 flex items-center justify-center shrink-0">
                              <Type size={11} />
                            </button>
                          </div>
                          <p className="text-[11px] md:text-[12px] text-black/60 line-clamp-2 leading-snug">
                            {note.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-black/30 pt-0.5">
                          <div className="w-2.5 h-2.5 rounded-full border border-black/20 flex items-center justify-center shrink-0">
                            <div className="w-1 h-1 rounded-full bg-black/40" />
                          </div>
                          <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-wider truncate">
                            {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(note.createdAt).toLocaleDateString([], { weekday: 'short' })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <button 
                    type="button"
                    onClick={handleCreateQuickNote}
                    className="shrink-0 w-[148px] md:w-[176px] lg:w-[190px] rounded-xl border-2 border-dashed border-black/5 flex flex-col items-center justify-center gap-1.5 md:gap-2 p-2.5 md:p-3 text-black/20 hover:text-black/40 hover:border-black/10 transition-all aspect-[1.02/1] bg-[#faf6e8]/80"
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-md bg-black/5 flex items-center justify-center">
                      <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                    </div>
                    <span className="font-bold text-[11px] md:text-xs">{t('new_note')}</span>
                  </button>
                  </div>
                </div>
              </section>

              {/* Notebooks */}
              <section className="pb-12 max-md:pb-10 max-md:pt-0 md:pb-6">
                <div className="flex items-center justify-between mb-6 max-md:mb-4 md:mb-2">
                  <h2 className="text-2xl max-md:text-[15px] md:text-lg font-display font-bold">{t('notebooks')}</h2>
                  <button
                    onClick={() => setIsCreatingNotebook(true)}
                    className="w-9 h-9 md:w-8 md:h-8 bg-black text-white rounded-xl md:rounded-lg flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <div className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 min-w-0 overscroll-x-contain [scrollbar-width:thin] touch-pan-x">
                  <div className="flex flex-nowrap items-stretch gap-2 max-md:gap-2 sm:gap-2 md:gap-2 w-max pr-1">
                  {filteredNotebooks.map((notebook, i) => {
                    const count = notes.filter(n => n.notebookId === notebook.id).length;
                    const recentNote = notes.filter(n => n.notebookId === notebook.id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                    return (
                      <motion.div
                        key={notebook.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -4 }}
                        onClick={() => { setSelectedNotebook(notebook); setSelectedNote(null); }}
                        className="group cursor-pointer shrink-0 w-[122px] md:w-[146px] lg:w-[158px]"
                      >
                        <div
                          className="aspect-[3/4] rounded-lg relative overflow-hidden flex flex-col shadow-sm w-full min-w-0"
                          style={{ backgroundColor: notebook.color }}
                        >
                          <div className="absolute left-0 top-0 bottom-0 h-full w-[5px] md:w-1.5 bg-black/[0.09]" />
                          <div
                            className="absolute inset-0 flex flex-col"
                            style={{ paddingLeft: '12px', paddingTop: '40%', paddingBottom: '30%' }}
                          >
                            {[...Array(5)].map((_, j) => (
                              <div key={j} className="flex-1 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }} />
                            ))}
                          </div>
                          <div className="relative z-10 flex flex-col h-full p-3 md:p-3.5 gap-1 md:gap-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <div className="shrink-0">
                                {notebook.emoji ? (
                                  <span className="text-lg md:text-xl leading-none">{notebook.emoji}</span>
                                ) : (
                                  <Book size={16} className="text-black/25 scale-[0.82] origin-top-left md:scale-90 md:w-[18px] md:h-[18px]" />
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRenameNotebook(notebook.id); }}
                                  className="p-1 hover:bg-black/10 rounded text-black/30 hover:text-black/60 transition-colors"
                                >
                                  <Type size={11} className="md:w-3 md:h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(notebook.id); }}
                                  className="p-1 hover:bg-red-50/60 rounded text-black/30 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={11} className="md:w-3 md:h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-auto min-w-0 min-h-0">
                              <h4 className="font-bold text-xs md:text-[13px] leading-tight line-clamp-2 mb-0">{notebook.title}</h4>
                              {recentNote ? (
                                <p className="text-[8px] md:text-[9px] text-black/30 truncate mb-0 line-clamp-1">{recentNote.title}</p>
                              ) : null}
                              <p className="text-[8px] md:text-[9px] font-bold text-black/25 uppercase tracking-wide">
                                {count} {t('pages')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCreatingNotebook(true)}
                    className="shrink-0 w-[122px] md:w-[146px] lg:w-[158px] aspect-[3/4] rounded-lg border-2 border-dashed border-black/[0.07] flex flex-col items-center justify-center gap-1.5 md:gap-2 p-3 md:p-3.5 text-black/20 hover:text-black/35 hover:border-black/[0.14] transition-all group bg-[#f6f7f9]"
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-md bg-black/[0.04] flex items-center justify-center group-hover:bg-black/[0.07] transition-colors">
                      <Plus size={15} className="md:w-[17px] md:h-[17px]" />
                    </div>
                    <span className="font-semibold text-[11px] md:text-xs">{t('new_notebook')}</span>
                  </button>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="folder-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full"
          >
            <div className="flex flex-col gap-4 max-md:gap-5 sm:flex-row sm:items-center sm:justify-between mb-6 max-md:mb-6 sm:mb-8 min-w-0 max-md:pt-1">
              <div className="flex items-center gap-3 max-md:gap-3.5 sm:gap-4 min-w-0">
                <button 
                  onClick={() => setSelectedFolder(null)}
                  className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-3xl max-md:text-2xl font-display font-bold tracking-tight">{selectedFolder.title}</h1>
                  <p className="text-black/40 text-sm max-md:text-[13px] mt-1 max-md:mt-1.5">{t('manage_notebooks')}</p>
                </div>
              </div>
              <div className="flex gap-3 max-md:gap-2.5 max-md:flex-wrap">
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={pdfUploading}
                  className="px-6 h-12 bg-black/5 text-black/60 rounded-2xl flex items-center gap-2 hover:bg-black/10 transition-colors font-bold text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Upload size={18} />
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
                  className="px-6 h-12 bg-black text-white rounded-2xl flex items-center gap-2 hover:scale-105 transition-transform font-bold text-sm"
                >
                  <Plus size={20} />
                  {t('new_notebook')}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-visible [scrollbar-width:thin]">
              <div className="mb-12 max-md:mb-14">
                <h3 className="text-sm font-bold text-black/30 uppercase tracking-widest mb-6 max-md:mb-5">{t('notebooks')}</h3>
                {notebooks.filter(nb => nb.folderId === selectedFolder.id).length === 0 ? (
                  <div className="py-12 text-center glass-panel rounded-[32px] border-2 border-dashed border-black/5 text-black/20">
                    {t('no_notebooks')}
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 min-w-0 overscroll-x-contain [scrollbar-width:thin] touch-pan-x">
                    <div className="flex flex-nowrap items-stretch gap-2 max-md:gap-2 sm:gap-2 md:gap-2 w-max pr-1">
                  {notebooks.filter(nb => nb.folderId === selectedFolder.id).map((notebook, i) => {
                    const count = notes.filter(n => n.notebookId === notebook.id).length;
                    const recentNote = notes.filter(n => n.notebookId === notebook.id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                    return (
                      <motion.div
                        key={notebook.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -4 }}
                        onClick={() => { setSelectedNotebook(notebook); setSelectedNote(null); }}
                        className="group cursor-pointer shrink-0 w-[122px] md:w-[146px] lg:w-[158px]"
                      >
                        <div
                          className="aspect-[3/4] rounded-lg relative overflow-hidden flex flex-col shadow-sm w-full min-w-0"
                          style={{ backgroundColor: notebook.color }}
                        >
                          <div className="absolute left-0 top-0 bottom-0 h-full w-[5px] md:w-1.5 bg-black/[0.09]" />
                          <div
                            className="absolute inset-0 flex flex-col"
                            style={{ paddingLeft: '12px', paddingTop: '40%', paddingBottom: '30%' }}
                          >
                            {[...Array(5)].map((_, j) => (
                              <div key={j} className="flex-1 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }} />
                            ))}
                          </div>
                          <div className="relative z-10 flex flex-col h-full p-3 md:p-3.5 gap-1 md:gap-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <div className="shrink-0">
                                {notebook.emoji ? (
                                  <span className="text-lg md:text-xl leading-none">{notebook.emoji}</span>
                                ) : (
                                  <Book size={16} className="text-black/25 scale-[0.82] origin-top-left md:scale-90 md:w-[18px] md:h-[18px]" />
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRenameNotebook(notebook.id); }}
                                  className="p-1 hover:bg-black/10 rounded text-black/30 hover:text-black/60 transition-colors"
                                >
                                  <Type size={11} className="md:w-3 md:h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(notebook.id); }}
                                  className="p-1 hover:bg-red-50/60 rounded text-black/30 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={11} className="md:w-3 md:h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-auto min-w-0 min-h-0">
                              <h4 className="font-bold text-xs md:text-[13px] leading-tight line-clamp-2 mb-0">{notebook.title}</h4>
                              {recentNote ? (
                                <p className="text-[8px] md:text-[9px] text-black/30 truncate mb-0 line-clamp-1">{recentNote.title}</p>
                              ) : null}
                              <p className="text-[8px] md:text-[9px] font-bold text-black/25 uppercase tracking-wide">
                                {count} {t('pages')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-black/30 uppercase tracking-widest mb-6 max-md:mb-5">{t('documents')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 max-md:gap-3 min-w-0">
                  {pdfs.filter(pdf => pdf.folderId === selectedFolder.id).map((pdf) => (
                    <div 
                      key={pdf.id}
                      onClick={() => setSelectedPdf(pdf)}
                      className="glass-panel p-6 max-md:p-6 rounded-[32px] max-md:rounded-2xl flex items-center justify-between gap-3 max-md:gap-4 group cursor-pointer hover:bg-white/60 transition-all"
                    >
                      <div className="flex items-center gap-4 max-md:gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                          <FileText size={20} />
                        </div>
                        <div className="max-w-[150px]">
                          <h4 className="font-bold text-sm truncate">{pdf.title}</h4>
                          <p className="text-[10px] text-black/30 font-bold uppercase tracking-wider">
                            {new Date(pdf.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        className="p-2 text-black/10 group-hover:text-black/40 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                  {pdfs.filter(pdf => pdf.folderId === selectedFolder.id).length === 0 && (
                    <div className="col-span-full py-12 text-center glass-panel rounded-[32px] border-2 border-dashed border-black/5 text-black/20">
                      No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {selectedQuickNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm p-8 max-md:p-4 max-md:items-center max-md:justify-center"
            onClick={() => setSelectedQuickNote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg rounded-[40px] p-12 shadow-2xl relative overflow-hidden max-md:flex max-md:flex-col max-md:min-h-[70vh] max-md:max-h-[90vh] max-md:p-6 max-md:rounded-3xl max-md:overflow-hidden"
              style={{ backgroundColor: selectedQuickNote.color }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8 max-md:mb-4 max-md:shrink-0">
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest max-md:text-[11px] max-md:leading-snug max-md:pr-2">
                  {new Date(selectedQuickNote.createdAt).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => handleDeleteQuickNote(selectedQuickNote.id)}
                    className="p-2 text-black/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => setSelectedQuickNote(null)} className="p-2 text-black/20 hover:text-black transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <input 
                type="text"
                value={selectedQuickNote.title === 'Untitled Note' ? '' : selectedQuickNote.title}
                onChange={(e) => handleUpdateQuickNote(selectedQuickNote.id, { title: e.target.value })}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    handleUpdateQuickNote(selectedQuickNote.id, { title: 'Untitled Note' });
                  }
                }}
                className="w-full text-3xl font-display font-bold bg-transparent border-none outline-none mb-6 placeholder:text-black/10 max-md:text-2xl max-md:mb-4 max-md:shrink-0"
                placeholder="Untitled Note"
                autoFocus={selectedQuickNote.title === 'Untitled Note'}
              />

              <textarea 
                value={selectedQuickNote.content}
                onChange={(e) => handleUpdateQuickNote(selectedQuickNote.id, { content: e.target.value })}
                className="w-full text-lg text-black/60 bg-transparent border-none outline-none resize-none h-64 placeholder:text-black/10 leading-relaxed max-md:flex-1 max-md:min-h-0 max-md:h-auto max-md:overflow-y-auto max-md:resize-none max-md:text-base max-md:[scrollbar-width:thin]"
                placeholder="Type your note here..."
              />

              <div className="mt-8 pt-8 border-t border-black/5 flex items-center justify-between max-md:mt-5 max-md:pt-5 max-md:shrink-0 max-md:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shrink-0 max-md:w-9 max-md:h-9 max-md:rounded-xl">
                    <Type size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Last Modified</p>
                    <p className="text-xs font-bold">
                      {new Date(selectedQuickNote.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedQuickNote(null)}
                  className="px-8 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-lg shadow-black/10 hover:scale-105 transition-transform shrink-0 max-md:px-5 max-md:py-2.5 max-md:text-[13px]"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedNotebook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col min-h-0 overflow-hidden"
          >
            {/* Top navigation bar */}
            <div className="min-h-[48px] h-11 max-md:min-h-[52px] border-b border-black/[0.07] flex items-center px-2 max-md:px-3 sm:px-3 gap-1 max-md:gap-2 sm:gap-2 shrink-0 bg-white min-w-0">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedNote) setSelectedNote(null);
                    else {
                      setSelectedNotebook(null);
                      setSelectedNote(null);
                    }
                  }}
                  className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-xl text-black/45 active:bg-black/[0.06]"
                  aria-label="Retour"
                >
                  <ArrowLeft size={22} />
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

            {/* Format toolbar */}
            {selectedNote && (
              <div className="border-b border-black/[0.05] flex flex-wrap md:flex-nowrap items-center px-2 max-md:px-3 sm:px-4 py-2 max-md:py-2.5 gap-1 max-md:gap-1.5 shrink-0 bg-[#fafaf9] overflow-x-hidden md:overflow-x-auto overflow-y-hidden [scrollbar-width:thin] min-w-0">
                <button onClick={() => addBlock('h1')} title={t('add_h1')} className="px-2.5 py-1.5 rounded text-[11px] font-bold text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all">H1</button>
                <button onClick={() => addBlock('h2')} title={t('add_h2')} className="px-2.5 py-1.5 rounded text-[11px] font-bold text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all">H2</button>
                <button onClick={() => addBlock('h3')} title={t('add_h3')} className="px-2.5 py-1.5 rounded text-[11px] font-bold text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all">H3</button>
                <div className="w-px h-4 bg-black/10 mx-1.5" />
                <button onClick={() => addBlock('text')} title={t('text')} className="p-1.5 rounded text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all"><Type size={13} /></button>
                <button onClick={() => addBlock('bullet')} title={t('add_bullet')} className="p-1.5 rounded text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all"><List size={13} /></button>
                <button onClick={() => addBlock('number')} title={t('add_number')} className="p-1.5 rounded text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all"><ListOrdered size={13} /></button>
                <button onClick={() => addBlock('todo')} title={t('add_todo')} className="p-1.5 rounded text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all"><ListTodo size={13} /></button>
                <button onClick={() => addBlock('toggle')} title="Toggle" className="p-1.5 rounded text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all"><ChevronDown size={13} /></button>
                <button onClick={() => fileInputRef.current?.click()} title="Add Image" className="p-1.5 rounded text-black/30 hover:text-black/65 hover:bg-black/[0.05] transition-all"><ImageIcon size={13} /></button>
                <div className="flex-1" />
                <button onClick={() => handleDeleteNote(selectedNote.id)} title="Delete page" className="p-1.5 rounded text-black/15 hover:text-red-400 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 min-h-0 flex overflow-hidden min-w-0">
              {/* Sidebar (desktop) */}
              {!isMobile && (
              <motion.div
                animate={{ width: isSidebarOpen ? 240 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                className="border-r border-black/[0.06] flex flex-col bg-[#f7f6f3] overflow-hidden shrink-0 max-w-[85vw] sm:max-w-none"
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
                          className="opacity-0 max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 min-h-9 min-w-9 flex items-center justify-center p-0.5 rounded text-black/30 md:text-black/20 md:hover:text-red-400 transition-all shrink-0"
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

              {/* Liste pages (mobile) ou éditeur */}
              <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
                {isMobile && selectedNotebook && !selectedNote ? (
                  <div className="flex flex-col min-h-0 px-4 py-3">
                    <div className="px-0 py-3 border-b border-black/[0.06] mb-4">
                      <p className="text-xs font-semibold text-black/35 uppercase tracking-wider">{t('my_notes')}</p>
                      <p className="text-sm font-semibold text-black truncate">{selectedNotebook.title}</p>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {notebookNotes.map(note => (
                        <div key={note.id} className="flex items-stretch gap-2 min-h-[52px]">
                          <button
                            type="button"
                            onClick={() => setSelectedNote(note)}
                            className="flex-1 min-h-[52px] flex items-center gap-3.5 rounded-xl px-4 text-left border border-transparent bg-white shadow-sm active:bg-black/[0.04] transition-colors"
                          >
                            <FileText size={18} className="shrink-0 text-black/35" />
                            <span className="flex-1 text-sm font-medium text-black truncate">{note.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="min-h-[52px] min-w-[52px] shrink-0 flex items-center justify-center rounded-xl border border-black/[0.08] bg-white text-black/25 active:bg-red-50 active:text-red-500"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {notebookNotes.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-14 text-center gap-4 px-4">
                        <p className="text-sm text-black/40">No pages yet</p>
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
                        className="mt-6 w-full min-h-[52px] rounded-xl border border-black/[0.1] text-sm font-semibold text-black/70 active:bg-black/[0.04]"
                      >
                        + New page
                      </button>
                    )}
                  </div>
                ) : selectedNote ? (
                  <div className={`max-w-2xl mx-auto min-w-0 ${isMobile ? 'px-5 pt-8 pb-32' : 'px-4 sm:px-8 md:px-12 lg:px-16 pt-8 sm:pt-12 lg:pt-16 pb-24 sm:pb-32 lg:pb-40'}`}>
                    <input
                      type="text"
                      value={selectedNote.title === t('untitled_page') ? '' : selectedNote.title}
                      onChange={(e) => handleUpdateNoteTitle(selectedNote.id, e.target.value)}
                      onBlur={(e) => { if (!e.target.value.trim()) handleUpdateNoteTitle(selectedNote.id, t('untitled_page')); }}
                      className={`w-full font-bold bg-transparent border-none outline-none placeholder:text-black/10 leading-tight mb-6 sm:mb-10 block ${
                        isMobile ? 'text-2xl' : 'text-[42px]'
                      }`}
                      placeholder={t('untitled_page')}
                      autoFocus={selectedNote.title === t('untitled_page')}
                    />
                    <div className="space-y-0.5">
                      {currentBlocks.map((block) => (
                        <div key={block.id} className={`group relative ${['h1', 'h2', 'h3'].includes(block.type) ? 'mt-8 mb-1' : ''}`}>
                          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => deleteBlock(block.id)}
                              className="min-h-10 min-w-10 md:min-h-0 md:min-w-0 flex items-center justify-center p-2 rounded-lg active:bg-red-50 text-black/35 md:text-black/10 md:hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {block.type === 'h1' && (
                            <input
                              type="text"
                              value={block.content}
                              onChange={(e) => updateBlock(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block)}
                              autoFocus={focusedBlockId === block.id}
                              onFocus={() => setFocusedBlockId(block.id)}
                              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-black/10"
                              placeholder={t('add_h1')}
                            />
                          )}
                          {block.type === 'h2' && (
                            <input
                              type="text"
                              value={block.content}
                              onChange={(e) => updateBlock(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block)}
                              autoFocus={focusedBlockId === block.id}
                              onFocus={() => setFocusedBlockId(block.id)}
                              className="w-full text-2xl font-semibold bg-transparent border-none outline-none placeholder:text-black/10"
                              placeholder={t('add_h2')}
                            />
                          )}
                          {block.type === 'h3' && (
                            <input
                              type="text"
                              value={block.content}
                              onChange={(e) => updateBlock(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block)}
                              autoFocus={focusedBlockId === block.id}
                              onFocus={() => setFocusedBlockId(block.id)}
                              className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-black/10"
                              placeholder={t('add_h3')}
                            />
                          )}
                          {block.type === 'text' && (
                            <AutoExpandingTextarea
                              value={block.content}
                              onChange={(e) => updateBlock(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block)}
                              onFocus={() => setFocusedBlockId(block.id)}
                              autoFocus={focusedBlockId === block.id}
                              placeholder={focusedBlockId === block.id ? t('type_something') : ''}
                              className="w-full text-[17px] leading-relaxed text-black/70 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.6em] overflow-hidden"
                            />
                          )}
                          {block.type === 'bullet' && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-black/30 mt-[0.7em] shrink-0" />
                              <AutoExpandingTextarea
                                value={block.content}
                                onChange={(e) => updateBlock(block.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, block)}
                                onFocus={() => setFocusedBlockId(block.id)}
                                autoFocus={focusedBlockId === block.id}
                                placeholder={focusedBlockId === block.id ? t('list_item') : ''}
                                className="w-full text-[17px] leading-relaxed text-black/70 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.6em] overflow-hidden"
                              />
                            </div>
                          )}
                          {block.type === 'number' && (
                            <div className="flex items-start gap-3">
                              <span className="text-[17px] text-black/30 shrink-0 min-w-[1.5rem] font-medium leading-relaxed">
                                {currentBlocks.filter((b, i) => b.type === 'number' && i <= currentBlocks.indexOf(block)).length}.
                              </span>
                              <AutoExpandingTextarea
                                value={block.content}
                                onChange={(e) => updateBlock(block.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, block)}
                                onFocus={() => setFocusedBlockId(block.id)}
                                autoFocus={focusedBlockId === block.id}
                                placeholder={focusedBlockId === block.id ? t('list_item') : ''}
                                className="w-full text-[17px] leading-relaxed text-black/70 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.6em] overflow-hidden"
                              />
                            </div>
                          )}
                          {block.type === 'todo' && (
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => updateBlock(block.id, block.content, { checked: !block.checked })}
                                className={`mt-[0.35em] w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all active:scale-90 shrink-0 ${
                                  block.checked ? 'bg-black border-black text-white' : 'border-black/20 hover:border-black/40'
                                }`}
                              >
                                {block.checked && <Check size={10} strokeWidth={3} />}
                              </button>
                              <AutoExpandingTextarea
                                value={block.content}
                                onChange={(e) => updateBlock(block.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, block)}
                                onFocus={() => setFocusedBlockId(block.id)}
                                autoFocus={focusedBlockId === block.id}
                                placeholder={focusedBlockId === block.id ? t('todo_item') : ''}
                                className={`w-full text-[17px] leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.6em] overflow-hidden transition-all ${
                                  block.checked ? 'text-black/25 line-through' : 'text-black/70'
                                }`}
                              />
                            </div>
                          )}
                          {block.type === 'toggle' && (
                            <div className="flex flex-col">
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={() => updateBlock(block.id, block.content, { isOpen: !block.isOpen })}
                                  className={`mt-1 p-0.5 hover:bg-black/5 rounded transition-transform ${block.isOpen ? 'rotate-90' : ''}`}
                                >
                                  <ChevronRight size={16} className="text-black/35" />
                                </button>
                                <AutoExpandingTextarea
                                  value={block.content}
                                  onChange={(e) => updateBlock(block.id, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, block)}
                                  onFocus={() => setFocusedBlockId(block.id)}
                                  autoFocus={focusedBlockId === block.id}
                                  placeholder={focusedBlockId === block.id ? 'Toggle list' : ''}
                                  className="w-full text-[17px] leading-relaxed font-medium text-black/70 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.6em] overflow-hidden"
                                />
                              </div>
                              {block.isOpen && (
                                <div className="ml-6 mt-1 border-l-2 border-black/[0.06] pl-4 py-1 text-sm text-black/30 italic">
                                  Toggle content...
                                </div>
                              )}
                            </div>
                          )}
                          {block.type === 'image' && (
                            <div className="relative rounded-2xl overflow-hidden group/img my-2">
                              <img src={block.content} alt="Note asset" className="w-full h-auto" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => deleteBlock(block.id)}
                                className="absolute top-3 right-3 min-h-11 min-w-11 flex items-center justify-center p-1.5 bg-black/50 text-white rounded-lg opacity-0 max-md:opacity-100 md:opacity-0 md:group-hover/img:opacity-100 transition-opacity backdrop-blur-md"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: selectedNotebook.color }}>
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
                      className="mt-1 px-5 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
                    >
                      Create first page
                    </button>
                  </div>
                )}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-[40px] p-10 max-md:p-6 max-md:rounded-3xl shadow-2xl border border-black/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8 max-md:mb-5">
                <h2 className="text-2xl font-display font-bold">New Notebook</h2>
                <button onClick={() => setIsCreatingNotebook(false)} className="text-black/20 hover:text-black transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8 max-md:space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3 max-md:mb-3.5 block">Notebook Title</label>
                  <input 
                    type="text"
                    autoFocus
                    value={newNotebookTitle}
                    onChange={(e) => setNewNotebookTitle(e.target.value)}
                    placeholder="e.g. Organic Chemistry"
                    className="w-full bg-black/5 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3 block">Cover Color</label>
                  <div className="flex gap-3">
                    {NOTEBOOK_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewNotebookColor(color)}
                        className={`w-10 h-10 rounded-full transition-all ${newNotebookColor === color ? 'ring-4 ring-black/5 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Cover Emoji <span className="normal-case font-normal">(optional)</span></label>
                    {newNotebookEmoji && (
                      <button onClick={() => setNewNotebookEmoji('')} className="text-[10px] text-black/30 hover:text-black/60 transition-colors">
                        Clear
                      </button>
                    )}
                  </div>
                  {newNotebookEmoji && (
                    <div className="flex items-center gap-3 mb-3 px-4 py-3 rounded-2xl bg-black/[0.03] border border-black/[0.06]">
                      <span className="text-3xl">{newNotebookEmoji}</span>
                      <span className="text-sm text-black/40 font-medium">Selected</span>
                    </div>
                  )}
                  <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1 max-h-36 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] p-1 rounded-2xl bg-black/[0.02] border border-black/[0.05]">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setNewNotebookEmoji(emoji === newNotebookEmoji ? '' : emoji)}
                        className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                          newNotebookEmoji === emoji ? 'bg-black/10 scale-110' : 'hover:bg-black/[0.05]'
                        }`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateNotebook}
                  className="w-full py-5 bg-black text-white rounded-3xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                >
                  Create Notebook
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-6xl h-full bg-white rounded-[40px] max-md:rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-black/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-8 max-md:px-4 py-6 max-md:py-4 border-bottom border-black/5 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedPdf.title}</h3>
                    <p className="text-xs text-black/30 font-bold uppercase tracking-widest">Document Viewer</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPdf(null)}
                  className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 bg-gray-100 p-8 max-md:p-3 overflow-hidden">
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-[40px] p-10 max-md:p-6 max-md:rounded-3xl shadow-2xl border border-black/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8 max-md:mb-5">
                <h2 className="text-2xl font-display font-bold">New Folder</h2>
                <button onClick={() => setIsCreatingFolder(false)} className="text-black/20 hover:text-black transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8 max-md:space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3 max-md:mb-3.5 block">Folder Title</label>
                  <input 
                    type="text"
                    autoFocus
                    value={newFolderTitle}
                    onChange={(e) => setNewFolderTitle(e.target.value)}
                    placeholder="e.g. University Semester 2"
                    className="w-full bg-black/5 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <button 
                  onClick={handleCreateFolder}
                  className="w-full py-5 bg-black text-white rounded-3xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                >
                  Create Folder
                </button>
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
