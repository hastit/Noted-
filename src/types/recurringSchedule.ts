export type RecurringColorCategory = 'study' | 'work' | 'sport' | 'personal' | 'default';

export type RecurringScheduleBlock = {
  id: string;
  userId: string;
  title: string;
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  colorCategory: RecurringColorCategory;
  customColor?: string | null;
  importId?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
};

export type RecurringExceptionType = 'skip' | 'modify';

export type RecurringScheduleException = {
  id: string;
  userId: string;
  recurringBlockId: string;
  exceptionDate: string;
  type: RecurringExceptionType;
  modifiedStartTime: string | null;
  modifiedEndTime: string | null;
  modifiedTitle: string | null;
  modifiedDate: string | null;
  createdAt: string;
};

export type DraftRecurringEvent = {
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  colorCategory: RecurringColorCategory;
};

export type ExpandedRecurringOccurrence = {
  id: string;
  recurringBlockId: string;
  title: string;
  date: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  colorCategory: RecurringColorCategory;
  customColor?: string | null;
  importId?: string | null;
  source: 'recurring';
};

export type SubjectColor = {
  id: string;
  userId: string;
  subjectTitle: string;
  colorHex: string;
  createdAt: string;
};

export type ScheduleImport = {
  id: string;
  userId: string;
  scheduleName: string;
  importDate: string;
  sourceType: 'image' | 'pdf' | 'manual';
  eventCount: number;
  createdAt: string;
};
