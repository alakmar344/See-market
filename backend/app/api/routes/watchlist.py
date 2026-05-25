from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import Watchlist

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("")
async def list_watchlist(user_id: int = 1, db: AsyncSession = Depends(get_db)) -> dict:
    rows = (await db.scalars(select(Watchlist).where(Watchlist.user_id == user_id).order_by(Watchlist.created_at.desc()))).all()
    return {"items": [{"id": row.id, "symbol": row.symbol, "created_at": row.created_at.isoformat()} for row in rows]}


@router.post("")
async def add_watchlist(symbol: str, user_id: int = 1, db: AsyncSession = Depends(get_db)) -> dict:
    item = Watchlist(user_id=user_id, symbol=symbol.upper())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "symbol": item.symbol}


@router.delete("/{symbol}")
async def remove_watchlist(symbol: str, user_id: int = 1, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(delete(Watchlist).where(Watchlist.user_id == user_id, Watchlist.symbol == symbol.upper()))
    await db.commit()
    return {"removed": symbol.upper()}
