import {supabase} from './supabase';
import type {QuickNote} from '../types';

type QuickNoteRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  last_used_at: string;
};

function rowToQuickNote(row: QuickNoteRow): QuickNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function getQuickNotes(): Promise<QuickNote[]> {
  const {data, error} = await supabase
    .from('quick_notes')
    .select('*')
    .order('last_used_at', {ascending: false});
  if (error) throw error;
  return (data as QuickNoteRow[]).map(rowToQuickNote);
}

export async function upsertQuickNote(q: QuickNote): Promise<void> {
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const {error} = await supabase.from('quick_notes').upsert({
    id: q.id,
    user_id: user.id,
    title: q.title,
    content: q.content,
    color: q.color,
    created_at: q.createdAt,
    last_used_at: q.lastUsedAt,
  });
  if (error) throw error;
}

export async function deleteQuickNote(id: string): Promise<void> {
  const {error} = await supabase.from('quick_notes').delete().eq('id', id);
  if (error) throw error;
}
