type Option<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
};

export default function ViewSwitcher<T extends string>({value, options, onChange}: Props<T>) {
  return (
    <div className="inline-flex rounded-full border border-black/[0.08] bg-white/60 p-1 backdrop-blur-sm">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
            value === option.id
              ? 'bg-white text-[#111827] shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
              : 'text-[#9CA3AF] hover:bg-white/70 hover:text-[#374151]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
