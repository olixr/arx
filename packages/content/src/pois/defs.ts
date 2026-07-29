import type { PoiDef } from './types.js';
import { validatePoiDef } from './validate.js';

import banditCamp from './defs/bandit_camp.json';
import championsTor from './defs/champions_tor.json';
import forestRuin from './defs/forest_ruin.json';
import goblinWarcamp from './defs/goblin_warcamp.json';
import koboldDigs from './defs/kobold_digs.json';
import lastLamp from './defs/last_lamp.json';
import riftgateRuin from './defs/riftgate_ruin.json';
import roadToll from './defs/road_toll.json';
import roadsideHamlet from './defs/roadside_hamlet.json';
import wardensOutpost from './defs/wardens_outpost.json';
import watchtowerRuin from './defs/watchtower_ruin.json';
import wayshrine from './defs/wayshrine.json';
import waystation from './defs/waystation.json';
import wildGrove from './defs/wild_grove.json';
import wolfkinDen from './defs/wolfkin_den.json';

/**
 * Every authored POI archetype JSON, registered here. A def that isn't
 * listed doesn't exist — pois.test.ts walks the defs/ directory and
 * fails if a file is missing from this roster (the actors precedent),
 * so forgetting the import is a test failure, not a hole in the
 * frontier.
 */
const SOURCES: readonly unknown[] = [
  banditCamp,
  championsTor,
  forestRuin,
  goblinWarcamp,
  koboldDigs,
  lastLamp,
  riftgateRuin,
  roadToll,
  roadsideHamlet,
  wardensOutpost,
  watchtowerRuin,
  wayshrine,
  waystation,
  wildGrove,
  wolfkinDen,
];

function buildRegistry(): ReadonlyMap<string, PoiDef> {
  const map = new Map<string, PoiDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validatePoiDef(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.def.id)) errors.push(`${res.def.id}: duplicate poi id`);
    else map.set(res.def.id, res.def);
  }
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid POI defs:\n  ${errors.join('\n  ')}`);
  return map;
}

/**
 * The LIVE archetype registry — every runtime consumer resolves
 * through .get()/.values() at call time (the live-registry law), so
 * replacePoiDefs applies edits to the very next cell decision.
 */
export const POI_DEFS: ReadonlyMap<string, PoiDef> = buildRegistry();

/** The authored roster exactly as shipped — the CMS revert target. */
export const AUTHORED_POI_DEFS: ReadonlyMap<string, PoiDef> = buildRegistry();

export function poiDef(id: string): PoiDef | undefined {
  return POI_DEFS.get(id);
}

/**
 * THE CMS HOOK: repopulate the live registry in place. Cells already
 * standing keep their materialized zones until the server retires
 * them (reloadPoiDef hurries that along); every future decision and
 * composition reads the new truth immediately. Only ever runs against
 * validated DB-loaded docs.
 */
export function replacePoiDefs(next: Iterable<PoiDef>): void {
  const map = POI_DEFS as Map<string, PoiDef>;
  map.clear();
  for (const def of next) map.set(def.id, def);
}
