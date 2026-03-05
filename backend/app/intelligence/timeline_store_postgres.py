"""PostgreSQL store for quarter-by-quarter company simulation timeline records."""

import json
from datetime import datetime

from app.intelligence.schemas import CEODecision, CompanyState, CrisisReport
from app.intelligence.timeline_store import TimelineQuarterRow


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
        company_state: CompanyState,
    ) -> None:
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
                        json.dumps(company_state.model_dump()),
                        datetime.utcnow(),
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    def list_by_simulation(self, simulation_id: str) -> list[TimelineQuarterRow]:
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

        return [
            TimelineQuarterRow(
                simulation_id=row[0],
                quarter=int(row[1]),
                archetype=str(row[2]),
                crisis=CrisisReport.model_validate(row[3]),
                decision=CEODecision.model_validate(row[4]),
                company_state=CompanyState.model_validate(row[5]),
                created_at=str(row[6]),
            )
            for row in rows
        ]

    def list_recent(self, limit: int = 100) -> list[TimelineQuarterRow]:
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

        return [
            TimelineQuarterRow(
                simulation_id=row[0],
                quarter=int(row[1]),
                archetype=str(row[2]),
                crisis=CrisisReport.model_validate(row[3]),
                decision=CEODecision.model_validate(row[4]),
                company_state=CompanyState.model_validate(row[5]),
                created_at=str(row[6]),
            )
            for row in rows
        ]

    def clear(self) -> None:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM simulation_timeline")
            conn.commit()
        finally:
            conn.close()
