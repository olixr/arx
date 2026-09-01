import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameServer } from './gameServer.js';

// THE SPOKEN CHARACTER (foundations F4.10). Written against the
// in-class dialogue engine BEFORE the move; identical after. Slate
// convention throughout.

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

test('world:bounty_open reads through the live ledger', () => {
  const slate = { openBounties: (_p: unknown) => [{ id: 'b1' }] };
  const yes = (proto.worldFlagAnswer as Fn).call(slate, 'world:bounty_open' as never, {} as never, 0 as never, 0 as never);
  assert.equal(yes, true);
  slate.openBounties = () => [];
  const no = (proto.worldFlagAnswer as Fn).call(slate, 'world:bounty_open' as never, {} as never, 0 as never, 0 as never);
  assert.equal(no, false);
});

test('world:peddler_near measures from the parked cart, not the town', () => {
  const ledger = new Map([
    ['r1', { site: { defId: 'peddler_rest', anchorX: 10, anchorY: 0 } }],
    ['r2', { site: { defId: 'war_camp', anchorX: 1, anchorY: 0 } }],
  ]);
  const slate = { poiLedger: ledger };
  const near = (proto.worldFlagAnswer as Fn).call(slate, 'world:peddler_near' as never, {} as never, 12 as never, 0 as never);
  assert.equal(near, true);
  const far = (proto.worldFlagAnswer as Fn).call(slate, 'world:peddler_near' as never, {} as never, 500 as never, 0 as never);
  assert.equal(far, false);
});

test('an unrationed quip draws from the bank and writes its memory', () => {
  // Slate a one-clip bank; the unrationed path never rolls dice for
  // the cooldown gate, so the draw is deterministic apart from the
  // pick itself, which a single clip pins.
  const banks = new Map([['npc:elder', { slots: { greet: [{ clip: 'clip_hail' }] } }]]);
  const clips = new Map([['clip_hail', { id: 'clip_hail', url: 'v/hail.mp3', durMs: 900 }]]);
  const memory = new Map();
  const slate = { voiceBanks: banks, voiceClips: clips, voiceQuipMemory: memory };
  const wire = (proto.drawQuip as Fn).call(slate, 'npc:elder' as never, 'greet' as never, false as never);
  assert.ok(wire, 'a stocked bank must speak when unrationed');
  assert.ok(memory.has('npc:elder'), 'the draw is remembered');
  const silent = (proto.drawQuip as Fn).call(slate, 'npc:stranger' as never, 'greet' as never, false as never);
  assert.equal(silent, undefined);
});
