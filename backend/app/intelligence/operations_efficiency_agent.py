"""Innovation/operations advisory agent for execution and cost pressure."""

from dataclasses import dataclass

from app.core.config import CONFIG
from app.intelligence.schemas import CompanyState, CrisisReport, OperationsSignal
from app.intelligence.utils import clamp


@dataclass
class OperationsEfficiencyAgent:
    """Estimates operations resilience and innovation execution pressure."""

    def evaluate(self, company_state: CompanyState, crisis: CrisisReport) -> OperationsSignal:
        """Produce bounded operations signal and strategy adjustment."""

        efficiency_score = clamp(
            1.0
            - company_state.production_cost * 0.55
            - company_state.supply_chain_risk * 0.30
            - crisis.manufacturing_cost_spike * 0.20,
        )
        opex_pressure = clamp(company_state.production_cost * 0.66 + crisis.manufacturing_cost_spike * 0.34)
        execution_risk = clamp(company_state.supply_chain_risk * 0.58 + crisis.supply_chain_disruption * 0.42)

        adjustment = clamp(
            efficiency_score * 0.11 - (opex_pressure * 0.08 + execution_risk * 0.09),
            -CONFIG.support_agents.max_strategy_adjustment,
            CONFIG.support_agents.max_strategy_adjustment,
        )

        return OperationsSignal(
            efficiency_score=round(efficiency_score, 4),
            opex_pressure=round(opex_pressure, 4),
            execution_risk=round(execution_risk, 4),
            adjustment=round(adjustment, 4),
        )
