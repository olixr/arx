import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Tile, dungeonSpecFromRoll, isSolidTile } from '@arx/shared';
import { DUNGEON_ORIGIN, generateDungeon } from './generate.js';

/**
 * THE SCARRED LAND underground (K1 THE COLD HEARTH): the stronghold's
 * 'burnt_steading' story — a collapsed roof, the ember bed it fed and
 * the strongbox somebody emptied on the way out. The dress pass owns
 * two laws this file pins: RARITY IS LAW (the marquee pieces carry
 * per-dungeon caps) and the scene degrades, never scatters (an ember
 * bed only ever stands beside its roof, never alone).
 */

const RETURN = { plane: 'surface', x: 60, y: 34 };

function gen(seed: number) {
  const spec = dungeonSpecFromRoll({ rar: 'rare', seed });
  return { spec, d: generateDungeon(spec, DUNGEON_ORIGIN, RETURN, 0) };
}

function count(ground: Uint16Array, t: Tile): number {
  let n = 0;
  for (let i = 0; i < ground.length; i++) if (ground[i] === t) n++;
  return n;
}

test('burnt_steading: the cold hearth deals in strongholds, capped, and the embers keep their roof', () => {
  let burned = 0;
  let strongholds = 0;
  for (let seed = 1; seed <= 400 && burned < 6; seed++) {
    const { spec, d } = gen(seed);
    if (spec.theme !== 'stronghold') continue;
    strongholds++;
    const g = d.zone.ground;
    const s = d.zone.width;
    const roofs = count(g, Tile.CollapsedRoof);
    const embers = count(g, Tile.EmberBed);
    assert.ok(roofs <= 2, `seed ${seed}: ${roofs} collapsed roofs — RARITY IS LAW (cap 2)`);
    assert.ok(embers <= 2, `seed ${seed}: ${embers} ember beds — RARITY IS LAW (cap 2)`);
    // The scene degrades, never scatters: an ember bed lands only
    // after its roof stood (the anchor goes first), so embers never
    // outnumber roofs, and every ember stands within the vignette's
    // reach of a roof.
    assert.ok(embers <= roofs, `seed ${seed}: ${embers} ember beds for ${roofs} roofs`);
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== Tile.EmberBed) continue;
      const x = i % s;
      const y = Math.floor(i / s);
      let near = false;
      for (let dy = -4; dy <= 4 && !near; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= s || ny >= s) continue;
          if (g[ny * s + nx] === Tile.CollapsedRoof) { near = true; break; }
        }
      }
      assert.ok(near, `seed ${seed}: ember bed at ${x},${y} stands with no roof in reach`);
      // A solid prop never pinches a walkway on an axis (the mortar
      // pass's own definition, enforced by placePiece): every open
      // orthogonal neighbour of the bed keeps one open side on each axis.
      const solid = (px: number, py: number): boolean =>
        px < 0 || py < 0 || px >= s || py >= s || isSolidTile(g[py * s + px]!);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (solid(nx, ny)) continue;
        const pinchedX = solid(nx - 1, ny) && solid(nx + 1, ny);
        const pinchedY = solid(nx, ny - 1) && solid(nx, ny + 1);
        assert.ok(!(pinchedX && pinchedY), `seed ${seed}: ember bed at ${x},${y} pinches the floor at ${nx},${ny}`);
      }
    }
    if (roofs > 0) burned++;
  }
  assert.ok(strongholds > 0, 'no stronghold dealt in 400 seeds');
  assert.ok(burned > 0, `the burnt steading never dealt across ${strongholds} strongholds`);
});

test('burnt_steading never deals outside the stronghold halls', () => {
  for (let seed = 1; seed <= 120; seed++) {
    const { spec, d } = gen(seed);
    if (spec.theme === 'stronghold') continue;
    assert.equal(count(d.zone.ground, Tile.CollapsedRoof), 0, `seed ${seed} (${spec.theme}) grew a collapsed roof`);
    assert.equal(count(d.zone.ground, Tile.EmberBed), 0, `seed ${seed} (${spec.theme}) grew an ember bed`);
  }
});

/**
 * THE SCARRED LAND underground (K3 THE FIELD AFTER): the stronghold's
 * 'field_after' story — the standard down where the line broke, the
 * fight's litter on both sides of it, the post that took the archers'
 * misses, the one cairn they had time to raise. The same two laws:
 * RARITY IS LAW (two standards, two cairns per dungeon at most) and
 * the scene degrades, never scatters (the litter, the post and the
 * cairn stand only where a standard fell — never a fight with no one
 * in it). The sally is fought at the DOOR: the story weights the
 * entry half, so across the seeds that deal it the banner stands
 * nearer the landing than the prize more often than not.
 */
test('field_after: the fight at the door deals in strongholds, capped, and its litter keeps its standard', () => {
  let fought = 0;
  let strongholds = 0;
  let nearerDoor = 0;
  for (let seed = 1; seed <= 400 && fought < 8; seed++) {
    const { spec, d } = gen(seed);
    if (spec.theme !== 'stronghold') continue;
    strongholds++;
    const g = d.zone.ground;
    const s = d.zone.width;
    const banners = count(g, Tile.FallenBanner);
    const cairns = count(g, Tile.FieldCairn);
    assert.ok(banners <= 2, `seed ${seed}: ${banners} fallen standards — RARITY IS LAW (cap 2)`);
    assert.ok(cairns <= 2, `seed ${seed}: ${cairns} field cairns — RARITY IS LAW (cap 2)`);
    const reach = (i: number, t: Tile, r: number): boolean => {
      const x = i % s;
      const y = Math.floor(i / s);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= s || ny >= s) continue;
          if (g[ny * s + nx] === t) return true;
        }
      }
      return false;
    };
    for (let i = 0; i < g.length; i++) {
      const t = g[i];
      if (t !== Tile.FieldLitter && t !== Tile.ArrowPost && t !== Tile.FieldCairn) continue;
      assert.ok(reach(i, Tile.FallenBanner, 4), `seed ${seed}: ${Tile[t]} at ${i % s},${Math.floor(i / s)} lies with no standard in reach — a fight with nobody in it`);
    }
    if (banners === 0) continue;
    fought++;
    // The sally at the door: the standard against the landing and the
    // prize, in dungeon cells.
    const ox = d.zone.origin?.x ?? 0;
    const oy = d.zone.origin?.y ?? 0;
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== Tile.FallenBanner) continue;
      const x = (i % s) + ox;
      const y = Math.floor(i / s) + oy;
      const toDoor = Math.hypot(x - d.entry.x, y - d.entry.y);
      const toPrize = d.bossChest ? Math.hypot(x - d.bossChest.x, y - d.bossChest.y) : Infinity;
      if (toDoor < toPrize) nearerDoor++;
      else nearerDoor--;
    }
  }
  assert.ok(strongholds > 0, 'no stronghold dealt in 400 seeds');
  assert.ok(fought > 0, `the field after never dealt across ${strongholds} strongholds`);
  assert.ok(nearerDoor > 0, `the sally is fought at the door: the standards stood nearer the prize more often than the landing (${nearerDoor})`);
});

test('field_after never deals outside the stronghold halls', () => {
  for (let seed = 1; seed <= 120; seed++) {
    const { spec, d } = gen(seed);
    if (spec.theme === 'stronghold') continue;
    for (const t of [Tile.FallenBanner, Tile.FieldLitter, Tile.ArrowPost, Tile.FieldCairn]) {
      assert.equal(count(d.zone.ground, t), 0, `seed ${seed} (${spec.theme}) grew a ${Tile[t]}`);
    }
  }
});
