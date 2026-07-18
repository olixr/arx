export interface WindSample {
    /** Bend vector in world tiles (unit cantilever at reference height). */
    bx: number;
    by: number;
    /** Scalar strength ~[-0.6, 1.4] — what the trees lean on. */
    s: number;
    /**
     * Luminance wave ~[-1, 1]: a much LONGER-wavelength signal than the
     * bend, so the shimmer arrives as broad rolling swaths of light —
     * never per-blade sparkle or screen-sized blotches.
     */
    l: number;
}
/**
 * Coherent vector wind: two travelling swells over a breathing gust
 * envelope, with the front's phase BENT by a slow cross-wave (fronts
 * curve like real weather) and a perpendicular meander (swaths snake
 * sideways as they pass). Pure function of position + time.
 */
export declare function windAt(wx: number, wy: number, tSec: number): WindSample;
/** Scalar wind for anything that only bends one way (the trees). */
export declare function windScalarAt(wx: number, wy: number, tSec: number): number;
export interface Blade {
    bx: number;
    by: number;
    h: number;
    w: number;
    lean: number;
    phase: number;
    bin: number;
    lumJit: number;
    tone: number;
    seg2: boolean;
}
export interface Flower {
    bx: number;
    by: number;
    h: number;
    size: number;
    pal: number;
    phase: number;
}
export interface GrassTileGeom {
    /** Short blades — always drawn under entities. */
    under: Blade[];
    /** Tall blades split at the tile's midline for y-sorting. */
    north: Blade[];
    south: Blade[];
    /** Clump crowns: dark root chips anchoring dense tufts. */
    roots: Array<{
        x: number;
        y: number;
        w: number;
    }>;
    flowers: Flower[];
}
/**
 * Deterministic geometry for one grass tile. Coverage noise deals the
 * hand: bare / strands / stand / clump. Detail.Tuft forces a clump,
 * Detail.Flowers plants a bloom patch, and a low-frequency meadow noise
 * scatters lone flowers so they gather into natural drifts.
 */
export declare function generateGrassTile(tx: number, ty: number, tileId: number, detailId: number): GrassTileGeom;
/** Radial falloff of a body pushing into grass: 1 at center, 0 at R. */
export declare function disturbFalloff(dist: number, radius: number): number;
export interface Disturber {
    id: number | 'own';
    x: number;
    y: number;
    r: number;
}
type WTS = (wx: number, wy: number) => {
    x: number;
    y: number;
};
type Sampler = (tx: number, ty: number) => number | undefined;
type DetailFn = (tx: number, ty: number) => number;
export interface GrassBounds {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}
export declare class GrassSystem {
    private readonly tiles;
    /** Position → live state, for waking tiles bodies move through. */
    private readonly posIndex;
    private readonly lastPos;
    private live;
    private tSec;
    private nowMs;
    private paths;
    private touched;
    private readonly touchedFlag;
    /** Scratch: disturbers near the tile currently being built. */
    private near;
    /**
     * Per-frame flutter table: every blade's tremble is one of 32 phase
     * bins sampled once per frame — thousands of Math.sin calls become
     * thirty-two.
     */
    private readonly flutter;
    private readonly wakeWobble;
    /**
     * Per-frame setup: resolve disturber velocities, wake tiles bodies are
     * moving through, and fire rustle specks when someone wades into a new
     * patch of tall grass.
     */
    beginFrame(nowMs: number, frameDt: number, disturbers: Disturber[], groundAt: Sampler, rustle: (x: number, y: number) => void, camX: number, camY: number): void;
    private tile;
    private ensurePaths;
    private mark;
    /** Refresh the near-disturber scratch list for one tile. */
    private gatherNear;
    /** Two corner samples → the tile's exact local affine frame. */
    private tileFrame;
    /**
     * One blade → one (or two) quads into its color bucket. All the life
     * happens here: wind cantilever, shimmer relight, body displacement,
     * post-passage wobble.
     */
    private buildBlade;
    private buildFlower;
    private buildRoots;
    private flush;
    /**
     * The under-layer: every short blade, clump, and flower in bounds —
     * drawn beneath entities. Tall thickets contribute only their sparse
     * underbrush here; their mass y-sorts via collectTall.
     */
    drawUnder(ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
    /**
     * Tall grass as y-sorted items: each thicket splits at its midline
     * into two depth bands, so a body standing inside it is wrapped —
     * blades behind it draw first, blades in front draw over.
     */
    collectTall(items: Array<{
        sortY: number;
        draw: () => void;
    }>, ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
    /**
     * Elevated rows: the plateau band item draws its own strip of living
     * grass right after its surface — already y-granular, so everything
     * (tall included) goes down in one pass.
     */
    drawRow(ctx: CanvasRenderingContext2D, ground: Sampler, detail: DetailFn, bounds: GrassBounds, wts: WTS, s: number): void;
}
export {};
//# sourceMappingURL=grass.d.ts.map