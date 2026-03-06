import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'motion/react';
import { ArrowRight, BookOpen, CheckSquare, Calendar, Sparkles, Zap, Shield, Globe, Star, MousePointer2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface LandingPageProps {
  onSignIn: () => void;
}

const ScrollSquiggle = () => {
  const { scrollYProgress } = useScroll();
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
      <svg className="w-full h-full" viewBox="0 0 100 1000" preserveAspectRatio="none">
        <motion.path
          d="M 50 0 Q 60 50 40 100 T 50 200 Q 70 250 30 300 T 50 400 Q 80 450 20 500 T 50 600 Q 90 650 10 700 T 50 800 Q 100 850 0 900 T 50 1000"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          style={{ pathLength }}
          className="text-ink"
        />
        <motion.path
          d="M 20 0 Q 10 50 30 100 T 20 200 Q 0 250 40 300 T 20 400 Q -10 450 50 500 T 20 600 Q -20 650 60 700 T 20 800 Q -30 850 70 900 T 20 1000"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.2"
          style={{ pathLength }}
          className="text-ink"
        />
      </svg>
      
      {/* Floating Pen Icon */}
      <motion.div
        style={{ top: y, rotate }}
        className="absolute left-1/2 -translate-x-1/2 w-12 h-12 flex items-center justify-center text-ink/20"
      >
        <MousePointer2 size={24} className="rotate-180" />
      </motion.div>
    </div>
  );
};

interface ShowcaseImageProps {
  src: string;
  title: string;
  description: string;
  index: number;
}

const ShowcaseImage: React.FC<ShowcaseImageProps> = ({ src, title, description, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-20% 0px -20% 0px" });

  return (
    <div ref={ref} className="min-h-[60vh] flex flex-col items-center justify-center py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 50 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="relative group"
      >
        <div className="absolute -inset-4 bg-gradient-to-tr from-ink/5 to-transparent rounded-[3rem] blur-2xl group-hover:blur-3xl transition-all opacity-50" />
        <div className="relative aspect-video w-full max-w-4xl bg-surface rounded-[2.5rem] overflow-hidden border border-black/5 shadow-2xl">
          <img 
            src={src} 
            alt={title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h3 className="text-white text-4xl font-bold mb-4 tracking-tight">{title}</h3>
              <p className="text-white/70 text-lg max-w-md font-medium">{description}</p>
            </motion.div>
          </div>
        </div>
        
        {/* Floating elements */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-8 -right-8 w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-black/5 z-10"
        >
          {index === 0 ? <Sparkles className="text-ink" size={32} /> : index === 1 ? <Zap className="text-ink" size={32} /> : <Shield className="text-ink" size={32} />}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default function LandingPage({ onSignIn }: LandingPageProps) {
  const { t } = useLanguage();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const showcaseData = [
    {
      src: "https://picsum.photos/seed/dashboard/1200/800",
      title: "Unified Dashboard",
      description: "Everything that matters, in one high-contrast view. No clutter, just clarity."
    },
    {
      src: "https://picsum.photos/seed/tasks/1200/800",
      title: "Flow-State Tasks",
      description: "Manage your to-dos with a system designed to keep you in the zone."
    },
    {
      src: "https://picsum.photos/seed/notes/1200/800",
      title: "Deep Thinking Notes",
      description: "A distraction-free writing environment for your most ambitious ideas."
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-canvas text-ink font-sans selection:bg-ink selection:text-white overflow-x-hidden relative">
      <ScrollSquiggle />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-10 py-8 flex justify-between items-center bg-canvas/80 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <div className="w-4 h-4 rounded-sm bg-white rotate-45" />
          </div>
          <span className="font-bold text-xl tracking-tight">Noty</span>
        </div>
        <div className="flex items-center gap-8">
          <button 
            onClick={onSignIn}
            className="text-sm font-semibold hover:text-muted transition-colors"
          >
            {t('sign_in')}
          </button>
          <button 
            onClick={onSignIn}
            className="pill-button"
          >
            {t('get_started')}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-64 pb-32 px-10 max-w-7xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-block px-4 py-1.5 bg-surface rounded-pill text-[10px] font-bold uppercase tracking-[0.2em] mb-8 border border-black/5"
          >
            {t('new_era')}
          </motion.span>
          <h1 className="text-6xl md:text-[10rem] font-bold tracking-tighter leading-[0.85] mb-12">
            Your mind, <br />
            <motion.span 
              initial={{ color: "#141414" }}
              animate={{ color: "#8E9299" }}
              transition={{ delay: 1, duration: 1 }}
            >organized.</motion.span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-muted max-w-2xl mx-auto mb-16 leading-relaxed">
            The minimal workspace for your thoughts, tasks, and time. Designed for focus, built for flow.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSignIn}
              className="pill-button px-12 py-5 text-lg shadow-2xl shadow-black/20"
            >
              {t('get_started_now')}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSignIn}
              className="pill-button-secondary px-12 py-5 text-lg"
            >
              {t('view_demo')}
            </motion.button>
          </div>
        </motion.div>

        {/* Hero Image / Mockup */}
        <motion.div
          style={{ 
            scale: useTransform(scrollYProgress, [0, 0.2], [1, 1.1]),
            rotateX: useTransform(scrollYProgress, [0, 0.2], [0, 10]),
            opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0.8])
          }}
          className="mt-48 relative perspective-1000"
        >
          <div className="aspect-[16/9] bg-surface rounded-[4rem] p-6 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden border border-black/5">
            <div className="w-full h-full bg-canvas rounded-[3rem] overflow-hidden relative">
               <img 
                src="https://picsum.photos/seed/app/1920/1080" 
                alt="App Interface" 
                className="w-full h-full object-cover opacity-90"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface/40 to-transparent" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Showcase Section */}
      <section className="py-20 px-10 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-32">
          <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-8">Crafted for Clarity.</h2>
          <div className="w-24 h-1 bg-ink mx-auto rounded-full" />
        </div>
        
        {showcaseData.map((item, i) => (
          <ShowcaseImage 
            key={i} 
            src={item.src}
            title={item.title}
            description={item.description}
            index={i} 
          />
        ))}
      </section>

      {/* Bento Features Section */}
      <section className="py-40 px-10 max-w-7xl mx-auto relative z-10">
        <div className="mb-20">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
          >
            Built for the modern mind.
          </motion.h2>
          <p className="text-xl text-muted">Everything you need, nothing you don't.</p>
        </div>

        <div className="grid grid-cols-12 gap-6 auto-rows-[300px]">
          <motion.div 
            whileHover={{ y: -10 }}
            className="col-span-12 md:col-span-8 bento-card bg-surface border border-black/5"
          >
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t('notebooks_feature')}</h3>
                <p className="text-lg text-muted max-w-md">{t('notebooks_desc')}</p>
              </div>
              <div className="flex gap-2">
                <motion.div animate={{ width: [40, 100, 40] }} transition={{ duration: 3, repeat: Infinity }} className="h-2 bg-black/5 rounded-full" />
                <div className="w-12 h-2 bg-black/5 rounded-full" />
                <motion.div animate={{ width: [100, 40, 100] }} transition={{ duration: 3, repeat: Infinity }} className="h-2 bg-black/5 rounded-full" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -10 }}
            className="col-span-12 md:col-span-4 bento-card bg-ink text-white"
          >
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                  <CheckSquare size={24} />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t('tasks_feature')}</h3>
                <p className="text-lg text-white/60">{t('tasks_desc')}</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-6 h-6 rounded-full border-2 border-white/20" />
                <div className="w-full h-[1px] bg-white/10" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -10 }}
            className="col-span-12 md:col-span-4 bento-card bg-surface border border-black/5"
          >
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                  <Calendar size={24} />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t('calendar_feature')}</h3>
                <p className="text-lg text-muted">{t('calendar_desc')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -10 }}
            className="col-span-12 md:col-span-8 bento-card bg-surface border border-black/5"
          >
             <div className="flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t('ai_powered')}</h3>
                <p className="text-lg text-muted max-w-md">Intelligent organization that adapts to your workflow.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-white rounded-pill text-[10px] font-bold uppercase tracking-widest shadow-sm">Smart Tagging</div>
                <div className="px-4 py-2 bg-white rounded-pill text-[10px] font-bold uppercase tracking-widest shadow-sm">Auto Summarize</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-10 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-4xl mx-auto bg-ink text-white rounded-[4rem] p-20 shadow-2xl"
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter">Ready to find your flow?</h2>
          <p className="text-xl text-white/60 mb-12 max-w-xl mx-auto">Join thousands of thinkers who have simplified their digital life with Noty.</p>
          <button 
            onClick={onSignIn}
            className="px-12 py-6 bg-white text-ink rounded-pill font-bold text-xl hover:scale-105 transition-transform"
          >
            Get Started for Free
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-10 border-t border-black/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-ink flex items-center justify-center">
              <div className="w-3 h-3 rounded-sm bg-white rotate-45" />
            </div>
            <span className="font-bold text-lg tracking-tight">Noty</span>
          </div>
          <div className="flex gap-10 text-sm font-medium text-muted">
            <a href="#" className="hover:text-ink transition-colors">Twitter</a>
            <a href="#" className="hover:text-ink transition-colors">Instagram</a>
            <a href="#" className="hover:text-ink transition-colors">Privacy</a>
            <a href="#" className="hover:text-ink transition-colors">Terms</a>
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest">© 2026 Noty Inc.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureItem({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="flex items-start gap-8">
        <span className="text-xs font-bold text-accent tracking-widest mt-2">{number}</span>
        <div>
          <h4 className="text-3xl font-serif italic mb-4 group-hover:text-accent transition-colors">{title}</h4>
          <p className="text-lg font-serif italic text-ink/40 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
