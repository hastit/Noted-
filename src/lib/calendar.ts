import {supabase} from './supabase';
import type {CalendarEvent} from '../types';

type EventExtras = {tagId?: string; location?: string; detail?: string};

function parseDescription(raw: string | null): EventExtras {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as EventExtras & {v?: number};
    if (o && typeof o === 'object') return o;
  } catch {
    return {detail: raw};
  }
  return {};
}

function buildDescription(extras: EventExtras): string | null {
  const {tagId, location, detail} = extras;
  if (!tagId && !location && !detail) return null;
  return JSON.stringify({v: 1, tagId, location, detail});
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

function timeToMinutes(t: string | null): number {
  if (!t) return 540;
  const parts = t.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return (h * 60 + m) % 1440;
}

type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
};

function rowToEvent(row: EventRow): CalendarEvent {
  const extras = parseDescription(row.description);
  const start = timeToMinutes(row.start_time);
  const end = row.end_time ? timeToMinutes(row.end_time) : start + 60;
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    startTime: start,
    endTime: end,
    tagId: extras.tagId ?? '1',
    location: extras.location,
  };
}

export async function getEvents(): Promise<CalendarEvent[]> {
  const {data, error} = await supabase
    .from('calendar_events')
    .select('id,user_id,title,description,event_date,start_time,end_time,created_at')
    .order('event_date', {ascending: true});
  if (error) throw error;
  return (data as EventRow[]).map(rowToEvent);
}

export type CreateEventInput = Omit<CalendarEvent, 'id'>;

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const description = buildDescription({
    tagId: input.tagId,
    location: input.location,
  });
  const {data, error} = await supabase
    .from('calendar_events')
    .insert({
      user_id: user.id,
      title: input.title,
      description,
      event_date: input.date,
      start_time: minutesToTime(input.startTime),
      end_time: minutesToTime(input.endTime),
    })
    .select('id,user_id,title,description,event_date,start_time,end_time,created_at')
    .single();
  if (error) throw error;
  return rowToEvent(data as EventRow);
}

export async function updateEvent(id: string, input: Partial<CalendarEvent>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.date !== undefined) patch.event_date = input.date;
  if (input.startTime !== undefined) patch.start_time = minutesToTime(input.startTime);
  if (input.endTime !== undefined) patch.end_time = minutesToTime(input.endTime);

  if (input.tagId !== undefined || input.location !== undefined) {
    const {data: row, error: fe} = await supabase
      .from('calendar_events')
      .select('description')
      .eq('id', id)
      .single();
    if (fe) throw fe;
    const cur = parseDescription((row as {description: string | null}).description);
    const next = {
      ...cur,
      tagId: input.tagId ?? cur.tagId,
      location: input.location !== undefined ? input.location : cur.location,
    };
    patch.description = buildDescription(next);
  }

  const {error} = await supabase.from('calendar_events').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const {error} = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}
