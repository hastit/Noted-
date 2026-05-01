import React from 'react';
import {Plus} from 'lucide-react';

type Props = {
  onClick: () => void;
  label: string;
  className?: string;
};

/** FAB mobile uniquement — aligné au-dessus de la barre (~56px + safe area). */
export default function MobileFab({onClick, label, className = ''}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`md:hidden fixed z-[90] flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20 active:scale-95 transition-transform bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+8px)] right-3 ${className}`}
    >
      <Plus size={20} strokeWidth={2.25} />
    </button>
  );
}
