"""Orchestration layer for multi-agent product/company strategy simulation."""

import logging
from uuid import uuid4

import numpy as np

from app.core.config import CONFIG
from app.intelligence.ceo_agent import CEOAgent
from app.intelligence.crisis_agent import CrisisIntelligenceAgent
from app.intelligence.decision_engine import ExecutiveDecisionEngine
from app.intelligence.market_sentiment_agent import MarketSentimentAgent
from app.intelligence.memory_engine import ExecutiveMemoryEngine
from app.intelligence.operations_efficiency_agent import OperationsEfficiencyAgent
from app.intelligence.schemas import (
    CEODecision,
    CEOProfile,
    CompanyQuarterMetrics,
    CompanyState,
    QuarterTimelinePoint,
    SimulationResponse,
    SupportAgentSignals,
    TimelineSimulationResponse,
)
from app.intelligence.timeline_store import TimelineStoreProtocol
from app.intelligence.treasury_liquidity_agent import TreasuryLiquidityAgent
from app.intelligence.utils import clamp

logger = logging.getLogger(__name__)


class AxisXIntelligenceOrchestrator:
    """Runs single-step and multi-quarter company strategy cycles."""

    def __init__(self, memory_engine: ExecutiveMemoryEngine, timeline_store: TimelineStoreProtocol) -> None:
        self._memory_engine = memory_engine
        self._timeline_store = timeline_store
        self._market_agent = MarketSentimentAgent()
        self._ops_agent = OperationsEfficiencyAgent()
        self._treasury_agent = TreasuryLiquidityAgent()

    @staticmethod
    def get_profile(archetype: str) -> CEOProfile:
        """Return a mutable profile copy for the requested archetype."""

        return CEOAgent.get_profile(archetype)

    @staticmethod
    def _project_company_state(current: CompanyState, metrics: CompanyQuarterMetrics, crisis_severity: float) -> CompanyState:
        """Project next-quarter company state from outcomes and disruption pressure."""

        next_state = CompanyState(
            product_demand=round(clamp(current.product_demand + metrics.customer_growth * 0.35 - crisis_severity * 0.06), 4),
            production_cost=round(clamp(current.production_cost + crisis_severity * 0.08 - metrics.profit_margin * 0.05), 4),
            supply_chain_risk=round(clamp(current.supply_chain_risk + crisis_severity * 0.11 - metrics.brand_strength * 0.03), 4),
            competitor_pressure=round(clamp(current.competitor_pressure + crisis_severity * 0.07 - metrics.market_share * 0.06), 4),
            marketing_effectiveness=round(clamp(current.marketing_effectiveness + metrics.brand_strength * 0.06 - crisis_severity * 0.03), 4),
            customer_sentiment=round(clamp(current.customer_sentiment + metrics.customer_growth * 0.25 - crisis_severity * 0.05), 4),
            cash_reserves=round(clamp(metrics.company_cash_balance / 12_000_000), 4),
        )
        return next_state

    @staticmethod
    def _infer_outcome(previous: CompanyState, current: CompanyState, strategy_index: float, severity: float) -> tuple[bool, float]:
        """Infer outcome signal for adaptive trait updates."""

        liquidity_delta = current.cash_reserves - previous.cash_reserves
        score = (liquidity_delta * 0.45) + strategy_index * 0.35 - severity * 0.30
        return score > -0.03, round(liquidity_delta, 4)

    @staticmethod
    def _compute_resilience(timeline: list[QuarterTimelinePoint]) -> float:
        """Compute resilience score from liquidity, brand, and disruption trajectory."""

        if not timeline:
            return 0.0

        liquidity_component = 0.0
        risk_component = 0.0
        severity_component = 0.0

        for point in timeline:
            liquidity_component += clamp(point.company_state.cash_reserves)
            risk_component += 1.0 - clamp(point.decision.risk_level)
            severity_component += 1.0 - clamp(point.crisis.severity_index)

        n = float(len(timeline))
        resilience = (liquidity_component / n) * 0.42 + (risk_component / n) * 0.28 + (severity_component / n) * 0.30
        return round(clamp(resilience), 4)

    def _compute_support_signals(self, crisis, company_state: CompanyState) -> SupportAgentSignals:
        """Run support agents and aggregate bounded strategy adjustments."""

        market_signal = self._market_agent.evaluate(crisis=crisis, company_state=company_state)
        operations_signal = self._ops_agent.evaluate(company_state=company_state, crisis=crisis)
        treasury_signal = self._treasury_agent.evaluate(company_state=company_state, crisis=crisis)

        weighted_adjustment = clamp(
            market_signal.adjustment * CONFIG.support_agents.market_signal_weight
            + operations_signal.adjustment * CONFIG.support_agents.operations_signal_weight
            + treasury_signal.adjustment * CONFIG.support_agents.treasury_signal_weight,
            -CONFIG.support_agents.max_strategy_adjustment,
            CONFIG.support_agents.max_strategy_adjustment,
        )

        candidates = {
            "market_intelligence": abs(market_signal.adjustment),
            "innovation_strategy": abs(operations_signal.adjustment),
            "finance_treasury": abs(treasury_signal.adjustment),
        }

        return SupportAgentSignals(
            market_sentiment=market_signal,
            operations=operations_signal,
            treasury=treasury_signal,
            aggregate_adjustment=round(weighted_adjustment, 4),
            dominant_driver=max(candidates, key=candidates.get),
        )

    def _build_decision(
        self,
        decision_engine: ExecutiveDecisionEngine,
        profile: CEOProfile,
        crisis,
        company_state: CompanyState,
    ) -> tuple[CEODecision, float, CompanyQuarterMetrics]:
        strategy, risk_level, growth_score, stability_score, strategy_index = decision_engine.evaluate(
            profile=profile,
            crisis=crisis,
            company_state=company_state,
        )

        support_signals = self._compute_support_signals(crisis=crisis, company_state=company_state)
        strategy_index = clamp(strategy_index + support_signals.aggregate_adjustment, -1.0, 1.0)
        strategy = decision_engine._resolve_strategy(strategy_index)
        risk_level = clamp(abs(strategy_index) * 0.62 + crisis.severity_index * 0.38)

        quarter_metrics = decision_engine.project_quarter_metrics(
            profile=profile,
            company_state=company_state,
            crisis=crisis,
            strategy=strategy,
            strategy_index=strategy_index,
        )

        decision = CEODecision(
            strategy=strategy,
            risk_level=round(risk_level, 4),
            growth_score=round(growth_score, 4),
            stability_score=round(stability_score, 4),
            strategy_index=round(strategy_index, 4),
            quarter_metrics=quarter_metrics,
            updated_traits=profile,
            explainability=decision_engine.explain(
                profile=profile,
                crisis=crisis,
                company_state=company_state,
                growth_score=growth_score,
                stability_score=stability_score,
            ),
            support_signals=support_signals,
        )
        return decision, strategy_index, quarter_metrics

    def simulate(
        self,
        archetype: str,
        company_state: CompanyState,
        seed: int | None = None,
        outcome_success: bool = False,
        liquidity_delta: float = 0.0,
    ) -> SimulationResponse:
        """Execute one quarter company simulation cycle."""

        crisis_agent = CrisisIntelligenceAgent(seed=seed)
        decision_engine = ExecutiveDecisionEngine(seed=seed)

        profile = CEOAgent.get_profile(archetype)
        crisis = crisis_agent.generate_crisis_report()

        decision, strategy_index, _ = self._build_decision(
            decision_engine=decision_engine,
            profile=profile,
            crisis=crisis,
            company_state=company_state,
        )

        updated_profile = self._memory_engine.adapt_profile(
            profile=profile,
            strategy=decision.strategy,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )
        decision.updated_traits = updated_profile

        self._memory_engine.store(
            profile_name=profile.name,
            strategy=decision.strategy,
            pre_traits=profile,
            post_traits=updated_profile,
            strategy_index=strategy_index,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )

        payload = SimulationResponse(crisis_report=crisis, ceo_decision=decision)
        logger.info("Single-quarter company simulation completed for %s", archetype)
        return payload

    def simulate_timeline(
        self,
        archetype: str,
        company_state: CompanyState,
        quarters: int = CONFIG.default_quarters,
        seed: int | None = None,
    ) -> TimelineSimulationResponse:
        """Execute multi-quarter strategy simulation with persistence."""

        if quarters < 1 or quarters > CONFIG.max_quarters:
            raise ValueError(f"quarters must be between 1 and {CONFIG.max_quarters}")

        rng = np.random.default_rng(seed)
        current_state = company_state.model_copy(deep=True)
        current_profile = CEOAgent.get_profile(archetype)
        timeline: list[QuarterTimelinePoint] = []
        market_share_evolution: list[float] = []
        simulation_id = str(uuid4())

        for quarter in range(1, quarters + 1):
            step_seed = int(rng.integers(0, 2_147_483_647))
            crisis_agent = CrisisIntelligenceAgent(seed=step_seed)
            decision_engine = ExecutiveDecisionEngine(seed=step_seed)

            crisis = crisis_agent.generate_crisis_report()
            decision, strategy_index, quarter_metrics = self._build_decision(
                decision_engine=decision_engine,
                profile=current_profile,
                crisis=crisis,
                company_state=current_state,
            )

            next_state = self._project_company_state(
                current=current_state,
                metrics=quarter_metrics,
                crisis_severity=crisis.severity_index,
            )
            outcome_success, liquidity_delta = self._infer_outcome(
                previous=current_state,
                current=next_state,
                strategy_index=strategy_index,
                severity=crisis.severity_index,
            )

            updated_profile = self._memory_engine.adapt_profile(
                profile=current_profile,
                strategy=decision.strategy,
                outcome_success=outcome_success,
                liquidity_delta=liquidity_delta,
            )
            decision.updated_traits = updated_profile

            self._memory_engine.store(
                profile_name=current_profile.name,
                strategy=decision.strategy,
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
                company_state=next_state,
            )

            timeline.append(
                QuarterTimelinePoint(
                    quarter=quarter,
                    crisis=crisis,
                    decision=decision,
                    company_state=next_state,
                )
            )
            market_share_evolution.append(decision.quarter_metrics.market_share)

            current_profile = updated_profile
            current_state = next_state

        resilience = self._compute_resilience(timeline)
        logger.info("Timeline company simulation completed for %s, quarters=%d, resilience=%.4f", archetype, quarters, resilience)
        return TimelineSimulationResponse(
            quarters=timeline,
            market_share_evolution=market_share_evolution,
            final_resilience_score=resilience,
        )

    def simulate_live_step(
        self,
        archetype: str,
        simulation_id: str,
        quarter: int,
        profile: CEOProfile,
        company_state: CompanyState,
        seed: int | None = None,
    ) -> tuple[QuarterTimelinePoint, CEOProfile, CompanyState, list[str]]:
        """Execute one live quarter with explicit AI agent logs."""

        crisis_agent = CrisisIntelligenceAgent(seed=seed)
        decision_engine = ExecutiveDecisionEngine(seed=seed)

        agent_logs: list[str] = [
            f"[Crisis Monitoring Agent] Q{quarter}: scanning product economy risk for {archetype}.",
        ]

        crisis = crisis_agent.generate_crisis_report()
        agent_logs.append(
            "[Crisis Monitoring Agent] "
            f"event={crisis.disruption_event}, severity={crisis.severity_index:.3f}, "
            f"demand_drop={crisis.demand_drop_intensity:.3f}, supply_chain={crisis.supply_chain_disruption:.3f}."
        )

        decision, strategy_index, quarter_metrics = self._build_decision(
            decision_engine=decision_engine,
            profile=profile,
            crisis=crisis,
            company_state=company_state,
        )

        next_state = self._project_company_state(
            current=company_state,
            metrics=quarter_metrics,
            crisis_severity=crisis.severity_index,
        )
        outcome_success, liquidity_delta = self._infer_outcome(
            previous=company_state,
            current=next_state,
            strategy_index=strategy_index,
            severity=crisis.severity_index,
        )

        updated_profile = self._memory_engine.adapt_profile(
            profile=profile,
            strategy=decision.strategy,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )
        decision.updated_traits = updated_profile

        self._memory_engine.store(
            profile_name=profile.name,
            strategy=decision.strategy,
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
            company_state=next_state,
        )

        support = decision.support_signals
        agent_logs.append(
            "[CEO Archetype Agent] "
            f"strategy={decision.strategy}, index={strategy_index:.4f}, revenue={quarter_metrics.revenue:.2f}, market_share={quarter_metrics.market_share:.3f}."
        )
        if support is not None:
            agent_logs.append(
                "[Market Intelligence Agent] "
                f"sentiment={support.market_sentiment.sentiment_score:.3f}, momentum={support.market_sentiment.momentum_signal:.3f}, adj={support.market_sentiment.adjustment:.3f}."
            )
            agent_logs.append(
                "[Innovation Strategy Agent] "
                f"efficiency={support.operations.efficiency_score:.3f}, execution_risk={support.operations.execution_risk:.3f}, adj={support.operations.adjustment:.3f}."
            )
            agent_logs.append(
                "[Finance & Treasury Agent] "
                f"liquidity_health={support.treasury.liquidity_health:.3f}, runway_pressure={support.treasury.runway_pressure:.3f}, adj={support.treasury.adjustment:.3f}."
            )

        agent_logs.append(
            "[Executive Memory Engine] "
            f"outcome_success={outcome_success}, cash_delta={liquidity_delta:.4f}, "
            f"risk_tolerance={updated_profile.risk_tolerance:.3f}, liquidity_priority={updated_profile.liquidity_priority:.3f}."
        )

        for message in agent_logs:
            logger.info(message)

        point = QuarterTimelinePoint(
            quarter=quarter,
            crisis=crisis,
            decision=decision,
            company_state=next_state,
        )
        return point, updated_profile, next_state, agent_logs
