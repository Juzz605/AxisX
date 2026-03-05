"""Market intelligence advisory agent for customer/competitor dynamics."""

from dataclasses import dataclass

from app.core.config import CONFIG
from app.intelligence.schemas import CompanyState, CrisisReport, MarketSentimentSignal
from app.intelligence.utils import clamp


@dataclass
class MarketSentimentAgent:
    """Computes market intelligence signal for strategic pressure."""

    def evaluate(self, crisis: CrisisReport, company_state: CompanyState) -> MarketSentimentSignal:
        """Produce a bounded market signal and strategy adjustment."""

        sentiment_score = clamp(
            company_state.customer_sentiment * 0.55
            + company_state.product_demand * 0.35
            - company_state.competitor_pressure * 0.42
            - crisis.demand_drop_intensity * 0.25
            - crisis.competitor_price_pressure * 0.20,
            -1.0,
            1.0,
        )
        momentum_signal = clamp((company_state.product_demand + company_state.marketing_effectiveness) / 2)
        volatility_pressure = clamp(crisis.severity_index * 0.72 + company_state.competitor_pressure * 0.33)

        adjustment = clamp(
            sentiment_score * (1 - volatility_pressure * 0.45),
            -CONFIG.support_agents.max_strategy_adjustment,
            CONFIG.support_agents.max_strategy_adjustment,
        )

        return MarketSentimentSignal(
            sentiment_score=round(sentiment_score, 4),
            momentum_signal=round(momentum_signal, 4),
            volatility_pressure=round(volatility_pressure, 4),
            adjustment=round(adjustment, 4),
        )
