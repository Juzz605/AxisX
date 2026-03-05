"""Operations efficiency advisory agent for execution stress and cost pressure."""

from dataclasses import dataclass

from app.core.config import CONFIG
from app.intelligence.schemas import FinancialState, OperationsSignal
from app.intelligence.utils import clamp


@dataclass
class OperationsEfficiencyAgent:
    """Estimates efficiency posture and operational execution pressure."""

    def evaluate(self, financial_state: FinancialState, demand_drop: float) -> OperationsSignal:
        """Produce bounded operations signal and strategy adjustment."""

        burn_to_revenue = clamp(financial_state.burn_rate / max(financial_state.revenue, 1.0))
        efficiency_score = clamp(1.0 - burn_to_revenue * 2.2)
        opex_pressure = clamp(burn_to_revenue * 1.9 + demand_drop * 0.8)
        execution_risk = clamp((opex_pressure * 0.65) + ((1.0 - efficiency_score) * 0.35))

        adjustment = clamp(
            efficiency_score * 0.09 - opex_pressure * 0.11,
            -CONFIG.support_agents.max_strategy_adjustment,
            CONFIG.support_agents.max_strategy_adjustment,
        )

        return OperationsSignal(
            efficiency_score=round(efficiency_score, 4),
            opex_pressure=round(opex_pressure, 4),
            execution_risk=round(execution_risk, 4),
            adjustment=round(adjustment, 4),
        )
