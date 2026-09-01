/**
 * THE OOZE FAMILY (docs/ooze-family-plan.md) — THE SLIME SHAPE LAW,
 * final form (user verdict 2026-08-15, round three): the family owns
 * exactly TWO silhouettes — the HOPPER (the chamfered gel block that
 * carries the whole brand) and the CUBE (the corridor prism). Every
 * other body plan is dead. Variety lives in the DRESS: bespoke
 * material dressings on the hopper — verdant gel, stone-gray grit,
 * frost rime and shards, dripping tar — never a naked palette swap.
 * And A SLIME ATTACKS WITH ITS BODY: the strike is a crouch, a leap,
 * and a flat-out landing slam — no pseudopods, no punches, ever.
 */
export type OozePlan = 'hopper' | 'cube';
/** The material a hopper is made of — each dress is its own kit of
 *  inclusions, sheen, and weather, painted bespoke inside the gel. */
export type OozeDress = 'verdant' | 'stone' | 'frost' | 'tar';
export interface OozeLook {
    plan: OozePlan;
    /** Landmark hoppers carry swallowed pebbles and a second gloss. */
    giant: boolean;
    dress: OozeDress;
}
export declare const OOZE_LOOKS: Record<string, OozeLook>;
/** The family register, painter-side: routing + the no-corpse law. */
export declare function oozeLook(defId: string): OozeLook | undefined;
export interface OozeOpts {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    walkPhase: number;
    nowMs: number;
    seed: number;
    /** 0..1 how much the body is actually travelling — stills the cycle. */
    moveK: number;
    attackT?: number;
    ys: number;
}
/**
 * Sprite-cache extents in TILES — the hopper buys HEADROOM for the
 * strike leap (a body cropped mid-jump is the cache's oldest sin),
 * the cube buys room for its surge.
 */
export declare function oozeExtents(look: OozeLook, radius: number): {
    halfW: number;
    top: number;
    bottom: number;
};
/** One ooze, routed by its body plan. */
export declare function drawOoze(ctx: CanvasRenderingContext2D, look: OozeLook, o: OozeOpts): void;
export declare const OOZE_INK = "rgba(26, 20, 36, 0.4)";
/**
 * THE HOPPER: the brand — a gel block in the wall-prism dialect that
 * squashes on landing, stretches mid-hop, breathes at rest, and RINGS
 * a damped beat just after touchdown. THE JUMP-SLAM is the only
 * strike a slime knows: crouch low and wide, LEAP (the server's
 * pounce carries the ground, the painter carries the air), and come
 * down FLAT on what it hit. The dress is the variant: verdant gel,
 * stone grit, frost rime, falling tar — each painted bespoke inside
 * the mass, and the giant carries its swallowed history on top.
 */
export declare function drawOozeHopper(ctx: CanvasRenderingContext2D, o: OozeOpts, look: OozeLook): void;
/**
 * THE CUBE (gelatinous): the corridor made flesh. A translucent
 * chamfered prism — the ground reads THROUGH the gel — wearing the
 * 2.5D top-plane law (lit top slab, shaded far edge, bright front
 * arris), with everything it ever engulfed suspended inside at its
 * own depth: bones, a sword, coins. The debris IS the loot table,
 * told honestly, and it floats on a current too slow to watch. The
 * strike is a SURGE: the whole prism shoves forward — a wall deciding
 * to include you.
 */
export declare function drawOozeCube(ctx: CanvasRenderingContext2D, o: OozeOpts): void;
/**
 * THE TRAIL DAB: one glisten print on the ground an ooze crossed —
 * painted by the renderer's shadow pass so every body walks OVER the
 * wet. A flattened seeded facet, never a stamped circle.
 */
export declare function drawOozeTrailDab(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, color: string, alpha: number): void;
/**
 * The giant adder: a slithering tapered ribbon — the body is a sampled
 * S-wave behind the head, diamond-patterned down the spine, with a
 * raised viper head that strikes along the facing.
 */
export declare function drawSnake(ctx: CanvasRenderingContext2D, o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    walkPhase: number;
    nowMs: number;
    seed: number;
    moveK: number;
    attackT?: number;
    ys: number;
}): void;
//# sourceMappingURL=rigOoze.d.ts.map