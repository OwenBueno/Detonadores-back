import type { GridCell, PlayerState } from "../types.js";
import { createArenaGrid } from "./createArenaGrid.js";
import { SPAWN_POSITIONS } from "./constants.js";

const DEFAULT_BOMBS = 1;
const DEFAULT_RANGE = 1;

export type PlayerCount = 1 | 2 | 3 | 4;

export interface CreateArenaResult {
  grid: GridCell[][];
  initialPlayers: PlayerState[];
}

export function createArena(playerCount: PlayerCount): CreateArenaResult {
  const grid = createArenaGrid();
  const initialPlayers: PlayerState[] = SPAWN_POSITIONS.slice(0, playerCount).map((pos, i) => ({
    id: `player-${i}`,
    x: pos.x,
    y: pos.y,
    alive: true,
    bombs: DEFAULT_BOMBS,
    range: DEFAULT_RANGE,
  }));
  return { grid, initialPlayers };
}
