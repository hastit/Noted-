import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import type {TabType} from '../types';
import {useLanguage} from '../context/LanguageContext';

const NAV_ITEMS: {id: TabType; icon: typeof LayoutDashboard}[] = [
  {id: 'dashboard', icon: LayoutDashboard},
  {id: 'notes', icon: BookOpen},
  {id: 'tasks', icon: CheckSquare},
  {id: 'calendar', icon: CalendarIcon},
  {id: 'settings', icon: SettingsIcon},
];

type Props = {
  active: TabType;
  onChange: (tab: TabType) => void;
  hidden?: boolean;
};

export default function MobileBottomNav({active, onChange, hidden}: Props) {
  const {t} = useLanguage();
  if (hidden) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-[130] max-h-14 border-t border-black/[0.06] bg-[#fdfdfd]/98 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] pt-0.5 pointer-events-auto"
      aria-label="Navigation principale"
    >
      <div className="flex h-14 max-h-14 items-stretch justify-around gap-0 px-1 max-w-lg mx-auto">
        {NAV_ITEMS.map(({id, icon: Icon}) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 active:opacity-80"
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.25 : 1.65}
                className={isActive ? 'text-[#1d4ed8]' : 'text-black/38'}
              />
              <span
                className={`truncate px-0.5 max-w-full text-[10px] font-medium leading-tight ${
                  isActive ? 'text-[#1d4ed8]' : 'text-black/40'
                }`}
              >
                {t(id)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
