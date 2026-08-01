import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
/**
 * The combat hotbar: four ability slots — [Q] first art, [E] relic,
 * [R] second art, [T] boss Sigil (THE SECOND HAND: Q and R are both
 * free technique seats) — each with a radial cooldown wipe, a ready
 * flash, and a tooltip, plus a tray of the passives your worn gear
 * grants. A seat holding a lent secret art dims while its teaching
 * weapon is away (THE LOAN LAW). Slots are also buttons: pressing one
 * casts, so touch and mouse players get abilities without a keyboard.
 */
export declare class Hotbar {
    /**
     * THE COMPANION CHIP (beastcraft v2 Phase 5): the heel friend's
     * face, name, and health beside the buff chips — one glance says
     * fighting fit, wounded, downed, resting, or catching up. A
     * permanent tray resident on the sneak-eye pattern; DOM writes only
     * on change (the perf law of this file).
     */
    private readonly petChip;
    private readonly petFace;
    private readonly petName;
    private readonly petHpFill;
    private petKey;
    private readonly root;
    private readonly tray;
    private readonly buffTray;
    private buffKey;
    private readonly buffSecsEls;
    /** Stealth-state eye chip (sneaking / hidden / detected). */
    private readonly sneakChip;
    private readonly sneakEye;
    private sneakState;
    private readonly slots;
    private readonly wipes;
    private readonly icons;
    private readonly names;
    private readonly wasReady;
    private readonly wasDormant;
    private trayKey;
    /** Fires when a slot transitions to ready (for the soft tick). */
    onReady: (() => void) | null;
    constructor(input: InputManager);
    /** Fires when the companion chip is clicked (the pat channel). */
    onPetChip: (() => void) | null;
    /** Called once per frame — cheap DOM writes only on change. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=hotbar.d.ts.map