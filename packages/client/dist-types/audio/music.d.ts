/**
 * The music system — performs the pure score through warm WebAudio
 * voices. Every instrument here is built AGAINST sharpness: soft
 * attacks, dark filters, and low registers, with the shared room
 * (music bus reverb send) doing the space.
 *
 *  - KEY: the C418 voice — a detuned unison sine pair with a slow
 *    tape-like pitch wobble (the "wow"), a 45ms attack (never a
 *    click), and a dark low-pass. A felt piano from another room.
 *  - PAD: two barely-detuned TRIANGLES (saws were the droning
 *    culprit) panned wide behind a very dark filter with a
 *    seconds-long bloom. SUB OWNERSHIP: the pad has NO sub
 *    oscillator and is high-passed — its old octave-down sine was
 *    what piled onto the bass and blew out the low end.
 *  - BASS: a soft sine root with a whisper of octave harmonic — the
 *    only voice allowed below ~100 Hz.
 *  - HARP: a dark triangle pluck for the town's low broken chords.
 *  - FLUTE: a sine with delayed vibrato — a far hilltop call.
 *  - BELL: cave echo pings only (the score bans bells elsewhere) —
 *    slow-attacked, dark, and quiet. A glow, never a chime.
 *
 * The mix: voices sit in a stereo field (harp right, flute left,
 * bells drifting, keys and bass center, pads wide) and the whole
 * music path passes a gentle peaking cut around 250 Hz — the mud
 * shelf where pads and bass used to stack — before the bus.
 *
 * Orchestration laws:
 *  - One piece (~2 min of sections, see score.ts THE LONG FORM),
 *    then a LONG rest (the score's gapSec).
 *  - THE PROGRESSION BOOK: the performer remembers each zone's last
 *    progression and asks the score to avoid it — no two consecutive
 *    pieces in a zone read the same page.
 *  - THE SLOW BLOOM: `zonePlays` counts phrases performed per zone
 *    this session; intensity = min(1, plays/3) feeds the score, so a
 *    zone's music starts nearly empty and finds its voice as you
 *    stay. Leaving and returning keeps what it learned.
 *  - Zone changes commit on a ~1.6s-sustained dominant zone
 *    (doorway dithering must never stutter the music), fade the
 *    sounding phrase over ~3s, breathe, then open the new theme.
 *  - Every phrase plays into its own gain node; fades never touch
 *    the bus, so a new phrase is born at full level.
 */
import type { AudioEngine } from './engine.js';
import { type ZoneId, type ZoneWeights } from './zones.js';
export declare class MusicSystem {
    private engine;
    /** The theme the music is committed to (readable for debugging). */
    zone: ZoneId;
    state: 'resting' | 'playing';
    /** Phrases performed per zone — drives the slow bloom. */
    zonePlays: Record<ZoneId, number>;
    /** The progression each zone last played — never repeated back-to-back. */
    lastProg: Record<ZoneId, number>;
    private mixIn;
    private phrase;
    private phraseGain;
    private phraseStart;
    private phraseEnd;
    private nextIdx;
    private restUntil;
    private candidate;
    private candidateSince;
    private booted;
    constructor(engine: AudioEngine);
    update(w: ZoneWeights, hours: number): void;
    private switchTo;
    private startPhrase;
    /**
     * All phrases pass one shared mastering touch before the bus: a
     * gentle peaking cut at the 250 Hz mud shelf, where the old pad
     * subs used to stack against the bass and thicken everything.
     */
    private mixBus;
    /** A slow pitch wobble — the tape "wow" that makes keys feel old. */
    private wow;
    private playNote;
}
//# sourceMappingURL=music.d.ts.map