import type { RoutineDef } from './types.js';
import { validateRoutine } from './validate.js';

import amberArtisan from './defs/amber_artisan.json';
import amberBanker from './defs/amber_banker.json';
import amberCaptain from './defs/amber_captain.json';
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
import dawnmeadFarmhand from './defs/dawnmead_farmhand.json';
import greenScamp from './defs/green_scamp.json';
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
  amberArtisan,
  amberBanker,
  amberCaptain,
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
  dawnmeadFarmhand,
  greenScamp,
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
