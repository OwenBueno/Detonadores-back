import type { MatchSnapshot } from "../domain/types.js";

export type ClientMessageType =
  | "room:create"
  | "room:join"
  | "room:ready"
  | "room:select_character"
  | "room:start_match"
  | "match:input"
  | "match:place_bomb"
  | "match:reconnect"
  | "matchmaking:join"
  | "matchmaking:leave";

export interface RoomCreatePayload {
  roomName?: string;
  maxPlayers?: number;
}

export interface RoomJoinPayload {
  roomId: string;
}

export interface RoomReadyPayload {
  ready?: boolean;
}

export interface RoomSelectCharacterPayload {
  characterId: string;
}

export interface RoomStartMatchPayload {
  // empty for now; server infers room from connection
}

export type MatchInputPayload = { input: "up" | "down" | "left" | "right" };

export interface MatchPlaceBombPayload {
  // empty
}

export interface MatchReconnectPayload {
  roomId: string;
  /** Same as `RoomPlayer.id` / server connection id for this seat. */
  seatConnectionId: string;
}

export interface MatchmakingJoinPayload {
  preferredRole?: string;
}

export type MatchmakingLeavePayload = Record<string, never>;

export type ClientMessage =
  | { type: "room:create"; payload: RoomCreatePayload }
  | { type: "room:join"; payload: RoomJoinPayload }
  | { type: "room:ready"; payload: RoomReadyPayload }
  | { type: "room:select_character"; payload: RoomSelectCharacterPayload }
  | { type: "room:start_match"; payload: RoomStartMatchPayload }
  | { type: "match:input"; payload: MatchInputPayload }
  | { type: "match:place_bomb"; payload: MatchPlaceBombPayload }
  | { type: "match:reconnect"; payload: MatchReconnectPayload }
  | { type: "matchmaking:join"; payload: MatchmakingJoinPayload }
  | { type: "matchmaking:leave"; payload: MatchmakingLeavePayload };

export interface MatchmakingStatusPayload {
  status: "idle" | "queued";
}

export type ServerMessageType =
  | "room:state"
  | "room:identity"
  | "room:closed"
  | "match:snapshot"
  | "match:event"
  | "match:ended"
  | "matchmaking:status"
  | "error";

export interface RoomPlayer {
  id: string;
  ready?: boolean;
  role?: "host" | "member";
  characterId?: string;
}

export type RoomStatus = "waiting" | "starting" | "in_game";

export interface RoomStatePayload {
  roomId: string;
  players: RoomPlayer[];
  status: RoomStatus;
}

/** Unicast: this connection's stable id for room roster / match:reconnect (US-026). */
export interface RoomIdentityPayload {
  connectionId: string;
}

export interface MatchEventPayload {
  kind: string;
  data?: unknown;
}

export interface MatchEndedPayload {
  winnerId?: string;
}

export interface RoomClosedPayload {
  roomId: string;
}

export const ERROR_CODES = {
  INVALID_ROOM_JOIN: "INVALID_ROOM_JOIN",
  ROOM_FULL: "ROOM_FULL",
  DUPLICATE_READY: "DUPLICATE_READY",
  CHARACTER_TAKEN: "CHARACTER_TAKEN",
  INVALID_MATCH_INPUT: "INVALID_MATCH_INPUT",
  INVALID_MESSAGE: "INVALID_MESSAGE",
  MIN_PLAYERS_NOT_MET: "MIN_PLAYERS_NOT_MET",
  NOT_ALL_READY: "NOT_ALL_READY",
  ROOM_NOT_WAITING: "ROOM_NOT_WAITING",
  RECONNECT_FAILED: "RECONNECT_FAILED",
  RECONNECT_SEAT_TAKEN: "RECONNECT_SEAT_TAKEN",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorPayload {
  code: ErrorCode;
  message?: string;
}

export type ServerMessage =
  | { type: "room:state"; payload: RoomStatePayload }
  | { type: "room:identity"; payload: RoomIdentityPayload }
  | { type: "room:closed"; payload: RoomClosedPayload }
  | { type: "match:snapshot"; payload: MatchSnapshot }
  | { type: "match:event"; payload: MatchEventPayload }
  | { type: "match:ended"; payload: MatchEndedPayload }
  | { type: "matchmaking:status"; payload: MatchmakingStatusPayload }
  | { type: "error"; payload: ErrorPayload };

export function createErrorPayload(code: ErrorCode, message?: string): ErrorPayload {
  return { code, message };
}
