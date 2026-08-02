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
 * Same laws as the founding registry: hard edges only, save/restore
 * discipline, srand-seeded geometry, frameDt-gated emission, ≤ ~60
 * path ops a hook, and no two centerpieces alike.
 */

import { shade } from './rig.js';
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { venom, smoke, shadow, asMatter } from './matter/index.js';

// ------------------------------------------------------ shared glyphs

/**
 * The rogue's shorthand for a body: head ring over a tapered coat.
 * Callers set stroke style, width, dash, and alpha — the figure only
 * lays the path and strokes it. Two path ops, always.
 */
function strokeFigure(c: SigCtx, x: number, footY: number): void {
  const { ctx, sc } = c;
  ctx.beginPath();
  ctx.arc(x, footY - sc * 0.72, sc * 0.11, 0, Math.PI * 2);
  ctx.stroke();
  const shW = sc * 0.17;
  const hemW = sc * 0.1;
  const shY = footY - sc * 0.56;
  ctx.beginPath();
  ctx.moveTo(x - shW, shY);
  ctx.lineTo(x + shW, shY);
  ctx.lineTo(x + hemW, footY);
  ctx.lineTo(x - hemW, footY);
  ctx.closePath();
  ctx.stroke();
}

/** A slim thrown blade: pointed slab plus a dark hilt block. */
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
  const w = len * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(len * 0.62, 0);
  ctx.lineTo(len * 0.08, -w);
  ctx.lineTo(-len * 0.16, -w * 0.55);
  ctx.lineTo(-len * 0.16, w * 0.55);
  ctx.lineTo(len * 0.08, w);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hilt;
  ctx.fillRect(-len * 0.4, -w * 0.5, len * 0.24, w);
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
      { f: 1.0, s0: 0.16, r: 0.05 },
      { f: 0.58 + rand() * 0.08, s0: 0.32, r: 0.034 },
      { f: 0.78 + rand() * 0.08, s0: 0.48, r: 0.038 },
    ],
  };
}

/**
 * ENVENOM — "the venom bead."
 * A whetstone pass of poison travels the drawn blade hilt to tip;
 * where the oil gathers, beads swell on the edge, hang a heartbeat,
 * then drop — and the ground under the rogue remembers each one as
 * a dark green stain. The buff IS the oiled edge; the FX oils it.
 */
const envenom: AbilitySig = {
  spawn(c) {
    // The blade takes the oil: a shiver of green glints at edge height.
    c.particles.burst(c.wx, c.wy - 0.55, 5, [c.st.spark, c.st.mid], {
      speed: 0.4, life: 0.6, size: 0.09, gravity: 0.3, drag: 2.2, shape: 'glint',
    });
  },
  ground(c) {
    // What the ground remembers: a splat where each bead came down.
    const { ctx, st, t, sc, squash } = c;
    const lay = venomLayout(c);
    ctx.save();
    for (const b of lay.beads) {
      const landT = b.s0 + 0.45;
      if (t < landT) continue;
      const u = Math.min(1, (t - landT) / 0.15);
      const bx = lay.bx + Math.cos(lay.ang) * sc * 0.52 * b.f;
      const r = sc * b.r * 2.2 * u;
      ctx.globalAlpha = 0.5 * (1 - t) * u;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(bx, c.py, r, r * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The stain creeps: a thin ring pushing out past the splat.
      ctx.globalAlpha = 0.35 * (1 - t) * u;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath();
      ctx.ellipse(bx, c.py, r * 1.7, r * 1.7 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc } = c;
    const lay = venomLayout(c);
    const dx = Math.cos(lay.ang);
    const dy = Math.sin(lay.ang);
    const L = sc * 0.52;
    ctx.save();
    ctx.lineCap = 'butt';
    // The edge itself: a dark line held at guard.
    ctx.globalAlpha = 0.5 * (1 - t * 0.6);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.moveTo(lay.bx, lay.by);
    ctx.lineTo(lay.bx + dx * L, lay.by + dy * L);
    ctx.stroke();
    // The whetstone pass: bright oil traveling hilt to tip.
    const reach = Math.min(1, t / 0.32);
    ctx.globalAlpha = 0.85 * (1 - t * 0.5);
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.beginPath();
    ctx.moveTo(lay.bx, lay.by);
    ctx.lineTo(lay.bx + dx * L * reach, lay.by + dy * L * reach);
    ctx.stroke();
    // The beads: swell on the edge, hang — and then the MATTER
    // LIBRARY owns the fall. On the exact crossing frame each bead
    // releases one true drop with real weight; it falls, splats, and
    // flecks the ground through the engine, not through easing math.
    const lifeMs = t > 0 ? c.age / t : 0;
    const tPrev = lifeMs > 0 ? Math.max(0, (c.age - c.frameDt * 1000) / lifeMs) : 0;
    for (const b of lay.beads) {
      if (t < b.s0) continue;
      const releaseT = b.s0 + 0.25;
      const ex = lay.bx + dx * L * b.f;
      const ey = lay.by + dy * L * b.f;
      if (t >= releaseT) {
        if (tPrev < releaseT) {
          // The blade lifts ~0.5 tiles; the edge climbs along ang.
          venom.deployments.bead!(asMatter(c), c.wx + 0.15 + Math.cos(lay.ang) * 0.52 * b.f, c.wy, {
            z: 0.5 - Math.sin(lay.ang) * 0.52 * b.f, scale: 0.9,
          });
        }
        continue;
      }
      const swell = Math.min(1, (t - b.s0) / 0.25);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(ex, ey, sc * b.r * swell * 0.8, sc * b.r * swell, 0, 0, Math.PI * 2);
      ctx.fill();
      // The catchlight that makes it a DROP and not a dot.
      ctx.fillStyle = st.core;
      ctx.fillRect(ex - 1, ey - sc * b.r * swell * 0.4, Math.max(1, sc * 0.014), Math.max(1, sc * 0.014));
    }
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.18 * (1 - t));
  },
};

// ------------------------------------------------------- night_fangs

/**
 * NIGHT_FANGS — "the buried fang."
 * Each impact leaves a fang of dark PLANTED in the wound — a wedge
 * quivering with the force of arrival, a white point of light at its
 * tip, thin dark trickles crawling groundward beneath it. The homing
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
    // Trickles: two thin dark runs crawling from under the wound.
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0x55);
    ctx.save();
    for (let k = 0; k < 2; k++) {
      const a = Math.PI * 0.5 + (rand() - 0.5) * 1.6;
      const reach = Math.min(1, t / (0.5 + rand() * 0.3));
      const len = sc * (0.22 + rand() * 0.16) * reach;
      const bend = (rand() - 0.5) * 0.8;
      ctx.globalAlpha = 0.55 * (1 - t);
      ctx.strokeStyle = k === 0 ? st.deep : '#3a1a22';
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a + bend) * len, py + Math.sin(a + bend) * len * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    if (c.kind === 'bolt') return; // flight is the grammar's; we own the landing
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x56);
    const hy = py - sc * 0.35; // the wound sits at chest height
    const lean = -Math.PI * 0.5 + (rand() - 0.5) * 1.2;
    // Quiver: the fang still shakes with the force of arrival.
    const quiver = Math.sin(c.now / 36) * 0.09 * Math.max(0, 1 - t * 1.6);
    const a = lean + quiver;
    const len = sc * 0.34;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    ctx.fillStyle = st.deep;
    // The fang: tip buried at the wound, back leaning out and up.
    ctx.beginPath();
    ctx.moveTo(px, hy);
    ctx.lineTo(px + Math.cos(a) * len - Math.sin(a) * len * 0.16, hy + Math.sin(a) * len + Math.cos(a) * len * 0.16);
    ctx.lineTo(px + Math.cos(a) * len + Math.sin(a) * len * 0.16, hy + Math.sin(a) * len - Math.cos(a) * len * 0.16);
    ctx.closePath();
    ctx.fill();
    // A darker spine down its center — a fang, not a splinter.
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    ctx.moveTo(px, hy);
    ctx.lineTo(px + Math.cos(a) * len * 0.8, hy + Math.sin(a) * len * 0.8);
    ctx.stroke();
    // The white point at the butt: the only light night allows.
    const tw = 0.5 + 0.5 * Math.sin(c.now / 120 + (c.seed % 7));
    ctx.globalAlpha = (1 - t) * tw;
    ctx.fillStyle = st.core;
    const g = Math.max(1.5, sc * 0.03);
    ctx.fillRect(px + Math.cos(a) * len - g / 2, hy + Math.sin(a) * len - g / 2, g, g);
    ctx.restore();
  },
};

// -------------------------------------------------------- ghost_step

/**
 * GHOST_STEP — "the rumor file."
 * The dash leaves a file of body outlines standing along the path —
 * the rumor of a rogue, told three times, each teller dissolving into
 * flecks in the order they were passed. At the arrival, the cut lands
 * BEFORE the body does: one white slash, then the flesh catches up.
 */
const ghost_step: AbilitySig = {
  spawn(c) {
    // The cut that arrived first: steel slivers off the arrival point.
    c.particles.burst(c.wx2, c.wy2 - 0.4, 3, [c.st.spark, '#d8d4e8'], {
      speed: 2.6, life: 0.25, size: 0.06, gravity: 2, dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx || 0.01), spread: 0.5, shape: 'streak',
    });
  },
  ground(c) {
    // Footprints the rumor left: pairs fading oldest-first.
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const dxs = px2 - px;
    const dys = py2 - py;
    const L = Math.hypot(dxs, dys);
    if (L < 1) return;
    const nx = -dys / L;
    const ny = dxs / L;
    ctx.save();
    ctx.fillStyle = st.deep;
    for (let k = 0; k < 4; k++) {
      const f = 0.15 + k * 0.22;
      const side = k % 2 === 0 ? 1 : -1;
      const alpha = Math.max(0, 1 - t * 1.3 - (3 - k) * 0.12);
      if (alpha <= 0) continue;
      ctx.globalAlpha = 0.4 * alpha;
      ctx.beginPath();
      ctx.ellipse(
        px + dxs * f + nx * sc * 0.09 * side,
        py + dys * f + ny * sc * 0.09 * side,
        sc * 0.055, sc * 0.055 * squash, 0, 0, Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // The file: three tellers stationed along the path, dissolving in
    // the order the rumor passed through them.
    ctx.setLineDash([sc * 0.07, sc * 0.05]);
    for (let k = 0; k < 3; k++) {
      const f = 0.28 + k * 0.26;
      const alpha = Math.max(0, Math.min(1, 1.15 - (t * 2.2 - k * 0.28)));
      if (alpha <= 0) continue;
      const gx = px + (px2 - px) * f;
      const gy = py + (py2 - py) * f;
      ctx.globalAlpha = 0.55 * alpha;
      ctx.strokeStyle = k === 1 ? st.spark : st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      strokeFigure(c, gx, gy);
      // Each teller sheds flecks as it forgets itself.
      if (Math.random() < c.frameDt * 5 * alpha) {
        c.particles.burst(c.wx + (c.wx2 - c.wx) * f, c.wy + (c.wy2 - c.wy) * f - 0.5, 1, [st.mid, st.deep], {
          speed: 0.35, life: 0.45, size: 0.07, gravity: -0.8, drag: 1.5, wobble: 0.4,
        });
      }
    }
    ctx.setLineDash([]);
    // The cut that outran its cutter: one white slash at the arrival.
    if (t < 0.28) {
      const ft = 1 - t / 0.28;
      const sa = Math.atan2(py2 - py, (px2 - px) || 0.01) + 0.55;
      const len = sc * 0.5 * (0.5 + 0.5 * (1 - ft));
      ctx.globalAlpha = ft;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(px2 - Math.cos(sa) * len, py2 - sc * 0.45 - Math.sin(sa) * len);
      ctx.lineTo(px2 + Math.cos(sa) * len, py2 - sc * 0.45 + Math.sin(sa) * len);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- caltrops

/**
 * CALTROPS — "the iron sowing."
 * The field is nine forged teeth scattered where they fell: crossed
 * base spurs, one spike pricking up, each catching light on its own
 * clock — a slow menace of glints saying the floor now has a price.
 * They arrive as a real toss and fade only when the iron is spent.
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
    const out = t > 0.92 ? (1 - t) / 0.08 : 1; // spent iron fades last
    ctx.save();
    ctx.lineCap = 'butt';
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.85;
      const rot = rand() * Math.PI;
      const seen = Math.min(1, Math.max(0, (t - k * 0.006) / 0.01));
      if (seen <= 0) continue;
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      const s = sc * 0.085;
      ctx.globalAlpha = 0.7 * seen * out;
      // Two crossed base spurs lying flat.
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1, sc * 0.022);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(rot) * s, y - Math.sin(rot) * s * squash);
      ctx.lineTo(x + Math.cos(rot) * s, y + Math.sin(rot) * s * squash);
      ctx.moveTo(x - Math.cos(rot + 1.9) * s, y - Math.sin(rot + 1.9) * s * squash);
      ctx.lineTo(x + Math.cos(rot + 1.9) * s, y + Math.sin(rot + 1.9) * s * squash);
      ctx.stroke();
      // The spike that does the paying.
      ctx.strokeStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - sc * 0.12);
      ctx.stroke();
      // Each tooth winks on its own clock — menace, not sparkle.
      const tw = Math.sin(c.now / 340 + k * 2.7);
      if (tw > 0.72) {
        const g = Math.max(1.5, sc * 0.03) * (tw - 0.72) / 0.28;
        ctx.globalAlpha = 0.9 * seen * out;
        ctx.fillStyle = st.core;
        ctx.fillRect(x - g / 2, y - sc * 0.12 - g * 1.6, g, g * 3.2);
        ctx.fillRect(x - g * 1.6, y - sc * 0.12 - g / 2, g * 3.2, g);
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
 * Eight thrown blades RADIATE from the body — flying flat, sinking as
 * they go, planting in a ring at the rim with a glint apiece — while
 * the ground keeps eight thin score-lines where each one passed.
 * A halo of edges: it blooms outward once and never orbits.
 */
const fan_of_knives: AbilitySig = {
  spawn(c) {
    // The release: one ring of steel slivers snapping outward low.
    c.particles.burst(c.wx, c.wy - 0.35, 8, [c.st.core, c.st.spark], {
      speed: 3.4, life: 0.3, size: 0.06, gravity: 1, shape: 'streak',
    });
  },
  ground(c) {
    // Score-lines: the floor remembers every blade's flight line.
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x61);
    const off = rand() * 0.8;
    const u = Math.min(1, t / 0.45);
    const reach = 1 - (1 - u) * (1 - u);
    ctx.save();
    ctx.globalAlpha = 0.3 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + off;
      ctx.moveTo(px + Math.cos(a) * rPx * 0.28, py + Math.sin(a) * rPx * 0.28 * squash);
      ctx.lineTo(px + Math.cos(a) * rPx * 0.95 * reach, py + Math.sin(a) * rPx * 0.95 * reach * squash);
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
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + off;
      const R = rPx * 0.95 * reach;
      const lift = sc * (0.45 - 0.33 * reach); // flies flat, sinks to plant
      const x = px + Math.cos(a) * R;
      const y = py + Math.sin(a) * R * squash - lift;
      const sa = Math.atan2(Math.sin(a) * squash, Math.cos(a));
      ctx.globalAlpha = 0.9 * fade;
      fillKnife(c, x, y, sa, sc * 0.3, k % 2 === 0 ? st.mid : shade(st.mid, 12), st.deep);
      // Planted: each blade earns one glint as it stops.
      if (u >= 1 && t < 0.62) {
        const g = Math.max(1.5, sc * 0.028);
        ctx.globalAlpha = fade * (1 - (t - 0.45) / 0.17);
        ctx.fillStyle = st.core;
        ctx.fillRect(x + Math.cos(sa) * sc * 0.18 - g / 2, y + Math.sin(sa) * sc * 0.18 - g * 1.5, g, g * 3);
      }
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ feint_double

/**
 * FEINT_DOUBLE — "the standing lie."
 * The decoy snaps TRUE while the truth walks out of it: a solid gray
 * figure settles onto a dashed stage-seam turning underfoot, and a
 * second, dashed figure — the rogue that was — slides aside and
 * dissolves into flecks. The lie flickers, once in a while, if you
 * know to look.
 */
const feint_double: AbilitySig = {
  spawn(c) {
    // The swap: one soft gray exhale — the library's smoke at a
    // whisper. No light, no noise, half a breath.
    smoke.deployments.billow!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
  },
  ground(c) {
    // The stage-seam: a dashed ring turning slowly under the lie.
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    ctx.globalAlpha = 0.5 * Math.min(1, t * 3) * (1 - t * 0.5);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.setLineDash([sc * 0.09, sc * 0.07]);
    ctx.lineDashOffset = c.now / 40;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.42, sc * 0.42 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0x65);
    const la = rand() * Math.PI * 2; // which way the truth leaves
    ctx.save();
    ctx.lineCap = 'butt';
    // The lie, settling solid — with one seeded flicker of wrongness.
    const settle = Math.min(1, t / 0.35);
    const flick = Math.sin(c.now / 90 + c.seed) > 0.94 ? 0.4 : 1;
    ctx.globalAlpha = 0.65 * settle * flick;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    strokeFigure(c, px, py);
    // The truth, leaving: dashed, sliding aside, forgetting its shape.
    const gone = Math.min(1, t / 0.8);
    const alpha = 0.5 * (1 - gone);
    if (alpha > 0.02) {
      const lx = px + Math.cos(la) * sc * 0.9 * gone;
      const ly = py + Math.sin(la) * sc * 0.35 * gone * c.squash;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.028);
      ctx.setLineDash([sc * 0.05, sc * 0.06]);
      strokeFigure(c, lx, ly);
      ctx.setLineDash([]);
      // It sheds itself as it goes.
      if (Math.random() < c.frameDt * 8 * (1 - gone)) {
        c.particles.burst(c.wx + Math.cos(la) * 0.9 * gone, c.wy + Math.sin(la) * 0.35 * gone - 0.5, 1, [st.mid, st.deep], {
          speed: 0.3, life: 0.5, size: 0.07, gravity: -0.6, drag: 1.4, wobble: 0.4,
        });
      }
    }
    ctx.restore();
  },
};

// --------------------------------------------------- exposing_strike

/**
 * EXPOSING_STRIKE — "the opened seam."
 * The swing finds the flaw and makes it official: a white seam hangs
 * where the blade read the target, its two halves hinging apart to
 * show the raw red under it, bracket-marked at both ends like a
 * surveyor's verdict — while a chevron stamps the ground beneath.
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
    // The verdict stamp: a chevron under the seam, pointing at it.
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const gx = px + Math.cos(dir) * 1.35 * sc;
    const gy = py + Math.sin(dir) * 1.35 * sc * squash;
    const sa = Math.atan2(Math.sin(dir) * squash, Math.cos(dir));
    const s = sc * 0.2;
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(gx - Math.cos(sa - 0.6) * s, gy - Math.sin(sa - 0.6) * s);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx - Math.cos(sa + 0.6) * s, gy - Math.sin(sa + 0.6) * s);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx + Math.cos(dir) * 1.35, c.wy + Math.sin(dir) * 1.35, 0.7, 0.3 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const cx = px + Math.cos(dir) * 1.35 * sc;
    const cy = py + Math.sin(dir) * 1.35 * sc * squash - sc * 0.42;
    const sa = Math.atan2(Math.sin(dir) * squash, Math.cos(dir)) + Math.PI / 2;
    const open = 0.3 * Math.min(1, t / 0.5); // the halves hinge apart
    const len = sc * 0.4;
    ctx.save();
    ctx.lineCap = 'butt';
    // The raw red under the seam — visible only once it opens.
    ctx.globalAlpha = 0.8 * Math.min(1, t / 0.3) * (1 - t * 0.4);
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(sa + open) * len, cy + Math.sin(sa + open) * len);
    ctx.lineTo(cx + Math.cos(sa - open) * len, cy + Math.sin(sa - open) * len);
    ctx.lineTo(cx - Math.cos(sa - open) * len, cy - Math.sin(sa - open) * len);
    ctx.lineTo(cx - Math.cos(sa + open) * len, cy - Math.sin(sa + open) * len);
    ctx.closePath();
    ctx.fill();
    // The two white lips of the seam.
    ctx.globalAlpha = 1 - t * 0.5;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(sa + open) * len, cy + Math.sin(sa + open) * len);
    ctx.lineTo(cx - Math.cos(sa - open) * len, cy - Math.sin(sa - open) * len);
    ctx.moveTo(cx + Math.cos(sa - open) * len, cy + Math.sin(sa - open) * len);
    ctx.lineTo(cx - Math.cos(sa + open) * len, cy - Math.sin(sa + open) * len);
    ctx.stroke();
    // Bracket ticks: the seam is now OFFICIAL.
    const bt = sc * 0.09;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.025);
    ctx.beginPath();
    for (const e of [1, -1]) {
      const ex = cx + Math.cos(sa) * len * 1.18 * e;
      const ey = cy + Math.sin(sa) * len * 1.18 * e;
      ctx.moveTo(ex - Math.cos(sa + Math.PI / 2) * bt, ey - Math.sin(sa + Math.PI / 2) * bt);
      ctx.lineTo(ex + Math.cos(sa + Math.PI / 2) * bt, ey + Math.sin(sa + Math.PI / 2) * bt);
    }
    ctx.stroke();
    ctx.restore();
  },
};

// ----------------------------------------------------- thousand_cuts

/**
 * THOUSAND_CUTS — "the tally storm."
 * Every beat of the flurry throws a handful of razor tally-lines
 * across the arc — thin, crossing, each appearing a breath after the
 * last, like a count being kept faster than counting — while the
 * ground collects short nicks in the sector. A storm made entirely
 * of precision.
 */
const thousand_cuts: AbilitySig = {
  spawn(c) {
    // Each beat spits a few slivers along the aim.
    c.particles.burst(c.wx + Math.cos(c.dir) * 0.8, c.wy + Math.sin(c.dir) * 0.8 - 0.35, 3, [c.st.core, c.st.spark], {
      speed: 2.8, life: 0.22, size: 0.055, gravity: 2, dir: c.dir, spread: 1.0, shape: 'streak',
    });
  },
  ground(c) {
    // The count kept on the floor: short nicks scattered in the arc.
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const rand = srand(c.seed ^ 0x6d);
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.02);
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = dir + (rand() - 0.5) * 1.4;
      const d = sc * (0.6 + rand() * 1.0);
      const na = a + (rand() - 0.5) * 2;
      const nx = px + Math.cos(a) * d;
      const ny = py + Math.sin(a) * d * squash;
      const nl = sc * 0.09;
      ctx.moveTo(nx - Math.cos(na) * nl, ny - Math.sin(na) * nl * squash);
      ctx.lineTo(nx + Math.cos(na) * nl, ny + Math.sin(na) * nl * squash);
    }
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, dir } = c;
    const rand = srand(c.seed ^ 0x6e);
    ctx.save();
    ctx.lineCap = 'butt';
    // Five tally-lines per beat, staggered a breath apart, alternating
    // slant so the storm CROSSES itself — a count, not a spray.
    for (let k = 0; k < 5; k++) {
      const off = (rand() - 0.5) * 1.3;
      const d = 0.55 + rand() * 0.95;
      const ca = dir + (rand() - 0.5) * 0.7 + (k % 2 === 0 ? 0.85 : -0.85);
      const len = sc * (0.28 + rand() * 0.26);
      const h = sc * (0.22 + rand() * 0.38);
      const born = k * 0.09;
      const a1 = Math.min(1, Math.max(0, (t - born) / 0.06)) * Math.max(0, 1 - (t - born) / 0.55);
      if (a1 <= 0) continue;
      const x = px + Math.cos(dir + off) * d * sc;
      const y = py + Math.sin(dir + off) * d * sc * squash - h;
      ctx.globalAlpha = 0.75 * a1;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.032);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(ca) * len, y - Math.sin(ca) * len);
      ctx.lineTo(x + Math.cos(ca) * len, y + Math.sin(ca) * len);
      ctx.stroke();
      // The white heart of each cut — shorter, brighter, on top.
      ctx.globalAlpha = a1;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.018);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(ca) * len * 0.55, y - Math.sin(ca) * len * 0.55);
      ctx.lineTo(x + Math.cos(ca) * len * 0.55, y + Math.sin(ca) * len * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------ whisper_fang

/**
 * WHISPER_FANG — "the hush line."
 * The quietest signature on the roster: one thin line of dark hangs
 * where the fang flew, dissolving tail-first toward the throat that
 * was named; at the point, a small fang fades like a word finished —
 * and three short breath-slivers drift up, the hush after speaking.
 */
const whisper_fang: AbilitySig = {
  spawn(c) {
    // Barely anything: three void glints and one dark sliver.
    c.particles.burst(c.wx, c.wy - 0.4, 3, [c.st.spark, c.st.mid], {
      speed: 0.4, life: 0.6, size: 0.08, gravity: 0.2, drag: 2, shape: 'glint',
    });
  },
  ground(c) {
    // One small dark bead where the word landed. Nothing more.
    const { ctx, st, t, sc, squash, px, py } = c;
    ctx.save();
    ctx.globalAlpha = 0.45 * (1 - t);
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.08, sc * 0.08 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.save();
    ctx.lineCap = 'butt';
    // The hush line: it dissolves from the tail toward the point.
    const LT = sc * 1.9;
    const rem = LT * (1 - t);
    if (rem > 1) {
      ctx.globalAlpha = 0.55 * (1 - t * 0.5);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1, sc * 0.026);
      ctx.beginPath();
      ctx.moveTo(tx - Math.cos(ba) * rem, ty - Math.sin(ba) * rem);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // The last hand-span before the point stays bright longest.
      ctx.globalAlpha = 0.8 * (1 - t);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1, sc * 0.016);
      ctx.beginPath();
      ctx.moveTo(tx - Math.cos(ba) * Math.min(rem, sc * 0.3), ty - Math.sin(ba) * Math.min(rem, sc * 0.3));
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    // The fang, finishing like a spoken word.
    if (t < 0.45) {
      const ft = 1 - t / 0.45;
      const fl = sc * 0.16;
      ctx.globalAlpha = ft;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(ba) * fl * 0.6, ty + Math.sin(ba) * fl * 0.6);
      ctx.lineTo(tx - Math.cos(ba) * fl - Math.sin(ba) * fl * 0.3, ty - Math.sin(ba) * fl + Math.cos(ba) * fl * 0.3);
      ctx.lineTo(tx - Math.cos(ba) * fl + Math.sin(ba) * fl * 0.3, ty - Math.sin(ba) * fl - Math.cos(ba) * fl * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    // The hush: three breath-slivers rising, one after another.
    ctx.fillStyle = st.spark;
    for (let j = 0; j < 3; j++) {
      const a2 = Math.min(1, Math.max(0, (t - 0.12 - j * 0.13) / 0.08)) * Math.max(0, 1 - (t - 0.12 - j * 0.13) / 0.5);
      if (a2 <= 0) continue;
      ctx.globalAlpha = 0.6 * a2;
      ctx.fillRect(
        tx + (j - 1) * sc * 0.14 - sc * 0.06,
        ty - sc * 0.34 - t * sc * 0.35 - j * sc * 0.07,
        sc * 0.12, Math.max(1.5, sc * 0.022),
      );
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- shadowstep

/**
 * SHADOWSTEP — "the dark doorway."
 * Two mouths of dark open in the floor: the rogue MELTS down through
 * the first while the knife hangs already-arrived over the second —
 * then the body rises out of the far mouth to claim it, both doors
 * sealing shut behind. The knife arrives before you do, exactly as
 * promised.
 */
const shadowstep: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The near mouth: the dark reaches up out of the floor and takes
    // the body — library tendrils crawling in, not flecks falling.
    shadow.deployments.tendrils!(m, c.wx, c.wy, { scale: 0.55 });
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
    // The near mouth, sealing as the body sinks through it.
    const r1 = sc * 0.42 * Math.max(0, 1 - t * 1.4);
    if (r1 > 1) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(px, py, r1, r1 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.ellipse(px, py, r1 * 1.12, r1 * 1.12 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The far mouth: opens fast, holds for the arrival, then seals.
    const open2 = t < 0.25 ? t / 0.25 : t < 0.75 ? 1 : (1 - t) / 0.25;
    const r2 = sc * 0.44 * open2;
    if (r2 > 1) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(px2, py2, r2, r2 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.ellipse(px2, py2, r2 * 1.12, r2 * 1.12 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The passage the dark keeps between its doors: one low thread.
    ctx.globalAlpha = 0.3 * (1 - t);
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.022);
    ctx.setLineDash([sc * 0.07, sc * 0.09]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    c.glow(c.wx2, c.wy2, 0.7, 0.2 * (1 - t));
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // The body melts DOWN through the near door — clipped at the
    // ground line so the sunken half is simply gone.
    if (t < 0.4) {
      const sink = t / 0.4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px - sc, py - sc * 1.2, sc * 2, sc * 1.2);
      ctx.clip();
      ctx.globalAlpha = 0.6 * (1 - sink * 0.5);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      strokeFigure(c, px, py + sink * sc * 0.9);
      ctx.restore();
    }
    // The knife hangs over the far door BEFORE the body arrives.
    if (t < 0.55) {
      const ka = Math.atan2(py2 - py, (px2 - px) || 0.01);
      const bob = Math.sin(c.now / 110) * sc * 0.02;
      ctx.globalAlpha = Math.min(1, t / 0.12) * (1 - t / 0.55);
      fillKnife(c, px2, py2 - sc * 0.55 + bob, ka, sc * 0.26, st.spark, st.deep);
    }
    // The body rises out of the far mouth to claim its knife.
    if (t > 0.3) {
      const rise = Math.min(1, (t - 0.3) / 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px2 - sc, py2 - sc * 1.2, sc * 2, sc * 1.2);
      ctx.clip();
      ctx.globalAlpha = 0.65 * rise * (t < 0.85 ? 1 : (1 - t) / 0.15);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      strokeFigure(c, px2, py2 + (1 - rise) * sc * 0.9);
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
