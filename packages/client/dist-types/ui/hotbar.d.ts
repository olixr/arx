import { type AbilitySlot } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
/**
 * The combat hotbar: four ability slots — [Q] first art, [E] second
 * art (THE SECOND HAND: both free technique seats, side by side),
 * [R] relic, [T] boss Sigil — each with a radial cooldown wipe, a
 * ready flash, and a tooltip, plus a tray of the passives your worn
 * gear grants. A seat holding a lent secret art dims while its
 * teaching weapon is away (THE LOAN LAW). Slots are also buttons:
 * pressing one casts, so touch and mouse players get abilities
 * without a keyboard.
 */
export declare class Hotbar {
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
    /** THE HELD SIGIL: the slot whose ring is being aimed right now. */
    private aimingSlot;
    setAiming(slot: AbilitySlot | null): void;
    /** Called once per frame — cheap DOM writes only on change. */
    update(game: ClientGame): void;
}
//# sourceMappingURL=hotbar.d.ts.map