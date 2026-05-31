import { render, screen } from "@testing-library/react";

vi.mock("../game/phaser/PhaserBoard", () => ({
  PhaserBoard: () => null,
}));

import { App } from "./App";

vi.stubGlobal(
  "fetch",
  vi.fn(async (url: string) => ({
    json: async () =>
      String(url).includes("/api/history")
        ? []
        : { guest_id: "g1", token: "t1", display_name: "Игрок-1" },
  })),
);

describe("App", () => {
  it("renders title", async () => {
    window.localStorage.setItem("jjk-profile", JSON.stringify({ nickname: "Тестер" }));
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "JJK All-Stars Chess" })).toBeInTheDocument();
  });
});
