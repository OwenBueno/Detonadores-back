export { MatchEngine } from "./MatchEngine.js";
export { TICK_INTERVAL_MS, TICKS_PER_SECOND } from "./constants.js";
export {
  createArena,
  createArenaGrid,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  SPAWN_POSITIONS,
  isSpawnZone,
  isBorder,
} from "./arena/index.js";
export type { CreateArenaResult, PlayerCount } from "./arena/index.js";
export { POWERUP_SPAWN_CHANCE, POWERUP_TYPES } from "./powerupConstants.js";
export type {
  TileType,
  MatchStatus,
  GridCell,
  PlayerState,
  BombState,
  ExplosionState,
  PowerupType,
  PowerupState,
  MatchSnapshot,
  PlayerInput,
} from "./types.js";
