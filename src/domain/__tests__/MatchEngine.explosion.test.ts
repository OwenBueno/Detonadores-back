import { describe, it, expect } from "vitest";
import {
  c,
  floorGrid,
  twoPlayers,
  createActiveEngine,
  runTicks,
  explosionSet,
  pl,
} from "./match-engine-helpers.js";

describe("MatchEngine", () => {
  describe("explosion propagation", () => {
    it("explosions spread in cross pattern from bomb origin", () => {
      const engine = createActiveEngine(
        floorGrid(3, 3),
        twoPlayers({ x: 1, y: 1, range: 2 })
      );
      engine.applyInput("p1", "place_bomb");
      runTicks(engine, 51);
      const exp = explosionSet(engine.getSnapshot());
      expect(exp.has("1,1")).toBe(true);
      expect(exp.has("1,0")).toBe(true);
      expect(exp.has("1,2")).toBe(true);
      expect(exp.has("0,1")).toBe(true);
      expect(exp.has("2,1")).toBe(true);
      expect(exp.has("1,-1")).toBe(false);
      expect(exp.has("3,1")).toBe(false);
    });

    it("hard blocks stop propagation", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor"), c(2, 0, "floor"), c(3, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor"), c(2, 1, "hard_block"), c(3, 1, "floor")],
        [c(0, 2, "floor"), c(1, 2, "floor"), c(2, 2, "floor"), c(3, 2, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 1, y: 1, range: 3 }));
      engine.applyInput("p1", "place_bomb");
      runTicks(engine, 51);
      const exp = explosionSet(engine.getSnapshot());
      expect(exp.has("2,1")).toBe(false);
      expect(exp.has("3,1")).toBe(false);
    });

    it("soft blocks are destroyed and stop propagation beyond their tile", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor"), c(2, 0, "floor"), c(3, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor"), c(2, 1, "soft_block"), c(3, 1, "floor")],
        [c(0, 2, "floor"), c(1, 2, "floor"), c(2, 2, "floor"), c(3, 2, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 1, y: 1, range: 3 }));
      engine.applyInput("p1", "place_bomb");
      runTicks(engine, 51);
      const snapshot = engine.getSnapshot();
      const exp = explosionSet(snapshot);
      expect(exp.has("2,1")).toBe(true);
      expect(snapshot.grid[1]?.[2]?.type).toBe("floor");
      expect(exp.has("3,1")).toBe(false);
    });

    it("player on explosion tile is marked dead", () => {
      const engine = createActiveEngine(
        floorGrid(3, 3),
        twoPlayers({ x: 0, y: 0 }, { x: 0, y: 1 })
      );
      engine.applyInput("p1", "place_bomb");
      engine.applyInput("p1", "right");
      engine.applyInput("p1", "right");
      runTicks(engine, 51);
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.alive).toBe(true);
      expect(pl(snapshot, "p2")?.alive).toBe(false);
    });

    it("player with active shield on explosion tile survives and shield is consumed", () => {
      const engine = createActiveEngine(floorGrid(2, 2), twoPlayers({ shieldActive: true }));
      engine.applyInput("p1", "place_bomb");
      runTicks(engine, 51);
      const p1 = pl(engine.getSnapshot(), "p1");
      expect(p1?.alive).toBe(true);
      expect(p1?.shieldActive).toBe(false);
    });
  });
});
