import type { AudioEngine } from './engine.js';
/** A place in the world a sound is born at (tile coordinates). */
export interface WorldAt {
    x: number;
    y: number;
}
/**
 * How far each family of world sound carries, in tiles. `ref` is the
 * full-volume radius (inside it you're "at" the source); past it the
 * gain falls on a perceptual curve and reaches exactly zero at `max`,
 * where the sound is CULLED before any synthesis happens.
 */
declare const RANGES: {
    /** Personal-space sounds: footsteps, splashes, small handwork. */
    readonly close: {
        readonly ref: 1.5;
        readonly max: 10;
    };
    /** Room-scale interactions: doors, chests, props, corpse thuds. */
    readonly near: {
        readonly ref: 2.5;
        readonly max: 16;
    };
    /** Work and combat beats: anvil, mining, chopping, spells, hits. */
    readonly mid: {
        readonly ref: 4;
        readonly max: 24;
    };
    /** Landmark events: tree falls, prop bursts, blasts, deaths. */
    readonly far: {
        readonly ref: 6;
        readonly max: 34;
    };
};
export type SoundRange = keyof typeof RANGES;
/**
 * THE RECORDED SHELF — mastered one-shot stings in /public/sfx, the
 * fourth playback idiom beside synthesized SFX, streamed tracks, and
 * voice: fetched once, decoded once, held warm for the session (the
 * shelf is a handful of short stings, not a library). Values are
 * per-sample loudness trims normalizing the shelf to its quietest
 * sample (EBU R128 integrated, ffmpeg ebur128: −17.8 LUFS reference —
 * re-measure when samples are added or replaced).
 *
 * Wired today: `level_up` (the skill herald), `poi_discovery` and
 * `stab_calm_1` (the discovery ceremony's voices), `poi_cleared`
 * (THE CHAMPION'S MARK banner), the three `stab_dramatic` dread
 * stings (rotating — hostile-camp discoveries ONLY since the
 * unprompted-sting retirement), the `day_to_night`/`night_to_day`
 * seam stingers (THE
 * SKY'S SEAM in the main loop), `friend_alert` (the social ledger's
 * ping), the henyard pair (`chicken_cluck` + the `chicken_chatter`
 * phrase table, spatial via THE HENYARD SPEAKS), and the five
 * `step_grass` field recordings (footstep('grass') round-robin).
 * The rest sit ready for future moments — see each entry's note.
 *
 * Trims above 1 are honest normalization too: several recordings
 * arrive mastered soft (owls, piano stabs) and are lifted to the
 * −17.8 reference. Every boost was peak-checked against its file's
 * true peak — with SAMPLE_LEVEL's seat no boosted sample can clip.
 */
declare const SAMPLE_TRIM: {
    readonly level_up: 0.6;
    readonly poi_discovery: 0.9;
    readonly poi_cleared: 1.2;
    readonly alert_1: 0.99;
    readonly alert_2: 0.69;
    readonly notification_success: 0.72;
    readonly success_1: 0.81;
    readonly stab_calm_1: 0.47;
    readonly stab_dramatic_1: 0.72;
    readonly stab_dramatic_2: 0.67;
    readonly stab_dramatic_3: 0.84;
    readonly ambient_hit_1: 0.88;
    readonly ambient_hit_2: 1.51;
    readonly ambient_hit_3: 3.24;
    readonly day_to_night: 0.73;
    readonly night_to_day: 0.66;
    readonly friend_alert: 0.58;
    readonly chicken_cluck: 0.94;
    readonly chicken_chatter: 1.76;
    readonly broadcast_fanfare: 0.62;
    readonly notify_soft_1: 1.1;
    readonly notify_soft_2: 1.16;
    readonly notify_soft_3: 1.19;
    readonly warn_soft_1: 1.12;
    readonly whistle_alert_1: 2.21;
    readonly notify_bleep_1: 0.83;
    readonly teleport_whoosh: 0.9;
    readonly thunder_rumble: 1.53;
    readonly water_splash: 2.2;
    readonly water_splash_big: 1.2;
    readonly logo_reveal: 0.33;
    readonly step_grass_1: 1;
    readonly step_grass_2: 1;
    readonly step_grass_3: 1;
    readonly step_grass_4: 1;
    readonly step_grass_5: 1;
};
export type SampleName = keyof typeof SAMPLE_TRIM;
/** The shelf's roster, for the sound lab and future pickers. */
export declare const SAMPLE_NAMES: SampleName[];
/**
 * Procedural WebAudio SFX — synthesized voices, plus THE RECORDED
 * SHELF: a small set of mastered one-shot stings (see SAMPLE_TRIM).
 * Kept short and soft; a local family server doesn't need ear-splitters.
 * Every sound rides the engine's sfx bus, which carries the warmth
 * low-pass, the glue compressor, and a touch of the shared room —
 * that shared air is what keeps synthesized blips from reading as
 * "computer noises" on top of the world instead of sounds inside it.
 *
 * THE SPATIAL LAW: any sound born at a place in the world plays
 * through `spatial(at, range, …)` — distance sets its loudness on a
 * shared rolloff curve, its side of you sets the stereo pan, and past
 * the family's max range it is culled before a single node is built
 * (cheaper than the flat world ever was). Sounds with no place — UI,
 * music stingers, your own body's feedback — skip the layer and stay
 * flat. Background music and ambience beds are NEVER spatialized.
 */
export declare class Sfx {
    private engine;
    constructor(engine: AudioEngine);
    /** The listener — the player's rendered position, set every frame. */
    private lx;
    private ly;
    /** Emitter override: while set, tone/noise route through it. */
    private dest;
    /** Follow the camera's subject; called once per frame from the loop. */
    setListener(x: number, y: number): void;
    /** Distance to the listener — for gating haptics/camera feel. */
    listenerDist(x: number, y: number): number;
    /**
     * Play `body`'s sounds from a place in the world. One shared
     * emitter chain (gain → equal-power pan → sfx bus) carries every
     * tone and noise the body fires, so a five-layer clang costs one
     * extra gain and one panner — and an out-of-range clang costs
     * nothing at all. Passing a null/undefined `at` plays flat, so
     * shared code paths can serve both worlds.
     */
    spatial(at: WorldAt | null | undefined, range: SoundRange, body: () => void): void;
    /** Browsers require a user gesture before audio can start. */
    unlock(): void;
    /** Decoded samples, held for the session. */
    private sampleBuf;
    private sampleLoading;
    /** The grass steps' round-robin cursor (random start per session). */
    private grassStepIdx;
    /** Fetch + decode a sample ahead of its moment. Failure stays quiet. */
    warmSample(name: SampleName): void;
    /**
     * Play a recorded one-shot from the shelf. Returns true if the
     * recording sounded; false warms it for next time so the caller can
     * fall back to its synth voice — the shelf never delays a moment.
     * Flat by default (UI and self feedback); inside `spatial()` it
     * rides the emitter like every other voice.
     *
     * `win` plays only a window of the buffer (offset + duration in
     * source seconds) under a short sin ramp at each edge, so a phrase
     * dealt out of a longer field bed never starts or ends on a click.
     */
    sample(name: SampleName, volume?: number, rate?: number, win?: {
        at: number;
        dur: number;
    }): boolean;
    private get ctx();
    private tone;
    private noise;
    /**
     * A soft brass voice: two sawtooths detuned a few cents apart (the
     * ensemble beat that makes horns warm) through a lowpass that
     * BLOSSOMS open over the attack — brass brightens as the player
     * leans in — with a gentle linear onset instead of tone()'s instant
     * strike. Built for fanfares that repeat without wearing thin.
     */
    private horn;
    hit(): void;
    hurt(): void;
    swing(): void;
    chop(): void;
    /** A stem snaps free of the plant: a leafy brush with a soft pop. */
    forage(): void;
    /** The joiner's mallet taps the piece home: a woody knock, rounder
     *  and lighter than the axe's bite — furniture being made, not
     *  timber being felled. Serves the bench AND the building site. */
    benchKnock(): void;
    /** The saw draws through the kerf: a short fibrous rasp — banded
     *  noise with a woody undertone, no ring (steel in wood, never
     *  steel on steel). */
    sawRasp(): void;
    /** Pick meets rock: a hard stony knock with a metallic tick on top. */
    mineClink(): void;
    /** A mined-out node collapses: low crunch + settling stone clatter. */
    rockCrumble(): void;
    /** Hammer rings the anvil: a bright ping over a body knock. */
    anvilClang(): void;
    /** The furnace draws breath: a soft roaring swell of hot air. */
    furnaceRoar(): void;
    /** The long groan of a felled trunk tipping over. */
    treeFall(): void;
    /** The crown hits the ground: deep thud + leaf wash. */
    treeImpact(): void;
    /** A body hitting the ground — dull and soft; heavy falls land lower. */
    bodyThud(heavy: boolean): void;
    collect(): void;
    /**
     * A craft batch seen through — the tools set down, not a fanfare:
     * a soft wooden tock as the last piece lands on the pile, a rising
     * third saying "done", and one warm ring to let the bench go quiet.
     * Bigger than the collect blip, smaller than swearing a quest —
     * it fires every batch, so it must never wear out its welcome.
     */
    workDone(): void;
    /**
     * The level-up fanfare v3 — a small brass choir, not a chiptune
     * arpeggio: a felt timpani landing, then horns lift G4 - C5 - E5
     * and plant a full C major chord over a low root, a soft ensemble
     * "ta - da - daaa" with real attack and a shimmer of air on top.
     * Soft-edged on purpose: several skills can level in one hunt, and
     * the herald must stay welcome on the fifth hearing. Sized to the
     * world show without overstaying.
     */
    levelUp(): void;
    /**
     * A place enters the chart — wonder, not triumph. A breath of
     * parchment air, a rising call answered an octave up, a warm fourth
     * held underneath, and the pin landing as one bright tick with
     * glitter air. Smaller than the level-up herald by design: finding
     * is a gift, leveling is a feat.
     */
    discovery(): void;
    /**
     * Swearing a quest — a page turned and a hand shaken, not a
     * fanfare: a soft paper breath, a rising fourth to say "begun", and
     * one clean tick as the entry lands in the journal. Smaller than the
     * discovery call by design: swearing is a start, finding is a gift.
     */
    questAccepted(): void;
    /**
     * A quest seen through — the level-up's herald a size down, with the
     * ledger shutting under it: a warm thump, three rising calls at the
     * herald's spacing, the chord planted with a sine root, and glitter
     * air on top. Finishing IS a feat; only leveling outranks it.
     */
    questComplete(): void;
    /**
     * Stepping through the Riftgate — a dimensional plunge, not a blip:
     * the deep mouth swallows (a falling sub womp), the veil tears (a
     * focused hiss of air), and a doubled shimmer climbs out the far
     * side with a sparkle landing on top. ~0.9s, sized to the swallow.
     */
    portal(): void;
    death(): void;
    /**
     * THE LONG ROAD TOGETHER (beastcraft v2): the companion's three
     * moments, kept small and warm — these are house sounds, not
     * fanfares. The fall is a low huff folding down; the rise is the
     * happy nip, two quick notes upward; the bond is one soft chirp
     * with a breath under it.
     */
    petDown(): void;
    petRise(): void;
    petBond(): void;
    crit(): void;
    bowTwang(): void;
    /** Steel leaves the scabbard: a bright scrape ringing UP and open. */
    weaponDraw(): void;
    /** Steel slides home: a duller scrape down, then the frog's soft click. */
    weaponStow(): void;
    /** Nocking + hauling the string back: a low wooden creak. */
    bowDraw(): void;
    /** Full draw reached: a tight little click — "locked in". */
    fullDrawClick(): void;
    /**
     * Loosing the arrow: string snap + a whistle that sharpens with the
     * charge — a full-power shot sounds meaner than a snap shot.
     */
    loose(charge: number): void;
    /** Combo swings pitch up the chain; the finisher lands with a thud. */
    swingCombo(stage: number): void;
    /** Snap shot — a quick dry pip from the hip. */
    snapShot(): void;
    /** The wand's heavy third bolt leaving — a fat slow whomp. */
    heavyBolt(): void;
    /** Chain lightning crackle. */
    chainZap(): void;
    /** Weapon Art / relic cast — a rising committed whoomph. */
    art(): void;
    /** A status reaction detonating — the combo payoff sting. */
    reaction(): void;
    /** Telegraphed blast landing. */
    blast(): void;
    /** The hotbar radial refilling to ready — a soft affirmative tick. */
    abilityReady(): void;
    zap(): void;
    /** A dash art or a drop into the crouch: a short breathy whoosh. */
    dash(): void;
    /**
     * THE SLIPPED BLOW: a blow that never landed — a lighter, quicker
     * breath than the dash, a swept-cloth hiss with a rising whisper
     * where the impact would have thudded. Reads as "missed", not "hit".
     */
    slip(): void;
    /** A kill: a small dark pop with a satisfying tail. */
    kill(): void;
    /** An instant ray firing — a bright sustained lance with a crack. */
    beam(): void;
    /** A hazard zone igniting — a low bloom that settles into a simmer. */
    ignite(): void;
    /** A self-buff flourish — an ascending affirmation chord. */
    empower(): void;
    /** The bank chest waking: a slow wooden creak, a latch, a lid knock. */
    chestOpen(): void;
    /** The lid settling shut: soft thud, wood shift, latch tick. */
    chestClose(): void;
    /** A door leaf swinging wide: latch click, then a long hinge creak. */
    doorOpen(): void;
    /** The leaf pulled to: a short creak, a frame knock, the latch. */
    doorClose(): void;
    /** A locked door refusing: two dull knocks and the hasp's rattle. */
    doorRattle(): void;
    /**
     * THE KEPT FLAME: a wick taking (the strike's soft pip and the
     * flame's first warm breath) or dying (one puffed breath, the
     * faintest ember tick). The quietest verb in the game on purpose —
     * a candle is mood, never an event.
     */
    candleFlip(lit: boolean): void;
    /**
     * A blow landing on a durable prop without finishing it: one solid
     * woody knock and a short splinter spray — the sound of progress.
     */
    propCrack(): void;
    /**
     * A prop bursting: a sharp crack, a spray of splinters, and the
     * clatter of pieces coming down. Barrels add a hollow cask boom
     * under the crack — a drum giving up.
     */
    propSmash(hollow?: boolean): void;
    /**
     * THE SALVAGE LAW's crack-and-drop: a whole construction giving up.
     * Timber goes with a frame groan, one sharp crack, and a stagger of
     * plank clatter; stone drops straight into a rubble slump — deeper,
     * duller, done. Bigger than propSmash on purpose: this was a wall.
     */
    demolishCrash(stone?: boolean): void;
    /** The counter bell: two soft brass partials over a felt strike. */
    shopBell(): void;
    /**
     * THE RAID HORN — a stolen ox-horn, blown once past somebody's
     * fence-line: a breathy attack sliding up into a long two-note hold
     * (root + rough fifth), a beat, then a shorter answering blast. Low
     * sawtooth body under a triangle head, so it reads brassy and cheap
     * — raiders don't own good horns.
     */
    warHorn(): void;
    /**
     * THE COUNT SPEAKS — one felt drum per closing second of an arena
     * clock (the last five of a muster or breather): a low timpani
     * touch under a tight leather slap, rising a shade as the gate
     * nears — the beat the stands stamp their feet to.
     */
    arenaCount(secs: number): void;
    /** Stepping up to a station: a wooden tap and the tools shifting. */
    stationOpen(): void;
    /** Parchment unrolling — the skills scroll, the blueprint sheaf. */
    parchment(): void;
    /** Going through your things: leather and cloth, a buckle tick. */
    satchel(): void;
    /** A quiet panel breathing open: two rising sine touches. */
    uiOpen(): void;
    /** …and settling closed: the same pair, descending. */
    uiClose(): void;
    /** A control accepting your press: one soft wooden tap. */
    uiTap(): void;
    /** The pad cursor stepping between controls — barely-there tick. */
    uiTick(): void;
    /** The cinematic frame rising: cloth settles, two warm low touches. */
    dialogueOpen(): void;
    /** …and bowing out: the pair descending, a last cloth breath. */
    dialogueClose(): void;
    /**
     * The typewriter's voice: one quill scratch per few letters —
     * pitch-wobbled noise ticks so a sentence reads as writing, not a
     * metronome. THE QUIET-HANDS LAW applies doubly: this fires dozens
     * of times per line and must stay at the edge of hearing.
     */
    dialogueScratch(): void;
    /**
     * The foreboding register: the same quill, dropped an octave and
     * dragged — a _grim_ span is HEARD slowing down before it's read.
     */
    dialogueScratchGrim(): void;
    /** A choice plate sliding in — soft parchment tap, one per plate. */
    dialogueChoiceIn(): void;
    /**
     * A gift landing mid-conversation: two warm bell partials over a
     * felt strike, and a little shimmer — generosity, not a jackpot.
     */
    dialogueGift(): void;
    /** Gear going on: leather shifts, a clasp snicks, weight settles. */
    equipGear(): void;
    /** Gear coming off — the softer reverse. */
    unequipGear(): void;
    /** A bite and a swallow. */
    eat(): void;
    /** Coin meeting coin — the money jingle, kept polite. */
    coins(): void;
    /** An item stowed — into the vault, the pack, a new slot. */
    stow(): void;
    /** An item let go onto the grass: a soft ground thud. */
    dropThud(): void;
    /** A seed pressed into worked soil. */
    plantSeed(): void;
    /** Construction landing: a solid wooden set-down, knocked twice. */
    buildThump(): void;
    /**
     * One foot meeting the ground. THE SOFT-STEP LAW: footsteps are felt
     * more than heard — grass is a brush of cloth against blades, stone
     * a small dry contact, never a clop. `vol` arrives gait-scaled from
     * the caller; distance and pan come from the spatial emitter.
     */
    footstep(mat: 'grass' | 'stone' | 'wood' | 'dirt' | 'sand' | 'cave' | 'wet', vol: number): void;
    /**
     * A body stepping into (or out of) shallow water: one honest plunk —
     * a pitched blip swallowed by a short bright spray. One-shot grains
     * only (the granular ambience law: no continuous noise beds, ever).
     */
    splash(vol: number): void;
    /**
     * A flock flushing off the turf: a quick ripple of banded wing puffs
     * (the soft-step dialect — air brushed by feathers, never a clap)
     * climbing slightly in pitch as the birds lift, capped with two tiny
     * alarm chips. One emitter at the flock's centroid; distance and pan
     * come from the spatial law.
     */
    birdFlutter(): void;
    /**
     * One idle chip from a grounded bird — two grains, up then down,
     * quieter and shorter than the ambience bed's songbird phrases so it
     * reads as THIS bird here, not the far chorus.
     */
    birdChip(): void;
    /** The chatter bed's phrase deal cursor (random start per session). */
    private chickenPhraseIdx;
    /**
     * THE HENYARD SPEAKS: one voice from the yard — either the clean
     * single cluck or a phrase dealt from the 41-second field bed of
     * hen chatter (CHICKEN_PHRASES, cut points measured against the
     * recording's own silences), with a breath of rate wobble so the
     * flock never repeats a waveform. Ambient by law: no synth
     * fallback — a cluck the shelf can't sound yet simply doesn't
     * happen, and nobody misses a sound that was never scheduled.
     * Always called inside `spatial()` from the henyard scheduler.
     */
    chicken(): void;
}
export {};
//# sourceMappingURL=sfx.d.ts.map