/**
 * THE SAND AND THE ROAR — the ring's own ceremony fx
 * (docs/arena-plan.md Phase 4, THE GRAND SHOW).
 *
 * Three moments, each a set-piece on the shipped three-strata bar:
 *
 *  arena:gates   — THE BAR COMES DOWN. A 2 s field wire across the
 *                  pit as the gates shut: an iron ring closing inward
 *                  in four sliding quarter-arcs, dust kicked where
 *                  they land, and a rim of banner-gold points waking
 *                  around the sand — the show is starting and the
 *                  crowd's edge lights first.
 *  arena:victory — THE LAUREL. One nova at the pit's heart: a hard
 *                  gold double-ring snaps outward, petal sparks fly
 *                  true-height off it, and a scatter of gold grains
 *                  lies on the sand ~8 s — the crowd remembers where
 *                  you stood.
 *  arena:purse   — THE PURSE RISES. A summon moment on the chest
 *                  tile: the ground exhales a dust breath, a coin
 *                  glint climbs, and two ember grains keep watch on
 *                  the lid until the hand arrives.
 *
 * Binding laws as everywhere: hard edges, save/restore hygiene,
 * srand determinism, squash on ground y-radii, frameDt-gated
 * emission, ≤ ~60 path ops per hook per frame. The telegraph stays
 * pure instrument; these ids ride field/nova/summon wires.
 */
import type { AbilitySig } from './fxSignatures.js';
export declare const ARENA_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsArena.d.ts.map