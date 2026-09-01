/**
 * THE ARMOR'S CLOCKS — the pure FX-phase helpers every worn set keeps
 * time by: daybreak, fenlight, stormbolt, aurora, tide, cinder, void,
 * breeze and their kin. Pure functions of the wall clock; no canvas,
 * no state. Moved verbatim from armor.ts (foundations F3.1).
 */
/**
 * THE DAYBREAK clock — dawnsworn's one sky, shared by the hood disc,
 * the hem bands and the shoulder crests so the whole set keeps the
 * same sunrise. A 7.4s cycle: the light climbs, holds its gold, and
 * eases back to first light. `noon` stands at full day forever;
 * `setting` runs the same sky backward — sworn to the other horizon.
 * (`eclipse` reads the raw curve as its ring-flare intensity.)
 */
export declare function daybreakK(nowMs: number, phase?: 'rising' | 'setting' | 'noon' | 'eclipse'): number;
/**
 * THE FENLIGHT clock — the fen court's one breath, shared by the
 * hood lantern, the hem wisps, the shoulder cages, the ripple rings
 * and the bloom crown so the whole set keeps the same slow water.
 * A 5.6s cycle: the light swells, holds, and gutters low — never
 * out. `off` staggers members of the court by a fraction of the
 * cycle so the lights trade watches instead of blinking as one.
 */
export declare function fenlightK(nowMs: number, off?: number): number;
/**
 * THE STORMBOLT clock — the storm court's sky. A 7.2s cycle: a long
 * banked CHARGE climbing to a watchful glow, then THE STRIKE — two
 * hard flashes with a dark breath between — and a fast decay.
 * THE ROLLING SKY (user-amended from the old one-beat ONE SKY law):
 * worn as a full set, the strike is a DISCHARGE that travels the
 * body — it lands at the crown and drains to earth: helm, near
 * shoulder, far shoulder, chest bank, waist beads, skirt brand, hem
 * sparks, hem fog, ground — each piece ~0.7s behind the last via
 * its `off` phase, so static circulates instead of camera-flashing.
 * WITHIN one piece every bolt still shares that piece's beat.
 * Offsets are start-times: a piece with off=o strikes at global
 * phase 0.78-o (mod 1). The worn ripple order (crown → ground):
 * helm 0, near pauldron 0.9, far pauldron 0.8, thunderbank 0.72,
 * chargebeads 0.64, boltbrand 0.54, staticcourt 0.46, stormshroud
 * 0.38, groundflash 0.3 — sunpatch drifts at 0.6, off the chain.
 */
export declare function stormboltK(nowMs: number, off?: number): number;
/**
 * THE LIVING ARC — one jagged rope of electricity between two
 * points: a colored casing under a hot pale core, with one short
 * branch. Deterministic per seed; callers derive the seed from a
 * ~90ms flicker frame during the strike so the lightning DANCES
 * across the cloth instead of glowing like a sign. Strokes only —
 * strokes survive every paint path (gremlin #2's one safe lane).
 */
export declare function stormArc(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number, amp: number, col: string, alpha: number, lw: number, branch?: boolean): void;
/**
 * THE WORLD'S OWN CLOUD — one puff traced in the game's canopy/pool
 * blob idiom (the renderer's foam-mound language): seven noise-bumped
 * radii smoothed through vertex midpoints, the silhouette boiling
 * gently on its own air. Straight edges here would read as ice floes,
 * not vapour — the curves are load-bearing. Traces the closed path
 * only, so one caller can lay a wash base, a dark belly and a lit
 * cap from the same language.
 */
export declare function cloudPuff(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number, nowMs: number, boil?: number): void;
/**
 * THE CAST VEIL — the face's mystery as a true falloff: stacked
 * wide translucent STROKES (fills gutter inside clipped paint
 * paths; strokes do not), near-solid from the brow to the eye
 * line, then fading down the chin like shade actually cast by the
 * hood. Callers clip to the opening FIRST so the veil lives IN the
 * hole and conforms to its chamfer — never a black sticker over it.
 */
export declare function stormVeil(ctx: CanvasRenderingContext2D, cx: number, ohw: number, yTop: number, yEye: number, yEnd: number, rgb: string): void;
/**
 * THE SUBSTORM clock — the aurora's own sky, the court's SIXTH
 * grammar (the fen trades watches, the storm rolls its discharge,
 * the tide processes, the cinder breathes as one bed, the void
 * arrives — the aurora DANCES): the polar night hangs in a low
 * breathing shimmer for most of its 9.6s watch, then the sky breaks
 * into THE DANCE — a fast bloom, a shimmering hold, a graceful ease
 * home. The aurora lot secedes from the rolling discharge BY
 * DESIGN: this is the one weather that never strikes. `off`
 * staggers the dance down the body (corona 0, near shoulder 0.07,
 * far shoulder 0.12, streams 0.18, great curtain 0.28, snowline
 * 0.4) so the lights visibly travel crown to earth. Surges speak
 * through amplitude, width and alpha only — the phase runs at one
 * constant rate forever (pulse honesty).
 */
export declare function auroraK(nowMs: number, off?: number): number;
/**
 * THE DRAWN CURTAIN — one fold of the aurora worn as a GARMENT
 * device (the drawn-light family's sky verse: light is never a
 * body's fill). The fold's silk is night cloth; the light lives
 * only on the drawn lower hem — casing under a hot pale core — and
 * in the rays combed up from it, and every stroke is CLIPPED INTO
 * the silk so the outline dilate never fans a whisker. `pts` is the
 * lower hem in the caller's space; the body rises `hgt` above it on
 * a wavering top edge that morphs at one constant pace. The silk is
 * garment-scale structure: pass `hurt` and it holds white whole.
 */
export declare function auroraCurtain(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, hgt: number, silk: string, edge: string, core: string, k: number, nowMs: number, ph: number, lw: number, hurt: boolean): void;
/** One four-point star prick — path only; the caller fills. */
export declare function starPrick(ctx: CanvasRenderingContext2D, px: number, py: number, rr: number): void;
/**
 * THE TIDE clock — the tide court's one water, shared by the crest,
 * the shoulders, the surf tiers and the moon. A 6.8s cycle: the
 * swell BUILDS long and patient, stands for a breath, BREAKS fast,
 * then a backwash lap and slack. Unlike the fen's traded watches
 * and the storm's one shared sky, the tide is a PROCESSION: callers
 * pass `off` by their place DOWN the garment (moon 0 → crest 0.06 →
 * shoulders 0.14 → waist 0.22 → hem 0.3) so one swell visibly
 * travels the wearer crown to hem (THE TRAVELING SWELL law).
 */
export declare function tideK(nowMs: number, off?: number): number;
/**
 * THE BREAK — how hard the wave is breaking right now, 0..1: full
 * at the moment the swell falls, decaying through the backwash.
 * Drives spray, foam surge and flow surges; same `off` convention
 * as tideK so the break travels the garment too.
 */
export declare function tideBreakK(nowMs: number, off?: number): number;
/**
 * THE DRAWN CURRENT — water as strokes with intent (the LIGHTNING
 * IS DRAWN law's sibling: water is DRAWN, never glowed). A smooth
 * sinuous rope between two points — deep casing under a pale core —
 * whose ripple TRAVELS along the rope, with foam beads riding the
 * flow. Strokes and small opaque bead fills only, gremlin #2's safe
 * lanes. `flow` scales the running speed (surge it at the break).
 */
export declare function tideStream(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, nowMs: number, phase: number, amp: number, col: string, foam: string, alpha: number, lw: number, flow?: number, core?: string): void;
/**
 * THE DRAWN BREATH — the cinder oath's clock: a banked fire under a
 * slow bellows. A long smoulder rising off the floor (a sworn ember
 * NEVER goes out), the held draw, then THE FLARE — brief, bright,
 * gone — and the settle back down to the watch. Fourth clock grammar
 * in the court: the fen trades watches, the storm shares one sky,
 * the tide processes — the cinder BREATHES AS ONE BED; every ember
 * on the garment draws on the same wind, and only the crawl
 * positions keep their own time. Same `off` convention as tideK.
 */
export declare function cinderK(nowMs: number, off?: number): number;
/**
 * THE FLARE — how hard the fire is remembering right now, 0..1:
 * full the instant the draw crests (a flare is SUDDEN), decaying
 * through the settle. Drives the licks, the sparks, the halos —
 * and their particles ride `1 - flare` as a monotone run.
 */
export declare function cinderFlareK(nowMs: number, off?: number): number;
/**
 * THE DRAWN CRACK — fire as strokes with intent (the drawn-water
 * law's fire verse: FIRE LIVES IN THE CRACK, never in a glow, and
 * never dresses a device's body in its own light). A fixed jagged
 * fissure between two points — the crack itself NEVER moves; what
 * moves is THE EMBER CRAWL: bright beads walking the fissure at one
 * constant pace forever (the seamless law), swelling and fading with
 * the breath `k`. Deep-red casing under a hot core, both breathing.
 */
export declare function emberCrack(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number, amp: number, casing: string, ember: string, nowMs: number, k: number, lw: number): void;
/**
 * THE HUSH — the void whisper's clock: the FIFTH grammar in the
 * court. The fen trades watches, the storm shares one sky, the tide
 * processes, the cinder breathes as one bed — THE VOID HOLDS STILL.
 * For most of the cycle the cloth sits at a low rim-light (the
 * hush), then THE WHISPER passes: every torn edge brightens on the
 * same beat, the taken pieces stir, and the dark closes back over
 * it. Same `off` convention as tideK.
 */
export declare function voidK(nowMs: number, off?: number): number;
/**
 * THE ARRIVAL — the void does not travel, it ARRIVES. A light that
 * lives at a ring of fixed seats: it wakes at one, brightens, dies,
 * and is next seen at the NEXT seat — never on the road between.
 * One constant pace forever (the seamless law); a whisper speaks
 * only through brightness, never through hurry. Returns the current
 * seat index and its life 0..1.
 */
export declare function voidWink(nowMs: number, seed: number, seats: number): {
    i: number;
    a: number;
};
/**
 * THE DRAWN RIFT — void as an absence with a lit edge (the drawn-
 * light family's void verse: THE VOID IS AN ABSENCE — a tear's
 * interior is the garment's DARKEST value, plasma lives ONLY on the
 * torn edge, and no device is ever filled with its own light). A
 * fixed lens-shaped tear between two points: edges jagged and
 * deterministic in the seed (a rift never re-rolls), the interior
 * void, the rim a violet casing under a pale core, both riding the
 * hush `k`. In the deep, one tiny star ARRIVES at fixed seats down
 * the spine — seen, then elsewhere, never in between.
 */
export declare function voidRift(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number, w: number, casing: string, core: string, voidCol: string, nowMs: number, k: number, lw: number): void;
/**
 * THE PASSING BREEZE — thistledown's clock: the first wind. A long
 * calm at a low stir, then a gust rises, crests, and lets the field
 * settle. One wind for the whole garment (the daybreak cross-painter
 * pattern): the bloom nods, the shoulders shed, the hem seeds
 * brighten — all on the same breath of weather. Drift positions run
 * at one constant pace forever (the seamless law); the gust speaks
 * only through amplitude and light.
 */
export declare function breezeK(nowMs: number, off?: number): number;
/**
 * THE SEED — thistledown drawn, never glowed: a tiny pale heart
 * with filament rays fanned above it, the way the seed actually
 * hangs under its down. One shape serves the whole wardrobe — the
 * hat's shed, the shoulders' loose fluff, the hem's riders — so
 * every seed in the set is unmistakably the same species.
 */
export declare function thistleSeed(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rot: number, alpha: number): void;
/**
 * Visual equipment styles — the CAPE_STYLES pattern extended to every
 * armor slot. Each record is pure JSON-shaped data a painter interprets;
 * the content pass authors records + palettes here, never new painters.
 * Unknown items fall back to silhouettes derived from their item color,
 * so every future def is dressed the moment it exists.
 *
 * Painters run inside drawHumanoid's frames (torso squash frame, head
 * frame, arm joints) so the fake-3D foreshortening and facing bands are
 * inherited for free. Laws every painter obeys:
 * - hurt ⇒ paint flat #ffffff (the white-flash silhouette);
 * - fills/strokes on the live ctx only, no allocation, ≤ ~10 subpaths
 *   per garment (the cape budget — these run per entity per frame);
 * - front/profile/back reads gate on profileK/backK/lead like the face.
 */
//# sourceMappingURL=armorClocks.d.ts.map