"""Logging setup for AxisX services."""

import logging


def configure_logging() -> None:
    """Configure global logging format and level."""

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
