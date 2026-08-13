import type { InputManager } from '../input/inputManager.js';
import { type ActionId } from '../input/bindings.js';
export interface UiNavHooks {
    /** Swap two pack slots (pad carry mode). */
    onInvMove: (from: number, to: number, merge?: boolean) => void;
    /** Drop the carried pack slot onto the ground (Ⓨ while carrying). */
    onDropToWorld: (slot: number) => void;
    /**
     * Focus landed on an element — show the item inspect card for it if
     * it's an item cell. Return true when a card is showing (the small
     * tooltip stands down). Called with null when pad UI ends.
     */
    onInspect?: (el: HTMLElement | null) => boolean;
    /** Ⓨ on a focused item cell: open its verb menu. */
    onItemMenu?: (el: HTMLElement) => void;
    /** Close an open verb menu; true if one was open (Ⓑ eats the press). */
    closeItemMenu?: () => boolean;
    /** Close all station panels + side panels (the Ⓑ backstop). */
    onCloseAll: () => void;
    /**
     * A rebindable screen shortcut fired on its pad button — Start Pack,
     * Select Chart by default. Same wire as the keyboard hotkeys.
     */
    onScreenAction: (id: ActionId) => void;
    /** LB / RB with a screen open: step to the prev / next screen. */
    onCycleScreen: (dir: -1 | 1) => void;
    /** Contextual Ⓐ label for pack items (Deposit at bank, Sell in shop). */
    packActionLabel?: () => string | null;
    /** Focus stepped to a new control — the barely-there cursor tick. */
    onFocusMove?: () => void;
    /** The device changed hands — screens re-render their glyphs. */
    onModeChange?: (mode: 'kb' | 'pad') => void;
    /** The Screen Ring chose a room. */
    onRingPick?: (id: string) => void;
    /** The rooms the ring fans out — id, name, painted crest. */
    ringItems?: () => Array<{
        id: string;
        label: string;
        icon: string;
    }>;
}
export declare class UiNav {
    private readonly input;
    private readonly hooks;
    /** 'kb' or 'pad' — mirrored onto <body> as .pad-mode for CSS glyphs. */
    mode: 'kb' | 'pad';
    /** True while the Controls menu is capturing a new binding. */
    suspended: boolean;
    /**
     * A screen may claim the left stick for itself (the Chart pans with
     * it); while claimed, spatial focus walks on the d-pad alone.
     */
    claimStick: (() => boolean) | null;
    private focusKey;
    /** Pack slot index currently carried (pad move mode), or null. */
    private carrying;
    private readonly ring;
    private readonly strip;
    private readonly tooltip;
    private readonly prompt;
    /** The Screen Ring overlay (hold Start). */
    private readonly screenRing;
    private ringShown;
    private ringStartAt;
    private ringSel;
    private ringButtons;
    private prevPressed;
    private wasUiActive;
    /** Where focus returns when the item verb menu closes. */
    private menuReturnKey;
    /**
     * THE HAND LANDS ON THE WORK: a `data-navnext` target still looking
     * for its element. `from` is where the cursor stood, so Ⓑ can walk
     * back; `until` bounds the search so a target that never renders
     * cannot ambush a later frame.
     */
    private advance;
    /** Where Ⓑ retraces to — set the moment an advance actually lands. */
    private retraceKey;
    /**
     * Where the cursor physically was, so a wholesale re-render recovers
     * to the nearest surviving control instead of the panel's first row.
     */
    private lastRect;
    /** Each screen's last stop, so LB/RB come back to where you were. */
    private readonly placeByScreen;
    /** Direction held when UI capture began — inert until released. */
    private swallowDir;
    private navHeldSince;
    private navLastStep;
    private navHeldDir;
    private stripKey;
    /** A gameplay MODE's action strip (build mode) — overrides focus strip. */
    private modeStrip;
    private promptKey;
    /** When the current prompt target first appeared — drives .settled. */
    private promptSince;
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
    /**
     * Spatial move: best candidate in the pressed direction — but THE
     * REGION HOLDS THE RING first. Candidates sharing the focused
     * element's `[data-region]` container win outright; only when the
     * region offers nothing in that direction does the ring hop out.
     * A list column can never bleed focus into its neighbor mid-walk.
     */
    private moveFocus;
    private setFocus;
    /**
     * One directional step: a focused slider consumes ◀ ▶ as value
     * nudges (the audio menu's volumes, any future range row); everything
     * else moves the focus ring spatially.
     */
    private navStep;
    /**
     * THE HAND LANDS ON THE WORK. `data-navnext` names where the cursor
     * goes once this control has been used. Three dialects:
     *   `key:<navkey>`   an exact control
     *   `pfx:<prefix>`   the first control whose key starts with prefix
     *   a CSS selector   the first usable control inside that container
     * An enabled control always wins over a disabled one — a Make button
     * greyed for want of ore must not swallow the cursor.
     */
    private advanceTarget;
    /** Arm the advance declared on the control just activated. */
    private armAdvance;
    /**
     * Try to land a pending advance. The target usually appears in the
     * same frame the panel re-rendered; a wire round-trip can take a few
     * more, and the window expires quietly rather than landing late.
     */
    private resolveAdvance;
    /**
     * One step back up the trail an advance made. True when the cursor
     * moved, so Ⓑ eats the press instead of shutting the room.
     */
    private retraceStep;
    /**
     * THE RING HOLDS ITS GROUND. Focus went missing — a wholesale
     * re-render dropped the element under our key. Land on whatever now
     * stands nearest to where the cursor physically was; only a fresh
     * room (no remembered place, no last position) starts at the top.
     */
    private landFocus;
    /** Pick up / place the focused pack slot (Ⓧ). */
    private handleCarry;
    /** Per-frame drive. Call after input.pollGamepad(). */
    update(nowMs: number, uiOpen: boolean, buildActive?: boolean): void;
    /**
     * Screen shortcuts work OUTSIDE menus too — that's how pads get in:
     * Start Pack, Select Chart, d-pad ▶ the glass (all rebindable in
     * Controls). Gameplay buttons never appear here: the one keymap
     * guarantees no button serves both a screen and a swing.
     */
    private handleGlobalButtons;
    /** The open room's section rail, when it declares one. */
    private roomTabs;
    /**
     * A bumper press: step the room's section rail when one stands,
     * otherwise walk the shelf of screens. An open verb menu owns the
     * frame — sections must not slide under a raised sheet of verbs.
     */
    private bumperStep;
    /** LT/RT: hand the press to the open room's declared pager — the
     * ledger first (the rail already answers the bumpers), the rail
     * itself when it is the only pager the room owns. */
    private dispatchPage;
    /**
     * Start's tap-or-hold machine. Hold past the threshold and the ten
     * rooms fan around the stick; flick, release, the room opens. A tap
     * shorter than the threshold fires whatever screen action Start is
     * bound to — the shipped default (open the Pack) survives intact.
     * Returns true while it owns the frame.
     */
    private handleRing;
    private showScreenRing;
    private hideScreenRing;
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
     * `Ⓧ Open Bank` on pad, `F Open Bank` on keyboard. After a few
     * seconds parked on the same target the label folds away and only
     * the dim key cap stays — a new target brings the verb back.
     */
    setPrompt(at: {
        sx: number;
        sy: number;
        label: string;
    } | null): void;
}
//# sourceMappingURL=padUI.d.ts.map