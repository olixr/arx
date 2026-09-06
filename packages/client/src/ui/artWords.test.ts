/** THE HAND SEES: every word the techniques leave or read has a sentence in the book. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, SECRET_ARTS, TECHNIQUES } from '@arx/content';
import { ABILITY_ROLES } from '@arx/shared';
import { ROLE_BOOK, WORD_BOOK, afterWords, answeredBy, followSentence, setUpBy } from './artWords.js';

test('every word left or read by a technique is in the book, and every role has a face', () => {
  for (const t of [...TECHNIQUES, ...SECRET_ARTS]) {
    const ab = ABILITIES.get(t.ability)!;
    if (ab.tag) assert.ok(WORD_BOOK[ab.tag], `${ab.id} leaves ${ab.tag}, which the book does not speak`);
    for (const w of afterWords(ab)) assert.ok(WORD_BOOK[w], `${ab.id} answers ${w}, which the book does not speak`);
  }
  for (const r of ABILITY_ROLES) assert.ok(ROLE_BOOK[r]);
  for (const e of Object.values(WORD_BOOK)) {
    assert.ok(!/—|-{2}/.test(e.leaves + e.reads), 'no dashes in the register');
  }
});

test('combo partners are symmetric across schools and the follow sentence speaks whole', () => {
  const twin = ABILITIES.get('twin_strike')!;
  const setups = setUpBy(twin);
  assert.ok(setups.some((p) => p.id === 'hawks_hour'), 'twin strike is set up by hawk’s hour');
  assert.ok(answeredBy(ABILITIES.get('hawks_hour')!).some((p) => p.id === 'twin_strike'));
  assert.ok(setups.some((p) => p.style !== 'archery'), 'a brand from another school sets it up too (the free hand)');
  const s = followSentence(twin);
  assert.ok(/^Cast on a branded foe within \d+(\.\d)?s, it .+\.$/.test(s), s);
});
