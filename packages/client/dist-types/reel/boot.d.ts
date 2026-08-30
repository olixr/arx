import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import type { Renderer } from '../render/renderer.js';
import type { TakeStats } from './recorder.js';
/**
 * THE REEL ROOM's door.
 *
 * Loaded only when `?reel` is on the URL, and dynamically, so a player
 * never downloads a byte of it. Everything the capture lane needs hangs
 * off `window.__reel`: start a shot, ask how it is going, take the
 * bytes. The lane holds no knowledge of the game — it drives this.
 */
export interface ReelBridge {
    ready: true;
    shots: string[];
    /** The whole slate as data — the capture lane reads the roster from
     *  the page rather than importing across package roots, so there is
     *  exactly one list of shots in the repository and it lives here. */
    slate: unknown;
    begin(id: string): void;
    status(): {
        phase: string;
        note: string;
        done: boolean;
        error: string;
        bytes: number;
        stats: TakeStats | null;
    };
    read(offset: number, length: number): string;
    release(): void;
}
export declare function bootReel(deps: {
    game: ClientGame;
    renderer: Renderer;
    input: InputManager;
}): void;
//# sourceMappingURL=boot.d.ts.map