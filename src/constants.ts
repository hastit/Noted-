import { Task, Notebook, Note, Folder, Tag, CalendarEvent, QuickNote } from './types';

export const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Design', color: 'bg-[#C2D9FF]', textColor: 'text-[#1E3A8A]' },
  { id: '2', name: 'Development', color: 'bg-[#D1C4FF]', textColor: 'text-[#4C1D95]' },
  { id: '3', name: 'Personal', color: 'bg-[#FFD9A0]', textColor: 'text-[#92400E]' },
  { id: '4', name: 'Onboarding', color: 'bg-[#B4F4C0]', textColor: 'text-[#065F46]' },
  { id: '5', name: 'Meeting', color: 'bg-[#FFC2E2]', textColor: 'text-[#9D174D]' },
];

export const MOCK_EVENTS: CalendarEvent[] = [];

export const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Advanced Calculus Assignment',
    description: 'Complete problems 1-15 from Chapter 4',
    dueDate: '2026-03-01',
    importance: 5,
    status: 'todo',
  },
  {
    id: '2',
    title: 'History Essay Draft',
    description: 'First draft of the Industrial Revolution essay',
    dueDate: '2026-03-05',
    importance: 4,
    status: 'started',
    startedAt: '2026-02-25',
  },
  {
    id: '3',
    title: 'Biology Lab Report',
    description: 'Cellular respiration experiment results',
    dueDate: '2026-02-28',
    importance: 3,
    status: 'done',
    startedAt: '2026-02-20',
    finishedAt: '2026-02-24',
  },
];

export const MOCK_NOTEBOOKS: Notebook[] = [
  { id: 'nb1', title: 'Mathematics', color: '#DDE6FF', folderId: 'f1', createdAt: '2026-02-10', lastUsedAt: '2026-02-28', notesCount: 12 },
  { id: 'nb2', title: 'History', color: '#FFF9E7', folderId: 'f1', createdAt: '2026-02-12', lastUsedAt: '2026-02-27', notesCount: 8 },
  { id: 'nb3', title: 'Biology', color: '#D9FFF3', folderId: 'f2', createdAt: '2026-02-15', lastUsedAt: '2026-02-25', notesCount: 15 },
  { id: 'nb4', title: 'Literature', color: '#FFD9DC', folderId: 'f2', createdAt: '2026-02-20', lastUsedAt: '2026-02-28', notesCount: 4 },
];

export const MOCK_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Derivatives Basics',
    content: JSON.stringify([
      { id: 'b1', type: 'h1', content: 'Derivatives Basics' },
      { id: 'b2', type: 'text', content: 'The derivative of a function measures the sensitivity to change of the function value with respect to a change in its argument. Derivatives are a fundamental tool of calculus.' },
      { id: 'b3', type: 'h2', content: 'Formal Definition' },
      { id: 'b4', type: 'text', content: 'For a real-valued function of a single real variable, the derivative of a function at a point is the slope of the tangent line to the graph of the function at that point.' }
    ]),
    notebookId: 'nb1',
    updatedAt: '2026-02-25',
  },
];

export const MOCK_FOLDERS: Folder[] = [
  { id: 'f1', title: 'Movie Review', color: '#DDE6FF', createdAt: '2026-03-01', lastUsedAt: '2026-03-05' },
  { id: 'f2', title: 'Class Notes', color: '#FFD9DC', createdAt: '2026-03-02', lastUsedAt: '2026-03-04' },
  { id: 'f3', title: 'Book Lists', color: '#FFF9E7', createdAt: '2026-03-03', lastUsedAt: '2026-03-05' },
  { id: 'f4', title: 'Design', color: '#D9FFF3', createdAt: '2026-03-04', lastUsedAt: '2026-03-05' },
];

export const MOCK_QUICK_NOTES: QuickNote[] = [
  {
    id: 'qn1',
    title: 'Mid test exam',
    content: 'Ultrices viverra odio congue lecos felis, libero egestas nunc sagi are masa, elit ornare eget sem veib in ulum.',
    color: '#FFF9E7',
    createdAt: '2026-03-05T10:30:00Z',
    lastUsedAt: '2026-03-05T10:30:00Z'
  },
  {
    id: 'qn2',
    title: 'Mid test exam',
    content: 'Ultrices viverra odio congue lecos felis, libero egestas nunc sagi are masa, elit ornare eget sem veib in ulum.',
    color: '#FFD9DC',
    createdAt: '2026-03-05T10:30:00Z',
    lastUsedAt: '2026-03-05T10:30:00Z'
  },
  {
    id: 'qn3',
    title: 'Jonas\'s notes',
    content: 'Rokity viverra odio congue lecos felis, libero egestas nunc sagi are masa, elit ornare eget sem veib in ulum.',
    color: '#DDE6FF',
    createdAt: '2026-03-04T16:30:00Z',
    lastUsedAt: '2026-03-04T16:30:00Z'
  }
];
