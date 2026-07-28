/**
 * The Controls table — the Settings screen's third wing. Every action
 * in the one keymap is a row: its name, its key, its pad button. Tap a
 * chip (Ⓐ on it from the couch) and the next press becomes the new
 * binding; a key already in service is taken from its old action and
 * the change is said out loud in the chat log. Esc always keeps things
 * as they are. One button restores the shipped layout.
 */
import type { InputManager } from '../input/inputManager.js';
import type { UiNav } from './padUI.js';
interface ControlsDeps {
    nav: UiNav;
    input: InputManager;
    /** One quiet system line — the quartermaster's voice. */
    notice: (text: string) => void;
}
export declare function installControlsMenu(deps: ControlsDeps): void;
export {};
//# sourceMappingURL=controlsMenu.d.ts.map