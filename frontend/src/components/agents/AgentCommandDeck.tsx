import AgentCard from './AgentCard';
import type { CEODecision, CrisisReport } from '../../types/types';

interface AgentCommandDeckProps {
  visionaryDecision: CEODecision | null;
  conservativeDecision: CEODecision | null;
  visionaryCrisis: CrisisReport | null;
  conservativeCrisis: CrisisReport | null;
  liveRunning: boolean;
}

function pct(value: number | undefined): string {
  if (value === undefined) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function num(value: number | undefined): string {
  if (value === undefined) return 'n/a';
  return value.toFixed(3);
}

export default function AgentCommandDeck({
  visionaryDecision,
  conservativeDecision,
  visionaryCrisis,
  conservativeCrisis,
  liveRunning
}: AgentCommandDeckProps) {
  const crisis = visionaryCrisis ?? conservativeCrisis;
  const decision = visionaryDecision ?? conservativeDecision;
  const support = decision?.support_signals;

  return (
    <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textSub">AI Agent Command Deck</h3>
        <span className="rounded-md border border-border bg-panel2 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-textSub">
          {liveRunning ? 'Live Quarter Stream Active' : 'Awaiting Quarter Trigger'}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AgentCard
          name="Crisis Monitoring Agent"
          role="Macro shock synthesis"
          accent="amber"
          signal={crisis?.severity_index}
          activity={
            crisis
              ? `Synthesizing business disruption: ${crisis.disruption_event}. Severity ${num(crisis.severity_index)}.`
              : 'Idle. Waiting for a quarterly cycle to map disruption vectors.'
          }
          primaryMetrics={[
            { label: 'Supply Chain', value: pct(crisis?.supply_chain_disruption) },
            { label: 'Demand Shock', value: pct(crisis?.demand_drop_intensity) },
            { label: 'Competitor', value: pct(crisis?.competitor_price_pressure) },
            { label: 'Recession', value: pct(crisis?.recession_pressure) }
          ]}
        />

        <AgentCard
          name="CEO Archetype Agent"
          role="Strategic decision"
          accent="blue"
          signal={decision?.strategy_index}
          activity={
            decision
              ? `Selecting ${decision.strategy} from growth/stability differential with bounded stochastic variance.`
              : 'Idle. Waiting for disruption context and company state to produce a strategic action.'
          }
          primaryMetrics={[
            { label: 'Strategy', value: decision?.strategy ?? 'n/a' },
            { label: 'Risk Level', value: num(decision?.risk_level) },
            { label: 'Growth', value: num(decision?.growth_score) },
            { label: 'Stability', value: num(decision?.stability_score) }
          ]}
        />

        <AgentCard
          name="Market Intelligence Agent"
          role="Momentum and volatility"
          accent="cyan"
          signal={support?.market_sentiment.adjustment}
          activity={
            support
              ? 'Quantifying directional sentiment and volatility drag to shape executive aggression.'
              : 'Idle. Awaiting crisis profile and balance-sheet context.'
          }
          primaryMetrics={[
            { label: 'Sentiment', value: num(support?.market_sentiment.sentiment_score) },
            { label: 'Momentum', value: pct(support?.market_sentiment.momentum_signal) },
            { label: 'Volatility', value: pct(support?.market_sentiment.volatility_pressure) },
            { label: 'Adjustment', value: num(support?.market_sentiment.adjustment) }
          ]}
        />

        <AgentCard
          name="Innovation Strategy Agent"
          role="Transformation and execution"
          accent="emerald"
          signal={support?.operations.adjustment}
          activity={
            support
              ? 'Analyzing innovation-pressure tradeoffs to rebalance transformation speed versus operating risk.'
              : 'Idle. Awaiting innovation and execution telemetry.'
          }
          primaryMetrics={[
            { label: 'Efficiency', value: pct(support?.operations.efficiency_score) },
            { label: 'OPEX Pressure', value: pct(support?.operations.opex_pressure) },
            { label: 'Exec Risk', value: pct(support?.operations.execution_risk) },
            { label: 'Adjustment', value: num(support?.operations.adjustment) }
          ]}
        />

        <AgentCard
          name="Finance & Treasury Agent"
          role="Runway and refinance"
          accent="slate"
          signal={support?.treasury.adjustment}
          activity={
            support
              ? `Protecting runway under stress with liquidity-first correction pressure. Dominant driver: ${support.dominant_driver}.`
              : 'Idle. Awaiting liquidity data to estimate treasury fragility.'
          }
          primaryMetrics={[
            { label: 'Liquidity Health', value: pct(support?.treasury.liquidity_health) },
            { label: 'Runway Pressure', value: pct(support?.treasury.runway_pressure) },
            { label: 'Refinance Risk', value: pct(support?.treasury.refinancing_risk) },
            { label: 'Aggregate Adj', value: num(support?.aggregate_adjustment) }
          ]}
        />
      </div>
    </section>
  );
}
