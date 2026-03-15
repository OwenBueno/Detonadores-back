import type { MatchSnapshot } from "../domain/types.js";

export interface LiveMatchState {
  roomId: string;
  matchId: string;
  snapshot: MatchSnapshot;
  updatedAt: number;
}

export interface MatchStore {
  get(roomId: string): Promise<LiveMatchState | null>;
  set(state: LiveMatchState): Promise<void>;
  delete(roomId: string): Promise<void>;
}
