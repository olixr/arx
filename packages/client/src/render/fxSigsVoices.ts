/**
 * THE SIGNATURE LAW — the TEN VOICES wave.
 *
 * Ten bespoke set-pieces for the legendary chase staffs. Each staff
 * is the only mouth its Art ever speaks through, so each signature
 * is that staff's whole thesis restated at casting volume: the
 * forest filing its claim, dawn delivered sideways, the moon coming
 * down to visit, a crown holding court over a line of heads.
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

// ---------------------------------------------------------- wild_root

/**
 * WILD_ROOT — "the forest files a claim."
 * A root lattice crawls out from the heart and KEEPS the ground for
 * the field's whole life: dark woody runs with knuckle joints, sap
 * glints breathing at the joins, and at the center one sapling that
 * grows taller the longer the claim stands.
 */
const wild_root: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x31);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.4,
        c.wy + Math.sin(a) * c.radius * 0.4 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 1.2 + rand(), life: 0.6, size: 0.07, gravity: 4,
          dir: a, spread: 0.3, shape: 'leaf' in c.st ? 'glint' : 'glint',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    const rand = srand(c.seed ^ 0x32);
    ctx.save();
    ctx.lineCap = 'round';
    // The lattice: five root runs, each a two-segment crawl that
    // extends over the first third and then holds the ground.
    const grow = Math.min(1, t * 3);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.8;
      const bend = (rand() - 0.5) * 0.9;
      const r1 = c.rPx * (0.45 + rand() * 0.2) * grow;
      const r2 = c.rPx * (0.8 + rand() * 0.2) * grow;
      const x1 = c.px + Math.cos(a) * r1;
      const y1 = c.py + Math.sin(a) * r1 * squash;
      const x2 = c.px + Math.cos(a + bend * 0.3) * r2;
      const y2 = c.py + Math.sin(a + bend * 0.3) * r2 * squash;
      ctx.globalAlpha = 0.7 * (1 - t * 0.4);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2, c.sc * 0.055 * (1 - k * 0.06));
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // The knuckle at the joint, and the sap glint breathing on it.
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.arc(x1, y1, Math.max(1.5, c.sc * 0.04), 0, Math.PI * 2);
      ctx.fill();
      const sap = (Math.sin(c.now * 0.004 + k * 1.7) + 1) / 2;
      ctx.globalAlpha = 0.35 + 0.5 * sap * sap;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.arc(x1, y1, Math.max(1, c.sc * 0.022), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    // The sapling: a stem that gains a leaf pair at each third of
    // the field's life. The claim, growing bolder.
    const h = c.sc * (0.3 + t * 0.5);
    const x = c.px;
    const y0 = c.py;
    ctx.save();
    ctx.globalAlpha = 0.85 * (t > 0.85 ? (1 - t) / 0.15 : 1);
    ctx.strokeStyle = st.deep;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, c.sc * 0.035);
    const sway = Math.sin(c.now * 0.0032) * c.sc * 0.03;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.quadraticCurveTo(x + sway * 0.4, y0 - h * 0.6, x + sway, y0 - h);
    ctx.stroke();
    ctx.fillStyle = st.mid;
    const pairs = 1 + Math.floor(Math.min(0.99, t) * 3);
    for (let i = 0; i < pairs; i++) {
      const ly = y0 - h * (0.4 + i * 0.2);
      const lr = Math.max(1.5, c.sc * (0.055 - i * 0.01));
      for (const fs of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + sway * 0.6 + fs * lr * 1.3, ly, lr, lr * 0.55, fs * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.12);
  },
};

// ---------------------------------------------------------- day_breaks

/**
 * DAY_BREAKS — "the horizon comes indoors."
 * The beam is a delivered dawn: a gold corridor with shadow-lines
 * walking off it the way first light rakes a field, and at the far
 * end a small sun RISES over the course of the flash — up from the
 * ground, round, unreasonable, gone by full day.
 */
const day_breaks: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    const dx = c.px2 - c.px;
    const dy = c.py2 - c.py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    ctx.save();
    ctx.lineCap = 'round';
    // The corridor floor: one gold stripe, fading with the flash.
    ctx.globalAlpha = 0.55 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, c.sc * 0.16);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(c.px2, c.py2);
    ctx.stroke();
    // Shadow-lines raking off the corridor: dawn hitting fenceposts.
    const rand = srand(c.seed ^ 0x41);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.03);
    for (let k = 0; k < 5; k++) {
      const u = 0.15 + k * 0.17 + rand() * 0.05;
      const side = k % 2 === 0 ? 1 : -1;
      const reach = c.sc * (0.3 + rand() * 0.3) * (1 - t * 0.5);
      ctx.globalAlpha = 0.5 * (1 - t);
      ctx.beginPath();
      ctx.moveTo(c.px + dx * u, c.py + dy * u);
      ctx.lineTo(c.px + dx * u + nx * reach * side, c.py + dy * u + ny * reach * side);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    // The sunrise at the terminus: the disc climbs its own diameter
    // over the flash, cresting out of the ground line.
    const r = c.sc * 0.22;
    const rise = Math.min(1, t * 2.2);
    const sx = c.px2;
    const sy = c.py2 - r * rise;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - Math.max(0, t - 0.6) / 0.4);
    // Below the ground line the disc is clipped by the world: fake
    // it with a rect knock-out — hard edges only.
    ctx.beginPath();
    ctx.rect(sx - r * 2, sy - r * 2, r * 4, r * 2 + r * (2 * rise));
    ctx.clip();
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx - r * 0.25, sy - r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.9, 0.3 * (1 - t));
  },
};

// ------------------------------------------------------------ moonfall

/**
 * MOONFALL — "the tide comes down."
 * The borrowed moon lands and SETTLES: a moon-glass disc sinks into
 * the crater over the aftermath while three phase crescents walk
 * the rim — new to full — and cold fog beads roll off the edge.
 */
const moonfall: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x51);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.6,
        c.wy + Math.sin(a) * c.radius * 0.6 * c.squash,
        1, [c.st.core, c.st.mid], {
          speed: 1 + rand() * 0.8, life: 0.6, size: 0.06, gravity: 2,
          dir: a, spread: 0.2, shape: 'glint',
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    // The settling disc: full brightness at landing, sinking to a
    // pale watermark by the end.
    const r = c.rPx * (0.55 - t * 0.12);
    ctx.globalAlpha = 0.75 * (1 - t * 0.7);
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9 * (1 - t * 0.5);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r * 0.55, r * 0.55 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Three phase crescents walking the rim, waxing as they go.
    const rimR = c.rPx * 0.95;
    for (let i = 0; i < 3; i++) {
      const a = c.now * 0.0016 + (i * Math.PI * 2) / 3;
      const mx = c.px + Math.cos(a) * rimR;
      const my = c.py + Math.sin(a) * rimR * squash;
      const mr = Math.max(2, c.sc * 0.05);
      const phase = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
      ctx.globalAlpha = 0.8 * (1 - t);
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2);
      // The lit fraction grows with the walk — waxing.
      ctx.ellipse(mx, my, mr * Math.abs(1 - phase * 2), mr, 0, Math.PI / 2, -Math.PI / 2, phase < 0.5);
      ctx.fill();
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- shearwind

/**
 * SHEARWIND — "the spindle lets go."
 * One coil comes off the spool and unwinds ACROSS the radius in a
 * single released sweep — a spiral stroke that was wound tight at
 * the heart and is straight by the rim — while lint-sparks shed off
 * its outer edge and flattened grass streaks lie down radially.
 */
const shearwind: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x61);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy, 1, [c.st.core, c.st.mid], {
        speed: 3 + rand() * 2, life: 0.45, size: 0.05, gravity: 0,
        dir: a, spread: 0.1, drag: 0.5, shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    ctx.lineCap = 'round';
    // The released coil: a spiral whose winding count FALLS as t
    // rises — three turns at birth, a straight fling at death.
    const turns = 2.6 * (1 - t) + 0.3;
    const steps = 26;
    ctx.globalAlpha = 0.8 * (1 - t * 0.6);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, c.sc * 0.06 * (1 - t * 0.4));
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const a = c.dir + u * turns * Math.PI * 2 + t * 2;
      const r = c.rPx * (0.1 + u * 0.9) * (0.4 + t * 0.6);
      const x = c.px + Math.cos(a) * r;
      const y = c.py + Math.sin(a) * r * squash;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Flattened streaks: the grass the wind combed flat, radial.
    const rand = srand(c.seed ^ 0x62);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.03);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const r0 = c.rPx * (0.4 + rand() * 0.5);
      ctx.globalAlpha = 0.45 * (1 - t);
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(a) * r0 * 0.75, c.py + Math.sin(a) * r0 * 0.75 * squash);
      ctx.lineTo(c.px + Math.cos(a) * r0, c.py + Math.sin(a) * r0 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ the_molt

/**
 * THE_MOLT — "hand-delivered."
 * Each feather arrives POINT-FIRST and stamps itself: a brass quill
 * silhouette flashes at the hit, barbs raked back along the flight
 * line, then curls to ash from the tip while ember lint flutters
 * off the vane.
 */
const the_molt: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x71);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx, c.wy - 0.2, 1, [c.st.core, c.st.spark], {
        speed: 0.8 + rand(), life: 0.55, size: 0.06, gravity: -2,
        dir: -Math.PI / 2 + (rand() - 0.5) * 1.2, spread: 0.3,
        flicker: 0.4, wobble: 0.8, shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t } = c;
    // The stamp: a quill lying along the arrival line, burning off
    // from the tip — the drawn part SHRINKS from the point back.
    const burn = Math.min(1, t * 1.6);
    const len = c.sc * 0.5 * (1 - burn * 0.75);
    const a = c.dir + Math.PI; // tail points back where it came from
    ctx.save();
    ctx.translate(c.px, c.py);
    ctx.rotate(a);
    ctx.globalAlpha = 0.85 * (1 - t);
    ctx.fillStyle = st.mid;
    // Vane: two raked barb triangles off a spine.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.55, -c.sc * 0.09 * (1 - burn * 0.5));
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.55, c.sc * 0.09 * (1 - burn * 0.5));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, c.sc * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    // The burning tip: a hot bead eating its way down the spine.
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.5, c.sc * 0.035 * (1 - t * 0.5)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

// ----------------------------------------------------------- hollowing

/**
 * HOLLOWING — "the room leans in."
 * Nothing comes OUT of this one. Streaks lean inward from the rim
 * and shorten as they fall; crumb-motes slide down the slope of the
 * pull; the hole itself is a finished-dark disc wearing the one
 * pale ring that proves it is still there.
 */
const hollowing: AbilitySig = {
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    // The hole and its testimony ring.
    const r = c.rPx * 0.34;
    ctx.globalAlpha = 0.85 * (t > 0.85 ? (1 - t) / 0.15 : 1);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.03);
    ctx.globalAlpha *= 0.7 + 0.3 * Math.sin(c.now * 0.004);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r * 1.12, r * 1.12 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The leaning streaks: born at the rim, dying at the lip. Their
    // inward march rides the shared clock, staggered by index.
    ctx.strokeStyle = st.mid;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, c.sc * 0.032);
    const rand = srand(c.seed ^ 0x81);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const u = ((c.now * 0.0005 + k * 0.19) % 1 + 1) % 1;
      const rr = c.rPx * (1 - u * 0.62);
      const drawLen = c.sc * 0.16 * (1 - u * 0.5);
      ctx.globalAlpha = 0.55 * u * (t > 0.85 ? (1 - t) / 0.15 : 1);
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(a) * (rr + drawLen), c.py + Math.sin(a) * (rr + drawLen) * squash);
      ctx.lineTo(c.px + Math.cos(a) * rr, c.py + Math.sin(a) * rr * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    // Motes rise off the lip, think better of it, and bend back in.
    if (c.frameDt > 0 && Math.floor(c.now / 160) !== Math.floor((c.now - c.frameDt * 1000) / 160)) {
      const rand = srand(c.seed ^ (Math.floor(c.now / 160) & 0xffff));
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 0.7, life: 0.7, size: 0.05, gravity: 3.4,
          dir: -Math.PI / 2, spread: 0.3, drag: 0.4, shape: 'glint',
        },
      );
    }
    c.glow(c.wx, c.wy, c.radius * 0.6, 0.1);
  },
};

// ------------------------------------------------------------ red_toll

/**
 * RED_TOLL — "the cup is passed."
 * The chain's red seam runs heart to far end — but the BEADS travel
 * the wrong way, back toward the caster, because this line collects.
 * At the near end a chalice glyph fills a little more each frame.
 */
const red_toll: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x91);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx2, c.wy2 - 0.3, 1, [c.st.mid, c.st.core], {
        speed: 1 + rand(), life: 0.5, size: 0.06, gravity: 5,
        dir: rand() * Math.PI * 2, spread: 0.2,
      });
    }
  },
  ground(c) {
    const { ctx, st, t } = c;
    ctx.save();
    ctx.lineCap = 'round';
    // The seam.
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, c.sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(c.px2, c.py2);
    ctx.stroke();
    // The tribute beads, marching HOME (far → near).
    ctx.fillStyle = st.core;
    for (let k = 0; k < 3; k++) {
      const u = 1 - (((c.now * 0.0011 + k * 0.33) % 1 + 1) % 1);
      const x = c.px + (c.px2 - c.px) * u;
      const y = c.py + (c.py2 - c.py) * u;
      ctx.globalAlpha = 0.9 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, c.sc * (0.045 - u * 0.015)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    // The chalice glyph at the caster's end, filling as it drinks.
    const x = c.px;
    const y = c.py - c.sc * 0.5;
    const w = c.sc * 0.11;
    const h = c.sc * 0.14;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - Math.max(0, t - 0.7) / 0.3);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.024);
    ctx.beginPath();
    ctx.moveTo(x - w, y - h * 0.5);
    ctx.lineTo(x - w * 0.55, y + h * 0.25);
    ctx.lineTo(x + w * 0.55, y + h * 0.25);
    ctx.lineTo(x + w, y - h * 0.5);
    ctx.stroke();
    // The fill line climbing with t.
    const fill = Math.min(1, t * 1.4);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(x - w * (0.55 + 0.45 * fill), y + h * 0.25 - h * 0.75 * fill);
    ctx.lineTo(x - w * 0.55, y + h * 0.25);
    ctx.lineTo(x + w * 0.55, y + h * 0.25);
    ctx.lineTo(x + w * (0.55 + 0.45 * fill), y + h * 0.25 - h * 0.75 * fill);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

// --------------------------------------------------------------- axiom

/**
 * AXIOM — "proof by repetition."
 * Each pulse STAMPS a rotated square ring, and the stamps STAY —
 * by the third statement the ground holds three nested frames at
 * three angles, the argument visibly accumulated. Glyph ticks light
 * around whichever ring is currently being said.
 */
const axiom: AbilitySig = {
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    ctx.lineCap = 'round';
    // Which statement are we on? Three rings over the fx life.
    const said = Math.min(3, 1 + Math.floor(t * 3));
    for (let i = 0; i < said; i++) {
      const r = c.rPx * (0.38 + i * 0.28);
      const rot = i * 0.5 + c.now * 0.0002;
      const current = i === said - 1;
      ctx.globalAlpha = (current ? 0.85 : 0.4) * (1 - t * 0.5);
      ctx.strokeStyle = current ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, c.sc * (current ? 0.045 : 0.03));
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const a = rot + (k / 4) * Math.PI * 2;
        const x = c.px + Math.cos(a) * r;
        const y = c.py + Math.sin(a) * r * squash;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Corner glyphs on the ring being said.
      if (current) {
        ctx.fillStyle = st.spark;
        for (let k = 0; k < 4; k++) {
          const a = rot + (k / 4) * Math.PI * 2;
          const on = (Math.sin(c.now * 0.008 - k * 1.6) + 1) / 2;
          ctx.globalAlpha = 0.4 + 0.6 * on * on;
          ctx.beginPath();
          ctx.arc(c.px + Math.cos(a) * r, c.py + Math.sin(a) * r * squash, Math.max(1.5, c.sc * 0.03), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.6, 0.12 * (1 - t));
  },
};

// ---------------------------------------------------------- perihelion

/**
 * PERIHELION — "the visitor arrives."
 * A comet streak SLANTS in from high aside the crater — arrival,
 * not explosion — and for the aftermath the crater wears the orbit
 * it kept: a tilted ellipse scar with the last three tail beads
 * still cooling along it.
 */
const perihelion: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xa1);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(c.wx, c.wy - 0.2, 1, [c.st.core, c.st.spark], {
        speed: 2 + rand() * 2, life: 0.6, size: 0.07, gravity: 4,
        dir: a, spread: 0.2, trail: 8, trailColor: c.st.mid,
        shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    // The orbit scar: the ellipse the visitor kept, briefly written
    // on the ground it visited.
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.028);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.95, c.rPx * 0.5 * squash, -0.4, 0, Math.PI * 2);
    ctx.stroke();
    // Tail beads cooling along the scar behind the arrival point.
    ctx.fillStyle = st.core;
    for (let k = 0; k < 3; k++) {
      const a = -0.9 - k * 0.45;
      const x = c.px + Math.cos(a) * c.rPx * 0.95 * Math.cos(-0.4) - Math.sin(a) * c.rPx * 0.5 * squash * Math.sin(-0.4);
      const y = Math.cos(a) * c.rPx * 0.95 * Math.sin(-0.4) + Math.sin(a) * c.rPx * 0.5 * squash * Math.cos(-0.4) + c.py;
      ctx.globalAlpha = (0.7 - k * 0.18) * (1 - t);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, c.sc * (0.05 - k * 0.012)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    if (t > 0.45) return;
    // The arrival streak, standing slanted over the crater for the
    // first breath and burning off top-down.
    const u = t / 0.45;
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - u);
    ctx.lineCap = 'round';
    const x0 = c.px + c.sc * 0.9 * (1 - u * 0.3);
    const y0 = c.py - c.sc * 1.3 * (1 - u * 0.3);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, c.sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(c.px, c.py);
    ctx.stroke();
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(x0 * 0.4 + c.px * 0.6, y0 * 0.4 + c.py * 0.6);
    ctx.lineTo(c.px, c.py);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, 1, 0.35 * (1 - u));
  },
};

// ---------------------------------------------------------- crownstorm

/**
 * CROWNSTORM — "the court is seated."
 * A three-point gold crown hangs over the struck head — floating,
 * unworn, exactly as the staff carries it — and live arcs leash it
 * to the ground on the 90ms re-jag law while gold halo rings mark
 * where court convened.
 */
const crownstorm: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xb1);
    for (let k = 0; k < 6; k++) {
      c.particles.burst(c.wx, c.wy - 0.4, 1, [c.st.core, c.st.spark], {
        speed: 1.6 + rand(), life: 0.5, size: 0.05, gravity: 3,
        dir: rand() * Math.PI * 2, spread: 0.2, shape: 'glint',
      });
    }
  },
  ground(c) {
    const { ctx, st, t, squash } = c;
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, c.sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.5, c.rPx * 0.5 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t } = c;
    // The crown, hovering over the struck head.
    const x = c.px;
    const y = c.py - c.sc * (0.95 + Math.sin(c.now * 0.003) * 0.03);
    const w = c.sc * 0.16;
    const h = c.sc * 0.13;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - Math.max(0, t - 0.65) / 0.35);
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x - w, y - h * 0.45);
    ctx.lineTo(x - w * 0.5, y - h * 0.15);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w * 0.5, y - h * 0.15);
    ctx.lineTo(x + w, y - h * 0.45);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.arc(x, y - h, Math.max(1, c.sc * 0.022), 0, Math.PI * 2);
    ctx.fill();
    // The leash: one live arc crown → ground, re-jagged per 90ms.
    if (Math.sin(c.now * 0.012) > -0.1) {
      const seed = Math.floor(c.now / 90);
      const jag = (k: number): number =>
        Math.sin(seed * 12.9898 + k * 78.233) * c.sc * 0.08;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, c.sc * 0.022);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + jag(1), y + (c.py - y) * 0.4);
      ctx.lineTo(x + jag(2) * 0.6, y + (c.py - y) * 0.75);
      ctx.lineTo(c.px, c.py);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.25 * (1 - t));
  },
};

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
