import type { QuestDef } from './types.js';
import { validateQuest } from './validate.js';

import hobbsHens from './defs/hobbs_hens.json';
import thinTheMeadow from './defs/thin_the_meadow.json';

/**
 * Every authored quest JSON, registered here. A def that isn't listed
 * doesn't exist — quests.test.ts walks the defs/ directory and fails
 * if a file is missing from this roster.
 */
const SOURCES: readonly unknown[] = [
  hobbsHens,
  thinTheMeadow,
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
