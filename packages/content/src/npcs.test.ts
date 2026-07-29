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
