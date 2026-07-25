import type { RoutineDef } from './types.js';
import { validateRoutine } from './validate.js';

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
