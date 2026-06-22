import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import ResizableImage from 'tiptap-extension-resize-image';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, ListTodo,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Image as ImageIcon,
  Undo2, Redo2, Highlighter, ChevronDown, Trash2,
} from 'lucide-react';

// ─── Old block format → HTML converter ──────────────────────────────────────

type LegacyBlock = {
  id: string;
  type: 'h1' | 'h2' | 'h3' | 'text' | 'image' | 'bullet' | 'number' | 'todo' | 'toggle';
  content: string;
  checked?: boolean;
  isOpen?: boolean;
};

function legacyBlocksToHtml(blocks: LegacyBlock[]): string {
  const parts: string[] = [];
  let inBullet = false;
  let inNumber = false;
  let inTodo = false;

  const closeLists = () => {
    if (inBullet) { parts.push('</ul>'); inBullet = false; }
    if (inNumber) { parts.push('</ol>'); inNumber = false; }
    if (inTodo) { parts.push('</ul>'); inTodo = false; }
  };

  for (const block of blocks) {
    if (block.type !== 'bullet' && inBullet) { parts.push('</ul>'); inBullet = false; }
    if (block.type !== 'number' && inNumber) { parts.push('</ol>'); inNumber = false; }
    if (block.type !== 'todo' && inTodo) { parts.push('</ul>'); inTodo = false; }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    switch (block.type) {
      case 'h1': parts.push(`<h1>${esc(block.content)}</h1>`); break;
      case 'h2': parts.push(`<h2>${esc(block.content)}</h2>`); break;
      case 'h3': parts.push(`<h3>${esc(block.content)}</h3>`); break;
      case 'text': parts.push(`<p>${esc(block.content) || '<br>'}</p>`); break;
      case 'bullet':
        if (!inBullet) { parts.push('<ul>'); inBullet = true; }
        parts.push(`<li>${esc(block.content)}</li>`);
        break;
      case 'number':
        if (!inNumber) { parts.push('<ol>'); inNumber = true; }
        parts.push(`<li>${esc(block.content)}</li>`);
        break;
      case 'todo':
        if (!inTodo) { parts.push('<ul data-type="taskList">'); inTodo = true; }
        parts.push(`<li data-type="taskItem" data-checked="${block.checked ? 'true' : 'false'}">${esc(block.content)}</li>`);
        break;
      case 'image':
        closeLists();
        parts.push(`<img src="${block.content}" />`);
        break;
      case 'toggle':
        parts.push(`<p><strong>${esc(block.content)}</strong></p>`);
        break;
    }
  }
  closeLists();
  return parts.join('');
}

function parseContent(raw: string): string {
  if (!raw || raw.trim() === '') return '';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return legacyBlocksToHtml(parsed as LegacyBlock[]);
  } catch {
    // Already plain HTML (or legacy plain text)
    if (!raw.trim().startsWith('<')) return `<p>${raw}</p>`;
  }
  return raw;
}

// ─── Toolbar helpers ─────────────────────────────────────────────────────────

type TBtn = {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function TBtn({ title, active, disabled, onClick, children }: TBtn) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`flex items-center justify-center w-7 h-7 rounded transition-all text-[13px] ${
        active
          ? 'bg-black/[0.09] text-black'
          : 'text-black/45 hover:bg-black/[0.05] hover:text-black/75'
      } ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-black/[0.09] mx-0.5 shrink-0" />;
}

// ─── Heading dropdown ────────────────────────────────────────────────────────

const HEADING_LABELS: Record<string, string> = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', p: 'Normal text',
};

function HeadingDropdown({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!editor) return null;

  const current =
    editor.isActive('heading', { level: 1 }) ? 'h1'
    : editor.isActive('heading', { level: 2 }) ? 'h2'
    : editor.isActive('heading', { level: 3 }) ? 'h3'
    : 'p';

  const options = [
    { key: 'p', label: 'Normal text', className: 'text-[13px]', action: () => editor.chain().focus().setParagraph().run() },
    { key: 'h1', label: 'Heading 1', className: 'text-[22px] font-bold', action: () => editor.chain().focus().setHeading({ level: 1 }).run() },
    { key: 'h2', label: 'Heading 2', className: 'text-[18px] font-bold', action: () => editor.chain().focus().setHeading({ level: 2 }).run() },
    { key: 'h3', label: 'Heading 3', className: 'text-[15px] font-semibold', action: () => editor.chain().focus().setHeading({ level: 3 }).run() },
  ];

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onMouseDown={handleOpen}
        className="flex items-center gap-1 h-7 px-2 rounded text-[12px] font-medium text-black/60 hover:bg-black/[0.05] hover:text-black/80 transition-all min-w-[108px] justify-between"
      >
        <span>{HEADING_LABELS[current]}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={ref}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="w-44 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.14)] border border-black/[0.06] py-1"
        >
          {options.map(opt => (
            <button
              key={opt.key}
              type="button"
              onMouseDown={e => { e.preventDefault(); opt.action(); setOpen(false); }}
              className={`w-full text-left px-3 py-2 hover:bg-black/[0.04] transition-colors ${opt.className} ${current === opt.key ? 'text-black' : 'text-black/70'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Color picker ────────────────────────────────────────────────────────────

const TEXT_COLORS = ['#000000', '#374151', '#6B7280', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];
const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FDE68A', '#FECACA', '#E9D5FF', '#FBCFE8'];

function ColorMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        wrapRef.current && !wrapRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!editor) return null;

  const handleOpen = () => {
    if (!open && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={wrapRef} className="relative">
      <TBtn title="Text color / Highlight" active={open} onClick={handleOpen}>
        <Highlighter size={13} />
      </TBtn>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.14)] border border-black/[0.06] p-3 min-w-[188px]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-black/30 mb-2">Text color</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TEXT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setOpen(false); }}
                className="w-5 h-5 rounded-full border border-black/[0.08] hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-black/30 mb-2">Highlight</p>
          <div className="flex flex-wrap gap-1.5">
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: c }).run(); setOpen(false); }}
                className="w-5 h-5 rounded border border-black/[0.08] hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setOpen(false); }}
              className="w-5 h-5 rounded border border-black/[0.08] hover:scale-110 transition-transform bg-white text-[8px] text-black/40 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Main editor ─────────────────────────────────────────────────────────────

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  onDelete?: () => void;
  placeholder?: string;
  /** Apple Notes–style continuous page (no toolbar, title inline) */
  variant?: 'default' | 'apple';
  title?: string;
  onTitleChange?: (title: string) => void;
  titlePlaceholder?: string;
  /** Yellow pad for quick notes */
  surface?: 'default' | 'quick';
}

export default function NoteEditor({
  content,
  onChange,
  onDelete,
  placeholder,
  variant = 'default',
  title,
  onTitleChange,
  titlePlaceholder = 'Title',
  surface = 'default',
}: NoteEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialHtml = parseContent(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
      TextStyle,
      Color,
      ResizableImage.configure({ allowBase64: true }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'note-editor-content focus:outline-none',
        spellcheck: 'true',
      },
    },
  });

  // Keep editor in sync if a different note is selected
  const prevContent = useRef(content);
  useEffect(() => {
    if (!editor || content === prevContent.current) return;
    prevContent.current = content;
    const html = parseContent(content);
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html);
    }
  }, [content, editor]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const editorStyles = `
    .note-editor-content h1 { font-size: 1.75rem; font-weight: 700; line-height: 1.25; margin-bottom: 0.5rem; margin-top: 1.25rem; color: #111827; }
    .note-editor-content h2 { font-size: 1.375rem; font-weight: 700; line-height: 1.3; margin-bottom: 0.4rem; margin-top: 1rem; color: #111827; }
    .note-editor-content h3 { font-size: 1.125rem; font-weight: 600; line-height: 1.35; margin-bottom: 0.35rem; margin-top: 0.75rem; color: #111827; }
    .note-editor-content p { font-size: 1.0625rem; line-height: 1.55; color: #374151; margin-bottom: 0.2rem; }
    .note-editor-content p.is-editor-empty:first-child::before { color: #9CA3AF; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
    .note-editor-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
    .note-editor-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
    .note-editor-content li { font-size: 1.0625rem; line-height: 1.55; color: #1C1C1E; margin-bottom: 0.1rem; }
    .note-editor-content ul[data-type="taskList"] { list-style: none; padding-left: 0.25rem; }
    .note-editor-content ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.6rem; }
    .note-editor-content ul[data-type="taskList"] li > label { margin-top: 0.3rem; flex-shrink: 0; }
    .note-editor-content ul[data-type="taskList"] li > label input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: #FF9500; }
    .note-editor-content ul[data-type="taskList"] li > div { flex: 1; min-width: 0; }
    .note-editor-content ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; opacity: 0.45; }
    .note-editor-content strong { font-weight: 700; }
    .note-editor-content em { font-style: italic; }
    .note-editor-content u { text-decoration: underline; }
    .note-editor-content s { text-decoration: line-through; }
    .note-editor-content a { color: #111827; text-decoration: underline; cursor: pointer; }
    .note-editor-content mark { border-radius: 2px; padding: 0 2px; }
    .note-editor-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5rem 0; display: block; }
    .note-editor-content img.ProseMirror-selectednode { outline: 2px solid #007AFF; border-radius: 8px; }
    .note-editor-content blockquote { border-left: 3px solid #E5E5EA; margin: 0.5rem 0; padding-left: 1rem; color: #8E8E93; font-style: italic; }
    .note-editor-content code { background: #F2F2F7; border-radius: 4px; padding: 2px 5px; font-size: 0.9rem; font-family: ui-monospace, monospace; }
    .note-editor-content pre { background: #1C1C1E; color: #F2F2F7; border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 0.75rem 0; }
    .note-editor-content pre code { background: none; color: inherit; padding: 0; }
    .note-editor-content hr { border: none; border-top: 1px solid #E5E5EA; margin: 1.25rem 0; }
    .note-editor-content .image-resizer { display: inline-block; position: relative; }
    .note-editor-content .image-resizer__handle { position: absolute; background: white; border: 1.5px solid #007AFF; border-radius: 2px; width: 8px; height: 8px; }
  `;

  if (variant === 'apple') {
    const bg = surface === 'quick' ? '#FFFBEB' : '#FFFFFF';
    return (
      <div className="flex flex-col h-full min-h-0" style={{backgroundColor: bg}}>
        <style>{editorStyles}</style>
        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8 min-h-full">
            {onTitleChange && (
              <input
                type="text"
                value={title ?? ''}
                onChange={e => onTitleChange(e.target.value)}
                placeholder={titlePlaceholder}
                className="w-full bg-transparent border-none outline-none text-[26px] sm:text-[30px] font-bold text-[#111827] placeholder:text-[#9CA3AF] leading-tight mb-3"
              />
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-black/[0.06] bg-white px-3 py-1.5 flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] flex-wrap">
        {/* Undo / Redo */}
        <TBtn title="Undo (⌘Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={13} />
        </TBtn>
        <TBtn title="Redo (⌘⇧Z)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={13} />
        </TBtn>

        <Divider />

        {/* Heading */}
        <HeadingDropdown editor={editor} />

        <Divider />

        {/* Inline formatting */}
        <TBtn title="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={13} />
        </TBtn>
        <TBtn title="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={13} />
        </TBtn>
        <TBtn title="Underline (⌘U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={13} />
        </TBtn>
        <TBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={13} />
        </TBtn>

        <ColorMenu editor={editor} />

        <Divider />

        {/* Alignment */}
        <TBtn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={13} />
        </TBtn>
        <TBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={13} />
        </TBtn>
        <TBtn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={13} />
        </TBtn>
        <TBtn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={13} />
        </TBtn>

        <Divider />

        {/* Lists */}
        <TBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={13} />
        </TBtn>
        <TBtn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={13} />
        </TBtn>
        <TBtn title="Task list" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListTodo size={13} />
        </TBtn>

        <Divider />

        {/* Link & image */}
        <TBtn title="Link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon size={13} />
        </TBtn>
        <TBtn title="Insert image" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={13} />
        </TBtn>

        {onDelete && (
          <>
            <div className="flex-1" />
            <TBtn title="Delete page" onClick={onDelete}>
              <Trash2 size={13} className="text-black/25 hover:text-red-400" />
            </TBtn>
          </>
        )}
      </div>

      {/* Editor body — Google-Docs page feel */}
      <div className="flex-1 overflow-y-auto bg-[#F0EEEB] px-4 py-8 [scrollbar-width:thin]">
        <div className="max-w-[816px] min-h-full mx-auto bg-white shadow-[0_1px_4px_rgba(0,0,0,0.10),0_4px_16px_rgba(0,0,0,0.06)] px-[96px] py-[80px] max-md:px-8 max-md:py-10 rounded-sm">
          <style>{editorStyles}</style>
          <EditorContent editor={editor} />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
