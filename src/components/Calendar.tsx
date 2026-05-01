import {useEffect, useMemo, useRef, useState} from 'react';
import {AlertCircle, Lightbulb, Sparkles} from 'lucide-react';
import type {CalendarEvent, Tag, Task} from '../types';
import type {ScheduledBlock} from '../types/scheduler';
import {requestAiSchedule} from '../services/aiSchedulerClient';
import {
  consumeAiRequest,
  fetchServerRemainingAiRequests,
  getAiDailyLimit,
  getRemainingAiRequests,
  setLocalRemainingAiRequests,
} from '../services/aiQuota';
import {
  createBlocks,
  deleteAllBlocks,
  deleteBlock as deleteScheduledBlock,
  fetchAllBlocks,
  updateBlock as updateScheduledBlock,
} from '../services/scheduledBlocksService';
import {buildScheduleFromAiPlan, groupScheduleByDay, mapDueTasksToSchedule} from '../services/schedulingEngine';
import {getDatedTasks} from '../services/tasksAdapter';
import {
  createScheduleImport,
  createRecurringBlocks,
  createException,
  createSkipRange,
  deleteAllRecurringBlocks,
  deleteAllScheduleImports,
  deleteException,
  deleteRecurringBlock,
  fetchRecurringBlocks,
  fetchRecurringExceptions,
  fetchScheduleImports,
  fetchSubjectColors,
  deleteScheduleImport,
  updateScheduleImportName,
  upsertSubjectColor,
  updateRecurringBlock,
} from '../services/recurringScheduleService';
import {expandRecurringBlocksForRange} from '../services/recurringScheduleExpansion';
import CalendarView from './scheduler/CalendarView';
import CalendarEmptyState from './scheduler/CalendarEmptyState';
import QuickSuggestions from './scheduler/QuickSuggestions';
import RecurringScheduleCard from './scheduler/RecurringScheduleCard';
import ScheduleDayGroup from './scheduler/ScheduleDayGroup';
import TodayAtAGlance from './scheduler/TodayAtAGlance.tsx';
import ViewSwitcher from './scheduler/ViewSwitcher.tsx';
import MyScheduleScreen from './schedule/MyScheduleScreen';
import type {RecurringScheduleBlock, RecurringScheduleException, ScheduleImport, SubjectColor} from '../types/recurringSchedule';
import {normalizeSubjectTitle} from '../utils/subjectTitle';

interface CalendarProps {
  events: CalendarEvent[];
  tags: Tag[];
  onEventsChange: (events: CalendarEvent[]) => void;
  onTagsChange: (tags: Tag[]) => void;
  tasks?: Task[];
}

export default function Calendar({events, tasks = []}: CalendarProps) {
  const initialView = (() => {
    try {
      const saved = sessionStorage.getItem('noted-ai-scheduler-view');
      return saved === 'list' ? 'list' : 'calendar';
    } catch {
      return 'calendar';
    }
  })();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSavedBlocks, setLoadingSavedBlocks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [latestDeadline, setLatestDeadline] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduledBlock[]>([]);
  const [includeDatedTasks, setIncludeDatedTasks] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(initialView);
  const [remaining, setRemaining] = useState(() => getRemainingAiRequests());
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringScheduleBlock[]>([]);
  const [recurringExceptions, setRecurringExceptions] = useState<RecurringScheduleException[]>([]);
  const [showMySchedule, setShowMySchedule] = useState(false);
  const [scheduleImports, setScheduleImports] = useState<ScheduleImport[]>([]);
  const [subjectColors, setSubjectColors] = useState<SubjectColor[]>([]);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const generationInFlightRef = useRef(false);
  const quotaSyncInFlightRef = useRef(false);

  const syncServerQuota = async () => {
    if (quotaSyncInFlightRef.current) return;
    quotaSyncInFlightRef.current = true;
    try {
      const serverRemaining = await fetchServerRemainingAiRequests();
      setRemaining(serverRemaining);
      setLocalRemainingAiRequests(serverRemaining);
    } catch {
      // Keep local hint if server count fetch fails.
    } finally {
      quotaSyncInFlightRef.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingSavedBlocks(true);
    void fetchAllBlocks()
      .then(saved => {
        if (cancelled) return;
        setItems(saved);
        const latest = saved.reduce<string | null>((acc, item) => {
          if (!acc) return item.date;
          return item.date > acc ? item.date : acc;
        }, null);
        setLatestDeadline(latest);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load saved scheduled blocks.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSavedBlocks(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchRecurringBlocks(), fetchRecurringExceptions(), fetchScheduleImports(), fetchSubjectColors()])
      .then(([blocks, exceptions, imports, colors]) => {
        if (cancelled) return;
        setRecurringBlocks(blocks);
        setRecurringExceptions(exceptions);
        setScheduleImports(imports);
        setSubjectColors(colors);
      })
      .catch(() => {
        if (!cancelled) setToast("Couldn't load recurring schedule blocks.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshRecurringData = async () => {
    const [blocks, exceptions, imports, colors] = await Promise.all([
      fetchRecurringBlocks(),
      fetchRecurringExceptions(),
      fetchScheduleImports(),
      fetchSubjectColors(),
    ]);
    setRecurringBlocks(blocks);
    setRecurringExceptions(exceptions);
    setScheduleImports(imports);
    setSubjectColors(colors);
  };

  useEffect(() => {
    void syncServerQuota();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const isPersistedId = (id: string) => !id.startsWith('ai-') && !id.startsWith('task-') && !id.startsWith('rec__');

  const recurringOccurrences = useMemo(() => {
    const today = new Date();
    const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    const colorMap = new Map(subjectColors.map(row => [normalizeSubjectTitle(row.subjectTitle), row.colorHex]));
    const resolved = recurringBlocks.map(block => ({
      ...block,
      customColor: colorMap.get(normalizeSubjectTitle(block.title)) ?? block.customColor ?? null,
    }));
    return expandRecurringBlocksForRange(resolved, recurringExceptions, start, end);
  }, [recurringBlocks, recurringExceptions, subjectColors]);

  const calendarItems = useMemo(() => [...items, ...recurringOccurrences], [items, recurringOccurrences]);
  const subjectColorMap = useMemo(
    () =>
      subjectColors.reduce<Record<string, string>>((acc, row) => {
        acc[normalizeSubjectTitle(row.subjectTitle)] = row.colorHex;
        return acc;
      }, {}),
    [subjectColors],
  );

  const dayGroups = useMemo(() => {
    const mergedBase = [...items, ...recurringOccurrences];
    const merged = includeDatedTasks ? [...mergedBase, ...mapDueTasksToSchedule(tasks)] : mergedBase;
    return groupScheduleByDay(merged);
  }, [includeDatedTasks, items, recurringOccurrences, tasks]);

  const hasCalendarContent = calendarItems.length > 0;
  const isFullyEmpty = items.length === 0 && recurringBlocks.length === 0;
  const quotaLabel =
    remaining > 0
      ? `✨ ${remaining} generations left today`
      : 'Quota refills tomorrow — try again then';
  const promptLength = prompt.trim().length;

  const runGeneration = async () => {
    if (generationInFlightRef.current) return;
    generationInFlightRef.current = true;
    setError(null);
    if (!prompt.trim()) {
      setError('Describe your goal first so AI can build a schedule.');
      generationInFlightRef.current = false;
      return;
    }
    // Local counter is only a UX hint. Real enforcement is server-side.
    consumeAiRequest();
    setRemaining(getRemainingAiRequests());
    setLoading(true);
    try {
      const plan = await requestAiSchedule({
        userText: prompt.trim(),
        existingEvents: events.map(e => ({
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
        datedTasks: getDatedTasks(tasks).map(t => ({title: t.title, dueDate: t.dueDate, status: t.status})),
      });
      const blocks = buildScheduleFromAiPlan({
        subtasks: plan.subtasks,
        deadline: plan.deadline,
        existingEvents: events,
        recurringBusySlots: recurringOccurrences.map(item => ({
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
        })),
      });
      const aiBlocks: ScheduledBlock[] = blocks.map(block => ({
        ...block,
        source: 'ai',
        reasoning: plan.reasoning,
      }));

      setReasoning(plan.reasoning);
      setLatestDeadline(plan.deadline);

      const existingItems = items;
      const replaceExisting =
        existingItems.length > 0 &&
        window.confirm(
          'You already have scheduled blocks.\n\nPress OK to Replace them, or Cancel to Add the new ones.',
        );

      const optimistic = replaceExisting ? aiBlocks : [...existingItems, ...aiBlocks];
      setItems(optimistic);

      setSaving(true);
      try {
        if (replaceExisting) await deleteAllBlocks();
        const savedBatch = await createBlocks(aiBlocks);
        setItems(replaceExisting ? savedBatch : [...existingItems, ...savedBatch]);
      } catch {
        setToast("Schedule generated, but couldn't save to cloud.");
      } finally {
        setSaving(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI could not generate a schedule right now. Please adjust your prompt and retry.');
    } finally {
      setLoading(false);
      void syncServerQuota();
      generationInFlightRef.current = false;
    }
  };

  const updateItem = (id: string, patch: Partial<ScheduledBlock>) => {
    let previousItems: ScheduledBlock[] = [];
    setItems(prev => {
      previousItems = prev;
      return prev.map(item => {
        if (item.id !== id) return item;
        const next = {...item, ...patch};
        const duration = next.durationMinutes;
        if (patch.startTime !== undefined && patch.endTime === undefined) next.endTime = patch.startTime + duration;
        if (patch.endTime !== undefined && patch.startTime === undefined) next.startTime = patch.endTime - duration;
        return next;
      });
    });

    if (!isPersistedId(id)) return;
    void updateScheduledBlock(id, patch).catch(() => {
      setItems(previousItems);
      setToast("Couldn't save that edit. Reverted to previous value.");
    });
  };

  const deleteItem = (id: string) => {
    let previousItems: ScheduledBlock[] = [];
    setItems(prev => {
      previousItems = prev;
      return prev.filter(item => item.id !== id);
    });

    if (!isPersistedId(id)) return;
    void deleteScheduledBlock(id).catch(() => {
      setItems(previousItems);
      setToast("Couldn't delete this block in cloud. Restored.");
    });
  };

  return (
    <div
      className={`relative h-full min-h-0 overflow-y-auto px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6 ${loading ? 'ai-thinking-surface' : ''}`}
    >
      <style>{`
        .ai-page-mesh::before,
        .ai-page-mesh::after { content:''; position:absolute; border-radius:9999px; filter:blur(72px); pointer-events:none; }
        .ai-page-mesh::before { width:22rem; height:22rem; left:-6rem; top:-8rem; background:rgba(240,244,255,0.32); }
        .ai-page-mesh::after { width:24rem; height:24rem; right:-7rem; bottom:2rem; background:rgba(254,243,242,0.22); }
        .ai-glow-center { position:absolute; inset:12% 22% auto; height:22rem; border-radius:9999px; background:rgba(250,250,250,0.7); filter:blur(80px); pointer-events:none; }
        .ai-thinking-surface .ai-page-mesh::before,
        .ai-thinking-surface .ai-page-mesh::after { animation: aiBlobShift 2.8s ease-in-out infinite alternate; }
        .sparkle-breathe { animation: sparklePulse 4.8s ease-in-out infinite; }
        .thinking-ring { animation: thinkingRing 1.5s ease-in-out infinite; }
        .thinking-dot { animation: driftDot 2.8s ease-in-out infinite; }
        @keyframes aiBlobShift { 0% { transform: translate3d(0,0,0);} 100% { transform: translate3d(10px,-6px,0);} }
        @keyframes sparklePulse { 0%,100% { transform: scale(1); opacity:.9;} 50% { transform: scale(1.08); opacity:1;} }
        @keyframes thinkingRing { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,.05), 0 0 0 0 rgba(147,197,253,.05);} 50% { box-shadow: 0 0 0 1px rgba(99,102,241,.28), 0 0 0 8px rgba(147,197,253,.14);} }
        @keyframes driftDot { 0%,100% { transform: translateY(0px); opacity:.3;} 50% { transform: translateY(-8px); opacity:.8;} }
        @media (prefers-reduced-motion: reduce) {
          .ai-thinking-surface .ai-page-mesh::before,
          .ai-thinking-surface .ai-page-mesh::after,
          .sparkle-breathe,
          .thinking-ring,
          .thinking-dot { animation: none !important; }
        }
      `}</style>
      <div className="ai-page-mesh pointer-events-none absolute inset-0" />
      <div className="ai-glow-center" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-8">
        <div
          className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.06)] md:p-8"
          style={{fontFeatureSettings: "'cv11', 'ss01', 'ss03'"}}
        >
          <div className="pointer-events-none absolute right-5 top-4 flex gap-1 opacity-70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D1D5DB]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#E5E7EB]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#DBEAFE]" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-semibold tracking-tight text-[#111827]" style={{letterSpacing: '-0.02em'}}>
              AI Scheduler
            </h1>
            <span className="sparkle-breathe inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF2FF] text-[#6366F1] shadow-[0_6px_16px_-8px_rgba(99,102,241,0.6)]">
              <Sparkles size={14} />
            </span>
          </div>
          <p className="mt-1 text-[13px] font-normal text-[#6B7280]">
            Tell me what you need to do, and I&apos;ll plan it around your schedule.
          </p>

          <div className={`${loading ? 'thinking-ring mt-4 rounded-2xl p-0.5' : 'mt-4'}`}>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="What's on your mind? Try 'I have a chemistry test next Friday and need to finish my essay by Wednesday'..."
              className="min-h-[182px] w-full rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-4 text-sm text-[#1F2937] outline-none transition placeholder:italic focus:border-[#93C5FD] focus:ring-4 focus:ring-[#DBEAFE] focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.03),0_0_0_8px_rgba(191,219,254,0.22)]"
            />
          </div>
          {promptLength > 200 && (
            <p className="mt-1 text-right text-[11px] tabular-nums text-[#9CA3AF]">{promptLength} characters</p>
          )}

          <QuickSuggestions
            visible={!prompt.trim()}
            onPick={text => {
              setPrompt(text);
              promptRef.current?.focus();
            }}
          />

          {loading && (
            <div className="relative mt-3 inline-flex items-center gap-2 rounded-full bg-[#EEF2FF]/90 px-3 py-1.5 text-xs font-medium text-[#4F46E5] shadow-[0_8px_20px_-12px_rgba(79,70,229,0.45)]">
              <span>Planning your schedule...</span>
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6366F1]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6366F1]" style={{animationDelay: '0.15s'}} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6366F1]" style={{animationDelay: '0.3s'}} />
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void runGeneration()}
              disabled={loading || saving}
              className="group inline-flex translate-y-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#4338CA] to-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_10px_24px_-10px_rgba(67,56,202,0.6)] transition hover:-translate-y-[1px] hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_16px_30px_-10px_rgba(67,56,202,0.72)] active:translate-y-0 disabled:opacity-60"
            >
              <Sparkles size={14} className="transition group-hover:scale-110" />
              {loading ? 'Planning your schedule...' : saving ? 'Saving...' : 'Generate Schedule'}
            </button>

            <button
              type="button"
              onClick={() => setIncludeDatedTasks(prev => !prev)}
              className="inline-flex items-center gap-2 text-xs font-medium text-[#4B5563]"
            >
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  includeDatedTasks ? 'bg-[#3B82F6]' : 'bg-[#D1D5DB]'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    includeDatedTasks ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              Include tasks with due dates
            </button>

            <span
              className={`ml-auto rounded-full border px-3 py-1.5 text-xs tabular-nums backdrop-blur-md ${
                remaining > 0
                  ? 'border-white/60 bg-[#EEF2FF]/70 text-[#4F46E5]'
                  : 'border-[#FED7AA] bg-[#FFF7ED]/90 text-[#9A3412]'
              }`}
            >
              {quotaLabel}
            </span>
          </div>
          {loading && (
            <div className="pointer-events-none absolute right-6 top-28 flex gap-2">
              <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#A5B4FC]" />
              <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#93C5FD]" style={{animationDelay: '0.3s'}} />
              <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#C4B5FD]" style={{animationDelay: '0.6s'}} />
            </div>
          )}

          {error && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#FFF1F2] px-3 py-2 text-sm text-[#BE123C]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {loadingSavedBlocks && <p className="mt-3 text-xs text-[#6B7280]">Loading saved blocks...</p>}
        </div>

        <RecurringScheduleCard recurringCount={recurringBlocks.length} onManage={() => setShowMySchedule(true)} />

        <div className="h-px w-full bg-gradient-to-r from-transparent via-black/[0.08] to-transparent" />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <ViewSwitcher
              value={viewMode}
              options={[
                {id: 'calendar', label: 'Calendar'},
                {id: 'list', label: 'List'},
              ]}
              onChange={next => {
                setViewMode(next);
                try {
                  sessionStorage.setItem('noted-ai-scheduler-view', next);
                } catch {
                  // no-op for non-browser env
                }
              }}
            />
          </div>

          {reasoning && (
            <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-[13px] text-[#1E3A8A] shadow-sm">
              <div className="mb-1 inline-flex items-center gap-1.5 font-semibold">
                <Lightbulb size={14} />
                AI note
              </div>
              <p>{reasoning}</p>
            </div>
          )}

          <div className="rounded-2xl border border-black/[0.06] bg-white/96 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.06)] backdrop-blur-sm md:p-4">
            {viewMode === 'calendar' ? (
              !hasCalendarContent && isFullyEmpty ? (
                <CalendarEmptyState onSetupSchedule={() => setShowMySchedule(true)} />
              ) : (
                <CalendarView items={calendarItems} deadline={latestDeadline} onUpdate={updateItem} onDelete={deleteItem} />
              )
            ) : (
              <div className="space-y-4 pb-2">
                {dayGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#FAFAFA] p-6 text-sm text-[#6B7280]">
                    No schedule yet. Generate one to see tasks grouped by day.
                  </div>
                ) : (
                  dayGroups.map((group, index) => (
                    <div key={group.date} className="transition-opacity duration-300" style={{transitionDelay: `${Math.min(index * 50, 250)}ms`}}>
                      <ScheduleDayGroup group={group} onUpdate={updateItem} onDelete={deleteItem} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <TodayAtAGlance items={calendarItems} />
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-[220] rounded-xl bg-black px-3 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      {showMySchedule && (
        <MyScheduleScreen
          blocks={recurringBlocks}
          exceptions={recurringExceptions}
          imports={scheduleImports}
          subjectColorMap={subjectColorMap}
          onClose={() => {
            setShowMySchedule(false);
            void refreshRecurringData();
          }}
          onDeleteBlock={async id => {
            await deleteRecurringBlock(id);
            await refreshRecurringData();
          }}
          onUpdateBlock={async (id, patch) => {
            await updateRecurringBlock(id, patch);
            await refreshRecurringData();
          }}
          onSkipDate={async (recurringBlockId, date) => {
            await createException({
              recurringBlockId,
              exceptionDate: date,
              type: 'skip',
            });
            await refreshRecurringData();
          }}
          onAddBreak={async (startDate, endDate, blockIds) => {
            await createSkipRange(startDate, endDate, blockIds);
            await refreshRecurringData();
          }}
          onDeleteException={async id => {
            await deleteException(id);
            await refreshRecurringData();
          }}
          onModifyOccurrence={async payload => {
            await createException({
              recurringBlockId: payload.recurringBlockId,
              exceptionDate: payload.exceptionDate,
              type: 'modify',
              modifiedStartTime: payload.startTime,
              modifiedEndTime: payload.endTime,
              modifiedTitle: payload.title,
            });
            await refreshRecurringData();
          }}
          onSaveManual={async (entries, metadata) => {
            if (metadata.replaceAll) {
              await deleteAllRecurringBlocks();
              await deleteAllScheduleImports();
            }
            const newImport = await createScheduleImport({
              scheduleName: metadata.scheduleName,
              sourceType: metadata.sourceType,
              eventCount: entries.length,
            });
            await createRecurringBlocks(
              entries.map(entry => ({
                title: entry.title,
                dayOfWeek: entry.dayOfWeek,
                startTime: entry.startTime,
                endTime: entry.endTime,
                colorCategory: entry.colorCategory,
                importId: newImport.id,
                startDate: metadata.startDate,
                endDate: metadata.endDate,
              })),
            );
            await refreshRecurringData();
            setToast(`Schedule "${metadata.scheduleName}" imported successfully — ${entries.length} events added.`);
          }}
          onDeleteImport={async id => {
            await deleteScheduleImport(id);
            await refreshRecurringData();
          }}
          onRenameImport={async (id, name) => {
            await updateScheduleImportName(id, name);
            await refreshRecurringData();
          }}
          onSetSubjectColor={async (subjectTitle, colorHex) => {
            const normalized = normalizeSubjectTitle(subjectTitle);
            setSubjectColors(prev => {
              const existing = prev.find(row => normalizeSubjectTitle(row.subjectTitle) === normalized);
              if (!existing) {
                return [
                  ...prev,
                  {
                    id: `temp-${normalized}`,
                    userId: '',
                    subjectTitle: normalized,
                    colorHex,
                    createdAt: new Date().toISOString(),
                  },
                ];
              }
              return prev.map(row => (normalizeSubjectTitle(row.subjectTitle) === normalized ? {...row, colorHex} : row));
            });
            await upsertSubjectColor(subjectTitle, colorHex);
            await refreshRecurringData();
          }}
        />
      )}
    </div>
  );
}
