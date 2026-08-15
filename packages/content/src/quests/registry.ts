import type { QuestDef } from './types.js';
import { validateQuest } from './validate.js';

import theWetCount from './defs/the_wet_count.json';
import pastTheWardline from './defs/past_the_wardline.json';
import aNameForTheStone from './defs/a_name_for_the_stone.json';
import resinForTheRoad from './defs/resin_for_the_road.json';
import hobbsHens from './defs/hobbs_hens.json';
import thinTheMeadow from './defs/thin_the_meadow.json';
import theLayOfTheLand from './defs/the_lay_of_the_land.json';
import wordOnTheRoad from './defs/word_on_the_road.json';
import theReaversMark from './defs/the_reavers_mark.json';
import namesInTheRegistry from './defs/names_in_the_registry.json';
import aWordFromTheCrown from './defs/a_word_from_the_crown.json';
import aSmithsErrand from './defs/a_smiths_errand.json';
import theLongWayRound from './defs/the_long_way_round.json';
import deepSeams from './defs/deep_seams.json';
import bonesForThePyre from './defs/bones_for_the_pyre.json';
import peltsForTheRoad from './defs/pelts_for_the_road.json';
import thePotNeverRests from './defs/the_pot_never_rests.json';
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

const SOURCES: readonly unknown[] = [
  theWetCount,
  pastTheWardline,
  aNameForTheStone,
  resinForTheRoad,
  // Dawnmead starters — ungated, one lesson each.
  hobbsHens,
  thinTheMeadow,
  theLayOfTheLand,
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
  thePotNeverRests,
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
