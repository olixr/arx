import type { ClientGame } from '../game/clientGame.js';
export declare class RepScreen {
    private readonly game;
    private readonly panel;
    private readonly body;
    private renderedVersion;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    open(): void;
    close(): void;
    /** Quiet-wire hook: repaint only when open and only on change. */
    refresh(): void;
    private render;
    private factionRow;
}
//# sourceMappingURL=repScreen.d.ts.map