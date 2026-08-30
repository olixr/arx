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
 * and are answered — never skipped. THE TWO-VERB LAW: on keyboard
 * the skim verb (Space / the interact key) can never answer a
 * question — answering rides its own keys (Enter, the digits, a
 * click on the plate) — and every confirm bounces for a beat after
 * the plates land (CHOICE_ARM_MS), so a hand racing through pages
 * can never swear to something it hasn't read. Gifts granted by a
 * beat are staged the moment its line completes: a socket chip and
 * a chime.
 *
 * The server owns the conversation: this class renders exactly what
 * it was sent and reports back (advance / choose index / excuse me).
 */
interface CinemaNode {
    speaker: 'npc' | 'player';
    text: string;
    choices?: string[];
    last?: boolean;
    /** The beat's spoken audio (played by main.ts; paces the reveal here). */
    voice?: {
        url: string;
        durMs: number;
        kind: 'line' | 'quip';
    };
    gifts?: Array<{
        item: string;
        qty: number;
    }>;
    quest?: {
        id: string;
        name: string;
        rewards?: {
            xp?: Array<{
                skill: string;
                amount: number;
            }>;
            items?: Array<{
                item: string;
                qty: number;
            }>;
            coins?: number;
        };
    };
    /**
     * Choices with quest weight, by index: picking an 'accept' plate
     * swears a quest, a 'turnin' plate hands one in. The plates wear
     * the overhead mark's own grammar — gold ! and gold ? — so a
     * consequential answer never dresses like small talk.
     */
    questChoices?: Array<{
        idx: number;
        kind: 'accept' | 'turnin';
    }>;
    /**
     * Choices that open a shop, by index: the plate wears the coin
     * chip so the counter reads apart from small talk, exactly as
     * quest weight does.
     */
    shopChoices?: number[];
    /**
     * Choices that raise a stakes board, by index: the plate wears the
     * ring's gold crossed-swords emblem — larger than the coin chip,
     * because the sand is an OCCASION and the board-opening answer must
     * be unmistakable among small talk.
     */
    arenaChoices?: number[];
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
    /**
     * THE PACED WORD: a voiced line stretches every hold so the text
     * lands with the audio, and the quill's scratch goes quiet — a
     * voice and a scratching quill fight for the same ear.
     */
    private paceScale;
    private voiced;
    private raf;
    private lastT;
    private holdSec;
    private scratchGap;
    private choicesShown;
    private selIdx;
    /** When the plates landed — confirms inside CHOICE_ARM_MS bounce. */
    private choicesAt;
    private closeTimer;
    /**
     * Gamepad state — the cinema drives the pad itself (it is not a
     * .ui-screen, so UiNav's capture never claims it). Edge-detected
     * against the previous frame; everything held at open (the Ⓧ that
     * started the talk) is swallowed until released.
     */
    private padPrev;
    private padArmed;
    private padDir;
    private padDirSince;
    private padDirLast;
    /** Current legend state + device, so a mid-talk device swap re-renders. */
    private hintState;
    private hintMode;
    constructor(sfx: Sfx, hooks: {
        onAdvance: () => void;
        onChoose: (idx: number) => void;
        onEnd: () => void;
        /** A gift landed — a soft pulse through pad hands. */
        onGift?: () => void;
        /** The player skipped a voiced line mid-speech — fade the clip. */
        onVoiceSkip?: () => void;
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
    /**
     * Drive the conversation from the pad — called every frame by main
     * with the raw snapshot. The vocabulary mirrors the whole game's:
     * Ⓐ turns the page / confirms (Ⓧ, the talk button, does too — the
     * finger that started the conversation continues it), Ⓑ excuses
     * you, and the d-pad or left stick walks the choice plates with the
     * same initial-delay-then-repeat cadence every menu uses.
     */
    tickPad(snap: {
        buttons: readonly GamepadButton[];
        axes: readonly number[];
    } | null, nowMs: number): void;
    /**
     * A quest offer is a CONTRACT read aloud: the scroll chip descends
     * beside the line — the quest's name and its pay — so the player
     * reads what they'd be swearing to BEFORE the choice plates appear.
     * The accept itself is an ordinary choice; this is the paper.
     */
    private stageQuestOffer;
    /** A gift is a MOMENT: socket chip, name, count, chime. */
    private stageGifts;
    private buildChoices;
    private select;
    private choose;
    /**
     * A press that cannot answer (the skim key on a question, or a
     * confirm still inside the arm window) gets a gentle refusal: the
     * selected plate nudges and the quiet tick stays silent — the
     * question visibly waits to be read.
     */
    private insist;
    /** The key legend in the bottom bar — always honest about the verbs. */
    private setHints;
    /**
     * Render the legend in the player's own language: keyboard chips or
     * the console's colored face-button glyphs — parity of experience,
     * down to the letters on the buttons.
     */
    private renderHints;
    /**
     * The skim verb: finish the line if it's still arriving, otherwise
     * turn the page. On a question it only insists — answering belongs
     * to confirmSelected/choose (THE TWO-VERB LAW), so the hand racing
     * through pages can never pick a plate by accident.
     */
    advance(): void;
    /** The answer verb: confirm the selected plate (arm-window gated). */
    private confirmSelected;
    /**
     * Keyboard driving; returns true when the key was consumed.
     * Movement/interact verbs come from the ONE KEYMAP (a rebound hand
     * keeps its habits mid-conversation); Space/Enter/Escape are the
     * UI's fixed grammar (RESERVED_KB — unbindable). Held-key repeats
     * never turn a page or answer: every beat costs a fresh press.
     */
    handleKey(code: string, repeat?: boolean): boolean;
}
export {};
//# sourceMappingURL=dialogueCinema.d.ts.map