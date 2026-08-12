import {
  CHUNK_SIZE,
  DOOR_TILES,
  Rng,
  Tile,
  hashCoords,
  isSolidTile,
  THEME_LAWS,
  rarityIndex,
  type DungeonSpec,
  type DungeonTheme,
  type Vec2,
} from '@arx/shared';
import type { PortalDef, ZoneDef, ZoneSpawn } from '@arx/content';
import {
  ARENA_CAVE,
  ARENA_HALL,
  CAMP,
  FORGE,
  OSSUARY,
  PREFAB_TILES,
  SPRING,
  VAULT,
  type Prefab,
} from './prefabs.js';

/**
 * The dungeon generator — THE KEY IS THE DUNGEON.
 *
 * Everything below is a pure function of the DungeonSpec (itself pure
 * in the key's roll): named RNG streams per pass mean the layout
 * stream never feels the garrison stream, so content added to one
 * pass never reshuffles another and every key keeps opening the same
 * halls it always did.
 *
 * The pipeline, in order:
 *   1. PLAN    — chamber anchors (best-candidate spread), MST + loop
 *                edges, graph depth from the entry; the deepest
 *                chamber is the boss.
 *   2. CARVE   — two dialects blended per theme: cellular cavern
 *                blobs and rect masonry halls; corridors follow the
 *                edges (drunk tunnels / L-halls). Authored prefabs
 *                stamp the set-pieces: arena, vault, forge, camp,
 *                spring, ossuary.
 *   3. SECRETS — hidden rooms sealed behind CrackedCaveWall (three
 *                blows open them — the destructible law is the key).
 *   4. DRESS   — masonry ring around flagstone floors, water pools,
 *                the ore ladder, props (stalagmites, glowshrooms,
 *                braziers, bones, crates), then a connectivity-repair
 *                pass so no prop ever walls off a prize.
 *   5. GARRISON — theme rosters scaled to the key's power level;
 *                the boss and his guard hold the arena.
 */

export interface DungeonResult {
  zone: ZoneDef;
  /** Where the entering player lands (world coords). */
  entry: Vec2;
  spec: DungeonSpec;
}

/** Largest tier size — instance slots are spaced by it. */
const MAX_SIZE = 184;

/** Dungeon instances live on their own row of the dark band. */
export function dungeonOrigin(slot: number): Vec2 {
  return { x: 8192 + slot * (MAX_SIZE + CHUNK_SIZE * 2), y: 8192 };
}

// ------------------------------------------------------------- rosters

interface ThemeRoster {
  packs: Array<{ npc: string; w: number }>;
  elite: string;
  boss: { npc: string; name: string };
  /** Hidden-room guardian display name. */
  warden: string;
}

const ROSTERS: Record<DungeonTheme, ThemeRoster> = {
  cavern: {
    packs: [
      { npc: 'cave_bat', w: 3 },
      { npc: 'giant_spider', w: 2 },
      { npc: 'slime', w: 2 },
      { npc: 'adder', w: 2 },
      { npc: 'mudcrab', w: 1 },
    ],
    elite: 'giant_spider',
    boss: { npc: 'giant_spider', name: 'The Broodmother' },
    warden: 'Deep Lurker',
  },
  crypt: {
    packs: [
      { npc: 'skeleton', w: 3 },
      { npc: 'skeleton_archer', w: 2 },
      { npc: 'skeleton_guard', w: 2 },
      // The crypt's voice: dungeon reissues run 30+, where the
      // raising wakes (minLevel 30 on raise_the_fallen).
      { npc: 'skeleton_chanter', w: 1 },
      { npc: 'cave_bat', w: 1 },
    ],
    elite: 'skeleton_guard',
    boss: { npc: 'skeleton_champion', name: 'The Fallen Champion' },
    warden: 'Reliquary Warden',
  },
  mine: {
    packs: [
      { npc: 'goblin', w: 3 },
      { npc: 'goblin_thrower', w: 2 },
      { npc: 'giant_beetle', w: 2 },
      { npc: 'goblin_firecaller', w: 1 },
      { npc: 'rat', w: 1 },
      { npc: 'cave_bat', w: 1 },
    ],
    elite: 'giant_beetle',
    boss: { npc: 'troll', name: 'The Deep Troll' },
    warden: 'Claim Keeper',
  },
  stronghold: {
    packs: [
      { npc: 'goblin', w: 3 },
      { npc: 'goblin_thrower', w: 2 },
      { npc: 'wolf', w: 2 },
      { npc: 'goblin_gloomcaller', w: 1 },
      { npc: 'troll', w: 1 },
    ],
    elite: 'troll',
    boss: { npc: 'troll', name: 'The Hold-Warden' },
    warden: 'Vault Sentinel',
  },
};

/** Mining level each ore wants — gates the ladder by dungeon power. */
const ORE_LADDER: Array<{ tile: Tile; req: number }> = [
  { tile: Tile.RockCopper, req: 1 },
  { tile: Tile.RockTin, req: 1 },
  { tile: Tile.RockIron, req: 10 },
  { tile: Tile.RockCoal, req: 20 },
  { tile: Tile.RockSilver, req: 30 },
  { tile: Tile.RockGold, req: 40 },
  { tile: Tile.RockMithril, req: 50 },
  { tile: Tile.RockAdamant, req: 65 },
  { tile: Tile.RockObsidian, req: 78 },
  { tile: Tile.RockStarfall, req: 90 },
];

const CHEST_TILE_SET: ReadonlySet<Tile> = new Set([
  Tile.ChestWood,
  Tile.ChestMossy,
  Tile.ChestIron,
  Tile.ChestGilded,
  Tile.ChestBoss,
]);

/** Path-chest ladders per tier (boss/vault/hidden chests come extra). */
const PATH_CHESTS: Record<string, Tile[]> = {
  common: [Tile.ChestWood, Tile.ChestWood, Tile.ChestMossy],
  uncommon: [Tile.ChestWood, Tile.ChestMossy, Tile.ChestMossy, Tile.ChestMossy],
  rare: [Tile.ChestMossy, Tile.ChestMossy, Tile.ChestMossy, Tile.ChestIron],
  epic: [Tile.ChestMossy, Tile.ChestIron, Tile.ChestIron, Tile.ChestIron, Tile.ChestGilded],
  legendary: [Tile.ChestIron, Tile.ChestIron, Tile.ChestGilded, Tile.ChestGilded],
};

// ------------------------------------------------------------ plumbing

type AnchorKind = 'entry' | 'boss' | 'room' | 'vault' | 'camp' | 'forge' | 'spring' | 'ossuary';
type RoomStyle = 'cave' | 'hall';

interface Anchor {
  x: number;
  y: number;
  kind: AnchorKind;
  style: RoomStyle;
  /** Rough carved radius, for dressing density. */
  r: number;
  depth: number;
  degree: number;
}

class Carver {
  readonly ground: Uint16Array;
  readonly detail: Uint16Array;
  constructor(readonly s: number) {
    this.ground = new Uint16Array(s * s).fill(Tile.CaveWall);
    this.detail = new Uint16Array(s * s);
  }

  inb(x: number, y: number): boolean {
    // A two-tile rock apron all round: the zone seam never shows.
    return x >= 2 && y >= 2 && x < this.s - 2 && y < this.s - 2;
  }

  get(x: number, y: number): Tile {
    if (x < 0 || y < 0 || x >= this.s || y >= this.s) return Tile.CaveWall;
    return this.ground[y * this.s + x] as Tile;
  }

  set(x: number, y: number, t: Tile): void {
    if (this.inb(x, y)) this.ground[y * this.s + x] = t;
  }

  /** Carve to floor; never demotes an existing floor-ish tile. */
  carve(x: number, y: number, t: Tile): void {
    if (!this.inb(x, y)) return;
    const cur = this.get(x, y);
    if (cur === Tile.CaveWall || cur === Tile.CrackedCaveWall || cur === Tile.WallStone) {
      this.set(x, y, t);
    }
  }

  isRock(x: number, y: number): boolean {
    const t = this.get(x, y);
    return t === Tile.CaveWall || t === Tile.CrackedCaveWall || t === Tile.WallStone;
  }

  /**
   * Walkable for the run-through: floors, water, and door tiles.
   * With `cracksOpen`, cracked walls count too — "reachable once the
   * player smashes through", the hidden-prize guarantee.
   */
  passable(x: number, y: number, cracksOpen = false): boolean {
    const t = this.get(x, y);
    if (cracksOpen && t === Tile.CrackedCaveWall) return true;
    return !isSolidTile(t) || DOOR_TILES.has(t);
  }
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

// ------------------------------------------------------------ carving

function carveBlob(c: Carver, cx: number, cy: number, r: number, rng: Rng, floor: Tile): void {
  const R = r + 2;
  const w = 2 * R + 1;
  let mask = new Uint8Array(w * w);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy) / r;
      const p = d <= 0.55 ? 0.94 : Math.max(0, 0.94 - (d - 0.55) * 1.7);
      mask[(dy + R) * w + dx + R] = rng.chance(p) ? 1 : 0;
    }
  }
  // Cellular smoothing: the noise becomes one organic chamber.
  for (let pass = 0; pass < 3; pass++) {
    const next = new Uint8Array(w * w);
    for (let y = 1; y < w - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) n += mask[(y + dy) * w + x + dx]!;
          }
        }
        next[y * w + x] = n >= 5 ? 1 : 0;
      }
    }
    mask = next;
  }
  // Keep only the component holding the centre (stray islets die).
  const keep = new Uint8Array(w * w);
  const stack = [R * w + R];
  mask[R * w + R] = 1; // the anchor itself is always open
  while (stack.length > 0) {
    const i = stack.pop()!;
    if (keep[i] || !mask[i]) continue;
    keep[i] = 1;
    const x = i % w;
    const y = Math.floor(i / w);
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < w - 1) stack.push(i + w);
  }
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      if (keep[(dy + R) * w + dx + R]) c.carve(cx + dx, cy + dy, floor);
    }
  }
}

function carveHall(c: Carver, cx: number, cy: number, rng: Rng): { w: number; h: number } {
  const w = rng.int(10, 16);
  const h = rng.int(9, 13);
  const x0 = cx - (w >> 1);
  const y0 = cy - (h >> 1);
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) c.carve(x, y, Tile.DungeonFloor);
  }
  // An alcove or two breaks the box read.
  if (rng.chance(0.6)) {
    const ax = rng.chance(0.5) ? x0 - 2 : x0 + w;
    const ay = cy + rng.int(-2, 2);
    for (let y = ay - 1; y <= ay + 1; y++) {
      for (let x = Math.min(ax, ax + 1); x <= Math.max(ax, ax + 1); x++) {
        c.carve(x, y, Tile.DungeonFloor);
      }
    }
  }
  return { w, h };
}

/**
 * A drunk tunnel: momentum + jitter, disc brush — reads as grown.
 * WIDTH IS READABILITY: the 2.5D camera hides thin passages behind
 * their own south walls, so the brush stays generous (~3-4 tiles,
 * bulging wider) — a corridor you can fight in, not a crack you
 * squeeze through. Carved centers are recorded so the dressing pass
 * can light the way.
 */
function tunnelCave(c: Carver, a: Vec2, b: Vec2, rng: Rng, path?: Array<{ x: number; y: number }>): void {
  let x = a.x;
  let y = a.y;
  let guard = c.s * 6;
  while (dist(x, y, b.x, b.y) > 1.2 && guard-- > 0) {
    const ang = Math.atan2(b.y - y, b.x - x) + rng.range(-0.9, 0.9);
    x += Math.cos(ang);
    y += Math.sin(ang);
    const r = rng.chance(0.3) ? 2.6 : 1.9;
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          c.carve(Math.round(x) + dx, Math.round(y) + dy, Tile.CaveFloor);
        }
      }
    }
    path?.push({ x: Math.round(x), y: Math.round(y) });
  }
}

/** A worked corridor: straight L, even width 3 (half the time 4). */
function tunnelBuilt(c: Carver, a: Vec2, b: Vec2, rng: Rng, path?: Array<{ x: number; y: number }>): void {
  const width = rng.chance(0.5) ? 4 : 3;
  const lo = -((width - 1) >> 1);
  const hi = width >> 1;
  const horizFirst = rng.chance(0.5);
  const carveSpan = (x0: number, x1: number, y0: number, y1: number) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        for (let o = lo; o <= hi; o++) {
          if (x0 === x1) c.carve(x + o, y, Tile.DungeonFloor);
          else c.carve(x, y + o, Tile.DungeonFloor);
        }
        path?.push({ x, y });
      }
    }
  };
  if (horizFirst) {
    carveSpan(a.x, b.x, a.y, a.y);
    carveSpan(b.x, b.x, a.y, b.y);
  } else {
    carveSpan(a.x, a.x, a.y, b.y);
    carveSpan(a.x, b.x, b.y, b.y);
  }
}

interface StampResult {
  breaches: Array<{ x: number; y: number }>;
}

function stampPrefab(
  c: Carver,
  pf: Prefab,
  cx: number,
  cy: number,
  dialectFloor: Tile,
  opts?: { sealed?: boolean },
): StampResult {
  const x0 = cx - (pf.w >> 1);
  const y0 = cy - (pf.h >> 1);
  const breaches: Array<{ x: number; y: number }> = [];
  for (let ry = 0; ry < pf.h; ry++) {
    const row = pf.rows[ry]!;
    for (let rx = 0; rx < pf.w; rx++) {
      const ch = row[rx]!;
      if (ch === '_') continue;
      const x = x0 + rx;
      const y = y0 + ry;
      if (ch === '#') {
        // Walls only claim rock. A corridor that already broke through
        // stays broken — that's the door of the room.
        if (c.isRock(x, y)) c.set(x, y, Tile.CaveWall);
        else if (c.passable(x, y)) breaches.push({ x, y });
        continue;
      }
      if (ch === '.') {
        c.set(x, y, dialectFloor);
        continue;
      }
      const t = PREFAB_TILES[ch];
      if (t !== undefined) c.set(x, y, t);
    }
  }
  // Sealed set-pieces hang a shut stone door in a narrow breach; a
  // breach wider than a triple door simply stays an open mouth.
  if (opts?.sealed && breaches.length > 0 && breaches.length <= 3) {
    for (const b of breaches) c.set(b.x, b.y, Tile.DoorwayStoneShut);
  }
  return { breaches };
}

// -------------------------------------------------------- connectivity

/** BFS over passable tiles from one point; returns the visited mask. */
function reachMask(c: Carver, sx: number, sy: number, cracksOpen = false): Uint8Array {
  const seen = new Uint8Array(c.s * c.s);
  if (!c.passable(sx, sy, cracksOpen)) return seen;
  const queue = [sy * c.s + sx];
  seen[sy * c.s + sx] = 1;
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % c.s;
    const y = Math.floor(i / c.s);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= c.s || ny >= c.s) continue;
      const ni = ny * c.s + nx;
      if (seen[ni] || !c.passable(nx, ny, cracksOpen)) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  return seen;
}

/** A target counts as reached if it or any orthogonal neighbor is. */
function reached(seen: Uint8Array, s: number, x: number, y: number): boolean {
  if (seen[y * s + x]) return true;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < s && ny < s && seen[ny * s + nx]) return true;
  }
  return false;
}

// ------------------------------------------------------------ generate

export function generateDungeon(
  spec: DungeonSpec,
  origin: Vec2,
  returnTo: Vec2,
  slot: number,
): DungeonResult {
  const S = spec.size;
  const c = new Carver(S);
  const theme = THEME_LAWS.find((t) => t.theme === spec.theme)!;
  const roster = ROSTERS[spec.theme];
  const rLayout = new Rng(hashCoords(spec.seed, 1, 0));
  const rCarve = new Rng(hashCoords(spec.seed, 2, 0));
  const rSecret = new Rng(hashCoords(spec.seed, 3, 0));
  const rDress = new Rng(hashCoords(spec.seed, 4, 0));
  const rMobs = new Rng(hashCoords(spec.seed, 5, 0));

  // ---- 1. PLAN: anchors, edges, depth --------------------------------
  const M = 10;
  const anchors: Anchor[] = [
    {
      x: (S >> 1) + rLayout.int(-(S >> 3), S >> 3),
      y: S - M - 2,
      kind: 'entry',
      style: 'cave',
      r: 6,
      depth: 0,
      degree: 0,
    },
  ];
  while (anchors.length < spec.chambers) {
    let best: Vec2 | null = null;
    let bestScore = -1;
    for (let k = 0; k < 14; k++) {
      const p = { x: rLayout.int(M, S - M - 1), y: rLayout.int(M, S - M - 1) };
      let minD = Infinity;
      for (const a of anchors) minD = Math.min(minD, dist(p.x, p.y, a.x, a.y));
      if (minD > bestScore) {
        bestScore = minD;
        best = p;
      }
    }
    anchors.push({ ...best!, kind: 'room', style: 'cave', r: 7, depth: 0, degree: 0 });
  }

  // Prim MST, then a few loop edges so runs aren't pure out-and-back.
  const n = anchors.length;
  const inTree = new Set<number>([0]);
  const edges: Array<[number, number]> = [];
  while (inTree.size < n) {
    let bi = -1;
    let bj = -1;
    let bd = Infinity;
    for (const i of inTree) {
      for (let j = 0; j < n; j++) {
        if (inTree.has(j)) continue;
        const d = dist(anchors[i]!.x, anchors[i]!.y, anchors[j]!.x, anchors[j]!.y);
        if (d < bd) {
          bd = d;
          bi = i;
          bj = j;
        }
      }
    }
    edges.push([bi, bj]);
    inTree.add(bj);
  }
  const hasEdge = (i: number, j: number) =>
    edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i));
  // Loop budget scales with the chamber count: the bigger halls need
  // more cross-links or a long run turns into pure out-and-back.
  const maxLoops = Math.max(3, Math.round(spec.chambers / 5));
  let loops = 0;
  for (let i = 0; i < n && loops < maxLoops; i++) {
    for (let j = i + 1; j < n && loops < maxLoops; j++) {
      if (hasEdge(i, j)) continue;
      const d = dist(anchors[i]!.x, anchors[i]!.y, anchors[j]!.x, anchors[j]!.y);
      if (d < S * 0.34 && rLayout.chance(0.28)) {
        edges.push([i, j]);
        loops++;
      }
    }
  }
  for (const [i, j] of edges) {
    anchors[i]!.degree++;
    anchors[j]!.degree++;
  }

  // Graph depth from the entry; the deepest chamber is the boss.
  {
    const adj: number[][] = anchors.map(() => []);
    for (const [i, j] of edges) {
      adj[i]!.push(j);
      adj[j]!.push(i);
    }
    const q = [0];
    const seen = new Set([0]);
    while (q.length > 0) {
      const i = q.shift()!;
      for (const j of adj[i]!) {
        if (!seen.has(j)) {
          seen.add(j);
          anchors[j]!.depth = anchors[i]!.depth + 1;
          q.push(j);
        }
      }
    }
  }
  let bossIdx = 1;
  for (let i = 1; i < n; i++) {
    const a = anchors[i]!;
    const b = anchors[bossIdx]!;
    if (a.depth > b.depth || (a.depth === b.depth && dist(a.x, a.y, anchors[0]!.x, anchors[0]!.y) > dist(b.x, b.y, anchors[0]!.x, anchors[0]!.y))) {
      bossIdx = i;
    }
  }
  anchors[bossIdx]!.kind = 'boss';

  // Leaves get the set-pieces: the deepest non-boss leaf is the vault
  // (uncommon and up), the next takes the theme's own point of
  // interest, and a mid-depth chamber may hold a wayfarers' camp.
  const themePoi: AnchorKind =
    spec.theme === 'crypt'
      ? 'ossuary'
      : spec.theme === 'mine'
        ? 'forge'
        : spec.theme === 'cavern'
          ? 'spring'
          : 'camp';
  const leaves = anchors
    .map((a, i) => ({ a, i }))
    .filter(({ a, i }) => i !== 0 && i !== bossIdx && a.degree === 1)
    .sort((p, q) => q.a.depth - p.a.depth);
  if (rarityIndex(spec.tier) >= 1 && leaves.length > 0) leaves[0]!.a.kind = 'vault';
  if (leaves.length > 1 && rLayout.chance(0.85)) leaves[1]!.a.kind = themePoi;
  // The big tiers earn a second set-piece leaf — more to understand
  // per run, spread across more ground.
  if (rarityIndex(spec.tier) >= 3 && leaves.length > 2) {
    leaves[2]!.a.kind = rLayout.chance(0.5) ? themePoi : 'camp';
  }
  const midRooms = anchors.filter((a) => a.kind === 'room');
  if (themePoi !== 'camp' && midRooms.length > 2 && rLayout.chance(0.55)) {
    midRooms[rLayout.int(0, midRooms.length - 1)]!.kind = 'camp';
  }

  // ---- 2. CARVE ------------------------------------------------------
  for (const a of anchors) {
    if (a.kind === 'vault' || a.kind === 'forge') {
      a.style = 'hall';
      continue; // sealed prefabs carve themselves
    }
    a.style = rCarve.chance(theme.caveness) ? 'cave' : 'hall';
    if (a.kind === 'entry') {
      // The landing breathes: a generous chamber, always.
      carveBlob(c, a.x, a.y, 8, rCarve, a.style === 'hall' ? Tile.DungeonFloor : Tile.CaveFloor);
      a.r = 8;
    } else if (a.style === 'cave') {
      a.r = rCarve.int(7, 11) + (rarityIndex(spec.tier) >= 2 ? 1 : 0);
      carveBlob(c, a.x, a.y, a.r, rCarve, Tile.CaveFloor);
    } else {
      const { w, h } = carveHall(c, a.x, a.y, rCarve);
      a.r = Math.min(w, h) >> 1;
    }
  }

  const corridorPath: Array<{ x: number; y: number }> = [];
  for (const [i, j] of edges) {
    const a = anchors[i]!;
    const b = anchors[j]!;
    if (a.style === 'hall' && b.style === 'hall') {
      tunnelBuilt(c, a, b, rCarve, corridorPath);
    } else {
      tunnelCave(c, a, b, rCarve, corridorPath);
    }
  }

  // Set-pieces stamp AFTER corridors: their walls respect carved floor,
  // so the approach becomes the doorway.
  for (const a of anchors) {
    switch (a.kind) {
      case 'boss': {
        const pf = a.style === 'hall' ? ARENA_HALL : ARENA_CAVE;
        stampPrefab(c, pf, a.x, a.y, a.style === 'hall' ? Tile.DungeonFloor : Tile.CaveFloor);
        a.r = 7;
        break;
      }
      case 'vault':
        stampPrefab(c, VAULT, a.x, a.y, Tile.DungeonFloor, { sealed: true });
        a.r = 4;
        break;
      case 'forge':
        stampPrefab(c, FORGE, a.x, a.y, Tile.DungeonFloor, { sealed: true });
        a.r = 4;
        break;
      case 'camp':
        stampPrefab(c, CAMP, a.x, a.y, a.style === 'hall' ? Tile.DungeonFloor : Tile.CaveFloor);
        break;
      case 'spring':
        stampPrefab(c, SPRING, a.x, a.y, Tile.CaveFloor);
        break;
      case 'ossuary':
        stampPrefab(c, OSSUARY, a.x, a.y, Tile.DungeonFloor);
        break;
      default:
        break;
    }
  }

  // Repair: every anchor must be walkable from the entry. A sealed
  // stamp or an unlucky cave pinch gets a direct tunnel cut through.
  const entryA = anchors[0]!;
  for (let attempt = 0; attempt < n + 2; attempt++) {
    const seen = reachMask(c, entryA.x, entryA.y);
    const missing = anchors.find((a) => !reached(seen, S, a.x, a.y));
    if (!missing) break;
    // Tunnel from the nearest reached floor tile.
    let bx = entryA.x;
    let by = entryA.y;
    let bd = Infinity;
    for (let y = 2; y < S - 2; y++) {
      for (let x = 2; x < S - 2; x++) {
        if (!seen[y * S + x]) continue;
        const d = dist(x, y, missing.x, missing.y);
        if (d < bd) {
          bd = d;
          bx = x;
          by = y;
        }
      }
    }
    tunnelCave(c, { x: bx, y: by }, missing, rCarve, corridorPath);
  }

  // ---- 3. SECRETS: hidden rooms behind cracked walls -----------------
  const hiddenCount =
    1 +
    (rarityIndex(spec.tier) >= 1 ? 1 : 0) +
    (rarityIndex(spec.tier) >= 3 ? 1 : 0) +
    (spec.tier === 'legendary' ? 1 : 0);
  const hiddenRooms: Array<{ x: number; y: number }> = [];
  for (let hi = 0; hi < hiddenCount; hi++) {
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const host = anchors[rSecret.int(1, n - 1)]!;
      const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][rSecret.int(0, 3)]!;
      // Walk from the host centre to its wall, then probe for thick rock.
      let x = host.x;
      let y = host.y;
      let steps = 0;
      while (!c.isRock(x, y) && steps++ < 14) {
        x += dir[0]!;
        y += dir[1]!;
      }
      if (!c.isRock(x, y) || !c.passable(x - dir[0]!, y - dir[1]!)) continue;
      const depth = rSecret.int(3, 5);
      const rx = x + dir[0]! * depth;
      const ry = y + dir[1]! * depth;
      const rr = rSecret.int(3, 4);
      if (rx < M || ry < M || rx >= S - M || ry >= S - M) continue;
      let allRock = true;
      for (let i = 0; i <= depth; i++) {
        if (!c.isRock(x + dir[0]! * i, y + dir[1]! * i)) {
          allRock = false;
          break;
        }
      }
      if (!allRock) continue;
      carveBlob(c, rx, ry, rr, rSecret, Tile.CaveFloor);
      // The passage: one tile wide, sealed by the cracked wall.
      for (let i = 1; i <= depth; i++) c.carve(x + dir[0]! * i, y + dir[1]! * i, Tile.CaveFloor);
      c.set(x, y, Tile.CrackedCaveWall);
      // The prize: a gilded chest lit by shrooms, ore beside it.
      c.set(rx, ry, Tile.ChestGilded);
      hiddenRooms.push({ x: rx, y: ry });
      placed = true;
    }
  }

  // ---- 4. DRESS ------------------------------------------------------
  // Placement truth: everything dressing adds must stand on ground the
  // player can actually reach — the open mask for the main dungeon,
  // the secret mask (cracks counted open) for hidden rooms. Carving
  // leaves orthogonally-severed nooks by nature (cave blobs kiss on
  // diagonals); nothing of value may land in one.
  const openMask = reachMask(c, entryA.x, entryA.y, false);
  const secretMask = reachMask(c, entryA.x, entryA.y, true);

  // Masonry ring: rock that faces flagstones is worked stone; rock
  // that faces raw cave stays raw. The dialect boundary draws itself.
  {
    const flag = new Uint8Array(S * S);
    for (let y = 1; y < S - 1; y++) {
      for (let x = 1; x < S - 1; x++) {
        if (c.get(x, y) !== Tile.CaveWall) continue;
        let masonry = false;
        let raw = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const t = c.get(x + dx, y + dy);
            if (t === Tile.DungeonFloor) masonry = true;
            else if (t === Tile.CaveFloor || t === Tile.CaveRubble || t === Tile.WaterShallow) raw = true;
          }
        }
        if (masonry && !raw) flag[y * S + x] = 1;
      }
    }
    for (let i = 0; i < flag.length; i++) {
      if (flag[i]) c.ground[i] = Tile.WallStone;
    }
  }

  // Water pools in cave chambers (never the entry, never the boss).
  if (rDress.chance(theme.water)) {
    const wet = anchors.filter((a) => a.kind === 'room' && a.style === 'cave');
    for (let i = 0; i < Math.min(2, wet.length); i++) {
      const a = wet[rDress.int(0, wet.length - 1)]!;
      const pr = Math.max(2, a.r - 3);
      for (let dy = -pr; dy <= pr; dy++) {
        for (let dx = -pr; dx <= pr; dx++) {
          const d = Math.hypot(dx, dy) / pr;
          if (d <= 1 && rDress.chance(1.15 - d) && c.get(a.x + dx, a.y + dy) === Tile.CaveFloor) {
            c.set(a.x + dx, a.y + dy, Tile.WaterShallow);
          }
        }
      }
    }
  }

  // The ore ladder: wall-hugging veins, richer with depth and power.
  const maxDepth = Math.max(1, ...anchors.map((a) => a.depth));
  const allowedOres = ORE_LADDER.filter((o) => o.req <= spec.power + 18);
  const oreSpots: Array<{ x: number; y: number }> = [];
  /**
   * Everything dressing places over floor — ore veins and props alike
   * — is recorded here so the repair sweep can pull any piece that
   * turns out to pinch a passage. Local heuristics filter the obvious
   * cases; the BFS sweep is the guarantee.
   */
  const removables: Array<{ x: number; y: number; was: Tile }> = [];
  /**
   * A vein needs a wall at its back, three open orthogonal neighbors
   * (so it can never plug a tunnel), and clean orthogonals — no ore
   * pair pinches, no ore squatting on a chest's face.
   */
  const canOre = (x: number, y: number, mask: Uint8Array = openMask): boolean => {
    if (!mask[y * S + x]) return false;
    const t = c.get(x, y);
    if (t !== Tile.CaveFloor && t !== Tile.DungeonFloor && t !== Tile.CaveRubble) return false;
    let wallAdj = false;
    let open = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nt = c.get(x + dx, y + dy);
      if (c.isRock(x + dx, y + dy)) wallAdj = true;
      if (c.passable(x + dx, y + dy)) open++;
      if (ORE_LADDER.some((o) => o.tile === nt) || CHEST_TILE_SET.has(nt)) return false;
    }
    return wallAdj && open >= 3;
  };
  for (const a of anchors) {
    if (a.kind === 'entry') continue;
    const veins = rDress.int(1, 3) + (a.depth >= maxDepth - 1 ? 1 : 0);
    for (let v = 0; v < veins; v++) {
      for (let attempt = 0; attempt < 14; attempt++) {
        const x = a.x + rDress.int(-a.r - 2, a.r + 2);
        const y = a.y + rDress.int(-a.r - 2, a.r + 2);
        if (!canOre(x, y)) continue;
        // Depth bias: the deepest chambers draw from the top of the
        // allowed ladder, shallow ones from the bottom.
        const frac = a.depth / maxDepth;
        const hi = Math.max(1, Math.round(allowedOres.length * (0.4 + frac * 0.6)));
        const pick = allowedOres[rDress.int(Math.max(0, hi - 3), hi - 1)]!;
        removables.push({ x, y, was: c.get(x, y) });
        c.set(x, y, pick.tile);
        oreSpots.push({ x, y });
        break;
      }
    }
  }
  // Ore quota: a dungeon short on veins after the room pass sweeps
  // the whole map for wall-hugging spots — mining is a promise the
  // key card makes, so every dungeon keeps it.
  if (oreSpots.length < 4 && allowedOres.length > 0) {
    outer: for (let y = 3; y < S - 3; y++) {
      for (let x = 3; x < S - 3; x++) {
        if (!canOre(x, y) || !rDress.chance(0.3)) continue;
        const pick = allowedOres[rDress.int(0, allowedOres.length - 1)]!;
        removables.push({ x, y, was: c.get(x, y) });
        c.set(x, y, pick.tile);
        oreSpots.push({ x, y });
        if (oreSpots.length >= 5) break outer;
      }
    }
  }

  // Hidden rooms carry a rich double vein.
  for (const h of hiddenRooms) {
    for (let v = 0; v < 2 && allowedOres.length > 0; v++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const x = h.x + rDress.int(-3, 3);
        const y = h.y + rDress.int(-3, 3);
        if (!canOre(x, y, secretMask)) continue;
        removables.push({ x, y, was: c.get(x, y) });
        c.set(x, y, allowedOres[allowedOres.length - 1 - Math.min(v, allowedOres.length - 1)]!.tile);
        break;
      }
    }
  }

  // The path-chest ladder, deepest rooms first.
  const chestRooms = anchors
    .filter((a) => a.kind === 'room')
    .sort((p, q) => q.depth - p.depth);
  const pathChests = PATH_CHESTS[spec.tier] ?? PATH_CHESTS.common!;
  const placedChests: Array<{ x: number; y: number }> = [];
  /**
   * Cells along a room's north wall — floor with rock straight above,
   * so the chest (or brazier) stands against the wall and shows its
   * face to the camera. Scanned, not sampled: a room either has such
   * cells or it doesn't, and if it does we always find one.
   */
  const northWallCells = (a: Anchor): Array<{ x: number; y: number }> => {
    const out: Array<{ x: number; y: number }> = [];
    const reach = a.r + 3;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = a.x + dx;
        const y = a.y + dy;
        if (!openMask[y * S + x]) continue;
        const t = c.get(x, y);
        if (t !== Tile.CaveFloor && t !== Tile.DungeonFloor && t !== Tile.CaveRubble) continue;
        if (!c.isRock(x, y - 1)) continue;
        if (!c.passable(x, y + 1)) continue; // openable from the south
        out.push({ x, y });
      }
    }
    return out;
  };
  for (let i = 0; i < pathChests.length && i < chestRooms.length; i++) {
    const room = chestRooms[i]!;
    const cells = northWallCells(room);
    if (cells.length === 0) continue;
    const spot = cells[rDress.int(0, cells.length - 1)]!;
    c.set(spot.x, spot.y, pathChests[pathChests.length - 1 - i]!);
    placedChests.push(spot);
  }

  // Props: the room learns its furniture. Solid props keep three open
  // orthogonal neighbors and never crowd each other — and a repair
  // pass below guarantees they never wall off a prize.
  const canProp = (x: number, y: number, mask: Uint8Array = openMask): boolean => {
    if (!mask[y * S + x]) return false;
    const t = c.get(x, y);
    if (t !== Tile.CaveFloor && t !== Tile.DungeonFloor && t !== Tile.CaveRubble) return false;
    let open = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (c.passable(x + dx, y + dy)) open++;
    }
    if (open < 3) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nt = c.get(x + dx, y + dy);
        if (
          nt === Tile.Stalagmite ||
          nt === Tile.Brazier ||
          nt === Tile.GlowShroom ||
          nt === Tile.BonePile ||
          nt === Tile.Barrel ||
          nt === Tile.Crate
        ) {
          return false;
        }
      }
    }
    return true;
  };
  const putProp = (x: number, y: number, t: Tile, mask?: Uint8Array): boolean => {
    if (!canProp(x, y, mask)) return false;
    removables.push({ x, y, was: c.get(x, y) });
    c.set(x, y, t);
    return true;
  };
  for (const a of anchors) {
    if (a.kind === 'entry') continue; // the landing stays clear
    const area = Math.PI * a.r * a.r;
    if (a.style === 'cave') {
      const stals = Math.round(area / 42);
      for (let i = 0; i < stals; i++) {
        putProp(a.x + rDress.int(-a.r, a.r), a.y + rDress.int(-a.r, a.r), Tile.Stalagmite);
      }
      const shrooms = Math.round(area / 36);
      for (let i = 0; i < shrooms; i++) {
        const x = a.x + rDress.int(-a.r, a.r);
        const y = a.y + rDress.int(-a.r, a.r);
        // Shrooms hug the walls — that's where the light belongs.
        let wallAdj = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (c.isRock(x + dx, y + dy)) wallAdj = true;
        }
        if (wallAdj) putProp(x, y, Tile.GlowShroom);
      }
    } else {
      // Braziers at the hall's shoulders — light every worked room.
      const spots = northWallCells(a).filter((p) => c.get(p.x, p.y) === Tile.DungeonFloor);
      for (let placedB = 0; placedB < 2 && spots.length > 0; placedB++) {
        const spot = spots.splice(rDress.int(0, spots.length - 1), 1)[0]!;
        putProp(spot.x, spot.y, Tile.Brazier);
      }
      if (spec.theme === 'crypt' || spec.theme === 'stronghold') {
        for (let i = rDress.int(0, 2); i > 0; i--) {
          putProp(a.x + rDress.int(-a.r, a.r), a.y + rDress.int(-a.r, a.r), Tile.BonePile);
        }
      }
      if (spec.theme === 'mine' || spec.theme === 'stronghold') {
        for (let i = rDress.int(0, 2); i > 0; i--) {
          putProp(
            a.x + rDress.int(-a.r, a.r),
            a.y + rDress.int(-a.r, a.r),
            rDress.chance(0.5) ? Tile.Crate : Tile.Barrel,
          );
        }
      }
    }
    // Rubble breaks up any big floor.
    for (let i = Math.round(area / 30); i > 0; i--) {
      const x = a.x + rDress.int(-a.r, a.r);
      const y = a.y + rDress.int(-a.r, a.r);
      if (c.get(x, y) === Tile.CaveFloor) c.set(x, y, Tile.CaveRubble);
    }
    // Glowshrooms light hidden pockets too.
  }
  for (const h of hiddenRooms) {
    for (let i = 0; i < 2; i++) {
      putProp(h.x + rSecret.int(-2, 2), h.y + rSecret.int(-2, 2), Tile.GlowShroom, secretMask);
    }
  }

  // CORRIDOR LIGHTS: seeing the fight matters most in the halls
  // between rooms — every ~7-11 path tiles, one light goes up against
  // the corridor wall: a brazier where the floor is worked flagstone,
  // glowshrooms where the rock is raw. putProp's guards keep them out
  // of the walkway (wall-hugging, three open neighbors), and the
  // repair sweep keeps them honest like every other placed piece.
  {
    let next = 5 + rDress.int(0, 3);
    for (let i = 0; i < corridorPath.length; i++) {
      if (i < next) continue;
      const pc = corridorPath[i]!;
      let placed = false;
      for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0], [0, 0]] as const) {
        const x = pc.x + dx;
        const y = pc.y + dy;
        let wallAdj = false;
        for (const [wx, wy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (c.isRock(x + wx, y + wy)) wallAdj = true;
        }
        if (!wallAdj) continue;
        const t = c.get(x, y) === Tile.DungeonFloor ? Tile.Brazier : Tile.GlowShroom;
        if (putProp(x, y, t)) {
          placed = true;
          break;
        }
      }
      next = i + (placed ? 7 + rDress.int(0, 4) : 2);
    }
  }

  // Prop repair: nothing placed may cut a prize off the entry. Two
  // sweeps: the open dungeon (cracks shut) must reach every anchor,
  // chest, and vein; and with cracks counted open, the hidden prizes
  // must be reachable too.
  for (const cracksOpen of [false, true]) {
    const targets: Array<{ x: number; y: number }> = [
      ...anchors.map((a) => ({ x: a.x, y: a.y })),
      ...placedChests,
      ...oreSpots,
      ...(cracksOpen ? hiddenRooms : []),
    ];
    for (let attempt = 0; attempt < removables.length + 1; attempt++) {
      const seen = reachMask(c, entryA.x, entryA.y, cracksOpen);
      const missing = targets.find((t) => !reached(seen, S, t.x, t.y));
      if (!missing) break;
      // Pull the placed piece nearest the stranded target.
      let worst = -1;
      let wd = Infinity;
      for (let i = 0; i < removables.length; i++) {
        const p = removables[i]!;
        if (p.was === (Tile.Void as Tile)) continue; // already pulled
        const d = dist(p.x, p.y, missing.x, missing.y);
        if (d < wd) {
          wd = d;
          worst = i;
        }
      }
      if (worst < 0) break;
      const p = removables[worst]!;
      c.set(p.x, p.y, p.was);
      p.was = Tile.Void as Tile;
    }
  }

  // ---- 5. GARRISON ---------------------------------------------------
  const spawns: ZoneSpawn[] = [];
  const lvl = (bump = 0) => Math.max(1, Math.min(99, spec.power + bump));
  const pickPack = (): string => {
    let total = 0;
    for (const p of roster.packs) total += p.w;
    let draw = rMobs.next() * total;
    for (const p of roster.packs) {
      draw -= p.w;
      if (draw < 0) return p.npc;
    }
    return roster.packs[0]!.npc;
  };
  for (const a of anchors) {
    // The entry is safe ground, the boss room has its own garrison,
    // and the sealed vault/forge stay quiet — the reward IS the calm.
    if (a.kind === 'entry' || a.kind === 'boss' || a.kind === 'vault' || a.kind === 'forge') {
      continue;
    }
    const area = Math.PI * a.r * a.r;
    const packs = Math.max(1, Math.min(4, Math.round(area / 90)));
    for (let p = 0; p < packs; p++) {
      spawns.push({
        npc: pickPack(),
        x: origin.x + a.x + rMobs.int(-2, 2),
        y: origin.y + a.y + rMobs.int(-2, 2),
        radius: Math.max(2, a.r - 2),
        count: rMobs.int(1, 2) + (rarityIndex(spec.tier) >= 3 ? 1 : 0),
        level: lvl(rMobs.int(-2, 2)),
      });
    }
  }
  // Corridor sentries: a straggler between rooms keeps the halls alive.
  for (const [i, j] of edges) {
    if (!rMobs.chance(0.4)) continue;
    const a = anchors[i]!;
    const b = anchors[j]!;
    spawns.push({
      npc: pickPack(),
      x: origin.x + ((a.x + b.x) >> 1),
      y: origin.y + ((a.y + b.y) >> 1),
      radius: 3,
      count: 1,
      level: lvl(rMobs.int(-2, 0)),
    });
  }
  // The boss and his honor guard.
  const boss = anchors[bossIdx]!;
  spawns.push({
    npc: roster.boss.npc,
    name: roster.boss.name,
    x: origin.x + boss.x,
    y: origin.y + boss.y,
    radius: 1,
    count: 1,
    level: lvl(5),
  });
  spawns.push({
    npc: roster.elite,
    x: origin.x + boss.x,
    y: origin.y + boss.y + 2,
    radius: 3,
    count: 2,
    level: lvl(1),
  });
  // Hidden wardens guard the cracked-wall prizes.
  for (const h of hiddenRooms) {
    spawns.push({
      npc: roster.elite,
      name: roster.warden,
      x: origin.x + h.x,
      y: origin.y + h.y + 1,
      radius: 2,
      count: 1,
      level: lvl(3),
    });
  }

  // ---- exit portal + zone -------------------------------------------
  c.set(entryA.x, entryA.y, Tile.PortalUp);
  // The landing apron always reads: floor under your feet.
  for (let dy = 0; dy <= 2; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      c.carve(entryA.x + dx, entryA.y + dy, Tile.CaveFloor);
    }
  }
  const portals: PortalDef[] = [
    { x: origin.x + entryA.x, y: origin.y + entryA.y, dest: returnTo },
  ];

  const zone: ZoneDef = {
    id: `dungeon-${slot}-${spec.sigil}-${spec.seed}`,
    name: spec.name,
    origin,
    width: S,
    height: S,
    ground: c.ground,
    detail: c.detail,
    portals,
    spawns,
  };

  return {
    zone,
    entry: { x: origin.x + entryA.x + 0.5, y: origin.y + entryA.y + 1.6 },
    spec,
  };
}
