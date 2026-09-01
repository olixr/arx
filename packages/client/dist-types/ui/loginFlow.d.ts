/**
 * THE DOOR REMEMBERS — the four-view login form: 'roster' deals the
 * saved cards as faces, 'quick' asks only the password, 'signin' is the
 * classic form, 'register' adds the adventurer fields. This module owns
 * the view state and the roster shelf; auth lifecycle (tokens, the
 * in-flight attempt) stays with the shell. Moved verbatim from main.ts
 * (foundations F5.1).
 */
import { type RememberedAccount } from './loginRoster.js';
export interface LoginEls {
    form: HTMLFormElement;
    user: HTMLInputElement;
    pass: HTMLInputElement;
    charName: HTMLInputElement;
    invite: HTMLInputElement;
    submit: HTMLButtonElement;
    toggle: HTMLButtonElement;
    other: HTMLButtonElement;
    error: HTMLElement;
    status: HTMLElement;
    rosterEl: HTMLElement;
    chosenEl: HTMLElement;
}
export interface LoginFlowOpts {
    els: LoginEls;
    isAuthReady(): boolean;
    /** The shell records the in-flight username and speaks to the wire. */
    submit(kind: 'login' | 'register', f: {
        user: string;
        pass: string;
        name: string;
        invite: string;
    }): void;
}
export interface LoginFlow {
    /** Repaint the shelf (a card changed under it). */
    refreshRoster(): void;
    /** Write/refresh a card and repaint the shelf. */
    remember(card: RememberedAccount): void;
    /** The card behind a username, if the shelf holds one. */
    rosterCardFor(user: string | null): RememberedAccount | undefined;
}
export declare function initLoginFlow(o: LoginFlowOpts): LoginFlow;
//# sourceMappingURL=loginFlow.d.ts.map