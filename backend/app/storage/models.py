from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.storage.db import Base


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MatchRecord(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    room_code: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    white_guest_id: Mapped[str | None] = mapped_column(String, nullable=True)
    black_guest_id: Mapped[str | None] = mapped_column(String, nullable=True)
    bot_side: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")
    winner: Mapped[str | None] = mapped_column(String, nullable=True)
    winner_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    snapshot: Mapped[dict] = mapped_column(JSON)
    replay_log: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RoomRecord(Base):
    __tablename__ = "rooms"

    code: Mapped[str] = mapped_column(String, primary_key=True)
    match_id: Mapped[str] = mapped_column(String, index=True)
    white_guest_id: Mapped[str] = mapped_column(String)
    black_guest_id: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="waiting")
