/**
 * THE SIGNATURE MAY NOT KILL THE FRAME.
 *
 * Every ability signature paints straight onto the frame's own 2D
 * context, inside drawGroundFx / drawCombatFx. Those passes run AFTER
 * the terrain and grass and BEFORE the y-sorted world and the exposure
 * multiply, and main.ts schedules the next rAF first precisely so a
 * throw here cannot kill the loop. The cost of that resilience is that
 * a throwing signature is SILENT: the frame simply stops mid-way, and
 * the player sees bare ground under a daylight sky while the effect
 * lives, with no crash and no log they would ever look at.
 *
 * The canvas 2D API has exactly three ways to throw from the drawing
 * verbs a signature is allowed to use, and all three are a negative
 * radius. This replays every registered signature across its whole
 * life, every wire kind that can carry it, and both the travelling and
 * the self-cast geometries, through a context that enforces the spec's
 * throwing conditions — so an unclamped ramp is caught at the bench
 * instead of in a night fight.
 *
 * It also pins save/restore balance: a hook that throws (or simply
 * returns) with a save outstanding leaks clip and alpha state into the
 * rest of the frame.
 *
 * The window that shipped was ~1.5 ms of a 900 ms life, which is why
 * the sampling here is dense. Do not thin it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIGNATURES, type SigCtx } from './fxSignatures.js';
import { FX_STYLES } from './abilityFx.js';
import { Particles } from './particles.js';

/** A 2D context that throws where the WHATWG spec says a real one
 *  throws, and is inert everywhere else. Non-finite arguments are NOT
 *  errors per spec (the call is ignored), so they are not modelled as
 *  throws — only the negative radii are. */
class SpecCtx {
  private alpha = 1;
  private width = 1;
  depth = 0;
  fillStyle: unknown = '#000';
  strokeStyle: unknown = '#000';
  lineCap = 'butt';
  lineJoin = 'miter';
  lineDashOffset = 0;
  globalCompositeOperation = 'source-over';
  font = '10px sans-serif';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  imageSmoothingEnabled = true;
  filter = 'none';
  shadowBlur = 0;
  shadowColor = 'transparent';
  canvas = { width: 1280, height: 720 };
  get globalAlpha(): number { return this.alpha; }
  set globalAlpha(v: number) { if (Number.isFinite(v) && v >= 0 && v <= 1) this.alpha = v; }
  get lineWidth(): number { return this.width; }
  set lineWidth(v: number) { if (Number.isFinite(v) && v > 0) this.width = v; }
  save(): void { this.depth++; }
  restore(): void { this.depth--; }
  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  bezierCurveTo(): void {}
  rect(): void {}
  fill(): void {}
  stroke(): void {}
  clip(): void {}
  fillRect(): void {}
  strokeRect(): void {}
  clearRect(): void {}
  fillText(): void {}
  strokeText(): void {}
  measureText(): { width: number } { return { width: 10 }; }
  translate(): void {}
  rotate(): void {}
  scale(): void {}
  transform(): void {}
  setTransform(): void {}
  resetTransform(): void {}
  setLineDash(): void {}
  getLineDash(): number[] { return []; }
  drawImage(): void {}
  arc(_x: number, _y: number, r: number): void {
    if (Number.isFinite(r) && r < 0) throw new Error(`IndexSizeError: arc radius ${r}`);
  }
  arcTo(_a: number, _b: number, _c: number, _d: number, r: number): void {
    if (Number.isFinite(r) && r < 0) throw new Error(`IndexSizeError: arcTo radius ${r}`);
  }
  ellipse(_x: number, _y: number, rx: number, ry: number): void {
    if (Number.isFinite(rx) && rx < 0) throw new Error(`IndexSizeError: ellipse radiusX ${rx}`);
    if (Number.isFinite(ry) && ry < 0) throw new Error(`IndexSizeError: ellipse radiusY ${ry}`);
  }
  roundRect(_x: number, _y: number, _w: number, _h: number, r?: number): void {
    if (typeof r === 'number' && Number.isFinite(r) && r < 0) {
      throw new Error(`RangeError: roundRect radius ${r}`);
    }
  }
  createLinearGradient(): unknown { return { addColorStop(): void {} }; }
  createRadialGradient(
    _a: number, _b: number, r0: number, _c: number, _d: number, r1: number,
  ): unknown {
    if (r0 < 0 || r1 < 0) throw new Error(`IndexSizeError: radial radius ${r0}/${r1}`);
    return {
      addColorStop(o: number) {
        if (!(o >= 0 && o <= 1)) throw new Error(`IndexSizeError: addColorStop offset ${o}`);
      },
    };
  }
  createPattern(): unknown { return null; }
}

/** Every wire kind that can carry an ability's signature. */
const KINDS = [
  'nova', 'blast', 'arc', 'dash', 'bolt', 'beam', 'warp', 'buff',
  'summon', 'field', 'reaction', 'proc', 'vanish', 'telegraph',
  'becalm', 'command', 'howl', 'charge', 'note',
];

/** Self-cast (the far end IS the heart — a nova, a buff) and travelling. */
const GEOM = [
  { dx: 0, dy: 0, label: 'self' },
  { dx: 4, dy: 2.5, label: 'travel' },
];

const LIFE_MS = 900;
const STEPS = 1200;
const SC = 48;
const SQUASH = 0.62; // Renderer.FX_SQUASH

test('no signature throws across its whole life, on any wire kind', () => {
  const mock = new SpecCtx();
  const ctx = mock as unknown as CanvasRenderingContext2D;
  const particles = new Particles(() => 0.5);
  const throws: string[] = [];
  const leaks: string[] = [];

  for (const [id, sig] of Object.entries(SIGNATURES)) {
    const st = FX_STYLES[id];
    if (!st) continue; // the orphan-key contract is fxSignatures.test.ts's
    for (const kind of KINDS) {
      for (const g of GEOM) {
        let spawned = false;
        for (let i = 0; i <= STEPS; i++) {
          const t = i / STEPS;
          const c: SigCtx = {
            ctx, st, kind, t,
            age: t * LIFE_MS,
            now: 1_000_000 + t * LIFE_MS,
            seed: 0x51ee,
            sc: SC, squash: SQUASH, frameDt: 1 / 60,
            wx: 100, wy: 200, px: 640, py: 360,
            wx2: 100 + g.dx, wy2: 200 + g.dy,
            px2: 640 + g.dx * SC, py2: 360 + g.dy * SC * SQUASH,
            radius: 2.6, rPx: 2.6 * SC, dir: 0.8,
            ticks: 48,
            particles,
            glow: () => {},
          };
          const run = (hook: string, fn?: (c: SigCtx) => void): void => {
            if (!fn) return;
            const key = `${id}.${hook}`;
            mock.depth = 0;
            try {
              fn(c);
            } catch (err) {
              const line = `${key} [kind=${kind} ${g.label} t=${t.toFixed(4)}] ${(err as Error).message}`;
              if (!throws.some((f) => f.startsWith(`${key} `))) throws.push(line);
            }
            if (mock.depth !== 0 && !leaks.some((f) => f.startsWith(`${key} `))) {
              leaks.push(`${key} [kind=${kind} ${g.label} t=${t.toFixed(4)}] depth=${mock.depth}`);
            }
          };
          if (!spawned) {
            spawned = true;
            run('spawn', sig.spawn);
          }
          run('ground', sig.ground);
          run('air', sig.air);
        }
      }
    }
  }

  assert.deepEqual(
    throws, [],
    `signature hooks threw — each one blanks the world pass and the exposure ` +
      `multiply for every frame the effect lives:\n  ${throws.join('\n  ')}`,
  );
  assert.deepEqual(
    leaks, [],
    `signature hooks left ctx.save() outstanding — clip and alpha leak into ` +
      `the rest of the frame:\n  ${leaks.join('\n  ')}`,
  );
});
