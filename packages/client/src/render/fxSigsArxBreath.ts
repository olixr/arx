/**
 * THE SIGNATURE LAW — THE BREATH BETWEEN RUNGS, the arx wave.
 *
 * Ten set-pieces for the mage school's between-rung breath arts,
 * five casted and five channeled. Same binding laws as every wave
 * (hard edges, save/restore, squash on ground y-radii, srand
 * geometry with frameDt-gated emission, ≤ ~60 path ops per hook per
 * frame), plus the laws this epic's earlier half wrote:
 *
 *  - THE CONTRAST LAW: every pale painted element rides a DEEP
 *    under-stroke, so ice reads on plaza stone as surely as on turf.
 *  - Bold-up at 40 px/tile: area fills over hairline strokes,
 *    verticals 0.5–1.2 tiles, young alphas 0.7+, glow on every
 *    major moment.
 *  - Channel signatures are ONE BEAT'S WORTH (the quicksilver law):
 *    the server re-broadcasts the shape per beat; the long aftermath
 *    rides the matter library and the face's decal slot.
 *
 * No signature here shares a centerpiece with any other, in this
 * file or any other wave — stormcall already owns the hanging
 * thunderhead, so the anvil here is the IRON, not the cloud.
 */

import { boltPath, burstStarPath, jaggedRingPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, fire, frost, storm, water, radiance, shadow as gloom, asMatter } from './matter/index.js';

/** Screen point r px from the heart along ground angle a. */
function pt(c: SigCtx, r: number, a: number): { x: number; y: number } {
  return { x: c.px + Math.cos(a) * r, y: c.py + Math.sin(a) * r * c.squash };
}

// ------------------------------------------------------------ wickfire

/**
 * WICKFIRE — "the standing candles."
 * The thrown flame lands and DIVIDES: little true candle flames stand
 * up around the splash, each on its own seeded wick, and they gutter
 * out one by one — the last one always somewhere you had stopped
 * looking. The scorch keeps a ring of wax-bright drips between them.
 */
const wickfire: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The splash: a small true burst, and a pool that smolders on
    // after the candles die — grass lit for seconds, the settle law.
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 0.4 });
    fire.deployments.pool!(m, c.wx, c.wy, { radius: Math.max(0.5, c.radius * 0.8), scale: 0.38, dur: 2.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xca7d1e);
    const R = Math.max(c.rPx, sc * 0.6);
    const fade = t < 0.5 ? 1 : (1 - t) / 0.5;
    ctx.save();
    // The splash bed: char disc with a hot rim — area, not outline,
    // but thin enough that the CANDLES stay the read, not the soot.
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, R * 1.05, R * 1.05 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(px, py, R * 0.95, R * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Wax drips between the candles: bright beads on dark settings.
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2;
      const p = pt(c, R * (0.35 + rand() * 0.5), a);
      const s = Math.max(2, sc * (0.05 + rand() * 0.03));
      ctx.globalAlpha = 0.75 * fade;
      ctx.fillStyle = st.deep;
      ctx.fillRect(p.x - s * 0.75, p.y - s * 0.75, s * 1.5, s * 1.5);
      ctx.fillStyle = i % 2 === 0 ? st.spark : st.mid;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, Math.max(0.8, c.radius), 0.5 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x11c);
    const R = Math.max(c.rPx, sc * 0.6);
    ctx.save();
    // Five candles claim their spots and gutter on seeded clocks —
    // each is an AREA flame: deep sleeve, mid body, core heart.
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2;
      const r = R * (0.45 + rand() * 0.55);
      const snuffAt = 0.45 + rand() * 0.5; // this candle's snuff moment
      const p = pt(c, r, a);
      const life = Math.max(0, 1 - t / snuffAt);
      if (life <= 0) {
        // The snuff: one soot stub where the candle stood.
        const stub = Math.min(1, (t - snuffAt) / 0.2);
        if (stub < 1) {
          ctx.globalAlpha = 0.5 * (1 - stub);
          ctx.fillStyle = st.deep;
          ctx.fillRect(p.x - sc * 0.03, p.y - sc * (0.3 + stub * 0.25), sc * 0.06, sc * 0.16);
        }
        continue;
      }
      const breathe = 0.7 + 0.3 * Math.sin(c.now / 90 + i * 2.2);
      const h = sc * (0.5 + 0.4 * rand()) * breathe * Math.min(1, life * 3);
      const w = sc * (0.09 + 0.03 * rand());
      // Deep sleeve under the flame (contrast law), then the flame —
      // the sleeve is a SETTING, never the body: keep it slim and dim.
      ctx.globalAlpha = 0.35 * life;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(p.x - w * 1.25, p.y + sc * 0.03);
      ctx.lineTo(p.x, p.y - h * 1.06);
      ctx.lineTo(p.x + w * 1.25, p.y + sc * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * life;
      ctx.fillStyle = i % 2 === 0 ? st.mid : st.spark;
      ctx.beginPath();
      ctx.moveTo(p.x - w, p.y);
      ctx.lineTo(p.x - w * 0.15, p.y - h);
      ctx.lineTo(p.x + w, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(p.x - w * 0.4, p.y);
      ctx.lineTo(p.x, p.y - h * 0.55);
      ctx.lineTo(p.x + w * 0.4, p.y);
      ctx.closePath();
      ctx.fill();
    }
    // The arrival: in the first blink, the candle that was thrown —
    // a fat teardrop with its wick-curl still trailing.
    if (t < 0.14) {
      const k = 1 - t / 0.14;
      const drop = sc * 1.4 * k;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.08);
      ctx.beginPath();
      ctx.moveTo(px + sc * 0.35, py - drop - sc * 0.55);
      ctx.quadraticCurveTo(px + sc * 0.15, py - drop - sc * 0.2, px, py - drop);
      ctx.stroke();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py - drop, sc * 0.18, sc * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.1, 0.6 * (1 - k * 0.4));
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- rime_river

/**
 * RIME_RIVER — "the road of rime."
 * One beat of the pour: winter runs downhill from the hand and the
 * ground it crosses is PAVED — a filled ice band freezes downstream
 * with a white meltline seam, crack ticks set across it like flag
 * joints, and a low crest of spray rides the leading edge. The road
 * stays written after the river moves on (the face's rime + fog).
 */
const rime_river: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The pour is a true lance of cold; the far end exhales sinking
    // fog that outlives the beat — the cold pooling downhill.
    frost.deployments.lance!(m, c.wx, c.wy, { dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx), scale: 0.7 });
    frost.deployments.fog!(m, c.wx2, c.wy2, { radius: 0.8, scale: 0.55, dur: 2.0 });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x81f3);
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = Math.max(c.rPx * 2, sc * 0.42); // the river's full breadth
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    // The freeze runs downstream through the young beat.
    const reach = Math.min(1, t / 0.3);
    const ex = px + dx * reach;
    const ey = py + dy * reach;
    ctx.save();
    ctx.lineCap = 'butt';
    // The road: deep water bed under the ice body (contrast law —
    // the pale band NEVER touches the ground without its bed).
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = w * 1.25;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = w * 0.85;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // The meltline: one white seam down the middle of the pour.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Flag joints: crack ticks set across the road where it has
    // already frozen — each a white tick on a deep joint.
    const joints = 5;
    for (let i = 0; i < joints; i++) {
      const f = (i + 0.6 + rand() * 0.3) / (joints + 1);
      if (f > reach) break;
      const jx = px + dx * f;
      const jy = py + dy * f;
      const jw = w * (0.5 + rand() * 0.2);
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(jx - nx * jw * 0.5, jy - ny * jw * 0.5);
      ctx.lineTo(jx + nx * jw * 0.5, jy + ny * jw * 0.5);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(jx - nx * jw * 0.4, jy - ny * jw * 0.4);
      ctx.lineTo(jx + nx * jw * 0.4, jy + ny * jw * 0.4);
      ctx.stroke();
    }
    ctx.restore();
    c.glow((c.wx + c.wx2) / 2, (c.wy + c.wy2) / 2, 1.2, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const reach = Math.min(1, t / 0.3);
    const ex = px + dx * reach;
    const ey = py + dy * reach;
    ctx.save();
    // The crest: a low breaking chevron of white riding the leading
    // edge while the river still runs — deep twin beneath it.
    if (t < 0.7) {
      const a = Math.atan2(dy, dx);
      const cw = sc * 0.3;
      const crest = (off: number, col: string, lw: number, al: number): void => {
        ctx.globalAlpha = al;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(ex - Math.cos(a - 2.2) * cw, ey - off - Math.sin(a - 2.2) * cw * 0.6);
        ctx.lineTo(ex, ey - off - sc * 0.22);
        ctx.lineTo(ex - Math.cos(a + 2.2) * cw, ey - off - Math.sin(a + 2.2) * cw * 0.6);
        ctx.stroke();
      };
      crest(0, st.deep, Math.max(3, sc * 0.1), 0.6 * (1 - t));
      crest(sc * 0.03, st.core, Math.max(2, sc * 0.055), 0.9 * (1 - t));
    }
    // Spray glints hop off the crest — gated, dying quick.
    if (t < 0.6 && Math.random() < c.frameDt * 22) {
      c.particles.burst(c.wx + (c.wx2 - c.wx) * reach, c.wy + (c.wy2 - c.wy) * reach, 2, [st.spark, st.core], {
        speed: 1.2, life: 0.4, size: 0.07, gravity: 2.4, shape: 'glint',
      });
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- windshear

/**
 * WINDSHEAR — "the bent field."
 * The sky is handed back and the WORLD says so: every blade of grass
 * inside the ring bows outward as the front passes, torn leaves fly
 * spinning over their heads, and two mint gust-crests break away in
 * rings. When the air settles the blades stand back up — the one
 * signature in this wave that leaves no mark, on purpose.
 */
const windshear: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // Honest air: ground breath thrown up and out.
    dust.deployments.billow!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.6 });
    dust.deployments.kick!(m, c.wx, c.wy, { scale: 0.55 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xb1ade);
    ctx.save();
    ctx.lineCap = 'butt';
    // The front: where the gust wall currently stands.
    const front = 0.25 + t * 0.85;
    // The field bows: seeded grass blades inside the ring, each a
    // two-segment stroke leaning outward hardest as the front passes,
    // easing back upright at the tail. Deep understroke under every
    // lit blade — the field must read on stone as well as turf.
    for (let i = 0; i < 12; i++) {
      const a = rand() * Math.PI * 2;
      const r = 0.2 + rand() * 0.75;
      const p = pt(c, rPx * r, a);
      const passed = Math.max(0, Math.min(1, (front - r) * 3));
      const settle = t > 0.75 ? (t - 0.75) / 0.25 : 0;
      const bend = passed * (1 - settle);
      const h = sc * (0.3 + rand() * 0.25);
      const lean = h * bend * 0.9;
      const tipX = p.x + Math.cos(a) * lean;
      const tipY = p.y - h * (1 - bend * 0.55) + Math.sin(a) * lean * 0.4;
      const blade = (off: number, col: string, lw: number, al: number): void => {
        ctx.globalAlpha = al;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(p.x + off, p.y);
        ctx.quadraticCurveTo(p.x + off + lean * 0.3, p.y - h * 0.6, tipX + off, tipY);
        ctx.stroke();
      };
      const die = t > 0.85 ? (1 - t) / 0.15 : 1;
      blade(Math.max(1, sc * 0.02), st.deep, Math.max(2.5, sc * 0.07), 0.5 * die);
      blade(0, i % 3 === 0 ? st.core : st.mid, Math.max(1.8, sc * 0.045), 0.85 * die);
    }
    // Two gust crests: filled mint crescent bands breaking outward,
    // each on a deep bed.
    for (let k = 0; k < 2; k++) {
      const kt = Math.max(0, Math.min(1, t * 1.5 - k * 0.3));
      if (kt <= 0 || kt >= 1) continue;
      const r = rPx * (0.3 + kt * 0.75);
      const al = (1 - kt) * 0.9;
      ctx.globalAlpha = al * 0.6;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(5, sc * 0.2);
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = al;
      ctx.strokeStyle = k === 0 ? st.mid : st.core;
      ctx.lineWidth = Math.max(3, sc * 0.12);
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.97, r * 0.97 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.25 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x1eaf);
    ctx.save();
    // Torn leaves: seeded quads spinning outward OVER the field,
    // each with a deep face and a lit face so the tumble reads.
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      const spd = 0.5 + rand() * 0.5;
      const fly = Math.min(1, t * 1.25);
      const r = rPx * (0.25 + fly * spd);
      const lift = sc * (0.5 + rand() * 0.55) * Math.sin(Math.min(1, fly) * Math.PI);
      const p = { x: px + Math.cos(a) * r, y: py + Math.sin(a) * r * squash - lift };
      const spin = c.now / 130 + i * 1.7;
      const s = sc * (0.09 + rand() * 0.05);
      const die = t > 0.8 ? (1 - t) / 0.2 : 1;
      ctx.globalAlpha = 0.9 * die;
      ctx.translate(p.x, p.y);
      ctx.rotate(spin % (Math.PI * 2));
      ctx.fillStyle = st.deep;
      ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
      ctx.fillStyle = i % 2 === 0 ? st.mid : st.spark;
      ctx.fillRect(-s * 0.8, -s * 0.45, s * 1.6, s * 0.9);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Air streaks: brief pale slivers drawn along the wind, gated.
    if (t < 0.55 && Math.random() < c.frameDt * 26) {
      const a = rand() * Math.PI * 2 + c.now * 0.001;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5, 2, [st.core, st.spark], {
        speed: 3.2, life: 0.35, size: 0.09, gravity: 0, dir: a, spread: 0.25, shape: 'streak',
      });
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- stonerise

/**
 * STONERISE — "the quarry rows."
 * One beat of the asking: a row of stone teeth STANDS UP along a
 * seeded chord of the circle — side faces dark, sunlit faces tan,
 * and each tooth wearing its foreshortened top plane the way all
 * tall casework must. The row rises, holds the beat, then sinks
 * back; the cracks it tore stay written in the dirt.
 */
const stonerise: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.55 });
    dust.deployments.gouge!(m, c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x570e);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // The heave: a dark pressure ring where the ground gave.
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rPx * 0.95, squash, 12, 0.16, rand() * Math.PI, c.seed ^ 5);
    ctx.fill();
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rPx * 0.9, squash, 12, 0.14, rand() * Math.PI, c.seed ^ 6);
    ctx.stroke();
    // The tear: fissures radiating from under the row's chord.
    const rowA = rand() * Math.PI * 2;
    for (let k = 0; k < 3; k++) {
      const a = rowA + (k - 1) * 0.8 + (rand() - 0.5) * 0.4;
      const r1 = rPx * (0.3 + rand() * 0.2);
      const r2 = rPx * (0.75 + rand() * 0.3);
      const p1 = pt(c, r1, a);
      const p2 = pt(c, r2, a + (rand() - 0.5) * 0.35);
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.5, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x570e); // SAME seed walk as ground — the row grows from its fissures
    rand(); // discard the ring rotations the ground consumed
    // The row: five teeth along a chord through the circle. Rise
    // fast, stand, sink at the tail.
    const rowA = rand() * Math.PI * 2 + Math.PI * 0.5; // perpendicular chord
    const upK = t < 0.14 ? t / 0.14 : t > 0.78 ? Math.max(0, 1 - (t - 0.78) / 0.22) : 1;
    const rise = upK * upK * (3 - 2 * upK); // smooth
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const f = (i / 4 - 0.5) * 1.5;
      const r = Math.abs(f) * rPx;
      const a = rowA + (f < 0 ? Math.PI : 0);
      const base = pt(c, r, a);
      const h = sc * (0.5 + rand() * 0.45) * (i === 2 ? 1.25 : 1) * rise;
      if (h < 1) continue;
      const w = sc * (0.16 + rand() * 0.06);
      const topW = w * 0.55;
      const topH = w * 0.4 * squash; // the foreshortened top plane
      // Dust puffs at the foot on the way up.
      if (t < 0.2 && Math.random() < c.frameDt * 18) {
        c.particles.burst(c.wx + Math.cos(a) * (r / sc), c.wy + Math.sin(a) * (r / sc), 2, [st.deep, st.mid], {
          speed: 0.8, life: 0.5, size: 0.1, gravity: 1.2, shape: 'square',
        });
      }
      // Shadow side (deep), lit side (mid), then the tilted top.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.moveTo(base.x - w, base.y);
      ctx.lineTo(base.x - topW, base.y - h);
      ctx.lineTo(base.x, base.y - h);
      ctx.lineTo(base.x, base.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(base.x, base.y - h);
      ctx.lineTo(base.x + topW, base.y - h);
      ctx.lineTo(base.x + w, base.y);
      ctx.closePath();
      ctx.fill();
      // The bird's-eye top plane, tilted toward the camera.
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(base.x, base.y - h, topW, topH, 0, 0, Math.PI * 2);
      ctx.fill();
      // One crack line down the lit face of the tall tooth.
      if (i === 2) {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(1.5, sc * 0.035);
        ctx.beginPath();
        ctx.moveTo(base.x + topW * 0.4, base.y - h * 0.85);
        ctx.lineTo(base.x + w * 0.3, base.y - h * 0.4);
        ctx.lineTo(base.x + w * 0.6, base.y - h * 0.1);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (t < 0.25) c.glow(c.wx, c.wy, c.radius * 0.7, 0.3);
  },
};

// -------------------------------------------------------------- geyser

/**
 * GEYSER — "the white column."
 * The deep answers: a full-height column of water STANDS out of the
 * broken ground — core-white shaft in a surf-blue sleeve, its head
 * blooming into a crown that sheds real falling water. The pool it
 * leaves keeps a foam rim, and the wet sheen dries last of all.
 */
const geyser: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    water.deployments.splash!(m, c.wx, c.wy, { scale: 0.9 });
    // The fall-back: true rain inside the ring — what goes up...
    water.deployments.rain!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.7, dur: 1.4 });
    water.deployments.spray!(m, c.wx, c.wy, { scale: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x6e15e);
    const fade = t < 0.45 ? 1 : (1 - t) / 0.55;
    ctx.save();
    // The pool: deep water disc with a foam rim of white dashes.
    ctx.globalAlpha = 0.65 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.9, rPx * 0.9 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.7, rPx * 0.7 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 + rand() * 0.3;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.85, rPx * 0.85 * squash, 0, a0, a0 + 0.45);
      ctx.stroke();
    }
    // Wet sheen: pale streak patches that outlive the pool (they
    // fade on the FULL life, not the pool's) — each on a deep bed.
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const p = pt(c, rPx * (0.4 + rand() * 0.6), a);
      const len = sc * (0.3 + rand() * 0.25);
      const sheenFade = 1 - t;
      ctx.globalAlpha = 0.45 * sheenFade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.09);
      ctx.beginPath();
      ctx.moveTo(p.x - len / 2, p.y);
      ctx.lineTo(p.x + len / 2, p.y);
      ctx.stroke();
      ctx.globalAlpha = 0.6 * sheenFade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(p.x - len / 2, p.y - sc * 0.02);
      ctx.lineTo(p.x + len / 2, p.y - sc * 0.02);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.35 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xc01);
    // The column: surges up in the young window, stands trembling,
    // collapses at the tail.
    const upK = t < 0.16 ? t / 0.16 : t > 0.62 ? Math.max(0, 1 - (t - 0.62) / 0.3) : 1;
    const rise = upK * upK * (3 - 2 * upK);
    const H = sc * 2.6 * rise;
    if (H > 2) {
      const tremble = 1 + 0.04 * Math.sin(c.now / 60);
      const w0 = sc * 0.34; // base width
      const w1 = sc * 0.22 * tremble; // head width
      ctx.save();
      // Sleeve (deep), body (mid), core shaft (white) — area fills.
      const shaft = (m0: number, m1: number, col: string, al: number): void => {
        ctx.globalAlpha = al;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(px - w0 * m0, py);
        ctx.quadraticCurveTo(px - w0 * m0 * 0.7, py - H * 0.55, px - w1 * m1, py - H);
        ctx.lineTo(px + w1 * m1, py - H);
        ctx.quadraticCurveTo(px + w0 * m0 * 0.7, py - H * 0.55, px + w0 * m0, py);
        ctx.closePath();
        ctx.fill();
      };
      shaft(1.25, 1.3, st.deep, 0.55);
      shaft(1.0, 1.0, st.mid, 0.85);
      shaft(0.45, 0.55, st.core, 0.95);
      // The crown: the head blooms — a puff of white lobes.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.core;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + c.now / 300;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * w1 * 1.3, py - H - Math.sin(a) * sc * 0.1, sc * 0.14, sc * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Droplets arc off the head — gated real spray.
      if (Math.random() < c.frameDt * 30) {
        c.particles.burst(c.wx, c.wy - (H / sc), 3, [st.core, st.spark], {
          speed: 1.6, life: 0.6, size: 0.08, gravity: 3.4, shape: 'glint',
        });
      }
      ctx.restore();
      c.glow(c.wx, c.wy, 1.0, 0.45 * rise);
    }
  },
};

// ------------------------------------------------------------ anvil_sky

/**
 * ANVIL_SKY — "the struck iron."
 * One beat of the forge: the ground inside the ring GLOWS like bar
 * iron drawn from the coals — a hot annulus with a white seam — and
 * the hammer is a flat brass slab that drops out of the air and
 * meets it, flinging white scale. Charge ticks stand on the rim
 * between strikes. (Stormcall owns the hanging cloud; this anvil is
 * the IRON, and the sky is only its hammer.)
 */
const anvil_sky: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    storm.deployments.impact!(m, c.wx, c.wy, { scale: 0.7 });
    // The charge stays on the worked metal between beats.
    storm.deployments.static!(m, c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.5, dur: 1.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xa2f1);
    const fade = t < 0.5 ? 1 : (1 - t) / 0.5;
    // The strike lands at the young edge of the beat.
    const hot = t < 0.22 ? 1 : Math.max(0, 1 - (t - 0.22) / 0.7);
    ctx.save();
    ctx.lineCap = 'butt';
    // Bar iron: char bed, hot body, white seam — a filled annulus.
    const band = (r0: number, r1: number, col: string, al: number): void => {
      ctx.globalAlpha = al;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * r1, rPx * r1 * squash, 0, 0, Math.PI * 2);
      ctx.ellipse(px, py, rPx * r0, rPx * r0 * squash, 0, Math.PI * 2, 0, true);
      ctx.fill();
    };
    band(0.45, 0.95, st.deep, 0.5 * fade);
    band(0.52, 0.88, st.mid, (0.2 + 0.35 * hot) * fade);
    ctx.globalAlpha = (0.25 + 0.5 * hot) * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.7, rPx * 0.7 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Scale: white-hot flakes jump at the strike and lie cooling on
    // the iron — seeded spots whose heat dies on their own clocks.
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      const p = pt(c, rPx * (0.5 + rand() * 0.42), a);
      const cool = 0.3 + rand() * 0.5;
      const heat = Math.max(0, 1 - t / cool);
      const s = Math.max(2, sc * (0.055 + rand() * 0.03));
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = st.deep;
      ctx.fillRect(p.x - s * 0.8, p.y - s * 0.8, s * 1.6, s * 1.6);
      if (heat > 0) {
        ctx.globalAlpha = heat;
        ctx.fillStyle = i % 2 === 0 ? st.core : st.spark;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, (0.15 + 0.4 * hot) * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    if (t < 0.22) {
      // The hammer: a flat slab falling out of the air onto the
      // iron — side face dark, top plane bright, dead vertical drop.
      const k = t / 0.22;
      const drop = (1 - k) * (1 - k);
      const y = py - sc * 0.5 - sc * 2.4 * drop;
      const w = sc * 0.62;
      const faceH = sc * 0.2;
      const topH = sc * 0.16 * squash;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.deep;
      ctx.fillRect(px - w / 2, y - faceH, w, faceH);
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, y - faceH, w / 2, topH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, y - faceH, w * 0.28, topH * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Contact: the white star and the fling of scale.
      if (k > 0.85) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        burstStarPath(ctx, px, py, sc * 0.55, sc * 0.2, 5, c.now / 200, squash);
        ctx.fill();
        c.glow(c.wx, c.wy, 1.4, 0.8);
      }
      if (k > 0.85 && Math.random() < c.frameDt * 60) {
        c.particles.burst(c.wx, c.wy, 4, [st.core, st.spark], {
          speed: 3.0, life: 0.45, size: 0.08, gravity: 3.0, shape: 'streak', fade: st.deep, fadeAt: 0.6,
        });
      }
    } else {
      // Between strikes: charge ticks stand on the rim, breathing on
      // the wall clock, each a bright cap on a dark stem.
      const rand = srand(c.seed ^ 0x71c5);
      for (let i = 0; i < 5; i++) {
        const a = rand() * Math.PI * 2;
        const p = pt(c, rPx * (0.88 + rand() * 0.08), a);
        const wob = Math.sin(c.now / 95 + i * 2.1);
        const h = sc * (0.32 + 0.22 * wob * wob);
        const w = Math.max(2, sc * 0.05);
        const die = 1 - t;
        ctx.globalAlpha = 0.6 * die;
        ctx.fillStyle = st.deep;
        ctx.fillRect(p.x - w, p.y - h, w * 2, h);
        ctx.globalAlpha = 0.9 * die;
        ctx.fillStyle = i % 2 === 0 ? st.core : st.spark;
        ctx.fillRect(p.x - w / 2, p.y - h, w, Math.max(2, sc * 0.06));
      }
    }
    ctx.restore();
  },
};

// ----------------------------------------------------------- hollowcall

/**
 * HOLLOWCALL — "the lamps lean in."
 * A small nothing opens and LIGHT ITSELF is invited first: pale
 * streaks around the rim all point inward and slide toward the dark
 * heart, a collapsing white lens ring echoes down after them, and
 * when the hollow snaps shut it leaves the stain where light kept
 * arriving late. (Gloomfall's lamps go OUT; these lean IN.)
 */
const hollowcall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    gloom.deployments.door!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.8 });
    gloom.deployments.tendrils!(m, c.wx, c.wy, { scale: 0.65 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x401e);
    const fade = t < 0.5 ? 1 : (1 - t) / 0.5;
    // The heart grows through the young life, snaps shut at 0.8.
    const snap = t > 0.8;
    const heart = snap ? Math.max(0, 1 - (t - 0.8) / 0.08) : Math.min(1, t * 2.5);
    ctx.save();
    ctx.lineCap = 'butt';
    // The stain: where light arrives late — outlives the heart.
    ctx.globalAlpha = 0.45 * (1 - t * 0.6);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.75, rPx * 0.75 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The heart: true dark with a thin lit lip.
    if (heart > 0) {
      ctx.globalAlpha = 0.95 * heart;
      ctx.fillStyle = '#100a1e';
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.34 * heart, rPx * 0.34 * heart * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9 * heart * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.36 * heart, rPx * 0.36 * heart * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The leaning lamps: pale streaks around the rim, every one
    // pointing INWARD and sliding home — deep twin under each.
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const slide = (t * (0.7 + rand() * 0.5)) % 1;
      const r0 = rPx * (1.0 - slide * 0.55);
      const len = rPx * 0.22;
      const p0 = pt(c, r0, a);
      const p1 = pt(c, Math.max(rPx * 0.32, r0 - len), a);
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.095);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = i % 3 === 0 ? st.core : st.spark;
      ctx.lineWidth = Math.max(1.8, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.6, 0.3 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    ctx.save();
    // The collapsing lens: three white rings, launched in sequence,
    // each shrinking into the heart with its deep twin a step behind.
    for (let k = 0; k < 3; k++) {
      const kt = t * 1.6 - k * 0.22;
      if (kt <= 0 || kt >= 1) continue;
      const r = rPx * (1.05 - kt * 0.75);
      const lift = sc * 0.35 * (1 - kt);
      const al = Math.sin(kt * Math.PI);
      ctx.globalAlpha = al * 0.5;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3.5, sc * 0.11);
      ctx.beginPath();
      ctx.ellipse(px, py - lift, r * 1.04, r * 1.04 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = al * 0.9;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py - lift, r, r * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The snap: one small white star as the hollow closes.
    if (t > 0.8 && t < 0.92) {
      const k = 1 - (t - 0.8) / 0.12;
      ctx.globalAlpha = k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.2, sc * 0.4 * k + sc * 0.1, sc * 0.12, 4, 0.5, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.9, 0.6 * k);
    }
    // Motes still falling in after everything else — gated.
    if (t > 0.3 && Math.random() < c.frameDt * 16 * (1 - t)) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8, 1, [st.spark, st.core], {
        speed: 1.8, life: 0.5, size: 0.07, gravity: 0, dir: a + Math.PI, spread: 0.1, shape: 'glint',
      });
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- burning_glass

/**
 * BURNING_GLASS — "the lens line."
 * One beat of the focus: wide soft light enters from the hand,
 * narrows through a floating lens ring hung mid-line, and leaves as
 * ONE white line that ends in fire. The focused half of the corridor
 * chars and keeps embers crossing it; heat slivers climb off the
 * line while the lens holds.
 */
const burning_glass: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The far half smolders: a true fire path along the focused line.
    const fx = c.wx + (c.wx2 - c.wx) * 0.45;
    const fy = c.wy + (c.wy2 - c.wy) * 0.45;
    fire.deployments.path!(m, fx, fy, { dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx), scale: 0.55 });
    radiance.deployments.bloom!(m, c.wx2, c.wy2, { scale: 0.4 });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x1e45);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // The waist: where the lens hangs.
    const wx = px + dx * 0.42;
    const wy = py + dy * 0.42;
    ctx.save();
    ctx.lineCap = 'butt';
    // Entering light: a soft wide wedge from the hand to the waist —
    // deep bed first so the pale wedge holds on bright ground.
    const wedge = (m0: number, col: string, al: number): void => {
      ctx.globalAlpha = al * fade;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px + nx * sc * 0.42 * m0, py + ny * sc * 0.42 * m0);
      ctx.lineTo(wx + nx * sc * 0.05, wy + ny * sc * 0.05);
      ctx.lineTo(wx - nx * sc * 0.05, wy - ny * sc * 0.05);
      ctx.lineTo(px - nx * sc * 0.42 * m0, py - ny * sc * 0.42 * m0);
      ctx.closePath();
      ctx.fill();
    };
    wedge(1.15, st.deep, 0.35);
    wedge(1.0, st.mid, 0.45);
    // The focused line: waist to far end, white on a char bed.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(4, sc * 0.13);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    // The writing point slides down the line through the young beat.
    const write = Math.min(1, t / 0.35);
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + (px2 - wx) * write, wy + (py2 - wy) * write);
    ctx.stroke();
    // Embers crossing the charred half: bright ticks on dark scores.
    for (let i = 0; i < 4; i++) {
      const f = 0.5 + rand() * 0.45;
      const bx = px + dx * f;
      const by = py + dy * f;
      const s = Math.max(2, sc * (0.05 + rand() * 0.025));
      const heat = Math.max(0, 1 - t / (0.5 + rand() * 0.4));
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = st.deep;
      ctx.fillRect(bx - s, by - s, s * 2, s * 2);
      if (heat > 0) {
        ctx.globalAlpha = heat;
        ctx.fillStyle = i % 2 === 0 ? st.spark : st.core;
        ctx.fillRect(bx - s / 2, by - s / 2, s, s);
      }
    }
    ctx.restore();
    c.glow(c.wx + (c.wx2 - c.wx) * 0.7, c.wy + (c.wy2 - c.wy) * 0.7, 0.9, 0.5 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dx = px2 - px;
    const dy = py2 - py;
    const wx = px + dx * 0.42;
    const wy = py + dy * 0.42 - sc * 0.5; // the lens floats
    const fade = 1 - t;
    ctx.save();
    // The lens: a rune-set ring hanging over the waist, its rim
    // catching two glints that ride around it.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3.5, sc * 0.1);
    ctx.beginPath();
    ctx.ellipse(wx, wy, sc * 0.3, sc * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(wx, wy, sc * 0.26, sc * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let g = 0; g < 2; g++) {
      const a = c.now / 350 + g * Math.PI;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = g === 0 ? st.core : st.spark;
      const gx = wx + Math.cos(a) * sc * 0.26;
      const gy = wy + Math.sin(a) * sc * 0.32;
      ctx.fillRect(gx - sc * 0.035, gy - sc * 0.035, sc * 0.07, sc * 0.07);
    }
    // The light cone gathering INTO the lens from above.
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(wx - sc * 0.55, wy - sc * 1.5);
    ctx.lineTo(wx + sc * 0.55, wy - sc * 1.5);
    ctx.lineTo(wx + sc * 0.08, wy);
    ctx.lineTo(wx - sc * 0.08, wy);
    ctx.closePath();
    ctx.fill();
    // Heat slivers climb off the focused half — gated, brief.
    if (t < 0.75 && Math.random() < c.frameDt * 24) {
      const f = 0.5 + Math.random() * 0.45;
      c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 2, [st.spark, st.core], {
        speed: 0.9, life: 0.5, size: 0.08, gravity: -1.4, shape: 'streak',
      });
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------- moonrise

/**
 * MOONRISE — "the early moon."
 * The moon is brought up ahead of its hour: a full silver disc
 * climbs out of the ring's own horizon, limb-shaded and haloed,
 * while the ground below turns to a moonlit glade — rim shadow,
 * opening moonflowers — and pale moths drift in slow seeded orbits
 * around the light. The moon fades LAST, an afterimage.
 */
const moonrise: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    radiance.deployments.bloom!(m, c.wx, c.wy, { scale: 0.6 });
    // Cold silver settles: thin fog pooling in the glade.
    frost.deployments.fog!(m, c.wx, c.wy, { radius: c.radius * 0.8, scale: 0.4, dur: 1.8 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x3007);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    ctx.save();
    // The glade: silver wash inside a deep-blue moon-shadow rim.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(4, sc * 0.14);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.85, rPx * 0.85 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Moonflowers: seeded four-point stars that OPEN as the light
    // arrives, each in a deep setting so the silver reads anywhere.
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      const p = pt(c, rPx * (0.25 + rand() * 0.6), a);
      const openAt = 0.1 + rand() * 0.3;
      const open = Math.max(0, Math.min(1, (t - openAt) / 0.15));
      if (open <= 0) continue;
      const s = sc * (0.09 + rand() * 0.05) * open;
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s * 1.5, s * 1.5 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = i % 2 === 0 ? st.core : st.spark;
      ctx.beginPath();
      burstStarPath(ctx, p.x, p.y, s, s * 0.35, 4, rand() * Math.PI, squash);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.35 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x300e);
    // The climb: out of the ring's horizon in the young life, then
    // holding high. The moon outlives the glade (fades last).
    const climb = Math.min(1, t / 0.45);
    const ease = climb * climb * (3 - 2 * climb);
    const H = sc * (0.4 + 1.7 * ease);
    const mx = px + sc * 0.0;
    const my = py - H;
    const R = sc * (0.3 + 0.14 * ease);
    const moonFade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // Rising: while low, the disc is clipped by the horizon line.
    if (ease < 0.35) {
      ctx.beginPath();
      ctx.rect(mx - R * 2, my - R * 2, R * 4, R * 2 + R * (ease / 0.35) * 2);
      ctx.clip();
    }
    // Halo (deep setting first), limb-shaded disc, two dark maria.
    ctx.globalAlpha = 0.5 * moonFade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(mx, my, R * 1.5, R * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.85 * moonFade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(mx, my, R * 1.38, R * 1.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.98 * moonFade;
    ctx.fillStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(mx, my, R, R, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(mx + R * 0.35, my - R * 0.2, R * 0.22, R * 0.18, 0, 0, Math.PI * 2);
    ctx.ellipse(mx - R * 0.2, my + R * 0.3, R * 0.16, R * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    // The limb: a deep crescent on the world-side edge.
    ctx.globalAlpha = 0.55 * moonFade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.beginPath();
    ctx.ellipse(mx, my, R * 0.92, R * 0.92, 0, Math.PI * 0.35, Math.PI * 0.95);
    ctx.stroke();
    ctx.restore();
    // Moths: five pale glints in slow seeded orbits around the disc,
    // each with a dark wing-blur beneath so they read against sky.
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const phase = rand() * Math.PI * 2;
      const orbR = R * (1.7 + rand() * 1.1);
      const speed = 0.4 + rand() * 0.5;
      const a = phase + c.now / (900 / speed);
      const x = mx + Math.cos(a) * orbR;
      const y = my + Math.sin(a) * orbR * 0.6;
      const flutter = 0.7 + 0.3 * Math.sin(c.now / 70 + i * 3);
      const s = sc * 0.06 * flutter;
      ctx.globalAlpha = 0.5 * moonFade;
      ctx.fillStyle = st.deep;
      ctx.fillRect(x - s * 1.4, y - s * 0.8, s * 2.8, s * 1.6);
      ctx.globalAlpha = 0.95 * moonFade;
      ctx.fillStyle = i % 2 === 0 ? st.core : st.spark;
      ctx.fillRect(x - s, y - s * 0.6, s * 2, s * 1.2);
    }
    ctx.restore();
    if (ease > 0.3) c.glow(c.wx, c.wy - H / sc, 1.2, 0.4 * moonFade);
  },
};

// ------------------------------------------------------------ cometfall

/**
 * COMETFALL — "the visitor."
 * One beat, one guest from very far away: a teal-white head drags
 * its violet-flecked tail down the whole sky, arrives in a burst
 * star, and leaves star-glass standing in the cracked ring — shards
 * that glimmer and go dark one by one, always the way visitors
 * leave: suddenly, and all at once at the end.
 */
const cometfall: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.5 });
    storm.deployments.impact!(m, c.wx, c.wy, { scale: 0.45 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc03e7);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    const landed = t > 0.2;
    ctx.save();
    // The crater: a cracked jag ring torn at arrival.
    if (landed) {
      const k = Math.min(1, (t - 0.2) / 0.1);
      ctx.globalAlpha = 0.6 * fade * k;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      jaggedRingPath(ctx, px, py, rPx * 0.7, squash, 10, 0.28, rand() * Math.PI, c.seed ^ 9);
      ctx.fill();
      ctx.globalAlpha = 0.85 * fade * k;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      ctx.beginPath();
      jaggedRingPath(ctx, px, py, rPx * 0.62, squash, 10, 0.24, rand() * Math.PI, c.seed ^ 10);
      ctx.stroke();
      // Ejecta rays: short dark throws past the rim.
      for (let i = 0; i < 4; i++) {
        const a = rand() * Math.PI * 2;
        const p0 = pt(c, rPx * 0.66, a);
        const p1 = pt(c, rPx * (0.95 + rand() * 0.25), a);
        ctx.globalAlpha = 0.7 * fade * k;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(2.5, sc * 0.07);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc0a1);
    ctx.save();
    if (t < 0.2) {
      // The fall: head + tapering tail down the whole sky, violet
      // flecks strung along it, seeded entry lean per beat. The head
      // starts high and LANDS — the tail always points back up-sky.
      const k = t / 0.2;
      const lean = (rand() - 0.5) * 1.4; // sideways drift of the entry
      const drop = 1 - k;
      const hx = px + lean * sc * 2.2 * drop;
      const hy = py - sc * 3.2 * drop - sc * 0.1;
      const tx = hx + lean * sc * 1.1;
      const ty = hy - sc * 1.6;
      // Tail: deep sleeve then teal body, a filled taper.
      const a = Math.atan2(hy - ty, hx - tx);
      const wTail = sc * 0.2;
      const tail = (m0: number, col: string, al: number): void => {
        ctx.globalAlpha = al;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(a + Math.PI / 2) * wTail * m0, hy + Math.sin(a + Math.PI / 2) * wTail * m0);
        ctx.lineTo(tx, ty);
        ctx.lineTo(hx + Math.cos(a - Math.PI / 2) * wTail * m0, hy + Math.sin(a - Math.PI / 2) * wTail * m0);
        ctx.closePath();
        ctx.fill();
      };
      tail(1.35, st.deep, 0.55);
      tail(1.0, st.mid, 0.9);
      // Violet flecks strung on the tail.
      for (let i = 0; i < 3; i++) {
        const f = 0.25 + i * 0.28;
        const fx = hx + (tx - hx) * f;
        const fy = hy + (ty - hy) * f;
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = st.spark;
        ctx.fillRect(fx - sc * 0.04, fy - sc * 0.04, sc * 0.08, sc * 0.08);
      }
      // The head: white heart.
      ctx.globalAlpha = 1;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.16, sc * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.0, 0.5 * k);
    } else if (t < 0.32) {
      // Arrival: the burst star, big and brief.
      const k = 1 - (t - 0.2) / 0.12;
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      burstStarPath(ctx, px, py, sc * (0.5 + (1 - k) * 0.5), sc * 0.18, 5, rand() * Math.PI, squash);
      ctx.fill();
      c.glow(c.wx, c.wy, 1.6, 0.85 * k);
    }
    // Star-glass: shards standing in the crater after arrival, each
    // a thin teal triangle with a deep setting and a violet glimmer
    // that winks out on its own seeded clock.
    if (t > 0.24) {
      for (let i = 0; i < 5; i++) {
        const a = rand() * Math.PI * 2;
        const p = pt(c, rPx * (0.2 + rand() * 0.45), a);
        const dark = 0.5 + rand() * 0.45; // when this shard goes out
        const die = t > 0.9 ? (1 - t) / 0.1 : 1;
        const h = sc * (0.26 + rand() * 0.22);
        const w = sc * (0.06 + rand() * 0.03);
        const lit = t < dark;
        ctx.globalAlpha = 0.85 * die;
        ctx.fillStyle = st.deep;
        ctx.beginPath();
        ctx.moveTo(p.x - w * 1.5, p.y + sc * 0.02);
        ctx.lineTo(p.x, p.y - h * 1.06);
        ctx.lineTo(p.x + w * 1.5, p.y + sc * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = lit ? st.mid : '#2a4a52';
        ctx.beginPath();
        ctx.moveTo(p.x - w, p.y);
        ctx.lineTo(p.x, p.y - h);
        ctx.lineTo(p.x + w, p.y);
        ctx.closePath();
        ctx.fill();
        if (lit) {
          const glim = 0.6 + 0.4 * Math.sin(c.now / 80 + i * 2.6);
          ctx.globalAlpha = glim * die;
          ctx.fillStyle = i % 2 === 0 ? st.spark : st.core;
          ctx.fillRect(p.x - w * 0.4, p.y - h * 0.9, w * 0.8, h * 0.28);
        }
      }
    }
    ctx.restore();
  },
};

export const ARX_BREATH_SIGS: Record<string, AbilitySig> = {
  wickfire,
  rime_river,
  windshear,
  stonerise,
  geyser,
  anvil_sky,
  hollowcall,
  burning_glass,
  moonrise,
  cometfall,
};
