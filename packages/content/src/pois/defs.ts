import type { PoiDef } from './types.js';
import { validatePoiDef } from './validate.js';

import banditCamp from './defs/bandit_camp.json';
import banditStockade from './defs/bandit_stockade.json';
import goblinWarhold from './defs/goblin_warhold.json';
import wolfkinGreatden from './defs/wolfkin_greatden.json';
import championsTor from './defs/champions_tor.json';
import forestRuin from './defs/forest_ruin.json';
import gnollSquat from './defs/gnoll_squat.json';
import skralShoal from './defs/skral_shoal.json';
import skralTidehold from './defs/skral_tidehold.json';
import ogreCamp from './defs/ogre_camp.json';
import goblinWarcamp from './defs/goblin_warcamp.json';
import koboldDigs from './defs/kobold_digs.json';
import lastLamp from './defs/last_lamp.json';
import companyTollhouse from './defs/company_tollhouse.json';
import peddlerRest from './defs/peddler_rest.json';
import raiderSquat from './defs/raider_squat.json';
import riftgateRuin from './defs/riftgate_ruin.json';
import roadToll from './defs/road_toll.json';
import roadsideHamlet from './defs/roadside_hamlet.json';
import wardensOutpost from './defs/wardens_outpost.json';
import hoargateWatch from './defs/hoargate_watch.json';
import timberPoachers from './defs/timber_poachers.json';
import fellBarrow from './defs/fell_barrow.json';
import barrowDiggers from './defs/barrow_diggers.json';
import watchtowerRuin from './defs/watchtower_ruin.json';
import wayshrine from './defs/wayshrine.json';
import waystation from './defs/waystation.json';
import wildGrove from './defs/wild_grove.json';
import wolfkinDen from './defs/wolfkin_den.json';
import lynxkinLair from './defs/lynxkin_lair.json';
import owlRoost from './defs/owl_roost.json';
import barrowfieldGreat from './defs/barrowfield_great.json';
import greatkeepRuin from './defs/greatkeep_ruin.json';
import goblinSprawl from './defs/goblin_sprawl.json';
import wolfkinKillfield from './defs/wolfkin_killfield.json';
import brigandWaystead from './defs/brigand_waystead.json';
import hewerGarrison from './defs/hewer_garrison.json';
import ashProcession from './defs/ash_procession.json';
import starfallCrater from './defs/starfall_crater.json';
import oldcrownGatehouse from './defs/oldcrown_gatehouse.json';
import goblinWarren from './defs/goblin_warren.json';
import goblinMootfield from './defs/goblin_mootfield.json';
import goblinGrubfarm from './defs/goblin_grubfarm.json';
import goblinWarstage from './defs/goblin_warstage.json';
import deadChapel from './defs/dead_chapel.json';
import deadMuster from './defs/dead_muster.json';
import deadCloister from './defs/dead_cloister.json';
import deadKingsrow from './defs/dead_kingsrow.json';
import waystoneGlade from './defs/waystone_glade.json';
import sentinelArbor from './defs/sentinel_arbor.json';
import fallenLight from './defs/fallen_light.json';
import fellersCamp from './defs/fellers_camp.json';
import heartwoodDoor from './defs/heartwood_door.json';

/**
 * Every authored POI archetype JSON, registered here. A def that isn't
 * listed doesn't exist — pois.test.ts walks the defs/ directory and
 * fails if a file is missing from this roster (the actors precedent),
 * so forgetting the import is a test failure, not a hole in the
 * frontier.
 */
const SOURCES: readonly unknown[] = [
  banditCamp,
  banditStockade,
  goblinWarhold,
  wolfkinGreatden,
  championsTor,
  forestRuin,
  gnollSquat,
  // THE SHORE CAMP (docs/skral-plan.md): the brine-folk's weir-camps —
  // the first def to carry the 'shore' flag; it only ever stands on a
  // bank the elevation field itself calls wet.
  skralShoal,
  // THE TIDEHOLD: the shoal's war-ground — the one compound hold that
  // must stand on a bank (court and promotion both honor the shore
  // probe; a landlocked region keeps goblin holds instead).
  skralTidehold,
  ogreCamp,
  goblinWarcamp,
  koboldDigs,
  lastLamp,
  companyTollhouse,
  peddlerRest,
  raiderSquat,
  riftgateRuin,
  roadToll,
  roadsideHamlet,
  wardensOutpost,
  watchtowerRuin,
  wayshrine,
  waystation,
  hoargateWatch,
  timberPoachers,
  fellBarrow,
  barrowDiggers,
  wildGrove,
  wolfkinDen,
  lynxkinLair,
  owlRoost,
  // THE LANDMARKS (the hybrid charter): expansive authored grounds.
  barrowfieldGreat,
  greatkeepRuin,
  goblinSprawl,
  wolfkinKillfield,
  brigandWaystead,
  // THE MARCH (the Kingsdelf epic): the Overband's own grounds — the
  // waking quarry declares family 'golem' (the earth epic's deferred
  // territory), and the Ashen Court walks the old roads by night.
  hewerGarrison,
  ashProcession,
  starfallCrater,
  oldcrownGatehouse,
  // THE PEOPLED LANDMARKS: the goblin and dead landmark libraries —
  // module-built grounds with posts and walked rounds.
  goblinWarren,
  goblinMootfield,
  goblinGrubfarm,
  goblinWarstage,
  deadChapel,
  deadMuster,
  deadCloister,
  deadKingsrow,
  // THE EVERWOOD (the Evenfall epic): the old folk's wild grounds —
  // the family 'elf' joins the territory atlas here, and the far west
  // starts reading as somebody's country instead of nobody's.
  waystoneGlade,
  sentinelArbor,
  fallenLight,
  fellersCamp,
  heartwoodDoor,
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
