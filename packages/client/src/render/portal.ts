/**
 * The Riftgate — the dungeon portal, rebuilt as a landmark.
 *
 * Three layers, three owners:
 *  - drawPortalGround: the BLIGHT — a corrupted apron the gate has
 *    burned into the land (stain, dead-earth chips, pulsing veins), a
 *    paved plinth of glyph-carved slabs, and the void pool at the
 *    mouth. Lives in the breeze layer (terrain.drawLiveGround), under
 *    every y-sorted body.
 *  - drawPortalArch: the STRUCTURE — a monumental weathered stone
 *    archway (~2 tiles tall, the character reads waist-high to its
 *    spring line) whose opening holds the vortex membrane. Y-sorted at
 *    the tile's south edge, so stepping onto the tile reads as
 *    stepping THROUGH the veil.
 *  - spawnPortalFx: the AIR — blocky suction motes spiraling into the
 *    mouth, blight embers, and the odd escaping streak. Runs on the
 *    shared pooled particle engine; rates are dt-gated so the bill is
 *    a handful of quads however fast the frames come.
 *
 * Style laws honored here: hard-edged square masses only (no chamfer,
 * no blur), lift-only stone shading, foreshortened top planes on the
 * capitals and keystone (2.5D top-plane law), axis-aligned pier faces
 * (PERSP_LEAN=0 law), and every animated phase is hash-desynced per
 * portal so two gates never pulse in lockstep.
 */

import { hashCoords } from '@devcraft/shared';
import { shade } from './rig.js';
import type { Particles } from './particles.js';

/** Ground-plane squash: circles lying flat draw as 0.6 ellipses. */
const FLAT = 0.6;

interface PortalTones {
  /** The throat of the tunnel — near-black violet. */
  void: string;
  deep: string;
  mid: string;
  arm: string;
  bright: string;
  hot: string;
  core: string;
  glyph: string;
}

const DOWN_TONES: PortalTones = {
  void: '#120a20',
  deep: '#251549',
  mid: '#3b2570',
  arm: '#6b45b8',
  bright: '#9d76e8',
  hot: '#c9aeff',
  core: '#f1e9ff',
  glyph: '#a985ff',
};

/** The way OUT wears lavender-white — dawn against the down-gate's dusk. */
const UP_TONES: PortalTones = {
  void: '#241d3e',
  deep: '#3a2f63',
  mid: '#544586',
  arm: '#8672c2',
  bright: '#b3a2e3',
  hot: '#dcd2f8',
  core: '#ffffff',
  glyph: '#cabdf5',
};

export function portalTones(up: boolean): PortalTones {
  return up ? UP_TONES : DOWN_TONES;
}

/** Weathered granite, cooled by the rift's ambient violet — kept a
 * clear step lighter than the vortex void so the masonry separates
 * from the mouth at any light. */
const STONE = '#6a6380';
const STONE_DARK = '#494259';

/** Particle ramp for bursts (the enter-implosion pulls from this). */
export const PORTAL_BURST_COLORS = ['#6b45b8', '#9d76e8', '#c9aeff', '#f1e9ff'];

// ---------------------------------------------------------------------------
// Shared geometry — one vocabulary between ground, arch, and particles.
// All fractions are multiples of the tile scale `s`.
// ---------------------------------------------------------------------------

/** Outer span overhang past the tile edge, each side. */
const SPAN_PAD = 0.16;
/** Pier width. */
const PIER_W = 0.26;
/** The arch plane's ground line, in tile fractions from the north edge. */
export const PORTAL_PLANE = 0.74;
/** Pier height to the spring line, in tiles. */
const SPRING_H = 1.3;
/** Voussoir band thickness, in tiles. */
const VOUSSOIR = 0.2;

// ---------------------------------------------------------------------------
// The blight — ground layer.
// ---------------------------------------------------------------------------

/**
 * The land remembers the gate: a violet stain soaking outward, dead
 * earth broken into blocky chips, and veins of riftlight crawling from
 * under the plinth — each pulsing on its own clock, tips glowing like
 * coals. Drawn every frame (portals are rare; this is a few dozen
 * fills), so the veins get to breathe.
 */
export function drawPortalGround(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  up: boolean,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
): void {
  const tones = portalTones(up);
  const h = hashCoords(211, tx, ty);
  const phase = ((h % 97) / 97) * Math.PI * 2;
  const c = worldToScreen(tx + 0.5, ty + 0.5);

  // --- the stain: three soaked ellipses, faint to the rim. Painted
  // OVER the meadow's blades (see renderer ordering), so it visibly
  // smothers the green — the land dying around the gate.
  ctx.fillStyle = '#170e2a';
  for (const [r, a] of [
    [2.5, 0.13],
    [1.7, 0.17],
    [1.05, 0.26],
  ] as const) {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r * s, r * s * FLAT, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- dead-earth chips: the turf broken into blocky scabs, densest
  // near the plinth, scattered on a deterministic ring hash.
  const chipTones = ['#4a4056', '#3a3348', '#57506b'];
  for (let i = 0; i < 26; i++) {
    const hc = hashCoords(223 + i, tx, ty);
    const ang = (i / 26) * Math.PI * 2 + ((hc % 41) / 41) * 0.5;
    const rad = (0.8 + ((hc >>> 5) % 53) / 53 * 1.5) * s;
    const size = (0.045 + ((hc >>> 9) % 29) / 29 * 0.06) * s;
    const x = c.x + Math.cos(ang) * rad;
    const y = c.y + Math.sin(ang) * rad * FLAT;
    ctx.globalAlpha = 0.55 * (1 - (rad / s - 0.8) / 1.7);
    ctx.fillStyle = chipTones[hc % 3]!;
    ctx.fillRect(x - size / 2, y - size / 2, size, size * 0.7);
  }
  ctx.globalAlpha = 1;

  // --- riftlight veins: trails of blocky crack-chips crawling
  // outward from the plinth, tapering as they go — crumbling ground,
  // not wires (a stroked polyline read as cable; square masses only).
  // Every other chip carries a pulsing riftlight inlay; the tip chip
  // burns brightest on the vein's own beat.
  for (let v = 0; v < 6; v++) {
    const hv = hashCoords(241 + v * 7, tx, ty);
    const ang = (v / 6) * Math.PI * 2 + ((hv % 37) / 37) * 0.7;
    const reach = 1.2 + ((hv >>> 6) % 43) / 43 * 0.9;
    const pulse = 0.35 + 0.5 * Math.max(0, Math.sin(t * 1.7 + phase + v * 1.9));
    const chips = 6;
    for (let i = 0; i < chips; i++) {
      const f = i / (chips - 1);
      const rad = (0.75 + (reach - 0.75) * f) * s;
      const jag = (((hv >>> (i * 3)) % 13) / 13 - 0.5) * 0.28 * s * Math.min(1, f * 2);
      const x = c.x + Math.cos(ang) * rad + Math.cos(ang + Math.PI / 2) * jag;
      const y = c.y + (Math.sin(ang) * rad + Math.sin(ang + Math.PI / 2) * jag) * FLAT;
      const size = (0.11 - f * 0.05) * s;
      // The dark scab.
      ctx.globalAlpha = 0.8 - f * 0.25;
      ctx.fillStyle = '#1c1030';
      ctx.fillRect(x - size / 2, y - size * 0.35, size, size * 0.7);
      // Riftlight inlay on alternating chips; the tip always burns.
      if (i % 2 === 0 || i === chips - 1) {
        const g = size * (i === chips - 1 ? 0.6 : 0.42);
        ctx.globalAlpha = (i === chips - 1 ? 0.5 + pulse * 0.5 : pulse) * (1 - f * 0.2);
        ctx.fillStyle = i === chips - 1 ? tones.bright : tones.arm;
        ctx.fillRect(x - g / 2, y - g * 0.35, g, g * 0.7);
      }
    }
  }
  ctx.globalAlpha = 1;

  // --- the plinth: a paved platform of six great slabs, north lips
  // lit (the 2.5D read), grout gaps dark, one slab cracked corner to
  // corner, two carrying glowing carved glyphs.
  const pw = 1.7 * s;
  const ph = 1.15 * s * FLAT;
  const px0 = c.x - pw / 2;
  const py0 = c.y - ph / 2;
  // South edge shadow grounds the mass.
  ctx.fillStyle = 'rgba(14, 9, 24, 0.5)';
  ctx.fillRect(px0 - s * 0.03, py0 + ph, pw + s * 0.06, s * 0.07);
  // One coherent platform: the dark bed reads as a single laid mass
  // (the grounding-outline law), not a scatter of loose stones.
  ctx.strokeStyle = '#241a2e';
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.strokeRect(px0, py0, pw, ph);
  ctx.fillStyle = '#241d33';
  ctx.fillRect(px0, py0, pw, ph);
  const cols = 3;
  const rows = 2;
  const gap = s * 0.022;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const hcell = hashCoords(263, tx * 3 + col, ty * 2 + r);
      const sx = px0 + (col * pw) / cols + gap;
      const sy = py0 + (r * ph) / rows + gap;
      const sw = pw / cols - gap * 2;
      const sh = ph / rows - gap * 2;
      ctx.fillStyle = shade('#4c4659', ((hcell % 5) - 2) * 3);
      ctx.fillRect(sx, sy, sw, sh);
      // Lit north lip: the slab's foreshortened top arris.
      ctx.fillStyle = 'rgba(214, 202, 255, 0.14)';
      ctx.fillRect(sx, sy, sw, s * 0.035);
      if (hcell % 7 === 0) {
        // One cracked slab: a thin dark shear.
        ctx.strokeStyle = '#241d33';
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(sx + sw * 0.15, sy + sh * 0.85);
        ctx.lineTo(sx + sw * 0.55, sy + sh * 0.4);
        ctx.lineTo(sx + sw * 0.9, sy + sh * 0.25);
        ctx.stroke();
      }
    }
  }
  // Glyph slabs: angular carved marks waking with the veins.
  const glyphPulse = 0.35 + 0.4 * Math.max(0, Math.sin(t * 1.3 + phase));
  ctx.strokeStyle = tones.glyph;
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.globalAlpha = glyphPulse;
  for (const [gx, gy] of [
    [px0 + pw * 0.18, py0 + ph * 0.3],
    [px0 + pw * 0.78, py0 + ph * 0.72],
  ] as const) {
    const g = s * 0.09;
    ctx.beginPath();
    ctx.moveTo(gx - g, gy + g * FLAT);
    ctx.lineTo(gx, gy - g * FLAT);
    ctx.lineTo(gx + g, gy + g * FLAT);
    ctx.moveTo(gx - g * 0.5, gy + g * 0.15 * FLAT);
    ctx.lineTo(gx + g * 0.5, gy + g * 0.15 * FLAT);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // --- the void pool: the mouth's spill on the stone, a dark eye
  // with slow-orbiting glimmer arcs.
  const poolY = c.y + 0.08 * s * FLAT;
  ctx.fillStyle = '#0e0819';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(c.x, poolY, s * 0.36, s * 0.36 * FLAT, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
  for (let k = 0; k < 2; k++) {
    const a0 = t * (k === 0 ? 0.9 : -0.6) + phase + k * 2.4;
    ctx.strokeStyle = k === 0 ? tones.mid : tones.arm;
    ctx.lineWidth = Math.max(1, s * 0.028);
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(c.x, poolY, s * (0.27 - k * 0.09), s * (0.27 - k * 0.09) * FLAT, 0, a0, a0 + 2.0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// The archway + vortex — the y-sorted structure.
// ---------------------------------------------------------------------------

export interface PortalArchArgs {
  /** Screen position of the tile's NW corner (elevation applied). */
  px: number;
  py: number;
  s: number;
  /** s * camera.yScale — one tile of ground-plane depth in px. */
  syT: number;
  up: boolean;
  t: number;
  tx: number;
  ty: number;
  /** Arms the struct-outline stroke state; null = outlines off. */
  outline: (() => void) | null;
}

/** The opening's screen rect + arch, shared by painter and outline. */
function openingPath(
  oxL: number,
  oxR: number,
  yB: number,
  springY: number,
): Path2D {
  const r = (oxR - oxL) / 2;
  const cx = (oxL + oxR) / 2;
  const p = new Path2D();
  p.moveTo(oxL, yB);
  p.lineTo(oxL, springY);
  p.arc(cx, springY, r, Math.PI, 0);
  p.lineTo(oxR, yB);
  p.closePath();
  return p;
}

export function drawPortalArch(ctx: CanvasRenderingContext2D, a: PortalArchArgs): void {
  const { px, py, s, syT, up, t, tx, ty } = a;
  const tones = portalTones(up);
  const h = hashCoords(307, tx, ty);
  const phase = ((h % 89) / 89) * Math.PI * 2;

  const X0 = px - SPAN_PAD * s;
  const X1 = px + (1 + SPAN_PAD) * s;
  const pw = PIER_W * s;
  const yB = py + PORTAL_PLANE * syT + 0.12 * syT;
  const oxL = X0 + pw;
  const oxR = X1 - pw;
  const R = (oxR - oxL) / 2;
  const cxm = (oxL + oxR) / 2;
  const springY = yB - SPRING_H * s;
  const vb = VOUSSOIR * s;

  // ---- 1. The vortex membrane, clipped to the opening. Painted
  // first so the stonework overlaps its edges cleanly.
  const mouth = openingPath(oxL, oxR, yB, springY);
  ctx.save();
  ctx.clip(mouth);
  drawVortex(ctx, cxm, yB, R, springY, s, t, phase, tones);
  ctx.restore();

  // Membrane rim: riftlight licking the stone where the veil meets it.
  ctx.strokeStyle = tones.hot;
  ctx.lineWidth = Math.max(1.5, s * 0.03);
  ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 2.6 + phase);
  ctx.stroke(mouth);
  ctx.globalAlpha = 1;

  // ---- 2. The piers.
  drawPier(ctx, X0, yB, pw, springY, s, t, phase, tones, true, h);
  drawPier(ctx, X1 - pw, yB, pw, springY, s, t, phase + 2.1, tones, false, h >>> 7);

  // ---- 3. The voussoir band: laid stone following the curve.
  ctx.fillStyle = STONE;
  ctx.beginPath();
  ctx.arc(cxm, springY, R + vb, Math.PI, 0);
  ctx.lineTo(oxR, springY);
  ctx.arc(cxm, springY, R, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // Sunlit upper arc — light falls on the ring's north-west shoulder.
  ctx.strokeStyle = shade(STONE, 14);
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.beginPath();
  ctx.arc(cxm, springY, R + vb - s * 0.03, Math.PI * 1.15, Math.PI * 1.75);
  ctx.stroke();
  // Voussoir joints: radial seams between blocks.
  ctx.strokeStyle = 'rgba(20, 14, 28, 0.4)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  for (let i = 1; i < 9; i++) {
    const ang = Math.PI + (i / 9) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cxm + Math.cos(ang) * R, springY + Math.sin(ang) * R);
    ctx.lineTo(cxm + Math.cos(ang) * (R + vb), springY + Math.sin(ang) * (R + vb));
    ctx.stroke();
  }

  // ---- 4. The keystone: a proud block riding the crown, wearing its
  // foreshortened top plane and the gate's waking gem.
  const kw = s * 0.3;
  const kTop = springY - R - vb - s * 0.06;
  const kh = vb + s * 0.12;
  ctx.fillStyle = shade(STONE, 6);
  ctx.fillRect(cxm - kw / 2, kTop, kw, kh);
  // Top plane: lit lid, shaded far edge, bright near arris.
  const lid = syT * 0.16;
  ctx.fillStyle = shade(STONE, 20);
  ctx.fillRect(cxm - kw / 2, kTop - lid, kw, lid);
  ctx.fillStyle = shade(STONE, -8);
  ctx.fillRect(cxm - kw / 2, kTop - lid, kw, s * 0.025);
  ctx.fillStyle = shade(STONE, 30);
  ctx.fillRect(cxm - kw / 2, kTop, kw, s * 0.025);
  // The gem: a diamond that breathes with the vortex.
  const gemPulse = 0.55 + 0.45 * Math.sin(t * 2.2 + phase);
  const gs = s * 0.075;
  ctx.save();
  ctx.translate(cxm, kTop + kh * 0.5);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = tones.bright;
  ctx.globalAlpha = 0.5 + 0.5 * gemPulse;
  ctx.fillRect(-gs, -gs, gs * 2, gs * 2);
  ctx.fillStyle = tones.core;
  ctx.globalAlpha = gemPulse;
  ctx.fillRect(-gs * 0.45, -gs * 0.45, gs * 0.9, gs * 0.9);
  ctx.restore();
  ctx.globalAlpha = 1;

  // ---- 5. Weathering: blocky bites out of the silhouette. The void
  // color eats into the stone so the notch reads as a real chip.
  ctx.fillStyle = 'rgba(20, 15, 32, 0.55)';
  if (h % 3 !== 0) ctx.fillRect(X0 - s * 0.012, yB - s * (0.55 + ((h >>> 3) % 5) * 0.08), s * 0.05, s * 0.09);
  if ((h >>> 4) % 3 !== 0) ctx.fillRect(X1 - s * 0.038, yB - s * (0.85 + ((h >>> 6) % 5) * 0.07), s * 0.05, s * 0.08);
  const bAng = Math.PI * (1.2 + ((h >>> 8) % 7) * 0.08);
  ctx.fillRect(
    cxm + Math.cos(bAng) * (R + vb) - s * 0.03,
    springY + Math.sin(bAng) * (R + vb) - s * 0.02,
    s * 0.06,
    s * 0.05,
  );

  // ---- 6. Silhouette outline: the landmark wears the world's edge.
  if (a.outline) {
    const path = new Path2D();
    // Up the west pier, over the crown, down the east pier.
    path.moveTo(X0, yB);
    path.lineTo(X0, springY);
    path.arc(cxm, springY, cxm - X0, Math.PI, 0);
    path.lineTo(X1, yB);
    // Keystone bump.
    path.moveTo(cxm - kw / 2, kTop - lid);
    path.lineTo(cxm + kw / 2, kTop - lid);
    // The mouth itself.
    path.addPath(openingPath(oxL, oxR, yB, springY));
    a.outline();
    ctx.stroke(path);
  }
}

/**
 * One pier: stepped plinth foot, coursed shaft with a lit arris, a
 * carved glyph panel waking with the gate, and a capital block whose
 * foreshortened lid obeys the top-plane law.
 */
function drawPier(
  ctx: CanvasRenderingContext2D,
  x0: number,
  yB: number,
  pw: number,
  springY: number,
  s: number,
  t: number,
  phase: number,
  tones: PortalTones,
  west: boolean,
  h: number,
): void {
  const shaftH = yB - springY;
  // Foot plinth: a wider block rooting the pier.
  ctx.fillStyle = shade(STONE, -12);
  ctx.fillRect(x0 - s * 0.045, yB - s * 0.2, pw + s * 0.09, s * 0.2);
  ctx.fillStyle = shade(STONE, 2);
  ctx.fillRect(x0 - s * 0.045, yB - s * 0.2, pw + s * 0.09, s * 0.035);
  // Shaft.
  ctx.fillStyle = STONE;
  ctx.fillRect(x0, springY, pw, shaftH - s * 0.2);
  // Stone courses: three seams, block joints staggered.
  ctx.fillStyle = 'rgba(20, 14, 28, 0.35)';
  for (let i = 1; i <= 3; i++) {
    const cy = springY + (shaftH - s * 0.2) * (i / 4);
    ctx.fillRect(x0, cy, pw, Math.max(1, s * 0.018));
    ctx.fillRect(x0 + (i % 2 === 0 ? pw * 0.3 : pw * 0.62), cy - (shaftH - s * 0.2) / 4, Math.max(1, s * 0.018), (shaftH - s * 0.2) / 4);
  }
  // Sunlit west arris.
  ctx.fillStyle = shade(STONE, 14);
  ctx.fillRect(x0 + s * 0.015, springY + s * 0.1, s * 0.035, shaftH * 0.6);
  // Glyph panel: an angular carved mark, riftlight seeping through.
  const gp = 0.3 + 0.45 * Math.max(0, Math.sin(t * 1.5 + phase));
  const gx = x0 + pw / 2;
  const gy = yB - shaftH * 0.45;
  const g = s * 0.06;
  ctx.strokeStyle = tones.glyph;
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.globalAlpha = gp;
  ctx.beginPath();
  if (west) {
    ctx.moveTo(gx - g, gy - g * 1.4);
    ctx.lineTo(gx + g, gy - g * 0.4);
    ctx.lineTo(gx - g, gy + g * 0.6);
    ctx.moveTo(gx - g, gy + g * 1.4);
    ctx.lineTo(gx + g, gy + g * 1.4);
  } else {
    ctx.moveTo(gx - g, gy - g * 1.4);
    ctx.lineTo(gx - g, gy + g * 1.2);
    ctx.lineTo(gx + g, gy + g * 0.2);
    ctx.moveTo(gx + g, gy - g * 1.2);
    ctx.lineTo(gx + g, gy - g * 0.2);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Capital: a wider block at the spring, lid foreshortened.
  const capH = s * 0.13;
  const cx0 = x0 - s * 0.03;
  const cw = pw + s * 0.06;
  ctx.fillStyle = shade(STONE, 8);
  ctx.fillRect(cx0, springY - capH, cw, capH);
  const lid = s * 0.09;
  ctx.fillStyle = shade(STONE, 20);
  ctx.fillRect(cx0, springY - capH - lid, cw, lid);
  ctx.fillStyle = shade(STONE, -8);
  ctx.fillRect(cx0, springY - capH - lid, cw, s * 0.02);
  ctx.fillStyle = shade(STONE, 30);
  ctx.fillRect(cx0, springY - capH, cw, s * 0.02);
  // A weathered chip off the capital corner, hash-placed.
  if (h % 2 === 0) {
    ctx.fillStyle = 'rgba(20, 15, 32, 0.5)';
    ctx.fillRect(west ? cx0 : cx0 + cw - s * 0.045, springY - capH - lid, s * 0.045, s * 0.04);
  }
}

/**
 * The vortex: a tunnel of nested dark disks falling away from the
 * viewer, three spiral arms of blocky chips winding INTO the throat,
 * a starfield drifting in the arch's upper dark, surge rings breathing
 * out of the core, and the singularity itself — a pulsing diamond.
 * Everything is a hard-edged quad or a flat disk; the premium read
 * comes from layered motion at three speeds, not from gradients.
 */
function drawVortex(
  ctx: CanvasRenderingContext2D,
  cxm: number,
  yB: number,
  R: number,
  springY: number,
  s: number,
  t: number,
  phase: number,
  tones: PortalTones,
): void {
  // The veil: near-opaque void — a body stepping through ghosts
  // faintly behind it, which is exactly the "swallowed" read we want.
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = tones.void;
  ctx.fillRect(cxm - R, springY - R - s, R * 2, yB - springY + R + s);
  ctx.globalAlpha = 1;

  // Echo ripples: elliptical bands climbing the veil above the
  // throat — the vortex's wake filling the mouth's upper dark so the
  // whole opening reads charged, not just the orb.
  for (let k = 0; k < 3; k++) {
    const f = ((t * 0.35 + k / 3) % 1);
    const ry = yB - 0.72 * s - (R * 0.7 + (springY - R * 0.55 - (yB - 0.72 * s - R * 0.7)) * f);
    ctx.strokeStyle = k % 2 === 0 ? tones.mid : tones.deep;
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.globalAlpha = Math.sin(f * Math.PI) * 0.5;
    ctx.beginPath();
    ctx.ellipse(cxm, ry, R * (0.82 - f * 0.25), R * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Starfield in the upper dark: slow motes rising toward the crown.
  for (let i = 0; i < 8; i++) {
    const hs = hashCoords(331 + i, Math.round(cxm), Math.round(yB));
    const sx = cxm - R + ((hs % 61) / 61) * R * 2;
    const cycle = 2.6 + ((hs >>> 5) % 17) / 17 * 2;
    const f = ((t / cycle + (hs % 43) / 43) % 1);
    const sy = yB - (yB - springY + R * 0.8) * f;
    const sz = (0.022 + ((hs >>> 8) % 11) / 11 * 0.018) * s;
    ctx.globalAlpha = Math.sin(f * Math.PI) * 0.9;
    ctx.fillStyle = (hs & 1) === 0 ? tones.bright : tones.hot;
    ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;

  // The throat: tunnel disks stepping darker toward the core, each
  // drifting on its own slow orbit so the tunnel visibly bores.
  const C = { x: cxm, y: yB - 0.72 * s };
  const throat: Array<[number, string]> = [
    [R * 0.95, tones.deep],
    [R * 0.68, shade(tones.deep, -14)],
    [R * 0.44, tones.void],
  ];
  for (let k = 0; k < throat.length; k++) {
    const [r, tone] = throat[k]!;
    const ox = Math.sin(t * 0.6 + phase + k * 1.7) * 0.025 * s;
    const oy = Math.cos(t * 0.45 + phase + k * 1.1) * 0.02 * s;
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.ellipse(C.x + ox, C.y + oy, r, r * 0.94, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The event horizon: the outer disk's rim catches riftlight.
  ctx.strokeStyle = tones.hot;
  ctx.lineWidth = Math.max(1.5, s * 0.028);
  ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 3.1 + phase);
  ctx.beginPath();
  ctx.ellipse(C.x, C.y, R * 0.95, R * 0.95 * 0.94, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Spiral arms: blocky chips winding into the throat. Chips ride a
  // tangent-aligned slab pose; size and tone climb toward the core.
  for (let arm = 0; arm < 3; arm++) {
    const base = phase + (arm * Math.PI * 2) / 3 - t * 1.9;
    for (let i = 0; i < 8; i++) {
      const f = i / 7;
      const ang = base + f * 3.1;
      const rad = (0.94 - f * 0.72) * R;
      const x = C.x + Math.cos(ang) * rad;
      const y = C.y + Math.sin(ang) * rad * 0.94;
      const w = (0.13 - f * 0.07) * s;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle =
        f < 0.3 ? tones.mid : f < 0.6 ? tones.arm : f < 0.85 ? tones.bright : tones.hot;
      ctx.globalAlpha = 0.6 + 0.4 * f;
      ctx.fillRect(-w / 2, -w * 0.3, w, w * 0.6);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;

  // Surge: every few seconds a ring blooms out of the core and dies
  // at the horizon — the gate exhaling.
  const su = ((t + phase) / 3.6) % 1;
  if (su < 0.28) {
    const f = su / 0.28;
    ctx.strokeStyle = tones.hot;
    ctx.lineWidth = Math.max(1.5, s * 0.045 * (1 - f * 0.5));
    ctx.globalAlpha = (1 - f) * 0.6;
    ctx.beginPath();
    ctx.ellipse(C.x, C.y, R * 0.15 + R * 0.8 * f, (R * 0.15 + R * 0.8 * f) * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The singularity: a pulsing diamond with a four-point glint.
  const pulse = 0.8 + 0.2 * Math.sin(t * 3.4 + phase);
  const cs = s * 0.095 * pulse;
  ctx.save();
  ctx.translate(C.x, C.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = tones.bright;
  ctx.fillRect(-cs * 1.35, -cs * 1.35, cs * 2.7, cs * 2.7);
  ctx.fillStyle = tones.core;
  ctx.fillRect(-cs * 0.8, -cs * 0.8, cs * 1.6, cs * 1.6);
  ctx.restore();
  // Glint cross, kept axis-aligned and thin.
  ctx.fillStyle = tones.core;
  ctx.globalAlpha = 0.55 * pulse;
  ctx.fillRect(C.x - cs * 2.6, C.y - Math.max(1, s * 0.012), cs * 5.2, Math.max(1, s * 0.024));
  ctx.fillRect(C.x - Math.max(1, s * 0.012), C.y - cs * 2.6, Math.max(1, s * 0.024), cs * 5.2);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// The air — pooled particle emission.
// ---------------------------------------------------------------------------

/**
 * Per-frame, per-visible-portal emission, dt-gated so rates are
 * framerate-independent: suction motes spiraling into the mouth,
 * blight embers rising off the apron, and the odd streak flung out.
 */
export function spawnPortalFx(
  particles: Particles,
  tx: number,
  ty: number,
  up: boolean,
  dt: number,
): void {
  const tones = portalTones(up);
  const mx = tx + 0.5;
  const my = ty + PORTAL_PLANE;
  // Suction motes: born on a wide ring, aimed at the mouth with a
  // tangential kick — drag bends the path into a visible spiral-in.
  if (Math.random() < dt * 7) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 1.1 + Math.random() * 0.9;
    const sx = mx + Math.cos(ang) * rad;
    const sy = my - 0.7 + Math.sin(ang) * rad * 0.75;
    const toC = Math.atan2(my - 0.7 - sy, mx - sx);
    particles.burst(sx, sy, 1, [tones.arm, tones.bright, tones.hot], {
      dir: toC + 0.55, // lead the center: the drag-curved path spirals
      spread: 0.3,
      speed: 1.9,
      life: 1.1,
      size: 0.07,
      gravity: 0,
      drag: 0.6,
      flicker: 0.45,
    });
  }
  // Blight embers: slow blocky sparks off the corrupted ground.
  if (Math.random() < dt * 2.6) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.5 + Math.random() * 1.6;
    particles.burst(mx + Math.cos(ang) * rad, ty + 0.5 + Math.sin(ang) * rad * 0.6, 1, [tones.mid, tones.arm], {
      dir: -Math.PI / 2,
      spread: 0.4,
      speed: 0.55,
      life: 1.7,
      size: 0.05,
      gravity: -0.15,
      flicker: 0.6,
    });
  }
  // A streak escaping the core — rare, fast, gone.
  if (Math.random() < dt * 0.8) {
    particles.burst(mx, my - 0.72, 1, [tones.hot, tones.core], {
      shape: 'streak',
      speed: 3.4,
      life: 0.4,
      size: 0.06,
      gravity: 0,
    });
  }
}
