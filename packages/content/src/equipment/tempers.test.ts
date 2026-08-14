import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../items.js';
import {
  MASTERWORK_DAGGERS,
  MASTERWORK_SWORDS,
  STAFF_REGALIA,
  TEMPERS,
} from './tempers.js';
import { SET_WORDS } from './setWords.js';
import { ENCHANT_DEFS, procMismatch } from './enchants.js';
import { weaponStrikeEffects } from './roll.js';

/**
 * THE WEAPON'S TEMPER laws (buildcraft Phase 4):
 *
 * - every masterwork and regalia carries at least one native effect
 *   after compile (borrowed_time and wakestone through their own
 *   pre-buildcraft natives, everyone else through the registry);
 * - every temper key IS a masterwork or regalia — the registry can
 *   never quietly temper a common blade;
 * - temper procs validate (procMismatch, icd > 0) and their ids are
 *   `temper_` prefixed and globally unique against the enchant
 *   roster AND the house words (ONE ID, ONE TIMER is one law);
 * - loudness honesty: onHitStatus tempers stay ambient (chance at or
 *   under 0.2, power at or under 3); hitState signatures rest at
 *   least 150 ticks — a signature is an event, not a texture;
 * - the strike channel resolves: a strike-triggered temper appears in
 *   weaponStrikeEffects for its blade.
 */

const ROSTER = [...MASTERWORK_SWORDS, ...MASTERWORK_DAGGERS, ...STAFF_REGALIA];

test('every masterwork and regalia is tempered after compile', () => {
  for (const id of ROSTER) {
    const item = ITEMS.get(id);
    assert.ok(item?.gear, `${id} missing from the roster`);
    assert.ok((item.gear.effects?.length ?? 0) > 0, `${id} carries no temper`);
  }
});

test('the registry tempers the honor roll alone', () => {
  const roster = new Set<string>(ROSTER);
  for (const id of Object.keys(TEMPERS)) {
    assert.ok(roster.has(id), `${id} is no masterwork or regalia`);
    assert.equal(TEMPERS[id]!.length, 1, `${id} carries ONE temper, its own`);
  }
  assert.ok(!TEMPERS.borrowed_time && !TEMPERS.wakestone,
    'the two legacy natives keep their own steel');
});

test('temper procs validate and their ids collide with nothing', () => {
  const seen = new Set<string>();
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) if (fx.kind === 'proc') seen.add(fx.id);
  }
  for (const words of Object.values(SET_WORDS)) {
    for (const w of words) for (const fx of w.effects) if (fx.kind === 'proc') seen.add(fx.id);
  }
  for (const [id, effects] of Object.entries(TEMPERS)) {
    for (const fx of effects) {
      if (fx.kind !== 'proc') continue;
      assert.ok(fx.id.startsWith('temper_'), `${id}: temper procs carry the temper_ prefix`);
      assert.ok(!seen.has(fx.id), `${id}: proc id ${fx.id} spoken twice`);
      seen.add(fx.id);
      assert.equal(procMismatch(fx), null, `${id}: unfirable temper`);
      assert.ok(fx.icd > 0, `${id}: a temper must rest`);
    }
  }
});

test('loudness honesty: ambient tempers whisper, signatures rest', () => {
  for (const [id, effects] of Object.entries(TEMPERS)) {
    for (const fx of effects) {
      if (fx.kind === 'onHitStatus') {
        assert.ok(fx.chance <= 0.2, `${id}: an ambient temper past 20% is a texture`);
        assert.ok(fx.power <= 3, `${id}: ambient power stays small`);
      }
      if (fx.kind === 'proc' && fx.trigger.on === 'hitState') {
        assert.ok(fx.icd >= 150, `${id}: a body-reading signature is an event`);
      }
      if (fx.kind === 'vsState') {
        assert.ok(fx.pct <= 25, `${id}: a temper clause stays under the word ceiling`);
      }
    }
  }
});

test('the strike channel resolves the steel tempers', () => {
  const northlight = weaponStrikeEffects('northlight');
  assert.ok(northlight.procs.some((p) => p.id === 'temper_northlight'),
    'a hitState temper rides the landed blade');
  const lamplight = weaponStrikeEffects('lamplight');
  assert.equal(lamplight.onHit.length, 1, 'an ambient applier rides the strike');
  assert.equal(lamplight.onHit[0]!.status, 'burn');
});
