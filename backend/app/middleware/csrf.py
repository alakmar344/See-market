import secrets

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXEMPT_PREFIXES = {"/health", "/api/v1/auth/login", "/api/v1/auth/signup", "/api/v1/auth/forgot-password", "/api/v1/auth/refresh"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        csrf_cookie = request.cookies.get("csrf_token")

        if request.method in SAFE_METHODS:
            response = await call_next(request)
            if not csrf_cookie:
                response.set_cookie(
                    "csrf_token",
                    secrets.token_urlsafe(32),
                    httponly=False,
                    secure=True,
                    samesite="strict",
                )
            return response

        if any(request.url.path.startswith(prefix) for prefix in CSRF_EXEMPT_PREFIXES):
            return await call_next(request)

        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})

        return await call_next(request)
