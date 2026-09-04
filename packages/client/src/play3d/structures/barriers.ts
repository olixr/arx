/**
 * THE BARRIERS LANE (play3d W2) — OWNER: the BARRIERS lane.
 *
 * The four barrier families as geometry with painted faces, over THE
 * NODE GRAPH (barrierGeom.ts: nodes at tile centres, edges between
 * run-mates, each edge emitted ONCE by its lexicographic-min end):
 *
 *  - FENCE: a capped post at every node (THE TURNED CROSS — two
 *    alpha-cut cards 22.5° off the axes so nothing is coplanar with a
 *    rail), a two-rail panel card per edge (rails meet AT the posts;
 *    a diagonal stride is one card along the diagonal), gates as two
 *    hinge posts on the tile's boundary and a five-bar leaf that
 *    swings on the tile's own state.
 *  - PALISADE: per edge two flank cards of carved giants (the 2D's
 *    E–W course, both faces) either side of a thin bark top strip, so
 *    the wall has girth from above and crowned points from the side;
 *    a fat junction giant at corners, tees and ends; the gate as two
 *    towering posts (rope collar, the skull), a lintel box with its
 *    three spikes, double lashed leaves.
 *  - IRON: a granite curb PRISM under every edge (iron never touches
 *    soil), the bar panel as a card over it, a forged standard at N–S
 *    joints and every second E–W seam, a grave PIER (plinth, shaft and
 *    cap boxes off one drawGravePier elevation, the finial a cross) at
 *    every corner, tee, end and gate; gate piers wear the orb, the
 *    overthrow spans them, barred leaves swing.
 *  - HEDGE: a VOLUME — the straight mass's faces on EXPOSED sides only
 *    (neighbour not a straight hedge), one crown per tile, and a LOBE
 *    card billowing above every exposed crown edge so the silhouette
 *    reads pillowed from a low camera and the painted crown from a high
 *    one; a 45° hedge is a rotated slab a hair lower than the mass; a
 *    hedge gate is two pillars under a living arch, always open.
 *  - GARRISON rides in garrison.ts (this lane's brief) — see its
 *    ownership note.
 *
 * Heights: every base is `ctx.heightAt` at the element's own foot (a
 * rail between two tiles at different lifts slopes with its ground).
 * The 2D's own heights: fence post 0.92 (drawFencePost s·0.92 — the
 * scaffold's FENCE_POST_H 1.72 is the PALISADE GATE post,
 * barrierArt.ts:905), rails 0.45/0.75, palisade shoulders 1.3–1.62 +
 * points, gate posts 1.72, iron curb 0.15 / spears to 1.41 / piers
 * 1.52 + cap + finial, HED_H 0.95.
 */
import { Tile } from '@arx/shared';
import { HED_H } from './structKinds.js';
import type { StructBuildCtx, StructBuildResult } from './structures.js';
import type { FaceAtlas } from './faceAtlas.js';
import type { StubHost } from './stubHost.js';
import {
  BarrierFaces,
  FENCE_GATE_POST_H,
  FENCE_H,
  FENCE_LEAF_H,
  FENCE_RAIL_TOP,
  HEDGE_ARCH_H,
  HEDGE_ARCH_Y,
  HEDGE_LOBE_DROP,
  HEDGE_LOBE_H,
  HEDGE_PILLAR_H,
  HEDGE_PILLAR_W,
  IRON_CURB_H,
  IRON_CURB_W,
  IRON_LEAF_H,
  IRON_OVERTHROW_H,
  IRON_OVERTHROW_Y,
  IRON_PANEL_H,
  IRON_PIER_CARD_H,
  IRON_PIER_CARD_W,
  IRON_PIER_H,
  IRON_PIER_W,
  IRON_STANDARD_H,
  PALI_BODY_H,
  PALI_CARD_H,
  PALI_LEAF_CARD_H,
  PALI_LEAF_W,
  PALI_POST_CARD_H,
  PALI_POST_H,
  PALI_W,
  subRect,
  variantAt,
} from './barrierFaces.js';
import {
  ALL_EXPOSED,
  barrierGateOpen,
  barrierGateVertical,
  barrierJoins,
  barrierKindOf,
  barrierNode,
  emitBox,
  emitCard,
  emitCross,
  emitRunBox,
  hedgeExposure,
  leafSwing,
  swingLeafEnd,
  type BarrierFamily,
  type BarrierNode,
  type FaceRect,
  type HedgeExposure,
} from './barrierGeom.js';
import { buildGarrisonStructures } from './garrison.js';

/** One BarrierFaces per atlas (the atlas memoizes by key; this only saves the wrapper). */
const facesByAtlas = new WeakMap<FaceAtlas, BarrierFaces>();
function facesFor(atlas: FaceAtlas, host: StubHost): BarrierFaces {
  let f = facesByAtlas.get(atlas);
  if (!f) facesByAtlas.set(atlas, (f = new BarrierFaces(atlas, host)));
  return f;
}

const swingPt = { x: 0, z: 0 };
const hedgeEx: HedgeExposure = { n: false, e: false, s: false, w: false };

function withPage(page: number, r: [number, number, number, number]): FaceRect {
  return { page, u0: r[0], v0: r[1], u1: r[2], v1: r[3] };
}

// ------------------------------------------------------------- gates

interface GateFrame {
  vertical: boolean;
  /** The two boundary post points. */
  p0x: number;
  p0z: number;
  p1x: number;
  p1z: number;
  /** Shut direction (unit) from p0 toward p1, and the open (swing) direction. */
  sx: number;
  sz: number;
  ox: number;
  oz: number;
}

/** The gate's frame: posts on the tile boundary, the leaf swings south (E–W) or east (N–S). */
function gateFrame(fam: BarrierFamily, ctx: StructBuildCtx, tx: number, ty: number, out: GateFrame): GateFrame {
  const vertical = barrierGateVertical(fam, ctx.sampler, tx, ty);
  out.vertical = vertical;
  if (vertical) {
    out.p0x = tx + 0.5;
    out.p0z = ty;
    out.p1x = tx + 0.5;
    out.p1z = ty + 1;
    out.sx = 0;
    out.sz = 1;
    out.ox = 1;
    out.oz = 0;
  } else {
    out.p0x = tx;
    out.p0z = ty + 0.5;
    out.p1x = tx + 1;
    out.p1z = ty + 0.5;
    out.sx = 1;
    out.sz = 0;
    out.ox = 0;
    out.oz = 1;
  }
  return out;
}
const frame: GateFrame = { vertical: false, p0x: 0, p0z: 0, p1x: 0, p1z: 0, sx: 0, sz: 0, ox: 0, oz: 0 };

// ------------------------------------------------------------- fence

function buildFence(ctx: StructBuildCtx, faces: BarrierFaces): void {
  const tiles = ctx.scan.byFamily.get('fence');
  if (!tiles) return;
  const sink = ctx.sink;
  const post = faces.fencePost(false);
  const rail = faces.fenceRail();
  for (const t of tiles) {
    const node = barrierNode('fence', ctx.sampler, t.tx, t.ty);
    if (!node) continue;
    if (node.kind === 'gate') {
      const f = gateFrame('fence', ctx, t.tx, t.ty, frame);
      const gp = faces.fencePost(true);
      emitCross(sink, 'cutout', gp, f.p0x, f.p0z, ctx.heightAt(f.p0x, f.p0z), 0.22, FENCE_GATE_POST_H + 0.02);
      emitCross(sink, 'cutout', gp, f.p1x, f.p1z, ctx.heightAt(f.p1x, f.p1z), 0.22, FENCE_GATE_POST_H + 0.02);
      const hx = f.p0x + f.sx * 0.1;
      const hz = f.p0z + f.sz * 0.1;
      const end = swingLeafEnd(hx, hz, f.sx, f.sz, f.ox, f.oz, 0.8, leafSwing(barrierGateOpen(t.tile)), swingPt);
      const y = ctx.heightAt(hx, hz);
      emitCard(sink, 'cutout', faces.fenceLeaf(), hx, hz, end.x, end.z, y, y, FENCE_LEAF_H);
      continue;
    }
    emitCross(sink, 'cutout', post, node.x, node.z, ctx.heightAt(node.x, node.z), 0.22, FENCE_H + 0.02);
    for (const e of node.edges) {
      emitCard(sink, 'cutout', rail, e.ax, e.az, e.bx, e.bz, ctx.heightAt(e.ax, e.az), ctx.heightAt(e.bx, e.bz), FENCE_RAIL_TOP + 0.02, 0, Math.min(1, e.len));
    }
  }
}

// ---------------------------------------------------------- palisade

function buildPalisade(ctx: StructBuildCtx, faces: BarrierFaces): void {
  const tiles = ctx.scan.byFamily.get('palisade');
  if (!tiles) return;
  const sink = ctx.sink;
  const top = faces.palisadeTop();
  for (const t of tiles) {
    const node = barrierNode('palisade', ctx.sampler, t.tx, t.ty);
    if (!node) continue;
    if (node.kind === 'gate') {
      palisadeGate(ctx, faces, t.tx, t.ty, barrierGateOpen(t.tile));
      continue;
    }
    for (const e of node.edges) {
      const run = faces.palisadeRun(variantAt(47, Math.floor(e.ax), Math.floor(e.az), 8));
      const ya = ctx.heightAt(e.ax, e.az);
      const yb = ctx.heightAt(e.bx, e.bz);
      // Flanks: the same carved course on both faces of the wall.
      const dx = e.bx - e.ax;
      const dz = e.bz - e.az;
      const nx = (-dz / e.len) * (PALI_W / 2);
      const nz = (dx / e.len) * (PALI_W / 2);
      const fu1 = Math.min(1, e.len);
      emitCard(sink, 'cutout', run, e.ax + nx, e.az + nz, e.bx + nx, e.bz + nz, ya, yb, PALI_CARD_H, 0, fu1);
      emitCard(sink, 'cutout', run, e.ax - nx, e.az - nz, e.bx - nx, e.bz - nz, ya, yb, PALI_CARD_H, 0, fu1);
      emitRunBox(sink, 'opaque', { side: null, end: null, top }, e.ax, e.az, e.bx, e.bz, PALI_W, ya, yb, PALI_BODY_H, false, false);
    }
    if (node.anchor) {
      const anchor = faces.palisadeAnchor(variantAt(53, t.tx, t.ty, 8));
      emitCross(sink, 'cutout', anchor, node.x, node.z, ctx.heightAt(node.x, node.z), 0.34, PALI_CARD_H);
    }
  }
}

/** THE GREAT GATE (barrierArt.ts palisadeGateItem) — posts, lintel, spikes, double leaves. */
function palisadeGate(ctx: StructBuildCtx, faces: BarrierFaces, tx: number, ty: number, open: boolean): void {
  const sink = ctx.sink;
  const f = gateFrame('palisade', ctx, tx, ty, frame);
  // Posts stand 0.06 in from the boundary (p.x ± 0.44·s), skull on the hash-picked one.
  const inset = 0.06;
  const p0x = f.p0x + f.sx * inset;
  const p0z = f.p0z + f.sz * inset;
  const p1x = f.p1x - f.sx * inset;
  const p1z = f.p1z - f.sz * inset;
  const skullOn0 = ((tx * 7 + ty * 13) & 1) === 1;
  const y0 = ctx.heightAt(p0x, p0z);
  const y1 = ctx.heightAt(p1x, p1z);
  emitCross(sink, 'cutout', faces.palisadePost(skullOn0), p0x, p0z, y0, 0.42, PALI_POST_CARD_H);
  emitCross(sink, 'cutout', faces.palisadePost(!skullOn0), p1x, p1z, y1, 0.42, PALI_POST_CARD_H);
  if (!f.vertical) {
    // The lintel beam overhead: a box from post to post (+ the end grain past each), spikes standing on it.
    const beam = faces.palisadeBeam();
    const beamTop = faces.palisadeBeamTop();
    const ly = Math.max(y0, y1) + PALI_POST_H + 0.12;
    const lx0 = p0x - 0.19;
    const lx1 = p1x + 0.19;
    emitBox(sink, 'opaque', { side: beam, end: beam, top: beamTop }, lx0, ty + 0.5 - 0.1, lx1, ty + 0.5 + 0.1, ly, ly + 0.13, ALL_EXPOSED);
    emitCard(sink, 'cutout', faces.palisadeSpikes(), lx0, ty + 0.5, lx1, ty + 0.5, ly + 0.13, ly + 0.13, 0.27);
  }
  // Double leaves, each folding toward its own post.
  const leaf = faces.palisadeLeaf();
  const sw = leafSwing(open);
  const h0x = p0x + f.sx * 0.09;
  const h0z = p0z + f.sz * 0.09;
  const e0 = swingLeafEnd(h0x, h0z, f.sx, f.sz, f.ox, f.oz, PALI_LEAF_W, sw, swingPt);
  emitCard(sink, 'cutout', leaf, h0x, h0z, e0.x, e0.z, y0, y0, PALI_LEAF_CARD_H);
  const h1x = p1x - f.sx * 0.09;
  const h1z = p1z - f.sz * 0.09;
  const e1 = swingLeafEnd(h1x, h1z, -f.sx, -f.sz, f.ox, f.oz, PALI_LEAF_W, sw, swingPt);
  emitCard(sink, 'cutout', leaf, h1x, h1z, e1.x, e1.z, y1, y1, PALI_LEAF_CARD_H);
}

// -------------------------------------------------------------- iron

/** A grave pier at (cx,cz): plinth, shaft and cap boxes off the pier elevation, the finial a cross. */
function ironPier(ctx: StructBuildCtx, faces: BarrierFaces, cx: number, cz: number, finial: 'urn' | 'orb'): void {
  const sink = ctx.sink;
  const card = faces.ironPier(finial);
  const y0 = ctx.heightAt(cx, cz);
  const H = IRON_PIER_CARD_H;
  const W = IRON_PIER_CARD_W;
  const plinthH = 0.16;
  const plinthW = IRON_PIER_W * 1.24;
  const capW = IRON_PIER_W * 1.42;
  const capH = 0.135;
  const col = (w: number): [number, number] => [0.5 - w / 2 / W, 0.5 + w / 2 / W];
  const top = faces.ironPierTop();
  const [pu0, pu1] = col(plinthW);
  const plinth = withPage(card.page, subRect(card, pu0, 0.01, pu1, plinthH / H));
  emitBox(sink, 'opaque', { side: plinth, top: null }, cx - plinthW / 2, cz - plinthW / 2, cx + plinthW / 2, cz + plinthW / 2, y0, y0 + plinthH, ALL_EXPOSED);
  const [su0, su1] = col(IRON_PIER_W);
  const shaft = withPage(card.page, subRect(card, su0, plinthH / H, su1, IRON_PIER_H / H));
  emitBox(sink, 'opaque', { side: shaft, top: null }, cx - IRON_PIER_W / 2, cz - IRON_PIER_W / 2, cx + IRON_PIER_W / 2, cz + IRON_PIER_W / 2, y0 + plinthH, y0 + IRON_PIER_H, ALL_EXPOSED);
  const [cu0, cu1] = col(capW);
  const cap = withPage(card.page, subRect(card, cu0, IRON_PIER_H / H, cu1, (IRON_PIER_H + capH) / H));
  emitBox(sink, 'opaque', { side: cap, top }, cx - capW / 2, cz - capW / 2, cx + capW / 2, cz + capW / 2, y0 + IRON_PIER_H, y0 + IRON_PIER_H + capH, ALL_EXPOSED);
  const fw = 0.22;
  const [fu0, fu1] = col(fw);
  const finialRef = withPage(card.page, subRect(card, fu0, (IRON_PIER_H + capH) / H, fu1, 1));
  emitCross(sink, 'cutout', finialRef, cx, cz, y0 + IRON_PIER_H + capH, fw, H - IRON_PIER_H - capH);
}

function buildIron(ctx: StructBuildCtx, faces: BarrierFaces): void {
  const tiles = ctx.scan.byFamily.get('iron');
  if (!tiles) return;
  const sink = ctx.sink;
  const curb = faces.ironCurb();
  const curbTop = faces.ironCurbTop();
  const standard = faces.ironStandard();
  for (const t of tiles) {
    const node = barrierNode('iron', ctx.sampler, t.tx, t.ty);
    if (!node) continue;
    if (node.kind === 'gate') {
      ironGate(ctx, faces, t.tx, t.ty, barrierGateOpen(t.tile));
      continue;
    }
    for (const e of node.edges) {
      const ya = ctx.heightAt(e.ax, e.az);
      const yb = ctx.heightAt(e.bx, e.bz);
      emitRunBox(sink, 'opaque', { side: curb, end: curb, top: curbTop }, e.ax, e.az, e.bx, e.bz, IRON_CURB_W, ya, yb, IRON_CURB_H, true, true);
      const panel = faces.ironPanel(variantAt(167, Math.floor(e.ax), Math.floor(e.az), 8));
      emitCard(sink, 'cutout', panel, e.ax, e.az, e.bx, e.bz, ya, yb, IRON_PANEL_H, 0, Math.min(1, e.len));
      // THE STANDARD at every second E–W seam (barrierArt.ts:1594: tx % 2 === 0 && cw).
      if (e.dx === 1 && e.dy === 0 && e.len >= 1 && ((t.tx + 1) & 1) === 0) {
        const mx = (e.ax + e.bx) / 2;
        const mz = (e.az + e.bz) / 2;
        emitCross(sink, 'cutout', standard, mx, mz, ctx.heightAt(mx, mz), 0.16, IRON_STANDARD_H);
      }
    }
    if (node.anchor) {
      ironPier(ctx, faces, node.x, node.z, 'urn');
    } else if (node.through && (node.incident & 0b1010) === 0b1010) {
      // The joint of a through N–S run: the standard covers it (:1662).
      emitCross(sink, 'cutout', standard, node.x, node.z, ctx.heightAt(node.x, node.z), 0.16, IRON_STANDARD_H);
    }
  }
}

/** THE GRAVEYARD GATE: orb piers, the overthrow between them, two barred leaves. */
function ironGate(ctx: StructBuildCtx, faces: BarrierFaces, tx: number, ty: number, open: boolean): void {
  const sink = ctx.sink;
  const f = gateFrame('iron', ctx, tx, ty, frame);
  ironPier(ctx, faces, f.p0x, f.p0z, 'orb');
  ironPier(ctx, faces, f.p1x, f.p1z, 'orb');
  const y0 = ctx.heightAt(f.p0x, f.p0z);
  const y1 = ctx.heightAt(f.p1x, f.p1z);
  const yo = Math.max(y0, y1) + IRON_OVERTHROW_Y;
  emitCard(sink, 'cutout', faces.ironOverthrow(), f.p0x, f.p0z, f.p1x, f.p1z, yo, yo, IRON_OVERTHROW_H);
  const leaf = faces.ironLeaf();
  const sw = leafSwing(open);
  const half = 0.37;
  const inset = IRON_PIER_W / 2;
  const h0x = f.p0x + f.sx * inset;
  const h0z = f.p0z + f.sz * inset;
  const e0 = swingLeafEnd(h0x, h0z, f.sx, f.sz, f.ox, f.oz, half, sw, swingPt);
  emitCard(sink, 'cutout', leaf, h0x, h0z, e0.x, e0.z, y0, y0, IRON_LEAF_H);
  const h1x = f.p1x - f.sx * inset;
  const h1z = f.p1z - f.sz * inset;
  const e1 = swingLeafEnd(h1x, h1z, -f.sx, -f.sz, f.ox, f.oz, half, sw, swingPt);
  emitCard(sink, 'cutout', leaf, h1x, h1z, e1.x, e1.z, y1, y1, IRON_LEAF_H);
}

// ------------------------------------------------------------- hedge

function buildHedge(ctx: StructBuildCtx, faces: BarrierFaces): void {
  const tiles = ctx.scan.byFamily.get('hedge');
  if (!tiles) return;
  const sink = ctx.sink;
  const s = ctx.sampler;
  for (const t of tiles) {
    const { tx, ty } = t;
    const kind = barrierKindOf('hedge', t.tile);
    if (kind === null) continue;
    const y0 = ctx.heightAt(tx + 0.5, ty + 0.5);
    const crown = faces.hedgeCrown(variantAt(139, tx, ty, 8));
    if (kind === 'straight') {
      const ex = hedgeExposure(s, tx, ty, hedgeEx);
      const y1 = y0 + HED_H;
      sink.top('opaque', crown.page, tx, ty, tx + 1, ty + 1, y1, crown.u0, crown.v0, crown.u1, crown.v1);
      const yl = y1 - HEDGE_LOBE_DROP;
      // Faces and lobe cards on the exposed sides, each with its own world-keyed variant.
      if (ex.s) {
        const fr = faces.hedgeFace(variantAt(181, tx, ty, 12));
        sink.face('opaque', fr.page, tx, ty + 1, tx + 1, ty + 1, y0, y1, fr.u0, fr.v0, fr.u1, fr.v1, 0, 1);
        emitCard(sink, 'cutout', faces.hedgeLobes(variantAt(71, tx, ty, 8)), tx, ty + 1, tx + 1, ty + 1, yl, yl, HEDGE_LOBE_H);
      }
      if (ex.n) {
        const fr = faces.hedgeFace(variantAt(183, tx, ty, 12));
        sink.face('opaque', fr.page, tx + 1, ty, tx, ty, y0, y1, fr.u0, fr.v0, fr.u1, fr.v1, 0, -1);
        emitCard(sink, 'cutout', faces.hedgeLobes(variantAt(73, tx, ty, 8)), tx + 1, ty, tx, ty, yl, yl, HEDGE_LOBE_H);
      }
      if (ex.e) {
        const fr = faces.hedgeFace(variantAt(185, tx, ty, 12));
        sink.face('opaque', fr.page, tx + 1, ty + 1, tx + 1, ty, y0, y1, fr.u0, fr.v0, fr.u1, fr.v1, 1, 0);
        emitCard(sink, 'cutout', faces.hedgeLobes(variantAt(75, tx, ty, 8)), tx + 1, ty + 1, tx + 1, ty, yl, yl, HEDGE_LOBE_H);
      }
      if (ex.w) {
        const fr = faces.hedgeFace(variantAt(187, tx, ty, 12));
        sink.face('opaque', fr.page, tx, ty, tx, ty + 1, y0, y1, fr.u0, fr.v0, fr.u1, fr.v1, -1, 0);
        emitCard(sink, 'cutout', faces.hedgeLobes(variantAt(77, tx, ty, 8)), tx, ty, tx, ty + 1, yl, yl, HEDGE_LOBE_H);
      }
    } else if (kind === 'diagNE' || kind === 'diagNW') {
      // THE ROTATED SLAB along the stroke, a hair lower than the mass.
      const ne = kind === 'diagNE';
      const ax = ne ? tx : tx;
      const az = ne ? ty + 1 : ty;
      const bx = tx + 1;
      const bz = ne ? ty : ty + 1;
      const capA = !barrierJoins('hedge', s, tx, ty, -1, ne ? 1 : -1);
      const capB = !barrierJoins('hedge', s, tx, ty, 1, ne ? -1 : 1);
      const fr = faces.hedgeFace(variantAt(181, tx, ty, 12));
      emitRunBox(sink, 'opaque', { side: fr, end: fr, top: crown }, ax, az, bx, bz, 0.7, y0, y0, HED_H - 0.02, capA, capB);
      const yl = y0 + HED_H - 0.02 - HEDGE_LOBE_DROP;
      const lob = faces.hedgeLobes(variantAt(71, tx, ty, 8));
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      const nx = (-dz / len) * 0.35;
      const nz = (dx / len) * 0.35;
      emitCard(sink, 'cutout', lob, ax + nx, az + nz, bx + nx, bz + nz, yl, yl, HEDGE_LOBE_H);
      emitCard(sink, 'cutout', lob, ax - nx, az - nz, bx - nx, bz - nz, yl, yl, HEDGE_LOBE_H);
    } else {
      // THE LIVING ARCH: two pillars on the boundary under a foliage arch; the passage stays open.
      const f = gateFrame('hedge', ctx, tx, ty, frame);
      const fr = faces.hedgeFace(variantAt(181, tx, ty, 12));
      const hw = HEDGE_PILLAR_W / 2;
      const capRef = withPage(crown.page, subRect(crown, 0.3, 0.3, 0.7, 0.7));
      for (const [px, pz] of [
        [f.p0x, f.p0z],
        [f.p1x, f.p1z],
      ] as const) {
        const py = ctx.heightAt(px, pz);
        emitBox(sink, 'opaque', { side: fr, top: capRef }, px - hw, pz - hw, px + hw, pz + hw, py, py + HEDGE_PILLAR_H, ALL_EXPOSED);
      }
      const ya = Math.max(ctx.heightAt(f.p0x, f.p0z), ctx.heightAt(f.p1x, f.p1z)) + HEDGE_ARCH_Y;
      emitCard(sink, 'cutout', faces.hedgeArch(), f.p0x, f.p0z, f.p1x, f.p1z, ya, ya, HEDGE_ARCH_H);
    }
  }
}

// ------------------------------------------------------------ export

export function buildBarrierStructures(ctx: StructBuildCtx): StructBuildResult {
  const faces = facesFor(ctx.atlas, ctx.host);
  const before = ctx.sink.quads;
  buildFence(ctx, faces);
  buildPalisade(ctx, faces);
  buildIron(ctx, faces);
  buildHedge(ctx, faces);
  const garrison = buildGarrisonStructures(ctx, faces);
  const quads = ctx.sink.quads - before;
  const n = (fam: string): number => ctx.scan.byFamily.get(fam as 'fence')?.length ?? 0;
  return {
    quads,
    note: `barriers: fence ${n('fence')} pali ${n('palisade')} iron ${n('iron')} hedge ${n('hedge')} garrison ${n('garrison')} tiles → ${quads} quads (garrison ${garrison})`,
  };
}

/** Exposed for the lab/probe: the tile ids this lane answers for. */
export const BARRIER_LANE_TILES: ReadonlySet<number> = new Set<number>([Tile.Fence, Tile.Palisade, Tile.Hedge, Tile.IronFence, Tile.WallGarrison]);
