/**
 * THE PAD SPEAKS MANY DIALECTS — one translator.
 *
 * The Gamepad API only promises the tidy sixteen-button / four-axis
 * "standard" layout when the browser recognises the device. A DualSense
 * on Chrome gets that recognition; an 8BitDo paired over Bluetooth in
 * Switch / D-input / macOS mode very often does NOT — it arrives with
 * `mapping: ''`, its d-pad folded into a single hat AXIS, its right
 * stick shoved down the axis list, and its face buttons in Nintendo
 * order. The old code read `pad.axes[2]` and `buttons[12]` straight,
 * so those pads did nothing at all.
 *
 * Everything above this file keeps reading the standard layout. This
 * module is the one place that knows a pad might not speak it.
 *
 * Laws:
 * - ONE TRANSLATOR. No consumer touches a raw Gamepad; InputManager
 *   hands out normalized views only.
 * - STANDARD PASSES THROUGH UNTOUCHED. A pad the browser already
 *   mapped is never second-guessed.
 * - THE HAT IS A D-PAD. A hat axis becomes buttons 12-15, always.
 * - GUESS, THEN SAY SO. An unknown pad gets the heuristic layout and
 *   the diagnostics row names it, so a player can see what we assumed
 *   and rebind past it.
 */
/** Standard-layout button slots, by name, for readability below. */
export declare const PAD_SLOTS = 16;
export interface PadLayout {
    /** Shown in the diagnostics readout. */
    name: string;
    /**
     * Raw button index feeding each standard slot 0-15; -1 means the
     * device has no such button (or a hat supplies it).
     */
    buttons: readonly number[];
    /** Raw axis indexes for [leftX, leftY, rightX, rightY]; -1 if absent. */
    axes: readonly [number, number, number, number];
    /** Raw axis carrying an 8-way d-pad hat, filling slots 12-15. */
    hatAxis?: number;
    /** Raw axes carrying analog [LT, RT] when they are not buttons. */
    triggerAxes?: readonly [number, number];
}
export declare const STANDARD_LAYOUT: PadLayout;
/** Pull `vendor: xxxx` / `product: xxxx` out of a Chrome-style id. */
export declare function padVendorProduct(id: string): {
    vendor: string;
    product: string;
} | null;
/**
 * The last-resort layout for a pad nobody recognises: sticks on the
 * first four axes (skipping any hat), buttons straight through, d-pad
 * from a hat when one is found. This is the shape the overwhelming
 * majority of HID pads report, so it is a good guess — and the
 * diagnostics row says it was a guess.
 */
export declare function genericLayout(pad: Gamepad, name?: string, hatAxis?: number | undefined): PadLayout;
/**
 * Which dialect a pad speaks. Standard-mapped pads short-circuit; a
 * pad the browser did not map gets its profile, or the heuristic.
 */
export declare function resolveLayout(pad: Gamepad): PadLayout;
/**
 * Hat value → the four d-pad slots. Chrome encodes the eight compass
 * points as -1 (up) stepping by 2/7 clockwise to 1 (up-left); an idle
 * hat parks outside [-1, 1], so anything out of range is centred.
 */
export declare function hatToDpad(v: number): [boolean, boolean, boolean, boolean];
/** A pad rendered in the standard layout, whatever it actually speaks. */
export interface PadView {
    id: string;
    index: number;
    /** Which dialect the translator used — for the diagnostics row. */
    profile: string;
    /** True when the browser mapped it and no translation was needed. */
    native: boolean;
    buttons: readonly GamepadButton[];
    /** Exactly four: leftX, leftY, rightX, rightY. */
    axes: readonly number[];
    raw: Gamepad;
}
/** Translate a live Gamepad into the standard layout. */
export declare function normalizePad(pad: Gamepad, layout?: PadLayout): PadView;
/**
 * THE TRANSLATOR REMEMBERS. A hat axis only betrays itself while it is
 * IDLE (it rests outside [-1, 1]); held, it reads like a stick. So the
 * layout is resolved once per device and cached, and every frame keeps
 * watching for an out-of-range axis — the first time one appears, the
 * layout is rebuilt with the hat known. A pad whose d-pad was held
 * during the very first poll therefore heals on release instead of
 * spending the session with a phantom third stick.
 */
export declare class PadTranslator {
    private cache;
    /** Axis indexes proven to be hats, per device. */
    private hats;
    private key;
    /** Forget a device's layout — call on gamepaddisconnected. */
    forget(pad: Gamepad | string): void;
    forgetAll(): void;
    layoutFor(pad: Gamepad): PadLayout;
    /**
     * A translated view, memoized on the device's own timestamp — the
     * pad is read a dozen times a frame (movement, buttons, the UI
     * layer, the aim stick) and only one of those reads should pay for
     * rebuilding sixteen button objects.
     */
    view(pad: Gamepad): PadView;
    private memoKey;
    private memo;
}
/** Any button pressed or stick deflected — "this pad is the live one". */
export declare function padIsActive(pad: Gamepad): boolean;
//# sourceMappingURL=padProfiles.d.ts.map