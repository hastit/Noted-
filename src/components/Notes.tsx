import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Folder, Search, MoreVertical, Book, ChevronRight, ChevronDown, X, Save, Trash2, Type, Heading1, Heading2, Heading3, Image as ImageIcon, FileText, ArrowLeft, Upload, List, ListOrdered, ListTodo } from 'lucide-react';
import { MOCK_NOTEBOOKS, MOCK_FOLDERS, MOCK_NOTES, MOCK_QUICK_NOTES } from '../constants';
import { Notebook, Folder as FolderType, Note, PDFFile, QuickNote } from '../types';
import { useLanguage } from '../context/LanguageContext';

const NOTEBOOK_COLORS = [
  '#DDE6FF', '#FFF9E7', '#D9FFF3', '#FFD9DC', '#E8D9FF', '#F4F4F4'
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
  onClearInitialNotebook
}: NotesProps) {
  const { t } = useLanguage();
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  
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
      id: Math.random().toString(36).substr(2, 9),
      title: newNotebookTitle,
      color: newNotebookColor,
      folderId: selectedFolder?.id,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onNotebooksChange([...notebooks, newNb]);
    setNewNotebookTitle('');
    setIsCreatingNotebook(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderTitle.trim()) return;
    const newFolder: FolderType = {
      id: Math.random().toString(36).substr(2, 9),
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
      id: Math.random().toString(36).substr(2, 9),
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

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;

    const newPdf: PDFFile = {
      id: Math.random().toString(36).substr(2, 9),
      title: file.name,
      url: URL.createObjectURL(file),
      folderId: selectedFolder.id,
      uploadedAt: new Date().toISOString(),
    };
    setPdfs(prev => [...prev, newPdf]);
  };

  const handleCreateNote = (notebookId: string) => {
    const initialBlocks: NoteBlock[] = [{ id: 'b1', type: 'text', content: '' }];
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: t('untitled_page'),
      content: stringifyBlocks(initialBlocks),
      notebookId,
      updatedAt: new Date().toISOString(),
    };
    onNotesChange([...notes, newNote]);
    setSelectedNote(newNote);
  };

  const handleUpdateNote = (noteId: string, updates: Partial<Note>) => {
    onNotesChange(notes.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    if (selectedNote?.id === noteId) {
      setSelectedNote(prev => prev ? { ...prev, ...updates } : null);
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

  const handleDeleteNote = (noteId: string) => {
    if (confirm(t('delete_page_confirm'))) {
      onNotesChange(notes.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
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

  // Set initial selected note when opening a notebook
  React.useEffect(() => {
    if (selectedNotebook && !selectedNote) {
      const firstNote = notes.find(n => n.notebookId === selectedNotebook.id);
      if (firstNote) {
        setSelectedNote(firstNote);
      }
    }
  }, [selectedNotebook, notes]);

  return (
    <div className="h-full flex flex-col gap-10">
      <AnimatePresence mode="wait">
        {!selectedFolder ? (
          <motion.div
            key="main-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col h-full"
          >
            <div className="flex items-end justify-between mb-12 pt-4 shrink-0">
              <div>
                <h1 className="text-5xl font-bold tracking-tight mb-2 uppercase">{t('notes_title')}</h1>
                <p className="text-muted text-sm font-bold uppercase tracking-widest opacity-60">{t('notes_subtitle')}</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-surface px-8 py-4 rounded-pill flex items-center gap-4 border border-black/5 shadow-sm focus-within:ring-2 ring-black/5 transition-all">
                  <Search size={20} className="text-muted" />
                  <input 
                    type="text" 
                    placeholder={t('search_notes')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-64 placeholder:text-muted font-bold uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-12 pb-12">
              {/* Recent Folders */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold tracking-tight uppercase">{t('recent_folders')}</h2>
                </div>
                <div className="flex gap-10 mb-10 border-b border-black/5">
                  {(['todays', 'week', 'month'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFolderTab(tab)}
                      className={`pb-5 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative ${
                        folderTab === tab ? 'text-ink' : 'text-muted hover:text-ink/60'
                      }`}
                    >
                      {tab === 'todays' ? t('todays') : tab === 'week' ? t('this_week') : t('this_month')}
                      {folderTab === tab && (
                        <motion.div 
                          layoutId="folderTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-ink rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {filterByTab(folders, folderTab).map((folder) => (
                    <motion.div 
                      key={folder.id}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => setSelectedFolder(folder)}
                      className="p-8 rounded-card bg-surface cursor-pointer group relative overflow-hidden flex flex-col justify-between aspect-[1.3/1] border border-black/5 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
                          <Folder size={24} className="text-ink" />
                        </div>
                        <button className="p-2 text-muted hover:text-ink transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold mb-2 tracking-tight">{folder.title}</h4>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] opacity-60">
                          {new Date(folder.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <button 
                    onClick={() => setIsCreatingFolder(true)}
                    className="rounded-card border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-4 text-muted hover:text-ink hover:border-black/20 transition-all aspect-[1.3/1] bg-surface/30 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{t('new_folder')}</span>
                  </button>
                </div>
              </section>

              {/* My Notes */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold tracking-tight uppercase">{t('my_notes')}</h2>
                </div>
                <div className="flex gap-10 mb-10 border-b border-black/5">
                  {(['todays', 'week', 'month'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setNoteTab(tab)}
                      className={`pb-5 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative ${
                        noteTab === tab ? 'text-ink' : 'text-muted hover:text-ink/60'
                      }`}
                    >
                      {tab === 'todays' ? t('todays') : tab === 'week' ? t('this_week') : t('this_month')}
                      {noteTab === tab && (
                        <motion.div 
                          layoutId="noteTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-ink rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {filterByTab(quickNotes, noteTab).map((note) => (
                    <motion.div 
                      key={note.id}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => setSelectedQuickNote(note)}
                      className="p-10 rounded-card bg-canvas shadow-sm flex flex-col justify-between aspect-[0.85/1] cursor-pointer group border border-black/5 hover:shadow-2xl hover:shadow-black/5 transition-all"
                      style={{ backgroundColor: note.color }}
                    >
                      <div>
                        <p className="text-[10px] font-bold text-ink/30 uppercase tracking-[0.2em] mb-6">
                          {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex justify-between items-start mb-6">
                          <h4 className="text-2xl font-bold leading-tight tracking-tight group-hover:text-ink/70 transition-colors">{note.title}</h4>
                          <button className="w-10 h-10 bg-ink rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl flex items-center justify-center">
                            <Type size={18} />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-ink/60 line-clamp-5 leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-ink/40">
                        <div className="w-5 h-5 rounded-full border border-ink/10 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-ink/30" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                          {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  <button 
                    onClick={handleCreateQuickNote}
                    className="rounded-card border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-4 text-muted hover:text-ink hover:border-black/20 transition-all aspect-[0.85/1] bg-surface/30 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{t('new_note')}</span>
                  </button>
                </div>
              </section>

              {/* Notebooks (Original) */}
              <section className="pb-12">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold tracking-tight uppercase">{t('notebooks')}</h2>
                  <button 
                    onClick={() => setIsCreatingNotebook(true)}
                    className="w-12 h-12 bg-ink text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                <div className="flex gap-8 overflow-x-auto no-scrollbar pb-6">
                  {filteredNotebooks.map((notebook, i) => {
                    const count = notes.filter(n => n.notebookId === notebook.id).length;
                    return (
                      <motion.div
                        key={notebook.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        onClick={() => {
                          setSelectedNotebook(notebook);
                          setSelectedNote(null);
                        }}
                        className="flex-shrink-0 w-52 group cursor-pointer"
                      >
                        <div 
                          className="aspect-[3/4.2] rounded-[32px] shadow-sm relative overflow-hidden flex flex-col justify-between p-8 border border-black/5 transition-all hover:shadow-2xl hover:shadow-black/5"
                          style={{ backgroundColor: notebook.color }}
                        >
                          <div className="absolute top-0 left-6 w-1.5 h-full bg-black/5" />
                          <div className="flex justify-between items-start relative z-10">
                            <Book size={22} className="text-black/20" />
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameNotebook(notebook.id);
                                }}
                                className="p-1.5 hover:bg-black/5 rounded-lg text-black/20 hover:text-black/40 transition-colors"
                              >
                                <Type size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotebook(notebook.id);
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-black/20 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="relative z-10">
                            <h4 className="font-bold text-xl leading-tight tracking-tight">{notebook.title}</h4>
                            <p className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] mt-3">{count} {t('pages')}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
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
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setSelectedFolder(null)}
                  className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center hover:bg-black/5 transition-all border border-black/5 shadow-sm"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight uppercase">{selectedFolder.title}</h1>
                  <p className="text-muted text-sm font-bold uppercase tracking-widest opacity-60 mt-1">{t('manage_notebooks')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => pdfInputRef.current?.click()}
                  className="px-8 h-14 bg-surface text-ink rounded-pill flex items-center gap-3 hover:bg-black/5 transition-all font-bold text-[11px] uppercase tracking-widest border border-black/5 shadow-sm"
                >
                  <Upload size={20} />
                  {t('upload_pdf')}
                </button>
                <input 
                  type="file"
                  ref={pdfInputRef}
                  onChange={handlePdfUpload}
                  accept="application/pdf"
                  className="hidden"
                />
                <button 
                  onClick={() => setIsCreatingNotebook(true)}
                  className="px-8 h-14 bg-ink text-canvas rounded-pill flex items-center gap-3 hover:scale-105 transition-transform font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-black/10"
                >
                  <Plus size={24} />
                  {t('new_notebook')}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="mb-12">
                <h3 className="text-sm font-bold text-black/30 uppercase tracking-widest mb-6">{t('notebooks')}</h3>
                <div className="grid grid-cols-5 gap-6">
                  {notebooks.filter(nb => nb.folderId === selectedFolder.id).map((notebook, i) => {
                    const count = notes.filter(n => n.notebookId === notebook.id).length;
                    return (
                      <motion.div
                        key={notebook.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ y: -8 }}
                        onClick={() => {
                          setSelectedNotebook(notebook);
                          setSelectedNote(null);
                        }}
                        className="group cursor-pointer"
                      >
                        <div 
                          className="aspect-[3/4] rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between p-6"
                          style={{ backgroundColor: notebook.color }}
                        >
                          <div className="absolute top-0 left-4 w-1 h-full bg-black/5" />
                          <div className="flex justify-between items-start relative z-10">
                            <Book size={20} className="text-black/20" />
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameNotebook(notebook.id);
                                }}
                                className="p-1 hover:bg-black/5 rounded-md text-black/20 hover:text-black/40 transition-colors"
                              >
                                <Type size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotebook(notebook.id);
                                }}
                                className="p-1 hover:bg-red-50 rounded-md text-black/20 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="relative z-10">
                            <h4 className="font-display font-bold text-lg leading-tight">{notebook.title}</h4>
                            <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mt-2">{count} {t('pages')}</p>
                          </div>
                          <div className="absolute bottom-0 right-0 w-16 h-16 bg-white/10 rounded-tl-[40px] blur-xl" />
                        </div>
                      </motion.div>
                    );
                  })}
                  {notebooks.filter(nb => nb.folderId === selectedFolder.id).length === 0 && (
                    <div className="col-span-full py-12 text-center glass-panel rounded-[32px] border-2 border-dashed border-black/5 text-black/20">
                      {t('no_notebooks')}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-black/30 uppercase tracking-widest mb-6">{t('documents')}</h3>
                <div className="grid grid-cols-4 gap-6">
                  {pdfs.filter(pdf => pdf.folderId === selectedFolder.id).map((pdf) => (
                    <div 
                      key={pdf.id}
                      onClick={() => setSelectedPdf(pdf)}
                      className="glass-panel p-6 rounded-[32px] flex items-center justify-between group cursor-pointer hover:bg-white/60 transition-all"
                    >
                      <div className="flex items-center gap-4">
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
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm p-8"
            onClick={() => setSelectedQuickNote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-xl rounded-[48px] p-12 shadow-2xl relative overflow-hidden border border-black/5"
              style={{ backgroundColor: selectedQuickNote.color }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-10">
                <p className="text-[11px] font-bold text-black/30 uppercase tracking-[0.3em]">
                  {new Date(selectedQuickNote.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleDeleteQuickNote(selectedQuickNote.id)}
                    className="p-2.5 text-black/20 hover:text-red-500 transition-colors bg-white/20 rounded-xl hover:bg-white/40"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => setSelectedQuickNote(null)} className="p-2.5 text-black/20 hover:text-black transition-colors bg-white/20 rounded-xl hover:bg-white/40">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <input 
                type="text"
                value={selectedQuickNote.title === t('untitled_note') ? '' : selectedQuickNote.title}
                onChange={(e) => handleUpdateQuickNote(selectedQuickNote.id, { title: e.target.value })}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    handleUpdateQuickNote(selectedQuickNote.id, { title: t('untitled_note') });
                  }
                }}
                className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-8 placeholder:text-black/10 tracking-tight uppercase"
                placeholder={t('untitled_note')}
                autoFocus={selectedQuickNote.title === t('untitled_note')}
              />

              <textarea 
                value={selectedQuickNote.content}
                onChange={(e) => handleUpdateQuickNote(selectedQuickNote.id, { content: e.target.value })}
                className="w-full text-xl text-black/70 bg-transparent border-none outline-none resize-none h-80 placeholder:text-black/10 leading-relaxed font-medium"
                placeholder={t('type_something')}
              />

              <div className="mt-10 pt-10 border-t border-black/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-ink flex items-center justify-center text-canvas shadow-lg">
                    <Type size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-[0.2em] mb-1">{t('last_edited')}</p>
                    <p className="text-sm font-bold">
                      {new Date(selectedQuickNote.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedQuickNote(null)}
                  className="px-10 py-4 bg-ink text-canvas rounded-pill font-bold text-sm shadow-xl shadow-black/10 hover:scale-105 transition-transform uppercase tracking-widest"
                >
                  {t('save_note')}
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
            onClick={() => {
              setSelectedNotebook(null);
              setSelectedNote(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full h-full bg-white overflow-hidden flex"
              onClick={e => e.stopPropagation()}
            >
              {/* Sidebar */}
              <motion.div 
                animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                className="border-r border-black/5 flex flex-col bg-surface overflow-hidden"
              >
                <div className="p-10 flex flex-col h-full w-80">
                  <div className="flex items-center justify-between mb-10">
                    <button 
                      onClick={() => setSelectedNotebook(null)}
                      className="flex items-center gap-3 text-muted hover:text-ink transition-all group"
                    >
                      <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="font-bold text-[11px] uppercase tracking-[0.2em]">{t('back')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-10 p-4 rounded-2xl bg-white/50 border border-black/5">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: selectedNotebook.color }} />
                    <h3 className="font-bold text-sm truncate tracking-tight uppercase">{selectedNotebook.title}</h3>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                    {notebookNotes.map(note => (
                      <div 
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all cursor-pointer flex items-center justify-between group ${
                          selectedNote?.id === note.id ? 'bg-ink text-canvas shadow-xl shadow-black/10' : 'text-muted hover:bg-black/5'
                        }`}
                      >
                        <span className="truncate flex-1 uppercase tracking-tight">{note.title}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedNote?.id === note.id ? 'text-canvas/40 hover:text-canvas' : 'text-black/10 hover:text-red-500'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    
                    {notebookNotes.length === 0 && (
                      <div className="py-12 text-center text-muted italic text-xs uppercase tracking-widest opacity-40">
                        {t('no_pages')}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleCreateNote(selectedNotebook.id)}
                    className="mt-8 flex items-center justify-center gap-3 py-4 bg-ink text-canvas rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10 group"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">{t('new_page')}</span>
                  </button>
                </div>
              </motion.div>

              {/* Editor */}
              <div className="flex-1 flex bg-white overflow-hidden relative">
                {/* Sidebar Toggle Button */}
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`absolute left-4 top-4 z-10 p-2 rounded-xl bg-white border border-black/5 text-black/20 hover:text-black transition-all shadow-sm ${!isSidebarOpen ? 'translate-x-0' : 'translate-x-0'}`}
                  title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                  <List size={18} />
                </button>
                {selectedNote ? (
                  <>
                    <div className="flex-1 p-16 overflow-y-auto no-scrollbar">
                      <div className="max-w-4xl mx-auto w-full">
                        <div className="flex items-end justify-between mb-20">
                          <input 
                            type="text"
                            value={selectedNote.title === t('untitled_page') ? '' : selectedNote.title}
                            onChange={(e) => handleUpdateNoteTitle(selectedNote.id, e.target.value)}
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                handleUpdateNoteTitle(selectedNote.id, t('untitled_page'));
                              }
                            }}
                            className="text-6xl font-bold bg-transparent border-none outline-none w-full placeholder:text-ink/10 leading-tight tracking-tighter uppercase"
                            placeholder={t('untitled_page')}
                            autoFocus={selectedNote.title === t('untitled_page')}
                          />
                          <div className="text-[11px] font-bold text-ink/20 uppercase tracking-[0.4em] shrink-0 ml-12 mb-6">
                            {t('last_edited')} {new Date(selectedNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Blocks */}
                        <div className="space-y-4 mb-32">
                          {currentBlocks.map((block) => (
                            <div key={block.id} className={`group relative ${['h1', 'h2', 'h3'].includes(block.type) ? 'mt-10 mb-4' : ''}`}>
                              <div className="absolute -left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2">
                                <button 
                                  onClick={() => deleteBlock(block.id)}
                                  className="p-2 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors shadow-sm bg-white"
                                >
                                  <Trash2 size={16} />
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
                                  className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-black/10 uppercase tracking-tight"
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
                                  className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-black/10 uppercase tracking-tight"
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
                                  className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-black/10 uppercase tracking-tight"
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
                                  placeholder={focusedBlockId === block.id ? t('type_something') : ""}
                                  className="w-full text-xl font-medium text-ink/60 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.5em] overflow-hidden leading-relaxed"
                                />
                              )}
                              {block.type === 'bullet' && (
                                <div className="flex items-start gap-5">
                                  <div className="w-2 h-2 rounded-full bg-ink/40 mt-3.5 shrink-0" />
                                  <AutoExpandingTextarea 
                                    value={block.content}
                                    onChange={(e) => updateBlock(block.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block)}
                                    onFocus={() => setFocusedBlockId(block.id)}
                                    autoFocus={focusedBlockId === block.id}
                                    placeholder={focusedBlockId === block.id ? t('list_item') : ""}
                                    className="w-full text-xl font-medium text-ink/60 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.5em] overflow-hidden leading-relaxed"
                                  />
                                </div>
                              )}
                              {block.type === 'number' && (
                                <div className="flex items-start gap-5">
                                  <span className="text-xl font-bold text-ink/20 mt-1 shrink-0 min-w-[2rem]">
                                    {currentBlocks.filter((b, i) => b.type === 'number' && i <= currentBlocks.indexOf(block)).length}.
                                  </span>
                                  <AutoExpandingTextarea 
                                    value={block.content}
                                    onChange={(e) => updateBlock(block.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block)}
                                    onFocus={() => setFocusedBlockId(block.id)}
                                    autoFocus={focusedBlockId === block.id}
                                    placeholder={focusedBlockId === block.id ? t('list_item') : ""}
                                    className="w-full text-xl font-medium text-ink/60 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.5em] overflow-hidden leading-relaxed"
                                  />
                                </div>
                              )}
                              {block.type === 'todo' && (
                                <div className="flex items-start gap-5">
                                  <button 
                                    onClick={() => updateBlock(block.id, block.content, { checked: !block.checked })}
                                    className={`mt-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 shadow-sm ${
                                      block.checked ? 'bg-ink border-ink text-canvas' : 'border-ink/10 hover:border-ink/30 bg-white'
                                    }`}
                                  >
                                    {block.checked && <Check size={16} strokeWidth={4} />}
                                  </button>
                                  <AutoExpandingTextarea 
                                    value={block.content}
                                    onChange={(e) => updateBlock(block.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block)}
                                    onFocus={() => setFocusedBlockId(block.id)}
                                    autoFocus={focusedBlockId === block.id}
                                    placeholder={focusedBlockId === block.id ? t('todo_item') : ""}
                                    className={`w-full text-xl font-medium bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.5em] overflow-hidden transition-all leading-relaxed ${
                                      block.checked ? 'text-ink/20 line-through' : 'text-ink/60'
                                    }`}
                                  />
                                </div>
                              )}
                              {block.type === 'toggle' && (
                                <div className="flex flex-col">
                                  <div className="flex items-start gap-3">
                                    <button 
                                      onClick={() => updateBlock(block.id, block.content, { isOpen: !block.isOpen })}
                                      className={`mt-2.5 p-1 hover:bg-black/5 rounded-lg transition-transform ${block.isOpen ? 'rotate-90' : ''}`}
                                    >
                                      <ChevronRight size={22} className="text-ink/40" />
                                    </button>
                                    <AutoExpandingTextarea 
                                      value={block.content}
                                      onChange={(e) => updateBlock(block.id, e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, block)}
                                      onFocus={() => setFocusedBlockId(block.id)}
                                      autoFocus={focusedBlockId === block.id}
                                      placeholder={focusedBlockId === block.id ? "Toggle list" : ""}
                                      className="w-full text-xl font-bold text-ink/80 bg-transparent border-none outline-none resize-none placeholder:text-black/10 min-h-[1.5em] overflow-hidden leading-relaxed"
                                    />
                                  </div>
                                  {block.isOpen && (
                                    <div className="ml-10 mt-3 border-l-4 border-black/5 pl-6 py-4 text-sm text-ink/40 font-bold uppercase tracking-widest italic">
                                      Toggle content goes here... (Nested blocks coming soon)
                                    </div>
                                  )}
                                </div>
                              )}
                              {block.type === 'image' && (
                                <div className="relative rounded-[40px] overflow-hidden shadow-2xl group/img border border-black/5">
                                  <img src={block.content} alt="Note asset" className="w-full h-auto" referrerPolicy="no-referrer" />
                                  <button 
                                    onClick={() => deleteBlock(block.id)}
                                    className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-all backdrop-blur-md hover:bg-red-500 hover:scale-110"
                                  >
                                    <X size={20} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sidebar Toolbar */}
                    <div className="w-24 border-l border-black/5 bg-surface/30 flex flex-col items-center py-16 gap-6">
                      <div className="text-[11px] font-bold text-ink/20 uppercase tracking-[0.4em] vertical-text mb-6">{t('tools')}</div>
                      <button 
                        onClick={() => addBlock('h1')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title={t('add_h1')}
                      >
                        <Heading1 size={24} />
                      </button>
                      <button 
                        onClick={() => addBlock('h2')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title={t('add_h2')}
                      >
                        <Heading2 size={24} />
                      </button>
                      <button 
                        onClick={() => addBlock('h3')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title={t('add_h3')}
                      >
                        <Heading3 size={24} />
                      </button>
                      <div className="w-10 h-px bg-black/5 my-4" />
                      <button 
                        onClick={() => addBlock('text')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title={t('text')}
                      >
                        <Type size={24} />
                      </button>
                      <button 
                        onClick={() => addBlock('bullet')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title={t('add_bullet')}
                      >
                        <List size={24} />
                      </button>
                      <button 
                        onClick={() => addBlock('number')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title={t('add_number')}
                      >
                        <ListOrdered size={24} />
                      </button>
                      <button 
                        onClick={() => addBlock('todo')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title={t('add_todo')}
                      >
                        <ListTodo size={24} />
                      </button>
                      <button 
                        onClick={() => addBlock('toggle')}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title="Toggle List"
                      >
                        <ChevronRight size={24} />
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-ink/40 hover:text-ink hover:scale-110 active:scale-95 shadow-sm hover:shadow-md border border-transparent hover:border-black/5"
                        title="Add Image"
                      >
                        <ImageIcon size={24} />
                      </button>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                    <div className="w-32 h-32 rounded-[48px] bg-surface flex items-center justify-center text-ink/10 mb-10 shadow-inner border border-black/5">
                      <Book size={64} className="opacity-20" />
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight uppercase mb-4">{t('select_page_title')}</h3>
                    <p className="text-muted text-sm font-bold uppercase tracking-widest opacity-60 max-w-xs leading-relaxed">{t('select_page_subtitle')}</p>
                  </div>
                )}
              </div>
            </motion.div>
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
            className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsCreatingNotebook(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-black/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display font-bold">New Notebook</h2>
                <button onClick={() => setIsCreatingNotebook(false)} className="text-black/20 hover:text-black transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3 block">Notebook Title</label>
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
            className="fixed inset-0 z-[120] flex items-center justify-center p-8 bg-black/40 backdrop-blur-md"
            onClick={() => setSelectedPdf(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-6xl h-full bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col border border-black/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-8 py-6 border-bottom border-black/5 flex items-center justify-between bg-gray-50/50">
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
              <div className="flex-1 bg-gray-100 p-8 overflow-hidden">
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
            className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsCreatingFolder(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-black/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display font-bold">New Folder</h2>
                <button onClick={() => setIsCreatingFolder(false)} className="text-black/20 hover:text-black transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3 block">Folder Title</label>
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
    </div>
  );
}
