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
 * Laws:
 *  - MOOD PICKS THE SHELF: town zone → town tracks; night hours or
 *    underground → night tracks; otherwise the day adventure shelf.
 *    Mood commits on a 2.5s-sustained change (no doorway stutter),
 *    then the sounding track bows out with a fade and the new mood
 *    opens after a short breath.
 *  - SHUFFLE, NEVER REPEAT: the next track from a shelf is random but
 *    never the one just played from that shelf.
 *  - EVERY EDGE IS A FADE: ~2s in, ~2.6s out. A track that ends
 *    naturally is followed by a real gap (silence is still a section)
 *    before the next one fades in.
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
export declare class TrackPlayer {
    private engine;
    /** Committed mood (readable for debugging). */
    mood: TrackMood;
    state: 'silent' | 'playing';
    /** Name of the sounding track, if any. */
    current: string | null;
    private out;
    private nextAt;
    private candidate;
    private candidateSince;
    private lastPlayed;
    private media;
    private activeEl;
    private booted;
    constructor(engine: AudioEngine);
    update(w: ZoneWeights, hours: number, dangerTier?: number): void;
    private switchTo;
    /** Fade the sounding track down and stop it once it is inaudible. */
    private fadeOut;
    private play;
    /** A track ran to its own mastered ending — rest, then another. */
    private onEnded;
}
//# sourceMappingURL=tracks.d.ts.map