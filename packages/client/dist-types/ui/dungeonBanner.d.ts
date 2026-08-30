export declare function showDungeonEntry(o: {
    name: string;
    sigil: string;
    tier: string;
    theme: string;
    power: number;
    /** THE TURNED SEED: the run's modifier names, when the seed turned any. */
    mods?: string[];
}): void;
/**
 * THE COURT FALLS: the run is cleared — the champion is down, the
 * chest is open to claim, the way home stands torn open. The same
 * herald dialect as the threshold, reading the run clock back.
 */
export declare function showDungeonClear(o: {
    name: string;
    sigil: string;
    sec: number;
}): void;
/** Clear any showing banner (a fresh crossing restarts the show). */
export declare function dismissDungeonEntry(): void;
//# sourceMappingURL=dungeonBanner.d.ts.map