/**
 * THE WORLD ANSWERS — the `world:` flag namespace (living-frontier
 * Phase 3, docs/living-frontier-plan.md §3.1).
 *
 * A `world:` flag is SYNTHETIC: never stored, never set, never cleared.
 * At the moment a conversation opens (and again at every choice gate),
 * the server answers it live from the frontier ledger around the
 * SPEAKER — the guard knows what stands within a watch of her post, not
 * what stands anywhere. Per-character flags stay the truth for
 * everything else; `world:` never touches the DB.
 *
 * The roster below is the whole namespace. The validator rejects any
 * `world:` flag not listed here — a typo must die in the Studio, not
 * gate a tree out forever in silence.
 */
export const WORLD_FLAGS: ReadonlySet<string> = new Set([
  /** A hostile site stands within the speaker's watch. */
  'world:threat_near',
  /** A stage-2+ (emboldened) site stands within the speaker's watch. */
  'world:threat_bold',
  /** Nothing hostile stands within the speaker's watch. */
  'world:calm',
  /**
   * Calm, AND a relax window still runs nearby — someone broke a camp
   * within living memory and the road audibly breathes. The warm-thanks
   * gate.
   */
  'world:relief',
  /** A forked road toll (the creep answered) stands within the watch. */
  'world:toll_near',
  /** The listening PLAYER carries an open bounty (any `bounty:` flag). */
  'world:bounty_open',
  /**
   * A peddler's rest stands within the marches — the road deals
   * fortune both ways, and word of a good cart travels as far as word
   * of a bad camp.
   */
  'world:peddler_near',
  /**
   * THE CONTESTED LANDS (docs/contested-lands-plan.md §1 law 6, §5
   * beat 10): two mutually hostile cores stand within the speaker's
   * watch — hostility read live from the stances matrix over the
   * tribes the two garrisons wear. The bickering-on-the-green gate
   * and the Bone Meadow scoreboard's beat key. The epic's ONE
   * addition to this roster; the roster stays closed.
   */
  'world:war_near',
]);

/** The reserved prefix — one place, so no seam spells it by hand. */
export const WORLD_FLAG_PREFIX = 'world:';

export function isWorldFlag(flag: string): boolean {
  return flag.startsWith(WORLD_FLAG_PREFIX);
}

/**
 * THE BOUNTY LEDGER rides per-character flags: `bounty:<cellX,cellY>`,
 * stamped when a guard points the player at a camp, lifted when that
 * camp breaks and the coin is paid. Server-stamped only — the dialogue
 * dialect can never spell a cell, so trees gate on `world:bounty_open`
 * instead (any bounty: flag present).
 */
export const BOUNTY_FLAG_PREFIX = 'bounty:';

export function bountyFlag(cellKey: string): string {
  return BOUNTY_FLAG_PREFIX + cellKey;
}
