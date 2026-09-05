/**
 * DAWNMEAD UNDER SIEGE (band 6) — cookhouse.ts [L4 EAST].
 *
 * Berrit's hall, feeding more than the table seats: her cot west, the
 * open hall under timber posts, the long table the whole village eats
 * at, and this year the benches that do not fit under it; the kitchen
 * garden picked to the stalks; the supper court with the ONE Campfire.
 *
 * SCENES / BOXES (brief §3; the box starts at y124 so the green's box
 * (L2, to y123) stands clear; the cook's way and the bake apron's
 * first rows are L1 ground outside it):
 *   D15 THE COOKHOUSE (111,124)-(140,149)
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G28 cook's way + bake apron + smoke yard + hall stone + supper
 *   court + garden threshold (117,139)
 * SIGNS IT QUEUES (strings FINAL in pins.SIGN_LEDGER):
 *   none: THE LONG TABLE (120,138) is CUT by FIX PASS 1 (defect 2:
 *   sixteen cols and fourteen rows from THE OLD GRANARY, one eyeful at
 *   the shipped camera); the hall and the pot speak, and "Wash your
 *   hands." is Berrit's bark.
 * CAST HOOKS (kept open; people.ts places the body):
 *   Berrit post (131.5,129.5) / wanders (127.5,131.5) (129.5,145.5) /
 *   night path (122,131) (119,131) (118,131) (114,128) / bed (113,128)
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands; gates authored open; wear is a wobbling one-wide Dirt line
 * or an ellipse, never a rectangle; one Signpost per eyeful. Never
 * b.sign / b.actor / b.npcSpawn / b.scatter* / b.spawn / b.raise /
 * b.stairs, or b.setDetail on open ground. CONTENT BOUNDARY holds; no
 * dashes in any player-facing string.
 */
import { Detail, Tile, herbBundlesDetail, sillHerbsDetail } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function cookhouse(ctx: DawnCtx): void {
  const { b } = ctx;

  ctx.box(111, 124, 140, 149, 'D15 THE COOKHOUSE');
  // FIX PASS 1 (defect 6): the inland edge-wood roll seeded a Tree on
  // the supper court's rim (126,149); the hall, the garden and the
  // court are worked ground and the woods keep off them.
  ctx.keepOut(111, 122, 140, 150, "the cookhouse: the hall, the garden and the supper court's rim");

  // ================================================================
  // D15 BERRIT'S HALL (feeding more than the table seats).
  // SENTENCE: her cot west, the open hall under timber posts, the long
  // table the whole village eats at, and this year the benches that
  // do not fit under it; she never discusses the winter.
  // ================================================================
  // Her cot: one room with the door east into the hall (PIN (119,131)).
  b.building(112, 126, 8, 11, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 5 }],
    windows: [{ side: 's', at: 3 }, { side: 'w', at: 4 }, { side: 'n', at: 4 }],
  });
  ctx.door(119, 131);
  // Her bed against the west wall, head north (PIN: lie (113,128),
  // stand (114,128)).
  b.set(113, 127, Tile.Bed).set(113, 128, Tile.Bed);
  // The cabinet at the bed's foot: her own crockery, not the hall's.
  b.set(113, 130, Tile.Cabinet);
  // The basin by the east wall: wash your hands.
  b.set(117, 127, Tile.Basin);
  // The herb rack: what the garden gave before it was picked to stalks.
  b.set(117, 130, Tile.HerbRack);
  // Jars in the south-west corner and baskets by the door.
  b.set(113, 134, Tile.GlazedJars).set(117, 134, Tile.BasketStack);
  // A round rug on the floor and the mat inside her door.
  b.setDetail(115, 129, Detail.RugRound);
  b.setDetail(118, 131, Detail.Doormat);
  // Herbs hung from the north beam and on the south sill.
  b.setDetail(113, 126, herbBundlesDetail(0));
  b.setDetail(115, 136, sillHerbsDetail(0));

  // The open hall (G28 laid its stone): six timber posts hold the roof.
  b.set(121, 126, Tile.TimberPost).set(133, 126, Tile.TimberPost);
  b.set(121, 136, Tile.TimberPost).set(133, 136, Tile.TimberPost);
  b.set(127, 126, Tile.TimberPost).set(127, 136, Tile.TimberPost);
  // The long table down the hall's middle, six boards long.
  for (let x = 124; x <= 129; x++) b.set(x, 131, Tile.Table);
  // The benches either side of it: the ones that fit.
  for (let x = 124; x <= 129; x++) b.set(x, 130, Tile.Bench).set(x, 132, Tile.Bench);
  // The hearth at the table's west head.
  b.set(123, 128, Tile.Hearth);
  // The CookPot (PIN singleton): a_bird_done_proper is cooked here.
  b.set(131, 128, Tile.CookPot);
  ctx.station(131, 128);
  // The bench by the pot end where whoever is waiting waits.
  b.set(131, 134, Tile.Bench);
  // Baskets and jars along the hall's west side, in reach of the hearth.
  b.set(122, 132, Tile.BasketStack).set(122, 129, Tile.GlazedJars);
  // Two stools by the pot for the ones who eat standing anyway.
  b.set(132, 130, Tile.WoodStool).set(132, 132, Tile.WoodStool);
  // A barrel and the parcels at the hall's south side: the week's
  // deliveries, tied.
  b.set(125, 135, Tile.Barrel).set(129, 135, Tile.TiedParcels);
  // NEW: the second bench pair, dragged in for the crofters at the
  // hall's south side, facing the table with (124,133) open behind it.
  b.set(124, 134, Tile.Bench).set(125, 134, Tile.Bench);
  // NEW: the crofters' bowls, crated by the pot end; they come at dusk
  // and go at dawn, and the crate leaves (132,133) (133,132) open.
  b.set(133, 133, Tile.CrateStack);
  // Pebbles on the hall's stone where the door and the pot are walked.
  ctx.detail(126, 134, Detail.Pebbles);
  ctx.detail(129, 128, Detail.Pebbles);

  // The bake line on the hall's north face, on its own apron (G28).
  // The grain sacks at the line's west end.
  b.set(122, 124, Tile.GrainSacks);
  // The woodpile, and NEW its double: three more bowls is not a number
  // that troubles a pot, but it troubles a woodpile.
  b.set(126, 124, Tile.Woodpile).set(127, 124, Tile.Woodpile);
  // The butcher block at the line's east end.
  b.set(130, 124, Tile.ButcherBlock);
  // Pebbles and sawdust on the apron where the block is worked.
  ctx.detail(128, 124, Detail.Pebbles);
  ctx.detail(132, 125, Detail.Sawdust);

  // The smoke yard east, downwind, on its own dirt (G28).
  // The spit, the smoker and the meat rack in a line down the yard.
  b.set(136, 127, Tile.MeatSpit);
  b.set(136, 130, Tile.Smoker);
  b.set(136, 133, Tile.MeatRack);
  // The brine barrel at the yard's east edge.
  b.set(138, 131, Tile.Barrel);
  // Pebbles where the smoke yard is walked.
  ctx.detail(137, 132, Detail.Pebbles);
  ctx.detail(136, 128, Detail.Pebbles);
  ctx.detail(137, 129, Detail.Pebbles);
  // Berrit's post at the pot (PIN), facing north into her work.
  ctx.post(131, 129);

  // SIGN: none. THE LONG TABLE board (120,138) is CUT (FIX PASS 1,
  // defect 2): it shared the true eyeful with THE OLD GRANARY; the
  // long table under its posts is the sign, and "Berrit feeds all
  // comers. Wash your hands." is her bark.

  // ================================================================
  // D15 THE KITCHEN GARDEN (picked to the stalks).
  // SENTENCE: the hedge ring behind her gable was the pot's own supply
  // until the pot started feeding three more bowls; she picked it to
  // the stalks in the spring and it will come back because gardens do.
  // ================================================================
  // The hedge ring x112..122 y140..148.
  for (let x = 112; x <= 122; x++) b.set(x, 140, Tile.Hedge).set(x, 148, Tile.Hedge);
  for (let y = 141; y <= 147; y++) b.set(112, y, Tile.Hedge).set(122, y, Tile.Hedge);
  // The arch, facing her own gable, on the threshold (117,139) G28 laid.
  b.set(117, 140, Tile.HedgeGate);
  ctx.door(117, 140);
  // Three rows picked to bare earth, and the two stalks she left: a
  // sagewort at the first row's head and a moonbell at the last row's
  // foot, so the garden remembers what it was.
  for (const gy of [142, 144, 146]) {
    for (let x = 114; x <= 120; x++) b.set(x, gy, Tile.Tilled);
  }
  b.set(114, 142, Tile.SagewortMid);
  b.set(120, 146, Tile.MoonbellMid);
  // The herb planter and the growing frame along the west hedge:
  // the seedlings for the garden that comes back.
  b.set(113, 142, Tile.HerbPlanter);
  b.set(113, 146, Tile.GrowingFrame);
  // The alembic and the drying rack along the east hedge: what little
  // she picked, drawn off and dried.
  b.set(121, 142, Tile.Alembic);
  b.set(121, 146, Tile.DryingRack);
  // The lantern between the garden and the court, lit for the supper.
  b.set(124, 139, Tile.StreetLantern);

  // ================================================================
  // D15 THE SUPPER COURT (the ONE Campfire).
  // SENTENCE: the village gathers at dusk on the dirt court behind the
  // garden where the cooking lesson happens; the fire is the only
  // Campfire in Dawnmead because the counted fire is the taught one.
  // ================================================================
  // The Campfire (PIN singleton) on the court's dirt (G28).
  b.set(129, 144, Tile.Campfire);
  ctx.station(129, 144);
  // Four benches round it, two a side, with the fire's ring open
  // between them for whoever is cooking.
  b.set(126, 142, Tile.Bench).set(132, 142, Tile.Bench);
  b.set(126, 147, Tile.Bench).set(132, 147, Tile.Bench);
  // The court's own woodpile at its east edge.
  b.set(134, 145, Tile.Woodpile);
  // Pebbles kicked round the fire's ring.
  ctx.detail(129, 146, Detail.Pebbles);
  ctx.detail(127, 144, Detail.Pebbles);
  ctx.detail(131, 143, Detail.Pebbles);
}
