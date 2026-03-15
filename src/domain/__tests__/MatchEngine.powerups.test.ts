import { describe, it, expect } from "vitest";
import { MatchEngine } from "../MatchEngine.js";
import { POWERUP_SPAWN_CHANCE, POWERUP_TYPES } from "../powerupConstants.js";
import {
  c,
  floorGrid,
  twoPlayers,
  runTicks,
} from "./match-engine-helpers.js";

describe("MatchEngine", () => {
  describe("powerup spawn", () => {
    it("soft block destroyed with spawn when random < P", () => {
      const values = [0.1, 0];
      const random = () => values.shift() ?? 0.99;
      const engine = new MatchEngine(random);
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor"), c(2, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor"), c(2, 1, "soft_block")],
        [c(0, 2, "floor"), c(1, 2, "floor"), c(2, 2, "floor")],
      ];
      engine.startMatch(grid, twoPlayers({ x: 1, y: 1, range: 3 }));
      engine.tick();
      engine.applyInput("p1", "place_bomb");
      runTicks(engine, 51);
      const snapshot = engine.getSnapshot();
      const at21 = snapshot.powerups.filter((p) => p.x === 2 && p.y === 1);
      expect(at21).toHaveLength(1);
      expect(POWERUP_TYPES).toContain(at21[0]!.type);
      expect(snapshot.grid[1]?.[2]?.type).toBe("floor");
    });

    it("soft block destroyed without spawn when random >= P", () => {
      const engine = new MatchEngine(() => POWERUP_SPAWN_CHANCE);
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor"), c(2, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor"), c(2, 1, "soft_block")],
        [c(0, 2, "floor"), c(1, 2, "floor"), c(2, 2, "floor")],
      ];
      engine.startMatch(grid, twoPlayers({ x: 1, y: 1, range: 3 }));
      engine.tick();
      engine.applyInput("p1", "place_bomb");
      runTicks(engine, 51);
      const snapshot = engine.getSnapshot();
      expect(snapshot.powerups).toHaveLength(0);
      expect(snapshot.grid[1]?.[2]?.type).toBe("floor");
    });

    it("powerups are visible in snapshot", () => {
      const engine = new MatchEngine(() => 0);
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor"), c(2, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor"), c(2, 1, "soft_block")],
        [c(0, 2, "floor"), c(1, 2, "floor"), c(2, 2, "floor")],
      ];
      engine.startMatch(grid, twoPlayers({ x: 1, y: 1, range: 3 }));
      engine.tick();
      engine.applyInput("p1", "place_bomb");
      runTicks(engine, 51);
      const snapshot = engine.getSnapshot();
      expect(snapshot.powerups).toHaveLength(1);
      expect(snapshot.powerups[0]).toMatchObject({ x: 2, y: 1 });
      expect(POWERUP_TYPES).toContain(snapshot.powerups[0]!.type);
    });

    it("five powerup types are supported", () => {
      expect(POWERUP_TYPES).toHaveLength(5);
      const set = new Set(POWERUP_TYPES);
      expect(set.has("bomb_capacity")).toBe(true);
      expect(set.has("flame_range")).toBe(true);
      expect(set.has("speed")).toBe(true);
      expect(set.has("shield")).toBe(true);
      expect(set.has("special")).toBe(true);
    });
  });
});
