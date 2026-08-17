import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_BOOK,
  SWING_MULT_MAX,
  WEAKEN_MAX_PCT,
  pageOf,
  statusSwingFactor,
  type StatusId,
} from '@arx/shared';
import { ABILITIES } from './abilities.js';
import { NPCS } from './npcs.js';
import { ITEMS } from './items.js';
import { MOVESETS } from './movesets.js';

/**
 * THE LEDGER HOLDS (statusBook Phase 6) — the epic's constitution.
 * Every authored page interaction priced in one place, so the whole
 * system's power stays inside the plan's Part 4 table however many
 * hands author against it. These pins are CROSS-SYSTEM: they read
 * the live pages, the live boss kits, the live movesets, and the
 * live shelf together, so a number moved in any one of them answers
 * here.
 */

const LICENSED_CC: Array<{ art: string; boss: string }> = [
  { art: 'tide_grasp', boss: 'skral_tidelord' },
  { art: 'anvil_toll', boss: 'anvil_golem' },
  // THE STONE COURT (2026-08-17): the petrifying gaze is a licensed
  // hold on BOTH carriers — each pays the budget on its own kit row.
  { art: 'stone_gaze', boss: 'basilisk' },
  { art: 'stone_gaze', boss: 'elder_basilisk' },
];

test('THE HOLD BUDGET: no licensed control art may lock a player past a tenth of its cycle', () => {
  for (const { art, boss } of LICENSED_CC) {
    const ab = ABILITIES.get(art)!;
    const page = pageOf(ab.status!.status);
    const cc = page.cc!;
    const kit = NPCS.get(boss)!.kit!.find((k) => k.ability === art)!;
    const lock = Math.min(ab.status!.durationTicks, cc.maxTicks);
    // The cycle the victim lives: the art's rest plus the immunity
    // the page grants after — the lock's honest denominator.
    const duty = lock / (kit.cooldownTicks + cc.immunityTicks);
    assert.ok(
      duty <= 0.1,
      `${art} locks ${(duty * 100).toFixed(1)}% of its cycle — past the tenth`,
    );
    // And the full telegraph — the windup PLUS a ground art's fuse —
    // warns at least half as long as the hold: FAIR HANDS starts
    // before the lock does, whichever door delivers it.
    const warn = (kit.windupTicks ?? 0) + (ab.fuseTicks ?? 0);
    assert.ok(warn >= lock / 2, `${art} locks ${lock}t but warns only ${warn}t`);
  }
});

test('THE DULLED CLAMP: every authored weaken speaks under the page ceiling', () => {
  for (const [id, ab] of ABILITIES) {
    const s = ab.status;
    if (s && pageOf(s.status).powerIs === 'dealtPct') {
      assert.ok(s.power <= WEAKEN_MAX_PCT, `${id} authors weaken past the clamp`);
      assert.ok(s.power > 0, `${id} authors a toothless mark`);
    }
  }
});

test('THE SWING ASSEMBLY: the worst authored stack of haste folds inside the band before the clamp', () => {
  // The deepest page: quicken at its own max.
  const pageMax = statusSwingFactor([
    { id: 'quicken', power: 0, ticksLeft: 1, stacks: STATUS_BOOK.quicken.stacking.max },
  ]);
  // The strongest shelf: the biggest consumable swing multiplier.
  let shelfMax = 1;
  for (const [, item] of ITEMS) {
    shelfMax = Math.max(shelfMax, item.buff?.attackSpeedMult ?? 1);
  }
  // The strongest art: the biggest self-buff swing multiplier.
  let artMax = 1;
  for (const [, ab] of ABILITIES) {
    artMax = Math.max(artMax, ab.self?.attackSpeedMult ?? 1);
  }
  const assembly = pageMax * shelfMax * artMax;
  assert.ok(
    assembly <= SWING_MULT_MAX,
    `the full authored assembly folds to ${assembly.toFixed(3)} — the band is being LEANED ON ` +
      '(the clamp would hide it; the ledger refuses it)',
  );
});

test('THE MEND BOUND: a knitting crown gives back at most a quarter of itself per cast', () => {
  for (const [id, ab] of ABILITIES) {
    const s = ab.self?.selfStatus;
    if (!s || pageOf(s.status).tick?.kind !== 'heal') continue;
    const page = pageOf(s.status);
    const totalHeal = s.power * Math.floor(s.durationTicks / page.tick!.every);
    for (const [bossId, def] of NPCS) {
      if (!def.kit?.some((k) => k.ability === id)) continue;
      assert.ok(
        totalHeal <= def.maxHp * 0.25,
        `${bossId}'s ${id} knits ${totalHeal} of ${def.maxHp} — past the quarter`,
      );
    }
  }
});

test('THE CONSUME CEILING: no finisher beat spends a state for more than half again', () => {
  for (const [mid, ms] of Object.entries(MOVESETS)) {
    for (const beat of ms.string) {
      if (beat.consumes) {
        assert.ok(beat.consumes.mult <= 1.5, `${mid}/${beat.key} spends past the ceiling`);
        assert.ok(
          pageOf(beat.consumes.status).lane === 'affliction',
          `${mid}/${beat.key} spends a state that is not a wound — the verb eats DoTs only`,
        );
      }
    }
  }
});

test('THE SELF-PAGE LAW: a body lays only boons on itself; hostile pages need a victim', () => {
  for (const [id, ab] of ABILITIES) {
    const s = ab.self?.selfStatus;
    if (s) {
      assert.equal(
        pageOf(s.status).hostile,
        false,
        `${id} lays a hostile page on its own caster — the door is for boons`,
      );
    }
  }
});

test('THE COAT BOUND: stonehide at full depth lends modest armor, never a wall', () => {
  const page = STATUS_BOOK.stonehide;
  const full = (page.statMods?.armorDelta ?? 0) * page.stacking.max;
  assert.ok(full > 0 && full <= 15, `stonehide at depth lends ${full} — past the plate line`);
});

test('the register and the book agree on every licensed page id', () => {
  // A licensed art whose page id ever leaves the union fails to
  // compile; this pin holds the RUNTIME agreement — kit arts resolve,
  // their statuses have pages, and each page carries its full
  // visuals contract (a licensed page may never land mute).
  const licensed = [
    'tyrants_frenzy',
    'gravecold_pall',
    'barrow_knit',
    'tide_grasp',
    'barnacle_plate',
    'matriarchs_howl',
    'oldfangs_blood',
    'anvil_toll',
  ];
  for (const id of licensed) {
    const ab = ABILITIES.get(id);
    assert.ok(ab, `${id} missing`);
    const sid: StatusId | undefined = ab!.status?.status ?? ab!.self?.selfStatus?.status;
    assert.ok(sid, `${id} carries no page`);
    const v = pageOf(sid!).visuals;
    assert.ok(v.ink && v.landing && v.icon, `${sid} would land mute`);
  }
});
