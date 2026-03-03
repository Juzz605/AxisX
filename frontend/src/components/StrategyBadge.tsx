interface StrategyBadgeProps {
  strategy: 'Aggressive Expansion' | 'Balanced Adjustment' | 'Defensive Cost Control';
}

const styleMap: Record<StrategyBadgeProps['strategy'], string> = {
  'Aggressive Expansion': 'bg-danger/15 text-danger border-danger/40',
  'Balanced Adjustment': 'bg-warning/15 text-warning border-warning/40',
  'Defensive Cost Control': 'bg-success/15 text-success border-success/40'
};

export default function StrategyBadge({ strategy }: StrategyBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${styleMap[strategy]}`}>
      {strategy}
    </span>
  );
}
