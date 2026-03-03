"""CEO archetype agent and predefined profiles."""

import logging

from app.intelligence.schemas import CEOProfile


logger = logging.getLogger(__name__)


class CEOAgent:
    """Provides CEO profiles and profile mutation utilities."""

    VISIONARY_INNOVATOR = CEOProfile(
        name="VisionaryInnovator",
        risk_tolerance=0.82,
        innovation_bias=0.88,
        liquidity_priority=0.36,
        cost_sensitivity=0.34,
        long_term_focus=0.84,
    )

    CONSERVATIVE_STABILIZER = CEOProfile(
        name="ConservativeStabilizer",
        risk_tolerance=0.33,
        innovation_bias=0.40,
        liquidity_priority=0.86,
        cost_sensitivity=0.81,
        long_term_focus=0.61,
    )

    @classmethod
    def get_profile(cls, archetype: str) -> CEOProfile:
        """Return canonical CEO profile for requested archetype."""

        if archetype == cls.VISIONARY_INNOVATOR.name:
            return cls.VISIONARY_INNOVATOR.model_copy(deep=True)
        if archetype == cls.CONSERVATIVE_STABILIZER.name:
            return cls.CONSERVATIVE_STABILIZER.model_copy(deep=True)
        logger.error("Unsupported archetype requested: %s", archetype)
        raise ValueError(f"Unsupported archetype: {archetype}")
