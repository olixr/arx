import { Detail, Tile } from '@arx/shared';
import { KINGSDELF_RECT } from '../geography.js';
import { UNDERWORLD_PLANE_ID } from '../planes.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * KINGSDELF — the town in the King's Delf (the seventh town; the
 * Kingsdelf epic, docs/kingsdelf-plan.md). Level 50-60: the Overband's
 * town.
 *
 * The delf cut the Old Crown's stone until the Brandfall ended the old
 * realm a hundred and fifty years ago; the Silver Line's first king
 * was foreman here the day the deep workings were sealed with the
 * night shift inside — 214 names on the stone, 215 marks. Eighteen
 * years ago the Returning came back down the unlit road for the ore
 * the fire seeded, and the town stands INSIDE the quarry: the
 * mountain's toe closes the north as two worked crag shelves, the
 * benches and the floor descend southward, and the Ashmere — the
 * drowned lower workings — receives the south-west, quay and all.
 *
 * THE ECONOMY: ore and glass and light. Mithril and adamant in the
 * town's own Delfworks faces (the only safe high-ore in the game);
 * obsidian and starfall OUT in the burn at Overband prices; starfall
 * glass from the Glasshouse; cut stone as ever. It buys everything
 * else: Amberford grain, Pinewatch boards, Hartfell tallow for the
 * lamps. THE LIMITS: no loom, no crops, no chapel, no castle, no
 * sawmill. The bank is the Charter's countinghouse built against the
 * east shelf's rock face.
 *
 * THE TOWN-PLAN LAW (Amberford's, restated): streets first; every
 * building fronts a street or the round; >=3 open tiles between
 * structures; ROOM INTENT — one job per room, furniture proves it.
 * Materials: mortared ashlar out of the delf itself — stone walls,
 * stone floors; timber is an import the town spends like spice.
 * DIAGONAL BUDGET: five statements — the east gate tower pair, the
 * Glasshouse kiln, the Countinghouse face, the Sealed Stair front,
 * the crane base by the Unfinished Stone. All else honest and blocky.
 *
 * THE WATERS: the Ashmere owns the south-west; the south curtain's
 * west end dies into it (the mole law) and the quay works the shore
 * OUTSIDE the water gate. The Sump — the cold spring that made the
 * pocket livable — rises on the floor east of the round and spends
 * itself south toward the mere without ever piercing the curtain
 * (the tailrace law: the run stops at the wall; the fiction owns the
 * culvert).
 *
 * ANCHORS THAT MUST NOT MOVE (routes + tests pin these):
 *  - EAST GATE: the Old Road lands at local (126,20) (world -194,260);
 *    mouth fill rows 19-21 reach the border; the curtain gate stands
 *    at x121 with the tower pair flanking.
 *  - NORTH WICKET: the Processional leaves at local (60,0) (world
 *    -260,240) through the notch between the crag shelves.
 *  - Zone spawn (62.5, 65.5) on the market round beside the
 *    Unfinished Stone = the south-west's respawn hearth.
 *  - The Unfinished Stone (55-59, 61-64); the Sealed Stair front
 *    against the west shelf face (34-40, 25-27), names-stone beside.
 *  - The Countinghouse against the east shelf face (84-96, 17-27);
 *    vault room windowless; BankChest x2 = the bank probes.
 *
 * THE PEOPLE (the casting pass keeps this roster; rooms are promised
 * here): delfmaster_ruen (the Delfhall), factor_venn (Countinghouse),
 * sealkeeper_annik (the keeper hut by the Sealed Stair),
 * innkeep_brekka (the Foreman's Rest), stablemaster_orin (the
 * Beastyard), smith_ferrun (the Starfall Forge), glasswright_mirena
 * (the Glasshouse), enchanter_veyle (the Focus House), assayer_lorn
 * (the assay house), lampwright_soren (the Flamehouse, west shelf),
 * waykeeper_liv (the east gate post), surveyor_hedda (lodges at the
 * Rest), provisioner_etta + outfitter_cass (the round's shops),
 * salvewright_ida (the dispensary), fisher_denna (the quay shack),
 * broker_slate (the hatch — placed with the Company pass),
 * kingsdelf_watch x4, kingsdelf_delver x3, kingsdelf_glasshand x2.
 */

const R = KINGSDELF_RECT;

export function buildKingsdelf(): ZoneDef {
  const b = new ZoneBuilder('kingsdelf', 'Kingsdelf', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE WATERS FIRST — the Ashmere decides the south-west. The
  // drowned workings lap into the corner as a broad grey arm: deep
  // past the old bench line, wading over the sunken spoil, ash-silt
  // sand at the beach. The wobble keeps every ruler off the
  // waterline (the Hartfell law).
  // ---------------------------------------------------------------
  for (let y = 56; y < R.h; y++) {
    const reach = y - 56 + Math.round(Math.sin(y * 0.65) * 1.6);
    const edge = Math.max(0, Math.min(R.w - 1, reach));
    for (let x = 0; x <= edge; x++) {
      b.set(x, y, x <= edge - 4 ? Tile.Water : Tile.WaterShallow);
    }
    if (edge + 1 < R.w && b.get(edge + 1, y) === Tile.Grass) b.set(edge + 1, y, Tile.Sand);
  }
  // The west flank strand above the arm: sand where meadow meets it.
  for (let y = 50; y <= 55; y++) {
    const s = Math.round(Math.sin(y * 0.5));
    for (let x = 0; x <= 1 + s; x++) {
      if (b.get(x, y) === Tile.Grass) b.set(x, y, Tile.Sand);
    }
  }

  // ---------------------------------------------------------------
  // THE WORKING FACE — the mountain's toe closes the north as two
  // raised crag shelves; their auto-fenced cliffs ARE the north
  // wall. Between them the wicket notch stays at grade: the
  // Processional's door, walled by living rock on both hands. Each
  // shelf steps L2 crown -> L1 walk -> floor by south flights (the
  // stair law), so the upper town is real ground, not backdrop.
  // ---------------------------------------------------------------
  b.raise(2, 2, 54, 22, 1); // west shelf walk: lx 2-55, ly 2-23
  b.raise(2, 2, 54, 10, 2); // west shelf crown: ly 2-11
  b.raise(66, 2, 60, 14, 1); // east shelf walk: lx 66-125, ly 2-15
  b.raise(66, 2, 60, 8, 2); // east shelf crown: ly 2-9
  // Flights. West: crown->walk at the Flamehouse court, walk->town
  // twice (the Bench Stair by the Sealed Stair, the West Stair by
  // the Delfworks). East: crown->walk at the lookout, walk->town
  // above the Countinghouse court.
  b.stairs(26, 11).stairs(27, 11).stairs(28, 11);
  b.stairs(26, 23).stairs(27, 23).stairs(28, 23);
  b.stairs(46, 23).stairs(47, 23).stairs(48, 23);
  b.stairs(86, 9).stairs(87, 9).stairs(88, 9);
  b.stairs(74, 15).stairs(75, 15).stairs(76, 15);
  b.stairs(108, 15).stairs(109, 15).stairs(110, 15);

  // ---------------------------------------------------------------
  // THE STREETS — laid before anything was allowed to stand on them.
  // ---------------------------------------------------------------
  // The Processional's town half FIRST (dirt yields to paving where
  // the streets cross it — the town maintains its stone): dirt from
  // the wicket, down the notch, dying into the Market Walk.
  b.fillRect(59, 0, 3, 24, Tile.Dirt);
  b.path({ x: 60, y: 24 }, { x: 60, y: 44 }, 2, Tile.Dirt);
  // The Gate Street: the east gate west under the shelf, then the
  // Descent south to the round.
  b.path({ x: 124, y: 20 }, { x: 70, y: 20 }, 3);
  b.path({ x: 70, y: 20 }, { x: 70, y: 60 }, 3);
  // The Market Walk: Delfworks to Glasshouse across the floor.
  b.path({ x: 26, y: 44 }, { x: 96, y: 44 }, 2);
  // The Floor Lane: the round south-west to the water gate.
  b.path({ x: 62, y: 70 }, { x: 45, y: 84 }, 2);
  // The east gate mouth: paving reaches the border so the Old Road
  // lands tile-exact at (126,20).
  b.fillRect(122, 19, 6, 3, Tile.Path);

  // ---------------------------------------------------------------
  // THE MARKET ROUND + THE UNFINISHED STONE — the one image. The
  // monument block the old realm never finished: crisp chisel
  // lines, rotted rope stubs, and a town that grew around it the
  // way a town grows around a well. Nobody will finish it and
  // nobody will break it.
  // ---------------------------------------------------------------
  b.fillEllipse(61, 65, 12, 8, Tile.StoneFloor);
  b.fillRect(55, 61, 5, 4, Tile.Rock); // the Stone itself — solid, climbless
  b.set(54, 62, Tile.PillarStone).set(60, 64, Tile.PillarStone); // the sheer-legs stubs
  b.sign(53, 66, 'THE UNFINISHED STONE', [
    'the last order of the old crown',
    'never countermanded',
    'mind your barrows around it',
  ], Tile.Signpost);
  // The crane base: the old mast crane's octagon footing, the round's
  // second statement — a diagonal-budget spend.
  b.set(68, 60, Tile.PillarStone).set(69, 60, Tile.PillarStone);
  b.set(67, 61, Tile.PillarStone).set(70, 61, Tile.PillarStone);
  b.set(68, 62, Tile.PillarStone).set(69, 62, Tile.PillarStone);

  // ---------------------------------------------------------------
  // THE SUMP — the cold spring that made the pocket livable. It
  // rises east of the round, pools, and spends itself south toward
  // the mere; the run stops inside the curtain (the tailrace law).
  // Pale sump-fish live in the pool and nowhere else.
  // ---------------------------------------------------------------
  b.fillEllipse(84, 72, 4, 3, Tile.WaterShallow);
  b.fillEllipse(84, 72, 2, 1.4, Tile.Water);
  const SUMP_RUN: Array<[number, number]> = [
    [83, 75], [82, 76], [82, 77], [81, 78], [81, 79], [80, 80], [80, 81], [79, 82], [79, 83],
  ];
  for (const [x, y] of SUMP_RUN) b.set(x, y, Tile.WaterShallow);
  b.set(80, 69, Tile.Bench).set(88, 71, Tile.Bench);
  b.sign(88, 75, 'THE SUMP', [
    'the one sweet water in the ash',
    'wash downstream of the drinking steps',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE COUNTINGHOUSE — the Charter's money in an ash-country coat,
  // fronting the Gate Street so every ore wain rolls past its door.
  // Lobby with the teller counter, and the vault room behind it:
  // windowless, the law of every bank in the Dawnlands. Venn counts
  // profit out loud and courage quietly.
  // ---------------------------------------------------------------
  b.building(84, 23, 13, 9, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 5 }, { side: 'n', at: 6 }],
    windows: [{ side: 'n', at: 2 }, { side: 'n', at: 10 }, { side: 'e', at: 3 }],
  });
  b.set(89, 23, Tile.DoorwayStoneWide).set(90, 23, Tile.DoorwayStoneWide);
  // The Countinghouse face: the diagonal budget's third statement —
  // chamfered front shoulders, cut like the block it is.
  b.set(84, 23, Tile.WallStoneDiagNW).set(96, 23, Tile.WallStoneDiagNE);
  // Teller line with the one gap; the vault wall behind.
  for (let x = 86; x <= 93; x++) b.set(x, 26, Tile.Counter);
  b.set(90, 26, Tile.StoneFloor); // the teller gap
  for (let x = 85; x <= 95; x++) b.set(x, 27, Tile.WallStone);
  b.set(90, 27, Tile.DoorwayStone);
  b.set(86, 29, Tile.Vault).set(89, 29, Tile.Vault).set(92, 29, Tile.Vault).set(95, 29, Tile.Vault);
  b.set(86, 25, Tile.BankChest).set(94, 25, Tile.BankChest); // the public floor
  b.set(92, 24, Tile.Table).set(93, 24, Tile.Chair); // Venn's ledger desk
  b.setDetail(89, 24, Detail.Rug).setDetail(90, 24, Detail.Rug);
  b.sign(88, 22, 'THE COUNTINGHOUSE', [
    'the amberford charter, kingsdelf seat',
    'ore weighed is coin banked',
  ]);

  // ---------------------------------------------------------------
  // THE SEALED STAIR — the door the town keeps instead of a chapel.
  // The masonry front stands against the west shelf's face where the
  // deep workings went down; the Guild's seal has held a hundred and
  // fifty years, and Annik feeds the braziers so the names are never
  // read in the dark. 214 names. 215 marks.
  // ---------------------------------------------------------------
  for (let x = 34; x <= 40; x++) b.set(x, 24, Tile.CaveWall);
  b.set(34, 25, Tile.CaveWall).set(40, 25, Tile.CaveWall);
  b.set(35, 25, Tile.CaveWall).set(39, 25, Tile.CaveWall);
  b.set(37, 25, Tile.ArchStone); // the sealed mouth
  b.set(36, 25, Tile.CaveWall).set(38, 25, Tile.CaveWall);
  b.set(35, 26, Tile.Brazier).set(39, 26, Tile.Brazier);
  b.set(41, 25, Tile.PillarStone); // the names-stone
  b.set(37, 26, Tile.StoneFloor).set(37, 27, Tile.StoneFloor); // the swept step
  b.sign(42, 26, 'THE NAMES-STONE', [
    'two hundred and fourteen names',
    'count the marks yourself',
    'leave the lamp burning',
  ], Tile.Signpost);
  // Annik's hut: the Sealkeeper lives beside the door she keeps.
  b.building(25, 30, 7, 7, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'e', at: 3 }],
    windows: [{ side: 's', at: 3 }],
  });
  b.set(26, 31, Tile.Bed).set(26, 34, Tile.Hearth);
  b.set(28, 32, Tile.Table).set(28, 33, Tile.Chair);
  b.set(30, 31, Tile.Bookshelf); // the ledgers of the count
  b.setDetail(30, 33, Detail.Doormat);

  // ---------------------------------------------------------------
  // THE DELFWORKS — the town ore yard: the mithril seam the old
  // realm never dug deep enough to find, and the adamant the fire
  // squeezed out of the mountain's roots. The only high-ore a miner
  // reaches without earning the burn — which is the whole pitch on
  // the recruitment bills the Charter posts in Amberford.
  // ---------------------------------------------------------------
  b.fillRect(10, 28, 13, 13, Tile.Dirt);
  b.set(14, 32, Tile.RockMithril).set(18, 30, Tile.RockMithril).set(21, 36, Tile.RockMithril);
  b.set(12, 38, Tile.RockAdamant).set(19, 39, Tile.RockAdamant);
  b.set(11, 29, Tile.Rock).set(16, 28, Tile.Rock).set(22, 33, Tile.Rock); // shoring
  b.set(13, 35, Tile.Brazier).set(20, 32, Tile.Brazier); // the faces work past dusk
  b.set(11, 31, Tile.ToolRack).set(15, 40, Tile.Crate).set(16, 40, Tile.Crate);
  b.setDetail(17, 34, Detail.Pebbles).setDetail(13, 30, Detail.Pebbles).setDetail(20, 37, Detail.Pebbles);
  b.sign(23, 39, 'THE DELFWORKS', [
    'mithril and adamant by the day-shift',
    'what the burn keeps, the burn keeps',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE DELFHALL — the moot hall on the Market Walk: Ruen runs the
  // town like a working — shifts, tallies, no speeches. The feast
  // table is for counting-days; the lectern is for the shift book.
  // ---------------------------------------------------------------
  b.building(35, 33, 15, 9, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 's', at: 6 }, { side: 's', at: 7 }],
    windows: [{ side: 'w', at: 4 }, { side: 'e', at: 4 }, { side: 'n', at: 7 }],
  });
  b.set(41, 41, Tile.DoorwayStoneWide).set(42, 41, Tile.DoorwayStoneWide);
  for (let x = 39; x <= 44; x++) b.set(x, 37, Tile.Table);
  b.set(39, 36, Tile.Chair).set(42, 36, Tile.Chair).set(44, 38, Tile.Chair).set(40, 38, Tile.Chair);
  b.set(42, 35, Tile.Lectern); // the shift book
  b.set(36, 34, Tile.Hearth).set(48, 34, Tile.Hearth);
  // The Delfmaster's alcove: Ruen sleeps an arm's reach from the
  // shift book, which tells you everything about how she runs a town.
  b.set(45, 34, Tile.WallStone).set(45, 35, Tile.WallStone).set(45, 36, Tile.DoorwayStone);
  b.set(46, 35, Tile.Bed).set(47, 36, Tile.Cabinet);
  b.setDetail(41, 39, Detail.Rug).setDetail(42, 39, Detail.Rug);
  b.setDetail(38, 34, Detail.WallBanner).setDetail(46, 34, Detail.WallBanner);
  b.sign(44, 42, 'THE DELFHALL', [
    'moot on counting-day',
    'grievances to the shift book first',
  ]);

  // ---------------------------------------------------------------
  // THE STARFALL FORGE — Ferrun came for the mithril seam and stayed
  // for the glass-steel. Furnace to anvil to quench, west wall to
  // east: the work reads left to right like a sentence.
  // ---------------------------------------------------------------
  b.building(30, 48, 15, 11, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 6 }],
    windows: [{ side: 'n', at: 2 }, { side: 'n', at: 11 }, { side: 's', at: 7 }],
  });
  b.set(32, 50, Tile.Furnace).set(32, 53, Tile.Furnace);
  b.set(35, 51, Tile.Anvil).set(35, 54, Tile.Anvil);
  b.set(38, 52, Tile.Basin); // the quench
  b.set(43, 49, Tile.ToolRack).set(43, 51, Tile.WeaponRack);
  b.set(31, 56, Tile.Crate).set(32, 56, Tile.Crate); // coal up the Old Road
  b.set(40, 56, Tile.Counter).set(41, 56, Tile.Counter); // the commission counter
  b.setDetail(36, 48, Detail.Doormat);
  b.sign(38, 47, 'THE STARFALL FORGE', [
    'mithril worked, adamant by commission',
    'bring your own starfall and we will talk',
  ]);

  // ---------------------------------------------------------------
  // THE ASSAY HOUSE — nothing leaves the delf unweighed. Lorn stamps
  // what the burn coughs up, and the strongroom holds the samples
  // that would start fights if they sat on an open shelf.
  // ---------------------------------------------------------------
  b.building(50, 48, 9, 7, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 4 }],
    windows: [{ side: 'e', at: 3 }],
  });
  b.set(52, 50, Tile.Counter).set(53, 50, Tile.Counter); // the scales counter
  b.set(56, 50, Tile.Lectern); // the assay ledger
  b.set(51, 52, Tile.Vault); // the sample strongroom
  b.set(56, 52, Tile.Crate).set(57, 52, Tile.Crate);
  b.set(56, 53, Tile.Bed); // Lorn sleeps beside the scales
  b.setDetail(54, 48, Detail.Doormat);
  b.sign(56, 47, 'THE ASSAY', ['weighed, stamped, argued about']);

  // ---------------------------------------------------------------
  // THE FOREMAN'S REST — the inn. The name is the town's whole
  // history in three words, and the day-book behind the bar records
  // who came back off the burn. Brekka pours; Hedda lodges in the
  // east room and writes letters she does not post here.
  // ---------------------------------------------------------------
  b.building(74, 46, 17, 11, {
    wall: Tile.WallStone,
    floor: Tile.WoodFloor,
    doors: [{ side: 'w', at: 5 }],
    windows: [{ side: 'w', at: 2 }, { side: 'n', at: 5 }, { side: 'n', at: 11 }],
  });
  b.set(77, 48, Tile.Counter).set(78, 48, Tile.Counter).set(79, 48, Tile.Counter);
  b.set(76, 47, Tile.BrewKeg).set(75, 47, Tile.Bed); // Brekka's cot behind the bar
  b.set(80, 47, Tile.Bookshelf); // the day-book
  // The kitchen, walled, east.
  for (let y = 47; y <= 51; y++) b.set(86, y, Tile.WallWood);
  b.set(86, 49, Tile.DoorwayWood);
  b.set(88, 47, Tile.Hearth).set(89, 48, Tile.CookPot).set(88, 50, Tile.Table);
  // The common room.
  b.set(81, 50, Tile.Table).set(82, 50, Tile.Table).set(81, 51, Tile.Chair).set(83, 50, Tile.Chair);
  b.set(76, 52, Tile.Table).set(76, 53, Tile.Chair);
  // The guest wing, south, three rooms.
  for (let x = 75; x <= 89; x++) b.set(x, 52, Tile.WallWood);
  b.set(78, 52, Tile.DoorwayWood).set(84, 52, Tile.DoorwayWood).set(88, 52, Tile.DoorwayWood);
  b.set(76, 52, Tile.WallWood); // (re-assert over the table row edit above)
  b.set(75, 54, Tile.Bed).set(80, 54, Tile.Bed).set(82, 54, Tile.Bed);
  b.set(89, 54, Tile.Bed).set(86, 54, Tile.Table).set(86, 53, Tile.Chair); // Hedda's desk
  for (let x = 79; x <= 79; x++) b.set(x, 53, Tile.WallWood);
  b.set(85, 53, Tile.WallWood).set(85, 54, Tile.WallWood).set(85, 55, Tile.WallWood);
  b.setDetail(74, 51, Detail.Doormat).setDetail(81, 49, Detail.Rug);
  b.sign(73, 49, 'THE FOREMAN’S REST', [
    'beds, board, and the day-book',
    'no tabs past counting-day',
  ]);

  // ---------------------------------------------------------------
  // THE GLASSHOUSE — Mirena's kilns never cool. Starfall glass for
  // lamp lenses and focus work; the chamfered west face is the kiln
  // house's statement (the diagonal budget's second spend).
  // ---------------------------------------------------------------
  b.building(94, 60, 13, 11, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'w', at: 4 }],
    windows: [{ side: 'n', at: 6 }, { side: 's', at: 6 }],
  });
  b.set(94, 60, Tile.WallStoneDiagNW).set(94, 70, Tile.WallStoneDiagSW);
  b.set(97, 63, Tile.Furnace).set(97, 66, Tile.Furnace); // the twin kilns
  b.set(101, 62, Tile.CarvingBench); // the cutting bench
  b.set(101, 64, Tile.Workbench); // the lens bench
  b.set(104, 62, Tile.Crate).set(104, 63, Tile.Crate); // ash-sand and cullet
  b.set(100, 68, Tile.Counter).set(101, 68, Tile.Counter); // the wares counter
  b.set(103, 66, Tile.Chair);
  b.setDetail(94, 65, Detail.Doormat);
  b.sign(93, 62, 'THE GLASSHOUSE', [
    'lenses, lamps, focus glass',
    'the kilns do not cool for visitors',
  ]);

  // ---------------------------------------------------------------
  // THE DISPENSARY — Ida's burn salves and ash-lung draughts. The
  // only door in town that opens at any hour, and the only one who
  // has seen inside every house.
  // ---------------------------------------------------------------
  b.building(100, 34, 11, 9, {
    wall: Tile.WallStone,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 5 }],
    windows: [{ side: 's', at: 2 }, { side: 'e', at: 4 }],
  });
  b.set(102, 36, Tile.Alembic).set(108, 35, Tile.PotionRack);
  b.set(103, 40, Tile.Counter).set(104, 40, Tile.Counter);
  b.set(107, 37, Tile.Basin).set(109, 36, Tile.Cabinet);
  b.set(101, 40, Tile.Bed); // Ida sleeps where the knocking finds her
  b.setDetail(105, 42, Detail.Doormat);
  b.sign(107, 43, 'THE DISPENSARY', ['knock loud, the kilns are louder']);

  // ---------------------------------------------------------------
  // THE WARDROOM — the watch's bunks by the east gate. Hot bunks,
  // the rota law: the day pair sleeps where the night pair stood.
  // ---------------------------------------------------------------
  b.building(112, 24, 8, 7, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'w', at: 3 }],
    windows: [{ side: 's', at: 3 }],
  });
  b.set(114, 25, Tile.Bed).set(117, 25, Tile.Bed);
  b.set(115, 28, Tile.Table).set(116, 28, Tile.Chair);
  b.set(118, 26, Tile.WeaponRack);
  b.setDetail(112, 27, Detail.Doormat);

  // ---------------------------------------------------------------
  // THE ROUND'S SHOPS — the provisioner and the outfitter, south of
  // the Stone on the Quay Lane: grain up the road, coats against
  // weather that wants you dead.
  // ---------------------------------------------------------------
  b.building(48, 72, 9, 7, {
    wall: Tile.WallStone,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 4 }],
    windows: [{ side: 'n', at: 2 }],
  });
  b.set(50, 74, Tile.Counter).set(51, 74, Tile.Counter);
  b.set(54, 73, Tile.Crate).set(55, 73, Tile.Crate).set(55, 74, Tile.Barrel);
  b.set(49, 73, Tile.Cabinet).set(49, 77, Tile.Bed);
  b.sign(50, 71, 'THE PROVISIONER', ['amberford grain, kingsdelf prices']);
  b.building(60, 72, 9, 7, {
    wall: Tile.WallStone,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 4 }],
    windows: [{ side: 'n', at: 6 }],
  });
  b.set(62, 74, Tile.Counter).set(63, 74, Tile.Counter);
  b.set(67, 73, Tile.ToolRack).set(66, 77, Tile.Crate).set(61, 77, Tile.Bed);
  b.sign(66, 71, 'THE OUTFITTER', ['dress for the burn or stay home']);

  // ---------------------------------------------------------------
  // THE HEARTH ROW — the cottages east of the floor, on their own
  // narrow street: Ferrun's, Mirena's, the watch cottage, and the
  // delvers' barracks. Stone houses, spice-spent timber floors.
  // ---------------------------------------------------------------
  b.path({ x: 108, y: 45 }, { x: 108, y: 78 }, 1);
  const cottage = (x: number, y: number): void => {
    b.building(110, y, 8, 7, {
      wall: Tile.WallStone,
      floor: Tile.WoodFloor,
      doors: [{ side: 'w', at: 3 }],
      windows: [{ side: 'w', at: 1 }, { side: 's', at: 4 }],
    });
    b.setDetail(110, y + 3, Detail.Doormat);
    void x;
  };
  cottage(110, 46); // Ferrun's
  b.set(115, 47, Tile.Bed).set(112, 47, Tile.Hearth).set(114, 50, Tile.Table).set(115, 50, Tile.Chair);
  b.set(116, 48, Tile.ToolRack);
  cottage(110, 56); // Mirena's
  b.set(115, 57, Tile.Bed).set(112, 57, Tile.Hearth).set(114, 60, Tile.Table).set(113, 60, Tile.Chair);
  b.set(116, 58, Tile.Cabinet);
  cottage(110, 66); // the watch cottage — hot bunks
  b.set(112, 67, Tile.Bed).set(115, 67, Tile.Bed).set(116, 70, Tile.WeaponRack);
  b.set(113, 70, Tile.Table);
  // The delvers' barracks, south of the shops on the lane's end.
  b.building(96, 74, 10, 8, {
    wall: Tile.WallStone,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 5 }],
    windows: [{ side: 'e', at: 3 }],
  });
  b.set(98, 76, Tile.Bed).set(100, 76, Tile.Bed).set(102, 76, Tile.Bed);
  b.set(104, 76, Tile.Bed).set(104, 78, Tile.Bed); // the glasshands' pair
  b.set(98, 79, Tile.Table).set(99, 79, Tile.Chair).set(103, 79, Tile.Crate);
  b.setDetail(101, 74, Detail.Doormat).setDetail(100, 78, Detail.Straw);

  // ---------------------------------------------------------------
  // THE WEST SHELF — the Flamehouse and the Focus House, up on the
  // old bench walk: the daughter-flame carried from the Silver
  // Shrine, the lamp benches that will one day light the Old Road,
  // and the exile's enchanting table with its unanswered letters.
  // ---------------------------------------------------------------
  b.building(12, 14, 13, 8, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'e', at: 3 }],
    windows: [{ side: 's', at: 3 }, { side: 's', at: 9 }],
  });
  b.set(16, 17, Tile.Brazier); // the daughter-flame — it never goes out
  b.set(14, 19, Tile.Workbench).set(19, 19, Tile.Workbench); // the lamp benches
  b.set(22, 16, Tile.Crate).set(22, 15, Tile.Crate); // glasshouse lenses, hartfell tallow
  b.set(14, 15, Tile.Lectern); // the flame-book
  b.set(13, 18, Tile.Bed); // Soren sleeps where he can hear the wick
  b.setDetail(24, 17, Detail.Doormat);
  b.sign(25, 19, 'THE FLAMEHOUSE', [
    'the flame came south in a pilgrim lamp',
    'a lamp for the old road, one by one',
  ]);
  b.building(36, 13, 13, 8, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 's', at: 6 }],
    windows: [{ side: 'w', at: 3 }],
  });
  b.set(41, 16, Tile.EnchantingTable); // the second table in the world
  b.set(37, 14, Tile.Bookshelf).set(38, 14, Tile.Bookshelf).set(39, 14, Tile.Bookshelf);
  b.set(44, 15, Tile.Lectern).set(46, 18, Tile.Bed).set(37, 18, Tile.Hearth);
  b.setDetail(42, 20, Detail.Doormat).setDetail(43, 16, Detail.Rug);
  b.sign(44, 21, 'THE FOCUS HOUSE', [
    'enchanting by appointment',
    'letters from the arcanum go under the door',
  ]);

  // ---------------------------------------------------------------
  // THE BEASTYARD — the game's first true stable, on the east shelf
  // where the animals live above the works' dust. Orin reads beasts
  // the way Annik reads names; the three stalls of the pen are the
  // three a keeper's whistle can hold.
  // ---------------------------------------------------------------
  // The walk's south row (y14) stays an open corridor the whole
  // shelf long — the pen and the cottage both stop a row short of
  // the rim, or the yard seals its own level (the flood taught it).
  b.outlineRect(96, 10, 9, 4, Tile.Fence);
  b.set(104, 12, Tile.FenceGate);
  b.set(99, 12, Tile.BeastPen);
  b.set(97, 11, Tile.FeedTrough).set(97, 12, Tile.FeedTrough);
  b.set(103, 11, Tile.HayBale);
  b.setDetail(100, 11, Detail.Straw).setDetail(102, 12, Detail.Straw).setDetail(101, 12, Detail.Straw);
  b.building(111, 10, 8, 4, {
    wall: Tile.WallStone,
    floor: Tile.WoodFloor,
    doors: [{ side: 'w', at: 2 }],
    windows: [{ side: 's', at: 4 }],
  });
  b.set(117, 11, Tile.Bed).set(112, 11, Tile.Hearth).set(114, 11, Tile.Table);
  b.sign(96, 16, 'THE BEASTYARD', [
    'stalls for three, the whistle law',
    'the burn is no place for a green colt',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE LOOKOUT — the east crown. The town watches the burn the way
  // Pinewatch watches the ice: nightly, by rota, by everyone.
  // ---------------------------------------------------------------
  b.fillRect(78, 3, 11, 5, Tile.StoneFloor);
  b.set(80, 4, Tile.Brazier).set(86, 4, Tile.Brazier);
  b.set(78, 3, Tile.BannerPole).set(88, 3, Tile.BannerPole);
  b.set(83, 5, Tile.WeaponRack); // the gate horn
  // The west crown keeps the old winch anchors — the delf's first
  // machines, rusted to monument.
  b.set(20, 5, Tile.PillarStone).set(34, 6, Tile.PillarStone).set(46, 4, Tile.PillarStone);

  // ---------------------------------------------------------------
  // THE QUAY — outside the water gate, on the Ashmere's silt shore.
  // Denna's shack, the drying frames, and the two spots where the
  // pale sump-fish school against the drowned galleries.
  // ---------------------------------------------------------------
  b.fillRect(44, 87, 3, 6, Tile.Path);
  b.fillRect(34, 88, 8, 2, Tile.Dock);
  b.set(31, 89, Tile.FishingSpot).set(36, 91, Tile.FishingSpot);
  b.building(48, 88, 7, 6, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'w', at: 2 }],
    windows: [{ side: 's', at: 3 }],
  });
  b.set(52, 89, Tile.Bed).set(50, 92, Tile.Table);
  b.set(43, 89, Tile.Crate).set(43, 91, Tile.Barrel);
  b.set(52, 87, Tile.DryingRack).set(55, 89, Tile.DryingRack);

  // ---------------------------------------------------------------
  // THE SHADOW BEHIND THE BARRACKS — a dirt pocket the lamps skip,
  // where a dealer in sundries keeps his crates and, under the loose
  // boards nobody mentions, the Company keeps its sixth door. No
  // lamp, no sign, no name (the town-hatch law): if you know, you
  // know, and if you don't, it's a storage corner.
  // ---------------------------------------------------------------
  b.fillRect(101, 82, 5, 3, Tile.Dirt);
  b.portal(103, 83, Tile.PortalDown, { x: 224.5, y: 591.5 }, UNDERWORLD_PLANE_ID);
  b.set(105, 83, Tile.Crate).set(101, 84, Tile.Barrel);
  b.set(106, 82, Tile.CrateGoods); // Slate's stock, such as it is

  // ---------------------------------------------------------------
  // THE LAMPS — starfall glass over town flame. The streets are lit
  // the way the Old Road is not, and every lamp is an argument.
  // ---------------------------------------------------------------
  b.set(80, 18, Tile.LampPost).set(80, 22, Tile.LampPost);
  b.set(96, 18, Tile.LampPost).set(96, 22, Tile.LampPost);
  b.set(110, 18, Tile.LampPost).set(110, 22, Tile.LampPost);
  b.set(67, 28, Tile.LampPost).set(73, 34, Tile.LampPost);
  b.set(67, 40, Tile.LampPost).set(73, 46, Tile.LampPost);
  b.set(34, 45, Tile.LampPost).set(54, 42, Tile.LampPost).set(86, 42, Tile.LampPost);
  b.set(50, 60, Tile.LampPost).set(72, 60, Tile.LampPost);
  b.set(52, 70, Tile.LampPost).set(66, 70, Tile.LampPost);
  b.set(109, 55, Tile.LampPost).set(109, 65, Tile.LampPost).set(109, 75, Tile.LampPost);
  b.set(47, 85, Tile.LampPost); // the quay lamp, inside the gate

  // ---------------------------------------------------------------
  // THE CURTAIN — ashlar on the open sides, living rock on the
  // north, and the west end standing in the Ashmere (the mole law).
  // Three ways in: the east gate (the Old Road), the north wicket
  // (the Processional), and the water gate to the quay.
  // ---------------------------------------------------------------
  // East curtain: from the east shelf's cliff corner down to the
  // south wall, with the Old Road gate at rows 19-21.
  for (let y = 16; y <= 86; y++) b.set(121, y, Tile.WallGarrison);
  b.set(121, 19, Tile.GateGarrison).set(121, 20, Tile.GateGarrison).set(121, 21, Tile.GateGarrison);
  // South curtain: east corner to the water, the west end standing
  // in deepened water (the mole law again — no wading route around
  // the quay).
  for (let x = 27; x <= 121; x++) b.set(x, 86, Tile.WallGarrison);
  for (let y = 83; y <= 88; y++) {
    for (let x = 22; x <= 26; x++) {
      if (b.get(x, y) !== Tile.WallGarrison) b.set(x, y, Tile.Water);
    }
  }
  b.set(44, 86, Tile.GateGarrison).set(45, 86, Tile.GateGarrison).set(46, 86, Tile.GateGarrison);
  // West flank curtain: the shelf cliff's foot down INTO the mere —
  // the mole law: the wall's last stones stand wet, and the water at
  // both moles is DEEP (the Hartfell bay law: cold water, not a
  // wading route — the old bench drops sheer where the walls end,
  // because the walls end where the old bench dropped).
  for (let y = 24; y <= 63; y++) b.set(6, y, Tile.WallGarrison);
  for (let y = 59; y <= 66; y++) {
    for (let x = 0; x <= 8; x++) {
      if (b.get(x, y) !== Tile.WallGarrison) b.set(x, y, Tile.Water);
    }
  }
  // The wicket bar: cliff to cliff across the whole notch — the
  // notch is barred at night; the dead walk the Processional and the
  // braziers never go out.
  for (let x = 56; x <= 65; x++) b.set(x, 2, Tile.WallGarrison);
  b.set(59, 2, Tile.GateGarrison).set(60, 2, Tile.GateGarrison).set(61, 2, Tile.GateGarrison);
  b.set(57, 4, Tile.Brazier).set(64, 4, Tile.Brazier);
  // Gate fires and words.
  b.set(123, 17, Tile.Brazier).set(123, 23, Tile.Brazier);
  b.set(42, 87, Tile.Brazier).set(48, 87, Tile.Brazier);
  b.sign(124, 23, 'KINGSDELF', [
    'the old road is not lit',
    'be inside when the horn goes',
  ], Tile.Signpost);
  b.sign(58, 6, 'THE PROCESSIONAL', [
    'the old way to the old crown',
    'the dead walk it home by night',
    'bar goes down at dusk',
  ], Tile.Signpost);
  b.sign(48, 82, 'THE QUAY', [
    'boats out by the horn',
    'what the net holds, the assay sees',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE PEOPLE — every placement keeps hours (the routine law); the
  // roster and its reasons live in the header contract above.
  // ---------------------------------------------------------------
  const N = 1.5707963;
  const S = 4.7123889;
  const E = 0.0;
  const W = 3.1415926;
  b.actor('delfmaster_ruen', 43, 36, W, 'kd_delfmaster');
  b.actor('factor_venn', 89, 24, S, 'kd_factor');
  b.actor('sealkeeper_annik', 39, 27, N, 'kd_sealkeeper');
  b.actor('innkeep_brekka', 78, 47, S, 'kd_innkeep');
  b.actor('stablemaster_orin', 106, 12, W, 'kd_stablemaster');
  b.actor('smith_ferrun', 36, 52, W, 'kd_smith');
  b.actor('glasswright_mirena', 99, 64, W, 'kd_glasswright');
  b.actor('enchanter_veyle', 41, 18, N, 'kd_enchanter');
  b.actor('assayer_lorn', 53, 51, N, 'kd_assayer');
  b.actor('lampwright_soren', 16, 18, N, 'kd_lampwright');
  b.actor('waykeeper_liv', 118, 22, E, 'kd_waykeeper');
  b.actor('surveyor_hedda', 82, 5, N, 'kd_surveyor');
  b.actor('provisioner_etta', 50, 75, N, 'kd_provisioner');
  b.actor('outfitter_cass', 62, 75, N, 'kd_outfitter');
  b.actor('salvewright_ida', 104, 37, W, 'kd_salvewright');
  b.actor('fisher_denna', 40, 89, S, 'kd_fisher');
  b.actor('broker_slate', 104, 84, N, 'kd_broker');
  b.actor('kingsdelf_watch', 120, 19, E, 'kd_watch_east_day');
  b.actor('kingsdelf_watch', 120, 21, E, 'kd_watch_east_night');
  b.actor('kingsdelf_watch', 59, 4, N, 'kd_watch_wicket_day');
  b.actor('kingsdelf_watch', 61, 4, N, 'kd_watch_wicket_night');
  b.actor('kingsdelf_delver', 15, 32, W, 'kd_delver_a');
  b.actor('kingsdelf_delver', 18, 31, N, 'kd_delver_b');
  b.actor('kingsdelf_delver', 13, 38, W, 'kd_delver_c');
  // THE KEYWRIGHT keeps her bench in the delvers' quarter — the ones
  // who wear keys out are the ones who need doors remembered.
  b.actor('keywright_orla', 17, 34, N);
  b.actor('kingsdelf_glasshand', 98, 63, W, 'kd_glasshand_a');
  b.actor('kingsdelf_glasshand', 98, 66, W, 'kd_glasshand_b');

  // Spawn on the round beside the Stone — the south-west's hearth.
  b.spawn(62.5, 65.5);

  return b.build();
}
