import {CalendarPlus, Clock, Trash2, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import type {ScheduledBlock} from '../../types/scheduler';

export type EventSaveData = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
};

type Props = {
  items: ScheduledBlock[];
  onAdd: (data: EventSaveData) => Promise<void>;
  onDelete: (id: string) => void;
  onClose: () => void;
};

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function defaultStart() {
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
  const d = eh * 60 + em - (sh * 60 + sm);
  if (d <= 0) return null;
  const h = Math.floor(d / 60);
  const min = d % 60;
  if (!h) return `${min}m`;
  if (!min) return `${h}h`;
  return `${h}h ${min}m`;
}

function fmtTimeRange(startMin: number, durationMin: number): string {
  const fmt = (total: number) => {
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad(m)} ${suffix}`;
  };
  return `${fmt(startMin)} – ${fmt(startMin + durationMin)}`;
}

function fmtDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const today = toYmd(new Date());
  const tomorrow = toYmd(new Date(Date.now() + 86_400_000));
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
}

const FIELD =
  'w-full rounded-xl border border-black/[0.07] bg-white/80 px-3 py-2 text-[13px] text-[#1e293b] outline-none transition-shadow focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80';

export default function ManageEventsModal({items, onAdd, onDelete, onClose}: Props) {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toYmd(new Date()));
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(() => addHours(defaultStart(), 1));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useMemo(() => fmtDuration(startTime, endTime), [startTime, endTime]);

  useEffect(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) setEndTime(addHours(startTime, 1));
  }, [startTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'add') setView('list');
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, view]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter an event title.');
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
      await onAdd({title: title.trim(), date, startTime, endTime, notes: notes.trim()});
      setTitle('');
      setDate(toYmd(new Date()));
      const s = defaultStart();
      setStartTime(s);
      setEndTime(addHours(s, 1));
      setNotes('');
      setView('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save. Please try again.');
      setSaving(false);
    }
  };

  const sortedItems = useMemo(
    () =>
      [...items]
        .filter(it => !it.id.startsWith('rec__'))
        .sort((a, b) => (a.date === b.date ? a.startTime - b.startTime : a.date.localeCompare(b.date))),
    [items],
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes me-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/[0.98] shadow-[0_32px_80px_-24px_rgba(15,23,42,0.22),0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-2xl"
        style={{animation: 'me-in 220ms cubic-bezier(0.22,1,0.36,1)', maxHeight: 'min(680px,calc(100vh - 2rem))'}}
      >
        {/* Accent bar */}
        <div className="h-[3px] shrink-0 bg-gradient-to-r from-violet-200/80 via-indigo-200/70 to-sky-200/60" />
        <div className="pointer-events-none absolute inset-x-0 top-[3px] h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-6 pb-4 pt-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50 to-indigo-50/70 text-violet-500 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <CalendarPlus size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-[#0F172A]">
              {view === 'add' ? 'Add event' : 'Manage events'}
            </h2>
            <p className="mt-0.5 text-[12px] text-[#94A3B8]">
              {view === 'add'
                ? 'Schedule a one-time event.'
                : `${sortedItems.length} event${sortedItems.length !== 1 ? 's' : ''} scheduled`}
            </p>
          </div>
          <button
            type="button"
            aria-label={view === 'add' ? 'Back to list' : 'Close'}
            onClick={view === 'add' ? () => setView('list') : onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/[0.07] bg-white/70 text-[#94A3B8] transition hover:bg-black/[0.04] hover:text-[#475569]"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6">
              {sortedItems.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.06] bg-black/[0.025] text-[#CBD5E1]">
                    <CalendarPlus size={20} />
                  </div>
                  <p className="text-[13.5px] font-medium text-[#374151]">No events yet</p>
                  <p className="mt-1 text-[12px] text-[#9CA3AF]">Add your first event to get started.</p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {sortedItems.map(item => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-black/[0.015] px-3.5 py-3 transition-colors hover:bg-black/[0.03]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#111827]">{item.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#9CA3AF]">
                          <span>{fmtDate(item.date)}</span>
                          <span aria-hidden>·</span>
                          <Clock size={10} className="shrink-0" aria-hidden />
                          <span>{fmtTimeRange(item.startTime, item.durationMinutes)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => onDelete(item.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#CBD5E1] opacity-0 transition-all hover:bg-rose-50 hover:text-rose-400 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-black/[0.04] px-6 py-4">
              <button
                type="button"
                onClick={() => setView('add')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.16)] transition hover:bg-[#1f2937] hover:shadow-[0_4px_18px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              >
                <CalendarPlus size={14} />
                Add event
              </button>
            </div>
          </>
        )}

        {/* ── ADD FORM VIEW ── */}
        {view === 'add' && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 px-6 pb-4">
                <input
                  className="w-full border-0 border-b-[1.5px] border-black/[0.08] bg-transparent pb-3 text-[17px] font-medium text-[#0F172A] outline-none placeholder:font-normal placeholder:text-[#CBD5E1] transition-colors focus:border-violet-300/60"
                  placeholder="e.g. Doctor appointment"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                />

                <div className="space-y-3 rounded-2xl bg-black/[0.02] px-4 py-4">
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BFC9]">Date</p>
                    <input type="date" className={FIELD} value={date} onChange={e => setDate(e.target.value)} />
                  </div>

                  <div className="border-t border-black/[0.04]" />

                  <div>
                    <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-[#B8BFC9]">Time</p>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 block text-[11px] text-[#C4C9D4]">Start</span>
                        <input
                          type="time"
                          className={FIELD}
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="mt-4 shrink-0 text-[#D1D5DB]">
                        <svg width="16" height="9" viewBox="0 0 16 9" fill="none" aria-hidden="true">
                          <path
                            d="M1 4.5h14M11 1l4 3.5-4 3.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
                          className={FIELD}
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

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

                {error && (
                  <p className="rounded-2xl bg-rose-50/80 px-3.5 py-2.5 text-[12px] text-rose-600">{error}</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-black/[0.04] px-6 py-4">
              <button
                type="button"
                onClick={() => setView('list')}
                className="text-[13px] text-[#94A3B8] transition hover:text-[#475569]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-2xl bg-[#111827] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.16)] transition hover:bg-[#1f2937] hover:shadow-[0_4px_18px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add event'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
