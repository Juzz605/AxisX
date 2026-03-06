"""Dependency providers for shared engine components."""

from functools import lru_cache

import psycopg
from pymongo import MongoClient

from app.core.config import CONFIG
from app.intelligence.memory_engine import ExecutiveMemoryEngine
from app.intelligence.orchestrator import AxisXIntelligenceOrchestrator
from app.intelligence.persistence import SQLMemoryStore
from app.intelligence.persistence_mongo import MongoMemoryStore
from app.intelligence.product_telemetry_store import (
    InMemoryProductTelemetryStore,
    ProductTelemetryStoreProtocol,
)
from app.intelligence.product_telemetry_store_mongo import MongoProductTelemetryStore
from app.intelligence.product_telemetry_store_postgres import PostgresProductTelemetryStore
from app.intelligence.timeline_store import TimelineStore, TimelineStoreProtocol
from app.intelligence.timeline_store_mongo import MongoTimelineStore
from app.intelligence.timeline_store_postgres import PostgresTimelineStore
from app.services.live_simulation import LiveSimulationManager


def _postgres_connection_factory():
    if not CONFIG.database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(CONFIG.database_url)


@lru_cache(maxsize=1)
def _get_mongo_client() -> MongoClient:
    if not CONFIG.mongodb_uri:
        raise RuntimeError("MONGODB_URI is not configured")
    return MongoClient(CONFIG.mongodb_uri)


@lru_cache(maxsize=1)
def get_memory_engine() -> ExecutiveMemoryEngine:
    """Return singleton memory engine to retain adaptation history."""

    if CONFIG.mongodb_uri:
        client = _get_mongo_client()
        db = client[CONFIG.mongodb_db_name]
        return ExecutiveMemoryEngine(store=MongoMemoryStore(collection=db["executive_memory"]))

    if CONFIG.database_url:
        return ExecutiveMemoryEngine(store=SQLMemoryStore(connection_factory=_postgres_connection_factory))
    return ExecutiveMemoryEngine()


@lru_cache(maxsize=1)
def get_timeline_store() -> TimelineStoreProtocol:
    """Return singleton timeline store using configured database path."""

    if CONFIG.mongodb_uri:
        client = _get_mongo_client()
        db = client[CONFIG.mongodb_db_name]
        return MongoTimelineStore(collection=db["simulation_timeline"])

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


@lru_cache(maxsize=1)
def get_product_telemetry_store() -> ProductTelemetryStoreProtocol:
    """Return telemetry store for product sales/revenue records."""

    if CONFIG.mongodb_uri:
        client = _get_mongo_client()
        db = client[CONFIG.mongodb_db_name]
        return MongoProductTelemetryStore(collection=db["product_telemetry"])
    if CONFIG.database_url:
        return PostgresProductTelemetryStore(connection_factory=_postgres_connection_factory)
    return InMemoryProductTelemetryStore()
