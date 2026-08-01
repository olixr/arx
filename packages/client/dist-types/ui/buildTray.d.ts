/**
 * THE BUILDER'S TRAY — the mode's face. While build mode is on, this
 * strip pins over the world and answers the three questions the old
 * mode never did: what am I placing, can I still afford it, and which
 * way is it turned. A recents row keeps the last few pieces one click
 * away, so switching floor→wall→doorway never means reopening the
 * palette. When the demolish modifier is held it wears the armed
 * color and says so.
 */
export interface BuildTrayState {
    /** Selected buildable id. */
    id: string;
    /** Dial reading for orientable pieces — null hides the line. */
    orient: string | null;
    /** Live material story, pack-side. */
    mats: Array<{
        item: string;
        have: number;
        need: number;
    }>;
    /** The demolish modifier is held right now. */
    armed: boolean;
    /** Recently used pieces (excluding the current one), most recent first. */
    recents: readonly string[];
    /** THE DYE LAW's dial: chosen index for a dyeable piece, null = not dyeable. */
    dye: number | null;
}
export declare class BuildTray {
    private readonly onPick;
    private readonly onDye;
    private readonly el;
    private sig;
    constructor(onPick: (id: string) => void, onDye: (dye: number) => void);
    hide(): void;
    /** Frame-safe: rebuilds the DOM only when the state actually moved. */
    update(state: BuildTrayState): void;
}
//# sourceMappingURL=buildTray.d.ts.map