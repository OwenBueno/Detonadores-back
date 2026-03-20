import type { RoomPlayer, RoomStatus } from "../protocol/index.js";

export interface Room {
  id: string;
  name?: string;
  maxPlayers: number;
  players: RoomPlayer[];
  status: RoomStatus;
}

export interface RoomCreateOptions {
  roomName?: string;
  maxPlayers?: number;
  creatorId: string;
}

export interface RoomStore {
  create(options: RoomCreateOptions): Promise<Room>;
  get(roomId: string): Promise<Room | null>;
  list(): Promise<Room[]>;
  setRoomStatus(roomId: string, status: RoomStatus): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  addPlayer(
    roomId: string,
    player: { id: string; role?: "host" | "member"; ready?: boolean }
  ): Promise<boolean>;
  removePlayer(roomId: string, playerId: string): Promise<void>;
  setPlayerCharacter(
    roomId: string,
    playerId: string,
    characterId: string | null
  ): Promise<boolean>;
  setPlayerReady(roomId: string, playerId: string, ready: boolean): Promise<boolean>;
}

