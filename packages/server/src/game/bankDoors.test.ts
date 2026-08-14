import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';
import { addItem, countItem, emptyInventory } from './inventory.js';

/**
 * The teller's ledger, pinned against the 2026-07 audit:
 *
 * - deposits refuse stolen goods (the vault keeps no theft facet, so
 *   deposit+withdraw would wash them clean);
 * - id-addressed deposits refuse non-stackable defs (the
 *   instance-addressing law);
 * - a gear withdraw proves pack space AFTER the row load and deletes
 *   the row only once the piece is in hand — the space race that
 *   destroyed instances is closed;
 * - a gear deposit awaits its row insert, refuses cleanly on failure,
 *   and flushes the inventory ahead of the 30s cadence either way the
 *   instance moved.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as { bankOp: AnyFn; speak: AnyFn };

const bankOp = (self: unknown, ...args: unknown[]): Promise<void> =>
  (proto.bankOp as (...a: unknown[]) => Promise<void>).call(self, ...args);

function slate(opts: {
  insertFails?: boolean;
  gearRows?: Array<{ id: number; item: string; roll: { rar: string; seed: number } }>;
} = {}) {
  const lines: string[] = [];
  const inserted: Array<[string, unknown]> = [];
  const deleted: number[] = [];
  const saved: unknown[] = [];
  const player = {
    characterId: 7,
    bank: {} as Record<string, number>,
    bankDirty: false,
    inventory: emptyInventory(),
    session: {
      // THE RISEN WORD sends refusals as 'notice' (log line + overhead
      // word); the harness reads both voices as spoken lines.
      sendJson: (m: { t: string; text?: string }) => {
        if ((m.t === 'chat' || m.t === 'notice') && m.text) lines.push(m.text);
      },
    },
  };
  const s = {
    speak: proto.speak,
    players: new Map([[1, player]]),
    positions: new Map([[1, { x: 0, y: 0, dir: 0 }]]),
    nearTile: () => true,
    bankOpBusy: new Set(),
    accounts: {
      insertBankGear: (_cid: number, item: string, roll: unknown) => {
        if (opts.insertFails) return Promise.reject(new Error('db down'));
        inserted.push([item, roll]);
        return Promise.resolve(11);
      },
      deleteBankGear: (id: number) => {
        deleted.push(id);
        return Promise.resolve(true);
      },
      loadBankGear: () => Promise.resolve(opts.gearRows ?? []),
      saveInventory: (_cid: number, slots: unknown) => saved.push(slots),
    },
    sendBank: () => Promise.resolve(),
    placeDrop: () => {},
    bankOp: proto.bankOp,
  };
  return { s, player, lines, inserted, deleted, saved };
}

test('the teller refuses a stolen stack: deposit+withdraw is no laundry', async () => {
  const { s, player, lines } = slate();
  addItem(player.inventory, 'twine', 3, undefined, true);
  const idx = player.inventory.findIndex((x) => x !== null);
  await bankOp(s, 1, 'deposit', 'twine', 3, idx);
  assert.deepEqual(player.bank, {}, 'nothing crossed the counter');
  assert.equal(player.inventory[idx]?.qty, 3, 'the hot stack stays in the pack');
  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /fence/i, 'the teller points at the fences');
  assert.doesNotMatch(lines[0]!, /—|–|--/, 'the refusal keeps the dash ban');
});

test('the teller refuses a stolen instance the same way', async () => {
  const { s, player, inserted } = slate();
  addItem(player.inventory, 'bronze_sword', 1, { rar: 'rare', seed: 3 });
  player.inventory[0]!.stolen = true;
  await bankOp(s, 1, 'deposit', 'bronze_sword', 1, 0);
  assert.equal(inserted.length, 0, 'no row was written');
  assert.ok(player.inventory[0]?.stolen, 'the piece keeps its history');
});

test('id-addressed deposits refuse non-stackable defs', async () => {
  const { s, player } = slate();
  addItem(player.inventory, 'bronze_axe', 2);
  await bankOp(s, 1, 'deposit', 'bronze_axe', 2);
  assert.equal(countItem(player.inventory, 'bronze_axe'), 2, 'the axes never moved without a slot named');
  assert.deepEqual(player.bank, {});
  // Stackable materials keep the old id-addressed convenience.
  addItem(player.inventory, 'twine', 5);
  await bankOp(s, 1, 'deposit', 'twine', 5);
  assert.equal(player.bank.twine, 5);
});

test('gear withdraw: a pack filled mid-flight refuses and the row survives', async () => {
  const { s, player, lines, deleted } = slate({
    gearRows: [{ id: 44, item: 'bronze_sword', roll: { rar: 'rare', seed: 3 } }],
  });
  addItem(player.inventory, 'bronze_axe', 28); // the 20Hz tick beat us to every slot
  await bankOp(s, 1, 'withdraw', 'bronze_sword', 1, undefined, 44);
  assert.equal(deleted.length, 0, 'the row was never deleted for a piece with no home');
  assert.equal(countItem(player.inventory, 'bronze_sword'), 0);
  assert.ok(lines.some((l) => /no room/i.test(l)), 'the refusal is spoken');
});

test('gear withdraw: piece in hand first, row deleted second, pack flushed', async () => {
  const { s, player, deleted, saved } = slate({
    gearRows: [{ id: 44, item: 'bronze_sword', roll: { rar: 'rare', seed: 3 } }],
  });
  await bankOp(s, 1, 'withdraw', 'bronze_sword', 1, undefined, 44);
  const got = player.inventory.find((x) => x?.item === 'bronze_sword');
  assert.ok(got?.roll, 'the instance landed with its roll');
  assert.equal(got.roll.seed, 3);
  assert.deepEqual(deleted, [44], 'and only then did the row die');
  assert.equal(saved.length, 1, 'the pack was flushed ahead of the cadence');
});

test('gear deposit: the row is awaited and the pack flushed on success', async () => {
  const { s, player, inserted, saved } = slate();
  addItem(player.inventory, 'bronze_sword', 1, { rar: 'epic', seed: 5 });
  await bankOp(s, 1, 'deposit', 'bronze_sword', 1, 0);
  assert.equal(inserted.length, 1);
  assert.equal(player.inventory[0], null, 'the piece moved into its row');
  assert.equal(saved.length, 1, 'the pack was flushed ahead of the cadence');
});

test('gear deposit: an insert failure hands the piece straight back', async () => {
  const { s, player, lines, saved } = slate({ insertFails: true });
  addItem(player.inventory, 'bronze_sword', 1, { rar: 'epic', seed: 5 });
  await bankOp(s, 1, 'deposit', 'bronze_sword', 1, 0);
  const back = player.inventory.find((x) => x?.item === 'bronze_sword');
  assert.ok(back?.roll, 'the instance came back, roll and all');
  assert.equal(back.roll.seed, 5);
  assert.ok(lines.some((l) => /vault/i.test(l)), 'the refusal is spoken');
  assert.equal(saved.length, 0, 'nothing to flush: the deposit never happened');
});
