import pandas as pd

from app.indicators.engine import compute_indicators
from app.risk.engine import compute_risk


def test_indicator_and_risk_payload_has_keys() -> None:
    frame = pd.DataFrame(
        {
            "open": [100 + i for i in range(80)],
            "high": [101 + i for i in range(80)],
            "low": [99 + i for i in range(80)],
            "close": [100 + i * 0.8 for i in range(80)],
            "volume": [1000 + (i * 10) for i in range(80)],
        }
    )
    indicators = compute_indicators(frame)
    risk = compute_risk(frame)

    assert {"rsi", "macd", "trend_direction", "fibonacci", "support_resistance"}.issubset(indicators.keys())
    assert {"risk_score", "volatility", "drawdown", "liquidity_risk"}.issubset(risk.keys())
