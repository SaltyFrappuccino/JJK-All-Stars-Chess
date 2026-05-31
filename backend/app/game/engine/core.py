from __future__ import annotations

from dataclasses import asdict
from typing import Any

from app.game.engine.models import MatchState, Piece, Status, Terrain, TechniqueCheck
from app.game.engine.setup import create_initial_state


def other_side(side: str) -> str:
    return "black" if side == "white" else "white"


def in_bounds(x: int, y: int) -> bool:
    return 0 <= x < 8 and 0 <= y < 8


def direction_for_side(side: str) -> int:
    return -1 if side == "white" else 1


def piece_at(state: MatchState, x: int, y: int) -> Piece | None:
    for piece in state.pieces.values():
        if piece.alive and piece.x == x and piece.y == y:
            return piece
    return None


def alive_pieces(state: MatchState, side: str | None = None) -> list[Piece]:
    return [piece for piece in state.pieces.values() if piece.alive and (side is None or piece.side == side)]


def get_statuses(state: MatchState, piece_id: str) -> list[Status]:
    return state.statuses.setdefault(piece_id, [])


def has_status(state: MatchState, piece_id: str, kind: str) -> bool:
    return any(status.kind == kind for status in state.statuses.get(piece_id, []))


def add_status(
    state: MatchState,
    piece_id: str,
    kind: str,
    turns: int,
    source_id: str | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    get_statuses(state, piece_id).append(Status(kind=kind, turns=turns, source_id=source_id, data=data or {}))


def remove_status(state: MatchState, piece_id: str, kind: str) -> None:
    state.statuses[piece_id] = [status for status in state.statuses.get(piece_id, []) if status.kind != kind]
    if not state.statuses[piece_id]:
        state.statuses.pop(piece_id, None)


def add_event(state: MatchState, kind: str, **data: Any) -> None:
    state.event_log.append({"kind": kind, **data})


def piece_side_from_id(piece_id: str) -> str | None:
    if piece_id.startswith("white_"):
        return "white"
    if piece_id.startswith("black_"):
        return "black"
    return None


def square_blocked_by_terrain(state: MatchState, x: int, y: int) -> bool:
    for terrain in state.terrains:
        if terrain.x == x and terrain.y == y and terrain.kind in {"lava", "rika", "shikigami"}:
            return True
    return False


def can_stand_on(state: MatchState, x: int, y: int) -> bool:
    return in_bounds(x, y) and piece_at(state, x, y) is None and not square_blocked_by_terrain(state, x, y)


def terrain_at(state: MatchState, x: int, y: int, kind: str | None = None) -> list[Terrain]:
    result: list[Terrain] = []
    for terrain in state.terrains:
        if terrain.x == x and terrain.y == y and (kind is None or terrain.kind == kind):
            result.append(terrain)
    return result


def clear_expired_terrain(state: MatchState) -> None:
    state.terrains = [terrain for terrain in state.terrains if terrain.turns > 0]
    if state.active_domain and state.active_domain.turns <= 0:
        state.active_domain = None


def kill_piece(state: MatchState, piece_id: str, killer_side: str | None = None, by_technique: bool = False) -> None:
    piece = state.pieces[piece_id]
    if not piece.alive:
        return
    if piece.name == "Sukuna" and by_technique:
        state.technique_check = TechniqueCheck(target_side=piece.side, source_id=piece_id if killer_side is None else "", ability="technique")
        return
    piece.alive = False
    remove_status(state, piece_id, "marked")
    add_event(state, "piece_killed", piece_id=piece_id)
    if killer_side:
        state.energy[killer_side] = min(10, state.energy[killer_side] + 1)
    if piece.name == "Sukuna":
        state.winner = other_side(piece.side)
        state.winner_reason = "sukuna_captured"


def remove_terrain(state: MatchState, x: int, y: int, kind: str | None = None) -> None:
    state.terrains = [
        terrain for terrain in state.terrains if not (terrain.x == x and terrain.y == y and (kind is None or terrain.kind == kind))
    ]


def create_engine_state() -> MatchState:
    return create_initial_state()


def serialize_piece(piece: Piece) -> dict[str, Any]:
    return asdict(piece)
