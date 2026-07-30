import type { PartyRunWire } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
/**
 * THE RIFTGATE — the gate's question: which key turns?
 *
 * The server names the pack slots holding dungeon keys; everything
 * else on each row is read pure from that slot's roll via
 * dungeonSpecFromRoll (the seed-is-the-dungeon law), so this panel
 * and the server's generator can never disagree about where a key
 * leads. Each row is one dungeon: name, sigil (the trade name), tier,
 * theme — and the POWER plaque leading, because "am I strong enough"
 * is the question you actually stand at the gate asking. Choosing a
 * row turns that key and the veil takes you.
 *
 * Opening routes through main.ts's one-screen gate like every other
 * screen; the close chip + banner come from dressPanel there.
 */
export declare class RiftgatePanel {
    private readonly game;
    private readonly panel;
    private readonly list;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    open(keySlots: number[], partyRuns?: PartyRunWire[]): void;
    close(): void;
    private render;
}
//# sourceMappingURL=riftgate.d.ts.map