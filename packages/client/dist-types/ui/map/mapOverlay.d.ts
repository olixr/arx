import type { ClientGame } from '../../game/clientGame.js';
export declare class MapOverlay {
    private readonly game;
    visible: boolean;
    private readonly canvas;
    private readonly view;
    private lastPaint;
    constructor(game: ClientGame);
    toggle(): void;
    hide(): void;
    /** Per-frame from the main loop; suppressed while any screen is up. */
    update(now: number, suppressed: boolean): void;
}
//# sourceMappingURL=mapOverlay.d.ts.map