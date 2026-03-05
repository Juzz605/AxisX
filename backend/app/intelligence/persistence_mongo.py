"""MongoDB persistence implementation for executive memory records."""

import logging
from datetime import datetime, timezone

from pymongo.collection import Collection

from app.intelligence.schemas import MemoryRecord

logger = logging.getLogger(__name__)


class MongoMemoryStore:
    """Mongo-backed memory store implementation."""

    def __init__(self, collection: Collection) -> None:
        self._collection = collection
        self._collection.create_index([("timestamp", -1)])

    def save(self, record: MemoryRecord) -> None:
        payload = record.model_dump(mode="json")
        self._collection.insert_one(payload)

    def list_all(self) -> list[MemoryRecord]:
        docs = self._collection.find({}, {"_id": 0}).sort("timestamp", -1)
        output: list[MemoryRecord] = []
        for doc in docs:
            ts = doc.get("timestamp")
            if isinstance(ts, datetime):
                doc["timestamp"] = ts.astimezone(timezone.utc).replace(tzinfo=None).isoformat()
            output.append(MemoryRecord.model_validate(doc))
        return output

    def clear(self) -> None:
        self._collection.delete_many({})
