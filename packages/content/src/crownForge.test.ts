import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CROWN_POOLS, crownPoolFor, forgeCrown } from './crownForge.js';
import { NPCS, npcDef, scaleNpcDef, validateNpcDef } from './npcs.js';
import { abilityDef } from './abilities.js';
import { BOSS_YIELD_CEILING, LOOT_TABLES } from './loot/tables.js';
import { expectedYield } from './loot/analyze.js';

/**
 * THE WILD CROWN's contract (docs/boss-system-plan.md):
 *  - LAW W2: generated content walks the SAME GATE — every forged
 *    crown passes validateNpcDef whole, across a wide seed sweep.
 *  - LAW W3: the seed is the soul — same seed, same crown, bit-equal.
 *  - LAW W1: the forge composes from faced voices only, and the seed
 *    sweep must actually produce VARIANTS (different kits, tempers,
 *    names), or the whole system is theater.
 *  - LAW W5: authored outranks forged — a def wearing a boss block
 *    is refused.
 */

const refs = { lootTables: new Set(LOOT_TABLES.keys()), npcIds: new Set(NPCS.keys()) };
const SWEEP = 400;

test('every pool base exists, carries a kit, and wears no authored crown', () => {
  for (const pool of CROWN_POOLS) {
    for (const id of pool.appliesTo) {
      const base = npcDef(id);
      assert.ok(base, `${id} missing from the bestiary`);
      assert.ok(base!.kit && base!.kit.length > 0, `${id} carries no kit`);
      assert.equal(base!.boss, undefined, `${id} already wears an authored crown`);
    }
    for (const v of pool.voices) {
      assert.ok(abilityDef(v.entry.ability), `pool voice '${v.entry.ability}' has no ability def`);
    }
    for (const t of pool.lootAdd) {
      assert.ok(LOOT_TABLES.has(t), `pool lootAdd '${t}' is not a real table`);
    }
    // Single-link chains by construction: openers unique in the pool.
    const openers = pool.chains.map(([o]) => o);
    assert.equal(new Set(openers).size, openers.length, 'chain openers must be unique');
    for (const [o, f] of pool.chains) {
      assert.ok(abilityDef(o) && abilityDef(f), `chain ${o}->${f} names unknown abilities`);
    }
  }
});

test('LAW W2 — the seed sweep walks the CMS gate whole', () => {
  for (const pool of CROWN_POOLS) {
    for (const id of pool.appliesTo) {
      const base = npcDef(id)!;
      for (let seed = 1; seed <= SWEEP; seed++) {
        const forged = forgeCrown(base, seed);
        const errors = validateNpcDef(forged, refs);
        assert.deepEqual(errors, [], `seed ${seed} on ${id}: ${errors.join('; ')}`);
      }
    }
  }
});

test('LAW W3 — the seed is the soul: same seed, same crown, bit-equal', () => {
  const base = npcDef('goblin_champion')!;
  const a = forgeCrown(base, 12345);
  const b = forgeCrown(base, 12345);
  assert.deepEqual(a, b);
  // ...and the forge is pure over the SCALED body too: the level
  // reissue changes the flesh, never the soul.
  const scaled = scaleNpcDef(base, 40);
  const c = forgeCrown(scaled, 12345);
  assert.equal(c.name, a.name, 'the name holds across levels');
  assert.deepEqual(
    c.kit!.map((k) => k.ability),
    a.kit!.map((k) => k.ability),
    'the hand holds across levels',
  );
});

test('LAW W1 — the sweep produces true variants, not one crown re-stamped', () => {
  const base = npcDef('goblin_champion')!;
  const names = new Set<string>();
  const hands = new Set<string>();
  const tempers = new Set<string>();
  for (let seed = 1; seed <= 100; seed++) {
    const f = forgeCrown(base, seed);
    names.add(f.name);
    hands.add(f.kit!.map((k) => k.ability).sort().join(','));
    tempers.add(`${f.boss!.knockbackMult}/${f.boss!.stunMult}`);
  }
  assert.ok(names.size >= 20, `names barely vary (${names.size})`);
  assert.ok(hands.size >= 3, `kits barely vary (${hands.size})`);
  assert.ok(tempers.size >= 20, `tempers barely vary (${tempers.size})`);
});

test('the flood law wears the crown: forged loot unions stay under the boss purse', () => {
  // The forge unions base.loot with the pool's lootAdd — two racks
  // that each pass the CMS door on their own could still SUM past
  // the shower a crowned foe is licensed for. Sweep a seed sample
  // per pool body (the union is seed-stable today, but the sweep is
  // the house pattern and guards any future seeded rack draw) and
  // hold the summed expectation to the boss station's ceiling — the
  // same [8, 2.2] the flood-law test pins per authored foe.
  for (const pool of CROWN_POOLS) {
    for (const id of pool.appliesTo) {
      const base = npcDef(id)!;
      for (let seed = 1; seed <= 40; seed++) {
        const forged = forgeCrown(base, seed);
        let stacks = 0;
        let gear = 0;
        for (const t of forged.loot) {
          const y = expectedYield(t);
          stacks += y.stacks;
          gear += y.gearStacks;
        }
        assert.ok(
          stacks <= BOSS_YIELD_CEILING.stacks,
          `${id} seed ${seed}: ${stacks.toFixed(2)} stacks/kill > boss ${BOSS_YIELD_CEILING.stacks}`,
        );
        assert.ok(
          gear <= BOSS_YIELD_CEILING.gearStacks,
          `${id} seed ${seed}: ${gear.toFixed(3)} gear/kill > boss ${BOSS_YIELD_CEILING.gearStacks}`,
        );
      }
    }
  }
});

test('LAW W5 — authored outranks forged: a crowned def is refused', () => {
  const king = npcDef('skeleton_fallen_king')!;
  assert.throws(() => forgeCrown(king, 1), /already wears an authored crown/);
  assert.equal(crownPoolFor('skeleton_fallen_king'), null, 'no pool may claim a named crown');
});

test('a seat-given name is a complete identity — kept whole, stream unmoved', () => {
  const base = npcDef('dire_wolf')!;
  const named = forgeCrown(base, 77, { name: 'Varga Nine Teeth' });
  assert.equal(named.name, 'Varga Nine Teeth', 'no doubled epithets on authored names');
  const unnamed = forgeCrown(base, 77);
  assert.notEqual(unnamed.name, named.name);
  // The naming choice must not shift the rest of the soul (LAW W3).
  assert.equal(named.boss!.title, unnamed.boss!.title);
  assert.deepEqual(
    named.kit!.map((k) => k.ability),
    unnamed.kit!.map((k) => k.ability),
  );
});

test('the forged body stays the base body: id, radius, art identity', () => {
  const base = npcDef('gnoll_champion')!;
  const f = forgeCrown(base, 9);
  assert.equal(f.id, base.id, 'LAW W4 — the body is the base');
  assert.equal(f.radius, base.radius);
  assert.equal(f.hitHeight, base.hitHeight);
  assert.ok(f.maxHp > base.maxHp * 2, 'the crown is priced over the flesh');
});
