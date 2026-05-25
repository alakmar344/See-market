from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import Any

from app.core.config import get_settings


class CacheService:
    def __init__(self) -> None:
        settings = get_settings()
        self._cache_dir = Path(settings.cache_dir)
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            cached = self._memory.get(key)
            if cached and cached[0] > time.time():
                return cached[1]
            if cached:
                self._memory.pop(key, None)

        file_path = self._cache_dir / f"{key}.json"
        if not file_path.exists():
            return None

        try:
            payload = json.loads(file_path.read_text())
        except json.JSONDecodeError:
            return None

        if payload.get("expires_at", 0) < time.time():
            file_path.unlink(missing_ok=True)
            return None

        return payload.get("value")

    async def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        expires_at = time.time() + ttl_seconds
        async with self._lock:
            self._memory[key] = (expires_at, value)

        file_path = self._cache_dir / f"{key}.json"
        file_path.write_text(json.dumps({"expires_at": expires_at, "value": value}))


cache_service = CacheService()
