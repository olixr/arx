/**
 * THE WALLS LANE (play3d W2) — OWNER: the WALLS lane.
 *
 * Buildings as geometry with painted faces: stone / wood / cave wall
 * runs (WALL_H prisms, crown + exposed side faces only — the shared-
 * edge law), windows as real holes (THE WIDE LIGHT merges consecutive
 * windows), doorways (jambs + header, the leaf by doorInfo posture,
 * side doorways edge-on), 45° diagonal walls (diagWallInfo names the
 * SOLID triangle), the garrison curtain (GARRISON_H + MERLON_H teeth,
 * gates), awnings over their host walls, and the wall-hung details on
 * the south face (wallHungArt *OnFace under the stub host).
 *
 * Contract: read `ctx.scan.byFamily.get('wall' | 'garrison')` and the
 * awning tiles (`ctx.scan` lists only standing families; awnings are
 * `awningInfo(ctx.sampler.groundAt(...))` on the tile SOUTH of a host
 * — scan the chunk for them), mint face tiles from `ctx.atlas`, push
 * quads into `ctx.sink` in WORLD coordinates (x = tile x, y = height,
 * z = tile y) at `ctx.heightAt(...) + tile.lift`. Wood skin per
 * building: `ctx.woodSkinFor(ctx.regionAt(tx, ty ± 1))`. Tones through
 * faceTone.litTone. Heights from structKinds.ts.
 *
 * SCAFFOLD STUB: lands nothing. The scaffold commit proves the plumbing
 * with zero visible change; this file is the lane's to fill.
 */
import type { StructBuildCtx, StructBuildResult } from './structures.js';

export function buildWallStructures(_ctx: StructBuildCtx): StructBuildResult {
  return { quads: 0, note: 'walls: scaffold stub' };
}
