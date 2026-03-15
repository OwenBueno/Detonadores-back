import { describe, it, expect } from "vitest";
import {
  floorGrid,
  twoPlayers,
  createActiveEngine,
  runTicks,
  explosionSet,
  pl,
} from "./match-engine-helpers.js";

describe("MatchEngine", () => {
  describe("chain reactions", () => {
    it("explosion triggers another bomb before its timer completes", () => {
      const engine = createActiveEngine(
        floorGrid(3, 3),
        twoPlayers({ x: 0, y: 1, range: 2 }, { x: 2, y: 1 })
      );
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      engine.applyInput("p2", "place_bomb");
      runTicks(engine, 50);
      const snapshot = engine.getSnapshot();
      expect(snapshot.bombs.find((b) => b.x === 2 && b.y === 1)).toBeUndefined();
      const exp = explosionSet(snapshot);
      expect(exp.has("1,1")).toBe(true);
      expect(exp.has("2,1")).toBe(true);
    });

    it("player can place multiple bombs up to capacity", () => {
      const engine = createActiveEngine(
        floorGrid(3, 3),
        twoPlayers({ x: 0, y: 0, bombs: 2 }, { x: 2, y: 2 })
      );
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      let snapshot = engine.getSnapshot();
      expect(snapshot.bombs).toHaveLength(2);
      expect(snapshot.bombs.every((b) => b.ownerId === "p1")).toBe(true);
      expect(pl(snapshot, "p1")?.bombs).toBe(0);
    });

    it("bomb refund after explosion allows placing again", () => {
      const engine = createActiveEngine(floorGrid(2, 2), twoPlayers());
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      engine.applyInput("p1", "right");
      engine.applyInput("p1", "down");
      runTicks(engine, 51);
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.bombs).toBe(1);
      expect(pl(snapshot, "p1")?.alive).toBe(true);
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      expect(engine.getSnapshot().bombs).toHaveLength(1);
      expect(pl(engine.getSnapshot(), "p1")?.bombs).toBe(0);
    });
  });
});
