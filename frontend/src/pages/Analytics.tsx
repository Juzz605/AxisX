import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { ResultPoint } from '../types/types';

interface AnalyticsProps {
  points: ResultPoint[];
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-textSub">{title}</h3>
      <div className="h-[280px]">{children}</div>
    </section>
  );
}

export default function Analytics({ points }: AnalyticsProps) {
  const data = points.map((point, idx) => ({
    tick: `T${idx + 1}`,
    liquidity: Number(point.liquidity_months.toFixed(3)),
    burnRate: Number(point.burn_rate.toFixed(3)),
    strategyIndex: Number(point.strategy_index.toFixed(3)),
    riskTolerance: Number(point.traits.risk_tolerance.toFixed(3)),
    liquidityPriority: Number(point.traits.liquidity_priority.toFixed(3)),
    innovationBias: Number(point.traits.innovation_bias.toFixed(3))
  }));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-panel p-6 shadow-glow">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="mt-2 text-sm text-textSub">Trend analytics across liquidity, burn, strategy dynamics, and trait evolution.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Liquidity Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="tick" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937' }} />
              <Legend />
              <Line type="monotone" dataKey="liquidity" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Burn Rate Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="tick" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937' }} />
              <Legend />
              <Line type="monotone" dataKey="burnRate" stroke="#64748B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Strategy Index Evolution">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="tick" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937' }} />
              <Legend />
              <Line type="monotone" dataKey="strategyIndex" stroke="#1D4ED8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trait Evolution">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="tick" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937' }} />
              <Legend />
              <Line type="monotone" dataKey="riskTolerance" stroke="#2563EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="liquidityPriority" stroke="#475569" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="innovationBias" stroke="#0EA5E9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
