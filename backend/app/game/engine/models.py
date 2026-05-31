from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal


Side = Literal["white", "black"]
PieceRole = Literal["king", "queen", "rook", "bishop", "knight", "pawn"]
ActionKind = Literal["normal_move", "technique_cast", "domain_cast", "resign"]


@dataclass
class AbilityRef:
    name: str
    cost: int
    cooldown: int = 0
    once: bool = False


@dataclass
class Piece:
    id: str
    side: Side
    role: PieceRole
    name: str
    x: int
    y: int
    alive: bool = True
    cooldown: int = 0
    technique_used: bool = False
    domain_used: bool = False
    technique_state: str | None = None


@dataclass
class Status:
    kind: str
    turns: int
    source_id: str | None = None
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class Terrain:
    kind: str
    x: int
    y: int
    turns: int
    source_id: str | None = None
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class ActiveDomain:
    caster_id: str
    name: str
    turns: int
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class TechniqueCheck:
    target_side: Side
    source_id: str
    ability: str


@dataclass
class MatchState:
    pieces: dict[str, Piece]
    side_to_move: Side
    energy: dict[Side, int]
    statuses: dict[str, list[Status]] = field(default_factory=dict)
    terrains: list[Terrain] = field(default_factory=list)
    global_domain_lock: dict[Side, int] = field(default_factory=lambda: {"white": 0, "black": 0})
    active_domain: ActiveDomain | None = None
    last_backline_technique: dict[Side, dict[str, str] | None] = field(default_factory=lambda: {"white": None, "black": None})
    technique_check: TechniqueCheck | None = None
    winner: Side | None = None
    winner_reason: str | None = None
    turn_number: int = 1
    event_log: list[dict[str, Any]] = field(default_factory=list)

    def clone(self) -> "MatchState":
        pieces = {piece_id: Piece(**asdict(piece)) for piece_id, piece in self.pieces.items()}
        statuses = {
            piece_id: [Status(**asdict(status)) for status in piece_statuses]
            for piece_id, piece_statuses in self.statuses.items()
        }
        terrains = [Terrain(**asdict(terrain)) for terrain in self.terrains]
        active_domain = ActiveDomain(**asdict(self.active_domain)) if self.active_domain else None
        technique_check = TechniqueCheck(**asdict(self.technique_check)) if self.technique_check else None
        return MatchState(
            pieces=pieces,
            side_to_move=self.side_to_move,
            energy=dict(self.energy),
            statuses=statuses,
            terrains=terrains,
            global_domain_lock=dict(self.global_domain_lock),
            active_domain=active_domain,
            last_backline_technique={
                "white": dict(self.last_backline_technique["white"]) if self.last_backline_technique["white"] else None,
                "black": dict(self.last_backline_technique["black"]) if self.last_backline_technique["black"] else None,
            },
            technique_check=technique_check,
            winner=self.winner,
            winner_reason=self.winner_reason,
            turn_number=self.turn_number,
            event_log=[dict(item) for item in self.event_log],
        )

    def to_public(self) -> dict[str, Any]:
        return {
            "pieces": {piece_id: asdict(piece) for piece_id, piece in self.pieces.items()},
            "side_to_move": self.side_to_move,
            "energy": self.energy,
            "statuses": {piece_id: [asdict(status) for status in statuses] for piece_id, statuses in self.statuses.items()},
            "terrains": [asdict(terrain) for terrain in self.terrains],
            "global_domain_lock": self.global_domain_lock,
            "active_domain": asdict(self.active_domain) if self.active_domain else None,
            "last_backline_technique": self.last_backline_technique,
            "technique_check": asdict(self.technique_check) if self.technique_check else None,
            "winner": self.winner,
            "winner_reason": self.winner_reason,
            "turn_number": self.turn_number,
            "event_log": self.event_log,
        }
