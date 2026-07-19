/**
 * The scene light pass: one low-resolution lightmap multiplied over the
 * finished world painting.
 *
 * Design laws:
 * - ONE MAP RULES EXPOSURE. The daylight ambient fills the map; every
 *   point light punches brightness back in with `screen` compositing.
 *   Multiply once over the frame and the whole scene — terrain, grass,
 *   sprites, particles — darkens and warms coherently. No per-sprite
 *   tinting, ever.
 * - LIGHT IS GEOGRAPHY. The map is drawn in WORLD space through the
 *   camera transform, so light pools are ground ellipses (foreshortened
 *   by the camera pitch like everything else), not screen-space discs.
 * - WALLS STOP LIGHT. Big static lights cast hard 2D shadows: solid
 *   tiles project silhouette quads that erase the light behind them.
 *   Sharp-edged, like every shadow in this game.
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
    /**
     * Paint the frame's exposure. `blocks` answers whether a tile stops
     * light (walls, cliffs); it is only consulted near occluding lights.
     */
    draw(ctx: CanvasRenderingContext2D, view: LightView, sky: DaylightSample, lights: WorldLight[], blocks: (tx: number, ty: number) => boolean, interior?: {
        /** World-space row-run rects of enclosed interiors in view. */
        rects: Array<{
            x: number;
            y: number;
            w: number;
            h: number;
        }>;
        /** The indoor base exposure — a roof blocks the sky. */
        ambient: [number, number, number];
    } | null): void;
    /** The light's radial falloff, in the ctx's world-space frame. */
    private gradient;
    /**
     * A light with wall shadows: painted alone on a scratch canvas, its
     * shadow quads erased, then screened onto the map — so erasing the
     * shadow never bites into the ambient or any other light.
     */
    private drawOccludedLight;
    /** Project the tile square's silhouette away from the light. */
    private castTileShadow;
}
//# sourceMappingURL=lighting.d.ts.map