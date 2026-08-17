import type { SkillId } from '@arx/shared';
import { bandAtLeast } from './factions/factions.js';
import type { FactionBand } from './factions/types.js';
import type { TriggerEdge } from './triggers/types.js';

/**
 * THE WATCH KNOWS YOUR FACE (docs/triggers-plan.md Phase 2) — the
 * gate greeting slates and the one pure picker.
 *
 * Laws:
 * - VOICE.md bark register: one or two short plain sentences, present
 *   tense, the dash ban, watch diction. Guards are not wit-granted;
 *   these lines stay dutiful and warm, never quotable.
 * - THE POOL IS THE VARIETY: every eligible slate joins one weighted
 *   pool (specific slates weigh more), so the champion archer is
 *   USUALLY called out and sometimes just waved through. The last
 *   line a character heard steps aside when alternatives exist (the
 *   pickQuipClip no-repeat law).
 * - TOKENS RENDER AT PICK TIME: {town} and {name} resolve before the
 *   line leaves this module, so the bubble always speaks a whole
 *   sentence and the voice lane can transcript-match the exact words
 *   (THE BARK KEEPS ITS WORD). The day a name-bearing recording lands
 *   in the ledger, the same match lights it with zero code.
 * - Night-marked lines answer only after dark, and weigh double
 *   there; everything else serves around the clock.
 */

export interface GreetingLine {
  text: string;
  /** Pool weight (default 1). */
  w?: number;
  /** Serves only while the sun is down. */
  night?: boolean;
}

export interface GreetingFacts {
  edge: TriggerEdge;
  /** The town's display name ('Amberford'). */
  townName: string;
  /** The character's name, rendered into {name} lines. */
  playerName: string;
  /** True until the town's zone discovery is on the character's ledger. */
  firstVisit: boolean;
  /** The player's band with the town's faction (null off the political map). */
  band: FactionBand | null;
  /** The renowned craft, when one clears GREETING_FAME_LEVEL. */
  fameSkill: SkillId | null;
  night: boolean;
}

/** A craft this famous gets you named at the gate. */
export const GREETING_FAME_LEVEL = 75;

/** The crafts the watch has words for, fame ties broken in this order. */
export const GREETING_FAME_SKILLS: readonly SkillId[] = [
  'combat',
  'archery',
  'arx',
  'smithing',
  'mining',
  'fishing',
  'woodcutting',
  'cooking',
];

const ENTER_FIRST: readonly GreetingLine[] = [
  { text: 'Welcome to {town}, stranger. Keep your blade bound inside the walls.' },
  { text: 'New face at the gate. Welcome to {town}.' },
  { text: 'First time through this gate? Welcome to {town}.' },
  { text: 'Welcome to {town}, traveler. The watch keeps the peace here.' },
  { text: 'Come in, then. {town} takes all sorts.' },
];

const ENTER_RETURN: readonly GreetingLine[] = [
  { text: 'Welcome back to {town}.' },
  { text: 'Back again, {name}. Good to see you whole.' },
  { text: 'The gate knows your face. In you come.' },
  { text: 'Welcome back. The town stands as you left it.' },
  { text: 'Look who walks up. Come in out of the weather.' },
  { text: 'In you go, {name}. The watch has the wall.' },
];

const ENTER_TRUSTED: readonly GreetingLine[] = [
  { text: 'A trusted name walks in. Welcome back, {name}.', w: 2 },
  { text: '{town} rests easier with you inside the walls.', w: 2 },
  { text: 'The watch owes you a few, {name}. Pass friendly.', w: 2 },
];

const ENTER_CHAMPION: readonly GreetingLine[] = [
  { text: 'Make way at the gate. The champion comes through.', w: 3 },
  { text: 'Stand sharp. The champion of the town walks in.', w: 3 },
  { text: 'The best name in the watch ledger. Welcome back, {name}.', w: 3 },
];

const EXIT_LINES: readonly GreetingLine[] = [
  { text: 'Mind the road out there.' },
  { text: 'Safe travels, {name}.' },
  { text: 'Keep your steel close past the lamps.' },
  { text: 'Come back whole, you hear?' },
  { text: 'The wilds keep no peace like ours. Walk careful.' },
  { text: 'Fair roads to you.' },
  { text: 'Dark on the road tonight. Walk careful.', night: true, w: 2 },
  { text: 'The lamps end at the wall, {name}. Mind the dark.', night: true, w: 2 },
  { text: 'A night road is a bold choice. Keep your light up.', night: true, w: 2 },
];

const EXIT_TRUSTED: readonly GreetingLine[] = [
  { text: 'The watch will miss your shadow. Safe roads, {name}.', w: 2 },
  { text: 'Come back soon. The town is better for you.', w: 2 },
];

const FAME_LINES: Partial<Record<SkillId, readonly GreetingLine[]>> = {
  combat: [
    { text: 'A proven blade at the gate. Welcome back.', w: 3 },
    { text: 'The watch drills to fight like that one. Welcome in.', w: 3 },
  ],
  archery: [
    { text: 'That is the archer the fletchers talk about. Welcome back.', w: 3 },
    { text: 'Eyes like a hawk, that one. Welcome in.', w: 3 },
  ],
  arx: [
    { text: 'The wielder honors our gate. Walk that power in gently.', w: 3 },
    { text: 'Mind the sparks, friends. A true wielder passes.', w: 3 },
  ],
  smithing: [
    { text: 'The famous smith honors our gate. Welcome back.', w: 3 },
    { text: 'Word from the forges says your steel sings. Welcome in.', w: 3 },
  ],
  mining: [
    { text: 'The deep seams know that name. Welcome back.', w: 3 },
    { text: 'Half the ore in the yard came up under those hands. Welcome in.', w: 3 },
  ],
  fishing: [
    { text: 'The one who empties rivers. Welcome back.', w: 3 },
    { text: 'The fishmongers pray for your visits. Welcome in.', w: 3 },
  ],
  woodcutting: [
    { text: 'Half the beams in town fell to that axe. Welcome back.', w: 3 },
    { text: 'The timber yards speak that name kindly. Welcome in.', w: 3 },
  ],
  cooking: [
    { text: 'The favorite name in every kitchen. Welcome back.', w: 3 },
    { text: 'The inn still talks about your table. Welcome in.', w: 3 },
  ],
};

/** The full slate map, exported for the tests' line-law audit. */
export const GREETING_LINES = {
  enterFirst: ENTER_FIRST,
  enterReturn: ENTER_RETURN,
  enterTrusted: ENTER_TRUSTED,
  enterChampion: ENTER_CHAMPION,
  exit: EXIT_LINES,
  exitTrusted: EXIT_TRUSTED,
  fame: FAME_LINES,
} as const;

/**
 * The renowned craft: the highest skill clearing the fame bar among
 * the slated crafts, ties broken by the roster's own order. Takes a
 * level reader so callers stay pure.
 */
export function fameSkillOf(levelOf: (id: SkillId) => number): SkillId | null {
  let best: SkillId | null = null;
  let bestLevel = GREETING_FAME_LEVEL - 1;
  for (const id of GREETING_FAME_SKILLS) {
    const lvl = levelOf(id);
    if (lvl > bestLevel) {
      best = id;
      bestLevel = lvl;
    }
  }
  return best;
}

export function renderGreeting(text: string, facts: GreetingFacts): string {
  return text.replaceAll('{town}', facts.townName).replaceAll('{name}', facts.playerName);
}

/**
 * Pick one rendered greeting for the crossing, or null when no slate
 * serves (an edge the content does not speak to). `roll` is the
 * caller's die in [0,1); `lastText` is the line this character heard
 * last and steps aside when the pool holds an alternative.
 */
export function pickGreeting(
  facts: GreetingFacts,
  roll: number,
  lastText?: string,
): string | null {
  const pool: { text: string; w: number }[] = [];
  const add = (lines: readonly GreetingLine[] | undefined) => {
    if (!lines) return;
    for (const l of lines) {
      if (l.night && !facts.night) continue;
      pool.push({ text: renderGreeting(l.text, facts), w: l.w ?? 1 });
    }
  };
  if (facts.edge === 'enter') {
    add(facts.firstVisit ? ENTER_FIRST : ENTER_RETURN);
    if (!facts.firstVisit && facts.band && bandAtLeast(facts.band, 'trusted')) {
      add(ENTER_TRUSTED);
      if (bandAtLeast(facts.band, 'champion')) add(ENTER_CHAMPION);
    }
    if (!facts.firstVisit && facts.fameSkill) add(FAME_LINES[facts.fameSkill]);
  } else {
    add(EXIT_LINES);
    if (facts.band && bandAtLeast(facts.band, 'trusted')) add(EXIT_TRUSTED);
  }
  if (pool.length === 0) return null;
  const fresh = pool.filter((p) => p.text !== lastText);
  const served = fresh.length > 0 ? fresh : pool;
  const total = served.reduce((n, p) => n + p.w, 0);
  let at = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (const p of served) {
    at -= p.w;
    if (at < 0) return p.text;
  }
  return served[served.length - 1]!.text;
}
