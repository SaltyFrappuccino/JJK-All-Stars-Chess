from __future__ import annotations

from app.game.engine.constants import PIECE_VALUES
from app.game.engine.core import alive_pieces, other_side, piece_at, piece_side_from_id
from app.game.engine.models import MatchState


def evaluate_state(state: MatchState, perspective: str) -> float:
    if state.winner == perspective:
        return 10000
    if state.winner == other_side(perspective):
        return -10000
    score = state.energy[perspective] - state.energy[other_side(perspective)]
    for piece in alive_pieces(state):
        value = PIECE_VALUES[piece.role]
        if piece.name == "Mahoraga":
            value = 6
        score += value if piece.side == perspective else -value
        if piece.cooldown == 0 and piece.role != "pawn":
            score += 0.2 if piece.side == perspective else -0.2
    score += 2 if state.technique_check and state.technique_check.target_side == other_side(perspective) else 0
    return score


def recent_repeat_penalty(state: MatchState, side: str, action: dict[str, object]) -> float:
    if action["kind"] != "normal_move" or "piece_id" not in action or "to" not in action:
        return 0.0

    latest_same_side_move: dict[str, object] | None = None
    for event in reversed(state.event_log):
        if event.get("kind") != "piece_moved":
            continue
        piece_id = event.get("piece_id")
        if not isinstance(piece_id, str) or piece_side_from_id(piece_id) != side:
            continue
        latest_same_side_move = event
        break

    if not latest_same_side_move:
        return 0.0

    penalty = 0.0
    if latest_same_side_move.get("piece_id") == action.get("piece_id"):
        penalty += 0.25
        previous_from = latest_same_side_move.get("from_")
        previous_to = latest_same_side_move.get("to")
        if previous_from == action.get("to") and previous_to == [state.pieces[action["piece_id"]].x, state.pieces[action["piece_id"]].y]:
            penalty += 2.0
    return penalty


def position_bonus(x: int, y: int) -> float:
    return 3.5 - abs(x - 3.5) - abs(y - 3.5)


def score_action(state: MatchState, side: str, action: dict[str, object]) -> float:
    score = evaluate_state(state, side)
    if action["kind"] == "domain_cast":
        score += 6.0
    elif action["kind"] == "technique_cast":
        score += 2.0
        for target_id in action.get("targets", []):
            target = state.pieces.get(target_id)
            if target and target.side != side:
                score += PIECE_VALUES[target.role]
    elif action["kind"] == "normal_move":
        to_x, to_y = action["to"]
        target = piece_at(state, to_x, to_y)
        if target and target.side != side:
            score += PIECE_VALUES[target.role] + 1.0
        score += position_bonus(to_x, to_y) * 0.2
    return score


def bot_action(state: MatchState, side: str) -> dict[str, object]:
    from app.game.engine.engine import get_all_legal_actions

    actions = [action for action in get_all_legal_actions(state, side) if action["kind"] != "resign"]
    if not actions:
        return {"kind": "resign"}

    scored_actions: list[tuple[float, dict[str, object]]] = []
    for action in actions:
        score = score_action(state, side, action)
        score -= recent_repeat_penalty(state, side, action)
        scored_actions.append((score, action))

    if not scored_actions:
        return {"kind": "resign"}

    scored_actions.sort(key=lambda item: item[0], reverse=True)
    return scored_actions[0][1]
