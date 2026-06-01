from fastapi.testclient import TestClient

from app.main import app
from app.services.match_service import match_service


def create_guest(client: TestClient, display_name: str) -> dict:
    return client.post("/api/guest-sessions", params={"display_name": display_name}).json()


def test_guest_room_and_match_flow():
    with TestClient(app) as client:
        guest = create_guest(client, "A")
        room = client.post("/api/rooms", json={"token": guest["token"], "display_name": "A"}).json()
        match = client.get(f"/api/matches/{room['match_id']}").json()
        assert room["side"] == "white"
        assert match["snapshot"]["side_to_move"] == "white"


def test_websocket_roundtrip_accepts_normalized_submit_action():
    with TestClient(app) as client:
        guest = create_guest(client, "WS White")
        room = client.post("/api/rooms", json={"token": guest["token"], "display_name": "WS White"}).json()

        with client.websocket_connect(f"/ws/matches/{room['match_id']}?token={guest['token']}") as socket:
            snapshot = socket.receive_json()
            assert snapshot["type"] == "match_snapshot"

            socket.send_json({"type": "request_legal_actions", "payload": {"piece_id": "white_yuji"}})
            legal_message = socket.receive_json()
            assert legal_message["type"] == "legal_actions"

            action = next(item for item in legal_message["payload"]["actions"] if item["kind"] == "normal_move")
            socket.send_json({"type": "submit_action", "payload": {"action": {**action, "targets": [], "cells": []}}})

            resolved = socket.receive_json()
            assert resolved["type"] == "action_resolved"
            assert resolved["payload"]["state"]["pieces"]["white_yuji"]["y"] in {4, 5}


def test_websocket_legal_actions_and_submit_action_support_targetless_actions():
    with TestClient(app) as client:
        guest = create_guest(client, "WS Megumi")
        room = client.post("/api/rooms", json={"token": guest["token"], "display_name": "WS Megumi"}).json()
        session = match_service.get_session(room["match_id"])
        session.state.energy["white"] = 10

        with client.websocket_connect(f"/ws/matches/{room['match_id']}?token={guest['token']}") as socket:
            socket.receive_json()
            socket.send_json({"type": "request_legal_actions", "payload": {"piece_id": "white_megumi"}})
            legal_message = socket.receive_json()
            assert legal_message["type"] == "legal_actions"

            technique_action = next(item for item in legal_message["payload"]["actions"] if item["kind"] == "technique_cast")
            assert "targets" not in technique_action
            assert "cells" not in technique_action

            socket.send_json({"type": "submit_action", "payload": {"action": {"kind": "technique_cast", "piece_id": "white_megumi"}}})
            resolved = socket.receive_json()
            assert resolved["type"] == "action_resolved"
            assert not resolved["payload"]["state"]["pieces"]["white_megumi"]["alive"]


def test_websocket_invalid_action_is_reserved_for_real_invalid_moves():
    with TestClient(app) as client:
        guest = create_guest(client, "WS Invalid")
        room = client.post("/api/rooms", json={"token": guest["token"], "display_name": "WS Invalid"}).json()

        with client.websocket_connect(f"/ws/matches/{room['match_id']}?token={guest['token']}") as socket:
            socket.receive_json()
            socket.send_json(
                {
                    "type": "submit_action",
                    "payload": {"action": {"kind": "normal_move", "piece_id": "white_yuji", "to": [7, 7], "targets": [], "cells": []}},
                }
            )
            invalid = socket.receive_json()
            assert invalid["type"] == "invalid_action"
            assert "Недопустимое действие" in invalid["payload"]["message"]
