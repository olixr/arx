import { Tile } from '@arx/shared';
import type { PaintHost } from './paintHost.js';
export declare const ORE_STYLES: Partial<Record<number, {
    nug: string;
    deep: string;
    accent: string;
    stone: {
        face: string;
        top: string;
        side: string;
    };
}>>;
/**
 * One rectangular stone block, spoken in the cliff dialect: broad
 * front face, lit cap strip across the top, shaded lane down the
 * off-light flank — hard 45° top chamfers, flat fills, one crisp
 * dark outline. `lean` shears the top edge sideways so stacked
 * blocks read geologic, never machined. Returns the silhouette so
 * callers can clip veins INTO the stone.
 */
export declare function stoneBlock(rend: PaintHost, cx: number, yb: number, w: number, hgt: number, lean: number, pal: {
    face: string;
    top: string;
    side: string;
}, seed?: number, taperK?: number): Array<[number, number]>;
/**
 * One TALL hewn monolith: a single tapering silhouette with a
 * stepped ledge on each flank — the "you walk up against it"
 * landmark mass. Same flat grammar as stoneBlock (lit cap, shaded
 * lane, shader-rung silhouette) but drawn as ONE rock, so height never reads
 * as a pancake tower of crates. Returns the silhouette so callers
 * can clip veins INTO the stone.
 */
export declare function monolith(rend: PaintHost, cx: number, yb: number, w: number, hgt: number, m: number, pal: {
    face: string;
    top: string;
    side: string;
}, seed?: number): Array<[number, number]>;
/**
 * One BIG rectangular ore node: a deep-toned frame around a bright
 * mineral face, capped with a hard square glint. The nodes are the
 * protagonists of a deposit — blocky, rigid, sized to read from
 * across the screen, planted proud of the host stone.
 */
export declare function oreNode(rend: PaintHost, x: number, y: number, w: number, rot: number, pal: {
    nug: string;
    deep: string;
    accent: string;
}): void;
/**
 * THE GROWING FRAME's body: three bent withy hoops over the bed, a
 * ridge lath, and the oiled cloth — rolled to one side on a bare
 * frame, drawn as a low translucent skirt over a planted one (the
 * plant shows through; the cloth is the promise of warmth, never a
 * curtain over the art).
 */
export declare function drawGrowingFrame(rend: PaintHost, bx: number, gy: number, h: number, planted: boolean): void;
/** A four-point star twinkle - the "this is mineable" beacon. */
export declare function sparkle(rend: PaintHost, x: number, y: number, r: number, alpha: number, color: string): void;
/** Blocky spall scattered at a formation's feet - grounds the mass. */
export declare function rubble(rend: PaintHost, px: number, py: number, s: number, h: number, colors: string[]): void;
/**
 * MINING NODES — every metal is a bespoke LANDMARK in the brutalist
 * dialect: rectangular blocks, hard chamfers, flat fills, no
 * pebble-circles. Copper raises a rust obelisk with a seam of raw
 * metal climbing its full height. Tin lays an oblong ridge crested
 * by a march of cubic crystals. Iron stacks banded slabs into a
 * natural anvil. Coal drives a jagged black seam-wall up between
 * grey shoulders. Gold splits a standing pillar with a quartz vein
 * crowned in nuggets. Deposits stand player-tall or better, and all
 * of them twinkle at idle — the eye finds a mineable node before
 * the tooltip does. Every formation mirrors and resizes off its
 * world hash so no two reads stamped.
 */
export declare function drawRockFormation(rend: PaintHost, px: number, py: number, s: number, h: number, tile: Tile, tSec: number, crowded?: boolean): void;
//# sourceMappingURL=rockArt.d.ts.map