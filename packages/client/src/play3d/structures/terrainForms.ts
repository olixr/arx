/**
 * THE TERRAIN FORMS LANE (play3d W2) — OWNER: the TERRAIN-FORMS lane.
 *
 * Decks and cliffs as geometry with painted faces:
 *  - DOCKS / BRIDGES / PORCHES: the deck top already rides the ground
 *    bake; this lane lifts water-touching decks by DOCK_LIFT (the
 *    whole-structure verdict: terrain.ts isDockTile / isBridgeTile,
 *    never `groundAt === Dock`), hangs fascia on exposed W/E/S edges
 *    (terrain.ts paintDeckSideFascia — exported for this lane), drives
 *    piles on water-facing spans (paintDeckPile), fills 45° notches
 *    (deckFillAt) and bank aprons (bridgeApronAt), and rails on bridge
 *    parapets. The porch ashore is its own class (isPorchSurface).
 *  - CLIFFS: heightfield.ts already emits every vertical face (THE
 *    HIGH TILE OWNS THE FACE) wearing a stretched top rect; this lane
 *    gives those faces real cliff art — a cliffArt-toned face atlas
 *    (coursing re-emitted, or bakeCliffRun under the stub host) —
 *    and, if it goes further, the contour-shaped rim (marching
 *    squares over `elev >= level`, Ramp counting as mass) that the 2D
 *    draws (cliffArt.buildCliffMemo / FACE_SEGS).
 *
 * Contract: read `ctx.scan.byFamily.get('deck' | 'cliff')` (deck
 * tiles carry `deckKind`; cliff tiles carry `elev` / `lift`), the
 * world through `ctx.sampler` (bordered) and `ctx.world.isRamp`, mint
 * face tiles from `ctx.atlas`, push quads into `ctx.sink` in WORLD
 * coordinates at `ctx.heightAt(...)`.
 *
 * SCAFFOLD STUB: lands nothing.
 */
import type { StructBuildCtx, StructBuildResult } from './structures.js';

export function buildTerrainFormStructures(_ctx: StructBuildCtx): StructBuildResult {
  return { quads: 0, note: 'terrainForms: scaffold stub' };
}
