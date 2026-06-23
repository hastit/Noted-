import {
  AlarmClock,
  BookOpen,
  Briefcase,
  Circle,
  Clock3,
  Dumbbell,
  Moon,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react';
import {useMemo} from 'react';
import type {ScheduledBlock} from '../../types/scheduler';
import {getBlockVisualStyle, toRgba} from '../../utils/blockVisualStyle';

/** ~2.35px per minute — 30m ≈ 70px tall, 90m ≈ 212px (≈3.5× width) */
const PX_PER_MINUTE = 2.35;
const BUBBLE_WIDTH = 48;
const MARKER_SIZE = 48;
const MIN_TASK_HEIGHT = 58;
const ROW_GAP = 4;
const PILL_RADIUS = BUBBLE_WIDTH / 2;

const TIME_COL_W = 58;
const SPINE_COL_W = 56;
const STATUS_COL_W = 32;
const CONTENT_GAP = 20;

const WAKE_SECTION = 88;
const SLEEP_SECTION = 88;
const MARGIN_TOP = 28;
const MARGIN_BOTTOM = 40;

const GLASS_CARD =
  'border border-white/70 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md';
const GLASS_BUBBLE =
  'shadow-[0_6px_22px_-10px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-lg';

const ACCENT_GRADIENT_BG = 'bg-gradient-to-r from-rose-100/80 via-violet-100/70 to-sky-100/60';
const ACCENT_GRADIENT_BORDER = 'border-violet-200/60';
const ACCENT_TEXT = 'text-violet-600';
const QUICK_ADD_BTN = `inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold ${ACCENT_GRADIENT_BORDER} ${ACCENT_GRADIENT_BG} ${ACCENT_TEXT} transition hover:shadow-[0_4px_18px_-6px_rgba(139,92,246,0.28)]`;
const QUICK_ADD_PLUS =
  'flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-white shadow-[0_2px_8px_-2px_rgba(139,92,246,0.45)]';

type Props = {
  date: Date;
  dayKey: string;
  items: ScheduledBlock[];
  isToday: boolean;
  todayKey: string;
  now: Date;
  onBlockClick?: (block: ScheduledBlock, el: HTMLElement) => void;
  onSlotCreate?: (dayKey: string, startMinute: number, durationMinutes: number, title: string) => void;
  selectedBlockId?: string | null;
};

function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${m}`;
}

function formatDurationLong(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return `${h} hr`;
    return `${h} hr, ${rem} min`;
  }
  return `${minutes} min`;
}

function formatGapLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function overlaps(a: ScheduledBlock, b: ScheduledBlock) {
  return !(a.endTime <= b.startTime || a.startTime >= b.endTime);
}

function findClusters(items: ScheduledBlock[]): ScheduledBlock[][] {
  const sorted = [...items].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };

  for (const item of sorted) parent.set(item.id, item.id);
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (overlaps(sorted[i], sorted[j])) union(sorted[i].id, sorted[j].id);
    }
  }

  const groups = new Map<string, ScheduledBlock[]>();
  for (const item of sorted) {
    const root = find(item.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(item);
  }

  return [...groups.values()].map(g =>
    [...g].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime),
  );
}

type TaskPosition = {
  topPx: number;
  bubbleH: number;
  roundTop: boolean;
  roundBottom: boolean;
  overlapAbove: boolean;
  clusterIndex: number;
  inCluster: boolean;
};

function computeTaskPositions(
  sorted: ScheduledBlock[],
  dayStart: number,
  spineTop: number,
): {positions: Map<string, TaskPosition>; contentBottomPx: number} {
  const clusters = findClusters(sorted);
  const clusterByTaskId = new Map<string, ScheduledBlock[]>();
  for (const cluster of clusters) {
    for (const task of cluster) clusterByTaskId.set(task.id, cluster);
  }

  const positions = new Map<string, TaskPosition>();
  let visualBottomPx = spineTop;
  const processed = new Set<string>();

  const minuteToPx = (minute: number) => spineTop + (minute - dayStart) * PX_PER_MINUTE;

  for (const item of sorted) {
    if (processed.has(item.id)) continue;

    const cluster = clusterByTaskId.get(item.id)!;

    if (cluster.length === 1) {
      const clockTop = minuteToPx(item.startTime);
      const topPx = Math.max(clockTop, visualBottomPx);
      const bubbleH = taskBlockHeight(item.endTime - item.startTime);
      positions.set(item.id, {
        topPx,
        bubbleH,
        roundTop: true,
        roundBottom: true,
        overlapAbove: false,
        clusterIndex: 0,
        inCluster: false,
      });
      visualBottomPx = topPx + bubbleH + ROW_GAP;
      processed.add(item.id);
      continue;
    }

    const clockTop = minuteToPx(cluster[0].startTime);
    let y = Math.max(clockTop, visualBottomPx);

    for (let j = 0; j < cluster.length; j += 1) {
      const task = cluster[j];
      const overlapAbove = j > 0;

      const bubbleH = taskBlockHeight(task.endTime - task.startTime);
      positions.set(task.id, {
        topPx: y,
        bubbleH,
        roundTop: j === 0,
        roundBottom: j === cluster.length - 1,
        overlapAbove,
        clusterIndex: j,
        inCluster: true,
      });
      y += bubbleH;
      processed.add(task.id);
    }

    visualBottomPx = y + ROW_GAP;
  }

  return {positions, contentBottomPx: visualBottomPx};
}


function bubbleLeft(spineCenterX: number) {
  return spineCenterX - BUBBLE_WIDTH / 2;
}

type OverlapJunction = {
  id: string;
  topPx: number;
};

function computeOverlapJunctions(
  sorted: ScheduledBlock[],
  positions: Map<string, TaskPosition>,
): OverlapJunction[] {
  const junctions: OverlapJunction[] = [];
  for (const cluster of findClusters(sorted)) {
    if (cluster.length < 2) continue;
    for (let j = 1; j < cluster.length; j += 1) {
      const prior = cluster[j - 1];
      const priorPos = positions.get(prior.id)!;
      junctions.push({
        id: `${prior.id}-${cluster[j].id}`,
        topPx: priorPos.topPx + priorPos.bubbleH,
      });
    }
  }
  return junctions;
}

function clusterKey(cluster: ScheduledBlock[]) {
  return cluster.map(t => t.id).join('-');
}

function segmentOffsetInCluster(cluster: ScheduledBlock[], taskId: string, positions: Map<string, TaskPosition>) {
  let offset = 0;
  for (const task of cluster) {
    if (task.id === taskId) return offset;
    offset += positions.get(task.id)!.bubbleH;
  }
  return 0;
}

function buildDedupedTimeLabels(
  sorted: ScheduledBlock[],
  positions: Map<string, TaskPosition>,
): Array<{minute: number; topPx: number; key: string}> {
  const clusterByTask = new Map<string, ScheduledBlock[]>();
  for (const cluster of findClusters(sorted)) {
    for (const task of cluster) clusterByTask.set(task.id, cluster);
  }

  const raw: Array<{minute: number; topPx: number; key: string}> = [];
  for (const item of sorted) {
    const pos = positions.get(item.id)!;
    const cluster = clusterByTask.get(item.id);
    const clusterIdx = cluster?.findIndex(t => t.id === item.id) ?? -1;
    const inCluster = !!cluster && cluster.length > 1;

    raw.push({minute: item.startTime, topPx: pos.topPx, key: `${item.id}-start`});

    const isLastInCluster = !inCluster || clusterIdx === cluster!.length - 1;
    if (isLastInCluster) {
      raw.push({minute: item.endTime, topPx: pos.topPx + pos.bubbleH - 14, key: `${item.id}-end`});
    }
  }

  raw.sort((a, b) => a.topPx - b.topPx || a.minute - b.minute);

  const result: typeof raw = [];
  for (const label of raw) {
    const sameSlot = result.find(
      r => r.minute === label.minute && Math.abs(r.topPx - label.topPx) < 18,
    );
    if (sameSlot) continue;

    let topPx = label.topPx;
    const crowded = result.find(r => Math.abs(r.topPx - topPx) < 11 && r.minute !== label.minute);
    if (crowded) topPx = crowded.topPx + 13;

    result.push({...label, topPx});
  }
  return result;
}

function taskIcon(item: ScheduledBlock) {
  const t = item.title.toLowerCase();
  if (['study', 'exam', 'homework', 'read', 'notes', 'philosophie', 'math', 'memorize'].some(k => t.includes(k))) {
    return BookOpen;
  }
  if (['work', 'meeting', 'oral', 'presentation'].some(k => t.includes(k))) {
    return Briefcase;
  }
  if (['workout', 'gym', 'run', 'walk', 'sport', 'swim'].some(k => t.includes(k))) {
    return Dumbbell;
  }
  if (['write', 'letter', 'motivation', 'essay'].some(k => t.includes(k))) {
    return Pencil;
  }
  if (item.source === 'ai') return Sparkles;
  return BookOpen;
}

function fillRatioForTask(item: ScheduledBlock, nowMinutes: number, dayKey: string, todayKey: string): number {
  if (dayKey < todayKey) return 1;
  if (dayKey > todayKey) return 0;
  if (nowMinutes <= item.startTime) return 0;
  if (nowMinutes >= item.endTime) return 1;
  return (nowMinutes - item.startTime) / (item.endTime - item.startTime);
}

function computeDayRange(items: ScheduledBlock[], isToday: boolean, nowMinutes: number) {
  let start = 8 * 60;
  let end = 22 * 60;
  for (const item of items) {
    start = Math.min(start, item.startTime - 45);
    end = Math.max(end, item.endTime + 45);
  }
  if (isToday) {
    start = Math.min(start, nowMinutes);
    end = Math.max(end, nowMinutes + 60);
  }
  start = Math.max(0, Math.floor(start / 60) * 60);
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60);
  if (end - start < 4 * 60) end = Math.min(24 * 60, start + 4 * 60);
  return {start, end};
}

function taskBlockHeight(durationMinutes: number) {
  return Math.max(MIN_TASK_HEIGHT, durationMinutes * PX_PER_MINUTE);
}

type TimelineSegment = {kind: 'gap'; start: number; end: number};

export default function DayTimelineView({
  date,
  dayKey,
  items,
  isToday,
  todayKey,
  now,
  onBlockClick,
  onSlotCreate,
  selectedBlockId,
}: Props) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime),
    [items],
  );

  const {start: dayStart, end: dayEnd} = useMemo(
    () => computeDayRange(sorted, isToday, nowMinutes),
    [sorted, isToday, nowMinutes],
  );

  const spineTop = MARGIN_TOP + WAKE_SECTION;
  const spineCenterX = TIME_COL_W + SPINE_COL_W / 2;

  const {positions, contentBottomPx} = useMemo(
    () => computeTaskPositions(sorted, dayStart, spineTop),
    [sorted, dayStart, spineTop],
  );

  const overlapJunctions = useMemo(
    () => computeOverlapJunctions(sorted, positions),
    [sorted, positions],
  );

  const overlapClusters = useMemo(
    () => findClusters(sorted).filter(c => c.length > 1),
    [sorted],
  );

  const clockTimelineBottom = spineTop + (dayEnd - dayStart) * PX_PER_MINUTE;
  const timelineBottomPx = Math.max(contentBottomPx, clockTimelineBottom);
  const timelineHeight = timelineBottomPx - spineTop;
  const totalHeight = timelineBottomPx + SLEEP_SECTION + MARGIN_BOTTOM;

  const progressTop = isToday
    ? Math.max(0, Math.min(timelineHeight, (nowMinutes - dayStart) * PX_PER_MINUTE))
    : dayKey < todayKey
      ? timelineHeight
      : 0;

  const topForMinute = (minute: number) => spineTop + (minute - dayStart) * PX_PER_MINUTE;

  const taskTimeLabels = useMemo(
    () => buildDedupedTimeLabels(sorted, positions),
    [sorted, positions],
  );

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    for (let m = dayStart; m <= dayEnd; m += 60) marks.push(m);
    return marks.filter(minute => {
      const hourTop = topForMinute(minute) - 8;
      return !taskTimeLabels.some(
        t => t.minute === minute && Math.abs(t.topPx - hourTop) < 14,
      );
    });
  }, [dayStart, dayEnd, taskTimeLabels, spineTop]);

  const segments = useMemo(() => {
    const result: TimelineSegment[] = [];
    let cursor = dayStart;
    for (const item of sorted) {
      if (item.startTime > cursor + 8) {
        result.push({kind: 'gap', start: cursor, end: item.startTime});
      }
      cursor = Math.max(cursor, item.endTime);
    }
    if (cursor < dayEnd - 8) {
      result.push({kind: 'gap', start: cursor, end: dayEnd});
    }
    return result;
  }, [sorted, dayStart, dayEnd]);

  const contentLeft = TIME_COL_W + SPINE_COL_W + CONTENT_GAP;

  return (
    <div className="max-h-[72vh] overflow-y-auto overflow-x-hidden py-6 [scrollbar-width:thin]">
      <div
        className="relative mx-auto w-full max-w-[480px] px-5 sm:px-8"
        style={{minHeight: totalHeight}}
      >
        {/* Hour labels */}
        {hourMarks.map(minute => (
          <div
            key={`hour-${minute}`}
            className="pointer-events-none absolute z-10 text-right text-[12px] font-medium tabular-nums text-[#B0B8C4]"
            style={{left: 0, width: TIME_COL_W, top: topForMinute(minute) - 8}}
          >
            {formatClock(minute)}
          </div>
        ))}

        {/* Task boundary times (deduped) */}
        {taskTimeLabels.map(({minute, topPx, key}) => (
          <div
            key={key}
            className="pointer-events-none absolute z-10 text-right text-[11px] font-medium tabular-nums text-[#C5CDD8]"
            style={{left: 0, width: TIME_COL_W, top: topPx}}
          >
            {formatClock(minute)}
          </div>
        ))}

        {/* Current time */}
        {isToday && progressTop >= 0 && progressTop <= timelineHeight && (
          <div
            className="pointer-events-none absolute z-20 text-right text-[12px] font-semibold tabular-nums text-violet-500"
            style={{left: 0, width: TIME_COL_W, top: spineTop + progressTop - 8}}
          >
            {formatClock(nowMinutes)}
          </div>
        )}

        {/* Spine — future */}
        <div
          className="absolute z-0 w-[2px] -translate-x-1/2 rounded-full bg-[#DDE3EA]"
          style={{left: spineCenterX, top: spineTop, height: timelineHeight}}
        />

        {/* Spine — past */}
        {progressTop > 0 && (
          <div
            className="absolute z-[1] w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-400 to-sky-400"
            style={{left: spineCenterX, top: spineTop, height: progressTop}}
          />
        )}

        {/* Dashed gaps on spine */}
        {segments.map((segment, idx) => {
          const gapH = topForMinute(segment.end) - topForMinute(segment.start);
          if (gapH < 16) return null;
          return (
            <div
              key={`gap-spine-${segment.start}-${idx}`}
              className="absolute z-[2] w-0 -translate-x-1/2 border-l-2 border-dashed border-[#C7D2DE]"
              style={{
                left: spineCenterX,
                top: topForMinute(segment.start),
                height: gapH,
              }}
            />
          );
        })}

        {/* Now dot */}
        {isToday && (
          <div
            className="absolute z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gradient-to-br from-violet-500 to-sky-400 shadow-[0_0_0_5px_rgba(139,92,246,0.22)]"
            style={{left: spineCenterX, top: spineTop + progressTop}}
          />
        )}

        {/* Wake marker */}
        <div
          className="absolute z-10 flex -translate-x-1/2 flex-col items-center text-center"
          style={{left: spineCenterX, top: MARGIN_TOP}}
        >
          <div
            className={`flex items-center justify-center rounded-full text-violet-500 ${ACCENT_GRADIENT_BG} border ${ACCENT_GRADIENT_BORDER} ${GLASS_CARD}`}
            style={{width: MARKER_SIZE, height: MARKER_SIZE}}
          >
            <AlarmClock size={22} strokeWidth={1.75} />
          </div>
          <p className="mt-2.5 text-[13px] font-semibold text-[#374151]">Wake up!</p>
        </div>

        {/* Sleep marker */}
        <div
          className="absolute z-10 flex -translate-x-1/2 flex-col items-center text-center"
          style={{left: spineCenterX, top: timelineBottomPx + 24}}
        >
          <div
            className={`flex items-center justify-center rounded-full text-[#9CA3AF] ${GLASS_CARD}`}
            style={{width: MARKER_SIZE, height: MARKER_SIZE}}
          >
            <Moon size={22} strokeWidth={1.75} />
          </div>
          <p className="mt-2.5 text-[13px] font-semibold text-[#6B7280]">Sleep well!</p>
        </div>

        {/* Unified spine column per overlap cluster */}
        {overlapClusters.map(cluster => {
          const first = cluster[0];
          const firstPos = positions.get(first.id)!;
          const totalH = cluster.reduce((sum, t) => sum + positions.get(t.id)!.bubbleH, 0);
          const firstVisual = getBlockVisualStyle(first);
          const clusterHasSelection = cluster.some(t => t.id === selectedBlockId);
          const bubbleX = bubbleLeft(spineCenterX);

          return (
            <div
              key={clusterKey(cluster)}
              className={`absolute overflow-hidden ${GLASS_BUBBLE} ${
                clusterHasSelection ? 'ring-2 ring-violet-300/70 ring-offset-2 ring-offset-white/80' : ''
              }`}
              style={{
                left: bubbleX,
                top: firstPos.topPx,
                width: BUBBLE_WIDTH,
                height: totalH,
                borderRadius: PILL_RADIUS,
                border: `1px solid ${firstVisual.borderColor}`,
                zIndex: 10,
              }}
            >
              {cluster.map((task, j) => {
                const pos = positions.get(task.id)!;
                const visual = getBlockVisualStyle(task);
                const fill = fillRatioForTask(task, nowMinutes, dayKey, todayKey);
                const Icon = taskIcon(task);
                const isActive = selectedBlockId === task.id;
                const segTop = segmentOffsetInCluster(cluster, task.id, positions);

                return (
                  <button
                    key={task.id}
                    type="button"
                    data-block-id={task.id}
                    onClick={e => onBlockClick?.(task, e.currentTarget)}
                    disabled={task.source === 'recurring'}
                    className={`absolute inset-x-0 overflow-hidden transition-all duration-200 ${
                      task.source === 'recurring' ? 'cursor-default' : 'cursor-pointer hover:brightness-[1.03]'
                    } ${isActive ? 'brightness-[1.04]' : ''}`}
                    style={{
                      top: segTop,
                      height: pos.bubbleH,
                      backgroundColor: visual.backgroundColor,
                      border: 'none',
                      borderRadius: 0,
                    }}
                  >
                    {j > 0 && (
                      <div
                        className="pointer-events-none absolute inset-x-3 top-0 h-px"
                        style={{backgroundColor: 'rgba(255,255,255,0.55)'}}
                      />
                    )}
                    {fill > 0 && (
                      <div
                        className="absolute inset-x-0 top-0 transition-[height] duration-500"
                        style={{
                          height: `${fill * 100}%`,
                          background:
                            fill >= 1
                              ? toRgba(visual.accentColor, 0.42)
                              : `linear-gradient(to bottom, ${toRgba(visual.accentColor, 0.58)}, rgba(167,139,250,0.45), rgba(56,189,248,0.35))`,
                        }}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon size={22} strokeWidth={1.65} style={{color: visual.textColor}} />
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Overlap labels in content column */}
        {overlapJunctions.map(junction => (
          <p
            key={junction.id}
            className="pointer-events-none absolute z-[9] text-[12px] leading-none text-[#9CA3AF]"
            style={{left: contentLeft, top: junction.topPx - 8}}
          >
            Tasks are <span className="font-semibold text-rose-500">overlapping</span>
          </p>
        ))}

        {/* Tasks — content rows + solo pills */}
        {sorted.map(item => {
          const pos = positions.get(item.id)!;
          const duration = item.endTime - item.startTime;
          const fill = fillRatioForTask(item, nowMinutes, dayKey, todayKey);
          const visual = getBlockVisualStyle(item);
          const Icon = taskIcon(item);
          const isPast = fill >= 1;
          const isActive = selectedBlockId === item.id;
          const bubbleX = bubbleLeft(spineCenterX);

          return (
            <div
              key={item.id}
              className="absolute left-0 right-0"
              style={{
                top: pos.topPx,
                height: pos.bubbleH,
                zIndex: 8 + pos.clusterIndex,
              }}
            >
              {/* Solo pill only — clusters use unified spine above */}
              {!pos.inCluster && (
                <button
                  type="button"
                  data-block-id={item.id}
                  onClick={e => onBlockClick?.(item, e.currentTarget)}
                  disabled={item.source === 'recurring'}
                  className={`absolute overflow-hidden transition-all duration-200 ${GLASS_BUBBLE} ${
                    isActive ? 'ring-2 ring-violet-300/80 ring-offset-2 ring-offset-white/80' : ''
                  } ${item.source === 'recurring' ? 'cursor-default' : 'cursor-pointer hover:shadow-[0_8px_28px_-10px_rgba(139,92,246,0.22)]'}`}
                  style={{
                    left: bubbleX,
                    top: 0,
                    width: BUBBLE_WIDTH,
                    height: pos.bubbleH,
                    borderRadius: PILL_RADIUS,
                    border: `1px solid ${isPast ? visual.accentColor : visual.borderColor}`,
                    backgroundColor: visual.backgroundColor,
                    zIndex: 10,
                  }}
                >
                  {fill > 0 && (
                    <div
                      className="absolute inset-x-0 top-0 transition-[height] duration-500"
                      style={{
                        height: `${fill * 100}%`,
                        background:
                          fill >= 1
                            ? toRgba(visual.accentColor, 0.42)
                            : `linear-gradient(to bottom, ${toRgba(visual.accentColor, 0.58)}, rgba(167,139,250,0.45), rgba(56,189,248,0.35))`,
                      }}
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon size={22} strokeWidth={1.65} style={{color: visual.textColor}} />
                  </div>
                </button>
              )}

              <div
                className="absolute flex items-start gap-4"
                style={{
                  left: contentLeft,
                  right: STATUS_COL_W,
                  top: pos.overlapAbove ? 12 : 4,
                  height: pos.bubbleH - (pos.overlapAbove ? 12 : 4),
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] tabular-nums leading-relaxed text-[#9CA3AF]">
                    {formatClock(item.startTime)} — {formatClock(item.endTime)}{' '}
                    <span className="text-[#C5CDD8]">({formatDurationLong(duration)})</span>
                  </p>
                  <p
                    className="mt-1 text-[17px] font-bold leading-snug tracking-tight text-[#111827]"
                    style={{color: visual.textColor === '#312E81' ? '#111827' : visual.textColor}}
                  >
                    {item.title}
                  </p>
                </div>
                <Circle
                  size={24}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0"
                  style={{
                    color: isPast ? visual.accentColor : '#E5E7EB',
                    fill: isPast ? toRgba(visual.accentColor, 0.14) : 'transparent',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Free-time gaps */}
        {segments.map((segment, idx) => {
          const gapMinutes = segment.end - segment.start;
          if (gapMinutes < 10) return null;
          const top = topForMinute(segment.start) + 10;
          const height = Math.max(64, (segment.end - segment.start) * PX_PER_MINUTE - 20);
          const midpoint = Math.round((segment.start + segment.end) / 2 / 15) * 15;
          const isPause = gapMinutes <= 50;
          return (
            <div
              key={`gap-${segment.start}-${idx}`}
              className="absolute z-[5] flex flex-col justify-center"
              style={{left: contentLeft, right: STATUS_COL_W, top, height, minHeight: 64}}
            >
              <div className="flex items-center gap-2 text-[12px] leading-relaxed text-[#9CA3AF]">
                <Clock3 size={14} className="shrink-0 text-[#D1D5DB]" />
                <span>
                  {isPause ? (
                    <>
                      Use <span className="font-semibold text-[#6B7280]">{formatGapLabel(gapMinutes)}</span>{' '}
                      for a pause
                    </>
                  ) : (
                    <>
                      Gear up, <span className="font-semibold text-[#6B7280]">{formatGapLabel(gapMinutes)}</span>{' '}
                      until next task
                    </>
                  )}
                </span>
              </div>
              {onSlotCreate && gapMinutes >= 18 && (
                <button
                  type="button"
                  onClick={() => onSlotCreate(dayKey, midpoint, 60, 'New session')}
                  className={`mt-3 ${QUICK_ADD_BTN}`}
                >
                  <span className={QUICK_ADD_PLUS}>
                    <Plus size={12} strokeWidth={2.5} />
                  </span>
                  Add task
                </button>
              )}
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div
            className="absolute inset-x-4 flex flex-col items-center justify-center px-4 text-center"
            style={{top: spineTop + timelineHeight * 0.28}}
          >
            <p className="text-[15px] font-medium text-[#6B7280]">Nothing scheduled</p>
            <p className="mt-1.5 text-[13px] text-[#9CA3AF]">
              {date.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
            </p>
            {onSlotCreate && (
              <button
                type="button"
                onClick={() => onSlotCreate(dayKey, 9 * 60, 60, 'New session')}
                className={`mt-5 ${QUICK_ADD_BTN}`}
              >
                <Plus size={14} />
                Add task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
