import type { InputManager } from '../input/inputManager.js';
export interface UiNavHooks {
    /** Swap two pack slots (pad carry mode). */
    onInvMove: (from: number, to: number) => void;
    /** Close all station panels + side panels (the Ⓑ backstop). */
    onCloseAll: () => void;
    /** Toggle the inventory / skills panels (Start / Select). */
    onToggleInventory: () => void;
    onToggleSkills: () => void;
    /** Contextual Ⓐ label for pack items (Deposit at bank, Sell in shop). */
    packActionLabel?: () => string | null;
}
export declare class UiNav {
    private readonly input;
    private readonly hooks;
    /** 'kb' or 'pad' — mirrored onto <body> as .pad-mode for CSS glyphs. */
    mode: 'kb' | 'pad';
    private focusKey;
    /** Pack slot index currently carried (pad move mode), or null. */
    private carrying;
    private readonly ring;
    private readonly strip;
    private readonly tooltip;
    private readonly prompt;
    private prevPressed;
    private navHeldSince;
    private navLastStep;
    private navHeldDir;
    private stripKey;
    private promptKey;
    /** Ring layout reads are throttled — forced layout every frame tanks fps. */
    private ringKey;
    private ringCarry;
    private ringAt;
    constructor(input: InputManager, hooks: UiNavHooks);
    private el;
    get isCarrying(): boolean;
    /** All currently-visible navigable elements. */
    private navigables;
    private focused;
    /** Spatial move: best candidate in the pressed direction. */
    private moveFocus;
    private setFocus;
    /** Pick up / place the focused pack slot (Ⓧ). */
    private handleCarry;
    /** Per-frame drive. Call after input.pollGamepad(). */
    update(nowMs: number, uiOpen: boolean): void;
    /** Start/Select work OUTSIDE menus too — that's how pads get in. */
    private handleGlobalButtons;
    private positionRing;
    private updateStrip;
    private hideStrip;
    /** Show the shared tooltip for an element (mouse hover path). */
    showTooltipFor(el: HTMLElement): void;
    hideTooltip(): void;
    private updateTooltip;
    /**
     * Glyph prompt floating over the tile the Interact button would use:
     * `Ⓧ Open Bank` on pad, `F Open Bank` on keyboard.
     */
    setPrompt(at: {
        sx: number;
        sy: number;
        label: string;
    } | null): void;
}
//# sourceMappingURL=padUI.d.ts.map