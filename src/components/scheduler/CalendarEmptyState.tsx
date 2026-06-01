import {CalendarPlus, Sparkles} from 'lucide-react';

type Props = {
  onSetupSchedule: () => void;
};

export default function CalendarEmptyState({onSetupSchedule}: Props) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-400 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.28)]">
        <CalendarPlus size={26} />
      </div>
      <p className="text-[15px] font-medium text-[#111827]">Your calendar is empty</p>
      <p className="mt-2 max-w-xs text-[13px] leading-6 text-[#9CA3AF]">
        Generate a schedule above to see it come to life, or set up your weekly routines below.
      </p>
      <button
        type="button"
        onClick={onSetupSchedule}
        className="mt-6 inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.08] bg-white/70 px-4 py-2 text-[12.5px] font-semibold text-[#374151] shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all hover:bg-white/95 hover:shadow-[0_4px_14px_rgba(0,0,0,0.09)]"
      >
        <Sparkles size={13} />
        Set up weekly schedule
      </button>
    </div>
  );
}
