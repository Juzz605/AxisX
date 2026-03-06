"""MongoDB-backed store for product telemetry records."""

from datetime import datetime, timezone

from pymongo import DESCENDING
from pymongo.collection import Collection

from app.intelligence.schemas import ProductTelemetryRecord


class MongoProductTelemetryStore:
    """Mongo implementation for product telemetry persistence."""

    def __init__(self, collection: Collection) -> None:
        self._collection = collection
        self._collection.create_index([("timestamp", DESCENDING)])
        self._collection.create_index(
            [("quarter", 1), ("archetype", 1), ("product", 1), ("timestamp", 1)],
            unique=True,
        )

    def save_many(self, records: list[ProductTelemetryRecord]) -> None:
        if not records:
            return
        docs = [record.model_dump(mode="json") for record in records]
        for doc in docs:
            self._collection.update_one(
                {
                    "quarter": doc["quarter"],
                    "archetype": doc["archetype"],
                    "product": doc["product"],
                    "timestamp": doc["timestamp"],
                },
                {"$set": doc},
                upsert=True,
            )

    def list_recent(self, limit: int = 200) -> list[ProductTelemetryRecord]:
        docs = self._collection.find({}, {"_id": 0}).sort("timestamp", DESCENDING).limit(max(1, limit))
        output: list[ProductTelemetryRecord] = []
        for doc in docs:
            ts = doc.get("timestamp")
            if isinstance(ts, datetime):
                doc["timestamp"] = ts.astimezone(timezone.utc).replace(tzinfo=None).isoformat()
            output.append(ProductTelemetryRecord.model_validate(doc))
        return output

    def clear(self) -> None:
        self._collection.delete_many({})
