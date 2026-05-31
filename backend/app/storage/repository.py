from __future__ import annotations

import secrets
import string
import uuid

from sqlalchemy import select

from app.storage.db import SessionLocal
from app.storage.models import Guest, MatchRecord, RoomRecord


def create_guest(display_name: str) -> Guest:
    with SessionLocal() as session:
        guest = Guest(id=str(uuid.uuid4()), token=secrets.token_urlsafe(24), display_name=display_name)
        session.add(guest)
        session.commit()
        session.refresh(guest)
        return guest


def get_guest_by_token(token: str) -> Guest | None:
    with SessionLocal() as session:
        return session.scalar(select(Guest).where(Guest.token == token))


def create_room(match_id: str, white_guest_id: str) -> RoomRecord:
    alphabet = string.ascii_uppercase + string.digits
    with SessionLocal() as session:
        room = RoomRecord(code="".join(secrets.choice(alphabet) for _ in range(6)), match_id=match_id, white_guest_id=white_guest_id)
        session.add(room)
        session.commit()
        session.refresh(room)
        return room


def get_room(room_code: str) -> RoomRecord | None:
    with SessionLocal() as session:
        return session.get(RoomRecord, room_code)


def save_room_join(room_code: str, black_guest_id: str) -> RoomRecord:
    with SessionLocal() as session:
        room = session.get(RoomRecord, room_code)
        room.black_guest_id = black_guest_id
        room.status = "ready"
        session.commit()
        session.refresh(room)
        return room


def create_match(match_id: str, snapshot: dict, white_guest_id: str | None, black_guest_id: str | None, room_code: str | None = None, bot_side: str | None = None) -> MatchRecord:
    with SessionLocal() as session:
        match = MatchRecord(
            id=match_id,
            room_code=room_code,
            white_guest_id=white_guest_id,
            black_guest_id=black_guest_id,
            bot_side=bot_side,
            snapshot=snapshot,
            replay_log=[],
        )
        session.add(match)
        session.commit()
        session.refresh(match)
        return match


def update_match(match_id: str, snapshot: dict, replay_log: list, winner: str | None, winner_reason: str | None) -> MatchRecord:
    with SessionLocal() as session:
        match = session.get(MatchRecord, match_id)
        match.snapshot = snapshot
        match.replay_log = replay_log
        match.winner = winner
        match.winner_reason = winner_reason
        match.status = "finished" if winner else "active"
        session.commit()
        session.refresh(match)
        return match


def get_match(match_id: str) -> MatchRecord | None:
    with SessionLocal() as session:
        return session.get(MatchRecord, match_id)


def list_history(guest_id: str) -> list[MatchRecord]:
    with SessionLocal() as session:
        rows = session.scalars(
            select(MatchRecord).where(
                (MatchRecord.white_guest_id == guest_id) | (MatchRecord.black_guest_id == guest_id)
            ).order_by(MatchRecord.updated_at.desc())
        )
        return list(rows)
