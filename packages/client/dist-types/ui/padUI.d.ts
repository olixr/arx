import type { InputManager } from '../input/inputManager.js';
export interface UiNavHooks {
    /** Swap two pack slots (pad carry mode). */
    onInvMove: (from: number, to: number) => void;
    /** Drop the carried pack slot onto the ground (Ⓨ while carrying). */
    onDropToWorld: (slot: number) => void;
    /** Close all station panels + side panels (the Ⓑ backstop). */
    onCloseAll: () => void;
    /** Toggle the inventory / skills panels (Start / Select). */
    onToggleInventory: () => void;
    onToggleSkills: () => void;
    /** Open the Handiwork / Build panels (d-pad down / right). */
    onOpenCraft: () => void;
    onOpenBuild: () => void;
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
    private wasUiActive;
    /** Direction held when UI capture began — inert until released. */
    private swallowDir;
    private navHeldSince;
    private navLastStep;
    private navHeldDir;
    private stripKey;
    /** A gameplay MODE's action strip (build mode) — overrides focus strip. */
    private modeStrip;
    private promptKey;
    /** Which side panels are open — focus re-lands when this changes. */
    private panelSig;
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
    update(nowMs: number, uiOpen: boolean, buildActive?: boolean): void;
    /**
     * Start/Select/d-pad work OUTSIDE menus too — that's how pads get
     * in: Start Pack, Select Skills, d-pad ▼ Handiwork, d-pad ▶ Build.
     * (D-pad ▲ stays an ability; down/right are free in gameplay.)
     */
    private handleGlobalButtons;
    private positionRing;
    private updateStrip;
    /**
     * Pin the strip to a gameplay mode's verbs (build mode) — shown on
     * BOTH devices, with the caller picking glyph chips per device.
     * Cleared when the mode ends; while set it outranks the focus strip.
     */
    showModeStrip(key: string, items: Array<[cls: string, glyph: string, label: string]>): void;
    clearModeStrip(): void;
    private renderStrip;
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