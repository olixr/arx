import { type Look } from '@arx/shared';
export declare class LookCreator {
    private readonly onConfirm;
    private readonly panel;
    private preview;
    private crest;
    private tabPanel;
    private look;
    private tab;
    private dir;
    private auto;
    private bust;
    private summary;
    private raf;
    open: boolean;
    constructor(onConfirm: (look: Look) => void);
    show(): void;
    hide(): void;
    /** Build the full card once per show(); look changes only touch the
     *  tab body and selection classes via rebuildTab(). */
    private build;
    /** Drag across the stage spins the hero by hand. */
    private bindDrag;
    private refreshTurn;
    /** One living line reading the current identity back to the player. */
    private updateSummary;
    private rebuildTab;
    /** Heritage: parchment cards, each wearing a live bust of the folk. */
    private buildHeritage;
    /** A labeled grid of rendered-bust option tiles. */
    private tileRow;
    private swatchRow;
    /** Retina-backed canvas: crisp vector art at any zoom. */
    private sizeCanvas;
    /**
     * The SPINNING STAGE's persistent anim memory (arms-v3 Phase 1): the
     * preview turns continuously, and the rig's stateful laws (the 240ms
     * rest-side ease, elbow memory, layer hysteresis) only run when the
     * SAME memory object survives across frames. Static busts stay
     * deliberately stateless — a still wants the single-frame fallbacks.
     */
    private stageKnees;
    private stageDepth;
    /** One rig pose, shared by the stage, busts, and the crest. */
    private paintFigure;
    /** A head-and-shoulders portrait: the head centered high, cropped
     *  tight — the true art, not an icon of it. */
    private drawBust;
    private drawPreview;
}
//# sourceMappingURL=lookCreator.d.ts.map