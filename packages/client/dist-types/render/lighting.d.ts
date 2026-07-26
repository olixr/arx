/**
 * The scene light pass: one low-resolution lightmap multiplied over the
 * finished world painting.
 *
 * Design laws:
 * - ONE MAP RULES EXPOSURE. The daylight ambient fills the map; every
 *   point light punches brightness back in with `screen` compositing.
 *   Multiply once over the frame and the whole scene — terrain, grass,
 *   sprites, particles — darkens and warms coherently. (The body
 *   relight pass in the renderer is the map's one licensed partner: it
 *   CORRECTS a sprite toward the exposure at its own base, it never
 *   invents light the map doesn't know about.)
 * - LIGHT IS GEOGRAPHY. The map is drawn in WORLD space through the
 *   camera transform, so light pools are ground ellipses (foreshortened
 *   by the camera pitch like everything else), not screen-space discs.
 * - WALLS STOP LIGHT. Big static lights cast hard 2D shadows: solid
 *   tiles project silhouette quads that erase the light behind them.
 *   Sharp-edged, like every shadow in this game.
 * - LIGHT CLIMBS WHAT IT MEETS (v2). EVERY tall thing standing in a
 *   pool — wall, stall, station, pillar, tree — catches the light on
 *   the face the camera sees: a vertical gradient rising from its BASE
 *   row, graded by N·L (how squarely the face looks at the light) and
 *   the pool's falloff, hottest at the foot and dying up the face.
 *   Heights come from the renderer's `tallH(tx,ty)` callback (world-y
 *   units — screen-vertical faces divide the camera squash back out).
 *   Faces behind an occluder stay dark: a coarse line-of-sight walk
 *   against `blocks` gates every face an occluding light paints.
 * - DAYLIGHT IS FREE. At full sun the ambient is white and the entire
 *   pass is skipped — the system costs nothing until dusk.
 * - QUARTER RES IS PLENTY. Light is low-frequency; the map renders at
 *   1/3 scale and stretches up. Gradients stay smooth, fills stay tiny.
 */
import type { DaylightSample } from '@devcraft/shared';
/** A light living in the world, gathered fresh each frame. */
export interface WorldLight {
    x: number;
    y: number;
    /** Reach in world tiles. */
    r: number;
    rgb: [number, number, number];
    /** Peak brightness at the core, 0..1. */
    intensity: number;
    /** Static architectural lights cast hard wall shadows. */
    occlude?: boolean;
}
/** Everything the lightmap needs to share the camera's view. */
export interface LightView {
    w: number;
    h: number;
    scale: number;
    yScale: number;
    /** Screen-space origin: worldToScreen(0,0). */
    ox: number;
    oy: number;
}
export declare class LightingSystem {
    private readonly map;
    private readonly mctx;
    private readonly tmp;
    private readonly tctx;
    /** Scratch face list, reused across lights — no per-frame garbage. */
    private readonly faces;
    /**
     * Paint the frame's exposure. `blocks` answers whether a tile stops
     * light (walls, cliffs); it is only consulted near occluding lights.
     * `tallH` reports the camera-facing face height of whatever stands
     * on a tile, in WORLD-y units (0 = nothing tall) — it drives the
     * lit-face response for walls AND standing props alike.
     */
    draw(ctx: CanvasRenderingContext2D, view: LightView, sky: DaylightSample, lights: WorldLight[], blocks: (tx: number, ty: number) => boolean, tallH: (tx: number, ty: number) => number): void;
    /** The light's radial falloff, in the ctx's world-space frame. */
    private gradient;
    /**
     * Fill `this.faces` with every camera-visible face this light
     * strikes: any tile reporting a tall face whose south edge looks at
     * the light. Brightness follows N·L and the pool's falloff. When
     * `blocks` is given (occluding lights), a coarse tile walk along the
     * sight line drops faces standing behind a wall — light lands ON the
     * first thing it meets, never through it.
     */
    private gatherFaces;
    /** Coarse LOS: sample the sight line one tile at a time, keeping
     *  0.7 tiles clear of both endpoints so neither the light's own tile
     *  nor the face's body blocks itself. */
    private faceVisible;
    /** Paint the gathered faces into a world-transformed ctx: a vertical
     *  gradient rising from each base row, hottest at the foot. */
    private paintFaces;
    /**
     * A light with wall shadows: painted alone on a scratch canvas, its
     * shadow quads erased, then screened onto the map — so erasing the
     * shadow never bites into the ambient or any other light. Lit faces
     * paint AFTER the erase: they re-light exactly the band a wall's own
     * occlusion wedge blacked out.
     */
    private drawOccludedLight;
    /**
     * Project the tile square's silhouette away from the light. Each
     * occluding edge erases twice: a slightly splayed half-alpha quad
     * (penumbra), then the exact hard quad (umbra) — the shadow's rim
     * softens the further it runs, the core stays black.
     */
    private castTileShadow;
}
//# sourceMappingURL=lighting.d.ts.map