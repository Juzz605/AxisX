"""Central configuration for AxisX executive intelligence engine."""

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class CrisisDistributionConfig:
    """Distribution controls and scenario weights for crisis generation."""

    scenario_weights: tuple[float, float, float] = (0.5, 0.35, 0.15)
    demand_drop_ranges: tuple[tuple[float, float], tuple[float, float], tuple[float, float]] = (
        (0.02, 0.18),
        (0.18, 0.34),
        (0.34, 0.50),
    )
    interest_spike_ranges: tuple[tuple[float, float], tuple[float, float], tuple[float, float]] = (
        (0.01, 0.07),
        (0.07, 0.14),
        (0.14, 0.20),
    )
    liquidity_risk_ranges: tuple[tuple[float, float], tuple[float, float], tuple[float, float]] = (
        (0.20, 0.55),
        (0.50, 0.80),
        (0.75, 1.00),
    )
    confidence_ranges: tuple[tuple[float, float], tuple[float, float], tuple[float, float]] = (
        (0.55, 0.92),
        (0.35, 0.70),
        (0.05, 0.45),
    )


@dataclass(frozen=True)
class StrategyConfig:
    """Decision thresholds and adaptation deltas."""

    noise_bound: float = 0.06
    aggressive_threshold: float = 0.2
    defensive_threshold: float = -0.2
    aggressive_loss_risk_delta: float = -0.04
    defensive_liquidity_gain_delta: float = 0.03


@dataclass(frozen=True)
class SupportAgentConfig:
    """Weights for additional advisory agents and strategy adjustment bounds."""

    market_signal_weight: float = 0.40
    operations_signal_weight: float = 0.30
    treasury_signal_weight: float = 0.30
    max_strategy_adjustment: float = 0.12


@dataclass(frozen=True)
class SeverityConfig:
    """Weights used to calculate severity index from crisis factors."""

    demand_weight: float = 0.35
    interest_weight: float = 0.20
    liquidity_weight: float = 0.30
    confidence_inverse_weight: float = 0.15


@dataclass(frozen=True)
class EngineConfig:
    """Aggregated engine configuration."""

    crisis: CrisisDistributionConfig = CrisisDistributionConfig()
    strategy: StrategyConfig = StrategyConfig()
    support_agents: SupportAgentConfig = SupportAgentConfig()
    severity: SeverityConfig = SeverityConfig()
    default_quarters: int = 8
    max_quarters: int = 40
    db_path: str = os.getenv("AXISX_DB_PATH", "./axisx.db")
    database_url: str = os.getenv("DATABASE_URL", "")
    mongodb_uri: str = os.getenv("MONGODB_URI", "")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "axisx")
    cors_origins_raw: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")


CONFIG = EngineConfig()
CORS_ORIGINS: list[str] = [origin.strip() for origin in CONFIG.cors_origins_raw.split(",") if origin.strip()]
