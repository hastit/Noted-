import {CalendarPlus, ClipboardList, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';

type Mode = 'task' | 'event';

export type QuickAddSaveData = {
  title: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  notes: string;
};

type Props = {
  mode: Mode;
  onSave: (data: QuickAddSaveData) => Promise<void>;
  onClose: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function defaultStartTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (m < 30) return `${pad(h)}:30`;
  return `${pad((h + 1) % 24)}:00`;
}

function addHours(hhmm: string, hours: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function fmtDuration(start: string, end: string): string | null {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const d = (eh * 60 + em) - (sh * 60 + sm);
  if (d <= 0) return null;
  const h = Math.floor(d / 60);
  const min = d % 60;
  if (!h) return `${min}m`;
  if (!min) return `${h}h`;
  return `${h}h ${min}m`;
}

const FIELD =
  'w-full rounded-2xl border border-black/[0.06] bg-white/80 px-3.5 py-2.5 text-[13px] text-[#1e293b] outline-none transition-shadow focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80';

const FIELD_TIME =
  'w-full rounded-2xl border border-black/[0.06] bg-white/80 px-3.5 py-2.5 text-[13px] font-medium text-[#1e293b] outline-none transition-shadow focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80';

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickAddModal({mode, onSave, onClose}: Props) {
  const isTask = mode === 'task';

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toYmd(new Date()));
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(() => addHours(defaultStartTime(), 1));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useMemo(() => fmtDuration(startTime, endTime), [startTime, endTime]);

  // Keep end time at least after start when start changes
  useEffect(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      setEndTime(addHours(startTime, 1));
    }
  }, [startTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError(`Please add a ${isTask ? 'task' : 'event'} title.`);
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      setError('End time must be after start time.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({title: title.trim(), date, startTime, endTime, notes: notes.trim()});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save. Please try again.');
      setSaving(false);
    }
  };

  const Icon = isTask ? ClipboardList : CalendarPlus;

  const barGradient = isTask
    ? 'from-sky-200/70 via-violet-200/50 to-indigo-100/50'
    : 'from-violet-200/70 via-purple-200/50 to-indigo-100/50';

  const iconCls = isTask
    ? 'border-sky-100/80 bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-500'
    : 'border-indigo-100/80 bg-gradient-to-br from-indigo-50 to-violet-50/70 text-indigo-500';

  const ctaLabel = isTask ? 'Add task' : 'Add event';

  const titlePlaceholder = isTask
    ? 'e.g. Review chemistry flashcards'
    : 'e.g. Doctor appointment';

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes qa-modal-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/[0.98] shadow-[0_32px_80px_-24px_rgba(15,23,42,0.22),0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-2xl"
        style={{animation: 'qa-modal-in 220ms cubic-bezier(0.22,1,0.36,1)'}}
      >
        {/* Thin accent gradient bar */}
        <div className={`h-[3px] bg-gradient-to-r ${barGradient}`} />
        <div className="pointer-events-none absolute inset-x-0 top-[3px] h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-3.5 px-7 pb-5 pt-6">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${iconCls}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-[#0F172A]">{ctaLabel}</h2>
            <p className="mt-0.5 text-[12px] text-[#94A3B8]">
              {isTask ? 'Add a one-off task to your schedule.' : 'Schedule a one-time event.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/[0.07] bg-white/70 text-[#94A3B8] transition hover:bg-black/[0.04] hover:text-[#475569]"
          >
            <X size={13} />
          </button>
        </div>

        {/* Form body */}
        <div className="space-y-5 px-7 pb-6">

          {/* Title — large underline input */}
          <input
            className="w-full border-0 border-b-[1.5px] border-black/[0.08] bg-transparent pb-3 text-[17px] font-medium text-[#0F172A] outline-none placeholder:font-normal placeholder:text-[#CBD5E1] transition-colors focus:border-violet-300/60"
            placeholder={titlePlaceholder}
            value={title}
            onChange={e => { setTitle(e.target.value); if (error) setError(null); }}
            autoFocus
          />

          {/* Date + Time — grouped in a soft frosted surface */}
          <div className="space-y-3.5 rounded-2xl bg-black/[0.02] px-4 py-4">

            {/* Date */}
            <div>
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BFC9]">Date</p>
              <input
                type="date"
                className={FIELD}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="border-t border-black/[0.04]" />

            {/* Time */}
            <div>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BFC9]">Time</p>
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <span className="mb-1 block text-[11px] text-[#C4C9D4]">Start</span>
                  <input
                    type="time"
                    className={FIELD_TIME}
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
                <div className="mt-4 shrink-0 text-[#D1D5DB]">
                  {/* Arrow icon */}
                  <svg width="16" height="9" viewBox="0 0 16 9" fill="none" aria-hidden="true">
                    <path d="M1 4.5h14M11 1l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[11px] text-[#C4C9D4]">End</span>
                    {duration && (
                      <span className="rounded-full border border-violet-100/80 bg-violet-50/70 px-1.5 py-px text-[10px] font-medium text-violet-400">
                        {duration}
                      </span>
                    )}
                  </div>
                  <input
                    type="time"
                    className={FIELD_TIME}
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BFC9]">
              Notes{' '}
              <span className="font-normal normal-case tracking-normal text-[#D4D8E1]">— optional</span>
            </p>
            <textarea
              rows={2}
              className="w-full resize-none rounded-2xl border border-black/[0.06] bg-white/60 px-3.5 py-3 text-[13px] text-[#1e293b] outline-none transition-shadow placeholder:text-[#CBD5E1] focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80"
              placeholder="Any details or context…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-2xl bg-rose-50/80 px-3.5 py-2.5 text-[12px] text-rose-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-black/[0.04] px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-[#94A3B8] transition hover:text-[#475569]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-2xl bg-[#111827] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.16)] transition hover:bg-[#1f2937] hover:shadow-[0_4px_18px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Saving…' : ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
