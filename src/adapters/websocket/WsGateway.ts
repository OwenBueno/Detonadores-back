import type { IncomingMessage } from "node:http";
import type WebSocket from "ws";
import type { WebSocketServer } from "ws";
import type { GuestSessionService } from "../../application/GuestSessionService.js";
import type { MatchService } from "../../application/MatchService.js";
import type { MatchmakingQueue } from "../../application/MatchmakingQueue.js";
import { onWebSocketMessage } from "./index.js";
import type { ClientMessage, ServerMessage } from "../../protocol/index.js";
import { ERROR_CODES, createErrorPayload, isCharacterId } from "../../protocol/index.js";
import type { WsEventBroadcaster } from "../broadcast/WsEventBroadcaster.js";
import type { RoomStore } from "../../ports/index.js";
import type { CreateArenaResult, PlayerCount } from "../../domain/arena/index.js";

type ConnInfo = {
  connectionId: string;
  playerId: string;
  guestId: string;
  roomId?: string;
  role?: "host" | "member";
};

export interface WsGatewayDeps {
  wss: WebSocketServer;
  matchService: MatchService;
  broadcaster: WsEventBroadcaster;
  roomStore: RoomStore;
  guestSessionService: GuestSessionService;
  roomId: string;
  maxPlayers: number;
  minPlayersToStart: number;
  startMatchIfNeeded: () => void;
  getMatchService: (roomId: string) => MatchService | null;
  isMatchActiveForRoom: (roomId: string) => boolean;
  getOrCreateMatchService: (roomId: string) => MatchService;
  createArena: (playerCount: PlayerCount) => CreateArenaResult;
  onConnectionCountChanged?: (count: number) => void;
  matchmakingQueue: MatchmakingQueue;
  onMatchPlayerDisconnected?: (roomId: string, playerId: string) => void;
}

export class WsGateway {
  private deps: WsGatewayDeps;
  private connSeq = 0;
  private connections = new Map<WebSocket, ConnInfo>();
  private connectionIdToWs = new Map<string, WebSocket>();

  constructor(deps: WsGatewayDeps) {
    this.deps = deps;
    this.deps.wss.on("connection", (ws, req) => this.onConnection(ws, req));
  }

  clearConnectionsForRoom(roomId: string): void {
    for (const [, info] of this.connections) {
      if (info.roomId === roomId) {
        info.roomId = undefined;
        delete info.role;
      }
    }
  }

  private onConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const session = this.deps.guestSessionService.validateToken(token);
    if (!session) {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.UNAUTHORIZED, "Missing or invalid session token"),
        } satisfies ServerMessage)
      );
      ws.close();
      return;
    }

    const playerIndex = this.connections.size;
    if (playerIndex >= this.deps.maxPlayers) {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.ROOM_FULL, "Match is full"),
        } satisfies ServerMessage)
      );
      ws.close();
      return;
    }

    const connectionId = `c-${this.connSeq++}`;
    const playerId = `player-${playerIndex}`;
    this.connections.set(ws, {
      connectionId,
      playerId,
      guestId: session.guestId,
      roomId: this.deps.roomId,
    });
    this.connectionIdToWs.set(connectionId, ws);
    this.deps.broadcaster.addClient(this.deps.roomId, ws);

    this.deps.startMatchIfNeeded();
    this.deps.onConnectionCountChanged?.(this.connections.size);

    ws.on("message", (buf) => {
      const raw = typeof buf === "string" ? buf : buf.toString("utf8");
      const send = (msg: ServerMessage) => ws.send(JSON.stringify(msg));
      const route = (msg: ClientMessage) => this.routeClientMessage(ws, msg, send);
      onWebSocketMessage(raw, send, route);
    });

    ws.on("close", () => {
      const info = this.connections.get(ws);
      if (info) {
        this.connectionIdToWs.delete(info.connectionId);
        this.deps.matchmakingQueue.leave(info.connectionId);
      }
      this.connections.delete(ws);
      this.deps.broadcaster.removeClient(ws);
      const rid = info?.roomId;
      if (rid && this.deps.isMatchActiveForRoom(rid)) {
        this.deps.onMatchPlayerDisconnected?.(rid, info!.playerId);
      } else if (rid && rid !== this.deps.roomId) {
        void (async () => {
          await this.deps.roomStore.removePlayer(rid, info!.connectionId);
          const room = await this.deps.roomStore.get(rid);
          if (room) {
            this.deps.broadcaster.sendToRoom(rid, {
              type: "room:state",
              payload: { roomId: room.id, players: room.players, status: room.status },
            });
          }
        })();
      }
    });
  }

  private routeClientMessage(
    ws: WebSocket,
    msg: ClientMessage,
    send: (msg: ServerMessage) => void
  ): void {
    const conn = this.connections.get(ws);
    if (!conn?.guestId) {
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.UNAUTHORIZED) });
      return;
    }
    switch (msg.type) {
      case "room:create":
        this.handleRoomCreate(ws, msg, send);
        return;
      case "room:join":
        this.handleRoomJoin(ws, msg, send);
        return;
      case "room:select_character":
        this.handleRoomSelectCharacter(ws, msg, send);
        return;
      case "room:ready":
        this.handleRoomReady(ws, msg, send);
        return;
      case "room:start_match":
        this.handleRoomStartMatch(ws, send);
        return;
      case "match:input":
        this.routeMatchInput(ws, msg, send);
        return;
      case "match:place_bomb":
        this.routePlaceBomb(ws, msg, send);
        return;
      case "match:reconnect":
        this.handleMatchReconnect(ws, msg, send);
        return;
      case "matchmaking:join":
        this.handleMatchmakingJoin(ws, send);
        return;
      case "matchmaking:leave":
        this.handleMatchmakingLeave(ws, send);
        return;
      default:
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_MESSAGE) });
    }
  }

  private handleRoomCreate(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "room:create" }>,
    send: (msg: ServerMessage) => void
  ): void {
    const info = this.connections.get(ws);
    if (!info) return;
    if (info.roomId && info.roomId !== this.deps.roomId) {
      // Already in a non-default room; disallow creating another.
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN) });
      return;
    }
    void (async () => {
      this.deps.matchmakingQueue.leave(info.connectionId);
      const room = await this.deps.roomStore.create({
        roomName: msg.payload.roomName,
        maxPlayers: msg.payload.maxPlayers,
        creatorId: info.connectionId,
      });
      // Move socket to the new room in broadcaster
      this.deps.broadcaster.removeClient(ws);
      this.deps.broadcaster.addClient(room.id, ws);
      info.roomId = room.id;
      info.role = "host";
      const payload = {
        roomId: room.id,
        players: room.players,
        status: room.status,
      };
      this.deps.broadcaster.sendToRoom(room.id, {
        type: "room:state",
        payload,
      });
      this.sendRoomIdentity(ws, info.connectionId);
    })();
  }

  private handleRoomJoin(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "room:join" }>,
    send: (msg: ServerMessage) => void
  ): void {
    const info = this.connections.get(ws);
    if (!info) return;
    const roomId = msg.payload.roomId;
    void (async () => {
      const room = await this.deps.roomStore.get(roomId);
      if (!room) {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN, "Room not found"),
        });
        return;
      }
      if (room.status !== "waiting") {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN, "Room already started"),
        });
        return;
      }
      if (room.players.length >= room.maxPlayers) {
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.ROOM_FULL) });
        return;
      }
      const added = await this.deps.roomStore.addPlayer(roomId, {
        id: info.connectionId,
        role: "member",
        ready: false,
      });
      if (!added) {
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.ROOM_FULL) });
        return;
      }
      this.deps.matchmakingQueue.leave(info.connectionId);
      this.deps.broadcaster.removeClient(ws);
      this.deps.broadcaster.addClient(roomId, ws);
      info.roomId = roomId;
      info.role = "member";
      const updated = await this.deps.roomStore.get(roomId);
      if (updated) {
        this.deps.broadcaster.sendToRoom(roomId, {
          type: "room:state",
          payload: {
            roomId: updated.id,
            players: updated.players,
            status: updated.status,
          },
        });
        this.sendRoomIdentity(ws, info.connectionId);
      }
    })();
  }

  private handleRoomReady(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "room:ready" }>,
    send: (msg: ServerMessage) => void
  ): void {
    const info = this.connections.get(ws);
    if (!info?.roomId || info.roomId === this.deps.roomId) return;
    const ready = msg.payload.ready ?? true;
    void (async () => {
      const ok = await this.deps.roomStore.setPlayerReady(
        info.roomId!,
        info.connectionId,
        ready
      );
      if (!ok) {
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN) });
        return;
      }
      const room = await this.deps.roomStore.get(info.roomId!);
      if (room) {
        this.deps.broadcaster.sendToRoom(info.roomId!, {
          type: "room:state",
          payload: { roomId: room.id, players: room.players, status: room.status },
        });
      }
    })();
  }

  private handleRoomSelectCharacter(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "room:select_character" }>,
    send: (msg: ServerMessage) => void
  ): void {
    const info = this.connections.get(ws);
    if (!info?.roomId || info.roomId === this.deps.roomId) return;
    if (!isCharacterId(msg.payload.characterId)) {
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_MESSAGE) });
      return;
    }
    void (async () => {
      const roomId = info.roomId!;
      const room = await this.deps.roomStore.get(roomId);
      if (!room || room.status !== "waiting") {
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN) });
        return;
      }
      const ok = await this.deps.roomStore.setPlayerCharacter(
        roomId,
        info.connectionId,
        msg.payload.characterId
      );
      if (!ok) {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.CHARACTER_TAKEN, "Character already taken"),
        });
        return;
      }
      const updated = await this.deps.roomStore.get(roomId);
      if (updated) {
        this.deps.broadcaster.sendToRoom(roomId, {
          type: "room:state",
          payload: {
            roomId: updated.id,
            players: updated.players,
            status: updated.status,
          },
        });
      }
    })();
  }

  private handleRoomStartMatch(ws: WebSocket, send: (msg: ServerMessage) => void): void {
    const info = this.connections.get(ws);
    if (!info?.roomId || info.roomId === this.deps.roomId) {
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.ROOM_NOT_WAITING) });
      return;
    }
    const roomId = info.roomId;
    void (async () => {
      const room = await this.deps.roomStore.get(roomId);
      if (!room) {
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN) });
        return;
      }
      if (room.status !== "waiting") {
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.ROOM_NOT_WAITING) });
        return;
      }
      if (room.players.length < this.deps.minPlayersToStart) {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.MIN_PLAYERS_NOT_MET),
        });
        return;
      }
      if (!room.players.every((p) => p.ready)) {
        send({ type: "error", payload: createErrorPayload(ERROR_CODES.NOT_ALL_READY) });
        return;
      }
      await this.deps.roomStore.setRoomStatus(roomId, "in_game");
      const matchService = this.deps.getOrCreateMatchService(roomId);
      for (let i = 0; i < room.players.length; i++) {
        const connectionId = room.players[i]!.id;
        for (const [sock, conn] of this.connections) {
          if (conn.roomId === roomId && conn.connectionId === connectionId) {
            conn.playerId = `player-${i}`;
            break;
          }
        }
      }
      const playerCount = Math.max(
        this.deps.minPlayersToStart,
        Math.min(4, room.players.length)
      ) as PlayerCount;
      const { grid, initialPlayers } = this.deps.createArena(playerCount);
      matchService.startMatch(grid, initialPlayers);
      const updated = await this.deps.roomStore.get(roomId);
      if (updated) {
        this.deps.broadcaster.sendToRoom(roomId, {
          type: "room:state",
          payload: { roomId: updated.id, players: updated.players, status: updated.status },
        });
      }
    })();
  }

  private routeMatchInput(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "match:input" }>,
    send: (msg: ServerMessage) => void
  ): void {
    const info = this.connections.get(ws);
    if (!info) return;
    const roomId = info.roomId ?? this.deps.roomId;
    const service = this.deps.getMatchService(roomId);
    if (!service || !this.deps.isMatchActiveForRoom(roomId)) {
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_MATCH_INPUT) });
      return;
    }
    service.applyInput(info.playerId, msg.payload.input);
  }

  private routePlaceBomb(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "match:place_bomb" }>,
    send: (msg: ServerMessage) => void
  ): void {
    const info = this.connections.get(ws);
    if (!info) return;
    const roomId = info.roomId ?? this.deps.roomId;
    const service = this.deps.getMatchService(roomId);
    if (!service || !this.deps.isMatchActiveForRoom(roomId)) {
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_MATCH_INPUT) });
      return;
    }
    service.applyInput(info.playerId, "place_bomb");
  }

  private handleMatchmakingJoin(ws: WebSocket, send: (msg: ServerMessage) => void): void {
    const info = this.connections.get(ws);
    if (!info) return;
    if (info.roomId && info.roomId !== this.deps.roomId) {
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN) });
      return;
    }
    this.deps.matchmakingQueue.enqueue(info.connectionId);
    send({ type: "matchmaking:status", payload: { status: "queued" } });
    const batch = this.deps.matchmakingQueue.tryPopBatch();
    if (batch) this.placeBatchInNewRoom(batch);
  }

  private handleMatchmakingLeave(ws: WebSocket, send: (msg: ServerMessage) => void): void {
    const info = this.connections.get(ws);
    if (!info) return;
    this.deps.matchmakingQueue.leave(info.connectionId);
    send({ type: "matchmaking:status", payload: { status: "idle" } });
  }

  private placeBatchInNewRoom(batch: string[]): void {
    void (async () => {
      const ordered: { ws: WebSocket; connectionId: string }[] = [];
      for (const connectionId of batch) {
        const sock = this.connectionIdToWs.get(connectionId);
        if (sock) ordered.push({ ws: sock, connectionId });
      }
      if (ordered.length < 2) {
        for (const o of ordered) this.deps.matchmakingQueue.enqueue(o.connectionId);
        return;
      }
      const first = ordered[0]!;
      const room = await this.deps.roomStore.create({
        creatorId: first.connectionId,
        maxPlayers: 4,
      });
      for (let i = 1; i < ordered.length; i++) {
        await this.deps.roomStore.addPlayer(room.id, {
          id: ordered[i]!.connectionId,
          role: "member",
          ready: false,
        });
      }
      for (const o of ordered) {
        const conn = this.connections.get(o.ws);
        if (!conn) continue;
        this.deps.broadcaster.removeClient(o.ws);
        this.deps.broadcaster.addClient(room.id, o.ws);
        conn.roomId = room.id;
        conn.role = o.connectionId === first.connectionId ? "host" : "member";
      }
      const updated = await this.deps.roomStore.get(room.id);
      if (updated) {
        this.deps.broadcaster.sendToRoom(room.id, {
          type: "room:state",
          payload: {
            roomId: updated.id,
            players: updated.players,
            status: updated.status,
          },
        });
        for (const o of ordered) {
          this.sendRoomIdentity(o.ws, o.connectionId);
        }
      }
    })();
  }

  private sendRoomIdentity(ws: WebSocket, connectionId: string): void {
    const msg: ServerMessage = {
      type: "room:identity",
      payload: { connectionId },
    };
    ws.send(JSON.stringify(msg));
  }

  private handleMatchReconnect(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "match:reconnect" }>,
    send: (msg: ServerMessage) => void
  ): void {
    const info = this.connections.get(ws);
    if (!info) return;
    if (info.roomId && info.roomId !== this.deps.roomId) {
      send({ type: "error", payload: createErrorPayload(ERROR_CODES.INVALID_ROOM_JOIN) });
      return;
    }
    const { roomId, seatConnectionId } = msg.payload;
    void (async () => {
      const room = await this.deps.roomStore.get(roomId);
      if (!room || room.status !== "in_game") {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.RECONNECT_FAILED, "Room not in match"),
        });
        return;
      }
      const seatIndex = room.players.findIndex((p) => p.id === seatConnectionId);
      if (seatIndex === -1) {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.RECONNECT_FAILED, "Seat not in roster"),
        });
        return;
      }
      const playerId = `player-${seatIndex}`;
      const matchService = this.deps.getMatchService(roomId);
      if (!matchService || !this.deps.isMatchActiveForRoom(roomId)) {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.RECONNECT_FAILED, "Match not active"),
        });
        return;
      }
      for (const [sock, conn] of this.connections) {
        if (sock !== ws && conn.roomId === roomId && conn.playerId === playerId) {
          send({ type: "error", payload: createErrorPayload(ERROR_CODES.RECONNECT_SEAT_TAKEN) });
          return;
        }
      }
      if (!matchService.onPlayerReconnected(playerId)) {
        send({
          type: "error",
          payload: createErrorPayload(ERROR_CODES.RECONNECT_FAILED, "Reconnect not allowed"),
        });
        return;
      }
      this.deps.broadcaster.removeClient(ws);
      this.deps.broadcaster.addClient(roomId, ws);
      info.roomId = roomId;
      info.playerId = playerId;
      info.role = room.players[seatIndex]!.role ?? "member";
      const snapMsg: ServerMessage = {
        type: "match:snapshot",
        payload: matchService.getSnapshot(),
      };
      ws.send(JSON.stringify(snapMsg));
    })();
  }
}

