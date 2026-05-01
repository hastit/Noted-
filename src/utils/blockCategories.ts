import type {RecurringColorCategory} from '../types/recurringSchedule';

export type BlockCategoryStyle = {
  bg: string;
  text: string;
  border: string;
};

const CATEGORY_MAP: Array<{keywords: string[]; style: BlockCategoryStyle}> = [
  {
    keywords: ['study', 'exam', 'homework', 'read', 'notes', 'flashcards', 'review', 'quiz'],
    style: {bg: '#E9E5FF', text: '#4C3FB8', border: '#CEC7FF'},
  },
  {
    keywords: ['work', 'meeting', 'email', 'project', 'deadline', 'task'],
    style: {bg: '#CDEFF8', text: '#1D6D85', border: '#A7DFF0'},
  },
  {
    keywords: ['workout', 'gym', 'run', 'exercise', 'sport', 'yoga'],
    style: {bg: '#FED7AA', text: '#9A3412', border: '#FDBA74'},
  },
  {
    keywords: ['personal', 'errand', 'appointment', 'call', 'grocery'],
    style: {bg: '#F7D4F4', text: '#9D4893', border: '#F0B8EB'},
  },
];

const DEFAULT_STYLE: BlockCategoryStyle = {
  bg: '#F3F4F6',
  text: '#374151',
  border: '#D1D5DB',
};

const CATEGORY_STYLE_BY_KEY: Record<RecurringColorCategory, BlockCategoryStyle> = {
  study: {bg: '#E9E5FF', text: '#4C3FB8', border: '#CEC7FF'},
  work: {bg: '#CDEFF8', text: '#1D6D85', border: '#A7DFF0'},
  sport: {bg: '#FED7AA', text: '#9A3412', border: '#FDBA74'},
  personal: {bg: '#F7D4F4', text: '#9D4893', border: '#F0B8EB'},
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
