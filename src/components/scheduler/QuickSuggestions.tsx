type Props = {
  visible: boolean;
  onPick: (text: string) => void;
};

const SUGGESTIONS = [
  'I have a big project deadline next Friday — help me plan the week',
  'Break down a project into daily tasks over the next 2 weeks',
  'I need to finish a report by Wednesday',
  'Help me plan a productive week around my existing commitments',
  'I have 3 deliverables due this week — spread them out',
  'Plan my work sessions for a product launch next Monday',
  'I have meetings, a gym routine, and deep work — help me fit it all in',
  'I need to prepare a presentation by Thursday',
  'Create a balanced plan before an important deadline on Friday',
  'Help me get through a heavy workload this week without burning out',
  'I have a client call to prep for and two tasks due — plan my week',
  'I need focused blocks to finish a design before end of month',
];

const DOUBLED = [...SUGGESTIONS, ...SUGGESTIONS];

export default function QuickSuggestions({visible, onPick}: Props) {
  if (!visible) return null;

  return (
    <div className="mt-6">
      <style>{`
        @keyframes qs-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .qs-track {
          animation: qs-scroll 60s linear infinite;
          will-change: transform;
        }
        .qs-wrap:hover .qs-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .qs-track { animation: none; }
        }
      `}</style>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-[#B8C1D0]">Try an example</p>
      <div
        className="qs-wrap relative overflow-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        }}
      >
        <div className="qs-track flex w-max gap-2.5 py-0.5">
          {DOUBLED.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(suggestion)}
              className="shrink-0 whitespace-nowrap rounded-full border border-black/[0.07] bg-white/60 px-4 py-2 text-left text-[12.5px] font-medium text-[#4B5563] shadow-[0_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all duration-150 hover:border-rose-200/70 hover:bg-white/95 hover:text-[#1F2937] hover:shadow-[0_2px_12px_rgba(244,114,182,0.18)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
