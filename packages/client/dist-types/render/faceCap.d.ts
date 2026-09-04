/**
 * THE ONE RENDER — B9: BOUND THE FACE SCRATCH, warp-DOWN like B5/B8.
 *
 * Structure FACES (wall south/side faces, garrison/diag/hedge faces, and any
 * per-region structure composite) are painted into per-run SCRATCH cells sized
 * by their PROJECTED SCREEN extent. Under lean at zoom 2 the greedy wall-run
 * union produces hundreds of viewport-sized, spatially-scattered boxes; each
 * distinct box size mints its own scratch class, none evictable within the
 * frame → the measured ~16GB "giant-cell" scratch (resTOT ~16061MB), a hard
 * GPU-crash risk.
 *
 * The fix mirrors B5 (bake at a bounded resolution, WARP/scale to depth) and
 * B8 (the crown UV texture is content-sized, never screen-sized): CAP each
 * face scratch cell's bake resolution to a hard ceiling per device dimension,
 * and let the existing GL stage quad SCALE the capped texture up to the full
 * projected screen extent (the quad corners are the shared projected world
 * corners — only the texture RESOLUTION is capped, so seams never reopen).
 *
 * Because both cell dimensions are bounded to `capDim` device px, the scratch
 * class space collapses to at most `ceil(capDim/64)²` buckets — so the resident
 * scratch total is bounded (`≈ ceil(capDim/64)² × capDim² × 4` bytes worst
 * case) no matter how many disjoint runs a leaned frame produces. That bound is
 * the safety property; the softening it trades for is graceful (LINEAR upscale)
 * and only appears where a face projects past the ceiling — i.e. extreme zoom.
 *
 * PURE + node-testable, so the bound is pinned off the same arithmetic the
 * renderer runs. q=0 never sets a cap (the renderer gates `capDim` on
 * `camera.q !== 0`), so `faceCellScale` returns 1 on the flat path and the
 * golden gate is untouched.
 */
/**
 * A representative fixed face-cell ceiling, DEVICE px per cell dimension —
 * available as an explicit override (`renderer.faceCapPx`) for a machine that
 * wants a hard number. The renderer's DEFAULT ceiling is AUTO: the viewport's
 * larger device dimension, so any cell that fits the screen is uncapped (k=1,
 * sharp — structure faces, which the run walk already clips to the viewport,
 * always stay sharp) and only a cell projecting LARGER than the screen (a run
 * or grass/particle row receding past the horizon under lean) softens. This
 * fixed value bounds the resident scratch harder — `ceil(1024/64)² · 1024² · 4`
 * ≈ 1.0 GB worst case (256 classes × 4 MB) — for a memory-starved machine.
 */
export declare const FACE_CELL_CAP_PX = 1024;
/**
 * The uniform downscale a face scratch cell takes so neither device dimension
 * exceeds `capDim`. `pwDev`/`phDev` are the cell's UNCAPPED device dimensions
 * (`ceil(pw · dpr)` etc.). Returns 1 (no cap) when there is no ceiling or the
 * cell already fits — the common case at normal zoom, and ALWAYS at q=0 where
 * the renderer passes no `capDim`. Otherwise the ratio that brings the larger
 * dimension down to exactly `capDim`, applied to BOTH so the aspect (and thus
 * the projected quad it upscales into) is preserved.
 */
export declare function faceCellScale(pwDev: number, phDev: number, capDim: number | undefined): number;
/** A face scratch cell's CAPPED device dimensions and the scale that produced
 *  them. `cw`/`ch` are the resolution the closure bakes at (the texture the
 *  quad upscales); `k` is the transform scale the paint applies so its
 *  screen-space content lands inside `cw × ch`. At `k === 1` these equal the
 *  uncapped dims — the flat/normal path, unchanged. */
export declare function faceCellDims(pwDev: number, phDev: number, capDim: number | undefined): {
    cw: number;
    ch: number;
    k: number;
};
//# sourceMappingURL=faceCap.d.ts.map