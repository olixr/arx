import { Detail, Tile } from '@devcraft/shared';
import type { EditorState } from './state.js';
/**
 * The tile palette: every paintable tile, grouped the way a builder
 * thinks, searchable, with REAL art thumbnails — ground materials come
 * off an actual chunk bake, standing props ride their build-panel
 * icons, trees are painted by the tree painter itself. Nothing here is
 * a bare color square unless the game truly has no art for it yet.
 */
export interface TileCategory {
    id: string;
    label: string;
    tiles: Tile[];
}
export declare const TILE_CATEGORIES: TileCategory[];
export declare const DETAILS: Array<{
    d: Detail;
    label: string;
}>;
/** Palette display name — the transparency sentinel isn't a TileDef. */
export declare function paletteTileName(t: Tile): string;
/** Build (once) every tile thumbnail as a DOM element. */
export declare function buildThumbs(): Map<Tile, HTMLElement>;
/** Detail-layer thumbnails off the same bake path (grass underlay). */
export declare function buildDetailThumbs(): Map<Detail, HTMLElement>;
export interface PaletteHooks {
    onPickTile: (t: Tile) => void;
    onPickDetail: (d: Detail) => void;
}
export declare class PaletteUI {
    private readonly root;
    private readonly state;
    private readonly hooks;
    private readonly thumbs;
    private readonly detailThumbs;
    private activeCat;
    private query;
    private readonly recents;
    constructor(root: HTMLElement, state: EditorState, hooks: PaletteHooks);
    noteUse(t: Tile): void;
    rebuild(): void;
    private rebuildTabs;
    private swatch;
    private rebuildGrid;
}
//# sourceMappingURL=palette.d.ts.map