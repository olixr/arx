import type { GeographyDef, PackedZoneEdgeProfile, PrefabJson, ZoneJson } from '@arx/content';
/**
 * The editor's wire to the game server's dev maps API (/dev/maps on
 * the game port, proxied by Vite in dev). Every save lands on disk
 * AND hot-reloads into the running world, so a connected game client
 * sees the edit within a tick.
 */
export interface MapListEntry {
    id: string;
    name: string;
    width: number;
    height: number;
    origin: {
        x: number;
        y: number;
    };
    spawn: {
        x: number;
        y: number;
    } | null;
    builtin: boolean;
    hasFile: boolean;
    /** A composed frontier site (poi:cx,cy) — read-only until adopted. */
    poi: boolean;
    actorSpawns: number;
    npcSpawns: number;
    portals: number;
    /**
     * Client-side synthetic: a ledger-decided site nobody has walked
     * near yet — no zone stands, but opening it will compose one.
     */
    dormant?: boolean;
}
export interface MapList {
    zones: MapListEntry[];
    orphans: string[];
}
export declare function listMaps(): Promise<MapList>;
export declare function fetchZone(id: string): Promise<ZoneJson>;
export declare function saveZone(json: ZoneJson): Promise<void>;
export declare function deleteZone(id: string): Promise<{
    reverted?: string;
    unloaded?: boolean;
}>;
/** The running server's pick lists — the same truth it spawns from. */
export interface RegistrySnapshot {
    npcs: Array<{
        id: string;
        name: string;
        level: number;
    }>;
    actors: Array<{
        id: string;
        name: string;
        title?: string;
    }>;
    routines: string[];
}
export declare function fetchRegistry(): Promise<RegistrySnapshot>;
export interface PrefabListEntry {
    id: string;
    name: string;
    width: number;
    height: number;
    portals: number;
    spawns: number;
    actorSpawns: number;
}
export declare function listPrefabs(): Promise<PrefabListEntry[]>;
export declare function fetchPrefab(id: string): Promise<PrefabJson>;
export declare function savePrefab(json: PrefabJson): Promise<void>;
export declare function deletePrefab(id: string): Promise<void>;
/** A decided site exactly as the world_pois ledger keeps it. */
export interface PoiSiteWire {
    cellX: number;
    cellY: number;
    epoch: number;
    tier: number;
    defId: string;
    prefabId: string;
    anchorX: number;
    anchorY: number;
}
/** One POI ledger row with its live/authored state, as /dev/world tells it. */
export interface WorldCell {
    cellX: number;
    cellY: number;
    epoch: number;
    clearedAt: number | null;
    /** THE LIVING FRONTIER's clocks and ties (Phases 1-5). */
    emberUntil: number | null;
    fallowUntil: number | null;
    stage: number;
    originCell: string | null;
    site: PoiSiteWire | null;
    defName: string | null;
    zoneId: string | null;
    authoredId: string | null;
}
export interface WorldSnapshot {
    seed: number;
    poiCell: number;
    cells: WorldCell[];
    /** THE LIVING STATE (Phase 6): the whole weather, one read. */
    credits: number;
    calm: Array<{
        cellX: number;
        cellY: number;
        calmUntil: number;
    }>;
    claimRings: Array<{
        x: number;
        y: number;
        r: number;
    }>;
    geography: GeographyDef;
    geographyEdited: boolean;
    warnings: string[];
    /** Packed edge-harmony profiles — mirrored into the editor's registry. */
    edgeProfiles: PackedZoneEdgeProfile[];
    poiDefs: Array<{
        id: string;
        name: string;
        weight: number;
        tiers: [number, number];
        haven: number | null;
    }>;
}
export declare function fetchWorld(): Promise<WorldSnapshot>;
export interface GeographySaveResult {
    ok: boolean;
    swept?: {
        evicted: number;
        orphaned: number;
    };
    warnings?: string[];
}
export declare function saveGeography(def: GeographyDef): Promise<GeographySaveResult>;
export declare function revertGeography(): Promise<GeographySaveResult>;
export declare function poiCellAction(cellX: number, cellY: number, action: 'reroll' | 'dissolve' | 'force' | 'stage' | 'ember', defId?: string, stage?: number): Promise<{
    ok: boolean;
    site: PoiSiteWire | null;
}>;
export declare function adoptPoiCell(cellX: number, cellY: number, id: string, name?: string): Promise<{
    ok: boolean;
    id: string;
}>;
//# sourceMappingURL=api.d.ts.map