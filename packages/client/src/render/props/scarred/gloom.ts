/**
 * THE SCARRED LAND — D. the gloom: what was here first. GloomStone
 * (522), CreepRoot (523), FoulPool (524), CropBlighted (525). The
 * stone and the pool carry cool-swell light rows in lights.ts (no
 * gate, non-occluding) — collect-time light, never queueGlow. The
 * blighted crop rides the CROP painter path (render/crops.ts grows a
 * blight model for it; drawFlora bakes it with the ring like every
 * crop). K0 stubs; K4 replaces.
 */
import { Tile } from '@arx/shared';
import { SCAR_CHAR, SCAR_GLOOM } from '../palette.js';
import { stubBlock } from './stub.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

const GLOOM_STONE = '#3c3a52';
const POOL_SCUM = '#2f3d38';

/** The blighted row: the crop painter path with the blight palette. */
function paintCropBlighted(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tile, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  return {
    sortY: ty + 0.75,
    drawShadow: () => rend.castFloraShadow(p.x, p.y + syT * 0.3, tile, h),
    draw: () => rend.drawFlora(p.x, p.y, tx, ty, tile, h, t),
  };
}

export const GLOOM_PROPS: PropEntries = [
  [[Tile.GloomStone], stubBlock({ hw: 0.3, up: 0.6, ink: GLOOM_STONE, lit: SCAR_GLOOM, depth: 0.3 })],
  [[Tile.CreepRoot], stubBlock({ hw: 0.38, up: 0.26, ink: SCAR_CHAR, depth: 0.36, sortOff: 0.6 })],
  [[Tile.FoulPool], stubBlock({ hw: 0.44, up: 0.02, ink: POOL_SCUM, lit: '#4c6a58', depth: 0.5, flat: true, sortOff: 0.35 })],
  [[Tile.CropBlighted], paintCropBlighted],
];
