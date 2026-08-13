/**
 * THE SIGNATURE LAW — the ARCHMAGE wave, second half (THE ARMORY
 * REMEMBERS, wave 5b: the heavy staff arts).
 *
 * Ten late-game showpieces rebuilt ground-up to the three-strata
 * bar. Down here Arx stops asking the world and starts TELLING it —
 * and the telling now lands on all three layers: the painted
 * statement, the matter that flies or drains or rises off it, and
 * THE LASTING MARK: a threshold stain where a door of nothing
 * stood, a dry circle inside a rained-on ring, one splinter-shard
 * glinting at the end of an unsewn seam.
 *
 * Binding laws as ever: hard edges, save/restore hygiene, squash on
 * ground y-radii, srand determinism, frameDt-gated emission, ≤ ~60
 * path ops per hook per frame. No centerpiece repeats another's,
 * nor any of this file's former ones (the seething spatter, the
 * crusting-over, the closing floe-jaw, the standing noon, the lit
 * lettering, the tolling rib-lantern, the inhaling window, the
 * walking weather-wall, the drinking disc, the parted world — all
 * retired whole). Pulse arts ride bornAt beat parity; field arts
 * accumulate their mark beat by beat.
 *
 * ONE-VOICE stands: venom, fire, frost, radiance, storm, water, and
 * blood speak through the MATTER LIBRARY; bone, void, moon-tide,
 * and world-fabric stay each art's own.
 */

import { shade } from './rig.js';
import { boltPath, burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { venom, fire, frost, radiance, storm, blood, asMatter } from './matter/index.js';

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

// --------------------------------------------------------- venom_lash

/**
 * VENOM_LASH — "the two opinions."
 * Each serpent's spit lands and SPLITS: the glob breaks into two
 * runnels that crawl away in a widening V — wobbling lines with
 * bead heads, professional enough never to cross — then both go
 * still and soak in. The V stays as two flickering stain-lines
 * for eight seconds; two shots print two verdicts.
 */
const venom_lash: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x3e01);
    const a = rand() * Math.PI * 2;
    venom.deployments.spit!(asMatter(c), c.wx, c.wy, { dir: a, scale: 0.6 });
    // The V's record: two grain-lines diverging from the strike.
    for (const s of [-1, 1]) {
      const ra = a + s * 0.45;
      for (let k = 1; k <= 3; k++) {
        lay(c, c.wx + Math.cos(ra) * 0.22 * k, c.wy + Math.sin(ra) * 0.22 * k,
          k === 1 ? '#a0c050' : '#6a8a3c',
          { life: 8.5, size: 0.05, flicker: 0.25 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x3e01);
    const a = rand() * Math.PI * 2;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'round';
    // THE RUNNELS: two crawling venom lines diverge in a V — each
    // advancing with a wobble, head bead bright, body dimming as it
    // soaks. The still phase: both freeze at 0.7 and darken.
    const crawl = Math.min(1, t / 0.6);
    for (const s of [-1, 1]) {
      const ra = a + s * 0.45;
      const L = sc * 0.72 * crawl;
      const wob = Math.sin(c.now / 130 + s * 2) * sc * 0.05 * (t < 0.7 ? 1 : 0);
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = t < 0.7 ? '#7a9a3c' : '#5c7230';
      ctx.lineWidth = Math.max(2.6, sc * 0.065);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(
        px + Math.cos(ra) * L * 0.5 + -Math.sin(ra) * wob,
        py + Math.sin(ra) * L * 0.5 * squash + Math.cos(ra) * wob,
        px + Math.cos(ra) * L, py + Math.sin(ra) * L * squash);
      ctx.stroke();
      // The head bead: bright while crawling, gone once still.
      if (crawl < 1 && t < 0.7) {
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = '#cfe86a';
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(ra) * L, py + Math.sin(ra) * L * squash,
          sc * 0.05, sc * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The strike blot at the split point.
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = '#6a8a3c';
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.12, sc * 0.09 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x3e01);
    const a = rand() * Math.PI * 2;
    // The spit's arrival: a green glob streak + one split flash.
    if (t < 0.12) {
      const k = 1 - t / 0.12;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.95 * k;
      ctx.strokeStyle = '#a0c050';
      ctx.lineWidth = Math.max(3, sc * 0.075);
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(a) * sc * 1.6, py - sc * 0.5 - Math.sin(a) * sc * 0.7);
      ctx.lineTo(px, py - sc * 0.1);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * k;
      ctx.fillStyle = '#cfe86a';
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.08, sc * 0.18, sc * 0.07, 5, a, c.squash);
      ctx.fill();
      ctx.restore();
      c.glow(c.wx, c.wy, 0.6, 0.3 * k);
    }
    void st;
  },
};

// ---------------------------------------------------------- magma_orb

/**
 * MAGMA_ORB — "the rolling footprints."
 * It does not stop for anyone — so the wound shows it mid-transit:
 * the globe passes through, its dark crust patch visibly rotating
 * over the glow, and behind it a line of burning footprint-pools
 * marks where it rolled. The pools stay as two ember discs cooling
 * white → orange → soot for nine seconds.
 */
const magma_orb: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x309b);
    const a = rand() * Math.PI * 2;
    fire.deployments.gobbets!(asMatter(c), c.wx, c.wy, { scale: 0.5 });
    // THE FOOTPRINTS: two melt-pool discs behind the wound, each a
    // small ring of ember grains.
    for (let p = 0; p < 2; p++) {
      const d = 0.45 + p * 0.55;
      const cxp = c.wx - Math.cos(a) * d;
      const cyp = c.wy - Math.sin(a) * d;
      for (let k = 0; k < 4; k++) {
        const ra = (k / 4) * Math.PI * 2;
        lay(c, cxp + Math.cos(ra) * 0.12, cyp + Math.sin(ra) * 0.12, '#fff1d8', {
          life: 9, size: 0.05, flicker: 0.3,
          fade: '#f0a45a', fadeAt: 0.2, fade2: '#4a3226', fade2At: 0.6,
        });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x309b);
    const a = rand() * Math.PI * 2;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const heat = t < 0.3 ? '#fff1d8' : t < 0.55 ? '#ffb36a' : '#c85a28';
    ctx.save();
    // The footprint pools: two glowing discs with dark rims, laid
    // back along the roll line, cooling in hard steps.
    for (let p = 0; p < 2; p++) {
      const d = sc * (0.45 + p * 0.55);
      const cxp = px - Math.cos(a) * d;
      const cyp = py - Math.sin(a) * d * squash;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = shade(st.deep, -18);
      ctx.beginPath();
      ctx.ellipse(cxp, cyp, sc * 0.17, sc * 0.13 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = heat;
      ctx.beginPath();
      ctx.ellipse(cxp, cyp, sc * 0.11, sc * 0.08 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x309b);
    const a = rand() * Math.PI * 2;
    ctx.save();
    // THE GLOBE, mid-transit: enters one side of the wound and
    // leaves the other (0→0.4), crust patch rotating over the glow.
    if (t < 0.4) {
      const u = t / 0.4;
      const d = sc * (u * 1.6 - 0.8);
      const bx = px + Math.cos(a) * d;
      const by = py - sc * 0.42 + Math.sin(a) * d * 0.5;
      const R = sc * 0.2;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#ffb36a';
      ctx.beginPath();
      ctx.ellipse(bx, by, R, R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff1d8';
      ctx.beginPath();
      ctx.ellipse(bx - R * 0.25, by - R * 0.25, R * 0.4, R * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // The crust: a dark patch rotating across the face.
      const rot = a + u * 5;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.ellipse(bx + Math.cos(rot) * R * 0.45, by + Math.sin(rot) * R * 0.45,
        R * 0.42, R * 0.28, rot, 0, Math.PI * 2);
      ctx.fill();
      // Drips shed behind the roll.
      if (Math.random() < c.frameDt * 12) {
        c.particles.burst(c.wx + Math.cos(a) * (u * 1.6 - 0.8), c.wy + Math.sin(a) * (u * 1.6 - 0.8) * 0.5,
          1, ['#ffb36a', '#e85a2c'], {
            speed: 0.15, life: 0.8, size: 0.05, gravity: 0, shape: 'drop',
            z: 0.4, vz: -0.2, zg: 5, land: 'splat', layer: 'world',
            fade: '#c85a28', fadeAt: 0.4, fade3: '#4a3226',
          });
      }
      c.glow(c.wx + Math.cos(a) * (u * 1.6 - 0.8), c.wy + Math.sin(a) * (u * 1.6 - 0.8) * 0.5, 0.8, 0.45);
    }
    ctx.restore();
    void st;
  },
};

// -------------------------------------------------------- shatterfrost

/**
 * SHATTERFROST — "the millstones."
 * The glacier grinds: two half-disc ice slabs cover the circle —
 * north stone and south stone — turning against each other in hard
 * stutters, their meeting seam spitting chips at every step; then
 * both slabs craze and vanish. The seam stays as a line of white
 * grains straight across the circle for eight seconds.
 */
const shatterfrost: AbilitySig = {
  spawn(c) {
    frost.deployments.shatter!(asMatter(c), c.wx, c.wy, { scale: 0.8 });
    // The seam's record: white grains straight across.
    const seamA = (c.seed % 7) * 0.4;
    for (let k = -3; k <= 3; k++) {
      lay(c, c.wx + Math.cos(seamA) * 0.3 * k, c.wy + Math.sin(seamA) * 0.3 * k,
        k % 2 === 0 ? '#ffffff' : c.st.mid,
        { life: 8, size: 0.05, flicker: 0.3 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const seamA = (c.seed % 7) * 0.4;
    // The stutter clock: four hard steps across the grind.
    const step = Math.min(3, Math.floor(t * 6));
    const stepT = Math.min(1, (t * 6 - step) * 3); // fast settle
    const craze = Math.max(0, (t - 0.72) / 0.28);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE MILLSTONES: two half-discs, each a filled pale slab with
    // a darker rim band, rotated opposite ways by the stutter.
    for (const s of [-1, 1]) {
      const rot = seamA + s * (step + stepT) * 0.07;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, squash);
      ctx.rotate(rot);
      ctx.globalAlpha = (0.55 - craze * 0.3) * fade;
      ctx.fillStyle = s === -1 ? shade(st.mid, 18) : shade(st.mid, 8);
      ctx.beginPath();
      ctx.arc(0, 0, rPx * 0.88, s === -1 ? Math.PI : 0, s === -1 ? Math.PI * 2 : Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = (0.8 - craze * 0.4) * fade;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(2.4, sc * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, rPx * 0.86, s === -1 ? Math.PI + 0.1 : 0.1, s === -1 ? Math.PI * 2 - 0.1 : Math.PI - 0.1);
      ctx.stroke();
      // Craze cracks at the end: three kinked lines per slab.
      if (craze > 0) {
        const rand = srand(c.seed ^ (s + 9));
        ctx.globalAlpha = 0.9 * fade;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.4, sc * 0.03);
        for (let k = 0; k < 3; k++) {
          const a = (s === -1 ? Math.PI : 0) + rand() * Math.PI;
          const r0 = rPx * (0.1 + rand() * 0.2);
          const r1 = rPx * (0.5 + rand() * 0.34) * craze;
          const kink = (rand() - 0.5) * 0.7;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a + kink) * r1, Math.sin(a + kink) * r1);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // THE SEAM: the grinding line — bright, chip-spitting at each
    // stutter step (crossing-frame gate).
    ctx.globalAlpha = 0.95 * fade * (1 - craze);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(seamA) * rPx * 0.86, py - Math.sin(seamA) * rPx * 0.86 * squash);
    ctx.lineTo(px + Math.cos(seamA) * rPx * 0.86, py + Math.sin(seamA) * rPx * 0.86 * squash);
    ctx.stroke();
    const prevStep = Math.min(3, Math.floor((t - c.frameDt * 1000 / 680) * 6));
    if (prevStep < step && craze === 0) {
      frost.deployments.shatter!(asMatter(c),
        c.wx + Math.cos(seamA) * c.radius * (Math.random() - 0.5),
        c.wy + Math.sin(seamA) * c.radius * (Math.random() - 0.5), { scale: 0.3 });
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * fade);
  },
  air() { /* the grind lives on the ground; the library owns the chips */ },
};

// -------------------------------------------------------- solar_lance

/**
 * SOLAR_LANCE — "the second sun's shadows."
 * Noon does not travel — it IS, all along the line: the corridor
 * floor turns hard bright instantly, and the WORLD is re-lit: three
 * seeded stones near the line throw long shadows AWAY from it,
 * while inside the bar every mote's shadow sits directly beneath.
 * The lance is one white-gold core with heat serrations. A line of
 * gold grains and singe dots stays for eight seconds.
 */
const solar_lance: AbilitySig = {
  spawn(c) {
    radiance.deployments.shafts!(asMatter(c),
      (c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, { radius: 0.6, dur: 0.6, scale: 0.7 });
    // The singed line: gold grains + scorch dots down the corridor.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const n = 7;
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      lay(c, c.wx + dx * f, c.wy + dy * f,
        k % 2 === 0 ? '#ffd98a' : '#c89a3c', {
          life: 8, size: 0.05,
          fade: '#8a6a2e', fadeAt: 0.4,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2, rPx } = c;
    const rand = srand(c.seed ^ 0x501a);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const W = Math.max(rPx, sc * 0.3);
    ctx.save();
    ctx.lineCap = 'butt';
    // THE BAR OF NOON: the corridor floor, instantly and evenly
    // bright — a hard-edged light band, no growth, no travel.
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = shade(st.mid, 22);
    ctx.beginPath();
    ctx.moveTo(px + nx * W, py + ny * W * squash);
    ctx.lineTo(px2 + nx * W, py2 + ny * W * squash);
    ctx.lineTo(px2 - nx * W, py2 - ny * W * squash);
    ctx.lineTo(px - nx * W, py - ny * W * squash);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px + nx * W * s, py + ny * W * s * squash);
      ctx.lineTo(px2 + nx * W * s, py2 + ny * W * s * squash);
      ctx.stroke();
    }
    // THE RE-LIT WORLD: three seeded stones beside the line throw
    // long shadows AWAY from it — the second sun's proof.
    for (let k = 0; k < 3; k++) {
      const f = 0.2 + rand() * 0.6;
      const side = rand() < 0.5 ? 1 : -1;
      const off = W * (1.3 + rand() * 0.8);
      const bx = px + dx * f + nx * off * side;
      const by = py + dy * f + ny * off * side * squash;
      const shadowL = sc * (0.4 + rand() * 0.3) * fade;
      // The stone: a small lit lump facing the line.
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = shade(st.deep, 14);
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.08, sc * 0.06 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.ellipse(bx - nx * sc * 0.04 * side, by - ny * sc * 0.04 * side * squash,
        sc * 0.035, sc * 0.028 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // Its thrown shadow, stretching away from the bar.
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = shade(st.deep, -18);
      ctx.beginPath();
      ctx.ellipse(bx + nx * (sc * 0.08 + shadowL * 0.5) * side,
        by + ny * (sc * 0.08 + shadowL * 0.5) * side * squash,
        shadowL * 0.5, sc * 0.05 * squash, Math.atan2(ny * side, nx * side), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, c.radius + 1, 0.55 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const lift = sc * 0.5;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE LANCE: one white-gold core, whole from frame one, heat
    // serration ticks along its underside.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = Math.max(5, sc * 0.14);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.lineTo(px2, py2 - lift);
    ctx.stroke();
    ctx.globalAlpha = 0.97 * fade;
    ctx.strokeStyle = '#fffdf2';
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.lineTo(px2, py2 - lift);
    ctx.stroke();
    // Serrations: heat ticks hanging beneath, static (noon holds).
    const dx = px2 - px;
    const dy = py2 - py;
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = Math.max(1.4, sc * 0.032);
    for (let k = 0; k < 6; k++) {
      const f = (k + 0.5) / 6;
      ctx.beginPath();
      ctx.moveTo(px + dx * f, py + dy * f - lift + sc * 0.05);
      ctx.lineTo(px + dx * f - sc * 0.04, py + dy * f - lift + sc * 0.16);
      ctx.stroke();
    }
    // The IS moment: one flash at both ends simultaneously (noon
    // has no origin).
    if (t < 0.1) {
      const k = 1 - t / 0.1;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#fffdf2';
      for (const [ex, ey] of [[px, py], [px2, py2]] as Array<[number, number]>) {
        ctx.beginPath();
        burstStarPath(ctx, ex, ey - lift, sc * 0.26, sc * 0.1, 4, 0.4, 1);
        ctx.fill();
      }
    }
    ctx.restore();
    void st;
  },
};

// ----------------------------------------------------------- rune_echo

/**
 * RUNE_ECHO — "call and response."
 * Four rune-tablets stand at the quarters. Odd pulses are the CALL:
 * each tablet flashes one glyph-stroke in turn. Even pulses are the
 * RESPONSE: all four flash together, brighter, with a doubled ring —
 * the same word, louder. Tablet-base grains keep the four seats
 * marked for eight seconds.
 */
const rune_echo: AbilitySig = {
  spawn(c) {
    // One spawn per pulse — only the FIRST lays the tablet seats
    // (beat 0), the rest ride the standing geometry.
    const beat = Math.floor((c.now - c.age) / 500) % 4;
    if (beat !== 0) return;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = c.wx + Math.cos(a) * c.radius * 0.6;
      const by = c.wy + Math.sin(a) * c.radius * 0.6;
      lay(c, bx, by, c.st.mid, { life: 8, size: 0.055 });
      lay(c, bx + 0.08, by + 0.05, shade(c.st.deep, -10), { life: 8, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const beat = Math.floor((c.now - c.age) / 500);
    const isResponse = beat % 2 === 1;
    const fade = 1 - t;
    ctx.save();
    // The wave: one ring per pulse — the response doubles it.
    const rr = rPx * (0.3 + Math.min(1, t / 0.7) * 0.65);
    for (let d = 0; d < (isResponse ? 2 : 1); d++) {
      const dr = rr * (1 - d * 0.12);
      ctx.globalAlpha = (isResponse ? 0.9 : 0.6) * fade * (1 - d * 0.3);
      ctx.strokeStyle = d === 0 ? st.mid : st.core;
      ctx.lineWidth = Math.max(2, sc * (isResponse ? 0.06 : 0.045));
      ctx.beginPath();
      ctx.ellipse(px, py, dr, dr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const beat = Math.floor((c.now - c.age) / 500);
    const isResponse = beat % 2 === 1;
    const caller = beat % 4; // which tablet leads an odd pulse
    ctx.save();
    ctx.lineCap = 'butt';
    // THE TABLETS: four standing stones at the quarters — always
    // present while a pulse lives — dark slab, pale face.
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = px + Math.cos(a) * rPx * 0.6;
      const by = py + Math.sin(a) * rPx * 0.6 * squash;
      const H = sc * 0.44;
      const W = sc * 0.15;
      const lit = isResponse || k === caller % 4;
      const flash = lit ? Math.max(0, 1 - t * 2.2) : 0;
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = shade(st.deep, -12);
      ctx.fillRect(bx - W / 2 - sc * 0.02, by - H, W + sc * 0.04, H);
      ctx.fillStyle = shade(st.mid, lit ? 16 : -8);
      ctx.fillRect(bx - W / 2, by - H + sc * 0.02, W, H - sc * 0.04);
      // The glyph-stroke: one seeded angular mark per tablet, lit
      // hard on its turn.
      const r2 = srand(c.seed ^ (k + 11));
      ctx.globalAlpha = lit ? 0.95 + flash * 0.05 : 0.4;
      ctx.strokeStyle = lit ? (flash > 0.4 ? '#ffffff' : st.core) : st.mid;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(bx - W * 0.24, by - H * (0.3 + r2() * 0.3));
      ctx.lineTo(bx + W * 0.1, by - H * (0.55 + r2() * 0.2));
      ctx.lineTo(bx + W * 0.24, by - H * (0.25 + r2() * 0.2));
      ctx.stroke();
      // The response's crown glint.
      if (isResponse && t < 0.3) {
        ctx.globalAlpha = 0.95 * (1 - t / 0.3);
        ctx.fillStyle = st.core;
        const g = Math.max(2, sc * 0.05);
        ctx.fillRect(bx - g / 2, by - H - g - sc * 0.02, g, g);
      }
    }
    if (t < 0.15 && isResponse) c.glow(c.wx, c.wy, c.radius * 0.8, 0.5 * (1 - t / 0.15));
    ctx.restore();
  },
};

// -------------------------------------------------------- marrow_pulse

/**
 * MARROW_PULSE — "the counting knuckles."
 * The grave-light tolls are COUNTED: five knucklebone stones ring
 * the caster, and each pulse turns one more of them lit — an
 * abacus of bone keeping the toll's tally — while the wave rolls
 * out as a pale double-line. Bone-pale grains keep the ring for
 * eight seconds after the counting stops.
 */
const marrow_pulse: AbilitySig = {
  spawn(c) {
    const beat = Math.floor((c.now - c.age) / 500) % 5;
    if (beat !== 0) return;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      lay(c, c.wx + Math.cos(a) * 0.62, c.wy + Math.sin(a) * 0.62,
        k % 2 === 0 ? '#d8d2be' : '#b8b09a',
        { life: 8.5, size: 0.055 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    ctx.save();
    // The toll wave: a pale double-line rolling out.
    const rr = rPx * (0.25 + Math.min(1, t / 0.75) * 0.7);
    ctx.globalAlpha = 0.65 * fade;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(3.4, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#d8d2be';
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.94, rr * 0.94 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const count = Math.floor((c.now - c.age) / 500) % 6; // tolls so far
    ctx.save();
    // THE KNUCKLES: five bone stones ring the caster at waist
    // height. The first `count` are LIT (a pale inner glow face);
    // the newest lights with a click this pulse.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      const bx = px + Math.cos(a) * sc * 0.62;
      const by = py - sc * 0.4 + Math.sin(a) * sc * 0.42 * squash;
      const lit = k < count;
      const isNew = k === count - 1;
      const click = isNew ? Math.max(0, 1 - t * 3) : 0;
      const g = sc * (0.09 + (isNew ? click * 0.03 : 0));
      // Two offset bone blocks: the knuckle.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = lit ? '#d8d2be' : shade('#b8b09a', -18);
      ctx.fillRect(bx - g * 0.8, by - g * 0.9, g, g);
      ctx.fillRect(bx - g * 0.1, by - g * 0.5, g * 0.9, g * 0.85);
      if (lit) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = click > 0.3 ? '#ffffff' : st.core;
        ctx.fillRect(bx - g * 0.4, by - g * 0.6, Math.max(1.6, g * 0.32), Math.max(1.6, g * 0.32));
      }
    }
    // The toll's heart: a dim lantern-glow at the sternum, breathing
    // once per pulse.
    const breathe = Math.max(0, 1 - t * 1.6);
    ctx.globalAlpha = 0.5 * breathe;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.55, sc * 0.14, sc * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9 * breathe;
    ctx.fillStyle = '#d8d2be';
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.55, sc * 0.055, sc * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t < 0.15) c.glow(c.wx, c.wy, 0.9, 0.35 * (1 - t / 0.15));
    ctx.restore();
  },
};

// ----------------------------------------------------------- void_rift

/**
 * VOID_RIFT — "the unlit door."
 * A door of nothing stands on the field: a tall featureless slab of
 * pure dark, slightly trapezoid, that never shows an inside. Every
 * beat it INHALES: grass-lean ticks bow toward it, motes stream in
 * low, and the field's litter drags threshold-ward. When the field
 * ends it thins to a line and is gone — leaving a threshold stain
 * and drag-lines pointing at where it stood, for nine seconds.
 */
const void_rift: AbilitySig = {
  spawn(c) {
    // First pulse only: the threshold's lasting record.
    const beat = Math.floor((c.now - c.age) / 800);
    if (beat !== 0) return;
    for (let k = -2; k <= 2; k++) {
      lay(c, c.wx + k * 0.14, c.wy + 0.1, shade(c.st.deep, -18), { life: 9, size: 0.05 });
    }
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2 + 0.4;
      for (let k = 1; k <= 2; k++) {
        lay(c, c.wx + Math.cos(a) * 0.5 * k, c.wy + Math.sin(a) * 0.5 * k,
          c.st.deep, { life: 8.5, size: 0.04 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x0d0f);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE LEANING WORLD: grass ticks around the door bow toward it,
    // harder on the inhale beat.
    const inhale = 1 - Math.min(1, (c.now % 800) / 800) * 0.5;
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rPx * (0.4 + rand() * 0.55);
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash;
      const lean = 0.4 + inhale * 0.4;
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = k % 2 === 0 ? shade(st.deep, -6) : st.deep;
      ctx.lineWidth = Math.max(1.6, sc * 0.038);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (px - bx) * 0.14 * lean, by + (py - by) * 0.14 * lean - sc * 0.1 * (1 - lean * 0.5));
      ctx.stroke();
    }
    // The threshold shadow: the door's foot, printed dark.
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = shade(st.deep, -22);
    ctx.beginPath();
    ctx.ellipse(px, py + sc * 0.06, sc * 0.4, sc * 0.1 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.1);
    const thin = t > 0.85 ? (t - 0.85) / 0.15 : 0; // it closes to a line
    ctx.save();
    // THE DOOR: pure featureless dark, slightly trapezoid, standing
    // on the field. No rim light, no inside — the one shape in the
    // game that reflects nothing.
    const H = sc * 1.7;
    const Wb = sc * 0.4 * (1 - thin);
    const Wt = sc * 0.3 * (1 - thin);
    ctx.globalAlpha = 0.97 * fade;
    ctx.fillStyle = '#100c18';
    ctx.beginPath();
    ctx.moveTo(px - Wb, py);
    ctx.lineTo(px - Wt, py - H);
    ctx.lineTo(px + Wt, py - H);
    ctx.lineTo(px + Wb, py);
    ctx.closePath();
    ctx.fill();
    // THE INHALE: on each beat's first frames, motes stream in low
    // from all sides and vanish at the threshold.
    const beatT = (c.now % 800) / 800;
    if (beatT < 0.4 && t < 0.85 && Math.random() < c.frameDt * 30) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * 1.6, c.wy + Math.sin(a) * 1.6,
        1, [st.mid, st.spark], {
          speed: 2.6, life: 0.55, size: 0.045, gravity: 0,
          dir: a + Math.PI, spread: 0.06, shape: 'streak',
          z: 0.1, layer: 'world', shadow: 0, drag: 0.2,
        });
    }
    // The door's held breath between inhales: a slow vertical
    // shiver along its edges — the only motion it allows.
    const shiver = Math.sin(c.now / 320) * sc * 0.012;
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(1.4, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(px - Wb + shiver, py);
    ctx.lineTo(px - Wt + shiver, py - H);
    ctx.moveTo(px + Wb - shiver, py);
    ctx.lineTo(px + Wt - shiver, py - H);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.5, 0.14 * fade);
  },
};

// ---------------------------------------------------- eye_of_the_storm

/**
 * EYE_OF_THE_STORM — "the quiet disc."
 * Stand still at the center; the weather does the walking: a
 * perfect mirror-calm disc holds under the caster — light, still,
 * DRY — while every pulse rains only on the ring band around it:
 * slanted rain ticks, two bolt flickers, spray that never crosses
 * the line. What stays is the proof: a rained-dark ring of grains
 * around a circle the storm never touched.
 */
const eye_of_the_storm: AbilitySig = {
  spawn(c) {
    const beat = Math.floor((c.now - c.age) / 450) % 4;
    storm.deployments.crackle!(asMatter(c),
      c.wx + Math.cos(beat * 1.7) * c.radius * 0.8,
      c.wy + Math.sin(beat * 1.7) * c.radius * 0.8, { scale: 0.5 });
    if (beat !== 0) return;
    // The wet ring: dark rain-stain grains on the band only.
    const rand = srand(c.seed ^ 0xe0e1);
    for (let k = 0; k < 10; k++) {
      const a = rand() * Math.PI * 2;
      const rr = c.radius * (0.65 + rand() * 0.3);
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        shade(c.st.deep, -10), { life: 8, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t * 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE QUIET DISC: the calm — a light, still circle with one
    // faint static sheen line. Nothing in it moves. Ever.
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = shade(st.mid, 20);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.42, rPx * 0.42 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.44, rPx * 0.44 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // THE WEATHER BAND: slanted rain ticks on the ring only, redrawn
    // per frame from the pulse clock — the storm walking its circle.
    const rand = srand(c.seed ^ (0xe0e2 + Math.floor(c.now / 90)));
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.4, sc * 0.032);
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rPx * (0.58 + rand() * 0.36);
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash;
      ctx.beginPath();
      ctx.moveTo(bx + sc * 0.05, by - sc * 0.14);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // TWO BOLT FLICKERS on the band per pulse — never inside.
    if (t < 0.4) {
      const rand = srand(c.seed ^ (0xe0e3 + Math.floor(c.now / 140)));
      const flicker = 0.7 + 0.3 * Math.sin(c.now / 45);
      for (let k = 0; k < 2; k++) {
        const a = rand() * Math.PI * 2;
        const rr = rPx * (0.68 + rand() * 0.22);
        const bx = px + Math.cos(a) * rr;
        const by = py + Math.sin(a) * rr * squash;
        ctx.globalAlpha = 0.85 * (1 - t / 0.4) * flicker;
        ctx.strokeStyle = k === 0 ? '#fff9e0' : st.spark;
        ctx.lineWidth = Math.max(1.6, sc * 0.038);
        ctx.beginPath();
        boltPath(ctx, bx, by - sc * 1.4, bx, by, c.seed ^ (k + Math.floor(c.now / 140)), sc * 0.1);
        ctx.stroke();
      }
    }
    // The eye's crown: one still glint directly over the caster —
    // the only light that doesn't move.
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = st.core;
    const g = Math.max(2, sc * 0.05);
    ctx.fillRect(px - g / 2, py - sc * 1.5 - g / 2, g, g);
    ctx.restore();
    if (t < 0.12) c.glow(c.wx, c.wy, c.radius, 0.3 * (1 - t / 0.12));
  },
};

// -------------------------------------------------------- red_eclipse

/**
 * RED_ECLIPSE — "the reverse rain."
 * For one heartbeat the moon is CLOSE: a vast dim red disc hangs
 * low over the circle, brighter at its limb — and the tide answers
 * UPWARD: thin red threads lift off the ground toward it, beading
 * as they rise, until the moon recedes to a point and lets go.
 * Where each thread rose, a dark red dot stays for eight seconds.
 */
const red_eclipse: AbilitySig = {
  spawn(c) {
    blood.deployments.drink!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.7, dur: 0.6, scale: 0.5 });
    // The risen threads' roots: dark red dots in the circle.
    const rand = srand(c.seed ^ 0x4ec1);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * c.radius * 0.7;
      lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr,
        k % 2 === 0 ? '#63201a' : '#421410', { life: 8, size: 0.05 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The moon's light on the world: a dim red wash disc, limb-dark
    // — eclipse light, wrong and low.
    ctx.save();
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.9, rPx * 0.9 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(3, sc * 0.08);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x4ec2);
    ctx.save();
    // THE CLOSE MOON: a vast dim disc hanging low over the scene —
    // arrives 0→0.15, holds through 0.62, recedes to a point after.
    const arrive = Math.min(1, t / 0.15);
    const recede = Math.max(0, (t - 0.62) / 0.3);
    const moonY = py - sc * 1.9;
    const R = rPx * 1.05 * arrive * (1 - recede * 0.92);
    if (R > 1) {
      ctx.globalAlpha = 0.4 * (1 - recede * 0.4);
      ctx.fillStyle = shade(st.deep, -10);
      ctx.beginPath();
      ctx.ellipse(px, moonY, R, R * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // The limb: brighter at the rim, the eclipse's ring of blood.
      ctx.globalAlpha = 0.85 * (1 - recede * 0.3);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, moonY, R, R * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Maria: two darker seas on the face, seeded.
      ctx.globalAlpha = 0.5 * (1 - recede);
      ctx.fillStyle = shade(st.deep, -20);
      ctx.beginPath();
      ctx.ellipse(px - R * 0.3, moonY - R * 0.1, R * 0.2, R * 0.09, 0.3, 0, Math.PI * 2);
      ctx.ellipse(px + R * 0.24, moonY + R * 0.12, R * 0.14, R * 0.07, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE REVERSE RAIN: five threads lift off the ground toward the
    // moon — each a rising red line with a bead head, faster as the
    // moon holds.
    if (t > 0.12 && recede < 1) {
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand()) * rPx * 0.7;
        const born = 0.14 + k * 0.07;
        const u = Math.min(1, Math.max(0, (t - born) / 0.4));
        if (u <= 0 || u >= 1) continue;
        const bx = px + Math.cos(a) * rr;
        const by = py + Math.sin(a) * rr * squash;
        const topY = by + (moonY + R * 0.4 - by) * u;
        ctx.globalAlpha = 0.85 * (1 - recede);
        ctx.strokeStyle = '#b8362a';
        ctx.lineWidth = Math.max(1.4, sc * 0.032);
        ctx.beginPath();
        ctx.moveTo(bx, by + (topY - by) * Math.max(0, u - 0.3) / u);
        ctx.lineTo(bx, topY);
        ctx.stroke();
        ctx.globalAlpha = 0.95 * (1 - recede);
        ctx.fillStyle = '#d84a3a';
        ctx.beginPath();
        ctx.ellipse(bx, topY, sc * 0.035, sc * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The heartbeat: one deep pulse as the moon reaches full close.
    if (t > 0.13 && t < 0.24) {
      const k = 1 - (t - 0.13) / 0.11;
      c.glow(c.wx, c.wy, c.radius, 0.55 * k);
    }
    ctx.restore();
    void st;
  },
};

// ---------------------------------------------------------- realm_rend

/**
 * REALM_REND — "the unsewn seam."
 * Put the splinter back where it came from — through everything in
 * between: the corridor is a seam of cross-stitch X marks that POP
 * open one by one from the caster outward, a teal under-glow gaping
 * wider behind each, until the far end takes the splinter home —
 * then the seam re-closes from the far end back. A dotted line of
 * teal grains stays, and at the far end one splinter-shard glints
 * for nine seconds: returned, and remembered.
 */
const realm_rend: AbilitySig = {
  spawn(c) {
    storm.deployments.impact!(asMatter(c), c.wx2, c.wy2, { scale: 0.7 });
    // The seam's record: dotted teal grains + the splinter-shard.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const n = 7;
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      lay(c, c.wx + dx * f, c.wy + dy * f, '#9ae8de', {
        life: 8.5, size: 0.045, flicker: 0.25,
        fade: '#4a8a82', fadeAt: 0.5,
      });
    }
    c.particles.burst(c.wx2, c.wy2, 1, ['#dffcf8'], {
      speed: 0.02, life: 9, size: 0.1, gravity: 0, shape: 'glint',
      layer: 'world', z: 0.1, flicker: 0.3,
      fade: '#9ae8de', fadeAt: 0.4, fade2: '#3a6a64', fade2At: 0.8,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const dx = px2 - px;
    const dy = py2 - py;
    ctx.save();
    // The seam's shadow on the ground: a thin teal under-light line
    // that widens where the stitches above have popped.
    const unsew = Math.min(1, t / 0.45);
    const resew = Math.max(0, (t - 0.62) / 0.32);
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(px + dx * resew, py + dy * resew);
    ctx.lineTo(px + dx * unsew, py + dy * unsew);
    ctx.stroke();
    ctx.restore();
    void squash;
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const lift = sc * 0.5;
    const dx = px2 - px;
    const dy = py2 - py;
    const n = 7;
    const unsew = Math.min(1, t / 0.45); // pop wave, caster → far
    const resew = Math.max(0, (t - 0.62) / 0.32); // close, far → caster...
    ctx.save();
    ctx.lineCap = 'butt';
    // THE STITCHES: seven X marks along the corridor. Each pops
    // when the unsew wave passes it — the X snaps into two diverging
    // ticks — and re-forms when the resew wave (running the OTHER
    // way) crosses back over it.
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const x = px + dx * f;
      const y = py + dy * f - lift;
      const resewn = resew > 0 && f > 1 - resew;
      const isOpen = f < unsew && !resewn;
      const g = sc * 0.11;
      if (!isOpen) {
        // The intact stitch: a teal X.
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.8, sc * 0.042);
        ctx.beginPath();
        ctx.moveTo(x - g, y - g * 0.7);
        ctx.lineTo(x + g, y + g * 0.7);
        ctx.moveTo(x + g, y - g * 0.7);
        ctx.lineTo(x - g, y + g * 0.7);
        ctx.stroke();
      } else {
        // Popped: two diverging ticks + the gape's under-glow.
        const openAge = Math.min(1, (unsew - f) * 4);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#dffcf8';
        ctx.lineWidth = Math.max(1.8, sc * 0.042);
        ctx.beginPath();
        ctx.moveTo(x - g * (1 + openAge * 0.5), y - g * (0.7 + openAge * 0.5));
        ctx.lineTo(x - g * 0.3, y - g * 0.2);
        ctx.moveTo(x + g * (1 + openAge * 0.5), y - g * (0.7 + openAge * 0.5));
        ctx.lineTo(x + g * 0.3, y - g * 0.2);
        ctx.stroke();
        // The gape: a teal lens gap where the world shows through
        // to somewhere else — widest just behind the pop wave.
        const W = g * (1.2 + openAge * 0.8);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = shade('#1a3a36', -6);
        ctx.beginPath();
        ctx.ellipse(x, y + g * 0.3, W, g * 0.35, Math.atan2(dy, dx), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#9ae8de';
        ctx.lineWidth = Math.max(1.4, sc * 0.032);
        ctx.beginPath();
        ctx.ellipse(x, y + g * 0.3, W, g * 0.35, Math.atan2(dy, dx), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // THE POP WAVE'S HEAD: a bright rip point racing the corridor.
    if (unsew < 1) {
      const hx = px + dx * unsew;
      const hy = py + dy * unsew - lift;
      ctx.globalAlpha = 0.97;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      burstStarPath(ctx, hx, hy, sc * 0.16, sc * 0.06, 4, c.now / 200, 1);
      ctx.fill();
    }
    // THE SPLINTER GOES HOME: at the far end, the moment the wave
    // arrives — one hard teal star, the biggest this art allows.
    if (t > 0.44 && t < 0.6) {
      const k = 1 - (t - 0.44) / 0.16;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#dffcf8';
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - lift, sc * 0.44, sc * 0.16, 6, c.now / 300, 1);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 1.3, 0.75 * k);
    }
    ctx.restore();
    void st;
  },
};

// -------------------------------------------------------- the registry

/** The archmage second-half signatures, keyed by ability id. */
export const ARCHMAGE_B_SIGS: Record<string, AbilitySig> = {
  venom_lash,
  magma_orb,
  shatterfrost,
  solar_lance,
  rune_echo,
  marrow_pulse,
  void_rift,
  eye_of_the_storm,
  red_eclipse,
  realm_rend,
};
