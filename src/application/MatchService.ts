import { MatchEngine } from "../domain/MatchEngine.js";
import { TICK_INTERVAL_MS } from "../domain/constants.js";
import type { GridCell, PlayerState } from "../domain/types.js";
import type { EventBroadcaster } from "../ports/EventBroadcaster.js";
import type { MatchRepository } from "../ports/MatchRepository.js";
import type { MatchStore } from "../ports/MatchStore.js";

export interface MatchServiceDeps {
  matchRepository: MatchRepository;
  eventBroadcaster: EventBroadcaster;
  matchStore: MatchStore;
}

export class MatchService {
  private engine: MatchEngine;
  private roomId: string;
  private matchId: string;
  private deps: MatchServiceDeps;
  private tickLoopId: ReturnType<typeof setInterval> | null = null;

  constructor(roomId: string, matchId: string, deps: MatchServiceDeps) {
    this.roomId = roomId;
    this.matchId = matchId;
    this.deps = deps;
    this.engine = new MatchEngine();
  }

  startMatch(initialGrid: GridCell[][], initialPlayers: PlayerState[]): void {
    this.engine.startMatch(initialGrid, initialPlayers);
    this.broadcastSnapshot();
    this.tickLoopId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  applyInput(playerId: string, input: "up" | "down" | "left" | "right" | "place_bomb"): void {
    this.engine.applyInput(playerId, input);
  }

  tick(): void {
    this.engine.tick();
    const snapshot = this.engine.getSnapshot();
    this.broadcastSnapshot();

    if (snapshot.status === "ended") {
      if (this.tickLoopId !== null) {
        clearInterval(this.tickLoopId);
        this.tickLoopId = null;
      }
      const winnerId = snapshot.winnerId;
      this.deps.eventBroadcaster.broadcastEvent({
        type: "ended",
        payload: { winnerId },
      });
      this.deps.matchRepository
        .saveMatch({
          matchId: this.matchId,
          roomId: this.roomId,
          snapshot,
          winnerId,
          finishedAt: new Date(),
        })
        .catch(() => {});
      this.deps.matchStore.delete(this.roomId).catch(() => {});
    } else {
      this.deps.matchStore
        .set({
          roomId: this.roomId,
          matchId: this.matchId,
          snapshot,
          updatedAt: Date.now(),
        })
        .catch(() => {});
    }
  }

  getSnapshot() {
    return this.engine.getSnapshot();
  }

  private broadcastSnapshot(): void {
    this.deps.eventBroadcaster.broadcastSnapshot(this.engine.getSnapshot());
  }
}
