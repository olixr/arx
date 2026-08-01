import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENCHANTS, itemDef } from '@arx/content';

/**
 * THE METER SHOWS ITS HAND: the wire carries only (id, have, need) for
 * a stacking working, so the HUD chip resolves name, school, and icon
 * from the roster by proc id. These pins keep that resolution total —
 * a stacking working whose chip could not dress itself would ship a
 * meter with no face.
 */
test('every stacking working in the roster can dress its charge chip', () => {
  let stacking = 0;
  for (const e of ENCHANTS.values()) {
    for (const fx of e.effects) {
      if (fx.kind !== 'proc' || fx.trigger.on !== 'stacks') continue;
      stacking++;
      assert.ok(fx.name.length > 0, `${fx.id} has a name to speak`);
      assert.ok(fx.trigger.count > 1, `${fx.id} banks more than one moment`);
      assert.ok(
        itemDef(`scroll_${e.id}`),
        `scroll_${e.id} exists, so the chip has an icon`,
      );
    }
  }
  assert.ok(stacking >= 5, 'the stacking family the meter was built for is present');
});

test('a proc id names one working across the roster (the chip cannot be ambiguous)', () => {
  const seen = new Map<string, string>();
  for (const e of ENCHANTS.values()) {
    for (const fx of e.effects) {
      if (fx.kind !== 'proc') continue;
      const prior = seen.get(fx.id);
      assert.ok(
        prior === undefined || prior === e.id,
        `proc ${fx.id} rides both ${prior} and ${e.id}`,
      );
      seen.set(fx.id, e.id);
    }
  }
});
