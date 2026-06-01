from app.game.engine.engine import apply_action, bot_action, create_engine_state, get_all_legal_actions, get_piece_legal_actions
from app.game.engine.models import Piece
from app.services.match_service import MatchService
from app.storage.db import Base, engine


def test_initial_setup_has_sukuna_and_energy():
    state = create_engine_state()
    assert state.energy["white"] == 2
    assert state.side_to_move == "white"
    assert state.pieces["white_sukuna"].x == 4
    assert state.pieces["black_sukuna"].y == 0


def test_white_turn_energy_caps_at_ten():
    state = create_engine_state()
    state.energy["white"] = 10
    action = {"kind": "normal_move", "piece_id": "white_yuji", "to": [0, 5]}
    state = apply_action(state, action)
    assert state.energy["black"] == 2


def test_normal_move_accepts_empty_targets_and_cells():
    state = create_engine_state()
    action = {"kind": "normal_move", "piece_id": "white_yuji", "to": [0, 5], "targets": [], "cells": []}
    state = apply_action(state, action)
    assert state.pieces["white_yuji"].x == 0
    assert state.pieces["white_yuji"].y == 5


def test_targetless_technique_accepts_empty_targets_and_cells():
    state = create_engine_state()
    state.energy["white"] = 10

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_megumi", "targets": [], "cells": []})

    assert not state.pieces["white_megumi"].alive


def test_targetless_domain_accepts_empty_targets_and_cells():
    state = create_engine_state()
    for piece_id, piece in state.pieces.items():
        if piece_id not in {"white_dagon", "white_sukuna", "black_sukuna"}:
            piece.alive = False

    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_dagon"].x = 3
    state.pieces["white_dagon"].y = 3

    state = apply_action(state, {"kind": "domain_cast", "piece_id": "white_dagon", "targets": [], "cells": []})

    assert state.active_domain is not None
    assert state.active_domain.name == "Horizon of Captivating Skandha"


def test_resign_ignores_irrelevant_empty_fields():
    state = create_engine_state()

    state = apply_action(state, {"kind": "resign", "piece_id": None, "targets": [], "cells": []})

    assert state.winner == "black"
    assert state.winner_reason == "resign"


def test_legal_actions_roundtrip_back_into_engine():
    state = create_engine_state()
    state.energy["white"] = 10

    for action in get_piece_legal_actions(state, "white_megumi"):
        next_state = apply_action(state.clone(), action)
        assert next_state.turn_number >= state.turn_number


def test_sukuna_cannot_die_to_ranged_technique():
    state = create_engine_state()
    state.pieces["black_yuji"].alive = False
    state.pieces["black_gojo"].x = 4
    state.pieces["black_gojo"].y = 4
    state.pieces["white_sukuna"].x = 4
    state.pieces["white_sukuna"].y = 7
    state.side_to_move = "black"
    state.energy["black"] = 10
    state = apply_action(state, {"kind": "technique_cast", "piece_id": "black_gojo", "targets": ["white_sukuna"]}, validate=False)
    assert state.pieces["white_sukuna"].alive
    assert state.technique_check is not None


def test_domain_sets_global_lock():
    state = create_engine_state()
    state.energy["white"] = 10
    state = apply_action(state, {"kind": "domain_cast", "piece_id": "white_gojo", "targets": ["black_yuji"]}, validate=False)
    assert state.global_domain_lock["white"] == 3


def test_pawn_technique_one_time():
    state = create_engine_state()
    state.pieces["black_yuji"].x = 0
    state.pieces["black_yuji"].y = 5
    state.energy["white"] = 2
    first = apply_action(state, {"kind": "technique_cast", "piece_id": "white_yuji", "targets": ["black_yuji"]}, validate=False)
    actions = get_piece_legal_actions(first, "white_yuji")
    assert not any(action["kind"] == "technique_cast" for action in actions)


def test_gojo_technique_cycles_blue_red_purple():
    state = create_engine_state()
    state.energy["white"] = 10
    state.pieces["black_yuji"].x = 3
    state.pieces["black_yuji"].y = 5

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_gojo", "targets": ["black_yuji"]}, validate=False)
    assert state.pieces["white_gojo"].technique_state == "gojo_red"

    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_gojo"].cooldown = 0
    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_gojo", "targets": ["black_yuji"]}, validate=False)
    assert state.pieces["white_gojo"].technique_state == "gojo_purple"

    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_gojo"].cooldown = 0
    state.pieces["black_choso"].x = 3
    state.pieces["black_choso"].y = 4
    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_gojo", "targets": ["black_choso"]}, validate=False)
    assert state.pieces["white_gojo"].technique_state == "gojo_blue"


def test_yuta_domain_copies_technique_and_enables_it():
    state = create_engine_state()
    state.energy["white"] = 10
    state.pieces["white_yuji"].x = 1
    state.pieces["white_yuji"].y = 6
    state.pieces["white_yuta"].x = 0
    state.pieces["white_yuta"].y = 7

    state = apply_action(state, {"kind": "domain_cast", "piece_id": "white_yuta", "targets": ["white_yuji"]}, validate=False)
    assert state.pieces["white_yuta"].technique_state == "yuji"

    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_yuta"].cooldown = 0
    state.pieces["black_yuji"].x = 0
    state.pieces["black_yuji"].y = 6
    actions = get_piece_legal_actions(state, "white_yuta")
    assert any(action["kind"] == "technique_cast" for action in actions)


def test_megumi_technique_self_destructs():
    state = create_engine_state()
    state.energy["white"] = 10

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_megumi"}, validate=False)

    assert not state.pieces["white_megumi"].alive


def test_megumi_technique_summons_mahoraga_on_enemy_last_two_ranks():
    state = create_engine_state()
    state.energy["white"] = 10
    state.pieces["white_megumi"].x = 2
    state.pieces["white_megumi"].y = 1

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_megumi"}, validate=False)

    assert not state.pieces["white_megumi"].alive
    assert state.pieces["white_mahoraga"].alive
    assert state.pieces["white_mahoraga"].x == 2
    assert state.pieces["white_mahoraga"].y == 1
    assert state.pieces["white_mahoraga"].technique_state == "mahoraga_0"


def test_dagon_technique_pushes_target_back():
    state = create_engine_state()
    for piece_id, piece in state.pieces.items():
        if piece_id not in {"white_dagon", "black_yuji", "white_sukuna", "black_sukuna"}:
            piece.alive = False

    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_dagon"].x = 2
    state.pieces["white_dagon"].y = 2
    state.pieces["black_yuji"].x = 3
    state.pieces["black_yuji"].y = 2

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_dagon", "targets": ["black_yuji"]}, validate=False)

    assert state.pieces["black_yuji"].x == 5
    assert state.pieces["black_yuji"].y == 2


def test_mahoraga_wheel_unlocks_new_move_sets():
    state = create_engine_state()
    for piece_id, piece in state.pieces.items():
        if piece_id not in {"white_mahoraga", "white_sukuna", "black_sukuna"}:
            piece.alive = False

    state.pieces["white_mahoraga"] = Piece(
        id="white_mahoraga",
        side="white",
        role="pawn",
        name="Mahoraga",
        x=3,
        y=4,
        technique_state="mahoraga_0",
    )
    state.side_to_move = "white"
    state.energy["white"] = 10

    stage_zero_moves = get_piece_legal_actions(state, "white_mahoraga")
    assert not any(action.get("to") == [4, 2] for action in stage_zero_moves if action["kind"] == "normal_move")

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_mahoraga"}, validate=False)
    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_mahoraga"].cooldown = 0
    stage_one_moves = get_piece_legal_actions(state, "white_mahoraga")
    assert any(action.get("to") == [4, 2] for action in stage_one_moves if action["kind"] == "normal_move")

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_mahoraga"}, validate=False)
    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_mahoraga"].cooldown = 0
    stage_two_moves = get_piece_legal_actions(state, "white_mahoraga")
    assert any(action.get("to") == [5, 2] for action in stage_two_moves if action["kind"] == "normal_move")

    state = apply_action(state, {"kind": "technique_cast", "piece_id": "white_mahoraga"}, validate=False)
    state.side_to_move = "white"
    state.energy["white"] = 10
    state.pieces["white_mahoraga"].cooldown = 0
    stage_three_moves = get_piece_legal_actions(state, "white_mahoraga")
    assert any(action.get("to") == [3, 1] for action in stage_three_moves if action["kind"] == "normal_move")


def test_bot_match_progresses_for_several_turns():
    Base.metadata.create_all(bind=engine)
    service = MatchService()
    match_id = service.create_bot_match("guest-white", "white")

    for _ in range(6):
        session = service.get_session(match_id)
        actions = [action for action in get_all_legal_actions(session.state, "white") if action["kind"] != "resign"]
        move = next(action for action in actions if action["kind"] == "normal_move")
        session.state = apply_action(session.state, move)
        if session.bot_side and session.state.side_to_move == session.bot_side and session.state.winner is None:
            chosen_action = bot_action(session.state, session.bot_side)
            session.state = apply_action(session.state, chosen_action)
        session = service.get_session(match_id)
        assert session.state.side_to_move == "white" or session.state.winner is not None


def test_join_room_rehydrates_missing_session_from_storage():
    Base.metadata.create_all(bind=engine)
    service = MatchService()
    room_code, match_id = service.create_pvp_match("guest-white")

    service.sessions.clear()
    joined_room_code, joined_match_id = service.join_pvp_room(room_code, "guest-black")

    assert joined_room_code == room_code
    assert joined_match_id == match_id
    assert service.get_session(match_id).black_guest_id == "guest-black"


def test_bot_avoids_immediate_backtrack_when_other_moves_exist():
    state = create_engine_state()
    for piece_id, piece in state.pieces.items():
        if piece_id not in {"black_sukuna", "white_sukuna", "black_yuta"}:
            piece.alive = False

    state.pieces["black_sukuna"].x = 4
    state.pieces["black_sukuna"].y = 0
    state.pieces["white_sukuna"].x = 4
    state.pieces["white_sukuna"].y = 7
    state.pieces["black_yuta"].x = 1
    state.pieces["black_yuta"].y = 0
    state.side_to_move = "black"
    state.energy["black"] = 2
    state.event_log.append({"kind": "piece_moved", "piece_id": "black_yuta", "from_": [0, 0], "to": [1, 0]})

    action = bot_action(state, "black")
    assert action["kind"] == "normal_move"
    assert action["to"] != [0, 0]
