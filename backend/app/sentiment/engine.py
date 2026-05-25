from __future__ import annotations

from functools import lru_cache
from typing import Any


@lru_cache
def _load_pipeline() -> Any:
    try:
        from transformers import pipeline

        return pipeline("text-classification", model="ProsusAI/finbert")
    except Exception:
        return None


def compute_sentiment(headlines: list[str]) -> dict:
    if not headlines:
        return {"score": 0.0, "label": "neutral", "sources": []}

    pipe = _load_pipeline()
    if pipe is None:
        score = 0.0
        joined = " ".join(headlines).lower()
        if any(x in joined for x in ["beat", "surge", "strong", "upgrade"]):
            score += 0.4
        if any(x in joined for x in ["miss", "fraud", "downgrade", "lawsuit"]):
            score -= 0.4
        label = "positive" if score > 0.15 else "negative" if score < -0.15 else "neutral"
        return {"score": score, "label": label, "sources": headlines[:5]}

    predictions = pipe(headlines[:10], truncation=True)
    score = 0.0
    for pred in predictions:
        if pred["label"].lower() == "positive":
            score += pred["score"]
        elif pred["label"].lower() == "negative":
            score -= pred["score"]
    score = score / max(len(predictions), 1)
    label = "positive" if score > 0.15 else "negative" if score < -0.15 else "neutral"
    return {"score": float(score), "label": label, "sources": headlines[:5]}
