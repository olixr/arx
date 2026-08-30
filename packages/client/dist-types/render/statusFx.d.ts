/**
 * THE LANDING WORD — status application moments (visible-buildcraft V1).
 *
 * The wire carries status as bare bits; nothing announces the moment a
 * state lands. This module is the announcer: a per-body memory of the
 * last seen bits, swept each frame, so a RISING edge can fire one short
 * library-voiced burst — the landing — while the ambient weather in
 * renderer.statusAmbience stays the quiet ongoing hum (THE LANDING
 * SPEAKS, THE RIDE HUMS).
 *
 * Laws bound here:
 * - ONE-VOICE: landings compose render/matter/ deployments. The only
 *   bespoke grains are sunder's stone chips — broken guard is this
 *   status grammar's OWN matter (the ambience already sheds the same
 *   chips) and no library material owns "masonry off a body".
 * - BROKEN MATTER IS NEVER ENERGY: bleed and sunder landings carry no
 *   glow; blood spatters and stone cracks, neither shines.
 * - FIRST SIGHT IS SILENT: a body entering view (or the map growing an
 *   eid it never met) adopts its current bits without a landing —
 *   otherwise every walk-on would replay old news. Stale entries (a
 *   body culled away and back) re-enter the same way.
 * - FALLING EDGES ARE SILENT: expiry just stops the hum; the consume
 *   verb's detonation already has the server's reaction voice.
 * - AMBIGUOUS STACKS SPEAK VENOM: the wire's stack nibble is a body
 *   total, not per-status. When both afflictions ride, the re-apply
 *   note takes venom's voice (the louder strategic state). A stack
 *   note is skipped entirely on the frame its affliction first lands —
 *   the landing already announced.
 *
 * ONE GRAMMAR, EVERY SCALE: STATUS_INK below is the single source for
 * status hexes — nameplate blocks, damage-float inks, and the wound
 * row all read it. The vignette edge for own-body DoT ticks derives
 * from the same family.
 */
import { type StatusId } from '@arx/shared';
import type { MatterCtx } from './matter/types.js';
/**
 * The one status color truth — read off THE BOOK OF STATES, where
 * each page's visuals contract declares its ink (statusBook.ts). One
 * truth, one home; every client surface keeps reading it from here.
 * (The hexes match the ambience palettes' lead hex, as always.)
 */
export declare const STATUS_INK: Readonly<Record<string, string>>;
/**
 * Vignette edge tint for own-body DoT ticks, as 'r, g, b' for the
 * renderer's hurt bands: darkened toward the band's weight so the
 * screen edge reads as a wound, not a highlight. Derived from the
 * pages that declare a vignette (the DoT tickers).
 */
export declare const STATUS_VIGNETTE_RGB: Readonly<Record<'burn' | 'bleed' | 'venom', string>>;
export interface StatusEdgeEvent {
    status: StatusId;
    kind: 'land' | 'stack';
}
/**
 * Per-body status memory. The renderer observes every visible body
 * once per frame; sweep() advances the frame clock and occasionally
 * purges bodies that stopped being observed (despawn or cull).
 */
export declare class StatusEdges {
    private map;
    private frame;
    /** Advance the frame clock; purge long-unseen bodies now and then. */
    sweep(): void;
    /**
     * Record this body's bits for the current frame and return the
     * edges that rose since the last observation. First sight (or a
     * stale record from before a cull) adopts silently.
     */
    observe(eid: number, bits: number): StatusEdgeEvent[];
    /** Test window: how many bodies are remembered. */
    size(): number;
}
type LandingVoice = (c: MatterCtx, x: number, y: number) => void;
/**
 * The landing vocabulary — one short library burst per status, small
 * scale, released at chest height. Sunder adds its own stone chips
 * (see the header doctrine) with the dust library carrying the mass.
 */
export declare const LANDINGS: Readonly<Record<string, LandingVoice>>;
/** Speak one edge event at a body's ground anchor. */
export declare function statusLanding(c: MatterCtx, x: number, y: number, ev: StatusEdgeEvent): void;
export {};
//# sourceMappingURL=statusFx.d.ts.map