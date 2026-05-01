import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, ArrowLeft, SkipForward } from 'lucide-react';
import { MODES, type Mode, usePomodoro } from '../context/PomodoroContext';

// ─── Plant SVG ────────────────────────────────────────────────────────────────

function PlantScene({ progress, mode }: { progress: number; mode: Mode }) {
  const m = MODES[mode];
  const groundY = 198;
  const maxH = 148;
  const h = progress * maxH;
  const tipY = groundY - h;

  // Gentle S-curve stem
  const stemPath = h > 2
    ? `M 100 ${groundY} C 93 ${groundY - h * 0.33} 109 ${groundY - h * 0.67} 100 ${tipY}`
    : `M 100 ${groundY} L 100 ${groundY - 2}`;

  const lf = (lo: number, hi: number) => Math.min(1, Math.max(0, (progress - lo) / (hi - lo)));
  const leaf1Op = lf(0.10, 0.22);
  const leaf2Op = lf(0.26, 0.40);
  const leaf3Op = lf(0.46, 0.60);
  const leaf4Op = lf(0.63, 0.76);
  const flowerOp = lf(0.83, 0.97);

  // Parametric point on stem bezier
  const lp = (t: number) => {
    const x0 = 100, y0 = groundY;
    const x1 = 93,  y1 = groundY - h * 0.33;
    const x2 = 109, y2 = groundY - h * 0.67;
    const x3 = 100, y3 = tipY;
    const bx = (1-t)**3*x0 + 3*(1-t)**2*t*x1 + 3*(1-t)*t**2*x2 + t**3*x3;
    const by = (1-t)**3*y0 + 3*(1-t)**2*t*y1 + 3*(1-t)*t**2*y2 + t**3*y3;
    return { x: bx, y: by };
  };

  const l1 = lp(0.28);
  const l2 = lp(0.48);
  const l3 = lp(0.66);
  const l4 = lp(0.80);

  const uid = `plant-${mode}`;

  return (
    <svg viewBox="0 0 200 275" className="w-full h-full" style={{ overflow: 'visible' }}>
      <defs>
        {/* Pot gradient */}
        <linearGradient id={`${uid}-pot`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b85c34" />
          <stop offset="40%" stopColor="#d97748" />
          <stop offset="100%" stopColor="#a0481f" />
        </linearGradient>
        <linearGradient id={`${uid}-rim`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8895a" />
          <stop offset="100%" stopColor="#c2663b" />
        </linearGradient>
        {/* Soil gradient */}
        <radialGradient id={`${uid}-soil`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#7a4f3a" />
          <stop offset="100%" stopColor="#3d2314" />
        </radialGradient>
        {/* Stem gradient */}
        <linearGradient id={`${uid}-stem`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={m.stemDark} />
          <stop offset="50%" stopColor={m.stemColor} />
          <stop offset="100%" stopColor={m.stemDark} />
        </linearGradient>
        {/* Leaf gradient */}
        <linearGradient id={`${uid}-leaf`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={m.leafLight} />
          <stop offset="100%" stopColor={m.leafDark} />
        </linearGradient>
        {/* Petal gradient */}
        <radialGradient id={`${uid}-petal`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={m.petalColor} />
          <stop offset="100%" stopColor={m.petalDark} />
        </radialGradient>
        {/* Center gradient */}
        <radialGradient id={`${uid}-center`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={m.petalCenter} />
          <stop offset="100%" stopColor={m.petalCenterDark} />
        </radialGradient>
        {/* Pot highlight */}
        <linearGradient id={`${uid}-shine`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Drop shadow filter */}
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.15)" />
        </filter>
        {/* Glow filter for complete state */}
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Pot body ── */}
      <g filter={`url(#${uid}-shadow)`}>
        <path
          d="M 64 207 L 54 260 Q 54 268 62 268 L 138 268 Q 146 268 146 260 L 136 207 Z"
          fill={`url(#${uid}-pot)`}
        />
        {/* Highlight stripe */}
        <path
          d="M 64 207 L 54 260 Q 54 268 62 268 L 138 268 Q 146 268 146 260 L 136 207 Z"
          fill={`url(#${uid}-shine)`}
        />
        {/* Subtle crease line */}
        <path
          d="M 80 207 L 70 268"
          stroke="rgba(0,0,0,0.06)" strokeWidth="1.5" fill="none"
        />
        {/* Rim */}
        <rect x="57" y="199" width="86" height="14" rx="7" fill={`url(#${uid}-rim)`} />
        {/* Rim top highlight */}
        <rect x="60" y="200" width="80" height="5" rx="4" fill="rgba(255,255,255,0.22)" />
      </g>

      {/* ── Soil ── */}
      <ellipse cx="100" cy="207" rx="37" ry="10" fill={`url(#${uid}-soil)`} />
      {/* Soil texture dots */}
      <circle cx="88" cy="205" r="1.5" fill="rgba(255,255,255,0.06)" />
      <circle cx="105" cy="208" r="1" fill="rgba(255,255,255,0.06)" />
      <circle cx="115" cy="205" r="1.5" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="100" cy="206" rx="28" ry="5.5" fill="rgba(255,255,255,0.04)" />

      {/* ── Stem ── */}
      {h > 1 && (
        <>
          {/* Stem shadow */}
          <path
            d={stemPath}
            fill="none"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Stem body */}
          <path
            d={stemPath}
            fill="none"
            stroke={`url(#${uid}-stem)`}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          {/* Stem highlight */}
          <path
            d={stemPath}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* ── Leaf helper: renders a natural teardrop leaf ── */}
      {/* Leaf 1 — lower left */}
      {h > 5 && (
        <g opacity={leaf1Op} style={{ transition: 'opacity 0.6s ease' }}>
          <g transform={`translate(${l1.x}, ${l1.y}) rotate(-42)`}>
            <path
              d="M 0 0 C -8 -6 -24 -8 -30 -2 C -24 4 -8 4 0 0 Z"
              fill={`url(#${uid}-leaf)`}
            />
            {/* Vein */}
            <path d="M 0 0 L -28 -1" stroke={m.leafDark} strokeWidth="0.9" strokeLinecap="round" opacity="0.5" fill="none"/>
            <path d="M -14 -1 L -18 -6" stroke={m.leafDark} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" fill="none"/>
            <path d="M -14 -1 L -18 3" stroke={m.leafDark} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" fill="none"/>
          </g>
        </g>
      )}

      {/* Leaf 2 — lower right */}
      {h > 5 && (
        <g opacity={leaf2Op} style={{ transition: 'opacity 0.6s ease' }}>
          <g transform={`translate(${l2.x}, ${l2.y}) rotate(40)`}>
            <path
              d="M 0 0 C 8 -6 26 -7 32 -1 C 26 5 8 4 0 0 Z"
              fill={`url(#${uid}-leaf)`}
            />
            <path d="M 0 0 L 30 -0.5" stroke={m.leafDark} strokeWidth="0.9" strokeLinecap="round" opacity="0.5" fill="none"/>
            <path d="M 16 -0.5 L 20 -5" stroke={m.leafDark} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" fill="none"/>
            <path d="M 16 -0.5 L 20 4" stroke={m.leafDark} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" fill="none"/>
          </g>
        </g>
      )}

      {/* Leaf 3 — mid left */}
      {h > 5 && (
        <g opacity={leaf3Op} style={{ transition: 'opacity 0.6s ease' }}>
          <g transform={`translate(${l3.x}, ${l3.y}) rotate(-36)`}>
            <path
              d="M 0 0 C -7 -5 -21 -6 -26 -1 C -21 4 -7 3 0 0 Z"
              fill={`url(#${uid}-leaf)`}
            />
            <path d="M 0 0 L -24 -0.5" stroke={m.leafDark} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" fill="none"/>
            <path d="M -12 -0.5 L -15 -4" stroke={m.leafDark} strokeWidth="0.55" strokeLinecap="round" opacity="0.3" fill="none"/>
          </g>
        </g>
      )}

      {/* Leaf 4 — upper right */}
      {h > 5 && (
        <g opacity={leaf4Op} style={{ transition: 'opacity 0.6s ease' }}>
          <g transform={`translate(${l4.x}, ${l4.y}) rotate(34)`}>
            <path
              d="M 0 0 C 6 -4 20 -5 24 -1 C 20 3 6 3 0 0 Z"
              fill={`url(#${uid}-leaf)`}
            />
            <path d="M 0 0 L 22 -0.5" stroke={m.leafDark} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" fill="none"/>
            <path d="M 11 -0.5 L 14 -4" stroke={m.leafDark} strokeWidth="0.55" strokeLinecap="round" opacity="0.3" fill="none"/>
          </g>
        </g>
      )}

      {/* ── Flower ── */}
      {h > 5 && (
        <g
          opacity={flowerOp}
          style={{ transition: 'opacity 0.7s ease' }}
          filter={progress > 0.97 ? `url(#${uid}-glow)` : undefined}
        >
          {/* 6 petals */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg - 90) * (Math.PI / 180);
            const dist = 13;
            const px = 100 + Math.cos(rad) * dist;
            const py = tipY + Math.sin(rad) * dist;
            return (
              <g key={i} transform={`translate(${px}, ${py}) rotate(${deg})`}>
                <ellipse
                  cx="0" cy="0"
                  rx="10" ry="5.5"
                  fill={`url(#${uid}-petal)`}
                  opacity="0.95"
                />
                {/* Petal highlight */}
                <ellipse cx="-1" cy="-1" rx="4" ry="2" fill="rgba(255,255,255,0.25)" opacity="0.8" />
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="100" cy={tipY} r="9" fill={`url(#${uid}-center)`} />
          {/* Center dots */}
          {[0,60,120,180,240,300].map((deg,i) => {
            const r2 = (deg - 90) * (Math.PI / 180);
            return <circle key={i} cx={100 + Math.cos(r2)*4.5} cy={tipY + Math.sin(r2)*4.5} r="1.2" fill={m.petalCenterDark} opacity="0.6" />;
          })}
          <circle cx="100" cy={tipY} r="3.5" fill={m.petalCenterDark} opacity="0.7" />
          {/* Center shine */}
          <circle cx="98" cy={tipY - 2} r="2" fill="rgba(255,255,255,0.4)" />
        </g>
      )}

      {/* ── Sparkles when complete ── */}
      {progress > 0.97 && (
        <>
          {[
            { x: 66, y: tipY - 22, s: 1.0, delay: '0s' },
            { x: 134, y: tipY - 26, s: 0.75, delay: '0.35s' },
            { x: 148, y: tipY + 4, s: 0.85, delay: '0.7s' },
            { x: 55, y: tipY + 8, s: 0.65, delay: '1.05s' },
            { x: 108, y: tipY - 34, s: 0.55, delay: '1.4s' },
          ].map((sp, i) => (
            <text
              key={i}
              x={sp.x} y={sp.y}
              fontSize={13 * sp.s}
              textAnchor="middle"
              fill={m.petalCenter}
              style={{
                animation: `sparkle-float 1.6s ease-in-out infinite`,
                animationDelay: sp.delay,
              }}
            >
              ✦
            </text>
          ))}
        </>
      )}
    </svg>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#fbbf24','#f472b6','#60a5fa','#34d399','#a78bfa','#fb923c','#f87171'];

function ConfettiPieces({ color }: { color: string }) {
  const pieces = useRef(
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1.2,
      size: 5 + Math.random() * 7,
      color: Math.random() > 0.35 ? CONFETTI_COLORS[i % CONFETTI_COLORS.length] : color,
      rotate: Math.random() * 360,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))
  ).current;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl md:rounded-3xl">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1, rotate: p.rotate, scale: 1 }}
          animate={{ y: '110%', opacity: [1, 1, 0], rotate: p.rotate + 360 + Math.random() * 180, scale: [1, 0.8] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: Math.random() * 0.8 }}
          className="absolute top-0"
          style={{
            width: p.size,
            height: p.shape === 'rect' ? p.size * 0.5 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : 2,
            left: `${p.x}%`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PomodoroTimer({
  onClose,
  embedded = false,
}: {
  onClose?: () => void;
  embedded?: boolean;
}) {
  const {
    mode, timeLeft, isRunning, sessions, completedMode, nextMode,
    progress, currentMode,
    setIsRunning, switchMode, handleReset, handleSkip, handleContinue,
  } = usePomodoro();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const focusSessionsDone = sessions % 4;

  return (
    <div
      className={
        embedded
          ? 'w-full min-h-0 flex flex-col items-stretch overflow-x-hidden py-0 [scrollbar-width:thin]'
          : 'h-full min-h-0 w-full flex flex-col items-center max-md:justify-start md:justify-center overflow-y-auto overflow-x-hidden py-3 px-3 max-md:pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:py-4 [scrollbar-width:thin]'
      }
    >
      {/* Retour plein écran uniquement */}
      {!embedded && onClose && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[420px] mb-3 max-md:mb-3 md:mb-5 flex items-center shrink-0"
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-black/40 hover:text-black/70 transition-colors text-[13px] md:text-sm font-medium"
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: embedded ? 8 : 20, scale: embedded ? 1 : 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: embedded ? 0.3 : 0.45, ease: [0.23, 1, 0.32, 1] }}
        className={
          embedded
            ? 'w-full shrink-0 bg-white rounded-2xl shadow-md border border-black/[0.06] overflow-hidden relative'
            : 'w-full max-w-[420px] shrink-0 bg-white rounded-2xl max-md:rounded-2xl md:rounded-3xl shadow-xl border border-black/[0.06] max-md:overflow-visible md:overflow-hidden relative'
        }
      >
        {/* ── Completion overlay ── */}
        <AnimatePresence>
          {completedMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl md:rounded-3xl overflow-hidden"
              style={{ backgroundColor: MODES[completedMode].bg }}
            >
              {/* Confetti pieces */}
              <ConfettiPieces color={MODES[completedMode].color} />

              <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col items-center gap-4 px-6 text-center relative z-10"
              >
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                  style={{ backgroundColor: MODES[completedMode].color }}
                >
                  {completedMode === 'focus' ? '🌱' : completedMode === 'short' ? '☕' : '🌿'}
                </div>

                {/* Heading */}
                <div>
                  <h3
                    className="text-xl font-bold tracking-tight"
                    style={{ color: MODES[completedMode].color }}
                  >
                    {completedMode === 'focus' ? 'Focus session done!' : completedMode === 'short' ? 'Break over!' : 'Long break over!'}
                  </h3>
                  <p className="text-sm text-black/45 mt-1 leading-relaxed">
                    {completedMode === 'focus'
                      ? `Great work! Time for a ${nextMode === 'long' ? 'long' : 'short'} break.`
                      : 'Ready to focus again? Let\'s go!'}
                  </p>
                </div>

                {/* Sessions badge */}
                {completedMode === 'focus' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.06]">
                    {[0,1,2,3].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ backgroundColor: i < focusSessionsDone ? MODES[completedMode].color : 'rgba(0,0,0,0.12)' }}
                      />
                    ))}
                    <span className="text-[11px] font-semibold text-black/40 ml-1">{sessions} done</span>
                  </div>
                )}

                {/* Continue button */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleContinue}
                  className="mt-1 px-8 h-12 rounded-2xl text-white text-sm font-bold shadow-lg transition-shadow hover:shadow-xl"
                  style={{
                    backgroundColor: MODES[completedMode].color,
                    boxShadow: `0 8px 24px ${MODES[completedMode].color}40`,
                  }}
                >
                  {completedMode === 'focus' ? `Start ${nextMode === 'long' ? 'Long' : 'Short'} Break →` : 'Start Focusing →'}
                </motion.button>

                {/* Dismiss */}
                <button
                  onClick={() => switchMode(mode)}
                  className="text-xs text-black/30 hover:text-black/50 transition-colors"
                >
                  Stay on this timer
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode tabs */}
        <div
          className={
            embedded
              ? 'flex px-4 sm:px-6 gap-2 pt-4 sm:pt-5'
              : 'flex px-3 max-md:px-3 md:px-5 gap-1.5 max-md:gap-1.5 md:gap-2 pt-3 max-md:pt-3 md:pt-5'
          }
        >
          {(Object.keys(MODES) as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 max-md:py-1.5 rounded-lg max-md:rounded-lg md:rounded-xl text-[11px] max-md:text-[11px] md:text-xs font-semibold transition-all ${
                mode === m ? 'text-white shadow-sm' : 'text-black/30 hover:bg-black/[0.04] hover:text-black/55'
              }`}
              style={mode === m ? { backgroundColor: currentMode.color } : {}}
            >
              {MODES[m].label}
            </button>
          ))}
        </div>

        {/* Mobile : colonne ; desktop / mode intégré : ligne */}
        <div
          className={
            embedded
              ? 'flex flex-col sm:flex-row px-4 sm:px-6 pt-4 pb-6 sm:pb-8 gap-8 sm:gap-10 items-center sm:items-end justify-center sm:justify-between min-w-0'
              : 'flex flex-col md:flex-row px-3 max-md:px-3 md:px-5 pt-2 max-md:pt-2 md:pt-3 pb-4 max-md:pb-4 md:pb-5 gap-3 max-md:gap-3 md:gap-6 md:items-end min-w-0'
          }
        >
          {/* Plante */}
          <div
            className={
              embedded
                ? 'w-[11rem] h-[13.5rem] sm:w-48 sm:h-[14.5rem] shrink-0'
                : 'w-[7.5rem] h-[9.25rem] max-md:mx-auto md:w-44 md:h-56 shrink-0 max-md:max-h-[40vh]'
            }
          >
            <PlantScene progress={progress} mode={mode} />
          </div>

          {/* Timer + contrôles */}
          <div
            className={
              embedded
                ? 'flex-1 min-w-0 w-full max-w-md flex flex-col items-center gap-3 sm:gap-4 pb-0.5'
                : 'flex-1 min-h-0 flex flex-col items-center gap-2.5 max-md:gap-2.5 md:gap-4 pb-1 max-md:pb-1 md:pb-2 w-full'
            }
          >
            {/* Time display */}
            <div
              className="w-full rounded-xl max-md:rounded-xl md:rounded-2xl py-3 max-md:py-3 md:py-4 flex flex-col items-center"
              style={{ backgroundColor: currentMode.bg }}
            >
              <span
                className="text-[2.25rem] max-md:text-[2.25rem] md:text-[46px] font-bold tabular-nums tracking-tight leading-none"
                style={{ color: currentMode.color }}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-[9px] max-md:text-[9px] md:text-[10px] font-bold uppercase tracking-[0.18em] mt-1 max-md:mt-1 md:mt-1.5" style={{ color: `${currentMode.color}99` }}>
                {currentMode.label}
              </span>
            </div>

            {/* Session dots */}
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: i < focusSessionsDone ? currentMode.color : 'rgba(0,0,0,0.1)',
                    transform: i < focusSessionsDone ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-black/25 font-medium -mt-1 md:-mt-2">{sessions} sessions done</span>

            {/* Controls — toujours visibles sous le chrono sur mobile */}
            <div className="flex items-center justify-center gap-3 max-md:gap-3 pt-1 max-md:pt-1 w-full">
              <button
                onClick={handleReset}
                className="w-10 h-10 max-md:w-10 max-md:h-10 md:w-9 md:h-9 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center text-black/35 hover:text-black/60 transition-all active:scale-95 shrink-0"
                title="Reset"
              >
                <RotateCcw size={15} />
              </button>

              <button
                onClick={() => setIsRunning(!isRunning)}
                className="w-[3.25rem] h-[3.25rem] max-md:w-[3.25rem] max-md:h-[3.25rem] md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{
                  backgroundColor: currentMode.color,
                  boxShadow: `0 8px 24px ${currentMode.color}45`,
                }}
              >
                {isRunning ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
              </button>

              <button
                onClick={handleSkip}
                className="w-10 h-10 max-md:w-10 max-md:h-10 md:w-9 md:h-9 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center text-black/35 hover:text-black/60 transition-all active:scale-95 shrink-0"
                title="Skip"
              >
                <SkipForward size={15} />
              </button>
            </div>

            {/* Status */}
            <p className="text-[10px] text-black/25 font-medium text-center leading-relaxed px-1 max-md:px-1 pb-0.5">
              {mode === 'focus'
                ? `${4 - focusSessionsDone} more until long break`
                : mode === 'short' ? 'Short break — you earned it!'
                : 'Long break — time to recharge'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
