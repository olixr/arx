/**
 * THE SIGNATURE LAW — the twin school's voice.
 *
 * Eleven bespoke set-pieces for the dual-wield ladder, rebuilt to the
 * breath-wave bar: real forged knives with two-facet cheeks and lit
 * edges, filled smear wakes riding deep under-strokes, strike moments
 * that flash once and mean it, and ground aftermath that outlives the
 * cut. Same binding laws as fxSignatures.ts: hard edges, save/restore
 * hygiene, squash on the ground, srand-deterministic geometry,
 * frameDt-gated emission, ≤60 path ops per hook per frame.
 *
 * The school's grammar is TWIN STEEL: everything answers twice —
 * paired trails, mirrored strokes, crossed marks, counter-rotation.
 * Nothing in this file arrives alone, and no centerpiece is shared
 * with any other school.
 *
 * Matter stays lawful (ONE-VOICE): the blood the knives collect and
 * the dust a landing throws both route through the library. The steel
 * itself is the school's own paint.
 *
 * WIRE-LIFETIME LAW: 'buff' fx live a FIXED 750ms (ticks ignored, no
 * re-broadcast) — mirrored_hand and red_ribbons are ONE-CEREMONY
 * signatures, never held states. Flurries re-broadcast 'arc' per beat;
 * beat parity is read off bornAt (c.now - c.age) so the pair can
 * alternate diagonals across broadcasts that share a seed.
 */

import { srand, burstStarPath } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { blood, dust, asMatter } from './matter/index.js';
import { shade } from './rig.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** Which beat of a re-broadcast flurry this fx is: bornAt / cadence. */
function beatIndex(c: SigCtx, cadenceMs: number): number {
  return Math.floor((c.now - c.age) / cadenceMs);
}

/**
 * The school's brick: a REAL forged knife at screen (x,y), blade
 * running along angle a, total length L px. Two facet cheeks meeting
 * at the spine (dark below, steel above), a lit edge hairline, a deep
 * crossguard bar, leather grip, spark pommel. The art's identity rides
 * the light — the steel stays steel.
 */
function knife(c: SigCtx, x: number, y: number, a: number, L: number, alpha: number): void {
  const { ctx, st } = c;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const bl = L * 0.68; // blade length, tip forward
  const w = Math.max(2, L * 0.12);
  const tipX = x + dx * L * 0.5;
  const tipY = y + dy * L * 0.5;
  const heelX = tipX - dx * bl;
  const heelY = tipY - dy * bl;
  // The anchor: a dark silhouette dropped low so the steel separates
  // from any ground it hangs over (THE CONTRAST LAW).
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = shade('#b8bec8', -55);
  ctx.lineWidth = w * 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tipX + 2, tipY + 3);
  ctx.lineTo(heelX + 2, heelY + 3);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  // Dark cheek, below the spine.
  ctx.fillStyle = shade('#b8bec8', -30);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(heelX - nx * w, heelY - ny * w);
  ctx.lineTo(heelX, heelY);
  ctx.closePath();
  ctx.fill();
  // Steel cheek, above.
  ctx.fillStyle = '#c6ccd6';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(heelX + nx * w, heelY + ny * w);
  ctx.lineTo(heelX, heelY);
  ctx.closePath();
  ctx.fill();
  // The edge-light: a hairline down the lit cheek.
  ctx.strokeStyle = '#eef2f8';
  ctx.lineWidth = Math.max(1, L * 0.03);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(heelX + nx * w * 0.9, heelY + ny * w * 0.9);
  ctx.stroke();
  // Guard bar, grip, pommel.
  ctx.fillStyle = st.deep;
  ctx.beginPath();
  ctx.moveTo(heelX + nx * w * 1.5, heelY + ny * w * 1.5);
  ctx.lineTo(heelX - nx * w * 1.5, heelY - ny * w * 1.5);
  ctx.lineTo(heelX - nx * w * 1.5 - dx * L * 0.05, heelY - ny * w * 1.5 - dy * L * 0.05);
  ctx.lineTo(heelX + nx * w * 1.5 - dx * L * 0.05, heelY + ny * w * 1.5 - dy * L * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3c3128';
  ctx.lineWidth = Math.max(1.5, L * 0.055);
  ctx.beginPath();
  ctx.moveTo(heelX - dx * L * 0.06, heelY - dy * L * 0.06);
  ctx.lineTo(x - dx * L * 0.42, y - dy * L * 0.42);
  ctx.stroke();
  ctx.fillStyle = st.spark;
  ctx.beginPath();
  ctx.arc(x - dx * L * 0.47, y - dy * L * 0.47, Math.max(1.2, L * 0.04), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The knife's wake: a filled smear lens along angle a — the cut
 * hanging in the air as a VOLUME. A deep bed rides two px low, the
 * body fills over it, and a white leading edge lights the head half.
 */
function smear(
  c: SigCtx,
  x: number,
  y: number,
  a: number,
  L: number,
  w: number,
  alpha: number,
): void {
  const { ctx, st } = c;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const lens = (ox: number, oy: number, col: string): void => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - dx * L * 0.5 + ox, y - dy * L * 0.5 + oy);
    ctx.quadraticCurveTo(x + nx * w + ox, y + ny * w + oy, x + dx * L * 0.5 + ox, y + dy * L * 0.5 + oy);
    ctx.quadraticCurveTo(x - nx * w + ox, y - ny * w + oy, x - dx * L * 0.5 + ox, y - dy * L * 0.5 + oy);
    ctx.closePath();
    ctx.fill();
  };
  ctx.globalAlpha = alpha * 0.85;
  lens(0, 2.5, shade(st.mid, -34)); // the bed
  ctx.globalAlpha = alpha;
  lens(0, 0, st.mid);
  // White leading edge on the head half.
  ctx.strokeStyle = st.core;
  ctx.lineWidth = Math.max(1.2, w * 0.55);
  ctx.beginPath();
  ctx.moveTo(x + nx * w * 0.7, y + ny * w * 0.7);
  ctx.quadraticCurveTo(
    x + dx * L * 0.28 + nx * w * 0.5,
    y + dy * L * 0.28 + ny * w * 0.5,
    x + dx * L * 0.5,
    y + dy * L * 0.5,
  );
  ctx.stroke();
}

/**
 * TWIN_CUT — "the one-two."
 * Each beat of the pair stamps one cut, the answering beat arriving on
 * the OTHER diagonal so the two live frames cross into an X mid-air —
 * a real knife rides the head of each smear, and when the second word
 * lands the crossing point flashes a shear star. The ground keeps a
 * short pressed scuff under each stroke.
 */
const twin_cut: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd1);
    const side = beatIndex(c, 250) % 2 === 0 ? 1 : -1;
    for (let k = 0; k < 4; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.55,
        c.wy + Math.sin(c.dir) * c.radius * 0.55 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        {
          speed: 1.9 + rand() * 1.1,
          life: 0.32,
          size: 0.055,
          gravity: 4,
          dir: c.dir + side * (0.5 + rand() * 0.4),
          spread: 0.15,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { ctx, t, sc, dir } = c;
    if (t > 0.7) return;
    const f = t / 0.7;
    const side = beatIndex(c, 250) % 2 === 0 ? 1 : -1;
    const second = beatIndex(c, 250) % 2 === 1;
    ctx.save();
    // The cut: one diagonal of the X, a smear with a knife at its head.
    const cutA = dir + side * 0.55;
    const p = groundPt(c, c.rPx * (0.42 + 0.3 * Math.min(1, f * 1.6)), dir);
    const lift = sc * 0.58;
    smear(c, p.x, p.y - lift, cutA, sc * (1.45 - 0.2 * f), sc * 0.13, 0.95 * (1 - f * 0.8));
    knife(
      c,
      p.x + Math.cos(cutA) * sc * (0.62 + 0.14 * f),
      p.y - lift + Math.sin(cutA) * sc * (0.62 + 0.14 * f),
      cutA,
      sc * 0.75,
      0.95 * (1 - f * f),
    );
    // The second word: the crossing point flashes once, young only.
    if (second && t < 0.3) {
      ctx.globalAlpha = 0.95 * (1 - t / 0.3);
      ctx.fillStyle = c.st.spark;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - lift, sc * 0.32, sc * 0.12, 4, t * 2, 1);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.6, 0.2 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.12 || t > 0.85) return;
    const f = (t - 0.12) / 0.73;
    const side = beatIndex(c, 250) % 2 === 0 ? 1 : -1;
    const cutA = dir + side * 0.55;
    const p = groundPt(c, c.rPx * 0.55, dir);
    ctx.save();
    ctx.lineCap = 'round';
    // The pressed scuff: dark groove with a lit lip, under the stroke.
    ctx.globalAlpha = 0.7 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(cutA) * sc * 0.4, p.y - Math.sin(cutA) * sc * 0.4 * squash);
    ctx.lineTo(p.x + Math.cos(cutA) * sc * 0.4, p.y + Math.sin(cutA) * sc * 0.4 * squash);
    ctx.stroke();
    ctx.globalAlpha = 0.55 * (1 - f);
    ctx.strokeStyle = shade(st.mid, 10);
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(cutA) * sc * 0.34, p.y - Math.sin(cutA) * sc * 0.34 * squash - 1.5);
    ctx.lineTo(p.x + Math.cos(cutA) * sc * 0.34, p.y + Math.sin(cutA) * sc * 0.34 * squash - 1.5);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * HERON_STEP — "the two wakes."
 * The body went BETWEEN its own knives: a striding figure dissolves
 * along the path while two full smear wakes flank the stride and pinch
 * at the exit into a standing X of steel. The stride itself prints —
 * heel scuffs alternate left-right-left down the lane, and the toll
 * beads red where the edges collected it.
 */
const heron_step: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    for (const f of [0.35, 0.65]) {
      blood.deployments.spatter!(m,
        c.wx + (c.wx2 - c.wx) * f,
        c.wy + (c.wy2 - c.wy) * f,
        { scale: 0.2, radius: 0.2 });
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.8) return;
    const fade = 1 - t / 0.8;
    const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const lift = sc * 0.48;
    ctx.save();
    // Two wakes, one per hand — full smears converging on the exit.
    for (const s of [-1, 1]) {
      const off = sc * 0.3 * s;
      const mx = (c.px + c.px2) / 2 + nx * off * 0.6;
      const my = (c.py + c.py2) / 2 + ny * off * 0.6 - lift;
      const span = Math.hypot(c.px2 - c.px, c.py2 - c.py);
      smear(c, mx, my, a, span * 0.82, sc * (s < 0 ? 0.12 : 0.09), (s < 0 ? 0.9 : 0.7) * fade);
    }
    // The strider: a leaning figure dissolving mid-path, rim-lit.
    const ff = Math.min(1, t / 0.45);
    const bx = c.px + (c.px2 - c.px) * (0.25 + 0.5 * ff);
    const by = c.py + (c.py2 - c.py) * (0.25 + 0.5 * ff);
    const gone = Math.max(0, 1 - t / 0.7);
    if (gone > 0.05) {
      const dxa = Math.cos(a);
      const dya = Math.sin(a);
      ctx.globalAlpha = 0.95 * gone;
      ctx.fillStyle = shade(st.mid, -26);
      // Torso leaning into the stride.
      ctx.beginPath();
      ctx.moveTo(bx - dxa * sc * 0.21, by - dya * sc * 0.21 - sc * 0.36);
      ctx.lineTo(bx + dxa * sc * 0.18, by + dya * sc * 0.18 - sc * 0.94);
      ctx.lineTo(bx + dxa * sc * 0.39, by + dya * sc * 0.39 - sc * 0.86);
      ctx.lineTo(bx + dxa * sc * 0.03, by + dya * sc * 0.03 - sc * 0.29);
      ctx.closePath();
      ctx.fill();
      // Head, tucked low and forward.
      ctx.beginPath();
      ctx.arc(bx + dxa * sc * 0.34, by + dya * sc * 0.34 - sc * 1.0, sc * 0.14, 0, Math.PI * 2);
      ctx.fill();
      // The stride: one leg reaching, one driving.
      ctx.strokeStyle = shade(st.mid, -26);
      ctx.lineWidth = Math.max(2.5, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx - dxa * sc * 0.05, by - dya * sc * 0.05 - sc * 0.31);
      ctx.lineTo(bx + dxa * sc * 0.44, by + dya * sc * 0.44 - sc * 0.03);
      ctx.moveTo(bx - dxa * sc * 0.05, by - dya * sc * 0.05 - sc * 0.31);
      ctx.lineTo(bx - dxa * sc * 0.39, by - dya * sc * 0.39);
      ctx.stroke();
      // Rim light down the leading edge.
      ctx.globalAlpha = 0.85 * gone;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.2, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(bx + dxa * sc * 0.39, by + dya * sc * 0.39 - sc * 0.9);
      ctx.lineTo(bx + dxa * sc * 0.06, by + dya * sc * 0.06 - sc * 0.31);
      ctx.stroke();
    }
    // The pinch: past the exit the wakes cross into standing steel.
    if (t > 0.4) {
      const px = Math.min(1, (t - 0.4) / 0.15);
      for (const s of [-1, 1]) {
        knife(
          c,
          c.px2 + nx * s * sc * 0.06,
          c.py2 + ny * s * sc * 0.06 - lift,
          a + s * 0.5,
          sc * 0.7 * px,
          0.95 * fade,
        );
      }
      if (t < 0.62) {
        ctx.globalAlpha = 0.9 * (1 - (t - 0.4) / 0.22);
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        burstStarPath(ctx, c.px2, c.py2 - lift, sc * 0.28, sc * 0.11, 4, a, 1);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.9) return;
    const fade = t < 0.6 ? 1 : (0.9 - t) / 0.3;
    const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    const nx = -Math.sin(a);
    const ny = Math.cos(a) * squash;
    ctx.save();
    // Heel scuffs: left-right-left down the lane, pressed dark with a
    // lit toe edge — the stride printed on the world.
    for (let k = 0; k < 3; k++) {
      const f = 0.22 + k * 0.28;
      if (t < f * 0.5) continue; // prints appear as the stride passes
      const s = k % 2 === 0 ? 1 : -1;
      const hx = c.px + (c.px2 - c.px) * f + nx * s * sc * 0.16;
      const hy = c.py + (c.py2 - c.py) * f + ny * s * sc * 0.16;
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = shade(st.deep, -14);
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.15, sc * 0.075 * squash, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = shade(st.mid, 10);
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.ellipse(hx, hy - 1.5, sc * 0.13, sc * 0.065 * squash, a, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * CROSSED_THROW — "the crossing point."
 * The knives are projectiles; the signature is where one LANDS: an
 * X-flare snaps at the wound, then a real knife stands planted
 * tip-down, quivering over its own contact shadow with a hairline
 * crack running off the tip. Two throws, two wounds, two standing
 * knives — the pair separated but both still arguing.
 */
const crossed_throw: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd3);
    const back = rand() * Math.PI * 2;
    for (let k = 0; k < 2; k++) {
      c.particles.burst(c.wx, c.wy - 0.5, 1, [c.st.spark, c.st.core], {
        speed: 2.2 + rand() * 0.8,
        life: 0.3,
        size: 0.05,
        gravity: 3,
        dir: back + (rand() - 0.5) * 0.4,
        spread: 0.2,
        shape: 'glint',
      });
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0xd3);
    const base = rand() * Math.PI;
    const lean = (rand() - 0.5) * 0.5; // the planted knife's cant
    ctx.save();
    // The argument: an X-flare, young only.
    if (t < 0.16) {
      const f = t / 0.16;
      for (const s of [-1, 1]) {
        smear(c, c.px, c.py - sc * 0.42, base + s * 0.55, sc * 0.85 * (1 - f * 0.3), sc * 0.09, 0.9 * (1 - f));
      }
      ctx.globalAlpha = 0.95 * (1 - f);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, c.px, c.py - sc * 0.42, sc * 0.36, sc * 0.14, 5, base, 1);
      ctx.fill();
    }
    // The knife rocks in and stands: tip-down, canted, quivering.
    if (t > 0.06) {
      const settle = Math.min(1, (t - 0.06) / 0.16);
      const quiver = Math.sin(c.age / 26) * 0.14 * Math.max(0, 1 - (t - 0.06) / 0.5);
      const ang = Math.PI / 2 + lean * settle + quiver; // pointing down
      const drop = (1 - settle) * sc * 0.6;
      const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
      knife(c, c.px, c.py - sc * 0.46 - drop, ang, sc * 0.95, 0.95 * fade);
    }
    ctx.restore();
    if (t < 0.3) c.glow(c.wx, c.wy, 0.45, 0.22 * (1 - t / 0.3));
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.14 || t > 0.9) return;
    const fade = t > 0.65 ? (0.9 - t) / 0.25 : 1;
    const rand = srand(c.seed ^ 0xd3);
    const crackA = rand() * Math.PI * 2;
    ctx.save();
    // Contact shadow under the standing knife.
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = shade(st.deep, -18);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.2, sc * 0.1 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The hairline crack running off the tip, with a lit lip.
    const reach = Math.min(1, (t - 0.14) / 0.2);
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(
      c.px + Math.cos(crackA) * sc * 0.5 * reach,
      c.py + Math.sin(crackA) * sc * 0.5 * reach * squash,
    );
    ctx.stroke();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.mid, 14);
    ctx.lineWidth = Math.max(1.2, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(c.px + 1, c.py - 1.5);
    ctx.lineTo(
      c.px + Math.cos(crackA) * sc * 0.42 * reach + 1,
      c.py + Math.sin(crackA) * sc * 0.42 * reach * squash - 1.5,
    );
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * MIRRORED_HAND — "the glass step."
 * One ceremony, 750ms: a seam of silvered light opens beside the
 * caster, a pale glass knife steps OUT of it to join its bright twin
 * on the other flank, and the seam seals with a blink. For eight
 * breaths there is no off hand — the mirror lent one.
 */
const mirrored_hand: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const seamX = c.px + sc * 0.78;
    const foot = c.py;
    ctx.save();
    // The seam: opens 0→0.3, stands, seals 0.6→1.
    const open = t < 0.3 ? t / 0.3 : t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.3);
    if (open > 0.02) {
      const h = sc * 1.6 * open;
      // Deep bed band behind the light.
      ctx.globalAlpha = 0.65 * open;
      ctx.fillStyle = shade(st.deep, -14);
      ctx.fillRect(seamX - sc * 0.09, foot - h, sc * 0.18, h);
      // The silvered core.
      ctx.globalAlpha = 0.95 * open;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(seamX, foot);
      ctx.lineTo(seamX, foot - h);
      ctx.stroke();
      // Edge shimmer: two pale hairlines breathing on the vigil clock.
      ctx.globalAlpha = 0.6 * open * (0.6 + 0.4 * Math.sin(c.now / 90));
      ctx.strokeStyle = shade(st.mid, 18);
      ctx.lineWidth = Math.max(1.2, sc * 0.022);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(seamX + s * sc * 0.08, foot - h * 0.08);
        ctx.lineTo(seamX + s * sc * 0.08, foot - h * 0.94);
        ctx.stroke();
      }
    }
    // The step: the glass knife crosses from the seam to the off flank
    // while its bright twin holds the near side.
    const cross = t < 0.2 ? 0 : Math.min(1, (t - 0.2) / 0.45);
    const late = t > 0.85 ? (1 - t) / 0.15 : 1;
    // Bright twin, holding at the main-hand hip.
    knife(c, c.px - sc * 0.45, c.py - sc * 0.52, -Math.PI / 2 + 0.25, sc * 0.72, 0.95 * late);
    // The glass one: arcing across, pale, with a slight ripple.
    if (cross > 0) {
      const tx = seamX + (c.px + sc * 0.38 - seamX) * cross;
      const ty = c.py - sc * 0.52 - Math.sin(cross * Math.PI) * sc * 0.4 + Math.sin(c.now / 60) * 1.2 * (1 - cross);
      knife(c, tx, ty, -Math.PI / 2 - 0.25, sc * 0.72, (0.5 + 0.4 * cross) * late);
    }
    // The seal: a blink where the seam was, once.
    if (t > 0.86) {
      const f = (t - 0.86) / 0.14;
      ctx.globalAlpha = 0.95 * (1 - f);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, seamX, foot - sc * 0.6, sc * 0.28 * (1 - f * 0.4), sc * 0.1, 4, t * 3, 1);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.7, 0.2 * open);
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const fade = t > 0.7 ? (1 - t) / 0.3 : Math.min(1, t / 0.15);
    const seamX = c.px + sc * 0.78;
    ctx.save();
    // The spill: light pooling at the seam's foot.
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = shade(st.mid, 6);
    ctx.beginPath();
    ctx.ellipse(seamX, c.py, sc * 0.3, sc * 0.15 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.2, sc * 0.028);
    ctx.beginPath();
    ctx.ellipse(seamX, c.py, sc * 0.19, sc * 0.095 * squash, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // Two facing crescents at the caster's feet: the hands agreeing.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, sc * 0.42, sc * 0.42 * squash, 0, (s < 0 ? 0.6 : Math.PI + 0.6), (s < 0 ? Math.PI - 0.6 : Math.PI * 2 - 0.6));
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * TURNING_REEL — "the counter-round."
 * One full turn, both edges out — and no other ring in the game runs
 * both directions at once. Two ribbon crescents counter-chase at
 * different heights, a knife mass riding each head, and at the two
 * points where they pass each other the air sparks. The ground keeps a
 * double scoured ring with traveling nicks.
 */
const turning_reel: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd5);
    for (const s of [-1, 1]) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.8,
        c.wy + Math.sin(a) * c.radius * 0.8 * c.squash - 0.4,
        2,
        [c.st.spark, c.st.core],
        { speed: 1.8, life: 0.35, size: 0.05, gravity: 3, dir: a + (s * Math.PI) / 2, spread: 0.25, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.8) return;
    const fade = 1 - t / 0.8;
    const r = c.rPx * (0.5 + 0.45 * Math.min(1, t / 0.3));
    ctx.save();
    // Two ribbons, counter-chasing at their own heights.
    for (const s of [-1, 1]) {
      const lift = sc * (s < 0 ? 0.34 : 0.56);
      const a0 = s * (c.now / 105);
      const span = 1.5;
      const lo = s > 0 ? a0 : a0 - span;
      const hi = s > 0 ? a0 + span : a0;
      // The turf-racing shadow under the ribbon.
      ctx.globalAlpha = 0.3 * fade;
      ctx.strokeStyle = shade(st.deep, -14);
      ctx.lineWidth = Math.max(2, sc * 0.07);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r * 0.97, r * 0.97 * c.squash, 0, lo, hi);
      ctx.stroke();
      // Belly, body, and white leading edge.
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = shade(st.mid, -26);
      ctx.lineWidth = Math.max(3, sc * 0.1);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift + 2, r, r * c.squash, 0, lo, hi);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.075);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift, r, r * c.squash, 0, lo, hi);
      ctx.stroke();
      // The head: white edge + the knife mass riding it.
      const head = s > 0 ? a0 + span : a0 - span;
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      if (s > 0) ctx.ellipse(c.px, c.py - lift, r + sc * 0.03, (r + sc * 0.03) * c.squash, 0, head - 0.35, head);
      else ctx.ellipse(c.px, c.py - lift, r + sc * 0.03, (r + sc * 0.03) * c.squash, 0, head, head + 0.35);
      ctx.stroke();
      const hx = c.px + Math.cos(head) * r;
      const hy = c.py - lift + Math.sin(head) * r * c.squash;
      knife(c, hx, hy, head + (s > 0 ? Math.PI / 2 : -Math.PI / 2), sc * 0.58, 0.95 * fade);
    }
    // The pass points: the two heads meet where a0 ≡ -a0 — flash there.
    const meet = Math.abs(Math.cos(c.now / 105));
    if (meet > 0.94) {
      const k = (meet - 0.94) / 0.06;
      for (const base of [0, Math.PI]) {
        const p = groundPt(c, r, base);
        ctx.globalAlpha = 0.95 * k * fade;
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        burstStarPath(ctx, p.x, p.y - sc * 0.45, sc * 0.26, sc * 0.1, 4, c.now / 200, 1);
        ctx.fill();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.22 * fade);
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.15 || t > 0.9) return;
    const fade = t > 0.6 ? (0.9 - t) / 0.3 : 1;
    const r = c.rPx * 0.95;
    ctx.save();
    // The double scour: two concentric nick-rings, one per blade.
    for (const [rr, w] of [[r * 0.92, 0.035], [r, 0.045]] as const) {
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(1.5, sc * w);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Traveling nicks: chips riding both directions.
    const rand = srand(c.seed ^ 0xd5);
    for (let k = 0; k < 6; k++) {
      const s = k % 2 === 0 ? 1 : -1;
      const a = rand() * Math.PI * 2 + s * (c.now / 105);
      const rr = k % 2 === 0 ? r : r * 0.92;
      const p = groundPt(c, rr, a);
      ctx.globalAlpha = 0.7 * fade;
      ctx.fillStyle = shade(st.mid, 8);
      ctx.fillRect(p.x - 1.5, p.y - 1, 3, 2);
    }
    ctx.restore();
  },
};

/**
 * RED_RIBBONS — "the spool."
 * One ceremony, 750ms: two silk ribbons — one red, one pale steel —
 * whip once around the body in counter-spirals, twisting so their
 * undersides flash as they turn, then tie off at the sternum with a
 * knot glint. The red one lets a single true drop go mid-turn. The
 * hems sweep a brief drag ring into the dust.
 */
const red_ribbons: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t > 0.88 ? (1 - t) / 0.12 : 1;
    const lift = sc * 0.58;
    const wind = Math.min(1, t / 0.7); // the turn
    ctx.save();
    // Two ribbons as twisting banded silk: segments alternate lit face
    // and underside so the cloth reads as TURNING, not orbiting.
    const RED = '#c44a3a';
    const REDDK = '#7a2318';
    for (const s of [-1, 1]) {
      const base = s * (0.6 + wind * Math.PI * 2 * 0.9) + (s < 0 ? Math.PI : 0);
      const cols = s < 0 ? [RED, REDDK] : [shade(st.mid, 24), shade(st.mid, -18)];
      for (let k = 0; k < 5; k++) {
        const a0 = base - s * k * 0.42;
        const a1 = base - s * (k + 1) * 0.42;
        const r0 = sc * (0.66 + 0.07 * Math.sin(k * 1.9));
        const r1 = sc * (0.66 + 0.07 * Math.sin((k + 1) * 1.9));
        const drop0 = k * sc * 0.09 * s;
        const drop1 = (k + 1) * sc * 0.09 * s;
        const w0 = sc * 0.085 * (1 - k * 0.14);
        const x0 = c.px + Math.cos(a0) * r0;
        const y0 = c.py - lift + Math.sin(a0) * r0 * c.squash + drop0;
        const x1 = c.px + Math.cos(a1) * r1;
        const y1 = c.py - lift + Math.sin(a1) * r1 * c.squash + drop1;
        ctx.globalAlpha = (0.85 - k * 0.1) * fade;
        ctx.fillStyle = cols[k % 2]!;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - w0);
        ctx.lineTo(x1, y1 - w0 * 0.7);
        ctx.lineTo(x1, y1 + w0 * 0.7);
        ctx.lineTo(x0, y0 + w0);
        ctx.closePath();
        ctx.fill();
      }
      // The head: a bright tip glint leading the wind.
      const hx = c.px + Math.cos(base) * sc * 0.68;
      const hy = c.py - lift + Math.sin(base) * sc * 0.68 * c.squash;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = s < 0 ? shade(RED, 40) : st.core;
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(2, sc * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
    // The tie: both heads meet at the sternum and knot, once.
    if (t > 0.7) {
      const f = Math.min(1, (t - 0.7) / 0.18);
      ctx.globalAlpha = 0.95 * f * fade;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, c.px, c.py - lift, sc * 0.24 * (1 - f * 0.3), sc * 0.09, 4, f * 2, 1);
      ctx.fill();
    }
    ctx.restore();
    // The letting drop: one true bead, released as the red hem passes.
    const tPrev = t - (c.frameDt * 1000) / 750;
    if (tPrev < 0.45 && t >= 0.45) {
      blood.deployments.spatter!(asMatter(c), c.wx, c.wy, { scale: 0.14, radius: 0.12 });
    }
    c.glow(c.wx, c.wy, 0.6, 0.18 * fade);
  },
  ground(c) {
    const { ctx, t, sc, squash } = c;
    if (t < 0.2) return;
    const fade = t > 0.7 ? (1 - t) / 0.3 : 1;
    ctx.save();
    // The hem's drag ring: a thin swept circle, red-tinged.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade('#c44a3a', -24);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.68, sc * 0.68 * squash, 0, 0, Math.PI * 2 * Math.min(1, (t - 0.2) / 0.5));
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * SWALLOW'S_DIVE — "two points down."
 * The leap and the landing are two wires. Going up: twin wing-marks
 * climb off the launch while TWO shadows race along the ground,
 * converging on the landing point — the pair coming down together.
 * Landing: two real knives drive in point-first as a tight V, the
 * ground takes a V-trench with lit inner lips, and the knives stay
 * buried at the arms of the V, quivering.
 */
const swallows_dive: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') {
      for (const s of [-1, 1]) {
        c.particles.burst(c.wx, c.wy - 0.6, 2, [c.st.core, c.st.mid], {
          speed: 1.8, life: 0.4, size: 0.06, gravity: -2, dir: -Math.PI / 2 + s * 0.4, spread: 0.15, shape: 'streak',
        });
      }
      return;
    }
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.7 });
    for (const s of [-1, 1]) {
      c.particles.burst(c.wx + s * 0.2, c.wy - 0.2, 2, [c.st.spark, c.st.core], {
        speed: 2.6, life: 0.45, size: 0.07, gravity: 7, dir: -Math.PI / 2 + s * 0.5, spread: 0.2, shape: 'glint',
      });
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    ctx.save();
    if (c.kind !== 'blast') {
      // The climb: two wing-chevrons rising off the launch point.
      if (t < 0.85) {
        const f = t / 0.85;
        for (const s of [-1, 1]) {
          const wx = c.px + s * sc * 0.24 * (1 + f);
          const wy = c.py - sc * (0.55 + f * 1.1);
          ctx.globalAlpha = 0.9 * (1 - f * 0.85);
          ctx.strokeStyle = s < 0 ? st.core : shade(st.mid, 14);
          ctx.lineWidth = Math.max(2, sc * 0.07);
          ctx.beginPath();
          ctx.moveTo(wx - sc * 0.2, wy + sc * 0.13);
          ctx.lineTo(wx, wy);
          ctx.lineTo(wx + sc * 0.2, wy + sc * 0.13);
          ctx.stroke();
        }
      }
    } else if (t < 0.2) {
      // The strike: the V of steel coming down, still in the air.
      const f = t / 0.2;
      const drop = (1 - f) * sc * 1.3;
      for (const s of [-1, 1]) {
        knife(c, c.px + s * sc * 0.34 * f, c.py - sc * 0.5 - drop, Math.PI / 2 + s * 0.35, sc * 0.85, 0.95);
      }
      if (f > 0.7) {
        ctx.globalAlpha = 0.95 * (f - 0.7) / 0.3;
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        burstStarPath(ctx, c.px, c.py - sc * 0.15, sc * 0.42, sc * 0.16, 5, f, 1);
        ctx.fill();
      }
    } else {
      // Buried: the pair standing at the V's arms, quivering out.
      const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
      const quiver = Math.sin(c.age / 24) * 0.1 * Math.max(0, 1 - (t - 0.2) / 0.45);
      for (const s of [-1, 1]) {
        knife(
          c,
          c.px + s * sc * 0.34,
          c.py - sc * 0.4,
          Math.PI / 2 + s * (0.35 + quiver),
          sc * 0.78,
          0.95 * fade,
        );
      }
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (c.kind !== 'blast') {
      // The pair's shadows, racing to the mark and converging.
      if (t > 0.9) return;
      const f = Math.min(1, t / 0.8);
      const gx = c.px + (c.px2 - c.px) * f;
      const gy = c.py + (c.py2 - c.py) * f;
      const spreadV = (1 - f) * sc * 0.7 + sc * 0.16;
      const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
      const nx = -Math.sin(a);
      const ny = Math.cos(a) * squash;
      ctx.save();
      for (const s of [-1, 1]) {
        ctx.globalAlpha = 0.6 + 0.3 * f;
        ctx.fillStyle = shade(st.deep, -38);
        ctx.beginPath();
        ctx.ellipse(gx + nx * s * spreadV, gy + ny * s * spreadV, sc * (0.14 + 0.14 * f), sc * (0.07 + 0.07 * f) * squash, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    // The V-trench: two shear grooves meeting at the entry point.
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const rand = srand(c.seed ^ 0xd7);
    const a = rand() * Math.PI;
    ctx.save();
    for (const s of [-1, 1]) {
      const ang = a + s * 0.4;
      const ex = c.px + Math.cos(ang) * c.rPx * 0.68;
      const ey = c.py + Math.sin(ang) * c.rPx * 0.68 * squash;
      // The groove: filled dark wedge, wide at the mouth.
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = shade(st.deep, -18);
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(ex + Math.sin(ang) * sc * 0.08, ey - Math.cos(ang) * sc * 0.08 * squash);
      ctx.lineTo(ex - Math.sin(ang) * sc * 0.08, ey + Math.cos(ang) * sc * 0.08 * squash);
      ctx.closePath();
      ctx.fill();
      // Lit inner lip, young.
      if (t < 0.45) {
        ctx.globalAlpha = 0.85 * (1 - t / 0.45);
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(1.5, sc * 0.04);
        ctx.beginPath();
        ctx.moveTo(c.px, c.py);
        ctx.lineTo(c.px + Math.cos(a + s * 0.32) * c.rPx * 0.5, c.py + Math.sin(a + s * 0.32) * c.rPx * 0.5 * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

/**
 * THE_SHEARS — "the thread snaps."
 * Two REAL long blades close across the aim like shears around a
 * rivet — the pin glint holds the whole life — and the moment they
 * meet, the taut thread on the ground parts into two curled pieces
 * with pale cut ends that spring apart.
 */
const the_shears: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    if (t > 0.7) return;
    const close = Math.min(1, t / 0.3); // the blades meet at 0.3
    const fade = 1 - t / 0.7;
    const p = groundPt(c, c.rPx * 0.55, dir);
    const lift = sc * 0.5;
    ctx.save();
    // The blades: real steel, closing around the pivot — they stop
    // just short of flat so the crossed pair stays readable at rest.
    for (const s of [-1, 1]) {
      const gap = 0.09 + (1 - close) * 0.46;
      const ang = dir + s * gap;
      smear(c, p.x + Math.cos(ang) * sc * 0.1, p.y - lift + Math.sin(ang) * sc * 0.1, ang, sc * 0.7, sc * 0.07, 0.6 * fade * (1 - close));
      knife(c, p.x + Math.cos(ang) * sc * 0.46, p.y - lift + Math.sin(ang) * sc * 0.46, ang, sc * 0.9, 0.95 * fade);
    }
    // The rivet: the shears' pin, held the whole life.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.arc(p.x, p.y - lift, Math.max(2, sc * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = shade(st.deep, -8);
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    ctx.arc(p.x, p.y - lift, Math.max(3, sc * 0.075), 0, Math.PI * 2);
    ctx.stroke();
    // The snap: one star the frame they meet.
    if (close >= 1 && t < 0.42) {
      ctx.globalAlpha = 0.95 * (1 - (t - 0.3) / 0.12);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - lift, sc * 0.24, sc * 0.09, 5, dir, 1);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.6, 0.22 * fade);
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t > 0.85) return;
    const p = groundPt(c, c.rPx * 0.55, dir);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    ctx.lineCap = 'round';
    if (t < 0.3) {
      // The thread, taut, waiting to be read.
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(p.x - nx * sc * 0.34, p.y - ny * sc * 0.34);
      ctx.lineTo(p.x + nx * sc * 0.34, p.y + ny * sc * 0.34);
      ctx.stroke();
    } else {
      // Parted: two curls springing apart, pale cut ends.
      const f = (t - 0.3) / 0.55;
      const drift = sc * (0.06 + 0.16 * f);
      ctx.globalAlpha = 0.75 * (1 - f);
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      for (const s of [-1, 1]) {
        const bx = p.x + nx * s * drift;
        const by = p.y + ny * s * drift;
        ctx.beginPath();
        ctx.moveTo(bx + nx * s * sc * 0.02, by + ny * s * sc * 0.02);
        ctx.quadraticCurveTo(
          bx + nx * s * sc * 0.2,
          by + ny * s * sc * 0.2 - sc * 0.06 * f,
          bx + nx * s * sc * 0.26 - Math.cos(dir) * sc * 0.12 * f,
          by + ny * s * sc * 0.26 - Math.sin(dir) * sc * 0.12 * f * squash,
        );
        ctx.stroke();
        // The pale cut end: the fresh face of the parted thread.
        ctx.fillStyle = shade(st.mid, 22);
        ctx.beginPath();
        ctx.arc(bx + nx * s * sc * 0.02, by + ny * s * sc * 0.02, Math.max(1.2, sc * 0.028), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};

/**
 * STORM_OF_TWO — "the ring and its echo."
 * Every pulse rings twice: the strike ring — a real ribbon band with a
 * white leading edge — and its darker echo chasing half a step behind,
 * the off hand's answer laid over the main's. Between pulses, two
 * knife glints counter-circle the storm's calm eye, a clean swept disc
 * at the caster's feet.
 */
const storm_of_two: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.85) return;
    const fade = 1 - t / 0.85;
    const grow = Math.min(1, t / 0.35);
    const r = c.rPx * (0.3 + 0.7 * grow);
    ctx.save();
    // The eye: a clean swept calm at the center of the storm.
    ctx.globalAlpha = 0.2 * fade;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.55, sc * 0.55 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The strike ring: belly, body, white leading edge.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.mid, -28);
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py + 2, r, r * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade * (1 - grow * 0.5);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.2, sc * 0.028);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, r + sc * 0.045, (r + sc * 0.045) * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The echo: the off hand's ring, darker, half a step behind.
    const er = c.rPx * (0.3 + 0.7 * Math.min(1, Math.max(0, t - 0.14) / 0.35)) * 0.8;
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.mid, -18);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, er, er * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.75) return;
    const fade = 1 - t / 0.75;
    const lift = sc * 0.55;
    ctx.save();
    // Two knife glints counter-circling the eye, smear tails behind.
    for (const s of [-1, 1]) {
      const a = s * (c.now / 125) + (s < 0 ? Math.PI : 0);
      const px = c.px + Math.cos(a) * sc * 0.56;
      const py = c.py - lift + Math.sin(a) * sc * 0.56 * c.squash;
      smear(c, px - Math.cos(a + s * Math.PI / 2) * sc * 0.16, py - Math.sin(a + s * Math.PI / 2) * sc * 0.16, a + s * Math.PI / 2, sc * 0.44, sc * 0.05, 0.6 * fade);
      knife(c, px, py, a + s * Math.PI / 2, sc * 0.52, 0.95 * fade);
    }
    ctx.restore();
  },
};

/**
 * HUNDRED_HANDS — "count the hands."
 * Each beat of the flurry hangs one real knife in the air at its own
 * angle and height of the fan, a short smear behind it — beats
 * overlap, so mid-storm the caster stands inside four or five hanging
 * knives and the count keeps changing before the eye can finish it.
 * Every beat also scores its own groove into the ground fan.
 */
const hundred_hands: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xd9);
    c.particles.burst(c.wx, c.wy - 0.55, 2, [c.st.spark, c.st.core], {
      speed: 1.6 + rand() * 0.8,
      life: 0.3,
      size: 0.05,
      gravity: 3,
      dir: rand() * Math.PI * 2,
      spread: 0.4,
      shape: 'glint',
    });
  },
  air(c) {
    const { ctx, t, sc, dir } = c;
    if (t > 0.75) return;
    const f = t / 0.75;
    const bi = beatIndex(c, 125);
    const station = ((bi % 5) + 5) % 5;
    const fan = dir + (station - 2) * 0.3;
    const liftK = (bi % 3 + 3) % 3;
    const lift = sc * (0.5 + 0.24 * liftK);
    const p = groundPt(c, c.rPx * (0.4 + 0.07 * liftK), fan);
    ctx.save();
    // The hanging cut: smear first, the knife at its head, drifting
    // down a hair as it fades — the hand already gone.
    const cutA = fan + (station % 2 === 0 ? 0.35 : -0.35);
    smear(c, p.x, p.y - lift + f * sc * 0.08, cutA, sc * (1.15 - 0.18 * f), sc * 0.115, 0.9 * (1 - f * 0.8));
    knife(
      c,
      p.x + Math.cos(cutA) * sc * 0.44,
      p.y - lift + Math.sin(cutA) * sc * 0.44 + f * sc * 0.08,
      cutA,
      sc * 0.74,
      0.95 * (1 - f * f),
    );
    ctx.restore();
    c.glow(c.wx, c.wy, 0.7, 0.16 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.15 || t > 0.85) return;
    const f = (t - 0.15) / 0.7;
    const bi = beatIndex(c, 125);
    const station = ((bi % 5) + 5) % 5;
    const fan = dir + (station - 2) * 0.3;
    const p = groundPt(c, c.rPx * 0.45, fan);
    ctx.save();
    ctx.lineCap = 'round';
    // The score: this beat's groove in the fan, dark with a lit lip.
    ctx.globalAlpha = 0.75 * (1 - f);
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(2.2, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(fan) * sc * 0.22, p.y - Math.sin(fan) * sc * 0.22 * squash);
    ctx.lineTo(p.x + Math.cos(fan) * sc * 0.22, p.y + Math.sin(fan) * sc * 0.22 * squash);
    ctx.stroke();
    ctx.globalAlpha = 0.5 * (1 - f);
    ctx.strokeStyle = shade(st.mid, 10);
    ctx.lineWidth = Math.max(1, sc * 0.018);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(fan) * sc * 0.18, p.y - Math.sin(fan) * sc * 0.18 * squash - 1.2);
    ctx.lineTo(p.x + Math.cos(fan) * sc * 0.18, p.y + Math.sin(fan) * sc * 0.18 * squash - 1.2);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * TWO_ANSWERS — "the second word."
 * The page won off a champion. The first answer is a heavy gold-lit
 * cut; the second is its exact mirror a blink later — and together
 * they brand a gilded X into the ground, molten light standing in the
 * grooves before it cools. The drain rides home as gold motes.
 */
const two_answers: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xda);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.6,
        c.wy + Math.sin(c.dir) * c.radius * 0.6 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        {
          speed: 1.5 + rand() * 0.6,
          life: 0.45,
          size: 0.05,
          gravity: 0,
          dir: c.dir + Math.PI,
          spread: 0.25,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { ctx, t, sc, dir } = c;
    if (t > 0.7) return;
    const f = t / 0.7;
    const side = beatIndex(c, 150) % 2 === 0 ? 1 : -1;
    const second = beatIndex(c, 150) % 2 === 1;
    const p = groundPt(c, c.rPx * 0.5, dir);
    const lift = sc * 0.58;
    const cutA = dir + side * 0.5;
    ctx.save();
    // The answer: one heavy smear, a knife driving its head.
    smear(c, p.x, p.y - lift, cutA, sc * 1.55, sc * 0.15, 0.95 * (1 - f * 0.8));
    knife(
      c,
      p.x + Math.cos(cutA) * sc * (0.68 + 0.12 * f),
      p.y - lift + Math.sin(cutA) * sc * (0.68 + 0.12 * f),
      cutA,
      sc * 0.8,
      0.95 * (1 - f * f),
    );
    // The second word: when the mirror lands, the X flashes whole.
    if (second && t < 0.3) {
      ctx.globalAlpha = 0.95 * (1 - t / 0.3);
      ctx.fillStyle = c.st.spark;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y - lift, sc * 0.42, sc * 0.16, 4, t, 1);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.5, c.wy + Math.sin(dir) * c.radius * 0.5, 0.7, 0.24 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.12 || t > 0.9) return;
    const f = (t - 0.12) / 0.78;
    const p = groundPt(c, c.rPx * 0.5, dir);
    ctx.save();
    ctx.lineCap = 'round';
    // The brand: both diagonals stand once either beat is down — the
    // X belongs to the pair, not the beat.
    for (const s of [-1, 1]) {
      const a = dir + s * 0.5;
      // The groove, dark and pressed.
      ctx.globalAlpha = 0.75 * (1 - f * 0.8);
      ctx.strokeStyle = shade(st.deep, -16);
      ctx.lineWidth = Math.max(3, sc * 0.085);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(a) * sc * 0.42, p.y - Math.sin(a) * sc * 0.42 * squash);
      ctx.lineTo(p.x + Math.cos(a) * sc * 0.42, p.y + Math.sin(a) * sc * 0.42 * squash);
      ctx.stroke();
      // Molten gold standing in the groove, cooling first.
      ctx.globalAlpha = 0.9 * Math.max(0, 1 - f * 1.4);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.4, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(a) * sc * 0.34, p.y - Math.sin(a) * sc * 0.34 * squash);
      ctx.lineTo(p.x + Math.cos(a) * sc * 0.34, p.y + Math.sin(a) * sc * 0.34 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- registry

/**
 * The twin school's wave of THE SIGNATURE LAW — merged into the master
 * SIGNATURES table in fxSignatures.ts.
 */
export const DUALWIELD_SIGS: Record<string, AbilitySig> = {
  twin_cut,
  heron_step,
  crossed_throw,
  mirrored_hand,
  turning_reel,
  red_ribbons,
  swallows_dive,
  the_shears,
  storm_of_two,
  hundred_hands,
  two_answers,
};
