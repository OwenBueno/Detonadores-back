import type { MatchSnapshot } from "../domain/types.js";

export type MatchEventType = "snapshot" | "event" | "ended";

export interface MatchEvent {
  type: MatchEventType;
  payload: MatchSnapshot | unknown;
}

export interface EventBroadcaster {
  broadcastSnapshot(snapshot: MatchSnapshot): void;
  broadcastEvent(event: MatchEvent): void;
}
