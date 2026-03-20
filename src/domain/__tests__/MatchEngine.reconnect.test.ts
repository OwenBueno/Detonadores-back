import { describe, it, expect } from "vitest";
import { createActiveEngine, floorGrid, pl, twoPlayers } from "./match-engine-helpers.js";

describe("MatchEngine", () => {
  describe("reconnect pending (US-025)", () => {
    it("ignores movement and bomb input while reconnectPending", () => {
      const engine = createActiveEngine(floorGrid(3, 3), twoPlayers({ x: 1, y: 1 }, { x: 2, y: 2 }));
      engine.setPlayerReconnectPending("p1", true);
      expect(pl(engine.getSnapshot(), "p1")).toMatchObject({ reconnectPending: true, x: 1, y: 1 });
      engine.applyInput("p1", "up");
      engine.tick();
      expect(pl(engine.getSnapshot(), "p1")).toMatchObject({ x: 1, y: 1, reconnectPending: true });
      engine.applyInput("p1", "place_bomb");
      engine.tick();
      expect(engine.getSnapshot().bombs.filter((b) => b.ownerId === "p1")).toHaveLength(0);
    });

    it("clears reconnectPending when set to false", () => {
      const engine = createActiveEngine(floorGrid(3, 3), twoPlayers({ x: 1, y: 1 }));
      engine.setPlayerReconnectPending("p1", true);
      engine.setPlayerReconnectPending("p1", false);
      expect(pl(engine.getSnapshot(), "p1")?.reconnectPending).toBeUndefined();
    });

    it("forfeitDisconnectedPlayer marks dead and clears pending", () => {
      const engine = createActiveEngine(floorGrid(3, 3), twoPlayers());
      engine.setPlayerReconnectPending("p1", true);
      engine.forfeitDisconnectedPlayer("p1");
      const p1 = pl(engine.getSnapshot(), "p1");
      expect(p1?.alive).toBe(false);
      expect(p1?.reconnectPending).toBeUndefined();
    });

    it("forfeit on two-player match ends with winner", () => {
      const engine = createActiveEngine(floorGrid(3, 3), twoPlayers());
      engine.setPlayerReconnectPending("p1", true);
      engine.forfeitDisconnectedPlayer("p1");
      const snap = engine.getSnapshot();
      expect(snap.status).toBe("ended");
      expect(snap.winnerId).toBe("p2");
    });
  });
});
