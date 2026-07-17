import type { InputManager } from './inputManager.js';
import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';
/**
 * Touch controls: drag anywhere on the left half for a virtual joystick;
 * tap the right half to walk there (or interact when the tile is usable);
 * on-screen attack button. Buttons only appear on coarse-pointer devices.
 */
export declare function setupTouch(input: InputManager, game: ClientGame, renderer: Renderer, canvas: HTMLCanvasElement, onInteractTap: (tx: number, ty: number) => boolean): void;
//# sourceMappingURL=touch.d.ts.map