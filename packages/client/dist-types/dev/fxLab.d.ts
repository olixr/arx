/**
 * THE MATTER LAB — the `?fx` audit lever (the `?icons` contract:
 * the game boots untouched, the lever rides on top).
 *
 * Stand anywhere in the live world and cycle material × deployment:
 *   [ / ]   previous / next material
 *   , / .   previous / next deployment
 *   Enter   cast at a fixed offset south-east of the hero
 *   \       toggle repeat (re-casts as each run ends — for tuning)
 *
 * Every cast goes through the SAME registry the signatures will use;
 * what the lab shows is exactly what abilities inherit. The registry
 * also lands on window.dcMatter for the Playwright audit harness.
 */
import type { Renderer } from '../render/renderer.js';
import type { ClientGame } from '../game/clientGame.js';
export declare function startFxLab(game: ClientGame, renderer: Renderer): void;
//# sourceMappingURL=fxLab.d.ts.map