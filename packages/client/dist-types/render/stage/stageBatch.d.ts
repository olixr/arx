/**
 * THE ORDER IS THE SORT — batching as pure arithmetic.
 *
 * A GL draw call is cheap but not free; the win of the stage is
 * turning ~1,000 native canvas calls into a handful of draws. A batch
 * may merge only ADJACENT items in the sorted stream that share the
 * whole of their GPU state — (texture, blend) — so painter's-order
 * semantics are preserved by construction, never by argument. A fill
 * quad samples the white texel and so shares any texture, breaking
 * only on blend.
 *
 * This module computes run boundaries and never touches GL, so the
 * batching law is pinned by node tests rather than by eyeballs.
 *
 * A fill quad samples the WHITE texel, which is its own texture
 * state: fills batch with fills, textured quads with their own
 * texture, and the two never merge — a fill folded into a textured
 * run would sample that run's texture across its full UV range and
 * paint the whole texture where a flat color belongs.
 */
import type { StageItem, StageTexture } from './stageTypes.js';
export interface StageRun {
    /** Item index range [i0, i1] inclusive into the frame stream. */
    i0: number;
    i1: number;
    /** The run's texture, or null for a pure-fill run (white texel). */
    tex: StageTexture | null;
    blend: number;
    /** Number of drawable quads in the run (paint items break runs and
     *  are counted by the caller, never inside one). */
    quads: number;
}
/**
 * Compute draw runs over one frame stream. Paint items are emitted as
 * ZERO-length sentinel runs (i0 === i1, tex null, quads 0) so the
 * consumer walks stream order exactly: quads → paint → quads can never
 * be reordered around the live brush between them.
 */
export declare function computeRuns(items: readonly StageItem[]): StageRun[];
//# sourceMappingURL=stageBatch.d.ts.map