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
      className="w-full rounded-3xl border border-black/[0.06] bg-white/80 p-5 text-left shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:border-rose-200/60 hover:bg-white/90 hover:shadow-[0_8px_32px_-8px_rgba(244,114,182,0.14)] md:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-400 shadow-[0_8px_20px_-12px_rgba(244,114,182,0.35)]">
          <CalendarClock size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[#111827]">Routines</div>
          <p className="mt-1 text-[13px] leading-5 text-[#6B7280]">
            Classes, work, sports, and recurring events the AI should plan around.
          </p>
          <p className="mt-2 text-[12px] font-medium text-[#4B5563]">
            {hasRecurring
              ? `${recurringCount} recurring events set — AI will avoid these times.`
              : 'No routines added yet — set your recurring commitments so AI can avoid these times.'}
          </p>
        </div>
        <span className="w-fit rounded-2xl border border-black/[0.08] bg-[#18181b] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)]">
          Manage routines
        </span>
      </div>
    </button>
  );
}
