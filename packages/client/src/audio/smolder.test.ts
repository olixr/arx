import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { scanSmolderEar, SILENT_SMOLDER, SMOLDER_EARSHOT } from './ambience.js';

/**
 * THE SCARRED LAND K1 — the smolder voice's earshot scan, pure: it can
 * only find its voice where an EmberBed tile stands, fades to exactly
 * nothing at the scan edge, and seats itself toward the bed.
 */
function worldOf(beds: ReadonlyArray<readonly [number, number]>) {
  return (tx: number, ty: number): number | undefined =>
    beds.some(([bx, by]) => bx === tx && by === ty) ? Tile.EmberBed : Tile.Grass;
}

test('silence where no bed stands — the frozen SILENT_SMOLDER, not a fresh zero', () => {
  const ear = scanSmolderEar(worldOf([]), 40.5, 40.5);
  assert.equal(ear, SILENT_SMOLDER);
  assert.equal(ear.near, 0);
});

test('a bed underfoot is full voice; a bed at the edge of earshot is nothing', () => {
  const beds = [[40, 40]] as const;
  const under = scanSmolderEar(worldOf(beds), 40.5, 40.5);
  assert.ok(under.near > 0.95, `underfoot near ${under.near}`);
  assert.ok(Math.abs(under.pan) < 1e-9, 'a bed underfoot sits center');
  const edge = scanSmolderEar(worldOf(beds), 40.5 + SMOLDER_EARSHOT, 40.5);
  assert.equal(edge.near, 0, 'exactly zero at the scan edge — closeness can never pop');
  const past = scanSmolderEar(worldOf(beds), 40.5 + SMOLDER_EARSHOT + 3, 40.5);
  assert.equal(past, SILENT_SMOLDER);
});

test('closeness falls monotonically with distance and never exceeds 1', () => {
  const beds = [[40, 40]] as const;
  let last = 2;
  for (let d = 0; d <= SMOLDER_EARSHOT; d += 0.5) {
    const ear = scanSmolderEar(worldOf(beds), 40.5 + d, 40.5);
    assert.ok(ear.near <= 1, `near ${ear.near} at ${d}`);
    assert.ok(ear.near <= last + 1e-12, `near rose at ${d}: ${last} → ${ear.near}`);
    last = ear.near;
  }
});

test('the voice seats toward the bed: east of the ear pans right, west pans left, and stays inside ±0.65', () => {
  const east = scanSmolderEar(worldOf([[44, 40]]), 40.5, 40.5);
  const west = scanSmolderEar(worldOf([[36, 40]]), 40.5, 40.5);
  assert.ok(east.pan > 0.1, `east pan ${east.pan}`);
  assert.ok(west.pan < -0.1, `west pan ${west.pan}`);
  assert.ok(Math.abs(east.pan) <= 0.65 && Math.abs(west.pan) <= 0.65);
});

test('a steading of beds is wider, not louder — the soft knee caps at 1', () => {
  const one = scanSmolderEar(worldOf([[40, 40]]), 40.5, 40.5);
  const many = scanSmolderEar(worldOf([[40, 40], [41, 40], [39, 40], [40, 41], [40, 39]]), 40.5, 40.5);
  assert.equal(many.near, 1);
  assert.ok(many.near >= one.near);
  assert.ok(Math.abs(many.pan) < 1e-9, 'a symmetric ring seats center');
});
