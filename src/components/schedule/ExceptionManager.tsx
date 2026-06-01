import {ArrowLeft, CalendarMinus2, PencilLine} from 'lucide-react';
import {useMemo, useState} from 'react';
import type {RecurringScheduleBlock, RecurringScheduleException} from '../../types/recurringSchedule';

type AdjustChoice = null | 'break' | 'modify';

type Props = {
  blocks: RecurringScheduleBlock[];
  exceptions: RecurringScheduleException[];
  onAddBreak: (startDate: string, endDate: string, blockIds: string[]) => Promise<void>;
  onDeleteException: (id: string) => Promise<void>;
  onModifyOccurrence: (payload: {
    recurringBlockId: string;
    exceptionDate: string;
    startTime: string;
    endTime: string;
    title?: string;
  }) => Promise<void>;
};

const INPUT =
  'mt-1 w-full rounded-xl border border-black/[0.08] bg-white/80 px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-rose-200/70 focus:ring-2 focus:ring-rose-50/80 placeholder:text-[#9CA3AF]';

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const ADJUST_CHOICES = [
  {
    id: 'break' as const,
    Icon: CalendarMinus2,
    title: 'Add a break',
    description: 'Pause recurring routines between two dates.',
    example: 'Use for holidays, sick days, travel, or exam week.',
  },
  {
    id: 'modify' as const,
    Icon: PencilLine,
    title: 'Change one occurrence',
    description: 'Edit one routine event for one day only.',
    example: 'Your full routine stays the same.',
  },
];

export default function ExceptionManager({
  blocks,
  exceptions,
  onAddBreak,
  onDeleteException,
  onModifyOccurrence,
}: Props) {
  const [adjustChoice, setAdjustChoice] = useState<AdjustChoice>(null);
  const [startDate, setStartDate] = useState(() => toYmd(new Date()));
  const [endDate, setEndDate] = useState(() => toYmd(new Date()));
  const [modifyDate, setModifyDate] = useState(() => toYmd(new Date()));
  const [modifyBlockId, setModifyBlockId] = useState('');
  const [modifyStart, setModifyStart] = useState('09:00');
  const [modifyEnd, setModifyEnd] = useState('10:00');
  const [modifyTitle, setModifyTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockById = useMemo(() => new Map(blocks.map(b => [b.id, b])), [blocks]);

  const goBack = () => {
    setAdjustChoice(null);
    setError(null);
  };

  return (
    <div className="space-y-7">

      {/* Choice step or form */}
      {adjustChoice === null ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-[15px] font-semibold text-[#111827]">Adjust your schedule</h3>
            <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
              Pause routines or change one occurrence without rebuilding everything.
            </p>
          </div>
          <div className="space-y-2.5">
            {ADJUST_CHOICES.map(({id, Icon, title, description, example}) => (
              <button
                key={id}
                type="button"
                onClick={() => setAdjustChoice(id)}
                className="group w-full rounded-2xl border border-black/[0.06] bg-white/60 p-4 text-left transition hover:border-black/[0.1] hover:bg-white/90 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-white text-[#6B7280] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#111827]">{title}</div>
                    <div className="mt-0.5 text-[12.5px] text-[#6B7280]">{description}</div>
                    <div className="mt-1 text-[11.5px] text-[#9CA3AF]">{example}</div>
                  </div>
                  <span className="ml-auto shrink-0 text-[20px] leading-none text-[#CBD5E1] transition group-hover:text-[#9CA3AF]">›</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="mb-5 flex items-center gap-1.5 text-[13px] text-[#9CA3AF] transition hover:text-[#374151]"
            onClick={goBack}
          >
            <ArrowLeft size={14} />
            Back
          </button>

          {/* ── BREAK FORM ── */}
          {adjustChoice === 'break' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[#111827]">Add a break</h3>
                <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
                  Pause all recurring routines between the dates you choose.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">From</span>
                  <input className={INPUT} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">To</span>
                  <input className={INPUT} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </label>
              </div>

              {blocks.length === 0 && (
                <p className="rounded-xl bg-amber-50/80 px-3 py-2 text-[12.5px] text-amber-700">
                  Add routines first before creating a break.
                </p>
              )}

              {error && <p className="rounded-xl bg-rose-50/80 px-3 py-2 text-xs text-rose-700">{error}</p>}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-[13px] text-[#9CA3AF] transition hover:text-[#374151]"
                  onClick={goBack}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || blocks.length === 0}
                  className="rounded-2xl bg-[#18181b] px-5 py-2 text-[13px] font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await onAddBreak(startDate, endDate, blocks.map(b => b.id));
                      goBack();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to add break.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving...' : 'Add break'}
                </button>
              </div>
            </div>
          )}

          {/* ── MODIFY FORM ── */}
          {adjustChoice === 'modify' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[#111827]">Change one occurrence</h3>
                <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
                  This only changes one occurrence. Your full routine stays the same.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                    Select recurring event
                  </span>
                  <select
                    className={INPUT}
                    value={modifyBlockId}
                    onChange={e => setModifyBlockId(e.target.value)}
                  >
                    <option value="">Choose a recurring event...</option>
                    {blocks.map(block => (
                      <option key={block.id} value={block.id}>
                        {block.title} · {block.startTime}–{block.endTime}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">Date</span>
                  <input
                    className={INPUT}
                    type="date"
                    value={modifyDate}
                    onChange={e => setModifyDate(e.target.value)}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                      New start time (optional)
                    </span>
                    <input
                      className={INPUT}
                      type="time"
                      value={modifyStart}
                      onChange={e => setModifyStart(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                      New end time (optional)
                    </span>
                    <input
                      className={INPUT}
                      type="time"
                      value={modifyEnd}
                      onChange={e => setModifyEnd(e.target.value)}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                    New title (optional)
                  </span>
                  <input
                    className={INPUT}
                    value={modifyTitle}
                    onChange={e => setModifyTitle(e.target.value)}
                    placeholder="Leave blank to keep the original title"
                  />
                </label>
              </div>

              {error && <p className="rounded-xl bg-rose-50/80 px-3 py-2 text-xs text-rose-700">{error}</p>}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-[13px] text-[#9CA3AF] transition hover:text-[#374151]"
                  onClick={goBack}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !modifyBlockId}
                  className="rounded-2xl bg-[#18181b] px-5 py-2 text-[13px] font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
                  onClick={async () => {
                    if (!modifyBlockId) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await onModifyOccurrence({
                        recurringBlockId: modifyBlockId,
                        exceptionDate: modifyDate,
                        startTime: modifyStart,
                        endTime: modifyEnd,
                        title: modifyTitle.trim() || undefined,
                      });
                      setModifyTitle('');
                      goBack();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to save change.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving...' : 'Save change'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active changes — always shown if any exist */}
      {exceptions.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="text-[14px] font-semibold text-[#111827]">Active changes</h3>
            <p className="mt-0.5 text-[12px] text-[#9CA3AF]">Your current breaks and one-off modifications.</p>
          </div>
          <div className="space-y-2">
            {exceptions.map(change => {
              const block = blockById.get(change.recurringBlockId);
              const title = block?.title ?? 'Recurring event';
              const defaultTime = block ? `${block.startTime}–${block.endTime}` : null;
              const changedTime =
                change.modifiedStartTime || change.modifiedEndTime
                  ? `${change.modifiedStartTime ?? block?.startTime ?? '--:--'}–${change.modifiedEndTime ?? block?.endTime ?? '--:--'}`
                  : null;
              const summary =
                change.type === 'skip'
                  ? `Paused for ${title}`
                  : [
                      change.modifiedTitle ? `Title: ${change.modifiedTitle}` : null,
                      changedTime && changedTime !== defaultTime ? `Time: ${changedTime}` : null,
                      !change.modifiedTitle && !changedTime ? `Updated ${title}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');

              return (
                <div
                  key={change.id}
                  className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white/60 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                          change.type === 'skip'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {change.type === 'skip' ? 'Break' : 'Modified'}
                      </span>
                      <span className="text-[12px] text-[#6B7280]">{formatDateLabel(change.exceptionDate)}</span>
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-[#111827]">{title}</div>
                    <div className="text-[11.5px] text-[#9CA3AF]">{summary}</div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-xl px-2.5 py-1 text-[11.5px] text-rose-500 transition hover:bg-rose-50"
                    onClick={() => void onDeleteException(change.id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {exceptions.length === 0 && adjustChoice === null && (
        <p className="text-[12.5px] text-[#9CA3AF]">No active changes yet.</p>
      )}
    </div>
  );
}
