import type { ClientGame } from '../game/clientGame.js';
export declare class SwapSlot {
    private readonly root;
    private readonly icon;
    private readonly offIcon;
    private renderedKey;
    private trading;
    constructor(onSwap: () => void);
    /** Called once per frame — DOM writes only when the state changes. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=swapSlot.d.ts.map