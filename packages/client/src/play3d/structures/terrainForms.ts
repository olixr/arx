/**
 * THE TERRAIN FORMS LANE (play3d W2) — OWNER: the TERRAIN-FORMS lane.
 *
 * Decks and cliffs as geometry with painted faces, in one builder:
 *
 *  - CLIFFS (cliffFaces.ts): the heightfield's own step faces are read
 *    back through `collectStepFaces` (THE SAME FACES, LISTED), merged
 *    into straight runs, and each run wears a periodic cliff strip
 *    from the face atlas — the 2D coursing law re-emitted, brow
 *    sampled from the plateau, courses stacked per level. THE CURTAIN
 *    HANGS A HAIR PROUD of the placeholder face (eps lean) since the
 *    ground mesh keeps one material; exposed run ends extend so
 *    corners close. Ramps' exposed sides are the same faces, sloped.
 *  - DECKS (deckFaces.ts): every lifted dock / bridge / porch tile
 *    becomes a slab: boards on top (a shared 4-tile strip), a rim
 *    joist on exposed edges (a seated fascia where the edge meets land
 *    at grade or on a porch), driven piles on water-facing spans
 *    (terrain.ts paintDeckPile), aprons sloping onto the bank, kerb
 *    stringers along a bridge's sides, stone thresholds at land ends,
 *    the porch's tread step, and 45° notch fills. THE JETTY IS HOLLOW:
 *    air under the joist down to the water.
 *
 * Contract: deck predicates read the LIVE world (`ctx.world.groundAt`)
 * — the same sampler and memo the ground bake used, so slab and
 * boards agree; cliffs read the bordered snapshot (`ctx.sampler`),
 * the heightfield's own elev/ramp answers. Everything lands in the
 * 'opaque' bucket: one draw per chunk per atlas page.
 *
 * Known gaps (docs/play3d-plan.md §W2 TERRAIN-FORMS): the ground
 * bake's up-shifted boards still show under a hollow jetty; bridge
 * rails are the renderer's live items in the 2D and have no lane yet.
 */
import { Tile, WALL_RUN_TILES, hashCoords } from '@arx/shared';
import { DOCK_LIFT, type GroundSampler } from '../../render/terrain.js';
import { shade } from '../../render/tint.js';
import { collectStepFaces, type StepFace } from '../heightfield.js';
import {
  CLIFF_EPS_BOT,
  CLIFF_EPS_TOP,
  CLIFF_PERIOD,
  browOf,
  cliffKey,
  cliffStripSize,
  cliffVariant,
  mergeStepFaces,
  paintCliffStrip,
  type CliffRun,
} from './cliffFaces.js';
import {
  BRIDGE_TIMBER,
  DECK_PERIOD,
  JOIST_H,
  KERB_H,
  KERB_W,
  PILE_DRIVE,
  PILE_W,
  PORCH_RIM_DEFAULT,
  STEP_D,
  STONE_STEP,
  apronLift,
  deckPileKey,
  deckPileSize,
  deckRimKey,
  deckRimSize,
  deckStripU,
  deckStripVariant,
  deckTopKey,
  deckTopSize,
  fillAt,
  paintDeckRim,
  paintDeckTopStrip,
  paintFlatTone,
  paintPileFace,
  planDeckTile,
  type DeckFamily,
  type DeckPlan,
} from './deckFaces.js';
import type { FaceRef } from './faceAtlas.js';
import type { StructBuildCtx, StructBuildResult } from './structures.js';

export function buildTerrainFormStructures(ctx: StructBuildCtx): StructBuildResult {
  const q0 = ctx.sink.quads;
  const cliffRuns = buildCliffs(ctx);
  const deckTiles = buildDecks(ctx);
  return { quads: ctx.sink.quads - q0, note: `cliff runs ${cliffRuns} · deck tiles ${deckTiles}` };
}

// -------------------------------------------------------------- cliffs

const scratchFaces: StepFace[] = [];

function buildCliffs(ctx: StructBuildCtx): number {
  const s = ctx.sampler;
  scratchFaces.length = 0;
  collectStepFaces(
    {
      cx: ctx.cx,
      cy: ctx.cy,
      size: ctx.size,
      levelAt: (tx, ty) => s.elevAt(tx, ty),
      isRamp: (tx, ty) => s.groundAt(tx, ty) === Tile.Ramp,
      levelH: ctx.elevH,
    },
    scratchFaces,
  );
  if (scratchFaces.length === 0) return 0;
  const runs = mergeStepFaces(scratchFaces, (f) => browOf(s, f));
  for (const run of runs) emitCliffRun(ctx, run);
  return runs.length;
}

function emitCliffRun(ctx: StructBuildCtx, run: CliffRun): void {
  const variant = cliffVariant(run.strip, run.cross, run.levels);
  const ref = ctx.atlas.get(cliffKey(run.levels, run.brow, variant), () => {
    const { w, h } = cliffStripSize(run.levels, ctx.elevH);
    return { w, h, paint: (c, ww, hh) => paintCliffStrip(c, ww, hh, { levels: run.levels, brow: run.brow, variant, levelH: ctx.elevH }) };
  });
  const strip0 = run.strip * CLIFF_PERIOD;
  const a = run.a - (run.contA ? 0 : CLIFF_EPS_BOT);
  const b = run.b + (run.contB ? 0 : CLIFF_EPS_BOT);
  const du = ref.u1 - ref.u0;
  const ua = ref.u0 + (du * (a - strip0)) / CLIFF_PERIOD;
  const ub = ref.u0 + (du * (b - strip0)) / CLIFF_PERIOD;
  const yBotMin = Math.min(run.yBotA, run.yBotB);
  const H = run.levels * ctx.elevH;
  const dv = ref.v1 - ref.v0;
  const v = (y: number): number => ref.v0 + (dv * (y - yBotMin)) / H;
  const along = run.side === 'N' || run.side === 'S';
  const nx = run.nx;
  const nz = run.nz;
  // Corners: a-bottom, b-bottom, b-top, a-top; foot pushed EPS_BOT,
  // crown EPS_TOP along the normal (THE CURTAIN HANGS A HAIR PROUD).
  const p = ctx.sink.p;
  const uv = ctx.sink.uv;
  const set = (i: number, coord: number, y: number, eps: number): void => {
    p[i * 3] = (along ? coord : run.cross) + nx * eps;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = (along ? run.cross : coord) + nz * eps;
  };
  set(0, a, run.yBotA, CLIFF_EPS_BOT);
  set(1, b, run.yBotB, CLIFF_EPS_BOT);
  set(2, b, run.yTopB, CLIFF_EPS_TOP);
  set(3, a, run.yTopA, CLIFF_EPS_TOP);
  uv[0] = ua;
  uv[1] = v(run.yBotA);
  uv[2] = ub;
  uv[3] = v(run.yBotB);
  uv[4] = ub;
  uv[5] = v(run.yTopB);
  uv[6] = ua;
  uv[7] = v(run.yTopA);
  ctx.sink.quad('opaque', ref.page, p, uv, nx, 0, nz);
}

// --------------------------------------------------------------- decks

type Edge = 'N' | 'E' | 'S' | 'W';

interface DeckSkin {
  tones: readonly string[] | null;
  fascia: string;
  id: string;
}

const PLAIN_SKIN: DeckSkin = { tones: null, fascia: PORCH_RIM_DEFAULT, id: 'plain' };

function buildDecks(ctx: StructBuildCtx): number {
  const ground: GroundSampler = (tx, ty) => ctx.world.groundAt(tx, ty);
  const axisMemo = new Map<number, boolean>();
  const porchSkins = new Map<number, DeckSkin>();
  let n = 0;
  for (let ly = 0; ly < ctx.size; ly++) {
    for (let lx = 0; lx < ctx.size; lx++) {
      const tx = ctx.x0 + lx;
      const ty = ctx.y0 + ly;
      const plan = planDeckTile(ground, tx, ty, axisMemo);
      if (plan) {
        const skin = plan.family === 'porch' ? porchSkin(ctx, ground, tx, ty, porchSkins) : PLAIN_SKIN;
        emitDeckTile(ctx, plan, skin);
        n++;
        continue;
      }
      const fill = fillAt(ground, tx, ty);
      if (fill && emitDeckFill(ctx, ground, tx, ty, fill.legs, fill.family, fill.bank)) n++;
    }
  }
  return n;
}

/**
 * THE DECK TAKES THE HOUSE'S WOOD (drawPorchDecks skinFor): flood the
 * porch patch (capped) for an adjoining wall; the room behind that
 * wall deals the skin. One skin per patch.
 */
function porchSkin(ctx: StructBuildCtx, ground: GroundSampler, sx: number, sy: number, memo: Map<number, DeckSkin>): DeckSkin {
  const key = (x: number, y: number): number => x * 100000 + y;
  const hit = memo.get(key(sx, sy));
  if (hit) return hit;
  let skin: DeckSkin | null = null;
  const seen = new Set<number>([key(sx, sy)]);
  const queue: Array<[number, number]> = [[sx, sy]];
  const members: number[] = [key(sx, sy)];
  const DIRS: ReadonlyArray<readonly [number, number]> = [
    [0, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
  ];
  while (queue.length > 0 && seen.size <= 64) {
    const [qx, qy] = queue.pop()!;
    for (const [dx, dy] of DIRS) {
      const nx = qx + dx;
      const ny = qy + dy;
      const nt = ground(nx, ny);
      if (skin === null && nt !== undefined && WALL_RUN_TILES.includes(nt as Tile)) {
        const region = ctx.regionAt(nx + dx, ny + dy);
        const ws = ctx.woodSkinFor(region);
        skin = { tones: ws.floorTones, fascia: ws.floorTones[3] ?? PORCH_RIM_DEFAULT, id: ws.floorTones.join('') };
      }
      const k = key(nx, ny);
      if (nt === Tile.PorchDeck && !seen.has(k)) {
        seen.add(k);
        members.push(k);
        queue.push([nx, ny]);
      }
    }
  }
  const out = skin ?? PLAIN_SKIN;
  for (const m of members) memo.set(m, out);
  return out;
}

function topRef(ctx: StructBuildCtx, family: DeckFamily, armVert: boolean, variant: number, skin: DeckSkin): FaceRef {
  return ctx.atlas.get(deckTopKey(family, armVert, variant, skin.id), () => {
    const { w, h } = deckTopSize();
    return { w, h, paint: (c, ww, hh) => paintDeckTopStrip(c, ww, hh, { family, armVert, variant, tones: skin.tones }) };
  });
}

function rimRef(ctx: StructBuildCtx, family: DeckFamily, tall: boolean, skin: DeckSkin): FaceRef {
  return ctx.atlas.get(deckRimKey(family, tall, skin.id), () => {
    const { w, h } = deckRimSize(tall);
    return { w, h, paint: (c, ww, hh) => paintDeckRim(c, ww, hh, { family, tall, tone: family === 'porch' ? skin.fascia : null }) };
  });
}

function toneRef(ctx: StructBuildCtx, tone: string): FaceRef {
  return ctx.atlas.get(`deck/tone/${tone}`, () => ({ w: 8, h: 8, paint: (c, w, h) => paintFlatTone(c, w, h, tone) }));
}

function pileRef(ctx: StructBuildCtx, family: DeckFamily, seed: number): FaceRef {
  const key = deckPileKey(family, seed);
  return ctx.atlas.get(key, () => {
    const { w, h } = deckPileSize(family, DOCK_LIFT);
    return { w, h, paint: (c, ww, hh) => paintPileFace(c, ww, hh, { family, seed, lift: DOCK_LIFT }) };
  });
}

/** Edge endpoints a→b (W→E for N/S edges, N→S for E/W) and the outward normal. */
function edgeGeom(tx: number, ty: number, e: Edge): { ax: number; az: number; bx: number; bz: number; nx: number; nz: number } {
  switch (e) {
    case 'N':
      return { ax: tx, az: ty, bx: tx + 1, bz: ty, nx: 0, nz: -1 };
    case 'S':
      return { ax: tx, az: ty + 1, bx: tx + 1, bz: ty + 1, nx: 0, nz: 1 };
    case 'E':
      return { ax: tx + 1, az: ty, bx: tx + 1, bz: ty + 1, nx: 1, nz: 0 };
    case 'W':
      return { ax: tx, az: ty, bx: tx, bz: ty + 1, nx: -1, nz: 0 };
  }
}

/** A vertical quad a→b with per-end top/bottom heights and a ref stretched base→crown, u along the strip. */
function faceQuad(
  ctx: StructBuildCtx,
  ref: FaceRef,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  yBotA: number,
  yBotB: number,
  yTopA: number,
  yTopB: number,
  ua: number,
  ub: number,
  nx: number,
  nz: number,
): void {
  const p = ctx.sink.p;
  const uv = ctx.sink.uv;
  p[0] = ax;
  p[1] = yBotA;
  p[2] = az;
  p[3] = bx;
  p[4] = yBotB;
  p[5] = bz;
  p[6] = bx;
  p[7] = yTopB;
  p[8] = bz;
  p[9] = ax;
  p[10] = yTopA;
  p[11] = az;
  const u0 = ref.u0 + (ref.u1 - ref.u0) * ua;
  const u1 = ref.u0 + (ref.u1 - ref.u0) * ub;
  uv[0] = u0;
  uv[1] = ref.v0;
  uv[2] = u1;
  uv[3] = ref.v0;
  uv[4] = u1;
  uv[5] = ref.v1;
  uv[6] = u0;
  uv[7] = ref.v1;
  ctx.sink.quad('opaque', ref.page, p, uv, nx, 0, nz);
}

/** An axis-aligned box's five visible faces (no bottom) in one flat tone. */
function toneBox(ctx: StructBuildCtx, ref: FaceRef, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): void {
  const um = (ref.u0 + ref.u1) / 2;
  const vm = (ref.v0 + ref.v1) / 2;
  ctx.sink.top('opaque', ref.page, x0, z0, x1, z1, y1, um, vm, um, vm);
  ctx.sink.face('opaque', ref.page, x0, z1, x1, z1, y0, y1, um, vm, um, vm, 0, 1);
  ctx.sink.face('opaque', ref.page, x0, z0, x1, z0, y0, y1, um, vm, um, vm, 0, -1);
  ctx.sink.face('opaque', ref.page, x1, z0, x1, z1, y0, y1, um, vm, um, vm, 1, 0);
  ctx.sink.face('opaque', ref.page, x0, z0, x0, z1, y0, y1, um, vm, um, vm, -1, 0);
}

/** A pile prism: four faces from y1 (under the joist) down to y0 (driven). */
function pile(ctx: StructBuildCtx, ref: FaceRef, cx: number, cz: number, pw: number, y0: number, y1: number): void {
  const h = pw / 2;
  const x0 = cx - h;
  const x1 = cx + h;
  const z0 = cz - h;
  const z1 = cz + h;
  ctx.sink.face('opaque', ref.page, x0, z1, x1, z1, y0, y1, ref.u0, ref.v0, ref.u1, ref.v1, 0, 1);
  ctx.sink.face('opaque', ref.page, x1, z0, x0, z0, y0, y1, ref.u0, ref.v0, ref.u1, ref.v1, 0, -1);
  ctx.sink.face('opaque', ref.page, x1, z1, x1, z0, y0, y1, ref.u0, ref.v0, ref.u1, ref.v1, 1, 0);
  ctx.sink.face('opaque', ref.page, x0, z0, x0, z1, y0, y1, ref.u0, ref.v0, ref.u1, ref.v1, -1, 0);
}

/** A deck tile's ground base: its own level's rise (deck tiles are never ramps). `ctx.heightAt` now carries the deck lift, so it must not be asked here. */
function deckBase(ctx: StructBuildCtx, tx: number, ty: number): number {
  return ctx.sampler.elevAt(tx, ty) * ctx.elevH;
}

function emitDeckTile(ctx: StructBuildCtx, plan: DeckPlan, skin: DeckSkin): void {
  const { tx, ty, family } = plan;
  const base = deckBase(ctx, tx, ty);
  const liftAt = (fx: number, fy: number): number => base + apronLift(plan.apron, fx, fy);
  const yNW = liftAt(0, 0);
  const yNE = liftAt(1, 0);
  const ySE = liftAt(1, 1);
  const ySW = liftAt(0, 1);
  const top = topRef(ctx, family, plan.armVert, deckStripVariant(family, plan.armVert, tx, ty), skin);
  // The slab top: a shared strip, this tile's quarter of it.
  {
    const p = ctx.sink.p;
    const uv = ctx.sink.uv;
    const u0 = top.u0 + (top.u1 - top.u0) * deckStripU(tx);
    const u1 = u0 + (top.u1 - top.u0) / DECK_PERIOD;
    p[0] = tx;
    p[1] = yNW;
    p[2] = ty;
    p[3] = tx + 1;
    p[4] = yNE;
    p[5] = ty;
    p[6] = tx + 1;
    p[7] = ySE;
    p[8] = ty + 1;
    p[9] = tx;
    p[10] = ySW;
    p[11] = ty + 1;
    uv[0] = u0;
    uv[1] = top.v1;
    uv[2] = u1;
    uv[3] = top.v1;
    uv[4] = u1;
    uv[5] = top.v0;
    uv[6] = u0;
    uv[7] = top.v0;
    ctx.sink.quad('opaque', top.page, p, uv, 0, 1, 0);
  }
  // Rims on exposed edges. Seated (to the ground) where the edge meets
  // land at grade, on every porch edge, and along an apron's sloping
  // sides (the 2D's wing walls); a joist over water.
  const edges: ReadonlyArray<readonly [Edge, boolean, boolean, number, number]> = [
    ['N', plan.hasN, plan.landN, yNW, yNE],
    ['S', plan.hasS, plan.landS, ySW, ySE],
    ['E', plan.hasE, plan.landE, yNE, ySE],
    ['W', plan.hasW, plan.landW, yNW, ySW],
  ];
  for (const [e, has, land, yA, yB] of edges) {
    if (has) continue;
    if (e === 'N' && plan.wallN) continue; // the wall lane's face stands there
    if (yA <= base + 0.01 && yB <= base + 0.01) continue; // an apron pours onto the bank: no face
    const sloped = Math.abs(yA - yB) > 0.01;
    const tall = family === 'porch' || land || sloped;
    const ref = rimRef(ctx, family, tall, skin);
    const g = edgeGeom(tx, ty, e);
    const coord = e === 'N' || e === 'S' ? tx : ty;
    const ua = deckStripU(coord);
    const ub = ua + 1 / DECK_PERIOD;
    const botA = tall ? base : yA - JOIST_H;
    const botB = tall ? base : yB - JOIST_H;
    faceQuad(ctx, ref, g.ax, g.az, g.bx, g.bz, botA, botB, yA, yB, ua, ub, g.nx, g.nz);
  }
  // Piles: the legs a water-facing span stands on (an apron's mass is
  // its raked stringer — no legs; a north apron keeps its south pair).
  if (family !== 'porch') {
    const pw = PILE_W[family];
    const yFoot = base - PILE_DRIVE;
    if (!plan.hasS && plan.waterS && (plan.apron === 'none' || plan.apron === 'N')) {
      for (const fpos of [0.18, 0.82]) {
        const seed = hashCoords(family === 'bridge' ? 153 : 149, tx * 2 + (fpos > 0.5 ? 1 : 0), ty);
        pile(ctx, pileRef(ctx, family, seed), tx + fpos, ty + 1 - pw / 2 - 0.01, pw, yFoot, ySE - JOIST_H + 0.02);
      }
    }
    if (family === 'dock') {
      // Side legs over open water, world-keyed so a 2-tile bay never doubles (drawDocks round 7).
      for (const side of [!plan.hasW && plan.waterW ? -1 : 0, !plan.hasE && plan.waterE ? 1 : 0]) {
        if (side === 0) continue;
        if (hashCoords(151, tx * (side + 2), ty) % 2 !== 0) continue;
        const cx = side < 0 ? tx + pw / 2 + 0.01 : tx + 1 - pw / 2 - 0.01;
        const seed = hashCoords(157, tx * 2 + (side > 0 ? 1 : 0), ty);
        pile(ctx, pileRef(ctx, family, seed), cx, ty + 0.5, pw, yFoot, yNW - JOIST_H + 0.02);
      }
    }
  }
  // Bridge furniture: kerb stringers along the exposed SIDES (the
  // edges a rail runs along), stone thresholds across land ENDS that
  // do not ramp.
  if (family === 'bridge') {
    const kerb = toneRef(ctx, shade(BRIDGE_TIMBER.rim, -18));
    const kerbN = !plan.hasN && !plan.vertRun;
    const kerbS = !plan.hasS && !plan.vertRun;
    const kerbW = !plan.hasW && plan.vertRun;
    const kerbE = !plan.hasE && plan.vertRun;
    const yK = Math.max(yNW, yNE, ySE, ySW);
    if (kerbN) toneBox(ctx, kerb, tx, ty, tx + 1, ty + KERB_W, yK, yK + KERB_H);
    if (kerbS) toneBox(ctx, kerb, tx, ty + 1 - KERB_W, tx + 1, ty + 1, yK, yK + KERB_H);
    if (kerbW) toneBox(ctx, kerb, tx, ty, tx + KERB_W, ty + 1, yK, yK + KERB_H);
    if (kerbE) toneBox(ctx, kerb, tx + 1 - KERB_W, ty, tx + 1, ty + 1, yK, yK + KERB_H);
    if (plan.apron === 'none') {
      const step = toneRef(ctx, STONE_STEP);
      const yS = base + DOCK_LIFT * 0.5;
      if (plan.landN && plan.vertRun) toneBox(ctx, step, tx, ty - STEP_D, tx + 1, ty, base, yS);
      if (plan.landS && plan.vertRun) toneBox(ctx, step, tx, ty + 1, tx + 1, ty + 1 + STEP_D, base, yS);
      if (plan.landW && !plan.vertRun) toneBox(ctx, step, tx - STEP_D, ty, tx, ty + 1, base, yS);
      if (plan.landE && !plan.vertRun) toneBox(ctx, step, tx + 1, ty, tx + 1 + STEP_D, ty + 1, base, yS);
    }
  }
  // The porch's tread step: a squared course where the deck opens onto the yard.
  if (family === 'porch' && plan.treadS) {
    const step = toneRef(ctx, shade(skin.fascia, -30));
    toneBox(ctx, step, tx + 0.22, ty + 1, tx + 0.78, ty + 1.25, base, base + DOCK_LIFT * 0.5);
  }
}

/**
 * A 45° notch fill: the lifted half-tile triangle spanning the two
 * deck-hugged edges, with a joist (or seated, on a bank notch) along
 * the hypotenuse. Only when the family's structure actually lifts.
 */
function emitDeckFill(ctx: StructBuildCtx, ground: GroundSampler, tx: number, ty: number, legs: 'NE' | 'NW' | 'SE' | 'SW', family: 'bridge' | 'dock', bank: boolean): boolean {
  // A leg neighbour decides the lift (the fill's own tile is water/bank).
  const legN = legs === 'NE' || legs === 'NW';
  const legE = legs === 'NE' || legs === 'SE';
  const legPlan = planDeckTile(ground, tx, ty + (legN ? -1 : 1)) ?? planDeckTile(ground, tx + (legE ? 1 : -1), ty);
  if (!legPlan) return false;
  const base = deckBase(ctx, tx, ty);
  const y = base + DOCK_LIFT;
  const top = topRef(ctx, family, legPlan.armVert, deckStripVariant(family, legPlan.armVert, tx, ty), PLAIN_SKIN);
  const u0 = top.u0 + (top.u1 - top.u0) * deckStripU(tx);
  const u1 = u0 + (top.u1 - top.u0) / DECK_PERIOD;
  const NW = [tx, y, ty] as const;
  const NE = [tx + 1, y, ty] as const;
  const SE = [tx + 1, y, ty + 1] as const;
  const SW = [tx, y, ty + 1] as const;
  const uvOf = (c: readonly [number, number, number]): [number, number] => [c[0] === tx ? u0 : u1, c[2] === ty ? top.v1 : top.v0];
  let tri: [typeof NW, typeof NW, typeof NW];
  let hyp: { ax: number; az: number; bx: number; bz: number; nx: number; nz: number };
  const q = Math.SQRT1_2;
  switch (legs) {
    case 'NE':
      tri = [NW, NE, SE];
      hyp = { ax: tx, az: ty, bx: tx + 1, bz: ty + 1, nx: -q, nz: q };
      break;
    case 'NW':
      tri = [NE, NW, SW];
      hyp = { ax: tx + 1, az: ty, bx: tx, bz: ty + 1, nx: q, nz: q };
      break;
    case 'SE':
      tri = [NE, SE, SW];
      hyp = { ax: tx + 1, az: ty, bx: tx, bz: ty + 1, nx: -q, nz: -q };
      break;
    case 'SW':
      tri = [NW, SE, SW];
      hyp = { ax: tx, az: ty, bx: tx + 1, bz: ty + 1, nx: q, nz: -q };
      break;
  }
  const p = ctx.sink.p;
  const uv = ctx.sink.uv;
  for (let i = 0; i < 3; i++) {
    const c = tri[i]!;
    p[i * 3] = c[0];
    p[i * 3 + 1] = c[1];
    p[i * 3 + 2] = c[2];
    const [uu, vv] = uvOf(c);
    uv[i * 2] = uu;
    uv[i * 2 + 1] = vv;
  }
  ctx.sink.tri('opaque', top.page, p, uv, 0, 1, 0);
  const tall = bank;
  const rim = rimRef(ctx, family, tall, PLAIN_SKIN);
  const ua = deckStripU(tx);
  faceQuad(ctx, rim, hyp.ax, hyp.az, hyp.bx, hyp.bz, tall ? base : y - JOIST_H, tall ? base : y - JOIST_H, y, y, ua, ua + Math.SQRT2 / DECK_PERIOD, hyp.nx, hyp.nz);
  return true;
}
