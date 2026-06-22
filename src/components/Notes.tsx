import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {motion} from 'motion/react';
import {
  Search,
  Folder,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Trash2,
  SquarePen,
  FileText,
  StickyNote,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  FolderInput,
} from 'lucide-react';
import NoteEditor from './NoteEditor';
import {Notebook, Folder as FolderType, Note, QuickNote, Task} from '../types';
import {useLanguage} from '../context/LanguageContext';
import {useIsMobile} from '../hooks/useIsMobile';
import {LIMITS, limitError} from '../lib/limits';
import {extractPlainFromNoteContent, noteContentToPlainFull, noteListPreview, plainTextToNoteHtml} from '../utils/notePreview';

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

const QUICK_NOTE_SURFACE = '#FFFFFF';
const DEFAULT_NOTEBOOK_COLOR = '#FFFFFF';
const SIDEBAR_PANEL_WIDTH = 240;
const LIST_PANEL_WIDTH = 320;
const PANEL_TRANSITION = {duration: 0.34, ease: [0.22, 1, 0.36, 1] as const};

type SidebarSelection =
  | {kind: 'quick'}
  | {kind: 'all'}
  | {kind: 'notebook'; id: string}
  | {kind: 'folder'; id: string};

type ActiveItem = {kind: 'note'; id: string} | {kind: 'quick'; id: string} | null;
type MobilePanel = 'sidebar' | 'list' | 'editor';

function formatListDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString([], {weekday: 'short'});
  return d.toLocaleDateString([], {month: 'numeric', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined});
}

function sectionLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'Previous 7 Days';
  if (diff < 30) return 'Previous 30 Days';
  return d.toLocaleDateString([], {month: 'long', year: 'numeric'});
}

function groupBySection<T extends {sortDate: string}>(items: T[]): Array<{label: string; items: T[]}> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const label = sectionLabel(item.sortDate);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, grouped]) => ({label, items: grouped}));
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
  supabaseNotes,
}: NotesProps) {
  const {t} = useLanguage();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebar, setSidebar] = useState<SidebarSelection>({kind: 'all'});
  const [activeItem, setActiveItem] = useState<ActiveItem>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('list');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(folders.map(f => f.id)));
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [newNotebookFolderId, setNewNotebookFolderId] = useState<string | undefined>();
  const [panelsOpen, setPanelsOpen] = useState(true);
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(null);
  const [renameNotebookTitle, setRenameNotebookTitle] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderTitle, setRenameFolderTitle] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);

  useEffect(() => {
    if (!initialNotebookId) return;
    const notebook = notebooks.find(nb => nb.id === initialNotebookId);
    if (notebook) {
      setSidebar({kind: 'notebook', id: notebook.id});
      const first = notes.find(n => n.notebookId === notebook.id);
      if (first) {
        setActiveItem({kind: 'note', id: first.id});
        if (isMobile) setMobilePanel('editor');
      } else if (isMobile) {
        setMobilePanel('list');
      }
      onClearInitialNotebook?.();
    }
  }, [initialNotebookId, notebooks, notes, onClearInitialNotebook, isMobile]);

  const unfiledNotebooks = useMemo(
    () => notebooks.filter(nb => !nb.folderId),
    [notebooks],
  );

  const query = searchQuery.trim().toLowerCase();

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (sidebar.kind === 'notebook') {
      list = list.filter(n => n.notebookId === sidebar.id);
    } else if (sidebar.kind === 'folder') {
      const ids = new Set(notebooks.filter(nb => nb.folderId === sidebar.id).map(nb => nb.id));
      list = list.filter(n => ids.has(n.notebookId));
    }
    if (query) {
      list = list.filter(
        n =>
          n.title.toLowerCase().includes(query) ||
          extractPlainFromNoteContent(n.content).toLowerCase().includes(query),
      );
    }
    return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, notebooks, sidebar, query]);

  const filteredQuickNotes = useMemo(() => {
    let list = [...quickNotes].sort(
      (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
    );
    if (query) {
      list = list.filter(
        q =>
          q.title.toLowerCase().includes(query) ||
          q.content.toLowerCase().includes(query),
      );
    }
    return list;
  }, [quickNotes, query]);

  const noteListRows = useMemo(
    () =>
      filteredNotes.map(n => ({
        id: n.id,
        kind: 'note' as const,
        title: n.title || t('untitled_page'),
        preview: noteListPreview(n.content),
        sortDate: n.updatedAt,
        dateLabel: formatListDate(n.updatedAt),
      })),
    [filteredNotes, t],
  );

  const quickListRows = useMemo(
    () =>
      filteredQuickNotes.map(q => ({
        id: q.id,
        kind: 'quick' as const,
        title: q.title || t('untitled_note'),
        preview: q.content.trim() || 'No additional text',
        sortDate: q.lastUsedAt,
        dateLabel: formatListDate(q.lastUsedAt),
      })),
    [filteredQuickNotes, t],
  );

  const listRows = sidebar.kind === 'quick' ? quickListRows : noteListRows;
  const groupedList = useMemo(() => groupBySection(listRows), [listRows]);

  useEffect(() => {
    if (isMobile || activeItem) return;
    const first = listRows[0];
    if (first) setActiveItem({kind: first.kind, id: first.id});
  }, [isMobile, activeItem, listRows, sidebar.kind]);

  const selectedNote = activeItem?.kind === 'note' ? notes.find(n => n.id === activeItem.id) ?? null : null;
  const selectedQuick = activeItem?.kind === 'quick' ? quickNotes.find(q => q.id === activeItem.id) ?? null : null;

  const sidebarTitle = useMemo(() => {
    if (sidebar.kind === 'quick') return 'Quick Notes';
    if (sidebar.kind === 'all') return 'All Notes';
    if (sidebar.kind === 'notebook') {
      return notebooks.find(nb => nb.id === sidebar.id)?.title ?? 'Notes';
    }
    return folders.find(f => f.id === sidebar.id)?.title ?? 'Folder';
  }, [sidebar, notebooks, folders]);

  const noteCountForNotebook = useCallback(
    (id: string) => notes.filter(n => n.notebookId === id).length,
    [notes],
  );

  const ensureDefaultNotebook = useCallback((): string | null => {
    if (notebooks.length >= LIMITS.notebooks) return notebooks[0]?.id ?? null;
    if (notebooks.length > 0) return notebooks[0].id;
    const nb: Notebook = {
      id: crypto.randomUUID(),
      title: 'Notes',
      color: DEFAULT_NOTEBOOK_COLOR,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onNotebooksChange([nb]);
    return nb.id;
  }, [notebooks, onNotebooksChange]);

  const resolveNotebookForNewNote = (): string | null => {
    if (sidebar.kind === 'notebook') return sidebar.id;
    if (sidebar.kind === 'folder') {
      const inFolder = notebooks.filter(nb => nb.folderId === sidebar.id);
      if (inFolder[0]) return inFolder[0].id;
    }
    return ensureDefaultNotebook();
  };

  const handleCreateNote = async () => {
    const notebookId = resolveNotebookForNewNote();
    if (!notebookId) {
      alert(limitError('notebooks', LIMITS.notebooks));
      return;
    }
    const notesInNotebook = notes.filter(n => n.notebookId === notebookId).length;
    if (notesInNotebook >= LIMITS.notesPerNotebook) {
      alert(limitError('notes in this notebook', LIMITS.notesPerNotebook));
      return;
    }
    const localDraft: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      content: '',
      notebookId,
      updatedAt: new Date().toISOString(),
    };
    if (supabaseNotes) {
      try {
        const created = await supabaseNotes.createNote(notebookId, {
          title: t('untitled_page'),
          content: '',
        });
        onNotesChange([...notes, created]);
        setActiveItem({kind: 'note', id: created.id});
        if (sidebar.kind === 'quick') setSidebar({kind: 'all'});
        if (isMobile) setMobilePanel('editor');
      } catch (e) {
        console.error(e);
      }
      return;
    }
    onNotesChange([...notes, localDraft]);
    setActiveItem({kind: 'note', id: localDraft.id});
    if (sidebar.kind === 'quick') setSidebar({kind: 'all'});
    if (isMobile) setMobilePanel('editor');
  };

  const handleCreateQuickNote = () => {
    if (quickNotes.length >= LIMITS.quickNotes) {
      alert(limitError('quick notes', LIMITS.quickNotes));
      return;
    }
    const q: QuickNote = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      color: '#FFFFFF',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onQuickNotesChange([q, ...quickNotes]);
    setSidebar({kind: 'quick'});
    setActiveItem({kind: 'quick', id: q.id});
    if (isMobile) setMobilePanel('editor');
  };

  const handleUpdateNote = (noteId: string, updates: Partial<Note>) => {
    const updatedAt = new Date().toISOString();
    const nextList = notes.map(n => (n.id === noteId ? {...n, ...updates, updatedAt} : n));
    onNotesChange(nextList);
    const persisted = nextList.find(n => n.id === noteId);
    if (persisted && supabaseNotes) supabaseNotes.persistNote(persisted);
    if (persisted) {
      onNotebooksChange(
        notebooks.map(nb =>
          nb.id === persisted.notebookId ? {...nb, lastUsedAt: updatedAt} : nb,
        ),
      );
    }
  };

  const handleDeleteNote = async (noteId: string, options?: {skipConfirm?: boolean}) => {
    if (!options?.skipConfirm && !confirm(t('delete_page_confirm'))) return;
    if (supabaseNotes) {
      try {
        await supabaseNotes.deleteNote(noteId);
      } catch (e) {
        console.error(e);
        return;
      }
    }
    onNotesChange(notes.filter(n => n.id !== noteId));
    if (activeItem?.id === noteId) {
      setActiveItem(null);
      if (isMobile) setMobilePanel('list');
    }
  };

  const handleUpdateQuickNote = (noteId: string, updates: Partial<QuickNote>) => {
    const lastUsedAt = new Date().toISOString();
    onQuickNotesChange(quickNotes.map(n => (n.id === noteId ? {...n, ...updates, lastUsedAt} : n)));
  };

  const removeQuickNote = (noteId: string, options?: {skipConfirm?: boolean}) => {
    if (!options?.skipConfirm && !confirm(t('delete_note_confirm'))) return false;
    onQuickNotesChange(quickNotes.filter(n => n.id !== noteId));
    if (activeItem?.kind === 'quick' && activeItem.id === noteId) {
      setActiveItem(null);
      if (isMobile) setMobilePanel('list');
    }
    return true;
  };

  const handleDeleteQuickNote = (noteId: string) => {
    removeQuickNote(noteId);
  };

  const openRenameNotebook = (notebookId: string) => {
    const nb = notebooks.find(n => n.id === notebookId);
    if (!nb) return;
    setRenamingNotebookId(notebookId);
    setRenameNotebookTitle(nb.title);
  };

  const handleRenameNotebook = () => {
    if (!renamingNotebookId || !renameNotebookTitle.trim()) return;
    onNotebooksChange(
      notebooks.map(nb =>
        nb.id === renamingNotebookId ? {...nb, title: renameNotebookTitle.trim()} : nb,
      ),
    );
    setRenamingNotebookId(null);
    setRenameNotebookTitle('');
  };

  const openRenameFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    setRenamingFolderId(folderId);
    setRenameFolderTitle(folder.title);
  };

  const handleRenameFolder = () => {
    if (!renamingFolderId || !renameFolderTitle.trim()) return;
    onFoldersChange(
      folders.map(f =>
        f.id === renamingFolderId ? {...f, title: renameFolderTitle.trim()} : f,
      ),
    );
    setRenamingFolderId(null);
    setRenameFolderTitle('');
  };

  const handleMoveNoteToNotebook = async (note: Note, targetNotebookId: string) => {
    if (note.notebookId === targetNotebookId) return;
    const count = notes.filter(n => n.notebookId === targetNotebookId).length;
    if (count >= LIMITS.notesPerNotebook) {
      alert(limitError('notes in this notebook', LIMITS.notesPerNotebook));
      return;
    }
    const updatedAt = new Date().toISOString();
    const updated: Note = {...note, notebookId: targetNotebookId, updatedAt};
    onNotesChange(notes.map(n => (n.id === note.id ? updated : n)));
    if (supabaseNotes) supabaseNotes.persistNote(updated);
    onNotebooksChange(
      notebooks.map(nb =>
        nb.id === targetNotebookId ? {...nb, lastUsedAt: updatedAt} : nb,
      ),
    );
    setSidebar({kind: 'notebook', id: targetNotebookId});
    setActiveItem({kind: 'note', id: note.id});
    setShowMoveModal(false);
  };

  const handleMoveNoteToQuickNotes = async (note: Note) => {
    if (quickNotes.length >= LIMITS.quickNotes) {
      alert(limitError('quick notes', LIMITS.quickNotes));
      return;
    }
    const plain = noteContentToPlainFull(note.content);
    const qn: QuickNote = {
      id: crypto.randomUUID(),
      title: note.title || t('untitled_note'),
      content: plain,
      color: '#FFFFFF',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onQuickNotesChange([qn, ...quickNotes]);
    await handleDeleteNote(note.id, {skipConfirm: true});
    setSidebar({kind: 'quick'});
    setActiveItem({kind: 'quick', id: qn.id});
    setShowMoveModal(false);
  };

  const handleMoveQuickNoteToNotebook = async (qn: QuickNote, targetNotebookId: string) => {
    const count = notes.filter(n => n.notebookId === targetNotebookId).length;
    if (count >= LIMITS.notesPerNotebook) {
      alert(limitError('notes in this notebook', LIMITS.notesPerNotebook));
      return;
    }
    const title = qn.title || t('untitled_note');
    const content = plainTextToNoteHtml(qn.content);

    if (supabaseNotes) {
      try {
        const created = await supabaseNotes.createNote(targetNotebookId, {title, content});
        onNotesChange([...notes, created]);
        if (!removeQuickNote(qn.id, {skipConfirm: true})) return;
        setSidebar({kind: 'notebook', id: targetNotebookId});
        setActiveItem({kind: 'note', id: created.id});
        setShowMoveModal(false);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      content,
      notebookId: targetNotebookId,
      updatedAt: new Date().toISOString(),
    };
    onNotesChange([...notes, newNote]);
    if (!removeQuickNote(qn.id, {skipConfirm: true})) return;
    setSidebar({kind: 'notebook', id: targetNotebookId});
    setActiveItem({kind: 'note', id: newNote.id});
    setShowMoveModal(false);
  };

  const handleMoveDestination = async (destination: 'quick' | string) => {
    if (selectedNote) {
      if (destination === 'quick') {
        await handleMoveNoteToQuickNotes(selectedNote);
      } else {
        await handleMoveNoteToNotebook(selectedNote, destination);
      }
      return;
    }
    if (selectedQuick && destination !== 'quick') {
      await handleMoveQuickNoteToNotebook(selectedQuick, destination);
    }
  };

  const selectedNotebook =
    sidebar.kind === 'notebook' ? notebooks.find(nb => nb.id === sidebar.id) ?? null : null;
  const selectedFolderGroup =
    sidebar.kind === 'folder' ? folders.find(f => f.id === sidebar.id) ?? null : null;
  const canMoveActiveItem = Boolean(selectedNote || selectedQuick);

  const handleCreateFolder = () => {
    if (!newFolderTitle.trim()) return;
    const folder: FolderType = {
      id: crypto.randomUUID(),
      title: newFolderTitle.trim(),
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onFoldersChange([...folders, folder]);
    setExpandedFolders(prev => new Set([...prev, folder.id]));
    setNewFolderTitle('');
    setIsCreatingFolder(false);
  };

  const handleCreateNotebook = () => {
    if (!newNotebookTitle.trim()) return;
    if (notebooks.length >= LIMITS.notebooks) {
      alert(limitError('notebooks', LIMITS.notebooks));
      return;
    }
    const nb: Notebook = {
      id: crypto.randomUUID(),
      title: newNotebookTitle.trim(),
      color: DEFAULT_NOTEBOOK_COLOR,
      folderId: newNotebookFolderId,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    onNotebooksChange([...notebooks, nb]);
    setSidebar({kind: 'notebook', id: nb.id});
    setNewNotebookTitle('');
    setNewNotebookFolderId(undefined);
    setIsCreatingNotebook(false);
    if (isMobile) setMobilePanel('list');
  };

  const handleDeleteNotebook = (notebookId: string) => {
    if (!confirm(t('delete_notebook_confirm'))) return;
    onNotebooksChange(notebooks.filter(nb => nb.id !== notebookId));
    onNotesChange(notes.filter(n => n.notebookId !== notebookId));
    if (sidebar.kind === 'notebook' && sidebar.id === notebookId) setSidebar({kind: 'all'});
    if (activeItem?.kind === 'note' && notes.find(n => n.id === activeItem.id)?.notebookId === notebookId) {
      setActiveItem(null);
    }
  };

  const openNewNotebookModal = () => {
    let folderId: string | undefined;
    if (sidebar.kind === 'folder') {
      folderId = sidebar.id;
    } else if (sidebar.kind === 'notebook') {
      folderId = notebooks.find(nb => nb.id === sidebar.id)?.folderId;
    }
    setNewNotebookFolderId(folderId);
    setNewNotebookTitle('');
    setIsCreatingNotebook(true);
  };

  const openNewGroupModal = () => {
    setNewFolderTitle('');
    setIsCreatingFolder(true);
  };

  const selectSidebar = (next: SidebarSelection) => {
    setSidebar(next);
    setActiveItem(null);
    if (isMobile) setMobilePanel('list');
  };

  const selectListItem = (kind: 'note' | 'quick', id: string) => {
    setActiveItem({kind, id});
    if (isMobile) setMobilePanel('editor');
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const showFolderSidebarMobile = isMobile && mobilePanel === 'sidebar';
  const showNoteListMobile = isMobile && mobilePanel === 'list';
  const showEditor = !isMobile || mobilePanel === 'editor';
  const renderFolderSidebar = !isMobile || showFolderSidebarMobile;
  const renderNoteList = !isMobile || showNoteListMobile;

  const SidebarButton = ({
    active,
    onClick,
    icon,
    label,
    count,
    indent,
  }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count?: number;
    indent?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
        indent ? 'pl-8' : ''
      } ${active ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]'}`}
    >
      <span className="shrink-0 text-black/40">{icon}</span>
      <span className="flex-1 text-[14px] font-medium text-[#111827] truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[12px] text-[#9CA3AF] tabular-nums">{count}</span>
      )}
    </button>
  );

  return (
    <div className="h-full min-h-0 w-full flex overflow-hidden bg-white">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {renderFolderSidebar && (
        <motion.aside
          initial={false}
          animate={
            isMobile
              ? {width: '100%', opacity: 1}
              : {
                  width: panelsOpen ? SIDEBAR_PANEL_WIDTH : 0,
                  opacity: panelsOpen ? 1 : 0,
                }
          }
          transition={PANEL_TRANSITION}
          className="shrink-0 flex flex-col bg-white overflow-hidden border-r border-black/[0.06]"
          style={{pointerEvents: !isMobile && !panelsOpen ? 'none' : undefined}}
        >
          <div
            className="h-full min-h-0 flex flex-col"
            style={{width: isMobile ? '100%' : SIDEBAR_PANEL_WIDTH}}
          >
          <div className="px-3 pt-4 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] px-2 mb-2">
              Library
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
            <SidebarButton
              active={sidebar.kind === 'quick'}
              onClick={() => selectSidebar({kind: 'quick'})}
              icon={<StickyNote size={17} className="text-amber-500/80" />}
              label="Quick Notes"
              count={quickNotes.length}
            />
            <SidebarButton
              active={sidebar.kind === 'all'}
              onClick={() => selectSidebar({kind: 'all'})}
              icon={<FileText size={17} className="text-black/35" />}
              label="All Notes"
              count={notes.length}
            />

            {folders.length > 0 && (
              <div className="mt-3 pt-2 border-t border-black/[0.06]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] px-2 mb-1.5">
                  Groups
                </p>
            {folders.map(folder => {
              const folderNotebooks = notebooks.filter(nb => nb.folderId === folder.id);
              const expanded = expandedFolders.has(folder.id);
              const folderNoteCount = notes.filter(n =>
                folderNotebooks.some(nb => nb.id === n.notebookId),
              ).length;
              return (
                <div key={folder.id} className="mt-0.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => toggleFolder(folder.id)}
                      className="p-1 rounded-md text-[#9CA3AF] hover:bg-black/[0.04]"
                    >
                      {expanded ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectSidebar({kind: 'folder', id: folder.id})}
                      className={`flex-1 flex items-center gap-2 rounded-xl px-2 py-2 text-left min-w-0 ${
                        sidebar.kind === 'folder' && sidebar.id === folder.id
                          ? 'bg-black/[0.06]'
                          : 'hover:bg-black/[0.04]'
                      }`}
                    >
                      {expanded ? (
                        <FolderOpen size={16} className="text-black/35 shrink-0" />
                      ) : (
                        <Folder size={16} className="text-black/35 shrink-0" />
                      )}
                      <span className="flex-1 text-[14px] font-medium text-[#111827] truncate">{folder.title}</span>
                      <span className="text-[12px] text-[#9CA3AF]">{folderNoteCount}</span>
                    </button>
                  </div>
                  {expanded &&
                    folderNotebooks.map(nb => (
                      <SidebarButton
                        key={nb.id}
                        active={sidebar.kind === 'notebook' && sidebar.id === nb.id}
                        onClick={() => selectSidebar({kind: 'notebook', id: nb.id})}
                        icon={<span className="text-base leading-none">{nb.emoji ?? '📓'}</span>}
                        label={nb.title}
                        count={noteCountForNotebook(nb.id)}
                        indent
                      />
                    ))}
                </div>
              );
            })}
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-black/[0.06]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] px-2 mb-1.5">
                Notebooks
              </p>
              {unfiledNotebooks.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[12px] text-[#9CA3AF] leading-snug">
                  {notebooks.length === 0
                    ? 'Create a notebook to start writing.'
                    : 'All notebooks are inside a group.'}
                </p>
              ) : (
                unfiledNotebooks.map(nb => (
                  <SidebarButton
                    key={nb.id}
                    active={sidebar.kind === 'notebook' && sidebar.id === nb.id}
                    onClick={() => selectSidebar({kind: 'notebook', id: nb.id})}
                    icon={<span className="text-base leading-none">{nb.emoji ?? '📓'}</span>}
                    label={nb.title}
                    count={noteCountForNotebook(nb.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-black/[0.06] p-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={openNewNotebookModal}
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-white bg-[#18181b] hover:opacity-90 transition-opacity"
            >
              <BookOpen size={16} />
              New notebook
            </button>
            <button
              type="button"
              onClick={openNewGroupModal}
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#6B7280] hover:bg-black/[0.04]"
            >
              <Folder size={16} />
              New group
            </button>
          </div>
          </div>
        </motion.aside>
      )}

      {/* ── Note list ───────────────────────────────────────────────────── */}
      {renderNoteList && (
        <motion.section
          initial={false}
          animate={
            isMobile
              ? {width: '100%', opacity: 1}
              : {
                  width: panelsOpen ? LIST_PANEL_WIDTH : 0,
                  opacity: panelsOpen ? 1 : 0,
                }
          }
          transition={PANEL_TRANSITION}
          className={`shrink-0 flex flex-col bg-white min-h-0 overflow-hidden border-r border-black/[0.06] ${
            isMobile ? 'flex-1' : ''
          }`}
          style={{pointerEvents: !isMobile && !panelsOpen ? 'none' : undefined}}
        >
          <div
            className="h-full min-h-0 flex flex-col"
            style={{width: isMobile ? '100%' : LIST_PANEL_WIDTH}}
          >
          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-black/[0.06]">
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobilePanel('sidebar')}
                className="flex items-center gap-1 text-[#111827] text-[14px] font-semibold mb-2 hover:text-black/70"
              >
                <ChevronLeft size={18} />
                Library
              </button>
            )}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold text-[#111827] truncate">{sidebarTitle}</h2>
                {selectedNotebook && (
                  <button
                    type="button"
                    onClick={() => openRenameNotebook(selectedNotebook.id)}
                    className="shrink-0 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-black/[0.04] transition-colors"
                    title="Rename notebook"
                    aria-label="Rename notebook"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {selectedFolderGroup && (
                  <button
                    type="button"
                    onClick={() => openRenameFolder(selectedFolderGroup.id)}
                    className="shrink-0 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-black/[0.04] transition-colors"
                    title="Rename group"
                    aria-label="Rename group"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              <span className="text-[12px] text-[#9CA3AF] tabular-nums shrink-0">{listRows.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-black/[0.04] px-3 py-2">
              <Search size={15} className="text-black/25 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('search_notes')}
                className="flex-1 bg-transparent border-none outline-none text-[14px] placeholder:text-black/25"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
            {groupedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center py-16">
                <p className="text-[14px] text-[#6B7280]">No notes</p>
              </div>
            ) : (
              groupedList.map(section => (
                <div key={section.label}>
                  <p className="sticky top-0 z-10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] bg-white/95 backdrop-blur-sm border-b border-black/[0.05]">
                    {section.label}
                  </p>
                  {section.items.map(row => {
                    const isActive = activeItem?.kind === row.kind && activeItem.id === row.id;
                    return (
                      <button
                        key={`${row.kind}-${row.id}`}
                        type="button"
                        onClick={() => selectListItem(row.kind, row.id)}
                        className={`w-full text-left px-4 py-3 border-b border-black/[0.04] transition-colors ${
                          isActive ? 'bg-black/[0.04]' : 'hover:bg-black/[0.02]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-[#111827] truncate leading-snug">
                              {row.title}
                            </p>
                            <p className="text-[13px] text-[#6B7280] line-clamp-2 leading-snug mt-0.5">
                              {row.preview}
                            </p>
                          </div>
                          <span className="text-[11px] text-[#9CA3AF] shrink-0 pt-0.5">{row.dateLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 border-t border-black/[0.06] p-2">
            <button
              type="button"
              onClick={sidebar.kind === 'quick' ? handleCreateQuickNote : () => void handleCreateNote()}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-semibold text-white bg-[#18181b] hover:opacity-90 transition-opacity"
            >
              <SquarePen size={16} />
              {t('new_note')}
            </button>
          </div>
          </div>
        </motion.section>
      )}

      {/* ── Editor ──────────────────────────────────────────────────────── */}
      {showEditor && (
        <motion.section
          layout
          transition={PANEL_TRANSITION}
          className="flex-1 min-w-0 min-h-0 flex flex-col bg-white relative"
        >
          {/* Desktop: toggle folders + note list */}
          {!isMobile && (
            <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-black/[0.05]">
              <button
                type="button"
                onClick={() => setPanelsOpen(open => !open)}
                className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-black/[0.04] transition-colors"
                title={panelsOpen ? 'Hide folders and notes list' : 'Show folders and notes list'}
                aria-expanded={panelsOpen}
              >
                <motion.span
                  animate={{rotate: panelsOpen ? 0 : 180}}
                  transition={{duration: 0.28, ease: PANEL_TRANSITION.ease}}
                  className="inline-flex"
                >
                  {panelsOpen ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />}
                </motion.span>
                <span>{panelsOpen ? 'Hide panels' : 'Show panels'}</span>
              </button>
              <div className="flex items-center gap-1">
                {canMoveActiveItem && (
                  <button
                    type="button"
                    onClick={() => setShowMoveModal(true)}
                    className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#374151] hover:bg-black/[0.04] transition-colors"
                    title="Move to…"
                  >
                    <FolderInput size={17} />
                  </button>
                )}
                {(selectedNote || selectedQuick) && (
                  <button
                    type="button"
                    onClick={() =>
                      selectedNote
                        ? void handleDeleteNote(selectedNote.id)
                        : selectedQuick && handleDeleteQuickNote(selectedQuick.id)
                    }
                    className="p-2 rounded-xl text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
                {selectedNotebook && (
                  <button
                    type="button"
                    onClick={() => openRenameNotebook(selectedNotebook.id)}
                    className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#374151] hover:bg-black/[0.04] transition-colors"
                    title="Rename notebook"
                  >
                    <Pencil size={17} />
                  </button>
                )}
                {selectedFolderGroup && (
                  <button
                    type="button"
                    onClick={() => openRenameFolder(selectedFolderGroup.id)}
                    className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#374151] hover:bg-black/[0.04] transition-colors"
                    title="Rename group"
                  >
                    <Pencil size={17} />
                  </button>
                )}
              </div>
            </div>
          )}

          {isMobile && (
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-black/[0.06]">
              <button
                type="button"
                onClick={() => setMobilePanel('list')}
                className="flex items-center gap-1 text-[#111827] text-[14px] font-semibold"
              >
                <ChevronLeft size={18} />
                {sidebarTitle}
              </button>
              {(selectedNote || selectedQuick) && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowMoveModal(true)}
                    className="p-2 text-[#6B7280]"
                    aria-label="Move"
                  >
                    <FolderInput size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectedNote
                        ? void handleDeleteNote(selectedNote.id)
                        : selectedQuick && handleDeleteQuickNote(selectedQuick.id)
                    }
                    className="p-2 text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0">
            {selectedNote ? (
              <NoteEditor
                key={selectedNote.id}
                variant="apple"
                content={selectedNote.content}
                title={selectedNote.title}
                onTitleChange={title =>
                  handleUpdateNote(selectedNote.id, {title: title || t('untitled_page')})
                }
                titlePlaceholder="Title"
                onChange={html => handleUpdateNote(selectedNote.id, {content: html})}
                placeholder="Start writing…"
              />
            ) : selectedQuick ? (
              <div className="h-full flex flex-col" style={{backgroundColor: QUICK_NOTE_SURFACE}}>
                <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
                  <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8 min-h-full">
                    <input
                      type="text"
                      value={selectedQuick.title}
                      onChange={e =>
                        handleUpdateQuickNote(selectedQuick.id, {title: e.target.value})
                      }
                      onBlur={e => {
                        if (!e.target.value.trim()) {
                          handleUpdateQuickNote(selectedQuick.id, {title: t('untitled_note')});
                        }
                      }}
                      placeholder="Title"
                      className="w-full bg-transparent border-none outline-none text-[26px] sm:text-[30px] font-bold text-[#111827] placeholder:text-[#9CA3AF] leading-tight mb-3"
                    />
                    <textarea
                      value={selectedQuick.content}
                      onChange={e =>
                        handleUpdateQuickNote(selectedQuick.id, {content: e.target.value})
                      }
                      placeholder="Start writing…"
                      className="w-full min-h-[60vh] bg-transparent border-none outline-none resize-none text-[16px] leading-[1.55] text-[#374151] placeholder:text-[#9CA3AF]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-8 bg-white">
                <div className="w-14 h-14 rounded-2xl bg-black/[0.04] flex items-center justify-center mb-4">
                  <SquarePen size={24} className="text-[#9CA3AF]" />
                </div>
                <p className="text-[15px] font-semibold text-[#6B7280]">No note selected</p>
                <p className="text-[14px] text-[#9CA3AF] mt-1 max-w-xs">
                  Select a note from the list or create a new one.
                </p>
                <button
                  type="button"
                  onClick={sidebar.kind === 'quick' ? handleCreateQuickNote : () => void handleCreateNote()}
                  className="mt-6 px-5 py-2.5 rounded-2xl bg-[#18181b] text-white text-[14px] font-semibold"
                >
                  {t('new_note')}
                </button>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* New notebook modal */}
      {isCreatingNotebook && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setIsCreatingNotebook(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl border border-black/[0.06] shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#111827] mb-1">New notebook</h3>
            <p className="text-[13px] text-[#6B7280] mb-4 leading-snug">
              A notebook is where you write and store your notes.
            </p>
            <input
              autoFocus
              value={newNotebookTitle}
              onChange={e => setNewNotebookTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateNotebook()}
              placeholder="Notebook name"
              className="w-full rounded-xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-black/10"
            />
            {folders.length > 0 && (
              <label className="block mt-3">
                <span className="text-[12px] font-medium text-[#6B7280] mb-1.5 block">
                  Group <span className="font-normal text-[#9CA3AF]">(optional)</span>
                </span>
                <select
                  value={newNotebookFolderId ?? ''}
                  onChange={e =>
                    setNewNotebookFolderId(e.target.value ? e.target.value : undefined)
                  }
                  className="w-full rounded-xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-black/10 text-[#111827]"
                >
                  <option value="">No group</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsCreatingNotebook(false)}
                className="px-4 py-2 text-[14px] font-medium text-[#6B7280]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNotebook}
                disabled={!newNotebookTitle.trim()}
                className="px-4 py-2 rounded-2xl bg-[#18181b] text-white text-[14px] font-semibold disabled:opacity-40"
              >
                Create notebook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New group modal */}
      {isCreatingFolder && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setIsCreatingFolder(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl border border-black/[0.06] shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#111827] mb-1">New group</h3>
            <p className="text-[13px] text-[#6B7280] mb-4 leading-snug">
              A group organizes several notebooks together — like a subject or project.
            </p>
            <input
              autoFocus
              value={newFolderTitle}
              onChange={e => setNewFolderTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Group name"
              className="w-full rounded-xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-black/10"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="px-4 py-2 text-[14px] font-medium text-[#6B7280]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={!newFolderTitle.trim()}
                className="px-4 py-2 rounded-2xl bg-[#18181b] text-white text-[14px] font-semibold disabled:opacity-40"
              >
                Create group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename group modal */}
      {renamingFolderId && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => {
            setRenamingFolderId(null);
            setRenameFolderTitle('');
          }}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl border border-black/[0.06] shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#111827] mb-4">Rename group</h3>
            <input
              autoFocus
              value={renameFolderTitle}
              onChange={e => setRenameFolderTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameFolder()}
              placeholder="Group name"
              className="w-full rounded-xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-black/10"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setRenamingFolderId(null);
                  setRenameFolderTitle('');
                }}
                className="px-4 py-2 text-[14px] font-medium text-[#6B7280]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameFolder}
                disabled={!renameFolderTitle.trim()}
                className="px-4 py-2 rounded-2xl bg-[#18181b] text-white text-[14px] font-semibold disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename notebook modal */}
      {renamingNotebookId && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => {
            setRenamingNotebookId(null);
            setRenameNotebookTitle('');
          }}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl border border-black/[0.06] shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#111827] mb-4">Rename notebook</h3>
            <input
              autoFocus
              value={renameNotebookTitle}
              onChange={e => setRenameNotebookTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameNotebook()}
              placeholder="Notebook name"
              className="w-full rounded-xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-black/10"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setRenamingNotebookId(null);
                  setRenameNotebookTitle('');
                }}
                className="px-4 py-2 text-[14px] font-medium text-[#6B7280]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameNotebook}
                disabled={!renameNotebookTitle.trim()}
                className="px-4 py-2 rounded-2xl bg-[#18181b] text-white text-[14px] font-semibold disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move note modal */}
      {showMoveModal && canMoveActiveItem && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setShowMoveModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl border border-black/[0.06] shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#111827] mb-1">Move to</h3>
            <p className="text-[13px] text-[#6B7280] mb-4 truncate">
              {selectedNote?.title || selectedQuick?.title || t('untitled_note')}
            </p>
            <div className="max-h-64 overflow-y-auto -mx-1 px-1 [scrollbar-width:thin] space-y-0.5">
              {selectedNote && (
                <button
                  type="button"
                  onClick={() => void handleMoveDestination('quick')}
                  disabled={quickNotes.length >= LIMITS.quickNotes}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-black/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <StickyNote size={17} className="text-amber-500/80 shrink-0" />
                  <span className="text-[14px] font-medium text-[#111827]">Quick Notes</span>
                </button>
              )}
              {notebooks.map(nb => {
                const isCurrent = selectedNote?.notebookId === nb.id;
                const countInNb = notes.filter(n => n.notebookId === nb.id).length;
                const atLimit = countInNb >= LIMITS.notesPerNotebook && !isCurrent;
                const disabled = isCurrent || atLimit;
                return (
                  <button
                    key={nb.id}
                    type="button"
                    onClick={() => void handleMoveDestination(nb.id)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-black/[0.04]'
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{nb.emoji ?? '📁'}</span>
                    <span className="flex-1 min-w-0 text-[14px] font-medium text-[#111827] truncate">
                      {nb.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] text-[#9CA3AF] shrink-0">Current</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 text-[14px] font-medium text-[#6B7280]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
