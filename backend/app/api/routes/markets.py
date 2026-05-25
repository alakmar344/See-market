from fastapi import APIRouter, HTTPException

from app.services.market_service import MarketAnalysisService
from app.utils.sanitize import sanitize_text

router = APIRouter(prefix="/markets", tags=["markets"])
service = MarketAnalysisService()


@router.get("/{symbol}")
async def market_snapshot(symbol: str, asset_type: str = "stock") -> dict:
    try:
        return await service.analyze(symbol=sanitize_text(symbol), question="Market snapshot", asset_type=sanitize_text(asset_type))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Market provider failure: {exc}") from exc


@router.post("/analyze")
async def market_analyze(symbol: str, question: str, asset_type: str = "stock") -> dict:
    try:
        return await service.analyze(
            symbol=sanitize_text(symbol),
            question=sanitize_text(question),
            asset_type=sanitize_text(asset_type),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}") from exc


@router.get("/trending/list")
async def trending_assets(asset_type: str = "stock") -> dict:
    return {"items": await service.trending(sanitize_text(asset_type))}


@router.get("/movers/list")
async def market_movers(asset_type: str = "stock") -> dict:
    return {"items": await service.movers(sanitize_text(asset_type))}
