"""Crisis intelligence agent for business-disruption simulation."""

import logging

import numpy as np

from app.intelligence.schemas import CrisisReport
from app.intelligence.utils import clamp

logger = logging.getLogger(__name__)


class CrisisIntelligenceAgent:
    """Generates stochastic business disruption scenarios and severity."""

    _EVENTS: tuple[str, ...] = (
        "supply_chain_disruption",
        "sudden_demand_drop",
        "competitor_launching_cheaper_product",
        "economic_recession",
        "manufacturing_cost_spike",
    )

    def __init__(self, seed: int | None = None) -> None:
        self._rng = np.random.default_rng(seed)

    def _sample(self, low: float, high: float) -> float:
        sampled = self._rng.beta(2.2, 2.0)
        return float(low + sampled * (high - low))

    def _severity(
        self,
        supply_chain_disruption: float,
        demand_drop_intensity: float,
        competitor_price_pressure: float,
        recession_pressure: float,
        manufacturing_cost_spike: float,
    ) -> float:
        severity = (
            supply_chain_disruption * 0.22
            + demand_drop_intensity * 0.25
            + competitor_price_pressure * 0.18
            + recession_pressure * 0.20
            + manufacturing_cost_spike * 0.15
        )
        return round(clamp(severity), 4)

    def generate_crisis_report(self) -> CrisisReport:
        """Generate one business-disruption crisis report."""

        event_idx = int(self._rng.choice([0, 1, 2, 3, 4], p=[0.22, 0.19, 0.18, 0.21, 0.20]))
        event = self._EVENTS[event_idx]

        base = self._sample(0.18, 0.68)
        supply_chain_disruption = clamp(base + self._sample(-0.20, 0.22) + (0.20 if event == "supply_chain_disruption" else 0.0))
        demand_drop_intensity = clamp(base + self._sample(-0.20, 0.22) + (0.22 if event == "sudden_demand_drop" else 0.0))
        competitor_price_pressure = clamp(base + self._sample(-0.20, 0.22) + (0.24 if event == "competitor_launching_cheaper_product" else 0.0))
        recession_pressure = clamp(base + self._sample(-0.20, 0.22) + (0.25 if event == "economic_recession" else 0.0))
        manufacturing_cost_spike = clamp(base + self._sample(-0.20, 0.22) + (0.24 if event == "manufacturing_cost_spike" else 0.0))

        report = CrisisReport(
            disruption_event=event,
            supply_chain_disruption=round(supply_chain_disruption, 4),
            demand_drop_intensity=round(demand_drop_intensity, 4),
            competitor_price_pressure=round(competitor_price_pressure, 4),
            recession_pressure=round(recession_pressure, 4),
            manufacturing_cost_spike=round(manufacturing_cost_spike, 4),
            severity_index=self._severity(
                supply_chain_disruption=supply_chain_disruption,
                demand_drop_intensity=demand_drop_intensity,
                competitor_price_pressure=competitor_price_pressure,
                recession_pressure=recession_pressure,
                manufacturing_cost_spike=manufacturing_cost_spike,
            ),
        )
        logger.info("Generated business crisis report: %s", report.model_dump())
        return report
