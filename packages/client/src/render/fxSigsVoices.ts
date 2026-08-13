/**
 * THE SIGNATURE LAW — the TEN VOICES wave (THE ARMORY REMEMBERS,
 * wave 5c: the legendary staffs).
 *
 * Each chase staff is the only mouth its Art ever speaks through,
 * so each signature is that staff's whole thesis restated at
 * casting volume — now on all three strata: the painted statement,
 * the matter that flies or settles off it, and THE LASTING MARK: a
 * surveyed grid of stakes, five wax seals, a triangle proven three
 * times and left holding its period.
 *
 * Binding laws as ever: hard edges, save/restore hygiene, squash on
 * ground y-radii, srand determinism, frameDt-gated emission, ≤ ~60
 * path ops per hook per frame. No centerpiece repeats another's,
 * nor any of this file's former ones (the forest files a claim, the
 * horizon comes indoors, the tide comes down, the spindle lets go,
 * hand-delivered, the room leans in, the cup is passed, proof by
 * repetition, the visitor arrives, the court is seated — all
 * retired whole). Pulse arts count on bornAt beat parity; field
 * arts accumulate their marks beat by beat.
 *
 * ONE-VOICE stands: radiance, frost, fire, blood, and storm speak
 * through the MATTER LIBRARY; surveyed saplings, moon-stone, spun
 * thread, courtesy, and geometry stay the staffs' own.
 */

import { shade } from './rig.js';
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { radiance, frost, fire, blood, storm, asMatter } from './matter/index.js';

// ------------------------------------------------------------ helpers

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
    speed: 0.05, life: opts.life ?? 8, size: opts.size ?? 0.055,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

// ---------------------------------------------------------- wild_root

/**
 * WILD_ROOT — "the surveyors."
 * The forest does not rage — it PLATS: over the field's life,
 * sapling stakes sprout in surveyed rows, each crowned with a leaf
 * flag, while dotted root-lines link stake to stake underground.
 * The grid stays as laid grain rows for nine seconds: the claim,
 * filed, witnessed, and recorded in the dirt itself.
 */
const wild_root: AbilitySig = {
  spawn(c) {
    // First pulse only: record the grid's corners for keeps.
    const beat = Math.floor((c.now - c.age) / 800);
    if (beat !== 0) return;
    for (let gx = -1; gx <= 1; gx++) {
      for (let gy = -1; gy <= 1; gy++) {
        lay(c, c.wx + gx * c.radius * 0.55, c.wy + gy * c.radius * 0.55,
          (gx + gy) % 2 === 0 ? '#7a9a4a' : '#4a5c30',
          { life: 9, size: 0.05, flicker: 0.15 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const lifeMs = c.ticks !== undefined ? c.ticks * 50 : 2000;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE ROOT-LINES: dotted survey lines linking the 3×3 grid —
    // drawn row by row as the stakes report in.
    const drawn = Math.min(1, t / 0.5);
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.setLineDash([sc * 0.08, sc * 0.09]);
    for (let row = -1; row <= 1; row++) {
      const rowF = (row + 1.5) / 3;
      if (rowF > drawn * 1.5) continue;
      const y = py + row * rPx * 0.55 * squash;
      ctx.beginPath();
      ctx.moveTo(px - rPx * 0.55, y);
      ctx.lineTo(px + rPx * 0.55, y);
      ctx.stroke();
      const x = px + row * rPx * 0.55;
      ctx.beginPath();
      ctx.moveTo(x, py - rPx * 0.55 * squash);
      ctx.lineTo(x, py + rPx * 0.55 * squash);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // THE STAKES: nine saplings on the grid, sprouting on staggered
    // clocks spread across the field's life — each a straight stake
    // with a leaf flag that flutters on the shared wind.
    const wilt = Math.max(0, (t - 0.85) / 0.15);
    let k = 0;
    for (let gx = -1; gx <= 1; gx++) {
      for (let gy = -1; gy <= 1; gy++) {
        const sproutT = 0.05 + (k / 9) * 0.6;
        const grow = Math.min(1, Math.max(0, (t - sproutT) / (200 / lifeMs)));
        k++;
        if (grow <= 0) continue;
        const bx = px + gx * rPx * 0.55;
        const by = py + gy * rPx * 0.55 * squash;
        const H = sc * 0.4 * grow * (1 - wilt * 0.6);
        ctx.globalAlpha = 0.95 * (1 - wilt * 0.5) * fade;
        ctx.strokeStyle = shade(st.mid, -14);
        ctx.lineWidth = Math.max(1.8, sc * 0.045);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by - H);
        ctx.stroke();
        // The leaf flag: one triangular pennant off the tip.
        const flap = Math.sin(c.now / 240 + k) * sc * 0.03;
        ctx.globalAlpha = 0.95 * (1 - wilt * 0.6) * fade;
        ctx.fillStyle = (gx + gy) % 2 === 0 ? st.mid : shade(st.mid, 12);
        ctx.beginPath();
        ctx.moveTo(bx, by - H);
        ctx.lineTo(bx + sc * 0.11, by - H + sc * 0.035 + flap);
        ctx.lineTo(bx, by - H + sc * 0.08);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // The record accumulates: one root grain per gated beat.
    if (t < 0.85 && Math.random() < c.frameDt * 2.5) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.6;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        '#4a5c30', { life: 9, size: 0.045 });
    }
  },
  air(c) {
    // Leaf motes drift off the young flags, gated and gentle.
    if (c.t < 0.8 && Math.random() < c.frameDt * 6) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.6;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        1, [c.st.spark, c.st.mid], {
          speed: 0.2, life: 0.9, size: 0.045, gravity: 0, shape: 'shard', spin: 3,
          z: 0.4, vz: 0.3, zg: 1.2, land: 'settle', layer: 'world', wobble: 0.6,
          fade: '#4a5c30', fadeAt: 0.55,
        });
    }
  },
};

// ---------------------------------------------------------- day_breaks

/**
 * DAY_BREAKS — "the long sunrise."
 * Dawn, delivered early, in a straight line: a horizon-line hangs
 * along the whole corridor at knee height, and one stretched sun —
 * a bar of gold — RISES along its full length at once, the floor
 * beneath stepping night-blue → rose → gold in three hard bands as
 * it climbs. Morning-dew glints stay along the corridor's edges
 * for eight seconds: the day, already here.
 */
const day_breaks: AbilitySig = {
  spawn(c) {
    radiance.deployments.bloom!(asMatter(c),
      (c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, { scale: 0.7 });
    // The dew: gold glints laid along both corridor edges.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      for (const s of [-1, 1]) {
        lay(c, c.wx + dx * f + nx * 0.5 * s, c.wy + dy * f + ny * 0.5 * s,
          k % 2 === 0 ? '#fff0c0' : '#ffd98a',
          { life: 8, size: 0.045, flicker: 0.35 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const W = Math.max(rPx, sc * 0.3);
    const rise = Math.min(1, t / 0.4);
    // THE COLOR STEPS: the corridor floor in one of three hard dawn
    // bands, switching as the sun climbs — never blending.
    const floorCol = rise < 0.35 ? '#2a3450' : rise < 0.7 ? '#b06a6a' : shade(st.mid, 10);
    ctx.save();
    ctx.globalAlpha = (rise < 0.35 ? 0.45 : 0.5) * fade;
    ctx.fillStyle = floorCol;
    ctx.beginPath();
    ctx.moveTo(px + nx * W, py + ny * W * squash);
    ctx.lineTo(px2 + nx * W, py2 + ny * W * squash);
    ctx.lineTo(px2 - nx * W, py2 - ny * W * squash);
    ctx.lineTo(px - nx * W, py - ny * W * squash);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const lift = sc * 0.34; // knee height: the horizon indoors
    const rise = Math.min(1, t / 0.4);
    const dx = px2 - px;
    const dy = py2 - py;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE HORIZON-LINE: dead level along the corridor.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.lineTo(px2, py2 - lift);
    ctx.stroke();
    // THE STRETCHED SUN: a bar of gold the corridor's full length,
    // climbing from below the horizon to above it — clipped by the
    // line while it rises (only the top sliver shows early).
    const sunH = sc * 0.2;
    const climb = (rise - 0.5) * 2 * sunH; // -sunH → +sunH
    const topY = -lift - Math.max(0, climb);
    const showH = Math.min(sunH, sunH + climb);
    if (showH > 0.5) {
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.moveTo(px, py + topY);
      ctx.lineTo(px2, py2 + topY);
      ctx.lineTo(px2, py2 - lift + Math.min(0, climb) + (climb < 0 ? showH : 0));
      ctx.lineTo(px, py - lift + Math.min(0, climb) + (climb < 0 ? showH : 0));
      ctx.closePath();
      ctx.fill();
      // The sun's upper limb: a white-hot rim once it's clear.
      if (climb > 0) {
        ctx.globalAlpha = 0.97 * fade;
        ctx.strokeStyle = '#fffdf2';
        ctx.lineWidth = Math.max(1.8, sc * 0.045);
        ctx.beginPath();
        ctx.moveTo(px, py + topY);
        ctx.lineTo(px2, py2 + topY);
        ctx.stroke();
      }
    }
    // First light spikes: short vertical rays off the risen limb.
    if (rise > 0.6) {
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = '#fff0c0';
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      for (let k = 0; k < 5; k++) {
        const f = (k + 0.5) / 5;
        ctx.beginPath();
        ctx.moveTo(px + dx * f, py + dy * f - lift - sunH - sc * 0.04);
        ctx.lineTo(px + dx * f, py + dy * f - lift - sunH - sc * 0.16);
        ctx.stroke();
      }
    }
    if (t < 0.14) c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, c.radius + 1.2, 0.5 * (1 - t / 0.14));
    ctx.restore();
    void st;
  },
};

// ------------------------------------------------------------ moonfall

/**
 * MOONFALL — "the returned moon."
 * Borrowed, then given back gently: a pale cratered disc descends
 * without violence, settles half-buried — a moon dome standing out
 * of the grass, maria and all — glows its thanks, and sinks the
 * rest of the way under. A ring of moon-dust and one crescent
 * stain stay where it went home, for nine seconds.
 */
const moonfall: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    frost.deployments.fog!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.6, dur: 1, scale: 0.7 });
    // Moon-dust: a ring of pale grains + the crescent stain.
    const rand = srand(c.seed ^ 0x300f);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.3;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5,
        k % 2 === 0 ? '#e8f0f8' : '#bcd8f0',
        { life: 9, size: 0.05, flicker: 0.25 });
    }
    for (let k = 0; k < 4; k++) {
      const a = Math.PI * 0.25 + (k / 3) * Math.PI * 0.5;
      lay(c, c.wx + Math.cos(a) * 0.24, c.wy + Math.sin(a) * 0.24,
        '#bcd8f0', { life: 9.5, size: 0.05 });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    // The seat: a soft depression ring where the moon rests.
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(3, sc * 0.08);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.42, rPx * 0.42 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // THE RETURN: descend 0→0.3 (gently — ease-out, no smear),
    // settle half-buried 0.3→0.7 (the dome), sink under 0.7→0.95.
    const descend = Math.min(1, t / 0.3);
    const sink = Math.max(0, (t - 0.7) / 0.25);
    const R = rPx * 0.4;
    const domeH = R * 0.85 * (1 - sink);
    const y = py - sc * 1.8 * (1 - descend) * (1 - descend) - domeH * 0 + sc * 0.02;
    if (sink < 1) {
      // The dome: the moon's visible half — pale body, darker limb
      // band, two maria, all clipped at the ground line.
      const topY = y - domeH;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#e8f0f8';
      ctx.beginPath();
      ctx.ellipse(px, y, R, domeH, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#bcd8f0';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, y, R, domeH, 0, Math.PI + 0.15, Math.PI * 2 - 0.15);
      ctx.stroke();
      // Maria: two grey seas on the visible face.
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#a8bcd0';
      ctx.beginPath();
      ctx.ellipse(px - R * 0.34, y - domeH * 0.45, R * 0.16, domeH * 0.12, 0.3, 0, Math.PI * 2);
      ctx.ellipse(px + R * 0.22, y - domeH * 0.6, R * 0.11, domeH * 0.09, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // The thanks: a soft glow pulse once seated.
      if (t > 0.32 && t < 0.6) {
        const k = Math.sin(((t - 0.32) / 0.28) * Math.PI);
        ctx.globalAlpha = 0.5 * k;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.6, sc * 0.04);
        ctx.beginPath();
        ctx.ellipse(px, y, R * 1.06, domeH * 1.08, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        c.glow(c.wx, c.wy, c.radius * 0.8, 0.4 * k);
      }
      void topY;
    }
    // The touch: one ring of displaced dust at the set-down moment.
    const tPrev = t - c.frameDt * 1000 / 780;
    if (tPrev < 0.3 && t >= 0.3) {
      c.particles.burst(c.wx, c.wy, 8, ['#e8f0f8', '#bcd8f0'], {
        speed: 1, life: 1.2, size: 0.05, gravity: 0, shape: 'mote',
        z: 0.05, vz: 0.4, zg: 1.5, land: 'settle', layer: 'world', wobble: 0.3,
      });
    }
    ctx.restore();
    void st; void squash;
  },
};

// ----------------------------------------------------------- shearwind

/**
 * SHEARWIND — "the unwound bobbin."
 * One coil comes loose: a spindle-axis stands at the center and a
 * single pale thread pays out in a widening whirl — its free end
 * whipping at the rim — until the whole coil has left and the bare
 * spindle TOPPLES. The thread lies where it fell: a loose arc of
 * grains at the rim, next to the spindle's own resting stain.
 */
const shearwind: AbilitySig = {
  spawn(c) {
    storm.deployments.crackle!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    // The fallen thread: a loose arc at the rim + the spindle stain.
    const a0 = (c.seed % 7) * 0.5;
    for (let k = 0; k < 6; k++) {
      const a = a0 + (k / 6) * Math.PI * 1.1;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.82, c.wy + Math.sin(a) * c.radius * 0.82,
        k % 2 === 0 ? '#f0f6fa' : '#c8d8e4', { life: 8, size: 0.045 });
    }
    lay(c, c.wx + 0.3, c.wy + 0.1, shade(c.st.deep, -8), { life: 8.5, size: 0.065 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The whirl's floor track: a widening dashed circle chasing the
    // thread's end.
    const payout = Math.min(1, t / 0.55);
    const rr = rPx * (0.2 + payout * 0.72);
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.setLineDash([sc * 0.12, sc * 0.1]);
    ctx.lineDashOffset = -c.now / 12;
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const payout = Math.min(1, t / 0.55);
    const topple = Math.max(0, (t - 0.62) / 0.25);
    ctx.save();
    ctx.lineCap = 'round';
    // THE SPINDLE: a standing axis with a shrinking coil bulge —
    // toppling once bare.
    const H = sc * 0.85;
    const lean = topple * (Math.PI / 2) * 0.9;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(lean);
    ctx.globalAlpha = 0.95 * (t < 0.85 ? 1 : (1 - t) / 0.15);
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -H);
    ctx.stroke();
    // The coil: a bulge that thins as the thread pays out.
    const coilW = sc * 0.14 * (1 - payout);
    if (coilW > 1) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#f0f6fa';
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.5, coilW, H * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c8d8e4';
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(0, -H * (0.36 + k * 0.14), coilW * 0.95, sc * 0.03, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    // THE THREAD: a spiral polyline from the spindle's waist out to
    // the whipping free end — the one loose coil, leaving.
    if (payout > 0.02 && topple < 0.5) {
      const turns = 2.2;
      const endA = c.now / 140;
      ctx.globalAlpha = 0.95 * (1 - topple * 2 * 0.5);
      ctx.strokeStyle = '#f0f6fa';
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      const N = 14;
      for (let k = 0; k <= N; k++) {
        const f = k / N;
        const a = endA - (1 - f) * turns * Math.PI * 2 * (1 - payout * 0.4);
        const rr = rPx * (0.1 + f * (0.2 + payout * 0.72));
        const x = px + Math.cos(a) * rr;
        const y = py - sc * 0.45 * (1 - f * 0.6) + Math.sin(a) * rr * squash * 0.6;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // The free end whips with a bright tip.
      const tipA = endA;
      const tipR = rPx * (0.3 + payout * 0.72);
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = st.core;
      const g = Math.max(2.2, sc * 0.055);
      ctx.fillRect(px + Math.cos(tipA) * tipR - g / 2,
        py - sc * 0.18 + Math.sin(tipA) * tipR * squash * 0.6 - g / 2, g, g);
    }
    // The rearrangement: one hard gust ring at full payout.
    if (t > 0.5 && t < 0.62) {
      const k = 1 - (t - 0.5) / 0.12;
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      const rr = rPx * (0.8 + (1 - k) * 0.25);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, c.radius, 0.5 * k);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ the_molt

/**
 * THE_MOLT — "the wax seal."
 * Every feather knows an address, and every delivery is STAMPED:
 * the burning feather arrives point-down, presses a round orange
 * seal onto the ground — post paid — then curls and burns away
 * from the tip up. The seal stays: a bright-centered stamp of
 * grains, nine seconds. Five feathers, five receipts.
 */
const the_molt: AbilitySig = {
  spawn(c) {
    fire.deployments.burst!(asMatter(c), c.wx, c.wy, { scale: 0.35 });
    // THE SEAL: a stamped round — ring grains + bright center.
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.13, c.wy + Math.sin(a) * 0.13,
        '#e8823d', { life: 9, size: 0.045, fade: '#8a4a2a', fadeAt: 0.5 });
    }
    lay(c, c.wx, c.wy, '#ffb36a', { life: 9.5, size: 0.055, flicker: 0.25, fade: '#c85a28', fadeAt: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The pressed seal: a neat orange round with a crimped edge.
    const press = Math.min(1, Math.max(0, (t - 0.12) / 0.08));
    if (press <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = shade('#e8823d', -12);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.19 * press, sc * 0.15 * press * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = '#ffb36a';
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.setLineDash([sc * 0.045, sc * 0.03]); // the crimp
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.16 * press, sc * 0.125 * press * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    ctx.lineCap = 'round';
    // THE FEATHER: point-down arrival (0→0.12), the press (0.12→
    // 0.2), then the burn — curling from the tip up, ember edge
    // eating the vane until only a drifting ash tip remains.
    if (t < 0.62) {
      const arrive = Math.min(1, t / 0.12);
      const burn = Math.max(0, (t - 0.2) / 0.42);
      const baseY = py - sc * 0.06 - (1 - arrive) * sc * 1.6;
      const H = sc * 0.6 * (1 - burn * 0.85);
      const curl = burn * 0.9;
      // The shaft, curling as it burns.
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = shade('#ff9a5a', -18);
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.moveTo(px, baseY);
      ctx.quadraticCurveTo(px + curl * sc * 0.2, baseY - H * 0.6, px + curl * sc * 0.4, baseY - H);
      ctx.stroke();
      // The vanes: four barb pairs, eaten from the bottom up.
      for (let k = 0; k < 4; k++) {
        const f = 0.25 + k * 0.2;
        if (f < burn) continue; // burnt away
        const vy = baseY - H * f;
        const vx = px + curl * sc * 0.4 * f;
        const vw = sc * (0.14 - k * 0.02);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = k % 2 === 0 ? '#ff9a5a' : '#e8823d';
        ctx.lineWidth = Math.max(1.6, sc * 0.038);
        ctx.beginPath();
        ctx.moveTo(vx - vw, vy + sc * 0.05);
        ctx.lineTo(vx, vy);
        ctx.lineTo(vx + vw, vy + sc * 0.05);
        ctx.stroke();
      }
      // The ember edge: a bright bead riding the burn line.
      if (burn > 0 && burn < 1) {
        const ey = baseY - H * burn;
        const ex = px + curl * sc * 0.4 * burn;
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = '#fff1d8';
        const g = Math.max(2, sc * 0.05);
        ctx.fillRect(ex - g / 2, ey - g / 2, g, g);
        if (Math.random() < c.frameDt * 10) {
          c.particles.burst(c.wx, c.wy, 1, ['#c85a28', '#8a4a2a'], {
            speed: 0.1, life: 0.6, size: 0.04, gravity: 0, shape: 'mote',
            z: 0.4, vz: 0.4, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.4,
          });
        }
      }
    }
    // The press flash: post paid.
    if (t > 0.12 && t < 0.22) {
      const k = 1 - (t - 0.12) / 0.1;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = '#fff1d8';
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.16, sc * 0.06, 4, 0.4, c.squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.6, 0.35 * k);
    }
    ctx.restore();
    void st;
  },
};

// ----------------------------------------------------------- hollowing

/**
 * HOLLOWING — "the polite pit."
 * The hungry dark, but COURTEOUS: a round pit opens with a neat
 * rolled rim — a formal napkin-ring of dark — and each beat it
 * extends the invitation: the band around it dims one step, and
 * the grass bows toward it in synchronized pairs. A bow, never a
 * drag. The rolled rim stays printed as a neat circle of dark
 * grains for nine seconds.
 */
const hollowing: AbilitySig = {
  spawn(c) {
    const beat = Math.floor((c.now - c.age) / 800);
    if (beat !== 0) return;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.5, c.wy + Math.sin(a) * 0.5,
        shade(c.st.deep, -16), { life: 9, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const beatT = (c.now % 800) / 800;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE PIT: pure dark, round, with a neat ROLLED RIM — a paler
    // torus lip all the way around (the courtesy).
    const R = sc * 0.5;
    ctx.globalAlpha = 0.97 * fade;
    ctx.fillStyle = '#0f0b16';
    ctx.beginPath();
    ctx.ellipse(px, py, R, R * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = shade(st.mid, -8);
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 1.06, R * 1.06 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -20);
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 1.14, R * 1.14 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // THE INVITATION: the band dims in a soft step each beat.
    const dim = 0.16 + 0.1 * (1 - beatT);
    ctx.globalAlpha = dim * fade;
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.88, rPx * 0.88 * squash, 0, 0, Math.PI * 2);
    ctx.ellipse(px, py, R * 1.15, R * 1.15 * squash, 0, Math.PI * 2, 0, true);
    ctx.fill();
    // THE BOWS: grass ticks in facing pairs, bending together on
    // the beat — synchronized courtesy.
    const bow = Math.sin(Math.min(1, beatT * 2) * Math.PI) * 0.5;
    const rand = srand(c.seed ^ 0x8011);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rPx * (0.55 + rand() * 0.35);
      for (const s of [0, Math.PI]) {
        const bx = px + Math.cos(a + s) * rr;
        const by = py + Math.sin(a + s) * rr * squash;
        ctx.globalAlpha = 0.8 * fade;
        ctx.strokeStyle = k % 2 === 0 ? shade(st.deep, -6) : st.deep;
        ctx.lineWidth = Math.max(1.6, sc * 0.038);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + (px - bx) * 0.12 * bow, by + (py - by) * 0.12 * bow - sc * 0.09 * (1 - bow));
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    // The RSVP: single motes accept the invitation on each beat's
    // opening — drifting in slow, politely, one at a time.
    const beatT = (c.now % 800) / 800;
    if (beatT < 0.3 && c.t < 0.85 && Math.random() < c.frameDt * 6) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * 1.4, c.wy + Math.sin(a) * 1.4,
        1, [c.st.mid, c.st.spark], {
          speed: 1.1, life: 0.9, size: 0.045, gravity: 0,
          dir: a + Math.PI, spread: 0.05, shape: 'glint',
          z: 0.08, layer: 'world', shadow: 0, drag: 0.3,
        });
    }
    c.glow(c.wx, c.wy, c.radius * 0.4, 0.12);
  },
};

// ------------------------------------------------------------ red_toll

/**
 * RED_TOLL — "the ledger thread."
 * The cup goes down the line at ankle height: each hop strings a
 * thin red thread low across the ground, and payment flows BACK
 * along it — a red bead sliding from the struck one toward the
 * last, swallowed at the origin end. Dotted stains along the
 * thread's line and a coin-sized mark at the pay point keep the
 * account for eight seconds.
 */
const red_toll: AbilitySig = {
  spawn(c) {
    blood.deployments.spray!(asMatter(c), c.wx2, c.wy2, { dir: Math.atan2(c.wy - c.wy2, c.wx - c.wx2), scale: 0.4 });
    // The account's record: dots along the thread + the pay mark.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    for (let k = 0; k < 4; k++) {
      const f = (k + 0.5) / 4;
      lay(c, c.wx + dx * f, c.wy + dy * f, '#63201a', { life: 8, size: 0.04 });
    }
    lay(c, c.wx2, c.wy2, '#8e2a20', { life: 8.5, size: 0.065 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE THREAD: strung low from origin to the struck (0→0.15),
    // then carrying the bead home (0.2→0.8).
    const strung = Math.min(1, t / 0.15);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#b8362a';
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (px2 - px) * strung, py + (py2 - py) * strung);
    ctx.stroke();
    // The sag: one darker under-thread showing the line's weight.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = '#63201a';
    ctx.lineWidth = Math.max(2.4, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(px, py + sc * 0.02);
    const mx = (px + px2) / 2;
    const my = (py + py2) / 2 + sc * 0.07;
    ctx.quadraticCurveTo(mx, my, px + (px2 - px) * strung, py + (py2 - py) * strung + sc * 0.02);
    ctx.stroke();
    // THE PAYMENT: the bead slides from the struck BACK to origin.
    if (t > 0.2) {
      const u = Math.min(1, (t - 0.2) / 0.6);
      const bx = px2 + (px - px2) * u;
      const by = py2 + (py - py2) * u + Math.sin(u * Math.PI) * sc * 0.06;
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = '#d84a3a';
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.055, sc * 0.05 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = '#fff0f0';
      ctx.fillRect(bx - 1, by - sc * 0.03, Math.max(1.5, sc * 0.018), Math.max(1.5, sc * 0.018));
      // Swallowed at the origin: one small click.
      if (u >= 1 && t < 0.9) {
        ctx.globalAlpha = 0.9 * (1 - (t - 0.8) / 0.1);
        ctx.fillStyle = '#d84a3a';
        ctx.beginPath();
        burstStarPath(ctx, px, py, sc * 0.1, sc * 0.04, 4, 0.4, squash);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    // The toll taken: a brief red star at the struck one's ankle.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      ctx.save();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.14, sc * 0.2, sc * 0.075, 5, c.now / 300, 1);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx2, c.wy2, 0.7, 0.4 * k);
    }
  },
};

// --------------------------------------------------------------- axiom

/**
 * AXIOM — "q.e.d."
 * State the obvious until the room accepts it: pulse one inscribes
 * a small triangle in the circle; pulse two restates it larger,
 * corners dotted; pulse three double-strikes the edges and sets
 * the period at the center — proof accepted. The final figure's
 * corner dots and period stay on the ground for nine seconds.
 */
const axiom: AbilitySig = {
  spawn(c) {
    const beat = Math.floor((c.now - c.age) / 450) % 3;
    if (beat !== 2) return;
    // The accepted proof: corner dots + the period, laid to stay.
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.62, c.wy + Math.sin(a) * c.radius * 0.62,
        '#e8e0f8', { life: 9, size: 0.055, flicker: 0.2 });
    }
    lay(c, c.wx, c.wy, '#ffffff', { life: 9.5, size: 0.06 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const beat = Math.floor((c.now - c.age) / 450) % 3;
    const fade = 1 - t * 0.5;
    const scaleK = 0.4 + beat * 0.22; // each statement larger
    const R = rPx * scaleK;
    const draw = Math.min(1, t / 0.4);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE FIGURE: an inscribed triangle, drawn edge by edge — the
    // third statement double-struck.
    const pts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * Math.PI * 2;
      pts.push({ x: px + Math.cos(a) * R, y: py + Math.sin(a) * R * squash });
    }
    const strokes = beat === 2 ? 2 : 1;
    for (let s = 0; s < strokes; s++) {
      const off = s * sc * 0.045;
      ctx.globalAlpha = (s === 0 ? 0.95 : 0.7) * fade;
      ctx.strokeStyle = s === 0 ? st.mid : st.core;
      ctx.lineWidth = Math.max(1.8, sc * (0.045 + beat * 0.008));
      ctx.beginPath();
      for (let e = 0; e < 3; e++) {
        const eDraw = Math.min(1, Math.max(0, draw * 3 - e));
        if (eDraw <= 0) break;
        const p0 = pts[e]!;
        const p1 = pts[(e + 1) % 3]!;
        ctx.moveTo(p0.x, p0.y - off);
        ctx.lineTo(p0.x + (p1.x - p0.x) * eDraw, p0.y + (p1.y - p0.y) * eDraw - off);
      }
      ctx.stroke();
    }
    // Corner dots from the second statement on.
    if (beat >= 1 && draw > 0.9) {
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = st.core;
      for (const p of pts) {
        const g = Math.max(2.2, sc * 0.055);
        ctx.fillRect(p.x - g / 2, p.y - g / 2, g, g);
      }
    }
    // THE PERIOD: the third statement's final dot, set at center.
    if (beat === 2 && t > 0.5) {
      const k = Math.min(1, (t - 0.5) / 0.1);
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = '#ffffff';
      const g = Math.max(3, sc * 0.075) * k;
      ctx.fillRect(px - g / 2, py - g / 2, g, g);
      if (t < 0.65) c.glow(c.wx, c.wy, c.radius * 0.7, 0.4 * (1 - (t - 0.5) / 0.15));
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const beat = Math.floor((c.now - c.age) / 450) % 3;
    // The statement's voice: the figure echoed faint at chest
    // height while it draws — the room hearing it before agreeing.
    if (t < 0.4) {
      const R = sc * (0.24 + beat * 0.1);
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - t / 0.4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      for (let k = 0; k <= 3; k++) {
        const a = -Math.PI / 2 + (k / 3) * Math.PI * 2;
        const x = px + Math.cos(a) * R;
        const y = py - sc * 0.7 + Math.sin(a) * R * 0.6;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  },
};

// ----------------------------------------------------------- perihelion

/**
 * PERIHELION — "the closest pass."
 * The comet does NOT land — closest, this once, means here: the
 * head skims in on a shallow arc, kisses the ground at the mark,
 * and climbs away on the far side still going — leaving its tail
 * draped across the circle: a curved band of ice-dust that settles
 * where the sky briefly lay. An arc of teal grains and two icy
 * glints keep the drape for nine seconds.
 */
const perihelion: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    frost.deployments.bloom!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.5, dur: 0.6, scale: 0.6 });
    // The draped tail: an arc of grains across the circle + two
    // resting glints.
    const a0 = (c.seed % 7) * 0.45;
    for (let k = 0; k < 7; k++) {
      const f = k / 6;
      const a = a0 + 0.5 + f * 1.6;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        k % 2 === 0 ? '#dffcf8' : '#9ae8de',
        { life: 9, size: 0.05, flicker: 0.25 });
    }
    for (let k = 0; k < 2; k++) {
      c.particles.burst(c.wx + (k - 0.5) * 0.5, c.wy + 0.1, 1, ['#dffcf8'], {
        speed: 0.03, life: 8.5, size: 0.07, gravity: 0, shape: 'glint',
        layer: 'world', z: 0.06, flicker: 0.3,
        fade: '#9ae8de', fadeAt: 0.5,
      });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const a0 = (c.seed % 7) * 0.45;
    ctx.save();
    ctx.lineCap = 'round';
    // THE DRAPE: the tail lies across the circle as a curved band —
    // teal bed under an ice-bright crest — settling (alpha rising)
    // as the head departs.
    const settle = Math.min(1, Math.max(0, (t - 0.2) / 0.3));
    if (settle > 0) {
      ctx.globalAlpha = 0.55 * settle * fade;
      ctx.strokeStyle = shade('#3a6a64', 0);
      ctx.lineWidth = Math.max(5, sc * 0.15);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.7, rPx * 0.7 * squash, 0, a0 + 0.5, a0 + 2.1);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * settle * fade;
      ctx.strokeStyle = '#9ae8de';
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.7, rPx * 0.7 * squash, 0, a0 + 0.55, a0 + 2.05);
      ctx.stroke();
    }
    // The kiss point: a shallow graze scar, not a crater — one
    // bright skid line at the arc's middle.
    if (t > 0.14) {
      const ka = a0 + 1.3;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = '#dffcf8';
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(ka) * rPx * 0.55, py + Math.sin(ka) * rPx * 0.55 * squash);
      ctx.lineTo(px + Math.cos(ka) * rPx * 0.85, py + Math.sin(ka) * rPx * 0.85 * squash);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.35 * fade);
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const a0 = (c.seed % 7) * 0.45;
    ctx.save();
    ctx.lineCap = 'round';
    // THE PASS: the head skims in (0→0.14), kisses (0.14), and
    // climbs OUT the far side (0.14→0.5) — one continuous shallow
    // arc through the scene, never a fall.
    if (t < 0.5) {
      const u = t / 0.5;
      const pathA = a0 + 1.3;
      const inX = px + Math.cos(pathA) * rPx * 1.6;
      const inY = py + Math.sin(pathA) * rPx * 1.6 * squash - sc * 1.7;
      const outX = px - Math.cos(pathA) * rPx * 1.5;
      const outY = py - Math.sin(pathA) * rPx * 1.5 * squash - sc * 1.9;
      // Quadratic path through the kiss point.
      const hx = (1 - u) * (1 - u) * inX + 2 * (1 - u) * u * px + u * u * outX;
      const hy = (1 - u) * (1 - u) * inY + 2 * (1 - u) * u * (py - sc * 0.05) + u * u * outY;
      // The head: an icy core with a bright limb toward travel.
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#dffcf8';
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.13, sc * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#9ae8de';
      ctx.beginPath();
      ctx.ellipse(hx + sc * 0.04, hy + sc * 0.03, sc * 0.06, sc * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // The tail streams BEHIND along the path, always away from
      // travel — three trailing strands.
      const bx = (1 - Math.max(0, u - 0.18)) ** 2 * inX + 2 * (1 - Math.max(0, u - 0.18)) * Math.max(0, u - 0.18) * px + Math.max(0, u - 0.18) ** 2 * outX;
      const by = (1 - Math.max(0, u - 0.18)) ** 2 * inY + 2 * (1 - Math.max(0, u - 0.18)) * Math.max(0, u - 0.18) * (py - sc * 0.05) + Math.max(0, u - 0.18) ** 2 * outY;
      for (let s = -1; s <= 1; s++) {
        ctx.globalAlpha = 0.8 - Math.abs(s) * 0.25;
        ctx.strokeStyle = s === 0 ? '#dffcf8' : '#9ae8de';
        ctx.lineWidth = Math.max(1.6, sc * (0.045 - Math.abs(s) * 0.012));
        ctx.beginPath();
        ctx.moveTo(bx + s * sc * 0.06, by + Math.abs(s) * sc * 0.04);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
      // The kiss: one hard star the frame it touches.
      if (u > 0.46 && u < 0.6) {
        const k = 1 - (u - 0.46) / 0.14;
        ctx.globalAlpha = 0.95 * k;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        burstStarPath(ctx, px, py - sc * 0.05, sc * 0.36, sc * 0.13, 6, c.now / 300, squash);
        ctx.fill();
        c.glow(c.wx, c.wy, 1.2, 0.7 * k);
      }
      // Ice-dust sheds along the whole pass, falling to the drape.
      if (Math.random() < c.frameDt * 16) {
        c.particles.burst(c.wx + (hx - px) / sc, c.wy + (hy - (py - sc * 0.05)) / sc / squash + 0.2, 1,
          ['#dffcf8', '#9ae8de'], {
            speed: 0.15, life: 1, size: 0.045, gravity: 0, shape: 'glint',
            z: Math.max(0.1, (py - hy) / sc * 0.5), vz: -0.3, zg: 1.5,
            land: 'settle', layer: 'world', shadow: 0, wobble: 0.3,
          });
      }
    }
    ctx.restore();
    void st;
  },
};

// ----------------------------------------------------------- crownstorm

/**
 * CROWNSTORM — "the presentation."
 * Every head in the line is PRESENTED: at each hop's strike a
 * small gold coronet descends from above with ceremony, holds one
 * beat on the presented head, then dissolves into gold drips —
 * while the hop line hangs as a herald's cord with a tassel-knot
 * swinging once at its middle. A crown-shaped stain of gold grains
 * marks each presentation for eight seconds.
 */
const crownstorm: AbilitySig = {
  spawn(c) {
    storm.deployments.crackle!(asMatter(c), c.wx2, c.wy2, { scale: 0.5 });
    // The presentation's stain: three gold grains in a small arc +
    // a center dot — a crown, printed.
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.7;
      lay(c, c.wx2 + Math.cos(a) * 0.16, c.wy2 + Math.sin(a) * 0.16,
        '#fff0a0', { life: 8, size: 0.045, flicker: 0.25, fade: '#a8862e', fadeAt: 0.5 });
    }
    lay(c, c.wx2, c.wy2, '#ffd98a', { life: 8.5, size: 0.05 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE HERALD'S CORD: the hop line as a formal gold cord with a
    // sag — and a tassel-knot at the middle that swings ONCE.
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = '#c9a23c';
    ctx.lineWidth = Math.max(1.8, sc * 0.042);
    const mx = (px + px2) / 2;
    const my = (py + py2) / 2 + sc * 0.1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(mx, my, px2, py2);
    ctx.stroke();
    // The tassel: one swing, damped.
    const swing = Math.sin(Math.min(1, t / 0.5) * Math.PI * 2) * (1 - Math.min(1, t / 0.5)) * 0.6;
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.sin(swing) * sc * 0.14, my + Math.cos(swing) * sc * 0.16);
    ctx.stroke();
    ctx.fillStyle = '#fff0a0';
    const g = Math.max(2, sc * 0.05);
    ctx.fillRect(mx + Math.sin(swing) * sc * 0.14 - g / 2, my + Math.cos(swing) * sc * 0.16 - g / 2, g, g);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2 } = c;
    const hy = py2 - sc * 0.95;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // THE CORONET: descends 0→0.25 with ceremony (slow ease), holds
    // 0.25→0.6 on the presented head, dissolves 0.6→0.85 into gold
    // drips.
    const descend = Math.min(1, t / 0.25);
    const dissolve = Math.max(0, (t - 0.6) / 0.25);
    if (dissolve < 1) {
      const y = hy - sc * 1.1 * (1 - descend * (2 - descend)); // ease-out
      const W = sc * 0.2;
      const H = sc * 0.14;
      const al = 1 - dissolve;
      // The band.
      ctx.globalAlpha = 0.97 * al;
      ctx.fillStyle = '#c9a23c';
      ctx.fillRect(px2 - W, y, W * 2, H * 0.55);
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(px2 - W, y, W * 2, H * 0.22);
      // Three points with bead tips.
      for (let k = 0; k < 3; k++) {
        const bx = px2 + (k - 1) * W * 0.85;
        ctx.fillStyle = '#c9a23c';
        ctx.beginPath();
        ctx.moveTo(bx - W * 0.28, y);
        ctx.lineTo(bx, y - H);
        ctx.lineTo(bx + W * 0.28, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff0a0';
        const g = Math.max(1.8, sc * 0.045);
        ctx.fillRect(bx - g / 2, y - H - g / 2, g, g);
      }
      // The hold's dignity: one slow gleam crossing the band.
      if (descend >= 1 && dissolve === 0) {
        const gl = ((t - 0.25) / 0.35) * W * 2;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#fffdf2';
        ctx.fillRect(px2 - W + gl - sc * 0.02, y, Math.max(2, sc * 0.045), H * 0.55);
      }
      // The dissolve: gold drips fall off the band's lower edge.
      if (dissolve > 0 && Math.random() < c.frameDt * 18) {
        c.particles.burst(c.wx2, c.wy2, 1, ['#ffd98a', '#c9a23c'], {
          speed: 0.1, life: 0.7, size: 0.045, gravity: 0, shape: 'drop',
          z: 1.0, vz: -0.3, zg: 4, land: 'die', layer: 'world', shadow: 0,
        });
      }
    }
    // The presentation flash: the moment the coronet seats.
    if (t > 0.24 && t < 0.34) {
      const k = 1 - (t - 0.24) / 0.1;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fff0a0';
      ctx.beginPath();
      burstStarPath(ctx, px2, hy - sc * 0.05, sc * 0.24, sc * 0.09, 5, c.now / 350, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.9, 0.5 * k);
    }
    ctx.restore();
    void st;
  },
};

// -------------------------------------------------------- the registry

/** The ten voices' signatures, keyed by ability id. */
export const VOICES_SIGS: Record<string, AbilitySig> = {
  wild_root,
  day_breaks,
  moonfall,
  shearwind,
  the_molt,
  hollowing,
  red_toll,
  axiom,
  perihelion,
  crownstorm,
};
