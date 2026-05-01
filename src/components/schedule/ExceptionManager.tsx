import {CalendarMinus2, PencilLine} from 'lucide-react';
import {useState} from 'react';
import type {RecurringScheduleBlock, RecurringScheduleException} from '../../types/recurringSchedule';

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

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ExceptionManager({blocks, exceptions, onAddBreak, onDeleteException, onModifyOccurrence}: Props) {
  const [startDate, setStartDate] = useState(() => toYmd(new Date()));
  const [endDate, setEndDate] = useState(() => toYmd(new Date()));
  const [modifyDate, setModifyDate] = useState(() => toYmd(new Date()));
  const [modifyBlockId, setModifyBlockId] = useState('');
  const [modifyStart, setModifyStart] = useState('09:00');
  const [modifyEnd, setModifyEnd] = useState('10:00');
  const [modifyTitle, setModifyTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]';

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#4B5563]">Need to skip a class for a holiday? Adjust a single day? Add exceptions here.</p>

      <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <div className="flex items-center gap-2 text-[#111827]">
          <CalendarMinus2 size={16} />
          <h3 className="text-sm font-semibold">Add a break</h3>
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">
          Skipping a week or more? Add a break to remove all recurring events between two dates.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-[#4B5563]">
            From
            <input className={inputClass} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            To
            <input className={inputClass} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>
        </div>
        {error && <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}
        <button
          type="button"
          disabled={saving || blocks.length === 0}
          className="mt-3 rounded-xl bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
          onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              await onAddBreak(startDate, endDate, blocks.map(block => block.id));
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

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center gap-2 text-[#111827]">
          <PencilLine size={16} />
          <h3 className="text-sm font-semibold">Change one occurrence</h3>
        </div>
        <p className="mt-1 text-xs text-[#6B7280]">Change time or title for one date, without touching the full series.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-[#4B5563]">
            Which event?
            <select className={inputClass} value={modifyBlockId} onChange={e => setModifyBlockId(e.target.value)}>
              <option value="">Select recurring event</option>
              {blocks.map(block => (
                <option key={block.id} value={block.id}>
                  {block.title} · {block.startTime}-{block.endTime}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            On what date?
            <input className={inputClass} type="date" value={modifyDate} onChange={e => setModifyDate(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            New start time (optional)
            <input className={inputClass} type="time" value={modifyStart} onChange={e => setModifyStart(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            New end time (optional)
            <input className={inputClass} type="time" value={modifyEnd} onChange={e => setModifyEnd(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-[#4B5563] md:col-span-2">
            New title (optional)
            <input className={inputClass} value={modifyTitle} onChange={e => setModifyTitle(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          disabled={saving || !modifyBlockId}
          className="mt-3 rounded-xl bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
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
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to modify occurrence.');
            } finally {
              setSaving(false);
            }
          }}
        >
          Save change
        </button>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-[#111827]">Active exceptions</h3>
        <div className="space-y-2">
          {exceptions.length === 0 ? (
            <p className="text-xs text-[#6B7280]">No active exceptions yet.</p>
          ) : (
            exceptions.map(exception => (
              <div key={exception.id} className="flex items-center justify-between rounded-lg border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2">
                <div className="text-xs text-[#4B5563]">
                  {exception.type === 'skip' ? '🌴' : '✏️'} {exception.exceptionDate} · {exception.type}
                </div>
                <button
                  type="button"
                  className="rounded-md border border-[#FECACA] bg-white px-2 py-1 text-[11px] font-semibold text-red-700"
                  onClick={() => void onDeleteException(exception.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
