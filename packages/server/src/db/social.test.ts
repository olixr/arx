import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb } from './testDb.js';
import { AccountStore } from './accounts.js';

const SPAWN = { plane: 'surface', x: 48.5, y: 52.5 };

async function makeStore(): Promise<{ store: AccountStore; ids: Record<string, number> }> {
  const store = new AccountStore(await freshDb());
  const ids: Record<string, number> = {};
  for (const [user, name] of [
    ['alice', 'Alice'],
    ['bob', 'Bob'],
    ['carol', 'Carol'],
  ] as const) {
    const reg = await store.register(user, 'hunter22', name, SPAWN);
    assert.ok(reg.ok);
    if (reg.ok) ids[name] = reg.character.id;
  }
  return { store, ids };
}

test('friend request round trip', async () => {
  const { store, ids } = await makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  assert.ok(await store.hasFriendRequest(ids.Alice!, ids.Bob!));
  assert.ok(!(await store.hasFriendRequest(ids.Bob!, ids.Alice!)), 'requests are directional');

  const bobSide = await store.loadFriendRequests(ids.Bob!);
  assert.deepEqual(bobSide.incoming.map((r) => r.name), ['Alice']);
  assert.equal(bobSide.outgoing.length, 0);
  const aliceSide = await store.loadFriendRequests(ids.Alice!);
  assert.deepEqual(aliceSide.outgoing.map((r) => r.name), ['Bob']);
});

test('duplicate requests are idempotent', async () => {
  const { store, ids } = await makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  assert.equal((await store.loadFriendRequests(ids.Bob!)).incoming.length, 1);
});

test('addFriendship mirrors both rows and clears both pending directions', async () => {
  const { store, ids } = await makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  store.createFriendRequest(ids.Bob!, ids.Alice!);
  store.addFriendship(ids.Alice!, ids.Bob!);

  assert.ok(await store.areFriends(ids.Alice!, ids.Bob!));
  assert.ok(await store.areFriends(ids.Bob!, ids.Alice!), 'friendship is symmetric');
  assert.ok(!(await store.hasFriendRequest(ids.Alice!, ids.Bob!)));
  assert.ok(!(await store.hasFriendRequest(ids.Bob!, ids.Alice!)));
  assert.deepEqual((await store.loadFriends(ids.Alice!)).map((f) => f.name), ['Bob']);
  assert.deepEqual((await store.loadFriends(ids.Bob!)).map((f) => f.name), ['Alice']);
  assert.equal(await store.countFriends(ids.Alice!), 1);
});

test('removeFriendship clears both mirrored rows', async () => {
  const { store, ids } = await makeStore();
  store.addFriendship(ids.Alice!, ids.Bob!);
  store.removeFriendship(ids.Bob!, ids.Alice!);
  assert.ok(!(await store.areFriends(ids.Alice!, ids.Bob!)));
  assert.ok(!(await store.areFriends(ids.Bob!, ids.Alice!)));
  assert.equal((await store.loadFriends(ids.Alice!)).length, 0);
});

test('deleteFriendRequest reports whether a row existed', async () => {
  const { store, ids } = await makeStore();
  store.createFriendRequest(ids.Alice!, ids.Bob!);
  assert.equal(await store.deleteFriendRequest(ids.Alice!, ids.Bob!), true);
  assert.equal(await store.deleteFriendRequest(ids.Alice!, ids.Bob!), false);
});

test('findCharacterByName is case-insensitive and echoes canonical casing', async () => {
  const { store, ids } = await makeStore();
  const found = await store.findCharacterByName('aLiCe');
  assert.ok(found);
  assert.equal(found?.id, ids.Alice);
  assert.equal(found?.name, 'Alice');
  assert.equal(await store.findCharacterByName('Nobody'), null);
});

test('searchCharacters matches prefixes, excludes self, escapes wildcards', async () => {
  const { store, ids } = await makeStore();
  const hits = await store.searchCharacters('a', ids.Bob!);
  assert.deepEqual(hits.map((h) => h.name), ['Alice']);
  assert.deepEqual(await store.searchCharacters('ali', ids.Alice!), [], 'self excluded');
  assert.deepEqual(await store.searchCharacters('%', ids.Bob!), [], 'LIKE wildcards are literal');
  assert.deepEqual(await store.searchCharacters('_', ids.Bob!), [], 'LIKE wildcards are literal');
});

test('deleting a character cascades its friendships and requests away', async () => {
  const { store, ids } = await makeStore();
  store.addFriendship(ids.Alice!, ids.Bob!);
  store.createFriendRequest(ids.Carol!, ids.Alice!);
  // Reach through to the raw db handle the same way accounts.test.ts
  // exercises cascade behavior.
  await (
    store as unknown as { db: { run(sql: string, params?: unknown[]): Promise<unknown> } }
  ).db.run('DELETE FROM characters WHERE id = ?', [ids.Alice!]);
  assert.equal((await store.loadFriends(ids.Bob!)).length, 0);
  assert.equal((await store.loadFriendRequests(ids.Carol!)).outgoing.length, 0);
});
