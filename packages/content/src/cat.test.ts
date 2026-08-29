import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * THE HEARTH'S SHADOW — the house cat's content laws.
 *
 * The cat is the game's first pure-company critter and the companion
 * registry's founding row: it follows, and that is the whole of its
 * work. It is befriended with a fish, never tamed — the beast ladder
 * and the company share no species (docs/companions-plan.md). These
 * pins hold the structure that promise hangs on: the damage-0 body
 * that pays nothing for its death, the companion row with no rung and
 * no art shelf, and the town presence the brief asked for (cats in
 * the towns, not the wilds).
 */
import { NPCS } from './npcs.js';
import { TAMES, tameErrors } from './tames.js';
import { COMPANIONS, companionErrors, companionRosterErrors } from './companions.js';
import { PET_REPERTOIRE } from './petArts.js';
import { buildDawnmead } from './maps/dawnmead.js';
import { buildAmberford } from './maps/amberford.js';
import { buildPinewatch } from './maps/pinewatch.js';
import { buildSaltmere } from './maps/saltmere.js';
import { buildSilverfall } from './maps/silverfall.js';
import { buildHartfell } from './maps/hartfell.js';
import { buildEvenfall } from './maps/evenfall.js';
import { buildKingsdelf } from './maps/kingsdelf.js';

test('the cat is a company body: no teeth, no bounty', () => {
  const cat = NPCS.get('cat');
  assert.ok(cat, 'the cat stands in the bestiary');
  assert.equal(cat!.damage, 0, 'a cat fights nothing');
  assert.equal(cat!.aggroRange, 0, 'a cat starts nothing');
  assert.equal(cat!.xpReward, 0, 'killing a cat pays no lesson');
  assert.equal(cat!.loot.length, 0, 'killing a cat pays no loot');
  assert.ok(!cat!.produce && !cat!.lays, 'a cat is nobody’s livestock');
});

test('THE COMPANY YOU KEEP: the cat is a companion, never a tame', () => {
  const row = COMPANIONS.get('cat');
  assert.ok(row, 'the cat answers the befriending');
  assert.equal(row!.treat, 'raw_trout', 'the courtship is a fish, offered by hand');
  // ONE DOOR PER SPECIES: the tame ladder does not know the cat.
  assert.ok(!TAMES.has('cat'), 'the beast ladder holds no cat — company is not courted');
  // No art shelf, and both roster gates agree.
  assert.ok(!PET_REPERTOIRE['cat'], 'company holds no repertoire');
  assert.deepEqual(companionRosterErrors(), []);
  // The validators refuse the contradictions before they can ship.
  const fanged = companionErrors({ species: 'wolf', treat: 'raw_beef', pat: 'x'.repeat(10), flavor: 'x'.repeat(10) });
  assert.ok(fanged.some((e) => e.includes('damage-0')), 'a fanged companion is refused');
  const courted = companionErrors({ species: 'cat', treat: 'raw_trout', pat: 'x'.repeat(10), flavor: 'x'.repeat(10) });
  assert.deepEqual(courted, [], 'the founding row itself is clean');
  const docile = tameErrors({ species: 'cat', lure: 'raw_trout', tameXp: 40, flavor: 'x'.repeat(10) });
  assert.ok(docile.some((e) => e.includes('company, not a tame')), 'a damage-0 tame row is refused back to the company');
});

test('the towns keep their cats — every settlement, none in the wilds', () => {
  const towns = [
    buildDawnmead(),
    buildAmberford(),
    buildPinewatch(),
    buildSaltmere(),
    buildSilverfall(),
    buildHartfell(),
    buildEvenfall(),
    buildKingsdelf(),
  ];
  let total = 0;
  for (const z of towns) {
    const cats = (z.spawns ?? []).filter((sp) => sp.npc === 'cat');
    assert.ok(cats.length >= 1, `${z.id}: every town keeps at least one cat`);
    total += cats.reduce((n, sp) => n + sp.count, 0);
  }
  assert.ok(total >= 10, `the world keeps a real population (${total})`);
});
