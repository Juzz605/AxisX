"""Executive decision engine for product/company strategy simulation."""

import logging

import numpy as np

from app.core.config import CONFIG
from app.intelligence.schemas import CEOProfile, CompanyQuarterMetrics, CompanyState, CrisisReport, Explainability
from app.intelligence.utils import clamp

logger = logging.getLogger(__name__)


class ExecutiveDecisionEngine:
    """Calculates strategy actions and business outcomes."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = np.random.default_rng(seed)

    @staticmethod
    def _resolve_strategy(strategy_index: float) -> str:
        if strategy_index >= 0.45:
            return "enter_new_market"
        if strategy_index >= 0.25:
            return "invest_in_r_and_d"
        if strategy_index >= 0.05:
            return "increase_marketing"
        if strategy_index <= -0.38:
            return "hire_or_layoff_staff"
        if strategy_index <= -0.12:
            return "cut_production"
        return "adjust_price"

    @staticmethod
    def _action_modifiers(strategy: str) -> dict[str, float]:
        return {
            "enter_new_market": {"revenue": 0.18, "margin": -0.04, "market_share": 0.06, "growth": 0.08, "brand": 0.06},
            "invest_in_r_and_d": {"revenue": 0.10, "margin": -0.02, "market_share": 0.04, "growth": 0.05, "brand": 0.07},
            "increase_marketing": {"revenue": 0.12, "margin": -0.03, "market_share": 0.05, "growth": 0.07, "brand": 0.04},
            "adjust_price": {"revenue": 0.04, "margin": 0.02, "market_share": 0.01, "growth": 0.01, "brand": 0.00},
            "cut_production": {"revenue": -0.08, "margin": 0.05, "market_share": -0.03, "growth": -0.04, "brand": -0.02},
            "hire_or_layoff_staff": {"revenue": -0.05, "margin": 0.03, "market_share": -0.02, "growth": -0.03, "brand": -0.01},
        }[strategy]

    def evaluate(
        self,
        profile: CEOProfile,
        crisis: CrisisReport,
        company_state: CompanyState,
    ) -> tuple[str, float, float, float, float]:
        """Compute strategic action and quantitative decision scores."""

        growth_score = (
            profile.risk_tolerance * company_state.product_demand
            + profile.innovation_bias * company_state.marketing_effectiveness
            + profile.long_term_focus * (1.0 - company_state.competitor_pressure) * 0.75
            + company_state.customer_sentiment * 0.38
        )

        stability_score = (
            profile.liquidity_priority * (1.0 - company_state.cash_reserves)
            + profile.cost_sensitivity * company_state.production_cost
            + company_state.supply_chain_risk * 0.62
            + crisis.severity_index * 0.48
        )

        base_index = growth_score - stability_score
        noise = float(self._rng.uniform(-CONFIG.strategy.noise_bound, CONFIG.strategy.noise_bound))
        strategy_index = base_index + noise

        strategy = self._resolve_strategy(strategy_index)
        risk_level = clamp(abs(strategy_index) * 0.62 + crisis.severity_index * 0.38)

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
        company_state: CompanyState,
        growth_score: float,
        stability_score: float,
    ) -> Explainability:
        """Produce structured explainability fields based on dominant contributors."""

        factors: list[tuple[str, float]] = [
            ("demand_x_risk_tolerance", company_state.product_demand * profile.risk_tolerance),
            ("marketing_x_innovation_bias", company_state.marketing_effectiveness * profile.innovation_bias),
            ("production_cost_x_cost_sensitivity", company_state.production_cost * profile.cost_sensitivity),
            ("cash_stress_x_liquidity_priority", (1.0 - company_state.cash_reserves) * profile.liquidity_priority),
            ("crisis_severity", crisis.severity_index),
            ("growth_minus_stability", growth_score - stability_score),
        ]
        dominant = [name for name, _ in sorted(factors, key=lambda item: item[1], reverse=True)[:4]]
        return Explainability(dominant_factors=dominant, severity_context=crisis.severity_index)

    def project_quarter_metrics(
        self,
        profile: CEOProfile,
        company_state: CompanyState,
        crisis: CrisisReport,
        strategy: str,
        strategy_index: float,
    ) -> CompanyQuarterMetrics:
        """Compute business outcome metrics for the quarter."""

        modifiers = self._action_modifiers(strategy)
        demand_score = company_state.product_demand * (1.0 - crisis.demand_drop_intensity * 0.65)

        revenue_base = 6_500_000 * (
            0.45
            + demand_score * 0.45
            + company_state.marketing_effectiveness * 0.25
            + company_state.customer_sentiment * 0.22
            - company_state.competitor_pressure * 0.18
        )
        revenue = max(100_000.0, revenue_base * (1 + modifiers["revenue"] + strategy_index * 0.08))

        profit_margin = clamp(
            0.24
            - company_state.production_cost * 0.23
            - crisis.manufacturing_cost_spike * 0.08
            - crisis.recession_pressure * 0.06
            + modifiers["margin"]
            + (company_state.marketing_effectiveness - company_state.competitor_pressure) * 0.04,
            0.02,
            0.52,
        )

        market_share = clamp(
            0.12
            + company_state.product_demand * 0.20
            + company_state.marketing_effectiveness * 0.18
            + profile.innovation_bias * 0.10
            - company_state.competitor_pressure * 0.17
            + modifiers["market_share"],
            0.01,
            0.80,
        )

        customer_growth = clamp(
            0.04
            + company_state.customer_sentiment * 0.23
            + company_state.marketing_effectiveness * 0.18
            - crisis.demand_drop_intensity * 0.16
            - company_state.competitor_pressure * 0.12
            + modifiers["growth"],
            -0.45,
            0.55,
        )

        brand_strength = clamp(
            0.35
            + company_state.customer_sentiment * 0.24
            + company_state.marketing_effectiveness * 0.18
            + profile.innovation_bias * 0.14
            - crisis.severity_index * 0.18
            + modifiers["brand"],
            0.05,
            1.0,
        )

        current_cash = company_state.cash_reserves * 12_000_000
        company_cash_balance = max(0.0, current_cash + revenue * profit_margin - revenue * 0.17)

        return CompanyQuarterMetrics(
            revenue=round(revenue, 2),
            profit_margin=round(profit_margin, 4),
            market_share=round(market_share, 4),
            customer_growth=round(customer_growth, 4),
            brand_strength=round(brand_strength, 4),
            company_cash_balance=round(company_cash_balance, 2),
        )
