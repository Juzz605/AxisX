"""Treasury and liquidity advisory agent for runway and refinancing stress."""

from dataclasses import dataclass

from app.core.config import CONFIG
from app.intelligence.schemas import FinancialState, TreasurySignal
from app.intelligence.utils import clamp


@dataclass
class TreasuryLiquidityAgent:
    """Evaluates treasury health and generates strategy pressure adjustments."""

    def evaluate(self, financial_state: FinancialState, liquidity_risk: float) -> TreasurySignal:
        """Produce bounded treasury signal and strategy adjustment."""

        liquidity_health = clamp(financial_state.liquidity_months / 24.0)
        runway_pressure = clamp((1.0 - liquidity_health) * 0.75 + liquidity_risk * 0.55)
        refinancing_risk = clamp(liquidity_risk * 0.70 + (1.0 - liquidity_health) * 0.30)

        adjustment = clamp(
            liquidity_health * 0.08 - runway_pressure * 0.12,
            -CONFIG.support_agents.max_strategy_adjustment,
            CONFIG.support_agents.max_strategy_adjustment,
        )

        return TreasurySignal(
            liquidity_health=round(liquidity_health, 4),
            runway_pressure=round(runway_pressure, 4),
            refinancing_risk=round(refinancing_risk, 4),
            adjustment=round(adjustment, 4),
        )
