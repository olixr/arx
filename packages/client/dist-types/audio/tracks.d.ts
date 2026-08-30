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
 *  - MOOD PICKS THE SHELF: town zone → town tracks; underground → the
 *    dungeon shelf; night hours → night tracks; otherwise the day
 *    adventure shelf.
 *    Mood commits on a 2.5s-sustained change (no doorway stutter),
 *    then the sounding track bows out with a fade and the new mood
 *    waits out an arrival quiet (see THE THRESHOLD IS NOT A CUE).
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
 *  - SILENCE IS A SECTION, and the section is LONG. The library's
 *    tracks run two to six minutes; a flat 12-26 second rest behind
 *    one meant music sounded ~90% of every hour and the land never
 *    got the floor. Three laws now hold the quiet open:
 *
 *      THE EARNED QUIET — a rest is not a constant, it is PAID FOR by
 *      the music just heard: a floor, plus a share of the minutes that
 *      actually sounded, capped. A six-minute adventure piece buys a
 *      three-minute quiet; a two-minute town piece buys about one.
 *      The ratio is what the ear reads, not the absolute number, so
 *      long and short tracks both land the same way.
 *
 *      THE THRESHOLD IS NOT A CUE — crossing a zone line used to cut
 *      the sounding track and open the new mood ~5 seconds later, and
 *      crossing DURING a rest truncated that rest to 2-5 seconds. A
 *      doorway is now an ordinary event: the old track bows out and
 *      the new mood waits out a real arrival quiet. Only the deep
 *      frontier still speaks fast — dread arriving late is dread
 *      wasted, so danger is the one arrival that may cut an earned
 *      quiet short. Every other crossing waits its turn: three
 *      minutes of music just played does not become three more
 *      because a zone line went by.
 *
 *      THE FLOOR OF SILENCE — no code path, on any route, may put
 *      music back inside QUIET_FLOOR seconds of real silence. It is
 *      measured from when the last track went inaudible, not from the
 *      last boundary crossed, so pacing back and forth over a town
 *      line cannot starve the world of its own voice.
 *
 *    And THE DEEP QUIET: now and then the rest simply stretches, well
 *    past its cap. Silences that are all the same length become a
 *    metronome the ear learns to count; one that runs long is what
 *    makes the next bloom land.
 *  - THE WORLD TAKES THE FLOOR: while a track sounds, the ambience
 *    bus settles back a couple of decibels in the music lane of the
 *    duck rail, and rises again — slowly, over a scenic time constant
 *    that no ear can catch working — when the quiet opens. Two things
 *    fall out of it. The mix under music gets cleaner, because the
 *    wind and the birds stop competing with a mastered piece for the
 *    same air. And the quiet does not merely begin, it OPENS: the
 *    land audibly comes forward as the score steps back, which is the
 *    whole reason the rests were lengthened. The move is small on
 *    purpose — deep enough to feel the room change, far too shallow
 *    to read as pumping, and the edges it rides are minutes apart.
 *  - THE WORLD SPEAKS FIRST: a fresh world opens on ambience alone
 *    for the better part of a minute. The first thing a player hears
 *    should be the place, not the score.
 */
import type { AudioEngine } from './engine.js';
import { type ZoneWeights } from './zones.js';
export type TrackMood = 'adventure' | 'night' | 'town' | 'dungeon' | 'danger';
export declare const TRACK_LIBRARY: Record<TrackMood, string[]>;
/**
 * The rest a mood owes after `heardSec` of music actually sounded.
 * Pure, so the pacing law can be pinned by tests instead of by ear.
 * `rand` is drawn twice: once for the ±18% breath on the earned rest,
 * once for THE DEEP QUIET.
 */
export declare function restAfter(mood: TrackMood, heardSec: number, rand: () => number): number;
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
    /**
     * THE FLOOR OF SILENCE — ctx time at which the last track became
     * genuinely inaudible (its bow-out finished), i.e. when real quiet
     * began. Every start is gated on this, not on any per-frame event,
     * so no amount of boundary-crossing can shorten a silence.
     */
    private quietSince;
    /** THE EARNED QUIET — ctx time the sounding track started sounding. */
    private soundingSince;
    /**
     * AN EARNED QUIET IS NOT REFUNDABLE — true while the pending rest
     * was paid for by music that actually finished sounding. Such a
     * rest stands whatever lines the player crosses; only an ARRIVAL or
     * OPENING quiet (nothing heard yet, nothing owed) may be re-aimed
     * by a crossing.
     */
    private quietEarned;
    /** THE WORLD TAKES THE FLOOR — the hold last written, so the
     * per-frame update schedules automation only when it actually
     * changes rather than once a frame forever. */
    private ambHold;
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