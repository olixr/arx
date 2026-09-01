/**
 * THE SIGNATURE LAW — the SNEAK roster.
 *
 * The rogue's magic is absence and precision: afterimages, silhouettes
 * that dissolve into flecks, single perfect cut-lines, venom beads,
 * glinting points in the dark. Nothing here detonates — it arrives,
 * says exactly one true thing, and is gone before the eye is sure.
 * Thousand Cuts is the exception that proves it: a storm, but a storm
 * of razors, every line still thin and deliberate.
 *
 * Refit to the breath-wave bar: every prop is a VOLUME now — daggers
 * with two faces and an edge, caltrops with facets and a point, ghost
 * bodies filled and rim-lit, doorways with walls. Pale work rides
 * deep under-beds (THE CONTRAST LAW), arrivals quiver, and what the
 * school does to a room stays visible after the hand is gone.
 *
 * Same laws as the founding registry: hard edges only, save/restore
 * discipline, srand-seeded geometry, frameDt-gated emission, ≤ ~60
 * path ops a hook, and no two centerpieces alike.
 */

import { shade } from './tint.js';
import { srand, burstStarPath } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { venom, smoke, shadow, asMatter } from './matter/index.js';

// ------------------------------------------------------ shared glyphs

/**
 * The rogue's body, with weight in it: a filled hooded silhouette —
 * head dome under a peaked cowl, tapered coat — plus one rim-light
 * stroke down the lit flank so the figure turns in the room instead
 * of lying on the glass. Callers set fillStyle for the mass and
 * strokeStyle for the rim; alpha is theirs too. Four path ops.
 */
function fillFigure(c: SigCtx, x: number, footY: number): void {
  const { ctx, sc } = c;
  const headY = footY - sc * 0.72;
  const shW = sc * 0.17;
  const hemW = sc * 0.1;
  const shY = footY - sc * 0.56;
  // The mass: cowl peak, head dome, shoulders, coat taper — one path.
  ctx.beginPath();
  ctx.moveTo(x - sc * 0.02, headY - sc * 0.2); // the cowl's peak
  ctx.lineTo(x + sc * 0.1, headY - sc * 0.06);
  ctx.arc(x, headY, sc * 0.115, -0.5, Math.PI + 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - shW, shY);
  ctx.lineTo(x + shW, shY);
  ctx.lineTo(x + hemW, footY);
  ctx.lineTo(x - hemW, footY);
  ctx.closePath();
  ctx.fill();
  // The rim: one light down the right flank — the room has a moon.
  ctx.beginPath();
  ctx.moveTo(x + shW * 0.92, shY + sc * 0.02);
  ctx.lineTo(x + hemW * 0.92, footY - sc * 0.02);
  ctx.stroke();
}

/**
 * A knife with faces: bright top facet and shadowed belly meeting at
 * the spine, a hard edge-light on the cutting side, dark crossguard,
 * wrapped grip. Reads as forged steel at gameplay zoom, not a sliver.
 */
function fillKnife(
  c: SigCtx,
  x: number,
  y: number,
  ang: number,
  len: number,
  blade: string,
  hilt: string,
): void {
  const { ctx } = c;
  const w = len * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // The belly: the shadowed lower face.
  ctx.fillStyle = shade(blade, -22);
  ctx.beginPath();
  ctx.moveTo(len * 0.62, 0);
  ctx.lineTo(len * 0.06, w);
  ctx.lineTo(-len * 0.16, w * 0.55);
  ctx.lineTo(-len * 0.16, 0);
  ctx.closePath();
  ctx.fill();
  // The top facet: the face that holds the light.
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(len * 0.62, 0);
  ctx.lineTo(len * 0.06, -w);
  ctx.lineTo(-len * 0.16, -w * 0.55);
  ctx.lineTo(-len * 0.16, 0);
  ctx.closePath();
  ctx.fill();
  // The edge: one hairline of white down the cutting side.
  ctx.strokeStyle = shade(blade, 30);
  ctx.lineWidth = Math.max(1, len * 0.05);
  ctx.beginPath();
  ctx.moveTo(len * 0.6, -w * 0.06);
  ctx.lineTo(len * 0.08, -w * 0.92);
  ctx.stroke();
  // Guard and grip: dark cross, wrapped handle, pommel stud.
  ctx.fillStyle = hilt;
  ctx.fillRect(-len * 0.18, -w * 0.85, len * 0.07, w * 1.7);
  ctx.fillRect(-len * 0.42, -w * 0.42, len * 0.24, w * 0.84);
  ctx.fillStyle = shade(hilt, 24);
  ctx.fillRect(-len * 0.46, -w * 0.3, len * 0.06, w * 0.6);
  ctx.restore();
}

// ----------------------------------------------------------- envenom

interface VenomLay {
  ang: number;
  bx: number;
  by: number;
  beads: Array<{ f: number; s0: number; r: number }>;
}

/** Both hooks read the SAME seeded blade-and-bead layout. */
function venomLayout(c: SigCtx): VenomLay {
  const rand = srand(c.seed ^ 0x53);
  return {
    ang: -0.95 + rand() * 0.35,
    bx: c.px + c.sc * 0.15,
    by: c.py - c.sc * 0.5,
    beads: [
      { f: 0.94, s0: 0.34, r: 0.05 },
      { f: 0.56 + rand() * 0.08, s0: 0.44, r: 0.034 },
      { f: 0.76 + rand() * 0.08, s0: 0.54, r: 0.038 },
    ],
  };
}

/**
 * ENVENOM — "the venom bead."
 * The oiling ceremony, whole in one breath: a real dagger stands at
 * guard — dark sleeve, steel body, white edge — and the whetstone
 * pass climbs it hilt to tip, a bright run of oil with a white head.
 * Beads swell where the oil gathers, hang, and DROP with true weight;
 * the ground under the guard collects each landing as a dark green
 * stain that creeps and breathes a bubble. Then the wet edge goes
 * matte and slides home. The buff IS the oiled edge; the FX oils it.
 * (The 'buff' wire lives 750 ms — the rite is cut to fit the cloth.)
 */
const envenom: AbilitySig = {
  spawn(c) {
    // The vial breaks over the steel: a shiver of green at edge height.
    c.particles.burst(c.wx, c.wy - 0.55, 5, [c.st.spark, c.st.mid], {
      speed: 0.4, life: 0.6, size: 0.09, gravity: 0.3, drag: 2.2, shape: 'glint',
    });
  },
  ground(c) {
    // What the ground remembers: a stain per bead, each one creeping.
    const { ctx, st, t, sc, squash } = c;
    const lay = venomLayout(c);
    ctx.save();
    for (let p = 0; p < lay.beads.length; p++) {
      const b = lay.beads[p]!;
      // A stain exists once its bead has landed.
      const landT = b.s0 + 0.26;
      if (t < landT) continue;
      const ageP = Math.min(1, (t - landT) / 0.12);
      const bx = lay.bx + Math.cos(lay.ang) * sc * 0.52 * b.f + (p - 1) * sc * 0.1;
      const r = sc * b.r * 2.6 * ageP;
      // The splat: a dark heart with a lighter wet ring around it.
      ctx.globalAlpha = 0.55 * (1 - t * 0.6) * ageP;
      ctx.fillStyle = shade(st.deep, -10);
      ctx.beginPath();
      ctx.ellipse(bx, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4 * (1 - t * 0.6) * ageP;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(bx, c.py, r * 1.45, r * 1.45 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The creep: a thin mid ring pushing out past the wet edge.
      ctx.globalAlpha = 0.35 * (1 - t * 0.6) * ageP;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.ellipse(bx, c.py, r * 1.9, r * 1.9 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The stain breathes one bubble now and then — venom, working.
      const bub = Math.sin(c.now / 380 + p * 2.6);
      if (bub > 0.86) {
        ctx.globalAlpha = 0.7 * (bub - 0.86) / 0.14 * (1 - t * 0.6);
        ctx.fillStyle = st.spark;
        const g = Math.max(1.5, sc * 0.022);
        ctx.fillRect(bx + (p - 1) * sc * 0.04 - g / 2, c.py - r * squash * 0.4 - g / 2, g, g);
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const lay = venomLayout(c);
    const dx = Math.cos(lay.ang);
    const dy = Math.sin(lay.ang);
    const L = sc * 0.52;
    const sheathe = t < 0.85 ? 1 : (1 - t) / 0.15; // the edge goes home
    if (sheathe <= 0) return;
    const bob = Math.sin(c.now / 420) * sc * 0.015; // the guard breathes
    const bx = lay.bx;
    const by = lay.by + bob;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = sheathe;
    // The dagger at guard: dark under-sleeve, steel body, white edge —
    // a blade with a back and a cutting side, not a stick.
    ctx.strokeStyle = shade(st.deep, -12);
    ctx.lineWidth = Math.max(3, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + dx * L, by + dy * L);
    ctx.stroke();
    ctx.strokeStyle = '#b8bec8';
    ctx.lineWidth = Math.max(2, sc * 0.042);
    ctx.beginPath();
    ctx.moveTo(bx + dx * L * 0.04, by + dy * L * 0.04);
    ctx.lineTo(bx + dx * L * 0.98, by + dy * L * 0.98);
    ctx.stroke();
    ctx.strokeStyle = '#e8ecf2';
    ctx.lineWidth = Math.max(1, sc * 0.016);
    ctx.beginPath();
    ctx.moveTo(bx + dx * L * 0.1 - dy * sc * 0.014, by + dy * L * 0.1 + dx * sc * 0.014);
    ctx.lineTo(bx + dx * L * 0.96 - dy * sc * 0.014, by + dy * L * 0.96 + dx * sc * 0.014);
    ctx.stroke();
    // Guard and grip: the hand end is a dagger's, cross and wrap.
    ctx.strokeStyle = shade(st.deep, -18);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(bx - dy * sc * 0.07, by + dx * sc * 0.07);
    ctx.lineTo(bx + dy * sc * 0.07, by - dx * sc * 0.07);
    ctx.stroke();
    ctx.strokeStyle = '#3a3430';
    ctx.lineWidth = Math.max(2.5, sc * 0.055);
    ctx.beginPath();
    ctx.moveTo(bx - dx * sc * 0.02, by - dy * sc * 0.02);
    ctx.lineTo(bx - dx * sc * 0.16, by - dy * sc * 0.16);
    ctx.stroke();
    // The sheen: behind the pass the oil sits wet, dimming to matte.
    const wet = t > 0.35 ? Math.max(0, 1 - (t - 0.35) * 1.8) : 0;
    if (wet > 0.05) {
      ctx.globalAlpha = 0.5 * wet * sheathe;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(bx + dx * L * 0.12, by + dy * L * 0.12);
      ctx.lineTo(bx + dx * L * 0.94, by + dy * L * 0.94);
      ctx.stroke();
    }
    // The whetstone pass: a short bright run of oil climbing the edge
    // hilt to tip in the first third of the rite — the rite itself.
    if (t < 0.35) {
      const run = Math.max(0, (t - 0.04) / 0.31);
      const head = 0.1 + run * 0.88;
      ctx.globalAlpha = 0.95 * sheathe;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(bx + dx * L * Math.max(0.08, head - 0.22), by + dy * L * Math.max(0.08, head - 0.22));
      ctx.lineTo(bx + dx * L * head, by + dy * L * head);
      ctx.stroke();
      // The head of the run carries one white catch.
      ctx.fillStyle = c.st.core;
      const g = Math.max(1.5, sc * 0.024);
      ctx.fillRect(bx + dx * L * head - g / 2, by + dy * L * head - g / 2, g, g);
    }
    // The beads: where the pass left oil, drops swell, hang, and let
    // go — the fall itself belongs to the MATTER LIBRARY, one true
    // drop per bead, released on the exact crossing frame.
    const lifeMs = t > 0 ? c.age / t : 0;
    const tPrev = lifeMs > 0 ? Math.max(0, (c.age - c.frameDt * 1000) / lifeMs) : 0;
    for (const b of lay.beads) {
      if (t < b.s0) continue;
      const releaseP = b.s0 + 0.16;
      const ex = bx + dx * L * b.f;
      const ey = by + dy * L * b.f;
      if (t >= releaseP) {
        if (tPrev < releaseP) {
          venom.deployments.bead!(asMatter(c), c.wx + 0.15 + Math.cos(lay.ang) * 0.52 * b.f, c.wy, {
            z: 0.5 - Math.sin(lay.ang) * 0.52 * b.f, scale: 0.9,
          });
        }
        continue;
      }
      const swell = Math.min(1, (t - b.s0) / 0.16);
      ctx.globalAlpha = 0.9 * sheathe;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(ex, ey, sc * b.r * swell * 0.8, sc * b.r * swell, 0, 0, Math.PI * 2);
      ctx.fill();
      // The catchlight that makes it a DROP and not a dot.
      ctx.fillStyle = c.st.core;
      ctx.fillRect(ex - 1, ey - sc * b.r * swell * 0.4, Math.max(1, sc * 0.014), Math.max(1, sc * 0.014));
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.14 * sheathe);
  },
};

// ------------------------------------------------------- night_fangs

/**
 * NIGHT_FANGS — "the buried fang."
 * Each impact leaves a fang of dark PLANTED in the wound — a curved
 * two-faced tooth, shadow on its outer cheek, bruise-violet on the
 * inner, quivering with the force of arrival over a snapped-out dark
 * star. A white point winks at its butt; thin dark trickles crawl
 * groundward beneath it, each ending in a welling bead. The homing
 * throw already picked its throat; the signature shows it landed.
 */
const night_fangs: AbilitySig = {
  spawn(c) {
    // The bite snaps shut: a spray of void shards, gone fast.
    c.particles.burst(c.wx, c.wy - 0.35, 5, [c.st.mid, c.st.deep], {
      speed: 1.8, life: 0.3, size: 0.08, gravity: 4, shape: 'shard', spin: 10,
    });
    c.particles.burst(c.wx, c.wy - 0.35, 2, [c.st.spark], {
      speed: 0.5, life: 0.5, size: 0.08, gravity: 0.4, drag: 2, shape: 'glint',
    });
  },
  ground(c) {
    // Trickles: two dark runs crawling from under the wound, each
    // pushing a welling bead ahead of itself.
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x55);
    ctx.save();
    for (let k = 0; k < 2; k++) {
      const a = Math.PI * 0.5 + (rand() - 0.5) * 1.6;
      const reach = Math.min(1, t / (0.5 + rand() * 0.3));
      const len = sc * (0.24 + rand() * 0.16) * reach;
      const bend = (rand() - 0.5) * 0.8;
      const hx = px + Math.cos(a + bend) * len;
      const hy = py + Math.sin(a + bend) * len * squash;
      ctx.globalAlpha = 0.55 * (1 - t);
      ctx.strokeStyle = k === 0 ? st.deep : '#3a1a22';
      ctx.lineWidth = Math.max(1, sc * 0.024);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      // The head bead: the trickle's weight gathering at its front.
      ctx.globalAlpha = 0.7 * (1 - t);
      ctx.fillStyle = k === 0 ? st.deep : '#3a1a22';
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.035 * reach, sc * 0.035 * reach * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    if (c.kind === 'bolt') return; // flight is the grammar's; we own the landing
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x56);
    const hy = py - sc * 0.35; // the wound sits at chest height
    const lean = -Math.PI * 0.5 + (rand() - 0.5) * 1.2;
    // The arrival star: a dark snap behind the fang, gone in a breath.
    if (t < 0.16) {
      const st0 = 1 - t / 0.16;
      ctx.save();
      ctx.globalAlpha = 0.7 * st0;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      burstStarPath(ctx, px, hy, sc * 0.3 * (1 - st0 * 0.4), sc * 0.12, 5, lean);
      ctx.fill();
      ctx.restore();
    }
    // Quiver: the fang still shakes with the force of arrival.
    const quiver = Math.sin(c.now / 36) * 0.09 * Math.max(0, 1 - t * 1.6);
    const a = lean + quiver;
    const len = sc * 0.36;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // The fang curves: its back bows off the straight line tip-to-butt.
    const bowX = -sa * len * 0.22;
    const bowY = ca * len * 0.22;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    // Outer cheek: the shadowed face of the tooth.
    ctx.fillStyle = shade(st.deep, -10);
    ctx.beginPath();
    ctx.moveTo(px, hy);
    ctx.quadraticCurveTo(
      px + ca * len * 0.5 + bowX, hy + sa * len * 0.5 + bowY,
      px + ca * len - sa * len * 0.15, hy + sa * len + ca * len * 0.15,
    );
    ctx.lineTo(px + ca * len * 0.55, hy + sa * len * 0.55);
    ctx.closePath();
    ctx.fill();
    // Inner cheek: bruise-violet, the face that catches what light is.
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(px, hy);
    ctx.lineTo(px + ca * len * 0.55, hy + sa * len * 0.55);
    ctx.lineTo(px + ca * len + sa * len * 0.15, hy + sa * len - ca * len * 0.15);
    ctx.closePath();
    ctx.fill();
    // The gleam: one hairline down the inner curve — enamel in moonlight.
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.016);
    ctx.beginPath();
    ctx.moveTo(px + ca * len * 0.12 + sa * sc * 0.02, hy + sa * len * 0.12 - ca * sc * 0.02);
    ctx.lineTo(px + ca * len * 0.8 + sa * sc * 0.035, hy + sa * len * 0.8 - ca * sc * 0.035);
    ctx.stroke();
    // The white point at the butt: the only light night allows —
    // crossed, so it reads as a star and not a stray pixel.
    const tw = 0.5 + 0.5 * Math.sin(c.now / 120 + (c.seed % 7));
    ctx.globalAlpha = (1 - t) * tw;
    ctx.fillStyle = c.st.core;
    const g = Math.max(1.5, sc * 0.026);
    const gx = px + ca * len;
    const gy = hy + sa * len;
    ctx.fillRect(gx - g / 2, gy - g * 1.5, g, g * 3);
    ctx.fillRect(gx - g * 1.5, gy - g / 2, g * 3, g);
    ctx.restore();
  },
};

// -------------------------------------------------------- ghost_step

/**
 * GHOST_STEP — "the rumor file."
 * The dash leaves a file of BODIES standing along the path — the
 * rumor of a rogue told three times, each teller a filled, rim-lit
 * silhouette swaying where it stands, dissolving into rising flecks
 * in the order the rumor passed. A low haze of displaced night hangs
 * knee-deep along the whole line. At the arrival the cut lands BEFORE
 * the body does: one white slash over a dark under-stroke, a star at
 * the crossing, then the flesh catches up.
 */
const ghost_step: AbilitySig = {
  spawn(c) {
    // The cut that arrived first: steel slivers off the arrival point.
    c.particles.burst(c.wx2, c.wy2 - 0.4, 3, [c.st.spark, '#d8d4e8'], {
      speed: 2.6, life: 0.25, size: 0.06, gravity: 2, dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx || 0.01), spread: 0.5, shape: 'streak',
    });
  },
  ground(c) {
    // Footprints the rumor left: heel-and-toe pairs fading oldest-first.
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dxs = px2 - px;
    const dys = py2 - py;
    const L = Math.hypot(dxs, dys);
    if (L < 1) return;
    const ux = dxs / L;
    const uy = dys / L;
    const nx = -dys / L;
    const ny = dxs / L;
    ctx.save();
    ctx.fillStyle = st.deep;
    for (let k = 0; k < 4; k++) {
      const f = 0.15 + k * 0.22;
      const side = k % 2 === 0 ? 1 : -1;
      const alpha = Math.max(0, 1 - t * 1.3 - (3 - k) * 0.12);
      if (alpha <= 0) continue;
      const cxp = px + dxs * f + nx * sc * 0.09 * side;
      const cyp = py + dys * f + ny * sc * 0.09 * side;
      // Heel pad and toe pad: a print, not a dot.
      ctx.globalAlpha = 0.45 * alpha;
      ctx.beginPath();
      ctx.ellipse(cxp, cyp, sc * 0.045, sc * 0.05 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.38 * alpha;
      ctx.beginPath();
      ctx.ellipse(cxp + ux * sc * 0.075, cyp + uy * sc * 0.075 * squash, sc * 0.032, sc * 0.036 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The displaced night: a low haze band lying along the path.
    ctx.globalAlpha = 0.16 * Math.max(0, 1 - t * 1.4);
    ctx.fillStyle = st.deep;
    const hw = sc * 0.16;
    ctx.beginPath();
    ctx.moveTo(px + nx * hw, py + ny * hw - sc * 0.06);
    ctx.lineTo(px2 + nx * hw, py2 + ny * hw - sc * 0.06);
    ctx.lineTo(px2 - nx * hw, py2 - ny * hw - sc * 0.06);
    ctx.lineTo(px - nx * hw, py - ny * hw - sc * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    // The file: three tellers stationed along the path — filled and
    // rim-lit now, swaying like something remembered — dissolving in
    // the order the rumor passed through them.
    for (let k = 0; k < 3; k++) {
      const f = 0.28 + k * 0.26;
      const alpha = Math.max(0, Math.min(1, 1.15 - (t * 1.8 - k * 0.3)));
      if (alpha <= 0) continue;
      const sway = Math.sin(c.now / 300 + k * 2.1) * sc * 0.02;
      const gx = px + (px2 - px) * f + sway;
      const gy = py + (py2 - py) * f;
      ctx.globalAlpha = 0.8 * alpha;
      ctx.fillStyle = k === 1 ? st.mid : shade(st.mid, -24);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      fillFigure(c, gx, gy);
      // Each teller sheds flecks as it forgets itself — off the crown
      // first, the way a rumor loses its face before its shape.
      if (Math.random() < c.frameDt * 5 * alpha) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f - 0.75, 1, [st.mid, st.deep], {
          speed: 0.35, life: 0.45, size: 0.07, gravity: -0.8, drag: 1.5, wobble: 0.4,
        });
      }
    }
    // The cut that outran its cutter: dark under-stroke, white slash,
    // and a star where the edge crossed the arrival.
    if (t < 0.28) {
      const ft = 1 - t / 0.28;
      const sa = Math.atan2(py2 - py, (px2 - px) || 0.01) + 0.55;
      const len = sc * 0.52 * (0.5 + 0.5 * (1 - ft));
      const cy = py2 - sc * 0.45;
      ctx.globalAlpha = 0.7 * ft;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(3, sc * 0.07);
      ctx.beginPath();
      ctx.moveTo(px2 - Math.cos(sa) * len, cy - Math.sin(sa) * len);
      ctx.lineTo(px2 + Math.cos(sa) * len, cy + Math.sin(sa) * len);
      ctx.stroke();
      ctx.globalAlpha = ft;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(px2 - Math.cos(sa) * len * 0.94, cy - Math.sin(sa) * len * 0.94);
      ctx.lineTo(px2 + Math.cos(sa) * len * 0.94, cy + Math.sin(sa) * len * 0.94);
      ctx.stroke();
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      burstStarPath(ctx, px2 + Math.cos(sa) * len * 0.55, cy + Math.sin(sa) * len * 0.55, sc * 0.11 * ft, sc * 0.045 * ft, 4, sa);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.7, 0.2 * Math.max(0, 1 - t * 2));
  },
};

// ---------------------------------------------------------- caltrops

/**
 * CALTROPS — "the iron sowing."
 * The field is nine FORGED teeth scattered where they fell: each one
 * sits on its own contact shadow, two base spurs lying crossed with a
 * lit top edge, and a standing spike built of two facets — shadow
 * cheek and iron cheek meeting at a white point. Each catches light
 * on its own clock — a slow menace of glints saying the floor now has
 * a price — and when the iron is spent it rusts out tooth by tooth.
 */
const caltrops: AbilitySig = {
  spawn(c) {
    // The toss: iron patters out on REAL arcs — each barb hops once
    // where it lands and lies there. The sowing, sown. (Bespoke iron,
    // not a library material — but v5 physics all the same.)
    c.particles.burst(c.wx, c.wy, 9, [c.st.deep, c.st.mid], {
      speed: 1.3, life: 1.1, size: 0.075, gravity: 0, shape: 'shard',
      spin: 11, z: 0.35, vz: 1.6, zg: 8.5, land: 'bounce', bounce: 0.35,
      layer: 'world',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x5b);
    ctx.save();
    ctx.lineCap = 'butt';
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.85;
      const rot = rand() * Math.PI;
      const dieT = 0.9 + rand() * 0.08; // spent iron rusts out singly
      const seen = Math.min(1, Math.max(0, (t - k * 0.006) / 0.01));
      if (seen <= 0 || t >= dieT) continue;
      const out = t > dieT - 0.05 ? (dieT - t) / 0.05 : 1;
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      const s = sc * 0.12;
      const spikeH = sc * 0.2;
      // The contact shadow: iron has weight; the turf says so.
      ctx.globalAlpha = 0.38 * seen * out;
      ctx.fillStyle = shade(st.deep, -18);
      ctx.beginPath();
      ctx.ellipse(x, y + sc * 0.015, s * 1.25, s * 0.55 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two crossed base spurs lying flat — dark iron on the dirt.
      ctx.globalAlpha = 0.85 * seen * out;
      ctx.strokeStyle = shade(st.deep, -12);
      ctx.lineWidth = Math.max(2, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(rot) * s, y - Math.sin(rot) * s * squash);
      ctx.lineTo(x + Math.cos(rot) * s, y + Math.sin(rot) * s * squash);
      ctx.moveTo(x - Math.cos(rot + 1.9) * s, y - Math.sin(rot + 1.9) * s * squash);
      ctx.lineTo(x + Math.cos(rot + 1.9) * s, y + Math.sin(rot + 1.9) * s * squash);
      ctx.stroke();
      // The lit top edge on the forward spur: forged, not scribbled.
      ctx.globalAlpha = 0.7 * seen * out;
      ctx.strokeStyle = shade(st.mid, 14);
      ctx.lineWidth = Math.max(1, sc * 0.016);
      ctx.beginPath();
      ctx.moveTo(x, y - sc * 0.012);
      ctx.lineTo(x + Math.cos(rot) * s * 0.9, y + Math.sin(rot) * s * 0.9 * squash - sc * 0.012);
      ctx.stroke();
      // The spike that does the paying: two facets to a white point.
      ctx.globalAlpha = 0.95 * seen * out;
      ctx.fillStyle = shade(st.deep, -16);
      ctx.beginPath();
      ctx.moveTo(x - sc * 0.042, y);
      ctx.lineTo(x, y - spikeH);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.mid, 14);
      ctx.beginPath();
      ctx.moveTo(x + sc * 0.042, y);
      ctx.lineTo(x, y - spikeH);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
      // Each tooth winks on its own clock — menace, not sparkle.
      const tw = Math.sin(c.now / 340 + k * 2.7);
      if (tw > 0.72) {
        const g = Math.max(1.5, sc * 0.03) * (tw - 0.72) / 0.28;
        ctx.globalAlpha = 0.95 * seen * out;
        ctx.fillStyle = c.st.core;
        ctx.fillRect(x - g / 2, y - spikeH - g * 1.6, g, g * 3.2);
        ctx.fillRect(x - g * 1.6, y - spikeH - g / 2, g * 3.2, g);
      }
    }
    ctx.restore();
  },
  air(c) {
    // A stray glint lifts off the field now and then — the light
    // finding an edge it wishes it hadn't.
    if (Math.random() < c.frameDt * 3 * (c.t < 0.9 ? 1 : 0)) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * c.radius * 0.8;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, 1, [c.st.core, c.st.spark], {
        speed: 0.1, life: 0.5, size: 0.08, gravity: -0.2, shape: 'glint',
      });
    }
  },
};

// ----------------------------------------------------- fan_of_knives

/**
 * FAN_OF_KNIVES — "the knife halo."
 * Eight forged blades RADIATE from the body — each a two-faced knife
 * with an edge-light, flying flat behind its own speed smear, sinking
 * as it goes — and where each one lands it PLANTS: tip in the turf,
 * grip in the air, a contact shadow under it and a settling quiver in
 * the steel. The ground keeps eight score-grooves where they passed,
 * each with a lit lip. A halo of edges: it blooms once, never orbits.
 */
const fan_of_knives: AbilitySig = {
  spawn(c) {
    // The release: one ring of steel slivers snapping outward low.
    c.particles.burst(c.wx, c.wy - 0.35, 8, [c.st.core, c.st.spark], {
      speed: 3.4, life: 0.3, size: 0.06, gravity: 1, shape: 'streak',
    });
  },
  ground(c) {
    // Score-grooves: the floor remembers every blade's flight line —
    // a dark cut with a lit lip on the sun side.
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x61);
    const off = rand() * 0.8;
    const u = Math.min(1, t / 0.45);
    const reach = 1 - (1 - u) * (1 - u);
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - t);
    ctx.strokeStyle = shade(st.deep, -14);
    ctx.lineWidth = Math.max(2, sc * 0.042);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + off;
      ctx.moveTo(px + Math.cos(a) * rPx * 0.28, py + Math.sin(a) * rPx * 0.28 * squash);
      ctx.lineTo(px + Math.cos(a) * rPx * 0.95 * reach, py + Math.sin(a) * rPx * 0.95 * reach * squash);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.25 * (1 - t);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.014);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + off;
      ctx.moveTo(px + Math.cos(a) * rPx * 0.3, py + Math.sin(a) * rPx * 0.3 * squash - sc * 0.015);
      ctx.lineTo(px + Math.cos(a) * rPx * 0.92 * reach, py + Math.sin(a) * rPx * 0.92 * reach * squash - sc * 0.015);
    }
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.25 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x62);
    const off = rand() * 0.8;
    const u = Math.min(1, t / 0.45);
    const reach = 1 - (1 - u) * (1 - u); // thrown hard, arriving easy
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const planted = u >= 1;
    ctx.save();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + off;
      const R = rPx * 0.95 * reach;
      const lift = sc * (0.45 - 0.33 * reach); // flies flat, sinks to plant
      const x = px + Math.cos(a) * R;
      const y = py + Math.sin(a) * R * squash - lift;
      const sa = Math.atan2(Math.sin(a) * squash, Math.cos(a));
      // In flight: a speed smear trails each blade — thrown, not hung.
      if (!planted) {
        ctx.globalAlpha = 0.45 * fade;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(sa) * sc * 0.38, y - Math.sin(sa) * sc * 0.38);
        ctx.lineTo(x - Math.cos(sa) * sc * 0.1, y - Math.sin(sa) * sc * 0.1);
        ctx.stroke();
      }
      // Planted: contact shadow first, so the stand has ground truth.
      if (planted) {
        ctx.globalAlpha = 0.35 * fade;
        ctx.fillStyle = shade(st.deep, -14);
        ctx.beginPath();
        ctx.ellipse(x, py + Math.sin(a) * R * squash + sc * 0.01, sc * 0.11, sc * 0.05 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The blade: flat in flight; once landed it stands tip-down,
      // leaning outward, shivering off the arrival.
      ctx.globalAlpha = 0.95 * fade;
      const quiver = planted ? Math.sin(c.now / 40 + k) * 0.07 * Math.max(0, 1 - (t - 0.45) / 0.25) : 0;
      const standA = planted ? sa * 0.12 - Math.PI / 2 + (a > Math.PI ? -0.35 : 0.35) + quiver : sa;
      const py2k = planted ? py + Math.sin(a) * R * squash - sc * 0.16 : y;
      fillKnife(c, x, py2k, standA, sc * 0.44, k % 2 === 0 ? shade(st.mid, 8) : shade(st.mid, 18), shade(st.deep, -10));
      // Each blade earns one glint as it stops.
      if (planted && t < 0.62) {
        const g = Math.max(1.5, sc * 0.028);
        ctx.globalAlpha = fade * (1 - (t - 0.45) / 0.17);
        ctx.fillStyle = c.st.core;
        ctx.fillRect(x - g / 2, py2k - sc * 0.3 - g * 1.5, g, g * 3);
        ctx.fillRect(x - g * 1.5, py2k - sc * 0.3 - g / 2, g * 3, g);
      }
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ feint_double

/**
 * FEINT_DOUBLE — "the standing lie."
 * The decoy snaps TRUE while the truth walks out of it: a solid
 * two-toned figure — lit flank, shadowed flank, hooded — drops onto a
 * dashed stage-seam turning underfoot, settles with one small bounce,
 * flickers wrong once if you know to look, then hands itself off to
 * the standing summon beneath it. The rogue that was slides aside and
 * dissolves crown-first into flecks — it loses its face before its
 * shape, the way the departed always do. (The 'summon' wire is the
 * arrival's half-second; the decoy that remains is a real entity.)
 */
const feint_double: AbilitySig = {
  spawn(c) {
    // The swap: one soft gray exhale — the library's smoke at a
    // whisper. No light, no noise, half a breath.
    smoke.deployments.billow!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
  },
  ground(c) {
    // The stage-seam: a dashed ring turning slowly under the lie,
    // with four chalk corner-marks — the blocking, laid out.
    const { ctx, st, t, sc, squash, px, py } = c;
    const settle = Math.min(1, c.age / 220);
    ctx.save();
    ctx.globalAlpha = 0.5 * settle * (1 - t * 0.5);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.setLineDash([sc * 0.09, sc * 0.07]);
    ctx.lineDashOffset = c.now / 40;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.42, sc * 0.42 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // The chalk marks: four short ticks squaring the stage.
    ctx.globalAlpha = 0.4 * settle * (1 - t * 0.5);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = Math.PI * 0.25 + (k / 4) * Math.PI * 2;
      const mx = px + Math.cos(a) * sc * 0.56;
      const my = py + Math.sin(a) * sc * 0.56 * squash;
      ctx.moveTo(mx - Math.cos(a + Math.PI / 2) * sc * 0.05, my - Math.sin(a + Math.PI / 2) * sc * 0.05 * squash);
      ctx.lineTo(mx + Math.cos(a + Math.PI / 2) * sc * 0.05, my + Math.sin(a + Math.PI / 2) * sc * 0.05 * squash);
    }
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x65);
    const la = rand() * Math.PI * 2; // which way the truth leaves
    ctx.save();
    // The lie, arriving with WEIGHT: it drops the last hand-span and
    // gives one small settle-bounce, then hands off to the entity.
    const arr = Math.min(1, c.age / 220);
    const bounce = arr < 1 ? (1 - arr) * (1 - arr) * sc * 0.18 : 0;
    const breathe = 1 + 0.014 * Math.sin(c.now / 480);
    // The flicker of wrongness: one bad frame, if you're watching.
    const flick = Math.sin(c.now / 90 + c.seed) > 0.93 ? 0.35 : 1;
    const end = t < 0.55 ? 1 : Math.max(0, (0.9 - t) / 0.35); // the handoff
    if (end > 0) {
      ctx.save();
      ctx.translate(px, py - bounce);
      ctx.scale(breathe, 2 - breathe);
      ctx.translate(-px, -py);
      // Shadow flank: the whole mass, dark.
      ctx.globalAlpha = 0.75 * arr * flick * end;
      ctx.fillStyle = shade(st.deep, -6);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      fillFigure(c, px, py);
      // Lit flank: a half-mask of gray laid over the moonward side.
      ctx.globalAlpha = 0.55 * arr * flick * end;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(px + sc * 0.02, py - sc * 0.88);
      ctx.lineTo(px + sc * 0.15, py - sc * 0.6);
      ctx.lineTo(px + sc * 0.16, py - sc * 0.56);
      ctx.lineTo(px + sc * 0.09, py);
      ctx.lineTo(px + sc * 0.01, py);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // The truth, leaving: a filled dark body sliding aside,
    // dissolving crown-first as it goes.
    const gone = Math.min(1, c.age / 460);
    const alpha = 0.55 * (1 - gone);
    if (alpha > 0.02) {
      const lx = px + Math.cos(la) * sc * 0.9 * gone;
      const ly = py + Math.sin(la) * sc * 0.35 * gone * c.squash;
      ctx.save();
      // The crown dissolves first: clip away the top as it goes.
      ctx.beginPath();
      ctx.rect(lx - sc, ly - sc * (1 - gone * 0.9), sc * 2, sc * (1 - gone * 0.9));
      ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = st.deep;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      fillFigure(c, lx, ly);
      ctx.restore();
      // It sheds itself as it goes.
      if (Math.random() < c.frameDt * 8 * (1 - gone)) {
        c.particles.burst(c.wx + Math.cos(la) * 0.9 * gone, c.wy + Math.sin(la) * 0.35 * gone - 0.55 - gone * 0.3, 1, [st.mid, st.deep], {
          speed: 0.3, life: 0.5, size: 0.07, gravity: -0.6, drag: 1.4, wobble: 0.4,
        });
      }
    }
    ctx.restore();
  },
};

// --------------------------------------------------- exposing_strike

/**
 * EXPOSING_STRIKE — "the notarized flaw."
 * The swing finds the flaw and makes it official: a seam hangs where
 * the blade read the target, its two lips HINGING apart with real
 * thickness — lit top faces over shadowed jambs — to show the raw
 * red under it, brighter at the heart, welling beads along the open
 * line. Serif brackets stamp both ends like a surveyor's verdict,
 * and a beveled chevron marks the ground beneath. Filed. Witnessed.
 */
const exposing_strike: AbilitySig = {
  spawn(c) {
    // The seam sprays as it opens: a spit of raw shards.
    const a = c.dir;
    c.particles.burst(c.wx + Math.cos(a) * 1.35, c.wy + Math.sin(a) * 1.35 - 0.4, 5, [c.st.spark, c.st.mid], {
      speed: 1.6, life: 0.3, size: 0.06, gravity: 4, dir: a, spread: 0.9, shape: 'shard', spin: 8,
    });
  },
  ground(c) {
    // The verdict stamp: a beveled chevron under the seam — dark cut
    // with a lit forward edge, pointing at what was found.
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const gx = px + Math.cos(dir) * 1.35 * sc;
    const gy = py + Math.sin(dir) * 1.35 * sc * squash;
    const sa = Math.atan2(Math.sin(dir) * squash, Math.cos(dir));
    const s = sc * 0.22;
    ctx.save();
    ctx.globalAlpha = 0.65 * (1 - t);
    ctx.strokeStyle = shade(st.deep, -10);
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.moveTo(gx - Math.cos(sa - 0.6) * s, gy - Math.sin(sa - 0.6) * s);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx - Math.cos(sa + 0.6) * s, gy - Math.sin(sa + 0.6) * s);
    ctx.stroke();
    ctx.globalAlpha = 0.5 * (1 - t);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.018);
    ctx.beginPath();
    ctx.moveTo(gx - Math.cos(sa - 0.6) * s * 0.9, gy - Math.sin(sa - 0.6) * s * 0.9 - sc * 0.02);
    ctx.lineTo(gx, gy - sc * 0.02);
    ctx.lineTo(gx - Math.cos(sa + 0.6) * s * 0.9, gy - Math.sin(sa + 0.6) * s * 0.9 - sc * 0.02);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * 1.35, c.wy + Math.sin(dir) * 1.35, 0.7, 0.3 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const cx = px + Math.cos(dir) * 1.35 * sc;
    const cy = py + Math.sin(dir) * 1.35 * sc * squash - sc * 0.42;
    const sa = Math.atan2(Math.sin(dir) * squash, Math.cos(dir)) + Math.PI / 2;
    const open = 0.32 * Math.min(1, t / 0.5); // the lips hinge apart
    const len = sc * 0.46;
    const ca = Math.cos(sa);
    const sn = Math.sin(sa);
    ctx.save();
    ctx.lineCap = 'butt';
    // The sweep flash: the blade's read, one white pass, gone fast.
    if (t < 0.14) {
      const ft = 1 - t / 0.14;
      ctx.globalAlpha = 0.85 * ft;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(cx - ca * len * 1.5, cy - sn * len * 1.5);
      ctx.lineTo(cx + ca * len * 1.5, cy + sn * len * 1.5);
      ctx.stroke();
    }
    // The raw red under the seam — deep at the lips, bright at the
    // heart, visible only once it opens.
    const seen = Math.min(1, t / 0.3) * (1 - t * 0.4);
    ctx.globalAlpha = 0.85 * seen;
    ctx.fillStyle = shade(st.spark, -20);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(sa + open) * len, cy + Math.sin(sa + open) * len);
    ctx.lineTo(cx + Math.cos(sa - open) * len, cy + Math.sin(sa - open) * len);
    ctx.lineTo(cx - Math.cos(sa - open) * len, cy - Math.sin(sa - open) * len);
    ctx.lineTo(cx - Math.cos(sa + open) * len, cy - Math.sin(sa + open) * len);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.9 * seen;
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(sa + open * 0.5) * len * 0.55, cy + Math.sin(sa + open * 0.5) * len * 0.55);
    ctx.lineTo(cx + Math.cos(sa - open * 0.5) * len * 0.55, cy + Math.sin(sa - open * 0.5) * len * 0.55);
    ctx.lineTo(cx - Math.cos(sa - open * 0.5) * len * 0.55, cy - Math.sin(sa - open * 0.5) * len * 0.55);
    ctx.lineTo(cx - Math.cos(sa + open * 0.5) * len * 0.55, cy - Math.sin(sa + open * 0.5) * len * 0.55);
    ctx.closePath();
    ctx.fill();
    // The two lips: each a thin QUAD with a lit top face over a
    // shadowed jamb — the seam has thickness now, like parted planking.
    const lipW = sc * 0.045;
    for (const e of [1, -1]) {
      const la = sa + open * e;
      const lx = Math.cos(la);
      const ly = Math.sin(la);
      // The jamb: the dark inner wall the hinge shows.
      ctx.globalAlpha = (1 - t * 0.5) * 0.85;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.beginPath();
      ctx.moveTo(cx + lx * len, cy + ly * len);
      ctx.lineTo(cx + lx * len + e * -ly * lipW, cy + ly * len + e * lx * lipW);
      ctx.lineTo(cx - lx * len + e * -ly * lipW, cy - ly * len + e * lx * lipW);
      ctx.lineTo(cx - lx * len, cy - ly * len);
      ctx.closePath();
      ctx.fill();
      // The lit face: white where the light lands on the parted edge.
      ctx.globalAlpha = 1 - t * 0.5;
      ctx.strokeStyle = c.st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(cx + lx * len, cy + ly * len);
      ctx.lineTo(cx - lx * len, cy - ly * len);
      ctx.stroke();
    }
    // Welling beads: three drops gather along the open line.
    if (t > 0.3) {
      ctx.fillStyle = st.spark;
      for (let k = 0; k < 3; k++) {
        const bt = Math.min(1, (t - 0.3 - k * 0.09) / 0.18);
        if (bt <= 0) continue;
        const f = -0.5 + k * 0.5;
        ctx.globalAlpha = 0.9 * bt * (1 - t * 0.4);
        ctx.beginPath();
        ctx.ellipse(cx + ca * len * f, cy + sn * len * f + sc * 0.02 * bt, sc * 0.026 * bt, sc * 0.034 * bt, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Bracket ticks with serifs: the seam is now OFFICIAL.
    const bt2 = sc * 0.1;
    ctx.globalAlpha = 1 - t * 0.4;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    for (const e of [1, -1]) {
      const ex = cx + ca * len * 1.2 * e;
      const ey = cy + sn * len * 1.2 * e;
      ctx.moveTo(ex - ca * bt2 * 0.4 * e - sn * bt2, ey - sn * bt2 * 0.4 * e + ca * bt2);
      ctx.lineTo(ex - sn * bt2, ey + ca * bt2);
      ctx.lineTo(ex + sn * bt2, ey - ca * bt2);
      ctx.lineTo(ex - ca * bt2 * 0.4 * e + sn * bt2, ey - sn * bt2 * 0.4 * e - ca * bt2);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// ----------------------------------------------------- thousand_cuts

/**
 * THOUSAND_CUTS — "the tally storm."
 * Every beat of the flurry throws a TALLY GROUP across the arc: four
 * razor lenses slanting one way and a fifth, longer and brighter,
 * crossing them through — a count being kept faster than counting.
 * Each cut is a filled sliver of steel with a white heart, each
 * appearing a breath after the last; where the fifth crosses its
 * fellows the steel sparks. The ground collects short nicks with lit
 * lips. A storm made entirely of precision.
 */
const thousand_cuts: AbilitySig = {
  spawn(c) {
    // Each beat spits a few slivers along the aim.
    c.particles.burst(c.wx + Math.cos(c.dir) * 0.8, c.wy + Math.sin(c.dir) * 0.8 - 0.35, 3, [c.st.core, c.st.spark], {
      speed: 2.8, life: 0.22, size: 0.055, gravity: 2, dir: c.dir, spread: 1.0, shape: 'streak',
    });
  },
  ground(c) {
    // The count kept on the floor: short nicks in the arc, each a
    // dark cut with a pale lip.
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const rand = srand(c.seed ^ 0x6d);
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const a = dir + (rand() - 0.5) * 1.4;
      const d = sc * (0.6 + rand() * 1.0);
      const na = a + (rand() - 0.5) * 2;
      const nx = px + Math.cos(a) * d;
      const ny = py + Math.sin(a) * d * squash;
      const nl = sc * 0.1;
      ctx.globalAlpha = 0.45 * (1 - t);
      ctx.strokeStyle = shade(st.deep, -8);
      ctx.lineWidth = Math.max(1.5, sc * 0.028);
      ctx.beginPath();
      ctx.moveTo(nx - Math.cos(na) * nl, ny - Math.sin(na) * nl * squash);
      ctx.lineTo(nx + Math.cos(na) * nl, ny + Math.sin(na) * nl * squash);
      ctx.stroke();
      ctx.globalAlpha = 0.3 * (1 - t);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.014);
      ctx.beginPath();
      ctx.moveTo(nx - Math.cos(na) * nl * 0.85, ny - Math.sin(na) * nl * 0.85 * squash - sc * 0.015);
      ctx.lineTo(nx + Math.cos(na) * nl * 0.85, ny + Math.sin(na) * nl * 0.85 * squash - sc * 0.015);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const rand = srand(c.seed ^ 0x6e);
    // The group's slant: four bars lean together; the fifth crosses.
    const groupA = dir + (rand() - 0.5) * 0.5 + 0.85;
    const crossA = groupA - 1.5;
    ctx.save();
    ctx.lineCap = 'butt';
    for (let k = 0; k < 5; k++) {
      const isCross = k === 4;
      const off = (rand() - 0.5) * 1.1;
      const d = 0.6 + rand() * 0.85;
      const jig = (rand() - 0.5) * 0.16;
      const born = k * 0.09;
      const a1 = Math.min(1, Math.max(0, (t - born) / 0.06)) * Math.max(0, 1 - (t - born) / 0.55);
      if (a1 <= 0) continue;
      const ca = (isCross ? crossA : groupA) + jig;
      const x = isCross
        ? px + Math.cos(dir) * 1.0 * sc
        : px + Math.cos(dir + off * 0.5) * d * sc + (k - 1.5) * Math.cos(crossA) * sc * 0.14;
      const y = isCross
        ? py + Math.sin(dir) * 1.0 * sc * squash - sc * 0.42
        : py + Math.sin(dir + off * 0.5) * d * sc * squash - sc * (0.28 + rand() * 0.3);
      const len = sc * (isCross ? 0.5 : 0.3 + rand() * 0.14);
      const w = len * (isCross ? 0.1 : 0.13);
      const dxc = Math.cos(ca);
      const dyc = Math.sin(ca);
      // The razor lens: a filled sliver of steel, widest at its waist.
      ctx.globalAlpha = 0.85 * a1;
      ctx.fillStyle = isCross ? shade(st.mid, 10) : st.mid;
      ctx.beginPath();
      ctx.moveTo(x - dxc * len, y - dyc * len);
      ctx.lineTo(x - dyc * w, y + dxc * w);
      ctx.lineTo(x + dxc * len, y + dyc * len);
      ctx.lineTo(x + dyc * w, y - dxc * w);
      ctx.closePath();
      ctx.fill();
      // The white heart — shorter, brighter, on top.
      ctx.globalAlpha = a1;
      ctx.fillStyle = c.st.core;
      ctx.beginPath();
      ctx.moveTo(x - dxc * len * 0.6, y - dyc * len * 0.6);
      ctx.lineTo(x - dyc * w * 0.4, y + dxc * w * 0.4);
      ctx.lineTo(x + dxc * len * 0.6, y + dyc * len * 0.6);
      ctx.lineTo(x + dyc * w * 0.4, y - dxc * w * 0.4);
      ctx.closePath();
      ctx.fill();
      // Where the fifth crosses the four: the steel sparks.
      if (isCross) {
        ctx.fillStyle = st.spark;
        for (const f of [-0.45, 0.35]) {
          ctx.globalAlpha = a1 * 0.95;
          ctx.beginPath();
          burstStarPath(ctx, x + dxc * len * f, y + dyc * len * f, sc * 0.07, sc * 0.028, 4, ca + f);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ whisper_fang

/**
 * WHISPER_FANG — "the hush line."
 * The quietest signature on the roster, spoken up just enough: one
 * line of dark hangs where the fang flew — a pale thread riding a
 * deep bed — dissolving tail-first toward the throat that was named.
 * At the point a curved two-faced fang finishes like a word ending,
 * one thin hush-ripple rings out, and three breath-slivers drift up
 * on staggered clocks: the silence after speaking, drawn.
 */
const whisper_fang: AbilitySig = {
  spawn(c) {
    // Barely anything: three void glints and one dark sliver.
    c.particles.burst(c.wx, c.wy - 0.4, 3, [c.st.spark, c.st.mid], {
      speed: 0.4, life: 0.6, size: 0.08, gravity: 0.2, drag: 2, shape: 'glint',
    });
  },
  ground(c) {
    // One small dark bead where the word landed, and the thinnest
    // trickle leaving it. Nothing more.
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - t);
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.08, sc * 0.08 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const reach = Math.min(1, t / 0.6);
    ctx.globalAlpha = 0.4 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.018);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + sc * 0.1 * reach, py + sc * 0.16 * reach * squash);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const rand = srand(c.seed ^ 0x71);
    // The point is the far end for traveling kinds, the heart else;
    // the approach angle comes from the flight when we have it.
    const traveled = px2 !== px || py2 !== py;
    const tx = traveled ? px2 : px;
    const ty = (traveled ? py2 : py) - sc * 0.38;
    const ba = traveled ? Math.atan2(py2 - py, px2 - px) : rand() * Math.PI * 2;
    const ca = Math.cos(ba);
    const sn = Math.sin(ba);
    ctx.save();
    ctx.lineCap = 'butt';
    // The hush line: a pale thread on a deep bed, dissolving from the
    // tail toward the point — the said thing, unsaying itself.
    const LT = sc * 1.9;
    const rem = LT * (1 - t);
    if (rem > 1) {
      ctx.globalAlpha = 0.7 * (1 - t * 0.5);
      ctx.strokeStyle = shade(st.deep, -10);
      ctx.lineWidth = Math.max(2, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(tx - ca * rem, ty - sn * rem);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.globalAlpha = 0.8 * (1 - t * 0.4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.moveTo(tx - ca * rem, ty - sn * rem);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // The last hand-span before the point stays bright longest.
      ctx.globalAlpha = 0.9 * (1 - t);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.016);
      ctx.beginPath();
      ctx.moveTo(tx - ca * Math.min(rem, sc * 0.3), ty - sn * Math.min(rem, sc * 0.3));
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    // The hush-ripple: one thin ring says the word landed — early,
    // quiet, and only once.
    if (t < 0.3) {
      const rt = t / 0.3;
      ctx.globalAlpha = 0.5 * (1 - rt);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.016);
      ctx.beginPath();
      ctx.ellipse(tx, ty, sc * 0.3 * rt, sc * 0.3 * rt * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The fang, finishing like a spoken word: two curved faces, dark
    // cheek and violet cheek, a hairline gleam at the point.
    if (t < 0.45) {
      const ft = 1 - t / 0.45;
      const fl = sc * 0.18;
      ctx.globalAlpha = ft;
      ctx.fillStyle = shade(st.deep, -8);
      ctx.beginPath();
      ctx.moveTo(tx + ca * fl * 0.6, ty + sn * fl * 0.6);
      ctx.quadraticCurveTo(
        tx - ca * fl * 0.3 - sn * fl * 0.45, ty - sn * fl * 0.3 + ca * fl * 0.45,
        tx - ca * fl - sn * fl * 0.3, ty - sn * fl + ca * fl * 0.3,
      );
      ctx.lineTo(tx - ca * fl * 0.5, ty - sn * fl * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(tx + ca * fl * 0.6, ty + sn * fl * 0.6);
      ctx.lineTo(tx - ca * fl * 0.5, ty - sn * fl * 0.5);
      ctx.lineTo(tx - ca * fl + sn * fl * 0.3, ty - sn * fl - ca * fl * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.014);
      ctx.beginPath();
      ctx.moveTo(tx + ca * fl * 0.52, ty + sn * fl * 0.52);
      ctx.lineTo(tx - ca * fl * 0.2, ty - sn * fl * 0.2);
      ctx.stroke();
    }
    // The hush: three breath-slivers rising, one after another, each
    // a pale dash on a deep bed — quotation marks for a silence.
    for (let j = 0; j < 3; j++) {
      const a2 = Math.min(1, Math.max(0, (t - 0.12 - j * 0.13) / 0.08)) * Math.max(0, 1 - (t - 0.12 - j * 0.13) / 0.5);
      if (a2 <= 0) continue;
      const bx = tx + (j - 1) * sc * 0.14 - sc * 0.06;
      const by = ty - sc * 0.34 - t * sc * 0.35 - j * sc * 0.07;
      ctx.globalAlpha = 0.5 * a2;
      ctx.fillStyle = shade(st.deep, -6);
      ctx.fillRect(bx - sc * 0.01, by - sc * 0.008, sc * 0.14, Math.max(2, sc * 0.036));
      ctx.globalAlpha = 0.75 * a2;
      ctx.fillStyle = st.spark;
      ctx.fillRect(bx, by, sc * 0.12, Math.max(1.5, sc * 0.022));
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- shadowstep

/**
 * SHADOWSTEP — "the dark doorway."
 * Two mouths of dark open in the floor, and they are HOLES: a void
 * heart inside a shadowed shaft wall, the far inner lip catching what
 * light the room has — depth, drawn. The rogue MELTS down through the
 * near one, a filled body sinking past the ground line, while the
 * knife hangs already-arrived over the second, turning slowly on its
 * promise. Then the body rises out of the far mouth to claim it, dark
 * sheeting off its shoulders, and both doors seal with a white blink.
 */
const shadowstep: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The near mouth: the dark reaches up out of the floor and takes
    // the body — library tendrils crawling in, not flecks falling.
    shadow.deployments.tendrils!(m, c.wx, c.wy, { scale: 0.55 });
    // THE TORN VEIL: a TRUE vanish now — the body is gone before the
    // smoke settles. The departure exhales a real billow where the
    // rogue stopped being (the poof that sells the leaving), and a
    // thinner veil curls off the arrival as the dark lets go.
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.8 });
    smoke.deployments.veil!(m, c.wx2, c.wy2, { scale: 0.55 });
    // The far door: a standing slit of dark where the body arrives.
    shadow.deployments.door!(m, c.wx2, c.wy2, { scale: 0.7 });
    // Over the far door, the blade announces itself with one glint.
    c.particles.burst(c.wx2, c.wy2 - 0.55, 2, [c.st.spark, '#e8e0ff'], {
      speed: 0.2, life: 0.5, size: 0.09, gravity: 0.2, shape: 'glint',
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    ctx.save();
    // A door is drawn the same both ends: void heart, shaft wall,
    // far lip lit — the hole has an inside.
    const door = (dx: number, dy: number, r: number, sealT: number): void => {
      if (r <= 1) return;
      // The shaft wall: a dark ring under everything.
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(dx, dy, r * 1.12, r * 1.12 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The void heart: darker than the school's own dark.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#0d0a16';
      ctx.beginPath();
      ctx.ellipse(dx, dy, r * 0.82, r * 0.82 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The far inner lip: the wall of the hole catches the light —
      // an arc only on the far side, where an inside would show.
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.ellipse(dx, dy - r * 0.14 * squash, r * 0.72, r * 0.6 * squash, 0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      // The seal blink: as a door closes, its rim flashes white once.
      if (sealT > 0) {
        ctx.globalAlpha = sealT * 0.9;
        ctx.strokeStyle = c.st.core;
        ctx.lineWidth = Math.max(1, sc * 0.02);
        ctx.beginPath();
        ctx.ellipse(dx, dy, r * 1.06, r * 1.06 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    // The near mouth, sealing as the body sinks through it.
    const r1 = sc * 0.42 * Math.max(0, 1 - t * 1.4);
    door(px, py, r1, t > 0.55 && t < 0.68 ? 1 - (t - 0.55) / 0.13 : 0);
    // The far mouth: opens fast, holds for the arrival, then seals.
    const open2 = t < 0.25 ? t / 0.25 : t < 0.75 ? 1 : (1 - t) / 0.25;
    door(px2, py2, sc * 0.44 * open2, t > 0.86 ? 1 - (t - 0.86) / 0.14 : 0);
    // The passage the dark keeps between its doors: one low thread,
    // with a pulse of payment traveling it near to far.
    ctx.globalAlpha = 0.3 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.setLineDash([sc * 0.07, sc * 0.09]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (t > 0.1 && t < 0.45) {
      const f = (t - 0.1) / 0.35;
      ctx.globalAlpha = 0.8 * Math.sin(f * Math.PI);
      ctx.fillStyle = st.mid;
      const g = Math.max(2, sc * 0.04);
      ctx.fillRect(px + (px2 - px) * f - g / 2, py + (py2 - py) * f - g / 2, g, g);
    }
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.7, 0.2 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    // The body melts DOWN through the near door — a filled, rim-lit
    // mass clipped at the ground line so the sunken half is simply gone.
    if (t < 0.4) {
      const sink = t / 0.4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px - sc, py - sc * 1.2, sc * 2, sc * 1.2);
      ctx.clip();
      ctx.globalAlpha = 0.6 * (1 - sink * 0.4);
      ctx.fillStyle = shade(st.deep, -4);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      fillFigure(c, px, py + sink * sc * 0.9);
      ctx.restore();
    }
    // The knife hangs over the far door BEFORE the body arrives,
    // turning slowly on its promise, winking once a beat.
    if (t < 0.55) {
      const ka = Math.atan2(py2 - py, (px2 - px) || 0.01) + Math.sin(c.now / 700) * 0.2;
      const bob = Math.sin(c.now / 110) * sc * 0.02;
      ctx.globalAlpha = Math.min(1, t / 0.12) * (1 - t / 0.55);
      fillKnife(c, px2, py2 - sc * 0.55 + bob, ka, sc * 0.3, st.spark, shade(st.deep, -10));
      const tw = Math.sin(c.now / 240);
      if (tw > 0.8) {
        ctx.fillStyle = c.st.core;
        const g = Math.max(1.5, sc * 0.026) * (tw - 0.8) / 0.2;
        ctx.fillRect(px2 + Math.cos(ka) * sc * 0.17 - g / 2, py2 - sc * 0.55 + bob + Math.sin(ka) * sc * 0.17 - g * 1.5, g, g * 3);
      }
    }
    // The body rises out of the far mouth to claim its knife — the
    // same filled mass, rim toward the room it just entered.
    if (t > 0.3) {
      const rise = Math.min(1, (t - 0.3) / 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px2 - sc, py2 - sc * 1.2, sc * 2, sc * 1.2);
      ctx.clip();
      ctx.globalAlpha = 0.7 * rise * (t < 0.85 ? 1 : (1 - t) / 0.15);
      ctx.fillStyle = shade(st.deep, -4);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      fillFigure(c, px2, py2 + (1 - rise) * sc * 0.9);
      ctx.restore();
      // The dark drips off the returning body — falling on real
      // altitude now, dying where it touches the dirt.
      if (Math.random() < c.frameDt * 7 * rise) {
        c.particles.burst(c.wx2, c.wy2, 1, [st.deep, st.mid], {
          speed: 0.25, life: 0.6, size: 0.07, gravity: 0, drag: 1,
          wobble: 0.3, z: 0.55, vz: -0.2, zg: 5, land: 'die', layer: 'world',
        });
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- registry

/**
 * The sneak roster's crowns. The lead wires this table into the
 * signature dispatch — nothing here self-registers.
 */
export const SNEAK_SIGS: Record<string, AbilitySig> = {
  envenom,
  night_fangs,
  ghost_step,
  caltrops,
  fan_of_knives,
  feint_double,
  exposing_strike,
  thousand_cuts,
  whisper_fang,
  shadowstep,
};
