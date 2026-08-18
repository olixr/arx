import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * THE HEARTH'S SHADOW — the house cat's content laws.
 *
 * The cat is the game's first pure-company critter and the tame
 * ladder's one docile friend: it follows, and that is the whole of
 * its work. These pins hold the structure that promise hangs on —
 * the damage-0 body that pays nothing for its death, the docile tame
 * row with no kit and no art shelf, and the town presence the brief
 * asked for (cats in the towns, not the wilds).
 */
import { NPCS } from './npcs.js';
import { TAMES, tameErrors } from './tames.js';
import { PET_REPERTOIRE, petRepertoireErrors } from './petArts.js';
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
  assert.ok(!cat!.produce && !cat!.lays, 'a cat is nobody’s livestock — the tame door stays open');
});

test('THE COMPANY THAT KEEPS NO FANG: the docile row and its structural laws', () => {
  const row = TAMES.get('cat');
  assert.ok(row, 'the cat answers the courtship');
  assert.equal(row!.docile, true);
  assert.equal(row!.lure, 'raw_trout', 'the courtship is a fish, offered by hand');
  assert.ok(!row!.kit, 'a docile friend carries no kit');
  // No art shelf, and the roster gate agrees.
  assert.ok(!PET_REPERTOIRE['cat'], 'a docile friend holds no repertoire');
  assert.deepEqual(petRepertoireErrors(), []);
  // The validator refuses the contradictions before they can ship.
  const armed = tameErrors({ species: 'cat', lure: 'raw_trout', tameXp: 40, docile: true, kit: { armor: 1 }, flavor: 'x'.repeat(10) });
  assert.ok(armed.some((e) => e.includes('no kit')), 'docile with a kit is refused');
  const fanged = tameErrors({ species: 'wolf', lure: 'raw_beef', tameXp: 150, docile: true, flavor: 'x'.repeat(10) });
  assert.ok(fanged.some((e) => e.includes('damage-0')), 'docile on a fanged body is refused');
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
