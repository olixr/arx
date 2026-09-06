import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Detail, TILE_DEFS, TILE_SKIP, Tile } from '@arx/shared';
import { buildSett } from './sett.js';
import { buildSettWithRegistry } from './sett/index.js';
import {
  boxOverlaps,
  chalkNoLattice,
  emberBedsOffAsh,
  floorPainted,
  keepOut,
  lightsCensus,
  noTimber,
  occlusionViolations,
  oneLoop,
  padClear,
  plugUnwalked,
  postStands,
  rimIsCliff,
  signPairViolations,
  skipRing,
  stairsExact,
  stileNotAtJunction,
  unreachableFloor,
  wetFloorLevel,
  yardSealed,
} from './sett/lint.js';
import { PINS } from './sett/pins.js';
import { fieldLevel, frameLevel } from './sett/ctx.js';
import { footprintViolations } from './lint/footprint.js';
import { validateZone, zonePlacementErrors } from './validateZone.js';
import { zoneFromJson, zoneToJson } from './serialize.js';
import { WET_STANDERS_KIT } from './sett/kit.js';

/**
 * THE SETT (contested lands, band 9d; rulings R-A..R-H; band9d/
 * blockout.md §1-§4, §7): the Dolmen's quarry bowl at cell [1,2], the
 * first sunk authored zone. Every number is the brief's as the ground
 * measured it (maps/sett/pins.ts says where the two disagreed and why
 * the ground won: the yard's courses run to the rim, C2 and one rubble
 * moved off the core's rim).
 */
type Zone = ReturnType<typeof buildSett>;
const count = (z: Zone, t: Tile): number => {
  let n = 0;
  for (const g of z.ground) if (g === t) n++;
  return n;
};
const dcount = (z: Zone, d: Detail): number => {
  let n = 0;
  for (const g of z.detail) if (g === d) n++;
  return n;
};
const at = (z: Zone, x: number, y: number): number =>
  z.ground[(y - z.origin.y) * z.width + (x - z.origin.x)]!;
const detail = (z: Zone, x: number, y: number): number =>
  z.detail[(y - z.origin.y) * z.width + (x - z.origin.x)]!;
const lvl = (z: Zone, x: number, y: number): number =>
  z.elev![(y - z.origin.y) * z.width + (x - z.origin.x)]!;
const E = 0;
const S = Math.PI / 2;
const W = Math.PI;
const N = -Math.PI / 2;

test('sett: THE RECT and the empty rosters — sunk, wild, spawnless, chestless, boardless', () => {
  const z = buildSett();
  assert.deepEqual([z.id, z.name], ['sett', 'The Sett']);
  assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, { x: 150, y: 265, w: 50, h: 74 });
  assert.equal(z.growth, 'wild');
  assert.equal(z.spawn, undefined, 'no spawn: a Sett spawn would be a respawn hearth (R-D)');
  assert.deepEqual(z.reachFrom, { x: 172, y: 266 }, 'THE REACH ANCHOR on the lip (E2)');
  assert.equal(z.chests, undefined, 'no chest (R-E)');
  assert.deepEqual(z.portals ?? [], [], 'no door');
  assert.deepEqual(z.signs ?? [], [], 'no board: the Dolmen keep a count and say it');
  assert.equal(count(z, Tile.Signpost) + count(z, Tile.HangingSign), 0);
  assert.ok(z.elev !== undefined, 'the first sunk authored zone carries a level layer');
});

test('sett: THE SHAPE IS READ, NOT DRAWN — the −1 ring is 1,532 + E1\'s three, the −2 core 325, every rim Cliff or a tread, six treads exactly', () => {
  const { zone: z, registry } = buildSettWithRegistry();
  let m1 = 0;
  let m2 = 0;
  let other = 0;
  for (const e of z.elev!) {
    if (e === -1) m1++;
    else if (e === -2) m2++;
    else if (e !== 0) other++;
  }
  // Both counts are read off the same worldgen mask the zone stamps
  // (sett-ground.txt §A: −1 ring 1,532, −2 core 325), so the pin is
  // the ground's; E1 adds three to the ring.
  assert.equal(m1, 1532 + 3, 'the −1 ring with E1');
  assert.equal(m2, 325, 'the −2 core');
  assert.equal(other, 0, 'nothing raised, nothing deeper');
  assert.deepEqual(registry.mask.sunk, { '-1': 1535, '-2': 325 });
  assert.deepEqual(registry.mask.edits, [PINS.E1_THE_LIP.why]);
  // E1: worldgen had the three at level 0 (rim rock); the zone sinks them.
  for (const [x, y] of PINS.E1_THE_LIP.cells) {
    assert.equal(fieldLevel(x, y), 0, `worldgen's (${x},${y}) is level 0`);
    assert.equal(lvl(z, x, y), -1, `E1 sinks (${x},${y})`);
  }
  // The rim: 220 level-0 cells and 86 −1 cells (worldgen's own Cliff
  // at 303 of them), less the six treads = 300 Cliff.
  assert.equal(registry.mask.rim, 306);
  assert.equal(count(z, Tile.Cliff), 300);
  assert.equal(count(z, Tile.Ramp), 6);
  assert.deepEqual(stairsExact(z, PINS.STAIRS), [], 'exactly six treads at the listed cells');
  assert.deepEqual(PINS.STAIRS, [[171, 268], [172, 268], [173, 268], [174, 285], [175, 285], [176, 285]]);
  for (const [x, y] of PINS.STAIRS_NORTH) {
    assert.equal(lvl(z, x, y), 0, 'the north flight stands on the lip');
    assert.equal(lvl(z, x, y + 1), -1, 'and comes down to the ring');
  }
  for (const [x, y] of PINS.STAIRS_CORE) {
    assert.equal(lvl(z, x, y), -1, 'the core steps stand on the ring');
    assert.equal(lvl(z, x, y + 1), -2, 'and come down to the floor');
  }
  assert.deepEqual(floorPainted(z, (x, y) => frameLevel(PINS.SETT, x, y)), [], 'every sunk cell is painted at its own level');
  assert.deepEqual(rimIsCliff(z), [], 'every rim is Cliff or a tread; every Cliff fences');
  // The builder found nothing to fence: the mask painted every rim
  // itself, so the studio gate's replay adds nothing.
  const vet = validateZone(z);
  assert.equal(vet.ok, true, vet.error);
  assert.equal(vet.fenceAdded, 0, 'the mask painted every fence verbatim');
  // The ring and the two-tile apron are flat (the builder's border law).
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      if (lx < 2 || ly < 2 || lx >= z.width - 2 || ly >= z.height - 2) assert.equal(z.elev![ly * z.width + lx], 0);
    }
  }
});

test('sett: THE ELEVATION ROUND-TRIP — the level layer, the anchor and the rosters survive JSON and replay through the gate', () => {
  const z = buildSett();
  const round = zoneFromJson(JSON.parse(JSON.stringify(zoneToJson(z))));
  assert.deepEqual(round.ground, z.ground);
  assert.deepEqual(round.detail, z.detail);
  assert.deepEqual(round.elev, z.elev, 'the sunk levels ride the wire byte-exact');
  assert.deepEqual(round.reachFrom, z.reachFrom, 'the reach anchor rides with them');
  assert.equal(round.spawn, undefined);
  assert.deepEqual(round.spawns ?? [], z.spawns ?? [], 'Vorl\'s row round-trips whole');
  assert.deepEqual(round.actorSpawns ?? [], z.actorSpawns ?? []);
  const vet = validateZone(round);
  assert.equal(vet.ok, true, vet.error);
  // Paint over a tread and the replay refuses the sealed bowl at the anchor.
  const sealed = { ...round, ground: new Uint16Array(round.ground) };
  for (const [x, y] of PINS.STAIRS_NORTH) sealed.ground[(y - z.origin.y) * z.width + (x - z.origin.x)] = Tile.Cliff;
  const shut = validateZone(sealed);
  assert.equal(shut.ok, false, 'a bowl with no way down is refused');
  assert.ok((shut.error ?? '').includes('reachFrom'), shut.error);
});

test('sett: S1 THE HEAD — the run from the gap to the seam, the stile at twelve, P0 the threshold, the chalk, the furrows, the crown', () => {
  const { zone: z, registry } = buildSettWithRegistry();
  const { HEAD, SEAM } = PINS;
  assert.equal(at(z, HEAD.GAP[0], HEAD.GAP[1]), Tile.CourseStile, 'THE NORTH GAP');
  for (let x = 158; x <= 168; x++) assert.equal(at(z, x, 267), Tile.CourseWall, `the head run (${x},267)`);
  assert.equal(at(z, 157, 267), Tile.CourseStile, 'the stile twelve from the gap');
  for (let x = 151; x <= 156; x++) assert.equal(at(z, x, 267), Tile.CourseWall, `the head run (${x},267)`);
  assert.equal(at(z, SEAM[0], SEAM[1]), Tile.CourseWall, 'THE SEAM CELL under the exemption');
  assert.equal(at(z, HEAD.P0[0], HEAD.P0[1]), Tile.PlumbStone, 'P0 the threshold, one east of the crown');
  for (let x = 170; x <= 174; x++) assert.equal(at(z, x, 267), Tile.Dirt, 'the stair crown');
  assert.equal(at(z, 172, 266), Tile.Dirt, 'the approach');
  for (const [x, y] of HEAD.C1) assert.equal(detail(z, x, y), Detail.Chalkline, `C1 (${x},${y})`);
  for (const [x, y] of HEAD.FURROWS) assert.equal(detail(z, x, y), Detail.DragFurrow, `furrow (${x},${y})`);
  // THE COUNTER: twenty tiles laid from 0 on the gap; the frame leaves
  // it at 20 for 9e's COURSE_A; the two stiles at 0 and 12; no stone
  // (the fortieth is 9e's).
  assert.equal(registry.course.length, HEAD.RUN_TILES);
  assert.deepEqual(registry.course.filter((c) => c.tile !== Tile.CourseWall).map((c) => [c.x, c.y, c.i, TILE_DEFS[c.tile].name]), [
    [169, 267, 0, 'course stile'],
    [157, 267, 12, 'course stile'],
  ]);
  assert.deepEqual(PINS.COURSE_GAPS, [[169, 267]], 'THE SERVER\'S ROSTER: the one gap');
  assert.deepEqual(PINS.SETT.SEAM, [[150, 267]]);
  // Everything on the lip is level 0 and nothing is authored north of y 266.
  for (let x = 150; x <= 176; x++) for (const y of [266, 267]) assert.equal(lvl(z, x, y), 0);
  for (let lx = 0; lx < z.width; lx++) assert.equal(z.ground[lx], TILE_SKIP, 'y 265 is the field\'s');
});

test('sett: S2-S8 — the rim-set, the core steps, the Plug, the wet floor, the yard, the shelf, the south: every prop where its sentence put it', () => {
  const z = buildSett();
  const { RIMSET, CORE_STEPS, PLUG, WETFLOOR, YARD, SHELF, SOUTH } = PINS;
  // S2 THE RIM-SET: two cells, the dead-row, P1, the foot apron.
  for (const [x, y] of [RIMSET.M1, RIMSET.M2]) assert.equal(at(z, x, y), Tile.CorbelCell);
  for (let x = RIMSET.DEADROW.x0; x <= RIMSET.DEADROW.x1; x++) assert.equal(at(z, x, RIMSET.DEADROW.y), Tile.CourseWall, 'the dead-row');
  assert.equal(at(z, RIMSET.P1[0], RIMSET.P1[1]), Tile.PlumbStone, 'P1');
  assert.equal(at(z, 172, 271), Tile.Dirt, 'the foot apron');
  assert.equal(at(z, 160, 286), Tile.Dirt, 'the west line ends north of the stile');
  // S3 THE CORE STEPS: the aprons.
  for (let x = CORE_STEPS.CROWN_APRON.x0; x <= CORE_STEPS.CROWN_APRON.x1; x++) assert.equal(at(z, x, 284), Tile.Dirt);
  for (let x = CORE_STEPS.MOUTH_APRON.x0; x <= CORE_STEPS.MOUTH_APRON.x1; x++) assert.equal(at(z, x, 286), Tile.Dirt);
  // S4 THE PLUG: the dome on bare CaveFloor, the walk's ring of Dirt, nothing inside.
  assert.equal(at(z, PLUG.DOME[0], PLUG.DOME[1]), Tile.CorbelCell);
  for (let y = PLUG.WALK.y0; y <= PLUG.WALK.y1; y++) {
    for (let x = PLUG.WALK.x0; x <= PLUG.WALK.x1; x++) {
      const border = x === PLUG.WALK.x0 || x === PLUG.WALK.x1 || y === PLUG.WALK.y0 || y === PLUG.WALK.y1;
      const dome = x === PLUG.DOME[0] && y === PLUG.DOME[1];
      assert.equal(at(z, x, y), border ? Tile.Dirt : dome ? Tile.CorbelCell : Tile.CaveFloor, `the walk (${x},${y})`);
      assert.equal(lvl(z, x, y), -2);
    }
  }
  // S5 THE WET FLOOR: the ninth course in the water, Drusa's cell half in, the bank, two rubble.
  for (let x = WETFLOOR.NINTH.x0; x <= WETFLOOR.NINTH.x1; x++) {
    assert.equal(at(z, x, 298), Tile.CourseWall, `the ninth course (${x},298)`);
    assert.equal(at(z, x, 297), Tile.WaterShallow, 'water north of it');
    assert.equal(at(z, x, 299), Tile.WaterShallow, 'water south of it');
  }
  assert.equal(at(z, 182, 297), Tile.CorbelCell, 'Drusa\'s cell');
  assert.equal(at(z, 182, 298), Tile.WaterShallow, 'water south of it');
  assert.equal(at(z, 181, 297), Tile.WaterShallow, 'water west of it');
  assert.equal(at(z, 182, 296), Tile.Dirt, 'Dirt north of it');
  for (let x = WETFLOOR.EDGE.x0; x <= WETFLOOR.EDGE.x1; x++) assert.equal(at(z, x, 296), Tile.Dirt, 'the bank');
  for (const [x, y] of WETFLOOR.RUBBLE) assert.equal(at(z, x, y), Tile.CaveRubble);
  // S6 THE WEIGHT-YARD: the two courses rim to rim, the stile, the cart beside its wall, the row, P2, C2, the rubble.
  for (let x: number = YARD.NORTH_COURSE.x0; x <= YARD.NORTH_COURSE.x1; x++) {
    assert.equal(at(z, x, 287), x === YARD.VS[0] ? Tile.CourseStile : Tile.CourseWall, `the north course (${x},287)`);
  }
  assert.equal(at(z, 154, 287), Tile.Cliff, 'the north course meets the outer rim');
  assert.equal(at(z, 165, 287), Tile.Cliff, 'and the core\'s rim');
  for (let x = YARD.SOUTH_COURSE.x0; x <= YARD.SOUTH_COURSE.x1; x++) assert.equal(at(z, x, 300), Tile.CourseWall, `the south course (${x},300)`);
  assert.equal(at(z, 153, 300), Tile.Cliff);
  assert.equal(at(z, 165, 300), Tile.Cliff);
  assert.equal(at(z, 159, 291), Tile.BrokenCart, 'the cart');
  assert.equal(at(z, 158, 291), Tile.Dirt, 'its second foot, open (FOOTPRINT dx −1)');
  for (let x = 160; x <= 162; x++) assert.equal(at(z, x, 291), Tile.CourseWall, 'the short wall the cart stands beside');
  for (const [x, y] of YARD.CHARTER_POSTS) assert.equal(at(z, x, y), Tile.CharterPost);
  for (const [x, y] of YARD.PIT_LAMPS) assert.equal(at(z, x, y), Tile.PitLampDark);
  for (let x = 156; x <= 161; x++) assert.equal(lvl(z, x, 296), -1, 'the row lies on the ring');
  assert.equal(at(z, 157, 289), Tile.PlumbStone, 'P2');
  for (const [x, y] of YARD.C2) assert.equal(detail(z, x, y), Detail.Chalkline, `C2 (${x},${y})`);
  assert.equal(at(z, 163, 293), Tile.Cliff, 'the brief\'s C2 end (163,293) is the core\'s rim: the line moved one row north');
  assert.equal(at(z, 155, 299), Tile.CaveRubble);
  // S7 THE HEARTH-CELLS: two cells, two beds in their ash, three rubble.
  for (const [x, y] of [SHELF.K1, SHELF.K2]) assert.equal(at(z, x, y), Tile.CorbelCell);
  for (const [x, y] of [SHELF.B1, SHELF.B2]) {
    assert.equal(at(z, x, y), Tile.EmberBed);
    assert.equal(detail(z, x, y), 0, 'no ash under the bed (K1)');
  }
  for (const [x, y] of SHELF.RUBBLE) assert.equal(at(z, x, y), Tile.CaveRubble);
  assert.equal(at(z, 188, 294), Tile.Cliff, 'the brief\'s middle rubble cell is the core\'s rim: it stands at (189,295)');
  // S8 THE SOUTH: C4 and three rubble, nothing else to y 334.
  for (const [x, y] of SOUTH.C4) assert.equal(detail(z, x, y), Detail.Chalkline);
  for (const [x, y] of SOUTH.RUBBLE) assert.equal(at(z, x, y), Tile.CaveRubble);
  let southAuthored = 0;
  for (let y = 302; y <= 334; y++) {
    for (let x = 150; x <= 199; x++) {
      const t = at(z, x, y);
      if (t !== TILE_SKIP && t !== Tile.CaveFloor && t !== Tile.Cliff) southAuthored++;
    }
  }
  assert.equal(southAuthored, SOUTH.RUBBLE.length, 'three rubble and nothing else south of the core');
});

test('sett: THE COUNTS — the kit, the taken, the water, the chalk; no timber, no board, the two hearths the only lights', () => {
  const z = buildSett();
  // CourseWall: the head run 18 (11 + 6 + the seam) + the dead-row 5 +
  // the ninth 9 + Vorl's north course 9 (the tape: 155..164 less the
  // stile) + the south course 11 (154..164) + the cart's wall 3 = 55.
  // The brief counted 50 with both yard courses stopping one short of
  // the rims; pins.ts says why they run to the Cliff.
  assert.equal(count(z, Tile.CourseWall), 55);
  assert.equal(count(z, Tile.CourseStile), 3, 'the gap, the head run\'s stile, Vorl\'s stile');
  assert.equal(count(z, Tile.CorbelCell), 6, 'M1, M2, the Plug, Drusa\'s, K1, K2');
  assert.equal(count(z, Tile.PlumbStone), 3, 'P0, P1, P2');
  assert.equal(count(z, Tile.EmberBed), 2);
  assert.equal(count(z, Tile.BrokenCart), 1);
  assert.equal(count(z, Tile.CharterPost), 4);
  assert.equal(count(z, Tile.PitLampDark), 2);
  assert.equal(count(z, Tile.CaveRubble), 9);
  assert.equal(dcount(z, Detail.Chalkline), 9, 'C1, C2, C4: three runs of three');
  assert.equal(dcount(z, Detail.DragFurrow), 2);
  assert.equal(dcount(z, Detail.Ash), 7, 'B1\'s three floor cardinals (its west is the rim) and B2\'s four');
  // The wet floor: 61 cells painted at −2; the ninth course and
  // Drusa's cell stand in ten of them, so 51 remain water.
  assert.equal(count(z, Tile.WaterShallow), PINS.WETFLOOR.CELLS - 9 - 1);
  assert.equal(count(z, Tile.Signpost), 0);
  // The four course ids are WET_STANDERS on the client (E3): the pin
  // here is the kit's own list, mirrored in client terrain.ts.
  assert.deepEqual([...WET_STANDERS_KIT].sort((a, b) => a - b), [Tile.CourseWall, Tile.CourseStile, Tile.CorbelCell, Tile.PlumbStone]);
});

test('sett: THE CAST — eleven bodies at their posts facing the bowl, Vorl\'s one row through the passthrough, one loop', () => {
  const z = buildSett();
  const c = (x: number, y: number): [number, number] => [x + 0.5, y + 0.5];
  assert.deepEqual(z.actorSpawns, [
    { actor: 'dolmen_ammat', x: c(168, 266)[0], y: c(168, 266)[1], dir: S, routine: 'dolmen_set' },
    { actor: 'dolmen_drusa', x: c(180, 296)[0], y: c(180, 296)[1], dir: W, routine: 'dolmen_wet' },
    { actor: 'dolmen_durrow', x: c(190, 294)[0], y: c(190, 294)[1], dir: W, routine: 'dolmen_set' },
    { actor: 'dolmen_setter', x: c(169, 273)[0], y: c(169, 273)[1], dir: S, routine: 'dolmen_set' },
    { actor: 'dolmen_setter', x: c(163, 281)[0], y: c(163, 281)[1], dir: W, routine: 'dolmen_set' },
    { actor: 'dolmen_wetsetter', x: c(172, 299)[0], y: c(172, 299)[1], dir: N, routine: 'dolmen_set' },
    { actor: 'dolmen_wetsetter', x: c(179, 300)[0], y: c(179, 300)[1], dir: W, routine: 'dolmen_set' },
    { actor: 'dolmen_firekeeper', x: c(190, 290)[0], y: c(190, 290)[1], dir: S, routine: 'dolmen_set' },
    { actor: 'dolmen_firekeeper', x: c(191, 298)[0], y: c(191, 298)[1], dir: N, routine: 'dolmen_set' },
    { actor: 'dolmen_weightkeeper', x: c(157, 294)[0], y: c(157, 294)[1], dir: E, routine: 'dolmen_set' },
    { actor: 'dolmen_weightkeeper', x: c(162, 298)[0], y: c(162, 298)[1], dir: W, routine: 'dolmen_set' },
  ]);
  // Every dir is a cardinal; every body stands on walkable ground; the
  // two wetsetters stand in the water, the rest on their worn Dirt;
  // no body on a rim.
  for (const a of z.actorSpawns!) {
    assert.ok([E, S, W, N].includes(a.dir!), `${a.actor} faces a cardinal`);
    const t = at(z, Math.floor(a.x), Math.floor(a.y));
    assert.equal(TILE_DEFS[t as Tile].solid, false);
    assert.equal(t, a.actor === 'dolmen_wetsetter' ? Tile.WaterShallow : Tile.Dirt, `${a.actor} stands on its ground`);
  }
  // VORL'S ROW, verbatim (R-C, E1): named, levelled at the def's own
  // 14, mouthed, tribe dolmen, passive, on a vigil post; no crown.
  assert.deepEqual(z.spawns, [
    {
      npc: 'dolmen_champion',
      x: 160,
      y: 293,
      radius: 0,
      count: 1,
      level: 14,
      name: 'Vorl Fullweight',
      mouth: 'dolmen_vorl',
      tribe: 'dolmen',
      passive: true,
      post: { kind: 'vigil', x: 160, y: 293, dir: E },
    },
  ]);
  assert.equal('crown' in z.spawns![0]!, false, 'never crowned');
  assert.equal(at(z, 160, 293), Tile.Dirt, 'his stand is worn');
  // The one-body law: the mouth is placed by no actor row and by
  // exactly one spawn row; every named slug stands once.
  assert.equal(z.actorSpawns!.some((a) => a.actor === 'dolmen_vorl'), false);
  for (const slug of ['dolmen_ammat', 'dolmen_drusa', 'dolmen_durrow']) {
    assert.equal(z.actorSpawns!.filter((a) => a.actor === slug).length, 1, `${slug} stands once`);
  }
  // Hours: no Dolmen row keeps hours (they stand always).
  assert.equal('hours' in z.spawns![0]!, false);
  // ONE LOOP (R-F): Drusa alone walks a path (`dolmen_wet`, L3's).
  assert.deepEqual(oneLoop(z, PINS.LOOPS), []);
  assert.deepEqual(PINS.LOOPS, ['dolmen_wet']);
});

test('sett: THE FLOODS run clean', () => {
  const { zone: z, registry } = buildSettWithRegistry();
  const level = (x: number, y: number): number => frameLevel(PINS.SETT, x, y);
  assert.deepEqual(unreachableFloor(z, PINS.REACH_FROM), [], 'no sealed pocket: every floor is reached from the lip down the two flights');
  assert.deepEqual(occlusionViolations(z, registry), [], 'the occlusion law: nothing tall two rows south of a post; no post in a cell\'s shadow; no post on the two rows south of a hearth');
  assert.deepEqual(signPairViolations(z), [], 'one board per eyeful (none)');
  assert.deepEqual(boxOverlaps(registry), [], 'scene boxes disjoint');
  assert.deepEqual(emberBedsOffAsh(z), [], 'K1: each bed in its ash');
  assert.deepEqual(postStands(z, registry), [], 'every post has a walkable cardinal stand');
  assert.deepEqual(skipRing(z, PINS.SETT.SEAM), [], 'the border ring is the field\'s but the seam; the profile claims nothing');
  assert.deepEqual(padClear(z), [], 'G-12: no pinned footprint inside the pad');
  assert.deepEqual(floorPainted(z, level), []);
  assert.deepEqual(rimIsCliff(z), []);
  assert.deepEqual(stairsExact(z, PINS.STAIRS), []);
  assert.deepEqual(wetFloorLevel(z, registry.water), [], 'every water cell at −2; nothing in the water but the kit');
  assert.equal(registry.water.length, PINS.WETFLOOR.CELLS);
  assert.deepEqual(plugUnwalked(z, PINS.PLUG.DOME, PINS.PLUG.INSIDE_R), [], 'nobody has stood on the Plug since');
  assert.deepEqual(lightsCensus(z, PINS.LIGHTS_CENSUS), [], 'the two hearths are the only lights');
  assert.deepEqual(noTimber(z, PINS.TAKEN), [], 'no timber but the taken');
  assert.deepEqual(oneLoop(z, PINS.LOOPS), []);
  assert.deepEqual(stileNotAtJunction(z), [], 'no stile or stone at a corner or a junction');
  assert.deepEqual(chalkNoLattice(z), [], 'never a lattice');
  assert.deepEqual(yardSealed(z, PINS.REACH_FROM, PINS.YARD.VS, PINS.YARD.INTERIOR), [], 'the yard is entered through the stile only');
  assert.deepEqual(keepOut(z, PINS.KEEP_OUT), [], 'KEEP_OUT');
  assert.deepEqual(footprintViolations(z), [], 'E5: the cart\'s second foot');
  assert.deepEqual(zonePlacementErrors(z), [], 'the placement vet');
  // The registered occluders are the six cells; the registered posts
  // are the eleven and Vorl's seat.
  assert.equal(registry.occluders.length, 6);
  assert.equal(registry.posts.length, 12);
});

test('sett: byte-identical across two builds and through JSON', () => {
  const a = buildSett();
  const b = buildSett();
  assert.deepEqual(a, b);
  const round = zoneFromJson(JSON.parse(JSON.stringify(zoneToJson(a))));
  assert.deepEqual(round.ground, a.ground);
  assert.deepEqual(round.detail, a.detail);
  assert.deepEqual(round.elev, a.elev);
  assert.deepEqual(round.spawns ?? [], a.spawns ?? []);
  assert.deepEqual(round.actorSpawns ?? [], a.actorSpawns ?? []);
  assert.deepEqual(round.signs ?? [], a.signs ?? []);
});
