import { Rng, TILE_SKIP, Tile, hashString } from '@arx/shared';
import type { PrefabDef } from '../maps/prefab.js';

/**
 * THE LANDMARKS (the hybrid charter) — expansive pre-authored POIs,
 * 3-5× the ordinary camp's footprint (the shelf's median is 14 tiles
 * across; these run 60-68), built for EXPLORATION: loose clusters,
 * open ground between them, a heart worth walking to. They are the
 * authored half of the clusters-of-clusters vision — the procedural
 * scaffold decides WHERE one stands; what stands there is curated.
 *
 * Authored the Foundry way: deterministic builders at PINNED seeds —
 * the same artifact forever, validated at build, seeded to
 * data/prefabs at boot (FILE WINS — Map Studio polish sticks). The
 * interiors are PAINTED ground (the claimed-yard lesson: transparent
 * hearts get swallowed by whatever wilderness the site lands on);
 * only the fringes stay meadow.
 *
 * No spawn markers — a POI's bodies come from its def's garrison,
 * composed semantically (holdfasts inside, sentries on the approach).
 */

interface Canvas {
  w: number;
  h: number;
  g: Uint16Array;
}

const canvas = (w: number, h: number): Canvas => ({ w, h, g: new Uint16Array(w * h).fill(TILE_SKIP) });

const put = (c: Canvas, x: number, y: number, t: Tile): void => {
  if (x < 1 || y < 1 || x >= c.w - 1 || y >= c.h - 1) return; // skip perimeter law
  c.g[y * c.w + x] = t;
};

const at = (c: Canvas, x: number, y: number): number =>
  x >= 0 && y >= 0 && x < c.w && y < c.h ? c.g[y * c.w + x]! : TILE_SKIP;

/** Irregular filled disc — the organic ground blob under everything. */
const blob = (c: Canvas, cx: number, cy: number, r: number, tile: Tile, rng: Rng, holes = 0): void => {
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
const track = (c: Canvas, x0: number, y0: number, x1: number, y1: number, rng: Rng): void => {
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
const scatter = (
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
const ruinRect = (
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

const finish = (c: Canvas, id: string, name: string): PrefabDef => ({
  id,
  name,
  width: c.w,
  height: c.h,
  ground: c.g,
  detail: new Uint16Array(c.w * c.h),
  elev: new Int8Array(c.w * c.h),
  portals: [],
  spawns: [],
  actorSpawns: [],
});

const seedOf = (id: string): Rng => new Rng(hashString(id) ^ 0x1a4d);

// --------------------------------------------------------------------
// THE GREAT BARROWFIELD (dead) — rows of kerbed mounds on open turf, a
// stone processional walking north to the great barrow's open door.
function buildBarrowfield(): PrefabDef {
  const c = canvas(66, 50);
  const rng = seedOf('poi_barrowfield_great');
  // The turf: one broad meadow blob, tufted.
  blob(c, 33, 25, 29, Tile.Grass, rng, 0);
  for (let i = 0; i < 90; i++) {
    const x = rng.int(4, 61);
    const y = rng.int(4, 45);
    if (at(c, x, y) === Tile.Grass && rng.chance(0.8)) put(c, x, y, Tile.GrassTall);
  }
  // Barrow rows: kerbed mounds, some levered open (the robbed ones).
  const mounds: Array<[number, number]> = [];
  for (const [mx, my] of [
    [12, 12], [24, 14], [37, 12], [50, 14],
    [10, 24], [22, 27], [48, 26], [56, 22],
    [14, 37], [27, 40], [40, 38], [53, 38],
  ] as const) {
    mounds.push([mx, my]);
    const opened = rng.chance(0.4);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const edge = Math.abs(dx) === 3 || Math.abs(dy) === 2;
        if (edge) {
          if (opened && dy === 2 && Math.abs(dx) <= 1) put(c, mx + dx, my + dy, Tile.CaveRubble);
          else put(c, mx + dx, my + dy, Tile.Rock);
        } else if (dx === 0 && dy === 0) {
          put(c, mx, my, Tile.BonePile);
        }
      }
    }
    if (opened) scatter(c, mx, my + 4, 3, 2, [Tile.BonePile, Tile.CaveRubble], rng);
  }
  // The great barrow: a double kerb, an arch standing open, the cache.
  ruinRect(c, 27, 17, 39, 27, Tile.Rock, Tile.CaveRubble, rng, 0.08);
  for (let y = 19; y <= 25; y++) for (let x = 29; x <= 37; x++) put(c, x, y, Tile.StoneFloor);
  put(c, 33, 27, Tile.ArchStone);
  put(c, 33, 20, Tile.ChestIron);
  put(c, 30, 20, Tile.Brazier);
  put(c, 36, 20, Tile.Brazier);
  // The processional: pillar pairs walking from the south fringe.
  for (const py of [46, 41, 36, 31] as const) {
    put(c, 30, py, Tile.PillarStone);
    put(c, 36, py, Tile.PillarStone);
  }
  track(c, 33, 47, 33, 28, rng);
  // Tracks wander mound to mound — grave-tenders kept their rounds.
  for (const [mx, my] of mounds) if (rng.chance(0.6)) track(c, mx, my + 3, 33, 34, rng);
  scatter(c, 33, 25, 26, 14, [Tile.BonePile, Tile.Rock], rng);
  return finish(c, 'poi_barrowfield_great', 'The great barrowfield');
}

// --------------------------------------------------------------------
// THE FALLEN KEEP (dead) — a curtain wall that lost its war, a husk of
// a keep still holding its floor, and the wood eating the courtyard.
function buildGreatkeep(): PrefabDef {
  const c = canvas(62, 48);
  const rng = seedOf('poi_ruin_greatkeep');
  blob(c, 31, 24, 27, Tile.Grass, rng, 0);
  // The curtain: broken badly on the south and east.
  ruinRect(c, 8, 7, 53, 40, Tile.WallStone, Tile.CaveRubble, rng, 0.3);
  // Corner towers; the southeast one came down whole.
  for (const [tx, ty, fallen] of [
    [8, 7, false], [53, 7, false], [8, 40, false], [53, 40, true],
  ] as const) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        put(c, tx + dx, ty + dy, fallen ? Tile.CaveRubble : Tile.WallStone);
      }
    }
  }
  // The courtyard: worn floor going back to weed.
  for (let y = 9; y <= 38; y++) {
    for (let x = 10; x <= 51; x++) {
      if (at(c, x, y) === Tile.Grass && rng.chance(0.3)) {
        put(c, x, y, rng.chance(0.7) ? Tile.Dirt : Tile.GrassTall);
      }
    }
  }
  // The keep husk: floor intact, roof long gone, the cache inside.
  ruinRect(c, 24, 13, 38, 24, Tile.WallStone, Tile.CaveRubble, rng, 0.16);
  for (let y = 14; y <= 23; y++) for (let x = 25; x <= 37; x++) put(c, x, y, Tile.StoneFloor);
  put(c, 31, 24, Tile.DoorwayStone);
  put(c, 31, 15, Tile.ChestIron);
  put(c, 27, 15, Tile.Brazier);
  put(c, 35, 15, Tile.Brazier);
  put(c, 26, 21, Tile.PillarStone);
  put(c, 36, 21, Tile.PillarStone);
  // The gate the road remembers: a gap in the south run, rubble-flanked.
  for (const gx of [29, 30, 31, 32, 33] as const) put(c, gx, 40, Tile.Dirt);
  track(c, 31, 45, 31, 25, rng);
  scatter(c, 31, 24, 20, 18, [Tile.CaveRubble, Tile.Rock, Tile.BonePile], rng);
  scatter(c, 31, 30, 14, 8, [Tile.GrassTall], rng);
  return finish(c, 'poi_ruin_greatkeep', 'The fallen keep');
}

// --------------------------------------------------------------------
// THE GOBLIN SPRAWL (goblin) — a tent city that never learned walls:
// five camp clusters on worn ground, paths braiding to the moot fire.
function buildGoblinSprawl(): PrefabDef {
  const c = canvas(68, 50);
  const rng = seedOf('poi_goblin_sprawl');
  blob(c, 34, 25, 30, Tile.Grass, rng, 0);
  const heart: [number, number] = [34, 25];
  blob(c, heart[0], heart[1], 6, Tile.Dirt, rng, 0.1);
  put(c, heart[0], heart[1], Tile.Bonfire);
  put(c, heart[0] - 3, heart[1] - 2, Tile.WarDrum);
  put(c, heart[0] + 3, heart[1] - 2, Tile.SkullTotem);
  const clusters: Array<[number, number]> = [
    [14, 12], [50, 11], [56, 32], [16, 36], [36, 40],
  ];
  clusters.forEach(([kx, ky], ci) => {
    blob(c, kx, ky, 6, Tile.Dirt, rng, 0.2);
    const tents = ci === 0 ? 4 : rng.int(3, 4);
    for (let i = 0; i < tents; i++) {
      const a = (i / tents) * Math.PI * 2 + rng.range(-0.4, 0.4);
      const tx = Math.round(kx + Math.cos(a) * 4);
      const ty = Math.round(ky + Math.sin(a) * 3);
      put(c, tx, ty, ci === 0 && i === 0 ? Tile.TentWar : Tile.TentHide);
    }
    put(c, kx, ky, Tile.Campfire);
    scatter(c, kx, ky, 5, 3, [Tile.SkullPile, Tile.MeatRack, Tile.WarBanner], rng);
    track(c, kx, ky + 1, heart[0], heart[1] + 1, rng);
  });
  // The chief's cluster keeps the cache and a cage of the unlucky —
  // inside the trampled ring, under the war tent's eye.
  put(c, 12, 10, Tile.ChestIron);
  put(c, 17, 14, Tile.PrisonCage);
  // A worg pen gone half to ruin on the east side.
  ruinRect(c, 44, 20, 52, 26, Tile.Fence, Tile.BonePile, rng, 0.25);
  for (let y = 21; y <= 25; y++) for (let x = 45; x <= 51; x++) {
    if (at(c, x, y) === Tile.Grass) put(c, x, y, Tile.Dirt);
  }
  put(c, 48, 23, Tile.BeastNest);
  track(c, 48, 27, heart[0], heart[1], rng);
  scatter(c, 34, 25, 28, 20, [Tile.SkullPile, Tile.BonePile, Tile.WarBanner, Tile.MeatSpit], rng);
  return finish(c, 'poi_goblin_sprawl', 'The goblin sprawl');
}

// --------------------------------------------------------------------
// THE KILL-FIELD (wolfkin) — where the pack drags what it takes: bone
// drifts, den mounds, hide racks, and a rib-ringed heart of trophies.
function buildKillfield(): PrefabDef {
  const c = canvas(64, 48);
  const rng = seedOf('poi_wolfkin_killfield');
  blob(c, 32, 24, 28, Tile.Grass, rng, 0);
  // Bone drifts: long smears of old kills.
  for (const [bx, by, br] of [
    [16, 14, 5], [44, 12, 4], [52, 28, 5], [20, 34, 4], [38, 36, 5],
  ] as const) {
    blob(c, bx, by, br, Tile.Dirt, rng, 0.3);
    scatter(c, bx, by, br + 1, 6, [Tile.BonePile, Tile.SkullPile], rng);
  }
  // Den mounds: rock lips over nests.
  for (const [dx, dy] of [
    [10, 22], [26, 10], [54, 18], [46, 40], [14, 42],
  ] as const) {
    for (let i = -2; i <= 2; i++) put(c, dx + i, dy - 1, Tile.Rock);
    put(c, dx - 2, dy, Tile.Rock);
    put(c, dx + 2, dy, Tile.Rock);
    blob(c, dx, dy + 1, 2, Tile.Dirt, rng, 0);
    put(c, dx, dy, Tile.BeastNest);
    track(c, dx, dy + 2, 32, 24, rng);
  }
  // The racks: hides and meat strung between posts.
  for (let i = 0; i < 4; i++) {
    put(c, 24 + i * 4, 28, i % 2 === 0 ? Tile.HideFrame : Tile.MeatRack);
  }
  // The heart: a rib-ring of skulls around the pack's hoard.
  blob(c, 32, 20, 5, Tile.Dirt, rng, 0.1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    put(c, Math.round(32 + Math.cos(a) * 4), Math.round(20 + Math.sin(a) * 3), Tile.SkullPile);
  }
  put(c, 32, 20, Tile.ChestIron);
  scatter(c, 32, 24, 26, 16, [Tile.BonePile, Tile.SkullPile], rng);
  return finish(c, 'poi_wolfkin_killfield', 'The kill-field');
}

// --------------------------------------------------------------------
// THE LOST WAYSTEAD (brigand) — a king's waystation the road forgot
// and the robbers remembered: broken yard, wagon ring, stores kept
// under a watch-mound with a torch that still burns.
function buildWaystead(): PrefabDef {
  const c = canvas(60, 46);
  const rng = seedOf('poi_brigand_waystead');
  blob(c, 30, 23, 26, Tile.Grass, rng, 0);
  // The old yard wall: timber, mostly down.
  ruinRect(c, 9, 8, 50, 38, Tile.Fence, Tile.CaveRubble, rng, 0.4);
  for (let y = 10; y <= 36; y++) {
    for (let x = 11; x <= 48; x++) {
      if (at(c, x, y) === Tile.Grass && rng.chance(0.25)) put(c, x, y, Tile.Dirt);
    }
  }
  // The stable husk, now the stores: wood walls, plunder inside.
  ruinRect(c, 14, 12, 27, 20, Tile.WallWood, Tile.CaveRubble, rng, 0.18);
  for (let y = 13; y <= 19; y++) for (let x = 15; x <= 26; x++) put(c, x, y, Tile.WoodFloor);
  put(c, 20, 20, Tile.DoorwayWood);
  put(c, 17, 14, Tile.ChestIron);
  put(c, 24, 14, Tile.PlunderSacks);
  put(c, 16, 18, Tile.Crate);
  put(c, 25, 18, Tile.Barrel);
  // The wagon ring: where the takes get sorted.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const wx = Math.round(38 + Math.cos(a) * 6);
    const wy = Math.round(27 + Math.sin(a) * 4);
    put(c, wx, wy, i % 3 === 0 ? Tile.PlunderSacks : i % 3 === 1 ? Tile.Crate : Tile.Barrel);
  }
  blob(c, 38, 27, 4, Tile.Dirt, rng, 0.15);
  put(c, 38, 27, Tile.Campfire);
  // The watch-mound: high ground by the gate, torch and banner.
  blob(c, 44, 13, 4, Tile.Dirt, rng, 0);
  put(c, 44, 12, Tile.StandingTorch);
  put(c, 46, 14, Tile.WarBanner);
  put(c, 42, 14, Tile.TargetDummy);
  // The gate gap the road still finds.
  for (const gx of [28, 29, 30, 31] as const) put(c, gx, 38, Tile.Dirt);
  track(c, 29, 43, 29, 30, rng);
  track(c, 29, 30, 38, 27, rng);
  track(c, 29, 30, 20, 21, rng);
  scatter(c, 30, 23, 22, 12, [Tile.Crate, Tile.Barrel, Tile.CaveRubble], rng);
  return finish(c, 'poi_brigand_waystead', 'The lost waystead');
}

/** The landmark shelf — built once at module load, pinned forever. */
export const LANDMARK_PREFABS: readonly PrefabDef[] = [
  buildBarrowfield(),
  buildGreatkeep(),
  buildGoblinSprawl(),
  buildKillfield(),
  buildWaystead(),
];
