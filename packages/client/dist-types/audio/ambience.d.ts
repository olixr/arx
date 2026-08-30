/**
 * The ambience system — the world's continuous voice. Where music is
 * an event, ambience is the room tone of being outdoors: it should
 * disappear from attention within a minute and leave a hole if muted.
 *
 * Layers, all crossfaded continuously by zone weight and clock:
 *  - LEAF RUSTLE (the "wind"): a REAL RECORDING — aspen foliage at
 *    the edge of Białowieża Forest (freesound #381717 by urupin,
 *    CC0), its calmest 14 seconds cut into a seamless loop
 *    (public/sfx/leaf_rustle_loop.mp3), fetched and decoded async
 *    with the old synthesized grain loop standing in only until the
 *    recording arrives. Ruled twice on synthesis (v1 micro-grains =
 *    paper bag, v2 smooth grains = white noise): this voice is a
 *    field recording now, full stop — real leaves are the only
 *    thing that sounds like real leaves. Gated by the squared gust
 *    curve of the SAME wind field the grass and trees bend to;
 *    silent between gusts, so the recording supplies the TEXTURE
 *    and the field supplies the WEATHER.
 *    THE BAN (two user rejections): NO continuous filtered-noise bed
 *    may ever play, in any band — a smooth gain envelope on noise
 *    reads as waves crashing, full stop. Granular or nothing.
 *    (One sanctioned exception: the FALLING WATER voice below, which
 *    IS water — the very reading the ban protects against is that
 *    voice's whole job. It stays gated by true SPILL-LAW earshot and
 *    granular inside; the ban holds everywhere else, unchanged.)
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
 *  - TOWN: a far-off dog somewhere behind the houses now and then by
 *    day — the sound of other lives being lived. (The smithy tink
 *    that held this seat was removed by user verdict.)
 *  - OWL (night, wild): the low call off in the dark, rare and far —
 *    the calmest thing the night says. Since 08-17 the voice deals
 *    from a pool: two REAL owl recordings (public/sfx/owl_night_*.mp3,
 *    fetched + decoded async, per-file gains matching their measured
 *    loudness) and the original synthesized four-note call, no pick
 *    repeated back-to-back. The synth owl also stands in whole until
 *    the recordings decode — the first night is never silent.
 *  - FALLING WATER (near a waterfall): a calm pink-noise roil in two
 *    legs — a body whose lowpass opens as the listener approaches
 *    (distance darkens a fall long before it silences it) and a low
 *    rumble that swells under tall stacked drops — seated in stereo
 *    toward the fall. Fed by audio/falls.ts, which asks THE SPILL LAW
 *    itself where curtains hang, so it is silent everywhere the
 *    renderer draws no fall. Never a wash: the loop's roil grains
 *    tumble inside it, and the earshot gate keeps it a soft far hush
 *    that only finds its voice at the plunge pool.
 *  - RIFTGATE (near a portal): a low beating drone — detuned sine
 *    pairs, a slow-wobbling harmonic, a hollow whistle riding on top
 *    — that swells as the listener approaches (closeness², so it
 *    arrives late and lands hard), plus eerie one-shot moods: warped
 *    whines glissing up or down and the occasional deep womp, exactly
 *    the "distant otherworld" register of a Minecraft portal. All
 *    oscillators — the noise-bed ban holds here too.
 *
 * All scheduling is wall-clock ctx time; the per-frame update only
 * nudges gain targets (throttled to 10 Hz) and rolls dice for the
 * next one-shot. Nothing here allocates per frame.
 */
import type { AudioEngine } from './engine.js';
import { type ZoneWeights } from './zones.js';
import { type FallEar } from './falls.js';
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
    private nextDogAt;
    private nextDoveAt;
    private nextPeckAt;
    private nextOwlAt;
    private portalGain;
    private nextPortalMoodAt;
    private fallBody;
    private fallRumble;
    private fallLp;
    private fallPan;
    /** The synth rustle standing in until the recorded loop decodes. */
    private rustleSynth;
    /**
     * The recorded owl calls, decoded async like the rustle loop.
     * Paired with a per-file gain: the two recordings arrive mastered
     * ~15 dB apart (−11.7 / −26.9 LUFS) and must land equally far off
     * in the dark.
     */
    private owlCalls;
    /** Last owl voice dealt (index; owlCalls.length = the synth call). */
    private owlLastPick;
    /** Debug mirrors for live verification. */
    gates: {
        wind: number;
        birds: number;
        crickets: number;
        cave: number;
        portal: number;
        fall: number;
    };
    /**
     * Dev lever (soundlab.html): when set, stands in for the wind
     * field's gust scalar (0..1) so the rustle texture can be
     * auditioned on demand instead of waiting on a natural gust.
     * The game never sets it.
     */
    devWindOverride: number | null;
    constructor(engine: AudioEngine);
    /**
     * `portalNear` is 0..1 closeness to the nearest Riftgate (0 beyond
     * hearing range) — main.ts scans for it on a throttle and feeds it
     * through here. `fall` is the fall-earshot scan's verdict on the
     * falling water around the listener (audio/falls.ts), same cadence.
     */
    update(x: number, y: number, w: ZoneWeights, hours: number, tSec: number, portalNear?: number, fall?: FallEar): void;
    private build;
    /**
     * Fetch + decode the recorded aspen loop and seat it in the synth
     * loop's place. SILENCE IS VALID: any failure simply leaves the
     * synth fallback playing — no throw escapes into the frame loop.
     */
    private loadRustleLoop;
    /**
     * Fetch + decode the recorded owl calls. Each failure stays quiet
     * on its own — one dead file still leaves the other recording and
     * the synth call in the deal.
     */
    private loadOwlCalls;
    /**
     * Pre-render the SYNTH leaf texture — since v3 only the stand-in
     * while the recorded loop decodes (and the net-failure fallback).
     * The first build's 20-80ms micro-grains flickering to silence
     * read as a paper bag scrunching (user verdict): fast, deep
     * amplitude flicker on bright noise IS crinkle. What a gust through leaves
     * actually does is BREATHE — so this loop is long (120-350ms),
     * heavily overlapped sin²-windowed grains riding OVER a floor
     * (the texture undulates, it never blinks), on pink-tinted noise
     * so the energy leans dark, with two slow whole-loop swells
     * (seam-safe sine multiples, phase-offset per channel) letting
     * the canopy inhale and exhale. Decorrelated left/right. The
     * paper-bag law: no fast bright flicker in this voice, ever.
     */
    private makeRustleBuffer;
    /**
     * Pre-render the fall's roil loop: pink-ish noise (a waterfall's
     * energy lives below 1 kHz) under a granular tumble — dense
     * overlapping grains over a steady floor, so the sound has the
     * internal boil of falling water instead of the flat hiss of
     * static. Two slow whole-loop swells (seam-safe by construction,
     * phase-offset per channel) let the mass of it breathe.
     */
    private makeFallBuffer;
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
    /**
     * A Riftgate mood: mostly a warped whine — a sine gliss bending up
     * or down through a dark filter, doubled a few cents off so the pair
     * phases as it moves — and now and then a deep womp from somewhere
     * inside the gate. Panned wide at random; louder the closer you are.
     */
    private portalMood;
    /**
     * A dog somewhere behind the houses — soft far-off barks, low-passed
     * to distance. Each "wuff" is a pitch-dropping saw pair (a few cents
     * apart for the throat's roughness) with a sharp attack; the pattern
     * varies — one wuff, a quick ruff-ruff, or a short string — so the
     * same dog never says the same thing twice.
     */
    private dogBark;
    /**
     * The night owl's moment: deal one voice from the pool — the two
     * recordings and the synth four-note call — never the same pick
     * twice running. A recording plays seated exactly like the synth
     * owl does: panned somewhere off in the trees, darkened by a
     * lowpass when it's far, quieter still at distance; the ambience
     * bus's shared room carries the rest of the night around it.
     */
    private owlCall;
    /**
     * An owl off in the dark — the low four-note call: hoo… h'hoo…
     * hoo, hoooo. Soft-attacked sines settling slightly flat through a
     * dark filter, a breath of vibrato on the held last note. Rare and
     * far by design: the parliament roosts out there, and hearing one
     * should feel like the night noticed you. Since 08-17 one voice of
     * three in the owlCall deal (and the whole voice before the
     * recordings decode).
     */
    private owlHoot;
}
//# sourceMappingURL=ambience.d.ts.map