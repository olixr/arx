import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEMENT_REAGENT,
  ENCHANT_DEFS,
  ENCHANTS,
  TIER_BANDS,
  isStrikeTrigger,
  procLoadFault,
  procMismatch,
  procShape,
  registerProc,
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
    const shape = procShape(p);
    const seen = byId.get(p.id);
    if (seen !== undefined) assert.equal(shape, seen, `proc id '${p.id}' means two things`);
    byId.set(p.id, shape);
  }
});

test('the rest is part of the shape: same id, different icd is two workings', () => {
  // A shared id shares one timer. Two workings that agree on everything
  // but their rest would leave that timer arbitrating two different
  // rest laws, and the hash used to be blind to exactly this.
  const base: ProcEffect = {
    kind: 'proc',
    id: 't_shape_icd',
    name: 'Shape Test',
    trigger: { on: 'kill' },
    action: { do: 'heal', amount: 5 },
    icd: 100,
  };
  assert.notEqual(procShape(base), procShape({ ...base, icd: 200 }));
  registerProc(base, 'cape', 'test_a');
  assert.throws(
    () => registerProc({ ...base, icd: 200 }, 'cape', 'test_b'),
    /two different workings/,
    'a same-id working with a different rest must be refused at load',
  );
  // The identical working registers freely — sharing is the point.
  registerProc({ ...base }, 'cape', 'test_c');
});

test('NATIVE gear procs pass the same load guards as bonded ones', () => {
  // def.gear.effects procs fire through the same runtime and key the
  // same timers, so items.ts runs them through registerProc at load.
  // None exist today; this walk keeps the door locked either way.
  for (const [id, def] of ITEMS) {
    for (const fx of def.gear?.effects ?? []) {
      if (fx.kind !== 'proc') continue;
      assert.equal(procLoadFault(fx, def.gear!.slot), null, `${id}/${fx.id}`);
    }
  }
  // And the guard itself refuses each unfirable pairing.
  const bad: ProcEffect = {
    kind: 'proc',
    id: 't_native_guard',
    name: 'Guard Test',
    trigger: { on: 'crit' },
    action: { do: 'bolt', damage: 5 },
    icd: 40,
  };
  assert.equal(procLoadFault(bad, 'weapon'), null);
  assert.match(procLoadFault(bad, 'body')!, /only steel/);
  assert.match(procLoadFault({ ...bad, icd: 0 }, 'weapon')!, /must rest/);
  assert.match(
    procLoadFault({ ...bad, trigger: { on: 'stride', tiles: 20 } }, 'boots')!,
    /never brings one/,
  );
});

test('the doubling channel stays with the Callings: yields are rhythms, never rolls', () => {
  // The roster's own law comment (THE LONG LADDER): chance-gated extra
  // yield IS the Callings' doubling channel. An enchant yield must be
  // a deterministic count of harvests — mechanically distinct, and
  // honest about it on the card.
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) {
      if (fx.kind !== 'proc' || fx.action.do !== 'yield') continue;
      assert.equal(
        fx.trigger.on,
        'stacks',
        `${e.id}/${fx.id}: a yield working must count, not roll`,
      );
      assert.equal(fx.trigger.on === 'stacks' && fx.trigger.per, 'gather', `${e.id}/${fx.id}`);
    }
  }
  // Expected value sits at or under the chance rates they replaced
  // (good_footing was 18% per gather, good_seam 15%).
  const footing = procs().find((p) => p.id === 'good_footing')!;
  const seam = procs().find((p) => p.id === 'good_seam')!;
  assert.ok(footing.trigger.on === 'stacks' && 1 / footing.trigger.count <= 0.18);
  assert.ok(seam.trigger.on === 'stacks' && 1 / seam.trigger.count <= 0.15);
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

test('the front door feeds itself: presses sit beside the workings they source', () => {
  // A reagent whose only makeable source sits ten levels past the
  // working that needs it is a locked front door. The radiant press
  // must be reachable by the time Keen Edge (the trade's showcase
  // level-2 working) is one session old, and the astral press by the
  // time the tier-1 astral workings open at 6-8.
  const radiantPress = RECIPES.get('press_radiant_essence')!;
  assert.equal(radiantPress.levelReq, 3, 'the radiant press belongs beside Keen Edge');
  assert.ok(radiantPress.levelReq <= ENCHANTS.get('keen_edge')!.level + 1);
  assert.equal(radiantPress.unlock, 'core');

  const astralPress = RECIPES.get('press_astral_essence');
  assert.ok(astralPress, 'astral needs a level-banded source of its own');
  const firstAstral = Math.min(
    ...ENCHANT_DEFS.filter((e) => e.element === 'astral').map((e) => e.level),
  );
  assert.ok(
    astralPress!.levelReq <= firstAstral,
    `the astral press (${astralPress!.levelReq}) opens after the first astral working (${firstAstral})`,
  );
  assert.equal(astralPress!.unlock, 'core');
  for (const press of [radiantPress, astralPress!]) {
    for (const input of press.inputs) {
      assert.ok(ITEMS.has(input.item), `${press.id} asks for '${input.item}'`);
    }
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
  // Measured in RAW BINDER, because the top two bands deliberately ask
  // for better dust rather than more of it: focused dust costs 6 raw
  // and yields 2, so each one is worth three. Counting only the raw
  // line would read the concentrate as a discount.
  const RAW_PER_FOCUSED = 3;
  const binderFor = (tier: EnchantTier): number => {
    const e = ENCHANT_DEFS.find((x) => x.tier === tier)!;
    const r = RECIPES.get(`inscribe_${e.id}`)!;
    const raw = r.inputs.find((i) => i.item === 'arcane_dust')?.qty ?? 0;
    const focused = r.inputs.find((i) => i.item === 'focused_dust')?.qty ?? 0;
    return raw + focused * RAW_PER_FOCUSED;
  };
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(
      binderFor(TIERS[i]!) > binderFor(TIERS[i - 1]!),
      `tier ${TIERS[i]} does not cost more binder than tier ${TIERS[i - 1]}`,
    );
  }
});

test('THE CONCENTRATE is a sink for every school', () => {
  // An enchanter at 90 must still have a use for the frost essence a
  // level-20 crypt handed them, or early-zone drops become dead stock.
  const focusRecipes = [...RECIPES.values()].filter((r) => r.output.item === 'focused_dust');
  const burns = new Set(
    focusRecipes.flatMap((r) => r.inputs.map((i) => i.item)).filter((i) => i !== 'arcane_dust'),
  );
  for (const el of ARX_ELEMENTS) {
    const reagent = ELEMENT_REAGENT[el];
    if (!reagent) continue; // arcane runs on dust alone
    assert.ok(burns.has(reagent), `${el}'s essence has no sink at the top of the trade`);
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
