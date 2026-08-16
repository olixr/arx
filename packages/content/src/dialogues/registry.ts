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
import wayfarerCamp from './defs/wayfarer_camp.json';
import waywardRoad from './defs/wayward_road.json';
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
import orlaKeywright from './defs/orla_keywright.json';
import haleWatchUneasy from './defs/hale_watch_uneasy.json';
import haleWatchUrgent from './defs/hale_watch_urgent.json';
import haleWatchRelief from './defs/hale_watch_relief.json';
import q_theGateBook_offer from './defs/q_the_gate_book_offer.json';
import q_theGateBook_turnin from './defs/q_the_gate_book_turnin.json';
import q_theDelfLadder_offer from './defs/q_the_delf_ladder_offer.json';
import q_theDelfLadder_turnin from './defs/q_the_delf_ladder_turnin.json';
import q_clothForTheCounting_offer from './defs/q_cloth_for_the_counting_offer.json';
import q_clothForTheCounting_turnin from './defs/q_cloth_for_the_counting_turnin.json';
import q_leatherOnTheFrame_offer from './defs/q_leather_on_the_frame_offer.json';
import q_leatherOnTheFrame_turnin from './defs/q_leather_on_the_frame_turnin.json';
import q_aDoseOfSense_offer from './defs/q_a_dose_of_sense_offer.json';
import q_aDoseOfSense_turnin from './defs/q_a_dose_of_sense_turnin.json';
import q_theMakersMark_offer from './defs/q_the_makers_mark_offer.json';
import q_theMakersMark_turnin from './defs/q_the_makers_mark_turnin.json';
import q_flourAndWater_offer from './defs/q_flour_and_water_offer.json';
import q_flourAndWater_turnin from './defs/q_flour_and_water_turnin.json';
import q_theAmberWater_offer from './defs/q_the_amber_water_offer.json';
import q_theAmberWater_turnin from './defs/q_the_amber_water_turnin.json';
import q_theFreeFurrows_offer from './defs/q_the_free_furrows_offer.json';
import q_theFreeFurrows_turnin from './defs/q_the_free_furrows_turnin.json';
import q_aStallSweptClean_offer from './defs/q_a_stall_swept_clean_offer.json';
import q_aStallSweptClean_turnin from './defs/q_a_stall_swept_clean_turnin.json';
import q_theTableLaid_offer from './defs/q_the_table_laid_offer.json';
import q_theTableLaid_turnin from './defs/q_the_table_laid_turnin.json';
import q_theFordHolds_offer from './defs/q_the_ford_holds_offer.json';
import q_theFordHolds_turnin from './defs/q_the_ford_holds_turnin.json';
import q_theWheelTurns_offer from './defs/q_the_wheel_turns_offer.json';
import q_theWheelTurns_turnin from './defs/q_the_wheel_turns_turnin.json';
import rowanGate from './defs/rowan_gate.json';
import rowanWren from './defs/rowan_wren.json';
import rowanUnmarked from './defs/rowan_unmarked.json';
import brayYard from './defs/bray_yard.json';
import swaleFrames from './defs/swale_frames.json';
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
import qTheLettersWestOffer from './defs/q_the_letters_west_offer.json';
import qTheFirstFocusOffer from './defs/q_the_first_focus_offer.json';
import qABowOfTheWoodOffer from './defs/q_a_bow_of_the_wood_offer.json';
import qTheQuietRoadOffer from './defs/q_the_quiet_road_offer.json';
import qWhatTheSongHoldsOffer from './defs/q_what_the_song_holds_offer.json';
import aldarenEvenhall from './defs/aldaren_evenhall.json';
import sylwenRoost from './defs/sylwen_roost.json';
import ilvaneFlame from './defs/ilvane_flame.json';
import maelisSong from './defs/maelis_song.json';
import aewynBows from './defs/aewyn_bows.json';
import vessaTable from './defs/vessa_table.json';
import elarinOutward from './defs/elarin_outward.json';
import corwenGate from './defs/corwen_gate.json';
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

// THE DAWN REMADE — the rebuilt starter cast speaks.
import wrenAwakening from './defs/wren_awakening.json';
import wrenGreen from './defs/wren_green.json';
import hallaArms from './defs/halla_arms.json';
import hallaYard from './defs/halla_yard.json';
import hallaWatchUrgent from './defs/halla_watch_urgent.json';
import hallaWatchUneasy from './defs/halla_watch_uneasy.json';
import hallaWatchRelief from './defs/halla_watch_relief.json';
import rillBow from './defs/rill_bow.json';
import rillRange from './defs/rill_range.json';
import varnSpark from './defs/varn_spark.json';
import varnCircle from './defs/varn_circle.json';
import berritHearth from './defs/berrit_hearth.json';
import berritTable from './defs/berrit_table.json';
import alderAxe from './defs/alder_axe.json';
import alderCopse from './defs/alder_copse.json';
import otteryBench from './defs/ottery_bench.json';
import otteryShop from './defs/ottery_shop.json';
import gillyStones from './defs/gilly_stones.json';
import gillyCommon from './defs/gilly_common.json';
import weirLine from './defs/weir_line.json';
import weirPier from './defs/weir_pier.json';
import brammelGate from './defs/brammel_gate.json';
import sorrelStalls from './defs/sorrel_stalls.json';
import qFirstLightOffer from './defs/q_first_light_offer.json';
import qFirstLightTurnin from './defs/q_first_light_turnin.json';
import qTheMeadowCountOffer from './defs/q_the_meadow_count_offer.json';
import qTheMeadowCountTurnin from './defs/q_the_meadow_count_turnin.json';
import qShellsOnTheBankOffer from './defs/q_shells_on_the_bank_offer.json';
import qShellsOnTheBankTurnin from './defs/q_shells_on_the_bank_turnin.json';
import qTheLastNestOffer from './defs/q_the_last_nest_offer.json';
import qTheLastNestTurnin from './defs/q_the_last_nest_turnin.json';
import qBerriesForThePotOffer from './defs/q_berries_for_the_pot_offer.json';
import qBerriesForThePotTurnin from './defs/q_berries_for_the_pot_turnin.json';
import qABirdDoneProperOffer from './defs/q_a_bird_done_proper_offer.json';
import qABirdDoneProperTurnin from './defs/q_a_bird_done_proper_turnin.json';
import qALineInTheWaterOffer from './defs/q_a_line_in_the_water_offer.json';
import qALineInTheWaterTurnin from './defs/q_a_line_in_the_water_turnin.json';
import qTheAxeRemembersOffer from './defs/q_the_axe_remembers_offer.json';
import qTheAxeRemembersTurnin from './defs/q_the_axe_remembers_turnin.json';
import qBoardsAndTwineOffer from './defs/q_boards_and_twine_offer.json';
import qBoardsAndTwineTurnin from './defs/q_boards_and_twine_turnin.json';
import qABarOfBronzeOffer from './defs/q_a_bar_of_bronze_offer.json';
import qABarOfBronzeTurnin from './defs/q_a_bar_of_bronze_turnin.json';
import qEggsForTheMorningOffer from './defs/q_eggs_for_the_morning_offer.json';
import qEggsForTheMorningTurnin from './defs/q_eggs_for_the_morning_turnin.json';
import qTheGentleHandOffer from './defs/q_the_gentle_hand_offer.json';
import qTheGentleHandTurnin from './defs/q_the_gentle_hand_turnin.json';
import qWalkingTheBoundsOffer from './defs/q_walking_the_bounds_offer.json';
import qWalkingTheBoundsTurnin from './defs/q_walking_the_bounds_turnin.json';
import qTheFirstRoadOffer from './defs/q_the_first_road_offer.json';
import qTheFirstRoadTurnin from './defs/q_the_first_road_turnin.json';
import qStillWatersOffer from './defs/q_still_waters_offer.json';
import qStillWatersTurnin from './defs/q_still_waters_turnin.json';
import qTheMeadowKeepsCountOffer from './defs/q_the_meadow_keeps_count_offer.json';
import qTheMeadowKeepsCountTurnin from './defs/q_the_meadow_keeps_count_turnin.json';

// THE TIMBER SHORE SPEAKS — Pinewatch and Saltmere coverage pass: the
// silent posts get their trees, the quest beats get their scenes, and
// the towns learn to notice what the player did for them.
import viggaSteel from './defs/vigga_steel.json';
import viggaTheCutting from './defs/vigga_the_cutting.json';
import ebbaCharter from './defs/ebba_charter.json';
import nialStores from './defs/nial_stores.json';
import ylvaSteps from './defs/ylva_steps.json';
import kettilBoom from './defs/kettil_boom.json';
import oddNursery from './defs/odd_nursery.json';
import pinewatchRota from './defs/pinewatch_rota.json';
import haldisCircuit from './defs/haldis_circuit.json';
import stellanPass from './defs/stellan_pass.json';
import bergetWall from './defs/berget_wall.json';
import oveDrill from './defs/ove_drill.json';
import rankaKennels from './defs/ranka_kennels.json';
import rankaTheRuns from './defs/ranka_the_runs.json';
import kolbrunCount from './defs/kolbrun_count.json';
import kolbrunTheWolves from './defs/kolbrun_the_wolves.json';
import espenStaves from './defs/espen_staves.json';
import marenPhysic from './defs/maren_physic.json';
import torgerSeam from './defs/torger_seam.json';
import sylviDrove from './defs/sylvi_drove.json';
import northguardGate from './defs/northguard_gate.json';
import oddTheRow from './defs/odd_the_row.json';
import qTheColdSignsOffer from './defs/q_the_cold_signs_offer.json';
import qTheColdSignsTurnin from './defs/q_the_cold_signs_turnin.json';
import qTheNorthCountOffer from './defs/q_the_north_count_offer.json';
import qTheNorthCountTurnin from './defs/q_the_north_count_turnin.json';
import sawyerFloor from './defs/sawyer_floor.json';
import groaTheGap from './defs/groa_the_gap.json';
import osprenCarefulWords from './defs/ospren_careful_words.json';
import hallaTheStoneAsk from './defs/halla_the_stone_ask.json';
import saltwatchLamp from './defs/saltwatch_lamp.json';
import fisherCrews from './defs/fisher_crews.json';
// THE FELL ANSWERS — Hartfell coverage: the rota-of-uncles and the
// herders speak, and the tithe arc's flags finally get read back.
import fellwatchHorn from './defs/fellwatch_horn.json';
import herderFolds from './defs/herder_folds.json';
// THE DELF AND THE CELLAR SPEAK — Kingsdelf's wall, shifts, and kilns
// get their pooled throats, and the Low Hall's steel and legs answer.
import delfwatchWall from './defs/delfwatch_wall.json';
import delverShift from './defs/delver_shift.json';
import glasshandKilns from './defs/glasshand_kilns.json';
import companyBladePost from './defs/company_blade_post.json';
import companyRunnerLegs from './defs/company_runner_legs.json';
// THE COURT PAYS ITS DEBTS — Evenfall's five quests get the turn-ins
// they shipped without, the letter walk gets its three scenes, and the
// six silent masters of the Fair Court finally speak.
import qTheLettersWestTurnin from './defs/q_the_letters_west_turnin.json';
import qTheFirstFocusTurnin from './defs/q_the_first_focus_turnin.json';
import qABowOfTheWoodTurnin from './defs/q_a_bow_of_the_wood_turnin.json';
import qTheQuietRoadTurnin from './defs/q_the_quiet_road_turnin.json';
import qWhatTheSongHoldsTurnin from './defs/q_what_the_song_holds_turnin.json';
import serelTheAddress from './defs/serel_the_address.json';
import elarinTheLetter from './defs/elarin_the_letter.json';
import aldarenTheLetter from './defs/aldaren_the_letter.json';
import sylwenTheLeave from './defs/sylwen_the_leave.json';
import dennaTheListening from './defs/denna_the_listening.json';
import serelGate from './defs/serel_gate.json';
import naiaStillroom from './defs/naia_stillroom.json';
import faelarForge from './defs/faelar_forge.json';
import myrrenSilks from './defs/myrren_silks.json';
import selorneGlass from './defs/selorne_glass.json';
import othielKeeping from './defs/othiel_keeping.json';
// THE CAPITAL'S CROWD FINDS ITS THROAT — Silverfall's 35 silent
// placements speak, and the errand quests get their responder scenes.
import gatewatchEdge from './defs/gatewatch_edge.json';
import castleguardSteel from './defs/castleguard_steel.json';
import servantStairs from './defs/servant_stairs.json';
import galleriaPatter from './defs/galleria_patter.json';
import mongerCries from './defs/monger_cries.json';
import jossRounds from './defs/joss_rounds.json';
import pikeRoofs from './defs/pike_roofs.json';
import odeleTheTithe from './defs/odele_the_tithe.json';
import kestrelTheSweeping from './defs/kestrel_the_sweeping.json';
import runaTheStamp from './defs/runa_the_stamp.json';
// THE PEOPLE OF THE VALE (docs/silverfall-vale-plan.md Phase 6).
import brantStones from './defs/brant_stones.json';
import heddaOvens from './defs/hedda_ovens.json';
import ulfClimb from './defs/ulf_climb.json';
import ronnaugTallies from './defs/ronnaug_tallies.json';
import signeWheel from './defs/signe_wheel.json';
import wickTaper from './defs/wick_taper.json';
import finnAwl from './defs/finn_awl.json';
import torvaldAxles from './defs/torvald_axles.json';
import maeveLanterns from './defs/maeve_lanterns.json';
import aldousTerrace from './defs/aldous_terrace.json';
import briggaFarShore from './defs/brigga_far_shore.json';
// THE SAND AND THE ROAR (docs/arena-plan.md Phase 5) — the counters.
import catoRing from './defs/cato_ring.json';
import serleRing from './defs/serle_ring.json';
import holmReeds from './defs/holm_reeds.json';
import unaSteam from './defs/una_steam.json';
import sorenCharter from './defs/soren_charter.json';
import petyaSlab from './defs/petya_slab.json';
import lucanBoards from './defs/lucan_boards.json';
import varnGate from './defs/varn_gate.json';
import pipErrands from './defs/pip_errands.json';

const SOURCES: readonly unknown[] = [
  brantStones,
  heddaOvens,
  ulfClimb,
  ronnaugTallies,
  signeWheel,
  wickTaper,
  finnAwl,
  torvaldAxles,
  maeveLanterns,
  aldousTerrace,
  briggaFarShore,
  holmReeds,
  unaSteam,
  sorenCharter,
  petyaSlab,
  lucanBoards,
  varnGate,
  pipErrands,
  gatewatchEdge,
  castleguardSteel,
  servantStairs,
  galleriaPatter,
  mongerCries,
  jossRounds,
  pikeRoofs,
  odeleTheTithe,
  kestrelTheSweeping,
  runaTheStamp,
  qTheLettersWestTurnin,
  qTheFirstFocusTurnin,
  qABowOfTheWoodTurnin,
  qTheQuietRoadTurnin,
  qWhatTheSongHoldsTurnin,
  serelTheAddress,
  elarinTheLetter,
  aldarenTheLetter,
  sylwenTheLeave,
  dennaTheListening,
  serelGate,
  naiaStillroom,
  faelarForge,
  myrrenSilks,
  selorneGlass,
  othielKeeping,
  fellwatchHorn,
  herderFolds,
  delfwatchWall,
  delverShift,
  glasshandKilns,
  companyBladePost,
  companyRunnerLegs,
  viggaSteel,
  viggaTheCutting,
  ebbaCharter,
  nialStores,
  ylvaSteps,
  kettilBoom,
  oddNursery,
  pinewatchRota,
  stellanPass,
  bergetWall,
  oveDrill,
  rankaKennels,
  rankaTheRuns,
  kolbrunCount,
  kolbrunTheWolves,
  espenStaves,
  marenPhysic,
  torgerSeam,
  sylviDrove,
  northguardGate,
  oddTheRow,
  qTheColdSignsOffer,
  qTheColdSignsTurnin,
  qTheNorthCountOffer,
  qTheNorthCountTurnin,
  haldisCircuit,
  sawyerFloor,
  groaTheGap,
  osprenCarefulWords,
  hallaTheStoneAsk,
  saltwatchLamp,
  fisherCrews,
  wrenAwakening,
  wrenGreen,
  hallaArms,
  hallaYard,
  hallaWatchUrgent,
  hallaWatchUneasy,
  hallaWatchRelief,
  rillBow,
  rillRange,
  varnSpark,
  varnCircle,
  berritHearth,
  berritTable,
  alderAxe,
  alderCopse,
  otteryBench,
  otteryShop,
  gillyStones,
  gillyCommon,
  weirLine,
  weirPier,
  brammelGate,
  sorrelStalls,
  qFirstLightOffer,
  qFirstLightTurnin,
  qTheMeadowCountOffer,
  qTheMeadowCountTurnin,
  qShellsOnTheBankOffer,
  qShellsOnTheBankTurnin,
  qTheLastNestOffer,
  qTheLastNestTurnin,
  qBerriesForThePotOffer,
  qBerriesForThePotTurnin,
  qABirdDoneProperOffer,
  qABirdDoneProperTurnin,
  qALineInTheWaterOffer,
  qALineInTheWaterTurnin,
  qTheAxeRemembersOffer,
  qTheAxeRemembersTurnin,
  qBoardsAndTwineOffer,
  qBoardsAndTwineTurnin,
  qABarOfBronzeOffer,
  qABarOfBronzeTurnin,
  qEggsForTheMorningOffer,
  qEggsForTheMorningTurnin,
  qTheGentleHandOffer,
  qTheGentleHandTurnin,
  qWalkingTheBoundsOffer,
  qWalkingTheBoundsTurnin,
  qTheFirstRoadOffer,
  qTheFirstRoadTurnin,
  qStillWatersOffer,
  qStillWatersTurnin,
  qTheMeadowKeepsCountOffer,
  qTheMeadowKeepsCountTurnin,
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
  wayfarerCamp,
  waywardRoad,
  // THE TOWN FEELS IT (living-frontier Phase 3): threat-gated watch
  // trees layered by priority over each throat's standing voice —
  // urgent (8, world:threat_bold) > uneasy (7, world:threat_near) >
  // relief (6, world:relief) > the evergreen default.
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
  orlaKeywright,
  // THE QUEST LEDGER: per-quest offer trees (priority 5 — world news
  // and once-intros outrank a job pitch) and turn-in trees (21 — a
  // finished errand is the player's earned moment), all gated on the
  // synthetic quest: answers so they appear and retire themselves.
  q_theGateBook_offer,
  q_theGateBook_turnin,
  q_theDelfLadder_offer,
  q_theDelfLadder_turnin,
  q_clothForTheCounting_offer,
  q_clothForTheCounting_turnin,
  q_leatherOnTheFrame_offer,
  q_leatherOnTheFrame_turnin,
  q_aDoseOfSense_offer,
  q_aDoseOfSense_turnin,
  q_theMakersMark_offer,
  q_theMakersMark_turnin,
  q_flourAndWater_offer,
  q_flourAndWater_turnin,
  q_theAmberWater_offer,
  q_theAmberWater_turnin,
  q_theFreeFurrows_offer,
  q_theFreeFurrows_turnin,
  q_aStallSweptClean_offer,
  q_aStallSweptClean_turnin,
  q_theTableLaid_offer,
  q_theTableLaid_turnin,
  q_theFordHolds_offer,
  q_theFordHolds_turnin,
  q_theWheelTurns_offer,
  q_theWheelTurns_turnin,
  rowanGate,
  rowanWren,
  rowanUnmarked,
  brayYard,
  swaleFrames,
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
  qTheLettersWestOffer,
  qTheFirstFocusOffer,
  qABowOfTheWoodOffer,
  qTheQuietRoadOffer,
  qWhatTheSongHoldsOffer,
  aldarenEvenhall,
  sylwenRoost,
  ilvaneFlame,
  maelisSong,
  aewynBows,
  vessaTable,
  elarinOutward,
  corwenGate,
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
  catoRing,
  serleRing,
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
