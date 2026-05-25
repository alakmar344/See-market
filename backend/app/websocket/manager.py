from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        self.connections[channel].discard(websocket)

    async def publish(self, channel: str, payload: dict) -> None:
        stale: list[WebSocket] = []
        for ws in self.connections[channel]:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.connections[channel].discard(ws)


manager = ConnectionManager()
