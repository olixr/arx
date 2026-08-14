/**
 * Fur-dialect laws for the tufted shadows: every lynx NPC id owns a
 * bespoke look, the duskruff is a DESIGN and not a scale-up (her own
 * storm coat, SILVER rosettes where the pack wears dark, the great
 * ruff, the scar ledger), the rank-and-file rolls a COAT CLUSTER from
 * its spawn eid (a tribe reads as individuals — deterministically,
 * never a flicker), consecutive spawn eids scatter across the four
 * coats (the hash law), and the loot-story law holds: the pelts the
 * cats wear really drop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TABLES, NPCS } from '@arx/content';
import { LYNX_LOOKS, lynxLook } from './rig.js';

test('every lynx NPC has its own authored look', () => {
  const lynxIds = [...NPCS.keys()].filter((id) => id.startsWith('lynx'));
  assert.ok(lynxIds.length >= 2, 'the wood fields the lynx and the duskruff');
  for (const id of lynxIds) {
    assert.ok(LYNX_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file design, never crash.
  assert.equal(lynxLook('lynx_new_thing', 7).coat, LYNX_LOOKS['lynx']!.coat);
});

test('the duskruff is a design, not a scale-up', () => {
  const cat = LYNX_LOOKS['lynx']!;
  const boss = LYNX_LOOKS['lynx_champion']!;
  assert.ok(cat.backH < boss.backH && cat.bodyW < boss.bodyW, 'the duskruff carries the heavier frame');
  assert.notEqual(cat.coat, boss.coat, 'each variant wears its own coat');
  assert.notEqual(cat.rosette, boss.rosette, 'her rosettes run silver, never the pack ink');
  assert.ok(boss.champion === true && cat.champion !== true, 'only the duskruff dresses the great ruff');
  assert.ok(boss.grizzle && boss.scar, 'the silver and the scar ledger are hers alone');
});

test('the coat clusters: seeded, deterministic, spread, and never on the duskruff', () => {
  // Different cluster bits roll different coats...
  const a = lynxLook('lynx', 5);
  const b = lynxLook('lynx', 7);
  assert.notEqual(a.coat, b.coat, 'seeds in different clusters wear different coats');
  // ...the same seed always wears the same coat (cached identity)...
  assert.equal(lynxLook('lynx', 7), b, 'a body keeps its coat frame to frame');
  // ...CONSECUTIVE spawn eids scatter (knot members spawn adjacent —
  // the hash must dress the tribe in more than one coat)...
  const coats = new Set<string>();
  for (let eid = 400; eid < 408; eid++) coats.add(lynxLook('lynx', eid).coat);
  assert.ok(coats.size >= 3, `eight tribe-mates must spread the clusters, got ${coats.size}`);
  // ...and the duskruff never rolls: her design holds at any seed.
  const boss = LYNX_LOOKS['lynx_champion']!;
  assert.equal(lynxLook('lynx_champion', 0).coat, boss.coat);
  assert.equal(lynxLook('lynx_champion', 8).coat, boss.coat);
  assert.equal(lynxLook('lynx_champion', 8).seed, 8);
});

test('the tribe hunts as one pack and the duskruff screams', () => {
  const cat = NPCS.get('lynx')!;
  const boss = NPCS.get('lynx_champion')!;
  assert.equal(cat.pack, 'lynxkin');
  assert.equal(boss.pack, 'lynxkin', 'pull the duskruff, raise the tribe');
  assert.ok(cat.pounce && boss.pounce, 'a cat kills from the crouch');
  assert.equal(boss.kit?.[0]?.ability, 'rallying_howl', 'the scream that raises the wood');
  assert.ok(cat.level < boss.level && cat.maxHp < boss.maxHp);
});

test('the loot-story law: the pelts the cats wear really drop', () => {
  const catTable = LOOT_TABLES.get('lynx')!;
  const bossTable = LOOT_TABLES.get('lynx_champion')!;
  assert.ok(catTable.entries.some((e) => e.item === 'lynx_pelt'), 'the spotted pelt drops');
  assert.ok(bossTable.entries.some((e) => e.item === 'duskruff_pelt'), 'the great grey pelt drops');
  assert.ok(bossTable.entries.some((e) => e.item === 'lynx_pelt'), 'the tribe pelts snag in hers');
  assert.ok((bossTable.rarityBonus ?? 0) >= 3, 'the champion pays like a champion');
});
