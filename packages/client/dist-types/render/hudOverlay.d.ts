/**
 * THE SCREEN'S OWN LAYER — everything painted after the world pass:
 * build ghosts, action progress, the combo beat, floaties, risen words,
 * museum labels, the HP bar and the wound vignette.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import type { PaintHost } from './paintHost.js';
/** Screen-space footprint of a tile, elevation-lifted. */
export declare function ghostFootprint(rend: PaintHost, tx: number, ty: number): {
    x: number;
    y: number;
    sy: number;
};
/** The mass triangle of a 45° piece over a footprint rect. */
export declare function ghostDiagPath(rend: PaintHost, x: number, y: number, w: number, hgt: number, mass: 'NE' | 'NW' | 'SE' | 'SW'): void;
export declare function drawBuildGhost(rend: PaintHost): void;
export declare function drawActionProgress(rend: PaintHost, game: ClientGame): void;
/**
 * THE SPOKEN BEAT's face: stage pips under the own body while a
 * string is alive. Filled pips = beats already swung, the next pip
 * ghosted; the whole row is the GRACE EMBER — it burns down with the
 * window and fades out as the string dies. THE RUN warms the pips
 * once the rhythm holds past one full string. Same canvas dialect as
 * the cast bar above it; single-beat lanes (len 1) stay silent.
 */
export declare function drawComboBeat(rend: PaintHost, game: ClientGame): void;
export declare function drawFloaties(rend: PaintHost, game: ClientGame): void;
/**
 * THE RISEN WORD: interaction answers standing in the world —
 * "LOCKED" over the chest, "PACK FULL" over your own head. A
 * different voice from damage numbers on purpose: capitals, letter
 * air, the full eight-tap ink ring (the icons' outline dialect), a
 * settle instead of a flight. A deny-toned word is born with a short
 * head-shake — the shape of "no" you can read before the letters.
 * Words live on game.words under the dedupe law (a re-ask re-pops
 * the standing word via its refreshed bornAt).
 */
export declare function drawWords(rend: PaintHost, game: ClientGame): void;
/**
 * THE PROP MUSEUM (dev builds only): on the museum plane every
 * plinth speaks at once — each sign's title hangs as a small plate
 * beneath its post so a reviewer reads a whole aisle at a glance
 * instead of plaque-by-plaque through the sign HUD's 2.9-tile
 * radius. Loot-plate dialect, calmer: no ration, no climb — the
 * floor plan already spaces the plinths. Off-plane this is a single
 * string compare per frame.
 */
export declare function drawMuseumLabels(rend: PaintHost, game: ClientGame): void;
export declare function drawHpBar(rend: PaintHost, game: ClientGame): void;
/**
 * THE WOUND ROW (visible-buildcraft V2): the player's own riding
 * states, on the vitality gauge's shoulder. ONE GRAMMAR, EVERY
 * SCALE — the same inks, the same priority order, and the same xN
 * stack voice as every nameplate, scaled up for the owner. It
 * stands ABOVE the bar because the hotbar owns the south edge; no
 * timers are invented (the wire carries bits and stacks, and that
 * is what is shown). Empty when clean — no furniture for nothing.
 */
export declare function drawOwnWounds(rend: PaintHost, game: ClientGame, barY: number): void;
//# sourceMappingURL=hudOverlay.d.ts.map