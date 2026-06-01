import {Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {categorizeBlock} from '../../utils/blockCategories';
import type {RecurringColorCategory} from '../../types/recurringSchedule';

type FormSlot = {
  id: string;
  days: number[];
  startTime: string;
  endTime: string;
};

type Props = {
  onSave: (
    entries: Array<{
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      colorCategory: RecurringColorCategory;
    }>,
    metadata: {startDate: string; endDate: string | null},
  ) => Promise<void>;
};

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CATEGORY_CHIPS = [
  {label: 'Class',    cls: 'border-violet-100 bg-violet-50/80 text-violet-600 hover:bg-violet-100/70'},
  {label: 'Work',     cls: 'border-sky-100 bg-sky-50/80 text-sky-600 hover:bg-sky-100/70'},
  {label: 'Sport',    cls: 'border-emerald-100 bg-emerald-50/80 text-emerald-600 hover:bg-emerald-100/70'},
  {label: 'Gym',      cls: 'border-amber-100 bg-amber-50/80 text-amber-600 hover:bg-amber-100/70'},
  {label: 'Personal', cls: 'border-rose-100 bg-rose-50/80 text-rose-600 hover:bg-rose-100/70'},
];

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptySlot(): FormSlot {
  return {id: makeId(), days: [], startTime: '09:00', endTime: '10:00'};
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toColorCategory(title: string): RecurringColorCategory {
  const style = categorizeBlock(title);
  if (style.text === '#3730A3') return 'study';
  if (style.text === '#0E7490') return 'work';
  if (style.text === '#0369A1') return 'sport';
  if (style.text === '#BE123C') return 'personal';
  return 'default';
}

function computeDuration(start: string, end: string): string | null {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

const TIME_INPUT =
  'flex-1 rounded-2xl border border-black/[0.06] bg-white/80 px-3 py-2.5 text-[13.5px] font-medium text-[#1e293b] outline-none transition-shadow focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80';

const DATE_INPUT =
  'mt-1 w-full rounded-2xl border border-black/[0.06] bg-white/80 px-3.5 py-2.5 text-[13px] text-[#1e293b] outline-none transition-shadow focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80';

export default function ManualScheduleForm({onSave}: Props) {
  const [title, setTitle] = useState('');
  const [titleFocused, setTitleFocused] = useState(false);
  const [slots, setSlots] = useState<FormSlot[]>([createEmptySlot()]);
  const [startDate, setStartDate] = useState(() => toYmd(new Date()));
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (slotId: string, idx: number) => {
    setSlots(prev =>
      prev.map(s => {
        if (s.id !== slotId) return s;
        const active = s.days.includes(idx);
        return {
          ...s,
          days: active ? s.days.filter(d => d !== idx) : [...s.days, idx].sort((a, b) => a - b),
        };
      }),
    );
  };

  const buildEntries = () => {
    const cat = toColorCategory(title);
    const result: Array<{
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      colorCategory: RecurringColorCategory;
    }> = [];
    for (const slot of slots) {
      for (const dayOfWeek of slot.days) {
        result.push({title: title.trim(), dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, colorCategory: cat});
      }
    }
    return result;
  };

  const previewCount = useMemo(() => slots.reduce((sum, s) => sum + s.days.length, 0), [slots]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please add a routine name.');
      return;
    }
    for (const slot of slots) {
      if (slot.days.length === 0) {
        setError('Select at least one day for each time slot.');
        return;
      }
      if (slot.startTime >= slot.endTime) {
        setError('Start time must be before end time in each slot.');
        return;
      }
    }
    const entries = buildEntries();
    if (!entries.length) {
      setError('Select at least one day.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(entries, {startDate, endDate: endDate || null});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  const showChips = titleFocused || !title.trim();

  return (
    <div className="space-y-6 pb-1">

      {/* ─── Routine name ─── */}
      <div>
        <input
          className="w-full border-0 border-b-[1.5px] border-black/[0.08] bg-transparent pb-3 text-[17px] font-medium text-[#0F172A] outline-none placeholder:font-normal placeholder:text-[#CBD5E1] transition-colors focus:border-violet-300/60"
          placeholder="e.g. Maths, Work shift, Swimming…"
          value={title}
          onChange={e => { setTitle(e.target.value); if (error) setError(null); }}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => window.setTimeout(() => setTitleFocused(false), 160)}
          autoFocus
        />
        {/* Category suggestion chips */}
        <div
          className="overflow-hidden transition-all duration-200"
          style={{maxHeight: showChips ? '56px' : '0', opacity: showChips ? 1 : 0}}
        >
          <div className="flex flex-wrap gap-1.5 pt-3">
            {CATEGORY_CHIPS.map(chip => (
              <button
                key={chip.label}
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  setTitle(chip.label);
                }}
                className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-all duration-150 active:scale-[0.96] ${chip.cls}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Time slots ─── */}
      <div className="space-y-3">
        {slots.map((slot, i) => {
          const dur = computeDuration(slot.startTime, slot.endTime);
          return (
            <div
              key={slot.id}
              className="space-y-4 rounded-2xl bg-black/[0.02] p-4"
              style={i > 0 ? {animation: 'slotIn 220ms cubic-bezier(0.22,1,0.36,1)'} : undefined}
            >
              {/* Slot header */}
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BFC9]">
                  {i === 0 ? 'Repeat on' : 'Also on'}
                </p>
                {i > 0 && (
                  <button
                    type="button"
                    className="text-[11.5px] text-[#B8BFC9] transition hover:text-rose-500"
                    onClick={() => setSlots(prev => prev.filter(s => s.id !== slot.id))}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Day pills */}
              <div className="flex flex-wrap gap-1.5">
                {DAY_ABBR.map((label, idx) => {
                  const active = slot.days.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(slot.id, idx)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-medium transition-all duration-150 active:scale-[0.95] ${
                        active
                          ? 'border border-violet-500/80 bg-violet-600/90 text-white shadow-[0_2px_10px_rgba(124,58,237,0.28)]'
                          : 'border border-black/[0.08] bg-white/80 text-[#6B7280] hover:border-violet-200/70 hover:bg-violet-50/50 hover:text-violet-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Time row */}
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className={TIME_INPUT}
                  value={slot.startTime}
                  onChange={e =>
                    setSlots(prev =>
                      prev.map(s => (s.id === slot.id ? {...s, startTime: e.target.value} : s)),
                    )
                  }
                />
                <div className="shrink-0 text-[#D1D5DB]">
                  <svg width="14" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true">
                    <path d="M1 4h12M9.5 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="time"
                  className={TIME_INPUT}
                  value={slot.endTime}
                  onChange={e =>
                    setSlots(prev =>
                      prev.map(s => (s.id === slot.id ? {...s, endTime: e.target.value} : s)),
                    )
                  }
                />
                {/* Duration badge */}
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{maxWidth: dur ? '72px' : '0', opacity: dur ? 1 : 0}}
                >
                  <span className="block whitespace-nowrap rounded-full border border-violet-100/80 bg-violet-50/70 px-2.5 py-1 text-[11px] font-medium text-violet-500">
                    {dur}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add time slot — dashed pill button */}
      <button
        type="button"
        onClick={() => setSlots(prev => [...prev, createEmptySlot()])}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.08] py-3 text-[13px] text-[#B8BFC9] transition-all hover:border-violet-200/70 hover:bg-violet-50/20 hover:text-violet-500"
      >
        <Plus size={14} strokeWidth={2} />
        Add another time slot
      </button>

      <div className="border-t border-black/[0.04]" />

      {/* ─── Active period ─── */}
      <div className="space-y-3 rounded-2xl bg-black/[0.02] px-4 py-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BFC9]">Active period</p>
        <div className="flex flex-wrap gap-3">
          <label className="block min-w-[120px] flex-1">
            <span className="text-[11px] text-[#C4C9D4]">From</span>
            <input
              type="date"
              className={DATE_INPUT}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </label>
          <label className="block min-w-[120px] flex-1">
            <span className="text-[11px] text-[#C4C9D4]">
              Until{' '}
              <span className="text-[#D9DCE2]">optional</span>
            </span>
            <input
              type="date"
              className={DATE_INPUT}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <p className="text-[11px] text-[#D4D8E1]">Leave Until blank for an indefinite routine.</p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-2xl bg-rose-50/80 px-3.5 py-2.5 text-[12px] text-rose-600">{error}</p>
      )}

      {/* ─── Footer CTA ─── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[12px] text-[#C4C9D4]">
          {previewCount > 0
            ? `${previewCount} occurrence${previewCount > 1 ? 's' : ''} per week`
            : 'Select days above to continue'}
        </span>
        <button
          type="button"
          disabled={saving}
          className="rounded-2xl bg-[#111827] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.16)] transition hover:bg-[#1f2937] hover:shadow-[0_4px_18px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50"
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save routine'}
        </button>
      </div>
    </div>
  );
}
