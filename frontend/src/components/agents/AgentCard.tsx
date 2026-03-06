import type { ReactNode } from 'react';

interface AgentCardProps {
  name: string;
  role: string;
  activity: string;
  signal?: number;
  primaryMetrics: Array<{ label: string; value: string }>;
  accent?: 'blue' | 'cyan' | 'emerald' | 'amber' | 'slate';
  children?: ReactNode;
}

const accentStyles: Record<NonNullable<AgentCardProps['accent']>, string> = {
  blue: 'border-blue-500/35 shadow-[0_0_35px_rgba(59,130,246,0.14)]',
  cyan: 'border-cyan-500/35 shadow-[0_0_35px_rgba(6,182,212,0.14)]',
  emerald: 'border-emerald-500/35 shadow-[0_0_35px_rgba(16,185,129,0.14)]',
  amber: 'border-amber-500/35 shadow-[0_0_35px_rgba(245,158,11,0.14)]',
  slate: 'border-slate-500/35 shadow-[0_0_35px_rgba(148,163,184,0.12)]'
};

export default function AgentCard({
  name,
  role,
  activity,
  signal,
  primaryMetrics,
  accent = 'slate',
  children
}: AgentCardProps) {
  const normalizedSignal = signal === undefined ? null : Math.max(-1, Math.min(1, signal));
  const displaySignal = normalizedSignal === null ? 'n/a' : normalizedSignal.toFixed(3);

  return (
    <article className={`min-w-0 overflow-hidden rounded-xl border bg-panel p-4 ${accentStyles[accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-semibold text-textMain">{name}</h4>
          <p className="mt-1 break-words text-[11px] uppercase tracking-[0.12em] text-textSub">{role}</p>
        </div>
        <div className="shrink-0 rounded-md border border-border bg-panel2 px-2 py-1 text-[11px] font-medium text-textSub">
          Signal {displaySignal}
        </div>
      </div>

      <p className="mt-3 break-words text-xs leading-5 text-textMain">{activity}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {primaryMetrics.map((metric) => (
          <div key={metric.label} className="rounded-md border border-border bg-panel2 px-2.5 py-2">
            <p className="break-words text-[10px] uppercase tracking-[0.1em] text-textSub">{metric.label}</p>
            <p className="mt-1 break-words text-xs font-semibold text-textMain">{metric.value}</p>
          </div>
        ))}
      </div>

      {children}
    </article>
  );
}
