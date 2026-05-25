from datetime import timedelta
from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_token, hash_password, verify_password
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    secure_cookie = settings.app_env == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure_cookie,
        samesite="strict",
        max_age=int(timedelta(minutes=settings.access_token_minutes).total_seconds()),
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="strict",
        max_age=int(timedelta(minutes=settings.refresh_token_minutes).total_seconds()),
    )


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: SignupRequest, response: Response, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_token(str(user.id), "access", settings.access_token_minutes)
    refresh_token = create_token(str(user.id), "refresh", settings.refresh_token_minutes)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= 5:
                user.is_locked = True
            await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.is_locked:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Account locked")

    user.failed_attempts = 0
    await db.commit()

    access_token = create_token(str(user.id), "access", settings.access_token_minutes)
    refresh_token = create_token(str(user.id), "refresh", settings.refresh_token_minutes)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(response: Response, user_id: str = "1") -> TokenResponse:
    access_token = create_token(user_id, "access", settings.access_token_minutes)
    refresh_token = create_token(user_id, "refresh", settings.refresh_token_minutes)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/forgot-password")
async def forgot_password(email: str, db: AsyncSession = Depends(get_db)) -> dict:
    user = await db.scalar(select(User).where(User.email == email.lower()))
    if not user:
        return {"message": "If the account exists, a reset link has been generated."}

    reset_token = token_urlsafe(32)
    return {
        "message": "Password reset initiated. Deliver this token through your email provider in production.",
        "reset_token": reset_token,
    }
