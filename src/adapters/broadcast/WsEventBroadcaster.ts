import type { EventBroadcaster, MatchEvent } from "../../ports/index.js";
import type { MatchSnapshot } from "../../domain/types.js";
import type { ServerMessage } from "../../protocol/index.js";
import type WebSocket from "ws";

export class WsEventBroadcaster implements EventBroadcaster {
  private roomClients = new Map<string, Set<WebSocket>>();

  addClient(roomId: string, ws: WebSocket): void {
    let set = this.roomClients.get(roomId);
    if (!set) {
      set = new Set();
      this.roomClients.set(roomId, set);
    }
    set.add(ws);
  }

  removeClient(ws: WebSocket): void {
    for (const set of this.roomClients.values()) {
      set.delete(ws);
    }
  }

  broadcastSnapshot(roomId: string, snapshot: MatchSnapshot): void {
    const set = this.roomClients.get(roomId);
    if (!set) return;
    const msg = JSON.stringify({ type: "match:snapshot", payload: snapshot });
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  broadcastEvent(roomId: string, event: MatchEvent): void {
    if (event.type !== "ended") return;
    const set = this.roomClients.get(roomId);
    if (!set) return;
    const payload = event.payload as { winnerId?: string };
    const msg = JSON.stringify({ type: "match:ended", payload });
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  sendToRoom(roomId: string, message: ServerMessage): void {
    const set = this.roomClients.get(roomId);
    if (!set) return;
    const msg = JSON.stringify(message);
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }
}
