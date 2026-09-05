/**
 * DAWNMEAD UNDER SIEGE (band 6) — spark.ts [L5 SOUTH].
 *
 * D19 THE SPARK CIRCLE + VARN'S HUT.
 *
 * SCENES / BOXES (brief §3, declared with ctx.box):
 *   (39,190)-(97,222): the pillars, runestones and braziers on the pad,
 *   the arch, the test stones, AshHeap (87,202) over Ash + CrateGoods
 *   (88,203) on the east verge, VARN'S HUT (42,194)-(53,204). The
 *   brief's box began at x38; it is trimmed to x39 because column 38 is
 *   THE COPSE's box and nothing here stands on it.
 * GROUND (laid by L1 ground.ts before this runs): G37 the spark way +
 *   Varn's way, G39 the pad + the burnt heart, G42 the verge ash (87,202).
 * SIGNS: THE SPARK CIRCLE (78,194) Signpost; VARN'S DOOR (56,202) HangingSign.
 * CAST HOOKS: Varn's post (74.5,198.5) dir π/2, wanders (74.5,200.5)
 *   (74.5,194.5) r2, his night path (60,199) (53,199) (52,199) (44,196),
 *   his bed (43,195)/(43,196); Crate (88,197) is CUT.
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
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function spark(ctx: DawnCtx): void {
  const { b } = ctx;
  ctx.box(39, 190, 97, 222, "spark: the circle and Varn's hut");

  // ================================================================
  // THE CIRCLE. Fifty years of lessons landed on the burnt heart; stand
  // outside the stones until Varn says otherwise.
  // ================================================================
  // Six standing pillars on the pad's ring, the stones the lessons are
  // stood outside of.
  for (const [px, py] of [[74, 195], [82, 197], [82, 207], [66, 207], [66, 197], [74, 209]] as const) {
    b.set(px, py, Tile.PillarStone);
  }
  // Two runestones east and west, the ring's old readings.
  b.set(85, 202, Tile.Runestone).set(63, 202, Tile.Runestone);
  // Four braziers at the quarters, lit for the evening lessons.
  b.set(70, 199, Tile.Brazier).set(78, 199, Tile.Brazier);
  b.set(70, 205, Tile.Brazier).set(78, 205, Tile.Brazier);
  // The ward arch on the way in, and the lamp before it.
  b.set(75, 193, Tile.ArchStone).set(76, 193, Tile.WardArch).set(77, 193, Tile.ArchStone);
  b.set(74, 192, Tile.LampPost);
  // Varn's post inside the arch, facing south over the heart; people.ts
  // places the body.
  ctx.post(74, 198);
  // THE BURNT HEART's pebbles: where fifty years of lessons have landed.
  for (const [px, py] of [
    [74, 202], [73, 201], [75, 203], [72, 202], [76, 202], [74, 200], [74, 204],
    [70, 199], [78, 205], [69, 203], [79, 201],
  ] as const) ctx.detail(px, py, Detail.Pebbles);
  // THE TEST STONES east of the pad: cracked, tipped and honestly earned.
  b.set(88, 200, Tile.BrokenPillar).set(90, 204, Tile.Rock);
  b.set(87, 208, Tile.CrystalCluster);
  // The stave rack at the pad's north-east, the practice staves.
  b.set(86, 194, Tile.WeaponRack);
  // Where the reading happens when the weather allows it: the lectern
  // and the stool on the pad's west side.
  b.set(63, 196, Tile.Lectern).set(62, 198, Tile.WoodStool);
  // The rune pillar south-west of the pad, the oldest lesson.
  b.set(60, 210, Tile.RunePillar);
  // Two dummies south of the pad for what the spark is aimed at.
  b.set(64, 213, Tile.TargetDummy).set(84, 212, Tile.TargetDummy);
  // Pebbles where the stool, the rack and the dummies are stood at.
  ctx.detail(64, 197, Detail.Pebbles);
  ctx.detail(87, 196, Detail.Pebbles);
  ctx.detail(65, 214, Detail.Pebbles);
  ctx.detail(85, 213, Detail.Pebbles);
  // THE SAMPLES on the east verge where the light lasts longest: Varn
  // barrowed a load of the cottage ash to the pad's edge and has been
  // testing it since (the ash beneath is G42's).
  b.set(87, 202, Tile.AshHeap);
  // The crate holds what he bagged, marked in a hand nobody reads;
  // "samples" is his bark, not a posture (ruling Kit 13).
  b.set(88, 203, Tile.CrateGoods);
  // THE SPARK CIRCLE board at the arch's east side.
  const circleSign = ctx.pins.SIGN_LEDGER.spark_circle;
  ctx.sign(circleSign.x, circleSign.y, circleSign.title, circleSign.lines, circleSign.tile);

  // ================================================================
  // VARN'S HUT. The reading shelter: half-read books, all open.
  // ================================================================
  // Wood, door east onto his way (PIN (53,199)), windows north, west
  // and south.
  b.building(42, 194, 12, 11, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 5 }],
    windows: [{ side: 'n', at: 6 }, { side: 'w', at: 4 }, { side: 's', at: 6 }],
  });
  ctx.door(53, 199);
  // His bed in the north-west corner, head north; lie (43,196), stand
  // (44,196).
  b.set(43, 195, Tile.Bed).set(43, 196, Tile.Bed);
  // Three shelves of books along the north wall, none of them shut.
  b.set(46, 195, Tile.Bookshelf).set(47, 195, Tile.Bookshelf).set(48, 195, Tile.Bookshelf);
  // The hearth on the west wall.
  b.set(43, 199, Tile.Hearth);
  // The lectern in the middle of the floor and the tome open beside it.
  b.set(46, 199, Tile.Lectern).set(48, 200, Tile.ArcaneTome);
  // The table and chair where he eats over a book.
  b.set(46, 202, Tile.Table).set(47, 202, Tile.Chair);
  // The cabinet by the door and the candle stand by the south window.
  b.set(51, 197, Tile.Cabinet).set(51, 202, Tile.CandleStand);
  // The round rug, the mat inside the door, the two tapestries.
  b.setDetail(45, 197, Detail.RugRound);
  b.setDetail(52, 199, Detail.Doormat);
  b.setDetail(44, 194, Detail.Tapestry).setDetail(45, 194, Detail.Tapestry);
  // The way shrine at his door, where the wakers leave what they were
  // told to.
  b.set(55, 199, Tile.WayShrine);
  // VARN'S DOOR shingle at the frontage's south-east.
  const doorSign = ctx.pins.SIGN_LEDGER.varns_door;
  ctx.sign(doorSign.x, doorSign.y, doorSign.title, doorSign.lines, doorSign.tile);
}
