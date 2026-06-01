import {supabase} from '../lib/supabase';
import type {
  RecurringColorCategory,
  ScheduleImport,
  RecurringScheduleBlock,
  RecurringScheduleException,
  SubjectColor,
} from '../types/recurringSchedule';
import {normalizeSubjectTitle} from '../utils/subjectTitle';

type RecurringScheduleBlockRow = {
  id: string;
  user_id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color_category: string;
  custom_color: string | null;
  import_id: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

type RecurringScheduleExceptionRow = {
  id: string;
  user_id: string;
  recurring_block_id: string;
  exception_date: string;
  type: 'skip' | 'modify';
  modified_start_time: string | null;
  modified_end_time: string | null;
  modified_title: string | null;
  modified_date: string | null;
  created_at: string;
};

type SubjectColorRow = {
  id: string;
  user_id: string;
  subject_title: string;
  color_hex: string;
  created_at: string;
};

type ScheduleImportRow = {
  id: string;
  user_id: string;
  schedule_name: string;
  import_date: string;
  source_type: 'image' | 'pdf' | 'manual';
  event_count: number;
  created_at: string;
};

function rowToBlock(row: RecurringScheduleBlockRow): RecurringScheduleBlock {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    colorCategory: row.color_category as RecurringColorCategory,
    customColor: row.custom_color,
    importId: row.import_id,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSubjectColor(row: SubjectColorRow): SubjectColor {
  return {
    id: row.id,
    userId: row.user_id,
    subjectTitle: row.subject_title,
    colorHex: row.color_hex,
    createdAt: row.created_at,
  };
}

function rowToScheduleImport(row: ScheduleImportRow): ScheduleImport {
  return {
    id: row.id,
    userId: row.user_id,
    scheduleName: row.schedule_name,
    importDate: row.import_date,
    sourceType: row.source_type,
    eventCount: row.event_count,
    createdAt: row.created_at,
  };
}

function rowToException(row: RecurringScheduleExceptionRow): RecurringScheduleException {
  return {
    id: row.id,
    userId: row.user_id,
    recurringBlockId: row.recurring_block_id,
    exceptionDate: row.exception_date,
    type: row.type,
    modifiedStartTime: row.modified_start_time?.slice(0, 5) ?? null,
    modifiedEndTime: row.modified_end_time?.slice(0, 5) ?? null,
    modifiedTitle: row.modified_title,
    modifiedDate: row.modified_date ?? null,
    createdAt: row.created_at,
  };
}

export async function fetchRecurringBlocks() {
  const {data, error} = await supabase
    .from('recurring_schedule_blocks')
    .select('id,user_id,title,day_of_week,start_time,end_time,color_category,custom_color,import_id,start_date,end_date,created_at,updated_at')
    .order('day_of_week', {ascending: true})
    .order('start_time', {ascending: true});
  if (error) throw new Error('Unable to load recurring schedule blocks.');
  return (data as RecurringScheduleBlockRow[]).map(rowToBlock);
}

export async function createRecurringBlocks(
  blocks: Array<{
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    colorCategory: RecurringColorCategory;
    customColor?: string | null;
    importId?: string | null;
    startDate: string;
    endDate?: string | null;
  }>,
) {
  if (!blocks.length) return [];
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const payload = blocks.map(block => ({
    user_id: user.id,
    title: block.title,
    day_of_week: block.dayOfWeek,
    start_time: `${block.startTime}:00`,
    end_time: `${block.endTime}:00`,
    color_category: block.colorCategory,
    custom_color: block.customColor ?? null,
    import_id: block.importId ?? null,
    start_date: block.startDate,
    end_date: block.endDate ?? null,
  }));

  const {data, error} = await supabase
    .from('recurring_schedule_blocks')
    .insert(payload)
    .select('id,user_id,title,day_of_week,start_time,end_time,color_category,custom_color,import_id,start_date,end_date,created_at,updated_at');
  if (error) {
    console.error('createRecurringBlocks failed', {error, payloadSize: payload.length});
    throw new Error(error.message || 'Unable to save recurring schedule blocks.');
  }
  return (data as RecurringScheduleBlockRow[]).map(rowToBlock);
}

export async function replaceRecurringBlocks(
  blocks: Array<{
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    colorCategory: RecurringColorCategory;
    customColor?: string | null;
    importId?: string | null;
    startDate: string;
    endDate?: string | null;
  }>,
) {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const {error: deleteError} = await supabase.from('recurring_schedule_blocks').delete().eq('user_id', user.id);
  if (deleteError) throw new Error('Unable to replace recurring schedule right now.');
  return createRecurringBlocks(blocks);
}

export async function updateRecurringBlock(
  id: string,
  patch: Partial<{
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    colorCategory: RecurringColorCategory;
    customColor: string | null;
    importId: string | null;
    startDate: string;
    endDate: string | null;
  }>,
) {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.dayOfWeek !== undefined) payload.day_of_week = patch.dayOfWeek;
  if (patch.startTime !== undefined) payload.start_time = `${patch.startTime}:00`;
  if (patch.endTime !== undefined) payload.end_time = `${patch.endTime}:00`;
  if (patch.colorCategory !== undefined) payload.color_category = patch.colorCategory;
  if (patch.customColor !== undefined) payload.custom_color = patch.customColor;
  if (patch.importId !== undefined) payload.import_id = patch.importId;
  if (patch.startDate !== undefined) payload.start_date = patch.startDate;
  if (patch.endDate !== undefined) payload.end_date = patch.endDate;
  const {error} = await supabase.from('recurring_schedule_blocks').update(payload).eq('id', id);
  if (error) throw new Error('Unable to update recurring schedule block.');
}

export async function deleteRecurringBlock(id: string) {
  const {error} = await supabase.from('recurring_schedule_blocks').delete().eq('id', id);
  if (error) throw new Error('Unable to delete recurring schedule block.');
}

export async function deleteAllRecurringBlocks() {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const {error} = await supabase.from('recurring_schedule_blocks').delete().eq('user_id', user.id);
  if (error) throw new Error('Unable to clear recurring schedule blocks.');
}

export async function fetchRecurringExceptions(range?: {startDate: string; endDate: string}) {
  const buildQuery = (cols: string) => {
    let q = supabase
      .from('recurring_schedule_exceptions')
      .select(cols)
      .order('exception_date', {ascending: true});
    if (range) q = q.gte('exception_date', range.startDate).lte('exception_date', range.endDate);
    return q;
  };

  // Try with the modified_date column (requires migration 20260601120000).
  // If the column doesn't exist yet in the DB, fall back to the legacy column set
  // so that the app keeps working while the migration is pending.
  const withDate = await buildQuery(
    'id,user_id,recurring_block_id,exception_date,type,modified_start_time,modified_end_time,modified_title,modified_date,created_at',
  );
  if (!withDate.error) {
    return (withDate.data as unknown as RecurringScheduleExceptionRow[]).map(rowToException);
  }

  const withoutDate = await buildQuery(
    'id,user_id,recurring_block_id,exception_date,type,modified_start_time,modified_end_time,modified_title,created_at',
  );
  if (withoutDate.error) throw new Error('Unable to load recurring schedule exceptions.');
  return (withoutDate.data as unknown as Omit<RecurringScheduleExceptionRow, 'modified_date'>[]).map(
    row => rowToException({...row, modified_date: null}),
  );
}

export async function createException(payload: {
  recurringBlockId: string;
  exceptionDate: string;
  type: 'skip' | 'modify';
  modifiedStartTime?: string;
  modifiedEndTime?: string;
  modifiedTitle?: string;
  modifiedDate?: string;
}) {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const baseInsert = {
    user_id: user.id,
    recurring_block_id: payload.recurringBlockId,
    exception_date: payload.exceptionDate,
    type: payload.type,
    modified_start_time: payload.modifiedStartTime ? `${payload.modifiedStartTime}:00` : null,
    modified_end_time: payload.modifiedEndTime ? `${payload.modifiedEndTime}:00` : null,
    modified_title: payload.modifiedTitle ?? null,
  };

  // Try inserting with modified_date (requires migration 20260601120000).
  // Only include the column when there is an actual value or when fallback is available.
  const {data: d1, error: e1} = await supabase
    .from('recurring_schedule_exceptions')
    .insert({...baseInsert, modified_date: payload.modifiedDate ?? null})
    .select('id,user_id,recurring_block_id,exception_date,type,modified_start_time,modified_end_time,modified_title,modified_date,created_at')
    .single();

  if (!e1) return rowToException(d1 as unknown as RecurringScheduleExceptionRow);

  // First insert failed. Log the real Supabase error for debugging.
  console.warn('[createException] primary insert failed:', e1.message ?? e1);

  // modified_date column may not exist yet (migration 20260601120000 pending).
  // For cross-day moves we truly need the column; for same-day time-only changes
  // we can fall back to an insert without the column.
  if (payload.modifiedDate) {
    console.error(
      '[createException] Cross-day move requires the modified_date column.',
      'Apply migration 20260601120000_add_modified_date_to_exceptions.sql in Supabase.',
    );
    throw new Error('Unable to save schedule exception.');
  }

  const {data: d2, error: e2} = await supabase
    .from('recurring_schedule_exceptions')
    .insert(baseInsert)
    .select('id,user_id,recurring_block_id,exception_date,type,modified_start_time,modified_end_time,modified_title,created_at')
    .single();

  if (e2) {
    console.error('[createException] fallback insert also failed:', e2.message ?? e2);
    throw new Error('Unable to save schedule exception.');
  }
  return rowToException({...(d2 as unknown as Omit<RecurringScheduleExceptionRow, 'modified_date'>), modified_date: null});
}

export async function createSkipRange(startDate: string, endDate: string, recurringBlockIds: string[]) {
  if (!recurringBlockIds.length) return;
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const rows: Array<{
    user_id: string;
    recurring_block_id: string;
    exception_date: string;
    type: 'skip';
  }> = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const date = `${y}-${m}-${d}`;
    for (const recurringBlockId of recurringBlockIds) {
      rows.push({
        user_id: user.id,
        recurring_block_id: recurringBlockId,
        exception_date: date,
        type: 'skip',
      });
    }
  }

  const {error} = await supabase.from('recurring_schedule_exceptions').insert(rows);
  if (error) throw new Error('Unable to create break exceptions.');
}

export async function deleteException(id: string) {
  const {error} = await supabase.from('recurring_schedule_exceptions').delete().eq('id', id);
  if (error) throw new Error('Unable to delete exception.');
}

export async function fetchSubjectColors() {
  const {data, error} = await supabase
    .from('subject_colors')
    .select('id,user_id,subject_title,color_hex,created_at')
    .order('created_at', {ascending: false});
  if (error) throw new Error('Unable to load subject colors.');
  return (data as SubjectColorRow[]).map(rowToSubjectColor);
}

export async function upsertSubjectColor(subjectTitle: string, colorHex: string) {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const normalizedSubjectTitle = normalizeSubjectTitle(subjectTitle);
  const {data, error} = await supabase
    .from('subject_colors')
    .upsert(
      {
        user_id: user.id,
        subject_title: normalizedSubjectTitle,
        color_hex: colorHex,
      },
      {onConflict: 'user_id,subject_title'},
    )
    .select('id,user_id,subject_title,color_hex,created_at')
    .single();
  if (error) throw new Error('Unable to save subject color.');
  return rowToSubjectColor(data as SubjectColorRow);
}

export async function fetchScheduleImports() {
  const {data, error} = await supabase
    .from('schedule_imports')
    .select('id,user_id,schedule_name,import_date,source_type,event_count,created_at')
    .order('import_date', {ascending: false});
  if (error) throw new Error('Unable to load import history.');
  return (data as ScheduleImportRow[]).map(rowToScheduleImport);
}

export async function createScheduleImport(payload: {
  scheduleName: string;
  sourceType: 'image' | 'pdf' | 'manual';
  eventCount: number;
}) {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const {data, error} = await supabase
    .from('schedule_imports')
    .insert({
      user_id: user.id,
      schedule_name: payload.scheduleName.trim(),
      source_type: payload.sourceType,
      event_count: payload.eventCount,
    })
    .select('id,user_id,schedule_name,import_date,source_type,event_count,created_at')
    .single();
  if (error) {
    console.error('createScheduleImport failed', {error, payload});
    throw new Error(error.message || 'Unable to create schedule import.');
  }
  return rowToScheduleImport(data as ScheduleImportRow);
}

export async function updateScheduleImportName(id: string, scheduleName: string) {
  const {error} = await supabase.from('schedule_imports').update({schedule_name: scheduleName.trim()}).eq('id', id);
  if (error) throw new Error('Unable to rename imported schedule.');
}

export async function deleteScheduleImport(id: string) {
  const {error} = await supabase.from('schedule_imports').delete().eq('id', id);
  if (error) throw new Error('Unable to delete imported schedule.');
}

export async function deleteAllScheduleImports() {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const {error} = await supabase.from('schedule_imports').delete().eq('user_id', user.id);
  if (error) throw new Error('Unable to clear schedule imports.');
}

export async function editThisAndFollowing(args: {
  blockId: string;
  splitDate: string;
  title?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  colorCategory?: RecurringColorCategory;
}) {
  const {data: current, error: currentError} = await supabase
    .from('recurring_schedule_blocks')
    .select('id,title,day_of_week,start_time,end_time,color_category,start_date,end_date')
    .eq('id', args.blockId)
    .single();
  if (currentError || !current) throw new Error('Unable to load recurring series for split.');

  const splitDate = new Date(`${args.splitDate}T12:00:00`);
  const previousEnd = new Date(splitDate);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const prevY = previousEnd.getFullYear();
  const prevM = String(previousEnd.getMonth() + 1).padStart(2, '0');
  const prevD = String(previousEnd.getDate()).padStart(2, '0');
  const previousEndDate = `${prevY}-${prevM}-${prevD}`;

  await updateRecurringBlock(args.blockId, {endDate: previousEndDate});

  await createRecurringBlocks([
    {
      title: args.title ?? current.title,
      dayOfWeek: args.dayOfWeek ?? current.day_of_week,
      startTime: (args.startTime ?? current.start_time).slice(0, 5),
      endTime: (args.endTime ?? current.end_time).slice(0, 5),
      colorCategory: (args.colorCategory ?? current.color_category) as RecurringColorCategory,
      startDate: args.splitDate,
      endDate: current.end_date,
    },
  ]);
}
