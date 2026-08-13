import type { RememberedAccount } from './loginRoster.js';
export interface ShelfHandlers {
    onPick(card: RememberedAccount): void;
    onForget(card: RememberedAccount): void;
}
/** Deal the saved cards into the shelf as pickable face tiles. */
export declare function renderRosterShelf(host: HTMLElement, cards: RememberedAccount[], handlers: ShelfHandlers): void;
/** The picked card, dealt large above the password field. */
export declare function chosenPlate(card: RememberedAccount): DocumentFragment;
//# sourceMappingURL=loginShelf.d.ts.map