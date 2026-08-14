import {
  CHUNK_SIZE,
  Rng,
  THEME_LAWS,
  Tile,
  hashCoords,
  type DungeonSpec,
  type Vec2,
} from '@arx/shared';
import type { PortalDef, ZoneDef } from '@arx/content';
import { carveAll, carveSecrets } from './carve.js';
import { dressAll } from './dress.js';
import { garrisonAll } from './garrison.js';
import { planLayout } from './plan.js';
import { Carver, type DungeonBuild } from './types.js';

/**
 * THE LONG DARK — the dungeon generator, THE KEY IS THE DUNGEON.
 *
 * Everything below is a pure function of the DungeonSpec (itself pure
 * in the key's roll): named RNG streams per pass mean the layout
 * stream never feels the garrison stream, so content added to one
 * pass never reshuffles another and every key keeps opening the same
 * halls it always did.
 *
 * The pipeline — each pass a module, all sharing one DungeonBuild:
 *   1. PLAN     (plan.ts)    — THE SPINE AND THE BRANCHES: the
 *                critical path is authored rung by rung, side rooms
 *                hang off it, loops close only between neighbors.
 *   2. CARVE    (carve.ts)   — structure first (halls, galleries,
 *                rotundas, colonnades), organics second (cellular
 *                cavern growth), authored prefabs last (variant
 *                pools, mirrored); then SECRETS behind cracked walls.
 *   3. DRESS    (dress.ts)   — masonry ring, water, the ore and chest
 *                ladders, per-theme decor kits, corridor lights, and
 *                the reach-mask repair sweep (placement truth).
 *   4. GARRISON (garrison.ts) — power-banded theme rosters, patrol
 *                sentries, posted camp life, and the champion's court
 *                with its crown and warded chest.
 */

export interface DungeonResult {
  zone: ZoneDef;
  /** Where the entering player lands (world coords). */
  entry: Vec2;
  spec: DungeonSpec;
  /**
   * THE COURT WARDS THE PRIZE: the champion's chest (world coords) —
   * the server registers its ward so the lid holds while he stands.
   */
  bossChest: Vec2 | null;
  /** Index into zone.spawns of the champion (the ward reads his life). */
  bossSpawnIndex: number | null;
}

/** Largest tier size — instance slots are spaced by it. */
const MAX_SIZE = 200;

/** Dungeon instances live on their own row of the dark band. */
export function dungeonOrigin(slot: number): Vec2 {
  return { x: 8192 + slot * (MAX_SIZE + CHUNK_SIZE * 2), y: 8192 };
}

export function generateDungeon(
  spec: DungeonSpec,
  origin: Vec2,
  returnTo: Vec2,
  slot: number,
): DungeonResult {
  const b: DungeonBuild = {
    spec,
    theme: THEME_LAWS.find((t) => t.theme === spec.theme)!,
    c: new Carver(spec.size),
    origin,
    returnTo,
    rLayout: new Rng(hashCoords(spec.seed, 1, 0)),
    rCarve: new Rng(hashCoords(spec.seed, 2, 0)),
    rSecret: new Rng(hashCoords(spec.seed, 3, 0)),
    rDress: new Rng(hashCoords(spec.seed, 4, 0)),
    rMobs: new Rng(hashCoords(spec.seed, 5, 0)),
    rooms: [],
    edges: [],
    spine: [],
    bossIdx: 0,
    corridorPaths: [],
    hiddenRooms: [],
    openMask: new Uint8Array(0),
    secretMask: new Uint8Array(0),
    placedChests: [],
    oreSpots: [],
    removables: [],
    bossChest: null,
    spawns: [],
    bossSpawnIndex: null,
  };

  planLayout(b);
  carveAll(b);
  carveSecrets(b);
  dressAll(b);
  garrisonAll(b);

  // ---- exit portal + zone -------------------------------------------
  const entry = b.rooms[0]!;
  b.c.set(entry.x, entry.y, Tile.PortalUp);
  // The landing apron always reads: floor under your feet.
  for (let dy = 0; dy <= 2; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      b.c.carve(entry.x + dx, entry.y + dy, Tile.CaveFloor);
    }
  }
  const portals: PortalDef[] = [
    { x: origin.x + entry.x, y: origin.y + entry.y, dest: returnTo },
  ];

  const zone: ZoneDef = {
    id: `dungeon-${slot}-${spec.sigil}-${spec.seed}`,
    name: spec.name,
    origin,
    width: spec.size,
    height: spec.size,
    ground: b.c.ground,
    detail: b.c.detail,
    portals,
    spawns: b.spawns,
  };

  return {
    zone,
    entry: { x: origin.x + entry.x + 0.5, y: origin.y + entry.y + 1.6 },
    spec,
    bossChest: b.bossChest ? { x: origin.x + b.bossChest.x, y: origin.y + b.bossChest.y } : null,
    bossSpawnIndex: b.bossSpawnIndex,
  };
}
