import CEOCard from '../components/CEOCard';
import CompanyGrowthDashboard from '../components/company/CompanyGrowthDashboard';
import type {
  CEODecision,
  CompanyRevenuePoint,
  CrisisReport,
  CustomerDemandInsight,
  ProductTelemetryRecord,
  ProductPerformance
} from '../types/types';

interface SimulationProps {
  ceoDecision: CEODecision | null;
  crisis: CrisisReport | null;
  liveRunning: boolean;
  agentLogs: string[];
  onStartLive: () => Promise<void>;
  onStopLive: () => Promise<void>;
  revenueTimeline: CompanyRevenuePoint[];
  products: ProductPerformance[];
  customerInsight: CustomerDemandInsight;
  ceoCapital: number;
  ceoPnlPercent: number;
  ceoCashReserve: number;
  productTelemetry: ProductTelemetryRecord[];
}

export default function Simulation({
  ceoDecision,
  crisis,
  liveRunning,
  agentLogs,
  onStartLive,
  onStopLive,
  revenueTimeline,
  products,
  customerInsight,
  ceoCapital,
  ceoPnlPercent,
  ceoCashReserve,
  productTelemetry
}: SimulationProps) {
  const support = ceoDecision?.support_signals;

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
        <p className="mt-2 text-sm text-textSub">Single-agent command loop for EV Battery Module output planning.</p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-textSub">
          Status: {liveRunning ? 'streaming live company quarters' : 'idle'}
        </p>
      </section>

      <CEOCard title="CEO Agent Panel" decision={ceoDecision} managedCapital={ceoCapital} pnlPercent={ceoPnlPercent} cashReserve={ceoCashReserve} />

      <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">Agent Actions On EV Battery Module</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-md border border-border bg-panel2 p-3 text-sm">
            <p className="font-semibold text-textMain">Crisis Agent</p>
            <p className="mt-1 text-xs text-textSub">
              {crisis
                ? `Detected ${crisis.disruption_event} at severity ${crisis.severity_index.toFixed(3)}.`
                : 'Awaiting next risk scan.'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-panel2 p-3 text-sm">
            <p className="font-semibold text-textMain">Market Analysis Agent</p>
            <p className="mt-1 text-xs text-textSub">
              {support ? `Demand adjustment ${support.market_sentiment.adjustment.toFixed(4)} for battery-module orders.` : 'Awaiting demand signal.'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-panel2 p-3 text-sm">
            <p className="font-semibold text-textMain">Decision Engine Agent</p>
            <p className="mt-1 text-xs text-textSub">
              {support ? `Operations adjustment ${support.operations.adjustment.toFixed(4)} for factory allocation.` : 'Awaiting execution signal.'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-panel2 p-3 text-sm">
            <p className="font-semibold text-textMain">Reporting Agent</p>
            <p className="mt-1 text-xs text-textSub">
              {support ? `Readiness delta ${support.treasury.adjustment.toFixed(4)} with driver ${support.dominant_driver}.` : 'Awaiting reporting metrics.'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-panel2 p-3 text-sm">
            <p className="font-semibold text-textMain">CEO Agent</p>
            <p className="mt-1 text-xs text-textSub">
              {ceoDecision ? `Selected strategy: ${ceoDecision.strategy.split('_').join(' ')}.` : 'Awaiting integrated agent inputs.'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-success/40 bg-success/15 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-success">Pros</p>
            <p className="mt-1 text-xs text-textMain">Unified decision path simplifies execution and keeps production shifts steady.</p>
          </div>
          <div className="rounded-md border border-warning/40 bg-warning/15 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-warning">Cons</p>
            <p className="mt-1 text-xs text-textMain">Single-agent orchestration has less strategy diversity than dual-archetype comparisons.</p>
          </div>
        </div>
      </section>

      <CompanyGrowthDashboard
        revenueTimeline={revenueTimeline}
        products={products}
        insight={customerInsight}
        cashReservePct={ceoCashReserve / 12_000_000}
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
