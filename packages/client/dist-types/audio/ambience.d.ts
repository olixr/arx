/**
 * The ambience system — the world's continuous voice. Where music is
 * an event, ambience is the room tone of being outdoors: it should
 * disappear from attention within a minute and leave a hole if muted.
 *
 * Layers, all crossfaded continuously by zone weight and clock:
 *  - LEAF RUSTLE (the "wind"): a GRANULAR texture — a pre-rendered
 *    stereo loop of hundreds of overlapping micro-grains (each a
 *    15-80ms flutter), so the sound flickers like foliage instead of
 *    washing like water. Gated by the squared gust curve of the SAME
 *    wind field the grass and trees bend to; silent between gusts.
 *    THE BAN (two user rejections): NO continuous filtered-noise bed
 *    may ever play, in any band — a smooth gain envelope on noise
 *    reads as waves crashing, full stop. Granular or nothing.
 *  - BIRDS (day, outdoors): sparse procedural songbird phrases —
 *    2-5 small warbles, panned somewhere in the trees, occasionally
 *    distant. Denser through the dawn chorus, gone by dusk.
 *  - MOURNING DOVE (day, outdoors): the soft low coo-ah-ooo of the
 *    North American morning, a few times a minute at most.
 *  - WOODPECKER (day, wild): a distant drum roll on a far snag,
 *    rare enough to be an event.
 *  - CRICKETS (night, outdoors): two soft pulse-train voices, panned
 *    apart, low-passed well below "shrill" — the user's law: night
 *    sounds must soothe, never nag.
 *  - CAVE (underground): a barely-there low rumble plus echoing
 *    drips; the ambience bus reverb makes each drip a cavern.
 *  - TOWN: a distant smithy tink now and then by day — the sound of
 *    other lives being lived somewhere behind the houses.
 *
 * All scheduling is wall-clock ctx time; the per-frame update only
 * nudges gain targets (throttled to 10 Hz) and rolls dice for the
 * next one-shot. Nothing here allocates per frame.
 */
import type { AudioEngine } from './engine.js';
import { type ZoneWeights } from './zones.js';
export declare class AmbienceSystem {
    private engine;
    private built;
    private windGain;
    private windFilter;
    private rumbleGain;
    private cricketGains;
    private cricketPan;
    private lastParamAt;
    private nextBirdAt;
    private nextCricketAt;
    private nextDripAt;
    private nextTownAt;
    private nextDoveAt;
    private nextPeckAt;
    /** Debug mirrors for live verification. */
    gates: {
        wind: number;
        birds: number;
        crickets: number;
        cave: number;
    };
    constructor(engine: AudioEngine);
    update(x: number, y: number, w: ZoneWeights, hours: number, tSec: number): void;
    private build;
    /**
     * Pre-render the leaf texture: white noise multiplied by a granular
     * envelope — ~55 overlapping sin²-windowed grains per second, each
     * 20-80ms with squared-random amplitude (many soft, few loud), wrapped
     * at the loop seam. The chaotic 8-25 Hz amplitude flicker this makes
     * is what separates leaves from water; a smooth envelope cannot.
     */
    private makeRustleBuffer;
    /** A songbird phrase: 2-5 warbles from one spot in the canopy. */
    private birdPhrase;
    /**
     * A mourning dove somewhere in the trees: the rising coo-ah-OOO,
     * then two or three low even coos. The calmest sound in North
     * America — sine through a dark filter, nothing else.
     */
    private dove;
    /**
     * A woodpecker drumming a far snag: a fast decaying roll of soft
     * knocks. Rare — an event, not a bed.
     */
    private woodpecker;
    /** One cricket chirp: three tiny pulses. Soft by construction. */
    private cricketBurst;
    /** A single water drip somewhere off in the dark. */
    private drip;
    /** A far-off hammer on a far-off anvil: Bramblewick at work. */
    private townTink;
}
//# sourceMappingURL=ambience.d.ts.map