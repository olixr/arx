/**
 * THE AMBIENT LAYER — the room's quiet life (The Grand Refit, Ph 2).
 *
 * A handful of ember motes drift up through the case shadow behind a
 * room's content: barely-there, transform-and-opacity only, gone the
 * moment the room closes (display:none pauses the animations) and
 * standing down entirely under reduced motion or the Interface
 * motion setting.
 *
 * Laws:
 * - BEHIND EVERYTHING. The layer rides z-index -1 inside the host's
 *   own stacking context (`.ui-screen` and `.char-tray` isolate),
 *   between the leather field and the content. It can never sit on a
 *   word.
 * - A BREATH, NOT A SHOW. ≤ ~0.22 opacity at peak, slow rise, long
 *   periods — dust in a sunbeam, soothing at the edge of notice.
 * - FREE. No layout reads, no rAF, no timers — pure CSS animation on
 *   compositor properties (translate + opacity only).
 */
export declare function attachAmbient(room: HTMLElement, count?: number): void;
//# sourceMappingURL=ambient.d.ts.map