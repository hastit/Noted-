type Props = {
  visible: boolean;
  onPick: (text: string) => void;
};

const SUGGESTIONS = [
  {emoji: '📚', text: 'I have a math exam next Friday and need to review 5 chapters'},
  {emoji: '✍️', text: 'I need to write a 2000-word essay by Sunday and outline it today'},
  {emoji: '🎯', text: 'I have 3 assignments due this week, plan my study time'},
  {emoji: '🏃', text: 'I want to study for my finals over the next 2 weeks'},
];

export default function QuickSuggestions({visible, onPick}: Props) {
  if (!visible) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-[13px] text-[#6B7280]">Try one of these:</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map(suggestion => (
          <button
            key={suggestion.text}
            type="button"
            onClick={() => onPick(suggestion.text)}
            className="rounded-full border border-white/50 bg-white/65 px-3 py-1.5 text-left text-xs text-[#4B5563] shadow-[0_6px_20px_-12px_rgba(59,130,246,0.35)] backdrop-blur-md transition duration-300 hover:scale-[1.02] hover:border-[#DBEAFE] hover:bg-white/80 hover:shadow-[0_10px_28px_-12px_rgba(99,102,241,0.4)]"
          >
            <span className="mr-1.5">{suggestion.emoji}</span>
            {suggestion.text}
          </button>
        ))}
      </div>
    </div>
  );
}
