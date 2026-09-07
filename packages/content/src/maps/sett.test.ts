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

test('sett: THE SHAPE IS READ, NOT DRAWN — the −1 ring is 1,532 + E1\'s three (E2 takes three up, E3 brings three up: 1,535), the −2 core 322, every rim Cliff or a tread, six treads exactly', () => {
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
  // the ground's; E1 adds three to the ring; THE FLOOR PASS's two
  // tongues move three each: E2 raises three ring cells to the lip
  // (−3) and E3 raises three core cells to the ring (+3 ring, −3
  // core), so the ring stays 1,535 and the core is 322.
  assert.equal(m1, 1532 + 3 - 3 + 3, 'the −1 ring with E1, E2 and E3');
  assert.equal(m2, 325 - 3, 'the −2 core less E3\'s tongue');
  assert.equal(other, 0, 'nothing raised above the lip, nothing deeper');
  assert.deepEqual(registry.mask.sunk, { '-1': 1535, '-2': 322 });
  assert.deepEqual(registry.mask.edits, [PINS.E1_THE_LIP.why, PINS.E2_THE_WEST_TONGUE.why, PINS.E3_THE_SINTER_TONGUE.why]);
  // E1: worldgen had the three at level 0 (rim rock); the zone sinks them.
  for (const [x, y] of PINS.E1_THE_LIP.cells) {
    assert.equal(fieldLevel(x, y), 0, `worldgen's (${x},${y}) is level 0`);
    assert.equal(lvl(z, x, y), -1, `E1 sinks (${x},${y})`);
  }
  // E2 and E3, the tongues: worldgen had them as floor; the zone
  // leaves them standing one level up, every cell a rim, Cliff, joined
  // to the rim it grows from.
  for (const [x, y] of PINS.E2_THE_WEST_TONGUE.cells) {
    assert.equal(fieldLevel(x, y), -1, `worldgen's (${x},${y}) is ring floor`);
    assert.equal(lvl(z, x, y), 0, `E2 leaves (${x},${y}) at the lip`);
    assert.equal(at(z, x, y), Tile.Cliff, 'a cut face');
  }
  assert.equal(at(z, 156, 274), Tile.Cliff, 'E2 grows from the west rim');
  for (const [x, y] of PINS.E3_THE_SINTER_TONGUE.cells) {
    assert.equal(fieldLevel(x, y), -2, `worldgen's (${x},${y}) is core floor`);
    assert.equal(lvl(z, x, y), -1, `E3 leaves (${x},${y}) at the ring`);
    assert.equal(at(z, x, y), Tile.Cliff, 'a cut face');
  }
  assert.equal(at(z, 163, 294), Tile.Cliff, 'E3 grows from the core\'s west rim');
  // The rim: 220 level-0 cells and 86 −1 cells (worldgen's own Cliff
  // at 303 of them) = 306, plus the tongues' six, less (163,293),
  // which E3 shelters (its only lower neighbour was (164,294)) and
  // which is floor again = 311; less the six treads = 305 Cliff.
  assert.equal(registry.mask.rim, 311);
  assert.equal(count(z, Tile.Cliff), 305);
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
  // S4 THE PLUG: the dome on bare CaveFloor, the walk's ring of Dirt
  // broken by the hash (THE FLOOR PASS: a ring of feet, not a square
  // of tape; the four corners, where they turn, always worn; 24 of the
  // 32 border cells Dirt at this salt), nothing inside.
  assert.equal(at(z, PLUG.DOME[0], PLUG.DOME[1]), Tile.CorbelCell);
  let walkDirt = 0;
  for (let y = PLUG.WALK.y0; y <= PLUG.WALK.y1; y++) {
    for (let x = PLUG.WALK.x0; x <= PLUG.WALK.x1; x++) {
      const border = x === PLUG.WALK.x0 || x === PLUG.WALK.x1 || y === PLUG.WALK.y0 || y === PLUG.WALK.y1;
      const corner = (x === PLUG.WALK.x0 || x === PLUG.WALK.x1) && (y === PLUG.WALK.y0 || y === PLUG.WALK.y1);
      const dome = x === PLUG.DOME[0] && y === PLUG.DOME[1];
      const t = at(z, x, y);
      if (border) {
        assert.ok(t === Tile.Dirt || t === Tile.CaveFloor, `the walk (${x},${y}) is worn or bare`);
        if (corner) assert.equal(t, Tile.Dirt, `the walk turns at (${x},${y})`);
        if (t === Tile.Dirt) walkDirt++;
      } else {
        assert.equal(t, dome ? Tile.CorbelCell : Tile.CaveFloor, `inside the walk (${x},${y})`);
      }
      assert.equal(lvl(z, x, y), -2);
    }
  }
  assert.equal(walkDirt, 24, 'the walk is worn on three cells in four');
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
  // The bank, worn where they stand and rock between (12 of 15 at
  // this salt); Drusa's post and her Dirt always worn.
  let bank = 0;
  for (let x = WETFLOOR.EDGE.x0; x <= WETFLOOR.EDGE.x1; x++) {
    const t = at(z, x, 296);
    assert.ok(t === Tile.Dirt || t === Tile.CaveFloor, `the bank (${x},296)`);
    if (t === Tile.Dirt) bank++;
  }
  assert.equal(bank, 12, 'the bank is worn, not laid');
  assert.equal(at(z, 180, 296), Tile.Dirt, 'Drusa stands on worn ground');
  for (const [x, y] of WETFLOOR.RUBBLE) assert.equal(at(z, x, y), Tile.CaveRubble);
  // THE FLOOR PASS on the −2 floor: the Sinter's spoil at the west
  // face beside their tongue, the ledge at the south-west foot, the
  // seam showing at the foot of the east face.
  assert.equal(at(z, WETFLOOR.SPOIL[0], WETFLOOR.SPOIL[1]), Tile.SpoilHeap, 'the Sinter\'s spoil');
  for (const [x, y] of WETFLOOR.LEDGE) assert.equal(at(z, x, y), Tile.Rock, 'the ledge');
  assert.equal(at(z, 170, 300), Tile.CaveFloor, 'the ledge never touches the water');
  for (const [x, y] of SHELF.SEAM_CORE) assert.equal(at(z, x, y), Tile.RockCoal, 'the seam on the floor side');
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
  assert.equal(at(z, 163, 293), Tile.CaveFloor, 'the brief\'s C2 end (163,293) was the core\'s rim and E3\'s tongue now shelters it; the line stays at the cart wall\'s foot, where a chalk line is legible');
  assert.equal(at(z, 155, 299), Tile.CaveRubble);
  // S7 THE HEARTH-CELLS: two cells, two beds in their ash, three rubble.
  for (const [x, y] of [SHELF.K1, SHELF.K2]) assert.equal(at(z, x, y), Tile.CorbelCell);
  for (const [x, y] of [SHELF.B1, SHELF.B2]) {
    assert.equal(at(z, x, y), Tile.EmberBed);
    assert.equal(detail(z, x, y), 0, 'no ash under the bed (K1)');
  }
  for (const [x, y] of SHELF.RUBBLE) assert.equal(at(z, x, y), Tile.CaveRubble);
  assert.equal(at(z, 188, 294), Tile.Cliff, 'the brief\'s middle rubble cell is the core\'s rim: it stands at (189,295)');
  assert.equal(at(z, SHELF.SEAM_SHELF[0], SHELF.SEAM_SHELF[1]), Tile.RockCoal, 'the seam on the shelf side, where Durrow faces it');
  // S2 again, THE FLOOR PASS on the ring: the laid course of set stone
  // from the foot toward the core steps, C4 chalked at its end, the
  // crown spoil beside the apron, the west foot's rubble.
  assert.equal(at(z, 172, 273), Tile.StoneFloor, 'the laid course leaves the foot');
  assert.equal(at(z, 175, 280), Tile.StoneFloor, 'and stops three short of the crown');
  assert.equal(count(z, Tile.StoneFloor), 11, 'eleven set stones (the brush\'s wobble adds one at the bend)');
  for (const [x, y] of RIMSET.C4) {
    assert.equal(detail(z, x, y), Detail.Chalkline, `C4 (${x},${y})`);
    assert.equal(at(z, x, y), Tile.CaveFloor, 'chalk on bare rock, not set');
  }
  for (const [x, y] of RIMSET.CROWN_SPOIL) assert.equal(at(z, x, y), Tile.SpoilHeap);
  for (const [x, y] of RIMSET.WEST_FOOT) assert.equal(at(z, x, y), Tile.CaveRubble);
  // S8 THE SOUTH: the foot run and three rubble, nothing else to y 334
  // (C4 moved to the ring: rimset.ts says why).
  for (const [x, y] of SOUTH.FOOT) assert.equal(at(z, x, y), Tile.CaveRubble);
  for (const [x, y] of SOUTH.RUBBLE) assert.equal(at(z, x, y), Tile.CaveRubble);
  for (let x = 174; x <= 176; x++) assert.equal(detail(z, x, 304), 0, 'no chalk under the south face');
  let southAuthored = 0;
  for (let y = 302; y <= 334; y++) {
    for (let x = 150; x <= 199; x++) {
      const t = at(z, x, y);
      if (t !== TILE_SKIP && t !== Tile.CaveFloor && t !== Tile.Cliff) southAuthored++;
    }
  }
  assert.equal(southAuthored, SOUTH.RUBBLE.length + SOUTH.FOOT.length, 'the foot run, three rubble and nothing else south of the core');
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
  // THE FLOOR PASS: the nine rubble plus the two foot runs (five each),
  // three spoil heaps (the crown's two, the Sinter's one), the ledge's
  // two rock, the seam's three coal rock; the chalk still nine, none
  // added, C4 moved to the laid course.
  assert.equal(count(z, Tile.CaveRubble), 9 + 5 + 5);
  assert.equal(count(z, Tile.SpoilHeap), 3);
  assert.equal(count(z, Tile.Rock), 2);
  assert.equal(count(z, Tile.RockCoal), 3);
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

// =====================================================================
// THE STANDING COURSE (band 9e; brief §6.0, §2 S9-S10, §7; rulings
// R-B, R-G; the 9d handoff §C.1): the four frames from the lip to the
// Drowned Meadow. Every number below is the ground's as the route was
// probed (band9e/l1/probe.out, route.out); pins.ts says where the
// brief's candidates and the ground disagreed and why the ground won.
// =====================================================================
import {
  buildCourseA,
  buildCourseB,
  buildCourseC,
  buildMeadow,
} from './sett.js';
import {
  buildCourseAWithRegistry,
  buildCourseBWithRegistry,
  buildCourseCWithRegistry,
  buildCourseWithRegistries,
  buildMeadowWithRegistry,
} from './sett/index.js';
import { crowned, noFelling, seamJoined, waterOverField } from './sett/lint.js';
import { fieldFree, fieldGround, fieldWater } from './sett/ctx.js';
import { TREE_TILES } from '@arx/shared';
import { COURSE_A_RECT, COURSE_B_RECT, COURSE_C_RECT, MEADOW_RECT, PLANNED_ZONE_RECTS } from '../geography.js';

const fieldName = (x: number, y: number): string => TILE_DEFS[fieldGround(x, y) as Tile]?.name ?? '?';
const trunk = (x: number, y: number): boolean => TREE_TILES.has(fieldGround(x, y) as Tile);
const specials = (r: { course: Array<{ x: number; y: number; i: number; tile: Tile }> }): Array<[number, number, number, string]> =>
  r.course.filter((c) => c.tile !== Tile.CourseWall).map((c) => [c.x, c.y, c.i, TILE_DEFS[c.tile].name]);
type Built = ReturnType<typeof buildCourseAWithRegistry>;
const FRAME_BUILDS: ReadonlyArray<[keyof typeof PINS.KEEP_OUT_FRAMES, () => Built, { x: number; y: number; w: number; h: number }]> = [
  ['course_a', buildCourseAWithRegistry, COURSE_A_RECT],
  ['course_b', buildCourseBWithRegistry, COURSE_B_RECT],
  ['course_c', buildCourseCWithRegistry, COURSE_C_RECT],
  ['meadow', buildMeadowWithRegistry, MEADOW_RECT],
];

test('course: THE FOUR FRAMES — measured rects, flat, wild, spawnless, chestless, boardless; the seat pin against the shoal\'s booted footprint', () => {
  const pad = PINS.SHOAL_SEAT.padded;
  const gaps: string[] = [];
  for (const [id, build, rect] of FRAME_BUILDS) {
    const { zone: z } = build();
    const frame = PINS.FRAMES[id];
    assert.equal(z.id, id);
    assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, rect, `${id}: the built rect is the plan's`);
    assert.deepEqual(frame.RECT, rect, `${id}: pins and geography agree`);
    assert.equal(z.growth, 'wild');
    assert.equal(z.spawn, undefined, 'no spawn');
    assert.equal(z.reachFrom, undefined, 'flat: no reach anchor');
    assert.equal(z.elev, undefined, 'level 0 throughout');
    assert.equal(z.chests, undefined);
    assert.deepEqual(z.signs ?? [], [], 'no board on the Course: the count is spoken');
    assert.equal(count(z, Tile.Signpost) + count(z, Tile.HangingSign), 0);
    assert.ok(z.origin.y >= 198, `${id}: never a rect north of y 198`);
    // THE SEAT PIN: no cell inside the shoal's padded footprint; the
    // nearest gap filed.
    const x1 = z.origin.x + z.width - 1;
    const y1 = z.origin.y + z.height - 1;
    const rows = y1 >= pad.y0 && z.origin.y <= pad.y1;
    const cols = x1 >= pad.x0 && z.origin.x <= pad.x1;
    assert.ok(!(rows && cols), `${id} stands inside the shoal's pad`);
    gaps.push(`${id}:${rows ? pad.x0 - x1 : z.origin.y - pad.y1}`);
    const vet = validateZone(z);
    assert.equal(vet.ok, true, vet.error);
    assert.equal(vet.fenceAdded, 0);
    assert.deepEqual(zonePlacementErrors(z), []);
    assert.ok(PLANNED_ZONE_RECTS.some((p) => p.id === id && p.x === rect.x && p.y === rect.y && p.w === rect.w && p.h === rect.h && !p.apron), `${id} has its planned row, no apron`);
  }
  assert.deepEqual(gaps, ['course_a:26', 'course_b:23', 'course_c:35', 'meadow:84'], 'the nearest clearances: B by 23 columns, A by 26 rows');
  assert.deepEqual(PINS.SHOAL_SEAT.anchor, [203, 184]);
  assert.deepEqual(PINS.SHOAL_SEAT.padded, { x0: 167, y0: 155, x1: 238, y1: 212 });
  // THE FRAMES ABUT and never overlap (later zones win overlaps; none here).
  const rects = [PINS.SETT, PINS.COURSE_A, PINS.COURSE_B, PINS.COURSE_C, PINS.MEADOW].map((f) => f.RECT);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      const overlap = a.x <= b.x + b.w - 1 && b.x <= a.x + a.w - 1 && a.y <= b.y + b.h - 1 && b.y <= a.y + a.h - 1;
      assert.ok(!overlap, `rects ${i} and ${j} overlap`);
    }
  }
  assert.equal(PINS.COURSE_A.RECT.x + PINS.COURSE_A.RECT.w, PINS.SETT.RECT.x, 'A\'s east ring beside the Sett\'s west ring');
  assert.equal(PINS.COURSE_B.RECT.y + PINS.COURSE_B.RECT.h, PINS.COURSE_A.RECT.y, 'B\'s south ring over A\'s north ring');
  assert.equal(PINS.COURSE_C.RECT.x + PINS.COURSE_C.RECT.w, PINS.COURSE_B.RECT.x, 'C\'s east ring beside B\'s west ring');
  assert.equal(PINS.MEADOW.RECT.x + PINS.MEADOW.RECT.w, PINS.COURSE_C.RECT.x, 'the meadow\'s east ring beside C\'s west ring');
});

test('course: THE LINE IS ONE LINE — 166 tiles from the north gap to the END stone, every seam crossed with no hole, the counter one constant', () => {
  const frames = buildCourseWithRegistries();
  assert.deepEqual(seamJoined(frames, PINS.COURSE_END_COUNT), [], 'seamJoined');
  assert.equal(PINS.COURSE_END_COUNT, 166, 'R-B: 150..170 tiles, one crossing');
  // The counter chain, derived never remembered: each frame starts
  // where the one before it left off.
  assert.equal(PINS.SETT.COURSE_START, 0);
  assert.equal(PINS.COURSE_A.COURSE_START, 0 + PINS.HEAD.RUN_TILES);
  assert.equal(PINS.COURSE_B.COURSE_START, PINS.COURSE_A.COURSE_START + PINS.COURSE_TILES_PER_FRAME.course_a);
  assert.equal(PINS.COURSE_C.COURSE_START, PINS.COURSE_B.COURSE_START + PINS.COURSE_TILES_PER_FRAME.course_b);
  assert.equal(PINS.MEADOW.COURSE_START, PINS.COURSE_C.COURSE_START + PINS.COURSE_TILES_PER_FRAME.course_c);
  assert.equal(PINS.MEADOW.COURSE_START + PINS.COURSE_TILES_PER_FRAME.meadow, PINS.COURSE_END_COUNT);
  for (const [id, , , ] of FRAME_BUILDS) {
    const f = PINS.FRAMES[id];
    const pts = PINS.COURSE_PTS[id];
    assert.deepEqual(pts[0], f.SEAM[0], `${id}: the polyline enters at the frame's first seam`);
    if (id !== 'meadow') assert.deepEqual(pts[pts.length - 1], f.SEAM[1], `${id}: and leaves at its second`);
  }
  // THE ONE CROSSING: exactly four wet tiles on the whole line, all in B at y 207.
  const wet = frames.flatMap((f) => f.registry.course.filter((c) => c.tile === Tile.WaterShallow).map((c) => [c.x, c.y, c.i] as const));
  assert.deepEqual(wet, [[141, 207, 88], [140, 207, 89], [139, 207, 90], [138, 207, 91]]);
  // Every stile and stone on the line, by the counter (0 and 12 are the Sett's).
  const all = frames.flatMap((f) => specials(f.registry));
  assert.deepEqual(all.filter(([, , , n]) => n === 'course stile').map(([, , i]) => i), [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 132, 144, 156], 'a stile every twelve (120 is a stone)');
  assert.deepEqual(all.filter(([, , , n]) => n === 'plumb stone').map(([, , i]) => i), [40, 80, 86, 92, 120, 160, 165], 'a stone every forty, plus the two bank stones and the END');
  // THE TRUNK LAW and the WATCH: no authored cell over a trunk, a bush,
  // a prop or a rise; the crowned cells are exactly the pinned ones.
  for (const { zone: z, registry } of frames.slice(1)) {
    const id = z.id as keyof typeof PINS.CROWNED;
    assert.deepEqual(noFelling(z, fieldFree, fieldWater, fieldName), [], `${id}: noFelling`);
    assert.deepEqual(crowned(registry, trunk), PINS.CROWNED[id], `${id}: the WATCH list is the ground's`);
    assert.deepEqual(waterOverField(z, registry.water, id === 'meadow' ? fieldFree : fieldWater, fieldName), [], `${id}: painted water replaced only its field`);
  }
});

test('course: COURSE_A THE BELT RUN — two west, north along the wood\'s edge, west six, north to the bank; the fortieth stone on the straight', () => {
  const { zone: z, registry } = buildCourseAWithRegistry();
  assert.equal(registry.course.length, 37);
  assert.deepEqual(PINS.COURSE_PTS.course_a, [[149, 267], [148, 267], [148, 244], [142, 244], [142, 238]]);
  assert.equal(count(z, Tile.CourseWall), 33);
  assert.equal(count(z, Tile.CourseStile), 3);
  assert.equal(count(z, Tile.PlumbStone), 1);
  assert.deepEqual(specials(registry), [
    [148, 264, 24, 'course stile'],
    [148, 252, 36, 'course stile'],
    [148, 248, 40, 'plumb stone'],
    [144, 244, 48, 'course stile'],
  ]);
  assert.equal(at(z, 149, 267), Tile.CourseWall, 'the seam beside the Sett\'s (150,267)');
  assert.equal(at(z, 142, 238), Tile.CourseWall, 'the seam under B\'s (142,237)');
  // The three trunks on y 267 that refused the brief's west run stand.
  for (const [x, y] of [[142, 267], [144, 267], [146, 267]] as const) {
    assert.ok(trunk(x, y), `worldgen's trunk at (${x},${y})`);
    assert.equal(at(z, x, y), TILE_SKIP, 'left standing');
  }
  // Nothing authored but the line: every authored cell is a course tile.
  let authored = 0;
  for (const g of z.ground) if (g !== TILE_SKIP) authored++;
  assert.equal(authored, 37);
  assert.deepEqual(z.actorSpawns ?? [], []);
  assert.deepEqual(z.spawns ?? [], []);
});

test('course: COURSE_B THE BANK RUN and THE FORD — the sand at x 142, the turn, four set stones under the water, a stone on each bank', () => {
  const { zone: z, registry } = buildCourseBWithRegistry();
  const { FORD } = PINS;
  assert.equal(registry.course.length, 40);
  assert.deepEqual(PINS.COURSE_PTS.course_b, [[142, 237], [142, 207], [133, 207]]);
  assert.equal(count(z, Tile.CourseWall), 29);
  assert.equal(count(z, Tile.CourseStile), 4);
  assert.equal(count(z, Tile.PlumbStone), 3, 'the eightieth, and the two bank stones');
  assert.equal(count(z, Tile.WaterShallow), 4, 'the ford');
  assert.deepEqual(specials(registry), [
    [142, 234, 60, 'course stile'],
    [142, 222, 72, 'course stile'],
    [142, 214, 80, 'plumb stone'],
    [142, 210, 84, 'course stile'],
    [142, 208, 86, 'plumb stone'],
    [141, 207, 88, 'shallow water'],
    [140, 207, 89, 'shallow water'],
    [139, 207, 90, 'shallow water'],
    [138, 207, 91, 'shallow water'],
    [137, 207, 92, 'plumb stone'],
    [133, 207, 96, 'course stile'],
  ]);
  // S9: the ford's cells were the brook's own water; the bank stones
  // stand on the sand and the grass; the turn is a wall on the sand.
  for (const [x, y] of FORD.WET) {
    assert.ok(fieldWater(x, y), `(${x},${y}) is the brook's water`);
    assert.equal(at(z, x, y), Tile.WaterShallow);
  }
  assert.equal(fieldName(FORD.EAST_STONE[0], FORD.EAST_STONE[1]), 'sand');
  assert.equal(fieldName(FORD.WEST_STONE[0], FORD.WEST_STONE[1]), 'grass');
  assert.equal(fieldName(FORD.TURN[0], FORD.TURN[1]), 'sand');
  assert.equal(at(z, FORD.TURN[0], FORD.TURN[1]), Tile.CourseWall);
  assert.deepEqual(registry.water, [[141, 207], [140, 207], [139, 207], [138, 207]]);
  // THE SET SLAB (the fix pass): every ford cell carries the slab the
  // bake paints under the water, and nothing else on the frame does.
  for (const [x, y] of FORD.WET) assert.equal(detail(z, x, y), Detail.FordStone, `(${x},${y}) carries a set slab`);
  assert.equal(dcount(z, Detail.FordStone), 4, 'four slabs, the crossing');
  assert.deepEqual(registry.details.map((d) => [d.x, d.y, d.d]), FORD.WET.map(([x, y]) => [x, y, Detail.FordStone]));
  assert.deepEqual(registry.occluders, [[142, 208], [137, 207]], 'the two silhouettes');
  // The bank run stands on the east bank's sand from y 226 to y 208.
  for (let y = 208; y <= 226; y++) assert.equal(fieldName(142, y), 'sand', `(142,${y}) is the bank`);
  // The fishing spots that refused y 206 and y 210 as the crossing stand.
  assert.equal(fieldName(141, 206), 'fishing spot');
  assert.equal(fieldName(141, 210), 'fishing spot');
  assert.equal(at(z, 141, 206), TILE_SKIP);
  assert.equal(at(z, 141, 210), TILE_SKIP);
});

test('course: COURSE_C THE STRIP RUN — y 207 across the grass and into the wood, one step north at x 101 for the two trunks on the row', () => {
  const { zone: z, registry } = buildCourseCWithRegistry();
  assert.equal(registry.course.length, 50);
  assert.deepEqual(PINS.COURSE_PTS.course_c, [[132, 207], [101, 207], [101, 206], [84, 206]]);
  assert.equal(count(z, Tile.CourseWall), 46);
  assert.equal(count(z, Tile.CourseStile), 3);
  assert.equal(count(z, Tile.PlumbStone), 1, 'the hundred and twentieth');
  assert.deepEqual(specials(registry), [
    [121, 207, 108, 'course stile'],
    [109, 207, 120, 'plumb stone'],
    [98, 206, 132, 'course stile'],
    [86, 206, 144, 'course stile'],
  ]);
  assert.ok(trunk(100, 207) && trunk(97, 207), 'the two trunks the step is for');
  assert.equal(at(z, 100, 207), TILE_SKIP);
  assert.equal(at(z, 97, 207), TILE_SKIP);
  assert.equal(at(z, 101, 207), Tile.CourseWall, 'the step\'s first corner');
  assert.equal(at(z, 101, 206), Tile.CourseWall, 'and its second');
  assert.equal(at(z, 84, 206), Tile.CourseWall, 'the seam beside the meadow\'s (83,206)');
});

test('course: MEADOW S10 — the two sheets, the dry strip, the last courses with their feet in the water, the END stone, the cairn, Sarsen and the sheep', () => {
  const { zone: z, registry } = buildMeadowWithRegistry();
  const M = PINS.MEADOW_SCENE;
  assert.equal(registry.course.length, 19);
  assert.deepEqual(PINS.COURSE_PTS.meadow, [[83, 206], [65, 206]]);
  assert.equal(count(z, Tile.CourseWall), 16);
  assert.equal(count(z, Tile.CourseStile), 1, 'the counter\'s own, at 156');
  assert.equal(count(z, Tile.PlumbStone), 2, 'the hundred and sixtieth, and the END');
  assert.deepEqual(specials(registry), [
    [74, 206, 156, 'course stile'],
    [70, 206, 160, 'plumb stone'],
    [65, 206, 165, 'plumb stone'],
  ]);
  assert.equal(at(z, M.END[0], M.END[1]), Tile.PlumbStone, 'THE END STONE');
  assert.equal(at(z, 64, 206), Tile.WaterShallow, 'water west of it');
  assert.equal(at(z, 65, 207), Tile.WaterShallow, 'and south');
  // THE SHEETS: 176 cells painted (the two bands, the wall's row, the
  // cairn's water), 18 of them under the last courses, so 158 stand
  // water; every one over worldgen grass at level 0; every cell under
  // the wall's row painted first.
  assert.equal(registry.water.length, 176);
  assert.equal(count(z, Tile.WaterShallow), 158);
  for (let x = M.WALL_ROW.x0; x <= M.WALL_ROW.x1; x++) {
    assert.ok(registry.water.some(([wx, wy]) => wx === x && wy === M.WALL_ROW.y), `(${x},206) painted water under the course`);
    assert.equal(at(z, x, 207), Tile.WaterShallow, `water south of (${x},206)`);
  }
  let north = 0;
  let south = 0;
  for (const [x, y] of registry.water) {
    if (y >= M.NORTH_BAND.y0 && y <= M.NORTH_BAND.y1) north++;
    else if (y >= M.SOUTH_BAND.y0 && y <= M.SOUTH_BAND.y1) south++;
    else assert.fail(`water at (${x},${y}) is in neither band`);
  }
  // The north band's rag takes nineteen of its 57 cells (two of its
  // three rows are edges); the south band keeps its held north row
  // whole and rags the rest: 38 and 138 at this salt, 176 painted.
  assert.deepEqual([north, south], [38, 138], `two bands: ${north} north, ${south} south`);
  // THE DRY STRIP: three rows of worn Dirt between the sheets, ragged,
  // the worldgen trunk on it standing; Sarsen's stand and his dawn stop
  // always worn.
  assert.equal(count(z, Tile.Dirt), 36);
  for (const y of [203, 204, 205]) {
    let dirt = 0;
    for (let x = M.STRIP.x0; x <= M.STRIP.x1; x++) if (at(z, x, y) === Tile.Dirt) dirt++;
    assert.ok(dirt >= 8, `row ${y} of the strip is worn (${dirt})`);
  }
  assert.ok(trunk(M.STRIP_TRUNK[0], M.STRIP_TRUNK[1]));
  assert.equal(at(z, M.STRIP_TRUNK[0], M.STRIP_TRUNK[1]), TILE_SKIP, 'the strip\'s trunk stands');
  assert.equal(at(z, 70, 204), Tile.Dirt);
  assert.equal(at(z, M.CAIRN_STOP[0], M.CAIRN_STOP[1]), Tile.Dirt);
  // THE CAIRN: on the strip's north row with water north of it.
  assert.equal(at(z, M.CAIRN[0], M.CAIRN[1]), Tile.FieldCairn);
  assert.equal(at(z, M.CAIRN_WATER[0], M.CAIRN_WATER[1]), Tile.WaterShallow);
  assert.equal(count(z, Tile.FieldCairn), 1);
  assert.equal(count(z, Tile.CairnFallen), 0, 'FieldCairn always');
  // THE CAST: Sarsen on the strip facing north, the sheep row 18→7.
  assert.deepEqual(z.actorSpawns, [{ actor: 'dolmen_sarsen', x: 70.5, y: 204.5, dir: N, routine: 'sarsen_cairn' }]);
  // The leash is the strip's: r 1 keeps seven sheep on y 203..205 (r 3
  // stood one in the north sheet at dusk; the fix pass).
  assert.deepEqual(z.spawns, [{ npc: 'sheep', x: 76, y: 204, radius: 1, count: 7, passive: true, hours: { from: 18, to: 7 } }]);
  assert.equal(PINS.SHEEP_ROW.radius, 1);
  assert.equal(registry.posts.length, 1);
  assert.deepEqual(registry.occluders, [[65, 206]]);
});

test('course: THE FLOODS run clean on every frame; byte-identical across two builds and through JSON', () => {
  for (const [id, build] of FRAME_BUILDS) {
    const { zone: z, registry } = build();
    const from: [number, number] = [z.origin.x + 1, z.origin.y + 1];
    assert.deepEqual(unreachableFloor(z, from), [], `${id}: no sealed pocket (the stiles and the ford pass)`);
    assert.deepEqual(occlusionViolations(z, registry), [], `${id}: occlusion`);
    assert.deepEqual(signPairViolations(z), [], `${id}: no board`);
    assert.deepEqual(boxOverlaps(registry), [], `${id}: boxes`);
    assert.deepEqual(postStands(z, registry), [], `${id}: every post has a stand`);
    assert.deepEqual(skipRing(z, PINS.FRAMES[id].SEAM), [], `${id}: the border ring is the field's but the seams; the profile claims nothing`);
    assert.deepEqual(padClear(z), [], `${id}: G-12`);
    assert.deepEqual(stileNotAtJunction(z), [], `${id}: no stile or stone at a corner`);
    assert.deepEqual(lightsCensus(z, PINS.LIGHTS_CENSUS_FRAMES), [], `${id}: no light on the Course`);
    assert.deepEqual(noTimber(z, PINS.TAKEN_FRAMES), [], `${id}: no timber, none of the taken`);
    assert.deepEqual(keepOut(z, PINS.KEEP_OUT_FRAMES[id]), [], `${id}: KEEP_OUT`);
    assert.deepEqual(chalkNoLattice(z), [], `${id}: no chalk`);
    assert.deepEqual(footprintViolations(z), [], `${id}: FOOTPRINT`);
    assert.deepEqual(zonePlacementErrors(z), [], `${id}: the placement vet`);
    const again = build().zone;
    assert.deepEqual(again, z, `${id}: byte-identical`);
    const round = zoneFromJson(JSON.parse(JSON.stringify(zoneToJson(z))));
    assert.deepEqual(round.ground, z.ground);
    assert.deepEqual(round.detail, z.detail);
    assert.deepEqual(round.spawns ?? [], z.spawns ?? []);
    assert.deepEqual(round.actorSpawns ?? [], z.actorSpawns ?? []);
  }
  // The Sett itself is byte-identical to its 9d shape: the brush's
  // new clauses (wet, plumbAt, the wear brush's trunk law) never fire
  // in the bowl.
  const sett = buildSett();
  assert.equal(count(sett, Tile.CourseWall), 55);
  assert.equal(count(sett, Tile.WaterShallow), 51);
  assert.equal(count(sett, Tile.Dirt), 146);
  void buildCourseA; void buildCourseB; void buildCourseC; void buildMeadow;
});
