import {supabase} from '../lib/supabase';
import type {DraftRecurringEvent, RecurringColorCategory} from '../types/recurringSchedule';

export async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

function getExtractEndpoint() {
  const envUrl = import.meta.env.VITE_SCHEDULE_EXTRACTION_ENDPOINT ?? import.meta.env.NEXT_PUBLIC_SCHEDULE_EXTRACTION_ENDPOINT;
  if (envUrl) return envUrl;
  const base = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Missing extraction endpoint configuration.');
  return `${base}/functions/v1/extract-schedule`;
}

export async function extractScheduleFromFile(file: File): Promise<DraftRecurringEvent[]> {
  const endpoint = getExtractEndpoint();
  const {
    data: {session},
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Please sign in before extracting schedule.');

  const base64 = await fileToBase64(file);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey:
        import.meta.env.VITE_SUPABASE_ANON_KEY ??
        import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
        '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64: base64,
      mimeType: file.type || 'application/octet-stream',
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    events?: Array<{
      title: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      color_category?: RecurringColorCategory;
    }>;
    error?: string;
  };
  if (!res.ok) throw new Error(payload.error ?? 'Failed to extract schedule.');
  const events = payload.events ?? [];
  return events.map(event => ({
    title: event.title,
    dayOfWeek: event.day_of_week,
    startTime: event.start_time,
    endTime: event.end_time,
    colorCategory: event.color_category ?? 'default',
  }));
}
