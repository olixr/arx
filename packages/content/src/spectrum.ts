import {
  CHUNK_SIZE,
  hashString,
  valueNoise,
  type SpectrumAxisWire,
  type SpectrumCoreWire,
  type SpectrumShapeWire,
  type SpectrumStrokeWire,
} from '@arx/shared';

/**
 * THE LIVING GROUND — THE FIELD (docs/contested-lands-plan.md §12).
 *
 * Every ground pixel in Arx is a pure function of (tile id, world
 * coords, salts). This module adds exactly one more pure input to that
 * function: a small vector of smooth world-space scalar FIELDS —
 * season, blight, burn, wear — evaluated from authored STROKES
 * (circles, capsules, rects with a soft hem and a ragged grain) plus
 * live frontier CORES (circles whose radius is a server-clocked ramp).
 *
 * The laws this file keeps:
 *
 *  - NOTHING PER TILE. The stroke is the only serialised thing; the
 *    field is geography, not tile state (TILE IS THE STATE stays whole).
 *  - ZERO IS TODAY. With no stroke in reach every axis is exactly 0 —
 *    the shipped look — and the chunk sig is 0, the fast path. Parity
 *    at zero strokes is byte-identical by construction: the painter
 *    never reads this module when the sig is 0.
 *  - THE SAME MACHINE. Every value here is built from IEEE add, mul,
 *    div, sqrt, floor and round — never Math.hypot or Math.pow, whose
 *    rounding is engine-defined — so two clients (and a future GPU
 *    bake) quantise the same field to the same integer band. Bands
 *    are integers on integer thresholds (u8 51 / 128 / 218): "which
 *    band" is exact on every machine.
 *  - NO CLOCK REACHES A PAINTED VALUE. This module never reads Date or
 *    performance; a live core is projected against a server time the
 *    caller passes in, and its radius is quantised to CORE_STEP.
 *  - REACH ≤ BBOX. A stroke's field is identically 0 outside its reach
 *    box (the shape's bounds grown by the fully-ragged reach), so the
 *    bbox test that gates the chunk sig can never miss a painted tile.
 *  - THE TUTORIAL IS SACRED BY REFUSAL, NOT BY GAIN. Plan §12.2 words
 *    the sacred rect as a gain-0 planned-rect stroke and towns as a low
 *    gain; this module models no gain term (fieldVecAt has no ceiling).
 *    Deliberate deviation: an AUTHORED stroke whose ragged reach box
 *    touches a sacred rect at any amplitude is REFUSED by the validator
 *    (validateSpectrumStrokes, opts.sacred), which is stricter and has
 *    no soft edge to mis-tune. The gap it leaves is LIVE CORES: nothing
 *    here gates a core against the rect, so LG-7's server-side core
 *    derivation MUST clip or refuse any core whose ragged reach box
 *    touches DAWNMEAD_RECT before it reaches setSpectrum. "Towns never
 *    turn fully" has no mechanism yet and is LG-7's to add (a per-rect
 *    gain clamp in fieldVecAt is the literal reading if it is wanted).
 *
 * Plateau then hem: inside r·(1−soft) the stroke is flat at `amp`;
 * from there to r it falls by a smoothstep; past r it is 0. One grain
 * noise field per axis (~22-tile wavelength, the ONE warp field law)
 * rags the effective reach, so a hem is never a compass circle. Per
 * axis, the field is the strongest positive 'max' stroke plus the
 * strongest negative one (season is signed) plus the sum of the 'add'
 * strokes, clamped to the axis range.
 */

// ------------------------------------------------------------ types

export type SpectrumAxis = SpectrumAxisWire;
export type SpectrumShape = SpectrumShapeWire;
/** The authored stroke — the wire shape IS the content shape. */
export type SpectrumStroke = SpectrumStrokeWire;
/** A live frontier core (LG-7 derives them; LG-0 only knows the walk). */
export type SpectrumCore = SpectrumCoreWire;

export const SPECTRUM_AXES: readonly SpectrumAxis[] = ['season', 'blight', 'burn', 'wear'];
export const SPECTRUM_AXIS_COUNT = 4;
const AXIS_INDEX: Readonly<Record<SpectrumAxis, number>> = { season: 0, blight: 1, burn: 2, wear: 3 };

/** Axis index 0..3 for a halo/vector slot. */
export function spectrumAxisIndex(axis: SpectrumAxis): number {
  return AXIS_INDEX[axis];
}

// -------------------------------------------------------- constants

/** The grain noise wavelength in tiles — the ONE warp field law. */
export const GRAIN_WAVELENGTH = 22;
/** At grain 1 the reach rags by up to ±this fraction of itself. */
export const GRAIN_RAG = 0.35;
/** Integer band thresholds on the quantised (u8) magnitude. */
export const BAND_TOUCHED = 51;
export const BAND_TAKEN = 128;
export const BAND_HELD = 218;
/** A live core's radius steps in whole multiples of this (tiles). */
export const CORE_STEP = 2;
/** Validator rails. */
export const STROKE_R_MAX = 160;
export const STROKE_R_MIN = 2;
export const STROKE_PAD_MAX = 160;
export const STROKE_RECT_MAX = 512;
export const SPECTRUM_STROKE_CAP = 64;

/**
 * The halo the painter samples once per chunk bake: the same 36² grid
 * computeLayerIdx builds (the chunk plus a two-tile ring), one signed
 * quantised value (−255..255) per axis per cell, sampled at each
 * tile's CENTRE — the dual-grid vertex the contour machinery runs on.
 * Int16 so the season sign survives beside the exact u8 magnitude.
 */
export const HALO_N = CHUNK_SIZE + 4;
export const HALO_CELLS = HALO_N * HALO_N;
export const HALO_LEN = HALO_CELLS * SPECTRUM_AXIS_COUNT;

/** Index of a halo cell for chunk-local tile (lx, ly) in −2..33. */
export function haloIndex(axis: number, lx: number, ly: number): number {
  return axis * HALO_CELLS + (lx + 2) + (ly + 2) * HALO_N;
}

/** One fresh halo (the caller pools it). */
export function allocHalo(): Int16Array {
  return new Int16Array(HALO_LEN);
}

// ------------------------------------------------ the prepared stroke

/**
 * A stroke with its derived reach box, grain seed and content hash —
 * built once per registry swap so the per-chunk work is a bbox test.
 */
export interface PreparedStroke {
  readonly src: SpectrumStroke;
  readonly axis: number;
  readonly amp: number;
  readonly soft: number;
  readonly grain: number;
  readonly add: boolean;
  /** The reach box (fully ragged), in continuous world tiles. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Content hash of the whole stroke — the sig's atom. */
  readonly hash: number;
}

/** The grain seed of an axis — one warp field per axis, forever. */
const GRAIN_SEED: readonly number[] = SPECTRUM_AXES.map((a) => hashString(`spectrum:grain:${a}`));

/** The nominal reach of a shape (r, or a rect's pad). */
function shapeReach(shape: SpectrumShape): number {
  return shape.kind === 'rect' ? shape.pad : shape.r;
}

/** A stable, key-ordered description — the stroke's identity for the sig. */
export function strokeKey(s: SpectrumStroke): string {
  const sh = s.shape;
  const shape =
    sh.kind === 'circle'
      ? `c:${sh.x},${sh.y},${sh.r}`
      : sh.kind === 'capsule'
        ? `k:${sh.x0},${sh.y0},${sh.x1},${sh.y1},${sh.r}`
        : `r:${sh.x},${sh.y},${sh.w},${sh.h},${sh.pad}`;
  return `${s.id}|${s.axis}|${shape}|${s.amp}|${s.soft}|${s.grain}|${s.mode}|${s.bones ? 1 : 0}`;
}

/**
 * THE SAVE ROAD (mapsApi's spectrum door): a save regenerates the world
 * when a `bones` stroke is anywhere in the change — arriving in the new
 * list OR leaving the old one. A bones stroke that is deleted or flipped
 * to skin-only must take its bones with it: the dead canopy and stumps
 * it regenerated do not belong to a stroke that no longer exists.
 */
export function spectrumSaveRegenerates(
  prior: readonly SpectrumStroke[] | undefined,
  next: readonly SpectrumStroke[] | undefined,
): boolean {
  const has = (l: readonly SpectrumStroke[] | undefined) => (l ?? []).some((s) => s.bones === true);
  return has(prior) || has(next);
}

/** Derive the reach box, seed and hash of every stroke (inert amp-0 strokes are dropped). */
export function prepareStrokes(strokes: readonly SpectrumStroke[]): PreparedStroke[] {
  const out: PreparedStroke[] = [];
  for (const s of strokes) {
    if (!(s.amp !== 0) || !Number.isFinite(s.amp)) continue;
    const reach = shapeReach(s.shape) * (1 + GRAIN_RAG * s.grain);
    let bx0: number;
    let by0: number;
    let bx1: number;
    let by1: number;
    const sh = s.shape;
    if (sh.kind === 'circle') {
      bx0 = sh.x - reach;
      by0 = sh.y - reach;
      bx1 = sh.x + reach;
      by1 = sh.y + reach;
    } else if (sh.kind === 'capsule') {
      bx0 = Math.min(sh.x0, sh.x1) - reach;
      by0 = Math.min(sh.y0, sh.y1) - reach;
      bx1 = Math.max(sh.x0, sh.x1) + reach;
      by1 = Math.max(sh.y0, sh.y1) + reach;
    } else {
      // The rect's tiles are x..x+w−1 and a tile owns [t, t+1), so the
      // plateau is the continuous box [x, x+w) × [y, y+h): every centre
      // of every named tile (+0.5) lies inside it, and the box closes
      // at x+w+reach.
      bx0 = sh.x - reach;
      by0 = sh.y - reach;
      bx1 = sh.x + sh.w + reach;
      by1 = sh.y + sh.h + reach;
    }
    out.push({
      src: s,
      axis: AXIS_INDEX[s.axis],
      amp: s.amp,
      soft: s.soft,
      grain: s.grain,
      add: s.mode === 'add',
      x0: bx0,
      y0: by0,
      x1: bx1,
      y1: by1,
      hash: hashString(strokeKey(s)),
    });
  }
  return out;
}

// ---------------------------------------------------- the field law

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Distance from (x,y) to the shape's core: 0 inside a rect, the spine for a capsule. */
function coreDistance(sh: SpectrumShape, x: number, y: number): number {
  if (sh.kind === 'circle') {
    const dx = x - sh.x;
    const dy = y - sh.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  if (sh.kind === 'capsule') {
    const vx = sh.x1 - sh.x0;
    const vy = sh.y1 - sh.y0;
    const wx = x - sh.x0;
    const wy = y - sh.y0;
    const len2 = vx * vx + vy * vy;
    let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const dx = wx - vx * t;
    const dy = wy - vy * t;
    return Math.sqrt(dx * dx + dy * dy);
  }
  // The rect's tiles own [x, x+w) × [y, y+h) (see prepareStrokes).
  const dx = Math.max(sh.x - x, 0, x - (sh.x + sh.w));
  const dy = Math.max(sh.y - y, 0, y - (sh.y + sh.h));
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * The grain of an axis at a world point: −1..1 value noise at the
 * warp wavelength. One field per axis, shared by every stroke on it,
 * so two strokes' hems rag in step where they meet.
 */
export function grainAt(axis: number, x: number, y: number): number {
  return valueNoise(GRAIN_SEED[axis]!, x / GRAIN_WAVELENGTH, y / GRAIN_WAVELENGTH) * 2 - 1;
}

/**
 * One stroke's unsigned weight at a point: 1 on the plateau, a
 * smoothstep across the hem, 0 past the (ragged) reach. `grain` is
 * the axis's grain value at the point (pass 0 for an unragged read).
 */
export function strokeWeight(p: PreparedStroke, x: number, y: number, grain: number): number {
  const d = coreDistance(p.src.shape, x, y);
  const reach = shapeReach(p.src.shape) * (1 + GRAIN_RAG * p.grain * grain);
  if (reach <= 0) return d > 0 ? 0 : 1;
  const t = d / reach;
  if (t >= 1) return 0;
  const plateau = 1 - p.soft;
  if (t <= plateau) return 1;
  return 1 - smooth((t - plateau) / p.soft);
}

/**
 * The whole field vector at a world point, from a prepared list:
 * `out[axis]` = the strongest positive 'max' stroke + the strongest
 * negative 'max' stroke + the clamped sum of 'add' strokes. Season is
 * clamped to −1..1, every other axis to 0..1. Returns whether any axis
 * is non-zero. Alloc-free.
 */
export function fieldVecAt(list: readonly PreparedStroke[], x: number, y: number, out: Float64Array): boolean {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  if (list.length === 0) return false;
  // Per-axis accumulators — small enough to stay in locals.
  let p0 = 0, p1 = 0, p2 = 0, p3 = 0;
  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
  // The grain is read at most once per axis per point.
  let g0 = 2, g1 = 2, g2 = 2, g3 = 2;
  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) continue;
    let g = 0;
    if (p.grain > 0) {
      const ax = p.axis;
      if (ax === 0) g = g0 === 2 ? (g0 = grainAt(0, x, y)) : g0;
      else if (ax === 1) g = g1 === 2 ? (g1 = grainAt(1, x, y)) : g1;
      else if (ax === 2) g = g2 === 2 ? (g2 = grainAt(2, x, y)) : g2;
      else g = g3 === 2 ? (g3 = grainAt(3, x, y)) : g3;
    }
    const c = p.amp * strokeWeight(p, x, y, g);
    if (c === 0) continue;
    const ax = p.axis;
    if (p.add) {
      if (ax === 0) a0 += c;
      else if (ax === 1) a1 += c;
      else if (ax === 2) a2 += c;
      else a3 += c;
    } else if (c > 0) {
      if (ax === 0) { if (c > p0) p0 = c; }
      else if (ax === 1) { if (c > p1) p1 = c; }
      else if (ax === 2) { if (c > p2) p2 = c; }
      else if (c > p3) p3 = c;
    } else if (ax === 0 && c < n0) n0 = c;
    else if (ax === 1 && c < n1) n1 = c;
    else if (ax === 2 && c < n2) n2 = c;
    else if (ax === 3 && c < n3) n3 = c;
  }
  const s = p0 + n0 + a0;
  out[0] = s > 1 ? 1 : s < -1 ? -1 : s;
  const b = p1 + n1 + a1;
  out[1] = b > 1 ? 1 : b < 0 ? 0 : b;
  const u = p2 + n2 + a2;
  out[2] = u > 1 ? 1 : u < 0 ? 0 : u;
  const w = p3 + n3 + a3;
  out[3] = w > 1 ? 1 : w < 0 ? 0 : w;
  return out[0] !== 0 || out[1] !== 0 || out[2] !== 0 || out[3] !== 0;
}

/** Signed quantisation of a field value to −255..255 (the halo's word). */
export function quant(v: number): number {
  const m = Math.round((v < 0 ? -v : v) * 255);
  const c = m > 255 ? 255 : m;
  return v < 0 ? -c : c;
}

/**
 * The band of a quantised magnitude: 0 untouched | 1 touched |
 * 2 taken | 3 held. Integer thresholds, so every machine agrees; a
 * signed word bands by its magnitude (the painter reads the sign).
 */
export function band(q: number): number {
  const m = q < 0 ? -q : q;
  return m >= BAND_HELD ? 3 : m >= BAND_TAKEN ? 2 : m >= BAND_TOUCHED ? 1 : 0;
}

/** Continuous field of one axis at a point (worldgen's door; allocates nothing after warm-up). */
const VEC_SCRATCH = new Float64Array(SPECTRUM_AXIS_COUNT);
export function fieldAxisAt(list: readonly PreparedStroke[], axis: number, x: number, y: number): number {
  fieldVecAt(list, x, y, VEC_SCRATCH);
  return VEC_SCRATCH[axis]!;
}

// ------------------------------------------------ the chunk's view

/** Does a prepared stroke's reach box touch the halo of chunk (cx,cy)? Tile centres at +0.5. */
export function strokeReachesChunk(p: PreparedStroke, cx: number, cy: number, chunkSize: number): boolean {
  const hx0 = cx * chunkSize - 2 + 0.5;
  const hy0 = cy * chunkSize - 2 + 0.5;
  const hx1 = cx * chunkSize + chunkSize + 1 + 0.5;
  const hy1 = cy * chunkSize + chunkSize + 1 + 0.5;
  return p.x1 >= hx0 && p.x0 <= hx1 && p.y1 >= hy0 && p.y0 <= hy1;
}

/** Every prepared stroke that reaches the chunk's halo, in registry order. */
export function strokesInReach(
  list: readonly PreparedStroke[],
  cx: number,
  cy: number,
  chunkSize: number,
  out: PreparedStroke[],
): PreparedStroke[] {
  out.length = 0;
  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    if (strokeReachesChunk(p, cx, cy, chunkSize)) out.push(p);
  }
  return out;
}

/**
 * The chunk's spectrum signature: a hash over every stroke whose reach
 * box touches its halo, in registry order. 0 means "no stroke in
 * reach" — the fast path, and the ONLY value that means it: a chunk
 * with any reach hashes to a non-zero word by construction.
 */
export function reachSig(list: readonly PreparedStroke[], cx: number, cy: number, chunkSize: number): number {
  let h = 0;
  let any = false;
  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    if (!strokeReachesChunk(p, cx, cy, chunkSize)) continue;
    any = true;
    h = Math.imul(h ^ p.hash, 0x9e3779b1);
    h ^= h >>> 15;
  }
  if (!any) return 0;
  h >>>= 0;
  return h === 0 ? 1 : h;
}

/**
 * Fill a chunk's halo (HALO_LEN words) with the quantised field at every
 * tile centre of the 36² grid. Returns whether any word is non-zero.
 * A zero return leaves `out` all zero. Only strokes in reach are
 * walked; sampling is in WORLD coordinates (baseX + lx + 0.5), so a
 * tile shared by two chunks' halos gets the identical word from both.
 */
export function fillHalo(
  list: readonly PreparedStroke[],
  baseX: number,
  baseY: number,
  chunkSize: number,
  out: Int16Array,
  scratch: PreparedStroke[] = [],
): boolean {
  // The halo grid is sized once, for THE chunk size; a caller that
  // passes another would write past its rows in silence.
  if (chunkSize + 4 !== HALO_N) throw new Error(`fillHalo: chunkSize ${chunkSize} does not fit the ${HALO_N}² halo`);
  out.fill(0);
  const cx = Math.floor(baseX / chunkSize);
  const cy = Math.floor(baseY / chunkSize);
  const reach = strokesInReach(list, cx, cy, chunkSize, scratch);
  if (reach.length === 0) return false;
  let any = false;
  const vec = VEC_SCRATCH;
  for (let ly = -2; ly <= chunkSize + 1; ly++) {
    const wy = baseY + ly + 0.5;
    const row = (ly + 2) * HALO_N + 2;
    for (let lx = -2; lx <= chunkSize + 1; lx++) {
      if (!fieldVecAt(reach, baseX + lx + 0.5, wy, vec)) continue;
      const i = row + lx;
      const s = quant(vec[0]!);
      const b = quant(vec[1]!);
      const u = quant(vec[2]!);
      const w = quant(vec[3]!);
      if (s !== 0 || b !== 0 || u !== 0 || w !== 0) any = true;
      out[i] = s;
      out[i + HALO_CELLS] = b;
      out[i + 2 * HALO_CELLS] = u;
      out[i + 3 * HALO_CELLS] = w;
    }
  }
  return any;
}

/**
 * THE FIELD-AWARE KEY (plan §12.2 cache keys): a hash over the halo's
 * quantised words. Two halos that band identically at every sample
 * hash identically, so a core step that cannot move any sample in a
 * chunk's halo does not re-bake it — reachSig answers "is anything in
 * reach" without building a halo; this answers "did the field I would
 * paint actually change" once one is built. 0 iff every word is 0.
 */
export function haloSig(halo: Int16Array): number {
  let h = 0x811c9dc5;
  let any = false;
  for (let i = 0; i < halo.length; i++) {
    const w = halo[i]!;
    if (w === 0) continue;
    any = true;
    h = Math.imul(h ^ (i + 1), 0x01000193);
    h = Math.imul(h ^ (w & 0xffff), 0x01000193);
  }
  if (!any) return 0;
  h >>>= 0;
  return h === 0 ? 1 : h;
}

// ------------------------------------------------------- live cores

/**
 * Project a live core against a server time: the radius ramps r0→r1
 * across t0→t1 (held at r0 before, r1 after), then snaps to CORE_STEP
 * so every client bakes the same ring. Returns the equivalent circle
 * stroke, or null while the ring has no reach. Pure; the caller owns
 * the clock (a quantised server-offset ticker — never the painter).
 */
export function projectCore(core: SpectrumCore, nowMs: number): SpectrumStroke | null {
  const span = core.t1 - core.t0;
  let u = span > 0 ? (nowMs - core.t0) / span : nowMs >= core.t1 ? 1 : 0;
  if (u < 0) u = 0;
  else if (u > 1) u = 1;
  const raw = core.r0 + (core.r1 - core.r0) * u;
  const r = Math.round(raw / CORE_STEP) * CORE_STEP;
  if (!(r > 0)) return null;
  return {
    id: core.id,
    axis: core.axis,
    shape: { kind: 'circle', x: core.x, y: core.y, r },
    amp: core.amp ?? 1,
    soft: core.soft,
    grain: core.grain ?? 0,
    mode: 'max',
  };
}

/** Every core with reach at `nowMs`, as strokes (registry order). */
export function projectCores(cores: readonly SpectrumCore[], nowMs: number): SpectrumStroke[] {
  const out: SpectrumStroke[] = [];
  for (const c of cores) {
    const s = projectCore(c, nowMs);
    if (s) out.push(s);
  }
  return out;
}

// ---------------------------------------------- the content registry

/**
 * THE LIVE REGISTRY (the geography law): refilled in place by
 * replaceGeography → replaceSpectrum; every query reads it at call
 * time. Worldgen's `bones` reads and the server's wire snapshot come
 * from here. The client's painter keeps its OWN registry
 * (render/fold.ts) fed by the wire, so a bake never reads a registry
 * mid-swap.
 */
export const SPECTRUM_STROKES: readonly SpectrumStroke[] = [];
let PREPARED: PreparedStroke[] = [];
let EPOCH = 0;

function copyShape(sh: SpectrumShape): SpectrumShape {
  return { ...sh };
}

/** A deep copy of a stroke (the wire and the snapshot never alias the registry). */
export function copyStroke(s: SpectrumStroke): SpectrumStroke {
  return {
    id: s.id,
    axis: s.axis,
    shape: copyShape(s.shape),
    amp: s.amp,
    soft: s.soft,
    grain: s.grain,
    mode: s.mode,
    ...(s.bones ? { bones: true } : {}),
  };
}

/** Swap the authored stroke registry live (skin-only unless a caller regenerates). */
export function replaceSpectrum(strokes: readonly SpectrumStroke[]): void {
  const arr = SPECTRUM_STROKES as SpectrumStroke[];
  arr.length = 0;
  for (const s of strokes) arr.push(copyStroke(s));
  PREPARED = prepareStrokes(arr);
  EPOCH++;
}

/** A deep working copy of the live strokes. */
export function spectrumSnapshot(): SpectrumStroke[] {
  return SPECTRUM_STROKES.map(copyStroke);
}

/** The prepared view of the live registry (read only; replaced whole on swap). */
export function spectrumPrepared(): readonly PreparedStroke[] {
  return PREPARED;
}

/** Bumps on every swap — a cache keyed on it can never outlive the registry. */
export function spectrumEpoch(): number {
  return EPOCH;
}

/** The live field of one axis at a world point (0 everywhere with no strokes). */
export function spectrumAt(axis: SpectrumAxis, x: number, y: number): number {
  return fieldAxisAt(PREPARED, AXIS_INDEX[axis], x, y);
}

// -------------------------------------------------------- validator

export interface SacredRect {
  name: string;
  rect: { x: number; y: number; w: number; h: number };
}

export interface SpectrumValidateOpts {
  /** The id law (the geography validator's GEO_ID_RE). */
  idRe: RegExp;
  /** Rects no stroke may reach into at amp ≠ 0 (THE TUTORIAL IS SACRED). */
  sacred?: readonly SacredRect[];
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function isUnit(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

/**
 * Vet a raw `spectrum` list into strokes, collecting every error (the
 * geography validator's pattern: structural truth, every subject
 * named). `undefined` is an old doc with no strokes and validates to
 * []; any other non-array is a corruption, never an empty list.
 */
export function validateSpectrumStrokes(
  raw: unknown,
  opts: SpectrumValidateOpts,
): { strokes: SpectrumStroke[]; errors: string[] } {
  const errors: string[] = [];
  const strokes: SpectrumStroke[] = [];
  if (raw === undefined) return { strokes, errors };
  if (!Array.isArray(raw)) {
    errors.push('spectrum must be an array');
    return { strokes, errors };
  }
  if (raw.length > SPECTRUM_STROKE_CAP) {
    errors.push(`spectrum holds ${raw.length} strokes — the plan carries at most ${SPECTRUM_STROKE_CAP}`);
  }
  const vetKeys = (obj: object, known: readonly string[], at: string): void => {
    for (const key of Object.keys(obj)) {
      if (!known.includes(key)) errors.push(`${at} has unknown field '${key}'`);
    }
  };
  const seen = new Set<string>();
  for (const [i, s] of raw.entries()) {
    const at = `spectrum[${i}]`;
    if (!s || typeof s !== 'object') {
      errors.push(`${at} must be an object`);
      continue;
    }
    const st = s as Record<string, unknown>;
    if (typeof st.id !== 'string' || !opts.idRe.test(st.id)) {
      errors.push(`${at}.id must match ${opts.idRe}`);
      continue;
    }
    const id = st.id;
    const tag = `spectrum '${id}'`;
    if (seen.has(id)) errors.push(`duplicate spectrum id '${id}'`);
    seen.add(id);
    vetKeys(st, ['id', 'axis', 'shape', 'amp', 'soft', 'grain', 'mode', 'bones'], tag);
    let bad = false;
    const axis = st.axis;
    if (typeof axis !== 'string' || !(axis in AXIS_INDEX)) {
      errors.push(`${tag}.axis must be one of ${SPECTRUM_AXES.join('|')}`);
      bad = true;
    }
    // The shape.
    const sh = st.shape as Record<string, unknown> | null | undefined;
    let shape: SpectrumShape | null = null;
    if (!sh || typeof sh !== 'object') {
      errors.push(`${tag}.shape must be an object`);
      bad = true;
    } else if (sh.kind === 'circle') {
      vetKeys(sh, ['kind', 'x', 'y', 'r'], `${tag}.shape`);
      if (!isInt(sh.x) || !isInt(sh.y) || !isInt(sh.r) || sh.r < STROKE_R_MIN || sh.r > STROKE_R_MAX) {
        errors.push(`${tag} circle needs integer x,y and r in [${STROKE_R_MIN}, ${STROKE_R_MAX}]`);
        bad = true;
      } else shape = { kind: 'circle', x: sh.x, y: sh.y, r: sh.r };
    } else if (sh.kind === 'capsule') {
      vetKeys(sh, ['kind', 'x0', 'y0', 'x1', 'y1', 'r'], `${tag}.shape`);
      if (
        !isInt(sh.x0) || !isInt(sh.y0) || !isInt(sh.x1) || !isInt(sh.y1) ||
        !isInt(sh.r) || sh.r < STROKE_R_MIN || sh.r > STROKE_R_MAX
      ) {
        errors.push(`${tag} capsule needs integer x0,y0,x1,y1 and r in [${STROKE_R_MIN}, ${STROKE_R_MAX}]`);
        bad = true;
      } else if (sh.x0 === sh.x1 && sh.y0 === sh.y1) {
        errors.push(`${tag} capsule ends coincide — draw a circle`);
        bad = true;
      } else shape = { kind: 'capsule', x0: sh.x0, y0: sh.y0, x1: sh.x1, y1: sh.y1, r: sh.r };
    } else if (sh.kind === 'rect') {
      vetKeys(sh, ['kind', 'x', 'y', 'w', 'h', 'pad'], `${tag}.shape`);
      if (
        !isInt(sh.x) || !isInt(sh.y) || !isInt(sh.w) || !isInt(sh.h) ||
        sh.w < 1 || sh.h < 1 || sh.w > STROKE_RECT_MAX || sh.h > STROKE_RECT_MAX ||
        !isInt(sh.pad) || sh.pad < 0 || sh.pad > STROKE_PAD_MAX
      ) {
        errors.push(
          `${tag} rect needs integer x,y, w,h in [1, ${STROKE_RECT_MAX}] and pad in [0, ${STROKE_PAD_MAX}]`,
        );
        bad = true;
      } else shape = { kind: 'rect', x: sh.x, y: sh.y, w: sh.w, h: sh.h, pad: sh.pad };
    } else {
      errors.push(`${tag}.shape.kind must be circle|capsule|rect`);
      bad = true;
    }
    // The numbers.
    const amp = st.amp;
    if (typeof amp !== 'number' || !Number.isFinite(amp)) {
      errors.push(`${tag}.amp must be a finite number`);
      bad = true;
    } else if (axis === 'season' ? amp < -1 || amp > 1 : amp < 0 || amp > 1) {
      errors.push(
        axis === 'season'
          ? `${tag}.amp must lie in [-1, 1] (season is the one signed axis)`
          : `${tag}.amp must lie in [0, 1] — only season carries a sign`,
      );
      bad = true;
    }
    if (!isUnit(st.soft)) {
      errors.push(`${tag}.soft must lie in [0, 1]`);
      bad = true;
    }
    if (!isUnit(st.grain)) {
      errors.push(`${tag}.grain must lie in [0, 1]`);
      bad = true;
    }
    if (st.mode !== 'max' && st.mode !== 'add') {
      errors.push(`${tag}.mode must be 'max' or 'add'`);
      bad = true;
    }
    if (st.bones !== undefined && typeof st.bones !== 'boolean') {
      errors.push(`${tag}.bones must be a boolean (or absent)`);
      bad = true;
    }
    if (bad || !shape) continue;
    const stroke: SpectrumStroke = {
      id,
      axis: axis as SpectrumAxis,
      shape,
      amp: amp as number,
      soft: st.soft as number,
      grain: st.grain as number,
      mode: st.mode as 'max' | 'add',
      ...(st.bones ? { bones: true } : {}),
    };
    // THE TUTORIAL IS SACRED: a stroke's ragged reach may not enter a
    // sacred rect while it carries any amplitude. Measured on the
    // reach box, so a hem that could touch the rect is refused too.
    if (stroke.amp !== 0 && opts.sacred) {
      const [p] = prepareStrokes([stroke]);
      if (p) {
        for (const { name, rect } of opts.sacred) {
          // The rect's tiles own the continuous box [x, x+w) × [y, y+h);
          // the reach box is closed, so touching the edge counts.
          const rx1 = rect.x + rect.w;
          const ry1 = rect.y + rect.h;
          if (p.x1 < rect.x || p.x0 > rx1 || p.y1 < rect.y || p.y0 > ry1) continue;
          const inW = Math.min(p.x1, rx1) - Math.max(p.x0, rect.x);
          const inH = Math.min(p.y1, ry1) - Math.max(p.y0, rect.y);
          errors.push(
            `${tag} overlaps the ${name} rect by ${Math.ceil(inW)}×${Math.ceil(inH)} tiles at amp ${stroke.amp} ` +
              `(its ragged reach box spans x ${Math.floor(p.x0)}..${Math.ceil(p.x1)}, y ${Math.floor(p.y0)}..${Math.ceil(p.y1)}) — ` +
              `THE TUTORIAL IS SACRED: pull the stroke back past its ragged hem, or park it at amp 0`,
          );
          break;
        }
      }
    }
    strokes.push(stroke);
  }
  return { strokes, errors };
}
