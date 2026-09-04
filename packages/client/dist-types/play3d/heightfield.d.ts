/**
 * THE GROUND HAS SIDES (play3d S1) — a chunk's tile elevation levels
 * become a real mesh: one flat quad per tile at its level, and a real
 * VERTICAL FACE wherever a tile stands higher than its neighbour.
 *
 * This module is PURE: numbers in, typed arrays out. No DOM, no
 * Three.js — the node test runner proves it, and ground.ts merely
 * wraps the arrays in a BufferGeometry.
 *
 * Laws:
 *  - Tops are FLAT per tile (levels are integers on the wire; the 2D
 *    game paints plateau tops flat, so does this). Only Ramp tiles
 *    slope: their corners toward the higher cardinal neighbour take the
 *    high level, the far corners the low one.
 *  - THE HIGH TILE OWNS THE FACE. A vertical face is emitted by the tile
 *    whose edge is higher, once, with THAT tile's texture rect — so a
 *    cliff wall wears the cliff tile's baked art, chunk borders never
 *    double-emit, and the low side never paints a grass wall.
 *  - Faces stretch the tile rect vertically (a 3-level drop is one
 *    stretched rect). Honest placeholder — S2 gives cliffs their own
 *    face painter (cliffArt tones) in an atlas.
 *  - UVs address the baked chunk canvas INSIDE its gutter, so the
 *    gutter's real neighbour content feeds the sampler at chunk edges
 *    (the same reason the 2D blit insets) and nothing is cropped.
 *  - Winding is corrected against the intended normal, so every quad is
 *    front-facing whichever way the caller hands its corners.
 */
export interface HeightfieldInput {
    cx: number;
    cy: number;
    /** Tiles per chunk side. */
    size: number;
    /** Elevation LEVEL of any world tile (neighbours included). */
    levelAt: (tx: number, ty: number) => number;
    /** True when the world tile is a walkable Ramp. */
    isRamp: (tx: number, ty: number) => boolean;
    /** World height of one level, in tiles. */
    levelH: number;
    /** Bake pixels per tile and the bake gutter, for the UV inset. */
    px: number;
    gutter: number;
}
export interface HeightfieldMesh {
    positions: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
    vertexCount: number;
    /** Vertical faces emitted (cliff walls). */
    faceCount: number;
    /** Tallest vertex (world units) — the streamer's bounding box. */
    maxY: number;
    minY: number;
}
/** Corner levels of a tile: [nw, ne, se, sw], sloped for ramps. */
export declare function cornerLevels(tx: number, ty: number, levelAt: HeightfieldInput['levelAt'], isRamp: HeightfieldInput['isRamp'], out: Float64Array): Float64Array;
/**
 * Bilinear height (world units) at a world point — entities stand on
 * this. Flat tiles return their level; ramps slope between corners.
 */
export declare function heightAtPoint(wx: number, wy: number, levelAt: HeightfieldInput['levelAt'], isRamp: HeightfieldInput['isRamp'], levelH: number, scratch: Float64Array): number;
/** Build the chunk mesh. Vertex count stays well under 2^32 (uint32 indices). */
export declare function buildHeightfield(inp: HeightfieldInput): HeightfieldMesh;
//# sourceMappingURL=heightfield.d.ts.map