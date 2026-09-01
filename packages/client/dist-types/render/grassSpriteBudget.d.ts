/**
 * THE MEADOW RIDES THE SHEAR — the grass row-sprite economy, as pure
 * arithmetic (round 13).
 *
 * Round 6 gave the flat coat THE CALM CANVAS: undisturbed level-0
 * grass bakes at wind cadence and blits once. Two lanes never joined
 * it, because both must y-sort per row: tall thickets (two depth bands
 * wrap the bodies walking through them) and every blade on an ELEVATED
 * surface (the plateau band items own their rows). Both lanes rebuilt
 * full blade geometry live, per tile, per frame — measured at 5,000+
 * blades/frame in the capitals and 3,400 in the dense forest, which is
 * 20-60k Path2D segment ops a frame: the single largest steady-state
 * consumer in the whole client, in every scene surveyed.
 *
 * The fix is the tree lane's own law one size down. A row of grass
 * bakes ONCE into a sprite (SAME-BRUSH: the live builders paint it
 * under a swapped frame), refreshes on a stretched cadence, and every
 * frame blits through a horizontal SHEAR about the row's base line by
 * the wind's movement since the bake — primary sway at frame rate at
 * any cadence, cadence misses degrading into a slightly larger shear
 * instead of a stutter. Tiles a body can reach are excluded at bake
 * and keep the live path (partings and spring-back never lag a frame).
 *
 * The metering laws are rounds 10-12 verbatim:
 *  - the budget is an ADMISSION GATE; overflow builds live (THE
 *    STILL-WORLD BARGAIN) — never bake-then-sweep;
 *  - a sprite used THIS frame is not cold;
 *  - the sweep aims at RELIEF, not the ceiling;
 *  - one sprite is never a budget;
 *  - a pool is BYTES, not slots, indexed by shape class, never probed.
 */
/** World-aligned cell span, tiles. Cells cut on absolute multiples so
 *  panning never renames a run (a viewport-relative cut would re-key
 *  every sprite each time the camera crossed a tile). */
export declare const GRASS_CELL_SPAN = 16;
/** Sprite refresh cadence floor, ms. Deliberately far past the calm
 *  canvas's 66ms: the shear carries primary sway between beats, so a
 *  beat only re-centers flutter, shimmer and per-tile wind detail (the
 *  same bargain the tree cadence law shipped). The LIVE cadence adapts
 *  upward from here — see rowCadenceStep — so the refresh rate is set
 *  by a repaint budget, never by the cell count. */
export declare const GRASS_ROW_CADENCE_MS = 500;
/** Adaptive cadence ceiling: past this, detail refresh is ~0.25Hz and
 *  only the shear moves — still smooth, but the shimmer crawls. */
export declare const GRASS_ROW_CADENCE_MAX_MS = 4000;
/**
 * THE CADENCE PAYS A BUDGET, NOT A SCHEDULE. A fixed beat multiplied
 * by the cell count is a treadmill: 150 cells at 350ms was measured
 * re-baking 12-16 cells EVERY frame at 4x throttle — the entire live
 * cost, back, plus canvas fills. The cadence instead self-tunes to a
 * repaint target: too many bakes last frame stretches the beat, idle
 * frames relax it back toward the floor. A weak machine automatically
 * runs a longer beat — exactly the machines that need it — and the
 * shear keeps the sway smooth at ANY beat.
 */
export declare function rowCadenceStep(cadenceMs: number, bakesLastFrame: number): number;
/** Per-cell deadline jitter (0..0.4 of the cadence, keyed) so cells
 *  baked in one arrival frame don't thunder together every beat. */
export declare function rowCadenceJitter(key: number, cadenceMs: number): number;
/** Per-frame bake spend, ms — cadence refreshes queue behind this so a
 *  storm of due rows never lands in one frame. A floor of one bake per
 *  frame keeps the estimate sampled (bakeAdmission's own law). */
export declare const GRASS_BAKE_MS_BUDGET = 1.5;
/** Ledger ceiling / sweep target. Sized from measurement, not hope: a
 *  dense-forest working set at zoom 1 / dpr 2 is ~90MB of band sprites
 *  even extent-fitted, and a capital's elevated rows are comparable —
 *  the band ledger (128MB) went through the same sizing in round 12.
 *  Overflow rows draw live at the gate. */
export declare const GRASS_SPRITE_BUDGET_BYTES: number;
export declare const GRASS_SPRITE_RELIEF_BYTES: number;
/** No single cell may claim this much — past it the cell draws live. */
export declare const GRASS_SPRITE_ONE_MAX_BYTES: number;
/** Retired-canvas pool: bytes, not slots; slot ceiling keeps monsters
 *  out of the pool (they go to GC). */
export declare const GRASS_POOL_MAX_BYTES: number;
export declare const GRASS_POOL_SLOT_MAX_BYTES: number;
/**
 * Tip drift per unit of wind term, as a fraction of blade height.
 * Traced from buildBlade: tipDx = windTerm * cant * 0.42 with
 * cant = h * (0.55 + 0.2 * phase); at the phase mean (0.5) the tip
 * moves windTerm * 0.65 * 0.42 = windTerm * 0.273 of its height. The
 * shear applies exactly that ratio per pixel of height above the base
 * line, so between cadence beats the sprite's crowns track the same
 * cantilever the live path would draw.
 */
export declare const SHEAR_PER_WIND = 0.273;
/**
 * Shear ceiling. The shear is exact only for the tips; blade BASES off
 * the reference line slide sideways by shear * distance-to-line. Under
 * an honest cadence the delta is a fraction of this cap; the cap
 * exists so a starved queue (admission declines, budget exhaustion)
 * degrades into slightly-lagged sway instead of roots skating across
 * the ground.
 */
export declare const SHEAR_CAP = 0.1;
/** A bake is stale-by-scale past this ratio — inside it, the blit
 *  rescales (THE LAMP RIDES THE GLIDE: never re-bake mid-glide for a
 *  scale the camera hasn't settled on). */
export declare const GRASS_SCALE_SLACK = 0.25;
/** The wind component the blades actually bend by (see buildBlade). */
export declare function windTerm(bx: number, by: number): number;
/** Live shear for a sprite baked at `baked` wind term, clamped. */
export declare function rowShear(nowTerm: number, bakedTerm: number): number;
/** First tile of the world-aligned cell containing tx. */
export declare function cellStartTx(tx: number): number;
/** Blit still allowed at this scale pair (rescale in the transform)? */
export declare function scaleFresh(sNow: number, sBaked: number): boolean;
export declare const enum GrassVerdict {
    Admit = 0,
    Full = 1,
    TooBig = 2
}
/** THE BUDGET IS AN ADMISSION GATE — decide before painting. */
export declare function admitGrassSprite(ledgerBytes: number, bytes: number): GrassVerdict;
/**
 * THE SWEEP KEEPS THE HEADROOM: it triggers at RELIEF, not at the
 * ceiling. Sweeping only at the ceiling lets a scene change fill the
 * ledger with the OLD scene's cold sprites to a hair under budget and
 * latch the admission gate shut — measured doing exactly that (95.6MB
 * against 96, zero admissions, every cell declining forever). The gap
 * between relief and ceiling IS the gate's room to admit the ground
 * being walked onto.
 */
export declare function grassSweepNeeded(ledgerBytes: number): boolean;
export declare function grassSweepRelieved(ledgerBytes: number): boolean;
export interface GrassSweepEntry {
    key: number;
    used: number;
}
/**
 * Sweep order: coldest first, and NEVER a sprite this frame drew with
 * (evicting what you just blitted is the thrash — round 10's first
 * law). Returns keys in eviction order; the caller stops at relief.
 */
export declare function planGrassSweep(entries: GrassSweepEntry[], frameNo: number): number[];
/** Pool shape class: canvases quantize to 64px steps per axis so
 *  acquisition is an exact bucket lookup, never a probe (round 11:
 *  the search was the constraint, not the size). */
export declare function grassPoolClass(w: number, h: number): number;
export declare function grassPoolAdmits(poolBytes: number, bytes: number): boolean;
//# sourceMappingURL=grassSpriteBudget.d.ts.map