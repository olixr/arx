/**
 * THE SIGNATURE LAW — the long steel's voice.
 *
 * THE POINT AND THE LINE. Twenty bespoke set-pieces for the polearm
 * school, built from one vocabulary and never two alike:
 *
 *  - THE THRUST CORRIDOR — a needle seam driven down the aim, laid in
 *    three strata (deep sleeve, bright core, hairline heart) with a
 *    small leaf-point HEAD at its far end. Every pierce in the school
 *    is ONE LINE DRIVEN THROUGH — never a starburst, never a ring
 *    flash. Depth over breadth is the whole fantasy.
 *  - THE HAFT'S DUST — the butt of an ash-wood pole is a blunt
 *    instrument and the ground knows it: planted butts, braced feet,
 *    and heel trenches all speak dust.kick / dust.gouge / dust.slam
 *    through the library. The wood and the steel stay the school's
 *    own unowned matter (no material owns a spear).
 *  - THE GOLD OF THE KNIGHT — gold appears in exactly three arts
 *    (knights_charge, banner_advance, sundering_lance) and nowhere
 *    else. It means MOMENTUM AND STATION, the school's two poles;
 *    spent on anything cheaper it stops meaning anything.
 *
 * THE SWEEP EXEMPTION: crescent_reap, sweeping_gyre and reapers_turn
 * are the hafted-blade's three lawful sweeps. They read as a swept
 * EDGE — a hard leading line — never as the ring flashes the nova
 * schools own, and no two carry the same second idea. crescent_reap
 * takes a partial arc with a trailing WAKE of receding edge-ghosts;
 * sweeping_gyre takes the FULL lap with an opposed counterweight;
 * reapers_turn (THE ARMORY, the glaive's own art) takes the arc as a
 * spoked WHEEL that ends in a SHOVE — one bar struck square off the
 * end of the turn, the furrows thrown outward from it. Nothing else
 * in the school swings.
 *
 * Same binding laws as every wave: hard edges only (no blur, no
 * gradients), save/restore around every hook body, squash on ground
 * y-radii, srand-deterministic geometry with frameDt-gated emission,
 * ≤ ~60 path ops per hook per frame. Melee answers land in ~300ms,
 * novas ~680, blasts ~780, beams ~480, dashes as trail + arrival —
 * the signature owns the ANSWER, never the anticipation (the breath
 * dialect owns the wind-up, and no hook here paints a telegraph).
 *
 * CHANNEL LAW: the five channels re-emit their wire per beat, so any
 * geometry that must hold still across beats is hashed from POSITION
 * (posSeed), never from the per-beat seed; growth accumulates only
 * through settled grains the world keeps — never through painted
 * state a wire cannot own.
 *
 * ID NOTE: the school's rooted-cone channel is registered as
 * `hold_the_line_polearm` — `hold_the_line` is the shield school's
 * standing art and its signature (fxSigsShield.ts) is untouched.
 */

import { shade } from './rig.js';
import { srand, burstStarPath } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { blood, dust, storm, asMatter } from './matter/index.js';

// ------------------------------------------------------------ palette
//
// The school's own unowned matter, named once: cold steel, oiled ash,
// and the knight's gold. No material in the library owns a spear.

const STEEL_WHITE = '#f4f8ff';
const STEEL_PALE = '#c8d2de';
const STEEL_MID = '#8e9aa8';
const IRON_DARK = '#4a525c';
const ASH = '#b9955f';
const ASH_DARK = '#6f5636';
const GOLD_LEAF = '#e8c04c';
const GOLD_PALE = '#fff0b8';
const GOLD_DEEP = '#9a7a1c';
/** The aftermath tone — the CHUNK RULE's straw, never darker than deep. */
const STRAW = '#d8c48a';

// ------------------------------------------------------------ helpers

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** Clamp to 0..1 — every staggered clock in the file runs on it. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE LASTING MARK — one settled grain laid at a world point (the
 * ~8 s tertiary stratum). CHUNK RULE: ≤ 0.055 tiles, straw and steel
 * tones only, never darker than the style's deep.
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: { life?: number; size?: number; flicker?: number; fade?: string; fadeAt?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05, life: opts.life ?? 8, size: Math.min(0.055, opts.size ?? 0.045),
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
  });
}

/**
 * Channel-stable seed: hashed from the wire's POSITION so a picket
 * row, a corridor, or a held bar holds still while the channel
 * breathes beat to beat.
 */
function posSeed(c: SigCtx, salt: number): number {
  return (Math.floor(c.wx * 8) * 73) ^ (Math.floor(c.wy * 8) * 151) ^ salt;
}

/** Which beat of a re-broadcast channel this wire is: bornAt / cadence. */
function beatIndex(c: SigCtx, cadenceMs: number): number {
  return Math.floor((c.now - c.age) / cadenceMs);
}

/** Crossing-frame gate on the life fraction of a fixed-ms wire. */
function crossed(c: SigCtx, wireMs: number, at: number): boolean {
  const tPrev = c.t - (c.frameDt * 1000) / wireMs;
  return tPrev < at && c.t >= at;
}

/**
 * The far end of a run. Dash and beam wires carry a true second
 * anchor; everything else drives its own reach down the aim, so every
 * signature can be written as if it always had a line.
 */
function run(c: SigCtx): { x0: number; y0: number; x1: number; y1: number; a: number; len: number } {
  const dx = c.px2 - c.px;
  const dy = c.py2 - c.py;
  const far = Math.hypot(dx, dy) > c.sc * 0.25;
  const x1 = far ? c.px2 : c.px + Math.cos(c.dir) * c.rPx;
  const y1 = far ? c.py2 : c.py + Math.sin(c.dir) * c.rPx * c.squash;
  return {
    x0: c.px, y0: c.py, x1, y1,
    a: Math.atan2(y1 - c.py, x1 - c.px),
    len: Math.hypot(x1 - c.px, y1 - c.py) || 1,
  };
}

/** The same run in world coords — for matter and for laid grains. */
function runW(c: SigCtx): { x1: number; y1: number } {
  const far = Math.hypot(c.wx2 - c.wx, c.wy2 - c.wy) > 0.25;
  return far
    ? { x1: c.wx2, y1: c.wy2 }
    : { x1: c.wx + Math.cos(c.dir) * c.radius, y1: c.wy + Math.sin(c.dir) * c.radius };
}

/**
 * THE THRUST CORRIDOR, the school's one shared centerpiece grammar:
 * a deep sleeve, a bright core riding inside it, and a hairline heart
 * down the middle. THE WEIGHT RULE lives here — the sleeve is never
 * thinner than max(2.5, sc·0.06), so no pierce in the school ever
 * reads as a scratch. Three stroke ops.
 */
function seam(
  c: SigCtx,
  x0: number, y0: number, x1: number, y1: number,
  o: { w?: number; alpha?: number; sleeve?: string; core?: string; heart?: string } = {},
): void {
  const { ctx, sc } = c;
  const base = Math.max(2.5, sc * 0.06) * (o.w ?? 1);
  const al = o.alpha ?? 1;
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 0.55 * al;
  ctx.strokeStyle = o.sleeve ?? IRON_DARK;
  ctx.lineWidth = base;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.globalAlpha = 0.92 * al;
  ctx.strokeStyle = o.core ?? STEEL_PALE;
  ctx.lineWidth = base * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.globalAlpha = 0.95 * al;
  ctx.strokeStyle = o.heart ?? STEEL_WHITE;
  ctx.lineWidth = Math.max(1, base * 0.16);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/**
 * THE LEAF POINT — the school glyph's head, a small four-sided leaf
 * with a lit forward facet. Every corridor ends in one; nothing else
 * in the game wears it.
 */
function leafHead(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, a: number, size: number, squash: number,
  body: string, lit: string,
): void {
  const cx = Math.cos(a);
  const sy = Math.sin(a) * squash;
  const nx = -Math.sin(a);
  const ny = Math.cos(a) * squash;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x + cx * size, y + sy * size);
  ctx.lineTo(x + nx * size * 0.34 - cx * size * 0.5, y + ny * size * 0.34 - sy * size * 0.5);
  ctx.lineTo(x - cx * size * 0.95, y - sy * size * 0.95);
  ctx.lineTo(x - nx * size * 0.34 - cx * size * 0.5, y - ny * size * 0.34 - sy * size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.moveTo(x + cx * size, y + sy * size);
  ctx.lineTo(x + nx * size * 0.2 - cx * size * 0.4, y + ny * size * 0.2 - sy * size * 0.4);
  ctx.lineTo(x - cx * size * 0.2, y - sy * size * 0.2);
  ctx.closePath();
  ctx.fill();
}

// -------------------------------------------------------- lunging_skewer

/**
 * LUNGING_SKEWER — "the reach that surprises."
 * The school's first word and its whole thesis in 300ms: from a
 * standing body ONE needle corridor snaps out past every melee range
 * in the game, OVERSHOOTS its own reach by a hair, and is gone —
 * withdrawn back down its own line before the eye finishes reading
 * it. The lunge is legible on the floor, not in the air: a single
 * skid streak where the front foot went, two toe scuffs where the
 * back foot did not. Nothing sweeps, nothing flowers. One line.
 */
const lunging_skewer: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    blood.deployments.spray!(m, w.x1, w.y1, { dir: c.dir, scale: 0.4 });
    dust.deployments.kick!(m, c.wx + Math.cos(c.dir) * 0.35, c.wy + Math.sin(c.dir) * 0.35, { scale: 0.3 });
    const rand = srand(c.seed ^ 0x9a01);
    for (let k = 0; k < 3; k++) {
      const f = 0.62 + rand() * 0.34;
      lay(c, c.wx + Math.cos(c.dir) * c.radius * f, c.wy + Math.sin(c.dir) * c.radius * f,
        k === 1 ? STEEL_PALE : STRAW, { life: 7 + rand(), size: 0.04, fade: ASH_DARK, fadeAt: 0.6 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const r = run(c);
    ctx.save();
    // THE DRIVE AND THE WITHDRAW: out fast on an ease-out, held for
    // two frames at overshoot, hauled home on an ease-in.
    const outU = cl(c.t / 0.34);
    const backU = cl((c.t - 0.46) / 0.4);
    const reach = (1 - (1 - outU) * (1 - outU)) * 1.06 - backU * backU * 1.06;
    if (reach <= 0.02) { ctx.restore(); return; }
    const tipX = r.x0 + Math.cos(r.a) * r.len * reach;
    const tipY = r.y0 + Math.sin(r.a) * r.len * reach;
    const fade = 1 - cl((c.t - 0.8) / 0.2);
    const lift = sc * 0.4;
    ctx.translate(0, -lift);
    seam(c, r.x0, r.y0, tipX, tipY, { alpha: fade });
    leafHead(ctx, tipX, tipY, r.a, sc * 0.17, squash, STEEL_MID, STEEL_WHITE);
    // The overshoot flash: the single frame the point is furthest out.
    if (outU >= 1 && backU <= 0) {
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = STEEL_WHITE;
      ctx.beginPath();
      burstStarPath(ctx, tipX, tipY, sc * 0.24, sc * 0.05, 4, dir, squash);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * reach, c.wy + Math.sin(dir) * c.radius * reach, 0.5, 0.22 * fade);
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.55) / 0.45);
    const skid = cl(c.t / 0.3);
    ctx.save();
    // The front foot's skid: one streak down the aim, lit at its stop.
    const s0 = pt(c, sc * 0.2, dir);
    const s1 = pt(c, sc * (0.2 + 0.75 * skid), dir);
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * fade * skid;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s1.x - Math.cos(dir) * sc * 0.12, s1.y - Math.sin(dir) * sc * 0.12 * squash);
    ctx.stroke();
    // The back foot stayed: two short toe scuffs behind the heart.
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = ASH_DARK;
    for (const side of [-1, 1] as const) {
      const p = pt(c, sc * 0.3, dir + Math.PI + side * 0.3);
      ctx.fillRect(p.x - sc * 0.04, p.y - sc * 0.02, sc * 0.08, sc * 0.035);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ haft_strike

/**
 * HAFT_STRIKE — "the butt end."
 * The one art in the school with no point in it at all: the pole is
 * REVERSED and the iron-ferruled butt cap goes into a chest at arm's
 * length. The read is blunt on purpose — a short thick ash stub with
 * its ferrule ring lit, and in front of it THE PRESSURE BAR: a flat
 * straight-edged bar of displaced air shoved out along the aim, the
 * opposite of every wave and ring in the game. The ground pays for
 * the shove: the caster's braced heel digs a trench BACKWARD while
 * the low dust fans forward off the cap.
 */
const haft_strike: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    // Ash-wood butt strikes kick low dust — and shove it down the aim.
    dust.deployments.gouge!(m, hx, hy, { dir: c.dir, scale: 0.7 });
    dust.deployments.kick!(m, c.wx - Math.cos(c.dir) * 0.3, c.wy - Math.sin(c.dir) * 0.3, { scale: 0.45 });
    const rand = srand(c.seed ^ 0x9a02);
    for (let k = 0; k < 4; k++) {
      const a = c.dir + (rand() - 0.5) * 1.3;
      const d = c.radius * (0.6 + rand() * 0.7);
      lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d, STRAW,
        { life: 6.5 + rand(), size: 0.042, fade: ASH_DARK, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    if (c.t > 0.85) return;
    const f = c.t / 0.85;
    const drive = cl(f * 2.2);
    const fade = 1 - cl((f - 0.55) / 0.45);
    const lift = sc * 0.34;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    // THE BUTT CAP: a thick ash stub with a dark ferrule collar and a
    // lit iron cap face — short, heavy, and unmistakably not a point.
    const reach = c.rPx * (0.25 + 0.6 * drive);
    const p = pt(c, reach, dir);
    const w = sc * 0.11;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(4, sc * 0.14);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(dir) * sc * 0.5, p.y - Math.sin(dir) * sc * 0.5 * squash - lift);
    ctx.lineTo(p.x, p.y - lift);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(dir) * sc * 0.46, p.y - Math.sin(dir) * sc * 0.46 * squash - lift);
    ctx.lineTo(p.x - Math.cos(dir) * sc * 0.08, p.y - Math.sin(dir) * sc * 0.08 * squash - lift);
    ctx.stroke();
    // The ferrule ring, then the flat cap face.
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(2.5, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(dir) * sc * 0.1 + nx * w, p.y - Math.sin(dir) * sc * 0.1 * squash + ny * w - lift);
    ctx.lineTo(p.x - Math.cos(dir) * sc * 0.1 - nx * w, p.y - Math.sin(dir) * sc * 0.1 * squash - ny * w - lift);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = STEEL_MID;
    ctx.beginPath();
    ctx.moveTo(p.x + nx * w, p.y + ny * w - lift);
    ctx.lineTo(p.x - nx * w, p.y - ny * w - lift);
    ctx.lineTo(p.x - nx * w * 0.8 + Math.cos(dir) * sc * 0.05, p.y - ny * w * 0.8 + Math.sin(dir) * sc * 0.05 * squash - lift);
    ctx.lineTo(p.x + nx * w * 0.8 + Math.cos(dir) * sc * 0.05, p.y + ny * w * 0.8 + Math.sin(dir) * sc * 0.05 * squash - lift);
    ctx.closePath();
    ctx.fill();
    // THE PRESSURE BAR: flat, straight-ended, leaving square. Air
    // shoved, not a wave — the school's blunt punctuation.
    if (drive >= 1) {
      const bu = cl((f - 0.4) / 0.5);
      const bp = pt(c, reach + c.rPx * 0.25 + sc * 0.7 * bu, dir);
      const bw = sc * (0.34 + 0.3 * bu);
      ctx.globalAlpha = 0.75 * (1 - bu);
      ctx.strokeStyle = STEEL_PALE;
      ctx.lineWidth = Math.max(2.5, sc * 0.055 * (1 - bu * 0.5));
      ctx.beginPath();
      ctx.moveTo(bp.x + nx * bw, bp.y + ny * bw - lift);
      ctx.lineTo(bp.x - nx * bw, bp.y - ny * bw - lift);
      ctx.stroke();
      ctx.globalAlpha = 0.5 * (1 - bu);
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      for (const side of [-1, 1] as const) {
        ctx.moveTo(bp.x + nx * bw * side, bp.y + ny * bw * side - lift);
        ctx.lineTo(bp.x + nx * bw * side - Math.cos(dir) * sc * 0.16,
          bp.y + ny * bw * side - Math.sin(dir) * sc * 0.16 * squash - lift);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.5) / 0.5);
    ctx.save();
    // THE BRACED HEEL: the shove pushes the caster back, so the trench
    // digs BACKWARD — the only ground mark in the school that does.
    const dig = cl(c.t / 0.25);
    const h0 = pt(c, sc * 0.16, dir + Math.PI);
    const h1 = pt(c, sc * (0.16 + 0.5 * dig), dir + Math.PI);
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.moveTo(h0.x, h0.y);
    ctx.lineTo(h1.x, h1.y);
    ctx.stroke();
    ctx.globalAlpha = 0.55 * fade * dig;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(h1.x, h1.y - sc * 0.03);
    ctx.lineTo(h0.x, h0.y - sc * 0.03);
    ctx.stroke();
    // The low fan of grit driven off the cap, a wedge on the floor.
    const fp = pt(c, c.rPx * 0.85, dir);
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = shade(ASH, -14);
    ctx.beginPath();
    ctx.moveTo(fp.x, fp.y);
    ctx.lineTo(fp.x + Math.cos(dir + 0.5) * sc * 0.7, fp.y + Math.sin(dir + 0.5) * sc * 0.7 * squash);
    ctx.lineTo(fp.x + Math.cos(dir - 0.5) * sc * 0.7, fp.y + Math.sin(dir - 0.5) * sc * 0.7 * squash);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

// ----------------------------------------------------------- hooking_reap

/**
 * HOOKING_REAP — "the hook comes home."
 * The one art in the school anchored OUT THERE: the wire lands where
 * the beak bit, and everything the read does travels back toward the
 * caster. A single drawn haft runs out of the heart down the back
 * bearing — the pole under tension, painted as a taut line and not a
 * thrust — with the iron beak closed at its head; on the floor, the
 * pull is a set of drag furrows CONVERGING on the bite from the rim,
 * their scuff chevrons all pointing inward. No ring, no bloom: this
 * is the only art in the game whose ground marks run inward, and
 * that inversion is the whole read of a pull.
 */
const hooking_reap: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x9a03);
    const back = c.dir + Math.PI;
    // The bite is at the heart; the catch is dragged down the back
    // bearing, so both the blood and the earth throw HOMEWARD.
    blood.deployments.spray!(m, c.wx, c.wy, { dir: back, scale: 0.45 });
    dust.deployments.gouge!(m, c.wx, c.wy, { dir: back, scale: 0.6 });
    // The comet trail of straw torn up on the way in, thinning out.
    for (let k = 0; k < 5; k++) {
      const f = 0.2 + (k / 4) * 0.85;
      lay(c, c.wx + Math.cos(back) * c.radius * f + (rand() - 0.5) * 0.14,
        c.wy + Math.sin(back) * c.radius * f + (rand() - 0.5) * 0.12,
        k === 0 ? STEEL_PALE : STRAW,
        { life: 7 + rand(), size: 0.048 - k * 0.003, fade: ASH_DARK, fadeAt: 0.6 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.7) / 0.3);
    const back = dir + Math.PI;
    // The haul: the beak sets at the heart, then the whole line is
    // drawn back down the bearing, easing in as the weight comes.
    const pull = cl((c.t - 0.12) / 0.6);
    const at = pull * pull * 0.7;
    const lift = sc * 0.36;
    const hx = c.px + Math.cos(back) * c.rPx * at;
    const hy = c.py + Math.sin(back) * c.rPx * at * squash - lift;
    const nx = -Math.sin(back);
    const ny = Math.cos(back) * squash;
    ctx.save();
    // THE TAUT TETHER: the haft from the hook out to the caster's
    // hands, drawn as ash under tension — never a thrust corridor.
    seam(c, hx, hy, c.px + Math.cos(back) * c.rPx * 1.1,
      c.py + Math.sin(back) * c.rPx * 1.1 * squash - lift,
      { w: 0.85, alpha: fade, sleeve: ASH_DARK, core: ASH, heart: STRAW });
    // THE BEAK: a hard curve opening back down the bearing — dark
    // spine, lit inner edge. The only curve here that is not a sweep.
    const hs = sc * 0.24;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(dir) * hs, hy + Math.sin(dir) * hs * squash);
    ctx.lineTo(hx + nx * hs * 0.9, hy + ny * hs * 0.9);
    ctx.lineTo(hx + Math.cos(back) * hs * 0.55 + nx * hs * 0.3,
      hy + Math.sin(back) * hs * 0.55 * squash + ny * hs * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = STEEL_WHITE;
    ctx.lineWidth = Math.max(1.2, sc * 0.025);
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(dir) * hs * 0.85, hy + Math.sin(dir) * hs * 0.85 * squash);
    ctx.lineTo(hx + nx * hs * 0.7, hy + ny * hs * 0.7);
    ctx.stroke();
    // The catch: one hard glint the frame the beak takes hold.
    if (c.t > 0.1 && c.t < 0.2) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = STEEL_WHITE;
      ctx.beginPath();
      burstStarPath(ctx, c.px, c.py - lift, sc * 0.2, sc * 0.05, 4, dir, squash);
      ctx.fill();
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.65) / 0.35);
    const pull = cl((c.t - 0.08) / 0.62);
    const rand = srand(c.seed ^ 0x9a04);
    ctx.save();
    // THE CONVERGING FURROWS: four drags scraped from the rim IN to
    // the bite, lengthening as the pull lands. Everything runs inward.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(ASH_DARK, -8);
    ctx.lineWidth = Math.max(2.5, sc * 0.075);
    ctx.beginPath();
    const angs: number[] = [];
    for (let k = 0; k < 4; k++) {
      const a = dir + Math.PI + (k - 1.5) * 0.55 + (rand() - 0.5) * 0.2;
      angs.push(a);
      const outer = c.rPx * (0.75 + rand() * 0.3);
      const inner = outer * (1 - 0.75 * pull);
      ctx.moveTo(c.px + Math.cos(a) * outer, c.py + Math.sin(a) * outer * squash);
      ctx.lineTo(c.px + Math.cos(a) * inner, c.py + Math.sin(a) * inner * squash);
    }
    ctx.stroke();
    // The scuff chevrons point AT the bite — the read that says PULL.
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    for (const a of angs) {
      const d = c.rPx * (0.35 + 0.35 * (1 - pull));
      const q = { x: c.px + Math.cos(a) * d, y: c.py + Math.sin(a) * d * squash };
      for (const side of [-1, 1] as const) {
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x + Math.cos(a + Math.PI + side * 0.7) * sc * 0.16,
          q.y + Math.sin(a + Math.PI + side * 0.7) * sc * 0.16 * squash);
      }
    }
    ctx.stroke();
    // The bite itself: a small dark pock the furrows all run to.
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = shade(ASH_DARK, -16);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.1, sc * 0.1 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

// ---------------------------------------------------------- vaulting_step

/**
 * VAULTING_STEP — "the planted haft."
 * A dash that pivots on a fixed point in the world: the butt goes
 * into the dirt and STAYS there while the body swings over it. The
 * plant pock — a dark round bite with grit cracks radiating out — is
 * the centerpiece nothing else owns, and the haft above it is painted
 * as a real lever, leaning back at the plant, vertical at the apex,
 * leaning forward at the landing. The vault's chord hangs briefly as
 * a dotted arc so the eye can see the body went OVER, not through.
 */
const vaulting_step: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.7 });
    dust.deployments.gouge!(m, w.x1, w.y1, { dir: c.dir, scale: 0.5 });
    const rand = srand(c.seed ^ 0x9a05);
    // The pock keeps its rim of thrown grit; the landing keeps a pair.
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + rand() * 0.5;
      lay(c, c.wx + Math.cos(a) * 0.22, c.wy + Math.sin(a) * 0.18, STRAW,
        { life: 7, size: 0.04, fade: ASH_DARK, fadeAt: 0.55 });
    }
    for (const side of [-1, 1] as const) {
      lay(c, w.x1 + Math.cos(c.dir + side * 1.4) * 0.16, w.y1 + Math.sin(c.dir + side * 1.4) * 0.13,
        ASH, { life: 6.5, size: 0.045, fade: ASH_DARK, fadeAt: 0.5 });
    }
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.6) / 0.4);
    ctx.save();
    // THE PLANT POCK: a bitten hole with four grit cracks off its rim.
    const pr = sc * 0.14;
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(ASH_DARK, -18);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, pr, pr * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(1.2, sc * 0.024);
    const rand = srand(c.seed ^ 0x9a06);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + rand() * 0.7;
      ctx.moveTo(c.px + Math.cos(a) * pr, c.py + Math.sin(a) * pr * squash);
      ctx.lineTo(c.px + Math.cos(a) * pr * 2.4, c.py + Math.sin(a) * pr * 2.4 * squash);
    }
    ctx.stroke();
    // THE VAULT CHORD: the flight path as a dotted arc on the floor —
    // dashes, not a line, so it reads as a hop and not a charge.
    const show = cl(c.t / 0.4);
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = STRAW;
    for (let k = 1; k <= 5; k++) {
      const f = k / 6;
      if (f > show) break;
      const g = sc * 0.035;
      ctx.fillRect(r.x0 + (r.x1 - r.x0) * f - g / 2, r.y0 + (r.y1 - r.y0) * f - g / 2, g, g);
    }
    // The landing bar: where the point came down, blunt and short.
    if (c.t > 0.42) {
      const lf = 1 - cl((c.t - 0.42) / 0.5);
      ctx.globalAlpha = 0.7 * lf;
      ctx.strokeStyle = ASH_DARK;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(r.x1 - Math.sin(r.a) * sc * 0.24, r.y1 + Math.cos(r.a) * sc * 0.24 * squash);
      ctx.lineTo(r.x1 + Math.sin(r.a) * sc * 0.24, r.y1 - Math.cos(r.a) * sc * 0.24 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    if (c.t > 0.62) return;
    const u = c.t / 0.62;
    const fade = 1 - cl((u - 0.6) / 0.4);
    ctx.save();
    // THE LEVER: the haft pivots on the pock — back-lean, vertical,
    // forward-lean — with the hands' bright grip riding up the shaft.
    const lean = (u - 0.45) * 2.0;
    const L = sc * 1.15;
    const tipX = c.px + Math.cos(r.a) * L * lean * 0.8;
    const tipY = c.py + Math.sin(r.a) * L * lean * 0.8 * squash - L * Math.sqrt(Math.max(0.05, 1 - lean * lean * 0.6));
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(3.5, sc * 0.09);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.moveTo(c.px + (tipX - c.px) * 0.1, c.py + (tipY - c.py) * 0.1);
    ctx.lineTo(c.px + (tipX - c.px) * 0.92, c.py + (tipY - c.py) * 0.92);
    ctx.stroke();
    // The grip: a short bright band sliding up the lever as it turns.
    const gf = 0.35 + 0.4 * u;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = STEEL_PALE;
    ctx.lineWidth = Math.max(3, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(c.px + (tipX - c.px) * gf, c.py + (tipY - c.py) * gf);
    ctx.lineTo(c.px + (tipX - c.px) * (gf + 0.1), c.py + (tipY - c.py) * (gf + 0.1));
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------- perfect_thrust

/**
 * PERFECT_THRUST — "one breath, one line."
 * The drawn breath is the dialect's business; the signature is the
 * SPENDING of it. The corridor is measured before it is used: three
 * fine ruler ticks step out along the aim in sequence, each snapping
 * on with a click of light — and the instant the third lands the
 * whole line goes WHITE at once, end to end, no travel, no wavefront.
 * Nothing in the school is straighter, and nothing else measures
 * before it strikes. Three steel grains lie at the far tick after.
 */
const perfect_thrust: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    blood.deployments.spray!(m, w.x1, w.y1, { dir: c.dir, scale: 0.55 });
    const rand = srand(c.seed ^ 0x9a07);
    for (let k = 0; k < 3; k++) {
      lay(c, w.x1 + (rand() - 0.5) * 0.24, w.y1 + (rand() - 0.5) * 0.2, STEEL_PALE,
        { life: 8, size: 0.04, flicker: k === 0 ? 5 : 0, fade: STRAW, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.72) / 0.28);
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    const lift = sc * 0.42;
    ctx.save();
    ctx.translate(0, -lift);
    // THE MEASURE: three ruler ticks stepping out along the corridor,
    // 0.06 / 0.16 / 0.26 — the aim being checked, not a wind-up.
    const stops = [0.4, 0.68, 0.96];
    ctx.strokeStyle = STEEL_PALE;
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    for (let k = 0; k < 3; k++) {
      const on = 0.06 + k * 0.1;
      if (c.t < on) continue;
      const q = 1 - cl((c.t - on) / 0.5);
      const p = pt(c, r.len * stops[k]!, r.a);
      const h = sc * (0.1 + k * 0.03);
      ctx.globalAlpha = (0.35 + 0.55 * q) * fade;
      ctx.beginPath();
      ctx.moveTo(p.x + nx * h, p.y + ny * h);
      ctx.lineTo(p.x - nx * h, p.y - ny * h);
      ctx.stroke();
    }
    // THE SPENDING: the whole line whitens at once at the third tick —
    // full corridor, no travel, held bright then gone.
    if (c.t >= 0.26) {
      const k = 1 - cl((c.t - 0.26) / 0.5);
      seam(c, r.x0, r.y0, r.x1, r.y1, { w: 1.15, alpha: fade * (0.45 + 0.55 * k) });
      leafHead(ctx, r.x1, r.y1, r.a, sc * 0.2 * (0.7 + 0.3 * k), squash, STEEL_MID, STEEL_WHITE);
      if (c.t < 0.36) {
        const f = 1 - (c.t - 0.26) / 0.1;
        ctx.globalAlpha = 0.95 * f;
        ctx.fillStyle = STEEL_WHITE;
        ctx.beginPath();
        burstStarPath(ctx, r.x1, r.y1, sc * (0.16 + 0.24 * f), sc * 0.04, 4, dir, squash);
        ctx.fill();
      }
    }
    ctx.restore();
    if (c.t >= 0.26) c.glow(runW(c).x1, runW(c).y1, 0.7, 0.35 * fade);
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.6) / 0.4);
    ctx.save();
    // The corridor's own shadow, a single hairline — the SLAB RULE
    // honored by refusing the slab entirely: this art is only edges.
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = shade(IRON_DARK, -6);
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(r.x0, r.y0);
    ctx.lineTo(r.x1, r.y1);
    ctx.stroke();
    // The stance bar: both feet squared behind the line, drawn once.
    const b = pt(c, sc * 0.18, dir + Math.PI);
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(b.x - Math.sin(dir) * sc * 0.22, b.y + Math.cos(dir) * sc * 0.22 * squash);
    ctx.lineTo(b.x + Math.sin(dir) * sc * 0.22, b.y - Math.cos(dir) * sc * 0.22 * squash);
    ctx.stroke();
    ctx.restore();
  },
};

// -------------------------------------------------------- flurry_of_points

/**
 * FLURRY_OF_POINTS — "the multi-stab."
 * The channel's needle corridor holds still (hashed from the ground
 * it stands on) while the POINTS do the moving: each beat fires three
 * pricks at different depths down the corridor on staggered sub-beat
 * clocks — near, far, middle — so the stutter is visible as rhythm
 * rather than a blur. Nothing grows in paint; the growth is on the
 * FLOOR. Every beat settles two steel glints down the line, and by
 * the third beat the corridor is a lit track of spent points that
 * outlives the channel by eight seconds.
 */
const flurry_of_points: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(posSeed(c, 0x9a08) ^ beatIndex(c, 800));
    const w = runW(c);
    blood.deployments.spray!(m, w.x1, w.y1, { dir: c.dir, scale: 0.28 });
    // THE ACCUMULATION: two glints per beat, laid where the pricks bit.
    for (let k = 0; k < 2; k++) {
      const f = 0.35 + rand() * 0.6;
      lay(c, c.wx + Math.cos(c.dir) * c.radius * f + (rand() - 0.5) * 0.16,
        c.wy + Math.sin(c.dir) * c.radius * f + (rand() - 0.5) * 0.14,
        STEEL_PALE, { life: 8, size: 0.036, flicker: 4, fade: STRAW, fadeAt: 0.6 });
    }
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const beatMs = (c.ticks ?? 16) * 50;
    const rand = srand(posSeed(c, 0x9a09));
    const lift = sc * 0.4;
    ctx.save();
    ctx.translate(0, -lift);
    // THE CORRIDOR: two hairline walls, position-hashed so they do not
    // twitch between beats. Narrow — arcHalf 0.35 made visible.
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    const halfW = sc * 0.17;
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(1.2, sc * 0.024);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(r.x0 + nx * halfW * side, r.y0 + ny * halfW * side);
      ctx.lineTo(r.x1 + nx * halfW * side * 0.55, r.y1 + ny * halfW * side * 0.55);
    }
    ctx.stroke();
    // THE PRICKS: three, staggered near/far/middle, each out and back
    // inside its own third of the beat. The stutter IS the art.
    const depths = [0.55, 1, 0.78];
    for (let k = 0; k < 3; k++) {
      const on = 0.05 + k * 0.26;
      const u = cl((c.t - on) / 0.2);
      if (u <= 0 || u >= 1) continue;
      const stab = Math.sin(u * Math.PI);
      const off = (rand() - 0.5) * halfW * 1.2;
      const d = r.len * depths[k]! * (0.5 + 0.5 * stab);
      const x1 = r.x0 + Math.cos(r.a) * d + nx * off;
      const y1 = r.y0 + Math.sin(r.a) * d + ny * off;
      seam(c, r.x0 + nx * off * 0.3, r.y0 + ny * off * 0.3, x1, y1, { w: 0.62, alpha: 0.4 + 0.6 * stab });
      leafHead(ctx, x1, y1, r.a, sc * 0.11, squash, STEEL_MID, STEEL_WHITE);
    }
    ctx.restore();
    // Each prick's own hot bloom at the depth it reached.
    for (let k = 0; k < 3; k++) {
      if (crossed(c, beatMs, 0.15 + k * 0.26)) {
        const d = c.radius * depths[k]!;
        c.particles.burst(c.wx + Math.cos(c.dir) * d, c.wy + Math.sin(c.dir) * d, 2,
          [STEEL_WHITE, STEEL_PALE], {
            speed: 1.6, life: 0.22, size: 0.045, gravity: 0, shape: 'glint',
            dir: c.dir, spread: 0.5,
          });
      }
    }
  },
  ground(c) {
    const { ctx, sc } = c;
    const r = run(c);
    ctx.save();
    // The track under the corridor: the SLAB RULE at its ceiling —
    // 0.2 alpha of floor, all the story in the two lit end caps.
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = shade(IRON_DARK, -4);
    ctx.lineWidth = Math.max(3, sc * 0.3);
    ctx.beginPath();
    ctx.moveTo(r.x0, r.y0);
    ctx.lineTo(r.x1, r.y1);
    ctx.stroke();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    ctx.moveTo(r.x1 + Math.sin(r.a) * sc * 0.18, r.y1 - Math.cos(r.a) * sc * 0.18 * c.squash);
    ctx.lineTo(r.x1 - Math.sin(r.a) * sc * 0.18, r.y1 + Math.cos(r.a) * sc * 0.18 * c.squash);
    ctx.stroke();
    ctx.restore();
  },
};

// ----------------------------------------------------------- crescent_reap

/**
 * CRESCENT_REAP — "the glaive's one answer."
 * THE SWEEP EXEMPTION, first of two. The read is an EDGE, not a ring:
 * a hard bright leading line rides a partial arc, and behind it four
 * receding edge-ghosts hang where the edge just was, each thinner and
 * dimmer than the last. The wake is the point — a ring flash says
 * "explosion"; four trailing edges say "a heavy blade went through
 * here." The floor keeps a mown scuff-arc with cut straw settling
 * along its outer lip.
 */
const crescent_reap: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x9a0a);
    dust.deployments.gouge!(m, c.wx + Math.cos(c.dir) * c.radius * 0.7,
      c.wy + Math.sin(c.dir) * c.radius * 0.7, { dir: c.dir, scale: 0.55 });
    blood.deployments.spray!(m, c.wx + Math.cos(c.dir) * c.radius * 0.8,
      c.wy + Math.sin(c.dir) * c.radius * 0.8, { dir: c.dir, scale: 0.5 });
    // The mown line: straw settling along the outside of the arc.
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 1.05 + (k / 4) * 2.1 + (rand() - 0.5) * 0.14;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.95, c.wy + Math.sin(a) * c.radius * 0.95,
        k % 2 === 0 ? STRAW : ASH, { life: 7 + rand(), size: 0.045, fade: ASH_DARK, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.68) / 0.32);
    const sweep = cl(c.t / 0.6);
    const span = 2.1;
    const a0 = dir - span / 2;
    const edge = a0 + span * (1 - (1 - sweep) * (1 - sweep));
    const rr = c.rPx * 0.95;
    const lift = sc * 0.46;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE WAKE: four receding edge-ghosts, oldest thinnest. Painted
    // first so the live edge cuts over them.
    for (let k = 4; k >= 1; k--) {
      const ga = edge - k * 0.2;
      if (ga < a0) continue;
      ctx.globalAlpha = (0.42 - k * 0.07) * fade;
      ctx.strokeStyle = k > 2 ? IRON_DARK : STEEL_MID;
      ctx.lineWidth = Math.max(1.5, sc * (0.075 - k * 0.012));
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift, rr, rr * squash, 0, ga - 0.13, ga);
      ctx.stroke();
    }
    // THE EDGE: deep sleeve under a hard white leading line — the
    // WEIGHT RULE on a curve.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(4, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, rr, rr * squash, 0, edge - 0.42, edge);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = STEEL_PALE;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, rr, rr * squash, 0, edge - 0.34, edge);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = STEEL_WHITE;
    ctx.lineWidth = Math.max(1.2, sc * 0.022);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, rr * 1.03, rr * 1.03 * squash, 0, edge - 0.2, edge);
    ctx.stroke();
    // The haft behind the head: this is a hafted blade, not a sword.
    const hx = c.px + Math.cos(edge) * rr;
    const hy = c.py + Math.sin(edge) * rr * squash - lift;
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2.5, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py - lift);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // Chips off the horn, gated on the frame budget.
    if (Math.random() < c.frameDt * 22 * fade && sweep < 1) {
      c.particles.burst(c.wx + Math.cos(edge) * c.radius * 0.95, c.wy + Math.sin(edge) * c.radius * 0.95, 1,
        [STEEL_WHITE, STRAW], {
          speed: 2.4, life: 0.28, size: 0.05, gravity: 3, dir: edge + Math.PI / 2, spread: 0.4, shape: 'streak',
        });
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.55) / 0.45);
    const sweep = cl(c.t / 0.6);
    ctx.save();
    // The mown arc: a scuffed band with a lit outer lip. No fill ring.
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = shade(ASH_DARK, -6);
    ctx.lineWidth = Math.max(3, sc * 0.14);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.88, c.rPx * 0.88 * squash, 0, dir - 1.05, dir - 1.05 + 2.1 * sweep);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1.2, sc * 0.024);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.96, c.rPx * 0.96 * squash, 0, dir - 1.05, dir - 1.05 + 2.1 * sweep);
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------- impaling_drive

/**
 * IMPALING_DRIVE — "the line that travels."
 * The casted corridor is DRIVEN: a single bright wavefront bead runs
 * the whole five tiles at speed, unrolling the sleeve behind it as it
 * goes — the corridor exists only where the drive has already been.
 * Three stations stand along the line (hashed from the ground, so a
 * re-cast on the same spot drives the same road), and as the bead
 * passes each one a hard X flashes across the corridor: pierced,
 * pierced, pierced. The floor keeps the corridor as a low slab whose
 * whole story is in its two hairline walls.
 */
const impaling_drive: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(posSeed(c, 0x9a0b));
    const w = runW(c);
    for (let k = 0; k < 3; k++) {
      const f = 0.35 + k * 0.24 + rand() * 0.08;
      const sx = c.wx + (w.x1 - c.wx) * f;
      const sy = c.wy + (w.y1 - c.wy) * f;
      blood.deployments.spatter!(m, sx, sy, { scale: 0.3, radius: 0.7 });
      lay(c, sx, sy, STEEL_PALE, { life: 8, size: 0.042, flicker: 3, fade: STRAW, fadeAt: 0.6 });
    }
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const rand = srand(posSeed(c, 0x9a0c));
    const stations = [0.35 + rand() * 0.08, 0.59 + rand() * 0.08, 0.83 + rand() * 0.08];
    const fade = 1 - cl((c.t - 0.72) / 0.28);
    const front = cl(c.t / 0.5);
    const lift = sc * 0.42;
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    ctx.save();
    ctx.translate(0, -lift);
    // THE UNROLLED CORRIDOR: sleeve exists only behind the front.
    if (front > 0.02) {
      const fx = r.x0 + (r.x1 - r.x0) * front;
      const fy = r.y0 + (r.y1 - r.y0) * front;
      seam(c, r.x0, r.y0, fx, fy, { w: 1.05, alpha: fade });
      // THE BEAD: the drive's head, a lit lozenge with a leaf point.
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = STEEL_WHITE;
      ctx.beginPath();
      ctx.ellipse(fx, fy, sc * 0.13, sc * 0.07, r.a, 0, Math.PI * 2);
      ctx.fill();
      leafHead(ctx, fx, fy, r.a, sc * 0.19, squash, STEEL_MID, STEEL_WHITE);
    }
    // THE STATIONS: an X flashes across the corridor as the bead
    // passes — three separate confirmations of pierce.
    ctx.strokeStyle = STEEL_WHITE;
    ctx.lineWidth = Math.max(1.5, sc * 0.032);
    for (const s of stations) {
      const since = (front - s) / 0.16;
      if (since <= 0 || since >= 1) continue;
      const k = 1 - since;
      const p = pt(c, r.len * s, r.a);
      const h = sc * (0.16 + 0.14 * (1 - k));
      ctx.globalAlpha = 0.9 * k * fade;
      ctx.beginPath();
      ctx.moveTo(p.x + nx * h + Math.cos(r.a) * h * 0.5, p.y + ny * h + Math.sin(r.a) * h * 0.5 * squash);
      ctx.lineTo(p.x - nx * h - Math.cos(r.a) * h * 0.5, p.y - ny * h - Math.sin(r.a) * h * 0.5 * squash);
      ctx.moveTo(p.x + nx * h - Math.cos(r.a) * h * 0.5, p.y + ny * h - Math.sin(r.a) * h * 0.5 * squash);
      ctx.lineTo(p.x - nx * h + Math.cos(r.a) * h * 0.5, p.y - ny * h + Math.sin(r.a) * h * 0.5 * squash);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + (runW(c).x1 - c.wx) * front, c.wy + (runW(c).y1 - c.wy) * front, 0.7, 0.3 * fade);
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.62) / 0.38);
    const front = cl(c.t / 0.5);
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    const hw = sc * 0.26;
    const ex = r.x0 + (r.x1 - r.x0) * front;
    const ey = r.y0 + (r.y1 - r.y0) * front;
    ctx.save();
    // SLAB RULE: the corridor floor at 0.2, the story in the walls.
    ctx.globalAlpha = 0.2 * fade;
    ctx.fillStyle = shade(IRON_DARK, -6);
    ctx.beginPath();
    ctx.moveTo(r.x0 + nx * hw, r.y0 + ny * hw);
    ctx.lineTo(ex + nx * hw, ey + ny * hw);
    ctx.lineTo(ex - nx * hw, ey - ny * hw);
    ctx.lineTo(r.x0 - nx * hw, r.y0 - ny * hw);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = STEEL_MID;
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(r.x0 + nx * hw * side, r.y0 + ny * hw * side);
      ctx.lineTo(ex + nx * hw * side, ey + ny * hw * side);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------- wall_of_points

/**
 * WALL_OF_POINTS — "the braced picket."
 * The pikeman's station, told as five STANDING POINTS: hafts driven
 * butt-first into the ground across the forward cone, leaning out at
 * the enemy, each with its leaf head at head height and its foot in a
 * pocked bite of dirt. The row is hashed from the ground it stands in
 * so it does not shuffle between beats — a wall that moved would not
 * be a wall. Each beat one SHIMMER walks the row left to right, the
 * brace shudder of pikes taking weight, and one foot bites fresh dust.
 */
const wall_of_points: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const beat = beatIndex(c, 800);
    const rand = srand(posSeed(c, 0x9a0d));
    const pick = beat % 5;
    let a = 0;
    let d = 0;
    for (let k = 0; k <= pick; k++) {
      a = c.dir - 0.62 + (k / 4) * 1.24 + (rand() - 0.5) * 0.1;
      d = c.radius * (0.72 + rand() * 0.24);
    }
    dust.deployments.kick!(m, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d, { scale: 0.32 });
    lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d, STRAW,
      { life: 8, size: 0.042, fade: ASH_DARK, fadeAt: 0.6 });
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const rand = srand(posSeed(c, 0x9a0d));
    const shimmer = cl(c.t / 0.62);
    // THE PICKET: five braced points, position-hashed, leaning out.
    // Geometry resolved first, then painted in BATCHED passes — a row
    // of five drawn stroke-by-stroke would blow the frame budget four
    // times over, and a wall that costs more than a nova is a lie.
    const feet: Array<{ fx: number; fy: number; tx: number; ty: number; near: number }> = [];
    let hot = 0;
    for (let k = 0; k < 5; k++) {
      const a = dir - 0.62 + (k / 4) * 1.24 + (rand() - 0.5) * 0.1;
      const d = c.rPx * (0.72 + rand() * 0.24);
      const foot = pt(c, d, a);
      const H = sc * (0.78 + rand() * 0.2);
      const near = 1 - Math.min(1, Math.abs(shimmer - (k + 0.5) / 5) * 5.5);
      feet.push({
        fx: foot.x, fy: foot.y,
        tx: foot.x + Math.cos(a) * sc * 0.28,
        ty: foot.y + Math.sin(a) * sc * 0.28 * squash - H,
        near,
      });
      if (near > feet[hot]!.near) hot = k;
    }
    ctx.save();
    // Pass 1: every haft's ash sleeve, one path.
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    for (const p of feet) {
      ctx.moveTo(p.fx, p.fy);
      ctx.lineTo(p.tx, p.ty);
    }
    ctx.stroke();
    // Pass 2: the lit inner rails, one path.
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(1.2, sc * 0.024);
    ctx.beginPath();
    for (const p of feet) {
      ctx.moveTo(p.fx + (p.tx - p.fx) * 0.12, p.fy + (p.ty - p.fy) * 0.12);
      ctx.lineTo(p.fx + (p.tx - p.fx) * 0.86, p.fy + (p.ty - p.fy) * 0.86);
    }
    ctx.stroke();
    // Pass 3: the steel at every head, one heavy short path — the row
    // reads as tipped even at eleven pixels.
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = STEEL_MID;
    ctx.lineWidth = Math.max(3, sc * 0.07);
    ctx.beginPath();
    for (const p of feet) {
      ctx.moveTo(p.fx + (p.tx - p.fx) * 0.86, p.fy + (p.ty - p.fy) * 0.86);
      ctx.lineTo(p.tx, p.ty);
    }
    ctx.stroke();
    // THE SHIMMER: the brace shudder walking the row — only the pike
    // the wave is on wears the full leaf head and the white flare, so
    // the eye is told exactly where the wall is taking weight.
    const h = feet[hot]!;
    if (h.near > 0.15) {
      ctx.globalAlpha = 0.9 * h.near;
      ctx.strokeStyle = STEEL_WHITE;
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(h.fx + (h.tx - h.fx) * 0.5, h.fy + (h.ty - h.fy) * 0.5);
      ctx.lineTo(h.tx, h.ty);
      ctx.stroke();
      ctx.globalAlpha = 1;
      leafHead(ctx, h.tx, h.ty, Math.atan2(h.ty - h.fy, h.tx - h.fx),
        sc * (0.15 + 0.05 * h.near), 1, STEEL_PALE, STEEL_WHITE);
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const rand = srand(posSeed(c, 0x9a0d));
    ctx.save();
    // The bitten feet: five pocks in the cone, and the brace line
    // scored back to the caster's stance behind them.
    ctx.globalAlpha = 0.6;
    for (let k = 0; k < 5; k++) {
      const a = dir - 0.62 + (k / 4) * 1.24 + (rand() - 0.5) * 0.1;
      const d = c.rPx * (0.72 + rand() * 0.24);
      const foot = pt(c, d, a);
      ctx.fillStyle = shade(ASH_DARK, -14);
      ctx.beginPath();
      ctx.ellipse(foot.x, foot.y, sc * 0.09, sc * 0.09 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1.2, sc * 0.024);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.86, c.rPx * 0.86 * squash, 0, dir - 0.68, dir + 0.68);
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------- knights_charge

/**
 * KNIGHTS_CHARGE — "the gold goes first."
 * The first of the three gold arts. The run is a LANE, not a streak:
 * two gold rails laid down the chord with the road darkening between
 * them, and riding the rails two receding speed chevrons that say the
 * body is already past. The arrival is a BAR — one hard bright line
 * struck square across the lane's end with a gold rim over it and the
 * whole dust skirt thrown off its foot. Momentum, given a shape.
 */
const knights_charge: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    const rand = srand(c.seed ^ 0x9a0e);
    dust.deployments.gouge!(m, c.wx + (w.x1 - c.wx) * 0.45, c.wy + (w.y1 - c.wy) * 0.45,
      { dir: c.dir, scale: 0.6 });
    dust.deployments.slam!(m, w.x1, w.y1, { scale: 0.7 });
    blood.deployments.spray!(m, w.x1, w.y1, { dir: c.dir, scale: 0.55 });
    // The lane's record: straw down the run, two gold-pale at the end.
    for (let k = 0; k < 5; k++) {
      const f = 0.2 + (k / 4) * 0.72;
      lay(c, c.wx + (w.x1 - c.wx) * f + (rand() - 0.5) * 0.2,
        c.wy + (w.y1 - c.wy) * f + (rand() - 0.5) * 0.18,
        STRAW, { life: 7.5, size: 0.045, fade: ASH_DARK, fadeAt: 0.6 });
    }
    for (const side of [-1, 1] as const) {
      lay(c, w.x1 + Math.cos(c.dir + side * 1.5) * 0.3, w.y1 + Math.sin(c.dir + side * 1.5) * 0.25,
        GOLD_PALE, { life: 8, size: 0.04, flicker: 5, fade: GOLD_DEEP, fadeAt: 0.55 });
    }
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.6) / 0.4);
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    const hw = sc * 0.3;
    ctx.save();
    // THE LANE: dark road at slab alpha between two GOLD rails.
    ctx.globalAlpha = 0.2 * fade;
    ctx.fillStyle = shade(ASH_DARK, -12);
    ctx.beginPath();
    ctx.moveTo(r.x0 + nx * hw, r.y0 + ny * hw);
    ctx.lineTo(r.x1 + nx * hw * 0.7, r.y1 + ny * hw * 0.7);
    ctx.lineTo(r.x1 - nx * hw * 0.7, r.y1 - ny * hw * 0.7);
    ctx.lineTo(r.x0 - nx * hw, r.y0 - ny * hw);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = GOLD_LEAF;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(r.x0 + nx * hw * side, r.y0 + ny * hw * side);
      ctx.lineTo(r.x1 + nx * hw * 0.7 * side, r.y1 + ny * hw * 0.7 * side);
    }
    ctx.stroke();
    // The arrival's dust ring at the lane's end, a broken half.
    if (c.t > 0.4) {
      const k = 1 - cl((c.t - 0.4) / 0.5);
      ctx.globalAlpha = 0.5 * k;
      ctx.strokeStyle = STRAW;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(r.x1, r.y1, sc * (0.3 + 0.5 * (1 - k)), sc * (0.3 + 0.5 * (1 - k)) * squash,
        0, r.a - 1.5, r.a + 1.5);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.68) / 0.32);
    const lift = sc * 0.42;
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    ctx.save();
    ctx.translate(0, -lift);
    // THE SPEED CHEVRONS: two, receding down the lane behind the body.
    const run0 = cl(c.t / 0.42);
    ctx.strokeStyle = GOLD_LEAF;
    for (let k = 0; k < 2; k++) {
      const f = cl(run0 * 1.15 - k * 0.22);
      if (f <= 0.02) continue;
      const p = pt(c, r.len * f, r.a);
      const w = sc * (0.3 - k * 0.07);
      ctx.globalAlpha = (0.85 - k * 0.35) * fade;
      ctx.lineWidth = Math.max(2, sc * (0.05 - k * 0.014));
      ctx.beginPath();
      ctx.moveTo(p.x + nx * w - Math.cos(r.a) * w * 0.7, p.y + ny * w - Math.sin(r.a) * w * 0.7 * squash);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x - nx * w - Math.cos(r.a) * w * 0.7, p.y - ny * w - Math.sin(r.a) * w * 0.7 * squash);
      ctx.stroke();
    }
    // THE ARRIVAL BAR: one hard line struck square across the end,
    // gold-rimmed, widening then gone. The blow, not a burst.
    if (run0 >= 1) {
      const k = 1 - cl((c.t - 0.42) / 0.4);
      const bw = sc * (0.44 + 0.36 * (1 - k));
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = STEEL_WHITE;
      ctx.lineWidth = Math.max(3, sc * 0.075 * k);
      ctx.beginPath();
      ctx.moveTo(r.x1 + nx * bw, r.y1 + ny * bw);
      ctx.lineTo(r.x1 - nx * bw, r.y1 - ny * bw);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * k;
      ctx.strokeStyle = GOLD_PALE;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(r.x1 + nx * bw + Math.cos(r.a) * sc * 0.08, r.y1 + ny * bw + Math.sin(r.a) * sc * 0.08 * squash);
      ctx.lineTo(r.x1 - nx * bw + Math.cos(r.a) * sc * 0.08, r.y1 - ny * bw + Math.sin(r.a) * sc * 0.08 * squash);
      ctx.stroke();
      c.glow(runW(c).x1, runW(c).y1, 1.1, 0.5 * k);
    }
    ctx.restore();
  },
};

// --------------------------------------------------------- rampart_breaker

/**
 * RAMPART_BREAKER — "the opened plate."
 * The armor-breaker does not explode anything; it OPENS a hole. The
 * point goes in, and four hard plate wedges peel back off the entry
 * on their own hinges — flat lit facets rotating outward like a lid
 * cut with a chisel — leaving a black keyhole where the armor used to
 * be. The keyhole holds after the wedges fall. On the floor, one
 * press stamp with two split lips: the plate was pinned against
 * something to be opened at all.
 */
const rampart_breaker: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    dust.deployments.slam!(m, w.x1, w.y1, { scale: 0.5 });
    const rand = srand(c.seed ^ 0x9a0f);
    // Plate shrapnel: steel shards on true arcs that land and lie.
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (rand() - 0.5) * 2.2;
      c.particles.burst(w.x1, w.y1, 1, [STEEL_MID, STEEL_PALE], {
        speed: 1.6 + rand(), life: 1.8, size: 0.05, gravity: 0, dir: a, spread: 0.2,
        shape: 'shard', spin: 10, z: 0.5, vz: 1.9, zg: 8, land: 'settle', layer: 'world',
      });
    }
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (rand() - 0.5) * 2;
      lay(c, w.x1 + Math.cos(a) * (0.3 + rand() * 0.3), w.y1 + Math.sin(a) * (0.25 + rand() * 0.25),
        STEEL_PALE, { life: 8, size: 0.045, fade: STRAW, fadeAt: 0.6 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const w = run(c);
    const fade = 1 - cl((c.t - 0.7) / 0.3);
    const lift = sc * 0.44;
    const cx = w.x1;
    const cy = w.y1 - lift;
    const open = cl((c.t - 0.1) / 0.34);
    ctx.save();
    // THE KEYHOLE: black where the plate was, opening as the wedges go.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = '#171c22';
    ctx.beginPath();
    ctx.ellipse(cx, cy, sc * 0.1 * open, sc * 0.14 * open, dir, 0, Math.PI * 2);
    ctx.fill();
    // THE PEELED WEDGES: four flat facets hinged off the entry, each
    // rotating outward and dropping — lit face, dark under-face.
    for (let k = 0; k < 4; k++) {
      const a = dir + Math.PI / 4 + (k / 4) * Math.PI * 2;
      const hinge = sc * 0.1;
      const swing = open * (0.5 + (k % 2) * 0.18);
      const L = sc * 0.3;
      const bx = cx + Math.cos(a) * hinge;
      const by = cy + Math.sin(a) * hinge * squash;
      const tx = bx + Math.cos(a) * L * Math.cos(swing * 1.4);
      const ty = by + Math.sin(a) * L * Math.cos(swing * 1.4) * squash - L * Math.sin(swing * 1.4) * 0.8;
      const px2 = -Math.sin(a) * sc * 0.075;
      const py2 = Math.cos(a) * sc * 0.075 * squash;
      ctx.globalAlpha = 0.95 * fade * (1 - cl((c.t - 0.55) / 0.35));
      ctx.fillStyle = k % 2 === 0 ? STEEL_MID : shade(STEEL_MID, -14);
      ctx.beginPath();
      ctx.moveTo(bx + px2, by + py2);
      ctx.lineTo(tx + px2 * 0.6, ty + py2 * 0.6);
      ctx.lineTo(tx - px2 * 0.6, ty - py2 * 0.6);
      ctx.lineTo(bx - px2, by - py2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.9 * fade * (1 - cl((c.t - 0.55) / 0.35));
      ctx.strokeStyle = STEEL_WHITE;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(tx + px2 * 0.6, ty + py2 * 0.6);
      ctx.lineTo(tx - px2 * 0.6, ty - py2 * 0.6);
      ctx.stroke();
    }
    // The point that did it: one short heavy seam into the keyhole.
    if (c.t < 0.4) {
      const k = 1 - c.t / 0.4;
      seam(c, cx - Math.cos(dir) * sc * 0.75, cy - Math.sin(dir) * sc * 0.75 * squash, cx, cy,
        { w: 1.2, alpha: 0.5 + 0.5 * k });
    }
    ctx.restore();
    c.glow(runW(c).x1, runW(c).y1, 0.7, 0.3 * fade * open);
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const w = run(c);
    const fade = 1 - cl((c.t - 0.5) / 0.5);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    // The press stamp with two split lips: pinned, then opened.
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = shade(IRON_DARK, -10);
    ctx.beginPath();
    ctx.ellipse(w.x1, w.y1, sc * 0.3, sc * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const split = sc * (0.04 + 0.1 * cl(c.t / 0.35));
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(w.x1 + nx * split * side - Math.cos(dir) * sc * 0.26,
        w.y1 + ny * split * side - Math.sin(dir) * sc * 0.26 * squash);
      ctx.lineTo(w.x1 + nx * split * side + Math.cos(dir) * sc * 0.26,
        w.y1 + ny * split * side + Math.sin(dir) * sc * 0.26 * squash);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// --------------------------------------------------------- serpents_tongue

/**
 * SERPENTS_TONGUE — "the flicker."
 * The fastest channel in the school, and the only one with a FORK:
 * two slim needles at full reach flick out and back on opposite
 * half-beats, so one is always going while the other is coming — the
 * tongue tasting the air. A thin tremble line joins the two tips when
 * both are out, the one frame per beat they cross. Single target,
 * full reach, no ground story worth speaking of: this art lives
 * entirely at head height and leaves only the hot dot it kept
 * hitting.
 */
const serpents_tongue: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    blood.deployments.spray!(m, w.x1, w.y1, { dir: c.dir, scale: 0.22 });
    if (beatIndex(c, 800) % 2 === 0) {
      lay(c, w.x1 + Math.cos(c.dir + 1.4) * 0.16, w.y1 + Math.sin(c.dir + 1.4) * 0.13,
        STEEL_PALE, { life: 7.5, size: 0.034, flicker: 6, fade: STRAW, fadeAt: 0.6 });
    }
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const lift = sc * 0.45;
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    ctx.save();
    ctx.translate(0, -lift);
    // THE FORK: two needles on opposite half-beat clocks, splaying
    // apart at reach — the tongue's two tips, never in step.
    const tips: Array<[number, number]> = [];
    for (const side of [-1, 1] as const) {
      const phase = side < 0 ? c.t : (c.t + 0.5) % 1;
      const u = Math.sin(cl(phase / 0.62) * Math.PI);
      if (u <= 0.04) continue;
      const splay = side * sc * 0.16 * u;
      const d = r.len * (0.42 + 0.58 * u);
      const x1 = r.x0 + Math.cos(r.a) * d + nx * splay;
      const y1 = r.y0 + Math.sin(r.a) * d + ny * splay;
      seam(c, r.x0, r.y0, x1, y1, { w: 0.55, alpha: 0.35 + 0.65 * u });
      leafHead(ctx, x1, y1, r.a, sc * 0.1 * (0.6 + 0.4 * u), squash, STEEL_MID, STEEL_WHITE);
      tips.push([x1, y1]);
    }
    // THE TREMBLE: the one frame both tips are out, a wire between.
    if (tips.length === 2) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = STEEL_WHITE;
      ctx.lineWidth = Math.max(1, sc * 0.018);
      ctx.beginPath();
      ctx.moveTo(tips[0]![0], tips[0]![1]);
      ctx.lineTo(tips[1]![0], tips[1]![1]);
      ctx.stroke();
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    ctx.save();
    // The hot dot: the spot the tongue keeps returning to, pulsing on
    // the beat, with a bare ring of settled glint around it.
    const pulse = 0.5 + 0.5 * Math.sin(c.t * Math.PI * 4);
    ctx.globalAlpha = 0.5 + 0.35 * pulse;
    ctx.fillStyle = STEEL_PALE;
    ctx.beginPath();
    ctx.ellipse(r.x1, r.y1, sc * (0.06 + 0.03 * pulse), sc * (0.06 + 0.03 * pulse) * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1, sc * 0.018);
    ctx.beginPath();
    ctx.ellipse(r.x1, r.y1, sc * 0.2, sc * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------- skydriver_fall

/**
 * SKYDRIVER_FALL — "point first, from above."
 * The vault ends in the one vertical line the school owns: the whole
 * haft comes down NEARLY PLUMB onto the landing tile, leaf head
 * leading, a thin fall-streak drawn above it and a shrinking shadow
 * running up to meet it on the ground. It lands and the ground answers
 * in FIVE SPOKES — a star crack, not a ring — thrown out from the
 * bite. Every other art in the school works along the floor; this one
 * arrives through the ceiling.
 */
const skydriver_fall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    dust.deployments.slam!(m, w.x1, w.y1, { scale: 0.95 });
    const rand = srand(c.seed ^ 0x9a10);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
      lay(c, w.x1 + Math.cos(a) * (0.4 + rand() * 0.35), w.y1 + Math.sin(a) * (0.32 + rand() * 0.3),
        k % 2 === 0 ? STRAW : STEEL_PALE, { life: 7.5 + rand(), size: 0.045, fade: ASH_DARK, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const drop = cl(c.t / 0.4);
    const ease = drop * drop;
    ctx.save();
    if (drop < 1) {
      // THE PLUMB FALL: the haft nearly vertical, closing on the tile.
      const H = sc * 2.3 * (1 - ease);
      const lean = sc * 0.22 * (1 - ease);
      const tipX = r.x1 + lean * 0.4;
      const tipY = r.y1 - H;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = ASH_DARK;
      ctx.lineWidth = Math.max(3.5, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(tipX + lean, tipY - sc * 1.05);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = ASH;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(tipX + lean * 0.85, tipY - sc * 0.92);
      ctx.lineTo(tipX + lean * 0.1, tipY - sc * 0.12);
      ctx.stroke();
      leafHead(ctx, tipX, tipY, Math.PI / 2, sc * 0.2, 1, STEEL_MID, STEEL_WHITE);
      // The fall streak above it: speed, one hairline.
      ctx.globalAlpha = 0.5 * (1 - ease);
      ctx.strokeStyle = STEEL_PALE;
      ctx.lineWidth = Math.max(1, sc * 0.018);
      ctx.beginPath();
      ctx.moveTo(tipX + lean * 1.6, tipY - sc * 1.9);
      ctx.lineTo(tipX + lean, tipY - sc * 1.05);
      ctx.stroke();
    } else {
      // THE ANSWER: five hard spokes thrown out of the bite, upward
      // and outward, dying fast. A star, never a ring.
      const k = 1 - cl((c.t - 0.4) / 0.42);
      if (k > 0) {
        const rand = srand(c.seed ^ 0x9a11);
        ctx.globalAlpha = 0.9 * k;
        ctx.strokeStyle = STEEL_WHITE;
        ctx.lineWidth = Math.max(2, sc * 0.045 * k);
        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          const a = (s / 5) * Math.PI * 2 + rand() * 0.6;
          const L = sc * (0.5 + rand() * 0.5) * (1 - k) * 1.6;
          ctx.moveTo(r.x1, r.y1 - sc * 0.08);
          ctx.lineTo(r.x1 + Math.cos(a) * L, r.y1 + Math.sin(a) * L * squash - sc * 0.08 - L * 0.3);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const drop = cl(c.t / 0.4);
    ctx.save();
    if (drop < 1) {
      // THE SHRINKING SHADOW: the tell that something is coming down.
      ctx.globalAlpha = 0.25 + 0.4 * drop;
      ctx.fillStyle = shade(ASH_DARK, -20);
      ctx.beginPath();
      ctx.ellipse(r.x1, r.y1, sc * (0.5 - 0.34 * drop), sc * (0.5 - 0.34 * drop) * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // THE STAR CRACK: five splits in the dirt off the entry pock.
      const k = 1 - cl((c.t - 0.4) / 0.55);
      const rand = srand(c.seed ^ 0x9a11);
      ctx.globalAlpha = 0.65 * k;
      ctx.fillStyle = shade(ASH_DARK, -16);
      ctx.beginPath();
      ctx.ellipse(r.x1, r.y1, sc * 0.13, sc * 0.13 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7 * k;
      ctx.strokeStyle = STRAW;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      for (let s = 0; s < 5; s++) {
        const a = (s / 5) * Math.PI * 2 + rand() * 0.6;
        const L = c.rPx * (0.6 + rand() * 0.5) * (1.2 - k);
        ctx.moveTo(r.x1 + Math.cos(a) * sc * 0.12, r.y1 + Math.sin(a) * sc * 0.12 * squash);
        ctx.lineTo(r.x1 + Math.cos(a) * L, r.y1 + Math.sin(a) * L * squash);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- banner_advance

/**
 * BANNER_ADVANCE — "the line moves forward."
 * The school's one utility art, and the second gold. No blow is
 * struck: a PENNON breaks out at the top of the haft — a long gold
 * swallowtail that snaps forward twice on the wind and then holds —
 * and the ground under the caster takes a forward-pointing gold
 * chevron with two step bars behind it. Everything about the read
 * says ADVANCE: the flag leans the way you are going, the chevron
 * points there, the steps are already taken.
 */
const banner_advance: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    dust.deployments.kick!(m, c.wx - Math.cos(c.dir) * 0.25, c.wy - Math.sin(c.dir) * 0.22, { scale: 0.35 });
    const rand = srand(c.seed ^ 0x9a12);
    // Gold motes rising off the standard — the school's own metal.
    c.particles.burst(c.wx, c.wy, 6, [GOLD_PALE, GOLD_LEAF], {
      speed: 0.35, life: 1.4, size: 0.05, gravity: -0.5, drag: 1.6, shape: 'glint',
      z: 0.9, vz: 0.4, zg: 0, layer: 'world',
    });
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (rand() - 0.5) * 1.1;
      lay(c, c.wx + Math.cos(a) * (0.3 + rand() * 0.3), c.wy + Math.sin(a) * (0.25 + rand() * 0.25),
        GOLD_PALE, { life: 8, size: 0.04, flicker: 4, fade: GOLD_DEEP, fadeAt: 0.6 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.78) / 0.22);
    const rise = cl(c.t / 0.22);
    const lift = sc * (0.3 + 1.5 * rise);
    ctx.save();
    // The standard: the haft held high, ash under a lit rail.
    ctx.globalAlpha = 0.92 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(c.px, c.py - lift);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = GOLD_LEAF;
    ctx.lineWidth = Math.max(1.2, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py - lift * 0.15);
    ctx.lineTo(c.px, c.py - lift * 0.94);
    ctx.stroke();
    // THE PENNON: a swallowtail leaning down the aim, snapping twice.
    const snap = Math.sin(c.t * Math.PI * 4) * (1 - c.t) * 0.5;
    const fx = Math.cos(dir) * sc * (0.85 + snap * 0.3);
    const fy = Math.sin(dir) * sc * (0.85 + snap * 0.3) * squash;
    const top = c.py - lift;
    const drop = sc * 0.34;
    ctx.globalAlpha = 0.92 * fade;
    ctx.fillStyle = GOLD_LEAF;
    ctx.beginPath();
    ctx.moveTo(c.px, top);
    ctx.lineTo(c.px + fx, top + fy - drop * 0.25);
    ctx.lineTo(c.px + fx * 0.72, top + fy * 0.72 + drop * 0.1);
    ctx.lineTo(c.px + fx, top + fy + drop * 0.5);
    ctx.lineTo(c.px, top + drop);
    ctx.closePath();
    ctx.fill();
    // The lit upper fly and the dark lower — a flag with two faces.
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = GOLD_PALE;
    ctx.beginPath();
    ctx.moveTo(c.px, top);
    ctx.lineTo(c.px + fx, top + fy - drop * 0.25);
    ctx.lineTo(c.px + fx * 0.6, top + fy * 0.6 - drop * 0.02);
    ctx.lineTo(c.px, top + drop * 0.32);
    ctx.closePath();
    ctx.fill();
    // The finial: a leaf point crowning the standard.
    leafHead(ctx, c.px, top - sc * 0.1, -Math.PI / 2, sc * 0.14, 1, GOLD_DEEP, GOLD_PALE);
    ctx.restore();
    c.glow(c.wx, c.wy, 1.1, 0.28 * fade * rise);
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.78) / 0.22);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    // THE ADVANCE CHEVRON: gold, pointing the way, growing forward.
    const grow = cl(c.t / 0.35);
    const tip = pt(c, c.rPx * (0.35 + 0.5 * grow), dir);
    const w = sc * 0.36;
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = GOLD_LEAF;
    ctx.lineWidth = Math.max(2.5, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(tip.x + nx * w - Math.cos(dir) * w * 0.9, tip.y + ny * w - Math.sin(dir) * w * 0.9 * squash);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x - nx * w - Math.cos(dir) * w * 0.9, tip.y - ny * w - Math.sin(dir) * w * 0.9 * squash);
    ctx.stroke();
    // Two step bars behind it: the ground already covered.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = GOLD_DEEP;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    for (let k = 0; k < 2; k++) {
      const p = pt(c, c.rPx * (0.1 + k * 0.16), dir);
      ctx.moveTo(p.x + nx * w * 0.5, p.y + ny * w * 0.5);
      ctx.lineTo(p.x - nx * w * 0.5, p.y - ny * w * 0.5);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------- moulinet_guard

/**
 * MOULINET_GUARD — "the turning bar."
 * The school's only all-around answer, and the only art in the game
 * whose centerpiece runs THROUGH the caster: the haft is painted as
 * one full bar pivoting on the body, both ends lit, sweeping a half
 * turn per beat. Around it lies the CIRCLE TRACK — eight tick marks
 * on the guard's radius, hashed from the ground so the track holds
 * still while the bar turns — and the two ticks the bar's ends are
 * passing light up. Dust kicks at the ends, not the middle: it is the
 * TIPS that do the work.
 */
const moulinet_guard: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const beat = beatIndex(c, 800);
    const a = (beat * 1.7) % (Math.PI * 2);
    for (const side of [0, Math.PI] as const) {
      dust.deployments.kick!(m,
        c.wx + Math.cos(a + side) * c.radius * 0.9,
        c.wy + Math.sin(a + side) * c.radius * 0.9, { scale: 0.22 });
    }
    lay(c, c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9,
      STRAW, { life: 7, size: 0.04, fade: ASH_DARK, fadeAt: 0.6 });
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const beat = beatIndex(c, 800);
    const spin = (beat * 1.7) % (Math.PI * 2) + c.t * Math.PI;
    const rr = c.rPx * 0.92;
    const lift = sc * 0.44;
    ctx.save();
    // THE BAR THROUGH THE BODY: one pole, two ends, pivoting on the
    // caster. Ash sleeve, lit rail, a leaf head on each end.
    const ex = Math.cos(spin) * rr;
    const ey = Math.sin(spin) * rr * squash;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(c.px + ex, c.py + ey - lift);
    ctx.lineTo(c.px - ex, c.py - ey - lift);
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(1.4, sc * 0.026);
    ctx.beginPath();
    ctx.moveTo(c.px + ex * 0.88, c.py + ey * 0.88 - lift);
    ctx.lineTo(c.px - ex * 0.88, c.py - ey * 0.88 - lift);
    ctx.stroke();
    for (const s of [1, -1] as const) {
      leafHead(ctx, c.px + ex * s, c.py + ey * s - lift, spin + (s < 0 ? Math.PI : 0),
        sc * 0.13, squash, STEEL_MID, STEEL_WHITE);
      // The tip's trailing smear: where that end just was.
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = STEEL_PALE;
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift, rr, rr * squash, 0,
        spin + (s < 0 ? Math.PI : 0) - 0.5, spin + (s < 0 ? Math.PI : 0));
      ctx.stroke();
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const rand = srand(posSeed(c, 0x9a13));
    const beat = beatIndex(c, 800);
    const spin = (beat * 1.7) % (Math.PI * 2) + c.t * Math.PI;
    ctx.save();
    // THE CIRCLE TRACK: eight ticks on the guard radius, still while
    // the bar turns. The two the ends are passing light up.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.12;
      const d = Math.abs(Math.cos(a - spin));
      const hot = d > 0.94;
      const p0 = pt(c, c.rPx * 0.82, a);
      const p1 = pt(c, c.rPx * 1.0, a);
      ctx.globalAlpha = hot ? 0.9 : 0.32;
      ctx.strokeStyle = hot ? STEEL_WHITE : STRAW;
      ctx.lineWidth = Math.max(1.2, sc * (hot ? 0.04 : 0.022));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// -------------------------------------------------------------- stormpoint

/**
 * STORMPOINT — "the called strike."
 * The biggest casted blow in the school, and its only weather. The
 * point is planted at the target as a bright vertical ROD — a
 * lightning rod, standing alone, static ticking off it — and then the
 * sky answers: one hard bolt down onto its tip, and the rod DISCHARGES
 * along the aim as a white corridor. Nothing homes, nothing flies:
 * the storm comes to the point because the point asked for it. The
 * floor keeps one scorched pin with radial static hairs.
 */
const stormpoint: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    storm.deployments.impact!(m, w.x1, w.y1, { scale: 1.1 });
    storm.deployments.crackle!(m, w.x1, w.y1, { radius: 0.8, scale: 0.7 });
    const rand = srand(c.seed ^ 0x9a14);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, w.x1 + Math.cos(a) * (0.25 + rand() * 0.3), w.y1 + Math.sin(a) * (0.2 + rand() * 0.25),
        k === 0 ? STEEL_WHITE : STRAW, { life: 7.5, size: 0.04, flicker: 7, fade: ASH_DARK, fadeAt: 0.5 });
    }
  },
  air(c) {
    const { ctx, st, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.72) / 0.28);
    ctx.save();
    // THE ROD: the point stood upright at the target, waiting one
    // heartbeat, static ticking off its length.
    const H = sc * 1.05;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(3, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.lineTo(r.x1, r.y1 - H);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = STEEL_WHITE;
    ctx.lineWidth = Math.max(1.2, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1 - H * 0.12);
    ctx.lineTo(r.x1, r.y1 - H * 0.92);
    ctx.stroke();
    leafHead(ctx, r.x1, r.y1 - H, -Math.PI / 2, sc * 0.16, 1, STEEL_MID, STEEL_WHITE);
    // THE BOLT: one jagged answer down onto the tip, three segments.
    if (c.t > 0.16 && c.t < 0.4) {
      const k = 1 - (c.t - 0.16) / 0.24;
      const rand = srand(c.seed ^ 0x9a15);
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(r.x1 + (rand() - 0.5) * sc * 0.5, r.y1 - H - sc * 2.2);
      for (let s = 2; s >= 0; s--) {
        ctx.lineTo(r.x1 + (rand() - 0.5) * sc * 0.34 * (s / 2), r.y1 - H - sc * 0.72 * s);
      }
      ctx.stroke();
    }
    // THE DISCHARGE: the rod spends itself down the aim as a corridor.
    if (c.t >= 0.32) {
      const k = 1 - cl((c.t - 0.32) / 0.45);
      seam(c, r.x0, r.y0 - sc * 0.4, r.x1, r.y1 - sc * 0.4,
        { w: 1.25, alpha: fade * (0.35 + 0.65 * k), sleeve: shade(st.deep, -4), core: st.mid, heart: st.core });
      leafHead(ctx, r.x1, r.y1 - sc * 0.4, r.a, sc * 0.2, squash, st.mid, st.core);
    }
    ctx.restore();
    c.glow(runW(c).x1, runW(c).y1, 1.2, 0.45 * fade);
  },
  ground(c) {
    const { ctx, st, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.6) / 0.4);
    const rand = srand(c.seed ^ 0x9a16);
    ctx.save();
    // The scorched pin and its static hairs — small, hot, and exact.
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.beginPath();
    ctx.ellipse(r.x1, r.y1, sc * 0.11, sc * 0.11 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.65 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const L = c.rPx * (0.2 + rand() * 0.3);
      ctx.moveTo(r.x1 + Math.cos(a) * sc * 0.1, r.y1 + Math.sin(a) * sc * 0.1 * squash);
      ctx.lineTo(r.x1 + Math.cos(a + 0.3) * L, r.y1 + Math.sin(a + 0.3) * L * squash);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// ------------------------------------------------------------- gatebreaker

/**
 * GATEBREAKER — "the gate parts."
 * The execute, told as a DOOR GIVING WAY. The halberd's iron beak
 * comes down into a seam, and then two heavy leaves — flat plates
 * with banded faces — swing APART from that seam, opening a black gap
 * between them that widens all the way to the edge of the read. The
 * lower the quarry, the more this art means: everything about it says
 * the thing in front of you is no longer closed. Cold iron only, no
 * gold — this is not a knight's art, it is a breaker's.
 */
const gatebreaker: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    dust.deployments.slam!(m, w.x1, w.y1, { scale: 0.85 });
    blood.deployments.spatter!(m, w.x1, w.y1, { scale: 0.5, radius: 1 });
    const rand = srand(c.seed ^ 0x9a17);
    // The broken sill: grains thrown left and right of the parting.
    for (const side of [-1, 1] as const) {
      for (let k = 0; k < 3; k++) {
        const a = c.dir + side * (0.9 + rand() * 0.6);
        lay(c, w.x1 + Math.cos(a) * (0.3 + rand() * 0.4), w.y1 + Math.sin(a) * (0.25 + rand() * 0.35),
          k === 0 ? STEEL_PALE : STRAW, { life: 8, size: 0.048, fade: ASH_DARK, fadeAt: 0.6 });
      }
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const w = run(c);
    const fade = 1 - cl((c.t - 0.7) / 0.3);
    const lift = sc * 0.5;
    const part = cl((c.t - 0.14) / 0.4);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    const cy = w.y1 - lift;
    ctx.save();
    // THE BLACK GAP between the leaves, widening.
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = '#12161b';
    const gw = sc * 0.06 + sc * 0.3 * part;
    ctx.beginPath();
    ctx.moveTo(w.x1 + nx * gw, cy + ny * gw);
    ctx.lineTo(w.x1 - nx * gw, cy - ny * gw);
    ctx.lineTo(w.x1 - nx * gw * 0.8, cy - ny * gw * 0.8 - sc * 0.86);
    ctx.lineTo(w.x1 + nx * gw * 0.8, cy + ny * gw * 0.8 - sc * 0.86);
    ctx.closePath();
    ctx.fill();
    // THE TWO LEAVES: banded iron plates swinging back off the seam.
    for (const side of [-1, 1] as const) {
      const o0 = gw;
      const o1 = gw + sc * (0.16 + 0.3 * part);
      const skew = Math.cos(dir) * sc * 0.1 * part * side;
      const skewY = Math.sin(dir) * sc * 0.1 * squash * part * side;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = side < 0 ? shade(STEEL_MID, -18) : STEEL_MID;
      ctx.beginPath();
      ctx.moveTo(w.x1 + nx * o0 * side, cy + ny * o0 * side);
      ctx.lineTo(w.x1 + nx * o1 * side + skew, cy + ny * o1 * side + skewY);
      ctx.lineTo(w.x1 + nx * o1 * side + skew, cy + ny * o1 * side + skewY - sc * 0.82);
      ctx.lineTo(w.x1 + nx * o0 * side, cy + ny * o0 * side - sc * 0.86);
      ctx.closePath();
      ctx.fill();
      // Two dark bands across each leaf: this is a door, not a shard.
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = IRON_DARK;
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      for (const bf of [0.32, 0.68] as const) {
        ctx.moveTo(w.x1 + nx * o0 * side, cy + ny * o0 * side - sc * 0.86 * bf);
        ctx.lineTo(w.x1 + nx * o1 * side + skew, cy + ny * o1 * side + skewY - sc * 0.82 * bf);
      }
      ctx.stroke();
    }
    // THE BEAK: the iron head that set the seam, driven down early.
    if (c.t < 0.3) {
      const k = 1 - c.t / 0.3;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = IRON_DARK;
      ctx.lineWidth = Math.max(4, sc * 0.11);
      ctx.beginPath();
      ctx.moveTo(w.x1 - Math.cos(dir) * sc * 0.3, cy - sc * (0.9 + 1.2 * k));
      ctx.lineTo(w.x1, cy - sc * 0.86 * (1 - k * 0.2));
      ctx.stroke();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = STEEL_WHITE;
      ctx.beginPath();
      burstStarPath(ctx, w.x1, cy - sc * 0.86, sc * 0.3 * k, sc * 0.06, 4, dir, squash);
      ctx.fill();
    }
    ctx.restore();
    c.glow(runW(c).x1, runW(c).y1, 1, 0.34 * fade * part);
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const w = run(c);
    const fade = 1 - cl((c.t - 0.55) / 0.45);
    const part = cl((c.t - 0.14) / 0.4);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    // THE BROKEN SILL: one line across the aim, split open at center.
    const half = c.rPx * 0.62;
    const gap = sc * 0.08 + sc * 0.34 * part;
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = shade(IRON_DARK, -8);
    ctx.lineWidth = Math.max(3, sc * 0.08);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(w.x1 + nx * gap * side, w.y1 + ny * gap * side);
      ctx.lineTo(w.x1 + nx * half * side, w.y1 + ny * half * side);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1.2, sc * 0.024);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(w.x1 + nx * gap * side, w.y1 + ny * gap * side - sc * 0.03);
      ctx.lineTo(w.x1 + nx * half * side, w.y1 + ny * half * side - sc * 0.03);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// ----------------------------------------------------------- sweeping_gyre

/**
 * SWEEPING_GYRE — "the full lap."
 * THE SWEEP EXEMPTION, second and last. Where crescent_reap takes a
 * partial arc with a short wake, the gyre takes THE WHOLE CIRCLE: the
 * halberd edge runs a complete lap, dropping five spaced edge-ghosts
 * all the way around, and opposite the head the HAFT'S COUNTERWEIGHT
 * runs the same lap 180 degrees behind it — the honest physics of
 * turning a heavy pole. The floor keeps a scoured ring with four sod
 * tabs flipped pale-side up where the edge bit deepest.
 */
const sweeping_gyre: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x9a18);
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: c.radius * 0.9, scale: 0.6, dur: 0.4 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.92, c.wy + Math.sin(a) * c.radius * 0.92,
        k % 2 === 0 ? STRAW : ASH, { life: 7 + rand(), size: 0.05, fade: ASH_DARK, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.72) / 0.28);
    const lap = cl(c.t / 0.66);
    const edge = dir + lap * Math.PI * 2;
    const rr = c.rPx * 0.95;
    const lift = sc * 0.44;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE LAP'S WAKE: five ghosts spaced back around the whole circle.
    for (let k = 5; k >= 1; k--) {
      const ga = edge - k * 0.42;
      if (ga < dir) continue;
      ctx.globalAlpha = (0.34 - k * 0.05) * fade;
      ctx.strokeStyle = k > 3 ? IRON_DARK : STEEL_MID;
      ctx.lineWidth = Math.max(1.5, sc * (0.08 - k * 0.011));
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift, rr, rr * squash, 0, ga - 0.24, ga);
      ctx.stroke();
    }
    // THE EDGE: the live leading line, sleeved and white-lipped.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(4, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, rr, rr * squash, 0, edge - 0.5, edge);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = STEEL_WHITE;
    ctx.lineWidth = Math.max(2.5, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, rr * 1.02, rr * 1.02 * squash, 0, edge - 0.28, edge);
    ctx.stroke();
    // THE COUNTERWEIGHT: the butt end running the lap opposite, and
    // the haft joining the two through the caster.
    const bx = c.px + Math.cos(edge + Math.PI) * rr * 0.62;
    const by = c.py + Math.sin(edge + Math.PI) * rr * 0.62 * squash - lift;
    const hx = c.px + Math.cos(edge) * rr;
    const hy = c.py + Math.sin(edge) * rr * squash - lift;
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, rr * 0.62, rr * 0.62 * squash, 0, edge + Math.PI - 0.4, edge + Math.PI);
    ctx.stroke();
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.6) / 0.4);
    const lap = cl(c.t / 0.66);
    const rand = srand(c.seed ^ 0x9a19);
    ctx.save();
    // The scoured ring, drawn only as far as the lap has gone.
    ctx.globalAlpha = 0.34 * fade;
    ctx.strokeStyle = shade(ASH_DARK, -8);
    ctx.lineWidth = Math.max(3, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.9, c.rPx * 0.9 * squash, 0, dir, dir + lap * Math.PI * 2);
    ctx.stroke();
    // Four sod tabs flipped pale-side up where the edge bit deepest.
    ctx.globalAlpha = 0.75 * fade;
    for (let k = 0; k < 4; k++) {
      const a = dir + (k / 4) * Math.PI * 2 + rand() * 0.3;
      if (a > dir + lap * Math.PI * 2) continue;
      const p = pt(c, c.rPx * (0.86 + rand() * 0.1), a);
      const g = sc * 0.07;
      ctx.fillStyle = ASH_DARK;
      ctx.fillRect(p.x - g, p.y - g * 0.5, g * 2, g);
      ctx.fillStyle = STRAW;
      ctx.fillRect(p.x - g, p.y - g * 0.5, g * 2, g * 0.4);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ hold_the_line_polearm

/**
 * HOLD_THE_LINE_PIKE — "nothing walks through."
 * The anchor stance. Where wall_of_points stands a ROW of separate
 * pikes, this art holds ONE CONTINUOUS BAR across the front of the
 * cone — the pole itself, presented level — with two guy-lines running
 * back to the caster's heels, which have dug their own trenches into
 * the dirt. Each beat the bar takes a hit and RINGS: a shudder ripple
 * travels its length end to end and dies, and the bar does not move a
 * pixel. The line remembers what it stopped — every beat settles a
 * steel grain along it, and by the last beat the bar is written on the
 * ground whether the channel holds or not.
 *
 * (`hold_the_line` is the shield school's standing art; this is the
 * polearm's, suffixed `_polearm`, and the two never meet.)
 */
const hold_the_line_polearm: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const beat = beatIndex(c, 800);
    const rand = srand(posSeed(c, 0x9a1a) ^ beat);
    const f = -0.55 + rand() * 1.1;
    const barA = c.dir + Math.PI / 2;
    const bx = c.wx + Math.cos(c.dir) * c.radius * 0.78 + Math.cos(barA) * c.radius * f;
    const by = c.wy + Math.sin(c.dir) * c.radius * 0.78 + Math.sin(barA) * c.radius * f;
    dust.deployments.kick!(m, bx, by, { scale: 0.28 });
    lay(c, bx, by, STEEL_PALE, { life: 8.5, size: 0.042, fade: STRAW, fadeAt: 0.6 });
    // The heels keep digging in for as long as the line holds.
    for (const side of [-1, 1] as const) {
      lay(c, c.wx - Math.cos(c.dir) * 0.3 + Math.cos(barA) * 0.18 * side,
        c.wy - Math.sin(c.dir) * 0.3 + Math.sin(barA) * 0.18 * side,
        STRAW, { life: 7, size: 0.04, fade: ASH_DARK, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const barA = dir + Math.PI / 2;
    const half = c.rPx * 0.78;
    const front = pt(c, c.rPx * 0.78, dir);
    const lift = sc * 0.46;
    const ex = Math.cos(barA) * half;
    const ey = Math.sin(barA) * half * squash;
    const x0 = front.x - ex;
    const y0 = front.y - ey - lift;
    const x1 = front.x + ex;
    const y1 = front.y + ey - lift;
    ctx.save();
    // THE HELD BAR: the pole presented level, the school's one
    // horizontal seam. It never moves — that is the whole point.
    seam(c, x0, y0, x1, y1, { w: 1.15, sleeve: ASH_DARK, core: ASH, heart: STEEL_WHITE });
    leafHead(ctx, x1, y1, barA, sc * 0.14, squash, STEEL_MID, STEEL_WHITE);
    // THE GUY-LINES: two braces back to the caster's planted heels.
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2, sc * 0.042);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(front.x + ex * 0.72 * side, front.y + ey * 0.72 * side - lift);
      ctx.lineTo(c.px + Math.cos(barA) * sc * 0.2 * side, c.py - sc * 0.15);
    }
    ctx.stroke();
    // THE RING: a shudder travelling the bar end to end, once a beat.
    const ripple = cl(c.t / 0.55);
    if (ripple > 0 && ripple < 1) {
      const rx = x0 + (x1 - x0) * ripple;
      const ry = y0 + (y1 - y0) * ripple;
      const k = Math.sin(ripple * Math.PI);
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = STEEL_WHITE;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(rx - Math.cos(barA) * sc * 0.16, ry - Math.sin(barA) * sc * 0.16 * squash - sc * 0.05 * k);
      ctx.lineTo(rx + Math.cos(barA) * sc * 0.16, ry + Math.sin(barA) * sc * 0.16 * squash + sc * 0.05 * k);
      ctx.stroke();
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const barA = dir + Math.PI / 2;
    const front = pt(c, c.rPx * 0.78, dir);
    const half = c.rPx * 0.78;
    ctx.save();
    // The bar's shadow — the line drawn on the dirt, unmoving.
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = shade(IRON_DARK, -6);
    ctx.lineWidth = Math.max(2.5, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(front.x - Math.cos(barA) * half, front.y - Math.sin(barA) * half * squash);
    ctx.lineTo(front.x + Math.cos(barA) * half, front.y + Math.sin(barA) * half * squash);
    ctx.stroke();
    // THE HEEL TRENCHES: two bars dug backward, the price of holding.
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      const h = pt(c, sc * 0.16, dir + Math.PI);
      ctx.moveTo(h.x + Math.cos(barA) * sc * 0.18 * side, h.y + Math.sin(barA) * sc * 0.18 * squash * side);
      ctx.lineTo(h.x + Math.cos(barA) * sc * 0.18 * side - Math.cos(dir) * sc * 0.34,
        h.y + Math.sin(barA) * sc * 0.18 * squash * side - Math.sin(dir) * sc * 0.34 * squash);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// --------------------------------------------------------- sundering_lance

/**
 * SUNDERING_LANCE — "the crown of the school."
 * THE CAPSTONE, and the longest line in the game: six tiles of full
 * corridor, laid in every stratum the school owns at once — deep
 * sleeve, bright core, hairline heart, gold edge rails, leaf head —
 * driven end to end in a single motion that never stops to gather.
 * Four PIERCED-THROUGH flashes stand along the run, spaced by the
 * wire's own radius: at each one a hard ring snaps open across the
 * lance and four shock spokes throw off it. What lies afterward is
 * the school's whole aftermath in one line: straw and steel settled
 * the entire six tiles, gold-pale at the far end where the run
 * finished. Everything the twenty taught, said once, at full length.
 */
const sundering_lance: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    const rand = srand(c.seed ^ 0x9a1b);
    dust.deployments.gouge!(m, c.wx + (w.x1 - c.wx) * 0.4, c.wy + (w.y1 - c.wy) * 0.4,
      { dir: c.dir, scale: 0.8 });
    dust.deployments.slam!(m, w.x1, w.y1, { scale: 0.8 });
    // The pierced stations bleed; the whole run settles straw-steel.
    for (let k = 1; k <= 4; k++) {
      const f = k / 4.6;
      const sx = c.wx + (w.x1 - c.wx) * f;
      const sy = c.wy + (w.y1 - c.wy) * f;
      blood.deployments.spatter!(m, sx, sy, { scale: 0.38, radius: 0.9 });
    }
    for (let k = 0; k < 8; k++) {
      const f = 0.1 + (k / 7) * 0.86;
      lay(c, c.wx + (w.x1 - c.wx) * f + (rand() - 0.5) * 0.22,
        c.wy + (w.y1 - c.wy) * f + (rand() - 0.5) * 0.2,
        k % 3 === 0 ? STEEL_PALE : STRAW,
        { life: 8.5, size: 0.05, flicker: k % 3 === 0 ? 4 : 0, fade: ASH_DARK, fadeAt: 0.62 });
    }
    for (const side of [-1, 1] as const) {
      lay(c, w.x1 + Math.cos(c.dir + side * 1.5) * 0.34, w.y1 + Math.sin(c.dir + side * 1.5) * 0.28,
        GOLD_PALE, { life: 9, size: 0.045, flicker: 6, fade: GOLD_DEEP, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.74) / 0.26);
    const drive = cl(c.t / 0.46);
    const lift = sc * 0.44;
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    ctx.save();
    ctx.translate(0, -lift);
    // THE LANCE: the full corridor at maximum weight, plus GOLD rails
    // riding its flanks — the knight's metal, spent on the capstone.
    const ex = r.x0 + (r.x1 - r.x0) * drive;
    const ey = r.y0 + (r.y1 - r.y0) * drive;
    seam(c, r.x0, r.y0, ex, ey, { w: 1.5, alpha: fade });
    const rw = sc * 0.13;
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = GOLD_LEAF;
    ctx.lineWidth = Math.max(1.5, sc * 0.028);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(r.x0 + nx * rw * side, r.y0 + ny * rw * side);
      ctx.lineTo(ex + nx * rw * side, ey + ny * rw * side);
    }
    ctx.stroke();
    leafHead(ctx, ex, ey, r.a, sc * 0.26, squash, STEEL_MID, STEEL_WHITE);
    // THE PIERCED-THROUGH: four stations spaced by the wire's own
    // radius — a ring snapping open across the lance, four spokes off
    // it. Each fires exactly when the point reaches it.
    const step = c.radius > 0.2 ? c.radius / Math.max(c.radius * 4, 1) : 0.25;
    for (let k = 1; k <= 4; k++) {
      const s = Math.min(0.96, k * (step > 0 ? step : 0.25) + 0.06);
      const since = (drive - s) / 0.2;
      if (since <= 0 || since >= 1) continue;
      const q = 1 - since;
      const p = pt(c, r.len * s, r.a);
      const R = sc * (0.16 + 0.34 * since);
      ctx.globalAlpha = 0.9 * q * fade;
      ctx.strokeStyle = STEEL_WHITE;
      ctx.lineWidth = Math.max(1.8, sc * 0.04 * q);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R * 0.4, R, r.a, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * q * fade;
      ctx.strokeStyle = GOLD_PALE;
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      ctx.beginPath();
      for (let s2 = 0; s2 < 4; s2++) {
        const a = r.a + Math.PI / 4 + (s2 / 4) * Math.PI * 2;
        ctx.moveTo(p.x + Math.cos(a) * R * 0.6, p.y + Math.sin(a) * R * 0.6 * squash);
        ctx.lineTo(p.x + Math.cos(a) * R * 1.5, p.y + Math.sin(a) * R * 1.5 * squash);
      }
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + (runW(c).x1 - c.wx) * drive, c.wy + (runW(c).y1 - c.wy) * drive, 1.3, 0.45 * fade);
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.62) / 0.38);
    const drive = cl(c.t / 0.46);
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    const hw = sc * 0.3;
    const ex = r.x0 + (r.x1 - r.x0) * drive;
    const ey = r.y0 + (r.y1 - r.y0) * drive;
    ctx.save();
    // The torn run at slab alpha, edged in gold — the SLAB RULE with
    // the school's own trim. The capstone still refuses to shout.
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = shade(ASH_DARK, -14);
    ctx.beginPath();
    ctx.moveTo(r.x0 + nx * hw, r.y0 + ny * hw);
    ctx.lineTo(ex + nx * hw * 0.6, ey + ny * hw * 0.6);
    ctx.lineTo(ex - nx * hw * 0.6, ey - ny * hw * 0.6);
    ctx.lineTo(r.x0 - nx * hw, r.y0 - ny * hw);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = GOLD_DEEP;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      ctx.moveTo(r.x0 + nx * hw * side, r.y0 + ny * hw * side);
      ctx.lineTo(ex + nx * hw * 0.6 * side, ey + ny * hw * 0.6 * side);
    }
    ctx.stroke();
    // The finish: one bright cross-bar where the run ended.
    if (drive >= 1) {
      const k = 1 - cl((c.t - 0.46) / 0.4);
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = GOLD_PALE;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(r.x1 + nx * sc * 0.4, r.y1 + ny * sc * 0.4);
      ctx.lineTo(r.x1 - nx * sc * 0.4, r.y1 - ny * sc * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------- reaching_thrust

/**
 * REACHING_THRUST — "the hands give up the pole."
 * THE ARMORY's founding lesson, and the school's whole thesis said in
 * one gesture: the body stops, and the point KEEPS GOING. The
 * centerpiece nothing else owns is THE SLIDE — a short bright grip
 * band that runs forward down the corridor as the haft is fed through
 * the fists, arriving at the head exactly when the reach tops out.
 * On the floor there is a stop-line where the front foot planted and
 * a long empty gap beyond it: the distance the wielder bought without
 * taking a step. No withdraw, no measure, no flourish — one honest
 * extension held a beat and let go.
 */
const reaching_thrust: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    blood.deployments.spray!(m, w.x1, w.y1, { dir: c.dir, scale: 0.45 });
    dust.deployments.kick!(m, c.wx + Math.cos(c.dir) * 0.3, c.wy + Math.sin(c.dir) * 0.26, { scale: 0.25 });
    const rand = srand(c.seed ^ 0x9a1c);
    // Two grains at the plant, one at the far end — the gap between
    // them IS the art, kept on the ground for eight seconds.
    for (const side of [-1, 1] as const) {
      lay(c, c.wx + Math.cos(c.dir + side * 1.5) * 0.2, c.wy + Math.sin(c.dir + side * 1.5) * 0.17,
        ASH, { life: 7, size: 0.042, fade: ASH_DARK, fadeAt: 0.55 });
    }
    lay(c, w.x1 + (rand() - 0.5) * 0.18, w.y1 + (rand() - 0.5) * 0.16, STEEL_PALE,
      { life: 8, size: 0.042, flicker: 4, fade: STRAW, fadeAt: 0.6 });
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.72) / 0.28);
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    const lift = sc * 0.4;
    ctx.save();
    ctx.translate(0, -lift);
    // THE EXTENSION: the corridor grows to full reach on an ease-out
    // and simply HOLDS there — the school's plainest statement.
    const outU = cl(c.t / 0.4);
    const reach = 1 - (1 - outU) * (1 - outU);
    const tipX = r.x0 + Math.cos(r.a) * r.len * reach;
    const tipY = r.y0 + Math.sin(r.a) * r.len * reach;
    seam(c, r.x0, r.y0, tipX, tipY, { alpha: fade });
    leafHead(ctx, tipX, tipY, r.a, sc * 0.18, squash, STEEL_MID, STEEL_WHITE);
    // THE SLIDE: the grip band fed forward down the haft, a short
    // bright bar crossing the corridor and chasing the point.
    const g = r.len * (0.12 + 0.72 * reach);
    const q = pt(c, g, r.a);
    const gw = sc * 0.1;
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(q.x + nx * gw, q.y + ny * gw - lift * 0);
    ctx.lineTo(q.x - nx * gw, q.y - ny * gw);
    ctx.stroke();
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1, sc * 0.018);
    ctx.beginPath();
    ctx.moveTo(q.x + nx * gw * 0.7, q.y + ny * gw * 0.7);
    ctx.lineTo(q.x - nx * gw * 0.7, q.y - ny * gw * 0.7);
    ctx.stroke();
    ctx.restore();
    if (outU >= 1) c.glow(runW(c).x1, runW(c).y1, 0.6, 0.3 * fade);
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.6) / 0.4);
    ctx.save();
    // THE STOP-LINE: one hard bar across the aim where the foot went
    // down, close to the body — everything past it was bought by reach.
    const b = pt(c, sc * 0.3, dir);
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2.5, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(b.x - Math.sin(dir) * sc * 0.2, b.y + Math.cos(dir) * sc * 0.2 * squash);
    ctx.lineTo(b.x + Math.sin(dir) * sc * 0.2, b.y - Math.cos(dir) * sc * 0.2 * squash);
    ctx.stroke();
    // THE GAP: the bought distance, drawn as a hairline that only
    // starts where the foot stopped. Edges only — no slab.
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = shade(IRON_DARK, -4);
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(r.x1, r.y1);
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------- reapers_turn

/**
 * REAPERS_TURN — "the wheel, and the shove off the end of it."
 * THE SWEEP EXEMPTION's third and last. The glaive's own art reads as
 * a WHEEL: the haft is a spoke turning out of the heart, the edge
 * rides the rim ahead of it, and there are no trailing ghosts — this
 * turn is heavy and single. What ends it is the thing nothing else in
 * the school does: a SHOVE. On the final bearing one hard bar is
 * struck square across the rim, and the floor's furrows are thrown
 * OUTWARD from that spot — the opposite of the hook's homeward drag,
 * and the reason the art moves bodies.
 */
const reapers_turn: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x9a1d);
    const end = c.dir + 1.2;
    blood.deployments.spray!(m, c.wx + Math.cos(c.dir) * c.radius * 0.8,
      c.wy + Math.sin(c.dir) * c.radius * 0.8, { dir: c.dir, scale: 0.5 });
    // The shove's earth goes AWAY down the finishing bearing.
    dust.deployments.gouge!(m, c.wx + Math.cos(end) * c.radius * 0.85,
      c.wy + Math.sin(end) * c.radius * 0.85, { dir: end, scale: 0.65 });
    for (let k = 0; k < 4; k++) {
      const a = c.dir - 1.2 + (k / 3) * 2.4 + (rand() - 0.5) * 0.16;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9,
        k === 3 ? STEEL_PALE : STRAW, { life: 7 + rand(), size: 0.044, fade: ASH_DARK, fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.66) / 0.34);
    const span = 2.4;
    const a0 = dir - span / 2;
    const turn = cl(c.t / 0.5);
    const edge = a0 + span * (1 - (1 - turn) * (1 - turn));
    const rr = c.rPx * 0.95;
    const lift = sc * 0.44;
    const cy = c.py - lift;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE SPOKE: the haft turning out of the heart. The wheel's axle
    // is the body, and the read is a lever, not a ribbon.
    const sx = c.px + Math.cos(edge) * rr;
    const sy = cy + Math.sin(edge) * rr * squash;
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(3, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(c.px, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = ASH;
    ctx.lineWidth = Math.max(1.2, sc * 0.02);
    ctx.beginPath();
    ctx.moveTo(c.px, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    // THE RIM: sleeve under one hard leading line, ahead of the spoke.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(4, sc * 0.12);
    ctx.beginPath();
    ctx.ellipse(c.px, cy, rr, rr * squash, 0, edge - 0.5, edge + 0.06);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = STEEL_WHITE;
    ctx.lineWidth = Math.max(1.5, sc * 0.028);
    ctx.beginPath();
    ctx.ellipse(c.px, cy, rr * 1.02, rr * 1.02 * squash, 0, edge - 0.26, edge + 0.06);
    ctx.stroke();
    // THE SHOVE: the bar struck square across the rim as the turn
    // finishes — the school's one outward push, painted once.
    if (turn >= 1) {
      const k = 1 - cl((c.t - 0.5) / 0.36);
      const bx = c.px + Math.cos(edge) * rr;
      const by = cy + Math.sin(edge) * rr * squash;
      const nx = Math.cos(edge);
      const ny = Math.sin(edge) * squash;
      const bw = sc * (0.3 + 0.26 * (1 - k));
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = STEEL_PALE;
      ctx.lineWidth = Math.max(3, sc * 0.07 * k);
      ctx.beginPath();
      ctx.moveTo(bx - ny * bw, by + nx * bw * squash);
      ctx.lineTo(bx + ny * bw, by - nx * bw * squash);
      ctx.stroke();
      c.glow(c.wx + Math.cos(edge) * c.radius, c.wy + Math.sin(edge) * c.radius, 0.8, 0.4 * k);
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.55) / 0.45);
    const turn = cl(c.t / 0.5);
    const rand = srand(c.seed ^ 0x9a1e);
    ctx.save();
    // The turned ground: one scuff band under the wheel, no fill ring.
    ctx.globalAlpha = 0.32 * fade;
    ctx.strokeStyle = shade(ASH_DARK, -6);
    ctx.lineWidth = Math.max(3, sc * 0.12);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.88, c.rPx * 0.88 * squash, 0, dir - 1.2, dir - 1.2 + 2.4 * turn);
    ctx.stroke();
    // THE OUTWARD FURROWS: three drags thrown away from the finish —
    // the exact inversion of hooking_reap's homeward chevrons.
    if (turn > 0.6) {
      const k = cl((turn - 0.6) / 0.4);
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = STRAW;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = dir + 1.2 + (i - 1) * 0.32 + (rand() - 0.5) * 0.14;
        const inner = c.rPx * 0.8;
        const outer = inner + c.rPx * 0.42 * k;
        ctx.moveTo(c.px + Math.cos(a) * inner, c.py + Math.sin(a) * inner * squash);
        ctx.lineTo(c.px + Math.cos(a) * outer, c.py + Math.sin(a) * outer * squash);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------- skullhook

/**
 * SKULLHOOK — "the ladder of the haul."
 * The halberd's beak, set behind the head and REELED. Like the
 * ladder's hooking_reap this is a pull — everything runs inward, and
 * that inversion is the read of the verb — but the mechanism is
 * different and so is the picture: the haul is a LADDER, two rails
 * scraped from the catch to the wielder with rungs of torn ground
 * between them, and the rungs pass and vanish as the catch comes in,
 * so the eye can count the distance being taken. Where the beak bit,
 * the iron leaves its cold: a small rime star opens on the catch and
 * stays after the rails are gone. No ring, no bloom, no bar.
 */
const skullhook: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x9a1f);
    const back = c.dir + Math.PI;
    const w = runW(c);
    blood.deployments.spray!(m, w.x1, w.y1, { dir: back, scale: 0.45 });
    dust.deployments.gouge!(m, w.x1, w.y1, { dir: back, scale: 0.5 });
    // The rungs left on the floor: paired grains stepping home.
    for (let k = 0; k < 3; k++) {
      const f = 0.9 - k * 0.26;
      for (const side of [-1, 1] as const) {
        lay(c, c.wx + Math.cos(c.dir) * c.radius * f + Math.cos(c.dir + side * 1.57) * 0.16,
          c.wy + Math.sin(c.dir) * c.radius * f + Math.sin(c.dir + side * 1.57) * 0.14,
          k === 0 ? STEEL_PALE : STRAW,
          { life: 7 + rand(), size: 0.042, fade: ASH_DARK, fadeAt: 0.6 });
      }
    }
  },
  air(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.7) / 0.3);
    const pull = cl((c.t - 0.1) / 0.6);
    const at = 1 - pull * pull * 0.72;
    const lift = sc * 0.38;
    const hx = c.px + Math.cos(dir) * c.rPx * at;
    const hy = c.py + Math.sin(dir) * c.rPx * at * squash - lift;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    // THE TAUT HAFT: from the fists out to the beak, ash under load.
    seam(c, c.px, c.py - lift, hx, hy,
      { w: 0.85, alpha: fade, sleeve: ASH_DARK, core: ASH, heart: STRAW });
    // THE BEAK: a closed iron hook whose opening faces the wielder —
    // the catch cannot come off it, and the shape says so.
    const hs = sc * 0.22;
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = Math.max(3, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(dir) * hs * 0.5, hy + Math.sin(dir) * hs * 0.5 * squash);
    ctx.lineTo(hx + nx * hs * 0.85, hy + ny * hs * 0.85);
    ctx.lineTo(hx - Math.cos(dir) * hs * 0.7 + nx * hs * 0.35,
      hy - Math.sin(dir) * hs * 0.7 * squash + ny * hs * 0.35);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = STEEL_WHITE;
    ctx.lineWidth = Math.max(1.2, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(dir) * hs * 0.4, hy + Math.sin(dir) * hs * 0.4 * squash);
    ctx.lineTo(hx + nx * hs * 0.65, hy + ny * hs * 0.65);
    ctx.stroke();
    // THE RIME STAR: the cold the iron leaves on the catch, opening
    // once as the beak sets and holding after the haul.
    if (c.t > 0.12) {
      const g = cl((c.t - 0.12) / 0.3);
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = STEEL_PALE;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = dir + 0.5 + (i / 3) * Math.PI;
        const rr = sc * 0.16 * g;
        ctx.moveTo(hx - Math.cos(a) * rr, hy - Math.sin(a) * rr * squash);
        ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * squash);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, sc, squash, dir } = c;
    const fade = 1 - cl((c.t - 0.62) / 0.38);
    const pull = cl((c.t - 0.08) / 0.62);
    ctx.save();
    // THE RAILS: two scrapes running from the catch back to the heels,
    // shortening at the far end as the ground is taken.
    const far = c.rPx * (1 - 0.7 * pull);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(ASH_DARK, -8);
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      const o = sc * 0.16 * side;
      ctx.moveTo(c.px + nx * o, c.py + ny * o);
      ctx.lineTo(c.px + Math.cos(dir) * far + nx * o, c.py + Math.sin(dir) * far * squash + ny * o);
    }
    ctx.stroke();
    // THE RUNGS: the distance being counted off — each rung passes
    // out of the ladder as the catch reaches it.
    ctx.globalAlpha = 0.65 * fade;
    ctx.strokeStyle = STRAW;
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const f = 0.22 + k * 0.24;
      if (f > 1 - 0.7 * pull) continue;
      const d = c.rPx * f;
      const bx = c.px + Math.cos(dir) * d;
      const by = c.py + Math.sin(dir) * d * squash;
      ctx.moveTo(bx + nx * sc * 0.15, by + ny * sc * 0.15);
      ctx.lineTo(bx - nx * sc * 0.15, by - ny * sc * 0.15);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// -------------------------------------------------------- couched_charge

/**
 * COUCHED_CHARGE — "the short run, honestly priced."
 * The knight's secret, and the second gold art the WEAPONS teach: it
 * is knights_charge's smaller cousin and must never be mistaken for
 * it, so it refuses the lane. The run is ONE gold thread — a single
 * rail, the width of a couched lance and not a road — and the arrival
 * is not a bar but a SHIVER: three gold splinters thrown back off the
 * point as the shaft takes the blow, gone in a breath. Two heel skids
 * where the run began, one stamp where it stopped. Everything about
 * it is smaller than the crown's charge on purpose.
 */
const couched_charge: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const w = runW(c);
    const rand = srand(c.seed ^ 0x9a20);
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.4 });
    dust.deployments.slam!(m, w.x1, w.y1, { scale: 0.5 });
    blood.deployments.spray!(m, w.x1, w.y1, { dir: c.dir, scale: 0.45 });
    for (let k = 0; k < 3; k++) {
      const f = 0.3 + (k / 2) * 0.6;
      lay(c, c.wx + (w.x1 - c.wx) * f + (rand() - 0.5) * 0.14,
        c.wy + (w.y1 - c.wy) * f + (rand() - 0.5) * 0.12,
        STRAW, { life: 7, size: 0.042, fade: ASH_DARK, fadeAt: 0.6 });
    }
    lay(c, w.x1, w.y1, GOLD_PALE, { life: 8, size: 0.04, flicker: 5, fade: GOLD_DEEP, fadeAt: 0.55 });
  },
  ground(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.58) / 0.42);
    const nx = -Math.sin(r.a);
    const ny = Math.cos(r.a) * squash;
    ctx.save();
    // THE THREAD: one gold rail down the run. No road, no second rail.
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = GOLD_LEAF;
    ctx.lineWidth = Math.max(1.5, sc * 0.032);
    ctx.beginPath();
    ctx.moveTo(r.x0, r.y0);
    ctx.lineTo(r.x1, r.y1);
    ctx.stroke();
    // The two heel skids at the push-off, thrown back off the line.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = ASH_DARK;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    ctx.beginPath();
    for (const side of [-1, 1] as const) {
      const o = sc * 0.12 * side;
      ctx.moveTo(r.x0 + nx * o, r.y0 + ny * o);
      ctx.lineTo(r.x0 + nx * o - Math.cos(r.a) * sc * 0.26, r.y0 + ny * o - Math.sin(r.a) * sc * 0.26 * squash);
    }
    ctx.stroke();
    // The stamp where the run stopped — one short bar, nothing round.
    if (c.t > 0.36) {
      const k = 1 - cl((c.t - 0.36) / 0.5);
      ctx.globalAlpha = 0.6 * k;
      ctx.strokeStyle = STRAW;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(r.x1 + nx * sc * 0.2, r.y1 + ny * sc * 0.2);
      ctx.lineTo(r.x1 - nx * sc * 0.2, r.y1 - ny * sc * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, sc, squash } = c;
    const r = run(c);
    const fade = 1 - cl((c.t - 0.68) / 0.32);
    const lift = sc * 0.4;
    ctx.save();
    ctx.translate(0, -lift);
    // THE COUCHED LINE: the lance held dead level, riding forward with
    // the body — a short corridor that TRAVELS instead of extending.
    const runU = cl(c.t / 0.38);
    const back = Math.max(0, runU - 0.3);
    const hx = r.x0 + Math.cos(r.a) * r.len * back;
    const hy = r.y0 + Math.sin(r.a) * r.len * back;
    const px = r.x0 + Math.cos(r.a) * r.len * runU;
    const py = r.y0 + Math.sin(r.a) * r.len * runU;
    seam(c, hx, hy, px, py, { w: 0.9, alpha: fade, sleeve: GOLD_DEEP, core: GOLD_LEAF, heart: GOLD_PALE });
    leafHead(ctx, px, py, r.a, sc * 0.16, squash, GOLD_LEAF, GOLD_PALE);
    // THE SHIVER: three splinters thrown BACK off the point as the
    // shaft takes the arrival. The blow, at the weapon's own scale.
    if (runU >= 1) {
      const k = 1 - cl((c.t - 0.38) / 0.34);
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = GOLD_PALE;
      ctx.lineWidth = Math.max(1.5, sc * 0.03 * k);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = r.a + Math.PI + (i - 1) * 0.42;
        const l = sc * (0.16 + 0.2 * (1 - k));
        ctx.moveTo(r.x1, r.y1);
        ctx.lineTo(r.x1 + Math.cos(a) * l, r.y1 + Math.sin(a) * l * squash);
      }
      ctx.stroke();
      c.glow(runW(c).x1, runW(c).y1, 0.8, 0.42 * k);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------- registry

/**
 * THE TWENTY — the polearm school's bespoke set-pieces. No centerpiece
 * repeats another's, in this file or any wave: the withdraw, the
 * ferruled butt, the hook come home, the planted lever, the measured
 * line, the stuttering pricks, the trailing edge, the travelling bead,
 * the standing picket, the gold lane, the peeled plate, the forked
 * tongue, the plumb fall, the pennon, the bar through the body, the
 * standing rod, the parting gate, the full lap, the held bar, and the
 * lance that says all of it at once.
 */
export const POLEARM_SIGS: Record<string, AbilitySig> = {
  lunging_skewer,
  haft_strike,
  hooking_reap,
  vaulting_step,
  perfect_thrust,
  flurry_of_points,
  crescent_reap,
  impaling_drive,
  wall_of_points,
  knights_charge,
  rampart_breaker,
  serpents_tongue,
  skydriver_fall,
  banner_advance,
  moulinet_guard,
  stormpoint,
  gatebreaker,
  sweeping_gyre,
  hold_the_line_polearm,
  sundering_lance,
  // THE ARMORY — the four the WEAPONS teach, in the same grammar and
  // sharing no centerpiece with the twenty: the hands sliding down
  // the haft, the wheel that shoves, the ladder of the haul, and the
  // short gold run that shivers instead of striking a bar.
  reaching_thrust,
  reapers_turn,
  skullhook,
  couched_charge,
};
