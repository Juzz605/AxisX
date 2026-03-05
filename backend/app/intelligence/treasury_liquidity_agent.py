"""Finance & treasury advisory agent for cash runway and refinancing pressure."""

from dataclasses import dataclass

from app.core.config import CONFIG
from app.intelligence.schemas import CompanyState, CrisisReport, TreasurySignal
from app.intelligence.utils import clamp


@dataclass
class TreasuryLiquidityAgent:
    """Evaluates treasury health and generates strategic correction signals."""

    def evaluate(self, company_state: CompanyState, crisis: CrisisReport) -> TreasurySignal:
        """Produce bounded treasury signal and strategy adjustment."""

        liquidity_health = clamp(company_state.cash_reserves)
        runway_pressure = clamp((1.0 - company_state.cash_reserves) * 0.72 + crisis.recession_pressure * 0.28)
        refinancing_risk = clamp(crisis.recession_pressure * 0.60 + company_state.production_cost * 0.22 + (1.0 - company_state.cash_reserves) * 0.18)

        adjustment = clamp(
            liquidity_health * 0.10 - runway_pressure * 0.12 - refinancing_risk * 0.05,
            -CONFIG.support_agents.max_strategy_adjustment,
            CONFIG.support_agents.max_strategy_adjustment,
        )

        return TreasurySignal(
            liquidity_health=round(liquidity_health, 4),
            runway_pressure=round(runway_pressure, 4),
            refinancing_risk=round(refinancing_risk, 4),
            adjustment=round(adjustment, 4),
        )
