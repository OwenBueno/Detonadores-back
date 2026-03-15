import { describe, it, expect } from "vitest";
import { c, floorGrid, twoPlayers, createActiveEngine, pl } from "./match-engine-helpers.js";

describe("MatchEngine", () => {
  describe("movement and collision", () => {
    it("moves player in four directions when target is floor", () => {
      const engine = createActiveEngine(
        floorGrid(3, 3),
        twoPlayers({ x: 1, y: 1 }, { x: 2, y: 2 })
      );
      const move = (
        dir: "up" | "down" | "left" | "right",
        expected: { x: number; y: number }
      ) => {
        engine.applyInput("p1", dir);
        engine.tick();
        expect(engine.getSnapshot().players[0]).toMatchObject(expected);
      };
      move("up", { x: 1, y: 0 });
      move("down", { x: 1, y: 1 });
      move("left", { x: 0, y: 1 });
      move("right", { x: 1, y: 1 });
    });

    it("blocks movement into hard_block and soft_block", () => {
      const grid = [
        [c(0, 0, "floor"), c(1, 0, "hard_block"), c(2, 0, "floor")],
        [c(0, 1, "soft_block"), c(1, 1, "floor"), c(2, 1, "floor")],
        [c(0, 2, "floor"), c(1, 2, "floor"), c(2, 2, "floor")],
      ];
      const engine = createActiveEngine(grid, twoPlayers({ x: 1, y: 1 }, { x: 0, y: 0 }));
      engine.applyInput("p1", "up");
      engine.tick();
      expect(engine.getSnapshot().players[0]).toMatchObject({ x: 1, y: 1 });
      engine.applyInput("p1", "left");
      engine.tick();
      expect(engine.getSnapshot().players[0]).toMatchObject({ x: 1, y: 1 });
    });

    it("blocks movement out of bounds", () => {
      const engine = createActiveEngine(floorGrid(2, 2), twoPlayers());
      const stay = (dir: "up" | "down" | "left" | "right") => {
        engine.applyInput("p1", dir);
        engine.tick();
      };
      stay("up");
      expect(pl(engine.getSnapshot(), "p1")).toMatchObject({ x: 0, y: 0 });
      stay("left");
      expect(pl(engine.getSnapshot(), "p1")).toMatchObject({ x: 0, y: 0 });
      engine.applyInput("p1", "right");
      engine.tick();
      expect(pl(engine.getSnapshot(), "p1")).toMatchObject({ x: 1, y: 0 });
      engine.applyInput("p1", "left");
      engine.tick();
      engine.applyInput("p1", "down");
      engine.tick();
      expect(pl(engine.getSnapshot(), "p1")).toMatchObject({ x: 0, y: 1 });
      stay("down");
      expect(pl(engine.getSnapshot(), "p1")).toMatchObject({ x: 0, y: 1 });
    });
  });
});
