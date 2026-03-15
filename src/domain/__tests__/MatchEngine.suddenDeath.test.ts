import { describe, it, expect } from "vitest";
import type { PowerupState } from "../types.js";
import { MatchEngine } from "../MatchEngine.js";
import { SUDDEN_DEATH_START_TICK, getCollapseOrder } from "../suddenDeathConstants.js";
import {
  c,
  floorGrid,
  twoPlayers,
  createActiveEngine,
  runTicks,
  pl,
} from "./match-engine-helpers.js";

function collapsedCount(snapshot: { grid: { type: string }[][] }): number {
  let n = 0;
  for (const row of snapshot.grid) for (const cell of row) if (cell.type === "collapsed") n++;
  return n;
}

function injectPowerups(engine: MatchEngine, powerups: PowerupState[]): void {
  (engine as unknown as { powerups: PowerupState[] }).powerups.push(...powerups);
}

describe("MatchEngine", () => {
  describe("sudden death", () => {
    it("sudden death starts after threshold", () => {
      const threshold = 5;
      const engine = new MatchEngine(undefined, threshold);
      const grid = floorGrid(3, 3);
      engine.startMatch(grid, twoPlayers());
      engine.tick();
      runTicks(engine, threshold - 1);
      let snapshot = engine.getSnapshot();
      expect(collapsedCount(snapshot)).toBe(0);
      runTicks(engine, 1);
      snapshot = engine.getSnapshot();
      expect(collapsedCount(snapshot)).toBe(1);
    });

    it("collapse order is outer ring first", () => {
      const threshold = 1;
      const engine = new MatchEngine(undefined, threshold);
      const grid = floorGrid(5, 5);
      engine.startMatch(grid, twoPlayers({ x: 2, y: 2 }, { x: 2, y: 2 }));
      runTicks(engine, threshold + 3);
      const snapshot = engine.getSnapshot();
      const order = getCollapseOrder(5, 5);
      for (let i = 0; i < 3; i++) {
        const { x, y } = order[i]!;
        expect(snapshot.grid[y]?.[x]?.type).toBe("collapsed");
      }
      const perimeter = (x: number, y: number) =>
        x === 0 || x === 4 || y === 0 || y === 4;
      expect(perimeter(order[0]!.x, order[0]!.y)).toBe(true);
    });

    it("player on collapsed tile dies", () => {
      const threshold = 1;
      const order = getCollapseOrder(3, 3);
      const [first] = order;
      const engine = new MatchEngine(undefined, threshold);
      const grid = floorGrid(3, 3);
      engine.startMatch(
        grid,
        twoPlayers({ x: first!.x, y: first!.y }, { x: 1, y: 1 })
      );
      engine.tick();
      runTicks(engine, threshold);
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.alive).toBe(false);
      expect(pl(snapshot, "p2")?.alive).toBe(true);
    });

    it("bomb on collapsed tile is removed and owner refunded", () => {
      const threshold = 1;
      const order = getCollapseOrder(3, 3);
      const [first] = order;
      const engine = new MatchEngine(undefined, threshold);
      const grid = floorGrid(3, 3);
      const players = twoPlayers(
        { x: first!.x, y: first!.y, bombs: 0 },
        { x: 2, y: 2 }
      );
      engine.startMatch(grid, players);
      engine.tick();
      (engine as unknown as { bombs: { id: string; x: number; y: number; ownerId: string; range: number; ticksRemaining: number }[] }).bombs.push({
        id: "b1",
        x: first!.x,
        y: first!.y,
        ownerId: "p1",
        range: 1,
        ticksRemaining: 50,
      });
      runTicks(engine, threshold);
      const snapshot = engine.getSnapshot();
      expect(snapshot.bombs).toHaveLength(0);
      expect(pl(snapshot, "p1")?.bombs).toBe(1);
    });

    it("powerup on collapsed tile is removed", () => {
      const threshold = 1;
      const order = getCollapseOrder(3, 3);
      const [first] = order;
      const engine = new MatchEngine(undefined, threshold);
      const grid = floorGrid(3, 3);
      engine.startMatch(grid, twoPlayers({ x: 1, y: 1 }, { x: 2, y: 2 }));
      engine.tick();
      injectPowerups(engine, [{ x: first!.x, y: first!.y, type: "bomb_capacity" }]);
      expect(engine.getSnapshot().powerups).toHaveLength(1);
      runTicks(engine, threshold);
      const snapshot = engine.getSnapshot();
      expect(snapshot.powerups.some((p) => p.x === first!.x && p.y === first!.y)).toBe(false);
    });
  });
});
