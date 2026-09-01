/**
 * THE SIGNATURE LAW — the wall's voice.
 *
 * Eleven bespoke set-pieces for the shield school plus the block law's
 * own rim spark, rebuilt to the breath-wave bar: real masonry with
 * side faces and foreshortened top planes, forged iron with heat in
 * it, ceremonies that build something and strike moments that land
 * like doors. Same binding laws as fxSignatures.ts: hard edges,
 * save/restore hygiene, squash on the ground, srand-deterministic
 * geometry, frameDt-gated emission, ≤60 path ops per hook per frame.
 *
 * The school's grammar is MASONRY AND IRON: laid courses, drawn
 * lines, flat planes with honest thickness — nothing here billows;
 * walls do not billow. The one library voice is set_the_wall's mortar
 * grit (small on purpose). rampart_break's stone keeps its dry v5
 * loft-land-hop physics without joining the library.
 *
 * WIRE-LIFETIME LAW: 'buff' fx live a FIXED 750ms — set_the_wall,
 * shield_roof, turned_blow, and unbroken are ONE-CEREMONY rites.
 * hold_the_line rides a real ticks-based 'field' wire and may hold.
 * wheel_of_iron speaks at its WOUND ('blast', no dir). shield_block's
 * 'block' wire lives 380ms and scales its radius by damage blocked.
 * champions_wall's pulse index reads off bornAt (c.now - c.age).
 */

import { shade } from './tint.js';
import { srand, burstStarPath } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function groundPt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

/** Which pulse of a re-broadcast wave this fx is: bornAt / cadence. */
function beatIndex(c: SigCtx, cadenceMs: number): number {
  return Math.floor((c.now - c.age) / cadenceMs);
}

/**
 * The school's brick, forged honest: a standing stone block with a
 * front face (darker at the footing), a shadowed side face, a
 * foreshortened lit top plane, and a contact shadow seating it on the
 * ground. Flat value planes, never stroked outlines.
 */
function block(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  squash: number,
): void {
  const d = w * 0.32; // side depth
  // Contact shadow.
  ctx.fillStyle = shade(base, -40);
  ctx.beginPath();
  ctx.ellipse(x + d * 0.4, y + 1, w * 0.72, w * 0.3 * squash, 0, 0, Math.PI * 2);
  ctx.fill();
  // Side face, shadowed.
  ctx.fillStyle = shade(base, -26);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2 + d, y - d * 0.5);
  ctx.lineTo(x + w / 2 + d, y - h - d * 0.5);
  ctx.lineTo(x + w / 2, y - h);
  ctx.closePath();
  ctx.fill();
  // Front face: base value, darker footing course.
  ctx.fillStyle = base;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = shade(base, -12);
  ctx.fillRect(x - w / 2, y - h * 0.3, w, h * 0.3);
  // Top plane, foreshortened and lit.
  ctx.fillStyle = shade(base, 20);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h);
  ctx.lineTo(x - w / 2 + d, y - h - d * 0.5);
  ctx.lineTo(x + w / 2 + d, y - h - d * 0.5);
  ctx.lineTo(x + w / 2, y - h);
  ctx.closePath();
  ctx.fill();
}

/**
 * SHIELD_BASH — "the doorslam."
 * The blow is a DOOR with thickness: a slab of iron-bound board slams
 * out along the aim showing its face, its edge, and its top plane,
 * two motion ghosts hanging behind it. The displaced air leaves as
 * one RECTANGULAR ripple — nothing else in the game emits a square
 * wave — and the ground takes a blunt press stamp, not a cut.
 */
const shield_bash: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a1);
    for (let k = 0; k < 6; k++) {
      c.particles.burst(
        c.wx + Math.cos(c.dir) * c.radius * 0.7,
        c.wy + Math.sin(c.dir) * c.radius * 0.7 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        {
          speed: 2.2 + rand() * 1.2,
          life: 0.4,
          size: 0.07,
          gravity: 6,
          dir: c.dir + (rand() - 0.5) * 0.9,
          spread: 0.2,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc, dir } = c;
    if (t > 0.7) return;
    const f = t / 0.7;
    const drive = Math.min(1, f * 1.8);
    const reach = c.rPx * (0.3 + 0.6 * drive);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * c.squash;
    const lift = sc * 0.5;
    ctx.save();
    // Motion ghosts: where the door just was.
    for (const [lag, ga] of [[0.28, 0.25], [0.14, 0.45]] as const) {
      const gr = c.rPx * (0.3 + 0.6 * Math.max(0, drive - lag));
      const gp = groundPt(c, gr, dir);
      const gw = sc * 0.44;
      ctx.globalAlpha = ga * (1 - f);
      ctx.fillStyle = shade(st.mid, -18);
      ctx.beginPath();
      ctx.moveTo(gp.x + nx * gw, gp.y + ny * gw - lift);
      ctx.lineTo(gp.x - nx * gw, gp.y - ny * gw - lift);
      ctx.lineTo(gp.x - nx * gw * 0.88, gp.y - ny * gw * 0.88 - lift - sc * 0.62);
      ctx.lineTo(gp.x + nx * gw * 0.88, gp.y + ny * gw * 0.88 - lift - sc * 0.62);
      ctx.closePath();
      ctx.fill();
    }
    // The door itself: face, leading edge, top plane.
    const p = groundPt(c, reach, dir);
    const wHalf = sc * 0.52;
    const hTall = sc * 0.78;
    // Face.
    ctx.globalAlpha = 0.95 * (1 - f * 0.8);
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(p.x + nx * wHalf, p.y + ny * wHalf - lift);
    ctx.lineTo(p.x - nx * wHalf, p.y - ny * wHalf - lift);
    ctx.lineTo(p.x - nx * wHalf * 0.88, p.y - ny * wHalf * 0.88 - lift - hTall);
    ctx.lineTo(p.x + nx * wHalf * 0.88, p.y + ny * wHalf * 0.88 - lift - hTall);
    ctx.closePath();
    ctx.fill();
    // Iron banding: two dark straps across the face.
    ctx.globalAlpha = 0.75 * (1 - f * 0.8);
    ctx.strokeStyle = shade(st.mid, -30);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    for (const bandF of [0.3, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(p.x + nx * wHalf * 0.94, p.y + ny * wHalf * 0.94 - lift - hTall * bandF);
      ctx.lineTo(p.x - nx * wHalf * 0.94, p.y - ny * wHalf * 0.94 - lift - hTall * bandF);
      ctx.stroke();
    }
    // Top plane, foreshortened toward the throw.
    ctx.globalAlpha = 0.95 * (1 - f * 0.7);
    ctx.fillStyle = shade(st.mid, 22);
    const dx = Math.cos(dir) * sc * 0.12;
    const dy = Math.sin(dir) * sc * 0.12 * c.squash;
    ctx.beginPath();
    ctx.moveTo(p.x + nx * wHalf * 0.88, p.y + ny * wHalf * 0.88 - lift - hTall);
    ctx.lineTo(p.x - nx * wHalf * 0.88, p.y - ny * wHalf * 0.88 - lift - hTall);
    ctx.lineTo(p.x - nx * wHalf * 0.8 + dx, p.y - ny * wHalf * 0.8 - lift - hTall - sc * 0.07 + dy);
    ctx.lineTo(p.x + nx * wHalf * 0.8 + dx, p.y + ny * wHalf * 0.8 - lift - hTall - sc * 0.07 + dy);
    ctx.closePath();
    ctx.fill();
    // The hot meeting edge.
    ctx.globalAlpha = 0.95 * (1 - f);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(p.x + nx * wHalf, p.y + ny * wHalf - lift);
    ctx.lineTo(p.x - nx * wHalf, p.y - ny * wHalf - lift);
    ctx.stroke();
    // The square ripple: a rectangular pressure frame leaving the face.
    if (drive >= 1) {
      const rf = Math.min(1, (f - 0.55) / 0.45 + 0.25);
      const rr = sc * (0.2 + 0.55 * rf);
      const rp = groundPt(c, reach + rr * 0.8, dir);
      ctx.globalAlpha = 0.8 * (1 - rf);
      ctx.strokeStyle = shade(st.mid, 14);
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(rp.x + nx * rr, rp.y + ny * rr - lift - rr * 0.8);
      ctx.lineTo(rp.x + nx * rr, rp.y + ny * rr - lift + rr * 0.4);
      ctx.lineTo(rp.x - nx * rr, rp.y - ny * rr - lift + rr * 0.4);
      ctx.lineTo(rp.x - nx * rr, rp.y - ny * rr - lift - rr * 0.8);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * c.radius * 0.6, c.wy + Math.sin(dir) * c.radius * 0.6, 0.8, 0.26 * (1 - f));
  },
  ground(c) {
    const { ctx, st, t, sc, squash, dir } = c;
    if (t < 0.3 || t > 0.9) return;
    const f = (t - 0.3) / 0.6;
    const p = groundPt(c, c.rPx * 0.8, dir);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir) * squash;
    ctx.save();
    // The press stamp: a blunt rectangle, dark bed with a lit far lip.
    ctx.globalAlpha = 0.65 * (1 - f);
    ctx.fillStyle = shade(st.deep, -14);
    ctx.beginPath();
    ctx.moveTo(p.x + nx * sc * 0.42, p.y + ny * sc * 0.42);
    ctx.lineTo(p.x - nx * sc * 0.42, p.y - ny * sc * 0.42);
    ctx.lineTo(p.x - nx * sc * 0.42 + Math.cos(dir) * sc * 0.16, p.y - ny * sc * 0.42 + Math.sin(dir) * sc * 0.16 * squash);
    ctx.lineTo(p.x + nx * sc * 0.42 + Math.cos(dir) * sc * 0.16, p.y + ny * sc * 0.42 + Math.sin(dir) * sc * 0.16 * squash);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.5 * (1 - f);
    ctx.strokeStyle = shade(st.mid, 12);
    ctx.lineWidth = Math.max(1.2, sc * 0.028);
    ctx.beginPath();
    ctx.moveTo(p.x + nx * sc * 0.4 + Math.cos(dir) * sc * 0.16, p.y + ny * sc * 0.4 + Math.sin(dir) * sc * 0.16 * squash);
    ctx.lineTo(p.x - nx * sc * 0.4 + Math.cos(dir) * sc * 0.16, p.y - ny * sc * 0.4 + Math.sin(dir) * sc * 0.16 * squash);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * SET_THE_WALL — "the raised course."
 * One ceremony, 750ms: real stone blocks — faces, side planes, lit
 * tops — lay themselves in a broken ring around the planted feet,
 * first course then a second in running bond above the gaps, each
 * seating with a mortar pip. At the last block a white level-line
 * flashes across the top of the work: the mason's string, checked.
 */
const set_the_wall: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x5a2);
    const fade = t > 0.88 ? (1 - t) / 0.12 : 1;
    ctx.save();
    // First course: five blocks, laid 0→0.4 in order.
    const stations: Array<{ x: number; y: number; w: number; laid: number }> = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.35 + rand() * 0.25;
      const p = groundPt(c, c.rPx * (0.82 + rand() * 0.1), a);
      const w = sc * (0.3 + rand() * 0.09);
      const laidT = 0.04 + k * 0.08;
      stations.push({ x: p.x, y: p.y, w, laid: laidT });
      if (t < laidT) continue;
      const seat = Math.min(1, (t - laidT) / 0.07);
      const drop = (1 - seat) * sc * 0.35;
      const h = sc * (0.21 + rand() * 0.06);
      ctx.globalAlpha = 0.95 * fade;
      block(ctx, p.x, p.y - drop, w, h, k % 2 ? shade(st.deep, 6) : shade(st.deep, 16), squash);
      // The mortar pip the frame it seats.
      if (seat >= 1 && t < laidT + 0.13) {
        ctx.globalAlpha = 0.7 * (1 - (t - laidT - 0.07) / 0.06) * fade;
        ctx.strokeStyle = shade(st.mid, 10);
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, w * 0.7, w * 0.3 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Second course: running bond over the gaps, 0.34→0.66.
    for (let k = 0; k < 4; k++) {
      const laidT = 0.34 + k * 0.08;
      if (t < laidT) continue;
      const s0 = stations[k]!;
      const s1 = stations[(k + 1) % 5]!;
      const seat = Math.min(1, (t - laidT) / 0.07);
      const drop = (1 - seat) * sc * 0.35;
      const bx = (s0.x + s1.x) / 2;
      const by = (s0.y + s1.y) / 2;
      const h = sc * 0.15;
      ctx.globalAlpha = 0.95 * fade;
      block(ctx, bx, by - sc * 0.23 - drop, sc * 0.27, h, k % 2 ? shade(st.deep, 22) : shade(st.deep, 10), squash);
    }
    // The mason's string: one white level-line around the work, once.
    if (t > 0.72 && t < 0.88) {
      const f = (t - 0.72) / 0.16;
      ctx.globalAlpha = 0.9 * Math.sin(f * Math.PI) * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - sc * 0.34, c.rPx * 0.86, c.rPx * 0.86 * squash * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    // Mortar grit where fresh courses seat, early only — small on
    // purpose: walls do not billow.
    const tPrev = c.t - (c.frameDt * 1000) / 750;
    for (const gate of [0.1, 0.26, 0.42]) {
      if (tPrev < gate && c.t >= gate) {
        const rand = srand(c.seed ^ (0x5b0 + Math.floor(gate * 100)));
        const a = rand() * Math.PI * 2;
        dust.deployments.kick!(asMatter(c),
          c.wx + Math.cos(a) * c.radius * 0.85,
          c.wy + Math.sin(a) * c.radius * 0.85 * c.squash,
          { scale: 0.25 });
      }
    }
  },
};

/**
 * SHIELD_RUSH — "the bow wave."
 * A heater-plate prow drives the line edge-on — curved face, boss
 * glint — and the road peels off it as two low ridge-walls, dark base
 * and pale crest, water-hard and straight. The ground keeps a center
 * plow furrow between the wake ridges and a blunt stop-stamp where
 * the drive ended.
 */
const shield_rush: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a3);
    const a = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    for (let k = 0; k < 4; k++) {
      const f = 0.25 + k * 0.2;
      const side = k % 2 ? 1 : -1;
      c.particles.burst(
        c.wx + (c.wx2 - c.wx) * f,
        c.wy + (c.wy2 - c.wy) * f - 0.3,
        1,
        [c.st.spark, c.st.mid],
        {
          speed: 1.8 + rand() * 0.8,
          life: 0.45,
          size: 0.07,
          gravity: 4,
          dir: a + side * (Math.PI / 2 + 0.4),
          spread: 0.25,
          shape: 'shard',
          spin: 8,
        },
      );
    }
    dust.deployments.kick!(asMatter(c), c.wx2, c.wy2, { scale: 0.5 });
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.6) return;
    const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    const front = Math.min(1, t / 0.5);
    const bx = c.px + (c.px2 - c.px) * front;
    const by = c.py + (c.py2 - c.py) * front;
    const fade = 1 - t / 0.6;
    ctx.save();
    // The prow: a heater shield seen edge-on, leaning into the drive.
    const dxa = Math.cos(a);
    const lean = sc * 0.2;
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = shade(st.mid, -20);
    ctx.beginPath();
    ctx.moveTo(bx - dxa * lean * 0.4, by - sc * 1.3);
    ctx.quadraticCurveTo(bx + dxa * lean * 2.4, by - sc * 0.72, bx + dxa * lean * 0.8, by - sc * 0.06);
    ctx.lineTo(bx - dxa * lean * 0.8, by - sc * 0.1);
    ctx.quadraticCurveTo(bx - dxa * lean * 0.5, by - sc * 0.72, bx - dxa * lean * 0.4, by - sc * 1.3);
    ctx.closePath();
    ctx.fill();
    // The lit leading curve + boss glint.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.2, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(bx - dxa * lean * 0.4, by - sc * 1.3);
    ctx.quadraticCurveTo(bx + dxa * lean * 2.4, by - sc * 0.72, bx + dxa * lean * 0.8, by - sc * 0.06);
    ctx.stroke();
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.arc(bx + dxa * lean * 0.9, by - sc * 0.68, Math.max(2.4, sc * 0.06), 0, Math.PI * 2);
    ctx.fill();
    // The wake ridges: two low walls peeling back from the prow.
    const nx = -Math.sin(a);
    const ny = Math.cos(a) * c.squash;
    for (const s of [-1, 1]) {
      const wx0 = bx + nx * s * sc * 0.16;
      const wy0 = by + ny * s * sc * 0.16;
      const wx1 = bx - Math.cos(a) * sc * 1.5 + nx * s * sc * 0.55;
      const wy1 = by - Math.sin(a) * sc * 1.5 * c.squash + ny * s * sc * 0.55;
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = shade(st.mid, -22);
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(wx0, wy0);
      ctx.lineTo(wx1, wy1);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = shade(st.mid, 18);
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(wx0, wy0 - 2);
      ctx.lineTo(wx1, wy1 - 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.25 || t > 0.95) return;
    const fade = t > 0.7 ? (0.95 - t) / 0.25 : 1;
    const a = Math.atan2(c.py2 - c.py, c.px2 - c.px);
    ctx.save();
    ctx.lineCap = 'round';
    // The plow furrow: one center groove the length of the drive.
    ctx.globalAlpha = 0.65 * fade;
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.moveTo(c.px + (c.px2 - c.px) * 0.15, c.py + (c.py2 - c.py) * 0.15);
    ctx.lineTo(c.px2 - Math.cos(a) * sc * 0.2, c.py2 - Math.sin(a) * sc * 0.2 * squash);
    ctx.stroke();
    // The stop-stamp: a blunt bar across the arrival.
    const nx = -Math.sin(a);
    const ny = Math.cos(a) * squash;
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = shade(st.deep, -18);
    ctx.lineWidth = Math.max(3, sc * 0.08);
    ctx.beginPath();
    ctx.moveTo(c.px2 + nx * sc * 0.34, c.py2 + ny * sc * 0.34);
    ctx.lineTo(c.px2 - nx * sc * 0.34, c.py2 - ny * sc * 0.34);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * DRAW_IRON — "the toll."
 * The challenge is DRAWN iron, not rung glass: the wave leaves as an
 * expanding HEXAGON of six straight iron bars with riveted corners —
 * no other wave in the game has corners — each bar shivering on its
 * own phase. At the rim, chevrons turn inward in marching order: the
 * yard turning to face the shout.
 */
const draw_iron: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a4);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.3,
        c.wy + Math.sin(a) * c.radius * 0.3 * c.squash - 0.5,
        1,
        [c.st.spark, c.st.core],
        { speed: 1.2, life: 0.4, size: 0.06, gravity: -1, shape: 'glint' },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t > 0.85) return;
    const f = t / 0.85;
    const r = c.rPx * (0.18 + 0.82 * Math.min(1, f * 1.3));
    const rot = 0.35 + f * 0.22; // the drawn iron turns as it goes
    ctx.save();
    // The hexagon: deep bed pass then iron pass then hot corners.
    const hex = (rr: number, oy: number, col: string, lw: number, alpha: number): void => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a0 = rot + (k / 6) * Math.PI * 2;
        const shiver = Math.sin(c.now / 30 + k * 2.3) * sc * 0.025 * (1 - f);
        const x = c.px + Math.cos(a0) * (rr + shiver);
        const y = c.py - sc * 0.24 + Math.sin(a0) * (rr + shiver) * squash + oy;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };
    hex(r, 2.5, shade(st.deep, -14), Math.max(3.5, sc * 0.1), 0.6 * (1 - f));
    hex(r, 0, st.mid, Math.max(2.8, sc * 0.075), 0.9 * (1 - f));
    // Riveted corners: a hot stud at each vertex.
    ctx.globalAlpha = 0.95 * (1 - f);
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 6; k++) {
      const a0 = rot + (k / 6) * Math.PI * 2;
      const x = c.px + Math.cos(a0) * r;
      const y = c.py - sc * 0.24 + Math.sin(a0) * r * squash;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.8, sc * 0.045), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (t < 0.4) c.glow(c.wx, c.wy, c.radius * 0.6, 0.28 * (1 - t / 0.4));
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.15 || t > 0.9) return;
    const fade = 1 - (t - 0.15) / 0.75;
    const rand = srand(c.seed ^ 0x5a5);
    ctx.save();
    ctx.lineCap = 'round';
    // The turning: rim chevrons pointing home, marching inward.
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.3;
      const on = (t * 2.5 + k * 0.37) % 1;
      if (on > 0.55) continue;
      const p = groundPt(c, c.rPx * (0.96 - t * 0.2), a);
      const ia = a + Math.PI;
      ctx.globalAlpha = 0.85 * fade * (1 - on / 0.55);
      ctx.strokeStyle = on < 0.2 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(ia - 0.5) * sc * 0.2, p.y + Math.sin(ia - 0.5) * sc * 0.2 * squash);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(ia + 0.5) * sc * 0.2, p.y + Math.sin(ia + 0.5) * sc * 0.2 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * SHIELD_ROOF — "the iron sky."
 * One ceremony, 750ms: the roof goes UP — a real gable, near pitch
 * lit and far pitch dark, ridge beam catching the light — rising from
 * the shoulders in the first quarter. Then one beat of weather: hail
 * glints fall from above, STRIKE the pitch, skid down the slope, and
 * gutter off the eaves, while the sheltered ground beneath keeps a
 * dry shadow. The wall was never only in front of you.
 */
const shield_roof: AbilitySig = {
  ground(c) {
    const { ctx, st, t } = c;
    const up = Math.min(1, t / 0.22);
    ctx.save();
    ctx.globalAlpha = 0.3 * up * (t > 0.85 ? (1 - t) / 0.15 : 1);
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.66, c.rPx * 0.66 * c.squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    const up = t < 0.22 ? t / 0.22 : 1;
    const lift = sc * (0.9 + 1.0 * up);
    const w = sc * 1.05;
    const pitch = sc * 0.2;
    ctx.save();
    // Far pitch: dark plane rising behind the ridge.
    ctx.globalAlpha = 0.85 * up * fade;
    ctx.fillStyle = shade(st.mid, -26);
    ctx.beginPath();
    ctx.moveTo(c.px - w, c.py - lift + pitch);
    ctx.lineTo(c.px, c.py - lift - pitch);
    ctx.lineTo(c.px + w, c.py - lift + pitch);
    ctx.lineTo(c.px + w * 0.8, c.py - lift + pitch - sc * 0.32);
    ctx.lineTo(c.px, c.py - lift - pitch - sc * 0.28);
    ctx.lineTo(c.px - w * 0.8, c.py - lift + pitch - sc * 0.32);
    ctx.closePath();
    ctx.fill();
    // Near pitch: the lit plane facing the viewer, a real slope.
    ctx.globalAlpha = 0.92 * up * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(c.px - w, c.py - lift + pitch);
    ctx.lineTo(c.px, c.py - lift - pitch);
    ctx.lineTo(c.px + w, c.py - lift + pitch);
    ctx.lineTo(c.px + w * 0.9, c.py - lift + pitch + sc * 0.3);
    ctx.lineTo(c.px, c.py - lift - pitch + sc * 0.34);
    ctx.lineTo(c.px - w * 0.9, c.py - lift + pitch + sc * 0.3);
    ctx.closePath();
    ctx.fill();
    // Plank seams down the near pitch: from the roofline to the eave.
    ctx.globalAlpha = 0.6 * up * fade;
    ctx.strokeStyle = shade(st.mid, -16);
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    for (const px0 of [-0.55, 0, 0.55]) {
      const topY = c.py - lift - pitch + Math.abs(px0) * pitch * 2;
      ctx.beginPath();
      ctx.moveTo(c.px + w * px0, topY);
      ctx.lineTo(c.px + w * px0 * 0.94, topY + sc * 0.32);
      ctx.stroke();
    }
    // Eave board shadow under the near edge.
    ctx.globalAlpha = 0.7 * up * fade;
    ctx.fillStyle = shade(st.mid, -18);
    ctx.fillRect(c.px - w * 0.9, c.py - lift + pitch + sc * 0.3, w * 1.8, sc * 0.05);
    // The ridge beam.
    ctx.globalAlpha = 0.95 * up * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(c.px - w, c.py - lift + pitch);
    ctx.lineTo(c.px, c.py - lift - pitch);
    ctx.lineTo(c.px + w, c.py - lift + pitch);
    ctx.stroke();
    // The weather: three hail glints strike the pitch and skid off.
    if (t > 0.28) {
      const rand = srand(c.seed ^ 0x5a6);
      for (let k = 0; k < 3; k++) {
        const born = 0.3 + k * 0.16;
        const ph = (t - born) / 0.3;
        if (ph < 0 || ph > 1) continue;
        const side = k % 2 === 0 ? 1 : -1;
        const hx0 = c.px + side * w * (0.15 + rand() * 0.25);
        if (ph < 0.35) {
          // Falling in from above.
          const fall = ph / 0.35;
          ctx.globalAlpha = 0.9 * fade;
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1.4, sc * 0.032);
          ctx.beginPath();
          ctx.moveTo(hx0, c.py - lift - pitch - sc * (0.75 - 0.6 * fall));
          ctx.lineTo(hx0, c.py - lift - pitch - sc * (0.55 - 0.6 * fall));
          ctx.stroke();
        } else {
          // Struck: skidding down the slope toward the eave.
          const skid = (ph - 0.35) / 0.65;
          const sx = hx0 + side * w * 0.75 * skid;
          const sy = c.py - lift - pitch + (pitch * 2 + sc * 0.05) * skid;
          ctx.globalAlpha = 0.9 * (1 - skid * 0.5) * fade;
          ctx.fillStyle = st.spark;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1.6, sc * 0.04), 0, Math.PI * 2);
          ctx.fill();
          // The strike pip, the frame it lands.
          if (skid < 0.2) {
            ctx.globalAlpha = 0.95 * (1 - skid / 0.2) * fade;
            ctx.beginPath();
            burstStarPath(ctx, hx0, c.py - lift - pitch + sc * 0.04, sc * 0.09, sc * 0.035, 4, k, 1);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
    // Gutter drops off the eaves, matter-free glints.
    if (t > 0.4 && Math.random() < c.frameDt * 6 * fade) {
      const side = Math.random() < 0.5 ? -1 : 1;
      c.particles.burst(c.wx + side * 0.85, c.wy - 1.6, 1, [c.st.spark, c.st.core], {
        speed: 0.9, life: 0.5, size: 0.05, gravity: 6, dir: side > 0 ? 0.35 : Math.PI - 0.35, spread: 0.2, shape: 'glint',
      });
    }
  },
};

/**
 * TURNED_BLOW — "the mirror angle."
 * One ceremony, 750ms, one demonstration: the facet snaps up — an
 * angled iron plane with a real edge and a heat-lit top corner — then
 * ONE incoming blow is shown the trick: a dark streak arrives, breaks
 * at the facet with a wedge flash, and leaves upward hotter than it
 * came. The facet dims to ready and lets a single ember drip off its
 * low corner. Whatever comes in leaves by the same door.
 */
const turned_blow: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t > 0.88 ? (1 - t) / 0.12 : 1;
    const snap = Math.min(1, t / 0.18);
    const lift = sc * 0.78;
    ctx.save();
    // The facet: an angled plane with thickness, snapping up.
    ctx.translate(c.px, c.py - lift);
    ctx.rotate(-0.5 * snap);
    const hh = sc * 0.7 * snap;
    // Edge face (thickness), shadow side.
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = shade(st.mid, -28);
    ctx.fillRect(-sc * 0.13, -hh, sc * 0.06, hh * 2);
    // The mirror face.
    ctx.fillStyle = st.mid;
    ctx.fillRect(-sc * 0.07, -hh, sc * 0.18, hh * 2);
    // Heat at the top corner.
    ctx.globalAlpha = (0.75 + 0.2 * Math.sin(c.now / 110)) * fade;
    ctx.fillStyle = st.spark;
    ctx.fillRect(-sc * 0.07, -hh, sc * 0.18, sc * 0.13 * snap);
    ctx.restore();
    // The demonstration: one blow arrives, breaks, leaves hot.
    if (t > 0.3 && t < 0.62) {
      const ph = (t - 0.3) / 0.32;
      const fx = c.px - sc * 0.06;
      const fy = c.py - lift;
      ctx.save();
      ctx.lineCap = 'round';
      if (ph < 0.45) {
        // Incoming: a dark streak driving at the facet.
        const inF = ph / 0.45;
        const x0 = fx - sc * (1.1 - 0.95 * inF);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = shade(st.deep, -10);
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(x0 - sc * 0.3, fy + sc * 0.08);
        ctx.lineTo(x0, fy);
        ctx.stroke();
      } else {
        // Turned: the same mass leaving up-right, white hot.
        const outF = (ph - 0.45) / 0.55;
        const x1 = fx + sc * 1.0 * outF;
        const y1 = fy - sc * 0.85 * outF;
        ctx.globalAlpha = 0.95 * (1 - outF * 0.4);
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(x1 - sc * 0.26, y1 + sc * 0.22);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      // The break flash at the facet, the crossing frames.
      if (ph > 0.38 && ph < 0.58) {
        ctx.globalAlpha = 0.95 * (1 - Math.abs(ph - 0.48) / 0.1);
        ctx.fillStyle = st.spark;
        ctx.beginPath();
        burstStarPath(ctx, fx, fy, sc * 0.2, sc * 0.075, 4, 0.4, 1);
        ctx.fill();
      }
      ctx.restore();
    }
    // The ember off the low corner, late.
    if (t > 0.68) {
      const ph = Math.min(1, (t - 0.68) / 0.22);
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - ph) * fade;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.arc(c.px + sc * 0.1, c.py - lift + sc * 0.5 + ph * sc * 0.45, Math.max(1.4, sc * 0.035), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    c.glow(c.wx, c.wy, 0.6, 0.18 * fade);
  },
};

/**
 * RAMPART_BREAK — "the risen course."
 * The rim driven home surfaces the ground's OWN masonry: real merlon
 * blocks — faces, side planes, lit tops — stand up in a ring at the
 * blast lip, shedding soil chips as they rise, around a crater floor
 * that visibly SINKS a shade and cracks along running-bond mortar
 * lines. They hold a beat and go back under.
 */
const rampart_break: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a7);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * c.squash, 1, [c.st.deep, c.st.mid], {
        speed: 1.2 + rand() * 0.8, life: 1.4, size: 0.09, gravity: 0,
        dir: a, spread: 0.3, shape: 'shard', spin: 9,
        vz: 1.6 + rand(), zg: 7.5, land: 'bounce', bounce: 0.4, layer: 'world',
        fade: c.st.deep, fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x5a8);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // The sunken floor: the ring's inside drops a shade.
    ctx.globalAlpha = 0.3 * Math.min(1, t / 0.15) * fade;
    ctx.fillStyle = shade(st.deep, -16);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, c.rPx * 0.8, c.rPx * 0.8 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Running-bond cracks: offset mortar courses, kinked, lit lips.
    ctx.lineCap = 'round';
    for (let row = 0; row < 2; row++) {
      const ry = c.py + (row - 0.5) * sc * 0.4 * squash;
      const off = row % 2 ? sc * 0.22 : 0;
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = shade(st.deep, -24);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(c.px - c.rPx * 0.55, ry + sc * 0.02);
      ctx.lineTo(c.px - c.rPx * 0.1 + off, ry - sc * 0.03);
      ctx.lineTo(c.px + c.rPx * 0.55, ry + sc * 0.015);
      ctx.stroke();
      for (let k = -1; k <= 1; k++) {
        const x = c.px + k * sc * 0.45 + off;
        ctx.beginPath();
        ctx.moveTo(x, ry - sc * 0.17 * squash);
        ctx.lineTo(x, ry + sc * 0.17 * squash);
        ctx.stroke();
      }
    }
    // The risen rampart: real blocks surface, shed, hold, sink.
    const up = t < 0.22 ? t / 0.22 : t > 0.72 ? Math.max(0, (1 - t) / 0.28) : 1;
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3 + rand() * 0.2;
      const p = groundPt(c, c.rPx * 0.95, a);
      const h = sc * (0.24 + rand() * 0.12) * up;
      if (h < 2) continue;
      ctx.globalAlpha = 0.95 * fade;
      block(ctx, p.x, p.y, sc * (0.2 + rand() * 0.06), h, k % 2 ? shade(st.deep, 4) : shade(st.deep, 16), squash);
      // Soil shedding off the top as it rises.
      if (t < 0.3 && up > 0.3) {
        ctx.globalAlpha = 0.8 * (1 - t / 0.3) * fade;
        ctx.fillStyle = shade(st.deep, -20);
        ctx.fillRect(p.x - sc * 0.03 + Math.sin(k * 3.1) * sc * 0.08, p.y - h - sc * 0.02 + t * sc * 0.5, sc * 0.045, sc * 0.03);
      }
    }
    ctx.restore();
  },
};

/**
 * WHEEL_OF_IRON — "the loosed rim."
 * The wheel is finally SEEN, at the only place it speaks: the wound.
 * A spinning iron disc arrives edge-on — rim band, spoke glints —
 * bites the mark with a rim-spark star, and ricochets up and away,
 * still turning. The ground keeps the bite: a short curved rim-dent
 * with a lit lip and two tread scuffs where it grabbed.
 */
const wheel_of_iron: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5a9);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx, c.wy - 0.4, 1, [c.st.spark, c.st.core], {
        speed: 1.6 + rand() * 0.8, life: 0.35, size: 0.05, gravity: 3, dir: rand() * Math.PI * 2, spread: 0.2, shape: 'glint',
      });
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0x5aa);
    const inA = rand() * Math.PI * 2; // arrival heading, seed-stable
    ctx.save();
    if (t < 0.5) {
      // The wheel: arriving (t<0.14), biting, leaving (t>0.22).
      let wx: number;
      let wy: number;
      let scale = 1;
      if (t < 0.14) {
        const f = t / 0.14;
        wx = c.px - Math.cos(inA) * sc * 1.0 * (1 - f);
        wy = c.py - sc * 0.45 - Math.sin(inA) * sc * 0.4 * (1 - f);
      } else if (t < 0.22) {
        wx = c.px;
        wy = c.py - sc * 0.45;
      } else {
        const f = (t - 0.22) / 0.28;
        wx = c.px + Math.cos(inA + 2.4) * sc * 1.1 * f;
        wy = c.py - sc * 0.45 - sc * 1.0 * f;
        scale = 1 - f * 0.45;
      }
      const rw = sc * 0.34 * scale;
      const spin = c.now / 70;
      // The disc: iron rim band + darker heart.
      ctx.globalAlpha = 0.95 * (t > 0.4 ? (0.5 - t) / 0.1 : 1);
      ctx.fillStyle = shade(st.mid, -22);
      ctx.beginPath();
      ctx.ellipse(wx, wy, rw, rw * 0.82, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.ellipse(wx, wy, rw * 0.92, rw * 0.75, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      // Spoke glints, turning.
      ctx.strokeStyle = shade(st.mid, 20);
      ctx.lineWidth = Math.max(1.4, sc * 0.035);
      for (let k = 0; k < 3; k++) {
        const a = spin + (k / 3) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * rw * 0.7, wy - Math.sin(a) * rw * 0.55);
        ctx.lineTo(wx + Math.cos(a) * rw * 0.7, wy + Math.sin(a) * rw * 0.55);
        ctx.stroke();
      }
      // The hot rim cap on the leading edge.
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(wx, wy, rw * 0.92, rw * 0.75, 0.3, -0.6, 0.7);
      ctx.stroke();
    }
    // The bite: one star at the strike beat.
    if (t > 0.13 && t < 0.3) {
      ctx.globalAlpha = 0.95 * (1 - (t - 0.13) / 0.17);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, c.px, c.py - sc * 0.28, sc * 0.3, sc * 0.11, 5, inA, 1);
      ctx.fill();
    }
    ctx.restore();
    if (t < 0.3) c.glow(c.wx, c.wy, 0.5, 0.24 * (1 - t / 0.3));
  },
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    if (t < 0.16 || t > 0.9) return;
    const fade = t > 0.65 ? (0.9 - t) / 0.25 : 1;
    const rand = srand(c.seed ^ 0x5aa);
    const inA = rand() * Math.PI * 2;
    ctx.save();
    ctx.lineCap = 'round';
    // The rim-dent: a short curved groove where the wheel grabbed.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = shade(st.deep, -16);
    ctx.lineWidth = Math.max(2.5, sc * 0.065);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py, sc * 0.24, sc * 0.13 * squash, inA, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.mid, 14);
    ctx.lineWidth = Math.max(1.2, sc * 0.026);
    ctx.beginPath();
    ctx.ellipse(c.px, c.py - 1.5, sc * 0.21, sc * 0.11 * squash, inA, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    // Two tread scuffs off the bite.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    for (const s of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(c.px + Math.cos(inA + s) * sc * 0.2, c.py + Math.sin(inA + s) * sc * 0.2 * squash);
      ctx.lineTo(c.px + Math.cos(inA + s) * sc * 0.42, c.py + Math.sin(inA + s) * sc * 0.42 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * HOLD_THE_LINE — "the drawn line."
 * The kept ground declares itself in forged iron: the border is laid
 * BARS — flat value planes with lit top edges — and a patrol of heat
 * runs the perimeter, each bar flaring white and cooling in marching
 * order. Inside, two planted boot-pair stamps say someone is NOT
 * leaving. Rides a real field wire; the line holds as long as the
 * word does.
 */
const hold_the_line: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const rand = srand(c.seed ^ 0x5ab);
    ctx.save();
    const fade = t > 0.9 ? (1 - t) / 0.1 : Math.min(1, t * 6);
    // The border: laid iron bars on the rim.
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const march = (c.now / 1400 + k / n) % 1;
      const hot = march < 0.18;
      const warm = march < 0.34;
      const p0 = groundPt(c, c.rPx * 0.96, a - 0.15);
      const p1 = groundPt(c, c.rPx * 0.96, a + 0.15);
      // Bar body: dark plane.
      ctx.globalAlpha = (warm ? 0.9 : 0.55) * fade;
      ctx.strokeStyle = hot ? st.mid : shade(st.deep, warm ? 8 : -6);
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      // Lit top edge, riding 2px high.
      ctx.globalAlpha = (hot ? 0.95 : 0.4) * fade;
      ctx.strokeStyle = hot ? st.core : shade(st.mid, 10);
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - 2);
      ctx.lineTo(p1.x, p1.y - 2);
      ctx.stroke();
    }
    // The planted feet: two boot-pair stamps, heel and toe.
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      const p = groundPt(c, c.rPx * (0.25 + rand() * 0.3), a);
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = shade(st.deep, -12);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(p.x + s * sc * 0.07, p.y, sc * 0.045, sc * 0.085 * squash, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};

/**
 * UNBROKEN — "the ring of walls."
 * One ceremony, 750ms: THE MUSTER. Six heater shields fly in from
 * their own compass points, each arriving with a stop-shudder and a
 * lock-flash, closing into a ring at guard height. At the muster's
 * close the whole ring TIGHTENS one step together — ranks closed —
 * with a single white rim pulse. The great stand is not one shield.
 */
const unbroken: AbilitySig = {
  air(c) {
    const { ctx, st, t, sc } = c;
    const fade = t > 0.88 ? (1 - t) / 0.12 : 1;
    const lift = sc * 0.85;
    // Ranks close at 0.66: the ring steps inward once.
    const closeStep = t > 0.66 ? 1 : 0;
    const ring = sc * (0.68 - closeStep * 0.12);
    ctx.save();
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2 + 0.5;
      const arriveT = 0.05 + k * 0.07;
      const arrive = Math.min(1, Math.max(0, (t - arriveT) / 0.14));
      if (arrive <= 0) continue;
      // Fly in from outside, ease-out, with a stop-shudder.
      const eased = 1 - (1 - arrive) * (1 - arrive);
      const shudder = arrive >= 1 && t < arriveT + 0.2 ? Math.sin((t - arriveT) * 90) * sc * 0.02 * (1 - (t - arriveT) / 0.2) : 0;
      const r = ring + (1 - eased) * sc * 0.9 + shudder;
      const x = c.px + Math.cos(a0) * r;
      const y = c.py - lift + Math.sin(a0) * r * 0.34;
      const behind = Math.sin(a0) < 0;
      const s = sc * (behind ? 0.16 : 0.21);
      // The heater: face, dark rim edge, boss.
      ctx.globalAlpha = (behind ? 0.6 : 0.95) * fade;
      ctx.fillStyle = shade(st.mid, behind ? -14 : 0);
      ctx.beginPath();
      ctx.moveTo(x - s * 0.85, y - s);
      ctx.lineTo(x + s * 0.85, y - s);
      ctx.lineTo(x + s * 0.85, y + s * 0.15);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.85, y + s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.mid, -26);
      ctx.lineWidth = Math.max(1.2, sc * 0.028);
      ctx.stroke();
      ctx.fillStyle = shade(st.mid, 22);
      ctx.beginPath();
      ctx.arc(x, y - s * 0.2, Math.max(1.6, s * 0.22), 0, Math.PI * 2);
      ctx.fill();
      // The lock-flash the frame it arrives.
      if (arrive >= 1 && t < arriveT + 0.16) {
        ctx.globalAlpha = 0.95 * (1 - (t - arriveT) / 0.16) * fade;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, x, y - s * 0.1, s * 0.7, s * 0.28, 4, a0, 1);
        ctx.fill();
      }
    }
    // Ranks closed: one white rim pulse around the whole muster.
    if (t > 0.66 && t < 0.8) {
      const f = (t - 0.66) / 0.14;
      ctx.globalAlpha = 0.85 * (1 - f) * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.6, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py - lift, ring + sc * 0.14, (ring + sc * 0.14) * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.9, 0.28 * fade);
  },
};

/**
 * CHAMPIONS_WALL — "the trophy stakes."
 * Each ring of the wall plants the yard with won ground: real posts
 * with lit faces rise at the rim wearing brass pennants that flap in
 * folds of light and shadow, and the pulse's brass wave flashes each
 * pennant as it passes. Every pulse plants its OWN stakes — by the
 * third ring the yard is a tournament field.
 */
const champions_wall: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash } = c;
    const pulse = beatIndex(c, 500) % 3;
    const rand = srand(c.seed ^ (0x5ad + pulse * 7));
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1;
    ctx.save();
    // The wave: a brass-banded ring rolling out under the stakes.
    if (t < 0.5) {
      const f = t / 0.5;
      const r = c.rPx * (0.25 + 0.75 * (1 - (1 - f) * (1 - f)));
      ctx.globalAlpha = 0.5 * (1 - f);
      ctx.strokeStyle = shade(st.mid, -24);
      ctx.lineWidth = Math.max(3, sc * 0.085);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py + 2, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * (1 - f);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.2, sc * 0.06);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * (1 - f * 0.7);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.2, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(c.px, c.py, r + sc * 0.04, (r + sc * 0.04) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The stakes: this pulse's own plantings.
    const n = 5;
    const up = t < 0.2 ? t / 0.2 : t > 0.78 ? Math.max(0, (1 - t) / 0.22) : 1;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.5;
      const p = groundPt(c, c.rPx * (0.88 + rand() * 0.1), a);
      const h = sc * (0.5 + rand() * 0.16) * up;
      if (h < 2) continue;
      // Post: dark side + lit face.
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.fillRect(p.x - sc * 0.035, p.y - h, sc * 0.035, h);
      ctx.fillStyle = shade(st.mid, -8);
      ctx.fillRect(p.x, p.y - h, sc * 0.03, h);
      // Contact shadow.
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = shade(st.deep, -30);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 1, sc * 0.08, sc * 0.035 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The pennant: two folds, light and shadow, taking a wind.
      const flap = Math.sin(c.now / 150 + k * 1.9);
      const py0 = p.y - h;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = k % 2 ? st.mid : st.spark;
      ctx.beginPath();
      ctx.moveTo(p.x, py0);
      ctx.lineTo(p.x + sc * 0.13, py0 + sc * 0.045 + flap * sc * 0.02);
      ctx.lineTo(p.x, py0 + sc * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(k % 2 ? st.mid : st.spark, -24);
      ctx.beginPath();
      ctx.moveTo(p.x + sc * 0.13, py0 + sc * 0.045 + flap * sc * 0.02);
      ctx.lineTo(p.x + sc * 0.22, py0 + sc * 0.075 + flap * sc * 0.045);
      ctx.lineTo(p.x + sc * 0.11, py0 + sc * 0.095);
      ctx.closePath();
      ctx.fill();
      // The wave flashes the pennant as it passes its radius.
      const waveR = t < 0.5 ? 0.25 + 0.75 * (1 - (1 - t / 0.5) * (1 - t / 0.5)) : 1;
      const stakeR = 0.88;
      if (t < 0.5 && Math.abs(waveR - stakeR) < 0.06) {
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, p.x + sc * 0.06, py0 + sc * 0.05, sc * 0.1, sc * 0.04, 4, k, 1);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.25 * (1 - c.t));
  },
};

/**
 * SHIELD_BLOCK — "the rim spark."
 * The block law's own voice, cheap enough to say often: one short
 * thick arc of rim catches the light where the blow met it, a white
 * cap at the contact point, and a three-glint chevron shears back the
 * way the blow came. The wire's radius carries how much was blocked
 * — bigger saves get a bigger say.
 */
const shield_block: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x5ae);
    const back = c.dir + Math.PI;
    const big = 0.6 + c.radius; // radius 0.35..0.85 by damage blocked
    for (let k = 0; k < 3; k++) {
      c.particles.burst(
        c.wx + Math.cos(back) * 0.3,
        c.wy + Math.sin(back) * 0.3 * c.squash - 0.7,
        1,
        [c.st.spark, c.st.core],
        {
          speed: (1.7 + rand() * 0.9) * big,
          life: 0.3,
          size: 0.05,
          gravity: 5,
          dir: back + (rand() - 0.5) * 0.9,
          spread: 0.2,
          shape: 'glint',
        },
      );
    }
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    if (t > 0.5) return;
    const fade = 1 - t / 0.5;
    const back = c.dir + Math.PI;
    const big = 0.55 + c.radius * 0.75;
    const cx = c.px + Math.cos(back) * sc * 0.3;
    const cy = c.py - sc * 0.7;
    ctx.save();
    // The rim: deep bed arc under the lit arc.
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.65 * fade;
    ctx.strokeStyle = shade(st.mid, -26);
    ctx.lineWidth = Math.max(3.5, sc * 0.1 * big);
    ctx.beginPath();
    ctx.arc(cx, cy + 2, sc * 0.36 * big, back - 0.75, back + 0.75);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.4, sc * 0.07 * big);
    ctx.beginPath();
    ctx.arc(cx, cy, sc * 0.36 * big, back - 0.7, back + 0.7);
    ctx.stroke();
    // The contact cap: one hot point where the blow met the rim.
    if (t < 0.24) {
      ctx.globalAlpha = 0.95 * (1 - t / 0.24);
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, cx + Math.cos(back) * sc * 0.36 * big, cy + Math.sin(back) * sc * 0.28 * big, sc * 0.16 * big, sc * 0.06 * big, 4, back, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

export const SHIELD_SIGS: Record<string, AbilitySig> = {
  shield_bash,
  set_the_wall,
  shield_rush,
  draw_iron,
  shield_roof,
  turned_blow,
  rampart_break,
  wheel_of_iron,
  hold_the_line,
  unbroken,
  champions_wall,
  shield_block,
};
