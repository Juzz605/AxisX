interface StrategyBadgeProps {
  strategy:
    | 'increase_marketing'
    | 'cut_production'
    | 'invest_in_r_and_d'
    | 'adjust_price'
    | 'hire_or_layoff_staff'
    | 'enter_new_market';
}

const styleMap: Record<StrategyBadgeProps['strategy'], string> = {
  increase_marketing: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  invest_in_r_and_d: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  enter_new_market: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  adjust_price: 'bg-warning/15 text-warning border-warning/40',
  cut_production: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  hire_or_layoff_staff: 'bg-danger/15 text-danger border-danger/40'
};

export default function StrategyBadge({ strategy }: StrategyBadgeProps) {
  const label = strategy.split('_').join(' ');
  return (
    <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${styleMap[strategy]}`}>
      {label}
    </span>
  );
}
