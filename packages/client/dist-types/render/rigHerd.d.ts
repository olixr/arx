import type { BeastBlockFrame, BeastSpec } from './rig.js';
/**
 * THE TURNED BAR's fore-aft stagger (units of tw, signed along the
 * facing): side-on, the leading arm hangs a half-step ahead of the
 * chest line and the trailing arm behind it — the same stagger the
 * feet already take (legs.ts `stag`). Zero face-on; grows with the
 * profile so the diagonals inherit a taste of it.
 */
export declare function shoulderStagK(fx: number): number;
/**
 * Cattle are drawn as true 2.5D blocks — the same dialect as the wall
 * prisms: a chamfered footprint extruded straight up, lit back slab
 * over hard-shaded flanks. Everything species-flavored (hide, patches,
 * horns, muzzle, udder) lives in this look table so the dairy cow and
 * the bull share one painter.
 */
export interface CattleLook {
    hide: string;
    /** Seeded body patches; the count says how many. */
    patch: string;
    spots: number;
    muzzle: string;
    horn: string;
    hornTip: string;
    /** Horn reach (tiles) — stubs on the cow, sweeps on the bull. */
    hornLen: number;
    udder?: string;
    noseRing?: string;
    /** A strap-hung cowbell at the throat (dairy herd charm). */
    bell?: string;
    /** Body half-width (tiles); length comes from the BeastSpec. */
    bodyW: number;
    bellyH: number;
    backH: number;
    /** Extra shoulder mass ramped toward the chest (bull). */
    humpH: number;
    headW: number;
    headH: number;
}
export declare const CATTLE_LOOKS: Record<string, CattleLook>;
export interface CattleBodyFrame {
    /** Screen position of the body's ground point. */
    bx: number;
    gy: number;
    s: number;
    fx: number;
    fy: number;
    /** Camera foreshorten (1 for ragdolls drawn in screen space). */
    ys: number;
    seed: number;
    hurt: boolean;
    /** Gait bob (tiles) and side roll — 0 for corpses. */
    bob: number;
    roll: number;
    /** Heights (tiles) — corpses pass a collapsed backH. */
    backH: number;
    bellyH: number;
}
/**
 * The cattle body block: chamfered octagon footprint projected at
 * belly and back height, silhouette = convex hull of both rings.
 * Paint order inside the clip makes the light model: base hide, then
 * the seeded patches, then a hard shade step on everything below the
 * back plane, then the lit back facet — so each patch reads darker
 * where it spills over the flank, exactly like the torso shade-half.
 */
export declare function paintCattleBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: CattleLook, f: CattleBodyFrame): void;
/**
 * The cattle head: a billboard chamfered slab (like the humanoid head)
 * whose muzzle, ears, horns and eyes orbit with the facing. Shared by
 * the live rig and the ragdoll — corpses pass `dead` (no face marks)
 * and ys=1.
 */
export declare function drawCattleHead(ctx: CanvasRenderingContext2D, look: CattleLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Slow lateral cud-grind offset (screen px), idle only. */
    chew?: number;
}): void;
/**
 * The wild ram: a boxy fleece loaf on sturdy legs with a dark bare
 * face — and the signature, big ridged horns curling back around the
 * ears. The charge drops the whole head into a battering line.
 */
export interface RamLook {
    wool: string;
    /** Bare face and leg tone — dark against the fleece. */
    face: string;
    horn: string;
    hornRib: string;
    bodyW: number;
    backH: number;
    chestH: number;
    headW: number;
    headH: number;
    /** Horn curl radius (tiles). */
    hornR: number;
}
export declare function paintRamBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: RamLook, f: BeastBlockFrame): void;
/**
 * The ram head: horns first — each curls in its sagittal plane, up
 * over the ear, back, down and forward, drifting outward through the
 * spiral so the front view reads as two curls flanking the poll.
 * Growth ribs cross the curl. The bare face is a dark slab under a
 * wool cap.
 */
export declare function drawRamHead(ctx: CanvasRenderingContext2D, look: RamLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the charge telegraph. */
    charge?: number;
}): void;
/**
 * The kept ewe — THE FLEECE TELLS THE TIME. Two bodies in one
 * painter: a full cloud of scalloped cream fleece while the wool
 * stands ready for the shears, and a clipped, slimmer trim while it
 * regrows — the produce clock worn as silhouette, readable across a
 * whole yard. Dark bare face, drooping ears, no horns: kin to the
 * crag ram, but nobody's charger.
 */
export interface SheepLook {
    /** Standing fleece — and the duller clipped tone beneath it. */
    wool: string;
    woolShorn: string;
    /** Bare face, ears, and legs — dark against the cream. */
    face: string;
    bodyW: number;
    /** Fleece height standing full — and trimmed after the shears. */
    backH: number;
    backHShorn: number;
    chestH: number;
    headW: number;
    headH: number;
}
export declare const SHEEP_LOOK: SheepLook;
/**
 * The stag: elegance by proportion — a slim barrel held HIGH on long
 * legs, a proud rising neck column, pale rump patch, and branched
 * antlers swept back off the crown. The alarm-charge levels the
 * antlers forward.
 */
export interface StagLook {
    coat: string;
    belly: string;
    /** The pale rump patch — the deer flag. */
    rump: string;
    antler: string;
    muzzle: string;
    bodyW: number;
    backH: number;
    chestH: number;
    headW: number;
    headH: number;
    /** How far the head rides above the back line (tiles). */
    neckRise: number;
    /**
     * Branched crown or bare poll — the hind shares the whole deer
     * dialect and differs exactly here: no beams, leaf ears instead
     * (everything species-flavored lives in the look table).
     */
    antlers: boolean;
}
export declare const STAG_LOOK: StagLook;
/**
 * The hind: the stag's dialect at herd scale — a hand smaller, a
 * shade warmer, the neck a touch lower, and big leaf ears where the
 * stag carries his crown. Reads "deer" beside the stag and "not the
 * stag" on her own.
 */
export declare const HIND_LOOK: StagLook;
//# sourceMappingURL=rigHerd.d.ts.map