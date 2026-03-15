import { describe, it, expect } from "vitest";
import {
  createArena,
  createArenaGrid,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  SPAWN_POSITIONS,
} from "./index.js";
import type { TileType } from "../types.js";

const VALID_TILE_TYPES: TileType[] = ["floor", "hard_block", "soft_block"];

describe("arena", () => {
  describe("createArenaGrid", () => {
    it("returns grid with only floor, hard_block, soft_block", () => {
      const grid = createArenaGrid();
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          expect(VALID_TILE_TYPES).toContain(grid[y][x].type);
        }
      }
    });

    it("returns grid with correct dimensions", () => {
      const grid = createArenaGrid();
      expect(grid.length).toBe(ARENA_HEIGHT);
      expect(grid.every((row) => row.length === ARENA_WIDTH)).toBe(true);
    });

    it("has four corner spawn positions", () => {
      expect(SPAWN_POSITIONS).toHaveLength(4);
      expect(SPAWN_POSITIONS[0]).toEqual({ x: 1, y: 1 });
      expect(SPAWN_POSITIONS[1]).toEqual({ x: 11, y: 1 });
      expect(SPAWN_POSITIONS[2]).toEqual({ x: 1, y: 9 });
      expect(SPAWN_POSITIONS[3]).toEqual({ x: 11, y: 9 });
    });

    it("each spawn and its four neighbors are floor", () => {
      const grid = createArenaGrid();
      const dirs = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const pos of SPAWN_POSITIONS) {
        for (const [dx, dy] of dirs) {
          const x = pos.x + dx;
          const y = pos.y + dy;
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(ARENA_WIDTH);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThan(ARENA_HEIGHT);
          expect(grid[y][x].type).toBe("floor");
        }
      }
    });

    it("grid is symmetric (tile type at (x,y) matches (W-1-x, H-1-y))", () => {
      const grid = createArenaGrid();
      for (let y = 0; y < ARENA_HEIGHT; y++) {
        for (let x = 0; x < ARENA_WIDTH; x++) {
          const symX = ARENA_WIDTH - 1 - x;
          const symY = ARENA_HEIGHT - 1 - y;
          expect(grid[y][x].type).toBe(grid[symY][symX].type);
        }
      }
    });
  });

  describe("createArena", () => {
    it("createArena(2) returns 2 players at spawn coordinates with default bomb/range", () => {
      const { grid, initialPlayers } = createArena(2);
      expect(initialPlayers).toHaveLength(2);
      expect(initialPlayers[0]).toMatchObject({
        id: "player-0",
        x: 1,
        y: 1,
        alive: true,
        bombs: 1,
        range: 1,
      });
      expect(initialPlayers[1]).toMatchObject({
        id: "player-1",
        x: 11,
        y: 1,
        alive: true,
        bombs: 1,
        range: 1,
      });
      expect(grid.length).toBe(ARENA_HEIGHT);
    });

    it("createArena(4) returns 4 players at all four spawns", () => {
      const { initialPlayers } = createArena(4);
      expect(initialPlayers).toHaveLength(4);
      expect(initialPlayers[0].x).toBe(SPAWN_POSITIONS[0].x);
      expect(initialPlayers[0].y).toBe(SPAWN_POSITIONS[0].y);
      expect(initialPlayers[1].x).toBe(SPAWN_POSITIONS[1].x);
      expect(initialPlayers[1].y).toBe(SPAWN_POSITIONS[1].y);
      expect(initialPlayers[2].x).toBe(SPAWN_POSITIONS[2].x);
      expect(initialPlayers[2].y).toBe(SPAWN_POSITIONS[2].y);
      expect(initialPlayers[3].x).toBe(SPAWN_POSITIONS[3].x);
      expect(initialPlayers[3].y).toBe(SPAWN_POSITIONS[3].y);
      initialPlayers.forEach((p) => {
        expect(p.alive).toBe(true);
        expect(p.bombs).toBe(1);
        expect(p.range).toBe(1);
      });
    });
  });
});
