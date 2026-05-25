import numpy as np
import pandas as pd


def _safe_last(series: pd.Series) -> float:
    return float(series.dropna().iloc[-1]) if not series.dropna().empty else 0.0


def compute_indicators(frame: pd.DataFrame) -> dict:
    close = frame["close"]
    high = frame["high"]
    low = frame["low"]
    volume = frame["volume"]

    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26

    sma20 = close.rolling(20).mean()
    std20 = close.rolling(20).std()
    upper = sma20 + 2 * std20
    lower = sma20 - 2 * std20

    typical = (high + low + close) / 3
    vwap = (typical * volume).cumsum() / volume.cumsum().replace(0, np.nan)

    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    atr = tr.rolling(14).mean()

    momentum = close.pct_change(10)
    volatility = close.pct_change().rolling(20).std() * np.sqrt(252)
    trend_direction = "bullish" if _safe_last(ema12) > _safe_last(ema26) else "bearish"

    latest = {
        "rsi": _safe_last(rsi),
        "macd": _safe_last(macd),
        "ema": _safe_last(close.ewm(span=20, adjust=False).mean()),
        "sma": _safe_last(close.rolling(20).mean()),
        "bollinger_upper": _safe_last(upper),
        "bollinger_lower": _safe_last(lower),
        "vwap": _safe_last(vwap),
        "atr": _safe_last(atr),
        "volatility_score": float(np.clip(_safe_last(volatility) * 100, 0, 100)),
        "momentum_score": float(np.clip((_safe_last(momentum) + 0.5) * 100, 0, 100)),
        "trend_direction": trend_direction,
    }

    prices = close.tail(120)
    latest["fibonacci"] = {
        "0.236": float(prices.max() - (prices.max() - prices.min()) * 0.236),
        "0.382": float(prices.max() - (prices.max() - prices.min()) * 0.382),
        "0.618": float(prices.max() - (prices.max() - prices.min()) * 0.618),
    }
    latest["support_resistance"] = {
        "support": float(prices.quantile(0.2)),
        "resistance": float(prices.quantile(0.8)),
    }
    return latest
