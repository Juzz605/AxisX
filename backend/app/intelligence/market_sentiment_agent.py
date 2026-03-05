"""Market sentiment advisory agent for synthetic strategic pressure signals."""

from dataclasses import dataclass

from app.core.config import CONFIG
from app.intelligence.schemas import CrisisReport, FinancialState, MarketSentimentSignal
from app.intelligence.utils import clamp


@dataclass
class MarketSentimentAgent:
    """Computes synthetic market momentum and volatility pressure."""

    def evaluate(self, crisis: CrisisReport, financial_state: FinancialState) -> MarketSentimentSignal:
        """Produce a bounded market sentiment signal and strategy adjustment."""

        cash_ratio = clamp(financial_state.cash / max(financial_state.revenue, 1.0))
        sentiment_score = clamp(
            crisis.consumer_confidence * 0.75
            - crisis.demand_drop * 0.90
            - crisis.interest_rate_spike * 0.65
            + cash_ratio * 0.35,
            -1.0,
            1.0,
        )
        momentum_signal = clamp((sentiment_score + 1.0) / 2.0)
        volatility_pressure = clamp(crisis.severity_index * 0.70 + crisis.interest_rate_spike * 1.1)

        adjustment = clamp(
            sentiment_score * (1.0 - volatility_pressure * 0.55),
            -CONFIG.support_agents.max_strategy_adjustment,
            CONFIG.support_agents.max_strategy_adjustment,
        )

        return MarketSentimentSignal(
            sentiment_score=round(sentiment_score, 4),
            momentum_signal=round(momentum_signal, 4),
            volatility_pressure=round(volatility_pressure, 4),
            adjustment=round(adjustment, 4),
        )
