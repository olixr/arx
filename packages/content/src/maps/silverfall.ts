import { Detail, Tile, awningTile, bannerPoleTile, bannerStandTile, bracketSignDetail, drapeFallDetail, greatBannerDetail, herbBundlesDetail, pennantDetail, sillHerbsDetail, wallArmsDetail } from '@arx/shared';
import { SILVERFALL_RECT } from '../geography.js';
import { MARKET_STALL } from '../structures/templates.js';
import { UNDERWORLD_PLANE_ID } from '../planes.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * SILVERFALL — the royal capital of the Dawnlands, cut terrace by
 * terrace into the living rock of the Silverspine. THE CROWN
 * REMASTER (docs/silverfall-crown-plan.md): the city rebuilt whole,
 * with the palace it always claimed to have.
 *
 *   L0  THE GATEFRONT — the siege curtain and the Silver Gate, the
 *       wardhouse where the city watch actually lives, the
 *       caravanserai, the gate market, the Roaring Pool.
 *   L0  THE FALLS VALE — the lower town (THE CAPITAL COMES DOWN THE
 *       MOUNTAIN, docs/silverfall-vale-plan.md): everything south
 *       of the old wall. The Vale River out the water gate to the
 *       Kingswater, the High Street to the VALE GATE, the wet
 *       market, the Millward, the Delvers' Terrace and the miners'
 *       postern, the Silent Terrace graveyard shelf, the Kingshore
 *       quay, the Pilgrim's Way, the wagon yard, the Fairstead.
 *       Poorer than the High City ON PURPOSE — the wealth gradient
 *       is the storytelling.
 *   L1  THE TRADES — the Emberway west (mine, smelter, assay, Great
 *       Forge, masons), the Timberway east (saw yard, carpenters,
 *       fletcher, cooperage), the cookhouse and Greenstair feeding
 *       both shifts.
 *   L2  THE SILVER COURT — the civic terrace: Grand Court and
 *       fountain, the Bank, the Guildhall across the falls, the
 *       Arcanum, the chapter house, Lantern Row under its lamps,
 *       the King's Arch over the avenue. And in the crag shadow
 *       where no lamp burns: THE ROOKERY, holding the Undercroft
 *       mouth. The Crown tolerates what it can watch.
 *   L3  THE CROWN — CASTLE SILVERFALL, a true walled precinct now:
 *       garrison curtain with corner drums, the gate bastions
 *       echoing the Silver Gate below, the keep in three ranges
 *       (the Hall of the Silver Line, the garrison range, the royal
 *       range), the bailey with its drill yard and kitchens. East
 *       of the curtain, public ground: the Mirrormere, the royal
 *       garden, and the Silver Shrine on its pilgrim path.
 *
 * THE FORTIFICATION LADDER: every gate on the climb outranks the
 * last — the Silver Gate (y112), the Court Gate (y62), and now the
 * CASTLE GATE (y32), where the avenue finally lands on the thing it
 * was aimed at. The castle gate wears the Silver Gate's own
 * architecture — five-square chamfered bastions, garrison arch —
 * because the same masons built both, a century apart.
 *
 * TERRACE LAW: nested raises, every rim exactly one level, water
 * never on a rim, stairs face south, foot-water asserted by
 * silverfall.test.ts. The race now runs INSIDE the curtain line and
 * out the water gate — walls die into the banks (the mole law) —
 * and the landing crosses it on a bridge, with one open row of
 * water restored above the lip so the fall still reads (the feed
 * law: a bridge is not a feed).
 *
 * TOWN-PLAN LAWS (kept from Amberford, hardened here):
 * - STREETS FIRST; every working door fronts pavement.
 * - NOTHING OVERLAPS; three clear tiles between free-standing
 *   structures (castle ranges abut the curtain ON PURPOSE — real
 *   baileys are lined, not littered).
 * - ROOMS HAVE JOBS and the furniture proves it.
 * - THE ROOKERY IS HIDDEN: no lamp, no sign, one alley, one ledge.
 * - SEALED-POCKET LAW: the landing rows y33-35 and the bailey walk
 *   y25 are through-ways; nothing solid stands mid-row.
 *
 * The city is a HAVEN (the haven law): tier 0 inside the walls, the
 * approach stays 4-5 — the climb is the game, arriving the reward.
 */
export function buildSilverfall(): ZoneDef {
  const R = SILVERFALL_RECT;
  const b = new ZoneBuilder('silverfall', 'Silverfall', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE TERRACES — nested plateaus; every rim one clean level.
  // L3 grew with the remaster: five rows deeper, wider both flanks,
  // so the Crown terrace can hold a palace instead of a house.
  // ---------------------------------------------------------------
  b.raise(8, 4, 160, 92, 1); // L1: x8-167, y4-95
  b.raise(30, 6, 116, 58, 2); // L2: x30-145, y6-63
  b.raise(46, 10, 92, 27, 3); // L3: x46-137, y10-36
  // THE SILENT TERRACE — the one raised shelf of the lower city: the
  // graveyard ledge under the west crags, older than every wall
  // above it. The barrows knew this mountain first.
  b.raise(10, 120, 30, 24, 1); // x10-39, y120-143

  // The Silver Stair — three grand flights on the avenue axis.
  for (let x = 84; x <= 92; x++) b.stairs(x, 95); // L0 -> L1
  for (let x = 84; x <= 92; x++) b.stairs(x, 63); // L1 -> L2
  for (let x = 84; x <= 92; x++) b.stairs(x, 36); // L2 -> L3
  // Working stairs: the mine climb and the Greenstair (L0 -> L1).
  for (let x = 18; x <= 20; x++) b.stairs(x, 95);
  for (let x = 152; x <= 154; x++) b.stairs(x, 95);
  // Side stairs to the Hall Terrace (L1 -> L2).
  for (let x = 36; x <= 38; x++) b.stairs(x, 63);
  for (let x = 136; x <= 138; x++) b.stairs(x, 63);
  // The Silent Terrace's two flights: the lych stair (west, the
  // mourners' way) and the keeper's stair (east).
  for (let x = 15; x <= 17; x++) b.stairs(x, 143);
  for (let x = 32; x <= 34; x++) b.stairs(x, 143);

  // ---------------------------------------------------------------
  // THE AVENUE — the High Road continued: stone from gate to Crown.
  // ---------------------------------------------------------------
  b.fillRect(84, 96, 9, 16, Tile.StoneFloor); // gatefront stretch
  b.fillRect(84, 64, 9, 31, Tile.StoneFloor); // trades stretch
  b.fillRect(84, 37, 9, 26, Tile.StoneFloor); // court stretch
  // THE KING'S TERRACE — the crown landing: a paved esplanade under
  // the castle's south face, from the west ward to the garden arm.
  // A through-way (sealed-pocket law): nothing solid mid-row.
  b.fillRect(58, 33, 54, 3, Tile.StoneFloor);
  b.fillRect(112, 34, 20, 1, Tile.Path); // the east arm: garden + shrine
  // Braziers pace the climb — the stair burns, not lamps.
  b.set(83, 94, Tile.Brazier).set(93, 94, Tile.Brazier);
  b.set(83, 61, Tile.Brazier).set(98, 61, Tile.Brazier);
  b.set(84, 33, Tile.Brazier).set(92, 33, Tile.Brazier); // flanking the castle gate
  // THE KNIGHT'S KEEPING: the household's crimson great banners fly
  // from the gate BASTION drums, garrison-tall — house colors
  // outboard on the towers, the royal pair's personal sigils inboard
  // beside the arch (one gatefront, two registers of allegiance),
  // and the avenue reads the crimson from the market.
  b.setDetail(82, 32, greatBannerDetail(1)).setDetail(94, 32, greatBannerDetail(1));
  b.set(80, 35, Tile.Brazier).set(96, 35, Tile.Brazier); // the stair crown
  // Lamp pairs between the landings pace out the long stretches.
  b.set(83, 40, Tile.LampPost).set(93, 40, Tile.LampPost);
  b.set(83, 52, Tile.LampPost).set(93, 52, Tile.LampPost);
  b.set(83, 70, Tile.LampPost).set(93, 70, Tile.LampPost);
  b.set(83, 80, Tile.LampPost).set(93, 80, Tile.LampPost);
  // The Crown's crimson marches the avenue: madder poles at the
  // first flight's foot and the second crown.
  b.set(83, 97, bannerPoleTile(1)).set(93, 97, bannerPoleTile(1));
  b.set(83, 65, bannerPoleTile(1)).set(93, 65, bannerPoleTile(1));

  // ---------------------------------------------------------------
  // THE WATER — the Mirrormere overflows south, terrace by terrace,
  // and every lip is a falls. Channels stop shy of every rim.
  // ---------------------------------------------------------------
  // L3: the MIRRORMERE — moved to the terrace's northeast so the
  // castle could stand west of its own water. Still, deep, public.
  b.fillEllipse(108, 16, 10, 5, Tile.WaterShallow);
  b.fillEllipse(108, 16, 8.5, 4, Tile.Water);
  b.fillEllipse(108, 16, 5.5, 2.5, Tile.WaterDeep);
  // The outflow neck: the mere leans into the race's throat.
  b.fillRect(98, 17, 4, 2, Tile.WaterShallow);
  // THE RACE — the mere's overflow, running south along the castle's
  // east curtain (the wall dies into the banks: the mole law), under
  // the landing bridge, and over the lip.
  b.fillRect(97, 19, 5, 14, Tile.Water); // y19-32
  b.fillRect(97, 33, 5, 2, Tile.Bridge); // the landing crosses the race
  b.fillRect(97, 35, 5, 1, Tile.Water); // the open row above the lip — the feed
  // L2: the plunge basin under the Crown lip, then the court channel.
  b.fillRect(97, 37, 5, 1, Tile.WaterShallow); // foot-water: the curtain lands IN water
  b.fillEllipse(99, 39, 3.5, 2, Tile.WaterShallow);
  b.fillRect(99, 40, 4, 23, Tile.Water); // to the lip at y62
  b.set(98, 40, Tile.WaterShallow).set(103, 40, Tile.WaterShallow);
  // L1: plunge basin, then the working channel.
  b.fillEllipse(100, 66, 4, 2, Tile.WaterShallow);
  b.fillRect(99, 65, 4, 30, Tile.Water); // to the lip at y94
  b.set(98, 65, Tile.WaterShallow).set(103, 65, Tile.WaterShallow);
  b.fillRect(99, 64, 4, 1, Tile.WaterShallow); // basin tucks to the wall
  // L0: the ROARING POOL — the whole mountain's water lands here.
  b.fillEllipse(104, 102, 12, 6.5, Tile.WaterShallow);
  b.fillEllipse(104, 102, 10, 5.5, Tile.Water);
  b.fillEllipse(104, 101, 6, 3.5, Tile.WaterDeep);
  b.fillRect(98, 96, 6, 2, Tile.WaterShallow); // foot-water at the wall
  // Bridges: the channel is crossed, never forded. The court bridge
  // sits on the CIVIC AXIS — bank door, plaza, bridge, guildhall
  // door all on one line (y43-44).
  for (let x = 98; x <= 103; x++) {
    b.set(x, 43, Tile.Bridge).set(x, 44, Tile.Bridge); // the civic axis
    b.set(x, 60, Tile.Bridge).set(x, 61, Tile.Bridge); // Lantern Row crossing
    b.set(x, 74, Tile.Bridge).set(x, 75, Tile.Bridge); // forge -> carpenters
    b.set(x, 86, Tile.Bridge).set(x, 87, Tile.Bridge); // yard -> mess terrace
  }
  b.fillRect(93, 74, 5, 2, Tile.Path); // avenue -> crafts bridge
  b.fillRect(93, 86, 5, 2, Tile.Path); // avenue -> mess bridge

  // ---------------------------------------------------------------
  // L3 — CASTLE SILVERFALL: the walled precinct. Floors first, then
  // the curtain, then the drums and bastions over both.
  // ---------------------------------------------------------------
  // The bailey pavement and the keep's slab.
  b.fillRect(51, 25, 45, 7, Tile.StoneFloor); // the bailey, x51-95
  b.fillRect(54, 12, 40, 13, Tile.StoneFloor); // the keep slab
  b.fillRect(94, 12, 2, 13, Tile.StoneFloor); // the east walk (patrol lane)
  // The crag the keep backs into — the mountain shows through the
  // ward between the west curtain and the keep's blind wall.
  b.fillRect(51, 12, 3, 13, Tile.Rock);
  // THE CURTAIN — garrison masonry on all four sides.
  b.fillRect(50, 11, 47, 1, Tile.WallGarrison); // north run y11
  b.fillRect(50, 12, 1, 20, Tile.WallGarrison); // west run x50
  b.fillRect(96, 12, 1, 20, Tile.WallGarrison); // east run x96 (dies into the race)
  b.fillRect(50, 32, 47, 1, Tile.WallGarrison); // south run y32
  // Corner drums, proud of the line, chamfered.
  b.fillRect(50, 11, 3, 3, Tile.WallGarrison);
  b.set(50, 11, Tile.WallGarrisonDiagSE).set(52, 11, Tile.WallGarrisonDiagSW);
  b.set(52, 13, Tile.WallGarrisonDiagNW);
  b.fillRect(94, 11, 3, 3, Tile.WallGarrison);
  b.set(94, 11, Tile.WallGarrisonDiagSE).set(96, 11, Tile.WallGarrisonDiagSW);
  b.set(94, 13, Tile.WallGarrisonDiagNE);
  b.fillRect(50, 30, 3, 3, Tile.WallGarrison);
  b.set(50, 30, Tile.WallGarrisonDiagSE).set(52, 30, Tile.WallGarrisonDiagSW);
  b.set(52, 32, Tile.WallGarrisonDiagNW);
  // THE GATE BASTIONS — the Silver Gate's five-square drums, reborn
  // at the Crown: the same masons, a century apart.
  for (const bx of [81, 91] as const) {
    b.fillRect(bx, 30, 5, 3, Tile.WallGarrison);
    b.set(bx, 30, Tile.WallGarrisonDiagSE);
    b.set(bx + 4, 30, Tile.WallGarrisonDiagSW);
    b.set(bx, 32, Tile.WallGarrisonDiagNE);
    b.set(bx + 4, 32, Tile.WallGarrisonDiagNW);
  }
  b.fillRect(96, 30, 1, 3, Tile.WallGarrison); // the SE corner column
  // THE CASTLE GATE — the avenue finally lands on the thing it was
  // aimed at. Garrison arch, leaves standing open (the war-measure
  // law: shutting gates is the players' business, never the town's).
  for (let x = 86; x <= 90; x++) b.set(x, 32, Tile.GateGarrison);
  b.fillRect(86, 30, 5, 2, Tile.StoneFloor); // the gate passage
  b.setDetail(84, 32, Detail.BannerCrown).setDetail(92, 32, Detail.BannerMoon);
  b.sign(80, 33, 'CASTLE SILVERFALL', ['seat of the Silver Line', 'the gate stands open. the watch stands closer']);

  // THE KEEP — one building, three ranges, x54-93.
  b.outlineRect(54, 12, 40, 13, Tile.WallStone);
  // Partitions: garrison range | Hall of the Silver Line | royal range.
  for (let y = 13; y <= 23; y++) b.set(69, y, Tile.WallStone);
  b.set(69, 16, Tile.DoorwayStone).set(69, 21, Tile.DoorwayStone);
  for (let y = 13; y <= 23; y++) b.set(86, y, Tile.WallStone);
  b.set(86, 16, Tile.DoorwayStone).set(86, 21, Tile.DoorwayStone);
  // Doors and windows on the shell.
  b.set(77, 24, Tile.DoorwayStoneWide).set(78, 24, Tile.DoorwayStoneWide); // the hall gate
  b.set(60, 24, Tile.DoorwayStone); // the garrison's own door
  b.set(89, 24, Tile.DoorwayStone); // the royal range door
  b.set(72, 12, Tile.WallStoneWindow).set(83, 12, Tile.WallStoneWindow);
  b.set(60, 12, Tile.WallStoneWindow).set(66, 12, Tile.WallStoneWindow);
  b.set(89, 12, Tile.WallStoneWindow);
  b.set(54, 16, Tile.WallStoneWindow).set(54, 21, Tile.WallStoneWindow);
  b.set(93, 14, Tile.WallStoneWindow).set(93, 21, Tile.WallStoneWindow);
  b.set(64, 24, Tile.WallStoneWindow).set(72, 24, Tile.WallStoneWindow);
  b.set(83, 24, Tile.WallStoneWindow).set(92, 24, Tile.WallStoneWindow);

  // THE HALL OF THE SILVER LINE (x70-85): thrones on the dais, twin
  // hearths, the processional, two feast tables — the hall feasts,
  // and the Crown watches it feast.
  b.set(71, 13, Tile.Hearth).set(84, 13, Tile.Hearth);
  b.set(77, 14, Tile.Throne).set(78, 14, Tile.Throne);
  b.setDetail(75, 12, Detail.BannerCrown).setDetail(80, 12, Detail.BannerMoon);
  b.set(73, 14, Tile.BannerPole).set(82, 14, Tile.BannerPole);
  // The processional: crimson from the hall gate to the dais.
  b.setDetail(76, 15, Detail.CarpetRoyal).setDetail(79, 15, Detail.CarpetRoyal);
  for (let y = 15; y <= 23; y++) {
    b.setDetail(77, y, Detail.CarpetRoyal).setDetail(78, y, Detail.CarpetRoyal);
  }
  b.set(82, 16, Tile.Lectern); // the herald reads the day's decrees
  // Two feast tables run the floor, chairs down both sides.
  for (let y = 18; y <= 22; y++) b.set(72, y, Tile.Table).set(83, y, Tile.Table);
  b.set(72, 17, Tile.Chair).set(83, 17, Tile.Chair);
  b.set(71, 19, Tile.Chair).set(71, 21, Tile.Chair);
  b.set(73, 18, Tile.Chair).set(73, 20, Tile.Chair).set(73, 22, Tile.Chair);
  b.set(82, 18, Tile.Chair).set(82, 20, Tile.Chair).set(82, 22, Tile.Chair);
  b.set(84, 19, Tile.Chair).set(84, 21, Tile.Chair);
  b.set(71, 23, Tile.BannerPole).set(84, 23, Tile.BannerPole);
  b.setDetail(77, 25, Detail.Doormat).setDetail(78, 25, Detail.Doormat);

  // THE GARRISON RANGE (x55-68): armory and barracks north, the
  // castellan and the mess south — the castle guard eats and sleeps
  // beside the steel it carries. Hot bunks (the rota law).
  for (let x = 55; x <= 68; x++) b.set(x, 18, Tile.WallStone);
  b.set(61, 18, Tile.DoorwayStone);
  // THE KNIGHT'S KEEPING: the panoply and crossed axes hang the
  // armory wall, and the paired stands hold the open floor east of
  // the rack wall — one harness racked, one stand stripped because
  // its owner is on the curtain wearing it (the rota law told in
  // oak and steel). Stands never take a berth INSIDE the rack
  // column: the rack south of the berth overdraws the stand's body
  // (y-sort truth — proven on the rig, round one).
  b.set(55, 13, Tile.WeaponRack).set(55, 15, Tile.WeaponRack).set(55, 17, Tile.WeaponRack);
  b.set(57, 13, Tile.ToolRack);
  // (Axes at 65, not 66 — 66 is a window tile, whose painter never
  // hangs: THE HANGING LAW's orphan trap, caught by the host audit.)
  b.setDetail(56, 12, wallArmsDetail(0)).setDetail(65, 12, wallArmsDetail(1));
  b.set(57, 15, Tile.ArmorStandFull).set(58, 15, Tile.ArmorStand);
  b.set(63, 13, Tile.Bed).set(63, 14, Tile.Bed);
  b.set(65, 13, Tile.Bed).set(65, 14, Tile.Bed);
  b.set(67, 13, Tile.Bed).set(67, 14, Tile.Bed);
  b.set(68, 17, Tile.Cabinet);
  b.setDetail(59, 12, Detail.BannerCrown);
  for (let x = 63; x <= 66; x++) b.setDetail(x, 16, Detail.Rug);
  // The castellan's floor: Maren's desk faces the muster wall, the
  // castle strongbox sleeps beside her, the mess table feeds the
  // watch change. The one soft thing is under her own chair.
  b.set(55, 19, Tile.Bookshelf).set(56, 19, Tile.Bookshelf); // the muster rolls
  b.set(57, 20, Tile.Table).set(58, 20, Tile.Chair);
  b.setDetail(57, 21, Detail.Rug).setDetail(58, 21, Detail.Rug);
  b.set(55, 21, Tile.Vault); // the household strongbox — Maren's key
  b.set(55, 23, Tile.Brazier);
  b.set(63, 21, Tile.Table).set(64, 21, Tile.Table);
  b.set(62, 21, Tile.Chair).set(65, 21, Tile.Chair).set(63, 22, Tile.Chair);
  b.set(68, 19, Tile.WeaponRack);
  b.set(67, 22, Tile.Bed).set(67, 23, Tile.Bed); // the castellan sleeps by the rolls
  b.setDetail(60, 25, Detail.Doormat);
  // Crimson great banners flank the mess door — the household's
  // colors over the tables that feed its watch.
  b.setDetail(59, 18, greatBannerDetail(1)).setDetail(63, 18, greatBannerDetail(1));

  // THE ROYAL RANGE (x87-92): the chamber north, the solar south —
  // where the Crown is only a household. East windows on the walk,
  // the race, and the mere beyond.
  for (let x = 87; x <= 92; x++) b.set(x, 18, Tile.WallStone);
  b.set(89, 18, Tile.DoorwayStone);
  b.set(87, 13, Tile.Bed).set(87, 14, Tile.Bed);
  b.set(91, 13, Tile.Bed).set(91, 14, Tile.Bed);
  for (let x = 88; x <= 90; x++) {
    b.setDetail(x, 13, Detail.CarpetMoon).setDetail(x, 14, Detail.CarpetMoon);
  }
  b.set(89, 15, Tile.FlowerBox); // the queen's window box
  b.set(92, 16, Tile.Cabinet);
  b.setDetail(89, 16, Detail.RugRound);
  // Moonpale drapes fall the chamber walls, and one softens the
  // solar's east end (the Silverfall weave keeps the west — cloth
  // yields to the tapestry, never crowds it). The royal range is
  // the one floor where cloth outranks steel.
  b.setDetail(88, 12, drapeFallDetail(2)).setDetail(90, 12, drapeFallDetail(2));
  b.setDetail(91, 18, drapeFallDetail(2));
  // The solar: the Silverfall weave over the grand rug — the one
  // room where the Crown sits soft.
  b.setDetail(87, 18, Detail.Tapestry).setDetail(88, 18, Detail.Tapestry);
  b.set(87, 19, Tile.Bookshelf).set(87, 20, Tile.Bookshelf);
  b.set(92, 19, Tile.Hearth);
  b.set(89, 21, Tile.Table).set(88, 21, Tile.Chair).set(90, 21, Tile.Chair);
  for (let x = 88; x <= 91; x++) b.setDetail(x, 22, Detail.Rug);
  // The household reads (the dressing pass): the Queen's candle by
  // the solar hearth, the cloaks at the chamber door.
  b.set(91, 19, Tile.CandleStand);
  b.setDetail(89, 25, Detail.Doormat);

  // THE BAILEY — parade stone between the keep and the curtain.
  // The walk row y25 is a through-way (sealed-pocket law).
  b.set(75, 25, bannerPoleTile(1)).set(80, 25, bannerPoleTile(1)); // hall gate colors
  b.set(74, 28, Tile.Basin); // the well
  b.setDetail(75, 29, Detail.Pebbles);
  // THE DRILL YARD — the garrison trains in public view: butts west,
  // racks at the rail, the drillmaster's ground worn to dirt.
  b.fillRect(61, 26, 12, 6, Tile.Dirt);
  b.set(61, 27, Tile.Fence).set(61, 30, Tile.Fence);
  b.setDetail(62, 27, Detail.Straw).setDetail(62, 30, Detail.Straw);
  b.set(62, 28, Tile.TargetDummy).set(62, 30, Tile.TargetDummy); // the butts, finally literal
  b.set(71, 26, Tile.WeaponRack).set(71, 31, Tile.ToolRack);
  // The garrison's standard on the drill line — the muster forms on
  // it at the watch change, and it stands at the north rail, well
  // clear of the loose-west lane. Castle crimson: the charge follows
  // the dye, so it flies the same crossed swords as the gate.
  b.set(67, 26, bannerStandTile(1));
  b.setDetail(66, 29, Detail.Pebbles);
  b.sign(73, 30, 'THE DRILL YARD', ['loose only west', 'the King watches on seventh-days']);
  // THE CASTLE KITCHENS — the service range on the west curtain:
  // hearth pair, the pass, the larder, the steward's ledger table.
  b.outlineRect(51, 25, 7, 6, Tile.WallStone);
  b.set(57, 27, Tile.DoorwayStone);
  b.set(54, 25, Tile.WallStoneWindow).set(51, 27, Tile.WallStoneWindow);
  b.set(52, 26, Tile.Hearth).set(54, 26, Tile.Hearth);
  b.set(56, 26, Tile.Basin);
  b.set(52, 28, Tile.Counter).set(53, 28, Tile.Counter); // the pass
  b.set(52, 29, Tile.CrateGoods).set(53, 29, Tile.Barrel); // the larder row
  // (The kitchen interior is full — restraint is curation: the one
  // trace of the four hundred meals is the broom by the service
  // door, and that is enough.)
  b.set(58, 28, Tile.BroomAndPail);
  b.set(52, 27, Tile.Bed); // the steward's cot, warm side of the hearth
  b.set(55, 28, Tile.Table).set(56, 28, Tile.Chair); // the steward's ledger
  b.setDetail(56, 27, Detail.Doormat);
  b.sign(58, 26, 'THE CASTLE KITCHENS', ['four hundred meals a week', 'the steward remembers every one']);
  // The wood store in the bailey's east nook, under the royal windows.
  b.set(93, 26, Tile.Crate).set(94, 27, Tile.Crate).set(92, 28, Tile.Barrel);
  b.setDetail(93, 28, Detail.Straw);
  // The east walk: the patrol lane between keep and curtain.
  b.set(94, 14, Tile.Brazier);
  b.fillRect(95, 22, 1, 1, Tile.Snow);

  // ---------------------------------------------------------------
  // L3 EAST — PUBLIC GROUND: the mere, the garden, the shrine.
  // ---------------------------------------------------------------
  // Mere dressing: willows at the water, still-water fishing.
  b.set(119, 21, Tile.TreeWillow).set(102, 22, Tile.TreeWillow);
  b.set(103, 19, Tile.FishingSpot).set(114, 20, Tile.FishingSpot);
  // THE ROYAL GARDEN — the mere's south shore behind a low fence,
  // gate open (public, and the sign says so): the Queen's ground.
  b.outlineRect(104, 23, 15, 7, Tile.Fence);
  b.set(111, 29, Tile.Grass); // the gate
  b.set(106, 24, Tile.FlowerBox).set(109, 24, Tile.FlowerBox);
  b.set(112, 24, Tile.FlowerBox).set(115, 24, Tile.FlowerBox);
  b.set(110, 25, Tile.Basin); // the garden font
  b.set(108, 27, Tile.Bench).set(113, 27, Tile.Bench);
  b.set(106, 27, Tile.FlowerBox).set(115, 27, Tile.FlowerBox);
  // The beds between the boxes — the garden reads planted, not penned.
  b.setDetail(107, 25, Detail.Flowers).setDetail(110, 24, Detail.Flowers);
  b.setDetail(113, 25, Detail.Flowers).setDetail(108, 26, Detail.Flowers);
  b.setDetail(112, 27, Detail.Flowers).setDetail(110, 27, Detail.Flowers);
  b.fillRect(111, 30, 1, 3, Tile.Path); // gate -> the east arm
  b.sign(112, 30, 'THE ROYAL GARDEN', ['the Queen walks at midday', 'pick nothing']);
  // THE SILVER SHRINE — the mother-flame on its pilgrim path; every
  // road lamp in the Dawnlands is lit from this fire.
  b.fillRect(124, 15, 5, 5, Tile.StoneFloor);
  b.set(123, 13, Tile.PillarStone).set(129, 13, Tile.PillarStone);
  b.set(121, 17, Tile.PillarStone).set(131, 17, Tile.PillarStone);
  b.set(123, 21, Tile.PillarStone).set(129, 21, Tile.PillarStone);
  b.set(126, 17, Tile.Brazier); // the mother-flame
  b.set(124, 15, Tile.FlowerBox).set(128, 15, Tile.FlowerBox);
  b.set(125, 20, Tile.Bench).set(127, 20, Tile.Bench);
  b.set(126, 12, Tile.PillarStone).set(126, 22, Tile.PillarStone); // the ring closes N and S
  b.fillRect(125, 23, 2, 12, Tile.Path); // the pilgrim path, down to the arm
  b.set(123, 30, Tile.LampPost); // the one lamp the flame allows itself
  b.set(123, 28, Tile.Bench).set(128, 28, Tile.Bench); // the pilgrim rest
  // The circle stays BARE (the Quiet Stones lesson): the yews stand
  // down at the path's foot, never against the ring.
  b.set(122, 32, Tile.TreeYew).set(129, 32, Tile.TreeYew);
  // Alpine dressing on the public east strip.
  b.fillRect(121, 11, 2, 1, Tile.Snow);
  b.fillRect(133, 13, 2, 2, Tile.Snow);
  b.fillRect(119, 29, 2, 1, Tile.Snow).fillRect(132, 26, 3, 1, Tile.Snow);
  b.set(134, 23, Tile.Rock).set(120, 32, Tile.Rock);
  // The west ward strip, under the crag.
  b.fillRect(47, 11, 2, 1, Tile.Snow);
  b.set(49, 18, Tile.Rock).set(48, 33, Tile.Rock);

  // ---------------------------------------------------------------
  // THE HIGH LEDGES — the walks behind the terraces, snow-bitten.
  // The y7-9 band behind the castle is the Rookery's back way.
  // ---------------------------------------------------------------
  for (let x = 10; x <= 165; x += 7) {
    if ((x * 7) % 3 === 0) b.fillRect(x, 5, 2, 1, Tile.Snow);
  }
  b.fillRect(70, 8, 3, 1, Tile.Snow);
  b.fillRect(120, 7, 4, 2, Tile.Snow).fillRect(140, 8, 2, 1, Tile.Snow);
  b.set(52, 8, Tile.Rock).set(98, 7, Tile.Rock).set(130, 8, Tile.Rock);
  b.set(24, 5, Tile.Rock).set(112, 5, Tile.Rock);

  // ---------------------------------------------------------------
  // L2 NW — THE ROOKERY: the rogues' quarter in the crag shadow.
  // Older than the castle, never on any map the Guildhall sells.
  // Scree seals it south except one narrow alley toward the bank's
  // west wall; the high ledge behind the castle is the back way.
  // No lamps. No signs pointing in.
  // ---------------------------------------------------------------
  // The Undercroft mouth: cave mass in its own rock knoll, the arch,
  // the portal down to the Landing — and the braziers the Rookery
  // keeps fed, because THEY use the stair more than anyone.
  b.fillRect(33, 13, 11, 6, Tile.CaveWall);
  b.set(38, 18, Tile.ArchStone);
  b.portal(38, 17, Tile.PortalDown, { x: -333.5, y: 552.5 }, UNDERWORLD_PLANE_ID); // down to the Landing
  b.set(31, 16, Tile.Rock).set(32, 18, Tile.Rock).set(31, 19, Tile.Rock);
  b.set(44, 16, Tile.Rock).set(45, 18, Tile.Rock).set(45, 20, Tile.Rock);
  b.fillRect(35, 12, 3, 1, Tile.Snow).fillRect(40, 12, 2, 1, Tile.Snow);
  b.fillRect(36, 19, 5, 2, Tile.StoneFloor);
  b.set(36, 19, Tile.Brazier).set(40, 19, Tile.Brazier);
  b.sign(38, 21, 'THE UNDERCROFT', ['mind the step,', 'mind the kobolds']);
  b.set(34, 20, Tile.CaveRubble).set(42, 20, Tile.CaveRubble);
  b.setDetail(35, 21, Detail.Pebbles).setDetail(41, 22, Detail.Pebbles);
  // THE BROKEN LANTERN — the den. One door, east, watching the alley.
  b.fillRect(31, 22, 11, 7, Tile.WoodFloor);
  b.outlineRect(31, 22, 11, 7, Tile.WallWood);
  b.set(41, 25, Tile.DoorwayWood);
  b.set(35, 22, Tile.WallWoodWindow).set(31, 25, Tile.WallWoodWindow);
  b.set(32, 23, Tile.Hearth);
  // The Magpie holds court on somebody else's rug under a Silverfall
  // weave the castle's inventory insists is "in restoration."
  b.set(33, 25, Tile.Chair);
  b.setDetail(34, 24, Detail.Rug).setDetail(35, 24, Detail.Rug);
  b.setDetail(34, 25, Detail.Rug).setDetail(35, 25, Detail.Rug);
  b.setDetail(39, 22, Detail.Tapestry);
  b.set(36, 23, Tile.Table).set(35, 23, Tile.Chair).set(37, 23, Tile.Chair);
  b.set(38, 26, Tile.Counter).set(39, 26, Tile.Counter); // Calder's fence counter
  b.set(40, 23, Tile.CrateGoods).set(32, 27, Tile.Barrel);
  b.set(33, 27, Tile.ChestMossy); // the stash nobody official has opened
  b.setDetail(40, 25, Detail.Doormat);
  b.sign(42, 26, 'THE BROKEN LANTERN', ['ask for nothing,', 'see nothing']);
  // The lookout's corner at the alley mouth, and the camp scatter.
  b.set(44, 27, Tile.Crate).set(45, 28, Tile.Barrel);
  b.set(43, 28, Tile.Bench);
  b.set(43, 24, Tile.Campfire).set(44, 25, Tile.Bench);
  b.set(44, 10, Tile.Rock).set(45, 11, Tile.Rock).set(45, 12, Tile.Rock);
  b.set(33, 9, Tile.CaveRubble).set(44, 22, Tile.CaveRubble);
  b.setDetail(34, 10, Detail.Pebbles).setDetail(44, 26, Detail.Pebbles);
  b.set(32, 7, Tile.Stump).set(43, 8, Tile.Stump).set(43, 20, Tile.Stump);
  b.set(31, 11, Tile.GrassTall).set(45, 24, Tile.GrassTall).set(34, 29, Tile.GrassTall);
  b.setDetail(44, 21, Detail.Tuft).setDetail(32, 12, Detail.Tuft);
  // The scree seal: rock across the quarter's south face, the one
  // alley gap at x42-43 dropping toward the bank's back lot.
  for (let x = 31; x <= 41; x++) {
    b.set(x, 33, Tile.Rock);
    if (x % 3 === 0) b.set(x, 34, Tile.Rock);
  }
  b.set(44, 33, Tile.Rock).set(45, 33, Tile.Rock).set(44, 34, Tile.Rock).set(45, 34, Tile.Rock);
  // The back lot below the seal: forgotten ground between the
  // Rookery and the bank — no street, no lamps, on purpose.
  b.set(36, 40, Tile.Rock).set(40, 44, Tile.Rock).set(33, 47, Tile.Rock);
  b.set(34, 38, Tile.GrassTall).set(41, 48, Tile.GrassTall).set(37, 44, Tile.GrassTall);
  // THE CROWN DOOR (the Red Company epic): the Company's hatch in
  // the Rookery's back lot — Mab tolerates the door and the Company
  // pays her rent in news. No lamp, no sign, no name.
  b.fillRect(37, 42, 3, 3, Tile.Dirt);
  b.portal(38, 43, Tile.PortalDown, { x: 207.5, y: 573.5 }, UNDERWORLD_PLANE_ID); // the Silverfall alcove
  b.set(39, 42, Tile.Crate);
  b.setDetail(37, 43, Detail.Pebbles);

  // ---------------------------------------------------------------
  // L2 — THE SILVER COURT: the civic terrace, recut on the y38-49
  // band with the CIVIC AXIS (y43-44) running bank door -> plaza ->
  // falls bridge -> guildhall door.
  // ---------------------------------------------------------------
  // The GRAND COURT: the plaza at the stair's foot — fountain
  // square, the crier's lectern, the moot board, the licensed pitch.
  b.fillRect(70, 38, 25, 12, Tile.StoneFloor);
  b.set(78, 42, Tile.WaterShallow).set(79, 42, Tile.WaterShallow);
  b.set(78, 43, Tile.WaterShallow).set(79, 43, Tile.WaterShallow);
  b.set(76, 40, Tile.FlowerBox).set(81, 40, Tile.FlowerBox);
  b.set(76, 45, Tile.FlowerBox).set(81, 45, Tile.FlowerBox);
  b.set(77, 39, Tile.Bench).set(80, 39, Tile.Bench);
  b.set(77, 46, Tile.Bench).set(80, 46, Tile.Bench);
  b.set(73, 40, Tile.Lectern); // the crier reads the Crown's word here
  b.set(75, 40, Tile.NoticeBoard); // the word STAYS posted after he stops
  b.set(71, 40, Tile.TownBell); // 'first bell of the month' — the sign kept a promise
  b.set(74, 47, Tile.Barrel).set(75, 47, Tile.WoodStool); // the clerks' lunch corner
  b.sign(71, 42, 'THE GRAND COURT', ['the Crown hears moot', 'first bell of the month']);
  // The falls-side nook: benches and planters on the plunge bank —
  // the court's one quiet corner, facing the water.
  b.set(95, 39, Tile.FlowerBox).set(95, 48, Tile.FlowerBox);
  b.set(95, 42, Tile.Bench).set(95, 45, Tile.Bench);
  b.set(72, 38, bannerPoleTile(1)).set(94, 38, bannerPoleTile(1));
  b.set(72, 48, Tile.LampPost).set(94, 48, Tile.LampPost);
  b.stamp(MARKET_STALL, 73, 45); // the licensed pitch
  // THE KING'S ARCH — the Silver Line's centenary, arched over the
  // avenue where the court meets the Row.
  for (let x = 86; x <= 90; x++) b.set(x, 54, Tile.ArchStone);
  // (No cloth on the arch: hangings authored on ArchStone are orphan
  // state — the arch painter never hangs, and the Studio glyph baked
  // onto the walkable ground below as a 'floor banner' artifact the
  // user could stand on. Cloth hung FROM an arch is its own future
  // lane; the centenary arch stands clean until then.)
  b.set(84, 54, Tile.LampPost).set(92, 54, Tile.LampPost);
  // THE BANK OF SILVERFALL fronts the court from the west — the
  // mountain's coin sleeps here, under the Crown's countersign.
  b.fillRect(44, 38, 21, 12, Tile.StoneFloor);
  b.outlineRect(44, 38, 21, 12, Tile.WallStone);
  b.set(64, 38, Tile.WallStoneDiagSW); // court-facing shoulders
  b.set(64, 49, Tile.WallStoneDiagNW);
  b.set(64, 43, Tile.DoorwayStone).set(64, 44, Tile.DoorwayStone);
  b.set(64, 40, Tile.WallStoneWindow).set(64, 47, Tile.WallStoneWindow);
  b.set(50, 38, Tile.WallStoneWindow).set(57, 38, Tile.WallStoneWindow);
  b.set(50, 49, Tile.WallStoneWindow).set(57, 49, Tile.WallStoneWindow);
  // The vault: windowless, double-walled from the working floor.
  for (let y = 39; y <= 48; y++) b.set(49, y, Tile.WallStone);
  b.set(49, 43, Tile.DoorwayStone);
  b.set(45, 39, Tile.Vault).set(45, 41, Tile.Vault).set(45, 44, Tile.Vault).set(45, 46, Tile.Vault);
  b.set(47, 39, Tile.CrateGoods).set(47, 48, Tile.CrateGoods).set(45, 48, Tile.Cabinet);
  // The counting box: the vault's working coin, behind the authored
  // lock (factions Phase 5 — the pick's payoff, if nobody sees).
  b.set(47, 44, Tile.ChestMossy);
  // The working floor: teller counter breaking at the gate (y43) so
  // gate, vault door, and front door share one line.
  for (const y of [40, 41, 42, 44, 45, 46]) b.set(54, y, Tile.Counter);
  b.set(50, 39, Tile.Bookshelf).set(51, 39, Tile.Bookshelf).set(52, 39, Tile.Bookshelf);
  b.set(51, 41, Tile.ScribesDesk).set(52, 41, Tile.Chair); // the counting desks earn
  b.set(51, 46, Tile.ScribesDesk).set(52, 46, Tile.Chair); // their slant tops (upgrade law)
  b.set(50, 48, Tile.Cabinet).set(51, 48, Tile.Cabinet);
  // The lobby: the Crown's aisle in crimson to the teller gate, the
  // public ledgers, the waiting bench, the bank chests.
  b.set(57, 39, Tile.BankChest).set(57, 47, Tile.BankChest).set(62, 39, Tile.BankChest);
  b.set(59, 39, Tile.Bookshelf).set(60, 39, Tile.Bookshelf);
  b.set(60, 47, Tile.Bench).set(61, 47, Tile.Bench);
  for (let x = 55; x <= 62; x++) {
    b.setDetail(x, 43, Detail.CarpetRoyal).setDetail(x, 44, Detail.CarpetRoyal);
  }
  b.setDetail(58, 38, Detail.BannerCrown).setDetail(62, 38, Detail.BannerMoon);
  b.setDetail(60, 45, Detail.Rug).setDetail(61, 45, Detail.Rug);
  b.setDetail(63, 43, Detail.Doormat).setDetail(63, 44, Detail.Doormat);
  b.set(66, 41, Tile.LampPost).set(66, 46, Tile.LampPost);
  b.fillRect(65, 43, 5, 2, Tile.StoneFloor); // the door apron — coin walks on stone
  // THE GUILDHALL fronts the court from the east, across the falls
  // bridge — every trade's charter under one roof.
  b.fillRect(106, 38, 23, 12, Tile.StoneFloor);
  b.outlineRect(106, 38, 23, 12, Tile.WallStone);
  b.set(106, 43, Tile.DoorwayStone).set(106, 44, Tile.DoorwayStone);
  b.set(106, 40, Tile.WallStoneWindow).set(106, 47, Tile.WallStoneWindow);
  b.set(112, 38, Tile.WallStoneWindow).set(121, 38, Tile.WallStoneWindow);
  b.set(112, 49, Tile.WallStoneWindow).set(121, 49, Tile.WallStoneWindow);
  b.set(128, 41, Tile.WallStoneWindow).set(128, 46, Tile.WallStoneWindow);
  b.fillRect(104, 43, 2, 2, Tile.StoneFloor); // door walk to the bridge
  // The charter floor: the great table, the trades' library, the
  // seal counter; the records room keeps the deeds and the dust.
  for (let yy = 39; yy <= 48; yy++) b.set(123, yy, Tile.WallStone);
  b.set(123, 43, Tile.DoorwayStone);
  for (let x = 112; x <= 118; x++) b.set(x, 39, Tile.Bookshelf);
  b.set(108, 39, Tile.BannerPole);
  for (let x = 112; x <= 115; x++) b.set(x, 43, Tile.Table).set(x, 44, Tile.Table);
  b.set(111, 43, Tile.Chair).set(111, 44, Tile.Chair);
  b.set(116, 43, Tile.Chair).set(116, 44, Tile.Chair);
  b.set(113, 42, Tile.Chair).set(114, 42, Tile.Chair);
  b.set(113, 45, Tile.Chair).set(114, 45, Tile.Chair);
  b.set(108, 47, Tile.Counter).set(109, 47, Tile.Counter).set(110, 47, Tile.Counter);
  b.set(119, 47, Tile.Table).set(120, 47, Tile.Chair);
  b.setDetail(107, 43, Detail.Doormat).setDetail(107, 44, Detail.Doormat);
  // The petitioners' rug between door and charter table.
  for (let x = 108; x <= 110; x++) {
    for (let y = 42; y <= 44; y++) b.setDetail(x, y, Detail.Rug);
  }
  b.setDetail(110, 38, Detail.BannerCrown).setDetail(119, 38, Detail.BannerMoon);
  b.set(127, 39, Tile.Cabinet).set(127, 44, Tile.Cabinet).set(124, 48, Tile.Cabinet);
  b.set(125, 39, Tile.Bookshelf).set(126, 39, Tile.Bookshelf);
  b.set(125, 46, Tile.ScribesDesk).set(126, 46, Tile.Chair); // the records clerk's slant
  b.set(127, 48, Tile.CrateGoods);
  b.set(104, 46, Tile.NoticeBoard); // charters posted at the bridgehead
  // The court walks: bank front -> Silver Setting -> Arcanum, and
  // the court -> chapter house link. Streets first.
  b.fillRect(48, 50, 22, 2, Tile.StoneFloor);
  b.fillRect(46, 51, 2, 6, Tile.StoneFloor);
  b.fillRect(71, 50, 3, 2, Tile.StoneFloor);
  // THE ARCANUM: the enchanters' house on the southwest walk — runes
  // burn brighter this high. Solvei teaches, for a price.
  b.fillRect(34, 52, 13, 10, Tile.StoneFloor);
  b.outlineRect(34, 52, 13, 10, Tile.WallStone);
  b.set(46, 56, Tile.DoorwayStone);
  b.set(39, 52, Tile.WallStoneWindow).set(34, 57, Tile.WallStoneWindow);
  b.set(39, 61, Tile.WallStoneWindow);
  b.set(37, 55, Tile.EnchantingTable);
  b.set(35, 53, Tile.Bookshelf).set(36, 53, Tile.Bookshelf);
  b.set(43, 53, Tile.Bookshelf).set(44, 53, Tile.Bookshelf);
  b.setDetail(39, 57, Detail.RugRound); // the casting circle
  for (let x = 38; x <= 44; x++) b.setDetail(x, 56, Detail.CarpetMoon);
  b.set(41, 58, Tile.Table).set(42, 58, Tile.Chair);
  b.set(44, 59, Tile.Cabinet);
  b.set(35, 60, Tile.Brazier).set(44, 60, Tile.Brazier);
  b.setDetail(45, 56, Detail.Doormat);
  b.set(48, 56, Tile.LampPost);
  // THE WAYKEEPERS' CHAPTER HOUSE: the order that walks every mile
  // of the roads answers to this room.
  b.fillRect(66, 52, 15, 10, Tile.StoneFloor);
  b.outlineRect(66, 52, 15, 10, Tile.WallStone);
  b.set(72, 52, Tile.DoorwayStone).set(73, 52, Tile.DoorwayStone);
  b.set(69, 52, Tile.WallStoneWindow).set(77, 52, Tile.WallStoneWindow);
  b.set(66, 57, Tile.WallStoneWindow).set(80, 57, Tile.WallStoneWindow);
  // THE KNIGHT'S KEEPING: a waykeeper's harness stands dressed off
  // the rack wall (never IN the column — the berth-burial law), and
  // the order's halberd — the road-warden's own reach — hangs the
  // wall west of the door, the crown keeping the east.
  b.set(67, 53, Tile.WeaponRack).set(67, 55, Tile.WeaponRack).set(67, 57, Tile.WeaponRack);
  b.set(69, 55, Tile.ArmorStandFull);
  b.setDetail(71, 52, wallArmsDetail(2));
  b.set(71, 56, Tile.Table).set(72, 56, Tile.Table); // the road map table
  b.set(70, 56, Tile.Chair).set(73, 56, Tile.Chair);
  b.set(77, 53, Tile.Bookshelf).set(79, 53, Tile.Cabinet); // the duty ledgers
  b.set(76, 60, Tile.Bed).set(79, 60, Tile.Bed);
  b.set(69, 60, Tile.Brazier);
  b.setDetail(72, 53, Detail.Doormat).setDetail(73, 53, Detail.Doormat);
  b.setDetail(75, 52, Detail.BannerCrown);
  b.setDetail(71, 54, Detail.Rug).setDetail(72, 54, Detail.Rug);
  b.setDetail(71, 55, Detail.Rug).setDetail(72, 55, Detail.Rug);
  b.setDetail(77, 59, Detail.Rug).setDetail(78, 59, Detail.Rug);
  b.set(70, 51, Tile.BannerPole).set(75, 51, Tile.BannerPole);

  // ---------------------------------------------------------------
  // L2 — LANTERN ROW: the shopping street. Two rows of lamps, four
  // shopfronts, the bridgehead stalls, the falls under the middle.
  // ---------------------------------------------------------------
  b.fillRect(93, 60, 5, 2, Tile.StoneFloor); // avenue -> bridge
  b.fillRect(104, 60, 41, 2, Tile.StoneFloor); // the Row proper
  // THE SILVER SETTING — the jeweler on the court walk.
  b.fillRect(50, 52, 13, 9, Tile.StoneFloor);
  b.outlineRect(50, 52, 13, 9, Tile.WallStone);
  b.set(56, 52, Tile.DoorwayStone);
  b.set(52, 52, Tile.WallStoneWindow).set(60, 52, Tile.WallStoneWindow);
  b.set(50, 56, Tile.WallStoneWindow).set(62, 56, Tile.WallStoneWindow);
  b.set(53, 55, Tile.Counter).set(54, 55, Tile.Counter).set(55, 55, Tile.Counter);
  b.set(51, 53, Tile.DisplayTable).set(52, 53, Tile.Cabinet); // the mountain made small, shown small
  b.set(59, 53, Tile.Workbench); // the setting bench
  b.set(61, 54, Tile.Furnace); // the small silver furnace
  b.set(51, 59, Tile.CrateGoods).set(61, 59, Tile.Cabinet);
  b.set(58, 58, Tile.Table).set(57, 58, Tile.Chair);
  b.setDetail(56, 53, Detail.Doormat);
  b.setDetail(51, 54, Detail.CarpetMoon).setDetail(52, 54, Detail.CarpetMoon);
  b.setDetail(53, 56, Detail.Rug).setDetail(54, 56, Detail.Rug);
  b.setDetail(53, 57, Detail.Rug).setDetail(54, 57, Detail.Rug);
  b.fillRect(54, 51, 5, 1, Tile.StoneFloor); // the doorstep
  b.sign(59, 51, 'THE SILVER SETTING', ['rings, settings,', 'the mountain made small']);
  // THE CLOTH HALL — Ottilie's looms behind, bolts counter in front.
  b.fillRect(105, 51, 11, 9, Tile.WoodFloor);
  b.outlineRect(105, 51, 11, 9, Tile.WallWood);
  b.set(110, 59, Tile.DoorwayWood);
  b.set(107, 59, Tile.WallWoodWindow).set(113, 59, Tile.WallWoodWindow);
  b.set(107, 60, awningTile('bowed', 3)).set(113, 60, awningTile('bowed', 3));
  b.setDetail(109, 59, pennantDetail(3));
  b.set(105, 55, Tile.WallWoodWindow).set(115, 55, Tile.WallWoodWindow);
  b.set(107, 53, Tile.Loom).set(107, 56, Tile.Loom);
  b.set(109, 52, Tile.ClothBolts); // the bolts the sign promises
  b.set(114, 53, Tile.TailorsDummy); // the commission stands fitted
  b.set(109, 57, Tile.Counter).set(110, 57, Tile.Counter).set(111, 57, Tile.Counter);
  b.set(113, 52, Tile.Cabinet).set(114, 52, Tile.Bookshelf);
  b.setDetail(111, 51, Detail.Tapestry).setDetail(112, 51, Detail.Tapestry);
  for (let x = 109; x <= 111; x++) {
    b.setDetail(x, 54, Detail.Rug).setDetail(x, 55, Detail.Rug);
  }
  b.setDetail(113, 56, Detail.RugRound);
  b.setDetail(110, 58, Detail.Doormat);
  b.sign(113, 61, 'THE CLOTH HALL', ['bolts up the Silver Stair']);
  // INKS & CHARTS — the scrivener: folios, deeds, and honest maps.
  b.fillRect(118, 51, 9, 9, Tile.WoodFloor);
  b.outlineRect(118, 51, 9, 9, Tile.WallWood);
  b.set(122, 59, Tile.DoorwayWood);
  b.set(119, 59, Tile.WallWoodWindow).set(125, 59, Tile.WallWoodWindow);
  b.set(119, 60, awningTile('bowed', 5)).set(125, 60, awningTile('bowed', 5));
  b.set(118, 55, Tile.WallWoodWindow).set(126, 55, Tile.WallWoodWindow);
  b.set(119, 52, Tile.Bookshelf).set(120, 52, Tile.Bookshelf);
  b.set(124, 52, Tile.Bookshelf).set(125, 52, Tile.Bookshelf);
  b.set(121, 54, Tile.Lectern); // the chart desk — the honest maps
  b.set(119, 56, Tile.ScribesDesk).set(120, 56, Tile.Chair); // deeds drawn at a true slant
  b.set(124, 53, Tile.CandleStand); // the late copying hours
  b.set(123, 56, Tile.Counter).set(124, 56, Tile.Counter);
  b.set(125, 57, Tile.CrateGoods);
  b.setDetail(122, 58, Detail.Doormat);
  b.setDetail(121, 55, Detail.Rug).setDetail(122, 55, Detail.Rug);
  b.setDetail(121, 56, Detail.Rug).setDetail(122, 56, Detail.Rug);
  b.sign(125, 61, 'INKS & CHARTS', ['deeds drawn, maps true']);
  // THE SILVER FLAGON — the capital's inn: the bar, the hearth, the
  // guest wing, and every rumor the High Road carries.
  b.fillRect(129, 50, 15, 10, Tile.WoodFloor);
  b.outlineRect(129, 50, 15, 10, Tile.WallWood);
  b.set(135, 59, Tile.DoorwayWood).set(136, 59, Tile.DoorwayWood);
  b.set(132, 59, Tile.WallWoodWindow).set(139, 59, Tile.WallWoodWindow);
  b.set(129, 54, Tile.WallWoodWindow).set(134, 50, Tile.WallWoodWindow);
  b.set(130, 51, Tile.Hearth);
  b.set(131, 56, Tile.Counter).set(132, 56, Tile.Counter).set(133, 56, Tile.Counter);
  b.set(130, 52, Tile.TapCask).set(130, 58, Tile.BarrelStack); // the cellar works, and shows it
  b.set(133, 52, Tile.Table).set(132, 52, Tile.Chair).set(134, 52, Tile.Chair);
  b.set(136, 54, Tile.Table).set(135, 54, Tile.Chair).set(137, 54, Tile.Chair);
  b.setDetail(131, 53, Detail.Rug).setDetail(132, 53, Detail.Rug);
  b.setDetail(131, 54, Detail.Rug).setDetail(132, 54, Detail.Rug);
  b.setDetail(134, 57, Detail.Rug).setDetail(135, 57, Detail.Rug);
  b.setDetail(136, 50, Detail.Tapestry).setDetail(137, 50, Detail.Tapestry);
  for (let y = 51; y <= 58; y++) b.set(139, y, Tile.WallWood);
  b.set(139, 54, Tile.DoorwayWood);
  b.set(141, 51, Tile.Bed).set(141, 52, Tile.Bed);
  b.set(143, 51, Tile.Bed).set(143, 52, Tile.Bed);
  b.set(141, 57, Tile.Bed).set(141, 58, Tile.Bed);
  b.set(143, 58, Tile.Cabinet);
  b.setDetail(141, 54, Detail.Rug).setDetail(142, 54, Detail.Rug);
  b.setDetail(141, 55, Detail.Rug).setDetail(142, 55, Detail.Rug);
  b.setDetail(135, 58, Detail.Doormat).setDetail(136, 58, Detail.Doormat);
  b.sign(139, 61, 'THE SILVER FLAGON', ['beds, board,', 'and the news first']);
  // The bridgehead stalls: two pitches on the west bank of the falls.
  b.stamp(MARKET_STALL, 94, 53);
  b.stamp(MARKET_STALL, 94, 57);
  // The Row's LANTERNS — the name is finally literal: wrought
  // street lanterns where the avenue makes do with posts.
  b.set(105, 62, Tile.StreetLantern).set(117, 62, Tile.StreetLantern);
  b.set(128, 62, Tile.StreetLantern).set(144, 62, Tile.StreetLantern);
  b.sign(104, 62, 'LANTERN ROW', ['shopfronts to the falls'], Tile.Signpost);
  // The east promenade: pines and lamps along the hall-terrace walk.
  b.set(141, 42, Tile.TreePine).set(143, 47, Tile.TreePine);
  b.set(134, 40, Tile.LampPost).set(141, 49, Tile.Bench);
  b.set(64, 51, Tile.TreeYew);

  // ---------------------------------------------------------------
  // THE COURT GATE — the civic terrace's one grand tooth: nine tiles
  // of garrison arch where the Silver Stair crowns L2, wings dying
  // into the rim and the falls channel. The side stairs stay open
  // working stairs on purpose.
  // ---------------------------------------------------------------
  b.fillRect(81, 62, 3, 1, Tile.WallGarrison); // west wing
  b.fillRect(93, 62, 6, 1, Tile.WallGarrison); // east wing, to the water
  for (let x = 84; x <= 92; x++) b.set(x, 62, Tile.GateGarrison);
  b.setDetail(83, 62, Detail.BannerCrown).setDetail(93, 62, Detail.BannerMoon);
  b.sign(81, 60, 'THE COURT GATE', ['the Crown hears who climbs'], Tile.Signpost);

  // ---------------------------------------------------------------
  // L1 WEST — THE EMBERWAY: the smelting district. Silver first,
  // everything else after.
  // ---------------------------------------------------------------
  b.fillRect(12, 82, 72, 2, Tile.Path); // the Emberway lane
  b.sign(80, 81, 'THE EMBERWAY', ['ore to ingot to edge'], Tile.Signpost);
  // THE MINE YARD: the open workings under the west cliffs.
  b.fillRect(10, 66, 36, 27, Tile.Dirt);
  b.set(12, 69, Tile.RockSilver).set(14, 72, Tile.RockSilver);
  b.set(11, 76, Tile.RockIron).set(12, 79, Tile.RockCoal);
  b.set(17, 71, Tile.PillarStone); // shoring
  b.set(15, 75, Tile.CaveRubble).set(16, 76, Tile.CaveRubble); // spoil
  b.setDetail(14, 74, Detail.Pebbles).setDetail(16, 70, Detail.Pebbles);
  b.set(14, 87, Tile.RockSilver).set(22, 89, Tile.RockSilver);
  b.set(16, 90, Tile.RockGold).set(24, 86, Tile.RockIron).set(20, 85, Tile.RockCoal);
  b.set(24, 84, Tile.PillarStone);
  b.set(23, 87, Tile.CaveRubble).set(18, 89, Tile.CaveRubble);
  b.setDetail(19, 87, Detail.Pebbles).setDetail(21, 91, Detail.Pebbles);
  b.set(27, 70, Tile.RockSilver);
  b.set(29, 80, Tile.Crate).set(30, 81, Tile.Crate).set(31, 79, Tile.Crate);
  b.set(30, 78, Tile.ToolRack).set(28, 79, Tile.WaterCask); // the shift drinks drawn water
  b.set(19, 78, Tile.Brazier).set(15, 88, Tile.Brazier);
  // THE SMELTER HALL: three furnaces, charge bins, slag trough,
  // tally desk.
  b.fillRect(32, 66, 17, 13, Tile.StoneFloor);
  b.outlineRect(32, 66, 17, 13, Tile.WallStone);
  b.set(39, 78, Tile.DoorwayStoneWide).set(40, 78, Tile.DoorwayStoneWide);
  b.set(35, 78, Tile.WallStoneWindow).set(44, 78, Tile.WallStoneWindow);
  b.set(32, 71, Tile.WallStoneWindow).set(48, 71, Tile.WallStoneWindow);
  b.set(34, 68, Tile.Furnace).set(38, 68, Tile.Furnace).set(42, 68, Tile.Furnace);
  b.set(36, 68, Tile.CrateGoods).set(40, 68, Tile.CrateGoods); // the charge bins
  b.set(45, 68, Tile.Basin); // the slag trough
  b.set(45, 74, Tile.IngotRack).set(46, 76, Tile.CrateGoods); // ingots RACKED, not crated (upgrade law)
  b.set(34, 75, Tile.Counter).set(35, 75, Tile.Counter).set(36, 75, Tile.Counter);
  b.set(35, 74, Tile.Chair).set(33, 76, Tile.Cabinet); // the tally desk
  b.setDetail(39, 79, Detail.Doormat).setDetail(40, 79, Detail.Doormat);
  b.setDetail(40, 71, Detail.Pebbles).setDetail(43, 73, Detail.Pebbles);
  b.set(47, 72, Tile.Barrel).setDetail(43, 70, Detail.Pebbles);
  b.fillRect(39, 79, 2, 3, Tile.Path); // doorstep to the lane
  b.sign(37, 80, 'THE SMELTER', ['pour days: all of them']);
  // THE ASSAY HOUSE: where the Crown weighs what the mountain gives.
  b.fillRect(52, 85, 8, 7, Tile.StoneFloor);
  b.outlineRect(52, 85, 8, 7, Tile.WallStone);
  b.set(56, 85, Tile.DoorwayStone);
  b.set(54, 85, Tile.WallStoneWindow).set(52, 88, Tile.WallStoneWindow);
  b.set(55, 91, Tile.WallStoneWindow);
  b.set(54, 88, Tile.Counter).set(55, 88, Tile.Counter).set(56, 88, Tile.Counter);
  b.set(53, 90, Tile.Vault); // the tithe vault
  b.set(57, 90, Tile.TiedParcels).set(57, 89, Tile.Chair); // the tithe counted, wrapped, and ledgered
  b.set(58, 86, Tile.Cabinet);
  b.setDetail(56, 86, Detail.Doormat);
  b.setDetail(58, 85, Detail.BannerCrown);
  b.setDetail(54, 87, Detail.CarpetRoyal).setDetail(55, 87, Detail.CarpetRoyal);
  b.setDetail(56, 87, Detail.CarpetRoyal);
  b.set(56, 84, Tile.Path); // the doorstep to the lane
  b.sign(54, 84, 'THE ASSAY HOUSE', ['weighed true, taxed truer']);
  // The tally yard: staged ore, staged ingots, the barrow queue.
  b.set(52, 68, Tile.Crate).set(53, 70, Tile.Crate).set(51, 71, Tile.CrateGoods);
  b.setDetail(52, 71, Detail.Pebbles).setDetail(54, 69, Detail.Pebbles);
  b.set(53, 75, Tile.Crate).set(52, 77, Tile.Barrel);
  // THE GREAT FORGE: the mountain's anvils, working in a line.
  b.fillRect(61, 66, 21, 15, Tile.StoneFloor);
  b.outlineRect(61, 66, 21, 15, Tile.WallStone);
  b.set(70, 80, Tile.DoorwayStoneWide).set(71, 80, Tile.DoorwayStoneWide);
  b.set(65, 80, Tile.WallStoneWindow).set(77, 80, Tile.WallStoneWindow);
  b.setDetail(73, 80, bracketSignDetail(2));
  b.set(61, 71, Tile.WallStoneWindow).set(61, 76, Tile.WallStoneWindow);
  b.set(81, 71, Tile.WallStoneWindow).set(66, 66, Tile.WallStoneWindow).set(76, 66, Tile.WallStoneWindow);
  b.set(63, 69, Tile.Furnace).set(63, 74, Tile.Furnace);
  b.set(62, 67, Tile.Crate).set(62, 76, Tile.Crate); // the coal
  b.set(66, 69, Tile.Anvil).set(66, 74, Tile.Anvil).set(69, 71, Tile.Anvil);
  b.set(68, 69, Tile.QuenchTrough).set(68, 74, Tile.QuenchTrough); // the quench earns its steam
  b.set(64, 68, Tile.SmithBellows); // the lungs between the fires
  b.set(79, 69, Tile.IngotRack); // the day's pour, racked
  b.set(77, 71, Tile.Grindstone); // edges before fittings
  b.set(76, 68, Tile.Workbench); // finishing bench
  b.set(80, 68, Tile.ToolRack).set(80, 71, Tile.WeaponRack).set(80, 74, Tile.WeaponRack);
  b.set(67, 78, Tile.Counter).set(68, 78, Tile.Counter).set(69, 78, Tile.Counter);
  b.set(65, 78, Tile.CrateGoods).set(74, 78, Tile.Bench); // commissions wait here
  b.set(76, 72, Tile.Workbench).set(79, 77, Tile.CrateGoods); // the fitting corner
  b.setDetail(70, 79, Detail.Doormat).setDetail(71, 79, Detail.Doormat);
  b.setDetail(67, 72, Detail.Pebbles).setDetail(72, 75, Detail.Pebbles);
  b.setDetail(74, 70, Detail.Pebbles).setDetail(78, 74, Detail.Pebbles);
  b.fillRect(70, 81, 2, 1, Tile.Path); // doorstep to the lane
  b.sign(67, 81, 'THE GREAT FORGE', ['silver worked, steel earned']);
  // The forge yard: the shift's rest.
  b.fillRect(76, 84, 18, 9, Tile.Dirt);
  b.set(82, 88, Tile.Campfire);
  b.set(80, 87, Tile.Bench).set(80, 89, Tile.Bench);
  b.set(84, 87, Tile.Bench).set(84, 89, Tile.Bench);
  b.set(77, 85, Tile.WeaponRack).set(79, 85, Tile.ToolRack);
  b.set(91, 85, Tile.Crate).set(92, 90, Tile.Barrel).set(91, 91, Tile.CrateGoods);
  b.setDetail(83, 90, Detail.Pebbles).setDetail(86, 86, Detail.Pebbles);
  // THE MASONS' YARD: stock, benches, finished work, rubble heap.
  b.fillRect(32, 84, 15, 9, Tile.Dirt);
  b.set(34, 86, Tile.PillarStone).set(34, 90, Tile.PillarStone); // stock
  b.set(36, 86, Tile.Crate).set(36, 90, Tile.Crate); // rough blocks
  b.set(39, 86, Tile.Workbench).set(39, 90, Tile.Workbench);
  b.set(43, 86, Tile.CrateGoods); // finished ashlar
  b.set(41, 88, Tile.Wheelbarrow); // the yard moves its own stone
  b.set(44, 90, Tile.CaveRubble).set(45, 91, Tile.CaveRubble);
  b.setDetail(37, 88, Detail.Pebbles).setDetail(42, 91, Detail.Pebbles);
  // THE DEEP GALLERIES: the west arm's old workings.
  b.fillRect(10, 8, 18, 54, Tile.Dirt);
  b.set(14, 10, Tile.RockMithril);
  b.set(12, 12, Tile.RockSilver).set(17, 13, Tile.RockSilver);
  b.set(11, 16, Tile.RockCoal);
  b.set(24, 12, Tile.CaveRubble).set(25, 13, Tile.CaveRubble);
  b.set(12, 34, Tile.RockSilver).set(15, 32, Tile.RockIron).set(13, 38, Tile.RockCoal);
  b.set(11, 44, Tile.CaveRubble).set(12, 45, Tile.CaveRubble);
  b.set(20, 46, Tile.RockSilver).set(22, 52, Tile.RockIron);
  b.set(10, 55, Tile.RockAdamant);
  b.set(13, 20, Tile.PillarStone).set(17, 20, Tile.PillarStone);
  b.set(12, 36, Tile.PillarStone).set(16, 36, Tile.PillarStone);
  b.set(16, 48, Tile.PillarStone).set(20, 48, Tile.PillarStone);
  b.set(16, 18, Tile.Brazier).set(14, 28, Tile.Brazier);
  b.set(16, 40, Tile.Brazier).set(20, 58, Tile.Brazier);
  b.set(26, 60, Tile.Crate).set(11, 60, Tile.Barrel).set(24, 58, Tile.ToolRack);
  b.setDetail(14, 24, Detail.Pebbles).setDetail(19, 36, Detail.Pebbles);
  b.setDetail(13, 50, Detail.Pebbles).setDetail(22, 16, Detail.Pebbles);
  b.fillRect(10, 8, 3, 2, Tile.Snow);

  // ---------------------------------------------------------------
  // L1 EAST — THE TIMBERWAY: the woodworking district.
  // ---------------------------------------------------------------
  b.fillRect(104, 64, 2, 18, Tile.Path); // the crafts spine (bridge -> lane)
  b.fillRect(104, 80, 49, 2, Tile.Path); // the east working lane
  b.sign(107, 64, 'THE TIMBERWAY', ['sawn true, joined tight'], Tile.Signpost);
  // THE CARPENTERS' HALL: work line north, commission counter south.
  b.fillRect(107, 66, 13, 13, Tile.WoodFloor);
  b.outlineRect(107, 66, 13, 13, Tile.WallWood);
  b.set(107, 71, Tile.DoorwayWood).set(107, 72, Tile.DoorwayWood);
  b.set(107, 68, Tile.WallWoodWindow).set(107, 76, Tile.WallWoodWindow);
  b.set(112, 66, Tile.WallWoodWindow).set(117, 66, Tile.WallWoodWindow);
  b.set(112, 78, Tile.WallWoodWindow).set(117, 78, Tile.WallWoodWindow);
  b.set(109, 68, Tile.CarvingBench).set(112, 68, Tile.CarvingBench);
  b.set(115, 68, Tile.Workbench).set(118, 69, Tile.Workbench);
  b.set(118, 67, Tile.LumberRack); // seasoned timber, racked to read (upgrade law)
  b.setDetail(110, 70, Detail.Sawdust).setDetail(114, 70, Detail.Sawdust);
  b.set(110, 75, Tile.Counter).set(111, 75, Tile.Counter).set(112, 75, Tile.Counter);
  b.set(118, 76, Tile.Bookshelf); // the pattern books
  b.set(108, 77, Tile.DisplayTable); // finished commissions, shown (upgrade law)
  b.set(115, 76, Tile.Table).set(116, 76, Tile.Chair);
  b.setDetail(108, 71, Detail.Doormat).setDetail(108, 72, Detail.Doormat);
  for (let x = 110; x <= 112; x++) b.setDetail(x, 74, Detail.Rug);
  b.sign(110, 80, 'THE CARPENTERS\' HALL', ['doors, carts, cradles']);
  // THE SAW YARD: log stacks, the trestles, sawdust over everything.
  b.fillRect(124, 64, 11, 7, Tile.Dirt);
  b.set(124, 65, Tile.Stump).set(125, 65, Tile.Stump).set(126, 65, Tile.Stump);
  b.set(124, 67, Tile.Stump).set(125, 67, Tile.Stump);
  b.set(132, 65, Tile.LumberRack).set(133, 66, Tile.Crate); // planks racked, offcuts crated
  b.set(127, 70, Tile.Sawhorse).set(128, 70, Tile.Sawhorse);
  b.setDetail(127, 69, Detail.Sawdust).setDetail(128, 69, Detail.Sawdust);
  b.setDetail(126, 68, Detail.Sawdust);
  b.set(124, 69, Tile.ToolRack).set(133, 70, Tile.Barrel);
  b.set(130, 67, Tile.Brazier);
  b.setDetail(131, 68, Detail.Pebbles);
  // THE FLETCHER'S PERCH: bows and shafts off the best straight grain.
  b.fillRect(123, 74, 8, 6, Tile.WoodFloor);
  b.outlineRect(123, 74, 8, 6, Tile.WallWood);
  b.set(126, 79, Tile.DoorwayWood);
  b.set(124, 79, Tile.WallWoodWindow).set(129, 79, Tile.WallWoodWindow);
  b.set(124, 75, Tile.CarvingBench);
  b.set(127, 75, Tile.FletchersBench); // shafts get their own bench beside the staves
  b.set(129, 75, Tile.WeaponRack); // the finished bows
  b.set(128, 77, Tile.Crate); // feathers and staves
  b.set(125, 77, Tile.Counter);
  b.setDetail(126, 76, Detail.RugRound); // fletching is floor work
  b.setDetail(126, 78, Detail.Doormat);
  b.sign(129, 81, 'THE FLETCHER\'S PERCH', ['straight grain, true flight']);
  // THE COOPERAGE: staves to barrels for the whole province.
  b.fillRect(137, 66, 9, 8, Tile.WoodFloor);
  b.outlineRect(137, 66, 9, 8, Tile.WallWood);
  b.set(141, 73, Tile.DoorwayWood);
  b.set(139, 73, Tile.WallWoodWindow).set(143, 73, Tile.WallWoodWindow);
  b.set(137, 69, Tile.WallWoodWindow);
  b.set(139, 68, Tile.Workbench); // the stave bench
  b.set(143, 67, Tile.Barrel).set(143, 69, Tile.Barrel).set(143, 71, Tile.Barrel);
  b.set(138, 67, Tile.Crate); // split staves
  b.set(138, 71, Tile.ToolRack);
  b.setDetail(141, 72, Detail.Doormat).setDetail(140, 69, Detail.Sawdust);
  b.fillRect(140, 74, 2, 6, Tile.Path); // spur to the lane
  b.sign(143, 75, 'THE COOPERAGE', ['staves bent, hoops rung']);
  // THE MESS TERRACE: stone flags between the falls and the cookhouse.
  b.fillRect(108, 83, 14, 10, Tile.StoneFloor);
  b.set(111, 85, Tile.Table).set(112, 85, Tile.Table).set(113, 85, Tile.Table);
  b.set(111, 84, Tile.Bench).set(112, 84, Tile.Bench).set(113, 84, Tile.Bench);
  b.set(111, 86, Tile.Bench).set(112, 86, Tile.Bench).set(113, 86, Tile.Bench);
  b.set(116, 89, Tile.Table).set(117, 89, Tile.Table).set(118, 89, Tile.Table);
  b.set(116, 88, Tile.Bench).set(117, 88, Tile.Bench).set(118, 88, Tile.Bench);
  b.set(116, 90, Tile.Bench).set(117, 90, Tile.Bench).set(118, 90, Tile.Bench);
  b.set(109, 84, Tile.Brazier).set(120, 92, Tile.Brazier);
  b.set(109, 88, Tile.Bench); // the channel overlook
  b.set(120, 83, Tile.TapCask); // the shift's beer, coopered and cradled
  // THE COOKHOUSE feeds both districts from the middle.
  b.fillRect(124, 82, 13, 11, Tile.WoodFloor);
  b.outlineRect(124, 82, 13, 11, Tile.WallWood);
  b.set(124, 87, Tile.DoorwayWood);
  b.set(124, 84, Tile.WallWoodWindow).set(128, 82, Tile.WallWoodWindow);
  b.set(133, 82, Tile.WallWoodWindow).set(136, 87, Tile.WallWoodWindow);
  b.set(128, 92, Tile.WallWoodWindow).set(133, 92, Tile.WallWoodWindow);
  b.set(126, 83, Tile.Hearth).set(129, 83, Tile.Hearth);
  b.set(132, 83, Tile.Counter).set(133, 83, Tile.Counter); // the prep line
  b.set(135, 83, Tile.Basin);
  b.set(126, 86, Tile.Counter).set(126, 88, Tile.Counter); // the serving pass
  b.set(134, 90, Tile.CrateGoods).set(135, 88, Tile.Barrel).set(133, 91, Tile.Crate);
  b.set(131, 90, Tile.GlazedJars).set(127, 90, Tile.BasketStack); // the pantry reads
  b.set(129, 89, Tile.Table).set(128, 89, Tile.Chair);
  b.setDetail(125, 87, Detail.Doormat);
  b.fillRect(122, 87, 2, 1, Tile.Path); // doorstep to the terrace
  b.sign(127, 81, 'THE COOKHOUSE', ['both shifts fed, no favorites']);
  // THE DISPENSARY: Wyn's counter fronts the lane.
  b.fillRect(140, 82, 10, 10, Tile.WoodFloor);
  b.outlineRect(140, 82, 10, 10, Tile.WallWood);
  b.set(144, 82, Tile.DoorwayWood);
  b.set(141, 82, Tile.WallWoodWindow).set(147, 82, Tile.WallWoodWindow);
  b.set(140, 87, Tile.WallWoodWindow).set(149, 87, Tile.WallWoodWindow);
  b.set(142, 84, Tile.Alembic);
  b.set(146, 84, Tile.HerbRack); // the drying frame beside the still
  b.set(141, 89, Tile.Cabinet).set(147, 83, Tile.Bookshelf);
  b.set(148, 89, Tile.Bed); // Wyn sleeps over the shop
  b.set(143, 86, Tile.Counter).set(144, 86, Tile.Counter);
  b.set(146, 86, Tile.Table).set(146, 87, Tile.Chair);
  b.setDetail(144, 83, Detail.Doormat);
  b.setDetail(142, 87, Detail.Rug).setDetail(143, 87, Detail.Rug);
  b.setDetail(142, 88, Detail.Rug).setDetail(143, 88, Detail.Rug);
  b.setDetail(147, 89, Detail.RugRound);
  b.sign(147, 81, 'THE DISPENSARY', ['tinctures for the climb']);
  // THE HERBALIST'S SHELF: Wyn's shop reads its trade from inside —
  // the healer's row on the sill over the alembic corner, kitchen
  // pots by the bookshelf light, and the dispensary's stock hung
  // heads-down over the counter wall.
  b.setDetail(141, 82, sillHerbsDetail(1)).setDetail(147, 82, sillHerbsDetail(0));
  b.setDetail(145, 82, herbBundlesDetail(1));
  // The tanning pad, downwind of everything.
  b.fillRect(152, 84, 4, 4, Tile.Dirt);
  b.set(153, 85, Tile.TanningRack).set(155, 86, Tile.Barrel);
  b.setDetail(154, 87, Detail.Pebbles);
  // THE GREENSTAIR: the east arm's terraced gardens.
  b.outlineRect(151, 66, 13, 11, Tile.Fence);
  b.set(151, 71, Tile.Grass); // gate, west, on its own lane spur
  b.fillRect(150, 71, 1, 10, Tile.Path); // Greenstair gate spur
  b.set(158, 67, Tile.Basin).set(152, 67, Tile.Crate);
  b.set(160, 67, Tile.HerbPlanter); // the Greenstair's physic tub — seedlings for the terraces below
  for (let x = 153; x <= 161; x += 1) {
    b.set(x, 68, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 71, x % 2 === 0 ? Tile.Tilled : Tile.MoonbellMid);
    b.set(x, 74, x % 2 === 0 ? Tile.CarrotRipe : Tile.Tilled);
  }
  b.set(153, 75, Tile.BerryBush).set(160, 75, Tile.BerryBush);
  // Two field terraces up the arm; the middle pad is the pasture.
  for (const [gx, gy] of [
    [150, 14], [150, 30],
  ] as const) {
    b.fillRect(gx, gy, 14, 8, Tile.Dirt);
    for (let x = gx + 1; x <= gx + 12; x += 1) {
      b.set(x, gy + 1, x % 2 === 0 ? Tile.WheatMid : Tile.Tilled);
      b.set(x, gy + 3, x % 2 === 0 ? Tile.Tilled : Tile.CottonMid);
      b.set(x, gy + 5, x % 2 === 0 ? Tile.WheatMid : Tile.Tilled);
    }
    b.set(gx + 1, gy + 7, Tile.BerryBush).set(gx + 12, gy + 7, Tile.BerryBush);
  }
  // THE CRAG PASTURE: the city's rams keep the middle terrace down.
  b.outlineRect(150, 46, 14, 8, Tile.Fence);
  b.set(150, 49, Tile.Grass); // the gate, west
  b.set(152, 47, Tile.Basin);
  b.setDetail(154, 49, Detail.Straw).setDetail(159, 51, Detail.Straw);
  b.fillRect(160, 47, 2, 1, Tile.Snow);
  b.set(160, 40, Tile.BerryBush).set(158, 56, Tile.FibrePlant).set(162, 24, Tile.FibrePlant);
  b.set(148, 22, Tile.TreeOak).set(160, 36, Tile.TreeOak).set(148, 58, Tile.TreeOak);

  // ---------------------------------------------------------------
  // L0 — THE GATEFRONT: the wall, the towers, the pool, the yards.
  // ---------------------------------------------------------------
  // The flanking crags first: backdrop scatter, skipping the ground
  // the wardhouse claims.
  for (const [rx, ry, rw, rh] of [
    [10, 98, 22, 13], [140, 98, 24, 13],
  ] as const) {
    for (let y = ry; y < ry + rh; y += 3) {
      for (let x = rx; x < rx + rw; x += 4) {
        if (x >= 12 && x <= 36 && y >= 97 && y <= 110) continue; // the wardhouse ground
        const j = (x * 7 + y * 13) % 5;
        if (j === 0) b.set(x, y, Tile.Rock);
        else if (j === 1) b.set(x + 1, y + 1, Tile.Tree);
        else if (j === 2) b.set(x, y + 1, Tile.Stump);
      }
    }
  }
  // THE WARDHOUSE — the city watch's barracks: the capital's steel
  // lives at the gate it answers for. Bunks in hot rotation (the
  // rota law), the mess, the racks, and the drill ground east.
  b.fillRect(14, 99, 15, 9, Tile.StoneFloor);
  b.outlineRect(14, 99, 15, 9, Tile.WallStone);
  b.set(28, 103, Tile.DoorwayStone);
  b.set(18, 99, Tile.WallStoneWindow).set(24, 99, Tile.WallStoneWindow);
  b.set(14, 103, Tile.WallStoneWindow);
  b.set(18, 107, Tile.WallStoneWindow).set(24, 107, Tile.WallStoneWindow);
  b.set(16, 100, Tile.Bed).set(16, 101, Tile.Bed);
  b.set(18, 100, Tile.Bed).set(18, 101, Tile.Bed);
  b.set(20, 100, Tile.Bed).set(20, 101, Tile.Bed);
  b.set(22, 100, Tile.Bed).set(22, 101, Tile.Bed);
  b.set(15, 103, Tile.Cabinet);
  b.set(15, 106, Tile.WeaponRack).set(17, 106, Tile.WeaponRack).set(19, 106, Tile.ToolRack);
  b.set(21, 106, Tile.SpearRack); // the wall's own reach
  b.set(27, 105, Tile.WaterCask); // the watch drinks drawn
  b.set(26, 100, Tile.Bookshelf); // the duty board
  b.set(23, 104, Tile.Table).set(24, 104, Tile.Table);
  b.set(23, 103, Tile.Chair).set(24, 105, Tile.Chair);
  b.set(26, 106, Tile.Brazier);
  b.setDetail(21, 99, Detail.BannerCrown);
  for (let x = 16; x <= 22; x++) b.setDetail(x, 102, Detail.Rug);
  b.setDetail(27, 103, Detail.Doormat);
  // THE KNIGHT'S KEEPING: the watch's steel on the wardhouse wall —
  // axes over the bunks, the panoply by the duty board — and the
  // stands by the racks: one dressed, one stripped for the shift out.
  b.setDetail(16, 99, wallArmsDetail(1)).setDetail(23, 99, wallArmsDetail(0));
  b.set(25, 106, Tile.ArmorStandFull).set(15, 105, Tile.ArmorStand);
  b.sign(29, 98, 'THE WARDHOUSE', ['the watch sleeps here', 'in shifts, like everything']);
  // The wardhouse drill ground, and the path to the gate.
  b.fillRect(29, 100, 6, 8, Tile.Dirt);
  b.set(33, 101, Tile.Fence).set(33, 104, Tile.Fence);
  b.setDetail(32, 101, Detail.Straw).setDetail(32, 104, Detail.Straw);
  b.set(29, 100, Tile.WeaponRack).set(30, 107, Tile.Crate);
  // The watch's standard flies mid drill ground — the thing the
  // morning muster forms up on. Woad: the city watch wears the
  // city's blue, never the castle's crimson.
  b.set(31, 103, bannerStandTile(2));
  // THE SCREE RIDGES the wall dies into — the flanks are CLOSED.
  for (let x = 16; x <= 35; x++) {
    b.set(x, 112, Tile.Rock).set(x, 113, Tile.Rock);
    if (x % 4 === 0) b.set(x, 111, Tile.Rock);
    if (x % 5 === 0) b.set(x, 114, Tile.Rock);
  }
  for (let x = 8; x <= 15; x++) {
    if (x % 2 === 0) b.set(x, 112, Tile.Rock);
    else b.set(x, 113, Tile.Rock);
  }
  for (let x = 147; x <= 168; x++) {
    b.set(x, 112, Tile.Rock).set(x, 113, Tile.Rock);
    if (x % 4 === 0) b.set(x, 111, Tile.Rock);
    if (x % 5 === 0) b.set(x, 114, Tile.Rock);
  }
  for (let x = 169; x <= 172; x++) {
    if (x % 2 === 0) b.set(x, 112, Tile.Rock);
    else b.set(x, 113, Tile.Rock);
  }
  b.fillRect(20, 110, 3, 1, Tile.Snow).fillRect(155, 110, 3, 1, Tile.Snow);
  // The curtain runs: garrison masonry sinking into the ridges.
  b.fillRect(84, 113, 9, 2, Tile.StoneFloor); // the gate threshold first
  // The west run — cut once at x32-33 for THE MINERS' POSTERN: the
  // Delvers' Terrace's own door, opening onto the wardhouse drill
  // ground so the watch counts every shift in and out. The wall
  // learned to admit what it exists to protect.
  b.fillRect(26, 112, 6, 1, Tile.WallGarrison); // x26-31
  b.set(32, 112, Tile.GateGarrison).set(33, 112, Tile.GateGarrison);
  b.fillRect(34, 112, 47, 1, Tile.WallGarrison); // x34-80
  // The east run — parted where the Roaring Pool finally overflows:
  // THE WATER GATE. The wall dies into the banks (the mole law) and
  // the Vale River runs out under the city's oldest masonry.
  b.fillRect(96, 112, 3, 1, Tile.WallGarrison); // x96-98, to the west bank
  b.fillRect(107, 112, 44, 1, Tile.WallGarrison); // x107-150, from the east bank
  // The flanking towers: solid drums proud of the line.
  for (const tx of [40, 60, 110, 132] as const) {
    b.fillRect(tx, 113, 3, 2, Tile.WallGarrison);
    b.set(tx, 114, Tile.WallGarrisonDiagNE);
    b.set(tx + 2, 114, Tile.WallGarrisonDiagNW);
  }
  // THE GATE BASTIONS: two five-square drums flanking the passage.
  for (const bx of [81, 91] as const) {
    b.fillRect(bx, 110, 5, 5, Tile.WallGarrison);
    b.set(bx, 110, Tile.WallGarrisonDiagSE);
    b.set(bx + 4, 110, Tile.WallGarrisonDiagSW);
    b.set(bx, 114, Tile.WallGarrisonDiagNE);
    b.set(bx + 4, 114, Tile.WallGarrisonDiagNW);
  }
  // THE SILVER GATE — the grand gatehouse: the High Road marches
  // straight through.
  for (let x = 86; x <= 90; x++) b.set(x, 112, Tile.GateGarrison);
  b.set(83, 109, Tile.BannerPole).set(93, 109, Tile.BannerPole);
  b.setDetail(83, 114, Detail.BannerCrown).setDetail(93, 114, Detail.BannerCrown);

  // ---------------------------------------------------------------
  // THE POSTERN LANE (the Pinereach epic) — the city's back road,
  // and the only way a body walks to the Hoargate. Unchanged by the
  // remaster: the pass answers to its own epic.
  // ---------------------------------------------------------------
  for (let x = 169; x <= 175; x++) {
    b.set(x, 112, Tile.WallGarrison).set(x, 113, Tile.Rock);
    if (x % 3 === 0) b.set(x, 114, Tile.Rock);
  }
  b.path({ x: 171, y: 110 }, { x: 171, y: 1 }, 3);
  b.set(168, 88, Tile.WallGarrison).set(169, 88, Tile.WallGarrison);
  b.set(173, 88, Tile.WallGarrison).set(174, 88, Tile.WallGarrison);
  b.set(175, 88, Tile.WallGarrison);
  for (let x = 170; x <= 172; x++) b.set(x, 88, Tile.GateGarrison);
  b.set(168, 87, Tile.Brazier).set(174, 87, Tile.Brazier);
  b.sign(174, 90, 'THE POSTERN', ['the Hoargate road', 'give your name at the wall'], Tile.Signpost);
  for (let y = 16; y <= 104; y += 12) b.set(174, y, Tile.LampPost);
  b.fillRect(168, 4, 8, 10, Tile.StoneFloor);
  b.fillRect(169, 5, 5, 6, Tile.WoodFloor);
  b.outlineRect(169, 5, 5, 6, Tile.WallWood);
  b.set(171, 10, Tile.DoorwayWood);
  b.set(169, 7, Tile.WallWoodWindow).set(173, 7, Tile.WallWoodWindow);
  b.set(170, 6, Tile.Bed).set(170, 7, Tile.Bed);
  b.set(170, 8, Tile.Bed).set(170, 9, Tile.Bed);
  b.set(172, 6, Tile.WeaponRack);
  b.set(172, 8, Tile.Table).set(172, 9, Tile.Chair);
  b.setDetail(171, 9, Detail.Doormat);
  b.set(175, 6, Tile.Brazier).set(175, 12, Tile.Crate);
  b.set(168, 12, Tile.Bench);
  b.sign(168, 6, 'THE MUSTER', ['reliefs form here', 'count out, count back'], Tile.Signpost);
  b.fillRect(170, 0, 3, 2, Tile.Path); // the mouth meets the carved road
  b.set(169, 2, Tile.Brazier).set(173, 2, Tile.Brazier);
  b.sign(174, 3, 'THE HOARGATE ROAD', ['the pass stands open', 'it is not a kindness'], Tile.Signpost);
  b.actor('silverfall_watch', 171.5, 90.5, -Math.PI / 2, 'fall_watch_postern');
  b.actor('silverfall_watch', 171.5, 12.5, -Math.PI / 2, 'fall_watch_muster');

  // THE CARAVANSERAI: the road's last yard, laid out like it works.
  b.fillRect(50, 98, 23, 12, Tile.Dirt);
  for (let x = 52; x <= 56; x++) b.set(x, 100, Tile.RailWood);
  for (let x = 58; x <= 62; x++) b.set(x, 100, Tile.RailWood);
  for (let x = 64; x <= 68; x++) b.set(x, 100, Tile.RailWood);
  b.setDetail(53, 101, Detail.Straw).setDetail(55, 101, Detail.Straw);
  b.setDetail(59, 101, Detail.Straw).setDetail(61, 101, Detail.Straw);
  b.setDetail(65, 101, Detail.Straw).setDetail(67, 101, Detail.Straw);
  b.set(54, 102, Tile.WaterTrough).set(60, 102, Tile.WaterTrough).set(66, 102, Tile.WaterTrough); // troughs, not basins (upgrade law)
  b.set(68, 99, Tile.HitchingPost);
  b.set(70, 99, Tile.Crate).set(71, 100, Tile.Crate).set(70, 103, Tile.CrateGoods);
  b.set(71, 105, Tile.Barrel);
  b.set(56, 106, Tile.Campfire);
  b.set(54, 106, Tile.Bench).set(58, 106, Tile.Bench).set(56, 108, Tile.Bench);
  b.set(69, 107, Tile.Workbench).set(70, 108, Tile.ToolRack); // the farrier
  b.sign(51, 105, 'THE CARAVANSERAI', ['beasts watered,', 'wheels mended']);
  b.set(52, 103, Tile.BeastPen);
  b.fillRect(73, 103, 11, 2, Tile.Path); // the yard apron to the avenue
  // THE GATEHOUSE: the watch's desk at the door of the city.
  b.fillRect(36, 100, 11, 10, Tile.StoneFloor);
  b.outlineRect(36, 100, 11, 10, Tile.WallStone);
  b.set(46, 104, Tile.DoorwayStone).set(46, 105, Tile.DoorwayStone);
  b.set(40, 100, Tile.WallStoneWindow).set(36, 104, Tile.WallStoneWindow);
  b.set(40, 109, Tile.WallStoneWindow);
  b.set(41, 104, Tile.Table).set(42, 104, Tile.Table); // the duty desk
  b.set(41, 103, Tile.Chair).set(42, 103, Tile.Chair);
  b.set(37, 101, Tile.WeaponRack).set(37, 103, Tile.WeaponRack);
  b.set(44, 101, Tile.Cabinet);
  b.set(44, 107, Tile.Bed).set(44, 108, Tile.Bed); // the night-watch bunk
  b.set(42, 107, Tile.Bed).set(42, 108, Tile.Bed);
  b.set(37, 105, Tile.Bed).set(37, 106, Tile.Bed);
  b.set(40, 107, Tile.Table).set(39, 107, Tile.Chair); // the mess corner
  b.set(37, 107, Tile.Brazier);
  b.setDetail(45, 104, Detail.Doormat).setDetail(45, 105, Detail.Doormat);
  b.setDetail(38, 100, Detail.BannerCrown);
  b.setDetail(41, 105, Detail.Rug).setDetail(42, 105, Detail.Rug);
  b.setDetail(41, 106, Detail.Rug).setDetail(42, 106, Detail.Rug);
  // THE GATE MARKET: two facing stall rows on the pool walk.
  b.fillRect(118, 102, 20, 9, Tile.StoneFloor);
  b.stamp(MARKET_STALL, 119, 103);
  b.stamp(MARKET_STALL, 126, 103);
  b.stamp(MARKET_STALL, 133, 103);
  b.stamp(MARKET_STALL, 122, 107);
  b.stamp(MARKET_STALL, 129, 107);
  b.set(118, 106, Tile.LampPost).set(137, 106, Tile.LampPost);
  b.set(118, 102, bannerPoleTile(6)).set(137, 102, bannerPoleTile(6)); // ochre — the market's color
  b.set(121, 109, Tile.BasketStack).set(135, 109, Tile.FishmongerSlab); // 'fish, ore, arrivals' — the fish, delivered
  b.set(117, 104, Tile.Bench); // the pool overlook
  b.sign(136, 101, 'THE GATE MARKET', ['fish, ore, arrivals']);
  // The quay: planks to the Roaring Pool's deep water.
  b.set(96, 108, Tile.Dock).set(97, 108, Tile.Dock);
  b.set(96, 109, Tile.Dock).set(97, 109, Tile.Dock);
  b.set(99, 107, Tile.FishingSpot).set(111, 104, Tile.FishingSpot);
  b.set(94, 110, Tile.Crate).set(116, 108, Tile.LampPost);
  b.set(78, 104, Tile.LampPost).set(98, 111, Tile.Bench);
  b.set(118, 96, Tile.TreeWillow);
  // ---------------------------------------------------------------
  // THE FALLS VALE — the lower town (THE CAPITAL COMES DOWN THE
  // MOUNTAIN, docs/silverfall-vale-plan.md). Everything south of the
  // Silver Gate wall is the city's missing half: the ground where
  // the miners sleep, the bread is baked, the pilgrims rest, the
  // dead are buried, and the mountain's water finishes its journey
  // in the Kingswater. Phase 2 lays the SKELETON — terrain, water,
  // walls, streets, bridges, crag frames; the districts themselves
  // rise in Phase 3.
  //
  // THE ONE GRAND AXIS, completed: the fortification ladder gains
  // its lowest rung. VALE GATE (y236) -> Silver Gate (y112) ->
  // Court Gate (y62) -> Castle Gate (y32). Four gates, one avenue,
  // every gate outranking the last — and the climb now starts in a
  // town instead of a wilderness.
  // ---------------------------------------------------------------
  // THE HIGH STREET — the avenue continued, Silver Gate to Vale
  // Gate. Stone the whole way: coin walked this street before most
  // of the High City existed.
  b.fillRect(84, 115, 9, 121, Tile.StoneFloor); // y115-235
  // THE VALE RIVER — the Roaring Pool's overflow, out the water gate
  // and south through the town. North leg first (x100-105 water,
  // x99/x106 the banks the wall dies into). The leg starts at y108,
  // one row shy of the pool's rim — the quay's fishing water at
  // (99,107) keeps its cast.
  b.fillRect(99, 108, 1, 88, Tile.WaterShallow); // west bank, y108-195
  b.fillRect(106, 108, 1, 88, Tile.WaterShallow); // east bank
  b.fillRect(100, 108, 6, 88, Tile.Water); // the river proper
  // The west leg: the river turns for the lake at y195, running
  // west under three spans to the Kingswater's reed mouth.
  b.fillRect(12, 194, 94, 1, Tile.WaterShallow); // north rim, x12-105
  b.fillRect(12, 200, 94, 1, Tile.WaterShallow); // south rim
  b.fillRect(10, 195, 96, 5, Tile.Water); // x10-105, y195-199
  // THE KINGSHORE — the authored lake: the Kingswater's east lobe
  // inside the walls, stepping wider to the south hem where the
  // west hem's water rows hand the mere back to the field.
  b.fillRect(0, 178, 5, 12, Tile.Water); // y178-189
  b.fillRect(5, 182, 2, 8, Tile.WaterShallow);
  b.fillRect(0, 190, 10, 12, Tile.Water); // y190-201
  b.fillRect(10, 192, 2, 10, Tile.WaterShallow);
  b.fillRect(0, 202, 15, 12, Tile.Water); // y202-213
  b.fillRect(15, 204, 2, 10, Tile.WaterShallow);
  b.fillRect(0, 214, 20, 12, Tile.Water); // y214-225
  b.fillRect(20, 216, 2, 10, Tile.WaterShallow);
  b.fillRect(0, 226, 25, 12, Tile.Water); // y226-237
  b.fillRect(25, 228, 2, 10, Tile.WaterShallow);
  b.fillRect(0, 238, 30, 18, Tile.Water); // y238-255, the open mere
  b.fillRect(30, 240, 2, 16, Tile.WaterShallow);
  b.fillRect(0, 208, 6, 34, Tile.WaterDeep); // the cold heart offshore
  // The reed mouth where river meets mere — the city's one soft
  // edge, on purpose.
  b.set(13, 192, Tile.Swamp).set(16, 202, Tile.Swamp).set(11, 203, Tile.Swamp);
  b.set(19, 193, Tile.GrassTall).set(14, 205, Tile.GrassTall).set(22, 214, Tile.GrassTall);
  // THE THREE SPANS — a capital crosses its river; it never fords.
  // The Vale Bridge carries the avenue itself: the grandest span in
  // the province, parapet braziers at both banks.
  b.fillRect(84, 194, 9, 7, Tile.Bridge); // the Vale Bridge, y194-200
  b.set(83, 193, Tile.Brazier).set(93, 193, Tile.Brazier);
  b.set(83, 201, Tile.Brazier).set(93, 201, Tile.Brazier);
  b.fillRect(98, 156, 10, 3, Tile.Bridge); // the Mill Bridge, x98-107
  b.fillRect(98, 180, 10, 2, Tile.Bridge); // the Low Bridge, x98-107
  b.fillRect(42, 194, 4, 7, Tile.Bridge); // the Shore Bridge (the Delvers' lane)
  // THE STREETS FIRST (the town-plan law). The lanes are dirt-worn
  // Path — the Vale is poorer than the High City on purpose; only
  // the avenue and the market walk on stone.
  b.fillRect(93, 156, 5, 2, Tile.StoneFloor); // avenue -> Mill Bridge
  b.fillRect(93, 180, 5, 2, Tile.Path); // avenue -> Low Bridge
  b.fillRect(108, 157, 38, 2, Tile.Path); // the mill lane east, x108-145
  b.fillRect(108, 180, 38, 2, Tile.Path); // the craft lane east
  b.fillRect(146, 157, 3, 79, Tile.Path); // THE PILGRIM'S WAY, y157-235, under the crags
  b.fillRect(93, 232, 53, 2, Tile.Path); // gate plaza -> the way's foot
  // The miners' postern's throat — the old scree rows part for the
  // new door: cleared north to the drill ground, stone through the
  // wall, worn path south to the lane.
  b.fillRect(32, 108, 2, 4, Tile.Path); // y108-111, to the drill ground
  b.set(32, 113, Tile.StoneFloor).set(33, 113, Tile.StoneFloor); // the threshold
  b.fillRect(32, 114, 2, 3, Tile.Path); // the postern step
  b.fillRect(32, 117, 12, 2, Tile.Path); // postern -> the Delvers' lane
  b.fillRect(42, 119, 3, 75, Tile.Path); // THE DELVERS' LANE, y119-193
  b.fillRect(42, 201, 3, 35, Tile.Path); // the lane south of the Shore Bridge
  b.fillRect(20, 215, 22, 2, Tile.Path); // the Kingshore lane, to the quay
  // THE WET MARKET's square — stone flags west of the avenue; the
  // stalls and slabs rise in Phase 3.
  b.fillRect(64, 146, 20, 19, Tile.StoneFloor); // x64-83, y146-164
  // The mill yard and the wagon yard take their worked ground now.
  b.fillRect(108, 148, 22, 12, Tile.Dirt); // the Millward pad
  b.fillRect(110, 210, 26, 22, Tile.Dirt); // the Wagon Yard
  // ---------------------------------------------------------------
  // THE OUTER CURTAIN — the third-generation wall: plainer, faster
  // work than the Silver Gate, the masonry of a city that outgrew
  // its plan. West it DIES IN THE LAKE (the mole law); east it sinks
  // into the crag band's scree.
  // ---------------------------------------------------------------
  b.fillRect(84, 232, 9, 4, Tile.StoneFloor); // the gate threshold
  b.fillRect(27, 236, 54, 2, Tile.WallGarrison); // west run, x27-80, to the bank
  b.fillRect(96, 236, 55, 2, Tile.WallGarrison); // east run, x96-150
  // The gate bastions — the five-square drums a third time, smaller:
  // the youngest masons quoting their grandmothers.
  for (const bx of [81, 91] as const) {
    b.fillRect(bx, 234, 5, 5, Tile.WallGarrison);
    b.set(bx, 234, Tile.WallGarrisonDiagSE);
    b.set(bx + 4, 234, Tile.WallGarrisonDiagSW);
    b.set(bx, 238, Tile.WallGarrisonDiagNE);
    b.set(bx + 4, 238, Tile.WallGarrisonDiagNW);
  }
  // THE VALE GATE — the capital's new front door, standing open (the
  // war-measure law: shutting gates is the players' business).
  for (let x = 86; x <= 90; x++) b.set(x, 236, Tile.GateGarrison);
  b.fillRect(86, 237, 5, 2, Tile.StoneFloor); // the gate passage
  b.set(84, 233, Tile.Brazier).set(92, 233, Tile.Brazier);
  b.sign(82, 240, 'THE VALE GATE', ['the youngest wall,', 'the busiest door'], Tile.Signpost);
  // Flanking towers on the runs, proud of the line southward.
  for (const tx of [46, 64, 108, 130] as const) {
    b.fillRect(tx, 238, 3, 2, Tile.WallGarrison);
    b.set(tx, 239, Tile.WallGarrisonDiagNE);
    b.set(tx + 2, 239, Tile.WallGarrisonDiagNW);
  }
  // The east scree seal: the outer wall's flank is CLOSED, rock to
  // the hem — the Vale admits nobody the gates don't see.
  b.fillRect(151, 236, 25, 2, Tile.Rock); // x151-175, solid both rows
  for (let x = 151; x <= 175; x += 3) b.set(x, 235, Tile.Rock);
  for (let x = 152; x <= 175; x += 4) b.set(x, 238, Tile.Rock);
  // The west bank stones where the wall meets the water.
  b.set(26, 236, Tile.Rock).set(26, 237, Tile.Rock).set(27, 238, Tile.Rock);
  // ---------------------------------------------------------------
  // THE CRAG FRAMES — the mountain cups the Vale: the west band
  // under the Silent Terrace, the east band walling the town from
  // the wild. Deterministic scatter (fallRng) — identical every boot.
  // ---------------------------------------------------------------
  for (let y = 114; y <= 176; y += 2) {
    for (let x = 0; x <= 8; x += 2) {
      const j = fallRng(x * 3 + 7, y * 5 + 1);
      if (j < 0.45) b.set(x, y, Tile.Rock);
      else if (j < 0.6) b.set(x + 1, y + 1, Tile.TreePine);
      else if (j < 0.7) b.set(x, y + 1, Tile.Stump);
    }
  }
  b.fillRect(2, 124, 3, 1, Tile.Snow).fillRect(1, 150, 2, 1, Tile.Snow);
  for (let y = 115; y <= 234; y += 2) {
    for (let x = 152; x <= 174; x += 3) {
      const j = fallRng(x * 11 + 3, y * 7 + 5);
      if (j < 0.5) b.set(x, y, Tile.Rock);
      else if (j < 0.68) b.set(x + 1, y + 1, Tile.TreePine);
      else if (j < 0.76) b.set(x, y + 1, Tile.Stump);
    }
  }
  b.fillRect(160, 126, 3, 1, Tile.Snow).fillRect(168, 158, 2, 1, Tile.Snow);
  b.fillRect(155, 190, 3, 1, Tile.Snow).fillRect(165, 222, 2, 1, Tile.Snow);
  // ---------------------------------------------------------------
  // THE HIGH STREET'S LIGHT — braziers at the gates (the stair
  // burns), lamps pacing the long stretches between.
  // ---------------------------------------------------------------
  b.set(83, 126, Tile.LampPost).set(93, 126, Tile.LampPost);
  b.set(83, 140, Tile.LampPost).set(93, 140, Tile.LampPost);
  b.set(83, 154, Tile.LampPost).set(93, 154, Tile.LampPost);
  b.set(83, 168, Tile.LampPost).set(93, 168, Tile.LampPost);
  b.set(83, 182, Tile.LampPost).set(93, 182, Tile.LampPost);
  b.set(83, 206, Tile.LampPost).set(93, 206, Tile.LampPost);
  b.set(83, 218, Tile.LampPost).set(93, 218, Tile.LampPost);
  b.set(83, 229, Tile.LampPost).set(93, 229, Tile.LampPost);
  // ---------------------------------------------------------------
  // THE APPROACH — outside the Vale Gate the city still owns the
  // road: the High Road's last league between crag and water.
  // ---------------------------------------------------------------
  b.fillRect(86, 239, 5, 17, Tile.Path); // y239-255, to the carved road
  b.set(84, 242, Tile.Brazier).set(92, 242, Tile.Brazier);
  b.set(84, 249, Tile.Brazier).set(92, 249, Tile.Brazier);
  b.sign(93, 244, 'SILVERFALL', ['Seat of the Silver Line.', 'Mind the edge.'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE VALE'S WEST BANK — the Last Climb, the wet market, the
  // bakehouse, Garland Row, the Delvers' Terrace, the Silent
  // Terrace, the Kingshore, the Fairstead. Bespoke, tile by tile
  // (the bespoke law): the Vale builds in timber and keeps its
  // stone for the institutions.
  // ---------------------------------------------------------------
  // THE LAST CLIMB — the carters' tavern, first door inside the
  // Silver Gate: the last drink before the climb, the first after.
  b.fillRect(64, 128, 16, 14, Tile.WoodFloor);
  b.outlineRect(64, 128, 16, 14, Tile.WallWood);
  b.set(79, 134, Tile.DoorwayWood).set(79, 135, Tile.DoorwayWood);
  b.set(79, 131, Tile.WallWoodWindow).set(79, 138, Tile.WallWoodWindow);
  b.set(68, 141, Tile.WallWoodWindow).set(74, 141, Tile.WallWoodWindow);
  b.set(64, 134, Tile.WallWoodWindow);
  b.set(66, 131, Tile.Counter).set(67, 131, Tile.Counter).set(68, 131, Tile.Counter); // the bar
  b.set(65, 130, Tile.TapCask).set(65, 132, Tile.Barrel); // the cellar corner
  b.set(65, 136, Tile.Barrel);
  b.set(74, 131, Tile.Barrel).set(73, 131, Tile.WoodStool).set(74, 132, Tile.WoodStool); // the dice crowd's corner
  b.set(77, 139, Tile.Hearth);
  b.set(68, 136, Tile.Table).set(69, 136, Tile.Table);
  b.set(67, 136, Tile.Chair).set(70, 136, Tile.Chair).set(68, 137, Tile.Chair);
  b.set(73, 136, Tile.Table).set(73, 137, Tile.Chair).set(74, 136, Tile.Chair);
  b.set(70, 140, Tile.Bench).set(71, 140, Tile.Bench);
  b.setDetail(71, 134, Detail.Rug).setDetail(72, 134, Detail.Rug);
  b.setDetail(71, 135, Detail.Rug).setDetail(72, 135, Detail.Rug);
  b.setDetail(78, 134, Detail.Doormat).setDetail(78, 135, Detail.Doormat);
  b.fillRect(80, 134, 4, 2, Tile.Path); // the doorstep to the avenue
  b.sign(80, 131, 'THE LAST CLIMB', ['the stair is longer', 'than you remember']);
  // THE WET MARKET — the lower town's own square: what the river,
  // the mere, and the road bring in, sold under ochre cloth.
  b.stamp(MARKET_STALL, 66, 150);
  b.stamp(MARKET_STALL, 74, 150);
  b.set(70, 155, Tile.FishmongerSlab); // pool trout and blind cave-fish
  b.set(76, 155, Tile.ProduceStand).set(79, 151, Tile.ProduceStand);
  b.set(67, 158, Tile.ButcherBlock);
  b.set(72, 158, Tile.TiedParcels); // sold and tied, waiting on their buyers
  b.set(65, 162, Tile.WaterCask).set(78, 159, Tile.BasketStack);
  b.set(64, 147, bannerPoleTile(6)).set(83, 147, bannerPoleTile(6)); // ochre, the market's color
  b.set(81, 162, Tile.Bench).set(64, 157, Tile.Bench);
  b.sign(65, 145, 'THE WET MARKET', ['weighed under the sky,', 'argued under the cloth'], Tile.Signpost);
  // THE BAKEHOUSE — the night shift's kingdom: the ovens never
  // cool, and the baker sleeps at dawn beside them.
  b.fillRect(64, 166, 13, 11, Tile.WoodFloor);
  b.outlineRect(64, 166, 13, 11, Tile.WallWood);
  b.set(70, 166, Tile.DoorwayWood);
  b.set(67, 166, Tile.WallWoodWindow).set(74, 166, Tile.WallWoodWindow);
  b.set(64, 171, Tile.WallWoodWindow).set(76, 171, Tile.WallWoodWindow);
  b.set(65, 168, Tile.BreadOven).set(65, 171, Tile.BreadOven);
  b.set(68, 169, Tile.Counter).set(68, 170, Tile.Counter); // the pass
  b.set(71, 168, Tile.Basin);
  b.set(66, 174, Tile.GrainSacks).set(67, 175, Tile.GrainSacks); // the flour store
  b.set(72, 172, Tile.Table).set(73, 172, Tile.Chair);
  b.set(75, 168, Tile.Bed).set(75, 169, Tile.Bed); // the baker sleeps at dawn
  b.set(74, 167, Tile.CandleStand);
  b.setDetail(70, 167, Detail.Doormat);
  b.set(70, 165, Tile.StoneFloor); // the doorstep onto the square
  // The sign hangs on the WEST flank (the wall-shadow law: north of
  // the shell is the one place a sign cannot live).
  b.sign(63, 170, 'THE BAKEHOUSE', ['the ovens never cool.', 'bread at first bell']);
  // GARLAND ROW — the cottage lanes: hedge fronts, wood smoke,
  // doors that belong to somebody. The lane is dirt on purpose.
  b.fillRect(46, 178, 36, 2, Tile.Path); // the garland lane, x46-81
  // The lane's hedge fronts — one clipped run per household, gaps
  // where the feet actually walk (the garden wicket law).
  for (let x = 46; x <= 51; x++) b.set(x, 177, Tile.Hedge);
  for (let x = 55; x <= 60; x++) b.set(x, 177, Tile.Hedge);
  b.set(57, 177, Tile.HedgeGate); // the baker's back-yard wicket
  for (let x = 64; x <= 69; x++) b.set(x, 177, Tile.Hedge);
  for (let x = 73; x <= 78; x++) b.set(x, 177, Tile.Hedge);
  // The baker's back yard, through the wicket.
  b.set(59, 175, Tile.WaterCask).set(61, 175, Tile.Woodpile);
  b.set(62, 176, Tile.HerbPlanter); // off the lane — the lane stays two clear
  // Cottage the first (north row): the wainwright's house.
  b.fillRect(48, 168, 11, 9, Tile.WoodFloor);
  b.outlineRect(48, 168, 11, 9, Tile.WallWood);
  b.set(53, 176, Tile.DoorwayWood);
  b.set(50, 176, Tile.WallWoodWindow).set(56, 176, Tile.WallWoodWindow);
  b.set(48, 172, Tile.WallWoodWindow);
  b.set(49, 169, Tile.Bed).set(49, 170, Tile.Bed);
  b.set(57, 169, Tile.Hearth);
  b.set(53, 171, Tile.Table).set(52, 171, Tile.Chair).set(54, 171, Tile.Chair);
  b.set(57, 174, Tile.Cabinet);
  b.setDetail(53, 175, Detail.Doormat);
  b.setDetail(52, 172, Detail.Rug).setDetail(53, 172, Detail.Rug);
  b.set(47, 176, Tile.Woodpile); // the wainwright splits his own
  // The south row: three cottages, doors on the lane.
  b.fillRect(48, 182, 9, 9, Tile.WoodFloor);
  b.outlineRect(48, 182, 9, 9, Tile.WallWood);
  b.set(52, 182, Tile.DoorwayWood);
  b.set(49, 182, Tile.WallWoodWindow).set(55, 182, Tile.WallWoodWindow);
  b.set(48, 186, Tile.WallWoodWindow);
  b.set(49, 184, Tile.Bed).set(49, 185, Tile.Bed);
  b.set(52, 186, Tile.Table).set(53, 186, Tile.Chair);
  b.set(55, 183, Tile.Hearth);
  b.set(55, 187, Tile.Bookshelf);
  b.setDetail(52, 183, Detail.Doormat);
  b.set(47, 183, Tile.Woodpile).set(57, 184, Tile.WaterCask);
  b.fillRect(60, 182, 9, 9, Tile.WoodFloor);
  b.outlineRect(60, 182, 9, 9, Tile.WallWood);
  b.set(64, 182, Tile.DoorwayWood);
  b.set(61, 182, Tile.WallWoodWindow).set(67, 182, Tile.WallWoodWindow);
  b.set(68, 186, Tile.WallWoodWindow);
  b.set(61, 184, Tile.Bed).set(61, 185, Tile.Bed);
  b.set(67, 184, Tile.Bed).set(67, 185, Tile.Bed);
  b.set(64, 186, Tile.Table).set(63, 186, Tile.Chair).set(65, 186, Tile.Chair);
  b.set(61, 188, Tile.Hearth);
  b.setDetail(64, 183, Detail.Doormat);
  b.set(69, 183, Tile.HerbPlanter);
  b.fillRect(72, 182, 9, 9, Tile.WoodFloor);
  b.outlineRect(72, 182, 9, 9, Tile.WallWood);
  b.set(76, 182, Tile.DoorwayWood);
  b.set(73, 182, Tile.WallWoodWindow).set(79, 182, Tile.WallWoodWindow);
  b.set(80, 186, Tile.WallWoodWindow);
  b.set(73, 184, Tile.Bed).set(73, 185, Tile.Bed);
  b.set(76, 186, Tile.Table).set(77, 186, Tile.Chair);
  b.set(79, 188, Tile.Hearth);
  b.set(79, 184, Tile.Cabinet);
  b.setDetail(76, 183, Detail.Doormat);
  b.set(81, 183, Tile.StreetPlanter);
  // ---------------------------------------------------------------
  // THE DELVERS' TERRACE — the miners' quarter: stone cots under
  // the graveyard shelf, the Rest, the bath, and the Masons'
  // Guildhall that finally deserves the name.
  // ---------------------------------------------------------------
  b.fillRect(17, 174, 25, 1, Tile.Path); // the terrace's own walk, x17-41
  // Two miners' cots, hot-bunked like everything in this city.
  b.fillRect(10, 148, 7, 8, Tile.StoneFloor);
  b.outlineRect(10, 148, 7, 8, Tile.WallStone);
  b.set(13, 155, Tile.DoorwayStone);
  b.set(10, 151, Tile.WallStoneWindow);
  b.set(11, 150, Tile.Bed).set(11, 151, Tile.Bed);
  b.set(15, 149, Tile.Brazier).set(15, 153, Tile.Crate);
  b.set(13, 152, Tile.WoodStool);
  b.setDetail(13, 154, Detail.Doormat);
  b.fillRect(20, 148, 7, 8, Tile.StoneFloor);
  b.outlineRect(20, 148, 7, 8, Tile.WallStone);
  b.set(23, 155, Tile.DoorwayStone);
  b.set(26, 151, Tile.WallStoneWindow);
  b.set(21, 150, Tile.Bed).set(21, 151, Tile.Bed);
  b.set(25, 149, Tile.Brazier).set(25, 153, Tile.ToolRack);
  b.set(23, 152, Tile.WoodStool);
  b.setDetail(23, 154, Detail.Doormat);
  // The gravekeeper's cottage at the keeper's stair — Aldous lives
  // beside his charges and says nothing about the candles.
  b.fillRect(30, 146, 9, 9, Tile.WoodFloor);
  b.outlineRect(30, 146, 9, 9, Tile.WallWood);
  b.set(34, 154, Tile.DoorwayWood);
  b.set(31, 154, Tile.WallWoodWindow).set(37, 154, Tile.WallWoodWindow);
  b.set(31, 148, Tile.Bed).set(31, 149, Tile.Bed);
  b.set(34, 150, Tile.Table).set(35, 150, Tile.Chair);
  b.set(37, 147, Tile.Hearth);
  b.set(36, 152, Tile.Bookshelf).set(37, 152, Tile.Bookshelf); // the burial rolls
  b.set(32, 152, Tile.CandleStand);
  b.setDetail(34, 153, Detail.Doormat);
  // THE DELVERS' REST — rougher than the Last Climb, prouder too.
  b.fillRect(10, 160, 15, 13, Tile.WoodFloor);
  b.outlineRect(10, 160, 15, 13, Tile.WallWood);
  b.set(17, 172, Tile.DoorwayWood);
  b.set(13, 172, Tile.WallWoodWindow).set(21, 172, Tile.WallWoodWindow);
  b.set(10, 166, Tile.WallWoodWindow).set(24, 166, Tile.WallWoodWindow);
  b.set(12, 163, Tile.Counter).set(13, 163, Tile.Counter).set(14, 163, Tile.Counter);
  b.set(11, 162, Tile.TapCask).set(11, 164, Tile.TapCask); // both taps working — pay day
  b.set(11, 166, Tile.Barrel);
  b.set(23, 162, Tile.Hearth);
  b.set(22, 161, Tile.Cabinet); // the carved tallies live here
  b.set(20, 164, Tile.Barrel).set(19, 164, Tile.WoodStool).set(20, 165, Tile.WoodStool); // arm-wrestling ground
  b.set(15, 167, Tile.Table).set(16, 167, Tile.Table);
  b.set(14, 167, Tile.Chair).set(17, 167, Tile.Chair).set(15, 168, Tile.Chair);
  b.set(20, 169, Tile.Table).set(21, 169, Tile.Chair).set(19, 169, Tile.Chair);
  b.set(12, 170, Tile.Bench).set(13, 170, Tile.Bench);
  b.setDetail(17, 171, Detail.Doormat);
  b.setDetail(16, 165, Detail.Rug).setDetail(17, 165, Detail.Rug);
  // The shift's kit waits SOUTH of the Rest (the wall-shadow law:
  // the guildhall's north face would swallow anything at y175).
  b.set(14, 173, Tile.Grindstone); // edges sharpened after shift
  b.set(22, 173, Tile.ToolRack); // picks wait outside; the Rest knows its floor
  b.sign(20, 173, "THE DELVERS' REST", ['first pour free', 'on a mithril day']);
  // THE BATH HOUSE — the one luxury the mine pays for.
  b.fillRect(28, 160, 11, 11, Tile.StoneFloor);
  b.outlineRect(28, 160, 11, 11, Tile.WallStone);
  b.set(33, 170, Tile.DoorwayStone);
  b.set(28, 164, Tile.WallStoneWindow).set(38, 164, Tile.WallStoneWindow);
  b.set(33, 161, Tile.WallFountain); // the led spring, let fall
  b.set(30, 163, Tile.Basin).set(32, 163, Tile.Basin).set(34, 163, Tile.Basin).set(36, 163, Tile.Basin);
  b.set(29, 167, Tile.Brazier).set(37, 167, Tile.Brazier); // the steam
  b.set(31, 168, Tile.Bench).set(35, 168, Tile.Bench);
  b.set(29, 161, Tile.Crate).set(37, 161, Tile.Barrel);
  b.setDetail(33, 169, Detail.Doormat);
  b.fillRect(33, 171, 1, 3, Tile.Path); // the doorstep to the walk
  b.sign(35, 171, 'THE BATH HOUSE', ['ore washes off.', 'the shift takes longer']);
  // THE MASONS' GUILDHALL — the guild that carved the city, sealed
  // the deep, and keeps the book whose count never matched.
  b.fillRect(14, 176, 21, 15, Tile.StoneFloor);
  b.outlineRect(14, 176, 21, 15, Tile.WallStone);
  b.set(34, 183, Tile.DoorwayStone);
  b.set(34, 179, Tile.WallStoneWindow).set(34, 187, Tile.WallStoneWindow);
  b.set(20, 176, Tile.WallStoneWindow).set(28, 176, Tile.WallStoneWindow);
  b.set(20, 190, Tile.WallStoneWindow).set(28, 190, Tile.WallStoneWindow);
  b.set(14, 180, Tile.WallStoneWindow).set(14, 186, Tile.WallStoneWindow);
  b.set(19, 180, Tile.Lectern); // THE SEALED BOOK stands open to its one wrong page
  b.set(15, 178, Tile.Bookshelf).set(16, 178, Tile.Bookshelf).set(17, 178, Tile.Bookshelf);
  b.set(22, 182, Tile.Table).set(23, 182, Tile.Table).set(24, 182, Tile.Table).set(25, 182, Tile.Table);
  b.set(21, 182, Tile.Chair).set(26, 182, Tile.Chair);
  b.set(23, 181, Tile.Chair).set(24, 181, Tile.Chair);
  b.set(23, 183, Tile.Chair).set(24, 183, Tile.Chair);
  b.set(20, 186, Tile.PillarStone).set(28, 186, Tile.PillarStone); // the craft, shown
  b.set(15, 182, Tile.CandleShrine).set(15, 184, Tile.CandleShrine); // the memorial wall
  b.set(15, 188, Tile.Cabinet).set(32, 188, Tile.Brazier);
  b.setDetail(26, 176, Detail.Tapestry).setDetail(27, 176, Detail.Tapestry);
  b.setDetail(23, 185, Detail.Rug).setDetail(24, 185, Detail.Rug);
  b.setDetail(33, 183, Detail.Doormat);
  b.fillRect(35, 183, 7, 1, Tile.Path); // the doorstep to the lane
  b.sign(36, 182, "THE MASONS' GUILDHALL", ['the mountain is a member', 'in good standing']);
  // ---------------------------------------------------------------
  // THE SILENT TERRACE — the graveyard shelf. Standing stones,
  // yews, three kept flames, and the Watcher whose name wore off.
  // No loot among the dead. The quiet is the design.
  // ---------------------------------------------------------------
  b.fillRect(15, 144, 3, 3, Tile.Path).fillRect(32, 144, 3, 3, Tile.Path); // the stair feet
  // The lych gates in wrought iron (THE IRON REST — docs/graveyard-
  // kit-plan.md): the rail runs the terrace's whole south lip and
  // BOTH stairs answer to a gate. The city walled its dead the day
  // it could afford a smith; the standing stones inside are older
  // than the rail and the rail knows it.
  for (let fx = 12; fx <= 37; fx++) b.set(fx, 146, Tile.IronFence);
  b.set(16, 146, Tile.IronGate).set(33, 146, Tile.IronGate);
  // The barrow rows: two lines of standing stones, older than the
  // Silver Line — the foremen who came before the kings.
  for (const sx of [13, 18, 23, 28, 33] as const) {
    b.set(sx, 124, Tile.PillarStone);
    b.set(sx, 132, Tile.PillarStone);
  }
  // The kept rows between the old stones: the city's own dead in
  // proper granite, the fresh mounds saying the terrace still earns
  // its name. The Watcher's row stays clear about the Watcher.
  b.set(14, 128, Tile.Gravestone).set(17, 128, Tile.GraveMound).set(20, 128, Tile.Gravestone);
  b.set(27, 128, Tile.Gravestone).set(30, 128, Tile.Gravestone).set(33, 128, Tile.GravestoneTall);
  b.set(13, 136, Tile.Gravestone).set(16, 136, Tile.Gravestone).set(19, 136, Tile.GravestoneTall);
  b.set(25, 136, Tile.Gravestone).set(28, 136, Tile.GraveMound).set(31, 136, Tile.Gravestone);
  b.set(34, 136, Tile.Gravestone);
  b.set(14, 125, Tile.GraveMound).set(24, 133, Tile.GraveMound).set(34, 125, Tile.GraveMound);
  b.fillRect(12, 122, 2, 1, Tile.Snow).fillRect(26, 127, 2, 1, Tile.Snow);
  b.fillRect(35, 138, 2, 1, Tile.Snow);
  b.set(11, 128, Tile.TreeYew).set(37, 128, Tile.TreeYew);
  b.set(11, 136, Tile.TreeYew).set(37, 136, Tile.TreeYew);
  b.set(18, 133, Tile.CandleShrine).set(28, 125, Tile.CandleShrine).set(23, 139, Tile.CandleShrine);
  b.set(23, 128, Tile.GuardianStatue); // the Watcher whose name wore off
  b.set(26, 140, Tile.Bench); // one seat, for whoever needs it longest
  b.set(24, 140, Tile.MournerStatue); // and the one who never leaves it
  b.setDetail(16, 130, Detail.Pebbles).setDetail(30, 136, Detail.Pebbles);
  b.sign(19, 147, 'THE SILENT TERRACE', ['older than the walls.', 'leave the candles be'], Tile.Signpost);
  // ---------------------------------------------------------------
  // THE KINGSHORE — the lake quarter: the city finally owns a wet
  // net. Quay planks, two fisher households, the boat shed against
  // the young wall.
  // ---------------------------------------------------------------
  b.fillRect(14, 215, 6, 3, Tile.Dock); // the quay, planks over the shallows
  b.set(20, 213, Tile.MooringPost).set(20, 219, Tile.MooringPost);
  b.set(23, 210, Tile.BeachedSkiff).set(26, 228, Tile.BeachedSkiff);
  b.set(10, 220, Tile.FishingSpot).set(5, 232, Tile.FishingSpot);
  b.set(17, 213, Tile.Crate).set(18, 212, Tile.CrateGoods); // the quay head's cargo
  b.set(22, 204, Tile.Woodpile);
  // Fisher house the first — north of the shore lane.
  b.fillRect(26, 202, 9, 9, Tile.WoodFloor);
  b.outlineRect(26, 202, 9, 9, Tile.WallWood);
  b.set(30, 210, Tile.DoorwayWood);
  b.set(27, 210, Tile.WallWoodWindow).set(33, 210, Tile.WallWoodWindow);
  b.set(26, 206, Tile.WallWoodWindow);
  b.set(27, 204, Tile.Bed).set(27, 205, Tile.Bed);
  b.set(33, 203, Tile.Hearth);
  b.set(30, 206, Tile.Table).set(31, 206, Tile.Chair);
  b.set(33, 207, Tile.BasketStack);
  b.setDetail(30, 209, Detail.Doormat);
  // Fisher house the second — south of the lane, nearer the reeds.
  b.fillRect(26, 218, 9, 9, Tile.WoodFloor);
  b.outlineRect(26, 218, 9, 9, Tile.WallWood);
  b.set(30, 218, Tile.DoorwayWood);
  b.set(27, 218, Tile.WallWoodWindow).set(33, 218, Tile.WallWoodWindow);
  b.set(34, 222, Tile.WallWoodWindow);
  b.set(27, 220, Tile.Bed).set(27, 221, Tile.Bed);
  b.set(33, 225, Tile.Hearth);
  b.set(30, 222, Tile.Table).set(31, 222, Tile.Chair);
  b.set(33, 219, Tile.Crate);
  b.setDetail(30, 219, Detail.Doormat);
  // The boat shed, lined against the young wall (the bailey law).
  b.fillRect(34, 230, 7, 6, Tile.WoodFloor);
  b.outlineRect(34, 230, 7, 6, Tile.WallWood);
  b.set(37, 230, Tile.DoorwayWood);
  b.set(35, 232, Tile.Sawhorse).set(39, 231, Tile.Workbench);
  b.set(35, 234, Tile.Barrel).set(39, 234, Tile.ToolRack);
  b.setDetail(37, 231, Detail.Doormat);
  b.sign(24, 212, 'THE KINGSHORE', ['the mere gives.', 'the mere is thanked'], Tile.Signpost);
  // ---------------------------------------------------------------
  // THE FAIRSTEAD — the festival green, and THE GRAND RING risen on
  // it as a true colosseum (docs/arena-plan.md Phase 5, grown by §10
  // THE SAND GROWS). The sand nearly tripled; raised stone crescents
  // flank it east and west, the grandstand wings stand over the
  // Kingswater bank with the beasts' pen lane between them, and the
  // fighters' gate opens south onto a statue-flanked processional to
  // the counter. Garrison masonry on purpose — the separate-masonry
  // law means the pit never reads as a room, and the gates ride the
  // town-wall door machinery the match engine already speaks.
  // ---------------------------------------------------------------
  // The stands first. Every flight faces south per the stair law;
  // benches keep the pit-side column and the aisle stays clear the
  // whole run so every seat walks from the stairs.
  b.raise(46, 208, 4, 17, 1); // the west crescent
  b.raise(79, 208, 4, 17, 1); // the east crescent
  b.raise(50, 201, 10, 4, 1); // the grandstand, west wing
  b.raise(69, 201, 10, 4, 1); // the grandstand, east wing
  b.stairs(47, 224).stairs(48, 224);
  b.stairs(80, 224).stairs(81, 224);
  b.stairs(52, 204).stairs(53, 204);
  b.stairs(74, 204).stairs(75, 204);
  for (let y = 209; y <= 223; y += 2) b.set(48, y, Tile.Bench).set(80, y, Tile.Bench);
  for (let x = 52; x <= 58; x += 2) b.set(x, 203, Tile.Bench);
  for (let x = 70; x <= 76; x += 2) b.set(x, 203, Tile.Bench);
  // The pit: sand in a full garrison ring, two three-wide gates on
  // the short axis — the beasts' gate north out of the pen lane
  // between the wings, the fighters' gate south onto the
  // processional. Both authored OPEN (the claim shuts them; no
  // routine crosses a gate line).
  b.fillEllipse(64, 216, 14.5, 11.5, Tile.WallGarrison);
  b.fillEllipse(64, 216, 12.5, 9.5, Tile.Sand);
  b.set(63, 205, Tile.GateGarrison).set(64, 205, Tile.GateGarrison).set(65, 205, Tile.GateGarrison);
  b.set(63, 227, Tile.GateGarrison).set(64, 227, Tile.GateGarrison).set(65, 227, Tile.GateGarrison);
  // THE GATE MUST OPEN ONTO GROUND, NOT WALL: this ring's annulus is
  // TWO tiles thick at the crowns (wall ry 11.5 over sand ry 9.5 —
  // flat curvature), and the gates pierce only the outer row. Unpunched,
  // the pit is sealed: no body can ever walk in, every claim ends
  // "nobody took the sand", and the door verb gaslights the fighter
  // stuck in the recess ("someone is standing in the gateway" — it's
  // them). Carve the inner row into a sanded gatehouse passage.
  b.set(63, 206, Tile.Sand).set(64, 206, Tile.Sand).set(65, 206, Tile.Sand);
  b.set(63, 226, Tile.Sand).set(64, 226, Tile.Sand).set(65, 226, Tile.Sand);
  // The wall wears the Crown's colors on its south face, and banner
  // poles hold the four shoulders the way the fair-day poles did.
  b.setDetail(61, 227, greatBannerDetail(1)).setDetail(67, 227, greatBannerDetail(1));
  b.set(50, 206, bannerPoleTile(1)).set(78, 206, bannerPoleTile(1));
  b.set(50, 226, bannerPoleTile(1)).set(78, 226, bannerPoleTile(1));
  // The processional: the fighters' walk from the south gate to the
  // counter, statue-flanked and fire-lit, with paved arrival rows
  // tying it to the High Street east and the Pilgrim's Way west.
  b.fillRect(63, 228, 3, 6, Tile.Path);
  b.fillRect(66, 232, 18, 1, Tile.Path);
  b.fillRect(45, 233, 18, 1, Tile.Path);
  b.set(61, 228, Tile.Brazier).set(67, 228, Tile.Brazier);
  b.set(60, 230, Tile.GuardianStatue).set(68, 230, Tile.GuardianStatue); // parity pair, rehomed to the walk
  b.set(59, 205, Tile.Brazier).set(69, 205, Tile.Brazier); // the pen lane's mouth-fires
  b.set(66, 230, Tile.WeaponRack).set(66, 231, Tile.WaterCask); // the fighters' last checks
  b.set(59, 232, Tile.Table).set(58, 232, Tile.WoodStool); // Cato's counter
  b.set(77, 231, Tile.TreeOak); // the meeting oak keeps the south walk now
  b.sign(67, 233, 'THE GRAND RING', ['pay, stand, survive.', 'the purse is real'], Tile.Signpost);
  b.sign(46, 227, 'THE FAIRSTEAD', ['the fair came to stay.', 'match days fill the stands'], Tile.Signpost);
  // THE VALE WARD — the lower watch's desk inside the new gate.
  b.fillRect(96, 224, 9, 8, Tile.StoneFloor);
  b.outlineRect(96, 224, 9, 8, Tile.WallStone);
  b.set(96, 227, Tile.DoorwayStone);
  b.set(100, 224, Tile.WallStoneWindow).set(104, 227, Tile.WallStoneWindow);
  b.set(100, 231, Tile.WallStoneWindow);
  b.set(98, 227, Tile.Table).set(98, 226, Tile.Chair); // the duty desk
  b.set(102, 225, Tile.Bed).set(102, 226, Tile.Bed);
  b.set(102, 229, Tile.Bed).set(102, 230, Tile.Bed); // hot bunks, like everything
  b.set(97, 230, Tile.SpearRack).set(97, 225, Tile.Cabinet);
  b.set(103, 228, Tile.Brazier);
  b.setDetail(99, 224, Detail.BannerCrown);
  b.setDetail(97, 227, Detail.Doormat);
  b.fillRect(93, 227, 3, 1, Tile.Path); // the doorstep to the avenue
  b.sign(94, 225, 'THE VALE WARD', ['the young wall,', 'the young watch']);
  // The river's willows — the banks read planted by time, not code.
  b.set(98, 122, Tile.TreeWillow).set(107, 136, Tile.TreeWillow);
  b.set(98, 168, Tile.TreeWillow).set(107, 146, Tile.TreeWillow);
  b.set(96, 190, Tile.TreeWillow);

  // ---------------------------------------------------------------
  // THE VALE'S EAST BANK — the Millward, the craft commons, the
  // Pilgrim's Rest, and the wagon yard: the working half of the
  // lower town, fed by the river and watched by the crags.
  // ---------------------------------------------------------------
  // THE KING'S MILL — the wheel hangs in the river; Amberford grain
  // becomes Silverfall bread. The one trade the LIMITS law allows
  // the mountains: grinding what the road brings.
  b.fillRect(108, 144, 14, 13, Tile.StoneFloor);
  b.outlineRect(108, 144, 14, 13, Tile.WallStone);
  b.set(114, 156, Tile.DoorwayStone);
  b.set(111, 156, Tile.WallStoneWindow).set(118, 156, Tile.WallStoneWindow);
  b.set(108, 150, Tile.WallStoneWindow); // the window over the water
  b.set(121, 150, Tile.WallStoneWindow);
  b.set(110, 146, Tile.Grindstone).set(113, 146, Tile.Grindstone); // the stones
  b.set(117, 146, Tile.Workbench);
  b.set(119, 148, Tile.GrainSacks).set(119, 151, Tile.GrainSacks);
  b.set(112, 152, Tile.Counter).set(113, 152, Tile.Counter); // the flour shop
  b.set(116, 152, Tile.TiedParcels);
  b.set(109, 153, Tile.Crate).set(120, 154, Tile.Barrel);
  b.setDetail(114, 155, Detail.Doormat);
  b.setDetail(111, 148, Detail.Straw).setDetail(116, 149, Detail.Straw);
  b.sign(116, 159, "THE KING'S MILL", ['Amberford grain,', 'Silverfall bread']);
  // The granary pair and the weigh yard.
  b.fillRect(125, 145, 7, 7, Tile.StoneFloor);
  b.outlineRect(125, 145, 7, 7, Tile.WallStone);
  b.set(128, 151, Tile.DoorwayStone);
  b.set(126, 147, Tile.GrainSacks).set(126, 149, Tile.GrainSacks);
  b.set(130, 147, Tile.Barrel).set(130, 149, Tile.Crate);
  b.fillRect(135, 145, 7, 7, Tile.StoneFloor);
  b.outlineRect(135, 145, 7, 7, Tile.WallStone);
  b.set(138, 151, Tile.DoorwayStone);
  b.set(136, 147, Tile.GrainSacks).set(136, 149, Tile.GrainSacks);
  b.set(140, 147, Tile.Crate).set(140, 149, Tile.Barrel);
  b.set(132, 154, Tile.TiedParcels); // the granary's outbound orders
  b.set(127, 154, Tile.HandCart).set(136, 154, Tile.GrainSacks);
  b.sign(124, 159, 'THE MILLWARD', ['the granaries hold', "the road's grain"], Tile.Signpost);
  // THE CRAFT COMMONS — the trades too common for the High City,
  // which is exactly why the Vale cannot live without them.
  b.fillRect(110, 166, 11, 13, Tile.WoodFloor);
  b.outlineRect(110, 166, 11, 13, Tile.WallWood);
  b.set(115, 178, Tile.DoorwayWood);
  b.set(112, 178, Tile.WallWoodWindow).set(118, 178, Tile.WallWoodWindow);
  b.set(110, 172, Tile.WallWoodWindow).set(120, 172, Tile.WallWoodWindow);
  b.set(112, 169, Tile.PottersWheel);
  b.set(114, 169, Tile.Basin); // the slip water
  b.set(111, 167, Tile.Crate); // river clay
  b.set(118, 168, Tile.GlazedJars).set(119, 171, Tile.GlazedJars);
  b.set(111, 175, Tile.ShopShelf);
  b.set(115, 175, Tile.Counter).set(116, 175, Tile.Counter);
  b.setDetail(115, 177, Detail.Doormat);
  b.set(122, 174, Tile.PotteryKiln); // the potter's mound, breathing
  b.sign(113, 179, 'THE CROCKERY', ['thrown, burned,', 'and true']);
  b.fillRect(124, 168, 9, 11, Tile.WoodFloor);
  b.outlineRect(124, 168, 9, 11, Tile.WallWood);
  b.set(128, 178, Tile.DoorwayWood);
  b.set(125, 178, Tile.WallWoodWindow).set(131, 178, Tile.WallWoodWindow);
  b.set(124, 173, Tile.WallWoodWindow).set(132, 173, Tile.WallWoodWindow);
  b.set(125, 170, Tile.CandleRack).set(125, 173, Tile.CandleRack);
  b.set(128, 174, Tile.Counter).set(129, 174, Tile.Counter);
  b.set(131, 169, Tile.Cabinet).set(130, 170, Tile.Crate); // the wax
  b.set(127, 171, Tile.CandleStand); // the shop sells its own light
  b.setDetail(128, 177, Detail.Doormat);
  b.sign(126, 179, 'THE CHANDLERY', ["the shrine's wicks", 'are dipped here']);
  b.fillRect(136, 170, 9, 9, Tile.WoodFloor);
  b.outlineRect(136, 170, 9, 9, Tile.WallWood);
  b.set(140, 178, Tile.DoorwayWood);
  b.set(137, 178, Tile.WallWoodWindow).set(143, 178, Tile.WallWoodWindow);
  b.set(136, 174, Tile.WallWoodWindow).set(144, 174, Tile.WallWoodWindow);
  b.set(137, 172, Tile.CobblersBench).set(138, 172, Tile.Chair);
  b.set(142, 171, Tile.ShopShelf);
  b.set(140, 174, Tile.Counter).set(141, 174, Tile.Counter);
  b.set(137, 176, Tile.Crate); // the leather
  b.setDetail(140, 177, Detail.Doormat);
  b.sign(142, 179, "THE COBBLER'S", ['soles for the stair,', 'mended while you wait']);
  // THE PILGRIM'S REST — cheap beds at the way's foot; the flame
  // keeps the fee.
  b.fillRect(136, 204, 9, 11, Tile.WoodFloor);
  b.outlineRect(136, 204, 9, 11, Tile.WallWood);
  b.set(144, 209, Tile.DoorwayWood);
  b.set(144, 206, Tile.WallWoodWindow).set(144, 212, Tile.WallWoodWindow);
  b.set(136, 208, Tile.WallWoodWindow).set(140, 214, Tile.WallWoodWindow);
  b.set(137, 205, Tile.Bed).set(137, 206, Tile.Bed);
  b.set(139, 205, Tile.Bed).set(139, 206, Tile.Bed);
  b.set(137, 211, Tile.Bed).set(137, 212, Tile.Bed);
  b.set(139, 211, Tile.Bed).set(139, 212, Tile.Bed);
  b.set(142, 204, Tile.Hearth);
  b.set(141, 210, Tile.Table).set(141, 209, Tile.Chair);
  b.set(143, 213, Tile.CandleStand);
  b.setDetail(143, 209, Detail.Doormat);
  b.set(145, 209, Tile.Path); // the step onto the way
  b.set(145, 213, Tile.WayfarersRest); // somebody always sleeps cheaper still
  b.sign(145, 206, "THE PILGRIM'S REST", ['a bed before the climb.', 'the flame keeps the fee']);
  // THE WAGON YARD — where the real caravans stop; the high
  // caravanserai keeps the Crown's post-riders.
  for (let x = 111; x <= 115; x++) b.set(x, 213, Tile.RailWood);
  for (let x = 118; x <= 122; x++) b.set(x, 213, Tile.RailWood);
  b.setDetail(112, 214, Detail.Straw).setDetail(120, 214, Detail.Straw);
  b.set(113, 215, Tile.WaterTrough).set(120, 215, Tile.WaterTrough);
  b.set(111, 220, Tile.HitchingPost).set(118, 220, Tile.HitchingPost);
  b.set(114, 224, Tile.HandCart).set(120, 226, Tile.Wheelbarrow);
  b.set(117, 228, Tile.Campfire);
  b.set(115, 228, Tile.Bench).set(119, 229, Tile.Bench);
  b.set(111, 230, Tile.Crate).set(112, 231, Tile.CrateGoods);
  // The wainwright's shed, lined into the yard's east edge.
  b.fillRect(127, 223, 6, 8, Tile.WoodFloor);
  b.outlineRect(127, 223, 6, 8, Tile.WallWood);
  b.set(127, 226, Tile.DoorwayWood);
  b.set(127, 229, Tile.WallWoodWindow);
  b.set(129, 224, Tile.Sawhorse).set(131, 228, Tile.Workbench);
  b.set(131, 224, Tile.ToolRack).set(128, 229, Tile.Barrel);
  b.setDetail(128, 226, Detail.Doormat);
  b.sign(109, 211, 'THE WAGON YARD', ['axles mended,', 'oxen watered'], Tile.Signpost);
  // THE PILGRIM'S WAY keeps its stations — three lamps of the
  // road-faith pacing the climb to Sella's flame.
  b.set(150, 230, Tile.WayShrine).set(150, 184, Tile.WayShrine).set(150, 158, Tile.WayShrine);
  // The east bank's north stretch stays open — the river walk
  // breathes (negative space is a material too).
  b.set(109, 126, Tile.TreeWillow).set(109, 140, Tile.TreeWillow);
  b.set(130, 120, Tile.TreePine).set(144, 132, Tile.TreePine).set(115, 134, Tile.TreePine);

  // ---------------------------------------------------------------
  // Mountain life and the soft edges.
  // ---------------------------------------------------------------
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Tuft, 0.05);
  b.scatterDetail(Detail.Pebbles, 0.02);
  // Pines take the terraces where nobody built (grove apron law).
  const pineAt = (x: number, y: number): void => {
    if (b.get(x, y) === Tile.Grass) b.set(x, y, Tile.TreePine);
  };
  for (const [px, py] of [
    [50, 65], [59, 64], [51, 84], [50, 91], [96, 92],
    [146, 62], [147, 78], [120, 80],
    [47, 39], [36, 44], [42, 48], [132, 46],
    [47, 15], [48, 25], [52, 34],
    [139, 14], [143, 26], [140, 33],
    [24, 64], [10, 64], [28, 78], [147, 10], [166, 12], [166, 30], [166, 50],
  ] as const) {
    pineAt(px, py);
  }
  // The border fringe: the wild's last word before the walls.
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      if (b.levelAt(x, y) !== 0) continue;
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(x - 88) <= 5 && y > 110) continue; // the road breathes
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.3 : edge < 6 ? 0.12 : 0;
      if (density > 0 && fallRng(x, y) < density) {
        b.set(x, y, fallRng(x + 1000, y) < 0.2 ? Tile.Rock : Tile.Tree);
      }
    }
  }

  // ---------------------------------------------------------------
  // THE PEOPLE — the capital's cast. Placements are each routine's
  // post (the post-is-the-origin law).
  // ---------------------------------------------------------------
  // The Crown, and THE CASTLE GARRISON — nine posts of the King's
  // steel: the gate pair on the landing, the passage, the hall gate,
  // the dais pair, the royal door, and the drill pair whose rota
  // hot-bunks the garrison range (day body sleeps by night, night
  // body walks the east-walk rounds by lantern).
  b.actor('king_aeriex', 77.5, 15.4, Math.PI / 2, 'fall_king');
  b.actor('queen_kayri', 78.5, 15.4, Math.PI / 2, 'fall_queen');
  b.actor('warden_maren', 57.5, 21.4, 0, 'fall_warden');
  b.actor('herald_ossian', 82.5, 17.4, Math.PI / 2, 'fall_herald');
  b.actor('steward_ansgar', 55.5, 29.4, -Math.PI / 2, 'fall_steward');
  b.actor('drillmaster_jorunn', 65.5, 29.5, Math.PI / 2, 'fall_drillmaster');
  b.actor('castle_guard', 85.5, 33.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 91.5, 33.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 88.5, 30.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 76.5, 25.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 74.5, 15.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 81.5, 15.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 89.5, 25.5, Math.PI / 2, 'fall_castle_guard');
  b.actor('castle_guard', 63.5, 28.5, Math.PI / 2, 'fall_castle_guard_drill_day');
  b.actor('castle_guard', 66.5, 28.5, Math.PI / 2, 'fall_castle_guard_drill_night');
  // THE HOUSEHOLD — the palace is staffed, not furnished.
  b.actor('castle_servant', 53.5, 27.4, Math.PI / 2, 'fall_servant');
  b.actor('castle_servant', 79.5, 21.5, Math.PI / 2, 'fall_servant');
  b.actor('castle_servant', 92.5, 26.5, Math.PI / 2, 'fall_servant');
  b.actor('castle_servant', 107.5, 25.5, Math.PI / 2, 'fall_servant');
  b.actor('shrinekeeper_sella', 126.5, 18.5, -Math.PI / 2, 'fall_shrinekeeper');
  // The Silver Court.
  b.actor('bursar_odele', 53.5, 43.5, 0, 'fall_bursar');
  b.actor('enchantress_solvei', 37.5, 56.3, -Math.PI / 2, 'fall_enchantress');
  b.actor('marshal_kestrel', 71.5, 55.3, Math.PI / 2, 'fall_marshal');
  // The gate watch stands OUTSIDE the Silver Gate; the desk, the
  // plaza, and the Court Gate hold the climb's checkpoints.
  b.actor('silverfall_watch', 85.5, 115.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 91.5, 115.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 41.5, 105.5, 0, 'fall_watch');
  b.actor('silverfall_watch', 93.5, 40.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 66.5, 44.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 82.5, 61.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 93.5, 61.5, Math.PI / 2, 'fall_watch');
  b.actor('silverfall_watch', 127.5, 106.5, Math.PI / 2, 'fall_watch_market');
  b.actor('silverfall_watch', 88.5, 55.5, Math.PI / 2, 'fall_watch_row');
  // THE CHANGING OF THE GUARD — the rota behind the standing posts.
  b.actor('silverfall_watch', 86.5, 110.5, Math.PI / 2, 'fall_watch_gate_day');
  b.actor('silverfall_watch', 90.5, 110.5, Math.PI / 2, 'fall_watch_gate_night');
  b.actor('silverfall_watch', 88.5, 101.5, Math.PI / 2, 'fall_watch_round_day');
  b.actor('silverfall_watch', 88.5, 107.5, Math.PI / 2, 'fall_watch_round_night');
  b.actor('silverfall_watch', 169.5, 11.5, -Math.PI / 2, 'fall_watch_muster_night');
  // Lantern Row.
  b.actor('silversmith_vigdis', 54.5, 54.4, Math.PI / 2, 'fall_silversmith');
  b.actor('weaver_ottilie', 110.5, 56.4, Math.PI / 2, 'fall_weaver');
  b.actor('scrivener_tove', 123.5, 55.4, Math.PI / 2, 'fall_scrivener');
  b.actor('innkeep_ragna', 132.5, 55.4, Math.PI / 2, 'fall_innkeep');
  b.actor('galleria_trader', 95.5, 52.4, Math.PI / 2, 'fall_trader');
  b.actor('galleria_trader', 95.5, 56.4, Math.PI / 2, 'fall_trader');
  b.actor('galleria_trader', 74.5, 44.4, Math.PI / 2, 'fall_trader');
  // The Emberway.
  b.actor('foreman_grettir', 20.5, 79.5, 0, 'fall_foreman');
  b.actor('smeltmaster_koll', 38.5, 69.4, Math.PI, 'fall_smeltmaster');
  b.actor('assayer_runa', 55.5, 89.6, -Math.PI / 2, 'fall_assayer');
  b.actor('forgemistress_balla', 66.5, 70.3, Math.PI, 'fall_forgemistress');
  b.actor('mason_petra', 39.5, 87.3, -Math.PI / 2, 'fall_mason');
  // The Timberway.
  b.actor('carpenter_stig', 112.5, 69.3, Math.PI, 'fall_carpenter');
  b.actor('fletcher_haki', 124.5, 76.4, -Math.PI / 2, 'fall_fletcher');
  b.actor('cooper_dagny', 139.5, 69.4, -Math.PI / 2, 'fall_cooper');
  b.actor('cook_signy', 127.5, 84.3, -Math.PI / 2, 'fall_cook');
  b.actor('herbalist_wyn', 144.5, 85.3, -Math.PI / 2, 'fall_herbalist');
  b.actor('gardener_ivo', 157.5, 71.5, Math.PI / 2, 'fall_gardener');
  // The Gatefront.
  b.actor('hostler_osa', 60.5, 101.5, -Math.PI / 2, 'fall_hostler');
  b.actor('outrider_joss', 60.5, 103.5, -Math.PI / 2, 'fall_outrider');
  b.actor('gate_monger', 120.5, 102.4, Math.PI / 2, 'fall_trader');
  b.actor('gate_monger', 130.5, 106.4, Math.PI / 2, 'fall_trader');
  // The Rookery.
  b.actor('magpie_mab', 33.5, 24.4, Math.PI / 2, 'fall_magpie');
  b.actor('fence_calder', 38.5, 25.4, Math.PI / 2, 'fall_fence');
  b.actor('lookout_pike', 42.5, 28.5, Math.PI / 2, 'fall_lookout');

  // THE PEOPLE OF THE VALE (Phase 6) — the lower town's own cast.
  // Placements are each routine's post (the post-is-the-origin law).
  b.actor('taverner_ulf', 67.5, 132.5, Math.PI / 2, 'fall_taverner');
  b.actor('monger_petya', 69.5, 152.4, Math.PI / 2, 'fall_monger_fish');
  b.actor('monger_lucan', 77.5, 153.4, Math.PI / 2, 'fall_monger_greens');
  b.actor('baker_hedda', 67.5, 169.5, Math.PI / 2, 'fall_baker');
  b.actor('wainwright_torvald', 129.5, 226.4, Math.PI / 2, 'fall_wainwright');
  b.actor('miller_brant', 111.5, 147.5, Math.PI / 2, 'fall_miller');
  b.actor('potter_signe', 113.5, 170.4, Math.PI / 2, 'fall_potter');
  b.actor('chandler_wick', 127.5, 172.4, Math.PI / 2, 'fall_chandler');
  b.actor('cobbler_finn', 138.5, 173.4, Math.PI / 2, 'fall_cobblersman');
  b.actor('hostelkeeper_maeve', 140.5, 209.4, Math.PI / 2, 'fall_hostelkeep');
  b.actor('keeper_ronnaug', 13.5, 164.5, Math.PI / 2, 'fall_restkeeper');
  b.actor('bathkeeper_una', 32.5, 165.4, Math.PI / 2, 'fall_bathkeeper');
  b.actor('guildmaster_soren', 23.5, 184.4, Math.PI / 2, 'fall_guildmaster');
  b.actor('gravekeeper_aldous', 33.5, 150.4, Math.PI / 2, 'fall_gravekeeper');
  b.actor('fisher_brigga', 29.5, 207.4, Math.PI / 2, 'fall_fisher_deep');
  b.actor('fisher_holm', 29.5, 221.4, Math.PI / 2, 'fall_fisher_reed');
  b.actor('sergeant_varn', 99.5, 227.5, Math.PI / 2, 'fall_sergeant');
  // THE SAND AND THE ROAR: the Grand Ring's own throat, at the
  // counter by the fighters' gate.
  b.actor('ringmaster_cato', 59.5, 231.4, Math.PI / 2, 'grand_ring_master');
  b.actor('courier_pip', 88.5, 130.5, Math.PI / 2, 'fall_courier');
  // The lower watch: the gate rota pair, the beats, the posts.
  b.actor('vale_watch', 86.5, 239.5, Math.PI / 2, 'vale_watch_gate_day');
  b.actor('vale_watch', 90.5, 239.5, Math.PI / 2, 'vale_watch_gate_night');
  b.actor('vale_watch', 72.5, 157.5, Math.PI / 2, 'vale_watch_market');
  b.actor('vale_watch', 25.5, 215.5, Math.PI / 2, 'vale_watch_post');
  b.actor('vale_watch', 111.5, 215.5, Math.PI / 2, 'vale_watch_post');
  b.actor('vale_watch', 88.5, 234.5, Math.PI / 2, 'vale_watch_post');
  // The way keeps its walkers, and the yard its fires.
  b.actor('vale_pilgrim', 146.5, 218.5, Math.PI / 2, 'vale_pilgrim_rest');
  b.actor('vale_pilgrim', 148.5, 200.5, Math.PI / 2, 'vale_pilgrim_way');
  b.actor('vale_pilgrim', 147.5, 176.5, Math.PI / 2, 'vale_pilgrim_rest');
  b.actor('vale_carter', 117.5, 227.5, Math.PI / 2, 'vale_carter_yard');
  b.actor('vale_carter', 121.5, 218.5, Math.PI / 2, 'vale_carter_yard');

  // The crag pasture's rams — the city's only livestock, on purpose.
  b.npcSpawn('ram', 157, 49.5, 3, 3);
  // The capital's yard cats, kept fat by the fold's spilled grain.
  b.npcSpawn('cat', 154.5, 51.5, 3, 2);

  // The hearth of the north: respawn inside the gate, on the avenue.
  b.spawn(88.5, 104.5);
  return b.build();
}

/** Stable per-tile randomness so the city is identical every boot. */
function fallRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
