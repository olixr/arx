import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAME_DEFS, TAMES, tameDef, tameErrors, tameRosterErrors } from './tames.js';
import { NPCS } from './npcs.js';
import { itemDef } from './items.js';

test('the shipped roster is clean against its own gate', () => {
  assert.deepEqual(tameRosterErrors(), []);
  assert.ok(TAME_DEFS.length >= 2, 'phase 1 ships at least the beetle and the rat');
});

test('THE BEAST SETS THE BAR: no species carries a rung; every wild body names its own price', () => {
  // The per-species beastcraft rung is retired (user mandate
  // 2026-08-13): the gentling's gate is the mark's own level. The
  // content contract left is that every whitelisted species has a
  // real, reachable wild level for that gate to read.
  for (const def of TAME_DEFS) {
    const lvl = NPCS.get(def.species)?.level ?? 0;
    assert.ok(lvl >= 1 && lvl <= 99, `${def.species}: wild level ${lvl} out of range`);
  }
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
    tameErrors({ species, lure: 'egg', tameXp: 50, flavor: 'A test row.' });
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
  assert.ok(bad('sheep').length > 0);
  assert.ok(bad('ram').length > 0);
  assert.ok(bad('bull').length > 0);
  // The prey crowns keep their feet.
  assert.ok(bad('stag').length > 0);
  assert.ok(bad('hind').length > 0);
  // A species the bestiary has never heard of.
  assert.ok(bad('moon_calf').length > 0);
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
  // Moved deliberately with THE SPECIES SPEAK: the shell's +4 rides
  // on top of the hand at every beastcraft (the one stat site).
  assert.equal(high.armor, 24 + 4);
  assert.equal(low.armor, 2 + 4);
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

test('THE SPECIES SPEAK: the whole roster stands', () => {
  assert.equal(TAME_DEFS.length, 17, 'entry trio through the worg capstone, the turtle keep, the razorback, the tide bulwark and the fen basilisk among them');
});

test('kits are the species\' own teeth re-aimed, never an invented spellbook', () => {
  // The fangs carry venom, the cold things chill, the shells armor,
  // the cart shoves — and the wolf and bear need no kit at all
  // because their wild teeth already are the kit.
  assert.equal(tameDef('rat')?.kit?.bite?.status, 'venom');
  assert.equal(tameDef('adder')?.kit?.bite?.status, 'venom');
  assert.ok((tameDef('adder')?.kit?.bite?.power ?? 0) > (tameDef('rat')?.kit?.bite?.power ?? 0), 'deep venom runs deeper');
  assert.equal(tameDef('mudcrab')?.kit?.bite?.status, 'chill');
  assert.equal(tameDef('great_owl')?.kit?.bite?.status, 'chill');
  assert.ok((tameDef('giant_beetle')?.kit?.armor ?? 0) > 0, 'the shell is armor');
  // THE SHELL LADDER CLIMBS: beetle, then the keep, then the bulwark
  // crowns it — and the great claw grips one weight past the pinch.
  assert.equal(tameDef('giant_crab')?.kit?.bite?.status, 'chill');
  assert.ok(
    (tameDef('giant_crab')?.kit?.bite?.power ?? 0) > (tameDef('mudcrab')?.kit?.bite?.power ?? 0),
    'the great claw grips deeper than the pinch',
  );
  assert.ok(
    (tameDef('giant_crab')?.kit?.armor ?? 0) > (tameDef('giant_turtle')?.kit?.armor ?? 0) &&
      (tameDef('giant_turtle')?.kit?.armor ?? 0) > (tameDef('giant_beetle')?.kit?.armor ?? 0),
    'the shell ladder climbs beetle < keep < bulwark',
  );
  assert.ok((tameDef('boar')?.kit?.knockback ?? 0) > 1, 'the gore shoves');
  assert.equal(tameDef('wolf')?.kit, undefined);
  assert.equal(tameDef('bear')?.kit, undefined);
  assert.equal(tameDef('cave_bat')?.kit, undefined);
  assert.equal(tameDef('giant_spider')?.kit, undefined);
  assert.equal(tameDef('lynx')?.kit, undefined);
  assert.equal(tameDef('lynx_young')?.kit, undefined);
  assert.ok(NPCS.get('wolf')?.attackStatus, 'the wolf bleeds on its own');
  assert.ok(NPCS.get('bear')?.attackStatus, 'the bear mauls on its own');
  assert.ok(NPCS.get('cave_bat')?.attackStatus, 'the bat bleeds on its own');
  assert.ok(NPCS.get('giant_spider')?.attackStatus, 'the spider envenoms on its own');
  assert.ok(NPCS.get('lynx')?.attackStatus, 'the lynx rakes on its own');
  // Pounce openers are anatomy, not kit: the chargers were born leaping.
  for (const sp of ['boar', 'bear', 'great_owl', 'worg', 'giant_spider', 'lynx']) {
    assert.ok(NPCS.get(sp)?.pounce, `${sp} pounces as it was born to`);
  }
});

test('BRACKET: THE SHELL is real armor at the one stat site', () => {
  const bare = Math.floor(10 / 4); // hand alone at BC 10
  assert.equal(petStatBlock('giant_beetle', 6, 10)!.armor, bare + 4);
  assert.equal(petStatBlock('rat', 2, 10)!.armor, bare);
});

test('BRACKET: the bear beside a keeper of 25 handles the goblin camp', () => {
  const goblin = NPCS.get('goblin')!;
  const avg = petAvgLanded('bear', 16, 25, 0, 0);
  const swings = Math.ceil(goblin.maxHp / avg);
  assert.ok(swings >= 1 && swings <= 4, `the bear fells a goblin in ${swings} swings`);
});
