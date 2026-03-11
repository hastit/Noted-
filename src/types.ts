export type TaskStatus = 'todo' | 'started' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  importance: 1 | 2 | 3 | 4 | 5;
  status: TaskStatus;
  startedAt?: string;
  finishedAt?: string;
  notebookId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  notebookId: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  title: string;
  color: string;
  emoji?: string;
  folderId?: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface PDFFile {
  id: string;
  title: string;
  url: string;
  folderId: string;
  uploadedAt: string;
}

export interface Folder {
  id: string;
  title: string;
  color?: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  textColor: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: number; // Minutes from midnight
  endTime: number; // Minutes from midnight
  tagId: string;
  location?: string;
}

export type TabType = 'dashboard' | 'tasks' | 'notes' | 'calendar' | 'settings';
