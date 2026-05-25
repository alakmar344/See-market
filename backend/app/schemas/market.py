from pydantic import BaseModel


class MarketAnalyzeRequest(BaseModel):
    symbol: str
    question: str
    asset_type: str = "stock"


class IndicatorPayload(BaseModel):
    rsi: float
    macd: float
    ema: float
    sma: float
    bollinger_upper: float
    bollinger_lower: float
    vwap: float
    atr: float
    volatility_score: float
    momentum_score: float
    trend_direction: str


class RiskPayload(BaseModel):
    volatility: float
    drawdown: float
    sharpe_ratio: float
    risk_score: float
    liquidity_risk: str
    momentum_instability: float
    market_regime: str
    explanation: str
