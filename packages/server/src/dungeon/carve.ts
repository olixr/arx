import { Rng, Tile, rarityIndex, type Vec2 } from '@arx/shared';
import {
  ARENA_CAVERN,
  ARENA_CRYPT,
  ARENA_HEARTWOOD,
  ARENA_MINE,
  ARENA_STRONGHOLD,
  ARENA_WARREN,
  CAMPS,
  DENS,
  FORGES,
  OSSUARIES,
  SPRINGS,
  VAULTS,
  WARCAMPS,
  mirrorPrefab,
  PREFAB_TILES,
  type Prefab,
} from './prefabs.js';
import { dist, reachMask, reached, type Carver, type DungeonBuild, type Room } from './types.js';

/**
 * CARVE — the hybrid's three layers, in the order the mandate names
 * them: STRUCTURE first (rooms-and-corridors: the plan's graph becomes
 * halls and ways), ORGANICS second (cellular-automata cave growth
 * blends the worked and the wild per the theme's caveness), AUTHORED
 * content last (prefab stamps claim their set-piece ground, walls
 * yielding to any corridor that already broke through).
 */

// ------------------------------------------------------------- organic

export function carveBlob(c: Carver, cx: number, cy: number, r: number, rng: Rng, floor: Tile): void {
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

/** Two fused blobs — a chamber with a waist, twice the wander. */
function carveTwinLobe(c: Carver, cx: number, cy: number, r: number, rng: Rng, floor: Tile): void {
  carveBlob(c, cx, cy, r, rng, floor);
  const r2 = Math.max(5, r - rng.int(2, 4));
  const ang = rng.range(0, Math.PI * 2);
  const d = Math.round((r + r2) * 0.6);
  carveBlob(c, cx + Math.round(Math.cos(ang) * d), cy + Math.round(Math.sin(ang) * d), r2, rng, floor);
}

// -------------------------------------------------------------- worked

function carveHallRect(c: Carver, cx: number, cy: number, w: number, h: number): void {
  const x0 = cx - (w >> 1);
  const y0 = cy - (h >> 1);
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) c.carve(x, y, Tile.DungeonFloor);
  }
}

/** A worked hall — SPACIOUS by law — with an alcove or two. */
function carveHall(c: Carver, cx: number, cy: number, rng: Rng): { w: number; h: number } {
  const w = rng.int(12, 20);
  const h = rng.int(10, 16);
  carveHallRect(c, cx, cy, w, h);
  const x0 = cx - (w >> 1);
  const alcoves = rng.chance(0.6) ? rng.int(1, 2) : 0;
  for (let i = 0; i < alcoves; i++) {
    const ax = rng.chance(0.5) ? x0 - 2 : x0 + w;
    const ay = cy + rng.int(-3, 3);
    for (let y = ay - 1; y <= ay + 1; y++) {
      for (let x = Math.min(ax, ax + 1); x <= Math.max(ax, ax + 1); x++) {
        c.carve(x, y, Tile.DungeonFloor);
      }
    }
  }
  return { w, h };
}

/** A colonnade hall: the pillar grid holds the roof and the read. */
function carvePillared(c: Carver, cx: number, cy: number, rng: Rng): { w: number; h: number } {
  const w = rng.int(14, 20);
  const h = rng.int(12, 16);
  carveHallRect(c, cx, cy, w, h);
  const x0 = cx - (w >> 1);
  const y0 = cy - (h >> 1);
  // Pillars every 4th tile, inset 3 — wide aisles, never a maze.
  for (let y = y0 + 3; y <= y0 + h - 4; y += 4) {
    for (let x = x0 + 3; x <= x0 + w - 4; x += 4) {
      // The center lane stays clear: the room must host a fight.
      if (Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) continue;
      if (c.get(x, y) === Tile.DungeonFloor) c.set(x, y, Tile.PillarStone);
    }
  }
  return { w, h };
}

/** A round masonry chamber, pillar-ringed when it has the girth. */
function carveRotunda(c: Carver, cx: number, cy: number, rng: Rng): number {
  const r = rng.int(8, 11);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) c.carve(cx + dx, cy + dy, Tile.DungeonFloor);
    }
  }
  if (r >= 9) {
    const pr = r - 3;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2 + 0.39;
      const x = cx + Math.round(Math.cos(ang) * pr);
      const y = cy + Math.round(Math.sin(ang) * pr);
      if (c.get(x, y) === Tile.DungeonFloor) c.set(x, y, Tile.PillarStone);
    }
  }
  return r;
}

/**
 * A long gallery, laid along the road: the spine's own architecture.
 * Orientation follows the way to the next rung, so the room IS the
 * corridor grown grand.
 */
function carveGallery(
  c: Carver,
  cx: number,
  cy: number,
  rng: Rng,
  toward: Vec2 | null,
): { w: number; h: number } {
  const long = rng.int(18, 24);
  const short = rng.int(8, 10);
  const horiz = toward ? Math.abs(toward.x - cx) >= Math.abs(toward.y - cy) : rng.chance(0.5);
  const w = horiz ? long : short;
  const h = horiz ? short : long;
  carveHallRect(c, cx, cy, w, h);
  return { w, h };
}

// ------------------------------------------------------------ corridors

/**
 * A drunk tunnel: momentum + jitter, disc brush — reads as grown.
 * WIDTH IS READABILITY: the 2.5D camera hides thin passages behind
 * their own south walls, so the brush stays generous (~4 tiles,
 * bulging wider) — a corridor you can fight in, not a crack you
 * squeeze through. A long way may bulge into a junction grotto at its
 * waist. Carved centers are recorded so dressing can light the way.
 */
export function tunnelCave(
  c: Carver,
  a: Vec2,
  b: Vec2,
  rng: Rng,
  path?: Array<{ x: number; y: number }>,
): void {
  let x = a.x;
  let y = a.y;
  let guard = c.s * 6;
  const total = dist(a.x, a.y, b.x, b.y);
  const bulge = total > 30 && rng.chance(0.3);
  let bulged = false;
  while (dist(x, y, b.x, b.y) > 1.2 && guard-- > 0) {
    const ang = Math.atan2(b.y - y, b.x - x) + rng.range(-0.9, 0.9);
    x += Math.cos(ang);
    y += Math.sin(ang);
    const r = rng.chance(0.3) ? 3.0 : 2.2;
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          c.carve(Math.round(x) + dx, Math.round(y) + dy, Tile.CaveFloor);
        }
      }
    }
    path?.push({ x: Math.round(x), y: Math.round(y) });
    if (bulge && !bulged && dist(x, y, b.x, b.y) < total * 0.55) {
      bulged = true;
      carveBlob(c, Math.round(x), Math.round(y), rng.int(4, 5), rng, Tile.CaveFloor);
    }
  }
}

/** A worked corridor: straight L, even width 4 (two-fifths of the time 5). */
export function tunnelBuilt(
  c: Carver,
  a: Vec2,
  b: Vec2,
  rng: Rng,
  path?: Array<{ x: number; y: number }>,
): void {
  const width = rng.chance(0.4) ? 5 : 4;
  const lo = -((width - 1) >> 1);
  const hi = width >> 1;
  const horizFirst = rng.chance(0.5);
  // Legs walk in TRAVEL ORDER (a → corner → b) so the recorded path
  // is one contiguous line — patrol rounds sample it and their hop
  // law needs neighbors to actually neighbor.
  const carveLeg = (x0: number, y0: number, x1: number, y1: number) => {
    const sx = Math.sign(x1 - x0);
    const sy = Math.sign(y1 - y0);
    const horiz = y0 === y1;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let o = lo; o <= hi; o++) {
        if (horiz) c.carve(x, y + o, Tile.DungeonFloor);
        else c.carve(x + o, y, Tile.DungeonFloor);
      }
      path?.push({ x, y });
      if (x === x1 && y === y1) break;
      x += sx;
      y += sy;
    }
  };
  if (horizFirst) {
    carveLeg(a.x, a.y, b.x, a.y);
    carveLeg(b.x, a.y, b.x, b.y);
  } else {
    carveLeg(a.x, a.y, a.x, b.y);
    carveLeg(a.x, b.y, b.x, b.y);
  }
}

// ------------------------------------------------------------- stamping

interface StampResult {
  breaches: Array<{ x: number; y: number }>;
}

export function stampPrefab(
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

/** Seed-pick a variant from a pool, coin-flip mirrored. */
function pickVariant(pool: Prefab[], rng: Rng): Prefab {
  const pf = pool[rng.int(0, pool.length - 1)]!;
  return rng.chance(0.5) ? mirrorPrefab(pf) : pf;
}

const ARENAS: Record<string, Prefab> = {
  cavern: ARENA_CAVERN,
  crypt: ARENA_CRYPT,
  mine: ARENA_MINE,
  stronghold: ARENA_STRONGHOLD,
  warren: ARENA_WARREN,
  heartwood: ARENA_HEARTWOOD,
};

// ------------------------------------------------------------ the pass

/** The next spine rung after this room, if it is a rung (for galleries). */
function nextRungOf(b: DungeonBuild, idx: number): Room | null {
  const si = b.spine.indexOf(idx);
  if (si === -1 || si + 1 >= b.spine.length) return null;
  return b.rooms[b.spine[si + 1]!]!;
}

export function carveAll(b: DungeonBuild): void {
  const { c, rCarve: rng } = b;
  const S = b.spec.size;

  // ---- rooms ---------------------------------------------------------
  for (const [i, a] of b.rooms.entries()) {
    if (a.kind === 'vault' || a.kind === 'forge') {
      a.style = 'hall';
      a.arch = 'hall';
      continue; // sealed prefabs carve themselves
    }
    if (a.kind === 'boss') {
      // The court's carve IS its arena stamp (after corridors).
      a.style = b.theme.caveness >= 0.6 ? 'cave' : 'hall';
      a.arch = a.style === 'cave' ? 'blob' : 'hall';
      a.r = 9;
      continue;
    }
    a.style = rng.chance(b.theme.caveness) ? 'cave' : 'hall';
    if (a.kind === 'entry') {
      // The landing breathes: a generous chamber, always.
      a.arch = 'blob';
      carveBlob(c, a.x, a.y, 9, rng, a.style === 'hall' ? Tile.DungeonFloor : Tile.CaveFloor);
      a.r = 9;
      continue;
    }
    if (a.style === 'cave') {
      a.arch = rng.chance(0.3) ? 'twinlobe' : 'blob';
      a.r = rng.int(8, 12) + (rarityIndex(b.spec.tier) >= 2 ? 1 : 0);
      if (a.arch === 'twinlobe') carveTwinLobe(c, a.x, a.y, a.r, rng, Tile.CaveFloor);
      else carveBlob(c, a.x, a.y, a.r, rng, Tile.CaveFloor);
    } else {
      const roll = rng.next();
      if (a.onSpine && roll < 0.3) {
        a.arch = 'gallery';
        const { w, h } = carveGallery(c, a.x, a.y, rng, nextRungOf(b, i));
        a.r = Math.min(w, h) >> 1;
      } else if (roll < 0.55) {
        a.arch = 'pillared';
        const { w, h } = carvePillared(c, a.x, a.y, rng);
        a.r = Math.min(w, h) >> 1;
      } else if (roll < 0.7) {
        a.arch = 'rotunda';
        a.r = carveRotunda(c, a.x, a.y, rng);
      } else {
        a.arch = 'hall';
        const { w, h } = carveHall(c, a.x, a.y, rng);
        a.r = Math.min(w, h) >> 1;
      }
    }
  }

  // ---- corridors -----------------------------------------------------
  b.corridorPaths = [];
  for (const e of b.edges) {
    const a = b.rooms[e.a]!;
    const d = b.rooms[e.b]!;
    const path: Array<{ x: number; y: number }> = [];
    if (a.style === 'hall' && d.style === 'hall') {
      tunnelBuilt(c, a, d, rng, path);
    } else {
      tunnelCave(c, a, d, rng, path);
    }
    b.corridorPaths.push(path);
  }

  // ---- THE MORTAR PASS -----------------------------------------------
  // Organic carving leaves 1-wide squeezes by nature (twin-lobe
  // waists, blob noise, kissing rooms). Before any authored stamp
  // claims ground, every floor cell pinched wall-to-wall on an axis
  // gets a flank carved open — WIDTH IS READABILITY, enforced in
  // mortar, not hope. Runs pre-stamp/pre-secret so it can never
  // breach a sealed ring or a hidden tunnel (those are narrow BY
  // DESIGN and arrive later).
  for (let pass = 0; pass < 2; pass++) {
    let healed = 0;
    for (let y = 3; y < S - 3; y++) {
      for (let x = 3; x < S - 3; x++) {
        const t = c.get(x, y);
        if (t !== Tile.CaveFloor && t !== Tile.DungeonFloor && t !== Tile.CaveRubble) continue;
        const vert = c.isRock(x, y - 1) && c.isRock(x, y + 1);
        const horiz = c.isRock(x - 1, y) && c.isRock(x + 1, y);
        if (!vert && !horiz) continue;
        const floorT = t === Tile.DungeonFloor ? Tile.DungeonFloor : Tile.CaveFloor;
        if (vert) c.carve(x, y - 1, floorT);
        else c.carve(x - 1, y, floorT);
        healed++;
      }
    }
    if (healed === 0) break;
  }

  // ---- authored set-pieces (stamp AFTER corridors: the approach
  // becomes the doorway) ----------------------------------------------
  for (const a of b.rooms) {
    switch (a.kind) {
      case 'boss': {
        const arena = ARENAS[b.spec.theme]!;
        stampPrefab(
          c,
          rng.chance(0.5) ? mirrorPrefab(arena) : arena,
          a.x,
          a.y,
          a.style === 'hall' ? Tile.DungeonFloor : Tile.CaveFloor,
        );
        a.r = 9;
        break;
      }
      case 'vault':
        stampPrefab(c, pickVariant(VAULTS, rng), a.x, a.y, Tile.DungeonFloor, { sealed: true });
        a.r = 4;
        break;
      case 'forge':
        stampPrefab(c, pickVariant(FORGES, rng), a.x, a.y, Tile.DungeonFloor, { sealed: true });
        a.r = 4;
        break;
      case 'camp': {
        const pool =
          b.spec.theme === 'stronghold' || b.spec.theme === 'warren' ? WARCAMPS : CAMPS;
        stampPrefab(c, pickVariant(pool, rng), a.x, a.y, a.style === 'hall' ? Tile.DungeonFloor : Tile.CaveFloor);
        break;
      }
      case 'spring':
        stampPrefab(c, pickVariant(SPRINGS, rng), a.x, a.y, Tile.CaveFloor);
        break;
      case 'ossuary':
        stampPrefab(c, pickVariant(OSSUARIES, rng), a.x, a.y, Tile.DungeonFloor);
        break;
      case 'den':
        stampPrefab(c, pickVariant(DENS, rng), a.x, a.y, Tile.CaveFloor);
        break;
      default:
        break;
    }
  }

  // ---- repair: every room must be walkable from the entry ------------
  const entry = b.rooms[0]!;
  for (let attempt = 0; attempt < b.rooms.length + 2; attempt++) {
    const seen = reachMask(c, entry.x, entry.y);
    const missing = b.rooms.find((a) => !reached(seen, S, a.x, a.y));
    if (!missing) break;
    // Tunnel from the nearest reached floor tile.
    let bx = entry.x;
    let by = entry.y;
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
    const repairPath: Array<{ x: number; y: number }> = [];
    tunnelCave(c, { x: bx, y: by }, missing, rng, repairPath);
    b.corridorPaths.push(repairPath);
  }
}

// -------------------------------------------------------------- secrets

/** Hidden rooms sealed behind one CrackedCaveWall — three blows open. */
export function carveSecrets(b: DungeonBuild): void {
  const { c, rSecret } = b;
  const S = b.spec.size;
  const M = 12;
  const n = b.rooms.length;
  const hiddenCount =
    1 +
    (rarityIndex(b.spec.tier) >= 1 ? 1 : 0) +
    (rarityIndex(b.spec.tier) >= 3 ? 1 : 0) +
    (b.spec.tier === 'legendary' ? 1 : 0);
  b.hiddenRooms = [];
  for (let hi = 0; hi < hiddenCount; hi++) {
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const host = b.rooms[rSecret.int(1, n - 1)]!;
      const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][rSecret.int(0, 3)]!;
      // Walk from the host centre to its wall, then probe for thick rock.
      let x = host.x;
      let y = host.y;
      let steps = 0;
      while (!c.isRock(x, y) && steps++ < 16) {
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
      b.hiddenRooms.push({ x: rx, y: ry });
      placed = true;
    }
  }
}
