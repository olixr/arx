import type { ClientGame } from '../game/clientGame.js';
export declare class Vitals {
    private readonly el;
    private readonly fill;
    private readonly text;
    private readonly level;
    private lastPct;
    private lastLevel;
    constructor(parent: HTMLElement);
    update(game: ClientGame): void;
    dispose(): void;
}
//# sourceMappingURL=vitals.d.ts.map