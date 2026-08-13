/**
 * THE DOOR REMEMBERS contract: cards parse defensively, upsert by
 * username with newest first, the shelf caps at a household, and a
 * forgotten card stays forgotten.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROSTER_CAP,
  dropCard,
  parseRoster,
  upsertCard,
  type RememberedAccount,
} from './loginRoster.js';

const card = (user: string, at: number, name = user): RememberedAccount => ({
  user,
  name,
  look: null,
  at,
});

describe('parseRoster', () => {
  it('reads a stored shelf back, newest data intact', () => {
    const stored = JSON.stringify([card('thane', 5, 'Thane'), card('wren', 3, 'Wren')]);
    const shelf = parseRoster(stored);
    assert.equal(shelf.length, 2);
    assert.equal(shelf[0]!.user, 'thane');
    assert.equal(shelf[0]!.name, 'Thane');
    assert.equal(shelf[0]!.look, null);
    assert.equal(shelf[1]!.at, 3);
  });

  it('turns garbage into the empty shelf', () => {
    assert.deepEqual(parseRoster(null), []);
    assert.deepEqual(parseRoster(''), []);
    assert.deepEqual(parseRoster('not json'), []);
    assert.deepEqual(parseRoster('"a string"'), []);
    assert.deepEqual(parseRoster('{}'), []);
    assert.deepEqual(parseRoster('42'), []);
  });

  it('drops malformed entries and keeps the good ones', () => {
    const stored = JSON.stringify([
      card('thane', 5, 'Thane'),
      { user: '', name: 'Nameless', at: 4 },
      { user: 'noname', at: 4 },
      null,
      'stray',
      { user: 'wren', name: 'Wren', look: 'bogus', at: 'soon' },
    ]);
    const shelf = parseRoster(stored);
    assert.equal(shelf.length, 2);
    assert.equal(shelf[0]!.user, 'thane');
    // A bogus look becomes null; a bogus timestamp becomes 0.
    assert.equal(shelf[1]!.look, null);
    assert.equal(shelf[1]!.at, 0);
  });

  it('caps a stored shelf at the household', () => {
    const many = JSON.stringify(
      Array.from({ length: ROSTER_CAP + 3 }, (_, i) => card(`u${i}`, i)),
    );
    assert.equal(parseRoster(many).length, ROSTER_CAP);
  });
});

describe('upsertCard', () => {
  it('adds a new card at the front of the shelf', () => {
    const shelf = upsertCard([card('wren', 3)], card('thane', 5));
    assert.deepEqual(
      shelf.map((c) => c.user),
      ['thane', 'wren'],
    );
  });

  it('replaces a card with the same username, no duplicate', () => {
    const grown: RememberedAccount = {
      user: 'thane',
      name: 'Thane',
      look: { skin: 2, hair: 1, hairColor: 0, beard: 0, eyes: 1, ears: 0, feature: 0, shirt: 3, pants: 1 },
      at: 9,
    };
    const shelf = upsertCard([card('thane', 5), card('wren', 3)], grown);
    assert.equal(shelf.length, 2);
    assert.equal(shelf[0]!.user, 'thane');
    assert.equal(shelf[0]!.at, 9);
    assert.ok(shelf[0]!.look);
  });

  it('drops the oldest card past the cap', () => {
    let shelf: RememberedAccount[] = [];
    for (let i = 0; i < ROSTER_CAP + 2; i++) shelf = upsertCard(shelf, card(`u${i}`, i));
    assert.equal(shelf.length, ROSTER_CAP);
    assert.equal(shelf[0]!.user, `u${ROSTER_CAP + 1}`);
    assert.ok(!shelf.some((c) => c.user === 'u0'));
    assert.ok(!shelf.some((c) => c.user === 'u1'));
  });
});

describe('dropCard', () => {
  it('forgets only the named account', () => {
    const shelf = dropCard([card('thane', 5), card('wren', 3)], 'thane');
    assert.deepEqual(
      shelf.map((c) => c.user),
      ['wren'],
    );
    assert.deepEqual(dropCard(shelf, 'nobody'), shelf);
  });
});
