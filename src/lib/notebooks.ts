import {supabase} from './supabase';
import type {Notebook} from '../types';

type NotebookRow = {
  id: string;
  user_id: string;
  title: string;
  color: string;
  emoji: string | null;
  folder_id: string | null;
  created_at: string;
  last_used_at: string;
};

function rowToNotebook(row: NotebookRow): Notebook {
  return {
    id: row.id,
    title: row.title,
    color: row.color,
    emoji: row.emoji ?? undefined,
    folderId: row.folder_id ?? undefined,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function getNotebooks(): Promise<Notebook[]> {
  const {data, error} = await supabase
    .from('notebooks')
    .select('*')
    .order('last_used_at', {ascending: false});
  if (error) throw error;
  return (data as NotebookRow[]).map(rowToNotebook);
}

export async function upsertNotebook(nb: Notebook): Promise<void> {
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const {error} = await supabase.from('notebooks').upsert({
    id: nb.id,
    user_id: user.id,
    title: nb.title,
    color: nb.color,
    emoji: nb.emoji ?? null,
    folder_id: nb.folderId ?? null,
    created_at: nb.createdAt,
    last_used_at: nb.lastUsedAt,
  });
  if (error) throw error;
}

export async function deleteNotebook(id: string): Promise<void> {
  const {error} = await supabase.from('notebooks').delete().eq('id', id);
  if (error) throw error;
}
