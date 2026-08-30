import { EntityKind, type EntityId } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';
/**
 * THE SPOKEN AIR — words standing over the head that said them.
 *
 * The world's other overhead voices are refusals and numbers (damage
 * floaties, THE RISEN WORD). This is the lane for SPEECH: a player's
 * chat line, an actor's bark, a guard's refusal, a mark's cry — any
 * local-channel chat line that arrives carrying its speaker's eid is
 * stood up as a parchment bubble in world space, glued to the drawn
 * body through the same projection every world-anchored HUD piece
 * uses (worldToScreen minus the elevation lift). The log keeps the
 * full record; the bubble is the moment.
 *
 * Laws it lives by:
 * - ONE VOICE, ONE BUBBLE. A speaker holds a single bubble; speaking
 *   again re-fills it and re-pops it. Stacked copies are mush.
 * - THE READ IS PAID FOR. A bubble lives long enough to be read at a
 *   comfortable pace (base + per-glyph), never forever.
 * - POSITION IS TRUTH. The bubble rides the interpolated body every
 *   frame — walk below a speaker and their words stay with them. Only
 *   the viewport edge may bend this (a clamped bubble drops its tail,
 *   the sign plaque's law — a tail that points at nothing lies).
 * - A READ, NOT A SCREEN. pointer-events none, no focus, no input.
 *
 * Perf follows SignHud's hard-won shape: measure the card ONCE per
 * paint (its size only changes with its words), then transform-only
 * writes, each cached so a resting bubble costs zero style churn.
 */
/** The most a bubble will carry — chat's 200 cap reads as a wall. */
export declare const SPEECH_MAX_CHARS = 140;
/** Shortest life: even "ok" hangs long enough to be seen. */
export declare const SPEECH_MIN_MS = 2600;
/** Reading pace: each glyph buys the line a little more air. */
export declare const SPEECH_PER_CHAR_MS = 55;
/** Longest life: past this, a bubble is furniture. */
export declare const SPEECH_MAX_MS = 9000;
/** Clip speech to bubble size at a word seam, never mid-word mush. */
export declare function clipSpeech(text: string): string;
/** How long spoken words hang in the air — reading pace, clamped. */
export declare function speechLifeMs(text: string): number;
/**
 * The tail-tip's height over the feet, in screen-tiles (multiply by
 * camera.scale). Mirrors the renderer's label lane: humanoids cap
 * ~1.62 up, beasts at radius*2.6 — the bubble floats one step above
 * so it never sits on the nameplate.
 */
export declare function anchorTiles(meta: {
    kind: EntityKind;
    appearance?: unknown;
    defId?: string;
}): number;
export interface BubblePlace {
    x: number;
    y: number;
    /** Tail center, px from the card's left edge — slides to keep
     *  pointing at the speaker when the card hugs a viewport edge. */
    tailX: number;
    /** Vertically clamped: the tail points at nothing — drop it. */
    clamped: boolean;
}
/**
 * Where the card stands for an anchor at screen (sx, sy): centered
 * above it, bent inside the viewport, the tail sliding (then bowing
 * out entirely) as the edges assert themselves.
 */
export declare function placeBubble(sx: number, sy: number, w: number, h: number, vw: number, vh: number): BubblePlace;
export declare class SpeechBubbles {
    private readonly game;
    private readonly renderer;
    private readonly layer;
    private readonly bubbles;
    private veiled;
    constructor(game: ClientGame, renderer: Renderer);
    /**
     * Stand words over a speaker's head. The one door: chat routes
     * eid-carrying lines here, and any future system (a boss taunt, a
     * quest beat, an object that talks) speaks through the same call.
     */
    say(eid: EntityId, text: string): void;
    /** Every voice at once — zone changes and disconnects clear the air. */
    clear(): void;
    /**
     * Per-frame from the main loop. `hidden` veils the whole layer (an
     * open screen, the dialogue cinema) without killing the clocks —
     * words keep aging behind the veil and are gone when it lifts.
     */
    update(now: number, hidden: boolean): void;
    /**
     * The speaker's drawn feet + crown height: own body from the
     * predictor, everyone else from the same interpolated sample the
     * renderer draws this frame — the bubble and the body never shear.
     */
    private anchor;
    private build;
    private evictOldest;
}
//# sourceMappingURL=speechBubbles.d.ts.map