/**
 * THE STANDING COURSE's amphibious four (band 9d, E3; rulings R-D):
 * the tiles of the kit an author may write INTO WaterShallow — the
 * Sinter's ninth course and Drusa's cell on the Sett's wet floor, the
 * Course's last courses in the Drowned Meadow's sheet and the ford's
 * bank stones (9e). The client's WET_STANDERS (render/terrain.ts)
 * carries the same four; sett.test pins this list and
 * client/render/wetUnder.test pins that one, so neither drifts alone.
 */
import { Tile } from '@arx/shared';

export const WET_STANDERS_KIT: ReadonlySet<Tile> = new Set<Tile>([
  Tile.CourseWall,
  Tile.CourseStile,
  Tile.CorbelCell,
  Tile.PlumbStone,
]);
