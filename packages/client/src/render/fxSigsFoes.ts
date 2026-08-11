/**
 * THE SIGNATURE LAW — the foes' wave (enemy arts, THE WILD DRAWS
 * BREATH).
 *
 * Ten bespoke set-pieces for the bestiary's kit abilities, authored
 * from the RECEIVING end like the champion voices before them: every
 * one must say, in one glance and in an exaggerated element, exactly
 * what is about to happen to you and where not to be standing. Same
 * binding laws as fxSignatures.ts: hard edges, save/restore hygiene,
 * squash on the ground, srand-deterministic geometry, frameDt-gated
 * emission, ≤60 path ops per hook per frame.
 *
 * FX v5 ONE-VOICE: fire, venom, frost, smoke, dust, blood, and
 * shadow all speak through the matter library. Three signatures stay
 * audited-bespoke by GRAMMAR REFUSAL: web_snare's SILK and
 * reaping_sweep's own STEEL are not library materials, and
 * gnawed_mending's knitting GROWTH is a working, not a blow — their
 * centerpieces are hand-painted under the v5 physics laws.
 *
 * The volleys (bone_volley, rattling_volley, goblin_firebolt,
 * gloom_spittle) are projectile-borne and speak the mastered flight
 * voices instead (arx element flights / archery shafts) — a fan
 * cast carries no fx event, so their polish lives on the wing.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { fire, smoke, dust, frost, venom, blood, shadow, asMatter } from './matter/index.js';

/** Clamp to 0..1 — every staggered clock in this file runs on it. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ---------------------------------------------------------- cinder_ring

/**
 * CINDER_RING — "the mark that catches."
 * The telegraph stays PURE INSTRUMENT (the one universal countdown
 * ring — an ability never restyles the warning, that uniformity IS
 * the read). The blast is where the identity lands: the marked
 * circle CATCHES — a fire-front races the rim, eight flame tongues
 * leap standing around the ring in sequence, gobbets hop outward on
 * real arcs, and the aftermath is a charred halo of scorch wedges
 * under thinning smoke. You were shown the exact shape of the burn;
 * standing in it was a choice.
 */
const cinder_ring: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    // The catch: a TRUE detonation with its own ring-race and soot.
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 0.9 });
    fire.deployments.ring!(m, c.wx, c.wy, { radius: c.radius * 0.9, scale: 0.8 });
    // Gobbets hop the rim — the camp-fire spitting mad.
    fire.deployments.gobbets!(m, c.wx, c.wy, { scale: 0.55 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x7f1);
    ctx.save();
    // ACT 2/3 — the catch and the char. The fire-front races the rim.
    const front = cl(t / 0.22);
    if (front < 1) {
      const rr = rPx * (0.2 + 0.8 * front);
      ctx.globalAlpha = 0.9 * (1 - front * 0.4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.12 * (1 - front * 0.5));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.05, rr * 1.05 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The charred halo: eight scorch wedges radiating, soot-dark with
    // one ember edge apiece, standing to the end of the effect.
    const char = cl((t - 0.16) / 0.2);
    const fade = 1 - cl((t - 0.8) / 0.2);
    if (char > 0) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + rand() * 0.2;
        const r0 = rPx * (0.3 + rand() * 0.15);
        const r1 = rPx * (0.82 + rand() * 0.14);
        const w = 0.16 + rand() * 0.1;
        ctx.globalAlpha = 0.55 * char * fade;
        ctx.fillStyle = '#241812';
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a - w) * r0, py + Math.sin(a - w) * r0 * squash);
        ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * squash);
        ctx.lineTo(px + Math.cos(a + w) * r0, py + Math.sin(a + w) * r0 * squash);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.5 * char * fade;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
        ctx.lineTo(px + Math.cos(a) * r1 * 0.96, py + Math.sin(a) * r1 * 0.96 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x7f2);
    ctx.save();
    // Eight flame tongues LEAP standing on the rim in sequence as the
    // front reaches them, each a hard two-tone lick with a white tip.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.25;
      const delay = 0.06 + (k % 4) * 0.045;
      const u = cl((t - delay) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const env = Math.sin(u * Math.PI);
      const bx = px + Math.cos(a) * rPx * 0.92;
      const by = py + Math.sin(a) * rPx * 0.92 * squash;
      const h = sc * (0.34 + rand() * 0.18) * env;
      const w = sc * 0.09 * (1 + 0.3 * Math.sin(c.now / 60 + k));
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx + w * 0.2, by - h);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.5, by);
      ctx.lineTo(bx + w * 0.1, by - h * 0.7);
      ctx.lineTo(bx + w * 0.5, by);
      ctx.closePath();
      ctx.fill();
      const g = Math.max(1.5, sc * 0.035) * env;
      ctx.fillStyle = st.core;
      ctx.fillRect(bx - g / 2, by - h - g, g, g * 1.8);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.35 * (1 - t));
  },
};

// --------------------------------------------------------- miasma_ring

/**
 * MIASMA_RING — "the standing haze."
 * A pool of living sickness: the base is a wobbling three-band blob
 * (olive floor, green body, chartreuse crescent highlights — venom
 * leads bright), fat bubbles swell off it and POP into true venom
 * beads, and three serpentine haze coils stand up out of the pool in
 * hard-stepped bands, leaning like weeds under water. On every field
 * pulse the whole pool exhales — a cloud puff on the beat clock.
 * The read is total: green means leave.
 */
const miasma_ring: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    venom.deployments.burst!(m, c.wx, c.wy, { scale: 0.6 });
    venom.deployments.pool!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.7 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x8a1);
    const inK = cl(t / 0.1);
    const out = 1 - cl((t - 0.88) / 0.12);
    const a = inK * out;
    if (a <= 0) return;
    ctx.save();
    // The pool: three hard bands, each rim wobbled on its own slow
    // clock — alive, never a stamped circle.
    const bands: Array<[number, string, number]> = [
      [1.0, '#3c5426', 0.5],
      [0.78, st.deep, 0.62],
      [0.5, st.mid, 0.5],
    ];
    for (const [bk, color, alpha] of bands) {
      ctx.globalAlpha = alpha * a;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const wa = (i / 14) * Math.PI * 2;
        const wob = 1 + 0.08 * Math.sin(wa * 3 + c.now / (700 - bk * 200)) * bk;
        const rr = rPx * bk * wob;
        const x = px + Math.cos(wa) * rr;
        const y = py + Math.sin(wa) * rr * squash;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Chartreuse crescents riding the surface — the bright lead.
    for (let k = 0; k < 3; k++) {
      const ca = rand() * Math.PI * 2 + c.now / 2400 * (k % 2 === 0 ? 1 : -1);
      const rr = rPx * (0.3 + rand() * 0.4);
      ctx.globalAlpha = 0.7 * a;
      ctx.strokeStyle = '#d8f070';
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, ca, ca + 0.9);
      ctx.stroke();
    }
    // Swelling bubbles: grow on staggered clocks, pop into TRUE beads.
    for (let k = 0; k < 4; k++) {
      const ba = rand() * Math.PI * 2;
      const br = Math.sqrt(rand()) * rPx * 0.6;
      const cyc = (c.now / 1100 + k * 0.31) % 1;
      if (cyc > 0.85) continue; // popped — the bead carries on
      const bs = sc * 0.09 * (cyc / 0.85);
      const bx = px + Math.cos(ba) * br;
      const by = py + Math.sin(ba) * br * squash;
      ctx.globalAlpha = 0.8 * a;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(bx, by - bs * 0.4, bs, bs * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8f070';
      ctx.fillRect(bx - bs * 0.3, by - bs * 0.8, Math.max(1, bs * 0.35), Math.max(1, bs * 0.35));
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x8a2);
    const out = 1 - cl((t - 0.88) / 0.12);
    ctx.save();
    // Three standing haze coils: hard-stepped serpentines leaning on
    // slow clocks — weeds of sickness.
    for (let k = 0; k < 3; k++) {
      const ba = rand() * Math.PI * 2;
      const br = rPx * (0.2 + rand() * 0.4);
      const bx = px + Math.cos(ba) * br;
      const by = py + Math.sin(ba) * br * squash;
      const h = sc * (0.5 + rand() * 0.25);
      const lean = 0.16 * Math.sin(c.now / 900 + k * 2.2);
      const seg = 4;
      ctx.globalAlpha = (0.5 - k * 0.1) * out;
      ctx.strokeStyle = k === 0 ? st.mid : st.deep;
      ctx.lineWidth = Math.max(2, sc * (0.085 - k * 0.02));
      ctx.beginPath();
      ctx.moveTo(bx, by);
      for (let s = 1; s <= seg; s++) {
        const u = s / seg;
        const sway = Math.sin(u * 3 + c.now / 500 + k) * sc * 0.07 * u;
        ctx.lineTo(bx + lean * h * u + sway, by - h * u);
      }
      ctx.stroke();
    }
    ctx.restore();
    // The exhale: one cloud puff per field pulse (750ms beat clock).
    const beat = Math.floor(c.age / 750);
    const prevBeat = Math.floor((c.age - c.frameDt * 1000) / 750);
    if (beat !== prevBeat && c.t < 0.9) {
      venom.deployments.cloud!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.6, scale: 0.5 });
    }
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.1 * out);
  },
};

// ---------------------------------------------------------- grave_mist

/**
 * GRAVE_MIST — "the opened tomb."
 * Cold with a HISTORY: hoarfrost ferns grow outward from the heart in
 * real time (each branch etching on its own staggered clock), a low
 * mist skirt breathes at the rim, and in the middle of the cold a
 * single grave-light stands — a small, still, blue-white candle flame
 * that does not flicker like fire. Ice stars glint awake through the
 * mist on their own beats. Slow legs read it instantly: this is the
 * chill that owns the ground.
 */
const grave_mist: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    frost.deployments.bloom!(m, c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.7 });
    frost.deployments.fog!(m, c.wx, c.wy, { radius: c.radius, scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x9b1);
    const out = 1 - cl((t - 0.86) / 0.14);
    ctx.save();
    // The rimed floor: a pale wash disc under everything.
    ctx.globalAlpha = 0.22 * out;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hoarfrost ferns: six main branches etching outward, each with
    // three side-teeth — geometry seeded, growth staggered.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      const len = rPx * (0.55 + rand() * 0.35);
      const grow = cl((t - k * 0.03) / 0.3);
      if (grow <= 0) continue;
      const ex = px + Math.cos(a) * len * grow;
      const ey = py + Math.sin(a) * len * grow * squash;
      ctx.globalAlpha = 0.75 * out;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // Side teeth: short paired ticks at thirds, angled forward.
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      for (let s = 1; s <= 3; s++) {
        const u = s / 4;
        if (u > grow) break;
        const jx = px + Math.cos(a) * len * u;
        const jy = py + Math.sin(a) * len * u * squash;
        const tl = sc * 0.09 * (1 - u * 0.5);
        for (const side of [-0.7, 0.7]) {
          ctx.beginPath();
          ctx.moveTo(jx, jy);
          ctx.lineTo(jx + Math.cos(a + side) * tl, jy + Math.sin(a + side) * tl * squash);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x9b2);
    const out = 1 - cl((t - 0.86) / 0.14);
    ctx.save();
    // THE GRAVE-LIGHT: one still candle of cold standing at the heart
    // — a teardrop that BREATHES (slow swell) instead of flickering.
    const breathe = 1 + 0.1 * Math.sin(c.now / 800);
    const gh = sc * 0.3 * breathe;
    const gw = sc * 0.085;
    ctx.globalAlpha = 0.9 * out;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(px - gw, py - sc * 0.2);
    ctx.quadraticCurveTo(px - gw, py - sc * 0.2 - gh * 0.45, px, py - sc * 0.2 - gh);
    ctx.quadraticCurveTo(px + gw, py - sc * 0.2 - gh * 0.45, px + gw, py - sc * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    const cg = Math.max(1.5, sc * 0.04);
    ctx.fillRect(px - cg / 2, py - sc * 0.2 - gh * 0.55, cg, cg * 1.6);
    // Ice stars glint awake through the mist, one at a time.
    for (let k = 0; k < 4; k++) {
      const tw = Math.sin(c.now / 620 + k * 2.9);
      if (tw < 0.75) continue;
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.75;
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash - sc * 0.12;
      const g = Math.max(1.5, sc * 0.028) * ((tw - 0.75) / 0.25);
      ctx.globalAlpha = 0.9 * out;
      ctx.fillStyle = st.core;
      ctx.fillRect(x - g / 2, y - g * 1.7, g, g * 3.4);
      ctx.fillRect(x - g * 1.7, y - g / 2, g * 3.4, g);
    }
    ctx.restore();
    // The mist keeps breathing on a slow beat.
    const beat = Math.floor(c.age / 1400);
    const prevBeat = Math.floor((c.age - c.frameDt * 1000) / 1400);
    if (beat !== prevBeat && c.t < 0.85) {
      frost.deployments.fog!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.9, scale: 0.4 });
    }
  },
};

// ----------------------------------------------------------- web_snare

/**
 * WEB_SNARE — "the wheel across the road."
 * GRAMMAR REFUSAL: silk is not a library material — the wheel is
 * hand-strung. Eight spokes shoot out from the anchor point and the
 * spiral rides them outward in one continuous draw; every chord SAGS
 * (silk hangs, circles are for compasses). Dew glints travel the
 * strands on slow clocks, and while the snare holds a victim the
 * whole wheel PLUCKS — a vibration envelope shivering every line.
 * Pale silk over a deep shadow underlay: crisp at any zoom.
 */
const web_snare: AbilitySig = {
  spawn(c) {
    // The anchors land: eight silk stakes patter onto the rim.
    const rand = srand(c.seed ^ 0xa01);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.1;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.95,
        c.wy + Math.sin(a) * c.radius * 0.95 * c.squash,
        1,
        ['#f4f2ea', '#c9c4b4'],
        { speed: 0.15, life: 0.5, size: 0.06, gravity: 0, shape: 'glint' },
      );
    }
  },
  ground(c) {
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xa02);
    const draw = cl(t / 0.14); // the wheel strings itself fast
    const out = 1 - cl((t - 0.88) / 0.12);
    // The pluck: while the field holds, strands shiver on a beat.
    const beatT = (c.age % 900) / 900;
    const pluck = beatT < 0.3 ? Math.sin(beatT / 0.3 * Math.PI * 3) * (1 - beatT / 0.3) : 0;
    ctx.save();
    ctx.lineCap = 'round';
    const spokes = 8;
    // Shadow underlay first, silk over — two passes, one geometry.
    for (const [color, w, alpha, off] of [
      ['#3c3648', 0.05, 0.5, 1.5],
      ['#f4f2ea', 0.028, 0.9, 0],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, sc * w);
      ctx.globalAlpha = alpha * out;
      // Spokes: straight, shooting out with the draw.
      ctx.beginPath();
      for (let k = 0; k < spokes; k++) {
        const a = (k / spokes) * Math.PI * 2 + 0.12;
        const shiver = pluck * sc * 0.02 * Math.sin(k * 2.3);
        ctx.moveTo(px, py + off);
        ctx.lineTo(
          px + Math.cos(a) * rPx * draw + shiver,
          py + Math.sin(a) * rPx * draw * squash + off + shiver,
        );
      }
      ctx.stroke();
      // The spiral: three turns of SAGGING chords riding the spokes.
      ctx.beginPath();
      for (let ring = 0; ring < 3; ring++) {
        const base = (0.3 + ring * 0.3) * draw;
        if (base <= 0.05) continue;
        for (let k = 0; k < spokes; k++) {
          const a0 = (k / spokes) * Math.PI * 2 + 0.12;
          const a1 = ((k + 1) / spokes) * Math.PI * 2 + 0.12;
          const rr = rPx * base * (1 + 0.02 * Math.sin(k * 3 + ring));
          const x0 = px + Math.cos(a0) * rr;
          const y0 = py + Math.sin(a0) * rr * squash + off;
          const x1 = px + Math.cos(a1) * rr;
          const y1 = py + Math.sin(a1) * rr * squash + off;
          // The sag: the midpoint pulls toward the heart.
          const mx = (x0 + x1) / 2 - Math.cos((a0 + a1) / 2) * rr * 0.14;
          const my = (y0 + y1) / 2 - Math.sin((a0 + a1) / 2) * rr * 0.14 * squash
            + pluck * sc * 0.04 * Math.sin(k + ring * 2);
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(mx, my, x1, y1);
        }
      }
      ctx.stroke();
    }
    // Dew glints traveling the spokes — light finding the silk.
    for (let k = 0; k < 3; k++) {
      const a = (Math.floor(rand() * spokes) / spokes) * Math.PI * 2 + 0.12;
      const u = ((c.now / 2600) + k * 0.37) % 1;
      const x = px + Math.cos(a) * rPx * u;
      const y = py + Math.sin(a) * rPx * u * squash;
      const g = Math.max(1.5, sc * 0.03);
      ctx.globalAlpha = 0.9 * out;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - g / 2, y - g / 2, g, g);
    }
    // The hub: a wound silk knot.
    ctx.globalAlpha = 0.9 * out;
    ctx.fillStyle = '#e8e4d6';
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.09, sc * 0.09 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    // Drifting silk motes: sparse, tiny, and slow — texture, not noise.
    if (Math.random() < c.frameDt * 2.2 * (c.t < 0.85 ? 1 : 0)) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, 1, ['#f4f2ea'], {
        speed: 0.08, life: 1.6, size: 0.035, gravity: -0.06, drag: 1.2, shape: 'mote',
      });
    }
  },
};

// ------------------------------------------------------- reaping_sweep

/**
 * REAPING_SWEEP — "the crescent you were warned about."
 * GRAMMAR REFUSAL on the metal: the reaver's steel is its own, not a
 * library material. The swing is a hard three-band crescent (deep,
 * mid, white edge) that STEPS through the arc in four frozen
 * afterimages — chunky vector motion, no blur — with sparks
 * skittering off the tip's path and a single bitter red inner
 * edge-line on the final image: the bleed, promised. Trailing
 * grass-nicks stand in the swept ground for a beat.
 */
const reaping_sweep: AbilitySig = {
  spawn(c) {
    // Tip sparks: the reaver's own steel, bespoke flecks.
    const rand = srand(c.seed ^ 0xb01);
    for (let k = 0; k < 5; k++) {
      const a = c.dir - 0.6 + rand() * 1.2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.9,
        c.wy + Math.sin(a) * c.radius * 0.9 * c.squash,
        1,
        [c.st.core, c.st.spark],
        { speed: 1.8, life: 0.3, size: 0.05, gravity: 2, dir: a, spread: 0.5, shape: 'glint' },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx, dir } = c;
    const rand = srand(c.seed ^ 0xb02);
    ctx.save();
    const halfArc = 1.3;
    // Four stepped afterimages: the swing frozen at four moments,
    // newest brightest — the chunky read of speed.
    const prog = cl(t / 0.45);
    for (let k = 3; k >= 0; k--) {
      const u = prog - k * 0.14;
      if (u <= 0) continue;
      const sweepA = dir - halfArc + halfArc * 2 * Math.min(1, u / 0.6);
      const alpha = (k === 0 ? 0.95 : 0.5 - k * 0.12) * (1 - cl((t - 0.5) / 0.3));
      if (alpha <= 0) continue;
      for (const [rk, color, w] of [
        [0.98, st.deep, 0.1],
        [0.9, st.mid, 0.06],
        [1.02, st.core, 0.025],
      ] as const) {
        ctx.globalAlpha = alpha * (rk === 1.02 && k > 0 ? 0.4 : 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, sc * w);
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * rk, rPx * rk * squash, 0, sweepA - 0.55, sweepA + 0.1);
        ctx.stroke();
      }
      // The bleed line: only the FINAL image carries the red promise.
      if (k === 0 && prog > 0.5) {
        ctx.globalAlpha = 0.8 * (1 - cl((t - 0.5) / 0.35));
        ctx.strokeStyle = '#c4372a';
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 0.84, rPx * 0.84 * squash, 0, sweepA - 0.5, sweepA + 0.05);
        ctx.stroke();
      }
    }
    // Grass-nicks: short slash ticks standing where the crescent
    // passed — the ground remembers the swing for a beat.
    const nick = cl((t - 0.3) / 0.12);
    if (nick > 0) {
      const fade = 1 - cl((t - 0.65) / 0.3);
      ctx.globalAlpha = 0.6 * nick * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = dir - halfArc * 0.8 + (k / 5) * halfArc * 1.6;
        const rr = rPx * (0.55 + rand() * 0.3);
        const x = px + Math.cos(a) * rr;
        const y = py + Math.sin(a) * rr * squash;
        const na = a + 1.2;
        const l = sc * 0.09;
        ctx.moveTo(x - Math.cos(na) * l, y - Math.sin(na) * l * squash);
        ctx.lineTo(x + Math.cos(na) * l, y + Math.sin(na) * l * squash);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ gnawed_mending

/**
 * GNAWED_MENDING — "the knitting you should interrupt."
 * GRAMMAR REFUSAL: a working, not a blow — growth is hand-painted.
 * Three moss-green knot-lines spiral INWARD to the troll's wound
 * (converging is the tell: matter flowing INTO a body means stop it
 * now), each arrival popping a stitched cross-flash; a root-ring
 * rises underfoot; green swells up the body glow as the flesh takes.
 * Read from the receiving end: every second this runs, you lose one.
 */
const gnawed_mending: AbilitySig = {
  spawn(c) {
    // The intake breath: moss motes gather OUT of the air (inward).
    c.particles.burst(c.wx, c.wy - 0.8, 8, [c.st.mid, '#4c6a3a', c.st.core], {
      speed: -1.1, life: 0.8, size: 0.07, gravity: -0.3, drag: 1.6, shape: 'mote',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xc01);
    const out = 1 - cl((t - 0.8) / 0.2);
    ctx.save();
    // The root-ring: six gnarled root humps breaking soil around the
    // feet, each a two-stroke arch, rising on staggered clocks.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.3;
      const up = cl((t - k * 0.04) / 0.25);
      if (up <= 0) continue;
      const rr = sc * (0.55 + rand() * 0.15);
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      const h = sc * 0.14 * up;
      ctx.globalAlpha = 0.85 * out;
      ctx.strokeStyle = '#4c3a28';
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(x - sc * 0.08, y);
      ctx.quadraticCurveTo(x, y - h * 1.6, x + sc * 0.08, y);
      ctx.stroke();
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(x - sc * 0.05, y - h * 0.3);
      ctx.quadraticCurveTo(x, y - h * 1.3, x + sc * 0.05, y - h * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const out = 1 - cl((t - 0.8) / 0.2);
    ctx.save();
    // Three knot-lines spiraling INWARD to the wound (chest height),
    // hard-stepped in 5 segments each; a stitched cross-flash pops at
    // each arrival beat.
    const cy = py - sc * 0.9;
    for (let k = 0; k < 3; k++) {
      const u = (t * 2.2 + k * 0.33) % 1;
      const a0 = k * 2.1 + c.now / 1600;
      const rr = sc * 0.85 * (1 - u);
      ctx.globalAlpha = 0.8 * out;
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      for (let s = 0; s <= 5; s++) {
        const su = s / 5;
        const sa = a0 + u * 2.6 + su * 0.5;
        const sr = rr + sc * 0.22 * (1 - su) * (1 - u);
        const x = px + Math.cos(sa) * sr;
        const y = cy + Math.sin(sa) * sr * 0.55;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Arrival: the stitch takes.
      if (u > 0.92) {
        const g = Math.max(2, sc * 0.05);
        ctx.globalAlpha = 0.95 * out;
        ctx.fillStyle = st.core;
        ctx.fillRect(px - g / 2, cy - g * 2, g, g * 4);
        ctx.fillRect(px - g * 2, cy - g / 2, g * 4, g);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy - 0.8, 0.9, 0.25 * Math.sin(Math.min(1, t * 1.4) * Math.PI) * out);
  },
};

// ---------------------------------------------------- raise_the_fallen

/**
 * RAISE_THE_FALLEN — "the ground answers."
 * The chanter's word tears a grave-rift at its feet: a jagged
 * violet-black fissure steps open (hard widening, never a smooth
 * grow), the library's shadow door stands in it, pale tendrils lean
 * out, and bone chips LEVITATE off the floor on real height before
 * raining back down. Two grave-lights drift up and gutter. When the
 * dead arrive they arrive out of THIS — the rift is the door they
 * used. NOTE the clock: summon fx live 500ms flat (the arrival ring
 * is a moment, fxLife law) — the painted tear is quick and violent,
 * and the AFTERMATH persists through matter on its own clocks (the
 * door, the tendrils, the raining bone).
 */
const raise_the_fallen: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    shadow.deployments.door!(m, c.wx, c.wy, { scale: 0.8 });
    shadow.deployments.tendrils!(m, c.wx, c.wy, { scale: 0.6 });
    // Bone chips levitate: negative gravity first, then the rain.
    c.particles.burst(c.wx, c.wy, 10, ['#d8d4c8', '#b8b2a0', '#8a8478'], {
      speed: 0.4, life: 1.3, size: 0.06, gravity: 0, shape: 'shard', spin: 6,
      z: 0.05, vz: 1.9, zg: 3.2, land: 'settle', layer: 'world',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xd01);
    const openK = cl(t / 0.3);
    const out = 1 - cl((t - 0.7) / 0.3);
    ctx.save();
    // The rift: a jagged fissure stepping open in hard increments —
    // 3 width stages, never a tween. Two dark bands + a violet rim.
    const stage = Math.min(2, Math.floor(openK * 3));
    const w = sc * (0.12 + stage * 0.1);
    const len = sc * 1.15;
    const seg = 6;
    for (const [color, wk, off] of [
      ['#16101e', 1, 0],
      ['#2a2138', 0.55, 0],
      [st.mid, 0.12, -1],
    ] as const) {
      ctx.globalAlpha = (wk === 0.12 ? 0.8 : 0.95) * out;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let s = 0; s <= seg; s++) {
        const u = s / seg;
        const jag = (rand() - 0.5) * sc * 0.12;
        ctx.lineTo(px - len / 2 + u * len, py + off + (jag + Math.sin(u * 9) * sc * 0.03) * squash - w * wk * squash);
      }
      for (let s = seg; s >= 0; s--) {
        const u = s / seg;
        const jag = (rand() - 0.5) * sc * 0.12;
        ctx.lineTo(px - len / 2 + u * len, py + off + (jag + Math.sin(u * 7) * sc * 0.03) * squash + w * wk * squash);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Grave-light leaking up out of the seam: pale shafts leaning.
    const lean = Math.sin(c.now / 1100) * 0.1;
    for (let k = 0; k < 3; k++) {
      const x = px - len * 0.3 + k * len * 0.3;
      const h = sc * (0.5 + 0.15 * Math.sin(c.now / 700 + k * 2)) * openK;
      ctx.globalAlpha = 0.35 * out;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(x - sc * 0.03, py);
      ctx.lineTo(x - sc * 0.03 + lean * h, py - h);
      ctx.lineTo(x + sc * 0.05 + lean * h, py - h);
      ctx.lineTo(x + sc * 0.05, py);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 1.0, 0.25 * openK * out);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const out = 1 - cl((t - 0.7) / 0.3);
    ctx.save();
    // Two grave-lights drift up and gutter — slow, still, cold.
    for (let k = 0; k < 2; k++) {
      const u = (t * 1.1 + k * 0.5) % 1;
      const x = px + (k === 0 ? -1 : 1) * sc * 0.3 + Math.sin(u * 5 + k * 3) * sc * 0.08;
      const y = py - sc * (0.2 + u * 1.1);
      const a = Math.sin(u * Math.PI);
      const g = Math.max(2, sc * 0.055) * (1 - u * 0.4);
      ctx.globalAlpha = 0.8 * a * out;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(x, y, g, g * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.fillRect(x - g * 0.3, y - g * 0.8, g * 0.6, g * 1.1);
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- marrow_chill

/**
 * MARROW_CHILL — "the crypt walks out."
 * The champion plants its blade and the cold leaves it as a RING you
 * can count: a racing rime front, then six hoar-spikes jutting up at
 * the rim IN SEQUENCE (crystalline wedges, two facets each), then
 * the crumble — each spike shatters into true frost on its own beat
 * while a breath of grave-mist sinks back to the floor. Cold with
 * edges: the slow is drawn as architecture, not weather.
 */
const marrow_chill: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    frost.deployments.shatter!(m, c.wx, c.wy, { scale: 0.8 });
    frost.deployments.bloom!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.75 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // The rime front: one hard racing ring with a white lead edge.
    const f = cl(t / 0.24);
    if (f < 1) {
      const rr = rPx * (0.15 + 0.85 * f);
      ctx.globalAlpha = 0.8 * (1 - f * 0.4);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.1 * (1 - f * 0.4));
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
    // The rimed floor stays: a pale fern-cracked disc.
    const rimed = cl((t - 0.18) / 0.14);
    const fade = 1 - cl((t - 0.75) / 0.25);
    if (rimed > 0) {
      ctx.globalAlpha = 0.2 * rimed * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      const rand = srand(c.seed ^ 0xe01);
      ctx.globalAlpha = 0.5 * rimed * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const r0 = rPx * 0.2;
        const r1 = rPx * (0.6 + rand() * 0.3);
        ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
        ctx.lineTo(px + Math.cos(a + 0.15) * r1, py + Math.sin(a + 0.15) * r1 * squash);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xe02);
    ctx.save();
    // Six hoar-spikes jut up at the rim in sequence, stand a beat,
    // then crumble into TRUE frost each on its own clock.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.2;
      const delay = 0.1 + k * 0.045;
      const u = cl((t - delay) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const rise = cl(u / 0.25);
      const crumble = cl((u - 0.75) / 0.25);
      if (crumble >= 1) continue;
      const bx = px + Math.cos(a) * rPx * 0.88;
      const by = py + Math.sin(a) * rPx * 0.88 * squash;
      const h = sc * (0.38 + rand() * 0.14) * rise * (1 - crumble);
      const w = sc * 0.1;
      // Two facets: lit face + shadow face, one white crest tick.
      ctx.globalAlpha = 0.95 * (1 - crumble);
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx - w * 0.1, by - h);
      ctx.lineTo(bx, by + w * 0.3 * squash);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(bx + w, by);
      ctx.lineTo(bx - w * 0.1, by - h);
      ctx.lineTo(bx, by + w * 0.3 * squash);
      ctx.closePath();
      ctx.fill();
      const g = Math.max(1.5, sc * 0.03);
      ctx.fillStyle = st.core;
      ctx.fillRect(bx - w * 0.1 - g / 2, by - h - g, g, g * 1.6);
      // The crumble beat: one true frost pop as the spike lets go.
      if (crumble > 0 && crumble < 0.15 && Math.random() < c.frameDt * 20) {
        frost.deployments.shatter!(asMatter(c),
          c.wx + Math.cos(a) * c.radius * 0.88,
          c.wy + Math.sin(a) * c.radius * 0.88 * squash,
          { scale: 0.25 });
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.2 * (1 - t));
  },
};

// ------------------------------------------------------- rending_lunge

/**
 * RENDING_LUNGE — "through you, jaws first."
 * The packlord's dash is written on the ground as a triple claw-rake:
 * three parallel gouges tearing open along the path in real time
 * (the library's dust gouges the earth at each third), fur-tuft
 * flecks shed off the blur, and the terminus is a double crescent
 * jaw-snap flash with true blood spatter past it — the bite told at
 * the exact point it closed.
 */
const rending_lunge: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The earth pays along the path: gouged at launch, midway, arrival.
    for (const u of [0.1, 0.5, 0.9]) {
      dust.deployments.gouge!(m,
        c.wx + (c.wx2 - c.wx) * u,
        c.wy + (c.wy2 - c.wy) * u,
        { scale: 0.4 });
    }
    // The bite: true blood, thrown FORWARD past the terminus.
    blood.deployments.spatter!(m, c.wx2, c.wy2, { scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0xf01);
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const fade = 1 - cl((t - 0.55) / 0.45);
    ctx.save();
    // Three claw gouges tearing open with the dash — each a jagged
    // 5-segment line, offset across the path, dark with a lit lip.
    const tear = cl(t / 0.2);
    for (let k = -1; k <= 1; k++) {
      const off = k * sc * 0.14;
      for (const [color, w, lift] of [
        ['#2c2418', 0.055, 0],
        [st.mid, 0.02, -1.5],
      ] as const) {
        ctx.globalAlpha = (w > 0.03 ? 0.85 : 0.5) * fade;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, sc * w);
        ctx.beginPath();
        for (let s = 0; s <= 5; s++) {
          const u = (s / 5) * tear;
          const jag = (rand() - 0.5) * sc * 0.05;
          const x = px + dx * u + nx * (off + jag) ;
          const y = py + dy * u + ny * (off + jag) + lift;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px2, py2, dir } = c;
    ctx.save();
    // The jaw-snap: two crescents closing at the terminus — open on
    // arrival, SNAPPED shut two frames later, then gone.
    const snap = cl((t - 0.12) / 0.1);
    const gone = cl((t - 0.4) / 0.15);
    if (gone < 1) {
      const gap = sc * 0.3 * (1 - snap);
      const r = sc * 0.34;
      ctx.globalAlpha = 0.95 * (1 - gone);
      for (const side of [-1, 1] as const) {
        const cxp = px2 + Math.cos(dir + Math.PI / 2) * side * gap;
        const cyp = py2 + Math.sin(dir + Math.PI / 2) * side * gap * 0.6;
        ctx.strokeStyle = side < 0 ? st.core : st.mid;
        ctx.lineWidth = Math.max(2, sc * 0.07);
        ctx.beginPath();
        ctx.arc(cxp, cyp, r, dir + side * 0.5 - 0.9, dir + side * 0.5 + 0.9);
        ctx.stroke();
        // Three teeth ticks on each crescent.
        ctx.lineWidth = Math.max(1.5, sc * 0.035);
        for (let s = -1; s <= 1; s++) {
          const ta = dir + side * 0.5 + s * 0.55;
          ctx.beginPath();
          ctx.moveTo(cxp + Math.cos(ta) * r, cyp + Math.sin(ta) * r);
          ctx.lineTo(cxp + Math.cos(ta) * (r - sc * 0.09 * side), cyp + Math.sin(ta) * (r - sc * 0.09 * side));
          ctx.stroke();
        }
      }
    }
    // Fur tufts shed off the blur while the dash runs.
    if (t < 0.25 && Math.random() < c.frameDt * 22) {
      const u = Math.random();
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * u, c.wy + (c.wy2 - c.wy) * u, 1,
        ['#7f6d4c', '#4e463c'],
        { speed: 0.5, life: 0.5, size: 0.05, gravity: 1.2, shape: 'mote', wobble: 1.2 },
      );
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ shrilling_dart

/**
 * SHRILLING_DART — "the scream that dives."
 * Sound made visible, then the bat through it: nested chevron rings
 * collapse ALONG the flight line ahead of the dart (the shriek
 * arriving before the wings), a stepped wedge afterimage train marks
 * the dive itself — four frozen bat-folds, newest darkest — and the
 * terminus is a single nick: one small true blood drip. Small, fast,
 * and entirely legible: the first enemy cast a new waker survives.
 */
const shrilling_dart: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The nick: the smallest honest blood in the game.
    blood.deployments.drip!(m, c.wx2, c.wy2, { scale: 0.3 });
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2, dir } = c;
    ctx.save();
    const dx = px2 - px;
    const dy = py2 - py;
    // The shriek: three chevron arcs racing ahead of the dive and
    // pinching shut — sonic rings drawn as hard nested arcs.
    for (let k = 0; k < 3; k++) {
      const u = cl(t * 2.4 - k * 0.18);
      if (u <= 0 || u >= 1) continue;
      const x = px + dx * u;
      const y = py + dy * u - sc * 0.5;
      const r = sc * (0.34 - k * 0.08) * (1 - u * 0.5);
      ctx.globalAlpha = 0.7 * (1 - u);
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * (0.045 - k * 0.01));
      ctx.beginPath();
      ctx.arc(x, y, r, dir - 0.75, dir + 0.75);
      ctx.stroke();
    }
    // The dive: four stepped bat-folds — a wedge with two wing barbs,
    // frozen at four moments along the line, newest darkest.
    const prog = cl(t / 0.4);
    for (let k = 3; k >= 0; k--) {
      const u = prog - k * 0.11;
      if (u <= 0) continue;
      const x = px + dx * u;
      const y = py + dy * u - sc * 0.5;
      const s = sc * 0.16 * (1 - k * 0.12);
      const alpha = (k === 0 ? 0.95 : 0.4 - k * 0.08) * (1 - cl((t - 0.5) / 0.3));
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = k === 0 ? '#241a2e' : st.deep;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath();
      ctx.moveTo(s * 1.4, 0);
      ctx.lineTo(-s * 0.6, -s * 1.1);
      ctx.lineTo(-s * 0.1, -s * 0.25);
      ctx.lineTo(-s * 0.8, 0);
      ctx.lineTo(-s * 0.1, s * 0.25);
      ctx.lineTo(-s * 0.6, s * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
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
};
