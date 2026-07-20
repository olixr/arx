import { Detail, Tile } from '@devcraft/shared';
import { CHAPEL, COTTAGE_SMALL, INN_LARGE, MARKET_STALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import { GLOOMHOLLOW_ENTRY } from './gloomhollow.js';
import type { ZoneDef } from './types.js';

/**
 * Bramblewick — the starter town. 96x96 tiles (3x3 chunks) centered on
 * the world origin region. A stone plaza with a well, ringed by the
 * bank, general store, smithy, inn, houses, and a chapel on the rise,
 * with paths running out to the wilderness on all four sides.
 *
 * Anchors that must NOT move (server/NPC/test dependencies): spawn,
 * the portal at (59,33) with its rock frame, the crossroads geometry,
 * the farm pen + gate, pond/jetty/fishing spots, the mining outcrop,
 * the oak stand, the edge forest, the plaza arches/pillars, and the
 * five town stations + campfire.
 */
export function buildBramblewick(): ZoneDef {
  const b = new ZoneBuilder('bramblewick', 'Bramblewick', { x: 0, y: 0 }, 96, 96, Tile.Grass);

  // Roads: crossroads through the plaza, out to every edge.
  b.path({ x: 0, y: 48 }, { x: 48, y: 48 }, 3);
  b.path({ x: 48, y: 48 }, { x: 95, y: 48 }, 3);
  b.path({ x: 48, y: 0 }, { x: 48, y: 48 }, 3);
  b.path({ x: 48, y: 48 }, { x: 48, y: 95 }, 3);

  // Central plaza with a stone well.
  b.fillEllipse(48, 48, 9, 7, Tile.StoneFloor);
  b.fillRect(47, 47, 2, 2, Tile.WallStone); // the well

  // Bank — stone, north-west of the plaza (clear of the north road).
  // Inside: a teller counter fronts the chest with a walk-through gap
  // on the door axis, the vault sits against the north wall beside
  // the ledger shelves, and a rug aisle leads in.
  b.building(34, 24, 12, 9, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 's', at: 6 }],
    windows: [{ side: 's', at: 3 }, { side: 's', at: 9 }, { side: 'e', at: 4 }],
  });
  b.set(36, 25, Tile.Bookshelf).set(37, 25, Tile.Bookshelf); // ledgers
  b.set(44, 25, Tile.Vault);
  b.set(38, 28, Tile.Counter).set(39, 28, Tile.Counter);
  b.set(41, 28, Tile.Counter).set(42, 28, Tile.Counter); // gap at x40 = teller pass
  b.setDetail(40, 29, Detail.Rug).setDetail(40, 30, Detail.Rug).setDetail(40, 31, Detail.Rug);
  // Pillar pair flanking the door outside — a bank should look like money.
  b.set(39, 33, Tile.PillarStone).set(41, 33, Tile.PillarStone);
  b.path({ x: 40, y: 33 }, { x: 40, y: 43 }, 1);

  // General store — east, west door facing the plaza. The Counter
  // run extends the ShopCounter station into one service bar; the
  // teller row stays reachable around its east end.
  b.building(62, 42, 10, 8, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'w', at: 4 }],
    windows: [{ side: 'w', at: 2 }, { side: 's', at: 3 }, { side: 's', at: 6 }],
  });
  b.set(67, 43, Tile.Bookshelf).set(68, 43, Tile.Cabinet); // stock wall
  b.set(63, 44, Tile.Counter).set(64, 44, Tile.Counter);
  b.set(63, 47, Tile.CrateGoods);
  b.set(70, 48, Tile.Barrel);
  // Street front: shingle sign + delivery clutter beside (never
  // blocking) the west door at (62,46).
  b.set(61, 44, Tile.HangingSign);
  b.set(61, 45, Tile.CrateGoods);
  b.set(60, 45, Tile.Barrel);

  // Smithy — south-east of plaza, with a dirt work-yard.
  b.fillRect(58, 58, 12, 8, Tile.Dirt);
  b.building(60, 58, 9, 7, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 4 }, { side: 'w', at: 3 }],
    windows: [{ side: 's', at: 2 }, { side: 's', at: 6 }],
  });
  b.set(61, 59, Tile.ToolRack).set(67, 59, Tile.WeaponRack);
  b.set(61, 62, Tile.Basin);
  b.setDetail(63, 60, Detail.Sawdust).setDetail(64, 61, Detail.Sawdust);
  b.setDetail(65, 62, Detail.Sawdust);
  // Yard clutter on the dirt, clear of both doors.
  b.set(58, 59, Tile.Barrel).set(58, 63, Tile.Crate);
  b.set(69, 60, Tile.Barrel).set(67, 65, Tile.Crate);

  // The Gilded Antler inn — the inn template: paired north doors on
  // the road, hearth on the west wall, table clusters, the bar, beds
  // at the east end.
  b.stamp(INN_LARGE, 22, 52);
  b.set(26, 51, Tile.HangingSign);
  b.set(25, 51, Tile.FlowerBox).set(32, 51, Tile.FlowerBox); // under the windows

  // Houses — cottage stamps. The template presents its door south
  // (flipX-only law: no rotation), so the two south-side sites that
  // front the town from the north get their door re-cut northward.
  // The NE house sits one tile east of the old footprint so its wall
  // never touches the portal's rock frame at (60,33).
  b.stamp(COTTAGE_SMALL, 61, 28);
  b.set(63, 34, Tile.FlowerBox).set(65, 34, Tile.FlowerBox);
  b.stamp(COTTAGE_SMALL, 32, 66, { flipX: true });
  recutCottageDoorNorth(b, 32, 66);
  b.set(33, 65, Tile.FlowerBox).set(37, 65, Tile.FlowerBox);
  b.stamp(COTTAGE_SMALL, 40, 63);
  recutCottageDoorNorth(b, 40, 63);
  b.set(41, 62, Tile.FlowerBox).set(45, 62, Tile.FlowerBox);

  // Chapel — on the rise north-east of town, past the mine road.
  b.stamp(CHAPEL, 70, 16);

  // Plaza dressing: a bench pair by the well, market stalls along the
  // east edge (clear of the east road rows 47-49 and the pillar
  // pairs), and a banner pole at each road mouth just outside the
  // plaza — never on the 3-wide road itself.
  b.set(45, 45, Tile.Bench).set(46, 45, Tile.Bench);
  b.stamp(MARKET_STALL, 55, 43);
  b.stamp(MARKET_STALL, 55, 51);
  b.set(50, 40, Tile.BannerPole); // north mouth
  b.set(46, 56, Tile.BannerPole); // south mouth
  b.set(59, 46, Tile.BannerPole); // east mouth
  b.set(37, 50, Tile.BannerPole); // west mouth

  // Plaza gateways: walk-through arch runs over the north and south
  // road mouths, and pillar pairs framing the east and west entries —
  // the town centre reads as built civic space, not painted ground.
  for (const ax of [47, 48, 49]) {
    b.set(ax, 41, Tile.ArchStone);
    b.set(ax, 55, Tile.ArchStone);
  }
  b.set(39, 46, Tile.PillarStone);
  b.set(39, 50, Tile.PillarStone);
  b.set(57, 46, Tile.PillarStone);
  b.set(57, 50, Tile.PillarStone);

  // Stations: furnace + anvil in the smithy, workbench + counter in the
  // store, chest in the bank, campfire by the plaza's south road.
  b.set(66, 60, Tile.Furnace);
  b.set(62, 60, Tile.Anvil);
  b.set(68, 44, Tile.Workbench);
  b.set(65, 44, Tile.ShopCounter);
  b.set(40, 26, Tile.BankChest);
  b.set(53, 57, Tile.Campfire);

  // Crafters' yard — the trades row between the store and the smithy:
  // tanning rack, loom, and carving bench on a packed-dirt pad, with
  // the herbalist's alembic at its east end. Every trade is taught in
  // town; the wilderness only ever asks you to rebuild what you've seen.
  b.fillRect(62, 52, 9, 5, Tile.Dirt);
  b.set(63, 53, Tile.TanningRack);
  b.set(66, 53, Tile.Loom);
  b.set(69, 53, Tile.CarvingBench);
  b.set(66, 55, Tile.Alembic);
  b.set(62, 55, Tile.Barrel).set(70, 55, Tile.Crate);

  // The Arcanum — the enchanter's stone-floored study nook east of the
  // crafters' yard: enchanting table flanked by a bookshelf wall and a
  // reading lectern. High magic lives one polite step off the dirt.
  b.fillRect(72, 52, 4, 4, Tile.StoneFloor);
  b.set(72, 52, Tile.Bookshelf).set(73, 52, Tile.Bookshelf).set(74, 52, Tile.Bookshelf);
  b.set(73, 54, Tile.EnchantingTable);
  b.set(75, 54, Tile.Lectern);
  b.set(72, 55, Tile.FlowerBox);

  // Lamp posts: plaza corners + the bank path and the inn's road door.
  // After dark these carry the town — warm pools against the night.
  b.set(43, 44, Tile.LampPost);
  b.set(54, 44, Tile.LampPost);
  b.set(43, 53, Tile.LampPost);
  b.set(54, 53, Tile.LampPost);
  b.set(39, 35, Tile.LampPost);
  b.set(36, 51, Tile.LampPost);

  // Pond in the south-east corner, sand-rimmed, with a fishing jetty.
  b.fillEllipse(78, 78, 10, 8, Tile.Sand);
  b.fillEllipse(78, 78, 8, 6, Tile.Water);
  b.fillEllipse(78, 78, 5, 3, Tile.WaterDeep);
  b.fillRect(77, 70, 2, 4, Tile.Bridge);
  // Railings flanking the jetty planks.
  for (let ry = 71; ry <= 73; ry++) {
    b.set(76, ry, Tile.RailWood);
    b.set(79, ry, Tile.RailWood);
  }

  // Farm plots behind the inn, fenced.
  b.fillRect(14, 24, 12, 10, Tile.Dirt);
  b.outlineRect(13, 23, 14, 12, Tile.Fence);
  b.set(20, 34, Tile.Dirt); // gate

  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.03);
  b.scatterDetail(Detail.Tuft, 0.06);

  // Edge forest ring (hand-placed feel: denser at the rim).
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
      const edge = Math.min(x, y, 95 - x, 95 - y);
      if (b.get(x, y) !== Tile.Grass && b.get(x, y) !== Tile.GrassTall) continue;
      // Leave the road mouths open.
      if (Math.abs(x - 48) <= 3 || Math.abs(y - 48) <= 3) continue;
      const density = edge < 4 ? 0.35 : edge < 10 ? 0.12 : 0.015;
      if (townRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }

  // Mining outcrop north-east of the plaza + ore by the smithy yard.
  // Copper AND tin together — bronze needs both, so the starter mine
  // teaches the pairing.
  b.set(56, 36, Tile.RockCopper);
  b.set(57, 36, Tile.RockCopper);
  b.set(56, 37, Tile.RockIron);
  b.set(58, 36, Tile.RockTin);
  b.set(58, 37, Tile.RockTin);
  b.set(59, 35, Tile.Rock);

  // The mouth of Gloomhollow Cave, framed in rock.
  b.set(58, 33, Tile.Rock);
  b.set(60, 33, Tile.Rock);
  b.portal(59, 33, Tile.PortalDown, GLOOMHOLLOW_ENTRY);
  b.set(38, 56, Tile.Rock);
  b.set(59, 64, Tile.RockCopper);

  // Fishing spots along the pond's edge.
  b.set(76, 73, Tile.FishingSpot);
  b.set(80, 73, Tile.FishingSpot);
  b.set(75, 83, Tile.FishingSpot);

  // A stand of oaks near the west road.
  b.set(18, 44, Tile.TreeOak);
  b.set(19, 45, Tile.TreeOak);
  b.set(17, 46, Tile.TreeOak);

  b.spawn(48.5, 52.5);
  return b.build();
}

/**
 * The cottage template's door is on the south face and templates never
 * rotate (the renderer presents south faces), so sites fronting the
 * town from the north get the door re-cut: north wall opened over the
 * door axis, the south doorway healed into a window, and the doormat
 * moved to the new door's interior neighbour.
 */
function recutCottageDoorNorth(b: ZoneBuilder, x: number, y: number): void {
  b.set(x + 3, y, Tile.DoorwayWood);
  b.set(x + 3, y + 5, Tile.WallWoodWindow);
  b.setDetail(x + 3, y + 4, Detail.None);
  b.setDetail(x + 3, y + 1, Detail.Doormat);
}

/** Stable per-tile randomness so the town is identical every boot. */
function townRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
