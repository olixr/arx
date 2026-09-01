import { BobtailDrawOpts } from './tail.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';
export interface BasiliskLook {
    /** Body base hide. */
    hide: string;
    /** The canonical yellowish underbelly + throat + jaw shovel. */
    belly: string;
    /** Osteoderm scute rows — a step BRIGHTER than the hide (the
     *  turtle mail law: darker plates read as windows). */
    plate: string;
    /** Ridge saw, brow horns, claws — raised horn, its own material. */
    horn: string;
    /** Pale-green fire. */
    eye: string;
    /** Half-width of the hull (tiles). */
    bodyW: number;
    /** Back height of the block extrusion (tiles). */
    bodyH: number;
    /** Vertebral saw height (tiles). */
    ridgeH: number;
    headW: number;
    headH: number;
    /** Head-carry height above the ground line (tiles) — LOW: the
     *  court carries its skull level with the back, never raised. */
    headRise: number;
    /** Tail sim weight dial (crest heights, ring weights, settle mass). */
    tailHeavy: number;
    /** THE WEAPON OFF THE STERN: total tail length (tiles) — longer
     *  than the body on every member of the court; the sim, painter,
     *  analytic rest, corpse, and sprite bounds all read this ONE
     *  number so the tail can never be cropped or shortchanged. */
    tailLen: number;
    /** Tail root half-width (tiles) — meets the hull's stern width so
     *  the tail is the body continuing, never a rope tied on. */
    tailRootW: number;
    /** Sim rigidity 0..1 (THE UNBENDING ROOT dial). */
    tailStiff: number;
    /** Scull wave amplitude scale (the swimmer beats hardest). */
    tailWave: number;
    /** The fen cousin: keeled swimming fin instead of the saw. */
    fin?: boolean;
    /** The elder alone: horn crown, plate mass, lichen, barbels. */
    elder?: boolean;
    /** Elder lichen saddles. */
    moss?: string;
}
/**
 * Seeded hide clusters (the lynx law): wild basilisks scatter across
 * four stone-country coats, the fen line across three marsh coats —
 * hash BEFORE picking so consecutive eids never twin. The elder
 * never rolls: a crag has exactly one geology.
 */
export declare const BASILISK_CLUSTERS: readonly Omit<BasiliskLook, 'bodyW' | 'bodyH' | 'ridgeH' | 'headW' | 'headH' | 'headRise' | 'tailHeavy' | 'tailLen' | 'tailRootW' | 'tailStiff' | 'tailWave'>[];
export declare const ELDER_BASILISK_LOOK: BasiliskLook;
/**
 * THE COURT'S HULL: the basilisk body is a sprawled saurian trunk —
 * shoulder swell, a saddle over the mid-legs, the haunch swell where
 * the drivers root, tapering into neck and tail stubs the dedicated
 * painters continue. Painted as a block extrusion (the shared 2.5D
 * dialect) with the family's three reads layered INSIDE the
 * hull-clipped marks pass (the crab fixture law — nothing floats):
 * the yellowish BELLY BAND on the down-screen flank, the OSTEODERM
 * ROWS a step brighter than the hide, and — after the hull — the
 * VERTEBRAL SAW riding the crown by the ridge law.
 */
export declare function paintBasiliskBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: BasiliskLook, f: BeastBlockFrame): void;
/**
 * THE COURT'S SKULL — dragon out of crocodile: a long broad muzzle
 * that is the skull's own flesh (MOUTH IS A CUT, never a cone), the
 * grim saurian grin with interlocked teeth, raised nostril bumps on
 * the snout's top plane, a heavy brow ledge — and the species read:
 * eyes lit with pale-green fire. The basilisk wears two backswept
 * brow horns; the elder a four-point crown and chin barbels; the fen
 * keeps a low hunter's brow and nothing it doesn't need.
 */
export declare function drawBasiliskHead(ctx: CanvasRenderingContext2D, look: BasiliskLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    /** 0..1 jaw gape — open through the windup, clamped on the hit. */
    gape?: number;
    /** Corpse: fire out, jaw slack. */
    dead?: boolean;
    /** Which family body (horn dress + fen brow fork). */
    fen?: boolean;
}): void;
export interface BasiliskTailStyle {
    hide: string;
    horn: string;
    /** The yellowish underbelly, carried down the tail's lower edge. */
    belly: string;
    /** Root half-width (tiles) — MUST meet the body's stern width so
     *  the tail reads as the hull continuing, never a rope tied on. */
    rootW: number;
    /** Mass dial: crest heights and ring weights. */
    heavy: number;
    /** The fen cousin: the tall swimmer's fin instead of the crests. */
    fin?: boolean;
}
/**
 * THE WEAPON OFF THE STERN — the basilisk tail painter, rebuilt for
 * the croc-tail sim (user mandate: huge, meaty, dramatic). The
 * silhouette is a MUSCLE WEDGE: root as wide as the hull's stern,
 * holding most of its width through the first half (meat), then
 * closing on a hard whip point. The reads, in croc grammar: the
 * DOUBLE CREST — two scute rows riding the tail base that MERGE into
 * one tall keel saw at mid-length (the signature of every reference
 * crocodilian) — the BELLY BAND carried down the lower edge, and
 * quiet muscle rings at the joints. The fen swaps the crests for one
 * tall swimmer's fin. Dials ride the style (the canid-lane law);
 * plain path calls — no Path2D — so node tests walk every coordinate.
 */
export declare function drawBasiliskTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: BasiliskTailStyle, wk: number, opts: BobtailDrawOpts): void;
//# sourceMappingURL=rigBasilisk.d.ts.map