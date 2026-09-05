import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { STRIPPED_PROPS } from './stripped.js';
import { SCAR_ASH, SCAR_EMBER } from '../palette.js';
import { paintTree, speciesOf, treeModel } from '../../trees.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE STRIPPED LAND's laws, pinned without a browser: the two painters
// speak only fills (no strokes — THE ONE RING inks the silhouette), no
// transforms (parity: the GL stage draws quads, never a rotated ctx),
// every fillRect ≥0.03s (BLOCK LAW's minimum feature), every ink COLD
// (chroma under 40 — the stripped land has no fire left in it), no
// clock (both idle in STATIC_RING_TILES), each casts its shadow per
// frame through the host (SHADOWS NEVER BAKE), and the heap deals its
// two washes. The dead tree is pinned here too: trees.ts bares the
// living grammar to a snag (foliage 0 on every path, spars, grey-brown
// bark with the pale ash facet, moss on the shaded side, 0.35 sway).

const S = 64;
const YS = 0.72;

class RecCtx {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineJoin = 'miter';
  globalAlpha = 1;
  calls: string[] = [];
  fills: string[] = [];
  rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  /** The ink each rect was filled with (parallel to `rects`). */
  rectInk: string[] = [];
  pts: Array<[number, number]> = [];
  beginPath(): void { this.calls.push('beginPath'); }
  closePath(): void { this.calls.push('closePath'); }
  moveTo(x: number, y: number): void { this.calls.push('moveTo'); this.pts.push([x, y]); }
  lineTo(x: number, y: number): void { this.calls.push('lineTo'); this.pts.push([x, y]); }
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
    this.rectInk.push(String(this.fillStyle));
  }
  stroke(): void { this.calls.push('stroke'); }
  save(): void { this.calls.push('save'); }
  restore(): void { this.calls.push('restore'); }
  translate(): void { this.calls.push('translate'); }
  rotate(): void { this.calls.push('rotate'); }
  scale(): void { this.calls.push('scale'); }
  setTransform(): void { this.calls.push('setTransform'); }
  clip(): void { this.calls.push('clip'); }
}

interface Rig { host: PropHost; env: PropFrame; ctx: RecCtx; casts: string[]; clocks: number }

function rig(h: number, t = 0): Rig {
  const ctx = new RecCtx();
  const casts: string[] = [];
  const r: Rig = { host: null as unknown as PropHost, env: null as unknown as PropFrame, ctx, casts, clocks: 0 };
  r.host = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    camera: { yScale: YS },
    castEdgeQuad: () => { casts.push('edge'); },
    castBlob: () => { casts.push('blob'); },
    castContact: () => { casts.push('contact'); },
    breezeAt: () => { r.clocks++; return { sway: 0, lag: 0, gust: 1 }; },
    queueGlow: () => { assert.fail('the stripped land never queueGlows'); },
  } as unknown as PropHost;
  const p = { x: 500, y: 400 };
  r.env = {
    tile: Tile.CharredStump,
    tx: 10,
    ty: 12,
    game: {} as PropFrame['game'],
    ctx: ctx as unknown as CanvasRenderingContext2D,
    p,
    s: S,
    h,
    t,
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
  const row = STRIPPED_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no stripped-land painter for ${Tile[tile]}`);
  return row[1];
}

const TWO = [Tile.CharredStump, Tile.SpoilHeap] as const;
const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0x2a2a2a2a, 0x13579bdf] as const;
const CONTACT = 'rgba(12, 8, 20, 0.24)';

function paint(tile: Tile, r: Rig): ReturnType<PropPainter> {
  const item = painterFor(tile)(r.host, { ...r.env, tile });
  assert.ok(item.draw, `${Tile[tile]} minted no draw`);
  item.draw();
  return item;
}

const chroma = (ink: string): number => {
  const n = parseInt(ink.slice(1), 16);
  const r = n >> 16;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return Math.max(r, g, b) - Math.min(r, g, b);
};

test('the stripped land speaks only fills: no strokes, no transforms, no clips', () => {
  for (const tile of TWO) {
    for (const h of SEEDS) {
      const r = rig(h);
      paint(tile, r);
      for (const bad of ['stroke', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'clip']) {
        assert.ok(!r.ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.ok(r.ctx.calls.includes('fill') && r.ctx.calls.includes('fillRect'), `${Tile[tile]} painted too little`);
    }
  }
});

test('BLOCK LAW: every fillRect is at least 0.03s on both sides', () => {
  const min = 0.03 * S - 1e-6;
  for (const tile of TWO) {
    for (const h of SEEDS) {
      const r = rig(h);
      paint(tile, r);
      for (const rc of r.ctx.rects) {
        assert.ok(rc.w >= min && rc.h >= min, `${Tile[tile]} h=${h} rect ${rc.w.toFixed(2)}×${rc.h.toFixed(2)} under 0.03s`);
      }
    }
  }
});

test('COLD: every ink is a six-digit #rrggbb and low-chroma; no ember, no orange, only the contact shade is rgba', () => {
  for (const tile of TWO) {
    for (const h of SEEDS) {
      const r = rig(h);
      paint(tile, r);
      assert.ok(!r.ctx.fills.includes(SCAR_EMBER), `${Tile[tile]} painted SCAR_EMBER`);
      for (const f of r.ctx.fills) {
        if (f === CONTACT) continue;
        assert.ok(/^#[0-9a-f]{6}$/i.test(f), `${Tile[tile]} paints #rrggbb inks only (${f})`);
        assert.ok(chroma(f) < 40, `${Tile[tile]} painted a warm ink ${f} (chroma ${chroma(f)})`);
        assert.ok(!/^#e|^#f/i.test(f), `${Tile[tile]} painted a hot ink ${f}`);
      }
    }
  }
});

test('STATIC: neither piece reads the clock or the breeze — t=0 and t=9 paint the same', () => {
  for (const tile of TWO) {
    for (const h of SEEDS.slice(0, 4)) {
      const a = rig(h, 0);
      const b = rig(h, 9.31);
      paint(tile, a);
      paint(tile, b);
      assert.deepEqual(a.ctx.rects, b.ctx.rects, `${Tile[tile]} h=${h} moved with the clock`);
      assert.deepEqual(a.ctx.pts, b.ctx.pts, `${Tile[tile]} h=${h} moved with the clock (paths)`);
      assert.equal(a.clocks + b.clocks, 0, `${Tile[tile]} sampled the breeze`);
    }
  }
});

test('SHADOWS NEVER BAKE: the stub is a short prism (edge), the heap a mass (blob)', () => {
  const want: Record<number, string[]> = {
    [Tile.CharredStump]: ['edge'],
    [Tile.SpoilHeap]: ['blob'],
  };
  for (const tile of TWO) {
    const r = rig(SEEDS[1]);
    const item = painterFor(tile)(r.host, { ...r.env, tile });
    assert.ok(item.drawShadow, `${Tile[tile]} has no drawShadow`);
    item.drawShadow();
    assert.deepEqual(r.casts, want[tile], `${Tile[tile]} cast ${r.casts.join(',')}`);
  }
});

test('BODY-RULER: the stump is shin-high and walkable-sorted; the heap is waist-high', () => {
  const r = rig(SEEDS[2]);
  const stump = painterFor(Tile.CharredStump)(r.host, { ...r.env, tile: Tile.CharredStump });
  const heap = painterFor(Tile.SpoilHeap)(r.host, { ...r.env, tile: Tile.SpoilHeap });
  // The stump sorts under the heap (the rig walks past it) and its
  // body tops out under the rig's knee.
  assert.ok(stump.sortY < heap.sortY);
  assert.ok(stump.body!.y > r.env.p.y - 0.6 * S, 'the stump must stay shin-high');
  assert.ok(stump.body!.y < r.env.p.y - 0.3 * S, 'the stump must still stand');
  // The heap crests at the rig's waist: the painted crest stands
  // 0.56..0.7s over the foot line, the body covers it and never
  // reaches the shoulder.
  const heapPaint = rig(SEEDS[2]);
  paint(Tile.SpoilHeap, heapPaint);
  const crest = Math.min(...heapPaint.ctx.pts.map(([, y]) => y));
  const heapFoot = heapPaint.env.p.y + S * YS * 0.18;
  assert.ok(heapFoot - crest >= 0.56 * S && heapFoot - crest <= 0.7 * S, `the heap crests at ${((heapFoot - crest) / S).toFixed(2)}s`);
  assert.ok(heap.body!.y <= crest, 'the heap body must cover its crest');
  assert.ok(heap.body!.y > r.env.p.y - 0.9 * S, 'the heap must not balloon');
  // The painted stub itself: the taller crown's top plane sits
  // ≈0.3s + its foreshortened depth above the foot line, never higher.
  const painted = rig(SEEDS[2]);
  paint(Tile.CharredStump, painted);
  const top = Math.min(...painted.ctx.rects.map((rc) => rc.y));
  const foot = painted.env.p.y + S * YS * 0.18;
  assert.ok(foot - top <= 0.3 * S + 0.36 * 0.32 * YS * S + 1e-6, 'the stub grew past 0.3s + its top plane');
  assert.ok(foot - top >= 0.3 * S, 'the stub lost its taller crown');
});

test('hash deals postures: one seed paints the same, the seed set paints more than one', () => {
  for (const tile of TWO) {
    const sigs = new Set<string>();
    for (const h of SEEDS) {
      const a = rig(h);
      const b = rig(h);
      paint(tile, a);
      paint(tile, b);
      assert.deepEqual(a.ctx.rects, b.ctx.rects, `${Tile[tile]} h=${h} not deterministic`);
      assert.deepEqual(a.ctx.pts, b.ctx.pts, `${Tile[tile]} h=${h} not deterministic (paths)`);
      sigs.add(JSON.stringify(a.ctx.rects) + JSON.stringify(a.ctx.pts));
    }
    assert.ok(sigs.size > 1, `${Tile[tile]} ignores its hash across ${SEEDS.length} seeds`);
  }
});

test('the heap deals both washes (quarry-brown, starfall-black) and both tools (pick, handle)', () => {
  const washes = new Set<string>();
  const tools = new Set<string>();
  for (const h of SEEDS) {
    const r = rig(h);
    paint(Tile.SpoilHeap, r);
    // The first fill after the contact shade is the mound's shade flank.
    const first = r.ctx.fills[1]!;
    washes.add(first);
    // A pick paints its iron ('#3a3444'); a handle its wood.
    tools.add(r.ctx.fills.includes('#3a3444') ? 'pick' : 'handle');
  }
  assert.equal(washes.size, 2, `the heap dealt ${washes.size} wash(es) across ${SEEDS.length} seeds`);
  assert.equal(tools.size, 2, `the heap dealt ${tools.size} tool(s) across ${SEEDS.length} seeds`);
});

test('THE ANGLE OF REPOSE: the heap peaks west of centre (a cone, not a dome) and its chips are readable', () => {
  // The lab rig (2026-09-04) read the first squashed-disc heap as a
  // black boulder at gameplay zoom: no peak, chips under 4px. The
  // recut stands the mound as a peaked polygon with its apex on the
  // sun side and lays every chip ≥0.09s long — pinned here so the
  // heap never rounds off again.
  for (const h of SEEDS) {
    const r = rig(h);
    paint(Tile.SpoilHeap, r);
    let apex: [number, number] = [0, Infinity];
    for (const pt of r.ctx.pts) if (pt[1] < apex[1]) apex = pt;
    assert.ok(apex[0] < r.env.p.x - 0.04 * S, `h=${h}: the apex sits east of centre (${((apex[0] - r.env.p.x) / S).toFixed(2)}s)`);
    // Every chip is a four-point quad whose long edge runs ≥0.09s:
    // the chips are the quads painted in the two chip inks.
    const chipInks = new Set(['#665f72', '#221e28', '#9a927f', '#605845']);
    let chips = 0;
    // Walk the recorded path points four at a time for each chip-ink
    // fill, in paint order.
    let pi = 0;
    let fills = 0;
    for (let k = 0; k < r.ctx.calls.length; k++) {
      const c = r.ctx.calls[k]!;
      if (c === 'moveTo' || c === 'lineTo') pi++;
      if (c === 'fillRect') fills++;
      if (c !== 'fill') continue;
      const ink = r.ctx.fills[fills]!;
      fills++;
      if (!chipInks.has(ink)) continue;
      const quad = r.ctx.pts.slice(pi - 4, pi);
      const len = Math.hypot(quad[1]![0] - quad[0]![0], quad[1]![1] - quad[0]![1]);
      assert.ok(len >= 0.09 * S - 1e-6, `h=${h}: a chip ${(len / S).toFixed(3)}s long`);
      chips++;
    }
    assert.ok(chips >= 6 && chips <= 9, `h=${h}: ${chips} chips`);
  }
});

test('the stump paints its split crown as two lit planes at two heights, two cold checks on the sun face', () => {
  for (const h of SEEDS) {
    const r = rig(h);
    paint(Tile.CharredStump, r);
    const tops = r.ctx.rects.filter((rc, i) => r.ctx.rectInk[i] === '#4c4746' && rc.w > 0.1 * S);
    const ys = new Set(tops.map((rc) => Math.round(rc.y * 100)));
    assert.equal(tops.length, 2, `h=${h}: ${tops.length} crown planes`);
    assert.ok(ys.size >= 2, `h=${h}: the crown is not split (${ys.size} top height)`);
    // The checks: the lifted cold square ink appears exactly twice.
    const checks = r.ctx.fills.filter((f) => f === '#403b3f').length;
    assert.equal(checks, 2, `h=${h}: ${checks} ember checks`);
  }
});

// ---------------------------------------------------------- 520 DeadTree

const DEAD_SEEDS = Array.from({ length: 240 }, (_, i) => (i * 2654435761) >>> 0);

test('DeadTree: the living grammar bared — foliage-free, spars, grey-brown bark, pale ash facet, 0.35 sway', () => {
  const species = new Set<number>();
  for (const h of DEAD_SEEDS) {
    const m = treeModel(Tile.DeadTree, h);
    species.add(m.species);
    assert.equal(m.dead, true, `h=${h}: not flagged dead`);
    assert.equal(m.swayMul, 0.35, `h=${h}: the snag sways at 0.35`);
    assert.equal(m.curtains.length, 0, `h=${h}: a snag keeps no curtains (they would cast)`);
    for (const c of m.clusters) assert.ok(c.r <= 0.006, `h=${h}: a bared cluster is an anchor, not a crown (r ${c.r})`);
    for (const b of m.branches) {
      assert.equal(b.level, 0, `h=${h}: every bare limb is a level-0 limb (it casts)`);
      for (const [x, y] of b.pts) assert.ok(Number.isFinite(x) && Number.isFinite(y), `h=${h}: NaN in the wood`);
    }
    // The spars: two or three three-point limbs rooted exactly on the
    // trunk's top point, tapering to the spar tip (0.012) and rising
    // past the trunk's top (the willow's arcs and the twin's fork
    // arms root there too, but they are the living wood).
    const trunk = m.branches[m.branches.length - 1]!;
    const [ax, ay] = trunk.pts[trunk.pts.length - 1]!;
    const spars = m.branches.filter((b) =>
      b !== trunk && b.pts.length === 3 && b.w1 === 0.012 && b.pts[0]![0] === ax && b.pts[0]![1] === ay && b.pts[2]![1] > ay);
    assert.ok(spars.length >= 2 && spars.length <= 3, `h=${h}: ${spars.length} spars`);
    // The spars are the snag's crown: the model's height is their reach.
    for (const sp of spars) assert.ok(m.height >= sp.pts[2]![1] + sp.w0 - 1e-9, `h=${h}: a spar stands past the height`);
    assert.equal(m.bark, '#5b524a', `h=${h}: bark must be the grey-brown`);
    assert.equal(m.barkLit, SCAR_ASH, `h=${h}: the lit facet is the pale ash`);
    assert.ok(m.height >= 2.5 && m.height <= 7, `h=${h}: height ${m.height}`);
    assert.ok(m.spread > 0.3 && m.spread <= 3.2, `h=${h}: spread ${m.spread}`);
    assert.equal(speciesOf(Tile.DeadTree, h), m.species);
  }
  // Species by hash: the oak family, the willow (6) and the pine (8)
  // all stand dead somewhere in the country.
  assert.ok(species.size >= 7, `only ${species.size} snag species across ${DEAD_SEEDS.length} hashes`);
  assert.ok(species.has(6) && species.has(8), 'the willow and the pine must stand as snags');
});

test('DeadTree paints no leaf ink, wears moss on the shaded side, and sways at 0.35 of the living cantilever', () => {
  const MOSS = 'rgba(74, 97, 56, 0.5)';
  for (const h of DEAD_SEEDS.slice(0, 24)) {
    const m = treeModel(Tile.DeadTree, h);
    const paintAt = (wind: number): RecCtx => {
      const ctx = new RecCtx();
      paintTree(ctx as unknown as CanvasRenderingContext2D, m, {
        bx: 500, groundY: 400, s: S, syT: S * YS, wx: 3, wy: 5, tSec: 1.5, windOverride: wind,
      } as unknown as Parameters<typeof paintTree>[2]);
      return ctx;
    };
    const still = paintAt(0);
    for (const f of still.fills) {
      for (const leaf of m.leaves) assert.notEqual(f, leaf, `h=${h}: painted a leaf ink ${f}`);
      assert.ok(!/^#[0-9a-f]{6}$/i.test(f) || chroma(f) < 40, `h=${h}: a snag is grey (${f})`);
    }
    assert.ok(still.fills.includes(MOSS), `h=${h}: no moss on the shaded side`);
    for (const rc of still.rects) assert.ok(rc.w >= 0.03 * S - 1e-6 && rc.h >= 0.03 * S - 1e-6, `h=${h}: moss under 0.03s`);
    // The cantilever: at full wind every path point moves by at most
    // 0.35 · 0.055 · H · s (the snag's stiff amplitude at hf = 1), and
    // the highest wood (the spar tips, at hf = yTop/H) moves by that
    // amplitude's hf^1.4 share — the living curve, at 0.35.
    const gale = paintAt(1);
    assert.equal(gale.pts.length, still.pts.length);
    let maxDx = 0;
    for (let i = 0; i < gale.pts.length; i++) maxDx = Math.max(maxDx, Math.abs(gale.pts[i]![0] - still.pts[i]![0]));
    const amp = 0.35 * 0.055 * m.height * S;
    let yTop = 0;
    for (const b of m.branches) for (const [, y] of b.pts) yTop = Math.max(yTop, y);
    const expect = amp * Math.pow(Math.min(1, yTop / m.height), 1.4);
    assert.ok(maxDx <= amp + 1e-6, `h=${h}: the snag swayed ${maxDx.toFixed(2)}px past its 0.35 amplitude ${amp.toFixed(2)}`);
    assert.ok(maxDx >= expect * 0.95 - 1e-6, `h=${h}: the snag's crown moved ${maxDx.toFixed(2)}px, under its ${expect.toFixed(2)} share`);
  }
});

test('the world sways the snag at the sheet\'s amplitude: the renderer\'s live shear and shadow cantilever read swayMul (source pin)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const src = readFileSync(fileURLToPath(new URL('../../renderer.ts', import.meta.url)), 'utf8');
  // The per-quad shear the species sheet rides in the world.
  assert.match(src, /const kSh = \(wind - sp\.windAt\) \* 0\.055 \* \(m\.swayMul \?\? 1\) \+ this\.treeLean\(h\);/, 'the sprite shear scales by swayMul');
  // The shadow cast's cantilever.
  assert.match(src, /const bendT = wind \* 0\.055 \* H \* \(m\.swayMul \?\? 1\);\s+const path = new Path2D\(\);/, 'the shadow cantilever scales by swayMul');
  // And a snag sheds no autumn-gold leaf in a gale.
  assert.match(src, /if \(!m\.dead && bendOverride === undefined && grow >= 1 && Math\.random\(\)/, 'the gust shed is gated on the living tree');
});
