"""Database store for quarter-by-quarter company simulation timeline records."""

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from app.intelligence.schemas import CEODecision, CompanyState, CrisisReport


@dataclass(frozen=True)
class TimelineQuarterRow:
    """Typed row shape for persisted quarter records."""

    simulation_id: str
    quarter: int
    archetype: str
    crisis: CrisisReport
    decision: CEODecision
    company_state: CompanyState
    created_at: str


class TimelineStoreProtocol(Protocol):
    """Persistence protocol for quarter timeline records."""

    def save_quarter(
        self,
        simulation_id: str,
        quarter: int,
        archetype: str,
        crisis: CrisisReport,
        decision: CEODecision,
        company_state: CompanyState,
    ) -> None:
        """Persist one quarter record."""

    def list_by_simulation(self, simulation_id: str) -> list[TimelineQuarterRow]:
        """Return timeline rows by simulation id."""

    def list_recent(self, limit: int = 100) -> list[TimelineQuarterRow]:
        """Return most recent timeline rows."""

    def clear(self) -> None:
        """Delete all timeline rows."""


class TimelineStore:
    """SQLite-backed timeline persistence with per-quarter inserts."""

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._initialize_schema()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._db_path, check_same_thread=False)

    def _initialize_schema(self) -> None:
        conn = self._connect()
        try:
            with conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS simulation_timeline (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        simulation_id TEXT NOT NULL,
                        quarter INTEGER NOT NULL,
                        archetype TEXT NOT NULL,
                        crisis_json TEXT NOT NULL,
                        decision_json TEXT NOT NULL,
                        financial_state_json TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_simulation_timeline_sim_qtr
                    ON simulation_timeline (simulation_id, quarter)
                    """
                )
        finally:
            conn.close()

    def save_quarter(
        self,
        simulation_id: str,
        quarter: int,
        archetype: str,
        crisis: CrisisReport,
        decision: CEODecision,
        company_state: CompanyState,
    ) -> None:
        """Persist one quarter result."""

        created_at = datetime.now(timezone.utc).isoformat()
        conn = self._connect()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO simulation_timeline (
                        simulation_id,
                        quarter,
                        archetype,
                        crisis_json,
                        decision_json,
                        financial_state_json,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        simulation_id,
                        quarter,
                        archetype,
                        json.dumps(crisis.model_dump()),
                        json.dumps(decision.model_dump()),
                        json.dumps(company_state.model_dump()),
                        created_at,
                    ),
                )
        finally:
            conn.close()

    def list_by_simulation(self, simulation_id: str) -> list[TimelineQuarterRow]:
        """Read persisted quarter rows by simulation id."""

        conn = self._connect()
        try:
            cursor = conn.execute(
                """
                SELECT simulation_id, quarter, archetype, crisis_json, decision_json, financial_state_json, created_at
                FROM simulation_timeline
                WHERE simulation_id = ?
                ORDER BY quarter ASC
                """,
                (simulation_id,),
            )
            rows = cursor.fetchall()
        finally:
            conn.close()

        return [
            TimelineQuarterRow(
                simulation_id=row[0],
                quarter=int(row[1]),
                archetype=str(row[2]),
                crisis=CrisisReport.model_validate_json(row[3]),
                decision=CEODecision.model_validate_json(row[4]),
                company_state=CompanyState.model_validate_json(row[5]),
                created_at=str(row[6]),
            )
            for row in rows
        ]

    def clear(self) -> None:
        """Delete all timeline records."""

        conn = self._connect()
        try:
            with conn:
                conn.execute("DELETE FROM simulation_timeline")
        finally:
            conn.close()

    def list_recent(self, limit: int = 100) -> list[TimelineQuarterRow]:
        """Return recent quarter rows across simulations."""

        conn = self._connect()
        try:
            cursor = conn.execute(
                """
                SELECT simulation_id, quarter, archetype, crisis_json, decision_json, financial_state_json, created_at
                FROM simulation_timeline
                ORDER BY id DESC
                LIMIT ?
                """,
                (max(1, limit),),
            )
            rows = cursor.fetchall()
        finally:
            conn.close()

        return [
            TimelineQuarterRow(
                simulation_id=row[0],
                quarter=int(row[1]),
                archetype=str(row[2]),
                crisis=CrisisReport.model_validate_json(row[3]),
                decision=CEODecision.model_validate_json(row[4]),
                company_state=CompanyState.model_validate_json(row[5]),
                created_at=str(row[6]),
            )
            for row in rows
        ]
