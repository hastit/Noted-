import type {DayScheduleGroup, ScheduledBlock} from '../../types/scheduler';
import ScheduleItemRow from './ScheduleItemRow';

type Props = {
  group: DayScheduleGroup;
  onUpdate: (id: string, patch: Partial<ScheduledBlock>) => void;
  onDelete: (id: string) => void;
};

export default function ScheduleDayGroup({group, onUpdate, onDelete}: Props) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-black/70">
        {new Date(`${group.date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
      </h3>
      <div className="space-y-2">
        {group.items.map(item => (
          <ScheduleItemRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
