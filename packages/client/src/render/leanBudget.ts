/**
 * THE ARRIVAL FOLLOWS THE FRUSTUM (Epic B, the shared-root fix) — pure
 * policy for how much the per-frame bake/stream admission ceilings grow
 * under a camera lean.
 *
 * The sprite-bake arrival budgets, the grass first-sight floor, and the
 * ground chunk replace pacing were all tuned for the ORTHOGRAPHIC
 * frustum. The lean frustum reaches `farMult`× deeper (see
 * FRUSTUM_FAR_MULT), so a sideways pan under q>0 sweeps in that many
 * more first-sight cells / prop sprites / ground chunks per frame than
 * the ortho budgets admit. The surplus declines and SKIPS — grass paints
 * flat, coalesced prop runs split, the near ground arrives at a stale
 * tier. Scaling the ceilings by the frustum's extra depth keeps
 * admission in step with reach, so the same three symptoms resolve
 * together.
 *
 * The ramp is keyed to the lean q: 1× at q=0 (byte-identical — callers
 * still gate on q≠0), rising linearly to the full `farMult` at the
 * reference lean, and HARD-clamped at `farMult` so a near-singular
 * grazing lean (q past the reference) can never blow the per-frame mint
 * count unbounded.
 */
export function leanBudgetMult(q: number, refLean: number, farMult: number): number {
  if (q <= 0 || refLean <= 0) return 1;
  const ramp = Math.min(1, q / refLean);
  return Math.min(farMult, 1 + (farMult - 1) * ramp);
}
