/**
 * THE SIGNATURE LAW — the twin school's voice.
 *
 * Eleven bespoke set-pieces for the dual-wield ladder. Same binding
 * laws as fxSignatures.ts: hard edges, save/restore hygiene, squash on
 * the ground, srand-deterministic geometry, frameDt-gated emission,
 * ≤60 path ops per hook per frame. The school's grammar is TWIN
 * STEEL: everything answers twice — paired trails, mirrored strokes,
 * crossed marks, counter-rotation. Nothing in this file arrives alone,
 * and no centerpiece is shared with any other school.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * The school's brick: a slim blade-streak quad — a cut hanging in the
 * air. Drawn at screen (x,y), length L px along angle a, lifted off
 * the ground, with a lit leading edge.
 */
function sliver(
  c: SigCtx,
  x: number,
  y: number,
  L: number,
  a: number,
  w: number,
  body: string,
  edge: string,
  alpha: number,
): void {
  const { ctx } = c;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - dx * L * 0.5 + nx * w, y - dy * L * 0.5 + ny * w);
  ctx.lineTo(x + dx * L * 0.5, y + dy * L * 0.5);
  ctx.lineTo(x - dx * L * 0.5 - nx * w, y - dy * L * 0.5 - ny * w);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1.2, w * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - dx * L * 0.5 + nx * w, y - dy * L * 0.5 + ny * w);
  ctx.lineTo(x + dx * L * 0.5, y + dy * L * 0.5);
  ctx.stroke();
}

/**
 * TWIN_CUT — "the one-two."
 * Each beat of the pair stamps one cut: a slim steel sliver slanting
 * across the aim, the answering beat arriving on the OTHER diagonal so
 * the two live frames cross into an X mid-air. Shear glints leave the
 * meeting point the way filings leave a whetstone.
 */
const twin_cut: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd1);
    const side = rand() < 0.5 ? 1 : -1;
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.55,
        c.wy + Math.sin(c.dir) * c.radius * 0.55 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        {
          speed: 1.8 + rand() * 1.0,
          life: 0.3,
          size: 0.05,
          gravity: 4,
          dir: c.dir + side * (0.5 + rand() * 0.4),
          spread: 0.15,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { t, sc, dir } = c;
    if (t > 0.6) return;
    const f = t / 0.6;
    const rand = srand(c.seed ^ 0xd1);
    const side = rand() < 0.5 ? 1 : -1;
    c.ctx.save();
    // The cut: one diagonal of the X, sliding through the mark.
    const p = groundPt(c, c.rPx * (0.4 + 0.35 * f), dir);
    const lift = sc * 0.6;
    sliver(
      c,
      p.x,
      p.y - lift,
      sc * (0.95 - 0.25 * f),
      dir + side * 0.55,
      sc * 0.07,
      c.st.mid,
      c.st.core,
      0.8 * (1 - f),
    );
    c.ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.6, 0.18 * (1 - f));
  },
};

/**
 * HERON_STEP — "the two wakes."
 * The step through leaves both edges' wakes: two parallel shear lines
 * flanking the stride, pinching together at the exit point — the body
 * went between its own knives. Red flecks bead along the wakes where
 * the toll was collected.
 */
const heron_step: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd2);
    const a = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    for (let k = 0; k < 4; k++) {
      const f = 0.3 + k * 0.18;
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f,
        c.wy + (c.wy2 - c.wy) * f - 0.45,
        1,
        [c.st.deep, '#a83a2e'],
        {
          speed: 0.7 + rand() * 0.5,
          life: 0.4,
          size: 0.05,
          gravity: 5,
          dir: a + (k % 2 ? 1 : -1) * (Math.PI / 2),
          spread: 0.3,
        },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.7) return;
    const fade = 1 - t / 0.7;
    const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const lift = sc * 0.45;
    ctx.save();
    ctx.lineCap = 'round';
    // Two wakes, one per hand, converging on the exit.
    for (const s of [-1, 1]) {
      const off = sc * 0.24 * s;
      ctx.globalAlpha = (s < 0 ? 0.75 : 0.55) * fade;
      ctx.strokeStyle = s < 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(c.px + nx * off, c.py + ny * off - lift);
      ctx.lineTo(c.px2 + nx * off * 0.15, c.py2 + ny * off * 0.15 - lift);
      ctx.stroke();
    }
    // The pinch: a short cross where the wakes meet past the exit.
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.2, sc * 0.035);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(c.px2 - Math.cos(a + s * 0.5) * sc * 0.16, c.py2 - Math.sin(a + s * 0.5) * sc * 0.16 - lift);
      ctx.lineTo(c.px2 + Math.cos(a + s * 0.5) * sc * 0.16, c.py2 + Math.sin(a + s * 0.5) * sc * 0.16 - lift);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * CROSSED_THROW — "the crossing point."
 * The knives are projectiles; the signature is the ARGUMENT where one
 * lands: a small X-flare — two short slivers crossing at the wound —
 * with a single glint spat back along the flight line, the losing
 * knife's opinion.
 */
const crossed_throw: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd3);
    c.particles.burst(c.wx, c.wy - 0.5, 1, [c.st.spark, c.st.core], {
      speed: 2.2 + rand() * 0.8,
      life: 0.3,
      size: 0.05,
      gravity: 3,
      dir: rand() * Math.PI * 2,
      spread: 0.2,
      shape: 'glint',
    });
  },
  air(c) {
    const { t, sc } = c;
    if (t > 0.5) return;
    const f = t / 0.5;
    const rand = srand(c.seed ^ 0xd3);
    const base = rand() * Math.PI;
    const lift = sc * 0.5;
    c.ctx.save();
    for (const s of [-1, 1]) {
      sliver(
        c,
        c.px,
        c.py - lift,
        sc * 0.55 * (1 - f * 0.3),
        base + s * 0.55,
        sc * 0.05,
        s < 0 ? c.st.mid : c.st.core,
        c.st.spark,
        0.85 * (1 - f),
      );
    }
    c.ctx.restore();
    c.glow(c.wx, c.wy, 0.45, 0.2 * (1 - f));
  },
};

/**
 * MIRRORED_HAND — "the second shadow."
 * While the stance rides, a pale after-hand orbits the caster exactly
 * counter-phased to a bright one — left chasing right around the body,
 * meeting twice a turn. Where they pass, a thin seam of light stands
 * for a blink: the mirror's edge.
 */
const mirrored_hand: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t < 0.08 ? t / 0.08 : t > 0.85 ? (1 - t) / 0.15 : 1;
    const lift = sc * 0.75;
    const a = c.now / 260;
    ctx.save();
    // The two hands: bright and shadow, counter-phased around the body.
    for (const s of [0, 1]) {
      const ang = s ? Math.PI - a : a;
      const r = sc * 0.52;
      ctx.globalAlpha = (s ? 0.4 : 0.75) * fade;
      ctx.strokeStyle = s ? st.mid : st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.05);
      ctx.beginPath();
      ctx.arc(c.px, c.py - lift, r, ang - 0.45, ang + 0.45);
      ctx.stroke();
    }
    // The mirror's edge: a seam flash when the hands align.
    const align = Math.abs(Math.sin(a));
    if (align > 0.92) {
      ctx.globalAlpha = (align - 0.92) / 0.08 * 0.7 * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.2, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py - lift - sc * 0.62);
      ctx.lineTo(c.px, c.py - lift + sc * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  },
  ground(c) {
    // Two counter-circling glint points at the feet — the stance's
    // quiet clock, readable even under the body.
    const { ctx, st, t, sc, squash } = c;
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    const a = c.now / 260;
    ctx.save();
    for (const s of [0, 1]) {
      const ang = s ? Math.PI - a : a;
      const p = groundPt(c, sc * 0.6, ang);
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = s ? st.mid : st.core;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, sc * 0.05, sc * 0.05 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * TURNING_REEL — "the counter-round."
 * The full turn reads as a dance figure: two crescent trails chase
 * each other OPPOSITE ways around the rim — one blade clockwise, one
 * counter — and sparks stand at the two points where they pass. No
 * other ring in the game runs both directions at once.
 */
const turning_reel: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd5);
    for (const s of [-1, 1]) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash - 0.4,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.6, life: 0.35, size: 0.05, gravity: 3, dir: a + (s * Math.PI) / 2, spread: 0.2, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.75) return;
    const fade = 1 - t / 0.75;
    const lift = sc * 0.55;
    const r = c.rPx * (0.5 + 0.45 * Math.min(1, t / 0.3));
    ctx.save();
    // Two crescents, counter-chasing.
    for (const s of [-1, 1]) {
      const a = s * (c.now / 110);
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = s < 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift, r, r * c.squash, 0, a, a + 1.5);
      ctx.stroke();
    }
    // The pass points: sparks where the two blades meet.
    for (const s of [0, Math.PI]) {
      const p = groundPt(c, r, s);
      ctx.globalAlpha = 0.9 * fade * (0.5 + 0.5 * Math.abs(Math.sin(c.now / 110)));
      ctx.fillStyle = st.spark;
      ctx.fillRect(p.x - sc * 0.035, p.y - lift - sc * 0.035, sc * 0.07, sc * 0.07);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 * fade);
  },
};

/**
 * RED_RIBBONS — "the spool."
 * The weaving stance trails two ribbons — one red, one pale steel —
 * winding around the body in counter-spirals, low, the way thread
 * leaves a turning spool. Every so often the red one lets a drop go.
 */
const red_ribbons: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t < 0.08 ? t / 0.08 : t > 0.85 ? (1 - t) / 0.15 : 1;
    const lift = sc * 0.6;
    ctx.save();
    ctx.lineCap = 'round';
    // Two counter-winding ribbons: three segments each, breathing.
    for (const s of [-1, 1]) {
      const base = s * (c.now / 210);
      ctx.globalAlpha = (s < 0 ? 0.7 : 0.5) * fade;
      ctx.strokeStyle = s < 0 ? st.mid : st.core;
      ctx.lineWidth = Math.max(1.5, sc * (s < 0 ? 0.055 : 0.04));
      ctx.beginPath();
      for (let k = 0; k <= 3; k++) {
        const a = base + k * 0.75;
        const r = sc * (0.42 + 0.1 * Math.sin(a * 1.7 + s));
        const x = c.px + Math.cos(a) * r;
        const y = c.py - lift + Math.sin(a) * r * c.squash - k * sc * 0.09 * s;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // The drop the red ribbon lets go.
    if (Math.random() < c.frameDt * 3 * fade) {
      c.particles.burst(c.wx, c.wy - 0.5, 1, [st.mid, st.deep], {
        speed: 0.5, life: 0.5, size: 0.05, gravity: 6, spread: 0.4,
      });
    }
  },
};

/**
 * SWALLOW'S_DIVE — "two points down."
 * The leap leaves twin feather-streaks rising off the launch point;
 * the landing stamps a narrow V into the ground — two shear lines
 * meeting where the points went in — and the crater's answer is a
 * single upthrown spark pair, one per blade.
 */
const swallows_dive: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') {
      // Takeoff: two feather-streaks up and back from the launch.
      for (const s of [-1, 1]) {
        c.particles.burst(c.wx, c.wy - 0.6, 1, [c.st.core, c.st.mid], {
          speed: 1.6, life: 0.4, size: 0.06, gravity: -2, dir: -Math.PI / 2 + s * 0.4, spread: 0.15, shape: 'streak',
        });
      }
      return;
    }
    // Landing: the spark pair out of the crater.
    for (const s of [-1, 1]) {
      c.particles.burst(c.wx + s * 0.2, c.wy - 0.2, 1, [c.st.spark, c.st.core], {
        speed: 2.4, life: 0.45, size: 0.07, gravity: 7, dir: -Math.PI / 2 + s * 0.5, spread: 0.2, shape: 'glint',
      });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const rand = srand(c.seed ^ 0xd7);
    const a = rand() * Math.PI; // the V's heading, cast-stable
    ctx.save();
    ctx.lineCap = 'round';
    // The V: two shear lines meeting at the entry point.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    for (const s of [-1, 1]) {
      const ang = a + s * 0.4;
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(c.px + Math.cos(ang) * c.rPx * 0.7, c.py + Math.sin(ang) * c.rPx * 0.7 * squash);
      ctx.stroke();
    }
    // The lit inner edge of each arm, young only.
    if (t < 0.35) {
      ctx.globalAlpha = 0.8 * (1 - t / 0.35);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.2, sc * 0.03);
      for (const s of [-1, 1]) {
        const ang = a + s * 0.32;
        ctx.beginPath();
        ctx.moveTo(c.px, c.py);
        ctx.lineTo(c.px + Math.cos(ang) * c.rPx * 0.5, c.py + Math.sin(ang) * c.rPx * 0.5 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

/**
 * THE_SHEARS — "the thread snaps."
 * Two long edges close across the aim like shear blades — top and
 * bottom of the same decision — and the moment they meet, a short
 * thread line on the ground parts into two pieces that drift apart.
 */
const the_shears: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    if (t > 0.55) return;
    const close = Math.min(1, t / 0.3); // the blades meet at 0.3
    const fade = 1 - t / 0.55;
    const p = groundPt(c, c.rPx * 0.55, dir);
    const lift = sc * 0.55;
    ctx.save();
    for (const s of [-1, 1]) {
      const gap = (1 - close) * 0.6;
      sliver(
        c,
        p.x,
        p.y - lift + s * sc * 0.05,
        sc * 1.05,
        dir + s * gap,
        sc * 0.06,
        s < 0 ? st.mid : st.core,
        st.spark,
        0.85 * fade,
      );
    }
    // The snap glint at the meeting point.
    if (close >= 1 && t < 0.42) {
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.spark;
      ctx.fillRect(p.x - sc * 0.04, p.y - lift - sc * 0.04, sc * 0.08, sc * 0.08);
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.6, 0.2 * fade);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.3 || t > 0.8) return;
    const f = (t - 0.3) / 0.5;
    const p = groundPt(c, c.rPx * 0.55, dir);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    // The thread, in two pieces, drifting apart as the cut settles.
    const drift = sc * 0.08 * f;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(p.x + nx * (drift * s + s * sc * 0.06), p.y + ny * (drift * s + s * sc * 0.06));
      ctx.lineTo(p.x + nx * (drift * s + s * sc * 0.3), p.y + ny * (drift * s + s * sc * 0.3));
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * STORM_OF_TWO — "the ring and its echo."
 * Every pulse of the carried storm rings twice: the strike ring, and a
 * fainter echo-ring half a step behind it — the off hand's answer laid
 * over the main's. Two glints counter-circle the eye between pulses.
 */
const storm_of_two: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.8) return;
    const fade = 1 - t / 0.8;
    const r = c.rPx * (0.3 + 0.7 * Math.min(1, t / 0.35));
    ctx.save();
    // The echo-ring: trailing the grammar's own strike ring.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r * 0.72, r * 0.72 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.7) return;
    const fade = 1 - t / 0.7;
    const lift = sc * 0.6;
    ctx.save();
    for (const s of [-1, 1]) {
      const a = s * (c.now / 130);
      const p = { x: c.px + Math.cos(a) * sc * 0.45, y: c.py - lift + Math.sin(a) * sc * 0.45 * c.squash };
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = s < 0 ? st.core : st.spark;
      ctx.fillRect(p.x - sc * 0.03, p.y - sc * 0.03, sc * 0.06, sc * 0.06);
    }
    ctx.restore();
  },
};

/**
 * HUNDRED_HANDS — "count the hands."
 * Each beat of the flurry hangs one after-image blade sliver in the
 * air at its own angle of the fan — beats overlap, so mid-storm the
 * caster stands inside three or four hanging cuts at once, and the
 * count keeps changing before the eye can finish it.
 */
const hundred_hands: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd9);
    c.particles.burst(c.wx, c.wy - 0.55, 2, [c.st.spark, c.st.core], {
      speed: 1.4 + rand() * 0.8,
      life: 0.3,
      size: 0.045,
      gravity: 3,
      dir: rand() * Math.PI * 2,
      spread: 0.4,
      shape: 'glint',
    });
  },
  air(c) {
    const { t, sc, dir } = c;
    if (t > 0.65) return;
    const f = t / 0.65;
    const rand = srand(c.seed ^ 0xd9);
    const side = rand() < 0.5 ? 1 : -1;
    const fan = dir + side * (0.25 + rand() * 0.75);
    const p = groundPt(c, c.rPx * 0.45, fan);
    c.ctx.save();
    sliver(
      c,
      p.x,
      p.y - sc * 0.65 + f * sc * 0.08,
      sc * (0.8 - 0.2 * f),
      fan + side * 0.3,
      sc * 0.055,
      c.st.mid,
      c.st.core,
      0.75 * (1 - f),
    );
    c.ctx.restore();
    c.glow(c.wx, c.wy, 0.7, 0.15 * (1 - f));
  },
};

/**
 * TWO_ANSWERS — "the second word."
 * The page won off a champion: the first answer is a heavy cut quad;
 * the second is its exact mirror stamped over it a blink later, and
 * together they brand a brief X on the ground where the argument
 * ended. Gold motes drift back to the hand that asked — the drain.
 */
const two_answers: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xda);
    // The kept share: motes leaving the mark for the caster.
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        {
          speed: 1.4 + rand() * 0.6,
          life: 0.4,
          size: 0.05,
          gravity: 0,
          dir: c.dir + Math.PI,
          spread: 0.25,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { t, sc, dir } = c;
    if (t > 0.6) return;
    const f = t / 0.6;
    const rand = srand(c.seed ^ 0xda);
    const side = rand() < 0.5 ? 1 : -1;
    const p = groundPt(c, c.rPx * 0.5, dir);
    const lift = sc * 0.6;
    c.ctx.save();
    // The answer: one heavy diagonal — the beat pair crosses in time.
    sliver(c, p.x, p.y - lift, sc * 1.1, dir + side * 0.5, sc * 0.085, c.st.mid, c.st.core, 0.85 * (1 - f));
    c.ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.7, 0.22 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.2 || t > 0.85) return;
    const f = (t - 0.2) / 0.65;
    const p = groundPt(c, c.rPx * 0.5, dir);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.6 * (1 - f);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.8, sc * 0.05);
    // The X brand where the two answers agreed.
    for (const s of [-1, 1]) {
      const a = dir + s * 0.55;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(a) * sc * 0.3, p.y - Math.sin(a) * sc * 0.3 * squash);
      ctx.lineTo(p.x + Math.cos(a) * sc * 0.3, p.y + Math.sin(a) * sc * 0.3 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- registry

/**
 * The twin school's wave of THE SIGNATURE LAW — merged into the master
 * SIGNATURES table in fxSignatures.ts.
 */
export const DUALWIELD_SIGS: Record<string, AbilitySig> = {
  twin_cut,
  heron_step,
  crossed_throw,
  mirrored_hand,
  turning_reel,
  red_ribbons,
  swallows_dive,
  the_shears,
  storm_of_two,
  hundred_hands,
  two_answers,
};
