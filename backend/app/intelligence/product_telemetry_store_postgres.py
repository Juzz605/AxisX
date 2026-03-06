"""PostgreSQL-backed store for product telemetry records."""

from datetime import datetime

import psycopg

from app.intelligence.schemas import ProductTelemetryRecord


class PostgresProductTelemetryStore:
    """PostgreSQL implementation for product telemetry persistence."""

    def __init__(self, connection_factory) -> None:
        self._connection_factory = connection_factory
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS product_telemetry (
                        id BIGSERIAL PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        quarter INTEGER NOT NULL,
                        archetype VARCHAR(64) NOT NULL,
                        product VARCHAR(64) NOT NULL,
                        monthly_units_sold INTEGER NOT NULL,
                        yearly_units_sold INTEGER NOT NULL,
                        inventory_utilization DOUBLE PRECISION NOT NULL,
                        revenue DOUBLE PRECISION NOT NULL,
                        unit_price DOUBLE PRECISION NOT NULL,
                        top_color VARCHAR(64) NOT NULL,
                        reason TEXT NOT NULL
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_product_telemetry_point
                    ON product_telemetry (timestamp, quarter, archetype, product)
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_product_telemetry_timestamp
                    ON product_telemetry (timestamp DESC)
                    """
                )
            conn.commit()
        finally:
            conn.close()

    def save_many(self, records: list[ProductTelemetryRecord]) -> None:
        if not records:
            return
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.executemany(
                    """
                    INSERT INTO product_telemetry (
                        timestamp,
                        quarter,
                        archetype,
                        product,
                        monthly_units_sold,
                        yearly_units_sold,
                        inventory_utilization,
                        revenue,
                        unit_price,
                        top_color,
                        reason
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (timestamp, quarter, archetype, product)
                    DO UPDATE SET
                        monthly_units_sold = EXCLUDED.monthly_units_sold,
                        yearly_units_sold = EXCLUDED.yearly_units_sold,
                        inventory_utilization = EXCLUDED.inventory_utilization,
                        revenue = EXCLUDED.revenue,
                        unit_price = EXCLUDED.unit_price,
                        top_color = EXCLUDED.top_color,
                        reason = EXCLUDED.reason
                    """,
                    [
                        (
                            record.timestamp,
                            record.quarter,
                            record.archetype,
                            record.product,
                            record.monthly_units_sold,
                            record.yearly_units_sold,
                            record.inventory_utilization,
                            record.revenue,
                            record.unit_price,
                            record.top_color,
                            record.reason,
                        )
                        for record in records
                    ],
                )
            conn.commit()
        finally:
            conn.close()

    def list_recent(self, limit: int = 200) -> list[ProductTelemetryRecord]:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        timestamp,
                        quarter,
                        archetype,
                        product,
                        monthly_units_sold,
                        yearly_units_sold,
                        inventory_utilization,
                        revenue,
                        unit_price,
                        top_color,
                        reason
                    FROM product_telemetry
                    ORDER BY timestamp DESC
                    LIMIT %s
                    """,
                    (max(1, limit),),
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        output: list[ProductTelemetryRecord] = []
        for row in rows:
            ts = row[0] if isinstance(row[0], datetime) else datetime.fromisoformat(str(row[0]))
            output.append(
                ProductTelemetryRecord(
                    timestamp=ts,
                    quarter=int(row[1]),
                    archetype=str(row[2]),
                    product=str(row[3]),
                    monthly_units_sold=int(row[4]),
                    yearly_units_sold=int(row[5]),
                    inventory_utilization=float(row[6]),
                    revenue=float(row[7]),
                    unit_price=float(row[8]),
                    top_color=str(row[9]),
                    reason=str(row[10]),
                )
            )
        return output

    def clear(self) -> None:
        conn = self._connection_factory()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM product_telemetry")
            conn.commit()
        finally:
            conn.close()
