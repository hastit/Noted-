import React, {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {motion} from 'motion/react';
import {ArrowDown, CalendarDays, CheckCircle2, LayoutGrid, Sparkles} from 'lucide-react';

const ShaderHeroBackground = lazy(() => import('./ShaderHeroBackground'));

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

function FadeUp({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{opacity: 0, y: 30}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-48px'}}
      transition={{duration: 0.6, ease: easeOut, delay}}
    >
      {children}
    </motion.div>
  );
}

function NotesMockup() {
  return (
    <div className="group relative flex justify-center py-6 [perspective:800px] md:py-10">
      <div
        className="relative w-[min(100%,280px)] rounded-sm border border-black/[0.06] bg-[#FFFEF5] p-6 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] transition-[transform,box-shadow] duration-500 ease-out will-change-transform group-hover:shadow-[0_32px_70px_-10px_rgba(0,0,0,0.2)]"
        style={{
          transform: 'perspective(800px) rotateX(4deg) rotateY(-6deg)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'perspective(800px) rotateX(1deg) rotateY(-2deg)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'perspective(800px) rotateX(4deg) rotateY(-6deg)';
        }}
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-rose-300/80" />
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-black/25">Quick note</p>
        <h4 className="mt-3 font-display text-lg font-bold text-neutral-900">Ideas for the essay</h4>
        <div className="mt-4 space-y-2">
          <div className="h-2 w-full rounded-full bg-black/[0.06]" />
          <div className="h-2 w-[92%] rounded-full bg-black/[0.05]" />
          <div className="h-2 w-[78%] rounded-full bg-black/[0.05]" />
          <div className="h-2 w-[88%] rounded-full bg-black/[0.04]" />
        </div>
        <div className="mt-5 flex gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">Draft</span>
        </div>
      </div>
    </div>
  );
}

function KanbanMockup() {
  const col = (title: string, items: string[], tint: string) => (
    <div className={`flex min-w-0 flex-1 flex-col gap-2 rounded-xl p-2 ${tint}`}>
      <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-black/40">{title}</p>
      {items.map((taskTitle, i) => (
        <div
          key={i}
          className="rounded-lg border border-black/[0.05] bg-white px-2.5 py-2 text-[11px] font-medium text-neutral-700 shadow-sm"
        >
          {taskTitle}
        </div>
      ))}
    </div>
  );
  return (
    <div className="group flex justify-center py-6 [perspective:800px] md:py-10">
      <div
        className="flex w-full max-w-[340px] gap-2 rounded-2xl border border-black/[0.06] bg-white/90 p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.15)] transition-[transform,box-shadow] duration-500 ease-out will-change-transform group-hover:shadow-[0_32px_70px_-10px_rgba(0,0,0,0.18)]"
        style={{transform: 'perspective(800px) rotateX(2deg) rotateY(8deg)'}}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'perspective(800px) rotateX(0.5deg) rotateY(3deg)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'perspective(800px) rotateX(2deg) rotateY(8deg)';
        }}
      >
        {col('To-Do', ['Read chapter 4', 'Email professor'], 'bg-slate-50/80')}
        {col('Started', ['Lab report'], 'bg-blue-50/60')}
        {col('Done', ['Outline', 'Bibliography'], 'bg-emerald-50/70')}
      </div>
    </div>
  );
}

function CalendarMockup() {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const cells = Array.from({length: 28}, (_, i) => i + 1);
  const events: Record<number, {label: string; color: string}[]> = {
    3: [{label: 'Study', color: 'bg-blue-500'}],
    8: [{label: 'Exam', color: 'bg-rose-500'}],
    12: [{label: 'Club', color: 'bg-violet-500'}, {label: '…', color: 'bg-black/20'}],
    19: [{label: 'Due', color: 'bg-amber-500'}],
  };
  return (
    <div className="group flex justify-center py-6 [perspective:800px] md:py-10">
      <div
        className="w-full max-w-[300px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.15)] transition-[transform,box-shadow] duration-500 ease-out will-change-transform group-hover:shadow-[0_32px_70px_-10px_rgba(0,0,0,0.18)]"
        style={{transform: 'perspective(800px) rotateX(3deg) rotateY(-5deg)'}}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'perspective(800px) rotateX(1deg) rotateY(-2deg)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'perspective(800px) rotateX(3deg) rotateY(-5deg)';
        }}
      >
        <div className="border-b border-black/[0.06] px-4 py-3">
          <p className="font-display text-sm font-bold text-neutral-900">April 2026</p>
        </div>
        <div className="grid grid-cols-7 gap-0 border-b border-black/[0.04] px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-black/35">
          {days.map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-black/[0.04] p-2">
          {cells.map(d => (
            <div key={d} className="flex min-h-[44px] flex-col gap-0.5 bg-white p-1">
              <span className="text-[10px] font-semibold text-black/45">{d}</span>
              {events[d]?.map((ev, j) => (
                <span
                  key={j}
                  className={`truncate rounded px-1 py-0.5 text-[8px] font-semibold text-white ${ev.color}`}
                >
                  {ev.label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const timelineSteps = [
  {
    n: 1,
    icon: Sparkles,
    title: 'Sign up in seconds',
    desc: 'Create your account and land in a clean workspace.',
  },
  {
    n: 2,
    icon: LayoutGrid,
    title: 'Set up your workspace',
    desc: 'Notebooks, tags, and views that match how you work.',
  },
  {
    n: 3,
    icon: CheckCircle2,
    title: 'Capture, plan, focus',
    desc: 'Notes, tasks, and calendar stay in sync — one flow.',
  },
  {
    n: 4,
    icon: CalendarDays,
    title: 'Stay on top of everything',
    desc: 'See what’s next and finish with less noise.',
  },
] as const;

export default function Landing() {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const [navSolid, setNavSolid] = useState(false);

  const onScroll = useCallback(() => {
    const el = scrollRootRef.current;
    const top = el ? el.scrollTop : 0;
    setNavSolid(top > 50);
  }, []);

  useEffect(() => {
    const el = scrollRootRef.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, {passive: true});
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  return (
    <div
      ref={scrollRootRef}
      className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-white [scrollbar-width:thin]"
    >
      {/* Nav */}
      <header
        className={`fixed left-0 right-0 top-0 z-[100] transition-all duration-300 ${
          navSolid ? 'border-b border-black/[0.06] bg-white/85 shadow-sm backdrop-blur-[12px]' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black">
              <div className="h-3.5 w-3.5 rotate-45 rounded-sm bg-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-neutral-900">Noted</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className={`rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                navSolid ? 'text-neutral-700 hover:bg-black/[0.05]' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 ${
                navSolid ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-white text-neutral-900 hover:bg-white/95'
              }`}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-24 sm:px-8"
        aria-label="Hero"
      >
        <Suspense
          fallback={
            <div
              className="absolute inset-0 z-0 bg-gradient-to-br from-[#F57799] via-[#dbba95] to-[#FAAC68]"
              aria-hidden
            />
          }
        >
          <ShaderHeroBackground />
        </Suspense>

        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/10 to-black/30" aria-hidden />

        <div className="relative z-[2] mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <motion.div
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut}}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-md"
          >
            <span className="text-base leading-none">✦</span>
            <span>Your calm productivity space</span>
          </motion.div>

          <motion.h1
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut, delay: 0.08}}
            className="font-display text-[36px] font-bold leading-[1.1] tracking-tight text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.25)] sm:text-5xl md:text-[64px]"
          >
            Everything you need.
            <br className="hidden sm:block" /> Nothing you don&apos;t.
          </motion.h1>

          <motion.p
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut, delay: 0.16}}
            className="mt-5 max-w-xl text-lg leading-relaxed text-white/60"
          >
            Notes, tasks, and calendar — beautifully unified.
          </motion.p>

          <motion.div
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: easeOut, delay: 0.24}}
            className="relative z-[2] mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              to="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-neutral-900 shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Get started free
            </Link>
            <button
              type="button"
              onClick={scrollToFeatures}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98]"
            >
              See how it works
            </button>
          </motion.div>

          <motion.p
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.6, delay: 0.35}}
            className="mt-8 text-sm font-medium text-white/55"
          >
            Built for students & creators · Free to start
          </motion.p>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 z-[2] -translate-x-1/2 text-white/70"
          animate={{y: [0, 8, 0]}}
          transition={{duration: 1.8, repeat: Infinity, ease: 'easeInOut'}}
          aria-hidden
        >
          <ArrowDown className="h-6 w-6" strokeWidth={1.5} />
        </motion.div>
      </section>

      {/* ── Story: Notes ── */}
      <section
        id="features"
        ref={featuresRef}
        className="border-t border-black/[0.04] bg-[#FAFAF8] px-5 py-20 sm:px-8 md:py-28"
        aria-labelledby="chapter-notes"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          <div className="order-2 md:order-1">
            <FadeUp delay={0}>
              <p id="chapter-notes" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-500">
                01 — Capture
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[48px]">
                Your thoughts, beautifully kept.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-[1.7] text-[#555]">
                Write freely. Organize later. Notes that feel as natural as pen on paper, with the power of a digital
                workspace.
              </p>
            </FadeUp>
          </div>
          <FadeUp delay={0.1} className="order-1 md:order-2">
            <NotesMockup />
          </FadeUp>
        </div>
      </section>

      {/* ── Story: Tasks ── */}
      <section className="border-t border-black/[0.04] bg-[#F5F7FA] px-5 py-20 sm:px-8 md:py-28" aria-labelledby="chapter-tasks">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          <FadeUp delay={0.1} className="md:order-1">
            <KanbanMockup />
          </FadeUp>
          <div className="md:order-2">
            <FadeUp delay={0}>
              <p id="chapter-tasks" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600">
                02 — Focus
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[48px]">
                Do more. Stress less.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-[1.7] text-[#555]">
                A task board that actually fits how you think. Move things from to-do to done with clarity and momentum.
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Story: Calendar ── */}
      <section className="border-t border-black/[0.04] bg-[#F7F5FA] px-5 py-20 sm:px-8 md:py-28" aria-labelledby="chapter-calendar">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          <div className="order-2 md:order-1">
            <FadeUp delay={0}>
              <p id="chapter-calendar" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-600">
                03 — Plan
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-[48px]">
                Time, finally on your side.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-[1.7] text-[#555]">
                See your week at a glance. Add events, spot gaps, and never miss what matters.
              </p>
            </FadeUp>
          </div>
          <FadeUp delay={0.1} className="order-1 md:order-2">
            <CalendarMockup />
          </FadeUp>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-black/[0.04] bg-white px-5 py-20 sm:px-8 md:py-28" aria-labelledby="how-heading">
        <FadeUp>
          <h2 id="how-heading" className="text-center font-display text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-base leading-relaxed text-[#555]">
            From first click to daily rhythm — a path that stays simple.
          </p>
        </FadeUp>

        {/* Desktop: horizontal timeline + connector line */}
        <div className="mx-auto mt-16 hidden max-w-5xl md:block">
          <div className="relative grid grid-cols-4 gap-3 lg:gap-6">
            <div
              className="pointer-events-none absolute left-[12%] right-[12%] top-6 z-0 h-px bg-gradient-to-r from-transparent via-black/12 to-transparent"
              aria-hidden
            />
            {timelineSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.n}
                  className="relative z-10 flex flex-col items-center px-1 text-center"
                  initial={{opacity: 0, y: 28}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-40px'}}
                  transition={{duration: 0.6, ease: easeOut, delay: i * 0.1}}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.06] bg-white text-neutral-800 shadow-sm ring-4 ring-white">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <span className="mt-4 font-display text-xs font-bold text-black/30">0{step.n}</span>
                  <h3 className="mt-1 font-display text-base font-bold text-neutral-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555]">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="mx-auto mt-12 max-w-md md:mt-16 md:hidden">
          <div className="relative pl-8">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-black/[0.1]" aria-hidden />
            {timelineSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.n}
                  className="relative pb-10 last:pb-0"
                  initial={{opacity: 0, y: 24}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-24px'}}
                  transition={{duration: 0.6, ease: easeOut, delay: i * 0.1}}
                >
                  <div className="absolute left-0 top-0 flex h-8 w-8 -translate-x-[2px] items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-800 shadow-sm">
                    <Icon size={16} strokeWidth={1.75} />
                  </div>
                  <div className="pl-10">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/35">Step {step.n}</span>
                    <h3 className="mt-1 font-display text-lg font-bold text-neutral-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#555]">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        className="border-t border-black/[0.04] px-5 py-24 sm:px-8 md:py-32"
        style={{
          background: 'linear-gradient(135deg, #F57799, #dbba95, #FAAC68)',
        }}
        aria-labelledby="cta-heading"
      >
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <h2 id="cta-heading" className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl">
              Ready to get noted?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/90">
              Join thousands of students and creators who stay organized with Noted.
            </p>
            <motion.div whileHover={{scale: 1.03}} whileTap={{scale: 0.98}} className="mt-10 inline-block">
              <Link
                to="/signup"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-10 text-base font-semibold text-neutral-900 shadow-lg"
              >
                Start for free →
              </Link>
            </motion.div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0D0D0D] px-5 py-14 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="text-center md:text-left">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                <div className="h-3 w-3 rotate-45 rounded-sm bg-neutral-900" />
              </div>
              <span className="font-display text-lg font-bold">Noted</span>
            </Link>
            <p className="mt-2 text-sm text-white/50">Your calm space.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-white/70 md:gap-8">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <Link to="/login" className="transition hover:text-white">
              Sign in
            </Link>
            <Link to="/signup" className="transition hover:text-white">
              Get started
            </Link>
          </nav>
          <p className="text-center text-xs text-white/40 md:text-right">© 2025 Noted. Made with care.</p>
        </div>
      </footer>
    </div>
  );
}
