import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Detail, TILE_DEFS, TILE_SKIP, Tile } from '@arx/shared';
import { buildPicket, buildTurnoff, buildWardthread } from './wardthread.js';
import {
  buildPicketWithRegistry,
  buildTurnoffWithRegistry,
  buildWardthreadWithRegistry,
} from './wardthread/index.js';
import {
  bedUntouched,
  benchUnused,
  blightUnderGloom,
  boxOverlaps,
  emberBedsOffAsh,
  loopClear,
  occlusionViolations,
  oneLine,
  padClear,
  shoulderListed,
  signPairViolations,
  skipRing,
  snagRing,
  stonesOutsideHaven,
  thresholdStake,
  unreachableFloor,
  wolfClear,
} from './wardthread/lint.js';
import { PINS } from './wardthread/pins.js';
import { bedAt, roadAt } from './wardthread/ctx.js';
import { footprintViolations } from './lint/footprint.js';
import { zonePlacementErrors } from './validateZone.js';
import { zoneFromJson, zoneToJson } from './serialize.js';
import { ROAD_SHOULDER, TRAIL_HALF } from '../geography.js';
import { POI_DEFS } from '../pois/defs.js';
import { TOWN_SPAWNS } from '../npcs.js';

/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8; rulings G1-G6,
 * blockout §2.3, §2.6, §2.7, §2.8, §3.2): the three north patches in
 * one module. The ward line across the road at the fork with its
 * three grey points, its dead rings, the root, Bodil's cut and the
 * wolves on the thread; Torsten's picket on the trail's east shoulder
 * with THE TALLY; the cairn that fell at the turn. Every number is the
 * brief's as the tape measured it (wardthread/pins.ts says where the
 * two disagreed and why the tape won).
 */
type Zone = ReturnType<typeof buildWardthread>;
const count = (z: Zone, t: Tile): number => {
  let n = 0;
  for (const g of z.ground) if (g === t) n++;
  return n;
};
const at = (z: Zone, x: number, y: number): number =>
  z.ground[(y - z.origin.y) * z.width + (x - z.origin.x)]!;
const detail = (z: Zone, x: number, y: number): number =>
  z.detail[(y - z.origin.y) * z.width + (x - z.origin.x)]!;

test('wardthread: THE MEASURED RECTS and the empty rosters', () => {
  const w = buildWardthread();
  const p = buildPicket();
  const t = buildTurnoff();
  assert.deepEqual([w.id, w.name], ['wardthread', 'The Ward Line']);
  assert.deepEqual([p.id, p.name], ['picket', 'The Picket']);
  assert.deepEqual([t.id, t.name], ['turnoff', 'The Turn']);
  // The ward line grew south to the road's shoulder and east to the
  // tarn's rim so its fell pockets reach the trunks that painted over
  // the head stone; the picket grew two rows south for the same law;
  // the turn is as drawn (pins.ts).
  assert.deepEqual({ x: w.origin.x, y: w.origin.y, w: w.width, h: w.height }, { x: -164, y: -203, w: 37, h: 25 });
  assert.deepEqual({ x: p.origin.x, y: p.origin.y, w: p.width, h: p.height }, { x: -131, y: -140, w: 24, h: 26 });
  assert.deepEqual({ x: t.origin.x, y: t.origin.y, w: t.width, h: t.height }, { x: -80, y: -182, w: 14, h: 16 });
  for (const z of [w, p, t]) {
    assert.equal(z.growth, 'wild');
    assert.equal(z.spawn, undefined, 'no core, no spawn');
    assert.equal(z.chests, undefined, 'no chest');
    assert.deepEqual(z.portals ?? [], [], 'no door');
  }
  assert.deepEqual(p.spawns ?? [], [], 'the picket seats nobody');
  assert.deepEqual(p.actorSpawns ?? [], [], 'the picket places no body: Torsten walks down from the fork');
  assert.deepEqual(t.spawns ?? [], []);
  assert.deepEqual(t.actorSpawns ?? [], []);
  assert.deepEqual(w.signs ?? [], [], 'the Court letters nothing; the Charter\'s post is a post');
  assert.deepEqual(t.signs ?? [], [], 'the turn has no board');
});

test('wardthread: THE LINE is one line of 28 tiles, an L with two ends, and the three grey points sit on its corners', () => {
  const z = buildWardthread();
  assert.equal(count(z, Tile.WardThread), 28);
  assert.equal(count(z, Tile.GloomStone), 3);
  assert.equal(count(z, Tile.CreepRoot), 1);
  assert.equal(count(z, Tile.DeadTree), 11, 'nine in the rings and the cut\'s two snags');
  // The south leg y -184 from x -136 to the corner at -150, the west
  // leg x -150 from -185 to -197.
  for (let x = -136; x >= -150; x--) assert.equal(at(z, x, -184), Tile.WardThread, `south leg (${x},-184)`);
  for (let y = -185; y >= -197; y--) assert.equal(at(z, -150, y), Tile.WardThread, `west leg (-150,${y})`);
  // The head stone by the road, the corner stone one west of the
  // turn, the end stone where the wood gives out, the root two past it.
  for (const s of PINS.STONES) assert.equal(at(z, s.at[0], s.at[1]), Tile.GloomStone, s.id);
  assert.deepEqual(PINS.STONES.map((s) => s.at), [[-135, -184], [-151, -184], [-150, -198]]);
  assert.equal(at(z, -150, -200), Tile.CreepRoot, 'the root, unexplained');
  for (const s of PINS.STONES) for (const [x, y] of s.ring) assert.equal(at(z, x, y), Tile.DeadTree, `${s.id} ring (${x},${y})`);
  // The bruise on every gloom tile's own cell; nothing under the thread (G5).
  for (const s of PINS.STONES) assert.equal(detail(z, s.at[0], s.at[1]), Detail.BlightVeins);
  assert.equal(detail(z, -150, -200), Detail.BlightVeins);
  assert.equal(detail(z, -140, -184), 0, 'the thread runs over the floor as found');
  // WardThread is walkable and carries no light row: stepping over is free.
  assert.equal(TILE_DEFS[Tile.WardThread].solid, false);
});

test('wardthread: THE LICENSED CUT — the post, the rope, the face, the two past the thread, the camp, the clamp', () => {
  const z = buildWardthread();
  assert.equal(at(z, -158, -186), Tile.CharterPost, 'lot forty one');
  assert.equal(count(z, Tile.RailWood), 4, 'the rope');
  assert.equal(count(z, Tile.Stump), 6, 'four at the face, two past the thread');
  for (const [x, y] of PINS.FACE_STUMPS) assert.equal(at(z, x, y), Tile.Stump);
  for (const [x, y] of PINS.PAST_STUMPS) assert.equal(at(z, x, y), Tile.Stump);
  // The furrows cross the thread and the thread is whole.
  for (const [x, y] of PINS.FURROWS) assert.equal(detail(z, x, y), Detail.DragFurrow);
  assert.equal(at(z, -150, -188), Tile.WardThread);
  assert.equal(at(z, -150, -191), Tile.WardThread);
  assert.equal(count(z, Tile.Sawhorse), 1);
  assert.equal(count(z, Tile.FelledLog), 2);
  assert.equal(count(z, Tile.LumberRack), 1);
  assert.equal(count(z, Tile.LeanTo), 1);
  // THE CREW'S THREE BEDS (band 8 fix pass): Bodil's under the canvas
  // and one per feller where the Bedrolls lay (a Bedroll is no seat
  // kind, so a lie stop aimed at one stood the body up; the audit
  // found both fellers sitting on the ground). SLEEPER STAYS IN BED.
  assert.equal(count(z, Tile.Bed), 3, 'Bodil\'s bed under the canvas and the fellers\' two frames');
  assert.equal(count(z, Tile.Bedroll), 0, 'the declared wayside lies retired: each feller has a frame');
  for (const [x, y] of PINS.CAMP.beds) assert.equal(at(z, x, y), Tile.Bed, `a feller's bed at (${x},${y})`);
  assert.equal(at(z, PINS.CAMP.bed[0], PINS.CAMP.bed[1]), Tile.Bed, 'Bodil\'s');
  assert.equal(count(z, Tile.Campfire), 1);
  assert.equal(count(z, Tile.EmberBed), 1, 'the crew\'s clamp');
  // E5: the canvas's second foot is WEST and open, trodden bare.
  assert.equal(at(z, -160, -190), Tile.Dirt);
  assert.equal(at(z, -159, -190), Tile.LeanTo);
  // Cut to the thread, one tile from it: every face stump stands one
  // or two columns west of the west leg and never on it.
  for (const [x] of PINS.FACE_STUMPS) assert.ok(x === -151 || x === -152);
});

test('wardthread: THE THREE BODIES AND THE ONE ROW — Bodil, two fellers, the wolves on the south leg', () => {
  const z = buildWardthread();
  // Bodil faces north into her sawhorse (y grows south; the brief's
  // "facing south" faced her away from it), the fellers face east
  // into the wood and along the trunk.
  assert.deepEqual(z.actorSpawns, [
    { actor: 'charter_bodil', x: -152.5, y: -187.5, dir: -Math.PI / 2, routine: 'bodil_cut' },
    { actor: 'charter_feller', x: -150.5, y: -189.5, dir: 0, routine: 'feller_cut' },
    { actor: 'charter_feller', x: -152.5, y: -192.5, dir: 0, routine: 'feller_trunk_cut' },
  ]);
  // Every body stands on trodden ground, never on a prop.
  for (const a of z.actorSpawns!) assert.equal(at(z, Math.floor(a.x), Math.floor(a.y)), Tile.Dirt);
  // The wolf row through the A7 passthrough: tribe, hours, patrol, and
  // THE COUNTED PACK's word (band 8 fix pass): the pair is passive, so
  // the dusk stand watches them pass instead of fighting them.
  assert.deepEqual(z.spawns, [
    {
      npc: 'wolf',
      x: -141,
      y: -184,
      radius: 2,
      count: 2,
      tribe: 'predators',
      passive: true,
      hours: { from: 19, to: 6 },
      patrol: [
        { x: -136, y: -184, dwell: 15 },
        { x: -146, y: -184, dwell: 10 },
      ],
    },
  ]);
  // The seat and both stops are thread tiles: the pack's two walk the line itself.
  for (const [x, y] of [[-141, -184], [-136, -184], [-146, -184]] as const) assert.equal(at(z, x, y), Tile.WardThread);
});

test('wardthread: THE FLOODS run clean on the ward line', () => {
  const { zone: z, registry } = buildWardthreadWithRegistry();
  assert.deepEqual(unreachableFloor(z, PINS.WARDTHREAD_FLOOD_FROM), [], 'sealed pockets');
  assert.deepEqual(occlusionViolations(z, registry), [], 'the occlusion law');
  assert.deepEqual(signPairViolations(z), [], 'one Signpost per eyeful');
  assert.deepEqual(boxOverlaps(registry), [], 'scene boxes overlap');
  assert.deepEqual(emberBedsOffAsh(z), [], 'K1: the clamp sits in its ash');
  assert.deepEqual(skipRing(z), [], 'the border ring is the field\'s; no edge profile');
  assert.deepEqual(bedUntouched(z), [], 'no authored cell on the High Road\'s bed');
  assert.deepEqual(shoulderListed(z, PINS.WARDTHREAD_SHOULDER_LISTED), [], 'every shoulder cell is listed');
  assert.deepEqual(padClear(z), [], 'G-12: no pinned footprint inside the pad');
  assert.deepEqual(oneLine(z, PINS.LINE_TILES), [], 'the thread is one line');
  assert.deepEqual(blightUnderGloom(z), [], 'the bruise only round the grey');
  assert.deepEqual(stonesOutsideHaven(z, PINS.HAVEN), [], 'nothing grey inside the haven');
  assert.deepEqual(snagRing(z), [], 'three dead round each stone');
  assert.deepEqual(loopClear(z, PINS.AT_POSTS, PINS.FORK_FOOTPRINT), [], 'the wolves keep off the rest');
  assert.deepEqual(footprintViolations(z), [], 'E5: the canvas\'s second foot');
  assert.deepEqual(zonePlacementErrors(z), [], 'the placement vet');
  // The fells are the trunk law's ledger: six pockets, each owned.
  assert.deepEqual(registry.fells.map((f) => f.owner), [
    'cut: THE LOT',
    'cut: THE WAINS\' APPROACH',
    'line: THE REST\'S FIREWOOD',
    'stones: THE HEAD STONE\'S CLEARING',
    'stones: THE CORNER STONE\'S CLEARING',
    'stones: THE END STONE\'S CLEARING',
  ]);
  // The measured distances the brief argues from: the nearest thread
  // tile to the haven's centre is 19.0; the corner stone 5.48 from
  // the wandered carve; the head stone 7.62.
  assert.ok(Math.hypot(-149 + 150, -184 + 165) > 18);
  assert.ok(Math.abs(roadAt(-151, -184) - 5.48) < 0.05);
  assert.ok(Math.abs(roadAt(-135, -184) - 7.62) < 0.05);
  // The haven's number is the def's, not a memory.
  assert.equal(POI_DEFS.get('fork_waystation')!.haven!.safeR, PINS.HAVEN.r);
});

test('picket: THE TALLY on the east shoulder — two lamps, the slate, the bell, the bench, four mounds, the rag on the ring', () => {
  const z = buildPicket();
  assert.equal(count(z, Tile.LampPost), 2);
  assert.equal(count(z, Tile.Signpost), 1);
  assert.equal(count(z, Tile.TownBell), 1);
  assert.equal(count(z, Tile.StoneBench), 1);
  assert.equal(count(z, Tile.GraveMound), 4);
  assert.equal(count(z, Tile.RedRagStake), 1);
  for (const [x, y] of PINS.LAMPS) assert.equal(at(z, x, y), Tile.LampPost);
  assert.equal(at(z, -117, -126), Tile.Signpost);
  assert.equal(at(z, -116, -129), Tile.TownBell);
  assert.equal(at(z, -116, -125), Tile.StoneBench, 'two rows north of the brief\'s letter (pins.ts: the border oak\'s crown)');
  for (const [x, y] of PINS.MOUNDS) assert.equal(at(z, x, y), Tile.GraveMound);
  assert.equal(at(z, -122, -135), Tile.RedRagStake, 'on the ring, beside the second mound, on the scuff side');
  // THE TALLY, moved verbatim from the fork's second board.
  assert.deepEqual(z.signs, [
    {
      x: -117,
      y: -126,
      title: 'THE TALLY',
      lines: ['gnolls eleven. wolves seven', 'ours three', 'the three has a line through it'],
    },
  ]);
  // Torsten's chalking stand and the bench's stand are open trodden ground.
  assert.equal(at(z, -118, -126), Tile.Dirt);
  assert.equal(at(z, -117, -125), Tile.Dirt);
  // The lamps stand on the shoulder, listed, never on the trail's bed
  // (a trail's bed is TRAIL_HALF wide).
  for (const [x, y] of PINS.LAMPS) {
    assert.ok(roadAt(x, y) > TRAIL_HALF && roadAt(x, y) <= ROAD_SHOULDER, `lamp (${x},${y}) at ${roadAt(x, y).toFixed(2)}`);
  }
  // The trail's bed inside the rect is the field's own on both planes.
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (bedAt(x, y)) {
        assert.equal(z.ground[ly * z.width + lx], TILE_SKIP, `bed (${x},${y})`);
        assert.equal(z.detail[ly * z.width + lx], 0);
      }
    }
  }
});

test('picket: THE FLOODS run clean, the rag is on the 192 ring, the bench is unused, the wolves\' ground is untouched', () => {
  const { zone: z, registry } = buildPicketWithRegistry();
  assert.deepEqual(unreachableFloor(z, PINS.PICKET_FLOOD_FROM), []);
  assert.deepEqual(occlusionViolations(z, registry), []);
  assert.deepEqual(signPairViolations(z), []);
  assert.deepEqual(boxOverlaps(registry), []);
  assert.deepEqual(skipRing(z), []);
  assert.deepEqual(bedUntouched(z), []);
  assert.deepEqual(shoulderListed(z, PINS.PICKET_SHOULDER_LISTED), []);
  assert.deepEqual(padClear(z), []);
  assert.deepEqual(thresholdStake(z, PINS.THRESHOLD), [], 'the threshold marked with a stake and nothing more');
  assert.deepEqual(benchUnused(z, PINS.BENCH), [], 'nobody sits on it');
  assert.deepEqual(footprintViolations(z), []);
  assert.deepEqual(zonePlacementErrors(z), []);
  // The three wolf pins are TOWN_SPAWNS' own, never a memory; every
  // authored cell keeps WOLF_CLEAR from them and the centre 40.
  const shipped = TOWN_SPAWNS.filter((s) => (s.npc === 'wolf' || s.npc === 'dire_wolf') && s.y < -60).map((s) => [s.x, s.y]);
  assert.deepEqual(shipped, PINS.WOLF_PINS.map((p) => [...p]));
  assert.deepEqual(
    wolfClear(z, PINS.WOLF_PINS, PINS.WOLF_CLEAR, [PINS.POST_WEAR.cx, PINS.POST_WEAR.cy], PINS.WOLF_CLEAR_CENTRE),
    [],
  );
  // The ring's arithmetic: the rag reads 192.0, the brief's north head
  // 197.3 (why the tape moved it).
  assert.ok(Math.abs(Math.hypot(-122 + 64, -135 - 48) - 192) < 0.1);
  assert.ok(Math.hypot(-124 + 64, -140 - 48) > 197);
  // The fells: the mounds' row and the south pocket, trees only.
  assert.deepEqual(registry.fells.map((f) => f.owner), ['picket: THE MOUNDS\' ROW', 'picket: THE SOUTH POCKET']);
});

test('turnoff: two tiles and nothing else', () => {
  const { zone: z, registry } = buildTurnoffWithRegistry();
  assert.equal(at(z, -73, -172), Tile.CairnFallen);
  assert.equal(at(z, -70, -179), Tile.DeadTree);
  let authored = 0;
  for (const g of z.ground) if (g !== TILE_SKIP) authored++;
  assert.equal(authored, 2, 'nothing else stands in the rect');
  assert.equal(z.detail.every((d) => d === 0), true, 'no detail');
  assert.equal(TILE_DEFS[Tile.CairnFallen].solid, false, 'a walker can stand in the fallen cairn');
  assert.deepEqual(unreachableFloor(z, PINS.TURNOFF_FLOOD_FROM), []);
  assert.deepEqual(occlusionViolations(z, registry), []);
  assert.deepEqual(skipRing(z), []);
  assert.deepEqual(bedUntouched(z), []);
  assert.deepEqual(shoulderListed(z, PINS.TURNOFF_SHOULDER_LISTED), []);
  assert.deepEqual(padClear(z), []);
  assert.deepEqual(zonePlacementErrors(z), []);
  assert.deepEqual(registry.fells, [], 'no trunk stood in the rect at this seed; nothing felled');
  // The cairn on the shoulder (3.84), the snag eleven rows off the bed.
  assert.ok(Math.abs(roadAt(-73, -172) - 3.84) < 0.05);
  assert.ok(roadAt(-70, -179) > 10);
});

test('wardthread: byte-identical across two builds and through JSON, all three', () => {
  for (const build of [buildWardthread, buildPicket, buildTurnoff]) {
    const a = build();
    const b = build();
    assert.deepEqual(a, b);
    const round = zoneFromJson(JSON.parse(JSON.stringify(zoneToJson(a))));
    assert.deepEqual(round.ground, a.ground);
    assert.deepEqual(round.detail, a.detail);
    // JSON keeps an absent roster absent (the builder's empty list
    // reads back as no key), so the three rosters compare as lists.
    assert.deepEqual(round.spawns ?? [], a.spawns ?? [], 'the wolf row round-trips whole');
    assert.deepEqual(round.actorSpawns ?? [], a.actorSpawns ?? []);
    assert.deepEqual(round.signs ?? [], a.signs ?? []);
  }
});
