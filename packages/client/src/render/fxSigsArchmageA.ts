/**
 * THE SIGNATURE LAW — the ARCHMAGE wave, first half.
 *
 * Eleven bespoke set-pieces for the archmage weapon-art roster. The
 * staff does not decorate a hit — it asks a WORLD to speak once: the
 * seabed remembers itself, pack ice claims a circle, a hearth roars
 * up through a floor that never held one, spring runs its whole
 * season in six seconds. Every signature layers a primary read (the
 * impact), a secondary read (its aftermath), and a lingering read
 * (what the world remembers), in the grammar's three strata.
 *
 * Same binding laws as every wave before it: hard edges only, save/
 * restore discipline, squash on ground y-radii, air pieces lift
 * ~0.4·sc, srand-deterministic geometry with frameDt-gated emission
 * as the only per-frame chance, ≤ ~60 path ops per hook per frame.
 * 120fps is a law. No signature shares a centerpiece with any other,
 * in this file or any wave shipped before it.
 */

import { shade } from './rig.js';
import { boltPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';

// ------------------------------------------------------------ helpers

/**
 * Stroke a polyline revealed to fraction f of its total length — the
 * pen mid-word. Shared plumbing, not a centerpiece: several arts here
 * tell their story by WHEN a line exists, not just where.
 */
function revealPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  f: number,
): void {
  if (pts.length < 2 || f <= 0) return;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  }
  let budget = total * Math.min(1, f);
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    if (seg <= budget) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
      budget -= seg;
    } else {
      const g = seg > 0 ? budget / seg : 0;
      ctx.lineTo(
        pts[i - 1]!.x + (pts[i]!.x - pts[i - 1]!.x) * g,
        pts[i - 1]!.y + (pts[i]!.y - pts[i - 1]!.y) * g,
      );
      break;
    }
  }
  ctx.stroke();
}

// -------------------------------------------------------- arcane_ring

/**
 * ARCANE_RING — "the rune-cut hoop."
 * The staff's heel stamps the ground and a machined band is CUT from
 * raw magic around it: inner and outer edge expanding together while
 * cog teeth bridge the band and turn — a lathe running at the speed
 * of a spell. Filings glint off the young rim; three rune squares
 * ride the finished hoop until the work dissolves.
 */
const arcane_ring: AbilitySig = {
  spawn(c: SigCtx) {
    // The heel strikes: a stamp of motes jumps straight off the point.
    c.particles.burst(c.wx, c.wy - 0.2, 6, [c.st.core, c.st.spark], {
      speed: 1.2, life: 0.5, size: 0.09, gravity: -1.2, up: true, drag: 1.4, shape: 'glint',
    });
    // Filings: the cut sheds glints along the young rim.
    const rand = srand(c.seed ^ 0xa1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.6;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.4,
        c.wy + Math.sin(a) * c.radius * 0.4 * c.squash,
        1, [c.st.mid, c.st.spark], {
          speed: 1.5, life: 0.4, size: 0.07, gravity: 0.4, dir: a, spread: 0.25, shape: 'glint',
        },
      );
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const reach = Math.min(1, t / 0.55);
    const rOut = rPx * (0.35 + 0.65 * reach);
    const rIn = rOut * 0.72;
    ctx.save();
    // The band: two machined edges expanding as one piece.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rOut, rOut * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1, sc * 0.03);
    ctx.beginPath();
    ctx.ellipse(px, py, rIn, rIn * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Cog teeth bridge the edges and turn with the cut.
    const a0 = c.now / 700 + (c.seed % 7) * 0.4;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.globalAlpha = 0.85 * fade;
    for (let k = 0; k < 8; k++) {
      const a = a0 + (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * rIn, py + Math.sin(a) * rIn * squash);
      ctx.lineTo(px + Math.cos(a) * rOut, py + Math.sin(a) * rOut * squash);
      ctx.stroke();
    }
    // The heel stamp: the struck point itself, cooling first.
    if (t < 0.35) {
      const ht = 1 - t / 0.35;
      ctx.globalAlpha = ht * 0.9;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, sc * 0.1 * ht, sc * 0.1 * ht * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.35 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const reach = Math.min(1, t / 0.55);
    const rr = rPx * (0.35 + 0.65 * reach) * 0.86;
    ctx.save();
    // Three rune squares ride the hoop at knee height, each turning
    // on its own corner as it circles.
    const a0 = -c.now / 900 + (c.seed % 5) * 0.5;
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k / 3) * Math.PI * 2;
      const bx = px + Math.cos(a) * rr;
      const by = py + Math.sin(a) * rr * squash - sc * 0.28;
      const g = sc * 0.07;
      ctx.globalAlpha = 0.9 * fade;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(c.now / 400 + k * 2.1);
      ctx.fillRect(-g / 2, -g / 2, g, g);
      ctx.restore();
    }
    ctx.restore();
  },
};

// --------------------------------------------------------- wisp_flare

/**
 * WISP_FLARE — "the hairpin turn."
 * Everything the wisps pass, they pass TWICE — so the impact is a
 * written U-turn: the approach leg draws itself in first, rounds a
 * pin of light, and the return leg draws back over it BRIGHTER, the
 * second pass outshining the first. Glints shake loose on both legs;
 * the pin winks where the wisp changed its mind.
 */
const wisp_flare: AbilitySig = {
  spawn(c: SigCtx) {
    const rand = srand(c.seed ^ 0xb1);
    const a = rand() * Math.PI * 2;
    // Both passes shed: one soft burst out, one brighter burst back.
    c.particles.burst(c.wx, c.wy - 0.35, 4, [c.st.mid, c.st.spark], {
      speed: 1.3, life: 0.35, size: 0.07, gravity: 0.6, dir: a, spread: 0.4, shape: 'glint',
    });
    c.particles.burst(c.wx, c.wy - 0.35, 5, [c.st.core, c.st.spark], {
      speed: 1.6, life: 0.45, size: 0.08, gravity: 0.4, dir: a + Math.PI, spread: 0.35, shape: 'glint',
    });
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    const rand = srand(c.seed ^ 0xb2);
    const lift = sc * 0.4;
    const a = rand() * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a) * 0.6; // the turn lies flat-ish to the camera
    const nx = -uy;
    const ny = ux;
    const len = sc * 0.85;
    const g = sc * 0.13;
    const bx = c.px;
    const by = c.py - lift;
    // The written U: approach leg, pin, return leg.
    const inLeg = [
      { x: bx - ux * len + nx * g, y: by - uy * len + ny * g },
      { x: bx + nx * g, y: by + ny * g },
      { x: bx + ux * g * 1.3, y: by + uy * g * 1.3 },
    ];
    const outLeg = [
      { x: bx + ux * g * 1.3, y: by + uy * g * 1.3 },
      { x: bx - nx * g, y: by - ny * g },
      { x: bx - ux * len - nx * g, y: by - uy * len - ny * g },
    ];
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // First pass: the approach draws itself in, modest.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    revealPoly(ctx, inLeg, t / 0.35);
    // Second pass: the return draws back over it, BRIGHTER.
    if (t > 0.3) {
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2, sc * 0.055);
      revealPoly(ctx, outLeg, (t - 0.3) / 0.35);
    }
    // The pin: a crossed wink where the wisp changed its mind.
    const tw = 0.5 + 0.5 * Math.sin(c.now / 90 + c.seed);
    const px2 = bx + ux * g * 1.3;
    const py2 = by + uy * g * 1.3;
    const s = sc * 0.055 * (0.7 + 0.5 * tw);
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px2 - s / 2, py2 - s * 2, s, s * 4);
    ctx.fillRect(px2 - s * 2, py2 - s / 2, s * 4, s);
    ctx.restore();
    c.glow(c.wx, c.wy, 0.8, 0.3 * fade);
  },
};

// ------------------------------------------------------- hearth_flare

/**
 * HEARTH_FLARE — "the chimney draft."
 * A hearth roars up where no hearth is: glowing grate-bars surface
 * underfoot like the floor always hid a firebox, one tall draft
 * column of true tongues stands over them, and sparks ride the
 * updraft the way they climb a flue — warmth for you, rather less
 * for them.
 */
const hearth_flare: AbilitySig = {
  spawn(c: SigCtx) {
    // The roar-up: tongues leap straight off the hidden grate.
    c.particles.burst(c.wx, c.wy - 0.25, 5, [c.st.mid, c.st.core], {
      speed: 1.4, life: 0.6, size: 0.13, gravity: -3.2, up: true,
      shape: 'lick', flicker: 0.3, fade: c.st.deep, wobble: 0.5,
    });
    // The warmth wave: a low shove of hot air rolling out.
    const rand = srand(c.seed ^ 0xc1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.35,
        c.wy + Math.sin(a) * c.radius * 0.35 * c.squash,
        1, [c.st.mid, c.st.spark], {
          speed: 1.6, life: 0.6, size: 0.1, gravity: -0.2, dir: a,
          spread: 0.3, drag: 1.6, grow: 0.18, shape: 'puff', fade: c.st.deep, ground: true,
        },
      );
    }
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xc2);
    const fade = 1 - t;
    const ang = rand() * Math.PI;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang) * squash;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang) * squash;
    ctx.save();
    ctx.lineCap = 'butt';
    // The grate: four ember bars surfacing through the turf, each on
    // its own cooling clock, breathing while they hold heat.
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * rPx * 0.3;
      const half = rPx * (0.42 + rand() * 0.18);
      const heat = Math.max(0, 1 - t / (0.55 + rand() * 0.35));
      if (heat <= 0) continue;
      const pulse = 0.65 + 0.35 * Math.sin(c.now / 170 + k * 1.9);
      ctx.globalAlpha = heat * pulse;
      ctx.strokeStyle = heat > 0.45 ? (k % 2 === 0 ? st.spark : st.core) : st.deep;
      ctx.lineWidth = Math.max(2, sc * 0.06 * heat + 1);
      ctx.beginPath();
      ctx.moveTo(px + nx * off - ux * half, py + ny * off - uy * half);
      ctx.lineTo(px + nx * off + ux * half, py + ny * off + uy * half);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.5 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py } = c;
    const rand = srand(c.seed ^ 0xc3);
    ctx.save();
    // The draft column: a stack of tongues narrowing as it climbs —
    // a chimney of fire standing where the flue should be.
    if (t < 0.55) {
      const ft = 1 - t / 0.55;
      for (let k = 0; k < 3; k++) {
        const base = py - sc * (0.15 + k * 0.42) * (0.6 + 0.4 * ft);
        const h = sc * (0.5 - k * 0.08) * ft;
        const w = sc * (0.16 - k * 0.035) * (0.8 + 0.2 * Math.sin(c.now / 95 + k * 2.4));
        const lean = Math.sin(c.now / 150 + k * 1.6) * w * 0.7;
        ctx.globalAlpha = (0.9 - k * 0.18) * ft;
        ctx.fillStyle = k === 0 ? st.mid : shade(st.mid, 10 + k * 6);
        ctx.beginPath();
        ctx.moveTo(px - w, base);
        ctx.lineTo(px + lean, base - h);
        ctx.lineTo(px + w, base);
        ctx.closePath();
        ctx.fill();
        // The bright throat feeds up the middle.
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.moveTo(px - w * 0.4, base);
        ctx.lineTo(px + lean * 0.5, base - h * 0.55);
        ctx.lineTo(px + w * 0.4, base);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // Sparks climb the flue while the draft holds.
    if (Math.random() < c.frameDt * 14 * (1 - t)) {
      c.particles.burst(c.wx + (rand() - 0.5) * 0.3, c.wy - 0.5, 1, [st.spark, st.core], {
        speed: 1.8, life: 0.55, size: 0.06, gravity: -2.6, dir: -Math.PI / 2,
        spread: 0.35, flicker: 0.5, fade: st.deep, wobble: 0.6,
      });
    }
  },
};

// ----------------------------------------------------------- undertow

/**
 * UNDERTOW — "the raked seabed."
 * The ground remembers being seabed and the tide comes back for it:
 * radial furrows rake INWARD like fingers dragged through wet sand,
 * dashed tide-lines contract rim-to-center running the shoreline
 * backward, and a sunken hollow opens at the drain — then the foam
 * ring closes over it and the sea forgets again.
 */
const undertow: AbilitySig = {
  spawn(c: SigCtx) {
    if (c.kind === 'telegraph') return;
    const rand = srand(c.seed ^ 0xd1);
    // The rim floods backward: foam banks dragged toward the drain.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.9,
        c.wy + Math.sin(a) * c.radius * 0.9 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 2.0, life: 0.8, size: 0.11, gravity: 0.2, dir: a + Math.PI,
          spread: 0.25, drag: 1.1, grow: 0.16, shape: 'puff', fade: '#ffffff',
          wobble: 0.3, ground: true,
        },
      );
    }
  },
  ground(c: SigCtx) {
    if (c.kind === 'telegraph') return;
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xd2);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // The rake: six furrows dragged rim-to-center, each finger on its
    // own clock, a white sand-curl riding the advancing end.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      const r0 = rPx * (0.8 + rand() * 0.2);
      const reach = Math.min(1, t / (0.45 + rand() * 0.25));
      const rIn = r0 * (1 - reach * 0.9);
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.deep : shade(st.deep, 8);
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      ctx.lineTo(px + Math.cos(a) * rIn, py + Math.sin(a) * rIn * squash);
      ctx.stroke();
      // The sand-curl at the finger's tip.
      const g = sc * 0.05;
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + Math.cos(a) * rIn - g / 2, py + Math.sin(a) * rIn * squash - g / 2, g, g);
    }
    // Tide-lines running backward: dashed shorelines contracting.
    for (let k = 0; k < 2; k++) {
      const rr = rPx * (0.92 - k * 0.28) * (1 - t * 0.55);
      if (rr < sc * 0.1) continue;
      ctx.globalAlpha = 0.45 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.setLineDash([sc * 0.12, sc * 0.1]);
      ctx.lineDashOffset = c.now / 30;
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // The drain: a hollow opens, then the foam ring closes over it.
    const open = t < 0.5 ? Math.min(1, t / 0.35) : Math.max(0, 1 - (t - 0.5) / 0.4);
    const hr = rPx * 0.26 * open;
    if (hr > 1) {
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(px, py, hr, hr * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py, hr * 1.2, hr * 1.2 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.3 * fade);
  },
  air(c: SigCtx) {
    if (c.kind === 'telegraph') return;
    // Spray dragged into the drain while the tide still pulls.
    if (Math.random() < c.frameDt * 12 * (1 - c.t)) {
      const a = Math.random() * Math.PI * 2;
      const rr = c.radius * (0.5 + Math.random() * 0.45);
      c.particles.burst(
        c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash - 0.15,
        1, [c.st.core, c.st.spark], {
          speed: 2.0, life: 0.4, size: 0.07, gravity: 1.4, dir: a + Math.PI,
          spread: 0.25, drag: 1.0, shape: 'streak',
        },
      );
    }
  },
};

// ---------------------------------------------------------- stormlash

/**
 * STORMLASH — "the taut lash."
 * The promised bolt arrives as a WHIP: each hop bows sideways in
 * flight and SNAPS straight — the crack made visible — a three-spike
 * cracker tuft bursting at the tip. Then the spent lash goes slack,
 * sagging as it dies, while the struck ground keeps a scorch tick
 * for every friend the bolt brought.
 */
const stormlash: AbilitySig = {
  spawn(c: SigCtx) {
    // The cracker bursts at the struck end.
    c.particles.burst(c.wx2, c.wy2 - 0.45, 6, [c.st.spark, c.st.core], {
      speed: 2.8, life: 0.3, size: 0.07, gravity: 2.5, shape: 'streak', flicker: 0.6,
    });
    // The strike scorches: one dark shove of dust at the target's feet.
    c.particles.burst(c.wx2, c.wy2, 3, ['#4a4438', c.st.deep], {
      speed: 0.9, life: 0.6, size: 0.1, gravity: -0.3, drag: 1.9, grow: 0.18,
      shape: 'puff', ground: true,
    });
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    if (c.kind !== 'bolt') return;
    const rand = srand(c.seed ^ 0xe1);
    const lift = sc * 0.42;
    const x1 = c.px, y1 = c.py - lift;
    const x2 = c.px2, y2 = c.py2 - lift;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const side = rand() < 0.5 ? 1 : -1;
    const fade = 1 - t;
    // The whip's life: bowed → TAUT → slack.
    const snap = Math.min(1, t / 0.2);
    const bow = (1 - snap) * sc * 0.55 * side;
    const sag = Math.max(0, (t - 0.5) / 0.5) * sc * 0.35;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = snap >= 1 && t < 0.45 ? st.core : st.mid;
    ctx.lineWidth = Math.max(2, sc * (snap >= 1 && t < 0.45 ? 0.08 : 0.05));
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const arc = Math.sin(f * Math.PI);
      const x = x1 + dx * f + nx * bow * arc;
      const y = y1 + dy * f + ny * bow * arc + sag * arc;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // The cracker: three spikes fanning off the tip at the crack.
    if (t < 0.3) {
      const ft = 1 - t / 0.3;
      ctx.globalAlpha = ft;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      for (let k = 0; k < 3; k++) {
        const a = Math.atan2(uy, ux) + (k - 1) * 0.7 + side * 0.3;
        const reach = sc * (0.22 + k * 0.06) * ft;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + Math.cos(a) * reach, y2 + Math.sin(a) * reach);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Sparks shake off the tip while the lash is live.
    if (t < 0.4 && Math.random() < c.frameDt * 16) {
      c.particles.burst(c.wx2, c.wy2 - 0.45, 1, [st.spark, '#ffffff'], {
        speed: 1.8, life: 0.25, size: 0.05, gravity: 3, shape: 'streak', flicker: 0.5,
      });
    }
    c.glow(c.wx2, c.wy2, 0.9, 0.35 * fade);
  },
};

// -------------------------------------------------------- cinderstorm

/**
 * CINDERSTORM — "the cinder helix."
 * The emberstone exhales a fire-whirl: two strands of live cinders
 * climb a helix around the caster, winking white at the top of the
 * climb, while a freckle-ring of landed char accumulates dot by dot
 * on the turf — the storm writing its own ash census.
 */
const cinderstorm: AbilitySig = {
  spawn(c: SigCtx) {
    // The exhale: soot rolls out at the base as the whirl stands up.
    const rand = srand(c.seed ^ 0xf1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.4,
        c.wy + Math.sin(a) * c.radius * 0.4 * c.squash,
        1, [c.st.deep, '#3a2018'], {
          speed: 1.2, life: 0.8, size: 0.11, gravity: -0.4, dir: a, spread: 0.3,
          drag: 1.6, grow: 0.2, shape: 'puff', fade: '#241410', ground: true,
        },
      );
    }
    // First cinders leap: tongues catching in the young wind.
    c.particles.burst(c.wx, c.wy - 0.3, 4, [c.st.mid, c.st.spark], {
      speed: 1.3, life: 0.5, size: 0.1, gravity: -2.4, up: true,
      shape: 'lick', flicker: 0.4, fade: c.st.deep, wobble: 0.7,
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0xf2);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // The ash census: char freckles land one by one around the rim,
    // a few still glowing where the cinder had life left.
    for (let k = 0; k < 8; k++) {
      const born = (k / 8) * 0.65;
      if (t < born) continue;
      const a = rand() * Math.PI * 2;
      const rr = rPx * (0.45 + rand() * 0.5);
      const g = sc * (0.04 + rand() * 0.03);
      const hot = k % 3 === 0 && t < born + 0.3;
      ctx.globalAlpha = (hot ? 0.9 * (0.6 + 0.4 * Math.sin(c.now / 130 + k * 2.2)) : 0.55) * fade;
      ctx.fillStyle = hot ? st.spark : '#2c1a12';
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.4 * fade);
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // Two cinder strands climb the helix; the topmost bead of each
    // winks white — the cinder spending itself at the crown.
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 7; i++) {
        const f = i / 6;
        const a = c.now / 320 + s * Math.PI + f * 4.4;
        const rr = rPx * (0.72 - 0.4 * f);
        const bx = px + Math.cos(a) * rr;
        const by = py - sc * 0.1 - f * sc * 1.15 + Math.sin(a) * rr * squash * 0.35;
        const g = sc * (0.075 - f * 0.03);
        ctx.globalAlpha = (0.55 + 0.45 * Math.sin(c.now / 110 + i * 2.3 + s * 3)) * fade;
        ctx.fillStyle = i === 6 ? '#ffffff' : f > 0.55 ? st.spark : st.mid;
        ctx.fillRect(bx - g / 2, by - g / 2, g, g);
      }
    }
    ctx.restore();
    // The whirl feeds: cinders join at the base and ride up.
    if (Math.random() < c.frameDt * 18 * fade) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.6, c.wy + Math.sin(a) * c.radius * 0.6 * squash,
        1, [st.mid, st.spark], {
          speed: 1.6, life: 0.6, size: 0.07, gravity: -2.2, dir: a + Math.PI * 0.55,
          spread: 0.3, flicker: 0.5, fade: '#3a2018', wobble: 0.8,
        },
      );
    }
  },
};

// ----------------------------------------------------------- glaciate

/**
 * GLACIATE — "the pack ice."
 * One breath of the deep cold and the circle freezes over as pack
 * ice: faceted floe plates SNAP into place one after another, white
 * pressure-ridge seams buckling up where plate meets plate, frost
 * smoke rolling off the new shelf — a sea deciding to be stone.
 */
const glaciate: AbilitySig = {
  spawn(c: SigCtx) {
    const rand = srand(c.seed ^ 0x101);
    // The breath: frost smoke rolls out low across the freezing circle.
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rand() * 0.5;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.45,
        c.wy + Math.sin(a) * c.radius * 0.45 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 1.2, life: 1.1, size: 0.12, gravity: 0.2, dir: a, spread: 0.35,
          drag: 1.4, grow: 0.22, shape: 'puff', fade: '#ffffff', wobble: 0.4, ground: true,
        },
      );
    }
    // The air itself seizes: hanging glints where the cold passed.
    c.particles.burst(c.wx, c.wy - 0.55, 6, ['#ffffff', c.st.core], {
      speed: 0.6, life: 1.0, size: 0.11, gravity: 0.2, drag: 2.2, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x102);
    const fade = t < 0.72 ? 1 : (1 - t) / 0.28;
    ctx.save();
    ctx.lineCap = 'butt';
    // Six floes snap in one after another, each a faceted plate.
    const centers: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < 6; k++) {
      const ca = (k / 6) * Math.PI * 2 + rand() * 0.7;
      const cd = rPx * (0.2 + rand() * 0.45);
      const cx = px + Math.cos(ca) * cd;
      const cy = py + Math.sin(ca) * cd * squash;
      centers.push({ x: cx, y: cy });
      const born = k * 0.07;
      const pop = Math.min(1, Math.max(0, (t - born) / 0.09));
      const pr = rPx * (0.24 + rand() * 0.14) * pop;
      // Facet vertices — cut once per cast, never re-rolled.
      const verts: Array<{ x: number; y: number }> = [];
      for (let v = 0; v < 5; v++) {
        const va = (v / 5) * Math.PI * 2 + rand() * 0.5;
        const vr = pr * (0.75 + rand() * 0.4);
        verts.push({ x: cx + Math.cos(va) * vr, y: cy + Math.sin(va) * vr * squash });
      }
      if (pop <= 0) continue;
      ctx.globalAlpha = 0.3 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.mid : shade(st.mid, 8);
      ctx.beginPath();
      ctx.moveTo(verts[0]!.x, verts[0]!.y);
      for (let v = 1; v < 5; v++) ctx.lineTo(verts[v]!.x, verts[v]!.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.7 * fade * pop;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.stroke();
    }
    // Pressure ridges: white seams buckle up where floes meet.
    const ridged = Math.min(1, Math.max(0, (t - 0.35) / 0.25));
    if (ridged > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      for (let k = 0; k < 5; k++) {
        if (k / 5 > ridged) break;
        const a1 = centers[k]!;
        const b1 = centers[(k + 1) % 6]!;
        ctx.globalAlpha = 0.75 * fade * (0.7 + 0.3 * Math.sin(c.now / 260 + k * 2.1));
        ctx.beginPath();
        ctx.moveTo(a1.x + (b1.x - a1.x) * 0.25, a1.y + (b1.y - a1.y) * 0.25);
        ctx.lineTo(a1.x + (b1.x - a1.x) * 0.75, a1.y + (b1.y - a1.y) * 0.75);
        ctx.stroke();
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.3 * fade);
  },
  air(c: SigCtx) {
    // The shelf breathes cold: frost smoke keeps rolling off it.
    if (Math.random() < c.frameDt * 8 * (1 - c.t)) {
      const a = Math.random() * Math.PI * 2;
      const rr = c.radius * (0.4 + Math.random() * 0.5);
      c.particles.burst(
        c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash - 0.1,
        1, [c.st.core, '#ffffff'], {
          speed: 0.4, life: 0.9, size: 0.09, gravity: -0.4, drag: 1.6,
          grow: 0.14, shape: 'puff', wobble: 0.4,
        },
      );
    }
  },
};

// ------------------------------------------------------- galvanic_arc

/**
 * GALVANIC_ARC — "the closed circuit."
 * The stormpearl treats the line of foes as apparatus: twin parallel
 * rails snap down each hop like a circuit closing, terminal pips
 * glow at both ends, and over the struck body a spark-gap keeps
 * BUZZING — a live arc re-kinking between two pips until the charge
 * is spent, shedding static as it works.
 */
const galvanic_arc: AbilitySig = {
  spawn(c: SigCtx) {
    // Discharge at the pearl, arrival static at the conductor.
    c.particles.burst(c.wx, c.wy - 0.4, 3, [c.st.core, '#ffffff'], {
      speed: 0.9, life: 0.35, size: 0.08, gravity: 0.5, drag: 1.8, shape: 'glint',
    });
    c.particles.burst(c.wx2, c.wy2 - 0.45, 5, [c.st.spark, c.st.core], {
      speed: 2.4, life: 0.3, size: 0.06, gravity: 2.8, shape: 'streak', flicker: 0.6,
    });
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc } = c;
    if (c.kind !== 'bolt') return;
    const lift = sc * 0.42;
    const x1 = c.px, y1 = c.py - lift;
    const x2 = c.px2, y2 = c.py2 - lift;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The rails: two parallel conductors snapping in, dying early —
    // current only needs the circuit for an instant.
    if (t < 0.5) {
      const laid = Math.min(1, t / 0.12);
      const rt = 1 - t / 0.5;
      const off = sc * 0.055;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.028);
      for (let s = -1; s <= 1; s += 2) {
        ctx.globalAlpha = 0.8 * rt;
        ctx.beginPath();
        ctx.moveTo(x1 + nx * off * s, y1 + ny * off * s);
        ctx.lineTo(x1 + dx * laid + nx * off * s, y1 + dy * laid + ny * off * s);
        ctx.stroke();
      }
    }
    // Terminal pips: both ends of the circuit hold their glow.
    const g = sc * 0.075 * (0.75 + 0.25 * Math.sin(c.now / 80 + c.seed));
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.core;
    ctx.fillRect(x1 - g / 2, y1 - g / 2, g, g);
    ctx.fillRect(x2 - g / 2, y2 - g / 2, g, g);
    // The spark-gap: two pips over the struck body with a live arc
    // re-kinking between them — the buzz made visible.
    if (t < 0.8) {
      const bt = 1 - t / 0.8;
      const gy = y2 - sc * 0.5;
      const half = sc * 0.16;
      ctx.fillStyle = st.spark;
      const p = sc * 0.05;
      ctx.globalAlpha = 0.9 * bt;
      ctx.fillRect(x2 - half - p / 2, gy - p / 2, p, p);
      ctx.fillRect(x2 + half - p / 2, gy - p / 2, p, p);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.globalAlpha = bt * (0.55 + 0.45 * Math.sin(c.now / 28 + c.seed));
      ctx.beginPath();
      boltPath(ctx, x2 - half, gy, x2 + half, gy, c.seed ^ Math.floor(c.now / 45), sc * 0.05);
      ctx.stroke();
    }
    ctx.restore();
    // The gap sheds static while it buzzes.
    if (t < 0.8 && Math.random() < c.frameDt * 10) {
      c.particles.burst(c.wx2, c.wy2 - 0.85, 1, [st.spark, '#ffffff'], {
        speed: 1.2, life: 0.25, size: 0.05, gravity: 4, shape: 'streak', flicker: 0.6,
      });
    }
    c.glow(c.wx2, c.wy2, 0.8, 0.3 * fade);
  },
};

// --------------------------------------------------------- overgrowth

/**
 * OVERGROWTH — "the season in seconds."
 * Spring arrives violently and refuses to stop: briar canes lurch
 * taller on every pulse of the field — growth as a RATCHET, not a
 * fade — sprouting thorn ticks as they lengthen and unfurling leaf
 * tips once they stand, while a root ring creeps the perimeter.
 * When the season finally ends, the whole thicket sheds its leaves.
 */
const overgrowth: AbilitySig = {
  spawn(c: SigCtx) {
    // The soil breaks first: turf thrown by shoots in a hurry.
    c.particles.burst(c.wx, c.wy, 6, ['#5a5045', '#4a4252'], {
      speed: 1.3, life: 0.7, size: 0.1, gravity: -0.4, drag: 1.7, grow: 0.18,
      shape: 'puff', ground: true,
    });
    c.particles.burst(c.wx, c.wy - 0.2, 5, [c.st.mid, c.st.spark], {
      speed: 1.6, life: 0.6, size: 0.09, gravity: 2.5, up: true, shape: 'shard', spin: 8,
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    ctx.save();
    // The root ring: the field's claim creeping the perimeter.
    const rr = rPx * Math.min(1, c.age / 900);
    if (rr > sc * 0.1) {
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.setLineDash([sc * 0.14, sc * 0.09]);
      ctx.lineDashOffset = -c.now / 60;
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x111);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    // The ratchet: every field pulse the canes lurch taller.
    const P = 900; // ms — the field's pulse cadence
    const n = c.age / P;
    const step = Math.floor(n);
    const lurch = Math.min(1, (n - step) * 2.6);
    const growth = Math.min(1, (step + lurch) / 5);
    ctx.save();
    ctx.lineCap = 'butt';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.6;
      const bd = rPx * (0.35 + rand() * 0.45);
      const bx = px + Math.cos(a) * bd;
      const by = py + Math.sin(a) * bd * squash;
      const gk = Math.min(1, growth * (1.15 - k * 0.06));
      if (gk <= 0.02) continue;
      const h = sc * (0.65 + rand() * 0.45) * gk;
      const lean = (rand() - 0.5) * sc * 0.5;
      // The cane: three kinked segments reaching up and inward.
      const pts = [
        { x: bx, y: by },
        { x: bx + lean * 0.3 + (rand() - 0.5) * sc * 0.12, y: by - h * 0.4 },
        { x: bx + lean * 0.7 + (rand() - 0.5) * sc * 0.12, y: by - h * 0.75 },
        { x: bx + lean, y: by - h },
      ];
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = k % 2 === 0 ? st.deep : shade(st.deep, 10);
      ctx.lineWidth = Math.max(2, sc * 0.055 * (1 - gk * 0.3));
      revealPoly(ctx, pts, 1);
      // Thorn ticks sprout on segments already grown.
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      for (let v = 1; v < 3; v++) {
        if (gk < v * 0.33) break;
        const side = v % 2 === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(pts[v]!.x, pts[v]!.y);
        ctx.lineTo(pts[v]!.x + side * sc * 0.09, pts[v]!.y - sc * 0.06);
        ctx.stroke();
      }
      // The leaf tip unfurls once the cane stands.
      if (gk > 0.6) {
        const lw = sc * 0.09 * Math.min(1, (gk - 0.6) / 0.3);
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.moveTo(pts[3]!.x, pts[3]!.y);
        ctx.lineTo(pts[3]!.x - lw, pts[3]!.y - lw * 1.6);
        ctx.lineTo(pts[3]!.x + lw * 0.6, pts[3]!.y - lw * 2.1);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // The season ends: the thicket sheds its leaves.
    if (t > 0.85 && Math.random() < c.frameDt * 9) {
      const a = Math.random() * Math.PI * 2;
      const rr = c.radius * Math.random() * 0.8;
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * squash - 0.8, 1, [st.mid, st.spark], {
        speed: 0.5, life: 0.9, size: 0.09, gravity: 1.1, drag: 1.2, shape: 'shard', spin: 6, wobble: 0.6,
      });
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.2 * fade);
  },
};

// -------------------------------------------------------- grave_chill

/**
 * GRAVE_CHILL — "the risen flagstones."
 * The cold of the deep earth surfaces with its floor: joint lines of
 * buried masonry show through the turf and FROST OVER, white creeping
 * seam by seam down each crack, one whole slab outline surfacing at
 * the center — some older place remembering it was walked on — while
 * breath-slow mist stands in the air that will not warm.
 */
const grave_chill: AbilitySig = {
  spawn(c: SigCtx) {
    const rand = srand(c.seed ^ 0x121);
    // The ground exhales: slow, heavy mist that barely rises.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.6;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * 0.5,
        c.wy + Math.sin(a) * c.radius * 0.5 * c.squash,
        1, [c.st.mid, c.st.core], {
          speed: 0.5, life: 1.3, size: 0.12, gravity: -0.25, dir: a, spread: 0.4,
          drag: 1.8, grow: 0.18, shape: 'puff', fade: '#ffffff', wobble: 0.3, ground: true,
        },
      );
    }
    // The air stops: glints hang nearly motionless where it froze.
    c.particles.burst(c.wx, c.wy - 0.6, 5, ['#ffffff', c.st.core], {
      speed: 0.3, life: 1.2, size: 0.1, gravity: 0.1, drag: 2.6, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x122);
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // The joints: buried masonry lines surfacing, orthogonal the way
    // laid stone is, each frosting white from one end at its own pace.
    for (let k = 0; k < 6; k++) {
      const jx = px + (rand() - 0.5) * rPx * 1.5;
      const jy = py + (rand() - 0.5) * rPx * 1.5 * squash;
      const ang = (rand() < 0.5 ? 0 : Math.PI / 2) + (rand() - 0.5) * 0.16;
      const half = rPx * (0.16 + rand() * 0.14);
      const ux = Math.cos(ang) * half;
      const uy = Math.sin(ang) * half * squash;
      // The dark crack beneath.
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.moveTo(jx - ux, jy - uy);
      ctx.lineTo(jx + ux, jy + uy);
      ctx.stroke();
      // Frost claims it end to end.
      const creep = Math.min(1, t / (0.35 + rand() * 0.35));
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, sc * 0.025);
      ctx.beginPath();
      ctx.moveTo(jx - ux, jy - uy);
      ctx.lineTo(jx - ux + ux * 2 * creep, jy - uy + uy * 2 * creep);
      ctx.stroke();
    }
    // The one whole slab: a stone outline surfacing at the center.
    const surf = Math.min(1, t / 0.4);
    ctx.globalAlpha = 0.55 * fade * surf;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.035);
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, squash);
    ctx.rotate((c.seed % 9) * 0.1 - 0.4);
    ctx.strokeRect(-rPx * 0.3, -rPx * 0.2, rPx * 0.6, rPx * 0.4);
    ctx.restore();
    // Rime specks pulse at the coldest corners.
    const g = sc * 0.045;
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + (c.seed % 5);
      const rr = rPx * 0.55;
      ctx.globalAlpha = fade * (0.4 + 0.4 * Math.sin(c.now / 340 + k * 2.2));
      ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 * fade);
  },
  air(c: SigCtx) {
    // Breath-slow wisps stand up off the stones and hang.
    if (Math.random() < c.frameDt * 7 * (1 - c.t)) {
      const a = Math.random() * Math.PI * 2;
      const rr = c.radius * Math.random() * 0.7;
      c.particles.burst(
        c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash - 0.2,
        1, [c.st.core, c.st.mid], {
          speed: 0.25, life: 1.1, size: 0.09, gravity: -0.5, drag: 1.4,
          grow: 0.1, shape: 'puff', wobble: 0.35,
        },
      );
    }
  },
};

// -------------------------------------------------------- gloom_burst

/**
 * GLOOM_BURST — "the blight calendar."
 * The planted blight keeps time: a five-petal bloom opens over the
 * field, wilts — petals drooping, then falling as litter — and
 * OPENS AGAIN on the field's pulse clock, turned a little each
 * season, every cycle leaving one more stain lobe soaked into the
 * ground. Season after season, exactly as promised.
 */
const gloom_burst: AbilitySig = {
  spawn(c: SigCtx) {
    // The planting: dark soil turned over something that wants out.
    c.particles.burst(c.wx, c.wy, 5, [c.st.deep, '#3a2440'], {
      speed: 1.0, life: 0.8, size: 0.11, gravity: -0.3, drag: 1.7, grow: 0.2,
      shape: 'puff', fade: '#1c1424', ground: true,
    });
    c.particles.burst(c.wx, c.wy - 0.3, 4, [c.st.spark, c.st.mid], {
      speed: 1.1, life: 0.5, size: 0.08, gravity: 1.2, up: true, shape: 'glint',
    });
  },
  ground(c: SigCtx) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x131);
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const P = 900; // ms — the field's pulse cadence
    const season = Math.floor(c.age / P);
    const phase = (c.age % P) / P;
    ctx.save();
    // The claim: a thin rot ring holding the field's border.
    ctx.globalAlpha = 0.45 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx, rPx * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The calendar: one stain lobe per season, the newest soaking in.
    const lobes = Math.min(6, season + 1);
    for (let k = 0; k < lobes; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
      const d = rPx * (0.3 + rand() * 0.35);
      const soak = k === lobes - 1 ? Math.min(1, phase * 2.2) : 1;
      const lr = rPx * (0.2 + rand() * 0.1) * soak;
      ctx.globalAlpha = 0.4 * fade;
      ctx.fillStyle = k % 2 === 0 ? '#3a1a30' : shade(st.deep, -6);
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * d, py + Math.sin(a) * d * squash, lr, lr * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c: SigCtx) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const P = 900;
    const season = Math.floor(c.age / P);
    const phase = (c.age % P) / P;
    // The bloom's season: open → full → wilt.
    const open = phase < 0.45 ? phase / 0.45 : 1;
    const wilt = phase > 0.68 ? (phase - 0.68) / 0.32 : 0;
    const bx = px;
    const by = py - sc * 0.55;
    ctx.save();
    // The dark under-halo the bloom hangs in.
    ctx.globalAlpha = 0.3 * fade * open;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(bx, by, sc * 0.42 * open, sc * 0.3 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    // Five petals, turned a little each season; wilting petals droop
    // before they fall.
    const L = sc * 0.36 * open * (1 - wilt * 0.35);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + season * 0.35 + (c.seed % 7) * 0.2;
      const droop = wilt * sc * 0.16 * (1 + Math.sin(k * 2.7));
      const tx = bx + Math.cos(a) * L;
      const ty = by + Math.sin(a) * L * 0.72 + droop;
      const w = sc * 0.09 * open * (1 - wilt * 0.5);
      ctx.globalAlpha = (0.85 - wilt * 0.45) * fade;
      ctx.fillStyle = k % 2 === 0 ? st.mid : shade(st.mid, -8);
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a + Math.PI / 2) * w, by + Math.sin(a + Math.PI / 2) * w * 0.72);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx + Math.cos(a - Math.PI / 2) * w, by + Math.sin(a - Math.PI / 2) * w * 0.72);
      ctx.closePath();
      ctx.fill();
    }
    // The heart: brightest at full bloom, dim through the wilt.
    const g = sc * 0.08 * open;
    ctx.globalAlpha = (0.95 - wilt * 0.6) * fade;
    ctx.fillStyle = st.core;
    ctx.fillRect(bx - g / 2, by - g / 2, g, g);
    ctx.restore();
    // The wilt sheds: petal litter falls through the gloom.
    if (wilt > 0.2 && Math.random() < c.frameDt * 10) {
      c.particles.burst(c.wx, c.wy - 0.5, 1, [st.mid, st.spark], {
        speed: 0.6, life: 0.8, size: 0.08, gravity: 1.4, drag: 1.1,
        shape: 'shard', spin: 5, wobble: 0.5, fade: st.deep,
      });
    }
    c.glow(c.wx, c.wy, c.radius * 0.7, 0.25 * fade * open);
  },
};

// ----------------------------------------------------------- registry

/**
 * The archmage wave, first half. Spread into the master SIGNATURES
 * table by fxSignatures.ts when the wave is wired.
 */
export const ARCHMAGE_A_SIGS: Record<string, AbilitySig> = {
  arcane_ring,
  wisp_flare,
  hearth_flare,
  undertow,
  stormlash,
  cinderstorm,
  glaciate,
  galvanic_arc,
  overgrowth,
  grave_chill,
  gloom_burst,
};
