/**
 * THE SADDLED — courser looks, the saddle law and mountSpec.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { LegRigConfig } from './legs.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';
/**
 * The Dawnlands courser — the first saddle beast (THE ROAD GROWS
 * SHORT). A working horse in the brutalist dialect: tall block barrel
 * held high on long hoofed legs, a strong rising neck under a fallen
 * mane, a long plain head, and its tack worn honestly — blanket, seat,
 * girth, reins looped to the pommel. Coats keyed by MOUNT def id.
 */
export interface CourserLook {
    coat: string;
    belly: string;
    mane: string;
    muzzle: string;
    /** Lower-leg tone (the socks) — becomes the spec's legColor. */
    sock: string;
    /** Tack cloth under the saddle — the owner-visible identity color. */
    blanket: string;
    leather: string;
    /** Grey coats dapple; solid coats stay plain. */
    dapple?: boolean;
    /** Mountain shag: belly fringe and a heavier mane fall (the garron). */
    shaggy?: boolean;
    bodyW: number;
    backH: number;
    chestH: number;
    headW: number;
    headH: number;
    neckRise: number;
}
export declare const COURSER_LOOKS: Record<string, CourserLook>;
/**
 * Rider anchor geometry, tile units above the beast's ground point.
 * The renderer builds the rider's seat, stirrups, and pommel grip from
 * these; the tack painter draws to the same numbers — one ruler, so
 * the boot always meets the stirrup iron and the fists the pommel.
 */
export declare const COURSER_SADDLE: {
    seatH: number;
    stirrupH: number;
    stirrupSide: number;
    stirrupFwd: number;
    pommelFwd: number;
    pommelH: number;
    radius: number;
};
/**
 * THE GALLOP HAS FOUR BEATS: a saddle beast's legs each own a gait
 * group, so an amble walks a true four-beat (one hoof at a time — a
 * horse never trots its walk) and full tilt rolls the beats down the
 * body instead of stamping diagonal pairs. Every mount is a FLIGHT
 * rig: past a canter the rhythm nudge staggers launches and the duty
 * factor drops under 0.5 — the aerial beat, the whole reason a gallop
 * reads as flying where a trot reads as sewing.
 */
export declare function saddleLegs(fwd: number, side: number): LegRigConfig['legs'];
/** One rig for every coat — only the sock color varies. */
export declare function mountSpec(mountId: string): BeastSpec;
/**
 * Rider geometry per body — the garron seats lower than the courser.
 * Same shape as COURSER_SADDLE; the renderer picks by mount id.
 */
export declare function saddleFor(mountId: string): typeof COURSER_SADDLE;
export declare const GARRON_SADDLE: {
    seatH: number;
    stirrupH: number;
    stirrupSide: number;
    stirrupFwd: number;
    pommelFwd: number;
    pommelH: number;
    radius: number;
};
export declare const SABER_SADDLE: {
    seatH: number;
    stirrupH: number;
    stirrupSide: number;
    stirrupFwd: number;
    pommelFwd: number;
    pommelH: number;
    radius: number;
};
export declare function paintCourserBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: CourserLook, f: BeastBlockFrame, saddle?: typeof COURSER_SADDLE): void;
/**
 * The courser's head: a long plain skull with pricked ears, the
 * muzzle running well past the cheek to a soft dark nose — the length
 * is what separates horse from deer at a glance. The forelock falls
 * between the ears in the mane's color.
 */
export declare function drawCourserHead(ctx: CanvasRenderingContext2D, look: CourserLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
}): void;
//# sourceMappingURL=rigMount.d.ts.map