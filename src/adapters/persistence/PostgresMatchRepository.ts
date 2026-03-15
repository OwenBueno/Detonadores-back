import type { MatchRepository, MatchResult } from "../../ports/index.js";

export class PostgresMatchRepository implements MatchRepository {
  async saveMatch(result: MatchResult): Promise<void> {
    // Stub: real implementation will use pg client
    await Promise.resolve();
  }
}
