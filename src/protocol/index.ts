export type {
  ClientMessage,
  ClientMessageType,
  ServerMessage,
  ServerMessageType,
  RoomCreatePayload,
  RoomJoinPayload,
  RoomReadyPayload,
  MatchInputPayload,
  MatchPlaceBombPayload,
  MatchmakingJoinPayload,
  RoomStatePayload,
  RoomPlayer,
  RoomStatus,
  MatchEventPayload,
  MatchEndedPayload,
  ErrorPayload,
  ErrorCode,
} from "./types.js";
export { ERROR_CODES, createErrorPayload } from "./types.js";
export { parseClientMessage } from "./parse.js";

import type { ClientMessage, ServerMessage } from "./types.js";
import { createErrorPayload, ERROR_CODES } from "./types.js";
import { parseClientMessage } from "./parse.js";

export function handleIncomingMessage(
  raw: string,
  send: (msg: ServerMessage) => void
): ClientMessage | null {
  const msg = parseClientMessage(raw);
  if (msg === null) {
    send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_MESSAGE) });
    return null;
  }
  return msg;
}
