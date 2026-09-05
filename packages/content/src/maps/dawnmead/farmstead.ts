/**
 * DAWNMEAD UNDER SIEGE (band 6) — farmstead.ts [L3 NORTH].
 *
 * D8 THE FARMSTEAD (100,10)-(140,63): Brammel's ground at the top of
 * the world. The tilled fields with two rows gone to bare earth and
 * the pumpkins short two, the farmhouse with six beds, the barn and
 * the yard with the Charter's brass post where the cart backs in, the
 * kitchen strip the rats did not find, the coop with a second trap,
 * the silo the good years filled. Everything the shipped file built
 * stands verbatim (J19); the siege is in what is missing.
 *
 * SCENES / BOXES: THE FIELDS (98,14)-(136,32); THE FARMHOUSE
 * (100,33)-(114,48); THE BARN AND THE YARD + THE KITCHEN STRIP
 * (115,33)-(138,51) (x138, not the brief's x139: Weir's box (L4) must
 * begin at x139 or later; the rack and the crates at x138 are the
 * barn's); THE COOP (99,50)-(114,63) (x114 is the east rail; the silo
 * box begins at x115); THE SILO (115,52)-(119,63).
 * GROUND (L1): G18 the farm yard, the house threshold, the field gate
 * (PIN stop (112,32)); G19 the coop's penned dirt.
 * SIGNS: BRAMMEL'S FIELD (117,30). THE BARN is CUT (J16); THE COOP
 * (108,63) is CUT by FIX PASS 1 (defect 2: it shared the true 48x45
 * eyeful with THE ORCHARD and THE COMMON); its lines are barks.
 * CAST HOOKS (people.ts places the bodies): Brammel post (112.5,26.5)
 * + wander (112.5,22.5) r2.5 + bed foot (101,36); Tansy (104,36), Wick
 * (107,36), Sorrel (112,36) bed feet; chickens (107.5,56.5) r4 n5;
 * the farm cat (118.5,52.5) r2.5 n1; the hall floor (107,45) and the
 * door (107,46) stay open.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands for every lie; gates authored open (the coop's gate is the
 * gap in the run); wear is never a rectangle; one Signpost per eyeful.
 */
import {
  Detail,
  Tile,
  awningTile,
  herbBundlesDetail,
  sillHerbsDetail,
  trellisDetail,
  wallArmsDetail,
} from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function farmstead(ctx: DawnCtx): void {
  const { b } = ctx;

  // ================================================================
  // THE FIELDS
  // ================================================================
  // SENTENCE: Brammel's whole horizon; this year the carrot and onion
  // rows went to bare earth because the rats took the seed a season
  // early and there was no second sowing to buy, and the pumpkins are
  // short two, pulled green for the crofters' pot.
  ctx.box(98, 14, 136, 32, 'farmstead: the fields');

  // The tilled ground: six beds' worth, turned every spring for fifty
  // years, and this spring turned for nothing on two of them.
  b.fillRect(98, 16, 37, 15, Tile.Tilled);
  // Wheat and barley on the west beds by the shipped modulo: the two
  // crops that pay, and the two he sowed first.
  for (let x = 99; x <= 111; x++) {
    b.set(x, 17, x % 3 === 0 ? Tile.WheatRipe : Tile.WheatMid);
    b.set(x, 19, x % 2 === 0 ? Tile.BarleyRipe : Tile.BarleyMid);
  }
  // The carrot row (y22) and the onion row (y24) stay BARE Tilled: the
  // rats took the seed a season early and there was no second sowing
  // to buy. No tutorial quest collects them (verified), so the
  // emptiness costs nothing but the truth.
  // Cabbage and potato on the east beds by the shipped modulo: the
  // table's rows, which is his arithmetic and nobody corrects it.
  for (let x = 114; x <= 126; x++) {
    b.set(x, 18, x % 3 === 0 ? Tile.CabbageRipe : Tile.CabbageMid);
    b.set(x, 20, x % 2 === 0 ? Tile.PotatoRipe : Tile.PotatoMid);
  }
  // The pumpkin row by the shipped modulo, short two: (117,23) and
  // (121,23) pulled green for the crofters' pot.
  for (let x = 114; x <= 124; x++) {
    if (x === 117 || x === 121) continue;
    b.set(x, 23, x % 3 === 2 ? Tile.PumpkinRipe : Tile.PumpkinMid);
  }
  // The scarecrow minding all of it, north of his post, where the
  // crows and the rats both ignore it.
  b.set(112, 21, Tile.Scarecrow);
  // The leat stub off the brook's old channel, not extended: a leat
  // from a brook that is up a finger would contradict the drought he
  // speaks of, and he speaks of it every day.
  for (let y = 17; y <= 27; y++) b.set(129, y, Tile.IrrigationChannel);
  // Growing frames east of the leat: seedlings under glass, the only
  // second sowing he could afford.
  b.set(131, 18, Tile.GrowingFrame).set(132, 18, Tile.GrowingFrame);
  b.set(131, 21, Tile.GrowingFrame).set(132, 21, Tile.GrowingFrame);
  // The compost bin in the field's east corner: what the rats left
  // goes back in the ground.
  b.set(134, 24, Tile.CompostBin);
  // The wheelbarrow by the frames and the hand cart at the west end:
  // one man's two hands, parked where he last set them down.
  b.set(131, 27, Tile.Wheelbarrow);
  b.set(99, 28, Tile.HandCart);
  // Straw on the field's south rows where he spread it against a frost
  // that never came.
  ctx.detail(105, 27, Detail.Straw);
  ctx.detail(120, 27, Detail.Straw);
  // Brammel's post on the field's south edge, facing the village.
  ctx.post(112, 26);
  // BRAMMEL'S FIELD in his own voice: "Six beds, three crops, one man
  // who wants rain." Three crops are the ones that pay; the cabbage and
  // the potato are the table's. Fifteen rows from THE ORCHARD's board.
  const field = ctx.pins.SIGN_LEDGER.brammels_field;
  ctx.sign(field.x, field.y, field.title, field.lines, field.tile);

  // ================================================================
  // THE FARMHOUSE
  // ================================================================
  // SENTENCE: one long family room, six beds along the north wall,
  // the drover boarding at the east end because her yard has no roof.
  ctx.box(100, 33, 114, 48, 'farmstead: the farmhouse');

  // The farmhouse: fifteen by thirteen, the door on the yard (107,46),
  // windows on every side of the morning (kept verbatim).
  b.building(100, 34, 15, 13, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 7 }],
    windows: [
      { side: 's', at: 3 }, { side: 's', at: 11 },
      { side: 'w', at: 5 }, { side: 'e', at: 5 }, { side: 'n', at: 7 },
    ],
  });
  ctx.door(107, 46);
  // Four bed runs along the north wall, head north, PIN: Brammel by
  // the west wall, the twins in the middle, Sorrel boarding at the
  // east end (feet (101,36) (104,36) (107,36) (112,36); stands one
  // tile east of each).
  b.set(101, 35, Tile.Bed).set(101, 36, Tile.Bed);
  b.set(104, 35, Tile.Bed).set(104, 36, Tile.Bed);
  b.set(107, 35, Tile.Bed).set(107, 36, Tile.Bed);
  b.set(112, 35, Tile.Bed).set(112, 36, Tile.Bed);
  // Two cabinets between the beds: the family's and the drover's.
  b.set(102, 35, Tile.Cabinet).set(110, 35, Tile.Cabinet);
  // The round rug at the twins' feet.
  b.setDetail(105, 37, Detail.RugRound);
  // The hearth on the west wall: the one fire six people share.
  b.set(101, 40, Tile.Hearth);
  // The long table with a bench either side: six at supper and a
  // seventh when Sorrel's beasts are quiet.
  b.set(105, 41, Tile.Table).set(106, 41, Tile.Table).set(107, 41, Tile.Table);
  b.set(105, 40, Tile.Bench).set(106, 40, Tile.Bench).set(107, 40, Tile.Bench);
  b.set(105, 42, Tile.Bench).set(106, 42, Tile.Bench).set(107, 42, Tile.Bench);
  // The basin and the grain sacks on the east side: what the rats
  // left, inside where the cat sleeps.
  b.set(112, 39, Tile.Basin).set(113, 40, Tile.GrainSacks);
  // The churn and the glazed jars: butter for the market and pickles
  // for the winter, both lighter than last year.
  b.set(112, 44, Tile.ButterChurn).set(113, 43, Tile.GlazedJars);
  // Rugs inside the door and the doormat on the hall floor (PIN stop
  // (107,45) stays walkable).
  b.setDetail(106, 43, Detail.Rug).setDetail(107, 43, Detail.Rug);
  b.setDetail(107, 45, Detail.Doormat);
  // Herb bundles on the north wall, sill herbs in the south window,
  // the trellis on the east wall: the house was a garden before the
  // field was.
  b.setDetail(102, 34, herbBundlesDetail(2));
  b.setDetail(103, 46, sillHerbsDetail(1));
  b.setDetail(114, 41, trellisDetail(0));

  // ================================================================
  // THE BARN AND THE YARD (with THE KITCHEN STRIP between)
  // ================================================================
  // SENTENCE: hay goes out of the wain door on carts and the Charter
  // counts carts, so the Charter's brass post stands where the cart
  // backs in, and Brammel has not pulled it because pulling it would
  // be a statement.
  ctx.box(115, 33, 138, 51, 'farmstead: the barn and the yard');

  // The barn: the wide wain door on the yard, the mow, the tack side
  // (kept verbatim).
  b.building(122, 34, 15, 13, {
    wall: Tile.WallWood,
    floor: Tile.Dirt,
    doors: [{ side: 's', at: 7 }],
    windows: [{ side: 'n', at: 4 }, { side: 'n', at: 10 }],
  });
  // The wain door, two wide: a cart goes through it loaded.
  b.set(128, 46, Tile.DoorwayWoodWide).set(129, 46, Tile.DoorwayWoodWide);
  ctx.door(128, 46);
  ctx.door(129, 46);
  // The mow in the north-west corner: hay put up against winter, less
  // of it than the corner was built for.
  b.set(123, 35, Tile.HayBale).set(124, 35, Tile.HayBale).set(123, 36, Tile.HayBale);
  // Grain sacks against the east wall: the seed corn, what is left.
  b.set(135, 35, Tile.GrainSacks).set(135, 36, Tile.GrainSacks);
  // The feed trough on the tack side and the tool rack on the east
  // wall: where the beasts eat indoors and the tools hang.
  b.set(123, 43, Tile.FeedTrough);
  b.set(135, 43, Tile.ToolRack);
  // The fruit press: the orchard's windfalls come here in autumn.
  b.set(133, 39, Tile.FruitPress);
  // A crate and a barrel stack in the middle of the floor: the press
  // fills them.
  b.set(126, 39, Tile.Crate).set(127, 39, Tile.BarrelStack);
  // Two more bales by the press, the wheelbarrow and the sacks on the
  // tack side: the barn in use.
  b.set(130, 37, Tile.HayBale).set(131, 37, Tile.HayBale);
  b.set(126, 43, Tile.Wheelbarrow).set(131, 41, Tile.GrainSacks);
  // Straw on the barn floor where the bales shed it.
  b.setDetail(128, 42, Detail.Straw).setDetail(131, 44, Detail.Straw);
  b.setDetail(125, 44, Detail.Straw).setDetail(133, 37, Detail.Straw);
  // The wall arms over the mow: a farmer's boar spear, up where the
  // twins cannot reach.
  b.setDetail(124, 34, wallArmsDetail(1));
  // The lumber rack and the crate stack against the barn's east gable:
  // a rack is not a wall; Weir's house stands three clear of them.
  b.set(138, 41, Tile.LumberRack).set(138, 43, Tile.CrateStack);

  // The board awnings either side of the wain door on the south wall
  // (host law: the wall stands north of every awning), the barn's own
  // ochre.
  b.set(124, 47, awningTile('board', 6)).set(125, 47, awningTile('board', 6));
  b.set(133, 47, awningTile('board', 6)).set(134, 47, awningTile('board', 6));
  // The Charter's brass post on the yard, two columns east of the wain
  // door's apron, where the cart backs in: the Charter counts carts.
  b.set(131, 48, Tile.CharterPost);
  // The hand cart at the yard's west end and the woodpile at the east:
  // one hauls, the other waits for winter.
  b.set(116, 49, Tile.HandCart);
  b.set(134, 49, Tile.Woodpile);
  // The trough on the yard's south edge: the cows drink here on their
  // way down to the Common.
  b.set(120, 50, Tile.WaterTrough);
  // Barrels and a wheelbarrow on the yard: the barn's overflow.
  b.set(126, 49, Tile.BarrelStack).set(130, 50, Tile.Wheelbarrow);
  // Pebbles and straw on the yard's dirt: where the cart wheels bite
  // and where the bales shed. (The pebbles at (131,48) moved one east
  // for the Charter's post.)
  ctx.detail(122, 49, Detail.Pebbles);
  ctx.detail(132, 48, Detail.Pebbles);
  ctx.detail(128, 50, Detail.Straw);
  ctx.detail(118, 48, Detail.Straw);

  // THE KITCHEN STRIP. SENTENCE: the strip between house and barn is
  // the one garden the rats did not find because the cat sleeps in it.
  // The herb planter and the growing frame on the strip's west side.
  b.set(117, 38, Tile.HerbPlanter).set(117, 41, Tile.GrowingFrame);
  // The baskets and the broom and pail on its east side: the washing
  // goes out along this line.
  b.set(119, 36, Tile.BasketStack).set(119, 43, Tile.BroomAndPail);
  // Flowers on the strip: the one bed in Dawnmead the rats left alone.
  ctx.detail(118, 40, Detail.Flowers);
  ctx.detail(118, 37, Detail.Flowers);

  // ================================================================
  // THE COOP
  // ================================================================
  // SENTENCE: the hens roam the rail-penned dirt by the farmhouse where
  // the eggs can be found, and a second cage stands at the west rail
  // because the rats came back a season early and a farmer who wants
  // rain sets a second trap rather than wait.
  ctx.box(99, 50, 114, 63, 'farmstead: the coop');

  // The rails: RailWood on all four sides with the three-tile gap in
  // the south run (107..109,61) as the door, because the gap IS the
  // door and a hen does not work a latch (kept verbatim; ruling 14).
  ctx.pen(100, 51, 15, 11, {
    rail: Tile.RailWood,
    gaps: [{ side: 's', at: 7 }, { side: 's', at: 8 }, { side: 's', at: 9 }],
  });
  // The dovecote on the west side and the feed trough on the east: the
  // hens' two reasons to come home.
  b.set(103, 54, Tile.Dovecote);
  b.set(111, 54, Tile.FeedTrough);
  // The first critter cage inside the east rail (kept): the rats came
  // for the feed last year.
  b.set(112, 58, Tile.CritterCage);
  // The second cage outside the west rail, NEW (ruling Kit 12): the
  // rats came back a season early and he set a second trap rather
  // than wait for rain. FIX PASS 2: at (99,57) it shared an edge with
  // the orchard's skep (98,57); two rows south, one open tile from the
  // bees and still outside the rail.
  b.set(99, 59, Tile.CritterCage);
  // Straw across the penned dirt where the hens scratch and lay.
  ctx.detail(105, 56, Detail.Straw);
  ctx.detail(108, 58, Detail.Straw);
  ctx.detail(102, 59, Detail.Straw);
  ctx.detail(110, 53, Detail.Straw);
  // THE COOP board is CUT (FIX PASS 1, defect 2): the rails and the
  // hens speak for themselves, and at the true eyeful (48x45) a board
  // here shared a frame with THE ORCHARD and THE COMMON. "Hens roam.
  // Eggs happen. Shut nothing behind you." is Brammel's bark now.

  // ================================================================
  // THE SILO
  // ================================================================
  // SENTENCE: the barn's overflow the good years filled and this year
  // did not.
  ctx.box(115, 52, 119, 63, 'farmstead: the silo');
  // The silo between the coop and the Common's north gate: tall, and
  // nothing with a door, a board or a post stands north of it.
  b.set(117, 55, Tile.Silo);
  // Long grass at the pasture's shoulder where the stray eggs end up
  // (two of the shipped four; the other two stood on the walk and the
  // sign's approach).
  b.set(116, 63, Tile.GrassTall).set(119, 60, Tile.GrassTall);
}
