import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Play, Calendar as CalendarIcon, Zap, ArrowRight, PenLine } from 'lucide-react';
import { MOCK_NOTEBOOKS } from '../constants';
import { CalendarDayView } from './CalendarDayView';
import { CalendarEvent, Tag } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DashboardProps {
  events: CalendarEvent[];
  tags: Tag[];
  onNavigate: (tab: 'dashboard' | 'tasks' | 'notes' | 'calendar' | 'settings', notebookId?: string) => void;
  onStartFocus?: () => void;
}

export default function Dashboard({ events, tags, onNavigate, onStartFocus }: DashboardProps) {
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
  const todayStr = currentTime.toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);

  return (
    <div className="h-full flex flex-col gap-8 overflow-y-auto no-scrollbar pb-8">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between pt-2 shrink-0"
      >
        <div>
          <p className="text-xs font-semibold text-black/30 uppercase tracking-[0.18em] mb-1">
            {currentTime.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
              weekday: 'long', month: 'long', day: 'numeric'
            })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            {greeting}, Alex
          </h1>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => onNavigate('notes')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] text-black/60 hover:text-black transition-all text-xs font-semibold"
          >
            <PenLine size={14} />
            New note
          </button>
          <button
            onClick={onStartFocus}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white transition-all text-xs font-semibold shadow-sm shadow-blue-900/20"
          >
            <Play size={14} />
            {t('start_focus')}
          </button>
        </div>
      </motion.div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">

        {/* Today's Agenda */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="col-span-4 flex flex-col min-h-0"
        >
          <div className="flex flex-col h-full rounded-2xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#dbeafe] flex items-center justify-center">
                  <CalendarIcon size={14} className="text-[#1d4ed8]" />
                </div>
                <span className="text-sm font-semibold text-black">{t('today_agenda')}</span>
              </div>
              {todayEvents.length > 0 && (
                <span className="text-[10px] font-bold text-[#1d4ed8] bg-[#dbeafe] px-2 py-0.5 rounded-full">
                  {todayEvents.length} events
                </span>
              )}
            </div>

            <div className="flex-1 overflow-hidden p-3">
              <CalendarDayView
                events={events}
                tags={tags}
                currentDate={currentTime}
                compact={true}
              />
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => onNavigate('calendar')}
                className="w-full py-2.5 rounded-xl border border-black/[0.08] text-xs font-semibold text-black/40 hover:text-black hover:border-black/20 transition-all flex items-center justify-center gap-1.5"
              >
                {t('open_calendar')}
                <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="col-span-8 flex flex-col gap-5 min-h-0">

          {/* Recent Notebooks */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.13 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-black">{t('recent_notebooks')}</h2>
              <button
                onClick={() => onNavigate('notes')}
                className="flex items-center gap-1 text-xs font-semibold text-[#1d4ed8] hover:text-[#1e3a8a] transition-colors"
              >
                {t('view_library')}
                <ArrowRight size={11} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {recentNotebooks.map((notebook, i) => (
                <motion.div
                  key={notebook.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 + i * 0.06 }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  onClick={() => onNavigate('notes', notebook.id)}
                  className="cursor-pointer group"
                >
                  <div
                    className="rounded-2xl relative overflow-hidden flex flex-col justify-between p-5 border border-black/[0.06] shadow-sm hover:shadow-md transition-all"
                    style={{ backgroundColor: notebook.color, aspectRatio: '4/5' }}
                  >
                    <div className="absolute top-0 left-0 w-3 h-full bg-black/[0.04]" />

                    <div className="relative z-10 pl-1">
                      <div className="w-7 h-7 rounded-lg bg-white/50 flex items-center justify-center mb-3">
                        <BookOpen size={13} className="text-black/40" />
                      </div>
                      <h4 className="font-semibold text-sm leading-tight text-black line-clamp-2">
                        {notebook.title}
                      </h4>
                    </div>

                    <p className="relative z-10 pl-1 text-[9px] font-semibold text-black/30 uppercase tracking-wider">
                      {t('two_hours_ago')}
                    </p>

                    <div className="absolute bottom-3 right-3 w-6 h-6 rounded-lg bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <ArrowRight size={11} color="white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Inspiration card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="flex-1 rounded-2xl overflow-hidden relative border border-black/[0.06] shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)',
            }}
          >
            <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" viewBox="0 0 600 200">
              {[20, 60, 100, 140, 180].map((y, i) => (
                <path key={i}
                  d={`M 0 ${y} C 120 ${y - 14}, 280 ${y + 14}, 400 ${y} C 500 ${y - 10}, 560 ${y + 8}, 600 ${y}`}
                  fill="none" stroke="white" strokeWidth="1"
                />
              ))}
            </svg>

            <div className="relative z-10 p-7 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={13} className="text-blue-200/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/60">
                    Daily Inspiration
                  </span>
                </div>
                <p className="text-lg font-semibold text-white leading-snug max-w-lg">
                  "{t('quote')}"
                </p>
                <p className="text-xs font-semibold text-white/40 mt-3 uppercase tracking-widest">
                  {t('author')}
                </p>
              </div>

              <div
                className="flex items-center gap-3 mt-5 p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Zap size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                    {t('productivity_tip')}
                  </p>
                  <p className="text-xs font-medium text-white/70 leading-snug">
                    {t('tip_text')}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="absolute top-[-40%] right-[-10%] w-72 h-72 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(96, 165, 250, 0.15)' }}
            />
          </motion.div>

        </div>
      </div>
    </div>
  );
}
