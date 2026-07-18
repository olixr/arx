import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
/**
 * The combat hotbar: two ability slots — [Q] weapon Art, [E] relic —
 * each with a radial cooldown wipe, a ready flash, and a tooltip.
 * Slots are also buttons: pressing one casts, so touch and mouse
 * players get abilities without a keyboard.
 */
export declare class Hotbar {
    private readonly root;
    private readonly slots;
    private readonly wipes;
    private readonly icons;
    private readonly names;
    private readonly wasReady;
    /** Fires when a slot transitions to ready (for the soft tick). */
    onReady: (() => void) | null;
    constructor(input: InputManager);
    /** Called once per frame — cheap DOM writes only on change. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=hotbar.d.ts.map