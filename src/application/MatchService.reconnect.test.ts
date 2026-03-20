import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MatchService } from "./MatchService.js";
import type { EventBroadcaster } from "../ports/EventBroadcaster.js";
import type { MatchRepository } from "../ports/MatchRepository.js";
import type { MatchStore } from "../ports/MatchStore.js";

function tinyGrid() {
  const c = (x: number, y: number) => ({ type: "floor" as const, x, y });
  return [
    [c(0, 0), c(1, 0)],
    [c(0, 1), c(1, 1)],
  ];
}

const players = [
  { id: "player-0", x: 0, y: 0, alive: true, bombs: 1, range: 1 },
  { id: "player-1", x: 1, y: 1, alive: true, bombs: 1, range: 1 },
];

describe("MatchService US-026 reconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("onPlayerReconnected clears reconnectPending and returns true", () => {
    const eventBroadcaster: EventBroadcaster = {
      broadcastSnapshot: () => {},
      broadcastEvent: () => {},
      sendToRoom: () => {},
    };
    const matchRepository: MatchRepository = {
      saveMatch: async () => {},
    };
    const matchStore: MatchStore = {
      set: async () => {},
      delete: async () => {},
      get: async () => null,
    };
    const svc = new MatchService("room-x", "match-x", {
      eventBroadcaster,
      matchRepository,
      matchStore,
    });
    svc.startMatch(tinyGrid(), players);
    svc.onPlayerDisconnected("player-0");
    expect(svc.getSnapshot().players[0]?.reconnectPending).toBe(true);
    expect(svc.onPlayerReconnected("player-0")).toBe(true);
    expect(svc.getSnapshot().players[0]?.reconnectPending).toBeFalsy();
  });

  it("onPlayerReconnected returns false when not pending", () => {
    const eventBroadcaster: EventBroadcaster = {
      broadcastSnapshot: () => {},
      broadcastEvent: () => {},
      sendToRoom: () => {},
    };
    const svc = new MatchService("room-y", "match-y", {
      eventBroadcaster,
      matchRepository: { saveMatch: async () => {} },
      matchStore: { set: async () => {}, delete: async () => {}, get: async () => null },
    });
    svc.startMatch(tinyGrid(), players);
    expect(svc.onPlayerReconnected("player-0")).toBe(false);
  });
});
