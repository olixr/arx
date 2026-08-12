/**
 * Pure tile geometry for the editor's tools: brush footprints, thick
 * lines, shapes, flood fill, and the L-shaped road law the ZoneBuilder
 * paths use. Everything returns local tile coords; the editor applies
 * them through the stroke recorder.
 */
export interface Pt {
    x: number;
    y: number;
}
/** Brush footprint cells centered on a tile. */
export declare function footprint(cx: number, cy: number, size: number, shape: 'round' | 'square'): Pt[];
/** Bresenham between two tiles, inclusive. */
export declare function lineCells(x0: number, y0: number, x1: number, y1: number): Pt[];
/** A line stamped with a brush footprint at every step. */
export declare function thickLine(x0: number, y0: number, x1: number, y1: number, size: number, shape: 'round' | 'square'): Pt[];
export declare function rectCells(x0: number, y0: number, x1: number, y1: number, fill: boolean): Pt[];
export declare function ellipseCells(x0: number, y0: number, x1: number, y1: number, fill: boolean): Pt[];
/**
 * Contiguous flood fill over a sampled value, 4-connected, capped so a
 * misclick on an open meadow can't hang the tab.
 */
export declare function floodCells(startX: number, startY: number, width: number, height: number, sample: (i: number) => number, cap?: number): Pt[];
/**
 * The road law: consecutive waypoints connect with the ZoneBuilder's
 * L-shaped path (horizontal leg from the start, vertical leg into the
 * end), at the given width. One tool stroke = one committed road.
 */
export declare function roadCells(points: Pt[], width: number): Pt[];
/**
 * Cells inside a closed polygon (LOCAL tile coords) — even-odd
 * scanline over tile centers, plus the outline itself so thin shapes
 * never vanish. Powers the polygon tool and the lasso's freehand loop.
 */
export declare function polygonCells(pts: Pt[], fill: boolean): Pt[];
/**
 * A wall shell: the rect outline in the chosen wall tile with one
 * doorway centered on the south face — a building's bones in a drag.
 */
export declare function wallShellCells(x0: number, y0: number, x1: number, y1: number, wall: number, door: number): Array<Pt & {
    tile: number;
}>;
//# sourceMappingURL=tools.d.ts.map