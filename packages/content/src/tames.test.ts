import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAME_DEFS, TAMES, TAME_FLOOR_LEVEL, tameDef, tameErrors, tameRosterErrors } from './tames.js';
import { NPCS } from './npcs.js';
import { itemDef } from './items.js';

test('the shipped roster is clean against its own gate', () => {
  assert.deepEqual(tameRosterErrors(), []);
  assert.ok(TAME_DEFS.length >= 2, 'phase 1 ships at least the beetle and the rat');
});

test('phase 1 rungs: taming begins at beastcraft 10, at the entry pair', () => {
  assert.equal(TAME_FLOOR_LEVEL, 10);
  assert.equal(tameDef('giant_beetle')?.level, 10);
  assert.equal(tameDef('rat')?.level, 10);
});

test('every tame names a real beast and a real lure', () => {
  for (const def of TAME_DEFS) {
    assert.ok(NPCS.has(def.species), `${def.species} missing from the bestiary`);
    assert.ok(itemDef(def.lure), `${def.species}: lure '${def.lure}' is not an item`);
    assert.ok(def.tameXp > 0);
  }
});

test('the whitelist has teeth: every banned class is refused by the real gate', () => {
  const bad = (species: string) =>
    tameErrors({ species, level: 10, lure: 'egg', tameXp: 50, flavor: 'A test row.' });
  // Champions and matriarchs.
  assert.ok(bad('skeleton_champion').length > 0);
  assert.ok(bad('dire_wolf').length > 0);
  assert.ok(bad('elder_great_owl').length > 0);
  // Humanoids and the risen dead.
  assert.ok(bad('goblin').length > 0);
  assert.ok(bad('skeleton').length > 0);
  // A thing that splits in two is not one friend.
  assert.ok(bad('slime').length > 0);
  // Livestock already has a place in your life.
  assert.ok(bad('cow').length > 0);
  assert.ok(bad('chicken').length > 0);
  // The prey crowns keep their feet.
  assert.ok(bad('stag').length > 0);
  assert.ok(bad('hind').length > 0);
  // A species the bestiary has never heard of.
  assert.ok(bad('moon_calf').length > 0);
});

test('rungs below the floor are refused', () => {
  const errs = tameErrors({
    species: 'giant_beetle',
    level: 5,
    lure: 'berries',
    tameXp: 50,
    flavor: 'A test row.',
  });
  assert.ok(errs.some((e) => e.includes('rung')));
});

test('flavor keeps the dash ban (VOICE.md)', () => {
  for (const def of TAME_DEFS) {
    for (const banned of ['—', '–', '--', '−']) {
      assert.ok(!def.flavor.includes(banned), `${def.species}: flavor carries '${banned}'`);
    }
  }
});

test('the map mirrors the list', () => {
  assert.equal(TAMES.size, TAME_DEFS.length);
  for (const def of TAME_DEFS) assert.equal(TAMES.get(def.species), def);
});
