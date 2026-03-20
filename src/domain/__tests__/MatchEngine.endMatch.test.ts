import { describe, it, expect } from "vitest";
import { MatchEngine } from "../MatchEngine.js";
import { floorGrid, twoPlayers } from "./match-engine-helpers.js";

describe("MatchEngine endMatch", () => {
  it("endMatch is idempotent and preserves first winnerId", () => {
    const engine = new MatchEngine();
    engine.startMatch(floorGrid(2, 2), twoPlayers());

    engine.endMatch("p1");
    engine.endMatch("p2");

    const snapshot = engine.getSnapshot();
    expect(snapshot.status).toBe("ended");
    expect(snapshot.winnerId).toBe("p1");
  });
});

