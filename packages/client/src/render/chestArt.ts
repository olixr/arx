/**
 * THE CHEST CABINET — wood, mossy, iron, gilded and boss chests, with the
 * lid pose law and the revealed mouth.
 * Moved verbatim off the Renderer class (foundations F2 wave A); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { twinkle } from './paintVocab.js';
import { shade } from './tint.js';
import { sparkle } from './rockArt.js';
import type { PaintHost } from './paintHost.js';

/**
 * The revealed mouth: the body's own plan as a dark cavity — one
 * bold lining band on the near wall, one sunlit near-rim lane.
 */
export function chestMouth(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  cx: number,
  bodyT: number,
  bw: number,
  topD: number,
  s: number,
  reveal: number,
  wall: string,
  lining: string,
): void {
  const mouthT = bodyT - topD;
  ctx.fillStyle = wall;
  ctx.fillRect(cx - bw, mouthT, bw * 2, topD);
  ctx.fillStyle = '#1b1326';
  ctx.fillRect(cx - bw + s * 0.04, mouthT + s * 0.03, bw * 2 - s * 0.08, topD - s * 0.06);
  ctx.globalAlpha = Math.min(1, reveal);
  ctx.fillStyle = lining;
  ctx.fillRect(cx - bw + s * 0.04, mouthT + topD * 0.56, bw * 2 - s * 0.08, topD * 0.3);
  ctx.globalAlpha = 1;
}

/**
 * The standing open lid: the lid's inner face as a square slab
 * rising behind the box — frame color around a lining inset, a cap
 * strip along the top. Bespoke trim is painted by the caller.
 */
export function chestStandingLid(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  cx: number,
  hingeY: number,
  bw: number,
  standH: number,
  s: number,
  frame: string,
  lining: string,
  cap: string,
): number {
  const w = bw * 2 - s * 0.05;
  const topY = hingeY - standH;
  ctx.fillStyle = frame;
  ctx.fillRect(cx - w / 2, topY, w, standH);
  if (standH > s * 0.12) {
    ctx.fillStyle = lining;
    ctx.fillRect(cx - w / 2 + s * 0.045, topY + s * 0.05, w - s * 0.09, standH - s * 0.075);
    ctx.fillStyle = shade(lining, 12);
    ctx.fillRect(cx - w / 2 + s * 0.045, hingeY - s * 0.06, w - s * 0.09, s * 0.035);
  }
  ctx.fillStyle = cap;
  ctx.fillRect(cx - w / 2, topY, w, s * 0.038);
  return topY;
}

/**
 * A moss slab: a low-poly rectangular patch — deep seat offset
 * down-right, square body, one bold lit top strip. Never a blob.
 */
export function mossSlab(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  hgt: number,
  s: number,
): void {
  ctx.fillStyle = '#42502f';
  ctx.fillRect(x + s * 0.014, y + s * 0.014, w, hgt);
  ctx.fillStyle = '#5c6b46';
  ctx.fillRect(x, y, w, hgt);
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(x, y, w, Math.min(hgt * 0.4, s * 0.035));
}

/**
 * WOOD — the traveller's trunk. Honest warm boards carried by two
 * broad silver straps and a silver arris cap: the metal is the
 * contrast, the wood stays quiet.
 */
export function drawChestWood(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  o: number,
): void {
  const bw = 0.4 * s;
  const bodyH = 0.3 * s;
  const lidH = 0.12 * s;
  const topD = 0.2 * s;
  const bodyT = baseY - bodyH;
  const { tilt, stand } = chestPose(o);
  // Skid base.
  ctx.fillStyle = '#3f2c12';
  ctx.fillRect(cx - bw, baseY - s * 0.02, bw * 2, s * 0.055);
  // Carcase: one mass, one lit lane, one settled band.
  ctx.fillStyle = '#7d5a30';
  ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
  ctx.fillStyle = '#96703c';
  ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.055);
  ctx.fillStyle = '#573d1d';
  ctx.fillRect(cx - bw, baseY - s * 0.075, bw * 2, s * 0.055);
  // Straps: broad silver verticals with one square rivet each.
  for (const bx of [-0.21, 0.21] as const) {
    ctx.fillStyle = '#3a3544';
    ctx.fillRect(cx + bx * s - s * 0.0475 + s * 0.018, bodyT, s * 0.095, bodyH);
    ctx.fillStyle = '#9aa1ad';
    ctx.fillRect(cx + bx * s - s * 0.0475, bodyT, s * 0.095, bodyH);
    ctx.fillStyle = '#cdd3dc';
    ctx.fillRect(cx + bx * s - s * 0.0475, bodyT, s * 0.03, bodyH);
    ctx.fillStyle = '#3a3544';
    ctx.fillRect(cx + bx * s - s * 0.017, bodyT + bodyH * 0.48, s * 0.034, s * 0.034);
  }
  // Mouth, once the lid is away.
  if (o > 0.1) chestMouth(rend, ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#573d1d', '#54422c');
  // Lid: tilting plan (closed beat) or standing slab (open beat).
  const mouthT = bodyT - topD;
  if (tilt > 0) {
    const d = topD * tilt;
    const lidT = bodyT - d - lidH;
    ctx.fillStyle = '#a5793f';
    ctx.fillRect(cx - bw, lidT, bw * 2, d);
    ctx.fillStyle = '#6e4d24';
    ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
    // Front band.
    ctx.fillStyle = '#8a6534';
    ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
    // Straps ride the lid.
    for (const bx of [-0.21, 0.21] as const) {
      ctx.fillStyle = '#9aa1ad';
      ctx.fillRect(cx + bx * s - s * 0.0475, lidT, s * 0.095, d + lidH);
      ctx.fillStyle = '#cdd3dc';
      ctx.fillRect(cx + bx * s - s * 0.0475, lidT, s * 0.03, d + lidH);
    }
    // The silver arris cap — the signature line of the trunk.
    ctx.fillStyle = '#cdd3dc';
    ctx.fillRect(cx - bw, lidT + d - s * 0.02, bw * 2, s * 0.02);
    ctx.fillStyle = '#9aa1ad';
    ctx.fillRect(cx - bw, lidT + d, bw * 2, s * 0.025);
    // Hasp plate over the seam.
    ctx.fillStyle = '#9aa1ad';
    ctx.fillRect(cx - s * 0.06, lidT + d + lidH - s * 0.045, s * 0.12, s * 0.115);
    ctx.fillStyle = '#cdd3dc';
    ctx.fillRect(cx - s * 0.06, lidT + d + lidH - s * 0.045, s * 0.12, s * 0.03);
    ctx.fillStyle = '#26222e';
    ctx.fillRect(cx - s * 0.023, lidT + d + lidH + s * 0.005, s * 0.046, s * 0.042);
  }
  if (stand > 0) {
    const topY = chestStandingLid(rend, ctx, cx, mouthT, bw, s * 0.3 * stand, s, '#7d5a30', '#54422c', '#9aa1ad');
    // The straps' inner shadows show faintly on the lining.
    if (stand > 0.6) {
      ctx.fillStyle = 'rgba(58, 53, 68, 0.35)';
      for (const bx of [-0.21, 0.21] as const) {
        ctx.fillRect(cx + bx * s - s * 0.045, topY + s * 0.05, s * 0.09, s * 0.3 * stand - s * 0.11);
      }
    }
  }
}

/**
 * MOSSY — the wayside elder. A batten-built chest with no metal
 * left worth naming, being claimed one square slab of moss at a
 * time. Blocky moss, blocky mushrooms, quiet wood.
 */
export function drawChestMossy(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  o: number,
): void {
  const bw = 0.4 * s;
  const bodyH = 0.28 * s;
  const lidH = 0.12 * s;
  const topD = 0.2 * s;
  const bodyT = baseY - bodyH;
  const { tilt, stand } = chestPose(o);
  ctx.fillStyle = '#3a3428';
  ctx.fillRect(cx - bw, baseY - s * 0.02, bw * 2, s * 0.05);
  // Aged carcase.
  ctx.fillStyle = '#6b6152';
  ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
  ctx.fillStyle = '#7d7362';
  ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.05);
  ctx.fillStyle = '#494136';
  ctx.fillRect(cx - bw, baseY - s * 0.07, bw * 2, s * 0.05);
  // Wooden battens, pegged — no metal on this one.
  for (const bx of [-0.22, 0.22] as const) {
    ctx.fillStyle = '#453e30';
    ctx.fillRect(cx + bx * s - s * 0.045 + s * 0.016, bodyT, s * 0.09, bodyH);
    ctx.fillStyle = '#57503f';
    ctx.fillRect(cx + bx * s - s * 0.045, bodyT, s * 0.09, bodyH);
    ctx.fillStyle = '#8a6534';
    ctx.fillRect(cx + bx * s - s * 0.016, bodyT + bodyH * 0.42, s * 0.032, s * 0.032);
  }
  if (o > 0.1) chestMouth(rend, ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#494136', '#3d4434');
  const mouthT = bodyT - topD;
  if (tilt > 0) {
    const d = topD * tilt;
    const lidT = bodyT - d - lidH;
    ctx.fillStyle = '#7d7362';
    ctx.fillRect(cx - bw, lidT, bw * 2, d);
    ctx.fillStyle = '#554c3e';
    ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
    ctx.fillStyle = '#6b6152';
    ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
    ctx.fillStyle = '#8a8070';
    ctx.fillRect(cx - bw, lidT + d - s * 0.022, bw * 2, s * 0.022);
    // Wooden toggle latch.
    ctx.fillStyle = '#8a6534';
    ctx.fillRect(cx - s * 0.045, lidT + d + lidH - s * 0.035, s * 0.09, s * 0.085);
    ctx.fillStyle = '#573d1d';
    ctx.fillRect(cx - s * 0.014, lidT + d + lidH - s * 0.005, s * 0.028, s * 0.04);
    // The moss takes the lid from the left, one slab at a time.
    mossSlab(rend, ctx, cx - bw, lidT, s * 0.3, d + s * 0.02, s);
    mossSlab(rend, ctx, cx - bw + s * 0.1, lidT + d - s * 0.02, s * 0.17, lidH + s * 0.02, s);
    mossSlab(rend, ctx, cx + bw * 0.45, lidT + d - s * 0.03, s * 0.13, s * 0.07, s);
  }
  if (stand > 0) {
    const topY = chestStandingLid(rend, ctx, cx, mouthT, bw, s * 0.29 * stand, s, '#6b6152', '#3d4434', '#7d7362');
    if (stand > 0.5) mossSlab(rend, ctx, cx - bw + s * 0.025, topY, s * 0.22, s * 0.07, s);
  }
  // The floor is winning: slabs at the feet, mushrooms at the corner.
  mossSlab(rend, ctx, cx - bw - s * 0.02, baseY - s * 0.06, s * 0.2, s * 0.075, s);
  mossSlab(rend, ctx, cx + bw * 0.5, baseY - s * 0.035, s * 0.14, s * 0.055, s);
  for (const [ox, cw2, st] of [
    [0.1, 0.1, 0.06],
    [0.24, 0.07, 0.04],
  ] as const) {
    const mx = cx + bw + ox * s - s * 0.05;
    ctx.fillStyle = '#d8cbb0';
    ctx.fillRect(mx - s * 0.016, baseY - (st + 0.008) * s, s * 0.032, st * s);
    ctx.fillStyle = '#a35540';
    ctx.fillRect(mx - cw2 * s * 0.5, baseY - (st + 0.05) * s, cw2 * s, s * 0.045);
    ctx.fillStyle = '#c97a5a';
    ctx.fillRect(mx - cw2 * s * 0.5, baseY - (st + 0.05) * s, cw2 * s, s * 0.018);
  }
}

/**
 * IRON — the strongchest. Dark timber in an iron grip: corner
 * columns, one massive belt, and a padlock the size of a fist.
 * The lock IS the promise; it goes with the key that opens it.
 */
export function drawChestIron(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  o: number,
): void {
  const bw = 0.41 * s;
  const bodyH = 0.34 * s;
  const lidH = 0.13 * s;
  const topD = 0.19 * s;
  const bodyT = baseY - bodyH;
  const { tilt, stand } = chestPose(o);
  ctx.fillStyle = '#26222e';
  ctx.fillRect(cx - bw, baseY - s * 0.02, bw * 2, s * 0.055);
  // Dark timber mass.
  ctx.fillStyle = '#4a3826';
  ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
  ctx.fillStyle = '#5c452c';
  ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.05);
  ctx.fillStyle = '#31220e';
  ctx.fillRect(cx - bw, baseY - s * 0.08, bw * 2, s * 0.06);
  // Iron corner columns.
  for (const sgn of [-1, 1] as const) {
    const x0 = sgn < 0 ? cx - bw : cx + bw - s * 0.08;
    ctx.fillStyle = '#26222e';
    ctx.fillRect(x0, bodyT, s * 0.08, bodyH);
    ctx.fillStyle = '#565062';
    ctx.fillRect(x0 + (sgn < 0 ? 0 : s * 0.012), bodyT, s * 0.068, bodyH);
    ctx.fillStyle = '#8a8494';
    ctx.fillRect(x0 + (sgn < 0 ? 0 : s * 0.055), bodyT, s * 0.025, bodyH);
  }
  // THE BELT: one massive iron band around the middle.
  ctx.fillStyle = '#26222e';
  ctx.fillRect(cx - bw, bodyT + bodyH * 0.38 + s * 0.02, bw * 2, s * 0.1);
  ctx.fillStyle = '#565062';
  ctx.fillRect(cx - bw, bodyT + bodyH * 0.38, bw * 2, s * 0.1);
  ctx.fillStyle = '#8a8494';
  ctx.fillRect(cx - bw, bodyT + bodyH * 0.38, bw * 2, s * 0.03);
  ctx.fillStyle = '#26222e';
  for (const rx of [-0.28, 0, 0.28] as const) {
    ctx.fillRect(cx + rx * s - s * 0.018, bodyT + bodyH * 0.38 + s * 0.032, s * 0.036, s * 0.036);
  }
  if (o > 0.1) chestMouth(rend, ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#31220e', '#4a4258');
  const mouthT = bodyT - topD;
  if (tilt > 0) {
    const d = topD * tilt;
    const lidT = bodyT - d - lidH;
    ctx.fillStyle = '#5c452c';
    ctx.fillRect(cx - bw, lidT, bw * 2, d);
    ctx.fillStyle = '#3a2c14';
    ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
    ctx.fillStyle = '#4a3826';
    ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
    // Iron frame: far edge, near cap, and a center spine.
    ctx.fillStyle = '#565062';
    ctx.fillRect(cx - bw, lidT, bw * 2, s * 0.032);
    ctx.fillRect(cx - bw, lidT + d - s * 0.012, bw * 2, s * 0.045);
    ctx.fillStyle = '#8a8494';
    ctx.fillRect(cx - bw, lidT + d - s * 0.012, bw * 2, s * 0.018);
    ctx.fillStyle = '#565062';
    ctx.fillRect(cx - s * 0.045, lidT, s * 0.09, d + lidH);
    ctx.fillStyle = '#8a8494';
    ctx.fillRect(cx - s * 0.045, lidT, s * 0.028, d + lidH);
    // The padlock: brass fist under the seam, closed pose only.
    if (o < 0.3) {
      const ly = lidT + d + lidH - s * 0.02;
      ctx.fillStyle = '#8a8494';
      ctx.fillRect(cx - s * 0.052, ly, s * 0.032, s * 0.07);
      ctx.fillRect(cx + s * 0.02, ly, s * 0.032, s * 0.07);
      ctx.fillRect(cx - s * 0.052, ly, s * 0.104, s * 0.026);
      ctx.fillStyle = '#8a6a1e';
      ctx.fillRect(cx - s * 0.085, ly + s * 0.055, s * 0.17, s * 0.15);
      ctx.fillStyle = '#c9a23e';
      ctx.fillRect(cx - s * 0.085, ly + s * 0.055, s * 0.17, s * 0.105);
      ctx.fillStyle = '#e8c86a';
      ctx.fillRect(cx - s * 0.085, ly + s * 0.055, s * 0.17, s * 0.032);
      ctx.fillStyle = '#26222e';
      ctx.fillRect(cx - s * 0.022, ly + s * 0.095, s * 0.044, s * 0.044);
      ctx.fillRect(cx - s * 0.011, ly + s * 0.13, s * 0.022, s * 0.045);
    }
  } else {
    // Open: the bare staple where the lock used to hang.
    ctx.fillStyle = '#8a8494';
    ctx.fillRect(cx - s * 0.02, mouthT + topD + s * 0.02, s * 0.04, s * 0.06);
  }
  if (stand > 0) {
    chestStandingLid(rend, ctx, cx, mouthT, bw, s * 0.31 * stand, s, '#4a3826', '#4a4258', '#8a8494');
  }
}

/**
 * GILDED — the coffer. A stepped gold crown over a lacquer inlay:
 * treasure-house work, all big faces and one set stone. The value
 * ladder does the shining; the sparkles only visit.
 */
export function drawChestGilded(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  o: number,
  t: number,
  h: number,
): void {
  const bw = 0.42 * s;
  const bodyH = 0.3 * s;
  const lidH = 0.11 * s;
  const topD = 0.2 * s;
  const step = 0.07 * s;
  const bodyT = baseY - bodyH;
  const { tilt, stand } = chestPose(o);
  // Gold plinth.
  ctx.fillStyle = '#7e5a14';
  ctx.fillRect(cx - bw - s * 0.015, baseY - s * 0.02, bw * 2 + s * 0.03, s * 0.055);
  ctx.fillStyle = '#a8792a';
  ctx.fillRect(cx - bw - s * 0.015, baseY - s * 0.02, bw * 2 + s * 0.03, s * 0.022);
  // Gold body with bright edge columns.
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
  ctx.fillStyle = '#f2cf6e';
  ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.05);
  ctx.fillStyle = '#a8792a';
  ctx.fillRect(cx - bw, baseY - s * 0.07, bw * 2, s * 0.05);
  ctx.fillStyle = '#f2cf6e';
  ctx.fillRect(cx - bw, bodyT, s * 0.05, bodyH);
  ctx.fillRect(cx + bw - s * 0.05, bodyT, s * 0.05, bodyH);
  // One centered lacquer inlay, framed deep, pinned at the corners.
  const pw = 0.5 * s;
  const ph = bodyH * 0.62;
  const py0 = bodyT + bodyH * 0.19;
  ctx.fillStyle = '#4c1620';
  ctx.fillRect(cx - pw / 2, py0, pw, ph);
  ctx.fillStyle = '#6e2434';
  ctx.fillRect(cx - pw / 2 + s * 0.016, py0 + s * 0.016, pw - s * 0.032, ph - s * 0.032);
  ctx.fillStyle = '#8a2f42';
  ctx.fillRect(cx - pw / 2 + s * 0.016, py0 + s * 0.016, pw - s * 0.032, s * 0.035);
  ctx.fillStyle = '#ffedb0';
  for (const [sx, sy] of [
    [-pw / 2 + s * 0.01, py0 + s * 0.01],
    [pw / 2 - s * 0.038, py0 + s * 0.01],
    [-pw / 2 + s * 0.01, py0 + ph - s * 0.038],
    [pw / 2 - s * 0.038, py0 + ph - s * 0.038],
  ] as const) {
    ctx.fillRect(cx + sx, sy, s * 0.028, s * 0.028);
  }
  if (o > 0.1) chestMouth(rend, ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#a8792a', '#8a2f42');
  const mouthT = bodyT - topD;
  if (tilt > 0) {
    const d = topD * tilt;
    const lidT = bodyT - d - lidH;
    // Lower tier.
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(cx - bw, lidT, bw * 2, d);
    ctx.fillStyle = '#a8792a';
    ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.045));
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
    ctx.fillStyle = '#ffedb0';
    ctx.fillRect(cx - bw, lidT + d - s * 0.022, bw * 2, s * 0.022);
    ctx.fillStyle = '#a8792a';
    ctx.fillRect(cx - bw, lidT + d + lidH - s * 0.03, bw * 2, s * 0.03);
    // The stepped crown: an inset upper tier that rises with the lid.
    const iw = bw - 0.14 * s;
    const st = step * tilt;
    ctx.fillStyle = '#f2cf6e';
    ctx.fillRect(cx - iw, lidT - st, iw * 2, Math.max(d * 0.82, s * 0.02) + st);
    ctx.fillStyle = '#c9962e';
    ctx.fillRect(cx - iw, lidT - st, iw * 2, s * 0.03);
    ctx.fillStyle = '#ffedb0';
    ctx.fillRect(cx - iw, lidT - st + d * 0.82 + st - s * 0.024, iw * 2, s * 0.024);
    // The set stone: a square teal cabochon on the crown.
    const gy = lidT - st + (d * 0.82 + st) * 0.42;
    ctx.fillStyle = '#3f7a68';
    ctx.fillRect(cx - s * 0.052, gy - s * 0.012, s * 0.104, s * 0.1);
    ctx.fillStyle = '#7fc9b3';
    ctx.fillRect(cx - s * 0.04, gy, s * 0.08, s * 0.076);
    ctx.fillStyle = '#c8ede2';
    ctx.fillRect(cx - s * 0.04, gy, s * 0.038, s * 0.03);
    // Gold latch square at the seam.
    ctx.fillStyle = '#ffedb0';
    ctx.fillRect(cx - s * 0.04, lidT + d + lidH - s * 0.028, s * 0.08, s * 0.06);
    ctx.fillStyle = '#a8792a';
    ctx.fillRect(cx - s * 0.04, lidT + d + lidH + s * 0.005, s * 0.08, s * 0.027);
  }
  if (stand > 0) {
    const topY = chestStandingLid(rend, ctx, cx, mouthT, bw, s * 0.28 * stand, s, '#d9a441', '#8a2f42', '#f2cf6e');
    // The crown step shows as a raised notch on the standing lid.
    if (stand > 0.5) {
      ctx.fillStyle = '#f2cf6e';
      ctx.fillRect(cx - (bw - 0.14 * s), topY - s * 0.05, (bw - 0.14 * s) * 2, s * 0.055);
      ctx.fillStyle = '#c9962e';
      ctx.fillRect(cx - (bw - 0.14 * s), topY - s * 0.05, (bw - 0.14 * s) * 2, s * 0.02);
    }
  }
  // Star glints walk the goldwork on the twinkle clock.
  const tw = twinkle(t, h, 3.4);
  if (tw > 0) sparkle(rend, cx - bw * 0.72, bodyT - topD * 0.5, s * 0.05, 0.6 * tw, '#ffedb0');
  const tw2 = twinkle(t, h ^ 0x9e37, 4.7);
  if (tw2 > 0) sparkle(rend, cx + bw * 0.6, bodyT + bodyH * 0.32, s * 0.04, 0.5 * tw2, '#fff6d8');
}

/**
 * BOSS — the black cache. A pedestal-set black mass in angular
 * iron, fronted by a bone skull whose sockets smoulder while the
 * hoard is still inside. Legendary is a silhouette, not a shimmer.
 */
export function drawChestBoss(rend: PaintHost, 
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  o: number,
  t: number,
  h: number,
): void {
  const bw = 0.46 * s;
  const bodyH = 0.37 * s;
  const lidH = 0.15 * s;
  const topD = 0.21 * s;
  const bodyT = baseY - bodyH;
  const { tilt, stand } = chestPose(o);
  // The pedestal: a shade wider than the box — this thing was PLACED.
  ctx.fillStyle = '#17131f';
  ctx.fillRect(cx - bw - s * 0.018, baseY - s * 0.02, bw * 2 + s * 0.036, s * 0.065);
  ctx.fillStyle = '#2b2635';
  ctx.fillRect(cx - bw - s * 0.018, baseY - s * 0.02, bw * 2 + s * 0.036, s * 0.026);
  // Black mass.
  ctx.fillStyle = '#332e3d';
  ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
  ctx.fillStyle = '#453f52';
  ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.055);
  ctx.fillStyle = '#1f1b29';
  ctx.fillRect(cx - bw, baseY - s * 0.085, bw * 2, s * 0.065);
  // Angular iron corner plates, cut at 45 on the inner corner.
  for (const sgn of [-1, 1] as const) {
    const x0 = sgn < 0 ? cx - bw : cx + bw;
    ctx.fillStyle = '#4a4553';
    ctx.beginPath();
    ctx.moveTo(x0, bodyT);
    ctx.lineTo(x0 + sgn * s * 0.13, bodyT);
    ctx.lineTo(x0 + sgn * s * 0.13, bodyT + s * 0.06);
    ctx.lineTo(x0 + sgn * s * 0.06, bodyT + s * 0.13);
    ctx.lineTo(x0, bodyT + s * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6e6879';
    ctx.fillRect(x0 + (sgn < 0 ? 0 : -s * 0.13), bodyT, s * 0.13, s * 0.024);
    ctx.fillStyle = '#211d2b';
    ctx.fillRect(x0 + (sgn < 0 ? s * 0.035 : -s * 0.065), bodyT + s * 0.035, s * 0.03, s * 0.03);
  }
  // THE SKULL: square bone, black sockets, a jaw with missing teeth.
  const sw = 0.26 * s;
  const sy0 = bodyT + bodyH * 0.1;
  const sh = 0.22 * s;
  ctx.fillStyle = '#9a8f78';
  ctx.fillRect(cx - sw / 2 + s * 0.012, sy0 + s * 0.012, sw, sh);
  ctx.fillStyle = '#c9bda3';
  ctx.beginPath();
  ctx.moveTo(cx - sw / 2, sy0 + s * 0.035);
  ctx.lineTo(cx - sw / 2 + s * 0.035, sy0);
  ctx.lineTo(cx + sw / 2 - s * 0.035, sy0);
  ctx.lineTo(cx + sw / 2, sy0 + s * 0.035);
  ctx.lineTo(cx + sw / 2, sy0 + sh * 0.66);
  ctx.lineTo(cx + sw / 2 - s * 0.03, sy0 + sh);
  ctx.lineTo(cx - sw / 2 + s * 0.03, sy0 + sh);
  ctx.lineTo(cx - sw / 2, sy0 + sh * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0d6c2';
  ctx.fillRect(cx - sw / 2 + s * 0.02, sy0 + s * 0.012, sw - s * 0.04, sh * 0.3);
  // Sockets — and the ember behind them while the cache is shut.
  ctx.fillStyle = '#17101f';
  ctx.fillRect(cx - s * 0.085, sy0 + sh * 0.3, s * 0.06, s * 0.055);
  ctx.fillRect(cx + s * 0.025, sy0 + sh * 0.3, s * 0.06, s * 0.055);
  if (o < 0.2) {
    const pulse = 0.55 + Math.sin(t * 2.4 + h) * 0.45;
    ctx.fillStyle = `rgba(255, 130, 60, ${0.5 + 0.4 * pulse})`;
    ctx.fillRect(cx - s * 0.075, sy0 + sh * 0.3 + s * 0.014, s * 0.026, s * 0.026);
    ctx.fillRect(cx + s * 0.048, sy0 + sh * 0.3 + s * 0.014, s * 0.026, s * 0.026);
  }
  // Nasal notch + jaw gaps.
  ctx.fillStyle = '#17101f';
  ctx.fillRect(cx - s * 0.014, sy0 + sh * 0.52, s * 0.028, s * 0.035);
  ctx.fillRect(cx - s * 0.055, sy0 + sh * 0.8, s * 0.024, sh * 0.2);
  ctx.fillRect(cx + s * 0.014, sy0 + sh * 0.8, s * 0.024, sh * 0.2);
  if (o > 0.1) chestMouth(rend, ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#1f1b29', '#241a2e');
  const mouthT = bodyT - topD;
  if (tilt > 0) {
    const d = topD * tilt;
    const lidT = bodyT - d - lidH;
    ctx.fillStyle = '#3d3749';
    ctx.fillRect(cx - bw, lidT, bw * 2, d);
    ctx.fillStyle = '#211d2b';
    ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
    ctx.fillStyle = '#332e3d';
    ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
    // Iron edging + twin spines: the lid is armored, not decorated.
    ctx.fillStyle = '#4a4553';
    ctx.fillRect(cx - bw, lidT + d - s * 0.014, bw * 2, s * 0.05);
    ctx.fillStyle = '#6e6879';
    ctx.fillRect(cx - bw, lidT + d - s * 0.014, bw * 2, s * 0.02);
    for (const bx of [-0.26, 0.26] as const) {
      ctx.fillStyle = '#4a4553';
      ctx.fillRect(cx + bx * s - s * 0.042, lidT, s * 0.084, d + lidH);
      ctx.fillStyle = '#6e6879';
      ctx.fillRect(cx + bx * s - s * 0.042, lidT, s * 0.026, d + lidH);
    }
    // The ember seam: the hoard's light escaping under the lid.
    if (o < 0.2) {
      const pulse = 0.6 + Math.sin(t * 2.4 + h) * 0.4;
      ctx.fillStyle = `rgba(255, 130, 60, ${0.35 * pulse})`;
      ctx.fillRect(cx - bw + s * 0.05, lidT + d + lidH - s * 0.012, bw * 2 - s * 0.1, s * 0.022);
    }
  }
  if (stand > 0) {
    chestStandingLid(rend, ctx, cx, mouthT, bw, s * 0.34 * stand, s, '#332e3d', '#241a2e', '#6e6879');
  }
}

/** Everything a chest painter needs for one frame. */
export function chestPose(o: number): { tilt: number; stand: number } {
  // tilt: 1 = lid seated, 0 = lid vertical. stand: standing-slab
  // height factor (overshoot >1 gives the fling its bounce).
  return {
    tilt: Math.max(0, 1 - o * 2),
    stand: o <= 0.5 ? 0 : (o - 0.5) * 2,
  };
}
