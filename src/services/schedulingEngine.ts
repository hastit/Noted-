import type {CalendarEvent, Task} from '../types';
import type {AISubtask, DayScheduleGroup, ScheduledBlock} from '../types/scheduler';

type BusySlot = {date: string; start: number; end: number};

const DAY_START = 9 * 60;
const DAY_END = 21 * 60;
const STEP = 15;

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

function placeBackward(
  slots: BusySlot[],
  targetDate: string,
  durationMinutes: number,
  earliestDate: string,
): {date: string; start: number; end: number} | null {
  let date = clampDate(targetDate, earliestDate, targetDate);
  let safety = 0;
  while (safety < 365) {
    for (let end = DAY_END; end >= DAY_START + durationMinutes; end -= STEP) {
      const start = end - durationMinutes;
      if (!collides(slots, date, start, end)) return {date, start, end};
    }
    if (date <= earliestDate) break;
    date = previousDay(date);
    safety += 1;
  }
  return null;
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
  recurringBusySlots?: Array<{date: string; startTime: number; endTime: number}>;
}): ScheduledBlock[] {
  const {subtasks, deadline, existingEvents, recurringBusySlots = []} = args;
  const today = fmtDate(new Date());
  const busy: BusySlot[] = existingEvents.map(e => ({date: e.date, start: e.startTime, end: e.endTime}));
  for (const slot of recurringBusySlots) {
    busy.push({date: slot.date, start: slot.startTime, end: slot.endTime});
  }
  const tasks = [...subtasks].sort((a, b) => {
    const aDay = a.suggested_day ?? deadline;
    const bDay = b.suggested_day ?? deadline;
    if (aDay !== bDay) return aDay.localeCompare(bDay);
    return b.estimated_minutes - a.estimated_minutes;
  });
  const blocks: ScheduledBlock[] = [];
  const daysByLoad = new Map<string, number>();
  for (const d of listDays(today, deadline)) daysByLoad.set(d, 0);

  for (const task of tasks) {
    const duration = Math.max(15, Math.min(8 * 60, Math.round(task.estimated_minutes / 5) * 5));
    const suggested = task.suggested_day && /^\d{4}-\d{2}-\d{2}$/.test(task.suggested_day) ? task.suggested_day : null;
    const preferredDay = clampDate(suggested ?? deadline, today, deadline);

    let candidateDays = [...daysByLoad.entries()]
      .filter(([date]) => date <= preferredDay)
      .sort((a, b) => a[1] - b[1])
      .map(([date]) => date);

    if (!candidateDays.length) candidateDays = [preferredDay];

    let placement: {date: string; start: number; end: number} | null = null;
    for (const day of candidateDays) {
      placement = placeBackward(busy, day, duration, today);
      if (placement) break;
    }
    if (!placement) placement = placeBackward(busy, deadline, duration, today);
    if (!placement) {
      blocks.push({
        id: `ai-unfit-${Math.random().toString(36).slice(2, 10)}`,
        title: `${task.title} (couldn't fit)`,
        durationMinutes: duration,
        date: deadline,
        startTime: DAY_END - duration,
        endTime: DAY_END,
        source: 'ai',
      });
      continue;
    }

    addBusySlot(busy, {date: placement.date, start: placement.start, end: placement.end});
    daysByLoad.set(placement.date, (daysByLoad.get(placement.date) ?? 0) + duration);
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
