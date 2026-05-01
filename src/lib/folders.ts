import {supabase} from './supabase';
import type {Folder} from '../types';

type FolderRow = {
  id: string;
  user_id: string;
  title: string;
  color: string | null;
  created_at: string;
  last_used_at: string;
};

function rowToFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    title: row.title,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function getFolders(): Promise<Folder[]> {
  const {data, error} = await supabase
    .from('folders')
    .select('*')
    .order('last_used_at', {ascending: false});
  if (error) throw error;
  return (data as FolderRow[]).map(rowToFolder);
}

export async function upsertFolder(f: Folder): Promise<void> {
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const {error} = await supabase.from('folders').upsert({
    id: f.id,
    user_id: user.id,
    title: f.title,
    color: f.color ?? null,
    created_at: f.createdAt,
    last_used_at: f.lastUsedAt,
  });
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const {error} = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}
