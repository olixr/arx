/**
 * THE BODY ON A CARD (play3d S2) — one billboard per living entity.
 *
 * An EntityBillboard is a per-body canvas painted by the PRODUCTION
 * rigs — `drawHumanoid` on a `LegSolver` gait (players, townsfolk,
 * the humanoid monsters) or `drawBeast` on the universal `LegRig`
 * (every four-legged thing `beastSpec` knows) — and uploaded as a
 * CanvasTexture ONLY when the body is visible and something changed:
 * it moved, it is settling, its pose turned, its kit changed, or the
 * slow idle-breath cadence came due. The ~20 lines of projection glue
 * are the July spike's, with one addition: the facing, the solved feet
 * and the pole are rotated by the camera yaw before they are painted,
 * so an orbiting camera sees the body's true relative facing (yaw 0 =
 * the 2D game's frame, so `relDir = dir + yaw`).
 *
 * Laws:
 *  - The rig ALWAYS advances (gait state is continuous, movement is
 *    the animation driver); only the PAINT is gated.
 *  - A kind swap (new weapon, cape on/off) is a repaint, never a new
 *    mesh: the canvas, texture and material outlive the kit.
 *  - The nameplate rides the card, above the head, in the 2D game's
 *    ink — the DOM never has to chase a body.
 *  - Bodies at 56 px/tile (the spike's readable close-up density).
 *
 * Not yet (S2 ledger): the legless painters (oozes, bats, adders),
 * owls, mounts, corpses/ragdolls, worn-light auras, status FX, the
 * dialect looks (goblin/skeleton/kobold/... clusters) — those bodies
 * paint as plain humanoids in the def's colour for now.
 */
import * as THREE from 'three';
import { type Look } from '@arx/shared';
import { type BillboardClock, type BillboardFactory } from './billboard.js';
export interface HumanoidKind {
    body: 'humanoid';
    bodyColor: string;
    isOwn: boolean;
    look?: Look;
    capeId?: string;
    size?: number;
    skinColor?: string;
    weaponItem?: string;
    headItem?: string;
    bodyItem?: string;
    legsItem?: string;
    bootsItem?: string;
    glovesItem?: string;
    offhandItem?: string;
    carryStyle?: 'normal' | 'rogue';
    carryOff?: 'normal' | 'rogue';
}
export interface BeastKind {
    body: 'beast';
    defId: string;
    radius: number;
    color: string;
    speed: number;
    collar?: string;
}
export type BodyKind = HumanoidKind | BeastKind;
/** A kind's identity — equal strings mean the same painted kit. */
export declare function kindKey(k: BodyKind): string;
/** What the world says about the body this frame. */
export interface BodyState {
    x: number;
    y: number;
    groundY: number;
    dir: number;
    pose: number;
    hurt: boolean;
    name?: string;
    level?: number;
    /** Nameplate ink (faction tint); default parchment. */
    nameInk?: string;
}
export declare class EntityBillboard {
    private readonly clock;
    private readonly seed;
    readonly mesh: THREE.Mesh;
    private readonly buf;
    private readonly canvas;
    private readonly ctx;
    private readonly tex;
    private readonly mat;
    private readonly depthMat;
    private kind;
    private key;
    private card;
    private legs;
    private spec;
    private cape;
    private readonly kneeMemory;
    private readonly depthMemory;
    private readonly feet;
    /** Cape node screen points, reused across paints (never minted per paint). */
    private readonly capePts;
    private readonly idleEveryMs;
    /** The rotated pose handed to the painters (reused, never allocated per frame). */
    private readonly relPose;
    private restfulSince;
    private lastPaintMs;
    private lastX;
    private lastY;
    private lastPose;
    private poseSince;
    private lastHurt;
    private lastName;
    private walkPhase;
    private dirty;
    /** Confession: repaints (each is one texture upload). */
    paints: number;
    constructor(kind: BodyKind, clock: BillboardClock, billboards: BillboardFactory, seed?: number);
    private makeLegs;
    /** Size the canvas + quad for the current kind (a rare, gated event). */
    private fitCard;
    get textureBytes(): number;
    /** Swap the kit; the rig survives when the body plan does. */
    setKind(kind: BodyKind): void;
    /**
     * Advance the rig and repaint if the body is visible and something
     * changed. Returns true on repaint.
     */
    update(st: BodyState, dt: number, nowMs: number, camYaw: number, visible: boolean): boolean;
    /** The nameplate above the head: the 2D game's parchment ink, ringed. */
    private paintName;
    dispose(): void;
}
//# sourceMappingURL=entityBillboard.d.ts.map