"""Adaptive executive memory engine for trait evolution."""

import logging
from datetime import datetime

from app.core.config import CONFIG
from app.intelligence.persistence import InMemoryStore, MemoryStore
from app.intelligence.schemas import CEOProfile, MemoryRecord
from app.intelligence.utils import clamp


logger = logging.getLogger(__name__)


class ExecutiveMemoryEngine:
    """Stores decisions and adapts profile traits based on outcomes."""

    def __init__(self, store: MemoryStore | None = None) -> None:
        self._store = store or InMemoryStore()

    @property
    def records(self) -> list[MemoryRecord]:
        """Return memory records for inspection and persistence."""

        return self._store.list_all()

    def clear(self) -> None:
        """Clear all memory records from the configured store."""

        self._store.clear()

    def adapt_profile(
        self,
        profile: CEOProfile,
        strategy: str,
        outcome_success: bool,
        liquidity_delta: float,
    ) -> CEOProfile:
        """Apply bounded adaptive updates to profile traits."""

        updated = profile.model_copy(deep=True)

        if strategy == "Aggressive Expansion" and not outcome_success:
            updated.risk_tolerance = clamp(updated.risk_tolerance + CONFIG.strategy.aggressive_loss_risk_delta)

        if strategy == "Defensive Cost Control" and liquidity_delta > 0:
            updated.liquidity_priority = clamp(updated.liquidity_priority + CONFIG.strategy.defensive_liquidity_gain_delta)

        if outcome_success:
            updated.long_term_focus = clamp(updated.long_term_focus + 0.01)
        else:
            updated.cost_sensitivity = clamp(updated.cost_sensitivity + 0.01)

        return updated

    def store(
        self,
        profile_name: str,
        strategy: str,
        pre_traits: CEOProfile,
        post_traits: CEOProfile,
        strategy_index: float,
        outcome_success: bool,
        liquidity_delta: float,
    ) -> MemoryRecord:
        """Store a complete decision memory record."""

        record = MemoryRecord(
            timestamp=datetime.utcnow(),
            profile_name=profile_name,
            strategy=strategy,
            pre_traits=pre_traits,
            post_traits=post_traits,
            strategy_index=strategy_index,
            outcome_success=outcome_success,
            liquidity_delta=liquidity_delta,
        )
        self._store.save(record)
        logger.info("Memory record appended: %s", record.model_dump())
        return record
