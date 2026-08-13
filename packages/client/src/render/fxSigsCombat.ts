/**
 * THE SIGNATURE LAW — the veteran's voice.
 *
 * Eleven bespoke set-pieces for the combat ladder, rebuilt to the
 * breath-wave bar: filled forms over hairlines, contrast beds under
 * every pale element, strike moments that flash once, and ground
 * aftermath that outlives the deed. Same binding laws as
 * fxSignatures.ts: hard edges, save/restore hygiene, squash on the
 * ground, srand-deterministic geometry, frameDt-gated emission, ≤60
 * path ops per hook per frame.
 *
 * The school's grammar is DUST AND BRASS: drill-yard grit, camp iron,
 * rope and stakes, one brass note where the school raises its voice,
 * war-red only where blood is the point, plain daylight for the read
 * of a guard. No element ever — the veteran's lessons look the same
 * whatever the hand holds — and no knives, no blade-steel: the other
 * schools own their weapons; this one owns the yard.
 *
 * The two true matters route through the MATTER LIBRARY (ONE-VOICE
 * LAW): drill-yard dust and war-red blood. Chips, stakes, rope,
 * milestones, and the daylight door stay the veteran's own paint.
 *
 * WIRE-LIFETIME LAW: 'buff' fx live a FIXED 750ms — second_breath and
 * hold_fast are ONE-CEREMONY rites, never held states. Flurry beat
 * parity reads off bornAt (c.now - c.age). loose_iron speaks only at
 * its wounds ('blast', no dir — angles come from the seed).
 */

import { srand, burstStarPath } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, blood, asMatter } from './matter/index.js';
import { shade } from './rig.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** Which beat of a re-broadcast flurry this fx is: bornAt / cadence. */
function beatIndex(c: SigCtx, cadenceMs: number): number {
  return Math.floor((c.now - c.age) / cadenceMs);
}

/**
 * The school's brick: a faceted yard chip — a clod of packed drill
 * ground with a lit top facet and a dark under-cheek. The painted,
 * choreographable cousin of the matter library's fines.
 */
function chip(c: SigCtx, x: number, y: number, s: number, rot: number, base: string, alpha: number): void {
  const { ctx } = c;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  // Under-cheek, dark and low.
  ctx.fillStyle = shade(base, -30);
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.lineTo(-s * 0.3, s * 0.7);
  ctx.lineTo(s * 0.8, s * 0.45);
  ctx.lineTo(s, -s * 0.1);
  ctx.closePath();
  ctx.fill();
  // Lit top facet.
  ctx.fillStyle = shade(base, 14);
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.lineTo(-s * 0.2, -s * 0.55);
  ctx.lineTo(s * 0.85, -s * 0.3);
  ctx.lineTo(s, -s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * FIRST_BLOOD — "the first drop."
 * The cut itself is fast and plain — a statement, not a firework. The
 * signature is what follows: one heavy red drop swells at the low end
 * of the cut, catches the light, lets go, falls true, and stars the
 * ground. The fight's ledger opens with a single entry.
 */
const first_blood: AbilitySig = {
  spawn(c) {
    blood.deployments.spray!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.5,
      c.wy + Math.sin(c.dir) * c.radius * 0.5 * c.squash,
      { dir: c.dir, scale: 0.4 });
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    const p = groundPt(c, c.rPx * 0.55, dir);
    const cutA = dir - 0.5;
    const lowX = p.x + Math.cos(cutA) * sc * 0.45;
    const lowY = p.y - sc * 0.55 + Math.sin(cutA) * sc * 0.28;
    ctx.save();
    // The cut: deliberate and quick, deep bed under a hot line.
    if (t < 0.3) {
      const f = t / 0.3;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85 * (1 - f * 0.6);
      ctx.strokeStyle = shade(st.deep, -12);
      ctx.lineWidth = Math.max(4, sc * 0.115);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(cutA) * sc * 0.5, p.y - sc * 0.55 - Math.sin(cutA) * sc * 0.3 + 2.5);
      ctx.lineTo(lowX, lowY + 2.5);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * (1 - f);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(cutA) * sc * 0.5, p.y - sc * 0.55 - Math.sin(cutA) * sc * 0.3);
      ctx.lineTo(lowX, lowY);
      ctx.stroke();
    }
    // The drop: swells at the cut's low end, gleams, lets go, falls.
    const RED = '#9e2b22';
    if (t < 0.42) {
      // Swelling: a teardrop growing at the low point.
      const g = Math.min(1, t / 0.36);
      const r = sc * 0.15 * g;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.moveTo(lowX, lowY - r * 1.4);
      ctx.quadraticCurveTo(lowX + r * 1.15, lowY - r * 0.2, lowX, lowY + r);
      ctx.quadraticCurveTo(lowX - r * 1.15, lowY - r * 0.2, lowX, lowY - r * 1.4);
      ctx.fill();
      // The specular catch.
      ctx.fillStyle = '#f0d8d2';
      ctx.beginPath();
      ctx.arc(lowX - r * 0.3, lowY - r * 0.45, Math.max(0.8, r * 0.28), 0, Math.PI * 2);
      ctx.fill();
    } else if (t < 0.62) {
      // Falling: tracked, elongating, true.
      const f = (t - 0.42) / 0.2;
      const fy = lowY + (p.y - lowY + sc * 0.02) * (f * f);
      const r = sc * 0.13;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.ellipse(lowX, fy, r * 0.7, r * (1 + f * 0.9), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (t < 0.3) c.glow(c.wx, c.wy, 0.5, 0.14 * (1 - t / 0.3));
  },
  ground(c) {
    const { ctx, t, sc, squash, dir } = c;
    // The star: the drop lands at 0.62 and the ground keeps it.
    if (t < 0.62) return;
    const f = (t - 0.62) / 0.38;
    const p = groundPt(c, c.rPx * 0.55, dir);
    const cutA = dir - 0.5;
    const sx = p.x + Math.cos(cutA) * sc * 0.45;
    const sy = p.y + Math.sin(cutA) * sc * 0.28 * squash;
    ctx.save();
    // The splat: a dark red star with crown points.
    ctx.globalAlpha = 0.9 * (1 - f * 0.5);
    ctx.fillStyle = '#6e1d16';
    ctx.beginPath();
    burstStarPath(ctx, sx, sy, sc * (0.16 + 0.09 * Math.min(1, f * 3)), sc * 0.07, 6, 0.4, squash);
    ctx.fill();
    // The fresh sheen, young only.
    if (f < 0.4) {
      ctx.globalAlpha = 0.8 * (1 - f / 0.4);
      ctx.fillStyle = '#b8352a';
      ctx.beginPath();
      ctx.ellipse(sx, sy, sc * 0.09, sc * 0.05 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * SHOULDER_CHECK — "the dust arrives with you."
 * No blade anywhere. A rolling bank of yard dust chases the dash —
 * squat two-tone billow lobes stacking and growing — and half a beat
 * after the body stops, the bank breaks over the landing. The ground
 * keeps two plowed skid furrows and a scatter of faceted clods.
 */
const shoulder_check: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx2, c.wy2, { scale: 0.8 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.85) return;
    const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    ctx.save();
    // The bank: three billow lobes chasing the body, always behind the
    // front, breaking over the landing after arrival.
    const front = Math.min(1, t / 0.55); // the body reaches at 0.55
    const bank = Math.min(1, t / 0.75); // the dust is late
    for (let k = 0; k < 3; k++) {
      const lag = 0.16 * (k + 1);
      const s = Math.max(0, bank - lag * (1 - bank));
      const bx = c.px + (c.px2 - c.px) * Math.min(front, s);
      const by = c.py + (c.py2 - c.py) * Math.min(front, s);
      const grow = sc * (0.34 + 0.18 * k + 0.3 * bank);
      const rise = sc * (0.24 + 0.18 * k) * (0.6 + 0.4 * bank);
      const back = -Math.cos(a) * grow * (0.8 + k * 0.35);
      const backY = -Math.sin(a) * grow * (0.8 + k * 0.35) * c.squash;
      const fade = (0.85 - t) / 0.85;
      // Dark body of the lobe.
      ctx.globalAlpha = (0.75 - k * 0.12) * (0.4 + 0.6 * fade);
      ctx.fillStyle = shade(st.mid, -24);
      ctx.beginPath();
      ctx.ellipse(bx + back, by + backY - rise, grow, grow * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pale crest riding its top.
      ctx.globalAlpha = (0.8 - k * 0.13) * (0.4 + 0.6 * fade);
      ctx.fillStyle = shade(st.mid, 24);
      ctx.beginPath();
      ctx.ellipse(bx + back - grow * 0.15, by + backY - rise - grow * 0.42, grow * 0.62, grow * 0.4, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // The break: when the bank catches the stopped body, clods fly.
    if (t > 0.55) {
      const f = (t - 0.55) / 0.3;
      const rand = srand(c.seed ^ 0x2d);
      for (let k = 0; k < 4; k++) {
        const ca = a + (rand() - 0.5) * 1.6;
        const reach = sc * (0.3 + 0.5 * f) * (0.7 + rand() * 0.5);
        const hop = Math.sin(Math.min(1, f * 1.2) * Math.PI) * sc * (0.25 + rand() * 0.2);
        chip(
          c,
          c.px2 + Math.cos(ca) * reach,
          c.py2 + Math.sin(ca) * reach * c.squash - hop,
          sc * (0.07 + rand() * 0.05),
          f * 6 + k,
          st.mid,
          0.95 * (1 - f),
        );
      }
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.3 || t > 0.95) return;
    const fade = t > 0.7 ? (0.95 - t) / 0.25 : 1;
    const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    const nx = -Math.sin(a);
    const ny = Math.cos(a) * squash;
    ctx.save();
    ctx.lineCap = 'round';
    // Two plowed furrows converging on the stop — the heels dug in.
    for (const s of [-1, 1]) {
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(
        c.px2 - Math.cos(a) * sc * 0.85 + nx * s * sc * 0.2,
        c.py2 - Math.sin(a) * sc * 0.85 * squash + ny * s * sc * 0.2,
      );
      ctx.lineTo(c.px2 + nx * s * sc * 0.05, c.py2 + ny * s * sc * 0.05);
      ctx.stroke();
      // The raised lip catching light on the outer edge.
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = shade(st.mid, 12);
      ctx.lineWidth = Math.max(1.2, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(
        c.px2 - Math.cos(a) * sc * 0.7 + nx * s * sc * 0.27,
        c.py2 - Math.sin(a) * sc * 0.7 * squash + ny * s * sc * 0.27 - 1.5,
      );
      ctx.lineTo(c.px2 + nx * s * sc * 0.12, c.py2 + ny * s * sc * 0.12 - 1.5);
      ctx.stroke();
    }
    // Clods at rest past the stop.
    const rand = srand(c.seed ^ 0x2e);
    for (let k = 0; k < 3; k++) {
      const ca = a + (rand() - 0.5) * 1.4;
      const r = sc * (0.35 + rand() * 0.45);
      chip(c, c.px2 + Math.cos(ca) * r, c.py2 + Math.sin(ca) * r * squash, sc * (0.045 + rand() * 0.03), rand() * 6, st.mid, 0.75 * fade);
    }
    ctx.restore();
  },
};

/**
 * WAR_SHOUT — "the yard stops."
 * The voice leaves the body as a visible horn-bell cone, then detaches
 * as one hammered brass pressure-wave — the only ring in the game
 * whose rim WOBBLES, eight soft lobes like a struck cymbal still
 * moving. Inside the wave the yard grass lies pressed flat outward.
 */
const war_shout: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x3a);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        { speed: 0.9, life: 0.4, size: 0.05, gravity: -1.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash } = c;
    ctx.save();
    // The bell: the shout's cone, first fifth only.
    if (t < 0.22) {
      const f = t / 0.22;
      const mouthY = c.py - sc * 0.62;
      const spread = sc * (0.2 + 0.55 * f);
      const reach = sc * (0.3 + 0.7 * f);
      ctx.globalAlpha = 0.85 * (1 - f * 0.4);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(c.px, mouthY);
      ctx.lineTo(c.px + reach, mouthY - spread * 0.5);
      ctx.moveTo(c.px, mouthY);
      ctx.lineTo(c.px + reach, mouthY + spread * 0.5);
      ctx.stroke();
      // Ripples inside the bell.
      ctx.globalAlpha = 0.7 * (1 - f * 0.4);
      ctx.strokeStyle = shade(st.mid, 10);
      ctx.lineWidth = Math.max(1.2, sc * 0.03);
      for (const rf of [0.45, 0.75]) {
        ctx.beginPath();
        ctx.arc(c.px, mouthY, reach * rf, -0.42, 0.42);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.save();
    // The wave: a hammered brass band with a wobbling rim.
    if (t < 0.85) {
      const f = t / 0.85;
      const r = c.rPx * (0.16 + 0.84 * Math.min(1, f * 1.25));
      const wob = sc * 0.05 * (1 - f * 0.6);
      const ring = (rr: number, col: string, lw: number, alpha: number, oy: number): void => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let k = 0; k <= 26; k++) {
          const a = (k / 26) * Math.PI * 2;
          const rw = rr + Math.sin(a * 8 + c.now / 120) * wob;
          const x = c.px + Math.cos(a) * rw;
          const y = c.py - sc * 0.28 + Math.sin(a) * rw * squash + oy;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      };
      ring(r, shade(st.deep, -12), Math.max(3.5, sc * 0.1), 0.6 * (1 - f), 2.5);
      ring(r, st.mid, Math.max(2.8, sc * 0.08), 0.9 * (1 - f), 0);
      ring(r + sc * 0.04, st.core, Math.max(1.3, sc * 0.032), 0.95 * (1 - f), -1);
    }
    ctx.restore();
    if (t < 0.4) c.glow(c.wx, c.wy, c.radius * 0.8, 0.22 * (1 - t / 0.4));
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.12 || t > 0.9) return;
    const f = (t - 0.12) / 0.78;
    const r = c.rPx * (0.16 + 0.84 * Math.min(1, (t / 0.85) * 1.25));
    const rand = srand(c.seed ^ 0x3b);
    ctx.save();
    ctx.lineCap = 'round';
    // The pressed yard: short ticks lying flat, pointing outward,
    // left behind the wave as it passes.
    ctx.globalAlpha = 0.55 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(1.4, sc * 0.032);
    for (let k = 0; k < 10; k++) {
      const a = rand() * Math.PI * 2;
      const rr = r * (0.3 + rand() * 0.55);
      const x = c.px + Math.cos(a) * rr;
      const y = c.py + Math.sin(a) * rr * squash;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * sc * 0.14, y + Math.sin(a) * sc * 0.14 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * SECOND_BREATH — "the chest fills."
 * One ceremony, 750ms, in three beats: the INHALE — long intake
 * streamlines bend in from every side while the ground ring tightens;
 * the HELD moment — everything stops for a tenth of a second, one
 * bright glint standing at the sternum; the RELEASE — a soft
 * chest-high wave lets go and renewal climbs the body. Nothing else
 * in the game dares be still.
 */
const second_breath: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const chestY = c.py - sc * 0.62;
    ctx.save();
    if (t < 0.45) {
      // The inhale: streamlines bending home, motes riding them.
      const f = t / 0.45;
      const rand = srand(c.seed ^ 0x4d);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rand() * 0.6;
        const far = sc * (1.0 + rand() * 0.3);
        const sx = c.px + Math.cos(a) * far;
        const sy = chestY + Math.sin(a) * far * 0.45;
        const pull = f * f; // accelerating
        ctx.globalAlpha = 0.75 * Math.min(1, f * 2.5);
        ctx.strokeStyle = k % 2 ? st.core : shade(st.mid, 10);
        ctx.lineWidth = Math.max(1.6, sc * 0.045);
        ctx.beginPath();
        ctx.moveTo(sx + (c.px - sx) * pull * 0.75, sy + (chestY - sy) * pull * 0.75);
        ctx.quadraticCurveTo(
          sx + (c.px - sx) * (pull * 0.75 + 0.15) + Math.cos(a + Math.PI / 2) * sc * 0.1,
          sy + (chestY - sy) * (pull * 0.75 + 0.15),
          sx + (c.px - sx) * Math.min(1, pull * 0.75 + 0.3),
          sy + (chestY - sy) * Math.min(1, pull * 0.75 + 0.3),
        );
        ctx.stroke();
        // The mote at the line's head.
        ctx.globalAlpha = 0.85 * Math.min(1, f * 2.5);
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.arc(sx + (c.px - sx) * Math.min(1, pull * 0.78 + 0.3), sy + (chestY - sy) * Math.min(1, pull * 0.78 + 0.3), Math.max(1.6, sc * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t < 0.6) {
      // The held moment: one still glint, full.
      const f = (t - 0.45) / 0.15;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, c.px, chestY, sc * (0.22 + 0.07 * Math.sin(f * Math.PI)), sc * 0.08, 4, 0.78, 1);
      ctx.fill();
    } else {
      // The release: a chest-high wave lets go, vigor climbs.
      const f = (t - 0.6) / 0.4;
      const r = sc * (0.2 + 0.75 * f);
      ctx.globalAlpha = 0.75 * (1 - f);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(c.px, chestY, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * (1 - f);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.ellipse(c.px, chestY, r * 1.08, r * 0.54, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Renewal climbing: three glints rising the body line.
      const rand = srand(c.seed ^ 0x4e);
      for (let k = 0; k < 3; k++) {
        const ph = Math.min(1, f * 1.5 - k * 0.18);
        if (ph <= 0) continue;
        ctx.globalAlpha = 0.9 * Math.sin(ph * Math.PI);
        ctx.fillStyle = k % 2 ? st.core : shade(st.mid, 18);
        ctx.beginPath();
        ctx.arc(c.px + (rand() - 0.5) * sc * 0.3, c.py - sc * (0.2 + ph * 0.9), Math.max(1.3, sc * 0.032), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.6, t < 0.6 ? 0.12 : 0.2 * (1 - (t - 0.6) / 0.4));
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    ctx.save();
    if (t < 0.45) {
      // The inhale ring: tightens — nothing else breathes in.
      const f = t / 0.45;
      const r = sc * (0.85 - 0.5 * f);
      ctx.globalAlpha = 0.55 * Math.min(1, f * 3);
      ctx.strokeStyle = shade(st.mid, -14);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (t > 0.6) {
      // The release: the ring relaxes back out and lets go.
      const f = (t - 0.6) / 0.4;
      const r = sc * (0.35 + 0.55 * f);
      ctx.globalAlpha = 0.5 * (1 - f);
      ctx.strokeStyle = shade(st.mid, -8);
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * LOOSE_IRON — "camp iron."
 * Each wound is one landed piece of visible junk: a bent camp nail, a
 * belt buckle, or the pommel stone — seed-picked. It smacks in with a
 * grey spark star, bounces once with its shadow blinking under it,
 * and lies where it stopped, dented ground beside it, for the whole
 * wire. Three throws, three different pieces on the field.
 */
const loose_iron: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5e);
    for (let k = 0; k < 3; k++) {
      c.particles.burst(c.wx, c.wy - 0.3, 1, [c.st.spark, c.st.core], {
        speed: 1.6 + rand() * 1.0,
        life: 0.3,
        size: 0.045,
        gravity: 5,
        dir: rand() * Math.PI * 2,
        spread: 0.3,
        shape: 'glint',
      });
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x5f);
    const piece = Math.floor(rand() * 3); // nail | buckle | stone
    const rot0 = rand() * Math.PI * 2;
    const IRON = '#7e848e';
    // The bounce: in at 0, down at 0.1, hop to 0.32, rest after.
    let ly: number;
    let rot = rot0;
    if (t < 0.1) {
      const f = t / 0.1;
      ly = sc * 0.9 * (1 - f);
      rot = rot0 + f * 2.4;
    } else if (t < 0.34) {
      const f = (t - 0.1) / 0.24;
      ly = Math.sin(f * Math.PI) * sc * 0.3;
      rot = rot0 + 2.4 + f * 1.8;
    } else {
      ly = 0;
      rot = rot0 + 4.2;
    }
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    ctx.save();
    ctx.translate(c.px, c.py - sc * 0.06 - ly);
    ctx.rotate(rot);
    ctx.scale(1.5, 1.5);
    ctx.globalAlpha = 0.95 * fade;
    if (piece === 0) {
      // The bent nail: shank with a kink, flat head.
      ctx.strokeStyle = IRON;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-sc * 0.16, 0);
      ctx.lineTo(sc * 0.02, -sc * 0.03);
      ctx.lineTo(sc * 0.17, sc * 0.03);
      ctx.stroke();
      ctx.strokeStyle = shade(IRON, 24);
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(-sc * 0.14, -1.2);
      ctx.lineTo(sc * 0.01, -sc * 0.04);
      ctx.stroke();
      ctx.fillStyle = shade(IRON, -18);
      ctx.fillRect(-sc * 0.19, -sc * 0.05, sc * 0.045, sc * 0.1);
    } else if (piece === 1) {
      // The buckle: an open iron rectangle with its tongue.
      ctx.strokeStyle = IRON;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.strokeRect(-sc * 0.11, -sc * 0.08, sc * 0.22, sc * 0.16);
      ctx.strokeStyle = shade(IRON, 24);
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(-sc * 0.11, -sc * 0.08);
      ctx.lineTo(sc * 0.11, -sc * 0.08);
      ctx.stroke();
      ctx.strokeStyle = shade(IRON, -14);
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, -sc * 0.08);
      ctx.lineTo(0, sc * 0.06);
      ctx.stroke();
    } else {
      // The pommel stone: a worn faceted knob.
      ctx.fillStyle = shade(IRON, -20);
      ctx.beginPath();
      ctx.arc(0, 0, sc * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(IRON, 16);
      ctx.beginPath();
      ctx.arc(-sc * 0.025, -sc * 0.03, sc * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // The arrival star, young only.
    if (t < 0.14) {
      ctx.save();
      ctx.globalAlpha = 0.95 * (1 - t / 0.14);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, c.px, c.py - sc * 0.1, sc * 0.32, sc * 0.12, 5, rot0, 1);
      ctx.fill();
      ctx.restore();
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.08 || t > 0.92) return;
    const fade = t > 0.7 ? (0.92 - t) / 0.22 : 1;
    const rand = srand(c.seed ^ 0x60);
    const dentA = rand() * Math.PI * 2;
    ctx.save();
    // The blinking contact shadow: gone at the top of the hop.
    let sh = 1;
    if (t < 0.1) sh = t / 0.1;
    else if (t < 0.34) sh = 1 - Math.sin(((t - 0.1) / 0.24) * Math.PI) * 0.7;
    ctx.globalAlpha = 0.55 * sh * fade;
    ctx.fillStyle = shade(st.deep, -20);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.19, sc * 0.095 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The first dent: a nick beside where it now lies.
    if (t > 0.12) {
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(dentA) * sc * 0.16, c.py + Math.sin(dentA) * sc * 0.16 * squash);
      ctx.lineTo(c.px + Math.cos(dentA) * sc * 0.28, c.py + Math.sin(dentA) * sc * 0.28 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * HOLD_FAST — "the staked ground."
 * One ceremony, 750ms: four iron-capped stakes drive in one after
 * another around the feet, the rope lashes post to post behind them —
 * sagging honestly between each pair — and at the last post the whole
 * line SNAPS taut with one white twang. The claimed square darkens
 * faintly. Held ground, surveyed and fenced in under a second.
 */
const hold_fast: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const r = sc * 0.95;
    const fade = t > 0.88 ? (1 - t) / 0.12 : 1;
    const posts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      posts.push({ x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * squash });
    }
    const taut = t > 0.62;
    ctx.save();
    // The claim: the fenced square reads as held ground.
    if (t > 0.3) {
      ctx.globalAlpha = 0.18 * Math.min(1, (t - 0.3) / 0.3) * fade;
      ctx.fillStyle = shade(st.deep, -10);
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const p = posts[k % 4]!;
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.fill();
    }
    // The rope: lashes post to post chasing the stakes, sagging until
    // the snap. One segment strings per driven pair.
    for (let k = 0; k < 4; k++) {
      const segT = 0.14 + k * 0.13; // when this segment strings
      if (t < segT) continue;
      const p0 = posts[k]!;
      const p1 = posts[(k + 1) % 4]!;
      const run = Math.min(1, (t - segT) / 0.1);
      const sag = taut ? 0 : sc * 0.11;
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = shade('#a8906a', -12);
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - sc * 0.12);
      ctx.quadraticCurveTo(mx, my - sc * 0.12 + sag, p0.x + (p1.x - p0.x) * run, p0.y + (p1.y - p0.y) * run - sc * 0.12);
      ctx.stroke();
    }
    // The twang: one white flash along all four sides at the snap.
    if (taut && t < 0.74) {
      ctx.globalAlpha = 0.95 * (1 - (t - 0.62) / 0.12) * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const p = posts[k % 4]!;
        if (k === 0) ctx.moveTo(p.x, p.y - sc * 0.12);
        else ctx.lineTo(p.x, p.y - sc * 0.12);
      }
      ctx.stroke();
    }
    // The stakes: driven one per eighth, dropping in with a settle.
    for (let k = 0; k < 4; k++) {
      const driveT = 0.04 + k * 0.13;
      if (t < driveT) continue;
      const dr = Math.min(1, (t - driveT) / 0.08);
      const p = posts[k]!;
      const h = sc * 0.44;
      const drop = (1 - dr) * sc * 0.6;
      const wob = Math.sin(Math.min(1, (t - driveT) / 0.2) * Math.PI * 2) * 0.06 * (1 - dr);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(wob);
      ctx.globalAlpha = 0.95 * fade;
      // Dark side, lit face, iron cap.
      ctx.fillStyle = shade(st.mid, -26);
      ctx.fillRect(-sc * 0.06, -h - drop, sc * 0.06, h);
      ctx.fillStyle = shade(st.mid, 10);
      ctx.fillRect(0, -h - drop, sc * 0.055, h);
      ctx.fillStyle = st.core;
      ctx.fillRect(-sc * 0.07, -h - drop - sc * 0.045, sc * 0.14, sc * 0.055);
      ctx.restore();
      // The drive pip: a small dust pop the frame it lands.
      if (dr >= 1 && t < driveT + 0.14) {
        ctx.globalAlpha = 0.7 * (1 - (t - driveT - 0.08) / 0.06) * fade;
        ctx.strokeStyle = shade(st.mid, 8);
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, sc * 0.09, sc * 0.045 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

/**
 * BREAK_THE_LINE — "the line bends."
 * One squat earthen wall-wave rolls the breadth of the arc: a dark
 * face, a boiling crest of pale grit, chips flying off the top, and
 * its own shadow racing the ground ahead of it. Where it passed, the
 * line itself is left BENT — a pressed trough with a kink — and three
 * skid marks say somebody was standing there.
 */
const break_the_line: AbilitySig = {
  spawn(c) {
    dust.deployments.gouge!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.35,
      c.wy + Math.sin(c.dir) * c.radius * 0.35 * c.squash,
      { dir: c.dir, scale: 0.85 });
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t > 0.62) return;
    const f = t / 0.62;
    const r = c.rPx * (0.3 + 0.65 * f);
    const lift = sc * 0.3;
    ctx.save();
    // The shadow racing ahead of the wave.
    ctx.globalAlpha = 0.35 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -20);
    ctx.lineWidth = Math.max(3, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r * 1.1, r * 1.1 * squash, 0, dir - 0.62, dir + 0.62);
    ctx.stroke();
    // The wall: dark earth face.
    ctx.globalAlpha = 0.85 * (1 - f * 0.7);
    ctx.strokeStyle = shade(st.mid, -24);
    ctx.lineWidth = Math.max(5, sc * 0.17 * (1 - f * 0.3));
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift * 0.5, r, r * squash, 0, dir - 0.68, dir + 0.68);
    ctx.stroke();
    // The boiling crest riding its top.
    ctx.globalAlpha = 0.9 * (1 - f * 0.6);
    ctx.strokeStyle = shade(st.mid, 18);
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift, r * 1.01, r * 1.01 * squash, 0, dir - 0.6, dir + 0.6);
    ctx.stroke();
    // The hot leading lip.
    ctx.globalAlpha = 0.95 * (1 - f);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.4, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - lift * 0.9, r * 1.05, r * 1.05 * squash, 0, dir - 0.5, dir + 0.5);
    ctx.stroke();
    // Chips boiling off the crest.
    const rand = srand(c.seed ^ 0x7b);
    for (let k = 0; k < 4; k++) {
      const ca = dir + (rand() - 0.5) * 1.1;
      const cr = r * (0.95 + rand() * 0.2);
      const p = groundPt(c, cr, ca);
      const toss = Math.sin(Math.min(1, f * 1.4) * Math.PI) * sc * (0.3 + rand() * 0.3);
      chip(c, p.x, p.y - lift - toss, sc * (0.06 + rand() * 0.05), f * 7 + k * 1.7, st.mid, 0.95 * (1 - f));
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.8, 0.2 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.3 || t > 0.95) return;
    const f = (t - 0.3) / 0.65;
    const p = groundPt(c, c.rPx * 0.8, dir);
    ctx.save();
    ctx.lineCap = 'round';
    // The bent line: a pressed trough with a kink, lit on the far lip.
    ctx.globalAlpha = 0.75 * (1 - f * 0.8);
    ctx.strokeStyle = shade(st.deep, -16);
    ctx.lineWidth = Math.max(3, sc * 0.085);
    ctx.beginPath();
    ctx.moveTo(p.x - sc * 0.6, p.y + sc * 0.12 * squash);
    ctx.lineTo(p.x, p.y - sc * 0.16 * squash);
    ctx.lineTo(p.x + sc * 0.6, p.y + sc * 0.1 * squash);
    ctx.stroke();
    ctx.globalAlpha = 0.55 * (1 - f);
    ctx.strokeStyle = shade(st.mid, 14);
    ctx.lineWidth = Math.max(1.3, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(p.x - sc * 0.52, p.y + sc * 0.09 * squash - 2);
    ctx.lineTo(p.x, p.y - sc * 0.19 * squash - 2);
    ctx.lineTo(p.x + sc * 0.52, p.y + sc * 0.07 * squash - 2);
    ctx.stroke();
    // The skids: three short marks past the line — whoever held it,
    // moved.
    const rand = srand(c.seed ^ 0x7c);
    ctx.globalAlpha = 0.6 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    for (let k = 0; k < 3; k++) {
      const a = dir + (k - 1) * 0.38 + (rand() - 0.5) * 0.1;
      const sx = p.x + Math.cos(a) * sc * 0.18;
      const sy = p.y + Math.sin(a) * sc * 0.18 * squash;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * sc * (0.24 + rand() * 0.12), sy + Math.sin(a) * sc * (0.24 + rand() * 0.12) * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * THE_OPENING — "daylight in the guard."
 * A narrow door of plain daylight snaps open at the strike point: a
 * dark doorway bed, a white-gold shaft, and — the tell — drill-yard
 * dust motes drifting DOWN inside the lit slit only, the way air
 * shows itself in a sunbeam. It holds one readable beat and snaps
 * shut to a single horizontal cut-flash. The door was always there;
 * the veteran just saw it.
 */
const the_opening: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x8c);
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.5,
        1,
        [c.st.core, c.st.spark],
        { speed: 0.7 + rand() * 0.5, life: 0.35, size: 0.05, gravity: -0.5, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    if (t > 0.72) return;
    const p = groundPt(c, c.rPx * 0.6, dir);
    const h = sc * 1.25;
    const topY = p.y - sc * 0.35 - h;
    // Open fast, hold, snap shut.
    const w = t < 0.12 ? t / 0.12 : t < 0.52 ? 1 : Math.max(0, 1 - (t - 0.52) / 0.1);
    ctx.save();
    if (w > 0.01) {
      // The doorway bed: darkness the light stands in.
      ctx.globalAlpha = 0.6 * w;
      ctx.fillStyle = shade(st.deep, -18);
      ctx.fillRect(p.x - sc * 0.13, topY - sc * 0.05, sc * 0.26, h + sc * 0.1);
      // The daylight shaft.
      ctx.globalAlpha = 0.95 * w;
      ctx.fillStyle = st.core;
      ctx.fillRect(p.x - sc * 0.07 * w, topY, sc * 0.14 * w, h);
      // The warm edge.
      ctx.globalAlpha = 0.8 * w;
      ctx.strokeStyle = shade(st.mid, 20);
      ctx.lineWidth = Math.max(1.2, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(p.x - sc * 0.085 * w, topY);
      ctx.lineTo(p.x - sc * 0.085 * w, topY + h);
      ctx.moveTo(p.x + sc * 0.085 * w, topY);
      ctx.lineTo(p.x + sc * 0.085 * w, topY + h);
      ctx.stroke();
      // The motes: dust hanging in the daylight, drifting down,
      // visible only inside the shaft.
      if (w > 0.6) {
        const rand = srand(c.seed ^ 0x8d);
        for (let k = 0; k < 3; k++) {
          const ph = ((c.now / 1400) + rand()) % 1;
          const mx = p.x + (rand() - 0.5) * sc * 0.09;
          const my = topY + h * (0.12 + 0.76 * ph);
          ctx.globalAlpha = 0.85 * w * Math.sin(ph * Math.PI);
          ctx.fillStyle = shade(st.mid, -6);
          ctx.beginPath();
          ctx.arc(mx, my, Math.max(1, sc * 0.022), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // The snap: one horizontal cut-flash as the door shuts.
    if (t > 0.52 && t < 0.68) {
      const f = (t - 0.52) / 0.16;
      ctx.globalAlpha = 0.95 * (1 - f);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - sc * 0.5 * (1 - f * 0.4), p.y - sc * 0.85);
      ctx.lineTo(p.x + sc * 0.5 * (1 - f * 0.4), p.y - sc * 0.85);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 0.5, 0.24 * w);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.08 || t > 0.85) return;
    const w = t < 0.52 ? Math.min(1, t / 0.12) : Math.max(0, 1 - (t - 0.52) / 0.25);
    const p = groundPt(c, c.rPx * 0.6, dir);
    ctx.save();
    // The light spilling out the bottom of the door.
    ctx.globalAlpha = 0.5 * w;
    ctx.fillStyle = shade(st.mid, 16);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - sc * 0.3, sc * 0.24, sc * 0.12 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.75 * w;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - sc * 0.3, sc * 0.15, sc * 0.075 * squash, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * NO_QUARTER — "the grindstone."
 * Each beat drives one broad chisel-stroke down into the mark from an
 * alternating side — beat parity, wheel grinding — and throws a fan
 * of grinder sparks off the low end. Every beat adds one abrasion
 * mark to the ground, opposite sides stacking, while a rough
 * hand-drawn ring contracts around the work in steps. None asked.
 * None given.
 */
const no_quarter: AbilitySig = {
  spawn(c) {
    const side = beatIndex(c, 250) % 2 === 0 ? 1 : -1;
    blood.deployments.spray!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.5,
      c.wy + Math.sin(c.dir) * c.radius * 0.5 * c.squash,
      { dir: c.dir + side * 1.1, scale: 0.3 });
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    if (t > 0.6) return;
    const f = t / 0.6;
    const side = beatIndex(c, 250) % 2 === 0 ? 1 : -1;
    const p = groundPt(c, c.rPx * 0.5, dir);
    // The chisel-stroke: high on its side, driving down and in.
    const hx = p.x + side * sc * 0.55;
    const hy = p.y - sc * 1.05;
    const lx = p.x - side * sc * 0.1;
    const ly = p.y - sc * 0.35;
    const drive = Math.min(1, f * 2.2);
    ctx.save();
    ctx.lineCap = 'round';
    // Deep bed under the stroke.
    ctx.globalAlpha = 0.75 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(5, sc * 0.15);
    ctx.beginPath();
    ctx.moveTo(hx, hy + 3);
    ctx.lineTo(hx + (lx - hx) * drive, hy + (ly - hy) * drive + 3);
    ctx.stroke();
    // The stroke body, war-dark red.
    ctx.globalAlpha = 0.9 * (1 - f * 0.8);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.5, sc * 0.11);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + (lx - hx) * drive, hy + (ly - hy) * drive);
    ctx.stroke();
    // The hot working tip.
    ctx.globalAlpha = 0.95 * (1 - f);
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.arc(hx + (lx - hx) * drive, hy + (ly - hy) * drive, Math.max(1.6, sc * 0.045), 0, Math.PI * 2);
    ctx.fill();
    // The grinder fan: sparks wedge off the low end once driven.
    if (drive >= 1) {
      const rand = srand(c.seed ^ 0x9e);
      const fanA = Math.atan2(ly - hy, lx - hx);
      ctx.globalAlpha = 0.95 * (1 - f);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      for (let k = 0; k < 5; k++) {
        const a = fanA + (rand() - 0.5) * 0.8;
        const len = sc * (0.2 + rand() * 0.24);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(a) * len, ly + Math.sin(a) * len);
        ctx.stroke();
      }
    }
    // The closing ring: rough, contracting in steps.
    const step = Math.floor(f * 3) / 3;
    const rr = c.rPx * (0.95 - 0.3 * step);
    const rand2 = srand(c.seed ^ 0x9f);
    ctx.globalAlpha = 0.5 * (1 - f * 0.6);
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(1.6, sc * 0.04);
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const jit = rr * (1 + (rand2() - 0.5) * 0.07);
      const x = c.px + Math.cos(a) * jit;
      const y = c.py + Math.sin(a) * jit * c.squash;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.2 || t > 0.9) return;
    const f = (t - 0.2) / 0.7;
    const side = beatIndex(c, 250) % 2 === 0 ? 1 : -1;
    const p = groundPt(c, c.rPx * 0.5, dir);
    ctx.save();
    ctx.lineCap = 'round';
    // This beat's abrasion: a short gouged scrape on its side.
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(2.2, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(p.x + side * sc * 0.28, p.y - side * sc * 0.06 * squash);
    ctx.lineTo(p.x - side * sc * 0.06, p.y + side * sc * 0.1 * squash);
    ctx.stroke();
    ctx.globalAlpha = 0.5 * (1 - f);
    ctx.strokeStyle = shade(st.mid, 8);
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    ctx.moveTo(p.x + side * sc * 0.24, p.y - side * sc * 0.05 * squash - 1.5);
    ctx.lineTo(p.x - side * sc * 0.03, p.y + side * sc * 0.08 * squash - 1.5);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * THE_LONG_FIGHT — "the wave returns."
 * Each pulse rolls one weathered brass wave out — and at reach the
 * wave COOLS IN PLACE, freezing into a standing ring that ages where
 * it stopped: brass, then dark, then nicked and crumbling. Three
 * pulses stack three rings of different ages like a felled tree's
 * heart, and at the center a small brass survivor's disc holds the
 * whole life. You have been here before.
 */
const the_long_fight: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xaf);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash,
        1,
        [c.st.spark, c.st.mid],
        { speed: 1.1, life: 0.5, size: 0.07, gravity: 4, dir: a, spread: 0.3, up: false },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    ctx.save();
    // The rolling wave: fast out, easing hard as it cools.
    const roll = Math.min(1, t / 0.4);
    const ease = 1 - (1 - roll) * (1 - roll); // ease-out
    const r = c.rPx * (0.22 + 0.72 * ease);
    if (t < 0.42) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = shade(st.mid, -26);
      ctx.lineWidth = Math.max(3.5, sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py + 2, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.8, sc * 0.08);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * (1 - roll * 0.5);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.3, sc * 0.032);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r + sc * 0.045, (r + sc * 0.045) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Cooled: the standing ring ages in place — brass dims, nicks
      // open and widen, the ring crumbles rather than fades.
      const age = (t - 0.42) / 0.58;
      const rand = srand(c.seed ^ 0xb0);
      const gaps = 2 + Math.floor(age * 4);
      ctx.globalAlpha = 0.8 * (1 - age * 0.75);
      ctx.strokeStyle = age < 0.4 ? st.mid : shade(st.mid, -20);
      ctx.lineWidth = Math.max(2.2, sc * 0.065 * (1 - age * 0.3));
      for (let g = 0; g < gaps; g++) {
        const a0 = rand() * Math.PI * 2;
        const span = (Math.PI * 2) / gaps - (0.12 + age * 0.5);
        ctx.beginPath();
        ctx.ellipse(c.px, c.py, r, r * squash, 0, a0, a0 + Math.max(0.2, span));
        ctx.stroke();
      }
    }
    // The survivor's disc: small brass center, whole life, breathing.
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = shade(st.mid, -14);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.13, sc * 0.075 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (0.7 + 0.25 * Math.sin(c.now / 300)) * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.1, sc * 0.024);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.09, sc * 0.05 * squash, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
    if (t < 0.4) c.glow(c.wx, c.wy, c.radius * 0.7, 0.16 * (1 - t / 0.4));
  },
};

/**
 * FOUR_ROADS — "the crossroads."
 * The deed's own map, drawn in worn road: four double wheel-ruts run
 * out at the compass of the aim, each ending at a standing milestone
 * — a real stone with a dark side, a lit face, and a top plane — that
 * lights its cap in sequence. Where the four roads meet, a diamond
 * compass paver flashes under the caster. Every road taught the same
 * hand.
 */
const four_roads: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xb1);
    for (let k = 0; k < 4; k++) {
      const a = c.dir + Math.PI / 4 + (k * Math.PI) / 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash - 0.2,
        1,
        [c.st.core, c.st.spark],
        { speed: 0.6 + rand() * 0.4, life: 0.5, size: 0.06, gravity: -1.2, shape: 'glint' },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t > 0.9) return;
    const f = t / 0.9;
    const rand = srand(c.seed ^ 0xb2);
    ctx.save();
    // The compass paver: a diamond at the crossing, lit on two edges.
    const pv = Math.min(1, t / 0.15);
    const ps = sc * 0.3 * pv;
    ctx.globalAlpha = 0.75 * (1 - f * 0.7);
    ctx.fillStyle = shade(st.mid, -18);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py - ps * squash);
    ctx.lineTo(c.px + ps, c.py);
    ctx.lineTo(c.px, c.py + ps * squash);
    ctx.lineTo(c.px - ps, c.py);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.85 * (1 - f * 0.7);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.2, sc * 0.028);
    ctx.beginPath();
    ctx.moveTo(c.px - ps, c.py);
    ctx.lineTo(c.px, c.py - ps * squash);
    ctx.lineTo(c.px + ps, c.py);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = dir + Math.PI / 4 + (k * Math.PI) / 2;
      const open = Math.min(1, Math.max(0, (t - 0.06 - k * 0.05) / 0.24));
      if (open <= 0) continue;
      const eased = 1 - (1 - open) * (1 - open);
      const reach = c.rPx * (0.25 + 0.72 * eased);
      const ex = c.px + Math.cos(a) * reach;
      const ey = c.py + Math.sin(a) * reach * squash;
      const nx = -Math.sin(a);
      const ny = Math.cos(a) * squash;
      // The road: two worn ruts with a pale crown between.
      ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.globalAlpha = 0.75 * (1 - f * 0.8);
        ctx.strokeStyle = shade(st.mid, -22);
        ctx.lineWidth = Math.max(2.2, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(
          c.px + Math.cos(a) * c.rPx * 0.2 + nx * s * sc * 0.07,
          c.py + Math.sin(a) * c.rPx * 0.2 * squash + ny * s * sc * 0.07,
        );
        ctx.lineTo(ex + nx * s * sc * 0.07, ey + ny * s * sc * 0.07);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5 * (1 - f * 0.8);
      ctx.strokeStyle = shade(st.mid, 12);
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(a) * c.rPx * 0.24, c.py + Math.sin(a) * c.rPx * 0.24 * squash);
      ctx.lineTo(ex - Math.cos(a) * sc * 0.12, ey - Math.sin(a) * sc * 0.12 * squash);
      ctx.stroke();
      // The milestone: a real standing stone at road's end.
      if (open > 0.85) {
        const h = sc * (0.36 + rand() * 0.1);
        const w = sc * 0.09;
        const lit = Math.min(1, (open - 0.85) / 0.15);
        ctx.globalAlpha = 0.95 * (1 - f * 0.6);
        // Long shadow first.
        ctx.fillStyle = shade(st.deep, -16);
        ctx.beginPath();
        ctx.ellipse(ex + sc * 0.07, ey + sc * 0.02, sc * 0.13, sc * 0.05 * squash, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Dark side, lit face, top plane.
        ctx.fillStyle = shade(st.mid, -30);
        ctx.fillRect(ex - w, ey - h, w, h);
        ctx.fillStyle = shade(st.mid, 6);
        ctx.fillRect(ex, ey - h, w * 0.9, h);
        ctx.fillStyle = shade(st.mid, 26);
        ctx.beginPath();
        ctx.moveTo(ex - w, ey - h);
        ctx.lineTo(ex - w * 0.4, ey - h - sc * 0.035);
        ctx.lineTo(ex + w * 1.4, ey - h - sc * 0.035);
        ctx.lineTo(ex + w * 0.9, ey - h);
        ctx.closePath();
        ctx.fill();
        // The cap light, in sequence.
        ctx.globalAlpha = 0.95 * lit * (1 - f * 0.5);
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, ex + w * 0.2, ey - h - sc * 0.07, sc * 0.13, sc * 0.05, 4, 0.3, 1);
        ctx.fill();
      }
    }
    ctx.restore();
    if (t < 0.4) c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 * (1 - t / 0.4));
  },
};

export const COMBAT_SIGS: Record<string, AbilitySig> = {
  first_blood,
  shoulder_check,
  war_shout,
  second_breath,
  loose_iron,
  hold_fast,
  break_the_line,
  the_opening,
  no_quarter,
  the_long_fight,
  four_roads,
};
