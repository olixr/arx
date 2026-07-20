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

test('item power rides every persistence path and NULL loads as no power', () => {
  const store = makeStore();
  const reg = store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const inv = new Array<{
    item: string;
    qty: number;
    roll?: { rar: 'epic' | 'rare'; seed: number; pwr?: number };
  } | null>(28).fill(null);
  inv[0] = { item: 'thistledown_robe', qty: 1, roll: { rar: 'epic', seed: 42, pwr: 45 } };
  inv[1] = { item: 'iron_helm', qty: 1, roll: { rar: 'rare', seed: 7 } };
  store.saveInventory(cid, inv);
  const loaded = store.loadInventory(cid, 28);
  assert.deepEqual(loaded[0]!.roll, { rar: 'epic', seed: 42, pwr: 45 });
  assert.equal(loaded[1]!.roll!.pwr, undefined);

  store.saveEquipment(cid, { body: { id: 'thistledown_robe', roll: { rar: 'epic', seed: 42, pwr: 45 } } });
  assert.deepEqual(store.loadEquipment(cid).body!.roll, { rar: 'epic', seed: 42, pwr: 45 });

  const rowId = store.insertBankGear(cid, 'thistledown_robe', { rar: 'epic', seed: 42, pwr: 45 });
  const stored = store.loadBankGear(cid).find((g) => g.id === rowId);
  assert.deepEqual(stored!.roll, { rar: 'epic', seed: 42, pwr: 45 });
});

test('weapon oils ride the instance through every path; dried oils drop at load', () => {
  const store = makeStore();
  const reg = store.register('rogue', 'hunter22', 'Vialla', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const wet = { id: 'adderfang_oil', until: Date.now() + 60_000 };
  const dried = { id: 'hobble_brew', until: Date.now() - 1000 };

  const inv = new Array<{
    item: string;
    qty: number;
    roll?: { rar: 'common'; seed: number; coat?: { id: string; until: number } };
  } | null>(28).fill(null);
  inv[0] = { item: 'bronze_dagger', qty: 1, roll: { rar: 'common', seed: 1, coat: wet } };
  inv[1] = { item: 'iron_dagger', qty: 1, roll: { rar: 'common', seed: 2, coat: dried } };
  store.saveInventory(cid, inv);
  const loaded = store.loadInventory(cid, 28);
  assert.deepEqual(loaded[0]!.roll!.coat, wet, 'wet oil survives the round trip');
  assert.equal(loaded[1]!.roll!.coat, undefined, 'dried oil is gone at load');

  store.saveEquipment(cid, { weapon: { id: 'bronze_dagger', roll: { rar: 'common', seed: 1, coat: wet } } });
  assert.deepEqual(store.loadEquipment(cid).weapon!.roll!.coat, wet);

  const rowId = store.insertBankGear(cid, 'bronze_dagger', { rar: 'common', seed: 1, coat: wet });
  assert.deepEqual(store.loadBankGear(cid).find((g) => g.id === rowId)!.roll.coat, wet);
});

test('enchant ids ride every roll path: inventory, equipment, bank gear', () => {
  const store = makeStore();
  const reg = store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const inv = new Array<{ item: string; qty: number; roll?: import('@devcraft/shared').ItemRoll } | null>(28).fill(null);
  inv[0] = { item: 'bronze_sword', qty: 1, roll: { rar: 'rare', seed: 9, ench: 'inferno_edge' } };
  store.saveInventory(cid, inv);
  const loaded = store.loadInventory(cid, 28);
  assert.equal(loaded[0]?.roll?.ench, 'inferno_edge', 'inventory keeps the enchant');

  store.saveEquipment(cid, {
    weapon: { id: 'bronze_sword', roll: { rar: 'epic', seed: 5, ench: 'vampiric_edge' } },
    body: { id: 'leather_body', roll: { rar: 'common', seed: 0 } },
  });
  const eq = store.loadEquipment(cid);
  assert.equal(eq.weapon?.roll?.ench, 'vampiric_edge', 'equipment keeps the enchant');
  assert.equal(eq.body?.roll?.ench, undefined, 'unenchanted stays clean');

  const rowId = store.insertBankGear(cid, 'iron_helm', { rar: 'rare', seed: 4, ench: 'clever' });
  const bank = store.loadBankGear(cid);
  assert.equal(bank.find((r) => r.id === rowId)?.roll.ench, 'clever', 'bank keeps the enchant');
});

test('per-hand grip preferences persist independently', () => {
  const store = makeStore();
  const reg = store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  const id = reg.ok ? reg.character.id : -1;
  // Fresh characters carry standard in both fists.
  assert.deepEqual(store.loadCarryStyles(id), { main: 'normal', off: 'normal' });
  // Each fist saves without touching the other.
  store.saveCarryStyle(id, 'off', 'rogue');
  assert.deepEqual(store.loadCarryStyles(id), { main: 'normal', off: 'rogue' });
  store.saveCarryStyle(id, 'main', 'rogue');
  store.saveCarryStyle(id, 'off', 'normal');
  assert.deepEqual(store.loadCarryStyles(id), { main: 'rogue', off: 'normal' });
});
