import type { Sfx } from '../audio/sfx.js';
/**
 * THE DIALOGUE CINEMA — the screen-space half of a conversation (the
 * renderer plays the world half: the camera glides to frame both
 * speakers at a breathing close-up).
 *
 * Anatomy: letterbox bars ease in top and bottom, a masked backdrop
 * blur softens the world's edges while the speakers stay sharp, and
 * a lower-third stage rises — a brass name banner over a parchment
 * speech sheet. NPC beats speak from the parchment in ink; player
 * beats flip the sheet to the iron tray ("You" takes the banner).
 *
 * THE TYPEWRITER LAW: text is never pasted, it arrives — per-glyph
 * reveal at reading pace with punctuation holding a breath, a quill
 * scratch at the edge of hearing. The FIRST advance press completes
 * the line instantly (readers are never held hostage); the next one
 * turns the page. Questions slide their choice plates in only after
 * the line lands, and are answered — never skipped past.
 *
 * The server owns the conversation: this class renders exactly what
 * it was sent and reports back (advance / choose index / excuse me).
 */
interface CinemaNode {
    speaker: 'npc' | 'player';
    text: string;
    choices?: string[];
    last?: boolean;
}
export declare class DialogueCinema {
    private readonly sfx;
    private readonly hooks;
    open: boolean;
    private readonly root;
    private readonly stage;
    private readonly nameEl;
    private readonly titleEl;
    private readonly textEl;
    private readonly moreEl;
    private readonly choicesEl;
    private npcName;
    private npcTitle;
    private node;
    /** Typewriter state: glyph spans still dark, and the rAF clock. */
    private spans;
    private revealed;
    private typing;
    private raf;
    private lastT;
    private holdSec;
    private scratchGap;
    private choicesShown;
    private selIdx;
    private closeTimer;
    constructor(sfx: Sfx, hooks: {
        onAdvance: () => void;
        onChoose: (idx: number) => void;
        onEnd: () => void;
    });
    /** Raise the frame. Beats arrive separately via showNode. */
    show(o: {
        name: string;
        title?: string;
    }): void;
    /** Lower the frame (server said the conversation is over). */
    close(): void;
    /** One beat of conversation: banner, sheet, typewriter, question. */
    showNode(node: CinemaNode): void;
    private readonly tick;
    private stopReveal;
    /** The line has fully landed: invite the answer or the page-turn. */
    private finishReveal;
    private buildChoices;
    private select;
    private choose;
    /**
     * The one verb the player needs: finish the line if it's still
     * arriving, otherwise turn the page (questions wait for an answer).
     */
    advance(): void;
    /** Keyboard driving; returns true when the key was consumed. */
    handleKey(code: string): boolean;
}
export {};
//# sourceMappingURL=dialogueCinema.d.ts.map