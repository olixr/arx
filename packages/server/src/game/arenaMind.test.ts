import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARENAS, AUTHORED_ARENAS, arenaMatchXp, type ArenaMatchDef } from '@arx/content';
import {
  arenaPayFor,
  bankArenaXp,
  freshArenaBank,
  inPit,
  rollMatchPlan,
  scatterSpots,
  stockBark,
  venueAt,
} from './arenaMind.js';

const CARD: ArenaMatchDef = {
  id: 'slate_card',
  name: 'The Slate Card',
  level: 10,
  fee: 50,
  rounds: [
    { entries: [{ npc: 'goblin', count: [2, 3] }] },
    {
      entries: [{ npc: 'goblin_thrower' }],
      pool: { pick: 2, from: [{ npc: 'boar' }, { npc: 'wolf' }, { npc: 'adder' }] },
      props: 3,
    },
    {
      title: 'The Turn',
      entries: [{ npc: 'goblin_champion', crown: true, levelOffset: 2, name: 'Slatejaw' }],
    },
  ],
};

test('SAND MIND: the seed is the soul — bit-equal re-rolls, distinct seeds differ', () => {
  const a = rollMatchPlan(CARD, 4242);
  const b = rollMatchPlan(CARD, 4242);
  assert.deepEqual(a, b);
  // A different soul fields a different sand (the pool round makes
  // collisions astronomically unlikely; the count roll doubly so).
  const c = rollMatchPlan(CARD, 4243);
  assert.notDeepEqual(a, c);
});

test('SAND MIND: the plan honors counts, picks, levels, and the crown', () => {
  const plan = rollMatchPlan(CARD, 777);
  assert.equal(plan.rounds.length, 3);
  const r1 = plan.rounds[0]!;
  assert.ok(r1.bodies.length >= 2 && r1.bodies.length <= 3);
  assert.ok(r1.bodies.every((b) => b.npc === 'goblin' && b.level === 10));
  const r2 = plan.rounds[1]!;
  // One fixed entry + exactly two pool picks, no pick repeated.
  assert.equal(r2.bodies.length, 3);
  const picked = r2.bodies.filter((b) => b.npc !== 'goblin_thrower').map((b) => b.npc);
  assert.equal(new Set(picked).size, 2);
  assert.equal(r2.props, 3);
  const champ = plan.rounds[2]!.bodies[0]!;
  assert.equal(champ.level, 12);
  assert.equal(champ.name, 'Slatejaw');
  assert.ok(typeof champ.crownSeed === 'number');
  // The crown's soul holds across re-rolls of the same seed.
  assert.equal(rollMatchPlan(CARD, 777).rounds[2]!.bodies[0]!.crownSeed, champ.crownSeed);
});

test('SAND MIND: the pit knows its own sand', () => {
  const pit = { x: 100, y: 50, rx: 9, ry: 6 };
  assert.ok(inPit(pit, 100, 50));
  assert.ok(inPit(pit, 108, 50));
  assert.ok(!inPit(pit, 110, 50));
  assert.ok(inPit(pit, 110, 50, 2));
  assert.ok(!inPit(pit, 100, 57));
  assert.ok(inPit(pit, 100, 55.9));
});

test('SAND MIND: scatter spots stand inside the pit, apart, on walkable ground', () => {
  const pit = { x: 0, y: 0, rx: 8, ry: 6 };
  // A wall across the north half: nothing may stand at y < 0.
  const walkable = (_x: number, y: number): boolean => y >= 0;
  const spots = scatterSpots(pit, 6, 99, walkable);
  assert.equal(spots.length, 6);
  for (const s of spots) {
    assert.ok(inPit(pit, s.x, s.y), `(${s.x}, ${s.y}) escaped the sand`);
    assert.ok(s.y >= 0 || (s.x === 0 && s.y === 0), 'stood on the wall');
  }
  assert.deepEqual(spots, scatterSpots(pit, 6, 99, walkable));
});

test('SAND MIND: the bank climbs, never demotes, and lists every rung', () => {
  const bank = freshArenaBank();
  const big = bankArenaXp(bank, 100000);
  assert.ok(bank.rank > 5, 'a hundred thousand marks climbs well clear of the floor');
  assert.deepEqual(
    big.climbed,
    Array.from({ length: bank.rank }, (_, i) => i + 1),
  );
  // A retuned curve (or a hand-set rank) never demotes: xp far below
  // the held rank leaves the rank standing.
  const held = { xp: 0, rank: 30, wins: 0, losses: 0 };
  const none = bankArenaXp(held, 10);
  assert.equal(held.rank, 30);
  assert.deepEqual(none.climbed, []);
});

test('SAND MIND: the pay honors the card and the fallen fraction', () => {
  const full = arenaPayFor(CARD, true);
  assert.equal(full, arenaMatchXp(CARD));
  assert.equal(arenaPayFor(CARD, false), Math.round(full * ARENAS.dials.deathXpFrac));
});

test('SAND MIND: stock barks pick deterministically and stay in the pocket', () => {
  const a = stockBark('round', 4242, 3);
  assert.equal(a, stockBark('round', 4242, 3));
  assert.ok(AUTHORED_ARENAS.barks.round.includes(a));
});

test('SAND MIND: venueAt finds the shipped rings on their own sand', () => {
  const grand = AUTHORED_ARENAS.venues[0]!;
  assert.equal(venueAt(grand.pit.x, grand.pit.y)?.id, grand.id);
  assert.equal(venueAt(grand.pit.x + 200, grand.pit.y), null);
});
