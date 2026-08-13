/**
 * THE DOOR REMEMBERS — sign-in cards for returning players.
 *
 * Every successful sign-in leaves a small card in localStorage: the
 * account's username, the adventurer's name, and the look that paints
 * the portrait medallion. The login screen deals the cards back as a
 * shelf of faces; picking one asks only for the password. A device
 * shared by a household holds a card per player, capped so the shelf
 * stays a shelf and never becomes an archive.
 *
 * NEVER stored on a card: passwords, session tokens. The card is a
 * convenience, not a key — the door still asks for the word.
 */
import type { Look } from '@arx/shared';
export interface RememberedAccount {
    /** Account username — the sign-in identity. */
    user: string;
    /** Adventurer name — the face on the card. */
    name: string;
    /** Portrait recipe; null until the look creator has run. */
    look: Look | null;
    /** Last sign-in, ms epoch. Newest sits first on the shelf. */
    at: number;
}
/** The shelf holds a household of players, not an archive. */
export declare const ROSTER_CAP = 4;
/** Parse a stored shelf; anything malformed is the empty shelf. */
export declare function parseRoster(raw: string | null): RememberedAccount[];
/** Upsert by username, newest first; the oldest card falls off the cap. */
export declare function upsertCard(cards: RememberedAccount[], card: RememberedAccount): RememberedAccount[];
/** Drop one card by username. */
export declare function dropCard(cards: RememberedAccount[], user: string): RememberedAccount[];
export declare function loadRoster(): RememberedAccount[];
export declare function rememberAccount(card: RememberedAccount): RememberedAccount[];
export declare function forgetAccount(user: string): RememberedAccount[];
//# sourceMappingURL=loginRoster.d.ts.map