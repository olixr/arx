/**
 * THE LIVING MEADOW — the landing page's hero is not a screenshot.
 *
 * This is a slice of the Dawnlands running on the game's own painters:
 * the meadow tones from terrain.ts, the wind-swept blades of
 * GrassSystem, the campfire from the renderer's static-item painter,
 * fire's real particle deployments, the emissive bloom sprite, and the
 * whole day-night script from daylight.ts — compressed so a visitor
 * watches dusk fall, the fire earn its keep, and dawn come back,
 * inside a couple of minutes.
 *
 * Scene laws, inherited from the game:
 * - FLAT FACETS ONLY. No blur, no shadowBlur; glows are the game's own
 *   radial sprites under `lighter`, exactly like the renderer.
 * - THE CAMERA NEVER ROLLS. yScale 0.6, heights at full scale.
 * - HEAVY PAINTERS ARRIVE LATE. rig.ts and trees.ts (~2 MB through
 *   their import graphs) come in through a dynamic import; the meadow,
 *   fire and sky never wait for them.
 */
import { Tile, daylightAt, valueNoise } from '@arx/shared';
import { GrassSystem, type Disturber } from '../render/grass.js';
import { fire } from '../render/matter/fire.js';
import { radialGlowSprite } from '../render/glowSprite.js';
import { LAYER_OVERLAY, Particles, type Emitter, type Particle } from '../render/particles.js';
import { chamferRect, facetCircle } from '../render/shapes.js';
import type { Figure, SceneTree } from './figures.js';

const YS = 0.6; // the game camera's y foreshorten
const DAY_SECONDS = 150; // one full day-night cycle on the landing page
const DPR_CAP = 1.6;

// Late afternoon by default: the dusk fire arrives ~15s in. `?hour=N`
// pins the clock for art audits and screenshots — the landing page's
// `/time` command.
const HOUR_PIN = (() => {
  const q = new URLSearchParams(location.search).get('hour');
  const v = q === null ? NaN : Number.parseFloat(q);
  return Number.isFinite(v) ? ((v % 24) + 24) % 24 : null;
})();
const START_HOURS = HOUR_PIN ?? 17.6;

/** terrain.ts palette — the meadow's four greens and the path/dirt pair. */
const GRASS_TONES = ['#5c8941', '#588440', '#608e45', '#55813e'];
const PATH_TONES = ['#c2a26e', '#bc9d69'];
const PATH_BAND = 'rgba(105, 78, 44, 0.3)';
const DIRT_TONES = ['#96744c', '#8f6e47'];
const DIRT_BAND = 'rgba(70, 50, 30, 0.3)';

/** The renderer's dynamic-glow falloff profile. */
const GLOW_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.55, 0.38],
  [1, 0],
];

/** terrain.ts:3475 — the meadow's noise-driven grass tone. */
function meadowTone(wx: number, wy: number): string {
  const n =
    valueNoise(1234, wx * 0.055, wy * 0.055) * 0.7 +
    valueNoise(777, wx * 0.021, wy * 0.021) * 0.3;
  const idx = n < 0.38 ? 3 : n < 0.52 ? 1 : n < 0.72 ? 0 : 2;
  return GRASS_TONES[idx]!;
}

interface SortItem {
  y: number;
  draw: () => void;
}

interface Walker {
  fig: Figure | null;
  cloth: string;
  wx: number;
  wy: number;
  dir: number;
  speed: number;
  /** Lane offset from the path's centerline, tiles. */
  off: number;
  east: boolean;
}

export interface SceneOptions {
  /** prefers-reduced-motion: paint one dusk frame and stand down. */
  reduced: boolean;
  /** Fires when the scene clock crosses into a new named hour. */
  onClock?: (label: string, hours: number) => void;
}

export interface ArxScene {
  setRunning(run: boolean): void;
  destroy(): void;
}

function clockLabel(hours: number): string {
  if (hours < 4.6) return 'deep night';
  if (hours < 6.2) return 'first light';
  if (hours < 7.6) return 'dawn';
  if (hours < 11.5) return 'morning';
  if (hours < 13.5) return 'noon';
  if (hours < 17.5) return 'afternoon';
  if (hours < 19.2) return 'evening';
  if (hours < 20.6) return 'dusk';
  if (hours < 21.6) return 'sundown';
  return 'night';
}

export function createScene(canvas: HTMLCanvasElement, opts: SceneOptions): ArxScene {
  const ctx = canvas.getContext('2d')!;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let S = 72; // px per tile
  let hw = 10; // world half-extents of the viewport, tiles
  let hh = 7;

  // ---------------------------------------------------------- the land
  // The worn path swings a lazy S across the lower meadow; the fire
  // keeps a clearing north of it, right of center where the hero copy
  // leaves the frame open.
  const pathY = (wx: number): number => 1.9 + Math.sin(wx * 0.14) * 1.05;
  let fireX = 3.4;
  const fireY = 0.1;

  // Nature never cuts a 45° chamfer: both worked edges wander on the
  // same 1-D noises the bake paints with, so the analytic class and
  // the painted shape always agree.
  const pathHalf = (wx: number): number => 0.6 + (valueNoise(97, wx * 0.5, 7) - 0.5) * 0.42;
  const clearR = (ang: number): number =>
    1.4 + (valueNoise(41, Math.cos(ang) * 1.4 + 3, Math.sin(ang) * 1.4 + 3) - 0.5) * 0.55;

  type GroundClass = 0 | 1 | 2; // grass | path | dirt
  const classAt = (wx: number, wy: number): GroundClass => {
    const dx = wx - fireX;
    const dy = wy - fireY;
    const r = clearR(Math.atan2(dy, dx));
    if (dx * dx + dy * dy < r * r) return 2;
    if (Math.abs(wy - pathY(wx)) < pathHalf(wx)) return 1;
    return 0;
  };

  const groundAt = (tx: number, ty: number): number | undefined =>
    classAt(tx + 0.5, ty + 0.5) === 0 ? Tile.Grass : Tile.Path;
  // The detail layer, as worldgen deals it: tuft clumps standing proud
  // of the lawn, and flower drifts at meadow scale.
  const detailAt = (tx: number, ty: number): number => {
    if (valueNoise(311, tx * 0.21, ty * 0.21) > 0.8) return 2;
    if (valueNoise(313, tx * 0.09, ty * 0.09) > 0.84) return 1;
    return 0;
  };

  const wts = (wx: number, wy: number): { x: number; y: number } => ({
    x: wx * S + w / 2,
    y: wy * S * YS + h / 2,
  });

  // Ground is baked once per resize (the camera holds still; life
  // comes from the wind, the walkers, the fire, and the sky). The
  // meadow is cell dapple; the worked ground is drawn as SHAPES —
  // wobbled polygons with a band shelf where they meet turf, the way
  // the real bake's marching-squares contours read.
  let groundBake: HTMLCanvasElement | null = null;
  function bakeGround(): void {
    const bake = document.createElement('canvas');
    bake.width = Math.ceil(w * dpr);
    bake.height = Math.ceil(h * dpr);
    const b = bake.getContext('2d')!;
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bwts = wts; // world → screen, same camera as the live pass

    // 1. The meadow plane: quarter-tile dapple, low contrast.
    const cell = S / 4;
    const cw = 0.25;
    for (let cy = 0; cy * cell < h + cell; cy++) {
      for (let cx = 0; cx * cell < w + cell; cx++) {
        const wx = (cx * cell - w / 2) / S + cw / 2;
        const wy = (cy * cell - h / 2) / (S * YS) + cw / 2;
        b.fillStyle = meadowTone(wx, wy);
        b.fillRect(cx * cell, cy * cell, cell + 0.5, cell + 0.5);
      }
    }

    // 2. The path: one ribbon polygon between two wandering edges.
    const step = 0.22;
    const x0 = -hw - 1;
    const x1 = hw + 1;
    const ribbon = (grow: number): Path2D => {
      const p = new Path2D();
      let first = true;
      for (let wx = x0; wx <= x1; wx += step) {
        const e = bwts(wx, pathY(wx) - pathHalf(wx) - grow);
        if (first) {
          p.moveTo(e.x, e.y);
          first = false;
        } else p.lineTo(e.x, e.y);
      }
      for (let wx = x1; wx >= x0; wx -= step) {
        const e = bwts(wx, pathY(wx) + pathHalf(wx) + grow);
        p.lineTo(e.x, e.y);
      }
      p.closePath();
      return p;
    };
    // The band shelf first (grass side), then the tread.
    b.fillStyle = PATH_BAND;
    b.fill(ribbon(0.16));
    const tread = ribbon(0);
    b.fillStyle = PATH_TONES[0]!;
    b.fill(tread);

    // 3. The clearing: a wobbled blob around the fire, same treatment.
    const blob = (grow: number): Path2D => {
      const p = new Path2D();
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = clearR(a) + grow;
        const e = bwts(fireX + Math.cos(a) * r, fireY + Math.sin(a) * r);
        if (i === 0) p.moveTo(e.x, e.y);
        else p.lineTo(e.x, e.y);
      }
      p.closePath();
      return p;
    };
    b.fillStyle = DIRT_BAND;
    b.fill(blob(0.16));
    const floor = blob(0);
    b.fillStyle = DIRT_TONES[0]!;
    b.fill(floor);

    // 4. Dapple inside both shapes: the second tone plus foot-wear
    //    crumbs, clipped so nothing bleeds onto the turf.
    b.save();
    b.clip(tread);
    for (let wx = x0; wx <= x1; wx += 0.16) {
      const n = valueNoise(55, wx * 2.1, 1);
      if (n < 0.45) continue;
      const wy = pathY(wx) + (n - 0.7) * 1.6 * pathHalf(wx);
      const e = bwts(wx, wy);
      b.fillStyle = n > 0.78 ? 'rgba(105, 78, 44, 0.22)' : PATH_TONES[1]!;
      const d = S * (0.1 + n * 0.1);
      b.fillRect(e.x - d / 2, e.y - d * 0.3, d, d * 0.6);
    }
    b.restore();
    b.save();
    b.clip(floor);
    for (let i = 0; i < 40; i++) {
      const n1 = valueNoise(56, i * 0.7, 2);
      const n2 = valueNoise(56, 3, i * 0.9);
      const e = bwts(fireX + (n1 - 0.5) * 3.2, fireY + (n2 - 0.5) * 3.2);
      b.fillStyle = i % 3 === 0 ? 'rgba(70, 50, 30, 0.2)' : DIRT_TONES[1]!;
      const d = S * (0.09 + n1 * 0.1);
      b.fillRect(e.x - d / 2, e.y - d * 0.3, d, d * 0.6);
    }
    b.restore();
    groundBake = bake;
  }

  // ------------------------------------------------------- the systems
  const grass = new GrassSystem();
  const particles = new Particles();
  const glows: Array<{ x: number; y: number; r: number; rgb: string; a: number }> = [];
  const mctx = {
    particles,
    glow: (x: number, y: number, r: number, rgb: string, a: number) => {
      glows.push({ x, y, r, rgb, a });
    },
  };
  let plume: Emitter | null = null;
  let lightLayer: HTMLCanvasElement | null = null;

  // ------------------------------------------------------- the figures
  const CLOTHS = ['#c4553d', '#3d78c4', '#4a6b2e', '#8a55c4', '#31465e'];
  const walkers: Walker[] = [
    { fig: null, cloth: CLOTHS[0]!, wx: 0, wy: 0, dir: 0, speed: 1.9, off: -0.28, east: true },
    { fig: null, cloth: CLOTHS[1]!, wx: 0, wy: 0, dir: 0, speed: 1.6, off: 0.34, east: true },
    { fig: null, cloth: CLOTHS[2]!, wx: 0, wy: 0, dir: Math.PI, speed: 1.75, off: 0.02, east: false },
  ];
  let keeper: { fig: Figure | null; wx: number; wy: number } = { fig: null, wx: 0, wy: 0 };
  let trees: SceneTree[] = [];
  let figuresMod: typeof import('./figures.js') | null = null;

  void import('./figures.js').then((mod) => {
    figuresMod = mod;
    walkers.forEach((wk, i) => {
      wk.fig = mod.makeFigure(wk.cloth);
      // Stagger entrances across the meadow so nobody spawns in a clump.
      wk.wx = (wk.east ? -1 : 1) * (hw + 1.5) + (wk.east ? 1 : -1) * i * (hw * 0.8);
      wk.wy = pathY(wk.wx) + wk.off;
    });
    keeper = { fig: mod.makeFigure('#c4a03d'), wx: fireX - 0.95, wy: fireY + 0.45 };
    layoutTrees();
  });

  function layoutTrees(): void {
    if (!figuresMod) return;
    const m = figuresMod;
    // The north treeline: crowns break the horizon band, meadow stays
    // open where the fire and the walkers live.
    trees = [
      m.makeTree('oak', 11, -hw * 0.78, -hh * 0.5),
      m.makeTree('wild', 23, -hw * 0.5, -hh * 0.95),
      m.makeTree('wild', 9, -hw * 1.02, -hh * 0.08),
      m.makeTree('pine', 31, hw * 0.55, -hh * 0.92),
      m.makeTree('wild', 5, hw * 0.85, -hh * 0.42),
    ];
  }

  // ------------------------------------------------------ the campfire
  // The renderer's own campfire painter (static-item switch), adapted:
  // stone ring, crossed charred logs, pulsing coals, two flat licks,
  // spiralling embers, one smoke wisp.
  function drawCampfire(t: number, flicker: number): void {
    const p = wts(fireX, fireY);
    const s = S;
    ctx.fillStyle = `rgba(232, 122, 51, ${0.08 * flicker})`;
    ctx.beginPath();
    facetCircle(ctx, p.x, p.y + s * 0.08, s * 0.52, 8, 0.3, 0.55);
    ctx.fill();
    ctx.fillStyle = '#6e6879';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      facetCircle(ctx, p.x + Math.cos(a) * s * 0.3, p.y + Math.sin(a) * s * 0.2 + s * 0.08, s * 0.07, 5, a, 0.72);
      ctx.fill();
    }
    for (const rot of [-0.5, 0.6]) {
      ctx.save();
      ctx.translate(p.x, p.y + s * 0.06);
      ctx.rotate(rot);
      ctx.fillStyle = '#6b4a26';
      ctx.beginPath();
      chamferRect(ctx, -s * 0.22, -s * 0.045, s * 0.44, s * 0.09, s * 0.03);
      ctx.fill();
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(-s * 0.1, -s * 0.045, s * 0.2, s * 0.09);
      ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      const pulse = 0.45 + Math.sin(t * 3.2 + i * 2.1) * 0.45;
      ctx.fillStyle = `rgba(240, 130, 50, ${Math.min(1, 0.35 + pulse * 0.5)})`;
      ctx.beginPath();
      facetCircle(ctx, p.x + (i - 1) * s * 0.09, p.y + s * 0.05, s * 0.05, 5, i * 1.3, 0.6);
      ctx.fill();
    }
    ctx.fillStyle = '#e8823d';
    ctx.beginPath();
    ctx.moveTo(p.x - s * 0.14 * flicker, p.y + s * 0.04);
    ctx.quadraticCurveTo(p.x - s * 0.1, p.y - s * 0.3 * flicker, p.x, p.y - s * 0.42 * flicker);
    ctx.quadraticCurveTo(p.x + s * 0.12, p.y - s * 0.26 * flicker, p.x + s * 0.14 * flicker, p.y + s * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(p.x - s * 0.07 * flicker, p.y + s * 0.03);
    ctx.quadraticCurveTo(p.x, p.y - s * 0.18 * flicker, p.x + s * 0.02, p.y - s * 0.22 * flicker);
    ctx.quadraticCurveTo(p.x + s * 0.07, p.y - s * 0.1, p.x + s * 0.07 * flicker, p.y + s * 0.03);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 2; i++) {
      const ph = (t * (0.55 + i * 0.21) + i * 0.5) % 1;
      ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ph) * 0.75})`;
      ctx.fillRect(
        p.x + Math.sin(t * 2.4 + i * 3) * s * 0.08,
        p.y - s * 0.2 - ph * s * 0.42,
        s * 0.025,
        s * 0.025,
      );
    }
    const sp = (t * 0.3) % 1;
    ctx.fillStyle = `rgba(146, 140, 152, ${(1 - sp) * 0.22})`;
    ctx.beginPath();
    facetCircle(ctx, p.x + Math.sin(t * 1.1) * s * 0.06, p.y - s * 0.5 - sp * s * 0.5, s * (0.06 + sp * 0.1), 6, sp * 2, 0.8);
    ctx.fill();
  }

  // ------------------------------------------------------ the film pass
  // drawGrade, verbatim from the renderer: horizon haze, warm-top /
  // cool-bottom soft-light wash, and the vignette that closes in after
  // dark. This pass is most of what makes the frame read as Arx.
  function drawGrade(day: ReturnType<typeof daylightAt>): void {
    const [hr, hg, hb] = day.sky;
    const ha = day.skyAlpha;
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.34);
    sky.addColorStop(0, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, ${ha})`);
    sky.addColorStop(0.5, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, ${ha * 0.38})`);
    sky.addColorStop(1, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, 0)`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.34);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const warm = 0.36 * (0.2 + 0.8 * day.sun);
    const cool = 0.3 + 0.18 * day.darkness;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(255, 214, 150, ${warm})`);
    grad.addColorStop(0.45, `rgba(255, 236, 210, ${warm * 0.28})`);
    grad.addColorStop(1, `rgba(64, 84, 148, ${cool})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const vig = ctx.createRadialGradient(
      w / 2,
      h * 0.46,
      Math.min(w, h) * 0.42,
      w / 2,
      h * 0.5,
      Math.max(w, h) * 0.72,
    );
    vig.addColorStop(0, 'rgba(20, 12, 28, 0)');
    vig.addColorStop(1, `rgba(20, 12, 28, ${0.26 + 0.14 * day.darkness})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  // The night pass: the game's lightmap, reduced to its essentials —
  // fill the hour's ambient, screen the fire's warm pool into it, then
  // multiply the whole thing over the frame. DAYLIGHT IS FREE: at full
  // sun the ambient is white and the pass is skipped.
  function drawNight(day: ReturnType<typeof daylightAt>, flicker: number): void {
    const [ar, ag, ab] = day.ambient;
    if (ar > 251 && ag > 251 && ab > 251) return;
    const lw = Math.max(64, Math.round(w / 3));
    const lh = Math.max(64, Math.round(h / 3));
    if (!lightLayer) lightLayer = document.createElement('canvas');
    if (lightLayer.width !== lw || lightLayer.height !== lh) {
      lightLayer.width = lw;
      lightLayer.height = lh;
    }
    const l = lightLayer.getContext('2d')!;
    l.globalCompositeOperation = 'source-over';
    l.fillStyle = `rgb(${ar | 0}, ${ag | 0}, ${ab | 0})`;
    l.fillRect(0, 0, lw, lh);
    const p = wts(fireX, fireY);
    const r = ((4.6 * S) / w) * lw * (0.92 + 0.08 * flicker) * (0.3 + 0.7 * day.flame);
    l.globalCompositeOperation = 'screen';
    l.globalAlpha = 0.92;
    l.drawImage(
      radialGlowSprite('255, 182, 104', GLOW_STOPS, 0.08),
      (p.x / w) * lw - r,
      (p.y / h) * lh - r,
      r * 2,
      r * 2,
    );
    l.globalAlpha = 1;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightLayer, 0, 0, lw, lh, 0, 0, w, h);
    ctx.restore();
  }

  function drawGlows(day: ReturnType<typeof daylightAt>, flicker: number): void {
    const p = wts(fireX, fireY);
    glows.push({
      x: p.x,
      y: p.y - S * 0.2,
      r: S * 2.1 * (0.94 + 0.06 * flicker),
      rgb: '240, 132, 48',
      a: 0.34 * flicker * (0.3 + 0.7 * day.flame),
    });
    if (glows.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of glows) {
      ctx.globalAlpha = Math.min(1, g.a);
      ctx.drawImage(radialGlowSprite(g.rgb, GLOW_STOPS, 0.08), g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
    }
    ctx.restore();
    glows.length = 0;
  }

  // --------------------------------------------------------- the frame
  let raf = 0;
  let running = false;
  let destroyed = false;
  let lastNow = 0;
  let simT = 0;
  let fireflyT = 0;
  let lastLabel = '';
  const noop = (): void => {};

  function frame(now: number): void {
    if (!running || destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    simT += dt;
    step(now, dt);
  }

  function step(now: number, dt: number): void {
    const hours =
      HOUR_PIN !== null ? HOUR_PIN : (START_HOURS + (simT / DAY_SECONDS) * 24) % 24;
    const day = daylightAt(hours);
    const t = now / 1000;
    // The bonfire law: a slow breathing roar under the hard flicker.
    const roar = 0.9 + Math.sin(t * 1.1) * 0.08;
    const flicker = (0.85 + Math.sin(t * 9) * 0.1 + Math.sin(t * 21) * 0.05) * roar;

    const label = clockLabel(hours);
    if (label !== lastLabel) {
      lastLabel = label;
      opts.onClock?.(label, hours);
    }

    // -- simulate ----------------------------------------------------
    if (plume) plume.age = Math.min(plume.age, plume.attack + 0.05);
    else plume = fire.deployments['plume']!(mctx, fireX, fireY - 0.12, { scale: 0.95, dur: 8 }) ?? null;

    for (const wk of walkers) {
      if (!wk.fig) continue;
      const dx = wk.east ? wk.speed * dt : -wk.speed * dt;
      wk.wx += dx;
      const target = pathY(wk.wx) + wk.off;
      const vy = (target - wk.wy) * 2.4;
      wk.wy += vy * dt;
      wk.dir = Math.atan2(vy * 0.55, wk.east ? wk.speed : -wk.speed);
      if (wk.east && wk.wx > hw + 2.5) {
        wk.wx = -hw - 2.5 - Math.random() * 4;
        wk.wy = pathY(wk.wx) + wk.off;
      } else if (!wk.east && wk.wx < -hw - 2.5) {
        wk.wx = hw + 2.5 + Math.random() * 4;
        wk.wy = pathY(wk.wx) + wk.off;
      }
    }

    // Fireflies rise once the flame clock does.
    if (day.flame > 0.55) {
      fireflyT -= dt;
      if (fireflyT <= 0) {
        fireflyT = 0.35 + Math.random() * 0.5;
        const fx = (Math.random() * 2 - 1) * hw * 0.9;
        const fy = Math.random() * hh * 0.85;
        particles.burst(fx, fy, 1, ['#d8e8a0', '#c8e87a'], {
          shape: 'mote',
          speed: 0.05,
          life: 3.5 + Math.random() * 2,
          gravity: 0,
          size: 0.03,
          vz: 0.14,
          zg: -0.02,
          z: 0.2 + Math.random() * 0.6,
          wobble: 0.5,
          flicker: 0.75,
          layer: 'overlay',
          shadow: 0,
        });
      }
    }
    particles.update(dt);

    // -- paint -------------------------------------------------------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (groundBake) ctx.drawImage(groundBake, 0, 0, w, h);

    const disturbers: Disturber[] = [];
    walkers.forEach((wk, i) => {
      if (wk.fig) disturbers.push({ id: i + 1, x: wk.wx, y: wk.wy, r: 0.55 });
    });
    const bounds = {
      minTx: Math.floor(-hw) - 1,
      maxTx: Math.ceil(hw) + 1,
      minTy: Math.floor(-hh) - 1,
      maxTy: Math.ceil(hh) + 1,
    };
    grass.beginFrame(now, dt, disturbers, groundAt, noop, 0, 0);
    grass.drawUnder(ctx, groundAt, detailAt, bounds, wts, S);

    // The y-sorted world pass: trees, fire, figures, world particles.
    const items: SortItem[] = [];
    const tSec = t;
    if (figuresMod) {
      const m = figuresMod;
      for (const tree of trees) {
        items.push({ y: tree.wy, draw: () => m.drawTree(ctx, tree, wts, S, YS, tSec) });
      }
      for (const wk of walkers) {
        if (!wk.fig) continue;
        const fig = wk.fig;
        const wwx = wk.wx;
        const wwy = wk.wy;
        const wdir = wk.dir;
        items.push({
          y: wwy,
          draw: () => m.drawFigure(ctx, fig, wwx, wwy, wdir, true, now, dt, wts, S, YS, day.shadowAlpha + 0.12),
        });
      }
      if (keeper.fig) {
        const fig = keeper.fig;
        items.push({
          y: keeper.wy,
          draw: () =>
            m.drawFigure(ctx, fig, keeper.wx, keeper.wy, 0.35, false, now, dt, wts, S, YS, day.shadowAlpha + 0.12),
        });
      }
    }
    items.push({ y: fireY + 0.7, draw: () => drawCampfire(t, flicker) });
    const pool = particles.livePool();
    for (let i = 0; i < pool.length; i++) {
      const p: Particle = pool[i]!;
      if (p.layer !== LAYER_OVERLAY) {
        items.push({ y: p.y, draw: () => particles.drawOne(ctx, p, wts, S) });
      }
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    particles.draw(ctx, wts, S);
    drawNight(day, flicker);
    drawGlows(day, flicker);
    drawGrade(day);
  }

  // -------------------------------------------------------- lifecycle
  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    // The tile ruler breathes with the viewport: close enough to read
    // the bodies, wide enough to hold the whole clearing.
    S = Math.max(46, Math.min(84, w / 17));
    hw = w / (2 * S);
    hh = h / (2 * S * YS);
    fireX = Math.min(3.4, hw - 2.1);
    layoutTrees();
    bakeGround();
    if (opts.reduced) paintStill();
  }

  /** Reduced motion: prime the fire, paint one dusk frame, stand down. */
  function paintStill(): void {
    simT = ((19.7 - START_HOURS + 24) % 24) * (DAY_SECONDS / 24);
    plume = fire.deployments['plume']!(mctx, fireX, fireY - 0.12, { scale: 0.95, dur: 8 }) ?? null;
    for (let i = 0; i < 70; i++) {
      if (plume) plume.age = Math.min(plume.age, plume.attack + 0.05);
      particles.update(1 / 30);
    }
    step(performance.now(), 1 / 60);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  if (opts.reduced) {
    // One more still once the travelers and trees arrive.
    void import('./figures.js').then(() => setTimeout(() => paintStill(), 60));
  }

  return {
    setRunning(run: boolean): void {
      if (destroyed || opts.reduced) return;
      if (run && !running) {
        running = true;
        lastNow = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    },
    destroy(): void {
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}
