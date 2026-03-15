import type { MatchSnapshot } from "../domain/types.js";

export interface MatchResult {
  matchId: string;
  roomId: string;
  snapshot: MatchSnapshot;
  winnerId?: string;
  finishedAt: Date;
}

export interface MatchRepository {
  saveMatch(result: MatchResult): Promise<void>;
}
