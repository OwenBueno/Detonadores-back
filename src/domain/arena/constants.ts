/** Classic 13×11 arena with 1-tile border and corner spawns. */
export const ARENA_WIDTH = 13;
export const ARENA_HEIGHT = 11;

export const SPAWN_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 1, y: 1 },
  { x: 11, y: 1 },
  { x: 1, y: 9 },
  { x: 11, y: 9 },
];

function isInSpawnZone(x: number, y: number): boolean {
  for (const s of SPAWN_POSITIONS) {
    const dx = Math.abs(x - s.x);
    const dy = Math.abs(y - s.y);
    if (dx <= 1 && dy <= 1) return true;
  }
  return false;
}

export function isSpawnZone(x: number, y: number): boolean {
  return isInSpawnZone(x, y);
}

export function isBorder(x: number, y: number): boolean {
  if (x === 0 || x === ARENA_WIDTH - 1) return !isInSpawnZone(x, y);
  if (y === 0 || y === ARENA_HEIGHT - 1) return !isInSpawnZone(x, y);
  return false;
}
