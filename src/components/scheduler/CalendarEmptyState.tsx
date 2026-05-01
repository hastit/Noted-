import {CalendarPlus, Sparkles} from 'lucide-react';

type Props = {
  onSetupSchedule: () => void;
};

export default function CalendarEmptyState({onSetupSchedule}: Props) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#3B82F6]">
        <CalendarPlus size={28} />
      </div>
      <p className="text-base font-medium text-[#1F2937]">Your calendar is empty. Generate a schedule above to see it come to life ✨</p>
      <p className="mt-2 text-[13px] text-[#6B7280]">Or set up your weekly schedule for recurring events</p>
      <button
        type="button"
        onClick={onSetupSchedule}
        className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#374151] shadow-sm transition hover:bg-[#F9FAFB]"
      >
        <Sparkles size={14} />
        Set up weekly schedule
      </button>
    </div>
  );
}
