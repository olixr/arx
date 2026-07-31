import type { RoutineDef } from './types.js';
import { validateRoutine } from './validate.js';

import croftReeve from './defs/croft_reeve.json';
import croftTrader from './defs/croft_trader.json';
import croftVeteran from './defs/croft_veteran.json';
import fallBursar from './defs/fall_bursar.json';
import fallCook from './defs/fall_cook.json';
import fallEnchantress from './defs/fall_enchantress.json';
import fallForeman from './defs/fall_foreman.json';
import fallForgemistress from './defs/fall_forgemistress.json';
import fallGardener from './defs/fall_gardener.json';
import fallHerbalist from './defs/fall_herbalist.json';
import fallHostler from './defs/fall_hostler.json';
import fallMarshal from './defs/fall_marshal.json';
import fallMason from './defs/fall_mason.json';
import fallShrinekeeper from './defs/fall_shrinekeeper.json';
import fallTrader from './defs/fall_trader.json';
import fallWarden from './defs/fall_warden.json';
import fallWatch from './defs/fall_watch.json';
import fallWatchPostern from './defs/fall_watch_postern.json';
import fallWatchMuster from './defs/fall_watch_muster.json';
import fallWeaver from './defs/fall_weaver.json';
import fallKing from './defs/fall_king.json';
import fallQueen from './defs/fall_queen.json';
import fallCastleGuard from './defs/fall_castle_guard.json';
import fallSmeltmaster from './defs/fall_smeltmaster.json';
import fallAssayer from './defs/fall_assayer.json';
import fallCarpenter from './defs/fall_carpenter.json';
import fallCooper from './defs/fall_cooper.json';
import fallFletcher from './defs/fall_fletcher.json';
import fallSilversmith from './defs/fall_silversmith.json';
import fallScrivener from './defs/fall_scrivener.json';
import fallInnkeep from './defs/fall_innkeep.json';
import fallMagpie from './defs/fall_magpie.json';
import fallFence from './defs/fall_fence.json';
import fallLookout from './defs/fall_lookout.json';
import amberArtisan from './defs/amber_artisan.json';
import amberBanker from './defs/amber_banker.json';
import amberCaptain from './defs/amber_captain.json';
import amberWatch from './defs/amber_watch.json';
import amberCourier from './defs/amber_courier.json';
import amberFarmer from './defs/amber_farmer.json';
import amberFarmwife from './defs/amber_farmwife.json';
import amberFerryman from './defs/amber_ferryman.json';
import amberGrocer from './defs/amber_grocer.json';
import amberInnkeep from './defs/amber_innkeep.json';
import amberKeeper from './defs/amber_keeper.json';
import amberMiller from './defs/amber_miller.json';
import amberOrchardist from './defs/amber_orchardist.json';
import amberOutfitter from './defs/amber_outfitter.json';
import amberSage from './defs/amber_sage.json';
import amberSmith from './defs/amber_smith.json';
import amberTraderA from './defs/amber_trader_a.json';
import amberTraderB from './defs/amber_trader_b.json';
import dawnmeadFarmhand from './defs/dawnmead_farmhand.json';
import greenScamp from './defs/green_scamp.json';
import saltPortreeve from './defs/salt_portreeve.json';
import saltFactor from './defs/salt_factor.json';
import saltInnkeep from './defs/salt_innkeep.json';
import saltChandler from './defs/salt_chandler.json';
import saltSalter from './defs/salt_salter.json';
import saltSmoke from './defs/salt_smoke.json';
import saltAngler from './defs/salt_angler.json';
import saltBoatwright from './defs/salt_boatwright.json';
import saltRoper from './defs/salt_roper.json';
import saltBeacon from './defs/salt_beacon.json';
import saltPilot from './defs/salt_pilot.json';
import saltWatchGate from './defs/salt_watch_gate.json';
import saltWatchSquare from './defs/salt_watch_square.json';
import saltWatchQuay from './defs/salt_watch_quay.json';
import saltFisherPiers from './defs/salt_fisher_piers.json';
import saltFisherYard from './defs/salt_fisher_yard.json';
import saltFisherEast from './defs/salt_fisher_east.json';
import hearthHours from './defs/hearth_hours.json';
import rowanHours from './defs/rowan_hours.json';
import tinkerHours from './defs/tinker_hours.json';
import wardenRounds from './defs/warden_rounds.json';
import waystationKeeper from './defs/waystation_keeper.json';

/**
 * Every authored routine JSON, registered here. A def that isn't
 * listed doesn't exist — routines.test.ts walks the defs/ directory
 * and fails if a file is missing from this roster, so forgetting the
 * import is a test failure, not a silent hole in someone's day.
 */
const SOURCES: readonly unknown[] = [
  croftReeve,
  croftTrader,
  croftVeteran,
  fallBursar,
  fallCook,
  fallEnchantress,
  fallForeman,
  fallForgemistress,
  fallGardener,
  fallHerbalist,
  fallHostler,
  fallMarshal,
  fallMason,
  fallShrinekeeper,
  fallTrader,
  fallWarden,
  fallWatch,
  fallWatchPostern,
  fallWatchMuster,
  fallWeaver,
  fallKing,
  fallQueen,
  fallCastleGuard,
  fallSmeltmaster,
  fallAssayer,
  fallCarpenter,
  fallCooper,
  fallFletcher,
  fallSilversmith,
  fallScrivener,
  fallInnkeep,
  fallMagpie,
  fallFence,
  fallLookout,
  amberArtisan,
  amberBanker,
  amberCaptain,
  amberWatch,
  amberCourier,
  amberFarmer,
  amberFarmwife,
  amberFerryman,
  amberGrocer,
  amberInnkeep,
  amberKeeper,
  amberMiller,
  amberOrchardist,
  amberOutfitter,
  amberSage,
  amberSmith,
  amberTraderA,
  amberTraderB,
  dawnmeadFarmhand,
  greenScamp,
  saltPortreeve,
  saltFactor,
  saltInnkeep,
  saltChandler,
  saltSalter,
  saltSmoke,
  saltAngler,
  saltBoatwright,
  saltRoper,
  saltBeacon,
  saltPilot,
  saltWatchGate,
  saltWatchSquare,
  saltWatchQuay,
  saltFisherPiers,
  saltFisherYard,
  saltFisherEast,
  hearthHours,
  rowanHours,
  tinkerHours,
  wardenRounds,
  waystationKeeper,
];

function buildRegistry(): ReadonlyMap<string, RoutineDef> {
  const map = new Map<string, RoutineDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateRoutine(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.routine.id)) errors.push(`${res.routine.id}: duplicate routine id`);
    else map.set(res.routine.id, res.routine);
  }
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid routine defs:\n  ${errors.join('\n  ')}`);
  return map;
}

export const ROUTINES: ReadonlyMap<string, RoutineDef> = buildRegistry();

export function routineDef(id: string): RoutineDef | undefined {
  return ROUTINES.get(id);
}
