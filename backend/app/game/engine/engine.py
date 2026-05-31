from __future__ import annotations

from typing import Any

from app.game.engine.bot import bot_action
from app.game.engine.core import alive_pieces, create_engine_state, has_status, other_side, serialize_piece
from app.game.engine.effects import apply_domain_effect, apply_technique_effect, move_piece
from app.game.engine.legal import domain_cost, legal_domain_actions, legal_normal_moves, legal_technique_actions, technique_cost
from app.game.engine.lifecycle import end_turn
from app.game.engine.models import MatchState


class EngineError(ValueError):
    pass


def get_piece_legal_actions(state: MatchState, piece_id: str) -> list[dict[str, Any]]:
    piece = state.pieces[piece_id]
    if not piece.alive or piece.side != state.side_to_move:
        return []
    if has_status(state, piece.id, "paralysis") or has_status(state, piece.id, "stop") or has_status(state, piece.id, "domination"):
        return []
    actions = legal_normal_moves(state, piece) + legal_technique_actions(state, piece) + legal_domain_actions(state, piece)
    if state.technique_check and state.technique_check.target_side == state.side_to_move:
        filtered = []
        for action in actions:
            next_state = apply_action(state.clone(), action, validate=False)
            if next_state.technique_check is None or next_state.technique_check.target_side != state.side_to_move:
                filtered.append(action)
        return filtered
    return actions


def get_all_legal_actions(state: MatchState, side: str | None = None) -> list[dict[str, Any]]:
    current = side or state.side_to_move
    result: list[dict[str, Any]] = []
    if state.winner:
        return result
    for piece in alive_pieces(state, current):
        result.extend(get_piece_legal_actions(state, piece.id))
    result.append({"kind": "resign"})
    return result


def validate_action_shape(action: dict[str, Any]) -> None:
    if action["kind"] not in {"normal_move", "technique_cast", "domain_cast", "resign"}:
        raise EngineError("РќРµРёР·РІРµСЃС‚РЅС‹Р№ С‚РёРї РґРµР№СЃС‚РІРёСЏ")


def apply_action(state: MatchState, action: dict[str, Any], validate: bool = True) -> MatchState:
    validate_action_shape(action)
    if state.winner:
        raise EngineError("РњР°С‚С‡ СѓР¶Рµ Р·Р°РІРµСЂС€С‘РЅ")
    if action["kind"] == "resign":
        state.winner = other_side(state.side_to_move)
        state.winner_reason = "resign"
        state.event_log.append({"kind": "resign", "side": state.side_to_move})
        return state

    piece = state.pieces[action["piece_id"]]
    if validate:
        legal_actions = get_piece_legal_actions(state, piece.id)
        normalized = [str(item) for item in legal_actions]
        if str(action) not in normalized:
            raise EngineError("РќРµРґРѕРїСѓСЃС‚РёРјРѕРµ РґРµР№СЃС‚РІРёРµ")

    moved_piece_ids: list[str] = []
    if action["kind"] == "normal_move":
        x, y = action["to"]
        moved_piece_ids = move_piece(state, piece, x, y, killer_side=piece.side)
    elif action["kind"] == "technique_cast":
        state.energy[piece.side] -= technique_cost(piece)
        piece.technique_used = True if piece.role == "pawn" else piece.technique_used
        if piece.role != "pawn":
            piece.cooldown = 1
        apply_technique_effect(state, piece, action, moved_piece_ids)
        state.event_log.append({"kind": "technique_cast", "piece_id": piece.id, "action": action})
    elif action["kind"] == "domain_cast":
        state.energy[piece.side] -= domain_cost(piece)
        piece.domain_used = True
        state.global_domain_lock[piece.side] = 3
        apply_domain_effect(state, piece, action, moved_piece_ids)
        state.event_log.append({"kind": "domain_cast", "piece_id": piece.id, "action": action})

    if piece.name == "Sukuna" and state.technique_check and state.technique_check.target_side == piece.side:
        state.technique_check = None
    end_turn(state, piece.side, moved_piece_ids)
    return state
