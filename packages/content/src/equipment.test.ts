import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ItemRoll, RarityTier } from '@arx/shared';
import { RARITY_TIERS, Rng } from '@arx/shared';
import { ITEMS, itemDef } from './items.js';
import { RECIPES } from './recipes.js';
import { COMPILED_EQUIPMENT, EQUIPMENT_DEFS } from './equipment/defs.js';
import { compileEquipment } from './equipment/compile.js';
import { equipmentDefsFromJson, equipmentDefsToJson } from './equipment/serialize.js';
import { aggregateGearStats, effectiveReq, heirloomFor, rolledStats } from './equipment/roll.js';
import type { EquipmentDef } from './equipment/types.js';
import {
  AFFIX_ROLL_FRAC,
  HEIRLOOM_MIN_SURPLUS,
  affixCount,
  affixMagnitudeCap,
  trinketPowerMult,
} from './equipment/tables.js';

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
  assert.equal(rolledStats('coal'), null); // plain materials never roll
  // Swords ARE migrated: the blade roster rolls, damage carries the base.
  assert.equal(rolledStats('bronze_sword')?.damage, 1);
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

test('item power promotes an instance without changing its identity', () => {
  // A re-issued early robe (native magic 4) at power 42 climbs toward —
  // but not past — a native piece of that tier on base armor, while its
  // affix cap uses the FULL effective level (the real catch-up).
  const native = rolledStats('thistledown_robe', { rar: 'common', seed: 9 })!;
  const heirloom = rolledStats('thistledown_robe', { rar: 'common', seed: 9, pwr: 42 })!;
  const peer = rolledStats('starweaver_robe', { rar: 'common', seed: 9 })!;
  assert.ok(heirloom.armor > native.armor, 'power must raise base armor');
  assert.ok(heirloom.armor <= peer.armor + 1, 'heirloom must not eclipse the native tier');
  assert.ok(heirloom.value > native.value, 'power must raise vendor value');
  // Affix magnitudes at power roll against the effective-level cap.
  const capNative = affixMagnitudeCap(4);
  const capPower = affixMagnitudeCap(42);
  assert.ok(capPower > capNative);
  for (let seed = 0; seed < 60; seed++) {
    const rolled = rolledStats('thistledown_robe', { rar: 'legendary', seed, pwr: 42 })!;
    for (const a of rolled.affixes) {
      const v = a.stat === 'maxHp' ? a.value / 2 : a.value;
      assert.ok(v <= capPower, `affix ${v} above power cap`);
    }
  }
  // Power below native is ignored — heirlooms never downgrade.
  assert.deepEqual(
    rolledStats('starweaver_robe', { rar: 'rare', seed: 3, pwr: 5 }),
    rolledStats('starweaver_robe', { rar: 'rare', seed: 3 }),
  );
});

test('effectiveReq gates a re-issued instance at its power', () => {
  const base = effectiveReq('thistledown_robe');
  assert.deepEqual(base, { skill: 'magic', level: 4 });
  const promoted = effectiveReq('thistledown_robe', { rar: 'common', seed: 1, pwr: 45 });
  assert.deepEqual(promoted, { skill: 'magic', level: 45 });
  assert.equal(effectiveReq('coins'), null);
});

test('the heirloom pool re-issues only true promotions', () => {
  // A deterministic sweep: every pick's native requirement must sit at
  // least the minimum surplus below the foe's level.
  for (let i = 0; i < 80; i++) {
    const rand = () => (i * 37 % 100) / 100;
    const pick = heirloomFor(30, rand);
    assert.ok(pick, 'a level-30 foe must have heirlooms to carry');
    const req = itemDef(pick!)?.gear?.levelReq?.level ?? 1;
    assert.ok(req <= 30 - HEIRLOOM_MIN_SURPLUS, `${pick} native ${req} too close to foe level`);
  }
  // A foe too weak to promote anything comes up empty-handed.
  assert.equal(heirloomFor(1, () => 0.5), null);
});

test('trinket potency grows with rarity and power', () => {
  const base = trinketPowerMult('common', undefined);
  assert.equal(base, 1);
  const strong = trinketPowerMult('legendary', 50);
  assert.ok(strong > 1.5 && strong < 1.7, `legendary p50 potency ${strong} out of band`);
  assert.ok(trinketPowerMult('common', 30) > trinketPowerMult('common', 10));
  assert.ok(trinketPowerMult('epic', 20) > trinketPowerMult('uncommon', 20));
});

test('acquisition routes are honest: drops in loot tables, shop stock flagged', async () => {
  const { NPCS } = await import('./npcs.js');
  const { GENERAL_STORE } = await import('./shop.js');
  const { reachableItems } = await import('./loot/roll.js');
  const looted = new Set<string>();
  for (const npc of NPCS.values()) {
    for (const tableId of npc.loot) {
      for (const item of reachableItems(tableId)) looted.add(item);
    }
  }
  for (const def of EQUIPMENT_DEFS) {
    if (def.acquisition.drop) {
      assert.ok(looted.has(def.id), `${def.id} declares drop but no NPC drops it`);
    }
  }
  for (const entry of GENERAL_STORE) {
    const gear = itemDef(entry.item)?.gear;
    if (gear) assert.ok(gear.acquisition.shop, `${entry.item} sold but not shop-flagged`);
  }
  // Loot tables must never point at unknown items.
  for (const item of looted) assert.ok(ITEMS.has(item), `loot item '${item}' missing`);
});

test('instance names: dominant affix epithet, deterministic, plain when affixless', async () => {
  const { AFFIX_EPITHETS, instanceName, rollEpithet } = await import('./equipment/naming.js');
  const { SKILL_IDS } = await import('@arx/shared');
  // Every possible affix stat owns an epithet — no rolled piece can be nameless.
  for (const skill of SKILL_IDS) assert.ok(AFFIX_EPITHETS[skill], `no epithet for ${skill}`);
  assert.ok(AFFIX_EPITHETS.maxHp);
  assert.ok(AFFIX_EPITHETS.regen);

  // Deterministic: the same roll names itself the same way, and matches
  // the epithet of its own dominant affix.
  const roll: ItemRoll = { rar: 'legendary', seed: 12345 };
  const name1 = instanceName('iron_platebody', roll);
  const name2 = instanceName('iron_platebody', roll);
  assert.equal(name1, name2);
  const stats = rolledStats('iron_platebody', roll)!;
  assert.ok(stats.affixes.length > 0);
  let best = stats.affixes[0]!;
  for (const a of stats.affixes) if (a.value > best.value) best = a;
  assert.equal(name1, `Iron platebody ${AFFIX_EPITHETS[best.stat]}`);
  assert.equal(rollEpithet('iron_platebody', roll), AFFIX_EPITHETS[best.stat]);

  // Non-gear items and affixless rolls keep the plain name.
  assert.equal(instanceName('log'), itemDef('log')!.name);
  let sawPlain = false;
  for (let seed = 0; seed < 40 && !sawPlain; seed++) {
    const r: ItemRoll = { rar: 'common', seed };
    if ((rolledStats('iron_helm', r)?.affixes.length ?? 0) === 0) {
      assert.equal(instanceName('iron_helm', r), 'Iron helm');
      sawPlain = true;
    }
  }
  assert.ok(sawPlain, 'expected some common roll with zero affixes');
});

test('themed plate sets: five pieces each, coherent class and reqs', () => {
  const sets = ['warden', 'frostplate', 'bulwark', 'dreadforge', 'sunforged'];
  const bySlot = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  for (const set of sets) {
    // A set is its five ARMOR pieces. A family may also carry a
    // matching offhand (the greatshields), which is checked below on
    // its own terms — it is not a sixth piece of plate.
    const pieces = EQUIPMENT_DEFS.filter(
      (d) => d.id.startsWith(`${set}_`) && d.slot !== 'offhand',
    );
    assert.equal(pieces.length, 5, `${set} should have 5 pieces`);
    const slots = new Set(pieces.map((p) => p.slot));
    assert.deepEqual([...slots].sort(), ['body', 'boots', 'gloves', 'head', 'legs'], `${set} covers the armor slots`);
    for (const p of pieces) {
      assert.equal(p.armorClass, 'plate', `${p.id} is plate`);
      assert.equal(p.levelReq?.skill, 'defence', `${p.id} gates on defence`);
      assert.ok(p.affixPool.length >= 3, `${p.id} pool feeds legendary rolls`);
    }
  }
  assert.ok(bySlot.get('tower_shield'));
  assert.ok(bySlot.get('steel_sabatons'));
});

test('the greatshield ladder: a matching wall for the plate sets, climbing in armor', () => {
  // The tank's payoff line. Each rung gates higher than the last and
  // gives more, and every one of them is named for the set it matches
  // so a finished set finishes holding the right shield.
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  const ladder = ['tower_shield', 'frostplate_greatshield', 'bulwark_bastion', 'sunforged_aegis'];
  let prevLevel = 0;
  let prevArmor = 0;
  for (const id of ladder) {
    const def = byId.get(id);
    assert.ok(def, `${id} missing from the roster`);
    if (!def) continue;
    assert.equal(def.slot, 'offhand', `${id} is an offhand`);
    const level = def.levelReq?.level ?? 0;
    assert.equal(def.levelReq?.skill, 'defence', `${id} gates on defence`);
    assert.ok(level > prevLevel, `${id} does not gate above the rung below it`);
    const armor = def.armor ?? 0;
    assert.ok(armor > prevArmor, `${id} gives no more than the rung below it`);
    prevLevel = level;
    prevArmor = armor;
  }
});

test('themed leather sets: five pieces each, coherent class and reqs', () => {
  const sets = ['wayfarer', 'wolfstalker', 'nightveil', 'drakescale', 'stagheart'];
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  for (const set of sets) {
    const pieces = EQUIPMENT_DEFS.filter((d) => d.id.startsWith(`${set}_`));
    assert.equal(pieces.length, 5, `${set} should have 5 pieces`);
    const slots = new Set(pieces.map((p) => p.slot));
    assert.deepEqual([...slots].sort(), ['body', 'boots', 'gloves', 'head', 'legs'], `${set} covers the armor slots`);
    for (const p of pieces) {
      assert.equal(p.armorClass, 'leather', `${p.id} is leather`);
      assert.ok(p.affixPool.length >= 3, `${p.id} pool feeds legendary rolls`);
      // Leather gates on the skirmisher skills, never on defence.
      assert.ok(['archery', 'sneak'].includes(p.levelReq?.skill ?? ''), `${p.id} gates on archery/sneak`);
    }
    // One acquisition story per set: all craft or all drop.
    const stories = new Set(pieces.map((p) => (p.acquisition.craft ? 'craft' : 'drop')));
    assert.equal(stories.size, 1, `${set} has one acquisition story`);
  }
  assert.ok(byId.get('hunters_quiver'));
});

test('themed cloth sets: five pieces each, coherent class and reqs', () => {
  const sets = ['hedgemage', 'tidecaller', 'voidwhisper', 'cindersworn', 'starweaver'];
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  for (const set of sets) {
    const pieces = EQUIPMENT_DEFS.filter((d) => d.id.startsWith(`${set}_`));
    assert.equal(pieces.length, 5, `${set} should have 5 pieces`);
    const slots = new Set(pieces.map((p) => p.slot));
    assert.deepEqual([...slots].sort(), ['body', 'boots', 'gloves', 'head', 'legs'], `${set} covers the armor slots`);
    for (const p of pieces) {
      assert.equal(p.armorClass, 'cloth', `${p.id} is cloth`);
      assert.equal(p.levelReq?.skill, 'magic', `${p.id} gates on magic`);
      assert.ok(p.affixPool.length >= 3, `${p.id} pool feeds legendary rolls`);
    }
    const stories = new Set(pieces.map((p) => (p.acquisition.craft ? 'craft' : 'drop')));
    assert.equal(stories.size, 1, `${set} has one acquisition story`);
  }
  assert.ok(byId.get('scholars_tome'));
});

test('early-game cloth sets: four dye lots each, colorways mirror their base', () => {
  const SETS: Record<string, { dyes: string[]; pieces: string[] }> = {
    thistledown: { dyes: ['madder', 'woad', 'bracken'], pieces: ['hood', 'robe', 'skirts', 'slippers', 'wraps'] },
    mothwing: { dyes: ['luna', 'dusk', 'ember'], pieces: ['cowl', 'robe', 'skirts', 'slippers', 'wraps'] },
    dawnsworn: { dyes: ['duskvow', 'highnoon', 'eclipse'], pieces: ['hood', 'robe', 'skirts', 'slippers', 'wraps'] },
    fenwalker: { dyes: ['mirebloom', 'rustsedge', 'graymist'], pieces: ['hood', 'robe', 'skirts', 'slippers', 'wraps'] },
    stormwoven: { dyes: ['thunderhead', 'sunshower', 'aurora'], pieces: ['hood', 'robe', 'skirts', 'slippers', 'wraps'] },
  };
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  for (const [set, { dyes, pieces }] of Object.entries(SETS)) {
    const base = pieces.map((p) => byId.get(`${set}_${p}`)!);
    assert.equal(base.filter(Boolean).length, 5, `${set} base pieces exist`);
    assert.deepEqual([...new Set(base.map((p) => p.slot))].sort(), ['body', 'boots', 'gloves', 'head', 'legs']);
    for (const p of base) {
      assert.equal(p.armorClass, 'cloth', `${p.id} is cloth`);
      assert.equal(p.levelReq?.skill, 'magic', `${p.id} gates on magic`);
      // The leveling road: these live below the themed wardrobe's floor.
      assert.ok((p.levelReq?.level ?? 0) <= 19, `${p.id} is early/mid game`);
    }
    for (const dye of dyes) {
      for (const b of base) {
        const v = byId.get(`${b.id}_${dye}`);
        assert.ok(v, `${b.id}_${dye} exists`);
        // A colorway changes identity, never power or gate.
        assert.equal(v!.slot, b.slot);
        assert.equal(v!.armorClass, b.armorClass);
        assert.deepEqual(v!.levelReq, b.levelReq);
        assert.equal(v!.armor, b.armor);
        assert.equal(v!.value, b.value);
        assert.notEqual(v!.color, b.color, `${v!.id} wears its own palette`);
        assert.ok(v!.name.endsWith(b.name.charAt(0).toLowerCase() + b.name.slice(1)), `${v!.id} keeps the base name`);
        if (v!.acquisition.craft) {
          assert.ok(v!.recipe, `${v!.id} craft colorway keeps a recipe`);
        } else {
          assert.equal(v!.recipe, undefined, `${v!.id} drop colorway sheds the recipe`);
        }
      }
    }
  }
});

test('early-game plate sets: four lots each, forge lots swap the bar', () => {
  const SETS: Record<string, { dyes: string[]; pieces: string[] }> = {
    tuskguard: { dyes: ['ironshod', 'gilded', 'ashen'], pieces: ['helm', 'platebody', 'greaves', 'sabatons', 'gauntlets'] },
    valiant: { dyes: ['crimson', 'azure', 'gilded'], pieces: ['helm', 'platebody', 'greaves', 'sabatons', 'gauntlets'] },
    ramwall: { dyes: ['steelhorn', 'goldhorn', 'stormram'], pieces: ['helm', 'platebody', 'greaves', 'sabatons', 'gauntlets'] },
    briarplate: { dyes: ['bloodbriar', 'bonebriar', 'nightbriar'], pieces: ['helm', 'platebody', 'greaves', 'sabatons', 'gauntlets'] },
    sentinel: { dyes: ['daybreak', 'bloodwatch', 'midnight'], pieces: ['greathelm', 'platebody', 'greaves', 'sabatons', 'gauntlets'] },
  };
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  for (const [set, { dyes, pieces }] of Object.entries(SETS)) {
    const base = pieces.map((p) => byId.get(`${set}_${p}`)!);
    assert.equal(base.filter(Boolean).length, 5, `${set} base pieces exist`);
    assert.deepEqual([...new Set(base.map((p) => p.slot))].sort(), ['body', 'boots', 'gloves', 'head', 'legs']);
    for (const p of base) {
      assert.equal(p.armorClass, 'plate', `${p.id} is plate`);
      assert.ok(p.levelReq && ['defence', 'melee'].includes(p.levelReq.skill), `${p.id} gates on defence/melee`);
      assert.ok((p.levelReq?.level ?? 0) <= 19, `${p.id} is early/mid game`);
      if (p.acquisition.craft) {
        assert.equal(p.recipe?.skill, 'smithing', `${p.id} is smithed`);
        assert.equal(p.recipe?.station, 'anvil', `${p.id} is anvil work`);
      }
    }
    for (const dye of dyes) {
      for (const b of base) {
        const v = byId.get(`${b.id}_${dye}`);
        assert.ok(v, `${b.id}_${dye} exists`);
        assert.equal(v!.slot, b.slot);
        assert.equal(v!.armorClass, b.armorClass);
        assert.deepEqual(v!.levelReq, b.levelReq);
        assert.equal(v!.armor, b.armor);
        assert.equal(v!.value, b.value);
        assert.notEqual(v!.color, b.color, `${v!.id} wears its own finish`);
        if (v!.acquisition.craft) {
          assert.ok(v!.recipe, `${v!.id} craft lot keeps a recipe`);
          // A forge lot must still name a real bar among its inputs.
          const items = v!.recipe!.inputs.map((i) => i.item);
          assert.ok(items.some((i) => i.endsWith('_bar')), `${v!.id} is forged from a bar`);
        } else {
          assert.equal(v!.recipe, undefined, `${v!.id} drop lot sheds the recipe`);
        }
      }
    }
  }
  // The re-forge law: a swapped lot replaces the metal, same quantity.
  const bronze = byId.get('tuskguard_platebody')!;
  const gilded = byId.get('tuskguard_platebody_gilded')!;
  assert.deepEqual(
    gilded.recipe!.inputs,
    bronze.recipe!.inputs.map((i) => (i.item === 'bronze_bar' ? { item: 'gold_bar', qty: i.qty } : i)),
  );
});

test('early-game leather sets: four dye lots each, colorways mirror their base', () => {
  const SETS: Record<string, { dyes: string[]; pieces: string[] }> = {
    hareswift: { dyes: ['clover', 'snowmelt', 'sorrel'], pieces: ['hood', 'jerkin', 'chaps', 'boots', 'gloves'] },
    kingfisher: { dyes: ['reedmace', 'stormgull', 'sundart'], pieces: ['hood', 'jerkin', 'chaps', 'boots', 'gloves'] },
    cutpurse: { dyes: ['alleyrat', 'moonless', 'redhand'], pieces: ['cowl', 'jerkin', 'leggings', 'boots', 'gloves'] },
    trapline: { dyes: ['juniper', 'riverclay', 'nightsnare'], pieces: ['hood', 'jerkin', 'chaps', 'boots', 'gloves'] },
    emberfox: { dyes: ['silverfox', 'shadowfox', 'dawnfox'], pieces: ['hood', 'jerkin', 'leggings', 'boots', 'gloves'] },
  };
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  for (const [set, { dyes, pieces }] of Object.entries(SETS)) {
    const base = pieces.map((p) => byId.get(`${set}_${p}`)!);
    assert.equal(base.filter(Boolean).length, 5, `${set} base pieces exist`);
    assert.deepEqual([...new Set(base.map((p) => p.slot))].sort(), ['body', 'boots', 'gloves', 'head', 'legs']);
    for (const p of base) {
      assert.equal(p.armorClass, 'leather', `${p.id} is leather`);
      // The skirmisher's road: archery gates, sneak for the thieves.
      assert.ok(p.levelReq && ['archery', 'sneak'].includes(p.levelReq.skill), `${p.id} gates on archery/sneak`);
      assert.ok((p.levelReq?.level ?? 0) <= 19, `${p.id} is early/mid game`);
    }
    for (const dye of dyes) {
      for (const b of base) {
        const v = byId.get(`${b.id}_${dye}`);
        assert.ok(v, `${b.id}_${dye} exists`);
        // A colorway changes identity, never power or gate.
        assert.equal(v!.slot, b.slot);
        assert.equal(v!.armorClass, b.armorClass);
        assert.deepEqual(v!.levelReq, b.levelReq);
        assert.equal(v!.armor, b.armor);
        assert.equal(v!.value, b.value);
        assert.notEqual(v!.color, b.color, `${v!.id} wears its own palette`);
        assert.ok(v!.name.endsWith(b.name.charAt(0).toLowerCase() + b.name.slice(1)), `${v!.id} keeps the base name`);
        if (v!.acquisition.craft) {
          assert.ok(v!.recipe, `${v!.id} craft colorway keeps a recipe`);
        } else {
          assert.equal(v!.recipe, undefined, `${v!.id} drop colorway sheds the recipe`);
        }
      }
    }
  }
});

test('blade roster: 20 designs, metal ladders climb, arts resolve, rarity gates hold', async () => {
  const { ABILITIES } = await import('./abilities.js');
  const weapons = EQUIPMENT_DEFS.filter((d) => d.slot === 'weapon');
  assert.equal(weapons.length, 152, 'swords 48 + daggers 45 + bows 29 + staves 28 + greatweapons 2');
  const swords = weapons.filter((d) => d.weapon?.style === 'melee');
  assert.equal(swords.length, 93, 'swords 48 + daggers 45');
  for (const s of swords) {
    assert.equal(s.weapon?.style, 'melee');
    assert.ok(s.weapon!.art && ABILITIES.has(s.weapon!.art), `${s.id} art ${s.weapon!.art} exists`);
    assert.ok(s.desc && s.desc.length > 20, `${s.id} carries a real story`);
  }
  // Metal ladders: damage, gates, value and recipe metal all climb —
  // the full eight-metal run, bronze to starsteel.
  for (const key of ['falchion', 'gladius', 'scimitar']) {
    const line = ['', 'iron_', 'steel_', 'gold_', 'mithril_', 'adamant_', 'obsidian_', 'starsteel_']
      .map((m) => swords.find((s) => s.id === `${m}${key}`)!);
    assert.ok(line.every(Boolean), `${key} forged in eight metals`);
    for (let i = 1; i < line.length; i++) {
      assert.ok(line[i]!.weapon!.damage >= line[i - 1]!.weapon!.damage, `${key} damage climbs`);
      assert.ok(line[i]!.value > line[i - 1]!.value, `${key} value climbs`);
      assert.ok(line[i]!.recipe!.levelReq > line[i - 1]!.recipe!.levelReq, `${key} smithing climbs`);
      assert.equal(line[i]!.weapon!.cooldownTicks, line[0]!.weapon!.cooldownTicks, `${key} keeps its cadence`);
    }
    const metals = [
      'bronze_bar', 'iron_bar', 'steel_bar', 'gold_bar',
      'mithril_bar', 'adamant_bar', 'obsidian_shard', 'starsteel_bar',
    ];
    line.forEach((d, i) => assert.ok(d.recipe!.inputs.some((inp) => inp.item === metals[i]), `${d.id} forged from ${metals[i]}`));
  }
  // The chase steepens: legendary-only heirloom, epic+ starmetal.
  assert.deepEqual(itemDef('oathkeeper')!.gear!.rarities, ['legendary']);
  assert.deepEqual(itemDef('starfall')!.gear!.rarities, ['epic', 'legendary']);
  // Rolled damage scales with rarity.
  const common = rolledStats('dawnbreaker', { rar: 'common', seed: 1 })!;
  const legendary = rolledStats('dawnbreaker', { rar: 'legendary', seed: 1 })!;
  assert.ok(legendary.damage! > common.damage!, 'rarity multiplies the edge');
});

test('rogue roster: 20 dagger designs, sneak gates, backstab dial, ladders climb', async () => {
  const { ABILITIES } = await import('./abilities.js');
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  const daggers = [
    'bronze_dagger', 'iron_dagger', 'steel_dagger', 'gold_dagger',
    'stiletto', 'iron_stiletto', 'steel_stiletto', 'gold_stiletto',
    'kris', 'iron_kris', 'steel_kris', 'gold_kris',
    'tanto', 'iron_tanto', 'steel_tanto', 'gold_tanto',
    'vagrants_friend', 'sting', 'coldsnap',
    'shiv', 'ratter', 'scaler', 'fangtooth', 'bogsting', 'bonepick', 'redhand',
    'nightthorn', 'leech', 'hush', 'palefire', 'sparkfang', 'kingsbane', 'last_word',
  ];
  for (const id of daggers) {
    const d = byId.get(id);
    assert.ok(d, `${id} exists`);
    assert.equal(d!.weapon?.style, 'melee');
    // The dagger identity: fast cadence, short reach, a real backstab.
    assert.ok(d!.weapon!.cooldownTicks <= 6, `${id} keeps dagger cadence`);
    assert.ok(d!.weapon!.range <= 1.5, `${id} keeps dagger reach`);
    assert.ok((d!.weapon!.backstabMult ?? 0) >= 2.2, `${id} carries a backstab dial`);
    assert.ok(d!.weapon!.art && ABILITIES.has(d!.weapon!.art), `${id} art resolves`);
  }
  // Metal ladders climb through the ores — all eight rungs.
  for (const key of ['stiletto', 'kris', 'tanto']) {
    const line = ['', 'iron_', 'steel_', 'gold_', 'mithril_', 'adamant_', 'obsidian_', 'starsteel_']
      .map((m) => byId.get(`${m}${key}`)!);
    assert.ok(line.every(Boolean), `${key} forged in eight metals`);
    for (let i = 1; i < line.length; i++) {
      assert.ok(line[i]!.weapon!.damage >= line[i - 1]!.weapon!.damage, `${key} damage climbs`);
      assert.ok(line[i]!.recipe!.levelReq > line[i - 1]!.recipe!.levelReq, `${key} smithing climbs`);
    }
  }
  // Stiletto/kris gate on SNEAK (the rogue's ladder); tanto on melee.
  assert.equal(byId.get('iron_stiletto')!.levelReq!.skill, 'sneak');
  assert.equal(byId.get('iron_kris')!.levelReq!.skill, 'sneak');
  assert.equal(byId.get('iron_tanto')!.levelReq!.skill, 'melee');
  assert.equal(byId.get('starsteel_stiletto')!.levelReq!.skill, 'sneak');
  assert.equal(byId.get('starsteel_tanto')!.levelReq!.skill, 'melee');
  // The chase steepens; the heirloom only exists legendary.
  assert.deepEqual(byId.get('kingsbane')!.rarities, ['rare', 'epic', 'legendary']);
  assert.deepEqual(byId.get('last_word')!.rarities, ['legendary']);
  // The Last Word out-backstabs everything.
  const best = Math.max(...daggers.map((id) => byId.get(id)!.weapon!.backstabMult ?? 0));
  assert.equal(byId.get('last_word')!.weapon!.backstabMult, best);
});

test('archer roster: 20 bow designs, wood ladders climb, arts resolve, chase steepens', async () => {
  const { ABILITIES } = await import('./abilities.js');
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  const bows = [
    'shortbow', 'oak_shortbow', 'willow_shortbow', 'yew_shortbow',
    'longbow', 'oak_longbow', 'willow_longbow', 'yew_longbow',
    'hunting_bow', 'oak_hunting_bow', 'willow_hunting_bow', 'yew_hunting_bow',
    'sparrowhawk', 'heartwood', 'windsinger',
    'stickbow', 'knucklebow', 'poachers_friend', 'bramblethorn', 'driftwood',
    'fishspine', 'wolfsong', 'rimewood', 'marrowpoint', 'whisperwind',
    'emberglow', 'kingswood', 'starcall', 'skyrender',
  ];
  assert.equal(bows.length, 29, '3 ladders x4 + 3 crafts + 14 finds');
  for (const id of bows) {
    const d = byId.get(id);
    assert.ok(d, `${id} exists`);
    assert.equal(d!.weapon?.style, 'archery');
    assert.equal(d!.weapon!.ammo, 'arrow', `${id} feeds on arrows`);
    assert.ok(d!.weapon!.projectileSpeed! >= 14, `${id} shoots a real projectile`);
    assert.ok(d!.weapon!.art && ABILITIES.has(d!.weapon!.art), `${id} art resolves`);
    assert.ok(d!.desc && d!.desc.length > 20, `${id} carries a real story`);
  }
  // Wood ladders climb through the forests, gated on archery.
  const logs = ['log', 'oak_log', 'willow_log', 'yew_log'];
  for (const key of ['shortbow', 'longbow', 'hunting_bow']) {
    const line = ['', 'oak_', 'willow_', 'yew_'].map((w) => byId.get(`${w}${key}`)!);
    assert.ok(line.every(Boolean), `${key} fletched in four woods`);
    for (let i = 1; i < line.length; i++) {
      assert.ok(line[i]!.weapon!.damage >= line[i - 1]!.weapon!.damage, `${key} damage climbs`);
      assert.ok(line[i]!.value > line[i - 1]!.value, `${key} value climbs`);
      assert.ok(line[i]!.recipe!.levelReq > line[i - 1]!.recipe!.levelReq, `${key} crafting climbs`);
      assert.equal(line[i]!.levelReq!.skill, 'archery', `${key} gates on archery`);
      assert.equal(line[i]!.weapon!.cooldownTicks, line[0]!.weapon!.cooldownTicks, `${key} keeps its cadence`);
    }
    line.forEach((d, i) => assert.ok(d.recipe!.inputs.some((inp) => inp.item === logs[i]), `${d.id} fletched from ${logs[i]}`));
  }
  // The bow identity dials: longbows slow and far, shortbows quick and close.
  assert.ok(byId.get('yew_longbow')!.weapon!.cooldownTicks > byId.get('yew_shortbow')!.weapon!.cooldownTicks);
  assert.ok(byId.get('yew_longbow')!.weapon!.range > byId.get('yew_shortbow')!.weapon!.range);
  assert.ok(byId.get('yew_longbow')!.weapon!.damage > byId.get('yew_shortbow')!.weapon!.damage);
  // The chase steepens; the Skyrender only exists legendary.
  assert.deepEqual(byId.get('kingswood')!.rarities, ['rare', 'epic', 'legendary']);
  assert.deepEqual(byId.get('starcall')!.rarities, ['epic', 'legendary']);
  assert.deepEqual(byId.get('skyrender')!.rarities, ['legendary']);
  // The wood ladder is harvestable: every bow log has a gather node.
  const { NODES } = await import('./nodes.js');
  for (const log of logs) {
    assert.ok(NODES.some((n) => n.yieldItem === log), `${log} grows on a real tree`);
  }
});

test('archmage roster: 22 staff designs, elements ride every bolt, gem swaps craft, chase steepens', async () => {
  const { ABILITIES } = await import('./abilities.js');
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  const staves = [
    'carved_staff', 'oak_staff', 'willow_staff', 'yew_staff',
    'ember_battlestaff', 'frost_battlestaff', 'storm_battlestaff', 'verdant_battlestaff',
    'apprentice_staff', 'ember_staff',
    'hearthwarden', 'tidebinder', 'stormcaller',
    'hazel_switch', 'shepherds_crook', 'wisplight', 'gravewood', 'gloomthorn',
    'serpentcoil', 'glacierbite', 'pyreheart', 'runegnarl', 'sunwrought',
    'boneharrow', 'bloodmoon', 'nightwell', 'tempest_crown', 'worldsplinter',
  ];
  assert.equal(staves.length, 28, '1 ladder x4 + 4 gem battlestaffs + 2 classics + 3 crafts + 15 finds');
  for (const id of staves) {
    const d = byId.get(id);
    assert.ok(d, `${id} exists`);
    assert.equal(d!.weapon?.style, 'magic');
    assert.equal(d!.weapon!.ammo, undefined, `${id} needs no ammo — the staff IS the source`);
    assert.ok(d!.weapon!.element, `${id} belongs to a school`);
    assert.ok(d!.weapon!.art && ABILITIES.has(d!.weapon!.art), `${id} art resolves`);
    assert.ok(d!.desc && d!.desc.length > 20, `${id} carries a real story`);
  }
  // The carving ladder climbs the same woods the bowyers cut.
  const logs = ['log', 'oak_log', 'willow_log', 'yew_log'];
  const line = ['carved_staff', 'oak_staff', 'willow_staff', 'yew_staff'].map((id) => byId.get(id)!);
  for (let i = 1; i < line.length; i++) {
    assert.ok(line[i]!.weapon!.damage > line[i - 1]!.weapon!.damage, 'staff damage climbs');
    assert.ok(line[i]!.value > line[i - 1]!.value, 'staff value climbs');
    assert.ok(line[i]!.recipe!.levelReq > line[i - 1]!.recipe!.levelReq, 'staff crafting climbs');
    assert.equal(line[i]!.levelReq!.skill, 'magic', 'staff gates on magic');
  }
  line.forEach((d, i) => assert.ok(d.recipe!.inputs.some((inp) => inp.item === logs[i]), `${d.id} carved from ${logs[i]}`));
  // The gem swap system: one battlestaff frame, four element stones,
  // and every gem is truly gatherable (mined or foraged bonus find).
  const gems: Record<string, string> = {
    ember_battlestaff: 'emberstone',
    frost_battlestaff: 'frostshard',
    storm_battlestaff: 'stormpearl',
    verdant_battlestaff: 'bloomstone',
  };
  const { NODES } = await import('./nodes.js');
  for (const [id, gem] of Object.entries(gems)) {
    const d = byId.get(id)!;
    assert.ok(d.recipe!.inputs.some((inp) => inp.item === gem), `${id} socketed with ${gem}`);
    assert.equal(d.id.split('_')[0], d.weapon!.element, `${id} school follows its gem`);
    assert.ok(NODES.some((n) => n.bonusYield?.item === gem), `${gem} hides in a gather node`);
    assert.ok(itemDef(gem), `${gem} is a real item`);
  }
  // Every school is spoken for across the roster.
  const schools = new Set(staves.map((id) => byId.get(id)!.weapon!.element));
  for (const el of ['arcane', 'ember', 'frost', 'storm', 'verdant', 'void', 'radiant', 'blood', 'astral']) {
    assert.ok(schools.has(el as never), `a staff carries the ${el} school`);
  }
  // The chase steepens; the Worldsplinter only exists legendary.
  assert.deepEqual(byId.get('pyreheart')!.rarities, ['rare', 'epic', 'legendary']);
  assert.deepEqual(byId.get('nightwell')!.rarities, ['epic', 'legendary']);
  assert.deepEqual(byId.get('worldsplinter')!.rarities, ['legendary']);
});

// ------------------------------------------------------------------ enchants

test('enchant registry is coherent', async () => {
  const { ENCHANT_DEFS, ENCHANTS, ELEMENT_REAGENT } = await import('./equipment/enchants.js');
  const { GEAR_SLOTS } = await import('./equipment/types.js');
  assert.ok(ENCHANT_DEFS.length >= 30, 'a real roster of enchants');
  const prefixes = new Set<string>();
  for (const e of ENCHANT_DEFS) {
    assert.ok((GEAR_SLOTS as readonly string[]).includes(e.slot), `${e.id} targets a gear slot`);
    assert.ok(e.tier >= 1 && e.tier <= 3, `${e.id} tier in range`);
    assert.ok(e.level >= 1 && e.level <= 60, `${e.id} inscribe level sane`);
    assert.ok(e.effects.length > 0, `${e.id} does something`);
    assert.ok(!prefixes.has(e.prefix), `${e.id} prefix '${e.prefix}' unique`);
    prefixes.add(e.prefix);
    for (const fx of e.effects) {
      // Poison-making law: venom is the herbalist's craft, never an enchant.
      if (fx.kind === 'onHitStatus') {
        assert.notEqual(fx.status, 'venom', `${e.id} must not carry venom`);
        assert.ok(fx.chance > 0 && fx.chance <= 0.5, `${e.id} on-hit chance sane`);
      }
      if (fx.kind === 'lifesteal') assert.ok(fx.frac > 0 && fx.frac <= 0.12, `${e.id} lifesteal sane`);
    }
    // Reagent themes resolve to real items.
    const reagent = ELEMENT_REAGENT[e.element];
    if (reagent) assert.ok(itemDef(reagent), `${e.id} reagent ${reagent} exists`);
  }
  // Tiers climb the inscribe ladder within each slot's roster.
  for (const slot of GEAR_SLOTS) {
    const tiers = ENCHANT_DEFS.filter((e) => e.slot === slot);
    for (const a of tiers) for (const b of tiers) {
      if (a.tier < b.tier) assert.ok(a.level < b.level, `${slot}: t${a.tier} ${a.id} below t${b.tier} ${b.id}`);
    }
  }
  assert.equal(ENCHANTS.size, ENCHANT_DEFS.length);
});

test('enchant effects split aggregate vs strike channels', async () => {
  const { weaponStrikeEffects } = await import('./equipment/roll.js');
  const roll = (ench: string): ItemRoll => ({ rar: 'common', seed: 0, ench });

  // Aggregate channels fold from any worn slot.
  const bare = aggregateGearStats({ body: { id: 'leather_body' } });
  const hearty = aggregateGearStats({ body: { id: 'leather_body', roll: roll('hearty') } });
  assert.equal(hearty.maxHp, bare.maxHp + 6, 'hearty adds maxHp');
  const clever = aggregateGearStats({ head: { id: 'iron_helm', roll: roll('clever') } });
  const bareHead = aggregateGearStats({ head: { id: 'iron_helm' } });
  assert.ok(clever.cooldownMult < bareHead.cooldownMult, 'clever quickens cooldowns');
  const swift = aggregateGearStats({ boots: { id: 'leather_boots', roll: roll('swift') } });
  assert.ok(swift.speedMult > aggregateGearStats({ boots: { id: 'leather_boots' } }).speedMult);
  const bristling = aggregateGearStats({ body: { id: 'leather_body', roll: roll('bristling') } });
  assert.equal(bristling.thorns, 1, 'thorns channel aggregates');
  const keen = aggregateGearStats({ weapon: { id: 'bronze_sword', roll: roll('keen_edge') } });
  assert.equal(keen.critPct, 3, 'crit channel aggregates');
  const blazing = aggregateGearStats({ weapon: { id: 'ember_battlestaff', roll: roll('blazing_edge') } });
  assert.ok((blazing.elementDmgMult.ember ?? 1) > 1, 'element damage aggregates');

  // Strike channels ride the weapon instance, never the aggregate.
  const kindled = weaponStrikeEffects('bronze_sword', roll('kindled_edge'));
  assert.equal(kindled.onHit.length, 1);
  assert.equal(kindled.onHit[0]!.status, 'burn');
  const leeching = weaponStrikeEffects('bronze_sword', roll('leeching_edge'));
  assert.ok(Math.abs(leeching.lifestealFrac - 0.05) < 1e-9);
  const shadow = weaponStrikeEffects('bronze_dagger', roll('shadow_edge'));
  assert.ok(shadow.backstabBonus > 0);
  // ...and shadow's +sneak still reaches the aggregate.
  const shadowAgg = aggregateGearStats({ weapon: { id: 'bronze_dagger', roll: roll('shadow_edge') } });
  assert.equal(shadowAgg.skillBonus.sneak, 1);
});

test('native gear effects ride the same vocabulary', async () => {
  const { weaponStrikeEffects } = await import('./equipment/roll.js');
  // Oathkeeper drinks without any enchant at all.
  assert.ok(weaponStrikeEffects('oathkeeper').lifestealFrac > 0);
  // The Last Word: strike channel backstab + aggregate channel sneak.
  // (The instance's rolled affixes may add their own sneak — measure the
  // native effect as the delta over the derived affix contribution.)
  assert.ok(weaponStrikeEffects('last_word').backstabBonus > 0);
  const affixSneak = rolledStats('last_word')!
    .affixes.filter((a) => a.stat === 'sneak')
    .reduce((sum, a) => sum + a.value, 0);
  assert.equal(
    aggregateGearStats({ weapon: { id: 'last_word' } }).skillBonus.sneak,
    affixSneak + 2,
  );
  // Native and enchant STACK on one instance.
  const both = weaponStrikeEffects('oathkeeper', { rar: 'legendary', seed: 1, ench: 'leeching_edge' });
  assert.ok(Math.abs(both.lifestealFrac - 0.1) < 1e-9, 'native 5% + leeching 5%');
});

test('ItemRoll carries ench through guard and comparison', async () => {
  const { isItemRoll, sameRoll } = await import('@arx/shared');
  assert.ok(isItemRoll({ rar: 'rare', seed: 3, ench: 'keen_edge' }));
  assert.ok(!isItemRoll({ rar: 'rare', seed: 3, ench: '' }));
  assert.ok(!sameRoll({ rar: 'rare', seed: 3, ench: 'keen_edge' }, { rar: 'rare', seed: 3 }));
  assert.ok(sameRoll({ rar: 'rare', seed: 3, ench: 'keen_edge' }, { rar: 'rare', seed: 3, ench: 'keen_edge' }));
});

test('the two-hands law: bows and staves are two-handed, quivers ride the back', async () => {
  const { isTwoHanded } = await import('./items.js');
  // Derived from style — no bow or staff can forget the flag.
  for (const def of ITEMS.values()) {
    if (!def.weapon) {
      assert.ok(!isTwoHanded(def), `${def.id}: non-weapons are never two-handed`);
    } else if (def.weapon.style === 'melee') {
      assert.ok(!isTwoHanded(def), `${def.id}: melee stays one-handed (dual wield lives)`);
    } else {
      assert.ok(isTwoHanded(def), `${def.id}: ${def.weapon.style} weapons take both hands`);
    }
  }
  // Known anchors.
  assert.ok(isTwoHanded(itemDef('stickbow')!));
  assert.ok(isTwoHanded(itemDef('apprentice_staff')!));
  assert.ok(!isTwoHanded(itemDef('bronze_sword')!));
  // backMounted is an offhand-only fact, and every quiver carries it —
  // a quiver exists FOR archers, so it must pair with a bow.
  for (const def of ITEMS.values()) {
    if (def.backMounted) assert.equal(def.equipSlot, 'offhand', `${def.id}: backMounted off-slot`);
    if (def.equipSlot === 'offhand' && def.id.includes('quiver')) {
      assert.ok(def.backMounted, `${def.id}: quivers are worn, not held`);
    }
  }
  assert.ok(itemDef('frost_quiver')!.backMounted);
  assert.ok(itemDef('hunters_quiver')!.backMounted);
  // Held offhands stay held.
  assert.ok(!itemDef('oak_kiteshield')!.backMounted);
  assert.ok(!itemDef('scholars_tome')!.backMounted);
  // The compile guard rejects a back-mounted helmet.
  assert.throws(() =>
    compileEquipment([
      {
        id: 'bad_hat',
        name: 'Bad hat',
        slot: 'head',
        armorClass: 'cloth',
        backMounted: true,
        affixPool: [{ stat: 'magic' }],
        acquisition: { shop: true },
        value: 1,
        color: '#fff',
        code: 'Bh',
      },
    ]),
  );
});
