import {useEffect, useMemo, useState} from 'react';
import type {CalendarTag, ScheduledBlock} from '../../types/scheduler';

const SLOT_PRESET_COLORS = ['#6366F1','#EC4899','#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#F97316'];

type Props = {
  block: ScheduledBlock;
  anchorRect: DOMRect;
  onClose: () => void;
  onSave: (updated: ScheduledBlock) => void;
  onDelete: (id: string) => void;
  tags?: CalendarTag[];
  onAssignTag?: (blockId: string, tagId: string | null) => void;
  onTagsChange?: (tags: CalendarTag[]) => void;
};

function toTimeValue(minutesFromMidnight: number) {
  const h = String(Math.floor(minutesFromMidnight / 60)).padStart(2, '0');
  const m = String(minutesFromMidnight % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function toMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function clampDay(minutesFromMidnight: number) {
  return Math.max(0, Math.min(24 * 60, minutesFromMidnight));
}

export default function BlockEditPopover({block, anchorRect, onClose, onSave, onDelete, tags = [], onAssignTag, onTagsChange}: Props) {
  const [title, setTitle] = useState(block.title);
  const [date, setDate] = useState(block.date);
  const [start, setStart] = useState(toTimeValue(block.startTime));
  const [end, setEnd] = useState(toTimeValue(block.endTime));
  const [duration, setDuration] = useState(block.durationMinutes);
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366F1');

  useEffect(() => {
    setTitle(block.title);
    setDate(block.date);
    setStart(toTimeValue(block.startTime));
    setEnd(toTimeValue(block.endTime));
    setDuration(block.durationMinutes);
  }, [block]);

  const position = useMemo(() => {
    const spacing = 10;
    const width = 288;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = anchorRect.right + spacing;
    if (left + width > viewportWidth - 12) left = Math.max(12, anchorRect.left - width - spacing);
    let top = anchorRect.top;
    const estimatedHeight = tags.length > 0 ? 380 : 330;
    if (top + estimatedHeight > viewportHeight - 12) top = Math.max(12, viewportHeight - estimatedHeight - 12);
    return {left, top};
  }, [anchorRect, tags.length]);

  const handleTagClick = (tagId: string) => {
    if (!onAssignTag) return;
    onAssignTag(block.id, block.tagId === tagId ? null : tagId);
  };

  const handleCreateTag = () => {
    if (!newTagName.trim() || !onTagsChange) return;
    const newTag: CalendarTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newTagName.trim(),
      color: newTagColor,
    };
    onTagsChange([...tags, newTag]);
    onAssignTag?.(block.id, newTag.id);
    setCreatingTag(false);
    setNewTagName('');
    setNewTagColor('#6366F1');
  };

  return (
    <div
      data-block-popover
      className="fixed z-[600] w-[288px] rounded-2xl border border-black/[0.08] bg-white/95 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.14)] backdrop-blur-xl ring-1 ring-black/[0.04]"
      style={{left: position.left, top: position.top}}
    >
      <div className="space-y-2.5 text-xs text-[#374151]">
        <label className="block">
          <span className="mb-1 block text-[11px] text-[#6B7280]">Title</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-2.5 py-1.5 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-[#6B7280]">Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-2.5 py-1.5 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-[#6B7280]">Start</span>
            <input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-2.5 py-1.5 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-[#6B7280]">End</span>
            <input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-2.5 py-1.5 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] text-[#6B7280]">Duration (min)</span>
          <input
            type="number"
            min={15}
            step={5}
            value={duration}
            onChange={e => setDuration(Math.max(15, Number(e.target.value) || 15))}
            className="w-full rounded-xl border border-black/[0.08] bg-white/80 px-2.5 py-1.5 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        {/* Tag picker */}
        {(tags.length > 0 || onTagsChange) && onAssignTag && (
          <div>
            <span className="mb-1.5 block text-[11px] text-[#6B7280]">Tag</span>
            <div className="flex flex-wrap gap-1.5">
              {tags.length > 0 && (
                <button
                  type="button"
                  onClick={() => onAssignTag(block.id, null)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                    !block.tagId
                      ? 'border-black/[0.2] bg-black/[0.07] text-[#374151]'
                      : 'border-black/[0.07] text-[#9CA3AF] hover:border-black/[0.15] hover:text-[#6B7280]'
                  }`}
                >
                  None
                </button>
              )}
              {tags.map(tag => {
                const isSelected = block.tagId === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagClick(tag.id)}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition"
                    style={{
                      borderColor: isSelected ? tag.color : `${tag.color}55`,
                      backgroundColor: isSelected ? `${tag.color}18` : 'transparent',
                      color: isSelected ? tag.color : '#6B7280',
                    }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{backgroundColor: tag.color, opacity: isSelected ? 1 : 0.6}} />
                    {tag.name}
                  </button>
                );
              })}
              {onTagsChange && !creatingTag && (
                <button
                  type="button"
                  onClick={() => setCreatingTag(true)}
                  className="rounded-full border border-dashed border-black/[0.15] px-2.5 py-0.5 text-[11px] text-[#9CA3AF] transition hover:border-black/[0.25] hover:text-[#6B7280]"
                >
                  + New
                </button>
              )}
            </div>
            {creatingTag && onTagsChange && (
              <div className="mt-2 rounded-xl border border-black/[0.07] bg-black/[0.025] p-2">
                <div className="mb-1.5 flex gap-1">
                  {SLOT_PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTagColor(c)}
                      className="h-[14px] w-[14px] rounded-full border border-black/[0.1] transition hover:scale-110"
                      style={{backgroundColor: c, outline: newTagColor === c ? `2px solid ${c}` : 'none', outlineOffset: 1}}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTagName.trim()) handleCreateTag();
                      if (e.key === 'Escape') { setCreatingTag(false); setNewTagName(''); }
                    }}
                    placeholder="Tag name…"
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-2 py-1 text-[11.5px] text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <button
                    type="button"
                    disabled={!newTagName.trim()}
                    onClick={handleCreateTag}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition disabled:opacity-40"
                    style={{backgroundColor: newTagColor}}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-xl px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
          onClick={() => {
            onDelete(block.id);
            onClose();
          }}
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button type="button" className="rounded-xl border border-black/[0.08] px-2.5 py-1 text-xs transition hover:bg-black/[0.04]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#18181b] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#27272a]"
            onClick={() => {
              const startTime = clampDay(toMinutes(start));
              const endTime = clampDay(toMinutes(end));
              const normalizedDuration = Math.max(15, duration);
              const normalizedEnd = endTime <= startTime ? Math.min(24 * 60, startTime + normalizedDuration) : endTime;
              const finalDuration = Math.max(15, normalizedEnd - startTime);
              onSave({
                ...block,
                title: title.trim() || block.title,
                date,
                startTime,
                endTime: normalizedEnd,
                durationMinutes: finalDuration,
              });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
