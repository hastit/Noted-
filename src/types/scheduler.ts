export type AISubtask = {
  title: string;
  estimated_minutes: number;
  suggested_day?: string;
};

export type AIPlanResponse = {
  subtasks: AISubtask[];
  deadline: string;
  reasoning: string;
};

export type CalendarTag = {
  id: string;
  name: string;
  color: string; // hex e.g. #6366F1
};

export type ScheduledBlock = {
  id: string;
  title: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  startTime: number; // Minutes from midnight
  endTime: number; // Minutes from midnight
  reasoning?: string;
  customColor?: string;
  colorCategory?: string;
  source: 'ai' | 'task' | 'recurring';
  tagId?: string; // references a CalendarTag.id
};

export type DayScheduleGroup = {
  date: string;
  items: ScheduledBlock[];
};
