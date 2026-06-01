import type { GameAction, MatchState } from "./types";

type PieceLookup = MatchState["pieces"];

export function normalizeGameAction(action: GameAction): GameAction {
  const normalized: GameAction = { kind: action.kind };
  if (action.piece_id !== undefined) {
    normalized.piece_id = action.piece_id;
  }
  if (action.to !== undefined) {
    normalized.to = action.to;
  }
  if (action.targets?.length) {
    normalized.targets = action.targets;
  }
  if (action.cells?.length) {
    normalized.cells = action.cells;
  }
  return normalized;
}

export function actionMatchesCell(action: GameAction, x: number, y: number, pieces: PieceLookup): boolean {
  if (action.to) {
    return action.to[0] === x && action.to[1] === y;
  }
  if (action.cells?.length) {
    return action.cells.some((cell) => cell[0] === x && cell[1] === y);
  }
  if (action.targets?.length) {
    return action.targets.some((targetId) => {
      const target = pieces[targetId];
      return Boolean(target && target.x === x && target.y === y);
    });
  }
  return false;
}

export function findActionForCell(actions: GameAction[], x: number, y: number, pieces: PieceLookup): GameAction | null {
  return actions.find((action) => actionMatchesCell(action, x, y, pieces)) ?? null;
}

export function isDirectAction(action: GameAction): boolean {
  return !action.to && !action.cells?.length && !action.targets?.length;
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

export function getDomainOverlayCells(state: Pick<MatchState, "active_domain" | "pieces">): [number, number][] {
  const domain = state.active_domain;
  if (!domain) {
    return [];
  }

  const caster = state.pieces[domain.caster_id];
  if (!caster || !caster.alive) {
    return [];
  }

  const cells = new Map<string, [number, number]>();
  const addCell = (x: number, y: number) => {
    if (!inBounds(x, y)) {
      return;
    }
    cells.set(`${x}:${y}`, [x, y]);
  };

  if (["Malevolent Shrine", "Infinite Void", "Self-Embodiment of Perfection", "Mass Collapse", "Coffin of the Iron Mountain"].includes(domain.name)) {
    for (let y = caster.y - 2; y <= caster.y + 2; y += 1) {
      for (let x = caster.x - 2; x <= caster.x + 2; x += 1) {
        if (Math.max(Math.abs(x - caster.x), Math.abs(y - caster.y)) <= 2) {
          addCell(x, y);
        }
      }
    }
    return [...cells.values()];
  }

  if (domain.name === "Horizon of Captivating Skandha") {
    for (let y = caster.y - 1; y <= caster.y + 1; y += 1) {
      for (let x = caster.x - 1; x <= caster.x + 1; x += 1) {
        if (Math.max(Math.abs(x - caster.x), Math.abs(y - caster.y)) <= 1) {
          addCell(x, y);
        }
      }
    }
    return [...cells.values()];
  }

  if (domain.name === "Womb of Abundance") {
    addCell(caster.x, caster.y);
    for (let step = 1; step <= 3; step += 1) {
      addCell(caster.x + step, caster.y + step);
      addCell(caster.x + step, caster.y - step);
      addCell(caster.x - step, caster.y + step);
      addCell(caster.x - step, caster.y - step);
    }
    return [...cells.values()];
  }

  addCell(caster.x, caster.y);
  return [...cells.values()];
}
