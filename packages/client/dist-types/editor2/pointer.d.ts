/**
 * THE POINTER MACHINE — every zone-canvas gesture, ported from v1
 * verbatim in behavior: stroke, shape, marquee, move/copy, placement
 * drag, cluster resize, pan, paste, stamps. The machine holds gesture
 * state only; every mutation goes through EditorOps.
 */
import type { EditorOps } from './ops.js';
export interface PointerDeps {
    /** Both zone canvases — draft AND stage — hear the same machine. */
    canvases: HTMLCanvasElement[];
    ops: EditorOps;
    isActive: () => boolean;
    isSpaceHeld: () => boolean;
    updateStatus: () => void;
    /** The status bar's hint line (the stair law speaks through it). */
    setHint: (text: string) => void;
}
export declare function installPointer(deps: PointerDeps): void;
//# sourceMappingURL=pointer.d.ts.map