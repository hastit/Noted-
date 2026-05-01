import {CalendarClock} from 'lucide-react';

type Props = {
  recurringCount: number;
  onManage: () => void;
};

export default function RecurringScheduleCard({recurringCount, onManage}: Props) {
  const hasRecurring = recurringCount > 0;
  return (
    <button
      type="button"
      onClick={onManage}
      className="w-full rounded-2xl border border-white/45 bg-white/65 p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_10px_24px_-10px_rgba(0,0,0,0.08)] backdrop-blur-md transition duration-300 hover:scale-[1.01] hover:border-[#DBEAFE] hover:[box-shadow:0_0_0_1px_rgba(96,165,250,0.35),0_18px_34px_-14px_rgba(79,70,229,0.35)] md:p-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3B82F6] shadow-[0_0_0_1px_rgba(219,234,254,0.9),0_10px_20px_-8px_rgba(59,130,246,0.5)]">
          <CalendarClock size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-[#111827]">Your weekly schedule</div>
          <p className="mt-0.5 text-[13px] text-[#6B7280]">
            {hasRecurring
              ? `${recurringCount} recurring events set up — the AI will work around them`
              : 'Set up your weekly schedule once, and the AI will plan around your classes, work, and routines'}
          </p>
        </div>
        <span className="rounded-[10px] border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] shadow-sm">
          {hasRecurring ? 'Manage' : 'Set up'}
        </span>
      </div>
    </button>
  );
}
