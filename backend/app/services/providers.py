from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

import httpx
import pandas as pd

from app.core.config import get_settings


class MarketProvider(ABC):
    @abstractmethod
    async def candles(self, symbol: str, interval: str = "1h", limit: int = 240) -> pd.DataFrame: ...

    @abstractmethod
    async def ticker(self, symbol: str) -> dict: ...

    @abstractmethod
    async def news(self, symbol: str) -> list[str]: ...

    @abstractmethod
    async def market_movers(self) -> list[dict]: ...

    @abstractmethod
    async def trending_assets(self) -> list[dict]: ...


class BinanceProvider(MarketProvider):
    base_url = "https://api.binance.com"

    async def candles(self, symbol: str, interval: str = "1h", limit: int = 240) -> pd.DataFrame:
        pair = symbol.upper() if symbol.upper().endswith("USDT") else f"{symbol.upper()}USDT"
        async with httpx.AsyncClient(timeout=10) as client:
            data = (await client.get(f"{self.base_url}/api/v3/klines", params={"symbol": pair, "interval": interval, "limit": limit})).json()
        frame = pd.DataFrame(data, columns=["open_time", "open", "high", "low", "close", "volume", "close_time", "qav", "trades", "tbav", "tqav", "ignore"])
        for col in ["open", "high", "low", "close", "volume"]:
            frame[col] = pd.to_numeric(frame[col], errors="coerce")
        return frame[["open", "high", "low", "close", "volume"]].dropna()

    async def ticker(self, symbol: str) -> dict:
        pair = symbol.upper() if symbol.upper().endswith("USDT") else f"{symbol.upper()}USDT"
        async with httpx.AsyncClient(timeout=10) as client:
            data = (await client.get(f"{self.base_url}/api/v3/ticker/24hr", params={"symbol": pair})).json()
        return {"symbol": pair, "price": float(data["lastPrice"]), "change": float(data["priceChangePercent"]), "volume": float(data.get("volume", 0))}

    async def news(self, symbol: str) -> list[str]:
        return [f"Crypto market update for {symbol.upper()} from exchange activity"]

    async def market_movers(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            data = (await client.get(f"{self.base_url}/api/v3/ticker/24hr")).json()
        sorted_data = sorted(data, key=lambda x: abs(float(x.get("priceChangePercent", 0))), reverse=True)[:10]
        return [{"symbol": item["symbol"], "change_pct": float(item["priceChangePercent"]), "price": float(item["lastPrice"])} for item in sorted_data]

    async def trending_assets(self) -> list[dict]:
        movers = await self.market_movers()
        return movers[:8]


class YahooProvider(MarketProvider):
    async def candles(self, symbol: str, interval: str = "1h", limit: int = 240) -> pd.DataFrame:
        interval_map = {"1h": "60m", "1d": "1d"}
        query_interval = interval_map.get(interval, "60m")
        start = int((datetime.now(timezone.utc) - timedelta(days=30)).timestamp())
        end = int(datetime.now(timezone.utc).timestamp())
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}"
        async with httpx.AsyncClient(timeout=10) as client:
            payload = (await client.get(url, params={"period1": start, "period2": end, "interval": query_interval})).json()
        quote = payload["chart"]["result"][0]["indicators"]["quote"][0]
        frame = pd.DataFrame(quote)[["open", "high", "low", "close", "volume"]]
        return frame.dropna().tail(limit)

    async def ticker(self, symbol: str) -> dict:
        url = "https://query1.finance.yahoo.com/v7/finance/quote"
        async with httpx.AsyncClient(timeout=10) as client:
            payload = (await client.get(url, params={"symbols": symbol.upper()})).json()
        quote = payload["quoteResponse"]["result"][0]
        return {
            "symbol": symbol.upper(),
            "price": float(quote.get("regularMarketPrice", 0.0)),
            "change": float(quote.get("regularMarketChangePercent", 0.0)),
            "volume": float(quote.get("regularMarketVolume", 0.0)),
        }

    async def news(self, symbol: str) -> list[str]:
        settings = get_settings()
        if not settings.finnhub_api_key:
            return [f"Financial sentiment baseline for {symbol.upper()} due to missing API key"]
        async with httpx.AsyncClient(timeout=10) as client:
            payload = (
                await client.get(
                    "https://finnhub.io/api/v1/company-news",
                    params={
                        "symbol": symbol.upper(),
                        "from": (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat(),
                        "to": datetime.now(timezone.utc).date().isoformat(),
                        "token": settings.finnhub_api_key,
                    },
                )
            ).json()
        return [item.get("headline", "") for item in payload[:15] if item.get("headline")]

    async def market_movers(self) -> list[dict]:
        symbols = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TSLA", "META", "NFLX", "AMD", "INTC"]
        async with httpx.AsyncClient(timeout=10) as client:
            payload = (await client.get("https://query1.finance.yahoo.com/v7/finance/quote", params={"symbols": ",".join(symbols)})).json()
        quotes = payload.get("quoteResponse", {}).get("result", [])
        quotes = sorted(quotes, key=lambda x: abs(float(x.get("regularMarketChangePercent", 0))), reverse=True)[:10]
        return [
            {
                "symbol": q.get("symbol"),
                "change_pct": float(q.get("regularMarketChangePercent", 0.0)),
                "price": float(q.get("regularMarketPrice", 0.0)),
            }
            for q in quotes
        ]

    async def trending_assets(self) -> list[dict]:
        return await self.market_movers()


class AlphaVantageFallback(MarketProvider):
    async def candles(self, symbol: str, interval: str = "1h", limit: int = 240) -> pd.DataFrame:
        settings = get_settings()
        if not settings.alphavantage_api_key:
            raise RuntimeError("AlphaVantage API key missing")
        async with httpx.AsyncClient(timeout=10) as client:
            payload = (
                await client.get(
                    "https://www.alphavantage.co/query",
                    params={"function": "TIME_SERIES_INTRADAY", "symbol": symbol.upper(), "interval": "60min", "apikey": settings.alphavantage_api_key},
                )
            ).json()
        key = next((k for k in payload if "Time Series" in k), None)
        if not key:
            raise RuntimeError("No AlphaVantage candle payload")
        rows = []
        for val in payload[key].values():
            rows.append(
                {
                    "open": float(val["1. open"]),
                    "high": float(val["2. high"]),
                    "low": float(val["3. low"]),
                    "close": float(val["4. close"]),
                    "volume": float(val["5. volume"]),
                }
            )
        return pd.DataFrame(rows).tail(limit)

    async def ticker(self, symbol: str) -> dict:
        frame = await self.candles(symbol)
        close = float(frame["close"].iloc[-1])
        prev = float(frame["close"].iloc[-2])
        change = ((close - prev) / prev) * 100 if prev else 0
        return {"symbol": symbol.upper(), "price": close, "change": change, "volume": float(frame["volume"].iloc[-1])}

    async def news(self, symbol: str) -> list[str]:
        return [f"Fallback sentiment for {symbol.upper()}"]

    async def market_movers(self) -> list[dict]:
        return []

    async def trending_assets(self) -> list[dict]:
        return []


def provider_for(asset_type: str) -> MarketProvider:
    return BinanceProvider() if asset_type.lower() == "crypto" else YahooProvider()
