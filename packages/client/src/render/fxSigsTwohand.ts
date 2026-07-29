/**
 * THE SIGNATURE LAW — the colossus's voice.
 *
 * Twelve bespoke set-pieces for the great school plus the founding
 * pair's weapon arts. Same binding laws as fxSignatures.ts: hard
 * edges, save/restore hygiene, squash on the ground, srand-
 * deterministic geometry, frameDt-gated emission, ≤60 path ops per
 * hook per frame. The school's grammar is WEIGHT AND AFTERMATH:
 * everything here is thrown, dropped, or split — dust falls in banks,
 * stone leaves the ground in slabs, and every centerpiece is the
 * moment AFTER the mass arrives.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** An upthrown stone: a flat square chunk with one lit face. */
function stone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  col: string,
  lit: string,
  rot = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = col;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.fillStyle = lit;
  ctx.fillRect(-s / 2, -s / 2, s, Math.max(1, s * 0.3));
  ctx.restore();
}

/**
 * The school's shared sweep band: a thick level crescent at hip
 * height with a bright leading edge — the visible weight of a
 * greatsteel stroke. Sweeps `from`→`to` (ground angles), alive
 * through `f` 0..1 of its own little life.
 */
function sweepBand(c: SigCtx, from: number, to: number, f: number, rFrac = 0.8): void {
  const { ctx, st, sc } = c;
  const r = c.rPx * rFrac;
  const lift = sc * 0.42;
  const head = from + (to - from) * Math.min(1, f * 1.25);
  ctx.save();
  ctx.globalAlpha = 0.62 * (1 - f);
  ctx.strokeStyle = st.mid;
  ctx.lineWidth = Math.max(2, sc * 0.15);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(c.px, c.py - lift, r, r * c.squash, 0, from, head, to < from);
  ctx.stroke();
  ctx.globalAlpha = 0.9 * (1 - f);
  ctx.strokeStyle = st.core;
  ctx.lineWidth = Math.max(1.5, sc * 0.05);
  ctx.beginPath();
  ctx.ellipse(c.px, c.py - lift, r + sc * 0.07, (r + sc * 0.07) * c.squash, 0, from, head, to < from);
  ctx.stroke();
  ctx.restore();
}

/**
 * WIDE_SWATH — "the horizon line."
 * One level stroke drawn as a single long band across the whole arc,
 * hip height, bright-edged; glints shear off the trailing third and
 * the turf under the sweep wears a brief swept skirt.
 */
const wide_swath: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b1);
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (rand() - 0.5) * 2.0;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.75,
        c.wy + Math.sin(a) * c.radius * 0.75 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.6 + rand(), life: 0.4, size: 0.07, gravity: 5, dir: a + 0.5, spread: 0.3, shape: 'glint' },
      );
    }
  },
  air(c) {
    if (c.t > 0.5) return;
    sweepBand(c, c.dir - 1.2, c.dir + 1.2, c.t / 0.5);
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t > 0.6) return;
    ctx.save();
    ctx.globalAlpha = 0.2 * (1 - t / 0.6);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, c.sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.7, c.rPx * 0.7 * c.squash, 0, c.dir - 1.1, c.dir + 1.1);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * HAFT_CHECK — "the rude period."
 * The shortest sentence in the school: a blunt square flash where the
 * butt lands, one flat pressure square leaving it, and nothing else —
 * the restraint IS the signature next to the school's mountains.
 */
const haft_check: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b2);
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.45,
        1,
        [c.st.spark],
        { speed: 1.4 + rand() * 0.8, life: 0.3, size: 0.06, gravity: 6, dir: c.dir, spread: 0.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.4) return;
    const f = t / 0.4;
    const p = groundPt(c, c.rPx * (0.4 + 0.3 * f), c.dir);
    const s = sc * 0.34 * (1 - f * 0.4);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - f);
    ctx.fillStyle = st.core;
    ctx.fillRect(p.x - s / 2, p.y - sc * 0.5 - s / 2, s, s);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.strokeRect(p.x - s * 0.8, p.y - sc * 0.5 - s * 0.8, s * 1.6, s * 1.6);
    ctx.restore();
  },
};

/**
 * IRON_PENDULUM — "the tick and the tock."
 * Two opposed sweep bands on their own clocks — the first crosses
 * one way, the second answers on the return plane while the first
 * still hangs — with glints shed at each turnaround.
 */
const iron_pendulum: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b3);
    for (let k = 0; k < 4; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(
        c.wx + Math.cos(c.dir + side * 1.1) * c.radius * 0.7,
        c.wy + Math.sin(c.dir + side * 1.1) * c.radius * 0.7 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.5 + rand(), life: 0.35, size: 0.07, gravity: 5, dir: c.dir + side * 1.4, spread: 0.4, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { t } = c;
    if (t < 0.45) sweepBand(c, c.dir - 1.1, c.dir + 1.1, t / 0.45, 0.75);
    if (t >= 0.3 && t < 0.8) sweepBand(c, c.dir + 1.1, c.dir - 1.1, (t - 0.3) / 0.5, 0.62);
  },
};

/**
 * FAULT_LINE — "the ground picks a side."
 * A dark fissure wedge cracks open along the aim — jagged, widening
 * to a mouth then settling shut — while stones leave the near lip and
 * a low dust bank stands along the far one.
 */
const fault_line: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b4);
    for (let k = 0; k < 5; k++) {
      const along = 0.2 + rand() * 0.8;
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * along,
        c.wy + Math.sin(c.dir) * c.radius * along * c.squash,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.2 + rand(), life: 0.6, size: 0.1, gravity: 7, dir: -Math.PI / 2, spread: 0.7 },
      );
    }
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * (0.4 + rand() * 0.5),
        c.wy + Math.sin(c.dir) * c.radius * (0.4 + rand() * 0.5) * c.squash,
        1,
        [c.st.deep],
        { speed: 0.5, life: 0.8, size: 0.14, gravity: -0.6, shape: 'puff', wobble: 0.3 },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x2b5);
    // The mouth: open fast, hold, settle.
    const open = t < 0.25 ? t / 0.25 : t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    const segs = 6;
    ctx.save();
    ctx.globalAlpha = 0.85 * Math.max(0, open);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    let px0 = c.px;
    let py0 = c.py;
    ctx.moveTo(px0, py0);
    const w = sc * 0.16 * open;
    const upper: Array<[number, number]> = [];
    for (let k = 1; k <= segs; k++) {
      const along = (k / segs) * c.rPx * 1.3;
      const jag = (rand() - 0.5) * sc * 0.3;
      const p = groundPt(c, along, c.dir);
      const nx = -Math.sin(c.dir);
      const ny = Math.cos(c.dir) * c.squash;
      ctx.lineTo(p.x + nx * (jag + w), p.y + ny * (jag + w));
      upper.push([p.x + nx * (jag - w), p.y + ny * (jag - w)]);
    }
    for (let k = upper.length - 1; k >= 0; k--) ctx.lineTo(upper[k]![0], upper[k]![1]);
    ctx.closePath();
    ctx.fill();
    // The lit near lip.
    ctx.globalAlpha = 0.5 * Math.max(0, open);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    const tip = groundPt(c, c.rPx * 1.3, c.dir);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * COLOSSUS_STANCE — "the standing forge."
 * The buff is a body of heat: ember glints climb the caster's column
 * while low flame licks stand a ring at the boots — a forge lit, not
 * a fire burning. Emission is frameDt-gated and dies with the spawn
 * window; the buff's own tray clock does the bookkeeping.
 */
const colossus_stance: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b6);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * 0.45,
        c.wy + Math.sin(a) * 0.45 * c.squash,
        1,
        [c.st.mid, c.st.spark],
        { speed: 0.5, life: 0.5, size: 0.11, gravity: -2.6, shape: 'lick', flicker: 0.3, fade: c.st.deep },
      );
    }
  },
  air(c) {
    if (c.t > 0.8 || c.frameDt <= 0) return;
    // Climbing glints: a slow column of sparks up the body line.
    if (srand(c.seed ^ (c.age | 0))() < c.frameDt * 8) {
      const rand = srand(c.seed ^ 0x2b7 ^ (c.age | 0));
      c.particles.burst(c.wx + (rand() - 0.5) * 0.5, c.wy - rand() * 0.8, 1, [c.st.spark], {
        speed: 0.4,
        life: 0.6,
        size: 0.06,
        gravity: -1.8,
        shape: 'glint',
      });
    }
    c.glow(c.wx, c.wy, 0.9, 0.18 * (1 - c.t));
  },
};

/**
 * SKYSUNDER — "the meteor step."
 * The landing is the art: a bright falling column snaps down over the
 * crater, the rim throws a ring of stones, and a dust curtain stands
 * up and FALLS outward — a verdict, then its echo.
 */
const skysunder: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2b8);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.8 + rand() * 1.2, life: 0.6, size: 0.11, gravity: 7, dir: a, spread: 0.2 },
      );
    }
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash,
        1,
        [c.st.deep],
        { speed: 0.7, life: 0.9, size: 0.16, gravity: -0.4, shape: 'puff', wobble: 0.4, fade: c.st.deep },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.3) return;
    const f = t / 0.3;
    // The falling column: from high over the crater down onto it.
    const h = sc * 3.2 * (1 - f);
    ctx.save();
    ctx.globalAlpha = 0.75 * (1 - f * 0.6);
    ctx.fillStyle = st.core;
    ctx.fillRect(c.px - sc * 0.07, c.py - sc * 0.6 - h, sc * 0.14, h);
    ctx.globalAlpha = 0.4 * (1 - f);
    ctx.fillStyle = st.mid;
    ctx.fillRect(c.px - sc * 0.16, c.py - sc * 0.5 - h * 0.85, sc * 0.32, h * 0.85);
    ctx.restore();
    c.glow(c.wx, c.wy, 1.2, 0.35 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t < 0.08 || t > 0.7) return;
    const f = (t - 0.08) / 0.62;
    const rand = srand(c.seed ^ 0x2b9);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - f);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.6;
      const p = groundPt(c, c.rPx * (0.5 + 0.45 * f), a);
      stone(ctx, p.x, p.y - c.sc * 0.2 * (1 - f), c.sc * (0.1 + rand() * 0.08), st.deep, st.mid, rand() * 1.2);
    }
    ctx.restore();
  },
};

/**
 * EXECUTIONERS_ARC — "the low lantern."
 * A narrow, dark, waist-low sweep that ends in one bright terminal
 * flash — the whole art reads as the LAST stroke of a fight, and the
 * droplets that follow fall dark and dry.
 */
const executioners_arc: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2ba);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir + 0.5) * c.radius * 0.7,
        c.wy + Math.sin(c.dir + 0.5) * c.radius * 0.7 * c.squash - 0.3,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.0 + rand() * 0.8, life: 0.5, size: 0.07, gravity: 8, dir: c.dir + 0.6, spread: 0.4, fade: c.st.deep },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.55) return;
    const f = t / 0.55;
    sweepBand(c, c.dir - 0.7, c.dir + 0.7, f, 0.72);
    // The terminal flash: the arc's end learns it was the point.
    if (f > 0.6) {
      const p = groundPt(c, c.rPx * 0.72, c.dir + 0.7);
      const ff = (f - 0.6) / 0.4;
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - ff);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.05);
      const s = sc * 0.3 * (0.5 + ff);
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - sc * 0.42);
      ctx.lineTo(p.x + s, p.y - sc * 0.42);
      ctx.moveTo(p.x, p.y - sc * 0.42 - s);
      ctx.lineTo(p.x, p.y - sc * 0.42 + s);
      ctx.stroke();
      ctx.restore();
    }
  },
};

/**
 * AVALANCHE — "three stones down the hill."
 * The flurry's beats each get their own rockfall: three staggered
 * volleys of falling chunks inside the arc, each landing with a dust
 * stamp — the hill keeps arriving until it is finished.
 */
const avalanche: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x2bb);
    // Three volleys on staggered windows.
    for (let v = 0; v < 3; v++) {
      const start = v * 0.22;
      if (t < start || t > start + 0.3) continue;
      const f = (t - start) / 0.3;
      ctx.save();
      ctx.globalAlpha = 0.85 * (1 - f * f);
      for (let k = 0; k < 3; k++) {
        const a = c.dir + (rand() - 0.5) * 1.3;
        const p = groundPt(c, c.rPx * (0.35 + rand() * 0.5), a);
        const drop = sc * 1.6 * (1 - f);
        stone(ctx, p.x, p.y - sc * 0.15 - drop, sc * (0.09 + rand() * 0.07), st.deep, st.core, rand() * 1.5 + f);
      }
      ctx.restore();
    }
  },
  spawn(c) {
    const rand = srand(c.seed ^ 0x2bc);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * (0.3 + rand() * 0.5),
        c.wy + Math.sin(c.dir) * c.radius * (0.3 + rand() * 0.5) * c.squash,
        1,
        [c.st.deep],
        { speed: 0.5, life: 0.7, size: 0.13, gravity: -0.5, shape: 'puff', wobble: 0.3 },
      );
    }
  },
};

/**
 * BREAKER_CHARGE — "the plow line."
 * The dash leaves a furrow: clods thrown to BOTH sides along the
 * whole run, and at the far end a blunt wedge flash — the shoulder
 * arriving — with the line itself scored briefly into the turf.
 */
const breaker_charge: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2bd);
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const ang = Math.atan2(dy, dx);
    for (let k = 0; k < 7; k++) {
      const along = rand();
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(c.wx + dx * along, c.wy + dy * along, 1, [c.st.mid, c.st.deep], {
        speed: 1.3 + rand() * 0.8,
        life: 0.5,
        size: 0.09,
        gravity: 7,
        dir: ang + side * 1.9,
        spread: 0.3,
      });
    }
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t > 0.5) return;
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - t / 0.5);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, c.sc * 0.09);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(c.px2, c.py2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.35) return;
    const f = t / 0.35;
    const ang = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - f);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    const s = sc * 0.5 * (0.6 + 0.4 * f);
    ctx.moveTo(c.px2 + Math.cos(ang) * s, c.py2 + Math.sin(ang) * s - sc * 0.5);
    ctx.lineTo(c.px2 + Math.cos(ang + 2.4) * s * 0.6, c.py2 + Math.sin(ang + 2.4) * s * 0.6 - sc * 0.5);
    ctx.lineTo(c.px2 + Math.cos(ang - 2.4) * s * 0.6, c.py2 + Math.sin(ang - 2.4) * s * 0.6 - sc * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

/**
 * TITANS_VERDICT — "the gavel rings."
 * Every pulse is a spoken ring: the expanding ground band CRACKS into
 * flat segments as it travels, and stones stand briefly on the second
 * and third rings — the earth agreeing in courses, not in fire.
 */
const titans_verdict: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.85) return;
    const rand = srand(c.seed ^ 0x2be);
    const f = t / 0.85;
    const r = c.rPx * (0.3 + 0.7 * f);
    const segs = 10;
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - f);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.08);
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI * 2 + f * 0.4;
      const gap = 0.12 + f * 0.3;
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * c.squash, 0, a0 + gap / 2, a0 + (Math.PI * 2) / segs - gap / 2);
      ctx.stroke();
    }
    // Standing stones on the mid-life ring.
    if (f > 0.3 && f < 0.8) {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.5 + rand() * 0.4;
        const p = groundPt(c, r, a);
        stone(ctx, p.x, p.y - sc * 0.12, sc * 0.11, st.deep, st.core, (rand() - 0.5) * 0.6);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * (0.4 + 0.6 * f), 0.2 * (1 - f));
  },
  spawn(c) {
    const rand = srand(c.seed ^ 0x2bf);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.4,
        c.wy + Math.sin(a) * c.radius * 0.4 * c.squash,
        1,
        [c.st.mid, c.st.spark],
        { speed: 1.4 + rand(), life: 0.5, size: 0.09, gravity: 6, dir: a, spread: 0.3 },
      );
    }
  },
};

/**
 * COLOSSUS_ARC — "the full turn."
 * The greatblade's weapon art closes the circle: one sweep band that
 * runs the whole way around the caster, glints shed on the far side
 * where the eye least expects steel to still be moving.
 */
const colossus_arc: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2c0);
    for (let k = 0; k < 6; k++) {
      const a = c.dir + Math.PI + (rand() - 0.5) * 1.6;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.5 + rand(), life: 0.4, size: 0.07, gravity: 5, dir: a + 0.6, spread: 0.3, shape: 'glint' },
      );
    }
  },
  air(c) {
    if (c.t > 0.6) return;
    sweepBand(c, c.dir - Math.PI, c.dir + Math.PI, c.t / 0.6, 0.78);
  },
};

/**
 * QUAKEFALL — "the county line."
 * The maul's word: one massive stamp — a broad flat shock ellipse,
 * long fissures walking out of the print, a heavy slow dust bank,
 * and the deepest glow the school owns. Nothing rises; everything
 * SETTLES.
 */
const quakefall: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2c1);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.3;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.6,
        c.wy + Math.sin(a) * c.radius * 0.6 * c.squash,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.6 + rand() * 1.4, life: 0.7, size: 0.12, gravity: 7, dir: a, spread: 0.2 },
      );
    }
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1,
        [c.st.deep],
        { speed: 0.6, life: 1.1, size: 0.18, gravity: -0.3, shape: 'puff', wobble: 0.3, fade: c.st.deep },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x2c2);
    const f = Math.min(1, t / 0.8);
    ctx.save();
    // The print: a broad flat shock band.
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, sc * 0.14);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * (0.4 + 0.5 * f), c.rPx * (0.4 + 0.5 * f) * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Fissures walking out of it.
    ctx.globalAlpha = 0.8 * (1 - f * 0.7);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3 + rand() * 0.3;
      const len = c.rPx * (0.5 + rand() * 0.6) * (0.4 + 0.6 * f);
      const mid = groundPt(c, len * 0.55, a);
      const tip = groundPt(c, len, a + (rand() - 0.5) * 0.3);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.3 * (1 - f));
  },
};

/**
 * GIANTSFALL — "the felling stroke."
 * The page remembers one thing: how the tall come down. A single huge
 * blade-streak drops from far above the fight to the mark, holds
 * buried a beat, and the impact throws chips and one bright star —
 * the whole signature is vertical.
 */
const giantsfall: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2c3);
    for (let k = 0; k < 6; k++) {
      const a = c.dir + (rand() - 0.5) * 0.8;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.6,
        c.wy + Math.sin(a) * c.radius * 0.6 * c.squash - 0.3,
        1,
        [c.st.spark, c.st.core],
        { speed: 2.0 + rand() * 1.4, life: 0.5, size: 0.08, gravity: 6, dir: a, spread: 0.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.5) return;
    const f = t / 0.5;
    const p = groundPt(c, c.rPx * 0.6, c.dir);
    // The stroke: a tall tapering streak snapping down onto the mark.
    const drop = f < 0.4 ? f / 0.4 : 1;
    const h = sc * 3.6;
    const top = p.y - sc * 0.4 - h * (1 - drop) - h * 0.9 * drop;
    const bot = p.y - sc * 0.3 - h * (1 - drop);
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - f * f);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(p.x - sc * 0.1, top);
    ctx.lineTo(p.x + sc * 0.1, top);
    ctx.lineTo(p.x + sc * 0.03, bot);
    ctx.lineTo(p.x - sc * 0.03, bot);
    ctx.closePath();
    ctx.fill();
    // The buried star.
    if (drop >= 1) {
      const ff = (f - 0.4) / 0.6;
      ctx.globalAlpha = 0.9 * (1 - ff);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.05);
      const s = sc * 0.4 * (0.5 + ff);
      for (const a of [0.4, 1.6, 2.7, -0.9]) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - sc * 0.2);
        ctx.lineTo(p.x + Math.cos(a) * s, p.y - sc * 0.2 + Math.sin(a) * s * 0.6);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.6, c.wy + Math.sin(c.dir) * c.radius * 0.6, 0.9, 0.3 * (1 - f));
  },
};

// ============================================= THE ARMORY's weapon arts

/**
 * HEWERS_WHEEL — "the round."
 * The axe's answer to the colossus arc: the full circle, but rougher —
 * the band judders (an axe bites where a blade glides) and wood-pale
 * chips shear off the whole circumference instead of glints.
 */
const hewers_wheel: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d0);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash - 0.35,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.6 + rand(), life: 0.45, size: 0.08, gravity: 6, dir: a + 0.5, spread: 0.4 },
      );
    }
  },
  air(c) {
    if (c.t > 0.6) return;
    sweepBand(c, c.dir - Math.PI, c.dir + Math.PI, c.t / 0.6, 0.74);
  },
};

/**
 * REAVERS_DUE — "the toll arm."
 * A short flat shove of a sweep, then the payment: a handful of
 * coin-bright glints thrown PAST the arc's end, the direction the
 * argument left in.
 */
const reavers_due: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d1);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 2.4 + rand() * 1.2, life: 0.5, size: 0.06, gravity: 7, dir: c.dir, spread: 0.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    if (c.t > 0.45) return;
    sweepBand(c, c.dir - 0.55, c.dir + 0.55, c.t / 0.45, 0.78);
  },
};

/**
 * MOURNFIELD — "the plot."
 * Grave-quiet: a cold border breathes around the marked ground and
 * slow pale wisps stand up out of it and hang. Nothing bursts —
 * this is the school's one patient signature.
 */
const mournfield: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    const breathe = 0.86 + 0.08 * Math.sin(c.age * 2.4);
    ctx.save();
    ctx.globalAlpha = 0.4 * (1 - t * 0.6);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, c.sc * 0.08);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * breathe, c.rPx * breathe * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    if (c.frameDt <= 0 || c.t > 0.9) return;
    if (srand(c.seed ^ (c.age * 7 | 0))() < c.frameDt * 5) {
      const rand = srand(c.seed ^ 0x2d2 ^ (c.age * 13 | 0));
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * rand() * 0.8,
        c.wy + Math.sin(a) * c.radius * rand() * 0.8 * c.squash,
        1,
        [c.st.mid],
        { speed: 0.25, life: 1.3, size: 0.1, gravity: -0.5, shape: 'puff', wobble: 0.2, fade: c.st.deep },
      );
    }
  },
};

/**
 * ASH_HARVEST — "the ember row."
 * The reap leaves a row: embers keep standing up out of the swept
 * ground for a beat after the stroke, born exactly where the band
 * passed — the harvest smoulders where it fell.
 */
const ash_harvest: AbilitySig = {
  air(c) {
    if (c.t < 0.55) sweepBand(c, c.dir - 1.1, c.dir + 1.1, c.t / 0.55, 0.76);
    if (c.frameDt <= 0 || c.t > 0.85) return;
    if (srand(c.seed ^ (c.age * 9 | 0))() < c.frameDt * 10) {
      const rand = srand(c.seed ^ 0x2d3 ^ (c.age * 11 | 0));
      const a = c.dir + (rand() - 0.5) * 2.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash,
        1,
        [c.st.spark, c.st.core],
        { speed: 0.5, life: 0.7, size: 0.07, gravity: -2.4, shape: 'lick', flicker: 0.4, fade: c.st.deep },
      );
    }
  },
};

/**
 * GLACIER_SUNDER — "the shelf calves."
 * Not a point-fall like the skysunder — a whole flat SLAB of cold
 * drops across the mark at once, and the landing throws pale shards
 * and one hard frost ring.
 */
const glacier_sunder: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d4);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.55,
        c.wy + Math.sin(a) * c.radius * 0.55 * c.squash,
        1,
        [c.st.core, c.st.mid],
        { speed: 1.5 + rand(), life: 0.55, size: 0.09, gravity: 6, dir: a, spread: 0.25, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.28) return;
    const f = t / 0.28;
    // The slab: wide and flat, arriving whole.
    const h = sc * 2.6 * (1 - f);
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - f * 0.5);
    ctx.fillStyle = st.core;
    ctx.fillRect(c.px - c.rPx * 0.5, c.py - sc * 0.5 - h - sc * 0.35, c.rPx, sc * 0.35);
    ctx.globalAlpha = 0.35 * (1 - f);
    ctx.fillStyle = st.mid;
    ctx.fillRect(c.px - c.rPx * 0.38, c.py - sc * 0.42 - h * 0.85 - sc * 0.5, c.rPx * 0.76, sc * 0.5);
    ctx.restore();
    c.glow(c.wx, c.wy, 1.1, 0.3 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t < 0.2 || t > 0.75) return;
    const f = (t - 0.2) / 0.55;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, c.sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * (0.35 + 0.6 * f), c.rPx * (0.35 + 0.6 * f) * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * CROWNS_WORD — "spoken twice."
 * Two gold rings, one per pulse, each cresting with a brief crown of
 * upward sparks at its rim — the court hears it, then the stragglers.
 */
const crowns_word: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    for (const start of [0, 0.4] as const) {
      if (t < start || t > start + 0.36) continue;
      const f = (t - start) / 0.36;
      ctx.save();
      ctx.globalAlpha = 0.75 * (1 - f);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2, c.sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, c.rPx * (0.3 + 0.65 * f), c.rPx * (0.3 + 0.65 * f) * c.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },
  air(c) {
    if (c.frameDt <= 0 || c.t > 0.8) return;
    if (srand(c.seed ^ (c.age * 8 | 0))() < c.frameDt * 9) {
      const rand = srand(c.seed ^ 0x2d5 ^ (c.age * 17 | 0));
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1,
        [c.st.spark],
        { speed: 0.7, life: 0.45, size: 0.06, gravity: -3.2, shape: 'glint' },
      );
    }
  },
};

/**
 * LAST_ARGUMENT — "the closing line."
 * The widest band the school draws, and at its end the full stop:
 * one bright cross-flash where the sentence ends. Radiant glints
 * shear off BOTH shoulders of the stroke.
 */
const last_argument: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d6);
    for (const side of [-1, 1] as const) {
      for (let k = 0; k < 3; k++) {
        const a = c.dir + side * (0.9 + rand() * 0.5);
        c.particles.burst(
          c.wx + Math.cos(a) * c.radius * 0.75,
          c.wy + Math.sin(a) * c.radius * 0.75 * c.squash - 0.4,
          1,
          [c.st.core, c.st.spark],
          { speed: 1.8 + rand(), life: 0.5, size: 0.08, gravity: 5, dir: a + side * 0.4, spread: 0.3, shape: 'glint' },
        );
      }
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.6) return;
    const f = t / 0.6;
    sweepBand(c, c.dir - 1.35, c.dir + 1.35, f, 0.82);
    if (f > 0.65) {
      const p = groundPt(c, c.rPx * 0.82, c.dir + 1.35);
      const ff = (f - 0.65) / 0.35;
      ctx.save();
      ctx.globalAlpha = 0.95 * (1 - ff);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.06);
      const s = sc * 0.42 * (0.4 + ff);
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - sc * 0.44);
      ctx.lineTo(p.x + s, p.y - sc * 0.44);
      ctx.moveTo(p.x, p.y - sc * 0.44 - s);
      ctx.lineTo(p.x, p.y - sc * 0.44 + s);
      ctx.stroke();
      ctx.restore();
      c.glow(c.wx + Math.cos(c.dir + 1.35) * c.radius * 0.8, c.wy + Math.sin(c.dir + 1.35) * c.radius * 0.8, 0.8, 0.35 * (1 - ff));
    }
  },
};

/**
 * BARROW_BITE — "the closed jaws."
 * Two short opposing crescents SNAP shut over the arc's heart — an
 * upper and lower tooth-line meeting — and dry bone chips fall out
 * of the bite.
 */
const barrow_bite: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d7);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.35,
        1,
        [c.st.core, c.st.deep],
        { speed: 0.9 + rand() * 0.7, life: 0.55, size: 0.07, gravity: 8, dir: c.dir + (rand() - 0.5), spread: 0.6 },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.4) return;
    const f = t / 0.4;
    const p = groundPt(c, c.rPx * 0.6, c.dir);
    const gap = sc * 0.7 * (1 - f);
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - f * f);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.09);
    ctx.lineCap = 'round';
    // Upper and lower tooth-lines closing on the heart.
    ctx.beginPath();
    ctx.arc(p.x, p.y - sc * 0.4 - gap, sc * 0.36, 0.4, Math.PI - 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y - sc * 0.4 + gap, sc * 0.36, Math.PI + 0.4, -0.4);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * THUNDER_FELL — "the argument overhead."
 * One hard bolt snaps down onto the mark in the first breath, then
 * the fell: stones and a shock ring arrive while the bolt's afterglow
 * is still deciding whether it was first.
 */
const thunder_fell: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d8);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash,
        1,
        [c.st.mid, c.st.deep],
        { speed: 1.6 + rand() * 1.1, life: 0.55, size: 0.1, gravity: 7, dir: a, spread: 0.25 },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.22) return;
    const f = t / 0.22;
    // The bolt: a hard zigzag out of the top of the frame.
    ctx.save();
    ctx.globalAlpha = 0.95 * (1 - f);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(c.px + sc * 0.3, c.py - sc * 3.4);
    ctx.lineTo(c.px - sc * 0.12, c.py - sc * 2.1);
    ctx.lineTo(c.px + sc * 0.14, c.py - sc * 1.9);
    ctx.lineTo(c.px - sc * 0.04, c.py - sc * 0.4);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 1.3, 0.4 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t } = c;
    if (t < 0.1 || t > 0.6) return;
    const f = (t - 0.1) / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2, c.sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * (0.3 + 0.65 * f), c.rPx * (0.3 + 0.65 * f) * c.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * WHITE_HEAT — "the lit forge."
 * The stance signature: a low warm ring underfoot and a steady rise
 * of forge embers off the body for as long as the metal is willing.
 */
const white_heat: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2d9);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.6;
      c.particles.burst(
        c.wx + Math.cos(a) * 0.4,
        c.wy + Math.sin(a) * 0.4 * c.squash,
        1,
        [c.st.spark, c.st.core],
        { speed: 0.5, life: 0.5, size: 0.09, gravity: -3.0, shape: 'lick', flicker: 0.4, fade: c.st.deep },
      );
    }
  },
  air(c) {
    if (c.t > 0.85 || c.frameDt <= 0) return;
    if (srand(c.seed ^ (c.age * 6 | 0))() < c.frameDt * 7) {
      const rand = srand(c.seed ^ 0x2da ^ (c.age * 19 | 0));
      c.particles.burst(c.wx + (rand() - 0.5) * 0.55, c.wy - rand() * 0.7, 1, [c.st.spark], {
        speed: 0.4,
        life: 0.6,
        size: 0.07,
        gravity: -2.2,
        shape: 'lick',
        flicker: 0.5,
      });
    }
    c.glow(c.wx, c.wy, 0.9, 0.2 * (1 - c.t));
  },
};

/**
 * PALE_CRESCENT — "the ebb."
 * One thin, slow, moon-wide band — the quietest stroke in the school
 * — and where it has passed, still frost dots HANG instead of flying.
 */
const pale_crescent: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t < 0.6) {
      // A slimmer band than the school's shared one: quiet on purpose.
      const f = t / 0.6;
      const r = c.rPx * 0.8;
      const head = c.dir - 1.2 + 2.4 * Math.min(1, f * 1.25);
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - f);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - sc * 0.42, r, r * c.squash, 0, c.dir - 1.2, head);
      ctx.stroke();
      ctx.restore();
    }
    if (c.frameDt <= 0 || c.t > 0.8) return;
    if (srand(c.seed ^ (c.age * 5 | 0))() < c.frameDt * 8) {
      const rand = srand(c.seed ^ 0x2db ^ (c.age * 23 | 0));
      const a = c.dir + (rand() - 0.5) * 2.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.75,
        c.wy + Math.sin(a) * c.radius * 0.75 * c.squash - 0.3,
        1,
        [c.st.core],
        { speed: 0.1, life: 0.9, size: 0.06, gravity: -0.2, shape: 'glint' },
      );
    }
  },
};

/**
 * HORIZON_FALL — "the brought mountain."
 * The heaviest landing in the file: the skysunder's column but wider,
 * TWO stone rings leaving the crater a beat apart, and a dust bank
 * that stands and then lies down where the horizon used to be.
 */
const horizon_fall: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x2dc);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.55,
        c.wy + Math.sin(a) * c.radius * 0.55 * c.squash,
        1,
        [c.st.mid, c.st.deep],
        { speed: 2.0 + rand() * 1.4, life: 0.65, size: 0.12, gravity: 7, dir: a, spread: 0.2 },
      );
    }
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1,
        [c.st.deep],
        { speed: 0.6, life: 1.2, size: 0.18, gravity: -0.3, shape: 'puff', wobble: 0.35, fade: c.st.deep },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.3) return;
    const f = t / 0.3;
    const h = sc * 3.6 * (1 - f);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - f * 0.5);
    ctx.fillStyle = st.core;
    ctx.fillRect(c.px - sc * 0.12, c.py - sc * 0.6 - h, sc * 0.24, h);
    ctx.globalAlpha = 0.4 * (1 - f);
    ctx.fillStyle = st.mid;
    ctx.fillRect(c.px - sc * 0.26, c.py - sc * 0.5 - h * 0.85, sc * 0.52, h * 0.85);
    ctx.restore();
    c.glow(c.wx, c.wy, 1.4, 0.4 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t } = c;
    const rand = srand(c.seed ^ 0x2dd);
    // Two stone rings, a beat apart.
    for (const [start, n] of [[0.06, 7], [0.24, 5]] as const) {
      if (t < start || t > start + 0.55) continue;
      const f = (t - start) / 0.55;
      ctx.save();
      ctx.globalAlpha = 0.8 * (1 - f);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rand() * 0.7;
        const p = groundPt(c, c.rPx * (0.4 + 0.5 * f), a);
        stone(ctx, p.x, p.y - c.sc * 0.24 * (1 - f), c.sc * (0.09 + rand() * 0.09), st.deep, st.mid, rand() * 1.4);
      }
      ctx.restore();
    }
  },
};

export const TWOHAND_SIGS: Record<string, AbilitySig> = {
  wide_swath,
  haft_check,
  iron_pendulum,
  fault_line,
  colossus_stance,
  skysunder,
  executioners_arc,
  avalanche,
  breaker_charge,
  titans_verdict,
  colossus_arc,
  quakefall,
  giantsfall,
  hewers_wheel,
  reavers_due,
  mournfield,
  ash_harvest,
  glacier_sunder,
  crowns_word,
  last_argument,
  barrow_bite,
  thunder_fell,
  white_heat,
  pale_crescent,
  horizon_fall,
};
