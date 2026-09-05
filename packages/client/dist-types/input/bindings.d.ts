/**
 * THE ONE KEYMAP — every keyboard key and pad button the game answers
 * to is declared here, once. InputManager, the panel hotkeys, the dock
 * badges, the hotbar, and the Controls menu all read this table, so a
 * binding can never drift between what a key DOES and what the UI SAYS.
 *
 * Laws:
 * - ONE ACTION PER KEY. Within a device, no code/button may serve two
 *   actions. `assertNoConflicts` is the contract; the test enforces it
 *   on the shipped defaults, `bind*` enforces it on player edits by
 *   stealing the key from its old owner (and saying so).
 * - MENU GRAMMAR IS FIXED. Ⓐ confirm / Ⓑ close / Ⓧ move / Ⓨ options
 *   and LB/RB screen-cycling are the console dialect — they belong to
 *   the UI layer, not this table, and cannot be rebound away.
 * - PLAYER'S TABLE WINS. Custom bindings persist in localStorage and
 *   load before the first frame; resetting restores this file exactly.
 */
import { type PadFamily } from './padProfiles.js';
export type ActionId = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'attack' | 'ability1' | 'ability2' | 'ability3' | 'ability4' | 'quickUse' | 'interact' | 'lootReveal' | 'buildRotate' | 'sit' | 'sheathe' | 'swapSets' | 'mount' | 'walkToggle' | 'sneakToggle' | 'screenPack' | 'screenSkills' | 'screenArts' | 'screenCraft' | 'screenBuild' | 'screenSocial' | 'screenMap' | 'screenQuests' | 'screenRep' | 'screenSettings' | 'screenKeys' | 'screenBeasts' | 'screenCompanions' | 'screenLoot' | 'mapGlass' | 'zoomIn' | 'zoomOut' | 'zoomCycle';
export interface ActionDef {
    id: ActionId;
    /** Player-facing name — quiet quartermaster diction. */
    label: string;
    group: 'Movement' | 'Combat' | 'World' | 'Screens' | 'Camera';
    /** Default KeyboardEvent.code list (first entry is the shown badge). */
    kb: readonly string[];
    /** Default standard-gamepad button indexes. */
    pad: readonly number[];
}
/**
 * The shipped layout. Keyboard: WASD moves, Space attacks, QERT casts,
 * F uses, 1 swallows the belt's meal, backquote trades weapon sets;
 * the stance row is Z walk / X sit / C sneak; screens live on
 * I K V N B U M O G. Pad: RT (or Ⓧ) attacks, Ⓐ uses, LB/LT/RB/▲
 * cast, Ⓨ names the loot; d-pad ▼ eats off the belt, ◀ sheathes
 * (HELD ◀ trades weapon sets), ▶ raises the glass; L3 sneaks, R3
 * steps the camera; Start is the pack, Select the chart.
 *
 * THE FREED HAND (2026-09-05): Shift on keys and Ⓑ on the pad are
 * UNBOUND. The pressed dodge dash that lived there left the game (it
 * had become a stride exploit and nothing else; its defensive worth
 * is THE SLIPPED BLOW now, rolled where a blow lands). Both stay free
 * on purpose — the first genuinely open pad button since ONE KEYMAP —
 * so the next verb that truly needs a thumb has somewhere to land.
 *
 * THE PAIRED HAND: the two technique seats ride TOGETHER — Q and E on
 * keys, LB and LT under the left hand — because arts are the first
 * things earned and the most cast. The trinkets (relic R/RB, sigil
 * T/▲) arrive later and sit behind them.
 */
export declare const ACTIONS: readonly ActionDef[];
/** KeyboardEvent.code → short badge text. */
export declare function kbLabel(code: string): string;
/** The face family currently on the chips (for diagnostics rows). */
export declare function currentPadFamily(): PadFamily;
/**
 * Standard-gamepad button index → glyph chip class + text. Defaults
 * to the live pad's family; pass `faces`/`family` to letter a chip
 * for a SPECIFIC pad (the Controls readout lists every pad, each in
 * its own markings).
 */
export declare function padGlyph(btn: number, faces?: readonly [string, string, string, string], family?: PadFamily): {
    cls: string;
    text: string;
};
/**
 * The inline form for prose hints ("Ⓐ place, Ⓑ done"): letters wear
 * their circle, PlayStation shapes stand as themselves.
 */
export declare function padGlyphInline(btn: number): string;
type Table = Record<ActionId, {
    kb: string[];
    pad: number[];
}>;
/**
 * Throws when two actions claim the same key or button — the standing
 * contract on the defaults, exercised by the unit test.
 */
export declare function assertNoConflicts(table: Table): void;
export declare class Bindings {
    private table;
    private listeners;
    constructor();
    /** Re-read the player's saved table (no-op without storage). */
    private load;
    private save;
    /** Redraw hook for badges/hotbar/menu — fired after any change. */
    onChange(fn: () => void): void;
    /**
     * THE BUTTON WEARS ITS OWN NAME: adopt the live pad's marking
     * family. InputManager calls this the moment the active pad's id
     * changes; a real change re-letters every chip via onChange.
     */
    setPadFamily(family: PadFamily, profile: string): void;
    private emit;
    kb(id: ActionId): readonly string[];
    pad(id: ActionId): readonly number[];
    /** Badge text for the action's first key ('' when unbound). */
    kbBadge(id: ActionId): string;
    /** Glyph chip for the action's first pad button (null when unbound). */
    padBadge(id: ActionId): {
        cls: string;
        text: string;
    } | null;
    kbMatches(id: ActionId, code: string): boolean;
    /** Any of the action's keys currently in the held-keys set. */
    kbDown(id: ActionId, keys: ReadonlySet<string>): boolean;
    /** Any of the action's pad buttons pressed in a snapshot. */
    padHeld(id: ActionId, snap: {
        buttons: readonly {
            pressed: boolean;
        }[];
    } | null): boolean;
    /**
     * Bind a key to an action, stealing it from any current owner.
     * Returns the action that lost the key, if one did. Reserved keys
     * (Esc, Enter) are refused — they are the UI's own grammar.
     */
    bindKb(id: ActionId, code: string): {
        stolenFrom: ActionId | null;
    } | 'reserved';
    /** Bind a pad button to an action, stealing it from any owner. */
    bindPad(id: ActionId, btn: number): {
        stolenFrom: ActionId | null;
    };
    /** True when any binding differs from the shipped layout. */
    isCustomized(): boolean;
    /** The standard layout, back exactly. */
    resetAll(): void;
}
/** The game's one bindings table. */
export declare const bindings: Bindings;
export {};
//# sourceMappingURL=bindings.d.ts.map