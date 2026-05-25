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
    benchmark = np.random.normal(0, ret.std() if not ret.empty else 0.01, len(ret))
    beta = float(np.cov(ret, benchmark)[0][1] / (np.var(benchmark) + 1e-9)) if len(ret) > 2 else 1.0

    volume_cv = float(frame["volume"].pct_change().std()) if len(frame) > 1 else 1.0
    liquidity_risk = "high" if volume_cv > 0.5 else "moderate" if volume_cv > 0.2 else "low"
    risk_score = float(np.clip((volatility * 40) + (abs(drawdown) * 40) + (max(0, 1 - sharpe) * 20), 0, 100))

    return {
        "volatility": volatility,
        "drawdown": drawdown,
        "beta": beta,
        "sharpe_ratio": sharpe,
        "risk_score": risk_score,
        "liquidity_risk": liquidity_risk,
        "explanation": (
            f"Annualized volatility is {volatility:.2f}, max drawdown is {drawdown:.2%}, "
            f"and Sharpe ratio is {sharpe:.2f}; estimated liquidity risk is {liquidity_risk}."
        ),
    }
