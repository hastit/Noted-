import {supabase} from '../lib/supabase';

const DAILY_LIMIT = 15;
const KEY = 'noted-ai-scheduler-quota-v1';

type QuotaState = {
  day: string;
  count: number;
};

function currentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): QuotaState {
  const today = currentDayKey();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {day: today, count: 0};
    const parsed = JSON.parse(raw) as QuotaState;
    if (!parsed?.day || typeof parsed.count !== 'number') return {day: today, count: 0};
    if (parsed.day !== today) return {day: today, count: 0};
    return parsed;
  } catch {
    return {day: today, count: 0};
  }
}

function saveState(state: QuotaState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getRemainingAiRequests() {
  const state = loadState();
  return Math.max(0, DAILY_LIMIT - state.count);
}

export function consumeAiRequest() {
  const state = loadState();
  if (state.count >= DAILY_LIMIT) return false;
  saveState({day: state.day, count: state.count + 1});
  return true;
}

export function setLocalRemainingAiRequests(remaining: number) {
  const today = currentDayKey();
  const clamped = Math.max(0, Math.min(DAILY_LIMIT, remaining));
  saveState({day: today, count: DAILY_LIMIT - clamped});
}

export async function fetchServerRemainingAiRequests() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const {count, error} = await supabase
    .from('ai_request_logs')
    .select('id', {count: 'exact', head: true})
    .eq('request_type', 'ai_schedule')
    .gte('created_at', since);
  if (error) throw new Error('Unable to fetch AI usage right now.');
  return Math.max(0, DAILY_LIMIT - (count ?? 0));
}

export function getAiDailyLimit() {
  return DAILY_LIMIT;
}
