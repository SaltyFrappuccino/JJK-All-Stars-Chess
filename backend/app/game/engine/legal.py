from __future__ import annotations

from math import copysign
from typing import Any

from app.game.engine.constants import ALL_DIRS, DIAG_DIRS, ORTHO_DIRS
from app.game.engine.core import (
    alive_pieces,
    can_stand_on,
    direction_for_side,
    has_status,
    in_bounds,
    other_side,
    piece_at,
    square_blocked_by_terrain,
)
from app.game.engine.models import MatchState, Piece


def slide_moves(state: MatchState, piece: Piece, directions: list[tuple[int, int]]) -> list[dict[str, Any]]:
    moves: list[dict[str, Any]] = []
    for dx, dy in directions:
        x, y = piece.x + dx, piece.y + dy
        while in_bounds(x, y):
            if square_blocked_by_terrain(state, x, y):
                break
            target = piece_at(state, x, y)
            if target:
                if target.side != piece.side:
                    moves.append({"kind": "normal_move", "piece_id": piece.id, "to": [x, y]})
                break
            moves.append({"kind": "normal_move", "piece_id": piece.id, "to": [x, y]})
            x += dx
            y += dy
    return moves


def king_moves(state: MatchState, piece: Piece) -> list[dict[str, Any]]:
    moves: list[dict[str, Any]] = []
    for dx, dy in ALL_DIRS:
        x, y = piece.x + dx, piece.y + dy
        if not in_bounds(x, y) or square_blocked_by_terrain(state, x, y):
            continue
        target = piece_at(state, x, y)
        if not target or target.side != piece.side:
            moves.append({"kind": "normal_move", "piece_id": piece.id, "to": [x, y]})
    return moves


def knight_moves(state: MatchState, piece: Piece) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for dx, dy in [(1, 2), (2, 1), (-1, 2), (-2, 1), (1, -2), (2, -1), (-1, -2), (-2, -1)]:
        x, y = piece.x + dx, piece.y + dy
        if not in_bounds(x, y) or square_blocked_by_terrain(state, x, y):
            continue
        target = piece_at(state, x, y)
        if not target or target.side != piece.side:
            result.append({"kind": "normal_move", "piece_id": piece.id, "to": [x, y]})
    return result


def pawn_moves(state: MatchState, piece: Piece) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    step = direction_for_side(piece.side)
    forward_y = piece.y + step
    if can_stand_on(state, piece.x, forward_y):
        result.append({"kind": "normal_move", "piece_id": piece.id, "to": [piece.x, forward_y]})
    start_row = 6 if piece.side == "white" else 1
    double_y = piece.y + step * 2
    if piece.y == start_row and can_stand_on(state, piece.x, forward_y) and can_stand_on(state, piece.x, double_y):
        result.append({"kind": "normal_move", "piece_id": piece.id, "to": [piece.x, double_y]})
    for dx in (-1, 1):
        x = piece.x + dx
        y = piece.y + step
        if not in_bounds(x, y):
            continue
        target = piece_at(state, x, y)
        if target and target.side != piece.side:
            result.append({"kind": "normal_move", "piece_id": piece.id, "to": [x, y]})
    return result


def legal_normal_moves(state: MatchState, piece: Piece) -> list[dict[str, Any]]:
    if piece.role == "rook":
        return slide_moves(state, piece, ORTHO_DIRS)
    if piece.role == "bishop":
        return slide_moves(state, piece, DIAG_DIRS)
    if piece.role == "queen":
        return slide_moves(state, piece, ALL_DIRS)
    if piece.role == "king":
        return king_moves(state, piece)
    if piece.role == "knight":
        return knight_moves(state, piece)
    return pawn_moves(state, piece)


def path_clear(state: MatchState, start: tuple[int, int], end: tuple[int, int]) -> bool:
    x1, y1 = start
    x2, y2 = end
    dx = x2 - x1
    dy = y2 - y1
    step_x = 0 if dx == 0 else int(copysign(1, dx))
    step_y = 0 if dy == 0 else int(copysign(1, dy))
    x, y = x1 + step_x, y1 + step_y
    while (x, y) != (x2, y2):
        if piece_at(state, x, y) or square_blocked_by_terrain(state, x, y):
            return False
        x += step_x
        y += step_y
    return True


def is_backline(piece: Piece) -> bool:
    return piece.role != "pawn"


def current_technique_id(piece: Piece) -> str | None:
    if piece.name == "Gojo":
        return piece.technique_state or "gojo_blue"
    if piece.name == "Yuta":
        return piece.technique_state
    return piece.name.lower()


def next_gojo_state(current: str | None) -> str:
    cycle = {"gojo_blue": "gojo_red", "gojo_red": "gojo_purple", "gojo_purple": "gojo_blue"}
    return cycle.get(current or "gojo_blue", "gojo_blue")


def pull_step_toward(source_x: int, source_y: int, target_x: int, target_y: int) -> tuple[int, int]:
    dx = 0 if source_x == target_x else (1 if source_x > target_x else -1)
    dy = 0 if source_y == target_y else (1 if source_y > target_y else -1)
    return target_x + dx, target_y + dy


def push_steps_away(state: MatchState, source: Piece, target: Piece, max_steps: int = 2) -> tuple[int, int] | None:
    step_x = 0 if target.x == source.x else (1 if target.x > source.x else -1)
    step_y = 0 if target.y == source.y else (1 if target.y > source.y else -1)
    if step_x == 0 and step_y == 0:
        return None

    for distance in range(max_steps, 0, -1):
        path_free = True
        for current_step in range(1, distance + 1):
            next_x = target.x + step_x * current_step
            next_y = target.y + step_y * current_step
            if not can_stand_on(state, next_x, next_y):
                path_free = False
                break
        if path_free:
            return target.x + step_x * distance, target.y + step_y * distance
    return None


def legal_technique_actions(state: MatchState, piece: Piece) -> list[dict[str, Any]]:
    if piece.cooldown > 0 or has_status(state, piece.id, "silence") or has_status(state, piece.id, "paralysis") or has_status(state, piece.id, "stop") or has_status(state, piece.id, "domination"):
        return []
    if piece.role == "pawn" and piece.technique_used:
        return []
    technique_id = current_technique_id(piece)
    if piece.name == "Yuta" and technique_id is None:
        return []
    cost = technique_cost(piece)
    if state.energy[piece.side] < cost:
        return []

    actions: list[dict[str, Any]] = []
    enemy_side = other_side(piece.side)
    if technique_id == "sukuna":
        for dx, dy in ALL_DIRS:
            target = piece_at(state, piece.x + dx, piece.y + dy)
            if target and target.side == enemy_side:
                actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
    elif technique_id == "gojo_blue":
        for dx, dy in ALL_DIRS:
            for distance in range(1, 4):
                x, y = piece.x + dx * distance, piece.y + dy * distance
                if not in_bounds(x, y):
                    break
                target = piece_at(state, x, y)
                if target:
                    pull_x, pull_y = pull_step_toward(piece.x, piece.y, x, y)
                    if target.side == enemy_side and path_clear(state, (piece.x, piece.y), (x, y)) and can_stand_on(state, pull_x, pull_y):
                        actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
                    break
    elif technique_id in {"gojo_red", "gojo_purple"}:
        max_distance = 3 if technique_id == "gojo_red" else 4
        for dx, dy in ALL_DIRS:
            for distance in range(1, max_distance + 1):
                x, y = piece.x + dx * distance, piece.y + dy * distance
                if not in_bounds(x, y):
                    break
                target = piece_at(state, x, y)
                if target:
                    if target.side == enemy_side and path_clear(state, (piece.x, piece.y), (x, y)):
                        actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
                    break
    elif technique_id == "jogo":
        for dx, dy in ORTHO_DIRS:
            for distance in range(1, 4):
                x, y = piece.x + dx * distance, piece.y + dy * distance
                if not in_bounds(x, y):
                    break
                target = piece_at(state, x, y)
                if target:
                    if target.side == enemy_side and path_clear(state, (piece.x, piece.y), (x, y)):
                        actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
                    break
    elif technique_id == "kenjaku":
        for target in alive_pieces(state, enemy_side):
            if target.role != "pawn" or target.name == "Sukuna":
                continue
            for dx, dy in ALL_DIRS:
                x, y = target.x + dx, target.y + dy
                if can_stand_on(state, x, y):
                    actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id], "cells": [[x, y]]})
    elif technique_id == "mahito":
        for dx, dy in DIAG_DIRS:
            for distance in range(1, 3):
                x, y = piece.x + dx * distance, piece.y + dy * distance
                if not in_bounds(x, y):
                    break
                target = piece_at(state, x, y)
                if target:
                    if target.side == enemy_side:
                        actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
                    break
    elif technique_id == "yuki":
        for dx, dy in [(1, 2), (2, 1), (-1, 2), (-2, 1), (1, -2), (2, -1), (-1, -2), (-2, -1)]:
            x, y = piece.x + dx, piece.y + dy
            if not can_stand_on(state, x, y):
                continue
            adjacent_targets = []
            for adx, ady in ALL_DIRS:
                target = piece_at(state, x + adx, y + ady)
                if target and target.side == enemy_side:
                    adjacent_targets.append(target.id)
            if adjacent_targets:
                actions.append({"kind": "technique_cast", "piece_id": piece.id, "cells": [[x, y]], "targets": adjacent_targets})
    elif technique_id == "dagon":
        for target in alive_pieces(state, enemy_side):
            if (
                max(abs(target.x - piece.x), abs(target.y - piece.y)) <= 2
                and path_clear(state, (piece.x, piece.y), (target.x, target.y))
                and (target.name == "Sukuna" or push_steps_away(state, piece, target) is not None)
            ):
                actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
    elif technique_id == "yuji":
        step = direction_for_side(piece.side)
        target = piece_at(state, piece.x, piece.y + step)
        if target and target.side == enemy_side:
            actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
    elif technique_id == "megumi":
        actions.append({"kind": "technique_cast", "piece_id": piece.id})
    elif technique_id == "nobara":
        step = direction_for_side(piece.side)
        for dx in (-1, 1):
            target = piece_at(state, piece.x + dx, piece.y + step)
            if target and target.side == enemy_side:
                actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
    elif technique_id == "nanami":
        step = direction_for_side(piece.side)
        for dx in (-2, 2):
            x, y = piece.x + dx, piece.y + step * 2
            mid_x, mid_y = piece.x + dx // 2, piece.y + step
            target = piece_at(state, x, y)
            if in_bounds(x, y) and piece_at(state, mid_x, mid_y) is None and target and target.side == enemy_side:
                actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
    elif technique_id == "choso":
        step = direction_for_side(piece.side)
        for distance in range(1, 3):
            x, y = piece.x, piece.y + step * distance
            if not in_bounds(x, y):
                break
            target = piece_at(state, x, y)
            if target:
                if target.side == enemy_side and path_clear(state, (piece.x, piece.y), (x, y)):
                    actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
                break
    elif technique_id == "todo":
        for ally in alive_pieces(state, piece.side):
            if ally.role == "pawn" and ally.id != piece.id and max(abs(ally.x - piece.x), abs(ally.y - piece.y)) <= 2 and ally.name != "Sukuna":
                actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [ally.id]})
    elif technique_id == "maki":
        step = direction_for_side(piece.side)
        target = piece_at(state, piece.x, piece.y + step)
        if target and target.side == enemy_side:
            actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
    elif technique_id == "inumaki":
        for dx, dy in ALL_DIRS:
            target = piece_at(state, piece.x + dx, piece.y + dy)
            if target and target.side == enemy_side:
                actions.append({"kind": "technique_cast", "piece_id": piece.id, "targets": [target.id]})
    return actions


def legal_domain_actions(state: MatchState, piece: Piece) -> list[dict[str, Any]]:
    if piece.role == "pawn" or piece.domain_used or state.global_domain_lock[piece.side] > 0 or state.active_domain:
        return []
    if state.energy[piece.side] < domain_cost(piece):
        return []
    if has_status(state, piece.id, "silence") or has_status(state, piece.id, "paralysis") or has_status(state, piece.id, "stop") or has_status(state, piece.id, "domination"):
        return []
    enemy_side = other_side(piece.side)
    enemies = alive_pieces(state, enemy_side)
    result: list[dict[str, Any]] = []
    if piece.name in {"Sukuna", "Gojo", "Mahito", "Yuki"}:
        in_radius = [enemy.id for enemy in enemies if max(abs(enemy.x - piece.x), abs(enemy.y - piece.y)) <= 2]
        if in_radius:
            max_targets = 2 if piece.name in {"Sukuna", "Mahito", "Yuki"} else 3
            result.append({"kind": "domain_cast", "piece_id": piece.id, "targets": in_radius[:max_targets]})
    elif piece.name == "Yuta":
        for target in alive_pieces(state):
            if target.id == piece.id:
                continue
            if max(abs(target.x - piece.x), abs(target.y - piece.y)) > 2:
                continue
            if current_technique_id(target) is None:
                continue
            result.append({"kind": "domain_cast", "piece_id": piece.id, "targets": [target.id]})
    elif piece.name == "Jogo":
        cells: list[list[int]] = []
        for x in range(piece.x - 2, piece.x + 3):
            for y in range(piece.y - 2, piece.y + 3):
                if in_bounds(x, y) and max(abs(x - piece.x), abs(y - piece.y)) <= 2:
                    cells.append([x, y])
        result.append({"kind": "domain_cast", "piece_id": piece.id, "cells": cells[:3]})
    elif piece.name == "Kenjaku":
        targets = []
        for enemy in enemies:
            if enemy.role == "pawn" and abs(enemy.x - piece.x) == abs(enemy.y - piece.y) and max(abs(enemy.x - piece.x), abs(enemy.y - piece.y)) <= 3:
                targets.append(enemy.id)
        result.append({"kind": "domain_cast", "piece_id": piece.id, "targets": targets})
    elif piece.name == "Dagon":
        result.append({"kind": "domain_cast", "piece_id": piece.id, "targets": []})
    return result


def technique_cost(piece: Piece) -> int:
    technique_id = current_technique_id(piece)
    return {
        "sukuna": 3,
        "gojo_blue": 5,
        "gojo_red": 5,
        "gojo_purple": 5,
        "jogo": 4,
        "kenjaku": 3,
        "mahito": 4,
        "yuki": 4,
        "dagon": 4,
        "yuji": 2,
        "megumi": 2,
        "nobara": 2,
        "nanami": 2,
        "choso": 2,
        "todo": 2,
        "maki": 0,
        "inumaki": 2,
    }[technique_id or "yuta_none"]


def domain_cost(piece: Piece) -> int:
    return {
        "Sukuna": 9,
        "Gojo": 9,
        "Yuta": 8,
        "Jogo": 8,
        "Kenjaku": 8,
        "Mahito": 8,
        "Yuki": 8,
        "Dagon": 8,
    }[piece.name]
