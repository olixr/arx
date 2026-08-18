import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CALLING_SWING_CAP,
  STATUS_BOOK,
  SWING_MULT_MAX,
  WEAKEN_MAX_PCT,
  pageOf,
  statusSwingFactor,
  type StatusId,
} from '@arx/shared';
import { ABILITIES } from './abilities.js';
import { CALLINGS, CALLING_MAX_RANK, honedCalling } from './callings.js';
import { NPCS } from './npcs.js';
import { ITEMS } from './items.js';
import { MOVESETS } from './movesets.js';
import { petArtDef } from './petArts.js';
import { ENCHANT_DEFS, type EnchantEffect } from './equipment/enchants.js';
import { SET_WORDS } from './equipment/setWords.js';
import { TEMPERS } from './equipment/tempers.js';

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

test('THE HOLD BUDGET, pet edition: a companion hold is priced by its own art clock', () => {
  // THE GAZE TAKES THE LEASH (2026-08-17): the first licensed hold on
  // the pet cast rail. Its victim is always an NPC (petLegalMark), so
  // the fair-hands stake is the FIGHT's shape, not a player's hands —
  // but the budget binds identically: the lock stays under a tenth of
  // the art's cycle, and the windup warns at least half the lock.
  const LICENSED_PET_CC = ['the_graven_gaze'];
  for (const artId of LICENSED_PET_CC) {
    const art = petArtDef(artId)!;
    const ab = ABILITIES.get(art.ability!)!;
    const page = pageOf(ab.status!.status);
    const cc = page.cc!;
    const lock = Math.min(ab.status!.durationTicks, cc.maxTicks);
    const duty = lock / ((art.cooldownTicks ?? 0) + cc.immunityTicks);
    assert.ok(
      duty <= 0.1,
      `${artId} locks ${(duty * 100).toFixed(1)}% of its cycle — past the tenth`,
    );
    assert.ok(
      (art.windupTicks ?? 0) >= lock / 2,
      `${artId} locks ${lock}t but warns only ${art.windupTicks ?? 0}t`,
    );
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

  // THE WORN BOOK wave (2026-08-17, widened BEFORE the first gear
  // author ships): the equipment lanes join the assembly. Two swing
  // channels live there —
  //  - `swingSpeed` statics fold ADDITIVELY into the one gear mult
  //    (roll.ts's fold law, the speed idiom);
  //  - surge-'swing' procs land as buffs and fold MULTIPLICATIVELY
  //    (buffForge's swingMult law), and distinct workings can overlap
  //    across their icds, so the worst case is their product.
  // The worst wearable wardrobe, priced honestly: ONE enchant per
  // slot with the weapon slot counted TWICE (THE DELIBERATE PAIR —
  // two blades, each bonded; double-best is the pair's upper bound),
  // one family's full words plus a second family's 2pc line (the
  // free-fifth-slot law), and a tempered weapon in each hand.
  interface SwingSay {
    staticPct: number;
    surge: number;
  }
  const swingOf = (effects: readonly EnchantEffect[]): SwingSay => {
    const say: SwingSay = { staticPct: 0, surge: 1 };
    for (const fx of effects) {
      if (fx.kind === 'swingSpeed') say.staticPct += fx.pct;
      if (fx.kind === 'proc' && fx.action.do === 'surge' && fx.action.stat === 'swing') {
        say.surge *= 1 + fx.action.pct / 100;
      }
    }
    return say;
  };
  const factorOf = (s: SwingSay): number => (1 + s.staticPct / 100) * s.surge;

  // Enchants: the worst def per slot, weapon slot worn twice.
  const bestBySlot = new Map<string, SwingSay>();
  for (const e of ENCHANT_DEFS) {
    const say = swingOf(e.effects);
    const held = bestBySlot.get(e.slot);
    if (!held || factorOf(say) > factorOf(held)) bestBySlot.set(e.slot, say);
  }
  // Set words: the worst full house (2pc + 4pc), plus the worst OTHER
  // family's 2pc line riding the free fifth slot.
  const houses = Object.entries(SET_WORDS).map(([setId, words]) => ({
    setId,
    full: swingOf(words.flatMap((w) => w.effects)),
    two: swingOf(words.filter((w) => w.pieces === 2).flatMap((w) => w.effects)),
  }));
  const bestHouse = houses.reduce(
    (a, b) => (factorOf(b.full) > factorOf(a.full) ? b : a),
    { setId: '', full: { staticPct: 0, surge: 1 }, two: { staticPct: 0, surge: 1 } },
  );
  const secondTwo = houses
    .filter((h) => h.setId !== bestHouse.setId)
    .reduce<SwingSay>((a, h) => (factorOf(h.two) > factorOf(a) ? h.two : a), {
      staticPct: 0,
      surge: 1,
    });
  // Tempers: one blade in each hand, the two worst steels.
  const temperSays = Object.values(TEMPERS)
    .map(swingOf)
    .sort((a, b) => factorOf(b) - factorOf(a))
    .slice(0, 2);

  let gearPct = 0;
  let surgeMult = 1;
  const wear = (s: SwingSay, times = 1): void => {
    for (let i = 0; i < times; i++) {
      gearPct += s.staticPct;
      surgeMult *= s.surge;
    }
  };
  for (const [slot, say] of bestBySlot) wear(say, slot === 'weapon' ? 2 : 1);
  wear(bestHouse.full);
  wear(secondTwo);
  for (const say of temperSays) wear(say);

  // THE CALLING AXIS joins the assembly (the repair wave). This pin
  // used to stop at the gear lane while a SECOND pin in
  // callingLedger.test.ts assembled the calling lane and stopped at
  // the gear lane — two green tests, disjoint axes, and a band the
  // engine multiplies across BOTH. That is how a live overflow of
  // 2.17 sat under a 1.5 clamp with every gate green. There is now
  // ONE assembly, and it is this one.
  //
  // Callings pay two ways: a gear-lane swingSpeed pct that folds
  // additively with worn gear (no calling authors one today; the term
  // is kept so the first that does answers HERE), and when-grants
  // that ride as calling-channel buffs. The grants MULTIPLY — every
  // clause whose condition is true at once is held at once — and the
  // engine caps their product at CALLING_SWING_CAP. Priced as the
  // worst case: every grant true together, which the cap then binds.
  let callingGearPct = 0;
  let callingGrants = 1;
  for (const [, def] of CALLINGS) {
    for (const fx of honedCalling(def, CALLING_MAX_RANK)) {
      if (fx.kind === 'gear' && fx.effect.kind === 'swingSpeed') callingGearPct += fx.effect.pct;
      if (fx.kind === 'when') callingGrants *= fx.grant.attackSpeedMult ?? 1;
    }
  }
  const callingPart = Math.min(callingGrants, CALLING_SWING_CAP);

  const assembly =
    pageMax * shelfMax * artMax * (1 + (gearPct + callingGearPct) / 100) * surgeMult * callingPart;
  assert.ok(
    assembly <= SWING_MULT_MAX,
    `the full authored assembly folds to ${assembly.toFixed(3)} — the band is being LEANED ON ` +
      '(the clamp would hide it; the ledger refuses it)',
  );
});

test('THE GEAR HOLDS NO HASTE: the swing channel is not a worn stat', () => {
  // THE STANDING LAW (repair wave, owner's call). The band is 1.5 and
  // the page and the shelf have spent 1.338 of it between them; the
  // 1.1208 that remains belongs to the callings, which is a lane the
  // player CHOOSES rather than one they loot. Haste is deliberately
  // not an armor identity in this game: it is a page, a consumable,
  // and a calling. There are far more interesting things for a worn
  // piece to say, and every one of them is still open.
  //
  // This is a LAW, not a budget — it fails on the first pct, so no
  // future author has to re-derive the arithmetic above to discover
  // there was never any room. A working that wants to hurry a hand
  // should lay `quicken` on the wearer through the boon door instead:
  // the page is bounded, it stacks visibly, and it announces itself.
  const offenders: string[] = [];
  const scan = (where: string, effects: readonly EnchantEffect[]): void => {
    for (const fx of effects) {
      if (fx.kind === 'swingSpeed') offenders.push(`${where} authors swingSpeed ${fx.pct}%`);
      if (fx.kind === 'proc' && fx.action.do === 'surge' && fx.action.stat === 'swing') {
        offenders.push(`${where} authors a surge-'swing' of ${fx.action.pct}%`);
      }
    }
  };
  for (const e of ENCHANT_DEFS) scan(`enchant ${e.id}`, e.effects);
  for (const [setId, words] of Object.entries(SET_WORDS)) {
    for (const w of words) scan(`word ${setId}/${w.pieces}pc`, w.effects);
  }
  for (const [weaponId, effects] of Object.entries(TEMPERS)) scan(`temper ${weaponId}`, effects);
  assert.deepEqual(
    offenders,
    [],
    `the gear lane holds no haste by law — found:\n  ${offenders.join('\n  ')}`,
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
