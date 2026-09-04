/**
 * THE BARRIERS LANE (play3d W2) — OWNER: the BARRIERS lane.
 *
 * The four barrier families as geometry with painted faces: post-and-
 * rail fences (posts 1.72 tall, rails as alpha-cut cards reaching
 * toward run-mates and gates), the palisade (1.66 sharpened logs,
 * rope, the lashed gate), the graveyard's iron fence (curb, piers,
 * bars as cutout cards, the barred gate) and the hedge (HED_H 0.95
 * folded mass — one component, one silhouette: use collectVolume's
 * exposed-perimeter loop for the footprint and hedge lobes as cutout
 * cards on the crown). Diagonals stride corner to corner
 * (`barrierDiag` + `corner*` on TileStruct). THE SEPARATE-MASONRY LAW:
 * each family merges only with itself (structKinds.ts continuity);
 * 2D `fenceish` also REACHES rails toward house walls — that reach is
 * this lane's to decide, not run continuity.
 *
 * Contract: read `ctx.scan.byFamily.get('fence' | 'palisade' |
 * 'hedge' | 'iron')`, mint face tiles from `ctx.atlas` (cards with
 * `bleed: false`), call barrierArt's low-level primitives
 * (drawFencePost, giantLog, ironBar, hedgeMassPaint, …) under
 * `asPaintHost(aimStubHost(ctx.host, tileCtx))`, push quads into
 * `ctx.sink` as 'cutout' (cards) or 'opaque' (hedge mass, curbs) in
 * WORLD coordinates at `ctx.heightAt(...) + tile.lift`.
 *
 * SCAFFOLD STUB: lands nothing.
 */
import type { StructBuildCtx, StructBuildResult } from './structures.js';

export function buildBarrierStructures(_ctx: StructBuildCtx): StructBuildResult {
  return { quads: 0, note: 'barriers: scaffold stub' };
}
