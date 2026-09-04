/**
 * THE BARRIER LINE (play3d W2, BARRIERS lane) — the PURE geometry law
 * every barrier family stands on. No DOM, no Three, no painters:
 * numbers in, quads out (through the StructSink), node:test proves it.
 *
 * THE NODE GRAPH. A barrier is a polyline of NODES joined by EDGES:
 *  - a straight tile's node is its centre (tx+.5, ty+.5) — the 2D's
 *    one capped post per tile (barrierArt.ts fenceItem);
 *  - a GATE tile has no centre node: the run arrives at its BOUNDARY
 *    (the 2D hangs its hinge posts on the tile's edges, ±0.5);
 *  - a 45° tile ("/" DiagNE joins NE↔SW, "\" DiagNW joins NW↔SE —
 *    tiles.ts:628) strides corner to corner THROUGH its centre.
 * Cardinal edges join two members when at least one is a plain run
 * tile (a 45° tile lays no cardinal rail — barrierArt.ts:158 `cn =
 * straight && …`; a straight tile still reaches it, and the segment
 * runs to the diagonal's centre so the turn is continuous). Diagonal
 * edges exist only when BOTH ends want them: a "/" wants NE and SW, a
 * straight tile wants a corner iff the tile there is the matching
 * diagonal (the 2D's "stub toward a 45° neighbour whose line points
 * back", barrierArt.ts:166). Symmetric by construction.
 *
 * THE SHARED-EDGE LAW, spoken for lines: each edge is emitted ONCE, by
 * the tile at its lexicographic-min end — a tile emits toward E, S, SE
 * and SW; its partners emit W, N, NW, NE. Across a chunk border the
 * owner reaches into the neighbour's space (the sink's bounding sphere
 * is padded for exactly this); an unloaded neighbour answers undefined,
 * the edge waits, and THE BORDER WAKES THE NEIGHBOUR rebuilds the owner
 * when the tile arrives.
 *
 * THE SEPARATE-MASONRY LAW holds: membership is the family's own tile
 * set (FENCE / PALISADE / HEDGE / IRON_FENCE_TILES); a fence beside a
 * house wall ENDS (the 2D `fenceish` reach toward walls is not taken —
 * plan §W2 BARRIERS gaps).
 *
 * HEDGE VOLUMES do not use the graph: the mass is the 4-connected
 * footprint, faces on EXPOSED sides only (neighbour not a straight
 * hedge), one top per tile; a 45° hedge is a rotated slab along its
 * stroke, its top a hair lower than the straight mass so coplanar
 * overlaps never fight.
 *
 * Coordinates: world tiles, x east, z (= tile y) south, y up.
 */
import { FENCE_TILES, HEDGE_TILES, IRON_FENCE_TILES, PALISADE_TILES, Tile, doorInfo } from '@arx/shared';
import type { StructSampler } from './structKinds.js';
import type { StructMaterialKind, StructSink } from './structSink.js';

export type BarrierFamily = 'fence' | 'palisade' | 'hedge' | 'iron';

/** What a member tile is within its family. */
export type BarrierKind = 'straight' | 'diagNE' | 'diagNW' | 'gate';

const DIAG_NE: ReadonlySet<number> = new Set<number>([Tile.FenceDiagNE, Tile.PalisadeDiagNE, Tile.HedgeDiagNE, Tile.IronFenceDiagNE]);
const DIAG_NW: ReadonlySet<number> = new Set<number>([Tile.FenceDiagNW, Tile.PalisadeDiagNW, Tile.HedgeDiagNW, Tile.IronFenceDiagNW]);

const FAMILY_SETS: Readonly<Record<BarrierFamily, ReadonlySet<Tile>>> = {
  fence: FENCE_TILES,
  palisade: PALISADE_TILES,
  hedge: HEDGE_TILES,
  iron: IRON_FENCE_TILES,
};

/** The family a tile id belongs to (barrier families only). */
export function barrierFamilyOf(t: number | undefined): BarrierFamily | null {
  if (t === undefined) return null;
  if (FENCE_TILES.has(t as Tile)) return 'fence';
  if (PALISADE_TILES.has(t as Tile)) return 'palisade';
  if (HEDGE_TILES.has(t as Tile)) return 'hedge';
  if (IRON_FENCE_TILES.has(t as Tile)) return 'iron';
  return null;
}

/** The kind of a tile WITHIN `fam`, or null when it is not a member. */
export function barrierKindOf(fam: BarrierFamily, t: number | undefined): BarrierKind | null {
  if (t === undefined || !FAMILY_SETS[fam].has(t as Tile)) return null;
  if (DIAG_NE.has(t)) return 'diagNE';
  if (DIAG_NW.has(t)) return 'diagNW';
  const d = doorInfo(t);
  if (d !== null) return 'gate';
  return 'straight';
}

/** Is the tile open (a gate) — false for anything that is not a gate. */
export function barrierGateOpen(t: number | undefined): boolean {
  if (t === undefined) return false;
  const d = doorInfo(t);
  return d !== null && d.open;
}

/** The eight directions, as (dx, dy) in tile space. */
export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], // E
  [0, 1], // S
  [-1, 0], // W
  [0, -1], // N
  [1, 1], // SE
  [-1, 1], // SW
  [-1, -1], // NW
  [1, -1], // NE
];

/** Emission ownership: a tile emits the edges toward these four. */
const OWNED: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [-1, 1],
];

function wantsDiag(fam: BarrierFamily, s: StructSampler, tx: number, ty: number, kind: BarrierKind, dx: number, dy: number): boolean {
  if (kind === 'diagNE') return (dx === 1 && dy === -1) || (dx === -1 && dy === 1);
  if (kind === 'diagNW') return (dx === -1 && dy === -1) || (dx === 1 && dy === 1);
  if (kind === 'gate') return false;
  const nk = barrierKindOf(fam, s.groundAt(tx + dx, ty + dy));
  const slash = (dx === 1 && dy === -1) || (dx === -1 && dy === 1);
  return slash ? nk === 'diagNE' : nk === 'diagNW';
}

/**
 * Does an edge join tile (tx,ty) to its neighbour at (dx,dy)? Symmetric:
 * the answer from either end is the same.
 */
export function barrierJoins(fam: BarrierFamily, s: StructSampler, tx: number, ty: number, dx: number, dy: number): boolean {
  const k = barrierKindOf(fam, s.groundAt(tx, ty));
  if (k === null) return false;
  const nx = tx + dx;
  const ny = ty + dy;
  const nk = barrierKindOf(fam, s.groundAt(nx, ny));
  if (nk === null) return false;
  if (dx !== 0 && dy !== 0) {
    return wantsDiag(fam, s, tx, ty, k, dx, dy) && wantsDiag(fam, s, nx, ny, nk, -dx, -dy);
  }
  // Cardinal: at least one plain run tile; two gates never join.
  return k === 'straight' || nk === 'straight';
}

/** The world point on tile (tx,ty) where an edge arriving FROM direction (dx,dy) ends. */
export function barrierEndpoint(kind: BarrierKind, tx: number, ty: number, dx: number, dy: number, out: { x: number; z: number }): { x: number; z: number } {
  if (kind === 'gate' && (dx === 0 || dy === 0)) {
    out.x = tx + 0.5 + dx * 0.5;
    out.z = ty + 0.5 + dy * 0.5;
  } else {
    out.x = tx + 0.5;
    out.z = ty + 0.5;
  }
  return out;
}

export interface BarrierEdge {
  /** From this tile's node … */
  ax: number;
  az: number;
  /** … to the partner's endpoint. */
  bx: number;
  bz: number;
  /** Direction stepped (dx, dy). */
  dx: number;
  dy: number;
  /** World length of the edge. */
  len: number;
  /** True when the partner is a gate (the edge ends at its boundary). */
  toGate: boolean;
}

export interface BarrierNode {
  tx: number;
  ty: number;
  kind: BarrierKind;
  /** World node position (tile centre). */
  x: number;
  z: number;
  /** Incident edge directions, all eight, as a bitmask over DIRS' order. */
  incident: number;
  /** Number of incident edges. */
  degree: number;
  /** A plain E–W or N–S pass-through (no anchor needed). */
  through: boolean;
  /** No edges at all — the 2D "isolated" panel / stride. */
  isolated: boolean;
  /** Needs an anchor (corner, tee, run end, any 45° tile). */
  anchor: boolean;
  /** Edges this tile OWNS (emits): E, S, SE, SW as applicable. */
  edges: BarrierEdge[];
}

const scratchPt = { x: 0, z: 0 };

/**
 * Classify one member tile: its incident edges (all eight directions)
 * and the ones it owns. `kind === 'gate'` nodes own no edges (gates
 * emit posts and a leaf; the run arrives at their boundary).
 */
export function barrierNode(fam: BarrierFamily, s: StructSampler, tx: number, ty: number): BarrierNode | null {
  const kind = barrierKindOf(fam, s.groundAt(tx, ty));
  if (kind === null) return null;
  let incident = 0;
  let degree = 0;
  for (let i = 0; i < DIRS.length; i++) {
    const [dx, dy] = DIRS[i]!;
    if (barrierJoins(fam, s, tx, ty, dx, dy)) {
      incident |= 1 << i;
      degree++;
    }
  }
  const EW = 0b0101; // E | W
  const NS = 0b1010; // S | N
  const through = kind === 'straight' && (incident === EW || incident === NS);
  const isolated = degree === 0;
  const anchor = kind === 'diagNE' || kind === 'diagNW' || (kind === 'straight' && !through && !isolated);
  const edges: BarrierEdge[] = [];
  const x = tx + 0.5;
  const z = ty + 0.5;
  if (kind !== 'gate') {
    // Owned directions, plus any cardinal edge INTO a gate: a gate owns
    // nothing, so the tile beside it owns the half-edge to its boundary
    // from whichever side it stands.
    for (const [dx, dy] of DIRS) {
      if (!barrierJoins(fam, s, tx, ty, dx, dy)) continue;
      const nk = barrierKindOf(fam, s.groundAt(tx + dx, ty + dy))!;
      const owned = OWNED.some(([ox, oy]) => ox === dx && oy === dy);
      if (!owned && nk !== 'gate') continue;
      const b = barrierEndpoint(nk, tx + dx, ty + dy, -dx, -dy, scratchPt);
      edges.push({ ax: x, az: z, bx: b.x, bz: b.z, dx, dy, len: Math.hypot(b.x - x, b.z - z), toGate: nk === 'gate' });
    }
    if (isolated) {
      // An isolated piece still shows its build (barrierArt.ts:176).
      if (kind === 'straight') edges.push({ ax: x - 0.5, az: z, bx: x + 0.5, bz: z, dx: 1, dy: 0, len: 1, toGate: false });
      else if (kind === 'diagNE') edges.push({ ax: x - 0.5, az: z + 0.5, bx: x + 0.5, bz: z - 0.5, dx: 1, dy: -1, len: Math.SQRT2, toGate: false });
      else edges.push({ ax: x - 0.5, az: z - 0.5, bx: x + 0.5, bz: z + 0.5, dx: 1, dy: 1, len: Math.SQRT2, toGate: false });
    }
  }
  return { tx, ty, kind, x, z, incident, degree, through, isolated, anchor, edges };
}

/** A gate hung in a N–S line stands edge-on (the 2D `vertical`, barrierArt.ts:384). */
export function barrierGateVertical(fam: BarrierFamily, s: StructSampler, tx: number, ty: number): boolean {
  const m = (dx: number, dy: number): boolean => barrierKindOf(fam, s.groundAt(tx + dx, ty + dy)) !== null;
  return (m(0, -1) || m(0, 1)) && !(m(1, 0) || m(-1, 0));
}

// ------------------------------------------------------------- hedge

/** The hedge MASS: straight hedge tiles only (gates open, 45° tiles are slabs). */
export function hedgeMassAt(s: StructSampler, tx: number, ty: number): boolean {
  return barrierKindOf('hedge', s.groundAt(tx, ty)) === 'straight';
}

export interface HedgeExposure {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
}

/** Which sides of a mass tile show a face (the neighbour is not mass). */
export function hedgeExposure(s: StructSampler, tx: number, ty: number, out: HedgeExposure): HedgeExposure {
  out.n = !hedgeMassAt(s, tx, ty - 1);
  out.e = !hedgeMassAt(s, tx + 1, ty);
  out.s = !hedgeMassAt(s, tx, ty + 1);
  out.w = !hedgeMassAt(s, tx - 1, ty);
  return out;
}

// -------------------------------------------------------------- boxes

/** An atlas rect a face samples: u0/v0 = base-west, u1/v1 = crown-east (FaceRef satisfies it). */
export interface FaceRect {
  page: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** Face textures for a box: null = that face is not emitted. */
export interface BoxFaces {
  /** The side faces (S, and N/E/W unless overridden). */
  side: FaceRect | null;
  /** The N face when it differs (undefined = `side`). */
  back?: FaceRect | null;
  /** The E/W end faces when they differ (undefined = `side`). */
  end?: FaceRect | null;
  top: FaceRect | null;
}

export interface BoxExposed {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
  top: boolean;
}

export const ALL_EXPOSED: Readonly<BoxExposed> = Object.freeze({ n: true, e: true, s: true, w: true, top: true });

/**
 * An axis-aligned box over the world rect [x0,x1]×[z0,z1], base y0,
 * crown y1, faces on exposed sides only. Side textures run u W→E as
 * seen from OUTSIDE each face (the north face reads east-to-west so a
 * viewer standing north sees it unmirrored); v 0 = base. Returns the
 * quad count.
 */
export function emitBox(
  sink: StructSink,
  kind: StructMaterialKind,
  faces: BoxFaces,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y0: number,
  y1: number,
  ex: Readonly<BoxExposed> = ALL_EXPOSED,
): number {
  let n = 0;
  const side = faces.side;
  const back = faces.back === undefined ? side : faces.back;
  const end = faces.end === undefined ? side : faces.end;
  if (ex.s && side) {
    sink.face(kind, side.page, x0, z1, x1, z1, y0, y1, side.u0, side.v0, side.u1, side.v1, 0, 1);
    n++;
  }
  if (ex.n && back) {
    sink.face(kind, back.page, x1, z0, x0, z0, y0, y1, back.u0, back.v0, back.u1, back.v1, 0, -1);
    n++;
  }
  if (ex.e && end) {
    sink.face(kind, end.page, x1, z1, x1, z0, y0, y1, end.u0, end.v0, end.u1, end.v1, 1, 0);
    n++;
  }
  if (ex.w && end) {
    sink.face(kind, end.page, x0, z0, x0, z1, y0, y1, end.u0, end.v0, end.u1, end.v1, -1, 0);
    n++;
  }
  if (ex.top && faces.top) {
    const t = faces.top;
    sink.top(kind, t.page, x0, z0, x1, z1, y1, t.u0, t.v0, t.u1, t.v1);
    n++;
  }
  return n;
}

/**
 * A box whose long axis runs a→b on the ground (any direction), `w`
 * wide, base ya at a / yb at b (a sloping run follows its ground),
 * `h` tall. Side faces both flanks, end caps optional, top always.
 * Used for curbs, palisade bodies and diagonal hedge slabs.
 */
export function emitRunBox(
  sink: StructSink,
  kind: StructMaterialKind,
  faces: BoxFaces,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  w: number,
  ya: number,
  yb: number,
  h: number,
  capA: boolean,
  capB: boolean,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return 0;
  const ux = dx / len;
  const uz = dz / len;
  // Left-hand normal (looking along a→b): (uz, -ux) is the RIGHT side
  // in a y-up, z-south frame; we name flanks by their outward normal.
  const nx = -uz;
  const nz = ux;
  const hw = w / 2;
  const side = faces.side;
  const end = faces.end === undefined ? side : faces.end;
  let n = 0;
  const pts = sink.p;
  const uv = sink.uv;
  const flank = (sign: number): void => {
    if (!side) return;
    // Corners: a-side base, b-side base, b-side crown, a-side crown.
    const ox = nx * hw * sign;
    const oz = nz * hw * sign;
    const fa0x = ax + ox;
    const fa0z = az + oz;
    const fb0x = bx + ox;
    const fb0z = bz + oz;
    pts[0] = fa0x;
    pts[1] = ya;
    pts[2] = fa0z;
    pts[3] = fb0x;
    pts[4] = yb;
    pts[5] = fb0z;
    pts[6] = fb0x;
    pts[7] = yb + h;
    pts[8] = fb0z;
    pts[9] = fa0x;
    pts[10] = ya + h;
    pts[11] = fa0z;
    // The flank facing +sign·n reads a→b when sign = +1 and b→a when
    // sign = −1 (so it is unmirrored from its own outside).
    const su0 = sign > 0 ? side.u0 : side.u1;
    const su1 = sign > 0 ? side.u1 : side.u0;
    uv[0] = su0;
    uv[1] = side.v0;
    uv[2] = su1;
    uv[3] = side.v0;
    uv[4] = su1;
    uv[5] = side.v1;
    uv[6] = su0;
    uv[7] = side.v1;
    sink.quad(kind, side.page, pts, uv, nx * sign, 0, nz * sign);
    n++;
  };
  flank(1);
  flank(-1);
  const cap = (cx: number, cz: number, cy: number, dirx: number, dirz: number): void => {
    if (!end) return;
    const lx = cx - nx * hw;
    const lz = cz - nz * hw;
    const rx = cx + nx * hw;
    const rz = cz + nz * hw;
    pts[0] = lx;
    pts[1] = cy;
    pts[2] = lz;
    pts[3] = rx;
    pts[4] = cy;
    pts[5] = rz;
    pts[6] = rx;
    pts[7] = cy + h;
    pts[8] = rz;
    pts[9] = lx;
    pts[10] = cy + h;
    pts[11] = lz;
    uv[0] = end.u0;
    uv[1] = end.v0;
    uv[2] = end.u1;
    uv[3] = end.v0;
    uv[4] = end.u1;
    uv[5] = end.v1;
    uv[6] = end.u0;
    uv[7] = end.v1;
    sink.quad(kind, end.page, pts, uv, dirx, 0, dirz);
    n++;
  };
  if (capA) cap(ax, az, ya, -ux, -uz);
  if (capB) cap(bx, bz, yb, ux, uz);
  if (faces.top) {
    const t = faces.top;
    pts[0] = ax - nx * hw;
    pts[1] = ya + h;
    pts[2] = az - nz * hw;
    pts[3] = ax + nx * hw;
    pts[4] = ya + h;
    pts[5] = az + nz * hw;
    pts[6] = bx + nx * hw;
    pts[7] = yb + h;
    pts[8] = bz + nz * hw;
    pts[9] = bx - nx * hw;
    pts[10] = yb + h;
    pts[11] = bz - nz * hw;
    uv[0] = t.u0;
    uv[1] = t.v0;
    uv[2] = t.u1;
    uv[3] = t.v0;
    uv[4] = t.u1;
    uv[5] = t.v1;
    uv[6] = t.u0;
    uv[7] = t.v1;
    sink.quad(kind, t.page, pts, uv, 0, 1, 0);
    n++;
  }
  return n;
}

/**
 * A vertical CARD from ground point a to b (any direction), base ya/yb,
 * top ya+h / yb+h, textured u a→b, v base→crown. One quad; the cutout
 * material is double-sided so a card is seen from both flanks. The
 * declared normal is the left-hand perpendicular (lighting flips it
 * for the back face).
 */
export function emitCard(
  sink: StructSink,
  kind: StructMaterialKind,
  r: FaceRect,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  ya: number,
  yb: number,
  h: number,
  /** Optional u range override (fractions of r's u span; mirrored when u0 > u1). */
  fu0 = 0,
  fu1 = 1,
): void {
  const u0 = r.u0 + (r.u1 - r.u0) * fu0;
  const u1 = r.u0 + (r.u1 - r.u0) * fu1;
  const v0 = r.v0;
  const v1 = r.v1;
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const pts = sink.p;
  const uv = sink.uv;
  pts[0] = ax;
  pts[1] = ya;
  pts[2] = az;
  pts[3] = bx;
  pts[4] = yb;
  pts[5] = bz;
  pts[6] = bx;
  pts[7] = yb + h;
  pts[8] = bz;
  pts[9] = ax;
  pts[10] = ya + h;
  pts[11] = az;
  uv[0] = u0;
  uv[1] = v0;
  uv[2] = u1;
  uv[3] = v0;
  uv[4] = u1;
  uv[5] = v1;
  uv[6] = u0;
  uv[7] = v1;
  sink.quad(kind, r.page, pts, uv, -dz / len, 0, dx / len);
}

/**
 * THE TURNED CROSS: two perpendicular cards through (cx,cz) — the
 * billboard cross that reads as a post from every bearing — turned
 * 22.5° off the axes so NO card is coplanar with any run card (rails
 * run at 0°, 45°, 90°, 135°; a coplanar post card would z-fight the
 * rail passing through it). `w` is the card width, `h` the height.
 */
export const CROSS_TURN = Math.PI / 8;
export function emitCross(sink: StructSink, kind: StructMaterialKind, r: FaceRect, cx: number, cz: number, y: number, w: number, h: number): void {
  const hw = w / 2;
  const c = Math.cos(CROSS_TURN) * hw;
  const s = Math.sin(CROSS_TURN) * hw;
  emitCard(sink, kind, r, cx - c, cz - s, cx + c, cz + s, y, y, h);
  emitCard(sink, kind, r, cx + s, cz - c, cx - s, cz + c, y, y, h);
}

// -------------------------------------------------------------- gates

/**
 * THE LEAF SWINGS. A gate leaf hinged at (hx,hz), lying along the shut
 * direction (sx,sz) (unit) when closed, rotated by `swing` radians
 * about the vertical hinge toward the open direction (ox,oz) (unit,
 * perpendicular). Returns the leaf's far end on the ground.
 */
export function swingLeafEnd(hx: number, hz: number, sx: number, sz: number, ox: number, oz: number, width: number, swing: number, out: { x: number; z: number }): { x: number; z: number } {
  const c = Math.cos(swing);
  const s = Math.sin(swing);
  out.x = hx + (sx * c + ox * s) * width;
  out.z = hz + (sz * c + oz * s) * width;
  return out;
}

/** Open gates stand at this swing (radians); shut at 0. */
export const LEAF_OPEN_SWING = (Math.PI / 180) * 96;

export function leafSwing(open: boolean): number {
  return open ? LEAF_OPEN_SWING : 0;
}

// ----------------------------------------------------------- garrison

export interface GarrisonGateRun {
  /** West anchor tile. */
  tx: number;
  ty: number;
  len: number;
  open: boolean;
  /** Edge-on in a N–S curtain (the side-gate grammar). */
  side: boolean;
}

/**
 * Merge E–W garrison gate tiles into runs (gates are always `wide`,
 * tiles.ts doorInfo — the run's west tile anchors it). Side gates
 * (edge-on in a N–S curtain) are their own single-tile runs. Only runs
 * whose ANCHOR lies inside [x0,x0+size)×[y0,y0+size) are returned, so
 * a run straddling a chunk seam is emitted by exactly one chunk.
 */
export function garrisonGateRuns(s: StructSampler, x0: number, y0: number, size: number, isSideGate: (tx: number, ty: number) => boolean): GarrisonGateRun[] {
  const out: GarrisonGateRun[] = [];
  const gate = (tx: number, ty: number): boolean => {
    const t = s.groundAt(tx, ty);
    if (t === undefined) return false;
    const d = doorInfo(t);
    return d !== null && d.material === 'garrison';
  };
  for (let ty = y0; ty < y0 + size; ty++) {
    for (let tx = x0; tx < x0 + size; tx++) {
      if (!gate(tx, ty)) continue;
      if (isSideGate(tx, ty)) {
        out.push({ tx, ty, len: 1, open: barrierGateOpen(s.groundAt(tx, ty)), side: true });
        continue;
      }
      // Anchor = no gate (non-side) to the west.
      if (gate(tx - 1, ty) && !isSideGate(tx - 1, ty)) continue;
      let len = 1;
      while (gate(tx + len, ty) && !isSideGate(tx + len, ty)) len++;
      out.push({ tx, ty, len, open: barrierGateOpen(s.groundAt(tx, ty)), side: false });
    }
  }
  return out;
}

/** World-phase merlon centres along a tile edge (garrisonArt.ts:227). */
export const MERLON_CENTRES: ReadonlyArray<number> = [0.25, 0.75];
/** Merlon plan footprint (garrisonArt.ts:225-226: mw = s·0.34, md = syT·0.34 → 0.34 tiles deep). */
export const MERLON_W = 0.34;
export const MERLON_D = 0.34;
