import {ArrowLeft, CalendarDays, Palette, Repeat2, ShieldAlert, Upload, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import ExceptionManager from './ExceptionManager';
import ManualScheduleForm from './ManualScheduleForm';
import ScheduleImporter from './ScheduleImporter';
import type {
  RecurringColorCategory,
  RecurringScheduleBlock,
  RecurringScheduleException,
  ScheduleImport,
} from '../../types/recurringSchedule';
import {normalizeSubjectTitle} from '../../utils/subjectTitle';

type Tab = 'add' | 'manage' | 'adjust';
type AddChoice = null | 'recurring' | 'onetime' | 'import';

type Props = {
  blocks: RecurringScheduleBlock[];
  onClose: () => void;
  /** Pre-navigate to a specific tab on open */
  initialTab?: Tab;
  /** Pre-navigate to a specific add choice on open */
  initialChoice?: AddChoice;
  /** When true, Back from the initial form closes the modal instead of showing the choice screen */
  directEntry?: boolean;
  onSaveManual: (
    entries: Array<{
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      colorCategory: RecurringColorCategory;
    }>,
    metadata: {
      startDate: string;
      endDate: string | null;
      scheduleName: string;
      sourceType: 'image' | 'pdf' | 'manual';
      replaceAll: boolean;
    },
  ) => Promise<void>;
  onDeleteBlock: (id: string) => Promise<void>;
  onUpdateBlock: (
    id: string,
    patch: Partial<{
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      colorCategory: RecurringColorCategory;
      startDate: string;
      endDate: string | null;
    }>,
  ) => Promise<void>;
  onSkipDate: (recurringBlockId: string, date: string) => Promise<void>;
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
  imports: ScheduleImport[];
  onDeleteImport: (id: string) => Promise<void>;
  onRenameImport: (id: string, name: string) => Promise<void>;
  subjectColorMap: Record<string, string>;
  onSetSubjectColor: (subjectTitle: string, colorHex: string) => Promise<void>;
};

const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SOFT_PALETTE = [
  '#FDA4AF', '#FDBA74', '#FCD34D', '#6EE7B7',
  '#5EEAD4', '#7DD3FC', '#93C5FD', '#C4B5FD',
  '#F9A8D4', '#94A3B8', '#FDE68A', '#86EFAC',
  '#67E8F9', '#DDD6FE', '#BAE6FD', '#E2E8F0',
];

const INPUT_SM =
  'rounded-lg border border-black/[0.07] bg-white/80 px-2.5 py-1.5 text-[12px] text-[#1e293b] outline-none focus:border-rose-200/70 focus:ring-2 focus:ring-rose-50 transition-shadow';

const FIELD =
  'w-full rounded-2xl border border-black/[0.06] bg-white/80 px-3.5 py-2.5 text-[13px] text-[#1e293b] outline-none transition-shadow focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80';

const FIELD_TIME =
  'w-full rounded-2xl border border-black/[0.06] bg-white/80 px-3.5 py-2.5 text-[13px] font-medium text-[#1e293b] outline-none transition-shadow focus:border-violet-200/60 focus:ring-2 focus:ring-violet-50/80';

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultScheduleName() {
  const now = new Date();
  return `Routine added ${now.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}`;
}

function formatSourceLabel(s: ScheduleImport['sourceType']) {
  return s === 'pdf' ? 'PDF' : s === 'image' ? 'Image' : 'Manual';
}

/* ─── One-time event form ─── */
function OneTimeEventForm({
  onSave,
  onCancel,
}: {
  onSave: Props['onSaveManual'];
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toYmd(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const d = (eh * 60 + em) - (sh * 60 + sm);
    if (d <= 0) return null;
    const h = Math.floor(d / 60);
    const min = d % 60;
    if (!h) return `${min}m`;
    if (!min) return `${h}h`;
    return `${h}h ${min}m`;
  }, [startTime, endTime]);

  return (
    <div className="space-y-5 pb-1">

      {/* Title */}
      <input
        className="w-full border-0 border-b-[1.5px] border-black/[0.08] bg-transparent pb-3 text-[17px] font-medium text-[#0F172A] outline-none placeholder:font-normal placeholder:text-[#CBD5E1] transition-colors focus:border-violet-300/60"
        placeholder="e.g. Chemistry exam, Dentist, Finish essay"
        value={title}
        onChange={e => { setTitle(e.target.value); if (error) setError(null); }}
        autoFocus
      />

      {/* Date + Time — soft frosted group */}
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

      {error && (
        <p className="rounded-2xl bg-rose-50/80 px-3.5 py-2.5 text-[12px] text-rose-600">{error}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          className="text-[13px] text-[#94A3B8] transition hover:text-[#475569]"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          className="rounded-2xl bg-[#111827] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.16)] transition hover:bg-[#1f2937] hover:shadow-[0_4px_18px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50"
          onClick={async () => {
            if (!title.trim()) {
              setError('Please add a title.');
              return;
            }
            setSaving(true);
            setError(null);
            try {
              const d = new Date(`${date}T12:00:00`);
              await onSave(
                [{title: title.trim(), dayOfWeek: d.getDay(), startTime, endTime, colorCategory: 'default'}],
                {startDate: date, endDate: date, scheduleName: title.trim(), sourceType: 'manual', replaceAll: false},
              );
              onCancel();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to save.');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving…' : 'Add to calendar'}
        </button>
      </div>
    </div>
  );
}

/* ─── Choice card ─── */
function ChoiceCard({
  Icon,
  title,
  subtitle,
  example,
  onClick,
}: {
  Icon: React.ComponentType<{size: number}>;
  title: string;
  subtitle: string;
  example: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-black/[0.06] bg-white/60 p-4 text-left transition-all duration-150 hover:border-black/[0.1] hover:bg-white/90 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-white text-[#6B7280] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[#111827]">{title}</div>
          <div className="mt-0.5 text-[12.5px] text-[#6B7280]">{subtitle}</div>
          <div className="mt-1 text-[11.5px] text-[#9CA3AF]">{example}</div>
        </div>
        <span className="ml-auto shrink-0 text-[20px] leading-none text-[#D1D5DB] transition group-hover:text-[#9CA3AF]">›</span>
      </div>
    </button>
  );
}

/* ─── Main modal ─── */
export default function MyScheduleScreen({
  blocks,
  onClose,
  initialTab,
  initialChoice,
  directEntry = false,
  onSaveManual,
  onDeleteBlock,
  onUpdateBlock,
  onSkipDate,
  exceptions,
  onAddBreak,
  onDeleteException,
  onModifyOccurrence,
  imports,
  onDeleteImport,
  onRenameImport,
  subjectColorMap,
  onSetSubjectColor,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'add');
  const [addChoice, setAddChoice] = useState<AddChoice>(initialChoice ?? null);

  // When the modal was opened via Quick Add (directEntry=true), Back closes rather
  // than dropping back to the generic choice screen — the user already chose once.
  const handleBack = () => {
    if (directEntry) {
      onClose();
    } else {
      setAddChoice(null);
    }
  };
  const [importFilter, setImportFilter] = useState<string | null>(null);
  const [editingImportId, setEditingImportId] = useState<string | null>(null);
  const [editingImportName, setEditingImportName] = useState('');
  const [customHexByTitle, setCustomHexByTitle] = useState<Record<string, string>>({});
  const [expandedColorSubject, setExpandedColorSubject] = useState<string | null>(null);
  const [showSubjectColors, setShowSubjectColors] = useState(false);
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  }>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const grouped = useMemo(() => {
    const byDay = new Map<number, RecurringScheduleBlock[]>();
    for (let day = 0; day < 7; day += 1) byDay.set(day, []);
    for (const block of blocks) {
      if (importFilter && block.importId !== importFilter) continue;
      const arr = byDay.get(block.dayOfWeek) ?? [];
      arr.push(block);
      byDay.set(block.dayOfWeek, arr);
    }
    return Array.from(byDay.entries()).map(([day, items]) => ({
      day,
      items: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  }, [blocks, importFilter]);

  const groupedByTitle = useMemo(() => {
    const byTitle = new Map<string, {items: RecurringScheduleBlock[]; labels: Map<string, number>}>();
    for (const block of blocks) {
      if (importFilter && block.importId !== importFilter) continue;
      const key = normalizeSubjectTitle(block.title);
      const group = byTitle.get(key) ?? {items: [], labels: new Map<string, number>()};
      group.items.push(block);
      const rawLabel = block.title.trim() || key;
      group.labels.set(rawLabel, (group.labels.get(rawLabel) ?? 0) + 1);
      byTitle.set(key, group);
    }
    return Array.from(byTitle.entries())
      .map(([normalizedTitle, group]) => {
        const displayTitle =
          Array.from(group.labels.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? normalizedTitle;
        return {
          normalizedTitle,
          displayTitle,
          items: group.items.sort((a, b) =>
            a.dayOfWeek === b.dayOfWeek
              ? a.startTime.localeCompare(b.startTime)
              : a.dayOfWeek - b.dayOfWeek,
          ),
        };
      })
      .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
  }, [blocks, importFilter]);

  /* key that changes whenever visible content changes — drives the fade-in animation */
  const contentKey = `${tab}|${addChoice ?? ''}`;

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/25 p-3 backdrop-blur-md md:p-6"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes sfadeIn  { from { opacity:0; transform:translateY(8px)  } to { opacity:1; transform:translateY(0) } }
        @keyframes tabIn    { from { opacity:0; transform:translateY(5px)  } to { opacity:1; transform:translateY(0) } }
        @keyframes slotIn   { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* ── Modal shell — fixed height so tab-switching never jumps ── */}
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-black/[0.07] bg-white/[0.97] shadow-[0_32px_80px_-24px_rgba(15,23,42,0.26)] backdrop-blur-2xl"
        style={{height: 'min(700px, 92vh)', animation: 'sfadeIn 220ms cubic-bezier(0.22,1,0.36,1)'}}
      >
        {/* ── Fixed header ── */}
        <div className="shrink-0 px-6 pb-4 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-[#111827]">
                Plan around your life
              </h2>
              <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B7280]">
                Add classes, work, sports, and one-time events so Noted can build better schedules.
              </p>
            </div>
            <button
              type="button"
              className="ml-4 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/80 text-[#9CA3AF] transition hover:bg-black/[0.04] hover:text-[#374151]"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── Fixed tab bar ── */}
        <div className="shrink-0 border-b border-black/[0.05] px-4">
          <div className="flex">
            {(['add', 'manage', 'adjust'] as const).map(id => {
              const label = id === 'add' ? 'Add' : id === 'manage' ? 'Manage' : 'Adjust';
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    setAddChoice(null);
                  }}
                  className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
                    active ? 'text-[#111827]' : 'text-[#9CA3AF] hover:text-[#6B7280]'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#111827]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div key={contentKey} className="px-6 py-5" style={{animation: 'tabIn 200ms ease-out'}}>

            {/* ════ ADD ════ */}
            {tab === 'add' && (
              <>
                {addChoice === null ? (
                  <div className="space-y-3">
                    <p className="text-[13px] text-[#6B7280]">What would you like to add?</p>
                    <div className="space-y-2.5">
                      <ChoiceCard
                        Icon={Repeat2}
                        title="Recurring routine"
                        subtitle="Classes, work shifts, sports, weekly commitments."
                        example="e.g. Maths every Monday 9:00–10:00"
                        onClick={() => setAddChoice('recurring')}
                      />
                      <ChoiceCard
                        Icon={CalendarDays}
                        title="One-time event"
                        subtitle="A single appointment, exam, deadline, or task."
                        example="e.g. Dentist tomorrow at 15:00"
                        onClick={() => setAddChoice('onetime')}
                      />
                      <ChoiceCard
                        Icon={Upload}
                        title="Import schedule"
                        subtitle="Upload a timetable image or PDF."
                        example="e.g. School timetable, work planning"
                        onClick={() => setAddChoice('import')}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      className="mb-5 flex items-center gap-1.5 text-[13px] text-[#9CA3AF] transition hover:text-[#374151]"
                      onClick={handleBack}
                    >
                      <ArrowLeft size={14} />
                      {directEntry ? 'Close' : 'Back'}
                    </button>

                    {addChoice === 'recurring' && (
                      <>
                        <div className="mb-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-[15px] font-semibold text-[#111827]">Add a recurring routine</h3>
                              <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
                                Use this for classes, work, sports, or anything that repeats weekly.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAddChoice('import')}
                              className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full border border-violet-100/80 bg-violet-50/60 px-2.5 py-1 text-[11.5px] font-medium text-violet-500 transition hover:bg-violet-100/60 hover:text-violet-700"
                            >
                              <Upload size={11} />
                              Import instead
                            </button>
                          </div>
                        </div>
                        <ManualScheduleForm
                          onSave={async (entries, metadata) => {
                            await onSaveManual(entries, {
                              ...metadata,
                              scheduleName: defaultScheduleName(),
                              sourceType: 'manual',
                              replaceAll: false,
                            });
                            setAddChoice(null);
                          }}
                        />
                      </>
                    )}

                    {addChoice === 'onetime' && (
                      <>
                        <div className="mb-5">
                          <h3 className="text-[15px] font-semibold text-[#111827]">Add a one-time event</h3>
                        </div>
                        <OneTimeEventForm onSave={onSaveManual} onCancel={() => setAddChoice(null)} />
                      </>
                    )}

                    {addChoice === 'import' && (
                      <>
                        <div className="mb-5">
                          <h3 className="text-[15px] font-semibold text-[#111827]">Import a schedule</h3>
                          <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
                            Upload a timetable image or PDF — Noted will read it and let you review before saving.
                          </p>
                        </div>
                        <ScheduleImporter
                          onSaveManual={async (entries, metadata) => {
                            await onSaveManual(entries, metadata);
                            setAddChoice(null);
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ════ MANAGE ════ */}
            {tab === 'manage' && (
              <div className="space-y-8">

                {/* Routine library */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-[13.5px] font-semibold text-[#111827]">Saved routines</h3>
                      <p className="mt-0.5 text-[12px] text-[#9CA3AF]">Rename, view, or remove saved schedules.</p>
                    </div>
                    {importFilter && (
                      <button
                        type="button"
                        className="text-[12px] font-medium text-rose-500 transition hover:text-rose-700"
                        onClick={() => setImportFilter(null)}
                      >
                        Show all
                      </button>
                    )}
                  </div>

                  {imports.length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-black/[0.07] py-10 text-center">
                      <p className="text-[13px] text-[#9CA3AF]">No routines saved yet.</p>
                      <button
                        type="button"
                        className="mt-2 text-[12.5px] font-medium text-rose-500 transition hover:text-rose-700"
                        onClick={() => {
                          setTab('add');
                          setAddChoice(null);
                        }}
                      >
                        Add your first routine →
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/[0.04]">
                      {imports.map(item => (
                        <div
                          key={item.id}
                          className="group flex items-center gap-3 py-3.5 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            {editingImportId === item.id ? (
                              <input
                                value={editingImportName}
                                onChange={e => setEditingImportName(e.target.value)}
                                onBlur={() => {
                                  if (editingImportName.trim())
                                    void onRenameImport(item.id, editingImportName.trim());
                                  setEditingImportId(null);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    if (editingImportName.trim())
                                      void onRenameImport(item.id, editingImportName.trim());
                                    setEditingImportId(null);
                                  }
                                }}
                                className="w-full rounded-lg border border-black/[0.08] bg-white/80 px-2.5 py-1 text-[13px] outline-none focus:border-rose-200/70 focus:ring-2 focus:ring-rose-50"
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                className="truncate text-left text-[13px] font-medium text-[#111827] hover:text-rose-600 transition-colors"
                                onClick={() => {
                                  setEditingImportId(item.id);
                                  setEditingImportName(item.scheduleName);
                                }}
                                title="Click to rename"
                              >
                                {item.scheduleName}
                              </button>
                            )}
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#9CA3AF]">
                              <span>
                                {new Date(item.importDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              <span>·</span>
                              <span>
                                {item.eventCount} event{item.eventCount === 1 ? '' : 's'}
                              </span>
                              <span>·</span>
                              <span>{formatSourceLabel(item.sourceType)}</span>
                            </div>
                          </div>
                          {/* Actions fade in on hover */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-40 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1 text-[11.5px] text-[#6B7280] transition hover:bg-black/[0.04]"
                              onClick={() =>
                                setImportFilter(item.id === importFilter ? null : item.id)
                              }
                            >
                              {item.id === importFilter ? 'Show all' : 'View'}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1 text-[11.5px] text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Delete this routine?',
                                  body: 'This will remove the schedule and all linked recurring events.',
                                  confirmLabel: 'Delete',
                                  danger: true,
                                  onConfirm: () => onDeleteImport(item.id),
                                })
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject colors — collapsible, secondary */}
                {groupedByTitle.length > 0 && (
                  <div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 pb-2 text-left"
                      onClick={() => setShowSubjectColors(prev => !prev)}
                    >
                      <Palette size={13} className="shrink-0 text-[#9CA3AF]" />
                      <span className="text-[13.5px] font-semibold text-[#111827]">Subject colors</span>
                      <span className="text-[11.5px] text-[#9CA3AF]">
                        {groupedByTitle.length} subject{groupedByTitle.length === 1 ? '' : 's'}
                      </span>
                      <span
                        className="ml-auto text-[16px] leading-none text-[#D1D5DB] transition-transform duration-200"
                        style={{transform: showSubjectColors ? 'rotate(90deg)' : 'none'}}
                      >
                        ›
                      </span>
                    </button>

                    {showSubjectColors && (
                      <div className="divide-y divide-black/[0.04]">
                        {groupedByTitle.map(group => {
                          const currentColor =
                            subjectColorMap[group.normalizedTitle] ??
                            group.items[0]?.customColor ??
                            '';
                          const isExpanded = expandedColorSubject === group.normalizedTitle;
                          return (
                            <div key={group.normalizedTitle} className="py-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-4 w-4 shrink-0 rounded-full border border-black/[0.08]"
                                  style={{backgroundColor: currentColor || '#E5E7EB'}}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[13px] font-medium text-[#111827]">
                                    {group.displayTitle}
                                  </div>
                                  <div className="text-[11.5px] text-[#9CA3AF]">
                                    {group.items.length} event{group.items.length === 1 ? '' : 's'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="shrink-0 text-[11.5px] text-[#9CA3AF] transition hover:text-[#6B7280]"
                                  onClick={() =>
                                    setExpandedColorSubject(prev =>
                                      prev === group.normalizedTitle ? null : group.normalizedTitle,
                                    )
                                  }
                                >
                                  {isExpanded ? 'Done' : 'Change'}
                                </button>
                              </div>

                              {isExpanded && (
                                <div
                                  className="mt-3 rounded-xl border border-black/[0.04] bg-white/50 p-3"
                                  style={{animation: 'tabIn 150ms ease-out'}}
                                >
                                  <div className="flex flex-wrap gap-1.5">
                                    {SOFT_PALETTE.map(color => (
                                      <button
                                        key={color}
                                        type="button"
                                        className="h-6 w-6 rounded-full border border-black/[0.08] transition hover:scale-110"
                                        style={{
                                          backgroundColor: color,
                                          transform:
                                            color === currentColor ? 'scale(1.15)' : undefined,
                                          borderColor:
                                            color === currentColor
                                              ? 'rgba(0,0,0,0.25)'
                                              : undefined,
                                        }}
                                        onClick={() => {
                                          void onSetSubjectColor(group.normalizedTitle, color);
                                          setExpandedColorSubject(null);
                                        }}
                                        aria-label={`Set color`}
                                      />
                                    ))}
                                  </div>
                                  <div className="mt-2.5 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={customHexByTitle[group.normalizedTitle] ?? currentColor}
                                      onChange={e =>
                                        setCustomHexByTitle(prev => ({
                                          ...prev,
                                          [group.normalizedTitle]: e.target.value,
                                        }))
                                      }
                                      placeholder="#3B82F6"
                                      className="w-28 rounded-lg border border-black/[0.08] bg-white/80 px-2.5 py-1.5 text-[12px] outline-none focus:border-rose-200/70 focus:ring-2 focus:ring-rose-50"
                                    />
                                    <button
                                      type="button"
                                      className="rounded-lg border border-black/[0.07] bg-white px-2.5 py-1.5 text-[12px] text-[#4B5563] transition hover:bg-black/[0.04]"
                                      onClick={() => {
                                        const hex =
                                          customHexByTitle[group.normalizedTitle] ?? currentColor;
                                        if (!hex) return;
                                        void onSetSubjectColor(group.normalizedTitle, hex);
                                        setExpandedColorSubject(null);
                                      }}
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Routine events by day */}
                {blocks.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-[13.5px] font-semibold text-[#111827]">Routine events</h3>
                      <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                        Edit title, days, or times for any recurring event.
                      </p>
                    </div>
                    <div className="space-y-5">
                      {grouped
                        .filter(g => g.items.length > 0)
                        .map(group => (
                          <div key={group.day}>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#C4C9D4]">
                              {DAY_FULL[group.day]}
                            </p>
                            <div className="divide-y divide-black/[0.03]">
                              {group.items.map(block => (
                                <div
                                  key={block.id}
                                  className="group flex items-center gap-2 py-2.5 transition-colors"
                                >
                                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 md:grid-cols-[1fr_auto_auto]">
                                    <input
                                      className={INPUT_SM}
                                      value={block.title}
                                      onChange={e =>
                                        void onUpdateBlock(block.id, {title: e.target.value})
                                      }
                                    />
                                    <input
                                      type="time"
                                      className={INPUT_SM}
                                      value={block.startTime}
                                      onChange={e =>
                                        void onUpdateBlock(block.id, {startTime: e.target.value})
                                      }
                                    />
                                    <input
                                      type="time"
                                      className={INPUT_SM}
                                      value={block.endTime}
                                      onChange={e =>
                                        void onUpdateBlock(block.id, {endTime: e.target.value})
                                      }
                                    />
                                  </div>
                                  {/* Actions: revealed on row hover */}
                                  <div className="flex shrink-0 gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                      type="button"
                                      className="rounded-lg px-2 py-1 text-[11px] text-amber-500 transition hover:bg-amber-50"
                                      onClick={() => void onSkipDate(block.id, toYmd(new Date()))}
                                    >
                                      Skip today
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-lg px-2 py-1 text-[11px] text-rose-400 transition hover:bg-rose-50"
                                      onClick={() => void onDeleteBlock(block.id)}
                                      aria-label="Delete"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {blocks.length === 0 && imports.length === 0 && (
                  <div className="flex flex-col items-center py-6 text-center">
                    <p className="text-[13px] text-[#9CA3AF]">Nothing here yet.</p>
                    <button
                      type="button"
                      className="mt-2 text-[12.5px] font-medium text-rose-500 transition hover:text-rose-700"
                      onClick={() => {
                        setTab('add');
                        setAddChoice(null);
                      }}
                    >
                      Add a routine →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════ ADJUST ════ */}
            {tab === 'adjust' && (
              <ExceptionManager
                blocks={blocks}
                exceptions={exceptions}
                onAddBreak={onAddBreak}
                onDeleteException={onDeleteException}
                onModifyOccurrence={onModifyOccurrence}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm dialog ── */}
      {confirmState && (
        <div className="absolute inset-0 z-[280] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl border border-black/[0.07] bg-white/[0.98] p-5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25)]"
            style={{animation: 'sfadeIn 180ms ease-out'}}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert size={15} className="shrink-0 text-amber-500" />
              <h3 className="text-[14px] font-semibold text-[#111827]">{confirmState.title}</h3>
            </div>
            <p className="mt-2 text-[13px] text-[#6B7280]">{confirmState.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-black/[0.08] px-3.5 py-1.5 text-[13px] text-[#4B5563] transition hover:bg-black/[0.04]"
                onClick={() => setConfirmState(null)}
                disabled={confirming}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-xl px-3.5 py-1.5 text-[13px] font-medium text-white transition ${
                  confirmState.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#18181b] hover:bg-[#27272a]'
                }`}
                disabled={confirming}
                onClick={async () => {
                  setConfirming(true);
                  try {
                    await confirmState.onConfirm();
                    setConfirmState(null);
                  } finally {
                    setConfirming(false);
                  }
                }}
              >
                {confirming ? 'Working…' : confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
