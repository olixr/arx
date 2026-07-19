import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
/**
 * The combat hotbar: four ability slots — [Q] weapon Art, [E] relic,
 * [R] learned Technique, [T] boss Sigil — each with a radial cooldown
 * wipe, a ready flash, and a tooltip, plus a tray of the passives your
 * worn gear grants. Slots are also buttons: pressing one casts, so
 * touch and mouse players get abilities without a keyboard.
 */
export declare class Hotbar {
    private readonly root;
    private readonly tray;
    private readonly buffTray;
    private buffKey;
    private readonly buffSecsEls;
    private readonly slots;
    private readonly wipes;
    private readonly icons;
    private readonly names;
    private readonly wasReady;
    private trayKey;
    /** Fires when a slot transitions to ready (for the soft tick). */
    onReady: (() => void) | null;
    constructor(input: InputManager);
    /** Called once per frame — cheap DOM writes only on change. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=hotbar.d.ts.map