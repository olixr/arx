import type { DialogueDef, FrontierDef, LootTableDef, NpcActorDef, NpcDef, PoiDef } from '@arx/content';
import { type Editable, type ItemRow, type SpawnSites, type ZoneRect } from './api.js';
/**
 * Arx Content Studio — the CMS over the running game's DB-first
 * content: bestiary archetypes, loot tables, and placed-actor
 * identities, with the item catalog as the reference shelf. Every
 * save validates on the server, lands in the database, hot-swaps the
 * live registry, and retires standing bodies so the world plays the
 * new numbers within a tick.
 */
export type Section = 'npcs' | 'loot' | 'actors' | 'dialogues' | 'pois' | 'frontier' | 'items';
export interface CmsState {
    section: Section;
    selectedId: string | null;
    query: string;
    npcs: Array<Editable<NpcDef>>;
    loot: Array<Editable<LootTableDef>>;
    actors: Array<Editable<NpcActorDef>>;
    dialogues: Array<Editable<DialogueDef>>;
    pois: Array<Editable<PoiDef>>;
    /** The live POI prefab library's ids (pool pickers + validation). */
    poiPrefabIds: string[];
    /** The living frontier's dial table — a singleton doc (Phase 6). */
    frontier: {
        def: FrontierDef;
        edited: boolean;
    } | null;
    items: ItemRow[];
    sites: SpawnSites;
    zones: ZoneRect[];
    online: boolean;
    /** Unsaved edits in the open editor. */
    dirty: boolean;
}
export declare const state: CmsState;
export declare function toast(text: string, ms?: number, kind?: 'info' | 'success' | 'error'): void;
export declare function setHint(text: string): void;
export declare function setSaveState(text: string): void;
export declare function reloadSection(section: Section): Promise<void>;
export declare function refreshSites(): Promise<void>;
/** Zone whose rect contains a world tile, for "open in Map Studio". */
export declare function zoneAt(x: number, y: number): ZoneRect | null;
export declare function setSection(section: Section, selectedId?: string | null): void;
export declare function select(id: string | null): void;
export declare function markDirty(): void;
export declare function renderAll(): void;
export declare const persistence: {
    saveNpcDef(def: NpcDef): Promise<void>;
    revertNpcDef(id: string): Promise<void>;
    saveLootDef(def: LootTableDef): Promise<void>;
    revertLootDef(id: string): Promise<void>;
    savePoiDef(def: PoiDef): Promise<void>;
    revertPoiDef(id: string): Promise<void>;
    saveFrontierDef(def: FrontierDef): Promise<void>;
    revertFrontierDef(): Promise<void>;
    saveDialogueDef(def: DialogueDef): Promise<void>;
    revertDialogueDef(id: string): Promise<void>;
    saveActorDef(def: NpcActorDef): Promise<void>;
    revertActorDef(slug: string): Promise<void>;
};
//# sourceMappingURL=cms.d.ts.map