const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

export function createMarketSocket(channel: string) {
  return new WebSocket(`${WS_URL}/api/v1/chat/stream/${channel}`);
}
