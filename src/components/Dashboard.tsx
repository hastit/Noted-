import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Play, Calendar as CalendarIcon, Zap, ArrowRight, MoreVertical } from 'lucide-react';
import { MOCK_NOTEBOOKS } from '../constants';
import { CalendarDayView } from './CalendarDayView';
import { CalendarEvent, Tag } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DashboardProps {
  events: CalendarEvent[];
  tags: Tag[];
  onNavigate: (tab: 'dashboard' | 'tasks' | 'notes' | 'calendar' | 'settings', notebookId?: string) => void;
}

export default function Dashboard({ events, tags, onNavigate }: DashboardProps) {
  const { t, language } = useLanguage();
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t('good_morning'));
    else if (hour < 18) setGreeting(t('good_afternoon'));
    else setGreeting(t('good_evening'));

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [t]);

  const recentNotebooks = MOCK_NOTEBOOKS.slice(0, 4);

  return (
    <div className="h-full flex flex-col gap-8 overflow-y-auto no-scrollbar pb-12">
      {/* Header Section */}
      <div className="flex items-end justify-between shrink-0 pt-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">
            {greeting}, Alex <span className="inline-block animate-bounce-slow">✨</span>
          </h1>
          <p className="text-muted text-sm font-medium">
            {currentTime.toLocaleDateString(language === '日本語' ? 'ja-JP' : language === 'Español' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="pill-button flex items-center gap-2">
            <Play size={14} className="fill-current" />
            {t('start_focus')}
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="bento-grid flex-1">
        
        {/* Today's Agenda - Large Card */}
        <div className="col-span-12 lg:col-span-5 row-span-6 bento-card bg-surface">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-ink">
                <CalendarIcon size={16} />
              </div>
              <h3 className="text-lg font-bold">{t('today_agenda')}</h3>
            </div>
            <button 
              onClick={() => onNavigate('calendar')}
              className="text-xs font-bold text-muted hover:text-ink transition-colors"
            >
              {t('view_all')}
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <CalendarDayView 
              events={events}
              tags={tags}
              currentDate={currentTime}
              compact={true}
            />
          </div>
        </div>

        {/* Recent Notebooks - Grid of Small Cards */}
        <div className="col-span-12 lg:col-span-7 row-span-4 bento-card bg-canvas border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">{t('recent_notebooks')}</h3>
            <button 
              onClick={() => onNavigate('notes')}
              className="text-xs font-bold text-muted hover:text-ink transition-colors"
            >
              {t('view_library')}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentNotebooks.map((notebook, i) => (
              <motion.div
                key={notebook.id}
                whileHover={{ y: -4 }}
                onClick={() => onNavigate('notes', notebook.id)}
                className="group cursor-pointer"
              >
                <div 
                  className="aspect-square rounded-2xl mb-3 shadow-sm group-hover:shadow-md transition-all duration-300 flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: notebook.color }}
                >
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <BookOpen size={24} className="text-ink/20" />
                </div>
                <h4 className="text-sm font-bold truncate">{notebook.title}</h4>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-0.5">
                  {notebook.notesCount} {t('pages')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Capture - Medium Card */}
        <div className="col-span-12 lg:col-span-4 row-span-2 bento-card bg-ink text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Zap size={16} />
            </div>
            <h3 className="text-lg font-bold">{t('quick_capture')}</h3>
          </div>
          <p className="text-sm text-white/60 mb-6">Capture your thoughts instantly.</p>
          <button className="w-full py-3 bg-white text-ink rounded-pill font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-colors">
            {t('new_quick_note')}
          </button>
        </div>

        {/* Daily Inspiration - Medium Card */}
        <div className="col-span-12 lg:col-span-3 row-span-2 bento-card bg-surface">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-ink">
              <Sparkles size={16} />
            </div>
            <h3 className="text-lg font-bold">{t('inspiration')}</h3>
          </div>
          <p className="text-sm font-medium italic leading-relaxed text-ink/70">
            "The beautiful thing about learning is that no one can take it away from you."
          </p>
        </div>

      </div>
    </div>
  );
}
