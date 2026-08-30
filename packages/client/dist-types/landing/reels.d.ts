/**
 * THE REELS — recorded game, played back on the front door.
 *
 * Every clip on this page came out of packages/tools/src/reel: the real
 * client, driven through the real input layer, taped off the real
 * canvas. The manifest at /reels/reels.json is written by that lane, so
 * the page never carries a hand-kept list of files that can rot.
 *
 * Three rules hold the whole thing together:
 *
 *  1. NOTHING PLAYS OFF SCREEN. Every clip is behind an
 *     IntersectionObserver; leaving the viewport pauses it, and the tab
 *     going away pauses everything. A dozen 1080p60 videos playing into
 *     nothing is how a beautiful page becomes a hot laptop.
 *  2. NOTHING LOADS BEFORE IT IS WANTED. `preload="none"` until a clip
 *     is within a screen of the fold, and phones get the 720 ladder.
 *  3. REDUCED MOTION MEANS STILLS. Not "slower" — stills. The poster
 *     frame of every reel is a real frame of the same take, so the page
 *     loses its motion and keeps its argument.
 */
export interface ReelEntry {
    id: string;
    title: string;
    caption: string;
    pillar: string;
    seconds: number;
    loop: boolean;
    hero: boolean;
    poster: string;
    sources: {
        webm: string;
        webm720: string;
        mp4: string;
    };
}
export declare function loadReels(): Promise<Map<string, ReelEntry>>;
export interface ReelOptions {
    /** Loop forever (background plates) or play once and hold. */
    loop?: boolean;
    /** Start muted-autoplaying as soon as it is near the fold. */
    auto?: boolean;
    /** Extra classes for the media element. */
    className?: string;
    /** Full-bleed surface: take the 1080 ladder. Wells take the 720. */
    full?: boolean;
}
/** One reel as a <video>, wired for the three rules above. */
export declare function reelVideo(entry: ReelEntry, opts?: ReelOptions): HTMLElement;
/** The load-and-play gate every clip on the page rides. */
export declare function watch(v: HTMLVideoElement, auto: boolean): void;
/**
 * THE COLD OPEN — the hero montage.
 *
 * Two video layers, one on top of the other. The top one plays; the
 * next one is already loaded and waiting underneath; at the cut they
 * trade opacity over a beat and trade roles. That is the whole trick,
 * and it is the only one that gives a hard-cut trailer rhythm without
 * a frame of black between clips.
 *
 * Each clip runs for a written beat rather than to its end, because a
 * trailer cuts on the action, not on the file.
 */
export declare function montage(stage: HTMLElement, entries: ReelEntry[], ui: {
    caption: HTMLElement | null;
    ticks: HTMLElement | null;
}): void;
//# sourceMappingURL=reels.d.ts.map