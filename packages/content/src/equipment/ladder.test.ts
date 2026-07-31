import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEMENT_REAGENT,
  ENCHANT_DEFS,
  TIER_BANDS,
  isStrikeTrigger,
  procMismatch,
  type EnchantTier,
  type ProcEffect,
} from './enchants.js';
import { GEAR_SLOTS } from './types.js';
import { ARX_ELEMENTS, ITEMS } from '../items.js';
import { RECIPES } from '../recipes.js';

const TIERS: EnchantTier[] = [1, 2, 3, 4, 5];
const procs = (): ProcEffect[] =>
  ENCHANT_DEFS.flatMap((e) => e.effects.filter((f): f is ProcEffect => f.kind === 'proc'));

// ------------------------------------------------------- the ladder runs

test('THE LONG LADDER reaches the level cap', () => {
  // The defect this phase exists to fix: enchanting capped at 99 while
  // its roster stopped at 54, leaving forty-five levels of a named
  // trade with nothing at all to inscribe.
  const top = Math.max(...ENCHANT_DEFS.map((e) => e.level));
  assert.ok(top >= 90, `the trade tops out at ${top}, well short of the cap`);
});

test('no dead stretch anywhere on the ladder', () => {
  // A long gap is the same defect in miniature: a band of levels where
  // training the skill unlocks nothing a player can make.
  const levels = [...new Set(ENCHANT_DEFS.map((e) => e.level))].sort((a, b) => a - b);
  for (let i = 1; i < levels.length; i++) {
    const gap = levels[i]! - levels[i - 1]!;
    assert.ok(gap <= 12, `nothing to inscribe between ${levels[i - 1]} and ${levels[i]}`);
  }
});

test('every tier lives inside its own band', () => {
  for (const e of ENCHANT_DEFS) {
    const band = TIER_BANDS[e.tier];
    assert.ok(
      e.level >= band.lo && e.level <= band.hi,
      `${e.id}: tier ${e.tier} at level ${e.level}, band is ${band.lo}-${band.hi}`,
    );
  }
});

test('the bands tile the whole ladder with no overlap and no hole', () => {
  for (let i = 1; i < TIERS.length; i++) {
    const prev = TIER_BANDS[TIERS[i - 1]!];
    const cur = TIER_BANDS[TIERS[i]!];
    assert.equal(cur.lo, prev.hi + 1, `bands ${i} and ${i + 1} do not meet cleanly`);
  }
  assert.equal(TIER_BANDS[1].lo, 1);
  assert.equal(TIER_BANDS[5].hi, 99);
});

// ------------------------------------------------------ the holes stay shut

test('every slot can be enchanted at every tier', () => {
  // Legs carried ONE working and cape carried ONE, at tier 3, which
  // made a cape unenchantable for the first forty-nine levels of the
  // trade. A slot with a hole in its line is a slot with no choice in
  // it, which is not a build decision, it is a formality.
  for (const slot of GEAR_SLOTS) {
    for (const tier of TIERS) {
      const found = ENCHANT_DEFS.some((e) => e.slot === slot && e.tier === tier);
      assert.ok(found, `${slot} has nothing at tier ${tier}`);
    }
  }
});

test('every school of Arx has workings of its own', () => {
  // astral had ZERO and no reagent; void had two and borrowed a
  // tailor's thread. A school the tint tables and reaction tables
  // promise but the roster never delivers is a lie in the fiction.
  for (const el of ARX_ELEMENTS) {
    const n = ENCHANT_DEFS.filter((e) => e.element === el).length;
    assert.ok(n >= 4, `${el} has only ${n} workings`);
  }
});

test('every school but arcane has a reagent, and it is a real item', () => {
  for (const el of ARX_ELEMENTS) {
    if (el === 'arcane') {
      assert.equal(ELEMENT_REAGENT[el], undefined, 'arcane runs on dust alone');
      continue;
    }
    const reagent = ELEMENT_REAGENT[el];
    assert.ok(reagent, `${el} has no essence of its own`);
    assert.ok(ITEMS.has(reagent!), `${el}'s reagent '${reagent}' is not an item`);
  }
});

// -------------------------------------------------------- every proc fires

test('no working in the roster is unfirable', () => {
  // The whole point of the load-time guard, restated as a test so the
  // reason survives: a mismatched pairing passes typecheck, bonds onto
  // a real item, wakes exactly on schedule, and then does nothing at
  // all, forever.
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) {
      if (fx.kind !== 'proc') continue;
      assert.equal(procMismatch(fx), null, `${e.id}/${fx.id}`);
    }
  }
});

test('only steel carries a strike-triggered working', () => {
  // hit/crit/cadence resolve from the WEAPON INSTANCE that landed, so
  // the same working on a helm or a boot would simply never fire.
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) {
      if (fx.kind !== 'proc' || !isStrikeTrigger(fx.trigger.on)) continue;
      assert.ok(
        e.slot === 'weapon' || e.slot === 'offhand',
        `${e.id} is a ${e.slot} and cannot answer '${fx.trigger.on}'`,
      );
    }
  }
});

test('every working rests, and none rests forever', () => {
  for (const p of procs()) {
    assert.ok(p.icd > 0, `${p.id} never rests`);
    // A minute and a half of rest is an emergency answer, not a rhythm.
    assert.ok(p.icd <= 1800, `${p.id} rests ${p.icd} ticks, which is not a proc`);
  }
});

test('the high bands are where the workings live', () => {
  // Tiers 4 and 5 have to differ in KIND, not just in magnitude, or
  // they are the same enchant with a bigger number and the ladder gets
  // longer without getting deeper.
  for (const tier of [4, 5] as const) {
    const band = ENCHANT_DEFS.filter((e) => e.tier === tier);
    const withProc = band.filter((e) => e.effects.some((f) => f.kind === 'proc'));
    assert.ok(
      withProc.length >= band.length * 0.8,
      `only ${withProc.length}/${band.length} tier-${tier} workings actually DO something`,
    );
  }
});

test('two workings never share an id unless they are the same working', () => {
  const byId = new Map<string, string>();
  for (const p of procs()) {
    const shape = JSON.stringify([p.name, p.trigger, p.action]);
    const seen = byId.get(p.id);
    if (seen !== undefined) assert.equal(shape, seen, `proc id '${p.id}' means two things`);
    byId.set(p.id, shape);
  }
});

// ---------------------------------------------------------- it is craftable

test('every working can actually be inscribed', () => {
  // A roster entry with no recipe is a scroll that exists in the item
  // table and nowhere in the world.
  for (const e of ENCHANT_DEFS) {
    const r = RECIPES.get(`inscribe_${e.id}`);
    assert.ok(r, `${e.id} has no recipe`);
    assert.equal(r!.levelReq, e.level, `${e.id} recipe level disagrees with the roster`);
    for (const input of r!.inputs) {
      assert.ok(ITEMS.has(input.item), `${e.id} asks for '${input.item}', which is not an item`);
    }
    assert.ok(ITEMS.has(`scroll_${e.id}`), `${e.id} has no scroll`);
  }
});

test('the top of the trade is found, never sold', () => {
  // Tier ladder of knowledge: the capstones and everything above them
  // are a chase. A trainer who sold a masterwork inscription would
  // make the whole top of the profession a shopping list.
  for (const e of ENCHANT_DEFS) {
    const r = RECIPES.get(`inscribe_${e.id}`)!;
    if (e.tier >= 3) assert.equal(r.unlock, 'drop', `${e.id} should be found`);
    if (e.tier === 1) assert.equal(r.unlock, 'core', `${e.id} should come with the trade`);
  }
});

test('the cost of a working climbs with its tier', () => {
  const dustFor = (tier: EnchantTier): number => {
    const e = ENCHANT_DEFS.find((x) => x.tier === tier)!;
    const r = RECIPES.get(`inscribe_${e.id}`)!;
    return r.inputs.find((i) => i.item === 'arcane_dust')!.qty;
  };
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(
      dustFor(TIERS[i]!) > dustFor(TIERS[i - 1]!),
      `tier ${TIERS[i]} does not cost more binder than tier ${TIERS[i - 1]}`,
    );
  }
});

test('THE ENCHANTER NEEDS A SMITH at the top of the ladder', () => {
  // The two top bands bind through bars nobody can dig up and use raw.
  // That is a deliberate trade route between two professions, and it
  // is the reason a masterwork scroll means somebody smelted for it.
  const metalFor = (tier: EnchantTier): string[] =>
    ENCHANT_DEFS.filter((e) => e.tier === tier).flatMap((e) =>
      RECIPES.get(`inscribe_${e.id}`)!.inputs.map((i) => i.item),
    );
  assert.ok(metalFor(4).includes('mithril_bar'));
  assert.ok(metalFor(5).includes('starsteel_bar'));
});
