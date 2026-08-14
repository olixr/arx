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

test('validator: THE DREAD CROWN — the boss block laws', () => {
  const base = npcDef('goblin')!;
  const refs = { lootTables: new Set(base.loot), npcIds: new Set(['goblin']) };
  const kit = [
    { ability: 'ground_slam', cooldownTicks: 150 },
    { ability: 'rallying_howl', cooldownTicks: 150 },
  ];
  const ok = (boss: unknown): string[] => validateNpcDef({ ...base, kit, boss }, refs);
  // The lawful crown, every dial authored.
  assert.deepEqual(
    ok({
      title: 'Warden of the Test Court',
      phases: [
        { name: 'The Opening' },
        {
          hpBelow: 0.6,
          name: 'The Breaking',
          bark: 'Enough of this.',
          entry: 'ground_slam',
          cdMult: 0.8,
          speedMult: 1.1,
        },
        { hpBelow: 0.25 },
      ],
      knockbackMult: 0.25,
      stunMult: 0.5,
      arenaR: 18,
      engageBark: 'Come, then.',
      defeatBark: 'So... it ends.',
    }),
    [],
  );
  // A crowned foe with no voices is a contradiction.
  assert.ok(
    validateNpcDef({ ...base, boss: { phases: [{}] } }, refs).some((e) => e.includes('kit')),
  );
  // The opening stance carries no gate; later rungs strictly descend.
  assert.ok(ok({ phases: [{ hpBelow: 0.5 }] }).some((e) => e.includes('opening stance')));
  assert.ok(
    ok({ phases: [{}, { hpBelow: 0.3 }, { hpBelow: 0.6 }] }).some((e) => e.includes('descending')),
  );
  // The phase turn fires through the kit, never past it.
  assert.ok(ok({ phases: [{}, { hpBelow: 0.5, entry: 'meteor' }] }).some((e) => e.includes('kit-mate')));
  // Dials stay in their bands.
  assert.ok(ok({ phases: [{}], knockbackMult: 3 }).some((e) => e.includes('knockbackMult')));
  assert.ok(ok({ phases: [{}], stunMult: -1 }).some((e) => e.includes('stunMult')));
  assert.ok(ok({ phases: [{}], arenaR: 2 }).some((e) => e.includes('arenaR')));
  assert.ok(ok({ phases: [{}, { hpBelow: 0.5, cdMult: 0.2 }] }).some((e) => e.includes('cdMult')));
  assert.ok(
    ok({ phases: [{}, { hpBelow: 0.5, speedMult: 3 }] }).some((e) => e.includes('speedMult')),
  );
  // Five rungs is a serial, not a fight.
  assert.ok(
    ok({
      phases: [{}, { hpBelow: 0.8 }, { hpBelow: 0.6 }, { hpBelow: 0.4 }, { hpBelow: 0.2 }],
    }).some((e) => e.includes('phases')),
  );
});

test('validator: THE CHAIN — links land on kit-mates, no loops, no scripts', () => {
  const base = npcDef('goblin')!;
  const refs = { lootTables: new Set(base.loot), npcIds: new Set(['goblin']) };
  const boss = { phases: [{}] };
  const ok = (kit: unknown): string[] => validateNpcDef({ ...base, kit, boss }, refs);
  // A lawful two-beat combo.
  assert.deepEqual(
    ok([
      { ability: 'ground_slam', cooldownTicks: 150, then: 'rallying_howl' },
      { ability: 'rallying_howl', cooldownTicks: 150 },
    ]),
    [],
  );
  // A link must land on a kit-mate.
  assert.ok(
    ok([{ ability: 'ground_slam', cooldownTicks: 150, then: 'meteor' }]).some((e) =>
      e.includes('names no kit-mate'),
    ),
  );
  // No loops — combos must end.
  assert.ok(
    ok([
      { ability: 'a', cooldownTicks: 150, then: 'b' },
      { ability: 'b', cooldownTicks: 150, then: 'a' },
    ]).some((e) => e.includes('loops')),
  );
  // No scripts — a combo runs at most 3 links.
  assert.ok(
    ok([
      { ability: 'a', cooldownTicks: 150, then: 'b' },
      { ability: 'b', cooldownTicks: 150, then: 'c' },
      { ability: 'c', cooldownTicks: 150, then: 'd' },
      { ability: 'd', cooldownTicks: 150, then: 'e' },
      { ability: 'e', cooldownTicks: 150 },
    ]).some((e) => e.includes('3 links')),
  );
  // Phase gates and chains are boss laws — bare defs may not wear them.
  assert.ok(
    validateNpcDef(
      { ...base, kit: [{ ability: 'a', cooldownTicks: 150, phase: 1 }] },
      refs,
    ).some((e) => e.includes('boss')),
  );
  // A crown may carry up to 10 voices (phase bands keep each hand small).
  assert.deepEqual(
    ok(Array.from({ length: 10 }, (_, i) => ({ ability: `v${i}`, cooldownTicks: 150 }))),
    [],
  );
});
