import {useEffect, useMemo, useRef, useState} from 'react';
import {AlertCircle, ChevronDown, Clock3, Lightbulb, PencilLine, Plus, RefreshCw, Save, Sparkles, Trash2, X} from 'lucide-react';
import type {CalendarEvent, Tag, Task} from '../types';
import type {AIPlanResponse, ScheduledBlock} from '../types/scheduler';
import {requestAiSchedule, AiScheduleError} from '../services/aiSchedulerClient';
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
import {buildScheduleFromAiPlan, groupScheduleByDay, mapDueTasksToSchedule, type TimePreference} from '../services/schedulingEngine';
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
import ManageEventsModal from './scheduler/ManageEventsModal';
import type {EventSaveData} from './scheduler/ManageEventsModal';
import QuickSuggestions from './scheduler/QuickSuggestions';
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
  onScheduledBlocksChange?: (blocks: ScheduledBlock[]) => void;
  tasks?: Task[];
}

type DraftUnderstandingItem = {
  id: string;
  title: string;
  deadline: string;
  estimatedMinutes: number;
  suggestedSessions: number;
};

type DraftPlanBlock = {
  id: string;
  title: string;
  durationMinutes: number;
  date: string;
  startTime: number;
  endTime: number;
  source: 'ai' | 'manual';
  reasoning?: string;
};

type DraftPlan = {
  source: 'ai' | 'mock';
  reasoning: string;
  understoodItems: DraftUnderstandingItem[];
  proposedBlocks: DraftPlanBlock[];
};

const TIME_PREF_LABELS: Record<TimePreference, string> = {
  morning:   'Prefer mornings (8 AM–1 PM)',
  afternoon: 'Prefer afternoons (1 PM–6 PM)',
  evening:   'Prefer evenings (6 PM–9 PM)',
  spread:    'Spread throughout the day',
};

const TIME_PREF_PROMPT: Record<TimePreference, string> = {
  morning:   'Schedule sessions preferably in the morning (8 AM–1 PM); use afternoon or evening only when needed.',
  afternoon: 'Schedule sessions preferably in the afternoon (1 PM–6 PM); use morning or evening only when needed.',
  evening:   'Schedule sessions preferably in the evening (6 PM–9 PM); use other times only when needed.',
  spread:    'Distribute sessions across morning, afternoon, and evening — avoid clustering them all at the same time of day.',
};

function buildPlanningPreferences(options: {splitBigWork: boolean; timePreference: TimePreference}) {
  const notes: string[] = [];
  if (options.splitBigWork) {
    notes.push('Split larger tasks into smaller focused sessions when it helps.');
  }
  notes.push(TIME_PREF_PROMPT[options.timePreference]);
  return notes;
}

function normalizeDraftKey(value: string) {
  return value.trim().toLowerCase();
}

function createDraftId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDeadlineLabel(value: string) {
  if (!isIsoDate(value)) return value;
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, {weekday: 'long'});
}

function formatBlockDateLabel(value: string) {
  if (!isIsoDate(value)) return value || 'No date';
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, {weekday: 'long', month: 'short', day: 'numeric'});
}

function formatTimeLabel(minutesFromMidnight: number) {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = String(minutesFromMidnight % 60).padStart(2, '0');
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function parseTimeLabel(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatDurationLabel(durationMinutes: number) {
  if (durationMinutes >= 60) {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h${minutes}`;
  }
  return `${durationMinutes}m`;
}

function getLatestScheduledDate(items: ScheduledBlock[]) {
  return items.reduce<string | null>((acc, item) => {
    if (!acc) return item.date;
    return item.date > acc ? item.date : acc;
  }, null);
}

function normalizeDraftBlock(block: DraftPlanBlock): DraftPlanBlock {
  const startTime = Math.max(0, Math.min(23 * 60 + 45, block.startTime));
  const endTime = Math.max(startTime + 15, Math.min(24 * 60, block.endTime));
  return {
    ...block,
    startTime,
    endTime,
    durationMinutes: endTime - startTime,
  };
}

function createDraftBlock(block: ScheduledBlock, source: 'ai' | 'manual' = 'ai'): DraftPlanBlock {
  return normalizeDraftBlock({
    id: block.id,
    title: block.title,
    durationMinutes: block.durationMinutes,
    date: block.date,
    startTime: block.startTime,
    endTime: block.endTime,
    source,
    reasoning: block.reasoning,
  });
}

function cloneDraftPlan(plan: DraftPlan): DraftPlan {
  return {
    ...plan,
    understoodItems: plan.understoodItems.map(item => ({...item})),
    proposedBlocks: plan.proposedBlocks.map(block => ({...block})),
  };
}

function createNewDraftTask(existing: DraftUnderstandingItem[], existingBlocks: DraftPlanBlock[]): DraftUnderstandingItem {
  const fallbackDate = existingBlocks[0]?.date ?? toYmd(new Date());
  return {
    id: createDraftId('draft-task'),
    title: `New task ${existing.length + 1}`,
    deadline: fallbackDate,
    estimatedMinutes: 60,
    suggestedSessions: 1,
  };
}

function createNewDraftSession(existingBlocks: DraftPlanBlock[]): DraftPlanBlock {
  const today = toYmd(new Date());
  const nextDate = existingBlocks.reduce<string>((acc, block) => (block.date > acc ? block.date : acc), today);
  return {
    id: createDraftId('draft-block'),
    title: 'New work session',
    date: nextDate,
    startTime: 9 * 60,
    endTime: 9 * 60 + 30,
    durationMinutes: 30,
    source: 'manual',
  };
}

function toScheduledBlock(block: DraftPlanBlock, reasoning: string): ScheduledBlock {
  const normalized = normalizeDraftBlock(block);
  return {
    id: normalized.id,
    title: normalized.title.trim() || 'Untitled session',
    durationMinutes: normalized.durationMinutes,
    date: normalized.date,
    startTime: normalized.startTime,
    endTime: normalized.endTime,
    reasoning,
    source: 'ai',
  };
}

function buildDraftPlan(plan: AIPlanResponse, proposedBlocks: ScheduledBlock[]): DraftPlan {
  const sessionsByTitle = proposedBlocks.reduce<Map<string, number>>((acc, block) => {
    const key = normalizeDraftKey(block.title);
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map());

  const grouped = new Map<string, DraftUnderstandingItem>();
  for (const subtask of plan.subtasks) {
    const key = normalizeDraftKey(subtask.title);
    const deadline = subtask.suggested_day ?? plan.deadline;
    const existing = grouped.get(key);
    if (existing) {
      existing.estimatedMinutes += subtask.estimated_minutes;
      if (isIsoDate(existing.deadline) && isIsoDate(deadline) && deadline < existing.deadline) {
        existing.deadline = deadline;
      }
      continue;
    }
    grouped.set(key, {
      id: key,
      title: subtask.title,
      deadline,
      estimatedMinutes: subtask.estimated_minutes,
      suggestedSessions: sessionsByTitle.get(key) ?? 1,
    });
  }

  return {
    source: 'ai',
    reasoning: plan.reasoning,
    understoodItems: Array.from(grouped.values()),
    proposedBlocks: proposedBlocks
      .map(block => createDraftBlock(block, 'ai'))
      .sort((a, b) => (a.date === b.date ? a.startTime - b.startTime : a.date.localeCompare(b.date))),
  };
}


export default function Calendar({events, tasks = [], onScheduledBlocksChange}: CalendarProps) {
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
  const [latestDeadline, setLatestDeadline] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduledBlock[]>([]);
  useEffect(() => { onScheduledBlocksChange?.(items); }, [items, onScheduledBlocksChange]);
  const [draftPlan, setDraftPlan] = useState<DraftPlan | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftBackupBeforeEdit, setDraftBackupBeforeEdit] = useState<DraftPlan | null>(null);
  const [includeDatedTasks, setIncludeDatedTasks] = useState(true);
  const [splitBigWork, setSplitBigWork] = useState(true);
  const [timePreference, setTimePreference] = useState<TimePreference>('spread');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(initialView);
  const [showOptions, setShowOptions] = useState(false);
  const [remaining, setRemaining] = useState(() => getRemainingAiRequests());
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringScheduleBlock[]>([]);
  const [recurringExceptions, setRecurringExceptions] = useState<RecurringScheduleException[]>([]);
  const [showMySchedule, setShowMySchedule] = useState(false);
  const [myScheduleInitialChoice, setMyScheduleInitialChoice] = useState<'recurring' | 'onetime' | 'import' | null>(null);
  const [showManageEvents, setShowManageEvents] = useState(false);
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
    setIsEditingDraft(false);
    setDraftBackupBeforeEdit(null);
    try {
      const planningPreferences = buildPlanningPreferences({splitBigWork, timePreference});
      const userText =
        planningPreferences.length > 0
          ? `${prompt.trim()}\n\nPlanning preferences:\n- ${planningPreferences.join('\n- ')}`
          : prompt.trim();
      const _now = new Date();
      const _pad = (n: number) => String(n).padStart(2, '0');
      const currentDateTimeLocal = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-${_pad(_now.getDate())}T${_pad(_now.getHours())}:${_pad(_now.getMinutes())}`;

      const plan = await requestAiSchedule({
        userText,
        currentDateTimeLocal,
        existingEvents: events.map(e => ({
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
        datedTasks: includeDatedTasks
          ? getDatedTasks(tasks).map(t => ({title: t.title, dueDate: t.dueDate, status: t.status}))
          : [],
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
        timePreference,
      });
      const aiBlocks: ScheduledBlock[] = blocks.map(block => ({
        ...block,
        source: 'ai',
        reasoning: plan.reasoning,
      }));
      setDraftPlan(buildDraftPlan(plan, aiBlocks));
    } catch (e) {
      setDraftPlan(null);
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      void syncServerQuota();
      generationInFlightRef.current = false;
    }
  };

  const saveDraftToCalendar = async () => {
    if (!draftPlan || draftPlan.proposedBlocks.length === 0) return;
    const existingItems = items;
    const replaceExisting =
      existingItems.length > 0 &&
      window.confirm(
        'You already have scheduled blocks.\n\nPress OK to Replace them, or Cancel to Add the new ones.',
      );

    setSaving(true);
    setError(null);
    try {
      if (replaceExisting) await deleteAllBlocks();
      const savedBatch = await createBlocks(draftPlan.proposedBlocks.map(block => toScheduledBlock(block, draftPlan.reasoning)));
      const nextItems = replaceExisting ? savedBatch : [...existingItems, ...savedBatch];
      setItems(nextItems);
      setLatestDeadline(getLatestScheduledDate(nextItems));
      setDraftPlan(null);
      setIsEditingDraft(false);
      setDraftBackupBeforeEdit(null);
      setToast('Draft saved to calendar.');
    } catch {
      setToast("Couldn't save this draft to the calendar.");
    } finally {
      setSaving(false);
    }
  };

  const startEditingDraft = () => {
    if (!draftPlan || isEditingDraft) return;
    setDraftBackupBeforeEdit(cloneDraftPlan(draftPlan));
    setIsEditingDraft(true);
  };

  const saveDraftChanges = () => {
    setIsEditingDraft(false);
    setDraftBackupBeforeEdit(null);
  };

  const cancelDraftChanges = () => {
    if (draftBackupBeforeEdit) {
      setDraftPlan(cloneDraftPlan(draftBackupBeforeEdit));
    }
    setIsEditingDraft(false);
    setDraftBackupBeforeEdit(null);
  };

  const updateDraftTask = (id: string, patch: Partial<DraftUnderstandingItem>) => {
    setDraftPlan(prev =>
      prev
        ? {
            ...prev,
            understoodItems: prev.understoodItems.map(item => (item.id === id ? {...item, ...patch} : item)),
          }
        : prev,
    );
  };

  const removeDraftTask = (id: string) => {
    setDraftPlan(prev =>
      prev
        ? {
            ...prev,
            understoodItems: prev.understoodItems.filter(item => item.id !== id),
          }
        : prev,
    );
  };

  const addDraftTask = () => {
    setDraftPlan(prev =>
      prev
        ? {
            ...prev,
            understoodItems: [...prev.understoodItems, createNewDraftTask(prev.understoodItems, prev.proposedBlocks)],
          }
        : prev,
    );
  };

  const updateDraftBlock = (id: string, updater: (block: DraftPlanBlock) => DraftPlanBlock) => {
    setDraftPlan(prev =>
      prev
        ? {
            ...prev,
            proposedBlocks: prev.proposedBlocks.map(block => (block.id === id ? normalizeDraftBlock(updater(block)) : block)),
          }
        : prev,
    );
  };

  const updateDraftBlockText = (id: string, patch: Partial<Pick<DraftPlanBlock, 'title' | 'date'>>) => {
    updateDraftBlock(id, block => ({...block, ...patch}));
  };

  const updateDraftBlockStartTime = (id: string, value: string) => {
    const parsed = parseTimeLabel(value);
    if (parsed === null) return;
    updateDraftBlock(id, block => ({
      ...block,
      startTime: parsed,
      endTime: parsed + Math.max(15, block.durationMinutes),
    }));
  };

  const updateDraftBlockEndTime = (id: string, value: string) => {
    const parsed = parseTimeLabel(value);
    if (parsed === null) return;
    updateDraftBlock(id, block => ({
      ...block,
      endTime: parsed,
    }));
  };

  const removeDraftBlock = (id: string) => {
    setDraftPlan(prev =>
      prev
        ? {
            ...prev,
            proposedBlocks: prev.proposedBlocks.filter(block => block.id !== id),
          }
        : prev,
    );
  };

  const addDraftBlock = () => {
    setDraftPlan(prev =>
      prev
        ? {
            ...prev,
            proposedBlocks: [...prev.proposedBlocks, createNewDraftSession(prev.proposedBlocks)],
          }
        : prev,
    );
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

  // Map of undoId → async undo function, kept in a ref so it never triggers re-renders.
  const recurringUndoActionsRef = useRef<Map<string, () => Promise<void>>>(new Map());

  const handleCommitRecurringDrop = async (block: ScheduledBlock, preview: {dayKey: string; startTime: number; endTime: number}): Promise<{undoId: string}> => {
    const parts = block.id.split('__');
    if (parts.length !== 3 || parts[0] !== 'rec') throw new Error('Invalid recurring block ID');
    const [, recurringBlockId, originalDate] = parts;

    const toHHMM = (min: number) =>
      `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

    const previousException = recurringExceptions.find(
      ex => ex.recurringBlockId === recurringBlockId && ex.exceptionDate === originalDate,
    ) ?? null;

    // Build a client-side exception for immediate optimistic rendering.
    // This ID is temporary; it gets replaced by the real DB id once persisted.
    const clientId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: RecurringScheduleException = {
      id: clientId,
      userId: '',
      recurringBlockId,
      exceptionDate: originalDate,
      type: 'modify',
      modifiedStartTime: toHHMM(preview.startTime),
      modifiedEndTime: toHHMM(preview.endTime),
      modifiedTitle: null,
      modifiedDate: preview.dayKey !== originalDate ? preview.dayKey : null,
      createdAt: new Date().toISOString(),
    };

    // Apply optimistic update immediately so the calendar re-renders now.
    setRecurringExceptions(prev => [
      ...prev.filter(ex => !(ex.recurringBlockId === recurringBlockId && ex.exceptionDate === originalDate)),
      optimistic,
    ]);

    // Track real DB id once persisted (captured by undo closure below).
    let persistedId: string | null = null;

    // Register undo against the client id — works whether DB succeeded or not.
    recurringUndoActionsRef.current.set(clientId, async () => {
      setRecurringExceptions(prev => {
        const without = prev.filter(ex =>
          ex.id !== clientId && (persistedId === null || ex.id !== persistedId),
        );
        return previousException ? [...without, previousException] : without;
      });
      if (persistedId) {
        await deleteException(persistedId).catch(e => console.warn('[RECURRING UNDO] delete failed:', e));
        if (previousException) {
          await createException({
            recurringBlockId: previousException.recurringBlockId,
            exceptionDate: previousException.exceptionDate,
            type: previousException.type,
            modifiedDate: previousException.modifiedDate ?? undefined,
            modifiedStartTime: previousException.modifiedStartTime ?? undefined,
            modifiedEndTime: previousException.modifiedEndTime ?? undefined,
            modifiedTitle: previousException.modifiedTitle ?? undefined,
          }).catch(e => console.warn('[RECURRING UNDO] re-create failed:', e));
        }
        await refreshRecurringData().catch(e => console.warn('[RECURRING UNDO] refresh failed:', e));
      }
    });

    // Persist to DB in the background — errors are logged but do not block the UI.
    void (async () => {
      try {
        if (previousException) await deleteException(previousException.id);
        const saved = await createException({
          recurringBlockId,
          exceptionDate: originalDate,
          type: 'modify',
          modifiedDate: preview.dayKey !== originalDate ? preview.dayKey : undefined,
          modifiedStartTime: toHHMM(preview.startTime),
          modifiedEndTime: toHHMM(preview.endTime),
        });
        persistedId = saved.id;
        // Replace the optimistic record with the real one so IDs are consistent.
        setRecurringExceptions(prev => [
          ...prev.filter(ex => ex.id !== clientId && !(ex.recurringBlockId === recurringBlockId && ex.exceptionDate === originalDate)),
          saved,
        ]);
      } catch (err) {
        console.error(
          '[RECURRING OVERRIDE] DB persist failed — move is visible for this session only.',
          '\nRun migration 20260601120000_add_modified_date_to_exceptions.sql in Supabase for full persistence.',
          err,
        );
        // Optimistic state stays: the move is visible in the current session.
      }
    })();

    return {undoId: clientId};
  };

  const handleUndoRecurringDrop = async (undoId: string) => {
    const action = recurringUndoActionsRef.current.get(undoId);
    if (!action) return;
    recurringUndoActionsRef.current.delete(undoId);
    await action();
  };

  const handleQuickAdd = (type: 'manage-events' | 'routine' | 'import') => {
    if (type === 'manage-events') {
      setShowManageEvents(true);
    } else if (type === 'routine') {
      setMyScheduleInitialChoice('recurring');
      setShowMySchedule(true);
    } else {
      setMyScheduleInitialChoice('import');
      setShowMySchedule(true);
    }
  };

  const handleSlotCreate = async (dayKey: string, startMinute: number, durationMinutes: number, title: string) => {
    const endMinute = startMinute + durationMinutes;
    const newBlocks = await createBlocks([{
      id: '',
      title,
      durationMinutes,
      date: dayKey,
      startTime: startMinute,
      endTime: endMinute,
      source: 'task' as const,
    }]);
    setItems(prev => [...prev, ...newBlocks]);
  };

  const handleSaveQuickBlock = async (data: EventSaveData) => {
    const [sh, sm] = data.startTime.split(':').map(Number);
    const [eh, em] = data.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const newBlocks = await createBlocks([{
      id: '',
      title: data.title,
      durationMinutes: endMin - startMin,
      date: data.date,
      startTime: startMin,
      endTime: endMin,
      source: 'task' as const,
      reasoning: data.notes || undefined,
    }]);
    setItems(prev => [...prev, ...newBlocks]);
  };

  return (
    <div className="relative h-full min-h-0 overflow-y-auto px-4 pb-8 pt-6 md:px-8 md:pb-12 md:pt-10">
      {/* Ambient warm-hue background — soft, diffused, brand-inspired */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div style={{position:'absolute', top:'-8rem', left:'-6rem', width:'44rem', height:'40rem', borderRadius:'9999px', background:'radial-gradient(ellipse at center, rgba(249,168,212,0.22) 0%, rgba(251,207,232,0.08) 45%, transparent 72%)', filter:'blur(32px)'}} />
        <div style={{position:'absolute', top:'-3rem', right:'-8rem', width:'38rem', height:'34rem', borderRadius:'9999px', background:'radial-gradient(ellipse at center, rgba(251,146,60,0.16) 0%, rgba(253,186,116,0.06) 45%, transparent 72%)', filter:'blur(40px)'}} />
        <div style={{position:'absolute', top:'10rem', left:'50%', transform:'translateX(-50%)', width:'60rem', height:'24rem', borderRadius:'9999px', background:'radial-gradient(ellipse at center, rgba(244,114,182,0.09) 0%, transparent 65%)', filter:'blur(52px)'}} />
        <div style={{position:'absolute', bottom:'-6rem', right:'8%', width:'34rem', height:'30rem', borderRadius:'9999px', background:'radial-gradient(ellipse at center, rgba(167,139,250,0.11) 0%, transparent 70%)', filter:'blur(44px)'}} />
        <div style={{position:'absolute', bottom:'12%', left:'3%', width:'28rem', height:'24rem', borderRadius:'9999px', background:'radial-gradient(ellipse at center, rgba(251,113,133,0.07) 0%, transparent 70%)', filter:'blur(36px)'}} />
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-8">
        <div
          className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white/80 p-6 shadow-[0_4px_40px_-12px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-8"
          style={{fontFeatureSettings: "'cv11', 'ss01', 'ss03'"}}
        >
          {/* Inner top-edge glass highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" aria-hidden="true" />
          <div className="flex items-start gap-4">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-400 shadow-[0_8px_20px_-12px_rgba(244,114,182,0.35)]">
              <Sparkles size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[25px] font-semibold tracking-tight text-[#111827]" style={{letterSpacing: '-0.022em'}}>
                Plan with AI
              </h1>
              <p className="mt-1.5 max-w-2xl text-[13.5px] leading-6 text-[#6B7280]">
                Describe your deadlines, exams, tasks, or routines — Noted will build a calm, balanced schedule around your week.
              </p>
            </div>
          </div>

          <div className="mt-7">
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. I have a chemistry test next Friday and a 4-page essay due Wednesday."
              className="min-h-[168px] w-full resize-none rounded-2xl border border-black/[0.07] bg-white/65 px-5 py-4 text-[14px] leading-7 text-[#1F2937] outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-[#C0C8D8] focus:border-rose-200/60 focus:bg-white/85 focus:ring-4 focus:ring-rose-50/90"
            />

            <QuickSuggestions
              visible
              onPick={text => {
                setPrompt(text);
                promptRef.current?.focus();
              }}
            />
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowOptions(prev => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/50 px-3.5 py-2 text-[12px] font-medium text-[#6B7280] backdrop-blur-sm transition-all hover:bg-white/70 hover:text-[#374151]"
            >
              <ChevronDown size={12} className={`transition-transform duration-200 ${showOptions ? 'rotate-180' : ''}`} />
              Planning preferences
              {(!includeDatedTasks || splitBigWork || timePreference !== 'spread') && (
                <span className="ml-0.5 flex h-1.5 w-1.5 rounded-full bg-rose-400" />
              )}
            </button>
            {showOptions && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/[0.06] bg-white/60 px-3.5 py-2 text-[12px] font-medium text-[#4B5563] backdrop-blur-sm transition-all hover:bg-white/80">
                    <input
                      type="checkbox"
                      checked={includeDatedTasks}
                      onChange={() => setIncludeDatedTasks(prev => !prev)}
                      className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-rose-500 focus:ring-rose-200"
                    />
                    Use existing tasks
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/[0.06] bg-white/60 px-3.5 py-2 text-[12px] font-medium text-[#4B5563] backdrop-blur-sm transition-all hover:bg-white/80">
                    <input
                      type="checkbox"
                      checked={splitBigWork}
                      onChange={() => setSplitBigWork(prev => !prev)}
                      className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-rose-500 focus:ring-rose-200"
                    />
                    Split into smaller sessions
                  </label>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#C4C9D4] mb-2">Preferred time of day</p>
                  <div className="flex flex-wrap gap-2">
                    {(['morning', 'afternoon', 'evening', 'spread'] as TimePreference[]).map(pref => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setTimePreference(pref)}
                        className={`rounded-full border px-3.5 py-2 text-[12px] font-medium transition-all ${
                          timePreference === pref
                            ? 'border-[#18181b] bg-[#18181b] text-white'
                            : 'border-black/[0.06] bg-white/60 text-[#4B5563] backdrop-blur-sm hover:bg-white/80'
                        }`}
                      >
                        {TIME_PREF_LABELS[pref]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void runGeneration()}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#18181b] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.28)] transition-all hover:bg-[#27272a] hover:shadow-[0_10px_28px_-8px_rgba(0,0,0,0.34)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={14} />
              {loading ? 'Generating draft...' : saving ? 'Saving...' : 'Generate draft schedule'}
            </button>
            {loading && (
              <p className="text-[12.5px] font-medium text-[#9CA3AF]">
                Building your schedule around what&apos;s already on your calendar...
              </p>
            )}
            <span
              className={`rounded-full border px-3 py-1.5 text-[11px] tabular-nums backdrop-blur-sm ${
                remaining > 0
                  ? 'border-black/[0.06] bg-white/50 text-[#9CA3AF]'
                  : 'border-amber-200/70 bg-amber-50/60 text-amber-700'
              }`}
            >
              {quotaLabel}
            </span>
          </div>

          {error && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-50/80 px-4 py-2.5 text-[13px] text-rose-700 backdrop-blur-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {loadingSavedBlocks && <p className="mt-4 text-[12px] text-[#9CA3AF]">Loading saved blocks...</p>}
        </div>

        {draftPlan && (
          <div className="rounded-3xl border border-[#BFDBFE] bg-[#F8FBFF] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_16px_30px_-24px_rgba(37,99,235,0.18)] md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#111827]">AI Draft Plan</h2>
                  <span className="rounded-full border border-[#BFDBFE] bg-white px-2.5 py-1 text-[11px] font-medium text-[#2563EB]">
                    {isEditingDraft ? 'Editing draft' : 'Not saved yet'}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-6 text-[#6B7280]">
                  Review the suggested sessions before adding them to your calendar.
                </p>
              </div>
              <div className="rounded-2xl border border-[#DBEAFE] bg-white/80 px-3 py-2 text-xs text-[#4B5563]">
                Nothing is saved yet until you approve.
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <section className="rounded-2xl border border-[#DCEAFE] bg-white p-4">
                <div className="flex items-center gap-2">
                  <Lightbulb size={15} className="text-[#2563EB]" />
                  <h3 className="text-sm font-semibold text-[#111827]">What I understood</h3>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                  Detected work, deadlines, and estimated study time from your request.
                </p>
                {isEditingDraft && (
                  <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                    Change the proposed sessions manually or click Regenerate to rebuild the plan.
                  </p>
                )}

                {draftPlan.reasoning && (
                  <div className="mt-4 rounded-2xl border border-[#E0ECFF] bg-[#F8FBFF] px-3.5 py-3 text-[13px] leading-6 text-[#35517A]">
                    {draftPlan.reasoning}
                  </div>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {draftPlan.understoodItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#DCEAFE] bg-[#FBFDFF] p-4 text-sm text-[#6B7280] md:col-span-2">
                      No detected tasks. Add one manually or regenerate the plan.
                    </div>
                  ) : (
                    draftPlan.understoodItems.map(item => (
                      <div key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-[#FCFDFE] p-4">
                        {isEditingDraft ? (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <input
                                value={item.title}
                                onChange={e => updateDraftTask(item.id, {title: e.target.value})}
                                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                              />
                              <button
                                type="button"
                                onClick={() => removeDraftTask(item.id)}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#DC2626]"
                                aria-label="Remove detected task"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="text-[11px] font-medium text-[#6B7280]">
                                Deadline
                                <input
                                  type="date"
                                  value={item.deadline}
                                  onChange={e => {
                                    if (!e.target.value) return;
                                    updateDraftTask(item.id, {deadline: e.target.value});
                                  }}
                                  className="mt-1 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                                />
                              </label>
                              <label className="text-[11px] font-medium text-[#6B7280]">
                                Estimated work (min)
                                <input
                                  type="number"
                                  min={0}
                                  step={15}
                                  value={item.estimatedMinutes}
                                  onChange={e => updateDraftTask(item.id, {estimatedMinutes: Math.max(0, Number(e.target.value) || 0)})}
                                  className="mt-1 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                                />
                              </label>
                              <label className="text-[11px] font-medium text-[#6B7280] sm:col-span-2">
                                Suggested sessions
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={item.suggestedSessions}
                                  onChange={e => updateDraftTask(item.id, {suggestedSessions: Math.max(1, Number(e.target.value) || 1)})}
                                  className="mt-1 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-[#111827]">{item.title}</div>
                            <div className="mt-3 space-y-2 text-xs text-[#6B7280]">
                              <div className="flex items-center justify-between gap-3">
                                <span>Deadline</span>
                                <span className="font-medium text-[#1F2937]">{formatDeadlineLabel(item.deadline)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Estimated work</span>
                                <span className="font-medium text-[#1F2937]">{formatDurationLabel(item.estimatedMinutes)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Suggested sessions</span>
                                <span className="font-medium text-[#1F2937]">{item.suggestedSessions}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {isEditingDraft && (
                  <button
                    type="button"
                    onClick={addDraftTask}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  >
                    <Plus size={14} />
                    Add task
                  </button>
                )}
              </section>

              <section className="rounded-2xl border border-[#DCEAFE] bg-white p-4">
                <div className="flex items-center gap-2">
                  <Clock3 size={15} className="text-[#2563EB]" />
                  <h3 className="text-sm font-semibold text-[#111827]">Proposed schedule</h3>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                  Suggested study blocks to review before they become real calendar events.
                </p>

                <div className="mt-4 space-y-3">
                  {draftPlan.proposedBlocks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#BFDBFE] bg-[#FBFDFF] p-4 text-sm text-[#6B7280]">
                      No sessions in this draft yet. Add one manually or regenerate the plan.
                    </div>
                  ) : (
                    draftPlan.proposedBlocks.map(block => (
                      <div
                        key={block.id}
                        className="rounded-2xl border border-dashed border-[#BFDBFE] bg-[#EFF6FF]/70 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#BFDBFE] bg-white px-2 py-1 font-medium text-[#2563EB]">
                              {block.source === 'manual' ? 'Manual draft' : 'AI draft'}
                            </span>
                            {!isEditingDraft && (
                              <>
                                <span className="font-medium text-[#35517A]">{formatBlockDateLabel(block.date)}</span>
                                <span className="text-[#6B7280]">
                                  {formatTimeLabel(block.startTime)}-{formatTimeLabel(block.endTime)}
                                </span>
                              </>
                            )}
                          </div>
                          {isEditingDraft && (
                            <button
                              type="button"
                              onClick={() => removeDraftBlock(block.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#D6E6FF] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#6B7280] transition hover:text-[#DC2626]"
                            >
                              <Trash2 size={12} />
                              Remove
                            </button>
                          )}
                        </div>

                        {isEditingDraft ? (
                          <div className="mt-3 space-y-3">
                            <input
                              value={block.title}
                              onChange={e => updateDraftBlockText(block.id, {title: e.target.value})}
                              className="w-full rounded-xl border border-[#D6E6FF] bg-white px-3 py-2.5 text-sm font-semibold text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                            />
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]">
                              <label className="text-[11px] font-medium text-[#6B7280]">
                                Date
                                <input
                                  type="date"
                                  value={block.date}
                                  onChange={e => {
                                    if (!e.target.value) return;
                                    updateDraftBlockText(block.id, {date: e.target.value});
                                  }}
                                  className="mt-1 w-full rounded-xl border border-[#D6E6FF] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                                />
                              </label>
                              <label className="text-[11px] font-medium text-[#6B7280]">
                                Start
                                <input
                                  type="time"
                                  value={formatTimeLabel(block.startTime)}
                                  onChange={e => updateDraftBlockStartTime(block.id, e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-[#D6E6FF] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                                />
                              </label>
                              <label className="text-[11px] font-medium text-[#6B7280]">
                                End
                                <input
                                  type="time"
                                  value={formatTimeLabel(block.endTime)}
                                  onChange={e => updateDraftBlockEndTime(block.id, e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-[#D6E6FF] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#BFDBFE] focus:ring-4 focus:ring-[#DBEAFE]/70"
                                />
                              </label>
                              <div className="text-[11px] font-medium text-[#6B7280]">
                                Duration
                                <div className="mt-1 rounded-xl border border-[#D6E6FF] bg-white px-3 py-2 text-sm text-[#111827]">
                                  {formatDurationLabel(block.durationMinutes)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[#111827]">{block.title}</div>
                            </div>
                            <div className="shrink-0 text-xs font-medium text-[#4B5563]">
                              {formatDurationLabel(block.durationMinutes)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {isEditingDraft && (
                  <button
                    type="button"
                    onClick={addDraftBlock}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  >
                    <Plus size={14} />
                    Add session
                  </button>
                )}
              </section>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {!isEditingDraft ? (
                <>
                  <button
                    type="button"
                    onClick={() => void saveDraftToCalendar()}
                    disabled={saving || draftPlan.proposedBlocks.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(37,99,235,0.7)] transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save to calendar'}
                  </button>
                  <button
                    type="button"
                    onClick={startEditingDraft}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  >
                    <PencilLine size={14} />
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={saveDraftChanges}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(37,99,235,0.7)] transition hover:bg-[#1E40AF]"
                  >
                    <Save size={14} />
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={cancelDraftChanges}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => void runGeneration()}
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6 md:space-y-8">
          <div className="flex items-center">
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

          {viewMode === 'calendar' ? (
            !hasCalendarContent && isFullyEmpty ? (
              <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white/80 shadow-[0_4px_40px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <CalendarEmptyState onSetupSchedule={() => setShowMySchedule(true)} />
              </div>
            ) : (
              <CalendarView items={calendarItems} deadline={latestDeadline} onUpdate={updateItem} onDelete={deleteItem} onQuickAdd={handleQuickAdd} onSlotCreate={handleSlotCreate} onCommitRecurringDrop={handleCommitRecurringDrop} onUndoRecurringDrop={handleUndoRecurringDrop} />
            )
          ) : (
            <div className="rounded-3xl border border-black/[0.06] bg-white/80 p-5 shadow-[0_4px_40px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-7">
              <div className="space-y-3 pb-1">
                {dayGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.08] bg-white/50 p-7 text-center text-[13px] text-[#9CA3AF] backdrop-blur-sm">
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
            </div>
          )}

          <TodayAtAGlance items={calendarItems} onUpdate={updateItem} onDelete={deleteItem} />
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-[220] rounded-xl bg-black px-3 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      {showManageEvents && (
        <ManageEventsModal
          items={items}
          onAdd={handleSaveQuickBlock}
          onDelete={deleteItem}
          onClose={() => setShowManageEvents(false)}
        />
      )}

      {showMySchedule && (
        <MyScheduleScreen
          blocks={recurringBlocks}
          exceptions={recurringExceptions}
          imports={scheduleImports}
          subjectColorMap={subjectColorMap}
          initialTab="add"
          initialChoice={myScheduleInitialChoice}
          directEntry={myScheduleInitialChoice !== null}
          onClose={() => {
            setShowMySchedule(false);
            setMyScheduleInitialChoice(null);
            void refreshRecurringData();
          }}
          onDeleteBlock={async id => {
            // Optimistic remove so the UI responds instantly.
            setRecurringBlocks(prev => prev.filter(b => b.id !== id));
            try {
              await deleteRecurringBlock(id);
            } catch {
              // Restore on failure and tell the user.
              await refreshRecurringData();
              setToast("Couldn't delete this routine. Please try again.");
            }
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
