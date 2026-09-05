/**
 * DAWNMEAD UNDER SIEGE (band 6) — works.ts [L4 EAST].
 *
 * Ottery's works: the trade you can read from the street; this year
 * the rack facing the lane holds spears and the log supply is short
 * because the stand is having a bad year (swords now, not stools).
 *
 * SCENES / BOXES (brief §3; the works' box ends at x154 on rows
 * 108..110 so the bridge's poles box (waterside.ts, x155..159
 * y108..117) stands clear of it; the forge's east column keeps its
 * own strip):
 *   D14 OTTERY'S WORKS (136,90)-(154,110): the room, the timber shed,
 *   the forge, the rack facing the lane
 *   D14 THE FORGE'S EAST END (155,90)-(158,107): the ingot rack, the
 *   grindstone, the coal store and the spear rack
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G27 yard (x138..156 y96..109), G6 the works' apron (y110)
 * SIGNS IT QUEUES (strings FINAL in pins.SIGN_LEDGER):
 *   OTTERY'S WORKS (148,109) Signpost (moved from (143,109), J16)
 * CAST HOOKS (kept open; people.ts places the body):
 *   Ottery post (139.5,99.5) / wander (152.5,100.5) r1.5 / night path
 *   (142,97) (142,96) (142,95) (139,93) (139,92) / bed (139,92);
 *   SpearRack (151,106) west of the WeaponRack (FIX PASS 1 defect 5); LogPile (139,103) and
 *   LogPileEndOn (144,102) CUT. The upstream BerryBush (154,92) in this
 *   box is waterside.ts's by the brief's word.
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
import { Detail, Tile, awningTile, wallArmsDetail, wallBannerDetail } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function works(ctx: DawnCtx): void {
  const { b } = ctx;

  ctx.box(136, 90, 154, 110, "D14 OTTERY'S WORKS");
  ctx.box(155, 90, 158, 107, "D14 THE FORGE'S EAST END");

  // ================================================================
  // D14 THE WORKS (swords now, not stools).
  // SENTENCE: the trade you can read from the street; this year the
  // rack facing the lane holds spears and the log supply is short
  // because the stand is having a bad year.
  // ================================================================
  // Ottery's own room at the yard's head, door south onto the yard
  // (PIN (142,96)); the shelf inside keeps every waker's first
  // mangled craft.
  b.building(138, 90, 10, 7, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 4 }],
    windows: [{ side: 'w', at: 3 }, { side: 'n', at: 6 }],
  });
  ctx.door(142, 96);
  // His bed in the west corner, head north (PIN: lie (139,92), stand
  // (139,93)).
  b.set(139, 91, Tile.Bed).set(139, 92, Tile.Bed);
  // The shelf of first things: every waker's first mangled craft.
  b.set(145, 91, Tile.Bookshelf);
  // The hearth in the east corner, lit when the forge is not.
  b.set(146, 94, Tile.Hearth);
  // The table and chair where he draws the next thing before he makes it.
  b.set(141, 94, Tile.Table).set(142, 94, Tile.Chair);
  // A round rug by the bed and the mat inside the door.
  b.setDetail(141, 92, Detail.RugRound);
  b.setDetail(142, 95, Detail.Doormat);
  // The guild banner on the north wall, the wrights' green.
  b.setDetail(143, 90, wallBannerDetail(4));

  // The timber shed: four posts and a board roof off the room's south
  // wall, and the whole run of wood under it (what is left of it).
  b.set(138, 99, Tile.TimberPost).set(138, 105, Tile.TimberPost);
  b.set(145, 99, Tile.TimberPost).set(145, 105, Tile.TimberPost);
  // The board roof at the shed's head (host law: the room's south wall
  // (146,96) (147,96) stands north of both tiles).
  b.set(146, 97, awningTile('board', 6)).set(147, 97, awningTile('board', 6));
  // The Workbench (PIN singleton): make your first thing.
  b.set(139, 98, Tile.Workbench);
  ctx.station(139, 98);
  // The sawhorse and the carving bench along the shed's north side.
  b.set(141, 98, Tile.Sawhorse);
  b.set(143, 98, Tile.CarvingBench);
  // The lumber rack by the bench, boards ranked by length.
  b.set(139, 101, Tile.LumberRack);
  // One felled log waiting for the saw: the short supply, whole.
  b.set(143, 102, Tile.FelledLog);
  // CUT: LogPile (139,103) and LogPileEndOn (144,102). The supply is
  // short because Alder's stand is having a bad year; the empty dirt
  // where the piles stood is the sentence.
  // The board stack in the yard's middle and the end-on pile beside it:
  // the work waiting its turn.
  b.set(147, 100, Tile.LumberRack).set(147, 102, Tile.LogPileEndOn);
  // Sawdust where the saw and the chisels work.
  ctx.detail(140, 99, Detail.Sawdust);
  ctx.detail(142, 100, Detail.Sawdust);
  ctx.detail(144, 104, Detail.Sawdust);
  ctx.detail(140, 104, Detail.Sawdust);
  ctx.detail(148, 101, Detail.Sawdust);
  ctx.detail(146, 104, Detail.Sawdust);

  // The forge: a stone wall for the fire's back, the working triangle,
  // and the fire facing the lane (a WALL_RUN member: no sign on it).
  for (let x = 151; x <= 155; x++) b.set(x, 96, Tile.WallStone);
  // The Furnace (PIN singleton): a bar of bronze comes out of it.
  b.set(151, 97, Tile.Furnace);
  ctx.station(151, 97);
  // The Anvil (PIN singleton) and the quench trough beside it.
  b.set(152, 100, Tile.Anvil);
  ctx.station(152, 100);
  b.set(153, 100, Tile.QuenchTrough);
  // The ingot rack against the wall's east end: the bronze that pays.
  b.set(155, 97, Tile.IngotRack);
  // The grindstone at the triangle's east point.
  b.set(155, 100, Tile.Grindstone);
  // The tool rack south of the furnace.
  b.set(151, 103, Tile.ToolRack);
  // The coal store against the east edge.
  b.set(155, 103, Tile.BarrelStack);
  // NEW: the charcoal, a second stack nearer the furnace; he burns it
  // faster than Alder cuts.
  b.set(149, 104, Tile.BarrelStack);
  // The wall arms over the furnace and the two shed awnings on the
  // forge wall (host law; the shipped dyes stay).
  b.setDetail(152, 96, wallArmsDetail(0));
  b.set(152, 97, awningTile('shed', 1)).set(154, 97, awningTile('shed', 1));
  // The finished-goods rack facing the lane, so a waker sees what a
  // bar of bronze is FOR before Amberford ever asks.
  b.set(153, 106, Tile.WeaponRack);
  // NEW (ruling Kit 12): the spear rack beside it, facing the lane.
  // Ottery built it; the wards draw from it. Swords now, not stools.
  // FIX PASS 1 (defect 5): it stands WEST of the weapon rack at
  // (151,106), not east at (155,106), which shared a column with the
  // bridge's BannerPole (155,108) two rows south and read as one
  // silhouette from the lane.
  b.set(151, 106, Tile.SpearRack);
  // Sawdust and pebbles where the forge's floor is walked.
  ctx.detail(152, 98, Detail.Sawdust);
  ctx.detail(154, 101, Detail.Pebbles);
  ctx.detail(152, 104, Detail.Pebbles);
  ctx.detail(150, 103, Detail.Pebbles);

  // The yard's south edge, opening onto the lane's shoulder: the
  // bench a customer sits on while Ottery finds the right chisel.
  b.set(146, 106, Tile.Bench);
  // The stool the customer's child sits on.
  b.set(145, 108, Tile.WoodStool);
  // Parcels by the board stack: an order tied and waiting for its cart.
  b.set(149, 98, Tile.TiedParcels);
  // The wheelbarrow at the apron where the charcoal comes in.
  b.set(148, 108, Tile.Wheelbarrow);
  // Goods crated for the road at the yard's west mouth.
  b.set(139, 108, Tile.CrateGoods).set(140, 108, Tile.Crate);
  // The lane's lamp at the works' west end (its east partner (157,109)
  // is the poles scene's).
  b.set(137, 109, Tile.LampPost);
  ctx.occluder(137, 109);
  // Ottery's post at the bench (PIN), facing north into his work.
  ctx.post(139, 99);

  // SIGN: OTTERY'S WORKS at (148,109) on the apron (moved from
  // (143,109): 23 cols from the DAWNMEAD post, J16).
  const sign = ctx.pins.SIGN_LEDGER.otterys_works;
  ctx.sign(sign.x, sign.y, sign.title, sign.lines, sign.tile);
}
