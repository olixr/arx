import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TERRITORY_SPAN, familiesOf, territoryAt, territoryWeight } from './territory.js';
import { WILD_ROSTER, leanWild, wildCandidates } from './wilds.js';
import { MINOR_DEFS } from './pois/minorDefs.js';
import { POI_DEFS } from './pois/defs.js';

const SEED = 1337;
const FAMILIES = ['brigand', 'dead', 'gnoll', 'goblin', 'kobold', 'wolfkin'];

/**
 * THE TERRITORY FIELD's laws, pinned (lived-in-land Phase 5): the
 * field is deterministic and geologic (no epoch anywhere near it),
 * countries are blob-scaled rather than checkerboard, every family
 * owns land somewhere, and the lean NEVER gates.
 */

test('the field is deterministic and roster-order independent', () => {
  for (const [x, y] of [[0, 0], [500, -300], [-1200, 800], [7000, 7000]]) {
    const a = territoryAt(SEED, x!, y!, FAMILIES);
    const b = territoryAt(SEED, x!, y!, FAMILIES);
    const c = territoryAt(SEED, x!, y!, [...FAMILIES].reverse());
    assert.equal(a, b, 'the country re-rolled');
    assert.equal(a, c, 'roster order redrew the map (the sorted-stability law)');
    assert.ok(a !== null && FAMILIES.includes(a), `unknown country '${a}'`);
  }
  assert.equal(territoryAt(SEED, 0, 0, []), null, 'an empty atlas names nothing');
  assert.equal(territoryAt(SEED, 40, 40, ['goblin']), 'goblin', 'a one-family atlas is that family');
});

test('countries are blobs: near points agree, the wide world does not', () => {
  let nearSame = 0;
  const NEAR = 200;
  for (let i = 0; i < NEAR; i++) {
    const x = (i * 977) % 4000 - 2000;
    const y = (i * 1409) % 4000 - 2000;
    const a = territoryAt(SEED, x, y, FAMILIES);
    const b = territoryAt(SEED, x + 24, y + 24, FAMILIES);
    if (a === b) nearSame++;
  }
  assert.ok(nearSame >= NEAR * 0.7, `only ${nearSame}/${NEAR} near pairs agree — checkerboard, not country`);
  // Every family owns land somewhere in a wide sweep, and no single
  // family owns everything.
  const seen = new Set<string>();
  for (let gy = -8; gy <= 8; gy++) {
    for (let gx = -8; gx <= 8; gx++) {
      const f = territoryAt(SEED, gx * TERRITORY_SPAN, gy * TERRITORY_SPAN, FAMILIES);
      if (f) seen.add(f);
    }
  }
  for (const f of FAMILIES) assert.ok(seen.has(f), `family '${f}' owns no land in the sweep`);
});

test('the lean never gates, structurally', () => {
  assert.equal(territoryWeight(2, 'goblin', 'goblin', 3), 6);
  assert.equal(territoryWeight(2, 'wolfkin', 'goblin', 3), 2);
  assert.equal(territoryWeight(2, undefined, 'goblin', 3), 2);
  assert.equal(territoryWeight(2, 'goblin', null, 3), 2);
  const pool = wildCandidates(4, 'forest', 23);
  const leaned = leanWild(pool, 'wolfkin', 5);
  assert.equal(leaned.length, pool.length, 'the lean dropped a candidate — it GATED');
  for (const [i, e] of leaned.entries()) {
    const base = pool[i]!;
    assert.equal(e.npc, base.npc);
    assert.equal(e.weight, base.family === 'wolfkin' ? base.weight * 5 : base.weight);
  }
  // bias 1 and no-country are exact identities.
  assert.deepEqual(leanWild(pool, 'wolfkin', 1), pool);
  assert.deepEqual(leanWild(pool, null, 5), pool);
});

test('THE ONE ATLAS LAW: every family a find or wild entry leans on exists in the def roster', () => {
  const atlas = new Set(familiesOf([...POI_DEFS.values()]));
  assert.ok(atlas.size >= 5, `the atlas is thin (${atlas.size} countries)`);
  for (const m of MINOR_DEFS.values()) {
    if (m.family !== undefined) {
      assert.ok(atlas.has(m.family), `find '${m.id}' leans on '${m.family}' — not in the atlas`);
    }
  }
  for (const [i, e] of WILD_ROSTER.entries()) {
    if (e.family !== undefined) {
      assert.ok(atlas.has(e.family), `WILD_ROSTER[${i}] leans on '${e.family}' — not in the atlas`);
    }
  }
});
