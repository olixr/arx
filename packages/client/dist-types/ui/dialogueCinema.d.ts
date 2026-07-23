import type { Sfx } from '../audio/sfx.js';
/**
 * THE DIALOGUE CINEMA — the screen-space half of a conversation (the
 * renderer plays the world half: the camera glides to frame both
 * speakers past the player's zoom ceiling, breathing).
 *
 * Anatomy: letterbox bars ease in top and bottom (the bottom bar
 * carries the key legend), a masked backdrop blur and a warm vignette
 * grade soften the world's edges while the speakers stay sharp, and a
 * lower-third stage rises — a brass name banner over a parchment
 * speech sheet. NPC beats speak from the parchment in ink; player
 * beats flip the sheet to the iron tray ("You" takes the banner with
 * a quick swap flourish).
 *
 * THE TYPEWRITER LAW: text is never pasted, it arrives — per-glyph
 * rise-and-fade at reading pace, punctuation holding a breath, a
 * quill scratch at the edge of hearing. Markup acts: *emphasis*
 * lands warm and bold, _foreboding_ slows the hand and drops the
 * scratch an octave, {item:...} sets the item itself — icon and
 * name — into the sentence as one revealed beat. The FIRST advance
 * press completes the line instantly; the next one turns the page.
 * Questions slide their choice plates in only after the line lands,
 * and are answered — never skipped. Gifts granted by a beat are
 * staged the moment its line completes: a socket chip and a chime.
 *
 * The server owns the conversation: this class renders exactly what
 * it was sent and reports back (advance / choose index / excuse me).
 */
interface CinemaNode {
    speaker: 'npc' | 'player';
    text: string;
    choices?: string[];
    last?: boolean;
    gifts?: Array<{
        item: string;
        qty: number;
    }>;
}
export declare class DialogueCinema {
    private readonly sfx;
    private readonly hooks;
    open: boolean;
    private readonly root;
    private readonly stage;
    private readonly nameWrap;
    private readonly nameEl;
    private readonly titleEl;
    private readonly sheet;
    private readonly textEl;
    private readonly moreEl;
    private readonly giftsEl;
    private readonly choicesEl;
    private readonly hintsEl;
    private npcName;
    private npcTitle;
    private node;
    private lastSpeaker;
    /** Typewriter state: beats still dark, and the rAF clock. */
    private steps;
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
    /**
     * Lay the line out from the ONE markup parser's token stream.
     * Glyphs nest in per-word wrappers so words wrap as units — and a
     * word keeps its wrapper across tone changes ("*gate*." never
     * strands its period on the next line). Item tokens become a single
     * inline chip, revealed as one beat.
     */
    private buildSteps;
    private readonly tick;
    private stopReveal;
    /** The line has fully landed: gifts, then the answer or page-turn. */
    private finishReveal;
    /** A gift is a MOMENT: socket chip, name, count, chime. */
    private stageGifts;
    private buildChoices;
    private select;
    private choose;
    /** The key legend in the bottom bar — always honest about the verbs. */
    private setHints;
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