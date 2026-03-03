interface TraitBarProps {
  label: string;
  value: number;
}

export default function TraitBar({ label, value }: TraitBarProps) {
  const percentage = Math.round(Math.max(0, Math.min(1, value)) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-textSub">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-800">
        <div
          className="h-2 rounded-full bg-accent transition-all duration-300 ease-executive"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
