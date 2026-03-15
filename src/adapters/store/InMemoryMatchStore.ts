import type { MatchStore, LiveMatchState } from "../../ports/index.js";

export class InMemoryMatchStore implements MatchStore {
  private store = new Map<string, LiveMatchState>();

  async get(roomId: string): Promise<LiveMatchState | null> {
    return this.store.get(roomId) ?? null;
  }

  async set(state: LiveMatchState): Promise<void> {
    this.store.set(state.roomId, state);
  }

  async delete(roomId: string): Promise<void> {
    this.store.delete(roomId);
  }
}
