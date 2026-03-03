"""Orchestration layer connecting agents, decision engine, memory, and timeline persistence."""

import logging
from uuid import uuid4

import numpy as np

from app.core.config import CONFIG
from app.intelligence.ceo_agent import CEOAgent
from app.intelligence.crisis_agent import CrisisIntelligenceAgent
from app.intelligence.decision_engine import ExecutiveDecisionEngine
from app.intelligence.memory_engine import ExecutiveMemoryEngine
from app.intelligence.schemas import (
    CEODecision,
    CEOProfile,
    FinancialState,
    QuarterTimelinePoint,
    SimulationResponse,
    TimelineSimulationResponse,
)
from app.intelligence.timeline_store import TimelineStore
from app.intelligence.utils import clamp


logger = logging.getLogger(__name__)


class AxisXIntelligenceOrchestrator:
    """Runs single-step and multi-quarter executive reasoning cycles."""

    def __init__(self, memory_engine: ExecutiveMemoryEngine, timeline_store: TimelineStore) -> None:
        self._memory_engine = memory_engine
        self._timeline_store = timeline_store

    @staticmethod
    def get_profile(archetype: str) -> CEOProfile:
        """Return a mutable profile copy for the requested archetype."""

        return CEOAgent.get_profile(archetype)

    @staticmethod
    def _project_financial_state(
        current: FinancialState,
        strategy: str,
        strategy_index: float,
        crisis_severity: float,
    ) -> FinancialState:
        """Project next-quarter financial state from strategy and crisis pressure."""

        strategy_multiplier = {
            "Aggressive Expansion": 1.06,
            "Balanced Adjustment": 1.01,
            "Defensive Cost Control": 0.96,
        }[strategy]

        efficiency_multiplier = {
            "Aggressive Expansion": 1.05,
            "Balanced Adjustment": 0.99,
            "Defensive Cost Control": 0.92,
        }[strategy]

        revenue = current.revenue * strategy_multiplier * (1 - crisis_severity * 0.22)
        burn_rate = current.burn_rate * efficiency_multiplier * (1 + crisis_severity * 0.15)
        cash = max(0.0, current.cash + revenue * 0.08 - burn_rate * 0.22)

        monthly_burn = max(1.0, burn_rate / 3)
        liquidity_months = cash / monthly_burn

        # Strategy index lightly amplifies directional drift.
        revenue *= 1 + clamp(strategy_index, -0.3, 0.3) * 0.08
        burn_rate *= 1 + clamp(-strategy_index, -0.25, 0.25) * 0.04

        return FinancialState(
            revenue=round(max(1.0, revenue), 2),
            burn_rate=round(max(0.0, burn_rate), 2),
            cash=round(max(0.0, cash), 2),
            liquidity_months=round(max(0.0, liquidity_months), 2),
        )

    @staticmethod
    def _infer_outcome(previous: FinancialState, current: FinancialState, strategy_index: float, severity: float) -> tuple[bool, float]:
        """Infer outcome signal for adaptive trait updates."""

        liquidity_delta = current.liquidity_months - previous.liquidity_months
        cash_delta = (current.cash - previous.cash) / max(previous.cash, 1.0)
        score = cash_delta * 0.55 + (liquidity_delta * 0.03) + (strategy_index * 0.25) - (severity * 0.20)
        return score > -0.02, round(liquidity_delta, 4)

    @staticmethod
    def _compute_resilience(timeline: list[QuarterTimelinePoint]) -> float:
        """Compute final resilience score from quarter trajectory."""

        if not timeline:
            return 0.0

        liquidity_component = 0.0
        risk_component = 0.0
        severity_component = 0.0

        for point in timeline:
            liquidity_component += clamp(point.financial_state.liquidity_months / 24)
            risk_component += 1.0 - clamp(point.decision.risk_level)
            severity_component += 1.0 - clamp(point.crisis.severity_index)

        n = float(len(timeline))
        resilience = (liquidity_component / n) * 0.45 + (risk_component / n) * 0.25 + (severity_component / n) * 0.30
        return round(clamp(resilience), 4)

    def simulate(
        self,
        archetype: str,
        financial_state: FinancialState,
        seed: int | None = None,
        outcome_success: bool = False,
        liquidity_delta: float = 0.0,
    ) -> SimulationResponse:
        """Execute one quarter simulation cycle."""

        crisis_agent = CrisisIntelligenceAgent(seed=seed)
        decision_engine = ExecutiveDecisionEngine(seed=seed)

        profile = CEOAgent.get_profile(archetype)
        crisis = crisis_agent.generate_crisis_report()

        strategy, risk_level, growth_score, stability_score, strategy_index = decision_engine.evaluate(
            profile=profile,
            crisis=crisis,
            financial_state=financial_state,
        )

        updated_profile = self._memory_engine.adapt_profile(
            profile=profile,
            strategy=strategy,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )

        decision = CEODecision(
            strategy=strategy,
            risk_level=round(risk_level, 4),
            growth_score=round(growth_score, 4),
            stability_score=round(stability_score, 4),
            strategy_index=round(strategy_index, 4),
            updated_traits=updated_profile,
            explainability=decision_engine.explain(
                profile=profile,
                crisis=crisis,
                growth_score=growth_score,
                stability_score=stability_score,
            ),
        )

        self._memory_engine.store(
            profile_name=profile.name,
            strategy=strategy,
            pre_traits=profile,
            post_traits=updated_profile,
            strategy_index=strategy_index,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )

        payload = SimulationResponse(crisis_report=crisis, ceo_decision=decision)
        logger.info("Single-quarter simulation completed for %s", archetype)
        return payload

    def simulate_timeline(
        self,
        archetype: str,
        financial_state: FinancialState,
        quarters: int = CONFIG.default_quarters,
        seed: int | None = None,
    ) -> TimelineSimulationResponse:
        """Execute multi-quarter simulation with per-quarter persistence."""

        if quarters < 1 or quarters > CONFIG.max_quarters:
            raise ValueError(f"quarters must be between 1 and {CONFIG.max_quarters}")

        rng = np.random.default_rng(seed)
        current_financial = financial_state.model_copy(deep=True)
        current_profile = CEOAgent.get_profile(archetype)
        timeline: list[QuarterTimelinePoint] = []
        simulation_id = str(uuid4())

        for quarter in range(1, quarters + 1):
            step_seed = int(rng.integers(0, 2_147_483_647))
            crisis_agent = CrisisIntelligenceAgent(seed=step_seed)
            decision_engine = ExecutiveDecisionEngine(seed=step_seed)

            crisis = crisis_agent.generate_crisis_report()
            strategy, risk_level, growth_score, stability_score, strategy_index = decision_engine.evaluate(
                profile=current_profile,
                crisis=crisis,
                financial_state=current_financial,
            )

            next_financial = self._project_financial_state(
                current=current_financial,
                strategy=strategy,
                strategy_index=strategy_index,
                crisis_severity=crisis.severity_index,
            )

            outcome_success, liquidity_delta = self._infer_outcome(
                previous=current_financial,
                current=next_financial,
                strategy_index=strategy_index,
                severity=crisis.severity_index,
            )

            updated_profile = self._memory_engine.adapt_profile(
                profile=current_profile,
                strategy=strategy,
                outcome_success=outcome_success,
                liquidity_delta=liquidity_delta,
            )

            decision = CEODecision(
                strategy=strategy,
                risk_level=round(risk_level, 4),
                growth_score=round(growth_score, 4),
                stability_score=round(stability_score, 4),
                strategy_index=round(strategy_index, 4),
                updated_traits=updated_profile,
                explainability=decision_engine.explain(
                    profile=current_profile,
                    crisis=crisis,
                    growth_score=growth_score,
                    stability_score=stability_score,
                ),
            )

            self._memory_engine.store(
                profile_name=current_profile.name,
                strategy=strategy,
                pre_traits=current_profile,
                post_traits=updated_profile,
                strategy_index=strategy_index,
                outcome_success=outcome_success,
                liquidity_delta=liquidity_delta,
            )

            self._timeline_store.save_quarter(
                simulation_id=simulation_id,
                quarter=quarter,
                archetype=archetype,
                crisis=crisis,
                decision=decision,
                financial_state=next_financial,
            )

            timeline.append(
                QuarterTimelinePoint(
                    quarter=quarter,
                    crisis=crisis,
                    decision=decision,
                    financial_state=next_financial,
                )
            )

            current_profile = updated_profile
            current_financial = next_financial

        resilience = self._compute_resilience(timeline)
        logger.info("Timeline simulation completed for %s, quarters=%d, resilience=%.4f", archetype, quarters, resilience)
        return TimelineSimulationResponse(quarters=timeline, final_resilience_score=resilience)

    def simulate_live_step(
        self,
        archetype: str,
        simulation_id: str,
        quarter: int,
        profile: CEOProfile,
        financial_state: FinancialState,
        seed: int | None = None,
    ) -> tuple[QuarterTimelinePoint, CEOProfile, FinancialState, list[str]]:
        """Execute one live quarter step with explicit agent logs."""

        crisis_agent = CrisisIntelligenceAgent(seed=seed)
        decision_engine = ExecutiveDecisionEngine(seed=seed)

        agent_logs: list[str] = [
            f"[Crisis Intelligence Agent] Q{quarter}: scanning synthetic market regime for {archetype}.",
        ]

        crisis = crisis_agent.generate_crisis_report()
        agent_logs.append(
            "[Crisis Intelligence Agent] "
            f"demand_drop={crisis.demand_drop:.3f}, interest_spike={crisis.interest_rate_spike:.3f}, "
            f"liquidity_risk={crisis.liquidity_risk:.3f}, confidence={crisis.consumer_confidence:.3f}."
        )

        agent_logs.append(
            f"[CEO Archetype Agent] Q{quarter}: evaluating strategy with profile={profile.name} and adaptive memory."
        )

        strategy, risk_level, growth_score, stability_score, strategy_index = decision_engine.evaluate(
            profile=profile,
            crisis=crisis,
            financial_state=financial_state,
        )

        next_financial = self._project_financial_state(
            current=financial_state,
            strategy=strategy,
            strategy_index=strategy_index,
            crisis_severity=crisis.severity_index,
        )

        outcome_success, liquidity_delta = self._infer_outcome(
            previous=financial_state,
            current=next_financial,
            strategy_index=strategy_index,
            severity=crisis.severity_index,
        )

        updated_profile = self._memory_engine.adapt_profile(
            profile=profile,
            strategy=strategy,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )

        decision = CEODecision(
            strategy=strategy,
            risk_level=round(risk_level, 4),
            growth_score=round(growth_score, 4),
            stability_score=round(stability_score, 4),
            strategy_index=round(strategy_index, 4),
            updated_traits=updated_profile,
            explainability=decision_engine.explain(
                profile=profile,
                crisis=crisis,
                growth_score=growth_score,
                stability_score=stability_score,
            ),
        )

        self._memory_engine.store(
            profile_name=profile.name,
            strategy=strategy,
            pre_traits=profile,
            post_traits=updated_profile,
            strategy_index=strategy_index,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )

        self._timeline_store.save_quarter(
            simulation_id=simulation_id,
            quarter=quarter,
            archetype=archetype,
            crisis=crisis,
            decision=decision,
            financial_state=next_financial,
        )

        agent_logs.append(
            "[CEO Archetype Agent] "
            f"strategy={strategy}, index={strategy_index:.4f}, growth={growth_score:.4f}, stability={stability_score:.4f}."
        )
        agent_logs.append(
            "[Executive Memory Engine] "
            f"outcome_success={outcome_success}, liquidity_delta={liquidity_delta:.4f}, "
            f"risk_tolerance={updated_profile.risk_tolerance:.3f}, liquidity_priority={updated_profile.liquidity_priority:.3f}."
        )

        for message in agent_logs:
            logger.info(message)

        point = QuarterTimelinePoint(
            quarter=quarter,
            crisis=crisis,
            decision=decision,
            financial_state=next_financial,
        )
        return point, updated_profile, next_financial, agent_logs
