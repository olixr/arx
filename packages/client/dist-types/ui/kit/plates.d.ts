/**
 * PLATES, SOCKETS, THE INSPECTOR — the kit's physical pieces
 * (The Grand Refit, Phase 2).
 *
 * - A PLATE is the big graphical unit collections are made of: a cut
 *   piece of stock carrying a portrait, a name, and small seals. It
 *   is what a "row of text" becomes when a room is gamified.
 * - A SOCKET is a painted recessed well something can seat into —
 *   the loadout altar's language. It shows its button chip, its
 *   occupant, and flashes when something lands.
 * - The INSPECTOR is the fixed-anatomy detail card: it renders on
 *   focus, in place, so inspection never costs travel.
 * - An EMPTY STATE is one warm quartermaster line with an emblem —
 *   a blank well is a defect.
 */
import type { ActionId } from '../../input/bindings.js';
/** A cut plate: portrait + name + sub, pad-navigable. */
export declare function plate(opts: {
    icon?: string;
    name: string;
    sub?: string;
    navkey: string;
    acta?: string;
    onPick?: () => void;
}): HTMLElement;
export interface Socket {
    root: HTMLElement;
    /** Seat an occupant (icon url) or empty it (null). */
    fill(icon: string | null, name?: string): void;
    /** The landing flash — call when something seats. */
    flash(): void;
}
/** A painted seat: recessed well + its button chip pinned below. */
export declare function socket(opts?: {
    action?: ActionId;
    label?: string;
    size?: string;
}): Socket;
/** One warm line + an emblem where a blank would have been. */
export declare function emptyState(line: string, icon?: string): HTMLElement;
export interface InspectorData {
    icon?: string;
    name: string;
    kicker?: string;
    /** Small seal nodes set beside the name (rank seals, tier marks). */
    seals?: HTMLElement[];
    /** Stat runes: label + value pairs told as plaques. */
    stats?: Array<{
        label: string;
        value: string;
        tone?: string;
    }>;
    /** One line of meaning. */
    story?: string;
    /** Verb buttons the caller wires (bigButton output). */
    actions?: HTMLElement[];
}
export interface Inspector {
    root: HTMLElement;
    set(data: InspectorData | null): void;
}
/** The fixed-anatomy detail card. Renders on focus, never travels. */
export declare function inspector(): Inspector;
//# sourceMappingURL=plates.d.ts.map