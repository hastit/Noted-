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
    <div className="inline-flex rounded-full border border-[#E5E7EB] bg-white p-1">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-100 ${
            value === option.id
              ? 'bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
              : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
