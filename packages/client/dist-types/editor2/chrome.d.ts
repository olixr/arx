/**
 * THE CHROME — the tool rail, the tool options strip, the zone chip,
 * the validation banner, and the status bar. Pure builders over the
 * command registry and editor state; no document verbs live here.
 */
import type { EditorState } from '../editor/state.js';
import type { WorldMode } from '../editor/world/worldMode.js';
import { type StudioMode } from './commands.js';
import type { EditorOps } from './ops.js';
import type { Viewport } from './viewport.js';
export interface ChromeDeps {
    state: EditorState;
    view: Viewport;
    ops: EditorOps;
    world: WorldMode;
    getMode: () => StudioMode;
}
export declare class Chrome {
    private readonly deps;
    constructor(deps: ChromeDeps);
    buildRail(): void;
    buildOptions(): void;
    syncZoneChip(): void;
    setHint(text: string): void;
    setServerStatus(text: string, live?: boolean): void;
    updateStatus(): void;
    showValidation(text: string, ok: boolean): void;
    hideValidation(): void;
}
//# sourceMappingURL=chrome.d.ts.map