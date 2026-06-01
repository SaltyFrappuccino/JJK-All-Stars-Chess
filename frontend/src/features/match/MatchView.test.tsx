import { fireEvent, render, screen } from "@testing-library/react";

import type { MatchState } from "../../lib/types";

const submitAction = vi.fn((_: WebSocket, __: unknown) => true);

vi.mock("../../lib/api", () => ({
  submitAction: (socket: WebSocket, action: unknown) => submitAction(socket, action),
}));

vi.mock("../../game/phaser/PhaserBoard", () => ({
  PhaserBoard: ({
    onSelectPiece,
    onCellAction,
  }: {
    onSelectPiece: (pieceId: string) => void;
    onCellAction: (x: number, y: number) => void;
  }) => (
    <div>
      <button onClick={() => onSelectPiece("white_megumi")}>select megumi</button>
      <button onClick={() => onCellAction(0, 5)}>cell 0,5</button>
    </div>
  ),
}));

import { MatchView } from "./MatchView";

function createState(): MatchState {
  return {
    pieces: {
      white_megumi: {
        id: "white_megumi",
        side: "white",
        role: "pawn",
        name: "Megumi",
        x: 0,
        y: 6,
        alive: true,
        cooldown: 0,
        technique_used: false,
        domain_used: false,
        technique_state: null,
      },
      white_yuji: {
        id: "white_yuji",
        side: "white",
        role: "pawn",
        name: "Yuji",
        x: 0,
        y: 6,
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
        x: 0,
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

describe("MatchView", () => {
  beforeEach(() => {
    submitAction.mockClear();
  });

  it("submits the action selected by board cell", () => {
    const socket = {} as WebSocket;
    render(
      <MatchView
        matchId="match-1"
        state={createState()}
        legalActions={{ white_yuji: [{ kind: "normal_move", piece_id: "white_yuji", to: [0, 5] }] }}
        selectedPieceId="white_yuji"
        playerSide="white"
        playerNames={{ white: "White", black: "Black" }}
        socket={socket}
        onSelectPiece={vi.fn()}
        onRequestLegalActions={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("cell 0,5"));

    expect(submitAction).toHaveBeenCalledWith(socket, { kind: "normal_move", piece_id: "white_yuji", to: [0, 5] });
  });

  it("shows a direct-action button for targetless actions", () => {
    const socket = {} as WebSocket;
    render(
      <MatchView
        matchId="match-2"
        state={createState()}
        legalActions={{ white_megumi: [{ kind: "technique_cast", piece_id: "white_megumi" }] }}
        selectedPieceId="white_megumi"
        playerSide="white"
        playerNames={{ white: "White", black: "Black" }}
        socket={socket}
        onSelectPiece={vi.fn()}
        onRequestLegalActions={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "РўРµС…РЅРёРєР°" }));
    fireEvent.click(screen.getByRole("button", { name: "Применить" }));

    expect(submitAction).toHaveBeenCalledWith(socket, { kind: "technique_cast", piece_id: "white_megumi" });
  });
});
