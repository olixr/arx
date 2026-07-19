import { Tile } from '@devcraft/shared';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * The Hollow Stair — the showcase of SIGNED elevation: a grassy shelf
 * in the wilds east of Bramblewick where the land steps DOWN instead of
 * up. A sheltered dell (level −1) sinks out of the meadow, and at its
 * heart a quarry core (level −2) drops again; on the quarry floor waits
 * a delve mouth. Descend twice before you find the dungeon entrance.
 *
 * Both flights face south (the camera-facing straight-edge rule, same
 * as worldgen), and build() grows the cliff fence around each ring
 * automatically. Worldgen suppresses procedural basins around this
 * site (see basinFieldAt) so the authored rims never fight a procgen
 * sink lapping the zone border.
 *
 * Deliberately small and NOT chunk-aligned: it also exercises the
 * arbitrary-rect zone overlay.
 */
export function buildHollowStair(): ZoneDef {
  const b = new ZoneBuilder('hollowstair', 'The Hollow Stair', { x: 120, y: 8 }, 24, 24, Tile.Grass);

  // The dell, then the quarry core nested inside it — each sink ring
  // gets its own auto-fence and its own stair.
  b.sink(4, 8, 16, 13, 1);
  b.sink(8, 12, 8, 6, 2);

  // One flight per level, both south-descending: off the meadow into
  // the dell, then off the dell floor into the quarry.
  b.stairs(11, 7);
  b.stairs(11, 11);

  // The quarry floor is worked stone with the seams the diggers left.
  b.fillRect(8, 12, 8, 6, Tile.StoneFloor);
  b.set(9, 16, Tile.RockIron);
  b.set(14, 13, Tile.RockCopper);
  b.set(13, 16, Tile.RockCoal);

  // Whoever cut this place left in a hurry.
  b.set(9, 13, Tile.Barrel);
  b.set(15, 17, Tile.Crate);
  b.set(5, 9, Tile.Rock);
  b.set(18, 19, Tile.GrassTall);
  b.set(6, 18, Tile.GrassTall);

  // The delve mouth on the quarry floor: the dungeon under the dig.
  b.portal(12, 14, Tile.PortalDown, 'delve');

  // A spawn anchors the reachability validation (both floors must be
  // walkable from here via the stairs). The WORLD spawn stays in
  // Bramblewick — WorldSource takes the first zone that declares one.
  b.spawn(11, 3);

  return b.build();
}
