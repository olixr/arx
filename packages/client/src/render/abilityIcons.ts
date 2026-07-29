import { PASSIVES } from '@arx/shared';
import { burstStarPath, fxStyleFor, jaggedRingPath, type FxStyle } from './abilityFx.js';
import { paintedIconUrl } from './icons.js';
import { shade } from './rig.js';

/**
 * THE SPELL-PLATE SET — a bespoke painted icon for every castable in
 * the game: weapon Arts, relic actives, Techniques, Sigils, and the
 * gear passives. No more lettered chips: each plate is a product shot
 * of the ability's MOMENT, drawn in the world's dialect (chunky flat
 * shapes, two to four colors, facet highlights) and pushed through the
 * shared icon pipeline so every plate wears the same eight-tap outline
 * ring and hard shadow the item set does.
 *
 * TWO LAWS keep a hundred plates readable as one system:
 *
 * 1. PALETTE-IS-IDENTITY — every plate pulls its colors from the
 *    ability's FX_STYLES entry (core/mid/deep/spark), so the icon on
 *    the hotbar and the detonation on the battlefield are visibly the
 *    same voice. Rings and burst stars are drawn with the SAME
 *    jaggedRingPath / burstStarPath silhouettes the combat FX use.
 *
 * 2. SHAPE-CUE GRAMMAR — the cast shape leaves a signature mark so a
 *    glance tells you HOW it casts before the tooltip tells you what:
 *    dash arts carry leading chevrons, novas a jagged ring, aimed
 *    blasts a ground ellipse under the falling subject, self-buffs
 *    rising halo arcs, summons a planted base line, beams a corridor
 *    seam, fields a pulsing patch, fans a splayed spread.
 */

const OUTLINE = '#241a2e';

type Ctx = CanvasRenderingContext2D;
type Painter = (c: Ctx) => void;

// -------------------------------------------------------- primitives

function poly(c: Ctx, color: string, pts: Array<[number, number]>, lw = 0.032): void {
  c.fillStyle = color;
  c.strokeStyle = OUTLINE;
  c.lineWidth = lw;
  c.beginPath();
  c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
  c.closePath();
  c.fill();
  c.stroke();
}

function fill(c: Ctx, color: string, pts: Array<[number, number]>): void {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
  c.closePath();
  c.fill();
}

function dot(c: Ctx, color: string, x: number, y: number, r: number): void {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function ringDot(c: Ctx, color: string, x: number, y: number, r: number, lw = 0.03): void {
  c.fillStyle = color;
  c.strokeStyle = OUTLINE;
  c.lineWidth = lw;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
}

/**
 * A two-tone licking flame: outer tongue in `mid`, inner heart in
 * `core`, leaning by `lean` (right positive). The whole set's fire
 * speaks through this one silhouette so every burn reads instantly.
 */
function flame(c: Ctx, x: number, y: number, s: number, st: FxStyle, lean = 0.12): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  poly(c, st.mid, [
    [0, -0.52], [0.16 + lean, -0.3], [0.3, -0.34], [0.26, -0.06],
    [0.34, 0.1], [0.16, 0.36], [-0.2, 0.38], [-0.34, 0.12],
    [-0.24 - lean, -0.14], [-0.3, -0.3], [-0.12, -0.26],
  ], 0.05);
  fill(c, st.core, [
    [0 + lean * 0.5, -0.2], [0.14, 0.02], [0.08, 0.24], [-0.1, 0.26], [-0.16, 0.06],
  ]);
  c.restore();
}

/** A six-spoke snowflake with branch ticks — the frost voice. */
function snowflake(c: Ctx, x: number, y: number, r: number, col: string, lw = 0.05): void {
  c.save();
  c.translate(x, y);
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 12;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(dx * r, dy * r);
    c.stroke();
    // Branch ticks at 60% radius.
    const bx = dx * r * 0.6;
    const by = dy * r * 0.6;
    const pa = a + Math.PI / 5;
    const pb = a - Math.PI / 5;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + Math.cos(pa) * r * 0.28, by + Math.sin(pa) * r * 0.28);
    c.moveTo(bx, by);
    c.lineTo(bx + Math.cos(pb) * r * 0.28, by + Math.sin(pb) * r * 0.28);
    c.stroke();
  }
  c.restore();
}

/** The jagged storm bolt — kinked wedge, bright facet down the lead edge. */
function bolt(c: Ctx, x: number, y: number, s: number, st: FxStyle, ang = 0.35): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  poly(c, st.mid, [
    [-0.1, -0.5], [0.18, -0.5], [0.04, -0.12], [0.24, -0.14], [-0.12, 0.5], [-0.02, 0.02], [-0.22, 0.06],
  ], 0.05);
  fill(c, st.core, [[-0.06, -0.44], [0.1, -0.44], [-0.01, -0.16], [-0.12, -0.1]]);
  c.restore();
}

/** A slash crescent (the blade's trail): annular arc from a0 to a1. */
function crescent(c: Ctx, x: number, y: number, r0: number, r1: number, a0: number, a1: number, col: string, lw = 0.032): void {
  c.fillStyle = col;
  c.strokeStyle = OUTLINE;
  c.lineWidth = lw;
  c.beginPath();
  c.arc(x, y, r1, a0, a1);
  c.arc(x, y, r0, a1, a0, true);
  c.closePath();
  c.fill();
  c.stroke();
}

/** An arrow drawn point-first: head, shaft, two fletch vanes. */
function arrow(c: Ctx, x: number, y: number, ang: number, len: number, st: FxStyle, headScale = 1): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const h = len / 2;
  c.strokeStyle = st.deep;
  c.lineWidth = 0.045;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-h, 0);
  c.lineTo(h - 0.1 * headScale, 0);
  c.stroke();
  // Fletching: two swept vanes.
  fill(c, st.mid, [[-h, -0.005], [-h + 0.12, -0.07], [-h + 0.19, -0.055], [-h + 0.1, 0.0]]);
  fill(c, st.mid, [[-h, 0.005], [-h + 0.12, 0.07], [-h + 0.19, 0.055], [-h + 0.1, 0.0]]);
  // The head, bright-faceted.
  poly(c, st.spark, [
    [h, 0], [h - 0.16 * headScale, -0.07 * headScale], [h - 0.12 * headScale, 0], [h - 0.16 * headScale, 0.07 * headScale],
  ], 0.028);
  c.restore();
}

/** A jagged nova ring in the ability's OWN fx silhouette. */
function novaRing(c: Ctx, x: number, y: number, r: number, st: FxStyle, points = 12, jag = 0.3, lw = 0.045): void {
  c.strokeStyle = st.mid;
  c.lineWidth = lw;
  c.lineJoin = 'round';
  c.beginPath();
  jaggedRingPath(c, x, y, r, 1, points, jag, -Math.PI / 2, 7);
  c.stroke();
}

/**
 * Ground patch — the aimed-cast cue. A flat squashed ellipse sitting a
 * fixed step below the local origin, so painters translate to their
 * scene center and the patch lands where feet would.
 */
function ground(c: Ctx, x: number, rx: number, st: FxStyle): void {
  c.fillStyle = st.deep;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.03;
  c.beginPath();
  c.ellipse(x, 0.14, rx, rx * 0.32, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
}

/** Dash-speed chevrons trailing a moving subject. */
function chevrons(c: Ctx, x: number, y: number, ang: number, st: FxStyle, n = 2, s = 1): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.strokeStyle = st.spark;
  c.lineWidth = 0.05 * s;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const ox = -i * 0.14 * s;
    c.beginPath();
    c.moveTo(ox - 0.09 * s, -0.11 * s);
    c.lineTo(ox, 0);
    c.lineTo(ox - 0.09 * s, 0.11 * s);
    c.stroke();
  }
  c.restore();
}

/** A blocky four-point burst star — the same path the combat FX throw. */
function star4(c: Ctx, x: number, y: number, r: number, col: string, rot = 0): void {
  c.fillStyle = col;
  c.beginPath();
  burstStarPath(c, x, y, r, r * 0.38, 4, rot);
  c.fill();
}

/** Rising halo arcs — the self-buff cue: power gathering on the caster. */
function haloArcs(c: Ctx, x: number, y: number, st: FxStyle): void {
  c.strokeStyle = st.spark;
  c.lineCap = 'round';
  for (const [r, lw, a] of [[0.3, 0.045, 0.75], [0.4, 0.038, 0.55]] as const) {
    c.globalAlpha = a;
    c.lineWidth = lw;
    c.beginPath();
    c.arc(x, y, r, Math.PI * 1.18, Math.PI * 1.82);
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** A regal five-point crown — kings and their decrees. */
function crown(c: Ctx, x: number, y: number, w: number, col: string, hi: string): void {
  const h = w * 0.62;
  poly(c, col, [
    [x - w / 2, y], [x - w / 2, y - h * 0.55], [x - w * 0.25, y - h * 0.2],
    [x, y - h], [x + w * 0.25, y - h * 0.2], [x + w / 2, y - h * 0.55], [x + w / 2, y],
  ], 0.03);
  c.fillStyle = hi;
  c.fillRect(x - w / 2 + 0.02, y - 0.045, w - 0.04, 0.028);
  dot(c, hi, x, y - h * 0.78, 0.024);
}

/** A clean skull — trophies and bone arts. (House rule: bones are fine.) */
function skull(c: Ctx, x: number, y: number, s: number, col: string, deep: string): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = col;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.05;
  c.beginPath();
  c.roundRect(-0.3, -0.34, 0.6, 0.5, 0.24);
  c.fill();
  c.stroke();
  poly(c, col, [[-0.18, 0.12], [0.18, 0.12], [0.14, 0.36], [-0.14, 0.36]], 0.045);
  dot(c, deep, -0.13, -0.06, 0.085);
  dot(c, deep, 0.13, -0.06, 0.085);
  fill(c, deep, [[0, 0.02], [0.05, 0.12], [-0.05, 0.12]]);
  c.strokeStyle = deep;
  c.lineWidth = 0.03;
  for (const tx of [-0.07, 0, 0.07]) {
    c.beginPath();
    c.moveTo(tx, 0.2);
    c.lineTo(tx, 0.33);
    c.stroke();
  }
  c.restore();
}

/** One curved briar thorn — verdant menace. */
function thorn(c: Ctx, x: number, y: number, ang: number, s: number, col: string): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  poly(c, col, [[0, -0.5], [0.16, 0.05], [0.07, 0.5], [-0.07, 0.5], [-0.05, 0.02]], 0.05);
  c.restore();
}

/** A soft cloud puff of three merged lobes — smoke and ghost-stuff. */
function puff(c: Ctx, x: number, y: number, r: number, col: string): void {
  c.fillStyle = col;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.03;
  c.beginPath();
  c.arc(x - r * 0.7, y + r * 0.25, r * 0.62, 0, Math.PI * 2);
  c.arc(x, y - r * 0.2, r * 0.78, 0, Math.PI * 2);
  c.arc(x + r * 0.72, y + r * 0.28, r * 0.55, 0, Math.PI * 2);
  c.fill();
}

/** A faceted orb — cores, globes, and heavy shots. */
function orb(c: Ctx, x: number, y: number, r: number, st: FxStyle): void {
  ringDot(c, st.mid, x, y, r, 0.04);
  // Dark limb lower-right, hot facet upper-left — the house sphere.
  c.fillStyle = st.deep;
  c.beginPath();
  c.arc(x, y, r, Math.PI * 0.05, Math.PI * 0.62);
  c.arc(x + r * 0.18, y - r * 0.18, r * 0.92, Math.PI * 0.62, Math.PI * 0.05, true);
  c.fill();
  fill(c, st.core, [
    [x - r * 0.5, y - r * 0.28], [x - r * 0.16, y - r * 0.62], [x + r * 0.08, y - r * 0.4], [x - r * 0.3, y - r * 0.05],
  ]);
}

/** A leaning sword glyph for the melee arts — pommel low-left, point high-right. */
function blade(c: Ctx, x: number, y: number, len: number, ang: number, st: FxStyle, grip = '#5b4028'): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const h = len / 2;
  poly(c, st.mid, [
    [-h * 0.45, -0.055], [h * 0.75, -0.055], [h, 0], [h * 0.75, 0.055], [-h * 0.45, 0.055],
  ], 0.03);
  fill(c, st.core, [[-h * 0.42, -0.045], [h * 0.72, -0.045], [h * 0.9, -0.004], [-h * 0.42, -0.004]]);
  // Guard + grip.
  c.fillStyle = shade(grip, 30);
  c.fillRect(-h * 0.5, -0.1, 0.045, 0.2);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.024;
  c.strokeRect(-h * 0.5, -0.1, 0.045, 0.2);
  c.fillStyle = grip;
  c.fillRect(-h * 0.78, -0.038, h * 0.28, 0.076);
  c.strokeRect(-h * 0.78, -0.038, h * 0.28, 0.076);
  c.restore();
}

/** A wicked dagger glyph — the rogue's short blade, drawn big in frame. */
function dagger(c: Ctx, x: number, y: number, len: number, ang: number, st: FxStyle): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const h = len / 2;
  poly(c, st.mid, [[-h * 0.2, -0.07], [h * 0.55, -0.07], [h, 0], [h * 0.55, 0.07], [-h * 0.2, 0.07]], 0.03);
  fill(c, st.core, [[-h * 0.17, -0.055], [h * 0.52, -0.055], [h * 0.82, -0.004], [-h * 0.17, -0.004]]);
  c.fillStyle = '#4a3a2a';
  c.fillRect(-h * 0.62, -0.05, h * 0.42, 0.1);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.024;
  c.strokeRect(-h * 0.62, -0.05, h * 0.42, 0.1);
  c.restore();
}

/** Venom droplet, mid body with a core glint. */
function droplet(c: Ctx, x: number, y: number, s: number, st: FxStyle): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = st.mid;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.05;
  c.beginPath();
  c.moveTo(0, -0.5);
  c.quadraticCurveTo(0.34, -0.02, 0.3, 0.16);
  c.arc(0, 0.24, 0.31, -0.24, Math.PI + 0.24);
  c.quadraticCurveTo(-0.34, -0.02, 0, -0.5);
  c.fill();
  c.stroke();
  dot(c, st.core, -0.1, 0.14, 0.09);
  c.restore();
}

/**
 * The wall's own silhouette — a heater shield, front-on: dark binding,
 * mid face, one lit top plane, a boss. The whole shield school speaks
 * through this one shape (THE UNIT-SPACE LAW: relative widths only).
 */
function shieldFace(c: Ctx, x: number, y: number, s: number, st: FxStyle, rot = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  poly(c, st.deep, [[-0.36, -0.42], [0.36, -0.42], [0.36, 0.02], [0, 0.46], [-0.36, 0.02]], 0.05);
  fill(c, st.mid, [[-0.28, -0.34], [0.28, -0.34], [0.28, -0.02], [0, 0.34], [-0.28, -0.02]]);
  fill(c, st.core, [[-0.28, -0.34], [0.28, -0.34], [0.22, -0.22], [-0.22, -0.22]]);
  dot(c, st.spark, 0, -0.06, 0.07);
  c.restore();
}

// ---------------------------------------------------------- painters

/**
 * Every castable's bespoke plate. Painters draw in the 0..1 unit box
 * on transparency; the shared pipeline adds the ring and shadow.
 */
const PLATES: Record<string, (st: FxStyle) => Painter> = {
  // ---------------------------------------------- founding weapon arts
  // Crescent Sweep — the full-turn cut: a near-closed slash trail
  // wheeling around the blade hub that made it.
  crescent_sweep: (st) => (c) => {
    c.translate(0.5, 0.52);
    crescent(c, 0, 0, 0.26, 0.4, -Math.PI * 0.82, Math.PI * 0.62, st.mid);
    fill(c, st.core, [[0.06, -0.38], [0.3, -0.26], [0.12, -0.3]]);
    blade(c, 0, 0, 0.5, -Math.PI / 3.2, st);
    chevrons(c, 0.33, 0.22, Math.PI * 0.78, st, 2, 0.8);
  },
  // Lunge — blade-first through its own speed: a long thrust riding
  // two chevrons out of the backswing.
  lunge: (st) => (c) => {
    c.translate(0.48, 0.5);
    c.rotate(-0.18);
    chevrons(c, -0.26, 0, Math.PI, st, 2, 1.1);
    blade(c, 0.05, 0, 0.78, 0, st);
    c.strokeStyle = st.core;
    c.lineWidth = 0.026;
    c.lineCap = 'round';
    for (const [x0, x1, y] of [[-0.3, 0.1, -0.13], [-0.34, 0.02, 0.13]] as const) {
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x1, y);
      c.stroke();
    }
  },
  // Shadowstep — the knife arrives before you do: a dark rift slit
  // with the dagger already through it, afterimage left behind.
  shadowstep: (st) => (c) => {
    c.translate(0.5, 0.5);
    fill(c, st.deep, [[-0.02, -0.42], [0.1, -0.3], [0.04, 0.02], [0.12, 0.3], [-0.0, 0.44], [-0.1, 0.12], [-0.06, -0.16]]);
    c.globalAlpha = 0.45;
    dagger(c, -0.22, 0.1, 0.5, -Math.PI / 5, st);
    c.globalAlpha = 1;
    dagger(c, 0.12, -0.08, 0.62, -Math.PI / 5, st);
    dot(c, st.spark, -0.3, -0.22, 0.028);
    dot(c, st.spark, -0.18, -0.34, 0.02);
  },
  // Shockwave — the ground remembers the slam: the fist-fall star at
  // center, slabs thrown clear with lit facets, fissures running out.
  shockwave: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.36, st);
    star4(c, 0, 0.06, 0.15, st.spark);
    star4(c, 0, 0.06, 0.08, '#ffffff', Math.PI / 4);
    // Upthrown slabs, each with a bright broken face.
    poly(c, st.mid, [[-0.36, -0.06], [-0.24, -0.3], [-0.14, -0.06], [-0.26, 0.04]], 0.03);
    fill(c, st.core, [[-0.33, -0.08], [-0.24, -0.26], [-0.2, -0.1], [-0.28, -0.03]]);
    poly(c, st.mid, [[0.14, -0.28], [0.28, -0.2], [0.32, 0.0], [0.16, -0.06]], 0.03);
    fill(c, st.core, [[0.17, -0.24], [0.26, -0.18], [0.27, -0.08], [0.18, -0.12]]);
    poly(c, st.mid, [[-0.05, -0.46], [0.07, -0.38], [0.02, -0.2], [-0.1, -0.28]], 0.03);
    fill(c, st.core, [[-0.03, -0.42], [0.04, -0.37], [0.0, -0.26], [-0.06, -0.3]]);
    // Fissures out from the impact.
    c.strokeStyle = st.deep;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    for (const [x1, y1] of [[-0.32, 0.2], [0.34, 0.18], [0.04, 0.28]] as const) {
      c.beginPath();
      c.moveTo(0, 0.06);
      c.lineTo(x1 * 0.55, y1 * 0.55 + 0.05);
      c.lineTo(x1, y1);
      c.stroke();
    }
  },
  // Volley — five shafts leave one hand: the fan cue at full spread.
  volley: (st) => (c) => {
    c.translate(0.5, 0.78);
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.3;
      arrow(c, Math.cos(a) * 0.32, Math.sin(a) * 0.34 + 0.06, a, 0.6, st);
    }
    ringDot(c, st.deep, 0, 0.06, 0.07, 0.026);
  },
  // Piercing Bolt — one heavy shaft still carrying the board it went
  // through: the exit wound is the whole point.
  piercing_bolt: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.32);
    // The pierced board — plank grain, a split radiating from the hole.
    poly(c, '#8a6a45', [[-0.09, -0.26], [0.11, -0.26], [0.13, 0.26], [-0.07, 0.26]], 0.032);
    c.strokeStyle = shade('#8a6a45', -25);
    c.lineWidth = 0.02;
    for (const [y0, y1] of [[-0.2, -0.06], [0.08, 0.2]] as const) {
      c.beginPath();
      c.moveTo(0.02, y0);
      c.lineTo(0.03, y1);
      c.stroke();
    }
    fill(c, shade('#8a6a45', -35), [[-0.02, -0.05], [0.07, -0.05], [0.05, 0.05], [-0.04, 0.05]]);
    arrow(c, 0.02, 0, 0, 0.96, st, 1.25);
    chevrons(c, -0.44, 0, Math.PI, st, 2, 0.85);
  },
  // Frost Nova — the ring of biting cold: frost silhouette ring around
  // a six-spoke flake.
  frost_nova: (st) => (c) => {
    c.translate(0.5, 0.5);
    novaRing(c, 0, 0, 0.38, st, 14, 0.26, 0.042);
    snowflake(c, 0, 0, 0.24, st.core, 0.05);
    dot(c, st.spark, 0.3, -0.28, 0.024);
    dot(c, st.spark, -0.32, 0.24, 0.02);
  },
  // Fireburst — the called blast: a fireball falling onto its aimed
  // ground patch, pillar of flame already rising.
  fireburst: (st) => (c) => {
    c.translate(0.5, 0.5);
    ground(c, 0, 0.34, st);
    c.translate(0, 0.34);
    flame(c, 0, -0.42, 0.85, st, 0);
    fill(c, st.spark, [[-0.3, 0.02], [-0.2, -0.2], [-0.14, 0.03]]);
    fill(c, st.spark, [[0.16, 0.03], [0.24, -0.16], [0.3, 0.02]]);
  },

  // ------------------------------------------------- blade-roster arts
  // Sundering Chop — one committed overhead cut: the blade buried
  // point-down, the ground conceding around it.
  sundering_chop: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    blade(c, 0.01, -0.1, 0.72, Math.PI / 2, st);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    for (const [x1, y1] of [[-0.28, 0.12], [0.3, 0.1]] as const) {
      c.beginPath();
      c.moveTo(0, 0.28);
      c.lineTo(x1 * 0.6, y1 * 0.6 + 0.16);
      c.lineTo(x1, y1 + 0.1);
      c.stroke();
    }
    star4(c, 0, 0.28, 0.09, st.spark);
  },
  // Thorn Lash — the briar uncoils: a whipping vine stroke studded
  // with barbs.
  thorn_lash: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.075;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.4, 0.34);
    c.quadraticCurveTo(0.1, 0.3, 0.28, -0.05);
    c.quadraticCurveTo(0.4, -0.3, 0.14, -0.4);
    c.stroke();
    c.strokeStyle = st.core;
    c.lineWidth = 0.026;
    c.beginPath();
    c.moveTo(-0.36, 0.31);
    c.quadraticCurveTo(0.08, 0.27, 0.25, -0.06);
    c.stroke();
    thorn(c, -0.1, 0.24, Math.PI * 0.9, 0.22, st.mid);
    thorn(c, 0.18, 0.08, Math.PI * 0.62, 0.2, st.mid);
    thorn(c, 0.3, -0.22, Math.PI * 0.3, 0.2, st.mid);
    droplet(c, -0.28, -0.2, 0.28, { ...st, mid: '#8a3040', core: '#ffd8d8' });
  },
  // Quicksilver — three thrusts in one tempo: triple echoed points.
  quicksilver: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.12);
    c.globalAlpha = 0.35;
    blade(c, -0.06, 0.18, 0.6, 0, st);
    c.globalAlpha = 0.6;
    blade(c, -0.02, -0.18, 0.66, 0, st);
    c.globalAlpha = 1;
    blade(c, 0.04, 0, 0.78, 0, st);
    star4(c, 0.44, 0, 0.07, st.core);
  },
  // Riptide — the tide going OUT: a breaking crest dragging cold back
  // across the cut.
  riptide: (st) => (c) => {
    c.translate(0.5, 0.52);
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(-0.42, 0.3);
    c.quadraticCurveTo(-0.1, 0.26, 0.1, 0.0);
    c.quadraticCurveTo(0.3, -0.3, 0.06, -0.38);
    c.quadraticCurveTo(0.26, -0.2, 0.1, 0.06);
    c.quadraticCurveTo(-0.04, 0.3, 0.42, 0.3);
    c.closePath();
    c.fill();
    c.stroke();
    fill(c, st.core, [[-0.3, 0.26], [-0.06, 0.2], [0.08, 0.02], [0.02, 0.24]]);
    blade(c, 0.05, -0.02, 0.55, -Math.PI / 2.6, st);
    chevrons(c, -0.3, -0.14, Math.PI * 1.05, st, 2, 0.75);
  },
  // Cinder Arc — the burning crescent that hangs in the air.
  cinder_arc: (st) => (c) => {
    c.translate(0.5, 0.52);
    crescent(c, 0, 0, 0.24, 0.4, -Math.PI * 0.7, Math.PI * 0.28, st.mid);
    crescent(c, 0, 0, 0.3, 0.36, -Math.PI * 0.62, Math.PI * 0.18, st.core, 0.02);
    flame(c, 0.26, -0.26, 0.42, st, 0.1);
    flame(c, -0.18, -0.32, 0.3, st, -0.08);
    dot(c, st.spark, -0.32, 0.1, 0.026);
  },
  // Winter's Edge — the slow glittering cut: a rimed blade hung with
  // icicles, frost stars in its wake.
  winters_edge: (st) => (c) => {
    c.translate(0.5, 0.5);
    blade(c, 0, 0.02, 0.85, -Math.PI / 4, st);
    // Icicles hanging off the trailing edge.
    for (const [x, y, s] of [[-0.13, 0.2, 0.16], [0.05, 0.05, 0.2], [0.22, -0.11, 0.15]] as const) {
      poly(c, st.core, [[x - 0.045, y], [x + 0.045, y], [x, y + s]], 0.024);
    }
    star4(c, -0.3, -0.18, 0.06, st.spark);
    star4(c, 0.34, 0.24, 0.05, st.spark, Math.PI / 4);
  },
  // Reaper's Arc — the harvest-wide sweep: a scythe crescent with a
  // soul-wisp riding the blade.
  reapers_arc: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, -0.04, 0.28, 0.42, Math.PI * 0.08, Math.PI * 0.98, st.mid);
    fill(c, st.core, [[-0.4, 0.06], [-0.28, 0.18], [-0.34, 0.3]]);
    // The snath rising from the cut.
    c.strokeStyle = '#5b4028';
    c.lineWidth = 0.055;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.3, 0.3);
    c.lineTo(0.12, -0.38);
    c.stroke();
    // A pale wisp caught in the sweep.
    puff(c, -0.16, -0.2, 0.1, 'rgba(216, 212, 232, 0.9)');
    dot(c, st.deep, -0.19, -0.22, 0.024);
    dot(c, st.deep, -0.11, -0.22, 0.024);
  },
  // Red Harvest — every edge at once: a ring of blades around the tally.
  red_harvest: (st) => (c) => {
    c.translate(0.5, 0.5);
    novaRing(c, 0, 0, 0.24, st, 10, 0.3, 0.04);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      c.save();
      c.translate(Math.cos(a) * 0.33, Math.sin(a) * 0.33);
      c.rotate(a);
      poly(c, st.mid, [[-0.02, -0.05], [0.14, -0.05], [0.2, 0], [0.14, 0.05], [-0.02, 0.05]], 0.026);
      fill(c, st.core, [[0, -0.04], [0.13, -0.04], [0.17, -0.002], [0, -0.002]]);
      c.restore();
    }
    droplet(c, 0, 0.02, 0.34, st);
  },
  // Storm Brand — the blade grounds the bolt: steel with lightning
  // leaping off the point down a line.
  storm_brand: (st) => (c) => {
    c.translate(0.46, 0.44);
    blade(c, -0.04, -0.02, 0.62, Math.PI / 3.4, { ...st, mid: '#8d94a8', core: '#e8ecf4' });
    bolt(c, 0.2, 0.02, 0.55, st, 0.5);
    bolt(c, 0.34, 0.3, 0.34, st, 0.9);
    dot(c, st.core, 0.1, -0.24, 0.026);
  },
  // King's Decree — the court dismissed: the crown above a shoving ring.
  kings_decree: (st) => (c) => {
    c.translate(0.5, 0.52);
    novaRing(c, 0, 0.12, 0.34, st, 12, 0.3, 0.045);
    crown(c, 0, -0.08, 0.5, st.mid, st.core);
    // Outward shove ticks.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.036;
    c.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [
      [-0.42, 0.06, -0.5, 0.02], [0.42, 0.06, 0.5, 0.02], [-0.36, 0.3, -0.44, 0.34], [0.36, 0.3, 0.44, 0.34],
    ] as const) {
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
  },
  // Sunburst — dawn happens HERE: the disc with its rotating ray blades.
  sunburst: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.fillStyle = st.mid;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.save();
      c.rotate(a);
      poly(c, st.mid, [[0.18, -0.055], [0.44, -0.02], [0.44, 0.02], [0.18, 0.055]], 0.024);
      c.restore();
    }
    ringDot(c, st.core, 0, 0, 0.19, 0.036);
    dot(c, st.spark, -0.055, -0.06, 0.05);
  },
  // Starfall — a piece of the sky keeps the appointment: comet down
  // onto the aimed patch.
  starfall_strike: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    star4(c, 0.02, 0.28, 0.1, st.spark);
    // The falling star, trail streaking from upper-left.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.38, -0.44);
    c.lineTo(-0.02, 0.1);
    c.stroke();
    c.strokeStyle = st.core;
    c.lineWidth = 0.026;
    c.beginPath();
    c.moveTo(-0.34, -0.42);
    c.lineTo(-0.04, 0.04);
    c.stroke();
    star4(c, 0, 0.12, 0.16, st.spark, Math.PI / 4);
    dot(c, '#fffbe8', 0, 0.12, 0.05);
  },
  // Vow Unbroken — the oath holds: upright blade wearing the halo.
  vow_unbroken: (st) => (c) => {
    c.translate(0.5, 0.52);
    haloArcs(c, 0, 0.1, st);
    blade(c, 0, 0.04, 0.8, -Math.PI / 2, st);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.035;
    c.beginPath();
    c.arc(0, -0.3, 0.14, 0, Math.PI * 2);
    c.stroke();
    star4(c, 0.2, -0.36, 0.05, st.core);
  },
};

// ------------------------------------------------- rogue-roster arts
Object.assign(PLATES, {
  // Serpent's Kiss — the wave finds the vein: a fanged dagger wound in
  // a serpent's coil, venom already welling.
  serpents_kiss: (st) => (c) => {
    c.translate(0.5, 0.5);
    dagger(c, 0.02, -0.04, 0.75, -Math.PI / 2.6, st);
    // The coil wrapping the blade.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.3, 0.26);
    c.quadraticCurveTo(0.05, 0.16, -0.08, -0.02);
    c.quadraticCurveTo(-0.2, -0.18, 0.08, -0.24);
    c.stroke();
    // The serpent's head at the coil's end.
    poly(c, st.spark, [[0.06, -0.3], [0.2, -0.26], [0.12, -0.16]], 0.026);
    dot(c, st.deep, 0.12, -0.25, 0.02);
    droplet(c, 0.26, 0.24, 0.3, st);
  },
  // Stinger — one wingbeat, one puncture: the wasp dart mid-lunge.
  stinger: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(0.3);
    chevrons(c, -0.34, 0, Math.PI, st, 2, 0.9);
    // The tapering sting-dart, banded.
    poly(c, st.mid, [[-0.2, -0.09], [0.14, -0.05], [0.42, 0], [0.14, 0.05], [-0.2, 0.09]], 0.03);
    fill(c, st.deep, [[-0.06, -0.075], [0.0, -0.07], [0.0, 0.07], [-0.06, 0.075]]);
    fill(c, st.deep, [[0.1, -0.055], [0.16, -0.05], [0.16, 0.05], [0.1, 0.055]]);
    fill(c, st.core, [[-0.18, -0.07], [0.12, -0.04], [0.3, -0.005], [-0.18, -0.02]]);
    // Two blurred wingbeats above.
    c.globalAlpha = 0.7;
    fill(c, '#e8ecf4', [[-0.16, -0.1], [-0.02, -0.34], [0.06, -0.3], [-0.06, -0.1]]);
    fill(c, '#e8ecf4', [[-0.2, -0.1], [-0.16, -0.3], [-0.08, -0.28], [-0.12, -0.1]]);
    c.globalAlpha = 1;
  },
  // Cold Snap — the first frost all at once: icicle teeth biting
  // outward from a frozen heart, an arm's length around.
  cold_snap: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r0 = i % 2 === 0 ? 0.22 : 0.18;
      const r1 = i % 2 === 0 ? 0.44 : 0.32;
      c.save();
      c.translate(Math.cos(a) * r0, Math.sin(a) * r0);
      c.rotate(a + Math.PI / 2);
      poly(c, i % 2 === 0 ? st.mid : st.core, [[-0.05, 0], [0.05, 0], [0, -(r1 - r0)]], 0.026);
      c.restore();
    }
    snowflake(c, 0, 0, 0.15, st.core, 0.036);
    dot(c, st.spark, 0.34, -0.34, 0.024);
    dot(c, st.spark, -0.36, 0.28, 0.02);
  },
  // Bone Needle — the dead lend a dart: a pale needle over crossed bone.
  bone_needle: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The lender's bone, canted behind.
    c.save();
    c.rotate(0.5);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.26, 0);
    c.lineTo(0.26, 0);
    c.stroke();
    for (const ex of [-0.26, 0.26]) {
      dot(c, st.deep, ex, -0.045, 0.05);
      dot(c, st.deep, ex, 0.045, 0.05);
    }
    c.restore();
    // The needle itself: long, tapered, bright.
    c.rotate(-0.5);
    poly(c, st.mid, [[-0.4, -0.035], [0.3, -0.02], [0.46, 0], [0.3, 0.02], [-0.4, 0.035]], 0.026);
    fill(c, st.core, [[-0.38, -0.028], [0.28, -0.014], [0.4, -0.002], [-0.38, -0.006]]);
    dot(c, st.core, -0.4, 0, 0.035);
  },
  // Shadow Fang — the dark takes a step and bites: a fang lunging out
  // of a torn shadow, the drained spark going home.
  shadow_fang: (st) => (c) => {
    c.translate(0.5, 0.5);
    fill(c, st.deep, [[-0.44, 0.14], [-0.2, -0.06], [-0.34, 0.3], [-0.06, 0.1], [-0.26, 0.4], [0.02, 0.3]]);
    chevrons(c, -0.26, -0.2, Math.PI * 0.95, st, 2, 0.8);
    // The fang: a heavy curved canine.
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.02, -0.36);
    c.quadraticCurveTo(0.4, -0.3, 0.38, 0.02);
    c.quadraticCurveTo(0.36, 0.3, 0.2, 0.42);
    c.quadraticCurveTo(0.22, 0.14, 0.1, -0.08);
    c.quadraticCurveTo(0.0, -0.24, 0.02, -0.36);
    c.fill();
    c.stroke();
    fill(c, st.core, [[0.08, -0.3], [0.3, -0.22], [0.32, -0.02], [0.2, -0.16]]);
    dot(c, st.spark, -0.1, -0.32, 0.03);
  },
  // Crimson Tithe — every wound pays you back: the tithed drop above
  // gathering halo arcs.
  crimson_tithe: (st) => (c) => {
    c.translate(0.5, 0.48);
    haloArcs(c, 0, 0.16, st);
    droplet(c, 0, -0.04, 0.62, st);
    dot(c, st.spark, -0.3, -0.3, 0.026);
    dot(c, st.spark, 0.32, -0.24, 0.022);
  },
  // Pale Flame — fire that never warmed anything: the cold tongue.
  pale_flame: (st) => (c) => {
    c.translate(0.5, 0.52);
    flame(c, 0, 0, 0.95, { ...st, mid: st.mid, core: '#f4fbff' }, -0.06);
    snowflake(c, 0.3, -0.32, 0.12, st.spark, 0.032);
  },
  // Spark Lash — a live wire into whoever is closest: the whip-arc of
  // chained charge.
  spark_lash: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.065;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.42, 0.3);
    c.quadraticCurveTo(-0.1, 0.34, 0.1, 0.1);
    c.stroke();
    bolt(c, 0.24, -0.14, 0.6, st, 0.5);
    ringDot(c, st.deep, -0.42, 0.3, 0.06, 0.026);
    star4(c, 0.4, -0.38, 0.07, st.core);
  },
  // King's Bane — regicide favors a faltering crown: the crown cleft,
  // the dagger through it.
  kings_bane: (st) => (c) => {
    c.translate(0.5, 0.52);
    crown(c, 0, 0.18, 0.56, st.mid, st.core);
    // The cleft: a dark split down the crown's face.
    fill(c, st.deep, [[-0.02, -0.18], [0.05, -0.18], [0.02, 0.18], [-0.04, 0.18]]);
    dagger(c, 0.02, -0.14, 0.66, Math.PI / 2.15, st);
    droplet(c, 0.3, 0.34, 0.24, { ...st, mid: '#8a3040', core: '#ffd8d8' });
  },
  // Last Word — say it once: a single white blade in a fading echo.
  last_word: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.globalAlpha = 0.3;
    c.strokeStyle = st.spark;
    c.lineWidth = 0.04;
    c.beginPath();
    c.arc(0, 0.02, 0.42, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 0.6;
    c.beginPath();
    c.arc(0, 0.02, 0.3, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
    blade(c, 0, 0.02, 0.82, -Math.PI / 2, st);
    star4(c, 0, -0.38, 0.08, '#ffffff');
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ------------------------------------------------ archer-roster arts
Object.assign(PLATES, {
  // Broadhead — the hunting shaft up close: an axe-wide head, the
  // trail it leaves ticked behind.
  broadhead: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.42, 0);
    c.lineTo(0.1, 0);
    c.stroke();
    fill(c, st.mid, [[-0.42, -0.005], [-0.3, -0.08], [-0.22, -0.06], [-0.32, 0]]);
    fill(c, st.mid, [[-0.42, 0.005], [-0.3, 0.08], [-0.22, 0.06], [-0.32, 0]]);
    // The broad head itself — twice the frame a field point gets.
    poly(c, st.spark, [[0.44, 0], [0.08, -0.2], [0.16, 0], [0.08, 0.2]], 0.032);
    fill(c, '#ffffff', [[0.4, -0.01], [0.14, -0.15], [0.2, -0.02]]);
    // Blood ticks in the wake.
    dot(c, '#8a3040', -0.2, 0.16, 0.03);
    dot(c, '#8a3040', -0.34, 0.22, 0.022);
  },
  // Wingbeat — three arrows in one flutter, the wing's curve behind.
  wingbeat: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.core;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.4, 0.06);
    c.quadraticCurveTo(-0.12, -0.42, 0.34, -0.34);
    c.stroke();
    c.beginPath();
    c.moveTo(-0.34, 0.2);
    c.quadraticCurveTo(-0.08, -0.2, 0.3, -0.16);
    c.stroke();
    arrow(c, -0.02, 0.12, -0.12, 0.66, st);
    arrow(c, 0.02, 0.28, 0.02, 0.6, st);
    arrow(c, -0.04, -0.04, -0.26, 0.6, st);
  },
  // Verdant Burst — the arrow planted like a seed, the ground blooming
  // teeth around it.
  verdant_burst: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    arrow(c, 0.01, -0.1, Math.PI / 2, 0.62, st);
    for (const [x, a, s] of [[-0.24, -0.5, 0.3], [0.26, 0.5, 0.3], [-0.12, -0.2, 0.24], [0.14, 0.2, 0.24]] as const) {
      thorn(c, x, 0.04, a + Math.PI, s, st.mid);
    }
    fill(c, st.core, [[-0.05, -0.4], [0.1, -0.52], [0.08, -0.36]]);
  },
  // Windsong — draw until the bow sings: the note loosed through
  // everything, swashes trailing like a stave.
  windsong: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.2);
    arrow(c, 0.06, 0, 0, 0.92, st, 1.1);
    c.strokeStyle = st.core;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    for (const [y, r] of [[-0.14, 0.3], [0.14, 0.26]] as const) {
      c.beginPath();
      c.moveTo(-0.4, y);
      c.quadraticCurveTo(-0.4 + r, y - 0.08, -0.4 + r * 2, y);
      c.stroke();
    }
    dot(c, st.spark, -0.36, -0.26, 0.028);
  },
  // Thorn Fan — a hedge of briar shafts loosed at once.
  thorn_fan: (st) => (c) => {
    c.translate(0.5, 0.8);
    for (let i = -2; i <= 2; i++) {
      const a = -Math.PI / 2 + i * 0.32;
      const x = Math.cos(a) * 0.34;
      const y = Math.sin(a) * 0.36 + 0.06;
      thorn(c, x + Math.cos(a) * 0.14, y + Math.sin(a) * 0.14, a + Math.PI / 2, 0.5, st.mid);
      c.strokeStyle = st.deep;
      c.lineWidth = 0.04;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - Math.cos(a) * 0.16, y - Math.sin(a) * 0.16);
      c.lineTo(x + Math.cos(a) * 0.06, y + Math.sin(a) * 0.06);
      c.stroke();
    }
    ringDot(c, st.deep, 0, 0.06, 0.07, 0.026);
  },
  // Howling Loose — the pack of arrows runs down the cold, the howl
  // rolling ahead of them.
  howling_loose: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0.4, 0, 0.3, 0.44, Math.PI * 0.7, Math.PI * 1.3, st.core, 0.024);
    crescent(c, 0.4, 0, 0.16, 0.26, Math.PI * 0.68, Math.PI * 1.32, st.core, 0.02);
    arrow(c, -0.1, -0.2, 0, 0.6, st);
    arrow(c, -0.16, 0.02, 0, 0.68, st);
    arrow(c, -0.1, 0.24, 0, 0.6, st);
  },
  // Hoarfrost — winter stamped outward: icicle rain inside the gripping ring.
  hoarfrost: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.36, st);
    novaRing(c, 0, 0.02, 0.35, st, 14, 0.24, 0.045);
    for (const [x, y, s] of [[-0.18, -0.3, 0.22], [0.02, -0.42, 0.28], [0.2, -0.26, 0.2]] as const) {
      poly(c, st.core, [[x - 0.05, y], [x + 0.05, y], [x, y + s]], 0.026);
    }
    snowflake(c, 0, 0.02, 0.13, st.spark, 0.03);
  },
  // Ghost Shaft — an arrow that declines to exist until it arrives.
  ghost_shaft: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.24);
    c.globalAlpha = 0.28;
    arrow(c, -0.26, 0, 0, 0.62, st);
    c.globalAlpha = 0.55;
    arrow(c, -0.1, 0, 0, 0.7, st);
    c.globalAlpha = 1;
    arrow(c, 0.12, 0, 0, 0.78, st, 1.1);
    puff(c, -0.34, 0.16, 0.09, 'rgba(216, 212, 232, 0.55)');
    dot(c, st.spark, -0.2, -0.18, 0.024);
  },
  // Cinder Rain — it comes back plural: burning shafts falling into
  // the patch that keeps burning.
  cinder_rain: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.34, st);
    for (const [x, y] of [[-0.2, -0.14], [0.04, -0.26], [0.26, -0.1]] as const) {
      arrow(c, x, y, Math.PI / 2.3, 0.4, st);
      flame(c, x - 0.1, y - 0.22, 0.26, st, 0.06);
    }
    fill(c, st.spark, [[-0.3, 0.02], [-0.24, -0.1], [-0.18, 0.03]]);
  },
  // King's Arrow — the royal warshot: gilded, crowned at the fletch,
  // not open to appeal.
  kings_arrow: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    c.strokeStyle = st.spark;
    c.globalAlpha = 0.4;
    c.lineWidth = 0.09;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.44, 0);
    c.lineTo(0.3, 0);
    c.stroke();
    c.globalAlpha = 1;
    arrow(c, 0, 0, 0, 0.95, st, 1.25);
    crown(c, -0.34, 0.09, 0.2, st.mid, st.core);
  },
  // Starfall Arrows — seven points of light leave the string.
  starfall_arrows: (st) => (c) => {
    c.translate(0.5, 0.48);
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.26;
      const r = i % 2 === 0 ? 0.4 : 0.28;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r + 0.3;
      c.strokeStyle = st.mid;
      c.lineWidth = 0.035;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - Math.cos(a) * 0.14, y - Math.sin(a) * 0.14);
      c.lineTo(x, y);
      c.stroke();
      star4(c, x + Math.cos(a) * 0.05, y + Math.sin(a) * 0.05, 0.07, st.spark, a);
    }
    ringDot(c, st.deep, 0, 0.32, 0.06, 0.024);
  },
  // Skyrend — the horizon torn along a chosen line: the seam, opened.
  skyrend: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.16);
    // The rent: a jagged seam clean across the frame.
    poly(c, st.core, [
      [-0.46, 0.02], [-0.2, -0.05], [0.0, 0.0], [0.2, -0.06], [0.46, -0.01],
      [0.2, 0.05], [0.0, 0.01], [-0.2, 0.07],
    ], 0.03);
    // Storm light bleeding from the tear.
    bolt(c, -0.12, 0.2, 0.32, st, 0.2);
    bolt(c, 0.2, -0.22, 0.3, st, 0.4);
    star4(c, 0.4, -0.06, 0.06, st.spark);
    star4(c, -0.38, 0.08, 0.05, st.spark);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// -------------------------------------------------- mage-roster arts
Object.assign(PLATES, {
  // Arcane Ring — raw magic snapped outward: rune ring, echo behind.
  arcane_ring: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.globalAlpha = 0.4;
    novaRing(c, 0, 0, 0.42, st, 10, 0.2, 0.032);
    c.globalAlpha = 1;
    novaRing(c, 0, 0, 0.3, st, 10, 0.24, 0.05);
    orb(c, 0, 0, 0.14, st);
    // Rune ticks riding the ring.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.03;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * 0.3;
      const y = Math.sin(a) * 0.3;
      c.beginPath();
      c.moveTo(x - 0.03, y - 0.03);
      c.lineTo(x + 0.03, y + 0.03);
      c.stroke();
    }
  },
  // Wisp Flare — released in three, back twice: orbit loops with
  // return curls.
  wisp_flare: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.032;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * 0.3;
      const y = Math.sin(a) * 0.3;
      c.beginPath();
      c.moveTo(x * 0.3, y * 0.3);
      c.quadraticCurveTo(x * 1.4 - y * 0.5, y * 1.4 + x * 0.5, x, y);
      c.stroke();
      flame(c, x, y, 0.32, st, i === 1 ? -0.1 : 0.1);
    }
    dot(c, st.core, 0, 0, 0.055);
  },
  // Hearth Flare — the hearth roars up: a bloom of flame petals.
  hearth_flare: (st) => (c) => {
    c.translate(0.5, 0.55);
    for (const [a, s] of [[-0.7, 0.55], [0.7, 0.55], [-0.35, 0.7], [0.35, 0.7]] as const) {
      c.save();
      c.rotate(a);
      flame(c, 0, -0.22, s, st, 0);
      c.restore();
    }
    flame(c, 0, -0.1, 0.9, st, 0);
    // The hearthstone lip underneath.
    poly(c, '#6e6a75', [[-0.36, 0.3], [0.36, 0.3], [0.3, 0.42], [-0.3, 0.42]], 0.03);
  },
  // Undertow — the ground remembers being seabed: the drag spiral.
  undertow: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const rot = (i / 3) * Math.PI * 2;
      c.beginPath();
      for (let t = 0; t <= 1; t += 0.12) {
        const a = rot + t * 2.4;
        const r = 0.42 - t * 0.32;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r * 0.75;
        if (t === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    dot(c, st.deep, 0, 0.02, 0.1);
    fill(c, st.core, [[-0.4, -0.26], [-0.24, -0.34], [-0.3, -0.22]]);
    fill(c, st.core, [[0.3, 0.24], [0.42, 0.18], [0.34, 0.3]]);
  },
  // Stormlash — call the bolt you were promised; it brings friends.
  stormlash: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The cloud shelf it falls out of.
    puff(c, 0, -0.34, 0.16, st.deep);
    bolt(c, 0, 0.08, 0.85, st, 0.06);
    bolt(c, -0.28, 0.2, 0.4, st, -0.25);
    bolt(c, 0.3, 0.24, 0.36, st, 0.35);
    ground(c, 0, 0.3, st);
  },
  // Cinderstorm — the emberstone exhales: a whirl of cinders.
  cinderstorm: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.055;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const rot = (i / 3) * Math.PI * 2 + 0.5;
      c.beginPath();
      c.arc(0, 0, 0.34, rot, rot + 1.5);
      c.stroke();
    }
    flame(c, 0, 0.02, 0.6, st, 0);
    for (const [x, y, r] of [[-0.36, -0.2, 0.035], [0.34, -0.28, 0.028], [0.4, 0.18, 0.03], [-0.3, 0.32, 0.026]] as const) {
      dot(c, st.spark, x, y, r);
    }
  },
  // Glaciate — glacier speed for everyone nearby: the cage of cold.
  glaciate: (st) => (c) => {
    c.translate(0.5, 0.52);
    orb(c, 0, 0.02, 0.17, st);
    // Ice bars rising on the rim.
    for (const [x, h] of [[-0.34, 0.3], [-0.12, 0.42], [0.12, 0.42], [0.34, 0.3]] as const) {
      poly(c, st.mid, [[x - 0.05, 0.3], [x - 0.045, -h + 0.08], [x, -h], [x + 0.045, -h + 0.08], [x + 0.05, 0.3]], 0.026);
      fill(c, st.core, [[x - 0.035, 0.26], [x - 0.03, -h + 0.1], [x - 0.005, -h + 0.04], [x - 0.005, 0.26]]);
    }
    ground(c, 0, 0.4, st);
  },
  // Galvanic Arc — the stormpearl discharges down the line.
  galvanic_arc: (st) => (c) => {
    c.translate(0.5, 0.5);
    orb(c, -0.28, 0.16, 0.15, st);
    bolt(c, 0.0, -0.04, 0.5, st, 0.85);
    bolt(c, 0.3, -0.24, 0.4, st, 0.6);
    ringDot(c, st.deep, 0.38, 0.06, 0.055, 0.024);
    ringDot(c, st.deep, 0.14, 0.3, 0.05, 0.024);
  },
  // Overgrowth — briars erupt and KEEP growing: the living field.
  overgrowth: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.36, st);
    thorn(c, -0.24, -0.04, -0.35, 0.42, st.mid);
    thorn(c, 0.02, -0.14, 0.06, 0.55, st.mid);
    thorn(c, 0.26, -0.02, 0.4, 0.4, st.mid);
    // Unfurling leaves at the base.
    for (const [x, sgn] of [[-0.1, -1], [0.14, 1]] as const) {
      c.fillStyle = st.spark;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.024;
      c.beginPath();
      c.moveTo(x, 0.02);
      c.quadraticCurveTo(x + 0.14 * sgn, -0.06, x + 0.2 * sgn, 0.04);
      c.quadraticCurveTo(x + 0.1 * sgn, 0.1, x, 0.02);
      c.fill();
      c.stroke();
    }
    fill(c, st.core, [[0.0, -0.6], [0.07, -0.68], [0.05, -0.52]]);
  },
  // Grave Chill — deep-earth cold rising through the living.
  grave_chill: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.36, st);
    // Rising chill-wisps: wavering columns off the soil.
    c.strokeStyle = st.core;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    for (const [x, h, lean] of [[-0.22, 0.4, 0.08], [0.02, 0.55, -0.06], [0.24, 0.36, 0.08]] as const) {
      c.beginPath();
      c.moveTo(x, 0.02);
      c.quadraticCurveTo(x + lean, -h * 0.5, x - lean, -h);
      c.stroke();
    }
    puff(c, 0.01, -0.34, 0.12, 'rgba(216, 220, 210, 0.85)');
    snowflake(c, -0.26, -0.34, 0.1, st.spark, 0.028);
  },
  // Gloom Burst — plant the blight and let it bloom: the dark blossom.
  gloom_burst: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.34, st);
    // Five gloom petals unfurling from the planted point.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      c.save();
      c.translate(0, -0.04);
      c.rotate(a);
      c.fillStyle = st.mid;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.026;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(0.1, -0.16, 0, -0.32);
      c.quadraticCurveTo(-0.1, -0.16, 0, 0);
      c.fill();
      c.stroke();
      c.restore();
    }
    dot(c, st.deep, 0, -0.06, 0.08);
    dot(c, st.spark, 0, -0.06, 0.04);
  },
  // Venom Lash — both serpents spit at once: twin green darts.
  venom_lash: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (const [y, a] of [[-0.12, -0.1], [0.14, 0.1]] as const) {
      c.save();
      c.translate(0, y);
      c.rotate(a);
      poly(c, st.mid, [[-0.34, -0.05], [0.2, -0.035], [0.4, 0], [0.2, 0.035], [-0.34, 0.05]], 0.028);
      fill(c, st.core, [[-0.32, -0.04], [0.18, -0.028], [0.32, -0.004], [-0.32, -0.008]]);
      c.restore();
    }
    droplet(c, -0.32, 0.32, 0.26, st);
    dot(c, st.spark, 0.42, -0.3, 0.026);
  },
  // Magma Orb — liquid rock that stops for no one.
  magma_orb: (st) => (c) => {
    c.translate(0.5, 0.5);
    orb(c, 0, 0, 0.3, st);
    // Crack seams glowing across the crust.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.24, -0.06);
    c.lineTo(-0.06, 0.02);
    c.lineTo(0.06, -0.1);
    c.lineTo(0.22, -0.02);
    c.stroke();
    c.beginPath();
    c.moveTo(-0.1, 0.14);
    c.lineTo(0.04, 0.2);
    c.stroke();
    // Slow drips trailing off the underside.
    droplet(c, -0.2, 0.34, 0.2, st);
    chevrons(c, -0.4, -0.02, Math.PI, st, 1, 0.8);
  },
  // Shatterfrost — the glacier bites down: an ice orb bursting to shards.
  shatterfrost: (st) => (c) => {
    c.translate(0.5, 0.5);
    orb(c, 0, 0.02, 0.2, st);
    // Shards flying off on every diagonal.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 0.34;
      const y = Math.sin(a) * 0.34;
      c.save();
      c.translate(x, y);
      c.rotate(a);
      poly(c, st.core, [[-0.02, -0.06], [0.14, 0], [-0.02, 0.06]], 0.024);
      c.restore();
    }
    novaRing(c, 0, 0.02, 0.28, st, 10, 0.3, 0.032);
  },
  // Solar Lance — a spear of noon thrown through everything at once.
  solar_lance: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.2);
    // The corridor seam: noon simply IS, all along the line.
    c.globalAlpha = 0.35;
    c.fillStyle = st.mid;
    c.fillRect(-0.46, -0.09, 0.92, 0.18);
    c.globalAlpha = 1;
    // The lance itself.
    poly(c, st.mid, [[-0.44, -0.045], [0.24, -0.045], [0.46, 0], [0.24, 0.045], [-0.44, 0.045]], 0.028);
    fill(c, st.core, [[-0.42, -0.035], [0.22, -0.035], [0.38, -0.004], [-0.42, -0.004]]);
    ringDot(c, st.spark, -0.3, 0, 0.09, 0.026);
    star4(c, 0.4, -0.14, 0.07, st.spark);
  },
  // Rune Echo — the runes light in order, then again louder.
  rune_echo: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (const [r, a] of [[0.42, 0.3], [0.3, 0.6], [0.18, 1]] as const) {
      c.globalAlpha = a;
      novaRing(c, 0, 0, r, st, 8, 0.2, 0.04);
    }
    c.globalAlpha = 1;
    // Rune strokes at the compass points.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.032;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const x = Math.cos(a) * 0.3;
      const y = Math.sin(a) * 0.3;
      c.beginPath();
      c.moveTo(x - 0.035, y + 0.035);
      c.lineTo(x + 0.035, y - 0.035);
      c.moveTo(x - 0.035, y - 0.035);
      c.lineTo(x + 0.035, y + 0.035);
      c.stroke();
    }
    dot(c, st.core, 0, 0, 0.06);
  },
  // Marrow Pulse — the ribcage lantern tolls: bone arcs rolling out.
  marrow_pulse: (st) => (c) => {
    c.translate(0.5, 0.52);
    // Nested rib arcs, opening downward like a tolling bell of bone.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    for (const [r, lw] of [[0.18, 0.07], [0.3, 0.06], [0.42, 0.05]] as const) {
      c.lineWidth = lw;
      c.beginPath();
      c.arc(0, -0.1, r, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();
    }
    // The lantern heart swinging inside.
    dot(c, st.spark, 0, -0.1, 0.09);
    dot(c, st.core, -0.025, -0.13, 0.038);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(0, -0.34);
    c.lineTo(0, -0.19);
    c.stroke();
  },
  // Void Rift — a window to the place with no windows. It INHALES.
  void_rift: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The rift: a wide dark almond, violet-lit at the lips, the seam of
    // elsewhere glowing down its throat.
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.036;
    c.beginPath();
    c.moveTo(0, -0.44);
    c.quadraticCurveTo(0.3, 0, 0, 0.44);
    c.quadraticCurveTo(-0.3, 0, 0, -0.44);
    c.fill();
    c.stroke();
    c.fillStyle = st.deep;
    c.beginPath();
    c.moveTo(0, -0.36);
    c.quadraticCurveTo(0.2, 0, 0, 0.36);
    c.quadraticCurveTo(-0.2, 0, 0, -0.36);
    c.fill();
    fill(c, st.core, [[0, -0.26], [0.045, 0], [0, 0.26], [-0.045, 0]]);
    // Two inhaled streaks curving INTO the mouth — quiet, not a burst.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.032;
    c.lineCap = 'round';
    for (const [x0, y0] of [[-0.46, -0.14], [0.46, 0.16]] as const) {
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo(x0 * 0.4, y0 * 0.5, x0 * 0.12, y0 * 0.1);
      c.stroke();
    }
  },
  // Eye of the Storm — stand still; the weather does the walking.
  eye_of_the_storm: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The calm eye at center.
    c.fillStyle = st.core;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.ellipse(0, 0, 0.16, 0.1, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    dot(c, st.deep, 0, 0, 0.045);
    // The wall of weather wheeling around it.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const rot = (i / 4) * Math.PI * 2;
      c.beginPath();
      c.arc(0, 0, 0.36, rot, rot + 1.1);
      c.stroke();
    }
    bolt(c, 0.3, -0.3, 0.22, st, 0.5);
  },
  // Red Eclipse — for one heartbeat the moon is close, and it drinks.
  red_eclipse: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The occluded disc: dark moon over the red one, corona spilling.
    ringDot(c, st.mid, 0, 0, 0.3, 0.04);
    c.fillStyle = st.deep;
    c.beginPath();
    c.arc(-0.07, -0.05, 0.27, 0, Math.PI * 2);
    c.fill();
    crescent(c, 0, 0, 0.3, 0.36, -Math.PI * 0.3, Math.PI * 0.42, st.spark, 0.02);
    droplet(c, 0.05, 0.4, 0.24, st);
    star4(c, -0.36, -0.32, 0.05, st.spark);
  },
  // Realm Rend — the splinter goes back where it came from, through
  // everything in between.
  realm_rend: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.3);
    // The seam torn clean across the world.
    poly(c, st.mid, [
      [-0.48, 0.0], [-0.24, -0.07], [-0.02, -0.02], [0.22, -0.09], [0.48, 0.0],
      [0.22, 0.07], [-0.02, 0.02], [-0.24, 0.09],
    ], 0.03);
    fill(c, st.core, [[-0.44, 0.0], [-0.22, -0.05], [0.0, -0.01], [0.2, -0.06], [0.4, 0.0], [0.0, 0.01], [-0.22, 0.05]]);
    // Realm-light stars leaking through.
    star4(c, -0.2, -0.24, 0.07, st.spark);
    star4(c, 0.26, 0.22, 0.06, st.spark, Math.PI / 4);
    star4(c, 0.1, -0.3, 0.05, '#ffffff');
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ------------------------------------------------------ relic actives
Object.assign(PLATES, {
  // Ember Dash — a streak of fire you were briefly inside of.
  ember_dash: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.1);
    chevrons(c, -0.3, 0, Math.PI, st, 2, 1.1);
    // The streak body: flame drawn horizontal by speed.
    poly(c, st.mid, [[-0.14, -0.1], [0.24, -0.13], [0.44, 0], [0.24, 0.13], [-0.14, 0.1], [0.02, 0]], 0.032);
    fill(c, st.core, [[0.0, -0.06], [0.26, -0.07], [0.38, 0], [0.26, 0.07], [0.0, 0.06], [0.1, 0]]);
    flame(c, -0.2, -0.18, 0.3, st, -0.14);
    dot(c, st.spark, -0.3, 0.16, 0.03);
  },
  // Healing Totem — the planted mender: carved post, green halo.
  healing_totem: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.3, st);
    // The carved post, banded.
    poly(c, '#8a6534', [[-0.11, 0.28], [-0.09, -0.34], [0.09, -0.34], [0.11, 0.28]], 0.032);
    c.fillStyle = '#a5793f';
    c.fillRect(-0.095, -0.1, 0.19, 0.05);
    c.fillRect(-0.1, 0.08, 0.2, 0.05);
    // The leaf-gem set at the crown.
    ringDot(c, st.mid, 0, -0.34, 0.11, 0.03);
    dot(c, st.core, -0.03, -0.37, 0.04);
    haloArcs(c, 0, -0.28, st);
    star4(c, 0.28, -0.2, 0.05, st.spark);
  },
  // Snare Trap — the waiting jaw, half-buried where grass would hide it.
  snare_trap: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.36, st);
    // The sprung ring of teeth, seen at a hunter's angle.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.05;
    c.beginPath();
    c.ellipse(0, -0.02, 0.3, 0.14, 0, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * 0.3;
      const y = Math.sin(a) * 0.14 - 0.02;
      fill(c, st.core, [[x - 0.03, y], [x + 0.03, y], [x, y - 0.12]]);
    }
    ringDot(c, st.deep, 0, -0.02, 0.05, 0.024);
  },
  // Storm Bell — rung once, heard by everything close.
  storm_bell: (st) => (c) => {
    c.translate(0.5, 0.48);
    // The bell body.
    c.fillStyle = '#c9a23c';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.034;
    c.beginPath();
    c.moveTo(-0.05, -0.4);
    c.quadraticCurveTo(-0.3, -0.34, -0.28, 0.02);
    c.lineTo(-0.34, 0.14);
    c.lineTo(0.34, 0.14);
    c.lineTo(0.28, 0.02);
    c.quadraticCurveTo(0.3, -0.34, 0.05, -0.4);
    c.closePath();
    c.fill();
    c.stroke();
    fill(c, '#fff8d8', [[-0.2, -0.3], [-0.08, -0.34], [-0.13, -0.04], [-0.23, 0.0]]);
    // The bolt is the clapper.
    bolt(c, 0, 0.28, 0.3, st, 0);
    // The peal: echo arcs off both shoulders.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.036;
    c.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      c.beginPath();
      c.arc(sgn * 0.42, -0.1, 0.1, sgn === 1 ? -0.8 : Math.PI - 0.8, sgn === 1 ? 0.8 : Math.PI + 0.8);
      c.stroke();
    }
  },
  // Hunter's Decoy — the straw double on its stake, drawing eyes.
  hunters_decoy: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.3, st);
    // Stake and crossbar.
    c.strokeStyle = '#8a6534';
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 0.26);
    c.lineTo(0, -0.3);
    c.moveTo(-0.22, -0.1);
    c.lineTo(0.22, -0.1);
    c.stroke();
    // The straw head and shoulders.
    ringDot(c, st.mid, 0, -0.32, 0.13, 0.032);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.02;
    for (const a of [-0.6, -0.2, 0.2, 0.6]) {
      c.beginPath();
      c.moveTo(Math.sin(a) * 0.05, -0.42);
      c.lineTo(Math.sin(a) * 0.1, -0.24);
      c.stroke();
    }
    poly(c, st.mid, [[-0.16, -0.06], [0.16, -0.06], [0.1, 0.2], [-0.1, 0.2]], 0.03);
    // The lure: an eye-catching glint.
    star4(c, 0.3, -0.3, 0.07, st.spark);
  },
  // Stone Aegis — the river stone takes the blows: shield of set stones.
  stone_aegis: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Kite silhouette of fitted river stones.
    poly(c, st.mid, [[0, -0.4], [0.32, -0.24], [0.28, 0.14], [0, 0.42], [-0.28, 0.14], [-0.32, -0.24]], 0.036);
    // The set stones: rounded cobbles in courses, alternately lit.
    const cobbles = [[-0.13, -0.18, 0.09], [0.12, -0.18, 0.1], [0.0, 0.02, 0.11], [-0.15, 0.1, 0.07], [0.16, 0.1, 0.07], [0.0, 0.24, 0.08]] as const;
    cobbles.forEach(([x, y, r], i) => ringDot(c, shade(st.mid, i % 2 === 0 ? 12 : -8), x, y, r, 0.02));
    fill(c, st.core, [[-0.02, -0.38], [0.24, -0.22], [0.12, -0.26], [-0.06, -0.32]]);
    haloArcs(c, 0, 0.06, st);
  },
  // Coil Lance — the thunderclap uncorked: a spring loosing its line.
  coil_lance: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.12);
    // The coil: tight loops at the stock end.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(-0.32 + i * 0.09, 0, 0.11, Math.PI * 0.5, Math.PI * 2.2);
      c.stroke();
    }
    // The loosed lance line with charge riding it.
    poly(c, st.core, [[-0.1, -0.04], [0.28, -0.03], [0.46, 0], [0.28, 0.03], [-0.1, 0.04]], 0.026);
    bolt(c, 0.16, -0.16, 0.26, st, 0.35);
    star4(c, 0.42, 0.12, 0.05, st.spark);
  },
  // Bramble Burst — point the ring at ground it likes.
  bramble_burst: (st) => (c) => {
    c.translate(0.5, 0.55);
    ground(c, 0, 0.36, st);
    novaRing(c, 0, 0.0, 0.33, st, 12, 0.3, 0.036);
    thorn(c, -0.2, -0.08, -0.4, 0.34, st.mid);
    thorn(c, 0.05, -0.16, 0.1, 0.42, st.mid);
    thorn(c, 0.26, -0.06, 0.45, 0.32, st.mid);
    droplet(c, -0.34, -0.3, 0.22, { ...st, mid: '#8a3040', core: '#ffd8d8' });
  },
  // Arcane Seekers — three motes of asking-light choose their marks.
  arcane_seekers: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Three lazy homing curves converging on separate points.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.032;
    c.lineCap = 'round';
    const seekers: Array<[number, number, number, number]> = [
      [-0.42, 0.34, 0.28, -0.3], [-0.44, 0.05, 0.34, 0.1], [-0.34, -0.28, 0.2, 0.36],
    ];
    for (const [x0, y0, x1, y1] of seekers) {
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo(x0 * 0.1, (y0 + y1) * 0.9, x1, y1);
      c.stroke();
    }
    for (const [, , x1, y1] of seekers) {
      star4(c, x1, y1, 0.09, st.mid, Math.PI / 4);
      dot(c, st.core, x1, y1, 0.035);
    }
    ringDot(c, st.deep, -0.42, 0.05, 0.05, 0.024);
  },
  // Venom Dart — one green needle with a name on it.
  venom_dart: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The homing curve it refuses to leave.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.032;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.42, 0.32);
    c.quadraticCurveTo(0.1, 0.42, 0.3, -0.02);
    c.stroke();
    c.save();
    c.translate(0.24, -0.1);
    c.rotate(-1.1);
    poly(c, st.mid, [[-0.26, -0.045], [0.12, -0.03], [0.3, 0], [0.12, 0.03], [-0.26, 0.045]], 0.026);
    fill(c, st.core, [[-0.24, -0.035], [0.1, -0.02], [0.22, -0.002], [-0.24, -0.008]]);
    c.restore();
    droplet(c, -0.2, -0.2, 0.3, st);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// -------------------------------------------------------- techniques
Object.assign(PLATES, {
  // Heavy Slam — the overhead verdict: maul head down, ground cracked.
  heavy_slam: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    // Haft up-right, head buried at center.
    c.strokeStyle = '#7a5a38';
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.06, -0.02);
    c.lineTo(0.34, -0.42);
    c.stroke();
    poly(c, st.mid, [[-0.24, -0.16], [0.1, -0.24], [0.16, 0.04], [-0.18, 0.12]], 0.036);
    fill(c, st.core, [[-0.22, -0.15], [0.08, -0.22], [0.1, -0.12], [-0.2, -0.05]]);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    for (const [x1, y1] of [[-0.34, 0.16], [0.3, 0.2], [-0.06, 0.26]] as const) {
      c.beginPath();
      c.moveTo(-0.02, 0.06);
      c.lineTo(x1, y1);
      c.stroke();
    }
  },
  // Whirlwind — become the blade: three cuts wheeling one center.
  whirlwind: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (let i = 0; i < 3; i++) {
      const rot = (i / 3) * Math.PI * 2;
      crescent(c, 0, 0, 0.26, 0.4, rot, rot + 1.6, st.mid, 0.03);
    }
    for (let i = 0; i < 3; i++) {
      const rot = (i / 3) * Math.PI * 2 + 0.25;
      fill(c, st.core, [
        [Math.cos(rot) * 0.38, Math.sin(rot) * 0.38],
        [Math.cos(rot + 0.5) * 0.36, Math.sin(rot + 0.5) * 0.36],
        [Math.cos(rot + 0.45) * 0.3, Math.sin(rot + 0.45) * 0.3],
      ]);
    }
    ringDot(c, st.deep, 0, 0, 0.09, 0.03);
    dot(c, st.spark, 0, 0, 0.04);
  },
  // Bloodlust — six seconds of feeding: the wound-drop burning like a
  // banner over the ring of appetite.
  bloodlust: (st) => (c) => {
    c.translate(0.5, 0.5);
    novaRing(c, 0, 0.04, 0.36, st, 12, 0.26, 0.04);
    droplet(c, 0, -0.02, 0.55, st);
    flame(c, 0, -0.34, 0.34, { ...st, mid: st.spark }, 0.08);
    haloArcs(c, 0, 0.12, st);
  },
  // Tumble Shot — roll one way, the arrow flies the other.
  tumble_shot: (st) => (c) => {
    c.translate(0.5, 0.52);
    // The tumble: a curled roll-arc with motion ticks.
    c.strokeStyle = st.deep;
    c.lineWidth = 0.055;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(-0.2, 0.1, 0.2, -0.4, Math.PI * 1.3);
    c.stroke();
    chevrons(c, -0.42, -0.06, Math.PI * 0.75, st, 2, 0.8);
    // The answering arrow, loosed opposite the roll.
    arrow(c, 0.16, -0.1, -0.18, 0.62, st, 1.1);
  },
  // Rain of Arrows — the darkened patch of sky, delivered.
  rain_of_arrows: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    puff(c, 0, -0.42, 0.15, st.deep);
    for (const [x, y] of [[-0.22, -0.2], [0.0, -0.12], [0.22, -0.22]] as const) {
      arrow(c, x, y, Math.PI / 2, 0.36, st);
    }
    c.strokeStyle = st.spark;
    c.lineWidth = 0.026;
    c.lineCap = 'round';
    for (const x of [-0.32, 0.1, 0.32]) {
      c.beginPath();
      c.moveTo(x, -0.34);
      c.lineTo(x - 0.02, -0.22);
      c.stroke();
    }
  },
  // Twin Strike — two heavy shafts as one: parallel and through.
  twin_strike: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.26);
    arrow(c, 0, -0.11, 0, 0.88, st, 1.15);
    arrow(c, 0, 0.11, 0, 0.88, st, 1.15);
    chevrons(c, -0.46, 0, Math.PI, st, 1, 0.9);
  },
  // Arc Bolt — the crack that leaps from foe to foe.
  arc_bolt: (st) => (c) => {
    c.translate(0.5, 0.5);
    bolt(c, -0.22, -0.1, 0.55, st, 0.4);
    bolt(c, 0.14, 0.1, 0.45, st, 0.6);
    ringDot(c, st.deep, -0.02, 0.06, 0.05, 0.024);
    ringDot(c, st.deep, 0.36, 0.3, 0.055, 0.024);
    star4(c, -0.38, -0.34, 0.06, st.core);
  },
  // Blink — between places: gone-mark and arrival star.
  blink: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The departure: a fading rune ring where you were.
    c.globalAlpha = 0.45;
    novaRing(c, -0.24, 0.12, 0.18, st, 8, 0.22, 0.036);
    c.globalAlpha = 1;
    // The stride of nothing between.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.03;
    c.lineCap = 'round';
    c.setLineDash([0.05, 0.06]);
    c.beginPath();
    c.moveTo(-0.16, 0.06);
    c.quadraticCurveTo(0.02, -0.2, 0.2, -0.1);
    c.stroke();
    c.setLineDash([]);
    // The arrival, announced.
    star4(c, 0.24, -0.12, 0.16, st.mid, Math.PI / 4);
    star4(c, 0.24, -0.12, 0.08, st.core);
  },
  // Meteor Shard — called down on your mark, still burning.
  meteor_shard: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    // The shard: a burning wedge of rock arriving point-first.
    c.save();
    c.translate(-0.04, -0.14);
    c.rotate(0.9);
    poly(c, st.deep, [[-0.14, -0.22], [0.1, -0.18], [0.16, 0.1], [0.0, 0.24], [-0.16, 0.04]], 0.034);
    fill(c, st.mid, [[-0.1, -0.18], [0.06, -0.15], [0.1, 0.06], [-0.1, -0.02]]);
    c.restore();
    flame(c, -0.3, -0.36, 0.4, st, -0.16);
    star4(c, 0.05, 0.24, 0.1, st.spark);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(0.14, 0.28);
    c.lineTo(0.34, 0.2);
    c.stroke();
  },
  // Earthbreaker — leap to the mark and land like a verdict.
  earthbreaker: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.36, st);
    // The leap arc, ticked.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    c.setLineDash([0.06, 0.05]);
    c.beginPath();
    c.moveTo(-0.42, -0.1);
    c.quadraticCurveTo(-0.1, -0.5, 0.06, -0.1);
    c.stroke();
    c.setLineDash([]);
    // The landing wedge driven in, slabs upthrown.
    poly(c, st.mid, [[-0.1, -0.14], [0.14, -0.14], [0.05, 0.1], [-0.02, 0.1]], 0.034);
    poly(c, st.mid, [[-0.3, 0.0], [-0.2, -0.14], [-0.14, 0.04], [-0.26, 0.1]], 0.028);
    poly(c, st.mid, [[0.18, -0.1], [0.3, -0.02], [0.26, 0.12], [0.16, 0.02]], 0.028);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.034;
    for (const [x1, y1] of [[-0.36, 0.2], [0.36, 0.18]] as const) {
      c.beginPath();
      c.moveTo(0.02, 0.1);
      c.lineTo(x1, y1);
      c.stroke();
    }
  },
  // Storm of Shafts — the sky kept black on a schedule.
  storm_of_shafts: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.36, st);
    puff(c, -0.02, -0.44, 0.16, st.deep);
    for (const [x, y, l] of [[-0.26, -0.18, 0.3], [-0.04, -0.26, 0.34], [0.2, -0.16, 0.3], [0.32, -0.3, 0.24]] as const) {
      arrow(c, x, y, Math.PI / 2.15, l, st);
    }
    bolt(c, -0.36, -0.32, 0.2, st, 0.2);
  },
  // Maelstrom — dry land walks the drain.
  maelstrom: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Spiral arms tightening to the eye.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.065;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const rot = (i / 4) * Math.PI * 2;
      c.beginPath();
      for (let t = 0; t <= 1; t += 0.1) {
        const a = rot + t * 2.8;
        const r = 0.44 - t * 0.36;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r * 0.8;
        if (t === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    // The drain's eye, dark.
    c.fillStyle = st.deep;
    c.beginPath();
    c.ellipse(0, 0.02, 0.1, 0.07, 0, 0, Math.PI * 2);
    c.fill();
    fill(c, st.core, [[-0.42, -0.3], [-0.26, -0.38], [-0.32, -0.24]]);
    fill(c, st.core, [[0.36, 0.26], [0.46, 0.2], [0.4, 0.32]]);
  },
  // Rend — a shallow cut that bleeds like a deep one.
  rend: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.5);
    // The torn wound: a jagged gash pulled wide.
    poly(c, st.deep, [
      [-0.4, 0.0], [-0.22, -0.09], [-0.02, -0.04], [0.2, -0.1], [0.4, -0.01],
      [0.2, 0.09], [-0.02, 0.04], [-0.22, 0.1],
    ], 0.032);
    fill(c, st.mid, [[-0.34, 0.0], [-0.2, -0.06], [0.0, -0.02], [0.18, -0.07], [0.34, -0.01], [0.18, 0.06], [0.0, 0.02], [-0.2, 0.07]]);
    c.rotate(0.5);
    droplet(c, -0.12, 0.32, 0.26, st);
    droplet(c, 0.16, 0.38, 0.2, st);
  },
  // Smoke Bomb — the room dropped into choking gray.
  smoke_bomb: (st) => (c) => {
    c.translate(0.5, 0.52);
    puff(c, -0.05, -0.2, 0.17, st.mid);
    puff(c, 0.22, -0.02, 0.14, shade(st.mid, -12));
    puff(c, -0.26, 0.02, 0.13, shade(st.mid, 10));
    // The shell dropping out of its own cloud, fuse still lit.
    ringDot(c, st.deep, 0.02, 0.16, 0.14, 0.034);
    fill(c, st.core, [[-0.05, 0.06], [0.03, 0.03], [0.06, 0.1], [-0.02, 0.12]]);
    c.strokeStyle = '#8a6534';
    c.lineWidth = 0.03;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.1, 0.04);
    c.quadraticCurveTo(0.18, -0.04, 0.16, -0.1);
    c.stroke();
    star4(c, 0.17, -0.13, 0.05, '#ffd24a');
  },
  // Envenom — oil the edge: the dagger taking its coat, drop by drop.
  envenom: (st) => (c) => {
    c.translate(0.5, 0.5);
    dagger(c, -0.02, 0.06, 0.8, -Math.PI / 3, st);
    // The coat sliding down the edge.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.045;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.1, -0.28);
    c.lineTo(0.28, 0.08);
    c.stroke();
    droplet(c, 0.32, 0.28, 0.28, st);
    haloArcs(c, 0, 0.1, st);
  },
  // Night Fangs — three thrown darks pick their own throats.
  night_fangs: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (const [x, y, a] of [[-0.2, -0.16, -0.3], [0.1, 0.0, 0.05], [-0.06, 0.26, 0.35]] as const) {
      // Each fang: a curved dark canine mid-flight with a seeking curl.
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.fillStyle = st.mid;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.03;
      c.beginPath();
      c.moveTo(-0.16, -0.06);
      c.quadraticCurveTo(0.08, -0.1, 0.22, 0.0);
      c.quadraticCurveTo(0.06, 0.02, -0.12, 0.06);
      c.closePath();
      c.fill();
      c.stroke();
      fill(c, st.core, [[-0.12, -0.045], [0.06, -0.07], [0.16, -0.01], [-0.1, -0.01]]);
      c.strokeStyle = st.spark;
      c.lineWidth = 0.026;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-0.16, -0.05);
      c.quadraticCurveTo(-0.3, -0.02, -0.34, 0.08);
      c.stroke();
      c.restore();
    }
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ------------------------------- THE OPEN LADDER — the 24 new arts
Object.assign(PLATES, {
  // Bull Rush — the lowered shoulder becomes a wedge; the dust agrees.
  bull_rush: (st) => (c) => {
    c.translate(0.5, 0.52);
    chevrons(c, -0.34, -0.02, 0, st, 2, 1.1);
    poly(c, st.mid, [[-0.08, -0.22], [0.34, -0.04], [0.34, 0.12], [-0.12, 0.18]], 0.036);
    fill(c, st.core, [[-0.06, -0.18], [0.26, -0.04], [-0.08, 0.0]]);
    puff(c, -0.18, 0.22, 0.09, st.deep);
    puff(c, 0.02, 0.26, 0.07, st.deep);
  },
  // Warcry — the shout leaves the mouth and hardens into rings.
  warcry: (st) => (c) => {
    c.translate(0.42, 0.5);
    dot(c, st.deep, -0.16, 0, 0.1);
    for (const [r, a] of [[0.2, 0.9], [0.32, 0.65], [0.44, 0.4]] as const) {
      c.globalAlpha = a;
      crescent(c, -0.1, 0, r, r + 0.055, -0.9, 0.9, st.mid, 0.03);
    }
    c.globalAlpha = 1;
    star4(c, 0.36, -0.3, 0.09, st.spark);
    star4(c, 0.4, 0.26, 0.07, st.core);
  },
  // Steel Wave — the swing leaves the sword and keeps rolling.
  steel_wave: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, -0.05, 0, 0.3, 0.44, -0.75, 0.75, st.mid, 0.036);
    crescent(c, -0.05, 0, 0.32, 0.4, -0.55, 0.55, st.core, 0.024);
    chevrons(c, -0.3, 0, 0, st, 2, 0.9);
    for (const a of [-0.5, 0, 0.5]) {
      star4(c, Math.cos(a) * 0.52 - 0.02, Math.sin(a) * 0.52, 0.06, st.spark, a);
    }
  },
  // Stagger Stomp — the heel arrives; the floor passes it on.
  stagger_stomp: (st) => (c) => {
    c.translate(0.5, 0.48);
    c.globalAlpha = 0.5;
    novaRing(c, 0, 0.18, 0.34, st, 10, 0.2, 0.034);
    c.globalAlpha = 1;
    poly(c, st.mid, [[-0.14, -0.34], [0.12, -0.34], [0.16, 0.0], [0.08, 0.1], [-0.18, 0.06]], 0.036);
    fill(c, st.core, [[-0.1, -0.3], [0.08, -0.3], [0.1, -0.1], [-0.12, -0.12]]);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    for (const [x1, y1] of [[-0.38, 0.28], [0.36, 0.3], [-0.1, 0.38]] as const) {
      c.beginPath();
      c.moveTo(-0.02, 0.12);
      c.lineTo(x1, y1);
      c.stroke();
    }
  },
  // Headsman's Stroke — the axe over the block; the arc is clean.
  headsman_stroke: (st) => (c) => {
    c.translate(0.5, 0.52);
    poly(c, '#6a4a2e', [[-0.3, 0.14], [0.3, 0.14], [0.26, 0.32], [-0.26, 0.32]], 0.036);
    c.strokeStyle = '#7a5a38';
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.3, -0.42);
    c.lineTo(0.06, -0.08);
    c.stroke();
    poly(c, st.mid, [[-0.26, -0.34], [0.02, -0.42], [0.08, -0.12], [-0.14, -0.06]], 0.036);
    fill(c, st.core, [[-0.22, -0.32], [0.0, -0.38], [0.02, -0.26], [-0.18, -0.22]]);
    crescent(c, -0.06, 0.02, 0.3, 0.35, 1.9, 2.9, st.spark, 0.026);
  },
  // Warlord's Descent — the banner comes down with the man.
  warlords_descent: (st) => (c) => {
    c.translate(0.5, 0.5);
    crown(c, 0, -0.34, 0.3, st.mid, st.core);
    chevrons(c, 0, -0.06, Math.PI / 2, st, 2, 1.1);
    c.globalAlpha = 0.6;
    novaRing(c, 0, 0.3, 0.3, st, 10, 0.24, 0.04);
    c.globalAlpha = 1;
    ground(c, 0, 0.34, st);
  },
  // Longshot — one line, drawn to the edge of the plate.
  longshot: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.024;
    c.setLineDash([0.03, 0.05]);
    c.beginPath();
    c.moveTo(-0.44, 0.16);
    c.lineTo(0.44, -0.16);
    c.stroke();
    c.setLineDash([]);
    arrow(c, 0, 0, -0.35, 0.92, st, 1.15);
    star4(c, 0.42, -0.16, 0.07, st.spark);
  },
  // Snare Shot — the arrow delivers the trap; the ground keeps it.
  snare_shot: (st) => (c) => {
    c.translate(0.5, 0.54);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.026;
    c.setLineDash([0.04, 0.05]);
    c.beginPath();
    c.moveTo(-0.42, -0.3);
    c.quadraticCurveTo(-0.05, -0.5, 0.16, -0.08);
    c.stroke();
    c.setLineDash([]);
    ground(c, 0.1, 0.26, st);
    ringDot(c, st.mid, 0.1, 0.04, 0.16, 0.034);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      thorn(c, 0.1 + Math.cos(a) * 0.17, 0.04 + Math.sin(a) * 0.17, a, 0.55, st.spark);
    }
  },
  // Ricochet — the flight path changes its mind, twice.
  ricochet: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-0.42, -0.26);
    c.lineTo(-0.02, 0.08);
    c.lineTo(0.3, -0.22);
    c.stroke();
    star4(c, -0.02, 0.08, 0.09, st.spark, Math.PI / 4);
    arrow(c, 0.28, 0.02, 0.85, 0.42, st, 1);
    star4(c, 0.32, -0.24, 0.07, st.core);
  },
  // Skyfall Shot — count to two; the shadow is already there.
  skyfall_shot: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.3, st);
    arrow(c, 0, -0.08, Math.PI / 2, 0.6, st, 1.2);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.026;
    c.lineCap = 'round';
    for (const dx of [-0.14, 0.14]) {
      c.beginPath();
      c.moveTo(dx, -0.4);
      c.lineTo(dx, -0.22);
      c.stroke();
    }
  },
  // Phantom Flight — out pale, home red.
  phantom_flight: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.026;
    c.setLineDash([0.05, 0.05]);
    c.beginPath();
    c.ellipse(0, 0.02, 0.36, 0.2, -0.25, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    arrow(c, 0.02, -0.16, -0.12, 0.5, st, 1);
    droplet(c, -0.26, 0.26, 0.75, st);
  },
  // Arrow Tempest — five shafts, five verdicts, one storm.
  arrow_tempest: (st) => (c) => {
    c.translate(0.5, 0.56);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.04;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(0, 0.1, 0.14, 0.4, Math.PI * 1.8);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      arrow(c, Math.cos(a) * 0.3, 0.02 + Math.sin(a) * 0.3, a, 0.4, st, 0.9);
    }
  },
  // Frost Lance — one cold line; it holds.
  frost_lance: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.mid, [[-0.42, 0.18], [0.3, -0.14], [0.44, -0.2], [0.34, -0.02], [-0.38, 0.26]], 0.032);
    fill(c, st.core, [[-0.38, 0.18], [0.28, -0.12], [-0.36, 0.22]]);
    snowflake(c, -0.3, -0.2, 0.11, st.spark, 0.04);
    snowflake(c, 0.12, 0.26, 0.08, st.mid, 0.035);
  },
  // Ward Shell — the dome takes the blow; you take the step.
  ward_shell: (st) => (c) => {
    c.translate(0.5, 0.56);
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.034;
    c.globalAlpha = 0.85;
    c.beginPath();
    c.arc(0, 0.06, 0.34, Math.PI, 0);
    c.closePath();
    c.fill();
    c.stroke();
    c.globalAlpha = 1;
    crescent(c, 0, 0.06, 0.24, 0.3, -Math.PI, -0.2, st.core, 0.024);
    ground(c, 0, 0.1, st);
    star4(c, 0.26, -0.34, 0.08, st.spark);
  },
  // Ember Fan — a hand of fire, every finger burning.
  ember_fan: (st) => (c) => {
    c.translate(0.5, 0.62);
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.42;
      flame(c, Math.sin(a) * 0.3, -Math.abs(Math.cos(a)) * 0.26 - 0.02, 0.72 - Math.abs(i) * 0.1, st, i * 0.1);
    }
    crescent(c, 0, 0.12, 0.16, 0.22, -Math.PI, 0, st.deep, 0.03);
  },
  // Stormcall — the appointment, kept from above.
  stormcall: (st) => (c) => {
    c.translate(0.5, 0.46);
    puff(c, -0.16, -0.26, 0.14, st.deep);
    puff(c, 0.08, -0.3, 0.16, st.deep);
    puff(c, 0.26, -0.24, 0.11, st.deep);
    bolt(c, -0.08, 0.06, 0.8, st, 0.3);
    bolt(c, 0.22, 0.1, 0.55, st, 0.5);
    ground(c, 0.04, 0.34, st);
  },
  // Mirror Image — one of you is a rumor.
  mirror_image: (st) => (c) => {
    c.translate(0.5, 0.52);
    poly(c, st.mid, [[-0.3, 0.3], [-0.3, -0.06], [-0.2, -0.22], [-0.1, -0.06], [-0.1, 0.3]], 0.034);
    dot(c, st.core, -0.2, -0.26, 0.09);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.026;
    c.setLineDash([0.045, 0.045]);
    c.beginPath();
    c.moveTo(0.12, 0.3);
    c.lineTo(0.12, -0.06);
    c.lineTo(0.22, -0.22);
    c.lineTo(0.32, -0.06);
    c.lineTo(0.32, 0.3);
    c.stroke();
    c.beginPath();
    c.arc(0.22, -0.26, 0.09, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    star4(c, 0.02, -0.38, 0.08, st.spark);
  },
  // Daybreak — noon, delivered to the address you chose.
  daybreak: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.24, st);
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.034;
    c.beginPath();
    c.arc(0, 0.1, 0.24, Math.PI, 0);
    c.closePath();
    c.fill();
    c.stroke();
    crescent(c, 0, 0.1, 0.15, 0.2, -Math.PI, 0, st.core, 0.02);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.036;
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.3, 0.1 + Math.sin(a) * 0.3);
      c.lineTo(Math.cos(a) * 0.42, 0.1 + Math.sin(a) * 0.42);
      c.stroke();
    }
  },
  // Ghost Step — you pass; the wound stays.
  ghost_step: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.028;
    c.setLineDash([0.04, 0.05]);
    c.beginPath();
    c.moveTo(-0.28, 0.3);
    c.lineTo(-0.28, -0.04);
    c.lineTo(-0.18, -0.2);
    c.lineTo(-0.08, -0.04);
    c.lineTo(-0.08, 0.3);
    c.stroke();
    c.setLineDash([]);
    chevrons(c, 0.1, 0.05, 0, st, 2, 0.9);
    dagger(c, 0.3, -0.12, 0.5, 0.5, st);
    droplet(c, 0.32, 0.24, 0.7, st);
  },
  // Caltrops — iron teeth, sown where feet argue.
  caltrops: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.3, st);
    for (const [x, y, s] of [[-0.22, 0.02, 1], [0.14, -0.08, 0.85], [0.06, 0.22, 0.9]] as const) {
      thorn(c, x, y, -Math.PI / 2, s, st.mid);
      thorn(c, x - 0.07, y + 0.08, Math.PI * 0.8, s * 0.7, st.deep);
      thorn(c, x + 0.07, y + 0.08, Math.PI * 0.2, s * 0.7, st.deep);
      dot(c, st.core, x, y + 0.03, 0.028);
    }
  },
  // Fan of Knives — every direction at once.
  fan_of_knives: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      dagger(c, Math.cos(a) * 0.26, Math.sin(a) * 0.26, a + Math.PI / 2, 0.52, st);
    }
    ringDot(c, st.deep, 0, 0, 0.08, 0.03);
    dot(c, st.core, 0, 0, 0.035);
  },
  // Feint Double — the lie you leave standing.
  feint_double: (st) => (c) => {
    c.translate(0.5, 0.52);
    poly(c, st.deep, [[-0.26, 0.3], [-0.26, -0.02], [-0.14, -0.2], [-0.02, -0.02], [-0.02, 0.3]], 0.034);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.026;
    c.setLineDash([0.04, 0.05]);
    c.beginPath();
    c.moveTo(0.08, 0.3);
    c.lineTo(0.08, -0.02);
    c.lineTo(0.2, -0.2);
    c.lineTo(0.32, -0.02);
    c.lineTo(0.32, 0.3);
    c.stroke();
    c.setLineDash([]);
    chevrons(c, -0.36, -0.32, Math.PI, st, 2, 0.7);
  },
  // Exposing Strike — the seam, made official.
  exposing_strike: (st) => (c) => {
    c.translate(0.5, 0.5);
    ringDot(c, st.deep, 0, 0.02, 0.3, 0.04);
    c.strokeStyle = st.core;
    c.lineWidth = 0.045;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.06, -0.24);
    c.lineTo(0.04, -0.04);
    c.lineTo(-0.04, 0.1);
    c.lineTo(0.06, 0.28);
    c.stroke();
    dagger(c, 0.3, -0.3, Math.PI * 0.75, 0.5, st);
    star4(c, 0.05, -0.05, 0.09, st.spark, Math.PI / 4);
  },
  // Thousand Cuts — stop counting.
  thousand_cuts: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.04;
    c.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r0 = 0.18 + (i % 3) * 0.07;
      c.beginPath();
      c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      c.lineTo(Math.cos(a + 0.5) * (r0 + 0.14), Math.sin(a + 0.5) * (r0 + 0.14));
      c.stroke();
    }
    dagger(c, 0, 0, Math.PI / 5, 0.6, st);
    droplet(c, -0.3, -0.28, 0.6, st);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ------------------------- THE UNWRITTEN PAGE — deed-earned arts
Object.assign(PLATES, {
  // Riftwalker Step — through the tear, out the far side of them.
  riftwalker_step: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The rift: a tall torn slit, dark heart, bright lip.
    poly(c, st.deep, [[-0.02, -0.36], [0.1, -0.1], [0.02, 0.34], [-0.1, 0.06]], 0.034);
    fill(c, st.mid, [[-0.01, -0.3], [0.06, -0.08], [0.0, 0.28], [-0.06, 0.04]]);
    chevrons(c, -0.34, 0, 0, st, 2, 1);
    star4(c, 0.3, -0.16, 0.1, st.spark, Math.PI / 4);
    star4(c, 0.34, 0.14, 0.06, st.core);
  },
  // Oathbound Edge — the crown remembers the sworn blade.
  oathbound_edge: (st) => (c) => {
    c.translate(0.5, 0.52);
    haloArcs(c, 0, -0.1, st);
    blade(c, 0, 0.06, 0.62, -Math.PI / 2, st);
    crown(c, 0, -0.38, 0.24, st.mid, st.core);
  },
  // Warden's Volley — the wall-top answer.
  warden_volley: (st) => (c) => {
    c.translate(0.5, 0.56);
    // The parapet: a crenellated line the shafts rise from.
    poly(c, st.deep, [[-0.42, 0.3], [-0.42, 0.16], [-0.3, 0.16], [-0.3, 0.24], [-0.14, 0.24], [-0.14, 0.16], [0.02, 0.16], [0.02, 0.24], [0.18, 0.24], [0.18, 0.16], [0.3, 0.16], [0.3, 0.24], [0.42, 0.24], [0.42, 0.3]], 0.03);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.34;
      arrow(c, (i - 1.5) * 0.17, 0.02, a, 0.44, st, 0.9);
    }
  },
  // Whisper Fang — one fang, softly spoken.
  whisper_fang: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.globalAlpha = 0.55;
    crescent(c, -0.22, 0, 0.16, 0.2, -1.1, 1.1, st.spark, 0.024);
    crescent(c, -0.22, 0, 0.26, 0.3, -0.9, 0.9, st.spark, 0.022);
    c.globalAlpha = 1;
    // The fang: a single curved dark canine, mid-flight.
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(-0.1, -0.1);
    c.quadraticCurveTo(0.18, -0.16, 0.36, -0.02);
    c.quadraticCurveTo(0.14, 0.0, -0.06, 0.08);
    c.closePath();
    c.fill();
    c.stroke();
    fill(c, st.core, [[-0.06, -0.08], [0.14, -0.11], [0.26, -0.03], [-0.04, -0.02]]);
    droplet(c, 0.3, 0.24, 0.7, st);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ------------------------------- THE SHIELD SKILL — the wall's plates
Object.assign(PLATES, {
  // Shield Bash — the face of the wall meeting a jaw: impact star at
  // the leading rim, arc crescents telling the swing.
  shield_bash: (st) => (c) => {
    c.translate(0.46, 0.5);
    crescent(c, 0.06, 0, 0.4, 0.46, -0.9, 0.7, st.spark, 0.026);
    shieldFace(c, -0.04, 0, 0.9, st, 0.22);
    star4(c, 0.32, -0.12, 0.12, st.core, Math.PI / 4);
    star4(c, 0.36, 0.1, 0.07, st.spark);
  },
  // Set the Wall — the planted stance: the shield square-on over a
  // base line, halo arcs rising off the held ground.
  set_the_wall: (st) => (c) => {
    c.translate(0.5, 0.5);
    haloArcs(c, 0, -0.06, st);
    poly(c, st.deep, [[-0.4, 0.4], [0.4, 0.4], [0.4, 0.34], [-0.4, 0.34]], 0.028);
    shieldFace(c, 0, 0.0, 1.0, st);
  },
  // Shield Rush — boss-first drive: chevrons behind, the wall tilted
  // into the road.
  shield_rush: (st) => (c) => {
    c.translate(0.54, 0.5);
    chevrons(c, -0.36, 0.02, 0, st, 2, 1.1);
    shieldFace(c, 0.06, 0, 0.94, st, Math.PI / 2 - 0.35);
  },
  // Draw Iron — the challenge: a jagged ring leaving the shield, the
  // crown of the yard's attention above it.
  draw_iron: (st) => (c) => {
    c.translate(0.5, 0.54);
    novaRing(c, 0, -0.02, 0.42, st, 12, 0.24, 0.04);
    shieldFace(c, 0, 0.02, 0.72, st);
    crown(c, 0, -0.34, 0.26, st.mid, st.core);
    star4(c, -0.34, 0.18, 0.06, st.spark);
  },
  // Shield Roof — the sky pulled to arm's reach: the wall overhead,
  // blows raining and shearing off it.
  shield_roof: (st) => (c) => {
    c.translate(0.5, 0.56);
    // The roof: the shield seen edge-on above, a wide lit plank.
    poly(c, st.deep, [[-0.42, -0.26], [0.42, -0.26], [0.36, -0.12], [-0.36, -0.12]], 0.04);
    fill(c, st.core, [[-0.38, -0.24], [0.38, -0.24], [0.34, -0.19], [-0.34, -0.19]]);
    dot(c, st.spark, 0, -0.19, 0.05);
    // What it sheds.
    for (const [x, a] of [[-0.3, 2.6], [0.02, 3.0], [0.32, 0.5]] as const) {
      chevrons(c, x, -0.4, a + Math.PI / 2, st, 1, 0.7);
    }
    // Who it keeps: the figure-post beneath, dry.
    poly(c, st.mid, [[-0.05, -0.06], [0.05, -0.06], [0.05, 0.34], [-0.05, 0.34]], 0.03);
    dot(c, st.core, 0, -0.14, 0.08);
  },
  // Turned Blow — the angle that answers: a blow arriving, and the
  // same blow leaving by the door it came through.
  turned_blow: (st) => (c) => {
    c.translate(0.52, 0.5);
    shieldFace(c, 0.08, 0, 0.9, st, -0.3);
    // In: a dark chevron. Out: a bright one, mirrored off the face.
    chevrons(c, -0.38, -0.18, 0.5, st, 1, 0.9);
    c.save();
    c.globalAlpha = 0.9;
    chevrons(c, -0.34, 0.24, -2.6, st, 1, 0.9);
    c.restore();
    star4(c, -0.06, -0.02, 0.1, st.spark, Math.PI / 4);
  },
  // Rampart Break — the rim driven into the earth: ground ellipse,
  // fissures, the shield half-buried and standing anyway.
  rampart_break: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.4, st);
    for (const [a, len] of [[0.3, 0.34], [1.4, 0.3], [2.4, 0.36], [-2.2, 0.3]] as const) {
      c.strokeStyle = st.deep;
      c.lineWidth = 0.03;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.12, 0.22 + Math.sin(a) * 0.05);
      c.lineTo(Math.cos(a) * len, 0.22 + Math.sin(a) * len * 0.22);
      c.stroke();
    }
    shieldFace(c, 0, -0.08, 0.86, st);
    star4(c, 0.26, 0.2, 0.08, st.spark);
    star4(c, -0.28, 0.24, 0.06, st.core);
  },
  // Wheel of Iron — the thrown wall, mid-spin, the return arc already
  // written behind it.
  wheel_of_iron: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0, 0.38, 0.44, 0.6, 2.6, st.spark, 0.024);
    crescent(c, 0, 0, 0.38, 0.44, -2.4, -1.2, st.spark, 0.02);
    shieldFace(c, 0, 0, 0.88, st, 0.9);
    chevrons(c, 0.34, -0.28, -0.6, st, 1, 0.7);
  },
  // Hold the Line — the kept yard: a field patch, the wall upright on
  // its line, and the line itself refusing.
  hold_the_line: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.42, st);
    poly(c, st.deep, [[-0.42, 0.1], [-0.14, 0.1], [-0.14, 0.16], [-0.42, 0.16]], 0.026);
    poly(c, st.deep, [[0.14, 0.1], [0.42, 0.1], [0.42, 0.16], [0.14, 0.16]], 0.026);
    shieldFace(c, 0, -0.04, 0.84, st);
  },
  // Unbroken — the great stand: the wall wearing the light, rays of
  // the stand behind it.
  unbroken: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
      c.lineTo(Math.cos(a) * 0.46, Math.sin(a) * 0.46);
      c.stroke();
    }
    shieldFace(c, 0, 0.02, 0.96, st);
    haloArcs(c, 0, -0.3, st);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ---------------------------------------------- sigils & npc specials
Object.assign(PLATES, {
  // Champion's Wall — the trophy wall ringing: echo rings, the crown
  // it was carried under, the bone it was won from.
  champions_wall: (st) => (c) => {
    c.translate(0.5, 0.52);
    novaRing(c, 0, 0, 0.44, st, 12, 0.2, 0.032);
    novaRing(c, 0, 0, 0.32, st, 10, 0.2, 0.026);
    shieldFace(c, 0, 0.02, 0.78, st);
    crown(c, 0, -0.36, 0.24, st.mid, st.core);
  },
  // Bone Tempest — the fallen champion answers: the trophy skull inside
  // its own grinding weather.
  bone_tempest: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Three wheeling bone-wave arcs.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.055;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const rot = (i / 3) * Math.PI * 2 + 0.4;
      c.beginPath();
      c.arc(0, 0, 0.4, rot, rot + 1.4);
      c.stroke();
    }
    // Shards riding the wind.
    for (const [x, y, a] of [[-0.36, -0.22, 0.4], [0.38, -0.14, -0.5], [0.28, 0.32, 0.9]] as const) {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      poly(c, st.core, [[-0.07, -0.025], [0.07, 0], [-0.07, 0.025]], 0.02);
      c.restore();
    }
    skull(c, 0, 0.01, 0.52, st.mid, st.deep);
  },
  // Ground Slam — the champion brings the floor up with it. (NPC
  // special: seen in the bestiary and staging tools, never a hotbar.)
  ground_slam: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.36, st);
    // The champion's blade driven in to the guard, floor coming up in
    // broken plates around it.
    blade(c, 0, -0.12, 0.6, Math.PI / 2, st);
    poly(c, st.mid, [[-0.32, 0.0], [-0.2, -0.14], [-0.12, 0.06], [-0.26, 0.12]], 0.028);
    poly(c, st.mid, [[0.14, -0.1], [0.28, -0.02], [0.24, 0.14], [0.12, 0.04]], 0.028);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    for (const [x1, y1] of [[-0.34, 0.22], [0.34, 0.2]] as const) {
      c.beginPath();
      c.moveTo(0, 0.1);
      c.lineTo(x1, y1);
      c.stroke();
    }
  },
  // Rallying Howl — the matriarch's head thrown back, the call rolling
  // out in rings. (NPC special: bestiary and staging tools only.)
  rallying_howl: (st) => (c) => {
    c.translate(0.5, 0.56);
    // The howl rings, spreading up and out from the raised muzzle.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    for (const [r, w] of [[0.22, 0.05], [0.33, 0.04], [0.44, 0.032]] as const) {
      c.lineWidth = w;
      c.beginPath();
      c.arc(0.1, -0.12, r, -2.2, -0.9);
      c.stroke();
    }
    // Wolf head in profile, muzzle to the sky: skull wedge, thrown-back
    // ear, the throat line dropping to a chest hint.
    c.fillStyle = st.deep;
    c.strokeStyle = st.core;
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(0.14, -0.22); // muzzle tip, raised
    c.lineTo(-0.02, -0.1); // jawline down
    c.lineTo(-0.08, 0.08); // throat
    c.quadraticCurveTo(-0.1, 0.3, -0.3, 0.38); // chest fall-away
    c.lineTo(-0.34, 0.12); // back of shoulder
    c.lineTo(-0.26, -0.02); // nape
    c.lineTo(-0.3, -0.2); // ear pinned back
    c.lineTo(-0.16, -0.12); // skull crown
    c.closePath();
    c.fill();
    c.stroke();
    // The ember eye — the champion tier reads through it.
    dot(c, '#ff9a3d', -0.15, -0.07, 0.032);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ------------------------------------------------------------ lookup

/** Data URL for an ability's spell-plate at `size`. */
export function abilityIconUrl(id: string, size = 64): string {
  const st = fxStyleFor(id, undefined);
  const make = PLATES[id];
  const painter: Painter = make
    ? make(st)
    : (c) => {
        // Unknown ability: loud fallback — a rune-marked blank plate so
        // a missing mapping is caught in review, never shipped quietly.
        c.translate(0.5, 0.5);
        ringDot(c, st.mid, 0, 0, 0.34, 0.05);
        dot(c, st.deep, 0, 0, 0.2);
        star4(c, 0, 0, 0.12, st.core);
      };
  return paintedIconUrl(`ability:${id}`, painter, st.mid, size);
}

/** Data URL for a gear passive's chip icon. */
export function passiveIconUrl(id: string, size = 30): string {
  const meta = PASSIVES[id as keyof typeof PASSIVES];
  const st = fxStyleFor(undefined, meta?.color);
  const make = PASSIVE_PLATES[id];
  const painter: Painter = make ? make(st) : (c) => {
    c.translate(0.5, 0.5);
    ringDot(c, st.mid, 0, 0, 0.3, 0.05);
  };
  return paintedIconUrl(`passive:${id}`, painter, meta?.color ?? '#888', size);
}

/** Every ability id with a bespoke plate — the dev gallery walks this. */
export function allAbilityIconIds(): string[] {
  return Object.keys(PLATES);
}

/** Every passive id — the dev gallery walks this. */
export function allPassiveIconIds(): string[] {
  return Object.keys(PASSIVE_PLATES);
}

// ---------------------------------------------------- passive plates

/**
 * Passive chips live at 30 px — each plate is ONE emblem, two colors,
 * no scene. The quiet half of the build stays quiet.
 */
const PASSIVE_PLATES: Record<string, (st: FxStyle) => Painter> = {
  // Thorns — the answering barb: a ring of thorns around the point of contact.
  thorns: (st) => (c) => {
    c.translate(0.5, 0.5);
    ringDot(c, st.deep, 0, 0, 0.16, 0.036);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      thorn(c, Math.cos(a) * 0.3, Math.sin(a) * 0.3, a + Math.PI / 2, 0.36, st.mid);
    }
  },
  // Biting Draw — the chilled arrowhead at full draw.
  chill_charged: (st) => (c) => {
    c.translate(0.5, 0.5);
    snowflake(c, -0.12, -0.12, 0.24, st.mid, 0.045);
    arrow(c, 0.05, 0.08, Math.PI / 4, 0.8, st, 1.15);
  },
  // Ember Bolt — the third bolt burns: a shaft wearing a flame.
  ember_bolt: (st) => (c) => {
    c.translate(0.5, 0.5);
    arrow(c, 0, 0.1, -Math.PI / 4, 0.8, st, 1.1);
    flame(c, 0.2, -0.2, 0.45, st, 0.1);
  },
  // Wolf Reflexes — the dodge afterimage: chevrons snapping sideways.
  dodge_haste: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, 0.22, 0, 0, st, 3, 1.5);
    star4(c, -0.28, -0.24, 0.08, st.spark);
  },
  // Fleet Footed — the winged stride: a boot sole with a wind vane.
  fleet_footed: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.mid, [[-0.3, 0.14], [0.06, 0.14], [0.3, 0.02], [0.32, 0.14], [0.3, 0.26], [-0.3, 0.26]], 0.04);
    fill(c, st.core, [[-0.28, 0.16], [0.04, 0.16], [0.2, 0.09], [-0.28, 0.2]]);
    // The vane: three wind feathers off the heel.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    for (const [y, l] of [[-0.16, 0.34], [-0.02, 0.26]] as const) {
      c.beginPath();
      c.moveTo(-0.34, y);
      c.lineTo(-0.34 + l, y);
      c.stroke();
    }
  },
  // Second Wind — the heart catches: a heart with wind swashes.
  second_wind: (st) => (c) => {
    c.translate(0.5, 0.52);
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(0, 0.3);
    c.bezierCurveTo(-0.42, 0.0, -0.3, -0.32, -0.02, -0.12);
    c.bezierCurveTo(0.26, -0.32, 0.4, 0.0, 0, 0.3);
    c.fill();
    c.stroke();
    dot(c, st.core, -0.12, -0.08, 0.06);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.045;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.14, -0.32);
    c.quadraticCurveTo(0.3, -0.4, 0.42, -0.3);
    c.stroke();
  },
  // Battle Rush — the kill-surge: a burst star running on chevrons.
  battle_rush: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.18, 0.02, Math.PI, st, 2, 1.3);
    star4(c, 0.16, -0.02, 0.24, st.mid);
    star4(c, 0.16, -0.02, 0.12, st.core, Math.PI / 4);
  },
};
