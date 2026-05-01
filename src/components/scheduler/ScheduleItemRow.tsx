import type {ScheduledBlock} from '../../types/scheduler';

type Props = {
  item: ScheduledBlock;
  onUpdate: (id: string, patch: Partial<ScheduledBlock>) => void;
  onDelete: (id: string) => void;
};

function toTimeLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function ScheduleItemRow({item, onUpdate, onDelete}: Props) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 md:p-4">
      <div className="flex items-center justify-between gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1 text-sm"
          value={item.title}
          onChange={e => onUpdate(item.id, {title: e.target.value})}
        />
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600"
        >
          Delete
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          Start
          <input
            type="time"
            value={toTimeLabel(item.startTime)}
            onChange={e => {
              const [h, m] = e.target.value.split(':').map(Number);
              const start = h * 60 + m;
              onUpdate(item.id, {startTime: start, endTime: start + item.durationMinutes});
            }}
            className="rounded-lg border border-black/10 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Date
          <input
            type="date"
            value={item.date}
            onChange={e => onUpdate(item.id, {date: e.target.value})}
            className="rounded-lg border border-black/10 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Duration (min)
          <input
            type="number"
            min={15}
            step={5}
            value={item.durationMinutes}
            onChange={e => {
              const duration = Math.max(15, Number(e.target.value) || 15);
              onUpdate(item.id, {durationMinutes: duration, endTime: item.startTime + duration});
            }}
            className="rounded-lg border border-black/10 px-2 py-1"
          />
        </label>
        <div className="flex items-end">
          <span className="rounded-lg bg-black/5 px-2 py-1 text-black/60">
            {toTimeLabel(item.startTime)} - {toTimeLabel(item.endTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
