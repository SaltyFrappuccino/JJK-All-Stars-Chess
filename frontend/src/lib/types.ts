export type Side = "white" | "black";

export type Piece = {
  id: string;
  side: Side;
  role: "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
  name: string;
  x: number;
  y: number;
  alive: boolean;
  cooldown: number;
  technique_used: boolean;
  domain_used: boolean;
  technique_state: string | null;
};

export type Status = {
  kind: string;
  turns: number;
  source_id?: string | null;
  data: Record<string, unknown>;
};

export type Terrain = {
  kind: string;
  x: number;
  y: number;
  turns: number;
  source_id?: string | null;
  data: Record<string, unknown>;
};

export type MatchState = {
  pieces: Record<string, Piece>;
  side_to_move: Side;
  energy: Record<Side, number>;
  statuses: Record<string, Status[]>;
  terrains: Terrain[];
  global_domain_lock: Record<Side, number>;
  active_domain: { caster_id: string; name: string; turns: number } | null;
  last_backline_technique: Record<Side, { piece_id: string; name: string } | null>;
  technique_check: { target_side: Side; source_id: string; ability: string } | null;
  winner: Side | null;
  winner_reason: string | null;
  turn_number: number;
  event_log: Array<Record<string, unknown>>;
};

export type GameAction = {
  kind: "normal_move" | "technique_cast" | "domain_cast" | "resign";
  piece_id?: string;
  to?: [number, number];
  targets?: string[];
  cells?: [number, number][];
};
