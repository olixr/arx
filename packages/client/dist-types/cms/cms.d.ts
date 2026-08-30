import type { GrowthDef, NodeDef, DialogueDef, FactionsDef, FrontierDef, LootTableDef, MinorDef, StrongholdDef, PrefabJson, NpcActorDef, NpcDef, PoiDef, TriggerDef, VoiceDoc } from '@arx/content';
import { type VoiceLedger, type TriggerRow, type Editable, type ItemRow, type SpawnSites, type ZoneRect } from './api.js';
/**
 * Arx Content Studio — the CMS over the running game's DB-first
 * content: bestiary archetypes, loot tables, and placed-actor
 * identities, with the item catalog as the reference shelf. Every
 * save validates on the server, lands in the database, hot-swaps the
 * live registry, and retires standing bodies so the world plays the
 * new numbers within a tick.
 */
export type Section = 'npcs' | 'loot' | 'actors' | 'dialogues' | 'pois' | 'minors' | 'strongholds' | 'resources' | 'frontier' | 'factions' | 'voice' | 'triggers' | 'items';
export interface CmsState {
    section: Section;
    selectedId: string | null;
    query: string;
    npcs: Array<Editable<NpcDef>>;
    loot: Array<Editable<LootTableDef>>;
    actors: Array<Editable<NpcActorDef>>;
    dialogues: Array<Editable<DialogueDef>>;
    pois: Array<Editable<PoiDef>>;
    /** THE SMALL FINDS roster (lived-in-land Phase 6). */
    minors: Array<Editable<MinorDef>>;
    /** THE FOUNDRY's layout repository (strongholds Phase 1). */
    strongholds: Array<Editable<StrongholdDef>>;
    /** Families the generator can build for — the roll form's menu. */
    strongholdFamilies: string[];
    /** Rolled-but-unsaved layout prefabs, by def id (banked on save). */
    strongholdDrafts: Record<string, PrefabJson>;
    /** THE ROSTER SPEAKS: the gatherable-node roster (second-growth Ph5). */
    nodes: Array<Editable<NodeDef>>;
    /** The land's clock — the growth dial doc riding the Resources bench. */
    growth: {
        def: GrowthDef;
        edited: boolean;
    } | null;
    /** The live POI prefab library's ids (pool pickers + validation). */
    poiPrefabIds: string[];
    /** The living frontier's dial table — a singleton doc (Phase 6). */
    frontier: {
        def: FrontierDef;
        edited: boolean;
    } | null;
    /** The faction ledger — a singleton doc (factions Phase 6). */
    factions: {
        def: FactionsDef;
        edited: boolean;
    } | null;
    /** The spoken world: clips, banks, dials (voiceover Phase 5). */
    voice: VoiceLedger | null;
    /** THE WATCHFUL GROUND: the trigger roster (docs/triggers-plan.md). */
    triggers: TriggerRow[];
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
/**
 * Zone whose rect contains a world tile, for "open in Map Studio".
 * THE WORLDS APART: rects legitimately overlap across planes (the
 * Undercroft lies over open surface wilderness), so containment
 * filters by plane. Callers without plane context read the surface —
 * spawn-site rows carry no plane on the wire today.
 */
export declare function zoneAt(x: number, y: number, plane?: string): ZoneRect | null;
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
    saveMinorDef(def: MinorDef): Promise<void>;
    revertMinorDef(id: string): Promise<void>;
    saveStrongholdDef(def: StrongholdDef): Promise<void>;
    revertStrongholdDef(id: string): Promise<void>;
    saveNodeDef(def: NodeDef): Promise<void>;
    revertNodeDef(id: string): Promise<void>;
    saveGrowthDef(def: GrowthDef): Promise<void>;
    revertGrowthDef(): Promise<void>;
    saveFrontierDef(def: FrontierDef): Promise<void>;
    revertFrontierDef(): Promise<void>;
    saveFactionsDef(def: FactionsDef): Promise<void>;
    revertFactionsDef(): Promise<void>;
    saveVoiceDialsDef(def: VoiceDoc): Promise<void>;
    revertVoiceDialsDef(): Promise<void>;
    saveTriggerDef(def: TriggerDef): Promise<void>;
    revertTriggerDef(id: string): Promise<void>;
    saveDialogueDef(def: DialogueDef): Promise<void>;
    revertDialogueDef(id: string): Promise<void>;
    saveActorDef(def: NpcActorDef): Promise<void>;
    revertActorDef(slug: string): Promise<void>;
};
//# sourceMappingURL=cms.d.ts.map