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
import skralVillage from './defs/skral_village.json';
import ogreCamp from './defs/ogre_camp.json';
import hobgoblinWarcamp from './defs/hobgoblin_warcamp.json';
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
import ironRest from './defs/iron_rest.json';
import deadMuster from './defs/dead_muster.json';
import deadCloister from './defs/dead_cloister.json';
import deadKingsrow from './defs/dead_kingsrow.json';
import waystoneGlade from './defs/waystone_glade.json';
import sentinelArbor from './defs/sentinel_arbor.json';
import fallenLight from './defs/fallen_light.json';
import fellersCamp from './defs/fellers_camp.json';
import heartwoodDoor from './defs/heartwood_door.json';
// THE CONTESTED LANDS (docs/contested-lands-plan.md §13.2, band 0):
// the re-celled map's weight-0 variants — every one an EXISTING
// family (ONE ATLAS LAW: no new family value, ever).
import fensideLamp from './defs/fenside_lamp.json';
import ashlamp from './defs/ashlamp.json';
import forkWaystation from './defs/fork_waystation.json';
import thirdStoneRest from './defs/third_stone_rest.json';
import huskOfTheLine from './defs/husk_of_the_line.json';
import fellingDrum from './defs/felling_drum.json';
import legionPressed from './defs/legion_pressed.json';
import hobgoblinLegion from './defs/hobgoblin_legion.json';
import brokenBarrow from './defs/broken_barrow.json';

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
  // THE DROWNED VILLAGES (docs/skral-decor-plan.md): the banks'
  // landmark grounds — an entire fish-folk village at its work.
  // Weight-1 so wet country deals them organically; the curated ones
  // stand through AUTHORED_WILD_SITES at the plan's own waters.
  skralVillage,
  ogreCamp,
  // THE LEGION (docs/hobgoblin-plan.md): the hobgoblins' drilled
  // war-camps — square palisades where the goblin sprawls, sentries
  // that patrol, and a warlord seat the deep stages crown.
  hobgoblinWarcamp,
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
  // THE IRON REST: the kept yard — the graveyard kit's own ground
  // (docs/graveyard-kit-plan.md).
  ironRest,
  // THE EVERWOOD (the Evenfall epic): the old folk's wild grounds —
  // the family 'elf' joins the territory atlas here, and the far west
  // starts reading as somebody's country instead of nobody's.
  waystoneGlade,
  sentinelArbor,
  fallenLight,
  fellersCamp,
  heartwoodDoor,
  // THE CONTESTED LANDS (docs/contested-lands-plan.md §3, §13.2): the
  // ring's staged sites, all weight 0 and pinned or cell-forced by the
  // geography, all on families the atlas already knows. The Fenside
  // Lamp is the drowned crofts and the First Lamp as one scene; the
  // Ashlamp is a scar (no core); the fork rest and the Third Stone are
  // waystation variants with their own people; the husk, the Felling,
  // the Legion and the broken barrow are the honest smaller variants
  // of heavy families the frequency law keeps out of tier 2 as
  // themselves; the pressed camp is dealt, never rolled (rivalDef).
  // The `description` of each is PLAYER LORE (discoveryBanner shows
  // its first sentence) — the author notes stand here instead:
  //  - fenside_lamp: the drowned crofts + the First Lamp as ONE staged
  //    scene with Brede's bar (§3.1, §13.2); weight 0, pinned by the
  //    geography; one lamp, one ledger, one name. Hale trims the lamp
  //    (hale_lamp), Leif walks the road's edge (leif_walk).
  //  - ashlamp: a SCAR, not a camp (§3.1, §13.2) — no garrison, no
  //    haven, no strongbox; the tier is ignored, weight 0, a dressing
  //    patch the geography stamps, never rolled.
  //  - fork_waystation: fork_rest's def (§3.2, §3.3, §13.2); weight 0,
  //    pinned at the Thornveil fork.
  //  - third_stone_rest: §3.4, §13.2; weight 0, pinned on the Old
  //    Road. Aske's crew are ACTOR rows (company_blade, neutral, the
  //    reavers roster's own body), never a hostile garrison — a haven
  //    only zeroes the wild's danger field, it does not gate a
  //    garrison's aggro, and a garrison makes poiThreatens true. The
  //    plan's six-to-six road walk is a routine still owed.
  //  - husk_of_the_line: the watchtower_ruin's honest smaller variant
  //    (§3.2, §13.2); weight 0, family dead, tiers 2..4, pinned off
  //    the trail's end.
  //  - felling_drum: the goblin_warcamp's cell-forced weight-0
  //    variant (§3.2, §13.2) so the Drum stands on the first visit;
  //    rows wear tribe goblin so the veil's wolves fight its worgs.
  //    It carries NO rivalDef: a cell-forced site is in authoredCells
  //    and never stages up or deals a satellite (§1 law 2), so the
  //    field on it was dead. §13.2 wants the pressed camp dealt by the
  //    ROLLED neighbour Drum, i.e. rivalDef on goblin_warcamp itself,
  //    which is a world-wide change (every stage-2 warcamp would press
  //    for the Legion) and waits on the owner's word at band 8.
  //  - legion_pressed: weight 0, tiers 1..3, rows tribe legion; never
  //    rolled and never pinned — dealt only through rivalDef (unwired
  //    in band 0, see above).
  //  - hobgoblin_legion: tier 3 by canon and never nearer (§2, §3.5,
  //    §13.2); weight 0, pinned off every way; no ladder (authored
  //    cells deal no satellites) — its reach is an authored loop.
  //  - broken_barrow: one site, one prefab (§3.5, §13.2); weight 0,
  //    family dead, tiers 2..4, pinned on the Spoil Wold.
  //  - wardens_outpost: Hale is out of its pool (the First Lamp is his
  //    post) and a rolled outpost mints a name-free sergeant, so no
  //    second Hale ever stands (§3.1, §8).
  fensideLamp,
  ashlamp,
  forkWaystation,
  thirdStoneRest,
  huskOfTheLine,
  fellingDrum,
  legionPressed,
  hobgoblinLegion,
  brokenBarrow,
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
  errors.push(...rivalDefErrors(map));
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid POI defs:\n  ${errors.join('\n  ')}`);
  return map;
}

/**
 * THE PRESSED SATELLITE's cross-law (docs/contested-lands-plan.md §5
 * beat 8): a boldness.rivalDef must name a def in the roster, and
 * that def must be weight 0 — a rival is DEALT by its core, never
 * rolled by the dice, so a weighted rival would stand twice over.
 * Checked here because only the whole roster can answer it.
 */
export function rivalDefErrors(defs: ReadonlyMap<string, PoiDef>): string[] {
  const errors: string[] = [];
  for (const def of defs.values()) {
    const rival = def.boldness?.rivalDef;
    if (rival === undefined) continue;
    const target = defs.get(rival);
    if (!target) {
      errors.push(`${def.id}: boldness.rivalDef '${rival}' names no def in the roster`);
    } else if (target.weight !== 0) {
      errors.push(
        `${def.id}: boldness.rivalDef '${rival}' must be weight 0 (a rival is dealt, never rolled; it is ${target.weight})`,
      );
    }
  }
  return errors;
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
