import type { GameAction, MatchState } from "./types";
import { normalizeGameAction } from "./actions";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export type Session = {
  guest_id: string;
  token: string;
  display_name: string;
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.detail === "string" ? payload.detail : "Ошибка запроса.";
    throw new Error(message);
  }
  return payload as T;
}

export async function createGuestSession(displayName: string): Promise<Session> {
  return fetchJson<Session>(`${API_URL}/api/guest-sessions?display_name=${encodeURIComponent(displayName)}`, {
    method: "POST",
  });
}

export async function createRoom(token: string, displayName: string) {
  return fetchJson<{ room_code: string; match_id: string; side: "white" | "black" }>(`${API_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, display_name: displayName }),
  });
}

export async function joinRoom(token: string, roomCode: string, displayName: string) {
  return fetchJson<{ room_code: string; match_id: string; side: "white" | "black" }>(`${API_URL}/api/rooms/${roomCode}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, display_name: displayName }),
  });
}

export async function createBotMatch(token: string, displayName: string, side: "white" | "black") {
  return fetchJson<{ match_id: string; side: "white" | "black" }>(`${API_URL}/api/bot-matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, display_name: displayName, side }),
  });
}

export async function fetchHistory(token: string) {
  return fetchJson(`${API_URL}/api/history?token=${encodeURIComponent(token)}`);
}

export async function fetchReplay(matchId: string) {
  return fetchJson<{ match_id: string; replay_log: Array<Record<string, unknown>> }>(`${API_URL}/api/matches/${matchId}/replay`);
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
    let message: { type: string; payload: Record<string, unknown> };
    try {
      message = JSON.parse(event.data) as { type: string; payload: Record<string, unknown> };
    } catch {
      handlers.onInvalidAction("Получено повреждённое сообщение от сервера.");
      return;
    }
    if (message.type === "match_snapshot") {
      handlers.onSnapshot(message.payload.state as MatchState);
    }
    if (message.type === "legal_actions") {
      handlers.onLegalActions(String(message.payload.piece_id), message.payload.actions as GameAction[]);
    }
    if (message.type === "action_resolved") {
      handlers.onActionResolved(message.payload.state as MatchState);
    }
    if (message.type === "invalid_action") {
      handlers.onInvalidAction(String(message.payload.message ?? "Некорректное действие."));
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
  return sendIfOpen(socket, { type: "submit_action", payload: { action: normalizeGameAction(action) } });
}

export function requestSync(socket: WebSocket) {
  return sendIfOpen(socket, { type: "sync_request", payload: {} });
}
