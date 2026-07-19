import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSIVES, Tile, TILE_DEFS } from '@devcraft/shared';
import { ABILITIES, TECHNIQUES, abilityDef } from './abilities.js';
import { ITEMS } from './items.js';
import { NPCS, TOWN_SPAWNS } from './npcs.js';
import { RECIPES } from './recipes.js';
import { NODES } from './nodes.js';
import { BUILDABLES } from './buildables.js';
import { GENERAL_STORE } from './shop.js';
import {
  CROPS,
  CROP_BY_SEED,
  CROP_TILES,
  growMs,
  stageEndMs,
  stageForElapsed,
  tileForStage,
} from './crops.js';

/**
 * Cross-reference integrity: every id that content points at must
 * resolve. Catches the classic data bug — a renamed ability or item
 * silently orphaning a weapon, relic, or loot table.
 */

test('every weapon art and relic active resolves to an ability', () => {
  for (const [id, item] of ITEMS) {
    if (item.weapon?.art) {
      assert.ok(abilityDef(item.weapon.art), `${id} art '${item.weapon.art}' missing`);
    }
    if (item.relic) {
      assert.ok(abilityDef(item.relic), `${id} relic '${item.relic}' missing`);
      assert.equal(item.equipSlot, 'relic', `${id} grants an active but is not relic-slotted`);
    }
    if (item.weapon?.ammo) {
      assert.ok(ITEMS.has(item.weapon.ammo), `${id} ammo '${item.weapon.ammo}' missing`);
    }
  }
});

test('every equippable weapon carries an Art — no dead Q slots', () => {
  for (const [id, item] of ITEMS) {
    if (item.weapon) assert.ok(item.weapon.art, `${id} has no weapon art`);
  }
});

test('npc loot, specials, and spawns all resolve', () => {
  for (const [id, npc] of NPCS) {
    for (const entry of npc.loot) {
      assert.ok(ITEMS.has(entry.item), `${id} loot '${entry.item}' missing`);
      assert.ok(entry.qty[0] >= 1 && entry.qty[1] >= entry.qty[0], `${id} loot qty malformed`);
    }
    if (npc.special) {
      const ab = abilityDef(npc.special.ability);
      assert.ok(ab, `${id} special '${npc.special.ability}' missing`);
      assert.ok(npc.special.everyTicks > 0);
    }
  }
  for (const spawn of TOWN_SPAWNS) {
    assert.ok(NPCS.has(spawn.npc), `spawn '${spawn.npc}' missing`);
  }
});

test('techniques resolve, ladder is sane, and each style has a tree', () => {
  const styles = new Map<string, number[]>();
  for (const t of TECHNIQUES) {
    assert.ok(abilityDef(t.ability), `technique '${t.ability}' missing`);
    assert.ok(t.unlockLevel >= 1 && t.unlockLevel <= 99);
    const levels = styles.get(t.style) ?? [];
    levels.push(t.unlockLevel);
    styles.set(t.style, levels);
  }
  for (const style of ['melee', 'archery', 'magic']) {
    const levels = styles.get(style);
    assert.ok(levels && levels.length >= 3, `${style} needs a technique tree`);
    assert.ok(Math.min(...levels) <= 5, `${style} needs an early unlock`);
  }
});

test('sigils and passives on items resolve', () => {
  let sigils = 0;
  let passives = 0;
  for (const [id, item] of ITEMS) {
    if (item.sigil) {
      sigils++;
      assert.ok(abilityDef(item.sigil), `${id} sigil '${item.sigil}' missing`);
      assert.equal(item.equipSlot, 'sigil', `${id} grants an ultimate but is not sigil-slotted`);
    }
    if (item.passive) {
      passives++;
      assert.ok(PASSIVES[item.passive], `${id} passive '${item.passive}' missing`);
      assert.ok(item.equipSlot, `${id} passive rides unequippable gear`);
    }
  }
  assert.ok(sigils >= 1, 'at least one boss sigil at launch');
  assert.ok(passives >= 4, 'at least four passive gear pieces at launch');
});

test('recipes reference real items', () => {
  for (const r of RECIPES.values()) {
    for (const input of r.inputs) assert.ok(ITEMS.has(input.item), `${r.id} input missing`);
    assert.ok(ITEMS.has(r.output.item), `${r.id} output '${r.output.item}' missing`);
    if (r.burnResult) assert.ok(ITEMS.has(r.burnResult), `${r.id} burn result missing`);
  }
});

test('crops: seeds, yields, and stage tiles all resolve', () => {
  for (const [id, crop] of CROPS) {
    assert.ok(ITEMS.has(crop.seedItem), `${id} seed '${crop.seedItem}' missing`);
    assert.ok(ITEMS.has(crop.yield.item), `${id} yield '${crop.yield.item}' missing`);
    assert.ok(crop.yield.min >= 1 && crop.yield.max >= crop.yield.min, `${id} yield malformed`);
    assert.ok(crop.seedReturn.min >= 0 && crop.seedReturn.max >= crop.seedReturn.min);
    assert.ok(crop.growMinutes > 0 && crop.levelReq >= 1 && crop.xp > 0);
    assert.equal(CROP_BY_SEED.get(crop.seedItem), crop, `${id} seed lookup broken`);
    for (const stage of [1, 2] as const) {
      const tile = tileForStage(crop, stage);
      assert.ok(TILE_DEFS[tile], `${id} stage ${stage} tile has no def`);
      assert.equal(TILE_DEFS[tile].solid, false, `${id} crop tiles must be walkable`);
      assert.deepEqual(CROP_TILES.get(tile), { crop, stage }, `${id} tile lookup broken`);
    }
  }
  assert.equal(TILE_DEFS[Tile.CropSprout].solid, false, 'sprout must be walkable');
  assert.equal(TILE_DEFS[Tile.Tilled].solid, false, 'tilled soil must be walkable');
});

test('crop stages: boundaries and watering boost math', () => {
  const carrot = CROPS.get('carrot')!;
  const total = growMs(carrot);
  assert.equal(stageForElapsed(carrot, 0), 0);
  assert.equal(stageForElapsed(carrot, stageEndMs(carrot, 0) - 1), 0);
  assert.equal(stageForElapsed(carrot, stageEndMs(carrot, 0)), 1);
  assert.equal(stageForElapsed(carrot, total - 1), 1);
  assert.equal(stageForElapsed(carrot, total), 2);
  assert.equal(stageForElapsed(carrot, total * 10), 2);
  // A watering boost is plain added milliseconds: elapsed + boost crosses
  // the same thresholds the clock would.
  const elapsed = total * 0.5;
  const boost = 0.35 * (total - elapsed);
  assert.equal(stageForElapsed(carrot, elapsed + boost), 1);
  assert.equal(stageForElapsed(carrot, total - boost + boost), 2);
});

test('foraging nodes, buildables, and shop stock resolve', () => {
  for (const node of NODES) {
    assert.ok(ITEMS.has(node.yieldItem), `${node.name} yield '${node.yieldItem}' missing`);
    if (node.bonusYield) {
      assert.ok(ITEMS.has(node.bonusYield.item), `${node.name} bonus yield missing`);
      assert.ok(node.bonusYield.chance > 0 && node.bonusYield.chance <= 1);
    }
  }
  const foraging = NODES.filter((n) => n.skill === 'foraging');
  assert.ok(foraging.length >= 4, 'foraging needs wild plants to pick');
  for (const b of BUILDABLES.values()) {
    for (const m of b.materials) assert.ok(ITEMS.has(m.item), `${b.id} material missing`);
    assert.ok(TILE_DEFS[b.tile], `${b.id} tile has no def`);
  }
  for (const entry of GENERAL_STORE) {
    assert.ok(ITEMS.has(entry.item), `shop '${entry.item}' missing`);
  }
});

test('livestock produce/lays and consumable buffs resolve', () => {
  for (const [id, npc] of NPCS) {
    if (npc.produce) assert.ok(ITEMS.has(npc.produce.item), `${id} produce missing`);
    if (npc.lays) {
      assert.ok(ITEMS.has(npc.lays.item), `${id} lays missing`);
      assert.ok(npc.lays.minSec > 0 && npc.lays.maxSec >= npc.lays.minSec);
    }
  }
  let tonics = 0;
  let foodBuffs = 0;
  for (const [id, item] of ITEMS) {
    if (!item.buff) continue;
    assert.ok(item.buff.durationSec > 0, `${id} buff has no duration`);
    assert.ok(
      item.buff.speedMult || item.buff.shieldHp || item.buff.gatherSpeed || item.buff.regenPer4s,
      `${id} buff does nothing`,
    );
    if (item.buff.channel === 'tonic') tonics++;
    else foodBuffs++;
  }
  assert.ok(tonics >= 3, 'herbalism needs tonic variety');
  assert.ok(foodBuffs >= 2, 'cooking needs buff food');
});

test('summon abilities define their summon; damage shapes define reach', () => {
  for (const [id, ab] of ABILITIES) {
    if (ab.shape === 'summon') assert.ok(ab.summon, `${id} summons nothing`);
    if (ab.shape === 'projectile_fan') {
      assert.ok((ab.projectiles ?? 0) >= 1 && (ab.range ?? 0) > 0, `${id} fan malformed`);
    }
    if (ab.shape === 'nova' || ab.shape === 'ground_aoe' || ab.shape === 'pulse_nova') {
      assert.ok((ab.radius ?? 0) > 0, `${id} has no radius`);
    }
    if (ab.shape === 'pulse_nova') {
      assert.ok((ab.pulses ?? 0) >= 2 && (ab.pulseEveryTicks ?? 0) > 0, `${id} pulses malformed`);
    }
    if (ab.shape === 'chain_zap') {
      assert.ok((ab.chainTargets ?? 0) >= 1 && (ab.radius ?? 0) > 0, `${id} chain malformed`);
    }
    if (ab.shape === 'dash_strike') {
      assert.ok((ab.dashTiles ?? 0) !== 0, `${id} has no dash`);
    }
  }
});

test('daggers: backstab multiplier, fast cadence, and a real Art', () => {
  for (const id of ['bronze_dagger', 'iron_dagger']) {
    const item = ITEMS.get(id);
    assert.ok(item?.weapon, `${id} missing`);
    assert.ok((item.weapon.backstabMult ?? 0) > 1, `${id} has no backstab payoff`);
    assert.ok(item.weapon.cooldownTicks < 7, `${id} should swing faster than swords`);
    assert.ok(item.weapon.range < 1.7, `${id} should reach shorter than swords`);
    assert.ok(item.weapon.art && abilityDef(item.weapon.art), `${id} art unresolved`);
  }
});
