import type { ClientMessage } from "./types.js";

const CLIENT_MESSAGE_TYPES = [
  "room:create",
  "room:join",
  "room:ready",
  "room:select_character",
  "room:start_match",
  "match:input",
  "match:place_bomb",
  "match:reconnect",
  "matchmaking:join",
  "matchmaking:leave",
] as const;

const MOVEMENT_INPUTS = ["up", "down", "left", "right"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRoomCreate(payload: unknown): ClientMessage | null {
  if (!isObject(payload)) return null;
  return {
    type: "room:create",
    payload: {
      roomName: typeof payload.roomName === "string" ? payload.roomName : undefined,
      maxPlayers: typeof payload.maxPlayers === "number" ? payload.maxPlayers : undefined,
    },
  };
}

function parseRoomJoin(payload: unknown): ClientMessage | null {
  if (!isObject(payload) || typeof payload.roomId !== "string") return null;
  return { type: "room:join", payload: { roomId: payload.roomId } };
}

function parseRoomReady(payload: unknown): ClientMessage | null {
  if (!isObject(payload)) return null;
  return {
    type: "room:ready",
    payload: { ready: typeof payload.ready === "boolean" ? payload.ready : undefined },
  };
}

function parseRoomSelectCharacter(payload: unknown): ClientMessage | null {
  if (!isObject(payload) || typeof payload.characterId !== "string") return null;
  return { type: "room:select_character", payload: { characterId: payload.characterId } };
}

function parseRoomStartMatch(payload: unknown): ClientMessage | null {
  if (!isObject(payload)) return null;
  return { type: "room:start_match", payload: {} };
}

function parseMatchInput(payload: unknown): ClientMessage | null {
  if (!isObject(payload) || typeof payload.input !== "string") return null;
  if (!MOVEMENT_INPUTS.includes(payload.input as (typeof MOVEMENT_INPUTS)[number])) return null;
  return { type: "match:input", payload: { input: payload.input as "up" | "down" | "left" | "right" } };
}

function parseMatchPlaceBomb(payload: unknown): ClientMessage | null {
  if (!isObject(payload)) return null;
  return { type: "match:place_bomb", payload: {} };
}

function parseMatchReconnect(payload: unknown): ClientMessage | null {
  if (!isObject(payload)) return null;
  if (typeof payload.roomId !== "string" || typeof payload.seatConnectionId !== "string") return null;
  return {
    type: "match:reconnect",
    payload: { roomId: payload.roomId, seatConnectionId: payload.seatConnectionId },
  };
}

function parseMatchmakingJoin(payload: unknown): ClientMessage | null {
  if (!isObject(payload)) return null;
  return {
    type: "matchmaking:join",
    payload: {
      preferredRole: typeof payload.preferredRole === "string" ? payload.preferredRole : undefined,
    },
  };
}

function parseMatchmakingLeave(payload: unknown): ClientMessage | null {
  if (!isObject(payload)) return null;
  return { type: "matchmaking:leave", payload: {} };
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data) || typeof data.type !== "string") return null;
  if (!CLIENT_MESSAGE_TYPES.includes(data.type as (typeof CLIENT_MESSAGE_TYPES)[number])) return null;

  switch (data.type) {
    case "room:create":
      return parseRoomCreate(data.payload);
    case "room:join":
      return parseRoomJoin(data.payload);
    case "room:ready":
      return parseRoomReady(data.payload);
    case "room:select_character":
      return parseRoomSelectCharacter(data.payload);
    case "room:start_match":
      return parseRoomStartMatch(data.payload);
    case "match:input":
      return parseMatchInput(data.payload);
    case "match:place_bomb":
      return parseMatchPlaceBomb(data.payload);
    case "match:reconnect":
      return parseMatchReconnect(data.payload);
    case "matchmaking:join":
      return parseMatchmakingJoin(data.payload);
    case "matchmaking:leave":
      return parseMatchmakingLeave(data.payload);
    default:
      return null;
  }
}

