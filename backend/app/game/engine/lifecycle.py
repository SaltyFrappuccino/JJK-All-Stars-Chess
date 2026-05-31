from __future__ import annotations

from app.game.engine.core import alive_pieces, clear_expired_terrain, kill_piece, other_side, terrain_at
from app.game.engine.models import MatchState


def resolve_check_after_action(state: MatchState) -> None:
    if not state.technique_check:
        return
    checked_side = state.technique_check.target_side
    sukuna = next((piece for piece in alive_pieces(state, checked_side) if piece.name == "Sukuna"), None)
    if sukuna is None:
        state.technique_check = None
        return
    source = state.pieces.get(state.technique_check.source_id)
    if not source or not source.alive:
        state.technique_check = None
        return
    if max(abs(source.x - sukuna.x), abs(source.y - sukuna.y)) > 3:
        state.technique_check = None


def end_turn(state: MatchState, acting_side: str, moved_piece_ids: list[str]) -> None:
    for piece_id, statuses in list(state.statuses.items()):
        piece = state.pieces.get(piece_id)
        if not piece or not piece.alive or piece.side != acting_side:
            continue
        next_statuses = []
        for status in statuses:
            if status.kind == "distortion":
                if piece_id not in moved_piece_ids:
                    kill_piece(state, piece_id, by_technique=True)
                    continue
            elif status.kind == "severed":
                center_x, center_y = status.data["center"]
                radius = status.data["radius"]
                if max(abs(piece.x - center_x), abs(piece.y - center_y)) <= radius:
                    kill_piece(state, piece_id, by_technique=True)
                    continue
            elif status.kind == "burn":
                if terrain_at(state, piece.x, piece.y, "lava"):
                    kill_piece(state, piece_id, by_technique=True)
                    continue
            status.turns -= 1
            if status.turns > 0:
                next_statuses.append(status)
        if next_statuses:
            state.statuses[piece_id] = next_statuses
        else:
            state.statuses.pop(piece_id, None)

    for terrain in state.terrains:
        terrain.turns -= 1
    if state.active_domain:
        state.active_domain.turns -= 1
    clear_expired_terrain(state)
    resolve_check_after_action(state)
    state.side_to_move = other_side(acting_side)
    state.turn_number += 1
    start_turn(state)


def start_turn(state: MatchState) -> None:
    side = state.side_to_move
    state.energy[side] = min(10, state.energy[side] + 2)
    if state.global_domain_lock[side] > 0:
        state.global_domain_lock[side] -= 1
    for piece in alive_pieces(state, side):
        if piece.cooldown > 0:
            piece.cooldown -= 1
