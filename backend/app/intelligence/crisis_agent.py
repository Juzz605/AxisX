"""Crisis Intelligence Agent using stochastic economic modeling."""

import logging

import numpy as np

from app.core.config import CONFIG
from app.intelligence.schemas import CrisisReport
from app.intelligence.utils import clamp


logger = logging.getLogger(__name__)


class CrisisIntelligenceAgent:
    """Generates probabilistic crisis reports with bounded metrics."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = np.random.default_rng(seed)

    def _sample_from_range(self, value_range: tuple[float, float]) -> float:
        low, high = value_range
        sampled = self._rng.beta(2.0, 2.0)
        return float(low + sampled * (high - low))

    def _severity_index(
        self,
        demand_drop: float,
        interest_rate_spike: float,
        liquidity_risk: float,
        consumer_confidence: float,
    ) -> float:
        weights = CONFIG.severity
        severity = (
            weights.demand_weight * (demand_drop / 0.5)
            + weights.interest_weight * (interest_rate_spike / 0.2)
            + weights.liquidity_weight * liquidity_risk
            + weights.confidence_inverse_weight * (1.0 - consumer_confidence)
        )
        return round(clamp(severity), 4)

    def generate_crisis_report(self) -> CrisisReport:
        """Generate a weighted stochastic crisis scenario and derived severity."""

        scenario_idx = int(self._rng.choice([0, 1, 2], p=CONFIG.crisis.scenario_weights))

        demand_drop = self._sample_from_range(CONFIG.crisis.demand_drop_ranges[scenario_idx])
        interest_rate_spike = self._sample_from_range(CONFIG.crisis.interest_spike_ranges[scenario_idx])
        liquidity_risk = self._sample_from_range(CONFIG.crisis.liquidity_risk_ranges[scenario_idx])
        consumer_confidence = self._sample_from_range(CONFIG.crisis.confidence_ranges[scenario_idx])

        severity = self._severity_index(
            demand_drop=demand_drop,
            interest_rate_spike=interest_rate_spike,
            liquidity_risk=liquidity_risk,
            consumer_confidence=consumer_confidence,
        )

        report = CrisisReport(
            demand_drop=round(clamp(demand_drop, 0.0, 0.5), 4),
            interest_rate_spike=round(clamp(interest_rate_spike, 0.0, 0.2), 4),
            liquidity_risk=round(clamp(liquidity_risk, 0.0, 1.0), 4),
            consumer_confidence=round(clamp(consumer_confidence, 0.0, 1.0), 4),
            severity_index=severity,
        )
        logger.info("Generated crisis report: %s", report.model_dump())
        return report
