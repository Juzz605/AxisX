"""PostgreSQL store for quarter-by-quarter simulation timeline records."""

import json
import logging
from datetime import datetime

from app.intelligence.schemas import CEODecision, CrisisReport, FinancialState
from app.intelligence.timeline_store import TimelineQuarterRow

logger = logging.getLogger(__name__)


class PostgresTimelineStore:
    """PostgreSQL-backed timeline persistence implementation."""

    def __init__(self, connection_factory) -> None:
        self._connection_factory = connection_factory
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS simulation_timeline (
                        id BIGSERIAL PRIMARY KEY,
                        simulation_id TEXT NOT NULL,
                        quarter INTEGER NOT NULL,
                        archetype TEXT NOT NULL,
                        crisis_json JSONB NOT NULL,
                        decision_json JSONB NOT NULL,
                        financial_state_json JSONB NOT NULL,
                        created_at TIMESTAMP NOT NULL
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_simulation_timeline_sim_qtr
                    ON simulation_timeline (simulation_id, quarter)
                    """
                )
            conn.commit()
        finally:
            conn.close()

    def save_quarter(
        self,
        simulation_id: str,
        quarter: int,
        archetype: str,
        crisis: CrisisReport,
        decision: CEODecision,
        financial_state: FinancialState,
    ) -> None:
        """Persist one quarter result."""

        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO simulation_timeline (
                        simulation_id,
                        quarter,
                        archetype,
                        crisis_json,
                        decision_json,
                        financial_state_json,
                        created_at
                    ) VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s)
                    """,
                    (
                        simulation_id,
                        quarter,
                        archetype,
                        json.dumps(crisis.model_dump()),
                        json.dumps(decision.model_dump()),
                        json.dumps(financial_state.model_dump()),
                        datetime.utcnow(),
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    def list_by_simulation(self, simulation_id: str) -> list[TimelineQuarterRow]:
        """Read persisted quarter rows by simulation id."""

        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT simulation_id, quarter, archetype, crisis_json, decision_json, financial_state_json, created_at
                    FROM simulation_timeline
                    WHERE simulation_id = %s
                    ORDER BY quarter ASC
                    """,
                    (simulation_id,),
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        output: list[TimelineQuarterRow] = []
        for row in rows:
            output.append(
                TimelineQuarterRow(
                    simulation_id=row[0],
                    quarter=int(row[1]),
                    archetype=str(row[2]),
                    crisis=CrisisReport.model_validate(row[3]),
                    decision=CEODecision.model_validate(row[4]),
                    financial_state=FinancialState.model_validate(row[5]),
                    created_at=str(row[6]),
                )
            )
        return output

    def list_recent(self, limit: int = 100) -> list[TimelineQuarterRow]:
        """Return recent quarter rows across simulations."""

        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT simulation_id, quarter, archetype, crisis_json, decision_json, financial_state_json, created_at
                    FROM simulation_timeline
                    ORDER BY id DESC
                    LIMIT %s
                    """,
                    (max(1, limit),),
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        output: list[TimelineQuarterRow] = []
        for row in rows:
            output.append(
                TimelineQuarterRow(
                    simulation_id=row[0],
                    quarter=int(row[1]),
                    archetype=str(row[2]),
                    crisis=CrisisReport.model_validate(row[3]),
                    decision=CEODecision.model_validate(row[4]),
                    financial_state=FinancialState.model_validate(row[5]),
                    created_at=str(row[6]),
                )
            )
        return output

    def clear(self) -> None:
        """Delete all timeline records."""

        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM simulation_timeline")
            conn.commit()
        finally:
            conn.close()
