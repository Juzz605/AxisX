import CEOCard from '../components/CEOCard';
import AgentCommandDeck from '../components/agents/AgentCommandDeck';
import CompanyGrowthDashboard from '../components/company/CompanyGrowthDashboard';
import type {
  CEODecision,
  CEOProductPlan,
  CompanyRevenuePoint,
  CrisisReport,
  CustomerDemandInsight,
  ProductTelemetryRecord,
  ProductPerformance
} from '../types/types';

interface SimulationProps {
  visionaryDecision: CEODecision | null;
  conservativeDecision: CEODecision | null;
  visionaryCrisis: CrisisReport | null;
  conservativeCrisis: CrisisReport | null;
  liveRunning: boolean;
  agentLogs: string[];
  onStartLive: () => Promise<void>;
  onStopLive: () => Promise<void>;
  revenueTimeline: CompanyRevenuePoint[];
  products: ProductPerformance[];
  customerInsight: CustomerDemandInsight;
  visionaryPlan: CEOProductPlan;
  conservativePlan: CEOProductPlan;
  visionaryCapital: number;
  conservativeCapital: number;
  visionaryPnlPercent: number;
  conservativePnlPercent: number;
  visionaryCashReserve: number;
  conservativeCashReserve: number;
  productTelemetry: ProductTelemetryRecord[];
}

export default function Simulation({
  visionaryDecision,
  conservativeDecision,
  visionaryCrisis,
  conservativeCrisis,
  liveRunning,
  agentLogs,
  onStartLive,
  onStopLive,
  revenueTimeline,
  products,
  customerInsight,
  visionaryPlan,
  conservativePlan,
  visionaryCapital,
  conservativeCapital,
  visionaryPnlPercent,
  conservativePnlPercent,
  visionaryCashReserve,
  conservativeCashReserve,
  productTelemetry
}: SimulationProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-panel p-6 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Live Simulation View</h2>
          <div className="flex gap-2">
            <button
              onClick={() => void onStartLive()}
              disabled={liveRunning}
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Start Live Quarters
            </button>
            <button
              onClick={() => void onStopLive()}
              disabled={!liveRunning}
              className="rounded-md border border-border bg-panel2 px-3 py-2 text-sm font-medium text-textMain disabled:opacity-50"
            >
              Stop Live
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-textSub">Parallel CEO response comparison under industrial manufacturing disruption dynamics.</p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-textSub">
          Status: {liveRunning ? 'streaming live company quarters' : 'idle'}
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <CEOCard
          title="Visionary CEO Panel"
          decision={visionaryDecision}
          managedCapital={visionaryCapital}
          pnlPercent={visionaryPnlPercent}
          cashReserve={visionaryCashReserve}
        />
        <CEOCard
          title="Conservative CEO Panel"
          decision={conservativeDecision}
          managedCapital={conservativeCapital}
          pnlPercent={conservativePnlPercent}
          cashReserve={conservativeCashReserve}
        />
      </div>

      <AgentCommandDeck
        visionaryDecision={visionaryDecision}
        conservativeDecision={conservativeDecision}
        visionaryCrisis={visionaryCrisis}
        conservativeCrisis={conservativeCrisis}
        liveRunning={liveRunning}
      />

      <CompanyGrowthDashboard
        revenueTimeline={revenueTimeline}
        products={products}
        insight={customerInsight}
        visionaryPlan={visionaryPlan}
        conservativePlan={conservativePlan}
        cashReservePct={(visionaryCashReserve + conservativeCashReserve) / (12_000_000)}
        telemetry={productTelemetry}
      />

      <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">Agent Log Stream</h3>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-md border border-border bg-panel2 p-3">
          {agentLogs.length === 0 ? <p className="text-sm text-textSub">No agent logs yet.</p> : null}
          {agentLogs.map((entry, idx) => (
            <p key={`${idx}-${entry}`} className="font-mono text-xs text-textMain">
              {entry}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
