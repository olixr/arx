/**
 * Ability visual identities — the layered combat-FX vocabulary.
 *
 * Every ability id maps to an FxStyle: a four-band palette plus a set
 * of layer choices (ring silhouette, debris family, lingering ground
 * decal, camera punch). The renderer composes the actual moment from
 * these facts in MULTIPLE PASSES — flash, body, rim, debris, decal,
 * glow — so every art reads as a staged presentation, not a blip.
 *
 * Everything stays on brand: hard-edged rects, jagged polygons, flat
 * fills. No blur, no gradients — the world is chunky and so is its
 * magic. Unknown ids fall back to a palette derived from the ability's
 * wire color, so a missing entry degrades gracefully, never invisibly.
 */
/** Ring silhouette for nova/blast expansion. */
export type RingStyle = 'teeth' | 'petals' | 'shards' | 'runes' | 'frost' | 'halo';
/** Chunk family thrown by detonations and simmering in fields. */
export type DebrisKind = 'ember' | 'rock' | 'ice' | 'leaf' | 'bone' | 'spark' | 'star' | 'shadow' | 'blood';
/** Lingering ground mark left where the hit landed. */
export type DecalKind = 'scorch' | 'rime' | 'cracks' | 'roots' | 'stain' | 'runes' | 'glow';
/**
 * The signature layer — a bespoke set-piece drawn ON TOP of the shared
 * kind grammar. Two fire novas share the ring language; only one grows
 * a pillar of flame out of the crater. This axis is what keeps a
 * hundred abilities from reading as palette swaps of each other.
 */
export type MotifKind = 'pillar' | 'spikes' | 'vortex' | 'rain' | 'cage' | 'wisps' | 'rays' | 'tear' | 'wave' | 'bloom' | 'crown' | 'echo' | 'quake' | 'swarm';
export interface FxStyle {
    /** Hottest center — the white-out band. */
    core: string;
    /** The identity color — most of the painted area. */
    mid: string;
    /** Dark outer band — silhouettes and shadows of the effect. */
    deep: string;
    /** Debris/spark accent. */
    spark: string;
    /** queueGlow tint as 'r, g, b'. */
    glow: string;
    ring: RingStyle;
    debris: DebrisKind;
    decal?: DecalKind;
    /** The bespoke set-piece layered over the shared grammar. */
    motif?: MotifKind;
    /** Camera drama weight 0..1 — scales shake on detonation. */
    punch: number;
    /**
     * Interior ground light-wash strength 0..1 — how hard the turf
     * INSIDE a young nova/blast lights up. Big detonations sear the
     * ground; utility pulses barely kiss it. Undefined = 0.45.
     */
    wash?: number;
}
/**
 * Every ability's face. Layer swaps keep siblings distinct: two fire
 * arts never share BOTH ring and debris; two frost arts differ in
 * decal or punch. The registry is the single place an art's visual
 * identity lives — content adds an ability, this table gives it a face.
 */
export declare const FX_STYLES: Record<string, FxStyle>;
/**
 * Resolve an ability's visual identity. Unknown/absent ids derive a
 * serviceable palette from the wire color so nothing ever renders as
 * "missing" — but every real ability should have a registry face.
 */
export declare function fxStyleFor(id: string | undefined, color: string | undefined): FxStyle;
/** Tiny deterministic PRNG — effects re-render identically every frame. */
export declare function srand(seed: number): () => number;
/**
 * A jagged ring path: a polygon whose radius alternates per vertex —
 * teeth, petals, shards and frost are all vertex-count + jag choices.
 * Ground rings squash by `squash` (the camera's ground perspective).
 */
export declare function jaggedRingPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, squash: number, points: number, jag: number, rot: number, seed?: number): void;
/** A blocky burst star: alternating outer/inner vertices. */
export declare function burstStarPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rOuter: number, rInner: number, points: number, rot: number, squash?: number): void;
/**
 * A jagged lightning path between two screen points. `seed` picks the
 * kink layout; step count scales with length so short hops stay sharp.
 */
export declare function boltPath(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, seed: number, jagPx: number): void;
//# sourceMappingURL=abilityFx.d.ts.map