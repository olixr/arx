/**
 * THE ASHLAMP (contested lands, band 7) — THE FLOODS (CURATION LAW 6).
 *
 * Pure reads over the built ZoneDef (plus the scenes' registry);
 * ashlamp.test asserts each returns []. The Dawnmead lints COPIED for
 * a patch on worldgen, plus the four laws a patch has that a town
 * does not (site-grammar §2.3):
 *
 *  - unreachableFloor:   every authored walkable cell is reachable on
 *                        foot from the carve (TILE_SKIP is the field's
 *                        own ground and passes; the composite probe
 *                        checks the field's trees by eye).
 *  - occlusionViolations: nothing tall on the two rows south of a
 *                        door, a station, a sign, a post or a forage node.
 *  - signPairViolations: no two Signposts inside one eyeful
 *                        (|dx| <= 24 AND |dy| <= 22).
 *  - boxOverlaps:        every declared scene box pairwise disjoint.
 *  - emberBedsOffAsh:    every EmberBed sits IN the ash (two or more
 *                        ash neighbours) and carries none on its own
 *                        cell, so the pan reads against it (fix pass 1).
 *  - skipRing:           the outermost ring is all TILE_SKIP, so
 *                        zoneEdgeProfileOf publishes no profile and the
 *                        field keeps its mosaic at the seam.
 *  - bedUntouched:       every cell within ROAD_HALF of the wandered
 *                        First Road is TILE_SKIP on both planes (ground
 *                        and detail), except the cells the pins exempt.
 *  - shoulderListed:     every authored cell within ROAD_SHOULDER lies
 *                        in a listed rect that says why.
 *  - padClear (G-12):    no pinned site's footprint, as the server's
 *                        siting scan sees it (the influence-expanded
 *                        prefab, the FILE-WINS shape), OVERLAPS the
 *                        rect, and keeps AUTHORED_ZONE_PAD clear of it
 *                        unless the site row says `hug` (THE AUTHORED
 *                        HUG, opt-in per site since fix pass 2: a
 *                        hugging pin keeps only its edge; a walked pin
 *                        is the server test's to prove, pois.ts
 *                        intersectsZones, strict on both edges).
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
  ROAD_HALF,
  ROAD_SHOULDER,
  roadDistanceAt,
} from '../../geography.js';
import { POI_DEFS } from '../../pois/defs.js';
import { expandInfluence } from '../../pois/influence.js';
import { POI_PREFABS } from '../../pois/prefabs.js';
import { WORLD_SEED } from '../../worldgen.js';
import { zoneEdgeProfileOf } from '../../zoneEdges.js';
import type { ZoneDef } from '../types.js';
import type { AshRegistry, Pt } from './ctx.js';
import type { Rect4 } from './pins.js';

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
const road = (x: number, y: number): number => roadDistanceAt(WORLD_SEED, x, y);

/** A cell feet may cross: the field's own ground, or an authored non-solid tile (doors pass). */
const passable = (z: ZoneDef, x: number, y: number): boolean => {
  const t = groundAt(z, x, y);
  if (t === undefined) return false;
  if (t === TILE_SKIP) return true;
  return !TILE_DEFS[t as Tile].solid || doorInfo(t) !== null;
};

/**
 * THE SEALED-POCKET FLOOD: every authored walkable cell must be
 * reachable from `from` (a bed cell inside the rect) on foot,
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
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      const t = z.ground[ly * z.width + lx]!;
      if (t === TILE_SKIP || TILE_DEFS[t as Tile].solid) continue;
      if (!seen.has(`${x},${y}`)) out.push(`(${x},${y}) ${TILE_DEFS[t as Tile].name}`);
    }
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
export function occlusionViolations(z: ZoneDef, registry?: AshRegistry): string[] {
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
export function boxOverlaps(registry: AshRegistry): string[] {
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

/** K1: every EmberBed sits on its own ash. */
export function emberBedsOffAsh(z: ZoneDef): string[] {
  // THE PAN READS AGAINST THE ASH (fix pass 1): a bed's own cell
  // carries no ash detail (its pan was invisible on an ash floor by
  // day), and at least two of its cardinal neighbours do, so the bed
  // sits IN the ash and reads by it.
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

/** Every cell within ROAD_HALF of the wandered road is TILE_SKIP on both planes, except the exempt cells. */
export function bedUntouched(z: ZoneDef, exempt: ReadonlyArray<Pt> = []): string[] {
  const ok = new Set(exempt.map(([x, y]) => `${x},${y}`));
  const out: string[] = [];
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (road(x, y) > ROAD_HALF) continue;
      if (!authored(z, x, y) || ok.has(`${x},${y}`)) continue;
      out.push(`bed cell (${x},${y}) is authored (${road(x, y).toFixed(2)} from the carve)`);
    }
  }
  return out;
}

/** Every authored cell inside ROAD_SHOULDER (and off the bed) lies in a listed rect. */
export function shoulderListed(
  z: ZoneDef,
  listed: ReadonlyArray<{ rect: Rect4; why: string }>,
  exempt: ReadonlyArray<Pt> = [],
): string[] {
  const ok = new Set(exempt.map(([x, y]) => `${x},${y}`));
  const out: string[] = [];
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      const d = road(x, y);
      if (d <= ROAD_HALF || d > ROAD_SHOULDER) continue;
      if (!authored(z, x, y) || ok.has(`${x},${y}`)) continue;
      if (listed.some((l) => inRect4(l.rect, x, y))) continue;
      out.push(`shoulder cell (${x},${y}) is authored but unlisted (${d.toFixed(2)} from the carve)`);
    }
  }
  return out;
}

/**
 * G-12 THE PAD LAW, with THE AUTHORED HUG opt-in per site (fix pass
 * 2): no pinned site's footprint, as the siting scan sees it, stands
 * inside AUTHORED_ZONE_PAD of this rect, unless its site row says
 * `hug`, in which case only its edge holds. The pinned prefab (or the
 * def's first) is expanded exactly as the FILE-WINS JSON is born
 * (expandInfluence), because that is the shape the server scans; the
 * predicate mirrors pois.ts intersectsZones (strict on both edges)
 * at the pad the server's findAuthoredAnchor asks of the pin ITSELF:
 * pad 0 for a hugging pin (the fen waist's felled shoulder meets the
 * bar's own clearing on the bar's word), the full pad for every
 * other. A walked pin is the server test's to prove, never this
 * lint's.
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
    // THE AUTHORED HUG is the site row's own word (fix pass 2): a pin
    // that says `hug` needs no pad, only its edge; every other pin
    // keeps AUTHORED_ZONE_PAD from the scan's first probe, so the
    // mirror holds the pad against it here too.
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
