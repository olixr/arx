import { PASSIVES } from '@arx/shared';
import { burstStarPath, fxStyleFor, jaggedRingPath, type FxStyle } from './abilityFx.js';
import { paintedIconUrl, paintedIconUrlIfBaked, queueIconTask } from './icons.js';
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

/**
 * The colossus's silhouette — a greatblade drawn along +x: broad body,
 * one lit edge plane, a wide crossguard and a grip LONG enough for two
 * fists (the length of the handle is what says "two-handed" at plate
 * size). The whole great school speaks through this one shape.
 */
/**
 * The double-headed greataxe glyph — THE ARMORY's second silhouette.
 * A war haft with twin mirrored bits flaring off the crown and a
 * finishing spike past them; the two heads are the icon's whole
 * argument that this is the axe school, not the blade.
 */
function greataxe(c: Ctx, x: number, y: number, len: number, st: FxStyle, ang = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const h = len / 2;
  // The war haft, butt-weighted like the greatblade's grip.
  c.fillStyle = '#5b4028';
  c.fillRect(-h, -0.032, h * 1.86, 0.064);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.024;
  c.strokeRect(-h, -0.032, h * 1.86, 0.064);
  // Twin bits: mirrored wedges flaring wide of the crown.
  const cx = h * 0.56;
  poly(c, st.mid, [[cx - 0.08, -0.05], [cx - 0.15, -0.28], [cx + 0.21, -0.3], [cx + 0.12, -0.05]], 0.03);
  poly(c, st.mid, [[cx - 0.08, 0.05], [cx - 0.15, 0.28], [cx + 0.21, 0.3], [cx + 0.12, 0.05]], 0.03);
  // One lit facet on the upper bit — the sun law at plate scale.
  fill(c, st.core, [[cx - 0.15, -0.28], [cx + 0.21, -0.3], [cx + 0.15, -0.19], [cx - 0.13, -0.18]]);
  // The finishing spike past the crown.
  poly(c, st.mid, [[h * 0.84, -0.04], [h * 1.1, 0], [h * 0.84, 0.04]], 0.026);
  c.restore();
}

function greatblade(c: Ctx, x: number, y: number, len: number, st: FxStyle, ang = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const h = len / 2;
  // Blade: broader than the arming blade, a blunt-shouldered taper.
  poly(c, st.mid, [
    [-h * 0.3, -0.075], [h * 0.7, -0.075], [h, 0], [h * 0.7, 0.075], [-h * 0.3, 0.075],
  ], 0.032);
  fill(c, st.core, [[-h * 0.27, -0.06], [h * 0.66, -0.06], [h * 0.88, -0.005], [-h * 0.27, -0.005]]);
  // The wide crossguard.
  c.fillStyle = shade('#5b4028', 30);
  c.fillRect(-h * 0.34, -0.13, 0.05, 0.26);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.024;
  c.strokeRect(-h * 0.34, -0.13, 0.05, 0.26);
  // The two-fist grip, pommel-weighted.
  c.fillStyle = '#5b4028';
  c.fillRect(-h * 0.86, -0.04, h * 0.5, 0.08);
  c.strokeRect(-h * 0.86, -0.04, h * 0.5, 0.08);
  dot(c, st.mid, -h * 0.9, 0, 0.045);
  c.restore();
}

/**
 * The veteran's silhouette — a clenched fist, knuckles leading. The
 * combat school owns no weapon, so the empty hand IS its glyph: every
 * plate in the ladder keeps it in frame, the way the twin plates keep
 * their crossed pair.
 *
 * Rebuilt for the 42px read: the knuckles SCALLOP the leading edge
 * (three rolled bumps — the fist's own skyline, the thing no blob
 * has), a wide lit top plane, a deep under-shadow, the thumb folded
 * across the near side, and one brass wrist band — the school's
 * single note of polish. Everything else stays big and blunt.
 */
function fist(c: Ctx, x: number, y: number, s: number, st: FxStyle, ang = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  // A short wrist stub — enough to say "arm", never enough to read as
  // a vessel's base when the fist stands upright.
  poly(c, '#6a4a30', [[-0.52, -0.1], [-0.3, -0.13], [-0.3, 0.13], [-0.52, 0.1]], 0.042);
  // Brass wrist band — thin, the school's one note of polish.
  c.fillStyle = '#c89440';
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.034;
  c.fillRect(-0.37, -0.15, 0.065, 0.3);
  c.strokeRect(-0.37, -0.15, 0.065, 0.3);
  // The mitt: one blunt mass, three knuckles rolling the leading edge.
  c.fillStyle = st.mid;
  c.lineWidth = 0.05;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-0.33, -0.26);
  c.lineTo(0.06, -0.3);
  c.lineTo(0.17, -0.29);
  c.arc(0.27, -0.21, 0.12, -1.3, 1.0);
  c.arc(0.3, 0.0, 0.12, -1.35, 1.15);
  c.arc(0.26, 0.19, 0.115, -1.2, 1.35);
  c.lineTo(0.12, 0.32);
  c.lineTo(-0.33, 0.3);
  c.closePath();
  c.fill();
  c.stroke();
  // The lit top plane — the sun law at plate scale.
  fill(c, st.core, [[-0.31, -0.22], [0.08, -0.26], [0.26, -0.2], [0.3, -0.13], [-0.31, -0.08]]);
  // Deep under-shadow seats the mass.
  fill(c, st.deep, [[-0.31, 0.21], [0.12, 0.24], [0.06, 0.3], [-0.31, 0.28]]);
  // Knuckle seams between the bumps.
  c.strokeStyle = st.deep;
  c.lineWidth = 0.032;
  c.lineCap = 'round';
  for (const ky of [-0.1, 0.1]) {
    c.beginPath();
    c.moveTo(0.34, ky);
    c.lineTo(0.2, ky + 0.02);
    c.stroke();
  }
  // The folded thumb crossing the near side, its own lit facet.
  poly(c, st.mid, [[-0.04, 0.1], [0.2, 0.07], [0.3, 0.18], [0.16, 0.31], [-0.06, 0.3]], 0.042);
  fill(c, st.core, [[-0.01, 0.13], [0.18, 0.1], [0.22, 0.16], [0.02, 0.19]]);
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

  // ------------------------------------- the ten crowns, sword arts
  // Drag Under — the wave takes its turn: a saber pulled beneath a
  // breaking crest, rings still leaving the water.
  drag_under: (st) => (c) => {
    c.translate(0.5, 0.5);
    blade(c, 0.04, 0.08, 0.72, -Math.PI / 2.4, st);
    crescent(c, -0.06, -0.1, 0.3, 0.2, Math.PI * 1.05, Math.PI * 1.95, st.mid, 0.05);
    crescent(c, 0, 0.12, 0.34, 0.26, Math.PI * 0.1, Math.PI * 0.9, st.core, 0.035);
    crescent(c, 0, 0.2, 0.42, 0.34, Math.PI * 0.15, Math.PI * 0.85, st.deep, 0.03);
    dot(c, st.core, -0.24, -0.2, 0.035);
    dot(c, st.spark, -0.3, -0.06, 0.025);
  },
  // Spoken Light — the word goes white: the rune slab mid-sentence,
  // script flaring off it as rays.
  spoken_light: (st) => (c) => {
    c.translate(0.5, 0.52);
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.42;
      poly(c, st.mid, [[Math.cos(a) * 0.18, Math.sin(a) * 0.18], [Math.cos(a) * 0.42, Math.sin(a) * 0.42]], 0.028);
    }
    blade(c, 0, 0.05, 0.82, -Math.PI / 2, st);
    // The script: three lit ticks marching the flat.
    for (let i = 0; i < 3; i++) {
      poly(c, st.core, [[-0.035, -0.05 - i * 0.11], [0.035, -0.09 - i * 0.11]], 0.03);
    }
    star4(c, 0, -0.4, 0.07, st.core);
  },
  // Slagfall — the maw spits: a molten gob mid-drop over the scorched
  // patch, coals riding the splash.
  slagfall: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    droplet(c, 0, -0.16, 0.55, st);
    dot(c, st.spark, -0.2, 0.1, 0.04);
    dot(c, st.spark, 0.22, 0.06, 0.032);
    dot(c, st.core, 0.1, -0.34, 0.028);
    // The rim of the patch cracks hot.
    crescent(c, 0, 0.12, 0.3, 0.24, Math.PI * 0.15, Math.PI * 0.85, st.core, 0.03);
  },
  // The Sky Splits — the gap opens: twin tines and the bolt jumping
  // the notch on its way down the line.
  sky_splits: (st) => (c) => {
    c.translate(0.5, 0.52);
    // The two tines.
    fill(c, st.mid, [[-0.07, 0.34], [-0.12, -0.3], [-0.04, -0.42], [-0.02, 0.34]]);
    fill(c, st.mid, [[0.03, 0.34], [0.05, -0.38], [0.12, -0.26], [0.08, 0.34]]);
    poly(c, st.core, [[-0.1, -0.26], [-0.05, -0.38]], 0.026);
    // The bolt visiting across the gap.
    bolt(c, 0, -0.1, 0.9, st, 0.5);
    dot(c, st.core, 0.09, -0.32, 0.035);
  },
  // Green Verse — the song closes: the jade curve mid-dash, the coil
  // and the wake of the bar it crossed.
  green_verse: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.26, 0.08, 0, st, 2, 0.9);
    blade(c, 0.1, 0.02, 0.7, -Math.PI / 2.8, st);
    // The serpent coil at the hilt.
    c.strokeStyle = st.spark;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(-0.12, 0.26, 0.09, Math.PI * 0.2, Math.PI * 1.4);
    c.stroke();
    poly(c, st.spark, [[-0.05, 0.14], [0.05, 0.1], [-0.01, 0.22]], 0.026);
    droplet(c, 0.3, 0.24, 0.26, st);
  },
  // Sun Court — court convenes: the gold flare-blade upright under
  // the crown, rays holding session.
  sun_court: (st) => (c) => {
    c.translate(0.5, 0.52);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      poly(c, st.mid, [[Math.cos(a) * 0.24, Math.sin(a) * 0.24], [Math.cos(a) * 0.44, Math.sin(a) * 0.44]], 0.026);
    }
    blade(c, 0, 0.06, 0.78, -Math.PI / 2, st);
    // The basal flares: the throne wings.
    fill(c, st.spark, [[-0.03, 0.1], [-0.16, 0.02], [-0.05, 0.02]]);
    fill(c, st.spark, [[0.03, 0.1], [0.16, 0.02], [0.05, 0.02]]);
    crown(c, 0, -0.42, 0.22, st.spark, st.core);
  },
  // Still Air — nothing moves: the crystal shard in a held breath,
  // one ring of stopped air and the frost star.
  still_air: (st) => (c) => {
    c.translate(0.5, 0.52);
    ringDot(c, st.deep, 0, 0.02, 0.4, 0.026);
    fill(c, st.mid, [[-0.05, 0.32], [-0.1, -0.14], [-0.02, -0.44], [0.08, -0.1], [0.05, 0.32]]);
    poly(c, st.core, [[-0.02, -0.42], [-0.01, 0.3]], 0.024);
    snowflake(c, 0.26, -0.26, 0.09, st.spark, 0.035);
    snowflake(c, -0.28, 0.16, 0.06, st.mid, 0.03);
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

  // ------------------------------------- the ten crowns, knife arts
  // The Garden Closes — petals from every direction, and the petal
  // that cuts standing in the middle of them.
  garden_close: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * 0.32;
      const py = Math.sin(a) * 0.32;
      c.save();
      c.translate(px, py);
      c.rotate(a + Math.PI / 2);
      fill(c, st.spark, [[0, -0.09], [0.05, 0], [0, 0.09], [-0.05, 0]]);
      c.restore();
    }
    dagger(c, 0, 0.04, 0.7, -Math.PI / 2, st);
    dot(c, st.core, 0, -0.3, 0.035);
  },
  // Beak First — the short way to the purse: the hooked beak mid-dash
  // and the two counting glints.
  beak_first: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.28, 0.1, 0, st, 2, 0.9);
    // The beak: a hooked black claw, brass ring at the butt.
    fill(c, st.mid, [[-0.08, -0.02], [0.3, -0.1], [0.34, 0.12], [0.12, 0.1]]);
    poly(c, st.core, [[0.28, -0.06], [0.33, 0.1]], 0.028);
    ringDot(c, st.spark, -0.14, 0, 0.06, 0.035);
    star4(c, 0.18, -0.24, 0.05, st.spark);
    star4(c, 0.38, 0.26, 0.04, st.spark, Math.PI / 4);
  },
  // Pale Lantern — the grave-light comes up: the bone needle burning
  // green at the heart, wisps making their rounds.
  pale_lantern: (st) => (c) => {
    c.translate(0.5, 0.52);
    haloArcs(c, 0, 0.08, st);
    dagger(c, 0, 0.02, 0.78, -Math.PI / 2, st);
    poly(c, st.mid, [[0, -0.3], [0, 0.14]], 0.024);
    puff(c, -0.26, -0.14, 0.05, st.mid);
    puff(c, 0.28, -0.02, 0.04, st.mid);
    dot(c, st.core, 0, -0.34, 0.03);
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
  // Arcane Ring — raw Arx snapped outward: rune ring, echo behind.
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

// -------------------------------------- the ten voices, staff arts
Object.assign(PLATES, {
  // Wildroot — the ground remembers being forest: root spears up
  // through the patch, one leaf already unpacking.
  wild_root: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    for (const [x, h, w] of [[-0.18, 0.3, 0.05], [0.02, 0.44, 0.06], [0.2, 0.24, 0.045]] as const) {
      fill(c, st.mid, [[x - w, 0.1], [x - w * 0.3, -h], [x + w * 0.3, -h + 0.06], [x + w, 0.1]]);
      poly(c, st.core, [[x - w * 0.3, -h], [x - w * 0.2, 0.04]], 0.024);
    }
    fill(c, st.spark, [[0.02, -0.44], [0.14, -0.52], [0.16, -0.42], [0.06, -0.38]]);
    dot(c, st.core, -0.26, -0.18, 0.03);
  },
  // The Day Breaks — dawn in a straight line: the gold corridor and
  // the halo it was poured from.
  day_breaks: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.22);
    poly(c, st.mid, [[-0.46, -0.09], [0.44, -0.09]], 0.03);
    poly(c, st.mid, [[-0.46, 0.09], [0.44, 0.09]], 0.03);
    fill(c, st.core, [[-0.44, -0.05], [0.42, -0.05], [0.42, 0.05], [-0.44, 0.05]]);
    ringDot(c, st.spark, -0.34, -0.26, 0.1, 0.03);
    star4(c, 0.3, -0.24, 0.06, st.spark);
    star4(c, 0.05, 0.26, 0.05, st.core, Math.PI / 4);
  },
  // Moonfall — the borrowed moon arrives: the disc mid-drop, cold
  // rings already spreading on the ground it picked.
  moonfall: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    dot(c, st.core, 0.02, -0.2, 0.17);
    crescent(c, 0.02, -0.2, 0.17, 0.22, Math.PI * 0.6, Math.PI * 1.5, st.mid, 0.03);
    dot(c, st.deep, 0.08, -0.26, 0.035);
    dot(c, st.deep, -0.04, -0.14, 0.026);
    chevrons(c, 0.02, 0.06, Math.PI / 2, st, 2, 0.7);
    snowflake(c, -0.3, -0.34, 0.07, st.spark, 0.03);
  },
  // Shearwind — one coil comes off the spindle and the crowd
  // rearranges itself: the spiral, unwinding outward.
  shearwind: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.055;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(0, 0, 0.14 + i * 0.13, i * 1.8, i * 1.8 + 2.4 - i * 0.3);
      c.stroke();
    }
    c.strokeStyle = st.core;
    c.lineWidth = 0.035;
    c.beginPath();
    c.arc(0, 0, 0.2, 2.4, 4.2);
    c.stroke();
    dot(c, st.spark, 0, 0, 0.06);
    chevrons(c, 0.32, -0.18, -0.5, st, 2, 0.7);
  },
  // The Molt — five feathers, five addresses: the fan mid-shed, one
  // quill already flying point-first.
  the_molt: (st) => (c) => {
    c.translate(0.5, 0.56);
    for (let k = -2; k <= 2; k++) {
      const a = -Math.PI / 2 + k * 0.38;
      const len = 0.34 - Math.abs(k) * 0.04;
      const tx = Math.cos(a) * len;
      const ty = Math.sin(a) * len;
      fill(c, st.mid, [
        [0, 0.1],
        [tx + Math.cos(a + 1.9) * 0.07, ty + Math.sin(a + 1.9) * 0.07],
        [tx * 1.22, ty * 1.22],
        [tx + Math.cos(a - 1.9) * 0.07, ty + Math.sin(a - 1.9) * 0.07],
      ]);
      dot(c, st.core, tx * 1.22, ty * 1.22, 0.028);
    }
    fill(c, st.deep, [[-0.05, 0.12], [0.05, 0.12], [0.05, 0.24], [-0.05, 0.24]]);
    dot(c, st.spark, 0, 0.18, 0.03);
    chevrons(c, 0.34, -0.3, -0.9, st, 2, 0.6);
  },
  // Hollowing — the hungry dark does the inviting: the hole, the
  // lean of everything near it.
  hollowing: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.fillStyle = st.deep;
    c.beginPath();
    c.arc(0, 0, 0.2, 0, Math.PI * 2);
    c.fill();
    ringDot(c, st.core, 0, 0, 0.22, 0.026);
    // Streaks leaning IN from the rim of the room.
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.5;
      poly(c, st.mid, [
        [Math.cos(a) * 0.44, Math.sin(a) * 0.44],
        [Math.cos(a + 0.2) * 0.26, Math.sin(a + 0.2) * 0.26],
      ], 0.032);
    }
    dot(c, st.spark, 0.07, -0.07, 0.025);
  },
  // Red Toll — the cup goes down the line: the chalice, and the
  // paying arcs arriving from both neighbors.
  red_toll: (st) => (c) => {
    c.translate(0.5, 0.52);
    // The cup: bowl, stem, foot.
    fill(c, st.mid, [[-0.16, -0.18], [0.16, -0.18], [0.1, 0.04], [-0.1, 0.04]]);
    fill(c, st.core, [[-0.12, -0.16], [0.12, -0.16], [0.08, -0.06], [-0.08, -0.06]]);
    poly(c, st.mid, [[0, 0.04], [0, 0.2]], 0.045);
    poly(c, st.mid, [[-0.1, 0.24], [0.1, 0.24]], 0.045);
    // The tribute, arcing in.
    crescent(c, -0.3, -0.3, 0.16, 0.2, -Math.PI * 0.2, Math.PI * 0.5, st.spark, 0.03);
    crescent(c, 0.3, -0.3, 0.16, 0.2, Math.PI * 0.5, Math.PI * 1.2, st.spark, 0.03);
    droplet(c, 0.02, -0.36, 0.22, st);
  },
  // Axiom — stated three times: the theorem rings, each restatement
  // wider, the keystone unmoved at the center.
  axiom: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (let i = 0; i < 3; i++) {
      const r = 0.14 + i * 0.13;
      const rot = i * 0.5;
      c.strokeStyle = i === 1 ? st.core : st.mid;
      c.lineWidth = 0.032;
      c.beginPath();
      for (let k = 0; k <= 4; k++) {
        const a = rot + (k / 4) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (k === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    dot(c, st.spark, 0, 0, 0.06);
    star4(c, 0.3, -0.32, 0.05, st.spark);
  },
  // Perihelion — closest pass, meaning here: the comet head down,
  // tail still arriving from the sky it left.
  perihelion: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    // Tail beads strung back up the fall line.
    dot(c, st.mid, 0.3, -0.44, 0.035);
    dot(c, st.mid, 0.2, -0.32, 0.045);
    poly(c, st.deep, [[0.34, -0.5], [0.02, -0.1]], 0.05);
    // The head, burning through.
    dot(c, st.core, 0.02, -0.12, 0.1);
    star4(c, 0.02, -0.12, 0.16, st.spark);
    crescent(c, 0, 0.08, 0.24, 0.18, Math.PI * 0.15, Math.PI * 0.85, st.core, 0.03);
    dot(c, st.spark, -0.28, -0.36, 0.028);
  },
  // Crownstorm — court convenes down the line: the crown, and the
  // bolt leaving it for the next head.
  crownstorm: (st) => (c) => {
    c.translate(0.5, 0.5);
    crown(c, 0, -0.2, 0.3, st.mid, st.core);
    bolt(c, -0.02, 0.12, 0.7, st, 0.45);
    dot(c, st.spark, -0.26, 0.3, 0.035);
    dot(c, st.spark, 0.28, 0.34, 0.028);
    star4(c, 0.3, -0.34, 0.05, st.spark);
  },

  // ------------------------------------- the ten flights, bow arts
  // Wakewood — the arrow takes root: the planted shaft, thorn runs
  // already claiming the ground around it.
  wakewood: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    // The shaft, planted at a landing lean, fletched.
    poly(c, st.deep, [[0.16, -0.4], [-0.02, 0.06]], 0.05);
    fill(c, st.core, [[0.16, -0.4], [0.26, -0.32], [0.1, -0.26]]);
    // Thorn runs crawling out from the strike.
    for (const [a0, a1] of [[-0.36, -0.14], [0.3, 0.12], [-0.1, 0.3]] as const) {
      poly(c, st.mid, [[-0.02, 0.06], [a0, 0.14], [a0 * 1.2, a1 * 0.4 + 0.18]], 0.036);
    }
    fill(c, st.mid, [[-0.3, 0.1], [-0.22, 0.02], [-0.18, 0.12]]);
    dot(c, st.spark, 0.24, 0.16, 0.03);
  },
  // Larkshot — dawn up the morning line: the beam lane, the sun
  // rising at the terminus.
  larkshot: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.22);
    poly(c, st.mid, [[-0.46, -0.08], [0.4, -0.08]], 0.028);
    poly(c, st.mid, [[-0.46, 0.08], [0.4, 0.08]], 0.028);
    fill(c, st.core, [[-0.44, -0.045], [0.38, -0.045], [0.38, 0.045], [-0.44, 0.045]]);
    // The lark's sun cresting at the far end.
    dot(c, st.spark, 0.42, 0, 0.09);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.5;
      poly(c, st.spark, [
        [0.42 + Math.cos(a) * 0.12, Math.sin(a) * 0.12],
        [0.42 + Math.cos(a) * 0.2, Math.sin(a) * 0.2],
      ], 0.026);
    }
    star4(c, -0.34, -0.26, 0.05, st.spark);
  },
  // Glasshail — the sky answers in splinters: six shards mid-fall,
  // frost already on the ground lane.
  glasshail: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    for (let k = -1; k <= 1; k++) {
      fill(c, st.core, [
        [k * 0.24 - 0.03, -0.34 + Math.abs(k) * 0.08],
        [k * 0.24 + 0.03, -0.36 + Math.abs(k) * 0.08],
        [k * 0.24 + 0.1, -0.06 + Math.abs(k) * 0.06],
      ]);
      fill(c, st.mid, [
        [k * 0.24 + 0.03, -0.36 + Math.abs(k) * 0.08],
        [k * 0.24 + 0.09, -0.3 + Math.abs(k) * 0.08],
        [k * 0.24 + 0.1, -0.06 + Math.abs(k) * 0.06],
      ]);
    }
    snowflake(c, -0.32, -0.3, 0.07, st.spark, 0.03);
    dot(c, st.spark, 0.3, 0.14, 0.028);
    star4(c, 0.06, 0.1, 0.05, st.spark);
  },
  // Stormskip — head to head like a stone across a pond: the bolt
  // skipping, rings where it touched.
  stormskip: (st) => (c) => {
    c.translate(0.5, 0.54);
    // Skip rings on the water it made of the crowd.
    for (const [x, r] of [[-0.26, 0.1], [0.04, 0.13], [0.32, 0.09]] as const) {
      c.strokeStyle = st.mid;
      c.lineWidth = 0.03;
      c.beginPath();
      c.ellipse(x, 0.16, r, r * 0.42, 0, 0, Math.PI * 2);
      c.stroke();
    }
    // The arrow's skipping line, arcing between them.
    crescent(c, -0.12, -0.1, 0.2, 0.14, Math.PI * 1.05, Math.PI * 1.95, st.core, 0.036);
    crescent(c, 0.2, -0.08, 0.16, 0.12, Math.PI * 1.05, Math.PI * 1.95, st.core, 0.036);
    fill(c, st.spark, [[0.34, -0.2], [0.42, -0.14], [0.32, -0.1]]);
    star4(c, -0.34, -0.3, 0.05, st.spark);
  },
  // Charfall — up an arrow, down a kiln: the burning fall, the
  // strike ring waiting.
  charfall: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.32, st);
    poly(c, st.deep, [[0.26, -0.46], [0.02, -0.02]], 0.05);
    flame(c, 0.14, -0.34, 0.26, st, 0.06);
    dot(c, st.core, 0.02, -0.02, 0.07);
    crescent(c, 0, 0.1, 0.24, 0.16, Math.PI * 0.15, Math.PI * 0.85, st.core, 0.03);
    dot(c, st.spark, -0.26, -0.3, 0.03);
    dot(c, st.mid, -0.18, -0.14, 0.026);
  },
  // Hushfall — five feathers that know the way: the fan leaving,
  // soft, points first, one eye watching it go.
  hushfall: (st) => (c) => {
    c.translate(0.5, 0.56);
    for (let k = -2; k <= 2; k++) {
      const a = -Math.PI / 2 + k * 0.34;
      const len = 0.32 - Math.abs(k) * 0.03;
      const tx = Math.cos(a) * len;
      const ty = Math.sin(a) * len;
      fill(c, st.mid, [
        [0, 0.12],
        [tx + Math.cos(a + 2.0) * 0.06, ty + Math.sin(a + 2.0) * 0.06],
        [tx * 1.18, ty * 1.18],
        [tx + Math.cos(a - 2.0) * 0.06, ty + Math.sin(a - 2.0) * 0.06],
      ]);
    }
    // The watcher's eyes, amber, unblinking.
    dot(c, st.spark, -0.05, 0.2, 0.032);
    dot(c, st.spark, 0.05, 0.2, 0.032);
    dot(c, st.deep, 0.3, -0.3, 0.04);
  },
  // Quarry Call — the called shot: one heavy shaft, the mark it
  // already owns ringed at the far end.
  quarry_call: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.rotate(-0.18);
    // The mark: a ringed quarry sigil.
    ringDot(c, st.mid, 0.3, 0, 0.14, 0.036);
    dot(c, st.core, 0.3, 0, 0.05);
    // The shaft arriving, all business.
    poly(c, st.deep, [[-0.46, 0], [0.12, 0]], 0.05);
    fill(c, st.core, [[0.12, -0.06], [0.24, 0], [0.12, 0.06]]);
    fill(c, st.mid, [[-0.46, -0.07], [-0.34, 0], [-0.46, 0.07]]);
    droplet(c, 0.4, -0.3, 0.2, st);
  },
  // The Plucked Chord — three notes, taken personally: the strings,
  // and the rings each note left the room.
  plucked_chord: (st) => (c) => {
    c.translate(0.5, 0.5);
    for (let k = -1; k <= 1; k++) {
      poly(c, st.mid, [[k * 0.14, -0.36], [k * 0.14, 0.36]], 0.03);
    }
    for (let i = 0; i < 3; i++) {
      const r = 0.12 + i * 0.12;
      c.strokeStyle = i === 1 ? st.core : st.mid;
      c.lineWidth = 0.028;
      c.beginPath();
      c.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
      c.stroke();
    }
    dot(c, st.spark, 0, 0, 0.05);
    star4(c, 0.32, -0.32, 0.05, st.spark);
  },
  // Nightweft — the net of night gathers: the woven lattice, and
  // the pull toward center.
  nightweft: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.028;
    for (let k = -1; k <= 1; k++) {
      c.beginPath();
      c.moveTo(-0.4, k * 0.2);
      c.quadraticCurveTo(0, k * 0.2 + 0.08, 0.4, k * 0.2);
      c.stroke();
      c.beginPath();
      c.moveTo(k * 0.2, -0.4);
      c.quadraticCurveTo(k * 0.2 + 0.08, 0, k * 0.2, 0.4);
      c.stroke();
    }
    // Everything leans toward the middle of the weave.
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.8;
      poly(c, st.core, [
        [Math.cos(a) * 0.42, Math.sin(a) * 0.42],
        [Math.cos(a + 0.15) * 0.24, Math.sin(a + 0.15) * 0.24],
      ], 0.03);
    }
    dot(c, st.spark, 0, 0, 0.055);
    star4(c, -0.3, -0.32, 0.05, st.spark);
  },
  // The Anvil — the storm sets it down: the flat-topped cloud, the
  // strike beneath, the ground braced for both.
  the_anvil: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    // The anvil cloud, flat on top the way the sky planes it.
    fill(c, st.deep, [[-0.34, -0.3], [0.34, -0.3], [0.34, -0.22], [-0.34, -0.22]]);
    dot(c, st.deep, -0.18, -0.18, 0.1);
    dot(c, st.deep, 0.04, -0.16, 0.12);
    dot(c, st.deep, 0.24, -0.18, 0.09);
    poly(c, st.mid, [[-0.33, -0.29], [0.33, -0.29]], 0.024);
    bolt(c, 0, -0.06, 0.55, st, 0.4);
    dot(c, st.spark, -0.3, 0.24, 0.03);
    dot(c, st.spark, 0.32, 0.2, 0.026);
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
    chevrons(c, -0.36, -0.04, 0, st, 2, 1.5);
    poly(c, st.mid, [[-0.16, -0.36], [0.46, -0.06], [0.46, 0.16], [-0.24, 0.28]], 0.045);
    fill(c, st.core, [[-0.12, -0.3], [0.38, -0.06], [-0.14, 0.02]]);
    fill(c, st.deep, [[-0.22, 0.18], [0.44, 0.1], [0.46, 0.16], [-0.24, 0.28]]);
    puff(c, -0.04, 0.34, 0.1, st.deep);
    puff(c, 0.28, 0.3, 0.08, st.deep);
  },
  // Warcry — the shout leaves the mouth and hardens into two hard
  // waves; the sparks are the yard hearing it.
  warcry: (st) => (c) => {
    c.translate(0.38, 0.5);
    ringDot(c, st.core, -0.14, 0, 0.13, 0.036);
    crescent(c, -0.08, 0, 0.2, 0.32, -0.85, 0.85, st.core, 0.03);
    crescent(c, -0.08, 0, 0.4, 0.54, -0.72, 0.72, st.mid, 0.034);
    star4(c, 0.5, -0.32, 0.09, st.spark);
    star4(c, 0.52, 0.28, 0.07, st.core);
  },
  // Steel Wave — the swing leaves the sword and keeps rolling: one
  // thick wave, bright down its own spine.
  steel_wave: (st) => (c) => {
    c.translate(0.44, 0.5);
    chevrons(c, -0.28, 0, 0, st, 2, 1.2);
    crescent(c, -0.02, 0, 0.22, 0.46, -0.85, 0.85, st.mid, 0.04);
    crescent(c, -0.02, 0, 0.28, 0.4, -0.7, 0.7, st.core, 0.024);
    for (const a of [-0.55, 0, 0.55]) {
      star4(c, Math.cos(a) * 0.55 - 0.02, Math.sin(a) * 0.55, 0.07, st.spark, a);
    }
  },
  // Stagger Stomp — the heel arrives; the floor passes it on. A real
  // boot now, toe proud, cracks bright enough to matter.
  stagger_stomp: (st) => (c) => {
    c.translate(0.48, 0.46);
    c.globalAlpha = 0.55;
    novaRing(c, 0.02, 0.26, 0.38, st, 10, 0.2, 0.04);
    c.globalAlpha = 1;
    poly(c, st.mid, [[-0.16, -0.42], [0.1, -0.42], [0.12, -0.04], [0.32, 0.02], [0.32, 0.16], [-0.18, 0.14]], 0.045);
    fill(c, st.core, [[-0.12, -0.38], [0.06, -0.38], [0.08, -0.16], [-0.14, -0.18]]);
    fill(c, st.deep, [[-0.16, 0.06], [0.3, 0.09], [0.32, 0.16], [-0.18, 0.14]]);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.04;
    c.lineCap = 'round';
    for (const [x1, y1] of [[-0.42, 0.34], [0.44, 0.36], [-0.1, 0.44]] as const) {
      c.beginPath();
      c.moveTo(0.06, 0.18);
      c.lineTo(x1, y1);
      c.stroke();
    }
  },
  // Headsman's Stroke — the broad head already at the block, the haft
  // still up where the swing began.
  headsman_stroke: (st) => (c) => {
    c.translate(0.5, 0.52);
    poly(c, '#6a4a2e', [[-0.32, 0.18], [0.32, 0.18], [0.26, 0.4], [-0.26, 0.4]], 0.04);
    fill(c, '#8a6440', [[-0.28, 0.21], [0.28, 0.21], [0.26, 0.27], [-0.27, 0.27]]);
    c.strokeStyle = '#7a5a38';
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.38, -0.42);
    c.lineTo(0.04, -0.12);
    c.stroke();
    poly(c, st.mid, [[-0.36, -0.32], [-0.02, -0.44], [0.1, -0.08], [-0.22, 0.06]], 0.045);
    fill(c, st.core, [[-0.32, -0.28], [-0.05, -0.38], [0.0, -0.22], [-0.27, -0.14]]);
    fill(c, st.spark, [[-0.22, 0.06], [0.1, -0.08], [0.08, -0.01], [-0.2, 0.12]]);
  },
  // Warlord's Descent — the crown comes down with the man, and the
  // ground announces them both.
  warlords_descent: (st) => (c) => {
    c.translate(0.5, 0.5);
    novaRing(c, 0, 0.32, 0.36, st, 10, 0.22, 0.045);
    crown(c, 0, 0.14, 0.52, st.mid, st.core);
    chevrons(c, 0, -0.38, Math.PI / 2, st, 2, 1.3);
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

// ----------------- THE DRAWN BREATH Phase 4c — the loot voices
Object.assign(PLATES, {
  // Kept Ground — the doorwarden's stand: point planted, ring held.
  kept_ground: (st) => (c) => {
    c.translate(0.5, 0.5);
    ringDot(c, st.mid, 0, 0.08, 0.3, 0.045);
    dot(c, st.spark, -0.3, 0.08, 0.04);
    dot(c, st.spark, 0.3, 0.08, 0.04);
    dot(c, st.spark, 0, 0.38, 0.04);
    blade(c, 0, -0.08, 0.5, Math.PI / 2, st);
  },
  // The Standing Stone — the kerb slab raised, the names kept on.
  standing_stone: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.34, st);
    fill(c, st.deep, [[-0.16, 0.3], [-0.13, -0.3], [0.0, -0.38], [0.13, -0.3], [0.16, 0.3]]);
    fill(c, st.mid, [[-0.11, 0.28], [-0.09, -0.26], [0.0, -0.33], [0.09, -0.26], [0.11, 0.28]]);
    poly(c, st.deep, [[-0.03, -0.2], [0.03, -0.12]], 0.03);
    poly(c, st.deep, [[0.03, -0.04], [-0.03, 0.04]], 0.03);
    poly(c, st.deep, [[-0.03, 0.12], [0.03, 0.2]], 0.03);
    star4(c, 0.26, -0.24, 0.07, st.spark);
  },
  // The Full Draw — the warbow bent all the way to the promise.
  full_draw: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, -0.06, 0, 0.3, 0.38, -1.35, 1.35, st.mid, 0.04);
    poly(c, st.spark, [[-0.02, -0.34], [-0.3, 0], [-0.02, 0.34]], 0.026);
    arrow(c, 0.02, 0, 0, 0.62, st, 1.2);
  },
  // Red Thread — the spool takes what the heart lets go.
  red_thread: (st) => (c) => {
    c.translate(0.5, 0.5);
    droplet(c, -0.22, -0.3, 0.5, st);
    crescent(c, 0, 0, 0.2, 0.26, -2.6, 0.4, st.mid, 0.032);
    crescent(c, 0, 0, 0.1, 0.15, 0.6, 3.4, st.mid, 0.032);
    poly(c, st.spark, [[-0.2, -0.24], [-0.14, -0.1], [0.16, -0.14]], 0.024);
    dot(c, st.core, 0, 0, 0.06);
    poly(c, st.deep, [[0, 0.16], [0, 0.36]], 0.05);
  },
  // Vigil — the candle that keeps the watch that keeps you.
  vigil: (st) => (c) => {
    c.translate(0.5, 0.52);
    haloArcs(c, 0, -0.2, st);
    fill(c, st.mid, [[-0.09, 0.36], [-0.07, -0.06], [0.07, -0.06], [0.09, 0.36]]);
    poly(c, st.deep, [[-0.09, 0.1], [-0.02, 0.16]], 0.026);
    poly(c, st.deep, [[0.09, 0.22], [0.02, 0.28]], 0.026);
    flame(c, 0, -0.18, 0.5, st, 0.06);
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
  // Whirling Ruin — the wheel that will not stop: two chasing arcs
  // and the calm bright hub of the held storm.
  whirling_ruin: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0, 0.32, 0.42, -2.7, -0.5, st.spark, 0.03);
    crescent(c, 0, 0, 0.32, 0.42, 0.45, 2.65, st.mid, 0.03);
    fill(c, st.mid, [[-0.04, -0.3], [0.04, -0.3], [0.05, 0.18], [-0.05, 0.18]]);
    fill(c, st.core, [[-0.02, -0.3], [0.02, -0.3], [0.02, 0.14], [-0.02, 0.14]]);
    dot(c, st.deep, 0, 0.24, 0.06);
    dot(c, st.spark, 0, 0.23, 0.04);
  },
  // Winter's Fall — the bargain kept: the flake overhead and the ice
  // already arriving where you pointed.
  winters_fall: (st) => (c) => {
    c.translate(0.5, 0.52);
    snowflake(c, 0, -0.28, 0.13, st.core, 0.04);
    for (let k = -1; k <= 1; k++) {
      fill(c, k === 0 ? st.core : st.mid, [
        [k * 0.21 - 0.035, -0.08 + Math.abs(k) * 0.07],
        [k * 0.21 + 0.035, -0.1 + Math.abs(k) * 0.07],
        [k * 0.21 + 0.015, 0.26 + Math.abs(k) * 0.04],
      ]);
    }
    ground(c, 0, 0.34, st);
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

// ------------- THE BREATH BETWEEN RUNGS — the onehand breath wave
Object.assign(PLATES, {
  // Ember Edge — the cut drawn through fire: one blade, one burning
  // crescent riding its wake, coals already falling.
  ember_edge: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0.02, 0.02, 0.3, 0.4, -2.4, -0.4, st.mid, 0.05);
    crescent(c, 0.02, 0.02, 0.33, 0.37, -2.1, -0.7, st.core, 0.026);
    blade(c, -0.04, 0.06, 0.6, -Math.PI / 3.2, st);
    flame(c, 0.3, -0.08, 0.42, st, 0.08);
    dot(c, st.spark, -0.28, 0.3, 0.035);
    dot(c, st.deep, -0.16, 0.38, 0.03);
  },
  // Millwork — the blade turned millstone: the round stone, the grip
  // set square through its eye, grist thrown off the rim.
  millwork: (st) => (c) => {
    c.translate(0.5, 0.5);
    ringDot(c, st.mid, 0, 0, 0.32, 0.09);
    ringDot(c, st.deep, 0, 0, 0.2, 0.028);
    blade(c, 0, 0, 0.56, Math.PI / 2, st);
    dot(c, st.spark, -0.38, -0.16, 0.032);
    dot(c, st.spark, 0.34, 0.22, 0.032);
    dot(c, st.deep, 0.4, -0.1, 0.028);
  },
  // Levinstroke — the sky loosed off the point: blade high, the levin
  // already leaving in a line.
  levinstroke: (st) => (c) => {
    c.translate(0.5, 0.5);
    blade(c, -0.2, 0.12, 0.52, -Math.PI / 2.6, st);
    bolt(c, 0.12, -0.1, 0.66, st, 0.3);
    star4(c, -0.06, -0.34, 0.07, st.core);
    dot(c, st.spark, 0.38, 0.3, 0.03);
  },
  // Red Ledger — the point held out, the account open: entry rings
  // marching down the tether toward the drop it takes.
  red_ledger: (st) => (c) => {
    c.translate(0.5, 0.5);
    blade(c, -0.24, 0.02, 0.5, Math.PI, st);
    ringDot(c, st.mid, 0.08, 0.02, 0.08, 0.028);
    ringDot(c, st.mid, 0.24, 0.02, 0.11, 0.028);
    ringDot(c, st.deep, 0.38, 0.02, 0.13, 0.026);
    droplet(c, 0.34, 0.3, 0.62, st);
  },
  // Cold Iron — the point driven in, winter spearing out of the ring.
  cold_iron: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    blade(c, 0, -0.1, 0.56, Math.PI / 2, st);
    poly(c, st.core, [[-0.26, 0.22], [-0.34, -0.02]], 0.036);
    poly(c, st.core, [[0.26, 0.22], [0.34, -0.02]], 0.036);
    poly(c, st.mid, [[-0.14, 0.26], [-0.18, 0.02]], 0.032);
    poly(c, st.mid, [[0.14, 0.26], [0.18, 0.02]], 0.032);
    snowflake(c, 0.3, -0.3, 0.09, st.spark, 0.032);
  },
  // Frostwork — the pattern working outward: the flake at the heart
  // and the rings it has already claimed.
  frostwork: (st) => (c) => {
    c.translate(0.5, 0.5);
    ringDot(c, st.deep, 0, 0, 0.4, 0.026);
    ringDot(c, st.mid, 0, 0, 0.27, 0.032);
    snowflake(c, 0, 0, 0.15, st.core, 0.04);
    dot(c, st.spark, 0.31, -0.18, 0.03);
    dot(c, st.spark, -0.31, 0.18, 0.03);
    dot(c, st.spark, 0.18, 0.33, 0.026);
  },
  // First Light — the doorway: two dark posts, the dawn tearing
  // through the gap, and you already gone.
  first_light: (st) => (c) => {
    c.translate(0.5, 0.5);
    fill(c, st.deep, [[-0.34, -0.36], [-0.16, -0.36], [-0.16, 0.36], [-0.34, 0.36]]);
    fill(c, st.deep, [[0.16, -0.36], [0.34, -0.36], [0.34, 0.36], [0.16, 0.36]]);
    fill(c, st.mid, [[-0.13, -0.3], [0.13, -0.34], [0.08, 0.34], [-0.09, 0.3]]);
    fill(c, st.core, [[-0.06, -0.26], [0.06, -0.29], [0.03, 0.28], [-0.04, 0.25]]);
    chevrons(c, 0.4, 0, 0, st, 2, 1);
    star4(c, 0, -0.02, 0.08, st.core);
  },
  // Live Iron — the blade gone live: the current riding the flat,
  // charge held at the guard.
  live_iron: (st) => (c) => {
    c.translate(0.5, 0.5);
    blade(c, 0, 0.04, 0.64, -Math.PI / 2, st);
    bolt(c, -0.2, -0.14, 0.4, st, 0.5);
    bolt(c, 0.22, 0.08, 0.34, st, -0.45);
    star4(c, 0, -0.36, 0.08, st.core);
    dot(c, st.spark, -0.3, 0.28, 0.03);
    dot(c, st.spark, 0.32, -0.3, 0.03);
  },
  // Gloomfall — night poured out of the edge: the dark ring landing,
  // rain of shadow falling inside it.
  gloomfall: (st) => (c) => {
    c.translate(0.5, 0.52);
    novaRing(c, 0, 0.18, 0.34, st, 10, 0.24, 0.04);
    poly(c, st.mid, [[-0.18, -0.34], [-0.22, -0.06]], 0.036);
    poly(c, st.mid, [[0.0, -0.4], [-0.03, -0.1]], 0.036);
    poly(c, st.mid, [[0.18, -0.32], [0.15, -0.04]], 0.036);
    dot(c, st.spark, -0.21, 0.0, 0.03);
    dot(c, st.spark, -0.02, -0.04, 0.03);
    dot(c, st.spark, 0.15, 0.02, 0.03);
  },
  // Noonfall — noon held over the stake: the pillar of light hammering
  // the ring, the sun that will not move.
  noonfall: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.32, st);
    fill(c, st.mid, [[-0.13, -0.28], [0.13, -0.28], [0.08, 0.3], [-0.08, 0.3]]);
    fill(c, st.core, [[-0.06, -0.28], [0.06, -0.28], [0.03, 0.28], [-0.03, 0.28]]);
    star4(c, 0, -0.36, 0.11, st.core);
    ringDot(c, st.spark, 0, -0.36, 0.17, 0.024);
    dot(c, st.spark, -0.26, 0.28, 0.03);
    dot(c, st.spark, 0.26, 0.28, 0.03);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// --------------- THE BREATH BETWEEN RUNGS — the arx wave's plates
Object.assign(PLATES, {
  // Wickfire — the thrown candle: the flame in flight, its wick-trail
  // still curling behind, a gutter of small fire already landed.
  wickfire: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.deep, [[-0.36, 0.3], [-0.22, 0.18], [-0.12, 0.02], [-0.02, -0.08]], 0.034);
    flame(c, 0.12, -0.14, 0.5, st, 0.14);
    flame(c, -0.3, 0.34, 0.22, st, -0.08);
    dot(c, st.spark, -0.14, 0.36, 0.03);
    dot(c, st.spark, 0.34, 0.18, 0.028);
  },
  // Rime River — winter poured downhill: the river band winding from
  // the hand's corner, its source flake, rime set along the banks.
  rime_river: (st) => (c) => {
    c.translate(0.5, 0.5);
    fill(c, st.mid, [[-0.4, -0.28], [-0.24, -0.32], [-0.02, -0.12], [0.2, -0.02], [0.38, 0.22], [0.26, 0.34], [0.06, 0.12], [-0.18, 0.0], [-0.4, -0.14]]);
    poly(c, st.core, [[-0.32, -0.26], [-0.06, -0.08], [0.16, 0.04], [0.3, 0.24]], 0.03);
    snowflake(c, -0.32, -0.3, 0.1, st.core, 0.034);
    dot(c, st.spark, 0.1, -0.24, 0.028);
    dot(c, st.spark, -0.06, 0.24, 0.028);
    dot(c, st.deep, 0.34, 0.06, 0.026);
  },
  // Windshear — the sky handed back: gust fronts breaking outward,
  // leaves torn off their stems mid-air.
  windshear: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0, 0.18, 0.24, -2.6, 0.6, st.core, 0.04);
    crescent(c, 0, 0, 0.3, 0.36, -2.2, 1.0, st.mid, 0.04);
    crescent(c, 0, 0, 0.42, 0.46, -1.8, 1.3, st.deep, 0.034);
    fill(c, st.mid, [[0.24, -0.3], [0.34, -0.36], [0.32, -0.24]]);
    fill(c, st.mid, [[-0.3, 0.22], [-0.4, 0.24], [-0.32, 0.34]]);
    dot(c, st.spark, 0.12, -0.38, 0.028);
    dot(c, st.spark, -0.14, 0.4, 0.026);
  },
  // Stonerise — the quarry answering: rows of ground teeth standing
  // up out of the line, the crack that called them.
  stonerise: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.36, st);
    fill(c, st.mid, [[-0.3, 0.24], [-0.2, -0.18], [-0.1, 0.24]]);
    fill(c, st.core, [[-0.08, 0.24], [0.02, -0.32], [0.14, 0.24]]);
    fill(c, st.mid, [[0.16, 0.24], [0.26, -0.1], [0.34, 0.24]]);
    poly(c, st.deep, [[-0.36, 0.32], [-0.12, 0.36], [0.1, 0.33], [0.36, 0.37]], 0.026);
    dot(c, st.spark, 0.02, -0.4, 0.03);
  },
  // Geyser — the deep well woken: the white column standing out of
  // its pool, spray raining back down both sides.
  geyser: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    fill(c, st.mid, [[-0.12, 0.26], [-0.07, -0.3], [0.07, -0.3], [0.12, 0.26]]);
    fill(c, st.core, [[-0.05, 0.24], [-0.025, -0.28], [0.025, -0.28], [0.05, 0.24]]);
    puff(c, 0, -0.34, 0.11, st.core);
    droplet(c, -0.24, -0.1, 0.4, st);
    droplet(c, 0.26, -0.14, 0.4, st);
    dot(c, st.spark, -0.32, 0.16, 0.028);
    dot(c, st.spark, 0.33, 0.12, 0.028);
  },
  // Anvil Sky — the forge brought low: the flat cloud pressed down to
  // anvil height, the hammer-stroke already falling.
  anvil_sky: (st) => (c) => {
    c.translate(0.5, 0.5);
    fill(c, st.deep, [[-0.38, -0.26], [0.38, -0.26], [0.3, -0.14], [-0.3, -0.14]]);
    puff(c, -0.3, -0.3, 0.09, st.deep);
    puff(c, 0.28, -0.31, 0.1, st.deep);
    bolt(c, 0, 0.1, 0.52, st, 0.1);
    novaRing(c, 0, 0.34, 0.22, st, 8, 0.2, 0.032);
    dot(c, st.spark, -0.3, 0.3, 0.028);
    dot(c, st.spark, 0.3, 0.26, 0.028);
  },
  // Hollowcall — the small nothing: the rim of runes holding, and
  // everything already leaning in toward the dark at the middle.
  hollowcall: (st) => (c) => {
    c.translate(0.5, 0.5);
    ringDot(c, st.mid, 0, 0, 0.36, 0.036);
    dot(c, st.deep, 0, 0, 0.13);
    ringDot(c, st.core, 0, 0, 0.16, 0.024);
    chevrons(c, -0.42, 0, 0, st, 2, 0.7);
    chevrons(c, 0.42, 0, Math.PI, st, 2, 0.7);
    chevrons(c, 0, -0.42, Math.PI / 2, st, 2, 0.7);
    chevrons(c, 0, 0.42, -Math.PI / 2, st, 2, 0.7);
  },
  // Burning Glass — noon narrowed: the held lens, the light entering
  // wide and leaving as one line that ends in fire.
  burning_glass: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.spark, [[-0.42, -0.3], [-0.1, -0.06]], 0.028);
    poly(c, st.spark, [[-0.42, -0.02], [-0.1, -0.02]], 0.028);
    poly(c, st.spark, [[-0.42, 0.26], [-0.1, 0.02]], 0.028);
    ringDot(c, st.mid, -0.04, -0.02, 0.15, 0.045);
    poly(c, st.core, [[0.1, -0.02], [0.38, 0.16]], 0.05);
    flame(c, 0.38, 0.1, 0.24, st, 0.1);
  },
  // Moonrise — the early moon: the disc just clear of the horizon,
  // its halo, and the pale moths adrift under it.
  moonrise: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.deep, [[-0.42, 0.26], [0.42, 0.26]], 0.036);
    dot(c, st.core, 0, -0.08, 0.19);
    crescent(c, 0, -0.08, 0.24, 0.28, -2.8, 0.2, st.mid, 0.03);
    dot(c, st.mid, 0.07, -0.14, 0.035);
    dot(c, st.mid, -0.06, -0.02, 0.026);
    star4(c, -0.3, 0.1, 0.06, st.spark);
    star4(c, 0.3, -0.28, 0.05, st.spark);
    dot(c, st.spark, 0.24, 0.16, 0.024);
  },
  // Cometfall — the visitor: head and tapering tail crossing the
  // whole plate, the cracked ring where the last one landed.
  cometfall: (st) => (c) => {
    c.translate(0.5, 0.5);
    fill(c, st.mid, [[-0.4, -0.38], [0.1, -0.02], [0.02, 0.08]]);
    dot(c, st.core, 0.1, 0.02, 0.09);
    dot(c, st.spark, -0.16, -0.2, 0.028);
    novaRing(c, 0.16, 0.3, 0.2, st, 9, 0.22, 0.03);
    poly(c, st.deep, [[0.02, 0.38], [0.12, 0.3]], 0.026);
    poly(c, st.deep, [[0.3, 0.38], [0.24, 0.3]], 0.026);
    star4(c, -0.34, 0.18, 0.05, st.spark);
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

// --------------------------- THE GREAT SCHOOL — the colossus's plates
Object.assign(PLATES, {
  // Wide Swath — the level horizon cut: the greatblade across the
  // whole frame, its own sweep crescent under it.
  wide_swath: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0.1, 0.36, 0.44, 2.5, 0.64, st.spark, 0.028);
    greatblade(c, 0, -0.06, 0.95, st, 0.06);
    star4(c, 0.38, -0.02, 0.07, st.core);
  },
  // Haft Check — the rude end of the pole: grip leading, the jolt
  // star where it lands, the blade trailing out of frame.
  haft_check: (st) => (c) => {
    c.translate(0.46, 0.5);
    greatblade(c, 0.1, 0.02, 0.9, st, Math.PI + 0.12);
    chevrons(c, -0.06, -0.24, 0.2, st, 1, 0.8);
    star4(c, -0.34, 0.06, 0.11, st.core, Math.PI / 4);
    star4(c, -0.38, -0.12, 0.06, st.spark);
  },
  // Iron Pendulum — two swings, no apology: mirrored crescents on
  // opposite planes around the upright blade.
  iron_pendulum: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, -0.08, 0.34, 0.4, -2.7, -0.5, st.spark, 0.028);
    crescent(c, 0, 0.12, 0.34, 0.4, 0.5, 2.7, st.core, 0.028);
    greatblade(c, 0, 0, 0.88, st, -Math.PI / 2 + 0.18);
  },
  // Fault Line — the ground takes a side: the blade buried point-
  // down, fissures running from the wound.
  fault_line: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.4, st);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.032;
    for (const [a, len] of [[0.2, 0.4], [1.7, 0.26], [2.9, 0.38], [-1.9, 0.3]] as const) {
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.08, 0.2 + Math.sin(a) * 0.04);
      c.lineTo(Math.cos(a) * len, 0.2 + Math.sin(a) * len * 0.24);
      c.stroke();
    }
    greatblade(c, 0, -0.14, 0.8, st, Math.PI / 2);
    star4(c, 0.05, 0.2, 0.09, st.spark, Math.PI / 4);
  },
  // Colossus Stance — too big to argue with: the figure-post standing
  // in its own rising pillar, blade shouldered.
  colossus_stance: (st) => (c) => {
    c.translate(0.5, 0.52);
    haloArcs(c, 0, 0.1, st);
    poly(c, st.mid, [[-0.06, -0.1], [0.06, -0.1], [0.06, 0.36], [-0.06, 0.36]], 0.03);
    dot(c, st.core, 0, -0.2, 0.09);
    greatblade(c, 0.1, -0.22, 0.78, st, -0.6);
  },
  // Skysunder — the verdict comes down: the blade falling out of the
  // sky into its own crater star.
  skysunder: (st) => (c) => {
    c.translate(0.5, 0.54);
    chevrons(c, -0.22, -0.34, Math.PI / 2, st, 2, 0.9);
    greatblade(c, 0.08, -0.1, 0.92, st, Math.PI / 2 - 0.2);
    ground(c, 0.02, 0.36, st);
    star4(c, 0.0, 0.24, 0.12, st.core, Math.PI / 4);
    star4(c, 0.24, 0.18, 0.06, st.spark);
  },
  // Executioner's Arc — sentences end: the low headsman's crescent,
  // and the skull that heard it.
  executioners_arc: (st) => (c) => {
    c.translate(0.5, 0.48);
    crescent(c, 0, 0.06, 0.36, 0.43, 0.4, 2.8, st.spark, 0.03);
    greatblade(c, 0.02, -0.08, 0.9, st, 0.5);
    skull(c, -0.26, 0.3, 0.5, st.core, st.deep);
  },
  // Avalanche — three blows downhill: stacked descending chevrons
  // and the rockfall they bring with them.
  avalanche: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.2, -0.3, Math.PI / 2, st, 3, 1.0);
    greatblade(c, 0.12, 0.02, 0.86, st, Math.PI / 2 - 0.5);
    dot(c, st.mid, -0.3, 0.22, 0.05);
    dot(c, st.deep, -0.18, 0.32, 0.04);
    dot(c, st.spark, 0.02, 0.36, 0.03);
  },
  // Breaker Charge — through, not around: speed chevrons behind the
  // blade leveled at a shoulder's height.
  breaker_charge: (st) => (c) => {
    c.translate(0.54, 0.5);
    chevrons(c, -0.4, 0.0, 0, st, 2, 1.1);
    greatblade(c, 0.1, -0.02, 0.9, st, -0.08);
    star4(c, 0.42, -0.04, 0.08, st.core);
  },
  // Titan's Verdict — the rings do the talking: three quake rings
  // around the blade planted like a signature.
  titans_verdict: (st) => (c) => {
    c.translate(0.5, 0.52);
    novaRing(c, 0, 0.04, 0.44, st, 12, 0.22, 0.034);
    novaRing(c, 0, 0.04, 0.3, st, 10, 0.22, 0.028);
    greatblade(c, 0, -0.08, 0.84, st, Math.PI / 2);
    star4(c, -0.3, 0.24, 0.07, st.spark);
  },
  // Colossus Arc — the whole yard hears it: one full turn, the sweep
  // ring closed all the way around.
  colossus_arc: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0.02, 0.38, 0.45, -2.9, 2.9, st.spark, 0.03);
    greatblade(c, 0, -0.02, 0.92, st, 0.0);
  },
  // Quakefall — the county comes down: the maul mid-fall over its
  // own fissured landing.
  quakefall: (st) => (c) => {
    c.translate(0.5, 0.5);
    ground(c, 0, 0.4, st);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.03;
    for (const [a, len] of [[0.5, 0.36], [2.6, 0.34], [-2.0, 0.28]] as const) {
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.1, 0.22 + Math.sin(a) * 0.05);
      c.lineTo(Math.cos(a) * len, 0.22 + Math.sin(a) * len * 0.22);
      c.stroke();
    }
    // The maul: long haft, block head, lit top plane.
    c.save();
    c.translate(0.02, -0.08);
    c.rotate(0.5);
    poly(c, '#5b4028', [[-0.34, -0.028], [0.2, -0.028], [0.2, 0.028], [-0.34, 0.028]], 0.026);
    poly(c, st.mid, [[0.14, -0.16], [0.34, -0.16], [0.34, 0.16], [0.14, 0.16]], 0.034);
    fill(c, st.core, [[0.14, -0.16], [0.34, -0.16], [0.3, -0.08], [0.14, -0.08]]);
    c.restore();
    star4(c, 0.16, 0.22, 0.1, st.core, Math.PI / 4);
  },
  // Giantsfall — everything falls the same height: the blade at the
  // top of the stroke, the long way down marked out beneath it.
  giantsfall: (st) => (c) => {
    c.translate(0.5, 0.48);
    greatblade(c, 0, -0.2, 0.9, st, Math.PI / 2 - 0.12);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.03;
    c.lineCap = 'round';
    for (const x of [-0.22, 0.24] as const) {
      c.beginPath();
      c.moveTo(x, -0.3);
      c.lineTo(x * 1.3, 0.26);
      c.stroke();
    }
    ground(c, 0, 0.34, st);
    star4(c, 0, 0.3, 0.11, st.core, Math.PI / 4);
  },

  // ------------------------ THE ARMORY — the bespoke Weapon Arts
  // Hewer's Wheel — the full round of the double head: the closed
  // sweep ring with the axe leveled through its own circle.
  hewers_wheel: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0.02, 0.37, 0.44, -2.9, 2.9, st.spark, 0.03);
    greataxe(c, 0, -0.02, 0.9, st, 0.0);
  },
  // Reaver's Due — the toll arm: the blade swung flat, the shove
  // chevrons carrying whoever argued off the road.
  reavers_due: (st) => (c) => {
    c.translate(0.5, 0.5);
    greatblade(c, -0.04, -0.04, 0.9, st, 0.1);
    chevrons(c, 0.22, 0.2, 0, st, 2, 0.85);
    dot(c, st.spark, -0.32, 0.24, 0.06);
  },
  // Mournfield — the marked plot: the blade planted as its own
  // headstone inside the slow ground it keeps.
  mournfield: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.42, st);
    haloArcs(c, 0, 0.14, st);
    greatblade(c, 0, -0.12, 0.8, st, Math.PI / 2);
  },
  // Ash Harvest — the reap: the low crescent, the wave-edge above it,
  // and the embers that finish the row.
  ash_harvest: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0.08, 0.35, 0.42, 0.4, 2.7, st.spark, 0.03);
    greatblade(c, 0, -0.06, 0.9, st, 0.4);
    dot(c, st.core, -0.26, 0.02, 0.04);
    dot(c, st.spark, -0.34, -0.12, 0.03);
    dot(c, st.core, -0.18, -0.2, 0.025);
  },
  // Glacier Sunder — the cold from above: the blade mid-fall over a
  // fissured landing, the frost star where it meets.
  glacier_sunder: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.4, st);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.03;
    for (const [a, len] of [[0.4, 0.34], [2.7, 0.3], [-2.1, 0.26]] as const) {
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.08, 0.2 + Math.sin(a) * 0.04);
      c.lineTo(Math.cos(a) * len, 0.2 + Math.sin(a) * len * 0.22);
      c.stroke();
    }
    greatblade(c, 0.04, -0.12, 0.84, st, Math.PI / 2 - 0.16);
    star4(c, 0, 0.2, 0.11, st.core);
  },
  // The Crown's Word — spoken twice: two nova rings off the upright
  // blade, the crown over the pommel.
  crowns_word: (st) => (c) => {
    c.translate(0.5, 0.52);
    novaRing(c, 0, 0.02, 0.44, st, 12, 0.2, 0.03);
    novaRing(c, 0, 0.02, 0.3, st, 10, 0.2, 0.026);
    greatblade(c, 0, -0.06, 0.82, st, Math.PI / 2);
    crown(c, 0, -0.38, 0.22, st.mid, st.core);
  },
  // Last Argument — the closing line: the blade across the whole
  // frame, the widest sweep the plates own, the full stop at the tip.
  last_argument: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0.04, 0.38, 0.46, -2.6, 2.6, st.spark, 0.032);
    greatblade(c, 0, -0.04, 0.96, st, -0.06);
    star4(c, 0.4, -0.08, 0.09, st.core);
  },
  // Barrow Bite — fed jaws: the axe over the skull that remembers,
  // the bite crescent closing.
  barrow_bite: (st) => (c) => {
    c.translate(0.5, 0.48);
    crescent(c, 0, 0.08, 0.34, 0.4, 0.5, 2.7, st.spark, 0.028);
    greataxe(c, 0.02, -0.08, 0.88, st, 0.42);
    skull(c, -0.26, 0.28, 0.5, st.core, st.deep);
  },
  // Thunderfell — the stroke and the storm: the axe mid-fall with the
  // bolt landing beside it, neither first.
  thunder_fell: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.38, st);
    poly(c, st.spark, [[-0.16, -0.42], [-0.26, -0.12], [-0.18, -0.14], [-0.32, 0.18]], 0.026);
    greataxe(c, 0.1, -0.1, 0.86, st, Math.PI / 2 - 0.28);
    star4(c, 0.02, 0.2, 0.1, st.core, Math.PI / 4);
  },
  // White Heat — the willing metal: the axe upright in its own rising
  // forge pillar, sparks keeping the temper.
  white_heat: (st) => (c) => {
    c.translate(0.5, 0.52);
    haloArcs(c, 0, 0.1, st);
    poly(c, st.mid, [[-0.05, -0.06], [0.05, -0.06], [0.05, 0.34], [-0.05, 0.34]], 0.028);
    greataxe(c, 0.06, -0.18, 0.78, st, -0.5);
    dot(c, st.core, -0.2, -0.1, 0.045);
    dot(c, st.spark, -0.26, -0.26, 0.03);
  },
  // Pale Crescent — the quiet arc: one thin moon-wide band and the
  // axe carried through it on the ebb.
  pale_crescent: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0, 0.4, 0.45, -2.4, 0.6, st.spark, 0.024);
    greataxe(c, 0, 0.02, 0.9, st, -0.24);
    star4(c, -0.3, -0.3, 0.06, st.core);
  },
  // Horizon Fall — the brought mountain: the axe at the top of the
  // leap, the long way down, the crater that ends the map.
  horizon_fall: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.24, -0.32, Math.PI / 2, st, 2, 0.95);
    greataxe(c, 0.08, -0.16, 0.88, st, Math.PI / 2 - 0.18);
    ground(c, 0, 0.36, st);
    star4(c, 0.02, 0.26, 0.13, st.core, Math.PI / 4);
    star4(c, 0.26, 0.2, 0.06, st.spark);
  },

  // ------------------- THE VAULT OF NAMES — six chase-find plates.
  // The Road Opens — the toll-bar snapped in two and the blade that
  // did it, still moving; the shove reads in the chevrons behind.
  road_opens: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.3, 0.06, 0, st, 2, 0.9);
    poly(c, st.deep, [[-0.38, -0.2], [-0.06, -0.26], [-0.06, -0.2], [-0.38, -0.14]], 0.026);
    poly(c, st.deep, [[0.04, -0.3], [0.36, -0.36], [0.36, -0.3], [0.04, -0.24]], 0.026);
    greatblade(c, 0.04, 0.08, 0.9, st, -0.35);
    star4(c, 0.3, -0.1, 0.08, st.spark);
  },
  // Marsh Light — the lantern set down where it feeds: the halo, the
  // wave blade planted through it, the wisps drifting off.
  marsh_light: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0.16, 0.3, 0.34, 0, Math.PI * 2, st.mid, 0.028);
    greatblade(c, 0, -0.04, 0.86, st, Math.PI / 2 - 0.12);
    star4(c, -0.26, -0.2, 0.07, st.core);
    star4(c, 0.28, -0.06, 0.05, st.core);
    star4(c, 0.2, 0.3, 0.06, st.spark);
  },
  // Riftfall — the sky behind the sky, edge first: the torn slit,
  // the glass blade falling through it, stars that are not ours.
  riftfall: (st) => (c) => {
    c.translate(0.5, 0.5);
    fill(c, st.deep, [[-0.3, -0.34], [0.3, -0.4], [0.12, -0.22], [-0.16, -0.2]]);
    poly(c, st.mid, [[-0.3, -0.34], [0.3, -0.4], [0.12, -0.22], [-0.16, -0.2]], 0.02);
    greatblade(c, 0.0, -0.02, 0.92, st, Math.PI / 2 - 0.08);
    star4(c, -0.28, 0.02, 0.07, st.core, Math.PI / 4);
    star4(c, 0.3, -0.12, 0.05, st.core);
    ground(c, 0, 0.34, st);
  },
  // Winter's Hunger — the claw law: three trail-marks raked across
  // the plate and the jaws-axe that keeps walking on empty.
  winters_hunger: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    for (const dx of [-0.3, -0.14, 0.02] as const) {
      c.beginPath();
      c.moveTo(dx, -0.32);
      c.quadraticCurveTo(dx + 0.16, -0.02, dx + 0.1, 0.3);
      c.stroke();
    }
    greataxe(c, 0.14, 0.02, 0.88, st, -0.5);
    star4(c, -0.32, 0.26, 0.06, st.core);
  },
  // Open Seam — the floor cracked like a seam with the gold showing,
  // and the digmaster's axe that opened it.
  open_seam: (st) => (c) => {
    c.translate(0.5, 0.5);
    ground(c, 0, 0.38, st);
    c.strokeStyle = st.core;
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(-0.34, 0.3);
    c.lineTo(-0.1, 0.22);
    c.lineTo(0.04, 0.3);
    c.lineTo(0.3, 0.2);
    c.stroke();
    greataxe(c, 0.02, -0.12, 0.88, st, Math.PI / 2 - 0.2);
    star4(c, -0.24, -0.24, 0.06, st.spark);
  },
  // Last Toll — the bell itself, mouth down over the county, the
  // echo rings a beat apart. The crack shows; it rang anyway.
  last_toll: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0.3, 0.3, 0.36, -Math.PI * 0.85, -Math.PI * 0.15, st.mid, 0.03);
    crescent(c, 0, 0.34, 0.4, 0.46, -Math.PI * 0.8, -Math.PI * 0.2, st.spark, 0.024);
    fill(c, st.mid, [[-0.05, -0.36], [0.05, -0.36], [0.09, -0.28], [0.09, -0.24], [-0.09, -0.24], [-0.09, -0.28]]);
    poly(c, st.mid, [[-0.16, -0.24], [0.16, -0.24], [0.22, 0.06], [-0.22, 0.06]], 0.03);
    fill(c, st.core, [[-0.16, -0.24], [0.16, -0.24], [0.16, -0.16], [-0.16, -0.18]]);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(0.12, 0.06);
    c.lineTo(0.05, -0.04);
    c.lineTo(0.1, -0.12);
    c.stroke();
    star4(c, 0, 0.16, 0.07, st.spark, Math.PI / 4);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ----------------------------- THE TWIN SCHOOL — the paired plates
// The school's silhouette is the crossed pair: two short blades, one
// always answering the other. Every plate keeps something doubled.
Object.assign(PLATES, {
  // Twin Cut — the one-two written down: the crossed pair with a
  // chevron beat on either side, first and second.
  twin_cut: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.36, -0.06, 0.35, st, 1, 0.8);
    chevrons(c, 0.34, 0.1, Math.PI - 0.35, st, 1, 0.8);
    dagger(c, 0, 0.02, 0.82, -0.6, st);
    dagger(c, 0, 0.02, 0.82, 0.6 + Math.PI, st);
    star4(c, 0, 0.02, 0.09, st.spark, Math.PI / 4);
  },
  // Heron Step — through, not around: both blades laid on the stride
  // line, one going in, one coming out, the wake behind.
  heron_step: (st) => (c) => {
    c.translate(0.5, 0.5);
    chevrons(c, -0.38, 0.02, 0, st, 2, 1.0);
    dagger(c, 0.08, -0.12, 0.72, -0.08, st);
    c.save();
    c.globalAlpha = 0.7;
    dagger(c, -0.04, 0.16, 0.66, Math.PI + 0.08, st);
    c.restore();
    star4(c, 0.36, -0.14, 0.06, st.spark);
  },
  // Crossed Throw — the crossing point: both knives loosed point-first,
  // flight lines behind, the argument sparking where they meet.
  crossed_throw: (st) => (c) => {
    c.translate(0.5, 0.48);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.024;
    c.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[-0.42, 0.3, -0.1, 0.02], [0.42, 0.34, 0.1, 0.04]] as const) {
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
    dagger(c, 0.02, -0.04, 0.68, -0.72, st);
    dagger(c, -0.02, -0.04, 0.68, -Math.PI + 0.72, st);
    star4(c, 0, -0.1, 0.1, st.core, Math.PI / 4);
  },
  // Mirrored Hand — the second shadow: one blade and its reflection
  // across the seam, the halo of the stance above.
  mirrored_hand: (st) => (c) => {
    c.translate(0.5, 0.5);
    haloArcs(c, 0, -0.1, st);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.022;
    c.beginPath();
    c.moveTo(0, -0.4);
    c.lineTo(0, 0.42);
    c.stroke();
    dagger(c, 0.2, 0.04, 0.66, -Math.PI / 2 + 0.14, st);
    c.save();
    c.globalAlpha = 0.45;
    dagger(c, -0.2, 0.04, 0.66, -Math.PI / 2 - 0.14, st);
    c.restore();
  },
  // Turning Reel — the counter-round: two crescents chasing each other
  // opposite ways around the turned pair.
  turning_reel: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, 0, 0.36, 0.44, -2.8, -0.6, st.spark, 0.028);
    crescent(c, 0, 0, 0.36, 0.44, 0.34, 2.54, st.mid, 0.028);
    dagger(c, 0, 0, 0.6, -0.5, st);
    dagger(c, 0, 0, 0.6, 0.5 + Math.PI, st);
    chevrons(c, 0.4, -0.24, -1.2, st, 1, 0.6);
  },
  // Red Ribbons — the weaving stance: the upright pair with two ribbon
  // trails winding off the edges, the spool still turning.
  red_ribbons: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.mid;
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.3, -0.34);
    c.bezierCurveTo(-0.44, -0.08, -0.1, 0.06, -0.26, 0.36);
    c.stroke();
    c.strokeStyle = st.spark;
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(0.3, -0.3);
    c.bezierCurveTo(0.46, -0.02, 0.12, 0.1, 0.3, 0.4);
    c.stroke();
    dagger(c, -0.04, 0.04, 0.7, -Math.PI / 2 + 0.1, st);
    dagger(c, 0.1, 0.08, 0.62, -Math.PI / 2 - 0.12, st);
    droplet(c, -0.3, 0.42, 0.24, st);
  },
  // Swallow's Dive — two points down: the pair converging point-first
  // into the landing, the ground already answering.
  swallows_dive: (st) => (c) => {
    c.translate(0.5, 0.52);
    ground(c, 0, 0.36, st);
    chevrons(c, -0.3, -0.4, Math.PI / 2, st, 1, 0.7);
    chevrons(c, 0.3, -0.4, Math.PI / 2, st, 1, 0.7);
    dagger(c, -0.1, -0.08, 0.66, Math.PI / 2 - 0.28, st);
    dagger(c, 0.1, -0.08, 0.66, Math.PI / 2 + 0.28, st);
    star4(c, 0, 0.26, 0.11, st.core, Math.PI / 4);
  },
  // The Shears — the closing edges: two long blades nearly met across
  // the thread, which is already in two pieces.
  the_shears: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.026;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.44, 0.02);
    c.lineTo(-0.1, 0.0);
    c.stroke();
    c.beginPath();
    c.moveTo(0.12, -0.04);
    c.lineTo(0.44, -0.06);
    c.stroke();
    dagger(c, 0.02, 0.16, 0.84, -0.32, st);
    dagger(c, 0.02, -0.14, 0.84, 0.32, st);
    star4(c, 0.02, 0.0, 0.08, st.core);
  },
  // Storm of Two — the double round: ring and echo-ring a half-step
  // apart, the pair turning at the eye.
  storm_of_two: (st) => (c) => {
    c.translate(0.5, 0.5);
    novaRing(c, 0, 0, 0.44, st, 12, 0.18, 0.03);
    novaRing(c, 0, 0, 0.3, st, 10, 0.22, 0.026);
    dagger(c, 0, 0, 0.5, -0.55, st);
    dagger(c, 0, 0, 0.5, 0.55 + Math.PI, st);
  },
  // Hundred Hands — count them later: a fan of after-image blades
  // stacking around the two that are real.
  hundred_hands: (st) => (c) => {
    c.translate(0.5, 0.54);
    for (const [a, al] of [[-1.9, 0.3], [-1.35, 0.5], [-0.5, 0.4], [0.2, 0.3]] as const) {
      c.save();
      c.globalAlpha = al;
      dagger(c, 0, -0.02, 0.6, a, st);
      c.restore();
    }
    dagger(c, 0, -0.02, 0.72, -1.0, st);
    dagger(c, 0, -0.02, 0.72, -0.1, st);
    star4(c, 0, -0.02, 0.08, st.spark, Math.PI / 4);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ------------------- THE VETERAN'S SCHOOL — the drill-yard plates
// The school's silhouette is the clenched fist — dust, brass, plain
// iron. No weapon ever appears on these plates: the lessons belong to
// whatever hand shows up holding whatever it holds.
Object.assign(PLATES, {
  // First Blood — the opening cut: the fist arriving, the first drop
  // already falling off the knuckles. One glyph, one drop.
  first_blood: (st) => (c) => {
    c.translate(0.46, 0.46);
    crescent(c, -0.04, 0.0, 0.4, 0.47, -2.75, -1.35, st.spark, 0.026);
    fist(c, 0.02, 0.0, 0.92, st, -0.12);
    droplet(c, 0.32, 0.34, 0.26, st);
  },
  // Shoulder Check — the tackle: the run's chevrons still arriving,
  // the dust getting there with the fist.
  shoulder_check: (st) => (c) => {
    c.translate(0.54, 0.5);
    chevrons(c, -0.46, -0.04, 0, st, 2, 1.7);
    fist(c, 0.12, -0.02, 0.98, st, 0);
    puff(c, 0.28, 0.3, 0.09, st.deep);
  },
  // War Shout — the horn note: two hard waves rolling up off the
  // raised fist, the yard already listening.
  war_shout: (st) => (c) => {
    c.translate(0.5, 0.56);
    crescent(c, 0, -0.02, 0.24, 0.36, Math.PI * 1.18, Math.PI * 1.82, st.core, 0.03);
    crescent(c, 0, -0.02, 0.44, 0.58, Math.PI * 1.22, Math.PI * 1.78, st.mid, 0.034);
    fist(c, 0, 0.14, 0.9, st, -Math.PI / 2);
    star4(c, -0.42, -0.24, 0.08, st.spark);
    star4(c, 0.42, -0.22, 0.06, st.core);
  },
  // Second Breath — the chest fills: one breath climbing off the
  // resting hand under the gathering halo.
  second_breath: (st) => (c) => {
    c.translate(0.5, 0.52);
    haloArcs(c, 0, -0.08, st);
    puff(c, -0.02, -0.34, 0.11, st.core);
    fist(c, 0, 0.14, 0.88, st, -Math.PI / 2);
  },
  // Loose Iron — everything flies: three bolts of camp iron off the
  // throwing hand, still climbing.
  loose_iron: (st) => (c) => {
    c.translate(0.42, 0.54);
    c.lineCap = 'round';
    for (const [a, d] of [[-1.05, 0.46], [-0.62, 0.52], [-0.22, 0.48]] as const) {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      c.strokeStyle = st.spark;
      c.lineWidth = 0.032;
      c.beginPath();
      c.moveTo(dx * 0.16, dy * 0.16);
      c.lineTo(dx * (d - 0.14), dy * (d - 0.14));
      c.stroke();
      c.save();
      c.translate(dx * d, dy * d);
      c.rotate(a);
      poly(c, st.core, [[-0.09, 0], [0.0, -0.055], [0.12, 0], [0.0, 0.055]], 0.028);
      c.restore();
    }
    fist(c, -0.02, 0.14, 0.82, st, -0.55);
  },
  // Hold Fast — the planted stand: knuckles down on the held ground,
  // the ward arched over the stand.
  hold_fast: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineCap = 'round';
    c.lineWidth = 0.05;
    c.globalAlpha = 0.85;
    c.beginPath();
    c.arc(0, 0.06, 0.42, Math.PI * 1.12, Math.PI * 1.88);
    c.stroke();
    c.globalAlpha = 1;
    poly(c, st.deep, [[-0.4, 0.3], [0.4, 0.3], [0.34, 0.42], [-0.34, 0.42]], 0.036);
    fill(c, st.mid, [[-0.36, 0.32], [0.36, 0.32], [0.33, 0.37], [-0.33, 0.37]]);
    fist(c, 0, -0.04, 0.88, st, Math.PI / 2);
  },
  // Break the Line — the wall in two pieces, the fist already through
  // the gap it made.
  break_the_line: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.deep, [[-0.48, -0.2], [-0.12, -0.26], [-0.09, -0.06], [-0.46, 0.0]], 0.036);
    fill(c, st.mid, [[-0.45, -0.18], [-0.15, -0.23], [-0.14, -0.16], [-0.44, -0.11]]);
    poly(c, st.deep, [[0.14, -0.28], [0.48, -0.24], [0.46, -0.04], [0.12, -0.1]], 0.036);
    fill(c, st.mid, [[0.17, -0.24], [0.44, -0.2], [0.43, -0.13], [0.16, -0.17]]);
    star4(c, 0.02, -0.28, 0.09, st.spark, Math.PI / 4);
    fist(c, 0.0, 0.14, 0.94, st, -0.3);
  },
  // The Opening — daylight in the guard: two dark panels, the bright
  // seam between them, the hand already inside it.
  the_opening: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.deep, [[-0.46, -0.36], [-0.12, -0.32], [-0.12, 0.36], [-0.46, 0.32]], 0.036);
    poly(c, st.deep, [[0.16, -0.32], [0.48, -0.36], [0.48, 0.32], [0.16, 0.36]], 0.036);
    fill(c, st.core, [[-0.11, -0.32], [0.15, -0.32], [0.15, 0.35], [-0.11, 0.35]]);
    star4(c, 0.02, -0.36, 0.08, st.spark);
    fist(c, 0.02, 0.04, 0.78, st, 0);
  },
  // No Quarter — the grindstone: two cuts chasing each other around
  // the fist that will not stop, the price already on the floor.
  no_quarter: (st) => (c) => {
    c.translate(0.5, 0.48);
    crescent(c, 0, 0.0, 0.33, 0.44, -2.85, -1.15, st.spark, 0.028);
    crescent(c, 0, 0.0, 0.33, 0.44, 0.35, 2.05, st.mid, 0.028);
    fist(c, 0, 0.0, 0.9, st, -0.1);
    droplet(c, -0.32, 0.34, 0.22, st);
  },
  // The Long Fight — the wave returns: the hard ring now, its echo
  // behind it, and the fist still up in the middle of both.
  the_long_fight: (st) => (c) => {
    c.translate(0.5, 0.52);
    c.globalAlpha = 0.45;
    novaRing(c, 0, -0.04, 0.47, st, 13, 0.14, 0.034);
    c.globalAlpha = 1;
    novaRing(c, 0, -0.04, 0.34, st, 11, 0.18, 0.05);
    fist(c, 0, 0.1, 0.84, st, -Math.PI / 2);
  },
  // Four Roads — the crossroads: four ways out of one stance, a light
  // at the end of each, the hand that walked them in the middle.
  four_roads: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.spark;
    c.lineWidth = 0.045;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.2, Math.sin(a) * 0.2);
      c.lineTo(Math.cos(a) * 0.44, Math.sin(a) * 0.44);
      c.stroke();
      ringDot(c, st.core, Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.065, 0.026);
    }
    fist(c, 0, 0.04, 0.68, st, -Math.PI / 2);
  },
} satisfies Record<string, (st: FxStyle) => Painter>);

// ---------------------------------------------- sigils & npc specials
Object.assign(PLATES, {
  // Two Answers — the champion's question settled: the heavy crossed
  // pair over the bone it was won from, both replies still ringing.
  two_answers: (st) => (c) => {
    c.translate(0.5, 0.5);
    novaRing(c, 0, 0.0, 0.45, st, 12, 0.16, 0.026);
    dagger(c, 0, 0.0, 0.86, -0.55, st);
    dagger(c, 0, 0.0, 0.86, 0.55 + Math.PI, st);
    skull(c, 0, 0.3, 0.42, st.core, st.deep);
    star4(c, 0, -0.02, 0.09, st.spark, Math.PI / 4);
  },
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
  // Vixen's Scream — the matriarch's snipe muzzle to the sky under
  // one enormous standing ear, the keen rising as a single wavering
  // thread — never the howl's smooth rings, never the cackle's broken
  // barks. (NPC special: bestiary/staging.)
  vixens_scream: (st) => (c) => {
    c.translate(0.5, 0.56);
    // THE KEEN: one thin thread wavering up and away from the muzzle.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(0.16, -0.24);
    for (let k = 1; k <= 8; k++) {
      const u = k / 8;
      c.lineTo(0.16 + u * 0.22 + Math.sin(u * Math.PI * 3) * 0.045, -0.24 - u * 0.34);
    }
    c.stroke();
    // Vixen head in profile, muzzle to the sky: the fine snipe raised
    // (needle-thin against the wolf plate's wedge), the throat line
    // dropping into the great ruff's chopped fall-away, and the
    // outsize triangular ear STANDING — the matriarch screams
    // ears-up where the wolf howls ears-back.
    c.fillStyle = st.deep;
    c.strokeStyle = st.core;
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(0.18, -0.26); // snipe tip, raised needle-fine
    c.lineTo(0.02, -0.12); // long jawline down
    c.lineTo(-0.06, 0.04); // throat
    c.lineTo(-0.12, 0.14); // ruff chop 1
    c.lineTo(-0.08, 0.2); // ruff notch
    c.quadraticCurveTo(-0.12, 0.34, -0.3, 0.4); // chest fall-away
    c.lineTo(-0.34, 0.12); // back of shoulder
    c.lineTo(-0.25, -0.02); // nape
    c.lineTo(-0.32, -0.3); // the great ear, standing tall
    c.lineTo(-0.2, -0.32); // ear tip breadth
    c.lineTo(-0.14, -0.14); // ear front down to the crown
    c.closePath();
    c.fill();
    c.stroke();
    // The soot ear-back: a dark inner line seaming the standing ear.
    c.strokeStyle = st.deep;
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(-0.27, -0.26);
    c.lineTo(-0.18, -0.1);
    c.stroke();
    // The smoke brush curled at her feet, flag up — one white tip.
    c.strokeStyle = st.core;
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(-0.28, 0.42);
    c.quadraticCurveTo(0.02, 0.46, 0.16, 0.32);
    c.stroke();
    dot(c, '#efe8d8', 0.17, 0.31, 0.036);
    // The cold jade eye — the matriarch reads through it.
    dot(c, '#9fd8a8', -0.08, -0.08, 0.032);
  },
  // Ravening Cackle — the packlord's muzzle thrown back, the laugh
  // breaking up in stuttered barks. (NPC special: bestiary/staging.)
  ravening_cackle: (st) => (c) => {
    c.translate(0.5, 0.56);
    // The cackle: broken bark-arcs, staggered ha-ha pairs — never the
    // howl's smooth rings.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    for (const [r, a0, a1, w] of [
      [0.2, -2.1, -1.6, 0.05],
      [0.3, -1.5, -1.0, 0.042],
      [0.36, -2.3, -1.9, 0.038],
      [0.46, -1.7, -1.3, 0.032],
    ] as const) {
      c.lineWidth = w;
      c.beginPath();
      c.arc(0.1, -0.12, r, a0, a1);
      c.stroke();
    }
    // Gnoll head in profile, muzzle to the sky: blunt deep jaw, the
    // tall round ear, the crest bristling down the nape.
    c.fillStyle = st.deep;
    c.strokeStyle = st.core;
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(0.16, -0.18); // blunt muzzle tip, raised
    c.lineTo(0.06, -0.04); // deep jaw
    c.lineTo(-0.06, 0.1); // throat
    c.quadraticCurveTo(-0.08, 0.3, -0.28, 0.38); // chest fall-away
    c.lineTo(-0.34, 0.1); // shoulder
    c.lineTo(-0.24, -0.04); // nape
    c.lineTo(-0.34, -0.16); // crest kick
    c.lineTo(-0.24, -0.14); // crest root
    c.lineTo(-0.26, -0.3); // tall ear back
    c.lineTo(-0.14, -0.16); // ear front to crown
    c.closePath();
    c.fill();
    c.stroke();
    // The underbite tick on the raised jaw.
    c.strokeStyle = '#efe6cf';
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(0.09, -0.07);
    c.lineTo(0.12, -0.12);
    c.stroke();
    // The scavenger's eye — bone-gold, sizing you up.
    dot(c, '#e8b64c', -0.13, -0.05, 0.032);
  },
  // Hushing Screech — the elder owl full-face, wings thrown wide, one
  // shriek-spike tearing upward. (NPC special: bestiary/staging.)
  hushing_screech: (st) => (c) => {
    c.translate(0.5, 0.58);
    // The spike: one jagged scream-line, then nothing — no rings.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(0, -0.3);
    c.lineTo(-0.05, -0.38);
    c.lineTo(0.06, -0.44);
    c.lineTo(-0.03, -0.52);
    c.stroke();
    // Wings thrown wide: stepped primary blades either side.
    c.fillStyle = st.deep;
    c.strokeStyle = st.core;
    c.lineWidth = 0.026;
    for (const side of [-1, 1] as const) {
      c.beginPath();
      c.moveTo(side * 0.08, -0.04);
      c.lineTo(side * 0.42, -0.26);
      c.lineTo(side * 0.44, -0.16);
      c.lineTo(side * 0.34, -0.12);
      c.lineTo(side * 0.38, -0.02);
      c.lineTo(side * 0.26, 0.0);
      c.lineTo(side * 0.28, 0.1);
      c.closePath();
      c.fill();
      c.stroke();
    }
    // The owl full-face: broad dome, horned tufts, the keg chest.
    c.beginPath();
    c.moveTo(-0.13, -0.3); // left tuft tip
    c.lineTo(-0.07, -0.2);
    c.lineTo(0.07, -0.2);
    c.lineTo(0.13, -0.3); // right tuft tip
    c.lineTo(0.14, -0.12); // skull side
    c.quadraticCurveTo(0.16, 0.28, 0, 0.34); // chest keel
    c.quadraticCurveTo(-0.16, 0.28, -0.14, -0.12);
    c.closePath();
    c.fill();
    c.stroke();
    // The facial disc: both lamps FORWARD — the stare is the plate.
    dot(c, st.mid, -0.065, -0.08, 0.052);
    dot(c, st.mid, 0.065, -0.08, 0.052);
    dot(c, '#f2e6a0', -0.065, -0.08, 0.034);
    dot(c, '#f2e6a0', 0.065, -0.08, 0.034);
    dot(c, st.deep, -0.065, -0.08, 0.014);
    dot(c, st.deep, 0.065, -0.08, 0.014);
    // The beak hook between the lamps, open mid-scream.
    c.strokeStyle = st.core;
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(0, -0.045);
    c.lineTo(0, 0.005);
    c.stroke();
  },
  // --------------------- THE VOICES (enemy arts): every kit ability
  // wears a bespoke plate — bestiary, staging tools, and the CMS all
  // read the foe's repertoire at a glance.
  // Firebolt — a hurled gobbet of camp-fire, streak behind it.
  goblin_firebolt: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(-0.36, 0.3);
    c.quadraticCurveTo(-0.16, 0.16, 0.06, -0.02);
    c.stroke();
    c.lineWidth = 0.034;
    c.beginPath();
    c.moveTo(-0.3, 0.14);
    c.quadraticCurveTo(-0.14, 0.04, -0.02, -0.06);
    c.stroke();
    flame(c, 0.1, -0.06, 0.46, st, 0.2);
    dot(c, st.spark, -0.22, 0.24, 0.026);
    dot(c, st.spark, -0.1, 0.1, 0.02);
  },
  // Cinder Ring — the staked mark catching: a ring of low flames.
  cinder_ring: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.4, st);
    for (const [x, y, s] of [
      [-0.3, 0.02, 0.24],
      [0.3, 0.02, 0.24],
      [-0.16, -0.1, 0.2],
      [0.16, -0.1, 0.2],
      [0, 0.1, 0.22],
    ] as const) {
      flame(c, x, y, s, st, 0.08);
    }
    ringDot(c, st.mid, 0, -0.02, 0.36, 0.026);
  },
  // Gloom Spittle — three ropes of bile, spat wide.
  gloom_spittle: (st) => (c) => {
    c.translate(0.5, 0.42);
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    for (const [ang, len] of [
      [-0.5, 0.4],
      [0, 0.46],
      [0.5, 0.4],
    ] as const) {
      c.lineWidth = 0.036;
      c.beginPath();
      c.moveTo(0, -0.18);
      c.quadraticCurveTo(Math.sin(ang) * 0.2, 0.05, Math.sin(ang) * len, 0.1 + Math.cos(ang) * 0.24);
      c.stroke();
    }
    droplet(c, -0.32, 0.36, 0.3, st);
    droplet(c, 0, 0.46, 0.36, st);
    droplet(c, 0.32, 0.36, 0.3, st);
    dot(c, st.core, 0, -0.2, 0.05);
  },
  // Miasma Ring — the haze standing up out of seeded ground.
  miasma_ring: (st) => (c) => {
    c.translate(0.5, 0.58);
    ground(c, 0, 0.4, st);
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.042;
    for (const [x, k] of [
      [-0.24, 1],
      [0, -1],
      [0.24, 1],
    ] as const) {
      c.beginPath();
      c.moveTo(x, 0.06);
      c.quadraticCurveTo(x + 0.1 * k, -0.16, x - 0.06 * k, -0.3);
      c.quadraticCurveTo(x - 0.16 * k, -0.42, x + 0.04 * k, -0.5);
      c.stroke();
    }
    dot(c, st.spark, -0.12, -0.38, 0.024);
    dot(c, st.spark, 0.18, -0.26, 0.02);
  },
  // Bone Volley — a fan of sharpened splinters, loosed.
  bone_volley: (st) => (c) => {
    c.translate(0.5, 0.62);
    for (const [ang, len] of [
      [-0.55, 0.62],
      [-0.18, 0.7],
      [0.18, 0.7],
      [0.55, 0.62],
    ] as const) {
      const dx = Math.sin(ang);
      const dy = -Math.cos(ang);
      poly(
        c,
        st.core,
        [
          [dx * 0.1 - dy * 0.03, dy * 0.1 + dx * 0.03],
          [dx * len, dy * len],
          [dx * 0.1 + dy * 0.03, dy * 0.1 - dx * 0.03],
        ],
        0.024,
      );
    }
    dot(c, st.deep, 0, 0.02, 0.06);
  },
  // Grave Mist — tomb-cold standing on the ground, a skull in it.
  grave_mist: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.4, st);
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.04;
    for (const [x, w] of [
      [-0.26, 0.14],
      [0.08, 0.18],
    ] as const) {
      c.beginPath();
      c.moveTo(x, 0.04);
      c.quadraticCurveTo(x + w, -0.12, x, -0.24);
      c.quadraticCurveTo(x - w, -0.36, x + w * 0.6, -0.46);
      c.stroke();
    }
    skull(c, 0.02, -0.14, 0.3, st.core, st.deep);
    star4(c, -0.28, -0.34, 0.06, st.spark);
    star4(c, 0.3, -0.24, 0.05, st.spark);
  },
  // Raise the Fallen — the ground answering: a skull coming UP.
  raise_the_fallen: (st) => (c) => {
    c.translate(0.5, 0.58);
    ground(c, 0, 0.42, st);
    // The rift the dead climb out of.
    poly(c, st.deep, [[-0.3, 0.02], [-0.06, -0.04], [0.2, 0.0], [0.3, 0.06], [-0.1, 0.1]], 0.024);
    skull(c, 0, -0.2, 0.44, st.core, st.deep);
    // Rising motes: the word doing its work.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.03;
    for (const x of [-0.3, 0.32] as const) {
      c.beginPath();
      c.moveTo(x, 0.02);
      c.lineTo(x * 1.1, -0.32);
      c.stroke();
    }
    dot(c, st.spark, -0.34, -0.4, 0.026);
    dot(c, st.spark, 0.36, -0.38, 0.026);
  },
  // Web Snare — the wheel across your line of retreat.
  web_snare: (st) => (c) => {
    c.translate(0.5, 0.5);
    c.strokeStyle = st.core;
    c.lineCap = 'round';
    c.lineWidth = 0.026;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.42, Math.sin(a) * 0.42);
      c.lineTo(-Math.cos(a) * 0.42, -Math.sin(a) * 0.42);
      c.stroke();
    }
    c.strokeStyle = st.mid;
    for (const r of [0.16, 0.3] as const) {
      c.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        // Sagging chords, not circles — silk hangs.
        const rr = r * (1 - 0.08 * Math.sin(i * 2.6));
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.stroke();
    }
    dot(c, st.deep, 0, 0, 0.05);
  },
  // Reaping Sweep — the set feet and the wide crescent.
  reaping_sweep: (st) => (c) => {
    c.translate(0.5, 0.54);
    // The crescent of the swing, edge-lit.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.07;
    c.beginPath();
    c.arc(0, 0.06, 0.38, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
    c.strokeStyle = st.spark;
    c.lineWidth = 0.028;
    c.beginPath();
    c.arc(0, 0.06, 0.44, Math.PI * 1.2, Math.PI * 1.8);
    c.stroke();
    blade(c, 0.02, 0.1, 0.56, -Math.PI / 5, st);
    // The set feet: two planted ticks under the swing.
    c.strokeStyle = st.deep;
    c.lineWidth = 0.05;
    for (const x of [-0.1, 0.12] as const) {
      c.beginPath();
      c.moveTo(x, 0.3);
      c.lineTo(x + 0.05, 0.4);
      c.stroke();
    }
  },
  // Rattling Volley — a fistful of shafts, none true, all flying.
  rattling_volley: (st) => (c) => {
    c.translate(0.5, 0.56);
    for (const [ang, len] of [
      [-0.7, 0.5],
      [-0.35, 0.56],
      [0, 0.6],
      [0.35, 0.56],
      [0.7, 0.5],
    ] as const) {
      arrow(c, Math.sin(ang) * 0.08, 0.1 - Math.cos(ang) * 0.02, -Math.PI / 2 + ang, len, st, 0.8);
    }
  },
  // Gnawed Mending — flesh knitting: the bloom over the wound.
  gnawed_mending: (st) => (c) => {
    c.translate(0.5, 0.52);
    orb(c, 0, 0, 0.26, st);
    // The stitches: crossing ticks over the orb.
    c.strokeStyle = st.core;
    c.lineCap = 'round';
    c.lineWidth = 0.034;
    for (const [x, y] of [
      [-0.08, -0.06],
      [0.06, 0.02],
      [-0.02, 0.1],
    ] as const) {
      c.beginPath();
      c.moveTo(x - 0.06, y + 0.06);
      c.lineTo(x + 0.06, y - 0.06);
      c.stroke();
    }
    // New growth leaving the wound: curling shoots.
    c.strokeStyle = st.mid;
    c.lineWidth = 0.04;
    for (const k of [-1, 1] as const) {
      c.beginPath();
      c.moveTo(k * 0.16, -0.14);
      c.quadraticCurveTo(k * 0.3, -0.32, k * 0.16, -0.42);
      c.stroke();
    }
    dot(c, st.spark, 0, -0.36, 0.028);
  },
  // Marrow Chill — the crypt's cold walking out in a ring.
  marrow_chill: (st) => (c) => {
    c.translate(0.5, 0.52);
    ringDot(c, st.mid, 0, 0.02, 0.34, 0.05);
    ringDot(c, st.deep, 0, 0.02, 0.44, 0.026);
    skull(c, 0, -0.04, 0.36, st.core, st.deep);
    star4(c, -0.3, -0.22, 0.07, st.spark);
    star4(c, 0.32, -0.16, 0.06, st.spark);
    star4(c, 0.02, 0.32, 0.055, st.spark);
  },
  // Rending Lunge — through you, jaws first.
  rending_lunge: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The lunge line: a hard streak with a ragged wake.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(-0.4, 0.22);
    c.lineTo(0.24, -0.1);
    c.stroke();
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(-0.42, 0.06);
    c.lineTo(0.0, -0.14);
    c.stroke();
    // The jaws at the head of it: two fang wedges, open.
    poly(c, st.core, [[0.18, -0.06], [0.44, -0.3], [0.3, -0.02]], 0.024);
    poly(c, st.core, [[0.16, 0.02], [0.46, 0.1], [0.26, 0.12]], 0.024);
    // Blood off the wake.
    droplet(c, -0.12, 0.32, 0.24, st);
    dot(c, st.deep, 0.08, 0.24, 0.03);
  },
  // THE BROTHERHOOD (the wolf crown) — three plates, one sentence.
  // Hamstring Bite — the low cut: the standing leg nicked above the heel.
  hamstring_bite: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The leg that was planted a moment ago.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.055;
    c.beginPath();
    c.moveTo(0.04, -0.4);
    c.lineTo(-0.04, 0.32);
    c.stroke();
    // The bite: a fang wedge in LOW, under everything.
    poly(c, st.core, [[-0.44, 0.16], [-0.1, 0.24], [-0.32, 0.4]], 0.024);
    // The slow: cold drag chevrons where the stride used to be.
    c.strokeStyle = st.deep;
    c.lineWidth = 0.03;
    for (const d of [0.12, 0.26] as const) {
      c.beginPath();
      c.moveTo(0.08 + d, 0.08);
      c.lineTo(0.2 + d, 0.3);
      c.stroke();
    }
    droplet(c, -0.16, 0.44, 0.18, st);
  },
  // Call the Brotherhood — the muzzle thrown up, and the eyes that answer.
  call_the_brotherhood: (st) => (c) => {
    c.translate(0.5, 0.52);
    // The call leaving the raised muzzle in nested rings.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.032;
    for (const r of [0.16, 0.27, 0.38] as const) {
      c.beginPath();
      c.arc(0.06, -0.08, r, -Math.PI * 0.75, -Math.PI * 0.15);
      c.stroke();
    }
    // The muzzle: a wedge thrown skyward.
    poly(c, st.core, [[-0.3, 0.3], [-0.02, -0.1], [0.1, 0.2]], 0.024);
    // The brotherhood answers: paired eyes opening in the dark.
    dot(c, st.spark, -0.36, -0.24, 0.032);
    dot(c, st.spark, -0.28, -0.26, 0.032);
    dot(c, st.spark, -0.4, 0.0, 0.032);
    dot(c, st.spark, -0.32, -0.02, 0.032);
  },
  // Throat Lunge — the flat silent return, straight through where you stand.
  throat_lunge: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The line of the run: dead level — no arc, no warning.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(-0.44, 0.04);
    c.lineTo(0.3, 0.0);
    c.stroke();
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(-0.44, 0.16);
    c.lineTo(-0.02, 0.12);
    c.stroke();
    // Jaws open at the head of the line.
    poly(c, st.core, [[0.22, -0.04], [0.48, -0.22], [0.34, 0.0]], 0.024);
    poly(c, st.core, [[0.2, 0.06], [0.5, 0.16], [0.3, 0.12]], 0.024);
    droplet(c, -0.2, 0.3, 0.2, st);
  },
  // Shrilling Dart — the bat folded into its scream-dive.
  shrilling_dart: (st) => (c) => {
    c.translate(0.5, 0.46);
    // The scream: nested chevrons ahead of the dive.
    c.strokeStyle = st.mid;
    c.lineCap = 'round';
    c.lineWidth = 0.032;
    for (const r of [0.2, 0.3, 0.4] as const) {
      c.beginPath();
      c.arc(0.26, 0.3, r, Math.PI * 1.15, Math.PI * 1.6);
      c.stroke();
    }
    // The folded bat, head down-right into the dive.
    c.fillStyle = st.deep;
    c.strokeStyle = st.core;
    c.lineWidth = 0.026;
    c.beginPath();
    c.moveTo(0.1, 0.12); // nose, leading the dive
    c.lineTo(-0.08, -0.02); // throat
    c.lineTo(-0.38, -0.3); // long wing swept back
    c.lineTo(-0.16, -0.16); // wing notch
    c.lineTo(-0.3, -0.02); // second finger
    c.lineTo(-0.12, 0.0); // wing root
    c.lineTo(-0.2, 0.18); // lower wing kick
    c.closePath();
    c.fill();
    c.stroke();
    dot(c, st.spark, 0.02, 0.04, 0.022);
  },

  // ------------------- THE EARTH STANDS UP — the golem arts' plates.
  // Hillstone Throw — the torn-out boulder mid-flight, dust behind it.
  hillstone_throw: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The flight line it already crossed.
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(-0.4, 0.28);
    c.quadraticCurveTo(-0.2, 0.1, 0.0, -0.02);
    c.stroke();
    // The boulder: faceted mass, lit top plane, shadowed cheek.
    poly(c, st.mid, [
      [0.02, -0.3], [0.24, -0.24], [0.34, -0.06], [0.26, 0.14],
      [0.04, 0.2], [-0.12, 0.06], [-0.1, -0.16],
    ], 0.036);
    fill(c, st.spark, [[0.02, -0.3], [0.24, -0.24], [0.12, -0.12], [-0.06, -0.18]]);
    fill(c, st.deep, [[0.26, 0.14], [0.34, -0.06], [0.2, 0.0], [0.16, 0.12]]);
    // Grit shaken loose along the arc.
    dot(c, st.spark, -0.3, 0.2, 0.024);
    dot(c, st.deep, -0.18, 0.1, 0.02);
  },
  // Quarry Ring — the ground stands up: raised slabs round a sunken heart.
  quarry_ring: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.42, st);
    // Standing stones heaved up on the rim, mismatched on purpose.
    for (const [x, y, w, h] of [
      [-0.32, -0.02, 0.13, 0.3],
      [-0.06, -0.12, 0.15, 0.38],
      [0.22, -0.05, 0.12, 0.32],
    ] as const) {
      poly(c, st.mid, [
        [x - w / 2, y], [x - w / 2 + 0.02, y - h], [x + w / 2 - 0.01, y - h - 0.04], [x + w / 2, y],
      ], 0.03);
      // Each slab's lit crown — the top plane the camera owns.
      fill(c, st.spark, [[x - w / 2 + 0.02, y - h], [x + w / 2 - 0.01, y - h - 0.04], [x + w / 2 - 0.03, y - h + 0.03], [x - w / 2 + 0.04, y - h + 0.05]]);
    }
    ringDot(c, st.deep, 0, 0.02, 0.3, 0.028);
  },
  // Anvil Fall — the anvil already falling, the floor about to ring.
  anvil_fall: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.4, st);
    // The anvil: horn, face, and waist, dropping point-down.
    poly(c, st.mid, [
      [-0.26, -0.44], [0.3, -0.44], [0.22, -0.32], [0.1, -0.3],
      [0.12, -0.16], [-0.14, -0.16], [-0.12, -0.3], [-0.34, -0.34],
    ], 0.034);
    fill(c, st.spark, [[-0.26, -0.44], [0.3, -0.44], [0.26, -0.38], [-0.28, -0.38]]);
    // Drop chevrons under the waist — it is coming DOWN.
    chevrons(c, 0, -0.04, Math.PI / 2, st, 2, 0.9);
    // The first ring of the strike, already spreading.
    c.strokeStyle = st.core;
    c.lineWidth = 0.036;
    c.beginPath();
    c.ellipse(0, 0.12, 0.3, 0.1, 0, 0, Math.PI * 2);
    c.stroke();
  },
  // Drawn Bolt — the shoulder leading, speed lines off the plates.
  drawn_bolt: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The pauldron slab, riveted, driving right.
    poly(c, st.mid, [
      [-0.18, -0.26], [0.18, -0.3], [0.32, -0.1], [0.28, 0.12], [-0.08, 0.18], [-0.24, -0.04],
    ], 0.036);
    fill(c, st.spark, [[-0.18, -0.26], [0.18, -0.3], [0.14, -0.18], [-0.14, -0.16]]);
    // Rivet tick-marks.
    dot(c, st.deep, -0.06, -0.06, 0.028);
    dot(c, st.deep, 0.12, -0.08, 0.028);
    dot(c, st.deep, 0.04, 0.06, 0.028);
    // The lane it is about to own.
    chevrons(c, -0.34, 0.02, 0, st, 2, 1.1);
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(-0.4, 0.3);
    c.lineTo(0.3, 0.26);
    c.stroke();
  },
  // Slag Gobbet — a fistful of melt, flying and shedding.
  slag_gobbet: (st) => (c) => {
    c.translate(0.5, 0.48);
    // The lobbed arc behind it.
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.042;
    c.beginPath();
    c.moveTo(-0.38, 0.32);
    c.quadraticCurveTo(-0.22, -0.06, 0.02, -0.08);
    c.stroke();
    // The gobbet: black crust lobes over a burning core.
    poly(c, st.deep, [
      [0.0, -0.26], [0.2, -0.2], [0.3, -0.02], [0.18, 0.16], [-0.04, 0.14], [-0.14, -0.06],
    ], 0.034);
    flame(c, 0.08, -0.2, 0.34, st, 0.16);
    dot(c, st.core, 0.08, -0.04, 0.07);
    // Drips that will not make it to the landing.
    droplet(c, -0.26, 0.34, 0.22, st);
    dot(c, st.spark, -0.14, 0.2, 0.024);
  },
  // Vent Ring — staked ground learning to breathe fire.
  vent_ring: (st) => (c) => {
    c.translate(0.5, 0.58);
    ground(c, 0, 0.42, st);
    // Three vent slits cut into the patch.
    c.fillStyle = st.deep;
    for (const [x, y] of [[-0.24, 0.04], [0.02, 0.1], [0.26, 0.02]] as const) {
      c.beginPath();
      c.ellipse(x, y, 0.08, 0.028, 0, 0, Math.PI * 2);
      c.fill();
    }
    // Two already speaking, one still drawing breath.
    flame(c, -0.24, -0.02, 0.3, st, 0.06);
    flame(c, 0.26, -0.04, 0.26, st, -0.08);
    dot(c, st.spark, 0.02, 0.0, 0.03);
    ringDot(c, st.mid, 0, 0.0, 0.36, 0.026);
  },
  // Crust Burst — the shell stops trying: plates blown off the heart.
  crust_burst: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The bared core.
    dot(c, st.core, 0, 0, 0.13);
    ringDot(c, st.mid, 0, 0, 0.2, 0.04);
    // Crust plates mid-flight, dark outside, lit on the torn face.
    for (const [ang, d] of [[-2.4, 0.34], [-0.9, 0.38], [0.4, 0.34], [1.7, 0.36], [2.9, 0.32]] as const) {
      const x = Math.cos(ang) * d;
      const y = Math.sin(ang) * d * 0.8;
      poly(c, st.deep, [
        [x - 0.09, y - 0.05], [x + 0.05, y - 0.1], [x + 0.1, y + 0.04], [x - 0.03, y + 0.09],
      ], 0.028);
      dot(c, st.spark, x - Math.cos(ang) * 0.08, y - Math.sin(ang) * 0.07, 0.025);
    }
    star4(c, 0, 0, 0.09, st.spark, 0.4);
  },
  // Calving Volley — three shards shorn off, flying in a fan.
  calving_volley: (st) => (c) => {
    c.translate(0.5, 0.6);
    for (const [ang, len] of [[-0.45, 0.6], [0, 0.68], [0.45, 0.6]] as const) {
      const dx = Math.sin(ang);
      const dy = -Math.cos(ang);
      // Each shard is a faceted lance: dark body, one bright facet.
      poly(c, st.mid, [
        [dx * 0.12 - dy * 0.05, dy * 0.12 + dx * 0.05],
        [dx * len, dy * len],
        [dx * 0.12 + dy * 0.05, dy * 0.12 - dx * 0.05],
      ], 0.026);
      fill(c, st.core, [
        [dx * 0.14 - dy * 0.02, dy * 0.14 + dx * 0.02],
        [dx * len, dy * len],
        [dx * 0.16, dy * 0.16],
      ]);
    }
    // The shorn shoulder they left behind.
    poly(c, st.deep, [[-0.14, 0.08], [0.14, 0.08], [0.1, 0.2], [-0.1, 0.2]], 0.028);
    dot(c, st.spark, 0.2, -0.08, 0.024);
    dot(c, st.spark, -0.2, -0.06, 0.02);
  },
  // Winter's Floor — the marked ground freezing shut.
  winters_floor: (st) => (c) => {
    c.translate(0.5, 0.54);
    // The pane: a frozen ellipse with facet seams.
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.ellipse(0, 0.08, 0.4, 0.16, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    fill(c, st.core, [[-0.3, 0.02], [-0.02, -0.04], [0.12, 0.04], [-0.16, 0.1]]);
    // The one crack, closing from the rim.
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.026;
    c.beginPath();
    c.moveTo(-0.34, 0.12);
    c.lineTo(-0.1, 0.08);
    c.lineTo(0.04, 0.12);
    c.lineTo(0.24, 0.06);
    c.stroke();
    // Hoar spikes standing on the rim.
    for (const [x, h] of [[-0.3, 0.16], [0.3, 0.14], [0.06, 0.12]] as const) {
      poly(c, st.spark, [[x - 0.045, 0.0], [x, -h], [x + 0.045, 0.0]], 0.022);
    }
    star4(c, 0.2, -0.14, 0.05, st.core);
  },

  // ---------------------------- THE HILL COMES DOWN (ogre arts,
  // docs/ogres-plan.md). Every plate is the moment BEFORE the weight
  // lands — a giant's art is all warning.
  // Skull Toll — the club at the top of its arc, the floor already
  // ringing where it will land.
  skull_toll: (st) => (c) => {
    c.translate(0.5, 0.56);
    ground(c, 0, 0.4, st);
    // The greatclub, up in both hands: haft low, mass high.
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(-0.1, 0.06);
    c.lineTo(0.08, -0.3);
    c.stroke();
    poly(c, st.mid, [
      [0.02, -0.28], [0.2, -0.46], [0.34, -0.4], [0.36, -0.22], [0.22, -0.12], [0.08, -0.18],
    ], 0.036);
    // The lit top plane, and the one iron stud it grew.
    fill(c, st.spark, [[0.02, -0.28], [0.2, -0.46], [0.26, -0.4], [0.1, -0.26]]);
    dot(c, st.deep, 0.24, -0.26, 0.028);
    // Drop chevrons: it is coming DOWN, and the first ring knows.
    chevrons(c, -0.16, -0.1, Math.PI / 2, st, 2, 0.9);
    ringDot(c, st.core, 0, 0.06, 0.26, 0.03);
  },
  // Tantrum — both fists and no thought: the flail mid-swing, the
  // impact stars already everywhere.
  ogre_tantrum: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Two ham fists on wide arcs.
    poly(c, st.mid, [[-0.34, -0.14], [-0.2, -0.24], [-0.08, -0.14], [-0.14, 0.0], [-0.3, 0.0]], 0.034);
    poly(c, st.mid, [[0.12, 0.04], [0.26, -0.06], [0.38, 0.04], [0.32, 0.18], [0.16, 0.18]], 0.034);
    fill(c, st.spark, [[-0.34, -0.14], [-0.2, -0.24], [-0.16, -0.16], [-0.3, -0.08]]);
    fill(c, st.spark, [[0.12, 0.04], [0.26, -0.06], [0.3, 0.02], [0.16, 0.1]]);
    // Knuckle ticks.
    dot(c, st.deep, -0.22, -0.06, 0.024);
    dot(c, st.deep, 0.24, 0.1, 0.024);
    // The swing arcs crossing — no plan, all directions.
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.036;
    c.beginPath();
    c.moveTo(-0.42, 0.16);
    c.quadraticCurveTo(-0.3, 0.32, -0.06, 0.3);
    c.stroke();
    c.beginPath();
    c.moveTo(0.42, -0.18);
    c.quadraticCurveTo(0.3, -0.34, 0.06, -0.32);
    c.stroke();
    // What already got hit.
    star4(c, -0.02, -0.02, 0.06, st.core);
    star4(c, 0.34, -0.24, 0.045, st.spark);
    star4(c, -0.36, 0.28, 0.045, st.spark);
  },
  // Millstone Toss — the quarried wheel mid-flight, eye showing,
  // still turning. It keeps rolling.
  millstone_toss: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The heaved arc behind it.
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(-0.4, 0.3);
    c.quadraticCurveTo(-0.24, 0.02, -0.04, -0.06);
    c.stroke();
    // The wheel: a fat disc with its center eye.
    c.fillStyle = st.mid;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.036;
    c.beginPath();
    c.ellipse(0.12, -0.1, 0.26, 0.24, -0.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // The lit rim plane and the turning spoke-shadow.
    fill(c, st.spark, [[-0.08, -0.26], [0.18, -0.32], [0.3, -0.22], [0.04, -0.16]]);
    ringDot(c, st.deep, 0.12, -0.1, 0.07, 0.03);
    c.strokeStyle = st.deep;
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(0.12, -0.32);
    c.lineTo(0.12, -0.18);
    c.stroke();
    // Grit shed off the spin.
    dot(c, st.spark, -0.2, 0.14, 0.024);
    dot(c, st.deep, -0.3, 0.24, 0.02);
  },
  // Gravel Rake — the fistful of road, already open, already wide.
  gravel_rake: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Three flight lanes fanning out.
    c.strokeStyle = st.deep;
    c.lineCap = 'round';
    c.lineWidth = 0.032;
    for (const [ex, ey] of [[0.36, -0.26], [0.4, 0.0], [0.34, 0.24]] as const) {
      c.beginPath();
      c.moveTo(-0.3, 0.06);
      c.quadraticCurveTo(0.0, (ey - 0.06) * 0.4, ex, ey);
      c.stroke();
    }
    // The stones themselves, mismatched on purpose.
    poly(c, st.mid, [[0.28, -0.32], [0.38, -0.28], [0.36, -0.18], [0.26, -0.2]], 0.028);
    poly(c, st.mid, [[0.32, -0.06], [0.44, -0.02], [0.4, 0.08], [0.3, 0.04]], 0.028);
    poly(c, st.mid, [[0.24, 0.18], [0.34, 0.2], [0.32, 0.3], [0.22, 0.28]], 0.028);
    fill(c, st.spark, [[0.28, -0.32], [0.38, -0.28], [0.32, -0.26]]);
    fill(c, st.spark, [[0.32, -0.06], [0.44, -0.02], [0.36, 0.0]]);
    // The hand that let go.
    poly(c, st.deep, [[-0.42, -0.04], [-0.28, -0.12], [-0.2, 0.02], [-0.28, 0.16], [-0.42, 0.1]], 0.03);
  },
  // Hill Bellow — the shout itself: the open maw and the rings the
  // whole valley is about to hear.
  hill_bellow: (st) => (c) => {
    c.translate(0.42, 0.5);
    // The maw: underbite open to full gape, two lower teeth proud.
    poly(c, st.mid, [[-0.3, -0.18], [0.0, -0.26], [0.08, -0.06], [0.02, 0.18], [-0.26, 0.22], [-0.36, 0.0]], 0.036);
    fill(c, st.deep, [[-0.24, -0.06], [0.0, -0.1], [0.0, 0.1], [-0.22, 0.12]]);
    // The lower teeth standing up out of the jaw.
    poly(c, st.spark, [[-0.2, 0.12], [-0.16, -0.02], [-0.12, 0.12]], 0.022);
    poly(c, st.spark, [[-0.08, 0.1], [-0.04, -0.04], [0.0, 0.1]], 0.022);
    // The voice, ringing out in widening arcs.
    c.strokeStyle = st.core;
    c.lineCap = 'round';
    for (const [r, w] of [[0.2, 0.04], [0.32, 0.034], [0.44, 0.028]] as const) {
      c.lineWidth = w;
      c.beginPath();
      c.arc(0.1, 0.0, r, -0.7, 0.7);
      c.stroke();
    }
  },
  // Shaken Stones — the hillside letting go: rocks in the air over
  // the ground that was promised to them.
  shaken_stones: (st) => (c) => {
    c.translate(0.5, 0.58);
    ground(c, 0, 0.38, st);
    // Falling stones, each with its lit crown still up.
    for (const [x, y, r] of [[-0.22, -0.34, 0.09], [0.08, -0.44, 0.07], [0.28, -0.26, 0.08]] as const) {
      poly(c, st.mid, [[x - r, y], [x - r * 0.4, y - r], [x + r * 0.7, y - r * 0.8], [x + r, y + r * 0.3], [x, y + r * 0.5]], 0.028);
      fill(c, st.spark, [[x - r * 0.4, y - r], [x + r * 0.7, y - r * 0.8], [x, y - r * 0.3]]);
    }
    // Drop chevrons between stone and shadow.
    chevrons(c, -0.2, -0.12, Math.PI / 2, st, 2, 0.8);
    chevrons(c, 0.26, -0.06, Math.PI / 2, st, 2, 0.7);
    ringDot(c, st.deep, 0, 0.0, 0.3, 0.026);
  },
  // Haunch Gnaw — supper, mid-fight: the belt haunch with a bite
  // already gone and the bone showing through.
  haunch_gnaw: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The haunch: meat mass tapering to the shank bone.
    poly(c, st.mid, [
      [-0.3, -0.18], [0.0, -0.28], [0.2, -0.16], [0.22, 0.06], [0.04, 0.18], [-0.24, 0.1],
    ], 0.036);
    fill(c, st.spark, [[-0.3, -0.18], [0.0, -0.28], [0.02, -0.16], [-0.24, -0.08]]);
    // The bite gone from the flank — the crescent of teeth that took it.
    c.fillStyle = st.deep;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.arc(0.16, -0.06, 0.11, -1.9, 1.6);
    c.fill();
    c.stroke();
    // The shank bone, knuckled at the end.
    c.strokeStyle = st.core;
    c.lineCap = 'round';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.02, 0.16);
    c.lineTo(0.3, 0.32);
    c.stroke();
    dot(c, st.core, 0.34, 0.34, 0.045);
    // The mend it buys, rising quiet.
    star4(c, -0.3, -0.32, 0.05, st.spark);
  },

  // ---------------------------- beastcraft arts (THE WILD ANSWERS THE
  // CALL). Gentle the Wild — the asking: a beast's neck bowing to an
  // open hand, the collar waiting between them, the working calm above.
  gentle_the_wild: (st) => (c) => {
    c.translate(0.5, 0.52);
    // The bowed neck, dipping in from the right.
    crescent(c, 0.16, -0.08, 0.3, 0.21, Math.PI * 0.55, Math.PI * 1.45, st.mid, 0.04);
    // The offered hand, an open cup rising from the left.
    crescent(c, -0.18, 0.1, 0.26, 0.17, -Math.PI * 0.45, Math.PI * 0.45, st.deep, 0.04);
    // The collar between them, not yet worn.
    ringDot(c, st.core, 0, 0.18, 0.11, 0.032);
    // The calm of the working, holding the air still.
    star4(c, -0.02, -0.26, 0.07, st.core);
    dot(c, st.spark, 0.22, -0.32, 0.028);
    dot(c, st.spark, -0.26, -0.14, 0.022);
  },

  // ------------------- THE KEEPER'S TONGUE — the nine words' plates.
  // THE GREEN ARTS plates — the farm's own heraldry.
  // Sower's Step — a bootprint mid-stride with seed dots trailing.
  sowers_step: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.mid, [[-0.16, -0.2], [0.06, -0.26], [0.12, 0.02], [-0.1, 0.08]], 0.04);
    poly(c, st.core, [[-0.06, 0.14], [0.1, 0.1], [0.14, 0.24], [-0.02, 0.28]], 0.035);
    dot(c, st.spark, -0.26, 0.18, 0.028);
    dot(c, st.spark, -0.32, 0.02, 0.022);
    dot(c, st.spark, -0.2, 0.32, 0.022);
  },
  // Gardener's Mend — an open palm with a sprout rising from it.
  gardeners_mend: (st) => (c) => {
    c.translate(0.5, 0.56);
    crescent(c, 0, 0.08, 0.3, 0.16, Math.PI * 0.05, Math.PI * 0.95, st.mid, 0.045);
    poly(c, st.core, [[0, 0.04], [0, -0.22]], 0.035);
    crescent(c, -0.1, -0.22, 0.12, 0.1, Math.PI * 0.9, Math.PI * 1.9, st.spark, 0.032);
    crescent(c, 0.1, -0.22, 0.12, 0.1, -Math.PI * 0.9, Math.PI * 0.1, st.spark, 0.032);
    dot(c, st.spark, 0, -0.32, 0.03);
  },
  // Earthen Brace — the driven fencepost between two ground lines.
  earthen_brace: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.core, [[-0.05, -0.3], [0.05, -0.3], [0.05, 0.22], [-0.05, 0.22]], 0.04);
    poly(c, st.mid, [[-0.3, 0.22], [0.3, 0.22]], 0.05);
    poly(c, st.mid, [[-0.22, 0.32], [0.22, 0.32]], 0.04);
    dot(c, st.spark, 0, -0.3, 0.035);
  },
  // Hearthkeeper's Calm — the low roofline over a settled ember.
  hearthkeepers_calm: (st) => (c) => {
    c.translate(0.5, 0.52);
    poly(c, st.mid, [[-0.3, 0.02], [0, -0.24], [0.3, 0.02]], 0.05);
    poly(c, st.core, [[-0.2, 0.06], [-0.2, 0.26], [0.2, 0.26], [0.2, 0.06]], 0.04);
    dot(c, st.spark, 0, 0.18, 0.05);
    dot(c, st.mid, 0, 0.18, 0.025);
  },
  // Quickening Touch — a hand's finger meeting a bursting sprout.
  quickening_touch: (st) => (c) => {
    c.translate(0.5, 0.5);
    poly(c, st.core, [[-0.26, -0.18], [-0.04, -0.04]], 0.045);
    poly(c, st.mid, [[0.04, 0.3], [0.04, 0.02]], 0.04);
    crescent(c, -0.06, 0.02, 0.14, 0.1, Math.PI * 0.85, Math.PI * 1.85, st.mid, 0.032);
    crescent(c, 0.14, 0.02, 0.14, 0.1, -Math.PI * 0.85, Math.PI * 0.15, st.mid, 0.032);
    for (const [dx, dy] of [[0.16, -0.2], [0.02, -0.28], [0.28, -0.08]] as const) {
      dot(c, st.spark, dx, dy, 0.026);
    }
  },
  // Soothe the Wild — the closed eye: a lid at rest, lashes down, one
  // feather settling beneath the quiet.
  soothe_the_wild: (st) => (c) => {
    c.translate(0.5, 0.5);
    crescent(c, 0, -0.12, 0.3, 0.2, Math.PI * 0.12, Math.PI * 0.88, st.core, 0.045);
    // Lashes, resting downward.
    for (const [lx, la] of [
      [-0.22, 0.5],
      [0, 0.35],
      [0.22, 0.2],
    ] as const) {
      poly(c, st.mid, [
        [lx, -0.02],
        [lx + 0.05 * Math.cos(Math.PI * la + Math.PI / 2), 0.08],
      ], 0.03);
    }
    // The feather settling below.
    crescent(c, -0.02, 0.24, 0.16, 0.1, -Math.PI * 0.2, Math.PI * 0.75, st.spark, 0.032);
    dot(c, st.spark, 0.24, 0.14, 0.024);
    dot(c, st.mid, -0.28, 0.3, 0.02);
  },

  // Come to Heel — the whistle and the print: sound rings leaving a
  // mouth-point, a paw already arriving under them.
  come_to_heel: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The whistle: nested rings off-center, the call going out.
    crescent(c, -0.14, -0.16, 0.13, 0.13, -Math.PI * 0.35, Math.PI * 0.35, st.core, 0.036);
    crescent(c, -0.14, -0.16, 0.22, 0.22, -Math.PI * 0.3, Math.PI * 0.3, st.mid, 0.032);
    crescent(c, -0.14, -0.16, 0.31, 0.31, -Math.PI * 0.25, Math.PI * 0.25, st.deep, 0.03);
    // The paw, arrived: pad and three toes.
    dot(c, st.core, 0.1, 0.2, 0.085);
    dot(c, st.core, -0.01, 0.09, 0.037);
    dot(c, st.core, 0.1, 0.05, 0.04);
    dot(c, st.core, 0.21, 0.09, 0.037);
    dot(c, st.spark, -0.3, -0.34, 0.024);
  },

  // Point the Fang — the pointing hand become a dart, twin fangs
  // waiting where it lands.
  point_the_fang: (st) => (c) => {
    c.translate(0.5, 0.5);
    arrow(c, -0.3, -0.22, Math.PI * 0.28, 0.34, st, 0.9);
    // The fangs: two down-teeth, bright over deep.
    fill(c, st.core, [
      [0.02, 0.08],
      [0.09, 0.32],
      [0.16, 0.08],
    ]);
    fill(c, st.spark, [
      [0.18, 0.06],
      [0.25, 0.28],
      [0.32, 0.06],
    ]);
    dot(c, st.mid, -0.24, 0.18, 0.028);
    dot(c, st.mid, -0.12, 0.28, 0.022);
  },

  // Keeper's Balm — the thrown jar breaking into a leaf: the drop,
  // the leaf it feeds, the mending glint.
  keepers_balm: (st) => (c) => {
    c.translate(0.5, 0.5);
    droplet(c, -0.1, -0.16, 0.2, st);
    // The leaf drinking it in.
    crescent(c, 0.08, 0.16, 0.24, 0.15, -Math.PI * 0.15, Math.PI * 0.85, st.mid, 0.04);
    poly(c, st.deep, [
      [-0.06, 0.3],
      [0.22, 0.02],
    ], 0.03);
    star4(c, 0.24, -0.2, 0.075, st.core);
    dot(c, st.spark, -0.3, 0.08, 0.024);
  },

  // Strewn Bait — the laid table: grain scatter, two berries, the
  // strip of meat, one scent curl above.
  strewn_bait: (st) => (c) => {
    c.translate(0.5, 0.54);
    ground(c, 0, 0.34, st);
    for (const [gx, gy, gr] of [
      [-0.2, 0.06, 0.045],
      [-0.06, 0.12, 0.05],
      [0.1, 0.04, 0.042],
      [-0.13, -0.04, 0.038],
      [0.2, 0.12, 0.045],
    ] as const) {
      dot(c, st.mid, gx, gy, gr);
    }
    dot(c, '#7a3a4a', 0.02, -0.06, 0.045);
    dot(c, '#7a3a4a', 0.24, -0.02, 0.038);
    // The strip of dried meat, angled across.
    poly(c, st.deep, [
      [-0.28, -0.12],
      [-0.08, -0.2],
    ], 0.06);
    // One scent curl rising.
    crescent(c, 0.06, -0.3, 0.1, 0.08, Math.PI * 0.6, Math.PI * 1.6, st.spark, 0.028);
  },

  // The Quiet Walk — prints through mist: three paws walking a soft
  // diagonal, the ground breathing low around them.
  the_quiet_walk: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Low mist bands.
    crescent(c, -0.05, 0.24, 0.3, 0.3, Math.PI * 1.05, Math.PI * 1.95, st.deep, 0.045);
    crescent(c, 0.1, 0.32, 0.2, 0.2, Math.PI * 1.1, Math.PI * 1.9, st.mid, 0.035);
    // The walked line: three prints, small to large, passing through.
    for (const [pxp, pyp, s] of [
      [-0.24, 0.14, 0.55],
      [-0.02, -0.04, 0.75],
      [0.2, -0.22, 1],
    ] as const) {
      dot(c, st.core, pxp, pyp, 0.052 * s);
      dot(c, st.core, pxp - 0.055 * s, pyp - 0.07 * s, 0.024 * s);
      dot(c, st.core, pxp + 0.005 * s, pyp - 0.09 * s, 0.026 * s);
      dot(c, st.core, pxp + 0.06 * s, pyp - 0.065 * s, 0.024 * s);
    }
  },

  // Blood of the Pack — one howl from two throats: facing crescents
  // over the taut cord between them.
  blood_of_the_pack: (st) => (c) => {
    c.translate(0.5, 0.5);
    // Two muzzles thrown back, facing each other.
    crescent(c, -0.2, -0.06, 0.2, 0.13, -Math.PI * 0.4, Math.PI * 0.5, st.mid, 0.042);
    crescent(c, 0.2, -0.06, 0.2, 0.13, Math.PI * 0.5, Math.PI * 1.4, st.mid, 0.042);
    // The shared howl rising between them.
    crescent(c, 0, -0.26, 0.12, 0.12, Math.PI * 1.1, Math.PI * 1.9, st.core, 0.036);
    crescent(c, 0, -0.14, 0.2, 0.2, Math.PI * 1.15, Math.PI * 1.85, st.spark, 0.03);
    // The pack cord, heartbeat-thick at its middle.
    poly(c, st.core, [
      [-0.2, 0.2],
      [0, 0.24],
      [0.2, 0.2],
    ], 0.045);
    dot(c, st.spark, 0, 0.24, 0.036);
  },

  // The Keeper's Cry — the voice that stands them up: the ray, the
  // halo finding its feet, the heartbeat rings below.
  the_keepers_cry: (st) => (c) => {
    c.translate(0.5, 0.5);
    // The cry: one bright ray falling in from on high.
    poly(c, st.core, [
      [-0.26, -0.3],
      [0.08, 0.06],
    ], 0.05);
    poly(c, st.spark, [
      [-0.3, -0.18],
      [-0.02, 0.12],
    ], 0.028);
    // The risen halo.
    crescent(c, 0.12, -0.1, 0.14, 0.09, Math.PI * 1.1, Math.PI * 1.9, st.spark, 0.032);
    // Thump, thump: the ground answering twice.
    crescent(c, 0.1, 0.24, 0.14, 0.09, Math.PI * 0.05, Math.PI * 0.95, st.mid, 0.036);
    crescent(c, 0.1, 0.28, 0.24, 0.14, Math.PI * 0.1, Math.PI * 0.9, st.deep, 0.032);
    star4(c, 0.12, -0.28, 0.06, st.core);
  },

  // Voice of the Wild — the whole tongue: echo rings wearing the
  // living crown, the wild's head raised at the center.
  voice_of_the_wild: (st) => (c) => {
    c.translate(0.5, 0.52);
    novaRing(c, 0, 0.02, 0.34, st, 10, 0.16, 0.036);
    ringDot(c, st.mid, 0, 0.02, 0.22, 0.032);
    // The raised head at the heart: muzzle up, mid-howl.
    fill(c, st.core, [
      [-0.08, 0.1],
      [-0.02, -0.12],
      [0.09, -0.06],
      [0.05, 0.1],
    ]);
    poly(c, st.core, [
      [-0.02, -0.12],
      [0.03, -0.2],
    ], 0.035);
    // The crown the rings wear.
    crown(c, 0, -0.3, 0.2, st.spark, st.core);
    dot(c, st.spark, 0.3, 0.24, 0.024);
    dot(c, st.spark, -0.3, 0.2, 0.024);
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

/**
 * Fill `el` with an ability spell-plate through the BUDGETED LANE
 * (see icons.ts): cached plates apply synchronously, cold ones bake at
 * ~3ms per frame. For burst sites only (the codex's per-technique
 * grid) — single-plate sites keep calling `abilityIconUrl` so the
 * focused art never flashes empty.
 */
export function queueAbilityIcon(el: HTMLImageElement | HTMLElement, id: string, size = 64): void {
  const st = fxStyleFor(id, undefined);
  queueIconTask(el, paintedIconUrlIfBaked(`ability:${id}`, st.mid, size), () =>
    abilityIconUrl(id, size),
  );
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
