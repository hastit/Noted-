import {supabase} from '../lib/supabase';

export type PinNote = {
  id: string;
  user_id: string;
  content: string;
  color: string;
  x_pct: number;
  y_pct: number;
  rotation: number;
  created_at: string;
};

export type PinNoteInsert = Omit<PinNote, 'id' | 'user_id' | 'created_at'>;

export async function fetchPinNotes(): Promise<PinNote[]> {
  const {data, error} = await supabase
    .from('pin_wall_notes')
    .select('*')
    .order('created_at', {ascending: true});
  if (error) throw error;
  return data ?? [];
}

export async function createPinNote(note: PinNoteInsert): Promise<PinNote> {
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const {data, error} = await supabase
    .from('pin_wall_notes')
    .insert({...note, user_id: user.id})
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePinNote(id: string, patch: Partial<PinNoteInsert>): Promise<void> {
  const {error} = await supabase
    .from('pin_wall_notes')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deletePinNote(id: string): Promise<void> {
  const {error} = await supabase
    .from('pin_wall_notes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
