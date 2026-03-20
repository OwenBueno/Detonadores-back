import { MatchEngine } from "../domain/MatchEngine.js";
import { TICK_INTERVAL_MS, RECONNECT_GRACE_MS } from "../domain/constants.js";
import type { GridCell, MatchSnapshot, PlayerState } from "../domain/types.js";
import type { EventBroadcaster } from "../ports/EventBroadcaster.js";
import type { MatchRepository } from "../ports/MatchRepository.js";
import type { MatchStore } from "../ports/MatchStore.js";

export interface MatchServiceDeps {
  matchRepository: MatchRepository;
  eventBroadcaster: EventBroadcaster;
  matchStore: MatchStore;
  onMatchEnded?: (roomId: string) => void;
}

export class MatchService {
  private engine: MatchEngine;
  private roomId: string;
  private matchId: string;
  private deps: MatchServiceDeps;
  private tickLoopId: ReturnType<typeof setInterval> | null = null;
  private reconnectGraceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private matchFinalized = false;

  constructor(roomId: string, matchId: string, deps: MatchServiceDeps) {
    this.roomId = roomId;
    this.matchId = matchId;
    this.deps = deps;
    this.engine = new MatchEngine();
  }

  startMatch(initialGrid: GridCell[][], initialPlayers: PlayerState[]): void {
    this.matchFinalized = false;
    this.clearReconnectGraceTimers();
    this.engine.startMatch(initialGrid, initialPlayers);
    this.broadcastSnapshot();
    this.tickLoopId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  onPlayerReconnected(playerId: string): boolean {
    const status = this.engine.getSnapshot().status;
    if (status === "ended" || status === "waiting") return false;
    const snap = this.engine.getSnapshot();
    const p = snap.players.find((x) => x.id === playerId);
    if (!p || !p.alive || !p.reconnectPending) return false;
    const existing = this.reconnectGraceTimers.get(playerId);
    if (existing !== undefined) {
      clearTimeout(existing);
      this.reconnectGraceTimers.delete(playerId);
    }
    this.engine.setPlayerReconnectPending(playerId, false);
    this.broadcastSnapshot();
    return true;
  }

  onPlayerDisconnected(playerId: string): void {
    const status = this.engine.getSnapshot().status;
    if (status === "ended" || status === "waiting") return;
    const existing = this.reconnectGraceTimers.get(playerId);
    if (existing !== undefined) clearTimeout(existing);
    this.engine.setPlayerReconnectPending(playerId, true);
    this.broadcastSnapshot();
    const timer = setTimeout(() => {
      this.reconnectGraceTimers.delete(playerId);
      const snap = this.engine.getSnapshot();
      if (snap.status === "ended") return;
      const p = snap.players.find((x) => x.id === playerId);
      if (p?.reconnectPending) {
        this.engine.forfeitDisconnectedPlayer(playerId);
        this.broadcastSnapshot();
        const after = this.engine.getSnapshot();
        if (after.status === "ended") {
          this.finalizeEndedMatch(after);
        }
      }
    }, RECONNECT_GRACE_MS);
    this.reconnectGraceTimers.set(playerId, timer);
  }

  addPlayer(player: PlayerState): void {
    this.engine.addPlayer(player);
    this.broadcastSnapshot();
  }

  applyInput(playerId: string, input: "up" | "down" | "left" | "right" | "place_bomb"): void {
    this.engine.applyInput(playerId, input);
  }

  tick(): void {
    this.engine.tick();
    const snapshot = this.engine.getSnapshot();
    this.broadcastSnapshot();

    if (snapshot.status === "ended") {
      this.finalizeEndedMatch(snapshot);
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

  private finalizeEndedMatch(snapshot: MatchSnapshot): void {
    if (this.matchFinalized) return;
    if (snapshot.status !== "ended") return;
    this.matchFinalized = true;
    this.clearReconnectGraceTimers();
    if (this.tickLoopId !== null) {
      clearInterval(this.tickLoopId);
      this.tickLoopId = null;
    }
    const winnerId = snapshot.winnerId;
    this.deps.eventBroadcaster.broadcastEvent(this.roomId, {
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
    this.deps.onMatchEnded?.(this.roomId);
  }

  private broadcastSnapshot(): void {
    this.deps.eventBroadcaster.broadcastSnapshot(this.roomId, this.engine.getSnapshot());
  }

  private clearReconnectGraceTimers(): void {
    for (const t of this.reconnectGraceTimers.values()) clearTimeout(t);
    this.reconnectGraceTimers.clear();
  }
}
