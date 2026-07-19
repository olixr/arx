import type { InteriorRegion } from './interiors.js';
/** Vertical rise of each roof ring, in tiles of screen height. */
export declare const ROOF_STEP = 0.5;
/** Fascia board depth under each ring's south edges. */
export declare const ROOF_FASCIA = 0.16;
export interface RoofBake {
    rings: RoofRing[];
    /** World-tile origin of every ring canvas (1-tile margin). */
    origX: number;
    origY: number;
    /** Canvas width/height in world tiles. */
    wTiles: number;
    hTiles: number;
    px: number;
    yScale: number;
}
export interface RoofRing {
    canvas: HTMLCanvasElement;
    /** Ring index: lift = wallH + k * ROOF_STEP. */
    k: number;
    /** Which canvas rows (world rows) hold content, for strip culling. */
    rows: boolean[];
}
export declare function bakeRoof(region: InteriorRegion, px: number, yScale: number): RoofBake;
//# sourceMappingURL=roofs.d.ts.map