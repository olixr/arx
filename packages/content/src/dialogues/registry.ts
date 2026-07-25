import { dialogueDoneFlag, type DialogueDef } from './types.js';
import { validateDialogue } from './validate.js';

import aldaWatch from './defs/alda_watch.json';
import gribBands from './defs/grib_bands.json';
import gribFriend from './defs/grib_friend.json';
import gribWary from './defs/grib_wary.json';
import guardPost from './defs/guard_post.json';
import hettyFarm from './defs/hetty_farm.json';
import marenPlaza from './defs/maren_plaza.json';
import marenWelcome from './defs/maren_welcome.json';
import tobbinWares from './defs/tobbin_wares.json';
import wayfarerCamp from './defs/wayfarer_camp.json';
import waywardRoad from './defs/wayward_road.json';

/**
 * Every authored dialogue JSON, registered here. A def that isn't
 * listed doesn't exist — dialogues.test.ts walks the defs/ directory
 * and fails if a file is missing from this roster.
 */
const SOURCES: readonly unknown[] = [
  aldaWatch,
  gribBands,
  gribFriend,
  gribWary,
  guardPost,
  hettyFarm,
  marenPlaza,
  marenWelcome,
  tobbinWares,
  wayfarerCamp,
  waywardRoad,
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
