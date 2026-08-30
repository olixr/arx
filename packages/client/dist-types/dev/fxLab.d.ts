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
 *
 * THE STATUS WING (statusBook Phase 4):
 *   s       cycle the forced status on the OWN body (off → each page)
 *   S       cycle the forced stack tier (1..5) for the nibble reads
 * The wing writes renderer.statusAuditBits — the ambience, tier
 * escalation, and glyph row can be photographed without a live
 * applier; 'off' returns the body to the wire's truth.
 */
import type { Renderer } from '../render/renderer.js';
import type { ClientGame } from '../game/clientGame.js';
export declare function startFxLab(game: ClientGame, renderer: Renderer): void;
//# sourceMappingURL=fxLab.d.ts.map