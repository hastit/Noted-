import {supabase} from './supabase';
import {packNoteContent, unpackNoteContent} from './noteContentCodec';
import type {Note} from '../types';

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function rowToNote(row: NoteRow): Note {
  const {notebookId, body} = unpackNoteContent(row.content);
  return {
    id: row.id,
    title: row.title,
    content: body,
    notebookId,
    updatedAt: row.updated_at,
  };
}

export async function getNotes(): Promise<Note[]> {
  const {data, error} = await supabase
    .from('notes')
    .select('id,user_id,title,content,created_at,updated_at')
    .order('updated_at', {ascending: false});
  if (error) throw error;
  return (data as NoteRow[]).map(rowToNote);
}

export type CreateNoteInput = Pick<Note, 'title' | 'content' | 'notebookId'>;

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const content = packNoteContent(input.notebookId, input.content);
  const {data, error} = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title: input.title,
      content,
    })
    .select('id,user_id,title,content,created_at,updated_at')
    .single();
  if (error) throw error;
  return rowToNote(data as NoteRow);
}

export async function updateNote(
  id: string,
  partial: Partial<Pick<Note, 'title' | 'content' | 'notebookId'>>,
): Promise<void> {
  const updates: Record<string, string> = {};
  if (partial.title !== undefined) updates.title = partial.title;

  if (partial.content !== undefined || partial.notebookId !== undefined) {
    const {data: row, error: fetchErr} = await supabase
      .from('notes')
      .select('content')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;
    const current = unpackNoteContent((row as {content: string}).content);
    const notebookId = partial.notebookId ?? current.notebookId;
    const body = partial.content ?? current.body;
    updates.content = packNoteContent(notebookId, body);
  }

  const {error} = await supabase.from('notes').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const {error} = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}
