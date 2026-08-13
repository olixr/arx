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
export const ROSTER_CAP = 4;

const KEY = 'arx.roster';

/** Parse a stored shelf; anything malformed is the empty shelf. */
export function parseRoster(raw: string | null): RememberedAccount[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const cards: RememberedAccount[] = [];
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const { user, name, look, at } = entry as Partial<RememberedAccount>;
      if (typeof user !== 'string' || user === '') continue;
      if (typeof name !== 'string' || name === '') continue;
      cards.push({
        user,
        name,
        look: look && typeof look === 'object' ? look : null,
        at: typeof at === 'number' && Number.isFinite(at) ? at : 0,
      });
    }
    return cards.slice(0, ROSTER_CAP);
  } catch {
    return [];
  }
}

/** Upsert by username, newest first; the oldest card falls off the cap. */
export function upsertCard(
  cards: RememberedAccount[],
  card: RememberedAccount,
): RememberedAccount[] {
  const rest = cards.filter((c) => c.user !== card.user);
  return [card, ...rest].sort((a, b) => b.at - a.at).slice(0, ROSTER_CAP);
}

/** Drop one card by username. */
export function dropCard(cards: RememberedAccount[], user: string): RememberedAccount[] {
  return cards.filter((c) => c.user !== user);
}

// ----------------------------------------------------- localStorage

export function loadRoster(): RememberedAccount[] {
  return parseRoster(localStorage.getItem(KEY));
}

export function rememberAccount(card: RememberedAccount): RememberedAccount[] {
  const next = upsertCard(loadRoster(), card);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function forgetAccount(user: string): RememberedAccount[] {
  const next = dropCard(loadRoster(), user);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
