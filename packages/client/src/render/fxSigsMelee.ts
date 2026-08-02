/**
 * THE SIGNATURE LAW — the melee wave.
 *
 * Twelve bespoke set-pieces for the warrior roster, composed on top
 * of the v3 grammar in the renderer's three strata. Same binding laws
 * as fxSignatures.ts: hard edges, save/restore hygiene, squash on the
 * ground, srand-deterministic geometry, frameDt-gated emission, ≤60
 * path ops per hook per frame. The signature must SAY the mechanic —
 * a knockback plows, an execute lodges, a stun makes the floor ring.
 * No centerpiece here repeats another's, nor any exemplar's.
 */

import { shade } from './rig.js';
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, blood, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * HEAVY_SLAM — "the fault line."
 * The overhead blow does not scatter — it SPLITS: one jagged fault
 * races out along the aim, its lips offset like slipped strata.
 * Shear slabs step off the crack sideways while grit keeps popping
 * out of the widening gap until the ground settles.
 */
const heavy_slam: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The blow lands: earth gouges out ALONG the swing — chunks hop
    // off the fault, low billow rides them, fines rain back and lie.
    dust.deployments.gouge!(m,
      c.wx + Math.cos(c.dir) * c.radius * 0.55,
      c.wy + Math.sin(c.dir) * c.radius * 0.55,
      { dir: c.dir, scale: 1.1 });
    // A dust wall stands up where the shock dies at reach.
    dust.deployments.billow!(m,
      c.wx + Math.cos(c.dir) * c.radius * 0.9,
      c.wy + Math.sin(c.dir) * c.radius * 0.9,
      { radius: 0.4, dur: 0.7, scale: 0.8 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x52);
    const reach = Math.min(1, t / 0.3); // the split races out
    const fade = t < 0.5 ? 1 : (1 - t) / 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // The fault itself: a jagged polyline whose stations kink hard
    // off the aim line — slipped strata, not a groove.
    const n = 5;
    const pts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k <= n; k++) {
      const f = (k / n) * reach;
      const kink = k === 0 ? 0 : (rand() - 0.5) * rPx * 0.22;
      const p = groundPt(c, rPx * (0.15 + 0.85 * f), dir);
      pts.push({ x: p.x - Math.sin(dir) * kink, y: p.y + Math.cos(dir) * kink * squash });
    }
    const gap = Math.min(1, t / 0.4); // the gap yawns open
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.11 * gap);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[k]!.x, pts[k]!.y);
    ctx.stroke();
    // The lit lip: one edge of the split catches the light.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const off = sc * 0.055 * gap;
      (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[k]!.x - Math.sin(dir) * off, pts[k]!.y + Math.cos(dir) * off * squash);
    }
    ctx.stroke();
    // Shear slabs step off the crack sideways, each its own throw.
    for (let k = 0; k < 3; k++) {
      const f = 0.3 + rand() * 0.6;
      if (f > reach) continue;
      const side = rand() < 0.5 ? 1 : -1;
      const p = groundPt(c, rPx * (0.15 + 0.85 * f), dir);
      const len = sc * (0.14 + rand() * 0.1);
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.deep : shade(st.deep, -12);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.sin(dir) * len * side, p.y + Math.cos(dir) * len * side * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    // Grit keeps popping out of the widening gap while it yawns —
    // a tiny library breath at a random station along the fault.
    if (c.t < 0.6 && Math.random() < c.frameDt * 12) {
      const f = 0.2 + Math.random() * 0.8 * Math.min(1, c.t / 0.3);
      dust.deployments.kick!(asMatter(c),
        c.wx + Math.cos(c.dir) * c.radius * f,
        c.wy + Math.sin(c.dir) * c.radius * f, { scale: 0.25 });
    }
    c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.5, c.wy + Math.sin(c.dir) * c.radius * 0.5, c.radius * 0.7, 0.3 * (1 - c.t));
  },
};

/**
 * BLOODLUST — "the red tithe."
 * Six seconds where every wound pays the arm: droplets lift off the
 * ground and fall INWARD, tithed to the body, while a double-thump
 * heartbeat ring contracts onto the chest — lub, dub — and the
 * ground circle drinks itself smaller.
 */
const bloodlust: AbilitySig = {
  spawn(c) {
    // The circle drinks: blood converges out of the ring INTO the
    // caster — the library's tithe, real streaks and gobbets flowing
    // the wrong way for as long as the rite holds.
    blood.deployments.drink!(asMatter(c), c.wx, c.wy, {
      radius: 1.15, dur: 1.1, scale: 1,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = 1 - t;
    // The circle drinks: a dashed ring that contracts on the caster,
    // its dashes crawling inward along the shrink.
    ctx.save();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.setLineDash([sc * 0.12, sc * 0.09]);
    ctx.lineDashOffset = c.now / 30;
    const rr = sc * (1.0 - t * 0.55);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const chestY = py - sc * 0.55;
    ctx.save();
    // The heartbeat: lub, dub — two rings per beat, each born wide
    // and CONTRACTING onto the chest. Hunger pulls inward.
    const beat = (c.now % 820) / 820;
    for (let k = 0; k < 2; k++) {
      const pt = beat - (k === 0 ? 0 : 0.22);
      if (pt < 0 || pt > 0.3) continue;
      const f = pt / 0.3;
      const rr = sc * (0.85 - f * 0.5);
      ctx.globalAlpha = (k === 0 ? 0.6 : 0.4) * (1 - f) * (1 - t * 0.5);
      ctx.strokeStyle = k === 0 ? st.mid : st.spark;
      ctx.lineWidth = Math.max(1.5, sc * (k === 0 ? 0.05 : 0.03));
      ctx.beginPath();
      ctx.ellipse(px, chestY, rr, rr * squash * 1.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Stray droplets keep tithing in for the buff's whole life.
    // (The inward flow itself is the blood.drink emitter from spawn.)
  },
};

/**
 * TWIN_STRIKE — "the double tally."
 * Two shafts loosed as one land as a score-keeper's mark: parallel
 * tally gashes cut into the ground a heartbeat apart, each with a
 * white nick at its head, bracketed by a twin chevron flash.
 */
const twin_strike: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x71);
    const a = rand() * Math.PI;
    // Punch-through slivers spray past the impact, paired lanes.
    for (let k = 0; k < 6; k++) {
      const off = k % 2 === 0 ? 0.14 : -0.14;
      c.particles.burst(c.wx - Math.sin(a) * off, c.wy + Math.cos(a) * off * c.squash, 1, [c.st.spark, c.st.mid], {
        speed: 2.6, life: 0.35, size: 0.07, gravity: 4, dir: a, spread: 0.2, shape: 'streak',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x72);
    const a = rand() * Math.PI;
    const R = Math.max(c.rPx, sc * 0.8);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    // Two tally gashes, the second landing a beat after the first —
    // loosed as one, scored as two.
    for (let k = 0; k < 2; k++) {
      const grown = Math.min(1, Math.max(0, (t - k * 0.09) / 0.16));
      if (grown <= 0) continue;
      const off = (k === 0 ? -1 : 1) * sc * 0.16;
      const cx = c.px - Math.sin(a) * off;
      const cy = c.py + Math.cos(a) * off * squash;
      const len = R * 0.95 * grown;
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = k === 0 ? st.deep : shade(st.deep, -10);
      ctx.lineWidth = Math.max(2, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * len * 0.5, cy - Math.sin(a) * len * 0.5 * squash);
      ctx.lineTo(cx + Math.cos(a) * len * 0.5, cy + Math.sin(a) * len * 0.5 * squash);
      ctx.stroke();
      // The white nick at the tally's head, freshest cut last.
      ctx.globalAlpha = 0.9 * fade * grown;
      ctx.fillStyle = st.core;
      const nx = cx + Math.cos(a) * len * 0.5;
      const ny = cy + Math.sin(a) * len * 0.5 * squash;
      const g = Math.max(2, sc * 0.06);
      ctx.fillRect(nx - g / 2, ny - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    if (t >= 0.3) return;
    const rand = srand(c.seed ^ 0x73);
    const a = rand() * Math.PI;
    const ft = 1 - t / 0.3;
    ctx.save();
    // The twin chevron: a bracket stamped over the impact, both
    // arrowheads flying the shafts' shared line.
    ctx.globalAlpha = ft * 0.85;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.lineJoin = 'miter';
    for (let k = 0; k < 2; k++) {
      const d = sc * (0.22 + k * 0.2) * (1 + t);
      const hx = px + Math.cos(a) * d;
      const hy = py - sc * 0.4 + Math.sin(a) * d * 0.5;
      const w = sc * 0.14;
      ctx.beginPath();
      ctx.moveTo(hx - Math.cos(a) * w - Math.sin(a) * w, hy - Math.sin(a) * w * 0.5 + Math.cos(a) * w);
      ctx.lineTo(hx, hy);
      ctx.lineTo(hx - Math.cos(a) * w + Math.sin(a) * w, hy - Math.sin(a) * w * 0.5 - Math.cos(a) * w);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * EARTHBREAKER — "the conceding plates."
 * The verdict lands and the ground CONCEDES: a ring of strata plates
 * around the crater jolts up plate by plate and reseats, edges
 * flashing as they lift, while the center sits down into a sunken
 * disc and a dust column climbs off the settlement.
 */
const earthbreaker: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    // The plates concede: the full ground smash where the leap lands,
    // and a standing column of thrown earth breathing off it.
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 1.25 });
    dust.deployments.billow!(m, c.wx, c.wy, { radius: 0.45, dur: 1.1, scale: 0.9 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (c.kind === 'dash') {
      // The verdict falls: its shadow gathers at the landing mark.
      ctx.save();
      ctx.globalAlpha = 0.4 * t;
      ctx.fillStyle = st.deep;
      const rr = sc * 0.5 * t;
      ctx.beginPath();
      ctx.ellipse(c.px2, c.py2, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0x82);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    ctx.save();
    // The sunken heart: the ground sits DOWN where the verdict stood.
    ctx.globalAlpha = 0.45 * fade;
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.34, rPx * 0.34 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.03, rPx * 0.34, rPx * 0.34 * squash, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    // The conceding plates: seven strata quads around the crater,
    // each jolting up on its own clock and reseating.
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (c.seed % 7) * 0.2;
      const r0 = rPx * (0.48 + rand() * 0.08);
      const r1 = r0 + rPx * (0.3 + rand() * 0.12);
      const half = (Math.PI / n) * 0.72;
      const ph = Math.min(1, Math.max(0, t * 2.4 - k * 0.14));
      const lift = Math.sin(ph * Math.PI) * sc * 0.16;
      const p0 = groundPt(c, r0, a - half);
      const p1 = groundPt(c, r0, a + half);
      const p2 = groundPt(c, r1, a + half);
      const p3 = groundPt(c, r1, a - half);
      ctx.globalAlpha = (0.4 + 0.3 * (lift > 0.5 ? 1 : 0)) * fade;
      ctx.fillStyle = k % 2 === 0 ? st.deep : shade(st.deep, 10);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - lift);
      ctx.lineTo(p1.x, p1.y - lift);
      ctx.lineTo(p2.x, p2.y - lift * 0.4);
      ctx.lineTo(p3.x, p3.y - lift * 0.4);
      ctx.closePath();
      ctx.fill();
      // The lifted edge catches light while the plate is airborne.
      if (lift > sc * 0.02) {
        ctx.globalAlpha = 0.8 * fade * Math.sin(ph * Math.PI);
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.5, sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y - lift);
        ctx.lineTo(p1.x, p1.y - lift);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.35 * fade);
  },
  air(c) {
    if (c.kind === 'dash') {
      // The descent: a heavy comet drops toward the mark, shedding.
      const { ctx, st, t, sc } = c;
      ctx.save();
      ctx.globalAlpha = 0.8 * (1 - t * 0.5);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.09);
      ctx.beginPath();
      const fx = c.px + (c.px2 - c.px) * t;
      const fy = c.py + (c.py2 - c.py) * t - sc * (1.1 - t) * 1.4;
      ctx.moveTo(fx - (c.px2 - c.px) * 0.12, fy - sc * 0.3);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.restore();
      // Grit shakes loose off the leaping body — one library breath
      // per gated beat, falling from the flight line.
      if (Math.random() < c.frameDt * 14) {
        dust.deployments.kick!(asMatter(c),
          c.wx + (c.wx2 - c.wx) * t, c.wy + (c.wy2 - c.wy) * t, { scale: 0.3 });
      }
      return;
    }
    // (The settlement's dust column is the billow emitter from spawn.)
  },
};

/**
 * REND — "the opened seam."
 * A shallow cut that bleeds like a deep one: the swing leaves one
 * ragged seam whose two lips pull APART over its life, dark wound
 * showing between them, droplets beading along its length and
 * dripping long after the arc is gone.
 */
const rend: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const wx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const wy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    // The seam opens: a directed spray leaves along the cut...
    blood.deployments.spray!(m, wx, wy, { dir: c.dir, scale: 0.9 });
    // ...and the wound keeps giving — drops falling and flecking the
    // ground for as long as the seam weeps.
    blood.deployments.drip!(m, wx, wy, { dur: 1.3, scale: 1 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const rand = srand(c.seed ^ 0x92);
    const open = Math.min(1, t / 0.5); // the lips pull apart
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const n = 4;
    ctx.save();
    ctx.lineCap = 'butt';
    // The seam rides the swing's reach: station points along the arc.
    const px: number[] = [];
    const py: number[] = [];
    for (let k = 0; k <= n; k++) {
      const a = dir - 0.42 + (0.84 * k) / n;
      const rr = rPx * (0.68 + (rand() - 0.5) * 0.1);
      const p = groundPt(c, rr, a);
      px.push(p.x);
      py.push(p.y);
    }
    // The wound between the lips: a dark band, widening.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -16);
    ctx.lineWidth = Math.max(2, sc * 0.09 * open);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, px[k]!, py[k]!);
    ctx.stroke();
    // Two lips separating off the wound line.
    for (let s = 0; s < 2; s++) {
      const off = (s === 0 ? -1 : 1) * sc * 0.05 * open;
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = s === 0 ? st.mid : st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const a = dir - 0.42 + (0.84 * k) / n;
        (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, px[k]! + Math.cos(a) * off, py[k]! + Math.sin(a) * off * squash);
      }
      ctx.stroke();
    }
    // Droplets bead along the seam as the bleed sets in.
    if (t > 0.25) {
      ctx.fillStyle = st.spark;
      for (let k = 0; k < 4; k++) {
        const bt = Math.min(1, (t - 0.25 - k * 0.08) / 0.2);
        if (bt <= 0) continue;
        const f = rand();
        const i = Math.min(n - 1, Math.floor(f * n));
        const bx = px[i]! + (px[i + 1]! - px[i]!) * (f * n - i);
        const by = py[i]! + (py[i + 1]! - py[i]!) * (f * n - i);
        const g = Math.max(2, sc * 0.05 * bt);
        ctx.globalAlpha = 0.85 * fade * bt;
        ctx.fillRect(bx - g / 2, by - g / 2, g, g);
      }
    }
    ctx.restore();
  },
  air(c) {
    // The seam keeps weeping: slow drips off the cut line.
    // (The seep itself is the blood.drip emitter from spawn.)
  },
};

/**
 * BULL_RUSH — "the herringbone wake."
 * The shoulder becomes the argument and the ground shows the work: a
 * plowed lane opens behind the charge, paired furrows peeling off
 * both sides like a herringbone field, while the blunt shoulder
 * wedge drives the front behind its own speed slivers.
 */
const bull_rush: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The launch: earth gouges out BEHIND the charge — the push-off.
    dust.deployments.gouge!(asMatter(c), c.wx, c.wy, {
      dir: ang + Math.PI, scale: 0.7,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0xa2);
    const ease = 1 - (1 - Math.min(1, t / 0.7)) ** 2; // the charge lands early
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const ang = Math.atan2(py2 - py, px2 - px);
    const hx = px + (px2 - px) * ease;
    const hy = py + (py2 - py) * ease;
    ctx.save();
    ctx.lineCap = 'butt';
    // The plowed lane: a churned center line dragged to the head.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.07);
    ctx.setLineDash([sc * 0.14, sc * 0.1]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.setLineDash([]);
    // Herringbone furrows: pairs peel back off both sides at each
    // station the shoulder has already passed.
    for (let k = 0; k < 5; k++) {
      const f = 0.12 + (k / 5) * 0.8 + rand() * 0.06;
      if (f > ease) continue;
      const sx = px + (px2 - px) * f;
      const sy = py + (py2 - py) * f;
      const len = sc * (0.2 + rand() * 0.1);
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.mid : st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;
        const ba = ang + Math.PI - side * 0.7; // raked backward
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(ba) * len, sy + Math.sin(ba) * len * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const ease = 1 - (1 - Math.min(1, t / 0.7)) ** 2;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const ang = Math.atan2(py2 - py, px2 - px);
    const hx = px + (px2 - px) * ease;
    const hy = py + (py2 - py) * ease - sc * 0.45;
    ctx.save();
    // The shoulder wedge: a blunt triangle driving the front.
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = st.mid;
    const w = sc * 0.3;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * w * 1.2, hy + Math.sin(ang) * w * 0.5);
    ctx.lineTo(hx - Math.sin(ang) * w * 0.6, hy - w * 0.55);
    ctx.lineTo(hx + Math.sin(ang) * w * 0.6, hy + w * 0.55);
    ctx.closePath();
    ctx.fill();
    // Speed slivers trail the wedge.
    ctx.fillStyle = st.core;
    for (let k = 0; k < 3; k++) {
      const d = sc * (0.35 + k * 0.24);
      ctx.globalAlpha = (0.6 - k * 0.15) * fade;
      ctx.fillRect(hx - Math.cos(ang) * d - sc * 0.1, hy - Math.sin(ang) * d - Math.max(1, sc * 0.02), sc * 0.2, Math.max(2, sc * 0.04));
    }
    ctx.restore();
    // Hoof-dust hammers up under the charge — one library breath per
    // gated beat, at wherever the charge has reached.
    if (t < 0.75 && Math.random() < c.frameDt * 13) {
      dust.deployments.kick!(asMatter(c),
        c.wx + (c.wx2 - c.wx) * ease, c.wy + (c.wy2 - c.wy) * ease, { scale: 0.4 });
    }
  },
};

/**
 * WARCRY — "the hardened shout."
 * The shout leaves the mouth as sound and SETS as armor: shout rings
 * roll off the caster, then a band of gold plate facets snaps shut
 * around the chest one facet at a time, and a single gleam runs the
 * finished band to prove the metal.
 */
const warcry: AbilitySig = {
  spawn(c) {
    // The intake: sparks jump upward with the breath.
    c.particles.burst(c.wx, c.wy - 0.9, 6, [c.st.spark, c.st.core], {
      speed: 1.4, life: 0.5, size: 0.07, gravity: -1.0, up: true, shape: 'glint', drag: 1.2,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t >= 0.3) return;
    // The stamp: the shout hits the ground once and is done.
    const ft = 1 - t / 0.3;
    ctx.save();
    ctx.globalAlpha = 0.5 * ft;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.06 * ft);
    const rr = sc * (0.5 + t * 2.2);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const chestY = py - sc * 0.6;
    ctx.save();
    ctx.lineCap = 'butt';
    // The shout: three rings roll out from the mouth, fading as the
    // sound spends itself into metal.
    if (t < 0.38) {
      for (let k = 0; k < 3; k++) {
        const pt = (t - k * 0.07) / 0.3;
        if (pt < 0 || pt > 1) continue;
        const rr = sc * (0.3 + pt * 1.1);
        ctx.globalAlpha = (1 - pt) * 0.55;
        ctx.strokeStyle = k === 1 ? st.core : st.mid;
        ctx.lineWidth = Math.max(1.5, sc * 0.045 * (1 - pt * 0.5));
        ctx.beginPath();
        ctx.ellipse(px, chestY, rr, rr * squash * 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // The set: six plate facets snap around the chest, one by one —
    // sound become armor, each seated with a hard edge.
    const n = 6;
    const bandR = sc * 0.62;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    for (let k = 0; k < n; k++) {
      const snap = Math.min(1, Math.max(0, (t - 0.2 - k * 0.055) / 0.08));
      if (snap <= 0) continue;
      const a0 = (k / n) * Math.PI * 2 + c.now / 4200;
      const seg = (Math.PI * 2) / n;
      const rr = bandR * (1.25 - snap * 0.25); // each facet slams inward
      ctx.globalAlpha = (0.35 + 0.45 * snap) * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.mid : shade(st.mid, 16);
      ctx.lineWidth = Math.max(2.5, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, chestY, rr, rr * squash * 1.5, 0, a0 + seg * 0.08, a0 + seg * 0.92);
      ctx.stroke();
    }
    // The gleam: one white spark runs the finished band.
    if (t > 0.5) {
      const ga = ((t - 0.5) / 0.5) * Math.PI * 2 + c.now / 4200;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, chestY, bandR, bandR * squash * 1.5, 0, ga, ga + 0.5);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.9, 0.25 * (1 - t));
  },
};

/**
 * STEEL_WAVE — "the crescent shatter."
 * The hurled swing arrives still shaped like a swing: a whole blade
 * crescent snaps in at the impact, bites, and breaks into three
 * separating fragments, leaving a crescent scar notched into the
 * ground where the edge landed.
 */
const steel_wave: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xb1);
    const tilt = rand() * Math.PI;
    // Slivers fly off the breaking edge.
    for (let k = 0; k < 7; k++) {
      c.particles.burst(c.wx, c.wy - 0.3, 1, [c.st.spark, c.st.core, c.st.mid], {
        speed: 2.4 + rand(), life: 0.4, size: 0.07, gravity: 5,
        dir: tilt + (rand() - 0.5) * 1.6, spread: 0.3, shape: 'streak',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xb2);
    const tilt = rand() * Math.PI;
    const fade = t < 0.5 ? 1 : (1 - t) / 0.5;
    const R = Math.max(c.rPx, sc * 0.7);
    // The scar: a crescent notch bitten into the turf, edge-aligned.
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.7, R * 0.7 * squash, 0, tilt - 0.9, tilt + 0.9);
    ctx.stroke();
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.58, R * 0.58 * squash, 0, tilt - 0.7, tilt + 0.7);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xb3);
    const tilt = rand() * Math.PI;
    const R = Math.max(c.rPx, sc * 0.7);
    const cy = py - sc * 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.3) {
      // The whole crescent: the swing arrives intact, white edge out.
      const ft = 1 - t / 0.3;
      ctx.globalAlpha = 0.85 * ft + 0.15;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.11);
      ctx.beginPath();
      ctx.ellipse(px, cy, R * 0.75, R * 0.5, tilt, -1.1, 1.1);
      ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, cy, R * 0.82, R * 0.56, tilt, -0.9, 0.9);
      ctx.stroke();
    } else if (t < 0.8) {
      // The break: three fragments separate along their old curve.
      const ft = (t - 0.3) / 0.5;
      for (let k = 0; k < 3; k++) {
        const a = (k - 1) * 0.75;
        const fx = px + Math.cos(tilt + a) * R * (0.75 + ft * 0.6);
        const fy = cy + Math.sin(tilt + a) * R * (0.5 + ft * 0.4) + ft * ft * sc * 0.5;
        ctx.globalAlpha = (1 - ft) * 0.85;
        ctx.fillStyle = k === 1 ? st.core : st.mid;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(tilt + a + ft * (k - 1) * 2.2);
        ctx.fillRect(-sc * 0.16, -sc * 0.04, sc * 0.32, sc * 0.08);
        ctx.restore();
      }
    }
    ctx.restore();
  },
};

/**
 * STAGGER_STOMP — "the ringing floor."
 * The heel comes down and the floor PASSES IT ON: two shock fronts
 * roll outward and every flagstone they cross hops off its seat and
 * reseats — the world rings like a struck bell, and what stands on
 * it staggers.
 */
const stagger_stomp: AbilitySig = {
  spawn(c) {
    // The floor rings: one hard breath of earth off the stamp.
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 1.1 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc2);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // Two shock fronts roll out — the strike, then its answer.
    for (let w = 0; w < 2; w++) {
      const wt = (t - w * 0.18) * 1.6;
      if (wt <= 0 || wt > 1) continue;
      ctx.globalAlpha = (1 - wt) * (w === 0 ? 0.6 : 0.4);
      ctx.strokeStyle = w === 0 ? st.mid : st.deep;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * wt, rPx * wt * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The flagstones: nine seated blocks that hop as a front passes
    // under them, dark seat-gaps yawning while they hang.
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const rf = 0.3 + rand() * 0.6;
      const p = groundPt(c, rPx * rf, a);
      let hop = 0;
      for (let w = 0; w < 2; w++) {
        const wt = (t - w * 0.18) * 1.6;
        if (wt <= 0) continue;
        hop = Math.max(hop, Math.max(0, 1 - Math.abs(wt - rf) * 7) * (w === 0 ? 1 : 0.6));
      }
      const g = sc * (0.1 + rand() * 0.05);
      const lift = hop * sc * 0.12;
      if (lift > 1) {
        // The seat-gap the stone left behind.
        ctx.globalAlpha = 0.5 * fade * hop;
        ctx.fillStyle = shade(st.deep, -16);
        ctx.fillRect(p.x - g * 0.6, p.y - g * 0.3 * squash, g * 1.2, g * 0.6 * squash);
      }
      ctx.globalAlpha = (0.35 + 0.45 * hop) * fade;
      ctx.fillStyle = k % 2 === 0 ? st.deep : st.mid;
      ctx.fillRect(p.x - g * 0.6, p.y - g * 0.3 * squash - lift, g * 1.2, g * 0.6 * squash);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The strike itself: one vertical slam bar, gone fast.
    if (t < 0.12) {
      const ft = 1 - t / 0.12;
      ctx.save();
      ctx.globalAlpha = ft * 0.9;
      ctx.fillStyle = st.core;
      ctx.fillRect(px - Math.max(2, sc * 0.05), py - sc * 1.0 * ft, Math.max(4, sc * 0.1), sc * 1.0 * ft);
      ctx.restore();
    }
    // Pebbles keep rattling where the fronts pass.
    if (t < 0.7 && Math.random() < c.frameDt * 14) {
      const a = Math.random() * Math.PI * 2;
      const rf = Math.min(1, t * 1.6);
      // Grit pops off the traveling ring — a tiny library breath at
      // wherever the ring front stands this beat.
      dust.deployments.kick!(asMatter(c),
        c.wx + Math.cos(a) * c.radius * rf, c.wy + Math.sin(a) * c.radius * rf, { scale: 0.22 });
    }
  },
};

/**
 * HEADSMAN_STROKE — "the lodged edge."
 * One clean arc for those already kneeling: the stroke drops as a
 * single vertical blade-fall, halts DEAD in the ground, and the edge
 * stays lodged there — a standing wedge in a dark cleft, gleaming
 * once — while the halt jolts the air beside it.
 */
const headsman_stroke: AbilitySig = {
  spawn(c) {
    // The edge lodges DEAD: earth gouges out both sides of the bite.
    dust.deployments.gouge!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.65,
      c.wy + Math.sin(c.dir) * c.radius * 0.65,
      { dir: c.dir, scale: 0.85 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    if (t < 0.22) return; // nothing marks the ground until the edge lands
    const p = groundPt(c, rPx * 0.65, dir);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // The cleft: one straight bite along the stroke's line.
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    const len = sc * 0.4;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(dir) * len, p.y - Math.sin(dir) * len * squash);
    ctx.lineTo(p.x + Math.cos(dir) * len, p.y + Math.sin(dir) * len * squash);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const p = groundPt(c, rPx * 0.65, dir);
    ctx.save();
    if (t < 0.22) {
      // The fall: a blade bar drops fast, white edge leading.
      const drop = (t / 0.22) ** 2;
      const tipY = p.y - sc * 1.3 * (1 - drop);
      const bh = sc * 0.85;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = st.mid;
      ctx.fillRect(p.x - Math.max(2, sc * 0.05), tipY - bh, Math.max(4, sc * 0.1), bh);
      ctx.fillStyle = st.core;
      ctx.fillRect(p.x - Math.max(1.5, sc * 0.03), tipY - sc * 0.2, Math.max(3, sc * 0.06), sc * 0.2);
    } else {
      // The halt: the edge is LODGED — a standing wedge in the cleft.
      const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
      const h = sc * 0.42;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(p.x - sc * 0.09, p.y - h);
      ctx.lineTo(p.x + sc * 0.09, p.y - h);
      ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      // One gleam down the lodged edge — the sentence is served.
      const gl = Math.max(0, 1 - Math.abs(t - 0.35) * 8);
      if (gl > 0) {
        ctx.globalAlpha = gl;
        ctx.fillStyle = st.core;
        ctx.fillRect(p.x - Math.max(1, sc * 0.02), p.y - h, Math.max(2, sc * 0.04), h);
      }
      // The halt-jolt: short bars kick out both sides, then die.
      if (t < 0.4) {
        const jt = 1 - (t - 0.22) / 0.18;
        ctx.globalAlpha = jt * 0.8;
        ctx.fillStyle = st.spark;
        for (let s = 0; s < 2; s++) {
          const side = s === 0 ? 1 : -1;
          const d = sc * (0.2 + (1 - jt) * 0.3) * side;
          ctx.fillRect(p.x + d - sc * 0.08, p.y - sc * 0.1 * squash, sc * 0.16, Math.max(2, sc * 0.04));
        }
      }
    }
    ctx.restore();
  },
};

/**
 * WARLORDS_DESCENT — "the planted banner."
 * Arrive like a banner planted — so plant one: the landing drives a
 * standard into the crater, its pennant unfurls and snaps in the
 * wind for as long as the shout holds, while rally rays stamp
 * outward low along the ground.
 */
const warlords_descent: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0xe1);
    // The arrival: gold sparks and rock thrown together.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(c.wx, c.wy - 0.2, 1, [c.st.spark, c.st.mid, c.st.deep], {
        speed: 2.6, life: 0.5, size: 0.09, gravity: 7, dir: a, spread: 0.3, shape: 'shard', spin: 8,
      });
    }
    c.particles.burst(c.wx, c.wy - 0.5, 5, [c.st.spark, c.st.core], {
      speed: 1.2, life: 0.7, size: 0.09, gravity: -0.8, up: true, shape: 'glint', drag: 1.0,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (c.kind === 'dash') {
      // The mark below: the landing ground braces for the standard.
      ctx.save();
      ctx.globalAlpha = 0.35 * t;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      const rr = sc * 0.6 * (1 - t * 0.4);
      ctx.beginPath();
      ctx.ellipse(c.px2, c.py2, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0xe2);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    // Rally rays: six low gold spokes stamp outward, one after
    // another — the ground takes the muster.
    for (let k = 0; k < 6; k++) {
      const grown = Math.min(1, Math.max(0, t * 4 - k * 0.3));
      if (grown <= 0) continue;
      const a = (k / 6) * Math.PI * 2 + (c.seed % 9) * 0.2 + rand() * 0.15;
      const r0 = rPx * 0.3;
      const r1 = rPx * (0.55 + 0.4 * grown);
      ctx.globalAlpha = 0.55 * fade * grown;
      ctx.strokeStyle = k % 2 === 0 ? st.mid : st.spark;
      ctx.lineWidth = Math.max(2, sc * 0.06 * (1 - grown * 0.4));
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.4 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    if (c.kind === 'dash') {
      // The descent: a gold comet head falling to the mark.
      const fx = px + (c.px2 - px) * t;
      const fy = py + (c.py2 - py) * t - sc * (1.2 - t) * 1.5;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = st.spark;
      const g = Math.max(3, sc * 0.12);
      ctx.fillRect(fx - g / 2, fy - g / 2, g, g);
      ctx.restore();
      if (Math.random() < c.frameDt * 20) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * t, c.wy + (c.wy2 - c.wy) * t - (1.2 - t) * 1.5, 1, [st.spark, st.core], {
          speed: 0.6, life: 0.35, size: 0.07, gravity: 2, shape: 'glint',
        });
      }
      return;
    }
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0xe3);
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const side = rand() < 0.5 ? 1 : -1;
    const staffH = sc * 1.5;
    const topY = py - staffH;
    ctx.save();
    // The standard: a dark staff driven where the warlord landed.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = st.deep;
    ctx.fillRect(px - Math.max(1.5, sc * 0.035), topY, Math.max(3, sc * 0.07), staffH);
    ctx.fillStyle = st.spark;
    const nub = Math.max(3, sc * 0.09);
    ctx.fillRect(px - nub / 2, topY - nub, nub, nub);
    // The pennant unfurls, then snaps in the wind: a two-segment
    // flag whose tail flexes on the wall clock.
    const unfurl = Math.min(1, t / 0.25);
    const flap = Math.sin(c.now / 140 + (c.seed % 5)) * sc * 0.09;
    const fw = sc * 0.62 * unfurl * side;
    const fh = sc * 0.3;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(px, topY + sc * 0.04);
    ctx.lineTo(px + fw * 0.55, topY + sc * 0.05 + flap * 0.4);
    ctx.lineTo(px + fw, topY + fh * 0.5 + flap);
    ctx.lineTo(px + fw * 0.55, topY + fh * 0.75 + flap * 0.4);
    ctx.lineTo(px, topY + fh);
    ctx.closePath();
    ctx.fill();
    // The hem catches light as it snaps.
    ctx.globalAlpha = 0.8 * fade * (0.5 + 0.5 * Math.abs(flap) / (sc * 0.09));
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(px + fw * 0.55, topY + sc * 0.05 + flap * 0.4);
    ctx.lineTo(px + fw, topY + fh * 0.5 + flap);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * OATHBOUND_EDGE — "the gilded return."
 * A sworn stroke leaves its word hanging: the swept arc stays in
 * the air as a gilded after-edge, and light beads break off its rim
 * and travel BACK along the swing into the hand that swore it — the
 * oath repays the arm, visibly.
 */
const oathbound_edge: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xf1);
    // Star glints seed along the swept rim.
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 0.55 + rand() * 1.1;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.85,
        c.wy + Math.sin(a) * c.radius * 0.85 * c.squash - 0.35,
        1, [c.st.spark, c.st.core], {
          speed: 0.5, life: 0.6, size: 0.09, gravity: -0.4, shape: 'glint', drag: 1.5,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const fade = 1 - t;
    // The inscription: a dashed gilt arc where the oath was written.
    ctx.save();
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.setLineDash([sc * 0.1, sc * 0.08]);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.8, rPx * 0.8 * squash, 0, dir - 0.6, dir + 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const cy = py - sc * 0.35;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The after-edge: the swing hangs where it was sworn, gold band
    // with a bright outer rim, refusing to leave with the blade.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.82, rPx * 0.82 * squash, 0, dir - 0.55, dir + 0.55);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.9, rPx * 0.9 * squash, 0, dir - 0.45, dir + 0.45);
    ctx.stroke();
    // The repayment: three beads leave the rim and run home to the
    // hand, each a small gilded cross, brightest as it arrives.
    for (let k = 0; k < 3; k++) {
      const pk = Math.min(1, Math.max(0, (t - 0.1 - k * 0.12) / 0.45));
      if (pk <= 0 || pk >= 1) continue;
      const a = dir + (k - 1) * 0.42;
      const sx = px + Math.cos(a) * rPx * 0.85;
      const sy = cy + Math.sin(a) * rPx * 0.85 * squash;
      const hx = px;
      const hy = py - sc * 0.5;
      const bx = sx + (hx - sx) * pk;
      const by = sy + (hy - sy) * pk;
      const g = Math.max(2, sc * 0.05) * (0.7 + pk * 0.5);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = k === 1 ? st.core : st.spark;
      ctx.fillRect(bx - g / 2, by - g * 1.6, g, g * 3.2);
      ctx.fillRect(bx - g * 1.6, by - g / 2, g * 3.2, g);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * fade);
  },
};

// -------------------------------------------------------- registry

/**
 * The melee wave of THE SIGNATURE LAW — merged into the master
 * registry by the integrator. Keys are ability ids.
 */
export const MELEE_SIGS: Record<string, AbilitySig> = {
  heavy_slam,
  bloodlust,
  twin_strike,
  earthbreaker,
  rend,
  bull_rush,
  warcry,
  steel_wave,
  stagger_stomp,
  headsman_stroke,
  warlords_descent,
  oathbound_edge,
};
