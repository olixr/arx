/**
 * THE WILD'S OWN HAND — the foes' wave (THE ARMORY REMEMBERS, wave
 * 8: the bestiary's kit at the three-strata bar).
 *
 * Ten receiving-end set-pieces, each on all three layers now: the
 * PAINTED STATEMENT inside the wire's life, the TRUE-ALTITUDE matter
 * flying off it (z/vz, contact with the ground honored), and THE
 * LASTING MARK — settled grains laid in deliberate formations that
 * lie on the field six to ten seconds after the foe has moved on.
 * A foe's art is read from the receiving end: every centerpiece
 * says, in one glance and slightly exaggerated, exactly what is
 * about to happen to you and where not to be standing.
 *
 * Binding laws as ever: hard edges, save/restore hygiene, squash on
 * ground y-radii, srand determinism, frameDt-gated emission, ≤ ~60
 * path ops per hook per frame. The telegraph stays PURE INSTRUMENT
 * (the uniform countdown ring IS the read — a signature never
 * dresses it). A summon wire is a 500 ms MOMENT; its aftermath
 * persists through matter and grains on their own clocks.
 *
 * Retired whole from this file's former life (never to return): the
 * catch with leaping rim tongues, the bubbling pool and haze coils,
 * the hoarfrost ferns and grave-candle, the strung silk wheel, the
 * four stepped afterimages, the inward knot-spirals and root ring,
 * the jagged violet rift, the racing rime and six hoar spikes, the
 * triple gouges and jaw crescents, the chevron shriek and bat-folds.
 *
 * FX v5 ONE-VOICE stands: fire, smoke, venom, frost, dust, and
 * blood speak through the matter library. Silk (web_snare), the
 * reaver's own steel (reaping_sweep), knitting growth
 * (gnawed_mending), and grave bone (raise_the_fallen, the chanter's
 * craft) stay bespoke by GRAMMAR REFUSAL — the library owns
 * materials, not a foe's own trade.
 *
 * The volleys (bone_volley, rattling_volley, goblin_firebolt,
 * gloom_spittle) are projectile-borne and speak the mastered flight
 * voices — their polish lives on the wing, not here.
 *
 * THE BRINE WAVE (the skral crowns): all EIGHT boss arts carry
 * full set-pieces — a crown's word is read a dozen times a fight
 * and must teach on every one. The dialect's shared grammar: water
 * is the actor (the spear rises through a mound, the crater empties
 * itself, the pool pulls INWARD), every landing wets the bank, and
 * the clocks are ragged — the shoal's rhythm, never the legion's.
 * gorge_spray is the exception that proves the volley rule: its
 * landing gob IS the art (the flight is a lobbed mouthful), so the
 * splat owns a signature where the arrows stay quiet.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { fire, smoke, dust, frost, venom, blood, water, asMatter } from './matter/index.js';

/** Clamp to 0..1 — every staggered clock in this file runs on it. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~10 s tertiary stratum).
 */
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

// ---------------------------------------------------------- cinder_ring
// blast, 780 ms wire, radius 1.8 — the firecaller's mark catches.

/**
 * CINDER_RING — "the staked torch."
 * The mark does not simply detonate: a crude goblin brand PLANTS at
 * the heart with a bounce, and the fire runs OUT of it the way a
 * fuse runs — five spark-headed fuse lines race the spokes to the
 * rim, then the rim itself lights both ways round from the first
 * arrival. Behind the running fire the ground is already char. The
 * lasting mark is the whole skeleton of the burn: charred spokes
 * and a charred rim ring lying eight seconds, with two embers still
 * winking at the heart. You were shown the shape; the shape stays.
 */
const cinder_ring: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    // The catch: an honest detonation under the planted brand.
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 0.75 });
    fire.deployments.gobbets!(m, c.wx, c.wy, { scale: 0.5 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.45 });
    // Two embers that stay winking at the heart — the torch's coals.
    const rand = srand(c.seed ^ 0x1c1);
    for (let k = 0; k < 2; k++) {
      lay(c, c.wx + (rand() - 0.5) * 0.3, c.wy + (rand() - 0.5) * 0.3, '#ff9a44', {
        life: 8.5, size: 0.065, flicker: 7,
        fade: '#c43a18', fadeAt: 0.35, fade2: '#3a2014', fade2At: 0.75,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x1c2);
    const fade = 1 - cl((t - 0.82) / 0.18);
    ctx.save();
    ctx.lineCap = 'round';
    // Five fuse lines run heart → rim on staggered clocks. Behind the
    // spark head the line is already char; ahead it does not exist.
    // Angles precomputed FIRST — the lay branches below must never
    // shift the stream under a later spoke's geometry.
    const spokeA: number[] = [];
    for (let k = 0; k < 5; k++) spokeA.push((k / 5) * Math.PI * 2 + rand() * 0.3);
    const layR = srand(c.seed ^ 0x1c3);
    for (let k = 0; k < 5; k++) {
      const a = spokeA[k]!;
      const u = cl((t - 0.04 - k * 0.035) / 0.16);
      if (u <= 0) continue;
      const ex = px + Math.cos(a) * rPx * u;
      const ey = py + Math.sin(a) * rPx * u * squash;
      // The char behind.
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = '#241812';
      ctx.lineWidth = Math.max(2.5, sc * 0.08);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // The running spark head with a short hot tail.
      if (u < 1) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(2, sc * 0.05);
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * rPx * Math.max(0, u - 0.12), py + Math.sin(a) * rPx * Math.max(0, u - 0.12) * squash);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        const g = Math.max(2, sc * 0.05);
        ctx.fillStyle = st.core;
        ctx.fillRect(ex - g / 2, ey - g / 2, g, g);
      }
      // Arrival: the rim catches at this spoke with a true pop, and
      // the spoke lays its char skeleton down for keeps.
      if (crossed(c, 780, 0.04 + k * 0.035 + 0.16)) {
        fire.deployments.burst!(asMatter(c),
          c.wx + Math.cos(a) * c.radius, c.wy + Math.sin(a) * c.radius, { scale: 0.22 });
        for (let s = 1; s <= 3; s++) {
          const su = s / 3.2;
          lay(c, c.wx + Math.cos(a) * c.radius * su, c.wy + Math.sin(a) * c.radius * su,
            '#3a2618', { life: 7.5 + layR(), size: 0.065, fade: '#241812', fadeAt: 0.4 });
        }
      }
    }
    // The rim lights both ways round from the first spoke's landing.
    const run = cl((t - 0.24) / 0.3);
    if (run > 0) {
      const a0 = spokeA[0]!;
      for (const dirn of [1, -1] as const) {
        const swept = Math.PI * run;
        ctx.globalAlpha = 0.85 * fade;
        ctx.strokeStyle = '#241812';
        ctx.lineWidth = Math.max(3, sc * 0.09);
        ctx.beginPath();
        ctx.ellipse(px, py, rPx, rPx * squash, 0, a0, a0 + swept * dirn, dirn < 0);
        ctx.stroke();
        if (run < 1) {
          const ha = a0 + swept * dirn;
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = st.mid;
          ctx.lineWidth = Math.max(2, sc * 0.055);
          ctx.beginPath();
          ctx.ellipse(px, py, rPx, rPx * squash, 0, ha - 0.3 * dirn, ha, dirn < 0);
          ctx.stroke();
          const hx = px + Math.cos(ha) * rPx;
          const hy = py + Math.sin(ha) * rPx * squash;
          const g = Math.max(2, sc * 0.045);
          ctx.fillStyle = st.core;
          ctx.fillRect(hx - g / 2, hy - g / 2, g, g);
        }
      }
    }
    // The rim's own lasting ring, laid the moment the runs meet.
    if (crossed(c, 780, 0.56)) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + layR() * 0.2;
        lay(c, c.wx + Math.cos(a) * c.radius, c.wy + Math.sin(a) * c.radius,
          '#3a2618', { life: 8 + layR() * 1.5, size: 0.075, fade: '#241812', fadeAt: 0.35 });
      }
    }
    ctx.restore();
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // THE BRAND: a crooked goblin torch standing at the heart. It
    // plants with a bounce, burns hard while the fuses run, and
    // gutters to a smoking stub by the end.
    const plant = cl(t / 0.08);
    const bounce = t < 0.14 ? Math.abs(Math.sin(t / 0.14 * Math.PI)) * sc * 0.06 : 0;
    const gutter = cl((t - 0.66) / 0.28);
    const bx = px + sc * 0.03;
    const baseY = py - bounce;
    const stickH = sc * 0.52 * plant;
    const lean = 0.16;
    const topX = bx + stickH * lean;
    const topY = baseY - stickH;
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = Math.max(3, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(bx, baseY);
    ctx.lineTo(topX, topY);
    ctx.stroke();
    // The wrap: one pale binding tick under the head.
    ctx.strokeStyle = '#8a6a3c';
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(topX - sc * 0.05, topY + sc * 0.07);
    ctx.lineTo(topX + sc * 0.05, topY + sc * 0.05);
    ctx.stroke();
    // The flame head: two-tone teardrop, white core, shrinking as it
    // gutters — never gone entirely until the wire ends.
    const fh = sc * (0.38 + 0.06 * Math.sin(c.now / 70)) * plant * (1 - gutter * 0.75);
    const fw = sc * 0.13 * (1 - gutter * 0.5);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.moveTo(topX - fw, topY);
    ctx.quadraticCurveTo(topX - fw, topY - fh * 0.5, topX, topY - fh);
    ctx.quadraticCurveTo(topX + fw, topY - fh * 0.5, topX + fw, topY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(topX - fw * 0.55, topY);
    ctx.quadraticCurveTo(topX - fw * 0.55, topY - fh * 0.4, topX, topY - fh * 0.7);
    ctx.quadraticCurveTo(topX + fw * 0.55, topY - fh * 0.4, topX + fw * 0.55, topY);
    ctx.closePath();
    ctx.fill();
    const g = Math.max(1.5, sc * 0.035) * (1 - gutter);
    if (g > 0.5) {
      ctx.fillStyle = st.core;
      ctx.fillRect(topX - g / 2, topY - fh * 0.55 - g, g, g * 1.7);
    }
    // Gutter smoke: one thin thread once the flame is dying.
    if (gutter > 0.3 && Math.random() < c.frameDt * 6) {
      c.particles.burst(c.wx + 0.03, c.wy - 0.75, 1, ['#5a544c'], {
        speed: 0.1, life: 1.4, size: 0.06, gravity: -0.25, drag: 1.5, shape: 'mote',
      });
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.3 * (1 - t));
  },
};

// --------------------------------------------------------- miasma_ring
// ground_field, 90 ticks = 4.5 s, pulse every 15 ticks = 750 ms.

/**
 * MIASMA_RING — "the puffball clock."
 * The gloomcaller's seed comes up as FUNGUS on a countable clock:
 * six rim stations, and on every field pulse the next station
 * sprouts a warted puffball while the one before it POPS into a true
 * venom cloud and collapses to a lying husk. The heart holds the
 * mother — a fat speckled dome with a dark mouth-pore that exhales
 * a painted spore jet on the same beat. By the time the haze thins,
 * the ring is written in husks that lie there eight seconds: you
 * can count, station by station, how long you stood in it.
 */
const miasma_ring: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    venom.deployments.burst!(m, c.wx, c.wy, { scale: 0.5 });
    venom.deployments.pool!(m, c.wx, c.wy, { radius: c.radius * 0.75, scale: 0.65 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x2a1);
    const inK = cl(t / 0.08);
    const out = 1 - cl((t - 0.9) / 0.1);
    const a = inK * out;
    if (a <= 0) return;
    const beatMs = 750;
    const beat = Math.floor(c.age / beatMs);
    const beatU = (c.age % beatMs) / beatMs;
    const prevBeat = Math.floor((c.age - c.frameDt * 1000) / beatMs);
    ctx.save();
    // The stain: two irregular bands, olive floor under sick green,
    // rims wobbled on slow clocks — never a stamped circle.
    for (const [bk, color, alpha] of [
      [1.0, '#3c5426', 0.4],
      [0.68, st.deep, 0.5],
    ] as const) {
      ctx.globalAlpha = alpha * a;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const wa = (i / 12) * Math.PI * 2;
        const wob = 1 + 0.07 * Math.sin(wa * 3 + c.now / 800);
        const rr = rPx * bk * wob;
        const x = px + Math.cos(wa) * rr;
        const y = py + Math.sin(wa) * rr * squash;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Six rim stations on the puffball clock. Station k sprouts on
    // beat k, pops on beat k+1, and its husk lies flat thereafter.
    const stJit: number[] = [];
    for (let k = 0; k < 6; k++) stJit.push(rand() * 0.25);
    for (let k = 0; k < 6; k++) {
      const sa = (k / 6) * Math.PI * 2 + stJit[k]!;
      const bx = px + Math.cos(sa) * rPx * 0.82;
      const by = py + Math.sin(sa) * rPx * 0.82 * squash;
      const wbx = c.wx + Math.cos(sa) * c.radius * 0.82;
      const wby = c.wy + Math.sin(sa) * c.radius * 0.82 * squash;
      if (beat < k) continue;
      if (beat === k) {
        // Swelling: the dome grows through its beat, warts and all.
        const s = sc * 0.24 * cl(beatU / 0.8);
        if (s < 1) continue;
        ctx.globalAlpha = 0.95 * a;
        ctx.fillStyle = st.deep;
        ctx.beginPath();
        ctx.ellipse(bx, by - s * 0.4, s, s * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2a3418';
        ctx.lineWidth = Math.max(1.5, sc * 0.028);
        ctx.stroke();
        // The foreshortened top plane, catching the sick light.
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.ellipse(bx - s * 0.15, by - s * 0.75, s * 0.55, s * 0.3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Three wart dots — jitter stable per station, never re-rolled.
        const wr = srand(c.seed ^ (0x2b0 + k));
        ctx.fillStyle = '#d8f070';
        for (let w = 0; w < 3; w++) {
          const wx2 = bx + (wr() - 0.5) * s * 1.2;
          const wy2 = by - s * (0.3 + wr() * 0.6);
          const g = Math.max(1.5, s * 0.18);
          ctx.fillRect(wx2 - g / 2, wy2 - g / 2, g, g);
        }
      } else {
        // Popped: the collapsed husk flap lies at the station while
        // the field lives (the grains carry it on after).
        ctx.globalAlpha = 0.7 * a;
        ctx.fillStyle = '#5a6a34';
        ctx.beginPath();
        ctx.ellipse(bx, by, sc * 0.18, sc * 0.08 * squash, sa, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5 * a;
        ctx.strokeStyle = '#3c4424';
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.ellipse(bx, by, sc * 0.18, sc * 0.08 * squash, sa, 0.4, Math.PI - 0.4);
        ctx.stroke();
      }
      // The pop itself: a true venom cloud and the lasting husk.
      if (prevBeat === k && beat === k + 1) {
        venom.deployments.cloud!(asMatter(c), wbx, wby, { radius: 0.45, scale: 0.4 });
        lay(c, wbx, wby, '#5a6a34', { life: 8, size: 0.085, fade: '#3c4424', fadeAt: 0.45 });
        lay(c, wbx + 0.12, wby + 0.06, '#3c4424', { life: 7.5, size: 0.065 });
      }
    }
    // THE MOTHER: the fat speckled dome at the heart, swelling a step
    // with every beat, mouth-pore dark and open.
    const ms = sc * (0.3 + Math.min(5, beat) * 0.03 + 0.025 * Math.sin(c.now / 500));
    ctx.globalAlpha = 0.95 * a;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py - ms * 0.35, ms, ms * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px - ms * 0.18, py - ms * 0.68, ms * 0.55, ms * 0.28, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a3418';
    ctx.beginPath();
    ctx.ellipse(px + ms * 0.1, py - ms * 0.85, ms * 0.16, ms * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // The exhale: a painted spore jet standing off the pore early in
    // every beat — the clock's tick made visible.
    if (beatU < 0.3 && t < 0.92) {
      const ju = beatU / 0.3;
      const jh = sc * 0.3 * Math.sin(ju * Math.PI);
      ctx.globalAlpha = 0.8 * (1 - ju) * a;
      ctx.strokeStyle = '#d8f070';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px + ms * 0.1, py - ms * 0.85);
      ctx.quadraticCurveTo(px + ms * 0.2, py - ms * 0.85 - jh * 0.6, px + ms * 0.12, py - ms * 0.85 - jh);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { t } = c;
    const out = 1 - cl((t - 0.9) / 0.1);
    // Spore motes: sparse, low, drifting up off the stain.
    if (t < 0.88 && Math.random() < c.frameDt * 4) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.8;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, 1,
        ['#d8f070', '#7ac46a'], {
          speed: 0.06, life: 1.8, size: 0.04, gravity: -0.05, drag: 1.4, shape: 'mote',
        });
    }
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.1 * out);
  },
};

// ---------------------------------------------------------- grave_mist
// ground_field, 80 ticks = 4 s, pulse every 20 ticks = 1000 ms.

/**
 * GRAVE_MIST — "the door ajar."
 * The cold has a doorway. A slab of pale grave-light lies ACROSS the
 * ground like light spilled through a tomb door left open — and on
 * every field pulse the door creaks one notch wider: the slab widens
 * in a hard step, a bank of true fog rolls off its far edge, and one
 * more hoarfrost fern etches out from its long side. A thin standing
 * curtain of light leans at the hinge line, breathing. When the door
 * finally shuts, the ferns stay — frost skeletons lying eight
 * seconds where the light used to fall.
 */
const grave_mist: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    frost.deployments.bloom!(m, c.wx, c.wy, { radius: c.radius * 0.6, scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x3d1);
    const out = 1 - cl((t - 0.88) / 0.12);
    const beatMs = 1000;
    const beat = Math.min(3, Math.floor(c.age / beatMs));
    const prevBeat = Math.floor((c.age - c.frameDt * 1000) / beatMs);
    const slabA = rand() * Math.PI; // the door's lie, seeded once
    const ca = Math.cos(slabA);
    const sa = Math.sin(slabA);
    // The slab: length along the hinge, width stepping wider per
    // creak — a HARD step with a brief overshoot shiver, never a tween.
    const creakAge = (c.age % beatMs) / beatMs;
    const shiver = creakAge < 0.12 ? Math.sin(creakAge / 0.12 * Math.PI) * 0.06 : 0;
    const halfL = rPx * 0.85;
    const halfW = rPx * (0.22 + beat * 0.18 + shiver);
    const corner = (u: number, v: number): [number, number] => [
      px + (ca * u * halfL - sa * v * halfW),
      py + (sa * u * halfL + ca * v * halfW) * squash,
    ];
    ctx.save();
    // Pale light body + white inner lane: the spilled grave-light.
    for (const [color, wk, alpha] of [
      [st.mid, 1, 0.42],
      [st.core, 0.45, 0.32],
    ] as const) {
      ctx.globalAlpha = alpha * out;
      ctx.fillStyle = color;
      ctx.beginPath();
      const c1 = corner(-1, -wk);
      ctx.moveTo(c1[0], c1[1]);
      for (const [u, v] of [[1, -wk], [1, wk], [-1, wk]] as const) {
        const cc = corner(u, v);
        ctx.lineTo(cc[0], cc[1]);
      }
      ctx.closePath();
      ctx.fill();
    }
    // The hinge line: one hard bright rule where the door stands.
    ctx.globalAlpha = 0.9 * out;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    const h0 = corner(-1, 0);
    const h1 = corner(1, 0);
    ctx.beginPath();
    ctx.moveTo(h0[0], h0[1] - sc * 0.01);
    ctx.lineTo(h1[0], h1[1] - sc * 0.01);
    ctx.stroke();
    // The creak: on each pulse, fog rolls off the widening edge and
    // one more fern is born off a long side.
    if (prevBeat !== beat && c.age > 100) {
      const eu = (beat % 2 === 0 ? 1 : -1) * 0.5;
      frost.deployments.fog!(asMatter(c),
        c.wx + (ca * eu * c.radius * 0.8 - sa * (0.22 + beat * 0.18) * c.radius),
        c.wy + (sa * eu * c.radius * 0.8 + ca * (0.22 + beat * 0.18) * c.radius) * squash,
        { radius: c.radius * 0.5, scale: 0.4 });
    }
    // Ferns: fern k is born at beat k, etching outward from the slab's
    // long edge over 0.45 s, then LAYS its skeleton down for keeps.
    for (let k = 0; k <= beat; k++) {
      const born = k * beatMs;
      const fu = cl((c.age - born) / 450);
      if (fu <= 0) continue;
      const side = k % 2 === 0 ? 1 : -1;
      const u0 = -0.7 + (k * 0.45 + rand() * 0.15);
      const baseW = (0.22 + k * 0.18);
      const bx = px + (ca * u0 * halfL - sa * side * baseW * rPx);
      const by = py + (sa * u0 * halfL + ca * side * baseW * rPx) * squash;
      const fa = slabA + side * (Math.PI / 2) + (rand() - 0.5) * 0.4;
      const flen = rPx * (0.5 + rand() * 0.25);
      const ex = bx + Math.cos(fa) * flen * fu;
      const ey = by + Math.sin(fa) * flen * fu * squash;
      ctx.globalAlpha = 0.9 * out;
      ctx.strokeStyle = '#e8f4fa';
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // Paired side teeth at thirds, angled forward.
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.028);
      for (let s2 = 1; s2 <= 3; s2++) {
        const su = s2 / 4;
        if (su > fu) break;
        const jx = bx + Math.cos(fa) * flen * su;
        const jy = by + Math.sin(fa) * flen * su * squash;
        const tl = sc * 0.08 * (1 - su * 0.5);
        for (const tside of [-0.7, 0.7]) {
          ctx.beginPath();
          ctx.moveTo(jx, jy);
          ctx.lineTo(jx + Math.cos(fa + tside) * tl, jy + Math.sin(fa + tside) * tl * squash);
          ctx.stroke();
        }
      }
      // Fully grown: the skeleton lies down as grains, once — off its
      // own stream so later ferns' geometry never shifts underneath.
      const fuPrev = cl((c.age - c.frameDt * 1000 - born) / 450);
      if (fuPrev < 1 && fu >= 1) {
        const lr = srand(c.seed ^ (0x3e0 + k));
        const wbx = c.wx + (ca * u0 * c.radius * 0.85 - sa * side * baseW * c.radius);
        const wby = c.wy + (sa * u0 * c.radius * 0.85 + ca * side * baseW * c.radius) * squash;
        const flenT = flen / rPx * c.radius;
        for (let s2 = 1; s2 <= 3; s2++) {
          const su = s2 / 3.2;
          lay(c, wbx + Math.cos(fa) * flenT * su, wby + Math.sin(fa) * flenT * su * squash,
            '#cfe4f0', { life: 7.5 + lr() * 1.5, size: 0.06, fade: '#8ac4e8', fadeAt: 0.5 });
        }
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    // Same salt, same first draw as ground: the curtain must stand on
    // the slab's own hinge line.
    const rand = srand(c.seed ^ 0x3d1);
    const out = 1 - cl((t - 0.88) / 0.12);
    const slabA = rand() * Math.PI;
    ctx.save();
    // The door itself, ajar: a thin standing curtain of light leaning
    // over the hinge line, breathing on a slow clock.
    const lean = 0.12 + 0.04 * Math.sin(c.now / 1100);
    const h = sc * (0.7 + 0.06 * Math.sin(c.now / 800));
    const hw = rPx * 0.55;
    const ca = Math.cos(slabA);
    const sa2 = Math.sin(slabA);
    ctx.globalAlpha = 0.28 * out;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(px - ca * hw, py - sa2 * hw * squash);
    ctx.lineTo(px - ca * hw + lean * h, py - sa2 * hw * squash - h);
    ctx.lineTo(px + ca * hw + lean * h, py + sa2 * hw * squash - h);
    ctx.lineTo(px + ca * hw, py + sa2 * hw * squash);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Grave-motes: pale, slow, rising off the lit slab.
    if (t < 0.86 && Math.random() < c.frameDt * 3) {
      const u = (Math.random() - 0.5) * 1.4;
      c.particles.burst(c.wx + ca * u * c.radius * 0.7, c.wy + sa2 * u * c.radius * 0.7, 1,
        ['#cfe4f0', '#8ac4e8'], {
          speed: 0.05, life: 2.2, size: 0.045, gravity: -0.07, drag: 1.6, shape: 'mote',
        });
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.12 * out);
  },
};

// ----------------------------------------------------------- web_snare
// ground_field, 70 ticks = 3.5 s, pulse every 10 ticks = 500 ms.

/**
 * WEB_SNARE — "the pitched net."
 * GRAMMAR REFUSAL: silk is not a library material — every strand is
 * hand-strung. The snare is not flat: a low silk TENT pitches over
 * the circle in one thrown beat (the canopy billows down with real
 * height), six guy-lines running from a center peak to six rim
 * stakes, sagging gores strung between them. Then the ratchet: on
 * every field pulse the net TIGHTENS one notch — the peak pulls
 * lower, the stakes tilt inward, the sag deepens, and the whole rig
 * shivers like a plucked string. When the silk goes, the stake ring
 * stays — six pegs lying in a circle for nine seconds, the shape of
 * the trap that held you.
 */
const web_snare: AbilitySig = {
  spawn(c) {
    // The throw: silk motes scatter off the landing canopy.
    const rand = srand(c.seed ^ 0x4e1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * c.squash,
        1, ['#f4f2ea', '#c9c4b4'],
        { speed: 0.2, life: 0.6, size: 0.05, gravity: 0, shape: 'glint' });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x4e2);
    void st;
    const out = 1 - cl((t - 0.9) / 0.1);
    const beatMs = 500;
    const beat = Math.floor(c.age / beatMs);
    const notch = Math.min(5, beat);
    const beatU = (c.age % beatMs) / beatMs;
    // The pitch: the canopy falls from above in the first 120 ms.
    const drop = cl(c.age / 120);
    const dropLift = (1 - drop) * sc * 0.9;
    // The pluck: each notch arrives with a shiver envelope.
    const pluck = beatU < 0.25 ? Math.sin(beatU / 0.25 * Math.PI * 3) * (1 - beatU / 0.25) : 0;
    // The rig's numbers, ratcheting notch by notch.
    const peakH = sc * (0.42 - notch * 0.05) + dropLift;
    const tilt = notch * 0.05;
    const sag = 0.12 + notch * 0.035;
    const stakes: Array<[number, number, number]> = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.26 + rand() * 0.08;
      const rr = rPx * (1 - tilt * 0.35);
      stakes.push([a, px + Math.cos(a) * rr, py + Math.sin(a) * rr * squash]);
    }
    ctx.save();
    ctx.lineCap = 'round';
    // Two passes over one geometry: shadow under, silk over.
    for (const [color, w, alpha, off] of [
      ['#3c3648', 0.05, 0.45, 1.5],
      ['#f4f2ea', 0.032, 0.95, 0],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, sc * w);
      ctx.globalAlpha = alpha * out * drop;
      // Guy-lines: peak top to each stake, bowing under their own silk.
      ctx.beginPath();
      for (const [a, sx, sy] of stakes) {
        const shiv = pluck * sc * 0.03 * Math.sin(a * 3.1);
        const mx = (px + sx) / 2 + shiv;
        const my = (py - peakH + sy) / 2 + sc * sag * 0.7 + shiv;
        ctx.moveTo(px, py - peakH + off);
        ctx.quadraticCurveTo(mx, my + off, sx, sy + off);
      }
      ctx.stroke();
      // Gores: sagging chords stake to stake, two tiers.
      ctx.beginPath();
      for (let tier = 0; tier < 2; tier++) {
        const tk = tier === 0 ? 1 : 0.55;
        for (let k = 0; k < 6; k++) {
          const [a0, x0, y0] = stakes[k]!;
          const [a1, x1, y1] = stakes[(k + 1) % 6]!;
          const gx0 = px + (x0 - px) * tk;
          const gy0 = (py - peakH * (1 - tk)) + (y0 - py) * tk;
          const gx1 = px + (x1 - px) * tk;
          const gy1 = (py - peakH * (1 - tk)) + (y1 - py) * tk;
          const ma = (a0 + a1) / 2;
          const mx = (gx0 + gx1) / 2 - Math.cos(ma) * rPx * sag * tk;
          const my = (gy0 + gy1) / 2 - Math.sin(ma) * rPx * sag * tk * squash
            + sc * sag * 0.8 + pluck * sc * 0.04 * Math.sin(k + tier * 2);
          ctx.moveTo(gx0, gy0 + off);
          ctx.quadraticCurveTo(mx, my + off, gx1, gy1 + off);
        }
      }
      ctx.stroke();
    }
    // The stakes: six pegs leaning outward, tilting inward as the
    // ratchet takes them, each with a hard little cast shadow.
    for (const [a, sx, sy] of stakes) {
      const pl = sc * 0.12;
      const pa = a + Math.PI - tilt * 2; // leaning out, pulled in
      ctx.globalAlpha = 0.9 * out * drop;
      ctx.strokeStyle = '#8a7a5c';
      ctx.lineWidth = Math.max(2.5, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - Math.cos(pa) * pl * 0.5, sy - Math.sin(pa) * pl - pl * 0.8);
      ctx.stroke();
      ctx.globalAlpha = 0.4 * out * drop;
      ctx.fillStyle = '#3c3648';
      ctx.beginPath();
      ctx.ellipse(sx + sc * 0.02, sy + sc * 0.015, pl * 0.4, pl * 0.16 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The peak knot: wound silk at the top of the pitch.
    ctx.globalAlpha = 0.95 * out * drop;
    ctx.fillStyle = '#e8e4d6';
    ctx.beginPath();
    ctx.ellipse(px, py - peakH, sc * 0.07, sc * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // Notch arrivals: a creak glint at the peak, a thread laid at the
    // rim — and at the field's end, the stake ring lies down for keeps.
    const prevBeat = Math.floor((c.age - c.frameDt * 1000) / beatMs);
    if (prevBeat !== beat && beat >= 1 && beat <= 5) {
      c.particles.burst(c.wx, c.wy, 1, ['#ffffff'], {
        speed: 0.1, life: 0.35, size: 0.05, gravity: 0, shape: 'glint', z: 0.35,
      });
      const ta = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(ta) * c.radius * 0.9, c.wy + Math.sin(ta) * c.radius * 0.9 * squash,
        '#f4f2ea', { life: 6.5, size: 0.04, fade: '#c9c4b4', fadeAt: 0.5 });
    }
    if (crossed(c, (c.ticks ?? 70) * 50, 0.94)) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.26;
        lay(c, c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9 * squash,
          '#8a7a5c', { life: 9, size: 0.055, fade: '#5c5240', fadeAt: 0.55 });
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x4e3);
    const out = 1 - cl((t - 0.9) / 0.1);
    ctx.save();
    // Dew: two glints travel the guy-lines, peak to stake.
    for (let k = 0; k < 2; k++) {
      const a = (Math.floor(rand() * 6) / 6) * Math.PI * 2 + 0.26;
      const u = ((c.now / 2200) + k * 0.5) % 1;
      const notch = Math.min(5, Math.floor(c.age / 500));
      const peakH = sc * (0.42 - notch * 0.05);
      const sx = px + Math.cos(a) * rPx;
      const sy = py + Math.sin(a) * rPx * squash;
      const x = px + (sx - px) * u;
      const y = (py - peakH) + (sy - (py - peakH)) * u;
      const g = Math.max(1.5, sc * 0.028);
      ctx.globalAlpha = 0.9 * out;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - g / 2, y - g / 2, g, g);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------- reaping_sweep
// melee_arc, 300 ms wire, range 2.3, arc ±1.3 — the reaver's harvest.

/**
 * REAPING_SWEEP — "the mown crescent."
 * GRAMMAR REFUSAL on the metal: the reaver's steel is its own. The
 * wire is 300 ms, so the paint is one violent present tense and the
 * ground carries the memory: the blade drags a burnished SWEPT BAND
 * through the crescent (the mown area filling in behind the live
 * edge), and as the edge passes each span of the arc, cut stubble
 * lies down there — pairs of dark grain ticks appearing IN SEQUENCE
 * behind the swing, seven seconds of mown field. Two seeded stones
 * strike sparks on the way through. At the follow-through the tip
 * flings a red thread: three droplets land past the rim. Behind the
 * reaver was the safe ground; the stubble now proves it.
 */
const reaping_sweep: AbilitySig = {
  spawn(c) {
    // Tip sparks at the set: the reaver's own steel flecks.
    const rand = srand(c.seed ^ 0x5b1);
    for (let k = 0; k < 4; k++) {
      const a = c.dir - 0.5 + rand();
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85 * c.squash,
        1, [c.st.core, c.st.spark],
        { speed: 1.6, life: 0.3, size: 0.05, gravity: 2, dir: a, spread: 0.5, shape: 'glint' });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0x5b2);
    const halfArc = 1.3;
    const a0 = dir - halfArc;
    const prog = cl(t / 0.6);
    const sweepA = a0 + halfArc * 2 * prog;
    const prevProg = cl((t - (c.frameDt * 1000) / 300) / 0.6);
    const prevSweepA = a0 + halfArc * 2 * prevProg;
    const fade = 1 - cl((t - 0.6) / 0.4);
    ctx.save();
    // THE MOWN BAND: the swept area fills in behind the live edge as
    // a hard burnished annulus — the area the steel owns.
    if (prog > 0.02) {
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = '#4a4428';
      ctx.beginPath();
      ctx.ellipse(px, py, rPx, rPx * squash, 0, a0, sweepA);
      ctx.ellipse(px, py, rPx * 0.42, rPx * 0.42 * squash, 0, sweepA, a0, true);
      ctx.fill();
      ctx.globalAlpha = 0.35 * fade;
      ctx.fillStyle = '#5c5432';
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.8, rPx * 0.8 * squash, 0, a0, sweepA);
      ctx.ellipse(px, py, rPx * 0.55, rPx * 0.55 * squash, 0, sweepA, a0, true);
      ctx.fill();
    }
    // THE LIVE EDGE: a heavy three-tone blade crescent at the sweep
    // angle, white lead, dark wake — one present-tense edge, no train.
    if (prog < 1) {
      for (const [rk, color, w, aOff] of [
        [0.98, '#241c0c', 0.14, -0.3],
        [0.92, st.mid, 0.085, -0.14],
        [1.02, '#ffffff', 0.04, 0],
      ] as const) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, sc * w);
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * rk, rPx * rk * squash, 0, sweepA + aOff - 0.45, sweepA + aOff + 0.04);
        ctx.stroke();
      }
      // The tip glint riding the edge.
      const tx = px + Math.cos(sweepA) * rPx * 1.02;
      const ty = py + Math.sin(sweepA) * rPx * 1.02 * squash;
      const g = Math.max(2.5, sc * 0.065);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx - g / 2, ty - g / 2, g, g);
    }
    // STUBBLE: as the edge passes each of 8 stations, that span of
    // the field is mown — two dark grain ticks lie down, and stay.
    for (let k = 0; k < 8; k++) {
      const stA = a0 + ((k + 0.5) / 8) * halfArc * 2;
      if (prevSweepA < stA && sweepA >= stA) {
        for (let s = 0; s < 3; s++) {
          const rr = c.radius * (0.55 + rand() * 0.35);
          lay(c, c.wx + Math.cos(stA + (rand() - 0.5) * 0.15) * rr,
            c.wy + Math.sin(stA + (rand() - 0.5) * 0.15) * rr * squash,
            '#4a4428', { life: 6.5 + rand(), size: 0.06, fade: '#33301c', fadeAt: 0.5 });
        }
        // Two seeded stations hide stones: the steel finds them.
        if (k === 2 || k === 5) {
          c.particles.burst(
            c.wx + Math.cos(stA) * c.radius * 0.75, c.wy + Math.sin(stA) * c.radius * 0.75 * squash,
            3, [st.core, st.spark, '#ffffff'],
            { speed: 1.4, life: 0.4, size: 0.045, gravity: 3, shape: 'glint',
              z: 0.1, vz: 1.2, zg: 4, land: 'die' });
        }
      }
    }
    // THE FOLLOW-THROUGH: at the end of the arc the tip flings its
    // red thread — three droplets land past the rim, the bleed
    // promised in the only red this art will show you.
    if (crossed(c, 300, 0.6)) {
      const endA = a0 + halfArc * 2;
      blood.deployments.drip!(asMatter(c),
        c.wx + Math.cos(endA) * c.radius * 1.1, c.wy + Math.sin(endA) * c.radius * 1.1 * squash,
        { scale: 0.35 });
      for (let s = 0; s < 3; s++) {
        lay(c, c.wx + Math.cos(endA + 0.12 * s) * c.radius * (1.15 + s * 0.14),
          c.wy + Math.sin(endA + 0.12 * s) * c.radius * (1.15 + s * 0.14) * squash,
          '#8e2a20', { life: 6, size: 0.04, fade: '#421410', fadeAt: 0.5 });
      }
    }
    ctx.restore();
  },
  air(c) {
    // Cut stalks flip up along the edge's path and settle where they
    // fall — the harvest, on true height.
    if (c.t < 0.55 && Math.random() < c.frameDt * 26) {
      const halfArc = 1.3;
      const sweepA = c.dir - halfArc + halfArc * 2 * cl(c.t / 0.6);
      const rr = c.radius * (0.5 + Math.random() * 0.45);
      c.particles.burst(
        c.wx + Math.cos(sweepA) * rr, c.wy + Math.sin(sweepA) * rr * c.squash,
        1, ['#a89a58', '#786c3a'],
        { speed: 0.3, life: 2.4, size: 0.05, gravity: 0, shape: 'shard', spin: 8,
          z: 0.05, vz: 1.6, zg: 4.5, land: 'settle', layer: 'world' });
    }
  },
};

// ------------------------------------------------------ gnawed_mending
// self_buff, 750 ms wire — the troll knits, and you count the cost.

/**
 * GNAWED_MENDING — "the five stitches."
 * GRAMMAR REFUSAL: a working, not a blow — the growth is the
 * troll's own. The read is a LEDGER: a dark gash hangs open on the
 * troll's chest, and five green thread stitches yank it shut ONE PER
 * BEAT, each closing with a knot-pop and a white flash — you can
 * count, stitch by stitch, exactly how much health you just allowed.
 * Leaf litter spirals INTO the body (matter flowing inward means
 * interrupt it), the ground gives one root heartbeat, and every
 * stitch drops one spent leaf at the troll's feet: five leaves lying
 * seven seconds, the bill for standing there watching.
 */
const gnawed_mending: AbilitySig = {
  spawn(c) {
    // The intake: leaves converge on the wound from all around.
    c.particles.burst(c.wx, c.wy - 0.8, 7, ['#4c6a3a', '#33482a', c.st.mid], {
      speed: -1.2, life: 0.7, size: 0.06, gravity: -0.2, drag: 1.5, shape: 'shard',
      spin: 6, wobble: 1.4,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const out = 1 - cl((t - 0.8) / 0.2);
    ctx.save();
    // The root heartbeat: one bulge ring swelling out and settling —
    // a single pulse, not weather.
    const beatEnv = Math.sin(cl(t / 0.5) * Math.PI);
    const rr = sc * (0.4 + 0.35 * cl(t / 0.5));
    ctx.globalAlpha = 0.7 * beatEnv * out;
    ctx.strokeStyle = '#4c3a28';
    ctx.lineWidth = Math.max(3, sc * 0.09 * (1 - t * 0.4));
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.4 * beatEnv * out;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 1.06, rr * 1.06 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const out = 1 - cl((t - 0.85) / 0.15);
    const cy = py - sc * 0.95;
    // Five stitches, one per 150 ms beat.
    const stitches = Math.min(5, Math.floor(t * 750 / 150) + (t > 0.02 ? 1 : 0));
    const gashHalf = sc * 0.45;
    const openW = sc * 0.15 * (1 - stitches / 5 * 0.85);
    ctx.save();
    // THE GASH: a dark two-lobe lens lying diagonal on the chest,
    // its open width shrinking as the stitches take.
    ctx.globalAlpha = 0.9 * out;
    ctx.fillStyle = '#22180f';
    ctx.beginPath();
    ctx.moveTo(px - gashHalf, cy + gashHalf * 0.35);
    ctx.quadraticCurveTo(px, cy - openW, px + gashHalf, cy - gashHalf * 0.35);
    ctx.quadraticCurveTo(px, cy + openW, px - gashHalf, cy + gashHalf * 0.35);
    ctx.closePath();
    ctx.fill();
    // A raw inner lip while it still gapes.
    if (stitches < 5) {
      ctx.globalAlpha = 0.6 * out;
      ctx.strokeStyle = '#6a3626';
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(px - gashHalf * 0.7, cy + gashHalf * 0.24);
      ctx.quadraticCurveTo(px, cy - openW * 0.6, px + gashHalf * 0.7, cy - gashHalf * 0.24);
      ctx.stroke();
    }
    // THE STITCHES: green thread crosses, stations left → right, each
    // with a knot dot; the newest flashes white as it yanks tight.
    for (let s = 0; s < stitches; s++) {
      const u = (s + 0.5) / 5 - 0.5;
      const sx2 = px + u * gashHalf * 1.7;
      const sy2 = cy + u * gashHalf * 0.6;
      const l = sc * 0.13;
      const isNew = s === stitches - 1 && (t * 750) % 150 < 60;
      ctx.globalAlpha = 0.95 * out;
      ctx.strokeStyle = isNew ? '#ffffff' : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(sx2 - l * 0.8, sy2 - l);
      ctx.lineTo(sx2 + l * 0.8, sy2 + l);
      ctx.moveTo(sx2 + l * 0.8, sy2 - l);
      ctx.lineTo(sx2 - l * 0.8, sy2 + l);
      ctx.stroke();
      const g = Math.max(2, sc * 0.042);
      ctx.fillStyle = isNew ? '#ffffff' : '#33482a';
      ctx.fillRect(sx2 - g / 2, sy2 - g / 2, g, g);
    }
    ctx.restore();
    // Each stitch beat drops one spent leaf at the feet — the ledger.
    for (let s = 1; s <= 5; s++) {
      if (crossed(c, 750, s * 0.15 )) {
        const rand = srand(c.seed ^ (0x6c1 + s));
        const a = rand() * Math.PI * 2;
        lay(c, c.wx + Math.cos(a) * (0.25 + rand() * 0.25), c.wy + Math.sin(a) * (0.2 + rand() * 0.2),
          '#4c6a3a', { life: 7, size: 0.07, fade: '#33482a', fadeAt: 0.45 });
      }
    }
    c.glow(c.wx, c.wy - 0.8, 0.9, 0.22 * Math.sin(Math.min(1, t * 1.3) * Math.PI) * out);
  },
};

// ---------------------------------------------------- raise_the_fallen
// summon, 500 ms MOMENT — the aftermath persists on its own clocks.

/**
 * RAISE_THE_FALLEN — "the two graves open."
 * The chanter speaks and TWO burial mounds heave up at its flanks —
 * dark soil domes with cracked, foreshortened top planes — and burst
 * one after the other inside the wire's half second: a slam of true
 * dust and a fountain of bone chips on real height that rains back
 * and SETTLES. The skeletons walk out of these. The painted moment
 * is quick and violent by law (a summon is 500 ms flat); the memory
 * is long: each opened grave leaves a ring of soil clods and a
 * scatter of bone lying eight seconds. The voice that did it is
 * two fast arcs, caster to mound — sound made visible, then gone.
 */
/** The two graves' shared geometry — one salt, one call order. */
function graveAngles(c: SigCtx): [number, number] {
  const g = srand(c.seed ^ 0x7a1);
  const baseA = g() * Math.PI * 2;
  return [baseA + (g() - 0.5) * 0.5, baseA + Math.PI + (g() - 0.5) * 0.5];
}

const raise_the_fallen: AbilitySig = {
  spawn(c) {
    const angles = graveAngles(c);
    const rand = srand(c.seed ^ 0x7a2);
    // Two graves at the flanks: bone fountains + the lasting rings,
    // all seeded NOW — their clocks carry the rest.
    for (let k = 0; k < 2; k++) {
      const a = angles[k]!;
      const mx = c.wx + Math.cos(a) * 0.9;
      const my = c.wy + Math.sin(a) * 0.9 * c.squash;
      // Bone chips: up on true height, rattling back down to stay.
      c.particles.burst(mx, my, 9, ['#d8d4c8', '#b8b2a0', '#8a8478'], {
        speed: 0.35, life: 1.2, size: 0.065, gravity: 0, shape: 'shard', spin: 7,
        z: 0.05, vz: 2.1 + rand() * 0.5, zg: 4, land: 'settle', layer: 'world',
      });
      // The grave's rim: five soil clods in a ring, lying eight seconds.
      for (let s = 0; s < 5; s++) {
        const ca = (s / 5) * Math.PI * 2 + rand() * 0.3;
        lay(c, mx + Math.cos(ca) * 0.3, my + Math.sin(ca) * 0.3 * c.squash,
          '#3c2e1e', { life: 7.5 + rand() * 1.5, size: 0.075, fade: '#241a10', fadeAt: 0.5 });
      }
      // Three bone grains inside the ring — the floor of the grave.
      for (let s = 0; s < 3; s++) {
        lay(c, mx + (rand() - 0.5) * 0.4, my + (rand() - 0.5) * 0.3,
          '#d8d4c8', { life: 8.5 + rand(), size: 0.06, fade: '#8a8478', fadeAt: 0.6 });
      }
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const angles = graveAngles(c);
    ctx.save();
    for (let k = 0; k < 2; k++) {
      const a = angles[k]!;
      const mx = px + Math.cos(a) * sc * 0.9;
      const my = py + Math.sin(a) * sc * 0.9 * squash;
      // Mound k heaves 0→0.3 (k=0) / 0.2→0.5 (k=1), bursts at its beat.
      const heave = cl((t - k * 0.2) / 0.3);
      const burst = cl((t - 0.35 - k * 0.2) / 0.1);
      if (heave <= 0) continue;
      const mw = sc * 0.44;
      const mh = sc * 0.2 * heave * (1 - burst * 0.6);
      // The dome: dark soil with a foreshortened top plane.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#2c2014';
      ctx.beginPath();
      ctx.ellipse(mx, my - mh * 0.4, mw, mh + mw * 0.22 * squash, 0, Math.PI, Math.PI * 2);
      ctx.ellipse(mx, my, mw, mw * 0.22 * squash, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#5a4630';
      ctx.beginPath();
      ctx.ellipse(mx, my - mh, mw * 0.66, mw * 0.2 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The cracks: three widening dark seams across the top plane.
      const crack = cl((t - 0.15 - k * 0.2) / 0.2);
      if (crack > 0) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#16100a';
        ctx.lineWidth = Math.max(1.5, sc * 0.03 * (1 + crack));
        ctx.beginPath();
        for (let s = 0; s < 3; s++) {
          const ca2 = -0.6 + s * 0.55;
          ctx.moveTo(mx + Math.cos(ca2) * mw * 0.1, my - mh + Math.sin(ca2) * mw * 0.06);
          ctx.lineTo(mx + Math.cos(ca2) * mw * 0.6 * crack, my - mh + Math.sin(ca2) * mw * 0.18 * crack * squash);
        }
        ctx.stroke();
      }
      // The burst: the top blows and the true dust slams, once.
      if (crossed(c, 500, 0.35 + k * 0.2)) {
        dust.deployments.slam!(asMatter(c),
          c.wx + Math.cos(a) * 0.9, c.wy + Math.sin(a) * 0.9 * squash, { scale: 0.45 });
      }
      // Pale grave-breath: one thread off an opened mound.
      if (burst > 0 && Math.random() < c.frameDt * 8) {
        c.particles.burst(c.wx + Math.cos(a) * 0.9, c.wy + Math.sin(a) * 0.9 * squash - 0.2, 1,
          ['#b8c4d8'], { speed: 0.08, life: 1.6, size: 0.05, gravity: -0.12, drag: 1.6, shape: 'mote' });
      }
    }
    // THE VOICE: two fast arcs, caster toward each mound, gone by 0.3.
    const voice = cl(t / 0.28);
    if (voice < 1) {
      for (let k = 0; k < 2; k++) {
        const a = angles[k]!;
        const rr = sc * 0.9 * voice;
        ctx.globalAlpha = 0.9 * (1 - voice);
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(2, sc * 0.05);
        ctx.beginPath();
        ctx.ellipse(px, py, rr, rr * squash, 0, a - 0.4, a + 0.4);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 1.1, 0.2 * (1 - t));
  },
};

// -------------------------------------------------------- marrow_chill
// nova, 680 ms wire, radius 2.4 — the champion plants its blade.

/**
 * MARROW_CHILL — "the ribcage ring."
 * The crypt's chest closes over the circle: from the planted blade,
 * five PAIRS of curved ice ribs erupt at the rim and vault up and
 * inward — a half-buried ribcage the size of the nova, each rib a
 * two-facet crystal blade rising base to tip. Then, in sequence,
 * every rib SHATTERS into true frost, and where each one stood its
 * footprint stays: paired hoar lines raying from the rim, eight
 * seconds of skeleton on the ground, with a white blade-plant scar
 * winking at the heart for nine. The cold is architecture; you were
 * inside its chest.
 */
const marrow_chill: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    frost.deployments.bloom!(m, c.wx, c.wy, { radius: c.radius * 0.6, scale: 0.6 });
    // The blade-plant scar: a white cluster at the heart, one winking.
    const rand = srand(c.seed ^ 0x8b1);
    for (let k = 0; k < 4; k++) {
      lay(c, c.wx + (rand() - 0.5) * 0.25, c.wy + (rand() - 0.5) * 0.2, '#e8f4fa', {
        life: 8.5 + rand(), size: 0.06, fade: '#8ac4e8', fadeAt: 0.55,
        flicker: k === 0 ? 6 : 0,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // The rime front: one quick racing ring — brief, then the ribs own
    // the read.
    const f = cl(t / 0.16);
    if (f < 1) {
      const rr = rPx * (0.15 + 0.85 * f);
      ctx.globalAlpha = 0.85 * (1 - f * 0.5);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.09 * (1 - f * 0.4));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.04, rr * 1.04 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The rimed floor while the cage stands.
    const rimed = cl((t - 0.12) / 0.15);
    const fade = 1 - cl((t - 0.78) / 0.22);
    if (rimed > 0) {
      ctx.globalAlpha = 0.18 * rimed * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.9, rPx * 0.9 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x8b2);
    const layR = srand(c.seed ^ 0x8b3);
    ctx.save();
    // Four rib pairs erupt around the rim and vault inward-and-up;
    // each shatters on its own beat. Geometry precomputed FIRST so no
    // beat branch ever shifts a later rib's bones.
    const ribs: Array<[number, number]> = [];
    for (let k = 0; k < 8; k++) {
      const pair = Math.floor(k / 2);
      const side = k % 2 === 0 ? 1 : -1;
      ribs.push([
        (pair / 4) * Math.PI * 2 + rand() * 0.15 + side * 0.2,
        sc * (0.65 + rand() * 0.15),
      ]);
    }
    for (let k = 0; k < 8; k++) {
      const pair = Math.floor(k / 2);
      const [a, lift] = ribs[k]!;
      const rise = cl((t - 0.1 - pair * 0.06) / 0.22);
      const popAt = 0.52 + pair * 0.08;
      const gone = t >= popAt;
      if (rise <= 0) continue;
      const bx = px + Math.cos(a) * rPx * 0.95;
      const by = py + Math.sin(a) * rPx * 0.95 * squash;
      // The vault: base at the rim, tip curving toward the heart,
      // lifted — a quadratic rib drawn base → tip by the rise clock.
      const tipX = px + Math.cos(a) * rPx * 0.3;
      const tipY = py + Math.sin(a) * rPx * 0.3 * squash - lift * 0.3;
      const cx2 = (bx + tipX) / 2;
      const cy2 = (by + tipY) / 2 - lift * 1.05;
      if (!gone) {
        // Two facets: a wide deep stroke under, a narrower lit stroke
        // over, and a white crest tick at the live tip. A grown rib is
        // ONE quadratic per facet; only a rising rib subdivides.
        for (const [color, w, off] of [
          [st.deep, 0.115, 0],
          [st.mid, 0.055, -1.6],
        ] as const) {
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1.5, sc * w);
          ctx.beginPath();
          ctx.moveTo(bx, by + off);
          if (rise >= 1) {
            ctx.quadraticCurveTo(cx2, cy2 + off, tipX, tipY + off);
          } else {
            for (let s = 1; s <= 4; s++) {
              const u = (s / 4) * rise;
              const omu = 1 - u;
              ctx.lineTo(
                omu * omu * bx + 2 * omu * u * cx2 + u * u * tipX,
                omu * omu * by + 2 * omu * u * cy2 + u * u * tipY + off,
              );
            }
          }
          ctx.stroke();
        }
        const u = rise;
        const omu = 1 - u;
        const hx = omu * omu * bx + 2 * omu * u * cx2 + u * u * tipX;
        const hy = omu * omu * by + 2 * omu * u * cy2 + u * u * tipY;
        const g = Math.max(2, sc * 0.05);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - g / 2, hy - g, g, g * 1.8);
      }
      // The shatter beat: true frost at the base, the footprint laid.
      if (crossed(c, 680, popAt)) {
        frost.deployments.shatter!(asMatter(c),
          c.wx + Math.cos(a) * c.radius * 0.95, c.wy + Math.sin(a) * c.radius * 0.95 * squash,
          { scale: 0.3 });
        for (let s = 0; s < 2; s++) {
          const su = 0.95 - s * 0.18;
          lay(c, c.wx + Math.cos(a) * c.radius * su, c.wy + Math.sin(a) * c.radius * su * squash,
            '#e8f4fa', { life: 7.5 + layR(), size: 0.065, fade: '#8ac4e8', fadeAt: 0.5 });
        }
      }
    }
    ctx.restore();
    // The cold sinks once the cage is down.
    if (crossed(c, 680, 0.62)) {
      frost.deployments.fog!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.35 });
    }
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.2 * (1 - t));
  },
};

// ------------------------------------------------------- rending_lunge
// dash_strike, 380 ms wire, x→x2 — the packlord goes through you.

/**
 * RENDING_LUNGE — "the peeled road."
 * The dash tears the ground's skin off in one strip: a ragged dark
 * tear rips open along the path with sod curls flipped to both
 * sides, the packlord itself a low hackled blur at the head of the
 * tear. At the terminus the bite is an X — two crossing white
 * slashes snapping shut — with true blood thrown FORWARD past it,
 * and then the proof: the beast lands BEYOND you, and two four-toed
 * paw prints stamp into the ground past the terminus, lying nine
 * seconds. It came through you; the prints on the far side say so.
 */
const rending_lunge: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The earth pays at launch and landing; the bite pays in blood.
    dust.deployments.gouge!(m, c.wx, c.wy, { scale: 0.35 });
    dust.deployments.slam!(m, c.wx2 + Math.cos(ang) * 0.5, c.wy2 + Math.sin(ang) * 0.5 * c.squash,
      { scale: 0.4 });
    blood.deployments.spatter!(m, c.wx2, c.wy2, { scale: 0.55 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x9c1);
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const wAng = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    const fade = 1 - cl((t - 0.6) / 0.4);
    const tear = cl(t / 0.22);
    ctx.save();
    // THE TEAR: one ragged dark strip ripping open along the path —
    // jagged both edges, filled, with a lit lip on the near side.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = '#261c10';
    ctx.beginPath();
    const seg = 6;
    for (let s = 0; s <= seg; s++) {
      const u = (s / seg) * tear;
      const jag = (rand() - 0.5) * sc * 0.07;
      ctx.lineTo(px + dx * u + nx * (sc * 0.12 + jag), py + dy * u + ny * (sc * 0.12 + jag));
    }
    for (let s = seg; s >= 0; s--) {
      const u = (s / seg) * tear;
      const jag = (rand() - 0.5) * sc * 0.07;
      ctx.lineTo(px + dx * u - nx * (sc * 0.12 + jag), py + dy * u - ny * (sc * 0.12 + jag));
    }
    ctx.closePath();
    ctx.fill();
    // SOD CURLS: rolled commas flipped alternately to each side — the
    // peeled skin of the road, sitting on the tear's lips.
    for (let s = 0; s < 5; s++) {
      const u = (0.12 + s * 0.19) ;
      if (u > tear) break;
      const side = s % 2 === 0 ? 1 : -1;
      const cx2 = px + dx * u + nx * side * sc * 0.16;
      const cy2 = py + dy * u + ny * side * sc * 0.16;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = '#4a3a22';
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.arc(cx2, cy2, sc * 0.07, Math.PI * 0.2 * side, Math.PI * (1.3 * side), side < 0);
      ctx.stroke();
      ctx.strokeStyle = '#6a5a38';
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.arc(cx2, cy2, sc * 0.045, Math.PI * 0.2 * side, Math.PI * (1.1 * side), side < 0);
      ctx.stroke();
    }
    // Tear complete: the edges keep the memory as grains, once.
    if (crossed(c, 380, 0.22)) {
      for (let s = 0; s < 4; s++) {
        const u = 0.15 + s * 0.23;
        const side = s % 2 === 0 ? 1 : -1;
        lay(c, c.wx + (c.wx2 - c.wx) * u + Math.cos(wAng + Math.PI / 2) * side * 0.14,
          c.wy + (c.wy2 - c.wy) * u + Math.sin(wAng + Math.PI / 2) * side * 0.14,
          '#33291a', { life: 7 + rand(), size: 0.055, fade: '#211a0e', fadeAt: 0.5 });
      }
    }
    // THE PRINTS PAST YOU: two paw prints stamped beyond the terminus,
    // pad + three toes each, nine seconds of proof.
    if (crossed(c, 380, 0.45)) {
      for (let p = 0; p < 2; p++) {
        const pOff = 0.55 + p * 0.45;
        const side = p === 0 ? 0.18 : -0.18;
        const pxw = c.wx2 + Math.cos(wAng) * pOff + Math.cos(wAng + Math.PI / 2) * side;
        const pyw = c.wy2 + Math.sin(wAng) * pOff + Math.sin(wAng + Math.PI / 2) * side;
        lay(c, pxw, pyw, '#2c2418', { life: 9, size: 0.085, fade: '#1c160e', fadeAt: 0.6 });
        for (let toe = -1; toe <= 1; toe++) {
          lay(c, pxw + Math.cos(wAng + toe * 0.5) * 0.12, pyw + Math.sin(wAng + toe * 0.5) * 0.12,
            '#2c2418', { life: 8.5, size: 0.045, fade: '#1c160e', fadeAt: 0.6 });
        }
      }
    }
    ctx.restore();
    void st;
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const ang = Math.atan2(dy, dx);
    ctx.save();
    // THE BLUR: a low stretched silhouette with hackle spikes at the
    // head of the tear — present tense only, gone at the bite.
    const run = cl(t / 0.26);
    if (run < 1) {
      const hx = px + dx * run;
      const hy = py + dy * run - sc * 0.16;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#3a3026';
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, sc * 0.38, sc * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hackles: three raised spikes along the spine.
      ctx.strokeStyle = '#4e4232';
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      for (let s = 0; s < 3; s++) {
        const sx2 = -sc * 0.2 + s * sc * 0.14;
        ctx.moveTo(sx2, -sc * 0.08);
        ctx.lineTo(sx2 + sc * 0.04, -sc * 0.2);
      }
      ctx.stroke();
      ctx.restore();
      // Fur shed off the blur.
      if (Math.random() < c.frameDt * 20) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * run, c.wy + (c.wy2 - c.wy) * run, 1,
          ['#7f6d4c', '#4e463c'],
          { speed: 0.5, life: 0.5, size: 0.05, gravity: 1.2, shape: 'mote', wobble: 1.2 });
      }
    }
    // THE BITE: an X of two white slashes snapping shut at the
    // terminus — crossed, not curved; a jaw is a scissor.
    const snap = cl((t - 0.28) / 0.09);
    const gone = cl((t - 0.52) / 0.15);
    if (snap > 0 && gone < 1) {
      const l = sc * 0.42;
      const gap = (1 - snap) * sc * 0.24;
      ctx.globalAlpha = 0.95 * (1 - gone);
      ctx.lineCap = 'round';
      for (const side of [-1, 1] as const) {
        ctx.strokeStyle = side < 0 ? '#ffffff' : st.core;
        ctx.lineWidth = Math.max(3, sc * 0.075);
        ctx.beginPath();
        ctx.moveTo(px2 - l + gap * side * 0.3, py2 - l * side - gap * side);
        ctx.lineTo(px2 + l - gap * side * 0.3, py2 + l * side - gap * side);
        ctx.stroke();
      }
      // Two teeth ticks off the upper blade.
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      for (const u of [-0.4, 0.35]) {
        ctx.moveTo(px2 + l * u, py2 + l * u - sc * 0.02);
        ctx.lineTo(px2 + l * u + sc * 0.05, py2 + l * u + sc * 0.07);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ shrilling_dart
// dash_strike, 380 ms wire — the bat's whole art, small on purpose.

/**
 * SHRILLING_DART — "the brake-flare."
 * The scream travels as a CONE: three nested arc-slices sweep the
 * flight line ahead of the bat like a megaphone's mouth, shivering
 * at shriek frequency. The bat itself is a folded dart — a diamond
 * on a hairline wake — until the terminus, where the wings SNAP OPEN
 * as a brake: two translucent membrane fans with drawn finger-bones,
 * flared for a tenth of a second, then folded and gone. Two faint
 * echo arcs ripple BACKWARD from where it braked. The wound is one
 * honest drip and a pair of hairline scratches lying five seconds:
 * the smallest lasting mark in the bestiary, at the exact scale of
 * the smallest foe that leaves one.
 */
const shrilling_dart: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The nick: the smallest honest blood in the game.
    blood.deployments.drip!(m, c.wx2, c.wy2, { scale: 0.3 });
    // Two hairline scratches — small, and still the ground remembers.
    const rand = srand(c.seed ^ 0xad1);
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    for (let k = 0; k < 2; k++) {
      lay(c, c.wx2 + Math.cos(ang) * (0.15 + k * 0.14) + (rand() - 0.5) * 0.1,
        c.wy2 + Math.sin(ang) * (0.15 + k * 0.14),
        '#8a7458', { life: 5, size: 0.03, fade: '#5a4c3a', fadeAt: 0.5 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const ang = Math.atan2(dy, dx);
    const lift = sc * 0.5;
    ctx.save();
    // THE SCREAM CONE: three nested arc-slices ahead of the dart,
    // facing forward, shivering at shriek frequency (now/40).
    const prog = cl(t / 0.3);
    if (prog < 1) {
      const hx = px + dx * prog;
      const hy = py + dy * prog - lift;
      const shiver = 1 + 0.12 * Math.sin(c.now / 40);
      for (let k = 0; k < 3; k++) {
        const rr = sc * (0.2 + k * 0.14) * shiver;
        const ahead = sc * (0.15 + k * 0.16);
        ctx.globalAlpha = 0.8 - k * 0.2;
        ctx.strokeStyle = k === 0 ? '#ffffff' : st.mid;
        ctx.lineWidth = Math.max(1.5, sc * (0.045 - k * 0.01));
        ctx.beginPath();
        ctx.arc(hx + Math.cos(ang) * ahead, hy + Math.sin(ang) * ahead, rr, ang - 0.55, ang + 0.55);
        ctx.stroke();
      }
      // THE FOLDED DART: a diamond on a hairline wake.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#241a2e';
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      const s = sc * 0.16;
      ctx.beginPath();
      ctx.moveTo(s * 1.5, 0);
      ctx.lineTo(0, -s * 0.6);
      ctx.lineTo(-s * 1.1, 0);
      ctx.lineTo(0, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(px + dx * Math.max(0, prog - 0.25), py + dy * Math.max(0, prog - 0.25) - lift);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }
    // THE BRAKE-FLARE: wings snap open at the terminus — membrane
    // fans with three finger-bones each, flared 100 ms, then gone.
    const flare = cl((t - 0.3) / 0.08);
    const foldAway = cl((t - 0.48) / 0.12);
    if (flare > 0 && foldAway < 1) {
      const wx3 = px2;
      const wy3 = py2 - lift;
      for (const side of [-1, 1] as const) {
        const baseA = ang + Math.PI + side * 0.9;
        const span = 1.15 * flare * (1 - foldAway);
        // Membrane: a fan polygon swept behind the body.
        ctx.globalAlpha = 0.65 * (1 - foldAway);
        ctx.fillStyle = '#463556';
        ctx.beginPath();
        ctx.moveTo(wx3, wy3);
        for (let f = 0; f <= 3; f++) {
          const fa = baseA + side * span * (f / 3 - 0.5);
          const fl = sc * (0.46 + 0.1 * (f === 1 || f === 2 ? 1 : 0));
          ctx.lineTo(wx3 + Math.cos(fa) * fl, wy3 + Math.sin(fa) * fl);
        }
        ctx.closePath();
        ctx.fill();
        // Finger-bones: three hard rays through the membrane.
        ctx.globalAlpha = 0.9 * (1 - foldAway);
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1.5, sc * 0.032);
        ctx.beginPath();
        for (let f = 0; f <= 2; f++) {
          const fa = baseA + side * span * (f / 2 - 0.5) ;
          const fl = sc * (0.44 + 0.1 * (f === 1 ? 1 : 0));
          ctx.moveTo(wx3, wy3);
          ctx.lineTo(wx3 + Math.cos(fa) * fl, wy3 + Math.sin(fa) * fl);
        }
        ctx.stroke();
      }
    }
    // THE ECHO: two faint arcs rippling BACKWARD from the brake point.
    for (let k = 0; k < 2; k++) {
      const eu = cl((t - 0.5 - k * 0.12) / 0.35);
      if (eu <= 0 || eu >= 1) continue;
      const rr = sc * (0.2 + eu * 0.5);
      ctx.globalAlpha = 0.65 * (1 - eu);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.arc(px2, py2 - lift, rr, ang + Math.PI - 0.5, ang + Math.PI + 0.5);
      ctx.stroke();
    }
    ctx.restore();
    // Wing-dust: two smudges where it braked, small and brief.
    if (crossed(c, 380, 0.38)) {
      const rand = srand(c.seed ^ 0xad2);
      for (let k = 0; k < 2; k++) {
        lay(c, c.wx2 + (rand() - 0.5) * 0.3, c.wy2 + (rand() - 0.5) * 0.2,
          '#4a3c30', { life: 5, size: 0.04, fade: '#33281e', fadeAt: 0.5 });
      }
    }
  },
};

// ----------------------------------------------------- breakwater_grip
// melee_arc, range 1.7, arc 0.9 — the giant crab's clamp.

/**
 * BREAKWATER_GRIP — "the harbor closes."
 * The read is a BITE at field scale: from the two ends of the
 * crescent, a pair of heavy keratin jaws sweep toward the facing
 * line while the tide inside the arc pulls dark and taut. They meet
 * at the mid-line in one white CLAP — cold spray thrown true-height
 * off the pinch — and where they closed, the crushed band stays:
 * paired jaw-print curves of wet brine grains lying on the bank six
 * to eight seconds after the claw has let go. Flank the crescent or
 * be the thing between the jaws.
 */
const breakwater_grip: AbilitySig = {
  spawn(c) {
    // The tide gathers at both jaw roots — churn spray at the hinges.
    const m = asMatter(c);
    const a0 = c.dir - 0.9;
    const a1 = c.dir + 0.9;
    for (const a of [a0, a1]) {
      water.deployments.spray!(m, c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * c.squash, {
        dir: a + Math.PI,
        scale: 0.4,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const halfArc = 0.9;
    const a0 = dir - halfArc;
    const a1 = dir + halfArc;
    // The jaws close through the wire's first 0.45; then the pinch
    // holds and the water runs out of it.
    const close = cl(t / 0.45);
    const fade = 1 - cl((t - 0.7) / 0.3);
    ctx.save();
    // THE DARK TIDE: the arc's floor pulls wet and taut as the jaws
    // come — deepest right before the clap.
    ctx.globalAlpha = 0.34 * fade * (0.4 + 0.6 * close);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx, rPx * squash, 0, a0, a1);
    ctx.ellipse(px, py, rPx * 0.3, rPx * 0.3 * squash, 0, a1, a0, true);
    ctx.fill();
    // THE TWO JAWS: heavy pale crescents sweeping from the ends
    // toward the facing line, each a keratin edge over a dark wake.
    if (close < 1) {
      for (const side of [-1, 1] as const) {
        const jawA = dir + side * halfArc * (1 - close);
        for (const [rk, color, w] of [
          [0.96, '#1c2a24', 0.13],
          [0.9, st.mid, 0.08],
          [1.0, c.st.spark, 0.038],
        ] as const) {
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1.5, sc * w);
          ctx.beginPath();
          ctx.ellipse(
            px, py, rPx * rk, rPx * rk * squash, 0,
            jawA - side * 0.34, jawA + side * 0.06, side < 0,
          );
          ctx.stroke();
        }
        // The jaw's leading tooth — a bright tip riding each edge in.
        const tx = px + Math.cos(jawA) * rPx * 0.98;
        const ty = py + Math.sin(jawA) * rPx * 0.98 * squash;
        const g = Math.max(2, sc * 0.055);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx - g / 2, ty - g / 2, g, g);
      }
    } else {
      // THE HELD PINCH: one hard line down the facing — the grip that
      // is still happening to whatever it caught.
      const hold = 1 - cl((t - 0.45) / 0.5);
      ctx.globalAlpha = 0.85 * hold;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.07 * hold);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(dir) * rPx * 0.3, py + Math.sin(dir) * rPx * 0.3 * squash);
      ctx.lineTo(px + Math.cos(dir) * rPx * 1.02, py + Math.sin(dir) * rPx * 1.02 * squash);
      ctx.stroke();
    }
    ctx.restore();
    // THE CLAP: the meet — cold spray true-height off the pinch, and
    // the lasting jaw prints laid along both closed crescents.
    if (crossed(c, 700, 0.45)) {
      const m = asMatter(c);
      const mx = c.wx + Math.cos(dir) * c.radius * 0.75;
      const my = c.wy + Math.sin(dir) * c.radius * 0.75 * squash;
      water.deployments.splash!(m, mx, my, { scale: 0.75 });
      frost.deployments.bloom!(m, mx, my, { radius: c.radius * 0.35, scale: 0.4 });
      const rand = srand(c.seed ^ 0x9c1);
      for (const side of [-1, 1] as const) {
        for (let k = 0; k < 4; k++) {
          const a = dir + side * (0.1 + k * 0.16);
          const rr = c.radius * (0.9 + (rand() - 0.5) * 0.12);
          lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * squash, '#9fc4b5', {
            life: 6 + rand() * 2, size: 0.055, fade: '#48685c', fadeAt: 0.5,
            flicker: k === 1 ? 4 : 0,
          });
        }
      }
    }
  },
};

// --------------------------------------------------------- shoal_call
// ground_aoe (self-staked, r 3.2) — the deepking's croak.

/**
 * SHOAL_CALL — "the bank answers."
 * The read is a VOICE, not a spell: gurgle rings leave the throat in
 * stuttered PAIRS (glub-GLUB — the cackle's ugly cousin gone
 * underwater), wobbling out to the ring's edge as living water
 * circles. When the word lands the pool claps — spray true-height at
 * the king — and the RIM ANSWERS: small fin-blades stand up around
 * the circle in a ragged salute and fold away again, because the
 * call was never about the water. It was about who is in it.
 */
const shoal_call: AbilitySig = {
  spawn(c) {
    // The throat fills: churn at the king's feet before the word.
    const m = asMatter(c);
    water.deployments.churn!(m, c.wx, c.wy, { radius: c.radius * 0.35, scale: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // THE GURGLE PAIRS: rings leave in twos — a short beat inside
    // each pair, a long beat between pairs. Never a steady pulse;
    // a croak has a rhythm and the rhythm is ugly.
    const PAIRS: ReadonlyArray<readonly [number, number]> = [
      [0.0, 0.09],
      [0.3, 0.39],
      [0.6, 0.69],
    ];
    for (const [pa, pb] of PAIRS) {
      for (const start of [pa, pb]) {
        const u = cl((t - start) / 0.42);
        if (u <= 0 || u >= 1) continue;
        // The wobble: a ring of water is never a compass circle.
        const wob = 1 + 0.05 * Math.sin(c.now / 55 + start * 40);
        const rr = rPx * (0.16 + u * 0.84) * wob;
        ctx.globalAlpha = 0.7 * (1 - u);
        ctx.strokeStyle = u < 0.25 ? '#ffffff' : st.mid;
        ctx.lineWidth = Math.max(1.5, sc * (0.05 - u * 0.02));
        ctx.beginPath();
        ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // THE RIM ANSWER: fin-blades stand up around the circle in a
    // ragged stagger and fold away — the shoal, saluting its king.
    const ans = cl((t - 0.45) / 0.5);
    if (ans > 0) {
      const rand = srand(c.seed ^ 0x5ca11);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + (rand() - 0.5) * 0.5;
        const stag = rand() * 0.35;
        const rise = cl((ans - stag) / 0.25);
        const fold = cl((ans - stag - 0.5) / 0.25);
        if (rise <= 0 || fold >= 1) continue;
        const fh = sc * (0.14 + rand() * 0.07) * rise * (1 - fold);
        const bx = px + Math.cos(a) * rPx * 0.97;
        const by = py + Math.sin(a) * rPx * 0.97 * squash;
        const bw = sc * 0.055;
        ctx.globalAlpha = 0.85 * (1 - fold);
        ctx.fillStyle = st.deep;
        ctx.beginPath();
        ctx.moveTo(bx - bw, by);
        // The blade rakes AFT (screen-right of its own rise) — a fin,
        // never a candle flame.
        ctx.quadraticCurveTo(bx - bw * 0.2, by - fh, bx + bw * 1.3, by - fh * 0.72);
        ctx.lineTo(bx + bw, by);
        ctx.closePath();
        ctx.fill();
        // One pale ray through the membrane.
        ctx.globalAlpha = 0.7 * (1 - fold);
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1, sc * 0.018);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + bw * 0.3, by - fh * 0.85);
        ctx.stroke();
      }
    }
    ctx.restore();
    // THE WORD LANDS: the pool claps at the throat, and wet brine
    // grains lie where the croak rolled over.
    if (crossed(c, 600, 0.45)) {
      const m = asMatter(c);
      water.deployments.splash!(m, c.wx, c.wy, { scale: 0.6 });
      const rand = srand(c.seed ^ 0x5ca);
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const rr = c.radius * (0.3 + rand() * 0.6);
        lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, '#9fc4b5', {
          life: 4 + rand() * 2,
          size: 0.045,
          fade: '#48685c',
          fadeAt: 0.5,
        });
      }
    }
  },
};

// ------------------------------------------------------- warlord_horn
// ground_aoe (self-staked, r 3.2) — the hobgoblin warlord's order.

/**
 * WARLORD_HORN — "it is not a request."
 * The deliberate INVERSION of the shoal's croak: where the skral's
 * word gurgles out in ragged stuttered pairs and the rim answers in a
 * ragged salute, the horn holds ONE long note — evenly-timed brass
 * rings, compass-true (a drilled note has no wobble) — and THE RIM
 * ANSWERS ON THE COUNT: spear-tips stand up around the circle all
 * together, evenly spaced, and ground in unison. A legion never
 * straggles, and its weather doesn't either. When the note lands the
 * ground takes the STAMP — one boot-fall of dust from a thousand
 * remembered drills — and iron grains lie where the order rolled.
 */
const warlord_horn: AbilitySig = {
  spawn(c) {
    // The breath drawn: dust shivers at the warlord's planted feet.
    const m = asMatter(c);
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: c.radius * 0.4, scale: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // THE ONE NOTE: rings leave on a steady count — no pairs, no
    // wobble. The evenness IS the voice: this sound was drilled.
    for (const start of [0, 0.18, 0.36, 0.54] as const) {
      const u = cl((t - start) / 0.4);
      if (u <= 0 || u >= 1) continue;
      const rr = rPx * (0.14 + u * 0.86);
      ctx.globalAlpha = 0.65 * (1 - u);
      ctx.strokeStyle = u < 0.2 ? '#ffffff' : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * (0.045 - u * 0.018));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE RIM ANSWERS ON THE COUNT: twelve spear-tips rise together,
    // evenly spaced — leaf-head over a straight shaft stub — hold one
    // beat, and ground again in unison.
    const ans = cl((t - 0.42) / 0.52);
    if (ans > 0) {
      const rand = srand(c.seed ^ 0x1e610);
      const rise = cl(ans / 0.22);
      const fold = cl((ans - 0.7) / 0.28);
      for (let k = 0; k < 12; k++) {
        // Even spacing, one shared clock: the drill, not the shoal.
        const a = (k / 12) * Math.PI * 2 + 0.13;
        if (rise <= 0 || fold >= 1) continue;
        const sh = sc * (0.16 + rand() * 0.02) * rise * (1 - fold);
        const bx = px + Math.cos(a) * rPx * 0.97;
        const by = py + Math.sin(a) * rPx * 0.97 * squash;
        ctx.globalAlpha = 0.9 * (1 - fold);
        // The shaft: one straight stroke — nothing in a legion rakes.
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by - sh);
        ctx.stroke();
        // The leaf head, bright edge up.
        const hw2 = sc * 0.026;
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        ctx.moveTo(bx - hw2, by - sh);
        ctx.lineTo(bx, by - sh - hw2 * 2.4);
        ctx.lineTo(bx + hw2, by - sh);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // THE STAMP: the note lands as one boot-fall — dust claps out
    // and iron grains lie in a broken ring where the order rolled.
    if (crossed(c, 600, 0.42)) {
      const m = asMatter(c);
      dust.deployments.billow!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.5 });
      const rand = srand(c.seed ^ 0x1e6);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rand() * 0.3;
        const rr = c.radius * (0.55 + rand() * 0.4);
        lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, '#b8a06a', {
          life: 5 + rand() * 2,
          size: 0.045,
          fade: '#6a5a34',
          fadeAt: 0.5,
        });
      }
    }
  },
};

// --------------------------------------------------- drowning_surge
// ground_field (r 2.6, ~4.5 s) — the tidelord stakes a flood on
// your stride; standing in it is agreeing to go under.

/**
 * DROWNING_SURGE — "the pool that pulls."
 * Every hazard ring in the game announces itself OUTWARD; the
 * drowning pool is the one read that runs the other way. Rings are
 * born at the rim and CONTRACT to the heart on the field's own pulse
 * clock, brightening as they go under — the surface swallowing.
 * Between them, six curved drag-hooks crawl a slow rotation (the
 * current's fingers), and seeded bubble stations blink white where
 * the drowned air gets out. Each server pulse hauls a real undertow
 * through the matter library, and when the pool finally lets the
 * bank go it leaves a broken ring of sodden grains and one dark
 * blotch where the deepest of it stood.
 */
const drowning_surge: AbilitySig = {
  spawn(c) {
    // The flood arrives already pulling: an undertow, not a splash.
    const m = asMatter(c);
    water.deployments.undertow!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.7 });
    water.deployments.splash!(m, c.wx, c.wy, { scale: 0.45 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, age, now } = c;
    const wireMs = (c.ticks ?? 90) * 50;
    const fade = Math.min(cl(age / 300), cl((wireMs - age) / 450));
    ctx.save();
    // THE INDRAWN RINGS: born at the rim on the pulse clock, dying
    // at the heart — each one brighter the deeper it goes.
    for (let i = 0; i < 5; i++) {
      const u = (age - 250 - i * 1000) / 650;
      if (u <= 0 || u >= 1) continue;
      const rr = rPx * (1 - u * 0.92);
      ctx.globalAlpha = (0.32 + 0.6 * u) * fade;
      ctx.strokeStyle = u < 0.72 ? st.mid : st.core;
      ctx.lineWidth = Math.max(2, sc * (0.04 + u * 0.035));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE DRAG HOOKS: six curved current-fingers crawling a slow
    // rotation — each arc wears a comma tip bent toward the eye.
    const rand = srand(c.seed ^ 0xd0d);
    const drift = now / 2400;
    ctx.strokeStyle = st.deep;
    for (let k = 0; k < 6; k++) {
      const a0 = rand() * Math.PI * 2 + drift;
      const hr = rPx * (0.42 + rand() * 0.46);
      ctx.globalAlpha = 0.5 * fade;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(px, py, hr, hr * squash, 0, a0, a0 + 0.55);
      ctx.stroke();
      // The comma: the hook's tail bends INWARD off the arc's end.
      const tx = px + Math.cos(a0 + 0.55) * hr;
      const ty = py + Math.sin(a0 + 0.55) * hr * squash;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(
        px + Math.cos(a0 + 0.72) * hr * 0.82,
        py + Math.sin(a0 + 0.72) * hr * 0.82 * squash,
      );
      ctx.stroke();
    }
    // THE DROWNED BREATH: bubble stations blinking on their own
    // seeded clocks — the air leaving whatever the pool is holding.
    const rand2 = srand(c.seed ^ 0xb0b);
    for (let k = 0; k < 7; k++) {
      const a = rand2() * Math.PI * 2;
      const rr = Math.sqrt(rand2()) * rPx * 0.8;
      const ph = rand2();
      const b = (now / 1100 + ph) % 1;
      if (b >= 0.16) continue;
      const bu = b / 0.16;
      ctx.globalAlpha = (1 - bu) * 0.8 * fade;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sc * 0.02);
      const bs = sc * (0.03 + bu * 0.04);
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * rr, py + Math.sin(a) * rr * squash, bs, bs * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // The pool breathes light, and each server pulse HAULS: a real
    // undertow through the library on the field's own beat.
    c.glow(c.wx, c.wy, c.radius * 0.8, (0.1 + 0.05 * Math.sin(now / 320)) * fade);
    for (let i = 0; i < 5; i++) {
      if (crossed(c, wireMs, (250 + i * 1000) / wireMs)) {
        water.deployments.undertow!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.35 });
      }
    }
    // THE SODDEN FLOOR: the pool lets go, the bank stays claimed.
    if (crossed(c, wireMs, 0.93)) {
      const rand3 = srand(c.seed ^ 0xd0d5);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + rand3() * 0.5;
        const rr = c.radius * (0.72 + rand3() * 0.26);
        lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, '#8fb4c0', {
          life: 6 + rand3() * 2, size: 0.05, fade: '#40606c', fadeAt: 0.45,
        });
      }
      lay(c, c.wx, c.wy, '#5a8494', { life: 9, size: 0.15, fade: '#2c4650', fadeAt: 0.35 });
    }
  },
};

// ------------------------------------------------------ abyssal_jet
// beam (range 9, width 0.6) — trench water at pressure through the
// planted trident; the first beam any crown speaks.

/**
 * ABYSSAL_JET — "the trench speaks once."
 * A beam of light dries the moment it dies; a beam of WATER has to
 * go somewhere. In the corridor's first beats a white pressure slug
 * outruns the bands from muzzle to stop (the water arriving, made
 * visible), and from then on the art is all consequence: a soaked
 * dark lane widens under the corridor, rivulet fingers creep off
 * both edges hunting the low ground, drip strings fall off the
 * beam's belly at true height, and the terminus pools — foam rim
 * working — where nine tiles of trench water hit one patch of bank.
 * The lasting mark is the dialect's only LINE: wet grains lying
 * along the whole corridor, so the fight remembers exactly which
 * lane the king owned.
 */
const abyssal_jet: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The muzzle churns; the stop takes the whole trench at once.
    water.deployments.churn!(m, c.wx, c.wy, { radius: 0.35, scale: 0.35 });
    water.deployments.splash!(m, c.wx2, c.wy2, { scale: 0.7 });
    water.deployments.spray!(m, c.wx2, c.wy2, { dir: ang, scale: 0.5 });
    // Trench water is COLD — a small frost bloom rides the stop.
    frost.deployments.bloom!(m, c.wx2, c.wy2, { radius: 0.45, scale: 0.3 });
    c.glow(c.wx2, c.wy2, 1.2, 0.4);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const linger = 1 - cl((t - 0.62) / 0.38);
    ctx.save();
    // THE SOAKED LANE: dark from muzzle to stop, widening as the
    // runoff spreads — the corridor's shadow on the bank.
    const w0 = sc * 0.16;
    const w1 = sc * 0.4 * (0.7 + 0.5 * t);
    ctx.globalAlpha = 0.34 * linger;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.moveTo(px + nx * w0, py + ny * w0);
    ctx.lineTo(px2 + nx * w1, py2 + ny * w1);
    ctx.lineTo(px2 - nx * w1, py2 - ny * w1);
    ctx.lineTo(px - nx * w0, py - ny * w0);
    ctx.closePath();
    ctx.fill();
    // THE RIVULETS: fingers creep off both edges hunting low ground.
    const rand = srand(c.seed ^ 0xab5);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.028);
    for (let k = 0; k < 5; k++) {
      const tk = 0.22 + rand() * 0.7;
      const side = k % 2 === 0 ? 1 : -1;
      const reach = cl((t - tk * 0.25) / 0.45) * sc * (0.16 + rand() * 0.16);
      if (reach <= 0) continue;
      const bx = px + dx * tk + nx * side * w1 * 0.8;
      const by = py + dy * tk + ny * side * w1 * 0.8;
      const bend = (rand() - 0.5) * 0.8;
      ctx.globalAlpha = 0.55 * linger;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + nx * side * reach * 0.6 + ux * bend * reach * 0.4, by + ny * side * reach * 0.6 * squash + uy * bend * reach * 0.4);
      ctx.lineTo(bx + nx * side * reach + ux * bend * reach, by + ny * side * reach * squash + uy * bend * reach);
      ctx.stroke();
    }
    // THE TERMINUS POOL: the stop takes the trench and keeps it —
    // a growing pool with its foam rim still working.
    const pr = sc * (0.42 + 0.3 * cl(t / 0.5));
    ctx.globalAlpha = 0.4 * linger;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px2, py2, pr, pr * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const foamA = c.now / 300;
    ctx.globalAlpha = 0.7 * linger;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.ellipse(px2, py2, pr * 0.9, pr * 0.9 * squash, 0, foamA, foamA + 1.6);
    ctx.stroke();
    ctx.restore();
    // THE LINE THE FIGHT REMEMBERS: wet grains down the whole
    // corridor — the dialect's one linear lasting mark, dense
    // enough to read as a lane after the wire dies.
    if (crossed(c, 480, 0.5)) {
      const rand2 = srand(c.seed ^ 0xab55);
      for (let k = 0; k < 9; k++) {
        const tk = 0.12 + k * 0.1;
        const j = (rand2() - 0.5) * 0.34;
        lay(c, c.wx + (c.wx2 - c.wx) * tk + j, c.wy + (c.wy2 - c.wy) * tk + j * c.squash, '#8fc0cc', {
          life: 6 + rand2() * 2, size: 0.055 + rand2() * 0.02, fade: '#3c5c6c', fadeAt: 0.45,
        });
      }
      lay(c, c.wx2, c.wy2, '#6a9cac', { life: 8, size: 0.13, fade: '#2c4854', fadeAt: 0.4 });
      lay(c, c.wx2 + 0.3, c.wy2 + 0.15, '#8fc0cc', { life: 6, size: 0.06, fade: '#3c5c6c', fadeAt: 0.45 });
      lay(c, c.wx2 - 0.25, c.wy2 - 0.2, '#8fc0cc', { life: 7, size: 0.05, fade: '#3c5c6c', fadeAt: 0.45 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const lift = sc * 0.5;
    ctx.save();
    // THE PRESSURE SLUG: the water's own arrival outruns the bands —
    // a white knot with a bow wedge, muzzle to stop in the first beats.
    if (t < 0.3) {
      const f = cl(t / 0.3);
      const sx = px + (px2 - px) * f;
      const sy = py + (py2 - py) * f - lift;
      const ang = Math.atan2(py2 - py, px2 - px);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, sc * 0.16, sc * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.moveTo(sc * 0.14, -sc * 0.09);
      ctx.lineTo(sc * 0.26, 0);
      ctx.lineTo(sc * 0.14, sc * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // THE DRIP STRINGS: the beam's belly sheds — droplets fall from
    // corridor height to the bank, accelerating like honest water.
    const rand = srand(c.seed ^ 0xab7);
    ctx.fillStyle = st.core;
    for (let k = 0; k < 4; k++) {
      const tk = 0.2 + rand() * 0.6;
      const s0 = 0.12 + rand() * 0.45;
      const fall = (t - s0) / 0.38;
      if (fall <= 0 || fall >= 1) continue;
      const bx = px + (px2 - px) * tk;
      const by = py + (py2 - py) * tk - lift + lift * fall * fall;
      ctx.globalAlpha = (1 - fall) * 0.85;
      ctx.fillRect(bx - sc * 0.012, by, sc * 0.024, sc * (0.05 + 0.03 * (1 - fall)));
    }
    ctx.restore();
  },
};

// ------------------------------------------------- kingspool_geyser
// pulse_nova (r 2.4, three pulses) — the throne's answer to being
// stood on; the first pulse_nova any crown speaks.

/**
 * KINGSPOOL_GEYSER — "the throne's plumbing."
 * The pool the tidelord will not leave turns out to be PLUMBED: on
 * each pulse the bank around him cracks in seeded fissures that run
 * hot-bright for one beat (the pressure showing through the turf),
 * and then the column goes up — a true standing geyser with a
 * mushroom crown that climbs, holds, and breaks into falling blocks
 * while real droplets rain back over the ring. Three pulses overlap
 * into one erupting pool. The vent mouth stays dark at the heart
 * with its foam rim working, and the lasting mark is the plumbing
 * itself: crack-line grains and a wet apron rim that outlive the
 * eruption — the throne remembering where it vents.
 */
const kingspool_geyser: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    water.deployments.splash!(m, c.wx, c.wy, { scale: 0.85 });
    water.deployments.churn!(m, c.wx, c.wy, { radius: c.radius * 0.4, scale: 0.5 });
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.5);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // THE WET APRON: the eruption soaks its ring outward.
    const ar = rPx * Math.sqrt(cl(t / 0.4));
    ctx.globalAlpha = 0.22 * (1 - t * 0.6);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, ar, ar * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE VENT CRACKS: seeded fissures run hot for one beat — the
    // pressure showing through the turf — then dim to wet dark.
    const rand = srand(c.seed ^ 0x6e75);
    const hot = t < 0.3;
    ctx.strokeStyle = hot ? '#ffffff' : st.deep;
    ctx.lineWidth = Math.max(2, sc * (hot ? 0.05 : 0.03));
    ctx.globalAlpha = hot ? 0.95 : 0.5 * (1 - t);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.9;
      const r1 = rPx * (0.5 + rand() * 0.35);
      const j1 = (rand() - 0.5) * 0.4;
      const j2 = (rand() - 0.5) * 0.4;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * 0.12, py + Math.sin(a) * sc * 0.12 * squash);
      ctx.lineTo(px + Math.cos(a + j1) * r1 * 0.55, py + Math.sin(a + j1) * r1 * 0.55 * squash);
      ctx.lineTo(px + Math.cos(a + j2) * r1, py + Math.sin(a + j2) * r1 * squash);
      ctx.stroke();
    }
    // THE VENT MOUTH: dark at the heart, foam rim working.
    ctx.globalAlpha = 0.75 * (1 - cl((t - 0.7) / 0.3));
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.28, sc * 0.28 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const foamA = c.now / 260;
    ctx.globalAlpha = 0.8 * (1 - cl((t - 0.7) / 0.3));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.3, sc * 0.3 * squash, 0, foamA, foamA + 2.1);
    ctx.stroke();
    ctx.restore();
    // THE PLUMBING REMEMBERED: crack grains and the apron rim.
    if (crossed(c, 780, 0.55)) {
      const rand2 = srand(c.seed ^ 0x6e7);
      const ca = rand2() * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const rr = c.radius * (0.2 + k * 0.22);
        lay(c, c.wx + Math.cos(ca) * rr, c.wy + Math.sin(ca) * rr * c.squash, '#7ea8b4', {
          life: 7, size: 0.045, fade: '#35505c', fadeAt: 0.4,
        });
      }
      for (let k = 0; k < 4; k++) {
        const a = rand2() * Math.PI * 2;
        lay(c, c.wx + Math.cos(a) * c.radius * 0.92, c.wy + Math.sin(a) * c.radius * 0.92 * c.squash, '#9fc8d0', {
          life: 5 + rand2() * 2, size: 0.05, fade: '#40606c', fadeAt: 0.5,
        });
      }
      lay(c, c.wx, c.wy, '#48707c', { life: 9, size: 0.13, fade: '#243c44', fadeAt: 0.35 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // THE COLUMN: climbs, holds, breaks. Height rides the pool size.
    const rise = cl(t / 0.28);
    const fall = cl((t - 0.5) / 0.28);
    const hMax = sc * 1.5;
    const h = hMax * (rise * rise * (3 - 2 * rise)) * (1 - fall * 0.9);
    if (h <= sc * 0.05 && fall >= 1) return;
    ctx.save();
    if (h > sc * 0.05) {
      const cw = sc * 0.17 * (1 - fall * 0.4);
      // Sheath, body, core — three hard bands, dark to white.
      for (const [w, col, a] of [
        [1.7, st.deep, 0.5],
        [1.15, st.mid, 0.75],
        [0.5, '#ffffff', 0.95],
      ] as const) {
        ctx.globalAlpha = a * (1 - fall);
        ctx.fillStyle = col;
        ctx.fillRect(px - cw * w * 0.5, py - h, cw * w, h);
      }
      // THE CROWN: the mushroom head — widest just before the break.
      const crw = cw * (2.2 + rise * 0.8) * (1 - fall);
      ctx.globalAlpha = 0.9 * (1 - fall);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(px, py - h, crw, crw * 0.42, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(px, py - h, crw * 0.55, crw * 0.24, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      c.glow(c.wx, c.wy, c.radius * 0.7, 0.25 * (1 - fall));
    }
    // THE BREAK: the crown lets go in blocks that fall true.
    if (fall > 0 && fall < 1) {
      const rand = srand(c.seed ^ 0x6e76);
      ctx.fillStyle = st.mid;
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const spread = sc * (0.2 + rand() * 0.3);
        const bh = hMax * (0.85 + rand() * 0.1);
        const by = py - bh + (bh - sc * 0.05) * fall * fall;
        const bx = px + Math.cos(a) * spread * fall;
        const bs = sc * (0.05 + rand() * 0.04) * (1 - fall * 0.5);
        ctx.globalAlpha = (1 - fall) * 0.9;
        ctx.fillRect(bx - bs / 2, by - bs / 2, bs, bs * 1.3);
      }
    }
    ctx.restore();
    // The crest lets its rain go once, over the whole ring.
    if (crossed(c, 780, 0.3)) {
      water.deployments.rain!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.5, dur: 1.2 });
    }
  },
};

// --------------------------------------------------- court_of_spears
// summon (self-staked) — the tidelord's word for the harpoon court.

/**
 * COURT_OF_SPEARS — "the court was always here."
 * The third rim voice, and it must read against BOTH cousins: the
 * shoal's croak answers in ragged fin-blades, the legion's horn in
 * drilled leaf-spears on the count — the tidelord's court answers in
 * WATER FIRST. Five mounds of standing water well up around the ring
 * on ragged clocks, and only once each mound stands does a barbed
 * harpoon rise THROUGH it, shedding its own splash, holding its
 * salute a long beat, then sliding back under. The read is exactly
 * the fight: the water stands, and then it is holding a spear.
 */
const court_of_spears: AbilitySig = {
  spawn(c) {
    // Water stands where no one is: a curtain climbs at the king.
    const m = asMatter(c);
    water.deployments.curtain!(m, c.wx, c.wy, { radius: c.radius * 0.35, scale: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // One deep court-ring, low and slow — the pool marking its rim.
    const ru = cl(t / 0.5);
    if (ru < 1) {
      ctx.globalAlpha = 0.6 * (1 - ru);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * (0.3 + ru * 0.7), rPx * (0.3 + ru * 0.7) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const rand = srand(c.seed ^ 0xc0427);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + (rand() - 0.5) * 0.6;
      const stag = rand() * 0.3;
      const bx = px + Math.cos(a) * rPx * 0.85;
      const by = py + Math.sin(a) * rPx * 0.85 * squash;
      // THE MOUND: water wells up first — a low dome with a pale cap.
      const well = cl((t - stag) / 0.2);
      const sink = cl((t - stag - 0.75) / 0.2);
      if (well <= 0 || sink >= 1) continue;
      const mw = sc * (0.19 + rand() * 0.045);
      const mh = mw * 0.5 * well * (1 - sink);
      ctx.globalAlpha = 0.85 * (1 - sink);
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(bx, by, mw, mh + mw * 0.2 * squash, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(bx, by, mw, mw * 0.24 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE SPEAR: rises THROUGH the standing mound, barbed, holds,
      // and goes back under with the water that raised it.
      const rise = cl((t - stag - 0.16) / 0.2);
      if (rise > 0) {
        const sh = sc * (0.28 + rand() * 0.06) * rise * (1 - sink);
        ctx.globalAlpha = 0.92 * (1 - sink);
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(1.5, sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(bx, by - mh * 0.5);
        ctx.lineTo(bx, by - mh * 0.5 - sh);
        ctx.stroke();
        // The barbed head: point plus two back-hooks — a fisher's
        // iron, never a soldier's leaf.
        const hw = sc * 0.036;
        const hy = by - mh * 0.5 - sh;
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        ctx.moveTo(bx, hy - hw * 2.2);
        ctx.lineTo(bx + hw * 0.7, hy);
        ctx.lineTo(bx + hw * 1.5, hy + hw * 1.2);
        ctx.lineTo(bx, hy + hw * 0.4);
        ctx.lineTo(bx - hw * 1.5, hy + hw * 1.2);
        ctx.lineTo(bx - hw * 0.7, hy);
        ctx.closePath();
        ctx.fill();
      }
      // The splash each shaft sheds as it clears its mound — and the
      // wet iron catches the light for exactly that beat.
      if (crossed(c, 500, stag + 0.2)) {
        const m = asMatter(c);
        const mwx = c.wx + Math.cos(a) * c.radius * 0.85;
        const mwy = c.wy + Math.sin(a) * c.radius * 0.85 * c.squash;
        water.deployments.splash!(m, mwx, mwy, { scale: 0.4 });
        c.glow(mwx, mwy, 0.5, 0.25);
      }
    }
    ctx.restore();
    // Wet grains where the court stood — each mound leaves its own
    // puddle and the drip-dash its shaft shed sliding back under.
    if (crossed(c, 500, 0.6)) {
      const rand2 = srand(c.seed ^ 0xc04);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + rand2() * 0.4;
        const gx = c.wx + Math.cos(a) * c.radius * 0.85;
        const gy = c.wy + Math.sin(a) * c.radius * 0.85 * c.squash;
        lay(c, gx, gy, '#9fb8c4', { life: 5 + rand2() * 2, size: 0.055, fade: '#48606c', fadeAt: 0.5 });
        lay(c, gx + (rand2() - 0.5) * 0.24, gy - 0.14, '#b8ccd4', {
          life: 4 + rand2() * 2, size: 0.035, fade: '#48606c', fadeAt: 0.45,
        });
      }
    }
  },
};

// ----------------------------------------------------- shallows_rush
// dash_strike (4 tiles) — the deepmaw goes flat as an eel and comes
// through the shallows at you.

/**
 * SHALLOWS_RUSH — "the eel's wake."
 * A dash streak says something MOVED; this wake says something SWAM.
 * The lane the bulk carved is a serpentine S — no straight line ever
 * came off a swimming body — revealed head-first as the rush passes,
 * with chevron ripples peeling off alternate sides the way a hull
 * sheds its wash. Over the water line, three raked dorsal ghosts
 * stand a beat where the crest broke the surface and fold away in
 * sequence. The bank keeps a staggered trail of wet dashes,
 * alternating sides down the lane — the drip line of a body that
 * was never fully out of the water.
 */
const shallows_rush: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The launch throws its wash backward; the arrival wears it.
    water.deployments.spray!(m, c.wx, c.wy, { dir: ang + Math.PI, scale: 0.45 });
    water.deployments.splash!(m, c.wx2, c.wy2, { scale: 0.5 });
    c.glow(c.wx2, c.wy2, 0.9, 0.3);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const fade = 1 - cl((t - 0.55) / 0.45);
    const amp = sc * 0.2;
    ctx.save();
    // THE S-WAKE: the swimming line — two opposed bows through the
    // lane, dark bed under a living mid stroke.
    for (const [w, col, a] of [
      [0.15, st.deep, 0.35],
      [0.065, st.mid, 0.6],
    ] as const) {
      ctx.globalAlpha = a * fade;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, sc * w);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(
        px + dx * 0.28 + nx * amp, py + dy * 0.28 + ny * amp * squash,
        px + dx * 0.5, py + dy * 0.5,
      );
      ctx.quadraticCurveTo(
        px + dx * 0.72 - nx * amp, py + dy * 0.72 - ny * amp * squash,
        px2, py2,
      );
      ctx.stroke();
    }
    // THE CHEVRONS: hull-wash vees peeling off alternate sides,
    // revealed head-first as the body passes each station.
    const rand = srand(c.seed ^ 0x5e1);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.03);
    for (let k = 0; k < 5; k++) {
      const tk = 0.16 + k * 0.17;
      if (t < tk * 0.5) continue;
      const side = k % 2 === 0 ? 1 : -1;
      const open = sc * (0.12 + rand() * 0.08) * (1 + t * 0.6);
      const bx = px + dx * tk + nx * side * sc * 0.1;
      const by = py + dy * tk + ny * side * sc * 0.1;
      ctx.globalAlpha = 0.7 * fade;
      ctx.beginPath();
      ctx.moveTo(bx + nx * side * open, by + ny * side * open * squash - dx / len * open * 0.5);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + nx * side * open - dx / len * open * 0.9, by + ny * side * open * squash - dy / len * open * 0.9);
      ctx.stroke();
    }
    ctx.restore();
    // THE DRIP LINE: wet dashes alternating sides down the lane.
    if (crossed(c, 380, 0.6)) {
      const rand2 = srand(c.seed ^ 0x5e15);
      for (let k = 0; k < 4; k++) {
        const tk = 0.2 + k * 0.2;
        const side = k % 2 === 0 ? 1 : -1;
        lay(
          c,
          c.wx + (c.wx2 - c.wx) * tk + side * 0.18 + (rand2() - 0.5) * 0.1,
          c.wy + (c.wy2 - c.wy) * tk + side * 0.18 * c.squash,
          '#9fc4b5',
          { life: 5 + rand2() * 2, size: 0.045, fade: '#48685c', fadeAt: 0.5 },
        );
      }
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    // THE DORSAL GHOSTS: the crest breaking the surface at three
    // stations, raked hard back, folding away in passing order.
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const lift = sc * 0.32;
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const tk = 0.3 + k * 0.25;
      const a = 1 - cl((t - tk * 0.45) / 0.34);
      if (t < tk * 0.45 || a <= 0) continue;
      const bx = px + dx * tk;
      const by = py + dy * tk - lift;
      const fh = sc * (0.15 + k * 0.02);
      ctx.globalAlpha = 0.8 * a;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(bx - ux * sc * 0.07, by - uy * sc * 0.07);
      // Raked AFT along the travel line — a fin, never a flame.
      ctx.quadraticCurveTo(bx - ux * fh * 0.3, by - fh, bx - ux * fh * 1.1, by - fh * 0.66);
      ctx.lineTo(bx + ux * sc * 0.07, by + uy * sc * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.6 * a;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.016);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - ux * fh * 0.5, by - fh * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------- gullet_snap
// melee_arc (range 1.8) — the biggest jaw in the game closes, and
// the guard it catches stays cracked (the first sunder crown).

/**
 * GULLET_SNAP — "the bite keeps."
 * The crab's breakwater is two smooth keratin edges meeting; the
 * gullet is TEETH — an outer and an inner row of them, closing
 * across the crescent from both sides over a dark wet gum-line
 * until they meet, then pulling INTO the maw's mid-point in one
 * gulp. Whatever was between them went with the gulp. Over the
 * meet, a bone-pale crack glyph snaps and dies — the sunder read:
 * your guard now has a seam in it. And the bank keeps the game's
 * only dental record: two curved rows of puncture grains, the bite
 * print lying seven seconds where the jaw closed.
 */
const gullet_snap: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    const bx = c.wx + Math.cos(c.dir) * c.radius * 0.55;
    const by = c.wy + Math.sin(c.dir) * c.radius * 0.55 * c.squash;
    water.deployments.churn!(m, bx, by, { radius: 0.3, scale: 0.3 });
    water.deployments.spray!(m, bx, by, { dir: c.dir, scale: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const half = 0.72;
    const close = cl(t / 0.42);
    const gulp = cl((t - 0.7) / 0.26);
    const midR = 0.72;
    const outerR = 1.0 + (midR - 1.0) * close;
    const innerR = 0.4 + (midR - 0.07 - 0.4) * close;
    ctx.save();
    // THE WET GUM: the dark band the rows ride on.
    ctx.globalAlpha = 0.38 * (1 - gulp);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(4, sc * 0.22);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * midR, rPx * midR * squash, 0, dir - half, dir + half);
    ctx.stroke();
    // THE TOOTH ROWS: five outer teeth biting inward, four inner
    // teeth biting out — individual triangles, never a smooth edge.
    // Big and bone-white over dark casings: the read must land in
    // nine frames, so the teeth carry the whole crescent's weight.
    const rand = srand(c.seed ^ 0x9a9);
    const drawTooth = (a: number, rr: number, inward: boolean): void => {
      const pull = 1 - gulp;
      const ga = dir + (a - dir) * pull; // the gulp hauls angles to the mid-line
      const gr = rr + (midR * 0.78 - rr) * gulp; // ...and radii into the maw
      const bx = px + Math.cos(ga) * rPx * gr;
      const by = py + Math.sin(ga) * rPx * gr * squash;
      const th = sc * (0.17 + rand() * 0.03) * pull;
      const tw = sc * 0.062 * pull;
      const tx = px + Math.cos(ga) * (rPx * gr + (inward ? -th : th));
      const ty = py + Math.sin(ga) * (rPx * gr + (inward ? -th : th)) * squash;
      const pxn = -Math.sin(ga);
      const pyn = Math.cos(ga);
      ctx.beginPath();
      ctx.moveTo(bx + pxn * tw, by + pyn * tw * squash);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx - pxn * tw, by - pyn * tw * squash);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    ctx.globalAlpha = 0.95 * (1 - gulp * 0.6);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.018);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) {
      drawTooth(dir + ((k / 4) * 2 - 1) * half * 0.88, outerR, true);
    }
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 4; k++) {
      drawTooth(dir + ((k / 3) * 2 - 1) * half * 0.62, innerR, false);
    }
    ctx.restore();
    // THE BITE PRINT: the game's only dental record — puncture
    // grains in two curved rows where the rows met.
    if (crossed(c, 300, 0.55)) {
      const m = asMatter(c);
      water.deployments.splash!(m, c.wx + Math.cos(dir) * c.radius * midR,
        c.wy + Math.sin(dir) * c.radius * midR * c.squash, { scale: 0.35 });
      for (let k = 0; k < 5; k++) {
        const a = dir + ((k / 4) * 2 - 1) * half * 0.88;
        lay(c, c.wx + Math.cos(a) * c.radius * 0.78, c.wy + Math.sin(a) * c.radius * 0.78 * c.squash,
          '#e6e8da', { life: 7, size: 0.04, fade: '#4a5648', fadeAt: 0.35 });
      }
      for (let k = 0; k < 4; k++) {
        const a = dir + ((k / 3) * 2 - 1) * half * 0.62;
        lay(c, c.wx + Math.cos(a) * c.radius * 0.62, c.wy + Math.sin(a) * c.radius * 0.62 * c.squash,
          '#e6e8da', { life: 7, size: 0.035, fade: '#4a5648', fadeAt: 0.35 });
      }
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py, dir } = c;
    // THE GUARD CRACK: the sunder read — one bone-pale seam snaps
    // over the bite and dies. Not shock-blue; this is a BREAK.
    const u = (t - 0.5) / 0.4;
    if (u <= 0 || u >= 1) return;
    const bx = px + Math.cos(dir) * c.rPx * 0.72;
    const by = py + Math.sin(dir) * c.rPx * 0.72 * c.squash - sc * 0.55;
    const s = sc * 0.42 * (1 - u * 0.3);
    ctx.save();
    // Dark casing under a white seam — the break must read on any sky.
    for (const [w, col] of [[0.075, st.deep], [0.032, '#ffffff']] as const) {
      ctx.globalAlpha = (1 - u) * 0.95;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, sc * w * (1 - u * 0.5));
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.5, by - s * 0.55);
      ctx.lineTo(bx - s * 0.1, by - s * 0.15);
      ctx.lineTo(bx - s * 0.28, by + s * 0.05);
      ctx.lineTo(bx + s * 0.2, by + s * 0.5);
      ctx.stroke();
    }
    // The seam's two flake ticks.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(bx - s * 0.1, by - s * 0.15);
    ctx.lineTo(bx + s * 0.24, by - s * 0.32);
    ctx.stroke();
    ctx.restore();
  },
};

// ------------------------------------------------------- gorge_spray
// projectile_fan (5 gobs) — what the gullet keeps, rots; the sig
// speaks at every LANDING (each gob's blast wire), five at once.

/**
 * GORGE_SPRAY — "what the gullet kept."
 * The flight is a lobbed mouthful; the art is where it LANDS. Each
 * gob hits as a ragged six-lobed splat — no two the same shape —
 * throwing satellite droplets on runner lines, with a pale shine on
 * the seeded upstream rim and fizz bubbles blinking as the rot
 * starts working the ground. Two thin stink curls stand off the
 * blot and die. The stain is the lasting mark: a dark olive blotch
 * and its satellites, lying seven seconds — walk the fight long
 * enough and the bank reads like a map of everywhere you dodged.
 * Budgeted lean on purpose: five of these can be alive at once.
 */
const gorge_spray: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    venom.deployments.spit!(m, c.wx, c.wy, { dir: -Math.PI / 2, scale: 0.3 });
    water.deployments.splash!(m, c.wx, c.wy, { scale: 0.28 });
    c.glow(c.wx, c.wy, 0.55, 0.22);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, now } = c;
    const rand = srand(c.seed ^ 0x60b);
    const reveal = cl(t / 0.14);
    const fade = 1 - cl((t - 0.6) / 0.4);
    ctx.save();
    // THE SPLAT: six ragged lobes — no compass circle ever splatted.
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    let a0 = rand() * Math.PI * 2;
    ctx.moveTo(px + Math.cos(a0) * rPx * 0.6 * reveal, py + Math.sin(a0) * rPx * 0.6 * reveal * squash);
    for (let k = 1; k <= 6; k++) {
      const a = a0 + (k / 6) * Math.PI * 2;
      const lr = rPx * (0.5 + rand() * 0.45) * reveal;
      const ca = a0 + ((k - 0.5) / 6) * Math.PI * 2;
      ctx.quadraticCurveTo(
        px + Math.cos(ca) * rPx * 0.3 * reveal, py + Math.sin(ca) * rPx * 0.3 * reveal * squash,
        px + Math.cos(a) * lr, py + Math.sin(a) * lr * squash,
      );
    }
    ctx.fill();
    // THE SATELLITES: droplets thrown past the blot on runner lines.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rPx * (1.25 + rand() * 0.55) * reveal;
      const sx = px + Math.cos(a) * rr;
      const sy = py + Math.sin(a) * rr * squash;
      ctx.globalAlpha = 0.6 * fade;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * rPx * 0.7, py + Math.sin(a) * rPx * 0.7 * squash);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.globalAlpha = 0.75 * fade;
      ctx.fillStyle = st.mid;
      const ds = sc * (0.03 + rand() * 0.02);
      ctx.beginPath();
      ctx.ellipse(sx, sy, ds, ds * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE FIZZ: the rot working — bubbles blinking on seeded clocks.
    ctx.strokeStyle = st.spark;
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.6;
      const b = (now / 700 + rand()) % 1;
      if (b >= 0.2) continue;
      ctx.globalAlpha = (1 - b / 0.2) * 0.8 * fade;
      ctx.lineWidth = Math.max(1, sc * 0.015);
      const bs = sc * 0.022;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * rr, py + Math.sin(a) * rr * squash, bs, bs * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE RIM SHINE: wet light on the upstream edge.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.62, rPx * 0.62 * squash, 0, a0 - 0.5, a0 + 0.7);
    ctx.stroke();
    ctx.restore();
    // THE STAIN: the map of everywhere you dodged.
    if (crossed(c, 780, 0.5)) {
      const rand2 = srand(c.seed ^ 0x60b5);
      lay(c, c.wx, c.wy, '#6a7a3c', { life: 7, size: 0.09, fade: '#3a4424', fadeAt: 0.4 });
      for (let k = 0; k < 2; k++) {
        const a = rand2() * Math.PI * 2;
        lay(c, c.wx + Math.cos(a) * c.radius * 1.3, c.wy + Math.sin(a) * c.radius * 1.3 * c.squash,
          '#7a8a48', { life: 5, size: 0.045, fade: '#3a4424', fadeAt: 0.45 });
      }
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // THE STINK: two thin curls stand off the blot and die early.
    if (t >= 0.5) return;
    const rand = srand(c.seed ^ 0x60b7);
    ctx.save();
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.018);
    for (let k = 0; k < 2; k++) {
      const bx = px + (rand() - 0.5) * sc * 0.3;
      const h = sc * (0.2 + rand() * 0.12) * cl(t / 0.3);
      const sway = Math.sin(c.now / 300 + k * 2.4) * sc * 0.04;
      ctx.globalAlpha = (1 - t / 0.5) * 0.5;
      ctx.beginPath();
      ctx.moveTo(bx, py - sc * 0.1);
      ctx.quadraticCurveTo(bx + sway, py - sc * 0.1 - h * 0.6, bx - sway * 0.6, py - sc * 0.1 - h);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// --------------------------------------------------- breaching_crash
// leap_slam — the deepmaw's landing, read from the receiving end.

/**
 * BREACHING_CRASH — "a crater wearing spray."
 * A TWO-ACT set-piece riding the leap's two wires. Act one, the
 * dash wire, plays at the DEPARTURE: the bulk tears out of the bank
 * and the bank pays — a dark seat-ring contracts into the hole it
 * left, a low gray slump of water folds back into the vacancy, and
 * three draw-lines rush in to fill it. Act two, the blast wire, is
 * the landing: a white impact shock, then the collapse column falls
 * back through itself at the heart, a corona of tall spray sheets
 * stands up around the rim and falls OUTWARD (the crab's law
 * inverted — the water leaves the crater, never returns to it),
 * real crown-droplets rain over the ring, and the bank keeps a
 * broken ring of wet grains and one long puddle-stain where the
 * bulk came down. Ragged everywhere: the shoal's clocks, not the
 * legion's.
 */
const breaching_crash: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    if (c.kind === 'dash') {
      // Act one: the launch — the water he was standing in goes up
      // with him, and the hole he left starts refilling.
      water.deployments.splash!(m, c.wx, c.wy, { scale: 0.55 });
      water.deployments.churn!(m, c.wx, c.wy, { radius: 0.45, scale: 0.4 });
      return;
    }
    // Act two: the landing — the biggest single splash in the
    // dialect, a churn that keeps working, and the crown coming
    // back down as honest rain over the whole ring.
    water.deployments.splash!(m, c.wx, c.wy, { scale: 0.95 });
    water.deployments.churn!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.6 });
    water.deployments.rain!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.55, dur: 1.1 });
    c.glow(c.wx, c.wy, c.radius, 0.45);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (c.kind === 'dash') {
      // ACT ONE — THE VACATED SEAT: the ring he tore out of pulls
      // shut, dark and quick, with three fill-lines rushing in.
      const shut = cl(t / 0.7);
      const fade = 1 - cl((t - 0.55) / 0.45);
      const sr = sc * (0.55 - 0.38 * shut);
      ctx.save();
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2, sc * 0.06 * (1 - shut * 0.5));
      ctx.beginPath();
      ctx.ellipse(px, py, sr, sr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The slump: a low gray fold of water dropping into the hole.
      const sl = (1 - shut) * sc * 0.18;
      if (sl > 1) {
        ctx.globalAlpha = 0.6 * fade;
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.ellipse(px, py - sl * 0.4, sr * 0.7, sl, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      const rand = srand(c.seed ^ 0xb4e1);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        const r0 = sc * (0.6 + rand() * 0.25) * (1 - shut * 0.6);
        ctx.globalAlpha = 0.6 * fade;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
        ctx.lineTo(px + Math.cos(a) * sr * 0.8, py + Math.sin(a) * sr * 0.8 * squash);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    ctx.save();
    // THE IMPACT SHOCK: one white ground flash under the first beats.
    if (t < 0.16) {
      const su = 1 - t / 0.16;
      ctx.globalAlpha = 0.5 * su;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.85 * (1 - su * 0.4), rPx * 0.85 * (1 - su * 0.4) * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE COLLAPSE COLUMN: the water the breach carried falls back
    // through itself at the heart — tall, white, and brief.
    const col = 1 - cl(t / 0.28);
    if (col > 0) {
      const cw = sc * 0.2 * (0.6 + 0.4 * col);
      const chh = sc * (0.5 + 0.3 * col) * col;
      ctx.globalAlpha = 0.8 * col;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(px - cw, py);
      ctx.quadraticCurveTo(px - cw * 0.5, py - chh * 0.7, px - cw * 0.3, py - chh);
      ctx.lineTo(px + cw * 0.3, py - chh);
      ctx.quadraticCurveTo(px + cw * 0.5, py - chh * 0.7, px + cw, py);
      ctx.closePath();
      ctx.fill();
    }
    // THE SPRAY CORONA: sheets stand on the rim and fall OUTWARD on
    // ragged clocks — the crater emptying itself.
    const rand = srand(c.seed ^ 0xb4ea);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (rand() - 0.5) * 0.5;
      const stag = rand() * 0.2;
      const up = cl((t - stag) / 0.18);
      const fall = cl((t - stag - 0.2) / 0.35);
      if (up <= 0 || fall >= 1) continue;
      const reach = rPx * (0.95 + fall * 0.35);
      const bx = px + Math.cos(a) * reach;
      const by = py + Math.sin(a) * reach * squash;
      const sh2 = sc * (0.2 + rand() * 0.08) * up * (1 - fall);
      const lean = Math.cos(a) * sc * 0.06 * (1 + fall);
      ctx.globalAlpha = 0.8 * (1 - fall);
      ctx.fillStyle = fall < 0.3 ? '#ffffff' : st.mid;
      ctx.beginPath();
      ctx.moveTo(bx - sc * 0.03, by);
      ctx.quadraticCurveTo(bx + lean * 0.4, by - sh2, bx + lean, by - sh2 * 0.7);
      ctx.lineTo(bx + sc * 0.03, by);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // THE WET RING: the lasting mark — a broken ring of brine grains
    // and the puddle the bulk pressed into the bank.
    if (crossed(c, 600, 0.35)) {
      const rand2 = srand(c.seed ^ 0xb4e);
      for (let k = 0; k < 7; k++) {
        const a = rand2() * Math.PI * 2;
        const rr = c.radius * (0.75 + rand2() * 0.35);
        lay(c, c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, '#9fc4c4', {
          life: 5 + rand2() * 3, size: 0.05, fade: '#446068', fadeAt: 0.5,
        });
      }
      lay(c, c.wx, c.wy, '#7ea8b0', { life: 8, size: 0.16, fade: '#3a545c', fadeAt: 0.4 });
    }
  },
};

// --------------------------------------------------------- stone_gaze
// ground_aoe, fused wire — the basilisk's petrifying stare lands.

/**
 * STONE_GAZE — "the ground remembers being rock."
 * The seat greys over in one hard front, then a low CROWN OF CRUST
 * locks up around the rim — five stone facets that RISE AND STAND
 * (petrification is stillness; nothing here vaults or dances), each
 * catching one pale-green glint of the gaze that made it. Crack
 * lines spread from the heart across the greyed floor. On the late
 * beat the crust crumbles to true dust and the lasting mark stays:
 * a broken ring of stone grains and one green wink, nine seconds of
 * proof that the landscape briefly included somebody.
 */
const stone_gaze: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { radius: c.radius * 0.55, scale: 0.5 });
    // The gaze's touch: a pale-green glint cluster at the heart.
    const rand = srand(c.seed ^ 0x5c1);
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx + (rand() - 0.5) * 0.22, c.wy + (rand() - 0.5) * 0.18, '#dff0b0', {
        life: 8.5 + rand(), size: 0.055, fade: '#8ba05e', fadeAt: 0.5,
        flicker: k === 0 ? 5 : 0,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // The greying front: one hard ring racing out, then done.
    const f = cl(t / 0.14);
    if (f < 1) {
      const rr = rPx * (0.2 + 0.8 * f);
      ctx.globalAlpha = 0.85 * (1 - f * 0.45);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.08 * (1 - f * 0.4));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.2, sc * 0.025);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.05, rr * 1.05 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const set = cl((t - 0.1) / 0.14);
    const fade = 1 - cl((t - 0.8) / 0.2);
    if (set > 0) {
      // The greyed floor while the stone holds.
      ctx.globalAlpha = 0.2 * set * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.88, rPx * 0.88 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // Crack lines out of the heart — precomputed bones, grown by
      // the set clock, never re-rolled.
      const rand = srand(c.seed ^ 0x5c2);
      ctx.globalAlpha = 0.6 * set * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.2, sc * 0.03);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + rand() * 0.7;
        const reach = rPx * (0.5 + rand() * 0.35) * set;
        const kinkA = a + (rand() - 0.5) * 0.8;
        const mx = px + Math.cos(a) * reach * 0.55;
        const my = py + Math.sin(a) * reach * 0.55 * squash;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(mx, my);
        ctx.lineTo(mx + Math.cos(kinkA) * reach * 0.45, my + Math.sin(kinkA) * reach * 0.45 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x5c3);
    const layR = srand(c.seed ^ 0x5c4);
    ctx.save();
    // THE CROWN OF CRUST: five stone facets around the rim. Geometry
    // precomputed FIRST so no beat branch shifts a later facet.
    const facets: Array<[number, number, number]> = [];
    for (let k = 0; k < 5; k++) {
      facets.push([
        (k / 5) * Math.PI * 2 + rand() * 0.3,
        sc * (0.3 + rand() * 0.14),
        0.75 + rand() * 0.2,
      ]);
    }
    const crumbleAt = 0.72;
    for (let k = 0; k < 5; k++) {
      const [a, h, ru] = facets[k]!;
      const rise = cl((t - 0.08 - k * 0.04) / 0.16);
      if (rise <= 0 || t >= crumbleAt) continue;
      const bx = px + Math.cos(a) * rPx * ru;
      const by = py + Math.sin(a) * rPx * ru * squash;
      const w = sc * 0.12;
      const hh = h * rise;
      // Two facets a side: lit toward the heart, shadowed out — a
      // standing crust wedge, root planted on the rim.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(bx - w, by + 1);
      ctx.lineTo(bx - w * 0.2, by - hh);
      ctx.lineTo(bx + w * 0.15, by - hh * 0.92);
      ctx.lineTo(bx - w * 0.1, by + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.1, by + 1);
      ctx.lineTo(bx + w * 0.15, by - hh * 0.92);
      ctx.lineTo(bx + w, by + 1);
      ctx.closePath();
      ctx.fill();
      // The gaze's glint on the live tip.
      if (rise >= 1) {
        const g = Math.max(1.5, sc * 0.04);
        ctx.fillStyle = st.spark;
        ctx.fillRect(bx - w * 0.2 - g / 2, by - hh - g, g, g);
      }
    }
    ctx.restore();
    // The crumble beat: the crust lets go as dust, the mark laid.
    if (crossed(c, 900, crumbleAt)) {
      dust.deployments.billow!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.6, scale: 0.4 });
      for (let k = 0; k < 5; k++) {
        const [a, , ru] = facets[k]!;
        lay(c, c.wx + Math.cos(a) * c.radius * ru, c.wy + Math.sin(a) * c.radius * ru * squash,
          '#8a8567', { life: 7.5 + layR(), size: 0.06, fade: '#54524a', fadeAt: 0.5 });
      }
    }
    c.glow(c.wx, c.wy, c.radius * 0.85, 0.18 * (1 - t));
  },
};

export const FOES_SIGS: Record<string, AbilitySig> = {
  cinder_ring,
  miasma_ring,
  grave_mist,
  web_snare,
  reaping_sweep,
  gnawed_mending,
  raise_the_fallen,
  marrow_chill,
  rending_lunge,
  shrilling_dart,
  breakwater_grip,
  shoal_call,
  drowning_surge,
  abyssal_jet,
  kingspool_geyser,
  court_of_spears,
  shallows_rush,
  gullet_snap,
  gorge_spray,
  breaching_crash,
  warlord_horn,
  stone_gaze,
};
