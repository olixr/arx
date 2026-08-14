import { dialogueDoneFlag, type DialogueDef } from './types.js';
import { validateDialogue } from './validate.js';

import qWetCountOffer from './defs/q_the_wet_count_offer.json';
import qWetCountTurnin from './defs/q_the_wet_count_turnin.json';
import qWardlineOffer from './defs/q_past_the_wardline_offer.json';
import qWardlineTurnin from './defs/q_past_the_wardline_turnin.json';
import qNameStoneOffer from './defs/q_a_name_for_the_stone_offer.json';
import qNameStoneTurnin from './defs/q_a_name_for_the_stone_turnin.json';
import qResinOffer from './defs/q_resin_for_the_road_offer.json';
import qResinTurnin from './defs/q_resin_for_the_road_turnin.json';
import hallaRota from './defs/halla_rota.json';
import torviStone from './defs/torvi_stone.json';
import groaSaw from './defs/groa_saw.json';
import yannickRow from './defs/yannick_row.json';
import ospreLedger from './defs/ospren_ledger.json';
import rulloKilns from './defs/rullo_kilns.json';
import sunnivaBell from './defs/sunniva_bell.json';
import bramTally from './defs/bram_tally.json';
import droverStalls from './defs/drover_stalls.json';
import sigrunRoad from './defs/sigrun_road.json';
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
import aeriexCourt from './defs/aeriex_court.json';
import kayriMere from './defs/kayri_mere.json';
import kollPour from './defs/koll_pour.json';
import runaScales from './defs/runa_scales.json';
import stigGrain from './defs/stig_grain.json';
import dagnyHoops from './defs/dagny_hoops.json';
import hakiFlight from './defs/haki_flight.json';
import vigdisSetting from './defs/vigdis_setting.json';
import toveCharts from './defs/tove_charts.json';
import ragnaFlagon from './defs/ragna_flagon.json';
import mabRookery from './defs/mab_rookery.json';
import jorunnYard from './defs/jorunn_yard.json';
import ansgarStores from './defs/ansgar_stores.json';
import ossianWord from './defs/ossian_word.json';
import ravnaCourt from './defs/ravna_court.json';
import ravnaTrusted from './defs/ravna_trusted.json';
import bruskDocket from './defs/brusk_docket.json';
import yevaKit from './defs/yeva_kit.json';
import qRedHandOffer from './defs/q_red_hand_offer.json';
import qRedHandTurnin from './defs/q_red_hand_turnin.json';
import qLowRoadRunsOffer from './defs/q_low_road_runs_offer.json';
import qLowRoadRunsTurnin from './defs/q_low_road_runs_turnin.json';
import qUndercutOffer from './defs/q_undercut_offer.json';
import qUndercutTurnin from './defs/q_undercut_turnin.json';
import qBootsForBladesOffer from './defs/q_boots_for_blades_offer.json';
import qBootsForBladesTurnin from './defs/q_boots_for_blades_turnin.json';
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
import brackHarbor from './defs/brack_harbor.json';
import neaveLedger from './defs/neave_ledger.json';
import dorritGull from './defs/dorrit_gull.json';
import swaleStores from './defs/swale_stores.json';
import ondraPans from './defs/ondra_pans.json';
import albaSmoke from './defs/alba_smoke.json';
import vossTackle from './defs/voss_tackle.json';
import seffSlipway from './defs/seff_slipway.json';
import jessaWalk from './defs/jessa_walk.json';
import lundLight from './defs/lund_light.json';
import faneMere from './defs/fane_mere.json';
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
import brynWatchUneasy from './defs/bryn_watch_uneasy.json';
import brynWatchUrgent from './defs/bryn_watch_urgent.json';
import brynWatchRelief from './defs/bryn_watch_relief.json';
import aldisWatchUneasy from './defs/aldis_watch_uneasy.json';
import aldisWatchUrgent from './defs/aldis_watch_urgent.json';
import aldisWatchToll from './defs/aldis_watch_toll.json';
import aldisWatchRelief from './defs/aldis_watch_relief.json';
// Factions Phase 2 (docs/factions-plan.md): the street tells you —
// standing-gated greetings on the gate captain's ladder (binding
// priority 1: above the evergreen watch, below every urgent thing).
import aldisGoodColumn from './defs/aldis_good_column.json';
import aldisWatchList from './defs/aldis_watch_list.json';
// Factions Phase 3: THE ROAD BACK — the fine counters (priority 15,
// atmost:outlaw gates: the fineActor carve-out opens the door, these
// trees own it) and the penance offer/turn-in pairs (OFFER-TIE law:
// already-offering givers ride 6, Maren's first offer rides 5).
import aldisFine from './defs/aldis_fine.json';
import marenFine from './defs/maren_fine.json';
import kestrelFine from './defs/kestrel_fine.json';
import mabFine from './defs/mab_fine.json';
import qTheBadColumnOffer from './defs/q_the_bad_column_offer.json';
import qTheBadColumnTurnin from './defs/q_the_bad_column_turnin.json';
import qTheCrownsCountOffer from './defs/q_the_crowns_count_offer.json';
import qTheCrownsCountTurnin from './defs/q_the_crowns_count_turnin.json';
import qShortHandedOffer from './defs/q_short_handed_offer.json';
import qShortHandedTurnin from './defs/q_short_handed_turnin.json';
// Factions Phase 4: THE TWO ROADS — the Company's tongue at the
// Tollhouse (hub, blood-price, low-road offers) and the opposed pair
// (lean_winter vs herd_stands exclude each other via quest: forbids —
// taking a side closes the other giver's door for good).
import ferrickCourt from './defs/ferrick_court.json';
import ferrickFine from './defs/ferrick_fine.json';
import qTheRedMarkOffer from './defs/q_the_red_mark_offer.json';
import qTheRedMarkTurnin from './defs/q_the_red_mark_turnin.json';
import qTheLeanWinterOffer from './defs/q_the_lean_winter_offer.json';
import qTheLeanWinterTurnin from './defs/q_the_lean_winter_turnin.json';
import qTollOwedOffer from './defs/q_toll_owed_offer.json';
import qTollOwedTurnin from './defs/q_toll_owed_turnin.json';
import qTheHerdStandsOffer from './defs/q_the_herd_stands_offer.json';
import qTheHerdStandsTurnin from './defs/q_the_herd_stands_turnin.json';
import waywardWatchUneasy from './defs/wayward_watch_uneasy.json';
import waywardWatchUrgent from './defs/wayward_watch_urgent.json';
import waywardWatchRelief from './defs/wayward_watch_relief.json';
import halePost from './defs/hale_post.json';
import nixCart from './defs/nix_cart.json';
import hettyCart from './defs/hetty_cart.json';
import coffCart from './defs/coff_cart.json';
import haleWatchUneasy from './defs/hale_watch_uneasy.json';
import haleWatchUrgent from './defs/hale_watch_urgent.json';
import haleWatchRelief from './defs/hale_watch_relief.json';
import qLayOffer from './defs/q_the_lay_of_the_land_offer.json';
import qLayTurnin from './defs/q_the_lay_of_the_land_turnin.json';
import qThinOffer from './defs/q_thin_the_meadow_offer.json';
import qThinTurnin from './defs/q_thin_the_meadow_turnin.json';
import qHensOffer from './defs/q_hobbs_hens_offer.json';
import qHensTurnin from './defs/q_hobbs_hens_turnin.json';
import qWordOffer from './defs/q_word_on_the_road_offer.json';
import qWordTurnin from './defs/q_word_on_the_road_turnin.json';
import qReaverOffer from './defs/q_the_reavers_mark_offer.json';
import qReaverTurnin from './defs/q_the_reavers_mark_turnin.json';
import qRegistryOffer from './defs/q_names_in_the_registry_offer.json';
import qRegistryTurnin from './defs/q_names_in_the_registry_turnin.json';
import qCrownOffer from './defs/q_a_word_from_the_crown_offer.json';
import qCrownTurnin from './defs/q_a_word_from_the_crown_turnin.json';
import qSmithOffer from './defs/q_a_smiths_errand_offer.json';
import qSmithTurnin from './defs/q_a_smiths_errand_turnin.json';
import qLongwayOffer from './defs/q_the_long_way_round_offer.json';
import qLongwayTurnin from './defs/q_the_long_way_round_turnin.json';
import qDeepOffer from './defs/q_deep_seams_offer.json';
import qDeepTurnin from './defs/q_deep_seams_turnin.json';
import qPyreOffer from './defs/q_bones_for_the_pyre_offer.json';
import qPyreTurnin from './defs/q_bones_for_the_pyre_turnin.json';
import qPeltsOffer from './defs/q_pelts_for_the_road_offer.json';
import qPeltsTurnin from './defs/q_pelts_for_the_road_turnin.json';
import qPotOffer from './defs/q_the_pot_never_rests_offer.json';
import qPotTurnin from './defs/q_the_pot_never_rests_turnin.json';
import qWarrensOffer from './defs/q_thin_the_warrens_offer.json';
import qWarrensTurnin from './defs/q_thin_the_warrens_turnin.json';
import qLedgerActive from './defs/q_the_stolen_ledger_active.json';
import qLedgerTurnin from './defs/q_the_stolen_ledger_turnin.json';
import qToolsOffer from './defs/q_the_brothers_tools_offer.json';
import qToolsTurnin from './defs/q_the_brothers_tools_turnin.json';
import qDueOffer from './defs/q_the_digmasters_due_offer.json';
import qDueTurnin from './defs/q_the_digmasters_due_turnin.json';
import qStoneOffer from './defs/q_names_for_the_stone_offer.json';
import qStoneTurnin from './defs/q_names_for_the_stone_turnin.json';
import qStarwardOffer from './defs/q_the_starward_dig_offer.json';
import qStarwardTurnin from './defs/q_the_starward_dig_turnin.json';
import qPeaceOffer from './defs/q_the_kings_peace_offer.json';
import qPeaceTurnin from './defs/q_the_kings_peace_turnin.json';
import qFordOffer from './defs/q_the_queens_ford_offer.json';
import qFordTurnin from './defs/q_the_queens_ford_turnin.json';
import qLampsOffer from './defs/q_the_lamps_of_the_line_offer.json';
import qLampsTurnin from './defs/q_the_lamps_of_the_line_turnin.json';
import qLineOffer from './defs/q_the_silver_line_offer.json';
import qLineTurnin from './defs/q_the_silver_line_turnin.json';
import qQuietOffer from './defs/q_a_quiet_word_offer.json';
import qQuietTurnin from './defs/q_a_quiet_word_turnin.json';
import qCageOffer from './defs/q_the_gilded_cage_offer.json';
import qCageTurnin from './defs/q_the_gilded_cage_turnin.json';
import qArrangementOffer from './defs/q_the_arrangement_offer.json';
import qArrangementTurnin from './defs/q_the_arrangement_turnin.json';
import qEmbersOffer from './defs/q_embers_of_the_shrine_offer.json';
import qEmbersTurnin from './defs/q_embers_of_the_shrine_turnin.json';
import qSistersOffer from './defs/q_the_sisters_lamp_offer.json';
import qSistersTurnin from './defs/q_the_sisters_lamp_turnin.json';
import qWorgsongOffer from './defs/q_worgsong_offer.json';
import qWorgsongTurnin from './defs/q_worgsong_turnin.json';
import qMatriarchOffer from './defs/q_the_matriarch_offer.json';
import qMatriarchTurnin from './defs/q_the_matriarch_turnin.json';
import qBearOffer from './defs/q_the_bear_of_the_spine_offer.json';
import qBearTurnin from './defs/q_the_bear_of_the_spine_turnin.json';
import qStairOffer from './defs/q_steel_for_the_stair_offer.json';
import qStairTurnin from './defs/q_steel_for_the_stair_turnin.json';
import qThreadsOffer from './defs/q_threads_of_the_row_offer.json';
import qThreadsTurnin from './defs/q_threads_of_the_row_turnin.json';
import qSettingOffer from './defs/q_the_silver_setting_offer.json';
import qSettingTurnin from './defs/q_the_silver_setting_turnin.json';
import qPatrolActive from './defs/q_the_last_patrol_active.json';
import qPatrolTurnin from './defs/q_the_last_patrol_turnin.json';

/**
 * Every authored dialogue JSON, registered here. A def that isn't
 * listed doesn't exist — dialogues.test.ts walks the defs/ directory
 * and fails if a file is missing from this roster.
 */
import ashildMoot from './defs/ashild_moot.json';
// Kingsdelf — the town speaks (the Kingsdelf epic).
import ruenDelfhall from './defs/ruen_delfhall.json';
import vennCounting from './defs/venn_counting.json';
import annikNames from './defs/annik_names.json';
import brekkaRest from './defs/brekka_rest.json';
import orinBeastyard from './defs/orin_beastyard.json';
import ferrunForge from './defs/ferrun_forge.json';
import mirenaGlass from './defs/mirena_glass.json';
import veyleFocus from './defs/veyle_focus.json';
import lornAssay from './defs/lorn_assay.json';
import sorenFlame from './defs/soren_flame.json';
import livPost from './defs/liv_post.json';
import heddaSurvey from './defs/hedda_survey.json';
import ettaGoods from './defs/etta_goods.json';
import cassOutfitting from './defs/cass_outfitting.json';
import idaRemedies from './defs/ida_remedies.json';
import dennaQuay from './defs/denna_quay.json';
import slateSundries from './defs/slate_sundries.json';
// Kingsdelf — the errand trees (offer 5 / scene 6 / turn-in 21).
import qTheCountBelowOffer from './defs/q_the_count_below_offer.json';
import qTheCountBelowVeyle from './defs/q_the_count_below_veyle.json';
import qTheCountBelowTurnin from './defs/q_the_count_below_turnin.json';
import qLightTheOldRoadOffer from './defs/q_light_the_old_road_offer.json';
import qLightTheOldRoadTurnin from './defs/q_light_the_old_road_turnin.json';
import qTheCrownAsksOffer from './defs/q_the_crown_asks_offer.json';
import qTheCrownAsksRuen from './defs/q_the_crown_asks_ruen.json';
import qTheCrownAsksTurnin from './defs/q_the_crown_asks_turnin.json';
import qAStallInAshOffer from './defs/q_a_stall_in_ash_offer.json';
import qAStallInAshTurnin from './defs/q_a_stall_in_ash_turnin.json';
import qWhatTheNetHeldOffer from './defs/q_what_the_net_held_offer.json';
import qWhatTheNetHeldVeyle from './defs/q_what_the_net_held_veyle.json';
import qWhatTheNetHeldTurnin from './defs/q_what_the_net_held_turnin.json';
import maevaSpring from './defs/maeva_spring.json';
import kolgrimHorn from './defs/kolgrim_horn.json';
import sunnFell from './defs/sunn_fell.json';
import rannaGrade from './defs/ranna_grade.json';
import ingaCount from './defs/inga_count.json';
import ulfaWax from './defs/ulfa_wax.json';
import geirSmoke from './defs/geir_smoke.json';
import tuliBone from './defs/tuli_bone.json';
import eirikForge from './defs/eirik_forge.json';
import brandulfHearth from './defs/brandulf_hearth.json';
import sweinFold from './defs/swein_fold.json';
import orvarTithe from './defs/orvar_tithe.json';
import gunvorIce from './defs/gunvor_ice.json';
import eyvorNets from './defs/eyvor_nets.json';
import signeRoad from './defs/signe_road.json';
import hallwardCharter from './defs/hallward_charter.json';
import grimmWares from './defs/grimm_wares.json';

import qTheEmptyFoldOffer from './defs/q_the_empty_fold_offer.json';
import sunnTheCount from './defs/sunn_the_count.json';
import qTheEmptyFoldTurnin from './defs/q_the_empty_fold_turnin.json';
import qTheUnansweredTitheOffer from './defs/q_the_unanswered_tithe_offer.json';
import qTheUnansweredTitheTurnin from './defs/q_the_unanswered_tithe_turnin.json';
import qTheOpenedBarrowOffer from './defs/q_the_opened_barrow_offer.json';
import orvarCountedBack from './defs/orvar_counted_back.json';
import qTheOpenedBarrowTurnin from './defs/q_the_opened_barrow_turnin.json';
import qTallowForTheLampsOffer from './defs/q_tallow_for_the_lamps_offer.json';
import qTallowForTheLampsTurnin from './defs/q_tallow_for_the_lamps_turnin.json';
import qTheFifteenthNameOffer from './defs/q_the_fifteenth_name_offer.json';
import torviTheFifteenth from './defs/torvi_the_fifteenth.json';
import qTheFifteenthNameTurnin from './defs/q_the_fifteenth_name_turnin.json';

const SOURCES: readonly unknown[] = [
  qWetCountOffer,
  qWetCountTurnin,
  qWardlineOffer,
  qWardlineTurnin,
  qNameStoneOffer,
  qNameStoneTurnin,
  qResinOffer,
  qResinTurnin,
  hallaRota,
  torviStone,
  groaSaw,
  yannickRow,
  ospreLedger,
  rulloKilns,
  sunnivaBell,
  bramTally,
  droverStalls,
  sigrunRoad,
  brackHarbor,
  neaveLedger,
  dorritGull,
  swaleStores,
  ondraPans,
  albaSmoke,
  vossTackle,
  seffSlipway,
  jessaWalk,
  lundLight,
  faneMere,
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
  aeriexCourt,
  kayriMere,
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
  jorunnYard,
  ansgarStores,
  ossianWord,
  ravnaCourt,
  ravnaTrusted,
  bruskDocket,
  yevaKit,
  qRedHandOffer,
  qRedHandTurnin,
  qLowRoadRunsOffer,
  qLowRoadRunsTurnin,
  qUndercutOffer,
  qUndercutTurnin,
  qBootsForBladesOffer,
  qBootsForBladesTurnin,
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
  // THE TOWN FEELS IT (living-frontier Phase 3): threat-gated watch
  // trees layered by priority over each throat's standing voice —
  // urgent (8, world:threat_bold) > uneasy (7, world:threat_near) >
  // relief (6, world:relief) > the evergreen default.
  brynWatchUneasy,
  brynWatchUrgent,
  brynWatchRelief,
  aldisWatchUneasy,
  aldisWatchUrgent,
  aldisWatchToll,
  aldisWatchRelief,
  aldisGoodColumn,
  aldisWatchList,
  aldisFine,
  marenFine,
  kestrelFine,
  mabFine,
  qTheBadColumnOffer,
  qTheBadColumnTurnin,
  qTheCrownsCountOffer,
  qTheCrownsCountTurnin,
  qShortHandedOffer,
  qShortHandedTurnin,
  ferrickCourt,
  ferrickFine,
  qTheRedMarkOffer,
  qTheRedMarkTurnin,
  qTheLeanWinterOffer,
  qTheLeanWinterTurnin,
  qTollOwedOffer,
  qTollOwedTurnin,
  qTheHerdStandsOffer,
  qTheHerdStandsTurnin,
  waywardWatchUneasy,
  waywardWatchUrgent,
  waywardWatchRelief,
  halePost,
  haleWatchUneasy,
  haleWatchUrgent,
  haleWatchRelief,
  // THE ROAD'S FORTUNE (living-frontier Phase 5): the peddler carts.
  nixCart,
  hettyCart,
  coffCart,
  // THE QUEST LEDGER: per-quest offer trees (priority 5 — world news
  // and once-intros outrank a job pitch) and turn-in trees (21 — a
  // finished errand is the player's earned moment), all gated on the
  // synthetic quest: answers so they appear and retire themselves.
  qLayOffer,
  qLayTurnin,
  qThinOffer,
  qThinTurnin,
  qHensOffer,
  qHensTurnin,
  qWordOffer,
  qWordTurnin,
  qReaverOffer,
  qReaverTurnin,
  qRegistryOffer,
  qRegistryTurnin,
  qCrownOffer,
  qCrownTurnin,
  qSmithOffer,
  qSmithTurnin,
  qLongwayOffer,
  qLongwayTurnin,
  qDeepOffer,
  qDeepTurnin,
  qPyreOffer,
  qPyreTurnin,
  qPeltsOffer,
  qPeltsTurnin,
  qPotOffer,
  qPotTurnin,
  qWarrensOffer,
  qWarrensTurnin,
  qLedgerActive,
  qLedgerTurnin,
  // THE LEDGER GROWS: the six new arcs. Offers whose giver already
  // pitches another quest ride priority 6 so the availability tie
  // breaks deterministically (Grettir, Skarn, Sella ×2, Hask ×2).
  qToolsOffer,
  qToolsTurnin,
  qDueOffer,
  qDueTurnin,
  qStoneOffer,
  qStoneTurnin,
  qStarwardOffer,
  qStarwardTurnin,
  qPeaceOffer,
  qPeaceTurnin,
  qFordOffer,
  qFordTurnin,
  qLampsOffer,
  qLampsTurnin,
  qLineOffer,
  qLineTurnin,
  qQuietOffer,
  qQuietTurnin,
  qCageOffer,
  qCageTurnin,
  qArrangementOffer,
  qArrangementTurnin,
  qEmbersOffer,
  qEmbersTurnin,
  qSistersOffer,
  qSistersTurnin,
  qWorgsongOffer,
  qWorgsongTurnin,
  qMatriarchOffer,
  qMatriarchTurnin,
  qBearOffer,
  qBearTurnin,
  qStairOffer,
  qStairTurnin,
  qThreadsOffer,
  qThreadsTurnin,
  qSettingOffer,
  qSettingTurnin,
  qPatrolActive,
  qPatrolTurnin,
  ashildMoot,
  ruenDelfhall,
  vennCounting,
  annikNames,
  brekkaRest,
  orinBeastyard,
  ferrunForge,
  mirenaGlass,
  veyleFocus,
  lornAssay,
  sorenFlame,
  livPost,
  heddaSurvey,
  ettaGoods,
  cassOutfitting,
  idaRemedies,
  dennaQuay,
  slateSundries,
  qTheCountBelowOffer,
  qTheCountBelowVeyle,
  qTheCountBelowTurnin,
  qLightTheOldRoadOffer,
  qLightTheOldRoadTurnin,
  qTheCrownAsksOffer,
  qTheCrownAsksRuen,
  qTheCrownAsksTurnin,
  qAStallInAshOffer,
  qAStallInAshTurnin,
  qWhatTheNetHeldOffer,
  qWhatTheNetHeldVeyle,
  qWhatTheNetHeldTurnin,
  maevaSpring,
  kolgrimHorn,
  sunnFell,
  rannaGrade,
  ingaCount,
  ulfaWax,
  geirSmoke,
  tuliBone,
  eirikForge,
  brandulfHearth,
  sweinFold,
  orvarTithe,
  gunvorIce,
  eyvorNets,
  signeRoad,
  hallwardCharter,
  grimmWares,
  qTheEmptyFoldOffer,
  sunnTheCount,
  qTheEmptyFoldTurnin,
  qTheUnansweredTitheOffer,
  qTheUnansweredTitheTurnin,
  qTheOpenedBarrowOffer,
  orvarCountedBack,
  qTheOpenedBarrowTurnin,
  qTallowForTheLampsOffer,
  qTallowForTheLampsTurnin,
  qTheFifteenthNameOffer,
  torviTheFifteenth,
  qTheFifteenthNameTurnin,
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
