/**
 * Action-mapping input layer: keyboard/mouse, Gamepad API, and touch
 * (virtual joystick) all write into one shared action state that the
 * game samples once per network tick.
 */
export declare class InputManager {
    private keys;
    mouseX: number;
    mouseY: number;
    private mouseDown;
    /** Virtual joystick axes (touch UI writes these). */
    touchMoveX: number;
    touchMoveY: number;
    /** Held state of on-screen touch buttons. */
    touchAttack: boolean;
    touchAbility1: boolean;
    touchAbility2: boolean;
    touchAbility3: boolean;
    touchAbility4: boolean;
    /** Gamepad right-stick aim, radians; null when the stick is idle. */
    gamepadAim: number | null;
    /** True when a gamepad supplied the most recent input. */
    private padUsed;
    /**
     * While the pad is driving MENUS, its sticks and buttons must not
     * leak into gameplay — navigating a bank must never swing a sword.
     * The UI layer (UiNav) owns this flag.
     */
    uiCapture: boolean;
    /**
     * Build mode claims the pad's combat buttons (A/X/Y become place /
     * place / demolish) but keeps movement and the aim stick — you walk
     * and steer the ghost while you build. main.ts owns this flag.
     */
    buildCapture: boolean;
    /** While a DOM field (chat) has focus, movement keys are ignored. */
    private typingCheck;
    /**
     * Walk mode: keyboards have no analog stick, so Z toggles a scaled
     * input vector instead — the stick's half-tilt, as a latch.
     */
    walkMode: boolean;
    /**
     * Sneak mode: the crouch-walk latch. Scales the input vector like walk
     * AND raises the held Sneak bit so the server tracks stealth state.
     */
    sneakMode: boolean;
    constructor(target: HTMLElement);
    setTypingCheck(fn: () => boolean): void;
    isDown(code: string): boolean;
    private pad;
    /** Poll gamepad sticks; call once per frame before sampling. */
    pollGamepad(): void;
    /** Raw pad state for the UI navigation layer (edge-detects itself). */
    padSnapshot(): {
        buttons: readonly GamepadButton[];
        axes: readonly number[];
    } | null;
    /** Any pad activity at all — flips the HUD into pad mode. */
    notePadActivity(): void;
    /** Movement axes in [-1, 1] — keyboard, gamepad, or touch stick. */
    moveAxes(): {
        mx: number;
        my: number;
    };
    buttons(): number;
    /** X button (west) on the pad — polled for interact edge detection. */
    padInteractPressed(): boolean;
    /** True when a connected gamepad is the player's active input device. */
    padPrimary(): boolean;
    /**
     * Haptic feedback (dual-rumble) — combat impact travels through the
     * hands on gamepads. Silently a no-op without actuator support.
     */
    rumble(strong: number, weak: number, durationMs: number): void;
}
//# sourceMappingURL=inputManager.d.ts.map