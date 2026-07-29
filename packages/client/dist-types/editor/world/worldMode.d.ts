import { type GeographyDef } from '@arx/content';
import { WorldState, type WorldSel, type WorldTool } from './worldState.js';
import { WorldView } from './worldView.js';
/**
 * THE WORLD CONTROLLER — everything the World view does: the pointer
 * machine over the world canvas, the tools that lay roads and pin
 * landmarks, the save that regenerates the running world, and the
 * frontier administration. The editor shell only mounts it, routes
 * keys to it while the world is up, and lends it toast/modal/status.
 *
 * THE DRAFT-PREVIEW LAW: the editor bundle carries its own live
 * geography registry, so every draft edit lands in replaceGeography
 * HERE and the canvas re-carves through the REAL worldgen — the road
 * you drag previews exactly the cut the server will make. Nothing
 * touches the server until Save.
 */
export interface WorldModeDeps {
    canvas: HTMLCanvasElement;
    panelHost: HTMLElement;
    toast(text: string, ms?: number, kind?: 'info' | 'success' | 'error'): void;
    /** Open a zone in the zone editor (switches mode). */
    openZone(id: string): void;
    /** Create a fresh zone at a world rect and open it. */
    newZone(spec: {
        id: string;
        name: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }): void;
    showModal(build: (body: HTMLElement, close: () => void) => void): void;
    setHint(text: string): void;
    setCoords(text: string): void;
    setZoom(text: string): void;
    /** The zone list changed (adopt) — the shell re-reads /dev/maps. */
    refreshMaps(): Promise<void>;
}
export declare class WorldMode {
    private readonly deps;
    readonly ws: WorldState;
    readonly view: WorldView;
    private drag;
    private spaceHeld;
    private booted;
    /** Fit deferred until the canvas has real pixels (it may boot hidden). */
    private needsFit;
    constructor(deps: WorldModeDeps);
    boot(): Promise<void>;
    /** Re-read ledger + zone list (after cell actions / zone saves). */
    refresh(): Promise<void>;
    /** Mirror the server's edge-harmony registry; true when it changed. */
    private edgeProfilesJson;
    private adoptEdgeProfiles;
    /** Whether boot() ever reached the server. */
    get online(): boolean;
    /** One undoable draft mutation + honest preview. */
    edit(label: string, mutate: (geo: GeographyDef) => void, opts?: {
        terrain?: boolean;
        danger?: boolean;
    }): void;
    /** Push the draft into the live registry + invalidate what moved. */
    private preview;
    save(): Promise<void>;
    /** The Validate button's world verse: laws + counsel, no save. */
    validate(): {
        ok: boolean;
        text: string;
    };
    /** Import a local geography JSON as the working draft. */
    importDraft(raw: unknown): void;
    revert(): void;
    cellAction(cx: number, cy: number, action: 'reroll' | 'dissolve' | 'force' | 'stage' | 'ember', defId?: string): Promise<void>;
    adoptCell(cx: number, cy: number): void;
    select(sel: WorldSel | null): void;
    centerOn(sel: WorldSel): void;
    removeSelected(): void;
    private attach;
    private mouse;
    private onDown;
    private armFromPick;
    /** Arm a lazy gesture: beginOp fires on the first real movement. */
    private armGesture;
    private onMove;
    private onUp;
    private onDblClick;
    commitRouteDraft(): void;
    /** Returns true when the key was the world's to spend. */
    keydown(e: KeyboardEvent): boolean;
    keyup(e: KeyboardEvent): void;
    /** The one-cancel-per-press cascade (the Esc law, world verse). */
    escape(): void;
    setTool(tool: WorldTool): void;
    private rebuildPanel;
    private panelActions;
    private syncCoords;
    syncZoom(): void;
    frame(): void;
}
//# sourceMappingURL=worldMode.d.ts.map