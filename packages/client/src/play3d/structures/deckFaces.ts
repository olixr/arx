/**
 * THE DECK STANDS ON ITS LEGS (play3d W2, TERRAIN-FORMS lane) — docks,
 * bridges and porches as lifted slabs with painted faces.
 *
 * The 2D bakes a lifted deck by shifting its plank kit up-screen by
 * DOCK_LIFT and hanging a fascia band in the tile's bottom rows
 * (terrain.ts drawDocks / drawBridges / drawPorchDecks). The 3D ground
 * inherits that bake flat, so here the deck becomes what the bake only
 * implied: a slab at DOCK_LIFT (+ the tile's elevation lift) whose top
 * wears its own boards, a rim joist on every EXPOSED edge, driven
 * piles on water-facing spans, aprons that ramp onto the bank, 45°
 * notch fills, and a porch ashore with its full-lift fascia.
 *
 * Laws:
 *  - THE PORTABLE PREDICATES RULE. Whether a dock/bridge lifts is the
 *    whole-structure flood verdict (terrain.ts isDockTile /
 *    isBridgeTile over the LIVE world — the same sampler and memo the
 *    ground bake used, so slab and boards agree); exposure honours a
 *    notch fill welded to an edge (fillCoversEdge); the walk axis is
 *    one verdict per span (deckWalkIsVertical); aprons obey THE APRON
 *    LAW (bridgeApronAt); the board rhythm follows THE ARM LAW
 *    (deckArmVertical); the porch is isPorchSurface (carried tiles
 *    keep their decking).
 *  - THE JETTY IS HOLLOW: over water the slab is a JOIST_H-thick rim
 *    on piles, with air beneath it down to the water — the honest
 *    "placed over" read. Where an edge meets LAND at grade (a dock
 *    root, a bridge threshold, every porch edge) the fascia runs to
 *    the ground: the structure is seated, not floating.
 *  - THE APRON POURS: a bridge's walk-end tile slopes from grade at
 *    the land edge to DOCK_LIFT at the deck edge (the 2D shears its
 *    kit the same way). `deckLiftAt` is the pure foot-height answer
 *    (feet and boards agree by construction); ground.ts `heightAt`
 *    adds it, so bodies, props and lamps stand ON the boards.
 *  - THE STRIP IS SHARED: board tops are 4-tile strips keyed by
 *    (family, rhythm, variant); the variant follows the world ROW
 *    (E-W planks) so neighbouring rows differ and a run reads as long
 *    planks with a butt joint every four tiles.
 *  - Painters: `paintDeckPile` (exported from terrain.ts) paints the
 *    pile card; boards and rim are re-emitted from paintDeckBoards
 *    (module-private) and the south-face rim block, flat (no 2.5D
 *    foreshortening). `paintDeckSideFascia` is the 2D's EDGE-ON rim
 *    sliver (a px·0.06 strip for the top-down view) and is not a face
 *    texture; the rim band here is the face it implied.
 *  - Tones lifted a stop (faceTone.litTone).
 *
 * Pure parts (plan, lift, keys) carry no DOM and are tested.
 */
import { Tile, WALL_RUN_TILES, hashCoords, tileDef } from '@arx/shared';
import {
  DOCK_LIFT,
  bridgeApronAt,
  deckArmVertical,
  deckFillAt,
  deckWalkIsVertical,
  fillContains,
  fillCoversEdge,
  isDeckGround,
  isDeckTile,
  isPorchSurface,
  isWaterTile,
  paintDeckPile,
  type BridgeApron,
  type DeckFill,
  type GroundSampler,
} from '../../render/terrain.js';
import { shade } from '../../render/tint.js';
import { FACE_PX } from './faceAtlas.js';
import { litTone } from './faceTone.js';

/** Rim joist thickness over water (tiles): the slab's visible timber. */
export const JOIST_H = 0.12;
/** How far a pile is driven below the water plane (tiles). */
export const PILE_DRIVE = 0.3;
/** Pile widths (tiles): dock 0.11, bridge 0.13 (terrain.ts pw). */
export const PILE_W: Record<DeckFamily, number> = { dock: 0.11, bridge: 0.13, porch: 0.1 };
/** Board strips span this many tiles. */
export const DECK_PERIOD = 4;
export const DECK_VARIANTS = 4;
/** Kerb stringer along a bridge's exposed sides: width and height (tiles). */
export const KERB_W = 0.1;
export const KERB_H = 0.07;
/** A land threshold's stone step: depth onto the bank and rise (fraction of lift). */
export const STEP_D = 0.4;

export type DeckFamily = 'dock' | 'bridge' | 'porch';

/** The 2D palettes (terrain.ts, module-private there; restated). */
export const DOCK_TONES: readonly string[] = ['#9c7a4a', '#92714a', '#a5834f', '#8a683c'];
export const BRIDGE_TONES: readonly string[] = ['#997a50', '#8e7049', '#a28356', '#856a44'];
export const BRIDGE_TIMBER = { rim: '#5c4527', pile: '#4a3620', pileLit: '#6d5233', sill: '#7b5d38' } as const;
export const DOCK_RIM = '#6d5130';
export const DOCK_PILE = '#4e3a22';
export const DOCK_PILE_LIT = '#77593a';
export const PORCH_RIM_DEFAULT = '#856a44';
export const STONE_STEP = '#8c8798';

export interface DeckPlan {
  tx: number;
  ty: number;
  family: DeckFamily;
  /** Edge covered by deck (or a fill welded to it): no face there. */
  hasN: boolean;
  hasS: boolean;
  hasE: boolean;
  hasW: boolean;
  /** Bare land beyond the edge (not deck, not water). */
  landN: boolean;
  landS: boolean;
  landE: boolean;
  landW: boolean;
  waterN: boolean;
  waterS: boolean;
  waterE: boolean;
  waterW: boolean;
  /** Walk axis runs N-S (one verdict per span). */
  vertRun: boolean;
  /** Board rhythm turns (THE ARM LAW). */
  armVert: boolean;
  apron: BridgeApron;
  /** A wall stands north (the deck butts a building). */
  wallN: boolean;
  /** The porch opens onto walkable ground to the south (tread step). */
  treadS: boolean;
}

const isLand = (t: number | undefined): boolean => t !== undefined && !isDeckGround(t) && !isWaterTile(t);

/**
 * Plan one LIFTED deck tile (dock/bridge of a water-touching structure,
 * or a porch surface). Null for everything else — flat corduroy roads
 * far from water are the ground's business.
 */
export function planDeckTile(ground: GroundSampler, tx: number, ty: number, axisMemo?: Map<number, boolean>): DeckPlan | null {
  const t = ground(tx, ty);
  const nT = ground(tx, ty - 1);
  const sT = ground(tx, ty + 1);
  const eT = ground(tx + 1, ty);
  const wT = ground(tx - 1, ty);
  if (isDeckGround(t)) {
    if (!isDeckTile(ground, tx, ty)) return null;
    const family: DeckFamily = t === Tile.Bridge ? 'bridge' : 'dock';
    const deckN = isDeckGround(nT);
    const deckS = isDeckGround(sT);
    const deckE = isDeckGround(eT);
    const deckW = isDeckGround(wT);
    let vertRun = axisMemo?.get(tx * 100000 + ty);
    if (vertRun === undefined) vertRun = deckWalkIsVertical(ground, tx, ty, axisMemo);
    return {
      tx,
      ty,
      family,
      hasN: deckN || fillCoversEdge(ground, tx, ty - 1, 'S'),
      hasS: deckS || fillCoversEdge(ground, tx, ty + 1, 'N'),
      hasE: deckE || fillCoversEdge(ground, tx + 1, ty, 'W'),
      hasW: deckW || fillCoversEdge(ground, tx - 1, ty, 'E'),
      landN: !deckN && isLand(nT),
      landS: !deckS && isLand(sT),
      landE: !deckE && isLand(eT),
      landW: !deckW && isLand(wT),
      waterN: isWaterTile(nT),
      waterS: isWaterTile(sT),
      waterE: isWaterTile(eT),
      waterW: isWaterTile(wT),
      vertRun,
      armVert: deckArmVertical(ground, tx, ty),
      apron: family === 'bridge' ? bridgeApronAt(ground, tx, ty, vertRun) : 'none',
      wallN: nT !== undefined && WALL_RUN_TILES.includes(nT as Tile),
      treadS: false,
    };
  }
  if (isPorchSurface(ground, tx, ty)) {
    const hasN = isPorchSurface(ground, tx, ty - 1);
    const hasS = isPorchSurface(ground, tx, ty + 1);
    const hasE = isPorchSurface(ground, tx + 1, ty);
    const hasW = isPorchSurface(ground, tx - 1, ty);
    const armVert = porchArm(ground, tx, ty);
    return {
      tx,
      ty,
      family: 'porch',
      hasN,
      hasS,
      hasE,
      hasW,
      landN: !hasN && isLand(nT),
      landS: !hasS && isLand(sT),
      landE: !hasE && isLand(eT),
      landW: !hasW && isLand(wT),
      waterN: isWaterTile(nT),
      waterS: isWaterTile(sT),
      waterE: isWaterTile(eT),
      waterW: isWaterTile(wT),
      vertRun: armVert,
      armVert,
      apron: 'none',
      wallN: nT !== undefined && WALL_RUN_TILES.includes(nT as Tile),
      treadS: !hasS && sT !== undefined && !tileDef(sT).solid && sT !== Tile.PorchDeck,
    };
  }
  return null;
}

/** THE ARM LAW measured on the porch's own surface (drawPorchDecks porchArm, re-emitted). */
export function porchArm(ground: GroundSampler, ax: number, ay: number): boolean {
  const CAP = 12;
  let rx = 1;
  let ry = 1;
  for (let i = 1; i <= CAP && isPorchSurface(ground, ax - i, ay); i++) rx++;
  for (let i = 1; i <= CAP && isPorchSurface(ground, ax + i, ay); i++) rx++;
  for (let i = 1; i <= CAP && isPorchSurface(ground, ax, ay - i); i++) ry++;
  for (let i = 1; i <= CAP && isPorchSurface(ground, ax, ay + i); i++) ry++;
  if (ry !== rx) return ry > rx;
  return false;
}

/**
 * Lift of a deck's top at a point inside its tile (fx, fy in 0..1):
 * DOCK_LIFT, sloping to grade across an apron toward its land edge.
 */
export function apronLift(apron: BridgeApron, fx: number, fy: number, lift = DOCK_LIFT): number {
  switch (apron) {
    case 'N':
      return lift * fy;
    case 'S':
      return lift * (1 - fy);
    case 'W':
      return lift * fx;
    case 'E':
      return lift * (1 - fx);
    case 'none':
      return lift;
  }
}

/** The walk-axis memo for per-frame callers, world-keyed with the 2D's 5 s flush (terrain.ts deckLiftMemo pattern). */
let axisMemoShared = new Map<number, boolean>();
let axisMemoFlushAt = 0;
function sharedAxisMemo(): Map<number, boolean> {
  const now = performance.now();
  if (now - axisMemoFlushAt > 5000) {
    axisMemoShared = new Map();
    axisMemoFlushAt = now;
  }
  return axisMemoShared;
}

/**
 * THE FOOT-HEIGHT ANSWER: the deck lift under a world point — 0 off
 * any lifted deck, DOCK_LIFT on one, sloped across an apron, DOCK_LIFT
 * inside a 45° notch fill and on every porch surface. Pure; the ground
 * streamer adds it to `heightAt` so bodies stand on the boards. The
 * walk-axis flood is memoized (world-keyed, 5 s flush) for the
 * per-frame callers; a build passes its own memo.
 */
export function deckLiftAt(ground: GroundSampler, wx: number, wy: number, axisMemo: Map<number, boolean> = sharedAxisMemo()): number {
  const tx = Math.floor(wx);
  const ty = Math.floor(wy);
  const t = ground(tx, ty);
  if (isDeckGround(t)) {
    if (!isDeckTile(ground, tx, ty)) return 0;
    if (t !== Tile.Bridge) return DOCK_LIFT;
    let vert = axisMemo.get(tx * 100000 + ty);
    if (vert === undefined) vert = deckWalkIsVertical(ground, tx, ty, axisMemo);
    return apronLift(bridgeApronAt(ground, tx, ty, vert), wx - tx, wy - ty);
  }
  if (isPorchSurface(ground, tx, ty)) return DOCK_LIFT;
  const f = deckFillAt(ground, tx, ty);
  if (f !== null && fillContains(f.legs, tx, ty, wx, wy)) return DOCK_LIFT;
  return 0;
}

/** The notch fill at a tile, if any (re-exported through the plan seam). */
export function fillAt(ground: GroundSampler, tx: number, ty: number): DeckFill | null {
  return deckFillAt(ground, tx, ty);
}

// --------------------------------------------------------------- keys

/** Board strip variant: E-W planks vary by world row, N-S rhythm by column. */
export function deckStripVariant(family: DeckFamily, armVert: boolean, tx: number, ty: number): number {
  return hashCoords(173, armVert ? tx : ty, family === 'bridge' ? 1 : family === 'porch' ? 2 : 0) % DECK_VARIANTS;
}

export function deckTopKey(family: DeckFamily, armVert: boolean, variant: number, skin: string): string {
  return `deck/top/${family}/${armVert ? 'v' : 'h'}/${variant}/${skin}`;
}

export function deckRimKey(family: DeckFamily, tall: boolean, skin: string): string {
  return `deck/rim/${family}/${tall ? 'seat' : 'joist'}/${skin}`;
}

export function deckPileKey(family: DeckFamily, seed: number): string {
  return `deck/pile/${family}/${seed % 3}`;
}

/** Position within a board strip, 0..1 (negative coordinates wrap). */
export function deckStripU(coord: number): number {
  const m = ((coord % DECK_PERIOD) + DECK_PERIOD) % DECK_PERIOD;
  return m / DECK_PERIOD;
}

// ----------------------------------------------------------- painters

export interface DeckTopSpec {
  family: DeckFamily;
  armVert: boolean;
  variant: number;
  /** Porch: the house's floor tones; null = the family palette. */
  tones: readonly string[] | null;
}

/** Strip size: DECK_PERIOD × 1 tiles at FACE_PX. */
export function deckTopSize(s = FACE_PX): { w: number; h: number } {
  return { w: Math.round(DECK_PERIOD * s), h: Math.round(s) };
}

/**
 * Board strip, flat (no foreshortening): paintDeckBoards re-emitted —
 * five plank rows, long planks for an E-W walk, brick-bonded cross
 * boards for a N-S rhythm, butt joints with a hand-sawn lean, nail
 * pips and the odd grain tick. Strip-local x 0..DECK_PERIOD stands in
 * for world x; a butt joint closes the strip at both ends.
 */
export function paintDeckTopStrip(ctx: CanvasRenderingContext2D, w: number, h: number, spec: DeckTopSpec): void {
  const { family, armVert, variant } = spec;
  const P = DECK_PERIOD;
  const px = h;
  const seam = Math.max(1, px * 0.02);
  const raw = spec.tones ?? (family === 'bridge' ? BRIDGE_TONES : DOCK_TONES);
  const tones = raw.map((t) => litTone(t));
  ctx.fillStyle = litTone(family === 'bridge' ? '#54402a' : family === 'porch' ? '#574128' : '#5a4326');
  ctx.fillRect(0, 0, w, h);
  const ROWS = 5;
  const frac = (r: number): number => r / ROWS;
  const wobAt = (r: number, wx: number): number =>
    px * 0.014 * Math.sin(wx * 1.9 + (variant * ROWS + r) * 2.17) * Math.sin(Math.PI * frac(r));
  const yT = (r: number, wx: number): number => frac(r) * px + wobAt(r, wx);
  const sx = (wx: number): number => (wx / P) * w;
  for (let r = 0; r < ROWS; r++) {
    const rowW = variant * ROWS + r;
    const hL = hashCoords(163, rowW, 0);
    const len = armVert ? 1 : 1.5 + (hL % 3) * 0.35;
    const phase = armVert ? (rowW % 2) * 0.5 + ((hL >>> 4) % 13) / 100 : (((hL >>> 4) % 97) / 97) * len;
    let u0 = 0;
    const si1 = Math.floor((P + phase) / len);
    for (let si = Math.floor(phase / len); si <= si1; si++) {
      const segEnd = (si + 1) * len - phase;
      const u1 = Math.min(P, segEnd);
      if (u1 - u0 > 0.01) {
        ctx.fillStyle = tones[hashCoords(165, rowW, si) % 4]!;
        ctx.beginPath();
        ctx.moveTo(sx(u0), yT(r, u0));
        ctx.lineTo(sx(u1), yT(r, u1));
        ctx.lineTo(sx(u1), yT(r + 1, u1) - seam);
        ctx.lineTo(sx(u0), yT(r + 1, u0) - seam);
        ctx.closePath();
        ctx.fill();
      }
      if (segEnd > 0.02 && segEnd < P - 0.02) {
        const xj = sx(segEnd);
        const lean = ((hashCoords(167, rowW, si) % 5) - 2) * px * 0.008;
        ctx.strokeStyle = 'rgba(40, 26, 14, 0.55)';
        ctx.lineWidth = Math.max(1, px * 0.022);
        ctx.beginPath();
        ctx.moveTo(xj + lean, yT(r, segEnd) + seam * 0.5);
        ctx.lineTo(xj - lean, yT(r + 1, segEnd) - seam * 1.2);
        ctx.stroke();
      }
      u0 = u1;
    }
    // Nail pips and grain ticks, one station per tile.
    for (let tx = 0; tx < P; tx++) {
      const hN = hashCoords(169, rowW, tx + variant * 11);
      if (hN % 3 === 0) {
        const fx = 0.22 + ((hN >>> 3) % 2) * 0.56 + ((hN >>> 5) % 13) / 100;
        const ny = (yT(r, tx + fx) + yT(r + 1, tx + fx)) / 2;
        const np = Math.max(1, px * 0.02);
        ctx.fillStyle = 'rgba(30, 20, 10, 0.4)';
        ctx.fillRect(sx(tx + fx) - np / 2, ny - np / 2, np, np);
      }
      if (hN % 7 === 3) {
        const fx0 = ((hN >>> 6) % 60) / 100;
        const fw = 0.14 + ((hN >>> 9) % 20) / 100;
        const fy = 0.3 + ((hN >>> 11) % 40) / 100;
        const gy0 = yT(r, tx + fx0) + (frac(r + 1) - frac(r)) * px * fy;
        ctx.strokeStyle = 'rgba(46, 30, 16, 0.3)';
        ctx.lineWidth = Math.max(1, px * 0.014);
        ctx.beginPath();
        ctx.moveTo(sx(tx + fx0), gy0);
        ctx.lineTo(sx(tx + Math.min(fx0 + fw, 1)), gy0);
        ctx.stroke();
      }
    }
  }
  // The strip's own butt joint at both ends (planks change at x = 0).
  ctx.fillStyle = 'rgba(40, 26, 14, 0.5)';
  ctx.fillRect(0, 0, Math.max(1, px * 0.02), h);
}

export interface DeckRimSpec {
  family: DeckFamily;
  /** Seated (full lift to the ground, footing blocks) vs the joist over water. */
  tall: boolean;
  /** Porch: the house fascia tone; null = family rim. */
  tone: string | null;
}

/** Rim strip size: DECK_PERIOD tiles wide at 2·FACE_PX density (a thin band needs rows). */
export function deckRimSize(tall: boolean, s = FACE_PX * 2): { w: number; h: number } {
  return { w: Math.round(DECK_PERIOD * s), h: Math.max(6, Math.round((tall ? DOCK_LIFT : JOIST_H) * s)) };
}

/**
 * The rim joist face: the deck's visible timber thickness (drawBridges'
 * south face re-emitted flat) — weathered board, catch-light lip,
 * under-deck shadow foot, support ticks at the pile stations, a rim
 * joint where the world says the board breaks; a seated rim adds the
 * porch's footing blocks.
 */
export function paintDeckRim(ctx: CanvasRenderingContext2D, w: number, h: number, spec: DeckRimSpec): void {
  const P = DECK_PERIOD;
  const px = w / P;
  const base = spec.tone ?? (spec.family === 'bridge' ? BRIDGE_TIMBER.rim : DOCK_RIM);
  const rim = spec.family === 'porch' ? shade(base, -26) : base;
  ctx.fillStyle = litTone(rim);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = spec.family === 'porch' ? litTone(shade(base, -8)) : 'rgba(222, 184, 122, 0.32)';
  ctx.fillRect(0, 0, w, Math.max(1, h * 0.18));
  ctx.fillStyle = 'rgba(20, 14, 7, 0.42)';
  ctx.fillRect(0, h - Math.max(1.5, h * 0.16), w, Math.max(1.5, h * 0.16));
  for (let tx = 0; tx < P; tx++) {
    const gx = tx * px;
    if (spec.family !== 'porch') {
      ctx.fillStyle = 'rgba(24, 16, 8, 0.28)';
      for (const fpos of [0.18, 0.82]) ctx.fillRect(gx + fpos * px - px * 0.02, 0, px * 0.04, h);
    }
    const hj = hashCoords(171, tx, spec.tall ? 1 : 0);
    if (hj % 3 === 0) {
      const fx = 0.2 + ((hj >>> 4) % 60) / 100;
      ctx.fillStyle = 'rgba(30, 20, 10, 0.35)';
      ctx.fillRect(gx + fx * px, 0, Math.max(1, px * 0.02), h);
    }
    if (spec.tall && spec.family === 'porch') {
      // Squared footing blocks carrying the rim to the ground.
      for (const fpos of [0.16, 0.84] as const) {
        const bw = px * 0.12;
        ctx.fillStyle = litTone(shade(base, -34));
        ctx.fillRect(gx + fpos * px - bw / 2, h * 0.55, bw, h * 0.45);
      }
    }
  }
}

export interface DeckPileSpec {
  family: DeckFamily;
  seed: number;
  /** The deck top's lift above the water plane (tiles). */
  lift: number;
}

/** Pile card size: the pile's width × its driven length at 2·FACE_PX. */
export function deckPileSize(family: DeckFamily, lift: number, s = FACE_PX * 2): { w: number; h: number } {
  return { w: Math.max(4, Math.round(PILE_W[family] * s)), h: Math.max(8, Math.round((lift - JOIST_H + PILE_DRIVE) * s)) };
}

/** Row of the water plane in a pile face: the leg above it is air-side, below it driven. */
export function pilePlaneRow(lift: number, h: number): number {
  const above = Math.max(0, lift - JOIST_H);
  return (h * above) / (above + PILE_DRIVE);
}

/**
 * One pile face through terrain.ts paintDeckPile: the leg from the
 * joist underside to the driven foot, its waterline collar landing on
 * the water-plane row (the 3D water surface), sun-law lit strip.
 */
export function paintPileFace(ctx: CanvasRenderingContext2D, w: number, h: number, spec: DeckPileSpec): void {
  const body = litTone(spec.family === 'bridge' ? BRIDGE_TIMBER.pile : DOCK_PILE);
  const lit = litTone(spec.family === 'bridge' ? BRIDGE_TIMBER.pileLit : DOCK_PILE_LIT);
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = lit;
  ctx.fillRect(0, 0, Math.max(1, w * 0.3), h);
  // paintDeckPile's foot lands at top + px·(0.34 + (seed % 3)·0.045):
  // pick px so the foot (and its collar) sits on the plane row.
  const driveFrac = 0.34 + (spec.seed % 3) * 0.045;
  const px = Math.max(1, pilePlaneRow(spec.lift, h) / driveFrac);
  paintDeckPile(ctx, w / 2, 0, px, w, spec.seed, body, lit);
}

/** A flat tone tile (kerbs, steps). */
export function paintFlatTone(ctx: CanvasRenderingContext2D, w: number, h: number, tone: string): void {
  ctx.fillStyle = litTone(tone);
  ctx.fillRect(0, 0, w, h);
}
