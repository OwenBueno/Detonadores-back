import type { EventBroadcaster, MatchEvent } from "../../ports/index.js";
import type { MatchSnapshot } from "../../domain/types.js";

export class WsEventBroadcaster implements EventBroadcaster {
  broadcastSnapshot(snapshot: MatchSnapshot): void {
    // Stub: real implementation will send to connected WS clients
  }

  broadcastEvent(event: MatchEvent): void {
    // Stub: real implementation will send event to clients
  }
}
