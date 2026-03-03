"""Example local simulation run for AxisX intelligence engine."""

from pprint import pprint

from app.intelligence.memory_engine import ExecutiveMemoryEngine
from app.intelligence.orchestrator import AxisXIntelligenceOrchestrator
from app.intelligence.schemas import FinancialState
from app.intelligence.timeline_store import TimelineStore


def main() -> None:
    memory_engine = ExecutiveMemoryEngine()
    timeline_store = TimelineStore(db_path="./axisx.db")
    orchestrator = AxisXIntelligenceOrchestrator(memory_engine=memory_engine, timeline_store=timeline_store)

    financial_state = FinancialState(
        revenue=14_000_000,
        cash=6_800_000,
        burn_rate=920_000,
        liquidity_months=16.5,
    )

    response = orchestrator.simulate(
        archetype="VisionaryInnovator",
        financial_state=financial_state,
        seed=42,
        outcome_success=False,
        liquidity_delta=-0.8,
    )
    timeline = orchestrator.simulate_timeline(
        archetype="VisionaryInnovator",
        financial_state=financial_state,
        quarters=8,
        seed=42,
    )

    pprint(response.model_dump())
    pprint(timeline.model_dump())
    pprint([record.model_dump() for record in memory_engine.records])


if __name__ == "__main__":
    main()
