import { type SignInfo } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
export declare class SignHud {
    private readonly game;
    private readonly plaque;
    private readonly panel;
    private readonly body;
    /** Which board the plaque is currently showing (key), if any. */
    private shownKey;
    /** When the current plaque first appeared — the dwell clock's zero. */
    private shownAt;
    /** True once the dwell elapsed: stays retired until the player leaves. */
    private retired;
    /** The board the sheet is open on. */
    private openAt;
    private editing;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    /**
     * Per-frame: show the plaque over `sign` at screen point (sx, sy), or
     * pass null when no board is near. The caller owns proximity — this
     * owns the fade, the dwell, and the re-arm.
     */
    update(sign: SignInfo | null, sx?: number, sy?: number): void;
    private paintPlaque;
    /** Open the full read (and, on your own board, the pen). */
    open(tx: number, ty: number): void;
    close(): void;
    private focusFirstField;
    private render;
    private renderRead;
    private renderEditor;
    /** A sign we're showing was rewritten (by us or anyone) — repaint. */
    onSignChanged(tx: number, ty: number): void;
    /** True while a text field owns the keyboard (movement must not eat keys). */
    get isTyping(): boolean;
}
//# sourceMappingURL=signs.d.ts.map