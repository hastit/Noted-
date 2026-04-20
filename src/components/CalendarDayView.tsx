import React from 'react';
import { motion } from 'motion/react';
import { Plus, Zap, Calculator, Moon, Clock, Book, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent, Tag } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CalendarDayViewProps {
  events: CalendarEvent[];
  tags: Tag[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onAddEventClick?: () => void;
  compact?: boolean;
  /** Timeline jour plein écran, compact (mobile calendrier) */
  denseMobile?: boolean;
}

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({ 
  events, 
  tags, 
  currentDate, 
  onEventClick,
  onAddEventClick,
  compact = false,
  denseMobile = false,
}) => {
  const { t } = useLanguage();
  const dense = denseMobile && !compact;
  const dateStr = formatDate(currentDate);
  const dayEvents = events
    .filter(e => e.date === dateStr)
    .sort((a, b) => a.startTime - b.startTime);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getIcon = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    const name = tag?.name.toLowerCase() || '';
    if (name.includes('design')) return <Zap size={compact ? 16 : dense ? 14 : 20} />;
    if (name.includes('dev')) return <Calculator size={compact ? 16 : dense ? 14 : 20} />;
    if (name.includes('personal')) return <Moon size={compact ? 16 : dense ? 14 : 20} />;
    if (name.includes('meeting')) return <Clock size={compact ? 16 : dense ? 14 : 20} />;
    if (name.includes('homework') || name.includes('project')) return <Book size={compact ? 16 : dense ? 14 : 20} />;
    return <CalendarIcon size={compact ? 16 : dense ? 14 : 20} />;
  };

  const items: any[] = [];
  if (dayEvents.length > 0) {
    dayEvents.forEach((event, index) => {
      if (index === 0 && event.startTime > 0) {
        items.push({ type: 'gap', start: 0, end: event.startTime, message: t('downtime_message') });
      }
      items.push({ type: 'event', ...event });
      const nextEvent = dayEvents[index + 1];
      if (nextEvent && nextEvent.startTime > event.endTime) {
        items.push({ type: 'gap', start: event.endTime, end: nextEvent.startTime, message: t('time_utilized_message') });
      } else if (!nextEvent && event.endTime < 1440) {
        items.push({ type: 'gap', start: event.endTime, end: 1440, message: t('downtime_message') });
      }
    });
  }

  return (
    <div className={`h-full min-h-0 flex flex-col ${compact ? '' : 'bg-[#f8f8f8] rounded-2xl sm:rounded-[40px] overflow-hidden'}`}>
      <div
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] ${
          compact ? 'p-2' : dense ? 'p-3' : 'p-4 sm:p-8 lg:p-12'
        }`}
      >
        <div className={`${compact || dense ? 'w-full' : 'max-w-2xl mx-auto'} relative min-w-0`}>
          {dayEvents.length === 0 ? (
            <div className={`${compact ? 'py-12' : 'py-32'} flex flex-col items-center justify-center text-center text-black/10`}>
              <div className={`${compact ? 'w-12 h-12' : 'w-24 h-24'} rounded-full border-2 border-dashed border-black/5 flex items-center justify-center mb-4`}>
                <Plus size={compact ? 20 : 32} />
              </div>
              <p className={`${compact ? 'text-sm' : 'text-xl'} font-medium`}>{t('empty_day')}</p>
            </div>
          ) : (
            <div className="space-y-0 relative">
              {items.map((item, idx) => {
                if (item.type === 'gap') {
                  return (
                    <div
                      key={`gap-${idx}`}
                      className={`flex flex-col sm:flex-row sm:items-center min-w-0 ${
                        compact
                          ? 'gap-2 sm:gap-4 py-3 sm:py-4'
                          : dense
                            ? 'gap-2 py-2'
                            : 'gap-3 sm:gap-8 py-3 sm:py-5'
                      }`}
                    >
                      <div
                        className={`flex flex-row sm:flex-col items-center gap-2 sm:gap-1 shrink-0 ${
                          compact ? 'w-full sm:w-10' : dense ? 'w-12 text-right' : 'w-full sm:w-16'
                        }`}
                      >
                        <div className={`${compact ? 'w-10 text-left sm:text-right' : 'w-full sm:w-16 sm:text-right'}`}>
                        <span
                          className={`font-bold text-black/10 tabular-nums ${
                            compact ? 'text-[10px]' : dense ? 'text-[11px]' : 'text-[13px]'
                          }`}
                        >
                          {formatTime(item.start)}
                        </span>
                        </div>
                        {!dense && (
                          <div className="relative hidden sm:flex h-8 items-center justify-center shrink-0">
                            <div className={`w-px ${compact ? 'h-4' : 'h-6'} border-l border-dashed border-black/10`} />
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-2 sm:gap-3 text-black/20 italic min-w-0 ${
                          compact ? 'text-[10px]' : dense ? 'text-[11px]' : 'text-xs sm:text-sm'
                        }`}
                      >
                        <Zap size={compact ? 10 : dense ? 10 : 14} className="opacity-50 shrink-0" />
                        <span className="break-words">{item.message}</span>
                      </div>
                    </div>
                  );
                }

                const tag = tags.find(t => t.id === item.tagId);
                const durationMinutes = item.endTime - item.startTime;
                const durationHours = durationMinutes / 60;
                const isLarge = durationHours >= 1.5;

                if (dense) {
                  return (
                    <div
                      key={item.id}
                      role={onEventClick ? 'button' : undefined}
                      tabIndex={onEventClick ? 0 : undefined}
                      onClick={() => onEventClick?.(item)}
                      onKeyDown={e => {
                        if (!onEventClick) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onEventClick(item);
                        }
                      }}
                      className={`flex flex-row items-start gap-2.5 py-2 min-w-0 group ${onEventClick ? 'cursor-pointer' : ''}`}
                    >
                      <div className="relative flex shrink-0 flex-col items-center">
                        <div
                          className={`flex items-center justify-center transition-all duration-300 ${tag?.color || 'bg-black/5'} ${tag?.textColor || 'text-black shadow-sm'} ${
                            isLarge ? 'w-9 h-14 rounded-lg' : 'w-8 h-8 rounded-full'
                          }`}
                        >
                          {getIcon(item.tagId)}
                        </div>
                        {idx < items.length - 1 && (
                          <div className="hidden sm:block w-px h-3 border-l border-dashed border-black/10 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-semibold text-[13px] leading-snug text-black/85 break-words">
                          {item.title}
                        </h3>
                        <span className="font-bold text-black/40 tabular-nums text-[11px] mt-0.5 block">
                          {formatTime(item.startTime)} – {formatTime(item.endTime)}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    role={onEventClick ? 'button' : undefined}
                    tabIndex={onEventClick ? 0 : undefined}
                    onClick={() => onEventClick?.(item)}
                    onKeyDown={e => {
                      if (!onEventClick) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEventClick(item);
                      }
                    }}
                    className={`flex flex-col sm:flex-row sm:items-center group min-w-0 ${
                      compact ? 'gap-3 py-2' : 'gap-4 sm:gap-8 py-3 sm:py-4'
                    } ${onEventClick ? 'cursor-pointer hover:bg-black/[0.015] rounded-xl' : ''}`}
                  >
                    <div
                      className={`flex flex-row sm:flex-col items-center gap-2 sm:gap-0 shrink-0 ${
                        compact ? 'w-full sm:w-10' : 'w-full sm:w-16'
                      }`}
                    >
                      <div className={`${compact ? 'w-10 text-left sm:text-right' : 'w-full sm:w-16 sm:text-right'}`}>
                        <span
                          className={`font-bold text-black/60 tabular-nums ${
                            compact ? 'text-[10px]' : 'text-[13px]'
                          }`}
                        >
                          {formatTime(item.startTime)}
                        </span>
                      </div>
                      <div className="relative flex flex-col items-center shrink-0">
                        <div
                          className={`flex items-center justify-center transition-all duration-300 ${tag?.color || 'bg-black/5'} ${tag?.textColor || 'text-black shadow-sm'} ${
                            compact
                              ? isLarge
                                ? 'w-8 h-16 rounded-xl'
                                : 'w-8 h-8 rounded-full'
                              : isLarge
                                ? 'w-10 h-16 sm:w-11 sm:h-20 rounded-[20px]'
                                : 'w-10 h-10 sm:w-12 sm:h-12 rounded-full'
                          }`}
                        >
                          {getIcon(item.tagId)}
                        </div>
                        {idx < items.length - 1 && (
                          <div className={`hidden sm:block w-px ${compact ? 'h-4' : 'h-8'} border-l border-dashed border-black/10 mt-2`} />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between pl-0 sm:pl-0">
                      <div className="min-w-0 w-full">
                        <span
                          className={`font-bold text-black/25 block mb-0.5 tabular-nums ${
                            compact ? 'text-[9px]' : 'text-[10px]'
                          }`}
                        >
                          {formatTime(item.startTime)} – {formatTime(item.endTime)}
                        </span>
                        <h3
                          className={`font-semibold text-black/85 break-words ${
                            compact ? 'text-sm' : 'text-base sm:text-lg'
                          }`}
                        >
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {onAddEventClick && !compact && (
        <button 
          type="button"
          onClick={onAddEventClick}
          className="absolute bottom-4 right-4 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 md:bottom-10 md:right-10 md:flex md:h-16 md:w-16"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};
