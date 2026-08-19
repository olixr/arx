/**
 * THE SIGNATURE LAW — the twohand armory wave (THE ARMORY REMEMBERS).
 *
 * Twelve bespoke set-pieces for the warrior's secret arts, rebuilt
 * ground-up to the breath-wave bar and past it: every art now speaks
 * on THREE strata at once —
 *
 *   PRIMARY   the strike statement, painted inside the wire's life:
 *             2.5D volumes with side faces and foreshortened tops,
 *             crisp at scale, never blocky.
 *   SECONDARY what flies off: true-altitude matter (z, vz, zg) that
 *             arcs, bounces, and casts contact shadows on the way.
 *   TERTIARY  THE LASTING MARK — settled grains that lie where they
 *             fell for up to ~10 seconds, arranged in formations
 *             (a rubble arc, a windrow, a cooled seal) so the ground
 *             keeps a readable record long after the paint is gone.
 *
 * Same binding laws as fxSignatures.ts: hard edges, save/restore
 * hygiene, squash on the ground, srand-deterministic geometry,
 * frameDt-gated emission, ≤60 path ops per hook per frame. The
 * signature must SAY the mechanic. No centerpiece here repeats
 * another's, nor any of this file's former ones (the fault line, the
 * drinking circle, the tally gashes, the conceding plates, the opened
 * seam, the herringbone wake, the facet band, the crescent shatter,
 * the ringing flagstones, the lodged wedge, the planted banner, the
 * gilded return — all retired whole).
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
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point. Near-still, ground layer, long life (the ~10s tertiary
 * stratum; burst()'s own ×0.7–1.3 jitter keeps a formation from
 * dying as one). Every art's lingering record goes through here so
 * the budget stays legible: a cast lays a few dozen grains at most.
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: { life?: number; size?: number; fade?: string; fadeAt?: number; fade2?: string; fade2At?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.06, life: opts.life ?? 8.5, size: opts.size ?? 0.07,
    gravity: 0, drag: 4, layer: 'ground',
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

/**
 * HEAVY_SLAM — "the quarry step."
 * The overhead blow does not scratch the ground — it LOWERS it. A
 * half-moon terrace drops out of the grade across the swing's face:
 * a curved riser wall in shadow, a floor a full step down catching
 * flat light. The maul-head that did it falls as a two-plane iron
 * mass, and the rim it bit off leaves as real clods — thrown on true
 * arcs, bouncing, and lying along the bite in a rubble crescent that
 * outstays the paint by ten seconds.
 */
const heavy_slam: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0x9a11);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.55;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.55;
    // The bite's spoil: heavy clods hurled the way the blow argues,
    // arcing with real altitude, bouncing dead, and LYING there.
    for (let k = 0; k < 8; k++) {
      const a = c.dir + (rand() - 0.5) * 1.5;
      c.particles.burst(hx, hy, 1, [c.st.mid, shade(c.st.deep, 8), c.st.deep], {
        speed: 1.6 + rand() * 1.8, life: 9, size: 0.105 + rand() * 0.06,
        gravity: 0, dir: a, spread: 0.24, shape: 'shard', spin: 7,
        z: 0.12, vz: 2.2 + rand() * 1.8, zg: 8.5, land: 'bounce', bounce: 0.4,
        layer: 'world', fade: shade(c.st.deep, -10), fadeAt: 0.3,
      });
    }
    // The rubble crescent: fines laid ON the bite's rim arc — the
    // terrace edge keeps a readable curve of crumb for ~10 s.
    for (let k = 0; k < 11; k++) {
      const a = c.dir - 0.85 + (k / 10) * 1.7;
      const rr = c.radius * (0.78 + (rand() - 0.5) * 0.12);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? shade(c.st.mid, -6) : c.st.deep,
        { life: 9.5, size: 0.065 + rand() * 0.04 });
    }
    // Dust breathes off the fresh riser and drifts.
    dust.deployments.gouge!(m, hx, hy, { dir: c.dir, scale: 0.9 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const reach = Math.min(1, t / 0.42); // the step tears open fast
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE STEP DOWN. Inner arc = where the old grade ends; the band
    // beyond it is the new, lower floor. Painted floor first (flat,
    // faintly lit — it faces the sky), then the riser wall (a curved
    // band in shadow: the step's SIDE FACE), then the broken rim.
    const a0 = dir - 0.88 * reach;
    const a1 = dir + 0.88 * reach;
    const rIn = rPx * 0.55;
    const rOut = rPx * 1.0;
    // The lowered floor: a filled annular fan, lit flat.
    ctx.globalAlpha = 0.68 * fade;
    ctx.fillStyle = shade(st.deep, 20);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rOut, rOut * squash, 0, a0, a1);
    ctx.ellipse(c.px, c.py, rIn, rIn * squash, 0, a1, a0, true);
    ctx.fill();
    // The riser: the cut wall drops away from the viewer — a thick
    // shadowed band hugging the inner arc, its lip catching light.
    ctx.globalAlpha = 0.92 * fade;
    ctx.strokeStyle = shade(st.deep, -26);
    ctx.lineWidth = Math.max(5, sc * 0.18);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rIn + sc * 0.08, (rIn + sc * 0.08) * squash, 0, a0, a1);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = shade(st.mid, 10);
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rIn, rIn * squash, 0, a0, a1);
    ctx.stroke();
    // The broken outer rim: a crumbling crest, notched not smooth —
    // short seeded dashes riding the outer arc.
    const rand = srand(c.seed ^ 0x9a12);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(3.2, sc * 0.08);
    for (let k = 0; k < 6; k++) {
      const ka = dir - 0.8 + (k / 5) * 1.6 + (rand() - 0.5) * 0.1;
      if (ka < a0 || ka > a1) continue;
      const kr = rOut * (0.97 + (rand() - 0.5) * 0.06);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, kr, kr * squash, 0, ka - 0.09, ka + 0.09);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    const p = groundPt(c, c.rPx * 0.55, dir);
    ctx.save();
    if (t < 0.38) {
      // The maul-head: a real iron mass falling — shadowed side face,
      // foreshortened lit top, a haft-line above it — with the fall
      // smeared behind it. Weight before noise.
      const k = t / 0.38;
      const drop = (1 - k) * (1 - k);
      const y = p.y - sc * 2.4 * drop;
      const w = sc * 0.68;
      const faceH = sc * 0.36;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = st.deep;
      ctx.fillRect(p.x - w * 0.22, y - faceH - sc * 0.8, w * 0.44, sc * 0.8);
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = shade(st.deep, -10);
      ctx.fillRect(p.x - w / 2, y - faceH, w, faceH);
      ctx.fillStyle = shade(st.deep, -24);
      ctx.fillRect(p.x - w / 2, y - sc * 0.045, w, sc * 0.045);
      ctx.fillStyle = shade(st.mid, 10);
      ctx.beginPath();
      ctx.ellipse(p.x, y - faceH, w / 2, sc * 0.15 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(p.x - w * 0.14, y - faceH - sc * 0.02, w * 0.18, sc * 0.05 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The falling head compresses the air under it: a thin lens.
      ctx.globalAlpha = 0.5 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, w * (0.5 + 0.3 * k), w * 0.22 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // The strike moment: one five-point star and a hard glow, then
      // the terrace inherits everything.
      const k = Math.max(0, 1 - (t - 0.38) / 0.3);
      if (k > 0) {
        ctx.globalAlpha = 0.95 * k;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, p.x, p.y, sc * (0.5 + (1 - k) * 0.25), sc * 0.18, 5, c.now / 340, squash);
        ctx.fill();
        c.glow(c.wx + Math.cos(dir) * c.radius * 0.55, c.wy + Math.sin(dir) * c.radius * 0.55, 1.4, 0.8 * k);
      }
      // Grit pops off the fresh riser while it sheds.
      if (Math.random() < c.frameDt * 10) {
        dust.deployments.kick!(asMatter(c),
          c.wx + Math.cos(dir) * c.radius * 0.6,
          c.wy + Math.sin(dir) * c.radius * 0.6, { scale: 0.22 });
      }
    }
    ctx.restore();
  },
};

/**
 * BLOODLUST — "the vein tree."
 * The loan is written on the body: a red thread climbs from a
 * tightening foot-ring up the centerline, forks at the waist into
 * both arms, and ignites the fists — the hands that will collect.
 * The sworn ground drinks too: for seconds after the rite the spot
 * keeps a falling drip off each fist, and the spatter lies in a dark
 * halo where you stood.
 */
const bloodlust: AbilitySig = {
  spawn(c) {
    // The wound-tax, prepaid: a slow drip off each fist keeps
    // falling at the sworn spot after the paint is gone — the
    // library's wound-that-keeps-giving, one per hand.
    const m = asMatter(c);
    blood.deployments.drip!(m, c.wx - 0.4, c.wy, { dur: 3.6, scale: 1.1 });
    blood.deployments.drip!(m, c.wx + 0.4, c.wy, { dur: 3.6, scale: 1.1 });
    // The halo that outlasts the rite: dried flecks in a loose ring
    // (the library's dried-blood palette, lying still).
    const rand = srand(c.seed ^ 0xb10);
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const rr = 0.35 + rand() * 0.5;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? '#63201a' : '#421410',
        { life: 9, size: 0.06 + rand() * 0.035 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t >= 0.55) return;
    // The price paid down: a thin double ring TIGHTENS onto the feet
    // and goes under — the circle the vein tree grows from.
    const k = t / 0.55;
    const rr = sc * (1.0 - k * 0.58);
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - k * 0.35);
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(3.6, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * (1 - k * 0.25);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.4, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.88, rr * 0.88 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xb11);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE VEIN TREE. Root at the feet, trunk up the centerline,
    // forks at the waist to both fists plus the sternum. Each limb
    // is a dark bed under a bright red thread, drawn segment by
    // segment as the rite climbs — kinked like a vessel, not ruled.
    const waistY = py - sc * 0.62;
    const chestY = py - sc * 0.98;
    const handY = py - sc * 0.7;
    const seg = (
      x0: number, y0: number, x1: number, y1: number,
      from: number, to: number, kinks: number, salt: number,
    ): void => {
      const grow = Math.min(1, Math.max(0, (t - from) / (to - from)));
      if (grow <= 0) return;
      const r2 = srand(c.seed ^ salt);
      const n = kinks + 1;
      const reach = grow * n;
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = pass === 0 ? 0.72 : 0.97;
        ctx.strokeStyle = pass === 0 ? shade(st.deep, -12) : st.mid;
        ctx.lineWidth = Math.max(pass === 0 ? 4 : 2.2, sc * (pass === 0 ? 0.105 : 0.052));
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (let k = 1; k <= n; k++) {
          if (k > reach) break;
          const f = k / n;
          const kink = k === n ? 0 : (r2() - 0.5) * sc * 0.11;
          ctx.lineTo(x0 + (x1 - x0) * f + kink, y0 + (y1 - y0) * f);
        }
        // The growing tip, mid-segment.
        if (reach < n && reach > 0) {
          const f1 = reach / n;
          ctx.lineTo(x0 + (x1 - x0) * f1, y0 + (y1 - y0) * f1);
        }
        ctx.stroke();
      }
    };
    seg(px, py, px, waistY, 0.04, 0.3, 2, 0x1a);
    seg(px, waistY, px - sc * 0.5, handY, 0.3, 0.52, 2, 0x1b);
    seg(px, waistY, px + sc * 0.5, handY, 0.32, 0.54, 2, 0x1c);
    seg(px, waistY, px, chestY, 0.3, 0.46, 1, 0x1d);
    // The sternum takes the vow: one dark-cored star, flaring once.
    if (t > 0.46) {
      const k = Math.min(1, (t - 0.46) / 0.12);
      const held = t < 0.8 ? 1 : (1 - t) / 0.2;
      ctx.globalAlpha = 0.95 * k * held;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px, chestY, sc * 0.24 * k, sc * 0.085, 5, c.now / 500, 1);
      ctx.fill();
      ctx.fillStyle = shade(st.deep, -16);
      const g = sc * 0.075;
      ctx.fillRect(px - g / 2, chestY - g / 2, g, g);
    }
    // The fists ignite — twin red diamonds breathing on the pulse,
    // shedding one falling bead per beat (the paint's own drip; the
    // emitters keep it going after this hook dies).
    if (t > 0.52) {
      const held = t < 0.8 ? 1 : (1 - t) / 0.2;
      const pulse = 0.8 + 0.2 * Math.sin(c.now / 110);
      for (let s = 0; s < 2; s++) {
        const hx = px + (s === 0 ? -1 : 1) * sc * 0.5;
        const g = sc * 0.14 * pulse;
        ctx.globalAlpha = 0.6 * held;
        ctx.fillStyle = shade(st.deep, -10);
        ctx.beginPath();
        ctx.moveTo(hx, handY - g * 1.5);
        ctx.lineTo(hx + g * 1.5, handY);
        ctx.lineTo(hx, handY + g * 1.5);
        ctx.lineTo(hx - g * 1.5, handY);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.97 * held;
        ctx.fillStyle = s === 0 ? st.spark : st.mid;
        ctx.beginPath();
        ctx.moveTo(hx, handY - g);
        ctx.lineTo(hx + g, handY);
        ctx.lineTo(hx, handY + g);
        ctx.lineTo(hx - g, handY);
        ctx.closePath();
        ctx.fill();
      }
      c.glow(c.wx, c.wy, 0.75, 0.3 * held);
    }
    ctx.restore();
  },
};

/**
 * TWIN_STRIKE — "the shaft that stays."
 * Each of the two heavy shafts is scored where it LANDS: the flight
 * arrives as one long strobe streak, the punch-through opens a pair
 * of chevrons past the wound, and the shaft itself stands buried at
 * a low angle — fletching up, quivering to stillness, its shadow
 * honest beneath it. Splinters ride the lane out and lie in a line
 * that marks the through-shot for seconds.
 */
const twin_strike: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x7a1);
    const a = rand() * Math.PI * 2;
    // Punch-through: slivers continue PAST the wound along the lane,
    // low and fast, dying quick...
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.spark, c.st.mid], {
        speed: 3 + rand() * 1.6, life: 0.35, size: 0.06,
        gravity: 0, dir: a, spread: 0.16, shape: 'streak',
        z: 0.3, vz: 0.4, zg: 4, land: 'die', layer: 'world',
      });
    }
    // ...and the lane's record: pale splinter grains laid in a line
    // beyond the wound, plus a dark entry pair — the through-shot
    // stays readable on the ground.
    for (let k = 0; k < 6; k++) {
      const d = 0.3 + k * 0.22 + rand() * 0.08;
      lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d,
        k % 2 === 0 ? shade(c.st.mid, 14) : c.st.deep,
        { life: 7.5, size: 0.055 + rand() * 0.03 });
    }
    lay(c, c.wx - Math.cos(a) * 0.12, c.wy - Math.sin(a) * 0.12, shade(c.st.deep, -10), { life: 9, size: 0.085 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x7a1);
    const a = rand() * Math.PI * 2;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // The entry slit: a short parted groove where the shaft went in —
    // dark gap, one lit lip — pointing down the lane.
    const nx = -Math.sin(a);
    const ny = Math.cos(a) * squash;
    const L = sc * 0.34;
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = shade(st.deep, -18);
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(a) * L * 0.4 + nx * sc * 0.035, py - Math.sin(a) * L * 0.4 * squash + ny * sc * 0.035);
    ctx.lineTo(px + Math.cos(a) * L + nx * sc * 0.02, py + Math.sin(a) * L * squash + ny * sc * 0.02);
    ctx.lineTo(px + Math.cos(a) * L - nx * sc * 0.02, py + Math.sin(a) * L * squash - ny * sc * 0.02);
    ctx.lineTo(px - Math.cos(a) * L * 0.4 - nx * sc * 0.035, py - Math.sin(a) * L * 0.4 * squash - ny * sc * 0.035);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(a) * L * 0.4 + nx * sc * 0.045, py - Math.sin(a) * L * 0.4 * squash + ny * sc * 0.045);
    ctx.lineTo(px + Math.cos(a) * L + nx * sc * 0.03, py + Math.sin(a) * L * squash + ny * sc * 0.03);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x7a1);
    const a = rand() * Math.PI * 2;
    const ca = Math.cos(a);
    const sn = Math.sin(a) * squash;
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.09) {
      // The arrival strobe: the whole flight in one frame-burn — a
      // long incoming lane streak with a bright head.
      const k = 1 - t / 0.09;
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px - ca * sc * 2.6, py - sn * sc * 2.6 - sc * 0.5);
      ctx.lineTo(px, py - sc * 0.14);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(px - ca * sc * 1.4, py - sn * sc * 1.4 - sc * 0.3);
      ctx.lineTo(px, py - sc * 0.14);
      ctx.stroke();
    }
    // The entry star: brief, hard.
    if (t < 0.16) {
      const k = 1 - t / 0.16;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.12, sc * 0.3, sc * 0.11, 4, a, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.9, 0.55 * k);
    }
    // The punch-through: two chevrons OPEN past the wound, walking
    // out along the lane — the line gave, the shaft didn't.
    for (let k = 0; k < 2; k++) {
      const ck = Math.min(1, Math.max(0, (t - 0.06 - k * 0.07) / 0.22));
      if (ck <= 0 || ck >= 1) continue;
      const d = sc * (0.5 + k * 0.34 + ck * 0.5);
      const hx = px + ca * d;
      const hy = py + sn * d - sc * 0.22;
      const w = sc * (0.22 - k * 0.05);
      ctx.globalAlpha = (1 - ck) * 0.95;
      ctx.strokeStyle = k === 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      ctx.beginPath();
      ctx.moveTo(hx - ca * w - -Math.sin(a) * w, hy - sn * w - Math.cos(a) * w * squash);
      ctx.lineTo(hx, hy);
      ctx.lineTo(hx - ca * w + -Math.sin(a) * w, hy - sn * w + Math.cos(a) * w * squash);
      ctx.stroke();
    }
    // THE SHAFT THAT STAYS: buried at a low angle at the wound —
    // head in the ground, fletching up — quivering to stillness.
    if (t > 0.09) {
      const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
      const still = Math.min(1, (t - 0.09) / 0.34);
      const quiver = Math.sin(c.now / 24) * sc * 0.05 * (1 - still) * (1 - still);
      const bx = px;
      const by = py;
      const tailX = bx - ca * sc * 0.85 + quiver * -sn;
      const tailY = by - sn * sc * 0.85 - sc * 0.95 + quiver * ca * 0.4;
      // Contact shadow under the standing tail.
      ctx.globalAlpha = 0.3 * fade;
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(bx - ca * sc * 0.3, by - sn * sc * 0.3, sc * 0.16, sc * 0.07 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shaft: dark bed stroke under a wood body line.
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(3.6, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx, by - sc * 0.05);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(bx, by - sc * 0.05);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      // Fletching: two vanes and the nock, riding the quiver.
      const va = Math.atan2(tailY - (by - sc * 0.05), tailX - bx);
      const vx = Math.cos(va);
      const vy = Math.sin(va);
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;
        ctx.globalAlpha = (s === 0 ? 0.97 : 0.8) * fade;
        ctx.fillStyle = s === 0 ? st.spark : shade(st.mid, -12);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tailX - vx * sc * 0.26 + -vy * sc * 0.15 * side, tailY - vy * sc * 0.26 + vx * sc * 0.15 * side);
        ctx.lineTo(tailX - vx * sc * 0.38, tailY - vy * sc * 0.38);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = st.core;
      const g = Math.max(2.6, sc * 0.06);
      ctx.fillRect(tailX - g / 2, tailY - g / 2, g, g);
    }
    ctx.restore();
  },
};

/**
 * EARTHBREAKER — "the crown of earth."
 * The verdict lands and the ground answers UP: a full circle of
 * standing earth sheets leaps around the landing — a splash crown in
 * soil, each sheet a lit face over a shadowed side — hangs one
 * breath, and tears into falling clumps. The clods ride true arcs
 * out and lie in a rubble ring around the crater for ten seconds:
 * the landing's own monument.
 */
const earthbreaker: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xeb1);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 1.2 });
    // The crown's spoil: clods thrown outward all around, arcing,
    // bouncing, resting in a ring beyond the crater.
    for (let k = 0; k < 13; k++) {
      const a = (k / 13) * Math.PI * 2 + rand() * 0.3;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.4, c.wy + Math.sin(a) * c.radius * 0.4,
        1, [c.st.mid, shade(c.st.deep, 10), c.st.deep], {
          speed: 1.2 + rand() * 1.4, life: 9.5, size: 0.07 + rand() * 0.05,
          gravity: 0, dir: a, spread: 0.2, shape: 'shard', spin: 6,
          z: 0.2, vz: 2.6 + rand() * 2, zg: 8, land: 'bounce', bounce: 0.35,
          layer: 'world', fade: shade(c.st.deep, -12), fadeAt: 0.25,
        });
    }
    // The slow column off the settlement.
    dust.deployments.billow!(m, c.wx, c.wy, { radius: 0.4, dur: 1.2, scale: 0.85 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (c.kind === 'dash') {
      // The verdict comes down: its shadow SHARPENS — wide and thin
      // at the leap's top, small and black at the end.
      ctx.save();
      const rr = sc * (0.85 - t * 0.45);
      ctx.globalAlpha = 0.2 + 0.35 * t;
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(c.px2, c.py2, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // Grass leans away from what is coming.
      const rand = srand(c.seed ^ 0xeb2);
      ctx.globalAlpha = 0.5 * t;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const r0 = rr * (1.15 + rand() * 0.4);
        ctx.beginPath();
        ctx.moveTo(c.px2 + Math.cos(a) * r0, c.py2 + Math.sin(a) * r0 * squash);
        ctx.lineTo(c.px2 + Math.cos(a) * (r0 + sc * 0.14), c.py2 + Math.sin(a) * (r0 + sc * 0.14) * squash);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (c.kind !== 'blast') return;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // The crater: a sunken heart under a raised rim bead — the rim
    // bead LIT on the far side, dark on the near (a bowl, read once).
    ctx.globalAlpha = 0.65 * fade;
    ctx.fillStyle = shade(st.deep, -16);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.34, rPx * 0.34 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = shade(st.mid, 12);
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.02, rPx * 0.38, rPx * 0.38 * squash, 0, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();
    ctx.strokeStyle = shade(st.deep, -24);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.02, rPx * 0.38, rPx * 0.38 * squash, 0, Math.PI * 0.06, Math.PI * 0.94);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.4 * fade);
  },
  air(c) {
    if (c.kind === 'dash') return;
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0xeb3);
    ctx.save();
    // THE CROWN. Seven earth sheets stand in a circle: rise fast,
    // hang, then TEAR — the top half of each breaks off and falls as
    // a painted clump with true squash arcs, while the stump sinks.
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (c.seed % 5) * 0.25;
      const p = groundPt(c, c.rPx * 0.5, a);
      const stagger = k * 0.03;
      const rise = Math.min(1, Math.max(0, (t - stagger) / 0.2));
      if (rise <= 0) continue;
      const hang = Math.min(1, Math.max(0, (t - 0.24 - stagger) / 0.2));
      const tear = Math.min(1, Math.max(0, (t - 0.44 - stagger) / 0.34));
      const w = sc * (0.24 + rand() * 0.08);
      const hFull = sc * (0.5 + rand() * 0.2) * rise;
      const stumpH = hFull * (1 - 0.55 * tear);
      // The sheet's shadowed side sliver, then the lit face, then a
      // torn top edge.
      ctx.globalAlpha = 0.92 * (1 - tear * 0.6);
      ctx.fillStyle = shade(st.deep, -14);
      ctx.fillRect(p.x - w * 0.62, p.y - stumpH, w * 0.24, stumpH);
      ctx.fillStyle = shade(st.mid, 6);
      ctx.fillRect(p.x - w * 0.38, p.y - stumpH, w, stumpH);
      ctx.fillStyle = shade(st.mid, 22);
      ctx.fillRect(p.x - w * 0.38, p.y - stumpH, w, Math.max(1.5, sc * 0.03));
      // The torn clump: the sheet's crown breaks off and falls out
      // and down, tumbling.
      if (tear > 0 && tear < 1) {
        const fx = p.x + Math.cos(a) * sc * 0.3 * tear;
        const fy = p.y - hFull - sc * 0.1 + (tear * tear) * sc * 0.9;
        const rot = tear * 3 * (k % 2 === 0 ? 1 : -1);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.95 * (1 - tear * 0.5);
        ctx.fillStyle = shade(st.deep, -6);
        ctx.fillRect(-w * 0.4, -sc * 0.09, w * 0.8, sc * 0.18);
        ctx.fillStyle = shade(st.mid, 14);
        ctx.fillRect(-w * 0.4, -sc * 0.09, w * 0.8, sc * 0.07);
        ctx.restore();
      }
      void hang;
    }
    // The landing flash: one wide, low star the instant of arrival.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, c.px, c.py, sc * 0.6, sc * 0.2, 6, c.now / 380, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.6, 0.85 * k);
    }
    ctx.restore();
  },
};

/**
 * REND — "the three hooks."
 * Tear the wound wide: three curved claw-rakes stamp across the arc
 * face in fast succession, each flushing from white to wound-red,
 * their low tips beading. The bleed is the story: drops fall with
 * real altitude and SPLAT, an after-drip keeps falling once the
 * paint is gone, and the spatter lies under the swing in a dark
 * triple line for ten seconds.
 */
const rend: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4e1);
    const m = asMatter(c);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.68;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.68;
    // The tear leaves along the blow, and the wound keeps giving —
    // both the library's voice: a directed spray, then an after-drip
    // that outlives the paint.
    blood.deployments.spray!(m, hx, hy, { dir: c.dir, scale: 1.05 });
    blood.deployments.drip!(m, hx, hy, { dur: 2.6, scale: 1.1 });
    // The triple line: spatter laid under the three rakes' chords.
    const nx = -Math.sin(c.dir);
    const ny = Math.cos(c.dir);
    for (let row = 0; row < 3; row++) {
      const off = (row - 1) * 0.2;
      for (let k = 0; k < 3; k++) {
        const along = (k - 1) * 0.24 + (rand() - 0.5) * 0.1;
        lay(c,
          hx + nx * along + Math.cos(c.dir) * off,
          hy + ny * along + Math.sin(c.dir) * off,
          k === 1 ? '#63201a' : '#421410',
          { life: 9.5, size: 0.06 + rand() * 0.032 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    // Fast nick row: three short parted ticks under the swing — the
    // paint's brief note; the laid spatter carries the memory.
    if (t < 0.2) return;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const p = groundPt(c, rPx * 0.68, dir);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    ctx.lineCap = 'butt';
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * sc * 0.2;
      const grown = Math.min(1, Math.max(0, (t - 0.2 - k * 0.06) / 0.1));
      if (grown <= 0) continue;
      ctx.globalAlpha = 0.8 * fade * grown;
      ctx.strokeStyle = k === 1 ? shade(st.deep, -16) : shade(st.deep, -8);
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(dir) * off - nx * sc * 0.2 * grown, p.y + Math.sin(dir) * off * squash - ny * sc * 0.2 * grown);
      ctx.lineTo(p.x + Math.cos(dir) * off + nx * sc * 0.2 * grown, p.y + Math.sin(dir) * off * squash + ny * sc * 0.2 * grown);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const p = groundPt(c, rPx * 0.68, dir);
    const cy = p.y - sc * 0.45;
    const ta = Math.atan2(Math.sin(dir) * squash, Math.cos(dir)) + Math.PI / 2;
    const ca = Math.cos(ta);
    const sn = Math.sin(ta);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE THREE HOOKS: J-shaped rakes stamped in succession across
    // the face — each a dark bed under a bright thread that flushes
    // white → red as it ages, its tip curling under.
    for (let k = 0; k < 3; k++) {
      const born = 0.04 + k * 0.09;
      const kk = Math.min(1, Math.max(0, (t - born) / 0.08));
      if (kk <= 0) continue;
      const age = Math.min(1, Math.max(0, (t - born) / 0.5));
      const off = (k - 1) * sc * 0.32;
      const hx = p.x + ca * off;
      const hy = cy + sn * off * 0.6;
      const L = sc * 0.6 * kk;
      const hook = sc * 0.19 * kk;
      const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.6 : 0.95) * fade;
        ctx.strokeStyle = pass === 0
          ? shade(st.deep, -14)
          : age < 0.35 ? st.core : age < 0.7 ? st.spark : st.mid;
        ctx.lineWidth = Math.max(pass === 0 ? 4 : 2.4, sc * (pass === 0 ? 0.105 : 0.055));
        ctx.beginPath();
        ctx.moveTo(hx - ca * sc * 0.06, hy - L);
        ctx.lineTo(hx, hy);
        // The curl: the hook turns under at its low end.
        ctx.quadraticCurveTo(hx + ca * hook * 0.4, hy + hook * 0.8, hx - ca * hook, hy + hook * 0.55);
        ctx.stroke();
      }
      // The tip bead: swells as the rake ages.
      if (age > 0.3) {
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = '#b8352a';
        ctx.beginPath();
        ctx.ellipse(hx - ca * hook, hy + hook * 0.55, sc * 0.045 * age + 1.4, sc * 0.06 * age + 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The tear moment: one ragged flash as the third hook lands.
    if (t > 0.22 && t < 0.34) {
      const k = 1 - (t - 0.22) / 0.12;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, p.x, cy, sc * 0.28, sc * 0.1, 5, ta, 1);
      ctx.fill();
      c.glow(c.wx + Math.cos(dir) * c.radius * 0.68, c.wy + Math.sin(dir) * c.radius * 0.68, 0.7, 0.4 * k);
    }
    ctx.restore();
  },
};

/**
 * BULL_RUSH — "the bow wave."
 * The shoulder is a prow: a compressed air lens rides ahead of it,
 * and the world PEELS — two curling bow-crests break off the nose
 * left and right, while torn turf is flung to both sides on low
 * hops. What the argument leaves behind is two windrows of thrown
 * turf flanking an unmarked lane: the ground parted, and stayed
 * parted, for ten seconds.
 */
const bull_rush: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.6 });
    // The stop-stamp's record: a short fan of grains ahead of the
    // halt — the argument's period, laid down to stay.
    const rand = srand(c.seed ^ 0xbf1);
    for (let k = 0; k < 4; k++) {
      const a = ang + (rand() - 0.5) * 0.9;
      const d = 0.35 + rand() * 0.4;
      lay(c, c.wx2 + Math.cos(a) * d, c.wy2 + Math.sin(a) * d,
        k % 2 === 0 ? shade(c.st.mid, -6) : c.st.deep,
        { life: 8, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const ease = 1 - (1 - Math.min(1, t / 0.72)) ** 2;
    const ang = Math.atan2(py2 - py, px2 - px);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang) * squash;
    const hx = px + (px2 - px) * ease;
    const hy = py + (py2 - py) * ease;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // The V-wake: two short diverging crest lines living just behind
    // the head — the water-line of the charge. (The lane's lasting
    // record is the thrown turf, not paint.)
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? 1 : -1;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = s === 0 ? st.mid : shade(st.mid, -10);
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - Math.cos(ang - side * 0.5) * sc * 0.75, hy - Math.sin(ang - side * 0.5) * sc * 0.75 * squash);
      ctx.stroke();
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(3.5, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(hx - Math.cos(ang) * sc * 0.2 + nx * sc * 0.1 * side, hy - Math.sin(ang) * sc * 0.2 * squash + ny * sc * 0.1 * side);
      ctx.lineTo(hx - Math.cos(ang - side * 0.42) * sc * 1.05, hy - Math.sin(ang - side * 0.42) * sc * 1.05 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const ease = 1 - (1 - Math.min(1, t / 0.72)) ** 2;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const ang = Math.atan2(py2 - py, px2 - px);
    const hx = px + (px2 - px) * ease;
    const hy = py + (py2 - py) * ease - sc * 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE LENS: a standing sliver of compressed air ahead of the
    // shoulder — bright, upright, thinner the faster the charge.
    const speedK = 4 * ease * (1 - ease) + 0.15; // fastest mid-run
    const lx = hx + Math.cos(ang) * sc * 0.55;
    const ly = hy + Math.sin(ang) * sc * 0.55 * squash;
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.5, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(lx, ly, sc * 0.1 * (1.2 - speedK * 0.5), sc * 0.42, ang, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(lx, ly, sc * 0.07 * (1.2 - speedK * 0.5), sc * 0.34, ang, 0, Math.PI * 2);
    ctx.stroke();
    // THE PEEL: two bow-crests curling off the nose, redrawn each
    // frame at the head — S-curved ribbons with a lit outer edge.
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? 1 : -1;
      const pa = ang + side * 1.15;
      const cx1 = hx + Math.cos(pa) * sc * 0.42;
      const cy1 = hy + Math.sin(pa) * sc * 0.42 * squash + sc * 0.1;
      const cx2 = hx + Math.cos(pa + side * 0.7) * sc * 0.72;
      const cy2 = hy + Math.sin(pa + side * 0.7) * sc * 0.72 * squash + sc * 0.28;
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(4, sc * 0.11);
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(ang) * sc * 0.3, hy + Math.sin(ang) * sc * 0.3 * squash);
      ctx.quadraticCurveTo(cx1, cy1, cx2, cy2);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = s === 0 ? st.spark : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(ang) * sc * 0.3, hy + Math.sin(ang) * sc * 0.3 * squash - sc * 0.03);
      ctx.quadraticCurveTo(cx1, cy1 - sc * 0.03, cx2, cy2 - sc * 0.03);
      ctx.stroke();
    }
    // The halt: a forward-only quarter ring snaps where the argument
    // ends — no sneaking past the period.
    if (ease > 0.95 && t < 0.9) {
      // k is the halt ring's age, 1 at the stamp falling to 0. The ease
      // gate opens a hair BEFORE t reaches 0.72, so (t - 0.72) is
      // briefly negative and k briefly exceeds 1 — and the ring radius
      // below reads (1 - k), which then goes NEGATIVE and throws
      // IndexSizeError out of ctx.ellipse. The window is ~1.5 ms wide,
      // so the charge only ate a frame now and then. Clamped at BOTH
      // ends, which is what a normalized age always wanted to be.
      const k = Math.min(1, Math.max(0, 1 - (t - 0.72) / 0.18));
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px2, py2, sc * (0.4 + (1 - k) * 0.5), sc * (0.4 + (1 - k) * 0.5) * squash, 0, ang - 0.7, ang + 0.7);
      ctx.stroke();
      c.glow(c.wx2, c.wy2, 1, 0.45 * k);
    }
    ctx.restore();
    // THE WINDROWS: turf torn out sideways all along the run — low
    // hops to both flanks, settling into two long-lived lines that
    // flank the lane.
    if (t < 0.72 && Math.random() < c.frameDt * 26) {
      const wxh = c.wx + (c.wx2 - c.wx) * ease;
      const wyh = c.wy + (c.wy2 - c.wy) * ease;
      const side = Math.random() < 0.5 ? 1 : -1;
      c.particles.burst(wxh, wyh, 1, [st.mid, shade(st.deep, 6), st.deep], {
        speed: 1.1 + Math.random() * 0.8, life: 8, size: 0.075,
        gravity: 0, dir: ang + side * (Math.PI / 2) + (Math.random() - 0.5) * 0.4,
        spread: 0.2, shape: 'shard', spin: 6,
        z: 0.05, vz: 1.2 + Math.random() * 0.9, zg: 7.5,
        land: 'bounce', bounce: 0.3, layer: 'world',
        fade: shade(st.deep, -12), fadeAt: 0.3,
      });
    }
  },
};

/**
 * WARCRY — "the risen hoop."
 * The shout strikes the ground first — and the ground gives it
 * back as armor: one gold hoop leaps off the earth and CLIMBS the
 * body, wide at the shoulders, narrow at the crown, sealing above
 * the head in a crown-flash. Gold glints shake off the climb and
 * dust the ground where the vow was taken.
 */
const warcry: AbilitySig = {
  spawn(c) {
    // The vow's dusting: faint gold laid around the stance.
    const rand = srand(c.seed ^ 0x3c1);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const rr = 0.25 + rand() * 0.45;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? c.st.spark : shade(c.st.mid, -8),
        { life: 6.5, size: 0.05 + rand() * 0.028 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t >= 0.3) return;
    // The shout SLAPS the ground: one hard pressure disc, radial
    // grass-flatten ticks, done — the hoop takes it from here.
    const k = t / 0.3;
    const ft = 1 - k;
    const rr = sc * (0.4 + k * 1.1);
    ctx.save();
    ctx.globalAlpha = 0.6 * ft;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(4, sc * 0.12 * ft + sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * ft;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.94, rr * 0.94 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    const rand = srand(c.seed ^ 0x3c2);
    ctx.globalAlpha = 0.65 * ft;
    ctx.strokeStyle = shade(st.deep, 8);
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * rr * 0.6, py + Math.sin(a) * rr * 0.6 * squash);
      ctx.lineTo(px + Math.cos(a) * rr * 0.92, py + Math.sin(a) * rr * 0.92 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    // THE RISEN HOOP: one band climbing the body's silhouette —
    // narrow at the ankles, widest at the shoulders, narrow at the
    // crown — deep bed, gold body, a white glint bead riding its rim.
    const climb = Math.min(1, Math.max(0, (t - 0.08) / 0.62));
    if (climb > 0 && climb < 1) {
      const y = py - sc * 1.5 * climb;
      // The silhouette's width at this height.
      const wAt = climb < 0.25
        ? 0.3 + climb * 1.4
        : climb < 0.62 ? 0.65 + (climb - 0.25) * 0.35 : 0.78 - (climb - 0.62) * 1.35;
      const rr = sc * wAt * 0.62;
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(5.5, sc * 0.17);
      ctx.beginPath();
      ctx.ellipse(px, y, rr * 1.04, rr * 0.34 * squash * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.97;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3.4, sc * 0.105);
      ctx.beginPath();
      ctx.ellipse(px, y, rr, rr * 0.34 * squash * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The glint bead laps the hoop as it climbs.
      const ba = c.now / 90;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      const g = Math.max(3.2, sc * 0.085);
      ctx.fillRect(px + Math.cos(ba) * rr - g / 2, y + Math.sin(ba) * rr * 0.34 * squash * 1.2 - g / 2, g, g);
      // Glints shake off the rim on gated beats.
      if (Math.random() < c.frameDt * 9) {
        c.particles.burst(c.wx, c.wy, 1, [st.spark, st.core], {
          speed: 0.5, life: 0.6, size: 0.06, gravity: 0, shape: 'glint',
          z: 1.5 * climb, vz: 0.3, zg: 3, land: 'die', layer: 'world', shadow: 0,
        });
      }
    }
    // The seal: the hoop closes above the crown in a crown-flash —
    // three points, read as a diadem, then a body-length shine.
    if (t > 0.72) {
      const k = Math.min(1, (t - 0.72) / 0.1);
      const held = t < 0.9 ? 1 : (1 - t) / 0.1;
      const cy = py - sc * 1.58;
      ctx.globalAlpha = 0.95 * k * held;
      ctx.fillStyle = st.core;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.5;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * sc * 0.26, cy + Math.sin(a) * sc * 0.13);
        ctx.lineTo(px + Math.cos(a) * sc * 0.46, cy + Math.sin(a) * sc * 0.3);
        ctx.lineTo(px + Math.cos(a + 0.24) * sc * 0.26, cy + Math.sin(a + 0.24) * sc * 0.13);
        ctx.closePath();
        ctx.fill();
      }
      // The finished vow: a faint full-height shimmer line down the
      // body — armor you can almost see.
      ctx.globalAlpha = 0.4 * held;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(px - sc * 0.3, py - sc * 1.3);
      ctx.lineTo(px - sc * 0.36, py - sc * 0.3);
      ctx.moveTo(px + sc * 0.3, py - sc * 1.3);
      ctx.lineTo(px + sc * 0.36, py - sc * 0.3);
      ctx.stroke();
      c.glow(c.wx, c.wy, 0.9, 0.4 * k * held);
    }
    ctx.restore();
  },
};

/**
 * STEEL_WAVE — "the strobe edge."
 * The hurled swing shows itself three times: a ghost before the
 * wound, the full edge AT it — biting in a grind-spark star — and a
 * fainter self past it, still spinning, still going. The bite leaves
 * a cooling line: hot grains laid along the through-lane that step
 * white → orange → black as they lie there.
 */
const steel_wave: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5e1);
    const a = rand() * Math.PI * 2;
    // Grind sparks: hot slivers fan off the bite, bounce once, die.
    for (let k = 0; k < 9; k++) {
      c.particles.burst(c.wx, c.wy, 1, ['#fff6e0', '#f0a45a'], {
        speed: 2.2 + rand() * 1.6, life: 0.7, size: 0.065,
        gravity: 0, dir: a + (rand() < 0.5 ? 0.6 : -0.6) + (rand() - 0.5) * 0.5,
        spread: 0.3, shape: 'streak', z: 0.25, vz: 1 + rand() * 1.2, zg: 9,
        land: 'bounce', bounce: 0.4, layer: 'world',
        fade: '#f0a45a', fadeAt: 0.4, fade2: '#7a4a2a', fade2At: 0.75,
      });
    }
    // THE COOLING LINE: grains along the through-lane that cool in
    // hard steps while they lie — the bite's brand.
    for (let k = 0; k < 7; k++) {
      const d = -0.2 + k * 0.18 + (rand() - 0.5) * 0.06;
      lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d,
        '#fff6e0', {
          life: 6.5, size: 0.058,
          fade: '#f0a45a', fadeAt: 0.12, fade2: '#4a3226', fade2At: 0.4,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x5e1);
    const a = rand() * Math.PI * 2;
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    // One clean shear groove along the lane — the edge's touch-down.
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(a) * sc * 0.45, py - Math.sin(a) * sc * 0.45 * squash);
    ctx.lineTo(px + Math.cos(a) * sc * 0.55, py + Math.sin(a) * sc * 0.55 * squash);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(a) * sc * 0.45 - Math.sin(a) * sc * 0.025, py - Math.sin(a) * sc * 0.45 * squash + Math.cos(a) * sc * 0.025);
    ctx.lineTo(px + Math.cos(a) * sc * 0.55 - Math.sin(a) * sc * 0.025, py + Math.sin(a) * sc * 0.55 * squash + Math.cos(a) * sc * 0.025);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x5e1);
    const a = rand() * Math.PI * 2;
    const ca = Math.cos(a);
    const sn = Math.sin(a) * squash;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE THREE STATIONS: before (ghost), at (full), past (going).
    // Each is the same short blade crescent, rotation advanced — a
    // strobe of one object, not three objects.
    const stations: Array<[number, number, number, number]> = [
      [-0.9, 0.0, 0.16, 0.45],  // offset tiles, born, dur, alpha
      [0.0, 0.1, 0.26, 1.0],
      [0.95, 0.3, 0.3, 0.55],
    ];
    for (let s = 0; s < 3; s++) {
      const [off, born, dur, alK] = stations[s]!;
      const k = Math.min(1, Math.max(0, (t - born) / dur));
      if (k <= 0 || k >= 1) continue;
      const bx = px + ca * sc * off;
      const by = py + sn * sc * off - sc * 0.42;
      const spin = a + t * 9 + s * 1.1;
      const R = sc * 0.46;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(spin);
      ctx.globalAlpha = (1 - k * 0.5) * alK * 0.65;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(4, sc * 0.11);
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.62, 0, -1.2, 1.2);
      ctx.stroke();
      ctx.globalAlpha = (1 - k * 0.4) * alK * 0.95;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.6, sc * 0.075);
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.62, 0, -1.1, 1.1);
      ctx.stroke();
      ctx.globalAlpha = (1 - k * 0.3) * alK;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.08, R * 0.68, 0, -0.95, 0.95);
      ctx.stroke();
      ctx.restore();
    }
    // The bite: at the middle station's landing, a hot star + glow.
    if (t > 0.1 && t < 0.24) {
      const k = 1 - (t - 0.1) / 0.14;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fff6e0';
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.42, sc * 0.44, sc * 0.16, 4, a, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1, 0.6 * k);
    }
    ctx.restore();
  },
};

/**
 * STAGGER_STOMP — "the ground swell."
 * The heel drives a traveling BULGE through the earth — a lit
 * leading slope, a shadowed trailing slope, a white crest — and
 * everything it passes under is knocked flat: seeded tufts and
 * stones tip over as the swell reaches them and stay down. Pebbles
 * hop in its wake and lie scattered for ten seconds; two ankle-high
 * jitter arcs say the legs it found went numb.
 */
const stagger_stomp: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 1 });
    // The heel print: five dark grains in a heel crescent, laid to
    // stay — the stomp signs its work.
    const rand = srand(c.seed ^ 0x571);
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 0.25 + (k / 4) * Math.PI * 0.5;
      lay(c, c.wx + Math.cos(a) * 0.2, c.wy + Math.sin(a) * 0.2,
        shade(c.st.deep, -12), { life: 9.5, size: 0.062 });
    }
    // Bolt whispers: two ankle arcs — the shock that steals stances.
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * 0.5, c.wy + Math.sin(a) * 0.5, 1, ['#e8e06a'], {
        shape: 'bolt', life: 0.5, size: 0.05, gravity: 0, layer: 'world',
        x2: c.wx + Math.cos(a + 1.2) * 0.7, y2: c.wy + Math.sin(a + 1.2) * 0.7,
        z: 0.12, z2: 0.12, boltRate: 12, boltBranch: 0.3,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x572);
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const crest = Math.min(1, t / 0.75); // the swell's radius fraction
    const rr = rPx * crest;
    ctx.save();
    // THE SWELL: three concentric bands travel together — shadowed
    // trailing slope (inner), white crest, lit leading slope (outer).
    // The ground is a wave for one breath.
    ctx.globalAlpha = 0.6 * fade * (1 - crest * 0.5);
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(5, sc * 0.16);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.88, rr * 0.88 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.97 * fade * (1 - crest * 0.3);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * fade * (1 - crest * 0.4);
    ctx.strokeStyle = shade(st.mid, 16);
    ctx.lineWidth = Math.max(3.5, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 1.1, rr * 1.1 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // THE TOPPLED FIELD: eight seeded tufts/stones. Upright until
    // the crest arrives; then each ROTATES flat away from center
    // over a beat and stays down.
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rf = 0.3 + rand() * 0.62;
      const isStone = rand() < 0.4;
      const p = groundPt(c, rPx * rf, a);
      const hitAt = rf * 0.75; // when the crest reaches this radius
      const tip = Math.min(1, Math.max(0, (t - hitAt) / 0.12));
      const h = sc * (isStone ? 0.14 : 0.23) * (1 + rand() * 0.4);
      const lean = tip * (Math.PI / 2) * 0.92;
      const lx = Math.cos(a) * Math.sin(lean);
      const ly = Math.sin(a) * Math.sin(lean) * squash;
      const upK = Math.cos(lean);
      ctx.globalAlpha = 0.9 * fade;
      if (isStone) {
        // A pebble: a small block that rocks over.
        ctx.fillStyle = shade(st.deep, tip > 0.5 ? -6 : 6);
        const g = h;
        ctx.fillRect(p.x + lx * h - g / 2, p.y + ly * h - g * 0.5 * upK - g * 0.25, g, g * (0.5 + 0.5 * upK));
      } else {
        // A tuft: three blades folding flat together.
        ctx.strokeStyle = tip > 0.5 ? shade(st.mid, -14) : st.mid;
        ctx.lineWidth = Math.max(2, sc * 0.046);
        for (let b = 0; b < 3; b++) {
          const bo = (b - 1) * sc * 0.035;
          ctx.beginPath();
          ctx.moveTo(p.x + bo, p.y);
          ctx.lineTo(p.x + bo + lx * h * 1.4, p.y + ly * h * 1.4 - h * 1.3 * upK);
          ctx.stroke();
        }
      }
      // The knock: one white tick the instant it goes over.
      if (tip > 0 && tip < 0.4) {
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = st.core;
        const g = Math.max(2, sc * 0.04);
        ctx.fillRect(p.x - g / 2, p.y - h - g / 2, g, g);
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The heel: a short, thick drop-bar and its print flash.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.save();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.fillRect(px - Math.max(4, sc * 0.11), py - sc * 0.9 * k, Math.max(8, sc * 0.22), sc * 0.9 * k);
      ctx.fillStyle = st.mid;
      ctx.fillRect(px - Math.max(2, sc * 0.055), py - sc * 0.9 * k, Math.max(4, sc * 0.11), sc * 0.9 * k);
      if (k < 0.6) {
        ctx.globalAlpha = (0.6 - k) * 1.6;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, py, sc * 0.4, sc * 0.14, 5, 0.3, squash);
        ctx.fill();
      }
      ctx.restore();
      c.glow(c.wx, c.wy, 1.1, 0.6 * (1 - k * 0.4));
    }
    // Pebbles hop in the crest's wake and LIE there.
    if (t < 0.7 && Math.random() < c.frameDt * 16) {
      const a = Math.random() * Math.PI * 2;
      const rf = Math.min(1, t / 0.75) * 0.9;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * rf, c.wy + Math.sin(a) * c.radius * rf,
        1, [st.mid, st.deep], {
          speed: 0.5, life: 8, size: 0.045, gravity: 0,
          z: 0.02, vz: 1 + Math.random() * 0.8, zg: 8,
          land: 'bounce', bounce: 0.4, layer: 'world',
          fade: shade(st.deep, -10), fadeAt: 0.25,
        });
    }
  },
};

/**
 * HEADSMAN_STROKE — "the black arc and the toll."
 * One clean stroke for those already kneeling: a near-black crescent
 * with a thin white edge sweeps the arc and stops DEAD — and from
 * the stopping point a single heavy toll-ring rolls out, slow and
 * gravid, the sentence pronounced. What stood in the arc is CUT:
 * pale severed slivers drift down and lie in a windrow along the
 * chord. No gore; the dignity is the terror.
 */
const headsman_stroke: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4ead);
    // The severed standing things: pale straw slivers lofted gently
    // along the arc, wobbling down, lying in a windrow.
    for (let k = 0; k < 9; k++) {
      const a = c.dir - 0.42 + (k / 8) * 0.84;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.68,
        c.wy + Math.sin(a) * c.radius * 0.68,
        1, ['#c8bb84', '#a89a6a', shade(c.st.mid, 10)], {
          speed: 0.35, life: 8.5, size: 0.075 + rand() * 0.035,
          gravity: 0, dir: a, spread: 0.5, shape: 'streak',
          z: 0.3 + rand() * 0.2, vz: 0.5 + rand() * 0.4, zg: 2.2,
          land: 'settle', layer: 'world', wobble: 0.5,
          fade: '#8a7d55', fadeAt: 0.5,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    if (t < 0.12) return;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // The severance chord: ONE clean line under the sweep — a thin
    // dark rule with a single lit lip. Nothing ragged; he is neat.
    const reach = Math.min(1, (t - 0.12) / 0.2);
    const a0 = dir - 0.42;
    const a1 = dir - 0.42 + 0.84 * reach;
    const p0 = groundPt(c, rPx * 0.68, a0);
    const p1 = groundPt(c, rPx * 0.68, a1);
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = shade(st.deep, -20);
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.032);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - sc * 0.03);
    ctx.lineTo(p1.x, p1.y - sc * 0.03);
    ctx.stroke();
    // THE TOLL on the ground: one heavy ring from the stop point,
    // slow, dark-rimmed, gone reluctantly.
    if (t > 0.34) {
      const tk = (t - 0.34) / 0.66;
      const stop = groundPt(c, rPx * 0.68, dir + 0.42);
      const rr = sc * (0.3 + tk * 1.5);
      ctx.globalAlpha = 0.8 * (1 - tk) * fade;
      ctx.strokeStyle = shade(st.deep, -16);
      ctx.lineWidth = Math.max(5, sc * 0.15 * (1 - tk * 0.5));
      ctx.beginPath();
      ctx.ellipse(stop.x, stop.y, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * (1 - tk) * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.ellipse(stop.x, stop.y, rr * 0.92, rr * 0.92 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    if (t < 0.34) {
      // THE BLACK ARC: a filled near-black crescent with a thin white
      // leading edge, sweeping — two motion ghosts trail it. It does
      // not decorate; it arrives.
      const k = t / 0.34;
      const sweep = dir - 0.42 + 0.84 * Math.min(1, k * 1.15);
      const cy = c.py - sc * 0.4;
      for (let g = 2; g >= 0; g--) {
        const ga = sweep - g * 0.14;
        if (ga < dir - 0.42) continue;
        const al = g === 0 ? 0.97 : g === 1 ? 0.45 : 0.22;
        ctx.globalAlpha = al;
        ctx.strokeStyle = '#2a2430';
        ctx.lineWidth = Math.max(6, sc * (0.21 - g * 0.04));
        ctx.beginPath();
        ctx.ellipse(c.px, cy, rPx * 0.68, rPx * 0.68 * squash, 0, ga - 0.3, ga + 0.02);
        ctx.stroke();
        if (g === 0) {
          ctx.globalAlpha = 0.97;
          ctx.strokeStyle = '#f4f6fa';
          ctx.lineWidth = Math.max(2.2, sc * 0.05);
          ctx.beginPath();
          ctx.ellipse(c.px, cy, rPx * 0.73, rPx * 0.73 * squash, 0, ga - 0.26, ga + 0.02);
          ctx.stroke();
        }
      }
    } else {
      // THE STOP. The blade holds dead-still one beat — a vertical
      // stillness line — then only the toll remains.
      const stop = groundPt(c, rPx * 0.68, dir + 0.42);
      if (t < 0.6) {
        const hold = 1 - (t - 0.34) / 0.26;
        ctx.globalAlpha = 0.85 * hold;
        ctx.strokeStyle = '#2a2430';
        ctx.lineWidth = Math.max(3, sc * 0.08);
        ctx.beginPath();
        ctx.moveTo(stop.x, stop.y - sc * 0.85);
        ctx.lineTo(stop.x, stop.y - sc * 0.08);
        ctx.stroke();
        ctx.globalAlpha = 0.95 * hold;
        ctx.strokeStyle = '#f4f6fa';
        ctx.lineWidth = Math.max(1.4, sc * 0.028);
        ctx.beginPath();
        ctx.moveTo(stop.x + sc * 0.035, stop.y - sc * 0.85);
        ctx.lineTo(stop.x + sc * 0.035, stop.y - sc * 0.08);
        ctx.stroke();
      }
      // THE TOLL in the air: one contracting counter-ring above the
      // stop — the bell heard, not seen. Executes read heavier: the
      // ring is darker-rimmed than any other art dares.
      const tk = Math.min(1, (t - 0.34) / 0.5);
      const rr = sc * (0.7 - tk * 0.45);
      ctx.globalAlpha = 0.75 * (1 - tk * 0.6);
      ctx.strokeStyle = shade(st.deep, -20);
      ctx.lineWidth = Math.max(3.5, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(stop.x, stop.y - sc * 0.55, rr, rr * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * (1 - tk * 0.5);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(stop.x, stop.y - sc * 0.55, rr * 0.9, rr * 0.54, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (t < 0.42) c.glow(c.wx + Math.cos(dir + 0.42) * c.radius * 0.68, c.wy + Math.sin(dir + 0.42) * c.radius * 0.68, 1, 0.5 * (1 - tk));
    }
    ctx.restore();
  },
};

/**
 * WARLORDS_DESCENT — "the unwound spiral."
 * The shout follows you down as a corkscrew ribbon around the
 * descent — and on landing it UNWINDS along the ground: a single-arm
 * gold spiral groove racing out from the crater to the rim, its tip
 * cracking a whip-flash, a low gold canopy snapping over the arrival.
 * Gold flecks lie along the spiral's path for ten seconds: the
 * banner planted in the dirt itself.
 */
const warlords_descent: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0xd51);
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.9 });
    // Clods out of the crater...
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy, 1, [c.st.deep, shade(c.st.deep, 10)], {
        speed: 1.4 + rand(), life: 8, size: 0.06, gravity: 0,
        dir: a, spread: 0.4, shape: 'shard', spin: 6,
        z: 0.15, vz: 2 + rand() * 1.4, zg: 8, land: 'bounce', bounce: 0.35,
        layer: 'world', fade: shade(c.st.deep, -12), fadeAt: 0.3,
      });
    }
    // ...and THE SPIRAL'S RECORD: gold flecks laid along the same
    // single-arm spiral the groove will race — after the paint dies,
    // the shape stays, lying in the grass.
    for (let k = 0; k < 12; k++) {
      const f = (k + 1) / 12;
      const a = f * Math.PI * 3.2 + (c.seed % 7);
      const rr = c.radius * (0.15 + 0.8 * f);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? c.st.core : c.st.spark,
        { life: 9, size: 0.055 + rand() * 0.025, fade: shade(c.st.mid, -10), fadeAt: 0.45 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (c.kind === 'dash') {
      // The muster call: a dashed ring BREATHES INWARD at the landing
      // mark — the ground summoned to attention before the arrival.
      ctx.save();
      const rr = sc * (1.1 - t * 0.55);
      ctx.globalAlpha = 0.6 * t;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.setLineDash([sc * 0.14, sc * 0.1]);
      ctx.lineDashOffset = -c.now / 30;
      ctx.beginPath();
      ctx.ellipse(c.px2, c.py2, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }
    if (c.kind !== 'blast') return;
    const fade = t < 0.62 ? 1 : (1 - t) / 0.38;
    const spiralK = Math.min(1, t / 0.55);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    // THE UNWOUND SPIRAL: one arm, center → rim, drawn as a station
    // polyline along the spiral — dark groove bed under a gold crest.
    const seed0 = c.seed % 7;
    const N = 16;
    const reach = Math.floor(N * spiralK);
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = (pass === 0 ? 0.78 : 0.95) * fade;
      ctx.strokeStyle = pass === 0 ? shade(st.deep, -12) : st.mid;
      ctx.lineWidth = Math.max(pass === 0 ? 4.4 : 2.6, sc * (pass === 0 ? 0.115 : 0.06));
      ctx.beginPath();
      for (let k = 0; k <= reach; k++) {
        const f = k / N;
        const a = f * Math.PI * 3.2 + seed0;
        const rr = rPx * (0.15 + 0.8 * f);
        const x = px + Math.cos(a) * rr;
        const y = py + Math.sin(a) * rr * squash;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // The racing tip: a whip-crack flash at the spiral's live end.
    if (spiralK < 1) {
      const f = spiralK;
      const a = f * Math.PI * 3.2 + seed0;
      const rr = rPx * (0.15 + 0.8 * f);
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, x, y, sc * 0.19, sc * 0.07, 4, a, squash);
      ctx.fill();
    }
    // The crater heart: modest — the spiral is the monument.
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.18, rPx * 0.18 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.4 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (c.kind === 'dash') {
      // The descending shout: two ribbon strands corkscrew the fall
      // line — short arc dashes at counter phases, gold over deep.
      const fx = px + (c.px2 - px) * t;
      const fy = py + (c.py2 - py) * t - sc * (1.25 - t) * 1.5;
      ctx.save();
      ctx.lineCap = 'butt';
      for (let s = 0; s < 2; s++) {
        const ph = c.now / 70 + s * Math.PI;
        const rr = sc * 0.3;
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = s === 0 ? st.spark : shade(st.mid, -8);
        ctx.lineWidth = Math.max(2.2, sc * 0.055);
        ctx.beginPath();
        ctx.ellipse(fx, fy, rr, rr * 0.4, 0.4, ph % (Math.PI * 2), (ph % (Math.PI * 2)) + 1.4);
        ctx.stroke();
      }
      ctx.restore();
      if (Math.random() < c.frameDt * 14) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * t, c.wy + (c.wy2 - c.wy) * t, 1, [st.spark, st.core], {
          speed: 0.5, life: 0.4, size: 0.06, gravity: 0, shape: 'glint',
          z: (1.25 - t) * 1.5, vz: -0.5, zg: 0, land: 'die', layer: 'world', shadow: 0,
        });
      }
      return;
    }
    if (c.kind !== 'blast') return;
    ctx.save();
    // The arrival canopy: a low gold half-shell SNAPS over the
    // landing — rim first, then gone — the shout made round.
    if (t < 0.2) {
      const k = t / 0.2;
      const R = sc * (0.5 + k * 0.55);
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.1, R, R * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = (1 - k * 0.6) * 0.95;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.1, R, R * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, 1.4, 0.7 * (1 - k));
    }
    // Banner glints climb off the unwinding spiral — the shout
    // rising back up while the ground takes the mark.
    if (t > 0.15 && t < 0.8 && Math.random() < c.frameDt * 12) {
      const f = Math.min(1, t / 0.55) * Math.random();
      const a = f * Math.PI * 3.2 + (c.seed % 7);
      c.particles.burst(c.wx + Math.cos(a) * c.radius * (0.15 + 0.8 * f), c.wy + Math.sin(a) * c.radius * (0.15 + 0.8 * f), 1, [st.spark, st.core], {
        speed: 0.2, life: 0.7, size: 0.055, gravity: 0, shape: 'glint',
        z: 0.05, vz: 1.4, zg: 0.5, land: 'none', layer: 'world', shadow: 0,
      });
    }
    ctx.restore();
    void squash;
  },
};

/**
 * OATHBOUND_EDGE — "the molten seal."
 * The sworn stroke stamps a crown-seal at the arc's height: a molten
 * gold disc with three crown points, pressed in a flash. The seal
 * SPENDS itself: drips run off its low edge and splat amber, the
 * caster's outline takes two warm pulses — the repayment — and the
 * seal's cooled image lies on the ground in settled amber grains,
 * stepping gold → amber → umber for ten seconds. The crown
 * remembers exactly where it was sworn.
 */
const oathbound_edge: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x0a7);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    // Molten drips off the stamped seal: true falls, amber splats.
    for (let k = 0; k < 4; k++) {
      c.particles.burst(hx + (rand() - 0.5) * 0.3, hy + (rand() - 0.5) * 0.2, 1, ['#ffe9a0', '#e8c04c'], {
        speed: 0.2, life: 1, size: 0.05, gravity: 0, shape: 'drop',
        z: 0.5 + rand() * 0.2, vz: -0.2, zg: 5, land: 'splat',
        layer: 'world', fade: '#c89a3c', fadeAt: 0.5, fade3: '#8a6a2e',
      });
    }
    // THE COOLED SEAL: grains laid in the seal's own image — a small
    // ring plus three crown points — cooling in hard steps as they
    // lie. The mark is legible as a crown for seconds.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      lay(c, hx + Math.cos(a) * 0.28, hy + Math.sin(a) * 0.28, '#ffe9a0', {
        life: 9.5, size: 0.055,
        fade: '#e8c04c', fadeAt: 0.18, fade2: '#8a6a2e', fade2At: 0.55,
      });
    }
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.85;
      lay(c, hx + Math.cos(a) * 0.42, hy + Math.sin(a) * 0.42, '#ffe9a0', {
        life: 10, size: 0.065,
        fade: '#e8c04c', fadeAt: 0.18, fade2: '#8a6a2e', fade2At: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    // The press-shadow: while the seal stamps above, its light falls
    // on the grass — a warm disc that arrives with the press and
    // cools off with the paint.
    if (t < 0.28) return;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const p = groundPt(c, rPx * 0.7, dir);
    ctx.save();
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, sc * 0.32, sc * 0.32 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, sc * 0.26, sc * 0.26 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx, px, py } = c;
    const p = groundPt(c, rPx * 0.7, dir);
    const cy = p.y - sc * 0.52;
    ctx.save();
    ctx.lineCap = 'butt';
    // The sworn stroke: one quick thin gold edge sweep — the pen,
    // not the point.
    if (t < 0.22) {
      const k = t / 0.22;
      const sweep = dir - 0.55 + 1.1 * k;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(3.2, sc * 0.08);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.4, rPx * 0.7, rPx * 0.7 * squash, 0, sweep - 0.35, sweep);
      ctx.stroke();
      ctx.globalAlpha = 0.97;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.4, rPx * 0.74, rPx * 0.74 * squash, 0, sweep - 0.28, sweep);
      ctx.stroke();
    }
    // THE SEAL STAMPS: a molten disc with three crown points pressed
    // at the arc's height — press flash, then stepwise cooling.
    if (t > 0.18) {
      const born = Math.min(1, (t - 0.18) / 0.08);
      const age = (t - 0.18) / 0.82;
      const R = sc * 0.42 * born;
      // Cooling in hard bands: white-gold → gold → amber.
      const body = age < 0.3 ? '#ffe9a0' : age < 0.65 ? '#e8c04c' : '#c89a3c';
      const rim = age < 0.3 ? '#fffdf2' : '#ffe9a0';
      ctx.globalAlpha = 0.6 * born;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.beginPath();
      ctx.ellipse(p.x + sc * 0.03, cy + sc * 0.04, R * 1.06, R * 1.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.97 * born;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(p.x, cy, R, R, 0, 0, Math.PI * 2);
      ctx.fill();
      // The crown: three points off the disc's brow.
      ctx.fillStyle = body;
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.75;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a - 0.22) * R * 0.9, cy + Math.sin(a - 0.22) * R * 0.9);
        ctx.lineTo(p.x + Math.cos(a) * R * 1.55, cy + Math.sin(a) * R * 1.55);
        ctx.lineTo(p.x + Math.cos(a + 0.22) * R * 0.9, cy + Math.sin(a + 0.22) * R * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = rim;
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.globalAlpha = 0.95 * born;
      ctx.beginPath();
      ctx.ellipse(p.x, cy, R * 0.82, R * 0.82, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The press flash.
      if (t < 0.34) {
        const k = Math.max(0, 1 - (t - 0.22) / 0.12);
        ctx.globalAlpha = 0.95 * k;
        ctx.fillStyle = '#fffdf2';
        ctx.beginPath();
        burstStarPath(ctx, p.x, cy, R * 1.7, R * 0.55, 6, c.now / 420, 1);
        ctx.fill();
        c.glow(c.wx + Math.cos(dir) * c.radius * 0.7, c.wy + Math.sin(dir) * c.radius * 0.7, 1, 0.6 * k);
      }
    }
    // THE REPAYMENT: two warm pulses contract onto the caster —
    // the oath paying the arm back, visible on the body.
    for (let k = 0; k < 2; k++) {
      const born = 0.45 + k * 0.25;
      const pk = (t - born) / 0.16;
      if (pk < 0 || pk > 1) continue;
      const rr = sc * (0.75 - pk * 0.45);
      ctx.globalAlpha = (1 - pk) * 0.85;
      ctx.strokeStyle = k === 0 ? st.spark : st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.55, rr, rr * squash * 1.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (pk > 0.8) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = st.core;
        const g = sc * 0.08;
        ctx.fillRect(px - g / 2, py - sc * 0.55 - g / 2, g, g);
      }
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- registry

/**
 * The twohand armory wave of THE SIGNATURE LAW — merged into the
 * master registry by the integrator. Keys are ability ids.
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
