// @ts-nocheck
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

type ExtractRequestBody = {
  fileBase64?: string;
  mimeType?: string;
};

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

function normalizeTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hasAnyDayToken(raw: string, tokens: string[]) {
  const lower = raw.toLowerCase();
  return tokens.some(token => lower.includes(token));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS_HEADERS});
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!apiKey) return jsonResponse({error: 'AI extraction is not configured.'}, 500);
  if (!supabaseUrl || !supabaseAnonKey) return jsonResponse({error: 'Server configuration is incomplete.'}, 500);
  if (!authHeader.startsWith('Bearer ')) return jsonResponse({error: 'Authentication required.'}, 401);

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {headers: {Authorization: authHeader}},
    });

    const {
      data: {user},
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({error: 'Authentication required.'}, 401);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const {data: recentLogs, error: logsError} = await supabase
      .from('ai_request_logs')
      .select('id,created_at')
      .eq('request_type', 'extract_schedule')
      .gte('created_at', since)
      .order('created_at', {ascending: true});
    if (logsError) return jsonResponse({error: 'Unable to validate extraction quota right now. Please retry.'}, 503);

    const count = (recentLogs ?? []).length;
    if (count >= 30) {
      const now = new Date();
      const firstWindow = recentLogs?.[0]?.created_at ? new Date(recentLogs[0].created_at) : now;
      const resetAt = new Date(firstWindow.getTime() + 24 * 60 * 60 * 1000);
      const hours = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / (60 * 60 * 1000)));
      return jsonResponse({error: `Daily extraction limit reached. Resets in ${hours} hours.`}, 429);
    }

    const body = (await req.json()) as ExtractRequestBody;
    if (!body?.fileBase64 || !body?.mimeType) {
      return jsonResponse({error: 'Missing file payload for extraction.'}, 400);
    }

    const {error: insertError} = await supabase
      .from('ai_request_logs')
      .insert({user_id: user.id, request_type: 'extract_schedule'});
    if (insertError) return jsonResponse({error: 'Unable to register extraction usage right now.'}, 503);

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const basePrompt =
      'You are a schedule extraction assistant. Analyze this file and extract weekly schedule events. ' +
      'Return strict JSON only with shape {"events":[{"title":"", "day_of_week":0, "start_time":"HH:MM", "end_time":"HH:MM", "color_category":"study|work|sport|personal|default"}]}. ' +
      'IMPORTANT day_of_week convention: 0=Sunday, 1=Monday (lundi), 2=Tuesday (mardi), 3=Wednesday (mercredi), 4=Thursday (jeudi), 5=Friday (vendredi), 6=Saturday (samedi). ' +
      'Do NOT renumber based on first visible column. Even if table starts with Monday, Monday must be 1 (not 0). ' +
      'If header is unclear, skip that column instead of guessing. ' +
      'Map multilingual day names correctly. Examples: ' +
      'English: Sunday/Sun, Monday/Mon, Tuesday/Tue, Wednesday/Wed, Thursday/Thu, Friday/Fri, Saturday/Sat. ' +
      'French: dimanche/dim, lundi/lun, mardi/mar, mercredi/mer, jeudi/jeu, vendredi/ven, samedi/sam. ' +
      'Spanish: domingo, lunes, martes, miercoles/miércoles, jueves, viernes, sabado/sábado. ' +
      'German: Sonntag, Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag. ' +
      'Your response MUST be valid JSON parseable by JSON.parse(). ' +
      'Do NOT wrap in markdown code blocks (no ```json fences). ' +
      'Do NOT include any text before or after the JSON object. ' +
      'Do NOT include comments. The first character of your response must be { and the last must be }.';

    const strictRetrySuffix =
      ' Return ONLY valid JSON. No commentary. No markdown formatting.';

    const allowedCategories = new Set(['study', 'work', 'sport', 'personal', 'default']);
    let events: Array<{
      title: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      color_category: string;
    }> | null = null;
    let rawModelText = '';
    let lastFailure: string | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const prompt = attempt === 0 ? basePrompt : `${basePrompt}${strictRetrySuffix}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {text: prompt},
                {
                  inline_data: {
                    mime_type: body.mimeType,
                    data: body.fileBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!geminiRes.ok) {
        const text = await geminiRes.text();
        console.error('Gemini extract error', {attempt: attempt + 1, status: geminiRes.status, body: text});
        if (geminiRes.status === 429) {
          return jsonResponse({error: 'AI is busy right now, please wait a moment and try again.'}, 429);
        }
        lastFailure = `gemini_http_${geminiRes.status}`;
        if (attempt < 2) {
          await sleep(500);
          continue;
        }
        return jsonResponse(
          {error: "We're having trouble reading this file. Please try again, or use Manual entry to add events."},
          502,
        );
      }

      const payload = (await geminiRes.json()) as {
        candidates?: Array<{content?: {parts?: Array<{text?: string}>}}>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      rawModelText = text;
      console.log('extract_schedule raw_ai_response', {attempt: attempt + 1, text});
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.error('extract_schedule json_parse_failed', {attempt: attempt + 1, parseError});
        lastFailure = 'json_parse_failed';
        if (attempt < 2) {
          await sleep(500);
          continue;
        }
        break;
      }

      const rawEvents = (parsed as any)?.events;
      if (!Array.isArray(rawEvents)) {
        console.error('extract_schedule missing_events_array', {attempt: attempt + 1, parsed});
        lastFailure = 'invalid_shape';
        if (attempt < 2) {
          await sleep(500);
          continue;
        }
        break;
      }

      const normalizedEvents = rawEvents
        .map((event: any) => {
          const day = Number(event.day_of_week);
          const start = normalizeTime(String(event.start_time ?? ''));
          const end = normalizeTime(String(event.end_time ?? ''));
          const category = String(event.color_category ?? 'default');
          if (!event?.title || Number.isNaN(day) || day < 0 || day > 6 || !start || !end) return null;
          return {
            title: String(event.title).trim(),
            day_of_week: day,
            start_time: start,
            end_time: end,
            color_category: allowedCategories.has(category) ? category : 'default',
          };
        })
        .filter(Boolean);

      if (!normalizedEvents.length) {
        console.error('extract_schedule validation_failed_empty', {attempt: attempt + 1});
        lastFailure = 'validation_failed';
        if (attempt < 2) {
          await sleep(500);
          continue;
        }
        break;
      }

      events = normalizedEvents;
      break;
    }

    if (!events) {
      console.error('extract_schedule retries_exhausted', {lastFailure});
      return jsonResponse(
        {error: "We're having trouble reading this file. Please try again, or use Manual entry to add events."},
        502,
      );
    }

    const parsedDays = events.map(event => event.day_of_week);
    console.log('extract_schedule parsed_day_values', parsedDays);

    const rawLower = rawModelText.toLowerCase();
    const hasMondayLikeHeader = hasAnyDayToken(rawLower, [
      'monday',
      'mon',
      'lundi',
      'lun',
      'lunes',
      'montag',
    ]);
    const hasSundayLikeHeader = hasAnyDayToken(rawLower, [
      'sunday',
      'sun',
      'dimanche',
      'dim',
      'domingo',
      'sonntag',
    ]);
    const hasDayZero = parsedDays.includes(0);
    const hasOtherWeekdays = parsedDays.some(day => day >= 1 && day <= 6);
    if (hasMondayLikeHeader && !hasSundayLikeHeader && hasDayZero && hasOtherWeekdays) {
      console.warn(
        'extract_schedule possible day shift detected: Monday-like headers present, Sunday-like headers absent, but parsed events include day_of_week=0',
      );
    }

    return jsonResponse({
      events,
      remaining: Math.max(0, 30 - (count + 1)),
    });
  } catch (_err) {
    return jsonResponse({error: "Couldn't extract schedule right now. Please retry."}, 500);
  }
});
