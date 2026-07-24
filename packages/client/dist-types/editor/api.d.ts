import type { PrefabJson, ZoneJson } from '@devcraft/content';
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
    actorSpawns: number;
    npcSpawns: number;
    portals: number;
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
//# sourceMappingURL=api.d.ts.map