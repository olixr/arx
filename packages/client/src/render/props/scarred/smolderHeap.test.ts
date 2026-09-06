import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { DOME_H, FOOT_DY, SMOLDER_HEAP_PROPS } from './smolderHeap.js';
import { SCAR_EMBER } from '../palette.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE CLAMP's laws (band 8, SmolderHeap 548), pinned without a
// browser: the painter speaks only fills (no strokes — THE ONE RING
// inks the silhouette), no transforms (parity: the GL stage draws
// quads, never a rotated ctx), every fillRect ≥ 0.03s (BLOCK LAW's
// minimum feature), every ink cold by day (chroma under 40: the
// coals at the vents are dry clinkers until the lights.ts row warms
// them), one blob shadow cast per frame through the host (SHADOWS
// NEVER BAKE), and the two rig numbers the renderer's exhale and the
// light row read (DOME_H 0.62 over a foot 0.2 south of centre) held
// where they were argued.

const S = 64;
const YS = 0.72;

class RecCtx {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  globalAlpha = 1;
  calls: string[] = [];
  fills: string[] = [];
  rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  beginPath(): void { this.calls.push('beginPath'); }
  closePath(): void { this.calls.push('closePath'); }
  moveTo(): void { this.calls.push('moveTo'); }
  lineTo(): void { this.calls.push('lineTo'); }
  quadraticCurveTo(): void { this.calls.push('quadraticCurveTo'); }
  ellipse(): void { this.calls.push('ellipse'); }
  fill(): void { this.calls.push('fill'); this.fills.push(String(this.fillStyle)); }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push('fillRect');
    this.fills.push(String(this.fillStyle));
    this.rects.push({ x, y, w, h });
  }
  stroke(): void { this.calls.push('stroke'); }
  strokeRect(): void { this.calls.push('strokeRect'); }
  save(): void { this.calls.push('save'); }
  restore(): void { this.calls.push('restore'); }
  translate(): void { this.calls.push('translate'); }
  rotate(): void { this.calls.push('rotate'); }
  scale(): void { this.calls.push('scale'); }
  setTransform(): void { this.calls.push('setTransform'); }
}

function rig(h: number): { host: PropHost; env: PropFrame; ctx: RecCtx; casts: string[] } {
  const ctx = new RecCtx();
  const casts: string[] = [];
  const host = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    camera: { yScale: YS },
    castEdgeQuad: () => { casts.push('edge'); },
    castBlob: () => { casts.push('blob'); },
    castContact: () => { casts.push('contact'); },
    queueGlow: () => { casts.push('glow'); },
  } as unknown as PropHost;
  const p = { x: 500, y: 400 };
  const env: PropFrame = {
    tile: Tile.SmolderHeap,
    tx: 10,
    ty: 12,
    game: {} as PropFrame['game'],
    ctx: ctx as unknown as CanvasRenderingContext2D,
    p,
    s: S,
    h,
    t: 0,
    poleDye: null,
    stationBody: (hw = 1.15, up = 2.2, down = 0.8) => ({
      x: p.x - hw * S,
      y: p.y - up * S,
      w: hw * 2 * S,
      h: (up + down) * S,
    }),
  };
  return { host, env, ctx, casts };
}

const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0xa5a5a5a5 | 0] as const;

const painter = (): PropPainter => {
  const row = SMOLDER_HEAP_PROPS.find(([tiles]) => tiles.includes(Tile.SmolderHeap));
  assert.ok(row, 'no clamp painter');
  return row[1];
};

const chroma = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return Math.max(r, g, b) - Math.min(r, g, b);
};

test('THE CLAMP: the hall row is exactly the one tile', () => {
  assert.equal(SMOLDER_HEAP_PROPS.length, 1);
  assert.deepEqual([...SMOLDER_HEAP_PROPS[0]![0]], [Tile.SmolderHeap]);
  assert.equal(Tile.SmolderHeap, 548);
});

test('THE CLAMP speaks only fills: no strokes, no transforms, no glow of its own', () => {
  for (const h of SEEDS) {
    const { host, env, ctx, casts } = rig(h);
    const item = painter()(host, env);
    assert.ok(item.draw, `h=${h} minted no draw`);
    item.draw();
    for (const bad of ['stroke', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'ellipse']) {
      assert.ok(!ctx.calls.includes(bad), `h=${h} called ${bad}`);
    }
    assert.ok(ctx.calls.includes('fill') && ctx.calls.includes('fillRect'), `h=${h} painted nothing`);
    // THE LIGHT IS CONTENT: the row in lights.ts is the warmth, the
    // renderer's scan is the smoke; the painter queues no glow.
    assert.ok(!casts.includes('glow'), `h=${h} queued a glow`);
  }
});

test('BLOCK LAW: every fillRect is at least 0.03s on both sides', () => {
  const min = 0.03 * S - 1e-6;
  for (const h of SEEDS) {
    const { host, env, ctx } = rig(h);
    painter()(host, env).draw!();
    for (const r of ctx.rects) {
      assert.ok(r.w >= min && r.h >= min, `h=${h} rect ${r.w.toFixed(2)}×${r.h.toFixed(2)} under 0.03s`);
    }
  }
});

test('COLD BY DAY: every ink the clamp paints is low-chroma; the ember ink never appears', () => {
  // The K1 gate carried to the clamp: coals visible only at night.
  // A darkened SCAR_EMBER keeps its chroma (shade() steps every
  // channel alike), so the honest pin is chroma — under 40 on every
  // fill, at every seed.
  for (const h of SEEDS) {
    const { host, env, ctx } = rig(h);
    painter()(host, env).draw!();
    assert.ok(ctx.fills.length > 0, 'the clamp painted nothing');
    assert.ok(!ctx.fills.includes(SCAR_EMBER), `h=${h} painted SCAR_EMBER`);
    for (const f of ctx.fills) {
      assert.ok(/^#[0-9a-f]{6}$/i.test(f), `the clamp paints hex inks only (${f})`);
      assert.ok(chroma(f) < 40, `h=${h} painted a warm ink by day: ${f} (chroma ${chroma(f)})`);
    }
  }
});

test('SHADOWS NEVER BAKE: a dome throws one blob per frame through the host', () => {
  for (const h of SEEDS) {
    const { host, env, casts } = rig(h);
    const item = painter()(host, env);
    assert.ok(item.drawShadow, 'the clamp has no drawShadow');
    item.drawShadow();
    assert.deepEqual(casts, ['blob'], `h=${h} cast ${casts.join(',')}`);
  }
});

test('BODY-RULER: the dome crests 0.62s over a foot 0.2 south of centre, waist-high beside the 1.15s rig', () => {
  // The two numbers the renderer's exhale birth point (ty + 0.08 =
  // 0.5 − 0.42 north of centre, from the crown over the foot) and
  // the light row's air 0.35 (the flank vents at mid-height) were
  // argued from. Move them here and there together, or not at all.
  assert.equal(DOME_H, 0.62);
  assert.equal(FOOT_DY, 0.2);
  const { host, env } = rig(SEEDS[2]);
  const item = painter()(host, env);
  const footY = env.p.y + S * YS * FOOT_DY;
  const crestY = footY - S * DOME_H;
  assert.ok(item.body, 'the clamp has no body');
  // The box covers the crest with a small margin and never balloons
  // past the rig's shoulder (0.84s over the tile centre).
  assert.ok(item.body.y <= crestY, 'the body must cover the crest');
  assert.ok(item.body.y > env.p.y - 0.84 * S, 'the body must not reach the rig\'s shoulder');
  // The box covers the apron's south rim (0.31s under the foot).
  assert.ok(item.body.y + item.body.h >= footY + 0.3 * S, 'the body must cover the apron');
  // A solid mound sorts by its foot, south of the tile centre.
  assert.ok(item.sortY > env.ty + 0.5 && item.sortY < env.ty + 1);
});

test('THE DEAL: seeds change the clamp (vents, sods, the billets\' side) but every seed obeys the same laws', () => {
  const rectCounts = new Set<number>();
  for (const h of SEEDS) {
    const { host, env, ctx } = rig(h);
    painter()(host, env).draw!();
    rectCounts.add(ctx.rects.length);
  }
  assert.ok(rectCounts.size > 1, 'the hash deals nothing: every seed paints the same clamp');
});
