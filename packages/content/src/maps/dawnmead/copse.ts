/**
 * DAWNMEAD UNDER SIEGE (band 6) — copse.ts [L5 SOUTH].
 *
 * D20 THE COPSE + THE LOG YARD + THE CRAG.
 *
 * SCENES / BOXES (brief §3, declared with ctx.box):
 *   (0,112)-(25,145) the north stands; (26,126)-(37,145) the north
 *   stands' east file (the shipped oaks (30,134) (34,141), the second
 *   felled pair (27,128)/(28,128) and Pebbles (30,145), which the brief
 *   assigns to D20 but which fall outside its ruled boxes and inside no
 *   other lane's: ring.ts's meadow oaks end at y125 and its survey line
 *   begins at x38); (0,146)-(38,223) the south stands, ALDER'S HUT
 *   (20,156)-(29,164) and the log yard, THE SCRAP CRAG (2+2 ore PIN,
 *   SpoilHeap (21,209), MineCart (24,214), CharterPost (26,214)).
 *   FIX PASS 1 (defect 11): the cart and the stake stood at y218-219
 *   under the south hem's worldgen canopies, so the stake stood beside
 *   nothing visible; the pair moves up to y214 at the tin's foot.
 * GROUND (laid by L1 ground.ts before this runs): G34 the copse road
 *   two wide (x33-34 y151..160) + Alder's apron, G38 the log yard.
 * SIGNS: THE COPSE (38,152), THE SCRAP CRAG (22,204) Signposts.
 * CAST HOOKS: Alder's post (33.5,159.5) dir π, wanders (32.5,155.5) r3
 *   and (25.5,165.5) r3, his door (29,160), his night path (29,160)
 *   (27,160) (22,158) (21,158), his bed (21,157)/(21,158); the west
 *   meadow's oak (30,122) is ring.ts's.
 * NOT PLACED (inside ring.ts's D2 THE MEADOW OAKS box (26,100)-(42,125),
 *   which this lane never reaches into): the shipped stand TreeOak
 *   (33,124). It is listed in OUTSIDE_D20 below for the judge.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law (nothing tall
 * on rows 1-2 south of doors, stations, signs, posts, forage nodes);
 * cardinal stands for every lie and sit; gates authored open; wear is a
 * wobbling one-wide Dirt line or an ellipse, never a rectangle; one
 * Signpost per eyeful. CONTENT BOUNDARY holds; no dashes in any
 * player-facing string.
 */
import { Detail, Tile, awningTile, herbBundlesDetail, trellisDetail } from '@arx/shared';
import type { DawnCtx, Pt } from './ctx.js';

/**
 * The shipped stand that falls in ring.ts's D2 THE MEADOW OAKS box
 * (26,100)-(42,125) and is therefore ring.ts's to place or the judge's
 * to move: listed so nothing is lost by silence. Not placed by this
 * module.
 */
export const OUTSIDE_D20: ReadonlyArray<{ x: number; y: number; what: string }> = [
  { x: 33, y: 124, what: 'TreeOak (shipped stand; inside the meadow oaks box)' },
];

/** The shipped stands inside this lane's boxes (the felled pair swapped in). */
const OAKS: ReadonlyArray<Pt> = [
  [8, 122], [14, 126], [20, 121], [6, 133], [12, 136], [18, 132],
  [9, 144], [15, 148], [21, 142], [28, 146], [7, 156], [13, 160], [19, 155],
  [25, 162], [10, 170], [16, 174], [22, 168], [29, 172], [35, 166],
  [8, 182], [14, 186], [20, 180], [26, 188], [32, 184], [11, 194], [17, 198],
  [23, 192], [30, 196],
];
const TREES: ReadonlyArray<Pt> = [
  [11, 129], [23, 133], [5, 150], [17, 165], [27, 155], [33, 176], [12, 190], [36, 190],
];
const STUMPS: ReadonlyArray<Pt> = [[16, 143], [26, 150], [9, 163], [22, 176], [31, 190]];
const SAPLINGS: ReadonlyArray<Pt> = [[18, 138], [24, 158], [12, 152], [28, 180]];

export function copse(ctx: DawnCtx): void {
  const { b } = ctx;
  ctx.box(0, 112, 25, 145, 'copse: the north stands');
  ctx.box(26, 126, 37, 145, "copse: the north stands' east file (the second felled oak)");
  ctx.box(0, 146, 38, 223, "copse: the south stands, Alder's hut, the log yard, the crag");

  // A stand goes on grass only: a tree never overwrites a road, a yard
  // or a floor (the shipped law; (24,158) is under the hut, exactly as
  // it was). FIX PASS 2: the shipped stand (31,158) is struck from the
  // list outright. It stood on the log yard's Dirt, so the shipped
  // fillRect hid it; the yard now rags its rim on the hash (G38) and
  // the oak came up between the hut's east wall and the LogPile
  // (32,158), inside the yard. An oak in the log yard is the one place
  // Alder would never let one stand.
  const woodAt = (x: number, y: number, t: Tile): void => {
    if (b.get(x, y) === Tile.Grass) b.set(x, y, t);
  };

  // ================================================================
  // THE STANDS. Alder's managed woodlot in loose rows; two oaks were
  // felled out of turn this spring by someone who is not Alder and the
  // logs lie where they fell because he will not haul green wood and
  // will not say which of the two of them is wrong; the dead one at
  // the south end he will not fell because a stand that loses its dead
  // loses its count.
  // ================================================================
  // The oaks, planted in loose rows so the rows read as rows and not a
  // grid.
  for (const [x, y] of OAKS) woodAt(x, y, Tile.TreeOak);
  // The mixed trees between the oak rows: what seeded itself and was
  // let stand.
  for (const [x, y] of TREES) woodAt(x, y, Tile.Tree);
  // The oak at (24,138), felled out of turn this spring: the stump, and
  // the log lying east of it where it fell, green and unhauled.
  woodAt(24, 138, Tile.Stump);
  woodAt(25, 138, Tile.FelledLog);
  // The second oak felled out of turn, the east file's (27,128): the
  // same hand, the same spring, the same green log lying where it fell
  // because he will not haul it and will not say which of them is wrong.
  woodAt(27, 128, Tile.Stump);
  woodAt(28, 128, Tile.FelledLog);
  // The east file's two standing oaks, the shipped stands between the
  // felled one and the survey line, so the file still reads as a file.
  woodAt(30, 134, Tile.TreeOak);
  woodAt(34, 141, Tile.TreeOak);
  // Pebbles at the file's south end where the road's stone was dropped.
  ctx.detail(30, 145, Detail.Pebbles);
  // Honest stumps where last year's cut came out, marked and taken.
  for (const [x, y] of STUMPS) woodAt(x, y, Tile.Stump);
  // Saplings where the cut came out, the stand's next count.
  for (const [x, y] of SAPLINGS) woodAt(x, y, Tile.SaplingOak);
  // The yew at the copse's east hem: the butts' bow wood, this lane's
  // by box.
  woodAt(38, 161, Tile.TreeYew);
  // The dead one at the stand's south end, which he will not fell: a
  // stand that loses its dead loses its count (a solid cover prop, on
  // grass, off every door, route and post; registered tall).
  ctx.deadTree(18, 200);
  // Two logs going back to the wood on the copse floor, one seeded on
  // purpose for the table.
  b.set(15, 172, Tile.MushroomLog).set(20, 186, Tile.MushroomLogSeeded);
  // Mushrooms at the stands' feet, pebbles where the road's stone was
  // dropped, a tuft the axe missed.
  ctx.detail(14, 131, Detail.Mushroom);
  ctx.detail(25, 170, Detail.Mushroom);
  ctx.detail(10, 158, Detail.Mushroom);
  ctx.detail(19, 147, Detail.Pebbles);
  ctx.detail(8, 176, Detail.Tuft);

  // ================================================================
  // ALDER'S HUT AND THE LOG YARD. Door east toward the copse road; the
  // trade itself, ranked where the road can take it, and this spring
  // the road takes less.
  // ================================================================
  // Wood, door east onto his apron (PIN (29,160)), windows north, south
  // and west.
  b.building(20, 156, 10, 9, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 4 }],
    windows: [{ side: 'n', at: 5 }, { side: 's', at: 5 }, { side: 'w', at: 4 }],
  });
  ctx.door(29, 160);
  // His bed in the north-west corner, head north; lie (21,158), stand
  // (22,158).
  b.set(21, 157, Tile.Bed).set(21, 158, Tile.Bed);
  // The hearth on the west wall.
  b.set(21, 162, Tile.Hearth);
  // The cabinet under the north window.
  b.set(24, 157, Tile.Cabinet);
  // The table and chair.
  b.set(24, 161, Tile.Table).set(25, 161, Tile.Chair);
  // The tool rack inside the north-east corner: the axes come in at
  // night.
  b.set(27, 157, Tile.ToolRack);
  // The round rug, the mat inside the door.
  b.setDetail(23, 159, Detail.RugRound);
  b.setDetail(28, 160, Detail.Doormat);
  // Herb bundles drying on the north wall, the trellis on the south.
  b.setDetail(22, 156, herbBundlesDetail(1));
  b.setDetail(26, 164, trellisDetail(2));
  // Alder's post at the log yard's edge, facing west to his hut and the
  // stands; people.ts places the body.
  ctx.post(33, 159);
  // THE LOG YARD (ground G38): two logs down at the road side, waiting
  // on a road that takes less this spring.
  b.set(32, 155, Tile.FelledLog).set(33, 155, Tile.FelledLog);
  // The pile ranked side-on and the pile ranked end-on, sorted by what
  // the cart can take.
  b.set(32, 158, Tile.LogPile).set(35, 158, Tile.LogPileEndOn);
  // Split wood for the village's hearths.
  b.set(35, 161, Tile.Woodpile).set(36, 161, Tile.Woodpile);
  // The hand cart at the road's mouth.
  b.set(37, 155, Tile.HandCart);
  // The sawhorse at the yard's south end: a station, so its two south
  // rows (33,165) (33,166) hold nothing tall.
  b.set(33, 164, Tile.Sawhorse);
  ctx.station(33, 164);
  // Sawdust where the horse and the piles are worked.
  ctx.detail(34, 160, Detail.Sawdust);
  ctx.detail(33, 157, Detail.Sawdust);
  ctx.detail(36, 163, Detail.Sawdust);
  // The yard's stub at its north end and the board awning under it
  // where the marked logs are tallied dry (the awning host law holds).
  b.set(30, 151, Tile.WallWood).set(31, 151, Tile.WallWood);
  b.set(30, 152, awningTile('board', 6));
  // THE COPSE board at the road's mouth.
  const copseSign = ctx.pins.SIGN_LEDGER.copse;
  ctx.sign(copseSign.x, copseSign.y, copseSign.title, copseSign.lines, copseSign.tile);

  // ================================================================
  // THE SCRAP CRAG. Copper and tin at pick height; a seam face came
  // down in the spring rain (nobody was under it) and the Charter
  // posted a stake beside the cart because bronze is what its
  // enforcers carry and the count is taken where the cart loads.
  // ================================================================
  // The crag's bare rock, three outcrops framing the seams.
  b.set(12, 206, Tile.Rock).set(28, 210, Tile.Rock).set(20, 216, Tile.Rock);
  // Copper, two seams, exactly (PIN).
  b.set(14, 208, Tile.RockCopper).set(25, 206, Tile.RockCopper);
  // Tin, two seams, exactly (PIN).
  b.set(18, 212, Tile.RockTin).set(30, 214, Tile.RockTin);
  // The seam face that came down in the spring rain, between the
  // copper and the tin; nobody was under it.
  b.set(21, 209, Tile.SpoilHeap);
  // The mine cart at the tin's foot between the seams, where the ore
  // is loaded (FIX PASS 1, defect 11: up from (24,219), which the hem's
  // worldgen canopies hid).
  b.set(24, 214, Tile.MineCart);
  // The Charter's stake beside the cart: the count is taken where the
  // cart loads, because bronze is what its enforcers carry.
  b.set(26, 214, Tile.CharterPost);
  // Scree at the seams' feet.
  ctx.detail(16, 210, Detail.Pebbles);
  ctx.detail(26, 209, Detail.Pebbles);
  ctx.detail(22, 214, Detail.Pebbles);
  ctx.detail(13, 211, Detail.Pebbles);
  // THE SCRAP CRAG board at the crag's north edge.
  const cragSign = ctx.pins.SIGN_LEDGER.scrap_crag;
  ctx.sign(cragSign.x, cragSign.y, cragSign.title, cragSign.lines, cragSign.tile);
}
