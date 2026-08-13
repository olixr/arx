/**
 * The track player — performs the user's authored music library.
 * (The generative score/music system is SET ASIDE by user decision —
 * "too repetitive and basic" — the code and its tests remain, unwired.)
 *
 * The library lives in /public/music and is streamed, never decoded
 * into memory: each track is an HTMLAudioElement wrapped in a
 * MediaElementSource, routed through the engine's `tracks` bus (nearly
 * dry — the files arrive already mastered; the shared room would only
 * smear them).
 *
 * The whole player leans Breath-of-the-Wild: music is scenery that
 * EMERGES from the world's own sound and recedes back into it. Slow
 * blooms, long quiets, and no two sittings walking the same path.
 *
 * Laws:
 *  - MOOD PICKS THE SHELF: town zone → town tracks; night hours or
 *    underground → night tracks; otherwise the day adventure shelf.
 *    Mood commits on a 2.5s-sustained change (no doorway stutter),
 *    then the sounding track bows out with a fade and the new mood
 *    opens after a short breath.
 *  - THE FULL DECK: each shelf is dealt as a shuffled deck — every
 *    track plays once before any repeats, and a reshuffle never leads
 *    with the track just heard. Decks persist across sessions
 *    (localStorage), so even short sittings walk the library's full
 *    swath instead of re-rolling the same openers.
 *  - THE SONG REMEMBERED: a track cut mid-flight by a mood change is
 *    bookmarked; return to that mood within a few minutes and it takes
 *    up where it left off (a breath rewound) instead of restarting.
 *    Stepping into town and back out never replays the same opening.
 *  - EVERY EDGE IS A LONG BREATH: slow eased fades — ~5s bloom in,
 *    ~3.5s bow out — on a PER-TRACK gain node. Fades never touch the
 *    bus and no two tracks ever fight over one fader, so an interrupted
 *    fade can simply become a gentle crossfade.
 *  - SILENCE IS A SECTION: the rest after a track ends is tuned per
 *    mood — towns sing again sooner; the wild and the night hold long
 *    scenic quiets where the world's own ambience carries the scene.
 */
import type { AudioEngine } from './engine.js';
import { type ZoneWeights } from './zones.js';
export type TrackMood = 'adventure' | 'night' | 'town' | 'danger';
export declare const TRACK_LIBRARY: Record<TrackMood, string[]>;
/**
 * Which shelf suits this place, hour, and how far past the lights the
 * listener has walked. Pure — tests could pin it. The danger tier
 * comes from the SAME shared field the server spawns by (the client
 * holds the world seed), so the dread arrives exactly where the
 * dire wolves do: tier 4+ plays the deep-frontier shelf, day or
 * night — out there the land itself is the boss.
 */
export declare function moodFor(w: ZoneWeights, hours: number, dangerTier?: number): TrackMood;
/**
 * THE FULL DECK, pure and testable: take the next track from a
 * shelf's deck, reshuffling the whole shelf when the deck runs dry.
 * A fresh shuffle never leads with the track just played, and names
 * a stale persisted deck no longer carries are dropped on the way in.
 */
export declare function drawTrack(shelf: readonly string[], deck: readonly string[], last: string | null, rand: () => number): {
    name: string;
    deck: string[];
};
export declare class TrackPlayer {
    private engine;
    /** Committed mood (readable for debugging). */
    mood: TrackMood;
    state: 'silent' | 'playing';
    /** Name of the sounding track, if any. */
    current: string | null;
    private nextAt;
    private candidate;
    private candidateSince;
    private decks;
    private lastPlayed;
    /** THE SONG REMEMBERED — where each mood's cut track stood. */
    private bookmark;
    private media;
    /** Pending stop per fading track, cancelled if the track resumes. */
    private pauseTimer;
    private activeEl;
    private booted;
    constructor(engine: AudioEngine);
    update(w: ZoneWeights, hours: number, dangerTier?: number): void;
    private switchTo;
    /**
     * Bow the sounding track out on ITS OWN gain and bookmark where it
     * stood, so `from`'s song can be taken up again on return.
     */
    private fadeOut;
    private schedulePause;
    /** THE SLOW BLOOM — a concave rise: long quiet approach, late swell. */
    private easeUp;
    private play;
    /** A track ran to its own mastered ending — a real rest, then on. */
    private onEnded;
    private saveDeckStore;
}
//# sourceMappingURL=tracks.d.ts.map