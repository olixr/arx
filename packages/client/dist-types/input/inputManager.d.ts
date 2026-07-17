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
    /** Gamepad right-stick aim, radians; null when the stick is idle. */
    gamepadAim: number | null;
    /** True when a gamepad supplied the most recent input. */
    private padUsed;
    /** While a DOM field (chat) has focus, movement keys are ignored. */
    private typingCheck;
    constructor(target: HTMLElement);
    setTypingCheck(fn: () => boolean): void;
    isDown(code: string): boolean;
    private pad;
    /** Poll gamepad sticks; call once per frame before sampling. */
    pollGamepad(): void;
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