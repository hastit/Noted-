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
    gradient: 'linear-gradient(135deg, #F57799 0%, #dbba95 52%, #FAAC68 100%)',
    orbA: 'radial-gradient(circle, #ffd8e7, transparent)',
    orbB: 'radial-gradient(circle, #ffe7bf, transparent)',
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    gradient: 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)',
    orbA: 'radial-gradient(circle, #8EA3FF, transparent)',
    orbB: 'radial-gradient(circle, #A97BFF, transparent)',
  },
  {
    id: 'lime-sorbet',
    name: 'Lime sorbet',
    gradient: 'linear-gradient(135deg, #D4FC79 0%, #96E6A1 100%)',
    orbA: 'radial-gradient(circle, #D4FC79, transparent)',
    orbB: 'radial-gradient(circle, #96E6A1, transparent)',
  },
  {
    id: 'aqua-mist',
    name: 'Aqua mist',
    gradient: 'linear-gradient(135deg, #2BC0E4 0%, #EAECC6 100%)',
    orbA: 'radial-gradient(circle, #2BC0E4, transparent)',
    orbB: 'radial-gradient(circle, #EAECC6, transparent)',
  },
  {
    id: 'deep-ocean',
    name: 'Deep ocean',
    gradient: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 55%, #0F3460 100%)',
    orbA: 'radial-gradient(circle, #1f3e72, transparent)',
    orbB: 'radial-gradient(circle, #2e3158, transparent)',
  },
  {
    id: 'cosmic-void',
    name: 'Cosmic void',
    gradient: 'linear-gradient(135deg, #0F0C29 0%, #302B63 55%, #24243E 100%)',
    orbA: 'radial-gradient(circle, #3d3579, transparent)',
    orbB: 'radial-gradient(circle, #2b284d, transparent)',
  },
];

export const DEFAULT_DASHBOARD_THEME: DashboardThemeId = 'sunset';

export function getDashboardTheme(themeId: DashboardThemeId): DashboardTheme {
  return DASHBOARD_THEMES.find(t => t.id === themeId) ?? DASHBOARD_THEMES[0];
}
