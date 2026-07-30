import type { DialogueDef, FactionsDef, FrontierDef, LootTableDef, NpcActorDef, NpcDef, PoiDef, PrefabJson, VoiceBankDef, VoiceClipDef, VoiceDoc, ZoneJson } from '@arx/content';
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
/** The weather is a singleton: one doc, one 'world' id, two hashes. */
export declare function getFrontier(): Promise<{
    def: FrontierDef;
    edited: boolean;
}>;
export declare function saveFrontier(def: FrontierDef): Promise<void>;
export declare function revertFrontier(): Promise<{
    outcome: string;
}>;
/** The names are a singleton too: one doc, one 'world' id, two hashes. */
export declare function getFactions(): Promise<{
    def: FactionsDef;
    edited: boolean;
}>;
export declare function saveFactions(def: FactionsDef): Promise<void>;
export declare function revertFactions(): Promise<{
    outcome: string;
}>;
/** One GET carries the whole spoken world: clips, banks, dials. */
export interface VoiceLedger {
    clips: Array<{
        def: VoiceClipDef;
        edited: boolean;
        url: string;
    }>;
    banks: VoiceBankDef[];
    dials: {
        def: VoiceDoc;
        edited: boolean;
    };
    errors: string[];
}
export declare function getVoice(): Promise<VoiceLedger>;
/** Upload/replace (with dataB64) or metadata-only edit (without). */
export interface VoiceClipUpload {
    id: string;
    ext?: string;
    durMs: number;
    transcript?: string;
    actor?: string;
    tags?: string[];
    dataB64?: string;
}
export declare function saveVoiceClip(upload: VoiceClipUpload): Promise<{
    def: VoiceClipDef;
    url: string;
}>;
export declare function deleteVoiceClip(id: string): Promise<void>;
export declare function saveVoiceBank(def: VoiceBankDef): Promise<void>;
export declare function deleteVoiceBank(kind: string, id: string): Promise<void>;
/** The dials are a singleton: one doc, one 'world' id, two hashes. */
export declare function saveVoiceDials(def: VoiceDoc): Promise<void>;
export declare function revertVoiceDials(): Promise<{
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
    stage?: number;
}): Promise<PoiStage>;
export declare function fetchPrefab(id: string): Promise<PrefabJson>;
export declare function listDialogues(): Promise<{
    dialogues: Array<Editable<DialogueDef>>;
    errors: string[];
}>;
export declare function saveDialogue(def: DialogueDef): Promise<void>;
export declare function revertDialogue(id: string): Promise<{
    outcome: string;
}>;
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