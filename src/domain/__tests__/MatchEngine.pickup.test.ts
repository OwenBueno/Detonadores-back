import { describe, it, expect } from "vitest";
import type { PowerupState } from "../types.js";
import { MatchEngine } from "../MatchEngine.js";
import { MAX_SPEED } from "../powerupConstants.js";
import {
  c,
  floorGrid,
  twoPlayers,
  createActiveEngine,
  pl,
} from "./match-engine-helpers.js";

function injectPowerups(engine: MatchEngine, powerups: PowerupState[]): void {
  (engine as unknown as { powerups: PowerupState[] }).powerups.push(...powerups);
}

describe("MatchEngine", () => {
  describe("powerup pickup", () => {
    it("pickup bomb_capacity increases player bombs", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 0, y: 0 }));
      injectPowerups(engine, [{ x: 1, y: 0, type: "bomb_capacity" }]);
      engine.applyInput("p1", "right");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.bombs).toBe(2);
      expect(pl(snapshot, "p1")?.x).toBe(1);
      expect(pl(snapshot, "p1")?.y).toBe(0);
    });

    it("pickup flame_range increases player range", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 0, y: 0 }));
      injectPowerups(engine, [{ x: 1, y: 0, type: "flame_range" }]);
      engine.applyInput("p1", "right");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.range).toBe(2);
    });

    it("pickup speed sets player speed and allows multi-step move", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor"), c(2, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor"), c(2, 1, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 0, y: 0 }));
      injectPowerups(engine, [{ x: 1, y: 0, type: "speed" }]);
      engine.applyInput("p1", "right");
      engine.tick();
      let snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.speed).toBe(2);
      expect(pl(snapshot, "p1")?.x).toBe(1);
      engine.applyInput("p1", "right");
      engine.tick();
      snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.x).toBe(2);
    });

    it("speed is capped at MAX_SPEED", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor"), c(2, 0, "floor"), c(3, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor"), c(2, 1, "floor"), c(3, 1, "floor")],
      ];
      const engine = createActiveEngine(
        grid,
        twoPlayers({ x: 0, y: 0, speed: MAX_SPEED })
      );
      injectPowerups(engine, [{ x: 1, y: 0, type: "speed" }]);
      engine.applyInput("p1", "right");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.speed).toBe(MAX_SPEED);
    });

    it("pickup shield sets shieldActive", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 0, y: 0 }));
      injectPowerups(engine, [{ x: 1, y: 0, type: "shield" }]);
      engine.applyInput("p1", "right");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.shieldActive).toBe(true);
    });

    it("pickup special sets shieldActive (same as shield)", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 0, y: 0 }));
      injectPowerups(engine, [{ x: 1, y: 0, type: "special" }]);
      engine.applyInput("p1", "right");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(pl(snapshot, "p1")?.shieldActive).toBe(true);
    });

    it("powerup is removed from snapshot after pickup", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "floor")],
        [c(0, 1, "floor"), c(1, 1, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 0, y: 0 }));
      injectPowerups(engine, [{ x: 1, y: 0, type: "bomb_capacity" }]);
      expect(engine.getSnapshot().powerups).toHaveLength(1);
      engine.applyInput("p1", "right");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(snapshot.powerups).toHaveLength(0);
      expect(snapshot.powerups.some((p) => p.x === 1 && p.y === 0)).toBe(false);
    });
  });
});
