import type {CalendarEvent, Task} from '../types';
import type {AISubtask, DayScheduleGroup, ScheduledBlock} from '../types/scheduler';

export type TimePreference = 'morning' | 'afternoon' | 'evening' | 'spread';

type BusySlot = {date: string; start: number; end: number};

export type OccupiedSlot = {date: string; startTime: number; endTime: number};

const STEP = 15;

// Time bands in minutes from midnight
const BANDS: Record<string, [number, number]> = {
  morning:   [8 * 60,  13 * 60],
  afternoon: [13 * 60, 18 * 60],
  evening:   [18 * 60, 21 * 60],
};

const BAND_ORDER_BY_PREF: Record<TimePreference, Array<[number, number]>> = {
  morning:   [BANDS.morning, BANDS.afternoon, BANDS.evening],
  afternoon: [BANDS.afternoon, BANDS.morning, BANDS.evening],
  evening:   [BANDS.evening, BANDS.afternoon, BANDS.morning],
  // spread cycles: task 0 → morning-first, task 1 → afternoon-first, task 2 → evening-first
  spread:    [BANDS.morning, BANDS.afternoon, BANDS.evening],
};

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function previousDay(date: string) {
  const d = toDate(date);
  d.setDate(d.getDate() - 1);
  return fmtDate(d);
}

function nextDay(date: string) {
  const d = toDate(date);
  d.setDate(d.getDate() + 1);
  return fmtDate(d);
}

function clampDate(date: string, min: string, max: string) {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function addBusySlot(slots: BusySlot[], slot: BusySlot) {
  slots.push(slot);
}

function collides(slots: BusySlot[], date: string, start: number, end: number) {
  return slots.some(s => s.date === date && !(end <= s.start || start >= s.end));
}

export function slotsOverlap(a: OccupiedSlot, b: OccupiedSlot): boolean {
  if (a.date !== b.date) return false;
  return !(a.endTime <= b.startTime || a.startTime >= b.endTime);
}

export function findOverlappingBlocks(
  proposed: OccupiedSlot[],
  existing: OccupiedSlot[],
): Array<{proposed: OccupiedSlot; existing: OccupiedSlot}> {
  const hits: Array<{proposed: OccupiedSlot; existing: OccupiedSlot}> = [];
  for (const p of proposed) {
    for (const e of existing) {
      if (slotsOverlap(p, e)) hits.push({proposed: p, existing: e});
    }
  }
  return hits;
}

function occupiedToBusy(slots: OccupiedSlot[]): BusySlot[] {
  return slots.map(s => ({date: s.date, start: s.startTime, end: s.endTime}));
}

function findSlotInBand(
  slots: BusySlot[],
  date: string,
  duration: number,
  bandStart: number,
  bandEnd: number,
  minStart?: number,
): number | null {
  const startFrom =
    minStart !== undefined ? Math.max(bandStart, Math.ceil(minStart / STEP) * STEP) : bandStart;
  for (let start = startFrom; start + duration <= bandEnd; start += STEP) {
    if (!collides(slots, date, start, start + duration)) return start;
  }
  return null;
}

function placeOnDay(
  slots: BusySlot[],
  date: string,
  duration: number,
  bandOrder: Array<[number, number]>,
  minStart?: number,
): {start: number; end: number} | null {
  for (const [bandStart, bandEnd] of bandOrder) {
    const start = findSlotInBand(slots, date, duration, bandStart, bandEnd, minStart);
    if (start !== null) return {start, end: start + duration};
  }
  return null;
}

function getBandOrder(preference: TimePreference, phase: number): Array<[number, number]> {
  if (preference !== 'spread') return BAND_ORDER_BY_PREF[preference];
  const phases: Array<Array<[number, number]>> = [
    [BANDS.morning, BANDS.afternoon, BANDS.evening],
    [BANDS.afternoon, BANDS.evening, BANDS.morning],
    [BANDS.evening, BANDS.morning, BANDS.afternoon],
  ];
  return phases[phase % 3];
}

function listDays(fromDate: string, toDate: string) {
  const days: string[] = [];
  let cursor = fromDate;
  let safety = 0;
  while (cursor <= toDate && safety < 366) {
    days.push(cursor);
    cursor = nextDay(cursor);
    safety += 1;
  }
  return days;
}

export function buildScheduleFromAiPlan(args: {
  subtasks: AISubtask[];
  deadline: string;
  existingEvents: CalendarEvent[];
  existingScheduledBlocks?: OccupiedSlot[];
  recurringBusySlots?: OccupiedSlot[];
  timePreference?: TimePreference;
  /** Earliest start (minutes from midnight) per date — e.g. current time for today. */
  minStartByDate?: Record<string, number>;
}): ScheduledBlock[] {
  const {
    subtasks,
    deadline,
    existingEvents,
    existingScheduledBlocks = [],
    recurringBusySlots = [],
    timePreference = 'spread',
    minStartByDate = {},
  } = args;
  const today = fmtDate(new Date());
  const busy: BusySlot[] = [
    ...existingEvents.map(e => ({date: e.date, start: e.startTime, end: e.endTime})),
    ...occupiedToBusy(existingScheduledBlocks),
    ...occupiedToBusy(recurringBusySlots),
  ];
  const tasks = [...subtasks].sort((a, b) => {
    const aDay = a.suggested_day ?? deadline;
    const bDay = b.suggested_day ?? deadline;
    if (aDay !== bDay) return aDay.localeCompare(bDay);
    return b.estimated_minutes - a.estimated_minutes;
  });
  const blocks: ScheduledBlock[] = [];
  const daysByLoad = new Map<string, number>();
  for (const d of listDays(today, deadline)) daysByLoad.set(d, 0);

  let spreadPhase = 0;

  for (const task of tasks) {
    const duration = Math.max(15, Math.min(8 * 60, Math.round(task.estimated_minutes / 5) * 5));
    const suggested = task.suggested_day && /^\d{4}-\d{2}-\d{2}$/.test(task.suggested_day) ? task.suggested_day : null;
    const preferredDay = clampDate(suggested ?? deadline, today, deadline);

    let candidateDays = [...daysByLoad.entries()]
      .filter(([date]) => date <= preferredDay)
      .sort((a, b) => a[1] - b[1])
      .map(([date]) => date);

    if (!candidateDays.length) candidateDays = [preferredDay];

    const bandOrder = getBandOrder(timePreference, spreadPhase);

    let placement: {date: string; start: number; end: number} | null = null;
    for (const day of candidateDays) {
      const slot = placeOnDay(busy, day, duration, bandOrder, minStartByDate[day]);
      if (slot) {
        placement = {date: day, ...slot};
        break;
      }
    }

    // Fallback: scan backward from deadline, then forward if needed.
    if (!placement) {
      const allBands: Array<[number, number]> = [BANDS.morning, BANDS.afternoon, BANDS.evening];
      let date = deadline;
      let safety = 0;
      while (!placement && safety < 60) {
        const slot = placeOnDay(busy, date, duration, allBands, minStartByDate[date]);
        if (slot) {
          placement = {date, ...slot};
        } else {
          date = previousDay(date);
        }
        safety++;
      }
      if (!placement) {
        date = nextDay(deadline);
        safety = 0;
        while (!placement && safety < 30) {
          const slot = placeOnDay(busy, date, duration, allBands, minStartByDate[date]);
          if (slot) placement = {date, ...slot};
          else date = nextDay(date);
          safety++;
        }
      }
    }

    if (!placement) continue;

    addBusySlot(busy, {date: placement.date, start: placement.start, end: placement.end});
    daysByLoad.set(placement.date, (daysByLoad.get(placement.date) ?? 0) + duration);
    spreadPhase++;
    blocks.push({
      id: `ai-${Math.random().toString(36).slice(2, 10)}`,
      title: task.title,
      durationMinutes: duration,
      date: placement.date,
      startTime: placement.start,
      endTime: placement.end,
      source: 'ai',
    });
  }

  return blocks.sort((a, b) => (a.date === b.date ? a.startTime - b.startTime : a.date.localeCompare(b.date)));
}

export function mapDueTasksToSchedule(tasks: Task[]): ScheduledBlock[] {
  return tasks
    .filter(t => Boolean(t.dueDate))
    .map(t => {
      const start = 12 * 60;
      const duration = 45;
      return {
        id: `task-${t.id}`,
        title: `Task: ${t.title}`,
        durationMinutes: duration,
        date: t.dueDate,
        startTime: start,
        endTime: start + duration,
        source: 'task' as const,
      };
    })
    .sort((a, b) => (a.date === b.date ? a.startTime - b.startTime : a.date.localeCompare(b.date)));
}

export function groupScheduleByDay(items: ScheduledBlock[]): DayScheduleGroup[] {
  const byDay = new Map<string, ScheduledBlock[]>();
  for (const item of items) {
    const existing = byDay.get(item.date) ?? [];
    existing.push(item);
    byDay.set(item.date, existing);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({
      date,
      items: dayItems.sort((a, b) => a.startTime - b.startTime),
    }));
}
