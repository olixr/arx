import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_BASE, isItemRoll, rarityIndex, type ItemRoll } from '@arx/shared';
import {
  DEEPEN_MIN_RARITY,
  ENCHANT_DEFS,
  carriesProc,
  instanceEffects,
  seatFor,
} from './enchants.js';
import { ITEMS } from '../items.js';
import { LOOT_TABLES } from '../loot/tables.js';
import { RECIPES } from '../recipes.js';

const withProc = ENCHANT_DEFS.find((e) => e.effects.some((f) => f.kind === 'proc'))!;
const noProc = ENCHANT_DEFS.find((e) => !e.effects.some((f) => f.kind === 'proc'))!;
const roll = (over: Partial<ItemRoll> = {}): ItemRoll => ({ rar: 'epic', seed: 1, ...over });

// ------------------------------------------------------------- the law

test('THE ART MUST DO SOMETHING', () => {
  // The load-bearing rule. THE WORN LIGHT gives every slot ONE
  // continuous channel, so a second PASSIVE working would be
  // mechanically live and visually silent — and this whole epic exists
  // on the premise that an enchantment you cannot see is a spreadsheet
  // entry. A proc has no channel: it lives in the event layer and
  // announces itself by firing, so nothing has to share.
  assert.equal(seatFor(roll({ deep: true }), withProc.id), 'art');
  assert.equal(seatFor(roll({ deep: true }), noProc.id), 'ward');
});

test('an undeepened piece has no art seat at all', () => {
  assert.equal(seatFor(roll(), withProc.id), 'ward');
  assert.equal(seatFor(undefined, withProc.id), 'ward');
});

test('a working that is not a working takes no seat', () => {
  assert.equal(seatFor(roll({ deep: true }), 'not_an_enchant'), null);
});

test('carriesProc agrees with the roster', () => {
  for (const e of ENCHANT_DEFS) {
    assert.equal(carriesProc(e.id), e.effects.some((f) => f.kind === 'proc'), e.id);
  }
  assert.equal(carriesProc(undefined), false);
  assert.equal(carriesProc('nonsense'), false);
});

test('there are arts to bond in every band that can hold them', () => {
  // A ceiling with nothing to put in it is not a ceiling. Deepening is
  // an endgame act, so the high bands especially must offer choices.
  for (const tier of [3, 4, 5] as const) {
    const arts = ENCHANT_DEFS.filter((e) => e.tier === tier && carriesProc(e.id));
    assert.ok(arts.length >= 3, `tier ${tier} offers only ${arts.length} arts`);
  }
});

// ------------------------------------------------------------ the seats

test('a deepened piece carries both workings at once', () => {
  const out = instanceEffects(undefined, roll({ deep: true, ench: noProc.id, ench2: withProc.id }));
  const wardCount = noProc.effects.length;
  const artCount = withProc.effects.length;
  assert.equal(out.length, wardCount + artCount, 'both seats must be felt');
});

test('each seat is scaled by its OWN quality', () => {
  const a = instanceEffects(undefined, roll({ deep: true, ench: noProc.id, ench2: withProc.id, q: 115, q2: 85 }));
  const b = instanceEffects(undefined, roll({ deep: true, ench: noProc.id, ench2: withProc.id, q: 85, q2: 115 }));
  assert.notDeepEqual(a, b, 'the two qualities must not be pooled');
});

test('an empty seat costs nothing', () => {
  const bare = instanceEffects(undefined, roll({ deep: true, ench: noProc.id }));
  const undeepened = instanceEffects(undefined, roll({ ench: noProc.id }));
  assert.deepEqual(bare, undeepened, 'an open seat with no art in it changes nothing');
});

test("a def's native effects survive a deepened roll", () => {
  const native = [{ kind: 'armor' as const, amount: 9 }];
  const out = instanceEffects(native, roll({ deep: true, ench: noProc.id, ench2: withProc.id }));
  assert.deepEqual(out[0], native[0]);
});

// --------------------------------------------------------- the guards

test('an art without a seat is a roll that could never have been made', () => {
  // The wire guard refuses it outright rather than trusting a client
  // to have followed the rule.
  assert.equal(isItemRoll({ rar: 'epic', seed: 1, deep: true, ench2: 'x' }), true);
  assert.equal(isItemRoll({ rar: 'epic', seed: 1, ench2: 'x' }), false);
  assert.equal(isItemRoll({ rar: 'epic', seed: 1, deep: false }), false);
  assert.equal(isItemRoll({ rar: 'epic', seed: 1, deep: true, q2: 110 }), true);
  assert.equal(isItemRoll({ rar: 'epic', seed: 1, deep: true, q2: 400 }), false);
});

test('the seat is gated on the PIECE, and the gate is real', () => {
  // Fine enough steel to be worth the sigil. Common gear is not it.
  assert.ok(rarityIndex(DEEPEN_MIN_RARITY) >= rarityIndex('rare'));
});

// ----------------------------------------------------- the key exists

test('the deepening sigil is a real item, found and never made', () => {
  const sigil = ITEMS.get('deepening_sigil');
  assert.ok(sigil, 'the key must exist');
  // No recipe: the trade can teach a masterwork inscription, but nobody
  // alive remembers how to open steel to a second working.
  for (const r of RECIPES.values()) {
    assert.notEqual(r.output.item, 'deepening_sigil', 'the sigil must not be craftable');
  }
});

test('the sigil is actually reachable, and only in the deep places', () => {
  const holders: string[] = [];
  for (const [id, t] of LOOT_TABLES) {
    if (t.entries.some((e) => e.item === 'deepening_sigil')) holders.push(id);
  }
  assert.ok(holders.length > 0, 'a key nothing drops is not a key');
  // It is the rarest ordinary thing in the game and belongs behind the
  // hardest doors, never on a roadside table.
  for (const id of holders) {
    assert.ok(
      id.includes('boss') || id.includes('riftgate'),
      `${id} is too easy a table for the deepening sigil`,
    );
  }
});
