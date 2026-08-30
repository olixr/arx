import type { PartyRunWire } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
/**
 * THE RIFTGATE — the gate's question: which key turns?
 *
 * The keys come from THE KEY RING's mirror (game.keyRing), never the
 * pack; every row derives its whole story pure from the roll via
 * dungeonSpecFromRoll (the seed-is-the-dungeon law), so this panel
 * and the server's generator can never disagree about where a key
 * leads. Each row is one dungeon: name, sigil (the trade name), tier,
 * theme, the WORN WARD's pips — and the POWER plaque leading, because
 * "am I strong enough" is the question you actually stand at the gate
 * asking. Choosing a row turns that key and the veil takes you.
 *
 * `live` (from the server) names the run still standing: that key
 * turns FREE (the door is open), and a spent key still answers for
 * exactly as long as its own door stands. Any other spent key shows
 * dark — the gate refuses it and the ring screen tells the story.
 *
 * Opening routes through main.ts's one-screen gate like every other
 * screen; the close chip + banner come from dressPanel there.
 */
export declare class RiftgatePanel {
    private readonly game;
    private readonly panel;
    private readonly list;
    private live;
    private partyRuns;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    open(live?: {
        seed: number;
        tier: string;
        power: number;
    }, partyRuns?: PartyRunWire[]): void;
    close(): void;
    /** Ring-mirror hook: the shelf repaints when keys land or wear. */
    refresh(): void;
    private render;
}
//# sourceMappingURL=riftgate.d.ts.map