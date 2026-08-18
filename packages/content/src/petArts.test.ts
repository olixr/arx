/**
 * THE FANG FINDS ITS VOICE — the repertoire's contract tests
 * (docs/pet-arts-plan.md). The validator is the law; these pins are
 * the design statements that must go red if anybody re-decides them
 * silently.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { petFocusMax } from '@arx/shared';
import { ABILITIES } from './abilities.js';
import {
  PET_ART_DEFS,
  PET_ARTS,
  PET_REPERTOIRE,
  PET_SAFE_SHAPES,
  PET_VARIANT_PAIRS,
  petArtDef,
  petRepertoireErrors,
  repertoireFor,
} from './petArts.js';
import { TAMES, petStatBlock } from './tames.js';

test('the repertoire clears every law it wrote for itself', () => {
  assert.deepEqual(petRepertoireErrors(), []);
});

test('the shelves are whole: nineteen species, eighty four words', () => {
  // Move these numbers ON PURPOSE when the roster grows — the pin
  // exists so a lost row or an orphaned art is loud, not silent.
  // 18: the basilisk joined the fen (THE GAZE TAKES THE LEASH,
  // 2026-08-17) and the family shelf was recut BESPOKE — the fen's
  // borrowed reptile words and the turtle's monolith went home, and
  // nine family words were minted (71 + 9 = 80).
  // 19: THE RED SKULK ANSWERS (user mandate 2026-08-18) — the fox
  // took the two canid family words and minted four of its own (the
  // larder, the wary coat, the tally, and the dive): 80 + 4 = 84.
  assert.equal(Object.keys(PET_REPERTOIRE).length, 19);
  assert.equal(PET_ART_DEFS.length, 84);
  // Exactly one signature ART per species' shelf — the stone court
  // now mints its own two (the mire and the gaze), so eighteen.
  const signatures = PET_ART_DEFS.filter((a) => a.focus === 3);
  assert.equal(signatures.length, 19);
  // Every art is shelved somewhere; an unshelved art is a ghost.
  const shelved = new Set(Object.values(PET_REPERTOIRE).flat());
  for (const art of PET_ART_DEFS) {
    assert.ok(shelved.has(art.id), `${art.id} is on no species' shelf`);
  }
});

test('every species holds a first word a fresh tame can afford', () => {
  // A fresh tame holds exactly 1 focus (petFocusMax(low, 0)); a shelf
  // with no 1-focus art would greet the naming ceremony with silence.
  assert.equal(petFocusMax(1, 0), 1);
  for (const [species, shelf] of Object.entries(PET_REPERTOIRE)) {
    const cheapest = Math.min(...shelf.map((id) => petArtDef(id)!.focus));
    assert.equal(cheapest, 1, `${species}: no first word a fresh tame can slot`);
  }
});

test('the variant pairs share the pool and never an exclusive', () => {
  // Pinned by NAME so a drift is loud: the lesser variant keeps
  // exclusivity too (the user's law, plan Part 0).
  const pin: Record<string, { shared: string[]; lesser: string[]; greater: string[] }> = {
    'boar/dire_boar': {
      shared: ['gore_charge', 'bristleback', 'tusk_sweep'],
      lesser: ['rooting_snout', 'mud_wallow', 'the_stubborn_heart'],
      greater: ['iron_hide', 'old_scars', 'the_long_furrow'],
    },
    'lynx_young/lynx': {
      shared: ['soft_paw', 'raking_flurry', 'sharpened_claws'],
      lesser: ['playful_feint', 'the_pounce_perfected'],
      greater: ['tufted_patience', 'keen_tufts', 'the_winter_stalk'],
    },
    'wolf/worg': {
      shared: ['worry_the_wound', 'pack_step', 'blooded_run'],
      lesser: ['hamstring', 'lone_vigil', 'the_first_howl'],
      greater: ['winters_jaw', 'war_pelt', 'the_cowing_snarl'],
    },
    // THE STONE COURT: the marsh half and the stone half of one
    // family — both swing the great tail, neither borrows a word.
    'fen_basilisk/basilisk': {
      shared: ['graven_scale', 'the_low_fire', 'tail_sweep'],
      lesser: ['mire_spit', 'swamp_blood', 'the_drowning_mire'],
      greater: ['the_lidless_watch', 'graven_mantle', 'the_graven_gaze'],
    },
  };
  for (const [a, b] of PET_VARIANT_PAIRS) {
    const want = pin[`${a}/${b}`];
    assert.ok(want, `unpinned variant pair ${a}/${b}`);
    const setA = new Set(repertoireFor(a));
    const setB = new Set(repertoireFor(b));
    assert.deepEqual(
      [...setA].filter((id) => setB.has(id)).sort(),
      [...want.shared].sort(),
    );
    assert.deepEqual(
      [...setA].filter((id) => !setB.has(id)).sort(),
      [...want.lesser].sort(),
    );
    assert.deepEqual(
      [...setB].filter((id) => !setA.has(id)).sort(),
      [...want.greater].sort(),
    );
  }
});

test('no pet art is a keeper technique, and no shape leaks', () => {
  for (const art of PET_ART_DEFS) {
    if (art.kind !== 'active') continue;
    const ab = ABILITIES.get(art.ability!)!;
    assert.ok(PET_SAFE_SHAPES.has(ab.shape), `${art.id}: shape ${ab.shape}`);
    assert.equal(ab.cooldownTicks, 0, `${art.id}: pacing lives on the PetArtDef`);
    assert.ok(!ab.summonNpc && !ab.summon, `${art.id}: no pet armies`);
  }
});

/**
 * THE EQUALIZER LAW (plan LAW 6, amended by measurement 2026-08-16):
 * the shipped wild bodies were NEVER at parity — at level-parity 60
 * the tame ladder's own crown (giant_crab, the deep courtship) stands
 * ~2.6x the entry bat in raw fight math, by decree older than this
 * epic. The repertoire's contract is therefore not flat parity but
 * the equalizer: every species' best loadout must be WORTH SLOTTING
 * (lift >= 1.08), the loadout spread must never exceed the base-body
 * spread (the arts narrow, never widen), and an absolute guard holds
 * the whole roster inside 2.6. The 1.6 aspiration remains the live
 * tuning target, owned by the Phase 5 ledger.
 */
const LEVEL = 60;
const BC = 60;
const BUDGET = petFocusMax(LEVEL, 4);

function loadoutScore(species: string, picks: string[]): number {
  const stats = petStatBlock(species, LEVEL, BC)!;
  let dmgMult = 1;
  let hpMult = 1;
  let armor = stats.armor;
  let dpsExtra = 0;
  for (const id of picks) {
    const art = PET_ARTS.get(id)!;
    const p = art.passive;
    if (p) {
      dmgMult *= p.dmgMult ?? 1;
      hpMult *= p.maxHpMult ?? 1;
      armor += p.armor ?? 0;
      armor += (p.woundedArmor?.armor ?? 0) * 0.4;
      armor += (p.unhurtArmor?.armor ?? 0) * 0.4;
      armor += (p.nearKeeper?.armor ?? 0) * 0.6;
      if (p.firstBlowShrug) hpMult *= 1.05;
      if (p.deathDefy) hpMult *= 1.12;
      if (p.statusDurMult) hpMult *= 1 + (1 - p.statusDurMult) * 0.1;
      if (p.vsStatus) dmgMult *= 1 + (p.vsStatus.mult - 1) * 0.4;
      if (p.firstStrikeMult) dmgMult *= 1 + (p.firstStrikeMult - 1) * 0.12;
      if (p.openerStatus) dpsExtra += p.openerStatus.power * 0.4;
      if (p.statusLeech) hpMult *= 1 + p.statusLeech * 0.16;
      if (p.regenMult) hpMult *= 1.05;
      if (p.knockbackImmune) hpMult *= 1.05;
      if (p.quietFang) hpMult *= 1.06;
      if (p.firstStatusShrug) hpMult *= 1.04;
      if (p.killsForage) hpMult *= 1.05;
      if (p.bondHealMult) hpMult *= 1.03;
      if (p.downedTicksMult) hpMult *= 1.04;
      if (p.nightStrideMult) dmgMult *= 1.03;
      if (p.strideMult) dmgMult *= 1 + (p.strideMult - 1) * 0.5;
      if (p.biteStatusPower) dpsExtra += p.biteStatusPower * 0.5;
      if (p.openerRange) dmgMult *= 1 + p.openerRange * 0.03;
    } else if (art.kind === 'active' && art.ability) {
      const ab = ABILITIES.get(art.ability)!;
      const cdSec = (art.cooldownTicks ?? 200) / 20;
      const hits = (ab.hits ?? 1) * (ab.pulses ?? 1);
      dpsExtra += (ab.damage * hits) / cdSec;
      if (ab.status) dpsExtra += (ab.status.power * ab.status.durationTicks) / 40 / cdSec;
      if (ab.petGuard) armor += ab.petGuard.armor * (ab.petGuard.durationTicks / 20 / cdSec);
      if (ab.petHealFrac) hpMult *= 1 + ab.petHealFrac * 0.5;
      if (ab.petSurge) {
        dmgMult *= 1 + (ab.petSurge.dmgMult - 1) * (ab.petSurge.durationTicks / 20 / cdSec);
      }
      if (ab.tauntRadius) hpMult *= 1.06;
      if (ab.vs) dmgMult *= 1 + (ab.vs.mult - 1) * 0.25;
    }
  }
  const dps = stats.die * 0.5 * stats.dmgMult * dmgMult + dpsExtra * stats.dmgMult;
  const ehp = stats.maxHp * hpMult * (1 + (armor * 3) / 100);
  return Math.sqrt(dps * ehp);
}

function bestLoadout(species: string): number {
  const shelf = repertoireFor(species);
  let best = loadoutScore(species, []);
  const n = shelf.length;
  const consider = (picks: string[]) => {
    const focus = picks.reduce((s, id) => s + (petArtDef(id)?.focus ?? 99), 0);
    if (focus > BUDGET) return;
    const s = loadoutScore(species, picks);
    if (s > best) best = s;
  };
  for (let i = 0; i < n; i++) {
    consider([shelf[i]!]);
    for (let j = i + 1; j < n; j++) {
      consider([shelf[i]!, shelf[j]!]);
      for (let k = j + 1; k < n; k++) consider([shelf[i]!, shelf[j]!, shelf[k]!]);
    }
  }
  return best;
}

test('THE EQUALIZER LAW: every shelf pays, and the arts narrow the field', () => {
  // The docile company (the house cat) holds no shelf by law.
  const species = [...TAMES.entries()].filter(([, t]) => !t.docile).map(([sp]) => sp);
  const base = new Map(species.map((sp) => [sp, loadoutScore(sp, [])]));
  const loaded = new Map(species.map((sp) => [sp, bestLoadout(sp)]));
  // Every species' best loadout is worth slotting.
  for (const sp of species) {
    const lift = loaded.get(sp)! / base.get(sp)!;
    assert.ok(lift >= 1.08, `${sp}: best loadout lifts only ${lift.toFixed(2)}`);
  }
  const spreadOf = (m: Map<string, number>) =>
    Math.max(...m.values()) / Math.min(...m.values());
  const baseSpread = spreadOf(base);
  const loadedSpread = spreadOf(loaded);
  // The arts narrow the roster, never widen it...
  assert.ok(
    loadedSpread <= baseSpread + 1e-9,
    `loadout spread ${loadedSpread.toFixed(2)} exceeds base ${baseSpread.toFixed(2)}`,
  );
  // ...and the whole roster stays inside the absolute guard.
  assert.ok(loadedSpread <= 2.6, `roster spread ${loadedSpread.toFixed(2)} past the guard`);
});
