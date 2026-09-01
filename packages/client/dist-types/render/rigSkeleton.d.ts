export interface SkeletonLook {
    /** Base bone tone — each variant aged differently in the ground. */
    bone: string;
    /** The dark of the rib cavity behind the rib bars — the depth read. */
    cavity: string;
    /** Light living in the sockets; undefined = the hollow dark stare. */
    glow?: string;
    /** Royalty among the dead wears its crown into battle. */
    crown?: {
        band: string;
        gem: string;
    };
    /** Bone thickness multiplier: gracile archer 0.92 → champion 1.3. */
    heavy: number;
    /** Old battle damage: a skull crack down the trailing brow. */
    cracked: boolean;
}
export declare const SKELETON_LOOKS: Record<string, SkeletonLook>;
/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export declare function skeletonLook(defId: string): SkeletonLook;
export interface SkullFrame {
    s: number;
    headX: number;
    headY: number;
    hw: number;
    hh: number;
    cut: number;
    headR: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    nowMs: number;
    /** 0..1 jaw drop — the combat bite; 0 keeps the jaw seated. */
    gape: number;
}
/**
 * The skull, drawn in the head block's own frame so helmets still fit.
 * Reads skull by SILHOUETTE first: a broad cranium dome stepping in to
 * a narrower maxilla and a separate mandible — then the band-aware
 * face: sockets that slide with the facing and vanish around the
 * corner, a nasal wedge, a tooth row, suture lines on the back band.
 */
export declare function paintSkull(ctx: CanvasRenderingContext2D, sk: SkeletonLook, f: SkullFrame): void;
export interface RibcageFrame {
    s: number;
    tw: number;
    ww: number;
    th: number;
    fx: number;
    lead: number;
    profileK: number;
    backK: number;
    hurt: boolean;
}
/** Rib row positions down the barrel (fractions of its height). */
export declare const RIB_ROWS: readonly [0.1, 0.36, 0.62, 0.88];
/**
 * The skeletal torso, drawn in the garment's local frame (y=0 at the
 * hip line, −th at the shoulders): clavicle bar and shoulder knobs, a
 * rib barrel over the dark cavity with the sternum riding the leading
 * edge, scapulae and spine from behind — and below it a REAL gap where
 * a waist should be, crossed only by vertebrae down to the iliac-wing
 * pelvis. The see-through waist is the whole-body skeleton read.
 */
export declare function paintRibcage(ctx: CanvasRenderingContext2D, sk: SkeletonLook, f: RibcageFrame): void;
//# sourceMappingURL=rigSkeleton.d.ts.map