from __future__ import annotations

import json
from collections.abc import AsyncGenerator

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed

from app.ai.prompts import SYSTEM_PROMPT, build_prompt
from app.core.config import get_settings


class AIOrchestrator:
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
    async def analyze(self, structured_context: dict) -> dict:
        settings = get_settings()
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemma_model}:generateContent?key={settings.google_api_key}"
        )
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": build_prompt(structured_context)}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()

        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(text)

        factual_price = structured_context["price"]
        for key in ["market_summary", "short_term_outlook", "long_term_outlook"]:
            msg = str(result.get(key, ""))
            if "price" in msg.lower() and str(factual_price) not in msg:
                result[key] = msg.replace("price", f"validated market price ({factual_price})")
        return result

    async def stream_analyze(self, structured_context: dict) -> AsyncGenerator[str, None]:
        result = await self.analyze(structured_context)
        serialized = json.dumps(result)
        chunk_size = 80
        for idx in range(0, len(serialized), chunk_size):
            yield serialized[idx : idx + chunk_size]
