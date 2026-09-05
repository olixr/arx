import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Detail, Tile } from '@arx/shared';

/**
 * THE LAYER SEED (contested-lands plan §12.5, the critique's blocker).
 *
 * Every BlobLayer's contour hashes — edge crossings, control-point
 * bows, the swell field, the alt-patch sub-lanes — used to be salted by
 * the layer's ARRAY INDEX. Inserting a layer mid-list (AshGround after
 * Dirt) would therefore re-roll every shipped road and shore. The fix
 * gives every layer an explicit stable `seed` (today's index, pinned
 * here) and routes every hash through it; the array order stays the
 * PAINT order and nothing more.
 *
 * Three proofs, in increasing strength:
 *   1. every seed equals its index today, seeds are unique and live
 *      below the alt-patch lane floor (64) so no sub-contour lane can
 *      ever collide with a layer's own lane;
 *   2. no hash site in terrain.ts reads `li` (the array index) as a
 *      salt any more — a source-level pin;
 *   3. the OP STREAM of `bakeChunk` (plus the live `waterRegionPath`)
 *      over a fixture world exercising every one of the fourteen
 *      layers is byte-identical to the golden captured from the
 *      pre-change source. Node has no canvas, so the bake draws into a
 *      recording context: every method call, every property set, every
 *      Path2D op, serialized in order and hashed. A changed hash means
 *      a changed pixel somewhere; an identical one means the seed
 *      reroute (and every future layer insertion that keeps the pinned
 *      seeds) painted the very same picture.
 */

// ------------------------------------------------------- the recorder

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
            // Old-engine fallback path is the one bakeChunk takes on a
            // fresh canvas anyway; keep the surface honest.
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
const { bakeChunk, blobLayerSeeds, waterRegionPath } = terrain;

// ----------------------------------------------------------- fixture

/**
 * A world that exercises every one of the fourteen layers, their alt /
 * alt2 washes, lips, laden snow, the water family's bank + feathered
 * shelves, and the underground band (baseY >= 512 → cave / dungeon /
 * rubble). Pure arithmetic in world coordinates so gutters and the
 * dual-grid overlap see consistent neighbors.
 */
function fixtureGround(tx: number, ty: number): number {
  const d = (cx: number, cy: number): number => Math.hypot(tx - cx, ty - cy);
  if (ty >= 512) {
    // The dark band: a dungeon room in a cave, rubble spilling.
    const ux = ((tx % 32) + 32) % 32;
    const uy = ((ty % 32) + 32) % 32;
    if (ux >= 8 && ux <= 20 && uy >= 6 && uy <= 18) return Tile.DungeonFloor;
    const r = (cx: number, cy: number): number => Math.hypot(ux - cx, uy - cy);
    if (r(26, 24) < 4 || r(4, 26) < 3.2 || r(14, 24) < 2.4 || r(24, 4) < 3) return Tile.CaveRubble;
    return Tile.CaveFloor;
  }
  // The pond: deep → open → shallows → sand beach.
  const pond = d(20, 11);
  if (pond < 3.6) return Tile.WaterDeep;
  if (pond < 5.8) return Tile.Water;
  if (pond < 7.7) return Tile.WaterShallow;
  if (pond < 9.2) return Tile.Sand;
  // The plaza with a boardwalk inset.
  if (tx >= 18 && tx <= 25 && ty >= 22 && ty <= 29) {
    if (tx >= 20 && tx <= 22 && ty >= 24 && ty <= 27) return Tile.WoodFloor;
    return Tile.StoneFloor;
  }
  // The croft: tilled bed inside a dirt yard.
  const yard = d(7, 7);
  if (yard < 2.2) return Tile.Tilled;
  if (yard < 5.4) return Tile.Dirt;
  // The snowfield in the north-east corner.
  if (d(30, 26) < 5.5) return Tile.Snow;
  // The mire.
  if (d(8, 26) < 4.3) return Tile.Swamp;
  // The road wanders west→east across the middle.
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
  // Surface chunk at px 32 (the shipping tier), plus the dark-band chunk.
  bakeChunk(fixtureGround, detail, elev, 0, 0, 32);
  bakeChunk(fixtureGround, detail, elev, 0, 16, 32);
  // The live shoreline reads the same contour lanes as the bake.
  const wr = waterRegionPath(fixtureGround, { minTx: 8, maxTx: 32, minTy: 0, maxTy: 22 }) as unknown as RecPath | null;
  ops.push(`waterRegionPath=${wr ? fmt(wr) : 'null'}`);
  return { stream: ops.join('\n'), count: ops.length };
}

const sha = (s: string): string => createHash('sha256').update(s).digest('base64');

/**
 * THE GOLDEN. Captured from the pre-seed source (BlobLayer without a
 * `seed` field, every hash salted by the array index) over the fixture
 * above — the picture the world shipped with. The seed reroute must
 * reproduce it exactly, and so must every future layer insertion that
 * keeps these fourteen seeds.
 */
const GOLDEN_SHA = 'oiUZhUHDLqXXar2zQLTCd2Qaxr/P/V9w7ppBI8J5yzo=';
const GOLDEN_OPS = 99885;

// -------------------------------------------------------------- tests

test('the layer seed', async (t) => {
  await t.test('every seed equals its index today; unique; below the alt lane floor', () => {
    // THE PINNED SEEDS, in paint order. A new layer (AshGround, seed 14)
    // is inserted into THIS list at its paint position with its fresh
    // seed — the list is the contract, the index is not.
    const PINNED = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const seeds = blobLayerSeeds();
    assert.deepEqual(seeds, PINNED, 'fourteen layers, each seeded by what was its index');
    assert.equal(new Set(seeds).size, seeds.length, 'seeds are unique');
    for (const s of seeds) assert.ok(s >= 0 && s < 64, `seed ${s} below the alt-patch lane floor`);
  });

  await t.test('no hash site reads the array index as a salt (source pin)', () => {
    const src = readFileSync(fileURLToPath(new URL('./terrain.ts', import.meta.url)), 'utf8');
    // Every hash call's SEED argument (the first) must not mention `li`.
    const hashCall = /\b(rnd01|valueNoise|hashCoords)\(\s*([^,()]+),/g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = hashCall.exec(src)) !== null) {
      n++;
      assert.doesNotMatch(m[2]!, /\bli\b/, `hash salt reads the array index: ${m[0]}`);
      assert.doesNotMatch(m[2]!, /\bsub\b/, `hash salt reads the old index-derived sub lane: ${m[0]}`);
    }
    assert.ok(n > 50, `expected to scan many hash sites, saw ${n}`);
    // The old sub-contour lane derivation is gone.
    assert.doesNotMatch(src, /\bli \+ lane\b/, 'alt patches no longer derive their lane from the index');
    // Every layer declares its seed.
    const layersBlock = src.slice(src.indexOf('const BLOB_LAYERS: BlobLayer[] = ['), src.indexOf('const WATER_LI'));
    const seedDecls = layersBlock.match(/^\s*seed: \d+,/gm) ?? [];
    assert.equal(seedDecls.length, 14, 'each of the fourteen layers declares seed:');
  });

  await t.test('the bake op stream is deterministic run-to-run', () => {
    const a = captureStream();
    const b = captureStream();
    assert.equal(a.count, b.count);
    assert.equal(sha(a.stream), sha(b.stream));
  });

  await t.test('the bake op stream matches the pre-seed golden byte for byte', () => {
    const { stream, count } = captureStream();
    const dump = process.env['TERRAIN_SEED_DUMP'];
    if (dump) {
      writeFileSync(dump, stream);
      console.log(`terrain.seed: ${count} ops, sha256 ${sha(stream)} → ${dump}`);
    }
    assert.ok(count > 5000, `a two-chunk bake is thousands of ops, saw ${count}`);
    assert.ok(stream.includes('quadraticCurveTo') || stream.includes('Q('), 'organic contours were traced');
    assert.equal(count, GOLDEN_OPS, 'op count');
    assert.equal(sha(stream), GOLDEN_SHA, 'op stream sha256');
  });
});
