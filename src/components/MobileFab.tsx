import React from 'react';
import {Plus} from 'lucide-react';

type Props = {
  onClick: () => void;
  label: string;
  className?: string;
};

/** Compact action button for narrow layouts — sits bottom-right without a bottom tab bar. */
export default function MobileFab({onClick, label, className = ''}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`md:hidden fixed z-[90] flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20 active:scale-95 transition-transform bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-3 ${className}`}
    >
      <Plus size={20} strokeWidth={2.25} />
    </button>
  );
}
