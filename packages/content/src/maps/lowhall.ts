import { Detail, Tile, bannerPoleTile } from '@arx/shared';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * THE LOW HALL — the Red Company's buried sanctuary (the reavers'
 * home the faction epic never gave them; docs/red-company-plan.md).
 *
 * Nobody walks overland to the Low Hall. It has NO surface. Five
 * hidden hatches in five cities drop into THE FIVE DOORS — the
 * arrival ring where every alcove is a city and every signpost names
 * a road — and the Company's whole thesis stands in one room: every
 * city, one cellar.
 *
 *   THE FIVE DOORS — the ring: Amberford north, Hartfell northeast,
 *       Silverfall northwest, Saltmere southwest, Pinewatch south.
 *       The Company mark (madder poles, the round rug) at center.
 *   THE EMBER HALL — the feast hall east of the ring: twin hearths,
 *       the long tables, and Captain Ravna's seat under the madder
 *       cloth at the north wall.
 *   THE COUNTING ROOM — north: Tallyman Brusk's fence counter (the
 *       fence law lists the Company), the vault, the bank chests,
 *       and THE DOCKET on the wall — the jobs the Company pays for.
 *   THE KIT CAGE — east: Quartermaster Yeva's racks and the shop.
 *   THE BUNKS — south: hot bunks, the mess, the kitchen hearth.
 *   THE STILL POOL — southwest: black water, blind fish, shrooms.
 *
 * LAWS: dark band (y>=512) — underground ambient/cutaway/audio ride
 * world-y automatically; danger tier 0, NOTHING hostile spawns here
 * (the blades are enforcers: the hall hunts only Company outlaws);
 * chambers are carved, not built — CaveWall is the architecture; no
 * lamp posts (the Company burns braziers, not town lamps).
 */

/**
 * Where each alcove's up-portal lands: one tile beside its city's
 * hatch (never ON the paired portal — the Undercroft pairing law).
 */
const DOOR_UP = {
  amberford: { x: 389.5, y: 39.5 }, // the reed neck's slack bank
  silverfall: { x: -337.5, y: -179.5 }, // the Rookery's back lot
  saltmere: { x: 367.5, y: 292.5 }, // the pocket by the Pilot's Cot
  pinewatch: { x: 534.5, y: -140.5 }, // the reed bank at the millrace
  hartfell: { x: 845.5, y: -382.5 }, // the yard behind the Speaker's house
  kingsdelf: { x: -216.5, y: 322.5 }, // the shadow behind the delvers' barracks
} as const;

export function buildLowhall(): ZoneDef {
  const b = new ZoneBuilder('lowhall', 'The Low Hall', { x: 200, y: 552 }, 88, 56, Tile.CaveWall);

  // ---------------------------------------------------------------
  // THE FIVE DOORS — the arrival ring.
  // ---------------------------------------------------------------
  b.fillEllipse(17, 28, 10, 8, Tile.StoneFloor);
  // The alcoves, one per city, carved off the ring.
  b.fillRect(15, 14, 5, 6, Tile.StoneFloor); // Amberford, north
  b.fillRect(23, 15, 5, 8, Tile.StoneFloor); // Hartfell, northeast (steps down to the ring)
  b.fillRect(5, 19, 5, 6, Tile.StoneFloor); // Silverfall, northwest
  b.fillRect(5, 32, 5, 6, Tile.StoneFloor); // Saltmere, southwest
  b.fillRect(15, 37, 5, 6, Tile.StoneFloor); // Pinewatch, south
  b.fillRect(23, 34, 5, 7, Tile.StoneFloor); // Kingsdelf, southeast (the sixth door)
  b.portal(17, 15, Tile.PortalUp, DOOR_UP.amberford);
  b.portal(25, 16, Tile.PortalUp, DOOR_UP.hartfell);
  b.portal(7, 20, Tile.PortalUp, DOOR_UP.silverfall);
  b.portal(7, 36, Tile.PortalUp, DOOR_UP.saltmere);
  b.portal(17, 41, Tile.PortalUp, DOOR_UP.pinewatch);
  b.portal(25, 39, Tile.PortalUp, DOOR_UP.kingsdelf);
  b.sign(19, 16, 'THE AMBERFORD DOOR', ['the ford road', 'mind the miller']);
  b.sign(27, 17, 'THE HARTFELL DOOR', ['the fell road', 'wear wool']);
  b.sign(5, 21, 'THE SILVERFALL DOOR', ['the crown road', 'mind the Magpie\'s rent']);
  b.sign(5, 37, 'THE SALTMERE DOOR', ['the salt road', 'wipe your boots']);
  b.sign(19, 42, 'THE PINEWATCH DOOR', ['the timber road', 'quiet past the boom']);
  b.sign(27, 36, 'THE KINGSDELF DOOR', ['the unlit road', 'ask for Slate, buy something']);
  b.set(15, 19, Tile.Brazier).set(23, 20, Tile.Brazier);
  b.set(9, 24, Tile.Brazier).set(9, 33, Tile.Brazier).set(15, 38, Tile.Brazier);
  // The Company mark at the ring's heart.
  b.setDetail(17, 28, Detail.RugRound);
  b.set(14, 27, bannerPoleTile(1)).set(20, 27, bannerPoleTile(1));
  b.setDetail(13, 30, Detail.Pebbles).setDetail(22, 25, Detail.Pebbles);

  // ---------------------------------------------------------------
  // THE EMBER HALL — the feast hall, east down the throat.
  // ---------------------------------------------------------------
  b.fillRect(27, 27, 10, 3, Tile.StoneFloor); // the throat
  b.set(28, 26, Tile.Brazier).set(35, 30, Tile.Brazier);
  b.fillRect(37, 19, 26, 18, Tile.WoodFloor);
  // Ravna's end: the seat, the madder cloth, the map table.
  b.set(49, 21, Tile.Chair); // the Captain's seat — a chair, on purpose
  b.setDetail(48, 22, Detail.Rug).setDetail(49, 22, Detail.Rug).setDetail(50, 22, Detail.Rug);
  b.set(46, 20, bannerPoleTile(1)).set(52, 20, bannerPoleTile(1));
  b.set(44, 21, Tile.Table).set(45, 21, Tile.Table); // the road map
  b.set(53, 21, Tile.Bookshelf); // the Company's articles
  // The long tables, chairs down both sides, hearths at the ends.
  b.set(39, 20, Tile.Hearth).set(61, 20, Tile.Hearth);
  for (let y = 26; y <= 31; y++) b.set(43, y, Tile.Table).set(55, y, Tile.Table);
  b.set(42, 27, Tile.Chair).set(42, 30, Tile.Chair);
  b.set(44, 26, Tile.Chair).set(44, 29, Tile.Chair).set(44, 31, Tile.Chair);
  b.set(54, 27, Tile.Chair).set(54, 30, Tile.Chair);
  b.set(56, 26, Tile.Chair).set(56, 29, Tile.Chair).set(56, 31, Tile.Chair);
  b.set(38, 35, Tile.Barrel).set(39, 36, Tile.Barrel); // the hall's cellar row
  b.set(61, 35, Tile.CrateGoods).set(62, 36, Tile.Crate);
  b.set(38, 25, Tile.Brazier).set(61, 25, Tile.Brazier);
  b.setDetail(49, 27, Detail.Rug).setDetail(49, 28, Detail.Rug);
  b.setDetail(50, 27, Detail.Rug).setDetail(50, 28, Detail.Rug);

  // ---------------------------------------------------------------
  // THE COUNTING ROOM — north: the fence, the vault, THE DOCKET.
  // ---------------------------------------------------------------
  b.fillRect(46, 16, 3, 3, Tile.StoneFloor); // the stair throat
  b.fillRect(41, 8, 14, 9, Tile.StoneFloor);
  b.set(42, 9, Tile.Vault); // the Company's deep box
  b.set(44, 9, Tile.BankChest).set(46, 9, Tile.BankChest);
  b.set(53, 9, Tile.ChestMossy); // the box nobody asks about
  b.set(49, 9, Tile.Bookshelf).set(50, 9, Tile.Bookshelf); // clean books
  for (let x = 44; x <= 47; x++) b.set(x, 12, Tile.Counter); // the fence counter
  b.set(42, 12, Tile.Table).set(42, 13, Tile.Chair); // Brusk's scales
  b.set(52, 12, Tile.CrateGoods).set(53, 13, Tile.Barrel); // last night's goods
  b.sign(52, 15, 'THE DOCKET', ['work posted, work paid', 'ask the Tallyman']);
  b.set(41, 15, Tile.Brazier).set(54, 8, Tile.Brazier);
  b.setDetail(45, 13, Detail.Rug).setDetail(46, 13, Detail.Rug);

  // ---------------------------------------------------------------
  // THE KIT CAGE — east: the Quartermaster's shop.
  // ---------------------------------------------------------------
  b.fillRect(63, 24, 3, 2, Tile.StoneFloor); // the throat
  b.fillRect(66, 20, 14, 10, Tile.StoneFloor);
  b.set(69, 24, Tile.Counter).set(69, 25, Tile.Counter);
  b.set(67, 21, Tile.WeaponRack).set(77, 21, Tile.WeaponRack).set(77, 28, Tile.ToolRack);
  b.set(72, 21, Tile.Crate).set(74, 21, Tile.CrateGoods);
  b.set(78, 24, Tile.Cabinet).set(72, 28, Tile.Barrel).set(74, 28, Tile.Crate);
  b.set(67, 28, Tile.Workbench); // she mends what she sells
  b.set(79, 20, Tile.Brazier).set(66, 29, Tile.Brazier);
  b.setDetail(71, 25, Detail.Rug).setDetail(72, 25, Detail.Rug);

  // ---------------------------------------------------------------
  // THE BUNKS — south: hot bunks, the mess, the kitchen hearth.
  // ---------------------------------------------------------------
  b.fillRect(48, 37, 3, 4, Tile.StoneFloor); // the throat
  b.fillRect(42, 41, 18, 10, Tile.WoodFloor);
  b.set(43, 42, Tile.Bed).set(43, 43, Tile.Bed);
  b.set(45, 42, Tile.Bed).set(45, 43, Tile.Bed);
  b.set(47, 42, Tile.Bed).set(47, 43, Tile.Bed);
  b.setDetail(44, 45, Detail.Rug).setDetail(45, 45, Detail.Rug).setDetail(46, 45, Detail.Rug);
  b.set(58, 42, Tile.Hearth); // the kitchen end
  b.set(56, 42, Tile.Counter).set(55, 42, Tile.Basin);
  b.set(52, 47, Tile.Table).set(53, 47, Tile.Table);
  b.set(51, 47, Tile.Chair).set(54, 47, Tile.Chair).set(52, 48, Tile.Chair).set(53, 46, Tile.Chair);
  b.set(43, 49, Tile.Barrel).set(58, 49, Tile.CrateGoods).set(59, 45, Tile.Crate);
  b.set(42, 46, Tile.Brazier).set(59, 41, Tile.Brazier);

  // ---------------------------------------------------------------
  // THE STILL POOL — southwest: black water and blind fish.
  // ---------------------------------------------------------------
  b.fillRect(36, 46, 6, 2, Tile.StoneFloor); // the throat from the bunks
  b.fillEllipse(28, 47, 8, 5, Tile.CaveFloor);
  b.fillEllipse(27, 47, 5, 3, Tile.WaterShallow);
  b.fillEllipse(27, 47, 3.5, 2, Tile.Water);
  b.set(23, 46, Tile.FishingSpot).set(31, 48, Tile.FishingSpot);
  b.set(22, 50, Tile.GlowShroom).set(33, 44, Tile.GlowShroom).set(34, 50, Tile.GlowShroom);
  b.set(24, 43, Tile.Stalagmite).set(32, 51, Tile.Stalagmite);
  b.setDetail(30, 45, Detail.Pebbles).setDetail(24, 49, Detail.Pebbles);

  // ---------------------------------------------------------------
  // THE PEOPLE — posts (routines are each post's origin).
  // ---------------------------------------------------------------
  b.actor('captain_ravna', 49.5, 23.4, Math.PI / 2, 'low_captain');
  b.actor('tallyman_brusk', 45.5, 11.4, Math.PI / 2, 'low_tallyman');
  b.actor('quartermaster_yeva', 70.5, 24.5, Math.PI, 'low_quartermaster');
  b.actor('company_blade', 17.5, 24.5, Math.PI / 2, 'low_blade'); // the ring
  b.actor('company_blade', 31.5, 28.5, Math.PI / 2, 'low_blade'); // the throat
  b.actor('company_blade', 47.5, 17.4, Math.PI / 2, 'low_blade'); // the counting stair
  b.actor('company_blade', 64.5, 24.5, Math.PI / 2, 'low_blade'); // the cage throat
  b.actor('company_blade', 48.5, 38.5, Math.PI / 2, 'low_blade'); // the bunk stair
  b.actor('company_runner', 40.5, 28.5, Math.PI / 2, 'low_runner');
  b.actor('company_runner', 52.5, 33.5, Math.PI / 2, 'low_runner');

  // The hearth of the low roads: respawn at the ring.
  b.spawn(17.5, 31.5);
  return b.build();
}
