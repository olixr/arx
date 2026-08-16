import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb } from './testDb.js';
import { AccountStore } from './accounts.js';

const SPAWN = { plane: 'surface', x: 48.5, y: 52.5 };

async function makeStore(): Promise<{ store: AccountStore; id: number }> {
  const store = new AccountStore(await freshDb());
  const reg = await store.register('renna', 'hunter22', 'Renna', SPAWN);
  assert.ok(reg.ok);
  return { store, id: reg.ok ? reg.character.id : 0 };
}

test('standing rows upsert and load as a map', async () => {
  const { store, id } = await makeStore();
  store.saveStanding(id, 'fordgate', 12);
  store.saveStanding(id, 'reavers', -30);
  store.saveStanding(id, 'fordgate', 18); // upsert wins
  const map = await store.loadStandings(id);
  assert.equal(map.get('fordgate'), 18);
  assert.equal(map.get('reavers'), -30);
  assert.equal(map.size, 2);
});

test('deleteStandings wipes the character ledger whole', async () => {
  const { store, id } = await makeStore();
  store.saveStanding(id, 'crown', 40);
  store.saveStanding(id, 'rookery', -12);
  store.deleteStandings(id);
  assert.equal((await store.loadStandings(id)).size, 0);
});

test('a fresh character has an empty ledger (neutral by absence)', async () => {
  const { store, id } = await makeStore();
  assert.equal((await store.loadStandings(id)).size, 0);
});
