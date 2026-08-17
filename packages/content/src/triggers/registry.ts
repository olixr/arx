import town_amberford from './defs/town_amberford.json';
import town_dawnmead from './defs/town_dawnmead.json';
import town_evenfall from './defs/town_evenfall.json';
import town_hartfell from './defs/town_hartfell.json';
import town_kingsdelf from './defs/town_kingsdelf.json';
import town_pinewatch from './defs/town_pinewatch.json';
import town_saltmere from './defs/town_saltmere.json';
import town_silverfall from './defs/town_silverfall.json';
import type { TriggerDef } from './types.js';
import { validateTrigger } from './validate.js';

/**
 * THE WATCHFUL GROUND's authored roster (docs/triggers-plan.md).
 * One file per def, filename = id, explicit imports (the routines
 * law: authored content is code — a bad def fails the build, loudly).
 * Zone existence is a live-world fact and is checked at compile time
 * on the server, not here.
 */
const SOURCES: unknown[] = [
  // The town watch line (THE WATCH KNOWS YOUR FACE): every walled or
  // watched town's own zone, both edges, one 'town' event.
  town_dawnmead,
  town_amberford,
  town_silverfall,
  town_saltmere,
  town_pinewatch,
  town_hartfell,
  town_evenfall,
  town_kingsdelf,
];

function buildRegistry(): ReadonlyMap<string, TriggerDef> {
  const out = new Map<string, TriggerDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateTrigger(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (out.has(res.def.id)) {
      errors.push(`${res.def.id}: duplicate trigger id`);
      continue;
    }
    out.set(res.def.id, res.def);
  }
  if (errors.length > 0) {
    throw new Error(`trigger registry failed validation:\n  ${errors.join('\n  ')}`);
  }
  return out;
}

export const TRIGGERS: ReadonlyMap<string, TriggerDef> = buildRegistry();

export function triggerDef(id: string): TriggerDef | undefined {
  return TRIGGERS.get(id);
}
