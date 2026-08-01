/**
 * THE CALLING LAW's contract: every skill carries exactly two Callings
 * (20 and 60), every effect names a real channel or a registered dial,
 * and no strike-kind enchant effect ever rides a Calling.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_IDS } from '@arx/shared';
import { CALLINGS, callingsFor, isAggregateCallingEffect } from './callings.js';
import { ITEMS } from './items.js';

test('every skill carries exactly two Callings, at 20 and at 60', () => {
  for (const skill of SKILL_IDS) {
    const list = callingsFor(skill);
    assert.equal(list.length, 2, `${skill} needs exactly two Callings`);
    assert.deepEqual(
      list.map((c) => c.unlockLevel).sort((a, b) => a - b),
      [20, 60],
      `${skill} Callings sit at 20 and 60`,
    );
  }
  assert.equal(CALLINGS.size, SKILL_IDS.length * 2);
});

test('Calling ids are unique, named, and honestly described', () => {
  const hex = /^#[0-9a-f]{6}$/i;
  const seen = new Set<string>();
  for (const [id, def] of CALLINGS) {
    assert.equal(id, def.id);
    assert.ok(!seen.has(id), `duplicate calling id ${id}`);
    seen.add(id);
    assert.ok(def.name.length > 0 && def.name.length <= 24, `${id} name fits a chip`);
    assert.ok(def.desc.length > 0 && def.desc.length <= 90, `${id} desc is one honest line`);
    assert.match(def.color, hex, `${id} color`);
    // A calling never collides with an item id (icons + tooltips key by id).
    assert.ok(!ITEMS.has(id), `${id} shadows an item id`);
  }
});

test('every Calling speaks under the dash ban', () => {
  // docs/VOICE.md: no em dashes, en dashes, or double hyphens in any
  // player-facing line — and U+2212 MINUS SIGN is in the net too, since
  // it reads as an en dash on a card. The codex descs were the last
  // dash nest in the content package.
  for (const [id, def] of CALLINGS) {
    for (const [what, text] of [['name', def.name], ['desc', def.desc]] as const) {
      assert.doesNotMatch(text, /[—–−]|--/, `${id} ${what} carries a banned dash`);
    }
  }
});

test('THE FOCUS LAW costs: minors hold 1, majors hold 2', () => {
  for (const [id, def] of CALLINGS) {
    const expected = def.unlockLevel === 20 ? 1 : 2;
    assert.equal(def.focusCost, expected, `${id} focus cost matches its rung`);
  }
});

test('no strike-kind enchant effect ever rides a Calling', () => {
  for (const [id, def] of CALLINGS) {
    assert.ok(isAggregateCallingEffect(def.effect), `${id} folds a strike kind — forbidden`);
  }
});

test('trade dials point at their own trade', () => {
  // A doubleGather/materialSave/craftSpeed/gatherSpeed calling must key
  // the skill that owns it — a mining calling quickening fishing is a
  // typo this test exists to catch.
  for (const [id, def] of CALLINGS) {
    const fx = def.effect;
    if (
      fx.kind === 'doubleGather' ||
      fx.kind === 'materialSave' ||
      fx.kind === 'craftSpeed' ||
      fx.kind === 'gatherSpeed'
    ) {
      assert.equal(fx.skill, def.skill, `${id} keys a foreign trade`);
    }
  }
});
