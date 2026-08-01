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
    /**
     * A cinematic (dialogue) owns the stage: movement and every combat
     * button go quiet so a Space-to-advance never swings a sword and a
     * WASD twitch never walks you out of the frame. main.ts owns this.
     */
    cinemaCapture: boolean;
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
    /**
     * One queued sit-toggle press (X / pad D-down). Consumed into exactly
     * one input frame's Sit bit — the server owns the seated state and
     * edge-detects the flip, so the client keeps no latch to desync.
     */
    private sitQueued;
    private padSitWasDown;
    /**
     * One queued sheathe-toggle press (H / pad D-left) — same protocol
     * as sit: one frame carries the bit, the server owns the state.
     */
    private sheatheQueued;
    private padSheatheWasDown;
    private padSneakWasDown;
    /**
     * One queued mount-toggle press (P; pad unbound by default) — the
     * sit protocol again: one frame carries the bit, the server owns
     * the saddle and every dismount law.
     */
    private mountQueued;
    private padMountWasDown;
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
    /** The pad's Interact button (Ⓐ default) — polled for edge detection. */
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