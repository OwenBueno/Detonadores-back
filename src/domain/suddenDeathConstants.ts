/** ~3 min at 20 Hz. Sudden death starts when tickCount >= this. */
export const SUDDEN_DEATH_START_TICK = 3600;

export function getCollapseOrder(width: number, height: number): { x: number; y: number }[] {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const tiles: { x: number; y: number; ring: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ring = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      tiles.push({ x, y, ring });
    }
  }
  tiles.sort((a, b) => {
    if (b.ring !== a.ring) return b.ring - a.ring;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
  return tiles.map(({ x, y }) => ({ x, y }));
}
