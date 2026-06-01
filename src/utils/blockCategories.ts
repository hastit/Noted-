import type {RecurringColorCategory} from '../types/recurringSchedule';

export type BlockCategoryStyle = {
  bg: string;
  text: string;
  border: string;
};

const CATEGORY_MAP: Array<{keywords: string[]; style: BlockCategoryStyle}> = [
  {
    keywords: ['study', 'exam', 'homework', 'read', 'notes', 'flashcards', 'review', 'quiz'],
    style: {bg: '#EEEEFF', text: '#3730A3', border: '#C4C4FA'},
  },
  {
    keywords: ['work', 'meeting', 'email', 'project', 'deadline', 'task'],
    style: {bg: '#E0F7FA', text: '#0E7490', border: '#A5E8F5'},
  },
  {
    keywords: ['workout', 'gym', 'run', 'exercise', 'sport', 'yoga'],
    style: {bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD'},
  },
  {
    keywords: ['personal', 'errand', 'appointment', 'call', 'grocery'],
    style: {bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3'},
  },
];

const DEFAULT_STYLE: BlockCategoryStyle = {
  bg: '#F1F5F9',
  text: '#475569',
  border: '#CBD5E1',
};

const CATEGORY_STYLE_BY_KEY: Record<RecurringColorCategory, BlockCategoryStyle> = {
  study: {bg: '#EEEEFF', text: '#3730A3', border: '#C4C4FA'},
  work: {bg: '#E0F7FA', text: '#0E7490', border: '#A5E8F5'},
  sport: {bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD'},
  personal: {bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3'},
  default: DEFAULT_STYLE,
};

export function categorizeBlock(title: string): BlockCategoryStyle {
  const normalized = title.toLowerCase();
  const match = CATEGORY_MAP.find(entry => entry.keywords.some(keyword => normalized.includes(keyword)));
  return match?.style ?? DEFAULT_STYLE;
}

export function styleFromRecurringCategory(category?: string): BlockCategoryStyle {
  if (!category) return DEFAULT_STYLE;
  return CATEGORY_STYLE_BY_KEY[category as RecurringColorCategory] ?? DEFAULT_STYLE;
}
