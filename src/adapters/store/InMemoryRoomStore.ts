import { randomUUID } from "node:crypto";
import type { RoomStore, Room, RoomCreateOptions } from "../../ports/index.js";

const DEFAULT_MAX_PLAYERS = 4;
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 4;

function clampMaxPlayers(value: number | undefined): number {
  const n = value ?? DEFAULT_MAX_PLAYERS;
  return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
}

export class InMemoryRoomStore implements RoomStore {
  private rooms = new Map<string, Room>();

  async create(options: RoomCreateOptions): Promise<Room> {
    const id = randomUUID();
    const maxPlayers = clampMaxPlayers(options.maxPlayers);
    const room: Room = {
      id,
      name: options.roomName,
      maxPlayers,
      players: [
        {
          id: options.creatorId,
          ready: false,
          role: "host",
        },
      ],
      status: "waiting",
    };
    this.rooms.set(id, room);
    return room;
  }

  async get(roomId: string): Promise<Room | null> {
    return this.rooms.get(roomId) ?? null;
  }

  async list(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async setRoomStatus(roomId: string, status: Room["status"]): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.status = status;
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
  }

  async addPlayer(
    roomId: string,
    player: { id: string; role?: "host" | "member"; ready?: boolean }
  ): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.status !== "waiting") return false;
    if (room.players.length >= room.maxPlayers) return false;
    room.players.push({
      id: player.id,
      ready: player.ready ?? false,
      role: player.role ?? "member",
    });
    return true;
  }

  async removePlayer(roomId: string, playerId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx !== -1) room.players.splice(idx, 1);
    if (room.players.length === 0) this.rooms.delete(roomId);
  }

  async setPlayerCharacter(
    roomId: string,
    playerId: string,
    characterId: string | null
  ): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.status !== "waiting") return false;
    if (
      characterId !== null &&
      room.players.some((p) => p.id !== playerId && p.characterId === characterId)
    )
      return false;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;
    if (characterId === null) {
      delete player.characterId;
    } else {
      player.characterId = characterId;
    }
    return true;
  }

  async setPlayerReady(roomId: string, playerId: string, ready: boolean): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.status !== "waiting") return false;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;
    player.ready = ready;
    return true;
  }
}

