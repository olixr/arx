import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES } from './abilities.js';
import { NPCS } from './npcs.js';
import { ITEMS } from './items.js';
import { ENCHANT_DEFS } from './equipment/enchants.js';
import { SET_WORDS } from './equipment/setWords.js';
import { TEMPERS } from './equipment/tempers.js';
import { ONEHAND_LICENSES } from './abilities/schools/onehand.js';
import { ARCHERY_LICENSES } from './abilities/schools/archery.js';
import { ARX_LICENSES } from './abilities/schools/arx.js';
import { SNEAK_LICENSES } from './abilities/schools/sneak.js';
import { SHIELD_LICENSES } from './abilities/schools/shield.js';
import { TWOHAND_LICENSES } from './abilities/schools/twohand.js';
import { DUALWIELD_LICENSES } from './abilities/schools/dualwield.js';
import { COMBAT_LICENSES } from './abilities/schools/combat.js';
import { POLEARM_LICENSES } from './abilities/polearm.js';

/**
 * THE AUTHORED TIDE'S REGISTER (statusBook Phase 5 — this file was
 * Phase 3's silence tripwire, consciously rewritten the day the tide
 * came in, exactly as designed). The wave-one roster now has
 * APPLIERS, and every one of them is NAMED here: eight boss arts,
 * one page each — self boons through the selfStatus door, player-
 * facing holds and marks through the status rider. ANYTHING ELSE
 * that lays a wave-one state is a stranger and fails this pin, so
 * the next applier is always a conscious ledger decision, never a
 * drive-by. The equipment lanes (enchants, words, tempers) spoke
 * their first pages with THE WORN BOOK wave — licensed by container
 * id in GEAR_LICENSED below; every other lane entry stays refused.
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
  // THE GAZE TAKES THE LEASH (conscious, 2026-08-17): the basilisk
  // family opened to the tame ladder (user mandate), and its shelf
  // carries the family identity through the SAME two doors the wild
  // court licensed — a shorter root through the pet cast rail (the
  // pet-side HOLD BUDGET pin in statusLedger prices it against the
  // PetArtDef's own pacing) and the elder's mantle as a self-page
  // boon at heel. Pets only ever fight NPCs (petLegalMark), so the
  // player-facing FAIR HANDS ledger is untouched by either.
  the_graven_gaze: 'root',
  graven_mantle: 'stonehide',
};

/**
 * THE WORN BOOK wave (conscious rewrite, 2026-08-17): the equipment
 * lanes' first licenses. Keyed by CONTAINER — the enchant def's id or
 * the set family's id — each licensed to lay exactly one page, and
 * every other enchant, word, and temper stays a refused stranger.
 * temper 'laurelbrand' (the surge-'swing' debut) carries no status id
 * at all, so the leak walk never sees it — its price lives in the
 * SWING ASSEMBLY pin (statusLedger), not here.
 */
const GEAR_LICENSED: Record<string, string[]> = {
  // The enchant lane's two boon scrolls (ids per the enchant lane):
  // hurt -> boon mend (MEND is priced by its own ledger pin) and
  // block -> boon stonehide.
  ench_quiet_mending: ['mend'],
  ench_standing_stone: ['stonehide'],
  // The set lane's two count-chase words: stormtalon's 4pc boon on
  // the self door, packlord's 4pc boon handed to the pet (target
  // 'pet' — the companion door, never another player).
  stormtalon: ['quicken'],
  packlord: ['quicken'],
};

/**
 * THE MASTERED HAND (techniques v3): player-wielded wave-one pages,
 * licensed one applier at a time by the school waves. A player art
 * lays its page on NPCs only (FAIR HANDS is untouched — no player is
 * ever held by another player's art), and every entry here is priced
 * by the HOLD BUDGET pins in statusLedger.test.ts. Add the art id and
 * the exact page list it lays (follow statuses and aftermath pages
 * count); the register refuses anything unlisted.
 */
export const PLAYER_LICENSED: Record<string, string[]> = {
  ...ONEHAND_LICENSES,
  ...ARCHERY_LICENSES,
  ...ARX_LICENSES,
  ...SNEAK_LICENSES,
  ...SHIELD_LICENSES,
  ...TWOHAND_LICENSES,
  ...DUALWIELD_LICENSES,
  ...COMBAT_LICENSES,
  ...POLEARM_LICENSES,
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
        // THE READING EDGE reads a page; it lays nothing — a `vs`
        // clause is never an applier.
        if (k === 'vs') continue;
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
    const playerLicensed = PLAYER_LICENSED[id];
    if (licensed) {
      assert.deepEqual(laid, [licensed], `${id} must lay exactly its licensed page`);
    } else if (playerLicensed) {
      assert.deepEqual([...laid].sort(), [...playerLicensed].sort(), `${id} must lay exactly its licensed pages`);
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
  // FAIR HANDS is about the hands laid on PLAYERS: the count walks the
  // arts a body carries in its kit (THE MASTERED HAND licenses player
  // staggers on NPCs through PLAYER_LICENSED — a different lane).
  const carried = new Set<string>();
  for (const [, def] of NPCS) for (const k of def.kit ?? []) carried.add(k.ability);
  let staggers = 0;
  for (const [id, ab] of ABILITIES) {
    if (!carried.has(id)) continue;
    const walk = JSON.stringify(ab);
    if (walk.includes('"stagger"')) staggers++;
  }
  assert.equal(staggers, 1, 'the anvil toll is THE one stagger signature laid on players (the green-light law)');
  const grasp = ABILITIES.get('tide_grasp')!;
  assert.ok((grasp.status?.durationTicks ?? 99) <= 40, "a root's clock never outruns its page");
});

test('the quiet lanes stay quiet: bodies and the shelf lay no wave-one state, gear only by license', () => {
  for (const [id, def] of NPCS) {
    // Kits reference art ids; the DEF itself (attackStatus etc.) must
    // stay silent — a body's basic bite never lays a wave-one page.
    assert.deepEqual(leaks(def), [], `${id} lays a wave-one state outside the register`);
  }
  for (const [id, item] of ITEMS) {
    assert.deepEqual(leaks(item), [], `${id} lays a wave-one state before its lane is priced`);
  }
  // THE WORN BOOK: a licensed container lays exactly its page the day
  // it is authored; everything else in the gear lanes stays refused.
  for (const e of ENCHANT_DEFS) {
    assert.deepEqual(leaks(e), GEAR_LICENSED[e.id] ?? [], `${e.id} strays`);
  }
  for (const [setId, words] of Object.entries(SET_WORDS)) {
    assert.deepEqual(leaks(words), GEAR_LICENSED[setId] ?? [], `${setId} strays`);
  }
  for (const [wid, fx] of Object.entries(TEMPERS)) assert.deepEqual(leaks(fx), [], `${wid} strays`);
});
