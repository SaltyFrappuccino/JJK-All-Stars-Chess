from __future__ import annotations

from app.game.engine.models import MatchState, Piece


BACK_RANK = [
    ("rook", "Yuta"),
    ("knight", "Dagon"),
    ("bishop", "Kenjaku"),
    ("queen", "Gojo"),
    ("king", "Sukuna"),
    ("bishop", "Mahito"),
    ("knight", "Yuki"),
    ("rook", "Jogo"),
]

PAWNS = ["Yuji", "Megumi", "Nobara", "Nanami", "Choso", "Todo", "Maki", "Inumaki"]


def create_initial_state() -> MatchState:
    pieces: dict[str, Piece] = {}
    for x, (role, name) in enumerate(BACK_RANK):
        pieces[f"white_{name.lower()}"] = Piece(
            id=f"white_{name.lower()}",
            side="white",
            role=role,
            name=name,
            x=x,
            y=7,
            technique_state="gojo_blue" if name == "Gojo" else None,
        )
        pieces[f"black_{name.lower()}"] = Piece(
            id=f"black_{name.lower()}",
            side="black",
            role=role,
            name=name,
            x=x,
            y=0,
            technique_state="gojo_blue" if name == "Gojo" else None,
        )

    for x, name in enumerate(PAWNS):
        pieces[f"white_{name.lower()}"] = Piece(
            id=f"white_{name.lower()}",
            side="white",
            role="pawn",
            name=name,
            x=x,
            y=6,
        )
        pieces[f"black_{name.lower()}"] = Piece(
            id=f"black_{name.lower()}",
            side="black",
            role="pawn",
            name=name,
            x=x,
            y=1,
        )

    return MatchState(
        pieces=pieces,
        side_to_move="white",
        energy={"white": 2, "black": 0},
    )
