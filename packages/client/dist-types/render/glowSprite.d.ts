/**
 * Pre-rendered radial falloff sprites.
 *
 * A canvas gradient FILL is rasterized on the CPU in some browsers
 * (Firefox above all), and the night scene paid for one per light per
 * frame — measured as the single biggest frame cost after dark. Each
 * falloff profile is instead rendered ONCE into a small offscreen
 * sprite and stamped with drawImage, which every browser accelerates.
 *
 * Intensity must ride globalAlpha at the stamp, never the stops: every
 * caller's stop alphas scale uniformly with intensity, so the sprite is
 * intensity-free and a flickering lamp never mints a new sprite.
 */
export type GlowStops = ReadonlyArray<readonly [number, number]>;
/**
 * The radial falloff sprite for an `rgb` CSV color ("255, 213, 156")
 * over `stops` [offset, alpha] pairs, with the gradient's inner radius
 * at `innerK` of the outer. Stamp it over the pool's bounding box —
 * drawImage(sprite, x - r, y - r, r * 2, r * 2) — with globalAlpha
 * carrying the light's intensity.
 */
export declare function radialGlowSprite(rgb: string, stops: GlowStops, innerK: number): HTMLCanvasElement;
/**
 * The vertical alpha ramp for lit wall faces: transparent at the top,
 * `midA` at `midOff`, opaque at the foot. White, alpha-only — meant for
 * destination-in over a face patch, stretched to the run's box.
 */
export declare function rampSprite(midOff: number, midA: number): HTMLCanvasElement;
//# sourceMappingURL=glowSprite.d.ts.map