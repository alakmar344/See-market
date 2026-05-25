from app.indicators.engine import compute_indicators
from app.risk.engine import compute_risk
from app.sentiment.engine import compute_sentiment
from app.services.providers import AlphaVantageFallback, provider_for


class MarketAnalysisService:
    async def analyze(self, symbol: str, question: str, asset_type: str) -> dict:
        provider = provider_for(asset_type)
        try:
            candles = await provider.candles(symbol)
            ticker = await provider.ticker(symbol)
        except Exception:
            fallback = AlphaVantageFallback()
            candles = await fallback.candles(symbol)
            ticker = await fallback.ticker(symbol)

        news = await provider.news(symbol)
        indicators = compute_indicators(candles)
        risk = compute_risk(candles)
        sentiment = compute_sentiment(news)

        return {
            "symbol": symbol.upper(),
            "question": question,
            "price": ticker["price"],
            "change_pct": ticker["change"],
            "indicators": indicators,
            "risk": risk,
            "sentiment": sentiment,
            "news": news[:10],
        }
