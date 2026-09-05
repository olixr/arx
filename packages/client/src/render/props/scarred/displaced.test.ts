import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Tile, tileEmitter } from '@arx/shared';
import { COPPER, DISPLACED_PROPS, LINEN, cartHeapCount, leanToFrame } from './displaced.js';
import { CMN_FLAME, CMN_FLAME_CORE, DGN_BONE, SCAR_EMBER } from '../palette.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE ROAD OF THE DISPLACED's laws, pinned without a browser (the
// marks.test pattern): the four painters speak only fills (THE ONE
// RING inks the silhouette), no transforms (parity: the GL stage draws
// quads, never a rotated ctx), every fillRect ≥0.03s (BLOCK LAW), the
// lean-to's hem samples ONE BREEZE once per draw and holds ≤0.05s in a
// gale while the three still pieces never read the clock, the family
// has no light rows and never glows, the lean-to opens SOUTH, the cart
// heaps 4..6 blocks, the cot's bandage is bone-white, and every piece
// casts its shadow per frame through the host (SHADOWS NEVER BAKE).

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
  /** Every vertex the painter placed (moveTo/lineTo/rect corners), in order. */
  verts: Array<[number, number]> = [];
  /** Every filled path's vertices (a quad is four; a ring is two rings' worth). */
  paths: Array<Array<[number, number]>> = [];
  private cur: Array<[number, number]> = [];
  beginPath(): void { this.calls.push('beginPath'); this.cur = []; }
  closePath(): void { this.calls.push('closePath'); }
  moveTo(x: number, y: number): void { this.calls.push('moveTo'); this.verts.push([x, y]); this.cur.push([x, y]); }
  lineTo(x: number, y: number): void { this.calls.push('lineTo'); this.verts.push([x, y]); this.cur.push([x, y]); }
  quadraticCurveTo(): void { this.calls.push('quadraticCurveTo'); }
  arc(): void { this.calls.push('arc'); }
  ellipse(x: number, y: number, rx: number, ry: number): void {
    assert.ok(rx >= 0 && ry >= 0, 'ellipse radii must be non-negative');
    this.calls.push('ellipse');
    this.verts.push([x, y]);
  }
  fill(rule?: string): void { this.calls.push(rule ? `fill:${rule}` : 'fill'); this.fills.push(String(this.fillStyle)); if (this.cur.length) this.paths.push(this.cur); this.cur = []; }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push('fillRect');
    this.fills.push(String(this.fillStyle));
    this.rects.push({ x, y, w, h });
    this.verts.push([x, y], [x + w, y + h]);
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

interface Rig {
  host: PropHost;
  env: PropFrame;
  ctx: RecCtx;
  casts: string[];
  breezeCalls: number;
  glows: number;
}

/**
 * The rig. `gale` is what breezeAt answers with (px, both beats): 0
 * is the still pose, a huge number is the storm the clamp must hold.
 */
function rig(h: number, tile: Tile, gale = 0): Rig {
  const ctx = new RecCtx();
  const casts: string[] = [];
  const r: Rig = { host: null as unknown as PropHost, env: null as unknown as PropFrame, ctx, casts, breezeCalls: 0, glows: 0 };
  r.host = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    camera: { yScale: YS },
    castEdgeQuad: () => { casts.push('edge'); },
    castBlob: () => { casts.push('blob'); },
    castContact: () => { casts.push('contact'); },
    breezeAt: () => { r.breezeCalls++; return { sway: gale, lag: gale, gust: 1 }; },
    queueGlow: () => { r.glows++; },
  } as unknown as PropHost;
  const p = { x: 500, y: 400 };
  r.env = {
    tile,
    tx: 10,
    ty: 12,
    game: {} as PropFrame['game'],
    ctx: ctx as unknown as CanvasRenderingContext2D,
    p,
    s: S,
    h,
    t: 3.7,
    poleDye: null,
    stationBody: (hw = 1.15, up = 2.2, down = 0.8) => ({
      x: p.x - hw * S,
      y: p.y - up * S,
      w: hw * 2 * S,
      h: (up + down) * S,
    }),
  };
  return r;
}

function painterFor(tile: Tile): PropPainter {
  const row = DISPLACED_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no displaced painter for ${Tile[tile]}`);
  return row[1];
}

const FOUR = [Tile.LeanTo, Tile.Bedroll, Tile.BelongingsCart, Tile.FieldCot] as const;
const STILL = [Tile.Bedroll, Tile.BelongingsCart, Tile.FieldCot] as const;
/** The lean-to's hem and its ONE BREEZE law, in tiles. */
const HEM_AMP = 0.05;
const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0x2a2a2a2a, 0x13579bdf] as const;

/** Paint with the clock forbidden: the still pieces read no time. */
function paintNoClock(fn: () => void): void {
  const orig = performance.now;
  performance.now = () => { throw new Error('a displaced painter read the clock'); };
  try { fn(); } finally { performance.now = orig; }
}

/** Mint and paint one item (draw is optional on DrawItem; here it never is). */
function paint(r: Rig): ReturnType<PropPainter> {
  const item = painterFor(r.env.tile)(r.host, r.env);
  assert.ok(item.draw, `${Tile[r.env.tile]} minted no draw`);
  item.drawShadow?.();
  const castsAfterShadow = r.casts.length;
  paintNoClock(() => item.draw!());
  assert.equal(r.casts.length, castsAfterShadow, `${Tile[r.env.tile]}: draw() casts no shadow`);
  return item;
}

test('the displaced speak only fills: no strokes, no transforms, no glow', () => {
  for (const tile of FOUR) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      for (const bad of ['stroke', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'arc', 'quadraticCurveTo']) {
        assert.ok(!r.ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.ok(r.ctx.calls.includes('fill') || r.ctx.calls.includes('fillRect'), `${Tile[tile]} painted nothing`);
      assert.equal(r.glows, 0, `${Tile[tile]} queued a glow`);
    }
  }
});

test('BLOCK LAW: every fillRect is at least 0.03s on both sides', () => {
  const min = 0.03 * S - 1e-6;
  for (const tile of FOUR) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      for (const rect of r.ctx.rects) {
        assert.ok(rect.w >= min && rect.h >= min, `${Tile[tile]} h=${h} rect ${rect.w.toFixed(2)}×${rect.h.toFixed(2)} under 0.03s`);
      }
    }
  }
});

test('BLOCK LAW: every quad (cord, shaft, leg, spoke, seam, strip) is at least 0.03s across', () => {
  // A beam quad's sides are its length and its width: the shortest
  // side IS the feature. Rings (two dozen vertices) are pinned by the
  // wheel test's radii; only four-corner paths are read here.
  const min = 0.03 * S - 1e-6;
  for (const tile of FOUR) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      let quads = 0;
      for (const path of r.ctx.paths) {
        if (path.length !== 4) continue;
        quads++;
        let shortest = Infinity;
        for (let i = 0; i < 4; i++) {
          const [ax, ay] = path[i]!;
          const [bx, by] = path[(i + 1) % 4]!;
          shortest = Math.min(shortest, Math.hypot(bx - ax, by - ay));
        }
        assert.ok(shortest >= min, `${Tile[tile]} h=${h} quad ${(shortest / S).toFixed(3)}s across, under 0.03s`);
      }
      // The bedroll is all rects; the other three carry diagonals.
      assert.ok(quads > 0 || tile === Tile.Bedroll, `${Tile[tile]} h=${h} placed no quads`);
    }
  }
});

test('the cart\'s wheels are evenodd rings, never stroked ellipses', () => {
  for (const h of SEEDS) {
    const r = rig(h, Tile.BelongingsCart);
    paint(r);
    const rings = r.ctx.calls.filter((c) => c === 'fill:evenodd').length;
    // Two wheels × (tire + felloe).
    assert.equal(rings, 4, `h=${h} cut ${rings} rings`);
    assert.ok(!r.ctx.calls.includes('ellipse') || r.ctx.calls.filter((c) => c === 'ellipse').length === 1, 'the only ellipse is the contact shade');
  }
  // Nobody else cuts rings.
  for (const tile of [Tile.LeanTo, Tile.Bedroll, Tile.FieldCot] as const) {
    const r = rig(SEEDS[0], tile);
    paint(r);
    assert.ok(!r.ctx.calls.includes('fill:evenodd'), `${Tile[tile]} cut a ring`);
  }
});

test('no warmth is painted: the family has no light rows, no flame ink, no ember ink', () => {
  for (const tile of FOUR) {
    assert.equal(tileEmitter(tile), undefined, `${Tile[tile]} has a light row it never asked for`);
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      for (const f of r.ctx.fills) {
        assert.notEqual(f, SCAR_EMBER, `${Tile[tile]} painted SCAR_EMBER`);
        assert.notEqual(f, CMN_FLAME, `${Tile[tile]} painted CMN_FLAME`);
        assert.notEqual(f, CMN_FLAME_CORE, `${Tile[tile]} painted CMN_FLAME_CORE`);
      }
    }
  }
});

test('ONE BREEZE: the lean-to\'s hem samples breezeAt once per draw; the three still pieces never read the clock', () => {
  for (const h of SEEDS) {
    const r = rig(h, Tile.LeanTo);
    paint(r);
    assert.equal(r.breezeCalls, 1, `LeanTo h=${h} sampled the breeze ${r.breezeCalls} times`);
  }
  for (const tile of STILL) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      assert.equal(r.breezeCalls, 0, `${Tile[tile]} read the clock`);
      // Still means still: the seconds clock changes nothing.
      const late = rig(h, tile);
      late.env = { ...late.env, t: 9001.5 };
      paint(late);
      assert.deepEqual(late.ctx.verts, r.ctx.verts, `${Tile[tile]} h=${h} moved with t`);
    }
  }
});

test('ONE BREEZE holds in a gale: no lean-to vertex leaves its still pose by more than 0.05s', () => {
  // breezeAt is mocked to answer a hurricane (±1e6 px on both beats);
  // the painter's clamp must bring every vertex back inside amp·s of
  // where it stands on a still day — both signs, every seed. This is
  // what lets the swing survive the ring-cache cadence.
  for (const h of SEEDS) {
    const still = rig(h, Tile.LeanTo, 0);
    paint(still);
    let moved = 0;
    for (const gale of [1e6, -1e6]) {
      const storm = rig(h, Tile.LeanTo, gale);
      paint(storm);
      assert.equal(storm.ctx.verts.length, still.ctx.verts.length, 'the lean-to changed shape in the gale');
      for (let i = 0; i < still.ctx.verts.length; i++) {
        const [ax, ay] = still.ctx.verts[i]!;
        const [bx, by] = storm.ctx.verts[i]!;
        const d = Math.hypot(bx - ax, by - ay);
        if (d > 1e-6) moved++;
        assert.ok(d <= HEM_AMP * S + 1e-6, `h=${h} vertex ${i} swung ${(d / S).toFixed(3)}s over the ${HEM_AMP}s law`);
      }
    }
    assert.ok(moved > 0, `h=${h} the hem does not breathe at all`);
    // Only the hem moves: the frame, the canvas, the rolls, the pot,
    // the cords and the stakes hold still (fewer than a tenth of the
    // vertices ride the breeze).
    assert.ok(moved < still.ctx.verts.length * 0.1, `h=${h} ${moved} vertices moved — more than the hem`);
  }
});

test('the lean-to opens SOUTH: the canvas recedes north from the ridge, the poles stand at the foot line', () => {
  const F = leanToFrame(S);
  assert.ok(F.ridge < 0, 'the ridge is above the foot line');
  assert.ok(F.canvasS < F.ridge, 'the canvas is thrown over the ridge pole');
  assert.ok(F.north < F.canvasS, 'the staked edge is further up the screen (north) than the ridge — the mouth faces the camera');
  assert.ok(F.hwN < F.hw, 'the canvas narrows as it recedes');
  assert.ok(Math.abs(F.poleH / S - 0.62) < 1e-9, 'the ridge sits at the rig\'s hip');
  // And the painted rolls lie INSIDE the mouth: under the ridge, above
  // the foot line, between the poles — every seed.
  for (const h of SEEDS) {
    const r = rig(h, Tile.LeanTo);
    paint(r);
    const baseY = r.env.p.y + S * YS * 0.18;
    const ridgeY = baseY + F.ridge;
    const inside = r.ctx.rects.filter((q) => q.y >= ridgeY && q.y + q.h <= baseY + 1e-6 && q.x >= r.env.p.x - F.hw && q.x + q.w <= r.env.p.x + F.hw);
    assert.ok(inside.length >= 12, `h=${h} only ${inside.length} rects lie inside the mouth (two rolls should)`);
  }
});

test('the pot is copper and the bandage is bone: the family\'s two named inks land where the brief put them', () => {
  for (const h of SEEDS) {
    const lean = rig(h, Tile.LeanTo);
    paint(lean);
    assert.ok(lean.ctx.fills.includes(COPPER), `LeanTo h=${h} has no pot`);
    assert.ok(lean.ctx.fills.includes(LINEN), `LeanTo h=${h} has no canvas`);
    const cart = rig(h, Tile.BelongingsCart);
    paint(cart);
    assert.ok(cart.ctx.fills.includes(COPPER), `BelongingsCart h=${h} has no pot`);
    assert.ok(cart.ctx.fills.includes(LINEN), `BelongingsCart h=${h} has no linen bundle`);
    const cot = rig(h, Tile.FieldCot);
    paint(cot);
    assert.ok(cot.ctx.fills.includes(DGN_BONE), `FieldCot h=${h} has no bandage roll`);
    const roll = rig(h, Tile.Bedroll);
    paint(roll);
    assert.ok(!roll.ctx.fills.includes(COPPER) && !roll.ctx.fills.includes(DGN_BONE), `Bedroll h=${h} carries another piece's ink`);
  }
});

test('the cart heaps 4..6 blocks and the deal varies', () => {
  const seen = new Set<number>();
  for (let h = 0; h < 1 << 8; h++) {
    const n = cartHeapCount(h);
    assert.ok(n >= 4 && n <= 6, `h=${h} heaped ${n}`);
    seen.add(n);
  }
  assert.deepEqual([...seen].sort(), [4, 5, 6]);
});

test('SHADOWS NEVER BAKE: each piece casts per frame through the host', () => {
  const want: Record<number, string[]> = {
    [Tile.LeanTo]: ['edge'],
    [Tile.Bedroll]: ['contact'],
    [Tile.BelongingsCart]: ['edge'],
    [Tile.FieldCot]: ['edge'],
  };
  for (const tile of FOUR) {
    const r = rig(SEEDS[1], tile);
    const item = painterFor(tile)(r.host, r.env);
    assert.ok(item.drawShadow, `${Tile[tile]} has no drawShadow`);
    item.drawShadow();
    assert.deepEqual(r.casts, want[tile], `${Tile[tile]} cast ${r.casts.join(',')}`);
  }
});

test('BODY-RULER: bodies measure the painted extent against the 1.15s rig', () => {
  const at = (tile: Tile) => painterFor(tile)(rig(SEEDS[2], tile).host, rig(SEEDS[2], tile).env);
  const p = { x: 500, y: 400 };
  const lean = at(Tile.LeanTo);
  const roll = at(Tile.Bedroll);
  const cart = at(Tile.BelongingsCart);
  const cot = at(Tile.FieldCot);
  // The bedroll is walkable: the lowest sort of the four, under the
  // rig, and its box never climbs past the rig's knee.
  assert.ok(roll.sortY < lean.sortY && roll.sortY < cart.sortY && roll.sortY < cot.sortY, 'the bedroll sorts under the rest');
  assert.ok(roll.body!.y > p.y - 0.45 * S, 'the bedroll lies low');
  // The lean-to's staked edge recedes to ~1.0s over the foot: its box
  // covers that and no more than a rig and a quarter.
  assert.ok(lean.body!.y <= p.y - 0.95 * S && lean.body!.y > p.y - 1.45 * S, 'lean-to body');
  // The cart's chair leg tops out past the rig's chest.
  assert.ok(cart.body!.y <= p.y - 0.85 * S && cart.body!.y > p.y - 1.3 * S, 'cart body');
  assert.ok(cart.body!.w >= 1.8 * S, 'the cart is wider than its tile (shafts and the dropped bundle)');
  // The cot stands at the knee: its far rail under the rig's hip.
  assert.ok(cot.body!.y <= p.y - 0.6 * S && cot.body!.y > p.y - 1.0 * S, 'cot body');
  // Every box holds every vertex the painter placed (the box is the
  // painted extent, never the tile) — at every seed.
  for (const tile of FOUR) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      const item = paint(r);
      const b = item.body!;
      for (const [x, y] of r.ctx.verts) {
        assert.ok(x >= b.x - 1e-6 && x <= b.x + b.w + 1e-6, `${Tile[tile]} h=${h} paints past its body in x (${((x - p.x) / S).toFixed(2)}s)`);
        assert.ok(y >= b.y - 1e-6 && y <= b.y + b.h + 1e-6, `${Tile[tile]} h=${h} paints past its body in y (${((y - p.y) / S).toFixed(2)}s)`);
      }
    }
  }
});

test('hash deals postures: one seed paints the same, the seed set paints more than one', () => {
  for (const tile of FOUR) {
    const sigs = new Set<string>();
    for (const h of SEEDS) {
      const a = rig(h, tile);
      const b = rig(h, tile);
      paint(a);
      paint(b);
      assert.deepEqual(a.ctx.verts, b.ctx.verts, `${Tile[tile]} h=${h} not deterministic`);
      assert.deepEqual(a.ctx.fills, b.ctx.fills, `${Tile[tile]} h=${h} inks not deterministic`);
      sigs.add(JSON.stringify([a.ctx.verts, a.ctx.fills]));
    }
    assert.ok(sigs.size > 1, `${Tile[tile]} ignores its hash across ${SEEDS.length} seeds`);
  }
});

test('displaced.ts: the content boundary holds and the laws are spoken in the file', () => {
  const src = readFileSync(fileURLToPath(new URL('./displaced.ts', import.meta.url)), 'utf8');
  // The boundary's roster, spelled so this file never carries a word
  // it forbids (the scan reads every changed line).
  const banned = ['wi-tch', 'h-ex', 'co-ven', 'war-lock', 'de-mon', 'de-vil', 'in-fernal', 'oc-cult', 'he-ll'].map((w) => w.replace('-', ''));
  for (const word of banned) {
    assert.ok(!new RegExp(`\\b${word}`, 'i').test(src), `the boundary holds in the displaced (${word.length} letters)`);
  }
  assert.ok(!/ctx\.(translate|rotate|scale|setTransform)\(/.test(src), 'no transform tricks (parity)');
  assert.ok(!/queueGlow\(/.test(src), 'nothing glows from the painter');
  assert.ok(!/[sS]moke\s*\(/.test(src), 'no painter smoke');
  assert.ok(/const ctx = rend\.ctx;/.test(src), 'draw-time ctx capture');
  assert.ok(!/h >> \d/.test(src), 'hash deals with h >>> k');
  assert.ok(!/ctx\.stroke\(|strokeRect\(|strokeStyle/.test(src), 'THE ONE RING: nothing strokes');
  assert.ok(!/stubBlock/.test(src), 'no K0 stub survives in the family');
  assert.ok(/breezeAt\(/.test(src) && /0\.05\)/.test(src), 'the hem samples the one breeze at 0.05s');
});
