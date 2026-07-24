import type { ZoneJson } from '@devcraft/content';
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
//# sourceMappingURL=api.d.ts.map