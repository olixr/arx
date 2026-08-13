/**
 * THE DOOR REMEMBERS — the shelf of sign-in cards on the login
 * screen. Pure DOM assembly: storage lives in loginRoster.ts, the
 * portrait comes from the studio's lookBust so the face on the card
 * is exactly the body the world will meet, ring and all.
 */
import { lookBust } from '../cms/portraits.js';
import type { RememberedAccount } from './loginRoster.js';

/** Portrait pixels behind the medallion — generous for retina glass. */
const FACE_PX = 144;
const CHOSEN_PX = 176;

function facePlate(card: RememberedAccount, px: number): HTMLElement {
  const face = document.createElement('span');
  face.className = 'roster-face';
  const bust = card.look ? lookBust(card.look, px) : null;
  if (bust) {
    face.appendChild(bust);
  } else {
    // No look chosen yet (or the render failed): the card wears the
    // adventurer's initial until the face exists.
    const blank = document.createElement('span');
    blank.className = 'roster-face-blank';
    blank.textContent = (card.name || card.user).charAt(0).toUpperCase();
    face.appendChild(blank);
  }
  return face;
}

export interface ShelfHandlers {
  onPick(card: RememberedAccount): void;
  onForget(card: RememberedAccount): void;
}

/** Deal the saved cards into the shelf as pickable face tiles. */
export function renderRosterShelf(
  host: HTMLElement,
  cards: RememberedAccount[],
  handlers: ShelfHandlers,
): void {
  host.replaceChildren();
  for (const card of cards) {
    const tile = document.createElement('div');
    tile.className = 'roster-tile';

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'roster-pick';
    pick.appendChild(facePlate(card, FACE_PX));
    const name = document.createElement('span');
    name.className = 'roster-name';
    name.textContent = card.name;
    const user = document.createElement('span');
    user.className = 'roster-user';
    user.textContent = card.user;
    pick.append(name, user);
    pick.addEventListener('click', () => handlers.onPick(card));

    const forget = document.createElement('button');
    forget.type = 'button';
    forget.className = 'roster-forget';
    forget.textContent = '×';
    forget.title = 'Forget this account';
    forget.setAttribute('aria-label', `Forget ${card.name}`);
    forget.addEventListener('click', () => handlers.onForget(card));

    tile.append(pick, forget);
    host.appendChild(tile);
  }
}

/** The picked card, dealt large above the password field. */
export function chosenPlate(card: RememberedAccount): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(facePlate(card, CHOSEN_PX));
  const hail = document.createElement('span');
  hail.className = 'chosen-welcome';
  hail.textContent = `Welcome back, ${card.name}.`;
  const user = document.createElement('span');
  user.className = 'chosen-user';
  user.textContent = card.user;
  frag.append(hail, user);
  return frag;
}
