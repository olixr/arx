import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES } from './abilities.js';
import { NPCS } from './npcs.js';
import { ITEMS } from './items.js';
import { ENCHANT_DEFS } from './equipment/enchants.js';
import { SET_WORDS } from './equipment/setWords.js';
import { TEMPERS } from './equipment/tempers.js';

/**
 * THE WIDER WOUND'S QUIET (statusBook Phase 3): the wave-one roster
 * — root, stagger, weaken, quicken, mend, stonehide — is engine-
 * complete and APPLIER-FREE. No shipped ability, kit, body, coating,
 * enchant, word, or temper may lay one until the authored tide
 * (Phase 5) prices it against the plan's ledger. This pin is the
 * tripwire: authoring a wave-one applier must consciously rewrite it.
 */

const WAVE_ONE = ['root', 'stagger', 'weaken', 'quicken', 'mend', 'stonehide'];

function leaks(value: unknown): string[] {
  const found: string[] = [];
  const walk = (v: unknown): void => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (typeof v === 'object') {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        if (k === 'status' && typeof x === 'string' && WAVE_ONE.includes(x)) found.push(x);
        walk(x);
      }
    }
  };
  walk(value);
  return found;
}

test('the wave-one roster has no shipped applier anywhere in content', () => {
  for (const [id, ab] of ABILITIES) {
    assert.deepEqual(leaks(ab), [], `${id} lays a wave-one state before the tide`);
  }
  for (const [id, def] of NPCS) {
    assert.deepEqual(leaks(def), [], `${id} lays a wave-one state before the tide`);
  }
  for (const [id, item] of ITEMS) {
    assert.deepEqual(leaks(item), [], `${id} lays a wave-one state before the tide`);
  }
  for (const e of ENCHANT_DEFS) {
    assert.deepEqual(leaks(e), [], `${e.id} lays a wave-one state before the tide`);
  }
  for (const [setId, words] of Object.entries(SET_WORDS)) {
    assert.deepEqual(leaks(words), [], `${setId} speaks a wave-one state before the tide`);
  }
  for (const [wid, fx] of Object.entries(TEMPERS)) {
    assert.deepEqual(leaks(fx), [], `${wid} tempers a wave-one state before the tide`);
  }
});
