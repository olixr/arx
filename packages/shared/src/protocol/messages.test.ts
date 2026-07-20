import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseC2S } from './messages.js';

test('bank message accepts and validates instance-addressing fields', () => {
  const ok = parseC2S(
    JSON.stringify({ t: 'bank', op: 'deposit', item: 'iron_helm', qty: 1, slot: 4 }),
  );
  assert.deepEqual(ok, { t: 'bank', op: 'deposit', item: 'iron_helm', qty: 1, slot: 4, gearId: undefined });

  const withdraw = parseC2S(
    JSON.stringify({ t: 'bank', op: 'withdraw', item: 'iron_helm', qty: 1, gearId: 12 }),
  );
  assert.equal(withdraw?.t === 'bank' && withdraw.gearId, 12);

  // Out-of-range or non-integer instance fields reject the message.
  assert.equal(parseC2S(JSON.stringify({ t: 'bank', op: 'deposit', item: 'x', qty: 1, slot: 64 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'bank', op: 'deposit', item: 'x', qty: 1, slot: 1.5 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'bank', op: 'withdraw', item: 'x', qty: 1, gearId: -1 })), null);
});

test('shop sell accepts an exact pack slot', () => {
  const ok = parseC2S(JSON.stringify({ t: 'shop', op: 'sell', item: 'iron_helm', qty: 1, slot: 7 }));
  assert.equal(ok?.t === 'shop' && ok.slot, 7);
  assert.equal(parseC2S(JSON.stringify({ t: 'shop', op: 'sell', item: 'x', qty: 1, slot: 99 })), null);
});

test('pickup targets one drop entity and rejects bad eids', () => {
  const ok = parseC2S(JSON.stringify({ t: 'pickup', eid: 31 }));
  assert.deepEqual(ok, { t: 'pickup', eid: 31 });
  assert.equal(parseC2S(JSON.stringify({ t: 'pickup', eid: -1 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'pickup', eid: 2.5 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'pickup' })), null);
});

test('carrystyle sets a grip per fist, defaulting to the main hand', () => {
  const main = parseC2S(JSON.stringify({ t: 'carrystyle', style: 'rogue' }));
  assert.deepEqual(main, { t: 'carrystyle', style: 'rogue', hand: undefined });
  const off = parseC2S(JSON.stringify({ t: 'carrystyle', style: 'normal', hand: 'off' }));
  assert.deepEqual(off, { t: 'carrystyle', style: 'normal', hand: 'off' });
  // Unknown hands and styles reject the message.
  assert.equal(parseC2S(JSON.stringify({ t: 'carrystyle', style: 'rogue', hand: 'left' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'carrystyle', style: 'icepick' })), null);
});
