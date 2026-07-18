import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSIVES } from '@devcraft/shared';
import { ABILITIES, TECHNIQUES, abilityDef } from './abilities.js';
import { ITEMS } from './items.js';
import { NPCS, TOWN_SPAWNS } from './npcs.js';
import { RECIPES } from './recipes.js';

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
