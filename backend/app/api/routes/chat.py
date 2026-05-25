from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.ai.orchestrator import AIOrchestrator
from app.services.market_service import MarketAnalysisService
from app.utils.sanitize import sanitize_text
from app.websocket.manager import manager

router = APIRouter(prefix="/chat", tags=["chat"])
market_service = MarketAnalysisService()
ai = AIOrchestrator()


@router.post("/analyze")
async def chat_analyze(symbol: str, question: str, asset_type: str = "stock") -> dict:
    context = await market_service.analyze(sanitize_text(symbol), sanitize_text(question), sanitize_text(asset_type))
    try:
        ai_response = await ai.analyze(context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service failure: {exc}") from exc
    return {"context": context, "analysis": ai_response}


@router.websocket("/stream/{channel}")
async def stream_analysis(websocket: WebSocket, channel: str):
    await manager.connect(channel, websocket)
    try:
        while True:
            payload = await websocket.receive_json()
            symbol = sanitize_text(payload.get("symbol", "BTC"))
            question = sanitize_text(payload.get("question", "Market update"))
            asset_type = sanitize_text(payload.get("asset_type", "crypto"))
            context = await market_service.analyze(symbol, question, asset_type)
            ai_response = await ai.analyze(context)
            await manager.publish(channel, {"context": context, "analysis": ai_response})
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)
