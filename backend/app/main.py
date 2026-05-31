from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import BotMatchRequest, GuestSessionResponse, RoomCreateRequest, RoomJoinRequest
from app.game.engine.engine import EngineError
from app.services.match_service import match_service
from app.storage.db import Base, engine
from app.storage.repository import create_guest, get_guest_by_token, get_match, list_history


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/guest-sessions", response_model=GuestSessionResponse)
def post_guest_session(display_name: str = "Player") -> GuestSessionResponse:
    guest = create_guest(display_name)
    return GuestSessionResponse(guest_id=guest.id, token=guest.token, display_name=guest.display_name)


@app.post("/api/rooms")
def create_room(payload: RoomCreateRequest):
    guest = get_guest_by_token(payload.token)
    if not guest:
        raise HTTPException(status_code=401, detail="Invalid token")
    room_code, match_id = match_service.create_pvp_match(guest.id)
    return {"room_code": room_code, "match_id": match_id, "side": "white"}


@app.post("/api/rooms/{room_code}/join")
def join_room(room_code: str, payload: RoomJoinRequest):
    guest = get_guest_by_token(payload.token)
    if not guest:
        raise HTTPException(status_code=401, detail="Invalid token")
    room_code, match_id = match_service.join_pvp_room(room_code, guest.id)
    return {"room_code": room_code, "match_id": match_id, "side": "black"}


@app.post("/api/bot-matches")
def create_bot_match(payload: BotMatchRequest):
    guest = get_guest_by_token(payload.token)
    if not guest:
        raise HTTPException(status_code=401, detail="Invalid token")
    match_id = match_service.create_bot_match(guest.id, payload.side)
    return {"match_id": match_id, "side": payload.side}


@app.get("/api/matches/{match_id}")
def get_match_endpoint(match_id: str):
    match = get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return {
        "match_id": match.id,
        "status": match.status,
        "winner": match.winner,
        "winner_reason": match.winner_reason,
        "snapshot": match.snapshot,
    }


@app.get("/api/matches/{match_id}/replay")
def get_match_replay(match_id: str):
    match = get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"match_id": match.id, "replay_log": match.replay_log}


@app.get("/api/history")
def get_history(token: str):
    guest = get_guest_by_token(token)
    if not guest:
        raise HTTPException(status_code=401, detail="Invalid token")
    matches = list_history(guest.id)
    return [
        {
            "match_id": match.id,
            "status": match.status,
            "winner": match.winner,
            "winner_reason": match.winner_reason,
            "updated_at": match.updated_at.isoformat(),
            "room_code": match.room_code,
        }
        for match in matches
    ]


@app.websocket("/ws/matches/{match_id}")
async def match_socket(websocket: WebSocket, match_id: str, token: str):
    guest = get_guest_by_token(token)
    if not guest:
        await websocket.close(code=4401)
        return
    session = await match_service.connect(match_id, guest.id, websocket)
    await websocket.send_json({"type": "match_snapshot", "payload": {"state": session.state.to_public()}})
    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")
            if message_type == "sync_request":
                await websocket.send_json({"type": "match_snapshot", "payload": {"state": session.state.to_public()}})
            elif message_type == "request_legal_actions":
                piece_id = message["payload"]["piece_id"]
                actions = match_service.legal_actions_for_piece(match_id, piece_id)
                await websocket.send_json({"type": "legal_actions", "payload": {"piece_id": piece_id, "actions": actions}})
            elif message_type == "submit_action":
                try:
                    await match_service.handle_action(match_id, message["payload"]["action"])
                except EngineError as exc:
                    await websocket.send_json({"type": "invalid_action", "payload": {"message": str(exc)}})
            elif message_type == "resign":
                await match_service.handle_action(match_id, {"kind": "resign"})
    except WebSocketDisconnect:
        match_service.disconnect(session, guest.id, websocket)
