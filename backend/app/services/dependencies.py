"""Dependency providers for shared engine components."""

from functools import lru_cache

import psycopg

from app.core.config import CONFIG
from app.intelligence.memory_engine import ExecutiveMemoryEngine
from app.intelligence.orchestrator import AxisXIntelligenceOrchestrator
from app.intelligence.persistence import SQLMemoryStore
from app.intelligence.timeline_store import TimelineStore
from app.intelligence.timeline_store_postgres import PostgresTimelineStore
from app.services.live_simulation import LiveSimulationManager


def _postgres_connection_factory():
    if not CONFIG.database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(CONFIG.database_url)


@lru_cache(maxsize=1)
def get_memory_engine() -> ExecutiveMemoryEngine:
    """Return singleton memory engine to retain adaptation history."""

    if CONFIG.database_url:
        return ExecutiveMemoryEngine(store=SQLMemoryStore(connection_factory=_postgres_connection_factory))
    return ExecutiveMemoryEngine()


@lru_cache(maxsize=1)
def get_timeline_store() -> TimelineStore:
    """Return singleton timeline store using configured database path."""

    if CONFIG.database_url:
        return PostgresTimelineStore(connection_factory=_postgres_connection_factory)
    return TimelineStore(db_path=CONFIG.db_path)


@lru_cache(maxsize=1)
def get_orchestrator() -> AxisXIntelligenceOrchestrator:
    """Return orchestrator bound to shared memory engine."""

    return AxisXIntelligenceOrchestrator(memory_engine=get_memory_engine(), timeline_store=get_timeline_store())


@lru_cache(maxsize=1)
def get_live_simulation_manager() -> LiveSimulationManager:
    """Return singleton live simulation manager."""

    return LiveSimulationManager(orchestrator=get_orchestrator())
