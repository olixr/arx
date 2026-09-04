import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { COLD_HEARTH_PROPS } from './coldHearth.js';
import { EMBER_BED_PROPS } from './emberBed.js';
import { SCAR_EMBER } from '../palette.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE COLD HEARTH's laws, pinned without a browser: the four painters
// speak only fills (no strokes — THE ONE RING inks the silhouette), no
// transforms (parity: the GL stage draws quads, never a rotated ctx),
// every fillRect ≥0.03s (BLOCK LAW's minimum feature), no ember ink
// (warmth is EmberBed's light row, never paint), and each casts its
// shadow per frame through the host (SHADOWS NEVER BAKE).

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
  ellipse(_x: number, _y: number, rx: number, ry: number): void {
    assert.ok(rx >= 0 && ry >= 0, 'ellipse radii must be non-negative');
    this.calls.push('ellipse');
  }
  fill(): void { this.calls.push('fill'); this.fills.push(String(this.fillStyle)); }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push('fillRect');
    this.fills.push(String(this.fillStyle));
    this.rects.push({ x, y, w, h });
  }
  stroke(): void { this.calls.push('stroke'); }
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
  } as unknown as PropHost;
  const p = { x: 500, y: 400 };
  const env: PropFrame = {
    tile: Tile.CharredBeam,
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

function painterFor(tile: Tile): PropPainter {
  const row = COLD_HEARTH_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no cold-hearth painter for ${Tile[tile]}`);
  return row[1];
}

const FOUR = [Tile.CharredBeam, Tile.CollapsedRoof, Tile.AshHeap, Tile.ChimneyStack] as const;
const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555] as const;

/** Mint and paint one item (draw is optional on DrawItem; here it never is). */
function paint(tile: Tile, host: PropHost, env: PropFrame): ReturnType<PropPainter> {
  const item = painterFor(tile)(host, { ...env, tile });
  assert.ok(item.draw, `${Tile[tile]} minted no draw`);
  item.draw();
  return item;
}

test('the cold hearth speaks only fills: no strokes, no transforms', () => {
  for (const tile of FOUR) {
    for (const h of SEEDS) {
      const { host, env, ctx } = rig(h);
      paint(tile, host, env);
      for (const bad of ['stroke', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform']) {
        assert.ok(!ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.ok(ctx.calls.includes('fill') || ctx.calls.includes('fillRect'), `${Tile[tile]} painted nothing`);
    }
  }
});

test('BLOCK LAW: every fillRect is at least 0.03s on both sides', () => {
  const min = 0.03 * S - 1e-6;
  for (const tile of FOUR) {
    for (const h of SEEDS) {
      const { host, env, ctx } = rig(h);
      paint(tile, host, env);
      for (const r of ctx.rects) {
        assert.ok(r.w >= min && r.h >= min, `${Tile[tile]} h=${h} rect ${r.w.toFixed(2)}×${r.h.toFixed(2)} under 0.03s`);
      }
    }
  }
});

test('warmth is a light row, never paint: no ember ink in the family', () => {
  for (const tile of FOUR) {
    const { host, env, ctx } = rig(SEEDS[0]);
    paint(tile, host, env);
    assert.ok(!ctx.fills.includes(SCAR_EMBER), `${Tile[tile]} painted SCAR_EMBER`);
    for (const f of ctx.fills) assert.ok(!/^#e|^#f/i.test(f) || f === '#bcb9be', `${Tile[tile]} painted a hot ink ${f}`);
  }
});

test('EmberBed by day is a COLD hearth: every fill is low-chroma (the light row is the only warmth)', () => {
  // The K1 gate: embers visible only at night. A darkened SCAR_EMBER
  // keeps its full chroma (shade() steps every channel alike), so the
  // prefix test above would pass a saturated orange coal; the honest
  // pin is chroma — max(r,g,b)−min(r,g,b) under 40 on every fill the
  // bed paints, at every seed.
  const row = EMBER_BED_PROPS.find(([tiles]) => tiles.includes(Tile.EmberBed));
  assert.ok(row, 'no ember bed painter');
  const chroma = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    const r = n >> 16;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  for (const h of SEEDS) {
    const { host, env, ctx } = rig(h);
    const item = row[1](host, { ...env, tile: Tile.EmberBed });
    assert.ok(item.draw, 'the bed minted no draw');
    item.draw();
    assert.ok(ctx.fills.length > 0, 'the bed painted nothing');
    for (const f of ctx.fills) {
      assert.ok(/^#[0-9a-f]{6}$/i.test(f), `the bed paints hex inks only (${f})`);
      assert.ok(chroma(f) < 40, `the bed painted a warm ink by day: ${f} (chroma ${chroma(f)})`);
    }
    for (const bad of ['stroke', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform']) {
      assert.ok(!ctx.calls.includes(bad), `EmberBed h=${h} called ${bad}`);
    }
    const min = 0.03 * S - 1e-6;
    for (const r of ctx.rects) assert.ok(r.w >= min && r.h >= min, `EmberBed h=${h} rect under 0.03s`);
  }
});

test('SHADOWS NEVER BAKE: each piece casts per frame through the host', () => {
  // The chimney is two prisms (hearth block + shaft): two edge casts.
  const want: Record<number, string[]> = {
    [Tile.CharredBeam]: ['edge'],
    [Tile.CollapsedRoof]: ['blob'],
    [Tile.AshHeap]: ['contact'],
    [Tile.ChimneyStack]: ['edge', 'edge'],
  };
  for (const tile of FOUR) {
    const { host, env, casts } = rig(SEEDS[1]);
    const item = painterFor(tile)(host, { ...env, tile });
    assert.ok(item.drawShadow, `${Tile[tile]} has no drawShadow`);
    item.drawShadow();
    assert.deepEqual(casts, want[tile], `${Tile[tile]} cast ${casts.join(',')}`);
  }
});

test('BODY-RULER: bodies measure the painted extent against the 1.15s rig', () => {
  const { host, env } = rig(SEEDS[2]);
  const beam = painterFor(Tile.CharredBeam)(host, env);
  const roof = painterFor(Tile.CollapsedRoof)(host, { ...env, tile: Tile.CollapsedRoof });
  const ash = painterFor(Tile.AshHeap)(host, { ...env, tile: Tile.AshHeap });
  const chimney = painterFor(Tile.ChimneyStack)(host, { ...env, tile: Tile.ChimneyStack });
  // The beam lies: its body tops out under the rig's waist.
  assert.ok(beam.body!.y > env.p.y - 1.15 * S * 0.6);
  // The heap is walkable: the lowest sort of the four, under the rig.
  assert.ok(ash.sortY < beam.sortY && ash.sortY < roof.sortY && ash.sortY < chimney.sortY);
  assert.ok(ash.body!.y > env.p.y - 0.5 * S);
  // The chimney is 2.4 bodies: its box reaches past 2.76s over the foot.
  assert.ok(chimney.body!.y <= env.p.y - 2.76 * S, 'chimney body must cover 2.4 rigs');
  assert.ok(chimney.body!.y > env.p.y - 3.6 * S, 'chimney body must not balloon');
  // The dome stands under the rig's shoulder.
  assert.ok(roof.body!.y <= env.p.y - 0.84 * S && roof.body!.y > env.p.y - 1.4 * S);
});

test('hash deals postures: one seed paints the same, the seed set paints more than one', () => {
  for (const tile of FOUR) {
    const sigs = new Set<string>();
    for (const h of SEEDS) {
      const a = rig(h);
      const b = rig(h);
      paint(tile, a.host, a.env);
      paint(tile, b.host, b.env);
      assert.deepEqual(a.ctx.rects, b.ctx.rects, `${Tile[tile]} h=${h} not deterministic`);
      sigs.add(JSON.stringify(a.ctx.rects));
    }
    assert.ok(sigs.size > 1, `${Tile[tile]} ignores its hash across ${SEEDS.length} seeds`);
  }
});
