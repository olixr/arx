/**
 * THE REEL ROOM's one seam into the running game.
 *
 * main.ts imports this module always (it is four fields and no
 * dependencies) and consults it in exactly one place: the frame's aim
 * decision. When a director is driving, the shot owns the eyes — a
 * puppet walking on the touch lane would otherwise be forced to stare
 * down its own walk vector, and no fight ever looks like that. Nothing
 * else in the game learns that reels exist.
 */
export declare const reel: {
    /** True once a director has the stage. */
    driving: boolean;
    /** Absolute aim in radians while the shot dictates it; null yields. */
    aim: number | null;
};
//# sourceMappingURL=state.d.ts.map