import { describe, it, expect } from "vitest";
import { MatchEngine } from "../MatchEngine.js";
import { createArena } from "../arena/index.js";
import {
  c,
  floorGrid,
  twoPlayers,
} from "./match-engine-helpers.js";

describe("MatchEngine", () => {
  describe("lifecycle", () => {
    it("exposes getSnapshot with initial state", () => {
      const snapshot = new MatchEngine().getSnapshot();
      expect(snapshot.status).toBe("waiting");
      expect(snapshot.tick).toBe(0);
      expect(snapshot.players).toEqual([]);
      expect(snapshot.bombs).toEqual([]);
      expect(snapshot.explosions).toEqual([]);
    });

    it("startMatch with one player starts and has one player", () => {
      const engine = new MatchEngine();
      engine.startMatch([[c(0, 0, "floor")]], twoPlayers().slice(0, 1));
      const snapshot = engine.getSnapshot();
      expect(snapshot.status).toBe("starting");
      expect(snapshot.players).toHaveLength(1);
    });

    it("startMatch sets status to starting and stores grid and players when at least 2 players", () => {
      const grid = floorGrid(2, 2);
      const players = twoPlayers();
      const engine = new MatchEngine();
      engine.startMatch(grid, players);
      const snapshot = engine.getSnapshot();
      expect(snapshot.status).toBe("starting");
      expect(snapshot.grid).toEqual(grid);
      expect(snapshot.players).toHaveLength(2);
    });

    it("first tick after startMatch transitions status from starting to active", () => {
      const { grid, initialPlayers } = createArena(2);
      const engine = new MatchEngine();
      engine.startMatch(grid, initialPlayers);
      expect(engine.getSnapshot().status).toBe("starting");
      engine.tick();
      expect(engine.getSnapshot().status).toBe("active");
    });

    it("startMatch with createArena(2) runs with grid and two players at spawns", () => {
      const { grid, initialPlayers } = createArena(2);
      const engine = new MatchEngine();
      engine.startMatch(grid, initialPlayers);
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(snapshot.status).toBe("active");
      expect(snapshot.grid).toEqual(grid);
      expect(snapshot.players).toHaveLength(2);
      expect(snapshot.players[0]).toMatchObject({ id: "player-0", x: 1, y: 1, alive: true });
      expect(snapshot.players[1]).toMatchObject({ id: "player-1", x: 11, y: 1, alive: true });
    });

    it("after win condition status is ended and getSnapshot returns winnerId", () => {
      const engine = new MatchEngine();
      engine.startMatch(floorGrid(2, 2), twoPlayers({}, { alive: false }));
      engine.tick();
      const snapshot = engine.getSnapshot();
      expect(snapshot.status).toBe("ended");
      expect(snapshot.winnerId).toBe("p1");
    });

    it("preserves cosmetic characterId on players across ticks (US-033)", () => {
      const { grid, initialPlayers } = createArena(2);
      const withCosmetics = initialPlayers.map((p, i) => ({
        ...p,
        characterId: i === 0 ? "char_1" : "char_2",
      }));
      const engine = new MatchEngine();
      engine.startMatch(grid, withCosmetics);
      engine.tick();
      expect(engine.getSnapshot().players[0]?.characterId).toBe("char_1");
      expect(engine.getSnapshot().players[1]?.characterId).toBe("char_2");
      engine.tick();
      expect(engine.getSnapshot().players[0]?.characterId).toBe("char_1");
      expect(engine.getSnapshot().players[1]?.characterId).toBe("char_2");
    });
  });
});
