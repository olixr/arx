/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — THE FLOODS
 * (CURATION LAW 6).
 *
 * Pure reads over a built ZoneDef (plus the scenes' registry);
 * wardthread.test asserts each returns []. The fen waist's lints
 * COPIED (themselves the Ashlamp's, themselves Dawnmead's; no shared
 * lib until the Sett is the third consumer), plus the north's own:
 *
 *  - unreachableFloor:    every authored walkable cell is reachable on
 *                         foot from the carve.
 *  - occlusionViolations: nothing tall on the two rows south of a
 *                         door, a station, a sign, a post or a forage node.
 *  - signPairViolations:  no two Signposts inside one eyeful (24 x 22).
 *  - boxOverlaps:         every declared scene box pairwise disjoint.
 *  - emberBedsOffAsh:     every EmberBed sits IN the ash (K1).
 *  - skipRing:            the border ring is all TILE_SKIP; no edge profile.
 *  - bedUntouched:        no authored cell inside ANY route's bed, by
 *                         that route's own half (trail 1.1, road 1.6).
 *  - shoulderListed:      every authored shoulder cell lies in a listed
 *                         rect that says why.
 *  - padClear (G-12):     no pinned footprint inside AUTHORED_ZONE_PAD
 *                         of the rect (hug per site row).
 *  - oneLine:             the thread has exactly two ends; every other
 *                         tile has exactly two orthogonal thread
 *                         neighbours; no diagonal-only join (owed F2).
 *  - blightUnderGloom:    BlightVeins only within one of a GloomStone or
 *                         CreepRoot, and every gloom tile carries the
 *                         bruise on its cell and its authorable sides.
 *  - stonesOutsideHaven:  every GloomStone and thread tile beyond the
 *                         fork rest's safeR (a cut inside a haven is a
 *                         deed with no ground under it, 0.2 C).
 *  - snagRing:            three DeadTree within two of each GloomStone.
 *  - loopClear:           every wolf waypoint ≥ 12 from every `at` post
 *                         and ≥ 9 from the fork rest's footprint edge.
 *  - wolfClear:           every authored cell ≥ WOLF_CLEAR from the three
 *                         tutorial wolf pins (the matriarch's ground is
 *                         sacred), and the post's centre ≥ 40.
 *  - thresholdStake:      the one RedRagStake within tol of the tier ring.
 *  - benchUnused:         no routine waypoint or spawn stop on the bench.
 */
import {
  Detail,
  TILE_DEFS,
  TILE_SKIP,
  TREE_TILES,
  Tile,
  WALL_RUN_TILES,
  doorInfo,
  stationAtTile,
} from '@arx/shared';
import {
  AUTHORED_WILD_SITES,
  AUTHORED_ZONE_PAD,
  ROAD_SHOULDER,
} from '../../geography.js';
import { POI_DEFS } from '../../pois/defs.js';
import { expandInfluence } from '../../pois/influence.js';
import { POI_PREFABS } from '../../pois/prefabs.js';
import { zoneEdgeProfileOf } from '../../zoneEdges.js';
import { zoneWaypoints } from '../lint/footprint.js';
import type { ZoneDef } from '../types.js';
import { bedAt, roadAt, type WardRegistry } from './ctx.js';
import type { Pt, Rect4 } from './pins.js';

/** Ground at a WORLD cell, or undefined outside the rect. */
const groundAt = (z: ZoneDef, x: number, y: number): number | undefined => {
  const lx = x - z.origin.x;
  const ly = y - z.origin.y;
  return lx >= 0 && ly >= 0 && lx < z.width && ly < z.height ? z.ground[ly * z.width + lx] : undefined;
};
const detailAt = (z: ZoneDef, x: number, y: number): number | undefined => {
  const lx = x - z.origin.x;
  const ly = y - z.origin.y;
  return lx >= 0 && ly >= 0 && lx < z.width && ly < z.height ? z.detail[ly * z.width + lx] : undefined;
};
const authored = (z: ZoneDef, x: number, y: number): boolean =>
  groundAt(z, x, y) !== TILE_SKIP || (detailAt(z, x, y) ?? 0) !== 0;
const inRect4 = (r: Rect4, x: number, y: number): boolean =>
  x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];

/** A cell feet may cross: the field's own ground, or an authored non-solid tile (doors pass). */
const passable = (z: ZoneDef, x: number, y: number): boolean => {
  const t = groundAt(z, x, y);
  if (t === undefined) return false;
  if (t === TILE_SKIP) return true;
  return !TILE_DEFS[t as Tile].solid || doorInfo(t) !== null;
};

/** Every authored cell of the zone, WORLD coords. */
function* authoredCells(z: ZoneDef): Generator<[number, number, number]> {
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (authored(z, x, y)) yield [x, y, z.ground[ly * z.width + lx]!];
    }
  }
}

/**
 * THE SEALED-POCKET FLOOD: every authored walkable cell must be
 * reachable from `from` (a carve cell inside the rect) on foot,
 * 4-neighbour, TILE_SKIP passing as the field's ground.
 */
export function unreachableFloor(z: ZoneDef, from: Pt): string[] {
  const seen = new Set<string>();
  const stack: Pt[] = [from];
  seen.add(`${from[0]},${from[1]}`);
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !passable(z, nx, ny)) continue;
      seen.add(key);
      stack.push([nx, ny]);
    }
  }
  const out: string[] = [];
  for (const [x, y, t] of authoredCells(z)) {
    if (t === TILE_SKIP || TILE_DEFS[t as Tile].solid) continue;
    if (!seen.has(`${x},${y}`)) out.push(`(${x},${y}) ${TILE_DEFS[t as Tile].name}`);
  }
  return out;
}

/** The tall set (Dawnmead lint's, verbatim): what paints over the row north of it. */
const TALL_PROPS: ReadonlySet<number> = new Set<number>([
  Tile.ChimneyStack,
  Tile.DeadTree,
  Tile.LegionStandard,
  Tile.LampPostDark,
  Tile.PitLamp,
  Tile.LampPost,
  Tile.MarketStall,
  Tile.GravestoneTall,
  Tile.Silo,
  Tile.AppleTreeMid,
  Tile.AppleTreeRipe,
  Tile.PlumTreeMid,
  Tile.PlumTreeRipe,
  Tile.BoneTree,
  ...TREE_TILES,
]);
const WALLS: ReadonlySet<number> = new Set<number>([
  ...WALL_RUN_TILES,
  Tile.WallWoodWindow,
  Tile.WallStoneWindow,
]);
const FORAGE: ReadonlySet<number> = new Set<number>([
  Tile.BerryBush,
  Tile.FibrePlant,
  Tile.WildSagewort,
  Tile.WildMoonbell,
]);

/**
 * THE OCCLUSION LAW: tall art paints over what stands north of it, so
 * rows y+1 and y+2 south of every door, station, sign, actor post and
 * forage node hold nothing tall (a wall counts as tall for every
 * subject but a door's own frame).
 */
export function occlusionViolations(z: ZoneDef, registry?: WardRegistry): string[] {
  const subjects: Array<{ x: number; y: number; what: string; door: boolean }> = [];
  const tallHere = new Set<string>();
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const t = z.ground[ly * z.width + lx]! as Tile;
      if ((t as number) === TILE_SKIP) continue;
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (doorInfo(t) !== null) subjects.push({ x, y, what: `door ${TILE_DEFS[t].name}`, door: true });
      if (stationAtTile(t) !== null) subjects.push({ x, y, what: `station ${TILE_DEFS[t].name}`, door: false });
      if (FORAGE.has(t)) subjects.push({ x, y, what: `forage ${TILE_DEFS[t].name}`, door: false });
      if (t === Tile.Signpost || t === Tile.HangingSign) {
        subjects.push({ x, y, what: `sign ${TILE_DEFS[t].name}`, door: false });
      }
      if (TALL_PROPS.has(t)) tallHere.add(`${x},${y}`);
    }
  }
  for (const a of z.actorSpawns ?? []) {
    subjects.push({ x: Math.floor(a.x), y: Math.floor(a.y), what: `post ${a.actor}`, door: false });
  }
  if (registry) {
    for (const [x, y] of registry.doors) subjects.push({ x, y, what: 'door (registered)', door: true });
    for (const [x, y] of registry.stations) subjects.push({ x, y, what: 'station (registered)', door: false });
    for (const [x, y] of registry.posts) subjects.push({ x, y, what: 'post (registered)', door: false });
    for (const [x, y] of registry.occluders) tallHere.add(`${x},${y}`);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of subjects) {
    for (const dy of [1, 2]) {
      const x = s.x;
      const y = s.y + dy;
      const t = groundAt(z, x, y);
      if (t === undefined || t === TILE_SKIP) continue;
      const tall = tallHere.has(`${x},${y}`) || (!s.door && WALLS.has(t));
      if (!tall) continue;
      const key = `${s.what}@${s.x},${s.y}>${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`${s.what} at (${s.x},${s.y}) has tall '${TILE_DEFS[t as Tile].name}' ${dy} south at (${x},${y})`);
    }
  }
  return out;
}

/** The 1080p eyeful at default zoom (Camera.yScale 0.6): |dx| <= 24 AND |dy| <= 22. */
export const EYEFUL_DX = 24;
export const EYEFUL_DY = 22;

/** One Signpost per eyeful: two boards never share |dx| <= EYEFUL_DX AND |dy| <= EYEFUL_DY. */
export function signPairViolations(z: ZoneDef): string[] {
  const posts: Array<{ x: number; y: number; title: string }> = [];
  for (const s of z.signs ?? []) {
    if (groundAt(z, s.x, s.y) === Tile.Signpost) posts.push({ x: s.x, y: s.y, title: s.title });
  }
  const out: string[] = [];
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const a = posts[i]!;
      const b = posts[j]!;
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx <= EYEFUL_DX && dy <= EYEFUL_DY) {
        out.push(`${a.title} (${a.x},${a.y}) and ${b.title} (${b.x},${b.y}) share an eyeful (${dx},${dy})`);
      }
    }
  }
  return out;
}

/** Every declared scene box pairwise disjoint (inclusive rects). */
export function boxOverlaps(registry: WardRegistry): string[] {
  const out: string[] = [];
  const boxes = registry.boxes;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const ox0 = Math.max(a.x0, b.x0);
      const oy0 = Math.max(a.y0, b.y0);
      const ox1 = Math.min(a.x1, b.x1);
      const oy1 = Math.min(a.y1, b.y1);
      if (ox0 <= ox1 && oy0 <= oy1) {
        out.push(`${a.owner} (${a.x0},${a.y0})-(${a.x1},${a.y1}) overlaps ${b.owner} (${b.x0},${b.y0})-(${b.x1},${b.y1}) at (${ox0},${oy0})-(${ox1},${oy1})`);
      }
    }
  }
  return out;
}

/** K1: every EmberBed sits IN its ash — none on its own cell, at least two cardinal neighbours carrying it. */
export function emberBedsOffAsh(z: ZoneDef): string[] {
  const out: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    if (z.ground[i] !== Tile.EmberBed) continue;
    const lx = i % z.width;
    const ly = Math.floor(i / z.width);
    const wx = z.origin.x + lx;
    const wy = z.origin.y + ly;
    if (z.detail[i] === Detail.Ash) out.push(`EmberBed at (${wx},${wy}) carries ash on its own cell (the pan must read against it)`);
    let ringAsh = 0;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const nx = lx + dx;
      const ny = ly + dy;
      if (nx < 0 || ny < 0 || nx >= z.width || ny >= z.height) continue;
      if (z.detail[ny * z.width + nx] === Detail.Ash) ringAsh++;
    }
    if (ringAsh < 2) out.push(`EmberBed at (${wx},${wy}) does not sit in the ash (${ringAsh} ash neighbours)`);
  }
  return out;
}

/** Helper for lanes: the four tiles a lie or sit stop may be staged from (world). */
export function cardinalStands(z: ZoneDef, x: number, y: number): Pt[] {
  const out: Pt[] = [];
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    if (passable(z, x + dx, y + dy)) out.push([x + dx, y + dy]);
  }
  return out;
}

/** The outermost ring is all TILE_SKIP and the zone publishes no edge profile. */
export function skipRing(z: ZoneDef): string[] {
  const out: string[] = [];
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      if (lx !== 0 && ly !== 0 && lx !== z.width - 1 && ly !== z.height - 1) continue;
      const i = ly * z.width + lx;
      if (z.ground[i] !== TILE_SKIP || z.detail[i] !== 0) {
        out.push(`border (${z.origin.x + lx},${z.origin.y + ly}) is authored`);
      }
    }
  }
  if (zoneEdgeProfileOf(z) !== null) out.push('the zone publishes an edge profile');
  return out;
}

/**
 * Every cell inside ANY route's bed — by that route's own half, a
 * trail's 1.1 or a road's 1.6, read through the wandered carve — is
 * TILE_SKIP on both planes. No exemption this band.
 */
export function bedUntouched(z: ZoneDef): string[] {
  const out: string[] = [];
  for (const [x, y] of authoredCells(z)) {
    if (!bedAt(x, y)) continue;
    out.push(`bed cell (${x},${y}) is authored (${roadAt(x, y).toFixed(2)} from the carve)`);
  }
  return out;
}

/** Every authored cell inside ROAD_SHOULDER (and off the bed) lies in a listed rect. */
export function shoulderListed(
  z: ZoneDef,
  listed: ReadonlyArray<{ rect: Rect4; why: string }>,
): string[] {
  const out: string[] = [];
  for (const [x, y] of authoredCells(z)) {
    const d = roadAt(x, y);
    if (bedAt(x, y) || d > ROAD_SHOULDER) continue;
    if (listed.some((l) => inRect4(l.rect, x, y))) continue;
    out.push(`shoulder cell (${x},${y}) is authored but unlisted (${d.toFixed(2)} from the carve)`);
  }
  return out;
}

/**
 * G-12 THE PAD LAW, with THE AUTHORED HUG opt-in per site (band 7 fix
 * pass 2): no pinned site's footprint, as the siting scan sees it,
 * stands inside AUTHORED_ZONE_PAD of this rect, unless its site row
 * says `hug`, in which case only its edge holds. The pinned prefab
 * (or the def's first) is expanded exactly as the FILE-WINS JSON is
 * born (expandInfluence); the predicate mirrors pois.ts
 * intersectsZones (strict on both edges). A walked pin is the server
 * test's to prove, never this lint's.
 */
export function padClear(z: ZoneDef): string[] {
  const out: string[] = [];
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    const def = POI_DEFS.get(s.defId);
    const prefabId = s.prefabId ?? def?.prefabs[0];
    const sketch = prefabId !== undefined ? POI_PREFABS.get(prefabId) : undefined;
    if (!sketch) continue; // an unregistered pin is geography.test's to refuse
    const p = expandInfluence(sketch);
    const fx0 = s.x - Math.floor(p.width / 2);
    const fy0 = s.y - Math.floor(p.height / 2);
    const pad = s.hug === true ? 0 : AUTHORED_ZONE_PAD;
    const hit =
      fx0 - pad < z.origin.x + z.width &&
      fx0 + p.width + pad > z.origin.x &&
      fy0 - pad < z.origin.y + z.height &&
      fy0 + p.height + pad > z.origin.y;
    if (hit) {
      out.push(
        `site '${s.id}' (${prefabId} ${p.width}x${p.height} at (${s.x},${s.y}): x ${fx0}..${fx0 + p.width - 1} y ${fy0}..${fy0 + p.height - 1}) ` +
          `overlaps the ${z.id} rect x ${z.origin.x}..${z.origin.x + z.width - 1} y ${z.origin.y}..${z.origin.y + z.height - 1} (pad ${pad}: AUTHORED_ZONE_PAD ${AUTHORED_ZONE_PAD} unless the site row says hug)`,
      );
    }
  }
  return out;
}

/**
 * THE THREAD IS ONE LINE (owed F2): exactly two ends (a thread tile
 * with one orthogonal thread neighbour); every other thread tile has
 * exactly two; no two thread tiles touch only on a diagonal; and the
 * count is the pins' 28.
 */
export function oneLine(z: ZoneDef, expectTiles: number): string[] {
  const cells: Pt[] = [];
  for (const [x, y, t] of authoredCells(z)) if (t === Tile.WardThread) cells.push([x, y]);
  const has = new Set(cells.map(([x, y]) => `${x},${y}`));
  const out: string[] = [];
  if (cells.length !== expectTiles) out.push(`the thread is ${cells.length} tiles, not ${expectTiles}`);
  let ends = 0;
  for (const [x, y] of cells) {
    let n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (has.has(`${x + dx},${y + dy}`)) n++;
    if (n === 1) ends++;
    else if (n !== 2) out.push(`thread tile (${x},${y}) has ${n} orthogonal thread neighbours`);
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      if (!has.has(`${x + dx},${y + dy}`)) continue;
      // A diagonal neighbour must share an orthogonal thread neighbour
      // with this tile (a corner), or the line is two lines touching.
      if (!has.has(`${x + dx},${y}`) && !has.has(`${x},${y + dy}`)) {
        out.push(`thread tiles (${x},${y}) and (${x + dx},${y + dy}) touch only on a diagonal`);
      }
    }
  }
  if (ends !== 2) out.push(`the thread has ${ends} ends, not 2`);
  return out;
}

const GLOOM: ReadonlySet<number> = new Set<number>([Tile.GloomStone, Tile.CreepRoot]);

/**
 * THE BRUISE: BlightVeins only within one (Chebyshev) of a gloom tile,
 * and every gloom tile carries the bruise on its own cell and on each
 * of its four sides that lies inside the authorable interior and is
 * not the thread's own cell (the thread runs over the floor as found).
 */
export function blightUnderGloom(z: ZoneDef): string[] {
  const out: string[] = [];
  const gloom: Pt[] = [];
  for (const [x, y, t] of authoredCells(z)) if (GLOOM.has(t)) gloom.push([x, y]);
  const nearGloom = (x: number, y: number): boolean =>
    gloom.some(([gx, gy]) => Math.abs(gx - x) <= 1 && Math.abs(gy - y) <= 1);
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      if (z.detail[ly * z.width + lx] !== Detail.BlightVeins) continue;
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (!nearGloom(x, y)) out.push(`BlightVeins at (${x},${y}) lie more than one tile from any gloom tile`);
    }
  }
  const interior = (x: number, y: number): boolean =>
    x > z.origin.x && y > z.origin.y && x < z.origin.x + z.width - 1 && y < z.origin.y + z.height - 1;
  for (const [gx, gy] of gloom) {
    if (detailAt(z, gx, gy) !== Detail.BlightVeins) out.push(`gloom tile (${gx},${gy}) carries no bruise on its own cell`);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = gx + dx;
      const y = gy + dy;
      if (!interior(x, y) || bedAt(x, y) || groundAt(z, x, y) === Tile.WardThread) continue;
      if (detailAt(z, x, y) !== Detail.BlightVeins) out.push(`gloom tile (${gx},${gy}) has no bruise on its side (${x},${y})`);
    }
  }
  return out;
}

/** Every GloomStone and WardThread tile lies strictly beyond the haven's safeR from its centre. */
export function stonesOutsideHaven(z: ZoneDef, haven: { x: number; y: number; r: number }): string[] {
  const out: string[] = [];
  for (const [x, y, t] of authoredCells(z)) {
    if (t !== Tile.GloomStone && t !== Tile.WardThread) continue;
    const d = Math.hypot(x - haven.x, y - haven.y);
    if (d <= haven.r) out.push(`${TILE_DEFS[t as Tile].name} at (${x},${y}) stands ${d.toFixed(1)} from the haven's centre (safeR ${haven.r})`);
  }
  return out;
}

/** Three DeadTree within two (Chebyshev) of every GloomStone: the ring worldgen never deals. */
export function snagRing(z: ZoneDef): string[] {
  const out: string[] = [];
  const dead: Pt[] = [];
  const stones: Pt[] = [];
  for (const [x, y, t] of authoredCells(z)) {
    if (t === Tile.DeadTree) dead.push([x, y]);
    if (t === Tile.GloomStone) stones.push([x, y]);
  }
  for (const [sx, sy] of stones) {
    const n = dead.filter(([dx, dy]) => Math.abs(dx - sx) <= 2 && Math.abs(dy - sy) <= 2).length;
    if (n < 3) out.push(`GloomStone at (${sx},${sy}) has ${n} dead trees within two, not three`);
  }
  return out;
}

/**
 * THE LOOP STAYS OFF THE REST: every spawn row's seat and patrol
 * stop lies ≥ minPost from every `at` post of the fork rest and
 * ≥ minEdge from the rest's scanned footprint (inclusive rect).
 */
export function loopClear(
  z: ZoneDef,
  atPosts: ReadonlyArray<Pt>,
  footprint: Rect4,
  minPost = 12,
  minEdge = 9,
): string[] {
  const out: string[] = [];
  const edgeDist = (x: number, y: number): number => {
    const dx = Math.max(footprint[0] - x, 0, x - footprint[2]);
    const dy = Math.max(footprint[1] - y, 0, y - footprint[3]);
    return Math.hypot(dx, dy);
  };
  for (const s of z.spawns ?? []) {
    const stops: Pt[] = [[s.x, s.y], ...(s.patrol ?? []).map((p): Pt => [p.x, p.y])];
    for (const [x, y] of stops) {
      for (const [ax, ay] of atPosts) {
        const d = Math.hypot(x - ax, y - ay);
        if (d < minPost) out.push(`${s.npc} stop (${x},${y}) stands ${d.toFixed(1)} from the at post (${ax},${ay})`);
      }
      const e = edgeDist(x, y);
      if (e < minEdge) out.push(`${s.npc} stop (${x},${y}) stands ${e.toFixed(1)} from the footprint's edge`);
    }
  }
  return out;
}

/** Every authored cell ≥ min from every wolf pin; the centre ≥ minCentre. */
export function wolfClear(
  z: ZoneDef,
  pins: ReadonlyArray<Pt>,
  min: number,
  centre: Pt,
  minCentre: number,
): string[] {
  const out: string[] = [];
  for (const [x, y] of authoredCells(z)) {
    for (const [px, py] of pins) {
      const d = Math.hypot(x - px, y - py);
      if (d < min) out.push(`authored cell (${x},${y}) stands ${d.toFixed(1)} from the wolf pin (${px},${py})`);
    }
  }
  for (const [px, py] of pins) {
    const d = Math.hypot(centre[0] - px, centre[1] - py);
    if (d < minCentre) out.push(`the post's centre (${centre[0]},${centre[1]}) stands ${d.toFixed(1)} from the wolf pin (${px},${py})`);
  }
  return out;
}

/** Exactly one RedRagStake, within tol of the tier ring (r from the anchor). */
export function thresholdStake(z: ZoneDef, ring: { x: number; y: number; r: number; tol: number }): string[] {
  const out: string[] = [];
  const rags: Pt[] = [];
  for (const [x, y, t] of authoredCells(z)) if (t === Tile.RedRagStake) rags.push([x, y]);
  if (rags.length !== 1) out.push(`the picket carries ${rags.length} rag stakes, not one`);
  for (const [x, y] of rags) {
    const d = Math.abs(Math.hypot(x - ring.x, y - ring.y) - ring.r);
    if (d > ring.tol) out.push(`the rag at (${x},${y}) stands ${d.toFixed(1)} off the ${ring.r} ring (tol ${ring.tol})`);
  }
  return out;
}

/** No routine waypoint, actor post or spawn stop on the bench's cell. */
export function benchUnused(z: ZoneDef, bench: Pt): string[] {
  const out: string[] = [];
  if (groundAt(z, bench[0], bench[1]) !== Tile.StoneBench) out.push(`no StoneBench at (${bench[0]},${bench[1]})`);
  if (zoneWaypoints(z).has(`${bench[0]},${bench[1]}`)) out.push(`the bench at (${bench[0]},${bench[1]}) is a routine waypoint; nobody sits on it`);
  return out;
}
