import {supabase} from './supabase';
import type {Task, TaskStatus} from '../types';

export type TaskMeta = {
  status?: TaskStatus;
  description?: string;
  importance?: 1 | 2 | 3 | 4 | 5;
  notebookId?: string;
  startedAt?: string;
  finishedAt?: string;
};

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
  meta: TaskMeta | null;
};

function rowToTask(row: TaskRow): Task {
  const meta = row.meta ?? {};
  const status: TaskStatus = meta.status ?? (row.is_completed ? 'done' : 'todo');
  return {
    id: row.id,
    title: row.title,
    description: meta.description,
    dueDate: row.due_date ?? new Date().toISOString().split('T')[0],
    importance: (meta.importance ?? 3) as 1 | 2 | 3 | 4 | 5,
    status,
    startedAt: meta.startedAt,
    finishedAt: meta.finishedAt,
    notebookId: meta.notebookId,
  };
}

function taskToRow(task: Omit<Task, 'id'>): {
  title: string;
  is_completed: boolean;
  due_date: string | null;
  meta: TaskMeta;
} {
  const meta: TaskMeta = {
    status: task.status,
    description: task.description,
    importance: task.importance,
    notebookId: task.notebookId,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
  };
  return {
    title: task.title,
    is_completed: task.status === 'done',
    due_date: task.dueDate || null,
    meta,
  };
}

export async function getTasks(): Promise<Task[]> {
  const {data, error} = await supabase
    .from('tasks')
    .select('id,user_id,title,is_completed,due_date,created_at,meta')
    .order('created_at', {ascending: true});
  if (error) throw error;
  return (data as TaskRow[]).map(rowToTask);
}

export async function createTask(data: Omit<Task, 'id'>): Promise<Task> {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const row = taskToRow(data);
  const {data: inserted, error} = await supabase
    .from('tasks')
    .insert({user_id: user.id, ...row})
    .select('id,user_id,title,is_completed,due_date,created_at,meta')
    .single();
  if (error) throw error;
  return rowToTask(inserted as TaskRow);
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<void> {
  const {data: row, error: fe} = await supabase
    .from('tasks')
    .select('id,user_id,title,is_completed,due_date,created_at,meta')
    .eq('id', taskId)
    .single();
  if (fe) throw fe;
  const current = rowToTask(row as TaskRow);
  const merged: Task = {...current, ...data, id: current.id};
  const {id: _rowId, ...forRow} = merged;
  void _rowId;
  const r = taskToRow(forRow);
  const {error} = await supabase
    .from('tasks')
    .update({
      title: r.title,
      is_completed: r.is_completed,
      due_date: r.due_date,
      meta: r.meta,
    })
    .eq('id', taskId);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const {error} = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
