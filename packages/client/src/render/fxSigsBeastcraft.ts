/**
 * THE KEEPER'S TONGUE — the beastcraft wave (THE ARMORY REMEMBERS,
 * wave 7b: care, call, and calm on three strata).
 *
 * The school's words are workings, never blows — and now every
 * working lands on all three layers: the painted care, the matter
 * that settles gently off it, and THE LASTING MARK: a strewn table
 * of real grain, two paw prints where the borrowed pelt seated,
 * a scatter of species-signs where the whole tongue was heard.
 *
 * Wire dialects: 'becalm' (1000 ms at the stilled one), 'command'
 * (850 ms, caster → pet/mark via x2), 'howl' (1600 ms, the
 * capstone's roll), 'summon' (the bait, whose radius is its TRUE
 * draw — the SUMMON LAW), and 'buff' (the quiet walk's one
 * ceremony). Binding laws as ever: hard edges, save/restore
 * hygiene, squash on ground y-radii, srand determinism, frameDt-
 * gated emission, ≤ ~60 path ops per hook per frame. No centerpiece
 * repeats another's, nor any of this file's former ones (the
 * lowered eyes, the road folds shut, the pointed dart, the thrown
 * poultice, the laid table, walking as the wild walks, one howl
 * two throats, the cry that stands them up, the whole tongue at
 * once — all retired whole).
 *
 * ONE-VOICE stands: dust speaks through the MATTER LIBRARY; breath,
 * herb, scent, grain, pelt, and the wild's signs stay the keeper's
 * own — forcing fire or venom onto CARE would make the library lie.
 */

import { shade } from './rig.js';
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, asMatter } from './matter/index.js';

/** Clamp to 0..1. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~10s tertiary stratum).
 */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: { life?: number; size?: number; flicker?: number; fade?: string; fadeAt?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05, life: opts.life ?? 7.5, size: opts.size ?? 0.05,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
  });
}

/**
 * SOOTHE THE WILD — "the smoothed hackles."
 * A hand the size of the calm passes over the wild one: a soft band
 * of light strokes across it head-to-tail, twice, slower the second
 * time — and behind each pass the raised bristle-ticks LIE DOWN in
 * sequence, fur settling under an unseen palm. A few lying bristle
 * grains rest beside it for six seconds.
 */
const soothe_the_wild: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x50a1);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.3, c.wy + Math.sin(a) * 0.3,
        '#b8dcc0', { life: 6, size: 0.04 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    // The calm's floor: a soft sage disc breathing once, slowly.
    const breathe = 0.85 + 0.15 * Math.sin(t * Math.PI);
    ctx.save();
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.5 * breathe, sc * 0.34 * breathe * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x50a2);
    const a = rand() * Math.PI; // the stroke's heading
    const ca = Math.cos(a);
    const sn = Math.sin(a) * 0.4;
    const hy = py - sc * 0.4;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'round';
    // THE STROKES: two passes of a soft light band — the first at
    // 0→0.35, the second 0.45→0.95, slower. Each is a short bright
    // bar sweeping along the heading.
    for (const [born, dur] of [[0.02, 0.33], [0.45, 0.5]] as Array<[number, number]>) {
      const u = cl((t - born) / dur);
      if (u <= 0 || u >= 1) continue;
      const bx = px + ca * sc * (u * 1.2 - 0.6);
      const by = hy + sn * sc * (u * 1.2 - 0.6);
      ctx.globalAlpha = 0.85 * Math.sin(u * Math.PI) * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(3, sc * 0.075);
      ctx.beginPath();
      ctx.moveTo(bx - sn * sc * 0.22, by + ca * sc * 0.22 * 0.4);
      ctx.lineTo(bx + sn * sc * 0.22, by - ca * sc * 0.22 * 0.4);
      ctx.stroke();
    }
    // THE HACKLES: seven bristle ticks along the heading — upright
    // until a stroke passes them, then lying flat, and staying.
    const pass1 = cl((t - 0.02) / 0.33);
    const pass2 = cl((t - 0.45) / 0.5);
    const reach = Math.max(pass1, pass2 * 0.999);
    for (let k = 0; k < 7; k++) {
      const f = (k + 0.5) / 7;
      const bx = px + ca * sc * (f * 1.2 - 0.6);
      const by = hy + sn * sc * (f * 1.2 - 0.6);
      const down = f < reach;
      const H = sc * 0.11;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = down ? shade(st.mid, -10) : shade(st.deep, -6);
      ctx.lineWidth = Math.max(1.5, sc * 0.034);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      if (down) {
        ctx.lineTo(bx + ca * H * 1.3, by + sn * H * 1.3 + sc * 0.02);
      } else {
        const shiver = Math.sin(c.now / 90 + k) * sc * 0.015;
        ctx.lineTo(bx + shiver, by - H);
      }
      ctx.stroke();
    }
    // The let-out breath: one slow sigh mote rising at the end of
    // the second pass.
    if (t > 0.8 && t < 0.98) {
      const u = (t - 0.8) / 0.18;
      ctx.globalAlpha = (1 - u) * 0.7;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, hy - sc * 0.3 - u * sc * 0.3, sc * 0.05, sc * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * COME TO HEEL — "the whistle's thread."
 * The whistle spools a bright thread from the keeper to the friend,
 * however far — then the far end REELS HOME: the thread shortens
 * from the pet's side, three paw-pips stamping along it as the
 * road is eaten, ending in a small meet-flash at the heel. The
 * paw-pips fade over six seconds.
 */
const come_to_heel: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx2, c.wy2, { scale: 0.35 });
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    for (let k = 0; k < 3; k++) {
      const f = 0.25 + k * 0.25;
      lay(c, c.wx + dx * f, c.wy + dy * f, '#8fc7a4', { life: 6, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'round';
    // THE THREAD: spools out fast (0→0.15), then reels home from
    // the far end (0.2→0.85).
    const spool = cl(t / 0.15);
    const reel = cl((t - 0.2) / 0.65);
    const startF = reel; // eaten from the pet's side toward... no:
    // the pet returns TO the keeper: the far end travels home.
    const farF = spool * (1 - reel);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.042);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (px2 - px) * farF, py + (py2 - py) * farF);
    ctx.stroke();
    // The reeling end: a bright bead where the friend is.
    if (farF > 0.02) {
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = st.core;
      const g = Math.max(2.5, sc * 0.06);
      ctx.fillRect(px + (px2 - px) * farF - g / 2, py + (py2 - py) * farF - g / 2, g, g);
    }
    // THE PAW-PIPS: three prints stamp along the eaten road, each
    // appearing as the reel passes its station — two pads + heel.
    for (let k = 0; k < 3; k++) {
      const f = 0.7 - k * 0.22;
      if (farF > f) continue; // not yet eaten past here
      const bx = px + (px2 - px) * f;
      const by = py + (py2 - py) * f;
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = shade(st.mid, -12);
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.045, sc * 0.055 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(bx - sc * 0.045, by - sc * 0.05, sc * 0.022, sc * 0.028, 0, 0, Math.PI * 2);
      ctx.ellipse(bx + sc * 0.045, by - sc * 0.05, sc * 0.022, sc * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE MEET: the flash at the heel as the road closes.
    if (reel >= 1 && t < 0.95) {
      const k = 1 - (t - 0.85) / 0.1;
      ctx.globalAlpha = 0.95 * Math.max(0, k);
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * 0.18, sc * 0.07, 4, 0.6, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.6, 0.35 * Math.max(0, k));
    }
    ctx.restore();
    void startF;
  },
  air() { /* the thread lives on the ground; the meet is enough */ },
};

/**
 * POINT THE FANG — "the borrowed scent."
 * Pointing gives the friend the mark's OWN scent: an amber ribbon
 * curls from the keeper's point to the mark and loops its ankles
 * once — then a second strand breaks off and snaps back to the
 * pet: the scent, shared. The mark keeps a faint amber ankle-ring
 * while the command lives, and its stain for seven seconds.
 */
const point_the_fang: AbilitySig = {
  spawn(c) {
    // The ankle-ring's stain at the mark (x2).
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      lay(c, c.wx2 + Math.cos(a) * 0.16, c.wy2 + Math.sin(a) * 0.16,
        '#d98a5a', { life: 7, size: 0.04, flicker: 0.2 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    // THE ANKLE-RING: a thin amber circle at the mark, held while
    // the command lives — the scent settled where it was given.
    const born = cl((t - 0.3) / 0.1);
    if (born <= 0) return;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    ctx.globalAlpha = 0.85 * born * fade * (0.8 + 0.2 * Math.sin(c.now / 200));
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.042);
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.2, sc * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'round';
    // THE RIBBON: a wavy amber scent-line drifts from the keeper's
    // point to the mark (0→0.3), coils once at its ankles (0.3→
    // 0.45)...
    const drift = cl(t / 0.3);
    const coil = cl((t - 0.3) / 0.15);
    if (drift > 0 && t < 0.5) {
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      const N = 10;
      for (let k = 0; k <= N * drift; k++) {
        const f = k / N;
        const x = px + (px2 - px) * f;
        const wob = Math.sin(f * Math.PI * 3 + c.now / 300) * sc * 0.1 * (1 - f * 0.5);
        const y = py - sc * 0.5 + (py2 - sc * 0.15 - (py - sc * 0.5)) * f + wob;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // The coil: a loop drawn around the mark's ankles.
      if (coil > 0) {
        ctx.beginPath();
        ctx.ellipse(px2, py2 - sc * 0.08, sc * 0.16, sc * 0.07, 0, 0, Math.PI * 2 * coil);
        ctx.stroke();
      }
    }
    // ...then A STRAND SNAPS BACK to the pet: a faster, straighter
    // amber line whipping from the mark toward the caster's side
    // (the friend), with a bright head.
    if (t > 0.48 && t < 0.8) {
      const u = (t - 0.48) / 0.32;
      const hx = px2 + (px - px2) * u;
      const hy = py2 - sc * 0.2 + (py - sc * 0.4 - (py2 - sc * 0.2)) * u;
      ctx.globalAlpha = 0.9 * (1 - u * 0.4) * fade;
      ctx.strokeStyle = shade(st.mid, 14);
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.moveTo(px2 + (px - px2) * Math.max(0, u - 0.2), py2 - sc * 0.2 + (py - sc * 0.4 - (py2 - sc * 0.2)) * Math.max(0, u - 0.2));
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = st.core;
      const g = Math.max(2.2, sc * 0.055);
      ctx.fillRect(hx - g / 2, hy - g / 2, g, g);
    }
    // The point itself: one hard directional tick from the keeper,
    // first frames — the command's grammar.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      const a = Math.atan2(py2 - py, px2 - px);
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * 0.25, py - sc * 0.5 + Math.sin(a) * sc * 0.12);
      ctx.lineTo(px + Math.cos(a) * sc * 0.6, py - sc * 0.5 + Math.sin(a) * sc * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * KEEPER'S BALM — "the green landing."
 * A poultice thrown TRUE: the wrapped bundle lobs on a real arc,
 * herb-leaf spinning behind it, and breaks SOFTLY over the friend —
 * two offset healing rings that travel with the pet's stride, so
 * the mending never asks it to stop. Herb flecks settle and lie
 * for seven seconds.
 */
const keepers_balm: AbilitySig = {
  spawn(c) {
    // Herb flecks at the landing, real and lying.
    const rand = srand(c.seed ^ 0xba1a);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx2, c.wy2, 1, ['#a8d978', '#78a850'], {
        speed: 0.5, life: 7, size: 0.045, gravity: 0,
        dir: a, spread: 0.5, shape: 'shard', spin: 3,
        z: 0.4, vz: 0.4, zg: 2.2, land: 'settle', layer: 'world', wobble: 0.5,
        fade: '#5c7a3c', fadeAt: 0.5,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    // THE WALKING RINGS: after the burst, two soft rings offset
    // along the pet's implied stride — mending in motion.
    if (t < 0.4) return;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    for (let k = 0; k < 2; k++) {
      const u = cl((t - 0.4 - k * 0.18) / 0.4);
      if (u <= 0 || u >= 1) continue;
      const stride = sc * 0.18 * (k + u);
      const rr = sc * (0.2 + u * 0.2);
      ctx.globalAlpha = (1 - u) * 0.85 * fade;
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.ellipse(px2 + stride, py2, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    // THE LOB: the bundle arcs high with true rise and fall (0→
    // 0.38), one herb leaf spinning in its wake.
    if (t < 0.38) {
      const u = t / 0.38;
      const bx = px + (px2 - px) * u;
      const by = py - sc * 0.5 + (py2 - (py - sc * 0.5)) * u - Math.sin(u * Math.PI) * sc * 1.1;
      // The bundle: a small wrapped ball with a cross-tie.
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#a8d978';
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.08, sc * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade('#78a850', -12);
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(bx - sc * 0.08, by);
      ctx.lineTo(bx + sc * 0.08, by);
      ctx.moveTo(bx, by - sc * 0.08);
      ctx.lineTo(bx, by + sc * 0.08);
      ctx.stroke();
      // The spinning leaf behind.
      const lx = px + (px2 - px) * Math.max(0, u - 0.12);
      const ly = py - sc * 0.5 + (py2 - (py - sc * 0.5)) * Math.max(0, u - 0.12) - Math.sin(Math.max(0, u - 0.12) * Math.PI) * sc * 1.1;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(u * 7);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#78a850';
      ctx.beginPath();
      ctx.ellipse(0, 0, sc * 0.06, sc * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Its moving contact shadow below.
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(bx, py + (py2 - py) * u, sc * 0.06, sc * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE SOFT BREAK: no burst star — a gentle open: four herb
    // slips part outward slowly at the landing.
    if (t > 0.36 && t < 0.6) {
      const u = (t - 0.36) / 0.24;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        ctx.globalAlpha = (1 - u) * 0.9;
        ctx.fillStyle = k % 2 === 0 ? '#a8d978' : '#cfe8a8';
        ctx.beginPath();
        ctx.ellipse(px2 + Math.cos(a) * sc * 0.2 * u, py2 - sc * 0.3 + Math.sin(a) * sc * 0.14 * u,
          sc * 0.05, sc * 0.025, a, 0, Math.PI * 2);
        ctx.fill();
      }
      c.glow(c.wx2, c.wy2, 0.6, 0.3 * (1 - u));
    }
    ctx.restore();
    void st;
  },
};

/**
 * STREWN BAIT — "the scattered grace."
 * The table is thrown, not laid: grain flies from the keeper's
 * hand in a true parabolic fan — every kernel a real body that
 * arcs, lands, and LIES there (the bait IS its lasting mark) —
 * while a wide ring of inward nose-dashes marks the true draw
 * radius (the SUMMON LAW, kept honest).
 */
const strewn_bait: AbilitySig = {
  spawn(c) {
    // THE GRAIN: twelve real kernels fanned with z-physics, living
    // ten seconds — the table itself.
    const rand = srand(c.seed ^ 0xba17);
    const a0 = rand() * Math.PI * 2;
    for (let k = 0; k < 12; k++) {
      c.particles.burst(c.wx, c.wy, 1, ['#e8d8a0', '#c4a35a', '#a8884a'], {
        speed: 0.8 + rand() * 1.2, life: 10, size: 0.045,
        gravity: 0, dir: a0 + (rand() - 0.5) * 1.4, spread: 0.3,
        z: 0.5, vz: 1 + rand() * 1.2, zg: 6, land: 'bounce', bounce: 0.3,
        layer: 'world', fade: '#8a7444', fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t * 0.4;
    ctx.save();
    // THE DRAW RING: the bait's true influence — inward nose-dashes
    // (short ticks angled toward the table) at the real radius.
    const R = rPx;
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.6, sc * 0.038);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + c.now / 4000;
      const p0 = { x: px + Math.cos(a) * R, y: py + Math.sin(a) * R * squash };
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p0.x - Math.cos(a) * sc * 0.16, p0.y - Math.sin(a) * sc * 0.16 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // THE CAST: the keeper's hand-sweep — one underhand arc line,
    // first frames only; the grain does the rest.
    if (t < 0.16) {
      const k = 1 - t / 0.16;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.4, sc * 0.34, sc * 0.26, 0, Math.PI * 0.7, Math.PI * 1.6);
      ctx.stroke();
      ctx.restore();
      c.glow(c.wx, c.wy, 0.6, 0.3 * k);
    }
  },
};

/**
 * THE QUIET WALK — "the borrowed pelt."
 * Walking as the wild walks means WEARING the wild: a mist-gray
 * pelt-mantle drapes down over the caster from above — shoulders,
 * back, gone — fading to nothing as it seats, because the disguise
 * that works is the one you cannot see. Two paw prints stamp at
 * the caster's feet pointing onward: you track as beast now.
 */
const the_quiet_walk: AbilitySig = {
  spawn(c) {
    // The prints: two paws at the feet, pointing the walk onward.
    for (const s of [-1, 1]) {
      const bx = c.wx + s * 0.14;
      const by = c.wy + 0.16 + (s === 1 ? 0.08 : 0);
      lay(c, bx, by, shade('#9ab8a0', -18), { life: 8, size: 0.055 });
      lay(c, bx - 0.05, by - 0.07, shade('#9ab8a0', -12), { life: 8, size: 0.03 });
      lay(c, bx + 0.05, by - 0.07, shade('#9ab8a0', -12), { life: 8, size: 0.03 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t > 0.5) return;
    // The hush underfoot: a mist ring that closes inward — the
    // world agreeing not to notice.
    const u = t / 0.5;
    ctx.save();
    ctx.globalAlpha = (1 - u) * 0.6;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    const rr = sc * (0.85 - u * 0.5);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // THE PELT: a soft mantle outline drapes down over the body
    // (0.05→0.5) — a hooded cape silhouette of mist-gray sliding
    // from crown to hem — thinning to invisible as it seats.
    const drape = cl((t - 0.05) / 0.45);
    if (drape > 0 && drape < 1) {
      const topY = py - sc * 1.6 + drape * sc * 0.5;
      const al = Math.sin(drape * Math.PI) * 0.55;
      ctx.globalAlpha = al;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(px, topY);
      ctx.quadraticCurveTo(px - sc * 0.44, topY + sc * 0.3, px - sc * 0.38, topY + sc * 1.0 * drape + sc * 0.2);
      ctx.lineTo(px + sc * 0.38, topY + sc * 1.0 * drape + sc * 0.2);
      ctx.quadraticCurveTo(px + sc * 0.44, topY + sc * 0.3, px, topY);
      ctx.closePath();
      ctx.fill();
      // The pelt's ragged hem: four soft tail-ticks.
      ctx.globalAlpha = al * 0.9;
      ctx.strokeStyle = shade(st.mid, -10);
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      for (let k = 0; k < 4; k++) {
        const f = (k / 3 - 0.5) * 0.6;
        const hx = px + f * sc;
        const hemY = topY + sc * 1.0 * drape + sc * 0.2;
        ctx.beginPath();
        ctx.moveTo(hx, hemY);
        ctx.lineTo(hx + sc * 0.03, hemY + sc * 0.1);
        ctx.stroke();
      }
    }
    // The seat: one soft glint at the crown as it becomes nothing.
    if (t > 0.48 && t < 0.6) {
      const k = 1 - (t - 0.48) / 0.12;
      ctx.globalAlpha = 0.8 * k;
      ctx.fillStyle = st.core;
      const g = Math.max(2, sc * 0.05);
      ctx.fillRect(px - g / 2, py - sc * 1.25 - g / 2, g, g);
    }
    ctx.restore();
  },
};

/**
 * BLOOD OF THE PACK — "the shared pulse."
 * One howl, one blood: a russet heartbeat-line beats at the
 * keeper's chest and another at the friend's — out of phase at
 * first, converging beat by beat until the SAME spike stamps both
 * at once — then both flare together, the blood up in two bodies
 * with one rhythm. Paired russet dots rest at both stations.
 */
const blood_of_the_pack: AbilitySig = {
  spawn(c) {
    lay(c, c.wx, c.wy + 0.1, '#c46a4a', { life: 6, size: 0.045 });
    lay(c, c.wx2, c.wy2 + 0.1, '#c46a4a', { life: 6, size: 0.045 });
  },
  ground() { /* the pulse lives at chest height; the ground stays quiet */ },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // TWO PULSE-LINES: short cardiogram segments at both chests.
    // Phase offset starts at 0.5 beats and converges to 0 by the
    // third beat — the same spike stamping both at the end.
    const stations: Array<[number, number, number]> = [
      [px, py - sc * 0.6, 0],
      [px2, py2 - sc * 0.55, 1],
    ];
    const converge = cl(t / 0.6);
    for (const [bx, by, side] of stations) {
      const phase = (c.now / 380 + side * 0.5 * (1 - converge)) % 1;
      const L = sc * 0.4;
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = side === 0 ? st.mid : shade(st.mid, 10);
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      // The line: flat → spike at the phase point → flat.
      const spikeF = phase;
      for (let k = 0; k <= 8; k++) {
        const f = k / 8;
        const x = bx - L / 2 + L * f;
        let y = by;
        const d = Math.abs(f - spikeF);
        if (d < 0.12) y = by - sc * 0.16 * (1 - d / 0.12) * (f < spikeF ? 1 : 0.5);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // The spike's bead.
      ctx.globalAlpha = 0.97 * fade;
      ctx.fillStyle = st.core;
      const g = Math.max(2, sc * 0.05);
      ctx.fillRect(bx - L / 2 + L * spikeF - g / 2, by - sc * 0.16 - g / 2, g, g);
    }
    // THE SYNC FLARE: when converged, both stations flash on the
    // same beat-crossing.
    if (converge >= 1) {
      const beat = (c.now / 380) % 1;
      if (beat < 0.12) {
        const k = 1 - beat / 0.12;
        for (const [bx, by] of [[px, py - sc * 0.6], [px2, py2 - sc * 0.55]] as Array<[number, number]>) {
          ctx.globalAlpha = 0.9 * k * fade;
          ctx.fillStyle = st.spark;
          ctx.beginPath();
          burstStarPath(ctx, bx, by, sc * 0.14, sc * 0.05, 4, 0.4, 1);
          ctx.fill();
        }
        c.glow(c.wx, c.wy, 0.6, 0.25 * k);
        c.glow(c.wx2, c.wy2, 0.6, 0.25 * k);
      }
    }
    ctx.restore();
  },
};

/**
 * THE KEEPER'S CRY — "the hand under the chest."
 * The cry reaches the fallen friend as one widening horn-band, and
 * where it lands the ground itself helps: a soft dais of light
 * rises under the body like a palm under the chest, holds while
 * the friend's shaky double-outline steadies from wobble to
 * concentric — then sets it down STANDING. The lift's print stays
 * for seven seconds.
 */
const the_keepers_cry: AbilitySig = {
  spawn(c) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      lay(c, c.wx2 + Math.cos(a) * 0.3, c.wy2 + Math.sin(a) * 0.3,
        '#e8d8a0', { life: 7, size: 0.045, flicker: 0.2 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    // THE CRY: one horn-band widening from the keeper toward the
    // fallen (0→0.3) — a single arc, not a ring: it KNOWS where
    // it's going.
    if (t < 0.34) {
      const u = cl(t / 0.3);
      const a = Math.atan2(py2 - py, px2 - px);
      const rr = Math.hypot(px2 - px, py2 - py) * u;
      ctx.globalAlpha = (1 - u * 0.6) * 0.9 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, a - 0.5, a + 0.5);
      ctx.stroke();
    }
    // THE DAIS: a palm of light under the fallen — rises 0.3→0.5,
    // holds, sets down 0.8→1.
    const rise = cl((t - 0.3) / 0.2);
    const setdown = cl((t - 0.8) / 0.2);
    if (rise > 0) {
      const lift = sc * 0.14 * rise * (1 - setdown);
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = shade(st.mid, 14);
      ctx.beginPath();
      ctx.ellipse(px2, py2 - lift, sc * 0.44, sc * 0.3 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The dais's rim + its ground shadow while lifted.
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.8, sc * 0.042);
      ctx.beginPath();
      ctx.ellipse(px2, py2 - lift, sc * 0.44, sc * 0.3 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (lift > 1) {
        ctx.globalAlpha = 0.3 * fade;
        ctx.fillStyle = '#241a2e';
        ctx.beginPath();
        ctx.ellipse(px2, py2 + sc * 0.02, sc * 0.4, sc * 0.24 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    // THE STEADYING: two outline hoops around the friend, wobbling
    // out of phase, converging to concentric as it stands.
    const rise = cl((t - 0.3) / 0.2);
    if (rise <= 0) return;
    const steady = cl((t - 0.45) / 0.35);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    for (let k = 0; k < 2; k++) {
      const wob = Math.sin(c.now / 90 + k * 2.4) * sc * 0.06 * (1 - steady);
      const rr = sc * (0.3 + k * 0.09);
      ctx.globalAlpha = (0.75 - k * 0.2) * fade * rise;
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.ellipse(px2 + wob, py2 - sc * 0.5 + wob * 0.5, rr, rr * squash * 1.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The stand: one warm star as the outlines meet concentric.
    if (steady >= 1 && t < 0.92) {
      const k = 1 - (t - 0.8) / 0.12;
      ctx.globalAlpha = 0.95 * Math.max(0, k);
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - sc * 0.5, sc * 0.2, sc * 0.075, 5, c.now / 400, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.8, 0.45 * Math.max(0, k));
    }
    ctx.restore();
  },
};

/**
 * VOICE OF THE WILD — "every ear at once."
 * The whole tongue, spoken once: as the capstone's ring rolls out,
 * the world ANSWERS in signs — paw, wing, antler, and fish glyphs
 * surface through the circle, each turning to face the speaker,
 * bowing once, and sinking. Four kinds, one sentence. A scatter of
 * sign grains keeps the hearing for eight seconds.
 */
const voice_of_the_wild: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'howl') return;
    const rand = srand(c.seed ^ 0x701c);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * c.radius * 0.8;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? '#7ac4a0' : shade('#7ac4a0', -16),
        { life: 8, size: 0.045, flicker: 0.2 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const ring = cl(t / 0.5);
    ctx.save();
    ctx.lineCap = 'round';
    // The spoken ring: a deep green double-band rolling out.
    if (c.kind === 'howl') {
      const rr = rPx * ring;
      ctx.globalAlpha = 0.55 * (1 - ring * 0.5) * fade;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(4, sc * 0.105);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * (1 - ring * 0.4) * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.96, rr * 0.96 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE SIGNS: eight glyphs at seeded points — each surfaces when
    // the ring passes it, faces the speaker, bows, and sinks.
    const rand = srand(c.seed ^ 0x701d);
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rf = 0.25 + rand() * 0.65;
      const kind = k % 4; // paw / wing / antler / fish
      const p = { x: px + Math.cos(a) * rPx * rf, y: py + Math.sin(a) * rPx * rf * squash };
      const born = rf * 0.5;
      const u = cl((t - born) / 0.14);
      const sink = cl((t - born - 0.4) / 0.2);
      if (u <= 0 || sink >= 1) continue;
      const al = u * (1 - sink) * fade;
      const bow = Math.sin(cl((t - born - 0.2) / 0.15) * Math.PI) * 0.25;
      const S = sc * 0.19 * u;
      ctx.save();
      ctx.translate(p.x, p.y - S * 0.8);
      ctx.rotate(Math.atan2(py - p.y, px - p.x) * 0.15 + bow);
      ctx.globalAlpha = al;
      ctx.strokeStyle = k % 2 === 0 ? '#7ac4a0' : shade('#7ac4a0', 18);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      if (kind === 0) {
        // Paw: one pad + two toes.
        ctx.beginPath();
        ctx.ellipse(0, S * 0.3, S * 0.5, S * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-S * 0.4, -S * 0.3, S * 0.22, S * 0.26, 0, 0, Math.PI * 2);
        ctx.ellipse(S * 0.4, -S * 0.3, S * 0.22, S * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 1) {
        // Wing: two banked arcs.
        ctx.beginPath();
        ctx.moveTo(-S, 0);
        ctx.quadraticCurveTo(-S * 0.3, -S * 0.8, 0, 0);
        ctx.quadraticCurveTo(S * 0.3, -S * 0.8, S, 0);
        ctx.stroke();
      } else if (kind === 2) {
        // Antler: a forked stroke.
        ctx.beginPath();
        ctx.moveTo(0, S * 0.6);
        ctx.lineTo(0, -S * 0.3);
        ctx.moveTo(0, 0);
        ctx.lineTo(-S * 0.5, -S * 0.7);
        ctx.moveTo(0, -S * 0.3);
        ctx.lineTo(S * 0.5, -S * 0.9);
        ctx.stroke();
      } else {
        // Fish: a body curve + tail tick.
        ctx.beginPath();
        ctx.ellipse(0, 0, S * 0.7, S * 0.32, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(S * 0.7, 0);
        ctx.lineTo(S, -S * 0.28);
        ctx.moveTo(S * 0.7, 0);
        ctx.lineTo(S, S * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The speaking: a green breath-fan at the caster's mouth, first
    // frames; the world's answer carries the rest.
    if (c.kind === 'howl' && t < 0.14) {
      const k = 1 - t / 0.14;
      ctx.save();
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.85, sc * 0.24, sc * 0.09, 5, c.now / 350, 1);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx, c.wy, c.radius * 0.6, 0.4 * k);
    }
    // Becalm pips (the per-beast wire): one soft settling glint.
    if (c.kind === 'becalm' && t < 0.5) {
      const k = 1 - t / 0.5;
      ctx.save();
      ctx.globalAlpha = 0.8 * k;
      ctx.fillStyle = '#b8dcc0';
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.5 - k * sc * 0.2, sc * 0.05, sc * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
};

// -------------------------------------------------------- the registry

/** The keeper's tongue, keyed by ability id. */
export const BEASTCRAFT_SIGS: Record<string, AbilitySig> = {
  soothe_the_wild,
  come_to_heel,
  point_the_fang,
  keepers_balm,
  strewn_bait,
  the_quiet_walk,
  blood_of_the_pack,
  the_keepers_cry,
  voice_of_the_wild,
};
