/**
 * THE KEY RING'S FILING ORDER — the pure brain behind the Keys screen.
 *
 * Every key on the ring derives its whole story from the roll
 * (dungeonSpecFromRoll: name, sigil, theme, tier, power; keyUsesLeft:
 * the worn ward), so ordering and filtering are pure functions of the
 * mirror the server sends. Power leads by default — the ring is read
 * as "what can I run at my level" — with tier, name, and freshest-find
 * as the other spines. Pure so the node test runner can hold it to
 * account without a DOM.
 */

import {
  dungeonSpecFromRoll,
  keyUsesForTier,
  keyUsesLeft,
  rarityIndex,
  type DungeonSpec,
  type DungeonTheme,
  type ItemRoll,
  type RarityTier,
} from '@arx/shared';

export interface RingKey {
  id: number;
  roll: ItemRoll;
}

/** A ring row with its derived story, computed once per paint. */
export interface FiledKey {
  id: number;
  roll: ItemRoll;
  spec: DungeonSpec;
  /** Turns left in the ward (absent uses reads as the full budget). */
  usesLeft: number;
  /** The tier's full budget — the pip row's denominator. */
  usesMax: number;
}

export type KeySort = 'power' | 'tier' | 'az' | 'newest' | 'uses';

export const KEY_SORTS: ReadonlyArray<[KeySort, string]> = [
  ['power', 'Power'],
  ['tier', 'Tier'],
  ['az', 'A-Z'],
  ['newest', 'Newest'],
  ['uses', 'Turns left'],
];

/** Tier filter rail: All first, then the ladder bottom-up. */
export type KeyTierFilter = 'all' | RarityTier;

/** Derive each key's full story once (paint-time, never per-compare). */
export function fileKeys(keys: ReadonlyArray<RingKey>): FiledKey[] {
  return keys.map((k) => ({
    id: k.id,
    roll: k.roll,
    spec: dungeonSpecFromRoll(k.roll),
    usesLeft: keyUsesLeft(k.roll),
    usesMax: keyUsesForTier(k.roll.rar ?? 'common'),
  }));
}

/**
 * Filter by tier rail, theme, and the search line. The search reads
 * the words a player actually knows a key by: its dungeon name, its
 * trade sigil ("KAR-VOTH"), its theme, and its tier word.
 */
export function filterKeys(
  keys: ReadonlyArray<FiledKey>,
  tier: KeyTierFilter,
  theme: DungeonTheme | 'all',
  search: string,
): FiledKey[] {
  const q = search.trim().toLowerCase();
  return keys.filter((k) => {
    if (tier !== 'all' && k.spec.tier !== tier) return false;
    if (theme !== 'all' && k.spec.theme !== theme) return false;
    if (q.length === 0) return true;
    return (
      k.spec.name.toLowerCase().includes(q) ||
      k.spec.sigil.toLowerCase().includes(q) ||
      k.spec.theme.includes(q) ||
      k.spec.tier.includes(q)
    );
  });
}

/** Order filed keys for the shelf. Does not mutate its input. */
export function orderKeys(keys: ReadonlyArray<FiledKey>, mode: KeySort): FiledKey[] {
  const sorted = [...keys];
  const az = (a: FiledKey, b: FiledKey): number =>
    a.spec.name.localeCompare(b.spec.name) || a.spec.sigil.localeCompare(b.spec.sigil);
  sorted.sort((a, b) => {
    switch (mode) {
      case 'power':
        // The reading order of a ladder: strongest doors first.
        return b.spec.power - a.spec.power || az(a, b);
      case 'tier':
        return rarityIndex(b.spec.tier) - rarityIndex(a.spec.tier) || b.spec.power - a.spec.power || az(a, b);
      case 'az':
        return az(a, b);
      case 'newest':
        // Ring ids mint monotonically — the newest find has the
        // highest id, and it leads.
        return b.id - a.id;
      case 'uses':
        // The freshest wards first; a nearly-spent key sinks so the
        // player sees what they can still plan around.
        return b.usesLeft - a.usesLeft || b.spec.power - a.spec.power || az(a, b);
    }
  });
  return sorted;
}
