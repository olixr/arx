import type { LootTableDef, NpcActorDef, NpcDef, PoiDef, PrefabJson, ZoneJson } from '@devcraft/content';
/** Content Studio's wire to the running server's /dev/content API. */
export interface Editable<T> {
    def: T;
    /** Diverged from (or never had) an authored code twin. */
    edited: boolean;
    /** An authored twin exists — revert restores it; else delete removes. */
    authored: boolean;
}
export interface ItemRow {
    id: string;
    name: string;
    value: number;
    stackable: boolean;
    slot: string | null;
    desc: string | null;
}
export interface SpawnSites {
    npcs: Array<{
        npc: string;
        x: number;
        y: number;
    }>;
    actors: Array<{
        actor: string;
        x: number;
        y: number;
    }>;
}
export declare function listNpcs(): Promise<Array<Editable<NpcDef>>>;
export declare function saveNpc(def: NpcDef): Promise<void>;
export declare function revertNpc(id: string): Promise<{
    outcome: string;
}>;
export declare function listLoot(): Promise<Array<Editable<LootTableDef>>>;
export declare function saveLoot(def: LootTableDef): Promise<void>;
export declare function revertLoot(id: string): Promise<{
    outcome: string;
}>;
export declare function listActors(): Promise<{
    actors: Array<Editable<NpcActorDef>>;
    errors: string[];
}>;
export declare function saveActor(def: NpcActorDef): Promise<void>;
export declare function revertActor(slug: string): Promise<{
    outcome: string;
}>;
export declare function listPois(): Promise<{
    pois: Array<Editable<PoiDef>>;
    prefabIds: string[];
}>;
export declare function savePoi(def: PoiDef): Promise<void>;
export declare function revertPoi(id: string): Promise<{
    outcome: string;
}>;
export interface PoiSimStats {
    evaluated: number;
    settledSkipped: number;
    sites: number;
    empty: number;
    byDef: Record<string, {
        count: number;
        tiers: Record<number, number>;
        prefabs: Record<string, number>;
    }>;
}
/** The observed panel: the server runs the REAL scaffold over a fresh scan. */
export declare function surveyFrontier(draft?: PoiDef, cells?: number): Promise<PoiSimStats>;
export interface PoiStage {
    site: {
        cellX: number;
        cellY: number;
        tier: number;
        defId: string;
        prefabId: string;
        anchorX: number;
        anchorY: number;
    };
    zone: ZoneJson;
}
/** The stage: a real composed site at the requested tier (draft included). */
export declare function stagePoi(args: {
    id?: string;
    draft?: PoiDef;
    tier: number;
    prefab?: string;
}): Promise<PoiStage>;
export declare function fetchPrefab(id: string): Promise<PrefabJson>;
export declare function listItems(): Promise<ItemRow[]>;
export declare function fetchSpawnSites(): Promise<SpawnSites>;
export interface ZoneRect {
    id: string;
    name: string;
    origin: {
        x: number;
        y: number;
    };
    width: number;
    height: number;
}
export declare function listZoneRects(): Promise<ZoneRect[]>;
//# sourceMappingURL=api.d.ts.map