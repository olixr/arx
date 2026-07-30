/**
 * THE QUEST ANSWERS — the `quest:` flag namespace.
 *
 * A `quest:` flag is SYNTHETIC, exactly like `world:` (worldFlags.ts):
 * never stored, never set, never cleared. At the moment a conversation
 * opens (and again at every choice gate) the server answers it live
 * from the asking player's quest ledger — so an offer tree appears the
 * tick a quest becomes takeable and a turn-in choice retires itself the
 * instant the reward is paid, with nothing written anywhere.
 *
 * Grammar (the whole namespace):
 *
 *   quest:<quest_id>:available   offerable now: gates pass, not active,
 *                                never done (or repeatable off cooldown)
 *   quest:<quest_id>:active      accepted and underway (not yet ready)
 *   quest:<quest_id>:ready       final stage satisfied — turn-in time
 *   quest:<quest_id>:done        completed at least once
 *   quest:<quest_id>:stage:<stage_id>   active and on the named stage
 *
 * Authors may READ these in requires/forbids; nobody may ever `set`
 * one. The durable ledger a completion leaves behind is the `qst:<id>`
 * flag (value = completions), stamped server-side at turn-in — that one
 * rides the ordinary flag store for deed rails and cross-system gates,
 * and is deliberately NOT authorable either (spell `quest:<id>:done`).
 */

export const QUEST_FLAG_PREFIX = 'quest:';

export function isQuestFlag(flag: string): boolean {
  return flag.startsWith(QUEST_FLAG_PREFIX);
}

/** The full grammar — a typo dies in validation, never gates in silence. */
export const QUEST_FLAG_RE =
  /^quest:([a-z][a-z0-9_]*):(available|active|ready|done|stage:[a-z][a-z0-9_]*)$/;

export interface ParsedQuestFlag {
  quest: string;
  state: 'available' | 'active' | 'ready' | 'done' | 'stage';
  /** Present only when state === 'stage'. */
  stage?: string;
}

export function parseQuestFlag(flag: string): ParsedQuestFlag | null {
  const m = QUEST_FLAG_RE.exec(flag);
  if (!m) return null;
  const quest = m[1]!;
  const rest = m[2]!;
  if (rest.startsWith('stage:')) return { quest, state: 'stage', stage: rest.slice(6) };
  return { quest, state: rest as ParsedQuestFlag['state'] };
}

/**
 * The durable completion flag a finished quest records (value =
 * completions). Server-stamped only; the dialogue dialect can't spell
 * it — trees read `quest:<id>:done` instead.
 */
export const QUEST_DONE_FLAG_PREFIX = 'qst:';

export function questDoneFlag(id: string): string {
  return QUEST_DONE_FLAG_PREFIX + id;
}
