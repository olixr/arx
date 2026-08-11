import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, levelAggroFactor, validateNpcDef, npcDef } from './npcs.js';

test('sizing-up law: an even match keeps the posted range', () => {
  assert.equal(levelAggroFactor(12, 12), 1);
});

test('sizing-up law: outclassed players get marked from farther out', () => {
  const f = levelAggroFactor(20, 3); // dire wolf vs a fresh waker
  assert.ok(f > 1.4, `expected a wide mark, got ${f}`);
  assert.ok(f <= 1.75, 'never past the cap');
});

test('sizing-up law: outgrown beasts barely lift their heads', () => {
  const f = levelAggroFactor(5, 60); // goblin vs a seasoned slayer
  assert.equal(f, 0.35, 'shrinks to the floor');
});

test('sizing-up law: floored, never zeroed', () => {
  assert.ok(levelAggroFactor(1, 99) >= 0.35);
});

test('sizing-up law: self-normalizes up the ladder', () => {
  // Five levels of gap matters much more at the bottom than the top.
  assert.ok(levelAggroFactor(10, 5) > levelAggroFactor(85, 80));
});

test('craven bodies always have a pack to run to', () => {
  for (const def of NPCS.values()) {
    if (def.craven) {
      assert.ok(def.pack, `${def.id} is craven but has no pack tag`);
    }
  }
});

test('the goblin warband shares a pack tag', () => {
  assert.equal(npcDef('goblin')?.pack, 'goblin');
  assert.equal(npcDef('goblin_thrower')?.pack, 'goblin');
});

test('validator: craven must be a boolean', () => {
  const base = npcDef('goblin')!;
  const refs = {
    lootTables: new Set(base.loot),
    npcIds: new Set(['goblin']),
  };
  assert.deepEqual(validateNpcDef({ ...base }, refs), []);
  assert.ok(
    validateNpcDef({ ...base, craven: 'yes' }, refs).some((e) => e.includes('craven')),
  );
});

test("the eye's arc: every hostile authors a sane cone", () => {
  for (const def of NPCS.values()) {
    if (def.aggroRange <= 0) continue;
    assert.ok(def.sightArc !== undefined, `${def.id} is hostile but authors no sightArc`);
    assert.ok(def.sightArc! >= 30 && def.sightArc! <= 360, `${def.id} arc out of range`);
  }
});

test("the eye's arc: landmarks — beasts wide, the dead narrow, the champion all-seeing", () => {
  assert.equal(npcDef('wolf')?.sightArc, 240);
  assert.equal(npcDef('skeleton')?.sightArc, 120);
  assert.equal(npcDef('skeleton_champion')?.sightArc, 360);
  assert.equal(npcDef('giant_spider')?.sightArc, 360);
});

test('validator: sightArc must sit in [30, 360]', () => {
  const base = npcDef('goblin')!;
  const refs = {
    lootTables: new Set(base.loot),
    npcIds: new Set(['goblin']),
  };
  assert.deepEqual(validateNpcDef({ ...base, sightArc: 360 }, refs), []);
  assert.ok(validateNpcDef({ ...base, sightArc: 10 }, refs).some((e) => e.includes('sightArc')));
  assert.ok(
    validateNpcDef({ ...base, sightArc: 'wide' }, refs).some((e) => e.includes('sightArc')),
  );
});

test('validator: special is retired — the kit is the only rail', () => {
  const base = npcDef('goblin')!;
  const refs = { lootTables: new Set(base.loot), npcIds: new Set(['goblin']) };
  assert.ok(
    validateNpcDef({ ...base, special: { ability: 'ground_slam', everyTicks: 150 } }, refs).some(
      (e) => e.includes('retired'),
    ),
  );
});

test('validator: THE KIT — floors, bands, fractions, and the aim words', () => {
  const base = npcDef('goblin')!;
  const refs = { lootTables: new Set(base.loot), npcIds: new Set(['goblin']) };
  const ok = (kit: unknown): string[] => validateNpcDef({ ...base, kit }, refs);
  assert.deepEqual(ok([{ ability: 'ground_slam', cooldownTicks: 150 }]), []);
  assert.deepEqual(
    ok([
      {
        ability: 'ground_slam',
        cooldownTicks: 150,
        windupTicks: 14,
        minRange: 2,
        maxRange: 6,
        hpBelow: 0.5,
        weight: 2,
        aim: 'lead',
        minLevel: 30,
        rally: true,
      },
    ]),
    [],
  );
  // No spam voices: the cooldown floor.
  assert.ok(ok([{ ability: 'x', cooldownTicks: 20 }]).some((e) => e.includes('cooldownTicks')));
  // A breath, not a siege.
  assert.ok(
    ok([{ ability: 'x', cooldownTicks: 150, windupTicks: 200 }]).some((e) =>
      e.includes('windupTicks'),
    ),
  );
  // hp gates are fractions.
  assert.ok(
    ok([{ ability: 'x', cooldownTicks: 150, hpBelow: 40 }]).some((e) => e.includes('hpBelow')),
  );
  // The aim vocabulary is closed.
  assert.ok(ok([{ ability: 'x', cooldownTicks: 150, aim: 'behind' }]).some((e) => e.includes('aim')));
  // A band must be a band.
  assert.ok(
    ok([{ ability: 'x', cooldownTicks: 150, minRange: 6, maxRange: 2 }]).some((e) =>
      e.includes('minRange'),
    ),
  );
  // An empty kit is an authoring mistake, and seven voices is a choir.
  assert.ok(ok([]).some((e) => e.includes('kit')));
  assert.ok(
    ok(Array.from({ length: 7 }, () => ({ ability: 'x', cooldownTicks: 150 }))).some((e) =>
      e.includes('kit'),
    ),
  );
});
