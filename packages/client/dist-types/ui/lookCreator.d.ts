import { type Look } from '@devcraft/shared';
/**
 * Character creation: the RuneScape mirror. A live preview of the
 * actual in-game rig (same drawHumanoid, poster scale) turns slowly
 * through its facings while the player picks skin, hair, beard, and
 * base cloth dyes from the shared palettes. Confirm sends the look to
 * the server, where it locks — the client never enforces anything.
 *
 * Controls are plain [data-nav] elements, so the gamepad's spatial
 * focus walks them like any other panel; the panel is modal to the
 * navigator while open (see UiNav.navigables).
 */
export declare class LookCreator {
    private readonly onConfirm;
    private readonly panel;
    private readonly preview;
    private look;
    private dirIx;
    private spinTimer;
    open: boolean;
    private static readonly DIRS;
    constructor(onConfirm: (look: Look) => void);
    show(): void;
    hide(): void;
    /** Rebuild the whole control column (small DOM, clarity wins). */
    private build;
    private swatchRow;
    private stepperRow;
    private drawPreview;
}
//# sourceMappingURL=lookCreator.d.ts.map