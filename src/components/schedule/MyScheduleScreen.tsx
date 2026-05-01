import {CalendarClock, FolderClock, Palette, ShieldAlert, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import ScheduleImporter from './ScheduleImporter';
import ExceptionManager from './ExceptionManager';
import type {
  RecurringColorCategory,
  RecurringScheduleBlock,
  RecurringScheduleException,
  ScheduleImport,
} from '../../types/recurringSchedule';
import {normalizeSubjectTitle} from '../../utils/subjectTitle';

type Tab = 'import' | 'manage' | 'exceptions';

type Props = {
  blocks: RecurringScheduleBlock[];
  onClose: () => void;
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PALETTE = [
  '#EF4444', '#F87171', '#F97316', '#FB923C',
  '#EAB308', '#FACC15', '#22C55E', '#4ADE80',
  '#14B8A6', '#2DD4BF', '#3B82F6', '#60A5FA',
  '#8B5CF6', '#A78BFA', '#EC4899', '#F472B6',
];

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MyScheduleScreen({
  blocks,
  onClose,
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
  const [tab, setTab] = useState<Tab>('import');
  const [importFilter, setImportFilter] = useState<string | null>(null);
  const [editingImportId, setEditingImportId] = useState<string | null>(null);
  const [editingImportName, setEditingImportName] = useState('');
  const [customHexByTitle, setCustomHexByTitle] = useState<Record<string, string>>({});
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  }>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
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
    const byTitle = new Map<
      string,
      {items: RecurringScheduleBlock[]; labels: Map<string, number>}
    >();
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
            a.dayOfWeek === b.dayOfWeek ? a.startTime.localeCompare(b.startTime) : a.dayOfWeek - b.dayOfWeek,
          ),
        };
      })
      .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
  }, [blocks, importFilter]);

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm md:p-4"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`@keyframes scheduleFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight text-[#111827]">Your weekly schedule</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Tell us about your classes, work, and routines so the AI can plan around them.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] text-[#6B7280] transition hover:bg-[#F9FAFB]"
            onClick={onClose}
            aria-label="Close schedule modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-5 inline-flex rounded-2xl bg-[#F3F4F6] p-1">
          {([
            {id: 'import', label: 'Import'},
            {id: 'manage', label: 'Manage'},
            {id: 'exceptions', label: 'Exceptions'},
          ] as const).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? 'bg-white text-[#111827] shadow-sm'
                  : 'text-[#6B7280] hover:bg-white/70 hover:text-[#374151]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[#F3F4F6] bg-white p-2 md:p-4">
          {tab === 'import' && <ScheduleImporter onSaveManual={onSaveManual} />}

          {tab === 'manage' && (
            <div style={{animation: 'scheduleFadeIn 200ms ease-out'}} className="space-y-5">
              <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#111827]">Imported schedules</h3>
                    <p className="mt-1 text-xs text-[#6B7280]">Each upload becomes a schedule you can rename, view, or delete.</p>
                  </div>
                  {importFilter && (
                    <button type="button" className="text-xs text-blue-600" onClick={() => setImportFilter(null)}>
                      Clear filter
                    </button>
                  )}
                </div>
                {imports.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#6B7280]">
                    No schedules yet. Use the Import tab to add your first one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {imports.map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 transition hover:bg-[#F9FAFB]">
                        <div className="min-w-0">
                          {editingImportId === item.id ? (
                            <input
                              value={editingImportName}
                              onChange={e => setEditingImportName(e.target.value)}
                              onBlur={() => {
                                if (editingImportName.trim()) void onRenameImport(item.id, editingImportName.trim());
                                setEditingImportId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  if (editingImportName.trim()) void onRenameImport(item.id, editingImportName.trim());
                                  setEditingImportId(null);
                                }
                              }}
                              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]"
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingImportId(item.id);
                                setEditingImportName(item.scheduleName);
                              }}
                              className="truncate text-left text-sm font-semibold text-[#111827]"
                            >
                              {item.scheduleName}
                            </button>
                          )}
                          <div className="text-xs text-[#6B7280]">
                            {new Date(item.importDate).toLocaleDateString()} • {item.eventCount} events • {item.sourceType}
                          </div>
                        </div>
                        <div className="ml-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-2.5 py-1.5 text-xs font-medium text-[#1D4ED8]"
                            onClick={() => setImportFilter(item.id)}
                          >
                            View on calendar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4B5563]"
                            onClick={() => {
                              setEditingImportId(item.id);
                              setEditingImportName(item.scheduleName);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-[#FECACA] bg-white px-2.5 py-1.5 text-xs font-medium text-red-700"
                            onClick={() => {
                              setConfirmState({
                                title: 'Delete imported schedule?',
                                body: 'This will remove the schedule and all linked recurring events.',
                                confirmLabel: 'Delete schedule',
                                danger: true,
                                onConfirm: async () => onDeleteImport(item.id),
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-[#9CA3AF]">Blocks without import are shown as manually added (legacy).</p>
              </section>

              <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Palette size={16} className="text-[#6B7280]" />
                  <h3 className="text-base font-semibold text-[#111827]">Subject colors</h3>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Pick a color for each subject — every occurrence will use that color in your calendar.
                </p>
                {groupedByTitle.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
                    Colors appear here once you import or add events.
                  </div>
                ) : (
                  <div className="mt-2 space-y-3">
                    {groupedByTitle.map(group => {
                      const currentColor = subjectColorMap[group.normalizedTitle] ?? group.items[0]?.customColor ?? '';
                      return (
                        <div key={group.normalizedTitle} className="rounded-xl border border-[#E5E7EB] p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full border border-black/15" style={{backgroundColor: currentColor || '#e5e7eb'}} />
                              <span className="text-sm font-semibold text-[#111827]">{group.displayTitle}</span>
                              <span className="text-xs text-[#6B7280]">{group.items.length} events</span>
                            </div>
                            <input
                              type="text"
                              value={customHexByTitle[group.normalizedTitle] ?? currentColor}
                              onChange={e => setCustomHexByTitle(prev => ({...prev, [group.normalizedTitle]: e.target.value}))}
                              placeholder="#3B82F6"
                              className="w-28 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {PALETTE.map(color => (
                              <button
                                key={color}
                                type="button"
                                className="h-6 w-6 rounded-full border border-black/15"
                                style={{backgroundColor: color}}
                                onClick={() => void onSetSubjectColor(group.normalizedTitle, color)}
                                aria-label={`Set ${group.displayTitle} color ${color}`}
                              />
                            ))}
                            <button
                              type="button"
                              className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs text-[#4B5563]"
                              onClick={() => {
                                const nextHex = customHexByTitle[group.normalizedTitle] ?? currentColor;
                                if (!nextHex) return;
                                void onSetSubjectColor(group.normalizedTitle, nextHex);
                              }}
                            >
                              Custom
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CalendarClock size={16} className="text-[#6B7280]" />
                  <h3 className="text-base font-semibold text-[#111827]">Your weekly schedule</h3>
                </div>
                <p className="text-xs text-[#6B7280]">Click any event to edit, delete, or skip today.</p>
                <div className="mt-3 space-y-4">
                  {grouped.map(group => (
                <div key={group.day} className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-3">
                  <h4 className="text-sm font-semibold text-[#111827]">{DAY_FULL[group.day]}</h4>
                  <div className="mt-2 space-y-2">
                    {group.items.length === 0 ? (
                      <div className="text-xs text-[#9CA3AF]">No events on {DAY_FULL[group.day]}.</div>
                    ) : (
                      group.items.map(block => (
                        <div key={block.id} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                          <div className="grid flex-1 grid-cols-1 gap-1 md:grid-cols-[1.4fr_auto_auto_auto] md:items-center">
                            <input
                              className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]"
                              value={block.title}
                              onChange={e => void onUpdateBlock(block.id, {title: e.target.value})}
                            />
                            <select
                              className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]"
                              value={block.dayOfWeek}
                              onChange={e => void onUpdateBlock(block.id, {dayOfWeek: Number(e.target.value)})}
                            >
                              {DAY_LABELS.map((label, idx) => (
                                <option key={label} value={idx}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="time"
                              className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]"
                              value={block.startTime}
                              onChange={e => void onUpdateBlock(block.id, {startTime: e.target.value})}
                            />
                            <input
                              type="time"
                              className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]"
                              value={block.endTime}
                              onChange={e => void onUpdateBlock(block.id, {endTime: e.target.value})}
                            />
                          </div>
                          <div className="ml-2 flex gap-1">
                            <button
                              type="button"
                              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700"
                              onClick={() => void onSkipDate(block.id, toYmd(new Date()))}
                            >
                              Skip today
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700"
                              onClick={() => void onDeleteBlock(block.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'exceptions' && (
            <div style={{animation: 'scheduleFadeIn 200ms ease-out'}}>
              <ExceptionManager
                blocks={blocks}
                exceptions={exceptions}
                onAddBreak={onAddBreak}
                onDeleteException={onDeleteException}
                onModifyOccurrence={onModifyOccurrence}
              />
            </div>
          )}
        </div>
      </div>

      {confirmState && (
        <div className="absolute inset-0 z-[280] grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 text-[#111827]">
              <ShieldAlert size={16} className="text-amber-500" />
              <h3 className="text-base font-semibold">{confirmState.title}</h3>
            </div>
            <p className="mt-2 text-sm text-[#6B7280]">{confirmState.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm text-[#4B5563]"
                onClick={() => setConfirmState(null)}
                disabled={confirming}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                  confirmState.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3B82F6] hover:bg-[#2563EB]'
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
                {confirming ? 'Working...' : confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
