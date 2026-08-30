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
import { type DungeonSpec, type DungeonTheme, type ItemRoll, type KeyLore, type RarityTier } from '@arx/shared';
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
export declare const KEY_SORTS: ReadonlyArray<[KeySort, string]>;
/** Tier filter rail: All first, then the ladder bottom-up. */
export type KeyTierFilter = 'all' | RarityTier;
/** Derive each key's full story once (paint-time, never per-compare). */
export declare function fileKeys(keys: ReadonlyArray<RingKey>): FiledKey[];
/**
 * Filter by tier rail, theme, and the search line. The search reads
 * the words a player actually knows a key by: its dungeon name, its
 * trade sigil ("KAR-VOTH"), its theme, and its tier word.
 */
export declare function filterKeys(keys: ReadonlyArray<FiledKey>, tier: KeyTierFilter, theme: DungeonTheme | 'all', search: string): FiledKey[];
/**
 * A ledger row with its derived story: the door's spec, the reader's
 * label, and whether a copy currently hangs on the ring (the client's
 * own cross-read — the wire never repeats what the ring already says).
 */
export interface FiledLore {
    seed: number;
    spec: DungeonSpec;
    label?: string;
    /** A copy of this door currently hangs on the ring. */
    held: boolean;
}
/** Derive each ledger row's story once (paint-time). */
export declare function fileLore(known: ReadonlyArray<KeyLore>, ringSeeds: ReadonlySet<number>): FiledLore[];
/**
 * The ledger answers the same rails and the same pen as the ring —
 * tier, theme, and a search that also reads the reader's own labels
 * (the first thing a collector will look for).
 */
export declare function filterLore(rows: ReadonlyArray<FiledLore>, tier: KeyTierFilter, theme: DungeonTheme | 'all', search: string): FiledLore[];
/**
 * Order ledger rows. The ring's sorts carry over where they make
 * sense; 'newest' reads first-held order (the wire's order), and
 * 'uses' has no meaning on knowledge, so it falls back to power.
 */
export declare function orderLore(rows: ReadonlyArray<FiledLore>, mode: KeySort): FiledLore[];
/** Order filed keys for the shelf. Does not mutate its input. */
export declare function orderKeys(keys: ReadonlyArray<FiledKey>, mode: KeySort): FiledKey[];
//# sourceMappingURL=keyOrder.d.ts.map