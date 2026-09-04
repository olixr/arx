/**
 * THE PROP HALL's registry — every family roster folded into one
 * tile-keyed map. A tile registered twice is a build-time defect, not
 * a silent override.
 */
import type { Tile } from '@arx/shared';
import { WAR_CAMP_PROPS } from './warCamp.js';
import { ELVEN_PROPS } from './elven.js';
import { DUNGEON_PROPS } from './dungeon.js';
import { GRAVEYARD_PROPS } from './graveyard.js';
import { SKRAL_PROPS } from './skral.js';
import { TOWN_PROPS } from './town.js';
import { STREET_PROPS } from './street.js';
import { HOUSE_PROPS } from './house.js';
import { FARM_PROPS } from './farm.js';
import { STATIONS_PROPS } from './stations.js';
import { SCARRED_PROPS } from './scarred/index.js';
import type { PropPainter } from './types.js';

export const PROP_PAINTERS: ReadonlyMap<Tile, PropPainter> = (() => {
  const m = new Map<Tile, PropPainter>();
  for (const roster of [WAR_CAMP_PROPS, ELVEN_PROPS, DUNGEON_PROPS, GRAVEYARD_PROPS, SKRAL_PROPS, TOWN_PROPS, STREET_PROPS, HOUSE_PROPS, FARM_PROPS, STATIONS_PROPS, SCARRED_PROPS]) {
    for (const [tiles, painter] of roster) {
      for (const t of tiles) {
        if (m.has(t)) throw new Error(`prop painter registered twice for tile ${t}`);
        m.set(t, painter);
      }
    }
  }
  return m;
})();
