import StrategyBadge from './StrategyBadge';
import TraitBar from './TraitBar';
import type { CEODecision } from '../types/types';

interface CEOCardProps {
  title: string;
  decision: CEODecision | null;
}

export default function CEOCard({ title, decision }: CEOCardProps) {
  return (
    <section className="rounded-xl border border-border bg-panel p-5 shadow-glow">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-textMain">{title}</h3>
        {decision ? <StrategyBadge strategy={decision.strategy} /> : null}
      </header>

      {!decision ? (
        <p className="text-sm text-textSub">No simulation data available.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border bg-panel2 p-3">
              <p className="text-xs text-textSub">Strategy Index</p>
              <p className="mt-1 font-semibold">{decision.strategy_index.toFixed(4)}</p>
            </div>
            <div className="rounded-md border border-border bg-panel2 p-3">
              <p className="text-xs text-textSub">Risk Level</p>
              <p className="mt-1 font-semibold">{decision.risk_level.toFixed(4)}</p>
            </div>
            <div className="rounded-md border border-border bg-panel2 p-3">
              <p className="text-xs text-textSub">Growth Score</p>
              <p className="mt-1 font-semibold">{decision.growth_score.toFixed(4)}</p>
            </div>
            <div className="rounded-md border border-border bg-panel2 p-3">
              <p className="text-xs text-textSub">Stability Score</p>
              <p className="mt-1 font-semibold">{decision.stability_score.toFixed(4)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-textSub">Updated Traits</p>
            <TraitBar label="Risk Tolerance" value={decision.updated_traits.risk_tolerance} />
            <TraitBar label="Innovation Bias" value={decision.updated_traits.innovation_bias} />
            <TraitBar label="Liquidity Priority" value={decision.updated_traits.liquidity_priority} />
            <TraitBar label="Cost Sensitivity" value={decision.updated_traits.cost_sensitivity} />
            <TraitBar label="Long Term Focus" value={decision.updated_traits.long_term_focus} />
          </div>

          {decision.support_signals ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-textSub">Support Agent Signals</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border bg-panel2 p-3">
                  <p className="text-xs text-textSub">Market Adj.</p>
                  <p className="mt-1 font-semibold">{decision.support_signals.market_sentiment.adjustment.toFixed(4)}</p>
                </div>
                <div className="rounded-md border border-border bg-panel2 p-3">
                  <p className="text-xs text-textSub">Operations Adj.</p>
                  <p className="mt-1 font-semibold">{decision.support_signals.operations.adjustment.toFixed(4)}</p>
                </div>
                <div className="rounded-md border border-border bg-panel2 p-3">
                  <p className="text-xs text-textSub">Treasury Adj.</p>
                  <p className="mt-1 font-semibold">{decision.support_signals.treasury.adjustment.toFixed(4)}</p>
                </div>
                <div className="rounded-md border border-border bg-panel2 p-3">
                  <p className="text-xs text-textSub">Aggregate Adj.</p>
                  <p className="mt-1 font-semibold">{decision.support_signals.aggregate_adjustment.toFixed(4)}</p>
                </div>
              </div>
              <p className="text-xs uppercase tracking-wide text-textSub">
                Dominant Driver: <span className="text-textMain">{decision.support_signals.dominant_driver}</span>
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
