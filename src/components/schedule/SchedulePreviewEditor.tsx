import {useMemo, useState} from 'react';
import type {DraftRecurringEvent, RecurringColorCategory} from '../../types/recurringSchedule';

type Props = {
  initialEvents: DraftRecurringEvent[];
  sourceType: 'image' | 'pdf' | 'manual';
  scheduleName: string;
  onCancel: () => void;
  onConfirm: (
    events: DraftRecurringEvent[],
    metadata: {
      startDate: string;
      endDate: string | null;
      scheduleName: string;
      sourceType: 'image' | 'pdf' | 'manual';
      replaceAll: boolean;
    },
  ) => Promise<void>;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function SchedulePreviewEditor({initialEvents, sourceType, scheduleName, onCancel, onConfirm}: Props) {
  const [events, setEvents] = useState<DraftRecurringEvent[]>(initialEvents);
  const [startDate, setStartDate] = useState(() => toYmd(new Date()));
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);

  const grouped = useMemo(() => {
    const byDay = new Map<number, Array<{event: DraftRecurringEvent; index: number}>>();
    for (let i = 0; i < 7; i += 1) byDay.set(i, []);
    events.forEach((event, index) => {
      byDay.get(event.dayOfWeek)?.push({event, index});
    });
    return [...byDay.entries()].map(([day, items]) => ({day, items}));
  }, [events]);

  const shiftDays = (delta: -1 | 1) => {
    setEvents(prev =>
      prev.map(event => ({
        ...event,
        dayOfWeek: (event.dayOfWeek + delta + 7) % 7,
      })),
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-black/60">Review the detected routine before saving it.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-black/70">
          Start date
          <input className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label className="text-xs text-black/70">
          End date (optional)
          <input className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
      </div>

      <div className="rounded-xl border border-black/10 bg-[#fafafa] p-3">
        <p className="text-xs font-semibold text-black/70">How should this routine be saved?</p>
        <label className="mt-2 flex items-center gap-2 text-xs text-black/70">
          <input type="radio" checked={!replaceAll} onChange={() => setReplaceAll(false)} />
          Add to my existing routines
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs text-black/70">
          <input type="radio" checked={replaceAll} onChange={() => setReplaceAll(true)} />
          Replace all current routines
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[11px] font-medium text-black/60 hover:bg-black/[0.03]"
          onClick={() => shiftDays(-1)}
        >
          Shift days back
        </button>
        <button
          type="button"
          className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[11px] font-medium text-black/60 hover:bg-black/[0.03]"
          onClick={() => shiftDays(1)}
        >
          Shift days forward
        </button>
      </div>

      <div className="max-h-[48vh] space-y-3 overflow-auto rounded-xl border border-black/10 p-3">
        {grouped.map(group => (
          <div key={group.day}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/60">{DAY_LABELS[group.day]}</div>
            <div className="space-y-2">
              {group.items.map(({event, index: absoluteIndex}) => {
                return (
                  <div key={`${group.day}-${absoluteIndex}`} className="grid grid-cols-1 gap-2 rounded-lg border border-black/10 p-2 md:grid-cols-[1.4fr_auto_auto_auto_auto]">
                    <input
                      className="rounded-md border border-black/10 px-2 py-1 text-xs"
                      value={event.title}
                      onChange={e =>
                        setEvents(prev => prev.map((row, i) => (i === absoluteIndex ? {...row, title: e.target.value} : row)))
                      }
                    />
                    <select
                      className="rounded-md border border-black/10 px-2 py-1 text-xs"
                      value={event.dayOfWeek}
                      onChange={e =>
                        setEvents(prev => prev.map((row, i) => (i === absoluteIndex ? {...row, dayOfWeek: Number(e.target.value)} : row)))
                      }
                    >
                      {DAY_LABELS.map((label, idx) => (
                        <option key={label} value={idx}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      className="rounded-md border border-black/10 px-2 py-1 text-xs"
                      value={event.startTime}
                      onChange={e =>
                        setEvents(prev => prev.map((row, i) => (i === absoluteIndex ? {...row, startTime: e.target.value} : row)))
                      }
                    />
                    <input
                      type="time"
                      className="rounded-md border border-black/10 px-2 py-1 text-xs"
                      value={event.endTime}
                      onChange={e =>
                        setEvents(prev => prev.map((row, i) => (i === absoluteIndex ? {...row, endTime: e.target.value} : row)))
                      }
                    />
                    <select
                      className="rounded-md border border-black/10 px-2 py-1 text-xs"
                      value={event.colorCategory}
                      onChange={e =>
                        setEvents(prev =>
                          prev.map((row, i) => (i === absoluteIndex ? {...row, colorCategory: e.target.value as RecurringColorCategory} : row)),
                        )
                      }
                    >
                      <option value="study">study</option>
                      <option value="work">work</option>
                      <option value="sport">sport</option>
                      <option value="personal">personal</option>
                      <option value="default">default</option>
                    </select>
                    <button
                      type="button"
                      className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 md:col-span-5 md:justify-self-end"
                      onClick={() => setEvents(prev => prev.filter((_, i) => i !== absoluteIndex))}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="rounded-xl border border-black/10 px-3 py-2 text-xs" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          disabled={saving || events.length === 0}
          onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              await onConfirm(events, {
                startDate,
                endDate: endDate || null,
                scheduleName,
                sourceType,
                replaceAll,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to save this routine.');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving routine...' : 'Save routine'}
        </button>
      </div>
    </div>
  );
}
