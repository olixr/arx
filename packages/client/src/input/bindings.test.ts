import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  Bindings,
  assertNoConflicts,
  kbLabel,
  padGlyph,
} from './bindings.js';

// THE NO-CONFLICT CONTRACT: the shipped layout may never bind one key
// or one pad button to two actions. This is the regression wall for
// the 2026-07 audit (C = sneak + Handiwork, d-pad ▼ = sit + Handiwork,
// d-pad ◀ = sheathe + camera).
test('shipped defaults are conflict-free on both devices', () => {
  const table = Object.fromEntries(
    ACTIONS.map((a) => [a.id, { kb: [...a.kb], pad: [...a.pad] }]),
  ) as Parameters<typeof assertNoConflicts>[0];
  assertNoConflicts(table); // throws on any double-booking
});

test('every action has a label and a group', () => {
  for (const a of ACTIONS) {
    assert.ok(a.label.length > 0, a.id);
    assert.ok(a.group.length > 0, a.id);
  }
});

test('core actions are reachable on the pad', () => {
  // The audit found pads had NO dodge at all — never again. Every
  // combat-critical action must ship with a pad button.
  const padRequired = [
    'attack',
    'ability1',
    'ability2',
    'ability3',
    'ability4',
    'dodge',
    'interact',
    'sit',
    'sheathe',
    'sneakToggle',
    'screenPack',
    'screenMap',
  ] as const;
  for (const id of padRequired) {
    const def = ACTIONS.find((a) => a.id === id)!;
    assert.ok(def.pad.length > 0, `${id} must have a pad binding`);
  }
});

// THE PAIRED HAND: the two technique seats ship side by side — Q/E on
// keys, LB/LT under a pad's left hand — because arts are earned first
// and cast most. The trinkets sit behind them (relic R/RB, sigil T/▲).
test('the two art seats ride together by default', () => {
  const def = (id: string) => ACTIONS.find((a) => a.id === id)!;
  assert.deepEqual([...def('ability1').kb], ['KeyQ']);
  assert.deepEqual([...def('ability1').pad], [4]); // LB
  assert.deepEqual([...def('ability3').kb], ['KeyE']);
  assert.deepEqual([...def('ability3').pad], [6]); // LT
  assert.deepEqual([...def('ability2').kb], ['KeyR']);
  assert.deepEqual([...def('ability2').pad], [5]); // RB
});

test('rebinding steals the key from its old owner', () => {
  const b = new Bindings();
  b.resetAll();
  const res = b.bindKb('dodge', 'Space'); // Space is attack's
  assert.notEqual(res, 'reserved');
  assert.equal((res as { stolenFrom: string | null }).stolenFrom, 'attack');
  assert.deepEqual([...b.kb('dodge')], ['Space']);
  assert.ok(!b.kbMatches('attack', 'Space'));
  b.resetAll();
});

test('reserved keys are refused', () => {
  const b = new Bindings();
  b.resetAll();
  assert.equal(b.bindKb('attack', 'Escape'), 'reserved');
  assert.equal(b.bindKb('attack', 'Enter'), 'reserved');
  assert.deepEqual([...b.kb('attack')], ['Space']);
  b.resetAll();
});

test('pad rebinding steals too, and resetAll restores the table', () => {
  const b = new Bindings();
  b.resetAll();
  const res = b.bindPad('sheathe', 11); // R3 is zoomCycle's
  assert.equal(res.stolenFrom, 'zoomCycle');
  assert.deepEqual([...b.pad('sheathe')], [11]);
  assert.equal(b.isCustomized(), true);
  b.resetAll();
  assert.equal(b.isCustomized(), false);
  assert.deepEqual([...b.pad('sheathe')], [14]);
  assert.deepEqual([...b.pad('zoomCycle')], [11]);
});

test('labels render for every shipped binding', () => {
  for (const a of ACTIONS) {
    for (const code of a.kb) {
      const label = kbLabel(code);
      assert.ok(label.length > 0 && !label.startsWith('Key'), `${code} → ${label}`);
    }
    for (const btn of a.pad) {
      const g = padGlyph(btn);
      assert.ok(g.cls.length > 0, `pad ${btn} needs a glyph class`);
    }
  }
});
