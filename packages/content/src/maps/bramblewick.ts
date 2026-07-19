import { Detail, Tile } from '@devcraft/shared';
import { ZoneBuilder } from './builder.js';
import { GLOOMHOLLOW_ENTRY } from './gloomhollow.js';
import type { ZoneDef } from './types.js';

/**
 * Bramblewick — the starter town. 96x96 tiles (3x3 chunks) centered on
 * the world origin region. A stone plaza with a well, ringed by the
 * bank, general store, smithy, inn, and houses, with paths running out
 * to the wilderness on all four sides.
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
  b.building(34, 24, 12, 9, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 's', at: 6 }],
    windows: [{ side: 's', at: 3 }, { side: 's', at: 9 }, { side: 'e', at: 4 }],
  });
  b.path({ x: 40, y: 33 }, { x: 40, y: 43 }, 1);

  // General store — east.
  b.building(62, 42, 10, 8, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'w', at: 4 }],
    windows: [{ side: 'w', at: 2 }, { side: 's', at: 3 }, { side: 's', at: 6 }],
  });

  // Smithy — south-east of plaza, with a dirt work-yard.
  b.fillRect(58, 58, 12, 8, Tile.Dirt);
  b.building(60, 58, 9, 7, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 4 }, { side: 'w', at: 3 }],
    windows: [{ side: 's', at: 2 }, { side: 's', at: 6 }],
  });

  // The Gilded Antler inn — south of the west road, doors facing it.
  b.building(22, 52, 14, 12, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 6 }, { side: 'n', at: 7 }],
    windows: [
      { side: 'n', at: 3 },
      { side: 'n', at: 10 },
      { side: 's', at: 4 },
      { side: 's', at: 9 },
    ],
  });

  // Houses — north-east and south-west.
  b.building(60, 28, 8, 7, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 3 }],
    windows: [{ side: 's', at: 5 }],
  });
  b.building(32, 66, 8, 7, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 4 }],
    windows: [{ side: 'n', at: 2 }, { side: 's', at: 4 }],
  });
  b.building(41, 63, 7, 6, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 3 }],
    windows: [{ side: 'n', at: 1 }, { side: 's', at: 3 }],
  });

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

/** Stable per-tile randomness so the town is identical every boot. */
function townRng(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
