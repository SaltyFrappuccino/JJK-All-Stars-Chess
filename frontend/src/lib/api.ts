import type { GameAction, MatchState } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export type Session = {
  guest_id: string;
  token: string;
  display_name: string;
};

export async function createGuestSession(displayName: string): Promise<Session> {
  const response = await fetch(`${API_URL}/api/guest-sessions?display_name=${encodeURIComponent(displayName)}`, {
    method: "POST",
  });
  return response.json();
}

export async function createRoom(token: string, displayName: string) {
  const response = await fetch(`${API_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, display_name: displayName }),
  });
  return response.json();
}

export async function joinRoom(token: string, roomCode: string, displayName: string) {
  const response = await fetch(`${API_URL}/api/rooms/${roomCode}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, display_name: displayName }),
  });
  return response.json();
}

export async function createBotMatch(token: string, displayName: string, side: "white" | "black") {
  const response = await fetch(`${API_URL}/api/bot-matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, display_name: displayName, side }),
  });
  return response.json();
}

export async function fetchHistory(token: string) {
  const response = await fetch(`${API_URL}/api/history?token=${encodeURIComponent(token)}`);
  return response.json();
}

export async function fetchReplay(matchId: string) {
  const response = await fetch(`${API_URL}/api/matches/${matchId}/replay`);
  return response.json();
}

export function connectMatchSocket(
  matchId: string,
  token: string,
  handlers: {
    onSnapshot: (state: MatchState) => void;
    onLegalActions: (pieceId: string, actions: GameAction[]) => void;
    onActionResolved: (state: MatchState) => void;
    onInvalidAction: (message: string) => void;
  },
): WebSocket {
  const url = new URL(`${API_URL.replace("http", "ws")}/ws/matches/${matchId}`);
  url.searchParams.set("token", token);
  const socket = new WebSocket(url);
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data) as { type: string; payload: any };
    if (message.type === "match_snapshot") {
      handlers.onSnapshot(message.payload.state);
    }
    if (message.type === "legal_actions") {
      handlers.onLegalActions(message.payload.piece_id, message.payload.actions);
    }
    if (message.type === "action_resolved") {
      handlers.onActionResolved(message.payload.state);
    }
    if (message.type === "invalid_action") {
      handlers.onInvalidAction(message.payload.message);
    }
  };
  return socket;
}

function sendIfOpen(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function requestLegalActions(socket: WebSocket, pieceId: string) {
  return sendIfOpen(socket, { type: "request_legal_actions", payload: { piece_id: pieceId } });
}

export function submitAction(socket: WebSocket, action: GameAction) {
  return sendIfOpen(socket, { type: "submit_action", payload: { action } });
}

export function requestSync(socket: WebSocket) {
  return sendIfOpen(socket, { type: "sync_request", payload: {} });
}
