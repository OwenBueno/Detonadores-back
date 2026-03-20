import express from "express";
import cors from "cors";
import http from "node:http";
import { WebSocketServer } from "ws";
import { MatchService } from "../../application/MatchService.js";
import { MatchmakingQueue } from "../../application/MatchmakingQueue.js";
import { createArena, type PlayerCount } from "../../domain/arena/index.js";
import { InMemoryMatchStore, InMemoryRoomStore } from "../store/index.js";
import { PostgresMatchRepository } from "../persistence/index.js";
import { WsEventBroadcaster } from "../broadcast/WsEventBroadcaster.js";
import { WsGateway } from "../websocket/WsGateway.js";
import { GuestSessionService } from "../../application/GuestSessionService.js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/rooms", async (_req, res) => {
  const all = await roomStore.list();
  const joinable = all.filter(
    (r) => r.status === "waiting" && r.players.length < r.maxPlayers
  );
  const rooms = joinable.map((r) => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.length,
    maxPlayers: r.maxPlayers,
    status: r.status,
  }));
  res.status(200).json({ rooms });
});

app.post("/session/guest", (_req, res) => {
  const { token, guestId } = guestSessionService.createGuestSession();
  res.status(201).json({ token, guestId });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const broadcaster = new WsEventBroadcaster();
const matchStore = new InMemoryMatchStore();
const roomStore = new InMemoryRoomStore();
const matchmakingQueue = new MatchmakingQueue();
const matchRepository = new PostgresMatchRepository();
const guestSessionService = new GuestSessionService();

const matchService = new MatchService("room-0", "match-0", {
  eventBroadcaster: broadcaster,
  matchRepository,
  matchStore,
});

const matchRegistry = new Map<string, InstanceType<typeof MatchService>>();

const gatewayRef: { current: InstanceType<typeof WsGateway> | null } = { current: null };

function getOrCreateMatchService(roomId: string): InstanceType<typeof MatchService> {
  if (roomId === "room-0") return matchService;
  let svc = matchRegistry.get(roomId);
  if (!svc) {
    const matchId = `match-${roomId}-${Date.now()}`;
    svc = new MatchService(roomId, matchId, {
      eventBroadcaster: broadcaster,
      matchRepository,
      matchStore,
      onMatchEnded(rid) {
        matchRegistry.delete(rid);
        roomStore.deleteRoom(rid).catch(() => {});
        broadcaster.sendToRoom(rid, { type: "room:closed", payload: { roomId: rid } });
        gatewayRef.current?.clearConnectionsForRoom(rid);
      },
    });
    matchRegistry.set(roomId, svc);
  }
  return svc;
}

function getMatchService(roomId: string): InstanceType<typeof MatchService> | null {
  if (roomId === "room-0") return matchService;
  return matchRegistry.get(roomId) ?? null;
}

function isMatchActiveForRoom(roomId: string): boolean {
  const svc = getMatchService(roomId);
  if (!svc) return false;
  const status = svc.getSnapshot().status;
  return status === "starting" || status === "active";
}

let started = false;
function startMatchIfNeeded() {
  if (started) return;
  if (wss.clients.size < 1) return;
  const playerCount = Math.min(wss.clients.size, 2) as PlayerCount;
  const { grid, initialPlayers } = createArena(playerCount);
  matchService.startMatch(grid, initialPlayers);
  started = true;
}

function onConnectionCountChanged(count: number) {
  const snap = matchService.getSnapshot();
  if (count === 2 && snap.players.length === 1) {
    const { initialPlayers } = createArena(2);
    matchService.addPlayer(initialPlayers[1]!);
  }
}

const MIN_PLAYERS_TO_START = 2;

/** Max simultaneous WebSocket connections (default lobby + matchmaking needs >2). */
const WS_MAX_CONNECTIONS = 32;

const gateway = new WsGateway({
  wss,
  matchService,
  broadcaster,
  roomStore,
  guestSessionService,
  roomId: "room-0",
  maxPlayers: WS_MAX_CONNECTIONS,
  minPlayersToStart: MIN_PLAYERS_TO_START,
  startMatchIfNeeded,
  getMatchService,
  isMatchActiveForRoom,
  getOrCreateMatchService,
  createArena,
  onConnectionCountChanged,
  matchmakingQueue,
  onMatchPlayerDisconnected(roomId, playerId) {
    getMatchService(roomId)?.onPlayerDisconnected(playerId);
  },
});
gatewayRef.current = gateway;

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default app;
