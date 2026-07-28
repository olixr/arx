import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExploredMask } from '@arx/shared';
import { freshDb } from './testDb.js';
import { AccountStore } from './accounts.js';

const SPAWN = { x: 48.5, y: 52.5 };

async function makeStore(): Promise<{ store: AccountStore; id: number }> {
  const store = new AccountStore(await freshDb());
  const reg = await store.register('mapper', 'hunter22', 'Mapper', SPAWN);
  assert.ok(reg.ok);
  return { store, id: reg.ok ? reg.character.id : 0 };
}

test('explored region bytes roundtrip through BYTEA', async () => {
  const { store, id } = await makeStore();
  const mask = new ExploredMask();
  mask.markDisc(100, -300);
  for (const key of mask.regionKeys()) {
    const [rx, ry] = key.split(',').map(Number) as [number, number];
    store.saveExploredRegion(id, rx, ry, mask.regionBytes(rx, ry)!);
  }
  const rows = await store.loadExplored(id);
  assert.equal(rows.length, mask.regionCount);
  const loaded = new ExploredMask();
  for (const row of rows) loaded.loadRegion(row.rx, row.ry, row.bits);
  assert.ok(loaded.isRevealed(100, -300));
  for (const key of mask.regionKeys()) {
    const [rx, ry] = key.split(',').map(Number) as [number, number];
    assert.deepEqual(
      [...loaded.regionBytes(rx, ry)!],
      [...mask.regionBytes(rx, ry)!],
      `region ${key}`,
    );
  }
});

test('explored region upsert replaces bits in place', async () => {
  const { store, id } = await makeStore();
  const mask = new ExploredMask();
  mask.markDisc(10, 10);
  store.saveExploredRegion(id, 0, 0, mask.regionBytes(0, 0)!);
  mask.markDisc(200, 200);
  store.saveExploredRegion(id, 0, 0, mask.regionBytes(0, 0)!);
  const rows = await store.loadExplored(id);
  const region00 = rows.find((r) => r.rx === 0 && r.ry === 0);
  assert.ok(region00);
  assert.deepEqual([...region00.bits], [...mask.regionBytes(0, 0)!]);
});

test('discoveries insert once, load whole, and fade across characters', async () => {
  const { store, id } = await makeStore();
  const reg2 = await store.register('mapper2', 'hunter22', 'Wanderer', SPAWN);
  assert.ok(reg2.ok);
  const id2 = reg2.ok ? reg2.character.id : 0;

  const amberford = { id: 'zone:amberford', kind: 'town', name: 'Amberford', x: 352, y: 24 };
  const camp = { id: 'poi:1,0', kind: 'poi', name: 'Goblin warcamp', x: 147, y: 30, tier: 3 };
  store.addDiscovery(id, amberford);
  store.addDiscovery(id, amberford); // once-only
  store.addDiscovery(id, camp, 2);
  store.addDiscovery(id2, camp, 2);

  const mine = await store.loadDiscoveries(id);
  assert.equal(mine.length, 2);
  const campRow = mine.find((d) => d.id === 'poi:1,0');
  assert.equal(campRow?.tier, 3);
  assert.equal(campRow?.epoch, 2);
  assert.equal(campRow?.faded, 0);

  // The frontier turns over — every character's marker ages together.
  store.fadeDiscovery('poi:1,0');
  const after = await store.loadDiscoveries(id);
  assert.equal(after.find((d) => d.id === 'poi:1,0')?.faded, 1);
  assert.equal(after.find((d) => d.id === 'zone:amberford')?.faded, 0, 'towns untouched');
  const theirs = await store.loadDiscoveries(id2);
  assert.equal(theirs.find((d) => d.id === 'poi:1,0')?.faded, 1);
});

test('waypoint set, move, clear round trip through the character row', async () => {
  const { store, id } = await makeStore();
  store.saveWaypoint(id, 340, 20);
  store.saveWaypoint(id, -80, 48);
  let res = await store.login('mapper', 'hunter22');
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.character.waypoint_x, -80);
    assert.equal(res.character.waypoint_y, 48);
  }
  store.clearWaypoint(id);
  res = await store.login('mapper', 'hunter22');
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.character.waypoint_x, null);
    assert.equal(res.character.waypoint_y, null);
  }
});
