from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict

from fastapi import WebSocket

from app.game.engine.engine import EngineError, apply_action, bot_action, create_engine_state, get_piece_legal_actions
from app.game.engine.models import MatchState
from app.storage import repository


class MatchSession:
    def __init__(self, match_id: str, state: MatchState, white_guest_id: str | None, black_guest_id: str | None, bot_side: str | None = None):
        self.match_id = match_id
        self.state = state
        self.white_guest_id = white_guest_id
        self.black_guest_id = black_guest_id
        self.bot_side = bot_side
        self.connections: dict[str, list[WebSocket]] = defaultdict(list)


class MatchService:
    def __init__(self) -> None:
        self.sessions: dict[str, MatchSession] = {}

    def create_pvp_match(self, white_guest_id: str) -> tuple[str, str]:
        match_id = str(uuid.uuid4())
        state = create_engine_state()
        repository.create_match(match_id, state.to_public(), white_guest_id, None)
        room = repository.create_room(match_id, white_guest_id)
        self.sessions[match_id] = MatchSession(match_id, state, white_guest_id, None)
        return room.code, match_id

    def join_pvp_room(self, room_code: str, black_guest_id: str) -> tuple[str, str]:
        room = repository.save_room_join(room_code, black_guest_id)
        session = self.sessions[room.match_id]
        session.black_guest_id = black_guest_id
        repository.update_match(room.match_id, session.state.to_public(), session.state.event_log, None, None)
        return room.code, room.match_id

    def create_bot_match(self, player_guest_id: str, player_side: str) -> str:
        match_id = str(uuid.uuid4())
        state = create_engine_state()
        white_guest_id = player_guest_id if player_side == "white" else None
        black_guest_id = player_guest_id if player_side == "black" else None
        bot_side = "black" if player_side == "white" else "white"
        repository.create_match(match_id, state.to_public(), white_guest_id, black_guest_id, bot_side=bot_side)
        self.sessions[match_id] = MatchSession(match_id, state, white_guest_id, black_guest_id, bot_side=bot_side)
        return match_id

    def get_session(self, match_id: str) -> MatchSession:
        session = self.sessions.get(match_id)
        if session:
            return session
        record = repository.get_match(match_id)
        if not record:
            raise KeyError(match_id)
        state = create_engine_state()
        state = hydrate_state(record.snapshot)
        session = MatchSession(match_id, state, record.white_guest_id, record.black_guest_id, record.bot_side)
        self.sessions[match_id] = session
        return session

    async def connect(self, match_id: str, guest_id: str, websocket: WebSocket) -> MatchSession:
        session = self.get_session(match_id)
        await websocket.accept()
        session.connections[guest_id].append(websocket)
        return session

    def disconnect(self, session: MatchSession, guest_id: str, websocket: WebSocket) -> None:
        if guest_id in session.connections and websocket in session.connections[guest_id]:
            session.connections[guest_id].remove(websocket)

    async def broadcast(self, session: MatchSession, message_type: str, payload: dict) -> None:
        dead: list[tuple[str, WebSocket]] = []
        for guest_id, sockets in session.connections.items():
            for socket in sockets:
                try:
                    await socket.send_json({"type": message_type, "payload": payload})
                except Exception:
                    dead.append((guest_id, socket))
        for guest_id, socket in dead:
            self.disconnect(session, guest_id, socket)

    async def handle_action(self, match_id: str, action: dict) -> MatchSession:
        session = self.get_session(match_id)
        session.state = apply_action(session.state, action)
        repository.update_match(
            match_id,
            session.state.to_public(),
            session.state.event_log,
            session.state.winner,
            session.state.winner_reason,
        )
        await self.broadcast(session, "action_resolved", {"state": session.state.to_public(), "events": session.state.event_log[-4:]})
        if session.bot_side and session.state.side_to_move == session.bot_side and not session.state.winner:
            await asyncio.sleep(0.1)
            try:
                chosen_action = bot_action(session.state, session.bot_side)
            except Exception:
                chosen_action = {"kind": "resign"}
            session.state = apply_action(session.state, chosen_action)
            repository.update_match(
                match_id,
                session.state.to_public(),
                session.state.event_log,
                session.state.winner,
                session.state.winner_reason,
            )
            await self.broadcast(session, "action_resolved", {"state": session.state.to_public(), "events": session.state.event_log[-4:]})
        return session

    def legal_actions_for_piece(self, match_id: str, piece_id: str) -> list[dict]:
        session = self.get_session(match_id)
        return get_piece_legal_actions(session.state, piece_id)


def hydrate_state(payload: dict) -> MatchState:
    state = create_engine_state()
    from app.game.engine.models import ActiveDomain, MatchState, Piece, Status, Terrain, TechniqueCheck

    pieces = {piece_id: Piece(**piece_data) for piece_id, piece_data in payload["pieces"].items()}
    statuses = {piece_id: [Status(**status) for status in items] for piece_id, items in payload.get("statuses", {}).items()}
    terrains = [Terrain(**terrain) for terrain in payload.get("terrains", [])]
    active_domain = ActiveDomain(**payload["active_domain"]) if payload.get("active_domain") else None
    technique_check = TechniqueCheck(**payload["technique_check"]) if payload.get("technique_check") else None
    return MatchState(
        pieces=pieces,
        side_to_move=payload["side_to_move"],
        energy=payload["energy"],
        statuses=statuses,
        terrains=terrains,
        global_domain_lock=payload["global_domain_lock"],
        active_domain=active_domain,
        last_backline_technique=payload["last_backline_technique"],
        technique_check=technique_check,
        winner=payload.get("winner"),
        winner_reason=payload.get("winner_reason"),
        turn_number=payload.get("turn_number", 1),
        event_log=payload.get("event_log", []),
    )


match_service = MatchService()
