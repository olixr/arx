/**
 * THE CHAMPION'S MARK — the victory banner staked where a camp broke.
 *
 * A knight's gonfalon on an iron-shod standard, taller than the rig
 * that earned it (~2.55 tiles against the body's ~1.15): dark ash
 * pole, forged spear finial, corded crossbar with hanging tassels,
 * and the cloth — a crimson hanging banner with a gold chief band
 * carrying the broken camp's danger pips, gold trim rails, and the
 * champion's laurel star at the field's heart.
 *
 * THE MOTION DOCTRINE applies whole:
 *  - The cloth is a SIMULATION, never a pose — a verlet spine on the
 *    cape lineage (world XYZ + real height, pinned crown, asymmetric
 *    stiffness so cloth hangs FROM the bar), painted through width
 *    rails. The crossbar tassels are the same sim, cut short.
 *  - Wind is the SHARED world front (grass.windAtInto) — the banner
 *    leans with the same gusts that comb the meadow around it.
 *  - The stake-in is ONE analytic curve (accelerating drop, then a
 *    damped-spring settle), a pure function of the frame clock: every
 *    viewer of one banner sees the same moment, and a null bornAt
 *    paints the settled standard exactly (lab sheets, welcome-time
 *    banners, and the long idle all share THE ONE REST).
 *  - All variation hashes the banner's seed: pole lean, cloth phase,
 *    rubble at the shoe. Math.random never appears.
 */
import type { WindSample } from './grass.js';
export interface Pt {
    x: number;
    y: number;
}
/** Pole top (finial seat) in tiles of screen height above the shoe. */
export declare const TROPHY_POLE_H = 2.55;
/** Crossbar height — where the cloth crown pins. */
export declare const TROPHY_BAR_H = 2.18;
/** Crossbar half-span in tiles — wider than the cloth's sleeve, so
 *  the corded tassels at its ends swing clear of the field. */
export declare const TROPHY_BAR_HW = 0.38;
/** The drop: staked from the sky in half a second. */
export declare const TROPHY_DROP_MS = 520;
export interface TrophyDrop {
    /** Standard's altitude in tiles (0 = shoe in the ground). */
    z: number;
    /** Vertical squash of the pole (1 = rest) — the drive-in settle. */
    squash: number;
    /** Contact-shadow strength 0..1 (grows as the stake nears). */
    shadowK: number;
    /** True once the shoe has struck ground (impact beats key on it). */
    landed: boolean;
    /** 0..1 flash envelope right after impact (dust/kick light window). */
    strike: number;
    /**
     * 1 = the cloth rides FURLED against the staff (the standard falls
     * as a wrapped stake); 0 = fully unrolled. The unfurl is the
     * victory's second beat — the strike plants it, the cloth answers.
     */
    furl: number;
}
/**
 * The stake-in as a pure function of age. Negative/NaN age (no
 * bornAt) and anything past the settle window return THE ONE REST —
 * a static frame shows the standard at its full argument.
 */
export declare function trophyDrop(ageMs: number | null): TrophyDrop;
interface ClothNode {
    x: number;
    y: number;
    z: number;
    px: number;
    py: number;
    pz: number;
}
/**
 * A hanging chain on the cape contract: verlet nodes in world XYZ,
 * crown pinned to its bar point, gravity down, the shared wind
 * across, asymmetric segment stiffness so the cloth hangs FROM the
 * standard. One class serves the gonfalon spine and both tassels.
 */
export declare class TrophyCloth {
    private readonly segs;
    private readonly segLen;
    /** Gravity weight — the gonfalon is heavier cloth than a cord. */
    private readonly weight;
    /** Wind response. */
    private readonly windMul;
    readonly nodes: ClothNode[];
    private live;
    /** Hem speed (tiles/s) — drives the trim's kick light. */
    hemSpd: number;
    private readonly phase;
    constructor(seed: number, segs: number, segLen: number, 
    /** Gravity weight — the gonfalon is heavier cloth than a cord. */
    weight: number, 
    /** Wind response. */
    windMul: number);
    /**
     * Pin the whole chain straight below the anchor — the falling
     * standard carries its cloth furled, so the sim rides the drop
     * pinned instead of tangling six tiles of freefall, and the strike
     * jolt starts from THE ONE REST (the unfurl's clean first frame).
     */
    rest(ax: number, ay: number, az: number): void;
    /** Hang straight down from the pin — THE ONE REST. */
    private rehang;
    update(ax: number, ay: number, az: number, dt: number, wind: WindSample, tSec: number): void;
    /**
     * The strike snap: the stake bites ground and the cloth takes the
     * jolt — one impulse down the chain, decaying toward the crown.
     */
    jolt(k: number): void;
}
/** The gonfalon spine at full voice. */
export declare function makeTrophySpine(seed: number): TrophyCloth;
/** A crossbar tassel — short, light, quick. */
export declare function makeTrophyTassel(seed: number): TrophyCloth;
export interface TrophyDrawOpts {
    /** Screen point of the shoe (the ground anchor, terrain-lifted). */
    gx: number;
    gy: number;
    /** Camera scale (px per tile). */
    s: number;
    /** Danger tier 1..5 — the chief band's pips. */
    tier: number;
    /** The banner's identity hash (cell key) — lean, phase, rubble. */
    seed: number;
    /** Frame clock (ms) — trim glint and strike flash read from it. */
    nowMs: number;
    drop: TrophyDrop;
    /** Spine nodes projected to SCREEN by the caller (crown first). */
    spine: Pt[];
    /** Tassel chains, projected likewise (may be empty while airborne). */
    tasselL: Pt[];
    tasselR: Pt[];
    /** Hem speed in tiles/s — the trim's kick light. */
    hemSpd: number;
}
/**
 * Paint the standard. Pure: everything animated reads from nowMs and
 * the projected sim chains — the lab freezes it with one clock value.
 * Layer order tells the truth south-up: rubble, pole, crossbar and
 * tassels, then the cloth riding in front (its FACE_OFF hang).
 */
export declare function drawTrophyBanner(ctx: CanvasRenderingContext2D, o: TrophyDrawOpts): void;
/**
 * The contact shadow — drawn in the renderer's shadow prepass. Grows
 * and sharpens as the falling stake nears the ground (height is real).
 */
export declare function drawTrophyShadow(ctx: CanvasRenderingContext2D, gx: number, gy: number, s: number, drop: TrophyDrop): void;
/** Where the cloth's crown pins in world space, given the pole anchor. */
export declare function trophyClothPin(wx: number, wy: number, drop: TrophyDrop): {
    x: number;
    y: number;
    z: number;
};
/** Tassel pins at the crossbar ends. */
export declare function trophyTasselPin(wx: number, wy: number, drop: TrophyDrop, side: -1 | 1): {
    x: number;
    y: number;
    z: number;
};
export {};
//# sourceMappingURL=trophyBanner.d.ts.map