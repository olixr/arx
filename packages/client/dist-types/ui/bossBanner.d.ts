import type { ClientGame } from '../game/clientGame.js';
export declare class BossBanner {
    private readonly root;
    private readonly nameEl;
    private readonly titleEl;
    private readonly fill;
    private readonly ghost;
    private readonly notchesEl;
    private readonly pipsEl;
    private readonly revealEl;
    private key;
    private shown;
    private felledAt;
    constructor();
    /** Called once per frame — cheap, writes only on change. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=bossBanner.d.ts.map