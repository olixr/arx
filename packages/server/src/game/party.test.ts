import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { S2CMessage } from '@arx/shared';
import { freshDb } from '../db/testDb.js';
import { AccountStore } from '../db/accounts.js';
import { PartySystem, INVITE_TTL_MS } from './party.js';
import type { PartyHost } from './party.js';

const SPAWN = { x: 48.5, y: 52.5 };

interface Rig {
  party: PartySystem;
  store: AccountStore;
  ids: Record<string, number>;
  online: Set<number>;
  sent: Map<number, S2CMessage[]>;
  severed: number[];
  clock: { now: number };
}

async function makeRig(): Promise<Rig> {
  const store = new AccountStore(await freshDb());
  const ids: Record<string, number> = {};
  for (const [user, name] of [
    ['alice', 'Alice'],
    ['bob', 'Bob'],
    ['carol', 'Carol'],
    ['dave', 'Dave'],
  ] as const) {
    const reg = await store.register(user, 'hunter22', name, SPAWN);
    assert.ok(reg.ok);
    if (reg.ok) ids[name] = reg.character.id;
  }
  await store.preloadCharacterNames();
  const online = new Set<number>(Object.values(ids));
  const sent = new Map<number, S2CMessage[]>();
  const severed: number[] = [];
  const clock = { now: 1_000_000 };
  const host: PartyHost = {
    isOnline: (id) => online.has(id),
    zoneOfCharacter: (id) => (online.has(id) ? 'Dawnmead' : null),
    sendToCharacter: (id, msg) => {
      if (!online.has(id)) return false;
      const box = sent.get(id) ?? [];
      box.push(msg);
      sent.set(id, box);
      return true;
    },
    positionOfCharacter: (id) => (online.has(id) ? { x: 10 + id, y: 20 + id } : null),
    onMemberSevered: (id) => severed.push(id),
  };
  const party = new PartySystem(store, host, () => clock.now);
  return { party, store, ids, online, sent, severed, clock };
}

/** Drive one action and collect what came back on the actor's own socket. */
async function act(
  fn: (send: (msg: S2CMessage) => void) => Promise<void>,
): Promise<S2CMessage[]> {
  const out: S2CMessage[] = [];
  await fn((msg) => out.push(msg));
  return out;
}

function chatText(msgs: S2CMessage[]): string[] {
  return msgs.filter((m) => m.t === 'chat').map((m) => (m as { text: string }).text);
}

async function snapshotOf(rig: Rig, id: number) {
  const msgs = await act((send) => rig.party.snapshot(id, send));
  const snap = msgs.find((m) => m.t === 'party');
  assert.ok(snap, 'snapshot answered');
  return snap as Extract<S2CMessage, { t: 'party' }>;
}

test('invite then accept founds a party of two, inviter leads', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  assert.equal(rig.sent.get(ids.Bob!)?.some((m) => m.t === 'partyevent' && m.kind === 'invite'), true);

  const answers = await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  assert.match(chatText(answers).join(' '), /walk with Alice's party/);

  const snap = await snapshotOf(rig, ids.Alice!);
  assert.deepEqual(
    snap.members.map((m) => ({ name: m.name, leader: m.leader ?? false })),
    [
      { name: 'Alice', leader: true },
      { name: 'Bob', leader: false },
    ],
  );
  assert.equal(snap.members.every((m) => m.online && m.zone === 'Dawnmead'), true);
  // Membership survived to the ledger.
  const stored = await rig.store.loadPartyOf(ids.Bob!);
  assert.equal(stored?.leaderId, ids.Alice);
});

test('membership reloads from the ledger after a memory wipe (relog law)', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));

  // A second system over the same store = a server restart.
  const reborn = new PartySystem(rig.store, {
    isOnline: () => true,
    zoneOfCharacter: () => null,
    sendToCharacter: () => true,
    positionOfCharacter: () => null,
    onMemberSevered: () => undefined,
  });
  await reborn.ensureLoaded(ids.Bob!);
  assert.deepEqual(reborn.fellowsOf(ids.Bob!), [ids.Alice]);
});

test('offline targets cannot be courted; the sworn cannot be courted', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  rig.online.delete(ids.Carol!);
  const answers = await act((send) => party.invite(ids.Alice!, 'Alice', 'Carol', send));
  assert.match(chatText(answers).join(' '), /not in the world/);

  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  const courtSworn = await act((send) => party.invite(ids.Dave!, 'Dave', 'Bob', send));
  assert.match(chatText(courtSworn).join(' '), /already walks with a party/);
});

test('an invite goes cold after its TTL', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  rig.clock.now += INVITE_TTL_MS + 1;
  const answers = await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  assert.match(chatText(answers).join(' '), /No party invite/);
});

test('decline is quiet and only nudges the inviter', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  const answers = await act((send) => party.decline(ids.Bob!, 'Bob', 'Alice', send));
  assert.equal(chatText(answers).length, 0, 'no chat for the decliner');
  assert.equal(
    rig.sent.get(ids.Alice!)?.some((m) => m.t === 'partyevent' && m.kind === 'declined'),
    true,
  );
});

test('third member joins the existing party; leaving hands the reins down', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  // Any member may invite.
  await act((send) => party.invite(ids.Bob!, 'Bob', 'Carol', send));
  await act((send) => party.accept(ids.Carol!, 'Carol', 'Bob', send));
  assert.equal((await snapshotOf(rig, ids.Alice!)).members.length, 3);

  // The leader walks; the longest-sworn remaining member leads.
  await act((send) => party.leave(ids.Alice!, 'Alice', send));
  assert.deepEqual(rig.severed, [ids.Alice]);
  const snap = await snapshotOf(rig, ids.Bob!);
  assert.equal(snap.members.find((m) => m.leader)?.name, 'Bob');
  assert.equal(snap.members.length, 2);
  const stored = await rig.store.loadPartyOf(ids.Bob!);
  assert.equal(stored?.leaderId, ids.Bob);
});

test('a party of one folds — and everyone hears the disband', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  await act((send) => party.leave(ids.Bob!, 'Bob', send));
  assert.equal(
    rig.sent.get(ids.Alice!)?.some((m) => m.t === 'partyevent' && m.kind === 'disbanded'),
    true,
    'the stranded soul hears the party fold',
  );
  assert.equal((await snapshotOf(rig, ids.Alice!)).members.length, 0);
  assert.equal(await rig.store.loadPartyOf(ids.Alice!), null);
});

test('kick is leader-only and tells the kicked', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Carol', send));
  await act((send) => party.accept(ids.Carol!, 'Carol', 'Alice', send));

  const notLeader = await act((send) => party.kick(ids.Bob!, 'Bob', 'Carol', send));
  assert.match(chatText(notLeader).join(' '), /Only the party leader/);

  await act((send) => party.kick(ids.Alice!, 'Alice', 'Carol', send));
  assert.equal(
    rig.sent.get(ids.Carol!)?.some((m) => m.t === 'partyevent' && m.kind === 'kicked'),
    true,
  );
  assert.deepEqual(rig.severed, [ids.Carol]);
  assert.equal((await snapshotOf(rig, ids.Alice!)).members.length, 2);
});

test('disband severs everyone at once', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  const answers = await act((send) => party.disband(ids.Alice!, send));
  assert.match(chatText(answers).join(' '), /disbanded/);
  assert.equal(
    rig.sent.get(ids.Bob!)?.some((m) => m.t === 'partyevent' && m.kind === 'disbanded'),
    true,
  );
  assert.deepEqual([...rig.severed].sort(), [ids.Alice!, ids.Bob!].sort());
  assert.equal(await rig.store.loadPartyOf(ids.Bob!), null);
});

test('tickPositions tells each member where the others stand', async () => {
  const rig = await makeRig();
  const { party, ids } = rig;
  await act((send) => party.invite(ids.Alice!, 'Alice', 'Bob', send));
  await act((send) => party.accept(ids.Bob!, 'Bob', 'Alice', send));
  rig.sent.clear();
  party.tickPositions();
  const toAlice = rig.sent.get(ids.Alice!)?.find((m) => m.t === 'partypos');
  assert.ok(toAlice);
  const members = (toAlice as Extract<S2CMessage, { t: 'partypos' }>).members;
  assert.deepEqual(members.map((m) => m.name), ['Bob']);
  assert.equal(members[0]!.x, 10 + ids.Bob!);
  // An offline fellow sends and receives nothing.
  rig.online.delete(ids.Bob!);
  rig.sent.clear();
  party.tickPositions();
  assert.equal(rig.sent.size, 0, 'a party with one placed member stays silent');
});
