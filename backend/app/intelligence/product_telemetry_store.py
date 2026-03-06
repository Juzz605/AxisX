"""Persistence abstractions for product telemetry records."""

from typing import Protocol

from app.intelligence.schemas import ProductTelemetryRecord


class ProductTelemetryStoreProtocol(Protocol):
    """Protocol for product telemetry persistence implementations."""

    def save_many(self, records: list[ProductTelemetryRecord]) -> None:
        """Persist multiple telemetry records."""

    def list_recent(self, limit: int = 200) -> list[ProductTelemetryRecord]:
        """Return latest telemetry records ordered by timestamp desc."""

    def clear(self) -> None:
        """Delete telemetry records."""


class InMemoryProductTelemetryStore:
    """In-memory fallback telemetry store for local runtime."""

    def __init__(self) -> None:
        self._records: list[ProductTelemetryRecord] = []

    def save_many(self, records: list[ProductTelemetryRecord]) -> None:
        self._records.extend(records)

    def list_recent(self, limit: int = 200) -> list[ProductTelemetryRecord]:
        return list(reversed(self._records[-max(1, limit) :]))

    def clear(self) -> None:
        self._records.clear()
