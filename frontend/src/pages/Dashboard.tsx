import MetricCard from '../components/MetricCard';
import SimulationControls from '../components/SimulationControls';
import type { Archetype, FinancialState } from '../types/types';

interface DashboardProps {
  selectedArchetype: Archetype;
  financialState: FinancialState;
  loading: boolean;
  onArchetypeChange: (archetype: Archetype) => void;
  onSimulate: () => Promise<void>;
  onReset: () => Promise<void>;
}

export default function Dashboard({
  selectedArchetype,
  financialState,
  loading,
  onArchetypeChange,
  onSimulate,
  onReset
}: DashboardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-panel p-6 shadow-glow">
        <h2 className="text-2xl font-semibold text-textMain">AxisX Executive Intelligence Engine</h2>
        <p className="mt-2 text-sm text-textSub">
          Autonomous multi-archetype command layer for scenario-driven strategic simulation.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-blue-500/25 bg-panel2 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.11em] text-textSub">AI Core</p>
            <p className="mt-1 text-sm font-semibold">5-Agent Cognitive Mesh</p>
          </div>
          <div className="rounded-md border border-cyan-500/25 bg-panel2 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.11em] text-textSub">Persistence</p>
            <p className="mt-1 text-sm font-semibold">MongoDB + adaptive memory</p>
          </div>
          <div className="rounded-md border border-emerald-500/25 bg-panel2 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.11em] text-textSub">Execution</p>
            <p className="mt-1 text-sm font-semibold">FastAPI + Live WebSocket Stream</p>
          </div>
        </div>
      </section>

      <SimulationControls
        selectedArchetype={selectedArchetype}
        onArchetypeChange={onArchetypeChange}
        onSimulate={onSimulate}
        onReset={onReset}
        loading={loading}
      />

      <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">Current Financial State</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Revenue" value={`$${financialState.revenue.toLocaleString()}`} />
          <MetricCard label="Cash" value={`$${financialState.cash.toLocaleString()}`} />
          <MetricCard label="Burn Rate" value={`$${financialState.burn_rate.toLocaleString()}`} />
          <MetricCard label="Liquidity Months" value={financialState.liquidity_months.toFixed(1)} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">Agent Topology</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            'Crisis Intelligence Agent',
            'CEO Archetype Agent',
            'Market Sentiment Agent',
            'Operations Efficiency Agent',
            'Treasury Liquidity Agent'
          ].map((agent) => (
            <div key={agent} className="rounded-md border border-border bg-panel2 px-3 py-2.5">
              <p className="text-xs font-medium text-textMain">{agent}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-textSub">status: ready</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
