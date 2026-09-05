/**
 * DAWNMEAD UNDER SIEGE (band 6) — THE FLOODS (L1; CURATION LAW 6).
 *
 * Six pure reads over a built ZoneDef (plus the districts' registry):
 * content.test asserts each returns []. Every one is a law the brief
 * wrote down and nobody wanted to check by eye a third time:
 *
 *  - unreachableFloor:   no sealed pocket (a bed, a pen, a ruin floor,
 *                        the knoll top) inside any declared box or
 *                        keep-out rect.
 *  - occlusionViolations: nothing tall on the two rows south of a door,
 *                        a station, a sign, a post or a forage node.
 *  - signPairViolations: no two Signposts inside one eyeful
 *                        (|dx| <= 24 AND |dy| <= 22); shingles exempt.
 *                        FIX PASS 1: the brief measured the eyeful as
 *                        48x27 (baseScale 1.25); the shipped Camera is
 *                        yScale 0.6 at default zoom 1 (ZOOM_MIN 0.85),
 *                        so one 1080p frame holds 48x45 tiles and two
 *                        boards share it whenever |dy| <= 22.
 *  - boxOverlaps:        every declared scene box pairwise disjoint.
 *  - ringBoxDiff:        the Ring box equals RING_BOX_GOLDEN cell for cell.
 *  - emberBedsOffAsh:    every EmberBed carries Detail.Ash beneath (K1).
 */
import {
  Detail,
  TILE_DEFS,
  TREE_TILES,
  Tile,
  WALL_RUN_TILES,
  doorInfo,
  stationAtTile,
} from '@arx/shared';
import type { ZoneDef } from '../types.js';
import type { DawnRegistry, Pt } from './ctx.js';
import { KEEP_OUT_BASE, RING_BOX, RING_BOX_GOLDEN, type Rect4 } from './pins.js';

const localAt = (z: ZoneDef, x: number, y: number): number | undefined =>
  x >= 0 && y >= 0 && x < z.width && y < z.height ? z.ground[y * z.width + x] : undefined;

type Rectish = Rect4 | { x0: number; y0: number; x1: number; y1: number };
const asRect4 = (r: Rectish): Rect4 => ('x0' in r ? [r.x0, r.y0, r.x1, r.y1] : r);
const inRect = (r: Rectish, x: number, y: number): boolean => {
  const [x0, y0, x1, y1] = asRect4(r);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
};

/**
 * THE SEALED-POCKET FLOOD: every walkable tile inside a declared box or
 * keep-out rect (KEEP_OUT_BASE when no registry is given) must be
 * reachable from the spawn on foot: 4-neighbour, doors and gates pass
 * (the errand lane works latches), level changes only across a Ramp.
 */
export function unreachableFloor(z: ZoneDef, registry?: DawnRegistry): string[] {
  const w = z.width;
  const h = z.height;
  const lvl = (i: number): number => z.elev?.[i] ?? 0;
  const standable = (i: number): boolean => {
    const t = z.ground[i]! as Tile;
    return !TILE_DEFS[t].solid || doorInfo(t) !== null;
  };
  const spawn = z.spawn ?? { x: z.origin.x + 78.5, y: z.origin.y + 112.5 };
  const sx = Math.floor(spawn.x - z.origin.x);
  const sy = Math.floor(spawn.y - z.origin.y);
  const seen = new Uint8Array(w * h);
  const stack = [sy * w + sx];
  seen[stack[0]!] = 1;
  while (stack.length > 0) {
    const i = stack.pop()!;
    const x = i % w;
    const y = Math.floor(i / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (seen[ni] || !standable(ni)) continue;
      if (lvl(ni) !== lvl(i) && z.ground[i] !== Tile.Ramp && z.ground[ni] !== Tile.Ramp) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
  const rects: Rectish[] = [...KEEP_OUT_BASE];
  if (registry) rects.push(...registry.keepOuts, ...registry.boxes);
  const out: string[] = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !standable(i)) continue;
    const t = z.ground[i]! as Tile;
    // A sealed GRASS bed at ground level is a garden (Wren's strip
    // behind her hedge, a hedged flower bed), never a floor; a sealed
    // floor, pen, ruin or knoll top is the bug this flood exists for.
    if ((t === Tile.Grass || t === Tile.GrassTall) && lvl(i) === 0) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    if (!rects.some((r) => inRect(r, x, y))) continue;
    out.push(`(${x},${y}) ${TILE_DEFS[t].name}`);
  }
  return out;
}

/**
 * The tall set (brief §4 header): the client's FADE_TALL_PROPS
 * (ChimneyStack, DeadTree, LegionStandard, LampPostDark, PitLamp),
 * every tree, LampPost, MarketStall, GravestoneTall, the Silo, and the
 * wall runs (a building painting over what stands north of it).
 */
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
 * forage node hold nothing tall. A building's own wall south of a side
 * door is the run that frames the door, never a violation; for every
 * other subject a wall counts as tall.
 */
export function occlusionViolations(z: ZoneDef, registry?: DawnRegistry): string[] {
  const subjects: Array<{ x: number; y: number; what: string; door: boolean }> = [];
  const tallHere = new Set<string>();
  for (let y = 0; y < z.height; y++) {
    for (let x = 0; x < z.width; x++) {
      const t = z.ground[y * z.width + x]! as Tile;
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
    subjects.push({
      x: Math.floor(a.x - z.origin.x),
      y: Math.floor(a.y - z.origin.y),
      what: `post ${a.actor}`,
      door: false,
    });
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
      const t = localAt(z, x, y);
      if (t === undefined) continue;
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

/** The 1080p eyeful at default zoom, in tiles either side of the body:
 *  Camera.yScale 0.6 makes the frame 48 cols by 45 rows, so the pair
 *  law is |dx| <= 24 AND |dy| <= 22 (FIX PASS 1; was 13). */
export const EYEFUL_DX = 24;
export const EYEFUL_DY = 22;

/** One Signpost per eyeful: two boards never share |dx| <= EYEFUL_DX AND |dy| <= EYEFUL_DY. */
export function signPairViolations(z: ZoneDef): string[] {
  const posts: Array<{ x: number; y: number; title: string }> = [];
  for (const s of z.signs ?? []) {
    const x = s.x - z.origin.x;
    const y = s.y - z.origin.y;
    if (localAt(z, x, y) === Tile.Signpost) posts.push({ x, y, title: s.title });
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
export function boxOverlaps(registry: DawnRegistry): string[] {
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

/** The Ring box equals the golden, ground and detail, cell for cell. */
export function ringBoxDiff(z: ZoneDef): string[] {
  const out: string[] = [];
  let k = 0;
  for (let y = RING_BOX.y0; y <= RING_BOX.y1; y++) {
    for (let x = RING_BOX.x0; x <= RING_BOX.x1; x++, k++) {
      const i = y * z.width + x;
      const g = z.ground[i]!;
      const d = z.detail[i]!;
      const gg = RING_BOX_GOLDEN.ground[k]!;
      const gd = RING_BOX_GOLDEN.detail[k]!;
      if (g !== gg) out.push(`ground (${x},${y}) ${g} != golden ${gg}`);
      if (d !== gd) out.push(`detail (${x},${y}) ${d} != golden ${gd}`);
    }
  }
  return out;
}

/** K1: every EmberBed sits on its own ash. */
export function emberBedsOffAsh(z: ZoneDef): string[] {
  const out: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    if (z.ground[i] !== Tile.EmberBed) continue;
    if (z.detail[i] !== Detail.Ash) out.push(`EmberBed at (${i % z.width},${Math.floor(i / z.width)}) has no ash beneath`);
  }
  return out;
}

/** Helper for lanes: the four tiles a lie or sit stop may be staged from. */
export function cardinalStands(z: ZoneDef, x: number, y: number): Pt[] {
  const out: Pt[] = [];
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const t = localAt(z, x + dx, y + dy);
    if (t !== undefined && !TILE_DEFS[t as Tile].solid) out.push([x + dx, y + dy]);
  }
  return out;
}
