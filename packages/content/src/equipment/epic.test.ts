import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_CEIL, STATUS_IDS, isSkillId, type ItemRoll } from '@arx/shared';
import {
  ENCHANT_DEFS,
  bondedEffects,
  describeEffect,
  type EnchantEffect,
  type EnchantTier,
} from './enchants.js';
import { ARX_ELEMENTS, ITEMS } from '../items.js';
import { RECIPES } from '../recipes.js';
import { unmakingOf } from './unmaking.js';
import { GEAR_SLOTS } from './types.js';

/**
 * THE FINAL PASS — the invariants that belong to the whole epic rather
 * than to any one phase of it. Everything here spans at least two
 * phases, which is exactly the kind of thing that rots quietly when
 * each phase only tests itself.
 */

/**
 * A rough power score for a working, at whatever quality. Deliberately
 * crude: it exists to catch a working that is wildly out of band for
 * its tier, not to balance the game to two decimal places.
 */
function power(fx: EnchantEffect): number {
  switch (fx.kind) {
    case 'skill': return fx.amount * 4;
    case 'maxHp': return fx.amount * 0.7;
    case 'regen': return fx.amount * 6;
    case 'armor': return fx.amount * 3;
    case 'thorns': return fx.amount * 3;
    case 'styleDmg': case 'elementDmg': return fx.pct * 1.2;
    case 'cooldown': return fx.pct * 2;
    case 'speed': return fx.pct * 4;
    case 'crit': return fx.pct * 2.5;
    case 'onKillHaste': return fx.ticks * 1.5;
    case 'lifesteal': return fx.frac * 220;
    case 'backstab': return fx.bonus * 18;
    case 'onHitStatus': return fx.power * fx.chance * 40;
    case 'proc': {
      const a = fx.action;
      // Everything a working does, divided by how long it must rest.
      // A big number on a long timer is not a big number.
      //
      // Gather and stride workings are the exception: what gates them
      // is how often the PLAYER swings at a seam or crosses ground, not
      // their rest timer, so rating them by icd alone reads a 2-second
      // rest as though it fired thirty times a minute. They get a flat
      // modest rate instead.
      const paced = fx.trigger.on === 'gather' || fx.trigger.on === 'stride';
      const rate = paced ? 0.5 : 100 / Math.max(20, fx.icd);
      const raw =
        a.do === 'nova' ? a.damage * 1.4
        : a.do === 'bolt' ? a.damage
        : a.do === 'chain' ? a.damage * a.jumps * 0.6
        : a.do === 'ward' ? a.absorb * 0.4
        : a.do === 'heal' ? a.amount * 0.5
        : a.do === 'surge' ? a.pct * 1.2
        : a.do === 'status' ? a.power * 6
        : a.do === 'yield' ? a.extra * 12
        : 8;
      return raw * rate;
    }
  }
}

const scoreOf = (id: string, q?: number): number =>
  bondedEffects(id, q).reduce((n, fx) => n + power(fx), 0);

// ------------------------------------------------------- the ladder holds

test('THE LADDER CLIMBS: every tier out-powers the one below it', () => {
  // The whole point of five tiers. Measured on the MEDIAN of each band
  // so one deliberately odd working (a pure utility line, say) cannot
  // drag a whole tier down or prop one up.
  const median = (tier: EnchantTier): number => {
    const xs = ENCHANT_DEFS.filter((e) => e.tier === tier)
      .map((e) => scoreOf(e.id))
      .sort((a, b) => a - b);
    return xs[Math.floor(xs.length / 2)]!;
  };
  for (const tier of [2, 3, 4, 5] as const) {
    assert.ok(
      median(tier) > median((tier - 1) as EnchantTier),
      `tier ${tier} (${median(tier).toFixed(1)}) does not out-power tier ${tier - 1} (${median((tier - 1) as EnchantTier).toFixed(1)})`,
    );
  }
});

test('no single working towers over its own band', () => {
  // An outlier three times its neighbours is either a typo or a
  // must-have that flattens every other choice in the slot.
  for (const tier of [1, 2, 3, 4, 5] as const) {
    const xs = ENCHANT_DEFS.filter((e) => e.tier === tier);
    const scores = xs.map((e) => scoreOf(e.id));
    const med = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)]!;
    xs.forEach((e, i) => {
      assert.ok(
        scores[i]! <= med * 3.2,
        `${e.id} scores ${scores[i]!.toFixed(1)} against a tier median of ${med.toFixed(1)}`,
      );
    });
  }
});

test('a masterwork inscription is a bonus, never a second tier', () => {
  // Quality must not let a tier-4 working outclass a tier-5 one, or
  // the ladder stops meaning anything and the top band is decorative.
  const bestOf = (tier: EnchantTier, q: number): number =>
    Math.max(...ENCHANT_DEFS.filter((e) => e.tier === tier).map((e) => scoreOf(e.id, q)));
  for (const tier of [1, 2, 3, 4] as const) {
    assert.ok(
      bestOf(tier, QUALITY_CEIL) < bestOf((tier + 1) as EnchantTier, QUALITY_CEIL) * 1.35,
      `a masterwork tier-${tier} working rivals tier ${tier + 1}`,
    );
  }
});

// ---------------------------------------------------- the words are legal

test('every working speaks in the game’s own voice', () => {
  // docs/VOICE.md, THE DASH BAN. Fifty-one of these descriptions were
  // written in one sitting, which is exactly when a stray dash slips in.
  for (const e of ENCHANT_DEFS) {
    for (const [what, text] of [['desc', e.desc], ['name', e.name], ['prefix', e.prefix]] as const) {
      assert.doesNotMatch(text, /[—–]|--/, `${e.id} ${what} carries a banned dash`);
    }
    // Every generated effect line is player-facing too.
    for (const fx of e.effects) {
      assert.doesNotMatch(describeEffect(fx), /[—–]|--/, `${e.id} effect line carries a dash`);
    }
    assert.ok(e.desc.length > 12, `${e.id} has no flavor worth reading`);
  }
});

test('no working reaches for the occult', () => {
  // A standing content boundary: Arx is energy and matter, and sigils
  // are engineering. This system in particular is where that line
  // would be easiest to cross without noticing.
  const banned = /witch|hex|demon|occult|curse|necroman|unholy|satan/i;
  for (const e of ENCHANT_DEFS) {
    for (const text of [e.name, e.prefix, e.desc]) {
      assert.doesNotMatch(text, banned, `${e.id} reaches somewhere it should not`);
    }
  }
});

// -------------------------------------------------- nothing dangles

test('every working refers only to things that exist', () => {
  for (const e of ENCHANT_DEFS) {
    assert.ok((ARX_ELEMENTS as readonly string[]).includes(e.element), `${e.id} school`);
    assert.ok((GEAR_SLOTS as readonly string[]).includes(e.slot), `${e.id} slot`);
    for (const fx of e.effects) {
      if (fx.kind === 'skill') assert.ok(isSkillId(fx.skill), `${e.id} names a dead skill`);
      if (fx.kind === 'onHitStatus') {
        assert.ok((STATUS_IDS as readonly string[]).includes(fx.status), `${e.id} status`);
      }
      if (fx.kind === 'elementDmg') {
        assert.ok((ARX_ELEMENTS as readonly string[]).includes(fx.element), `${e.id} element`);
      }
      if (fx.kind === 'proc' && fx.action.do === 'status') {
        assert.ok((STATUS_IDS as readonly string[]).includes(fx.action.status), `${e.id} proc status`);
      }
    }
  }
});

test('venom is the herbalist’s craft and never an enchanter’s', () => {
  // A standing law from before this epic: poison belongs to coatings.
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) {
      if (fx.kind === 'onHitStatus') assert.notEqual(fx.status, 'venom', e.id);
      if (fx.kind === 'proc' && fx.action.do === 'status') {
        assert.notEqual(fx.action.status, 'venom', e.id);
      }
    }
  }
});

// ------------------------------------------------- the economy closes

test('THE WHOLE CHAIN CLOSES: junk becomes dust becomes a masterwork', () => {
  // The economy this epic built, walked end to end in one test:
  // breaking gear pays dust, dust and any essence focus into the
  // concentrate, and the concentrate is what a tier-5 working needs.
  const junk = [...ITEMS].find(([, d]) => d.gear)![0];
  const dust = unmakingOf(junk, { rar: 'common', seed: 0 } as ItemRoll)!.yields;
  assert.ok(dust.some((y) => y.item === 'arcane_dust'), 'the unmaking pays binder');

  const focus = [...RECIPES.values()].find((r) => r.output.item === 'focused_dust');
  assert.ok(focus, 'the concentrate must be makeable');
  assert.ok(focus!.inputs.some((i) => i.item === 'arcane_dust'), 'and it must eat binder');

  const capstone = ENCHANT_DEFS.find((e) => e.tier === 5)!;
  const recipe = RECIPES.get(`inscribe_${capstone.id}`)!;
  assert.ok(
    recipe.inputs.some((i) => i.item === 'focused_dust'),
    'and a masterwork must need the concentrate',
  );
});

test('a scroll is worth more the deeper the working it carries', () => {
  let last = 0;
  for (const tier of [1, 2, 3, 4, 5] as const) {
    const e = ENCHANT_DEFS.find((x) => x.tier === tier)!;
    const v = ITEMS.get(`scroll_${e.id}`)!.value;
    assert.ok(v > last, `tier ${tier} scrolls are not worth more than tier ${tier - 1}`);
    last = v;
  }
});
