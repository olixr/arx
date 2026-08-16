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

test('createParty seats both souls with the leader first', async () => {
  const { store, ids } = await makeStore();
  const pid = await store.createParty(ids.Alice!, ids.Bob!);
  assert.ok(pid !== null);
  const party = await store.loadPartyOf(ids.Bob!);
  assert.ok(party);
  assert.equal(party?.id, pid);
  assert.equal(party?.leaderId, ids.Alice);
  assert.deepEqual(party?.members.map((m) => m.name), ['Alice', 'Bob']);
});

test('one party per character — a second swearing fails whole', async () => {
  const { store, ids } = await makeStore();
  assert.ok((await store.createParty(ids.Alice!, ids.Bob!)) !== null);
  assert.equal(await store.createParty(ids.Carol!, ids.Bob!), null, 'Bob is already sworn');
  assert.equal(await store.loadPartyOf(ids.Carol!), null, 'the failed party left no husk');
});

test('addPartyMember joins and refuses the already-sworn', async () => {
  const { store, ids } = await makeStore();
  const pid = (await store.createParty(ids.Alice!, ids.Bob!))!;
  assert.equal(await store.addPartyMember(pid, ids.Carol!), true);
  assert.equal(await store.addPartyMember(pid, ids.Carol!), false, 'no double seat');
  const party = await store.loadPartyOf(ids.Alice!);
  assert.deepEqual(party?.members.map((m) => m.name), ['Alice', 'Bob', 'Carol']);
});

test('removePartyMember, setPartyLeader, disbandParty', async () => {
  const { store, ids } = await makeStore();
  const pid = (await store.createParty(ids.Alice!, ids.Bob!))!;
  await store.addPartyMember(pid, ids.Carol!);

  store.removePartyMember(ids.Alice!);
  store.setPartyLeader(pid, ids.Bob!);
  await (store as unknown as { db: { flush(): Promise<void> } }).db.flush();
  assert.equal(await store.loadPartyOf(ids.Alice!), null);
  const party = await store.loadPartyOf(ids.Bob!);
  assert.equal(party?.leaderId, ids.Bob);
  assert.deepEqual(party?.members.map((m) => m.name), ['Bob', 'Carol']);

  store.disbandParty(pid);
  await (store as unknown as { db: { flush(): Promise<void> } }).db.flush();
  assert.equal(await store.loadPartyOf(ids.Bob!), null, 'members go with the party');
  assert.equal(await store.loadPartyOf(ids.Carol!), null);
});

test('deleting a character cascades their seat away', async () => {
  const { store, ids } = await makeStore();
  await store.createParty(ids.Alice!, ids.Bob!);
  await (
    store as unknown as { db: { run(sql: string, params?: unknown[]): Promise<unknown> } }
  ).db.run('DELETE FROM characters WHERE id = ?', [ids.Bob!]);
  const party = await store.loadPartyOf(ids.Alice!);
  assert.deepEqual(party?.members.map((m) => m.name), ['Alice']);
});
