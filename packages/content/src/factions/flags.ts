import type { FactionBand } from './types.js';

/**
 * THE NAME ANSWERS — the `faction:` flag namespace.
 *
 * A `faction:` flag is SYNTHETIC, exactly like `world:` and `quest:`:
 * never stored, never set, never cleared. At the moment a conversation
 * opens (and again at every choice gate) the server answers it live
 * from the asking player's standing ledger — speakerless, because the
 * name is the player's, not the speaker's. Deed history stays plain
 * story flags; the standing itself lives in its own table.
 *
 * Grammar (the whole namespace):
 *
 *   faction:<id>:<band>            exactly that band
 *   faction:<id>:atleast:<band>    that band or better
 *   faction:<id>:atmost:<band>     that band or worse
 *
 * Authors may READ these in requires/forbids; nobody may ever `set`
 * one — deeds write standing through the server's one choke, and the
 * bands answer.
 */

export const FACTION_FLAG_PREFIX = 'faction:';

export function isFactionFlag(flag: string): boolean {
  return flag.startsWith(FACTION_FLAG_PREFIX);
}

/** The full grammar — a typo dies in validation, never gates in silence. */
export const FACTION_FLAG_RE =
  /^faction:([a-z][a-z0-9_]*):(?:(atleast|atmost):)?(hunted|outlaw|suspect|neutral|known|trusted|champion)$/;

export interface ParsedFactionFlag {
  faction: string;
  cmp: 'exact' | 'atleast' | 'atmost';
  band: FactionBand;
}

export function parseFactionFlag(flag: string): ParsedFactionFlag | null {
  const m = FACTION_FLAG_RE.exec(flag);
  if (!m) return null;
  return {
    faction: m[1]!,
    cmp: (m[2] as 'atleast' | 'atmost' | undefined) ?? 'exact',
    band: m[3] as FactionBand,
  };
}
