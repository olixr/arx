/**
 * DAWNMEAD UNDER SIEGE (band 6) — butts.ts [L5 SOUTH].
 *
 * D18 THE LONG BUTTS + RILL'S SHED.
 *
 * SCENES / BOXES (brief §3, declared with ctx.box):
 *   (39,146)-(83,189): the fence x43..81 y153..168 with the north
 *   FenceGate (47..48,153) and Rill's gate (52..53,168); the marks; the
 *   shelter; RILL'S SHED (46,174)-(57,183) and the whittling stump. The
 *   brief's box reached y190; it is trimmed to y189 because row 190 is
 *   the first row of THE SPARK CIRCLE's box and nothing here stands on it.
 * GROUND (laid by L1 ground.ts before this runs): G34 the school road
 *   + the gate approach (48,151) (48,152) (47,152), G35 the shooting
 *   ground + the three marks, G36 Rill's home way.
 * SIGNS: THE LONG BUTTS (69,148) Signpost; RILL'S SHED (59,173) HangingSign.
 * CAST HOOKS: Rill's post (48.5,160.5) dir 0, wander (50.5,160.5) r2,
 *   her night path (52,168) (52,174) (52,175) (48,176), her bed
 *   (47,175)/(47,176); the shipped east gate (84,161-162) is CUT.
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
import { Detail, Tile, awningTile, bracketSignDetail, pennantDetail } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function butts(ctx: DawnCtx): void {
  const { b } = ctx;
  ctx.box(39, 146, 83, 189, "butts: the range and Rill's shed");

  // ================================================================
  // THE BUTTS (fence x43-81, north gate). A range is grass, worn only
  // where feet stand and arrows land; loose only east, so you come in
  // where the bow is strung and never downrange.
  // ================================================================
  // The fence: a lane running west to east, closed at the east end
  // because the east fence is the last backstop (the shipped downrange
  // gate is cut, J5).
  b.outlineRect(43, 153, 39, 16, Tile.Fence);
  // The walk-in from the school road, two gate leaves at the shooting
  // line, seven rows north of her post and two cols east of the
  // shelter's wall: you enter where the bow is strung.
  b.set(47, 153, Tile.FenceGate).set(48, 153, Tile.FenceGate);
  ctx.door(47, 153);
  ctx.door(48, 153);
  // Rill's own way home through the south fence (PIN (52,168)).
  b.set(52, 168, Tile.FenceGate).set(53, 168, Tile.FenceGate);
  ctx.door(52, 168);
  ctx.door(53, 168);
  // THE SHOOTING LINE, dressed stone at the west end: the only stone on
  // a range that is otherwise grass and worn dirt.
  for (let y = 156; y <= 165; y++) b.set(46, y, Tile.StoneFloor);
  // Rill's post on the line, facing east down the range; people.ts
  // places the body.
  ctx.post(48, 160);

  // THREE MARKS: ten paces, twenty, thirty. Each is a real butt: a stack
  // of straw, a fence behind it so nothing walks out the back, and a
  // stake at its shoulder that says how far you just shot.
  const butt = (bx: number, dummy: boolean): void => {
    // The straw, four high, a dummy in the stack where the mark is a
    // body and not a bale.
    b.set(bx + 3, 158, Tile.HayBale).set(bx + 3, 159, Tile.HayBale);
    b.set(bx + 3, dummy ? 161 : 160, dummy ? Tile.TargetDummy : Tile.HayBale);
    b.set(bx + 3, 162, Tile.HayBale);
    // The backstop, right behind the straw.
    for (let y = 157; y <= 163; y++) b.set(bx + 4, y, Tile.Fence);
    // The range stake at the mark's shoulder.
    b.set(bx, 158, Tile.TimberPost);
    // Straw pulled out of the butt by the arrows and not put back.
    ctx.detail(bx + 2, 160, Detail.Straw);
    ctx.detail(bx + 4, 162, Detail.Straw);
    ctx.detail(bx + 1, 163, Detail.Straw);
  };
  butt(56, false);
  butt(66, true);
  butt(76, true);
  // Spare bales, dragged clear of the lanes so nobody shoots round one.
  b.set(74, 165, Tile.HayBale).set(64, 156, Tile.HayBale);

  // THE SHELTER on the line: posts, a bowed canopy and the day's tackle,
  // where she stands when it rains, which is often.
  b.set(44, 156, Tile.WallWood).set(45, 156, Tile.WallWood);
  b.set(44, 157, Tile.WallWood).set(44, 158, Tile.WallWood);
  // The bowed canopy south of its posts (the awning host law holds:
  // (44,158) and (45,156) are wall).
  b.set(44, 159, awningTile('bowed', 4)).set(45, 157, awningTile('bowed', 4));
  // Her wind-tell on the shelter's post, not a fete's pennant: she
  // reads it before every loose.
  b.setDetail(44, 156, pennantDetail(4));
  // The tackle rack under the canopy, the bench for whoever is not
  // shooting, the water barrel at the shelter's foot.
  b.set(45, 158, Tile.ToolRack);
  b.set(45, 161, Tile.Bench).set(45, 164, Tile.Barrel);
  // The arrow store and the day's tackle on the line's east side.
  b.set(48, 156, Tile.CrateGoods).set(49, 156, Tile.Barrel);
  // The stool she sits on to nock, the baskets the arrows come back in.
  b.set(48, 165, Tile.WoodStool).set(50, 163, Tile.BasketStack);
  // Pebbles where the line is stood and straw where the baskets spill.
  ctx.detail(46, 158, Detail.Pebbles);
  ctx.detail(46, 163, Detail.Pebbles);
  ctx.detail(48, 160, Detail.Pebbles);
  ctx.detail(50, 158, Detail.Pebbles);
  ctx.detail(49, 164, Detail.Straw);
  // THE BOW WOOD, growing where the bowyer can see it: a yew, a willow
  // for the arrows, and the sapling she planted for the bows after
  // hers (TreeYew (38,161) is copse.ts's by box).
  b.set(40, 156, Tile.TreeYew);
  b.set(41, 166, Tile.TreeWillow);
  b.set(39, 152, Tile.SaplingYew);
  // THE LONG BUTTS board, two rows north of the school road (J16).
  const rangeSign = ctx.pins.SIGN_LEDGER.long_butts;
  ctx.sign(rangeSign.x, rangeSign.y, rangeSign.title, rangeSign.lines, rangeSign.tile);

  // ================================================================
  // RILL'S SHED (she whittles when worried). Door on the range side;
  // this spring more staves than bows, and the shavings have reached
  // three tiles.
  // ================================================================
  // The fletcher's shed south of the range, door north onto her home
  // way (PIN (52,174)).
  b.building(46, 174, 12, 10, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 6 }],
    windows: [{ side: 'n', at: 2 }, { side: 'w', at: 4 }, { side: 'e', at: 6 }],
  });
  ctx.door(52, 174);
  // Her bed in the north-west corner, head north; lie (47,176), stand
  // (48,176).
  b.set(47, 175, Tile.Bed).set(47, 176, Tile.Bed);
  // The cabinet of feathers and glue.
  b.set(50, 175, Tile.Cabinet);
  // The hearth in the south-west corner.
  b.set(47, 181, Tile.Hearth);
  // The fletcher's bench under the east window, where the arrows are made.
  b.set(53, 176, Tile.FletchersBench);
  // The stave rack: staves on edge between the pegs, more than bows now.
  b.set(55, 176, Tile.LumberRack);
  // The drying rack for the sinew and the glue.
  b.set(55, 179, Tile.DryingRack);
  // Her table and chair.
  b.set(53, 181, Tile.Table).set(54, 181, Tile.Chair);
  // The crate of finished arrows and the crate of nothing yet.
  b.set(50, 182, Tile.CrateGoods).set(51, 182, Tile.Crate);
  // The round rug, the mat inside the door, the bracket sign over it.
  b.setDetail(49, 179, Detail.RugRound);
  b.setDetail(52, 175, Detail.Doormat);
  b.setDetail(51, 174, bracketSignDetail(3));
  // Sawdust by the hearth where the shed's own whittling happens in
  // weather.
  b.setDetail(48, 182, Detail.Sawdust);
  // THE WHITTLING STUMP east of the shed, and the stool she sits on
  // when she is worried, which is more often this spring.
  b.set(60, 176, Tile.Stump);
  b.set(60, 178, Tile.WoodStool);
  // The second stave rack, outside by the stump: staves roughed out and
  // not finished, because a stave is what worry makes.
  b.set(62, 177, Tile.LumberRack);
  // The shavings have reached three tiles.
  ctx.detail(59, 177, Detail.Sawdust);
  ctx.detail(60, 177, Detail.Sawdust);
  ctx.detail(61, 177, Detail.Sawdust);
  // RILL'S SHED shingle on the frontage.
  const shedSign = ctx.pins.SIGN_LEDGER.rills_shed;
  ctx.sign(shedSign.x, shedSign.y, shedSign.title, shedSign.lines, shedSign.tile);
}
