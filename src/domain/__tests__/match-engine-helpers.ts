import type { GridCell, PlayerState } from "../types.js";
import { MatchEngine } from "../MatchEngine.js";

export const c = (x: number, y: number, type: GridCell["type"]): GridCell => ({ type, x, y });

export function floorGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => c(x, y, "floor"))
  );
}

export function twoPlayers(
  p1: Partial<PlayerState> = {},
  p2: Partial<PlayerState> = {}
): PlayerState[] {
  return [
    { id: "p1", x: 0, y: 0, alive: true, bombs: 1, range: 1, ...p1 },
    { id: "p2", x: 1, y: 1, alive: true, bombs: 1, range: 1, ...p2 },
  ];
}

export function createActiveEngine(
  grid: GridCell[][],
  players: PlayerState[]
): MatchEngine {
  const engine = new MatchEngine();
  engine.startMatch(grid, players);
  engine.tick();
  return engine;
}

export function runTicks(engine: MatchEngine, n: number): void {
  for (let i = 0; i < n; i++) engine.tick();
}

export function explosionSet(snapshot: {
  explosions: Array<{ x: number; y: number }>;
}): Set<string> {
  return new Set(snapshot.explosions.map((e) => `${e.x},${e.y}`));
}

export function pl(
  snapshot: { players: PlayerState[] },
  id: string
): PlayerState | undefined {
  return snapshot.players.find((p) => p.id === id);
}
