import type { StageBackend, StageItem } from './stageTypes.js';
export declare class CanvasStage implements StageBackend {
    readonly canvas: HTMLCanvasElement;
    readonly kind: "canvas";
    private readonly ctx;
    private dpr;
    private w;
    private h;
    readonly isAlpha: boolean;
    /** True while drawing into an offscreen alpha layer (drawLayer):
     *  alpha-target blends become legal there on either stage. */
    private inLayer;
    private layerCv;
    private layerCtx;
    constructor(canvas: HTMLCanvasElement, opts?: {
        alpha?: boolean;
    });
    begin(w: number, h: number, dpr: number, clear: string | null, _renderScale?: number): void;
    draw(items: readonly StageItem[]): void;
    drawLayer(items: readonly StageItem[], alpha: number): void;
    private drawInto;
    end(): void;
}
//# sourceMappingURL=canvasStage.d.ts.map