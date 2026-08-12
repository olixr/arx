/**
 * THE COMMAND REGISTRY — the single source of truth for every verb the
 * studio knows. The tool rail, the keyboard, the ⌘K palette, and the
 * help sheet all read THIS; a verb that exists anywhere else is a bug.
 * (Map Studio v2 plan §3.3 — Phase 1.)
 */
import type { SidebarTab, ToolId } from '../editor/state.js';
import type { WorldTool } from '../editor/world/worldState.js';
export type StudioMode = 'world' | 'zone';
export interface ToolSpec {
    id: ToolId;
    name: string;
    key: string;
    code: string;
    hint: string;
    icon: string;
    tab?: SidebarTab;
}
export declare const TOOL_GROUPS: ReadonlyArray<{
    caption: string;
    tools: ToolSpec[];
}>;
export declare const TOOL_SPECS: ReadonlyMap<ToolId, ToolSpec>;
export declare const TOOL_BY_CODE: ReadonlyMap<string, ToolId>;
export interface WorldToolSpec {
    id: WorldTool;
    icon: string;
    name: string;
    key: string;
    hint: string;
}
export declare const WORLD_TOOLS: ReadonlyArray<WorldToolSpec>;
export interface Command {
    id: string;
    title: string;
    group: string;
    /** Display shortcut, key-cap formatted ("⌘S", "B"). */
    keyLabel?: string;
    icon?: string;
    /** Which studio view the command belongs to; absent = both. */
    mode?: StudioMode;
    hint?: string;
    run: () => void;
}
export interface CommandDeps {
    setTool(tool: ToolId): void;
    setWorldTool(tool: WorldTool): void;
    setLayer(layer: 'ground' | 'detail' | 'elev'): void;
    setTab(tab: SidebarTab): void;
    setMode(mode: StudioMode): void;
    newZone(): void;
    open(): void;
    save(): void;
    validate(): void;
    importFile(): void;
    exportFile(): void;
    help(): void;
    undo(): void;
    redo(): void;
    zoomIn(): void;
    zoomOut(): void;
    zoomFit(): void;
    zoomActual(): void;
    toggleView(key: 'showGrid' | 'showChunkGrid' | 'showMarkers' | 'showElev'): void;
    toggleDraftView(): void;
    toggleLiving(): void;
    toggleLens(id: 'shelf' | 'interiors' | 'reach' | 'edges' | 'growth' | 'factions' | 'signs'): void;
    setClock(hours: number): void;
    toggleInstrument(id: 'minimap' | 'zoom' | 'clock'): void;
    toggleDockPanel(id: 'tool' | 'lib'): void;
    zoneProperties(): void;
    saveSelectionAsPrefab(): void;
    ghostWalk(): void;
    openContentStudio(): void;
}
/** The full static registry. Dynamic entries (zones) come from providers. */
export declare function buildCommands(d: CommandDeps): Command[];
//# sourceMappingURL=commands.d.ts.map