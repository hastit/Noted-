import React from 'react';
import { motion } from 'motion/react';
import { Plus, Zap, Calculator, Moon, Clock, Book, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent, Tag } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CalendarDayViewProps {
  events: CalendarEvent[];
  tags: Tag[];
  currentDate: Date;
  onAddEventClick?: () => void;
  compact?: boolean;
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
  onAddEventClick,
  compact = false
}) => {
  const { t } = useLanguage();
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
    if (name.includes('design')) return <Zap size={compact ? 16 : 20} />;
    if (name.includes('dev')) return <Calculator size={compact ? 16 : 20} />;
    if (name.includes('personal')) return <Moon size={compact ? 16 : 20} />;
    if (name.includes('meeting')) return <Clock size={compact ? 16 : 20} />;
    if (name.includes('homework') || name.includes('project')) return <Book size={compact ? 16 : 20} />;
    return <CalendarIcon size={compact ? 16 : 20} />;
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
    <div className={`h-full flex flex-col ${compact ? '' : 'bg-[#f8f8f8] rounded-[40px] overflow-hidden'}`}>
      <div className={`flex-1 overflow-y-auto no-scrollbar ${compact ? 'p-2' : 'p-12'}`}>
        <div className={`${compact ? 'w-full' : 'max-w-2xl mx-auto'} relative`}>
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
                    <div key={`gap-${idx}`} className={`flex ${compact ? 'gap-4 py-4' : 'gap-8 py-8'} items-center`}>
                      <div className={`${compact ? 'w-10' : 'w-16'} text-right shrink-0`}>
                        <span className={`${compact ? 'text-[10px]' : 'text-[13px]'} font-bold text-black/10`}>{formatTime(item.start)}</span>
                      </div>
                      <div className="relative flex flex-col items-center">
                        <div className={`w-px ${compact ? 'h-6' : 'h-12'} border-l border-dashed border-black/10`} />
                      </div>
                      <div className={`flex items-center gap-3 text-black/20 italic ${compact ? 'text-[10px]' : 'text-sm'}`}>
                        <Zap size={compact ? 10 : 14} className="opacity-50" />
                        {item.message}
                      </div>
                    </div>
                  );
                }

                const tag = tags.find(t => t.id === item.tagId);
                const durationMinutes = item.endTime - item.startTime;
                const durationHours = durationMinutes / 60;
                const isLarge = durationHours >= 1.5;

                return (
                  <div key={item.id} className={`flex ${compact ? 'gap-4 py-2' : 'gap-8 py-4'} items-center group`}>
                    <div className={`${compact ? 'w-10' : 'w-16'} text-right shrink-0`}>
                      <span className={`${compact ? 'text-[10px]' : 'text-[13px]'} font-bold text-black/60`}>{formatTime(item.startTime)}</span>
                    </div>

                    <div className="relative flex flex-col items-center">
                      <div className={`${compact ? (isLarge ? 'w-8 h-16 rounded-xl' : 'w-8 h-8 rounded-full') : (isLarge ? 'w-14 h-32 rounded-[24px]' : 'w-14 h-14 rounded-full')} flex items-center justify-center transition-all duration-300 ${tag?.color || 'bg-black/5'} ${tag?.textColor || 'text-black shadow-sm'}`}>
                        {getIcon(item.tagId)}
                      </div>
                      {idx < items.length - 1 && (
                        <div className={`w-px ${compact ? 'h-4' : 'h-8'} border-l border-dashed border-black/10 mt-2`} />
                      )}
                    </div>

                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-bold text-black/20 block mb-1`}>
                          {formatTime(item.startTime)} – {formatTime(item.endTime)}
                        </span>
                        <h3 className={`${compact ? 'text-sm' : 'text-xl'} font-bold text-black/80`}>{item.title}</h3>
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
          onClick={onAddEventClick}
          className="absolute bottom-10 right-10 w-16 h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 z-50"
        >
          <Plus size={32} />
        </button>
      )}
    </div>
  );
};
