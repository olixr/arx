import town_amberford from './defs/town_amberford.json';
import town_dawnmead from './defs/town_dawnmead.json';
import town_evenfall from './defs/town_evenfall.json';
import town_hartfell from './defs/town_hartfell.json';
import town_kingsdelf from './defs/town_kingsdelf.json';
import town_pinewatch from './defs/town_pinewatch.json';
import town_saltmere from './defs/town_saltmere.json';
import town_silverfall from './defs/town_silverfall.json';
// THE HUSK AND THE WARD LINE (contested lands band 8): the five patches
// of watching ground the north's flag objectives read. Every `event`
// slug is the trigger's own id and no subscriber is needed: the server
// stamps `setFlag` before dispatch, and THE FLAG OBJECTIVE credits on
// the stamp.
import husk_breach_held from './defs/husk_breach_held.json';
import grey_one from './defs/grey_one.json';
import grey_two from './defs/grey_two.json';
import grey_three from './defs/grey_three.json';
import stone_dusk_stood from './defs/stone_dusk_stood.json';
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
  // THE HUSK AND THE WARD LINE (contested lands band 8, plan §3.2, §3.3).
  // The husk's apron, held with the sergeant's lamp until the line
  // stands: an exit after half past eight, having stood 75 s inside
  // (the changeover window), stamps husk_held once. The three grey
  // stones, entered with the Court's four lengths in the pack and the
  // thread uncut, stamp grey_one, grey_two, grey_three once each: three
  // places teach the line. The head stone by the road, stood from dusk
  // for two game hours and left before the wood is fully dark, stamps
  // glade_stood once. The husk's and the rest's anchors are golden, so
  // every rect is honest in world tiles.
  husk_breach_held,
  grey_one,
  grey_two,
  grey_three,
  stone_dusk_stood,
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
