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
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, blood, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * HEAVY_SLAM — "the fault line."
 * The overhead blow does not scatter — it SPLITS: the maul-head slab
 * falls out of the sky onto the aim, and one jagged fault yawns open
 * along it, a true dark GAP between two slipped strata lips. Shear
 * slabs stand up off the crack — side face, sunlit top plane — tilt,
 * and reseat with a cough of grit, while fines pop out of the gap
 * until the ground settles.
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
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // The fault stations: a jagged polyline whose stations kink hard
    // off the aim line — slipped strata, not a groove.
    const n = 5;
    const pts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k <= n; k++) {
      const f = (k / n) * reach;
      const kink = k === 0 ? 0 : (rand() - 0.5) * rPx * 0.22;
      const p = groundPt(c, rPx * (0.15 + 0.85 * f), dir);
      pts.push({ x: p.x - Math.sin(dir) * kink, y: p.y + Math.cos(dir) * kink * squash });
    }
    // THE GAP: a filled dark void between the two lips — the ground
    // is genuinely OPEN, not scratched. The far lip slips forward a
    // step relative to the near one: shear you can read.
    const gap = Math.min(1, t / 0.4) * sc * 0.15;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    const slip = sc * 0.07;
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = shade(st.deep, -22);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[k]!.x + nx * gap, pts[k]!.y + ny * gap);
    for (let k = n; k >= 0; k--) ctx.lineTo(pts[k]!.x - nx * gap + Math.cos(dir) * slip, pts[k]!.y - ny * gap + Math.sin(dir) * slip * squash);
    ctx.closePath();
    ctx.fill();
    // The near lip catches the sun: a full lit band, core crest on
    // its very edge (contrast law: the pale crest rides the mid bed).
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.075);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[k]!.x + nx * gap, pts[k]!.y + ny * gap);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade * Math.max(0, 1 - t * 1.6);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[k]!.x + nx * (gap + sc * 0.02), pts[k]!.y + ny * (gap + sc * 0.02));
    ctx.stroke();
    // The far lip falls into shadow.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) (k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[k]!.x - nx * gap + Math.cos(dir) * slip, pts[k]!.y - ny * gap + Math.sin(dir) * slip * squash);
    ctx.stroke();
    // Shear slabs STAND off the crack: each a block with a dark side
    // face and a sunlit, foreshortened top plane. It jolts up, hangs,
    // and reseats — coughing grit as it lands.
    for (let k = 0; k < 3; k++) {
      const f = 0.3 + rand() * 0.55;
      const side = rand() < 0.5 ? 1 : -1;
      const w = sc * (0.2 + rand() * 0.1);
      if (f > reach) continue;
      const p = groundPt(c, rPx * (0.15 + 0.85 * f), dir);
      const bx = p.x + nx * (gap + w * 0.9) * side;
      const by = p.y + ny * (gap + w * 0.9) * side;
      const ph = Math.min(1, Math.max(0, t * 2.6 - k * 0.18));
      const h = Math.sin(ph * Math.PI) * sc * (0.22 + rand() * 0.14);
      if (h < 1) continue;
      // Side face (shadow), then the tilted top plane, then the edge.
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade(st.deep, -10);
      ctx.fillRect(bx - w, by - h, w * 2, h);
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(bx, by - h, w, w * 0.45 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(bx, by - h, w, w * 0.45 * squash, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      // The reseat cough: one grit breath as the slab comes home.
      if (ph > 0.86 && ph < 1 && Math.random() < c.frameDt * 30) {
        dust.deployments.kick!(asMatter(c),
          c.wx + Math.cos(dir) * c.radius * (0.15 + 0.85 * f),
          c.wy + Math.sin(dir) * c.radius * (0.15 + 0.85 * f), { scale: 0.2 });
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    // THE BLOW ITSELF: a maul-head slab falls dead-vertical onto the
    // fault's mouth — side face dark, top plane bright — and meets
    // the ground in a burst star. The split races out FROM this.
    if (t < 0.14) {
      const p = groundPt(c, c.rPx * 0.2, dir);
      const k = t / 0.14;
      const drop = (1 - k) * (1 - k);
      const y = p.y - sc * 2.2 * drop;
      const w = sc * 0.5;
      const faceH = sc * 0.24;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = shade(st.deep, -6);
      ctx.fillRect(p.x - w / 2, y - faceH, w, faceH);
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(p.x, y - faceH, w / 2, sc * 0.13 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(p.x, y - faceH, w * 0.24, sc * 0.065 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      if (k > 0.82) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, p.x, p.y, sc * 0.5, sc * 0.18, 5, c.now / 300, squash);
        ctx.fill();
        c.glow(c.wx + Math.cos(dir) * c.radius * 0.2, c.wy + Math.sin(dir) * c.radius * 0.2, 1.3, 0.8);
      }
      ctx.restore();
    }
    // Grit keeps popping out of the widening gap while it yawns —
    // a tiny library breath at a random station along the fault.
    if (t < 0.6 && Math.random() < c.frameDt * 12) {
      const f = 0.2 + Math.random() * 0.8 * Math.min(1, t / 0.3);
      dust.deployments.kick!(asMatter(c),
        c.wx + Math.cos(dir) * c.radius * f,
        c.wy + Math.sin(dir) * c.radius * f, { scale: 0.25 });
    }
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, c.radius * 0.7, 0.3 * (1 - t));
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
    const rand = srand(c.seed ^ 0xb100d);
    const fade = 1 - t;
    const rr = sc * (1.05 - t * 0.55);
    ctx.save();
    // The circle drinks: a FILLED red sheen band contracting on the
    // caster — deep bed under a lit rim (contrast law), its dashes
    // crawling inward along the shrink.
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 1.08, rr * 1.08 * squash, 0, 0, Math.PI * 2);
    ctx.ellipse(px, py, rr * 0.82, rr * 0.82 * squash, 0, Math.PI * 2, 0, true);
    ctx.fill();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.setLineDash([sc * 0.13, sc * 0.09]);
    ctx.lineDashOffset = c.now / 26;
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Tithe channels: seeded rivulets crawling INWARD across the
    // band — each a dark groove with a bright bead sliding home.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const run = ((t * (0.8 + rand() * 0.5)) + rand()) % 1;
      const r0 = rr * 1.05;
      const r1 = rr * 0.55;
      const bead = r0 + (r1 - r0) * run;
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * squash);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.spark : st.core;
      const g = Math.max(3, sc * 0.08);
      ctx.fillRect(px + Math.cos(a) * bead - g / 2, py + Math.sin(a) * bead * squash - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xbea7);
    const chestY = py - sc * 0.55;
    ctx.save();
    // The heartbeat: lub, dub — two rings per beat, each born wide
    // and CONTRACTING onto the chest, deep twin under the lit ring.
    // Hunger pulls inward.
    const beat = (c.now % 820) / 820;
    for (let k = 0; k < 2; k++) {
      const pt = beat - (k === 0 ? 0 : 0.22);
      if (pt < 0 || pt > 0.3) continue;
      const f = pt / 0.3;
      const rr = sc * (0.85 - f * 0.5);
      ctx.globalAlpha = (k === 0 ? 0.5 : 0.35) * (1 - f) * (1 - t * 0.5);
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(3.5, sc * (k === 0 ? 0.1 : 0.07));
      ctx.beginPath();
      ctx.ellipse(px, chestY, rr * 1.03, rr * 1.03 * squash * 1.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (k === 0 ? 0.85 : 0.6) * (1 - f) * (1 - t * 0.5);
      ctx.strokeStyle = k === 0 ? st.mid : st.spark;
      ctx.lineWidth = Math.max(2, sc * (k === 0 ? 0.055 : 0.035));
      ctx.beginPath();
      ctx.ellipse(px, chestY, rr, rr * squash * 1.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The arrival flash: the ring lands ON the heart.
      if (f > 0.85 && k === 0) {
        ctx.globalAlpha = 0.9 * (1 - t * 0.5);
        ctx.fillStyle = st.core;
        const g = sc * 0.12;
        ctx.fillRect(px - g / 2, chestY - g / 2, g, g);
        c.glow(c.wx, c.wy, 0.7, 0.4);
      }
    }
    // Red motes spiral IN toward the chest on tightening seeded
    // orbits — the tithe arriving in the air as well as the ground.
    for (let k = 0; k < 4; k++) {
      const phase = rand() * Math.PI * 2;
      const speed = 0.6 + rand() * 0.5;
      const orbit = (1 - ((t * speed + rand()) % 1));
      const a = phase + c.now / 260;
      const r = sc * (0.25 + orbit * 0.85);
      const x = px + Math.cos(a) * r;
      const y = chestY + Math.sin(a) * r * squash * 1.3;
      const g = Math.max(2, sc * 0.05) * (0.6 + (1 - orbit) * 0.6);
      ctx.globalAlpha = 0.5 * (1 - t * 0.4);
      ctx.fillStyle = shade(st.deep, -8);
      ctx.fillRect(x - g * 0.9, y - g * 0.9, g * 1.8, g * 1.8);
      ctx.globalAlpha = 0.95 * (1 - t * 0.4);
      ctx.fillStyle = k % 2 === 0 ? st.spark : st.mid;
      ctx.fillRect(x - g / 2, y - g / 2, g, g);
    }
    ctx.restore();
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
    // The sunken heart: the ground sits DOWN where the verdict stood —
    // a bowl with a shadowed near wall and a raised, sunlit far rim.
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -16);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.36, rPx * 0.36 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = shade(st.deep, -26);
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.02, rPx * 0.33, rPx * 0.33 * squash, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.03, rPx * 0.37, rPx * 0.37 * squash, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    // The conceding plates: seven strata BLOCKS around the crater.
    // Each jolts up showing a true side face under its sunlit top,
    // hangs, and reseats — the world's masonry conceding the point.
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (c.seed % 7) * 0.2;
      const r0 = rPx * (0.48 + rand() * 0.08);
      const r1 = r0 + rPx * (0.3 + rand() * 0.12);
      const half = (Math.PI / n) * 0.72;
      const ph = Math.min(1, Math.max(0, t * 2.4 - k * 0.14));
      const lift = Math.sin(ph * Math.PI) * sc * 0.2;
      const p0 = groundPt(c, r0, a - half);
      const p1 = groundPt(c, r0, a + half);
      const p2 = groundPt(c, r1, a + half);
      const p3 = groundPt(c, r1, a - half);
      // The seat-gap it left: dark void under the hanging plate.
      if (lift > sc * 0.03) {
        ctx.globalAlpha = 0.7 * fade;
        ctx.fillStyle = shade(st.deep, -24);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        // The side face: the plate's thickness, in shadow.
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = shade(st.deep, -8);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y - lift);
        ctx.lineTo(p1.x, p1.y - lift);
        ctx.lineTo(p1.x, p1.y - lift + sc * 0.09);
        ctx.lineTo(p0.x, p0.y - lift + sc * 0.09);
        ctx.closePath();
        ctx.fill();
      }
      // The top plane, sunlit while airborne.
      const litK = Math.sin(ph * Math.PI);
      ctx.globalAlpha = (0.55 + 0.4 * litK) * fade;
      ctx.fillStyle = k % 2 === 0 ? shade(st.deep, 8 + 18 * litK) : shade(st.deep, 16 + 14 * litK);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - lift);
      ctx.lineTo(p1.x, p1.y - lift);
      ctx.lineTo(p2.x, p2.y - lift * 0.4);
      ctx.lineTo(p3.x, p3.y - lift * 0.4);
      ctx.closePath();
      ctx.fill();
      // The lifted near edge catches full light.
      if (lift > sc * 0.02) {
        ctx.globalAlpha = 0.9 * fade * litK;
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(2, sc * 0.04);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y - lift);
        ctx.lineTo(p1.x, p1.y - lift);
        ctx.stroke();
        // The reseat cough: grit as the plate slams home.
        if (ph > 0.88 && ph < 1 && Math.random() < c.frameDt * 26) {
          dust.deployments.kick!(asMatter(c),
            c.wx + Math.cos(a) * ((r0 + r1) / 2 / sc),
            c.wy + Math.sin(a) * ((r0 + r1) / 2 / sc), { scale: 0.22 });
        }
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.45 * fade);
  },
  air(c) {
    if (c.kind === 'dash') {
      // The descent: a heavy body drops toward the mark — a filled
      // teardrop mass with a dark core and a torn slipstream, not a
      // pen stroke. Weight you can see coming.
      const { ctx, st, t, sc } = c;
      const fx = c.px + (c.px2 - c.px) * t;
      const fy = c.py + (c.py2 - c.py) * t - sc * (1.1 - t) * 1.4;
      const ang = Math.atan2(c.py2 - c.py + sc * 1.4, c.px2 - c.px);
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - t * 0.3);
      ctx.fillStyle = shade(st.deep, -8);
      ctx.beginPath();
      ctx.moveTo(fx - Math.cos(ang) * sc * 0.75, fy - Math.sin(ang) * sc * 0.75);
      ctx.lineTo(fx + Math.sin(ang) * sc * 0.16, fy - Math.cos(ang) * sc * 0.16);
      ctx.lineTo(fx + Math.cos(ang) * sc * 0.18, fy + Math.sin(ang) * sc * 0.18);
      ctx.lineTo(fx - Math.sin(ang) * sc * 0.16, fy + Math.cos(ang) * sc * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(fx, fy, sc * 0.15, sc * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
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
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const ang = Math.atan2(py2 - py, px2 - px);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang) * squash;
    const hx = px + (px2 - px) * ease;
    const hy = py + (py2 - py) * ease;
    ctx.save();
    ctx.lineCap = 'butt';
    // The plowed lane: a FILLED churned band dragged to the head —
    // dark turned earth with a lit berm thrown up along each side.
    const laneW = sc * 0.24;
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -10);
    ctx.beginPath();
    ctx.moveTo(px + nx * laneW, py + ny * laneW);
    ctx.lineTo(hx + nx * laneW, hy + ny * laneW);
    ctx.lineTo(hx - nx * laneW, hy - ny * laneW);
    ctx.lineTo(px - nx * laneW, py - ny * laneW);
    ctx.closePath();
    ctx.fill();
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? 1 : -1;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = s === 0 ? st.mid : shade(st.mid, -8);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px + nx * laneW * side, py + ny * laneW * side);
      ctx.lineTo(hx + nx * laneW * side, hy + ny * laneW * side);
      ctx.stroke();
    }
    // Churn scraps inside the lane: turned clods catching light.
    for (let k = 0; k < 4; k++) {
      const f = 0.15 + rand() * 0.7;
      if (f > ease) continue;
      const sx = px + (px2 - px) * f + nx * (rand() - 0.5) * laneW * 1.4;
      const sy = py + (py2 - py) * f + ny * (rand() - 0.5) * laneW * 1.4;
      const g = Math.max(2, sc * (0.045 + rand() * 0.03));
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.spark : shade(st.deep, 14);
      ctx.fillRect(sx - g / 2, sy - g / 2, g, g);
    }
    // Herringbone furrows: filled tapering gouges raked back off both
    // sides at each station the shoulder has already passed.
    for (let k = 0; k < 5; k++) {
      const f = 0.12 + (k / 5) * 0.8 + rand() * 0.06;
      if (f > ease) continue;
      const sx = px + (px2 - px) * f;
      const sy = py + (py2 - py) * f;
      const len = sc * (0.26 + rand() * 0.12);
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;
        const ba = ang + Math.PI - side * 0.7; // raked backward
        const tx = sx + Math.cos(ba) * len;
        const ty = sy + Math.sin(ba) * len * squash;
        ctx.globalAlpha = 0.75 * fade;
        ctx.fillStyle = k % 2 === 0 ? shade(st.deep, -6) : st.deep;
        ctx.beginPath();
        ctx.moveTo(sx + nx * sc * 0.05 * side, sy + ny * sc * 0.05 * side);
        ctx.lineTo(tx, ty);
        ctx.lineTo(sx - nx * sc * 0.02 * side, sy - ny * sc * 0.02 * side);
        ctx.closePath();
        ctx.fill();
        // Each furrow's thrown lip catches the sun at its mouth.
        ctx.globalAlpha = 0.8 * fade;
        ctx.fillStyle = st.mid;
        const g = Math.max(2, sc * 0.04);
        ctx.fillRect(sx + nx * laneW * side - g / 2, sy + ny * laneW * side - g / 2, g, g);
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const ease = 1 - (1 - Math.min(1, t / 0.7)) ** 2;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const ang = Math.atan2(py2 - py, px2 - px);
    const hx = px + (px2 - px) * ease;
    const hy = py + (py2 - py) * ease - sc * 0.45;
    ctx.save();
    // The shoulder wedge: a blunt mass with a dark keel and a lit
    // top plane — a body driving the front, not a paper triangle.
    const w = sc * 0.32;
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = shade(st.deep, -6);
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * w * 1.25, hy + Math.sin(ang) * w * 0.5 + sc * 0.06);
    ctx.lineTo(hx - Math.sin(ang) * w * 0.62, hy - w * 0.5 + sc * 0.06);
    ctx.lineTo(hx + Math.sin(ang) * w * 0.62, hy + w * 0.6 + sc * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * w * 1.2, hy + Math.sin(ang) * w * 0.5);
    ctx.lineTo(hx - Math.sin(ang) * w * 0.6, hy - w * 0.55);
    ctx.lineTo(hx + Math.sin(ang) * w * 0.6, hy + w * 0.55);
    ctx.closePath();
    ctx.fill();
    // The white chevron nose: the argument's point.
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * w * 1.2, hy + Math.sin(ang) * w * 0.5);
    ctx.lineTo(hx + Math.cos(ang) * w * 0.55 - Math.sin(ang) * w * 0.22, hy + Math.sin(ang) * w * 0.2 - Math.cos(ang) * w * 0.22);
    ctx.lineTo(hx + Math.cos(ang) * w * 0.55 + Math.sin(ang) * w * 0.22, hy + Math.sin(ang) * w * 0.2 + Math.cos(ang) * w * 0.22);
    ctx.closePath();
    ctx.fill();
    // Speed slivers trail the wedge, longest freshest.
    ctx.fillStyle = st.core;
    for (let k = 0; k < 3; k++) {
      const d = sc * (0.4 + k * 0.26);
      ctx.globalAlpha = (0.7 - k * 0.18) * fade;
      ctx.fillRect(hx - Math.cos(ang) * d - sc * 0.14, hy - Math.sin(ang) * d - Math.max(1.5, sc * 0.03), sc * 0.28, Math.max(3, sc * 0.06));
    }
    // The arrival: the shoulder lands its argument in a burst star.
    if (ease > 0.96 && t < 0.85) {
      ctx.globalAlpha = 0.9 * Math.max(0, 1 - (t - 0.7) / 0.15);
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.3, sc * 0.42, sc * 0.16, 4, ang, squash);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 1.1, 0.5 * Math.max(0, 1 - (t - 0.7) / 0.15));
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
    if (t >= 0.35) return;
    // The stamp: the shout hits the ground once — a pressure band
    // with a deep bed, and the grass inside it pressed flat in
    // radial streaks.
    const ft = 1 - t / 0.35;
    const rr = sc * (0.5 + t * 2.4);
    ctx.save();
    ctx.globalAlpha = 0.5 * ft;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(4, sc * 0.14 * ft + sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * ft;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.07 * ft + sc * 0.02);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.96, rr * 0.96 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Pressed-flat streaks chase the band outward.
    const rand = srand(c.seed ^ 0x5a11);
    ctx.globalAlpha = 0.6 * ft;
    ctx.strokeStyle = shade(st.deep, 10);
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * rr * 0.55, py + Math.sin(a) * rr * 0.55 * squash);
      ctx.lineTo(px + Math.cos(a) * rr * 0.85, py + Math.sin(a) * rr * 0.85 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const chestY = py - sc * 0.6;
    ctx.save();
    ctx.lineCap = 'butt';
    // The shout: three pressure bands roll off the mouth, each a
    // deep bed under a lit body — sound with WEIGHT, spending itself
    // into metal.
    if (t < 0.38) {
      for (let k = 0; k < 3; k++) {
        const pt = (t - k * 0.07) / 0.3;
        if (pt < 0 || pt > 1) continue;
        const rr = sc * (0.3 + pt * 1.15);
        ctx.globalAlpha = (1 - pt) * 0.5;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(3.5, sc * 0.1 * (1 - pt * 0.4));
        ctx.beginPath();
        ctx.ellipse(px, chestY, rr * 1.03, rr * 1.03 * squash * 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (1 - pt) * 0.9;
        ctx.strokeStyle = k === 1 ? st.core : st.mid;
        ctx.lineWidth = Math.max(2, sc * 0.055 * (1 - pt * 0.4));
        ctx.beginPath();
        ctx.ellipse(px, chestY, rr, rr * squash * 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // The mouth moment: one bright flash as the cry leaves.
      if (t < 0.08) {
        ctx.globalAlpha = (1 - t / 0.08) * 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, py - sc * 0.85, sc * 0.26, sc * 0.1, 4, 0.4, 1);
        ctx.fill();
      }
    }
    // The set: six plate facets snap around the chest, one by one —
    // sound become armor. Each facet is a PLATE: deep setting band
    // under the lit metal, and a white seat-spark the instant it
    // slams home.
    const n = 6;
    const bandR = sc * 0.62;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    for (let k = 0; k < n; k++) {
      const snap = Math.min(1, Math.max(0, (t - 0.2 - k * 0.055) / 0.08));
      if (snap <= 0) continue;
      const a0 = (k / n) * Math.PI * 2 + c.now / 4200;
      const seg = (Math.PI * 2) / n;
      const rr = bandR * (1.25 - snap * 0.25); // each facet slams inward
      ctx.globalAlpha = (0.3 + 0.3 * snap) * fade;
      ctx.strokeStyle = shade(st.deep, -4);
      ctx.lineWidth = Math.max(4.5, sc * 0.14);
      ctx.beginPath();
      ctx.ellipse(px, chestY, rr, rr * squash * 1.5, 0, a0 + seg * 0.08, a0 + seg * 0.92);
      ctx.stroke();
      ctx.globalAlpha = (0.45 + 0.5 * snap) * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.mid : shade(st.mid, 16);
      ctx.lineWidth = Math.max(2.8, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, chestY, rr, rr * squash * 1.5, 0, a0 + seg * 0.12, a0 + seg * 0.88);
      ctx.stroke();
      // The seat-spark: the facet arrives with a white click.
      if (snap > 0.6 && snap < 1) {
        const sa = a0 + seg * 0.5;
        ctx.globalAlpha = fade;
        ctx.fillStyle = st.core;
        const g = Math.max(2.5, sc * 0.07);
        ctx.fillRect(px + Math.cos(sa) * rr - g / 2, chestY + Math.sin(sa) * rr * squash * 1.5 - g / 2, g, g);
      }
    }
    // The gleam: one white spark runs the finished band and leaves a
    // trailing shine behind it.
    if (t > 0.5) {
      const ga = ((t - 0.5) / 0.5) * Math.PI * 2 + c.now / 4200;
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, chestY, bandR, bandR * squash * 1.5, 0, ga - 0.5, ga + 0.5);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, chestY, bandR, bandR * squash * 1.5, 0, ga + 0.3, ga + 0.5);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.9, 0.3 * (1 - t));
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
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    const R = Math.max(c.rPx, sc * 0.7);
    ctx.save();
    ctx.lineCap = 'butt';
    // The scar: a crescent notch BITTEN into the turf — a dark
    // parted groove with one sunlit lip, not a pen arc.
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(3.5, sc * 0.11);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.7, R * 0.7 * squash, 0, tilt - 0.9, tilt + 0.9);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.76, R * 0.76 * squash, 0, tilt - 0.8, tilt + 0.8);
    ctx.stroke();
    // Where the fragments landed: three lodged shard glints past the
    // scar, each a small standing triangle winking out on its own
    // clock — the swing's remains, kept by the ground.
    if (t > 0.45) {
      for (let k = 0; k < 3; k++) {
        const a = tilt + (k - 1) * 0.8 + (rand() - 0.5) * 0.2;
        const p = groundPt(c, R * (1.0 + rand() * 0.25), a);
        const dark = 0.65 + rand() * 0.3;
        const lit = t < dark;
        const h = sc * (0.16 + rand() * 0.08);
        const w = sc * 0.05;
        ctx.globalAlpha = 0.85 * fade;
        ctx.fillStyle = shade(st.deep, -8);
        ctx.beginPath();
        ctx.moveTo(p.x - w * 1.4, p.y + sc * 0.01);
        ctx.lineTo(p.x, p.y - h * 1.05);
        ctx.lineTo(p.x + w * 1.4, p.y + sc * 0.01);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = lit ? st.mid : shade(st.mid, -22);
        ctx.beginPath();
        ctx.moveTo(p.x - w, p.y);
        ctx.lineTo(p.x, p.y - h);
        ctx.lineTo(p.x + w, p.y);
        ctx.closePath();
        ctx.fill();
        if (lit) {
          ctx.fillStyle = st.core;
          ctx.fillRect(p.x - w * 0.3, p.y - h * 0.9, w * 0.6, h * 0.3);
        }
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xb3);
    const tilt = rand() * Math.PI;
    const R = Math.max(c.rPx, sc * 0.7);
    const cy = py - sc * 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.3) {
      // The whole crescent: the swing arrives intact — a FILLED blade
      // band, deep sleeve under steel body under the white edge, still
      // carrying its spin.
      const ft = 1 - t / 0.3;
      const spin = tilt + t * 1.4;
      ctx.globalAlpha = 0.6 * (ft * 0.7 + 0.3);
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(5, sc * 0.18);
      ctx.beginPath();
      ctx.ellipse(px, cy, R * 0.75, R * 0.5, spin, -1.15, 1.15);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * (ft * 0.6 + 0.4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3.5, sc * 0.12);
      ctx.beginPath();
      ctx.ellipse(px, cy, R * 0.76, R * 0.51, spin, -1.1, 1.1);
      ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, cy, R * 0.83, R * 0.57, spin, -0.95, 0.95);
      ctx.stroke();
      // The bite: the moment the edge meets, the world flashes.
      if (t < 0.08) {
        ctx.globalAlpha = (1 - t / 0.08) * 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, cy, sc * 0.4, sc * 0.15, 4, tilt, squash);
        ctx.fill();
        c.glow(c.wx, c.wy, 1.2, 0.6);
      }
    } else if (t < 0.85) {
      // The break: three true blade shards separate along the old
      // curve — tapered steel with a spine line, tumbling, shedding
      // glints as they go down.
      const ft = (t - 0.3) / 0.55;
      for (let k = 0; k < 3; k++) {
        const a = (k - 1) * 0.75;
        const fx = px + Math.cos(tilt + a) * R * (0.75 + ft * 0.65);
        const fy = cy + Math.sin(tilt + a) * R * (0.5 + ft * 0.45) + ft * ft * sc * 0.55;
        const rot = tilt + a + ft * (k - 1) * 2.6;
        const len = sc * (0.2 - ft * 0.04);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.globalAlpha = (1 - ft) * 0.95;
        ctx.fillStyle = shade(st.deep, -4);
        ctx.beginPath();
        ctx.moveTo(-len, -sc * 0.055);
        ctx.lineTo(len * 1.1, -sc * 0.015);
        ctx.lineTo(len, sc * 0.05);
        ctx.lineTo(-len * 0.9, sc * 0.055);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = k === 1 ? st.core : st.mid;
        ctx.beginPath();
        ctx.moveTo(-len * 0.9, -sc * 0.04);
        ctx.lineTo(len, -sc * 0.01);
        ctx.lineTo(len * 0.9, sc * 0.03);
        ctx.lineTo(-len * 0.8, sc * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Each shard sheds a glint trail as it falls.
        if (Math.random() < c.frameDt * 16) {
          c.particles.burst(c.wx + (fx - px) / sc, c.wy + (fy - py) / sc, 1, [st.spark, st.core], {
            speed: 0.7, life: 0.35, size: 0.06, gravity: 3, shape: 'glint',
          });
        }
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
    // Two shock fronts roll out — the strike, then its answer. Each
    // is a BAND with body: deep bed, lit body, white crest.
    for (let w = 0; w < 2; w++) {
      const wt = (t - w * 0.18) * 1.6;
      if (wt <= 0 || wt > 1) continue;
      const rr = rPx * wt;
      const al = (1 - wt) * (w === 0 ? 1 : 0.65);
      ctx.globalAlpha = al * 0.55;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(5, sc * 0.16);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = al * 0.9;
      ctx.strokeStyle = w === 0 ? st.mid : shade(st.mid, -10);
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.98, rr * 0.98 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (w === 0) {
        ctx.globalAlpha = al * 0.95;
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1.8, sc * 0.04);
        ctx.beginPath();
        ctx.ellipse(px, py, rr * 1.02, rr * 1.02 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // The flagstones: nine seated BLOCKS that hop as a front passes
    // under them — each shows its shadowed side face while it hangs
    // over the dark seat-gap it left.
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
      const g = sc * (0.11 + rand() * 0.05);
      const lift = hop * sc * 0.16;
      if (lift > 1) {
        // The seat-gap the stone left behind.
        ctx.globalAlpha = 0.75 * fade * hop;
        ctx.fillStyle = shade(st.deep, -22);
        ctx.fillRect(p.x - g * 0.6, p.y - g * 0.3 * squash, g * 1.2, g * 0.6 * squash);
        // The stone's side face: thickness in shadow.
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = shade(st.deep, -8);
        ctx.fillRect(p.x - g * 0.6, p.y - g * 0.3 * squash - lift + g * 0.45, g * 1.2, Math.max(2, g * 0.3));
      }
      // The top face, brightening while airborne.
      ctx.globalAlpha = (0.5 + 0.45 * hop) * fade;
      ctx.fillStyle = k % 2 === 0 ? shade(st.deep, 10 + 20 * hop) : shade(st.mid, 8 * hop);
      ctx.fillRect(p.x - g * 0.6, p.y - g * 0.3 * squash - lift, g * 1.2, g * 0.6 * squash);
      // Its lit edge while it hangs.
      if (hop > 0.4) {
        ctx.globalAlpha = 0.9 * fade * hop;
        ctx.fillStyle = st.spark;
        ctx.fillRect(p.x - g * 0.6, p.y - g * 0.3 * squash - lift, g * 1.2, Math.max(1.5, sc * 0.025));
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The strike itself: the heel bar slams down and rings the world —
    // slam bar, contact star, one hard glow.
    if (t < 0.12) {
      const ft = 1 - t / 0.12;
      ctx.save();
      ctx.globalAlpha = ft * 0.95;
      ctx.fillStyle = st.mid;
      ctx.fillRect(px - Math.max(3, sc * 0.08), py - sc * 1.1 * ft, Math.max(6, sc * 0.16), sc * 1.1 * ft);
      ctx.fillStyle = st.core;
      ctx.fillRect(px - Math.max(1.5, sc * 0.04), py - sc * 1.1 * ft, Math.max(3, sc * 0.08), sc * 1.1 * ft);
      if (ft < 0.5) {
        ctx.globalAlpha = (0.5 - ft) * 2 * 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, py, sc * 0.45, sc * 0.16, 5, 0.2, squash);
        ctx.fill();
      }
      ctx.restore();
      c.glow(c.wx, c.wy, 1.2, 0.7 * (1 - ft * 0.5));
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
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const open = Math.min(1, (t - 0.22) / 0.15);
    ctx.save();
    ctx.lineCap = 'butt';
    // The cleft: one straight bite along the stroke's line — a dark
    // PARTED gap between two lips, one sunlit, one shadowed.
    const len = sc * 0.48;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    const gapW = sc * 0.05 * open;
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = shade(st.deep, -24);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(dir) * len + nx * gapW, p.y - Math.sin(dir) * len * squash + ny * gapW);
    ctx.lineTo(p.x + Math.cos(dir) * len + nx * gapW, p.y + Math.sin(dir) * len * squash + ny * gapW);
    ctx.lineTo(p.x + Math.cos(dir) * len - nx * gapW, p.y + Math.sin(dir) * len * squash - ny * gapW);
    ctx.lineTo(p.x - Math.cos(dir) * len - nx * gapW, p.y - Math.sin(dir) * len * squash - ny * gapW);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(dir) * len + nx * gapW, p.y - Math.sin(dir) * len * squash + ny * gapW);
    ctx.lineTo(p.x + Math.cos(dir) * len + nx * gapW, p.y + Math.sin(dir) * len * squash + ny * gapW);
    ctx.stroke();
    // Hairline cracks run off both ends of the bite.
    const rand = srand(c.seed ^ 0xead5);
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.8, sc * 0.04);
    for (let e = 0; e < 2; e++) {
      const side = e === 0 ? 1 : -1;
      const ex = p.x + Math.cos(dir) * len * side;
      const ey = p.y + Math.sin(dir) * len * squash * side;
      const ca = dir + side * (0.4 + rand() * 0.5);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(ca) * sc * 0.3, ey + Math.sin(ca) * sc * 0.3 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const p = groundPt(c, rPx * 0.65, dir);
    ctx.save();
    if (t < 0.22) {
      // The fall: a REAL blade drops — tapered steel with a dark
      // spine and a white leading edge, and a motion smear where it
      // has just been.
      const drop = (t / 0.22) ** 2;
      const tipY = p.y - sc * 1.4 * (1 - drop);
      const bh = sc * 0.95;
      const bw = sc * 0.13;
      // Motion smear above the blade.
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = st.mid;
      ctx.fillRect(p.x - bw * 0.4, tipY - bh - sc * 0.5 * (1 - drop), bw * 0.8, sc * 0.5 * (1 - drop));
      // Spine (dark), body (steel), edge (white), tapering to the tip.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = shade(st.deep, -4);
      ctx.beginPath();
      ctx.moveTo(p.x - bw, tipY - bh);
      ctx.lineTo(p.x - bw * 0.55, tipY);
      ctx.lineTo(p.x, tipY + sc * 0.06);
      ctx.lineTo(p.x - bw * 0.2, tipY - bh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(p.x - bw * 0.2, tipY - bh);
      ctx.lineTo(p.x, tipY + sc * 0.06);
      ctx.lineTo(p.x + bw * 0.55, tipY);
      ctx.lineTo(p.x + bw * 0.5, tipY - bh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.fillRect(p.x + bw * 0.4, tipY - bh, Math.max(1.5, bw * 0.16), bh);
    } else {
      // The halt: the edge is LODGED. A standing wedge QUIVERS in the
      // cleft — the ring of the stopped blow — settling as it stills.
      const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
      const still = Math.min(1, (t - 0.22) / 0.3);
      const quiver = Math.sin(c.now / 28) * sc * 0.035 * (1 - still);
      const h = sc * 0.52;
      // The contact star, the instant it halts.
      if (t < 0.3) {
        const k = 1 - (t - 0.22) / 0.08;
        ctx.globalAlpha = 0.95 * k;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, p.x, p.y, sc * 0.42, sc * 0.15, 5, dir, squash);
        ctx.fill();
        c.glow(c.wx + Math.cos(dir) * c.radius * 0.65, c.wy + Math.sin(dir) * c.radius * 0.65, 1.1, 0.7 * k);
      }
      // Dark flat, lit flat, white edge — the wedge has two faces.
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade(st.deep, -6);
      ctx.beginPath();
      ctx.moveTo(p.x - sc * 0.11 + quiver, p.y - h);
      ctx.lineTo(p.x + quiver * 0.3, p.y - h);
      ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(p.x + quiver * 0.3, p.y - h);
      ctx.lineTo(p.x + sc * 0.11 + quiver, p.y - h);
      ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      // One gleam down the lodged edge — the sentence is served.
      const gl = Math.max(0, 1 - Math.abs(t - 0.38) * 7);
      if (gl > 0) {
        ctx.globalAlpha = gl;
        ctx.fillStyle = st.core;
        ctx.fillRect(p.x - Math.max(1, sc * 0.02) + quiver * 0.5, p.y - h, Math.max(2.5, sc * 0.05), h);
      }
      // The halt-jolt: short bars kick out both sides, then die.
      if (t < 0.4) {
        const jt = 1 - (t - 0.22) / 0.18;
        ctx.globalAlpha = jt * 0.9;
        ctx.fillStyle = st.spark;
        for (let s = 0; s < 2; s++) {
          const side = s === 0 ? 1 : -1;
          const d = sc * (0.22 + (1 - jt) * 0.34) * side;
          ctx.fillRect(p.x + d - sc * 0.1, p.y - sc * 0.1 * squash, sc * 0.2, Math.max(2.5, sc * 0.05));
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
    // The landing crater: a shadowed bowl with a gold-lit far rim —
    // the ground remembers where the warlord arrived.
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.3, rPx * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.02, rPx * 0.32, rPx * 0.32 * squash, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    // Rally rays: six gold WEDGES stamp outward, one after another —
    // each a filled taper on a deep bed, the ground taking the muster.
    for (let k = 0; k < 6; k++) {
      const grown = Math.min(1, Math.max(0, t * 4 - k * 0.3));
      if (grown <= 0) continue;
      const a = (k / 6) * Math.PI * 2 + (c.seed % 9) * 0.2 + rand() * 0.15;
      const r0 = rPx * 0.32;
      const r1 = rPx * (0.55 + 0.42 * grown);
      const wA = 0.11; // the wedge's angular half-width at its root
      const p0a = groundPt(c, r0, a - wA);
      const p0b = groundPt(c, r0, a + wA);
      const tip = groundPt(c, r1, a);
      ctx.globalAlpha = 0.5 * fade * grown;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(p0a.x, p0a.y);
      ctx.lineTo(tip.x + Math.cos(a) * sc * 0.05, tip.y + Math.sin(a) * sc * 0.05 * squash);
      ctx.lineTo(p0b.x, p0b.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.85 * fade * grown;
      ctx.fillStyle = k % 2 === 0 ? st.mid : st.spark;
      ctx.beginPath();
      ctx.moveTo(p0a.x + Math.cos(a) * sc * 0.03, p0a.y + Math.sin(a) * sc * 0.03 * squash);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(p0b.x + Math.cos(a) * sc * 0.03, p0b.y + Math.sin(a) * sc * 0.03 * squash);
      ctx.closePath();
      ctx.fill();
      // The stamp lands with a white tip-flash.
      if (grown > 0.85 && grown < 1) {
        ctx.globalAlpha = fade;
        ctx.fillStyle = st.core;
        const g = Math.max(2.5, sc * 0.06);
        ctx.fillRect(tip.x - g / 2, tip.y - g / 2, g, g);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.45 * fade);
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
    const staffH = sc * 1.6;
    const topY = py - staffH;
    ctx.save();
    // The arrival: gold detonates once where the standard bites.
    if (t < 0.12) {
      const k = 1 - t / 0.12;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.55 * (1 + (1 - k) * 0.6), sc * 0.2, 5, c.now / 400, c.squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.5, 0.8 * k);
    }
    // The standard: a staff with weight — dark shaft, lit face line,
    // a finial that catches the sun.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.fillRect(px - Math.max(2.5, sc * 0.055), topY, Math.max(5, sc * 0.11), staffH);
    ctx.fillStyle = st.mid;
    ctx.fillRect(px + Math.max(0.5, sc * 0.015), topY, Math.max(1.5, sc * 0.03), staffH);
    // The finial: a gold diamond, not a nub.
    const nub = Math.max(4, sc * 0.13);
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.moveTo(px, topY - nub * 1.4);
    ctx.lineTo(px + nub * 0.7, topY - nub * 0.5);
    ctx.lineTo(px, topY + nub * 0.4);
    ctx.lineTo(px - nub * 0.7, topY - nub * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(px, topY - nub);
    ctx.lineTo(px + nub * 0.32, topY - nub * 0.5);
    ctx.lineTo(px, topY);
    ctx.lineTo(px - nub * 0.32, topY - nub * 0.5);
    ctx.closePath();
    ctx.fill();
    // The pennant unfurls, then snaps in the wind: TWO cloth layers —
    // a deep shadow ply under the gold face — with a notched fly end,
    // the tail flexing on the wall clock.
    const unfurl = Math.min(1, t / 0.25);
    const flap = Math.sin(c.now / 140 + (c.seed % 5)) * sc * 0.1;
    const flap2 = Math.sin(c.now / 140 + (c.seed % 5) - 0.9) * sc * 0.1;
    const fw = sc * 0.72 * unfurl * side;
    const fh = sc * 0.34;
    const cloth = (yOff: number, wobble: number, col: string, al: number): void => {
      ctx.globalAlpha = al * fade;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px, topY + sc * 0.05 + yOff);
      ctx.lineTo(px + fw * 0.55, topY + sc * 0.06 + wobble * 0.4 + yOff);
      ctx.lineTo(px + fw, topY + fh * 0.32 + wobble + yOff);
      ctx.lineTo(px + fw * 0.82, topY + fh * 0.5 + wobble * 0.7 + yOff); // the notch
      ctx.lineTo(px + fw, topY + fh * 0.68 + wobble + yOff);
      ctx.lineTo(px + fw * 0.55, topY + fh * 0.78 + wobble * 0.4 + yOff);
      ctx.lineTo(px, topY + fh);
      ctx.closePath();
      ctx.fill();
    };
    cloth(sc * 0.04, flap2, shade(st.deep, -4), 0.7);
    cloth(0, flap, st.mid, 0.95);
    // The device on the field: a white blaze at the hoist.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    burstStarPath(ctx, px + fw * 0.28, topY + fh * 0.42 + flap * 0.25, sc * 0.08, sc * 0.03, 4, 0.6, 1);
    ctx.fill();
    // The hem catches light as it snaps.
    ctx.globalAlpha = 0.85 * fade * (0.4 + 0.6 * Math.abs(flap) / (sc * 0.1));
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(px + fw * 0.55, topY + sc * 0.06 + flap * 0.4);
    ctx.lineTo(px + fw, topY + fh * 0.32 + flap);
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
    // The inscription: a gilt arc written where the oath was sworn —
    // a deep groove bed under crawling gold dashes.
    ctx.save();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.8, rPx * 0.8 * squash, 0, dir - 0.6, dir + 0.6);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.setLineDash([sc * 0.1, sc * 0.08]);
    ctx.lineDashOffset = -c.now / 40; // the writing still crawling home
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
    // The after-edge: the swing hangs where it was sworn — a FULL
    // gilded band, deep sleeve under gold body under the white rim,
    // refusing to leave with the blade.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -4);
    ctx.lineWidth = Math.max(5, sc * 0.17);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.82, rPx * 0.82 * squash, 0, dir - 0.58, dir + 0.58);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.2, sc * 0.11);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.82, rPx * 0.82 * squash, 0, dir - 0.55, dir + 0.55);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.9, rPx * 0.9 * squash, 0, dir - 0.45, dir + 0.45);
    ctx.stroke();
    // The repayment: three beads leave the rim and run home to the
    // hand — each a gilded cross dragging a fading gold tail, and a
    // white arrival click at the palm.
    for (let k = 0; k < 3; k++) {
      const pk = Math.min(1, Math.max(0, (t - 0.1 - k * 0.12) / 0.45));
      if (pk <= 0) continue;
      const a = dir + (k - 1) * 0.42;
      const sx = px + Math.cos(a) * rPx * 0.85;
      const sy = cy + Math.sin(a) * rPx * 0.85 * squash;
      const hx = px;
      const hy = py - sc * 0.5;
      if (pk >= 1) {
        // The click: the oath pays into the palm.
        const held = Math.max(0, 1 - (t - 0.55 - k * 0.12) / 0.12);
        if (held > 0) {
          ctx.globalAlpha = held;
          ctx.fillStyle = st.core;
          ctx.beginPath();
          burstStarPath(ctx, hx, hy, sc * 0.14, sc * 0.05, 4, k, 1);
          ctx.fill();
        }
        continue;
      }
      const bx = sx + (hx - sx) * pk;
      const by = sy + (hy - sy) * pk;
      // The tail: a fading gold streak back along the path home.
      const tx = sx + (hx - sx) * Math.max(0, pk - 0.18);
      const ty = sy + (hy - sy) * Math.max(0, pk - 0.18);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx, by);
      ctx.stroke();
      const g = Math.max(2, sc * 0.05) * (0.7 + pk * 0.5);
      ctx.globalAlpha = 0.95;
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
