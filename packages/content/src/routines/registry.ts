import type { RoutineDef } from './types.js';
import { validateRoutine } from './validate.js';

import archPatrol from './defs/arch_patrol.json';
import dawnmeadFarmhand from './defs/dawnmead_farmhand.json';
import farmhandDay from './defs/farmhand_day.json';
import greenScamp from './defs/green_scamp.json';
import hearthHours from './defs/hearth_hours.json';
import plazaIdler from './defs/plaza_idler.json';
import roadWanderer from './defs/road_wanderer.json';
import rowanHours from './defs/rowan_hours.json';
import shopkeeperHours from './defs/shopkeeper_hours.json';
import smithDay from './defs/smith_day.json';
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
  archPatrol,
  dawnmeadFarmhand,
  farmhandDay,
  greenScamp,
  hearthHours,
  plazaIdler,
  roadWanderer,
  rowanHours,
  shopkeeperHours,
  smithDay,
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
