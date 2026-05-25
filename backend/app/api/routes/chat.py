import json

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestrator import AIOrchestrator
from app.db.session import get_db
from app.models.entities import Chat
from app.services.market_service import MarketAnalysisService
from app.utils.sanitize import sanitize_text
from app.websocket.manager import manager

router = APIRouter(prefix="/chat", tags=["chat"])
market_service = MarketAnalysisService()
ai = AIOrchestrator()


@router.post("/analyze")
async def chat_analyze(symbol: str, question: str, asset_type: str = "stock", user_id: int = 1, db: AsyncSession = Depends(get_db)) -> dict:
    context = await market_service.analyze(sanitize_text(symbol), sanitize_text(question), sanitize_text(asset_type))
    try:
        ai_response = await ai.analyze(context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service failure: {exc}") from exc

    db.add(Chat(user_id=user_id, symbol=context["symbol"], question=context["question"], answer=json.dumps(ai_response)))
    await db.commit()
    return {"context": context, "analysis": ai_response}


@router.get("/saved")
async def saved_chats(user_id: int = 1, db: AsyncSession = Depends(get_db)) -> dict:
    chats = (await db.scalars(select(Chat).where(Chat.user_id == user_id).order_by(Chat.created_at.desc()))).all()
    return {
        "items": [
            {
                "id": chat.id,
                "symbol": chat.symbol,
                "question": chat.question,
                "answer": chat.answer,
                "created_at": chat.created_at.isoformat(),
            }
            for chat in chats
        ]
    }


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

            await manager.publish(channel, {"type": "context", "payload": context})
            assembled = ""
            async for chunk in ai.stream_analyze(context):
                assembled += chunk
                await manager.publish(channel, {"type": "delta", "payload": chunk})
            await manager.publish(channel, {"type": "complete", "payload": assembled})
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)
