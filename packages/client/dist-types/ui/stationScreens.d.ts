import { ItemRoll, SkillXp } from '@arx/shared';
import type { StationPanels } from './stationPanels.js';
export declare function renderStable(host: StationPanels): void;
/**
 * The Builder's Table on the Workshop anatomy (LEDGER LEFT, WORK
 * RIGHT): blueprints shelved by category with an in-reach sort, and
 * the chosen piece laid out large — costs against the pack, build
 * time, footing in world-words, the dial note for corners, and one
 * Place button. Locked plans stay visible; ambition needs a map.
 */
export declare function renderBuild(host: StationPanels): void;
/** One ledger row (Workshop master list). A string `iconUrl` sets
 * the portrait synchronously; a function fills it through the
 * BUDGETED LANE (icons.ts) so a first-open burst never hitches. */
export declare function ledgerRow(host: StationPanels, opts: {
    key: string;
    iconUrl: string | ((img: HTMLImageElement) => void);
    name: string;
    note: string;
    noteTone?: 'ok' | 'short' | 'lock';
    selected: boolean;
    onPick: () => void;
    /**
     * THE HAND LANDS ON THE WORK: where the pad cursor goes once this
     * row is chosen — the detail pane's own verbs, so a ledger is never
     * a toll booth on the way to the Make button.
     */
    next?: string;
    /**
     * THE MARKED BATCH: a toggle chip riding the row's right edge, its
     * own pad stop, so marking a pile never means walking the detail
     * pane once per piece. Only the unmaking bench deals it.
     */
    mark?: {
        on: boolean;
        key: string;
        toggle: () => void;
    };
}): HTMLElement;
export declare function renderPlant(host: StationPanels): void;
export declare function renderCompost(host: StationPanels): void;
export declare function renderTrough(host: StationPanels): void;
export declare function renderWork(host: StationPanels): void;
/**
 * THE UNMAKING bench: the pack, filtered to what has Arx in it, and
 * an honest account of what each piece comes apart into.
 *
 * The yield is computed by the SAME pure function the server pays
 * out from, so the preview and the payout can never disagree. On a
 * destructive action that would be the worst bug in the system.
 */
export declare function renderUnmake(host: StationPanels, skills: SkillXp): void;
/**
 * THE MARKED BATCH — the bench's bulk lane. Marked pieces break as
 * ONE working (one send, one payout, one voice line, one moment of
 * light); the section reads the whole account out before the
 * two-press confirm. With nothing marked it offers the one clean
 * sweep: every plain piece with nothing bound in, marked in a single
 * press. Worked, deepened and rare-or-finer steel is never swept —
 * those are the player's own deliberate call, piece by piece.
 */
export declare function renderUnmakeBatch(host: StationPanels, marked: Array<{
    slot: number;
    item: string;
    roll?: ItemRoll;
}>, junk: Array<{
    slot: number;
    item: string;
    roll?: ItemRoll;
}>): void;
export declare function renderCraft(host: StationPanels): void;
/** One vault socket — goods pile or rolled armory piece. */
export declare function vaultCell(host: StationPanels, opts: {
    navkey: string;
    acta: string;
    item: string;
    qty?: number;
    roll?: ItemRoll;
    selected?: boolean;
    onPick: () => void;
    /** Where the pad cursor goes once this socket is chosen. */
    next?: string;
}): HTMLElement;
/**
 * The Vault (Grand Refit Ph5): stored goods dealt onto paged
 * LEAVES of sockets — family tabs shelve them, the armory hangs on
 * its own tab when rolled gear exists, and nothing hides behind a
 * scrollbar. Pick a pile and the counter beneath offers Take 1/5/
 * All. Hover or focus any socket for the full item card.
 */
export declare function renderBank(host: StationPanels): void;
//# sourceMappingURL=stationScreens.d.ts.map