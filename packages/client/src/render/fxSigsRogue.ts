/**
 * THE SIGNATURE LAW — the ROGUE weapon-art roster.
 *
 * Ten bespoke set-pieces for the dagger arts. The rogue's grammar is
 * precision, malice, and payment: venom that remembers the vein, cold
 * that bites exactly once, a crown knocked off its head, a debt paid
 * in coin-shaped blood. Nothing here is bombast — every signature is
 * a small sharp read that says its mechanic and gets out of the light.
 *
 * Same binding laws as the founding wave: hard edges only, save/
 * restore discipline, squash on ground y-radii, srand-deterministic
 * geometry with frameDt-gated emission as the only per-frame chance,
 * ≤ ~60 path ops per hook per frame. 120fps is a law. No signature
 * shares a centerpiece with any other file's.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

// ------------------------------------------------------------ helpers

/** Unit vector + length along the dash line (screen space), guarded
 * so a degenerate cast (kind not 'dash') stays graceful. */
function dashFrame(c: SigCtx): { ux: number; uy: number; nx: number; ny: number; len: number } {
  const dx = c.px2 - c.px;
  const dy = c.py2 - c.py;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { ux: 1, uy: 0, nx: 0, ny: 1, len: 0 };
  return { ux: dx / len, uy: dy / len, nx: -dy / len, ny: dx / len, len };
}

// ------------------------------------------------------ serpents_kiss

/**
 * SERPENTS_KISS — "the crawling vein."
 * The wave finds the vein and the vein shows its work: two fang
 * punctures stamp where the arc bit, and from each one a thin green
 * vein CRAWLS outward along the ground in serpentine kinks — the
 * venom traveling, mapped in real time — while a forked tongue
 * flicks once over the swing and is gone.
 */
const serpents_kiss: AbilitySig = {
  spawn(c: SigCtx) {
    // The bite lands wet: green flecks spatter off the arc's far rim.
    const rand = srand(c.seed ^ 0x9101);
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (rand() - 0.5) * 0.9;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash - 0.3,
        1, [c.st.mid, c.st.spark], {
          speed: 0.9, life: 0.5, size: 0.06, gravity: 4, dir: a,
          spread: 0.5, fade: c.st.deep,
        },
      );
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x9102);
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const cd = Math.cos(dir);
    const sd = Math.sin(dir);
    // Fang spacing runs perpendicular to the aim.
    const fx = -sd;
    const fy = cd;
    ctx.save();
    for (let f = 0; f < 2; f++) {
      const side = f === 0 ? 1 : -1;
      const bx = px + cd * rPx * 0.62 + fx * side * rPx * 0.16;
      const by = py + (sd * rPx * 0.62 + fy * side * rPx * 0.16) * squash;
      // The puncture: a small dark point with a green welt ring.
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.055, sc * 0.055 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.1, sc * 0.1 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The vein crawls: five kinked steps away from the bite, each
      // segment claimed in travel order as the venom finds its way.
      const reach = Math.min(1, Math.max(0, (t - 0.08) / 0.55));
      const steps = 5;
      const claimed = reach * steps;
      const pulse = 0.7 + 0.3 * Math.sin(c.now / 130 + f * 2.4);
      ctx.globalAlpha = 0.75 * fade * pulse;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      let vx = bx;
      let vy = by;
      for (let k = 0; k < steps; k++) {
        const u = Math.min(1, claimed - k);
        if (u <= 0) break;
        const wig = (k % 2 === 0 ? 1 : -1) * (0.5 + rand() * 0.5);
        const ax = cd * sc * 0.2 + fx * wig * sc * 0.14;
        const ay = (sd * sc * 0.2 + fy * wig * sc * 0.14) * squash;
        vx += ax * u;
        vy += ay * u;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
      // The venom's head glints where the vein has reached.
      if (reach > 0 && reach < 1) {
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = st.spark;
        const g = Math.max(1.5, sc * 0.03);
        ctx.fillRect(vx - g / 2, vy - g / 2, g, g);
      }
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py, dir } = c;
    if (t >= 0.28) return;
    const ft = 1 - t / 0.28;
    const lift = sc * 0.4;
    const cd = Math.cos(dir);
    const sd = Math.sin(dir);
    ctx.save();
    ctx.lineCap = 'butt';
    // The tongue flick: one sinuous dart toward the bite, forked at
    // the tip, out and back in a blink.
    const reach = sc * (0.45 + 0.4 * (1 - ft));
    const wag = Math.sin(c.now / 45) * sc * 0.06;
    const tx = px + cd * reach - sd * wag;
    const ty = py - lift + sd * reach * 0.5 + cd * wag;
    ctx.globalAlpha = 0.85 * ft;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.lineTo(px + cd * reach * 0.55 + sd * wag, py - lift + sd * reach * 0.28 - cd * wag);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // The fork: two short prongs off the tip.
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + cd * sc * 0.1 - sd * sc * 0.07, ty + sd * sc * 0.06 + cd * sc * 0.07);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + cd * sc * 0.1 + sd * sc * 0.07, ty + sd * sc * 0.06 - cd * sc * 0.07);
    ctx.stroke();
    ctx.restore();
  },
};

// ------------------------------------------------------------ stinger

/**
 * STINGER — "the puncture pinch."
 * One wingbeat forward, one perfect hole: the flight is a wasp's
 * hum-line — a tight zigzag ribbon that vanishes tail-first — and
 * the arrival is a single white point with the skin PINCHED in
 * around it: six short ticks pointing inward, tightening. Then the
 * hole does what holes do: one red bead wells up, hangs, and drops.
 */
const stinger: AbilitySig = {
  spawn(c: SigCtx) {
    const { ux, uy } = dashFrame(c);
    const ang = Math.atan2(uy, ux);
    // The sting carries through: two gold slivers past the point.
    c.particles.burst(c.wx2, c.wy2 - 0.4, 2, [c.st.spark, c.st.core], {
      speed: 3, life: 0.22, size: 0.05, gravity: 1, dir: ang, spread: 0.2, shape: 'streak',
    });
    // The wingbeat: a puff of disturbed air at the departure.
    c.particles.burst(c.wx, c.wy, 3, ['#4a4252', c.st.deep], {
      speed: 0.7, life: 0.5, size: 0.08, gravity: -0.3, drag: 2, grow: 0.15,
      shape: 'puff', ground: true,
    });
  },
  ground(c: SigCtx) {
    const { ctx, t, sc, squash, px2, py2 } = c;
    // The bead lands: a small dark drip-stain under the puncture.
    if (t < 0.85) return;
    const u = Math.min(1, (t - 0.85) / 0.08);
    ctx.save();
    ctx.globalAlpha = 0.6 * u * (1 - (t - 0.85) / 0.15);
    ctx.fillStyle = '#6a1518';
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.08 * u, sc * 0.08 * u * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const { ux, uy, nx, ny, len } = dashFrame(c);
    const lift = sc * 0.42;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The hum-line: a tight zigzag ribbon whose amplitude dies toward
    // the point — flight as vibration — erased tail-first behind it.
    if (len > 1 && t < 0.5) {
      const eaten = Math.min(1, t * 2.4);
      ctx.globalAlpha = 0.7 * (1 - t / 0.5);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.028);
      ctx.beginPath();
      const n = 8;
      let started = false;
      for (let k = 0; k <= n; k++) {
        const f = k / n;
        if (f < eaten) continue;
        const amp = sc * 0.09 * (1 - f) * (k % 2 === 0 ? 1 : -1);
        const x = px + ux * len * f + nx * amp;
        const y = py + uy * len * f + ny * amp - lift;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const hx = px2;
    const hy = py2 - lift;
    // The pinch: six ticks pointing INWARD around the point, drawing
    // tighter as the skin closes on the sting.
    if (t < 0.7) {
      const tighten = 1 - Math.min(1, t / 0.7) * 0.45;
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        const r1 = sc * 0.24 * tighten;
        const r0 = sc * 0.13 * tighten;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
        ctx.lineTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0);
        ctx.stroke();
      }
    }
    // The point itself: one hard white diamond, pulsing faintly.
    const pulse = 0.8 + 0.2 * Math.sin(c.now / 90);
    ctx.globalAlpha = 0.95 * fade * pulse;
    ctx.fillStyle = st.core;
    const g = Math.max(2, sc * 0.05);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-g / 2, -g / 2, g, g);
    ctx.restore();
    // Two wing slivers flick beside the point — the wasp, briefly.
    if (t < 0.16) {
      const wt = 1 - t / 0.16;
      ctx.globalAlpha = 0.75 * wt;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + side * sc * 0.08, hy - sc * 0.06);
        ctx.lineTo(hx + side * sc * 0.3, hy - sc * 0.3);
        ctx.stroke();
      }
    }
    // The bead: red wells at the point, hangs, then drops to ground.
    if (t > 0.45) {
      const swell = Math.min(1, (t - 0.45) / 0.2);
      const fall = Math.max(0, Math.min(1, (t - 0.68) / 0.17));
      const by = hy + (py2 - hy) * fall * fall;
      if (fall < 1) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#c4372a';
        ctx.beginPath();
        ctx.ellipse(hx, by + sc * 0.05, sc * 0.035 * swell, sc * 0.045 * swell, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- cold_snap

/**
 * COLD_SNAP — "the snapped pane."
 * The first frost happens all at once: a full skein of pane-cracks
 * is simply THERE on the first frame — no growth, no travel — then
 * the bite lets go piece by piece, each crack winking out on its own
 * clock like ice relaxing. Overhead, the breath of everything caught
 * in the circle hangs frozen, then drops when its clock breaks.
 */
const cold_snap: AbilitySig = {
  spawn(c: SigCtx) {
    // The instant: one shiver of glints across the whole circle.
    const rand = srand(c.seed ^ 0x9301);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * c.radius * 0.9;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash - 0.2, 1, ['#ffffff', c.st.core], {
        speed: 0.2, life: 0.5, size: 0.09, gravity: 0.4, drag: 2, shape: 'glint',
      });
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x9302);
    ctx.save();
    // The flash: the freeze itself, one pale disc for a blink.
    if (t < 0.06) {
      ctx.globalAlpha = (1 - t / 0.06) * 0.55;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The skein: six kinked cracks spanning the disc, all present at
    // full strength from frame one. Each holds — then SNAPS out.
    ctx.lineCap = 'butt';
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const r0 = rPx * (0.08 + rand() * 0.2);
      const r1 = rPx * (0.75 + rand() * 0.25);
      const kink = (rand() - 0.5) * 0.7;
      const dieT = 0.4 + rand() * 0.5;
      if (t >= dieT) continue; // gone — no fade, a snap
      ctx.globalAlpha = k % 2 === 0 ? 0.7 : 0.5;
      ctx.strokeStyle = k % 2 === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1, sc * (0.022 + rand() * 0.012));
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      const rm = (r0 + r1) * 0.5;
      ctx.lineTo(px + Math.cos(a + kink * 0.5) * rm, py + Math.sin(a + kink * 0.5) * rm * squash);
      ctx.lineTo(px + Math.cos(a + kink) * r1, py + Math.sin(a + kink) * r1 * squash);
      ctx.stroke();
    }
    // Rime freckles between the cracks, on the same snap clocks.
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.85;
      const dieT = 0.35 + rand() * 0.55;
      if (t >= dieT) continue;
      ctx.globalAlpha = 0.55;
      const g = Math.max(1.5, sc * (0.02 + rand() * 0.02));
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x9303);
    ctx.save();
    // Frozen breath: five glints hang DEAD STILL over the circle —
    // then each one's clock breaks and it falls, fading as it goes.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.7;
      const h = sc * (0.35 + rand() * 0.5);
      const dropT = 0.3 + rand() * 0.4;
      const gx = px + Math.cos(a) * rr;
      let gy = py + Math.sin(a) * rr * squash - h;
      let al = 0.85;
      if (t > dropT) {
        const u = (t - dropT) / 0.25;
        if (u >= 1) continue;
        gy += u * u * sc * 1.2;
        al *= 1 - u;
      }
      const tw = 0.5 + 0.5 * Math.abs(Math.sin(c.now / 210 + k * 2.1));
      ctx.globalAlpha = al * tw;
      ctx.fillStyle = k % 2 === 0 ? '#ffffff' : st.core;
      const g = Math.max(1.5, sc * 0.03);
      ctx.fillRect(gx - g / 2, gy - g * 1.6, g, g * 3.2);
      ctx.fillRect(gx - g * 1.6, gy - g / 2, g * 3.2, g);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.28 * (1 - t));
  },
};

// -------------------------------------------------------- bone_needle

/**
 * BONE_NEEDLE — "the knucklebone pin."
 * The dead lend a dart and sign the loan: a bone sliver stands
 * ANGLED in the strike, quivering with arrival, a knucklebone knob
 * still riding its butt — while the ground crazes like dropped
 * china, hairline fracture arcs spidering out pale from the entry.
 * The marrow was found; the receipt is legible.
 */
const bone_needle: AbilitySig = {
  spawn(c: SigCtx) {
    // Bone chips tumble off the entry; marrow dust sifts after.
    const rand = srand(c.seed ^ 0x9401);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy - 0.35, 1, [c.st.mid, c.st.core], {
        speed: 1.6, life: 0.45, size: 0.07, gravity: 6, dir: a, spread: 0.3, shape: 'shard', spin: 11,
      });
    }
    c.particles.burst(c.wx, c.wy - 0.25, 3, [c.st.deep, c.st.mid], {
      speed: 0.5, life: 0.6, size: 0.08, gravity: 0.6, drag: 2, grow: 0.12, shape: 'puff',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x9402);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // The crazing: five hairline arcs spidering out of the entry,
    // pale on dark turf — dropped china, not broken earth.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const r0 = sc * (0.08 + rand() * 0.08);
      const r1 = sc * (0.3 + rand() * 0.28);
      const bow = (rand() - 0.5) * 0.8;
      ctx.globalAlpha = (0.55 - k * 0.06) * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      const rm = (r0 + r1) * 0.55;
      ctx.lineTo(px + Math.cos(a + bow * 0.5) * rm, py + Math.sin(a + bow * 0.5) * rm * squash);
      ctx.lineTo(px + Math.cos(a + bow) * r1, py + Math.sin(a + bow) * r1 * squash);
      ctx.stroke();
    }
    // The entry nick: one dark seat where the needle went in.
    ctx.globalAlpha = 0.75 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.07, sc * 0.07 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x9403);
    if (t >= 0.85) return;
    const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.25;
    // The pin: a bone sliver leaning past vertical, still shaking
    // off the force of arrival — the quiver decays, the lean stays.
    const lean = -0.5 + rand() * 1.0;
    const quiver = Math.sin(c.age / 26) * 0.12 * Math.exp(-c.age / 240);
    const L = sc * 0.62;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(lean * 0.35 + quiver);
    ctx.lineCap = 'butt';
    // The shaft: bone-pale with a dark spine line — carved, not cast.
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -L);
    ctx.stroke();
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.016);
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.15);
    ctx.lineTo(0, -L * 0.8);
    ctx.stroke();
    // The knucklebone: a knobbed butt of two offset bone blocks —
    // the loaner's signature still on the dart.
    ctx.fillStyle = st.mid;
    const kb = sc * 0.09;
    ctx.fillRect(-kb * 0.8, -L - kb * 0.9, kb, kb);
    ctx.fillRect(-kb * 0.1, -L - kb * 0.5, kb * 0.9, kb * 0.85);
    ctx.fillStyle = st.core;
    ctx.fillRect(-kb * 0.55, -L - kb * 0.7, Math.max(1.5, kb * 0.3), Math.max(1.5, kb * 0.3));
    ctx.restore();
    // The entry catchlight: the point found what it came for.
    if (t < 0.25) {
      ctx.save();
      ctx.globalAlpha = (1 - t / 0.25) * 0.9;
      ctx.fillStyle = st.core;
      const g = Math.max(2, sc * 0.04);
      ctx.fillRect(px - g / 2, py - g * 1.6, g, g * 3.2);
      ctx.fillRect(px - g * 1.6, py - g / 2, g * 3.2, g);
      ctx.restore();
    }
  },
};

// -------------------------------------------------------- shadow_fang

/**
 * SHADOW_FANG — "the closing jaw."
 * The dark takes one long step and its wake is a MOUTH: a stretched
 * shadow ribbon trails the dash, and at the arrival two rows of dark
 * teeth zip shut across the strike — top row dropping, bottom row
 * rising, meeting at the bite line — then hold clenched while what
 * they drew streams backward into the biter as dark red flecks.
 */
const shadow_fang: AbilitySig = {
  spawn(c: SigCtx) {
    // The step: the departure exhales dark; the dark does not return.
    c.particles.burst(c.wx, c.wy - 0.2, 4, [c.st.deep, c.st.mid], {
      speed: 0.6, life: 0.8, size: 0.12, gravity: -0.5, drag: 1.8, grow: 0.2,
      shape: 'puff', fade: '#16121f', wobble: 0.5,
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    // What the jaw keeps: a dark pool under the bite, contracting —
    // drawn INTO the biter, not spilled.
    const fade = 1 - t;
    const r = sc * 0.42 * (1 - t * 0.6);
    ctx.save();
    ctx.globalAlpha = 0.45 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px2, py2, r, r * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const { nx, ny, len } = dashFrame(c);
    const lift = sc * 0.42;
    ctx.save();
    // The wake: a tapered shadow ribbon from the departure, widest
    // at the arrival — the step, still stretched across the room.
    if (len > 1 && t < 0.45) {
      const wt = 1 - t / 0.45;
      const w = sc * 0.16;
      ctx.globalAlpha = 0.5 * wt;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(px, py - lift);
      ctx.lineTo(px2 - nx * w, py2 - lift - ny * w);
      ctx.lineTo(px2 + nx * w, py2 - lift + ny * w);
      ctx.closePath();
      ctx.fill();
    }
    // The jaw: four teeth above, four below, zipping shut across the
    // bite line and holding clenched while the drain runs.
    const bite = Math.min(1, Math.max(0, (t - 0.04) / 0.26));
    const hold = t < 0.62 ? 1 : Math.max(0, (0.85 - t) / 0.23);
    if (hold > 0) {
      const bx = px2;
      const by = py2 - lift;
      const gap = sc * 0.34 * (1 - bite);
      ctx.globalAlpha = 0.85 * hold;
      for (let k = 0; k < 4; k++) {
        const off = (k - 1.5) * sc * 0.14;
        const tw = sc * 0.055;
        const th = sc * (0.14 - Math.abs(k - 1.5) * 0.025);
        ctx.fillStyle = k % 2 === 0 ? st.deep : st.mid;
        // Top tooth: hangs above the line, point down.
        ctx.beginPath();
        ctx.moveTo(bx + off - tw, by - gap - th);
        ctx.lineTo(bx + off, by - gap);
        ctx.lineTo(bx + off + tw, by - gap - th);
        ctx.closePath();
        ctx.fill();
        // Bottom tooth: rises to meet it, point up.
        ctx.beginPath();
        ctx.moveTo(bx + off - tw, by + gap + th);
        ctx.lineTo(bx + off, by + gap);
        ctx.lineTo(bx + off + tw, by + gap + th);
        ctx.closePath();
        ctx.fill();
      }
      // The bite line flashes white the instant the rows meet.
      if (bite >= 1 && t < 0.42) {
        ctx.globalAlpha = (1 - (t - 0.3) / 0.12) * 0.9;
        ctx.fillStyle = st.core;
        ctx.fillRect(bx - sc * 0.24, by - Math.max(1, sc * 0.02), sc * 0.48, Math.max(2, sc * 0.04));
      }
    }
    ctx.restore();
    // The drain: what the jaw drew streams INTO the body — flecks
    // spawned on the rim, aimed at the biter, dying as they arrive.
    if (t > 0.34 && t < 0.85 && Math.random() < c.frameDt * 14) {
      const a = Math.random() * Math.PI * 2;
      const rr = 0.8;
      const sx = c.wx2 + Math.cos(a) * rr;
      const sy = c.wy2 + Math.sin(a) * rr * c.squash - 0.4;
      c.particles.burst(sx, sy, 1, ['#8e2430', st.deep], {
        speed: 2.4, life: 0.32, size: 0.06, gravity: 0,
        dir: Math.atan2(c.wy2 - 0.4 - sy, c.wx2 - sx), spread: 0.1, drag: 0.5,
      });
    }
  },
};

// ------------------------------------------------------ crimson_tithe

/**
 * CRIMSON_TITHE — "the blood coinage."
 * The pact mints its own currency: five dark-red coin discs stand in
 * a low ring around the rogue, and one by one each coin FLIPS —
 * spinning up to the chest and vanishing with a glint, payment
 * collected — while a double-ruled ledger ring underfoot pays itself
 * down, its drawn arc shortening as the debt is settled.
 */
const crimson_tithe: AbilitySig = {
  spawn(c: SigCtx) {
    // The pact opens: a shiver of dark-red glints at the chest.
    c.particles.burst(c.wx, c.wy - 0.55, 4, [c.st.mid, c.st.spark], {
      speed: 0.35, life: 0.6, size: 0.08, gravity: 0.2, drag: 2.2, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const R = Math.max(rPx, sc * 0.75);
    const start = (c.seed % 7) * 0.9;
    const span = Math.max(0.05, (1 - t) * Math.PI * 2);
    ctx.save();
    ctx.lineCap = 'butt';
    // The ledger: two fine ruled rings, drawn only over the unpaid
    // arc — the account, visibly closing.
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.ellipse(px, py, R, R * squash, 0, start, start + span);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.88, R * 0.88 * squash, 0, start, start + span);
    ctx.stroke();
    // The paying end: a bright tick where the line is being retired.
    const ea = start + span;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = st.spark;
    const g = Math.max(2, sc * 0.04);
    ctx.fillRect(px + Math.cos(ea) * R - g / 2, py + Math.sin(ea) * R * squash - g / 2, g, g);
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x9603);
    const R = Math.max(rPx, sc * 0.75) * 0.82;
    ctx.save();
    // The coinage: five discs wait on the ring, each with a collection
    // clock. Waiting coins breathe a slow edge-flip; a collected coin
    // spins hard, climbs to the chest, and is GONE with a glint.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
      const clockT = 0.1 + (k / 5) * 0.72 + rand() * 0.06;
      const cx = px + Math.cos(a) * R;
      const cy0 = py + Math.sin(a) * R * squash - sc * 0.1;
      const rw = sc * 0.075;
      if (t < clockT) {
        // Waiting: the coin turns on its edge, patient.
        const flip = Math.abs(Math.cos(c.now / 500 + k * 1.9));
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.ellipse(cx, cy0, Math.max(1, rw * flip), rw, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = st.deep;
        ctx.beginPath();
        ctx.ellipse(cx, cy0, Math.max(1, rw * flip * 0.55), rw * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Collected: a fast climbing flip, then the glint of receipt.
        const u = (t - clockT) / 0.14;
        if (u >= 1.3) continue;
        const uu = Math.min(1, u);
        const cy = cy0 + (py - sc * 0.58 - cy0) * uu;
        const tx = px + (cx - px) * (1 - uu);
        if (u < 1) {
          const flip = Math.abs(Math.cos(c.now / 55 + k));
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = st.mid;
          ctx.beginPath();
          ctx.ellipse(tx, cy, Math.max(1, rw * flip), rw, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // The receipt: one crossed glint at the chest, then nothing.
          const gt = 1 - (u - 1) / 0.3;
          ctx.globalAlpha = 0.9 * gt;
          ctx.fillStyle = st.spark;
          const g = Math.max(1.5, sc * 0.03);
          ctx.fillRect(px - g / 2, py - sc * 0.58 - g * 1.6, g, g * 3.2);
          ctx.fillRect(px - g * 1.6, py - sc * 0.58 - g / 2, g * 3.2, g);
        }
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.15 * (1 - t));
  },
};

// --------------------------------------------------------- pale_flame

/**
 * PALE_FLAME — "the inverted candle."
 * Fire that never warmed anything burns the wrong way: a comb of
 * pale tongues hangs along the swept arc pointing DOWN, dripping
 * frost glints instead of casting sparks, and where each drip lands
 * the ground takes a rime freckle instead of a scorch. A candle
 * flame held upside down that never learned to rise.
 */
const pale_flame: AbilitySig = {
  spawn(c: SigCtx) {
    // Cold licks fall along the arc — flame obeying the wrong law.
    const rand = srand(c.seed ^ 0x9701);
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (k / 4 - 0.5) * 1.0 + (rand() - 0.5) * 0.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash - 0.5,
        1, [c.st.mid, c.st.core], {
          speed: 0.5, life: 0.5, size: 0.11, gravity: 2.2,
          dir: Math.PI / 2, spread: 0.3, shape: 'lick', flicker: 0.3, fade: '#ffffff',
        },
      );
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x9702);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // The cold arc: a thin frost band where the sweep passed.
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.72, rPx * 0.72 * squash, 0, dir - 0.55, dir + 0.55);
    ctx.stroke();
    // Rime freckles: each drip's landing, appearing on its own clock
    // in the sector and staying — frost, not scorch.
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 7; k++) {
      const a = dir + (rand() - 0.5) * 1.1;
      const rr = rPx * (0.45 + rand() * 0.45);
      const bornT = 0.1 + rand() * 0.5;
      if (t < bornT) continue;
      ctx.globalAlpha = 0.6 * fade * Math.min(1, (t - bornT) / 0.08);
      const g = Math.max(1.5, sc * (0.02 + rand() * 0.018));
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x9703);
    const fade = t < 0.55 ? 1 : Math.max(0, (0.85 - t) / 0.3);
    if (fade <= 0) return;
    const lift = sc * 0.45;
    ctx.save();
    // The comb: five tongues hung along the arc, apex DOWN, each
    // with a white cold-core wedge, widths breathing out of sync.
    for (let k = 0; k < 5; k++) {
      const a = dir + (k / 4 - 0.5) * 1.0 + (rand() - 0.5) * 0.15;
      const bx = px + Math.cos(a) * rPx * 0.72;
      const by = py + Math.sin(a) * rPx * 0.72 * squash - lift;
      const h = sc * (0.3 + rand() * 0.2) * fade;
      const w = sc * (0.07 + rand() * 0.04) * (0.8 + 0.2 * Math.sin(c.now / 110 + k * 2.3));
      const sway = Math.sin(c.now / 190 + k * 1.6) * w * 0.5;
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx + sway, by + h); // down — the wrong way
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.45, by);
      ctx.lineTo(bx + sway * 0.5, by + h * 0.55);
      ctx.lineTo(bx + w * 0.45, by);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // The drips: frost glints let go of the tips and fall cold.
    if (Math.random() < c.frameDt * 10 * fade) {
      const a = dir + (Math.random() - 0.5) * 1.0;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.72,
        c.wy + Math.sin(a) * c.radius * 0.72 * squash - 0.3,
        1, ['#ffffff', st.core], {
          speed: 0.3, life: 0.4, size: 0.08, gravity: 2.5, shape: 'glint',
        },
      );
    }
  },
};

// --------------------------------------------------------- spark_lash

/**
 * SPARK_LASH — "the earthed lash."
 * The hook is a live wire looking for ground and each hop shows the
 * finding: the stroke arrives as a curling whip-line that CRACKS
 * straight, a barbed hook at its far end — then the current earths
 * itself, stabbing down the struck body in strobing slivers into a
 * socket ring scorched on the ground beneath.
 */
const spark_lash: AbilitySig = {
  spawn(c: SigCtx) {
    // The strike takes the charge: static leaps off the far end.
    const rand = srand(c.seed ^ 0x9801);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx2, c.wy2 - 0.45, 1, [c.st.spark, c.st.core], {
        speed: 2.4, life: 0.26, size: 0.06, gravity: 2.5,
        dir: rand() * Math.PI * 2, spread: 0.3, shape: 'streak', flicker: 0.6,
      });
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    if (t < 0.14) return;
    const fade = 1 - t;
    // The socket: where the current went to ground, a small ring
    // pulsing on the mains and two scorch ticks beside it.
    const throb = 0.6 + 0.4 * Math.sin(c.now / 60);
    ctx.save();
    ctx.globalAlpha = 0.7 * fade * throb;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.16, sc * 0.16 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px2 + side * sc * 0.24, py2 - sc * 0.05 * squash);
      ctx.lineTo(px2 + side * sc * 0.32, py2 + sc * 0.06 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const { ux, uy, nx, ny, len } = dashFrame(c);
    const lift = sc * 0.42;
    ctx.save();
    ctx.lineCap = 'butt';
    // The whip: a curling line that straightens as it cracks — the
    // curl is the throw, the straight line is the hit.
    if (len > 1 && t < 0.5) {
      const curl = Math.max(0, 1 - t / 0.22);
      const wt = 1 - t / 0.5;
      ctx.globalAlpha = 0.85 * wt;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      const n = 7;
      for (let k = 0; k <= n; k++) {
        const f = k / n;
        const bow = Math.sin(f * Math.PI * 1.5) * len * 0.16 * curl;
        const x = px + ux * len * f + nx * bow;
        const y = py + uy * len * f + ny * bow - lift;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // The barb: a hooked V at the business end.
      ctx.globalAlpha = 0.95 * wt;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(px2 - ux * sc * 0.16 - nx * sc * 0.1, py2 - lift - uy * sc * 0.16 - ny * sc * 0.1);
      ctx.lineTo(px2, py2 - lift);
      ctx.lineTo(px2 - ux * sc * 0.05 + nx * sc * 0.14, py2 - lift - uy * sc * 0.05 + ny * sc * 0.14);
      ctx.stroke();
    }
    // The earthing: current stabs down the struck body in slivers,
    // one live at a time on a strobing clock — wire finding ground.
    if (t > 0.1 && t < 0.75) {
      const et = 1 - (t - 0.1) / 0.65;
      const live = Math.floor(c.now / 55) % 3;
      const rand = srand(c.seed ^ 0x9803);
      for (let k = 0; k < 3; k++) {
        const ox = (rand() - 0.5) * sc * 0.2;
        const kink = (rand() - 0.5) * sc * 0.12;
        if (k !== live) continue;
        ctx.globalAlpha = 0.9 * et;
        ctx.strokeStyle = k % 2 === 0 ? st.spark : st.core;
        ctx.lineWidth = Math.max(1, sc * 0.028);
        ctx.beginPath();
        ctx.moveTo(px2 + ox, py2 - lift * 0.9);
        ctx.lineTo(px2 + ox + kink, py2 - lift * 0.45);
        ctx.lineTo(px2 + ox * 0.3, py2);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.9, 0.3 * (1 - t));
  },
};

// --------------------------------------------------------- kings_bane

/**
 * KINGS_BANE — "the fallen crown."
 * Regicide, notarized: the dash crosses the room as a dashed rumor
 * line, and at the landing a small gold crown appears over the
 * strike, TIPS, and falls — coming to rest on its side in the turf,
 * one point catching the light — while a thin red thread creeps out
 * from under its rim. History, in one prop.
 */
const kings_bane: AbilitySig = {
  spawn(c: SigCtx) {
    // The landing scatters gold — a treasury opened the hard way.
    const rand = srand(c.seed ^ 0x9901);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx2, c.wy2 - 0.4, 1, [c.st.spark, c.st.mid], {
        speed: 1.8, life: 0.4, size: 0.06, gravity: 6,
        dir: rand() * Math.PI * 2, spread: 0.4, shape: 'shard', spin: 10,
      });
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const { len } = dashFrame(c);
    ctx.save();
    // The rumor: the crossing drawn as a dashed line that was never
    // quite a fact, gone before anyone can repeat it.
    if (len > 1 && t < 0.32) {
      ctx.globalAlpha = 0.5 * (1 - t / 0.32);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.setLineDash([sc * 0.14, sc * 0.12]);
      ctx.lineDashOffset = -c.now / 30;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px2, py2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // The thread: after the crown settles, a thin red line creeps
    // out from under its rim and beads at the head.
    if (t > 0.5) {
      const rand = srand(c.seed ^ 0x9902);
      const a = rand() * Math.PI * 2;
      const reach = Math.min(1, (t - 0.5) / 0.3);
      const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
      const L = sc * 0.5 * reach;
      const hx = px2 + Math.cos(a) * L;
      const hy = py2 + Math.sin(a) * L * squash;
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = '#8e2430';
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(px2, py2);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = '#6a1518';
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.045 * reach, sc * 0.045 * reach * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px2, py2 } = c;
    if (t < 0.05 || t > 0.92) return;
    const fade = t < 0.75 ? 1 : (0.92 - t) / 0.17;
    // The crown's arc: appear over the strike, tip past the point of
    // no return, drop, and lie where it lands.
    const tip = Math.min(1, Math.max(0, (t - 0.08) / 0.3)); // the topple
    const drop = tip * tip;
    const rot = tip * Math.PI * 0.55 + (tip >= 1 ? Math.sin((t - 0.38) * 40) * 0.06 * Math.max(0, 1 - (t - 0.38) / 0.2) : 0);
    const cy = py2 - sc * 0.95 + drop * sc * 0.95;
    const bw = sc * 0.17; // half band width
    const bh = sc * 0.1;
    ctx.save();
    ctx.translate(px2 + sc * 0.05 * tip, cy);
    ctx.rotate(rot);
    // The band, with its three points standing off the top edge.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(-bw, -bh, bw * 2, bh);
    for (let k = 0; k < 3; k++) {
      const bx = -bw + (k / 2) * bw * 2;
      ctx.beginPath();
      ctx.moveTo(bx - sc * 0.045, -bh);
      ctx.lineTo(bx, -bh - sc * 0.11);
      ctx.lineTo(bx + sc * 0.045, -bh);
      ctx.closePath();
      ctx.fill();
    }
    // The jewel line: a dark seat across the band.
    ctx.fillStyle = st.deep;
    ctx.fillRect(-bw * 0.7, -bh * 0.55, bw * 1.4, Math.max(1, bh * 0.2));
    // Once fallen, one point still catches the light — briefly, twice.
    if (tip >= 1) {
      const wink = Math.abs(Math.sin(c.now / 260));
      if (wink > 0.75) {
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = st.core;
        const g = Math.max(1.5, sc * 0.03);
        ctx.fillRect(bw * 0.95 - g / 2, -bh - sc * 0.11, g, g);
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- last_word

/**
 * LAST_WORD — "the full stop."
 * The sentence is short and the punctuation is permanent: the dash
 * hangs as a line of word-dashes that vanish in speaking order, the
 * arrival flashes one vertical cut — and then everything is still
 * except a single hard white period hanging at the cut's foot,
 * outliving every other mark on the screen. Said once. Over.
 */
const last_word: AbilitySig = {
  spawn(c: SigCtx) {
    const { ux, uy } = dashFrame(c);
    // The word carries: three clean white slivers past the stop.
    c.particles.burst(c.wx2, c.wy2 - 0.4, 3, [c.st.core, c.st.mid], {
      speed: 3.2, life: 0.24, size: 0.05, gravity: 1, dir: Math.atan2(uy, ux), spread: 0.2, shape: 'streak',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px2, py2, rPx } = c;
    // The stillness: one thin ring snaps out at once and then does
    // NOTHING — no growth, no pulse — until it quietly isn't there.
    if (t < 0.05) return;
    const R = Math.max(rPx, sc * 0.85);
    const fade = t < 0.55 ? 1 : Math.max(0, (0.9 - t) / 0.35);
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.ellipse(px2, py2, R, R * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const { ux, uy, len } = dashFrame(c);
    const lift = sc * 0.42;
    ctx.save();
    ctx.lineCap = 'butt';
    // The sentence: five word-dashes along the path, each vanishing
    // on its own clock in speaking order — words used up as said.
    if (len > 1) {
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      for (let k = 0; k < 5; k++) {
        const dieT = 0.08 + k * 0.11;
        if (t >= dieT) continue; // spoken — gone, no fade
        const f0 = k / 5 + 0.05;
        const f1 = (k + 1) / 5 - 0.05;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(px + ux * len * f0, py + uy * len * f0 - lift);
        ctx.lineTo(px + ux * len * f1, py + uy * len * f1 - lift);
        ctx.stroke();
      }
    }
    // The cut: one vertical white stroke at the arrival, closing to
    // nothing in a breath.
    if (t < 0.2) {
      const ct = 1 - t / 0.2;
      ctx.globalAlpha = 0.95 * ct;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.05 * ct + 1);
      ctx.beginPath();
      ctx.moveTo(px2, py2 - lift - sc * 0.65 * ct);
      ctx.lineTo(px2, py2 - lift + sc * 0.12);
      ctx.stroke();
    }
    // THE PERIOD: one hard white square at the cut's foot. It does
    // not move, does not flicker, and outlives everything else —
    // one clean twinkle at midlife, so you know it means it.
    if (t < 0.9) {
      ctx.globalAlpha = t < 0.7 ? 0.95 : 0.95 * (0.9 - t) / 0.2;
      ctx.fillStyle = st.core;
      const g = Math.max(2.5, sc * 0.06);
      ctx.fillRect(px2 - g / 2, py2 - lift + sc * 0.12 - g / 2, g, g);
      if (t > 0.48 && t < 0.56) {
        const gt = 1 - Math.abs(t - 0.52) / 0.04;
        ctx.globalAlpha = 0.9 * gt;
        const s = Math.max(1.5, sc * 0.028);
        ctx.fillRect(px2 - s / 2, py2 - lift + sc * 0.12 - s * 2.4, s, s * 4.8);
        ctx.fillRect(px2 - s * 2.4, py2 - lift + sc * 0.12 - s / 2, s * 4.8, s);
      }
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- registry

/** The rogue roster's signatures, keyed by ability id. */
export const ROGUE_SIGS: Record<string, AbilitySig> = {
  serpents_kiss,
  stinger,
  cold_snap,
  bone_needle,
  shadow_fang,
  crimson_tithe,
  pale_flame,
  spark_lash,
  kings_bane,
  last_word,
};
