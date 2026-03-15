import { describe, it, expect } from "vitest";
import {
  floorGrid,
  twoPlayers,
  createActiveEngine,
  runTicks,
  pl,
} from "./match-engine-helpers.js";

describe("MatchEngine", () => {
  describe("bomb placement", () => {
    it("place_bomb adds bomb at player tile and decrements capacity", () => {
      const engine = createActiveEngine(floorGrid(2, 2), twoPlayers({ x: 1, y: 1 }));
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(snapshot.bombs).toHaveLength(1);
      expect(snapshot.bombs[0]).toMatchObject({
        x: 1,
        y: 1,
        ownerId: "p1",
        range: 1,
        ticksRemaining: 49,
      });
      expect(pl(snapshot, "p1")?.bombs).toBe(0);
    });

    it("place_bomb when bombs === 0 does nothing", () => {
      const engine = createActiveEngine(floorGrid(2, 2), twoPlayers({ x: 1, y: 1 }));
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(snapshot.bombs).toHaveLength(1);
      expect(pl(snapshot, "p1")?.bombs).toBe(0);
    });

    it("bomb is timer-driven and tracked in snapshot", () => {
      const engine = createActiveEngine(floorGrid(2, 2), twoPlayers({ x: 1, y: 1 }));
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      expect(engine.getSnapshot().bombs[0]?.ticksRemaining).toBe(49);
      runTicks(engine, 49);
      const after = engine.getSnapshot();
      expect(after.bombs).toHaveLength(0);
      expect(after.explosions.length).toBeGreaterThan(0);
    });
  });
});
