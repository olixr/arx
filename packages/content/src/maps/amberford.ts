import { Detail, Tile } from '@devcraft/shared';
import { AMBERFORD_RECT } from '../geography.js';
import {
  COTTAGE_LARGE,
  COTTAGE_SMALL,
  GUARD_POST,
  INN_LARGE,
  CHAPEL,
  MARKET_STALL,
  SHOP_SMALL,
  SMITHY,
} from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Amberford — the crossroads market town, the second hearth of the
 * Dawnlands. A waker graduates here off the First Road: the world's
 * first bank, the three trainer masters' workshops, the inn with a
 * fire always lit, and two gates pointing at two different futures —
 * the warm west road home, and the North Gate where the High Road
 * starts its long climb toward Silverfall.
 *
 * The zone stamps into AMBERFORD_RECT exactly (geography.test pins
 * it), and the gates meet the carved worldgen roads tile-for-tile:
 * the First Road enters the Fordgate at world (105,36) = local
 * (1,52); the High Road leaves the North Gate at world (158,-15) =
 * local (54,1).
 *
 * Anchors that must NOT move once the people pass lands (routine
 * offsets will hang off them): the Market Round and its well, the
 * bank counter, the three craft workshops and their stations, the
 * inn, the mill and docks, the chapel, every cottage door, and both
 * gates. Residents-to-be are noted on their buildings — the
 * architecture is built FOR its people even though the people arrive
 * in a later epic.
 */
export function buildAmberford(): ZoneDef {
  const R = AMBERFORD_RECT;
  const b = new ZoneBuilder('amberford', 'Amberford', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // The lanes — laid first so everything else shoulders up to them.
  // West spine: the First Road's rows (local 51-53) in from the
  // Fordgate, bending north to the Market Round. North spine: down
  // from the North Gate. South spine: from the Round to the Commons.
  // ---------------------------------------------------------------
  b.path({ x: 0, y: 52 }, { x: 20, y: 52 }, 3);
  b.path({ x: 20, y: 52 }, { x: 34, y: 46 }, 3);
  b.path({ x: 34, y: 46 }, { x: 46, y: 42 }, 3);
  b.path({ x: 54, y: 2 }, { x: 54, y: 20 }, 3);
  b.path({ x: 54, y: 20 }, { x: 52, y: 32 }, 3);
  b.path({ x: 52, y: 47 }, { x: 52, y: 68 }, 3);
  // The craft lane, along the workshops' north-entry row.
  b.path({ x: 17, y: 8 }, { x: 54, y: 8 }, 2);
  // The Commons walk, giving the chapel door and cottage spurs a lane.
  b.path({ x: 34, y: 69 }, { x: 52, y: 69 }, 2);
  // The dock lane, east from the Round to the millpond.
  b.path({ x: 60, y: 40 }, { x: 78, y: 38 }, 2);

  // ---------------------------------------------------------------
  // The Market Round — the town's stone heart: plaza, the old well,
  // stall canopies, and banners. Market mornings happen here.
  // ---------------------------------------------------------------
  b.fillEllipse(52, 40, 9, 7, Tile.StoneFloor);
  b.set(51, 39, Tile.WallStone).set(52, 39, Tile.WallStone); // the well
  b.set(51, 40, Tile.WallStone).set(52, 40, Tile.WallStone);
  b.stamp(MARKET_STALL, 40, 33);
  b.stamp(MARKET_STALL, 57, 33);
  b.stamp(MARKET_STALL, 42, 44);
  b.stamp(MARKET_STALL, 59, 44);
  b.set(43, 32, Tile.BannerPole).set(61, 32, Tile.BannerPole);
  b.set(43, 48, Tile.BannerPole).set(61, 48, Tile.BannerPole);
  b.set(46, 47, Tile.Bench).set(47, 47, Tile.Bench);
  b.set(40, 44, Tile.LampPost).set(63, 38, Tile.LampPost);
  // Two old oaks shading the plaza shoulders.
  b.set(44, 49, Tile.TreeOak);
  b.set(62, 33, Tile.TreeOak);

  // ---------------------------------------------------------------
  // The Bank of Amberford — the town's stone strongroom and the
  // world's FIRST bank: teller counter, two banking chests on the
  // public floor, and the vault room walled off at the west end.
  // (Banker Cormund's post, come the people pass.)
  // ---------------------------------------------------------------
  b.fillRect(38, 20, 14, 11, Tile.StoneFloor);
  b.outlineRect(38, 20, 14, 11, Tile.WallStone);
  b.set(44, 30, Tile.DoorwayStoneWide).set(45, 30, Tile.DoorwayStoneWide);
  b.set(41, 30, Tile.WallStoneWindow).set(48, 30, Tile.WallStoneWindow);
  b.set(38, 25, Tile.WallStoneWindow).set(51, 25, Tile.WallStoneWindow);
  // The vault: an inner stone wall, the armored boxes behind it.
  for (let y = 21; y <= 29; y++) b.set(41, y, Tile.WallStone);
  b.set(41, 25, Tile.DoorwayStone);
  b.set(39, 22, Tile.Vault).set(39, 26, Tile.Vault);
  b.set(40, 21, Tile.Cabinet);
  // The teller line and the banking floor.
  for (let x = 44; x <= 47; x++) b.set(x, 24, Tile.Counter);
  b.set(44, 27, Tile.BankChest).set(47, 27, Tile.BankChest);
  b.set(49, 21, Tile.Bookshelf).set(50, 21, Tile.Cabinet);
  b.setDetail(45, 27, Detail.Rug).setDetail(46, 27, Detail.Rug);
  b.setDetail(44, 29, Detail.Doormat).setDetail(45, 29, Detail.Doormat);
  b.set(43, 32, Tile.BannerPole); // already set — the bank fronts the banner row
  b.set(46, 32, Tile.LampPost).set(43, 31, Tile.FlowerBox).set(47, 31, Tile.FlowerBox);

  // ---------------------------------------------------------------
  // Craft Row — the three masters' workshops south of the craft
  // lane, north entries opening onto it.
  // ---------------------------------------------------------------
  // The smithy (Master Bretta Ironhewn): the template's wide north
  // entry, sawdust and quench basin, coal smoke by day.
  b.stamp(SMITHY, 18, 9);
  b.set(16, 10, Tile.Barrel);
  b.set(27, 12, Tile.Crate);
  // The artisan hall (Master Tilo): loom, carving bench, a counter
  // for taking commissions — the town's shared workshop. The tanning
  // rack lives on a dirt pad out the east side, downwind.
  b.fillRect(30, 9, 14, 10, Tile.WoodFloor);
  b.outlineRect(30, 9, 14, 10, Tile.WallWood);
  b.set(36, 9, Tile.DoorwayWoodWide).set(37, 9, Tile.DoorwayWoodWide);
  b.set(32, 9, Tile.WallWoodWindow).set(41, 9, Tile.WallWoodWindow);
  b.set(33, 18, Tile.WallWoodWindow).set(40, 18, Tile.WallWoodWindow);
  b.set(30, 13, Tile.WallWoodWindow).set(43, 13, Tile.WallWoodWindow);
  b.set(32, 11, Tile.Loom);
  b.set(41, 11, Tile.CarvingBench);
  for (let x = 35; x <= 38; x++) b.set(x, 15, Tile.Counter);
  b.set(42, 10, Tile.Cabinet);
  b.setDetail(33, 12, Detail.Sawdust).setDetail(40, 12, Detail.Sawdust);
  b.setDetail(36, 10, Detail.Doormat).setDetail(37, 10, Detail.Doormat);
  b.fillRect(44, 11, 3, 3, Tile.Dirt);
  b.set(45, 12, Tile.TanningRack);
  b.set(44, 14, Tile.Barrel);
  // The sage's dispensary (Sage Elowen): alembic, ledgered shelves,
  // and the fenced herb garden east of it — the potion economy's
  // town foothold. Door west, facing the north spine.
  b.fillRect(58, 12, 10, 8, Tile.WoodFloor);
  b.outlineRect(58, 12, 10, 8, Tile.WallWood);
  b.set(58, 15, Tile.DoorwayWood);
  b.set(58, 17, Tile.WallWoodWindow).set(62, 12, Tile.WallWoodWindow);
  b.set(62, 19, Tile.WallWoodWindow).set(67, 15, Tile.WallWoodWindow);
  b.set(64, 14, Tile.Alembic);
  b.set(61, 16, Tile.Counter).set(62, 16, Tile.Counter);
  b.set(66, 13, Tile.Bookshelf).set(59, 13, Tile.Cabinet);
  b.setDetail(59, 15, Detail.Doormat);
  b.set(56, 15, Tile.Dirt).set(57, 15, Tile.Dirt); // the worn step to the road
  b.outlineRect(69, 12, 9, 8, Tile.Fence);
  b.set(69, 15, Tile.Grass); // garden gate
  for (let x = 71; x <= 76; x += 1) {
    b.set(x, 14, x % 2 === 0 ? Tile.SagewortRipe : Tile.Tilled);
    b.set(x, 17, x % 2 === 0 ? Tile.Tilled : Tile.SagewortMid);
  }
  b.set(75, 18, Tile.MoonbellMid);
  b.set(70, 13, Tile.WildSagewort);

  // ---------------------------------------------------------------
  // The North Gate — where the High Road starts. Racks, lamps, the
  // warning board, and the watch-house: the town telling you plainly
  // what the climb costs. (Captain Aldis's post.)
  // ---------------------------------------------------------------
  b.fillRect(53, 0, 3, 2, Tile.Path); // the mouth meets the carved High Road
  b.set(51, 2, Tile.PillarStone).set(57, 2, Tile.PillarStone);
  b.set(51, 4, Tile.LampPost).set(57, 4, Tile.LampPost);
  b.set(56, 5, Tile.HangingSign); // "SILVERFALL — the High Road. Go armed."
  b.stamp(GUARD_POST, 45, 2);
  b.set(51, 6, Tile.WeaponRack);
  // The outfitter (Hask): arrows, tools, packs, torches — everything
  // the High Road demands, sold twenty steps before it starts.
  b.stamp(SHOP_SMALL, 57, 3);
  b.set(56, 7, Tile.Dirt); // the worn step between road and door

  // ---------------------------------------------------------------
  // The Wanderer's Rest — the inn (Dunna's house): wide door on the
  // Round's south shoulder, the fire that never goes out.
  // ---------------------------------------------------------------
  b.stamp(INN_LARGE, 54, 48);
  b.set(53, 49, Tile.LampPost);
  b.set(68, 50, Tile.Barrel).set(68, 51, Tile.Barrel).set(68, 52, Tile.Crate);
  b.set(58, 47, Tile.FlowerBox).set(63, 47, Tile.FlowerBox);

  // ---------------------------------------------------------------
  // The millpond, the mill, and the docks — the Amber Water. The
  // pond is spring-fed, drains south through the reeds, and the
  // stream sinks into the marsh before the town lets go of it.
  // ---------------------------------------------------------------
  b.fillEllipse(90, 36, 9, 12, Tile.WaterShallow);
  b.fillEllipse(90, 36, 7.5, 10.5, Tile.Water);
  b.fillEllipse(90, 36, 5, 7, Tile.WaterDeep);
  // The stream south, shallows lining every reach (the Dawnmead law:
  // water never traps anyone on a wrong bank).
  for (let y = 46; y <= 72; y++) {
    const cx = 90 + Math.round(Math.sin(y * 0.18) * 2.5);
    b.set(cx - 1, y, Tile.WaterShallow);
    b.set(cx, y, Tile.Water);
    b.set(cx + 1, y, Tile.WaterShallow);
  }
  // The reed sink — the Amber Water gives itself back to the ground.
  b.fillEllipse(91, 74, 5, 4, Tile.Swamp);
  b.fillEllipse(91, 74, 3, 2, Tile.WaterShallow);
  // The mill (Old Garton's): hard on the pond's west bank, flour
  // dust on everything. The wheel itself is a set-piece for later.
  b.fillRect(72, 26, 9, 7, Tile.WoodFloor);
  b.outlineRect(72, 26, 9, 7, Tile.WallWood);
  b.set(72, 29, Tile.DoorwayWood);
  b.set(75, 26, Tile.WallWoodWindow).set(78, 32, Tile.WallWoodWindow);
  b.set(76, 29, Tile.Workbench); // the millstone's stand-in station
  b.set(78, 27, Tile.Crate).set(78, 31, Tile.Barrel).set(73, 27, Tile.CrateGoods);
  b.setDetail(74, 28, Detail.Sawdust).setDetail(76, 30, Detail.Sawdust);
  b.setDetail(73, 29, Detail.Doormat);
  // The docks: plank decks out over the water, and the ferry shack
  // (Peld's) with its lantern on the south shore.
  for (let x = 81; x <= 85; x++) {
    b.set(x, 38, Tile.Bridge);
    b.set(x, 39, Tile.Bridge);
  }
  b.set(86, 40, Tile.FishingSpot);
  b.set(94, 29, Tile.FishingSpot);
  b.fillRect(78, 46, 5, 4, Tile.WoodFloor);
  b.outlineRect(78, 46, 5, 4, Tile.WallWood);
  b.set(80, 46, Tile.DoorwayWood);
  b.set(83, 48, Tile.LampPost);
  b.set(77, 49, Tile.Crate);
  // Willows lean over the east bank.
  b.set(97, 27, Tile.TreeWillow);
  b.set(99, 41, Tile.TreeWillow);
  b.set(95, 47, Tile.TreeWillow);

  // ---------------------------------------------------------------
  // The East Road stub — a signed lane that wanders out of town
  // toward the coast and simply ends: the map admitting there is
  // more world than road yet. (Saltmere, someday.)
  // ---------------------------------------------------------------
  b.path({ x: 52, y: 61 }, { x: 111, y: 61 }, 2);
  // The stream crossing: a plank span where the lane meets the water.
  for (let y = 60; y <= 61; y++) {
    const cx = 90 + Math.round(Math.sin(y * 0.18) * 2.5);
    for (let x = cx - 2; x <= cx + 2; x++) b.set(x, y, Tile.Bridge);
  }
  b.set(105, 58, Tile.HangingSign); // "EAST ROAD — the coast, eventually."

  // ---------------------------------------------------------------
  // The Waykeepers' Hall — the travelers' chapel south of the Round,
  // lamps lit for the road. (Keeper Ansel's post.)
  // ---------------------------------------------------------------
  b.stamp(CHAPEL, 40, 56);
  b.set(42, 68, Tile.LampPost).set(46, 68, Tile.LampPost);
  b.set(39, 58, Tile.FlowerBox);

  // ---------------------------------------------------------------
  // The Commons — the town's homes, gardens, and wear-paths. Each
  // cottage is somebody's whole world; the people pass will name
  // them all.
  // ---------------------------------------------------------------
  b.stamp(COTTAGE_SMALL, 17, 54); // Merra the grocer's
  b.stamp(COTTAGE_SMALL, 27, 54); // Captain Aldis's
  b.stamp(COTTAGE_SMALL, 18, 60); // Cormund the banker's
  b.stamp(COTTAGE_SMALL, 27, 64); // Master Tilo's
  b.stamp(COTTAGE_SMALL, 34, 72); // Goodwife Perl's
  b.set(33, 60, Tile.FlowerBox).set(19, 53, Tile.FlowerBox);
  b.set(24, 66, Tile.Bench);
  b.set(26, 60, Tile.LampPost);
  // Garden plots behind the cottages.
  b.fillRect(24, 56, 3, 2, Tile.Tilled);
  b.set(24, 56, Tile.CarrotMid).set(26, 57, Tile.CarrotRipe);
  b.fillRect(29, 61, 3, 2, Tile.Tilled);
  b.set(30, 61, Tile.SunflowerMid).set(31, 62, Tile.SunflowerRipe);
  // Wear-paths: the dirt lines feet actually cut.
  b.set(20, 60, Tile.Dirt).set(20, 61, Tile.Dirt); // Merra's step
  b.set(30, 60, Tile.Dirt).set(30, 61, Tile.Dirt); // Aldis's step
  b.set(21, 66, Tile.Dirt).set(21, 67, Tile.Dirt).set(22, 68, Tile.Dirt);
  b.set(30, 70, Tile.Dirt).set(31, 70, Tile.Dirt);
  b.set(37, 78, Tile.Dirt);

  // ---------------------------------------------------------------
  // Furrowfield farm — the west fields (Jorel & Tamsin's): fenced
  // crop rows off the road bend, the farmhouse and coop south of
  // the west spine.
  // ---------------------------------------------------------------
  b.outlineRect(3, 36, 19, 12, Tile.Fence);
  b.set(21, 42, Tile.Grass); // field gate, east
  for (let y = 38; y <= 46; y += 2) {
    for (let x = 5; x <= 19; x++) {
      if (x % 2 === 0) {
        b.set(x, y, Tile.Tilled);
      } else if (y === 38) {
        b.set(x, y, Tile.WheatRipe);
      } else if (y === 40) {
        b.set(x, y, Tile.WheatMid);
      } else if (y === 42) {
        b.set(x, y, Tile.CarrotRipe);
      } else if (y === 44) {
        b.set(x, y, Tile.CottonMid);
      } else {
        b.set(x, y, Tile.SunflowerRipe);
      }
    }
  }
  b.stamp(COTTAGE_LARGE, 8, 60); // the farmhouse
  b.set(17, 62, Tile.Barrel).set(17, 63, Tile.Crate);
  b.set(7, 68, Tile.Bench);
  // The coop: fenced dirt and straw between road and farmhouse.
  b.fillRect(5, 56, 4, 3, Tile.Dirt);
  b.outlineRect(4, 55, 6, 5, Tile.Fence);
  b.set(9, 57, Tile.Dirt); // gate, east
  b.setDetail(6, 57, Detail.Straw).setDetail(7, 56, Detail.Straw);
  // Wear from the road down to the farm's little world.
  b.set(11, 54, Tile.Dirt).set(11, 55, Tile.Dirt).set(11, 56, Tile.Dirt);
  b.set(11, 57, Tile.Dirt).set(11, 58, Tile.Dirt).set(12, 59, Tile.Dirt);

  // ---------------------------------------------------------------
  // The pasture — the northeast grazing, trough by the west rail.
  // (Perl feuds with these cows. The cows are winning.)
  // ---------------------------------------------------------------
  b.outlineRect(70, 2, 24, 9, Tile.Fence);
  b.set(76, 10, Tile.Grass); // gate, south
  b.set(72, 4, Tile.Basin);
  b.setDetail(75, 5, Detail.Straw).setDetail(84, 7, Detail.Straw);
  b.setDetail(89, 4, Detail.Straw);

  // ---------------------------------------------------------------
  // The orchard — Perl's apple rows west of the stream, berry banks
  // along the water.
  // ---------------------------------------------------------------
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      b.set(66 + col * 4 + (row % 2) * 2, 63 + row * 4, Tile.TreeOak);
    }
  }
  b.set(64, 64, Tile.BerryBush).set(64, 70, Tile.BerryBush);
  b.set(85, 64, Tile.BerryBush).set(86, 68, Tile.BerryBush);
  b.set(84, 71, Tile.FibrePlant);

  // ---------------------------------------------------------------
  // The Fordgate — the warm way home: pillars, lamps, and the sign
  // for Dawnmead. The First Road's rows run straight through.
  // ---------------------------------------------------------------
  b.set(2, 50, Tile.PillarStone).set(2, 54, Tile.PillarStone);
  b.set(4, 49, Tile.LampPost).set(4, 55, Tile.LampPost);
  b.set(6, 49, Tile.HangingSign); // "DAWNMEAD — the First Road."
  b.set(12, 50, Tile.LampPost).set(26, 49, Tile.LampPost);

  // ---------------------------------------------------------------
  // Meadow life, then the town's soft edges: thin tree scatter at
  // the rim only, thinning to nothing where the gates breathe and
  // never inside the worked land.
  // ---------------------------------------------------------------
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.04);
  b.scatterDetail(Detail.Tuft, 0.06);
  for (let y = 0; y < R.h; y++) {
    for (let x = 0; x < R.w; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      // The gates breathe: no scatter across the three road mouths.
      if (Math.abs(y - 52) <= 4 && x < 10) continue; // Fordgate
      if (Math.abs(x - 54) <= 4 && y < 10) continue; // North Gate
      if (Math.abs(y - 60) <= 4 && x > 100) continue; // East stub
      // Worked land stays tended.
      if (x >= 2 && x <= 23 && y >= 35 && y <= 49) continue; // fields
      if (x >= 69 && x <= 94 && y >= 1 && y <= 11) continue; // pasture
      if (x >= 14 && x <= 46 && y >= 68) continue; // the Commons' south yard
      const edge = Math.min(x, y, R.w - 1 - x, R.h - 1 - y);
      const density = edge < 3 ? 0.3 : edge < 7 ? 0.1 : 0;
      if (density > 0 && fordRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // ---------------------------------------------------------------
  // The animals — the town's working livestock (named lives come in
  // the people pass; the cows and hens are already fully themselves).
  // ---------------------------------------------------------------
  b.npcSpawn('cow', 82, 6.5, 2.5, 3);
  b.npcSpawn('chicken', 6.5, 57.2, 1.4, 3);

  // Respawn hearth for the eastern lowlands: the Round, beside the well.
  b.spawn(52.5, 44.5);
  return b.build();
}

/** Stable per-tile randomness so the town is identical every boot. */
function fordRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
