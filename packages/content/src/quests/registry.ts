import type { QuestDef } from './types.js';
import { validateQuest } from './validate.js';

import theWetCount from './defs/the_wet_count.json';
import pastTheWardline from './defs/past_the_wardline.json';
import theColdSigns from './defs/the_cold_signs.json';
import theNorthCount from './defs/the_north_count.json';
import aNameForTheStone from './defs/a_name_for_the_stone.json';
import resinForTheRoad from './defs/resin_for_the_road.json';
import wordOnTheRoad from './defs/word_on_the_road.json';
import theReaversMark from './defs/the_reavers_mark.json';
import namesInTheRegistry from './defs/names_in_the_registry.json';
import aWordFromTheCrown from './defs/a_word_from_the_crown.json';
import aSmithsErrand from './defs/a_smiths_errand.json';
import theLongWayRound from './defs/the_long_way_round.json';
import deepSeams from './defs/deep_seams.json';
import bonesForThePyre from './defs/bones_for_the_pyre.json';
import peltsForTheRoad from './defs/pelts_for_the_road.json';
import thinTheWarrens from './defs/thin_the_warrens.json';
import theStolenLedger from './defs/the_stolen_ledger.json';
import theBrothersTools from './defs/the_brothers_tools.json';
import theDigmastersDue from './defs/the_digmasters_due.json';
import namesForTheStone from './defs/names_for_the_stone.json';
import theStarwardDig from './defs/the_starward_dig.json';
import theKingsPeace from './defs/the_kings_peace.json';
import theQueensFord from './defs/the_queens_ford.json';
import theLampsOfTheLine from './defs/the_lamps_of_the_line.json';
import theSilverLine from './defs/the_silver_line.json';
import aQuietWord from './defs/a_quiet_word.json';
import theGildedCage from './defs/the_gilded_cage.json';
import theArrangement from './defs/the_arrangement.json';
import embersOfTheShrine from './defs/embers_of_the_shrine.json';
import theSistersLamp from './defs/the_sisters_lamp.json';
import worgsong from './defs/worgsong.json';
import theMatriarch from './defs/the_matriarch.json';
import theBearOfTheSpine from './defs/the_bear_of_the_spine.json';
import steelForTheStair from './defs/steel_for_the_stair.json';
import threadsOfTheRow from './defs/threads_of_the_row.json';
import theSilverSetting from './defs/the_silver_setting.json';
import theLastPatrol from './defs/the_last_patrol.json';
// Factions Phase 3 (docs/factions-plan.md): THE ROAD BACK — penance
// work, visible only to the disgraced (faction: atmost:suspect gates),
// paying standing instead of coin.
import theBadColumn from './defs/the_bad_column.json';
import theCrownsCount from './defs/the_crowns_count.json';
import shortHanded from './defs/short_handed.json';
// Factions Phase 4: THE TWO ROADS — the Company's low road (gated on
// standing above outlaw with the reavers; opposition costs authored in
// rewards.standing, stated plainly in the offers) and the charter's
// answering side of the one opposed pair.
import theRedMark from './defs/the_red_mark.json';
import theLeanWinter from './defs/the_lean_winter.json';
import tollOwed from './defs/toll_owed.json';
import theRedHand from './defs/the_red_hand.json';
import theLowRoadRuns from './defs/the_low_road_runs.json';
import theUndercut from './defs/the_undercut.json';
import bootsForBlades from './defs/boots_for_blades.json';
import theHerdStands from './defs/the_herd_stands.json';

/**
 * Every authored quest JSON, registered here. A def that isn't listed
 * doesn't exist — quests.test.ts walks the defs/ directory and fails
 * if a file is missing from this roster.
 */
import theEmptyFold from './defs/the_empty_fold.json';
import theUnansweredTithe from './defs/the_unanswered_tithe.json';
import theOpenedBarrow from './defs/the_opened_barrow.json';
import tallowForTheLamps from './defs/tallow_for_the_lamps.json';
// Kingsdelf — the errands (the Kingsdelf epic).
import theCountBelow from './defs/the_count_below.json';
import lightTheOldRoad from './defs/light_the_old_road.json';
import theLettersWest from './defs/the_letters_west.json';
import theFirstFocus from './defs/the_first_focus.json';
import aBowOfTheWood from './defs/a_bow_of_the_wood.json';
import theQuietRoad from './defs/the_quiet_road.json';
import whatTheSongHolds from './defs/what_the_song_holds.json';
import theCrownAsks from './defs/the_crown_asks.json';
import aStallInAsh from './defs/a_stall_in_ash.json';
import whatTheNetHeld from './defs/what_the_net_held.json';
import theFifteenthName from './defs/the_fifteenth_name.json';

import firstLight from './defs/first_light.json';
import theMeadowCount from './defs/the_meadow_count.json';
import shellsOnTheBank from './defs/shells_on_the_bank.json';
import theLastNest from './defs/the_last_nest.json';
import berriesForThePot from './defs/berries_for_the_pot.json';
import aBirdDoneProper from './defs/a_bird_done_proper.json';
import aLineInTheWater from './defs/a_line_in_the_water.json';
import theAxeRemembers from './defs/the_axe_remembers.json';
import boardsAndTwine from './defs/boards_and_twine.json';
import aBarOfBronze from './defs/a_bar_of_bronze.json';
import eggsForTheMorning from './defs/eggs_for_the_morning.json';
import theGateBook from './defs/the_gate_book.json';
import theDelfLadder from './defs/the_delf_ladder.json';
import clothForTheCounting from './defs/cloth_for_the_counting.json';
import leatherOnTheFrame from './defs/leather_on_the_frame.json';
import aDoseOfSense from './defs/a_dose_of_sense.json';
import theMakersMark from './defs/the_makers_mark.json';
import flourAndWater from './defs/flour_and_water.json';
import theAmberWater from './defs/the_amber_water.json';
import theFreeFurrows from './defs/the_free_furrows.json';
import aStallSweptClean from './defs/a_stall_swept_clean.json';
import theTableLaid from './defs/the_table_laid.json';
import theFordHolds from './defs/the_ford_holds.json';
import theWheelTurns from './defs/the_wheel_turns.json';
import theGentleHand from './defs/the_gentle_hand.json';
import walkingTheBounds from './defs/walking_the_bounds.json';
import theFirstRoad from './defs/the_first_road.json';
import stillWaters from './defs/still_waters.json';
import theMeadowKeepsCount from './defs/the_meadow_keeps_count.json';
// THE CONTESTED LANDS band 7 — THE CAUSEWAY OR THE SLUICE (plan §3.1):
// the fork at the fen waist as two opposed two-link chains, the
// Charter's ledger carry and the obstruction bill behind them.
import stakesInTheWaist from './defs/stakes_in_the_waist.json';
import theLevyPosted from './defs/the_levy_posted.json';
import theOldGate from './defs/the_old_gate.json';
import theGreenRoad from './defs/the_green_road.json';
import theLedgerLine from './defs/the_ledger_line.json';
import theObstructionBill from './defs/the_obstruction_bill.json';
// THE CONTESTED LANDS band 8 — THE HUSK AND THE WARD LINE (plan §3.2,
// §3.3): two forks north of Dawnmead, each two opposed two-link chains.
// THE PACK OR THE SQUAT: the drover's cull of the veil pack against the
// sergeant's breaking of the gnoll squat in the order's struck tower.
import woolCount from './defs/wool_count.json';
import theFleece from './defs/the_fleece.json';
import theTowersDebt from './defs/the_towers_debt.json';
import theOrderPays from './defs/the_order_pays.json';
// THE THREAD OR THE AXE: the Court's thread carried past its three grey
// stones and stood at dusk, against the Charter's licensed cut of the
// dying stand inside it.
import keepTheThread from './defs/keep_the_thread.json';
import theStoneAtDusk from './defs/the_stone_at_dusk.json';
import theGreyRoot from './defs/the_grey_root.json';
import theFullTally from './defs/the_full_tally.json';
// THE CONTESTED LANDS band 9e — THE COURSE AND THE COUNT (plan §11.6;
// band9d/blockout.md §6; rulings R-E, R-G): the Dolmen's errand and the
// third corner by reads only. FORTY STONES (the coursemother, daily,
// forbids `course_broken`), THE CARTER'S PRICE (the Charter's coin road,
// open once the levy is posted) and BLACK STONE (the Culm's stone for
// stone, shut to the causeway's character). No faction pays the Dolmen;
// the count is the pay.
import fortyStones from './defs/forty_stones.json';
import theCarterPrice from './defs/the_carter_price.json';
import blackStone from './defs/black_stone.json';

const SOURCES: readonly unknown[] = [
  theWetCount,
  pastTheWardline,
  aNameForTheStone,
  resinForTheRoad,
  // PINEWATCH REMADE — the listening quest and the pass cull.
  theColdSigns,
  theNorthCount,
  // THE DAWN REMADE — the starter slate: four soft paths, every lesson
  // a real errand, and the one final quest that opens the road east.
  firstLight,
  theMeadowCount,
  shellsOnTheBank,
  theLastNest,
  berriesForThePot,
  aBirdDoneProper,
  aLineInTheWater,
  theAxeRemembers,
  boardsAndTwine,
  aBarOfBronze,
  eggsForTheMorning,
  theGentleHand,
  walkingTheBounds,
  theFirstRoad,
  // THE FORD COMES HOME — Amberford's first working days: the arrival,
  // the forge lane, the row, the table, and the dusk-watch capstone.
  theGateBook,
  theDelfLadder,
  clothForTheCounting,
  leatherOnTheFrame,
  aDoseOfSense,
  theMakersMark,
  flourAndWater,
  theAmberWater,
  theFreeFurrows,
  aStallSweptClean,
  theTableLaid,
  theFordHolds,
  theWheelTurns,
  stillWaters,
  theMeadowKeepsCount,
  // The Redmask arc — Amberford's road war, gated link by link.
  wordOnTheRoad,
  theReaversMark,
  namesInTheRegistry,
  aWordFromTheCrown,
  // Skill-gated work.
  aSmithsErrand,
  theLongWayRound,
  deepSeams,
  // Standing work — repeatables on their own cooldowns.
  bonesForThePyre,
  peltsForTheRoad,
  thinTheWarrens,
  // Penance work — the road back for the disgraced (factions Phase 3).
  theBadColumn,
  theCrownsCount,
  shortHanded,
  // The two roads — the Company's work and the charter's answer.
  theRedMark,
  theLeanWinter,
  tollOwed,
  theRedHand,
  theLowRoadRuns,
  theUndercut,
  bootsForBlades,
  theHerdStands,
  // THE CAUSEWAY OR THE SLUICE (contested lands band 7): side A is the
  // Charter's dike (stakes, then the levy), side B is the crofters' gate
  // (boards, then the corn); each offer tree forbids the other side by
  // quest state, both sides stamp fen_side_taken, and the two
  // repeatables behind them are the ledger's carry and the Charter's bill.
  stakesInTheWaist,
  theLevyPosted,
  theOldGate,
  theGreenRoad,
  theLedgerLine,
  theObstructionBill,
  // THE HUSK AND THE WARD LINE (contested lands band 8). North: side A
  // is the drover's count and cull (the flag objective reads the veil
  // den's own clearedFlag) then the pelts for her lining; side B is the
  // sergeant's squat broken by day, the apron held with his lamp through
  // the changeover, and the order's grey carried back to Hale's post.
  // North-west: side A carries the Court's four lengths past the three
  // grey stones and stands the head stone at dusk; side B takes Bodil's
  // licence and fells inside the thread for Alder's yard, then posts the
  // tally at Margit's stall. Each offer tree forbids the other side by
  // quest state; ward_line_taken stamps on both closing links of the
  // north-west pair and names no side.
  woolCount,
  theFleece,
  theTowersDebt,
  theOrderPays,
  keepTheThread,
  theStoneAtDusk,
  theGreyRoot,
  theFullTally,
  fortyStones,
  theCarterPrice,
  blackStone,
  // Item-borne: the torn page starts it; nobody offers it.
  theStolenLedger,
  // The Sealed Galleries — Grettir's brother's crew, closed at last.
  theBrothersTools,
  theDigmastersDue,
  namesForTheStone,
  theStarwardDig,
  // The Crown's Peace — what the audience earned you.
  theKingsPeace,
  theQueensFord,
  theLampsOfTheLine,
  theSilverLine,
  // The Rookery — the city's shadows, kept orderly.
  aQuietWord,
  theGildedCage,
  theArrangement,
  // The Mother-Flame — the road-faith, sister to sister.
  embersOfTheShrine,
  theSistersLamp,
  // Fang and Fur — the wilds ladder, Hask's counter to Pike's roof.
  worgsong,
  theMatriarch,
  theBearOfTheSpine,
  // The Makers' Marks — the trade districts pay for good hands.
  steelForTheStair,
  threadsOfTheRow,
  theSilverSetting,
  // Item-borne: a dead Waykeeper's letter, still promising the thaw.
  theLastPatrol,
  theEmptyFold,
  theUnansweredTithe,
  theOpenedBarrow,
  tallowForTheLamps,
  theCountBelow,
  lightTheOldRoad,
  theLettersWest,
  theFirstFocus,
  aBowOfTheWood,
  theQuietRoad,
  whatTheSongHolds,
  theCrownAsks,
  aStallInAsh,
  whatTheNetHeld,
  theFifteenthName,
];

function buildRegistry(): ReadonlyMap<string, QuestDef> {
  const map = new Map<string, QuestDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateQuest(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.quest.id)) errors.push(`${res.quest.id}: duplicate quest id`);
    else map.set(res.quest.id, res.quest);
  }
  // Cross-def gates need the whole roster: a prerequisite that names a
  // quest nobody shipped would lock its dependents away in silence.
  for (const quest of map.values()) {
    for (const req of quest.requires?.quests ?? []) {
      if (!map.has(req)) errors.push(`${quest.id}: requires unknown quest '${req}'`);
    }
  }
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid quest defs:\n  ${errors.join('\n  ')}`);
  return map;
}

export const QUESTS: ReadonlyMap<string, QuestDef> = buildRegistry();

export function questDef(id: string): QuestDef | undefined {
  return QUESTS.get(id);
}
