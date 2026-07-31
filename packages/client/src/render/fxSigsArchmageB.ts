/**
 * THE SIGNATURE LAW — the ARCHMAGE wave, second half.
 *
 * Ten bespoke set-pieces for the heavy end of the archmage roster —
 * the late-game showpieces. Down here Arx stops asking the world
 * and starts TELLING it: venom that keeps chewing after it lands,
 * a window opened onto the place with no windows, noon thrown as a
 * spear, and at the very top the world itself parted at the seam
 * and welded shut again. Every signature keeps the three reads —
 * impact, aftermath, what the world remembers — in the grammar's
 * three strata.
 *
 * Same binding laws as every wave before: hard edges only, save/
 * restore discipline, squash on ground y-radii, air pieces lifted
 * ~0.4·sc, srand-deterministic geometry with frameDt-gated emission
 * as the only per-frame chance, ≤ ~60 path ops per hook per frame.
 * 120fps is a law. No signature shares a centerpiece with any other
 * file's — these are new sentences, not louder readings of old ones.
 */

import { shade } from './rig.js';
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

// --------------------------------------------------------- venom_lash

/**
 * VENOM_LASH — "the seething spatter."
 * Both serpents' spit lands as a constellation of green blots that
 * keep WORKING: each blot seethes on its own clock, popping bubble
 * glints and creeping a pale eaten rim outward while acrid threads
 * of vapor lean off the wet ground — venom that is still a mouth
 * after it has left the fang.
 */
const venom_lash: AbilitySig = {
  spawn(c: SigCtx) {
    // The spit sheet: heavy droplets thrown low, dragging green
    // micro-motes, drying dark where they land.
    const rand = srand(c.seed ^ 0xa1);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy - 0.25, 1, [c.st.mid, c.st.spark], {
        speed: 1.6 + rand() * 1.2, life: 0.5, size: 0.08, gravity: 8,
        dir: a, spread: 0.3, trail: 9, trailColor: c.st.mid,
        fade: c.st.deep, up: false,
      });
    }
    // The first acrid breath off the strike.
    c.particles.burst(c.wx, c.wy - 0.2, 3, [c.st.deep, c.st.mid], {
      speed: 0.5, life: 0.9, size: 0.1, gravity: -1.2, drag: 1.4,
      grow: 0.16, shape: 'puff', fade: c.st.deep, wobble: 0.6,
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa2);
    const rr = Math.max(c.rPx, sc * 0.9);
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    ctx.save();
    // The blot constellation: each splash seethes on its own clock —
    // a dark heart inside a pale eaten rim that creeps outward as
    // the venom chews.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const d = rr * (k === 0 ? 0 : 0.35 + rand() * 0.6);
      const bx = px + Math.cos(a) * d;
      const by = py + Math.sin(a) * d * squash;
      const s0 = sc * (0.1 + rand() * 0.1) * (k === 0 ? 1.6 : 1);
      const seethe = 0.75 + 0.25 * Math.sin(c.now / 170 + k * 2.7);
      const eat = 1 + t * 0.5; // the rim creeps out over the life
      ctx.globalAlpha = 0.7 * fade;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(bx, by, s0 * eat, s0 * eat * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85 * fade * seethe;
      ctx.fillStyle = k % 2 === 0 ? st.deep : shade(st.mid, -12);
      ctx.beginPath();
      ctx.ellipse(bx, by, s0 * 0.7, s0 * 0.7 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Bubbles pop off a random blot — the seethe made audible.
    if (Math.random() < c.frameDt * 10 * fade) {
      const a = Math.random() * Math.PI * 2;
      const d = (Math.random() * 0.7 * rr) / sc;
      c.particles.burst(c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d * squash, 1, [st.spark, st.core], {
        speed: 0.4, life: 0.35, size: 0.06, gravity: -2.2, shape: 'glint',
      });
    }
    c.glow(c.wx, c.wy, 0.9, 0.2 * fade);
  },
  air(c: SigCtx) {
    // Acrid threads lean off the wet ground — thin, staggering, brief.
    if (c.t < 0.8 && Math.random() < c.frameDt * 7 * (1 - c.t)) {
      const a = Math.random() * Math.PI * 2;
      const d = (Math.random() * 0.6 * Math.max(c.rPx, c.sc * 0.9)) / c.sc;
      c.particles.burst(c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d * c.squash - 0.15, 1, [c.st.mid, c.st.deep], {
        speed: 0.3, life: 0.8, size: 0.07, gravity: -1.6, drag: 1.2,
        grow: 0.1, shape: 'puff', fade: c.st.deep, wobble: 0.8,
      });
    }
  },
};

// ---------------------------------------------------------- magma_orb

/**
 * MAGMA_ORB — "the crusting-over."
 * Where the slow globe lands, liquid rock POOLS — and then the pool
 * tells its whole cooling life: dark crust plates skin across the
 * orange heart one by one while the seams between them stay molten,
 * spitting sparks up through every gap that hasn't closed, until
 * the last seam chokes shut and the stone goes quiet.
 */
const magma_orb: AbilitySig = {
  spawn(c: SigCtx) {
    // Slag gobbets slop out heavy and low, smoking as they fly.
    const rand = srand(c.seed ^ 0xa5);
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy - 0.2, 1, [c.st.mid, c.st.spark], {
        speed: 1.4 + rand() * 1.1, life: 0.6, size: 0.11, gravity: 9,
        dir: a, spread: 0.25, trail: 10, trailColor: c.st.deep,
        fade: c.st.deep, up: false,
      });
    }
    // The splash burns where it stands, briefly.
    c.particles.burst(c.wx, c.wy - 0.25, 4, [c.st.mid, c.st.core], {
      speed: 0.7, life: 0.5, size: 0.12, gravity: -2.8, shape: 'lick',
      flicker: 0.3, fade: c.st.deep, wobble: 0.4,
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa6);
    const rr = Math.max(c.rPx * 0.7, sc * 0.75);
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    // The pool: an orange heart with a white center, dimming as the
    // crust claims it.
    const heat = Math.max(0, 1 - t * 1.15);
    ctx.globalAlpha = (0.35 + 0.5 * heat) * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    if (heat > 0.25) {
      ctx.globalAlpha = (heat - 0.25) * fade;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.4, rr * 0.4 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crust plates skin over one by one — each a dark slab growing
    // in on its own clock; the seams between them keep the glow.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      const d = rr * (0.25 + rand() * 0.45);
      const grow = Math.min(1, Math.max(0, (t - 0.08 - k * 0.09) / 0.3));
      if (grow <= 0) continue;
      const s0 = sc * (0.14 + rand() * 0.1) * grow;
      const bx = px + Math.cos(a) * d;
      const by = py + Math.sin(a) * d * squash;
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = k % 2 === 0 ? shade(st.deep, -14) : st.deep;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a + (c.seed % 7) * 0.4);
      ctx.fillRect(-s0, -s0 * 0.6 * squash, s0 * 2, s0 * 1.2 * squash);
      ctx.restore();
      // The molten seam clings to the plate's trailing edge.
      if (heat > 0) {
        ctx.globalAlpha = heat * fade * (0.5 + 0.5 * Math.sin(c.now / 140 + k * 2.2));
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(1, sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * s0, by + Math.cos(a) * s0 * squash);
        ctx.lineTo(bx + Math.sin(a) * s0, by - Math.cos(a) * s0 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.9, 0.45 * heat * fade);
  },
  air(c: SigCtx) {
    // Sparks spit up through the seams that haven't closed yet — the
    // rate dies as the crust wins.
    const open = Math.max(0, 1 - c.t * 1.3);
    if (open > 0 && Math.random() < c.frameDt * 12 * open) {
      const a = Math.random() * Math.PI * 2;
      const d = (Math.random() * 0.5 * Math.max(c.rPx * 0.7, c.sc * 0.75)) / c.sc;
      c.particles.burst(c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d * c.squash, 1, [c.st.spark, c.st.core], {
        speed: 1.4, life: 0.4, size: 0.06, gravity: 5, up: true,
        flicker: 0.5, fade: c.st.deep,
      });
    }
  },
};

// ------------------------------------------------------- shatterfrost

/**
 * SHATTERFROST — "the closing floe-jaw."
 * The glacier bites down, literally: two arcs of jagged floe teeth
 * slide in from either side of the circle like an upper and lower
 * jaw, clamp shut across the middle with a white crush-flash, and
 * leave the bite line paved with pressed ice rubble — what the
 * grip caught, the grind keeps.
 */
const shatterfrost: AbilitySig = {
  spawn(c: SigCtx) {
    // Cold breath rolls off both closing jaws.
    const rand = srand(c.seed ^ 0xa9);
    for (let k = 0; k < 6; k++) {
      const side = k % 2 === 0 ? -1 : 1;
      const off = (rand() - 0.5) * c.radius * 1.2;
      c.particles.burst(c.wx + off, c.wy + side * c.radius * 0.7 * c.squash, 1, [c.st.mid, c.st.core], {
        speed: 0.7, life: 1.0, size: 0.12, gravity: 0.2, dir: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        spread: 0.5, drag: 1.6, grow: 0.2, shape: 'puff', fade: '#ffffff', wobble: 0.4, ground: true,
      });
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xaa);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The jaws travel: full gap at birth, shut at t = 0.45.
    const gap = rPx * 0.8 * Math.max(0, 1 - t / 0.45) * squash;
    const bit = t >= 0.45;
    ctx.save();
    // Two jaws of four floe teeth each, pointing at each other across
    // the bite line, each riding a thick floe band at its base.
    for (let j = 0; j < 2; j++) {
      const side = j === 0 ? -1 : 1; // north jaw, south jaw
      const baseY = py + side * (gap + sc * 0.1 * squash);
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.1);
      ctx.beginPath();
      ctx.moveTo(px - rPx * 0.72, baseY + side * sc * 0.16 * squash);
      ctx.lineTo(px + rPx * 0.72, baseY + side * sc * 0.16 * squash);
      ctx.stroke();
      ctx.fillStyle = j === 0 ? st.core : shade(st.mid, 16);
      for (let k = 0; k < 4; k++) {
        const bx = px + (k - 1.5) * rPx * 0.38 + (rand() - 0.5) * sc * 0.1;
        const w = sc * (0.11 + rand() * 0.05);
        const L = sc * (0.26 + rand() * 0.14) * squash;
        ctx.globalAlpha = 0.9 * fade;
        ctx.beginPath();
        ctx.moveTo(bx - w, baseY);
        ctx.lineTo(bx, baseY - side * L); // the tooth reaches for the other jaw
        ctx.lineTo(bx + w, baseY);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The crush: a white flash bar the instant the teeth meet, then
    // pressed rubble paves the bite line.
    if (bit) {
      if (t < 0.56) {
        ctx.globalAlpha = (1 - (t - 0.45) / 0.11) * 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - rPx * 0.7, py - Math.max(2, sc * 0.05), rPx * 1.4, Math.max(4, sc * 0.1));
      }
      ctx.fillStyle = st.core;
      for (let k = 0; k < 5; k++) {
        const bx = px + (rand() - 0.5) * rPx * 1.3;
        const by = py + (rand() - 0.5) * sc * 0.2 * squash;
        const s0 = sc * (0.05 + rand() * 0.06);
        ctx.globalAlpha = 0.75 * fade;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(rand() * Math.PI);
        ctx.fillRect(-s0, -s0 * 0.5, s0 * 2, s0);
        ctx.restore();
      }
    }
    ctx.restore();
    // Crushed ice sprays along the bite line the moment it closes.
    if (t >= 0.45 && t < 0.6 && Math.random() < c.frameDt * 26) {
      const off = ((Math.random() - 0.5) * rPx * 1.2) / sc;
      c.particles.burst(c.wx + off, c.wy, 1, ['#ffffff', st.core], {
        speed: 1.4, life: 0.5, size: 0.08, gravity: 3, up: true, shape: 'glint',
      });
    }
  },
  air(c: SigCtx) {
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * (1 - c.t));
  },
};

// -------------------------------------------------------- solar_lance

/**
 * SOLAR_LANCE — "the standing noon."
 * The spear does not fly — noon simply HAPPENS along the line: a
 * hairline of white snaps across the whole corridor, blooms into a
 * broad daylight band with vertical sun-shafts standing on it like
 * light through a torn roof, sun-coins dapple the ground below,
 * and when the noon burns off, a charred meridian stays.
 */
const solar_lance: AbilitySig = {
  spawn(c: SigCtx) {
    // Gold motes hang in the lit air the instant the line exists.
    const rand = srand(c.seed ^ 0xad);
    for (let k = 0; k < 6; k++) {
      const f = 0.15 + rand() * 0.75;
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f - 0.4, 1, [c.st.spark, c.st.core], {
        speed: 0.4, life: 0.9, size: 0.09, gravity: -0.4, drag: 1.6, shape: 'glint',
      });
    }
    // The far end takes the point of the spear.
    c.particles.burst(c.wx2, c.wy2 - 0.3, 6, [c.st.core, c.st.spark], {
      speed: 2.2, life: 0.35, size: 0.07, gravity: 2, shape: 'streak',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0xae);
    const dx = c.px2 - c.px, dy = c.py2 - c.py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const fade = 1 - t;
    ctx.save();
    // Sun-coins: dapple spots inside the corridor, each breathing on
    // its own clock — noon leaking through the world's canopy.
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 7; k++) {
      const f = 0.1 + rand() * 0.8;
      const side = (rand() - 0.5) * 2;
      const s0 = sc * (0.07 + rand() * 0.07);
      const breathe = 0.5 + 0.5 * Math.sin(c.now / 220 + k * 2.4);
      ctx.globalAlpha = 0.5 * fade * breathe;
      ctx.beginPath();
      ctx.ellipse(
        c.px + dx * f + nx * side * sc * 0.4,
        c.py + dy * f + ny * side * sc * 0.4,
        s0, s0 * squash, 0, 0, Math.PI * 2,
      );
      ctx.fill();
    }
    // The charred meridian: once noon passes its peak, the line it
    // stood on stays burnt into the ground.
    if (t > 0.35) {
      ctx.globalAlpha = Math.min(1, (t - 0.35) / 0.2) * 0.55 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(c.px2, c.py2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.6, 0.4 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0xaf);
    const lift = sc * 0.4;
    const x1 = c.px, y1 = c.py - lift;
    const x2 = c.px2, y2 = c.py2 - lift;
    const dx = x2 - x1, dy = y2 - y1;
    ctx.save();
    ctx.lineCap = 'butt';
    // The hairline: the first crack of noon, full length instantly.
    if (t < 0.08) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // The band: blooms wide fast, then narrows as the noon spends.
    const bloom = Math.min(1, t / 0.14);
    const spend = t < 0.55 ? 1 : Math.max(0, (1 - t) / 0.45);
    const w = Math.max(2, sc * 0.24 * bloom * (0.35 + 0.65 * spend));
    ctx.globalAlpha = 0.8 * spend;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * spend;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, w * 0.35);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Sun-shafts: vertical light standing ON the lance — noon comes
    // from overhead, and the line remembers where it fell from.
    ctx.fillStyle = st.core;
    for (let k = 0; k < 6; k++) {
      const f = 0.12 + (k / 6) * 0.78 + rand() * 0.04;
      const h = sc * (0.5 + rand() * 0.5);
      const shaftW = Math.max(1.5, sc * 0.045);
      const shimmer = 0.55 + 0.45 * Math.sin(c.now / 130 + k * 2.1);
      ctx.globalAlpha = 0.55 * spend * shimmer;
      ctx.fillRect(x1 + dx * f - shaftW / 2, y1 + dy * f - h, shaftW, h);
    }
    ctx.restore();
    // Burnt-off gold drifts up out of the cooling line.
    if (t > 0.5 && Math.random() < c.frameDt * 10 * spend) {
      const f = Math.random();
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f - 0.3, 1, [st.spark, st.core], {
        speed: 0.3, life: 0.7, size: 0.07, gravity: -1.4, drag: 1.2, shape: 'glint', wobble: 0.5,
      });
    }
  },
};

// ---------------------------------------------------------- rune_echo

/**
 * RUNE_ECHO — "the lit lettering."
 * The blast is an inscription READ ALOUD: a ring of angular rune
 * letters snaps alight one by one clockwise around the caster —
 * the first reading — then the whole sentence flares at once,
 * twice as bright, and sheds rising letter-motes as it fades:
 * the runes light in order, then again, louder.
 */
const rune_echo: AbilitySig = {
  spawn(c: SigCtx) {
    // The pen taps the page: one arcane pop at the center.
    c.particles.burst(c.wx, c.wy - 0.4, 4, [c.st.core, c.st.mid], {
      speed: 0.8, life: 0.5, size: 0.09, gravity: 0.3, drag: 1.8, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xb2);
    ctx.save();
    ctx.lineCap = 'butt';
    // Seven letters around the ring. Each has a lighting moment on
    // the first reading; the echo flares them ALL at t = 0.55.
    const n = 7;
    const flare = t >= 0.55 && t < 0.8 ? 1 - (t - 0.55) / 0.25 : 0;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 - Math.PI / 2 + (c.seed % 5) * 0.2;
      const lit = Math.min(1, Math.max(0, (t - 0.04 - k * 0.055) / 0.06));
      if (lit <= 0) continue;
      const bx = px + Math.cos(a) * rPx * 0.8;
      const by = py + Math.sin(a) * rPx * 0.8 * squash;
      const g = sc * 0.13;
      const rot = rand() * Math.PI;
      // Each letter: a stem, a crossing tick, a foot — angular,
      // seeded, no two alike.
      ctx.globalAlpha = (0.5 * lit + 0.5 * flare) * fade;
      ctx.strokeStyle = flare > 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * (0.035 + 0.03 * flare));
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -g);
      ctx.lineTo(0, g);
      ctx.moveTo(-g * 0.7, -g * (0.2 + rand() * 0.5));
      ctx.lineTo(g * 0.7, -g * 0.1);
      ctx.moveTo(0, g);
      ctx.lineTo(g * (rand() < 0.5 ? 0.6 : -0.6), g * 0.55);
      ctx.stroke();
      ctx.restore();
      // The letter's own light kisses the turf when it lights.
      if (lit < 1) {
        ctx.globalAlpha = (1 - lit) * 0.7;
        ctx.fillStyle = st.core;
        const p = sc * 0.05;
        ctx.fillRect(bx - p, by - p * squash, p * 2, p * 2 * squash);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 + 0.35 * flare);
  },
  air(c: SigCtx) {
    // The echo sheds: letter-motes rise off the inscription while
    // the second, louder reading burns.
    if (c.t >= 0.55 && c.t < 0.9 && Math.random() < c.frameDt * 14) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * c.squash - 0.2, 1, [c.st.core, c.st.mid], {
        speed: 0.4, life: 0.6, size: 0.08, gravity: -1.8, drag: 1.0, shape: 'glint', wobble: 0.4,
      });
    }
  },
};

// ------------------------------------------------------- marrow_pulse

/**
 * MARROW_PULSE — "the tolling rib-lantern."
 * A lantern built of curved rib staves stands over the caster with
 * a pale grave-flame inside; each pulse is a TOLL — the lantern
 * rocks on its hook, the flame jumps, bone chips shiver off the
 * staves, and a band of grave-light rolls outward along the ground
 * like the sound of a bell you feel instead of hear.
 */
const marrow_pulse: AbilitySig = {
  spawn(c: SigCtx) {
    // The clapper falls: chips shake loose off the staves.
    c.particles.burst(c.wx, c.wy - 0.9, 5, [c.st.mid, c.st.core], {
      speed: 0.9, life: 0.6, size: 0.08, gravity: 4, shape: 'shard', spin: 8, fade: c.st.deep,
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, squash, px, py, rPx, sc } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // The toll made visible: two grave-light bands roll outward, the
    // second a half-beat behind the first — the hum after the strike.
    for (let k = 0; k < 2; k++) {
      const tt = t - k * 0.18;
      if (tt <= 0) continue;
      const rr = rPx * Math.min(1, tt * 1.3);
      const a = Math.max(0, 1 - tt * 1.2) * (k === 0 ? 0.6 : 0.4);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * (0.05 - k * 0.015));
      ctx.setLineDash([sc * 0.2, sc * 0.09]);
      ctx.lineDashOffset = (c.seed % 11) * 2;
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // The lantern rocks once per toll: a decaying swing.
    const swing = Math.sin(t * Math.PI * 2.5) * 0.28 * (1 - t);
    const cy = py - sc * 1.05;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.translate(px, cy);
    ctx.rotate(swing);
    // Four rib staves: curved strokes bowing around the flame, a
    // cage that was once a chest.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    for (let k = 0; k < 4; k++) {
      const side = k < 2 ? -1 : 1;
      const rx = sc * (0.16 + (k % 2) * 0.1);
      ctx.globalAlpha = (0.85 - (k % 2) * 0.25) * fade;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, sc * 0.34, 0, side > 0 ? -Math.PI * 0.42 : Math.PI * 0.58, side > 0 ? Math.PI * 0.42 : Math.PI * 1.42);
      ctx.stroke();
    }
    // The grave-flame inside: a pale block that JUMPS on the toll
    // and settles between.
    const jump = 1 + Math.max(0, Math.sin(t * Math.PI * 2.5)) * 0.5 * (1 - t);
    const fw = sc * 0.09;
    const fh = sc * 0.2 * jump;
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.core;
    ctx.fillRect(-fw / 2, sc * 0.12 - fh, fw, fh);
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(-fw * 0.9, sc * 0.12 - fh * 0.5, fw * 1.8, fh * 0.5);
    ctx.restore();
    // Chips keep shivering off the staves while the lantern rocks.
    if (t < 0.5 && Math.random() < c.frameDt * 8) {
      c.particles.burst(c.wx + (Math.random() - 0.5) * 0.3, c.wy - 0.9, 1, [st.mid, st.deep], {
        speed: 0.5, life: 0.5, size: 0.06, gravity: 4.5, shape: 'shard', spin: 7,
      });
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.25 * (1 - t));
  },
};

// ---------------------------------------------------------- void_rift

/**
 * VOID_RIFT — "the inhaling window."
 * A jagged window lies OPEN in the ground for the field's whole
 * life, starlight from the place with no windows glinting inside
 * its frame — and everything nearby streams toward it: dashed
 * in-fall lanes march inward, loose matter is drawn over the sill
 * in long streaks, and the whole aperture breathes with each pull
 * until the frame snaps shut like a book.
 */
const void_rift: AbilitySig = {
  spawn(c: SigCtx) {
    // The tearing-open: dark matter is yanked INTO the new mouth.
    const rand = srand(c.seed ^ 0xb9);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.9,
        c.wy + Math.sin(a) * c.radius * 0.9 * c.squash,
        1, [c.st.mid, c.st.deep], {
          speed: 2.4, life: 0.5, size: 0.09, gravity: 0, dir: a + Math.PI,
          spread: 0.15, shape: 'streak', fade: c.st.deep,
        },
      );
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xba);
    // The window opens fast, holds, then snaps shut like a book.
    const open = t < 0.08 ? t / 0.08 : t > 0.94 ? (1 - t) / 0.06 : 1;
    // The breath: the aperture swells on the field's pull rhythm.
    const breath = 1 + 0.06 * Math.sin((c.age / 800) * Math.PI * 2);
    const ax = rPx * 0.55 * breath;
    const ay = rPx * 0.34 * squash * open * breath;
    ctx.save();
    // The frame and the far place: a jagged lens of night, star
    // specks winking inside — a window, not a whirlpool.
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = shade(st.deep, -30);
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const f = (k % 8) / 8;
      const a = f * Math.PI * 2;
      const jag = 0.82 + rand() * 0.3;
      const x = px + Math.cos(a) * ax * jag;
      const y = py + Math.sin(a) * ay * jag;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.stroke();
    if (open > 0.5) {
      ctx.fillStyle = st.core;
      for (let k = 0; k < 6; k++) {
        const sx = px + (rand() - 0.5) * ax * 1.3;
        const sy = py + (rand() - 0.5) * ay * 1.3;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(c.now / 260 + k * 2.9));
        const g = Math.max(1, sc * 0.03) * tw;
        ctx.globalAlpha = 0.85 * tw;
        ctx.fillRect(sx - g / 2, sy - g / 2, g, g);
      }
    }
    // In-fall lanes: dashed radials marching INWARD — the inhale
    // written on the ground.
    ctx.globalAlpha = 0.45 * open;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.03);
    ctx.setLineDash([sc * 0.12, sc * 0.16]);
    ctx.lineDashOffset = -c.now / 30; // dashes crawl toward the mouth
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + (c.seed % 7) * 0.3;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * rPx * 1.05, py + Math.sin(a) * rPx * 1.05 * squash);
      ctx.lineTo(px + Math.cos(a) * ax * 1.1, py + Math.sin(a) * ay * 1.5);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c: SigCtx) {
    // Loose matter goes over the sill: streaks drawn from the rim to
    // the mouth, all field long, heavier on each inhale.
    const breath = 0.5 + 0.5 * Math.sin((c.age / 800) * Math.PI * 2);
    if (c.t < 0.94 && Math.random() < c.frameDt * (8 + 12 * breath)) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * (0.8 + Math.random() * 0.3),
        c.wy + Math.sin(a) * c.radius * (0.8 + Math.random() * 0.3) * c.squash,
        1, [c.st.mid, c.st.deep, c.st.core], {
          speed: 2.6, life: 0.4, size: 0.07, gravity: 0, dir: a + Math.PI,
          spread: 0.1, shape: 'streak', fade: c.st.deep,
        },
      );
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.2 + 0.15 * breath);
  },
};

// --------------------------------------------------- eye_of_the_storm

/**
 * EYE_OF_THE_STORM — "the walking weather-wall."
 * The caster stands in a visibly CALM disc while the weather does
 * the walking around them: a curtain of slanted rain-strokes
 * marches around the rim, lightning ticks down onto the wall at a
 * fresh bearing every pulse, and the only quiet ground in the
 * whole circle is the exact spot the caster refuses to leave.
 */
const eye_of_the_storm: AbilitySig = {
  spawn(c: SigCtx) {
    // Thunder ticks the rim awake at three bearings.
    const rand = srand(c.seed ^ 0xbd);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85 * c.squash, 2, [c.st.spark, '#ffffff'], {
        speed: 1.2, life: 0.3, size: 0.06, gravity: 1.5, shape: 'streak',
      });
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xbe);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The weather-wall: slanted strokes marching around the rim —
    // rain with a wind behind it, going somewhere.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + c.now / 900;
      const rr = rPx * (0.78 + (k % 3) * 0.08);
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash;
      const slant = a + 2.3; // every stroke leans the same way — wind
      const L = sc * 0.17;
      ctx.globalAlpha = (0.4 + 0.25 * ((k * 7) % 3 === 0 ? 1 : 0)) * fade;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(slant) * L, by + Math.sin(slant) * L * squash);
      ctx.stroke();
    }
    // The calm: one clean pale ring around the still center — the
    // quietest ground in the circle.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.28, rPx * 0.28 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Lightning ticks the wall once per pulse, each at a fresh
    // bearing — the storm walking its perimeter.
    if (t > 0.22 && t < 0.4) {
      const a = rand() * Math.PI * 2;
      const bx = px + Math.cos(a) * rPx * 0.85;
      const by = py + Math.sin(a) * rPx * 0.85 * squash;
      const bt = 1 - (t - 0.22) / 0.18;
      ctx.globalAlpha = bt;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath();
      let jx = bx, jy = by - sc * 1.0;
      ctx.moveTo(jx, jy);
      for (let k = 0; k < 4; k++) {
        jx = bx + (rand() - 0.5) * sc * 0.24 * (1 - k / 4);
        jy = by - sc * 1.0 * (1 - (k + 1) / 4);
        ctx.lineTo(jx, jy);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    // Rim rain: slanted streaks fall ONLY on the wall — never a drop
    // on the eye.
    if (Math.random() < c.frameDt * 16 * (1 - c.t)) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * (0.7 + Math.random() * 0.25),
        c.wy + Math.sin(a) * c.radius * (0.7 + Math.random() * 0.25) * c.squash - 0.8,
        1, [c.st.mid, c.st.core], {
          speed: 2.6, life: 0.3, size: 0.07, gravity: 5, dir: Math.PI * 0.42,
          spread: 0.1, shape: 'streak',
        },
      );
    }
    c.glow(c.wx, c.wy, c.radius, 0.25 * (1 - c.t));
  },
};

// -------------------------------------------------------- red_eclipse

/**
 * RED_ECLIPSE — "the drinking disc."
 * For one heartbeat the moon is CLOSE: a dark disc slides over a
 * red corona hanging above the caster, and during totality the
 * circle pays tribute upward — red threads stream off the wounded
 * ground into the disc's underside. Its shadow sweeps the field
 * below, and when the moon lets go, one white diamond flashes at
 * the trailing limb before the sky remembers itself.
 */
const red_eclipse: AbilitySig = {
  spawn(c: SigCtx) {
    // The near-moon announces itself: red glints scatter at the rim.
    const rand = srand(c.seed ^ 0xc1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * c.squash, 1, [c.st.mid, c.st.spark], {
        speed: 0.5, life: 0.6, size: 0.08, gravity: 0.5, drag: 1.5, shape: 'glint',
      });
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, squash, px, py, rPx, sc } = c;
    const fade = 1 - t;
    ctx.save();
    // The umbra: the moon's shadow sweeps the circle west to east,
    // clipped to the field it darkens.
    ctx.beginPath();
    ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
    ctx.clip();
    const bandW = rPx * 1.1;
    const bx = px - rPx - bandW / 2 + (2 * rPx + bandW) * Math.min(1, t * 1.15);
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = shade(st.deep, -20);
    ctx.fillRect(bx - bandW / 2, py - rPx * squash - 2, bandW, rPx * 2 * squash + 4);
    ctx.restore();
    ctx.save();
    // The field keeps a thin blood-lit rim while the moon is near.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xc2);
    const cy = py - sc * 1.2;
    const R = sc * 0.4;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // The corona: the red ring that is about to be swallowed.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.09);
    ctx.beginPath();
    ctx.arc(px, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    // Totality's flare prongs: two hard red tongues off the limb.
    const total = t > 0.3 && t < 0.7;
    if (total) {
      ctx.fillStyle = st.spark;
      for (let k = 0; k < 2; k++) {
        const a = rand() * Math.PI * 2;
        const g = sc * (0.1 + rand() * 0.06);
        ctx.globalAlpha = 0.85 * (0.6 + 0.4 * Math.sin(c.now / 160 + k * 3));
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.lineTo(px + Math.cos(a + 0.16) * (R + g), cy + Math.sin(a + 0.16) * (R + g));
        ctx.lineTo(px + Math.cos(a + 0.32) * R, cy + Math.sin(a + 0.32) * R);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The moon itself: a dark disc sliding across — in, held, out.
    const slide =
      t < 0.3 ? 1 - t / 0.3
      : t < 0.7 ? 0
      : -(t - 0.7) / 0.3;
    const mx = px + slide * R * 2.4;
    ctx.globalAlpha = Math.min(1, fade * 1.4);
    ctx.fillStyle = shade(st.deep, -35);
    ctx.beginPath();
    ctx.arc(mx, cy, R * 0.96, 0, Math.PI * 2);
    ctx.fill();
    // The diamond: one white flash at the trailing limb as it lets go.
    if (t > 0.7 && t < 0.82) {
      const dt = 1 - (t - 0.7) / 0.12;
      const g = sc * 0.14 * dt;
      ctx.globalAlpha = dt;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - R - g / 2, cy - g * 2, g, g * 4);
      ctx.fillRect(px - R - g * 2, cy - g / 2, g * 4, g);
    }
    ctx.restore();
    // The drink: during totality the ground pays upward — red
    // threads stream off the rim into the disc's underside.
    if (total && Math.random() < c.frameDt * 18) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.7,
        c.wy + Math.sin(a) * c.radius * 0.7 * c.squash,
        1, [st.mid, st.spark], {
          speed: 1.8, life: 0.5, size: 0.07, gravity: -6, dir: -Math.PI / 2,
          spread: 0.3, shape: 'streak', trail: 6, trailColor: st.deep,
        },
      );
    }
    c.glow(c.wx, c.wy, c.radius, total ? 0.45 : 0.25 * fade);
  },
};

// --------------------------------------------------------- realm_rend

/**
 * REALM_REND — "the parted world."
 * The capstone: the ground itself is TORN along the whole corridor.
 * Two jagged lips gape into a lens of otherlight — the pale place
 * the splinter came from, stars and all — while torn-off shards of
 * the world's own fabric hang tilted over the wound. Then the
 * mending: a white weld-spark travels the seam end to end, zipping
 * the lips shut behind it and leaving a scarred line with branch
 * cracks the ground will remember until the light fades.
 */
const realm_rend: AbilitySig = {
  spawn(c: SigCtx) {
    // The tearing: shock slivers leap from the whole seam at once,
    // and both ends take a star-burst.
    const rand = srand(c.seed ^ 0xc5);
    for (let k = 0; k < 8; k++) {
      const f = 0.08 + rand() * 0.84;
      const side = k % 2 === 0 ? 1 : -1;
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1, [c.st.core, c.st.mid], {
        speed: 2.6, life: 0.4, size: 0.08, gravity: 1,
        dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx) + side * Math.PI / 2,
        spread: 0.3, shape: 'streak', fade: c.st.deep,
      });
    }
    c.particles.burst(c.wx, c.wy - 0.3, 5, ['#ffffff', c.st.spark], {
      speed: 1.4, life: 0.6, size: 0.1, gravity: 0.4, drag: 1.4, shape: 'glint',
    });
    c.particles.burst(c.wx2, c.wy2 - 0.3, 5, ['#ffffff', c.st.spark], {
      speed: 1.4, life: 0.6, size: 0.1, gravity: 0.4, drag: 1.4, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0xc6);
    const dx = c.px2 - c.px, dy = c.py2 - c.py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    // Open fast; the weld travels x1→x2 through the back half.
    const open = Math.min(1, t / 0.16);
    const weldF = t < 0.55 ? 0 : Math.min(1, (t - 0.55) / 0.38);
    const fade = t < 0.9 ? 1 : (1 - t) / 0.1;
    ctx.save();
    ctx.lineCap = 'butt';
    // The lens: nine stations, each with a seeded jag; the gap swells
    // toward mid-corridor and is zero behind the weld-spark.
    const N = 9;
    const hx: number[] = [];
    const hy: number[] = [];
    const gap: number[] = [];
    for (let k = 0; k < N; k++) {
      const f = k / (N - 1);
      const wide = Math.sin(f * Math.PI) * sc * 0.34;
      const jag = 0.7 + rand() * 0.6;
      const sealed = f < weldF ? 0 : 1;
      hx[k] = c.px + dx * f;
      hy[k] = c.py + dy * f;
      gap[k] = wide * jag * open * sealed * squash;
    }
    // The otherlight interior — the pale place showing through.
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(hx[0]!, hy[0]!);
    for (let k = 1; k < N; k++) ctx.lineTo(hx[k]! + nx * gap[k]!, hy[k]! + ny * gap[k]!);
    for (let k = N - 2; k >= 0; k--) ctx.lineTo(hx[k]! - nx * gap[k]!, hy[k]! - ny * gap[k]!);
    ctx.closePath();
    ctx.fill();
    // Stars of the far realm inside the widest reach of the wound.
    ctx.fillStyle = st.mid;
    for (let k = 0; k < 5; k++) {
      const f = 0.25 + rand() * 0.5;
      const gi = Math.floor(f * (N - 1));
      if (gap[gi]! < sc * 0.08) continue;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(c.now / 240 + k * 2.8));
      const g = Math.max(1, sc * 0.028) * tw;
      ctx.globalAlpha = 0.9 * tw * fade;
      ctx.fillRect(c.px + dx * f - g / 2 + nx * (rand() - 0.5) * gap[gi]!, c.py + dy * f - g / 2 + ny * (rand() - 0.5) * gap[gi]!, g, g);
    }
    // The lips: both torn edges, dark against the light between them.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    for (let s = 0; s < 2; s++) {
      const sg = s === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(hx[0]!, hy[0]!);
      for (let k = 1; k < N; k++) ctx.lineTo(hx[k]! + nx * gap[k]! * sg, hy[k]! + ny * gap[k]! * sg);
      ctx.stroke();
    }
    // The scar: behind the weld the seam is a single fused line.
    if (weldF > 0) {
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(c.px + dx * weldF, c.py + dy * weldF);
      ctx.stroke();
    }
    // Branch cracks: the ground took collateral, and keeps it.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.03);
    for (let k = 0; k < 4; k++) {
      const f = 0.15 + rand() * 0.7;
      const side = k % 2 === 0 ? 1 : -1;
      const L = sc * (0.2 + rand() * 0.25) * open;
      const bx = c.px + dx * f, by = c.py + dy * f;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (nx * side + ux * (rand() - 0.5)) * L, by + (ny * side + uy * (rand() - 0.5)) * L * squash);
      ctx.stroke();
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.8, 0.45 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0xc7);
    const dx = c.px2 - c.px, dy = c.py2 - c.py;
    const len = Math.hypot(dx, dy) || 1;
    ctx.save();
    // The first breath: a full-length white blade over the seam.
    if (t < 0.1) {
      ctx.globalAlpha = 1 - t / 0.1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py - sc * 0.15);
      ctx.lineTo(c.px2, c.py2 - sc * 0.15);
      ctx.stroke();
    }
    // Torn fabric: shards of the world hang tilted over the wound,
    // rising slowly, gone before the weld reaches them.
    const weldF = t < 0.55 ? 0 : Math.min(1, (t - 0.55) / 0.38);
    ctx.fillStyle = st.mid;
    for (let k = 0; k < 4; k++) {
      const f = 0.2 + rand() * 0.6;
      if (f < weldF) continue;
      const s0 = sc * (0.09 + rand() * 0.07);
      const rise = sc * (0.3 + rand() * 0.3) + t * sc * 0.5;
      const rot = rand() * Math.PI + t * (0.6 + rand());
      ctx.globalAlpha = 0.85 * Math.min(1, (1 - t) * 2);
      ctx.save();
      ctx.translate(c.px + dx * f, c.py + dy * f - rise);
      ctx.rotate(rot);
      ctx.fillRect(-s0, -s0 * 0.55, s0 * 2, s0 * 1.1);
      ctx.restore();
    }
    // The weld-spark: a white cross traveling the seam, sealing it.
    if (weldF > 0 && weldF < 1) {
      const bx = c.px + dx * weldF;
      const by = c.py + dy * weldF;
      const g = sc * 0.1 * (0.7 + 0.3 * Math.sin(c.now / 60));
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - g / 2, by - g * 2, g, g * 4);
      ctx.fillRect(bx - g * 2, by - g / 2, g * 4, g);
      ctx.restore();
      // Welding throws sparks where it bites.
      if (Math.random() < c.frameDt * 20) {
        const f = weldF;
        c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f - 0.15, 1, ['#ffffff', st.spark], {
          speed: 1.8, life: 0.35, size: 0.06, gravity: 4, up: true, shape: 'glint',
        });
      }
      return;
    }
    ctx.restore();
    // The open wound leaks: otherlight motes drift up out of the gap.
    if (t < 0.55 && Math.random() < c.frameDt * 12) {
      const f = 0.15 + Math.random() * 0.7;
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 1, [st.core, st.mid], {
        speed: 0.5, life: 0.8, size: 0.08, gravity: -1.6, drag: 1.1, shape: 'glint', wobble: 0.4,
      });
    }
  },
};

// ----------------------------------------------------------- registry

/**
 * The archmage roster's heavy half. The lead wires this table into
 * the master SIGNATURES registry — keys must match ability ids and
 * FX_STYLES faces exactly.
 */
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
