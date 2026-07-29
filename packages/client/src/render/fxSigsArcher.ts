/**
 * THE SIGNATURE LAW — the ARCHER weapon-art wave.
 *
 * Twelve bespoke set-pieces for the signature bows' Arts. Where the
 * archery technique ladder (fxSigsArchery.ts) speaks in wood and
 * fletching, this roster speaks in what each named bow DOES to the
 * world: a butcher's wake, a gull's bank, a hedge sown from a seed,
 * a note that passes through, winter locking shut, a sky torn open.
 * No standing shafts, no fletch-fans — those words are taken.
 *
 * Kind map (how the wire feeds these hooks): the fans and single
 * shots arrive as small-radius 'blast's per impact; verdant_burst
 * telegraphs (the registry skips it) then 'blast's; hoarfrost is a
 * 'nova'; cinder_rain lives as a long 'field'; skyrend rides a
 * 'beam' whose far end is the wall the ray died on. Every hook
 * stays graceful for any kind.
 *
 * All authoring laws of fxSignatures.ts bind here: hard edges,
 * save/restore hygiene, squash on ground, srand-deterministic
 * geometry, frameDt-gated emission, ≤~60 path ops per hook.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

// ------------------------------------------------------------ helpers

/**
 * The one seeded fact every hook of a cast must agree on: the entry
 * angle of the shot. Drawn from its OWN salt so spawn, ground, and
 * air read the same direction no matter what else each hook rolls.
 */
function entryAngle(c: SigCtx, salt: number): number {
  return srand(c.seed ^ salt)() * Math.PI * 2;
}

// ---------------------------------------------------------- signatures

/**
 * BROADHEAD — "the butcher's line."
 * The axe-head does axe work: the wound is a kerf — a V-notch cut
 * open along the flight line, turf flaps sheared to either side —
 * and the trail the desc promises is literal: dark drops tick into
 * being one by one DOWNSTREAM of the wound, walking the exit line.
 */
const broadhead: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xb0);
    // Turf flaps shear off both sides of the cut.
    for (const s of [-1, 1]) {
      c.particles.burst(c.wx, c.wy, 2, ['#5a5045', '#4a4252'], {
        speed: 1.6, life: 0.5, size: 0.1, gravity: 6, dir: ang + s * (Math.PI / 2), spread: 0.3, shape: 'shard', spin: 8,
      });
    }
    // The head carries THROUGH: one heavy sliver punches past.
    c.particles.burst(c.wx, c.wy - 0.3, 2, [c.st.spark, c.st.core], {
      speed: 3.0, life: 0.2, size: 0.07, gravity: 0, dir: ang, spread: 0.2, shape: 'streak',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0xb0);
    const rand = srand(c.seed ^ 0xb2);
    const fade = 1 - t;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * squash;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang) * squash;
    ctx.save();
    // The kerf: a V-notch opening along the flight line — two dark
    // wedge walls that part fast and hold.
    const open = Math.min(1, t / 0.15);
    const len = sc * 0.62;
    const gap = sc * 0.09 * open;
    ctx.globalAlpha = 0.6 * fade;
    for (const s of [-1, 1]) {
      ctx.fillStyle = s < 0 ? st.deep : '#2e2622';
      ctx.beginPath();
      ctx.moveTo(px - ux * len * 0.45, py - uy * len * 0.45);
      ctx.lineTo(px + ux * len * 0.55 + nx * s * gap, py + uy * len * 0.55 + ny * s * gap);
      ctx.lineTo(px + ux * len * 0.55 + nx * s * gap * 2.2, py + uy * len * 0.55 + ny * s * gap * 2.2);
      ctx.closePath();
      ctx.fill();
    }
    // The trail: bleed drops tick into being downstream, in order.
    for (let k = 0; k < 5; k++) {
      const born = 0.18 + k * 0.13;
      if (t < born) break;
      const d = sc * (0.5 + k * 0.34 + rand() * 0.1);
      const side = (rand() - 0.5) * sc * 0.18;
      const dt2 = Math.min(1, (t - born) / 0.1);
      ctx.globalAlpha = 0.7 * dt2 * fade;
      ctx.fillStyle = k % 2 === 0 ? '#c4372a' : '#6a1518';
      const g = sc * (0.055 - k * 0.006) * (0.6 + 0.4 * dt2);
      ctx.beginPath();
      ctx.ellipse(px + ux * d + nx * side, py + uy * d + ny * side, g, g * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0xb0);
    ctx.save();
    // The axe-head flash: a broad blade silhouette shows one blink,
    // edge leading, at the moment of the chop.
    if (t < 0.1) {
      const ft = 1 - t / 0.1;
      ctx.globalAlpha = 0.85 * ft;
      ctx.translate(px, py - sc * 0.42);
      ctx.rotate(ang);
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(sc * 0.3, 0); // the edge point
      ctx.lineTo(-sc * 0.08, -sc * 0.2);
      ctx.lineTo(-sc * 0.18, -sc * 0.06);
      ctx.lineTo(-sc * 0.18, sc * 0.06);
      ctx.lineTo(-sc * 0.08, sc * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // The wound weeps while the sig lives.
    if (Math.random() < c.frameDt * 6 * (1 - t)) {
      c.particles.burst(c.wx, c.wy - 0.3, 1, ['#c4372a', '#6a1518'], {
        speed: 0.5, life: 0.4, size: 0.05, gravity: 6, fade: '#6a1518',
      });
    }
  },
};

/**
 * WINGBEAT — "the banked gull."
 * Each strike flicks a hard two-stroke gull glyph off the wound that
 * BEATS — dihedral snapping down and up on a dying envelope — while
 * it banks away along the flight line; below, the downdraft stamps
 * one fast gust ellipse into the grass.
 */
const wingbeat: AbilitySig = {
  spawn(c) {
    // The downdraft: air pressed flat, rolling out along the ground.
    c.particles.burst(c.wx, c.wy, 4, [c.st.mid, c.st.core], {
      speed: 1.3, life: 0.5, size: 0.09, gravity: 0.2, drag: 2.2, grow: 0.18, shape: 'puff', ground: true, fade: '#ffffff',
    });
  },
  ground(c) {
    const { ctx, st, t, squash, px, py, rPx } = c;
    // The gust print: one flattened pulse, gone fast.
    if (t >= 0.4) return;
    const gt = t / 0.4;
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - gt);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, c.sc * 0.04 * (1 - gt) + 1);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * (0.3 + gt * 0.8), rPx * (0.3 + gt * 0.8) * squash * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0xb4);
    if (t >= 0.6) return;
    const ft = 1 - t / 0.6;
    // The glyph banks away along the flight line as it climbs.
    const d = t * sc * 1.1;
    const bx = px + Math.cos(ang) * d;
    const by = py - sc * (0.55 + t * 0.9) + Math.sin(ang) * d * 0.3;
    // The beat: dihedral snaps down and up, envelope dying.
    const flap = Math.sin(t * 26) * Math.exp(-t * 3.5) * 0.7;
    const roll = Math.sin(ang) * 0.35; // the bank itself
    const span = sc * 0.34 * (0.7 + 0.3 * ft);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(roll);
    ctx.globalAlpha = 0.9 * ft;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.055);
    ctx.lineCap = 'butt';
    // Two strokes meeting at the body — the painter's gull.
    ctx.beginPath();
    ctx.moveTo(-span, -span * (0.42 + flap));
    ctx.lineTo(0, 0);
    ctx.lineTo(span, -span * (0.42 - flap));
    ctx.stroke();
    // White leading edges on the outer halves.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    ctx.moveTo(-span, -span * (0.42 + flap));
    ctx.lineTo(-span * 0.5, -span * (0.21 + flap * 0.5));
    ctx.moveTo(span, -span * (0.42 - flap));
    ctx.lineTo(span * 0.5, -span * (0.21 - flap * 0.5));
    ctx.stroke();
    ctx.restore();
    // Wingtip glints shed as it beats.
    if (Math.random() < c.frameDt * 10 * ft) {
      c.particles.burst(c.wx, c.wy - 0.7 - t, 1, [st.core, st.spark], {
        speed: 0.5, life: 0.35, size: 0.06, gravity: 1.2, shape: 'glint',
      });
    }
  },
};

/**
 * VERDANT_BURST — "the sown hedge."
 * The seed pays off as GROWTH: dark root veins wriggle outward
 * through the turf while a ring of bent thorn sprouts rises around
 * the crater on staggered clocks — each a two-segment stalk with a
 * barb — swaying green at full height, then bowing dark as it wilts.
 */
const verdant_burst: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xc0);
    // The seed bursts: green motes pop up and fall back to the soil.
    c.particles.burst(c.wx, c.wy - 0.2, 6, [c.st.mid, c.st.spark], {
      speed: 2.0, life: 0.6, size: 0.07, gravity: 8, up: true, fade: c.st.deep,
    });
    // Soil kicked at the rim.
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash,
        1, ['#4a4234', '#5a5045'], {
          speed: 0.9, life: 0.6, size: 0.09, gravity: -0.4, drag: 1.8, grow: 0.2, shape: 'puff', ground: true,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc2);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // Root veins: dark green channels hunting outward, each on its
    // own reach clock, kinked once mid-run.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.6;
      const reach = Math.min(1, (t * 2.4) / (0.5 + rand() * 0.5));
      const r1 = rPx * (0.6 + rand() * 0.4) * reach;
      const bend = (rand() - 0.5) * 0.8;
      ctx.globalAlpha = 0.55 * fade * Math.min(1, reach * 2);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * rPx * 0.1, py + Math.sin(a) * rPx * 0.1 * squash);
      ctx.lineTo(px + Math.cos(a + bend * 0.4) * r1 * 0.55, py + Math.sin(a + bend * 0.4) * r1 * 0.55 * squash);
      ctx.lineTo(px + Math.cos(a + bend) * r1, py + Math.sin(a + bend) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc3);
    ctx.save();
    ctx.lineCap = 'butt';
    // The hedge: seven sprouts rise around the ring, each on its own
    // grow clock; full green in their prime, bowed and dark late.
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.4;
      const born = rand() * 0.25;
      const grow = Math.min(1, Math.max(0, (t - born) / 0.28));
      if (grow <= 0) continue;
      const wilt = Math.max(0, (t - 0.65) / 0.35);
      const bx = px + Math.cos(a) * rPx * 0.8;
      const by = py + Math.sin(a) * rPx * 0.8 * squash;
      const h = sc * (0.42 + rand() * 0.22) * grow;
      const lean = (rand() - 0.5) * 0.5 + Math.sin(c.now / 420 + k * 1.9) * 0.08 + wilt * 0.7;
      const mx = bx + Math.sin(lean * 0.5) * h * 0.5;
      const my = by - h * 0.55;
      const tx = bx + Math.sin(lean) * h;
      const ty = by - h * (1 - wilt * 0.35);
      ctx.globalAlpha = (1 - wilt * 0.6) * 0.9;
      ctx.strokeStyle = wilt > 0.3 ? st.deep : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(mx, my);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // The barb: one thorn tick off the upper segment.
      if (grow >= 1) {
        ctx.strokeStyle = wilt > 0.3 ? st.deep : st.spark;
        ctx.lineWidth = Math.max(1, sc * 0.025);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a) * sc * 0.1, my - sc * 0.06);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.25 * (1 - t));
  },
};

/**
 * WINDSONG — "the passing chord."
 * The note does not stop at the wound: three crescent wavefronts
 * slide along the flight line, THROUGH the strike and out the far
 * side, each dying as it clears, while the flight chord itself hums
 * as a scrolling dashed line — sound drawn mid-transit.
 */
const windsong: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xd0);
    // The note's wake: slivers of moving air carry straight through.
    c.particles.burst(c.wx, c.wy - 0.35, 5, [c.st.core, c.st.mid], {
      speed: 3.2, life: 0.25, size: 0.06, gravity: 0, dir: ang, spread: 0.25, shape: 'streak',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0xd0);
    // The sound-shadow: one faint band under the passing note.
    ctx.save();
    ctx.globalAlpha = 0.25 * (1 - t);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.7, sc * 0.16 * squash, Math.atan2(Math.sin(ang) * squash, Math.cos(ang)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0xd0);
    const lift = sc * 0.4;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * 0.55;
    ctx.save();
    ctx.lineCap = 'butt';
    // Three wavefront crescents ride the line through the wound —
    // each an arc bowed forward, born behind, dead past.
    for (let k = 0; k < 3; k++) {
      const f = t * 2.0 - k * 0.28;
      if (f < 0 || f > 1) continue;
      const d = (f * 2 - 0.7) * sc * 1.1;
      const bx = px + ux * d;
      const by = py - lift + uy * d;
      const rr = sc * (0.26 + k * 0.09);
      ctx.globalAlpha = 0.8 * (1 - f);
      ctx.strokeStyle = k === 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * (0.05 - k * 0.01));
      ctx.beginPath();
      ctx.arc(bx - ux * rr * 0.6, by - uy * rr * 0.6, rr, ang - 1.1, ang + 1.1);
      ctx.stroke();
    }
    // The humming chord: a dashed through-line scrolling forward.
    if (t < 0.5) {
      const ht = 1 - t / 0.5;
      ctx.globalAlpha = 0.5 * ht * (0.7 + 0.3 * Math.sin(c.now / 40));
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.setLineDash([sc * 0.12, sc * 0.09]);
      ctx.lineDashOffset = -c.now / 9;
      ctx.beginPath();
      ctx.moveTo(px - ux * sc * 1.2, py - lift - uy * sc * 1.2);
      ctx.lineTo(px + ux * sc * 1.2, py - lift + uy * sc * 1.2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  },
};

/**
 * THORN_FAN — "the lodged briar."
 * What sticks in the wound is not an arrow but a CURL: one bent
 * bramble arc lodged upright, barbs raked along its outer bow,
 * quivering itself still — and at mid-life its tip wells a single
 * green sap bead that lets go.
 */
const thorn_fan: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xe0);
    // Briar chips shear off on entry.
    c.particles.burst(c.wx, c.wy - 0.25, 3, [c.st.mid, c.st.deep], {
      speed: 1.6, life: 0.4, size: 0.06, gravity: 5, dir: ang, spread: 0.6, shape: 'shard', spin: 10,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xe2);
    const fade = 1 - t;
    ctx.save();
    // Hooked scratches: three short bent gouges around the entry.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.globalAlpha = 0.4 * fade;
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const r0 = sc * 0.1;
      const r1 = sc * (0.22 + rand() * 0.1);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a + 0.5) * r1, py + Math.sin(a + 0.5) * r1 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xe3);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const lean = (rand() - 0.5) * 0.6;
    // The quiver: the whole curl shivers to rest.
    const thrum = Math.exp(-t * 5) * Math.sin(c.now / 30) * 0.1;
    const rr = sc * (0.3 + rand() * 0.1);
    const cx = px + Math.sin(lean) * sc * 0.1;
    const cy = py - rr * 0.75;
    const a0 = Math.PI * 0.55 + lean + thrum;
    ctx.save();
    ctx.lineCap = 'butt';
    // The curl: a lodged bramble arc, deep under mid.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.5, sc * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0, a0 + 2.1);
    ctx.stroke();
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.032);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0 + 0.2, a0 + 1.9);
    ctx.stroke();
    // Barbs raked along the outer bow.
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    for (let k = 0; k < 3; k++) {
      const a = a0 + 0.5 + k * 0.55;
      const bx = cx + Math.cos(a) * rr;
      const by = cy + Math.sin(a) * rr;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a - 0.7) * sc * 0.09, by + Math.sin(a - 0.7) * sc * 0.09);
      ctx.stroke();
    }
    // The sap bead: wells at the tip, lets go at mid-life.
    if (t > 0.25 && t < 0.5) {
      const bt = (t - 0.25) / 0.25;
      const a = a0 + 2.1;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = st.spark;
      const g = sc * 0.05 * (0.5 + bt * 0.5);
      ctx.fillRect(cx + Math.cos(a) * rr - g / 2, cy + Math.sin(a) * rr - g / 2, g, g);
    }
    ctx.restore();
    if (t > 0.48 && t < 0.52 && Math.random() < c.frameDt * 30) {
      c.particles.burst(c.wx, c.wy - 0.5, 1, [st.spark, st.mid], {
        speed: 0.2, life: 0.4, size: 0.05, gravity: 7, fade: st.deep,
      });
    }
  },
};

/**
 * HOWLING_LOOSE — "the wolf's breath."
 * The cold arrives breathing: three hard breath-wedges roll forward
 * and up out of the wound on staggered clocks, staggering sideways
 * as living breath does, and crystallize — glints wink alight at the
 * plume's front — while rime claims a crescent of turf downstream.
 */
const howling_loose: AbilitySig = {
  spawn(c) {
    const ang = entryAngle(c, 0xf0);
    // The strike's cold carries through.
    c.particles.burst(c.wx, c.wy - 0.3, 3, [c.st.core, c.st.mid], {
      speed: 2.6, life: 0.22, size: 0.06, gravity: 0, dir: ang, spread: 0.3, shape: 'streak',
    });
    c.particles.burst(c.wx, c.wy - 0.4, 2, ['#ffffff', c.st.core], {
      speed: 0.6, life: 0.8, size: 0.09, gravity: 0.4, drag: 2, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const ang = entryAngle(c, 0xf0);
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const claim = Math.min(1, t / 0.35);
    ctx.save();
    // Rime crescent: frost takes the ground on the wound's far side.
    ctx.globalAlpha = 0.55 * fade * claim;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2, sc * 0.07);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.42 * claim, sc * 0.42 * claim * squash, 0, ang - 0.9, ang + 0.9);
    ctx.stroke();
    // Frost ticks bristle off the crescent.
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.strokeStyle = '#ffffff';
    for (let k = -1; k <= 1; k++) {
      const a = ang + k * 0.55;
      const r0 = sc * 0.42 * claim;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * (r0 + sc * 0.1), py + Math.sin(a) * (r0 + sc * 0.1) * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0xf0);
    const rand = srand(c.seed ^ 0xf3);
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * 0.5;
    ctx.save();
    // Three breath-wedges roll out on staggered clocks, staggering
    // sideways as they climb — breath in cold air, hard-edged.
    for (let k = 0; k < 3; k++) {
      const born = k * 0.12 + rand() * 0.06;
      const f = (t - born) / 0.55;
      if (f < 0 || f > 1) continue;
      const d = sc * (0.25 + f * 0.95);
      const sway = Math.sin(c.now / 170 + k * 2.4) * sc * 0.08 * f;
      const bx = px + ux * d + sway;
      const by = py - sc * (0.45 + f * 0.55) + uy * d;
      const s = sc * (0.13 + f * 0.1);
      ctx.globalAlpha = 0.65 * (1 - f);
      ctx.fillStyle = k % 2 === 0 ? st.mid : st.core;
      ctx.beginPath();
      ctx.moveTo(bx + ux * s * 1.4, by + uy * s * 1.4);
      ctx.lineTo(bx - ux * s * 0.6 - uy * s, by - uy * s * 0.6 + ux * s * 0.55);
      ctx.lineTo(bx - ux * s, by - uy * s);
      ctx.lineTo(bx - ux * s * 0.6 + uy * s, by - uy * s * 0.6 - ux * s * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // The breath crystallizes: glints wink alight at the front.
    if (t > 0.2 && Math.random() < c.frameDt * 8 * (1 - t)) {
      c.particles.burst(c.wx + ux * (0.6 + t), c.wy + Math.sin(ang) * 0.3 - 0.8, 1, ['#ffffff', st.core], {
        speed: 0.2, life: 0.5, size: 0.07, gravity: 0.6, shape: 'glint',
      });
    }
  },
};

/**
 * HOARFROST — "the pack-ice ridge."
 * Winter closes like sea ice: three broken shelf-arcs slide outward
 * on staggered clocks and LOCK with a white flash when they seat,
 * and along the outermost seam five pressure-ridge slabs heave
 * upright — the grip, built in stone-hard ice.
 */
const hoarfrost: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x101);
    // Sea-smoke rolls off the closing ice.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.6,
        c.wy + Math.sin(a) * c.radius * 0.6 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 0.8, life: 1.0, size: 0.12, gravity: 0.3, dir: a, spread: 0.4, drag: 1.6, grow: 0.2, shape: 'puff', fade: '#ffffff', ground: true,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x102);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // Three shelf rings, inner to outer, each four arc segments with
    // seeded gaps — sliding out, then LOCKING with a white flash.
    for (let j = 0; j < 3; j++) {
      const born = j * 0.1;
      const seat = Math.min(1, Math.max(0, (t - born) / 0.22));
      if (seat <= 0) continue;
      const rr = rPx * (0.35 + j * 0.3) * (0.6 + 0.4 * seat);
      const justLocked = seat >= 1 && t - born < 0.3;
      ctx.globalAlpha = (justLocked ? 0.95 : 0.55) * fade;
      ctx.strokeStyle = justLocked ? '#ffffff' : j === 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2, sc * (0.07 - j * 0.012));
      const rot = rand() * Math.PI;
      for (let k = 0; k < 4; k++) {
        const a = rot + (k / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(px, py, rr, rr * squash, 0, a, a + 1.15);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x103);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // The pressure ridge: five slabs heave upright along the outer
    // seam once the ice has seated under them.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.5;
      const born = 0.32 + rand() * 0.1;
      const up = Math.min(1, Math.max(0, (t - born) / 0.15));
      if (up <= 0) continue;
      const bx = px + Math.cos(a) * rPx * 0.95;
      const by = py + Math.sin(a) * rPx * 0.95 * squash;
      const h = sc * (0.2 + rand() * 0.14) * up;
      const w = sc * (0.09 + rand() * 0.05);
      const tilt = (rand() - 0.5) * 0.5;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.core : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.lineTo(bx - w * 0.4 + tilt * h, by - h);
      ctx.lineTo(bx + w * 0.5 + tilt * h, by - h * 0.85);
      ctx.lineTo(bx + w, by);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.3 * fade);
  },
};

/**
 * GHOST_SHAFT — "the stuttered arrival."
 * The strike rehearses itself into existence: three pale slashes
 * blink at the WRONG points back along the flight line — each hard
 * on, hard off — before the true white slash lands; the wound pulls
 * wisps INWARD, and its dashed outline can't hold a steady flicker.
 */
const ghost_shaft: AbilitySig = {
  spawn(c) {
    // The implosion: matter falls INTO the arrival, not out of it.
    const rand = srand(c.seed ^ 0x111);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * 0.7,
        c.wy - 0.35 + Math.sin(a) * 0.4,
        1, [c.st.mid, c.st.deep], {
          speed: 1.8, life: 0.35, size: 0.07, gravity: 0, dir: a + Math.PI, spread: 0.15, drag: 1.2, fade: c.st.deep, wobble: 0.5,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The pock that isn't sure it happened: a dashed ring gated hard
    // on/off by a seeded stutter clock — never a soft fade.
    const on = Math.sin(c.now / 70 + (c.seed % 7)) > -0.35;
    if (!on || t > 0.85) return;
    ctx.save();
    ctx.globalAlpha = 0.45 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.setLineDash([sc * 0.07, sc * 0.07]);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.24, sc * 0.24 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const ang = entryAngle(c, 0x110);
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * 0.55;
    const lift = sc * 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // The rehearsals: three ghost slashes at wrong points, each alive
    // for one hard time-band only.
    for (let k = 0; k < 3; k++) {
      if (t < k * 0.08 || t >= (k + 1) * 0.08) continue;
      const back = sc * (1.35 - k * 0.45);
      const bx = px - ux * back;
      const by = py - lift - uy * back;
      const s = sc * 0.2;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.setLineDash([sc * 0.06, sc * 0.05]);
      ctx.beginPath();
      ctx.moveTo(bx - ux * s, by - uy * s);
      ctx.lineTo(bx + ux * s, by + uy * s);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // The true arrival: the slash finally exists, bright and solid.
    if (t >= 0.24 && t < 0.5) {
      const at = 1 - (t - 0.24) / 0.26;
      ctx.globalAlpha = 0.95 * at;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.06);
      ctx.beginPath();
      ctx.moveTo(px - ux * sc * 0.3, py - lift - uy * sc * 0.3);
      ctx.lineTo(px + ux * sc * 0.3, py - lift + uy * sc * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    // Late wisps still leak backward toward where it came from.
    if (t > 0.3 && Math.random() < c.frameDt * 6 * (1 - t)) {
      c.particles.burst(c.wx, c.wy - 0.5, 1, [st.mid, st.deep], {
        speed: 0.7, life: 0.5, size: 0.06, gravity: -0.5, dir: ang + Math.PI, spread: 0.3, fade: st.deep, wobble: 0.6,
      });
    }
  },
};

/**
 * CINDER_RAIN — "the coal orchard."
 * The downpour PLANTS: coals wink alight one by one across the zone
 * as strikes land, each pulsing on its own phase, until the field is
 * an orchard of embers — and on every pulse beat the whole bed
 * flares as one while fresh fire-streaks keep falling.
 */
const cinder_rain: AbilitySig = {
  spawn(c) {
    // The skyward loose: one burning streak leaves, trailing soot.
    c.particles.burst(c.wx, c.wy - 0.4, 1, [c.st.spark, c.st.core], {
      speed: 6, life: 0.4, size: 0.09, gravity: 2, dir: -Math.PI / 2, spread: 0.1, shape: 'streak', trail: 14, trailColor: c.st.deep,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x121);
    // The pulse schedule made visible: 16-tick beats = 800 ms.
    const beat = (c.age % 800) / 800;
    const flare = beat < 0.16 ? 1 - beat / 0.16 : 0;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // The char spreads under the orchard as the rain keeps coming.
    ctx.globalAlpha = 0.3 * Math.min(1, t * 2.5) * fade;
    ctx.fillStyle = '#2e2622';
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The coals: fourteen seeded plantings, each winking alight on
    // its own clock, each pulsing on its own phase — flaring as one
    // on the beat.
    for (let k = 0; k < 14; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.85;
      const born = rand() * 0.7;
      const phase = rand() * Math.PI * 2;
      if (t < born) continue;
      const pulse = 0.5 + 0.5 * Math.sin(c.now / 220 + phase);
      const hot = Math.min(1, pulse + flare);
      ctx.globalAlpha = (0.35 + 0.65 * hot) * fade;
      ctx.fillStyle = hot > 0.8 ? st.core : hot > 0.45 ? st.spark : st.deep;
      const g = sc * (0.06 + 0.03 * hot) * (1 + flare * 0.5);
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, (0.25 + 0.3 * flare) * fade);
  },
  air(c) {
    const { st, squash } = c;
    const beat = (c.age % 800) / 800;
    const surge = beat < 0.2 ? 2.2 : 1;
    // It KEEPS coming: steep burning streaks fall inside the ring,
    // surging on the beat; the bed sighs smoke between strikes.
    if (Math.random() < c.frameDt * 7 * surge * (1 - c.t * 0.5)) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.85;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * squash - 2.2, 1, [st.spark, st.mid], {
        speed: 7, life: 0.3, size: 0.08, gravity: 4, dir: Math.PI / 2, spread: 0.06, shape: 'streak', fade: st.deep,
      });
    }
    if (Math.random() < c.frameDt * 4) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5 * squash - 0.2, 1, [st.deep, '#2e2622'], {
        speed: 0.4, life: 0.9, size: 0.09, gravity: -1.2, drag: 1.4, grow: 0.15, shape: 'puff', wobble: 0.6,
      });
    }
  },
};

/**
 * KINGS_ARROW — "the royal seal."
 * The command is stamped, not struck: the wound takes a gold signet
 * — ring, eight studs, center boss — pressed in with a white flash,
 * while two laurel fronds unfurl and arch over it in honor, hold
 * their bow, and fall away as the seal dims to old gold.
 */
const kings_arrow: AbilitySig = {
  spawn(c) {
    // The stamp scatters gilt.
    c.particles.burst(c.wx, c.wy - 0.3, 6, [c.st.spark, c.st.core], {
      speed: 1.8, life: 0.45, size: 0.06, gravity: 5, shape: 'glint', fade: c.st.deep,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The signet presses in oversized and seats — then holds, dimming
    // with royal patience.
    const seat = Math.min(1, t / 0.12);
    const press = 1.3 - 0.3 * seat;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const rr = sc * 0.34 * press;
    ctx.save();
    // The stamp flash.
    if (t < 0.1) {
      ctx.globalAlpha = (1 - t / 0.1) * 0.7;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = t < 0.5 ? st.mid : st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Eight studs ride the ring; the boss holds the center.
    ctx.fillStyle = t < 0.5 ? st.spark : st.mid;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (c.seed % 5) * 0.2;
      const g = sc * 0.05;
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    const b = sc * 0.08;
    ctx.fillRect(px - b / 2, py - b * squash * 0.5, b, b * squash);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.55 ? 1 : Math.max(0, (0.75 - t) / 0.2);
    if (fade <= 0) return;
    const unfurl = Math.min(1, t / 0.3);
    const arc = unfurl * (2 - unfurl);
    ctx.save();
    ctx.lineCap = 'butt';
    // The honor arch: two laurel fronds bow toward each other over
    // the seal, three leaf ticks each.
    for (const s of [-1, 1]) {
      const cx = px + s * sc * 0.42;
      const cy = py - sc * 0.35;
      const a0 = s < 0 ? -0.2 : Math.PI + 0.2;
      const sweep = s < 0 ? -1.25 * arc : 1.25 * arc;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, sc * 0.4, a0, a0 + sweep, s < 0);
      ctx.stroke();
      // Leaf ticks bud along the frond as it unfurls.
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      for (let k = 1; k <= 3; k++) {
        const f = k / 3.5;
        if (arc < f) continue;
        const a = a0 + sweep * f;
        const lx = cx + Math.cos(a) * sc * 0.4;
        const ly = cy + Math.sin(a) * sc * 0.4;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - s * sc * 0.07, ly - sc * 0.07);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Gilt motes drift off the arch while it stands.
    if (Math.random() < c.frameDt * 5 * fade) {
      c.particles.burst(c.wx, c.wy - 0.9, 1, [st.spark, st.core], {
        speed: 0.3, life: 0.6, size: 0.06, gravity: 0.8, shape: 'glint',
      });
    }
  },
};

/**
 * STARFALL_ARROWS — "the settled star."
 * Each of the seven lights lands as a STAR COMING TO REST: a four-
 * point star drops from the air stratum, twinkling as it falls, and
 * settles into the turf as a flattened star-print that dims — the
 * night, planted point by point.
 */
const starfall_arrows: AbilitySig = {
  spawn(c) {
    // Star-dust tossed at the touch.
    c.particles.burst(c.wx, c.wy - 0.4, 3, [c.st.spark, c.st.core], {
      speed: 1.0, life: 0.6, size: 0.08, gravity: 1.5, drag: 1.5, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    if (t < 0.5) return;
    // The star-print: the settled star, flat in the turf, dimming.
    const gt = (t - 0.5) / 0.5;
    const tw = 0.7 + 0.3 * Math.sin(c.now / 260 + (c.seed % 9));
    const g = sc * 0.1 * (1 - gt * 0.4);
    ctx.save();
    ctx.globalAlpha = (1 - gt) * 0.85 * tw;
    ctx.fillStyle = gt < 0.5 ? st.spark : st.mid;
    ctx.fillRect(px - g * 0.35, py - g * 1.6 * squash, g * 0.7, g * 3.2 * squash);
    ctx.fillRect(px - g * 1.6, py - g * 0.35 * squash, g * 3.2, g * 0.7 * squash);
    // The landing halo: one thin pulse where it seated.
    if (gt < 0.25) {
      ctx.globalAlpha = (1 - gt / 0.25) * 0.5;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.ellipse(px, py, sc * 0.2 * (1 + gt * 2), sc * 0.2 * (1 + gt * 2) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    if (t >= 0.5) return;
    // The descent: the star falls from the air stratum to the turf,
    // twinkling harder the closer it comes to rest.
    const f = t / 0.5;
    const drop = f * f; // gravity's ease-in
    const y = py - sc * 0.85 * (1 - drop);
    const tw = 0.55 + 0.45 * Math.abs(Math.sin(c.now / 70 + (c.seed % 9)));
    const g = sc * 0.09 * tw;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = st.core;
    ctx.fillRect(px - g * 0.35, y - g * 1.9, g * 0.7, g * 3.8);
    ctx.fillRect(px - g * 1.9, y - g * 0.35, g * 3.8, g * 0.7);
    ctx.fillStyle = st.spark;
    const b = g * 0.8;
    ctx.fillRect(px - b / 2, y - b / 2, b, b);
    ctx.restore();
    // It sheds light as it settles.
    if (Math.random() < c.frameDt * 8) {
      c.particles.burst(c.wx, c.wy - 0.85 * (1 - drop), 1, [st.spark, st.core], {
        speed: 0.25, life: 0.4, size: 0.05, gravity: 0.8, shape: 'glint',
      });
    }
  },
};

/**
 * SKYREND — "the late thunder."
 * The corridor is a TEAR: two jagged lips rip apart along the ray
 * over a bright core band, hold, and snap shut — and only then does
 * the sound arrive: a white crack-node runs the line BACKWARD from
 * the far end to the bow, the thunder catching up to the arrow.
 */
const skyrend: AbilitySig = {
  spawn(c) {
    // The far end takes the hit first — chips fly where the ray died.
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    c.particles.burst(c.wx2, c.wy2 - 0.35, 6, [c.st.core, c.st.mid], {
      speed: 3.0, life: 0.3, size: 0.06, gravity: 2, dir: ang, spread: 0.7, shape: 'streak',
    });
    c.particles.burst(c.wx, c.wy - 0.4, 3, [c.st.spark, c.st.core], {
      speed: 1.4, life: 0.3, size: 0.06, gravity: 1, dir: ang, spread: 0.3, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    // The scorch: a dashed shadow of the corridor on the turf.
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.setLineDash([sc * 0.2, sc * 0.13]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x131);
    const lift = sc * 0.42;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    ctx.save();
    ctx.lineCap = 'butt';
    // The tear: lips part fast, hold, snap shut by 0.6.
    const lip = t < 0.12 ? t / 0.12 : t < 0.45 ? 1 : Math.max(0, (0.6 - t) / 0.15);
    if (lip > 0) {
      const N = 6;
      // The bright core band between the lips.
      ctx.globalAlpha = 0.85 * lip;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.09 * lip);
      ctx.beginPath();
      ctx.moveTo(px, py - lift);
      ctx.lineTo(px2, py2 - lift);
      ctx.stroke();
      // Two jagged lips, seeded zig offsets mirrored over the ray.
      for (const s of [-1, 1]) {
        ctx.globalAlpha = 0.75 * lip;
        ctx.strokeStyle = s < 0 ? st.mid : st.deep;
        ctx.lineWidth = Math.max(1.5, sc * 0.04);
        ctx.beginPath();
        for (let k = 0; k <= N; k++) {
          const f = k / N;
          const jag = (0.5 + rand() * 0.8) * (k === 0 || k === N ? 0.15 : 1);
          const off = s * sc * 0.16 * lip * jag;
          const x = px + dx * f + nx * off;
          const y = py + dy * f - lift + ny * off;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Shock ticks stutter along the seam on hard staggered clocks.
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.028);
      for (let k = 0; k < 4; k++) {
        if (Math.sin(c.now / 55 + k * 2.1) < 0.3) continue;
        const f = 0.15 + k * 0.22;
        const x = px + dx * f;
        const y = py + dy * f - lift;
        ctx.globalAlpha = 0.9 * lip;
        ctx.beginPath();
        ctx.moveTo(x - nx * sc * 0.14, y - ny * sc * 0.14);
        ctx.lineTo(x + nx * sc * 0.14, y + ny * sc * 0.14);
        ctx.stroke();
      }
    }
    // The late thunder: after the tear shuts, the crack runs HOME —
    // far end back to the bow, sound chasing the arrow it lost.
    if (t >= 0.6 && t < 0.85) {
      const f = 1 - (t - 0.6) / 0.25; // 1 → 0: far end back to heart
      const x = px + dx * f;
      const y = py + dy * f - lift;
      const g = sc * 0.13;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - g / 2, y - g / 2, g, g);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      ctx.arc(x, y, g * (1.2 + (1 - f) * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f, 0.9, 0.4);
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ registry

/**
 * The archer weapon-art wave of THE SIGNATURE LAW — merged into the
 * master SIGNATURES table by the integrating lead.
 */
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
