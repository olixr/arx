import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';
import { AccountStore } from './accounts.js';

const SPAWN = { x: 48.5, y: 52.5 };

function makeStore(): AccountStore {
  return new AccountStore(openDb(':memory:'));
}

test('register + login round trip', () => {
  const store = makeStore();
  const reg = store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok, 'register should succeed');
  const login = store.login('eric', 'hunter22');
  assert.ok(login.ok);
  assert.equal(login.ok && login.character.name, 'Aeriek');
});

test('wrong password is rejected without leaking which part failed', () => {
  const store = makeStore();
  store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  const bad = store.login('eric', 'wrong-pass');
  const missing = store.login('nobody', 'hunter22');
  assert.ok(!bad.ok && !missing.ok);
  assert.equal(bad.ok || bad.reason, missing.ok || missing.reason);
});

test('duplicate usernames and character names are rejected', () => {
  const store = makeStore();
  assert.ok(store.register('eric', 'hunter22', 'Aeriek', SPAWN).ok);
  const dupUser = store.register('ERIC', 'password9', 'Other', SPAWN);
  assert.ok(!dupUser.ok, 'case-insensitive username collision');
  const dupChar = store.register('someone', 'password9', 'aeriek', SPAWN);
  assert.ok(!dupChar.ok, 'case-insensitive character collision');
});

test('validation: short passwords and bad names rejected', () => {
  const store = makeStore();
  assert.ok(!store.register('eric', 'short', 'Aeriek', SPAWN).ok);
  assert.ok(!store.register('e!', 'hunter22', 'Aeriek', SPAWN).ok);
  assert.ok(!store.register('eric', 'hunter22', 'x', SPAWN).ok);
});

test('sessions resume and persist character position', () => {
  const store = makeStore();
  const reg = store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const token = store.createSession(reg.accountId);

  store.saveCharacter(reg.character.id, 100.25, -42.5, 7);
  const resumed = store.resumeSession(token);
  assert.ok(resumed.ok);
  if (!resumed.ok) return;
  assert.equal(resumed.character.x, 100.25);
  assert.equal(resumed.character.y, -42.5);
  assert.equal(resumed.character.hp, 7);

  assert.ok(!store.resumeSession('bogus-token').ok);
});

test('inventory + equipment round-trip item rolls; legacy NULLs load as no roll', () => {
  const store = makeStore();
  const reg = store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const inv = new Array<{ item: string; qty: number; roll?: { rar: 'epic'; seed: number } } | null>(
    28,
  ).fill(null);
  inv[0] = { item: 'iron_platebody', qty: 1, roll: { rar: 'epic', seed: 12345 } };
  inv[3] = { item: 'coins', qty: 400 };
  store.saveInventory(cid, inv);
  const loaded = store.loadInventory(cid, 28);
  assert.deepEqual(loaded[0], { item: 'iron_platebody', qty: 1, roll: { rar: 'epic', seed: 12345 } });
  assert.deepEqual(loaded[3], { item: 'coins', qty: 400, roll: undefined });

  store.saveEquipment(cid, {
    head: { id: 'iron_helm', roll: { rar: 'rare', seed: 77 } },
    weapon: { id: 'bronze_sword' },
  });
  const eq = store.loadEquipment(cid);
  assert.deepEqual(eq.head, { id: 'iron_helm', roll: { rar: 'rare', seed: 77 } });
  assert.deepEqual(eq.weapon, { id: 'bronze_sword', roll: undefined });
});

test('bank gear rows preserve exact rolls and keep stable ids', () => {
  const store = makeStore();
  const reg = store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const a = store.insertBankGear(cid, 'iron_helm', { rar: 'legendary', seed: 9 });
  const b = store.insertBankGear(cid, 'iron_helm', { rar: 'common', seed: 4 });
  assert.notEqual(a, b);
  // Deleting one row must not renumber the other — ids are addresses.
  assert.ok(store.deleteBankGear(a, cid));
  const left = store.loadBankGear(cid);
  assert.deepEqual(left, [{ id: b, item: 'iron_helm', roll: { rar: 'common', seed: 4 } }]);
  // Cross-character deletion is refused.
  assert.ok(!store.deleteBankGear(b, cid + 999));
});
