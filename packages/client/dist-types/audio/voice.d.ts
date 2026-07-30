/**
 * The voice player — spoken lines and small utterances, the third
 * playback idiom beside synthesized SFX and streamed tracks: short
 * recorded clips fetched once, decoded once, and held warm in a
 * byte-capped cache so a line's audio is ready before its first
 * glyph lands. Everything rides the engine's `voice` bus (dry,
 * close, under the same warm master chain as the rest of the world).
 *
 * THE ONE RESOLVER lives on the server: this player never chooses
 * clips, it plays URLs the wire hands it and warms the URLs the wire
 * says are coming.
 *
 * SILENCE IS VALID: a fetch or decode that fails degrades to the
 * unvoiced conversation at every step — no throw ever escapes into
 * the dialogue flow, and a URL that failed once stays quiet for the
 * session instead of hammering the server.
 *
 * EVERY EDGE IS A FADE: lines seat in over 20 ms and leave over
 * 80 ms; a skipped line fades, it never clicks off.
 *
 * THE DUCK RAIL: while a full line speaks, music/tracks seat to
 * LINE_DUCK under it and ambience steps back; quips duck nothing.
 * All of it through engine.setDuck — the one lawful system multiplier.
 */
import type { AudioEngine } from './engine.js';
import type { WorldAt } from './sfx.js';
/**
 * THE DUCK RAIL levels under a spoken line, and the move shapes.
 * These are the shipped defaults — the wire's voiceDials (the live
 * 'voice' content doc) override them per conversation via setDials.
 */
export declare const LINE_DUCK: {
    readonly music: 0.45;
    readonly tracks: 0.45;
    readonly ambience: 0.75;
};
/**
 * THE REEL LAW (Phase 6): short lines decode into warm buffers; a
 * line at or past VOICE_STREAM_MS streams through a media element
 * (the TrackPlayer idiom) — a cutscene's worth of speech should
 * never sit decoded in the cache nor wait on a full download.
 */
export declare function lineDelivery(durMs: number): 'buffer' | 'stream';
/**
 * THE PACED WORD: how much to stretch the typewriter so a voiced
 * line's text lands with its audio. Stretch-only — a clip shorter
 * than the natural read never speeds the reader up (text may land
 * early; it never outruns the voice). Lands at ~92% of the clip so
 * the last word settles inside the speech, not after it.
 */
export declare function voicePaceScale(plainSec: number, durMs: number): number;
/**
 * A byte-budgeted LRU: insertion-ordered Map, `get` re-seats the key,
 * inserts evict the stalest entries until the total fits. An item
 * larger than the whole cap is refused outright (it would evict
 * everything and then rot alone). Pure — tests pin it without audio.
 */
export declare class LruBytes<V> {
    private cap;
    private map;
    private total_;
    constructor(cap: number);
    get(key: string): V | undefined;
    has(key: string): boolean;
    set(key: string, v: V, bytes: number): void;
    get total(): number;
    get size(): number;
}
/** What the browser says it can play — the Phase-1 format probe. */
export interface VoiceFormats {
    oggOpus: string;
    webmOpus: string;
    mp3: string;
    aac: string;
    wav: string;
}
export declare function probeFormats(): VoiceFormats;
/** The line on the air right now, for pacing and debug probes. */
export interface CurrentLine {
    url: string;
    startedAt: number;
    durSec: number;
}
export declare class VoicePlayer {
    private engine;
    /** canPlayType answers, probed once at construction. */
    readonly formats: VoiceFormats;
    private cache;
    private inflight;
    private failed;
    /** Listener (the camera's subject) for spatial quips. */
    private lx;
    private ly;
    /** Supersession token: any newer play/stop abandons an awaited decode. */
    private lineGen;
    private lineSrc;
    private lineGain;
    /** The streaming leg: one MediaElementSource per element, forever. */
    private media;
    private lineMedia;
    current: CurrentLine | null;
    private quipCount;
    private ducked;
    /** Live duck dials — shipped defaults until the wire says otherwise. */
    private dials;
    constructor(engine: AudioEngine);
    /** The wire's voiceDials land here (content-tuned, per dlgopen). */
    setDials(d: {
        duckLine: number;
        duckAmbience: number;
        duckReleaseMs: number;
    }): void;
    /** Follow the camera's subject; called once per frame from the loop. */
    setListener(x: number, y: number): void;
    /**
     * Warm the cache for URLs the wire says are coming. Fire-and-forget;
     * failures are remembered quietly. No-op before the gesture unlock
     * (dialogue can only open well after the first click).
     */
    prefetch(urls: readonly string[]): void;
    /**
     * Speak a full line: stops whatever line is playing, seats the duck,
     * and starts the clip once decoded (instantly when prefetched). A
     * newer playLine/stopLine during the decode wins — the stale clip
     * never sounds. Reel-length lines (durMs ≥ VOICE_STREAM_MS) stream
     * through a media element instead of decoding.
     */
    playLine(url: string, durMs?: number): void;
    /**
     * The streaming leg — the TrackPlayer idiom pointed at speech: one
     * HTMLAudioElement + MediaElementSource per URL, cached forever
     * (recreating a source for a used element throws), fades and ducks
     * exactly like a buffered line. SILENCE IS VALID: a failed stream
     * clears itself and releases the ducks.
     */
    private playReel;
    /** Fade the current line out (a skip, a page turn, a walk-away). */
    stopLine(): void;
    /**
     * A small utterance — a greeting, a grunt, a yes. Never ducks, never
     * interrupts a line. With a world position it speaks from its side
     * of you on the sfx rolloff curve; without one it plays flat (the
     * dialogue frame's own quips are placeless). Capped so overlapping
     * quips never crowd into a chorus.
     */
    playQuip(url: string, at?: WorldAt | null): void;
    /** Cache stats for the debug gates. */
    get cacheStats(): {
        bytes: number;
        clips: number;
    };
    /** Fade out and forget the current line's nodes (no token change). */
    private haltLine;
    private setLineDuck;
    /**
     * Fetch + decode a clip into the cache. One flight per URL no matter
     * how many callers ask; resolution is the buffer or null (failed —
     * and remembered so the session never re-asks a dead URL).
     */
    private load;
}
//# sourceMappingURL=voice.d.ts.map