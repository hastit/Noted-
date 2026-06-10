import {useState} from 'react';
import {Plus} from 'lucide-react';

type Props = {
  rowHeight: number;
  onSlotClick?: (hour: number, slotEl: HTMLElement) => void;
};

export default function HourGrid({rowHeight, onSlotClick}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <>
      {Array.from({length: 24}, (_, hour) => (
        <div
          key={hour}
          className="relative border-t border-black/[0.05]"
          style={{height: rowHeight}}
          onMouseEnter={() => onSlotClick && setHovered(hour)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="mt-[30px] border-t border-dashed border-black/[0.03]" />

          {onSlotClick && hovered === hour && (
            <button
              type="button"
              aria-label="Add event"
              className="absolute right-1 top-1 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/[0.06] text-black/25 transition-all hover:bg-indigo-100 hover:text-indigo-500"
              onClick={(e) => {
                e.stopPropagation();
                onSlotClick(hour, e.currentTarget.parentElement as HTMLElement);
              }}
            >
              <Plus size={10} strokeWidth={2.5} />
            </button>
          )}
        </div>
      ))}
    </>
  );
}
