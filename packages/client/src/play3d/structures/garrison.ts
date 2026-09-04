/**
 * THE CURTAIN STANDS (play3d W2, BARRIERS lane) — the garrison as
 * geometry: GARRISON_H prisms with great-ashlar faces on EXPOSED sides
 * only (the shared-edge law over `garrisonish` continuity), a wall-walk
 * top, and MERLON_H teeth marching every exposed crown edge at the 2D's
 * world-phase centres (0.25 / 0.75 per tile), so a run reads as one
 * castellated mass with no seam.
 *
 *  - STRAIGHT tiles: a box; faces S/N/E/W where the neighbour does not
 *    continue the curtain (a side gate ends the run — the jamb shows).
 *    The masonry is WORLD-ANCHORED along the run (paintGarrisonMasonry
 *    keys its bond to world x; faces along z key to world y) so two
 *    neighbours can never disagree about a joint.
 *  - DIAGONAL tiles: the mass triangle (diagWallInfo names the SOLID
 *    triangle) — a hypotenuse face, the leg faces where exposed, a
 *    triangular wall-walk, teeth at 0.25 / 0.75 along the hypotenuse.
 *  - GATES: always wide, merged E–W into one gatehouse from the west
 *    anchor (garrisonGateRuns): two quoined piers, a lintel block over
 *    the passage (its soffit dark), the voussoir ring and machicolations
 *    painted on the elevation card, the raised portcullis hanging in
 *    the arch head, and two iron-bound leaves that follow the tile's
 *    open/shut state (the tile IS the state; a patch rebuilds the
 *    chunk). A SIDE gate (edge-on in a N–S curtain) is one leaf in the
 *    notch, thrown east when open.
 *
 * All heights ride `ctx.heightAt` (elev lift included). Opaque kind
 * throughout, except the portcullis and the leaves (cutout cards).
 *
 * OWNERSHIP NOTE: the scaffold's walls.ts header also names the
 * garrison; this lane was briefed to build it. INTEGRATE keeps ONE
 * (docs/play3d-plan.md §W2 BARRIERS gaps).
 */
import { GARRISON_H, MERLON_H, garrisonish, isGarrisonSideGate, type TileStruct } from './structKinds.js';
import type { StructBuildCtx } from './structures.js';
import {
  BarrierFaces,
  GAR_LEAF_H,
  GAR_PORTCULLIS_DROP,
  GAR_SIDE_LEAF_H,
  GAR_SIDE_LEAF_W,
  GAR_SPRING_H,
  subRect,
  variantAt,
} from './barrierFaces.js';
import { ALL_EXPOSED, MERLON_CENTRES, MERLON_D, MERLON_W, emitBox, emitCard, garrisonGateRuns, leafSwing, swingLeafEnd, type BoxExposed, type FaceRect } from './barrierGeom.js';

const swingPt = { x: 0, z: 0 };
const exposed: BoxExposed = { n: true, e: true, s: true, w: true, top: true };

function rectWithPage(page: number, r: [number, number, number, number]): FaceRect {
  return { page, u0: r[0], v0: r[1], u1: r[2], v1: r[3] };
}

/** One parapet tooth: an mw × md box, mh tall, standing on the crown at y1. */
function merlon(ctx: StructBuildCtx, faces: BarrierFaces, x0: number, z0: number, x1: number, z1: number, y1: number): void {
  const mf = faces.merlonFace();
  const mt = faces.merlonTop();
  emitBox(ctx.sink, 'opaque', { side: mf, top: mt }, x0, z0, x1, z1, y1, y1 + MERLON_H, ALL_EXPOSED);
}

/** Teeth along a tile's exposed crown edges (garrisonArt.ts:301-325). */
function merlonsForTile(ctx: StructBuildCtx, faces: BarrierFaces, tx: number, ty: number, y1: number, n: boolean, e: boolean, s: boolean, w: boolean): void {
  const hw = MERLON_W / 2;
  for (const c of MERLON_CENTRES) {
    if (n) merlon(ctx, faces, tx + c - hw, ty, tx + c + hw, ty + MERLON_D, y1);
    if (s) merlon(ctx, faces, tx + c - hw, ty + 1 - MERLON_D, tx + c + hw, ty + 1, y1);
    if (w) merlon(ctx, faces, tx, ty + c - hw, tx + MERLON_D, ty + c + hw, y1);
    if (e) merlon(ctx, faces, tx + 1 - MERLON_D, ty + c - hw, tx + 1, ty + c + hw, y1);
  }
}

function straightTile(ctx: StructBuildCtx, faces: BarrierFaces, t: TileStruct): void {
  const { tx, ty } = t;
  const y0 = ctx.heightAt(tx + 0.5, ty + 0.5);
  const y1 = y0 + GARRISON_H;
  const alongX = faces.garrisonFace(tx);
  const alongZ = faces.garrisonFace(ty);
  const top = faces.garrisonTop(variantAt(457, tx, ty, 4));
  exposed.n = !t.runN;
  exposed.s = !t.runS;
  exposed.e = !t.runE;
  exposed.w = !t.runW;
  exposed.top = true;
  emitBox(ctx.sink, 'opaque', { side: alongX, back: alongX, end: alongZ, top }, tx, ty, tx + 1, ty + 1, y0, y1, exposed);
  merlonsForTile(ctx, faces, tx, ty, y1, exposed.n, exposed.e, exposed.s, exposed.w);
}

function diagTile(ctx: StructBuildCtx, faces: BarrierFaces, t: TileStruct): void {
  const mass = t.diag!.mass;
  const { tx, ty } = t;
  const sink = ctx.sink;
  const y0 = ctx.heightAt(tx + 0.5, ty + 0.5);
  const y1 = y0 + GARRISON_H;
  const face = faces.garrisonFace(tx);
  const top = faces.garrisonTop(variantAt(457, tx, ty, 4));
  // Corners.
  const NW: [number, number] = [tx, ty];
  const NE: [number, number] = [tx + 1, ty];
  const SE: [number, number] = [tx + 1, ty + 1];
  const SW: [number, number] = [tx, ty + 1];
  // Hypotenuse west end → east end, outward normal, the mass triangle, exposed legs.
  let a: [number, number];
  let b: [number, number];
  let nx: number;
  let nz: number;
  let tri: [[number, number], [number, number], [number, number]];
  const legN = mass === 'NE' || mass === 'NW';
  const legS = mass === 'SE' || mass === 'SW';
  const legE = mass === 'NE' || mass === 'SE';
  const legW = mass === 'NW' || mass === 'SW';
  const R = Math.SQRT1_2;
  if (mass === 'NE') {
    a = NW;
    b = SE;
    nx = -R;
    nz = R;
    tri = [NW, NE, SE];
  } else if (mass === 'NW') {
    a = SW;
    b = NE;
    nx = R;
    nz = R;
    tri = [NW, NE, SW];
  } else if (mass === 'SE') {
    a = SW;
    b = NE;
    nx = -R;
    nz = -R;
    tri = [NE, SE, SW];
  } else {
    a = NW;
    b = SE;
    nx = R;
    nz = -R;
    tri = [NW, SE, SW];
  }
  sink.face('opaque', face.page, a[0], a[1], b[0], b[1], y0, y1, face.u0, face.v0, face.u1, face.v1, nx, nz);
  const faceZ = faces.garrisonFace(ty);
  if (legN && !t.runN) sink.face('opaque', face.page, tx + 1, ty, tx, ty, y0, y1, face.u0, face.v0, face.u1, face.v1, 0, -1);
  if (legS && !t.runS) sink.face('opaque', face.page, tx, ty + 1, tx + 1, ty + 1, y0, y1, face.u0, face.v0, face.u1, face.v1, 0, 1);
  if (legE && !t.runE) sink.face('opaque', faceZ.page, tx + 1, ty + 1, tx + 1, ty, y0, y1, faceZ.u0, faceZ.v0, faceZ.u1, faceZ.v1, 1, 0);
  if (legW && !t.runW) sink.face('opaque', faceZ.page, tx, ty, tx, ty + 1, y0, y1, faceZ.u0, faceZ.v0, faceZ.u1, faceZ.v1, -1, 0);
  // The wall-walk triangle.
  const p = sink.p;
  const uv = sink.uv;
  for (let i = 0; i < 3; i++) {
    const c = tri[i]!;
    p[i * 3] = c[0];
    p[i * 3 + 1] = y1;
    p[i * 3 + 2] = c[1];
    uv[i * 2] = top.u0 + (top.u1 - top.u0) * (c[0] - tx);
    uv[i * 2 + 1] = top.v1 - (top.v1 - top.v0) * (c[1] - ty);
  }
  sink.tri('opaque', top.page, p, uv, 0, 1, 0);
  // Teeth stepping the hypotenuse.
  const hw = MERLON_W / 2;
  for (const u of MERLON_CENTRES) {
    const cx = a[0] + (b[0] - a[0]) * u;
    const cz = a[1] + (b[1] - a[1]) * u;
    merlon(ctx, faces, cx - hw, cz - hw, cx + hw, cz + hw, y1);
  }
}

/** The merged E–W gatehouse (garrisonArt.ts garrisonGateItem, as boxes). */
function gateRun(ctx: StructBuildCtx, faces: BarrierFaces, tx: number, ty: number, len: number, open: boolean): void {
  const sink = ctx.sink;
  const y0 = ctx.heightAt(tx + len / 2, ty + 0.5);
  const y1 = y0 + GARRISON_H;
  const pw = Math.min(0.34, len * 0.18);
  const ow = len - 2 * pw;
  const rise = Math.min(ow * 0.22, 0.42);
  const yUnder = GAR_SPRING_H + rise * 0.6;
  const card = faces.garrisonGate(len);
  const endFace = faces.garrisonFace(ty);
  const top = faces.garrisonTop(variantAt(457, tx, ty, 4));
  const soffit = faces.garrisonSoffit();
  const fpw = pw / len;
  const westPier = rectWithPage(card.page, subRect(card, 0, 0, fpw, 1));
  const eastPier = rectWithPage(card.page, subRect(card, 1 - fpw, 0, 1, 1));
  const lintel = rectWithPage(card.page, subRect(card, fpw, yUnder / GARRISON_H, 1 - fpw, 1));
  // Piers: outer end exposed only where the curtain does not continue.
  exposed.n = true;
  exposed.s = true;
  exposed.top = true;
  exposed.w = !garrisonish(ctx.sampler, tx - 1, ty);
  exposed.e = true; // the inner face, toward the passage
  emitBox(sink, 'opaque', { side: westPier, back: westPier, end: endFace, top }, tx, ty, tx + pw, ty + 1, y0, y1, exposed);
  exposed.w = true;
  exposed.e = !garrisonish(ctx.sampler, tx + len, ty);
  emitBox(sink, 'opaque', { side: eastPier, back: eastPier, end: endFace, top }, tx + len - pw, ty, tx + len, ty + 1, y0, y1, exposed);
  // The lintel block over the passage, its underside dark.
  exposed.e = false;
  exposed.w = false;
  emitBox(sink, 'opaque', { side: lintel, back: lintel, top }, tx + pw, ty, tx + len - pw, ty + 1, y0 + yUnder, y1, exposed);
  {
    const p = sink.p;
    const uv = sink.uv;
    const x0 = tx + pw;
    const x1 = tx + len - pw;
    const y = y0 + yUnder;
    p[0] = x0;
    p[1] = y;
    p[2] = ty;
    p[3] = x1;
    p[4] = y;
    p[5] = ty;
    p[6] = x1;
    p[7] = y;
    p[8] = ty + 1;
    p[9] = x0;
    p[10] = y;
    p[11] = ty + 1;
    uv[0] = soffit.u0;
    uv[1] = soffit.v1;
    uv[2] = soffit.u1;
    uv[3] = soffit.v1;
    uv[4] = soffit.u1;
    uv[5] = soffit.v0;
    uv[6] = soffit.u0;
    uv[7] = soffit.v0;
    sink.quad('opaque', soffit.page, p, uv, 0, -1, 0);
  }
  // Teeth over the run (both crown edges), taller pier caps at the south corners.
  for (let i = 0; i < len; i++) merlonsForTile(ctx, faces, tx + i, ty, y1, true, false, true, false);
  const capD = MERLON_D * 1.15;
  const mf = faces.merlonFace();
  const mt = faces.merlonTop();
  emitBox(sink, 'opaque', { side: mf, top: mt }, tx, ty + 1 - capD, tx + pw, ty + 1, y1, y1 + MERLON_H * 1.45, ALL_EXPOSED);
  emitBox(sink, 'opaque', { side: mf, top: mt }, tx + len - pw, ty + 1 - capD, tx + len, ty + 1, y1, y1 + MERLON_H * 1.45, ALL_EXPOSED);
  // The raised portcullis in the arch head.
  const port = faces.garrisonPortcullis();
  emitCard(sink, 'cutout', port, tx + pw, ty + 0.5, tx + len - pw, ty + 0.5, y0 + yUnder - GAR_PORTCULLIS_DROP, y0 + yUnder - GAR_PORTCULLIS_DROP, GAR_PORTCULLIS_DROP);
  // THE LEAVES follow the tile's state.
  const half = ow / 2;
  const leaf = faces.garrisonLeaf(half, GAR_LEAF_H);
  const sw = leafSwing(open);
  const west = swingLeafEnd(tx + pw, ty + 0.5, 1, 0, 0, 1, half, sw, swingPt);
  emitCard(sink, 'cutout', leaf, tx + pw, ty + 0.5, west.x, west.z, y0, y0, GAR_LEAF_H);
  const east = swingLeafEnd(tx + len - pw, ty + 0.5, -1, 0, 0, 1, half, sw, swingPt);
  emitCard(sink, 'cutout', leaf, tx + len - pw, ty + 0.5, east.x, east.z, y0, y0, GAR_LEAF_H);
}

/** A side gate: one leaf in the notch of a N–S curtain (garrisonArt.ts garrisonSideGateItems). */
function sideGate(ctx: StructBuildCtx, faces: BarrierFaces, tx: number, ty: number, open: boolean): void {
  const y0 = ctx.heightAt(tx + 0.5, ty + 0.5);
  const leaf = faces.garrisonLeaf(GAR_SIDE_LEAF_W, GAR_SIDE_LEAF_H);
  const hx = tx + 0.5;
  const hz = ty + 0.1;
  const end = swingLeafEnd(hx, hz, 0, 1, 1, 0, GAR_SIDE_LEAF_W, leafSwing(open), swingPt);
  emitCard(ctx.sink, 'cutout', leaf, hx, hz, end.x, end.z, y0, y0, GAR_SIDE_LEAF_H);
}

/** Build the chunk's garrison. Returns the quads landed. */
export function buildGarrisonStructures(ctx: StructBuildCtx, faces: BarrierFaces): number {
  const tiles = ctx.scan.byFamily.get('garrison');
  if (!tiles || tiles.length === 0) return 0;
  const before = ctx.sink.quads;
  for (const t of tiles) {
    if (t.door) continue; // gates are runs, below
    if (t.diag) diagTile(ctx, faces, t);
    else straightTile(ctx, faces, t);
  }
  // Gate runs read the LIVE world, not the 1-tile snapshot: a 3-wide
  // gatehouse anchored at the chunk's east edge reaches two tiles past
  // the border, further than the snapshot sees.
  const runs = garrisonGateRuns(ctx.world, ctx.x0, ctx.y0, ctx.size, (tx, ty) => isGarrisonSideGate(ctx.world, tx, ty));
  for (const r of runs) {
    if (r.side) sideGate(ctx, faces, r.tx, r.ty, r.open);
    else gateRun(ctx, faces, r.tx, r.ty, r.len, r.open);
  }
  return ctx.sink.quads - before;
}
