"""Typed schemas for crisis, decision, memory, and API payloads."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CrisisReport(BaseModel):
    """Structured stochastic crisis output."""

    demand_drop: float = Field(..., ge=0.0, le=0.5)
    interest_rate_spike: float = Field(..., ge=0.0, le=0.2)
    liquidity_risk: float = Field(..., ge=0.0, le=1.0)
    consumer_confidence: float = Field(..., ge=0.0, le=1.0)
    severity_index: float = Field(..., ge=0.0, le=1.0)


class CEOProfile(BaseModel):
    """Archetype trait profile."""

    name: str
    risk_tolerance: float = Field(..., ge=0.0, le=1.0)
    innovation_bias: float = Field(..., ge=0.0, le=1.0)
    liquidity_priority: float = Field(..., ge=0.0, le=1.0)
    cost_sensitivity: float = Field(..., ge=0.0, le=1.0)
    long_term_focus: float = Field(..., ge=0.0, le=1.0)


class FinancialState(BaseModel):
    """Current financial state supplied to the decision engine."""

    revenue: float = Field(..., gt=0)
    cash: float = Field(..., ge=0)
    burn_rate: float = Field(..., ge=0)
    liquidity_months: float = Field(..., ge=0)


class Explainability(BaseModel):
    """Structured explainability vectors for auditability."""

    dominant_factors: list[str]
    severity_context: float = Field(..., ge=0.0, le=1.0)


class CEODecision(BaseModel):
    """Pure structured decision response."""

    strategy: Literal["Aggressive Expansion", "Balanced Adjustment", "Defensive Cost Control"]
    risk_level: float = Field(..., ge=0.0, le=1.0)
    growth_score: float
    stability_score: float
    strategy_index: float
    updated_traits: CEOProfile
    explainability: Explainability


class MemoryRecord(BaseModel):
    """Memory unit storing decision and outcome signals."""

    timestamp: datetime
    profile_name: str
    strategy: str
    pre_traits: CEOProfile
    post_traits: CEOProfile
    strategy_index: float
    outcome_success: bool
    liquidity_delta: float


class SimulationRequest(BaseModel):
    """API request for a full multi-agent cycle."""

    archetype: Literal["VisionaryInnovator", "ConservativeStabilizer"]
    financial_state: FinancialState
    seed: int | None = None
    outcome_success: bool | None = None
    liquidity_delta: float | None = None


class SimulationResponse(BaseModel):
    """API response with crisis report + CEO decision."""

    crisis_report: CrisisReport
    ceo_decision: CEODecision


class TimelineSimulationRequest(BaseModel):
    """API request for multi-quarter timeline simulation."""

    archetype: Literal["VisionaryInnovator", "ConservativeStabilizer"]
    financial_state: FinancialState
    quarters: int = Field(default=8, ge=1, le=40)
    seed: int | None = None


class QuarterTimelinePoint(BaseModel):
    """Quarter-by-quarter simulation output point."""

    quarter: int = Field(..., ge=1)
    crisis: CrisisReport
    decision: CEODecision
    financial_state: FinancialState


class TimelineSimulationResponse(BaseModel):
    """Timeline simulation response payload."""

    quarters: list[QuarterTimelinePoint]
    final_resilience_score: float = Field(..., ge=0.0, le=1.0)


class LiveSimulationStartRequest(BaseModel):
    """Request payload to start a live synthetic market session."""

    archetype: Literal["VisionaryInnovator", "ConservativeStabilizer"]
    financial_state: FinancialState
    tick_seconds: float = Field(default=1.5, ge=0.4, le=10.0)
    max_quarters: int = Field(default=24, ge=1, le=120)
    seed: int | None = None


class LiveSimulationStartResponse(BaseModel):
    """Response payload for started live simulation session."""

    session_id: str
    archetype: str
    tick_seconds: float
    max_quarters: int
