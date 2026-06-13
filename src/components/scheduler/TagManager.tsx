import {useRef, useState} from 'react';
import {Plus, Trash2, X} from 'lucide-react';
import type {CalendarTag} from '../../types/scheduler';

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#14B8A6', '#3B82F6',
  '#F97316', '#84CC16', '#06B6D4', '#A855F7',
];

type Props = {
  tags: CalendarTag[];
  onTagsChange: (tags: CalendarTag[]) => void;
  anchorRect: DOMRect;
  onClose: () => void;
};

export default function TagManager({tags, onTagsChange, anchorRect, onClose}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const pos = (() => {
    const w = 264;
    let left = anchorRect.left;
    if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12;
    let top = anchorRect.bottom + 8;
    if (top + 340 > window.innerHeight - 12) top = anchorRect.top - 340 - 8;
    return {left, top};
  })();

  const addTag = () => {
    if (!newName.trim()) return;
    const tag: CalendarTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newName.trim(),
      color: newColor,
    };
    onTagsChange([...tags, tag]);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    setCreating(false);
  };

  const deleteTag = (id: string) => {
    onTagsChange(tags.filter(t => t.id !== id));
  };

  const changeTagColor = (id: string, color: string) => {
    onTagsChange(tags.map(t => t.id === id ? {...t, color} : t));
    setEditingColorId(null);
  };

  return (
    <div
      data-tag-manager
      className="fixed z-[800] w-[264px] rounded-2xl border border-black/[0.08] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.14)] overflow-hidden"
      style={{left: pos.left, top: pos.top}}
    >
      {/* Accent bar */}
      <div className="h-[2.5px] bg-gradient-to-r from-indigo-300/80 via-violet-300/80 to-sky-300/80" />

      <div className="p-3">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">Tags</span>
          <button type="button" onClick={onClose} className="rounded-lg p-0.5 text-[#94A3B8] transition hover:bg-black/[0.05] hover:text-[#475569]">
            <X size={13} />
          </button>
        </div>

        {/* Tag list */}
        {tags.length === 0 && !creating && (
          <p className="mb-3 text-center text-[12px] text-[#B8C1D0]">No tags yet. Create one below.</p>
        )}

        <div className="mb-2 space-y-1">
          {tags.map(tag => (
            <div key={tag.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-black/[0.035]">
              {/* Color dot — click to change color */}
              <div className="relative">
                <button
                  type="button"
                  className="h-4 w-4 rounded-full border border-black/[0.12] shadow-sm transition hover:scale-110"
                  style={{backgroundColor: tag.color}}
                  onClick={() => setEditingColorId(editingColorId === tag.id ? null : tag.id)}
                />
                {/* Inline color picker */}
                {editingColorId === tag.id && (
                  <div className="absolute left-5 top-0 z-10 rounded-xl border border-black/[0.08] bg-white p-2 shadow-lg">
                    <div className="grid grid-cols-4 gap-1">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className="h-5 w-5 rounded-full border border-black/[0.1] transition hover:scale-110"
                          style={{backgroundColor: c, outline: tag.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2}}
                          onClick={() => changeTagColor(tag.id, c)}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={tag.color}
                      onChange={e => changeTagColor(tag.id, e.target.value)}
                      className="mt-1.5 h-6 w-full cursor-pointer rounded-lg border border-black/[0.08]"
                    />
                  </div>
                )}
              </div>

              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#1E293B]">{tag.name}</span>

              <button
                type="button"
                className="shrink-0 rounded-lg p-1 text-[#CBD5E1] opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                onClick={() => deleteTag(tag.id)}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Create form */}
        {creating ? (
          <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-2.5">
            {/* Color swatches */}
            <div className="mb-2 grid grid-cols-6 gap-1">
              {PRESET_COLORS.slice(0, 12).map(c => (
                <button
                  key={c}
                  type="button"
                  className="h-5 w-5 rounded-full border border-black/[0.1] transition hover:scale-110"
                  style={{backgroundColor: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2}}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            {/* Custom color */}
            <div className="mb-2 flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="h-6 w-8 cursor-pointer rounded-lg border border-black/[0.08]"
              />
              <span className="text-[10.5px] text-[#94A3B8]">Custom color</span>
            </div>
            {/* Name */}
            <input
              ref={nameInputRef}
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addTag();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              placeholder="Tag name…"
              autoFocus
              className="mb-2 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[12.5px] text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 transition"
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(''); }}
                className="flex-1 rounded-lg border border-black/[0.08] py-1.5 text-[11.5px] font-medium text-[#6B7280] transition hover:bg-black/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newName.trim()}
                onClick={addTag}
                className="flex-1 rounded-lg py-1.5 text-[11.5px] font-semibold text-white transition disabled:opacity-40"
                style={{backgroundColor: newColor}}
              >
                Add tag
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setCreating(true); setTimeout(() => nameInputRef.current?.focus(), 30); }}
            className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-[12px] font-medium text-[#6B7280] transition hover:bg-black/[0.04] hover:text-[#374151]"
          >
            <Plus size={13} />
            New tag
          </button>
        )}
      </div>
    </div>
  );
}
