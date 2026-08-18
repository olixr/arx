import test from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { drawLiveGround, wetClassOf, type WetLists } from './terrain.js';

/**
 * THE WET LEDGER PARITY PIN: drawLiveGround (and the shoreline march
 * inside it) must emit an IDENTICAL op stream whether it walks the
 * plain bounds scan or a caller-compiled wet list. The eastern case
 * exists because the first cut's unpack used a SIGNED shift — packed
 * coords with tx >= 0 wrap the int32 and sign-extended into garbage,
 * silently dropping every wet tile in the eastern half of the world.
 */

/** Recording Path2D: op-count + coordinate checksum. */
class RecPath {
  ops = 0;
  sum = 0;
  private take(args: number[]): void {
    this.ops++;
    for (const v of args) {
      assert.ok(Number.isFinite(v), 'non-finite path coord');
      this.sum += v;
    }
  }
  moveTo(...a: number[]): void {
    this.take(a);
  }
  lineTo(...a: number[]): void {
    this.take(a);
  }
  quadraticCurveTo(...a: number[]): void {
    this.take(a);
  }
  ellipse(...a: number[]): void {
    this.take(a);
  }
  closePath(): void {
    this.ops++;
  }
  addPath(): void {
    this.ops++;
  }
  rect(...a: number[]): void {
    this.take(a);
  }
  arc(...a: number[]): void {
    this.take(a);
  }
}

interface Recorder {
  ops: number;
  sum: number;
}

/** Recording ctx: tallies its own draw calls into the shared recorder. */
function recCtx(rec: Recorder): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  return new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        rec.ops++;
        for (const v of args) {
          if (typeof v === 'number') {
            assert.ok(Number.isFinite(v), `non-finite ctx coord in ${prop}`);
            rec.sum += v;
          } else if (v instanceof RecPath) {
            // fill(path)/stroke(path): fold the path's record in, so
            // bucket flush order lands in the checksum too.
            rec.ops += v.ops;
            rec.sum += v.sum;
          }
        }
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

/** A little river world anchored at (ox, oy): a 3-wide channel with
 *  shallow fringes, a pond, a dock plank, and grass everywhere else. */
function groundAt(ox: number, oy: number) {
  return (tx: number, ty: number): number | undefined => {
    const x = tx - ox;
    const y = ty - oy;
    if (x < -2 || x > 14 || y < -2 || y > 14) return undefined; // off-world
    if (y >= 4 && y <= 6) {
      if (x >= 2 && x <= 11) return y === 5 ? Tile.WaterDeep : Tile.Water;
      return Tile.WaterShallow;
    }
    if (x >= 9 && x <= 10 && y >= 9 && y <= 10) return Tile.Water; // pond
    if (x === 6 && y === 7) return Tile.Dock;
    return Tile.Grass;
  };
}

const wts = (wx: number, wy: number): { x: number; y: number } => ({
  x: wx * 10,
  y: wy * 6,
});

/** Compile the ledger exactly as the renderer does (the documented
 *  packing: (tx+0x8000)<<16 | (ty+0x8000), row-major). */
function compile(
  ground: (tx: number, ty: number) => number | undefined,
  b: { minTx: number; maxTx: number; minTy: number; maxTy: number },
): WetLists {
  const tiles: number[] = [];
  const cellSet = new Set<number>();
  for (let ty = b.minTy - 1; ty <= b.maxTy + 1; ty++) {
    for (let tx = b.minTx - 1; tx <= b.maxTx + 1; tx++) {
      const t = ground(tx, ty);
      if (t === undefined) continue;
      const cls = wetClassOf(t);
      if (cls === 0) continue;
      if (tx >= b.minTx && tx <= b.maxTx && ty >= b.minTy && ty <= b.maxTy) {
        tiles.push(((tx + 0x8000) << 16) | (ty + 0x8000));
      }
      if ((cls & 1) !== 0) {
        for (let dj = 0; dj <= 1; dj++) {
          for (let di = 0; di <= 1; di++) {
            const ci = tx + di;
            const cj = ty + dj;
            if (ci < b.minTx || ci > b.maxTx + 1 || cj < b.minTy || cj > b.maxTy + 1) continue;
            cellSet.add(((ci + 0x8000) << 16) | (cj + 0x8000));
          }
        }
      }
    }
  }
  // Row-major cell order, like the renderer's collect pass.
  const cells = [...cellSet].sort((a, z) => {
    const ay = a & 0xffff;
    const zy = z & 0xffff;
    return ay !== zy ? ay - zy : (a >>> 16) - (z >>> 16);
  });
  return { tiles, cells };
}

function run(ox: number, oy: number, wet: WetLists | undefined): Recorder {
  const rec: Recorder = { ops: 0, sum: 0 };
  const g = globalThis as { Path2D?: unknown };
  const had = g.Path2D;
  g.Path2D = RecPath;
  try {
    const bounds = { minTx: ox, maxTx: ox + 12, minTy: oy, maxTy: oy + 12 };
    drawLiveGround(
      recCtx(rec),
      groundAt(ox, oy),
      bounds,
      wts,
      48,
      12_345,
      { full: true, moonlit: false },
      wet,
    );
  } finally {
    g.Path2D = had;
  }
  return rec;
}

test('wet ledger emits the scan-identical op stream (western hemisphere)', () => {
  const ground = groundAt(-200, 40);
  const bounds = { minTx: -200, maxTx: -188, minTy: 40, maxTy: 52 };
  const withLedger = run(-200, 40, compile(ground, bounds));
  const plain = run(-200, 40, undefined);
  assert.ok(plain.ops > 50, `scan drew something (${plain.ops} ops)`);
  assert.equal(withLedger.ops, plain.ops);
  assert.equal(withLedger.sum, plain.sum);
});

test('wet ledger survives tx >= 0 (the signed-shift regression)', () => {
  const ground = groundAt(520, -4);
  const bounds = { minTx: 520, maxTx: 532, minTy: -4, maxTy: 8 };
  const withLedger = run(520, -4, compile(ground, bounds));
  const plain = run(520, -4, undefined);
  assert.ok(plain.ops > 50, `scan drew something (${plain.ops} ops)`);
  assert.equal(withLedger.ops, plain.ops);
  assert.equal(withLedger.sum, plain.sum);
});

test('wet class table: water family and decks, nothing else', () => {
  assert.equal(wetClassOf(Tile.Water) & 1, 1);
  assert.equal(wetClassOf(Tile.WaterDeep) & 1, 1);
  assert.equal(wetClassOf(Tile.WaterShallow) & 1, 1);
  assert.equal(wetClassOf(Tile.Dock) & 2, 2);
  assert.equal(wetClassOf(Tile.Bridge) & 2, 2);
  assert.equal(wetClassOf(Tile.Grass), 0);
  assert.equal(wetClassOf(Tile.StoneFloor ?? 3), 0);
});
