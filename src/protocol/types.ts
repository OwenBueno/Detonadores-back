import type { MatchSnapshot } from "../domain/types.js";

export type ClientMessageType =
  | "room:create"
  | "room:join"
  | "room:ready"
  | "match:input"
  | "match:place_bomb"
  | "matchmaking:join";

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

export type MatchInputPayload = { input: "up" | "down" | "left" | "right" };

export interface MatchPlaceBombPayload {
  // empty
}

export interface MatchmakingJoinPayload {
  preferredRole?: string;
}

export type ClientMessage =
  | { type: "room:create"; payload: RoomCreatePayload }
  | { type: "room:join"; payload: RoomJoinPayload }
  | { type: "room:ready"; payload: RoomReadyPayload }
  | { type: "match:input"; payload: MatchInputPayload }
  | { type: "match:place_bomb"; payload: MatchPlaceBombPayload }
  | { type: "matchmaking:join"; payload: MatchmakingJoinPayload };

export type ServerMessageType =
  | "room:state"
  | "match:snapshot"
  | "match:event"
  | "match:ended"
  | "error";

export interface RoomPlayer {
  id: string;
  ready?: boolean;
}

export type RoomStatus = "waiting" | "starting" | "in_game";

export interface RoomStatePayload {
  roomId: string;
  players: RoomPlayer[];
  status: RoomStatus;
}

export interface MatchEventPayload {
  kind: string;
  data?: unknown;
}

export interface MatchEndedPayload {
  winnerId?: string;
}

export const ERROR_CODES = {
  INVALID_ROOM_JOIN: "INVALID_ROOM_JOIN",
  ROOM_FULL: "ROOM_FULL",
  DUPLICATE_READY: "DUPLICATE_READY",
  INVALID_MATCH_INPUT: "INVALID_MATCH_INPUT",
  INVALID_MESSAGE: "INVALID_MESSAGE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorPayload {
  code: ErrorCode;
  message?: string;
}

export type ServerMessage =
  | { type: "room:state"; payload: RoomStatePayload }
  | { type: "match:snapshot"; payload: MatchSnapshot }
  | { type: "match:event"; payload: MatchEventPayload }
  | { type: "match:ended"; payload: MatchEndedPayload }
  | { type: "error"; payload: ErrorPayload };

export function createErrorPayload(code: ErrorCode, message?: string): ErrorPayload {
  return { code, message };
}
