import type {
  MatchSnapshot,
  MatchStatus,
  PlayerInput,
  PlayerState,
  BombState,
  ExplosionState,
  GridCell,
  PowerupState,
  PowerupType,
} from "./types.js";
import { POWERUP_SPAWN_CHANCE, POWERUP_TYPES, MAX_SPEED } from "./powerupConstants.js";
import { SUDDEN_DEATH_START_TICK, getCollapseOrder } from "./suddenDeathConstants.js";

const EXPLOSION_DURATION_TICKS = 10;

const MIN_PLAYERS_TO_START = 1;

export class MatchEngine {
  private status: MatchStatus = "waiting";
  private tickCount = 0;
  private grid: GridCell[][] = [];
  private players: Map<string, PlayerState> = new Map();
  private bombs: BombState[] = [];
  private explosions: ExplosionState[] = [];
  private powerups: PowerupState[] = [];
  private inputQueue: Array<{ playerId: string; input: PlayerInput }> = [];
  private winnerId: string | undefined = undefined;
  private playersHitByExplosionThisWave: Set<string> = new Set();
  private explosionWaveClearedThisTick = false;
  private random: () => number;
  private collapseOrder: { x: number; y: number }[] = [];
  private collapseIndex = 0;
  private suddenDeathStartTick: number;

  constructor(random?: () => number, suddenDeathStartTick?: number) {
    this.random = random ?? (() => Math.random());
    this.suddenDeathStartTick = suddenDeathStartTick ?? SUDDEN_DEATH_START_TICK;
  }

  getStatus(): MatchStatus {
    return this.status;
  }

  getSnapshot(): MatchSnapshot {
    return {
      status: this.status,
      tick: this.tickCount,
      grid: this.grid,
      players: Array.from(this.players.values()),
      bombs: [...this.bombs],
      explosions: [...this.explosions],
      powerups: [...this.powerups],
      winnerId: this.winnerId,
    };
  }

  applyInput(playerId: string, input: PlayerInput): void {
    this.inputQueue.push({ playerId, input });
  }

  tick(): void {
    if (this.status === "starting") {
      this.status = "active";
    }
    if (this.status !== "active") return;

    while (this.inputQueue.length > 0) {
      const { playerId, input } = this.inputQueue.shift()!;
      this.resolveInput(playerId, input);
    }

    this.updateBombs();
    this.updateExplosions();
    this.applyExplosionEffects();
    this.applyCollapseStep();
    this.checkWinCondition();
    this.tickCount++;
  }

  startMatch(initialGrid: GridCell[][], initialPlayers: PlayerState[]): void {
    if (initialPlayers.length < MIN_PLAYERS_TO_START) return;
    this.status = "starting";
    this.winnerId = undefined;
    this.tickCount = 0;
    this.grid = initialGrid.map((row) => row.map((cell) => ({ ...cell })));
    this.players = new Map(initialPlayers.map((p) => [p.id, { ...p }]));
    this.bombs = [];
    this.explosions = [];
    this.powerups = [];
    this.inputQueue = [];
    this.playersHitByExplosionThisWave.clear();
    const cols = this.grid[0]?.length ?? 0;
    const rows = this.grid.length;
    this.collapseOrder = getCollapseOrder(cols, rows);
    this.collapseIndex = 0;
  }

  addPlayer(player: PlayerState): void {
    if (this.status !== "starting" && this.status !== "active") return;
    if (this.players.has(player.id)) return;
    this.players.set(player.id, { ...player });
  }

  endMatch(winnerId?: string): void {
    if (this.status === "ended") return;
    this.status = "ended";
    this.winnerId = winnerId;
  }

  private resolveInput(playerId: string, input: PlayerInput): void {
    let player = this.players.get(playerId);
    if (!player || !player.alive) return;

    if (input === "place_bomb") {
      if (player.bombs > 0) {
        this.bombs.push({
          id: `bomb-${this.tickCount}-${playerId}`,
          x: player.x,
          y: player.y,
          ownerId: playerId,
          range: player.range,
          ticksRemaining: 50,
        });
        this.players.set(playerId, { ...player, bombs: player.bombs - 1 });
      }
      return;
    }

    const steps = Math.min(player.speed ?? 1, MAX_SPEED);
    let px = player.x;
    let py = player.y;
    for (let s = 0; s < steps; s++) {
      const next = this.nextPosition(px, py, input);
      if (!this.isWalkable(next.x, next.y)) break;
      px = next.x;
      py = next.y;
      this.players.set(playerId, { ...player, x: px, y: py });
      this.tryPickup(playerId, px, py);
      player = this.players.get(playerId)!;
    }
  }

  private nextPosition(x: number, y: number, input: PlayerInput): { x: number; y: number } {
    switch (input) {
      case "up":
        return { x, y: y - 1 };
      case "down":
        return { x, y: y + 1 };
      case "left":
        return { x: x - 1, y };
      case "right":
        return { x: x + 1, y };
      default:
        return { x, y };
    }
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= (this.grid[0]?.length ?? 0) || y >= this.grid.length) return false;
    const cell = this.grid[y]?.[x];
    if (!cell) return false;
    if (cell.type === "collapsed") return false;
    return cell.type === "floor" || cell.type === "powerup";
  }

  private updateBombs(): void {
    this.explosionWaveClearedThisTick = false;
    const nextBombs: BombState[] = [];
    for (const b of this.bombs) {
      const remaining = b.ticksRemaining - 1;
      if (remaining <= 0) {
        this.spawnExplosions(b);
      } else {
        nextBombs.push({ ...b, ticksRemaining: remaining });
      }
    }
    this.bombs = nextBombs;

    let explosionSet = new Set(this.explosions.map((e) => `${e.x},${e.y}`));
    let bombOnExplosion = this.bombs.find((b) => explosionSet.has(`${b.x},${b.y}`));
    while (bombOnExplosion) {
      this.bombs = this.bombs.filter((b) => b.id !== bombOnExplosion!.id);
      this.spawnExplosions(bombOnExplosion);
      explosionSet = new Set(this.explosions.map((e) => `${e.x},${e.y}`));
      bombOnExplosion = this.bombs.find((b) => explosionSet.has(`${b.x},${b.y}`));
    }
  }

  private spawnExplosions(bomb: BombState): void {
    if (!this.explosionWaveClearedThisTick) {
      this.playersHitByExplosionThisWave.clear();
      this.explosionWaveClearedThisTick = true;
    }
    const owner = this.players.get(bomb.ownerId);
    if (owner) {
      this.players.set(bomb.ownerId, {
        ...owner,
        bombs: owner.bombs + 1,
        shieldActive: owner.shieldActive,
      });
    }
    const { x, y, range, id } = bomb;
    this.explosions.push({
      x,
      y,
      ticksRemaining: EXPLOSION_DURATION_TICKS,
      sourceBombId: id,
    });
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    for (const { dx, dy } of directions) {
      for (let r = 1; r <= range; r++) {
        const nx = x + dx * r;
        const ny = y + dy * r;
        if (!this.isInBounds(nx, ny)) break;
        const cell = this.grid[ny]?.[nx];
        if (cell?.type === "hard_block" || cell?.type === "collapsed") break;
        this.explosions.push({
          x: nx,
          y: ny,
          ticksRemaining: EXPLOSION_DURATION_TICKS,
          sourceBombId: id,
        });
        if (cell?.type === "soft_block") break;
      }
    }
  }

  private isInBounds(x: number, y: number): boolean {
    const cols = this.grid[0]?.length ?? 0;
    return x >= 0 && y >= 0 && x < cols && y < this.grid.length;
  }

  private updateExplosions(): void {
    this.explosions = this.explosions
      .map((e) => ({ ...e, ticksRemaining: e.ticksRemaining - 1 }))
      .filter((e) => e.ticksRemaining > 0);
  }

  private applyCollapseStep(): void {
    if (this.tickCount < this.suddenDeathStartTick || this.collapseIndex >= this.collapseOrder.length)
      return;
    const { x, y } = this.collapseOrder[this.collapseIndex]!;
    this.grid[y]![x] = { type: "collapsed", x, y };
    for (const [, player] of this.players) {
      if (player.alive && player.x === x && player.y === y) {
        this.players.set(player.id, { ...player, alive: false });
      }
    }
    const bombAt = this.bombs.find((b) => b.x === x && b.y === y);
    if (bombAt) {
      this.bombs = this.bombs.filter((b) => b.id !== bombAt.id);
      const owner = this.players.get(bombAt.ownerId);
      if (owner) {
        this.players.set(bombAt.ownerId, { ...owner, bombs: owner.bombs + 1 });
      }
    }
    this.powerups = this.powerups.filter((p) => !(p.x === x && p.y === y));
    this.collapseIndex++;
  }

  private applyExplosionEffects(): void {
    const explosionSet = new Set(
      this.explosions.map((e) => `${e.x},${e.y}`)
    );
    for (const [, player] of this.players) {
      if (!player.alive || !explosionSet.has(`${player.x},${player.y}`)) continue;
      if (this.playersHitByExplosionThisWave.has(player.id)) continue;
      this.playersHitByExplosionThisWave.add(player.id);
      if (player.shieldActive === true) {
        this.players.set(player.id, { ...player, shieldActive: false, alive: true });
      } else {
        this.players.set(player.id, { ...player, alive: false });
      }
    }
    for (const e of this.explosions) {
      const cell = this.grid[e.y]?.[e.x];
      if (cell?.type === "soft_block") {
        this.grid[e.y]![e.x] = { type: "floor", x: e.x, y: e.y };
        this.trySpawnPowerup(e.x, e.y);
      }
    }
  }

  private trySpawnPowerup(x: number, y: number): void {
    if (this.random() >= POWERUP_SPAWN_CHANCE) return;
    const type = POWERUP_TYPES[Math.floor(this.random() * POWERUP_TYPES.length)] as PowerupType;
    this.powerups.push({ x, y, type });
  }

  private tryPickup(playerId: string, x: number, y: number): void {
    const idx = this.powerups.findIndex((p) => p.x === x && p.y === y);
    if (idx === -1) return;
    const [powerup] = this.powerups.splice(idx, 1);
    this.applyPowerupEffect(playerId, powerup.type);
  }

  private applyPowerupEffect(playerId: string, type: PowerupType): void {
    const player = this.players.get(playerId);
    if (!player) return;
    switch (type) {
      case "bomb_capacity":
        this.players.set(playerId, { ...player, bombs: player.bombs + 1 });
        break;
      case "flame_range":
        this.players.set(playerId, { ...player, range: player.range + 1 });
        break;
      case "speed":
        this.players.set(playerId, {
          ...player,
          speed: Math.min((player.speed ?? 1) + 1, MAX_SPEED),
        });
        break;
      case "shield":
      case "special":
        this.players.set(playerId, { ...player, shieldActive: true });
        break;
    }
  }

  private checkWinCondition(): void {
    const alive = Array.from(this.players.values()).filter((p) => p.alive);
    if (alive.length === 0) {
      this.endMatch(undefined);
    } else if (alive.length === 1 && this.players.size >= 2) {
      this.endMatch(alive[0]!.id);
    }
  }
}
