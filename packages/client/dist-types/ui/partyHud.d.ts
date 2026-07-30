import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';
/**
 * THE PARTY WAYFINDER — edge pills for fellows beyond the screen.
 *
 * Smoked-glass tier, the waypoint pill's pooled sibling: one pill per
 * party member whose ticker position is live, shown ONLY while they are
 * off screen (a fellow you can see needs no pointing at — that is the
 * unobtrusive law). Each pill rides the screen edge along the bearing,
 * chevron inked in the member's identity color, distance in tiles.
 * Fellows across the band veil (surface vs dungeon) are unpointable
 * and get no pill.
 */
export declare class PartyHud {
    private readonly pills;
    /** Per-frame from the main loop. Pass hidden=true to suppress. */
    update(game: ClientGame, renderer: Renderer, hidden: boolean): void;
    /** Get or build the pill for a member — built once, repositioned forever. */
    private pill;
}
//# sourceMappingURL=partyHud.d.ts.map