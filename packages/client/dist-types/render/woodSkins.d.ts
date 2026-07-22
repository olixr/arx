/**
 * A timber building is cut from ONE stand of trees: every log wall,
 * doorway, window, and floorboard of a building shares a wood skin —
 * wall tones (logs, limewash chinking, squared beams, trim), a floor
 * lumber order (its own tight tone family plus board length), and a
 * texture character. The character is what keeps variants from being
 * a recolor: pine is knotty and cut in SHORT boards, weathered spruce
 * is checked, split, and sun-bleached, walnut is calm and laid in
 * LONG prestige boards. Skins are dealt per BUILDING from its
 * interior-region anchor, so neighbouring houses come from different
 * forests while one house agrees wall-to-floor.
 */
export interface WoodSkin {
    /** Base log tone + whisper alternate — one lumber order. */
    log: string;
    log2: string;
    /** Limewash chinking packed between courses. */
    chink: string;
    /** Crown cap-beam top. */
    top: string;
    /** Squared sill and wall-plate beams. */
    plate: string;
    /** Doorway/window trim — two steps lighter law. */
    trim: string;
    /** Floorboard tone family — tight, one lumber order per house. */
    floorTones: readonly string[];
    /** Floorboard length in tiles — cut by the wood, not the builder. */
    boardLen: number;
    /** Board courses per tile — small trees yield narrow boards. */
    rowsPerTile: number;
    /** Texture character multipliers (knots / seasoning checks). */
    knotK: number;
    checkK: number;
}
export declare const WOOD_SKINS: readonly WoodSkin[];
/**
 * The skin a building wears, dealt from its interior-region anchor.
 * No region (unenclosed player runs, freestanding floors) = oak; a
 * building takes on its wood the moment it is enclosed.
 */
export declare function dealWoodSkin(region: {
    x0: number;
    y0: number;
} | null): WoodSkin;
//# sourceMappingURL=woodSkins.d.ts.map