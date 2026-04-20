import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Book, Sparkles, Calendar as CalendarIcon, Zap, ArrowRight, PenLine, Type, Trash2 } from 'lucide-react';
import { CalendarDayView } from './CalendarDayView';
import PomodoroTimer from './PomodoroTimer';
import { CalendarEvent, Notebook, Note, Tag } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { getDisplayName } from '../lib/displayName';

interface DashboardProps {
  events: CalendarEvent[];
  tags: Tag[];
  notebooks: Notebook[];
  /** Pour afficher les cartes carnets comme dans Notes (aperçu + nombre de pages) */
  notes?: Note[];
  onNavigate: (tab: 'dashboard' | 'tasks' | 'notes' | 'calendar' | 'settings', notebookId?: string) => void;
}

export default function Dashboard({ events, tags, notebooks, notes = [], onNavigate }: DashboardProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const displayName = getDisplayName(user);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [agendaExpanded, setAgendaExpanded] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t('good_morning'));
    else if (hour < 18) setGreeting(t('good_afternoon'));
    else setGreeting(t('good_evening'));
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [t]);

  const recentNotebooks = notebooks.slice(0, 4);
  const todayStr = currentTime.toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);

  const eventsForAgenda = useMemo(() => {
    if (!isMobile || agendaExpanded) return events;
    const notToday = events.filter(e => e.date !== todayStr);
    return [...notToday, ...todayEvents.slice(0, 3)];
  }, [events, isMobile, agendaExpanded, todayStr, todayEvents]);

  return (
    <div className="h-full min-h-0 flex flex-col gap-5 max-md:gap-5 sm:gap-6 lg:gap-8 overflow-y-auto overflow-x-hidden pb-6 max-md:pb-6 sm:pb-8 [scrollbar-width:thin]">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3 max-md:gap-4 sm:flex-row sm:items-end sm:justify-between pt-2 max-md:pt-4 shrink-0 min-w-0"
      >
        <div className="min-w-0">
          <p className="text-xs max-md:text-[11px] max-md:font-semibold max-md:tracking-[0.14em] font-semibold text-black/30 uppercase tracking-[0.18em] mb-1 max-md:mb-2 truncate">
            {currentTime.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
              weekday: 'long', month: 'long', day: 'numeric'
            })}
          </p>
          <h1 className="text-2xl max-md:text-[22px] max-md:leading-tight sm:text-3xl font-bold tracking-tight text-black truncate">
            {greeting}, {displayName}
          </h1>
        </div>

        <div className="flex w-full shrink-0 flex-row flex-wrap items-center gap-2 max-md:gap-2.5 sm:mb-1 sm:w-auto sm:items-center">
          <button
            type="button"
            onClick={() => onNavigate('notes')}
            className="flex max-md:flex-1 md:flex-initial max-md:min-h-10 max-md:h-10 max-md:px-3 max-md:text-[13px] max-md:rounded-lg min-h-[44px] w-full md:w-auto sm:w-auto items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-black/[0.04] active:bg-black/[0.08] text-black/70 text-sm font-semibold"
          >
            <PenLine size={isMobile ? 13 : 14} />
            New note
          </button>
        </div>
      </motion.div>

      {/* ── Main grid ── (2 cols from sm: agenda | notebooks + inspiration — matches tablet + narrow desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 max-sm:gap-5 sm:gap-5 w-full min-w-0 sm:items-start shrink-0">

        {/* Today's Agenda */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="sm:col-span-4 flex flex-col min-h-0 min-w-0"
        >
          <div className="flex flex-col h-full min-h-0 rounded-2xl max-sm:rounded-xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 max-sm:px-4 py-4 max-sm:py-3.5 border-b border-black/[0.05]">
              <div className="flex items-center gap-2 max-sm:gap-2.5">
                <div className="w-7 h-7 max-sm:w-6 max-sm:h-6 rounded-lg bg-[#dbeafe] flex items-center justify-center">
                  <CalendarIcon size={isMobile ? 12 : 14} className="text-[#1d4ed8]" />
                </div>
                <span className="text-sm max-sm:text-[15px] font-semibold text-black">{t('today_agenda')}</span>
              </div>
              {todayEvents.length > 0 && (
                <span className="text-xs max-sm:text-[11px] font-bold text-[#1d4ed8] bg-[#dbeafe] px-2 py-0.5 rounded-full tabular-nums">
                  {todayEvents.length} events
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 max-sm:p-3.5 [scrollbar-width:thin]">
              <CalendarDayView
                events={eventsForAgenda}
                tags={tags}
                currentDate={currentTime}
                compact={true}
              />
            </div>

            {isMobile && todayEvents.length > 3 && !agendaExpanded && (
              <div className="px-3 max-sm:px-4 pb-1 max-sm:pb-1.5">
                <button
                  type="button"
                  onClick={() => setAgendaExpanded(true)}
                  className="w-full min-h-9 rounded-lg text-[13px] font-medium text-[#1d4ed8] active:bg-[#dbeafe]/40"
                >
                  See more
                </button>
              </div>
            )}

            <div className="px-4 max-sm:px-4 pb-4 max-sm:pb-4">
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="w-full max-sm:min-h-10 max-sm:text-[13px] max-sm:rounded-lg min-h-[44px] py-2.5 rounded-xl border border-black/[0.08] text-sm font-semibold text-black/50 active:text-black active:border-black/25 transition-colors flex items-center justify-center gap-1.5"
              >
                {t('open_calendar')}
                <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="sm:col-span-8 flex flex-col gap-4 max-sm:gap-5 sm:gap-5 min-h-0 min-w-0">

          {/* Recent Notebooks */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.13 }}
          >
            <div className="flex items-center justify-between mb-3 max-sm:mb-3.5">
              <h2 className="text-sm max-sm:text-[15px] font-semibold text-black">{t('recent_notebooks')}</h2>
              <button
                onClick={() => onNavigate('notes')}
                className="flex items-center gap-1 text-xs font-semibold text-[#1d4ed8] hover:text-[#1e3a8a] transition-colors"
              >
                {t('view_library')}
                <ArrowRight size={11} />
              </button>
            </div>

            {/* max-md : même rendu que la section Carnets de Notes (scroll horizontal, 122px) */}
            <div className="md:hidden overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 min-w-0 overscroll-x-contain [scrollbar-width:thin] touch-pan-x">
              <div className="flex flex-nowrap items-stretch gap-2 w-max pr-1">
                {recentNotebooks.map((notebook, i) => {
                  const count = notes.filter(n => n.notebookId === notebook.id).length;
                  const recentNote = notes
                    .filter(n => n.notebookId === notebook.id)
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                  return (
                    <motion.div
                      key={notebook.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.18 + i * 0.06 }}
                      whileHover={{ y: -4, transition: { duration: 0.15 } }}
                      onClick={() => onNavigate('notes', notebook.id)}
                      className="group cursor-pointer shrink-0 w-[122px]"
                    >
                      <div
                        className="aspect-[3/4] rounded-lg relative overflow-hidden flex flex-col shadow-sm w-full min-w-0"
                        style={{ backgroundColor: notebook.color }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 h-full w-[5px] bg-black/[0.09]" />
                        <div
                          className="absolute inset-0 flex flex-col"
                          style={{ paddingLeft: '12px', paddingTop: '40%', paddingBottom: '30%' }}
                        >
                          {[...Array(5)].map((_, j) => (
                            <div key={j} className="flex-1 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }} />
                          ))}
                        </div>
                        <div className="relative z-10 flex flex-col h-full p-3 gap-1">
                          <div className="flex justify-between items-start gap-2">
                            <div className="shrink-0">
                              {notebook.emoji ? (
                                <span className="text-lg leading-none">{notebook.emoji}</span>
                              ) : (
                                <Book size={16} className="text-black/25 scale-[0.82] origin-top-left" />
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onNavigate('notes', notebook.id);
                                }}
                                className="p-1 hover:bg-black/10 rounded text-black/30 hover:text-black/60 transition-colors"
                              >
                                <Type size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onNavigate('notes', notebook.id);
                                }}
                                className="p-1 hover:bg-red-50/60 rounded text-black/30 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-auto min-w-0 min-h-0">
                            <h4 className="font-bold text-xs leading-tight line-clamp-2 mb-0">{notebook.title}</h4>
                            {recentNote ? (
                              <p className="text-[8px] text-black/30 truncate mb-0 line-clamp-1">{recentNote.title}</p>
                            ) : null}
                            <p className="text-[8px] font-bold text-black/25 uppercase tracking-wide">
                              {count} {t('pages')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ≥768px : cartes plus larges + pastille ouvrir */}
            <div className="hidden md:flex md:flex-row md:flex-wrap md:items-stretch md:gap-2 lg:gap-2.5 min-w-0">
              {recentNotebooks.map((notebook, i) => (
                <motion.div
                  key={notebook.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 + i * 0.06 }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  onClick={() => onNavigate('notes', notebook.id)}
                  className="cursor-pointer group md:w-[146px] lg:w-[158px] shrink-0 min-w-0"
                >
                  <div
                    className="aspect-[3/4] rounded-lg relative overflow-hidden flex flex-col shadow-sm w-full min-w-0 md:hover:shadow-md transition-all"
                    style={{ backgroundColor: notebook.color }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 h-full w-[5px] md:w-1.5 bg-black/[0.09]" />

                    <div
                      className="pointer-events-none absolute inset-0 flex flex-col"
                      style={{ paddingLeft: '12px', paddingTop: '40%', paddingBottom: '30%' }}
                    >
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="flex-1 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }} />
                      ))}
                    </div>

                    <div className="relative z-10 flex flex-col h-full min-h-0 p-3.5 gap-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="shrink-0">
                          {notebook.emoji ? (
                            <span className="text-lg md:text-xl leading-none">{notebook.emoji}</span>
                          ) : (
                            <Book size={16} className="text-black/25 scale-[0.82] origin-top-left md:scale-90 md:w-[18px] md:h-[18px]" />
                          )}
                        </div>
                      </div>
                      <div className="mt-auto min-w-0 min-h-0">
                        <h4 className="font-bold text-xs md:text-[13px] leading-tight line-clamp-2 text-black">
                          {notebook.title}
                        </h4>
                        <p className="text-[8px] md:text-[9px] font-bold text-black/25 uppercase tracking-wide mt-0.5">
                          {t('two_hours_ago')}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-2 right-2 z-20 w-7 h-7 rounded-md bg-black/80 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <ArrowRight size={10} color="white" />
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
            className="rounded-2xl overflow-hidden relative border border-black/[0.06] shadow-sm min-h-[200px] max-md:min-h-[172px] sm:min-h-[220px]"
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

            <div className="relative z-10 p-5 max-md:p-4 sm:p-7 flex flex-col min-h-[inherit] justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 max-md:mb-3">
                  <Sparkles size={isMobile ? 12 : 13} className="text-blue-200/60" />
                  <span className="text-[10px] max-md:text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200/60">
                    Daily Inspiration
                  </span>
                </div>
                <p className="text-lg max-md:text-[15px] max-md:leading-snug font-semibold text-white max-w-lg">
                  "{t('quote')}"
                </p>
                <p className="text-xs max-md:text-[11px] font-semibold text-white/40 mt-3 max-md:mt-3 uppercase tracking-widest">
                  {t('author')}
                </p>
              </div>

              <div
                className="flex items-center gap-3 max-md:gap-2.5 mt-5 max-md:mt-4 p-4 max-md:p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-8 h-8 max-md:w-7 max-md:h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Zap size={isMobile ? 14 : 15} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] max-md:text-[11px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                    {t('productivity_tip')}
                  </p>
                  <p className="text-xs max-md:text-[13px] font-medium text-white/70 leading-snug">
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

      {/* Focus : plante + minuteur dans le flux (pas de bouton séparé) */}
      <div className="shrink-0 w-full min-w-0 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-black/[0.08] flex flex-col gap-4">
        <div className="px-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35 mb-1">{t('focus_session')}</p>
          <p className="text-sm text-black/45 max-w-xl">{t('focus_session_hint')}</p>
        </div>
        <div className="w-full max-w-4xl mx-auto min-w-0">
          <PomodoroTimer embedded />
        </div>
      </div>
    </div>
  );
}
