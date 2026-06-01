import { actionMatchesCell, findActionForCell, getDomainOverlayCells, isDirectAction, normalizeGameAction } from "./actions";
import type { MatchState } from "./types";

function createState(): MatchState {
  return {
    pieces: {
      white_gojo: {
        id: "white_gojo",
        side: "white",
        role: "queen",
        name: "Gojo",
        x: 3,
        y: 3,
        alive: true,
        cooldown: 0,
        technique_used: false,
        domain_used: false,
        technique_state: null,
      },
      black_yuji: {
        id: "black_yuji",
        side: "black",
        role: "pawn",
        name: "Yuji",
        x: 5,
        y: 5,
        alive: true,
        cooldown: 0,
        technique_used: false,
        domain_used: false,
        technique_state: null,
      },
    },
    side_to_move: "white",
    energy: { white: 10, black: 10 },
    statuses: {},
    terrains: [],
    global_domain_lock: { white: 0, black: 0 },
    active_domain: null,
    last_backline_technique: { white: null, black: null },
    technique_check: null,
    winner: null,
    winner_reason: null,
    turn_number: 1,
    event_log: [],
  };
}

describe("actions helpers", () => {
  it("normalizes empty arrays away", () => {
    expect(normalizeGameAction({ kind: "domain_cast", piece_id: "white_dagon", targets: [], cells: [] })).toEqual({
      kind: "domain_cast",
      piece_id: "white_dagon",
    });
  });

  it("matches normal move by destination cell", () => {
    const state = createState();
    expect(actionMatchesCell({ kind: "normal_move", piece_id: "white_gojo", to: [4, 4] }, 4, 4, state.pieces)).toBe(true);
  });

  it("matches target action by target cell", () => {
    const state = createState();
    expect(actionMatchesCell({ kind: "technique_cast", piece_id: "white_gojo", targets: ["black_yuji"] }, 5, 5, state.pieces)).toBe(true);
  });

  it("matches cell-targeted action by cells", () => {
    const state = createState();
    expect(actionMatchesCell({ kind: "domain_cast", piece_id: "white_jogo", cells: [[1, 2]] }, 1, 2, state.pieces)).toBe(true);
  });

  it("finds the first action matching a cell", () => {
    const state = createState();
    const actions = [
      { kind: "normal_move" as const, piece_id: "white_gojo", to: [2, 2] as [number, number] },
      { kind: "technique_cast" as const, piece_id: "white_gojo", targets: ["black_yuji"] },
    ];
    expect(findActionForCell(actions, 5, 5, state.pieces)).toEqual(actions[1]);
  });

  it("treats actions without to, cells, or targets as direct actions", () => {
    expect(isDirectAction({ kind: "technique_cast", piece_id: "white_megumi" })).toBe(true);
    expect(isDirectAction({ kind: "technique_cast", piece_id: "white_megumi", targets: [] })).toBe(true);
    expect(isDirectAction({ kind: "normal_move", piece_id: "white_yuji", to: [0, 5] })).toBe(false);
  });

  it("computes radius-2 domain cells", () => {
    const state = createState();
    state.active_domain = { caster_id: "white_gojo", name: "Infinite Void", turns: 1 };

    const cells = getDomainOverlayCells(state);

    expect(cells).toContainEqual([3, 3]);
    expect(cells).toContainEqual([1, 1]);
    expect(cells).toContainEqual([5, 5]);
    expect(cells).not.toContainEqual([0, 0]);
  });

  it("computes diagonal Kenjaku domain cells", () => {
    const state = createState();
    state.active_domain = { caster_id: "white_gojo", name: "Womb of Abundance", turns: 1 };

    const cells = getDomainOverlayCells(state);

    expect(cells).toContainEqual([3, 3]);
    expect(cells).toContainEqual([4, 4]);
    expect(cells).toContainEqual([2, 2]);
  });
});
