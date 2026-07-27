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
 * Procedural WebAudio SFX — no audio files, everything synthesized.
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
    private get ctx();
    private tone;
    private noise;
    hit(): void;
    hurt(): void;
    swing(): void;
    chop(): void;
    /** A stem snaps free of the plant: a leafy brush with a soft pop. */
    forage(): void;
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
     * The level-up fanfare — a ceremony, not a blip: a grounded thump
     * the moment lands on, a four-note herald climbing the major triad,
     * then the full chord planted on top with a glitter tail. Sized to
     * the world show (~5.6s of pillar and rings) without overstaying.
     */
    levelUp(): void;
    /**
     * Stepping through the Riftgate — a dimensional plunge, not a blip:
     * the deep mouth swallows (a falling sub womp), the veil tears (a
     * focused hiss of air), and a doubled shimmer climbs out the far
     * side with a sparkle landing on top. ~0.9s, sized to the swallow.
     */
    portal(): void;
    death(): void;
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
    /** Dodge dash: a short breathy whoosh. */
    dash(): void;
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
    /** The counter bell: two soft brass partials over a felt strike. */
    shopBell(): void;
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
}
export {};
//# sourceMappingURL=sfx.d.ts.map