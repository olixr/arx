/**
 * THE SIGNATURE LAW — the archery secret roster (THE ARMORY
 * REMEMBERS, wave 4: the archer's twelve).
 *
 * Rebuilt ground-up to the three-strata bar. This roster still
 * speaks in what each named bow DOES to the world — and now every
 * art speaks on three layers at once:
 *
 *   PRIMARY   the strike statement, painted inside the wire's life.
 *   SECONDARY what flies off: true-altitude matter — flushed wings,
 *             soil clods, ember flakes, sap drops.
 *   TERTIARY  THE LASTING MARK — settled grains in deliberate
 *             formations for ~6-10 s: a blazed trail of chips, a
 *             constellation chart, a glowing drift that cools, a
 *             dotted rail scorch.
 *
 * The ladder's words stay taken: no standing shafts, no fletch-fans
 * (and wave 1's buried arrow belongs to twin_strike). No centerpiece
 * repeats this file's former ones either — the butcher's line, the
 * banked gull, the sown hedge, the passing chord, the lodged briar,
 * the wolf's breath, the pack-ice ridge, the stuttered arrival, the
 * coal orchard, the royal seal, the settled star, the late thunder
 * are all retired whole.
 *
 * Kind map: the fans and single shots arrive as small-radius
 * 'blast's per impact (seeded entry angle); verdant_burst
 * telegraphs then 'blast's wide; hoarfrost is a 'nova';
 * cinder_rain lives as a long 'field' (life = ticks·TICK_MS, so
 * its hooks may gate per-beat work); skyrend rides a 'beam' whose
 * far end is the wall the ray died on. All authoring laws bind:
 * hard edges, save/restore hygiene, squash on ground, srand
 * determinism, frameDt-gated emission, ≤ ~60 path ops per hook.
 */

import { shade } from './rig.js';
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, blood, frost, fire, asMatter } from './matter/index.js';

// ------------------------------------------------------------ helpers

/**
 * The one seeded fact every hook of a cast must agree on: the entry
 * angle of the shot. Drawn from its OWN salt so spawn, ground, and
 * air read the same direction no matter what else each hook rolls.
 */
function entryAngle(c: SigCtx, salt: number): number {
  return srand(c.seed ^ salt)() * Math.PI * 2;
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
    speed: 0.05, life: opts.life ?? 8, size: opts.size ?? 0.055,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

// ---------------------------------------------------------- signatures

/**
 * BROADHEAD — "the blazed trail."
 * A hunter marks the way through: the axe-head takes a BLAZE out of
 * the world — a pale notch wedge hacked at chest height, beading
 * red at its lower corner — while the flight line behind settles as
 * disturbed leaf-drift. Pale chips lie in a line down the lane for
 * nine seconds: the trail, blazed the hunter's way.
 */
const broadhead: AbilitySig = {
  spawn(c) {
    const a = entryAngle(c, 0xb0a1);
    const rand = srand(c.seed ^ 0xb0a2);
    blood.deployments.spray!(asMatter(c), c.wx, c.wy, { dir: a, scale: 0.5 });
    // Disturbed leaf-drift settles along the flight line behind.
    for (let k = 0; k < 4; k++) {
      const d = 0.5 + k * 0.45;
      c.particles.burst(c.wx - Math.cos(a) * d, c.wy - Math.sin(a) * d, 1,
        ['#8a9a5a', '#6f8a4a'], {
          speed: 0.3, life: 5, size: 0.06, gravity: 0, shape: 'shard', spin: 3,
          z: 0.25 + rand() * 0.2, vz: 0.3, zg: 1.5, land: 'settle',
          layer: 'world', wobble: 0.6, fade: '#5a6a3a', fadeAt: 0.5,
        });
    }
    // THE BLAZE LINE: pale chips laid down the lane + drop stains.
    for (let k = 0; k < 4; k++) {
      const d = 0.25 + k * 0.4;
      lay(c, c.wx - Math.cos(a) * d + (rand() - 0.5) * 0.1,
        c.wy - Math.sin(a) * d + (rand() - 0.5) * 0.1,
        k % 2 === 0 ? shade(c.st.mid, 18) : c.st.mid,
        { life: 9, size: 0.055 });
    }
    lay(c, c.wx, c.wy, '#63201a', { life: 9, size: 0.05 });
    lay(c, c.wx + 0.12, c.wy + 0.08, '#421410', { life: 9, size: 0.04 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const a = entryAngle(c, 0xb0a1);
    if (t < 0.1) return;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The lane's shadow: a low dark streak back along the flight.
    ctx.save();
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = shade(st.deep, -10);
    ctx.beginPath();
    ctx.ellipse(px - Math.cos(a) * sc * 0.7, py - Math.sin(a) * sc * 0.7 * squash,
      sc * 0.75, sc * 0.1 * squash, Math.atan2(Math.sin(a) * squash, Math.cos(a)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const a = entryAngle(c, 0xb0a1);
    const hy = py - sc * 0.55;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // The arrival streak: heavy, one blink.
    if (t < 0.08) {
      const k = 1 - t / 0.08;
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.075);
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(a) * sc * 2.4, hy - Math.sin(a) * sc * 1.2);
      ctx.lineTo(px, hy);
      ctx.stroke();
    }
    // THE BLAZE: a pale notch wedge hacked out of the air — the
    // hunter's mark — its cut faces bright, its shadow face dark,
    // beading red at the lower corner as the bleed sets in.
    const born = Math.min(1, Math.max(0, (t - 0.05) / 0.08));
    if (born > 0) {
      const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
      const W = sc * 0.3 * born;
      const H = sc * 0.4 * born;
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.moveTo(px - W * 0.2, hy - H * 0.5);
      ctx.lineTo(px + W * 0.85, hy - H * 0.1);
      ctx.lineTo(px - W * 0.2, hy + H * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade(st.mid, 20);
      ctx.beginPath();
      ctx.moveTo(px - W * 0.3, hy - H * 0.5);
      ctx.lineTo(px + W * 0.7, hy - H * 0.12);
      ctx.lineTo(px - W * 0.3, hy + H * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.mid, 4);
      ctx.beginPath();
      ctx.moveTo(px - W * 0.3, hy + H * 0.12);
      ctx.lineTo(px + W * 0.7, hy - H * 0.12);
      ctx.lineTo(px - W * 0.3, hy + H * 0.5);
      ctx.closePath();
      ctx.fill();
      // The red bead at the blaze's low corner.
      const weep = Math.min(1, Math.max(0, (t - 0.3) / 0.3));
      if (weep > 0) {
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = '#b8362a';
        ctx.beginPath();
        ctx.ellipse(px - W * 0.28, hy + H * 0.5 + sc * 0.02, sc * 0.03 * weep + 1, sc * 0.04 * weep + 1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (t < 0.14) c.glow(c.wx, c.wy, 0.8, 0.45 * (1 - t / 0.14));
    ctx.restore();
  },
};

/**
 * WINGBEAT — "the flushed covey."
 * Each arrow flushes what was hiding there: two wing-glyph birds
 * burst UP off the wound — simple two-arc silhouettes banking away
 * skyward on their own headings — while down-feathers sift after
 * them. Pale grey-blue down lies where they flushed for seven
 * seconds. Three arrows: three coveys.
 */
const wingbeat: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x3b1);
    // Down-feathers: pale barbs sifting with wobble, lying after.
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx, c.wy, 1, ['#cfe0ec', '#a8c4d8'], {
        speed: 0.3, life: 7, size: 0.055, gravity: 0,
        dir: rand() * Math.PI * 2, spread: 0.8, shape: 'shard', spin: 2.5,
        z: 0.5 + rand() * 0.3, vz: 0.4, zg: 1.1, land: 'settle',
        layer: 'world', wobble: 0.9, fade: '#8aa4b8', fadeAt: 0.5,
      });
    }
    lay(c, c.wx, c.wy, '#a8c4d8', { life: 7, size: 0.045 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t > 0.4) return;
    // The flush-point: one soft shadow blink where cover broke.
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - t / 0.4);
    ctx.fillStyle = shade(st.deep, -10);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.3, sc * 0.2 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x3b2);
    ctx.save();
    ctx.lineCap = 'round';
    // THE COVEY: two birds burst up and bank away — each a two-arc
    // wing glyph whose beat cycles fast, climbing a seeded heading.
    for (let k = 0; k < 2; k++) {
      const heading = rand() * Math.PI - Math.PI; // upward half
      const speed = 1.6 + rand() * 0.8;
      const u = Math.min(1, t / 0.85);
      const bx = px + Math.cos(heading) * sc * speed * u;
      const by = py - sc * 0.5 - sc * (1.3 + k * 0.4) * u + Math.sin(heading) * sc * 0.3 * u;
      const al = (1 - u * 0.8) * 0.95;
      if (al <= 0) continue;
      const beat = Math.sin(c.now / 55 + k * 2.4);
      const span = sc * (0.16 - u * 0.05);
      ctx.globalAlpha = al;
      ctx.strokeStyle = k === 0 ? st.mid : shade(st.mid, -14);
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      // Two arcs hinged at the body point, dihedral on the beat.
      ctx.beginPath();
      ctx.moveTo(bx - span, by - beat * span * 0.55);
      ctx.quadraticCurveTo(bx - span * 0.3, by + beat * span * 0.2, bx, by);
      ctx.quadraticCurveTo(bx + span * 0.3, by + beat * span * 0.2, bx + span, by - beat * span * 0.55);
      ctx.stroke();
    }
    // The flush burst: one pale clap at the wound, first frames.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.45, sc * 0.2, sc * 0.075, 4, 0.5, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.6, 0.35 * k);
    }
    ctx.restore();
  },
};

/**
 * VERDANT_BURST — "the jaw of spring."
 * The seed blooms TEETH, literally: a ring of curved green tusks
 * erupts around the blast rim — each a tapering spike with a paler
 * inner face — snaps INWARD like a calyx closing, holds its grip
 * one beat, and retracts into the soil. Punch-hole pits and sap
 * stains keep the jaw's ring on the ground for nine seconds.
 */
const verdant_burst: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const rand = srand(c.seed ^ 0x4eb1);
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    // Soil clods + sap drops off the erupting teeth.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        1, [shade(c.st.deep, 8), c.st.deep], {
          speed: 0.8, life: 7, size: 0.06, gravity: 0, dir: a, spread: 0.4,
          shape: 'shard', spin: 6, z: 0.1, vz: 1.6 + rand(), zg: 8,
          land: 'bounce', bounce: 0.35, layer: 'world',
          fade: shade(c.st.deep, -12), fadeAt: 0.3,
        });
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.68, c.wy + Math.sin(a) * c.radius * 0.68,
        1, ['#a0c050', '#7a9a3c'], {
          speed: 0.2, life: 1, size: 0.045, gravity: 0, shape: 'drop',
          z: 0.5, vz: 0.4, zg: 5, land: 'splat', layer: 'world', fade3: '#4a5c22',
        });
    }
    // The jaw's ring: punch-hole pits + sap stains, kept 9 s.
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + (c.seed % 5) * 0.25;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7,
        shade(c.st.deep, -16), { life: 9, size: 0.06 });
      if (k % 2 === 0) {
        lay(c, c.wx + Math.cos(a) * c.radius * 0.56, c.wy + Math.sin(a) * c.radius * 0.56,
          '#a0c050', { life: 8, size: 0.045, flicker: 0.25 });
      }
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    ctx.save();
    // The churned ring: dark turned earth where the teeth broke sod.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(4.5, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.7, rPx * 0.7 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.64, rPx * 0.64 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x4eb2);
    ctx.save();
    ctx.lineCap = 'round';
    // THE TEETH: eight curved tusks around the rim — erupt 0→0.15,
    // snap inward 0.15→0.32, hold clenched, retract 0.68→0.9.
    const erupt = Math.min(1, t / 0.15);
    const snap = Math.min(1, Math.max(0, (t - 0.15) / 0.17));
    const retract = Math.min(1, Math.max(0, (t - 0.68) / 0.22));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.25;
      const bx = px + Math.cos(a) * rPx * 0.7;
      const by = py + Math.sin(a) * rPx * 0.7 * squash;
      const H = sc * (0.5 + rand() * 0.16) * erupt * (1 - retract);
      if (H < 2) continue;
      // The tusk curves toward the center as the jaw snaps.
      const lean = snap * 0.55;
      const tipX = bx + (px - bx) * 0.2 * lean * 2;
      const tipY = by - H + (py - by) * 0.06 * lean;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = shade(st.mid, -16);
      ctx.lineWidth = Math.max(3.4, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + (tipX - bx) * 0.3, by - H * 0.6, tipX, tipY);
      ctx.stroke();
      ctx.globalAlpha = 0.97;
      ctx.strokeStyle = shade(st.mid, 10);
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(bx + sc * 0.02, by - sc * 0.02);
      ctx.quadraticCurveTo(bx + (tipX - bx) * 0.3, by - H * 0.62, tipX, tipY + sc * 0.02);
      ctx.stroke();
      // The point: pale, sharp, briefly bright at the snap.
      ctx.globalAlpha = 0.95 + (snap > 0.9 && t < 0.4 ? 0.05 : 0);
      ctx.fillStyle = snap > 0.9 && t < 0.4 ? st.core : shade(st.mid, 24);
      const g = Math.max(2, sc * 0.045);
      ctx.fillRect(tipX - g / 2, tipY - g / 2, g, g);
    }
    // The bite click: the jaw meets — one green star at center.
    if (snap >= 1 && t < 0.44) {
      const k = 1 - (t - 0.32) / 0.12;
      ctx.globalAlpha = 0.9 * Math.max(0, k);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.2, sc * 0.26, sc * 0.1, 6, c.now / 400, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, c.radius * 0.8, 0.5 * Math.max(0, k));
    }
    ctx.restore();
  },
};

/**
 * WINDSONG — "the parted curtain."
 * The note passes THROUGH: at the wound the air parts like a sheer
 * curtain — two tall translucent panels swing open away from the
 * lane, hinged at their outer edges, hold while the note's thin
 * path-line hangs between them, and swing shut. Three pale grains
 * lie in a line afterward: the echo, fading in the grass.
 */
const windsong: AbilitySig = {
  spawn(c) {
    const a = entryAngle(c, 0x3d51);
    // The echo line: three pale grains along the through-path.
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx + Math.cos(a) * (0.3 + k * 0.35), c.wy + Math.sin(a) * (0.3 + k * 0.35),
        k === 0 ? '#e8f2f8' : c.st.mid, { life: 7, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const a = entryAngle(c, 0x3d51);
    if (t > 0.6) return;
    // The panels' moving shade: two soft wedges swinging on the turf.
    const open = Math.sin(Math.min(1, t / 0.6) * Math.PI);
    ctx.save();
    ctx.globalAlpha = 0.35 * open;
    ctx.fillStyle = shade(st.deep, -8);
    for (const s of [-1, 1]) {
      const pa = a + (Math.PI / 2) * s;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(pa - 0.3 * s) * sc * 0.8, py + Math.sin(pa - 0.3 * s) * sc * 0.8 * squash);
      ctx.lineTo(px + Math.cos(pa + 0.2 * s) * sc * 0.9, py + Math.sin(pa + 0.2 * s) * sc * 0.9 * squash);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const a = entryAngle(c, 0x3d51);
    const hy = py - sc * 0.6;
    const ca = Math.cos(a);
    const sn = Math.sin(a);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE CURTAIN: two sheer panels hinged OUTSIDE the lane, both
    // swinging open (0→0.3), holding (0.3→0.55), shutting (0.55→0.85).
    const phase = t < 0.3 ? t / 0.3 : t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.3);
    for (const s of [-1, 1]) {
      const hingeX = px + -sn * s * sc * 0.5;
      const hingeY = hy + ca * s * sc * 0.3;
      const swing = phase * 0.9;
      // The panel: a tall quad leaning away from the lane, sheer.
      const topH = sc * 0.85;
      const leanX = -sn * s * swing * sc * 0.34;
      ctx.globalAlpha = 0.35 + 0.2 * phase;
      ctx.fillStyle = shade(st.mid, 14);
      ctx.beginPath();
      ctx.moveTo(hingeX, hingeY);
      ctx.lineTo(hingeX + leanX, hingeY - topH);
      ctx.lineTo(hingeX + leanX + -sn * s * sc * 0.3, hingeY - topH + ca * s * sc * 0.1);
      ctx.lineTo(hingeX + -sn * s * sc * 0.3, hingeY + ca * s * sc * 0.1);
      ctx.closePath();
      ctx.fill();
      // The panel's lit hem.
      ctx.globalAlpha = 0.9 * (0.4 + 0.6 * phase);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(hingeX, hingeY);
      ctx.lineTo(hingeX + leanX, hingeY - topH);
      ctx.stroke();
    }
    // THE NOTE'S PATH: a thin bright line hanging in the gap while
    // the curtain stands open.
    if (phase > 0.2) {
      ctx.globalAlpha = 0.95 * phase;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.4, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(px - ca * sc * 0.9, hy - sn * sc * 0.45);
      ctx.lineTo(px + ca * sc * 0.9, hy + sn * sc * 0.45);
      ctx.stroke();
      // The note itself: one bead sliding through, once.
      if (t < 0.5) {
        const u = t / 0.5;
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = st.core;
        const g = Math.max(2.5, sc * 0.06);
        ctx.fillRect(px + ca * sc * (u * 1.8 - 0.9) - g / 2, hy + sn * sc * (u * 0.9 - 0.45) - g / 2, g, g);
      }
    }
    if (t < 0.1) c.glow(c.wx, c.wy, 0.7, 0.35 * (1 - t / 0.1));
    ctx.restore();
  },
};

/**
 * THORN_FAN — "the hedge laid."
 * Five shafts, five spans of instant hedgerow: each impact grows a
 * low briar tangle ACROSS its landing — two crossing wavy strokes
 * and three barbs, knee height, perpendicular to the flight — that
 * weathers green → brown and sinks. Dark barb grains keep each
 * span's line for eight seconds: a broken hedge, laid in a volley.
 */
const thorn_fan: AbilitySig = {
  spawn(c) {
    const a = entryAngle(c, 0x7f01);
    const rand = srand(c.seed ^ 0x7f02);
    // Barb grains along the span's cross-line.
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * 0.22 + (rand() - 0.5) * 0.06;
      lay(c, c.wx + nx * off, c.wy + ny * off,
        k === 1 ? '#3a4626' : shade(c.st.deep, -12),
        { life: 8.5, size: 0.05 });
    }
    // One red pricking drop.
    c.particles.burst(c.wx, c.wy, 1, ['#b8362a'], {
      speed: 0.15, life: 0.9, size: 0.045, gravity: 0, shape: 'drop',
      z: 0.3, vz: -0.1, zg: 4.5, land: 'splat', layer: 'world', fade3: '#421410',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const a = entryAngle(c, 0x7f01);
    if (t < 0.08) return;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The span's root shadow: a short dark cross-band.
    const nx = -Math.sin(a);
    const ny = Math.cos(a) * squash;
    ctx.save();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(2.6, sc * 0.065);
    ctx.beginPath();
    ctx.moveTo(px - nx * sc * 0.45, py - ny * sc * 0.45);
    ctx.lineTo(px + nx * sc * 0.45, py + ny * sc * 0.45);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const a = entryAngle(c, 0x7f01);
    const rand = srand(c.seed ^ 0x7f03);
    const nx = -Math.sin(a);
    const ny = Math.cos(a) * squash;
    ctx.save();
    ctx.lineCap = 'round';
    // THE SPAN: two wavy strokes crossing along the perpendicular,
    // growing 0→0.2, weathering green → brown at 0.5, sinking 0.75+.
    const grow = Math.min(1, t / 0.2);
    const sink = Math.min(1, Math.max(0, (t - 0.75) / 0.25));
    const dried = t > 0.5;
    const W = sc * 0.5 * grow;
    const H = sc * 0.28 * grow * (1 - sink);
    for (let s = 0; s < 2; s++) {
      ctx.globalAlpha = 0.95 * (1 - sink * 0.6);
      ctx.strokeStyle = dried ? (s === 0 ? '#6a5638' : '#4a3c28') : (s === 0 ? st.mid : shade(st.mid, -16));
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(px - nx * W, py - ny * W - (s === 0 ? 0 : H * 0.3));
      ctx.quadraticCurveTo(px + (s === 0 ? sc * 0.06 : -sc * 0.06), py - H,
        px + nx * W, py + ny * W - (s === 0 ? H * 0.3 : 0));
      ctx.stroke();
    }
    // Three barbs off the tangle's crown.
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * W * 0.5;
      const ba = -Math.PI / 2 + (rand() - 0.5) * 0.8;
      ctx.globalAlpha = 0.95 * (1 - sink * 0.7);
      ctx.strokeStyle = dried ? '#4a3c28' : shade(st.mid, -18);
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.moveTo(px + nx * off, py + ny * off - H * 0.8);
      ctx.lineTo(px + nx * off + Math.cos(ba) * sc * 0.12, py + ny * off - H * 0.8 + Math.sin(ba) * sc * 0.12);
      ctx.stroke();
    }
    // The landing prick: brief.
    if (t < 0.08) {
      const k = 1 - t / 0.08;
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.2, sc * 0.16, sc * 0.06, 4, a, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * HOWLING_LOOSE — "the pack's eyes."
 * Each arrow opens a pair of cold points in the dark it brought
 * with it: two ice-white glints side by side inside a brief patch
 * of winter dusk, a frost breath curling beneath them — watching,
 * then not there. Paired white grains keep the eyeshine on the
 * ground, flickering, for seven seconds.
 */
const howling_loose: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x401f);
    frost.deployments.fog!(asMatter(c), c.wx, c.wy, { scale: 0.5 });
    // The eyeshine pair, kept on the turf.
    const a = rand() * Math.PI * 2;
    lay(c, c.wx + Math.cos(a) * 0.07, c.wy + Math.sin(a) * 0.07,
      '#ffffff', { life: 7, size: 0.045, flicker: 0.4 });
    lay(c, c.wx - Math.cos(a) * 0.07, c.wy - Math.sin(a) * 0.07,
      '#ffffff', { life: 7, size: 0.045, flicker: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.5 ? 1 : (1 - t) / 0.5;
    // The dusk patch's floor: a soft cold shadow.
    ctx.save();
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = shade(st.deep, -12);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.42, sc * 0.28 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const hy = py - sc * 0.55;
    ctx.save();
    // THE DUSK: a soft-edged dark patch blooms at the wound (a
    // stacked pair of dark ellipses, hard-edged but layered), holds
    // while the eyes shine, and thins away.
    const bloom = Math.min(1, t / 0.12);
    const gone = Math.max(0, (t - 0.6) / 0.4);
    const al = bloom * (1 - gone);
    if (al > 0) {
      ctx.globalAlpha = 0.55 * al;
      ctx.fillStyle = shade(st.deep, -22);
      ctx.beginPath();
      ctx.ellipse(px, hy, sc * 0.4, sc * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35 * al;
      ctx.beginPath();
      ctx.ellipse(px, hy, sc * 0.55, sc * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE EYES: two hard white points, blinking once mid-watch.
      const blink = t > 0.34 && t < 0.4 ? 0 : 1;
      if (blink) {
        ctx.globalAlpha = 0.97 * al;
        ctx.fillStyle = '#ffffff';
        const g = Math.max(2.5, sc * 0.055);
        ctx.fillRect(px - sc * 0.11 - g / 2, hy - g / 2, g, g);
        ctx.fillRect(px + sc * 0.11 - g / 2, hy - g / 2, g, g);
        ctx.globalAlpha = 0.6 * al;
        ctx.fillStyle = st.mid;
        ctx.fillRect(px - sc * 0.11 - g, hy - g, g * 2, g * 2);
        ctx.fillRect(px + sc * 0.11 - g, hy - g, g * 2, g * 2);
      }
      // The breath: one slow frost curl under the gaze.
      const wob = Math.sin(c.now / 240) * sc * 0.05;
      ctx.globalAlpha = 0.6 * al;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.moveTo(px - sc * 0.12, hy + sc * 0.18);
      ctx.quadraticCurveTo(px + wob, hy + sc * 0.3, px + sc * 0.14, hy + sc * 0.22 + wob * 0.5);
      ctx.stroke();
    }
    ctx.restore();
    if (t < 0.15) c.glow(c.wx, c.wy, 0.6, 0.3 * (1 - t / 0.15));
  },
};

/**
 * HOARFROST — "the shut trap."
 * Winter grips from the OUTSIDE in: white needle-crystals grow
 * horizontally inward from the rim — long hoar spokes lengthening
 * across the ground — and where they meet mid-circle they LOCK
 * with a click-flash: the circle barred shut, seen from above.
 * Then the bars sublime to mist. White spoke-lines keep the cage's
 * memory on the turf, twinkling, for eight seconds.
 */
const hoarfrost: AbilitySig = {
  spawn(c) {
    frost.deployments.bloom!(asMatter(c), c.wx, c.wy, {
      radius: c.radius * 0.7, dur: 0.8, scale: 0.9,
    });
    // The spokes' memory: white grains along four radii.
    const rand = srand(c.seed ^ 0x40a1);
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2 + (c.seed % 7) * 0.2;
      for (let k = 0; k < 3; k++) {
        const rr = c.radius * (0.35 + k * 0.25);
        lay(c, c.wx + Math.cos(a) * rr + (rand() - 0.5) * 0.08,
          c.wy + Math.sin(a) * rr + (rand() - 0.5) * 0.08,
          k === 0 ? '#ffffff' : c.st.mid,
          { life: 8, size: 0.045, flicker: 0.3 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x40a2);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE SPOKES: eight needle-crystals grow INWARD from the rim
    // (0→0.4) — each a white core over a pale bed, with tiny side
    // barbs — meeting at the lock ring mid-circle.
    const grow = Math.min(1, t / 0.4);
    const sublime = Math.max(0, (t - 0.72) / 0.28);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (c.seed % 7) * 0.2;
      const r1 = rPx * 0.95;
      const r0 = rPx * (0.95 - 0.62 * grow);
      const p1 = { x: px + Math.cos(a) * r1, y: py + Math.sin(a) * r1 * squash };
      const p0 = { x: px + Math.cos(a) * r0, y: py + Math.sin(a) * r0 * squash };
      ctx.globalAlpha = 0.6 * fade * (1 - sublime);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.075);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p0.x, p0.y);
      ctx.stroke();
      ctx.globalAlpha = 0.95 * fade * (1 - sublime);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p0.x, p0.y);
      ctx.stroke();
      // Side barbs off the growing needle, seeded.
      const bf = 0.3 + rand() * 0.4;
      if (bf < grow) {
        const bx = px + Math.cos(a) * (r1 - (r1 - rPx * 0.33) * bf);
        const by = py + Math.sin(a) * (r1 - (r1 - rPx * 0.33) * bf) * squash;
        ctx.globalAlpha = 0.85 * fade * (1 - sublime);
        ctx.lineWidth = Math.max(1.2, sc * 0.026);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + 2.3) * sc * 0.1, by + Math.sin(a + 2.3) * sc * 0.1 * squash);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a - 2.3) * sc * 0.1, by + Math.sin(a - 2.3) * sc * 0.1 * squash);
        ctx.stroke();
      }
    }
    // THE LOCK: the meeting ring — flashes the instant the spokes
    // arrive, then holds as a barred inner circle.
    if (grow >= 1) {
      const lockAge = t - 0.4;
      const flash = Math.max(0, 1 - lockAge / 0.1);
      const rr = rPx * 0.33;
      ctx.globalAlpha = (0.7 + 0.3 * flash) * fade * (1 - sublime);
      ctx.strokeStyle = flash > 0 ? '#ffffff' : st.core;
      ctx.lineWidth = Math.max(2, sc * (0.05 + flash * 0.03));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (flash > 0) c.glow(c.wx, c.wy, c.radius * 0.6, 0.5 * flash);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The sublimation: bars leave as rising mist wisps, gated.
    if (t > 0.7 && Math.random() < c.frameDt * 12) {
      const a = Math.random() * Math.PI * 2;
      const rr = 0.3 + Math.random() * 0.6;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * rr, c.wy + Math.sin(a) * c.radius * rr,
        1, ['#ffffff', st.mid], {
          speed: 0.1, life: 0.8, size: 0.05, gravity: 0, shape: 'mote',
          z: 0.05, vz: 0.5, zg: 0, land: 'none', layer: 'world', shadow: 0, wobble: 0.4,
        });
    }
    void ctx; void sc; void px; void py;
  },
};

/**
 * GHOST_SHAFT — "the remembered flight."
 * The arrow declines to exist until it arrives — then the whole
 * flight is remembered at once, backward: a chain of faint shaft
 * after-images materializes down the lane behind the wound, each
 * dimmer with distance, all drifting slightly upward as they
 * dissolve. The wound takes a violet pinhole flash. A ghost leaves
 * almost nothing: one faint grain, alone, where it finally chose
 * to be real.
 */
const ghost_shaft: AbilitySig = {
  spawn(c) {
    // A ghost's entire estate: one faint grain.
    lay(c, c.wx, c.wy, '#a8a4c0', { life: 8, size: 0.05, flicker: 0.3 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The pinhole's floor light: a dim violet disc, briefly.
    if (t > 0.3) return;
    ctx.save();
    ctx.globalAlpha = 0.4 * (1 - t / 0.3);
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.26, sc * 0.18 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const a = entryAngle(c, 0x6057);
    const hy = py - sc * 0.55;
    const ca = Math.cos(a);
    const sn = Math.sin(a) * 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE MEMORY: five after-images down the lane BEHIND the wound,
    // materializing nearest-first (the memory runs backward), each
    // a simple shaft-line ghost that lifts and dissolves.
    for (let k = 0; k < 5; k++) {
      const born = 0.06 + k * 0.09;
      const u = Math.min(1, Math.max(0, (t - born) / 0.4));
      if (u <= 0) continue;
      const d = sc * (0.5 + k * 0.55);
      const liftY = -u * sc * 0.22;
      const al = (1 - k * 0.16) * Math.sin(Math.min(1, u) * Math.PI) * 0.85;
      if (al <= 0) continue;
      const gx = px - ca * d;
      const gy = hy - sn * d + liftY;
      ctx.globalAlpha = al * 0.55;
      ctx.strokeStyle = shade(st.deep, -6);
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      ctx.beginPath();
      ctx.moveTo(gx - ca * sc * 0.3, gy - sn * sc * 0.3);
      ctx.lineTo(gx + ca * sc * 0.3, gy + sn * sc * 0.3);
      ctx.stroke();
      ctx.globalAlpha = al;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(gx - ca * sc * 0.3, gy - sn * sc * 0.3);
      ctx.lineTo(gx + ca * sc * 0.3, gy + sn * sc * 0.3);
      ctx.stroke();
    }
    // THE PINHOLE: the one moment of existence — a tiny violet-white
    // point that flares hard and is done.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#ffffff';
      const g = Math.max(2.5, sc * 0.06) * (0.6 + k * 0.6);
      ctx.fillRect(px - g / 2, hy - g / 2, g, g);
      ctx.globalAlpha = 0.8 * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.4, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(px, hy, sc * 0.16 * (1 + (1 - k)), sc * 0.16 * (1 + (1 - k)), 0, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, 0.7, 0.45 * k);
    }
    ctx.restore();
  },
};

/**
 * CINDER_RAIN — "the burning snow."
 * It keeps coming, softly: ember-flakes descend over the field for
 * as long as it holds — slow, wobbling, landing in a DRIFT that
 * accumulates grain by grain and then cools through white, orange,
 * soot. The painted field is quiet: a warm haze rim and the falling
 * flakes' shadows. The drift IS the statement, and it outlives
 * everything by ten seconds.
 */
const cinder_rain: AbilitySig = {
  spawn(c) {
    fire.deployments.rain!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.9, dur: 1.2, scale: 0.7 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // The haze rim: a warm double edge marking the fall zone.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(3.6, sc * 0.095);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * fade * (0.7 + 0.3 * Math.sin(c.now / 300));
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.9, rPx * 0.9 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // THE DRIFT ACCUMULATES: one laid ember per gated beat, random
    // point in the field, cooling white → orange → soot as it lies.
    if (t < 0.9 && Math.random() < c.frameDt * 5) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.85;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr, '#fff1d8', {
        life: 9, size: 0.055, flicker: 0.35,
        fade: '#f0a45a', fadeAt: 0.18, fade2: '#4a3226', fade2At: 0.6,
      });
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ (0xc1 + Math.floor(c.age / 800)));
    ctx.save();
    // THE FALLING FLAKES: six painted embers per beat-window drift
    // down with a sway — each with its ground-shadow point so the
    // height reads — recycling on the 800ms beat clock.
    const beatT = (c.age % 800) / 800;
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.85;
      const stagger = rand();
      const u = (beatT + stagger) % 1;
      const gx = px + Math.cos(a) * rr;
      const gy = py + Math.sin(a) * rr * squash;
      const h = sc * 1.3 * (1 - u);
      const sway = Math.sin(u * Math.PI * 3 + k) * sc * 0.08;
      // The flake: a warm tumbling square, cooling as it falls.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = u < 0.5 ? '#fff1d8' : u < 0.8 ? '#f0a45a' : '#c85a28';
      const g = Math.max(2.2, sc * 0.055);
      ctx.save();
      ctx.translate(gx + sway, gy - h);
      ctx.rotate(u * 5 + k);
      ctx.fillRect(-g / 2, -g / 2, g, g);
      ctx.restore();
      // Its shadow point waits below.
      ctx.globalAlpha = 0.25 * (1 - u * 0.5);
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.ellipse(gx + sway * 0.3, gy, g * 0.5, g * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    void st; void t;
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.22);
  },
};

/**
 * KINGS_ARROW — "the road cleared."
 * A royal progress in one shot: at the wound, two gold herald-lines
 * sweep OUTWARD from the lane like a crowd parting, and a narrow
 * gold carpet-band unrolls FORWARD through the wound and beyond —
 * the king's road continuing through everything — with a bright
 * orb-point riding it to the end. Gold flecks keep the road's band
 * on the grass for eight seconds. Not open to appeal.
 */
const kings_arrow: AbilitySig = {
  spawn(c) {
    const a = entryAngle(c, 0x4a01);
    // The road's record: gold flecks in a narrow lane band beyond
    // the wound.
    const rand = srand(c.seed ^ 0x4a02);
    for (let k = 0; k < 6; k++) {
      const d = 0.2 + k * 0.3;
      lay(c, c.wx + Math.cos(a) * d + (rand() - 0.5) * 0.08,
        c.wy + Math.sin(a) * d + (rand() - 0.5) * 0.08,
        k % 2 === 0 ? c.st.core : c.st.spark,
        { life: 8, size: 0.05, fade: shade(c.st.mid, -12), fadeAt: 0.45 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const a = entryAngle(c, 0x4a01);
    const ca = Math.cos(a);
    const sn = Math.sin(a) * squash;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE CARPET: a narrow gold band unrolls forward through the
    // wound (0→0.5), holds, and rolls up from the tail (0.7→1).
    const unroll = Math.min(1, t / 0.5);
    const rollup = Math.max(0, (t - 0.7) / 0.3);
    const from = -sc * 0.4 + rollup * sc * 2.2;
    const to = -sc * 0.4 + unroll * sc * 2.2;
    if (to > from) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(6, sc * 0.17);
      ctx.beginPath();
      ctx.moveTo(px + ca * from, py + sn * from);
      ctx.lineTo(px + ca * to, py + sn * to);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(4, sc * 0.11);
      ctx.beginPath();
      ctx.moveTo(px + ca * from, py + sn * from);
      ctx.lineTo(px + ca * to, py + sn * to);
      ctx.stroke();
      // The road's woven edge: two thin bright rails.
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      const nx = -Math.sin(a);
      const ny = Math.cos(a) * squash;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px + ca * from + nx * sc * 0.07 * s, py + sn * from + ny * sc * 0.07 * s);
        ctx.lineTo(px + ca * to + nx * sc * 0.07 * s, py + sn * to + ny * sc * 0.07 * s);
        ctx.stroke();
      }
      // The orb-point rides the road's live end.
      if (unroll < 1) {
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.ellipse(px + ca * to, py + sn * to, sc * 0.06, sc * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const a = entryAngle(c, 0x4a01);
    const hy = py - sc * 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE HERALDS: two gold lines sweep outward from the lane at
    // the wound — the crowd parting for the road — early and clean.
    if (t < 0.35) {
      const u = t / 0.35;
      for (const s of [-1, 1]) {
        const pa = a + (Math.PI / 2) * s;
        const reach = sc * (0.2 + u * 0.55);
        ctx.globalAlpha = 0.9 * (1 - u * 0.5);
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(2.2, sc * 0.055);
        ctx.beginPath();
        ctx.moveTo(px, hy);
        ctx.lineTo(px + Math.cos(pa) * reach, hy + Math.sin(pa) * reach * squash + sc * 0.1);
        ctx.stroke();
        ctx.globalAlpha = 0.95 * (1 - u * 0.4);
        ctx.fillStyle = st.core;
        const g = Math.max(2, sc * 0.045);
        ctx.fillRect(px + Math.cos(pa) * reach - g / 2, hy + Math.sin(pa) * reach * squash + sc * 0.1 - g / 2, g, g);
      }
    }
    // The command flash: gilded, once.
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, hy, sc * 0.28, sc * 0.1, 4, a, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.9, 0.55 * k);
    }
    ctx.restore();
  },
};

/**
 * STARFALL_ARROWS — "the chart of the night."
 * Seven points of light land as a CONSTELLATION being drawn: each
 * impact ignites a white-violet star and rules one chart-line
 * toward its seeded neighbor — the volley writes a figure across
 * the dark of the ground. Star grains flicker in place for nine
 * seconds after: the night, mapped where it fell.
 */
const starfall_arrows: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5fa2);
    // The chart's record: the star + two link-stub grains.
    lay(c, c.wx, c.wy, '#ffffff', { life: 9, size: 0.06, flicker: 0.4 });
    const linkA = rand() * Math.PI * 2;
    lay(c, c.wx + Math.cos(linkA) * 0.3, c.wy + Math.sin(linkA) * 0.3,
      '#8a90d8', { life: 8.5, size: 0.04 });
    lay(c, c.wx + Math.cos(linkA) * 0.58, c.wy + Math.sin(linkA) * 0.58,
      '#8a90d8', { life: 8.5, size: 0.04 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x5fa2);
    const linkA = rand() * Math.PI * 2;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE CHART-LINE: one thin ruled line draws from the star
    // toward its neighbor (0.15→0.5), then holds — astronomy on
    // the turf.
    const draw = Math.min(1, Math.max(0, (t - 0.15) / 0.35));
    if (draw > 0) {
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.4, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(linkA) * sc * 0.85 * draw, py + Math.sin(linkA) * sc * 0.85 * draw * squash);
      ctx.stroke();
    }
    // The star's seat: a four-point print, held bright.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    burstStarPath(ctx, px, py, sc * 0.16, sc * 0.05, 4, 0.2, squash);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The ignition: the star arrives as a falling point that snaps
    // bright at ground kiss — a vertical dotted drop trail above.
    if (t < 0.2) {
      const k = 1 - t / 0.2;
      ctx.save();
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = st.mid;
      for (let d = 0; d < 3; d++) {
        const g = Math.max(1.6, sc * 0.035);
        ctx.fillRect(px - g / 2, py - sc * (0.5 + d * 0.4) * (1 + k), g, g);
      }
      ctx.globalAlpha = 0.97 * k;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.15, sc * 0.22, sc * 0.08, 4, c.now / 400, 1);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx, c.wy, 0.7, 0.4 * k);
    }
    // A twinkle mote lifts off the seated star now and then.
    if (t > 0.3 && Math.random() < c.frameDt * 6) {
      c.particles.burst(c.wx, c.wy, 1, ['#ffffff', '#8a90d8'], {
        speed: 0.08, life: 0.7, size: 0.04, gravity: 0, shape: 'glint',
        z: 0.06, vz: 0.5, zg: 0, land: 'none', layer: 'world', shadow: 0,
      });
    }
  },
};

/**
 * SKYREND — "the hanging rail."
 * The railshot leaves its rail behind: a dead-straight incandescent
 * bar hangs along the corridor at chest height, held up by thin
 * drops of light every half tile — then it OVERLOADS: the middle
 * bows down, touches the ground, and a run of shocks discharges
 * along the line. A dotted scorch line the length of the corridor
 * stays, cooling white to soot, for eight seconds.
 */
const skyrend: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx2, c.wy2, { scale: 0.6 });
    // The dotted scorch: grains every ~0.6 tile down the corridor.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const len = Math.hypot(dx, dy) || 1;
    const n = Math.min(9, Math.max(4, Math.round(len / 0.6)));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      lay(c, c.wx + dx * f, c.wy + dy * f, '#fff9e0', {
        life: 8, size: 0.05,
        fade: '#e8e06a', fadeAt: 0.15, fade2: '#3a3630', fade2At: 0.5,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    // THE DISCHARGE RUN: after the rail bows down (t > 0.55), a
    // run of shock rings pops along the line in sequence.
    if (t < 0.55) return;
    const u = (t - 0.55) / 0.45;
    ctx.save();
    for (let k = 0; k < 4; k++) {
      const at = k / 4;
      const ring = Math.max(0, Math.min(1, (u - at) * 4));
      if (ring <= 0 || ring >= 1) continue;
      const x = px + (px2 - px) * at;
      const y = py + (py2 - py) * at;
      const rr = sc * 0.3 * ring;
      ctx.globalAlpha = (1 - ring) * 0.95;
      ctx.strokeStyle = k % 2 === 0 ? '#fff9e0' : st.spark;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const lift = sc * 0.55;
    ctx.save();
    ctx.lineCap = 'butt';
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    // THE RAIL: dead straight 0→0.4; bows downward 0.4→0.55 until
    // its middle touches ground; gone in the discharge after.
    if (t < 0.62) {
      const bow = Math.min(1, Math.max(0, (t - 0.4) / 0.15));
      const sagPx = bow * lift; // the middle reaches the ground
      const flicker = 0.8 + 0.2 * Math.sin(c.now / 50);
      // The suspension drops: thin light threads every half tile,
      // stretching as the rail sags.
      const n = Math.min(7, Math.max(3, Math.round(len / (sc * 0.55))));
      ctx.globalAlpha = 0.7 * flicker * (1 - bow * 0.4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.2, sc * 0.026);
      for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n;
        const sag = Math.sin(f * Math.PI) * sagPx;
        const x = px + dx * f;
        const y = py + dy * f;
        ctx.beginPath();
        ctx.moveTo(x, y - lift * 1.35);
        ctx.lineTo(x, y - lift + sag);
        ctx.stroke();
      }
      // The rail: a two-pass bar following the sag curve.
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass === 0 ? 0.55 : 0.97) * flicker;
        ctx.strokeStyle = pass === 0 ? st.mid : '#ffffff';
        ctx.lineWidth = Math.max(pass === 0 ? 4 : 2, sc * (pass === 0 ? 0.1 : 0.045));
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) {
          const f = k / 8;
          const sag = Math.sin(f * Math.PI) * sagPx;
          const x = px + dx * f;
          const y = py + dy * f - lift + sag;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // The touch: the instant the belly meets the ground.
      if (bow >= 1 && t < 0.6) {
        const k = 1 - (t - 0.55) / 0.05;
        const mx = px + dx * 0.5;
        const my = py + dy * 0.5;
        ctx.globalAlpha = 0.97 * Math.max(0, k);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        burstStarPath(ctx, mx, my, sc * 0.34, sc * 0.12, 4, 0.4, c.squash);
        ctx.fill();
        c.glow(c.wx + (c.wx2 - c.wx) * 0.5, c.wy + (c.wy2 - c.wy) * 0.5, 1.1, 0.7 * Math.max(0, k));
      }
    }
    // The loose flash at the bow end, first frames.
    if (t < 0.07) {
      const k = 1 - t / 0.07;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - lift, sc * 0.24, sc * 0.09, 4, 0.2, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- the registry

/** The archer secret-roster signatures, keyed by ability id. */
export const ARCHER_SIGS: Record<string, AbilitySig> = {
  broadhead,
  wingbeat,
  verdant_burst,
  windsong,
  thorn_fan,
  howling_loose,
  hoarfrost,
  ghost_shaft,
  cinder_rain,
  kings_arrow,
  starfall_arrows,
  skyrend,
};
