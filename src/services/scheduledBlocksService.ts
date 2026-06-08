import {supabase} from '../lib/supabase';
import type {ScheduledBlock} from '../types/scheduler';

type ScheduledBlockRow = {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  reasoning: string | null;
  source: string;
};

function toIso(date: string, startTime: number) {
  const h = String(Math.floor(startTime / 60)).padStart(2, '0');
  const m = String(startTime % 60).padStart(2, '0');
  return `${date}T${h}:${m}:00.000Z`;
}

function rowToBlock(row: ScheduledBlockRow): ScheduledBlock {
  // start_time is stored as UTC (toIso appends Z); use UTC accessors to match.
  const d = new Date(row.start_time);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const startMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return {
    id: row.id,
    title: row.title,
    date: `${y}-${mo}-${day}`,
    startTime: startMinutes,
    durationMinutes: row.duration_minutes,
    endTime: startMinutes + row.duration_minutes,
    source: row.source === 'task' ? 'task' : 'ai',
    reasoning: row.reasoning ?? undefined,
  };
}

export async function fetchAllBlocks(): Promise<ScheduledBlock[]> {
  const {data, error} = await supabase
    .from('scheduled_blocks')
    .select('id,user_id,title,start_time,duration_minutes,reasoning,source')
    .order('start_time', {ascending: true});
  if (error) throw new Error('Unable to load scheduled blocks.');
  return (data as ScheduledBlockRow[]).map(rowToBlock);
}

export async function createBlocks(blocks: ScheduledBlock[]): Promise<ScheduledBlock[]> {
  if (!blocks.length) return [];
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const payload = blocks.map(b => ({
    user_id: user.id,
    title: b.title,
    start_time: toIso(b.date, b.startTime),
    duration_minutes: b.durationMinutes,
    reasoning: b.reasoning ?? null,
    source: b.source ?? 'ai',
  }));

  const {data, error} = await supabase
    .from('scheduled_blocks')
    .insert(payload)
    .select('id,user_id,title,start_time,duration_minutes,reasoning,source');
  if (error) throw new Error('Unable to save scheduled blocks.');
  return (data as ScheduledBlockRow[]).map(rowToBlock);
}

export async function updateBlock(id: string, changes: Partial<ScheduledBlock>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (changes.title !== undefined) patch.title = changes.title;
  if (changes.durationMinutes !== undefined) patch.duration_minutes = changes.durationMinutes;
  if (changes.reasoning !== undefined) patch.reasoning = changes.reasoning ?? null;
  if (changes.source !== undefined) patch.source = changes.source;

  if (changes.date !== undefined && changes.startTime !== undefined) {
    // Both provided (drag-and-drop) — compute directly without an extra round-trip.
    patch.start_time = toIso(changes.date, changes.startTime);
  } else if (changes.date !== undefined || changes.startTime !== undefined) {
    // Only one provided — fetch the missing component from DB.
    const {data, error} = await supabase
      .from('scheduled_blocks')
      .select('start_time')
      .eq('id', id)
      .single();
    if (error) throw new Error('Unable to update scheduled block.');
    const current = new Date((data as {start_time: string}).start_time);
    const existingDate = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
    const existingStart = current.getUTCHours() * 60 + current.getUTCMinutes();
    patch.start_time = toIso(changes.date ?? existingDate, changes.startTime ?? existingStart);
  }

  if (Object.keys(patch).length === 0) return;
  const {error} = await supabase.from('scheduled_blocks').update(patch).eq('id', id);
  if (error) throw new Error('Unable to update scheduled block.');
}

export async function deleteBlock(id: string): Promise<void> {
  const {error} = await supabase.from('scheduled_blocks').delete().eq('id', id);
  if (error) throw new Error('Unable to delete scheduled block.');
}

export async function deleteAllBlocks(): Promise<void> {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const {error} = await supabase.from('scheduled_blocks').delete().eq('user_id', user.id);
  if (error) throw new Error('Unable to replace scheduled blocks right now.');
}
