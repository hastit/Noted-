import {CalendarDays, Sparkles} from 'lucide-react';
import type {ScheduledBlock} from '../../types/scheduler';
import {categorizeBlock} from '../../utils/blockCategories';

type Props = {
  items: ScheduledBlock[];
};

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHourMinute(minutesFromMidnight: number) {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = String(minutesFromMidnight % 60).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${m}`;
}

function formatTime12h(minutesFromMidnight: number) {
  const h24 = Math.floor(minutesFromMidnight / 60);
  const m = String(minutesFromMidnight % 60).padStart(2, '0');
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m} ${suffix}`;
}

function formatDuration(durationMinutes: number) {
  if (durationMinutes >= 60) {
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  return `${durationMinutes}m`;
}

function formatDayLabel(dateYmd: string) {
  const today = new Date();
  const target = new Date(`${dateYmd}T12:00:00`);
  const todayMid = new Date(`${toYmd(today)}T12:00:00`);
  const diffDays = Math.round((target.getTime() - todayMid.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === 2) return 'In 2 days';
  if (diffDays > 2 && diffDays < 7) return `In ${diffDays} days`;
  return target.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
}

export default function TodayAtAGlance({items}: Props) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = toYmd(now);

  const todayItems = items
    .filter(item => item.date === today)
    .sort((a, b) => a.startTime - b.startTime);

  const nextItems = items
    .filter(item => item.date > today)
    .sort((a, b) => (a.date === b.date ? a.startTime - b.startTime : a.date.localeCompare(b.date)))
    .slice(0, 3);

  const remainingToday = todayItems.filter(item => item.endTime > nowMinutes).length;
  const focusMinutesAvailable = Math.max(0, 12 * 60 - todayItems.reduce((sum, item) => sum + item.durationMinutes, 0));

  return (
    <aside className="rounded-2xl border border-[#F3F4F6] bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-[22px] font-semibold text-[#1F2937]">Today</h3>
          <p className="mt-1 text-[13px] font-normal text-[#9CA3AF]">
            {now.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:min-w-[340px]">
          <div className="rounded-xl border border-[#E5F2FF] bg-gradient-to-br from-[#F0F9FF] to-white p-3.5">
            <div className="mb-1 inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <CalendarDays size={13} />
              Events left
            </div>
            <div className="text-[16px] font-semibold text-[#1F2937]">
              {remainingToday} {remainingToday <= 1 ? 'event' : 'events'}
            </div>
          </div>
          <div className="rounded-xl border border-[#EDE9FE] bg-gradient-to-br from-[#F5F3FF] to-white p-3.5">
            <div className="mb-1 inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <Sparkles size={13} />
              Focus time
            </div>
            <div className="text-[16px] font-semibold text-[#1F2937]">
              {Math.floor(focusMinutesAvailable / 60)}h {focusMinutesAvailable % 60}m
            </div>
          </div>
        </div>
      </header>

      <div className="mt-4 h-px bg-[#F3F4F6]" />

      <section className="mt-4">
        {todayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-5 text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#9CA3AF]">
              <CalendarDays size={18} />
            </div>
            <p className="text-[14px] text-[#6B7280]">
              Your day is wide open — no events scheduled. Generate a schedule above to fill in some focus time. ✨
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {todayItems.map(item => {
              const category = categorizeBlock(item.title);
              const isRecurring = item.source === 'recurring';
              const isCurrent = item.startTime <= nowMinutes && item.endTime > nowMinutes;
              const isPast = item.endTime <= nowMinutes;
              return (
                <div
                  key={item.id}
                  className={`group grid animate-[fadeIn_.3s_ease-out] grid-cols-[6px_auto_1fr_auto] items-center gap-3 rounded-xl px-1 py-2.5 transition duration-150 hover:bg-[#F9FAFB] ${
                    isRecurring ? 'opacity-70' : ''
                  } ${isPast ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`h-8 w-[4px] rounded-full ${isCurrent ? 'ring-1 ring-[#10B981]/35' : ''}`}
                    style={{backgroundColor: category.text}}
                  />
                  <div className="font-mono text-[14px] font-semibold text-[#1F2937]">{formatHourMinute(item.startTime)}</div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-[#374151]">
                      {item.title}
                      {isRecurring && <span className="ml-1.5 text-[11px] text-[#9CA3AF]">↻</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#9CA3AF]">{formatDuration(item.durationMinutes)}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#047857]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
                        Now
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {nextItems.length > 0 && (
        <section className="mt-5">
          <div className="h-px bg-[#F3F4F6]" />
          <h4 className="mt-4 text-[13px] font-medium text-[#6B7280]">Up next</h4>
          <div className="mt-2 -mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            <div className="flex w-max min-w-full gap-2">
            {nextItems.map(item => {
              const category = categorizeBlock(item.title);
              return (
                <div
                  key={item.id}
                  className="min-w-[220px] rounded-xl border border-[#EEF2F7] bg-[#FAFBFD] p-3 text-[13px] text-[#4B5563] transition hover:bg-[#F7F9FC]"
                >
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                    <span className="h-2 w-2 rounded-full" style={{backgroundColor: category.text}} />
                    {formatDayLabel(item.date)} • {formatTime12h(item.startTime)}
                  </div>
                  <div className="truncate text-[14px] font-medium text-[#374151]">{item.title}</div>
                </div>
              );
            })}
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
