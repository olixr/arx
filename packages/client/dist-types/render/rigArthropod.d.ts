/**
 * THE SHELLED MANY-LEGS — spider, crab, the giant crab and the beetle.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { LimbSolve } from './legs.js';
import type { BeastBlockFrame, BeastSpec, GiantCrabLook } from './rig.js';
/**
 * The giant spider: two block masses — a low cephalothorax carrying the
 * eye cluster and fang chips, a domed abdomen behind wearing pale
 * chevrons — slung between eight thin stalking legs. No head or tail
 * painter: the whole animal is the body.
 */
export interface SpiderLook {
    carapace: string;
    abdomen: string;
    mark: string;
    eye: string;
    fang: string;
    /** Abdomen half-width; the cephalothorax runs narrower. */
    bodyW: number;
    abdH: number;
    cephH: number;
}
export declare const SPIDER_LOOK: SpiderLook;
export declare function paintSpiderBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: SpiderLook, f: BeastBlockFrame, at?: number): void;
/**
 * The mudcrab: a wide flat carapace slung sideways across the facing,
 * two chunky pincers held forward (the left one the bigger crusher),
 * and stalked eyes off the front rim. The whole animal is the body
 * painter — head and tail branches return early.
 *
 * THE LIVING STALKS, inherited (the giant crab's doctrine come home):
 * the eyes ride the ear sim — they lag the turn, sway with the
 * scuttle, and pin flat through the clamp. The old rigged eyes hid
 * behind two facing gates (`fy > -0.5`, the far-eye profile skip);
 * stalks that grow off the TOP of the animal have no business
 * disappearing at any band — THE SOCKET RIDES THE CROWN slides the
 * root station onto visible shell instead, and the stalks always
 * paint over the hull.
 */
export interface CrabLook {
    shell: string;
    claw: string;
    eye: string;
    /** Half-WIDTH across the facing — wider than the body is long. */
    bodyW: number;
    shellH: number;
}
export declare const CRAB_LOOK: CrabLook;
export declare const GIANTCRAB_LOOK: GiantCrabLook;
/**
 * THE RAMPART'S MAIL — one row per plate: [X, Y, halfLen, halfWid,
 * keelK] in body fractions (the turtle mail's grammar, a crab's
 * layout): a central crown boss, a crenellated BOW WALL of three
 * storm-raked blades running ACROSS the facing (the perpendicular
 * signature — the turtle's ridge runs nose-to-tail, the crab's wall
 * runs shoulder-to-shoulder), branchial terraces on the flanks, and
 * a stern pair over the tucked abdomen. Authored, never generated.
 */
export declare const GIANTCRAB_PLATES: ReadonlyArray<[number, number, number, number, number]>;
export declare const CRABARM_SOLVE: LimbSolve;
/**
 * The giant beetle: domed elytra split by a center seam with an
 * iridescent sheen, a darker pronotum plate at the front, and a rhino
 * horn hooking up off the head between two elbowed antennae. Whole
 * animal in the body painter — head and tail branches return early.
 */
export interface BeetleLook {
    shell: string;
    plate: string;
    seam: string;
    /** Iridescent highlight glazed over the lit dome. */
    sheen: string;
    horn: string;
    bodyW: number;
    elyH: number;
    plateH: number;
}
export declare const BEETLE_LOOK: BeetleLook;
export declare function paintBeetleBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: BeetleLook, f: BeastBlockFrame, at?: number): void;
//# sourceMappingURL=rigArthropod.d.ts.map