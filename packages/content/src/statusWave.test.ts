import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES } from './abilities.js';
import { NPCS } from './npcs.js';
import { ITEMS } from './items.js';
import { ENCHANT_DEFS } from './equipment/enchants.js';
import { SET_WORDS } from './equipment/setWords.js';
import { TEMPERS } from './equipment/tempers.js';

/**
 * THE AUTHORED TIDE'S REGISTER (statusBook Phase 5 — this file was
 * Phase 3's silence tripwire, consciously rewritten the day the tide
 * came in, exactly as designed). The wave-one roster now has
 * APPLIERS, and every one of them is NAMED here: eight boss arts,
 * one page each — self boons through the selfStatus door, player-
 * facing holds and marks through the status rider. ANYTHING ELSE
 * that lays a wave-one state is a stranger and fails this pin, so
 * the next applier is always a conscious ledger decision, never a
 * drive-by. The equipment lanes (enchants, words, tempers) stay
 * silent by design — their wave is a future pricing.
 */

const WAVE_ONE = ['root', 'stagger', 'weaken', 'quicken', 'mend', 'stonehide'];

/** The register: ability id -> the ONE page it is licensed to lay. */
const LICENSED: Record<string, string> = {
  tyrants_frenzy: 'quicken',
  gravecold_pall: 'weaken',
  barrow_knit: 'mend',
  tide_grasp: 'root',
  barnacle_plate: 'stonehide',
  matriarchs_howl: 'weaken',
  oldfangs_blood: 'quicken',
  anvil_toll: 'stagger',
  // THE STONE COURT'S LEDGER ENTRY (conscious, 2026-08-17): the
  // basilisks' whole identity IS the petrifying hold — a root laid
  // through the tide_grasp door's exact grammar (ground_aoe, fused,
  // ledger-budgeted on both carriers), and the elder's inward gaze
  // through the deepmaw's selfStatus door. The wild's first
  // non-crown licenses, priced by the same HOLD BUDGET pins.
  stone_gaze: 'root',
  stone_mantle: 'stonehide',
};

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

test('every wave-one applier is licensed, lays exactly its page, and no stranger exists', () => {
  for (const [id, ab] of ABILITIES) {
    const laid = leaks(ab);
    const licensed = LICENSED[id];
    if (licensed) {
      assert.deepEqual(laid, [licensed], `${id} must lay exactly its licensed page`);
    } else {
      assert.deepEqual(laid, [], `${id} lays a wave-one state without a license`);
    }
  }
  // Every license is spoken for — a retired art may not keep its seat.
  for (const id of Object.keys(LICENSED)) {
    assert.ok(ABILITIES.has(id), `licensed art ${id} is missing from the roster`);
  }
});

test('the eight licensed arts are the EIGHT CROWNS: one per boss kit, page-matched', () => {
  const bossArt: Record<string, string> = {
    goblin_flame_tyrant: 'tyrants_frenzy',
    skeleton_fallen_king: 'gravecold_pall',
    skeleton_barrow_lord: 'barrow_knit',
    skral_tidelord: 'tide_grasp',
    skral_deepmaw: 'barnacle_plate',
    gnoll_matriarch: 'matriarchs_howl',
    wolf_oldfang: 'oldfangs_blood',
    anvil_golem: 'anvil_toll',
  };
  for (const [bossId, artId] of Object.entries(bossArt)) {
    const def = NPCS.get(bossId);
    assert.ok(def?.boss, `${bossId} wears no crown`);
    assert.ok(
      def!.kit?.some((k) => k.ability === artId),
      `${bossId} does not carry its page's art ${artId}`,
    );
  }
});

test('FAIR HANDS at the register: one player stagger in the whole game, root page-clamped', () => {
  let staggers = 0;
  for (const [, ab] of ABILITIES) {
    const walk = JSON.stringify(ab);
    if (walk.includes('"stagger"')) staggers++;
  }
  assert.equal(staggers, 1, 'the anvil toll is THE one stagger signature (the green-light law)');
  const grasp = ABILITIES.get('tide_grasp')!;
  assert.ok((grasp.status?.durationTicks ?? 99) <= 40, "a root's clock never outruns its page");
});

test('the quiet lanes stay quiet: gear, bodies, and the shelf lay no wave-one state', () => {
  for (const [id, def] of NPCS) {
    // Kits reference art ids; the DEF itself (attackStatus etc.) must
    // stay silent — a body's basic bite never lays a wave-one page.
    assert.deepEqual(leaks(def), [], `${id} lays a wave-one state outside the register`);
  }
  for (const [id, item] of ITEMS) {
    assert.deepEqual(leaks(item), [], `${id} lays a wave-one state before its lane is priced`);
  }
  for (const e of ENCHANT_DEFS) assert.deepEqual(leaks(e), [], `${e.id} strays`);
  for (const [setId, words] of Object.entries(SET_WORDS)) {
    assert.deepEqual(leaks(words), [], `${setId} strays`);
  }
  for (const [wid, fx] of Object.entries(TEMPERS)) assert.deepEqual(leaks(fx), [], `${wid} strays`);
});
