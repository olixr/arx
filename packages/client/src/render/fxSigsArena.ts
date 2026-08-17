/**
 * THE SAND AND THE ROAR — the ring's own ceremony fx
 * (docs/arena-plan.md Phase 4, THE GRAND SHOW).
 *
 * Three moments, each a set-piece on the shipped three-strata bar:
 *
 *  arena:gates   — THE BAR COMES DOWN. A 2 s field wire across the
 *                  pit as the gates shut: an iron ring closing inward
 *                  in four sliding quarter-arcs, dust kicked where
 *                  they land, and a rim of banner-gold points waking
 *                  around the sand — the show is starting and the
 *                  crowd's edge lights first.
 *  arena:victory — THE LAUREL. One nova at the pit's heart: a hard
 *                  gold double-ring snaps outward, petal sparks fly
 *                  true-height off it, and a scatter of gold grains
 *                  lies on the sand ~8 s — the crowd remembers where
 *                  you stood.
 *  arena:purse   — THE PURSE RISES. A summon moment on the chest
 *                  tile: the ground exhales a dust breath, a coin
 *                  glint climbs, and two ember grains keep watch on
 *                  the lid until the hand arrives.
 *
 * Binding laws as everywhere: hard edges, save/restore hygiene,
 * srand determinism, squash on ground y-radii, frameDt-gated
 * emission, ≤ ~60 path ops per hook per frame. The telegraph stays
 * pure instrument; these ids ride field/nova/summon wires.
 */

import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, asMatter } from './matter/index.js';

function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** One settled grain on the ground stratum (the lasting-mark lane). */
function lay(
  c: SigCtx,
  wx: number,
  wy: number,
  color: string,
  opts: { life?: number; size?: number; flicker?: number; fade?: string; fadeAt?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05,
    life: opts.life ?? 8,
    size: opts.size ?? 0.055,
    gravity: 0,
    drag: 4,
    layer: 'ground',
    flicker: opts.flicker ?? 0,
    fade: opts.fade,
    fadeAt: opts.fadeAt,
  });
}

// ---------------------------------------------------------- arena:gates
// field wire, ~2 s, radius = the pit's long axis.

const arena_gates: AbilitySig = {
  ground(c) {
    const { ctx, t, px, py, rPx, squash } = c;
    ctx.save();
    ctx.lineCap = 'butt';
    // Four iron quarter-arcs sliding INWARD from beyond the rim —
    // the bar coming down, read from every seat. Hard iron over a
    // dark under-stroke; the ring lands at 0.62 of the sand.
    const slide = 1.35 - 0.73 * cl(t * 1.25);
    const r = rPx * slide;
    for (let q = 0; q < 4; q++) {
      const a0 = q * (Math.PI / 2) + 0.12 + t * 0.35;
      const a1 = a0 + Math.PI / 2 - 0.24;
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, 0, a0, a1);
      ctx.strokeStyle = '#141019';
      ctx.lineWidth = Math.max(2.5, rPx * 0.045);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, 0, a0, a1);
      ctx.strokeStyle = '#8d8a96';
      ctx.lineWidth = Math.max(1, rPx * 0.02);
      ctx.stroke();
    }
    // The crowd's edge lights: twelve banner-gold points waking round
    // the true rim, staggered by seed so no two matches wake alike.
    const rand = srand(c.seed ^ 0x9a7e);
    for (let k = 0; k < 12; k++) {
      // Both draws land BEFORE the wake gate — a conditional draw
      // would shift every later point's stream as points wake and the
      // rim would reshuffle mid-animation (the frame-stability law).
      const th = 0.25 + rand() * 0.5;
      const jit = rand() * 0.2;
      const wake = cl((t - th) / 0.12);
      if (wake <= 0) continue;
      const a = (k / 12) * Math.PI * 2 + jit;
      const gx = px + Math.cos(a) * rPx * 1.04;
      const gy = py + Math.sin(a) * rPx * 1.04 * squash;
      ctx.fillStyle = '#e8b74a';
      const s = Math.max(1.5, rPx * 0.016) * wake;
      ctx.fillRect(gx - s / 2, gy - s / 2, s, s);
    }
    ctx.restore();
    if (t > 0.4 && t < 0.6) c.glow(c.wx, c.wy, c.radius * 0.7, 0.12);
  },
  spawn(c) {
    // Dust where the bar lands — one honest kick at the heart's rim,
    // through the one-voice matter library.
    const m = asMatter(c);
    dust.deployments.kick?.(m, c.wx, c.wy, { scale: 0.8 });
  },
};

// -------------------------------------------------------- arena:victory
// nova wire at the pit's heart.

const arena_victory: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x1a02);
    // Petal sparks fly true-height off the ring: gold, brief, falling
    // back to the sand with gravity honored.
    c.particles.burst(c.wx, c.wy, 26, ['#e8b74a', '#f4d98c', '#c98f2e'], {
      speed: 2.6,
      life: 0.9,
      size: 0.07,
      gravity: 5.5,
      drag: 1.6,
      z: 0.4,
      vz: 3.2,
    });
    // The crowd remembers where you stood: a laurel of gold grains
    // laid in a deliberate ring, eight seconds on the sand.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rand() * 0.3;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.45, c.wy + Math.sin(a) * c.radius * 0.45 * 0.6,
        '#e8b74a', { life: 8, size: 0.06, flicker: 4, fade: '#8a6534', fadeAt: 0.55 });
    }
  },
  ground(c) {
    const { ctx, t, px, py, rPx, squash } = c;
    if (t > 0.85) return;
    ctx.save();
    // The hard double-ring: a snap outward, gold over deep gold, the
    // outer ring a beat behind the inner — a shout, not a wash.
    const grow = 1 - Math.pow(1 - cl(t / 0.55), 3);
    const fade = 1 - cl((t - 0.55) / 0.3);
    ctx.globalAlpha = fade;
    for (const [frac, w, tone] of [
      [1.0, 0.035, '#e8b74a'],
      [0.82, 0.018, '#8a6534'],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * grow * frac, rPx * grow * frac * squash, 0, 0, Math.PI * 2);
      ctx.strokeStyle = tone;
      ctx.lineWidth = Math.max(1.5, rPx * w);
      ctx.stroke();
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * grow, 0.2 * fade);
  },
};

// ---------------------------------------------------------- arena:purse
// summon moment on the chest tile.

const arena_purse: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    dust.deployments.kick?.(m, c.wx, c.wy, { scale: 0.5 });
    // The coin glint climbs off the lid — a thin gold thread of rising
    // sparks, and two ember grains keeping watch until the hand comes.
    c.particles.burst(c.wx, c.wy, 8, ['#f4d98c', '#e8b74a'], {
      speed: 0.5,
      life: 1.1,
      size: 0.055,
      gravity: -0.6,
      drag: 2.2,
      z: 0.15,
      vz: 1.6,
    });
    lay(c, c.wx - 0.22, c.wy + 0.1, '#e8b74a', { life: 9, size: 0.05, flicker: 6 });
    lay(c, c.wx + 0.24, c.wy - 0.06, '#c98f2e', { life: 9, size: 0.05, flicker: 6 });
  },
  ground(c) {
    if (c.t > 0.7) return;
    const { ctx, t, px, py, rPx, squash } = c;
    ctx.save();
    const grow = 1 - Math.pow(1 - cl(t / 0.7), 2);
    ctx.globalAlpha = 1 - t / 0.7;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * grow, rPx * grow * squash, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#e8b74a';
    ctx.lineWidth = Math.max(1, rPx * 0.03);
    ctx.stroke();
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius, 0.14 * (1 - t));
  },
};

export const ARENA_SIGS: Record<string, AbilitySig> = {
  'arena:gates': arena_gates,
  'arena:victory': arena_victory,
  'arena:purse': arena_purse,
};
