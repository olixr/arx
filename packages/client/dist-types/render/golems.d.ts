export type GolemBuild = 'rock' | 'iron' | 'fire' | 'ice';
export interface GolemLook {
    build: GolemBuild;
    /** The main mass. */
    shell: string;
    /** Seam / shadow planes. */
    deep: string;
    /** Lit crown planes — the top the camera owns. */
    lit: string;
    /** Undersides, gaps between stones, the ice heart. */
    under: string;
    /** The one accent: moss, brass, slag, hoar. */
    accent: string;
    /** Inner light (iron visor, fire seams, ice sheen). */
    glow: string;
    /** Frame multiplier: shoulder mass, slab girth, fist size. */
    heavy: number;
    /** Spawn seed — drives stone layout, crack runs, facet tilts. */
    seed?: number;
}
export declare const GOLEM_LOOKS: Record<string, GolemLook>;
export declare function golemLook(defId: string, seed?: number): GolemLook;
export interface GolemBodyFrame {
    s: number;
    tw: number;
    ww: number;
    th: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    nowMs: number;
    runF: number;
    /** 0..1 menace ramp — Cast/Attack wind. Fire gapes, iron hisses. */
    flare: number;
}
export declare function paintGolemBody(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemBodyFrame): void;
export interface GolemHeadFrame {
    s: number;
    headX: number;
    headY: number;
    hw: number;
    hh: number;
    cut: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    nowMs: number;
    /** 0..1 strike/cast beat — visors flare, capstones tip. */
    flare: number;
}
export declare function paintGolemHead(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemHeadFrame, seed?: number): void;
/**
 * The construct arm — called from drawArm's dialect switch with the
 * solved joints. Four arms, four machines:
 *   rock — boulder shoulder to knuckle-heavy fist, stones threaded on
 *          the solved bone; iron — plate sleeves, elbow disc, riveted
 *   block fist; fire — crust segments with glowing joint gaps; ice —
 *   faceted columns ending in an angular wedge fist.
 */
export declare function drawGolemArm(ctx: CanvasRenderingContext2D, gol: GolemLook, sx: number, sy: number, kx: number, ky: number, ex: number, ey: number, s: number, hurt: boolean, nowMs: number): void;
/**
 * The construct foot — slab feet per build, called from the bare-foot
 * switch. Wider than any boot: a golem stands on its own architecture.
 */
export declare function paintGolemFoot(ctx: CanvasRenderingContext2D, gol: GolemLook, fxx: number, fyy: number, s: number, lead: number, hurt: boolean): void;
//# sourceMappingURL=golems.d.ts.map