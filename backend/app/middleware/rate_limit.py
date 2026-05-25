import time
from collections import defaultdict

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window_seconds
        self.bucket: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        self.bucket[ip] = [ts for ts in self.bucket[ip] if now - ts <= self.window]
        if len(self.bucket[ip]) >= self.limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        self.bucket[ip].append(now)
        return await call_next(request)
