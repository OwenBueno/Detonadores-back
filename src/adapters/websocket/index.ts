import { handleIncomingMessage } from "../../protocol/index.js";
import type { ClientMessage, ServerMessage } from "../../protocol/index.js";

export type SendMessage = (msg: ServerMessage) => void;
export type RouteClientMessage = (msg: ClientMessage) => void;

export function onWebSocketMessage(
  raw: string,
  send: SendMessage,
  route: RouteClientMessage
): void {
  const msg = handleIncomingMessage(raw, send);
  if (msg !== null) route(msg);
}
