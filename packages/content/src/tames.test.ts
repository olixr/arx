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

// ---------------------------------------------------------------------
// PET BRACKETS — the balance contract (beastcraft v2 Phase 2, the
// damage.test.ts TTK-bracket discipline applied to companions). Move
// these deliberately or not at all: avg landed = maxHit/2 × (1−DR),
// through the exact shared pipeline the server strikes with.
// ---------------------------------------------------------------------

import { mitigate, npcMaxHit, petLevelFor } from '@arx/shared';
import { petStatBlock } from './tames.js';

function petAvgLanded(species: string, petLevel: number, bc: number, defence: number, armor: number): number {
  const stats = petStatBlock(species, petLevel, bc)!;
  const maxHit = Math.round(npcMaxHit(stats.die, petLevel) * stats.dmgMult);
  // Expected landed damage per swing across the uniform 0..maxHit roll.
  let sum = 0;
  for (let roll = 0; roll <= maxHit; roll++) sum += mitigate(roll, defence, armor, petLevel);
  return sum / (maxHit + 1);
}

test('BRACKET: a fresh beetle beside a fresh keeper worries down a goblin', () => {
  const goblin = NPCS.get('goblin')!;
  const avg = petAvgLanded('giant_beetle', 6, 10, 0, 0);
  const swings = Math.ceil(goblin.maxHp / avg);
  assert.ok(swings >= 4 && swings <= 14, `beetle fells goblin in ${swings} swings`);
});

test('BRACKET: the shell outlasts the camp — a goblin needs a long grind', () => {
  const goblin = NPCS.get('goblin')!;
  const stats = petStatBlock('giant_beetle', 6, 10)!;
  const gobHit = npcMaxHit(goblin.damage, goblin.level);
  let sum = 0;
  for (let roll = 0; roll <= gobHit; roll++) sum += mitigate(roll, 0, stats.armor, goblin.level);
  const avgIn = sum / (gobHit + 1);
  const swingsToFall = Math.ceil(stats.maxHp / Math.max(0.1, avgIn));
  assert.ok(swingsToFall >= 8, `beetle falls to a goblin only after ${swingsToFall} swings`);
});

test('BRACKET: THE HAND BEHIND THE FANG is real but never absurd', () => {
  // Same beast, same level — only the keeper's beastcraft differs.
  const low = petStatBlock('giant_beetle', 6, 10)!;
  const high = petStatBlock('giant_beetle', 6, 99)!;
  const hpRatio = high.maxHp / low.maxHp;
  const dmgRatio = high.dmgMult / low.dmgMult;
  assert.ok(hpRatio > 1.6 && hpRatio < 2.0, `hand hp ratio ${hpRatio.toFixed(2)}`);
  assert.ok(dmgRatio > 1.3 && dmgRatio < 1.6, `hand dmg ratio ${dmgRatio.toFixed(2)}`);
  assert.equal(high.armor, 24);
  assert.equal(low.armor, 2);
});

test('BRACKET: the ladder climbs — a leveled pet strictly outgrows its fresh self', () => {
  for (const species of ['giant_beetle', 'rat']) {
    const base = NPCS.get(species)!.level;
    const fresh = petStatBlock(species, base, 10)!;
    const grown = petStatBlock(species, Math.min(99, base + 14), 25)!;
    assert.ok(grown.maxHp > fresh.maxHp, `${species} hp grows`);
    assert.ok(
      Math.round(npcMaxHit(grown.die, base + 14) * grown.dmgMult) >
        Math.round(npcMaxHit(fresh.die, base) * fresh.dmgMult),
      `${species} teeth grow`,
    );
  }
});

test('BRACKET: the leash holds the ladder — beastcraft caps the climb', () => {
  // A mountain of xp means nothing past the keeper's skill.
  assert.equal(petLevelFor(50_000_000, 6, 25), 25);
  assert.equal(petLevelFor(50_000_000, 6, 99), 99);
});
