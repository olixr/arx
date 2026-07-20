import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ItemRoll, RarityTier } from '@devcraft/shared';
import { RARITY_TIERS, Rng } from '@devcraft/shared';
import { ITEMS, itemDef } from './items.js';
import { RECIPES } from './recipes.js';
import { COMPILED_EQUIPMENT, EQUIPMENT_DEFS } from './equipment/defs.js';
import { compileEquipment } from './equipment/compile.js';
import { equipmentDefsFromJson, equipmentDefsToJson } from './equipment/serialize.js';
import { aggregateGearStats, rolledStats } from './equipment/roll.js';
import type { EquipmentDef } from './equipment/types.js';
import { AFFIX_ROLL_FRAC, affixCount, affixMagnitudeCap } from './equipment/tables.js';

/** A minimal valid def to mutate in compile-failure tests. */
function baseDef(): EquipmentDef {
  return {
    id: 'test_piece',
    name: 'Test piece',
    slot: 'head',
    armorClass: 'plate',
    armor: 2,
    affixPool: [{ stat: 'melee' }],
    acquisition: { drop: true },
    value: 10,
    color: '#888',
    code: 'Tp',
  };
}

test('compileEquipment rejects malformed defs loudly', () => {
  assert.throws(() => compileEquipment([baseDef(), baseDef()]), /duplicate id/);
  assert.throws(() => compileEquipment([{ ...baseDef(), armorClass: undefined }]), /armorClass/);
  assert.throws(
    () => compileEquipment([{ ...baseDef(), affixPool: [{ stat: 'strength' as never }] }]),
    /affix stat/,
  );
  assert.throws(
    () => compileEquipment([{ ...baseDef(), acquisition: { craft: true } }]),
    /recipe/,
  );
  assert.throws(() => compileEquipment([{ ...baseDef(), acquisition: {} }]), /acquisition/,);
  assert.throws(
    () => compileEquipment([{ ...baseDef(), slot: 'weapon', armorClass: undefined }]),
    /weapon/,
  );
});

test('compiled gear items are coherent and merged into ITEMS', () => {
  assert.ok(COMPILED_EQUIPMENT.items.length >= 20, 'starter roster present');
  for (const item of COMPILED_EQUIPMENT.items) {
    const inMap = itemDef(item.id);
    assert.equal(inMap, item, `${item.id} reachable through ITEMS`);
    assert.equal(item.stackable, false, `${item.id} gear must not stack`);
    assert.ok(item.gear, `${item.id} carries gear info`);
    assert.equal(item.equipSlot, item.gear!.slot, `${item.id} equipSlot matches gear slot`);
  }
  // Boots exist as a real slot with real items.
  assert.ok(COMPILED_EQUIPMENT.items.some((i) => i.gear?.slot === 'boots'));
});

test('every craft-acquisition def generates a recipe with resolvable inputs', () => {
  for (const def of EQUIPMENT_DEFS) {
    if (!def.acquisition.craft) continue;
    const recipe = RECIPES.get(`craft_${def.id}`);
    assert.ok(recipe, `craft_${def.id} generated`);
    assert.equal(recipe!.output.item, def.id);
    for (const input of recipe!.inputs) {
      assert.ok(ITEMS.has(input.item), `craft_${def.id} input '${input.item}' resolves`);
    }
  }
});

test('equipment defs round-trip through JSON', () => {
  const json = equipmentDefsToJson(EQUIPMENT_DEFS);
  assert.deepEqual(equipmentDefsFromJson(json), EQUIPMENT_DEFS);
});

test('rolledStats is deterministic and null for non-gear', () => {
  assert.equal(rolledStats('coins'), null);
  assert.equal(rolledStats('bronze_sword'), null); // weapons roll only once migrated
  for (let seed = 0; seed < 200; seed++) {
    for (const rar of RARITY_TIERS) {
      const roll: ItemRoll = { rar, seed };
      assert.deepEqual(
        rolledStats('iron_platebody', roll),
        rolledStats('iron_platebody', roll),
        `deterministic at ${rar}/${seed}`,
      );
    }
  }
});

test('missing roll derives exactly like common seed 0', () => {
  assert.deepEqual(rolledStats('iron_helm'), rolledStats('iron_helm', { rar: 'common', seed: 0 }));
});

test('affix counts, magnitudes, and distinctness stay within tier budgets', () => {
  const maxCount: Record<RarityTier, number> = {
    common: 1,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 3,
  };
  const def = itemDef('steel_platebody')!;
  const cap = affixMagnitudeCap(def.gear!.levelReq!.level);
  for (let seed = 0; seed < 300; seed++) {
    for (const rar of RARITY_TIERS) {
      const stats = rolledStats('steel_platebody', { rar, seed })!;
      assert.ok(stats.affixes.length <= maxCount[rar], `${rar} count budget`);
      const seen = new Set(stats.affixes.map((a) => a.stat));
      assert.equal(seen.size, stats.affixes.length, 'distinct stats');
      const [, fHi] = AFFIX_ROLL_FRAC[rar];
      for (const a of stats.affixes) {
        // maxHp doubles the base roll, regen divides it — bound the raw skill rolls.
        if (a.stat !== 'maxHp' && a.stat !== 'regen') {
          assert.ok(a.value >= 1 && a.value <= Math.max(1, Math.round(cap * fHi)), `${rar} magnitude`);
          assert.ok(a.value <= 10, 'never above the +10 extreme');
        }
      }
    }
  }
  // Legendary on a high-req piece actually reaches big numbers.
  let best = 0;
  for (let seed = 0; seed < 300; seed++) {
    for (const a of rolledStats('steel_platebody', { rar: 'legendary', seed })!.affixes) {
      if (a.stat !== 'maxHp' && a.stat !== 'regen') best = Math.max(best, a.value);
    }
  }
  assert.ok(best >= 3, `legendary rolls scale with req (saw +${best})`);
});

test('affixCount consumes the tier budget shape', () => {
  const rng = new Rng(7);
  for (let i = 0; i < 50; i++) {
    assert.equal(affixCount('uncommon', rng), 1);
    assert.equal(affixCount('rare', rng), 2);
    assert.equal(affixCount('legendary', rng), 3);
    const c = affixCount('common', rng);
    assert.ok(c === 0 || c === 1);
    const e = affixCount('epic', rng);
    assert.ok(e === 2 || e === 3);
  }
});

test('aggregateGearStats counts classes and applies modifiers', () => {
  const fullPlate = aggregateGearStats({
    head: { id: 'iron_helm', roll: { rar: 'common', seed: 1 } },
    body: { id: 'iron_platebody', roll: { rar: 'common', seed: 2 } },
    legs: { id: 'iron_greaves', roll: { rar: 'common', seed: 3 } },
    boots: { id: 'iron_sabatons', roll: { rar: 'common', seed: 4 } },
  });
  assert.equal(fullPlate.classCounts.plate, 4);
  assert.ok(Math.abs(fullPlate.styleDmgMult.melee - 1.12) < 1e-9);
  assert.ok(Math.abs(fullPlate.styleDmgMult.magic - 0.84) < 1e-9);
  assert.ok(Math.abs(fullPlate.speedMult - 0.96) < 1e-9);
  assert.equal(fullPlate.cooldownMult, 1);
  assert.ok(fullPlate.armor >= 3 + 6 + 4 + 3, 'summed base armor');

  const cloth = aggregateGearStats({
    body: { id: 'apprentice_robe', roll: { rar: 'common', seed: 1 } },
    boots: { id: 'swiftstep_boots', roll: { rar: 'common', seed: 2 } },
  });
  assert.equal(cloth.classCounts.cloth, 2);
  assert.ok(Math.abs(cloth.styleDmgMult.magic - 1.08) < 1e-9);
  assert.ok(Math.abs(cloth.cooldownMult - 0.95) < 1e-9);

  // Legacy non-gear armor (capes) still counts its flat armor, no class.
  const legacy = aggregateGearStats({ cape: { id: 'cape_celestial' } });
  assert.equal(legacy.armor, 2);
  assert.equal(legacy.classCounts.plate + legacy.classCounts.leather + legacy.classCounts.cloth, 0);

  // Offhand class never counts toward armor-class totals.
  const shield = aggregateGearStats({ offhand: { id: 'oak_kiteshield' } });
  assert.equal(shield.classCounts.plate + shield.classCounts.leather + shield.classCounts.cloth, 0);
  assert.ok(shield.armor >= 3);
});

test('rarity scales base armor and value', () => {
  const common = rolledStats('steel_platebody', { rar: 'common', seed: 5 })!;
  const legendary = rolledStats('steel_platebody', { rar: 'legendary', seed: 5 })!;
  assert.ok(legendary.armor > common.armor);
  assert.ok(legendary.value > common.value * 5);
});
