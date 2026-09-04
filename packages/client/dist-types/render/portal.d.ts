/**
 * The Riftgate — the dungeon portal, rebuilt as a landmark.
 *
 * Three layers, three owners:
 *  - drawPortalGround: the BLIGHT — a corrupted apron the gate has
 *    burned into the land (stain, dead-earth chips, pulsing veins), a
 *    paved plinth of glyph-carved slabs, and the void pool at the
 *    mouth. Lives in the breeze layer (terrain.drawLiveGround), under
 *    every y-sorted body.
 *  - drawPortalArch: the STRUCTURE — a monumental weathered stone
 *    archway (~2 tiles tall, the character reads waist-high to its
 *    spring line) whose opening holds the vortex membrane. Y-sorted at
 *    the tile's south edge, so stepping onto the tile reads as
 *    stepping THROUGH the veil.
 *  - spawnPortalFx: the AIR — blocky suction motes spiraling into the
 *    mouth, blight embers, and the odd escaping streak. Runs on the
 *    shared pooled particle engine; rates are dt-gated so the bill is
 *    a handful of quads however fast the frames come.
 *
 * Style laws honored here: hard-edged square masses only (no chamfer,
 * no blur), lift-only stone shading, foreshortened top planes on the
 * capitals and keystone (2.5D top-plane law), axis-aligned pier faces
 * (no skew), and every animated phase is hash-desynced per
 * portal so two gates never pulse in lockstep.
 */
import type { Particles } from './particles.js';
interface PortalTones {
    /** The throat of the tunnel — near-black violet. */
    void: string;
    deep: string;
    mid: string;
    arm: string;
    bright: string;
    hot: string;
    core: string;
    glyph: string;
}
export declare function portalTones(up: boolean): PortalTones;
/** Particle ramp for bursts (the enter-implosion pulls from this). */
export declare const PORTAL_BURST_COLORS: string[];
/** The arch plane's ground line, in tile fractions from the north edge. */
export declare const PORTAL_PLANE = 0.74;
/**
 * The land remembers the gate: a violet stain soaking outward, dead
 * earth broken into blocky chips, and veins of riftlight crawling from
 * under the plinth — each pulsing on its own clock, tips glowing like
 * coals. Drawn every frame (portals are rare; this is a few dozen
 * fills), so the veins get to breathe.
 */
export declare function drawPortalGround(ctx: CanvasRenderingContext2D, tx: number, ty: number, up: boolean, worldToScreen: (wx: number, wy: number) => {
    x: number;
    y: number;
}, s: number, t: number): void;
export interface PortalArchArgs {
    /** Screen position of the tile's NW corner (elevation applied). */
    px: number;
    py: number;
    s: number;
    /** s * camera.yScale — one tile of ground-plane depth in px. */
    syT: number;
    up: boolean;
    t: number;
    tx: number;
    ty: number;
    /** Arms the struct-outline stroke state; null = outlines off. */
    outline: (() => void) | null;
}
export declare function drawPortalArch(ctx: CanvasRenderingContext2D, a: PortalArchArgs): void;
/**
 * Per-frame, per-visible-portal emission, dt-gated so rates are
 * framerate-independent: suction motes spiraling into the mouth,
 * blight embers rising off the apron, and the odd streak flung out.
 */
export declare function spawnPortalFx(particles: Particles, tx: number, ty: number, up: boolean, dt: number): void;
export {};
//# sourceMappingURL=portal.d.ts.map