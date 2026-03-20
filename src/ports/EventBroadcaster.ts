import type { MatchSnapshot } from "../domain/types.js";
import type { ServerMessage } from "../protocol/index.js";

export type MatchEventType = "snapshot" | "event" | "ended";

export interface MatchEvent {
  type: MatchEventType;
  payload: MatchSnapshot | unknown;
}

export interface EventBroadcaster {
  broadcastSnapshot(roomId: string, snapshot: MatchSnapshot): void;
  broadcastEvent(roomId: string, event: MatchEvent): void;
  sendToRoom(roomId: string, message: ServerMessage): void;
}
