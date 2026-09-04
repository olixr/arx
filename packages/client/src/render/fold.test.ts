import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHUNK_SIZE } from '@arx/shared';
import { HALO_LEN, band, haloIndex, type SpectrumCore, type SpectrumStroke } from '@arx/content';
import {
  allocSpectrumHalo,
  resetSpectrum,
  setSpectrum,
  setSpectrumClock,
  spectrumCores,
  spectrumEpoch,
  spectrumHalo,
  spectrumHaloSig,
  spectrumPrepared,
  spectrumSig,
  spectrumStrokes,
} from './fold.js';

// THE FOLD — the painter's spectrum registry (plan §12.2, LG-0). Fed
// only by the wire; read by LG-1's bake through two pure doors. These
// pins hold the fast path (sig 0 = today's paint), the memo, the
// shared corner, and the server-clocked core projection.

function circle(id: string, x: number, y: number, r: number, over: Partial<SpectrumStroke> = {}): SpectrumStroke {
  return { id, axis: 'blight', shape: { kind: 'circle', x, y, r }, amp: 1, soft: 0.5, grain: 0.5, mode: 'max', ...over };
}

test('ZERO IS TODAY: an empty registry signs 0 everywhere and fills an empty halo', () => {
  resetSpectrum();
  for (let cy = -4; cy <= 4; cy++) for (let cx = -4; cx <= 4; cx++) assert.equal(spectrumSig(cx, cy), 0);
  const halo = allocSpectrumHalo();
  assert.equal(halo.length, HALO_LEN);
  halo.fill(3);
  assert.equal(spectrumHalo(0, 0, halo), false);
  assert.equal(halo.every((w) => w === 0), true);
  assert.equal(spectrumHaloSig(halo), 0);
  assert.equal(spectrumPrepared().length, 0);
  assert.throws(() => spectrumHalo(0, 0, new Int16Array(4)), /must hold/);
});

test('a stroke folds the chunks it reaches and no others; the epoch walks with the registry', () => {
  resetSpectrum();
  const e0 = spectrumEpoch();
  setSpectrum([circle('wold', 100, 100, 20)], []);
  assert.equal(spectrumEpoch(), e0 + 1);
  // Chunk 3 spans 96..127 — the heart. Reach is 20·(1+0.35·0.5)=23.5,
  // so chunk 2 (64..95, halo to 97.5) is touched and chunk 5 is not.
  assert.notEqual(spectrumSig(3, 3), 0);
  assert.notEqual(spectrumSig(2, 3), 0);
  assert.equal(spectrumSig(5, 3), 0);
  assert.equal(spectrumSig(-3, 3), 0);
  // The memo answers the same word twice, and the halo agrees with the sig.
  assert.equal(spectrumSig(3, 3), spectrumSig(3, 3));
  const halo = allocSpectrumHalo();
  assert.equal(spectrumHalo(96, 96, halo), true);
  assert.equal(band(halo[haloIndex(1, 4, 4)]!), 3); // (100.5,100.5) is the heart: held
  assert.notEqual(spectrumHaloSig(halo), 0);
  assert.equal(spectrumHalo(5 * CHUNK_SIZE, 96, halo), false);
  assert.equal(spectrumHaloSig(halo), 0);
  // A far edit that cannot reach chunk 3 still re-keys the epoch (the
  // registry swapped) — but the sig of chunk 3 is the same word.
  const sig3 = spectrumSig(3, 3);
  setSpectrum([circle('wold', 100, 100, 20), circle('elsewhere', -900, -900, 20)], []);
  assert.equal(spectrumEpoch(), e0 + 2);
  assert.equal(spectrumSig(3, 3), sig3);
  assert.notEqual(spectrumSig(-29, -29), 0);
  setSpectrum([], []);
  assert.equal(spectrumSig(3, 3), 0);
  assert.equal(spectrumEpoch(), e0 + 3);
});

test('the registry copies the wire: mutating the delivered records moves nothing', () => {
  resetSpectrum();
  const s = circle('w', 100, 100, 20);
  const c: SpectrumCore = { id: 'c', axis: 'burn', x: -500, y: -500, r0: 10, r1: 30, t0: 0, t1: 1000, soft: 0.5 };
  setSpectrum([s], [c]);
  s.amp = 0;
  (s.shape as { r: number }).r = 2;
  c.r0 = 0;
  assert.equal(spectrumStrokes()[0]!.amp, 1);
  assert.equal(spectrumCores()[0]!.r0, 10);
  assert.notEqual(spectrumSig(3, 3), 0);
  resetSpectrum();
});

test('THE SHARED CORNER: a tile two chunks both halo reads the same word from either side', () => {
  resetSpectrum();
  setSpectrum(
    [
      circle('heart', 32, 32, 30, { soft: 0.7, grain: 1 }),
      circle('spring', 40, 20, 26, { axis: 'season', amp: -0.9, soft: 0.6 }),
    ],
    [],
  );
  const N = CHUNK_SIZE;
  const h00 = allocSpectrumHalo();
  const h10 = allocSpectrumHalo();
  const h01 = allocSpectrumHalo();
  assert.equal(spectrumHalo(0, 0, h00), true);
  assert.equal(spectrumHalo(N, 0, h10), true);
  assert.equal(spectrumHalo(0, N, h01), true);
  for (let axis = 0; axis < 4; axis++) {
    for (let ly = -2; ly <= N + 1; ly++) {
      for (let lx = N - 2; lx <= N + 1; lx++) {
        assert.equal(h00[haloIndex(axis, lx, ly)], h10[haloIndex(axis, lx - N, ly)]);
      }
    }
    for (let ly = N - 2; ly <= N + 1; ly++) {
      for (let lx = -2; lx <= N + 1; lx++) {
        assert.equal(h00[haloIndex(axis, lx, ly)], h01[haloIndex(axis, lx, ly - N)]);
      }
    }
  }
  resetSpectrum();
});

test('THE SERVER CLOCK: cores project only through setSpectrumClock, and a tick that moves no ring is free', () => {
  resetSpectrum();
  const core: SpectrumCore = { id: 'den', axis: 'blight', x: 320, y: 320, r0: 10, r1: 60, t0: 10_000, t1: 50_000, soft: 0.5 };
  setSpectrum([], [core]);
  // No clock yet → nothing projected: the painter never guesses a time.
  assert.equal(spectrumPrepared().length, 0);
  assert.equal(spectrumSig(10, 10), 0);
  // No cores → the clock has nothing to say.
  const e0 = spectrumEpoch();
  setSpectrum([], []);
  assert.equal(setSpectrumClock(10_000), false);
  assert.equal(spectrumEpoch(), e0 + 1); // the setSpectrum, not the tick
  resetSpectrum(); // forgets the tick too — the next swap has no clock again
  setSpectrum([], [core]);
  assert.equal(spectrumPrepared().length, 0);
  const e1 = spectrumEpoch();
  assert.equal(setSpectrumClock(10_000), true); // r 10 — the ring stands
  assert.equal(spectrumEpoch(), e1 + 1);
  assert.notEqual(spectrumSig(10, 10), 0);
  assert.equal(spectrumSig(11, 10), 0); // 352.. (halo from 350.5) is past r 10
  const sigA = spectrumSig(10, 10);
  // A tick inside the same CORE_STEP ring changes nothing — no epoch, no re-bake.
  assert.equal(setSpectrumClock(10_500), false);
  assert.equal(spectrumEpoch(), e1 + 1);
  assert.equal(spectrumSig(10, 10), sigA);
  // The ramp reaches: at t1 the ring is 60 (to x 380) and chunk 11's halo is in reach.
  assert.equal(setSpectrumClock(50_000), true);
  assert.equal(spectrumEpoch(), e1 + 2);
  assert.notEqual(spectrumSig(11, 10), 0);
  assert.notEqual(spectrumSig(10, 10), sigA); // the ring is a different stroke now
  // A registry swap mid-ramp re-projects at the SAME tick it last held.
  setSpectrum([], [{ ...core, id: 'digs', x: -320, y: -320 }]);
  assert.notEqual(spectrumSig(-11, -11), 0);
  assert.equal(spectrumSig(10, 10), 0);
  resetSpectrum();
  assert.equal(spectrumSig(-11, -11), 0);
});

test('NO CLOCK REACHES A PAINTED VALUE: fold.ts reads no clock', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fold.ts'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bDate\b/);
  assert.doesNotMatch(code, /\bperformance\b/);
  assert.doesNotMatch(code, /Math\.random/);
});
