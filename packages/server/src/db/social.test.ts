import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';
import { AccountStore } from './accounts.js';

const SPAWN = { x: 48.5, y: 52.5 };

function makeStore(): { store: AccountStore; ids: Record<string, number> } {
  const store = new AccountStore(openDb(':memory:'));
  const ids: Record<string, number> = {};
  for (const [user, name] of [
    ['alice', 'Alice'],
    ['bob', 'Bob'],
    ['carol', 'Carol'],
  ] as const) {
    const reg = store.register(user, 'hunter22', name, SPAWN);
    assert.ok(reg.ok);
    if (reg.ok) ids[name] = reg.character.id;
  }
  return { store, ids };
}

test('friend request round trip', () => {
  const { store, ids } = makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  assert.ok(store.hasFriendRequest(ids.Alice!, ids.Bob!));
  assert.ok(!store.hasFriendRequest(ids.Bob!, ids.Alice!), 'requests are directional');

  const bobSide = store.loadFriendRequests(ids.Bob!);
  assert.deepEqual(bobSide.incoming.map((r) => r.name), ['Alice']);
  assert.equal(bobSide.outgoing.length, 0);
  const aliceSide = store.loadFriendRequests(ids.Alice!);
  assert.deepEqual(aliceSide.outgoing.map((r) => r.name), ['Bob']);
});

test('duplicate requests are idempotent', () => {
  const { store, ids } = makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  assert.equal(store.loadFriendRequests(ids.Bob!).incoming.length, 1);
});

test('addFriendship mirrors both rows and clears both pending directions', () => {
  const { store, ids } = makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  store.createFriendRequest(ids.Bob!, ids.Alice!);
  store.addFriendship(ids.Alice!, ids.Bob!);

  assert.ok(store.areFriends(ids.Alice!, ids.Bob!));
  assert.ok(store.areFriends(ids.Bob!, ids.Alice!), 'friendship is symmetric');
  assert.ok(!store.hasFriendRequest(ids.Alice!, ids.Bob!));
  assert.ok(!store.hasFriendRequest(ids.Bob!, ids.Alice!));
  assert.deepEqual(store.loadFriends(ids.Alice!).map((f) => f.name), ['Bob']);
  assert.deepEqual(store.loadFriends(ids.Bob!).map((f) => f.name), ['Alice']);
  assert.equal(store.countFriends(ids.Alice!), 1);
});

test('removeFriendship clears both mirrored rows', () => {
  const { store, ids } = makeStore();
  store.addFriendship(ids.Alice!, ids.Bob!);
  store.removeFriendship(ids.Bob!, ids.Alice!);
  assert.ok(!store.areFriends(ids.Alice!, ids.Bob!));
  assert.ok(!store.areFriends(ids.Bob!, ids.Alice!));
  assert.equal(store.loadFriends(ids.Alice!).length, 0);
});

test('deleteFriendRequest reports whether a row existed', () => {
  const { store, ids } = makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  assert.equal(store.deleteFriendRequest(ids.Alice!, ids.Bob!), true);
  assert.equal(store.deleteFriendRequest(ids.Alice!, ids.Bob!), false);
});

test('findCharacterByName is case-insensitive and echoes canonical casing', () => {
  const { store, ids } = makeStore();
  const found = store.findCharacterByName('aLiCe');
  assert.ok(found);
  assert.equal(found?.id, ids.Alice);
  assert.equal(found?.name, 'Alice');
  assert.equal(store.findCharacterByName('Nobody'), null);
});

test('searchCharacters matches prefixes, excludes self, escapes wildcards', () => {
  const { store, ids } = makeStore();
  const hits = store.searchCharacters('a', ids.Bob!);
  assert.deepEqual(hits.map((h) => h.name), ['Alice']);
  assert.deepEqual(store.searchCharacters('ali', ids.Alice!), [], 'self excluded');
  assert.deepEqual(store.searchCharacters('%', ids.Bob!), [], 'LIKE wildcards are literal');
  assert.deepEqual(store.searchCharacters('_', ids.Bob!), [], 'LIKE wildcards are literal');
});

test('deleting a character cascades its friendships and requests away', () => {
  const { store, ids } = makeStore();
  store.addFriendship(ids.Alice!, ids.Bob!);
  store.createFriendRequest(ids.Carol!, ids.Alice!);
  // Reach through to the raw db handle the same way accounts.test.ts
  // exercises cascade behavior.
  (store as unknown as { db: { prepare(sql: string): { run(...a: unknown[]): unknown } } }).db
    .prepare('DELETE FROM characters WHERE id = ?')
    .run(ids.Alice!);
  assert.equal(store.loadFriends(ids.Bob!).length, 0);
  assert.equal(store.loadFriendRequests(ids.Carol!).outgoing.length, 0);
});
