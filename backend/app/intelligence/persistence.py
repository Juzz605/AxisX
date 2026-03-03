"""Persistence abstractions for decision memory (PostgreSQL-ready)."""

import json
import logging
from datetime import datetime
from typing import Protocol

from app.intelligence.schemas import MemoryRecord


logger = logging.getLogger(__name__)


def _coerce_json_payload(value):
    """Normalize DB JSON/JSONB payload to python dict."""

    if isinstance(value, (dict, list)):
        return value
    if value is None:
        return {}
    if isinstance(value, (str, bytes, bytearray)):
        return json.loads(value)
    return value


class MemoryStore(Protocol):
    """Persistence protocol for memory records."""

    def save(self, record: MemoryRecord) -> None:
        """Persist a memory record."""

    def list_all(self) -> list[MemoryRecord]:
        """Return all memory records."""

    def clear(self) -> None:
        """Delete all memory records."""


class InMemoryStore:
    """In-process memory store for local/runtime usage."""

    def __init__(self) -> None:
        self._data: list[MemoryRecord] = []

    def save(self, record: MemoryRecord) -> None:
        self._data.append(record)

    def list_all(self) -> list[MemoryRecord]:
        return list(self._data)

    def clear(self) -> None:
        self._data.clear()


class SQLMemoryStore:
    """DB-API based SQL store compatible with PostgreSQL drivers."""

    def __init__(self, connection_factory) -> None:
        self._connection_factory = connection_factory
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS executive_memory (
                        id BIGSERIAL PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        profile_name VARCHAR(64) NOT NULL,
                        strategy VARCHAR(64) NOT NULL,
                        pre_traits JSONB NOT NULL,
                        post_traits JSONB NOT NULL,
                        strategy_index DOUBLE PRECISION NOT NULL,
                        outcome_success BOOLEAN NOT NULL,
                        liquidity_delta DOUBLE PRECISION NOT NULL
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_executive_memory_timestamp
                    ON executive_memory (timestamp DESC)
                    """
                )
            conn.commit()
        finally:
            conn.close()

    def save(self, record: MemoryRecord) -> None:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO executive_memory (
                        timestamp, profile_name, strategy, pre_traits, post_traits,
                        strategy_index, outcome_success, liquidity_delta
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        record.timestamp,
                        record.profile_name,
                        record.strategy,
                        json.dumps(record.pre_traits.model_dump()),
                        json.dumps(record.post_traits.model_dump()),
                        record.strategy_index,
                        record.outcome_success,
                        record.liquidity_delta,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    def list_all(self) -> list[MemoryRecord]:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT timestamp, profile_name, strategy, pre_traits, post_traits,
                           strategy_index, outcome_success, liquidity_delta
                    FROM executive_memory
                    ORDER BY timestamp DESC
                    """
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        records: list[MemoryRecord] = []
        for row in rows:
            records.append(
                MemoryRecord(
                    timestamp=row[0] if isinstance(row[0], datetime) else datetime.fromisoformat(str(row[0])),
                    profile_name=row[1],
                    strategy=row[2],
                    pre_traits=_coerce_json_payload(row[3]),
                    post_traits=_coerce_json_payload(row[4]),
                    strategy_index=float(row[5]),
                    outcome_success=bool(row[6]),
                    liquidity_delta=float(row[7]),
                )
            )
        return records

    def clear(self) -> None:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM executive_memory")
            conn.commit()
        finally:
            conn.close()
