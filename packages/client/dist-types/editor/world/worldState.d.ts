import type { GeographyDef } from '@arx/content';
import type { MapListEntry, WorldCell, WorldSnapshot } from '../api.js';
/**
 * THE WORLD DOCUMENT — the World view's state: the geography DRAFT
 * (the plan being edited), the frontier ledger as the server tells
 * it, and the view/tool state around them. Same observable law as
 * EditorState: plain fields, one changed() fan-out, no framework.
 *
 * The draft is the SINGLE working copy: every edit mutates `geo`
 * through beginOp (snapshot undo — the whole plan is a few KB, so
 * world history is snapshot-based where zone history is cell-op
 * based) and the view previews it through the editor bundle's OWN
 * live geography registry (replaceGeography + the real worldgen).
 * Save PUTs the draft; the server then regenerates the true world.
 */
export type WorldTool = 'select' | 'route' | 'trail' | 'site' | 'anchor' | 'planned';
export type WorldSel = {
    kind: 'waypoint';
    route: string;
    idx: number;
} | {
    kind: 'route';
    route: string;
} | {
    kind: 'site';
    id: string;
} | {
    kind: 'anchor';
    idx: number;
} | {
    kind: 'planned';
    id: string;
} | {
    kind: 'zone';
    id: string;
} | {
    kind: 'cell';
    cx: number;
    cy: number;
};
export declare function sameSel(a: WorldSel | null, b: WorldSel | null): boolean;
export declare class WorldState {
    /** The geography draft — null until the first /dev/world read. */
    geo: GeographyDef | null;
    /** JSON of the last server-acknowledged plan (dirty baseline). */
    private savedJson;
    seed: number;
    poiCell: number;
    cells: WorldCell[];
    /** THE LIVING STATE (Phase 6): credits owed, calm windows, claimed yards. */
    credits: number;
    calm: WorldSnapshot['calm'];
    claimRings: WorldSnapshot['claimRings'];
    zones: MapListEntry[];
    poiDefs: WorldSnapshot['poiDefs'];
    /** Server-side advisory warnings from the last read/save. */
    warnings: string[];
    /** The doc diverges from the shipped plan (revert offered). */
    edited: boolean;
    /** True while /dev/world has never answered (offline studio). */
    offline: boolean;
    tool: WorldTool;
    sel: WorldSel | null;
    hover: WorldSel | null;
    /** World-tile under the cursor (statusbar + tools). */
    hoverTile: {
        x: number;
        y: number;
    } | null;
    /** A route being laid (route/trail tool): waypoints so far. */
    routeDraft: {
        kind: 'road' | 'trail';
        pts: Array<{
            x: number;
            y: number;
        }>;
    } | null;
    /** Overlay toggles — what the world wears. */
    readonly show: {
        zones: boolean;
        roads: boolean;
        sites: boolean;
        anchors: boolean;
        cells: boolean;
        danger: boolean;
        grid: boolean;
        /** Claimed-hearth yards — the exclusion mask, drawn honest. */
        rings: boolean;
        /** The political map (factions Phase 6) — marches and counters. */
        standing: boolean;
        /** THE COUNTRY wash (lived-in-land Phase 5/6) — whose land is whose. */
        territory: boolean;
        /** THE SMALL FINDS pips — the texture layer, Studio-eyes only. */
        finds: boolean;
    };
    /**
     * THE STANDING LENS's truth (factions Phase 6): the live political
     * ledger, the marches radius, and every actor's live post — fetched
     * beside the world snapshot, absent until the first read lands.
     */
    factions: import('@arx/content').FactionsDef | null;
    marchTiles: number;
    actorSites: Array<{
        actor: string;
        x: number;
        y: number;
    }>;
    /** THE ONE ATLAS (Phase 6): the countries the territory wash paints. */
    families: string[];
    private readonly undoStack;
    private readonly redoStack;
    private static readonly UNDO_CAP;
    private readonly listeners;
    onChange(fn: () => void): void;
    changed(): void;
    get dirty(): boolean;
    /** Adopt a fresh server snapshot (open/boot/save-ack/reload). */
    adopt(snap: WorldSnapshot, opts?: {
        keepDraft?: boolean;
    }): void;
    /** Mark the current draft as the saved truth (after a PUT lands). */
    markSaved(warnings: string[]): void;
    /**
     * Snapshot the plan before a mutation — ONE call per user gesture
     * (a whole waypoint drag is one op; the caller invokes this on
     * gesture start, not per mousemove).
     */
    beginOp(label: string): void;
    undo(): string | null;
    redo(): string | null;
    get canUndo(): boolean;
    get canRedo(): boolean;
    /** The zone list rides /dev/maps — the Open browser's same truth. */
    setZones(list: MapListEntry[]): void;
    /** The ledger row for a macro-cell, if the frontier decided it. */
    cellAt(cx: number, cy: number): WorldCell | undefined;
}
//# sourceMappingURL=worldState.d.ts.map