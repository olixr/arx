/**
 * THE WORN LIGHT'S KEEPING — the carried glow: motion tracking, cape
 * wake, and the corona a lit body wears.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ElementTint, WornLight } from './wornLight.js';
import type { PaintHost } from './paintHost.js';
/**
 * The world-space half of the worn-light grammar (wornLight.ts holds
 * the law): the trail under the boots, the wake off the cape, and the
 * body-wide corona. The body-space half — brow, weave, knuckles,
 * greaves, rune face — rides the rig, where the joints are known.
 *
 * Called once per lit body per frame from collectEntities. Rate-gated
 * on frameDt exactly like statusAmbience, so the effect costs the
 * same at 30fps and 144fps.
 */
export declare function wornLight(rend: PaintHost, key: string | number, x: number, y: number, dir: number, ench: Partial<Record<string, string>> | undefined, isOwn: boolean, 
/**
 * True while this body is riding a netcode correction glide
 * (InterpBuffer.gliding): the motion on screen is presentation,
 * not travel, so the trail and wake must not read it as a sprint.
 */
gliding?: boolean): void;
/**
 * Ground speed, in tiles per second, for a body we only ever see
 * positions of. Remote bodies arrive interpolated and own arrives
 * predicted, so measuring the delta is both the simplest and the most
 * honest source: whatever the body VISIBLY did is what the trail
 * answers to.
 */
export declare function trackWornMotion(rend: PaintHost, key: string | number, x: number, y: number, now: number): number;
/**
 * THE WAKE. The cape's channel: matter shedding off the trailing hem,
 * behind the body and low, so it reads as the garment leaving light
 * behind rather than the body being on fire. Motion-scaled, because a
 * standing cape has no wake.
 */
export declare function capeWake(rend: PaintHost, x: number, y: number, dir: number, speed: number, slot: {
    element: string;
    tier: number;
    tint: ElementTint;
}, voice: number, mayShed: boolean): void;
/**
 * The body-wide corona. Tier is loudness: a tier-1 kit gets nothing
 * here (its whole voice is the per-slot glint on the rig), tier 2
 * gets a quiet lamp that becomes real scene light after dark, and
 * tier 3 gets the living charge that marks a walking masterwork.
 *
 * The corona answers the STRONGEST worn working only. Summing eight
 * of them would put a bonfire on anyone with a full kit and undo the
 * per-slot reading the whole grammar is built on.
 */
export declare function wornCorona(rend: PaintHost, key: string | number, x: number, y: number, light: WornLight, voice: number, mayShed: boolean): void;
//# sourceMappingURL=wornAura.d.ts.map