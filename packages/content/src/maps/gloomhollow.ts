import { Tile } from '@devcraft/shared';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Gloomhollow Cave — the first authored dungeon. Entered from the rocks
 * north-east of Bramblewick's plaza. A winding cave of skeletons ending
 * at a delve portal that opens a personal procedural dungeon.
 *
 * Lives at y=1024 in the dark band: everything around it generates as
 * solid cave wall, so the cave never bleeds into grass.
 */
export const GLOOMHOLLOW_ENTRY = { x: 16.5, y: 1030.5 };

export function buildGloomhollow(): ZoneDef {
  const b = new ZoneBuilder('gloomhollow', 'Gloomhollow Cave', { x: 0, y: 1024 }, 64, 64, Tile.CaveWall);

  // Entry hall.
  b.fillRect(12, 4, 10, 6, Tile.CaveFloor);
  // Winding passages and chambers.
  b.fillRect(16, 10, 3, 8, Tile.CaveFloor); // south corridor
  b.fillRect(10, 18, 16, 8, Tile.CaveFloor); // great chamber
  b.fillRect(26, 20, 10, 3, Tile.CaveFloor); // east passage
  b.fillRect(36, 16, 10, 12, Tile.CaveFloor); // bone pit
  b.fillRect(14, 26, 3, 10, Tile.CaveFloor); // south corridor 2
  b.fillRect(8, 36, 18, 10, Tile.CaveFloor); // flooded hollow
  b.fillRect(26, 40, 14, 3, Tile.CaveFloor); // deep passage
  b.fillRect(40, 36, 12, 12, Tile.CaveFloor); // delve chamber

  // A vein of iron and copper for brave miners.
  b.set(11, 19, Tile.RockIron);
  b.set(12, 25, Tile.RockCopper);
  b.set(37, 17, Tile.RockIron);

  // A dark pool in the flooded hollow.
  b.fillEllipse(13, 41, 3, 2, Tile.Water);

  // Way out, back beside the cave mouth in town.
  b.portal(16, 5, Tile.PortalUp, { x: 59.5, y: 34.8 });
  // The delve: a personal procedural dungeon.
  b.portal(46, 42, Tile.PortalDown, 'delve');

  // The dead do not rest here.
  b.npcSpawn('skeleton', 18, 22, 5, 3);
  b.npcSpawn('skeleton', 40, 22, 4, 3);
  b.npcSpawn('skeleton', 16, 40, 5, 3);
  b.npcSpawn('skeleton', 33, 41, 3, 2);

  return b.build();
}
