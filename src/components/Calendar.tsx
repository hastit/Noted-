import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, MoreHorizontal, X, Tag as TagIcon, Check, Zap, Calculator, Moon, Book, Languages } from 'lucide-react';

import { CalendarEvent, Tag } from '../types';
import { CalendarDayView } from './CalendarDayView';
import { DEFAULT_TAGS } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileFab from './MobileFab';

type CalendarView = 'month' | 'week' | 'day';

const PRESET_COLORS = [
  { bg: 'bg-[#C2D9FF]', text: 'text-[#1E3A8A]' },
  { bg: 'bg-[#B4F4C0]', text: 'text-[#065F46]' },
  { bg: 'bg-[#D1C4FF]', text: 'text-[#4C1D95]' },
  { bg: 'bg-[#FFD9A0]', text: 'text-[#92400E]' },
  { bg: 'bg-[#FFC2E2]', text: 'text-[#9D174D]' },
  { bg: 'bg-[#FF9EC4]', text: 'text-[#9D174D]' },
];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Semaine mobile : 3 colonnes (J−1, jour courant, J+1), grille horaire compacte. */
function MobileWeekThreeDayView({
  events,
  tags,
  centerDate,
  onSelectSlot,
}: {
  events: CalendarEvent[];
  tags: Tag[];
  centerDate: Date;
  onSelectSlot: (date: string, hour: number) => void;
}) {
  const {language} = useLanguage();
  const hours = Array.from({length: 24}, (_, i) => i);
  const slotH = 44;

  const formatTimeMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const formatHourLabel = (h: number) => {
    if (h === 0) return '12a';
    if (h === 12) return '12p';
    return h > 12 ? `${h - 12}p` : `${h}a`;
  };

  const now = new Date();
  const offsets = [-1, 0, 1] as const;
  const threeDays = offsets.map(off => {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + off);
    return {
      fullDate: formatDate(d),
      dayNum: d.getDate(),
      shortLabel: d.toLocaleString(language === '日本語' ? 'ja-JP' : 'default', {weekday: 'short'}),
      isToday: d.toDateString() === now.toDateString(),
    };
  });

  return (
    <motion.div
      initial={{opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -12}}
      className="h-full min-h-0 flex flex-col min-w-0 overflow-hidden"
    >
      <div className="shrink-0 grid grid-cols-[32px_1fr] gap-0.5 mb-1.5 px-0.5">
        <div />
        <div className="grid grid-cols-3 gap-0.5">
          {threeDays.map(d => (
            <div
              key={d.fullDate}
              className={`flex flex-col items-center justify-center py-1 rounded-md text-center min-w-0 ${
                d.isToday ? 'bg-[#1a1a1a] text-white' : 'bg-black/[0.04] text-black/70'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase truncate max-w-full ${
                  d.isToday ? 'text-white/65' : 'text-black/38'
                }`}
              >
                {d.shortLabel}
              </span>
              <span className="text-[15px] font-bold tabular-nums leading-none">{d.dayNum}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
        <div className="grid grid-cols-[32px_1fr] gap-0.5 relative pb-2" style={{minHeight: hours.length * slotH}}>
          <div className="flex flex-col shrink-0">
            {hours.map(hour => (
              <div
                key={hour}
                className="text-[11px] font-semibold text-black/35 flex items-start justify-end pr-0.5"
                style={{height: slotH}}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>
          <div className="relative grid grid-cols-3 min-w-0">
            <div className="absolute inset-0 grid grid-cols-3 pointer-events-none">
              {threeDays.map((_, dayIndex) => (
                <div key={dayIndex} className="border-r border-black/[0.06] last:border-r-0">
                  {hours.map(hour => (
                    <div key={hour} className="border-b border-black/[0.05]" style={{height: slotH}} />
                  ))}
                </div>
              ))}
            </div>
            {threeDays.map(day => (
              <div
                key={day.fullDate}
                className="relative border-r border-black/[0.06] last:border-r-0"
                style={{minHeight: hours.length * slotH}}
              >
                {hours.map(hour => (
                  <div
                    key={hour}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectSlot(day.fullDate, hour)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSlot(day.fullDate, hour);
                      }
                    }}
                    className="active:bg-black/[0.04] cursor-pointer"
                    style={{height: slotH}}
                  />
                ))}
                {events
                  .filter(e => e.date === day.fullDate)
                  .map(event => {
                    const tag = tags.find(t => t.id === event.tagId);
                    const top = (event.startTime / 60) * slotH;
                    const height = Math.max(((event.endTime - event.startTime) / 60) * slotH, 26);
                    return (
                      <div
                        key={event.id}
                        className="absolute left-0.5 right-0.5 z-10 flex flex-row items-start gap-1.5 overflow-hidden rounded-md border border-black/[0.06] bg-white/95 px-1 py-0.5 shadow-sm"
                        style={{top: `${top}px`, height: `${height}px`}}
                      >
                        <span
                          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${tag?.color || 'bg-black/35'}`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className={`truncate text-[11px] font-semibold ${tag?.textColor || 'text-black'}`}>
                            {event.title}
                          </div>
                          <div className="truncate text-[10px] font-medium tabular-nums text-black/45">
                            {formatTimeMinutes(event.startTime)}–{formatTimeMinutes(event.endTime)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export type RemoteEventsBridge = {
  create: (ev: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
};

interface CalendarProps {
  events: CalendarEvent[];
  tags: Tag[];
  onEventsChange: (events: CalendarEvent[]) => void;
  onTagsChange: (tags: Tag[]) => void;
  remoteEvents?: RemoteEventsBridge;
}

export default function Calendar({ events, tags, onEventsChange, onTagsChange, remoteEvents }: CalendarProps) {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdvancedModal, setIsAdvancedModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: number } | null>(null);
  const [mobileDaySheet, setMobileDaySheet] = useState<string | null>(null);

  const monthYearLabel = currentDate.toLocaleString(language === '日本語' ? 'ja-JP' : 'default', { month: 'long', year: 'numeric' });

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      const delta = isMobile ? 1 : 7;
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? delta : -delta));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleAddEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    if (remoteEvents) {
      try {
        const ev = await remoteEvents.create(eventData);
        onEventsChange([...events, ev]);
      } catch (e) {
        console.error(e);
      }
    } else {
      const newEvent: CalendarEvent = {
        ...eventData,
        id: Math.random().toString(36).substr(2, 9),
      };
      onEventsChange([...events, newEvent]);
    }
    setIsModalOpen(false);
    setIsAdvancedModal(false);
    setSelectedSlot(null);
  };

  const handleAddTag = (name: string, colorIndex: number) => {
    const newTag: Tag = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      color: PRESET_COLORS[colorIndex].bg,
      textColor: PRESET_COLORS[colorIndex].text,
    };
    onTagsChange([...tags, newTag]);
    return newTag;
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col gap-2.5 md:gap-4 lg:flex-row lg:items-center lg:justify-between mb-3 md:mb-6 lg:mb-8 min-w-0">
        <h1 className="text-[20px] md:text-3xl font-display font-bold tracking-tight truncate min-w-0 pr-1 md:pr-2 leading-tight">
          {monthYearLabel}
        </h1>

        <div className="flex flex-col gap-2 md:gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end min-w-0 lg:min-w-0 lg:flex-1">
          {/* Segmented Month / Week / Day — compact sur mobile */}
          <div className="flex md:hidden bg-black/5 p-0.5 rounded-xl w-full max-w-md items-center gap-0.5 shrink-0">
            {(['month', 'week', 'day'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`flex-1 min-h-8 rounded-lg text-[11px] font-semibold capitalize px-1.5 py-1.5 transition-colors ${
                  view === v ? 'bg-white text-black shadow-sm' : 'text-black/38 active:text-black/55'
                }`}
              >
                {v === 'month' ? t('month') : v === 'week' ? t('week') : t('day')}
              </button>
            ))}
          </div>
          <div className="hidden md:flex bg-black/5 p-1 rounded-2xl items-center gap-0.5 sm:gap-1 backdrop-blur-md w-full sm:w-auto justify-center sm:justify-start shrink-0">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 sm:px-5 lg:px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 capitalize whitespace-nowrap min-h-[44px] ${
                  view === v ? 'bg-white shadow-sm text-black' : 'text-black/40 active:text-black/70'
                }`}
              >
                {v === 'month' ? t('month') : v === 'week' ? t('week') : t('day')}
              </button>
            ))}
          </div>

          {/* Navigation + add */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 md:gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1 md:gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => handleNavigate('prev')}
                className="max-md:min-h-9 max-md:min-w-9 max-md:rounded-lg md:min-h-11 md:min-w-11 flex items-center justify-center glass-panel rounded-xl active:bg-black/5 transition-colors shrink-0"
              >
                <ChevronLeft size={isMobile ? 18 : 20} />
              </button>
              <button 
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="max-md:min-h-9 max-md:px-2.5 max-md:text-[13px] max-md:rounded-lg md:min-h-11 md:px-5 lg:px-6 md:py-2 glass-panel rounded-xl font-bold text-sm active:bg-black/5 transition-colors whitespace-nowrap"
              >
                {t('today')}
              </button>
              <button 
                type="button"
                onClick={() => handleNavigate('next')}
                className="max-md:min-h-9 max-md:min-w-9 max-md:rounded-lg md:min-h-11 md:min-w-11 flex items-center justify-center glass-panel rounded-xl active:bg-black/5 transition-colors shrink-0"
              >
                <ChevronRight size={isMobile ? 18 : 20} />
              </button>
            </div>
            <button 
              type="button"
              onClick={() => {
                setSelectedSlot({ date: formatDate(currentDate), time: 540 });
                setIsModalOpen(true);
              }}
              className="hidden md:flex min-h-11 items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-2xl text-sm font-medium active:scale-[0.98] transition-transform shrink-0"
            >
              <Plus size={18} />
              <span>{t('add_event')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {view === 'month' && (
            <div key="month" className="flex-1 min-h-0 h-full flex flex-col">
              <MonthView 
                events={events} 
                tags={tags} 
                currentDate={currentDate}
                compactCells={isMobile}
                eventDotsOnly={isMobile}
                onDaySheetOpen={isMobile ? (date) => setMobileDaySheet(date) : undefined}
                onSelectSlot={(date) => {
                  setSelectedSlot({ date, time: 540 }); // Default to 9 AM (9 * 60)
                  setIsModalOpen(true);
                }}
              />
            </div>
          )}
          {view === 'week' && (
            <div key="week" className="flex-1 min-h-0 h-full flex flex-col min-w-0">
              {isMobile ? (
                <MobileWeekThreeDayView
                  events={events}
                  tags={tags}
                  centerDate={currentDate}
                  onSelectSlot={(date, hour) => {
                    setSelectedSlot({date, time: hour * 60});
                    setIsModalOpen(true);
                  }}
                />
              ) : (
                <WeekView 
                  events={events} 
                  tags={tags} 
                  currentDate={currentDate}
                  onSelectSlot={(date, hour) => {
                    setSelectedSlot({ date, time: hour * 60 });
                    setIsModalOpen(true);
                  }}
                />
              )}
            </div>
          )}
          {view === 'day' && (
            <div key="day" className="flex-1 min-h-0 h-full flex flex-col min-w-0">
              <CalendarDayView 
                events={events} 
                tags={tags} 
                currentDate={currentDate}
                denseMobile={isMobile}
                onAddEventClick={
                  isMobile
                    ? undefined
                    : () => {
                        setIsAdvancedModal(true);
                        setIsModalOpen(true);
                      }
                }
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {!isModalOpen && !mobileDaySheet && (
        <MobileFab
          label={t('add_event')}
          onClick={() => {
            setSelectedSlot({date: formatDate(currentDate), time: 540});
            setIsModalOpen(true);
          }}
        />
      )}

      <AnimatePresence>
        {isMobile && mobileDaySheet && (
          <motion.div
            key="mobile-day-sheet"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            className="fixed inset-0 z-[125] md:hidden flex flex-col justify-end"
          >
            <button
              type="button"
              aria-label="Fermer"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileDaySheet(null)}
            />
            <motion.div
              initial={{y: '100%'}}
              animate={{y: 0}}
              exit={{y: '100%'}}
              transition={{type: 'spring', damping: 28, stiffness: 320}}
              className="relative z-10 rounded-t-3xl bg-white border-t border-black/10 shadow-2xl max-h-[78vh] flex flex-col min-h-0 pb-[env(safe-area-inset-bottom,0px)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-black/10 shrink-0" />
              <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-black/[0.06] shrink-0">
                <h3 className="text-base font-bold text-black truncate min-w-0">
                  {new Date(mobileDaySheet + 'T12:00:00').toLocaleDateString(
                    language === '日本語' ? 'ja-JP' : undefined,
                    {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'},
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileDaySheet(null)}
                  className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-xl bg-black/[0.04] active:bg-black/[0.08]"
                >
                  <X size={20} className="text-black/50" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-2 [scrollbar-width:thin]">
                {events.filter(e => e.date === mobileDaySheet).length === 0 ? (
                  <p className="text-sm text-black/40 py-4 text-center">No events on this day.</p>
                ) : (
                  events
                    .filter(e => e.date === mobileDaySheet)
                    .map(event => {
                      const tag = tags.find(tg => tg.id === event.tagId);
                      return (
                        <div
                          key={event.id}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${tag?.color || 'bg-black/5'} ${tag?.textColor || 'text-black'}`}
                        >
                          {event.title}
                        </div>
                      );
                    })
                )}
              </div>
              <div className="p-4 pt-2 border-t border-black/[0.06] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlot({date: mobileDaySheet, time: 540});
                    setMobileDaySheet(null);
                    setIsModalOpen(true);
                  }}
                  className="w-full min-h-12 rounded-2xl bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 active:opacity-90"
                >
                  <Plus size={18} />
                  {t('add_event')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <AddEventModal 
            onClose={() => {
              setIsModalOpen(false);
              setIsAdvancedModal(false);
              setSelectedSlot(null);
            }}
            onSubmit={handleAddEvent}
            tags={tags}
            onAddTag={handleAddTag}
            initialDate={selectedSlot?.date}
            initialTime={selectedSlot?.time}
            isAdvanced={isAdvancedModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface MonthViewProps {
  events: CalendarEvent[];
  tags: Tag[];
  currentDate: Date;
  onSelectSlot: (date: string) => void;
  /** Grille plus compacte (téléphone) */
  compactCells?: boolean;
  /** Mobile : uniquement numéro + pastilles (pas de titres dans la grille) */
  eventDotsOnly?: boolean;
  /** Mobile : ouvrir la feuille du jour au lieu d’ouvrir directement le modal */
  onDaySheetOpen?: (date: string) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  events,
  tags,
  currentDate,
  onSelectSlot,
  compactCells,
  eventDotsOnly,
  onDaySheetOpen,
}) => {
  const { t, language } = useLanguage();
  const now = new Date();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const currentMonthRef = React.useRef<HTMLDivElement>(null);
  
  // Generate a range of months to scroll through (e.g., 6 months before and after the viewed date)
  const monthsToRender = useMemo(() => {
    const months = [];
    for (let i = -6; i <= 6; i++) {
      months.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1));
    }
    return months;
  }, [currentDate]);

  React.useEffect(() => {
    if (currentMonthRef.current) {
      currentMonthRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [currentDate]);

  const weekDays = language === '日本語' ? ['日', '月', '火', '水', '木', '金', '土'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <motion.div 
      ref={scrollContainerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full min-h-0 flex flex-col bg-white rounded-xl max-md:rounded-xl max-md:shadow-md sm:rounded-[32px] overflow-y-auto overflow-x-hidden border border-black/5 max-md:border-black/[0.06] shadow-xl relative scroll-smooth [scrollbar-width:thin]"
    >
      {/* Global Sticky Weekday Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-black/5 grid grid-cols-7 min-w-0">
        {weekDays.map(day => (
          <div
            key={day}
            className={`py-2 sm:py-3 lg:py-4 px-0.5 text-center font-bold text-black/30 uppercase tracking-widest truncate ${
              compactCells ? 'text-xs' : 'text-[9px] sm:text-[10px]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {monthsToRender.map((monthDate, monthIdx) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const isCurrentMonth = monthDate.getMonth() === now.getMonth() && monthDate.getFullYear() === now.getFullYear();
        
        return (
          <div 
            key={monthIdx} 
            ref={isCurrentMonth ? currentMonthRef : null}
            className="mb-12 last:mb-0"
          >
            {/* Month Title Header (Sticky below weekdays) */}
            <div
              className={`sticky z-20 bg-white/90 backdrop-blur-md px-3 sm:px-5 lg:px-8 py-3 sm:py-4 border-b border-black/5 ${
                compactCells ? 'top-[37px]' : 'top-[33px] sm:top-[41px] lg:top-[45px]'
              }`}
            >
              <h2
                className={`font-display font-bold text-black truncate ${
                  compactCells ? 'text-[15px]' : 'text-base sm:text-lg lg:text-xl'
                }`}
              >
                {monthDate.toLocaleString(language === '日本語' ? 'ja-JP' : 'default', { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 min-w-0">
              {/* Empty slots for the first week */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={`border-r border-b border-black/5 bg-black/[0.01] ${
                    eventDotsOnly
                      ? 'min-h-[64px]'
                      : compactCells
                        ? 'min-h-[52px]'
                        : 'min-h-[76px] sm:min-h-[92px] md:min-h-[104px] lg:min-h-[120px]'
                  }`}
                />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const d = new Date(year, month, dayNumber);
                const dateStr = formatDate(d);
                const dayEvents = events.filter(e => e.date === dateStr);
                const isToday = d.toDateString() === now.toDateString();
                const isSelectedMonthDay = d.toDateString() === currentDate.toDateString();
                
                return (
                  <div
                    key={dayNumber}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (onDaySheetOpen) onDaySheetOpen(dateStr);
                      else onSelectSlot(dateStr);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onDaySheetOpen) onDaySheetOpen(dateStr);
                        else onSelectSlot(dateStr);
                      }
                    }}
                    className={`relative border-r border-b border-black/5 flex flex-col cursor-pointer group min-w-0 transition-colors active:bg-black/[0.04] md:hover:bg-black/[0.02] ${
                      eventDotsOnly
                        ? 'min-h-[64px] p-1.5'
                        : compactCells
                          ? 'min-h-[52px] p-1'
                          : 'min-h-[76px] sm:min-h-[92px] md:min-h-[104px] lg:min-h-[120px] p-1.5 sm:p-2 lg:p-4'
                    } ${(firstDayOfMonth + dayNumber) % 7 === 0 ? 'border-r-0' : ''} ${isSelectedMonthDay ? 'bg-black/[0.01]' : ''}`}
                  >
                    {eventDotsOnly ? (
                      <div className="flex h-full min-h-0 flex-col items-start gap-1">
                        <span
                          className={`text-[13px] font-semibold tabular-nums leading-none ${
                            isToday ? 'text-[#FF5C35]' : 'text-black/55'
                          }`}
                        >
                          {dayNumber}
                        </span>
                        {dayEvents.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-start gap-1">
                            {dayEvents.slice(0, 4).map(event => {
                              const tag = tags.find(tg => tg.id === event.tagId);
                              return (
                                <span
                                  key={event.id}
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${tag?.color || 'bg-black/35'}`}
                                />
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-1 mb-1 sm:mb-2 lg:mb-3 shrink-0">
                          <span
                            className={`font-bold tabular-nums shrink-0 ${compactCells ? 'text-sm' : 'text-xs sm:text-sm'} ${
                              isToday ? 'text-[#FF5C35]' : 'text-black/60'
                            }`}
                          >
                            {dayNumber}
                          </span>
                          <div className="flex items-center gap-2">
                            {isToday && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C35]" />
                            )}
                            <div
                              className={`transition-opacity ${
                                compactCells
                                  ? 'opacity-100'
                                  : 'opacity-0 max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100'
                              }`}
                            >
                              <Plus size={14} className="text-black/40" />
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1 sm:space-y-1.5 [scrollbar-width:thin]">
                          {dayEvents.map(event => {
                            const tag = tags.find(t => t.id === event.tagId);
                            return (
                              <div
                                key={event.id}
                                className={`px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold shadow-sm max-w-full break-words line-clamp-2 sm:line-clamp-3 ${tag?.color || 'bg-black/5'} ${tag?.textColor || 'text-black'} ${
                                  compactCells ? 'text-xs' : 'text-[8px] sm:text-[9px] lg:text-[10px]'
                                }`}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Empty slots to fill the last week */}
              {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
                <div
                  key={`empty-end-${i}`}
                  className={`border-r border-b border-black/5 bg-black/[0.01] last:border-r-0 ${
                    eventDotsOnly
                      ? 'min-h-[64px]'
                      : compactCells
                        ? 'min-h-[52px]'
                        : 'min-h-[76px] sm:min-h-[92px] md:min-h-[104px] lg:min-h-[120px]'
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

interface WeekViewProps {
  events: CalendarEvent[];
  tags: Tag[];
  currentDate: Date;
  onSelectSlot: (date: string, hour: number) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ 
  events, 
  tags, 
  currentDate,
  onSelectSlot 
}) => {
  const { language } = useLanguage();
  const now = new Date();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday of the viewed week
  
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      name: d.toLocaleString(language === '日本語' ? 'ja-JP' : 'default', { weekday: 'long' }),
      date: d.getDate(),
      fullDate: formatDate(d),
      active: d.toDateString() === now.toDateString()
    };
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const formatHourLabel = (h: number) => {
    if (h === 0) return '12 am';
    if (h === 12) return '12 pm';
    return h > 12 ? `${h - 12} pm` : `${h} am`;
  };

  const slotH = 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full min-h-0 flex flex-col min-w-0"
    >
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto [scrollbar-width:thin] -mx-1 px-1">
        <div className="min-w-[640px] lg:min-w-0 w-full pb-2">
          {/* Week Header */}
          <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[72px_1fr] lg:grid-cols-[100px_1fr] gap-2 sm:gap-3 lg:gap-4 mb-4 lg:mb-8">
            <div className="flex items-center justify-center shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-2xl glass-panel flex items-center justify-center">
                <CalendarIcon size={20} className="text-black/40" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4 min-w-0">
              {weekDays.map((day) => (
                <div 
                  key={day.date}
                  className={`flex flex-col items-center justify-center py-2 sm:py-3 lg:py-5 rounded-2xl lg:rounded-[32px] transition-all duration-500 min-w-0 ${
                    day.active ? 'bg-[#1a1a1a] text-white shadow-2xl lg:scale-105' : 'bg-[#f4f4f4] text-black/60'
                  }`}
                >
                  <span className={`text-[9px] sm:text-[10px] lg:text-[11px] font-bold uppercase tracking-widest mb-1 lg:mb-2 truncate max-w-full px-0.5 text-center ${day.active ? 'text-white/50' : 'text-black/30'}`}>
                    {day.name}
                  </span>
                  <span className="text-lg sm:text-2xl lg:text-3xl font-display font-bold tabular-nums">{day.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time Grid */}
          <div className="relative px-1 sm:px-2 lg:px-4">
            <div className={`grid grid-cols-[52px_1fr] sm:grid-cols-[72px_1fr] lg:grid-cols-[100px_1fr] gap-2 sm:gap-3 lg:gap-4 relative`} style={{minHeight: 24 * slotH}}>
              {/* Time Labels */}
              <div className="flex flex-col shrink-0">
                {hours.map((hour) => (
                  <div key={hour} className="text-[10px] sm:text-[11px] lg:text-[13px] font-bold text-black/30 flex items-start justify-center pt-1 lg:pt-2" style={{height: slotH}}>
                    <span className="leading-tight text-center">{formatHourLabel(hour)}</span>
                  </div>
                ))}
              </div>

              {/* Grid Area */}
              <div className="relative grid grid-cols-7 min-w-0">
                <div className="absolute inset-0 pointer-events-none grid grid-cols-7">
                  {weekDays.map((_, dayIndex) => (
                    <div key={dayIndex} className="relative border-r border-black/5 last:border-r-0">
                      {hours.map((hour) => (
                        <div key={hour} className="border-b border-black/5 w-full" style={{height: slotH}} />
                      ))}
                    </div>
                  ))}
                </div>
            
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="relative border-r border-black/5 h-full min-w-0 last:border-r-0" style={{minHeight: 24 * slotH}}>
                    {hours.map((hour) => (
                      <div 
                        key={hour} 
                        onClick={() => onSelectSlot(day.fullDate, hour)}
                        className="hover:bg-black/[0.02] transition-colors cursor-pointer"
                        style={{height: slotH}}
                      />
                    ))}

                    {events.filter(e => e.date === day.fullDate).map((event) => {
                      const tag = tags.find(t => t.id === event.tagId);
                      const top = (event.startTime / 60) * slotH;
                      const height = Math.max(((event.endTime - event.startTime) / 60) * slotH, 36);
                  
                      return (
                        <div 
                          key={event.id}
                          className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 lg:left-2 lg:right-2 rounded-xl lg:rounded-[28px] p-2 sm:p-3 lg:p-5 shadow-sm flex flex-col overflow-hidden group hover:scale-[1.01] transition-all duration-300 cursor-pointer z-10 min-h-0 ${tag?.color || 'bg-black/10'} ${tag?.textColor || 'text-black'}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className="mb-1 min-w-0 flex-1 flex flex-col justify-start overflow-hidden">
                            <h4 className="font-bold text-[10px] sm:text-[11px] lg:text-[13px] leading-tight mb-0.5 line-clamp-2 break-words">{event.title}</h4>
                            <p className="text-[9px] sm:text-[10px] lg:text-[11px] opacity-70 font-medium truncate">
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </p>
                          </div>
                          {event.location && (
                            <div className="mt-auto flex items-center gap-1 text-[9px] lg:text-[10px] opacity-60 min-w-0">
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AddEventModal({ 
  onClose, 
  onSubmit, 
  tags, 
  onAddTag,
  initialDate,
  initialTime,
  isAdvanced = false
}: { 
  onClose: () => void; 
  onSubmit: (data: Omit<CalendarEvent, 'id'>) => void | Promise<void>;
  tags: Tag[];
  onAddTag: (name: string, colorIndex: number) => Tag;
  initialDate?: string;
  initialTime?: number;
  isAdvanced?: boolean;
}) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || formatDate(new Date()));
  const [startTime, setStartTime] = useState(initialTime || 540); // Default 9 AM
  const [duration, setDuration] = useState(60); // Default 1 hour
  const [selectedTagId, setSelectedTagId] = useState(tags[0]?.id || '');
  const [location, setLocation] = useState('');
  
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColorIndex, setNewTagColorIndex] = useState(0);
  
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const timeRollerRef = React.useRef<HTMLDivElement>(null);

  const endTime = startTime + duration;

  // Initial scroll to center the selected time
  React.useEffect(() => {
    if (isAdvanced && timeRollerRef.current && !isScrolling) {
      const selectedElement = timeRollerRef.current.querySelector(`[data-time="${startTime}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [isAdvanced]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isAdvanced) return;
    
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const itemHeight = 52; // Matching the new h-[52px]
    const index = Math.round(scrollTop / itemHeight);
    const newTime = timeOptions[index];
    
    if (newTime !== undefined && newTime !== startTime) {
      // Small delay to ensure the user has actually landed on the time
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setStartTime(newTime);
      }, 10);
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatTimeRange = () => {
    const start = formatTime(startTime);
    const end = formatTime(endTime);
    const durStr = duration >= 60 ? `${(duration / 60).toFixed(1)} hr` : `${duration} min`;
    return `${start} – ${end} (${durStr})`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTagId) return;
    await Promise.resolve(
      onSubmit({title: title || 'New Event', date, startTime, endTime, tagId: selectedTagId, location}),
    );
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const newTag = onAddTag(newTagName, newTagColorIndex);
    setSelectedTagId(newTag.id);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const timeOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 24 * 4; i++) {
      opts.push(i * 15);
    }
    return opts;
  }, []);

  const durationOptions = [
    { label: '1', value: 1 },
    { label: '15', value: 15 },
    { label: '30', value: 30 },
    { label: '45', value: 45 },
    { label: '1h', value: 60 },
    { label: '1.5h', value: 90 },
  ];

  if (isAdvanced) {
    const selectedTag = tags.find(t => t.id === selectedTagId);
    const headerColor = selectedTag ? selectedTag.color.replace('bg-', '') : '#000000';
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm md:z-[100]"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl max-h-[min(90dvh,100dvh)] flex flex-col border border-black/5 overscroll-contain md:max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Section */}
          <div 
            className="p-8 relative shrink-0 transition-colors duration-500"
            style={{ backgroundColor: headerColor.startsWith('#') ? headerColor : undefined }}
          >
            {/* If it's a tailwind class, we use the class, otherwise the inline style */}
            {!headerColor.startsWith('#') && <div className={`absolute inset-0 ${selectedTag?.color}`} />}
            
            <div className="relative z-10">
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-white hover:bg-black/20 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mt-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-sm border border-white/20">
                  <Languages size={28} />
                </div>
                <div className="flex-1 relative">
                  <p className="text-white/80 text-[11px] font-bold mb-1 uppercase tracking-wider">{formatTimeRange()}</p>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder={t('event_title')}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-white/40 text-2xl font-bold text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors py-1"
                    />
                    <div className="w-6 h-6 rounded-full border-2 border-white/40 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-6 space-y-8 overflow-y-auto no-scrollbar flex-1 bg-white max-md:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            {/* Date Selector */}
            <div className="bg-gray-50 rounded-3xl p-5 flex items-center justify-between group cursor-pointer hover:bg-gray-100 transition-all border border-black/[0.03]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <CalendarIcon size={18} className="text-black" />
                </div>
                <span className="text-black font-bold">
                  {new Date(date).toLocaleDateString(language === '日本語' ? 'ja-JP' : 'default', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-black/30 text-[11px] font-bold uppercase tracking-wider">
                {t('today')} <ChevronRight size={14} />
              </div>
            </div>

            {/* Time Roller */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-black/40 text-xs font-bold uppercase tracking-widest">{t('time')}</h4>
                <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-black/20 hover:text-black/40 transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>
              <div className="relative">
                <div 
                  ref={timeRollerRef}
                  onScroll={handleScroll}
                  className="bg-gray-50 rounded-[32px] h-64 overflow-y-auto no-scrollbar relative border border-black/[0.03] snap-y snap-mandatory"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
                  }}
                >
                  <div className="py-24 relative z-10">
                    {timeOptions.map((t) => {
                      const isSelected = startTime === t;
                      let displayTimeLabel = formatTime(t);
                      
                      // Day rollover logic
                      const totalMinutes = t + (t > startTime ? duration : 0);
                      const isNextDay = totalMinutes >= 1440;
                      
                      if (isSelected) {
                        displayTimeLabel = `${formatTime(t)} – ${formatTime(t + duration)}`;
                      } else if (t > startTime) {
                        displayTimeLabel = formatTime(t + duration);
                      }

                      if (isNextDay && !isSelected) {
                        displayTimeLabel += "⁺¹";
                      }

                      return (
                        <motion.button
                          key={t}
                          data-time={t}
                          type="button"
                          initial={false}
                          animate={{
                            scale: isSelected ? 1 : 0.85,
                            opacity: isSelected ? 1 : 0.3,
                            backgroundColor: isSelected ? '#000000' : 'transparent',
                            color: isSelected ? '#ffffff' : '#000000',
                          }}
                          transition={{ type: 'spring', stiffness: 80, damping: 15, mass: 1 }}
                          onClick={() => {
                            setStartTime(t);
                            const el = timeRollerRef.current?.querySelector(`[data-time="${t}"]`);
                            el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                          }}
                          className={`w-[90%] mx-auto h-[52px] flex items-center justify-center rounded-full snap-center shrink-0 outline-none transition-shadow ${isSelected ? 'shadow-lg shadow-black/30' : ''}`}
                        >
                          <span className={`font-bold transition-all duration-500 ${isSelected ? 'text-lg' : 'text-sm'}`}>
                            {displayTimeLabel}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                {/* Visual Guide - matching the new pill shape */}
                <div className="absolute top-1/2 -translate-y-1/2 left-[5%] right-[5%] h-[52px] border-2 border-black/5 rounded-full pointer-events-none z-0" />
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-black/40 text-xs font-bold uppercase tracking-widest">{t('duration')}</h4>
                <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-black/20 hover:text-black/40 transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>
              <div className="bg-gray-50 rounded-full p-1.5 flex gap-1 border border-black/[0.03]">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={`flex-1 py-3 rounded-full text-sm font-bold transition-all duration-300 ${duration === opt.value ? 'bg-black text-white shadow-md' : 'text-black/30 hover:text-black/50 hover:bg-black/5'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Selector */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-black/40 text-xs font-bold uppercase tracking-widest">{t('tags')}</h4>
                <button 
                  type="button"
                  onClick={() => setIsCreatingTag(!isCreatingTag)}
                  className="text-[11px] font-bold text-black uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                  {isCreatingTag ? t('cancel') : `+ ${t('new_tag')}`}
                </button>
              </div>

              {isCreatingTag ? (
                <div className="bg-gray-50 p-4 rounded-3xl space-y-3 border border-black/[0.03]">
                  <input 
                    type="text" 
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder={t('tag_name')}
                    className="w-full bg-white border-none outline-none rounded-xl px-4 py-2 text-sm placeholder:text-black/20 focus:ring-2 ring-black/20 transition-all"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {PRESET_COLORS.map((color, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewTagColorIndex(i)}
                          className={`w-6 h-6 rounded-full ${color.bg} flex items-center justify-center transition-all ${newTagColorIndex === i ? 'ring-2 ring-black scale-110' : 'hover:scale-105'}`}
                        >
                          {newTagColorIndex === i && <Check size={12} className={color.text} />}
                        </button>
                      ))}
                    </div>
                    <button 
                      type="button"
                      onClick={handleCreateTag}
                      className="px-4 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold hover:scale-105 transition-transform"
                    >
                      {t('save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedTagId(tag.id)}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${selectedTagId === tag.id ? `${tag.color} ${tag.textColor} shadow-md scale-105` : 'bg-gray-50 text-black/40 hover:bg-gray-100 border border-black/[0.03]'}`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <button 
                type="button"
                onClick={() => void handleSubmit()}
                className="w-full py-5 bg-black text-white rounded-[32px] font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-black/10"
              >
                {t('save_label')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-6 max-md:p-4 bg-black/20 backdrop-blur-sm md:z-[100]"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] p-8 max-md:p-6 shadow-2xl max-h-[min(90dvh,100dvh)] overflow-y-auto overscroll-contain custom-scrollbar md:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-display font-bold">{t('add_event')}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-md:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          <div>
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-2 block">{t('title')}</label>
            <input 
              type="text"
              placeholder={t('event_title')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/5 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-2 block">{t('date')}</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-black/5 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-2 block">{t('start_time')}</label>
              <select 
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="w-full bg-black/5 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none appearance-none"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-2 block">{t('duration')}</label>
            <div className="flex gap-1.5">
              {[15, 30, 45, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${duration === d ? 'bg-black text-white' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
                >
                  {d >= 60 ? `${d/60}h` : `${d}m`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest block">{t('tags')}</label>
              <button 
                type="button"
                onClick={() => setIsCreatingTag(!isCreatingTag)}
                className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                {isCreatingTag ? t('cancel') : `+ ${t('new_tag')}`}
              </button>
            </div>
            
            {isCreatingTag ? (
              <div className="bg-black/5 p-4 rounded-[24px] space-y-3 border border-black/5">
                <input 
                  type="text" 
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder={t('tag_name')}
                  className="w-full bg-white border-none outline-none rounded-xl px-4 py-2 text-sm placeholder:text-black/20 focus:ring-2 ring-black/5 transition-all"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {PRESET_COLORS.map((color, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewTagColorIndex(i)}
                        className={`w-6 h-6 rounded-full ${color.bg} flex items-center justify-center transition-all ${newTagColorIndex === i ? 'ring-2 ring-black scale-110' : 'hover:scale-105'}`}
                      >
                        {newTagColorIndex === i && <Check size={12} className={color.text} />}
                      </button>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={handleCreateTag}
                    className="px-4 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold hover:scale-105 transition-transform"
                  >
                    {t('save_label')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      selectedTagId === tag.id 
                        ? `${tag.color} ${tag.textColor} ring-2 ring-black/5 scale-105` 
                        : 'bg-black/5 text-black/40 hover:bg-black/10'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-bold text-base hover:bg-black/90 active:scale-95 transition-all shadow-lg"
          >
            {t('create_event')}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
