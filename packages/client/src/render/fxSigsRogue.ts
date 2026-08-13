/**
 * THE SIGNATURE LAW — the knife-art roster (THE ARMORY REMEMBERS,
 * wave 2: the rogue's thirteen).
 *
 * Rebuilt ground-up to the three-strata bar. The rogue's grammar is
 * still precision, malice, and payment — but every art now speaks on
 * all three layers at once:
 *
 *   PRIMARY   the strike statement, painted inside the wire's life —
 *             small, sharp, jewel-crisp; never bombast.
 *   SECONDARY what flies off: true-altitude matter — scale glints,
 *             bone splints, black feathers, a royal gem on the bounce.
 *   TERTIARY  THE LASTING MARK — settled grains lying in deliberate
 *             formations for ~6-10 s: paired fang stains, a cast of
 *             knuckle-lots, a fulgurite socket, one lone white period.
 *
 * Binding laws as ever: hard edges, save/restore hygiene, squash on
 * ground y-radii, srand-deterministic geometry, frameDt-gated
 * emission, ≤ ~60 path ops per hook per frame. No centerpiece here
 * repeats another's, nor any of this file's former ones (the crawling
 * vein, the puncture pinch, the snapped pane, the knucklebone pin,
 * the closing jaw, the blood coinage, the inverted candle, the
 * earthed lash, the fallen crown, the full stop, the pruning, the
 * counted line, the rounds — all retired whole).
 */

import { shade } from './rig.js';
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { venom, dust, frost, shadow, blood, storm, asMatter } from './matter/index.js';

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

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~10s tertiary stratum; burst()'s ×0.7–1.3 life jitter
 * keeps formations from dying as one). The rogue's marks are small
 * and exact — stains, freckles, lots — never rubble.
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: { life?: number; size?: number; flicker?: number; fade?: string; fadeAt?: number; fade2?: string; fade2At?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05, life: opts.life ?? 8, size: opts.size ?? 0.055,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

// ------------------------------------------------------ serpents_kiss

/**
 * SERPENTS_KISS — "the shed skin."
 * The strike is too fast to see — what hangs after is what it LEFT:
 * a translucent snakeskin sleeve in the arc's shape, diamond-scaled,
 * peeling off the swing and sifting down scale by scale. One needle
 * of green whips through it at the start; the fangs sign the ground
 * in paired pinpricks that stay stained for ten seconds.
 */
const serpents_kiss: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5e01);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.62;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.62;
    // The bite lands wet: the library's venom, spat along the aim.
    venom.deployments.spit!(asMatter(c), hx, hy, { dir: c.dir, scale: 0.7 });
    // Scale glints sift off the shed sleeve, wobbling down.
    for (let k = 0; k < 6; k++) {
      const a = c.dir - 0.45 + (k / 5) * 0.9;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.62, c.wy + Math.sin(a) * c.radius * 0.62,
        1, [c.st.spark, c.st.mid], {
          speed: 0.2, life: 0.9, size: 0.05, gravity: 0, shape: 'glint',
          z: 0.5 + rand() * 0.2, vz: -0.1, zg: 1.6, land: 'die',
          layer: 'world', shadow: 0, wobble: 0.4,
        });
    }
    // THE FANG COUPLES: three paired pinprick stains along the bite
    // line — the serpent's signature, kept by the skin of the world.
    const nx = -Math.sin(c.dir);
    const ny = Math.cos(c.dir);
    for (let p = 0; p < 3; p++) {
      const along = (p - 1) * 0.34;
      for (let f = 0; f < 2; f++) {
        const off = (f === 0 ? 1 : -1) * 0.09;
        lay(c, hx + nx * (along + off), hy + ny * (along + off),
          f === 0 ? shade(c.st.deep, -14) : c.st.deep,
          { life: 9.5, size: 0.05 });
      }
      // A venom fleck glows between each couple, alive a while.
      lay(c, hx + nx * along, hy + ny * along, c.st.spark,
        { life: 7, size: 0.045, flicker: 0.35 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    if (t < 0.1) return;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    // A faint venom sheen under the sleeve — the wet the strike left.
    ctx.save();
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = shade(st.deep, -10);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.78, rPx * 0.78 * squash, 0, dir - 0.5, dir + 0.5);
    ctx.ellipse(c.px, c.py, rPx * 0.5, rPx * 0.5 * squash, dir + 0.5, dir - 0.5, 0, true);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const cy = py - sc * 0.42;
    ctx.save();
    ctx.lineCap = 'butt';
    // The needle: one whip-thin green strike line, out and gone.
    if (t < 0.12) {
      const k = 1 - t / 0.12;
      const sweep = dir - 0.45 + 0.9 * (1 - k);
      ctx.globalAlpha = 0.97 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.6, sc * 0.062);
      ctx.beginPath();
      ctx.ellipse(px, cy, rPx * 0.66, rPx * 0.66 * squash, 0, sweep - 0.4, sweep);
      ctx.stroke();
    }
    // THE SHED SKIN: the sleeve hangs in the arc's shape — two rows
    // of diamond scales on a translucent band — sagging and thinning
    // as it sifts away. Scales vanish on seeded clocks, not en masse.
    const rand = srand(c.seed ^ 0x5e02);
    const sag = t * sc * 0.3;
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    // The band bed first: a soft double stroke where the skin hangs.
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(5, sc * 0.16);
    ctx.beginPath();
    ctx.ellipse(px, cy + sag, rPx * 0.66, rPx * 0.66 * squash, 0, dir - 0.42, dir + 0.42);
    ctx.stroke();
    // The scales: nine diamonds riding two lattice rows.
    for (let k = 0; k < 9; k++) {
      const row = k % 2;
      const f = k / 8;
      const a = dir - 0.4 + f * 0.8;
      const rr = rPx * (0.62 + row * 0.09);
      const dieT = 0.45 + rand() * 0.5;
      if (t >= dieT) continue;
      const x = px + Math.cos(a) * rr;
      const y = cy + sag * (1 + row * 0.4) + Math.sin(a) * rr * squash;
      const g = sc * (0.11 - row * 0.02);
      ctx.globalAlpha = (row === 0 ? 0.97 : 0.8) * fade;
      ctx.fillStyle = row === 0 ? shade(st.mid, 8) : shade(st.mid, -14);
      ctx.beginPath();
      ctx.moveTo(x, y - g);
      ctx.lineTo(x + g * 0.8, y);
      ctx.lineTo(x, y + g);
      ctx.lineTo(x - g * 0.8, y);
      ctx.closePath();
      ctx.fill();
      // Each scale keeps one bright keel.
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = st.spark;
      ctx.fillRect(x - 1, y - g * 0.45, Math.max(2, sc * 0.028), g * 0.9);
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 0.7, 0.25 * (1 - t));
  },
};

// ------------------------------------------------------------ stinger

/**
 * STINGER — "the needle's gate."
 * The puncture is so clean the AIR keeps the hole: at the arrival a
 * lens-shaped void hangs where the needle went through — dark slit,
 * white rim — and slowly draws shut like a wound closing. The flight
 * is one gold needle-line; while the gate closes, a fine thread of
 * red drops falls from it and writes a dotted drip-line on the
 * ground that outstays everything.
 */
const stinger: AbilitySig = {
  spawn(c) {
    const { ux, uy } = dashFrame(c);
    const ang = Math.atan2(uy, ux);
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.5 });
    // Carry-through: two gold slivers past the gate.
    c.particles.burst(c.wx2, c.wy2, 2, [c.st.spark, c.st.core], {
      speed: 3, life: 0.25, size: 0.055, gravity: 0, dir: ang, spread: 0.2,
      shape: 'streak', z: 0.45, vz: 0.2, zg: 3, land: 'die', layer: 'world', shadow: 0,
    });
    // The bleed: four drops timed down the gate's closing — spawned
    // with stepped altitudes so they land in sequence, each a splat.
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, ['#c4372a', '#8e2a20'], {
        speed: 0.06, life: 1.6, size: 0.05, gravity: 0, shape: 'drop',
        z: 0.5 + k * 0.28, vz: -0.15, zg: 4.5, land: 'splat',
        layer: 'world', fade3: '#421410',
      });
    }
    // The dotted drip-line: fleck stains under the gate, in a row
    // the drops will agree with — the wound's ledger, kept 8 s.
    const rand = srand(c.seed ^ 0x5701);
    for (let k = 0; k < 4; k++) {
      lay(c, c.wx2 + (rand() - 0.5) * 0.14, c.wy2 + (k - 1.5) * 0.09,
        k % 2 === 0 ? '#63201a' : '#421410', { life: 8.5, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    if (t >= 0.4) return;
    // The stride: one thin gold rule along the traveled line, eaten
    // tail-first — the flight was a straight thought.
    const { ux, uy, len } = dashFrame(c);
    if (len < 1) return;
    const eaten = Math.min(1, t / 0.4);
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - eaten);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.036);
    ctx.beginPath();
    ctx.moveTo(px + ux * len * eaten, py + uy * len * eaten);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const hy = py2 - sc * 0.52;
    ctx.save();
    ctx.lineCap = 'butt';
    // The flight: the rogue compressed to a needle — one stretched
    // gold sliver arriving, gone by the first blink.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      const { ux, uy, len } = dashFrame(c);
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.5, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px2 - ux * len * 0.5, hy - uy * len * 0.5);
      ctx.lineTo(px2, hy);
      ctx.stroke();
    }
    // THE GATE: a lens-shaped hole in the air — filled dark slit
    // inside a bright rim — drawing shut over the fx's whole life.
    const close = 1 - t * 0.85;
    const H = sc * 0.54 * close;
    const W = sc * 0.16 * close * close;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.globalAlpha = 0.92 * fade;
    ctx.fillStyle = shade(st.deep, -26);
    ctx.beginPath();
    ctx.ellipse(px2, hy, W, H, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.97 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.2, sc * 0.052);
    ctx.beginPath();
    ctx.ellipse(px2, hy, W + sc * 0.025, H + sc * 0.025, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Gold pinch ticks at the gate's poles: the air gripping shut.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.032);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px2, hy + s * (H + sc * 0.05));
      ctx.lineTo(px2, hy + s * (H + sc * 0.13));
      ctx.stroke();
    }
    // The seal: when the gate finishes closing, one white click.
    if (t > 0.82 && t < 0.95) {
      const k = 1 - (t - 0.82) / 0.13;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, hy, sc * 0.16, sc * 0.06, 4, 0.4, 1);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.6, 0.3 * (1 - t));
  },
};

// ---------------------------------------------------------- cold_snap

/**
 * COLD_SNAP — "the stopped clock."
 * The first frost stops everything mid-motion: six motes of the
 * world hang frozen in the air, each sealed in its own ice lozenge,
 * all simply THERE on frame one. The ground becomes a mirror sheen
 * with one sliding specular wedge. At the thaw each lozenge cracks —
 * one kink line — and drops. Rime lies in a broken ring for seconds:
 * the circle the cold claimed, freckled white.
 */
const cold_snap: AbilitySig = {
  spawn(c) {
    frost.deployments.bloom!(asMatter(c), c.wx, c.wy, {
      radius: c.radius * 0.8, dur: 0.7, scale: 0.9,
    });
    // THE RIME RING: white freckles laid on the rim arc — a broken
    // ring, glittering while it lies.
    const rand = srand(c.seed ^ 0xc501);
    for (let k = 0; k < 10; k++) {
      const a = rand() * Math.PI * 2;
      const rr = c.radius * (0.82 + (rand() - 0.5) * 0.14);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 3 === 0 ? '#ffffff' : c.st.core,
        { life: 7.5, size: 0.05 + rand() * 0.025, flicker: 0.3 });
    }
    // Two spent lozenges lie where they fell, bigger, glinting.
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.4, c.wy + Math.sin(a) * c.radius * 0.4,
        c.st.mid, { life: 9, size: 0.08, flicker: 0.2 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // The freeze flash — one blink of total white.
    if (t < 0.05) {
      ctx.globalAlpha = (1 - t / 0.05) * 0.6;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE MIRROR: the disc reads as ice — a pale sheen fill, a dark
    // water line under its rim, and one specular wedge that SLIDES
    // slowly across the face (the only moving thing in a stopped
    // world).
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = shade(st.mid, 18);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.03, rPx * 0.94, rPx * 0.94 * squash, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
    const wa = c.now / 1900;
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.78, rPx * 0.78 * squash, 0, wa, wa + 0.5);
    ctx.ellipse(px, py, rPx * 0.5, rPx * 0.5 * squash, 0, wa + 0.5, wa, true);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc502);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE STOPPED MOTES: six lozenges hang dead still, each holding
    // one dark mote of the world mid-fall. At its thaw clock a kink
    // cracks across the pane; a beat later it DROPS.
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.72;
      const h = sc * (0.4 + rand() * 0.55);
      const thaw = 0.4 + rand() * 0.35;
      const gx = px + Math.cos(a) * rr;
      let gy = py + Math.sin(a) * rr * squash - h;
      let al = 0.95;
      const cracked = t > thaw;
      if (t > thaw + 0.1) {
        const u = (t - thaw - 0.1) / 0.28;
        if (u >= 1) continue;
        gy += u * u * sc * 1.3;
        al *= 1 - u;
      }
      const g = sc * (0.1 + rand() * 0.04);
      // The lozenge: a standing diamond pane, pale rim, glass fill.
      ctx.globalAlpha = 0.55 * al;
      ctx.fillStyle = shade(st.mid, 20);
      ctx.beginPath();
      ctx.moveTo(gx, gy - g * 1.5);
      ctx.lineTo(gx + g, gy);
      ctx.lineTo(gx, gy + g * 1.5);
      ctx.lineTo(gx - g, gy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * al;
      ctx.strokeStyle = k % 2 === 0 ? '#ffffff' : st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.028);
      ctx.stroke();
      // The held mote: one dark speck mid-pane, mid-fall forever.
      ctx.globalAlpha = 0.85 * al;
      ctx.fillStyle = shade(st.deep, -12);
      const m = Math.max(2, g * 0.4);
      ctx.fillRect(gx - m / 2, gy - m / 2, m, m);
      // The crack: a single kink line across the pane.
      if (cracked) {
        ctx.globalAlpha = 0.97 * al;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.2, sc * 0.022);
        ctx.beginPath();
        ctx.moveTo(gx - g * 0.7, gy - g * 0.5);
        ctx.lineTo(gx + g * 0.15, gy - g * 0.05);
        ctx.lineTo(gx + g * 0.75, gy + g * 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.3 * (1 - t));
  },
};

// -------------------------------------------------------- bone_needle

/**
 * BONE_NEEDLE — "the marrow reads."
 * The dart strikes and performs the old divination: the needle
 * splits lengthwise into three bone splints that fan OPEN at the
 * wound like a thrown knuckle-cast, hang splayed one breath, then
 * clatter down — and the lots LIE where they fall for ten seconds,
 * a pale scatter the dead can read. A marrow-white ring at the
 * wound says what the reading found.
 */
const bone_needle: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xb0e1);
    // Bone chips clatter with true bounces; marrow dust sifts.
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx, c.wy, 1, [c.st.mid, c.st.core], {
        speed: 1.2 + rand(), life: 1.6, size: 0.055, gravity: 0,
        dir: rand() * Math.PI * 2, spread: 0.4, shape: 'shard', spin: 11,
        z: 0.35, vz: 1.4 + rand(), zg: 8, land: 'bounce', bounce: 0.5, layer: 'world',
      });
    }
    c.particles.burst(c.wx, c.wy, 3, [c.st.deep, c.st.mid], {
      speed: 0.5, life: 0.7, size: 0.09, gravity: 0, drag: 2, grow: 0.12,
      shape: 'puff', layer: 'world', shadow: 0, z: 0.3,
    });
    // THE CAST OF LOTS: pale bone grains lying in a deliberate
    // scatter around one dark socket dot — the reading, kept.
    lay(c, c.wx, c.wy, shade(c.st.deep, -16), { life: 10, size: 0.06 });
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const rr = 0.2 + rand() * 0.45;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? c.st.mid : c.st.core,
        { life: 9 + rand(), size: 0.055 + rand() * 0.03 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The marrow ring: a thin bone-white circle at the wound's foot,
    // brightening once as the reading lands, then holding faint.
    const bright = t < 0.25 ? t / 0.25 : t < 0.5 ? 1 : 1 - (t - 0.5) * 1.2;
    ctx.save();
    ctx.globalAlpha = 0.5 * fade + 0.4 * Math.max(0, bright);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.34, sc * 0.34 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.4, sc * 0.4 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xb0e2);
    const ang = rand() * Math.PI * 2;
    ctx.save();
    ctx.lineCap = 'butt';
    // The arrival: one incoming white lane-streak, gone at the split.
    if (t < 0.07) {
      const k = 1 - t / 0.07;
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(ang) * sc * 2.2, py - Math.sin(ang) * sc * 2.2 - sc * 0.5);
      ctx.lineTo(px, py - sc * 0.3);
      ctx.stroke();
    }
    // THE SPLAY: three bone splints fan open from the wound — pinned
    // together at the base, tips spreading — hang one breath, then
    // clatter down with a tumble each.
    for (let k = 0; k < 3; k++) {
      const splay = Math.min(1, Math.max(0, (t - 0.05) / 0.16));
      const drop = Math.min(1, Math.max(0, (t - 0.4 - k * 0.09) / 0.3));
      if (drop >= 1) continue;
      const baseA = -Math.PI / 2 + (k - 1) * 0.62 * splay;
      const L = sc * (0.62 - Math.abs(k - 1) * 0.07);
      const bx = px + drop * Math.cos(ang + k * 2) * sc * 0.3;
      const by = py - sc * 0.3 + drop * drop * sc * 0.9;
      const rot = baseA + drop * (k - 1) * 2.4;
      const al = (1 - drop * 0.7) * (t < 0.85 ? 1 : (1 - t) / 0.15);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      // Each splint: pale face, dark spine groove, knobbed head.
      ctx.globalAlpha = 0.97 * al;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.078);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -L);
      ctx.stroke();
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(1, sc * 0.018);
      ctx.beginPath();
      ctx.moveTo(0, -L * 0.2);
      ctx.lineTo(0, -L * 0.75);
      ctx.stroke();
      ctx.fillStyle = k === 1 ? st.core : st.mid;
      const kb = sc * 0.07;
      ctx.fillRect(-kb / 2, -L - kb, kb, kb);
      ctx.restore();
    }
    // The split flash: the needle becomes three, one white snap.
    if (t > 0.05 && t < 0.14) {
      const k = 1 - (t - 0.05) / 0.09;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.3, sc * 0.24, sc * 0.09, 5, ang, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.8, 0.5 * k);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- shadow_fang

/**
 * SHADOW_FANG — "the long shadow."
 * The dark takes one long step — and the SHADOW arrives first: a
 * stretched dark silhouette races along the ground ahead of the
 * dash, rears upright at the arrival as a standing dark sliver, and
 * collapses into the strike. What it drew streams home as violet
 * threads down the dash line, and a stretched stain lies on the
 * last stride for eight seconds: the part that never returned.
 */
const shadow_fang: AbilitySig = {
  spawn(c) {
    shadow.deployments.bloom!(asMatter(c), c.wx, c.wy, { scale: 0.6 });
    // The kept dark: an elongated stain of grains along the final
    // stride — laid in a stretched line, the shadow's residue.
    const rand = srand(c.seed ^ 0x5fa1);
    for (let k = 0; k < 6; k++) {
      const f = 0.55 + (k / 5) * 0.45;
      lay(c,
        c.wx + (c.wx2 - c.wx) * f + (rand() - 0.5) * 0.1,
        c.wy + (c.wy2 - c.wy) * f + (rand() - 0.5) * 0.1,
        k % 2 === 0 ? shade(c.st.deep, -14) : c.st.deep,
        { life: 8, size: 0.06 + rand() * 0.03 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const { ux, uy, len } = dashFrame(c);
    if (len < 1) return;
    ctx.save();
    // THE RACING SHADOW: a stretched silhouette lance on the ground,
    // head bulge leading — it outruns the body, arriving by t 0.3.
    if (t < 0.3) {
      const reach = Math.min(1, t / 0.3);
      const hx = px + ux * len * reach;
      const hy = py + uy * len * reach;
      const tailX = px + ux * len * Math.max(0, reach - 0.55);
      const tailY = py + uy * len * Math.max(0, reach - 0.55);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = shade(st.deep, -18);
      const w = sc * 0.16;
      const nx = -uy;
      const ny = ux;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(hx - ux * sc * 0.3 + nx * w, hy - uy * sc * 0.3 + ny * w * squash);
      ctx.lineTo(hx, hy);
      ctx.lineTo(hx - ux * sc * 0.3 - nx * w, hy - uy * sc * 0.3 - ny * w * squash);
      ctx.closePath();
      ctx.fill();
      // The head bulge: the shadow's skull, leading the charge.
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.1, sc * 0.07 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // The stain contracts home toward the strike as the drain runs.
      const u = Math.min(1, (t - 0.3) / 0.55);
      ctx.globalAlpha = 0.55 * (1 - u);
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.ellipse(px2, py2, sc * 0.4 * (1 - u * 0.5), sc * 0.26 * (1 - u * 0.5) * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE REARING: the shadow snaps upright at the arrival — a
    // standing dark sliver, faceless and taller than the rogue —
    // holds one beat, then collapses INTO the strike point.
    if (t > 0.26 && t < 0.72) {
      const up = Math.min(1, (t - 0.26) / 0.1);
      const fall = Math.max(0, (t - 0.5) / 0.22);
      const H = sc * 1.9 * up * (1 - fall);
      const W = sc * 0.22 * (1 - fall * 0.5);
      ctx.globalAlpha = 0.92 * (1 - fall * 0.4);
      ctx.fillStyle = shade(st.deep, -20);
      ctx.beginPath();
      ctx.moveTo(px2 - W, py2);
      ctx.quadraticCurveTo(px2 - W * 0.8, py2 - H * 0.7, px2, py2 - H);
      ctx.quadraticCurveTo(px2 + W * 0.8, py2 - H * 0.7, px2 + W, py2);
      ctx.closePath();
      ctx.fill();
      // A violet rim down its leading edge — the only light it has.
      ctx.globalAlpha = 0.95 * (1 - fall);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px2 - W * 0.7, py2 - sc * 0.06);
      ctx.quadraticCurveTo(px2 - W * 0.6, py2 - H * 0.65, px2, py2 - H);
      ctx.stroke();
    }
    // The bite flash at the collapse.
    if (t > 0.5 && t < 0.62) {
      const k = 1 - (t - 0.5) / 0.12;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.4, sc * 0.26, sc * 0.1, 4, c.now / 300, 1);
      ctx.fill();
    }
    // THE DRAIN: two violet threads reel from the strike back along
    // the dash line into the biter — beads sliding home.
    const { ux, uy, len } = dashFrame(c);
    if (len > 1 && t > 0.52) {
      const u = Math.min(1, (t - 0.52) / 0.4);
      for (let k = 0; k < 2; k++) {
        const f = Math.max(0, u - k * 0.18);
        const bx = px2 - ux * len * f;
        const by = py2 - uy * len * f - sc * 0.42;
        ctx.globalAlpha = 0.9 * (1 - u * 0.5);
        ctx.fillStyle = k === 0 ? st.spark : st.mid;
        const g = Math.max(2.2, sc * 0.055);
        ctx.fillRect(bx - g / 2, by - g / 2, g, g);
        ctx.globalAlpha = 0.5 * (1 - u * 0.5);
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.4, sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(px2 - ux * len * Math.max(0, f - 0.2), py2 - uy * len * Math.max(0, f - 0.2) - sc * 0.42);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
    ctx.restore();
    // The drain drinks TRUE on the collapse's crossing frame.
    const tPrev = t - c.frameDt * 1000 / 380;
    if (tPrev < 0.5 && t >= 0.5) {
      blood.deployments.drink!(asMatter(c), c.wx2, c.wy2, {
        radius: 0.8, dur: 0.55, scale: 0.5,
      });
    }
  },
};

// ------------------------------------------------------ crimson_tithe

/**
 * CRIMSON_TITHE — "the open bowl."
 * The pact holds out a shallow crescent bowl at chest height, and
 * the world pays IN: three red threads arc down into it from the
 * air while the ground's tally nicks erase one by one. At the term
 * the bowl TIPS into the rogue's chest — a dark flash, a settled
 * debt — and the ring of dried nick-stains keeps the account's
 * shape on the floor long after.
 */
const crimson_tithe: AbilitySig = {
  spawn(c) {
    // The pact opens: TRUE blood reels inward for the whole term.
    blood.deployments.drink!(asMatter(c), c.wx, c.wy, {
      radius: 1.0, dur: 0.9, scale: 0.6,
    });
    // The dried account: paired nick-stains in a ring, kept 8 s.
    const rand = srand(c.seed ^ 0xc7e1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.3;
      const rr = 0.72 + (rand() - 0.5) * 0.1;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        '#63201a', { life: 8.5, size: 0.05 });
      lay(c, c.wx + Math.cos(a) * rr + 0.07, c.wy + Math.sin(a) * rr,
        '#421410', { life: 8.5, size: 0.04 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const R = Math.max(rPx, sc * 0.75);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE TALLY: eight I-nicks stand on a ring; each erases at its
    // clock — a white wipe tick, then gone. Payment, visibly taken.
    const rand = srand(c.seed ^ 0xc7e2);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.3;
      const wipeT = 0.08 + (k / 8) * 0.6 + rand() * 0.05;
      const x = px + Math.cos(a) * R;
      const y = py + Math.sin(a) * R * squash;
      if (t < wipeT) {
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.8, sc * 0.042);
        ctx.beginPath();
        ctx.moveTo(x, y - sc * 0.09);
        ctx.lineTo(x, y + sc * 0.09);
        ctx.stroke();
      } else if (t < wipeT + 0.08) {
        const u = (t - wipeT) / 0.08;
        ctx.globalAlpha = (1 - u) * 0.95;
        ctx.fillStyle = st.spark;
        const g = Math.max(2, sc * 0.05);
        ctx.fillRect(x - g / 2, y - g / 2, g, g);
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xc7e3);
    const bowlY = py - sc * 0.62;
    const tip = Math.min(1, Math.max(0, (t - 0.68) / 0.12));
    ctx.save();
    ctx.lineCap = 'butt';
    // THE BOWL: a shallow crescent chalice held at chest height —
    // dark body, bright lip — tilting home at the term.
    const fade = t < 0.86 ? 1 : (1 - t) / 0.14;
    const W = sc * 0.34;
    const rot = tip * 0.9;
    ctx.save();
    ctx.translate(px, bowlY);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.beginPath();
    ctx.ellipse(0, 0, W, W * 0.42, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    // The held blood: a red meniscus that rises as payments land.
    const level = Math.min(1, t / 0.68);
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = '#b8362a';
    ctx.beginPath();
    ctx.ellipse(0, W * 0.06, W * (0.5 + 0.4 * level), W * 0.16 * (0.5 + level * 0.5), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.97 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(0, 0, W, W * 0.42, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // THE PAYMENTS: three red threads arc out of the air into the
    // bowl, each a bead on a bowed path with a thin trailing line.
    for (let k = 0; k < 3; k++) {
      const born = 0.06 + k * 0.18;
      const u = Math.min(1, Math.max(0, (t - born) / 0.3));
      if (u <= 0 || u >= 1 || tip > 0) continue;
      const sx = px + (rand() - 0.5) * sc * 2.2;
      const sy = bowlY - sc * (1.1 + rand() * 0.5);
      const bx = px + (sx - px) * (1 - u) * (1 - u);
      const by = sy + (bowlY - sy) * u * u + Math.sin(u * Math.PI) * -sc * 0.12;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = k === 1 ? '#d84a3a' : '#b8362a';
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.032, sc * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#b8362a';
      ctx.lineWidth = Math.max(1.2, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(px + (sx - px) * (1 - Math.max(0, u - 0.15)) * (1 - Math.max(0, u - 0.15)), sy + (bowlY - sy) * Math.max(0, u - 0.15) ** 2);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    // THE SETTLING: the bowl tips into the chest — one dark flash
    // swallowed by the sternum, and the pact is closed.
    if (tip > 0 && tip < 1) {
      ctx.globalAlpha = 0.95 * (1 - tip);
      ctx.fillStyle = shade(st.deep, -18);
      ctx.beginPath();
      burstStarPath(ctx, px, bowlY + sc * 0.1, sc * 0.2 * (1 + tip), sc * 0.08, 5, c.now / 400, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.8, 0.45 * (1 - tip));
    }
    ctx.restore();
  },
};

// --------------------------------------------------------- pale_flame

/**
 * PALE_FLAME — "the cold wick."
 * The sweep plants five thin dark wicks along the arc, each crowned
 * by a flame that burns absolutely STILL — frozen teardrops of pale
 * light, no flicker, no heat. One by one each flame detaches and
 * floats UP unmelting, like a bubble the world forgot to warm,
 * while its wick crumbles to ash. Where the wicks stood, frost
 * freckles lie paired on the ground for seconds.
 */
const pale_flame: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xf1a1);
    // The freckle pairs: two cold points where each wick stood.
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 0.5 + (k / 4) * 1.0;
      const hx = c.wx + Math.cos(a) * c.radius * 0.7;
      const hy = c.wy + Math.sin(a) * c.radius * 0.7;
      lay(c, hx - 0.05, hy, '#ffffff', { life: 7, size: 0.042, flicker: 0.25 });
      lay(c, hx + 0.05, hy + 0.03, c.st.mid, { life: 7.5, size: 0.05, flicker: 0.2 });
    }
    // Wick ash sifts down as the flames leave.
    for (let k = 0; k < 4; k++) {
      const a = c.dir - 0.4 + rand() * 0.8;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        1, [shade(c.st.deep, -8), c.st.deep], {
          speed: 0.15, life: 1.2, size: 0.04, gravity: 0,
          z: 0.4, vz: -0.15, zg: 1.2, land: 'settle', layer: 'world', shadow: 0,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir, rPx } = c;
    if (t < 0.08) return;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // A cold light spill under the wick row — pale, not warm: it
    // DARKENS the ground it touches (light that takes).
    ctx.save();
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.8, rPx * 0.8 * squash, 0, dir - 0.55, dir + 0.55);
    ctx.ellipse(c.px, c.py, rPx * 0.52, rPx * 0.52 * squash, dir + 0.55, dir - 0.55, 0, true);
    ctx.fill();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.2, sc * 0.052);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, rPx * 0.8, rPx * 0.8 * squash, 0, dir - 0.5, dir + 0.5);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE WICK ROW: five stems along the arc, each crowned by a
    // dead-still teardrop flame. Flames detach on staggered clocks
    // and float straight up, unchanged — cold obeys no draft.
    for (let k = 0; k < 5; k++) {
      const a = dir - 0.5 + (k / 4) * 1.0;
      const bx = px + Math.cos(a) * rPx * 0.7;
      const by = py + Math.sin(a) * rPx * 0.7 * squash - sc * 0.06;
      const born = Math.min(1, Math.max(0, (t - 0.02 - k * 0.04) / 0.08));
      if (born <= 0) continue;
      const leaveT = 0.34 + k * 0.1;
      const gone = Math.min(1, Math.max(0, (t - leaveT) / 0.4));
      const wickH = sc * 0.42 * born * (1 - gone);
      // The wick: a dark stem, crumbling shorter once its flame goes.
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = shade(st.deep, -18);
      ctx.lineWidth = Math.max(2.4, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - wickH);
      ctx.stroke();
      // The flame: a filled teardrop, pale core in paler sheath —
      // utterly still while seated; utterly still while rising.
      const fy = gone === 0 ? by - wickH : by - sc * 0.42 - gone * sc * 1.1;
      const al = gone < 1 ? 1 - gone * 0.55 : 0;
      if (al > 0) {
        const fh = sc * 0.24 * born;
        // A deep sleeve under the pale sheath — the contrast law.
        ctx.globalAlpha = 0.7 * al;
        ctx.strokeStyle = shade(st.deep, -12);
        ctx.lineWidth = Math.max(2, sc * 0.045);
        ctx.beginPath();
        ctx.moveTo(bx, fy - fh);
        ctx.quadraticCurveTo(bx + fh * 0.65, fy - fh * 0.3, bx, fy + fh * 0.28);
        ctx.quadraticCurveTo(bx - fh * 0.65, fy - fh * 0.3, bx, fy - fh);
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 0.92 * al;
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.moveTo(bx, fy - fh);
        ctx.quadraticCurveTo(bx + fh * 0.6, fy - fh * 0.3, bx, fy + fh * 0.25);
        ctx.quadraticCurveTo(bx - fh * 0.6, fy - fh * 0.3, bx, fy - fh);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.97 * al;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.moveTo(bx, fy - fh * 0.55);
        ctx.quadraticCurveTo(bx + fh * 0.3, fy - fh * 0.15, bx, fy + fh * 0.1);
        ctx.quadraticCurveTo(bx - fh * 0.3, fy - fh * 0.15, bx, fy - fh * 0.55);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The sweep's own edge: a quick pale crescent, first frames only.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.4, rPx * 0.72, rPx * 0.72 * squash, 0, dir - 0.5, dir + 0.5 * (1 - k));
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.65, c.wy + Math.sin(dir) * c.radius * 0.65, 0.8, 0.25 * (1 - t));
  },
};

// --------------------------------------------------------- spark_lash

/**
 * SPARK_LASH — "the grounding nail."
 * The hook finds ground the honest way: the hop paints as a taut
 * kinked wire, and at its far end a glowing iron rod SLAMS down —
 * the earthing nail — with three arc-lets caged around its head.
 * The wire's bright core then drains along it and disappears down
 * the rod. Around the nail's point a scorch socket and two
 * fulgurite rays lie white-to-soot on the ground for eight seconds.
 */
const spark_lash: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.8 });
    // The socket + fulgurites: laid hot, cooling in hard steps.
    const rand = srand(c.seed ^ 0x51a1);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      lay(c, c.wx2 + Math.cos(a) * 0.16, c.wy2 + Math.sin(a) * 0.16,
        '#fff9e0', {
          life: 8, size: 0.045,
          fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
        });
    }
    for (let r = 0; r < 2; r++) {
      const a = rand() * Math.PI * 2;
      for (let k = 1; k <= 3; k++) {
        const wob = (rand() - 0.5) * 0.24;
        lay(c,
          c.wx2 + Math.cos(a) * 0.14 * k + Math.cos(a + Math.PI / 2) * wob,
          c.wy2 + Math.sin(a) * 0.14 * k + Math.sin(a + Math.PI / 2) * wob,
          '#fff9e0', {
            life: 7 + rand(), size: 0.04,
            fade: '#e8e06a', fadeAt: 0.12, fade2: '#3a3630', fade2At: 0.45,
          });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    if (t < 0.2) return;
    const fade = 1 - t;
    // The socket scorch: a small dark ring pressed around the point.
    ctx.save();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = shade(st.deep, -16);
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.2, sc * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.4, sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.15, sc * 0.15 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x51a2);
    const lift = sc * 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE WIRE: taut from cast to strike with two seeded kinks —
    // dark bed, bright core. The core DRAINS toward the nail after
    // the slam: its lit span shortens from the tail.
    const k1 = 0.35 + rand() * 0.12;
    const k2 = 0.65 + rand() * 0.12;
    const kink1 = (rand() - 0.5) * sc * 0.3;
    const kink2 = (rand() - 0.5) * sc * 0.3;
    const nx = -(py2 - py);
    const ny = px2 - px;
    const nl = Math.hypot(nx, ny) || 1;
    const wirePt = (f: number): { x: number; y: number } => {
      const kk = f > k1 - 0.08 && f < k1 + 0.08 ? kink1 : f > k2 - 0.08 && f < k2 + 0.08 ? kink2 : 0;
      return {
        x: px + (px2 - px) * f + (nx / nl) * kk,
        y: py + (py2 - py) * f + (ny / nl) * kk - lift,
      };
    };
    const drain = Math.min(1, Math.max(0, (t - 0.3) / 0.5));
    if (t < 0.85) {
      for (let pass = 0; pass < 2; pass++) {
        const from = pass === 0 ? 0 : drain;
        if (from >= 1) continue;
        ctx.globalAlpha = (pass === 0 ? 0.6 : 0.97) * (1 - t * 0.4);
        ctx.strokeStyle = pass === 0 ? shade(st.deep, -10) : st.core;
        ctx.lineWidth = Math.max(pass === 0 ? 3.2 : 1.8, sc * (pass === 0 ? 0.08 : 0.04));
        ctx.beginPath();
        const p0 = wirePt(from);
        ctx.moveTo(p0.x, p0.y);
        for (const f of [k1, k2, 1]) {
          if (f < from) continue;
          const p = wirePt(f);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    }
    // THE NAIL: a glowing iron rod slams vertical at the far end —
    // drop 0→0.14, then stands, head cage crackling.
    const slam = Math.min(1, t / 0.14);
    const H = sc * 0.88;
    const topY = py2 - lift - H * 0.5 - (1 - slam) * sc * 0.9;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.fillRect(px2 - Math.max(2.6, sc * 0.065), topY, Math.max(5.2, sc * 0.13), H);
    ctx.fillStyle = st.spark;
    ctx.fillRect(px2 - Math.max(1.2, sc * 0.028), topY, Math.max(2.4, sc * 0.056), H);
    // The head: a flat cap catching its own light.
    ctx.fillStyle = st.core;
    ctx.fillRect(px2 - sc * 0.13, topY - Math.max(2.5, sc * 0.055), sc * 0.26, Math.max(3, sc * 0.06));
    // The cage: three arc-lets orbit the head on the wall clock.
    if (slam >= 1) {
      for (let k = 0; k < 3; k++) {
        const oa = c.now / 130 + (k / 3) * Math.PI * 2;
        ctx.globalAlpha = 0.85 * fade;
        ctx.strokeStyle = k % 2 === 0 ? st.core : st.spark;
        ctx.lineWidth = Math.max(1.4, sc * 0.03);
        ctx.beginPath();
        ctx.ellipse(px2, topY, sc * 0.16, sc * 0.07, oa, 0.4, 2.2);
        ctx.stroke();
      }
    }
    // The slam star.
    if (t > 0.12 && t < 0.24) {
      const kk = 1 - (t - 0.12) / 0.12;
      ctx.globalAlpha = 0.95 * kk;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - lift + H * 0.5, sc * 0.28, sc * 0.1, 4, 0.3, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.9, 0.6 * kk);
    }
    // Ion glints pop along the live wire on gated beats.
    if (t < 0.6 && Math.random() < c.frameDt * 14) {
      const f = drain + Math.random() * (1 - drain);
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f,
        1, [st.spark, st.core], {
          speed: 0.3, life: 0.3, size: 0.05, gravity: 0, shape: 'glint',
          z: 0.45, vz: 0.4, zg: 2, land: 'die', layer: 'world', shadow: 0,
        });
    }
    ctx.restore();
  },
};

// --------------------------------------------------------- kings_bane

/**
 * KINGS_BANE — "the broken scepter."
 * History lands as a prop, snapped: at the arrival a gold scepter
 * appears upright, CRACKS at a diagonal, and its two halves fall
 * apart — orb-head one way, ferrule the other — coming to rest
 * crossed on the turf. From the snap point a red seal-gem pops
 * free, bounces once, and LIES there glinting for ten seconds
 * beside the crossed halves' golden stain. Regicide, notarized.
 */
const kings_bane: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xba9e);
    dust.deployments.kick!(asMatter(c), c.wx2, c.wy2, { scale: 0.5 });
    // THE SEAL-GEM: one true red glint that bounces and STAYS.
    c.particles.burst(c.wx2, c.wy2, 1, ['#d84a3a'], {
      speed: 0.9, life: 9.5, size: 0.075, gravity: 0, shape: 'glint',
      z: 0.5, vz: 1.6, zg: 8, land: 'bounce', bounce: 0.5,
      layer: 'world', flicker: 0.25,
    });
    // Gold shards off the snap, brief.
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, [c.st.spark, c.st.mid], {
        speed: 1.6 + rand(), life: 0.6, size: 0.05, gravity: 0,
        dir: rand() * Math.PI * 2, spread: 0.4, shape: 'shard', spin: 9,
        z: 0.5, vz: 1 + rand(), zg: 8, land: 'die', layer: 'world',
      });
    }
    // THE CROSSED STAIN: the halves' lasting record — two short
    // grain-bars crossing, gold cooling to old brass.
    const a1 = rand() * Math.PI;
    const a2 = a1 + Math.PI / 2 + (rand() - 0.5) * 0.4;
    for (const [ang, n] of [[a1, 4], [a2, 4]] as Array<[number, number]>) {
      for (let k = 0; k < n; k++) {
        const f = (k / (n - 1) - 0.5) * 0.5;
        lay(c, c.wx2 + Math.cos(ang) * f, c.wy2 + Math.sin(ang) * f,
          k % 2 === 0 ? c.st.spark : c.st.mid, {
            life: 9, size: 0.05,
            fade: shade(c.st.mid, -18), fadeAt: 0.4,
          });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    // The rumor line: a low whisper-ribbon along the dash, brief.
    if (t >= 0.3) return;
    const { ux, uy, len } = dashFrame(c);
    if (len < 1) return;
    const k = 1 - t / 0.3;
    ctx.save();
    ctx.globalAlpha = 0.6 * k;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.04);
    ctx.setLineDash([sc * 0.16, sc * 0.12]);
    ctx.lineDashOffset = -c.now / 20;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    void ux; void uy;
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const rand = srand(c.seed ^ 0xba9f);
    const baseY = py2 - sc * 0.1;
    ctx.save();
    ctx.lineCap = 'butt';
    const H = sc * 1.25;
    const snapY = baseY - H * 0.55;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    if (t < 0.18) {
      // THE SCEPTER, whole: shaft, collar, orb — standing where the
      // blow landed, one breath of stillness before the crack.
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.fillRect(px2 - Math.max(3, sc * 0.075), baseY - H, Math.max(6, sc * 0.15), H);
      ctx.fillStyle = st.mid;
      ctx.fillRect(px2 - Math.max(1.4, sc * 0.033), baseY - H, Math.max(2.8, sc * 0.066), H);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(px2, baseY - H - sc * 0.12, sc * 0.15, sc * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px2 - sc * 0.04, baseY - H - sc * 0.16, sc * 0.055, sc * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.spark;
      ctx.fillRect(px2 - sc * 0.12, baseY - H * 0.55 - sc * 0.025, sc * 0.24, Math.max(2.5, sc * 0.05));
    } else {
      // THE SNAP: a white diagonal flash, then two falling halves —
      // each a real body with a lit face and dark side, tumbling
      // apart and coming to rest crossed.
      if (t < 0.26) {
        const k = 1 - (t - 0.18) / 0.08;
        ctx.globalAlpha = 0.97 * k;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(px2 - sc * 0.2, snapY + sc * 0.1);
        ctx.lineTo(px2 + sc * 0.2, snapY - sc * 0.1);
        ctx.stroke();
        c.glow(c.wx2, c.wy2, 1, 0.6 * k);
      }
      const u = Math.min(1, (t - 0.18) / 0.34);
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const halfH = H * 0.5;
        const fx = px2 + side * u * sc * (0.44 + rand() * 0.12);
        const fy = snapY + (s === 0 ? -halfH * 0.5 : halfH * 0.5) * (1 - u) + u * u * (baseY - snapY + (s === 0 ? -sc * 0.02 : sc * 0.04));
        const rot = side * u * (1.35 + rand() * 0.2);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = shade(st.deep, -8);
        ctx.fillRect(-Math.max(3, sc * 0.075), -halfH / 2, Math.max(6, sc * 0.15), halfH);
        ctx.fillStyle = st.mid;
        ctx.fillRect(-Math.max(1.4, sc * 0.033), -halfH / 2, Math.max(2.8, sc * 0.066), halfH);
        if (s === 0) {
          // The orb rides its half down.
          ctx.fillStyle = st.spark;
          ctx.beginPath();
          ctx.ellipse(0, -halfH / 2 - sc * 0.1, sc * 0.14, sc * 0.14, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = shade(st.mid, -16);
          ctx.fillRect(-sc * 0.05, halfH / 2 - sc * 0.05, sc * 0.1, Math.max(2, sc * 0.05));
        }
        ctx.restore();
      }
      // The snapped ends smoke one thin gold thread each, briefly.
      if (u < 0.7 && Math.random() < c.frameDt * 10) {
        c.particles.burst(c.wx2, c.wy2, 1, [st.spark], {
          speed: 0.15, life: 0.5, size: 0.04, gravity: 0, shape: 'glint',
          z: 0.55, vz: 0.5, zg: 0.5, land: 'die', layer: 'world', shadow: 0,
        });
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- last_word

/**
 * LAST_WORD — "the closed quote."
 * Step in, say it once, done: two white bars stamp at head height —
 * a closing quotation mark — compress into one line, then into a
 * single point. Behind, a traveling white pinpoint ERASES the dash
 * line letter by letter; around, a dark hush-vignette settles.
 * The point drops to the turf and stays: one lone white grain,
 * the longest-lived single mark in the game. Said once. Over.
 */
const last_word: AbilitySig = {
  spawn(c) {
    const { ux, uy } = dashFrame(c);
    // Three clean slivers past the stop — the word carrying.
    c.particles.burst(c.wx2, c.wy2, 3, [c.st.core, c.st.mid], {
      speed: 3.2, life: 0.25, size: 0.05, gravity: 0,
      dir: Math.atan2(uy, ux), spread: 0.2, shape: 'streak',
      z: 0.55, vz: 0.1, zg: 2, land: 'die', layer: 'world', shadow: 0,
    });
    // THE PERIOD: one lone white grain, laid to outlive everything.
    lay(c, c.wx2, c.wy2, '#ffffff', { life: 10.5, size: 0.06 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    // The hush: a dark vignette ellipse settles around the arrival
    // and drains away — the room going quiet in a ring.
    const fade = t < 0.5 ? Math.min(1, t / 0.14) : (1 - t) / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.3 * fade;
    ctx.strokeStyle = shade(st.deep, -20);
    ctx.lineWidth = Math.max(8, sc * 0.3);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 1.05, sc * 1.05 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const { ux, uy, len } = dashFrame(c);
    const hy = py2 - sc * 0.78;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE ERASER: a white pinpoint runs BACK along the dash line,
    // deleting it — ahead of the point the line exists, behind it
    // nothing does.
    if (len > 1 && t < 0.45) {
      const u = Math.min(1, t / 0.45);
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.036);
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 0.45);
      ctx.lineTo(px + ux * len * (1 - u), py + uy * len * (1 - u) - sc * 0.45);
      ctx.stroke();
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      const g = Math.max(2.5, sc * 0.06);
      ctx.fillRect(px + ux * len * (1 - u) - g / 2, py + uy * len * (1 - u) - sc * 0.45 - g / 2, g, g);
    }
    // THE QUOTE CLOSES: two bars → one line → one point.
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    if (t < 0.3) {
      // Two vertical bars, side by side, freshly stamped.
      const born = Math.min(1, t / 0.08);
      const gap = sc * 0.2 * (1 - Math.max(0, (t - 0.14) / 0.16));
      const bh = sc * 0.52 * born;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      for (const s of [-1, 1]) {
        ctx.fillRect(px2 + s * gap - Math.max(2, sc * 0.05), hy - bh / 2, Math.max(4, sc * 0.1), bh);
      }
    } else if (t < 0.5) {
      // One line, compressing.
      const u = (t - 0.3) / 0.2;
      const bh = sc * 0.52 * (1 - u * 0.82);
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      ctx.fillRect(px2 - Math.max(2.2, sc * 0.055), hy - bh / 2, Math.max(4.4, sc * 0.11), bh);
    } else {
      // The point: falls slowly to the turf, absolutely steady.
      const u = Math.min(1, (t - 0.5) / 0.4);
      const yy = hy + (py2 - hy) * u * u;
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = st.core;
      const g = Math.max(3, sc * 0.075);
      ctx.fillRect(px2 - g / 2, yy - g / 2, g, g);
    }
    // The utterance flash — once, at the stamp.
    if (t < 0.08) {
      const k = 1 - t / 0.08;
      c.glow(c.wx2, c.wy2, 1.1, 0.7 * k);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- garden_close

/**
 * GARDEN_CLOSE — "the night bouquet."
 * Six dark stems SPRING up around the rim on frame one, drooping
 * bud-heads beaded with venom. Each bud snaps open into a three-
 * petal blade-flower — then all the petals shear off at once and
 * CONVERGE, a volley of edges meeting at the caster's heart in a
 * violet star. Fallen stem stubs and venom freckles keep the
 * garden's ring on the ground long after it closes.
 */
const garden_close: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x9a4d);
    // Venom beads drop off the bud tips while the flowers stand.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + (c.seed % 7) * 0.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85,
        1, ['#a0c050', '#7a9a3c'], {
          speed: 0.1, life: 1, size: 0.045, gravity: 0, shape: 'drop',
          z: 0.5, vz: -0.2, zg: 4, land: 'splat', layer: 'world', fade3: '#4a5c22',
        });
    }
    // THE GARDEN'S RING: stem stubs (paired dark grains) + venom
    // freckles at the heart, kept 8 s.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + (c.seed % 7) * 0.2;
      const bx = c.wx + Math.cos(a) * c.radius * 0.85;
      const by = c.wy + Math.sin(a) * c.radius * 0.85;
      lay(c, bx, by, shade(c.st.deep, -12), { life: 8.5, size: 0.055 });
      lay(c, bx + 0.07, by + 0.04, c.st.deep, { life: 8, size: 0.04 });
    }
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.2, c.wy + Math.sin(a) * 0.2,
        '#a0c050', { life: 7, size: 0.045, flicker: 0.3 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The bed ring: a thin dark circle joining the stems' roots.
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.85, rPx * 0.85 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x9a4e);
    const chestY = py - sc * 0.55;
    ctx.save();
    ctx.lineCap = 'round';
    // THE STEMS: six dark stalks stand around the rim from frame
    // one, bowing inward, each crowned by a bud that SNAPS open
    // into three blade petals on its own clock.
    const shear = 0.55; // the moment every petal leaves at once
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + (c.seed % 7) * 0.2;
      const bx = px + Math.cos(a) * rPx * 0.85;
      const by = py + Math.sin(a) * rPx * 0.85 * squash;
      const openT = 0.1 + (k % 3) * 0.09;
      const stemH = sc * (0.55 + rand() * 0.15);
      const wilt = Math.min(1, Math.max(0, (t - shear) / 0.3));
      // The stem: bowed toward the caster, wilting after the shear.
      const tipX = bx + (px - bx) * 0.14;
      const tipY = by - stemH * (1 - wilt * 0.55);
      ctx.globalAlpha = 0.9 * (t < 0.8 ? 1 : (1 - t) / 0.2);
      ctx.strokeStyle = shade(st.deep, -12);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx, by - stemH * 0.6, tipX, tipY);
      ctx.stroke();
      // The flower: three blade petals fanned off the tip while it
      // stands — each a slim pointed sliver with a venom bead.
      if (t > openT && t < shear) {
        const open = Math.min(1, (t - openT) / 0.1);
        for (let p = 0; p < 3; p++) {
          const pa = a + Math.PI + (p - 1) * 0.55 * open;
          const pl = sc * 0.2 * open;
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = p === 1 ? st.mid : shade(st.mid, -14);
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + Math.cos(pa - 0.14) * pl * 0.6, tipY + Math.sin(pa - 0.14) * pl * 0.6);
          ctx.lineTo(tipX + Math.cos(pa) * pl, tipY + Math.sin(pa) * pl);
          ctx.lineTo(tipX + Math.cos(pa + 0.14) * pl * 0.6, tipY + Math.sin(pa + 0.14) * pl * 0.6);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#a0c050';
        ctx.beginPath();
        ctx.ellipse(tipX, tipY, sc * 0.032, sc * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE VOLLEY: after the shear each flower's petals converge as
      // one edge — a dark sliver flying tip-first at the heart.
      if (t > shear) {
        const u = Math.min(1, (t - shear) / 0.18);
        if (u < 1) {
          const fx = tipX + (px - tipX) * u;
          const fy = tipY + (chestY - tipY) * u;
          const fa = Math.atan2(chestY - tipY, px - tipX);
          ctx.globalAlpha = 0.97;
          ctx.fillStyle = k % 2 === 0 ? st.mid : st.spark;
          ctx.beginPath();
          ctx.moveTo(fx + Math.cos(fa) * sc * 0.16, fy + Math.sin(fa) * sc * 0.16);
          ctx.lineTo(fx - Math.cos(fa - 0.5) * sc * 0.07, fy - Math.sin(fa - 0.5) * sc * 0.07);
          ctx.lineTo(fx - Math.cos(fa + 0.5) * sc * 0.07, fy - Math.sin(fa + 0.5) * sc * 0.07);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    // THE MEETING: every edge arrives at once — one violet star.
    if (t > shear + 0.16 && t < shear + 0.34) {
      const k = 1 - (t - shear - 0.16) / 0.18;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px, chestY, sc * 0.32, sc * 0.12, 6, c.now / 350, 1);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, chestY, sc * 0.16, sc * 0.06, 6, c.now / 350, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 1, 0.55 * k);
    }
    ctx.restore();
  },
};

// --------------------------------------------------------- beak_first

/**
 * BEAK_FIRST — "the rook's toll."
 * Through, not into: at the strike a purse bursts — a small drawn
 * pouch silhouette split by a dark beak-wedge — and what flies out
 * is not gold but FEATHERS: five black slips that flutter down
 * zigzag and LIE on the turf for eight seconds. The rook paid in
 * its own coin, and two red drops say the toll was taken in kind.
 */
const beak_first: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xbea1);
    // THE FEATHERS: dark slips with true flutter — wobble, slow
    // fall, settle — lying where they land.
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, [shade(c.st.deep, -8), c.st.deep, c.st.mid], {
        speed: 0.5 + rand() * 0.5, life: 8, size: 0.1, gravity: 0,
        dir: rand() * Math.PI * 2, spread: 0.6, shape: 'shard', spin: 3,
        z: 0.45 + rand() * 0.25, vz: 0.5, zg: 1.4, land: 'settle',
        layer: 'world', wobble: 0.9,
      });
    }
    // The toll in kind: two red drops.
    for (let k = 0; k < 2; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, ['#b8362a', '#8e2a20'], {
        speed: 0.2, life: 1, size: 0.05, gravity: 0, shape: 'drop',
        z: 0.4, vz: -0.1, zg: 4.5, land: 'splat', layer: 'world', fade3: '#421410',
      });
    }
    // The slit purse's mark: two short arc stains under the strike.
    lay(c, c.wx2 - 0.08, c.wy2 + 0.06, shade(c.st.deep, -14), { life: 8, size: 0.05 });
    lay(c, c.wx2 + 0.09, c.wy2 + 0.08, c.st.deep, { life: 8, size: 0.045 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    if (t >= 0.5) return;
    // The stride shadow: one low dark dart under the through-line.
    const { ux, uy, len } = dashFrame(c);
    if (len < 1) return;
    const k = 1 - t / 0.5;
    ctx.save();
    ctx.globalAlpha = 0.5 * k;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.beginPath();
    ctx.ellipse(px2 - ux * sc * 0.4, py2 - uy * sc * 0.4, sc * 0.34, sc * 0.1 * squash, Math.atan2(uy, ux), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const { ux, uy } = dashFrame(c);
    const ang = Math.atan2(uy, ux);
    const hy = py2 - sc * 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE PURSE: a small pouch hangs at the strike point — a drawn
    // belly with a cinched neck — shown whole for one blink...
    if (t < 0.14) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = shade(st.mid, -8);
      ctx.beginPath();
      ctx.ellipse(px2, hy + sc * 0.05, sc * 0.19, sc * 0.23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(1.6, sc * 0.036);
      ctx.beginPath();
      ctx.moveTo(px2 - sc * 0.07, hy - sc * 0.12);
      ctx.lineTo(px2 + sc * 0.07, hy - sc * 0.1);
      ctx.stroke();
    }
    // ...then THE BEAK punches through it: a dark wedge with a pale
    // culmen line, entering one side and OUT the other, both shown.
    if (t >= 0.1 && t < 0.45) {
      const u = (t - 0.1) / 0.35;
      const reach = sc * (0.14 + u * 0.85);
      const bw = sc * 0.2;
      ctx.globalAlpha = 0.97 * (1 - u * 0.5);
      ctx.fillStyle = shade(st.deep, -18);
      ctx.beginPath();
      ctx.moveTo(px2 + Math.cos(ang) * reach, hy + Math.sin(ang) * reach);
      ctx.lineTo(px2 + Math.cos(ang) * (reach - sc * 0.3) - Math.sin(ang) * bw * 0.5, hy + Math.sin(ang) * (reach - sc * 0.3) + Math.cos(ang) * bw * 0.5);
      ctx.lineTo(px2 + Math.cos(ang) * (reach - sc * 0.3) + Math.sin(ang) * bw * 0.5, hy + Math.sin(ang) * (reach - sc * 0.3) - Math.cos(ang) * bw * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * (1 - u * 0.4);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(px2 + Math.cos(ang) * (reach - sc * 0.28), hy + Math.sin(ang) * (reach - sc * 0.28));
      ctx.lineTo(px2 + Math.cos(ang) * reach, hy + Math.sin(ang) * reach);
      ctx.stroke();
    }
    // The burst: the purse gives — a small tear star, feathers own
    // the rest.
    if (t > 0.12 && t < 0.22) {
      const k = 1 - (t - 0.12) / 0.1;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px2, hy, sc * 0.2, sc * 0.075, 5, ang, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.7, 0.4 * k);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- pale_lantern

/**
 * PALE_LANTERN — "the footlights."
 * The grave-light comes up the way stage light does: a low arc of
 * five pale-green footlight flames rises at the rogue's feet, each
 * a still little blade of light in its own dark cup, and a soft
 * fan of up-light leans against the body. What the light shows on
 * it keeps a little of: green motes reel INWARD to the lamps. When
 * the watch ends the row dims lamp by lamp — and five faint green
 * embers keep the arc on the ground for eight seconds more.
 */
const pale_lantern: AbilitySig = {
  spawn(c) {
    // The row's lasting embers: five green grains in the footlight
    // arc, flickering as they lie.
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 0.25 + (k / 4) * Math.PI * 0.5;
      lay(c, c.wx + Math.cos(a) * 0.55, c.wy + Math.sin(a) * 0.55 * 0.6 + 0.35,
        k % 2 === 0 ? c.st.spark : c.st.mid,
        { life: 8.5, size: 0.05, flicker: 0.35 });
    }
    // Grave motes rise gently the whole rite.
    c.particles.emit({
      kind: 'ring', x: c.wx, y: c.wy, radius: 0.6, rate: 7, dur: 3.2,
      attack: 0.3, release: 0.8,
      pops: [{
        colors: [c.st.spark, c.st.mid],
        opts: {
          speed: 0.1, life: 1.1, size: 0.045, gravity: 0, shape: 'glint',
          vz: 0.55, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.3,
        },
      }],
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // The stage line: a faint arc joining the lamps, front of the
    // feet — the edge of the lit world.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.4, sc * 0.058);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.16, sc * 0.6, sc * 0.6 * squash, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    // THE FOOTLIGHTS: five lamps rise along a front arc on staggered
    // clocks — each a dark cup holding a still blade of pale light.
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 0.15 + (k / 4) * Math.PI * 0.7;
      const bx = px + Math.cos(a) * sc * 0.6;
      const by = py + sc * 0.16 + Math.sin(a) * sc * 0.6 * squash;
      const born = Math.min(1, Math.max(0, (t - 0.04 - k * 0.05) / 0.1));
      const dimT = 0.6 + k * 0.07;
      const dim = Math.min(1, Math.max(0, (t - dimT) / 0.14));
      if (born <= 0) continue;
      const al = born * (1 - dim * 0.85) * fade;
      // The cup: a small dark half-shell.
      ctx.globalAlpha = 0.95 * al;
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.085, sc * 0.06, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      // The light blade: a still, slim leaf of green-white.
      const fh = sc * 0.26 * born;
      ctx.globalAlpha = 0.95 * al;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(bx, by - fh);
      ctx.quadraticCurveTo(bx + fh * 0.35, by - fh * 0.35, bx, by);
      ctx.quadraticCurveTo(bx - fh * 0.35, by - fh * 0.35, bx, by - fh);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.97 * al;
      ctx.fillStyle = st.core;
      ctx.fillRect(bx - 1, by - fh * 0.7, Math.max(1.5, sc * 0.02), fh * 0.45);
    }
    // THE UP-LIGHT: a soft fan leaning against the body — two long
    // pale wedges from the lamp row up across the torso.
    if (t > 0.12) {
      const on = Math.min(1, (t - 0.12) / 0.12) * fade;
      for (const s of [-1, 1]) {
        ctx.globalAlpha = 0.27 * on;
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.moveTo(px + s * sc * 0.4, py + sc * 0.2);
        ctx.lineTo(px + s * sc * 0.14, py - sc * 1.35);
        ctx.lineTo(px + s * sc * 0.5, py - sc * 1.15);
        ctx.closePath();
        ctx.fill();
      }
      // What it shows on, it keeps: motes reel inward to the lamps
      // on gated beats — small green beads sliding home low.
      if (t < 0.7 && Math.random() < c.frameDt * 9) {
        const a = Math.random() * Math.PI * 2;
        c.particles.burst(c.wx + Math.cos(a) * 1.1, c.wy + Math.sin(a) * 1.1, 1, [st.spark], {
          speed: 1.6, life: 0.6, size: 0.045, gravity: 0,
          dir: a + Math.PI, spread: 0.1, shape: 'glint',
          z: 0.12, layer: 'world', shadow: 0, drag: 0.4,
        });
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy + 0.3, 0.8, 0.3 * fade);
  },
};

// -------------------------------------------------------- the registry

/** The knife-art signatures, keyed by ability id. */
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
  garden_close,
  beak_first,
  pale_lantern,
};
