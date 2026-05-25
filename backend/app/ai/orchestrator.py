from __future__ import annotations

import json

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed

from app.ai.prompts import SYSTEM_PROMPT, build_prompt
from app.core.config import get_settings


class AIOrchestrator:
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
    async def analyze(self, structured_context: dict) -> dict:
        settings = get_settings()
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.openrouter_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_prompt(structured_context)},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        result = json.loads(content)

        factual_price = structured_context["price"]
        for key in ["market_summary", "short_term_outlook", "long_term_outlook"]:
            text = str(result.get(key, ""))
            if "price" in text.lower() and str(factual_price) not in text:
                result[key] = text.replace("price", f"latest validated price ({factual_price})")

        return result
