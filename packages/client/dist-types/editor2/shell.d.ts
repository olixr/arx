/**
 * THE SHELL — the layout mechanics of the bench: the resizable right
 * dock (Tool over Library, both collapsible, widths and heights
 * persisted per user), the floating instruments (minimap, zoom) that
 * drag and snap to canvas corners, and the mode-driven visibility of
 * every panel. No editor semantics live here.
 */
import type { StudioMode } from './commands.js';
export declare class Shell {
    private collapsed;
    private inst;
    init(): void;
    private initDockWidth;
    private initDockSplit;
    private initCollapse;
    togglePanel(id: 'tool' | 'lib'): void;
    private initInstruments;
    private placeInstrument;
    toggleInstrument(id: 'minimap' | 'zoom' | 'clock'): void;
    /** Flip every mode-owned surface. The composition root owns the rest. */
    setModeDom(mode: StudioMode, tab: 'tiles' | 'structures' | 'placements' | 'people'): void;
    syncLibTabs(tab: 'tiles' | 'structures' | 'placements' | 'people' | null): void;
}
//# sourceMappingURL=shell.d.ts.map