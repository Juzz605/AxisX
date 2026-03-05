"""MongoDB store for quarter-by-quarter simulation timeline records."""

from datetime import datetime, timezone

from pymongo.collection import Collection

from app.intelligence.schemas import CEODecision, CrisisReport, FinancialState
from app.intelligence.timeline_store import TimelineQuarterRow


class MongoTimelineStore:
    """Mongo-backed timeline persistence implementation."""

    def __init__(self, collection: Collection) -> None:
        self._collection = collection
        self._collection.create_index([("simulation_id", 1), ("quarter", 1)], unique=True)
        self._collection.create_index([("created_at", -1)])

    def save_quarter(
        self,
        simulation_id: str,
        quarter: int,
        archetype: str,
        crisis: CrisisReport,
        decision: CEODecision,
        financial_state: FinancialState,
    ) -> None:
        created_at = datetime.now(timezone.utc)
        self._collection.update_one(
            {"simulation_id": simulation_id, "quarter": quarter},
            {
                "$set": {
                    "simulation_id": simulation_id,
                    "quarter": quarter,
                    "archetype": archetype,
                    "crisis": crisis.model_dump(mode="json"),
                    "decision": decision.model_dump(mode="json"),
                    "financial_state": financial_state.model_dump(mode="json"),
                    "created_at": created_at,
                }
            },
            upsert=True,
        )

    def list_by_simulation(self, simulation_id: str) -> list[TimelineQuarterRow]:
        docs = self._collection.find({"simulation_id": simulation_id}, {"_id": 0}).sort("quarter", 1)
        return [self._to_row(doc) for doc in docs]

    def list_recent(self, limit: int = 100) -> list[TimelineQuarterRow]:
        docs = self._collection.find({}, {"_id": 0}).sort("created_at", -1).limit(max(1, limit))
        return [self._to_row(doc) for doc in docs]

    def clear(self) -> None:
        self._collection.delete_many({})

    @staticmethod
    def _to_row(doc: dict) -> TimelineQuarterRow:
        created_at = doc.get("created_at")
        if isinstance(created_at, datetime):
            created_at_str = created_at.astimezone(timezone.utc).isoformat()
        else:
            created_at_str = str(created_at)

        return TimelineQuarterRow(
            simulation_id=str(doc.get("simulation_id", "")),
            quarter=int(doc.get("quarter", 0)),
            archetype=str(doc.get("archetype", "")),
            crisis=CrisisReport.model_validate(doc.get("crisis", {})),
            decision=CEODecision.model_validate(doc.get("decision", {})),
            financial_state=FinancialState.model_validate(doc.get("financial_state", {})),
            created_at=created_at_str,
        )
