import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export const MODES = {
  focus: { label: 'Focus', duration: 25 * 60, color: '#1d4ed8', bg: '#dbeafe',
    stemColor: '#22863a', stemDark: '#145226', leafLight: '#4ade80', leafMid: '#22c55e', leafDark: '#15803d',
    petalColor: '#93c5fd', petalDark: '#3b82f6', petalCenter: '#fde68a', petalCenterDark: '#f59e0b' },
  short: { label: 'Short Break', duration: 5 * 60, color: '#059669', bg: '#d1fae5',
    stemColor: '#22863a', stemDark: '#145226', leafLight: '#86efac', leafMid: '#4ade80', leafDark: '#16a34a',
    petalColor: '#6ee7b7', petalDark: '#10b981', petalCenter: '#fde68a', petalCenterDark: '#f59e0b' },
  long: { label: 'Long Break', duration: 15 * 60, color: '#7c3aed', bg: '#ede9fe',
    stemColor: '#22863a', stemDark: '#145226', leafLight: '#4ade80', leafMid: '#22c55e', leafDark: '#15803d',
    petalColor: '#d8b4fe', petalDark: '#a855f7', petalCenter: '#fde68a', petalCenterDark: '#f59e0b' },
} as const;

export type Mode = keyof typeof MODES;

type PomodoroContextValue = {
  mode: Mode;
  timeLeft: number;
  isRunning: boolean;
  sessions: number;
  completedMode: Mode | null;
  nextMode: Mode;
  progress: number;
  currentMode: typeof MODES[Mode];
  setIsRunning: (v: boolean) => void;
  switchMode: (m: Mode) => void;
  handleReset: () => void;
  handleSkip: () => void;
  handleContinue: () => void;
};

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [completedMode, setCompletedMode] = useState<Mode | null>(null);
  const [nextMode, setNextMode] = useState<Mode>('short');
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
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  useEffect(() => {
    if (timeLeft === 0 && !isRunning && completedMode === null) {
      const newSessions = sessions + (mode === 'focus' ? 1 : 0);
      const next: Mode = mode === 'focus'
        ? (newSessions % 4 === 0 ? 'long' : 'short')
        : 'focus';
      setNextMode(next);
      setCompletedMode(mode);
      if (mode === 'focus') setSessions(newSessions);
    }
  }, [timeLeft, isRunning]);

  const handleContinue = useCallback(() => {
    setCompletedMode(null);
    setMode(nextMode);
    setTimeLeft(MODES[nextMode].duration);
  }, [nextMode]);

  const switchMode = useCallback((newMode: Mode) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setCompletedMode(null);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  }, []);

  const handleReset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setCompletedMode(null);
    setTimeLeft(MODES[mode].duration);
  }, [mode]);

  const handleSkip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    const newSessions = sessions + (mode === 'focus' ? 1 : 0);
    const next: Mode = mode === 'focus'
      ? (newSessions % 4 === 0 ? 'long' : 'short')
      : 'focus';
    if (mode === 'focus') setSessions(newSessions);
    setNextMode(next);
    setCompletedMode(mode);
  }, [mode, sessions]);

  return (
    <PomodoroContext.Provider value={{
      mode, timeLeft, isRunning, sessions, completedMode, nextMode,
      progress, currentMode,
      setIsRunning, switchMode, handleReset, handleSkip, handleContinue,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used inside PomodoroProvider');
  return ctx;
}
