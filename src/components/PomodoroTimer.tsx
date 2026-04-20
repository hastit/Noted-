import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, ArrowLeft, SkipForward } from 'lucide-react';

const MODES = {
  focus: {
    label: 'Focus', duration: 25 * 60,
    color: '#1d4ed8', bg: '#dbeafe',
    stemColor: '#16a34a', leafColor: '#22c55e', leafDark: '#15803d',
    petalColor: '#60a5fa', petalCenter: '#fbbf24',
  },
  short: {
    label: 'Short Break', duration: 5 * 60,
    color: '#059669', bg: '#d1fae5',
    stemColor: '#16a34a', leafColor: '#4ade80', leafDark: '#15803d',
    petalColor: '#34d399', petalCenter: '#fbbf24',
  },
  long: {
    label: 'Long Break', duration: 15 * 60,
    color: '#7c3aed', bg: '#ede9fe',
    stemColor: '#16a34a', leafColor: '#22c55e', leafDark: '#15803d',
    petalColor: '#c084fc', petalCenter: '#fbbf24',
  },
} as const;

type Mode = keyof typeof MODES;

// ─── Plant SVG ────────────────────────────────────────────────────────────────

function PlantScene({ progress, mode }: { progress: number; mode: Mode }) {
  const m = MODES[mode];
  const groundY = 202;
  const maxH = 155;
  const h = progress * maxH;
  const tipY = groundY - h;
  const midY = groundY - h / 2;

  // Gentle S-curve stem
  const stemPath = h > 2
    ? `M 100 ${groundY} C 94 ${groundY - h * 0.35} 107 ${groundY - h * 0.65} 100 ${tipY}`
    : `M 100 ${groundY} L 100 ${groundY - 2}`;

  // Leaf fade-in thresholds
  const lf = (lo: number, hi: number) => Math.min(1, Math.max(0, (progress - lo) / (hi - lo)));

  const leaf1Op = lf(0.12, 0.22);
  const leaf2Op = lf(0.28, 0.40);
  const leaf3Op = lf(0.48, 0.60);
  const leaf4Op = lf(0.65, 0.76);
  const flowerOp = lf(0.85, 0.97);

  // Leaf positions along stem
  const lp = (t: number) => {
    // parametric point on cubic bezier: B(t)
    const x0 = 100, y0 = groundY;
    const x1 = 94, y1 = groundY - h * 0.35;
    const x2 = 107, y2 = groundY - h * 0.65;
    const x3 = 100, y3 = tipY;
    const bx = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3 * x3;
    const by = (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * y3;
    return { x: bx, y: by };
  };

  const l1 = lp(0.32);
  const l2 = lp(0.52);
  const l3 = lp(0.70);
  const l4 = lp(0.82);

  // Flower petals (5 petals)
  const petalAngles = [0, 72, 144, 216, 288];
  const petalR = 9;
  const petalDist = 11;

  return (
    <svg viewBox="0 0 200 270" className="w-full h-full" style={{ overflow: 'visible' }}>
      {/* Pot body */}
      <path
        d="M 62 210 L 52 262 Q 52 266 56 266 L 144 266 Q 148 266 148 262 L 138 210 Z"
        fill="#c2663b"
      />
      {/* Pot shading */}
      <path
        d="M 62 210 L 52 262 Q 52 266 56 266 L 80 266 L 90 210 Z"
        fill="rgba(0,0,0,0.07)"
      />
      {/* Pot rim */}
      <rect x="57" y="202" width="86" height="14" rx="7" fill="#d97748" />
      {/* Soil */}
      <ellipse cx="100" cy="210" rx="36" ry="9" fill="#5c3d2e" />
      <ellipse cx="100" cy="209" rx="30" ry="5" fill="#6b4734" />

      {/* Stem */}
      {h > 1 && (
        <path
          d={stemPath}
          fill="none"
          stroke={m.stemColor}
          strokeWidth="5"
          strokeLinecap="round"
          style={{ transition: 'd 0.6s ease' }}
        />
      )}

      {/* Leaf 1 — left */}
      {h > 5 && (
        <g opacity={leaf1Op} style={{ transition: 'opacity 0.5s ease' }}>
          <ellipse
            cx={l1.x - 14} cy={l1.y + 2}
            rx="18" ry="8"
            fill={m.leafColor}
            transform={`rotate(-35, ${l1.x - 14}, ${l1.y + 2})`}
          />
          <ellipse
            cx={l1.x - 14} cy={l1.y + 2}
            rx="14" ry="5"
            fill={m.leafDark}
            transform={`rotate(-35, ${l1.x - 14}, ${l1.y + 2})`}
            opacity="0.35"
          />
          {/* Leaf vein */}
          <line
            x1={l1.x} y1={l1.y}
            x2={l1.x - 26} y2={l1.y + 6}
            stroke={m.leafDark} strokeWidth="1" strokeLinecap="round" opacity="0.5"
          />
        </g>
      )}

      {/* Leaf 2 — right */}
      {h > 5 && (
        <g opacity={leaf2Op} style={{ transition: 'opacity 0.5s ease' }}>
          <ellipse
            cx={l2.x + 15} cy={l2.y + 1}
            rx="17" ry="7"
            fill={m.leafColor}
            transform={`rotate(38, ${l2.x + 15}, ${l2.y + 1})`}
          />
          <ellipse
            cx={l2.x + 15} cy={l2.y + 1}
            rx="13" ry="4.5"
            fill={m.leafDark}
            transform={`rotate(38, ${l2.x + 15}, ${l2.y + 1})`}
            opacity="0.35"
          />
          <line
            x1={l2.x} y1={l2.y}
            x2={l2.x + 28} y2={l2.y + 5}
            stroke={m.leafDark} strokeWidth="1" strokeLinecap="round" opacity="0.5"
          />
        </g>
      )}

      {/* Leaf 3 — left, smaller */}
      {h > 5 && (
        <g opacity={leaf3Op} style={{ transition: 'opacity 0.5s ease' }}>
          <ellipse
            cx={l3.x - 12} cy={l3.y + 1}
            rx="14" ry="6"
            fill={m.leafColor}
            transform={`rotate(-30, ${l3.x - 12}, ${l3.y + 1})`}
          />
          <line
            x1={l3.x} y1={l3.y}
            x2={l3.x - 22} y2={l3.y + 4}
            stroke={m.leafDark} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"
          />
        </g>
      )}

      {/* Leaf 4 — right, smaller */}
      {h > 5 && (
        <g opacity={leaf4Op} style={{ transition: 'opacity 0.5s ease' }}>
          <ellipse
            cx={l4.x + 11} cy={l4.y}
            rx="13" ry="5.5"
            fill={m.leafColor}
            transform={`rotate(32, ${l4.x + 11}, ${l4.y})`}
          />
          <line
            x1={l4.x} y1={l4.y}
            x2={l4.x + 20} y2={l4.y + 3}
            stroke={m.leafDark} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"
          />
        </g>
      )}

      {/* Flower */}
      {h > 5 && (
        <g opacity={flowerOp} style={{ transition: 'opacity 0.6s ease' }}>
          {petalAngles.map((deg, i) => {
            const rad = (deg - 90) * (Math.PI / 180);
            const px = tipY < groundY ? 100 + Math.cos(rad) * petalDist : 100;
            const py = (tipY < groundY ? tipY : groundY) + Math.sin(rad) * petalDist;
            return (
              <ellipse
                key={i}
                cx={px} cy={py}
                rx={petalR} ry={5}
                fill={m.petalColor}
                transform={`rotate(${deg}, ${px}, ${py})`}
                opacity="0.9"
              />
            );
          })}
          {/* Flower center */}
          <circle
            cx="100" cy={tipY < groundY ? tipY : groundY}
            r="7"
            fill={m.petalCenter}
          />
          <circle
            cx="100" cy={tipY < groundY ? tipY : groundY}
            r="4"
            fill="#f59e0b"
          />
        </g>
      )}

      {/* Sparkles when complete */}
      {progress > 0.97 && (
        <>
          {[
            { x: 68, y: tipY - 18, s: 0.8, delay: '0s' },
            { x: 132, y: tipY - 22, s: 0.6, delay: '0.4s' },
            { x: 145, y: tipY + 5, s: 0.7, delay: '0.8s' },
            { x: 58, y: tipY + 8, s: 0.55, delay: '1.2s' },
          ].map((sp, i) => (
            <text
              key={i}
              x={sp.x} y={sp.y}
              fontSize={14 * sp.s}
              textAnchor="middle"
              fill="#fbbf24"
              style={{
                animation: `sparkle-float 1.5s ease-in-out infinite`,
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PomodoroTimer({
  onClose,
  embedded = false,
}: {
  onClose?: () => void;
  /** Intégré au dashboard : flux normal, pas de plein écran */
  embedded?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentMode = MODES[mode];
  const progress = 1 - timeLeft / currentMode.duration;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const handleSessionEnd = () => {
    setSessions(prev => {
      const newSessions = prev + (mode === 'focus' ? 1 : 0);
      if (mode === 'focus') {
        const nextMode = newSessions % 4 === 0 ? 'long' : 'short';
        setMode(nextMode);
        setTimeLeft(MODES[nextMode].duration);
      } else {
        setMode('focus');
        setTimeLeft(MODES.focus.duration);
      }
      return newSessions;
    });
  };

  const switchMode = (newMode: Mode) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(currentMode.duration);
  };

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    handleSessionEnd();
  };

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
            ? 'w-full shrink-0 bg-white rounded-2xl shadow-md border border-black/[0.06] overflow-hidden'
            : 'w-full max-w-[420px] shrink-0 bg-white rounded-2xl max-md:rounded-2xl md:rounded-3xl shadow-xl border border-black/[0.06] max-md:overflow-visible md:overflow-hidden'
        }
      >
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
                onClick={() => setIsRunning(r => !r)}
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
