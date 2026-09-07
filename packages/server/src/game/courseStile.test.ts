import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile, destructibleInfo } from '@arx/shared';
import { COURSE_GAPS } from '@arx/content';
import { GameServer } from './gameServer.js';
import { hitProp, smashPropsInArc } from './melee.js';
import { COURSE_BROKEN, COURSE_GAP_SET, COURSE_REGROW_MS, COURSE_STONE, isCourseGap, setCourseGap } from './courseStile.js';

/**
 * BAND 9e (L4): THE STILE VERB, THE SLOW CIRCLE and THE REVERSE. The
 * north gap at the Sett's lip is the one roster stile; a hand holding a
 * course stone sets it (the stile becomes a wall for everyone, one
 * stone leaves the pack, `course_gap_set` stamps through the flag
 * choke, the stone kit's burst plays, and the gap opens again in ten
 * minutes for everyone); a roster stile with no stone speaks THE RISEN
 * WORD; a crossing stile ignores the stone; a course wall that FALLS to
 * a player's hand (the third blow) stamps `course_broken`, the first
 * does not, an arrow's fell does, an NPC's blow never; a set stone that
 * falls at the gap regrows as the gap.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;
const GAP = COURSE_GAPS[0]!;

function fakeWorld(tiles: Record<string, Tile>) {
  const g = new Map<string, Tile>(Object.entries(tiles));
  return {
    g,
    ensure: () => {},
    groundAt: (x: number, y: number): Tile | undefined => g.get(`${x},${y}`) ?? Tile.Grass,
    setGround: (x: number, y: number, t: Tile): void => {
      g.set(`${x},${y}`, t);
    },
    portalAt: () => undefined,
    builtAt: () => undefined,
  };
}

function slate(tiles: Record<string, Tile>, at: [number, number], stones = 0) {
  const w = fakeWorld(tiles);
  const flags: string[] = [];
  const fx: Array<Record<string, unknown>> = [];
  const spoken: Array<[string, string]> = [];
  const sent: Array<Record<string, unknown>> = [];
  const player = {
    characterId: 5,
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
    flags: new Map<string, number>(),
    inventory: stones > 0 ? [{ item: COURSE_STONE, qty: stones }] : ([] as unknown[]),
  };
  const s = {
    players: new Map<number, unknown>([[1, player]]),
    positions: new Map<number, { plane: string; x: number; y: number }>([[1, { plane: 'surface', x: at[0] + 0.5, y: at[1] + 0.5 }]]),
    worldOf: () => w,
    setWorldTile: (_p: string, x: number, y: number, t: Tile) => w.setGround(x, y, t),
    broadcastFx: (_p: string, f: Record<string, unknown>) => fx.push(f),
    respawnQueue: [] as Array<{ at: number; plane: string; tx: number; ty: number; tile: Tile; over?: Tile }>,
    propDamage: new Map<string, number>(),
    creditDeed: () => {},
    setPlayerFlag: (_pl: unknown, f: string) => flags.push(f),
    speak: (_pl: unknown, word: string, text: string) => spoken.push([word, text]),
    smashProp: proto.smashProp,
    hitProp: proto.hitProp,
    cutWardThread: proto.cutWardThread,
    interact: proto.interact,
  };
  const interact = (eid: number, tx: number, ty: number): void => {
    proto.interact!.call(s, eid, tx, ty);
  };
  return { s, w, flags, fx, spoken, sent, player, interact };
}

const stones = (p: { inventory: unknown[] }): number =>
  (p.inventory as Array<{ item: string; qty: number } | null>).reduce((n, sl) => n + (sl?.item === COURSE_STONE ? sl.qty : 0), 0);

test('THE ROSTER: the north gap alone, on the surface', () => {
  assert.deepEqual(COURSE_GAPS, [[169, 267]]);
  assert.equal(isCourseGap('surface' as never, 169, 267), true);
  assert.equal(isCourseGap('surface' as never, 160, 287), false, "Vorl's stile is a crossing");
  assert.equal(isCourseGap('surface' as never, 157, 267), false, "the head run's stile is a crossing");
  assert.equal(isCourseGap('rift:1' as never, 169, 267), false, 'the roster is the surface\'s');
});

test('THE SET: a stone in the pack sets the gap for everyone, stamps the flag, plays the stone burst, and queues the stile back in ten minutes', () => {
  const { s, w, flags, fx, spoken, sent, player, interact } = slate({ [`${GAP[0]},${GAP[1]}`]: Tile.CourseStile }, [GAP[0], GAP[1] + 1], 2);
  const before = Date.now();
  interact(1, GAP[0], GAP[1]);
  assert.equal(w.groundAt(GAP[0], GAP[1]), Tile.CourseWall, 'the gap is set: a course stands for everyone');
  assert.equal(stones(player), 1, 'one stone left the pack');
  assert.ok(sent.some((m) => m.t === 'inv'), 'the pack is sent');
  assert.deepEqual(flags, [COURSE_GAP_SET], 'the flag stamps through the choke (the quest objective credits itself there)');
  assert.deepEqual(spoken, [], 'nothing said: the stone is the word');
  assert.equal(fx.length, 1);
  assert.equal(fx[0]!.kind, 'smash');
  assert.equal(fx[0]!.id, 'stone', "the stone kit's burst, no new effect");
  assert.equal(fx[0]!.radius, 0);
  // THE SLOW CIRCLE: the named tile, the stile, over the wall it left.
  assert.equal(s.respawnQueue.length, 1);
  const e = s.respawnQueue[0]!;
  assert.equal(e.tile, Tile.CourseStile, 'the gap opens again');
  assert.equal(e.over, Tile.CourseWall, 'only over the set stone');
  assert.equal(COURSE_REGROW_MS, 600_000, 'ten minutes, the thread\'s own span');
  assert.ok(Math.abs(e.at - (before + COURSE_REGROW_MS)) < 2_000);
  assert.deepEqual([e.tx, e.ty], [GAP[0], GAP[1]]);
  // A second touch on the set course is nothing: the gap is a wall now.
  interact(1, GAP[0], GAP[1]);
  assert.equal(stones(player), 1);
  assert.equal(flags.length, 1);
});

test('THE SET: a roster stile with no stone in the pack speaks the risen word and moves nothing', () => {
  const { w, flags, fx, spoken, interact } = slate({ [`${GAP[0]},${GAP[1]}`]: Tile.CourseStile }, [GAP[0], GAP[1] + 1], 0);
  interact(1, GAP[0], GAP[1]);
  assert.equal(w.groundAt(GAP[0], GAP[1]), Tile.CourseStile, 'the gap stands');
  assert.deepEqual(spoken, [['Unset', 'The gap wants a stone.']]);
  assert.deepEqual(flags, []);
  assert.deepEqual(fx, []);
});

test('THE ROSTER: a stone at a crossing stile (Vorl\'s, or any on the Course) does nothing and consumes nothing', () => {
  const { w, flags, fx, spoken, player, interact } = slate({ '160,287': Tile.CourseStile }, [160, 288], 2);
  interact(1, 160, 287);
  assert.equal(w.groundAt(160, 287), Tile.CourseStile, 'a crossing stays a crossing');
  assert.equal(stones(player), 2, 'nothing consumed');
  assert.deepEqual(flags, []);
  assert.deepEqual(fx, []);
  assert.deepEqual(spoken, [], 'and nothing said: a stile is a low place a body walks over');
  // The module verb says so too: not the verb's tile.
  const { s: s2, player: p2 } = slate({ '160,287': Tile.CourseStile }, [160, 288], 1);
  assert.equal(setCourseGap(s2 as never, p2 as never, 'surface' as never, 160, 287, 0), false);
  assert.equal(setCourseGap(s2 as never, p2 as never, 'surface' as never, 161, 287, 0), false, 'not a stile at all');
});

test('THE REVERSE: the third blow on a course wall stamps course_broken; the first and second only chip it', () => {
  const { s, w, flags, fx, player } = slate({ '11,10': Tile.CourseWall, '11,11': Tile.Dirt }, [10, 10]);
  const info = destructibleInfo(Tile.CourseWall)!;
  assert.deepEqual(info, { kind: 'stone', respawnSec: 600, hits: 3 }, 'the shared table: stone x3');
  const pos = { plane: 'surface' as never, x: 10.5, y: 10.5 };
  smashPropsInArc(s as never, pos, 0, 2.5, Math.PI / 3, player as never);
  assert.equal(w.groundAt(11, 10), Tile.CourseWall, 'chipped, standing');
  assert.deepEqual(flags, [], 'the first blow stamps nothing');
  smashPropsInArc(s as never, pos, 0, 2.5, Math.PI / 3, player as never);
  assert.deepEqual(flags, [], 'nor the second');
  smashPropsInArc(s as never, pos, 0, 2.5, Math.PI / 3, player as never);
  assert.equal(w.groundAt(11, 10), Tile.Dirt, 'the third fells it');
  assert.deepEqual(flags, [COURSE_BROKEN], 'and stamps the hand, forever');
  assert.equal(fx.filter((f) => f.radius === 0).length, 1, 'one burst');
  // The wall stands back up in ten minutes as a WALL: this is no gap.
  const e = s.respawnQueue[0]!;
  assert.equal(e.tile, Tile.CourseWall);
  assert.equal(e.over, Tile.Dirt);
});

test("THE REVERSE: an arrow's fell stamps it too (hitProp with the shot's owner), and a plumb stone counts as a course", () => {
  const { s, w, flags, player } = slate({ '11,10': Tile.PlumbStone, '11,11': Tile.Grass }, [10, 10]);
  const info = destructibleInfo(Tile.PlumbStone)!;
  for (let k = 0; k < 3; k++) hitProp(s as never, 'surface' as never, 11, 10, Tile.PlumbStone, info, 0, player as never);
  assert.equal(w.groundAt(11, 10), Tile.Grass);
  assert.deepEqual(flags, [COURSE_BROKEN]);
});

test("THE REVERSE: an NPC's hand never stamps it (no player on the blow), and a barrel stamps nobody", () => {
  const { s, w, flags, player } = slate({ '11,10': Tile.CourseWall, '11,11': Tile.Dirt, '12,10': Tile.Barrel }, [10, 10]);
  const pos = { plane: 'surface' as never, x: 10.5, y: 10.5 };
  for (let k = 0; k < 3; k++) smashPropsInArc(s as never, pos, 0, 2.5);
  assert.equal(w.groundAt(11, 10), Tile.Dirt, 'the wall fell');
  assert.deepEqual(flags, [], 'to no hand');
  // A player's swing through a barrel alone stamps nothing.
  const { s: s2, flags: f2, player: p2 } = slate({ '12,10': Tile.Barrel }, [10, 10]);
  void player;
  for (let k = 0; k < 3; k++) smashPropsInArc(s2 as never, pos, 0, 2.5, Math.PI / 3, p2 as never);
  assert.deepEqual(f2, []);
});

test('THE SLOW CIRCLE holds under a blow: a set stone that falls AT the gap regrows as the stile, never as a wall', () => {
  const { s, w, flags, player, interact } = slate({ [`${GAP[0]},${GAP[1]}`]: Tile.CourseStile, [`${GAP[0]},${GAP[1] + 1}`]: Tile.Dirt }, [GAP[0], GAP[1] + 1], 1);
  interact(1, GAP[0], GAP[1]);
  assert.equal(w.groundAt(GAP[0], GAP[1]), Tile.CourseWall);
  const pos = { plane: 'surface' as never, x: GAP[0] + 0.5, y: GAP[1] + 1.5 };
  for (let k = 0; k < 3; k++) smashPropsInArc(s as never, pos, -Math.PI / 2, 2.5, Math.PI / 3, player as never);
  assert.equal(w.groundAt(GAP[0], GAP[1]), Tile.Dirt, 'the set stone fell');
  assert.deepEqual(flags, [COURSE_GAP_SET, COURSE_BROKEN]);
  const smash = s.respawnQueue.find((e) => e.over === Tile.Dirt)!;
  assert.equal(smash.tile, Tile.CourseStile, 'the smash regrows the GAP, not a wall');
  const set = s.respawnQueue.find((e) => e.over === Tile.CourseWall)!;
  assert.equal(set.tile, Tile.CourseStile, "the set's own entry stands too and lets go when the ground has moved on");
});
