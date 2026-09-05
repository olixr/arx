import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHUNK_SIZE } from '@arx/shared';
import {
  FOLD_STRIP_H,
  FOLD_STRIP_W,
  HALO_LEN,
  MUSEUM_PLANE_ID,
  SURFACE_PLANE_ID,
  band,
  haloIndex,
  museumFoldWing,
  museumSpectrum,
  type SpectrumCore,
  type SpectrumStroke,
} from '@arx/content';
import {
  allocSpectrumHalo,
  resetSpectrum,
  setSpectrum,
  setSpectrumClock,
  setSpectrumPlane,
  spectrumCores,
  spectrumEpoch,
  spectrumHallOn,
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

// ------------------------------------------------ THE HALL'S OWN RULER (LG-2)
// The Prop Museum's Living Ground wing declares its own stroke set
// (content/maps/museum.ts museumSpectrum). The registry lays it over
// the wire's set KEYED ON THE PLANE: in the hall the field is the
// ruler and nothing else; the wire's strokes and cores stay held and
// return on the crossing out. The cases the refused server door
// missed are the pins: waking inside the hall (the world's set was
// applied at welcome), and a broadcast swap while standing in it.

/** The chunk a wing cell stands in, per block and row. */
function wingChunks(): Array<[number, number]> {
  const wing = museumFoldWing();
  const out: Array<[number, number]> = [];
  for (const block of wing.blocks) {
    for (const row of wing.rows) {
      for (const dx of [0, FOLD_STRIP_W - 1]) {
        out.push([Math.floor((block.stripX + dx) / CHUNK_SIZE), Math.floor((row.stripY + FOLD_STRIP_H - 1) / CHUNK_SIZE)]);
      }
    }
  }
  return out;
}

test('THE HALL\'S OWN RULER: in the museum the field is the wing\'s set; the wire\'s set is held and returns on the way out', () => {
  resetSpectrum();
  // The world's registry as the welcome delivered it: one stroke that
  // happens to land on the wing's numbers, and one far away.
  const wing = museumFoldWing();
  const world: SpectrumStroke[] = [
    circle('world-overlap', wing.blocks[0]!.stripX + 3, wing.rows[0]!.stripY + 1, 10),
    circle('world-far', 900, 900, 20, { axis: 'burn' }),
  ];
  setSpectrum(world, []);
  assert.equal(setSpectrumPlane(SURFACE_PLANE_ID), false, 'the surface is not a change');
  assert.equal(spectrumHallOn(), false);
  const surfaceSigs = wingChunks().map(([cx, cy]) => spectrumSig(cx, cy));
  const surfaceEpoch = spectrumEpoch();
  assert.ok(surfaceSigs.some((s) => s !== 0), 'the overlapping world stroke reaches the wing on the surface');
  // The crossing in: the epoch walks, every wing chunk signs, and the
  // prepared list is the museum's ids alone — no world stroke, whatever
  // its numbers.
  assert.equal(setSpectrumPlane(MUSEUM_PLANE_ID), true);
  assert.equal(spectrumHallOn(), true);
  assert.ok(spectrumEpoch() > surfaceEpoch);
  const ids = spectrumPrepared().map((p) => p.src.id).sort();
  assert.deepEqual(ids, museumSpectrum().map((s) => s.id).sort());
  for (const [cx, cy] of wingChunks()) assert.notEqual(spectrumSig(cx, cy), 0, `wing chunk ${cx},${cy} signs in the hall`);
  assert.equal(spectrumSig(Math.floor(900 / CHUNK_SIZE), Math.floor(900 / CHUNK_SIZE)), 0, 'the far world stroke is silent in the hall');
  // The wire's set is HELD, not lost.
  assert.deepEqual(spectrumStrokes().map((s) => s.id), ['world-overlap', 'world-far']);
  // A stay is free: the same plane again rebuilds nothing.
  const hallEpoch = spectrumEpoch();
  assert.equal(setSpectrumPlane(MUSEUM_PLANE_ID), false);
  assert.equal(spectrumEpoch(), hallEpoch);
  // A broadcast swap while standing in the hall stores the new world
  // set and leaves the ruler in place.
  setSpectrum([circle('world-new', wing.blocks[1]!.stripX, wing.rows[2]!.stripY, 8)], []);
  assert.equal(spectrumHallOn(), true);
  assert.deepEqual(spectrumPrepared().map((p) => p.src.id).sort(), museumSpectrum().map((s) => s.id).sort());
  assert.deepEqual(spectrumStrokes().map((s) => s.id), ['world-new']);
  // The crossing out restores the wire's (new) set exactly.
  assert.equal(setSpectrumPlane(SURFACE_PLANE_ID), true);
  assert.equal(spectrumHallOn(), false);
  assert.deepEqual(spectrumPrepared().map((p) => p.src.id), ['world-new']);
  // Waking INSIDE the hall (the plane persists across logins): the
  // welcome applies the world's set first, the latch folds the wing
  // anyway — the order of the two never matters.
  resetSpectrum();
  setSpectrumPlane(MUSEUM_PLANE_ID);
  setSpectrum(world, []);
  for (const [cx, cy] of wingChunks()) assert.notEqual(spectrumSig(cx, cy), 0, `wing chunk ${cx},${cy} signs after a welcome inside the hall`);
  assert.deepEqual(spectrumPrepared().map((p) => p.src.id).sort(), museumSpectrum().map((s) => s.id).sort());
  resetSpectrum();
  assert.equal(spectrumHallOn(), false, 'resetSpectrum forgets the hall too');
});

test('THE HALL\'S OWN RULER: live cores never reach the hall, and the ruler reads every band on every wing cell', () => {
  resetSpectrum();
  const wing = museumFoldWing();
  const core: SpectrumCore = {
    id: 'core-1',
    axis: 'blight',
    x: wing.blocks[2]!.stripX,
    y: wing.rows[4]!.stripY,
    r0: 6,
    r1: 30,
    t0: 0,
    t1: 10_000,
    soft: 0.5,
  };
  setSpectrum([], [core]);
  assert.equal(setSpectrumClock(5_000), true, 'on the surface the core projects');
  assert.equal(spectrumPrepared().length, 1);
  setSpectrumPlane(MUSEUM_PLANE_ID);
  assert.equal(spectrumPrepared().every((p) => p.src.id.startsWith('museum-')), true, 'the projected core is not in the hall');
  assert.equal(setSpectrumClock(9_000), false, 'a tick in the hall moves nothing painted');
  assert.equal(spectrumPrepared().every((p) => p.src.id.startsWith('museum-')), true);
  // The halo at the first block's first row reads the ruler: the west
  // apron column summer, the strip's four cells touched/taken/held in
  // order at the tile centres, on the season axis alone.
  const block = wing.blocks[0]!;
  const row = wing.rows[0]!;
  const baseX = Math.floor(block.x0 / CHUNK_SIZE) * CHUNK_SIZE;
  const baseY = Math.floor(row.stripY / CHUNK_SIZE) * CHUNK_SIZE;
  const halo = allocSpectrumHalo();
  assert.equal(spectrumHalo(baseX, baseY, halo), true);
  const wordAt = (axis: number, x: number, y: number): number => halo[haloIndex(axis, x - baseX, y - baseY)]!;
  const y = row.stripY + 1;
  assert.equal(band(wordAt(0, block.x0, y)), 0, 'the west apron is summer');
  for (let c = 0; c < 4; c++) {
    const x = block.stripX + c * (FOLD_STRIP_W / 4) + 1;
    assert.equal(band(Math.abs(wordAt(0, x, y))), c, `cell ${c} reads band ${c}`);
    assert.equal(wordAt(1, x, y), 0);
    assert.equal(wordAt(2, x, y), 0);
  }
  setSpectrumPlane(SURFACE_PLANE_ID);
  assert.equal(spectrumPrepared().length, 1, 'the core returns with the surface');
  resetSpectrum();
});
