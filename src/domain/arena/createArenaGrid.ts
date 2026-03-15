import type { GridCell } from "../types.js";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  SPAWN_POSITIONS,
  isBorder,
  isSpawnZone,
} from "./constants.js";

function cellType(x: number, y: number): "floor" | "hard_block" | "soft_block" {
  if (isSpawnZone(x, y)) return "floor";
  if (isBorder(x, y)) return "hard_block";
  const innerSoft =
    (x === 3 || x === 5 || x === 7 || x === 9) && (y === 2 || y === 4 || y === 6 || y === 8);
  return innerSoft ? "soft_block" : "floor";
}

export function createArenaGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let y = 0; y < ARENA_HEIGHT; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < ARENA_WIDTH; x++) {
      row.push({ type: cellType(x, y), x, y });
    }
    grid.push(row);
  }
  return grid;
}

export { SPAWN_POSITIONS };
