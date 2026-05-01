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
};

export type DayScheduleGroup = {
  date: string;
  items: ScheduledBlock[];
};
