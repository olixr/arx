import type { ClientGame } from '../game/clientGame.js';
import { type FiledKey } from './keyOrder.js';
/**
 * THE KEY RING — every dungeon key, on its own ring (K).
 *
 * Keys left the pack and the bank for good: the ring is uncapped,
 * death-safe, and semantic — a shelf of DOORS, not a bag of things.
 * The screen is built around the question the ring is actually asked:
 * "what can I run?" — so POWER leads the default order, the tier rail
 * walks the ladder, the search line answers the words a player knows
 * a key by (name, sigil, theme, tier), and every row carries THE WORN
 * WARD's pips so a nearly-spent heirloom reads at a glance.
 *
 * Shelf left, bench right (the journal's two-room grammar). The bench
 * tells one key's whole story — seal, sigil, theme, power, worth,
 * turns left — and holds the verbs: turning happens AT A RIFTGATE
 * (the bench says so rather than growing a dead button), dropping is
 * the trade verb, armed-then-confirmed because a key on the ground
 * belongs to whoever lifts it.
 *
 * Everything on this screen derives pure from the ring mirror
 * (dungeonSpecFromRoll / keyUsesLeft) — no second source of truth.
 */
export declare class KeyRingPanel {
    private readonly game;
    private readonly panel;
    private readonly shelf;
    private readonly bench;
    private readonly searchInput;
    private readonly listHost;
    private readonly sumLine;
    private readonly sortRow;
    private readonly rail;
    private tier;
    private theme;
    private sort;
    private search;
    private selected;
    private confirmDrop;
    /** The reader's leaf in the shelf ledger, kept across repaints. */
    private leaf;
    /** Which wing stands open: the ring (keys held) or the ledger (doors known). */
    private wing;
    /** The ledger wing's own selection, by seed. */
    private selectedLore;
    /**
     * THE FORGE IS LIT only for the visit the Keywright opened — walking
     * off and reopening the screen asks her again (the server gates the
     * verb by her presence regardless; this is the honest chrome).
     */
    private forgeLit;
    /** The margin-note pen, present only while the bench offers it. */
    private renameInput;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    /** True while the search line or the margin-note pen holds the keyboard. */
    get isTyping(): boolean;
    open(): void;
    /** The Keywright's door: the ledger wing raised with the forge lit. */
    openForge(): void;
    close(): void;
    /** Ring/ledger-mirror hook: repaint only while the room is open. */
    refresh(): void;
    private filed;
    private render;
    private filedLore;
    /** The ledger wing's shelf: every door ever held, margin notes first. */
    private renderLoreShelf;
    private loreRow;
    /** Light the bench for one remembered door without redealing. */
    inspectLore(seed: number): void;
    private keyRow;
    /** Light the bench for one key without redealing the shelf. */
    inspectKey(id: number): void;
    private renderBench;
    /** One remembered door's page: the note, the story, and the forge. */
    private renderLoreBench;
}
/** THE WORN WARD read at a glance: ◆ for turns left, ◇ for spent. */
export declare function usesPips(k: FiledKey): HTMLElement;
//# sourceMappingURL=keyRing.d.ts.map