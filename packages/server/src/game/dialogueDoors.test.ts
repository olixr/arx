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

// ---- THE CONTESTED LANDS (docs/contested-lands-plan.md §5 beat 10):
// world:war_near — two standing cores in the watch whose garrisons the
// stances matrix calls hostile to each other.
test('world:war_near reads two hostile garrisons inside the watch, and nothing less', () => {
  const site = (defId: string, x: number, over: Record<string, unknown> = {}) => ({
    site: { defId, anchorX: x, anchorY: 0 },
    clearedAt: null,
    emberUntil: null,
    stage: 0,
    ...over,
  });
  const ask = (rows: Array<[string, unknown]>, sx = 0) => {
    const slate = { poiLedger: new Map(rows), poiThreatens: proto.poiThreatens };
    return (proto.worldFlagAnswer as Fn).call(slate, 'world:war_near' as never, {} as never, sx as never, 0 as never);
  };
  // The Company's bar against a goblin camp: the watch charges the
  // menace and the menace knows an enemy — war, both ways.
  assert.equal(ask([['a', site('bandit_camp', 10)], ['b', site('goblin_warcamp', 40)]]), true);
  // Two goblin camps are kin. One camp is a camp, not a war.
  assert.equal(ask([['a', site('goblin_warcamp', 10)], ['b', site('goblin_warcamp', 40)]]), false);
  assert.equal(ask([['a', site('bandit_camp', 10)]]), false);
  // Past the watch there is no news.
  assert.equal(ask([['a', site('bandit_camp', 10)], ['b', site('goblin_warcamp', 400)]]), false);
  // A cleared trophy or a scattering ember is over.
  assert.equal(ask([['a', site('bandit_camp', 10, { clearedAt: 1 })], ['b', site('goblin_warcamp', 40)]]), false);
  assert.equal(ask([['a', site('bandit_camp', 10)], ['b', site('goblin_warcamp', 40, { emberUntil: 1 })]]), false);
  // A haven has no garrison and menaces nobody.
  assert.equal(ask([['a', site('last_lamp', 10)], ['b', site('goblin_warcamp', 40)]]), false);
  // The husk's changeover (gnoll by day, dead by night) became a war the
  // day band 8 landed the 'dead|gnoll' row (THE HUSK AND THE WARD LINE,
  // plan §5 beat 1): a gnoll squat and a fell barrow inside one watch
  // now read as two garrisons at each other's throats. Nothing north
  // reads war_near this band; the answer is simply true again.
  assert.equal(ask([['a', site('gnoll_squat', 10)], ['b', site('fell_barrow', 40)]]), true);
});
