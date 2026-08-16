import type { AppearanceData } from '@arx/shared';
import { NPCS, scaleNpcDef, type NpcDef } from '../npcs.js';
import type { NpcActorDef } from './types.js';
import { validateNpcActor } from './validate.js';

import brokerVarga from './defs/broker_varga.json';
import curioNinebrass from './defs/curio_ninebrass.json';
import reeveCoppin from './defs/reeve_coppin.json';
import veteranSkarn from './defs/veteran_skarn.json';
import bursarOdele from './defs/bursar_odele.json';
import cookSigny from './defs/cook_signy.json';
import enchantressSolvei from './defs/enchantress_solvei.json';
import foremanGrettir from './defs/foreman_grettir.json';
import forgemistressBalla from './defs/forgemistress_balla.json';
import galleriaTrader from './defs/galleria_trader.json';
import gardenerIvo from './defs/gardener_ivo.json';
import gateMonger from './defs/gate_monger.json';
import herbalistWyn from './defs/herbalist_wyn.json';
import hostlerOsa from './defs/hostler_osa.json';
import outriderHaldis from './defs/outrider_haldis.json';
import outriderJoss from './defs/outrider_joss.json';
import marshalKestrel from './defs/marshal_kestrel.json';
import masonPetra from './defs/mason_petra.json';
import shrinekeeperSella from './defs/shrinekeeper_sella.json';
import silverfallWatch from './defs/silverfall_watch.json';
import wardenMaren from './defs/warden_maren.json';
import weaverOttilie from './defs/weaver_ottilie.json';
import kingAeriex from './defs/king_aeriex.json';
import queenKayri from './defs/queen_kayri.json';
import castleGuard from './defs/castle_guard.json';
import castleServant from './defs/castle_servant.json';
import captainRavna from './defs/captain_ravna.json';
import tallymanBrusk from './defs/tallyman_brusk.json';
import quartermasterYeva from './defs/quartermaster_yeva.json';
import companyBlade from './defs/company_blade.json';
import companyRunner from './defs/company_runner.json';
import drillmasterJorunn from './defs/drillmaster_jorunn.json';
import stewardAnsgar from './defs/steward_ansgar.json';
import heraldOssian from './defs/herald_ossian.json';
import smeltmasterKoll from './defs/smeltmaster_koll.json';
import assayerRuna from './defs/assayer_runa.json';
import carpenterStig from './defs/carpenter_stig.json';
import cooperDagny from './defs/cooper_dagny.json';
import fletcherHaki from './defs/fletcher_haki.json';
import silversmithVigdis from './defs/silversmith_vigdis.json';
import scrivenerTove from './defs/scrivener_tove.json';
import innkeepRagna from './defs/innkeep_ragna.json';
import magpieMab from './defs/magpie_mab.json';
import fenceCalder from './defs/fence_calder.json';
import lookoutPike from './defs/lookout_pike.json';
// Factions Phase 4 (docs/factions-plan.md): the Red Company's toll
// seat on the High Road's first climb — the tongue and his counters.
import companyBroker from './defs/company_broker.json';
import companyTollGuard from './defs/company_toll_guard.json';
import bankerCormund from './defs/banker_cormund.json';
import captainAldis from './defs/captain_aldis.json';
import amberfordWatch from './defs/amberford_watch.json';
import courierNib from './defs/courier_nib.json';
import crofterBeck from './defs/crofter_beck.json';
import crofterHolt from './defs/crofter_holt.json';
import crofterMaida from './defs/crofter_maida.json';
import crofterTam from './defs/crofter_tam.json';
import dawnmeadWard from './defs/dawnmead_ward.json';
import keeperWren from './defs/keeper_wren.json';
import yardmasterHalla from './defs/yardmaster_halla.json';
import fletcherRill from './defs/fletcher_rill.json';
import sparkwrightVarn from './defs/sparkwright_varn.json';
import foresterAlder from './defs/forester_alder.json';
import cookBerrit from './defs/cook_berrit.json';
import wrightOttery from './defs/wright_ottery.json';
import innkeepGilly from './defs/innkeep_gilly.json';
import anglerWeir from './defs/angler_weir.json';
import farmerBrammel from './defs/farmer_brammel.json';
import droverSorrel from './defs/drover_sorrel.json';
import twinTansy from './defs/twin_tansy.json';
import twinWick from './defs/twin_wick.json';
import farmerJorel from './defs/farmer_jorel.json';
import farmerTamsin from './defs/farmer_tamsin.json';
import ferrymanPeld from './defs/ferryman_peld.json';
import grocerMerra from './defs/grocer_merra.json';
import roundTrader from './defs/round_trader.json';
import innkeepDunna from './defs/innkeep_dunna.json';
import hostlerBray from './defs/hostler_bray.json';
import keeperAnsel from './defs/keeper_ansel.json';
import lampkeeperEdda from './defs/lampkeeper_edda.json';
import reeveHalla from './defs/reeve_halla.json';
import sawmistressGroa from './defs/sawmistress_groa.json';
import sparmasterYannick from './defs/sparmaster_yannick.json';
import smithVigga from './defs/smith_vigga.json';
import innkeepSunniva from './defs/innkeep_sunniva.json';
import pitchmasterRullo from './defs/pitchmaster_rullo.json';
import factorEbba from './defs/factor_ebba.json';
import buyerOspren from './defs/buyer_ospren.json';
import storekeepNial from './defs/storekeep_nial.json';
import tallymanBram from './defs/tallyman_bram.json';
import boomsmanKettil from './defs/boomsman_kettil.json';
import nurserymanOdd from './defs/nurseryman_odd.json';
import wardenSigrun from './defs/warden_sigrun.json';
import oldTorvi from './defs/old_torvi.json';
import fisherYlva from './defs/fisher_ylva.json';
import pinewatchWatch from './defs/pinewatch_watch.json';
import pinewatchSawyer from './defs/pinewatch_sawyer.json';
import captainStellan from './defs/captain_stellan.json';
import quartermasterBerget from './defs/quartermaster_berget.json';
import serjeantOve from './defs/serjeant_ove.json';
import houndmistressRanka from './defs/houndmistress_ranka.json';
import fletcherEspen from './defs/fletcher_espen.json';
import hunterKolbrun from './defs/hunter_kolbrun.json';
import herbalistMaren from './defs/herbalist_maren.json';
import ironmasterTorger from './defs/ironmaster_torger.json';
import droverSylvi from './defs/drover_sylvi.json';
import pinewatchNorthguard from './defs/pinewatch_northguard.json';
import pinewatchHunter from './defs/pinewatch_hunter.json';
import hoargateWatch from './defs/hoargate_watch.json';
import serjeantOttar from './defs/serjeant_ottar.json';
import masterTilo from './defs/master_tilo.json';
import millerGarton from './defs/miller_garton.json';
import orchardistPerl from './defs/orchardist_perl.json';
import registrarRowan from './defs/registrar_rowan.json';
import outfitterHask from './defs/outfitter_hask.json';
import sageElowen from './defs/sage_elowen.json';
import smithBretta from './defs/smith_bretta.json';
import tannerSwale from './defs/tanner_swale.json';
import wayfarerDray from './defs/wayfarer_dray.json';
import peddlerNix from './defs/peddler_nix.json';
import peddlerHetty from './defs/peddler_hetty.json';
import peddlerCoff from './defs/peddler_coff.json';
import wayfarerPetch from './defs/wayfarer_petch.json';
import wayfarerSenna from './defs/wayfarer_senna.json';
import waykeeperBrant from './defs/waykeeper_brant.json';
import waykeeperHale from './defs/waykeeper_hale.json';
import waykeeperOdessa from './defs/waykeeper_odessa.json';
import waywardWatch from './defs/wayward_watch.json';
import kingAldaren from './defs/king_aldaren.json';
import wardenSylwen from './defs/warden_sylwen.json';
import keeperIlvane from './defs/keeper_ilvane.json';
import loresingerMaelis from './defs/loresinger_maelis.json';
import bowyerAewyn from './defs/bowyer_aewyn.json';
import weaverMyrren from './defs/weaver_myrren.json';
import glasswrightSelorne from './defs/glasswright_selorne.json';
import smithFaelar from './defs/smith_faelar.json';
import inscriberVessa from './defs/inscriber_vessa.json';
import innkeepElarin from './defs/innkeep_elarin.json';
import provisionerCorwen from './defs/provisioner_corwen.json';
import sentinelSerel from './defs/sentinel_serel.json';
import stillkeeperNaia from './defs/stillkeeper_naia.json';
import keeperOthiel from './defs/keeper_othiel.json';
import fairArtisan from './defs/fair_artisan.json';
import sentinelVeran from './defs/sentinel_veran.json';
import sentinelLisse from './defs/sentinel_lisse.json';
import sentinelThal from './defs/sentinel_thal.json';
import evenguardWatch from './defs/evenguard_watch.json';
import portreeveBrack from './defs/portreeve_brack.json';
import factorNeave from './defs/factor_neave.json';
import innkeepDorrit from './defs/innkeep_dorrit.json';
import chandlerSwale from './defs/chandler_swale.json';
import salterOndra from './defs/salter_ondra.json';
import smokemistressAlba from './defs/smokemistress_alba.json';
import anglerVoss from './defs/angler_voss.json';
import boatwrightSeff from './defs/boatwright_seff.json';
import roperJessa from './defs/roper_jessa.json';
import lightkeeperLund from './defs/lightkeeper_lund.json';
import pilotFane from './defs/pilot_fane.json';
import saltmereWatch from './defs/saltmere_watch.json';
import saltmereFisher from './defs/saltmere_fisher.json';

/**
 * Every authored actor JSON, registered here. A def that isn't listed
 * doesn't exist — actors.test.ts walks the defs/ directory and fails
 * if a file is missing from this roster, so forgetting the import is
 * a test failure, not a silent hole in the world.
 */
// The living roster: Dawnmead's six villagers, the waystation cast
// the procedural havens post (wayfarers + the wayward watch), and
// the Wild Between's people — the crofters holding the verges, the
// Waykeeper sergeants holding the marches, and Edda holding the
// Last Lamp against the Silverspine dark.
import speakerAshild from './defs/speaker_ashild.json';
import springkeeperMaeva from './defs/springkeeper_maeva.json';
import huntmasterKolgrim from './defs/huntmaster_kolgrim.json';
import guideSunn from './defs/guide_sunn.json';
import furrierRanna from './defs/furrier_ranna.json';
import tallywifeInga from './defs/tallywife_inga.json';
import chandlerUlfa from './defs/chandler_ulfa.json';
import smokemasterGeir from './defs/smokemaster_geir.json';
import bonecarverTuli from './defs/bonecarver_tuli.json';
import smithEirik from './defs/smith_eirik.json';
import innkeepBrandulf from './defs/innkeep_brandulf.json';
import herdmasterSwein from './defs/herdmaster_swein.json';
import tithekeeperOrvar from './defs/tithekeeper_orvar.json';
import elderGunvor from './defs/elder_gunvor.json';
import netkeeperEyvor from './defs/netkeeper_eyvor.json';
import waykeeperSigne from './defs/waykeeper_signe.json';
import buyerHallward from './defs/buyer_hallward.json';
import pedlarGrimm from './defs/pedlar_grimm.json';
import hartfellWatch from './defs/hartfell_watch.json';
import hartfellHerder from './defs/hartfell_herder.json';
// Kingsdelf — the town in the King's Delf (the Kingsdelf epic).
import delfmasterRuen from './defs/delfmaster_ruen.json';
import factorVenn from './defs/factor_venn.json';
import sealkeeperAnnik from './defs/sealkeeper_annik.json';
import innkeepBrekka from './defs/innkeep_brekka.json';
import stablemasterOrin from './defs/stablemaster_orin.json';
import smithFerrun from './defs/smith_ferrun.json';
import glasswrightMirena from './defs/glasswright_mirena.json';
import enchanterVeyle from './defs/enchanter_veyle.json';
import keywrightOrla from './defs/keywright_orla.json';
import assayerLorn from './defs/assayer_lorn.json';
import lampwrightSoren from './defs/lampwright_soren.json';
import waykeeperLiv from './defs/waykeeper_liv.json';
import surveyorHedda from './defs/surveyor_hedda.json';
import provisionerEtta from './defs/provisioner_etta.json';
import outfitterCass from './defs/outfitter_cass.json';
import salvewrightIda from './defs/salvewright_ida.json';
import fisherDenna from './defs/fisher_denna.json';
import brokerSlate from './defs/broker_slate.json';
import kingsdelfWatch from './defs/kingsdelf_watch.json';
import kingsdelfDelver from './defs/kingsdelf_delver.json';
import kingsdelfGlasshand from './defs/kingsdelf_glasshand.json';
// THE PEOPLE OF THE VALE (docs/silverfall-vale-plan.md Phase 6).
import millerBrant from './defs/miller_brant.json';
import bakerHedda from './defs/baker_hedda.json';
import tavernerUlf from './defs/taverner_ulf.json';
import keeperRonnaug from './defs/keeper_ronnaug.json';
import potterSigne from './defs/potter_signe.json';
import chandlerWick from './defs/chandler_wick.json';
import cobblerFinn from './defs/cobbler_finn.json';
import wainwrightTorvald from './defs/wainwright_torvald.json';
import hostelkeeperMaeve from './defs/hostelkeeper_maeve.json';
import gravekeeperAldous from './defs/gravekeeper_aldous.json';
import fisherBrigga from './defs/fisher_brigga.json';
import fisherHolm from './defs/fisher_holm.json';
import bathkeeperUna from './defs/bathkeeper_una.json';
import guildmasterSoren from './defs/guildmaster_soren.json';
import mongerPetya from './defs/monger_petya.json';
import mongerLucan from './defs/monger_lucan.json';
import sergeantVarn from './defs/sergeant_varn.json';
import courierPip from './defs/courier_pip.json';
import valeWatch from './defs/vale_watch.json';
import valePilgrim from './defs/vale_pilgrim.json';
import valeCarter from './defs/vale_carter.json';

const SOURCES: readonly unknown[] = [
  reeveHalla,
  sawmistressGroa,
  sparmasterYannick,
  smithVigga,
  innkeepSunniva,
  pitchmasterRullo,
  factorEbba,
  buyerOspren,
  storekeepNial,
  tallymanBram,
  boomsmanKettil,
  nurserymanOdd,
  wardenSigrun,
  oldTorvi,
  fisherYlva,
  pinewatchWatch,
  pinewatchSawyer,
  captainStellan,
  quartermasterBerget,
  serjeantOve,
  houndmistressRanka,
  fletcherEspen,
  hunterKolbrun,
  herbalistMaren,
  ironmasterTorger,
  droverSylvi,
  pinewatchNorthguard,
  pinewatchHunter,
  hoargateWatch,
  serjeantOttar,
  portreeveBrack,
  factorNeave,
  innkeepDorrit,
  chandlerSwale,
  salterOndra,
  smokemistressAlba,
  anglerVoss,
  boatwrightSeff,
  roperJessa,
  lightkeeperLund,
  pilotFane,
  saltmereWatch,
  saltmereFisher,
  brokerVarga,
  curioNinebrass,
  reeveCoppin,
  veteranSkarn,
  bursarOdele,
  cookSigny,
  enchantressSolvei,
  foremanGrettir,
  forgemistressBalla,
  galleriaTrader,
  gardenerIvo,
  gateMonger,
  herbalistWyn,
  hostlerOsa,
  outriderHaldis,
  outriderJoss,
  marshalKestrel,
  masonPetra,
  shrinekeeperSella,
  silverfallWatch,
  wardenMaren,
  weaverOttilie,
  kingAeriex,
  queenKayri,
  castleGuard,
  castleServant,
  captainRavna,
  tallymanBrusk,
  quartermasterYeva,
  companyBlade,
  companyRunner,
  drillmasterJorunn,
  stewardAnsgar,
  heraldOssian,
  smeltmasterKoll,
  assayerRuna,
  carpenterStig,
  cooperDagny,
  fletcherHaki,
  silversmithVigdis,
  scrivenerTove,
  innkeepRagna,
  magpieMab,
  fenceCalder,
  lookoutPike,
  companyBroker,
  companyTollGuard,
  bankerCormund,
  captainAldis,
  amberfordWatch,
  courierNib,
  crofterBeck,
  crofterHolt,
  crofterMaida,
  crofterTam,
  dawnmeadWard,
  keeperWren,
  yardmasterHalla,
  fletcherRill,
  sparkwrightVarn,
  foresterAlder,
  cookBerrit,
  wrightOttery,
  innkeepGilly,
  anglerWeir,
  farmerBrammel,
  droverSorrel,
  twinTansy,
  twinWick,
  farmerJorel,
  farmerTamsin,
  ferrymanPeld,
  grocerMerra,
  roundTrader,
  innkeepDunna,
  hostlerBray,
  keeperAnsel,
  lampkeeperEdda,
  masterTilo,
  millerGarton,
  orchardistPerl,
  registrarRowan,
  outfitterHask,
  sageElowen,
  smithBretta,
  tannerSwale,
  wayfarerDray,
  wayfarerPetch,
  wayfarerSenna,
  waykeeperBrant,
  waykeeperHale,
  waykeeperOdessa,
  waywardWatch,
  // THE EVERWOOD (the Evenfall epic): the Evenguard on the miles.
  sentinelVeran,
  sentinelLisse,
  sentinelThal,
  evenguardWatch,
  // Evenfall — the city the old folk kept (the people pass):
  kingAldaren,
  wardenSylwen,
  keeperIlvane,
  loresingerMaelis,
  bowyerAewyn,
  weaverMyrren,
  glasswrightSelorne,
  smithFaelar,
  inscriberVessa,
  innkeepElarin,
  provisionerCorwen,
  sentinelSerel,
  stillkeeperNaia,
  keeperOthiel,
  fairArtisan,
  // The Road's Fortune (living frontier, phase 5) — the peddler pool:
  peddlerNix,
  peddlerHetty,
  peddlerCoff,
  speakerAshild,
  springkeeperMaeva,
  huntmasterKolgrim,
  guideSunn,
  furrierRanna,
  tallywifeInga,
  chandlerUlfa,
  smokemasterGeir,
  bonecarverTuli,
  smithEirik,
  innkeepBrandulf,
  herdmasterSwein,
  tithekeeperOrvar,
  elderGunvor,
  netkeeperEyvor,
  waykeeperSigne,
  buyerHallward,
  pedlarGrimm,
  hartfellWatch,
  delfmasterRuen,
  factorVenn,
  sealkeeperAnnik,
  innkeepBrekka,
  stablemasterOrin,
  smithFerrun,
  glasswrightMirena,
  enchanterVeyle,
  keywrightOrla,
  assayerLorn,
  lampwrightSoren,
  waykeeperLiv,
  surveyorHedda,
  provisionerEtta,
  outfitterCass,
  salvewrightIda,
  fisherDenna,
  brokerSlate,
  kingsdelfWatch,
  kingsdelfDelver,
  kingsdelfGlasshand,
  hartfellHerder,
  millerBrant,
  bakerHedda,
  tavernerUlf,
  keeperRonnaug,
  potterSigne,
  chandlerWick,
  cobblerFinn,
  wainwrightTorvald,
  hostelkeeperMaeve,
  gravekeeperAldous,
  fisherBrigga,
  fisherHolm,
  bathkeeperUna,
  guildmasterSoren,
  mongerPetya,
  mongerLucan,
  sergeantVarn,
  courierPip,
  valeWatch,
  valePilgrim,
  valeCarter,
];

function buildRegistry(): ReadonlyMap<string, NpcActorDef> {
  const map = new Map<string, NpcActorDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateNpcActor(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.actor.id)) errors.push(`${res.actor.id}: duplicate actor id`);
    else map.set(res.actor.id, res.actor);
  }
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid NPC actor defs:\n  ${errors.join('\n  ')}`);
  return map;
}

export const NPC_ACTORS: ReadonlyMap<string, NpcActorDef> = buildRegistry();

export function npcActor(id: string): NpcActorDef | undefined {
  return NPC_ACTORS.get(id);
}

/**
 * The baseline stat block for fightable humanoid actors that name no
 * bestiary base — a level-10 town-guard chassis that scaleNpcDef
 * re-issues at any level, same as every dungeon garrison.
 */
export const HUMANOID_BASE: NpcDef = {
  id: 'actor_humanoid',
  name: 'Fellow',
  level: 10,
  maxHp: 30,
  damage: 3,
  attackRange: 1.0,
  attackCooldownTicks: 44,
  aggroRange: 0,
  // A person on watch: a wide but honest field of view — the town
  // guard can genuinely be slipped from behind.
  sightArc: 160,
  leashRange: 20,
  speed: 3.6,
  xpReward: 90,
  loot: [],
  respawnSec: 60,
  color: '#c8b89a',
  radius: 0.3,
  hitHeight: 2.0,
};

/**
 * Wire appearance for a humanoid actor — exactly the shape a player
 * broadcasts, so the client's one humanoid rig renders both. Creature
 * actors return null: their body IS the bestiary art, addressed by
 * defId.
 */
export function actorAppearance(actor: NpcActorDef): AppearanceData | null {
  if (actor.model.kind !== 'humanoid') return null;
  return {
    bodyColor: '',
    equip: { ...(actor.equipment ?? {}) },
    look: actor.model.look,
  };
}

/**
 * Synthesize the combat NpcDef for an attackable actor: base def
 * (named base > own creature body > HUMANOID_BASE) scaled to the
 * authored level, stat overrides applied, actor-owned loot/respawn.
 * Friendly actors (no combat block) return null — they simply never
 * enter the combat registry, which is what makes them unhittable.
 */
export function actorCombatDef(actor: NpcActorDef): NpcDef | null {
  const combat = actor.combat;
  if (!combat) return null;
  const base =
    (combat.base ? NPCS.get(combat.base) : undefined) ??
    (actor.model.kind === 'creature' ? NPCS.get(actor.model.creature) : undefined) ??
    HUMANOID_BASE;
  const scaled = scaleNpcDef(base, combat.level, actor.name);
  const merged: NpcDef = {
    ...scaled,
    id: `actor:${actor.id}`,
    loot: combat.loot ?? [],
    respawnSec: combat.respawnSec ?? scaled.respawnSec,
    ...combat.stats,
  };
  // Neutral actors defend themselves but never start it — this clamp
  // outranks any authored stat override.
  if (actor.disposition !== 'hostile') merged.aggroRange = 0;
  return merged;
}
