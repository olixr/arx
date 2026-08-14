import { Rng, TILE_SKIP, Tile, hashString } from '@arx/shared';
import type { PrefabDef, PrefabRoute, PrefabSpawn } from '../maps/prefab.js';

/**
 * THE PAINTER'S CANVAS (the peopled landmarks) — the landmark lane's
 * shared painting toolkit, pulled out of landmarks.ts so the module
 * shelf (modules.ts) and every builder draw with the same hand.
 *
 * The grammar: a Canvas is a TILE_SKIP-transparent rectangle; `put`
 * respects the skip-perimeter law (the outermost ring always stays
 * transparent so the wilderness reads through the hem); painters lay
 * ground first (blob), then wear it (track), then dress it (scatter,
 * the modules). Deterministic per builder — the same artifact forever
 * (pinned-seed authorship, the Foundry law).
 */

export interface Canvas {
  w: number;
  h: number;
  g: Uint16Array;
  /** Authored patrol rounds gathered while painting (finish carries them). */
  routes: PrefabRoute[];
  /** Hand-placed spawns gathered while painting (penned beasts, watchers). */
  spawns: PrefabSpawn[];
}

export const canvas = (w: number, h: number): Canvas => ({
  w,
  h,
  g: new Uint16Array(w * h).fill(TILE_SKIP),
  routes: [],
  spawns: [],
});

export const put = (c: Canvas, x: number, y: number, t: Tile): void => {
  if (x < 1 || y < 1 || x >= c.w - 1 || y >= c.h - 1) return; // skip perimeter law
  c.g[y * c.w + x] = t;
};

export const at = (c: Canvas, x: number, y: number): number =>
  x >= 0 && y >= 0 && x < c.w && y < c.h ? c.g[y * c.w + x]! : TILE_SKIP;

/** Irregular filled disc — the organic ground blob under everything. */
export const blob = (
  c: Canvas,
  cx: number,
  cy: number,
  r: number,
  tile: Tile,
  rng: Rng,
  holes = 0,
): void => {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r - 0.5 + rng.range(-1.2, 1.2)) continue;
      if (holes > 0 && rng.chance(holes)) continue;
      if (at(c, cx + dx, cy + dy) === TILE_SKIP) put(c, cx + dx, cy + dy, tile);
    }
  }
};

/** Worn track between two points, painted only over ground already laid. */
export const track = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rng: Rng,
): void => {
  let x = x0;
  let y = y0;
  for (let guard = 0; guard < 400 && (x !== x1 || y !== y1); guard++) {
    const t = at(c, x, y);
    if (t === Tile.Grass || t === Tile.GrassTall || t === TILE_SKIP) put(c, x, y, Tile.Dirt);
    if (x !== x1 && (y === y1 || rng.chance(0.55))) x += Math.sign(x1 - x);
    else if (y !== y1) y += Math.sign(y1 - y);
  }
};

/** Scatter tiles over already-painted walkable ground near a point. */
export const scatter = (
  c: Canvas,
  cx: number,
  cy: number,
  r: number,
  count: number,
  tiles: readonly Tile[],
  rng: Rng,
): void => {
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 10; tries++) {
      const x = cx + rng.int(-r, r);
      const y = cy + rng.int(-r, r);
      const t = at(c, x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall && t !== Tile.Dirt) continue;
      put(c, x, y, tiles[rng.int(0, tiles.length - 1)]!);
      break;
    }
  }
};

/** A broken rectangular run — old walls remember being walls. */
export const ruinRect = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wall: Tile,
  rubble: Tile,
  rng: Rng,
  gapChance: number,
): void => {
  const cell = (x: number, y: number): void => {
    if (rng.chance(gapChance)) {
      if (rng.chance(0.5)) put(c, x, y, rubble);
      return;
    }
    put(c, x, y, wall);
  };
  for (let x = x0; x <= x1; x++) {
    cell(x, y0);
    cell(x, y1);
  }
  for (let y = y0 + 1; y < y1; y++) {
    cell(x0, y);
    cell(x1, y);
  }
};

/**
 * An authored patrol round — stops walk the painted ground; a stop
 * may dwell (ticks) and sit (the fireside pause). The builder pushes
 * stops in walking order; compose deals rounds to patrol sentries.
 */
export const route = (
  c: Canvas,
  pts: Array<{ dx: number; dy: number; dwell?: number; sit?: boolean }>,
): void => {
  c.routes.push({ pts });
};

/**
 * Litter the walker may kick aside: a route stop that random scatter
 * happened to dress gets swept back to worn ground at finish. Real
 * furniture (fires, racks, kerbs) is NEVER swept — a stop on those is
 * an authoring error the audit must catch, not a silent hole.
 */
const SWEEPABLE = new Set<number>([Tile.Rock, Tile.BonePile, Tile.SkullPile, Tile.CaveRubble]);

export const finish = (c: Canvas, id: string, name: string): PrefabDef => {
  for (const r of c.routes) {
    for (const pt of r.pts) {
      if (SWEEPABLE.has(at(c, pt.dx, pt.dy))) c.g[pt.dy * c.w + pt.dx] = Tile.Dirt;
    }
  }
  return {
    id,
    name,
    width: c.w,
    height: c.h,
    ground: c.g,
    detail: new Uint16Array(c.w * c.h),
    elev: new Int8Array(c.w * c.h),
    portals: [],
    spawns: c.spawns,
    actorSpawns: [],
    ...(c.routes.length > 0 ? { routes: c.routes } : {}),
  };
};

export const seedOf = (id: string): Rng => new Rng(hashString(id) ^ 0x1a4d);
