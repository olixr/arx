import type { PrefabDef, StructureTemplate } from '@devcraft/content';
/**
 * REAL-ART MINI RENDERS. Structure cards, prefab cards, and any other
 * "show me the content" surface render through the exact pipeline the
 * canvas uses: the game's chunk bake for the ground, tree sprites and
 * schematic blocks for standing tiles. A card preview is a small
 * truthful picture of what will stand in the world — never a mosaic
 * of flat color squares.
 */
export interface PreviewLayers {
    width: number;
    height: number;
    /** GHOST-style arrays; 0xffff ground = transparent (context grass). */
    ground: Uint16Array;
    detail: Uint16Array;
    elev?: Int8Array;
}
/**
 * Bake + overlay a tile rect into a canvas capped at `box` px on the
 * long side. Transparent cells read as the surrounding meadow, so an
 * L-shaped stamp previews on the grass it will actually stand on.
 */
export declare function renderLayersPreview(layers: PreviewLayers, box?: number): HTMLCanvasElement;
export declare function templateLayers(tpl: StructureTemplate): PreviewLayers;
export declare function prefabLayers(p: PrefabDef): PreviewLayers;
/** Placement pins drawn over a finished preview canvas. */
export declare function drawPreviewPins(canvas: HTMLCanvasElement, layers: PreviewLayers, pins: Array<{
    dx: number;
    dy: number;
    color: string;
}>, box?: number): void;
//# sourceMappingURL=preview.d.ts.map