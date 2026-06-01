from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class GuestSessionResponse(BaseModel):
    guest_id: str
    token: str
    display_name: str


class RoomCreateRequest(BaseModel):
    token: str
    display_name: str


class RoomJoinRequest(BaseModel):
    token: str
    display_name: str


class BotMatchRequest(BaseModel):
    token: str
    display_name: str
    side: Literal["white", "black"] = "white"


class RoomResponse(BaseModel):
    room_code: str
    match_id: str
    side: Literal["white", "black"]


class ActionEnvelope(BaseModel):
    kind: Literal["normal_move", "technique_cast", "domain_cast", "resign"]
    piece_id: str | None = None
    to: list[int] | None = None
    targets: list[str] | None = None
    cells: list[list[int]] | None = None


class MatchEnvelope(BaseModel):
    type: str
    payload: dict[str, Any]
