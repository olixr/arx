import { type ZoneDef } from '@devcraft/content';
import type { PrefabListEntry, RegistrySnapshot } from './api.js';
import type { EditorState, PlacementRef } from './state.js';
/**
 * The sidebar's Structures and Placements panels. Everything here is
 * pure DOM assembly — the editor supplies the actions, the panels
 * supply the affordances: previews you can read, rows you can focus,
 * and an inspector that edits the selected placement in place.
 */
export interface PanelActions {
    armTemplate(id: string): void;
    armPrefab(id: string): void;
    saveSelectionAsPrefab(): void;
    removePrefab(id: string): void;
    refreshPrefabs(): void;
    selectPlacement(ref: PlacementRef | null): void;
    focusPlacement(ref: PlacementRef): void;
    removePlacement(ref: PlacementRef): void;
    /** Mutate the selected placement inside one undoable operation. */
    editPlacement(ref: PlacementRef, label: string, mutate: (zone: ZoneDef) => void): void;
}
export interface PanelDeps {
    state: EditorState;
    registry: RegistrySnapshot;
    prefabs: PrefabListEntry[];
    prefabsOnline: boolean;
    /** Real-art preview for a prefab, or null while it loads. */
    prefabPreview: (id: string) => HTMLCanvasElement | null;
    actions: PanelActions;
}
export declare function buildStructuresPanel(root: HTMLElement, deps: PanelDeps): void;
export declare function buildPlacementsPanel(root: HTMLElement, deps: PanelDeps): void;
//# sourceMappingURL=panels.d.ts.map