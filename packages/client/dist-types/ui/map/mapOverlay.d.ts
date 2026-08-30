import type { ClientGame } from '../../game/clientGame.js';
export declare class MapOverlay {
    private readonly game;
    visible: boolean;
    private readonly canvas;
    private readonly view;
    private lastPaint;
    constructor(game: ClientGame);
    /** The glass draws only the FOLLOWED errand's grounds, quietly. */
    setFollowedSource(fn: () => string | null): void;
    toggle(): void;
    hide(): void;
    /** THE CROSSING: forward the plane switch to the owned view. */
    onPlaneSwitch(): void;
    /** Per-frame from the main loop; suppressed while any screen is up. */
    update(now: number, suppressed: boolean): void;
}
//# sourceMappingURL=mapOverlay.d.ts.map