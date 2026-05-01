// @ts-nocheck
// Currently using Gemini Flash for free tier. To switch back to Claude,
// swap this implementation back to Anthropic SDK with model claude-haiku-4-5-20251001.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

type RequestBody = {
  userText?: string;
  existingEvents?: Array<{title: string; date: string; startTime: number; endTime: number}>;
  datedTasks?: Array<{title: string; dueDate: string; status: string}>;
};

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json', ...CORS_HEADERS},
  });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS_HEADERS});
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!apiKey) {
    return jsonResponse({error: 'AI service is not configured yet. Please contact support.'}, 500);
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({error: 'Server configuration is incomplete.'}, 500);
  }
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({error: 'Authentication required.'}, 401);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const {
      data: {user},
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({error: 'Authentication required.'}, 401);

    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const {data: recentLogs, error: logsError} = await supabase
      .from('ai_request_logs')
      .select('id,created_at')
      .eq('request_type', 'ai_schedule')
      .gte('created_at', since)
      .order('created_at', {ascending: true});
    if (logsError) {
      return jsonResponse({error: 'Unable to validate AI quota right now. Please retry.'}, 503);
    }
    const count = (recentLogs ?? []).length;
    if (count >= 15) {
      const firstWindow = recentLogs?.[0]?.created_at ? new Date(recentLogs[0].created_at) : now;
      const resetAt = new Date(firstWindow.getTime() + 24 * 60 * 60 * 1000);
      const hours = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / (60 * 60 * 1000)));
      return jsonResponse({error: `Daily AI request limit reached. Resets in ${hours} hours.`}, 429);
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.userText?.trim()) {
      return jsonResponse({error: 'Please describe what you need to schedule.'}, 400);
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + 60);
    const rangeEndIso = ymd(rangeEnd);

    const {data: recurringBlocks, error: recurringError} = await supabase
      .from('recurring_schedule_blocks')
      .select('id,title,day_of_week,start_time,end_time,start_date,end_date')
      .lte('start_date', rangeEndIso);
    if (recurringError) {
      return jsonResponse({error: 'Unable to load recurring schedule right now. Please retry.'}, 503);
    }

    const {data: recurringExceptions, error: recurringExceptionsError} = await supabase
      .from('recurring_schedule_exceptions')
      .select('recurring_block_id,exception_date,type,modified_start_time,modified_end_time,modified_title')
      .gte('exception_date', todayIso)
      .lte('exception_date', rangeEndIso);
    if (recurringExceptionsError) {
      return jsonResponse({error: 'Unable to load recurring schedule exceptions right now. Please retry.'}, 503);
    }

    const exceptionMap = new Map();
    for (const ex of recurringExceptions ?? []) {
      exceptionMap.set(`${ex.recurring_block_id}__${ex.exception_date}`, ex);
    }

    const recurringBusy = [];
    for (let cursor = new Date(`${todayIso}T12:00:00`); ymd(cursor) <= rangeEndIso; cursor.setDate(cursor.getDate() + 1)) {
      const date = ymd(cursor);
      const day = cursor.getDay();
      for (const block of recurringBlocks ?? []) {
        if (block.day_of_week !== day) continue;
        if (date < block.start_date) continue;
        if (block.end_date && date > block.end_date) continue;
        const ex = exceptionMap.get(`${block.id}__${date}`);
        if (ex?.type === 'skip') continue;
        const startTime = ex?.type === 'modify' && ex.modified_start_time ? ex.modified_start_time : block.start_time;
        const endTime = ex?.type === 'modify' && ex.modified_end_time ? ex.modified_end_time : block.end_time;
        recurringBusy.push({
          title: ex?.type === 'modify' && ex.modified_title ? ex.modified_title : block.title,
          date,
          startTime: toMinutes(startTime),
          endTime: toMinutes(endTime),
        });
      }
    }

    const systemPrompt =
      `You are a scheduling assistant. Today is ${todayIso}. All scheduled days must be >= today. Never schedule tasks in the past. ` +
      'Distribute work across multiple days leading up to the deadline rather than cramming it all on the deadline day. ' +
      'Respect recurring commitments and never schedule inside those occupied slots. ' +
      'Return strict JSON only with keys: subtasks, deadline, reasoning. ' +
      'subtasks must be an array of objects with title, estimated_minutes, suggested_day. ' +
      'Use ISO date (YYYY-MM-DD) for deadline and suggested_day.';

    const userPrompt = JSON.stringify({
      request: body.userText,
      existingEvents: body.existingEvents ?? [],
      recurringBusySlots: recurringBusy,
      datedTasks: body.datedTasks ?? [],
    });

    const {error: insertError} = await supabase
      .from('ai_request_logs')
      .insert({user_id: user.id, request_type: 'ai_schedule'});
    if (insertError) {
      return jsonResponse({error: 'Unable to register AI usage right now. Please retry.'}, 503);
    }

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{text: `${systemPrompt}\n\nInput:\n${userPrompt}`}],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            required: ['subtasks', 'deadline', 'reasoning'],
            properties: {
              subtasks: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['title', 'estimated_minutes', 'suggested_day'],
                  properties: {
                    title: {type: 'string'},
                    estimated_minutes: {type: 'number'},
                    suggested_day: {type: 'string'},
                  },
                },
              },
              deadline: {type: 'string'},
              reasoning: {type: 'string'},
            },
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errorText);
      if (geminiRes.status === 429) {
        return jsonResponse({error: 'AI request limit reached for now. Please try again later.', debug: errorText}, 429);
      }
      return jsonResponse({error: 'AI is temporarily unavailable. Please retry soon.', debug: errorText}, 502);
    }

    const payload = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{text?: string}>;
        };
      }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let plan: unknown;
    try {
      plan = JSON.parse(text);
    } catch {
      return jsonResponse({error: 'AI returned an invalid schedule. Please provide more details and retry.'}, 502);
    }

    if (!(plan as any)?.subtasks || !Array.isArray((plan as any).subtasks)) {
      return jsonResponse({error: 'AI returned an invalid schedule. Please provide more details and retry.'}, 502);
    }
    if (!(plan as any)?.deadline) {
      return jsonResponse({error: 'We could not detect a deadline. Please include a clear due date and retry.'}, 422);
    }

    return jsonResponse({plan, remaining: Math.max(0, 15 - (count + 1))});
  } catch (_err) {
    return jsonResponse({error: 'We could not build your schedule right now. Please try again.'}, 500);
  }
});
