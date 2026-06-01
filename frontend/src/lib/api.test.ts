import { connectMatchSocket, requestLegalActions, submitAction } from "./api";

class MockWebSocket {
  static OPEN = 1;

  readyState = MockWebSocket.OPEN;
  sent: string[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  url: URL;

  constructor(url: string | URL) {
    this.url = new URL(String(url));
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  emit(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

describe("api socket helpers", () => {
  const OriginalWebSocket = window.WebSocket;

  afterEach(() => {
    window.WebSocket = OriginalWebSocket;
  });

  it("submitAction sends a normalized envelope", () => {
    const socket = { readyState: MockWebSocket.OPEN, send: vi.fn() } as unknown as WebSocket;

    submitAction(socket, { kind: "domain_cast", piece_id: "white_dagon", targets: [], cells: [] });

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "submit_action", payload: { action: { kind: "domain_cast", piece_id: "white_dagon" } } }));
  });

  it("requestLegalActions sends the expected payload", () => {
    const socket = { readyState: MockWebSocket.OPEN, send: vi.fn() } as unknown as WebSocket;

    requestLegalActions(socket, "white_yuji");

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "request_legal_actions", payload: { piece_id: "white_yuji" } }));
  });

  it("routes websocket messages to the matching handlers", () => {
    const created: MockWebSocket[] = [];
    window.WebSocket = class extends MockWebSocket {
      constructor(url: string | URL) {
        super(url);
        created.push(this);
      }
    } as unknown as typeof WebSocket;

    const handlers = {
      onSnapshot: vi.fn(),
      onLegalActions: vi.fn(),
      onActionResolved: vi.fn(),
      onInvalidAction: vi.fn(),
    };

    connectMatchSocket("match-1", "token-1", handlers);

    created[0].emit({ type: "match_snapshot", payload: { state: { turn_number: 1 } } });
    created[0].emit({ type: "legal_actions", payload: { piece_id: "white_yuji", actions: [{ kind: "normal_move", piece_id: "white_yuji", to: [0, 5] }] } });
    created[0].emit({ type: "action_resolved", payload: { state: { turn_number: 2 } } });
    created[0].emit({ type: "invalid_action", payload: { message: "Недопустимое действие" } });

    expect(handlers.onSnapshot).toHaveBeenCalledWith({ turn_number: 1 });
    expect(handlers.onLegalActions).toHaveBeenCalledWith("white_yuji", [{ kind: "normal_move", piece_id: "white_yuji", to: [0, 5] }]);
    expect(handlers.onActionResolved).toHaveBeenCalledWith({ turn_number: 2 });
    expect(handlers.onInvalidAction).toHaveBeenCalledWith("Недопустимое действие");
  });
});
