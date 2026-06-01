from __future__ import annotations

from typing import Any

from app.game.engine.constants import ALL_DIRS
from app.game.engine.core import add_event, add_status, alive_pieces, can_stand_on, kill_piece, other_side, piece_at, remove_terrain, terrain_at
from app.game.engine.legal import current_technique_id, is_backline, next_gojo_state, pull_step_toward, push_steps_away
from app.game.engine.models import ActiveDomain, MatchState, Piece, Terrain, TechniqueCheck


def move_piece(state: MatchState, piece: Piece, x: int, y: int, killer_side: str | None = None) -> list[str]:
    moved_piece_ids = [piece.id]
    target = piece_at(state, x, y)
    if target and target.side != piece.side:
        kill_piece(state, target.id, killer_side=killer_side or piece.side, by_technique=False)
        if any(status.kind == "marked" for status in state.statuses.get(target.id, [])):
            state.energy[piece.side] = min(10, state.energy[piece.side] + 1)
    remove_terrain(state, piece.x, piece.y, "rika")
    from_x, from_y = piece.x, piece.y
    piece.x = x
    piece.y = y
    add_event(state, "piece_moved", piece_id=piece.id, from_=[from_x, from_y], to=[x, y])
    return moved_piece_ids


def spawn_mahoraga(state: MatchState, side: str, x: int, y: int) -> None:
    piece_id = f"{side}_mahoraga"
    existing = state.pieces.get(piece_id)
    if existing:
        existing.alive = True
        existing.x = x
        existing.y = y
        existing.cooldown = 0
        existing.technique_used = False
        existing.domain_used = False
        existing.technique_state = "mahoraga_0"
    else:
        state.pieces[piece_id] = Piece(
            id=piece_id,
            side=side,
            role="pawn",
            name="Mahoraga",
            x=x,
            y=y,
            technique_state="mahoraga_0",
        )
    add_event(state, "piece_spawned", piece_id=piece_id, at=[x, y])


def apply_technique_effect(state: MatchState, piece: Piece, action: dict[str, Any], moved_piece_ids: list[str]) -> None:
    technique_id = current_technique_id(piece)
    targets = [state.pieces[target_id] for target_id in action.get("targets", []) if target_id in state.pieces]
    if technique_id == "sukuna":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Sukuna.technique")
        else:
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
    elif technique_id == "gojo_blue":
        target = targets[0]
        pull_x, pull_y = pull_step_toward(piece.x, piece.y, target.x, target.y)
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Gojo.blue")
            add_event(state, "technique_check", source_id=piece.id, target_id=target.id)
        elif can_stand_on(state, pull_x, pull_y):
            from_x, from_y = target.x, target.y
            target.x = pull_x
            target.y = pull_y
            add_event(state, "piece_forced_move", piece_id=target.id, from_=[from_x, from_y], to=[pull_x, pull_y])
    elif technique_id in {"gojo_red", "gojo_purple"}:
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Gojo.technique")
            add_event(state, "technique_check", source_id=piece.id, target_id=target.id)
        else:
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
    elif technique_id == "jogo":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Jogo.technique")
        else:
            lava_x, lava_y = target.x, target.y
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
            state.terrains.append(Terrain(kind="lava", x=lava_x, y=lava_y, turns=1, source_id=piece.id))
            add_event(state, "terrain_created", terrain="lava", x=lava_x, y=lava_y)
    elif technique_id == "kenjaku":
        target = targets[0]
        x, y = action["cells"][0]
        from_x, from_y = target.x, target.y
        target.x = x
        target.y = y
        add_event(state, "piece_forced_move", piece_id=target.id, from_=[from_x, from_y], to=[x, y])
    elif technique_id == "mahito":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Mahito.technique")
        else:
            add_status(state, target.id, "distortion", 1, piece.id)
            add_event(state, "status_applied", piece_id=target.id, status="distortion")
    elif technique_id == "yuki":
        x, y = action["cells"][0]
        move_piece(state, piece, x, y)
        moved_piece_ids.append(piece.id)
        target = state.pieces[action["targets"][0]]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Yuki.technique")
        else:
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
    elif technique_id == "dagon":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Dagon.technique")
        else:
            destination = push_steps_away(state, piece, target)
            if destination:
                from_x, from_y = target.x, target.y
                target.x, target.y = destination
                add_event(state, "piece_forced_move", piece_id=target.id, from_=[from_x, from_y], to=list(destination))
    elif technique_id == "yuji":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Yuji.technique")
        else:
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
    elif technique_id == "megumi":
        should_spawn_mahoraga = (piece.side == "white" and piece.y <= 1) or (piece.side == "black" and piece.y >= 6)
        summon_x, summon_y = piece.x, piece.y
        kill_piece(state, piece.id, by_technique=True)
        if should_spawn_mahoraga:
            spawn_mahoraga(state, piece.side, summon_x, summon_y)
    elif technique_id == "mahoraga":
        next_stage = min(3, int((piece.technique_state or "mahoraga_0").rsplit("_", 1)[-1]) + 1)
        piece.technique_state = f"mahoraga_{next_stage}"
        add_event(state, "wheel_rotated", piece_id=piece.id, stage=next_stage)
    elif technique_id == "nobara":
        target = targets[0]
        add_status(state, target.id, "silence", 1, piece.id)
        add_status(state, target.id, "marked", 1, piece.id)
    elif technique_id == "nanami":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Nanami.technique")
        else:
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
    elif technique_id == "choso":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Choso.technique")
        else:
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
    elif technique_id == "todo":
        ally = targets[0]
        ally.x, piece.x = piece.x, ally.x
        ally.y, piece.y = piece.y, ally.y
        moved_piece_ids.extend([ally.id, piece.id])
        add_event(state, "swap", first=piece.id, second=ally.id)
    elif technique_id == "maki":
        target = targets[0]
        if target.name == "Sukuna":
            state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Maki.technique")
        else:
            kill_piece(state, target.id, killer_side=piece.side, by_technique=True)
    elif technique_id == "inumaki":
        target = targets[0]
        if target.name == "Sukuna":
            add_status(state, target.id, "silence", 1, piece.id)
        else:
            add_status(state, target.id, "stop", 1, piece.id)

    if piece.name == "Gojo":
        piece.technique_state = next_gojo_state(piece.technique_state)

    if is_backline(piece):
        state.last_backline_technique[piece.side] = {"piece_id": piece.id, "name": piece.name}


def apply_domain_effect(state: MatchState, piece: Piece, action: dict[str, Any], moved_piece_ids: list[str]) -> None:
    enemy_side = other_side(piece.side)
    if piece.name == "Sukuna":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="Malevolent Shrine", turns=2)
        for target_id in action.get("targets", [])[:2]:
            target = state.pieces[target_id]
            if target.name == "Sukuna":
                state.technique_check = TechniqueCheck(target_side=target.side, source_id=piece.id, ability="Sukuna.domain")
            else:
                add_status(state, target.id, "severed", 1, piece.id, {"center": [piece.x, piece.y], "radius": 2})
    elif piece.name == "Gojo":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="Infinite Void", turns=1)
        for target_id in action.get("targets", [])[:3]:
            target = state.pieces[target_id]
            if target.name == "Sukuna":
                add_status(state, target.id, "silence", 1, piece.id)
            else:
                add_status(state, target.id, "paralysis", 1, piece.id)
    elif piece.name == "Yuta":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="True Mutual Love", turns=0)
        if action.get("targets"):
            source_piece = state.pieces[action["targets"][0]]
            piece.technique_state = current_technique_id(source_piece)
    elif piece.name == "Jogo":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="Coffin of the Iron Mountain", turns=2)
        for cell in action.get("cells", [])[:3]:
            x, y = cell
            state.terrains.append(Terrain(kind="lava", x=x, y=y, turns=2, source_id=piece.id))
            occupant = piece_at(state, x, y)
            if occupant and occupant.side == enemy_side:
                add_status(state, occupant.id, "burn", 1, piece.id)
                add_status(state, occupant.id, "silence", 1, piece.id)
    elif piece.name == "Kenjaku":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="Womb of Abundance", turns=1)
        for target_id in action.get("targets", []):
            target = state.pieces[target_id]
            add_status(state, target.id, "domination", 1, piece.id)
        if action.get("targets"):
            target = state.pieces[action["targets"][0]]
            for dx, dy in ALL_DIRS:
                x, y = target.x + dx, target.y + dy
                if can_stand_on(state, x, y):
                    from_x, from_y = target.x, target.y
                    target.x, target.y = x, y
                    add_event(state, "piece_forced_move", piece_id=target.id, from_=[from_x, from_y], to=[x, y])
                    break
    elif piece.name == "Mahito":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="Self-Embodiment of Perfection", turns=1)
        for target_id in action.get("targets", [])[:2]:
            target = state.pieces[target_id]
            add_status(state, target.id, "distortion", 1, piece.id)
            add_status(state, target.id, "silence", 1, piece.id)
    elif piece.name == "Yuki":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="Mass Collapse", turns=1)
        for target_id in action.get("targets", [])[:2]:
            target = state.pieces[target_id]
            dx = 0 if target.x == piece.x else (1 if piece.x > target.x else -1)
            dy = 0 if target.y == piece.y else (1 if piece.y > target.y else -1)
            nx, ny = target.x + dx, target.y + dy
            if can_stand_on(state, nx, ny):
                from_x, from_y = target.x, target.y
                target.x, target.y = nx, ny
                add_event(state, "piece_forced_move", piece_id=target.id, from_=[from_x, from_y], to=[nx, ny])
            add_status(state, target.id, "mass_pressure", 1, piece.id, {"caster_id": piece.id})
    elif piece.name == "Dagon":
        state.active_domain = ActiveDomain(caster_id=piece.id, name="Horizon of Captivating Skandha", turns=2, data={"free_cast_used": False})
        for enemy in alive_pieces(state, enemy_side):
            if abs(enemy.x - piece.x) <= 1 and abs(enemy.y - piece.y) <= 1:
                add_status(state, enemy.id, "silence", 1, piece.id)
                add_status(state, enemy.id, "no_capture_energy", 1, piece.id)
