import { type AbilityDef, type AbilitySlot, type InputFrame } from '@arx/shared';
/**
 * THE HELD SIGIL: hold-to-aim for point-targeted arts.
 *
 * Press an ability whose shape lands at a ground POINT and the cast
 * waits: the button becomes a held gesture steering a ghost ring
 * (right stick on pad, cursor on mouse), and RELEASE looses the art
 * at the ring. The wire grammar is untouched — this layer simply
 * withholds the button bit while the gesture lives, then raises it
 * for exactly one frame carrying the aimed point (`tx`/`ty`), so the
 * server's press-edge law still sees one press, one cast.
 *
 * Taps stay taps: a press-and-release inside one tick sends no point
 * and the server's aim-assisted resolve answers exactly as before.
 * Touch (and hotbar clicks) never arm the gesture at all — their
 * smart cast is the right grammar for a thumb on glass.
 */
/** What the gesture needs to ask of the game, structurally typed so
 *  this module never imports the game (no cycle). */
export interface AimHost {
    slotAbility(slot: AbilitySlot): AbilityDef | null;
    /** Off cooldown AND not a dormant loan seat. */
    slotReady(slot: AbilitySlot): boolean;
    /** While stowed, a press draws steel instead of aiming. */
    sheathed(): boolean;
    /** Bits currently driven by touch/hotbar buttons — never armed. */
    touchBits(): number;
}
/** The live gesture, read by the renderer for the ghost ring. */
export interface AimGesture {
    slot: AbilitySlot;
    ab: AbilityDef;
    /** The ring's world point (smoothed) — NaN until the first update. */
    x: number;
    y: number;
    /** The art's reach in tiles (the one ruler, honed def's own). */
    range: number;
    bornAt: number;
    /** True once the hand has actively steered the ring. */
    steered: boolean;
    /** Pad reticle: sticky offset from the body, tiles (build-cursor law). */
    padOff: {
        dx: number;
        dy: number;
    } | null;
}
export declare class GroundAimController {
    private readonly host;
    private g;
    private prevRaw;
    /**
     * Bits eaten until their key physically lifts — a cancelled gesture's
     * button must NOT re-arrive at the server as a fresh press edge the
     * moment we stop masking it (that would cast the art you just bailed
     * out of, at the smart point, uninvited).
     */
    private swallowBits;
    constructor(host: AimHost);
    /** The live gesture, or null. Renderer/HUD read, never write. */
    gesture(): AimGesture | null;
    /** Bail out without casting; the held key stays eaten until lifted. */
    cancel(): void;
    /**
     * Per network tick, BEFORE the cast mirror: rewrites the frame's
     * buttons (and stamps `tx`/`ty` on the release frame). Must see every
     * frame — it keeps its own raw press-edge state.
     */
    filterFrame(frame: InputFrame): void;
    /**
     * Per render frame: settle the ring's world point. Pad steering is
     * the build cursor's dialect — deflection direction aims, depth sets
     * reach, and the offset is STICKY so you can strafe while the ring
     * holds its ground. Mouse is the cursor through pickWorld, clamped
     * to reach. Un-steered pads rest on the soft aim-assist mark so the
     * ring always tells the truth about where a bare tap would land.
     */
    update(o: {
        /** Any open screen / build ghost / cinematic dissolves the hold. */
        blocked: boolean;
        own: {
            x: number;
            y: number;
        };
        aim: number;
        /** Right-stick axes when the pad is the live device, else null. */
        stick: {
            x: number;
            y: number;
        } | null;
        /** pickWorld under the cursor (mouse devices), else null. */
        mouseWorld: {
            x: number;
            y: number;
        } | null;
        /** Nearest foe inside reach in the aim cone — the honest default. */
        assist: {
            x: number;
            y: number;
        } | null;
        dtSec: number;
    }): void;
}
//# sourceMappingURL=groundAim.d.ts.map