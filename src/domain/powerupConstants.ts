import type { PowerupType } from "./types.js";

export const POWERUP_SPAWN_CHANCE = 0.5;
export const DEFAULT_SPEED = 1;
export const MAX_SPEED = 4;

export const POWERUP_TYPES: PowerupType[] = [
  "bomb_capacity",
  "flame_range",
  "speed",
  "shield",
  "special",
];
