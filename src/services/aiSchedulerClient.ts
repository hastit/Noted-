import type {AIPlanResponse} from '../types/scheduler';
import {supabase} from '../lib/supabase';

const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const endpoint =
  import.meta.env.VITE_AI_SCHEDULER_ENDPOINT ??
  import.meta.env.NEXT_PUBLIC_AI_SCHEDULER_ENDPOINT ??
  (_supabaseUrl ? `${_supabaseUrl}/functions/v1/ai-schedule` : '/api/ai-schedule');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
let inFlightRequest: Promise<AIPlanResponse> | null = null;

function friendlyError(message: string) {
  return new Error(message);
}

function parseJsonPlan(raw: unknown): AIPlanResponse {
  if (!raw || typeof raw !== 'object') throw friendlyError('AI returned an invalid response.');
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.subtasks) || typeof obj.deadline !== 'string' || typeof obj.reasoning !== 'string') {
    throw friendlyError('AI returned an incomplete plan. Please try again with more details.');
  }
  return {
    deadline: obj.deadline,
    reasoning: obj.reasoning,
    subtasks: obj.subtasks.map((s, i) => {
      const task = s as Record<string, unknown>;
      const title = typeof task.title === 'string' ? task.title.trim() : `Subtask ${i + 1}`;
      const estimated = typeof task.estimated_minutes === 'number' ? task.estimated_minutes : 30;
      const suggested = typeof task.suggested_day === 'string' ? task.suggested_day : undefined;
      return {title, estimated_minutes: Math.max(15, estimated), suggested_day: suggested};
    }),
  };
}

export async function requestAiSchedule(input: {
  userText: string;
  existingEvents: Array<{title: string; date: string; startTime: number; endTime: number}>;
  datedTasks: Array<{title: string; dueDate: string; status: string}>;
}): Promise<AIPlanResponse> {
  if (inFlightRequest) return inFlightRequest;

  const requestPromise = (async () => {
  try {
    const bodyPayload = {
      userText: input.userText,
      existingEvents: input.existingEvents ?? [],
      datedTasks: input.datedTasks ?? [],
    };
    const {
      data: {session},
    } = await supabase.auth.getSession();
    const userToken = session?.access_token ?? '';
    if (!userToken) {
      throw friendlyError('Please sign in to generate an AI schedule.');
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });
    if (!res.ok) {
      const rawBody = await res.text().catch(() => '');
      console.error('[AI Schedule] HTTP', res.status, 'from', endpoint, '— raw body:', rawBody);
      let serverMessage = '';
      try {
        const errPayload = JSON.parse(rawBody) as {error?: unknown; message?: unknown; code?: unknown};
        serverMessage =
          typeof errPayload.error === 'string' ? errPayload.error
          : typeof errPayload.message === 'string' ? errPayload.message
          : typeof errPayload.code === 'string' ? errPayload.code
          : '';
      } catch {
        serverMessage = '';
      }
      throw friendlyError(serverMessage || `Server returned ${res.status}. Check the browser console for details.`);
    }
    const payload = (await res.json()) as {plan?: unknown};
    return parseJsonPlan(payload.plan);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw friendlyError('Something went wrong while talking to AI. Please try again.');
  }
  })();

  inFlightRequest = requestPromise;
  try {
    return await requestPromise;
  } finally {
    inFlightRequest = null;
  }
}
