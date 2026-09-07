/**
 * THE SETT (contested lands, band 9d) — THE FLOODS (CURATION LAW 6).
 *
 * Pure reads over a built ZoneDef (plus the scenes' registry);
 * sett.test asserts each returns []. The wardthread's lints COPIED
 * (themselves the fen waist's, the Ashlamp's, Dawnmead's; the lib
 * lift goes to Foundations), plus the Sett's own:
 *
 *  - unreachableFloor:    every authored walkable cell is reachable on
 *                         foot from REACH_FROM, crossing a level change
 *                         only on a tread (the builder's own law).
 *  - occlusionViolations: nothing tall on the two rows south of a
 *                         door, a station, a sign, a post or a forage
 *                         node; a corbel cell is tall (registered); no
 *                         post on the two rows south of an EmberBed on
 *                         its column (the body hides the light).
 *  - signPairViolations:  no two Signposts inside one eyeful (trivial:
 *                         the Sett has no board; the count is spoken).
 *  - boxOverlaps:         every declared scene box pairwise disjoint.
 *  - emberBedsOffAsh:     every EmberBed sits IN the ash (K1).
 *  - postStands:          every registered post has a walkable cardinal.
 *  - skipRing:            the border ring is all TILE_SKIP but the listed
 *                         SEAM cells; any published edge profile claims
 *                         nothing (every run 'open' after the vote).
 *  - padClear (G-12):     no pinned footprint inside AUTHORED_ZONE_PAD.
 *  - floorPainted:        every worldgen level<0 cell in the frame is
 *                         painted (never TILE_SKIP) and its elev is the
 *                         edited level.
 *  - rimIsCliff:          every rim cell (the 8-law over the def's own
 *                         elev) is Cliff or Ramp; every Cliff is a rim.
 *  - stairsExact:         exactly the listed treads are Ramp.
 *  - wetFloorLevel:       every WaterShallow at −2; nothing stands in a
 *                         painted water cell but water and the course kit.
 *  - plugUnwalked:        no post, waypoint, seat or wander reach inside
 *                         the dome's ring.
 *  - lightsCensus:        the two hearths are the only lights.
 *  - noTimber:            no timber, no seat, no bed; the taken listed.
 *  - oneLoop:             exactly one body on a declared loop routine.
 *  - stileNotAtJunction:  no stile or stone at a corner or a junction.
 *  - chalkNoLattice:      no Chalkline cell with chalk on both axes.
 *  - yardSealed:          the yard is entered through the stile only.
 *  - keepOut:             every listed keep-out cell holds only its
 *                         allowed tiles.
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
import { AUTHORED_WILD_SITES, AUTHORED_ZONE_PAD } from '../../geography.js';
import { POI_DEFS } from '../../pois/defs.js';
import { expandInfluence } from '../../pois/influence.js';
import { POI_PREFABS } from '../../pois/prefabs.js';
import { ROUTINES } from '../../routines/registry.js';
import { zoneEdgeProfileOf } from '../../zoneEdges.js';
import { zoneWaypoints } from '../lint/footprint.js';
import type { ZoneDef } from '../types.js';
import type { SettRegistry } from './ctx.js';
import { FRAMES, type Box4, type KeepOut, type Pt } from './pins.js';
const FRAMES_BY_ID: Readonly<Record<string, { SEAM: ReadonlyArray<Pt> } | undefined>> = FRAMES;

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
/** Elevation at a WORLD cell: the def's own layer; 0 outside the rect and on a flat def. */
const elevAt = (z: ZoneDef, x: number, y: number): number => {
  const lx = x - z.origin.x;
  const ly = y - z.origin.y;
  if (lx < 0 || ly < 0 || lx >= z.width || ly >= z.height) return 0;
  return z.elev?.[ly * z.width + lx] ?? 0;
};
const authored = (z: ZoneDef, x: number, y: number): boolean =>
  groundAt(z, x, y) !== TILE_SKIP || (detailAt(z, x, y) ?? 0) !== 0;

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

const COURSE_KIT: ReadonlySet<number> = new Set<number>([Tile.CourseWall, Tile.CourseStile, Tile.CorbelCell, Tile.PlumbStone]);

/**
 * THE SEALED-POCKET FLOOD with the builder's own elevation law: from
 * `from`, 4-neighbour, TILE_SKIP passing as the field's ground, a
 * level change crossed only where one side is a tread (Ramp). `block`
 * names extra cells the flood treats as solid (the yard's stile, for
 * yardSealed).
 */
function flood(z: ZoneDef, from: Pt, block: ReadonlySet<string> = new Set()): Set<string> {
  const seen = new Set<string>();
  const stack: Pt[] = [from];
  seen.add(`${from[0]},${from[1]}`);
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || block.has(key) || !passable(z, nx, ny)) continue;
      if (elevAt(z, nx, ny) !== elevAt(z, x, y) && groundAt(z, x, y) !== Tile.Ramp && groundAt(z, nx, ny) !== Tile.Ramp) continue;
      seen.add(key);
      stack.push([nx, ny]);
    }
  }
  return seen;
}

export function unreachableFloor(z: ZoneDef, from: Pt): string[] {
  const seen = flood(z, from);
  const out: string[] = [];
  for (const [x, y, t] of authoredCells(z)) {
    if (t === TILE_SKIP || TILE_DEFS[t as Tile].solid) continue;
    if (!seen.has(`${x},${y}`)) out.push(`(${x},${y}) ${TILE_DEFS[t as Tile].name}`);
  }
  return out;
}

/** The tall set (Dawnmead lint's, verbatim) plus the kit's own tall one, the corbel cell. */
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
  Tile.CorbelCell,
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

export function occlusionViolations(z: ZoneDef, registry?: SettRegistry): string[] {
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
  for (const s of z.spawns ?? []) {
    if (s.post !== undefined) subjects.push({ x: Math.floor(s.post.x), y: Math.floor(s.post.y), what: `post ${s.npc}`, door: false });
  }
  if (registry) {
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
  // THE LIGHT IS NOT HIDDEN (band 9d L4): a body posted one or two rows
  // south of an EmberBed on its column paints over the bed by day and
  // over its glow at night; no post stands there.
  const beds: Pt[] = [];
  for (const [x, y, t] of authoredCells(z)) if (t === Tile.EmberBed) beds.push([x, y]);
  const hid = new Set<string>();
  for (const s of subjects) {
    if (!s.what.startsWith('post')) continue;
    for (const [bx, by] of beds) {
      const dy = s.y - by;
      if (s.x !== bx || dy < 1 || dy > 2) continue;
      const key = `${s.x},${s.y}>${bx},${by}`;
      if (hid.has(key)) continue;
      hid.add(key);
      out.push(`a post at (${s.x},${s.y}) stands ${dy} south of the EmberBed at (${bx},${by}) and hides its light`);
    }
  }
  return out;
}

/** The 1080p eyeful at default zoom (Camera.yScale 0.6): |dx| <= 24 AND |dy| <= 22. */
export const EYEFUL_DX = 24;
export const EYEFUL_DY = 22;

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

export function boxOverlaps(registry: SettRegistry): string[] {
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

/** The four tiles a stop may be staged from (world). */
export function cardinalStands(z: ZoneDef, x: number, y: number): Pt[] {
  const out: Pt[] = [];
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    if (passable(z, x + dx, y + dy)) out.push([x + dx, y + dy]);
  }
  return out;
}

/** THE CARDINAL-STAND LAW: every registered post is itself passable and has a passable cardinal. */
export function postStands(z: ZoneDef, registry: SettRegistry): string[] {
  const out: string[] = [];
  for (const [x, y] of registry.posts) {
    if (!passable(z, x, y)) out.push(`post (${x},${y}) stands on solid '${TILE_DEFS[groundAt(z, x, y) as Tile]?.name}'`);
    if (cardinalStands(z, x, y).length === 0) out.push(`post (${x},${y}) has no walkable cardinal stand`);
  }
  return out;
}

/**
 * The outermost ring is all TILE_SKIP but the listed SEAM cells (THE
 * SEAM EXEMPTION, §3.3), and the zone claims nothing from the wild: an
 * edge profile, if the seam publishes one, votes 'open' on every run.
 */
export function skipRing(z: ZoneDef, exempt: ReadonlyArray<Pt> = []): string[] {
  const ok = new Set(exempt.map(([x, y]) => `${x},${y}`));
  const out: string[] = [];
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      if (lx !== 0 && ly !== 0 && lx !== z.width - 1 && ly !== z.height - 1) continue;
      const i = ly * z.width + lx;
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (ok.has(`${x},${y}`)) continue;
      if (z.ground[i] !== TILE_SKIP || z.detail[i] !== 0) out.push(`border (${x},${y}) is authored`);
    }
  }
  const profile = zoneEdgeProfileOf(z);
  if (profile !== null) {
    for (const [side, run] of [['top', profile.top], ['bottom', profile.bottom], ['left', profile.left], ['right', profile.right]] as const) {
      run.forEach((c, i) => {
        if (c !== 'open') out.push(`the edge profile claims '${c}' on ${side}[${i}]`);
      });
    }
  }
  return out;
}

/** G-12 THE PAD LAW with THE AUTHORED HUG opt-in per site (the wardthread's, verbatim). */
export function padClear(z: ZoneDef): string[] {
  const out: string[] = [];
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    const def = POI_DEFS.get(s.defId);
    const prefabId = s.prefabId ?? def?.prefabs[0];
    const sketch = prefabId !== undefined ? POI_PREFABS.get(prefabId) : undefined;
    if (!sketch) continue;
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
          `overlaps the ${z.id} rect x ${z.origin.x}..${z.origin.x + z.width - 1} y ${z.origin.y}..${z.origin.y + z.height - 1} (pad ${pad})`,
      );
    }
  }
  return out;
}

/**
 * THE SHAPE IS READ: every worldgen level<0 cell inside the frame is
 * painted (never TILE_SKIP) and carries the edited level in the def's
 * own layer; no level-0 cell was sunk.
 */
export function floorPainted(z: ZoneDef, level: (x: number, y: number) => number): string[] {
  const out: string[] = [];
  for (let ly = 1; ly < z.height - 1; ly++) {
    for (let lx = 1; lx < z.width - 1; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      const want = level(x, y);
      const have = z.elev?.[ly * z.width + lx] ?? 0;
      if (want < 0 && z.ground[ly * z.width + lx] === TILE_SKIP) out.push(`sunk cell (${x},${y}) level ${want} is unpainted`);
      if (have !== want) out.push(`cell (${x},${y}) carries level ${have}, the ground says ${want}`);
    }
  }
  return out;
}

/** Every rim cell (the 8-law over the def's elev) is Cliff or Ramp, and every Cliff is a rim. */
export function rimIsCliff(z: ZoneDef): string[] {
  const out: string[] = [];
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      const l = elevAt(z, x, y);
      let rim = false;
      for (let dy = -1; dy <= 1 && !rim; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx !== 0 || dy !== 0) && elevAt(z, x + dx, y + dy) < l) {
            rim = true;
            break;
          }
        }
      }
      const t = z.ground[ly * z.width + lx]!;
      if (rim && t !== Tile.Cliff && t !== Tile.Ramp) out.push(`rim (${x},${y}) carries '${t === TILE_SKIP ? 'the field' : TILE_DEFS[t as Tile].name}', not Cliff or a tread`);
      if (!rim && t === Tile.Cliff) out.push(`Cliff at (${x},${y}) fences nothing`);
      if (rim && (detailAt(z, x, y) ?? 0) !== 0) out.push(`rim (${x},${y}) carries a detail`);
    }
  }
  return out;
}

/** Exactly the listed treads are Ramp. */
export function stairsExact(z: ZoneDef, treads: ReadonlyArray<Pt>): string[] {
  const out: string[] = [];
  const want = new Set(treads.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of treads) if (groundAt(z, x, y) !== Tile.Ramp) out.push(`no tread at (${x},${y})`);
  for (const [x, y, t] of authoredCells(z)) if (t === Tile.Ramp && !want.has(`${x},${y}`)) out.push(`an unlisted tread at (${x},${y})`);
  return out;
}

/** Every WaterShallow at −2 and off the rim; nothing stands in a painted water cell but water and the course kit. */
export function wetFloorLevel(z: ZoneDef, painted: ReadonlyArray<Pt>): string[] {
  const out: string[] = [];
  for (const [x, y, t] of authoredCells(z)) {
    if (t !== Tile.WaterShallow) continue;
    if (elevAt(z, x, y) !== -2) out.push(`water at (${x},${y}) stands at level ${elevAt(z, x, y)}`);
  }
  for (const [x, y] of painted) {
    const t = groundAt(z, x, y);
    if (t !== Tile.WaterShallow && !COURSE_KIT.has(t ?? -1)) out.push(`painted water (${x},${y}) carries '${TILE_DEFS[t as Tile]?.name}'`);
    if (elevAt(z, x, y) !== -2) out.push(`painted water (${x},${y}) is not on the −2 floor`);
  }
  return out;
}

/**
 * Nobody stands on the Plug: no actor post, routine stop, spawn seat,
 * patrol stop or authored post lies within `r` (Chebyshev) of the
 * dome, and no wander reach (the routine's largest wander radius from
 * its post) enters that ring either.
 */
export function plugUnwalked(z: ZoneDef, dome: Pt, r: number): string[] {
  const out: string[] = [];
  const inside = (x: number, y: number, reach = 0): boolean =>
    Math.max(Math.abs(x - dome[0]), Math.abs(y - dome[1])) <= r + reach;
  for (const key of zoneWaypoints(z)) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    if (inside(x, y)) out.push(`waypoint (${x},${y}) stands on the Plug`);
  }
  for (const a of z.actorSpawns ?? []) {
    const def = a.routine !== undefined ? ROUTINES.get(a.routine) : undefined;
    let reach = 0;
    if (def !== undefined) {
      const tasks = [def.base, ...(def.slots ?? []).map((s) => s.task)];
      for (const t of tasks) if (t.kind === 'wander') reach = Math.max(reach, t.radius);
    }
    if (inside(Math.floor(a.x), Math.floor(a.y), reach)) out.push(`${a.actor} at (${Math.floor(a.x)},${Math.floor(a.y)}) wanders onto the Plug (reach ${reach})`);
  }
  for (const s of z.spawns ?? []) {
    if (inside(Math.floor(s.x), Math.floor(s.y), s.radius)) out.push(`${s.npc} seat (${s.x},${s.y}) reaches the Plug`);
  }
  return out;
}

const LAMP_KIN: ReadonlySet<number> = new Set<number>([
  Tile.LampPost, Tile.LampPostDark, Tile.StreetLantern, Tile.StandingTorch, Tile.Campfire, Tile.Brazier, Tile.WarBrazier, Tile.PitLamp,
  Tile.CandleStand, Tile.CandleShrine, Tile.CandleRack, Tile.CandleCluster, Tile.CandleClusterOut, Tile.MeltedCandles,
]);

/** THE LIGHTS CENSUS: the two hearths are the set's only lights; a dark lamp carries no light row. */
export function lightsCensus(z: ZoneDef, want: { emberBeds: number; pitLampsDark: number }): string[] {
  const out: string[] = [];
  let beds = 0;
  let dark = 0;
  for (const [x, y, t] of authoredCells(z)) {
    if (t === Tile.EmberBed) beds++;
    else if (t === Tile.PitLampDark) dark++;
    else if (LAMP_KIN.has(t)) out.push(`a light stands at (${x},${y}): ${TILE_DEFS[t as Tile].name}`);
  }
  if (beds !== want.emberBeds) out.push(`${beds} ember beds, not ${want.emberBeds}`);
  if (dark !== want.pitLampsDark) out.push(`${dark} dark pit lamps, not ${want.pitLampsDark}`);
  return out;
}

const TIMBER: ReadonlySet<number> = new Set<number>([
  Tile.Fence, Tile.FenceBroken, Tile.RailWood, Tile.WoodFloor, Tile.TimberPost, Tile.Bed, Tile.Bedroll, Tile.StoneBench,
  Tile.Chair, Tile.Bench, Tile.WoodStool, Tile.Table, Tile.LeanTo, Tile.Sawhorse, Tile.LumberRack, Tile.FelledLog, Tile.Woodpile,
]);

/** NO TIMBER: the Dolmen own no wood and no seat; the listed exceptions are THE TAKEN. */
export function noTimber(z: ZoneDef, taken: { brokenCarts: number; charterPosts: number; pitLampsDark: number }): string[] {
  const out: string[] = [];
  const n = { brokenCarts: 0, charterPosts: 0, pitLampsDark: 0 };
  for (const [x, y, t] of authoredCells(z)) {
    if (TIMBER.has(t)) out.push(`timber at (${x},${y}): ${TILE_DEFS[t as Tile].name}`);
    if (t === Tile.BrokenCart) n.brokenCarts++;
    if (t === Tile.CharterPost) n.charterPosts++;
    if (t === Tile.PitLampDark) n.pitLampsDark++;
  }
  for (const k of ['brokenCarts', 'charterPosts', 'pitLampsDark'] as const) {
    if (n[k] !== taken[k]) out.push(`${n[k]} ${k}, not the ${taken[k]} taken`);
  }
  return out;
}

/**
 * ONE LOOP (R-F): exactly one placed body carries a declared loop
 * routine, and among the routines the zone names that are registered,
 * exactly the declared loops walk a `path`.
 */
export function oneLoop(z: ZoneDef, loops: ReadonlyArray<string>): string[] {
  const out: string[] = [];
  const declared = new Set(loops);
  const onLoop = (z.actorSpawns ?? []).filter((a) => a.routine !== undefined && declared.has(a.routine));
  if (onLoop.length !== 1) out.push(`${onLoop.length} bodies walk a loop, not one`);
  const named = new Set((z.actorSpawns ?? []).map((a) => a.routine).filter((r): r is string => r !== undefined));
  for (const id of named) {
    const def = ROUTINES.get(id);
    if (def === undefined) continue; // L3's routine lands later; the server warns until then
    const tasks = [def.base, ...(def.slots ?? []).map((s) => s.task)];
    const walks = tasks.some((t) => t.kind === 'path');
    if (walks && !declared.has(id)) out.push(`routine '${id}' walks a path and is no declared loop`);
    if (!walks && declared.has(id)) out.push(`declared loop '${id}' walks no path`);
  }
  return out;
}

/** No CourseStile or PlumbStone at a corner (course neighbours on both axes) or a junction (three or more). */
export function stileNotAtJunction(z: ZoneDef): string[] {
  const out: string[] = [];
  const isCourse = (x: number, y: number): boolean => COURSE_KIT.has(groundAt(z, x, y) ?? -1);
  for (const [x, y, t] of authoredCells(z)) {
    if (t !== Tile.CourseStile && t !== Tile.PlumbStone) continue;
    const ew = (isCourse(x - 1, y) ? 1 : 0) + (isCourse(x + 1, y) ? 1 : 0);
    const ns = (isCourse(x, y - 1) ? 1 : 0) + (isCourse(x, y + 1) ? 1 : 0);
    if (ew + ns >= 3) out.push(`${TILE_DEFS[t as Tile].name} at (${x},${y}) stands at a junction`);
    else if (ew > 0 && ns > 0) out.push(`${TILE_DEFS[t as Tile].name} at (${x},${y}) stands at a corner`);
  }
  return out;
}

/** Never a lattice: no Chalkline cell with chalk on both axes. */
export function chalkNoLattice(z: ZoneDef): string[] {
  const out: string[] = [];
  const chalk = (x: number, y: number): boolean => detailAt(z, x, y) === Detail.Chalkline;
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (!chalk(x, y)) continue;
      const ew = chalk(x - 1, y) || chalk(x + 1, y);
      const ns = chalk(x, y - 1) || chalk(x, y + 1);
      if (ew && ns) out.push(`Chalkline at (${x},${y}) is a lattice`);
    }
  }
  return out;
}

/**
 * The yard is entered through the stile and only through it: with the
 * stile solid, the flood from `from` never enters the interior (the
 * floor cells inside the box at the yard's own level, −1; the core's
 * −2 floor reaches x 164 at some rows and is the core's, not the
 * yard's).
 */
export function yardSealed(z: ZoneDef, from: Pt, stile: Pt, interior: Box4, level = -1): string[] {
  const seen = flood(z, from, new Set([`${stile[0]},${stile[1]}`]));
  const out: string[] = [];
  for (let y = interior.y0; y <= interior.y1; y++) {
    for (let x = interior.x0; x <= interior.x1; x++) {
      if (elevAt(z, x, y) !== level) continue;
      if (seen.has(`${x},${y}`)) out.push(`the yard is entered at (${x},${y}) without the stile`);
    }
  }
  if (groundAt(z, stile[0], stile[1]) !== Tile.CourseStile) out.push(`no stile at (${stile[0]},${stile[1]})`);
  return out;
}

/** Every listed keep-out cell holds only its allowed tiles (TILE_SKIP is always lawful). */
export function keepOut(z: ZoneDef, rules: ReadonlyArray<KeepOut>): string[] {
  const out: string[] = [];
  for (const r of rules) {
    const allow = new Set<number>([...r.allow, TILE_SKIP]);
    for (const [x, y] of r.cells) {
      const t = groundAt(z, x, y);
      if (t === undefined) continue;
      if (!allow.has(t)) out.push(`(${x},${y}) carries '${TILE_DEFS[t as Tile].name}': ${r.why}`);
    }
  }
  return out;
}

// =====================================================================
// THE COURSE (band 9e): the lints the four frames add.
//  - seamJoined:      the whole polyline from the north gap to the END
//                     stone is ONE line: every counter value from 0 to
//                     the end laid once, each tile 4-adjacent to the
//                     one before it, the seams crossed with no hole.
//  - noFelling:       THE TRUNK LAW: every authored cell of a frame
//                     stands over worldgen grass, tall grass or sand at
//                     level 0, or (a painted water cell) over the
//                     brook's own water; never over a trunk, a sapling,
//                     a bush, a rock, a chest, a stump or a rise.
//  - waterOverField:  every WaterShallow the frame painted replaced
//                     the listed field: the ford the brook's water, the
//                     meadow's sheets grass at level 0.
//  - crowned:         the WATCH derived from the ground: every course
//                     cell with a trunk one or two rows south of it.
// =====================================================================

/** The tiles a course counter may lay. */
const COURSE_LAID: ReadonlySet<number> = new Set<number>([Tile.CourseWall, Tile.CourseStile, Tile.PlumbStone, Tile.WaterShallow]);

/**
 * THE LINE IS ONE LINE across the five frames: the registries' course
 * arrays, sorted by counter, run 0..end with no gap and no repeat, and
 * every consecutive pair of tiles is 4-adjacent (a seam crossed with
 * no hole). Each frame's SEAM cells must be laid by that frame.
 */
export function seamJoined(frames: ReadonlyArray<{ zone: ZoneDef; registry: SettRegistry }>, end: number): string[] {
  const out: string[] = [];
  const all: Array<{ x: number; y: number; i: number; tile: number; frame: string }> = [];
  for (const { zone, registry } of frames) {
    for (const c of registry.course) all.push({ ...c, frame: zone.id });
    for (const [x, y] of PINS_SEAMS(zone.id)) {
      if (!registry.course.some((c) => c.x === x && c.y === y)) out.push(`${zone.id}: seam (${x},${y}) is not laid by its frame`);
    }
  }
  all.sort((a, b) => a.i - b.i);
  if (all.length !== end) out.push(`${all.length} tiles laid, the counter says ${end}`);
  for (let k = 0; k < all.length; k++) {
    const c = all[k]!;
    if (c.i !== k) {
      out.push(`counter ${k} missing (next laid is ${c.i} at (${c.x},${c.y}) in ${c.frame})`);
      break;
    }
    if (!COURSE_LAID.has(c.tile)) out.push(`counter ${c.i} at (${c.x},${c.y}) is '${TILE_DEFS[c.tile as Tile]?.name}'`);
    if (k > 0) {
      const p = all[k - 1]!;
      if (Math.abs(p.x - c.x) + Math.abs(p.y - c.y) !== 1) {
        out.push(`counter ${p.i} (${p.x},${p.y}) in ${p.frame} and ${c.i} (${c.x},${c.y}) in ${c.frame} do not touch`);
      }
    }
  }
  return out;
}
/** The listed seam cells of a frame, by id (pins.FRAMES). */
function PINS_SEAMS(id: string): ReadonlyArray<Pt> {
  return (FRAMES_BY_ID[id]?.SEAM) ?? [];
}

/** THE TRUNK LAW over a built frame: the field under every authored cell. */
export function noFelling(
  z: ZoneDef,
  free: (x: number, y: number) => boolean,
  water: (x: number, y: number) => boolean,
  fieldName: (x: number, y: number) => string,
): string[] {
  const out: string[] = [];
  for (const [x, y, t] of authoredCells(z)) {
    if (t === Tile.WaterShallow ? free(x, y) || water(x, y) : free(x, y)) continue;
    out.push(`(${x},${y}) '${TILE_DEFS[t as Tile]?.name}' stands over worldgen '${fieldName(x, y)}'`);
  }
  return out;
}

/** Every painted water cell replaced the listed field, and nothing but water or the kit stands on it now. */
export function waterOverField(
  z: ZoneDef,
  painted: ReadonlyArray<Pt>,
  allowed: (x: number, y: number) => boolean,
  fieldName: (x: number, y: number) => string,
): string[] {
  const out: string[] = [];
  for (const [x, y] of painted) {
    if (!allowed(x, y)) out.push(`painted water (${x},${y}) replaced worldgen '${fieldName(x, y)}'`);
    const t = groundAt(z, x, y);
    if (t !== Tile.WaterShallow && !COURSE_KIT.has(t ?? -1)) out.push(`painted water (${x},${y}) carries '${TILE_DEFS[t as Tile]?.name}'`);
    if (elevAt(z, x, y) !== 0) out.push(`painted water (${x},${y}) is not at level 0`);
  }
  return out;
}

/** The WATCH derived from the ground: every laid course cell with a worldgen trunk one or two rows south of it. */
export function crowned(registry: SettRegistry, trunk: (x: number, y: number) => boolean): Array<{ cell: Pt; trunk: Pt }> {
  const out: Array<{ cell: Pt; trunk: Pt }> = [];
  for (const c of registry.course) {
    for (const dy of [1, 2]) {
      if (trunk(c.x, c.y + dy)) out.push({ cell: [c.x, c.y], trunk: [c.x, c.y + dy] });
    }
  }
  return out;
}
