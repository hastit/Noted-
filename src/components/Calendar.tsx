import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, MoreHorizontal, X, Tag as TagIcon, Check, Zap, Calculator, Moon, Book, Languages } from 'lucide-react';

import { CalendarEvent, Tag } from '../types';
import { CalendarDayView } from './CalendarDayView';
import { DEFAULT_TAGS, MOCK_EVENTS } from '../constants';
import { useLanguage } from '../context/LanguageContext';

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

interface CalendarProps {
  events: CalendarEvent[];
  tags: Tag[];
  onEventsChange: (events: CalendarEvent[]) => void;
  onTagsChange: (tags: Tag[]) => void;
}

export default function Calendar({ events, tags, onEventsChange, onTagsChange }: CalendarProps) {
  const { t, language } = useLanguage();
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdvancedModal, setIsAdvancedModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: number } | null>(null);

  const monthYearLabel = currentDate.toLocaleString(language === '日本語' ? 'ja-JP' : 'default', { month: 'long', year: 'numeric' });

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleAddEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: Math.random().toString(36).substr(2, 9),
    };
    onEventsChange([...events, newEvent]);
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
    <div className="h-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-12 pt-4">
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-2 uppercase">
            {monthYearLabel}
          </h1>
          <p className="text-muted text-sm font-bold uppercase tracking-widest opacity-60">{t('calendar_subtitle') || 'Your schedule at a glance'}</p>
        </div>

        <div className="flex items-center gap-8">
          {/* View Toggle */}
          <div className="bg-surface/50 p-1.5 rounded-pill flex items-center gap-1 border border-black/5 shadow-inner">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-6 py-2.5 rounded-pill text-[10px] font-bold transition-all duration-300 uppercase tracking-[0.2em] ${
                  view === v ? 'bg-ink shadow-xl text-canvas scale-105' : 'text-muted hover:text-ink/60'
                }`}
              >
                {v === 'month' ? t('month') : v === 'week' ? t('week') : t('day')}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleNavigate('prev')}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-black/5 transition-all border border-black/5 shadow-sm hover:shadow-md active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="h-12 px-6 bg-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-black/5 transition-all border border-black/5 shadow-sm hover:shadow-md active:scale-95"
              >
                {t('today')}
              </button>
              <button 
                onClick={() => handleNavigate('next')}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-black/5 transition-all border border-black/5 shadow-sm hover:shadow-md active:scale-95"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button 
              onClick={() => {
                setSelectedSlot({ date: formatDate(currentDate), time: 540 });
                setIsModalOpen(true);
              }}
              className="px-8 h-12 bg-ink text-canvas rounded-pill flex items-center gap-3 hover:scale-105 transition-transform font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-black/10"
            >
              <Plus size={20} />
              <span>{t('add_event')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'month' && (
            <MonthView 
              key="month" 
              events={events} 
              tags={tags} 
              currentDate={currentDate}
              onSelectSlot={(date) => {
                setSelectedSlot({ date, time: 540 });
                setIsModalOpen(true);
              }}
            />
          )}
          {view === 'week' && (
            <WeekView 
              key="week" 
              events={events} 
              tags={tags} 
              currentDate={currentDate}
              onSelectSlot={(date, hour) => {
                setSelectedSlot({ date, time: hour * 60 });
                setIsModalOpen(true);
              }}
            />
          )}
          {view === 'day' && (
            <CalendarDayView 
              key="day" 
              events={events} 
              tags={tags} 
              currentDate={currentDate}
              onAddEventClick={() => {
                setIsAdvancedModal(true);
                setIsModalOpen(true);
              }}
            />
          )}
        </AnimatePresence>
      </div>

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
}

const MonthView: React.FC<MonthViewProps> = ({ events, tags, currentDate, onSelectSlot }) => {
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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="h-full bg-surface/30 rounded-[48px] overflow-y-auto no-scrollbar border border-black/5 shadow-inner relative scroll-smooth"
    >
      {/* Global Sticky Weekday Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/5 grid grid-cols-7">
        {weekDays.map(day => (
          <div key={day} className="py-4 text-center text-[10px] font-bold text-muted uppercase tracking-[0.3em]">
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
            <div className="sticky top-[49px] z-20 bg-white/60 backdrop-blur-lg px-10 py-4 border-b border-black/5">
              <h2 className="text-2xl font-bold text-ink uppercase tracking-tight">
                {monthDate.toLocaleString(language === '日本語' ? 'ja-JP' : 'default', { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 px-4">
              {/* Empty slots for the first week */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square border-r border-b border-black/5 bg-transparent" />
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
                    onClick={() => onSelectSlot(dateStr)}
                    className={`relative border-r border-b border-black/5 p-4 flex flex-col transition-all hover:bg-white hover:shadow-xl hover:z-10 hover:rounded-3xl cursor-pointer group aspect-square min-h-[140px] ${
                      (firstDayOfMonth + dayNumber) % 7 === 0 ? 'border-r-0' : ''
                    } ${isSelectedMonthDay ? 'bg-white/50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-sm font-bold ${isToday ? 'text-ink' : 'text-muted opacity-40'}`}>
                        {dayNumber.toString().padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-2">
                        {isToday && (
                          <div className="w-2 h-2 rounded-full bg-ink shadow-lg shadow-black/20" />
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                          <Plus size={16} className="text-ink" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Events List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                      {dayEvents.map(event => {
                        const tag = tags.find(t => t.id === event.tagId);
                        return (
                          <div 
                            key={event.id} 
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold truncate border border-black/5 shadow-sm hover:scale-105 transition-transform ${tag?.color || 'bg-surface'} ${tag?.textColor || 'text-ink'}`}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Empty slots to fill the last week */}
              {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
                <div key={`empty-end-${i}`} className="aspect-square border-r border-b border-black/5 bg-transparent last:border-r-0" />
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
  const { t, language } = useLanguage();
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

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="h-full flex flex-col bg-surface/30 rounded-[48px] p-8 border border-black/5 shadow-inner"
    >
      {/* Week Header */}
      <div className="grid grid-cols-[100px_1fr] mb-8">
        <div className="flex items-center justify-center">
          <div className="w-14 h-14 rounded-3xl bg-white flex items-center justify-center border border-black/5 shadow-sm">
            <CalendarIcon size={24} className="text-ink/40" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => (
            <div 
              key={day.date}
              className={`flex flex-col items-center justify-center py-6 rounded-[24px] transition-all duration-500 ${
                day.active ? 'bg-ink text-canvas shadow-2xl scale-105 z-10' : 'bg-white text-muted border border-black/5 shadow-sm'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-2 ${day.active ? 'text-canvas/50' : 'text-muted opacity-60'}`}>
                {day.name.substring(0, 3)}
              </span>
              <span className="text-3xl font-bold tracking-tighter">{day.date.toString().padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative rounded-[32px] bg-white/50 border border-black/5">
        <div className="grid grid-cols-[100px_1fr] min-h-[1440px] relative">
          {/* Time Labels */}
          <div className="flex flex-col border-r border-black/5 bg-white/30">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] text-[10px] font-bold text-muted flex items-start justify-center pt-4 uppercase tracking-widest opacity-40">
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {/* Grid Area */}
          <div className="relative grid grid-cols-7">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {hours.map((hour) => (
                <div key={hour} className="h-[60px] border-b border-black/5 w-full" />
              ))}
            </div>
            
            {/* Interactive Columns */}
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="relative border-r border-black/5 h-full last:border-r-0">
                {/* Clickable Slots */}
                {hours.map((hour) => (
                  <div 
                    key={hour} 
                    onClick={() => onSelectSlot(day.fullDate, hour)}
                    className="h-[60px] hover:bg-black/[0.02] transition-colors cursor-pointer"
                  />
                ))}

                {/* Events for this day */}
                {events.filter(e => e.date === day.fullDate).map((event) => {
                  const tag = tags.find(t => t.id === event.tagId);
                  const top = (event.startTime / 60) * 60;
                  const height = ((event.endTime - event.startTime) / 60) * 60;
                  
                  return (
                    <div 
                      key={event.id}
                      className={`absolute left-1.5 right-1.5 rounded-2xl p-4 shadow-xl flex flex-col overflow-hidden group hover:scale-[1.02] hover:z-50 transition-all duration-300 cursor-pointer border border-black/5 ${tag?.color || 'bg-surface'} ${tag?.textColor || 'text-ink'}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="mb-1">
                        <h4 className="font-bold text-xs leading-tight mb-1 uppercase tracking-tight">{event.title}</h4>
                        <p className="text-[9px] opacity-70 font-bold uppercase tracking-[0.2em]">
                          {formatTime(event.startTime)}
                        </p>
                      </div>
                      {event.location && (
                        <div className="mt-auto flex items-center gap-2 text-[8px] opacity-60 font-bold uppercase tracking-[0.2em]">
                          <MapPin size={10} />
                          {event.location}
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
    </motion.div>
  );
};

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
  onSubmit: (data: Omit<CalendarEvent, 'id'>) => void;
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTagId) return;
    onSubmit({ title: title || 'New Event', date, startTime, endTime, tagId: selectedTagId, location });
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const newTag = onAddTag(newTagName, newTagColorIndex);
    setSelectedTagId(newTag.id);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const selectedTag = tags.find(t => t.id === selectedTagId);
  const headerColor = selectedTag ? selectedTag.color.replace('bg-', '') : '#000000';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col border border-black/5"
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
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-white hover:bg-black/20 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="px-4 py-1.5 rounded-pill bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white uppercase tracking-widest">
                {isAdvanced ? t('advanced_event') : t('new_event')}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/30 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-sm border border-white/20">
                <CalendarIcon size={28} />
              </div>
              <div className="flex-1 relative">
                <p className="text-white/80 text-[10px] font-bold mb-1 uppercase tracking-widest">{formatTimeRange()}</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder={t('event_title')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-white/40 text-2xl font-bold text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors py-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body Section */}
        <div className="p-8 space-y-8 overflow-y-auto no-scrollbar flex-1 bg-canvas">
          {/* Date Selector */}
          <div className="bg-surface rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:bg-black/5 transition-all border border-black/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-canvas shadow-sm flex items-center justify-center border border-black/5">
                <CalendarIcon size={18} className="text-ink" />
              </div>
              <div className="flex flex-col">
                <span className="text-ink font-bold text-sm">
                  {new Date(date).toLocaleDateString(language === '日本語' ? 'ja-JP' : 'default', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted text-[10px] font-bold uppercase tracking-widest">
              {t('change')} <ChevronRight size={14} />
            </div>
          </div>

          {/* Time Roller */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-muted text-[10px] font-bold uppercase tracking-widest">{t('time')}</h4>
            </div>
            <div className="relative">
              <div 
                ref={timeRollerRef}
                onScroll={handleScroll}
                className="bg-surface rounded-card h-64 overflow-y-auto no-scrollbar relative border border-black/5 snap-y snap-mandatory"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
                }}
              >
                <div className="py-24 relative z-10">
                  {timeOptions.map((t) => {
                    const isSelected = startTime === t;
                    let displayTimeLabel = formatTime(t);
                    
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
                        className={`w-[90%] mx-auto h-[52px] flex items-center justify-center rounded-pill snap-center shrink-0 outline-none transition-shadow ${isSelected ? 'shadow-lg shadow-black/20' : ''}`}
                      >
                        <span className={`font-bold transition-all duration-500 ${isSelected ? 'text-base' : 'text-xs'}`}>
                          {displayTimeLabel}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 left-[5%] right-[5%] h-[52px] border-2 border-black/5 rounded-pill pointer-events-none z-0" />
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-muted text-[10px] font-bold uppercase tracking-widest">{t('duration')}</h4>
            </div>
            <div className="bg-surface rounded-pill p-1.5 flex gap-1 border border-black/5">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={`flex-1 py-3 rounded-pill text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${duration === opt.value ? 'bg-ink text-canvas shadow-md' : 'text-muted hover:text-ink/60 hover:bg-black/5'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Selector */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-muted text-[10px] font-bold uppercase tracking-widest">{t('tags')}</h4>
              <button 
                type="button"
                onClick={() => setIsCreatingTag(!isCreatingTag)}
                className="text-[10px] font-bold text-ink uppercase tracking-widest hover:opacity-80 transition-opacity"
              >
                {isCreatingTag ? t('cancel') : `+ ${t('new_tag')}`}
              </button>
            </div>

            {isCreatingTag ? (
              <div className="bg-surface p-5 rounded-card space-y-4 border border-black/5">
                <input 
                  type="text" 
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder={t('tag_name')}
                  className="w-full bg-canvas border border-black/5 outline-none rounded-xl px-4 py-3 text-sm placeholder:text-muted focus:ring-2 ring-black/5 transition-all"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((color, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewTagColorIndex(i)}
                        className={`w-7 h-7 rounded-full ${color.bg} flex items-center justify-center transition-all ${newTagColorIndex === i ? 'ring-2 ring-ink scale-110' : 'hover:scale-105'}`}
                      >
                        {newTagColorIndex === i && <Check size={14} className={color.text} />}
                      </button>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={handleCreateTag}
                    className="px-5 py-2 bg-ink text-canvas rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
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
                    className={`px-4 py-2 rounded-pill text-[10px] font-bold uppercase tracking-widest transition-all border border-black/5 ${
                      selectedTagId === tag.id 
                        ? `${tag.color} ${tag.textColor} ring-2 ring-ink ring-offset-2` 
                        : 'bg-surface text-muted hover:text-ink hover:bg-black/5'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location Input */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-muted text-[10px] font-bold uppercase tracking-widest">{t('location')}</h4>
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input 
                type="text"
                placeholder={t('add_location')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-surface border border-black/5 outline-none rounded-pill px-12 py-4 text-sm placeholder:text-muted focus:ring-2 ring-black/5 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            onClick={() => handleSubmit()}
            className="w-full py-5 bg-ink text-canvas rounded-pill font-bold uppercase tracking-[0.2em] shadow-xl shadow-black/10 hover:scale-[1.02] transition-transform mt-4"
          >
            {t('create_event')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
