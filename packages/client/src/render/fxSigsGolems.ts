/**
 * THE EARTH STANDS UP — the golem arts' signatures
 * (docs/golems-plan.md, at the three-strata bar).
 *
 * Nine receiving-end set-pieces: the PAINTED STATEMENT inside the
 * wire's life, TRUE-ALTITUDE matter flying off it, and THE LASTING
 * MARK — settled grains laid in deliberate formations that lie six to
 * ten seconds after the golem has turned away. A golem's art is
 * geology happening to you: every centerpiece says what the ground
 * itself just did, and the ground remembers it longest of anyone.
 *
 * Binding laws: hard edges, save/restore hygiene, squash on ground
 * y-radii, srand determinism (precompute seeded geometry BEFORE any
 * crossing-gate branch consumes rand), frameDt-gated emission, ≤ ~60
 * path ops per hook per frame. The telegraph stays PURE INSTRUMENT.
 * ONE-VOICE: fire, smoke, dust, frost, and storm speak through the
 * matter library; the golems' own MASONRY (standing slabs, the
 * landed hillstone, the frozen pane) is bespoke by grammar refusal —
 * the library owns materials, not architecture.
 *
 * Centerpiece registry (grep before naming, no reuse anywhere):
 * the stone that stays / the quarry stands up / the dent that cools /
 * the two grooves / the glazed coin / the breathing ground /
 * the shell lets go / the calving stars / the pane closes in.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { fire, smoke, dust, frost, storm, asMatter } from './matter/index.js';

/** Clamp to 0..1 — every staggered clock in this file runs on it. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** THE LASTING MARK — one settled grain laid at a world point. */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: {
    life?: number; size?: number; flicker?: number;
    fade?: string; fadeAt?: number; fade2?: string; fade2At?: number;
  } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05, life: opts.life ?? 8, size: opts.size ?? 0.055,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

/** Crossing-frame gate on the life fraction of a fixed-ms wire. */
function crossed(c: SigCtx, wireMs: number, at: number): boolean {
  const tPrev = c.t - (c.frameDt * 1000) / wireMs;
  return tPrev < at && c.t >= at;
}

/**
 * One faceted stone block with a lit top plane and a shaded cheek —
 * the family brick every golem signature builds from (the shared-
 * primitive law: fix it once, the whole file inherits).
 */
function stone(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  shell: string, lit: string, deep: string, tilt = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (tilt !== 0) ctx.rotate(tilt);
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.moveTo(-w, h * 0.5);
  ctx.lineTo(-w * 0.86, -h * 0.72);
  ctx.lineTo(w * 0.7, -h);
  ctx.lineTo(w, h * 0.4);
  ctx.closePath();
  ctx.fill();
  // The crown the tilted camera owns.
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.moveTo(-w * 0.86, -h * 0.72);
  ctx.lineTo(w * 0.7, -h);
  ctx.lineTo(w * 0.62, -h * 0.55);
  ctx.lineTo(-w * 0.7, -h * 0.36);
  ctx.closePath();
  ctx.fill();
  // The cheek in shadow.
  ctx.fillStyle = deep;
  ctx.beginPath();
  ctx.moveTo(w * 0.7, -h);
  ctx.lineTo(w, h * 0.4);
  ctx.lineTo(w * 0.55, h * 0.46);
  ctx.lineTo(w * 0.5, -h * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------ hillstone_throw
// blast at the wound (direct hit OR the dodged landing), 780 ms wire,
// radius 1.2 — the thrown hill arrives.

/**
 * HILLSTONE_THROW — "the stone that stays."
 * The boulder is already down when the wire opens: it BOUNCES once —
 * a real hop on true altitude, dust slamming out under both landings
 * — then settles as a standing stone with its lit crown, sinking a
 * knuckle into the turf. Around it the ground takes a cracked-earth
 * star: four short fractures running out of the socket. The lasting
 * mark is the whole argument: a knee-high rubble cairn (tight grain
 * cluster) sitting in its crack star nine seconds — the wilds keep
 * the golem's masonry long after you have stopped being angry at it.
 */
const hillstone_throw: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.85 });
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.7 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.35 });
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x901);
    // Precompute ALL seeded geometry before any gate consumes rand.
    const crackA: number[] = [];
    for (let k = 0; k < 4; k++) crackA.push((k / 4) * Math.PI * 2 + 0.4 + rand() * 0.5);
    const crackL: number[] = [];
    for (let k = 0; k < 4; k++) crackL.push(0.5 + rand() * 0.45);
    const fade = 1 - cl((t - 0.85) / 0.15);
    ctx.save();
    ctx.lineCap = 'round';
    // The socket: a dark seat pressed into the turf under the stone.
    ctx.globalAlpha = 0.75 * fade;
    ctx.fillStyle = '#241c10';
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.42, sc * 0.42 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The cracked-earth star, snapping out in two hard steps.
    const run = t < 0.3 ? 0.5 : 1;
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#241c10';
    ctx.lineWidth = Math.max(2, sc * 0.06);
    for (let k = 0; k < 4; k++) {
      const a = crackA[k]!;
      const L = sc * crackL[k]! * run;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * 0.3, py + Math.sin(a) * sc * 0.3 * squash);
      ctx.lineTo(px + Math.cos(a + 0.14) * L, py + Math.sin(a + 0.14) * L * squash);
      ctx.stroke();
    }
    ctx.restore();
    // The stone leaves its rubble the moment it settles: a tight
    // cairn cluster + crack-star grains, all on the long clock.
    if (crossed(c, 780, 0.62)) {
      const layR = srand(c.seed ^ 0x902);
      for (let k = 0; k < 6; k++) {
        const a = layR() * Math.PI * 2;
        const d = layR() * 0.22;
        lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d, '#6e6754', {
          life: 8.5 + layR(), size: 0.07 + layR() * 0.03, fade: '#4e463c', fadeAt: 0.55,
        });
      }
      for (let k = 0; k < 4; k++) {
        const a = crackA[k]!;
        for (let j = 1; j <= 2; j++) {
          lay(c, c.wx + Math.cos(a + 0.14) * crackL[k]! * (j / 2.2),
            c.wy + Math.sin(a + 0.14) * crackL[k]! * (j / 2.2),
            '#3a352c', { life: 7 + layR(), size: 0.05, fade: '#241c10', fadeAt: 0.5 });
        }
      }
    }
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x903);
    const tilt = (rand() - 0.5) * 0.5;
    // THE BOUNCE: down hard at t0, up on a short true arc, down for
    // keeps at 0.42 — the second landing spends the dust gate above.
    const hop = t < 0.42 ? Math.sin(cl(t / 0.42) * Math.PI) * 0.34 : 0;
    const settle = 1 - 0.12 * cl((t - 0.42) / 0.3);
    const w = sc * 0.44 * settle;
    const h = sc * 0.4 * settle;
    const y = py - hop * sc - h * 0.32;
    stone(ctx, px, y, w, h, '#87816e', '#b0a88e', '#4e463c', tilt);
    if (crossed(c, 780, 0.42)) {
      dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.5 });
    }
    c.glow(c.wx, c.wy, c.radius * 0.6, 0.08 * (1 - t));
  },
};

// ---------------------------------------------------------- quarry_ring
// ground_aoe blast, 780 ms wire, radius 2.4 — the slam brings the
// ground up in a standing ring.

/**
 * QUARRY_RING — "the quarry stands up."
 * The blast is not an explosion, it is an EXCAVATION: five raw slabs
 * heave OUT of the rim in sequence, each arriving with its own dust
 * curtain, each showing the lit crown of fresh-broken stone. For a
 * breath you are fenced in a quarry the golem called up by hitting
 * the ground once. The slabs sink back to a knuckle's height — and
 * the lasting mark is the ring of their stumps: five rubble pairs on
 * the rim lying eight seconds, the fence's foundation left standing.
 */
const quarry_ring: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.9 });
    dust.deployments.billow!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.6 });
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x911);
    const slabA: number[] = [];
    for (let k = 0; k < 5; k++) slabA.push((k / 5) * Math.PI * 2 + rand() * 0.24);
    const slabW: number[] = [];
    for (let k = 0; k < 5; k++) slabW.push(0.3 + rand() * 0.14);
    const fade = 1 - cl((t - 0.86) / 0.14);
    ctx.save();
    // The torn rim: a broken annulus of turned earth under the slabs.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = '#241c10';
    ctx.lineWidth = Math.max(3, sc * 0.14);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Each slab lays its stump rubble as it sinks.
    for (let k = 0; k < 5; k++) {
      if (crossed(c, 780, 0.66 + k * 0.02)) {
        const a = slabA[k]!;
        const layR = srand(c.seed ^ (0x920 + k));
        for (const o of [-0.1, 0.12]) {
          lay(c, c.wx + Math.cos(a + o) * c.radius * 0.92,
            c.wy + Math.sin(a + o) * c.radius * 0.92,
            '#6e6754', { life: 7.5 + layR(), size: 0.065, fade: '#4e463c', fadeAt: 0.5 });
        }
      }
    }
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x912);
    const slabA: number[] = [];
    for (let k = 0; k < 5; k++) slabA.push((k / 5) * Math.PI * 2 + rand() * 0.24);
    const slabW: number[] = [];
    for (let k = 0; k < 5; k++) slabW.push(0.3 + rand() * 0.14);
    for (let k = 0; k < 5; k++) {
      // Staggered heave: rise hard, stand, sink to a stump.
      const u = cl((t - k * 0.055) / 0.16);
      if (u <= 0) continue;
      const sink = cl((t - 0.6 - k * 0.02) / 0.3);
      const tall = sc * 0.62 * u * (1 - 0.82 * sink);
      if (tall < sc * 0.02) continue;
      const a = slabA[k]!;
      const bx = px + Math.cos(a) * rPx * 0.92;
      const by = py + Math.sin(a) * rPx * 0.92 * squash;
      const w = sc * slabW[k]!;
      stone(ctx, bx, by - tall * 0.5, w, tall * 0.5, '#87816e', '#b0a88e', '#4e463c',
        (a % 0.6) * 0.3 - 0.09);
      // Each arrival exhales its own curtain.
      if (crossed(c, 780, k * 0.055 + 0.16)) {
        dust.deployments.kick!(asMatter(c),
          c.wx + Math.cos(a) * c.radius * 0.92, c.wy + Math.sin(a) * c.radius * 0.92,
          { scale: 0.45 });
      }
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.1 * (1 - t));
  },
};

// ------------------------------------------------------------ anvil_fall
// ground_aoe blast, 780 ms wire, radius 2.0 — the iron golem's fists
// land and the floor rings.

/**
 * ANVIL_FALL — "the dent that cools."
 * One radial BELL: a hard rim flash, then two earthen swells traveling
 * out (the floor rung like metal), sod tabs flipping at the rim — and
 * at the heart the strike leaves a DENT that glows forge-orange and
 * cools in three hard steps to soot (the cooling law: never a smooth
 * ramp, always the smith's honest bands). Sparks are the only fire
 * iron owns. The lasting mark is the cooled dent itself: a soot ring
 * of grains with two dead-orange coals that gutter out mid-lie.
 */
const anvil_fall: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.95 });
    storm.deployments.impact!(m, c.wx, c.wy, { scale: 0.4 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.3 });
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x931);
    const tabA: number[] = [];
    for (let k = 0; k < 5; k++) tabA.push((k / 5) * Math.PI * 2 + rand() * 0.4);
    const fade = 1 - cl((t - 0.85) / 0.15);
    ctx.save();
    ctx.globalAlpha = fade;
    // The two traveling swells: dark under-arc + lit crest, ringing
    // outward on staggered clocks.
    for (const [t0, alpha] of [[0.04, 0.9], [0.2, 0.6]] as const) {
      const u = cl((t - t0) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const r = rPx * (0.2 + 0.8 * u);
      ctx.globalAlpha = alpha * (1 - u) * fade;
      ctx.strokeStyle = '#241c10';
      ctx.lineWidth = Math.max(2.5, sc * 0.1 * (1 - u * 0.5));
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.02, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.045 * (1 - u * 0.5));
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.02, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE DENT: forge-orange cooling in three hard bands, never smooth.
    const heat = t < 0.3 ? '#fff3d0' : t < 0.55 ? '#ff9a44' : t < 0.78 ? '#c43a18' : '#3a2c26';
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = '#241c10';
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.5, sc * 0.5 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = heat;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.36, sc * 0.36 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sod tabs flipped at the rim.
    ctx.fillStyle = '#3d3325';
    for (let k = 0; k < 5; k++) {
      const a = tabA[k]!;
      const bx = px + Math.cos(a) * rPx * 0.94;
      const by = py + Math.sin(a) * rPx * 0.94 * squash;
      ctx.beginPath();
      ctx.moveTo(bx - sc * 0.07, by);
      ctx.lineTo(bx + Math.cos(a) * sc * 0.1, by + Math.sin(a) * sc * 0.1 * squash - sc * 0.06);
      ctx.lineTo(bx + sc * 0.07, by);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // The cooled dent lies: a soot ring + two guttering coals.
    if (crossed(c, 780, 0.8)) {
      const layR = srand(c.seed ^ 0x932);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + layR() * 0.2;
        lay(c, c.wx + Math.cos(a) * 0.34, c.wy + Math.sin(a) * 0.34, '#241c10', {
          life: 8 + layR(), size: 0.06, fade: '#16100a', fadeAt: 0.5,
        });
      }
      for (let k = 0; k < 2; k++) {
        lay(c, c.wx + (layR() - 0.5) * 0.3, c.wy + (layR() - 0.5) * 0.3, '#ff9a44', {
          life: 6 + layR(), size: 0.05, flicker: 6,
          fade: '#c43a18', fadeAt: 0.3, fade2: '#241c10', fade2At: 0.65,
        });
      }
    }
  },
  air(c) {
    if (c.kind !== 'blast') return;
    // The bell's one bright moment: a vertical clap of light at the
    // heart, gone by a third — iron does not linger.
    const { ctx, st, t, sc, px, py } = c;
    const u = 1 - cl(t / 0.3);
    if (u <= 0) return;
    ctx.save();
    ctx.globalAlpha = u * 0.85;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.1 * u, py);
    ctx.lineTo(px, py - sc * (0.5 + 0.3 * u));
    ctx.lineTo(px + sc * 0.1 * u, py);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.22 * u);
  },
};

// ------------------------------------------------------------ drawn_bolt
// dash_strike, 380 ms wire — the shoulder-first piston lane.

/**
 * DRAWN_BOLT — "the two grooves."
 * The golem does not run, it ARRIVES: twin skid grooves tear the lane
 * from launch to terminus with a spark seam crackling between them,
 * and the stop is a STAMP — a hard rectangular footing pressed into
 * the ground where five hundredweight of iron decided to be
 * stationary. Grooves and stamp lie as grains nine seconds: the road
 * keeps the receipt of the golem's one sprint.
 */
const drawn_bolt: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'dash') return;
    const m = asMatter(c);
    dust.deployments.gouge!(m, c.wx2, c.wy2, {
      dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx), scale: 0.8,
    });
    storm.deployments.crackle!(m, c.wx2, c.wy2, { radius: 0.4, scale: 0.4 });
  },
  ground(c) {
    if (c.kind !== 'dash') return;
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const ang = Math.atan2(py2 - py, px2 - px);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const run = cl(t / 0.5);
    const fade = 1 - cl((t - 0.8) / 0.2);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';
    // The twin grooves, torn as far as the body has come.
    ctx.strokeStyle = '#241c10';
    ctx.lineWidth = Math.max(2, sc * 0.055);
    for (const side of [-1, 1] as const) {
      const ox = nx * side * sc * 0.16;
      const oy = ny * side * sc * 0.16 * squash;
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy);
      ctx.lineTo(px + (px2 - px) * run + ox, py + (py2 - py) * run + oy);
      ctx.stroke();
    }
    // The spark seam between them, alive only while the body slides.
    if (t < 0.55) {
      const rand = srand(c.seed ^ ((c.now / 50) | 0));
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      for (let k = 0; k < 3; k++) {
        const u = rand() * run;
        const jx = px + (px2 - px) * u;
        const jy = py + (py2 - py) * u;
        ctx.beginPath();
        ctx.moveTo(jx, jy);
        ctx.lineTo(jx + (rand() - 0.5) * sc * 0.14, jy - rand() * sc * 0.12);
        ctx.stroke();
      }
    }
    // THE STAMP at the terminus, pressed once the slide ends.
    if (t >= 0.5) {
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = '#241c10';
      ctx.save();
      ctx.translate(px2, py2);
      ctx.rotate(ang);
      ctx.scale(1, squash);
      ctx.fillRect(-sc * 0.26, -sc * 0.2, sc * 0.52, sc * 0.4);
      ctx.restore();
    }
    ctx.restore();
    // The receipt: groove grains + the stamp's four corners.
    if (crossed(c, 380, 0.72)) {
      const layR = srand(c.seed ^ 0x941);
      for (const side of [-1, 1] as const) {
        for (let j = 1; j <= 3; j++) {
          const u = j / 3.4;
          lay(c, c.wx + (c.wx2 - c.wx) * u + nx * side * 0.16,
            c.wy + (c.wy2 - c.wy) * u + ny * side * 0.16,
            '#2c313a', { life: 8 + layR(), size: 0.05, fade: '#1a1e24', fadeAt: 0.5 });
        }
      }
      for (const [ox, oy] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.14], [0.2, 0.14]] as const) {
        lay(c, c.wx2 + ox * Math.cos(ang) - oy * Math.sin(ang),
          c.wy2 + ox * Math.sin(ang) + oy * Math.cos(ang),
          '#3d434e', { life: 9 + layR(), size: 0.055, fade: '#241c10', fadeAt: 0.55 });
      }
    }
  },
};

// ------------------------------------------------------------ slag_gobbet
// blast at the wound, 780 ms wire, radius 1.0 — the lobbed melt lands.

/**
 * SLAG_GOBBET — "the glazed coin."
 * The gobbet bursts honest fire — and then the POINT of the art: the
 * splash cools into ONE glass-glazed disc, a coin of vitrified ground
 * with a sliding specular chip and three embers winking in it eight
 * seconds. The fire golem does not leave craters; it leaves currency.
 */
const slag_gobbet: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 0.7 });
    fire.deployments.gobbets!(m, c.wx, c.wy, { scale: 0.5 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.4 });
    const rand = srand(c.seed ^ 0x951);
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx + (rand() - 0.5) * 0.4, c.wy + (rand() - 0.5) * 0.4, '#ff9a44', {
        life: 7.5 + rand(), size: 0.06, flicker: 7,
        fade: '#c43a18', fadeAt: 0.35, fade2: '#3a2014', fade2At: 0.7,
      });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - cl((t - 0.88) / 0.12);
    const set = cl(t / 0.4);
    ctx.save();
    ctx.globalAlpha = fade;
    // The scorch under the coin.
    ctx.fillStyle = '#241812';
    ctx.globalAlpha = 0.7 * fade;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.8, rPx * 0.8 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE COIN: molten center hardening rim-inward as the wire runs.
    const heat = t < 0.35 ? st.core : t < 0.65 ? '#ff9a44' : '#c43a18';
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = '#3a2c26';
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.55, rPx * 0.55 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = heat;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.55 * (1 - 0.5 * set), rPx * 0.55 * (1 - 0.5 * set) * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The specular chip sliding across the glaze as it sets.
    ctx.globalAlpha = 0.8 * fade * set;
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.ellipse(px + rPx * (0.3 - 0.5 * t), py - rPx * 0.14 * squash, sc * 0.06, sc * 0.03, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (crossed(c, 780, 0.8)) {
      const layR = srand(c.seed ^ 0x952);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + layR();
        lay(c, c.wx + Math.cos(a) * 0.3, c.wy + Math.sin(a) * 0.3, '#241812', {
          life: 8 + layR(), size: 0.05, fade: '#16100a', fadeAt: 0.5,
        });
      }
    }
  },
  air(c) {
    if (c.kind !== 'blast') return;
    c.glow(c.wx, c.wy, c.radius, 0.3 * (1 - c.t));
  },
};

// -------------------------------------------------------------- vent_ring
// ground_aoe blast, 780 ms wire, radius 2.0 — the staked ground erupts.

/**
 * VENT_RING — "the breathing ground."
 * Five vent mouths on the rim HISS first — thin smoke threads, the
 * held breath — then erupt in sequence as short fire pillars, each a
 * true column with a white core, the ring speaking one mouth at a
 * time round the circle. The lasting mark is the mouths themselves:
 * five charred pairs lying eight seconds, the ground still shaped
 * for breathing long after it has stopped.
 */
const vent_ring: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    fire.deployments.ring!(m, c.wx, c.wy, { radius: c.radius * 0.9, scale: 0.55 });
    smoke.deployments.creep!(m, c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.5 });
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x961);
    const ventA: number[] = [];
    for (let k = 0; k < 5; k++) ventA.push((k / 5) * Math.PI * 2 + rand() * 0.22);
    const fade = 1 - cl((t - 0.86) / 0.14);
    ctx.save();
    ctx.globalAlpha = fade;
    // The vent mouths: dark slit ellipses on the rim.
    ctx.fillStyle = '#241812';
    for (let k = 0; k < 5; k++) {
      const a = ventA[k]!;
      const bx = px + Math.cos(a) * rPx * 0.9;
      const by = py + Math.sin(a) * rPx * 0.9 * squash;
      ctx.beginPath();
      ctx.ellipse(bx, by, sc * 0.16, sc * 0.06 * squash, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Each mouth chars its pair of grains as its pillar dies.
    for (let k = 0; k < 5; k++) {
      if (crossed(c, 780, 0.5 + k * 0.06)) {
        const a = ventA[k]!;
        const layR = srand(c.seed ^ (0x970 + k));
        for (const o of [-0.08, 0.1]) {
          lay(c, c.wx + Math.cos(a + o) * c.radius * 0.9,
            c.wy + Math.sin(a + o) * c.radius * 0.9,
            '#241812', { life: 7.5 + layR(), size: 0.055, fade: '#16100a', fadeAt: 0.45 });
        }
      }
    }
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x962);
    const ventA: number[] = [];
    for (let k = 0; k < 5; k++) ventA.push((k / 5) * Math.PI * 2 + rand() * 0.22);
    for (let k = 0; k < 5; k++) {
      const a = ventA[k]!;
      const bx = px + Math.cos(a) * rPx * 0.9;
      const by = py + Math.sin(a) * rPx * 0.9 * squash;
      // The hiss: a thin smoke thread before the mouth speaks.
      const hissU = cl((t - k * 0.04) / 0.12) * (1 - cl((t - 0.2 - k * 0.06) / 0.1));
      if (hissU > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5 * hissU;
        ctx.strokeStyle = '#8a8078';
        ctx.lineWidth = Math.max(1, sc * 0.025);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + sc * 0.05, by - sc * 0.2, bx - sc * 0.04, by - sc * 0.38);
        ctx.stroke();
        ctx.restore();
      }
      // The eruption: a short true pillar, one mouth at a time.
      const u = cl((t - 0.22 - k * 0.06) / 0.1) * (1 - cl((t - 0.4 - k * 0.06) / 0.2));
      if (u > 0) {
        const tall = sc * 0.85 * u;
        ctx.save();
        ctx.fillStyle = '#ff9a44';
        ctx.beginPath();
        ctx.moveTo(bx - sc * 0.11, by);
        ctx.quadraticCurveTo(bx - sc * 0.05, by - tall * 0.8, bx, by - tall);
        ctx.quadraticCurveTo(bx + sc * 0.05, by - tall * 0.8, bx + sc * 0.11, by);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff3d0';
        ctx.beginPath();
        ctx.moveTo(bx - sc * 0.045, by);
        ctx.quadraticCurveTo(bx, by - tall * 0.62, bx + sc * 0.045, by);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (crossed(c, 780, 0.26 + k * 0.06)) {
          fire.deployments.plume!(asMatter(c),
            c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9,
            { scale: 0.4 });
        }
        c.glow(c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9,
          0.6, 0.3 * u);
      }
    }
  },
};

// ------------------------------------------------------------ crust_burst
// nova, 680 ms wire, radius 2.6 — below the half, the shell lets go.

/**
 * CRUST_BURST — "the shell lets go."
 * The one time the fire golem shows you everything: six crust plates
 * blow OUTWARD on true arcs — rising, tumbling, landing in a ring —
 * each plate's inner face forge-bright and cooling as it flies. Under
 * them the scorch annulus spreads to the nova's honest edge. The
 * lasting mark is the plate ring: six dark grains at landing radius
 * with cooling-ember partners, the golem's shed skin lying in a
 * circle eight seconds — count them and you know it cannot do this
 * again soon.
 */
const crust_burst: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'nova') return;
    const m = asMatter(c);
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 1.0 });
    fire.deployments.fan!(m, c.wx, c.wy, { scale: 0.6 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.6 });
  },
  ground(c) {
    if (c.kind !== 'nova') return;
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - cl((t - 0.84) / 0.16);
    const u = cl(t / 0.5);
    ctx.save();
    // The scorch annulus racing to the honest edge.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = '#241812';
    ctx.lineWidth = Math.max(3, sc * 0.2 * (1 - u * 0.4));
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * (0.25 + 0.75 * u), rPx * (0.25 + 0.75 * u) * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // The plate ring lies as the last plate lands.
    if (crossed(c, 680, 0.7)) {
      const layR = srand(c.seed ^ 0x981);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + layR() * 0.3;
        const d = c.radius * (0.8 + layR() * 0.15);
        lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d, '#3a2c26', {
          life: 8 + layR(), size: 0.08, fade: '#241a16', fadeAt: 0.5,
        });
        lay(c, c.wx + Math.cos(a) * d + 0.08, c.wy + Math.sin(a) * d, '#ff9a44', {
          life: 6 + layR(), size: 0.045, flicker: 5,
          fade: '#c43a18', fadeAt: 0.35, fade2: '#241a16', fade2At: 0.7,
        });
      }
    }
  },
  air(c) {
    if (c.kind !== 'nova') return;
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x982);
    const plateA: number[] = [];
    for (let k = 0; k < 6; k++) plateA.push((k / 6) * Math.PI * 2 + rand() * 0.3);
    const plateS: number[] = [];
    for (let k = 0; k < 6; k++) plateS.push(0.14 + rand() * 0.1);
    for (let k = 0; k < 6; k++) {
      const a = plateA[k]!;
      const u = cl(t / 0.7);
      if (u >= 1) continue;
      // The true arc: out along the radius, up and over, down to the
      // landing ring — cooling from forge-bright to crust as it goes.
      const d = rPx * (0.2 + 0.68 * u);
      const rise = Math.sin(u * Math.PI) * sc * (0.5 + plateS[k]!);
      const bx = px + Math.cos(a) * d;
      const by = py + Math.sin(a) * d * squash - rise;
      const w = sc * plateS[k]!;
      const heat = u < 0.3 ? '#ff9a44' : u < 0.6 ? '#c43a18' : '#3a2c26';
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a + u * 4 * (k % 2 === 0 ? 1 : -1));
      ctx.fillStyle = '#241a16';
      ctx.beginPath();
      ctx.moveTo(-w, -w * 0.5);
      ctx.lineTo(w * 0.8, -w * 0.7);
      ctx.lineTo(w, w * 0.5);
      ctx.lineTo(-w * 0.6, w * 0.66);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = heat;
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, -w * 0.3);
      ctx.lineTo(w * 0.55, -w * 0.45);
      ctx.lineTo(w * 0.66, w * 0.25);
      ctx.lineTo(-w * 0.4, w * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    c.glow(c.wx, c.wy, c.radius, 0.4 * (1 - t));
  },
};

// --------------------------------------------------------- calving_volley
// blast per shard at the wound, 780 ms wire, radius 0.55 — the shorn
// shoulder arrives in threes.

/**
 * CALVING_VOLLEY — "the calving stars."
 * Deliberately the smallest golem mark (the shrilling-dart law: scale
 * belongs to the body that made it... and this is one THIRD of a
 * shoulder): each shard lands as a six-point hoar star snapping out
 * in one step, with a stub of the shard itself standing in the center
 * a breath before it sublimates. Three hoar grains lie seven seconds
 * — walk the three stars backward and they point at the golem.
 */
const calving_volley: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    frost.deployments.shatter!(m, c.wx, c.wy, { scale: 0.45 });
    const rand = srand(c.seed ^ 0x991);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * 0.16, c.wy + Math.sin(a) * 0.16, '#d8f2ff', {
        life: 6.5 + rand(), size: 0.045, fade: '#8ac4e8', fadeAt: 0.4,
      });
    }
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x992);
    const rot = rand() * Math.PI;
    const fade = 1 - cl((t - 0.8) / 0.2);
    const snap = t < 0.12 ? cl(t / 0.12) * 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = '#d8f2ff';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let k = 0; k < 6; k++) {
      const a = rot + (k / 6) * Math.PI * 2;
      const L = sc * 0.34 * snap * (k % 2 === 0 ? 1 : 0.62);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * 0.05, py + Math.sin(a) * sc * 0.05 * squash);
      ctx.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, t, sc, px, py } = c;
    // The shard stub: standing a breath, gone by half.
    const u = 1 - cl((t - 0.3) / 0.24);
    if (u <= 0) return;
    ctx.save();
    ctx.globalAlpha = u;
    ctx.fillStyle = '#9ec8dc';
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.06, py);
    ctx.lineTo(px - sc * 0.01, py - sc * 0.3);
    ctx.lineTo(px + sc * 0.05, py);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f0fbff';
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.06, py);
    ctx.lineTo(px - sc * 0.01, py - sc * 0.3);
    ctx.lineTo(px - sc * 0.005, py);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

// --------------------------------------------------------- winters_floor
// ground_aoe blast, 780 ms wire, radius 2.2 — the marked ground
// freezes over.

/**
 * WINTERS_FLOOR — "the pane closes in."
 * The exact opposite read to every outward nova in the game: the ice
 * grows from the RIM INWARD — an annulus of pane sweeping toward the
 * center, squeezing the last open ground to a closing eye — and where
 * the closing edges MEET, a pressure ridge buckles up: one white
 * zigzag seam across the middle, the sound of a lake made in half a
 * second. Fog breathes off the closing edge. The lasting mark is a
 * ring of hoar tufts at the rim plus the ridge line's grains: the
 * floor stays winter's a while.
 */
const winters_floor: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    frost.deployments.fog!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.6 });
    frost.deployments.shatter!(m, c.wx, c.wy, { scale: 0.5 });
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x9a1);
    const ridgeRot = rand() * Math.PI;
    const fade = 1 - cl((t - 0.86) / 0.14);
    // The pane closes: inner radius of open ground shrinking to zero.
    const closeU = cl(t / 0.55);
    const innerR = rPx * (1 - closeU);
    ctx.save();
    ctx.globalAlpha = 0.8 * fade;
    // The frozen annulus: pane color with the dark water under it.
    ctx.fillStyle = '#8ac4e8';
    ctx.beginPath();
    ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
    ctx.ellipse(px, py, Math.max(0.01, innerR), Math.max(0.01, innerR) * squash, 0, 0, Math.PI * 2, true);
    ctx.fill();
    // The closing edge, bright — where the ice is being made.
    if (closeU < 1) {
      ctx.strokeStyle = '#f0fbff';
      ctx.lineWidth = Math.max(2, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(px, py, innerR, innerR * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Trapped-depth flecks on the pane (few, hard-edged).
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = '#3a6c94';
    const fleckR = srand(c.seed ^ 0x9a2);
    for (let k = 0; k < 5; k++) {
      const a = fleckR() * Math.PI * 2;
      const d = rPx * (0.55 + fleckR() * 0.4);
      if (d < innerR) continue;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * d, py + Math.sin(a) * d * squash, sc * 0.05, sc * 0.028, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE PRESSURE RIDGE: the meeting seam, buckling up in one beat.
    const ridgeU = cl((t - 0.55) / 0.12);
    if (ridgeU > 0) {
      ctx.globalAlpha = ridgeU * fade;
      ctx.strokeStyle = st.core;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, sc * 0.07);
      ctx.beginPath();
      const segs = 5;
      for (let k = 0; k <= segs; k++) {
        const u = k / segs - 0.5;
        const zig = (k % 2 === 0 ? 1 : -1) * sc * 0.09 * ridgeU;
        const bx = px + Math.cos(ridgeRot) * rPx * 1.5 * u - Math.sin(ridgeRot) * zig;
        const by = py + (Math.sin(ridgeRot) * rPx * 1.5 * u + Math.cos(ridgeRot) * zig) * squash;
        if (k === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    ctx.restore();
    // The closing beat lays the winter that stays.
    if (crossed(c, 780, 0.67)) {
      const layR = srand(c.seed ^ 0x9a3);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + layR() * 0.2;
        lay(c, c.wx + Math.cos(a) * c.radius * 0.94, c.wy + Math.sin(a) * c.radius * 0.94,
          '#d8f2ff', { life: 7.5 + layR(), size: 0.055, fade: '#8ac4e8', fadeAt: 0.45 });
      }
      for (let j = -1; j <= 1; j++) {
        lay(c, c.wx + Math.cos(ridgeRot) * c.radius * 0.5 * j,
          c.wy + Math.sin(ridgeRot) * c.radius * 0.5 * j,
          '#f0fbff', { life: 8 + layR(), size: 0.05, fade: '#8ac4e8', fadeAt: 0.5 });
      }
      frost.deployments.bloom!(asMatter(c), c.wx, c.wy, { radius: 0.4, scale: 0.5 });
    }
  },
  air(c) {
    if (c.kind !== 'blast') return;
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.12 * (1 - c.t));
  },
};

export const GOLEM_SIGS: Record<string, AbilitySig> = {
  hillstone_throw,
  quarry_ring,
  anvil_fall,
  drawn_bolt,
  slag_gobbet,
  vent_ring,
  crust_burst,
  calving_volley,
  winters_floor,
};
