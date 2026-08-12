/**
 * THE KEYBOARD — one window keydown door for the whole studio. Tool
 * keys come from the command registry (single source); the bespoke
 * gestures (Esc cascade, Space pan, road Enter, brackets, digits) are
 * the hands' grammar and live here. ⌘K opens the command lens from
 * anywhere, both modes.
 */
import type { WorldMode } from '../editor/world/worldMode.js';
import { type StudioMode } from './commands.js';
import type { CommandPalette } from './cmdk.js';
import type { GhostWalk } from './ghostWalk.js';
import type { EditorOps } from './ops.js';
export interface KeysDeps {
    ops: EditorOps;
    world: WorldMode;
    cmdk: CommandPalette;
    ghost: GhostWalk;
    getMode: () => StudioMode;
    setMode: (m: StudioMode) => void;
    save: () => void;
    open: () => void;
    zoomFit: () => void;
    focusPaletteSearch: () => void;
}
export interface KeysHandle {
    isSpaceHeld: () => boolean;
}
export declare function installKeys(deps: KeysDeps): KeysHandle;
//# sourceMappingURL=keys.d.ts.map