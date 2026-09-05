import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHUNK_SIZE, Detail, Tile } from '@arx/shared';
import {
  BAND_HELD,
  BAND_TAKEN,
  BAND_TOUCHED,
  HALO_CELLS,
  HALO_N,
  band,
  haloIndex,
  type SpectrumStroke,
} from '@arx/content';
import {
  BANK_FACE_FOLD,
  DIRT_FOLD,
  FOLD_ALT_SALT,
  FOLD_AUTUMN,
  FOLD_BLIGHT,
  FOLD_BURN,
  FOLD_LANE_BASE,
  FOLD_LOOK_COUNT,
  FOLD_NONE,
  FOLD_SPRING,
  FRINGE_ALT,
  PATH_FOLD,
  SHALLOWS_FOLD,
  SNOW_FOLD,
  STUBBLE_INK,
  SUBSTRATE_FOLD,
  WASH_ALT,
  foldLaneSeed,
  washAltKey,
  washKey,
} from './foldSkins.js';
import { MUSEUM_FOLD_BANK_ONLY, MUSEUM_FOLD_HELD_ONLY, MUSEUM_FOLD_LOOKS, MUSEUM_FOLD_MATERIALS, museumFoldHolds } from '@arx/content';

/**
 * THE SUBSTRATE FOLDS (contested-lands plan §12.3 canvas steps 0-2,
 * 4-5; §12.8 LG-1). Node has no canvas, so the bake draws into the
 * recording context terrain.seed.test.ts introduced: every method
 * call, property set and Path2D op serialized in order and hashed.
 * The proofs:
 *
 *   1. ZERO STROKES = TODAY. With the registry empty — and with a
 *      stroke registered OUT of reach, and with a stroke IN reach but
 *      the gate down (the plane / LIVING_GROUND_OFF) — the op stream
 *      over the seed fixture is the pre-seed GOLDEN byte for byte.
 *   2. A stroke in reach folds: the stream changes, the wash lanes'
 *      keys appear, and two bakes of the same folded chunk agree.
 *   3. THE SHARED CORNER: two chunks sharing a border read the same
 *      halo words on the shared columns, and THE WEIGHTED CROSSING is
 *      a pure function of those words — so the wash contour meets
 *      itself across the chunk seam by construction. Band edges are
 *      integer thresholds on quantised words: deterministic.
 *   4. THE PALETTE LAWS: every fold tone sits near GRASS_TONES in
 *      value, keeps the four-role order, blight is never black, the
 *      wash keys are the substrate's own, the lanes cannot collide.
 *   5. NO CLOCK REACHES A PAINTED VALUE: the fold section of
 *      terrain.ts and all of foldSkins.ts read no Date, performance
 *      or Math.random.
 */

// ------------------------------------------------------- the recorder
// (terrain.seed.test.ts's recorder, verbatim in spirit: any drift
// between the two would show as a golden mismatch here.)

const ops: string[] = [];
let canvasN = 0;
let gradN = 0;

const fmt = (v: unknown): string => {
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'boolean' || v === null || v === undefined) return String(v);
  if (v instanceof RecPath) return `path[${v.ops.join(';')}]`;
  if (typeof v === 'object' && v !== null && 'recId' in v) return String((v as { recId: string }).recId);
  if (Array.isArray(v)) return `[${v.map(fmt).join(',')}]`;
  if (typeof v === 'function') return 'fn';
  return JSON.stringify(v);
};

class RecPath {
  ops: string[] = [];
  constructor(src?: RecPath | string) {
    if (src instanceof RecPath) this.ops.push(...src.ops);
    else if (typeof src === 'string') this.ops.push(`svg(${src})`);
  }
  private rec(name: string, args: unknown[]): void {
    this.ops.push(`${name}(${args.map(fmt).join(',')})`);
  }
  moveTo(...a: unknown[]): void { this.rec('M', a); }
  lineTo(...a: unknown[]): void { this.rec('L', a); }
  quadraticCurveTo(...a: unknown[]): void { this.rec('Q', a); }
  bezierCurveTo(...a: unknown[]): void { this.rec('C', a); }
  arc(...a: unknown[]): void { this.rec('A', a); }
  arcTo(...a: unknown[]): void { this.rec('AT', a); }
  ellipse(...a: unknown[]): void { this.rec('E', a); }
  rect(...a: unknown[]): void { this.rec('R', a); }
  roundRect(...a: unknown[]): void { this.rec('RR', a); }
  closePath(): void { this.rec('Z', []); }
  addPath(...a: unknown[]): void { this.rec('+', a); }
}

const CTX_PROPS = new Set([
  'globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth',
  'lineCap', 'lineJoin', 'miterLimit', 'lineDashOffset', 'shadowBlur', 'shadowColor',
  'shadowOffsetX', 'shadowOffsetY', 'font', 'textAlign', 'textBaseline',
  'imageSmoothingEnabled', 'imageSmoothingQuality', 'filter', 'direction', 'letterSpacing',
]);

function makeGradient(kind: string, args: unknown[]): object {
  const recId = `grad#${gradN++}`;
  ops.push(`${recId}=${kind}(${args.map(fmt).join(',')})`);
  return {
    recId,
    addColorStop: (...a: unknown[]) => { ops.push(`${recId}.stop(${a.map(fmt).join(',')})`); },
  };
}

function makeCanvas(): object {
  const recId = `canvas#${canvasN++}`;
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(
    {},
    {
      get(_t, key) {
        if (typeof key !== 'string') return undefined;
        if (key === 'canvas') return canvas;
        if (key === 'recId') return `${recId}.ctx`;
        if (CTX_PROPS.has(key)) return state[key];
        switch (key) {
          case 'createLinearGradient':
          case 'createRadialGradient':
          case 'createConicGradient':
            return (...a: unknown[]) => makeGradient(key, a);
          case 'createPattern':
            return (...a: unknown[]) => {
              const id = `pattern#${gradN++}`;
              ops.push(`${id}=pattern(${a.map(fmt).join(',')})`);
              return { recId: id, setTransform: () => undefined };
            };
          case 'measureText':
            return (s: string) => {
              ops.push(`${recId}.measureText(${fmt(s)})`);
              return { width: s.length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 };
            };
          case 'getImageData':
          case 'createImageData':
            return (...a: unknown[]) => {
              ops.push(`${recId}.${key}(${a.map(fmt).join(',')})`);
              const w = typeof a[2] === 'number' ? a[2] : typeof a[0] === 'number' ? a[0] : 1;
              const h = typeof a[3] === 'number' ? a[3] : typeof a[1] === 'number' ? a[1] : 1;
              return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
            };
          case 'getTransform':
            return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
          case 'getLineDash':
            return () => [];
          case 'isPointInPath':
          case 'isPointInStroke':
            return () => false;
          case 'reset':
            return undefined;
          default:
            return (...a: unknown[]) => { ops.push(`${recId}.${key}(${a.map(fmt).join(',')})`); };
        }
      },
      set(_t, key, value) {
        if (typeof key !== 'string') return false;
        state[key] = value;
        ops.push(`${recId}.${key}=${fmt(value)}`);
        return true;
      },
    },
  );
  const canvas = {
    recId,
    width: 0,
    height: 0,
    style: {},
    getContext: (kind: string) => (kind === '2d' ? ctx : null),
  };
  return canvas;
}

const g = globalThis as unknown as { Path2D?: unknown; document?: unknown };
g.Path2D = RecPath;
g.document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`recorder: unexpected createElement(${tag})`);
    return makeCanvas();
  },
};

const terrain = await import('./terrain.js');
const fold = await import('./fold.js');
const { bakeChunk, bakeElevated, foldCrossT, foldHaloSigFor, foldSigFor, setFoldEnabled, waterRegionPath } = terrain;
const { allocSpectrumHalo, resetSpectrum, setSpectrum, spectrumHalo } = fold;

// ----------------------------------------------------------- fixture
// terrain.seed.test.ts's world, verbatim, so its GOLDEN is this file's
// zero-stroke pin too.

function fixtureGround(tx: number, ty: number): number {
  const d = (cx: number, cy: number): number => Math.hypot(tx - cx, ty - cy);
  if (ty >= 512) {
    const ux = ((tx % 32) + 32) % 32;
    const uy = ((ty % 32) + 32) % 32;
    if (ux >= 8 && ux <= 20 && uy >= 6 && uy <= 18) return Tile.DungeonFloor;
    const r = (cx: number, cy: number): number => Math.hypot(ux - cx, uy - cy);
    if (r(26, 24) < 4 || r(4, 26) < 3.2 || r(14, 24) < 2.4 || r(24, 4) < 3) return Tile.CaveRubble;
    return Tile.CaveFloor;
  }
  const pond = d(20, 11);
  if (pond < 3.6) return Tile.WaterDeep;
  if (pond < 5.8) return Tile.Water;
  if (pond < 7.7) return Tile.WaterShallow;
  if (pond < 9.2) return Tile.Sand;
  if (tx >= 18 && tx <= 25 && ty >= 22 && ty <= 29) {
    if (tx >= 20 && tx <= 22 && ty >= 24 && ty <= 27) return Tile.WoodFloor;
    return Tile.StoneFloor;
  }
  const yard = d(7, 7);
  if (yard < 2.2) return Tile.Tilled;
  if (yard < 5.4) return Tile.Dirt;
  if (d(30, 26) < 5.5) return Tile.Snow;
  if (d(8, 26) < 4.3) return Tile.Swamp;
  const roadY = 15 + Math.round(Math.sin(tx * 0.5) * 1.5);
  if (ty >= roadY && ty <= roadY + 1) return Tile.Path;
  return Tile.Grass;
}

const detail = (): number => Detail.None;
const elev = (): number => 0;

function captureStream(): { stream: string; count: number } {
  ops.length = 0;
  canvasN = 0;
  gradN = 0;
  bakeChunk(fixtureGround, detail, elev, 0, 0, 32);
  bakeChunk(fixtureGround, detail, elev, 0, 16, 32);
  const wr = waterRegionPath(fixtureGround, { minTx: 8, maxTx: 32, minTy: 0, maxTy: 22 }) as unknown as RecPath | null;
  ops.push(`waterRegionPath=${wr ? fmt(wr) : 'null'}`);
  return { stream: ops.join('\n'), count: ops.length };
}

function captureChunk(ground: (tx: number, ty: number) => number, cx: number, cy: number, px = 32): string {
  ops.length = 0;
  canvasN = 0;
  gradN = 0;
  bakeChunk(ground, detail, elev, cx, cy, px);
  return ops.join('\n');
}

const sha = (s: string): string => createHash('sha256').update(s).digest('base64');

/** terrain.seed.test.ts's golden — the pre-seed picture. */
const GOLDEN_SHA = 'oiUZhUHDLqXXar2zQLTCd2Qaxr/P/V9w7ppBI8J5yzo=';
const GOLDEN_OPS = 99885;

function circle(id: string, axis: SpectrumStroke['axis'], x: number, y: number, r: number, amp = 1, over: Partial<SpectrumStroke> = {}): SpectrumStroke {
  return { id, axis, shape: { kind: 'circle', x, y, r }, amp, soft: 0.5, grain: 0.5, mode: 'max', ...over };
}

const grass = (): number => Tile.Grass;

// ---------------------------------------------------------- helpers

function lum(key: string): number {
  const n = parseInt(key.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff);
}
function minChannel(key: string): number {
  const n = parseInt(key.slice(1), 16);
  return Math.min(n >> 16, (n >> 8) & 0xff, n & 0xff);
}
const GRASS_TONES = ['#5c8941', '#588440', '#608e45', '#55813e'];
const GRASS_LUM = GRASS_TONES.reduce((a, t) => a + lum(t), 0) / GRASS_TONES.length;

// -------------------------------------------------------------- tests

test('ZERO STROKES = TODAY: the empty registry paints the pre-seed golden', () => {
  resetSpectrum();
  setFoldEnabled(true);
  const { stream, count } = captureStream();
  assert.equal(count, GOLDEN_OPS, 'op count');
  assert.equal(sha(stream), GOLDEN_SHA, 'op stream sha256');
});

test('a stroke OUT of reach paints the golden; the gate down paints the golden with a stroke IN reach', () => {
  setFoldEnabled(true);
  // Far away: chunks (0,0) and (0,16) never see it.
  setSpectrum([circle('far', 'blight', 5000, 5000, 40)], []);
  assert.equal(foldSigFor(0, 0), 0);
  assert.equal(foldSigFor(0, 16), 0);
  let cap = captureStream();
  assert.equal(cap.count, GOLDEN_OPS);
  assert.equal(sha(cap.stream), GOLDEN_SHA);
  // In reach, gate down (the underground plane / LIVING_GROUND_OFF).
  setSpectrum([circle('near', 'blight', 12, 4, 12)], []);
  setFoldEnabled(false);
  assert.equal(foldSigFor(0, 0), 0, 'the gate zeroes the sig');
  assert.equal(foldHaloSigFor(0, 0), 0);
  cap = captureStream();
  assert.equal(cap.count, GOLDEN_OPS);
  assert.equal(sha(cap.stream), GOLDEN_SHA);
  setFoldEnabled(true);
  assert.notEqual(foldSigFor(0, 0), 0, 'the gate up: the reach signs');
  assert.notEqual(foldHaloSigFor(0, 0), 0, 'and the halo hashes');
  resetSpectrum();
});

test('a stroke IN reach folds: the wash keys appear, the marks deal, and the fold is deterministic', () => {
  setFoldEnabled(true);
  setSpectrum([circle('wold', 'blight', 16, 16, 12)], []);
  const a = captureChunk(grass, 0, 0);
  const b = captureChunk(grass, 0, 0);
  assert.equal(sha(a), sha(b), 'two bakes of a folded chunk agree');
  resetSpectrum();
  const bare = captureChunk(grass, 0, 0);
  assert.notEqual(sha(a), sha(bare), 'the fold changes the picture');
  // The substrate folded: the blight tables' keys were set as fills
  // (the base and darker roles of every band — the rarest role, the
  // darkest, may not fall inside a thin hem of one disc), and none of
  // them is a summer key.
  for (const b of [0, 1, 2]) {
    const tones = SUBSTRATE_FOLD[FOLD_BLIGHT]![b]!;
    for (const tone of [tones[0], tones[1]]) {
      assert.ok(a.includes(`fillStyle=${JSON.stringify(tone)}`), `substrate band ${b + 1} key ${tone} painted`);
    }
    for (const tone of tones) assert.ok(!bare.includes(`fillStyle=${JSON.stringify(tone)}`), `${tone} is not a summer key`);
  }
  // The wash: the taken and held substrate keys stand (the bands'
  // own four-tone grain, stepping on the isoline) and the LOBES deal
  // inside them — the taken lobes and, at the heart, the held lobes.
  assert.ok(a.includes(`fillStyle=${JSON.stringify(washKey(FOLD_BLIGHT, 2))}`), 'taken substrate');
  assert.ok(a.includes(`fillStyle=${JSON.stringify(washAltKey(FOLD_BLIGHT, 2))}`), 'taken lobes');
  assert.ok(a.includes(`fillStyle=${JSON.stringify(washKey(FOLD_BLIGHT, 3))}`), 'held substrate');
  assert.ok(a.includes(`fillStyle=${JSON.stringify(washAltKey(FOLD_BLIGHT, 3))}`), 'held lobes');
  // NO FLAT FILL (the art director's recut): on an all-grass chunk the
  // only path fills carrying bows are the two lobe unions — the taken
  // isoband's contour is a CLIP, never a fill over the substrate — and
  // each union is ONE fill + ONE stroke, never per cell.
  const bowFills = (a.match(/\.fill\(path\[[^\]]*Q\(/g) ?? []).length;
  const pathFillsN = (a.match(/\.fill\(path\[/g) ?? []).length;
  assert.equal(bowFills, 2, `two lobe unions and no flat isoband fill (${bowFills} bow fills)`);
  assert.equal(pathFillsN, 2, `the wash fills nothing per cell (${pathFillsN} path fills)`);
  // The marks: blight's grey rings and its stubble pair.
  assert.ok(a.includes('rgba(168, 168, 178, 0.2)'), 'grey rings dealt');
  assert.ok(a.includes(STUBBLE_INK[FOLD_BLIGHT]![0]), 'blight stubble dealt');
  // Summer's stubble still deals at the hem (a dither, never a step).
  assert.ok(a.includes('rgba(148, 178, 96, 0.18)'), 'summer stubble survives at the hem');
  resetSpectrum();
});

test('each look paints its own keys and marks; the wash paints only the two upper bands', () => {
  setFoldEnabled(true);
  const cases: Array<[number, SpectrumStroke['axis'], number, string]> = [
    [FOLD_AUTUMN, 'season', 1, '#a8703a'], // leaf litter
    [FOLD_SPRING, 'season', -1, ''],
    [FOLD_BURN, 'burn', 1, 'rgba(38, 30, 30, 0.13)'], // soot smuts
  ];
  for (const [look, axis, amp, mark] of cases) {
    setSpectrum([circle('c', axis, 16, 16, 12, amp)], []);
    const s = captureChunk(grass, 0, 0);
    for (const bd of [1, 2, 3]) {
      assert.ok(s.includes(`fillStyle=${JSON.stringify(SUBSTRATE_FOLD[look]![bd - 1]![0])}`), `look ${look} band ${bd} substrate`);
    }
    assert.ok(s.includes(`fillStyle=${JSON.stringify(washKey(look, 2))}`), `look ${look} wash taken`);
    assert.ok(s.includes(`fillStyle=${JSON.stringify(washKey(look, 3))}`), `look ${look} wash held`);
    if (mark) assert.ok(s.includes(mark), `look ${look} mark ${mark}`);
    // No other look's keys leak in.
    for (let other = 1; other < FOLD_LOOK_COUNT; other++) {
      if (other === look) continue;
      for (const bd of [2, 3]) {
        const k = washKey(other, bd);
        if (SUBSTRATE_FOLD[look]!.some((t) => t.includes(k))) continue;
        assert.ok(!s.includes(`fillStyle=${JSON.stringify(k)}`), `look ${other}'s key ${k} must not paint under look ${look}`);
      }
    }
  }
  // The turn's held band is the cold: frost pools deal at the heart.
  setSpectrum([circle('c', 'season', 16, 16, 12, 1)], []);
  const cold = captureChunk(grass, 0, 0);
  assert.ok(cold.includes('rgba(158, 174, 208, 0.16)'), 'frost pools under the cold');
  assert.ok(cold.includes('rgba(178, 198, 168, 0.22)'), 'frost stubble under the cold');
  resetSpectrum();
});

test('precedence at a point: burn over blight over the calendar, decided per corner', () => {
  setFoldEnabled(true);
  // Three strokes over the same heart.
  setSpectrum(
    [
      circle('s', 'season', 16, 16, 14, 1, { grain: 0 }),
      circle('b', 'blight', 16, 16, 10, 1, { grain: 0 }),
      circle('u', 'burn', 16, 16, 6, 1, { grain: 0 }),
    ],
    [],
  );
  const s = captureChunk(grass, 0, 0);
  // All three looks paint their held band somewhere (the rings are
  // concentric: burn heart, blight ring, autumn ring).
  assert.ok(s.includes(`fillStyle=${JSON.stringify(washKey(FOLD_BURN, 3))}`), 'burn held at the heart');
  assert.ok(s.includes(`fillStyle=${JSON.stringify(washKey(FOLD_BLIGHT, 3))}`), 'blight held in its ring');
  assert.ok(s.includes(`fillStyle=${JSON.stringify(washKey(FOLD_AUTUMN, 3))}`), 'autumn held in its ring');
  // Paint order: the calendar first, sickness over it, ash over both
  // (the lobes are the wash's own paint; the substrate keys paint in
  // raster order and say nothing about the passes).
  const first = (k: string): number => {
    const at = s.indexOf(`fillStyle=${JSON.stringify(k)}`);
    assert.ok(at >= 0, `${k} painted`);
    return at;
  };
  assert.ok(first(washAltKey(FOLD_AUTUMN, 2)) < first(washAltKey(FOLD_BLIGHT, 2)), 'autumn lobes before blight');
  // The burn heart here is r 6 (its taken core a handful of corners),
  // so its lobes may not deal; where they do, they deal last.
  const burnAt = s.indexOf(`fillStyle=${JSON.stringify(washAltKey(FOLD_BURN, 2))}`);
  if (burnAt >= 0) assert.ok(first(washAltKey(FOLD_BLIGHT, 2)) < burnAt, 'blight lobes before burn');
  resetSpectrum();
});

test('THE SHARED CORNER: two chunks read the same words on their shared columns; the crossing is pure', () => {
  setFoldEnabled(true);
  // A disc straddling the border between chunk (0,0) and (1,0).
  setSpectrum([circle('seam', 'blight', 32, 14, 11)], []);
  const h0 = allocSpectrumHalo();
  const h1 = allocSpectrumHalo();
  assert.equal(spectrumHalo(0, 0, h0), true);
  assert.equal(spectrumHalo(CHUNK_SIZE, 0, h1), true);
  // Chunk 0's local tiles 30..33 are chunk 1's −2..1 — every axis.
  for (let axis = 0; axis < 4; axis++) {
    for (let ly = -2; ly <= CHUNK_SIZE + 1; ly++) {
      for (let lx = CHUNK_SIZE - 2; lx <= CHUNK_SIZE + 1; lx++) {
        assert.equal(
          h0[haloIndex(axis, lx, ly)],
          h1[haloIndex(axis, lx - CHUNK_SIZE, ly)],
          `axis ${axis} tile (${lx},${ly}) reads one word from both sides`,
        );
      }
    }
  }
  // The weighted crossing is a pure function of the two words and the
  // threshold: integer thresholds on quantised words, no hash, no
  // clock — the contour meets itself across the seam.
  assert.equal(foldCrossT(0, 255, BAND_TAKEN), BAND_TAKEN / 255);
  assert.equal(foldCrossT(255, 0, BAND_TAKEN), 1 - BAND_TAKEN / 255);
  assert.equal(foldCrossT(100, 200, 150), 0.5);
  assert.equal(foldCrossT(128, 0, BAND_TAKEN), 0.08, 'a barely-member corner still gets a run');
  assert.equal(foldCrossT(250, 240, BAND_TAKEN), 0.92, 'a neighbour that lost precedence lands the crossing near itself');
  assert.equal(foldCrossT(200, 200, BAND_TAKEN), 0.5, 'a flat edge crosses at the middle');
  // And the two bakes paint the SAME dual cells across the border: the
  // chunk edge (world x = 32) runs through the middle of dual column
  // I = 32, which chunk 0 traces as its cell i = 32 and chunk 1 as its
  // cell i = 0. Take the taken isoband's region path from each stream
  // (the meadow keeps it as a clip and never fills it, so a road band
  // across the seam fills it in the road's own taken key — the very
  // same path), split it into cells, keep the cells whose centre lies
  // in that column (the warp field can push a neighbouring column's
  // crossing a few px over the line, so the vertex alone cannot say),
  // shift chunk 1's by one chunk of pixels, and the two cell lists
  // must be identical: the contour meets itself across the seam.
  const seamRoad = (tx: number, ty: number): number => (ty >= 8 && ty <= 20 ? Tile.Path : Tile.Grass);
  const s0 = captureChunk(seamRoad, 0, 0);
  const s1 = captureChunk(seamRoad, 1, 0);
  const px = 32;
  const washCells = (stream: string, shift: number): string[] => {
    const region = pathFills(stream).find((f) => f.key === PATH_FOLD.wash[FOLD_BLIGHT]![0] && f.path.includes('Q('));
    assert.ok(region, 'the taken isoband is filled in the road');
    const m = [null, region!.path];
    const cells: string[] = [];
    let cur: string[] = [];
    const flush = (): void => {
      if (cur.length === 0) return;
      const xs: number[] = [];
      const shifted = cur.map((op) => {
        const nums = op.slice(op.indexOf('(') + 1, op.lastIndexOf(')'));
        if (nums === '') return op;
        const v = nums.split(',').map(Number);
        if (op.startsWith('R(')) {
          xs.push(v[0]! + shift, v[0]! + v[2]! + shift);
          return `R(${(v[0]! + shift).toFixed(6)},${v[1]!.toFixed(6)},${v[2]!.toFixed(6)},${v[3]!.toFixed(6)})`;
        }
        const out: string[] = [];
        for (let k = 0; k + 1 < v.length; k += 2) {
          xs.push(v[k]! + shift);
          out.push((v[k]! + shift).toFixed(6), v[k + 1]!.toFixed(6));
        }
        return `${op.slice(0, op.indexOf('('))}(${out.join(',')})`;
      });
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      if (Math.abs(mean - 32 * px) < 12) cells.push(shifted.join(';'));
      cur = [];
    };
    for (const op of m![1]!.split(';')) {
      if (op.startsWith('M(') || op.startsWith('R(')) flush();
      cur.push(op);
    }
    flush();
    return cells.sort();
  };
  const c0 = washCells(s0, 0);
  const c1 = washCells(s1, 32 * px);
  assert.ok(c0.length >= 8, `chunk 0 traces cells in the seam column (${c0.length})`);
  assert.deepEqual(c1, c0, 'the seam column cells agree across the border');
  resetSpectrum();
});

test('band edges are deterministic: the halo words are integers and band() steps on the thresholds', () => {
  setFoldEnabled(true);
  setSpectrum([circle('c', 'burn', 16, 16, 12)], []);
  const h = allocSpectrumHalo();
  spectrumHalo(0, 0, h);
  let counts = [0, 0, 0, 0];
  for (let i = 0; i < HALO_CELLS; i++) {
    const w = h[haloIndex(2, (i % HALO_N) - 2, Math.floor(i / HALO_N) - 2)]!;
    assert.equal(w, Math.trunc(w), 'a quantised word');
    assert.ok(w >= 0 && w <= 255);
    counts[band(w)]!++;
  }
  assert.ok(counts.every((c) => c > 0), `all four bands present in the disc's halo: ${counts.join('/')}`);
  assert.equal(band(BAND_TOUCHED - 1), 0);
  assert.equal(band(BAND_TOUCHED), 1);
  assert.equal(band(BAND_TAKEN), 2);
  assert.equal(band(BAND_HELD), 3);
  counts = [];
  resetSpectrum();
});

test('the elevated bake folds with the same closures', () => {
  setFoldEnabled(true);
  setSpectrum([circle('c', 'blight', 16, 16, 12)], []);
  const lifted = (tx: number, ty: number): number => (tx >= 6 && tx <= 26 && ty >= 6 && ty <= 26 ? 1 : 0);
  ops.length = 0;
  const e = bakeElevated(grass, detail, lifted, 0, 0, 32, 1);
  assert.ok(e !== null);
  const s = ops.join('\n');
  assert.ok(s.includes(`fillStyle=${JSON.stringify(washKey(FOLD_BLIGHT, 3))}`), 'the terrace wears the wash');
  assert.ok(s.includes(`fillStyle=${JSON.stringify(SUBSTRATE_FOLD[FOLD_BLIGHT]![0]![0])}`), 'and the folded substrate');
  resetSpectrum();
  ops.length = 0;
  const bare = bakeElevated(grass, detail, lifted, 0, 0, 32, 1);
  assert.ok(bare !== null);
  assert.ok(!ops.join('\n').includes(`fillStyle=${JSON.stringify(washKey(FOLD_BLIGHT, 3))}`));
});

test('the sliced job carries its keys: sig 0 adds no step; a folded job adds the wash steps and the release', () => {
  setFoldEnabled(true);
  resetSpectrum();
  const bare = terrain.startChunkBake(grass, detail, elev, 0, 0, 32);
  assert.equal(bare.spectrumSig, 0);
  assert.equal(bare.spectrumHaloSig, 0);
  setSpectrum([circle('c', 'burn', 16, 16, 12)], []);
  const folded = terrain.startChunkBake(grass, detail, elev, 0, 0, 32);
  assert.notEqual(folded.spectrumSig, 0);
  assert.notEqual(folded.spectrumHaloSig, 0);
  assert.equal(folded.spectrumSig, foldSigFor(0, 0));
  assert.equal(folded.spectrumHaloSig, foldHaloSigFor(0, 0));
  // Two wash bands (burn taken, held) + the halo's release step.
  assert.equal(folded.steps.length, bare.steps.length + 3);
  while (!terrain.stepChunkBake(folded)) { /* run out */ }
  while (!terrain.stepChunkBake(bare)) { /* run out */ }
  resetSpectrum();
});

test('THE PALETTE LAWS: value near the meadow, the four-role order, blight never black, wash = substrate', () => {
  assert.equal(SUBSTRATE_FOLD.length, FOLD_LOOK_COUNT);
  for (let look = 1; look < FOLD_LOOK_COUNT; look++) {
    assert.equal(SUBSTRATE_FOLD[look]!.length, 3, 'three bands per look');
    for (let b = 0; b < 3; b++) {
      const t = SUBSTRATE_FOLD[look]![b]!;
      assert.equal(t.length, 4);
      for (const key of t) {
        assert.match(key, /^#[0-9a-f]{6}$/, `flat #rrggbb key ${key}`);
        const L = lum(key);
        // Near GRASS_TONES in value: THE LADDER's deepest held tone sits
        // ~27 under the meadow, the cold lifts; nothing sinks into a hole.
        assert.ok(L >= GRASS_LUM - 30 && L <= GRASS_LUM + 40, `${key} (look ${look} band ${b + 1}) lum ${L.toFixed(0)} vs meadow ${GRASS_LUM.toFixed(0)}`);
      }
      // The four-role order GRASS_TONES keeps: darkest ≤ darker ≤ base ≤ lighter.
      assert.ok(lum(t[3]) <= lum(t[1]) && lum(t[1]) <= lum(t[0]) && lum(t[0]) <= lum(t[2]), `role order in ${t.join(' ')}`);
      // The wash key IS the substrate's own base; its lobe key is a
      // dedicated row a clear step below (never the dither role).
      if (b >= 1) {
        assert.equal(washKey(look, b + 1), t[0]);
        assert.equal(washAltKey(look, b + 1), WASH_ALT[look]![b - 1]);
        const lobe = washAltKey(look, b + 1);
        assert.match(lobe, /^#[0-9a-f]{6}$/);
        assert.ok(!t.includes(lobe), `lobe ${lobe} is not a dither role of band ${b + 1}`);
        assert.ok(lum(lobe) <= lum(t[0]) - (b === 1 ? 10 : 8), `lobe ${lobe} (${lum(lobe).toFixed(0)}) sits ≥ ${b === 1 ? 10 : 8} under band ${b + 1}'s base ${t[0]} (${lum(t[0]).toFixed(0)})`);
        assert.ok(lum(lobe) >= GRASS_LUM - 36, `lobe ${lobe} never a hole`);
      }
      // The fringe accent stands above the band's lighter tone.
      assert.ok(lum(FRINGE_ALT[look]![b]!) > lum(t[2]), `fringe accent ${FRINGE_ALT[look]![b]} lifts over ${t[2]}`);
    }
    // Bands deepen or drift, never flip back to summer: no fold tone
    // equals a GRASS_TONES entry.
    for (const t of SUBSTRATE_FOLD[look]!) for (const key of t) assert.ok(!GRASS_TONES.includes(key), `${key} is not a summer key`);
  }
  // Blight is never black; burn's ash-grey is grey, not char.
  for (const t of SUBSTRATE_FOLD[FOLD_BLIGHT]!) for (const key of t) assert.ok(minChannel(key) >= 0x50, `${key} never black`);
  for (const key of WASH_ALT[FOLD_BLIGHT]!) assert.ok(minChannel(key) >= 0x48, `${key} lobe never black`);
  for (const key of SUBSTRATE_FOLD[FOLD_BURN]![2]!) assert.ok(minChannel(key) >= 0x58, `${key} ash, not char`);
  // THE LADDER: the sickening looks step DOWN in value by band — the
  // first cut's iso-luminant bands (Δ ≤ 5 across all three) read as one
  // flat tinted circle at zoom 1.3; hue alone does not carry a band.
  for (const look of [FOLD_BLIGHT, FOLD_BURN]) {
    const [touched, taken, held] = SUBSTRATE_FOLD[look]!.map((t) => lum(t[0]));
    assert.ok(touched! <= GRASS_LUM - 2, `look ${look} touched (${touched!.toFixed(0)}) sits under the meadow`);
    assert.ok(taken! <= touched! - 3, `look ${look} taken (${taken!.toFixed(0)}) a step under touched`);
    assert.ok(held! <= taken! - 7, `look ${look} held (${held!.toFixed(0)}) a clear step under taken`);
  }
  assert.equal(WASH_ALT.length, FOLD_LOOK_COUNT);
  // The stubble inks stay lighter than the ground (the turf floor law):
  // every folded fleck is a lift over its own base tone.
  for (let look = 1; look < FOLD_LOOK_COUNT; look++) {
    for (const ink of STUBBLE_INK[look]!) {
      const m = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(ink)!;
      const L = 0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3]);
      assert.ok(L > lum(SUBSTRATE_FOLD[look]![2]![2]), `stubble ${ink} lifts over look ${look}'s lightest held tone`);
    }
  }
  assert.equal(FOLD_NONE, 0);
  assert.deepEqual([FOLD_AUTUMN, FOLD_SPRING, FOLD_BLIGHT, FOLD_BURN], [1, 2, 3, 4]);
});

test('THE LANES: wash lanes and their sub-lanes never collide with a layer seed or its sub-lanes', () => {
  const seeds = terrain.blobLayerSeeds();
  const taken = new Set<number>();
  for (const s of seeds) {
    taken.add(s);
    taken.add(s + 64);
    taken.add(s + 96);
  }
  assert.ok(FOLD_LANE_BASE >= Math.max(...seeds) + 97, 'the fold base clears every layer sub-lane');
  const mine = new Set<number>();
  for (let look = 1; look < FOLD_LOOK_COUNT; look++) {
    for (const b of [1, 2, 3]) {
      const lane = foldLaneSeed(look, b);
      assert.ok(!taken.has(lane), `lane ${lane} is free`);
      assert.ok(!taken.has(lane + 64), `alt sub-lane ${lane + 64} is free`);
      assert.ok(!mine.has(lane) && !mine.has(lane + 64), `lane ${lane} unique among the wash lanes`);
      mine.add(lane);
      mine.add(lane + 64);
    }
  }
  assert.deepEqual(
    [foldLaneSeed(FOLD_AUTUMN, 2), foldLaneSeed(FOLD_AUTUMN, 3), foldLaneSeed(FOLD_BURN, 3)],
    [198, 199, 211],
    'the lane numbers the report names',
  );
  assert.equal(new Set(FOLD_ALT_SALT.slice(1)).size, 4, 'four distinct alt salts');
});

test('NO CLOCK REACHES A PAINTED VALUE: the fold section and the palette read no clock, no Math.random', () => {
  const raw = readFileSync(fileURLToPath(new URL('./terrain.ts', import.meta.url)), 'utf8');
  // Comments may NAME the law; the code may not read the clock.
  const code = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const a = raw.indexOf('// ------------------------------------------------ THE FOLD (LG-1)');
  const z = raw.indexOf('// ------------------------------------------------ END OF THE FOLD');
  assert.ok(a > 0 && z > a, 'the fold section is fenced');
  const section = code(raw.slice(a, z));
  assert.ok(section.length > 4000, 'the section is the painter side, not a stub');
  const CLOCKS = [/\bDate\b/, /\bperformance\b/, /Math\.random/, /\bsetTimeout\b/, /\brequestAnimationFrame\b/];
  for (const bad of CLOCKS) assert.doesNotMatch(section, bad, `fold section reads ${bad}`);
  // The marks and the fringe fold live outside the fence; lint them too.
  const marks = code(raw.slice(raw.indexOf('function drawFieldMarks('), raw.indexOf('function drawTileDetail(')));
  assert.ok(marks.length > 1000);
  for (const bad of CLOCKS) assert.doesNotMatch(marks, bad, `field marks read ${bad}`);
  const fringe = code(raw.slice(raw.indexOf('function drawGrassFringe('), raw.indexOf('function computeLayerIdx(')));
  for (const bad of CLOCKS) assert.doesNotMatch(fringe, bad, `the fringe reads ${bad}`);
  const skinsRaw = readFileSync(fileURLToPath(new URL('./foldSkins.ts', import.meta.url)), 'utf8');
  for (const bad of [...CLOCKS, /\bnew Function\b/]) assert.doesNotMatch(code(skinsRaw), bad);
  // The content boundary on the palette's words (comments included).
  assert.doesNotMatch(skinsRaw, /witch|coven|warlock|demon|devil|infernal|occult|\bhell\b/i);
});

test('the renderer keys its cache on the sig (source pin) and gates the fold on the plane and the flag', () => {
  const src = readFileSync(fileURLToPath(new URL('./renderer.ts', import.meta.url)), 'utf8');
  assert.match(src, /spectrumSig\?: number;/, 'BakedChunk.spectrumSig');
  assert.match(src, /spectrumHaloSig\?: number;/, 'BakedChunk.spectrumHaloSig');
  assert.match(src, /setFoldEnabled\(this\.livingGroundOn && !game\.plane\.underground\)/, 'the gate latches plane + flag');
  assert.match(src, /LIVING_GROUND_OFF/, 'the bisect flag');
  // THE HALL'S OWN RULER (LG-2): the museum's stroke set is keyed on
  // the plane by the same per-frame latch, right beside the gate.
  assert.match(
    src,
    /setFoldEnabled\(this\.livingGroundOn && !game\.plane\.underground\);[\s\S]{0,400}setSpectrumPlane\(game\.plane\.id\);/,
    'the hall latch stands beside the gate',
  );
  const fringe = src.slice(src.indexOf('private fringeSpecFor('), src.indexOf('fringeProof('));
  assert.match(fringe, /spectrumSig \?\? 0\) !== foldSigFor\(cx, cy\)\) return null/, 'a sig mismatch is never a strip');
  assert.match(src, /entry\.spectrumSig = p\.job\.spectrumSig/, 'completion adopts the job key');
});

// ------------------------------------------------ THE MATERIALS FOLD (LG-2)
// Plan §12.3 step 3, §12.8 LG-2. The three doors (the hem fill per
// dual cell, the isoband re-keyed inside the region, the run inks at
// the midpoint) and their laws: zero strokes is still the golden (the
// tests above), a folded material paints its own keys and never
// another material's, the contour runs across a road edge as ONE line
// (the phantom-boundary law), the hem agrees across a chunk seam, a
// run wears one ink, and every key keeps the material's own value.

const lumRgba = (ink: string): number => {
  const m = /rgba?\((\d+), (\d+), (\d+)/.exec(ink);
  assert.ok(m, `an rgb(a) ink: ${ink}`);
  return 0.299 * Number(m![1]) + 0.587 * Number(m![2]) + 0.114 * Number(m![3]);
};

/** A meadow with one road band (Path, rows 14..16) and a dirt yard. */
function roadWorld(tx: number, ty: number): number {
  if (ty >= 14 && ty <= 16) return Tile.Path;
  if (Math.hypot(tx - 8, ty - 24) < 4) return Tile.Dirt;
  return Tile.Grass;
}

/** Every (fillStyle, path-fill) pair of a stream, in order. */
function pathFills(stream: string): Array<{ key: string; path: string; at: number }> {
  const out: Array<{ key: string; path: string; at: number }> = [];
  let key = '';
  const lines = stream.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const op = lines[i]!;
    const fs = /\.fillStyle=(".*")$/.exec(op);
    if (fs) {
      key = JSON.parse(fs[1]!) as string;
      continue;
    }
    const f = /\.fill\(path\[(.*)\]\)$/.exec(op);
    if (f) out.push({ key, path: f[1]!, at: i });
  }
  return out;
}

test('THE MATERIALS FOLD: a folded world paints every material in its own keys, deterministically', () => {
  setFoldEnabled(true);
  setSpectrum([circle('gloom', 'blight', 16, 16, 15)], []);
  const a = captureChunk(fixtureGround, 0, 0);
  const b = captureChunk(fixtureGround, 0, 0);
  assert.equal(sha(a), sha(b), 'two bakes agree');
  const has = (k: string): boolean => a.includes(`fillStyle=${JSON.stringify(k)}`);
  const stroked = (k: string): boolean => a.includes(`strokeStyle=${JSON.stringify(k)}`);
  // THE HEM: the dirt yard and the road read their blight hem pair.
  assert.ok(has(DIRT_FOLD.hem[FOLD_BLIGHT]![0]), 'dirt hem fill');
  assert.ok(has(DIRT_FOLD.hem[FOLD_BLIGHT]![1]), 'dirt hem alt');
  assert.ok(has(PATH_FOLD.hem[FOLD_BLIGHT]![0]), 'path hem fill');
  // THE WASH: the taken key, its lobes and the held film inside.
  assert.ok(has(PATH_FOLD.wash[FOLD_BLIGHT]![0]!), 'path wash taken');
  assert.ok(has(PATH_FOLD.wash[FOLD_BLIGHT]![1]!), 'path wash lobes');
  assert.ok(has(PATH_FOLD.wash[FOLD_BLIGHT]![2]!), 'path wash held');
  // THE RUNS: a blighted run wears the look's worn band and lip.
  assert.ok(stroked(PATH_FOLD.run![FOLD_BLIGHT]![0].band!) || stroked(PATH_FOLD.run![FOLD_BLIGHT]![1].band!), 'path band re-inked');
  assert.ok(stroked(PATH_FOLD.run![FOLD_BLIGHT]![0].lip!) || stroked(PATH_FOLD.run![FOLD_BLIGHT]![1].lip!), 'path lip re-inked');
  // The bank face under blight, close in value; the water fill never folds.
  assert.ok(stroked(BANK_FACE_FOLD[FOLD_BLIGHT]![0]!) || stroked(BANK_FACE_FOLD[FOLD_BLIGHT]![1]!), 'the bank face bruises');
  assert.ok(has('#649cc0') && has('#4979b8'), 'the shallows and open water keep their fill keys');
  // No other look's material keys leak in.
  for (const look of [FOLD_AUTUMN, FOLD_SPRING, FOLD_BURN]) {
    const hem = DIRT_FOLD.hem[look];
    if (hem) assert.ok(!has(hem[0]), `dirt look ${look} hem must not paint under blight`);
    const wash = DIRT_FOLD.wash[look];
    if (wash && wash[0]) assert.ok(!has(wash[0]), `dirt look ${look} wash must not paint under blight`);
  }
  // Unfolded, none of it.
  resetSpectrum();
  const bare = captureChunk(fixtureGround, 0, 0);
  for (const k of [DIRT_FOLD.hem[FOLD_BLIGHT]![0], PATH_FOLD.wash[FOLD_BLIGHT]![0]!, PATH_FOLD.wash[FOLD_BLIGHT]![2]!]) {
    assert.ok(!bare.includes(`fillStyle=${JSON.stringify(k)}`), `${k} is a fold key only`);
  }
  assert.ok(!bare.includes(`strokeStyle=${JSON.stringify(BANK_FACE_FOLD[FOLD_BLIGHT]![0]!)}`));
});

test('the shallows scum under blight in lobes and never re-fill; snow folds only under burn', () => {
  setFoldEnabled(true);
  const lake = (tx: number, ty: number): number => (Math.hypot(tx - 16, ty - 16) < 13 ? Tile.WaterShallow : Tile.Grass);
  setSpectrum([circle('gloom', 'blight', 16, 16, 15)], []);
  const s = captureChunk(lake, 0, 0);
  assert.ok(s.includes(`fillStyle=${JSON.stringify(SHALLOWS_FOLD.wash[FOLD_BLIGHT]![1]!)}`), 'scum lobes');
  assert.ok(s.includes(`fillStyle=${JSON.stringify(SHALLOWS_FOLD.wash[FOLD_BLIGHT]![2]!)}`), 'the held film');
  assert.equal(SHALLOWS_FOLD.wash[FOLD_BLIGHT]![0], null, 'the shallows never re-fill');
  assert.ok(SHALLOWS_FOLD.hem.every((h) => h === null), 'the shallows fill never folds');
  const drift = (tx: number, ty: number): number => (Math.hypot(tx - 16, ty - 16) < 13 ? Tile.Snow : Tile.Grass);
  // The plateau must reach the drift's edge (r 40 → plateau 20 > the
  // drift's 13): a run in the hem band holds its own ink by law.
  setSpectrum([circle('ash', 'burn', 16, 16, 40)], []);
  const burnt = captureChunk(drift, 0, 0);
  assert.ok(burnt.includes(`fillStyle=${JSON.stringify(SNOW_FOLD.wash[FOLD_BURN]![0]!)}`), 'soot-dusted snow');
  // THE RUNS on a laden layer: the settling shade and the crest take
  // the look's ink at the run's midpoint (a sooted blanket settles
  // ash-warm, its crest dims) — the same run count, re-inked.
  const sootRuns = SNOW_FOLD.run![FOLD_BURN]!;
  const stroked = (s: string, ink: string): boolean => s.includes(`strokeStyle=${JSON.stringify(ink)}`);
  assert.ok(stroked(burnt, sootRuns[0].laden!) || stroked(burnt, sootRuns[1].laden!), 'the laden shade re-inks under burn');
  assert.ok(stroked(burnt, sootRuns[0].crest!) || stroked(burnt, sootRuns[1].crest!), 'the crest re-inks under burn');
  const ladenStrokes = (s: string): number =>
    (s.match(/strokeStyle="rgba\((126, 146, 188, 0\.3|110, 104, 112, 0\.3|96, 90, 96, 0\.34)\)"/g) ?? []).length;
  resetSpectrum();
  const bareDrift = captureChunk(drift, 0, 0);
  assert.equal(ladenStrokes(burnt), ladenStrokes(bareDrift), 'the same laden runs, re-inked');
  setSpectrum([circle('cold', 'season', 16, 16, 15, 1)], []);
  const cold = captureChunk(drift, 0, 0);
  assert.ok(cold.includes('fillStyle="#e9edf3"'), 'snow keeps its key');
  assert.ok(stroked(cold, 'rgba(126, 146, 188, 0.3)') && !stroked(cold, sootRuns[0].laden!), 'the cold keeps the blue shade');
  assert.ok(SNOW_FOLD.hem.every((h) => h === null) && SNOW_FOLD.wash.slice(0, 4).every((w) => w === null), 'snow is a winter no-op');
  assert.ok(SNOW_FOLD.run!.slice(0, 4).every((r) => r === null), 'snow re-inks no run but under burn');
  resetSpectrum();
});

test('THE PHANTOM BOUNDARY: the wash contour runs across the road edge as ONE line (the same path, re-keyed)', () => {
  setFoldEnabled(true);
  setSpectrum([circle('gloom', 'blight', 16, 15, 12)], []);
  const s = captureChunk(roadWorld, 0, 0);
  const fills = pathFills(s);
  // The meadow's lobes: the path fills carrying bows in the lobe keys.
  const lobes = fills.find((f) => f.key === washAltKey(FOLD_BLIGHT, 2) && f.path.includes('Q('));
  assert.ok(lobes, 'the meadow taken lobes');
  const held = fills.find((f) => f.key === washAltKey(FOLD_BLIGHT, 3) && f.path.includes('Q('));
  assert.ok(held, 'the meadow held lobes');
  // The road's in-region wash: the very same lobe paths, filled later
  // with the road's own lobe keys — no second contour was traced.
  const roadLobes = fills.find((f) => f.key === PATH_FOLD.wash[FOLD_BLIGHT]![1] && f.path === lobes!.path);
  assert.ok(roadLobes, 'the road lobes are the same shapes');
  assert.ok(roadLobes!.at > lobes!.at, 'after the meadow, inside the skin');
  assert.ok(fills.some((f) => f.key === PATH_FOLD.wash[FOLD_BLIGHT]![2] && f.path === held!.path), 'the road held lobes are the same shapes');
  // The road's taken fill and its hem fill are contoured (bowed)
  // paths in the road's own keys — the isobands' regions, which the
  // meadow keeps as clips and never fills.
  const roadTaken = fills.find((f) => f.key === PATH_FOLD.wash[FOLD_BLIGHT]![0] && f.path.includes('Q('));
  assert.ok(roadTaken, 'the road fills the taken isoband in its own key');
  assert.ok(!fills.some((f) => f.path === roadTaken!.path && f.key === washKey(FOLD_BLIGHT, 2)), 'the meadow never flat-fills the isoband');
  const roadHem = fills.find((f) => f.key === PATH_FOLD.hem[FOLD_BLIGHT]![0] && f.path.includes('Q('));
  assert.ok(roadHem, 'the road fills the touched contour with its hem key');
  assert.ok(roadHem!.at < roadTaken!.at, 'the hem under the wash');
  // The road's wash is clipped inside the road: a clip op precedes it.
  const lines = s.split('\n');
  const clipBefore = (at: number): number => lines.slice(0, at).map((l, i) => (l.includes('.clip(') ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
  assert.ok(clipBefore(roadLobes!.at) > lobes!.at, 'the in-region wash is clipped');
  assert.ok(clipBefore(roadHem!.at) > 0, 'the hem is clipped');
  resetSpectrum();
});

test('THE SHARED CORNER on a material: the road hem agrees across the chunk seam', () => {
  setFoldEnabled(true);
  setSpectrum([circle('seam', 'blight', 32, 15, 9, 1, { soft: 0.9 })], []);
  const px = 32;
  const s0 = captureChunk(roadWorld, 0, 0);
  const s1 = captureChunk(roadWorld, 1, 0);
  const keys = new Set(['#c2a26e', PATH_FOLD.hem[FOLD_BLIGHT]![0]]);
  // The road's per-cell fills (its own key) and the touched contour's
  // cells (the hem key's union, split back into its cells) — both must
  // agree across the seam.
  const seamCells = (stream: string, shift: number): string[] => {
    const cells: string[] = [];
    const pieces: Array<{ key: string; path: string }> = [];
    for (const f of pathFills(stream)) {
      if (!keys.has(f.key)) continue;
      if (f.key === '#c2a26e') {
        pieces.push(f);
        continue;
      }
      let cur: string[] = [];
      for (const op of f.path.split(';')) {
        if ((op.startsWith('M(') || op.startsWith('R(')) && cur.length > 0) {
          pieces.push({ key: f.key, path: cur.join(';') });
          cur = [];
        }
        cur.push(op);
      }
      if (cur.length > 0) pieces.push({ key: f.key, path: cur.join(';') });
    }
    for (const f of pieces) {
      const xs: number[] = [];
      const shifted = f.path.split(';').map((op) => {
        const nums = op.slice(op.indexOf('(') + 1, op.lastIndexOf(')'));
        if (nums === '') return op;
        const v = nums.split(',').map(Number);
        if (op.startsWith('R(')) {
          xs.push(v[0]! + shift, v[0]! + v[2]! + shift);
          return `R(${(v[0]! + shift).toFixed(6)},${v[1]!.toFixed(6)},${v[2]!.toFixed(6)},${v[3]!.toFixed(6)})`;
        }
        const out: string[] = [];
        for (let k = 0; k + 1 < v.length; k += 2) {
          xs.push(v[k]! + shift);
          out.push((v[k]! + shift).toFixed(6), v[k + 1]!.toFixed(6));
        }
        return `${op.slice(0, op.indexOf('('))}(${out.join(',')})`;
      });
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      if (Math.abs(mean - 32 * px) < 12) cells.push(`${f.key}|${shifted.join(';')}`);
    }
    return cells.sort();
  };
  const c0 = seamCells(s0, 0);
  const c1 = seamCells(s1, 32 * px);
  assert.ok(c0.length >= 3, `the road crosses the seam (${c0.length} cells)`);
  assert.ok(c0.some((c) => c.startsWith(PATH_FOLD.hem[FOLD_BLIGHT]![0])), 'the seam column is in the hem somewhere');
  assert.deepEqual(c1, c0, 'the folded road cells agree across the border, key for key');
  resetSpectrum();
});

test('THE RUNS: one ink per stroke, read once at the midpoint; the fold re-inks and never adds (source pin)', () => {
  const raw = readFileSync(fileURLToPath(new URL('./terrain.ts', import.meta.url)), 'utf8');
  const skin = raw.slice(raw.indexOf('function paintLayerSkin('), raw.indexOf('// The paint sun'));
  assert.equal((skin.match(/foldRunAt\(/g) ?? []).length, 1, 'the midpoint is read once per run');
  assert.match(skin, /const fw = fold !== null && layer\.fold !== undefined \? foldRunAt\(fold, baseX, baseY, mid\[0\], mid\[1\]\) : 0;/);
  assert.match(skin, /const bandInk = ink\?\.band \?\? layer\.band;/);
  assert.match(skin, /const lipInk = ink\?\.lip \?\? layer\.lip;/);
  // The strokes still gate on the layer's OWN band / lip: no new stroke.
  assert.match(skin, /if \(layer\.band !== null\) \{/);
  assert.match(skin, /if \(layer\.lip !== undefined && sunDot > 0\.25\) \{/);
  assert.match(skin, /\(layer\.band !== null \|\| layer\.lip !== undefined \|\| layer\.laden \|\| layer\.bank\)/);
  // The cell fill is the layer's own key (never a per-cell hem read);
  // the hem fills the touched contour after the loop, the wash paints
  // inside the region — and only where the layer stands (THE FOLD
  // PAYS ONLY WHERE THE LAYER STANDS).
  assert.match(skin, /const col = layer\.color\(0, I, J\);\s+ctx\.fillStyle = col;/);
  assert.doesNotMatch(skin, /const hem = foldHemAt\(layer, fold, baseX, baseY, I, J\);\s+const col/);
  assert.match(skin, /if \(fold !== null && anyCell\) paintLayerHem\(ctx, layer, fold, region, baseX, baseY, px, toX, toY\);/);
  assert.match(skin, /if \(fold !== null && anyCell\) paintLayerFold\(ctx, layer, fold, region\);/);
  assert.ok(skin.indexOf('paintLayerHem(') < skin.indexOf('paintAltPatches('), 'the hem under the alt patches');
  // A folded bake strokes exactly as many runs as an unfolded one on the
  // same world: count the band strokes of the road (every stroke of
  // the worn band sets its ink first; the fold changes the ink only).
  setFoldEnabled(true);
  resetSpectrum();
  const bare = captureChunk(roadWorld, 0, 0);
  setSpectrum([circle('gloom', 'blight', 16, 15, 12)], []);
  const folded = captureChunk(roadWorld, 0, 0);
  const bandStrokes = (stream: string): number =>
    (stream.match(/strokeStyle="rgba\((105, 78, 44, 0\.3|78, 62, 78, 0\.32|70, 54, 78, 0\.36)\)"/g) ?? []).length;
  assert.equal(bandStrokes(folded), bandStrokes(bare), 'the same runs, re-inked');
  resetSpectrum();
});

test('the elevated bake folds its materials with the same doors', () => {
  setFoldEnabled(true);
  setSpectrum([circle('gloom', 'blight', 16, 16, 12)], []);
  const yard = (tx: number, ty: number): number => (Math.hypot(tx - 16, ty - 16) < 6 ? Tile.Dirt : Tile.Grass);
  const lifted = (tx: number, ty: number): number => (tx >= 6 && tx <= 26 && ty >= 6 && ty <= 26 ? 1 : 0);
  ops.length = 0;
  const e = bakeElevated(yard, detail, lifted, 0, 0, 32, 1);
  assert.ok(e !== null);
  const s = ops.join('\n');
  assert.ok(s.includes(`fillStyle=${JSON.stringify(DIRT_FOLD.wash[FOLD_BLIGHT]![0]!)}`), 'the terrace yard wears its wash');
  assert.ok(s.includes(`fillStyle=${JSON.stringify(DIRT_FOLD.hem[FOLD_BLIGHT]![0])}`), 'and its hem');
  resetSpectrum();
});

test('THE PALETTE LAWS on the materials: every key keeps the material\'s value, never black, lips lift, bands sink', () => {
  const layers = terrain.blobLayerFolds();
  const folded = layers.filter((l) => l.fold !== null);
  assert.equal(folded.length, 10, 'ten materials fold');
  // The museum wing shows exactly the materials that fold.
  const shown = new Set<number>(MUSEUM_FOLD_MATERIALS);
  for (const l of folded) assert.ok(MUSEUM_FOLD_MATERIALS.some((t) => l.match(t)), `layer seed ${l.seed} has a museum row`);
  for (const t of shown) assert.ok(folded.some((l) => l.match(t)), `museum tile ${t} folds`);
  // Open water and planks hold.
  for (const t of [Tile.Water, Tile.WaterDeep, Tile.WoodFloor, Tile.CaveFloor]) {
    assert.equal(layers.find((l) => l.match(t))!.fold, null, `tile ${t} is foldable: false`);
  }
  for (const l of folded) {
    const base = lum(l.base);
    const f = l.fold!;
    assert.equal(f.hem.length, FOLD_LOOK_COUNT);
    assert.equal(f.wash.length, FOLD_LOOK_COUNT);
    assert.equal(f.hem[FOLD_NONE], null);
    assert.equal(f.wash[FOLD_NONE], null);
    const keys: string[] = [];
    for (let look = 1; look < FOLD_LOOK_COUNT; look++) {
      const hem = f.hem[look];
      if (hem) keys.push(hem[0], hem[1]);
      const wash = f.wash[look];
      if (wash) for (const k of wash) if (k !== null) keys.push(k);
      const run = f.run?.[look];
      if (run) {
        for (const ink of run) {
          if (ink.band) assert.ok(lumRgba(ink.band) < base, `${ink.band} sinks under ${l.base}`);
          if (ink.lip) assert.ok(lumRgba(ink.lip) > base, `${ink.lip} lifts over ${l.base}`);
          // The laden pair is Snow's alone: the shade sinks under the
          // blanket, the crest lifts over the look's own wash.
          if (ink.laden) assert.ok(l.match(Tile.Snow) && lumRgba(ink.laden) < base, `${ink.laden} is a laden shade`);
          if (ink.crest) assert.ok(l.match(Tile.Snow) && lumRgba(ink.crest) > lum(wash![0]!), `${ink.crest} lifts over the wash`);
        }
      }
    }
    assert.ok(keys.length > 0, `layer seed ${l.seed} folds somewhere`);
    for (const k of keys) {
      assert.match(k, /^#[0-9a-f]{6}$/, `flat #rrggbb key ${k}`);
      const L = lum(k);
      assert.ok(Math.abs(L - base) <= 42, `${k} lum ${L.toFixed(0)} within the ladder of ${l.base} (${base.toFixed(0)})`);
      // Never black: no key sinks its darkest channel under six tenths
      // of the material's own (worked earth is dark earth), and none
      // reaches the char floor.
      assert.ok(minChannel(k) >= Math.max(0x28, Math.round(minChannel(l.base) * 0.6)), `${k} never black under ${l.base}`);
      assert.notEqual(k, l.base, `${k} is a fold key, not the base`);
    }
    // THE LADDER per material: the hem fill a clear step from the base,
    // the taken fill past it, the lobes past that, the held lobes past
    // those — half-steps on the dark floors (half the headroom).
    const step = base < 90 ? 0.5 : 1;
    for (let look = 1; look < FOLD_LOOK_COUNT; look++) {
      const hem = f.hem[look];
      if (hem) assert.ok(Math.abs(lum(hem[0]) - base) >= 7 * step, `hem ${hem[0]} (${lum(hem[0]).toFixed(0)}) steps from ${l.base} (${base.toFixed(0)})`);
      const wash = f.wash[look];
      if (!wash) continue;
      const [taken, lobe, heldLobe] = wash;
      if (taken !== null) assert.ok(Math.abs(lum(taken) - base) >= 12 * step, `taken ${taken} (${lum(taken).toFixed(0)}) a clear step from ${l.base}`);
      if (taken !== null && lobe !== null) assert.ok(Math.abs(lum(lobe) - lum(taken)) >= 9 * step, `lobe ${lobe} a step past taken ${taken}`);
      if (lobe !== null && heldLobe !== null) assert.ok(Math.abs(lum(heldLobe) - lum(lobe)) >= 7 * step, `held lobe ${heldLobe} a step past lobe ${lobe}`);
      if (taken === null && lobe === null && heldLobe !== null) assert.ok(Math.abs(lum(heldLobe) - base) >= 8 * step, `held-only ${heldLobe} a clear step from ${l.base}`);
    }
    if (f.run) {
      assert.equal(f.run.length, FOLD_LOOK_COUNT);
      assert.equal(f.run[FOLD_NONE], null);
    }
  }
  // The bank faces stay close in value to the living faces (#5f4a33 … #8695ac).
  for (const pair of BANK_FACE_FOLD) {
    if (!pair) continue;
    for (const k of pair) if (k) assert.ok(lum(k) >= 60 && lum(k) <= 150, `bank face ${k} close in value`);
  }
  // Spring reaches only the marsh.
  for (const l of folded) {
    const spring = l.fold!.hem[FOLD_SPRING] !== null || l.fold!.wash[FOLD_SPRING] !== null;
    assert.equal(spring, l.match(Tile.Swamp), `spring on layer seed ${l.seed}`);
  }
});

// ------------------------------------------------ THE STRIP JOB (LG-1)
// Plan §12.3 step 2: the wash runs WHOLE, never strip-narrowed. A
// fringe job (THE STRIP PAINTS ASIDE) narrows the meadow to its border
// rects and copies only those rects back; the wash's contour phases
// along multi-cell runs exactly like the skins', so it must trace the
// SAME region in a strip job as in a full bake or the strip would
// carry a jogged contour into the border. Proven on a stroke that
// straddles the chunk border — the case the live probe would drive.

test('THE WASH RUNS WHOLE: a strip job traces the same wash paths as the full bake, with a stroke across the border', () => {
  setFoldEnabled(true);
  setSpectrum([circle('seam', 'blight', 32, 14, 11)], []);
  const full = captureChunk(grass, 0, 0);
  // The east edge changed (the neighbour across x = 32): a strip job
  // over a prior complete bake of the same data.
  ops.length = 0;
  canvasN = 0;
  gradN = 0;
  const doc = (globalThis as unknown as { document: { createElement: (t: string) => HTMLCanvasElement } }).document;
  const copyFrom = doc.createElement('canvas');
  const job = terrain.startChunkBake(grass, detail, elev, 0, 0, 32, undefined, false, null, { mask: 8, copyFrom });
  assert.notEqual(job.spectrumSig, 0, 'the strip job carries the reach sig');
  while (!terrain.stepChunkBake(job)) { /* run out */ }
  const strip = ops.join('\n');
  // Every bow-carrying path fill, in order: on an all-grass chunk these
  // are exactly the taken lobes and the held lobes (the isobands are
  // clips, never fills; no skin traces a contour here).
  const washPaths = (s: string): string[] => [...s.matchAll(/\.fill\(path\[([^\]]*Q\([^\]]*)\]\)/g)].map((m) => m[1]!);
  const a = washPaths(full);
  const b = washPaths(strip);
  assert.equal(a.length, 2, `the full bake paints the two lobe unions (${a.length})`);
  assert.deepEqual(b, a, 'the strip job paints the very same two paths — whole, never narrowed');
  // And the economy still holds around it: the strip job's meadow is
  // narrowed to its rects (fewer paint cells than the full bake).
  const cells = (s: string): number => (s.match(/\.fillRect\(/g) ?? []).length;
  assert.ok(cells(strip) < cells(full), `the strip narrows the meadow (${cells(strip)} < ${cells(full)})`);
  resetSpectrum();
});

test('THE PLAQUE TELLS THE TRUTH: the museum\'s hold table is exactly what foldSkins answers, pair for pair', () => {
  const layers = terrain.blobLayerFolds();
  const lookIndex = (look: { axis: string; amp: number }): number =>
    look.axis === 'burn' ? FOLD_BURN
    : look.axis === 'blight' ? FOLD_BLIGHT
    : look.amp > 0 ? FOLD_AUTUMN
    : FOLD_SPRING;
  let holds = 0;
  for (const tile of MUSEUM_FOLD_MATERIALS) {
    const layer = layers.find((l) => l.match(tile));
    assert.ok(layer && layer.fold, `museum tile ${tile} folds`);
    const f = layer!.fold!;
    for (const look of MUSEUM_FOLD_LOOKS) {
      const k = lookIndex(look);
      const run = f.run?.[k];
      const runAnswers = run !== null && run !== undefined && run.some((ink) => Object.values(ink).some((v) => v !== undefined));
      const bankAnswers = tile === Tile.WaterShallow && (BANK_FACE_FOLD[k] ?? null) !== null;
      const answers = f.hem[k] !== null || f.wash[k] !== null || runAnswers || bankAnswers;
      assert.equal(!answers, museumFoldHolds(tile, look.id), `tile ${tile} under ${look.name}: foldSkins ${answers ? 'answers' : 'holds'}`);
      if (!answers) holds++;
      // THE PLAQUE TELLS THE WHOLE TRUTH: "held only" iff no hem, no
      // taken fill, no taken lobes, held lobes yes, and the runs answer
      // at held at most; "bank face only" iff nothing but the bank.
      const w = f.wash[k];
      const takenRun = run !== null && run !== undefined && Object.values(run[0]).some((v) => v !== undefined);
      const heldOnly = answers && f.hem[k] === null && w !== null && w !== undefined && w[0] === null && w[1] === null && w[2] !== null && !takenRun;
      const bankOnly = answers && f.hem[k] === null && (w === null || w === undefined) && !runAnswers && bankAnswers;
      assert.equal(MUSEUM_FOLD_HELD_ONLY.some(([t, l]) => t === tile && l === look.id), heldOnly, `tile ${tile} under ${look.name}: held-only legend`);
      assert.equal(MUSEUM_FOLD_BANK_ONLY.some(([t, l]) => t === tile && l === look.id), bankOnly, `tile ${tile} under ${look.name}: bank-only legend`);
    }
  }
  assert.equal(holds, 11, 'eleven pairs hold: snow but under burn, the flush everywhere but the marsh');
  assert.equal(MUSEUM_FOLD_HELD_ONLY.length, 4, 'four pairs rime at held only');
  assert.equal(MUSEUM_FOLD_BANK_ONLY.length, 2, 'two pairs answer at the bank face only');
});
