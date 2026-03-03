"""Executive decision engine combining deterministic and probabilistic logic."""

import logging

import numpy as np

from app.core.config import CONFIG
from app.intelligence.schemas import CEODecision, CEOProfile, CrisisReport, Explainability, FinancialState
from app.intelligence.utils import clamp


logger = logging.getLogger(__name__)


class ExecutiveDecisionEngine:
    """Calculates strategy using weighted decision mathematics + bounded noise."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = np.random.default_rng(seed)

    def evaluate(
        self,
        profile: CEOProfile,
        crisis: CrisisReport,
        financial_state: FinancialState,
    ) -> tuple[str, float, float, float]:
        """Compute strategy choice and key quantitative scores."""

        growth_score = (
            profile.risk_tolerance * (1.0 - crisis.liquidity_risk)
            + profile.innovation_bias * crisis.consumer_confidence
        )

        stability_score = (
            profile.liquidity_priority * crisis.liquidity_risk
            + profile.cost_sensitivity * crisis.demand_drop
        )

        base_index = growth_score - stability_score
        noise = float(self._rng.uniform(-CONFIG.strategy.noise_bound, CONFIG.strategy.noise_bound))

        leverage_factor = clamp((financial_state.cash / max(financial_state.revenue, 1.0)) * 1.2)
        strategy_index = base_index + noise + (profile.long_term_focus - 0.5) * 0.1 * leverage_factor

        if strategy_index > CONFIG.strategy.aggressive_threshold:
            strategy = "Aggressive Expansion"
        elif strategy_index < CONFIG.strategy.defensive_threshold:
            strategy = "Defensive Cost Control"
        else:
            strategy = "Balanced Adjustment"

        risk_level = clamp(abs(strategy_index) * 0.8 + crisis.severity_index * 0.2)

        logger.info(
            "Decision computed for %s: growth=%.4f stability=%.4f index=%.4f strategy=%s",
            profile.name,
            growth_score,
            stability_score,
            strategy_index,
            strategy,
        )

        return strategy, float(risk_level), float(growth_score), float(stability_score), float(strategy_index)

    @staticmethod
    def explain(
        profile: CEOProfile,
        crisis: CrisisReport,
        growth_score: float,
        stability_score: float,
    ) -> Explainability:
        """Produce structured explainability fields based on dominant contributors."""

        factors: list[tuple[str, float]] = [
            ("risk_tolerance_x_inverse_liquidity_risk", profile.risk_tolerance * (1.0 - crisis.liquidity_risk)),
            ("innovation_bias_x_consumer_confidence", profile.innovation_bias * crisis.consumer_confidence),
            ("liquidity_priority_x_liquidity_risk", profile.liquidity_priority * crisis.liquidity_risk),
            ("cost_sensitivity_x_demand_drop", profile.cost_sensitivity * crisis.demand_drop),
            ("growth_minus_stability", growth_score - stability_score),
        ]
        dominant = [name for name, _ in sorted(factors, key=lambda item: item[1], reverse=True)[:3]]
        return Explainability(dominant_factors=dominant, severity_context=crisis.severity_index)

    def build_decision(
        self,
        profile: CEOProfile,
        crisis: CrisisReport,
        financial_state: FinancialState,
        updated_traits: CEOProfile,
    ) -> CEODecision:
        """Create final structured CEO decision payload."""

        strategy, risk_level, growth_score, stability_score, strategy_index = self.evaluate(profile, crisis, financial_state)
        explainability = self.explain(profile, crisis, growth_score, stability_score)
        return CEODecision(
            strategy=strategy,
            risk_level=round(risk_level, 4),
            growth_score=round(growth_score, 4),
            stability_score=round(stability_score, 4),
            strategy_index=round(strategy_index, 4),
            updated_traits=updated_traits,
            explainability=explainability,
        )
