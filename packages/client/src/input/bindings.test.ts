import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  Bindings,
  assertNoConflicts,
  currentPadFamily,
  kbLabel,
  padGlyph,
  padGlyphInline,
} from './bindings.js';
import { padFaces } from './padProfiles.js';

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
    // THE BELT outranks the pose: d-pad ▼ swallows the belt consumable
    // now. Sit ships keyboard-only (X) and stays rebindable on pad.
    'quickUse',
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

// ---- THE BUTTON WEARS ITS OWN NAME: family-aware glyphs ----

test('padGlyph letters the faces for a given family, classes staying positional', () => {
  const ns = padFaces('ns', 'standard');
  assert.deepEqual(padGlyph(0, ns, 'ns'), { cls: 'a', text: 'B' });
  assert.deepEqual(padGlyph(1, ns, 'ns'), { cls: 'b', text: 'A' });
  assert.equal(padGlyph(4, ns, 'ns').text, 'L');
  assert.equal(padGlyph(7, ns, 'ns').text, 'ZR');
  assert.equal(padGlyph(9, ns, 'ns').text, '+');
  const ps = padFaces('ps', 'standard');
  assert.deepEqual(padGlyph(0, ps, 'ps'), { cls: 'a', text: '✕' });
  assert.deepEqual(padGlyph(3, ps, 'ps'), { cls: 'y', text: '△' });
  assert.equal(padGlyph(6, ps, 'ps').text, 'L2');
});

test('the default family is Xbox — exactly the old table', () => {
  assert.deepEqual(padGlyph(0), { cls: 'a', text: 'A' });
  assert.deepEqual(padGlyph(3), { cls: 'y', text: 'Y' });
  assert.equal(padGlyph(4).text, 'LB');
  assert.equal(padGlyph(8).text, '⧉');
});

test('setPadFamily re-letters the live glyphs and tells the chips', () => {
  const b = new Bindings();
  let fired = 0;
  b.onChange(() => fired++);
  b.setPadFamily('ns', 'switch-pro');
  assert.equal(fired, 1);
  assert.equal(currentPadFamily(), 'ns');
  // switch-pro maps by label: slot 0 IS the Nintendo A.
  assert.equal(padGlyph(0).text, 'A');
  assert.equal(padGlyph(1).text, 'B');
  assert.equal(padGlyphInline(0), 'Ⓐ');
  // Same family again, same faces: no redraw storm.
  b.setPadFamily('ns', 'switch-pro');
  assert.equal(fired, 1);
  // ...but a profile change within the family re-letters.
  b.setPadFamily('ns', 'standard');
  assert.equal(fired, 2);
  assert.equal(padGlyph(0).text, 'B');
  b.setPadFamily('ps', 'standard');
  assert.equal(padGlyphInline(0), '✕'); // shapes stand as themselves
  b.setPadFamily('xbox', 'standard'); // leave the module as found
  assert.equal(padGlyph(0).text, 'A');
});
