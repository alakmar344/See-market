from datetime import datetime, timezone

from app.indicators.engine import compute_indicators
from app.risk.engine import compute_risk
from app.sentiment.engine import compute_sentiment
from app.services.cache import cache_service
from app.services.providers import AlphaVantageFallback, provider_for


class MarketAnalysisService:
    async def analyze(self, symbol: str, question: str, asset_type: str) -> dict:
        normalized_symbol = symbol.upper()
        cache_key = f"analysis_{asset_type}_{normalized_symbol}"
        cached = await cache_service.get(cache_key)
        if cached and question.lower() in {"market snapshot", "realtime overview"}:
            return cached

        provider = provider_for(asset_type)
        try:
            candles = await provider.candles(normalized_symbol)
            ticker = await provider.ticker(normalized_symbol)
            news = await provider.news(normalized_symbol)
        except Exception:
            fallback = AlphaVantageFallback()
            candles = await fallback.candles(normalized_symbol)
            ticker = await fallback.ticker(normalized_symbol)
            news = await fallback.news(normalized_symbol)

        indicators = compute_indicators(candles)
        risk = compute_risk(candles)
        sentiment = compute_sentiment(news)

        history = [
            {
                "time": f"{idx}",
                "value": float(value),
            }
            for idx, value in enumerate(candles["close"].tail(120).tolist())
        ]

        analysis = {
            "symbol": normalized_symbol,
            "question": question,
            "asset_type": asset_type,
            "price": ticker["price"],
            "change_pct": ticker["change"],
            "volume": ticker.get("volume", 0.0),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "indicators": indicators,
            "risk": risk,
            "sentiment": sentiment,
            "news": news[:10],
            "history": history,
        }
        await cache_service.set(cache_key, analysis, ttl_seconds=45)
        return analysis

    async def movers(self, asset_type: str) -> list[dict]:
        cache_key = f"movers_{asset_type}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        provider = provider_for(asset_type)
        try:
            movers = await provider.market_movers()
        except Exception:
            movers = []
        await cache_service.set(cache_key, movers, ttl_seconds=60)
        return movers

    async def trending(self, asset_type: str) -> list[dict]:
        cache_key = f"trending_{asset_type}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        provider = provider_for(asset_type)
        try:
            trending_assets = await provider.trending_assets()
        except Exception:
            trending_assets = []
        await cache_service.set(cache_key, trending_assets, ttl_seconds=60)
        return trending_assets
