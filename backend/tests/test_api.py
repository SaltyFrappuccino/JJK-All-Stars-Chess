from fastapi.testclient import TestClient

from app.main import app


def test_guest_room_and_match_flow():
    with TestClient(app) as client:
        guest = client.post("/api/guest-sessions", params={"display_name": "A"}).json()
        room = client.post("/api/rooms", json={"token": guest["token"], "display_name": "A"}).json()
        match = client.get(f"/api/matches/{room['match_id']}").json()
        assert room["side"] == "white"
        assert match["snapshot"]["side_to_move"] == "white"
