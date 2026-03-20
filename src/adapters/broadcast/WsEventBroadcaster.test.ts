import { describe, it, expect, vi } from "vitest";
import { WsEventBroadcaster } from "./WsEventBroadcaster.js";
import type { MatchSnapshot } from "../../domain/types.js";

const OPEN = 1;

function mockWs() {
  const send = vi.fn();
  return { readyState: OPEN, OPEN, send };
}

function minimalSnapshot(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    status: "active",
    tick: 0,
    grid: [],
    players: [],
    bombs: [],
    explosions: [],
    powerups: [],
    ...overrides,
  };
}

describe("WsEventBroadcaster", () => {
  describe("room-scoped broadcast", () => {
    it("sends snapshot only to clients in the given room", () => {
      const broadcaster = new WsEventBroadcaster();
      const roomA1 = mockWs();
      const roomA2 = mockWs();
      const roomB1 = mockWs();

      broadcaster.addClient("room-a", roomA1 as never);
      broadcaster.addClient("room-a", roomA2 as never);
      broadcaster.addClient("room-b", roomB1 as never);

      const snapshot = minimalSnapshot({ tick: 1 });
      broadcaster.broadcastSnapshot("room-a", snapshot);

      expect(roomA1.send).toHaveBeenCalledTimes(1);
      expect(roomA2.send).toHaveBeenCalledTimes(1);
      expect(roomB1.send).not.toHaveBeenCalled();

      const sentA = JSON.parse(roomA1.send.mock.calls[0][0]);
      expect(sentA.type).toBe("match:snapshot");
      expect(sentA.payload.tick).toBe(1);
    });

    it("sends match:ended only to clients in the given room", () => {
      const broadcaster = new WsEventBroadcaster();
      const roomA1 = mockWs();
      const roomB1 = mockWs();

      broadcaster.addClient("room-a", roomA1 as never);
      broadcaster.addClient("room-b", roomB1 as never);

      broadcaster.broadcastEvent("room-a", {
        type: "ended",
        payload: { winnerId: "player-0" },
      });

      expect(roomA1.send).toHaveBeenCalledTimes(1);
      expect(roomB1.send).not.toHaveBeenCalled();

      const sent = JSON.parse(roomA1.send.mock.calls[0][0]);
      expect(sent.type).toBe("match:ended");
      expect(sent.payload.winnerId).toBe("player-0");
    });

    it("removeClient removes socket from all rooms", () => {
      const broadcaster = new WsEventBroadcaster();
      const ws = mockWs();
      broadcaster.addClient("room-a", ws as never);
      broadcaster.removeClient(ws as never);

      broadcaster.broadcastSnapshot("room-a", minimalSnapshot());
      expect(ws.send).not.toHaveBeenCalled();
    });

    it("does not send to unknown room", () => {
      const broadcaster = new WsEventBroadcaster();
      const ws = mockWs();
      broadcaster.addClient("room-a", ws as never);

      broadcaster.broadcastSnapshot("room-other", minimalSnapshot());
      broadcaster.broadcastEvent("room-other", { type: "ended", payload: {} });

      expect(ws.send).not.toHaveBeenCalled();
    });
  });
});
