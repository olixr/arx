import { dialogueDoneFlag, type DialogueDef } from './types.js';
import { validateDialogue } from './validate.js';

import coppinReeve from './defs/coppin_reeve.json';
import ninebrassStall from './defs/ninebrass_stall.json';
import skarnLine from './defs/skarn_line.json';
import vargaScales from './defs/varga_scales.json';
import ballaForge from './defs/balla_forge.json';
import grettirYard from './defs/grettir_yard.json';
import ivoGreenstair from './defs/ivo_greenstair.json';
import kestrelChapter from './defs/kestrel_chapter.json';
import marenHold from './defs/maren_hold.json';
import odeleVaults from './defs/odele_vaults.json';
import osaYard from './defs/osa_yard.json';
import ottilieLoom from './defs/ottilie_loom.json';
import petraSeal from './defs/petra_seal.json';
import sellaShrine from './defs/sella_shrine.json';
import signyMess from './defs/signy_mess.json';
import solveiArcanum from './defs/solvei_arcanum.json';
import wynRemedies from './defs/wyn_remedies.json';
import halvardCourt from './defs/halvard_court.json';
import eiraMere from './defs/eira_mere.json';
import kollPour from './defs/koll_pour.json';
import runaScales from './defs/runa_scales.json';
import stigGrain from './defs/stig_grain.json';
import dagnyHoops from './defs/dagny_hoops.json';
import hakiFlight from './defs/haki_flight.json';
import vigdisSetting from './defs/vigdis_setting.json';
import toveCharts from './defs/tove_charts.json';
import ragnaFlagon from './defs/ragna_flagon.json';
import mabRookery from './defs/mab_rookery.json';
import calderCounter from './defs/calder_counter.json';
import aldisGate from './defs/aldis_gate.json';
import aldisWatchHeeded from './defs/aldis_watch_heeded.json';
import aldisWatchWry from './defs/aldis_watch_wry.json';
import anselHall from './defs/ansel_hall.json';
import anselRegistry from './defs/ansel_registry.json';
import anselTollwar from './defs/ansel_tollwar.json';
import brettaForge from './defs/bretta_forge.json';
import brettaDelf from './defs/bretta_delf.json';
import brettaMountain from './defs/bretta_mountain.json';
import cormundLedger from './defs/cormund_ledger.json';
import dunnaHearthfire from './defs/dunna_hearthfire.json';
import dunnaRest from './defs/dunna_rest.json';
import elowenFolios from './defs/elowen_folios.json';
import gartonFlour from './defs/garton_flour.json';
import haskRoadgear from './defs/hask_roadgear.json';
import jorelFields from './defs/jorel_fields.json';
import merraMarket from './defs/merra_market.json';
import nibStreets from './defs/nib_streets.json';
import peldCrossing from './defs/peld_crossing.json';
import perlOrchard from './defs/perl_orchard.json';
import tamsinCoop from './defs/tamsin_coop.json';
import tiloPatterns from './defs/tilo_patterns.json';
import brynArms from './defs/bryn_arms.json';
import brynYard from './defs/bryn_yard.json';
import fenBench from './defs/fen_bench.json';
import hobbFarm from './defs/hobb_farm.json';
import ionaFireside from './defs/iona_fireside.json';
import ionaHearth from './defs/iona_hearth.json';
import rowanAwakening from './defs/rowan_awakening.json';
import rowanGreen from './defs/rowan_green.json';
import wayfarerCamp from './defs/wayfarer_camp.json';
import waywardRoad from './defs/wayward_road.json';

/**
 * Every authored dialogue JSON, registered here. A def that isn't
 * listed doesn't exist — dialogues.test.ts walks the defs/ directory
 * and fails if a file is missing from this roster.
 */
const SOURCES: readonly unknown[] = [
  coppinReeve,
  ninebrassStall,
  skarnLine,
  vargaScales,
  ballaForge,
  grettirYard,
  ivoGreenstair,
  kestrelChapter,
  marenHold,
  odeleVaults,
  osaYard,
  ottilieLoom,
  petraSeal,
  sellaShrine,
  signyMess,
  solveiArcanum,
  wynRemedies,
  halvardCourt,
  eiraMere,
  kollPour,
  runaScales,
  stigGrain,
  dagnyHoops,
  hakiFlight,
  vigdisSetting,
  toveCharts,
  ragnaFlagon,
  mabRookery,
  calderCounter,
  aldisGate,
  aldisWatchHeeded,
  aldisWatchWry,
  anselHall,
  anselRegistry,
  anselTollwar,
  brettaForge,
  brettaDelf,
  brettaMountain,
  cormundLedger,
  dunnaHearthfire,
  dunnaRest,
  elowenFolios,
  gartonFlour,
  haskRoadgear,
  jorelFields,
  merraMarket,
  nibStreets,
  peldCrossing,
  perlOrchard,
  tamsinCoop,
  tiloPatterns,
  brynArms,
  brynYard,
  fenBench,
  hobbFarm,
  ionaFireside,
  ionaHearth,
  rowanAwakening,
  rowanGreen,
  wayfarerCamp,
  waywardRoad,
];

function buildRegistry(): ReadonlyMap<string, DialogueDef> {
  const map = new Map<string, DialogueDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateDialogue(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.dialogue.id)) errors.push(`${res.dialogue.id}: duplicate dialogue id`);
    else map.set(res.dialogue.id, res.dialogue);
  }
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid dialogue defs:\n  ${errors.join('\n  ')}`);
  return map;
}

export const DIALOGUES: ReadonlyMap<string, DialogueDef> = buildRegistry();

export function dialogue(id: string): DialogueDef | undefined {
  return DIALOGUES.get(id);
}

/** Is this def offerable to a player whose flags answer through `has`? */
export function dialogueEligible(def: DialogueDef, has: (flag: string) => boolean): boolean {
  if (def.once && has(dialogueDoneFlag(def.id))) return false;
  if (def.requires?.some((f) => !has(f))) return false;
  if (def.forbids?.some((f) => has(f))) return false;
  return true;
}

/**
 * One target's menu entry: a bound tree and the priority its binding
 * carries THERE (the same tree may be a headline on one target and a
 * fallback on another).
 */
export interface DialogueOffer {
  def: DialogueDef;
  priority: number;
}

/**
 * The voice a target answers with: the highest-priority eligible
 * offer (ties broken by id, so the pick is deterministic). PURE — the
 * server calls this with its DB-loaded bindings and each player's
 * flag set, and dev tools can preview "what would they say?" with any
 * flags at all.
 */
export function pickDialogue(
  offers: readonly DialogueOffer[],
  has: (flag: string) => boolean,
): DialogueDef | null {
  let best: DialogueOffer | null = null;
  for (const offer of offers) {
    if (!dialogueEligible(offer.def, has)) continue;
    if (
      !best ||
      offer.priority > best.priority ||
      (offer.priority === best.priority && offer.def.id < best.def.id)
    ) {
      best = offer;
    }
  }
  return best?.def ?? null;
}
