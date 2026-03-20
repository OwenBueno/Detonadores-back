export type TileType = "floor" | "hard_block" | "soft_block" | "bomb" | "explosion" | "powerup" | "collapsed";

export type MatchStatus = "waiting" | "starting" | "active" | "ended";

export interface GridCell {
  type: TileType;
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  alive: boolean;
  bombs: number;
  range: number;
  speed?: number;
  shieldActive?: boolean;
  /** True while WebSocket is gone and grace window has not expired (US-025). */
  reconnectPending?: boolean;
}

export interface BombState {
  id: string;
  x: number;
  y: number;
  ownerId: string;
  range: number;
  ticksRemaining: number;
}

export interface ExplosionState {
  x: number;
  y: number;
  ticksRemaining: number;
  sourceBombId?: string;
}

export type PowerupType =
  | "bomb_capacity"
  | "flame_range"
  | "speed"
  | "shield"
  | "special";

export interface PowerupState {
  x: number;
  y: number;
  type: PowerupType;
}

export interface MatchSnapshot {
  status: MatchStatus;
  tick: number;
  grid: GridCell[][];
  players: PlayerState[];
  bombs: BombState[];
  explosions: ExplosionState[];
  powerups: PowerupState[];
  winnerId?: string;
}

export type PlayerInput = "up" | "down" | "left" | "right" | "place_bomb";
