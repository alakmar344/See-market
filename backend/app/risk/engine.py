import numpy as np
import pandas as pd


def compute_risk(frame: pd.DataFrame) -> dict:
    close = frame["close"]
    ret = close.pct_change().dropna()

    volatility = float(ret.std() * np.sqrt(252)) if not ret.empty else 0.0
    cumulative = (1 + ret).cumprod()
    peak = cumulative.cummax()
    drawdown = float(((cumulative - peak) / peak).min()) if not ret.empty else 0.0
    sharpe = float((ret.mean() / (ret.std() + 1e-9)) * np.sqrt(252)) if not ret.empty else 0.0

    volume_cv = float(frame["volume"].pct_change().std()) if len(frame) > 1 else 1.0
    liquidity_risk = "high" if volume_cv > 0.5 else "moderate" if volume_cv > 0.2 else "low"

    instability = float(abs(ret.tail(10).std() / (ret.std() + 1e-9))) if len(ret) > 20 else 1.0
    regime = "risk-off" if volatility > 0.45 else "transition" if volatility > 0.25 else "risk-on"

    risk_score = float(
        np.clip((volatility * 35) + (abs(drawdown) * 30) + (max(0, 1 - sharpe) * 20) + (instability * 15), 0, 100)
    )

    return {
        "volatility": volatility,
        "drawdown": drawdown,
        "sharpe_ratio": sharpe,
        "risk_score": risk_score,
        "liquidity_risk": liquidity_risk,
        "momentum_instability": instability,
        "market_regime": regime,
        "explanation": (
            f"Volatility is {volatility:.2f}, drawdown {drawdown:.2%}, Sharpe {sharpe:.2f}, "
            f"momentum instability {instability:.2f}. Regime is {regime} with {liquidity_risk} liquidity risk."
        ),
    }
