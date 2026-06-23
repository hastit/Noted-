import type {ScheduledBlock} from '../types/scheduler';
import {categorizeBlock, styleFromRecurringCategory} from './blockCategories';

export type BlockVisualStyle = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
};

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function toPastel(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#F1F5F9';
  const r = Math.round(rgb.r * amount + 255 * (1 - amount));
  const g = Math.round(rgb.g * amount + 255 * (1 - amount));
  const b = Math.round(rgb.b * amount + 255 * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

export function toRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/** Shared block colours — week grid + day timeline use the same rules (tags, source, recurring). */
export function getBlockVisualStyle(item: ScheduledBlock): BlockVisualStyle {
  const isRecurring = item.source === 'recurring';
  const categoryStyle = isRecurring
    ? styleFromRecurringCategory(item.colorCategory)
    : categorizeBlock(item.title);
  const customColor =
    item.customColor && /^#[0-9A-Fa-f]{6}$/.test(item.customColor) ? item.customColor : null;

  let backgroundColor = categoryStyle.bg;
  let borderColor = categoryStyle.border;
  let textColor = categoryStyle.text;
  let accentColor: string = categoryStyle.border;

  if (isRecurring) {
    const base = customColor ?? categoryStyle.border;
    backgroundColor = toPastel(base, 0.15);
    borderColor = toRgba(base, 0.25);
    accentColor = base;
    textColor = '#1e293b';
  } else if (customColor) {
    backgroundColor = toPastel(customColor, 0.12);
    borderColor = toRgba(customColor, 0.28);
    accentColor = customColor;
    textColor = '#1e293b';
  } else if (item.source === 'ai') {
    backgroundColor = '#EEEEFF';
    borderColor = '#C4C4FA';
    accentColor = '#6366F1';
    textColor = '#312E81';
  } else if (item.source === 'task') {
    backgroundColor = '#FFF8EE';
    borderColor = '#FDE4A0';
    accentColor = '#D97706';
    textColor = '#78350F';
  }

  return {backgroundColor, borderColor, textColor, accentColor};
}
