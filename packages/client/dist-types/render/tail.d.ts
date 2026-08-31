import { type FoxLook, type GnollLook, type LynxLook } from './rig.js';
/**
 * THE TAIL IS A SIMULATION, NOT A POSE — the cape contract in muscle.
 * A world-space verlet chain (x, y in tiles + a height axis) hangs off
 * the back of the hips and is PULLED behind the body: run and it
 * streams out and lags the turn, stop and it swings past and settles,
 * spin and it wraps around the torso column and recovers. Where cloth
 * obeys wind and gravity, a tail has TONE: every node carries a spring
 * toward the species' rest carriage (low, sunk, behind the facing), so
 * the brush always comes home to the hyena's flag instead of hanging
 * like a rope. The renderer ticks it once per frame beside the cape
 * sim and projects the nodes; depth follows the cape's facing law, so
 * the z-order is right at every one of the eight bands by
 * construction.
 */
interface TailNode {
    x: number;
    y: number;
    z: number;
    px: number;
    py: number;
    pz: number;
}
export declare class TailSim {
    private readonly heavy;
    private readonly rootOff;
    private readonly tipCurl;
    private readonly restCarry;
    readonly nodes: TailNode[];
    /** Per-body phase — a warband never wags in sync. */
    readonly phase: number;
    private readonly segLen;
    private readonly segs;
    private lastAx;
    private lastAy;
    private live;
    private isFront;
    private restlessUntil;
    /**
     * True while the brush genuinely moves (anchor travel or a tip still
     * swinging after a stop) — the renderer's cue to re-bake the body
     * sprite at full rate. Calm tails fall back to the idle cadence,
     * whose ~8-frame resample is exactly right for the resting wag.
     */
    restless: boolean;
    /** Tip speed (tiles/s) — the settle detector. */
    tipSpd: number;
    /**
     * `rootOff` seats the root behind the anchor (tiles). The default is
     * the humanoid hip line; a QUADRUPED must pass its own body
     * half-length or the tail roots INSIDE the torso and hangs between
     * the legs — the fox lesson.
     *
     * `tipCurl` lifts the rest carriage back UP toward the tip (a
     * fraction of the root height, squared along the chain) — the
     * feline hook: a big cat's tail sweeps low off the haunch and rises
     * through its last third. Zero (the default) is the hanging carry
     * every existing tail ships with, verbatim.
     *
     * `restCarry` is the rest droop fraction: how much of the root
     * height the chain gives up by the tip while standing. The default
     * 0.55 is the hyena flag every shipped tail wears; a horse's hair
     * fall HANGS (≈0.88) and only lifts toward the stream at a gallop —
     * speed scales the carry off this same dial.
     */
    constructor(heavy: number, seed: number, rootOff?: number, tipCurl?: number, restCarry?: number);
    /**
     * Advance the tail one frame. (ax, ay) is the body's world position
     * (lunge included), az the HIP height in tile units, dir the facing
     * in radians. sizeK scales the whole appendage (the packlord 1.42).
     */
    update(ax: number, ay: number, az: number, dir: number, dt: number, tSec: number, sizeK: number, 
    /**
     * THE RAISED FLAG (house cat): 0..1 stands the rest carriage UP —
     * the root leaves the rump level, the chain rises through
     * vertical, and the tip hooks forward past it (the domestic
     * question mark). 0 keeps every shipped tail's carriage verbatim;
     * speed streams a raised tail back down toward the classic trail,
     * so a darting cat levels its flag by construction.
     */
    perk?: number): void;
    /**
     * Paint side is a FACING law, not a tail-position law — the cape's
     * exact hysteresis. The tail lives on the back, and the back is
     * toward the camera exactly when the facing points up-screen.
     */
    front(fy: number): boolean;
}
/**
 * THE CROC TAIL IS A LIMB, NOT A BRUSH — the basilisks' rebuilt tail
 * sim (user mandate: the tail is the character's weapon and its
 * swimming engine — huge, meaty, proportional to the body, and it
 * must never scrunch). Three laws separate it from every brush on
 * the cape contract:
 *
 * 1. THE UNBENDING ROOT: a tail that is mostly muscle around a chain
 *    of vertebrae cannot fold on itself. Every joint carries a HARD
 *    bend clamp — tight at the root (the meat), opening toward the
 *    tip (the whip) — enforced inside the constraint loop, plus a
 *    straightening spring that pulls each segment toward its
 *    parent's line. A spin wraps a brush around the torso; it sweeps
 *    this tail around in one stiff arc.
 *
 * 2. THE SCULL: the drive is a slow, heavy traveling wave — the
 *    crocodile's swimming stroke read on land as the walking sway.
 *    Amplitude grows along the chain and with speed; the frequency
 *    stays LOW (a two-meter tail beats like an oar, never like a
 *    terrier). At rest a lazy residue of the same wave keeps it
 *    alive.
 *
 * 3. THE DRAG: the rest carriage runs off the stern at hull height,
 *    sinks to the ground by two-thirds of the length, and the last
 *    third DRAGS — the furrow-cutting read of every reference croc.
 *
 * Same lifecycle contract as every sim in this file: snap-to-rest on
 * first sight/teleport, restless cue for the body-sprite cache,
 * front() facing hysteresis, seeded per-body phase.
 */
export interface CrocTailOpts {
    /** Total chain length (tiles) — the WHOLE tail, root to tip. */
    len: number;
    /** Mass feel: scales damping weight and settle gravity. */
    heavy: number;
    /**
     * Rigidity dial 0..1: scales the straightening spring AND tightens
     * the bend clamps. The elder is a stone column (0.85); the fen
     * swimmer keeps a supler chain (0.55).
     */
    stiff: number;
    /** Scull wave amplitude scale (the fen swims hardest). */
    wave: number;
}
export declare class CrocTailSim {
    private readonly rootOff;
    private readonly opts;
    readonly nodes: TailNode[];
    readonly phase: number;
    private readonly segLen;
    private readonly segs;
    private lastAx;
    private lastAy;
    /** THE SLEWED FACING: the sim's own heading, chasing the body's at
     *  a heavy fixed rate — the whole anchor frame (root seat, rest
     *  line, scull axis) reads THIS, so an instant about-face of the
     *  body turns the tail like a ship's boom instead of teleporting
     *  its root through the chain. */
    private dirS;
    /** THE STEADY OAR: the scull's phase is INTEGRATED (phase += hz·dt),
     *  never computed as tSec·hz — a speed-dependent frequency times
     *  absolute clock time leaps whole radians whenever speed wobbles a
     *  frame (Δphase = 2π·Δhz·tSec, and tSec is minutes), which turned
     *  the slow stroke into random-phase forcing at the tip: the
     *  rattlesnake bug. */
    private scullPhase;
    /** Smoothed anchor speed — mass swells its stroke over ~⅛ s; the
     *  raw per-frame speed carries interpolation jitter straight into
     *  the wave's amplitude and carriage. */
    private spdS;
    private live;
    private isFront;
    private restlessUntil;
    restless: boolean;
    tipSpd: number;
    constructor(seed: number, rootOff: number, opts: CrocTailOpts);
    /** The rest height of node ti (0..1) given the stern height az. */
    private restZ;
    update(ax: number, ay: number, az: number, dir: number, dt: number, tSec: number, sizeK: number): void;
    /** The cape's facing-law hysteresis, verbatim. */
    front(fy: number): boolean;
}
/**
 * THE BOBTAIL IS A SIMULATION TOO — the lynx's stub on the same verlet
 * contract as the gnoll brush, retuned for a cat: THREE short segments
 * of pure muscle (tone far above the hyena's flag, damping heavier),
 * and a rest carriage that PERKS — the stub stands up-and-back off the
 * high rump at rest and through the pounce crouch (`perk` 1), then
 * flattens toward level as the body opens into a run. The flick is a
 * quick tip beat, agitated while wound, lazy at rest. Same restless
 * cue, same facing-law front() hysteresis, same lifecycle on the
 * renderer's anim map.
 */
export declare class BobtailSim {
    private readonly heavy;
    /**
     * Rest-carriage dial: 1 = the cat's perked stub (the shipped
     * behavior, exactly); fractions lay the chain down — the turtle's
     * armored tail TRAILS low off the stern instead of standing.
     */
    private readonly standK;
    readonly nodes: TailNode[];
    readonly phase: number;
    private readonly segLen;
    private readonly segs;
    private lastAx;
    private lastAy;
    private live;
    private isFront;
    private restlessUntil;
    restless: boolean;
    tipSpd: number;
    constructor(heavy: number, seed: number, 
    /**
     * Rest-carriage dial: 1 = the cat's perked stub (the shipped
     * behavior, exactly); fractions lay the chain down — the turtle's
     * armored tail TRAILS low off the stern instead of standing.
     */
    standK?: number);
    /**
     * (ax, ay) body world position (lunge included), az the RUMP-TOP
     * height in tiles (the stub roots high, not at the hip line), dir
     * the facing, `perk` 0..1 — 1 through the pounce crouch, and the
     * caller may feed idle interest.
     */
    update(ax: number, ay: number, az: number, dir: number, dt: number, tSec: number, sizeK: number, perk: number): void;
    /** The cape's exact facing-law hysteresis. */
    front(fy: number): boolean;
}
export interface BobtailDrawOpts {
    hurt: boolean;
    /**
     * True when the facing points up-screen: the perked stub stands
     * against the cat's own back, so it shows its pale UNDERSIDE — a
     * dark stub against the coat read as a hole punched in the body.
     */
    back: boolean;
}
/**
 * Paint the projected bob: a short tapered ribbon through the
 * simulated nodes, black-dipped tip, the champion's silver ring below
 * it. Plain path calls — no Path2D — so node tests can walk it.
 */
export declare function drawBobtail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, look: LynxLook, wk: number, opts: BobtailDrawOpts): void;
export interface TurtleTailStyle {
    skin: string;
    spike: string;
    /** Width multiplier — the colossus drags a thicker trailer. */
    heavy: number;
}
/**
 * Paint the projected turtle tail: a tapered armored cone off the
 * stern with spikelets marching down the dorsal edge — low-carried
 * muscle, never a plume. The painter never learns a species (the
 * canid-lane law): dials ride the style. Plain path calls — no
 * Path2D — so node-side painter tests can walk every coordinate.
 */
export declare function drawTurtleTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: TurtleTailStyle, wk: number, opts: BobtailDrawOpts): void;
export interface HorseTailStyle {
    /** Pre-lifted hair tone (the portrait law: shade(mane, 18)). */
    hair: string;
    /** Strand ink a step darker than the fall. */
    strand: string;
    /** Width multiplier — the garron drags a shaggier fall. */
    heavy: number;
}
/**
 * Paint the projected HORSE TAIL — a full fall of hair off the croup:
 * a bound dock at the root opening into a draped sheet that swells
 * past mid-length and closes on a ragged hem, never a rope. Loose
 * strands ride the fall for texture; a quiet contour separates hair
 * from same-coat croup. The painter never learns a species (the
 * canid-lane law): dials ride the style. Plain path calls — no Path2D
 * — so node-side painter tests can walk every coordinate.
 */
export declare function drawHorseTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: HorseTailStyle, wk: number, opts: BobtailDrawOpts): void;
export interface SabercatTailStyle {
    coat: string;
    /** The dark banding ink near the tip — the saber stripe read. */
    band: string;
    heavy: number;
}
/**
 * Paint the projected SABERCAT TAIL — the big cat's rope: long, slim,
 * near-constant width with a soft blunt tip, dark-banded through its
 * last third. Nothing like the fox's plume or the horse's hair fall —
 * a cat's tail is MUSCLE all the way out. Style dials only (the
 * canid-lane law). Plain path calls — no Path2D — so node-side
 * painter tests can walk every coordinate.
 */
export declare function drawSabercatTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: SabercatTailStyle, wk: number, opts: BobtailDrawOpts): void;
export interface FoxBrushDrawOpts {
    hurt: boolean;
    /**
     * True when the facing points up-screen: the brush swings against
     * the fox's own back, so its fill steps to the pale underfur — a
     * same-coat plume over the body read as the body grown a tumor.
     */
    back: boolean;
}
/**
 * Paint the projected BRUSH — the fox's flag, the biggest tail any
 * beast in the wood carries: a full plume swelling past mid-length and
 * HOLDING its volume almost to the end, the darker root third grown
 * in (never a banded raccoon), and the flag tip — white on the wild
 * skulk, smoke over one ember ring on the matriarch. Pale underfur
 * rides the low edge; a quiet contour separates the plume from
 * same-coat flanks. Plain path calls — no Path2D — so node-side
 * painter tests can walk every coordinate.
 */
export declare function drawFoxBrush(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, look: FoxLook, wk: number, opts: FoxBrushDrawOpts): void;
/** Pre-resolved house-cat tail tones — the painter never learns a species. */
export interface HousecatTailStyle {
    coat: string;
    under: string;
    /** Ring/tip/dark ink. */
    mark: string;
    /** Tail dress: ringed, dark-tipped, plain coat, or mark end to end. */
    kind: 'rings' | 'tip' | 'coat' | 'dark';
    /** The plume vs the whip — hair length is told from the tail first. */
    longhair: boolean;
}
/**
 * Paint the projected HOUSE-CAT TAIL. Two silhouettes share one
 * ribbon: the shorthair's slim whip (near-even taper, rounded tip)
 * and the longhair's plume (volume that swells past mid-length, edge
 * fluff at close zoom). The dress rides on top — rings walk the
 * outer two-thirds (the raccoon read), the tip dips, or the dark
 * point runs end to end. Plain path calls, no Path2D, so node-side
 * painter tests can walk every coordinate.
 */
export declare function drawHousecatTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: HousecatTailStyle, wk: number, opts: {
    hurt?: boolean;
    back?: boolean;
}): void;
/** Pre-resolved wolf-brush tones — the painter never learns a species. */
export interface WolfBrushStyle {
    coat: string;
    under: string;
    /** The tip dip: saddle-dark on the pack, frost-pale on the matriarch
     *  — the inversion detail, kept on physics. */
    tip: string;
    /** Volume scale — the matriarch's brush out-masses the pack's. */
    heavy: number;
}
/**
 * Paint the projected WOLF BRUSH — the canid hang: bushy through the
 * middle, slimmer than the fox's flag plume, dipped at the tip in the
 * style's own ink. Pale underfur rides the low edge; a quiet contour
 * separates the brush from same-coat flanks. Plain path calls — no
 * Path2D — so node-side painter tests can walk every coordinate.
 */
export declare function drawWolfBrush(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: WolfBrushStyle, wk: number, opts: FoxBrushDrawOpts): void;
/** Pre-resolved fey-banner tones — the painter never learns a species. */
export interface FeyBrushStyle {
    coat: string;
    /** The dusk mantle ink — the banner's quiet contour. */
    mantle: string;
    /** The court's cold light: the tip dip, the low seam, the shed motes. */
    light: string;
    /** Volume scale — the banners run slimmer than any wolf's brush. */
    heavy: number;
}
/**
 * Paint one projected FAE BANNER — the court hound's tail voice. The
 * wolves dip their tips in ink or frost; the hound's banners end in
 * LIGHT: a slim silk taper, a pale seam riding the low edge, the last
 * knuckle dipped in cold glimmer, and two shed motes trailing off the
 * tip — deterministic from the chain's own geometry, so the sheet, the
 * portrait, and the fight all shed the same light. Two of these run
 * per hound (the TWIN BANNERS, the silhouette signature no other body
 * owns); each rides its own sim, so no pair ever streams in sync.
 * Plain path calls — no Path2D — so node-side painter tests can walk
 * every coordinate.
 */
export declare function drawFeyBrush(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: FeyBrushStyle, wk: number, opts: FoxBrushDrawOpts): void;
export interface TailDrawOpts {
    hurt: boolean;
}
/**
 * Paint the projected brush: a tapered ribbon through the simulated
 * nodes with the bushy mid-length bulge, the trailing-half form shade,
 * pale underfur along the low edge, two mask rings that WRAP the
 * volume (rungs, not blobs), and the mask-dipped tip. `pts` are the
 * nodes projected to screen by the caller; `wk` is the width scale
 * (camera scale × body size). Built with plain path calls — no Path2D
 * — so the node-side painter tests can walk every coordinate.
 */
export declare function drawTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, gn: GnollLook, wk: number, opts: TailDrawOpts): void;
export {};
//# sourceMappingURL=tail.d.ts.map