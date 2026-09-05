import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../items.js';
import { SET_WORDS, WORD_FORBIDDEN_KINDS, setWordsFor } from './setWords.js';
import {
  ENCHANT_DEFS,
  isStrikeTrigger,
  procMismatch,
  triggerHasTarget,
  type EnchantEffect,
} from './enchants.js';
import { aggregateGearStats } from './roll.js';

/**
 * THE HOUSE WORD laws (buildcraft Phase 3):
 *
 * - coverage is EXACT both ways: every stamped set speaks, every
 *   spoken set is stamped, and the early wardrobes stay wordless;
 * - a family speaks exactly twice — one 2pc line, one 4pc word,
 *   thresholds in order;
 * - BEHAVIOR OVER NUMBERS: every 4pc word carries a behavioral
 *   effect (proc, vsState, or onHitStatus); every 2pc line carries
 *   NONE (flat stats only);
 * - words use body triggers only, never the strike channel, and
 *   never the strike-only effect kinds;
 * - word proc ids are unique, prefixed `word_`, and collide with no
 *   enchant working (ONE ID, ONE TIMER is global);
 * - the flat budget holds: THE SET IS WORTH ONE EXTRA ITEM;
 * - the fold is live: four worn pieces speak both words, two speak
 *   one, and the affliction words ride wordOnHit, never foldEffect.
 */

const BEHAVIORAL = new Set(['proc', 'vsState', 'onHitStatus']);

function stampedSets(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of ITEMS.values()) {
    const set = item.gear?.set;
    if (set) counts.set(set, (counts.get(set) ?? 0) + 1);
  }
  return counts;
}

test('coverage is exact: stamped sets and spoken sets are the same roster', () => {
  const stamped = stampedSets();
  for (const set of Object.keys(SET_WORDS)) {
    assert.ok(stamped.has(set), `${set} speaks but no piece carries it`);
  }
  for (const [set, count] of stamped) {
    assert.ok(SET_WORDS[set], `${set} is stamped but has no words`);
    assert.ok(count >= 5, `${set} needs a full family (${count} pieces found)`);
  }
  // Consciously rewritten for THE WORN BOOK wave (46 -> 52): the six
  // new houses are adderking, stormtalon, warvaliant and packlord
  // (hunted, in namedChaseDefs) plus weirkeeper and wrightcloth
  // (craft-only themed families). Wave one was 31 chase + 15 themed.
  assert.equal(Object.keys(SET_WORDS).length, 52, 'the book is 35 chase + 17 themed');
});

test('the early wardrobes stay wordless — identity starts where the chase starts', () => {
  for (const family of ['thistledown', 'mothwing', 'dawnsworn', 'fenwalker', 'stormwoven',
    'hareswift', 'kingfisher', 'cutpurse', 'trapline', 'emberfox',
    'tuskguard', 'valiant', 'ramwall', 'briarplate', 'sentinel']) {
    assert.ok(!SET_WORDS[family], `${family} must not speak`);
    for (const item of ITEMS.values()) {
      if (item.id.startsWith(`${family}_`)) {
        assert.equal(item.gear?.set, undefined, `${item.id} must carry no set`);
      }
    }
  }
});

test('every family speaks exactly twice, thresholds in order, sentences complete', () => {
  for (const [set, words] of Object.entries(SET_WORDS)) {
    assert.equal(words.length, 2, `${set} speaks twice`);
    assert.equal(words[0]!.pieces, 2, `${set} first word at 2`);
    assert.equal(words[1]!.pieces, 4, `${set} second word at 4`);
    for (const w of words) {
      assert.ok(w.name.length > 0 && w.desc.length > 0, `${set} word unspoken`);
      assert.ok(!/[–—]/.test(w.name + w.desc), `${set} violates the dash ban`);
      assert.ok(w.effects.length >= 1, `${set} word does nothing`);
    }
  }
});

test('BEHAVIOR OVER NUMBERS: 4pc words behave, 2pc lines never do', () => {
  for (const [set, words] of Object.entries(SET_WORDS)) {
    assert.ok(
      words[1]!.effects.some((fx) => BEHAVIORAL.has(fx.kind)),
      `${set} 4pc is a bare number`,
    );
    assert.ok(
      words[0]!.effects.every((fx) => !BEHAVIORAL.has(fx.kind)),
      `${set} 2pc smuggles behavior`,
    );
  }
});

test('words never touch the strike channel', () => {
  for (const [set, words] of Object.entries(SET_WORDS)) {
    for (const w of words) {
      for (const fx of w.effects) {
        assert.ok(
          !(WORD_FORBIDDEN_KINDS as readonly string[]).includes(fx.kind),
          `${set}: ${fx.kind} is strike-only`,
        );
        if (fx.kind === 'proc') {
          assert.ok(!isStrikeTrigger(fx.trigger.on), `${set}: a set is worn, not swung`);
          assert.equal(procMismatch(fx), null, `${set}: unfirable word working`);
          assert.ok(fx.icd > 0, `${set}: a word working must rest`);
          if (fx.action.do === 'status' || fx.action.do === 'bolt') {
            assert.ok(triggerHasTarget(fx.trigger), `${set}: targeted action, targetless trigger`);
          }
        }
      }
    }
  }
});

test('ONE ID, ONE TIMER is global: word procs collide with nothing', () => {
  const seen = new Set<string>();
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) if (fx.kind === 'proc') seen.add(fx.id);
  }
  for (const [set, words] of Object.entries(SET_WORDS)) {
    for (const w of words) {
      for (const fx of w.effects) {
        if (fx.kind !== 'proc') continue;
        assert.ok(fx.id.startsWith('word_'), `${set}: word procs carry the word_ prefix`);
        assert.ok(!seen.has(fx.id), `${set}: proc id ${fx.id} spoken twice`);
        seen.add(fx.id);
      }
    }
  }
});

test('THE SET IS WORTH ONE EXTRA ITEM: the flat budget holds', () => {
  // The crude scorer from the enchant epic, applied to word lines.
  // It exists to catch a word wildly out of band, not to balance to
  // two decimals; procs and vs clauses are priced by the behavioral
  // review above and the plan ledger.
  const flat = (fx: { kind: string } & Record<string, unknown>): number => {
    switch (fx.kind) {
      case 'skill': return (fx.amount as number) * 4;
      case 'maxHp': return (fx.amount as number) * 0.7;
      case 'regen': return (fx.amount as number) * 6;
      case 'armor': return (fx.amount as number) * 3;
      case 'thorns': return (fx.amount as number) * 3;
      case 'styleDmg': case 'elementDmg': return (fx.pct as number) * 1.2;
      case 'cooldown': return (fx.pct as number) * 2;
      case 'speed': return (fx.pct as number) * 4;
      case 'crit': return (fx.pct as number) * 2.5;
      // THE SLIPPED BLOW prices as crit's defensive twin.
      case 'evade': return (fx.pct as number) * 2.5;
      case 'vsState': return (fx.pct as number) * 0.7;
      default: return 0;
    }
  };
  for (const [set, words] of Object.entries(SET_WORDS)) {
    const two = words[0]!.effects.reduce((a, fx) => a + flat(fx as never), 0);
    assert.ok(two > 0 && two <= 18, `${set} 2pc line off budget (${two})`);
    const four = words[1]!.effects.reduce((a, fx) => a + flat(fx as never), 0);
    assert.ok(four <= 25, `${set} 4pc flat rider off budget (${four})`);
  }
});

test('THE OPENER IS THE HOUSE: no family greets you in another house\'s words', () => {
  // THE REPETITION LAW, and the reason it is a test and not a habit.
  //
  // The 2pc line is the FIRST thing a set ever says to a player — the
  // sentence they read at the moment they decide whether a house is
  // worth chasing. Before the recut, 52 families spoke it in 21
  // shapes: six different armors opened "+2 speed", six opened
  // "+armor", six "+maxHp", five "+2% crit" at the identical number.
  // 36 of the 52 were byte-identical to another family's. Nothing was
  // broken and every pin was green — the wardrobe was simply BORING,
  // and boring is the one defect a suite never catches by accident.
  // So it is caught on purpose here.
  //
  // The vocabulary was never the constraint: `skill` alone has 25
  // variants, and per-style and per-element damage add a dozen more.
  // Roughly forty legal openers exist. There is no excuse for two
  // houses sharing one, and none at all for them sharing its number.
  const shape = (fx: EnchantEffect): string =>
    fx.kind === 'skill' ? `skill:${fx.skill}`
      : fx.kind === 'styleDmg' ? `styleDmg:${fx.style}`
        : fx.kind === 'elementDmg' ? `elementDmg:${fx.element}`
          : fx.kind;
  const sig = (w: { effects: readonly EnchantEffect[] }, withNumbers: boolean): string =>
    w.effects
      .map((fx) => (withNumbers ? `${shape(fx)}=${JSON.stringify(fx)}` : shape(fx)))
      .sort()
      .join('+');

  // NOBODY SHARES AN OPENER EXACTLY. Two houses may reach for the same
  // channel; they may not reach for the same channel at the same
  // number, because then the two sets are literally indistinguishable
  // until the fourth piece lands.
  const exact = new Map<string, string[]>();
  for (const [set, words] of Object.entries(SET_WORDS)) {
    const k = sig(words[0]!, true);
    exact.set(k, [...(exact.get(k) ?? []), set]);
  }
  const twins = [...exact.values()].filter((v) => v.length > 1);
  assert.deepEqual(
    twins,
    [],
    `these houses open with the identical line:\n  ${twins.map((v) => v.join(' = ')).join('\n  ')}`,
  );

  // AND NO CHANNEL IS A CROWD. Sharing a channel is legitimate — a
  // frost house and a winter house may both speak frost — but the
  // third house on one channel means the roster has stopped choosing.
  const byShape = new Map<string, string[]>();
  for (const [set, words] of Object.entries(SET_WORDS)) {
    const k = sig(words[0]!, false);
    byShape.set(k, [...(byShape.get(k) ?? []), set]);
  }
  const crowded = [...byShape.entries()].filter(([, v]) => v.length > 2);
  assert.deepEqual(
    crowded.map(([k, v]) => `${k}: ${v.join(', ')}`),
    [],
    'a third house on one opener channel — pick a word of its own',
  );
});

test('the fold is live: worn pieces speak, thresholds gate, wordOnHit routes', () => {
  const worn = (ids: string[]) => {
    const slots = ['head', 'body', 'legs', 'boots', 'gloves'] as const;
    const eq: Record<string, { id: string }> = {};
    ids.forEach((id, i) => { eq[slots[i]!] = { id }; });
    return aggregateGearStats(eq as never);
  };
  const four = worn(['moonbell_hood', 'moonbell_robe', 'moonbell_skirts', 'moonbell_slippers']);
  assert.equal(four.setCounts.moonbell, 4);
  // THE OPENER PREFIGURES THE WORD (the 2pc recut): moonbell's opener
  // used to be a herbalism bonus it shared with hedgemage; it is now
  // the verdant channel its own venom clause finishes. This assertion
  // keeps its original job — proving the 2pc line stays LIVE once the
  // 4pc threshold is crossed — and reads it on the new channel.
  assert.ok(
    Math.abs((four.elementDmgMult.verdant ?? 1) - 1.03) < 1e-9,
    'the 2pc line stays live under the 4pc word',
  );
  assert.equal(four.vsState.venom, 30, 'the 4pc clause speaks');
  const two = worn(['moonbell_hood', 'moonbell_robe']);
  assert.ok(Math.abs((two.elementDmgMult.verdant ?? 1) - 1.03) < 1e-9);
  // ...and a SKILL opener still folds through its own channel, on a
  // house that kept one: the recut moved moonbell off this lane, so
  // the lane itself keeps a witness.
  assert.equal(
    worn(['hedgemage_hat', 'hedgemage_robe']).skillBonus.herbalism,
    2,
    'a skill opener still folds',
  );
  assert.equal(two.vsState.venom, undefined, 'two pieces do not speak the 4pc word');
  const broken = worn(['moonbell_hood', 'barrowking_platebody', 'barrowking_greaves']);
  assert.equal(broken.vsState.venom, undefined, 'mixed houses speak neither 4pc');
  assert.equal(broken.setCounts.barrowking, 2);

  const stalker = worn([
    'wolfstalker_hood', 'wolfstalker_jerkin', 'wolfstalker_chaps', 'wolfstalker_boots',
  ]);
  assert.equal(stalker.wordOnHit.length, 1, 'the affliction word rides wordOnHit');
  assert.equal(stalker.wordOnHit[0]!.status, 'bleed');
  const proc = worn([
    'barrowking_helm', 'barrowking_platebody', 'barrowking_greaves', 'barrowking_sabatons',
  ]);
  assert.ok(proc.procs.some((p) => p.id === 'word_barrowking_crown'), 'the word proc folds');
});

test('THE HOUSE ANSWERS TO A NAME: every family is christened, both ways', async () => {
  const { SET_NAMES, setName } = await import('./setWords.js');
  for (const set of Object.keys(SET_WORDS)) {
    const name = SET_NAMES[set];
    assert.ok(name && name.trim().length > 0, `${set} has no display name`);
    // A christening is words, not machinery: letters and spaces only,
    // leading capitals, and never a dash (the VOICE law).
    assert.match(name!, /^[A-Z][a-zA-Z]*( [A-Z][a-zA-Z]*)*$/, `${set} name "${name}" reads wrong`);
  }
  for (const set of Object.keys(SET_NAMES)) {
    assert.ok(SET_WORDS[set], `SET_NAMES christens "${set}" but no such family speaks`);
  }
  assert.equal(setName('warden'), 'Warden');
  assert.equal(setName('voidwhisper'), 'Void Whisper');
  assert.equal(setName('never_stamped'), 'never_stamped');
});
