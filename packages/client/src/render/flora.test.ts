import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile, tileColliderRadius } from '@arx/shared';
import { floraBaseRadius, floraModel, speciesOfFlora } from './flora.js';

const FLORA = [Tile.BerryBush, Tile.FibrePlant, Tile.WildSagewort, Tile.WildMoonbell];

test('every forage tile grows all three structural variants', () => {
  for (const tile of FLORA) {
    const variants = new Set<number>();
    for (let h = 0; h < 300; h++) variants.add(floraModel(tile, h).variant);
    assert.equal(variants.size, 3, `${Tile[tile]} only grew ${variants.size} variants`);
  }
});

test('forage nodes are landmarks — waist-high to player-tall, never clutter', () => {
  for (const tile of FLORA) {
    for (let h = 0; h < 200; h++) {
      const m = floraModel(tile, h);
      assert.ok(m.height >= 0.7, `${Tile[tile]} h=${h} only ${m.height.toFixed(2)} tiles`);
      assert.ok(m.height <= 1.8, `${Tile[tile]} h=${h} is ${m.height.toFixed(2)} tiles tall`);
      assert.ok(m.spread >= 0.3 && m.spread <= 1.1, `${Tile[tile]} h=${h} spread ${m.spread.toFixed(2)}`);
    }
  }
  // Moonbell is the prize and the tallest silhouette on average.
  let moonSum = 0;
  let berrySum = 0;
  for (let h = 0; h < 100; h++) {
    moonSum += floraModel(Tile.WildMoonbell, h).height;
    berrySum += floraModel(Tile.BerryBush, h).height;
  }
  assert.ok(moonSum > berrySum, 'moonbell stands above the bush on average');
});

test('colliders track the drawn base mass — physics matches the art', () => {
  for (const tile of FLORA) {
    const collider = tileColliderRadius(tile);
    assert.ok(collider !== null, `${Tile[tile]} lost its sub-tile collider`);
    const drawn = floraBaseRadius(tile);
    assert.ok(collider! >= drawn, `${Tile[tile]} draws ${drawn} but collides at ${collider}`);
    assert.ok(collider! <= drawn + 0.12, `${Tile[tile]} collider ${collider} far fatter than drawn ${drawn}`);
  }
});

test('every species carries its payload — the harvest is the protagonist', () => {
  for (let h = 0; h < 80; h++) {
    const berry = floraModel(Tile.BerryBush, h);
    assert.ok(berry.masses.length >= 4 && berry.gems.length >= 6, 'bush is fruit-heavy');
    for (const g of berry.gems) {
      assert.ok(g.mass >= 0 && g.mass < berry.masses.length, 'gem rides a live mass');
      const c = berry.masses[g.mass]!;
      const d = Math.hypot(g.x - c.x, (g.y - c.y) / 0.6);
      assert.ok(d <= c.r, `gem floats ${d.toFixed(2)} off its cluster (r ${c.r.toFixed(2)})`);
    }
    const fibre = floraModel(Tile.FibrePlant, h);
    const heads = fibre.blades.filter((b) => b.head);
    assert.ok(heads.length >= 2, 'fibre carries gold seed heads');
    const sage = floraModel(Tile.WildSagewort, h);
    assert.ok(sage.paddles.length >= 12 && sage.spires.length >= 2, 'sagewort rosette + spires');
    const moon = floraModel(Tile.WildMoonbell, h);
    const bells = moon.stems.reduce((n, st) => n + st.bells.length, 0);
    assert.ok(moon.stems.length >= 1 && bells >= 1, 'moonbell hangs lanterns');
    assert.ok(moon.blades.length >= 4, 'moonbell stands in a leaf fan, not on bare ground');
  }
});

test('models are deterministic across cache eviction', () => {
  const before = JSON.stringify(floraModel(Tile.BerryBush, 1234));
  // Flood the cache far past its cap so the entry is rebuilt fresh.
  for (const tile of FLORA) for (let h = 0; h < 150; h++) floraModel(tile, h);
  const after = JSON.stringify(floraModel(Tile.BerryBush, 1234));
  assert.equal(before, after, 'same tile+hash must regrow the same plant');
});

test('species mapping is stable', () => {
  assert.equal(speciesOfFlora(Tile.BerryBush), 0);
  assert.equal(speciesOfFlora(Tile.FibrePlant), 1);
  assert.equal(speciesOfFlora(Tile.WildSagewort), 2);
  assert.equal(speciesOfFlora(Tile.WildMoonbell), 3);
});
