/**
 * THE TRACKED GROUND — footprints stamped where feet leave the earth.
 *
 * Every print is an HONEST record: it is stamped at the exact world
 * position a planted foot occupied at the moment it lifted (the leg
 * rig's lift ring — legs.ts), never dead-reckoned from the body. A
 * standing shuffle leaves a tight cluster; a sprint leaves a long
 * alternating ladder; a mounted courser leaves hoof pairs; a basilisk
 * leaves six-track claw rows. Tracking a fleeing body across dirt,
 * sand, or snow is real gameplay — the trail IS the data.
 *
 * Design laws:
 * - THE GROUND DECIDES THE INK. A print only exists on materials that
 *   take one (dirt, path, tilled soil, sand, snow); each carries its
 *   own two-tone ink — a pressed dark floor plus a displaced-material
 *   crest offset AWAY from the world's one sun (a depression's lit
 *   wall faces the sun; the terrain sun-law's mirror). Grass, stone,
 *   wood, and wet ground swallow the mark — extend PRINT_INKS to
 *   teach a new material, nothing else.
 * - THE PRINT SPEAKS THE STYLE. People leave ABSTRACT marks — a
 *   single chamfered scuff chip per step (boot a faceted tread chip,
 *   bare a softer smaller chip): the alternating rhythm of the trail
 *   says "footsteps", never a literal sole (user law 2026-08-17 —
 *   literal boot anatomy read too real for the flat vector style).
 *   Beasts keep their iconic marks (cloven hoof, paw pad + beans,
 *   bird-claw trident, claw fans, crab spike) — those are already
 *   game iconography, mirrored left/right by the leg's lateral sign
 *   and scaled ~1:1 with the body. Fine marks (toes, claws) join
 *   only when the print is large enough on screen to earn them.
 * - THE PLANE LAW. Prints lie flat on the ground: rotated in world
 *   space, squashed by the same ground-perspective constant every
 *   combat-fx circle uses, lifted by terrain elevation — and painted
 *   in the ground-decal stratum (under every body, over the turf), so
 *   the whole-frame lightmap tints them with the soil they sit in.
 * - THE BUDGET BREATHES. A fixed ring pool (cap) recycles oldest-first;
 *   above the soft cap the OLDEST prints get their remaining life
 *   compressed to a fast fade — a stampede clears its own clutter in
 *   ~a second while fresh tracks stay crisp. Base life ~1 minute so a
 *   quarry's trail survives long enough to follow. One kill switch
 *   (FOOTPRINT_TUNE.enabled) empties the field instantly.
 */
/** All the feet the world walks on: the beast rig's foot words plus
 *  the humanoid pair (booted / bare). */
export type FootWord = 'boot' | 'bare' | 'hoof' | 'paw' | 'bearpaw' | 'claw' | 'turtleclaw' | 'crabspike' | 'lizardclaw';
/** The knobs. Live-tunable; `enabled = false` also clears the field. */
export declare const FOOTPRINT_TUNE: {
    enabled: boolean;
    /** Hard pool size — the ring recycles oldest-first past this. */
    cap: number;
    /** Above this many live prints, the oldest fast-fade (pressure). */
    softCap: number;
    /** Base life in ms (per-material lifeMult scales it). */
    lifeMs: number;
    /** The quiet end-of-life fade window. */
    fadeMs: number;
    /** Fade window forced onto over-budget prints — clutter clears fast. */
    pressureFadeMs: number;
    /** Global print-size dial (1 = true to the foot). */
    sizeMult: number;
    /** Global ink-strength dial. */
    alphaMult: number;
};
export interface PrintInk {
    /** The pressed floor of the print. */
    press: string;
    /** Displaced-material crest ringing it (null = press only). */
    rim: string | null;
    /** Press alpha at full strength. */
    a: number;
    rimA: number;
    /** Material memory: snow holds a track, wind takes sand sooner. */
    lifeMult: number;
}
/**
 * What a lifted foot leaves on each ground. Null = the material takes
 * no print (turf springs back, stone doesn't yield, water closes).
 * New materials join here and nowhere else.
 */
export declare function printInkFor(tile: number | undefined): PrintInk | null;
export interface PrintShape {
    /** Filled polys in the foot frame: +x toe-ward, ±y lateral, unit =
     *  one foot length (heel −0.5 → toe +0.5). */
    polys: number[][];
    /** Fine marks (toes, claws) — only when the print earns the pixels. */
    fine?: number[][];
    /** Foot length in tiles at body scale 1 — the 1:1 ruler. */
    len: number;
}
export declare const PRINT_SHAPES: Record<FootWord, PrintShape>;
/** Structural slice of Camera — keeps this module renderer-agnostic. */
export interface PrintCamera {
    scale: number;
    worldToScreenInto(wx: number, wy: number, w: number, h: number, out: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
}
export declare class FootprintField {
    private readonly cap;
    private readonly slots;
    /** Monotonic ring cursors: slot i lives at slots[i % cap]. Ring
     *  order IS age order — stamps only ever append. */
    private head;
    private tail;
    /** Lazily-built Path2D per foot word (browser only; tests run node). */
    private paths;
    private readonly scratch;
    constructor(cap?: number);
    get liveCount(): number;
    clear(): void;
    stamp(x: number, y: number, dir: number, side: number, speed: number, word: FootWord, sizeK: number, ink: PrintInk, now: number, faint?: number): void;
    /**
     * Advance the ring past the dead, then apply budget pressure: every
     * live print beyond the soft cap compresses the OLDEST prints'
     * remaining life into the fast-fade window. dieAt only ever moves
     * earlier — pressure never resurrects.
     */
    tick(now: number): void;
    private pathsFor;
    /**
     * Paint the field. Called in the ground-decal stratum — after the
     * turf, before the y-sorted world — so bodies stand on their own
     * trail and the frame's lightmap tints every print with its soil.
     */
    draw(ctx: CanvasRenderingContext2D, cam: PrintCamera, w: number, h: number, lift: (x: number, y: number) => number, now: number, squash: number): void;
}
//# sourceMappingURL=footprints.d.ts.map