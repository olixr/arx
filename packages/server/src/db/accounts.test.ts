import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb } from './testDb.js';
import { AccountStore } from './accounts.js';

const SPAWN = { x: 48.5, y: 52.5 };

async function makeStore(): Promise<AccountStore> {
  return new AccountStore(await freshDb());
}

test('register + login round trip', async () => {
  const store = await makeStore();
  const reg = await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok, 'register should succeed');
  const login = await store.login('eric', 'hunter22');
  assert.ok(login.ok);
  assert.equal(login.ok && login.character.name, 'Aeriek');
});

test('wrong password is rejected without leaking which part failed', async () => {
  const store = await makeStore();
  await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  const bad = await store.login('eric', 'wrong-pass');
  const missing = await store.login('nobody', 'hunter22');
  assert.ok(!bad.ok && !missing.ok);
  assert.equal(bad.ok || bad.reason, missing.ok || missing.reason);
});

test('duplicate usernames and character names are rejected', async () => {
  const store = await makeStore();
  assert.ok((await store.register('eric', 'hunter22', 'Aeriek', SPAWN)).ok);
  const dupUser = await store.register('ERIC', 'password9', 'Other', SPAWN);
  assert.ok(!dupUser.ok, 'case-insensitive username collision');
  const dupChar = await store.register('someone', 'password9', 'aeriek', SPAWN);
  assert.ok(!dupChar.ok, 'case-insensitive character collision');
});

test('validation: short passwords and bad names rejected', async () => {
  const store = await makeStore();
  assert.ok(!(await store.register('eric', 'short', 'Aeriek', SPAWN)).ok);
  assert.ok(!(await store.register('e!', 'hunter22', 'Aeriek', SPAWN)).ok);
  assert.ok(!(await store.register('eric', 'hunter22', 'x', SPAWN)).ok);
});

test('invite gate: required registration spends a valid code', async () => {
  const store = await makeStore();
  await store.upsertInviteCode('SILVERFALL-2026', 'test');
  const noCode = await store.register('eric', 'hunter22', 'Aeriek', SPAWN, { required: true });
  assert.ok(!noCode.ok, 'no code is turned away');
  const badCode = await store.register('eric', 'hunter22', 'Aeriek', SPAWN, {
    required: true,
    code: 'WRONG',
  });
  assert.ok(!badCode.ok, 'wrong code is turned away');
  // CITEXT: the code survives any casing, and whitespace is trimmed.
  const good = await store.register('eric', 'hunter22', 'Aeriek', SPAWN, {
    required: true,
    code: '  silverfall-2026 ',
  });
  assert.ok(good.ok, 'a valid code opens the door');
  const login = await store.login('eric', 'hunter22');
  assert.ok(login.ok, 'the invited account can sign in');
});

test('invite gate: max_uses caps a code; disabled and unknown codes never leak name availability', async () => {
  const store = await makeStore();
  await store.upsertInviteCode('ONE-SHOT', 'test', 1);
  assert.ok((await store.register('first', 'hunter22', 'First', SPAWN, { required: true, code: 'ONE-SHOT' })).ok);
  const spent = await store.register('second', 'hunter22', 'Second', SPAWN, {
    required: true,
    code: 'ONE-SHOT',
  });
  assert.ok(!spent.ok, 'a spent code is turned away');

  // The invite check stands before uniqueness checks: probing with a
  // bad code and a TAKEN username must report only the bad code.
  const probe = await store.register('first', 'hunter22', 'Other', SPAWN, {
    required: true,
    code: 'NOPE',
  });
  assert.ok(!probe.ok);
  assert.ok(!probe.ok && /invite/i.test(probe.reason), 'reason speaks only of the invite');

  // Re-arming a code re-opens it without resetting its history.
  await store.upsertInviteCode('ONE-SHOT', 'test', 2);
  assert.ok((await store.register('second', 'hunter22', 'Second', SPAWN, { required: true, code: 'ONE-SHOT' })).ok);
  assert.equal(await store.countOpenInviteCodes(), 0, 'both uses spent again');
});

test('invite gate: unrequired registration ignores codes entirely', async () => {
  const store = await makeStore();
  const res = await store.register('eric', 'hunter22', 'Aeriek', SPAWN, {
    required: false,
    code: 'ANYTHING',
  });
  assert.ok(res.ok, 'open registration never checks the ledger');
});

test('sessions resume and persist character position', async () => {
  const store = await makeStore();
  const reg = await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const token = await store.createSession(reg.accountId);

  store.saveCharacter(reg.character.id, 100.25, -42.5, 7);
  const resumed = await store.resumeSession(token);
  assert.ok(resumed.ok);
  if (!resumed.ok) return;
  assert.equal(resumed.character.x, 100.25);
  assert.equal(resumed.character.y, -42.5);
  assert.equal(resumed.character.hp, 7);

  assert.ok(!(await store.resumeSession('bogus-token')).ok);
});

test('inventory + equipment round-trip item rolls; legacy NULLs load as no roll', async () => {
  const store = await makeStore();
  const reg = await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const inv = new Array<{ item: string; qty: number; roll?: { rar: 'epic'; seed: number } } | null>(
    28,
  ).fill(null);
  inv[0] = { item: 'iron_platebody', qty: 1, roll: { rar: 'epic', seed: 12345 } };
  inv[3] = { item: 'coins', qty: 400 };
  store.saveInventory(cid, inv);
  const loaded = await store.loadInventory(cid, 28);
  assert.deepEqual(loaded[0], { item: 'iron_platebody', qty: 1, roll: { rar: 'epic', seed: 12345 } });
  assert.deepEqual(loaded[3], { item: 'coins', qty: 400, roll: undefined });

  store.saveEquipment(cid, {
    head: { id: 'iron_helm', roll: { rar: 'rare', seed: 77 } },
    weapon: { id: 'bronze_sword' },
  });
  const eq = await store.loadEquipment(cid);
  assert.deepEqual(eq.head, { id: 'iron_helm', roll: { rar: 'rare', seed: 77 } });
  assert.deepEqual(eq.weapon, { id: 'bronze_sword', roll: undefined });
});

test('bank gear rows preserve exact rolls and keep stable ids', async () => {
  const store = await makeStore();
  const reg = await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const a = await store.insertBankGear(cid, 'iron_helm', { rar: 'legendary', seed: 9 });
  const b = await store.insertBankGear(cid, 'iron_helm', { rar: 'common', seed: 4 });
  assert.notEqual(a, b);
  // Deleting one row must not renumber the other — ids are addresses.
  assert.ok(await store.deleteBankGear(a, cid));
  const left = await store.loadBankGear(cid);
  assert.deepEqual(left, [{ id: b, item: 'iron_helm', roll: { rar: 'common', seed: 4 } }]);
  // Cross-character deletion is refused.
  assert.ok(!(await store.deleteBankGear(b, cid + 999)));
});

test('item power rides every persistence path and NULL loads as no power', async () => {
  const store = await makeStore();
  const reg = await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
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
  const loaded = await store.loadInventory(cid, 28);
  assert.deepEqual(loaded[0]!.roll, { rar: 'epic', seed: 42, pwr: 45 });
  assert.equal(loaded[1]!.roll!.pwr, undefined);

  store.saveEquipment(cid, { body: { id: 'thistledown_robe', roll: { rar: 'epic', seed: 42, pwr: 45 } } });
  assert.deepEqual((await store.loadEquipment(cid)).body!.roll, { rar: 'epic', seed: 42, pwr: 45 });

  const rowId = await store.insertBankGear(cid, 'thistledown_robe', { rar: 'epic', seed: 42, pwr: 45 });
  const stored = (await store.loadBankGear(cid)).find((g) => g.id === rowId);
  assert.deepEqual(stored!.roll, { rar: 'epic', seed: 42, pwr: 45 });
});

test('weapon oils ride the instance through every path; dried oils drop at load', async () => {
  const store = await makeStore();
  const reg = await store.register('rogue', 'hunter22', 'Vialla', SPAWN);
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
  const loaded = await store.loadInventory(cid, 28);
  assert.deepEqual(loaded[0]!.roll!.coat, wet, 'wet oil survives the round trip');
  assert.equal(loaded[1]!.roll!.coat, undefined, 'dried oil is gone at load');

  store.saveEquipment(cid, { weapon: { id: 'bronze_dagger', roll: { rar: 'common', seed: 1, coat: wet } } });
  assert.deepEqual((await store.loadEquipment(cid)).weapon!.roll!.coat, wet);

  const rowId = await store.insertBankGear(cid, 'bronze_dagger', { rar: 'common', seed: 1, coat: wet });
  assert.deepEqual((await store.loadBankGear(cid)).find((g) => g.id === rowId)!.roll.coat, wet);
});

test('enchant ids ride every roll path: inventory, equipment, bank gear', async () => {
  const store = await makeStore();
  const reg = await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  if (!reg.ok) return;
  const cid = reg.character.id;

  const inv = new Array<{ item: string; qty: number; roll?: import('@arx/shared').ItemRoll } | null>(28).fill(null);
  inv[0] = { item: 'bronze_sword', qty: 1, roll: { rar: 'rare', seed: 9, ench: 'inferno_edge' } };
  store.saveInventory(cid, inv);
  const loaded = await store.loadInventory(cid, 28);
  assert.equal(loaded[0]?.roll?.ench, 'inferno_edge', 'inventory keeps the enchant');

  store.saveEquipment(cid, {
    weapon: { id: 'bronze_sword', roll: { rar: 'epic', seed: 5, ench: 'vampiric_edge' } },
    body: { id: 'leather_body', roll: { rar: 'common', seed: 0 } },
  });
  const eq = await store.loadEquipment(cid);
  assert.equal(eq.weapon?.roll?.ench, 'vampiric_edge', 'equipment keeps the enchant');
  assert.equal(eq.body?.roll?.ench, undefined, 'unenchanted stays clean');

  const rowId = await store.insertBankGear(cid, 'iron_helm', { rar: 'rare', seed: 4, ench: 'clever' });
  const bank = await store.loadBankGear(cid);
  assert.equal(bank.find((r) => r.id === rowId)?.roll.ench, 'clever', 'bank keeps the enchant');
});

test('per-hand grip preferences persist independently', async () => {
  const store = await makeStore();
  const reg = await store.register('eric', 'hunter22', 'Aeriek', SPAWN);
  assert.ok(reg.ok);
  const id = reg.ok ? reg.character.id : -1;
  // Fresh characters carry standard in both fists.
  assert.deepEqual(await store.loadCarryStyles(id), { main: 'normal', off: 'normal' });
  // Each fist saves without touching the other.
  store.saveCarryStyle(id, 'off', 'rogue');
  assert.deepEqual(await store.loadCarryStyles(id), { main: 'normal', off: 'rogue' });
  store.saveCarryStyle(id, 'main', 'rogue');
  store.saveCarryStyle(id, 'off', 'normal');
  assert.deepEqual(await store.loadCarryStyles(id), { main: 'rogue', off: 'normal' });
});
