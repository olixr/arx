import type { GeographyDef } from '@devcraft/content';
import type { WorldSel, WorldState, WorldTool } from './worldState.js';
/**
 * THE WORLD PANEL — the sidebar while the studio holds the whole
 * plan: a live inspector for the selected thing, the plan's ledgers
 * (routes / landmarks / hearths / planned ground), the frontier's
 * decided cells, and the overlay lenses. Pure DOM assembly under the
 * panels.ts law; the world controller supplies every action.
 */
export interface WorldPanelActions {
    setTool(tool: WorldTool): void;
    select(sel: WorldSel | null): void;
    centerOn(sel: WorldSel): void;
    /** Mutate the draft inside one undoable op + preview refresh. */
    edit(label: string, mutate: (geo: GeographyDef) => void, opts?: {
        terrain?: boolean;
        danger?: boolean;
    }): void;
    removeSelected(): void;
    save(): void;
    revert(): void;
    openZone(id: string): void;
    newZoneAt(rectId: string): void;
    cellAction(cx: number, cy: number, action: 'reroll' | 'dissolve' | 'force', defId?: string): void;
    adoptCell(cx: number, cy: number): void;
    openCellSite(cx: number, cy: number): void;
    toggleShow(key: keyof WorldState['show']): void;
}
export interface WorldPanelDeps {
    ws: WorldState;
    actions: WorldPanelActions;
}
/** Auto-slug helper for new ids born in the panel. */
export declare function freshId(base: string, taken: (id: string) => boolean): string;
export declare function buildWorldPanel(root: HTMLElement, deps: WorldPanelDeps): void;
//# sourceMappingURL=worldPanel.d.ts.map