import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RARITY_TIERS, type ItemRoll, type RarityTier } from '@arx/shared';
import { canUnmake, unmakingOf } from './unmaking.js';
import { ENCHANT_DEFS, ELEMENT_REAGENT, ESSENCE_BY_TIER } from './enchants.js';
import { ITEMS, itemDef } from '../items.js';
import { RECIPES } from '../recipes.js';

const anyGear = (): string => {
  for (const [id, def] of ITEMS) if (def.gear) return id;
  throw new Error('no gear in the item table');
};
const roll = (rar: RarityTier, over: Partial<ItemRoll> = {}): ItemRoll => ({
  rar,
  seed: 1,
  ...over,
});

// ------------------------------------------------------------ what breaks

test('only real gear comes apart', () => {
  // A table that ate everything would quietly become the answer to
  // every inventory problem in the game.
  assert.equal(canUnmake(anyGear()), true);
  assert.equal(canUnmake('coins'), false);
  assert.equal(canUnmake('arcane_dust'), false);
  assert.equal(canUnmake('not_a_real_item'), false);
  assert.equal(unmakingOf('coins'), null);
});

test('every breakable piece pays something', () => {
  // A piece that came apart into nothing would teach players to stop
  // carrying loot home, which is the exact habit this system exists to
  // create.
  for (const [id, def] of ITEMS) {
    if (!def.gear) continue;
    const out = unmakingOf(id, roll('common'));
    assert.ok(out, `${id} has no unmaking`);
    const dust = out!.yields.find((y) => y.item === 'arcane_dust');
    assert.ok(dust && dust.qty >= 1, `${id} pays no dust`);
    assert.ok(out!.xp > 0, `${id} teaches nothing`);
  }
});

test('a finer piece pays more, and so does a deeper one', () => {
  const id = anyGear();
  let last = 0;
  for (const rar of RARITY_TIERS) {
    const dust = unmakingOf(id, roll(rar))!.yields[0]!.qty;
    assert.ok(dust >= last, `${rar} pays less than the tier below it`);
    last = dust;
  }
  // Item power is the other axis: a re-issued piece breaks like the
  // endgame item it actually is, not like its native floor.
  const native = unmakingOf(id, roll('common'))!.yields[0]!.qty;
  const heirloom = unmakingOf(id, roll('common', { pwr: 90 }))!.yields[0]!.qty;
  assert.ok(heirloom > native, 'a re-issued piece breaks like its power');
});

test('everything a piece pays out is a real item', () => {
  for (const e of ENCHANT_DEFS) {
    const out = unmakingOf(anyGear(), roll('epic', { ench: e.id }))!;
    for (const y of out.yields) {
      assert.ok(ITEMS.has(y.item), `unmaking pays '${y.item}', which is not an item`);
      assert.ok(y.qty > 0, `unmaking pays 0 ${y.item}`);
    }
  }
});

// --------------------------------------------------- it is not a refund

test('THE UNMAKING IS NOT A REFUND: no working can be farmed through it', () => {
  // The one law that has to hold or the whole economy leaks: bond a
  // scroll onto a piece, break the piece, and you must be DOWN on the
  // deal. Otherwise the enchanting table prints essences.
  const id = anyGear();
  for (const e of ENCHANT_DEFS) {
    const recipe = RECIPES.get(`inscribe_${e.id}`)!;
    const out = unmakingOf(id, roll('legendary', { pwr: 99, ench: e.id }))!;
    for (const y of out.yields) {
      if (y.item === 'arcane_dust') continue; // dust comes from the ITEM, not the working
      const spent = recipe.inputs.find((i) => i.item === y.item)?.qty ?? 0;
      assert.ok(
        y.qty < spent,
        `${e.id} returns ${y.qty} ${y.item} but only cost ${spent}: that is a cycle`,
      );
    }
  }
});

test('a working returns half its essence, rounded down', () => {
  const id = anyGear();
  for (const e of ENCHANT_DEFS) {
    const reagent = ELEMENT_REAGENT[e.element];
    const out = unmakingOf(id, roll('common', { ench: e.id }))!;
    const back = out.yields.find((y) => y.item === reagent)?.qty ?? 0;
    const expected = reagent ? Math.floor(ESSENCE_BY_TIER[e.tier] / 2) : 0;
    assert.equal(back, expected, `${e.id} returns the wrong essence`);
  }
});

test('the humblest workings return nothing at all', () => {
  // Rounding DOWN is what stops a tier-1 scroll being worth bonding
  // purely to break. One essence in, zero back.
  const t1 = ENCHANT_DEFS.find((e) => e.tier === 1 && ELEMENT_REAGENT[e.element])!;
  const out = unmakingOf(anyGear(), roll('common', { ench: t1.id }))!;
  assert.equal(out.yields.length, 1, 'a tier-1 working paid an essence back');
});

test('an arcane working returns no essence, because it never took one', () => {
  const arcane = ENCHANT_DEFS.find((e) => e.element === 'arcane')!;
  const out = unmakingOf(anyGear(), roll('rare', { ench: arcane.id }))!;
  assert.deepEqual(
    out.yields.map((y) => y.item),
    ['arcane_dust'],
  );
});

// ------------------------------------------------------------ the loop

test('the dust an unmaking pays actually buys workings', () => {
  // The loop the whole phase exists to close: junk comes apart into
  // dust, and dust is what every scroll in the game is bound with.
  const cheapest = Math.min(
    ...ENCHANT_DEFS.map(
      (e) => RECIPES.get(`inscribe_${e.id}`)!.inputs.find((i) => i.item === 'arcane_dust')!.qty,
    ),
  );
  // A handful of ordinary drops has to be worth a starter inscription,
  // or the gathering loop is theatre.
  const perJunk = unmakingOf(anyGear(), roll('common'))!.yields[0]!.qty;
  assert.ok(perJunk * 4 >= cheapest, 'four junk drops do not add up to one scroll');
});

test('breaking things trains the trade from the very first piece', () => {
  // An enchanter should be able to start by taking apart their own
  // starting kit, rather than waiting on somebody else's essences.
  const starter = unmakingOf(anyGear(), roll('common'))!;
  assert.ok(starter.xp >= 5, 'the first unmaking teaches nothing worth having');
  const deep = unmakingOf(anyGear(), roll('legendary', { pwr: 90 }))!;
  assert.ok(deep.xp > starter.xp * 5, 'deep gear is not worth breaking over junk');
});

test('the preview and the payout are the same function', () => {
  // The bench shows the player this exact object before destroying
  // anything, and the server pays out from it. A disagreement here
  // would be the worst bug in the system, so it must be deterministic.
  const id = anyGear();
  const a = unmakingOf(id, roll('epic', { pwr: 40, ench: ENCHANT_DEFS[0]!.id }));
  const b = unmakingOf(id, roll('epic', { pwr: 40, ench: ENCHANT_DEFS[0]!.id }));
  assert.deepEqual(a, b);
});

test('a legendary is worth breaking, but not worth farming', () => {
  const id = anyGear();
  const junk = unmakingOf(id, roll('common'))!.yields[0]!.qty;
  const best = unmakingOf(id, roll('legendary'))!.yields[0]!.qty;
  assert.ok(best > junk, 'rarity should pay');
  // The dust curve is deliberately gentler than the VALUE curve (7x at
  // legendary). A 7x swing here would make every enchanter a
  // vendor-trash farmer instead of an adventurer.
  assert.ok(best <= junk * 5, 'the rarity curve on dust is too steep');
  assert.ok(itemDef('arcane_dust'), 'the binder exists');
});
