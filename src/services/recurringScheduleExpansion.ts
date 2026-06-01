import type {
  DraftRecurringEvent,
  ExpandedRecurringOccurrence,
  RecurringScheduleBlock,
  RecurringScheduleException,
} from '../types/recurringSchedule';

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(value: number) {
  const h = String(Math.floor(value / 60)).padStart(2, '0');
  const m = String(value % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`);
}

export function splitOvernightDraft(event: DraftRecurringEvent): DraftRecurringEvent[] {
  const start = parseTimeToMinutes(event.startTime);
  const end = parseTimeToMinutes(event.endTime);
  if (start < end) return [event];
  const nextDay = (event.dayOfWeek + 1) % 7;
  return [
    {...event, endTime: '24:00'},
    {...event, dayOfWeek: nextDay, startTime: '00:00'},
  ];
}

export function applyExceptions(
  occurrence: ExpandedRecurringOccurrence,
  exception: RecurringScheduleException | undefined,
): ExpandedRecurringOccurrence | null {
  if (!exception) return occurrence;
  if (exception.type === 'skip') return null;
  const nextStart = exception.modifiedStartTime ? parseTimeToMinutes(exception.modifiedStartTime) : occurrence.startTime;
  const nextEnd = exception.modifiedEndTime ? parseTimeToMinutes(exception.modifiedEndTime) : occurrence.endTime;
  return {
    ...occurrence,
    date: exception.modifiedDate ?? occurrence.date,
    title: exception.modifiedTitle ?? occurrence.title,
    startTime: nextStart,
    endTime: nextEnd,
    durationMinutes: Math.max(0, nextEnd - nextStart),
  };
}

export function expandRecurringBlocksForRange(
  blocks: RecurringScheduleBlock[],
  exceptions: RecurringScheduleException[],
  rangeStart: string,
  rangeEnd: string,
): ExpandedRecurringOccurrence[] {
  const result: ExpandedRecurringOccurrence[] = [];
  const exceptionMap = new Map<string, RecurringScheduleException>();
  for (const ex of exceptions) {
    exceptionMap.set(`${ex.recurringBlockId}__${ex.exceptionDate}`, ex);
  }

  const start = dateFromYmd(rangeStart);
  const end = dateFromYmd(rangeEnd);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = toDateOnly(cursor);
    const dayOfWeek = cursor.getDay();
    for (const block of blocks) {
      if (block.dayOfWeek !== dayOfWeek) continue;
      if (date < block.startDate) continue;
      if (block.endDate && date > block.endDate) continue;

      const startMins = parseTimeToMinutes(block.startTime);
      const endMins = parseTimeToMinutes(block.endTime);
      if (endMins <= startMins) continue;

      const occurrence: ExpandedRecurringOccurrence = {
        id: `rec__${block.id}__${date}`,
        recurringBlockId: block.id,
        title: block.title,
        date,
        startTime: startMins,
        endTime: endMins,
        durationMinutes: endMins - startMins,
        colorCategory: block.colorCategory,
        customColor: block.customColor ?? null,
        importId: block.importId ?? null,
        source: 'recurring',
      };

      const key = `${block.id}__${date}`;
      const withException = applyExceptions(occurrence, exceptionMap.get(key));
      if (withException && withException.durationMinutes > 0) result.push(withException);
    }
  }

  return result.sort((a, b) => (a.date === b.date ? a.startTime - b.startTime : a.date.localeCompare(b.date)));
}

export function normalizeRecurringDraftTimes(event: DraftRecurringEvent): DraftRecurringEvent {
  const start = parseTimeToMinutes(event.startTime);
  const end = parseTimeToMinutes(event.endTime);
  return {
    ...event,
    startTime: minutesToTime(Math.max(0, Math.min(23 * 60 + 59, start))),
    endTime: minutesToTime(Math.max(0, Math.min(24 * 60, end))),
  };
}
