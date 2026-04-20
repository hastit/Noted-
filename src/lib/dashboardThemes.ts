export type DashboardThemeId = 'sunset' | 'ultraviolet' | 'lime-sorbet' | 'aqua-mist' | 'deep-ocean' | 'cosmic-void';

export type DashboardTheme = {
  id: DashboardThemeId;
  name: string;
  gradient: string;
  orbA: string;
  orbB: string;
};

export const DASHBOARD_THEMES: DashboardTheme[] = [
  {
    id: 'sunset',
    name: 'Sunset',
    gradient: 'linear-gradient(135deg, #E84382 0%, #E8954A 45%, #EA580C 100%)',
    orbA: 'radial-gradient(circle at 30% 30%, rgba(255, 99, 146, 0.65), transparent 62%)',
    orbB: 'radial-gradient(circle at 70% 80%, rgba(255, 176, 72, 0.55), transparent 58%)',
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #5B21B6 48%, #7C3AED 100%)',
    orbA: 'radial-gradient(circle at 25% 20%, rgba(129, 161, 255, 0.7), transparent 60%)',
    orbB: 'radial-gradient(circle at 80% 70%, rgba(167, 139, 250, 0.6), transparent 55%)',
  },
  {
    id: 'lime-sorbet',
    name: 'Lime sorbet',
    gradient: 'linear-gradient(135deg, #84CC16 0%, #22C55E 45%, #059669 100%)',
    orbA: 'radial-gradient(circle at 20% 30%, rgba(190, 242, 100, 0.75), transparent 55%)',
    orbB: 'radial-gradient(circle at 75% 75%, rgba(52, 211, 153, 0.55), transparent 55%)',
  },
  {
    id: 'aqua-mist',
    name: 'Aqua mist',
    gradient: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 42%, #14B8A6 100%)',
    orbA: 'radial-gradient(circle at 30% 25%, rgba(34, 211, 238, 0.65), transparent 58%)',
    orbB: 'radial-gradient(circle at 70% 80%, rgba(45, 212, 191, 0.5), transparent 55%)',
  },
  {
    id: 'deep-ocean',
    name: 'Deep ocean',
    gradient: 'linear-gradient(135deg, #0B1220 0%, #0C3566 42%, #075985 100%)',
    orbA: 'radial-gradient(circle at 40% 30%, rgba(37, 99, 235, 0.45), transparent 55%)',
    orbB: 'radial-gradient(circle at 70% 85%, rgba(14, 165, 233, 0.35), transparent 50%)',
  },
  {
    id: 'cosmic-void',
    name: 'Cosmic void',
    gradient: 'linear-gradient(135deg, #0A0618 0%, #3B2F7A 45%, #1E1B4B 100%)',
    orbA: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.55), transparent 58%)',
    orbB: 'radial-gradient(circle at 85% 60%, rgba(139, 92, 246, 0.45), transparent 52%)',
  },
];

export const DEFAULT_DASHBOARD_THEME: DashboardThemeId = 'sunset';

export function getDashboardTheme(themeId: DashboardThemeId): DashboardTheme {
  return DASHBOARD_THEMES.find(t => t.id === themeId) ?? DASHBOARD_THEMES[0];
}
