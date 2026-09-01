/**
 * THE SIGNATURE LAW — the sword-secret roster (THE ARMORY REMEMBERS,
 * wave 3: the blade twenty) + the onehand breath wave.
 *
 * The twenty sword secrets rebuilt ground-up to the three-strata
 * bar — every art speaks on all three layers at once:
 *
 *   PRIMARY   the strike statement, painted inside the wire's life:
 *             2.5D volumes, side faces, foreshortened tops, crisp.
 *   SECONDARY what flies off: true-altitude matter — bark chips,
 *             torn leaves, forge spatter, a night-star's sparks.
 *   TERTIARY  THE LASTING MARK — settled grains lying in deliberate
 *             formations for ~6-10 s: a split round's pale faces, a
 *             wheel of weeping cuts, a cooling slag cake, a fallen
 *             star fragment glinting where it landed.
 *
 * Wire kinds served: the arc arts read c.dir; riptide/green_verse
 * ride 'dash' (heart = departure, far end = arrival); storm_brand
 * and sky_splits ride 'bolt' (far end = the strike, one fx per hop);
 * quicksilver's flurry arrives as three 'arc' beats (beat parity off
 * bornAt); starfall/slagfall land as 'blast' after their telegraphs;
 * the vow is a one-ceremony 'buff'. Binding laws as ever: hard
 * edges, save/restore hygiene, squash on ground y-radii, srand
 * determinism, frameDt-gated emission, ≤ ~60 path ops per hook per
 * frame. No centerpiece repeats another's, nor any of this file's
 * former ones (the kerf, the barb row, the mercury dart, the
 * undertow, the ember rind, the icicle fringe, the windrow, the
 * threshing ring, the seared sigil, the court rail, the thrown
 * shadows, the sky splash, the cinched knot, the sea takes its
 * turn, the word reads itself, the poured mouth, the bolt goes
 * visiting, the second bar, the session, the held breath — all
 * retired whole).
 *
 * FX v5 ONE-VOICE stands: water, fire, frost, storm, blood,
 * radiance, and dust speak through the MATTER LIBRARY; straw,
 * silver, kelp, star-stone, and script stay each art's own.
 */

import { shade } from './tint.js';
import { boltPath, burstStarPath, jaggedRingPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, blood, fire, frost, storm, water, radiance, smoke, shadow as gloom, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~10s tertiary stratum; burst()'s ×0.7–1.3 life jitter
 * keeps a formation from dying as one).
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: { life?: number; size?: number; flicker?: number; fade?: string; fadeAt?: number; fade2?: string; fade2At?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05, life: opts.life ?? 8.5, size: opts.size ?? 0.06,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

/**
 * SUNDERING_CHOP — "the split round."
 * The world is firewood and the committed cut proves it: the struck
 * ground SPLITS like a chopped log round — two half-moon slabs
 * lever apart from a dead-straight seam, each rising on its outer
 * edge to show a pale split face and a shadowed underside. Bark
 * chips fly on true arcs; the two pale faces stay printed on the
 * turf for nine seconds with the dark seam between them.
 */
const sundering_chop: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5c01);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    dust.deployments.gouge!(asMatter(c), hx, hy, { dir: c.dir, scale: 0.9 });
    // Bark chips: dark-topped slivers thrown to both flanks.
    for (let k = 0; k < 7; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(hx, hy, 1, [c.st.mid, shade(c.st.deep, 8), c.st.deep], {
        speed: 1.4 + rand() * 1.4, life: 8, size: 0.08 + rand() * 0.04,
        gravity: 0, dir: c.dir + side * (Math.PI / 2) + (rand() - 0.5) * 0.6,
        spread: 0.3, shape: 'shard', spin: 8,
        z: 0.15, vz: 1.8 + rand() * 1.6, zg: 8, land: 'bounce', bounce: 0.4,
        layer: 'world', fade: shade(c.st.deep, -10), fadeAt: 0.3,
      });
    }
    // The split's print: two pale half-moon faces + the dark seam.
    const nx = -Math.sin(c.dir);
    const ny = Math.cos(c.dir);
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? 1 : -1;
      for (let k = 0; k < 4; k++) {
        const along = (k / 3 - 0.5) * 0.7;
        lay(c, hx + Math.cos(c.dir) * along + nx * side * (0.18 + Math.abs(along) * -0.12),
          hy + Math.sin(c.dir) * along + ny * side * (0.18 + Math.abs(along) * -0.12),
          k % 2 === 0 ? shade(c.st.mid, 16) : c.st.mid,
          { life: 9, size: 0.06 });
      }
    }
    for (let k = 0; k < 3; k++) {
      const along = (k - 1) * 0.34;
      lay(c, hx + Math.cos(c.dir) * along, hy + Math.sin(c.dir) * along,
        shade(c.st.deep, -16), { life: 9.5, size: 0.055 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const p = pt(c, rPx * 0.6, dir);
    const open = Math.min(1, t / 0.3);
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    const L = sc * 0.72;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE TWO HALVES: each a half-moon slab levered off the seam —
    // pale split face toward the seam, outer edge lifted (a bright
    // rim), shadowed underside showing beneath the lift.
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? 1 : -1;
      const push = sc * 0.2 * open * side;
      // Underside shadow first (the levered slab floats off it).
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = shade(st.deep, -22);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(dir) * L + nx * push * 0.4, p.y - Math.sin(dir) * L * squash + ny * push * 0.4);
      ctx.quadraticCurveTo(p.x + nx * (push + sc * 0.4 * side) * 1.2, p.y + ny * (push + sc * 0.4 * side) * 1.2,
        p.x + Math.cos(dir) * L + nx * push * 0.4, p.y + Math.sin(dir) * L * squash + ny * push * 0.4);
      ctx.closePath();
      ctx.fill();
      // The slab: pale split face, half-moon.
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = s === 0 ? shade(st.mid, 14) : shade(st.mid, 6);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(dir) * L + nx * push, p.y - Math.sin(dir) * L * squash + ny * push);
      ctx.quadraticCurveTo(p.x + nx * (push + sc * 0.36 * side), p.y + ny * (push + sc * 0.36 * side),
        p.x + Math.cos(dir) * L + nx * push, p.y + Math.sin(dir) * L * squash + ny * push);
      ctx.closePath();
      ctx.fill();
      // The lifted outer rim catches light.
      ctx.globalAlpha = 0.95 * fade * open;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(dir) * L * 0.7 + nx * (push + sc * 0.22 * side), p.y - Math.sin(dir) * L * 0.7 * squash + ny * (push + sc * 0.22 * side));
      ctx.quadraticCurveTo(p.x + nx * (push + sc * 0.36 * side), p.y + ny * (push + sc * 0.36 * side),
        p.x + Math.cos(dir) * L * 0.7 + nx * (push + sc * 0.22 * side), p.y + Math.sin(dir) * L * 0.7 * squash + ny * (push + sc * 0.22 * side));
      ctx.stroke();
    }
    // THE SEAM: the dead-straight kill line between the halves.
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = shade(st.deep, -26);
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(dir) * L, p.y - Math.sin(dir) * L * squash);
    ctx.lineTo(p.x + Math.cos(dir) * L, p.y + Math.sin(dir) * L * squash);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const p = pt(c, rPx * 0.6, dir);
    ctx.save();
    // The committed edge: a tall steel wedge falls dead-vertical —
    // dark flat, lit flat, white edge — with its own fall smear.
    if (t < 0.3) {
      const k = t / 0.3;
      const drop = (1 - k) * (1 - k);
      const y = p.y - sc * 2.1 * drop;
      const bh = sc * 1.05;
      const bw = sc * 0.15;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = st.mid;
      ctx.fillRect(p.x - bw * 0.4, y - bh - sc * 0.5 * (1 - k), bw * 0.8, sc * 0.5 * (1 - k));
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.beginPath();
      ctx.moveTo(p.x - bw, y - bh);
      ctx.lineTo(p.x - bw * 0.5, y);
      ctx.lineTo(p.x, y + sc * 0.05);
      ctx.lineTo(p.x - bw * 0.15, y - bh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(p.x - bw * 0.15, y - bh);
      ctx.lineTo(p.x, y + sc * 0.05);
      ctx.lineTo(p.x + bw * 0.55, y);
      ctx.lineTo(p.x + bw * 0.5, y - bh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.fillRect(p.x + bw * 0.42, y - bh, Math.max(1.6, bw * 0.16), bh);
    } else if (t < 0.44) {
      // The bite star, once.
      const k = 1 - (t - 0.3) / 0.14;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y, sc * 0.48, sc * 0.17, 5, dir, squash);
      ctx.fill();
      c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 1.3, 0.75 * k);
    }
    ctx.restore();
  },
};

/**
 * THORN_LASH — "the growing whip."
 * The briar is ALIVE in the swing: a curling vine extends through
 * the arc with thorns budding behind its tip as it goes — then the
 * whole briar stiffens, dries from green to brown in hard steps,
 * and crumbles. Two thorns bead red and drip. What stays is the
 * briar's skeleton: a curved row of dark barbs lying in the arc.
 */
const thorn_lash: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x7401);
    // Torn leaf slips flutter off the lash.
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 0.5 + rand() * 1.0;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.75, c.wy + Math.sin(a) * c.radius * 0.75,
        1, ['#6f8a4a', '#4a5c30'], {
          speed: 0.4, life: 6, size: 0.07, gravity: 0,
          dir: a, spread: 0.7, shape: 'shard', spin: 4,
          z: 0.4, vz: 0.5, zg: 1.6, land: 'settle', layer: 'world', wobble: 0.7,
          fade: '#3a4626', fadeAt: 0.45,
        });
    }
    // Red bead drops off two thorns.
    for (let k = 0; k < 2; k++) {
      const a = c.dir - 0.3 + k * 0.6;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.78, c.wy + Math.sin(a) * c.radius * 0.78,
        1, ['#b8362a', '#8e2a20'], {
          speed: 0.1, life: 1.1, size: 0.05, gravity: 0, shape: 'drop',
          z: 0.45, vz: -0.2, zg: 4.5, land: 'splat', layer: 'world', fade3: '#421410',
        });
    }
    // THE BARB ROW SKELETON: dark hooked grains along the arc.
    for (let k = 0; k < 7; k++) {
      const a = c.dir - 0.55 + (k / 6) * 1.1;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.76, c.wy + Math.sin(a) * c.radius * 0.76,
        k % 2 === 0 ? shade(c.st.deep, -14) : '#3a4626',
        { life: 9, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    if (t < 0.15) return;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The lash's shade: a soft arc shadow under the hanging briar.
    ctx.save();
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(4, sc * 0.12);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.76, rPx * 0.76 * squash, 0, dir - 0.55, dir + 0.55);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x7402);
    const cy = py - sc * 0.42;
    ctx.save();
    ctx.lineCap = 'round';
    // THE GROWING WHIP: the vine's tip races the arc (0→0.35); the
    // body it leaves behind carries budded thorns. After 0.45 the
    // briar DRIES — green → brown in one hard step — and crumbles
    // from the tail end.
    const reach = Math.min(1, t / 0.35);
    const crumble = Math.max(0, (t - 0.55) / 0.4);
    const dried = t > 0.45;
    const n = 9;
    const bodyCol = dried ? '#6a5638' : st.mid;
    const thornCol = dried ? '#4a3c28' : shade(st.mid, -18);
    // The vine: a kinked polyline along the arc, sagging mid-spans.
    ctx.globalAlpha = 0.95 * (t < 0.8 ? 1 : (1 - t) / 0.2);
    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      if (f > reach) break;
      if (f < crumble) continue;
      const a = dir - 0.55 + f * 1.1;
      const sag = Math.sin(f * Math.PI * 3 + (c.seed % 5)) * sc * 0.06;
      const x = px + Math.cos(a) * rPx * 0.76;
      const y = cy + Math.sin(a) * rPx * 0.76 * squash + sag;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // The thorns: budding behind the tip, each a small curved barb.
    for (let k = 1; k < n; k++) {
      const f = k / n;
      if (f > reach - 0.08 || f < crumble) continue;
      const a = dir - 0.55 + f * 1.1;
      const sag = Math.sin(f * Math.PI * 3 + (c.seed % 5)) * sc * 0.06;
      const x = px + Math.cos(a) * rPx * 0.76;
      const y = cy + Math.sin(a) * rPx * 0.76 * squash + sag;
      const side = k % 2 === 0 ? 1 : -1;
      const bud = Math.min(1, (reach - f) / 0.15);
      ctx.globalAlpha = 0.95 * bud;
      ctx.strokeStyle = thornCol;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + side * 1.9) * sc * 0.1, y + Math.sin(a + side * 1.9) * sc * 0.1 - sc * 0.05,
        x + Math.cos(a + side * 2.3) * sc * 0.14, y + Math.sin(a + side * 2.3) * sc * 0.14 - sc * 0.1);
      ctx.stroke();
    }
    // The living tip: a bright growing point while it races.
    if (reach < 1) {
      const a = dir - 0.55 + reach * 1.1;
      const x = px + Math.cos(a) * rPx * 0.76;
      const y = cy + Math.sin(a) * rPx * 0.76 * squash;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      const g = Math.max(2.5, sc * 0.06);
      ctx.fillRect(x - g / 2, y - g / 2, g, g);
    }
    // Crumble flecks fall off the dying tail on gated beats.
    if (dried && crumble < 1 && Math.random() < c.frameDt * 12) {
      const f = crumble + rand() * 0.1;
      const a = c.dir - 0.55 + f * 1.1;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.76, c.wy + Math.sin(a) * c.radius * 0.76,
        1, ['#6a5638', '#4a3c28'], {
          speed: 0.2, life: 0.6, size: 0.04, gravity: 0,
          z: 0.4, vz: -0.2, zg: 3, land: 'die', layer: 'world', shadow: 0,
        });
    }
    ctx.restore();
  },
};

/**
 * QUICKSILVER — "the three bells."
 * Three thrusts in one bar of another blade's time — each beat is a
 * needle lunge that RINGS: a small silver chime-ring ripples at the
 * point, and each bell rings higher (smaller, brighter) than the
 * last. Beat parity off bornAt picks the station left → center →
 * right. Three silver points stay in a row where the bells rang.
 */
const quicksilver: AbilitySig = {
  spawn(c) {
    // One beat = one bell = one silver point that stays.
    const beat = Math.floor((c.now - c.age) / 250) % 3;
    const nx = -Math.sin(c.dir);
    const ny = Math.cos(c.dir);
    const off = (beat - 1) * 0.3;
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.68 + nx * off;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.68 + ny * off;
    lay(c, hx, hy, '#f2ede0', { life: 7, size: 0.05, flicker: 0.2 });
    // Silver droplets scatter off the ring.
    c.particles.burst(hx, hy, 3, ['#f2ede0', '#cfc8b4'], {
      speed: 0.9, life: 0.5, size: 0.045, gravity: 0, shape: 'glint',
      z: 0.45, vz: 0.5, zg: 5, land: 'die', layer: 'world', shadow: 0,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    // A tick under each bell: brief, exact.
    if (t > 0.5) return;
    const beat = Math.floor((c.now - c.age) / 250) % 3;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    const off = (beat - 1) * sc * 0.3;
    const p = pt(c, c.rPx * 0.68, dir);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - t / 0.5);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(p.x + nx * off, p.y + ny * off, sc * 0.14, sc * 0.14 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const beat = Math.floor((c.now - c.age) / 250) % 3;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    const off = (beat - 1) * sc * 0.3;
    const p = pt(c, rPx * 0.68, dir);
    const bx = p.x + nx * off;
    const by = p.y + ny * off - sc * 0.48;
    ctx.save();
    ctx.lineCap = 'butt';
    // The lunge: one needle line from the body to the bell point.
    if (t < 0.22) {
      const k = 1 - t / 0.22;
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = '#f2ede0';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 0.5);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * k;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(px + (bx - px) * 0.5, (py - sc * 0.5) + (by - (py - sc * 0.5)) * 0.5);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    // THE BELL: a double chime-ring ripples at the point — pitch
    // rises with the beat (each bell smaller and brighter).
    const size = 1 - beat * 0.22;
    for (let r = 0; r < 2; r++) {
      const born = 0.04 + r * 0.12;
      const u = (t - born) / 0.4;
      if (u < 0 || u > 1) continue;
      const rr = sc * (0.12 + u * 0.42) * size;
      ctx.globalAlpha = (1 - u) * (r === 0 ? 0.97 : 0.6);
      ctx.strokeStyle = r === 0 ? '#ffffff' : '#cfc8b4';
      ctx.lineWidth = Math.max(1.6, sc * (0.045 - u * 0.02));
      ctx.beginPath();
      ctx.ellipse(bx, by, rr, rr * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The clapper point: one hard silver diamond at the heart.
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const g = Math.max(2.5, sc * 0.06) * size;
    ctx.globalAlpha = 0.97 * fade;
    ctx.fillStyle = '#f2ede0';
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-g / 2, -g / 2, g, g);
    ctx.restore();
    ctx.restore();
    if (t < 0.15) c.glow(c.wx + Math.cos(dir) * c.radius * 0.68, c.wy + Math.sin(dir) * c.radius * 0.68, 0.55, 0.35 * (1 - t / 0.15));
  },
};

/**
 * RIPTIDE — "the low tide."
 * The surge is the tide going OUT: behind the dash the ground is
 * briefly EXPOSED — a lightened lane with ripple contour lines and
 * stranded shell-dots, sea floor where grass was — then the water
 * RETURNS: a foam line sweeps back up the lane and erases it.
 * Two little shells stay stranded for eight seconds.
 */
const riptide: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4171);
    water.deployments.splash!(asMatter(c), c.wx2, c.wy2, { scale: 0.7 });
    // Stranded shells: two pale props that STAY on the lane.
    for (let k = 0; k < 2; k++) {
      const f = 0.3 + k * 0.35 + rand() * 0.1;
      lay(c, c.wx + (c.wx2 - c.wx) * f + (rand() - 0.5) * 0.2,
        c.wy + (c.wy2 - c.wy) * f + (rand() - 0.5) * 0.2,
        '#e8e0cc', { life: 8.5, size: 0.07 });
    }
    // The damp: dark wet grains along the lane, drying away.
    for (let k = 0; k < 5; k++) {
      const f = k / 4;
      lay(c, c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f,
        shade(c.st.deep, -10), { life: 6, size: 0.06 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE EXPOSED LANE: while the tide is out (t < 0.55) the lane
    // is a lightened band with ripple contour lines — the sea floor
    // shown for one breath.
    const back = Math.min(1, Math.max(0, (t - 0.45) / 0.4)); // the return
    const w = sc * 0.3;
    if (back < 1) {
      const from = back * len; // the foam has re-covered up to here
      ctx.globalAlpha = 0.4 * (t < 0.7 ? 1 : (1 - t) / 0.3);
      ctx.fillStyle = shade(st.mid, 22);
      ctx.beginPath();
      ctx.moveTo(px + ux * from + nx * w, py + uy * from + ny * w * squash);
      ctx.lineTo(px2 + nx * w, py2 + ny * w * squash);
      ctx.lineTo(px2 - nx * w, py2 - ny * w * squash);
      ctx.lineTo(px + ux * from - nx * w, py + uy * from - ny * w * squash);
      ctx.closePath();
      ctx.fill();
      // Ripple contours: three short curved sand lines across it.
      ctx.globalAlpha = 0.6 * (t < 0.7 ? 1 : (1 - t) / 0.3);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      for (let k = 0; k < 3; k++) {
        const f = 0.25 + k * 0.25;
        if (f * len < from) continue;
        const cxp = px + ux * len * f;
        const cyp = py + uy * len * f;
        ctx.beginPath();
        ctx.ellipse(cxp, cyp, w * 0.75, w * 0.3 * squash, Math.atan2(uy, ux), 0.4, Math.PI - 0.4);
        ctx.stroke();
      }
      // THE FOAM LINE: the returning water's edge — a white crest
      // sweeping up the lane, erasing the low tide behind it.
      if (back > 0) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(px + ux * from + nx * w * 1.05, py + uy * from + ny * w * 1.05 * squash);
        ctx.lineTo(px + ux * from - nx * w * 1.05, py + uy * from - ny * w * 1.05 * squash);
        ctx.stroke();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(4, sc * 0.11);
        ctx.beginPath();
        ctx.moveTo(px + ux * (from - sc * 0.1) + nx * w, py + uy * (from - sc * 0.1) + ny * w * squash);
        ctx.lineTo(px + ux * (from - sc * 0.1) - nx * w, py + uy * (from - sc * 0.1) - ny * w * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    // The arrival: one cold crest curls over the strike and breaks.
    if (t < 0.3) {
      const k = t / 0.3;
      const hy = py2 - sc * 0.5;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9 * (1 - k * 0.5);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3.5, sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(px2, hy, sc * 0.34, sc * 0.3, 0, Math.PI * (1.1 - k * 0.3), Math.PI * 1.95);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * (1 - k * 0.4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px2, hy, sc * 0.38, sc * 0.34, 0, Math.PI * (1.15 - k * 0.3), Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();
      if (t < 0.12) c.glow(c.wx2, c.wy2, 0.9, 0.4 * (1 - t / 0.12));
    }
    // Spray flicks off the crest on gated beats while it breaks.
    if (t < 0.3 && Math.random() < c.frameDt * 12) {
      c.particles.burst(c.wx2, c.wy2, 1, ['#dff0f2', st.mid], {
        speed: 1, life: 0.5, size: 0.05, gravity: 0, shape: 'drop',
        z: 0.55, vz: 1, zg: 7, land: 'die', layer: 'world', shadow: 0,
      });
    }
  },
};

/**
 * CINDER_ARC — "the blown coals."
 * The crescent hangs as a rank of dim coals — dark lumps in the
 * arc — and then the swing's own wake BLOWS across them: each coal
 * flares white-orange in sequence as the gust passes, sheds one
 * spark, and dims to ash. The rank stays on the ground as ember
 * grains that die one by one over eight seconds.
 */
const cinder_arc: AbilitySig = {
  spawn(c) {
    // The ember rank's lasting record: coals laid in the arc, each
    // cooling white → orange → soot on its own clock.
    for (let k = 0; k < 6; k++) {
      const a = c.dir - 0.5 + (k / 5) * 1.0;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.74, c.wy + Math.sin(a) * c.radius * 0.74,
        '#fff1d8', {
          life: 8, size: 0.06, flicker: 0.3,
          fade: '#f0a45a', fadeAt: 0.2, fade2: '#4a3226', fade2At: 0.6,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    // Heat shade under the rank: a warm dark bed arc.
    ctx.save();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(4.5, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.74, rPx * 0.74 * squash, 0, dir - 0.5, dir + 0.5);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const cy = py - sc * 0.4;
    ctx.save();
    // THE COALS: six lumps hang in the arc — each a dark clinker
    // with a glow seam. The GUST (the swing's wake) crosses the arc
    // 0.1→0.6: as it passes each coal, the coal FLARES, sheds one
    // spark, and dims to ash.
    const gust = (t - 0.1) / 0.5; // 0..1 across the rank
    for (let k = 0; k < 6; k++) {
      const f = k / 5;
      const a = dir - 0.5 + f * 1.0;
      const x = px + Math.cos(a) * rPx * 0.74;
      const y = cy + Math.sin(a) * rPx * 0.74 * squash;
      const dist = gust - f;
      // Flare envelope: peaks right as the gust crosses this coal.
      const flare = Math.max(0, 1 - Math.abs(dist) * 5);
      const ashed = dist > 0.2;
      const g = sc * (0.09 + flare * 0.035);
      // The clinker body.
      ctx.globalAlpha = 0.95 * (t < 0.8 ? 1 : (1 - t) / 0.2);
      ctx.fillStyle = ashed ? '#5a5048' : shade(st.deep, -12);
      ctx.beginPath();
      ctx.moveTo(x, y - g);
      ctx.lineTo(x + g * 0.9, y - g * 0.2);
      ctx.lineTo(x + g * 0.5, y + g * 0.8);
      ctx.lineTo(x - g * 0.6, y + g * 0.7);
      ctx.lineTo(x - g * 0.9, y - g * 0.3);
      ctx.closePath();
      ctx.fill();
      // The glow seam: a bright crack across the lump — white at
      // full flare, orange banked, dead grey once ashed.
      ctx.globalAlpha = (ashed ? 0.25 : 0.6 + 0.4 * flare) * (t < 0.8 ? 1 : (1 - t) / 0.2);
      ctx.strokeStyle = flare > 0.5 ? '#fff1d8' : ashed ? '#6a6058' : st.spark;
      ctx.lineWidth = Math.max(1.6, sc * (0.032 + flare * 0.022));
      ctx.beginPath();
      ctx.moveTo(x - g * 0.7, y + g * 0.1);
      ctx.lineTo(x - g * 0.1, y - g * 0.25);
      ctx.lineTo(x + g * 0.6, y + g * 0.15);
      ctx.stroke();
      // The shed spark: once, on the flare's crossing frame.
      const fPrev = ((t - c.frameDt * 1000 / 300) - 0.1) / 0.5 - f;
      if (fPrev < 0 && dist >= 0) {
        fire.deployments.burst!(asMatter(c),
          c.wx + Math.cos(a) * c.radius * 0.74,
          c.wy + Math.sin(a) * c.radius * 0.74, { scale: 0.35 });
      }
    }
    // The gust itself: a thin pale wind-line racing the arc ahead
    // of the flares.
    if (gust > 0 && gust < 1.1) {
      const a = dir - 0.5 + Math.min(1, gust) * 1.0;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, cy, rPx * 0.8, rPx * 0.8 * squash, 0, a - 0.16, a);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.7, c.wy + Math.sin(dir) * c.radius * 0.7, 0.9, 0.3 * (1 - t));
  },
};

/**
 * WINTERS_EDGE — "the slow cut."
 * The slowest edge in the game, and proud of it: the cut advances
 * VISIBLY through the arc — a glass seam scored in the air behind
 * an unhurried point — for seventy percent of the fx's life, glitter
 * sifting off the finished span. Where it passed, a thin frost line
 * lies on the ground, twinkling for eight seconds.
 */
const winters_edge: AbilitySig = {
  spawn(c) {
    frost.deployments.bloom!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.72,
      c.wy + Math.sin(c.dir) * c.radius * 0.72, { scale: 0.6 });
    // The frost line: white grains under the seam's path.
    for (let k = 0; k < 7; k++) {
      const a = c.dir - 0.5 + (k / 6) * 1.0;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.72, c.wy + Math.sin(a) * c.radius * 0.72,
        k % 2 === 0 ? '#ffffff' : c.st.mid,
        { life: 8, size: 0.045, flicker: 0.3 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const reach = Math.min(1, t / 0.7);
    // The seam's cast shade: cold darkens where the cut has passed.
    ctx.save();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(3, sc * 0.08);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.72, rPx * 0.72 * squash, 0, dir - 0.5, dir - 0.5 + reach * 1.0);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const cy = py - sc * 0.46;
    const reach = Math.min(1, t / 0.7); // the unhurried point
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE SEAM: the finished span is a scored glass line — a pale
    // double stroke with facet ticks — utterly still once cut.
    const a0 = dir - 0.5;
    const a1 = a0 + reach * 1.0;
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(3.6, sc * 0.095);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.72, rPx * 0.72 * squash, 0, a0, a1);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.72, rPx * 0.72 * squash, 0, a0, a1);
    ctx.stroke();
    ctx.globalAlpha = 0.97 * fade;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    ctx.ellipse(px, cy, rPx * 0.75, rPx * 0.75 * squash, 0, a0, a1);
    ctx.stroke();
    // Facet ticks: short perpendicular nicks along the finished span.
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      if (f > reach) break;
      const a = a0 + f * 1.0;
      const x = px + Math.cos(a) * rPx * 0.72;
      const y = cy + Math.sin(a) * rPx * 0.72 * squash;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(x, y - sc * 0.06);
      ctx.lineTo(x, y + sc * 0.06);
      ctx.stroke();
    }
    // THE POINT: the cutting tip, a slow bright bead with a tiny
    // pressure halo — you can watch winter work.
    if (reach < 1) {
      const a = a1;
      const x = px + Math.cos(a) * rPx * 0.72;
      const y = cy + Math.sin(a) * rPx * 0.72 * squash;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#ffffff';
      const g = Math.max(3, sc * 0.07);
      ctx.fillRect(x - g / 2, y - g / 2, g, g);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.ellipse(x, y, g * 1.6, g * 1.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Glitter sifts off the fresh span behind the point.
      if (Math.random() < c.frameDt * 16) {
        c.particles.burst(
          c.wx + Math.cos(a - 0.1) * c.radius * 0.72,
          c.wy + Math.sin(a - 0.1) * c.radius * 0.72,
          1, ['#ffffff', st.core], {
            speed: 0.15, life: 0.8, size: 0.045, gravity: 0, shape: 'glint',
            z: 0.46, vz: -0.15, zg: 1.2, land: 'die', layer: 'world', shadow: 0, wobble: 0.3,
          });
      }
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.7, c.wy + Math.sin(dir) * c.radius * 0.7, 0.8, 0.25 * (1 - t));
  },
};

/**
 * REAPERS_ARC — "the tithe sheaf."
 * The harvest gathers itself: pale cut stalks leap INWARD from the
 * swept fan and BIND into one standing sheaf at the arc's middle —
 * a bundled shock with a dark tie band — which stands one beat,
 * then slumps over. A little pile of straw and its tie stay on the
 * ground where it fell: the tithe, collected and counted.
 */
const reapers_arc: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x4ea1);
    // Escaping chaff: slips that dodge the binding, wobbling off.
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 0.7 + rand() * 1.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        1, ['#c8bb84', '#a89a6a'], {
          speed: 0.5, life: 5, size: 0.055, gravity: 0,
          dir: a, spread: 0.5, shape: 'streak',
          z: 0.35, vz: 0.6, zg: 1.8, land: 'settle', layer: 'world', wobble: 0.6,
          fade: '#8a7d55', fadeAt: 0.5,
        });
    }
    // The slumped sheaf's pile + tie, laid at the arc's middle.
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.66;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.66;
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * 0.22;
      lay(c, hx + Math.cos(a) * rr, hy + Math.sin(a) * rr,
        k % 2 === 0 ? '#c8bb84' : '#a89a6a', { life: 9, size: 0.06 });
    }
    lay(c, hx, hy, shade(c.st.deep, -14), { life: 9.5, size: 0.055 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The swept fan: a wide, low stubble shade — the field, cut.
    ctx.save();
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.85, rPx * 0.85 * squash, 0, dir - 0.8, dir + 0.8);
    ctx.ellipse(c.px, c.py, rPx * 0.4, rPx * 0.4 * squash, dir + 0.8, dir - 0.8, 0, true);
    ctx.fill();
    // Stubble ticks: short cut-stem stumps inside the fan.
    const rand = srand(c.seed ^ 0x4ea2);
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = '#8a7d55';
    ctx.lineWidth = Math.max(1.4, sc * 0.032);
    for (let k = 0; k < 7; k++) {
      const a = dir - 0.7 + rand() * 1.4;
      const rr = rPx * (0.45 + rand() * 0.35);
      const p = pt(c, rr, a);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - sc * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x4ea3);
    const hx = px + Math.cos(dir) * rPx * 0.66;
    const hy = py + Math.sin(dir) * rPx * 0.66 * squash;
    ctx.save();
    ctx.lineCap = 'butt';
    // The scythe pass: one wide dark crescent, fast and early.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(4, sc * 0.115);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.4, rPx * 0.8, rPx * 0.8 * squash, 0, dir - 0.8, dir + 0.8);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.4, rPx * 0.84, rPx * 0.84 * squash, 0, dir - 0.75, dir + 0.75);
      ctx.stroke();
    }
    // THE GATHERING: cut stalks leap inward from the fan to the
    // sheaf point — each a pale straw sliver flying flat.
    for (let k = 0; k < 6; k++) {
      const born = 0.1 + (k % 3) * 0.07;
      const u = Math.min(1, Math.max(0, (t - born) / 0.2));
      if (u <= 0 || u >= 1) continue;
      const a = dir - 0.7 + (k / 5) * 1.4;
      const sx = px + Math.cos(a) * rPx * 0.85;
      const sy = py + Math.sin(a) * rPx * 0.85 * squash - sc * 0.2;
      const x = sx + (hx - sx) * u;
      const y = sy + (hy - sy - sc * 0.4) * u;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = k % 2 === 0 ? '#c8bb84' : '#a89a6a';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      const fa = Math.atan2(hy - sc * 0.4 - sy, hx - sx);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(fa) * sc * 0.12, y - Math.sin(fa) * sc * 0.12);
      ctx.lineTo(x + Math.cos(fa) * sc * 0.12, y + Math.sin(fa) * sc * 0.12);
      ctx.stroke();
    }
    // THE SHEAF: stalks bound upright — a fanned bundle standing at
    // the middle, tied dark at the waist — stands 0.35→0.6, then
    // SLUMPS (rotates over) 0.6→0.85.
    const built = Math.min(1, Math.max(0, (t - 0.3) / 0.12));
    const slump = Math.min(1, Math.max(0, (t - 0.6) / 0.25));
    if (built > 0 && t < 0.9) {
      const H = sc * 0.62 * built;
      const lean = slump * 1.25;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(lean * (c.seed % 2 === 0 ? 1 : -1));
      // Five stalks fanned from the tie point.
      for (let k = 0; k < 5; k++) {
        const fa = -Math.PI / 2 + (k - 2) * 0.16;
        ctx.globalAlpha = 0.95 * (1 - slump * 0.4);
        ctx.strokeStyle = k % 2 === 0 ? '#c8bb84' : '#a89a6a';
        ctx.lineWidth = Math.max(2, sc * 0.05);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(fa) * H * (0.85 + (k % 3) * 0.08), Math.sin(fa) * H * (0.85 + (k % 3) * 0.08));
        ctx.stroke();
        // Seed heads: a bright nub at each stalk's tip.
        ctx.fillStyle = '#e8dcb0';
        const g = Math.max(2, sc * 0.045);
        ctx.fillRect(Math.cos(fa) * H - g / 2, Math.sin(fa) * H - g / 2, g, g);
      }
      // The tie band: one dark cinch at the waist.
      ctx.globalAlpha = 0.97 * (1 - slump * 0.3);
      ctx.strokeStyle = shade(st.deep, -16);
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(-sc * 0.09, -H * 0.28);
      ctx.lineTo(sc * 0.09, -H * 0.32);
      ctx.stroke();
      ctx.restore();
      void rand;
    }
    ctx.restore();
    if (t > 0.3 && t < 0.42) c.glow(c.wx + Math.cos(dir) * c.radius * 0.66, c.wy + Math.sin(dir) * c.radius * 0.66, 0.8, 0.35);
  },
};

/**
 * RED_HARVEST — "the wheel of cuts."
 * Every edge at once, literally: eight blade slivers materialize
 * around the ring pointing inward, strike in a single synchronized
 * flash, and vanish — leaving eight radial cut lines that then
 * WEEP, each beading red at its middle. The wheel of stains stays
 * printed on the ground for nine seconds.
 */
const red_harvest: AbilitySig = {
  spawn(c) {
    blood.deployments.spatter!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.7 });
    // The wheel's record: eight short radial stain-pairs.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.2;
      const rr = c.radius * 0.55;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        '#63201a', { life: 9, size: 0.05 });
      lay(c, c.wx + Math.cos(a) * (rr + 0.16), c.wy + Math.sin(a) * (rr + 0.16),
        '#421410', { life: 9, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE CUT LINES: eight radial scores, present after the strike,
    // each beading red at its middle as it weeps.
    if (t > 0.15) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.2;
        const r0 = rPx * 0.42;
        const r1 = rPx * 0.72;
        const p0 = pt(c, r0, a);
        const p1 = pt(c, r1, a);
        ctx.globalAlpha = 0.8 * fade;
        ctx.strokeStyle = shade(st.deep, -14);
        ctx.lineWidth = Math.max(2.2, sc * 0.055);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        // The weep bead: swells at the line's middle.
        const weep = Math.min(1, Math.max(0, (t - 0.25 - (k % 4) * 0.08) / 0.3));
        if (weep > 0) {
          const mx = (p0.x + p1.x) / 2;
          const my = (p0.y + p1.y) / 2;
          ctx.globalAlpha = 0.9 * fade;
          ctx.fillStyle = '#b8362a';
          ctx.beginPath();
          ctx.ellipse(mx, my, sc * 0.035 * weep + 1, sc * 0.045 * weep + 1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
    void py; void px;
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE EDGES: eight blade slivers hang around the ring pointing
    // inward (0→0.12), then ALL strike on the same frame — one
    // synchronized inward flash — and are gone.
    if (t < 0.2) {
      const strike = t > 0.12;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.2;
        const rr = strike ? rPx * 0.5 : rPx * 0.78;
        const x = px + Math.cos(a) * rr;
        const y = py + Math.sin(a) * rr * squash - sc * 0.4;
        const L = sc * 0.24;
        ctx.globalAlpha = strike ? 0.97 : 0.85;
        ctx.strokeStyle = strike ? st.core : st.mid;
        ctx.lineWidth = Math.max(2.2, sc * 0.055);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5);
        ctx.lineTo(x - Math.cos(a) * L * 0.5, y - Math.sin(a) * L * 0.5);
        ctx.stroke();
        // Each edge's bright point aims at the heart.
        ctx.fillStyle = st.core;
        const g = Math.max(2, sc * 0.045);
        ctx.fillRect(x - Math.cos(a) * L * 0.5 - g / 2, y - Math.sin(a) * L * 0.5 - g / 2, g, g);
      }
      if (strike) c.glow(c.wx, c.wy, c.radius * 0.8, 0.6);
    }
    // The tally flash at the heart: one red star as all eight land.
    if (t > 0.12 && t < 0.26) {
      const k = 1 - (t - 0.12) / 0.14;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.4, sc * 0.3, sc * 0.11, 8, c.now / 400, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * STORM_BRAND — "the blade of lightning."
 * The discharge takes the sword's own shape: the hop paints as an
 * elongated BLADE made of lightning — jagged edge, a crossguard
 * kink near the hilt, tapering to the strike point — leaping down
 * the line and sticking its point in with two short after-arcs.
 * A needle-thin scorch and a stab-point stain stay on the ground.
 */
const storm_brand: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.7 });
    // The stab record: a needle scorch line + the point's stain.
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx2 - Math.cos(ang) * 0.16 * (k + 1), c.wy2 - Math.sin(ang) * 0.16 * (k + 1),
        '#fff9e0', {
          life: 7, size: 0.04,
          fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
        });
    }
    lay(c, c.wx2, c.wy2, shade(c.st.deep, -18), { life: 8, size: 0.06 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    if (t < 0.1) return;
    const fade = 1 - t;
    // The strike's ground kiss: a small hard ring, once.
    ctx.save();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.22 * (0.5 + t), sc * 0.22 * (0.5 + t) * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x5b01);
    const lift = sc * 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE BLADE: hilt at the caster, point at the strike. Drawn as
    // a jagged double-stroke silhouette — the fuller (dark bed) and
    // the edge (white) — with a crossguard kink at 20%.
    if (t < 0.6) {
      const ux = px2 - px;
      const uy = py2 - py;
      const len = Math.hypot(ux, uy) || 1;
      const nx = -uy / len;
      const ny = ux / len;
      const seg = 6;
      const jag = (f: number): number =>
        f < 0.05 ? 0 : (rand() - 0.5) * sc * 0.16 * (1 - f * 0.6);
      // Rebuild the same seeded jags each frame.
      const r2 = srand(c.seed ^ 0x5b02);
      const jags: number[] = [];
      for (let k = 0; k <= seg; k++) jags.push(k === 0 || k === seg ? 0 : (r2() - 0.5) * sc * 0.16);
      const flicker = 0.75 + 0.25 * Math.sin(c.now / 40);
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.6 : 0.97) * (1 - t / 0.6) * flicker;
        ctx.strokeStyle = pass === 0 ? shade(st.deep, -6) : '#fff9e0';
        ctx.lineWidth = Math.max(pass === 0 ? 4 : 2, sc * (pass === 0 ? 0.1 : 0.045) * (1 - t * 0.4));
        ctx.beginPath();
        ctx.moveTo(px, py - lift);
        for (let k = 1; k <= seg; k++) {
          const f = k / seg;
          ctx.lineTo(px + ux * f + nx * jags[k]!, py + uy * f + ny * jags[k]! - lift);
        }
        ctx.stroke();
      }
      // The crossguard: one perpendicular bar of charge at 20%.
      const gx = px + ux * 0.2;
      const gy = py + uy * 0.2 - lift;
      ctx.globalAlpha = 0.95 * (1 - t / 0.6) * flicker;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(gx + nx * sc * 0.2, gy + ny * sc * 0.2);
      ctx.lineTo(gx - nx * sc * 0.2, gy - ny * sc * 0.2);
      ctx.stroke();
      void jag;
    }
    // THE POINT STICKS: at the strike, a hard star + two after-arcs
    // crawling off the point.
    if (t > 0.08 && t < 0.3) {
      const k = 1 - (t - 0.08) / 0.22;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fff9e0';
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - lift, sc * 0.3, sc * 0.11, 4, c.now / 200, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.9, 0.55 * k);
    }
    if (t > 0.2 && t < 0.75) {
      for (let k = 0; k < 2; k++) {
        const oa = c.now / 90 + k * Math.PI;
        ctx.globalAlpha = 0.8 * (1 - (t - 0.2) / 0.55);
        ctx.strokeStyle = k === 0 ? st.spark : '#fff9e0';
        ctx.lineWidth = Math.max(1.4, sc * 0.03);
        ctx.beginPath();
        boltPath(ctx, px2 + Math.cos(oa) * sc * 0.2, py2 - lift + Math.sin(oa) * sc * 0.12,
          px2 + Math.cos(oa + 1.4) * sc * 0.26, py2 - lift + Math.sin(oa + 1.4) * sc * 0.16,
          c.seed ^ (k + Math.floor(c.now / 110)), sc * 0.05);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

/**
 * KINGS_DECREE — "the proclamation."
 * The decree is read in the round: a gold scroll band UNROLLS in a
 * full circle around the caster at chest height — a rolling spiral
 * head racing the rim, script-dashes filling the band behind it —
 * and the instant the circle closes, the whole ring SNAPS flat
 * outward: the words themselves are the shockwave. A circular band
 * of golden letter-flecks stays printed on the ground.
 */
const kings_decree: AbilitySig = {
  spawn(c) {
    // The printed decree: gold dash-flecks in a ring, kept 8 s.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.62, c.wy + Math.sin(a) * c.radius * 0.62,
        k % 3 === 0 ? c.st.core : c.st.spark,
        { life: 8.5, size: 0.05, fade: shade(c.st.mid, -14), fadeAt: 0.45 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // The dismissal: after the snap, one wide hard pressure ring
    // races to the rim throwing dust ticks outward.
    if (t < 0.42) return;
    const u = (t - 0.42) / 0.58;
    const rr = rPx * (0.55 + u * 0.5);
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - u);
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(5, sc * 0.15 * (1 - u * 0.4));
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * (1 - u);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.97, rr * 0.97 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    const rand = srand(c.seed ^ 0xdec1);
    ctx.globalAlpha = 0.6 * (1 - u);
    ctx.strokeStyle = shade(st.deep, 8);
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const p0 = pt(c, rr * 0.9, a);
      const p1 = pt(c, rr * 1.08, a);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const cy = py - sc * 0.6;
    const R = rPx * 0.62;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE UNROLLING: the spiral head races the rim 0→0.4; behind it
    // the band exists, filled with script dashes.
    const roll = Math.min(1, t / 0.4);
    const a0 = -Math.PI / 2;
    const a1 = a0 + roll * Math.PI * 2;
    const fade = t < 0.42 ? 1 : Math.max(0, 1 - (t - 0.42) / 0.2);
    if (fade > 0) {
      // The band: parchment-gold, deep-edged.
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(6, sc * 0.19);
      ctx.beginPath();
      ctx.ellipse(px, cy, R, R * squash * 1.25, 0, a0, a1);
      ctx.stroke();
      ctx.globalAlpha = 0.92 * fade;
      ctx.strokeStyle = shade(st.mid, 14);
      ctx.lineWidth = Math.max(4.4, sc * 0.14);
      ctx.beginPath();
      ctx.ellipse(px, cy, R, R * squash * 1.25, 0, a0, a1);
      ctx.stroke();
      // Script dashes: the decree's words, riding the band.
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = shade(st.deep, -16);
      ctx.lineWidth = Math.max(1.6, sc * 0.036);
      ctx.setLineDash([sc * 0.08, sc * 0.07]);
      ctx.beginPath();
      ctx.ellipse(px, cy, R, R * squash * 1.25, 0, a0, a1);
      ctx.stroke();
      ctx.setLineDash([]);
      // The rolling head: a small spiral coil racing the rim.
      if (roll < 1) {
        const hx = px + Math.cos(a1) * R;
        const hy = cy + Math.sin(a1) * R * squash * 1.25;
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        ctx.ellipse(hx, hy, sc * 0.09, sc * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.deep, -10);
        ctx.beginPath();
        ctx.ellipse(hx, hy, sc * 0.04, sc * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // THE SNAP: the circle closes and the ring flashes white-gold
    // once, flat — the words leaving as force.
    if (t > 0.4 && t < 0.52) {
      const k = 1 - (t - 0.4) / 0.12;
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(3, sc * 0.08);
      ctx.beginPath();
      ctx.ellipse(px, cy, R * (1 + (1 - k) * 0.3), R * squash * 1.25 * (1 + (1 - k) * 0.3), 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, c.radius, 0.65 * k);
    }
    ctx.restore();
  },
};

/**
 * SUNBURST — "the sun wheel."
 * Dawn happens HERE, spinning: a gold wheel of eight curved rays
 * whirls up around the caster at ground level, accelerates, and
 * FLINGS its rays outward — each curved blade of light detaching
 * tangentially and dissolving as it flies. Curved scorch trails
 * and a gold hub stain keep the wheel's shape on the ground.
 */
const sunburst: AbilitySig = {
  spawn(c) {
    fire.deployments.burst!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    // The wheel's print: curved ray trails (3 grains each, 4 rays)
    // + the hub.
    const rand = srand(c.seed ^ 0x5b51);
    for (let r = 0; r < 4; r++) {
      const a = (r / 4) * Math.PI * 2 + rand() * 0.3;
      for (let k = 0; k < 3; k++) {
        const f = 0.4 + k * 0.2;
        const aa = a + k * 0.28;
        lay(c, c.wx + Math.cos(aa) * c.radius * f, c.wy + Math.sin(aa) * c.radius * f,
          k === 0 ? c.st.core : c.st.spark,
          { life: 8, size: 0.05, fade: '#8a6a2e', fadeAt: 0.4 });
      }
    }
    lay(c, c.wx, c.wy, c.st.spark, { life: 9, size: 0.08, flicker: 0.2, fade: '#8a6a2e', fadeAt: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The wheel's light on the grass: a warm disc, hub-bright.
    ctx.save();
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.8, rPx * 0.8 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.26, sc * 0.26 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    ctx.lineCap = 'round';
    // THE WHEEL: eight curved rays spin about the caster, riding an
    // accelerating clock; at t 0.45 each detaches TANGENTIALLY —
    // flying off along its rim direction — and dissolves.
    const spinup = t < 0.45 ? t / 0.45 : 1;
    const baseA = t * t * 9 + (c.seed % 7); // accelerating spin
    const flung = Math.max(0, (t - 0.45) / 0.35);
    for (let k = 0; k < 8; k++) {
      const a = baseA + (k / 8) * Math.PI * 2;
      const R = rPx * (0.4 + 0.2 * spinup);
      let x = px + Math.cos(a) * R;
      let y = py - sc * 0.15 + Math.sin(a) * R * squash;
      let al = 0.95;
      if (flung > 0) {
        // Tangential release: the ray flies along its rim heading.
        const ta = a + Math.PI / 2;
        x += Math.cos(ta) * flung * sc * 1.6;
        y += Math.sin(ta) * flung * sc * 1.6 * squash;
        al = 1 - flung;
        if (al <= 0) continue;
      }
      // The ray: a curved gold blade with a white leading edge.
      const bend = a + Math.PI / 2 + 0.35;
      ctx.globalAlpha = 0.55 * al;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(4, sc * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(bend - 0.4) * sc * 0.24, y + Math.sin(bend - 0.4) * sc * 0.24,
        x + Math.cos(bend) * sc * 0.44, y + Math.sin(bend) * sc * 0.44);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * al;
      ctx.strokeStyle = k % 2 === 0 ? st.spark : st.mid;
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(bend - 0.4) * sc * 0.24, y + Math.sin(bend - 0.4) * sc * 0.24,
        x + Math.cos(bend) * sc * 0.44, y + Math.sin(bend) * sc * 0.44);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * al;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(bend - 0.42) * sc * 0.26, y + Math.sin(bend - 0.42) * sc * 0.26,
        x + Math.cos(bend) * sc * 0.47, y + Math.sin(bend) * sc * 0.47);
      ctx.stroke();
    }
    // The hub: a gold boss that flashes at the fling.
    const hubFlash = t > 0.42 && t < 0.56 ? 1 - (t - 0.42) / 0.14 : 0;
    ctx.globalAlpha = 0.95 * (t < 0.8 ? 1 : (1 - t) / 0.2);
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.15, sc * (0.1 + hubFlash * 0.06), sc * (0.1 + hubFlash * 0.06), 0, 0, Math.PI * 2);
    ctx.fill();
    if (hubFlash > 0) {
      ctx.globalAlpha = 0.95 * hubFlash;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.15, sc * 0.4, sc * 0.14, 8, c.now / 300, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, c.radius, 0.7 * hubFlash);
    }
    ctx.restore();
  },
};

/**
 * STARFALL_STRIKE — "the kept appointment."
 * The piece of sky arrives as a falling lance of night-white and
 * leaves its CALLING CARD: a faceted star fragment stands half-
 * buried at an angle in the crater, cooling through hard color
 * steps — white, violet, dark — for ten full seconds while a thin
 * column of displaced night shimmers up off it. The sky came, and
 * it left something to prove it.
 */
const starfall_strike: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    radiance.deployments.bloom!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    // THE FRAGMENT: one big glint prop leaning in the crater —
    // 10 s of life, cooling white → violet → near-dark.
    c.particles.burst(c.wx + 0.14, c.wy + 0.08, 1, ['#ffffff'], {
      speed: 0.02, life: 10, size: 0.14, gravity: 0, shape: 'glint',
      layer: 'world', z: 0.12, flicker: 0.25,
      fade: '#9a86d8', fadeAt: 0.25, fade2: '#4a4066', fade2At: 0.7,
    });
    // Star-flecks ring the crater.
    const rand = srand(c.seed ^ 0x5f11);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5,
        k % 2 === 0 ? '#ffffff' : '#9a86d8',
        { life: 8, size: 0.045, flicker: 0.35 });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // The crater: a modest night-dark bowl with a pale rim.
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -18);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.32, rPx * 0.32 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.36, rPx * 0.36 * squash, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.45 * fade);
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE LANCE: the fall compressed into one vertical burn — a
    // tapering white column with a violet sheath, gone fast.
    if (t < 0.12) {
      const k = 1 - t / 0.12;
      ctx.globalAlpha = 0.5 * k;
      ctx.strokeStyle = '#9a86d8';
      ctx.lineWidth = Math.max(6, sc * 0.2);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 3);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * k;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 2.6);
      ctx.lineTo(px, py);
      ctx.stroke();
      c.glow(c.wx, c.wy, 1.6, 0.9 * k);
    }
    // The arrival star: wide, hard, six points.
    if (t > 0.06 && t < 0.24) {
      const k = 1 - (t - 0.06) / 0.18;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.1, sc * 0.55, sc * 0.18, 6, c.now / 500, c.squash);
      ctx.fill();
    }
    // THE PAINTED FRAGMENT: while the paint lives, the fragment is
    // drawn as a faceted shard leaning out of the crater — dark
    // side face + lit face + a glow line where it meets the dirt.
    // (Past 780 ms the particle prop carries it for ten seconds.)
    if (t > 0.14) {
      const born = Math.min(1, (t - 0.14) / 0.1);
      const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
      const fx = px + sc * 0.14;
      const fy = py + sc * 0.05;
      const H = sc * 0.5 * born;
      const cool = t < 0.4 ? '#ffffff' : t < 0.65 ? '#c8bcf0' : '#9a86d8';
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade('#4a4066', -14);
      ctx.beginPath();
      ctx.moveTo(fx - sc * 0.1, fy);
      ctx.lineTo(fx + sc * 0.16, fy - H);
      ctx.lineTo(fx + sc * 0.05, fy - H * 0.9);
      ctx.lineTo(fx - sc * 0.14, fy - H * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cool;
      ctx.beginPath();
      ctx.moveTo(fx + sc * 0.16, fy - H);
      ctx.lineTo(fx + sc * 0.22, fy - H * 0.55);
      ctx.lineTo(fx + sc * 0.08, fy);
      ctx.lineTo(fx + sc * 0.05, fy - H * 0.9);
      ctx.closePath();
      ctx.fill();
      // The dirt seam glows where the sky touches the world.
      ctx.globalAlpha = 0.85 * fade * (t < 0.5 ? 1 : (1 - t) * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.moveTo(fx - sc * 0.12, fy + sc * 0.01);
      ctx.lineTo(fx + sc * 0.1, fy + sc * 0.02);
      ctx.stroke();
      // The night column: a faint dark shimmer band rising off it.
      ctx.globalAlpha = 0.25 * fade;
      ctx.fillStyle = '#4a4066';
      const wob = Math.sin(c.now / 160) * sc * 0.03;
      ctx.beginPath();
      ctx.moveTo(fx - sc * 0.06 + wob, fy - H);
      ctx.lineTo(fx + sc * 0.08 + wob, fy - H);
      ctx.lineTo(fx + sc * 0.05 - wob, fy - H - sc * 0.7);
      ctx.lineTo(fx - sc * 0.02 - wob, fy - H - sc * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    // Violet motes rise slow off the crater on gated beats.
    if (t > 0.2 && Math.random() < c.frameDt * 9) {
      c.particles.burst(c.wx, c.wy, 1, ['#9a86d8', '#ffffff'], {
        speed: 0.1, life: 1, size: 0.05, gravity: 0, shape: 'glint',
        z: 0.15, vz: 0.7, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.3,
      });
    }
    ctx.restore();
  },
};

/**
 * VOW_UNBROKEN — "the counted oath."
 * Six seconds, counted and sworn: five pale strokes write
 * themselves in the air before the chest — four uprights and the
 * cross-stroke — hold as the tally of the term, then absorb into
 * the sternum one by one, each with a small white click. Five
 * faint pale grains keep the tally's pattern on the ground.
 */
const vow_unbroken: AbilitySig = {
  spawn(c) {
    // The tally's shadow on the ground, laid to stay.
    for (let k = 0; k < 4; k++) {
      lay(c, c.wx - 0.24 + k * 0.16, c.wy + 0.3, '#e8e8f0', { life: 8, size: 0.045 });
    }
    lay(c, c.wx, c.wy + 0.34, '#c8c8d8', { life: 8.5, size: 0.05 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t > 0.5) return;
    // A quiet oath-circle underfoot: drawn once, unbroken.
    const draw = Math.min(1, t / 0.3);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.62, sc * 0.62 * squash, 0, -Math.PI / 2, -Math.PI / 2 + draw * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const cy = py - sc * 0.72;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE FIVE STROKES: four uprights write 0→0.4 in order, the
    // cross-stroke slashes at 0.45; then each absorbs into the
    // chest on its own clock (0.55 + k·0.07), clicking white.
    for (let k = 0; k < 5; k++) {
      const isCross = k === 4;
      const writeAt = isCross ? 0.42 : 0.06 + k * 0.09;
      const write = Math.min(1, Math.max(0, (t - writeAt) / 0.07));
      if (write <= 0) continue;
      const takeAt = 0.55 + k * 0.07;
      const take = Math.min(1, Math.max(0, (t - takeAt) / 0.06));
      if (take >= 1) {
        // The click: one small star at the sternum, briefly.
        const click = Math.max(0, 1 - (t - takeAt - 0.06) / 0.08);
        if (click > 0) {
          ctx.globalAlpha = 0.95 * click;
          ctx.fillStyle = st.core;
          ctx.beginPath();
          burstStarPath(ctx, px, cy + sc * 0.1, sc * 0.09, sc * 0.035, 4, k, 1);
          ctx.fill();
        }
        continue;
      }
      // Stroke geometry: uprights side by side; the cross diagonal.
      const x0 = isCross ? px - sc * 0.32 : px - sc * 0.24 + k * sc * 0.16;
      const y0 = isCross ? cy + sc * 0.12 : cy - sc * 0.2;
      const x1 = isCross ? px + sc * 0.32 : x0;
      const y1 = isCross ? cy - sc * 0.16 : cy + sc * 0.2;
      // Absorption slides the stroke into the sternum.
      const sx0 = x0 + (px - x0) * take;
      const sy0 = y0 + (cy + sc * 0.1 - y0) * take;
      const sx1 = x1 + (px - x1) * take;
      const sy1 = y1 + (cy + sc * 0.1 - y1) * take;
      ctx.globalAlpha = 0.65 * (1 - take * 0.5);
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(3.4, sc * 0.085);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + (sx1 - sx0) * write, sy0 + (sy1 - sy0) * write);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * (1 - take * 0.4);
      ctx.strokeStyle = isCross ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + (sx1 - sx0) * write, sy0 + (sy1 - sy0) * write);
      ctx.stroke();
    }
    // The pen point: a bright bead riding whichever stroke writes.
    const writing = t < 0.5;
    if (writing) {
      const k = t < 0.42 ? Math.min(3, Math.floor((t - 0.06) / 0.09)) : 4;
      if (k >= 0) {
        const isCross = k === 4;
        const writeAt = isCross ? 0.42 : 0.06 + k * 0.09;
        const w = Math.min(1, Math.max(0, (t - writeAt) / 0.07));
        const x0 = isCross ? px - sc * 0.32 : px - sc * 0.24 + k * sc * 0.16;
        const y0 = isCross ? cy + sc * 0.12 : cy - sc * 0.2;
        const x1 = isCross ? px + sc * 0.32 : x0;
        const y1 = isCross ? cy - sc * 0.16 : cy + sc * 0.2;
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = st.core;
        const g = Math.max(2.5, sc * 0.06);
        ctx.fillRect(x0 + (x1 - x0) * w - g / 2, y0 + (y1 - y0) * w - g / 2, g, g);
      }
    }
    ctx.restore();
    if (t > 0.42 && t < 0.52) c.glow(c.wx, c.wy, 0.8, 0.4 * (1 - (t - 0.42) / 0.1));
  },
};

/**
 * DRAG_UNDER — "the kelp hands."
 * The sweep is a wave and the wave has hands: five flat kelp straps
 * rise out of the swept fan, curl over inward like grasping
 * fingers, and DRAG DOWN below grade — sinking with whatever they
 * caught — leaving swirl eddies that spiral shut. Five wet hooked
 * stains keep the grip's shape on the ground.
 */
const drag_under: AbilitySig = {
  spawn(c) {
    water.deployments.splash!(asMatter(c),
      c.wx + Math.cos(c.dir) * c.radius * 0.65,
      c.wy + Math.sin(c.dir) * c.radius * 0.65, { scale: 0.7 });
    // The grip's stains: five curved two-grain hooks in the fan.
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 0.6 + (k / 4) * 1.2;
      const hx = c.wx + Math.cos(a) * c.radius * 0.68;
      const hy = c.wy + Math.sin(a) * c.radius * 0.68;
      lay(c, hx, hy, shade(c.st.deep, -10), { life: 8, size: 0.055 });
      lay(c, hx + Math.cos(a + 2.2) * 0.1, hy + Math.sin(a + 2.2) * 0.1,
        c.st.deep, { life: 8, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    ctx.save();
    // The wet fan: a darkened water-sheen where the wave swept.
    ctx.globalAlpha = 0.45 * fade;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.82, rPx * 0.82 * squash, 0, dir - 0.65, dir + 0.65);
    ctx.ellipse(c.px, c.py, rPx * 0.42, rPx * 0.42 * squash, dir + 0.65, dir - 0.65, 0, true);
    ctx.fill();
    // THE EDDIES: where each hand sank, a swirl spirals shut late.
    if (t > 0.5) {
      const u = (t - 0.5) / 0.5;
      for (let k = 0; k < 5; k++) {
        const a = dir - 0.6 + (k / 4) * 1.2;
        const p = pt(c, rPx * 0.68, a);
        const rr = sc * 0.14 * (1 - u * 0.7);
        ctx.globalAlpha = 0.8 * (1 - u) * fade;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.6, sc * 0.038);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rr, rr * squash, 0, u * 6 + k, u * 6 + k + 4.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    ctx.save();
    ctx.lineCap = 'round';
    // THE HANDS: five kelp straps rise (0→0.25), curl inward
    // (0.25→0.45), and drag DOWN below grade (0.45→0.75) — each a
    // flat ribbon with a paler inner face.
    for (let k = 0; k < 5; k++) {
      const a = dir - 0.6 + (k / 4) * 1.2;
      const bx = px + Math.cos(a) * rPx * 0.68;
      const by = py + Math.sin(a) * rPx * 0.68 * squash;
      const stagger = (k % 3) * 0.04;
      const rise = Math.min(1, Math.max(0, (t - 0.02 - stagger) / 0.23));
      const curl = Math.min(1, Math.max(0, (t - 0.25 - stagger) / 0.2));
      const sink = Math.min(1, Math.max(0, (t - 0.45 - stagger) / 0.3));
      if (rise <= 0 || sink >= 1) continue;
      const H = sc * (0.55 + (k % 2) * 0.12) * rise * (1 - sink);
      // The strap: base → tip with an inward curl at the top.
      const tipX = bx + Math.cos(a + Math.PI) * curl * sc * 0.3;
      const tipY = by - H + curl * sc * 0.14;
      ctx.globalAlpha = 0.92 * (1 - sink * 0.5);
      ctx.strokeStyle = shade(st.mid, -14);
      ctx.lineWidth = Math.max(3.6, sc * 0.095);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * sc * 0.06, by - H * 0.6, tipX, tipY);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * (1 - sink * 0.4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(bx, by - sc * 0.02);
      ctx.quadraticCurveTo(bx + Math.cos(a) * sc * 0.05, by - H * 0.62, tipX, tipY + sc * 0.02);
      ctx.stroke();
      // The grip tip: a paler curl end, biting inward.
      if (curl > 0.3 && sink < 0.8) {
        ctx.globalAlpha = 0.95 * (1 - sink);
        ctx.fillStyle = st.core;
        const g = Math.max(2, sc * 0.05);
        ctx.fillRect(tipX - g / 2, tipY - g / 2, g, g);
      }
      // Sink spray: one wet fleck as each hand goes under.
      const sPrev = Math.min(1, Math.max(0, ((t - c.frameDt * 1000 / 300) - 0.45 - stagger) / 0.3));
      if (sPrev <= 0 && sink > 0) {
        c.particles.burst(
          c.wx + Math.cos(a) * c.radius * 0.68, c.wy + Math.sin(a) * c.radius * 0.68,
          2, ['#dff0f2', st.mid], {
            speed: 0.7, life: 0.5, size: 0.05, gravity: 0, shape: 'drop',
            z: 0.15, vz: 1.2, zg: 7, land: 'die', layer: 'world', shadow: 0,
          });
      }
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 0.9, 0.25 * (1 - t));
  },
};

/**
 * SPOKEN_LIGHT — "the echo before the word."
 * The circle goes white ONCE — a negative flash, the game's only
 * inverted moment: a white disc with a dark rim and three thin dark
 * sound-lines inside it. Then the word itself — one small gold
 * mote — falls from mouth height and lands with the real thump.
 * The light was the echo; the word arrives after. One gold grain
 * and a rim of white flecks stay to prove the sentence happened.
 */
const spoken_light: AbilitySig = {
  spawn(c) {
    radiance.deployments.bloom!(asMatter(c), c.wx, c.wy, { scale: 0.6 });
    // The rim of the spoken circle, in white flecks.
    const rand = srand(c.seed ^ 0x5901);
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85,
        '#ffffff', { life: 7, size: 0.04, flicker: 0.25 });
    }
    // The word: one gold grain, where it will land.
    lay(c, c.wx + 0.2, c.wy + 0.1, c.st.spark, { life: 9, size: 0.06, flicker: 0.2 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // THE NEGATIVE FLASH: white disc, dark rim, dark sound-lines —
    // held 0→0.22, then gone entirely (no fade: light doesn't linger).
    if (t < 0.22) {
      const k = t < 0.16 ? 1 : 1 - (t - 0.16) / 0.06;
      ctx.globalAlpha = 0.85 * k;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = shade(st.deep, -20);
      ctx.lineWidth = Math.max(3, sc * 0.08);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Three thin dark sound-lines arc inside the white.
      ctx.globalAlpha = 0.75 * k;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(1.6, sc * 0.036);
      for (let r = 0; r < 3; r++) {
        const rr = rPx * (0.3 + r * 0.2);
        ctx.beginPath();
        ctx.ellipse(px, py, rr, rr * squash, 0, -0.6 + r * 0.3, 1.2 + r * 0.3);
        ctx.stroke();
      }
      c.glow(c.wx, c.wy, c.radius, 0.8 * k);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // THE WORD FALLS: after the echo, one small gold mote drops
    // from mouth height (0.25→0.6), lands, and thumps a tiny ring.
    if (t > 0.25) {
      const u = Math.min(1, (t - 0.25) / 0.35);
      const x = px + sc * 0.2 * u;
      const y0 = py - sc * 0.85;
      const y = y0 + (py + sc * 0.1 - y0) * u * u;
      if (u < 1) {
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        ctx.ellipse(x, y, sc * 0.05, sc * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = st.core;
        ctx.fillRect(x - 1, y - sc * 0.03, Math.max(1.5, sc * 0.02), Math.max(1.5, sc * 0.02));
      } else if (t < 0.8) {
        // The thump: the real arrival, small and exact.
        const k = 1 - (t - 0.6) / 0.2;
        ctx.globalAlpha = 0.9 * k;
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(1.8, sc * 0.045);
        ctx.beginPath();
        ctx.ellipse(px + sc * 0.2, py + sc * 0.1, sc * 0.16 * (1 - k * 0.5), sc * 0.1 * (1 - k * 0.5), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

/**
 * SLAGFALL — "the cooling cake."
 * The forge's mouthful lands as one molten CAKE: a low round slab
 * with a cracked crust — glowing seams across its top that dim in
 * hard steps while two slow bubbles swell and pop. The cake never
 * really leaves: a disc of ember grains cools white → orange →
 * soot on the ground for ten seconds, readable the whole way.
 */
const slagfall: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    fire.deployments.plume!(asMatter(c), c.wx, c.wy, { scale: 0.9 });
    // Spatter drops out of the impact, splatting orange → dark.
    const rand = srand(c.seed ^ 0x51a7);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx, c.wy, 1, ['#ffb36a', '#ff8a3c'], {
        speed: 1 + rand(), life: 1, size: 0.055, gravity: 0, shape: 'drop',
        dir: rand() * Math.PI * 2, spread: 0.6,
        z: 0.3, vz: 1.6 + rand(), zg: 8, land: 'splat', layer: 'world',
        fade: '#c85a28', fadeAt: 0.4, fade3: '#4a3226',
      });
    }
    // THE CAKE'S LASTING BODY: a disc formation — dark rim grains
    // around inner embers that cool in steps, flickering.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.42, c.wy + Math.sin(a) * c.radius * 0.42,
        shade(c.st.deep, -14), { life: 9.5, size: 0.06 });
    }
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * c.radius * 0.32;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        '#fff1d8', {
          life: 9 + rand(), size: 0.055, flicker: 0.35,
          fade: '#ff8a3c', fadeAt: 0.2, fade2: '#4a3226', fade2At: 0.62,
        });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const R = rPx * 0.46;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE CAKE: a low slab — dark side face all around (thickness),
    // crusted top plane, glowing cracks that dim in hard steps.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = shade(st.deep, -20);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.05, R, R * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.03, R, R * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The crust cracks: three glowing seams, cooling in steps.
    const heat = t < 0.3 ? '#fff1d8' : t < 0.55 ? '#ffb36a' : '#c85a28';
    const rand = srand(c.seed ^ 0x51a8);
    ctx.globalAlpha = (t < 0.55 ? 0.95 : 0.75) * fade;
    ctx.strokeStyle = heat;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const r0 = R * (0.15 + rand() * 0.2);
      const r1 = R * (0.6 + rand() * 0.3);
      const kink = (rand() - 0.5) * 0.8;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py - sc * 0.03 + Math.sin(a) * r0 * squash);
      const rm = (r0 + r1) * 0.55;
      ctx.lineTo(px + Math.cos(a + kink * 0.5) * rm, py - sc * 0.03 + Math.sin(a + kink * 0.5) * rm * squash);
      ctx.lineTo(px + Math.cos(a + kink) * r1, py - sc * 0.03 + Math.sin(a + kink) * r1 * squash);
      ctx.stroke();
    }
    // The rim's heat line: the side face's top edge, cooling too.
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = heat;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.03, R * 0.98, R * 0.98 * squash, 0, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.5 * fade * (t < 0.5 ? 1 : 0.6));
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x51a9);
    ctx.save();
    // The pour flash: one bright falling gout, first frames only.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = '#ffb36a';
      ctx.lineWidth = Math.max(5, sc * 0.14);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 2.2);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.strokeStyle = '#fff1d8';
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 1.9);
      ctx.lineTo(px, py);
      ctx.stroke();
      c.glow(c.wx, c.wy, 1.3, 0.8 * k);
    }
    // THE BUBBLES: two swells rise off the crust and POP — each a
    // dome that grows, thins, and bursts into three tiny spits.
    for (let k = 0; k < 2; k++) {
      const born = 0.16 + k * 0.24;
      const u = (t - born) / 0.2;
      if (u < 0 || u > 1.2) continue;
      const bx = px + (rand() - 0.5) * sc * 0.4;
      const by = py - sc * 0.05 + (rand() - 0.5) * sc * 0.2 * squash;
      if (u < 1) {
        const rr = sc * 0.1 * u;
        ctx.globalAlpha = 0.95 * (1 - u * 0.4);
        ctx.strokeStyle = u < 0.7 ? '#ffb36a' : '#fff1d8';
        ctx.lineWidth = Math.max(1.8, sc * 0.045 * (1 - u * 0.5));
        ctx.beginPath();
        ctx.ellipse(bx, by - rr * 0.5, rr, rr * 0.7, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else {
        // The pop: three spits, once.
        const uPrev = ((t - c.frameDt * 1000 / 780) - born) / 0.2;
        if (uPrev < 1) {
          fire.deployments.burst!(asMatter(c),
            c.wx + (bx - px) / sc, c.wy + (by - py) / sc / squash, { scale: 0.4 });
        }
      }
    }
    ctx.restore();
  },
};

/**
 * SKY_SPLITS — "the seam and the drop."
 * The gap in the blade opens the SKY's gap: above the strike a
 * horizontal seam tears open — a dark slit with torn white edges —
 * and the bolt drops out of it VERTICALLY onto the mark. The seam
 * then zips shut with a traveling stitch-flash. Small branched
 * scorches stay where each visit landed.
 */
const sky_splits: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.65 });
    // The visit's scorch: a tiny three-grain branch.
    const rand = srand(c.seed ^ 0x5851);
    const a = rand() * Math.PI * 2;
    lay(c, c.wx2, c.wy2, '#fff9e0', {
      life: 7, size: 0.045, fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
    });
    lay(c, c.wx2 + Math.cos(a) * 0.14, c.wy2 + Math.sin(a) * 0.14, '#3a3630', { life: 7, size: 0.04 });
    lay(c, c.wx2 + Math.cos(a + 2.4) * 0.12, c.wy2 + Math.sin(a + 2.4) * 0.12, '#3a3630', { life: 7, size: 0.04 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    if (t < 0.16) return;
    const fade = 1 - t;
    // The landing print: a small hard double-ring under the drop.
    ctx.save();
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.2, sc * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.3, sc * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const seamY = py2 - sc * 1.7;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE SEAM: tears open 0→0.12 (a widening lens slit), hangs,
    // then zips shut 0.5→0.8 behind a traveling stitch-flash.
    const open = Math.min(1, t / 0.12);
    const zip = Math.min(1, Math.max(0, (t - 0.5) / 0.3));
    const W = sc * 0.85 * open * (1 - zip);
    const H = sc * 0.1 * open * (1 - zip);
    if (W > 1) {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = shade(st.deep, -26);
      ctx.beginPath();
      ctx.ellipse(px2, seamY, W, H, 0, 0, Math.PI * 2);
      ctx.fill();
      // Torn edges: jagged white lips above and below.
      ctx.globalAlpha = 0.97;
      ctx.strokeStyle = '#fff9e0';
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px2 - W, seamY);
        ctx.lineTo(px2 - W * 0.5, seamY + s * H * 1.4);
        ctx.lineTo(px2, seamY + s * H * 0.7);
        ctx.lineTo(px2 + W * 0.5, seamY + s * H * 1.5);
        ctx.lineTo(px2 + W, seamY);
        ctx.stroke();
      }
    }
    // The zipper: a bright stitch point running the seam shut.
    if (zip > 0 && zip < 1) {
      const zx = px2 - sc * 0.85 + zip * sc * 1.7;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      const g = Math.max(2.5, sc * 0.06);
      ctx.fillRect(zx - g / 2, seamY - g / 2, g, g);
    }
    // THE DROP: the bolt falls VERTICALLY out of the seam onto the
    // mark — a jagged white line with a dark bed, re-striking on
    // its own beat while the seam hangs open.
    if (t > 0.06 && t < 0.5) {
      const flicker = 0.7 + 0.3 * Math.sin(c.now / 45);
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.55 : 0.95) * flicker;
        ctx.strokeStyle = pass === 0 ? shade(st.deep, -8) : '#fff9e0';
        ctx.lineWidth = Math.max(pass === 0 ? 3.6 : 1.8, sc * (pass === 0 ? 0.09 : 0.042));
        ctx.beginPath();
        boltPath(ctx, px2, seamY + sc * 0.05, px2, py2 - sc * 0.1,
          c.seed ^ Math.floor(c.now / 120), sc * 0.14);
        ctx.stroke();
      }
    }
    // The landing star.
    if (t > 0.1 && t < 0.26) {
      const k = 1 - (t - 0.1) / 0.16;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fff9e0';
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.15, sc * 0.28, sc * 0.1, 4, 0.3, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.9, 0.55 * k);
    }
    ctx.restore();
  },
};

/**
 * GREEN_VERSE — "the sown line."
 * The song closes the distance and PLANTS as it goes: behind the
 * dash, sprout-curls spring up along the line — little unfurling
 * spirals, each with a venom bead at its tip — sway once, and
 * wilt. The bite at the arrival is a curled leaf-blade flash.
 * Green flickering flecks keep the sown line readable for eight
 * seconds: the verse, written in the dirt.
 */
const green_verse: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x9e01);
    // Venom drips off two sprouts; pollen motes rise gently.
    for (let k = 0; k < 2; k++) {
      const f = 0.35 + k * 0.3;
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f,
        1, ['#a0c050', '#7a9a3c'], {
          speed: 0.1, life: 1, size: 0.045, gravity: 0, shape: 'drop',
          z: 0.35, vz: -0.15, zg: 4, land: 'splat', layer: 'world', fade3: '#4a5c22',
        });
    }
    c.particles.burst(c.wx + (c.wx2 - c.wx) * 0.5, c.wy + (c.wy2 - c.wy) * 0.5, 4, ['#cfe8a0', '#a0c050'], {
      speed: 0.3, life: 1.2, size: 0.04, gravity: 0, shape: 'glint',
      z: 0.2, vz: 0.5, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.4,
    });
    // THE SOWN LINE: flickering green flecks along the lane.
    for (let k = 0; k < 6; k++) {
      const f = (k + 0.5) / 6;
      lay(c, c.wx + (c.wx2 - c.wx) * f + (rand() - 0.5) * 0.12,
        c.wy + (c.wy2 - c.wy) * f + (rand() - 0.5) * 0.12,
        k % 2 === 0 ? '#a0c050' : '#6faa74',
        { life: 8, size: 0.05, flicker: 0.3 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const rand = srand(c.seed ^ 0x9e02);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'round';
    // THE SPROUTS: five spiral curls spring up along the traveled
    // line, each unfurling (a growing arc), swaying once, wilting.
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      const born = 0.06 + f * 0.24; // they spring behind the runner
      const grow = Math.min(1, Math.max(0, (t - born) / 0.18));
      if (grow <= 0) continue;
      const wilt = Math.min(1, Math.max(0, (t - 0.62 - k * 0.04) / 0.25));
      const bx = px + dx * f + (rand() - 0.5) * sc * 0.14;
      const by = py + dy * f + (rand() - 0.5) * sc * 0.1;
      const H = sc * (0.26 + (k % 2) * 0.08) * grow * (1 - wilt * 0.6);
      const sway = Math.sin(c.now / 220 + k * 1.7) * 0.14 * (1 - wilt);
      ctx.globalAlpha = 0.95 * (1 - wilt * 0.5) * fade;
      ctx.strokeStyle = k % 2 === 0 ? '#6faa74' : '#4f8a54';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      // The curl: stem up, then a spiral hook at the top.
      ctx.quadraticCurveTo(bx + sway * sc * 0.3, by - H * 0.6, bx + sway * sc * 0.5, by - H);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(bx + sway * sc * 0.5 + sc * 0.045, by - H, sc * 0.055 * grow, sc * 0.055 * grow, 0, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();
      // The venom bead at the curl's tip.
      if (wilt < 0.5) {
        ctx.globalAlpha = 0.9 * (1 - wilt * 2) * fade;
        ctx.fillStyle = '#a0c050';
        ctx.beginPath();
        ctx.ellipse(bx + sway * sc * 0.5 + sc * 0.1, by - H - sc * 0.01, sc * 0.028, sc * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    // THE BITE: a curled leaf-blade flash at the arrival — one
    // folded green crescent snapping open and shut.
    if (t < 0.2) {
      const k = t / 0.2;
      const open = Math.sin(k * Math.PI);
      const hy = py2 - sc * 0.5;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.075);
      ctx.beginPath();
      ctx.ellipse(px2, hy, sc * 0.3, sc * 0.3 * open, 0.5, Math.PI * 0.2, Math.PI * 1.2);
      ctx.stroke();
      ctx.globalAlpha = 0.97;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px2, hy, sc * 0.34, sc * 0.34 * open, 0.5, Math.PI * 0.3, Math.PI * 1.1);
      ctx.stroke();
      ctx.restore();
      c.glow(c.wx2, c.wy2, 0.7, 0.4 * (1 - k));
    }
  },
};

/**
 * SUN_COURT — "the raised dais."
 * Court convenes HERE, and the floor agrees: the ground under the
 * caster rises as a low gold-lit dais — a cylinder step with a
 * shadowed side face and a bright top — while three step-rings
 * ripple OUTWARD AND DOWN, each lower and darker than the last:
 * an amphitheater inverted, everyone else dismissed down the
 * stairs. The dais print stays: a gold rim circle and radial
 * step-lines on the turf.
 */
const sun_court: AbilitySig = {
  spawn(c) {
    fire.deployments.burst!(asMatter(c), c.wx, c.wy, { scale: 0.6 });
    // The dais print: gold rim grains + four radial step-line pairs.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.5, c.wy + Math.sin(a) * 0.5,
        k % 2 === 0 ? c.st.spark : c.st.mid,
        { life: 8.5, size: 0.05, fade: shade(c.st.mid, -16), fadeAt: 0.45 });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      lay(c, c.wx + Math.cos(a) * 0.95, c.wy + Math.sin(a) * 0.95,
        shade(c.st.deep, -10), { life: 8, size: 0.05 });
      lay(c, c.wx + Math.cos(a) * 1.4, c.wy + Math.sin(a) * 1.4,
        shade(c.st.deep, -14), { life: 8, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const rise = Math.min(1, t / 0.2);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE STEPS DOWN: three rings ripple outward 0.15→0.7, each
    // drawn as a step EDGE — a lit tread line over a dark riser
    // band — successively darker: the courtroom descends away.
    for (let k = 0; k < 3; k++) {
      const born = 0.12 + k * 0.14;
      const u = Math.min(1, Math.max(0, (t - born) / 0.5));
      if (u <= 0) continue;
      const rr = rPx * (0.42 + (k + u) * 0.2);
      const dim = 1 - k * 0.22;
      ctx.globalAlpha = 0.75 * fade * dim * (1 - u * 0.4);
      ctx.strokeStyle = shade(st.deep, -8 - k * 6);
      ctx.lineWidth = Math.max(4, sc * 0.12);
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.04 * (k + 1), rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * fade * dim * (1 - u * 0.3);
      ctx.strokeStyle = k === 0 ? st.spark : shade(st.mid, -k * 10);
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.04 * k, rr * 0.98, rr * 0.98 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE DAIS: the caster's step up — dark side-face band under a
    // gold-lit top disc, risen from grade.
    const lift = sc * 0.12 * rise;
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = shade(st.deep, -18);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.02, sc * 0.52, sc * 0.52 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(st.mid, 10);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.02 - lift, sc * 0.5, sc * 0.5 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.02 - lift, sc * 0.5, sc * 0.5 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.45 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The convening: a gold gavel-flash over the dais, once, and
    // heat shimmer ticks rising off the top while court sits.
    if (t > 0.16 && t < 0.3) {
      const k = 1 - (t - 0.16) / 0.14;
      ctx.save();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.9, sc * 0.3, sc * 0.11, 5, c.now / 400, squash);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx, c.wy, 1, 0.5 * k);
    }
    if (t > 0.2 && t < 0.8 && Math.random() < c.frameDt * 10) {
      c.particles.burst(c.wx, c.wy, 1, [st.spark, st.core], {
        speed: 0.25, life: 0.7, size: 0.045, gravity: 0, shape: 'glint',
        z: 0.2, vz: 0.9, zg: 0, land: 'none', layer: 'world', shadow: 0,
      });
    }
  },
};

/**
 * STILL_AIR — "the hung dust."
 * The air stops an arm's length around, and the proof is the
 * dust: a scatter of motes hangs DEAD STILL through the volume —
 * no shimmer, no drift — and one falling leaf halts mid-air at
 * knee height. When the art ends, everything resumes at once:
 * motes and leaf drop together. The leaf lies where it lands,
 * and a faint ring of settled dust marks where the stillness held.
 */
const still_air: AbilitySig = {
  spawn(c) {
    frost.deployments.bloom!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.5, dur: 0.5, scale: 0.5 });
    // The stillness's rim: settled dust in a faint ring + the leaf.
    const rand = srand(c.seed ^ 0x571a);
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8,
        shade(c.st.deep, 6), { life: 7.5, size: 0.04 });
    }
    lay(c, c.wx + 0.3, c.wy + 0.14, '#8a9a5a', { life: 9, size: 0.075 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // The boundary: where moving air meets stopped air — a faint
    // double ring, absolutely static (it does not pulse; nothing
    // in here moves).
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(3.2, sc * 0.085);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.98, rPx * 0.98 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x571b);
    const resume = Math.max(0, (t - 0.82) / 0.18); // everything falls
    ctx.save();
    // THE HUNG DUST: fourteen motes scattered through the volume,
    // each at its own height — utterly motionless until the resume,
    // then dropping together.
    for (let k = 0; k < 14; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.8;
      const h = sc * (0.15 + rand() * 0.85);
      const gx = px + Math.cos(a) * rr;
      let gy = py + Math.sin(a) * rr * squash - h;
      let al = 0.85;
      if (resume > 0) {
        gy += resume * resume * sc * 1.4;
        al *= 1 - resume;
      }
      ctx.globalAlpha = al;
      ctx.fillStyle = k % 3 === 0 ? st.core : k % 3 === 1 ? shade(st.mid, 10) : shade(st.deep, 14);
      const g = Math.max(1.8, sc * (0.028 + (k % 3) * 0.008));
      ctx.fillRect(gx - g / 2, gy - g / 2, g, g);
    }
    // THE LEAF: mid-fall, stopped at knee height — a small green
    // blade frozen at a tilt; at the resume it finishes its fall
    // with one last see-saw.
    const lx = px + sc * 0.3;
    const ly0 = py - sc * 0.34;
    if (t < 0.98) {
      let ly = ly0;
      let rot = 0.5;
      let al = 0.95;
      if (resume > 0) {
        ly = ly0 + resume * resume * (py + sc * 0.14 - ly0);
        rot = 0.5 + Math.sin(resume * Math.PI * 2) * 0.5;
        al = 1 - resume * 0.4;
      }
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.globalAlpha = al;
      ctx.fillStyle = '#8a9a5a';
      ctx.beginPath();
      ctx.ellipse(0, 0, sc * 0.11, sc * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a6a3a';
      ctx.lineWidth = Math.max(1.2, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(-sc * 0.09, 0);
      ctx.lineTo(sc * 0.09, 0);
      ctx.stroke();
      ctx.restore();
      // Its tiny contact shadow waits on the ground below.
      ctx.globalAlpha = 0.3 * al;
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(lx, py + sc * 0.14, sc * 0.08, sc * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The stop itself: one clean inward blink at cast — the only
    // motion the fx allows itself before the resume.
    if (t < 0.08) {
      const k = 1 - t / 0.08;
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      const rr = rPx * (0.92 + k * 0.2);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.3, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, c.radius, 0.4 * k);
    }
    ctx.restore();
  },
};
// ============== THE BREATH BETWEEN RUNGS — the onehand breath wave
// Ten new set-pieces, five casted and five channeled. The channel
// signatures are ONE BEAT'S WORTH (the quicksilver law — the server
// re-broadcasts the shape per beat, so beats chain into the held
// working). Aftermath outlives the painted window through the
// library: coals settle and lie, fog sinks and stays, static stands.

/**
 * EMBER_EDGE — "the kindled wake."
 * The cut is drawn through fire and the fire STAYS DRAWN: a burning
 * crescent seam hangs where the edge passed, small flame tongues
 * standing on it, and the coals the swing shed lie in the grass
 * glowing after everything else is gone.
 */
const ember_edge: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const bw = { x: c.wx + Math.cos(c.dir) * c.radius * 0.6, y: c.wy + Math.sin(c.dir) * c.radius * 0.6 };
    // The cut breathes fire down the aim...
    fire.deployments.fan!(m, c.wx, c.wy, { dir: c.dir, scale: 0.6 });
    // ...and sheds true coals that land and LIE, smoldering (the
    // settle law is the aftermath — grass on fire for seconds).
    fire.deployments.gobbets!(m, bw.x, bw.y, { dir: c.dir, scale: 0.5 });
    fire.deployments.pool!(m, bw.x, bw.y, { radius: c.radius * 0.4, scale: 0.45, dur: 2.2 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x5ed6e);
    const fade = t < 0.45 ? 1 : (1 - t) / 0.55;
    const a0 = dir - 0.62;
    const a1 = dir + 0.62;
    ctx.save();
    ctx.lineCap = 'butt';
    // The kindled wake: a FILLED burning band where the edge passed —
    // char bed, ember body, white seam. Area, not hairline.
    const band = (r0: number, r1: number, col: string, al: number): void => {
      ctx.globalAlpha = al * fade;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * r1, rPx * r1 * squash, 0, a0, a1);
      ctx.ellipse(px, py, rPx * r0, rPx * r0 * squash, 0, a1, a0, true);
      ctx.fill();
    };
    band(0.5, 0.88, st.deep, 0.5);
    band(0.56, 0.8, st.mid, 0.7);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.68, rPx * 0.68 * squash, 0, a0, a1);
    ctx.stroke();
    // Flame tongues standing ON the wake: hard triangle licks, each
    // breathing on its own seeded clock, core hearts inside the tall
    // ones — real height over the 2.5D ground.
    for (let i = 0; i < 7; i++) {
      const a = a0 + (0.08 + 0.84 * ((i + rand() * 0.7) / 7)) * (a1 - a0);
      const p = pt(c, rPx * (0.6 + 0.16 * rand()), a);
      const breathe = 0.65 + 0.35 * Math.sin(c.now / 85 + i * 2.1);
      const h = sc * (0.34 + 0.3 * rand()) * breathe * fade;
      const w = sc * (0.07 + 0.03 * rand());
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = i % 2 === 0 ? st.mid : st.spark;
      ctx.beginPath();
      ctx.moveTo(p.x - w, p.y);
      ctx.lineTo(p.x - w * 0.2, p.y - h);
      ctx.lineTo(p.x + w, p.y);
      ctx.closePath();
      ctx.fill();
      if (h > sc * 0.3) {
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.moveTo(p.x - w * 0.4, p.y);
        ctx.lineTo(p.x - w * 0.1, p.y - h * 0.55);
        ctx.lineTo(p.x + w * 0.4, p.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, c.radius, 0.55 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, dir, px, py, rPx, squash } = c;
    if (t < 0.42) {
      // The edge itself: a filled sweep wedge chasing through the arc,
      // white at the leading edge — the strike reads, the fire stays.
      const dt = t / 0.42;
      const lead = dir - 0.62 + dt * 1.24;
      ctx.save();
      ctx.globalAlpha = 0.85 * (1 - dt * 0.45);
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.85, rPx * 0.85 * squash, 0, lead - 0.42, lead);
      ctx.ellipse(px, py, rPx * 0.5, rPx * 0.5 * squash, 0, lead, lead - 0.42, true);
      ctx.fill();
      ctx.globalAlpha = 0.95 * (1 - dt * 0.3);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.5, sc * 0.09);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.85, rPx * 0.85 * squash, 0, lead - 0.16, lead);
      ctx.stroke();
      ctx.restore();
    }
    if (t < 0.6 && Math.random() < c.frameDt * 20) {
      const a = dir - 0.62 + Math.min(1, t / 0.42) * 1.24;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7, 2, [st.spark, st.core], {
        speed: 1.1, life: 0.55, size: 0.08, gravity: 1.6, shape: 'glint',
      });
    }
  },
};

/**
 * MILLWORK — "the grindstone round."
 * One beat of the held wheel: the blade's reach is a stone rim being
 * dressed — a dark groove sector grinds past the aim, radial dressing
 * scratches inside it, and steel-on-stone sparks jump OFF the rim at
 * the leading edge. Grit lands and lies. Nothing detonates; the
 * whole picture is work.
 */
const millwork: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // Grist off the wheel: a low kick of true earth at the leading
    // edge of this beat's sector.
    dust.deployments.kick!(m, c.wx + Math.cos(c.dir) * c.radius * 0.8, c.wy + Math.sin(c.dir) * c.radius * 0.8, {
      dir: c.dir, scale: 0.45,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x311e);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    const spin = t * 1.3; // the sector grinds forward through the beat
    const a0 = dir - 1.2 + spin;
    const a1 = dir + 1.2 + spin;
    ctx.save();
    ctx.lineCap = 'butt';
    // The dressed groove: a FILLED channel worn at the blade's reach,
    // dark bed with a lit outer lip — a stone being trued.
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, a0, a1);
    ctx.ellipse(px, py, rPx * 0.62, rPx * 0.62 * squash, 0, a1, a0, true);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, a0, a1);
    ctx.stroke();
    // Dressing scratches: radial scores inside the groove — the pass
    // this beat made, written plain.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    for (let i = 0; i < 6; i++) {
      const a = a0 + ((i + rand() * 0.6) / 6) * (a1 - a0);
      const pIn = pt(c, rPx * 0.66, a);
      const pOut = pt(c, rPx * 0.9, a);
      ctx.beginPath();
      ctx.moveTo(pIn.x, pIn.y);
      ctx.lineTo(pOut.x, pOut.y);
      ctx.stroke();
    }
    // Grit chunks thrown clear, lying where they fell.
    ctx.globalAlpha = 0.7 * fade;
    for (let i = 0; i < 4; i++) {
      const a = a1 + rand() * 0.6;
      const p = pt(c, rPx * (0.98 + rand() * 0.3), a);
      const s = Math.max(2, sc * (0.045 + rand() * 0.03));
      ctx.fillStyle = i % 2 === 0 ? st.spark : st.deep;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, dir, px, py } = c;
    // The hub takes the beat: a brief flash at the turning center.
    if (t < 0.16) {
      ctx.save();
      ctx.globalAlpha = (1 - t / 0.16) * 0.55;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.3, sc * 0.16, sc * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Steel-on-stone: sparks jump off the rim at the leading edge —
    // emission-gated, brief, dying to soot like real grinder spray.
    if (t < 0.75 && Math.random() < c.frameDt * 30) {
      const a = dir + 1.2 + t * 1.3;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85, 2, [st.spark, '#fff6d8'], {
        speed: 2.8, life: 0.4, size: 0.07, gravity: 3.2, dir: a + 0.5, spread: 0.5,
        shape: 'streak', fade: st.deep, fadeAt: 0.55,
      });
    }
  },
};

/**
 * LEVINSTROKE — "the sky's seam."
 * The thrown storm arrives BEFORE its thunder reads: at impact the
 * levin re-lights top-down onto the wound, char forks run out of the
 * strike, and then the seam STANDS — small aurora flags shivering
 * over the scar while the standing charge crackles itself out.
 */
const levinstroke: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    storm.deployments.impact!(m, c.wx, c.wy, { scale: 0.75 });
    // The charge stays: static stands on the struck ground after the
    // flash — the aurora's floor.
    storm.deployments.static!(m, c.wx, c.wy, { radius: 0.55, scale: 0.5, dur: 1.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x1e51);
    const fade = t < 0.4 ? 1 : (1 - t) / 0.6;
    ctx.save();
    ctx.lineCap = 'butt';
    // Char forks: three seeded scars running out of the strike, each
    // a kinked two-segment line — the seam the sky left in the turf.
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const r1 = sc * (0.35 + rand() * 0.3);
      const r2 = r1 + sc * (0.25 + rand() * 0.3);
      const kink = a + (rand() - 0.5) * 0.9;
      const m1 = { x: px + Math.cos(a) * r1, y: py + Math.sin(a) * r1 * squash };
      const m2 = { x: m1.x + Math.cos(kink) * (r2 - r1), y: m1.y + Math.sin(kink) * (r2 - r1) * squash };
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.075);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(m1.x, m1.y);
      ctx.lineTo(m2.x, m2.y);
      ctx.stroke();
      // A lit thread inside the young scar.
      if (t < 0.4) {
        ctx.globalAlpha = (1 - t / 0.4) * 0.95;
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1.5, sc * 0.032);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(m1.x, m1.y);
        ctx.lineTo(m2.x, m2.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    if (t < 0.2) {
      // The re-strike: the levin re-lights from the sky onto the
      // wound — deep stroke then core stroke, re-kinked every 45 ms,
      // with a white burst star where it meets the ground.
      const flick = Math.floor(c.now / 45);
      const k = 1 - t / 0.2;
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3.5, sc * 0.13);
      ctx.beginPath();
      boltPath(ctx, px + sc * 0.35, py - sc * 2.6, px, py, c.seed ^ flick, sc * 0.32);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.055);
      ctx.beginPath();
      boltPath(ctx, px + sc * 0.35, py - sc * 2.6, px, py, c.seed ^ flick, sc * 0.32);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.42 * (1 + t * 2), sc * 0.16, 4, flick * 0.3, c.squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.4, 0.7 * k);
    } else {
      // The seam stands: four aurora flags shivering over the scar —
      // banners of charge whose heights breathe on the wall clock,
      // each capped with a bright head.
      const rand = srand(c.seed ^ 0xa02a);
      for (let i = 0; i < 4; i++) {
        const x = px + (rand() - 0.5) * sc * 1.2;
        const wob = Math.sin(c.now / 110 + i * 2.4);
        const h = sc * (0.5 + 0.3 * wob * wob);
        const w = Math.max(2, sc * 0.055);
        ctx.globalAlpha = 0.65 * (1 - t);
        ctx.fillStyle = i % 2 === 0 ? st.mid : st.spark;
        ctx.fillRect(x, py - sc * 0.45 - h, w, h);
        ctx.globalAlpha = 0.9 * (1 - t);
        ctx.fillStyle = st.core;
        ctx.fillRect(x, py - sc * 0.45 - h, w, Math.max(2, sc * 0.05));
      }
    }
    ctx.restore();
  },
};

/**
 * RED_LEDGER — "the ruled line."
 * One beat of the account: the tether is a double-ruled ledger line
 * drawn taut from hand to debtor, and ENTRIES cross it left to right
 * as the beat writes — short tally ticks, each paid for in a bead of
 * red that slides home to the hand. Bookkeeping, in blood.
 */
const red_ledger: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The cost leaves the body: a small spray at the far end, back
    // along the line; the hand's end drips what the book absorbs.
    const back = Math.atan2(c.wy - c.wy2, c.wx - c.wx2);
    blood.deployments.spray!(m, c.wx2, c.wy2, { dir: back, scale: 0.45 });
    blood.deployments.drip!(m, c.wx, c.wy, { scale: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x1ed6);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.save();
    ctx.lineCap = 'butt';
    // The page: a narrow dark band the rules sit on — the ledger
    // itself laid between hand and debtor.
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.moveTo(px + nx * sc * 0.12, py + ny * sc * 0.12);
    ctx.lineTo(px2 + nx * sc * 0.12, py2 + ny * sc * 0.12);
    ctx.lineTo(px2 - nx * sc * 0.12, py2 - ny * sc * 0.12);
    ctx.lineTo(px - nx * sc * 0.12, py - ny * sc * 0.12);
    ctx.closePath();
    ctx.fill();
    // The double rule: two ruled lines, red over dark.
    for (const side of [-1, 1]) {
      const off = sc * 0.09 * side;
      ctx.globalAlpha = (side < 0 ? 0.9 : 0.7) * fade;
      ctx.strokeStyle = side < 0 ? st.mid : st.deep;
      ctx.lineWidth = Math.max(2, sc * (side < 0 ? 0.05 : 0.035));
      ctx.beginPath();
      ctx.moveTo(px + nx * off, py + ny * off);
      ctx.lineTo(px2 + nx * off, py2 + ny * off);
      ctx.stroke();
    }
    // The entries: tally ticks written outward as the beat spends —
    // each appears at its moment, flashes white, and stays.
    const wrote = Math.min(1, t / 0.75);
    for (let i = 0; i < 5; i++) {
      const at = 0.18 + i * 0.15;
      if (wrote < at * 0.9) break;
      const fresh = Math.max(0, 1 - (wrote - at * 0.9) * 6);
      const jig = (rand() - 0.5) * 0.04;
      const x = px + dx * (at + jig);
      const y = py + dy * (at + jig);
      const tickLen = sc * (0.16 + rand() * 0.06);
      ctx.globalAlpha = (0.85 + 0.15 * fresh) * fade;
      ctx.strokeStyle = fresh > 0.3 ? st.core : st.spark;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(x - nx * tickLen, y - ny * tickLen);
      ctx.lineTo(x + nx * tickLen, y + ny * tickLen);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    // The payment: beads of red sliding HOME along the line — each
    // entry's worth arriving at the hand, trailing a thin wake.
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const at = 1 - ((t * 1.6 + i * 0.33) % 1);
      const x = px + (px2 - px) * at;
      const y = py + (py2 - py) * at - sc * 0.3;
      const s = Math.max(3, sc * (0.1 - i * 0.015));
      ctx.globalAlpha = 0.6 * (1 - t * 0.4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (px2 - px) * 0.07, y + (py2 - py) * 0.07);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * (1 - t * 0.4);
      ctx.fillStyle = i === 0 ? st.core : st.mid;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    // The hand's end keeps a kept-red gleam while the book is open.
    ctx.globalAlpha = 0.7 * (1 - t);
    ctx.fillStyle = st.core;
    const g = Math.max(3, sc * 0.12);
    ctx.fillRect(px - g / 2, py - sc * 0.36 - g / 2, g, g);
    c.glow(c.wx, c.wy, 0.7, 0.3 * (1 - t));
    ctx.restore();
  },
};

/**
 * COLD_IRON — "the nail of winter."
 * The cast drives an iron point into a chosen ring from above: the
 * spike falls, bites, and hoarfrost CLAWS out of the wound — six
 * jagged rime rays running outward with standing ice teeth between
 * them, cold fog pooling and sinking after. The rime stays written
 * on the ground long after the strike.
 */
const cold_iron: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    frost.deployments.shatter!(m, c.wx, c.wy, { scale: 0.8 });
    // The cold pools and SINKS — winter lingering in the ring.
    frost.deployments.fog!(m, c.wx, c.wy, { radius: c.radius * 0.9, scale: 0.6, dur: 2.2 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc01d);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    const grow = Math.min(1, Math.max(0, (t - 0.12) / 0.35)); // the claws run out after the bite
    ctx.save();
    ctx.lineCap = 'butt';
    // The ice sheet: pale panes filling the wedges between rays —
    // the ground visibly TAKEN by winter, not just marked.
    ctx.globalAlpha = 0.22 * fade * grow;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rPx * 0.8 * grow, squash, 12, 0.24, rand() * Math.PI, c.seed ^ 3);
    ctx.fill();
    // Six rime rays clawing outward: kinked spears of ice, white
    // thread over pale body, each with its own seeded reach.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      const reach = rPx * (0.6 + rand() * 0.45) * grow;
      const kink = a + (rand() - 0.5) * 0.5;
      const m1 = { x: px + Math.cos(a) * reach * 0.55, y: py + Math.sin(a) * reach * 0.55 * squash };
      const m2 = { x: m1.x + Math.cos(kink) * reach * 0.45, y: m1.y + Math.sin(kink) * reach * 0.45 * squash };
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.085);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(m1.x, m1.y);
      ctx.lineTo(m2.x, m2.y);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(m1.x, m1.y);
      ctx.stroke();
    }
    // Standing teeth between the rays: hard ice triangles with white
    // crowns — real height rising off the claimed sheet.
    for (let k = 0; k < 5; k++) {
      const a = ((k + 0.5) / 5) * Math.PI * 2 + rand() * 0.4;
      const p = pt(c, rPx * (0.42 + rand() * 0.3), a);
      const h = sc * (0.26 + rand() * 0.22) * grow;
      const w = sc * 0.075;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(p.x - w, p.y);
      ctx.lineTo(p.x - w * 0.15, p.y - h);
      ctx.lineTo(p.x + w, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(p.x - w * 0.35, p.y - h * 0.45);
      ctx.lineTo(p.x - w * 0.1, p.y - h);
      ctx.lineTo(p.x + w * 0.35, p.y - h * 0.45);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.35 * fade * grow);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    if (t < 0.12) {
      // The nail: a dark iron spike falling out of the sky, core edge
      // forward — the read is the DROP, not a flash.
      const dt = t / 0.12;
      const drop = (1 - dt) * sc * 2.1;
      const h = sc * 1.15;
      const w = Math.max(3, sc * 0.16);
      ctx.globalAlpha = 0.6 + 0.4 * dt;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(px - w, py - drop - h);
      ctx.lineTo(px + w, py - drop - h);
      ctx.lineTo(px, py - drop);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(px - w * 0.32, py - drop - h);
      ctx.lineTo(px + w * 0.32, py - drop - h);
      ctx.lineTo(px, py - drop);
      ctx.closePath();
      ctx.fill();
    } else if (t < 0.32) {
      // The bite: a white impact star, then winter's work.
      const ft = 1 - (t - 0.12) / 0.2;
      ctx.globalAlpha = ft * 0.95;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.5 * (1.4 - ft * 0.4), sc * 0.18, 4, 0.4, c.squash);
      ctx.fill();
      c.glow(c.wx, c.wy, c.radius, 0.55 * ft);
    }
    // Frost-fall: sparse glints sinking (cold air falls).
    if (t > 0.2 && Math.random() < c.frameDt * 10) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * c.radius, c.wy + (Math.random() - 0.5) * c.radius * 0.6, 1, [st.core, st.spark], {
        speed: 0.2, life: 0.8, size: 0.05, gravity: 0.7, shape: 'glint',
      });
    }
    ctx.restore();
  },
};

/**
 * FROSTWORK — "the window fern."
 * One beat of the held pattern: frost grows the way it grows on
 * glass — fern arms running outward from the planted feet, each arm
 * throwing side-teeth as it goes, a faint claimed ring behind them.
 * Every beat seeds NEW arms, so the held note reads as winter
 * working, ring by ring, and the rime it writes stays.
 */
const frostwork: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const rand = srand(c.seed ^ 0xfe57);
    // Ice grains shatter off two seeded arm tips and lie where they
    // fall — the pattern sheds real matter.
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      frost.deployments.shatter!(m, c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7, { scale: 0.35 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xf3a9);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const grow = Math.min(1, t / 0.4);
    ctx.save();
    ctx.lineCap = 'butt';
    // The claimed pane: frost filling the beat's reach, edged DARK so
    // winter reads on pale stone as surely as on grass.
    ctx.globalAlpha = 0.26 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rPx * grow, squash, 10, 0.1, rand() * Math.PI, c.seed);
    ctx.fill();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rPx * grow, squash, 10, 0.1, rand() * Math.PI, c.seed);
    ctx.stroke();
    // Five fern arms, each with two side-teeth and a crystal at the
    // tip: the etch running out, the way frost takes a windowpane.
    // Every pale line rides a deep under-stroke (the contrast law).
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.7;
      const reach = rPx * (0.6 + rand() * 0.4) * grow;
      const tip = { x: px + Math.cos(a) * reach, y: py + Math.sin(a) * reach * squash };
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.095);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      // Side-teeth: barbs off the arm at 40% and 70%, dark then pale.
      for (const frac of [0.4, 0.7]) {
        const bx = px + Math.cos(a) * reach * frac;
        const by = py + Math.sin(a) * reach * frac * squash;
        const ba = a + (rand() > 0.5 ? 0.8 : -0.8);
        const bl = reach * 0.22;
        ctx.globalAlpha = 0.7 * fade;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl * squash);
        ctx.stroke();
        ctx.globalAlpha = 0.9 * fade;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.5, sc * 0.032);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl * squash);
        ctx.stroke();
      }
      // The tip crystal: a rotated diamond, dark setting, white heart.
      const d = Math.max(3, sc * 0.11) * grow;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y - d * 1.25);
      ctx.lineTo(tip.x + d * 0.9, tip.y);
      ctx.lineTo(tip.x, tip.y + d * 0.75);
      ctx.lineTo(tip.x - d * 0.9, tip.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y - d);
      ctx.lineTo(tip.x + d * 0.7, tip.y);
      ctx.lineTo(tip.x, tip.y + d * 0.6);
      ctx.lineTo(tip.x - d * 0.7, tip.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * grow, 0.35 * fade);
  },
  air(c) {
    const { st, t } = c;
    // Winter's dust: sparse glints sinking over the pattern — the
    // cold visibly falling out of the air the note holds open.
    if (t < 0.8 && Math.random() < c.frameDt * 8) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * c.radius * 1.4, c.wy + (Math.random() - 0.5) * c.radius * 0.8, 1, [st.core, st.spark], {
        speed: 0.15, life: 0.9, size: 0.05, gravity: 0.6, shape: 'glint',
      });
    }
  },
};

/**
 * FIRST_LIGHT — "the door left open."
 * The dash is a doorway: two posts of light stand at the departure
 * with dawn tearing the gap between them, a bright afterline runs to
 * the arrival, and the door CLOSES behind you — the seam swallowing
 * itself from the departure end. Arrive like morning; leave no way
 * back.
 */
const first_light: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    radiance.deployments.bloom!(m, c.wx2, c.wy2, { scale: 0.6 });
    radiance.deployments.shafts!(m, c.wx, c.wy, { radius: 0.6, scale: 0.5, dur: 0.8 });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = 1 - t;
    // The afterline: the lit seam you crossed, swallowing itself from
    // the departure end as the door closes.
    const close = Math.min(1, t / 0.7);
    const sx = px + (px2 - px) * close;
    const sy = py + (py2 - py) * close;
    ctx.save();
    ctx.lineCap = 'butt';
    for (const [col, w, al] of [
      [st.mid, 0.13, 0.6],
      [st.core, 0.055, 0.95],
    ] as const) {
      ctx.globalAlpha = al * fade;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(2, sc * w);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    // The doorway: two posts of light at the departure, the gap
    // between them white with dawn — narrowing as the door shuts.
    const shut = 1 - Math.min(1, t / 0.7);
    const gap = sc * 0.3 * shut;
    const h = sc * 1.35 * (0.6 + 0.4 * shut);
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (const side of [-1, 1]) {
      ctx.globalAlpha = 0.85 * shut;
      ctx.fillStyle = st.mid;
      const x = px + nx * gap * side;
      const y = py + ny * gap * side - sc * 0.15;
      ctx.fillRect(x - Math.max(2, sc * 0.06), y - h, Math.max(4, sc * 0.12), h);
    }
    ctx.globalAlpha = 0.95 * shut;
    ctx.fillStyle = st.core;
    ctx.fillRect(px - gap * 0.7, py - sc * 0.15 - h * 0.94, gap * 1.4, h * 0.94);
    // Dawn spills through the gap: three light rays fanning toward
    // the arrival, long thin triangles off the doorway.
    ctx.globalAlpha = 0.4 * shut;
    ctx.fillStyle = st.spark;
    for (let i = -1; i <= 1; i++) {
      const spread = i * sc * 0.4;
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 0.7);
      ctx.lineTo(px + dx * 0.55 + nx * spread, py + dy * 0.55 + ny * spread - sc * 0.4);
      ctx.lineTo(px + dx * 0.55 + nx * (spread + sc * 0.12), py + dy * 0.55 + ny * (spread + sc * 0.12) - sc * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    if (shut > 0.1) c.glow(c.wx, c.wy, 1.1, 0.55 * shut);
    // The arrival: you land WITH the morning — a burst star and a
    // brief rising fan of glints where the dash ends.
    if (t < 0.22) {
      ctx.globalAlpha = (1 - t / 0.22) * 0.9;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.3, sc * 0.4, sc * 0.15, 4, 0.2, c.squash);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.9, 0.5 * (1 - t / 0.22));
    }
    if (t < 0.4 && Math.random() < c.frameDt * 22) {
      c.particles.burst(c.wx2, c.wy2, 2, [st.core, st.spark], {
        speed: 1.6, life: 0.55, size: 0.07, gravity: -0.8, up: true, shape: 'glint',
      });
    }
    ctx.restore();
  },
};

/**
 * LIVE_IRON — "the aurora banner."
 * One hop of the held circuit: the strike re-lights as a true jag,
 * and then the AIR over the line catches — a banner of thin aurora
 * flags rippling between singer and struck, charge ticks patrolling
 * the landing while static stands on the ground. The sky is part of
 * the circuit for as long as the note holds.
 */
const live_iron: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    storm.deployments.arc!(m, c.wx, c.wy, { x2: c.wx2, y2: c.wy2, scale: 0.6 });
    // The charge STAYS on the struck ground — each hop leaves a
    // standing patch of static behind the note.
    storm.deployments.static!(m, c.wx2, c.wy2, { radius: 0.5, scale: 0.45, dur: 1.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    const fade = 1 - t;
    // Charge ticks patrolling the landing: six short marks orbiting
    // the struck point — the circuit refusing to let go.
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    const spin = c.now / 260;
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      const r0 = sc * 0.38;
      const x0 = px2 + Math.cos(a) * r0;
      const y0 = py2 + Math.sin(a) * r0 * squash;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(px2 + Math.cos(a + 0.4) * r0, py2 + Math.sin(a + 0.4) * r0 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    if (t < 0.25) {
      // The hop re-lit: deep then core, re-kinked on the flicker
      // clock, a burst star biting at the landing.
      const flick = Math.floor(c.now / 45);
      const k = 1 - t / 0.25;
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.11);
      ctx.beginPath();
      boltPath(ctx, px, py - sc * 0.45, px2, py2 - sc * 0.3, c.seed ^ flick, sc * 0.26);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath();
      boltPath(ctx, px, py - sc * 0.45, px2, py2 - sc * 0.3, c.seed ^ flick, sc * 0.26);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.3, sc * 0.36, sc * 0.14, 4, flick * 0.4, c.squash);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 1.1, 0.6 * k);
    }
    // The aurora banner: five flags hung over the line, heights
    // breathing on the wall clock, each capped bright — the sky
    // caught in the circuit for as long as the note holds.
    const rand = srand(c.seed ^ 0xba9e);
    for (let i = 0; i < 5; i++) {
      const at = 0.12 + (i / 5) * 0.8 + rand() * 0.04;
      const x = px + (px2 - px) * at;
      const y = py + (py2 - py) * at;
      const wob = Math.sin(c.now / 130 + i * 1.9);
      const h = sc * (0.42 + 0.28 * wob * wob);
      const w = Math.max(2, sc * 0.055);
      ctx.globalAlpha = 0.6 * (1 - t * 0.7);
      ctx.fillStyle = i % 2 === 0 ? st.mid : st.spark;
      ctx.fillRect(x, y - sc * 0.7 - h, w, h);
      ctx.globalAlpha = 0.85 * (1 - t * 0.7);
      ctx.fillStyle = st.core;
      ctx.fillRect(x, y - sc * 0.7 - h, w, Math.max(2, sc * 0.045));
    }
    ctx.restore();
  },
};

/**
 * GLOOMFALL — "the lamps go out."
 * The nova is an extinguishing: nine small lamp-flames stand on the
 * ring at the moment it lands, and then — one by one, in seeded
 * order — they go OUT, each leaving a short smoke stub where its
 * light stood. Above the center, dusk lowers like a curtain. The
 * dark is not thrown; it ARRIVES.
 */
const gloomfall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    gloom.deployments.bloom!(m, c.wx, c.wy, { scale: 0.75 });
    gloom.deployments.tendrils!(m, c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.6 });
    // The dark lingers past the blast: a low veil that stays.
    smoke.deployments.veil!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.5, dur: 1.8 });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x910f);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // Nine lamps on the rim, each with a seeded snuff moment.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.3;
      const p = pt(c, rPx * (0.85 + rand() * 0.12), a);
      const snuff = 0.15 + rand() * 0.55; // when THIS lamp dies
      if (t < snuff) {
        // Still lit: a standing flame with a warm halo, guttering
        // harder as its moment comes.
        const dread = Math.max(0, 1 - (snuff - t) / 0.2);
        const g = 0.6 + 0.4 * Math.sin(c.now / (60 + 40 * (1 - dread)) + i * 2.2);
        const h = sc * 0.26 * g * (1 - dread * 0.4);
        const w = sc * 0.055;
        ctx.globalAlpha = 0.25 * fade * (1 - dread);
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - h * 0.4, sc * 0.12, sc * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath();
        ctx.moveTo(p.x - w, p.y);
        ctx.lineTo(p.x, p.y - h);
        ctx.lineTo(p.x + w, p.y);
        ctx.closePath();
        ctx.fill();
      } else if (t < snuff + 0.3) {
        // Snuffed: a smoke stub rising off the dead wick, leaning.
        const s = (t - snuff) / 0.3;
        ctx.globalAlpha = (1 - s) * 0.7 * fade;
        ctx.fillStyle = st.deep;
        const lean = sc * 0.08 * s;
        ctx.fillRect(p.x - Math.max(1.5, sc * 0.03) + lean, p.y - sc * (0.16 + 0.22 * s), Math.max(3, sc * 0.06), sc * 0.13);
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    if (t >= 0.5) return;
    // Dusk lowers: a wide two-toned curtain coming down over the
    // ring, its lower edge ragged — night arriving, not exploding.
    const dt = t / 0.5;
    const rand = srand(c.seed ^ 0xd07);
    const drop = sc * (1.9 - 1.5 * dt);
    const w = rPx * 1.05;
    ctx.save();
    for (const [inset, col, al] of [
      [0, st.deep, 0.65],
      [0.18, st.mid, 0.4],
    ] as const) {
      ctx.globalAlpha = al * (1 - dt * 0.35);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px - w * (1 - inset), py - drop - sc * 1.1);
      ctx.lineTo(px + w * (1 - inset), py - drop - sc * 1.1);
      for (let i = 5; i >= 0; i--) {
        const x = px - w * (1 - inset) + (i / 5) * w * (1 - inset) * 2;
        ctx.lineTo(x, py - drop + sc * (0.05 + rand() * 0.22) - inset * sc * 0.3);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * NOONFALL — "the noon bell."
 * One beat of held noon: a pillar of light SLAMS onto the staked
 * ring and rings it like a bell — two hard echo rings run outward
 * from the strike, the turf inside bleaches white, and dust motes
 * climb the standing shaft while it thins. The sun, used as a
 * hammer, at a place you chose.
 */
const noonfall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    radiance.deployments.rain!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.6, dur: 0.7 });
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The scald: turf bleached inside the struck ring, strongest
    // young — the mark of noon having stood here.
    ctx.globalAlpha = 0.32 * fade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.85, rPx * 0.85 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The bell note: two hard rings running out from the strike.
    for (const [lead, col] of [
      [0, st.core],
      [0.14, st.mid],
    ] as const) {
      const rt = Math.max(0, Math.min(1, (t - lead) / 0.6));
      if (rt <= 0 || rt >= 1) continue;
      ctx.globalAlpha = (1 - rt) * 0.9;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(2.5, sc * 0.08 * (1 - rt * 0.4));
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * (0.3 + 0.9 * rt), rPx * (0.3 + 0.9 * rt) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Rim sparkles: four star glints riding the young bell ring.
    if (t < 0.45) {
      const rand = srand(c.seed ^ 0x2001);
      ctx.fillStyle = st.spark;
      for (let i = 0; i < 4; i++) {
        const a = rand() * Math.PI * 2;
        const rr = rPx * (0.3 + 0.9 * Math.min(1, t / 0.6));
        const p = { x: px + Math.cos(a) * rr, y: py + Math.sin(a) * rr * squash };
        const s = Math.max(2, sc * 0.06);
        ctx.globalAlpha = (1 - t / 0.45) * 0.9;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // The pillar: slams in the first fifth, then stands and thins —
    // a wide slab of noon with a white core lane, tall enough to
    // read as the sky taking part.
    const slam = Math.min(1, t / 0.18);
    const stand = 1 - Math.max(0, (t - 0.18) / 0.82);
    const h = sc * 2.7 * slam;
    const w = sc * (0.85 * stand + 0.15);
    ctx.globalAlpha = 0.5 * stand + 0.35 * (1 - slam);
    ctx.fillStyle = st.mid;
    ctx.fillRect(px - w / 2, py - h, w, h);
    ctx.globalAlpha = 0.9 * stand;
    ctx.fillStyle = st.core;
    ctx.fillRect(px - w * 0.18, py - h, w * 0.36, h);
    if (t < 0.3) c.glow(c.wx, c.wy, c.radius * 1.2, 0.65 * (1 - t / 0.3));
    else c.glow(c.wx, c.wy, c.radius * 0.8, 0.25 * stand);
    // Motes climb the shaft: dust caught in the light, rising slow.
    if (t < 0.85 && Math.random() < c.frameDt * 16) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * 0.6, c.wy + (Math.random() - 0.5) * 0.35, 1, [st.spark, st.core], {
        speed: 0.35, life: 1.0, size: 0.055, gravity: -0.55, up: true, shape: 'glint',
      });
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- registry

export const BLADE_SIGS: Record<string, AbilitySig> = {
  sundering_chop,
  thorn_lash,
  quicksilver,
  riptide,
  cinder_arc,
  winters_edge,
  reapers_arc,
  red_harvest,
  storm_brand,
  kings_decree,
  sunburst,
  starfall_strike,
  vow_unbroken,
  // The ten crowns' sword arts.
  drag_under,
  spoken_light,
  slagfall,
  sky_splits,
  green_verse,
  sun_court,
  still_air,
  // THE BREATH BETWEEN RUNGS — the onehand breath wave.
  ember_edge,
  millwork,
  levinstroke,
  red_ledger,
  cold_iron,
  frostwork,
  first_light,
  live_iron,
  gloomfall,
  noonfall,
};
