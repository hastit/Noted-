import {Plus, Trash2} from 'lucide-react';
import {useMemo, useState} from 'react';
import {categorizeBlock} from '../../utils/blockCategories';
import type {RecurringColorCategory} from '../../types/recurringSchedule';

type DraftEntry = {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  colorCategory: RecurringColorCategory;
};

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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptySlot(): FormSlot {
  return {
    id: makeId(),
    days: [],
    startTime: '09:00',
    endTime: '10:00',
  };
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toColorCategory(title: string): RecurringColorCategory {
  const style = categorizeBlock(title);
  if (style.text === '#4C3FB8') return 'study';
  if (style.text === '#1D6D85') return 'work';
  if (style.text === '#9A3412') return 'sport';
  if (style.text === '#9D4893') return 'personal';
  return 'default';
}

export default function ManualScheduleForm({onSave}: Props) {
  const [title, setTitle] = useState('');
  const [slots, setSlots] = useState<FormSlot[]>([createEmptySlot()]);
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [startDate, setStartDate] = useState(() => toYmd(new Date()));
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      return {
        isValid: false,
        titleError: 'Please fill in a title.',
        slotErrors: nextErrors,
      };
    }
    if (!slots.length) {
      return {
        isValid: false,
        titleError: null,
        slotErrors: {'__all__': 'Add at least one time slot.'},
      };
    }
    for (const slot of slots) {
      if (slot.days.length === 0) {
        nextErrors[slot.id] = 'Select at least one day for this slot.';
        continue;
      }
      if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
        nextErrors[slot.id] = 'Start time must be before end time.';
      }
    }
    return {
      isValid: Object.keys(nextErrors).length === 0,
      titleError: null,
      slotErrors: nextErrors,
    };
  };

  const buildEntriesFromCurrentForm = (): DraftEntry[] => {
    const cat = toColorCategory(title);
    const nextEntries: DraftEntry[] = [];
    for (const slot of slots) {
      for (const dayOfWeek of slot.days) {
        nextEntries.push({
          id: makeId(),
          title: title.trim(),
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          colorCategory: cat,
        });
      }
    }
    return nextEntries;
  };

  const canAdd = useMemo(() => validateForm().isValid, [title, slots]);
  const hasAnyFormInput = useMemo(
    () =>
      title.trim().length > 0 ||
      slots.some(slot => slot.days.length > 0 || slot.startTime !== '09:00' || slot.endTime !== '10:00'),
    [title, slots],
  );
  const canUseCurrentFormForSave = useMemo(() => validateForm().isValid, [title, slots]);
  const pendingFormEventCount = canUseCurrentFormForSave ? buildEntriesFromCurrentForm().length : 0;
  const totalEventCount = entries.length + pendingFormEventCount;

  const addEntry = () => {
    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.titleError ?? 'Please complete all slot details before adding.');
      setSlotErrors(validation.slotErrors);
      return;
    }
    const nextEntries = buildEntriesFromCurrentForm();
    setEntries(prev => [...prev, ...nextEntries]);
    resetCurrentForm();
    setError(null);
    setSlotErrors({});
    setAddedFeedback(`✓ Added ${nextEntries.length} occurrence${nextEntries.length > 1 ? 's' : ''} to drafts`);
    window.setTimeout(() => setAddedFeedback(null), 2200);
  };

  const resetCurrentForm = () => {
    setTitle('');
    setSlots([createEmptySlot()]);
  };

  const getSaveLabel = () => {
    if (totalEventCount <= 0) return 'Save';
    if (totalEventCount === 1) return 'Save 1 event';
    return `Save ${totalEventCount} events`;
  };

  const inputClass =
    'mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <h3 className="text-sm font-semibold text-[#111827]">Add an event</h3>
        <p className="mt-1 text-xs text-[#6B7280]">Create one event card, then add it to your draft list.</p>

        <label className="mt-3 block text-xs font-medium text-[#4B5563]">
          Event title
          <input
            className={inputClass}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Math class, Soccer practice, Morning standup"
          />
        </label>

        <div className="mt-4">
          <p className="text-xs font-medium text-[#4B5563]">When does this happen?</p>
          <div className="mt-2 space-y-3">
            {slots.map((slot, slotIdx) => (
              <div key={slot.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#374151]">Slot {slotIdx + 1}</p>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSlots(prev => prev.filter(entry => entry.id !== slot.id))}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((label, idx) => {
                    const active = slot.days.includes(idx);
                    return (
                      <button
                        key={`${slot.id}-${label}`}
                        type="button"
                        onClick={() =>
                          setSlots(prev =>
                            prev.map(entry =>
                              entry.id !== slot.id
                                ? entry
                                : {
                                    ...entry,
                                    days: active
                                      ? entry.days.filter(d => d !== idx)
                                      : [...entry.days, idx].sort((a, b) => a - b),
                                  },
                            ),
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                            : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F3F4F6]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium text-[#4B5563]">
                    Starts at
                    <input
                      className={inputClass}
                      type="time"
                      value={slot.startTime}
                      onChange={e =>
                        setSlots(prev => prev.map(entry => (entry.id === slot.id ? {...entry, startTime: e.target.value} : entry)))
                      }
                    />
                  </label>
                  <label className="text-xs font-medium text-[#4B5563]">
                    Ends at
                    <input
                      className={inputClass}
                      type="time"
                      value={slot.endTime}
                      onChange={e =>
                        setSlots(prev => prev.map(entry => (entry.id === slot.id ? {...entry, endTime: e.target.value} : entry)))
                      }
                    />
                  </label>
                </div>
                {slotErrors[slot.id] && <p className="mt-2 text-xs text-red-600">{slotErrors[slot.id]}</p>}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSlots(prev => [...prev, createEmptySlot()])}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#93C5FD] bg-white px-3 py-2 text-xs font-semibold text-[#1D4ED8]"
        >
          <Plus size={14} />
          Add time slot
        </button>

        <button
          type="button"
          onClick={addEntry}
          disabled={!canAdd}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#93C5FD] bg-[#EFF6FF] px-3.5 py-2 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE] disabled:opacity-50"
        >
          <Plus size={14} />
          Add this event to drafts
        </button>
        {addedFeedback && <p className="mt-2 text-xs text-emerald-700">{addedFeedback}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#111827]">Draft events</p>
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-3 text-xs text-[#6B7280]">
            No events yet. Add one above to build your weekly schedule.
          </div>
        ) : (
          Object.entries(
            entries.reduce<Record<string, DraftEntry[]>>((acc, entry) => {
              const key = entry.title.trim();
              if (!acc[key]) acc[key] = [];
              acc[key].push(entry);
              return acc;
            }, {}),
          ).map(([groupTitle, groupEntries]) => (
            <div key={groupTitle} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-[#111827]">
                  {groupTitle} ({groupEntries.length} occurrence{groupEntries.length > 1 ? 's' : ''})
                </div>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-700"
                  onClick={() => setEntries(prev => prev.filter(item => item.title.trim() !== groupTitle))}
                >
                  Remove all
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {groupEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg bg-[#F9FAFB] px-2 py-1.5 text-xs text-[#6B7280]">
                    <span>
                      {DAY_LABELS[entry.dayOfWeek]} {entry.startTime} - {entry.endTime}
                    </span>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => setEntries(prev => prev.filter(item => item.id !== entry.id))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <h3 className="text-sm font-semibold text-[#111827]">When does this schedule apply?</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-[#4B5563]">
            Start date
            <input className={inputClass} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            End date (optional)
            <input className={inputClass} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {entries.length === 0 && !hasAnyFormInput && (
        <p className="text-xs text-[#6B7280]">Add at least one event to save</p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving || (entries.length === 0 && !hasAnyFormInput)}
          className="rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
          onClick={async () => {
            if (entries.length === 0 && !hasAnyFormInput) return;

            if (hasAnyFormInput && !canUseCurrentFormForSave) {
              const validation = validateForm();
              setSlotErrors(validation.slotErrors);
              setError(validation.titleError ?? 'Please fill in title and complete each time slot.');
              return;
            }

            const payloadEntries: DraftEntry[] = [...entries];
            if (canUseCurrentFormForSave) {
              payloadEntries.push(...buildEntriesFromCurrentForm());
            }

            if (payloadEntries.length === 0) {
              setError('Add at least one valid event before saving.');
              return;
            }

            setSaving(true);
            setError(null);
            try {
              await onSave(payloadEntries, {startDate, endDate: endDate || null});
              setEntries([]);
              resetCurrentForm();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to save recurring schedule.');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving...' : getSaveLabel()}
        </button>
      </div>
    </div>
  );
}
