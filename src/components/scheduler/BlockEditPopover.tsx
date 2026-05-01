import {useEffect, useMemo, useState} from 'react';
import type {ScheduledBlock} from '../../types/scheduler';

type Props = {
  block: ScheduledBlock;
  anchorRect: DOMRect;
  onClose: () => void;
  onSave: (updated: ScheduledBlock) => void;
  onDelete: (id: string) => void;
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

export default function BlockEditPopover({block, anchorRect, onClose, onSave, onDelete}: Props) {
  const [title, setTitle] = useState(block.title);
  const [date, setDate] = useState(block.date);
  const [start, setStart] = useState(toTimeValue(block.startTime));
  const [end, setEnd] = useState(toTimeValue(block.endTime));
  const [duration, setDuration] = useState(block.durationMinutes);

  useEffect(() => {
    setTitle(block.title);
    setDate(block.date);
    setStart(toTimeValue(block.startTime));
    setEnd(toTimeValue(block.endTime));
    setDuration(block.durationMinutes);
  }, [block]);

  const position = useMemo(() => {
    const spacing = 10;
    const width = 280;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = anchorRect.right + spacing;
    if (left + width > viewportWidth - 12) left = Math.max(12, anchorRect.left - width - spacing);
    let top = anchorRect.top;
    if (top + 320 > viewportHeight - 12) top = Math.max(12, viewportHeight - 332);
    return {left, top};
  }, [anchorRect]);

  return (
    <div
      data-block-popover
      className="fixed z-[600] w-[280px] rounded-xl border border-black/15 bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]"
      style={{left: position.left, top: position.top}}
    >
      <div className="space-y-2.5 text-xs text-[#374151]">
        <label className="block">
          <span className="mb-1 block text-[11px] text-[#6B7280]">Title</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 outline-none focus:border-[#93C5FD]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-[#6B7280]">Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 outline-none focus:border-[#93C5FD]"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-[#6B7280]">Start</span>
            <input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 outline-none focus:border-[#93C5FD]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-[#6B7280]">End</span>
            <input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 outline-none focus:border-[#93C5FD]"
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
            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 outline-none focus:border-[#93C5FD]"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
          onClick={() => {
            onDelete(block.id);
            onClose();
          }}
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button type="button" className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white"
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
