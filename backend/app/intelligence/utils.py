"""Utility helpers for bounded numeric operations."""


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    """Clamp numeric value to a bounded range."""

    return max(minimum, min(maximum, value))
