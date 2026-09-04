/**
 * THE ONE RENDER — the single world painter's-order comparator.
 *
 * Extracted from the renderer as a pure function so the depth law can be
 * pinned by node tests. Every world DrawItem sorts through this ONE key.
 *
 * The key has two terms:
 *
 *   1. THE SHELF LAW (primary, untouched by A5). Positive elevation
 *      shelves flatten to ONE rank before comparing (`SHELF`), so raised
 *      content beats the crown rows beneath it while raised-vs-raised and
 *      flat-vs-flat both resolve by raw world row. Higher shelves draw
 *      later.
 *
 *   2. A5 PITCH-AWARE DEPTH (secondary). Within a shelf the depth term is
 *      a world ROW — zoom- and q-invariant. A world-geometry VOLUME
 *      (wall / garrison / diagonal crown run, hedge run) contributes its
 *      NEAR (south) ground-edge row via `nearRow`; every billboard
 *      contributes its foot row via `sortY`. For a wall these are the
 *      same value today (`nearRow === y1+1 === sortY`), so when no item
 *      carries `nearRow` — the A5 kill-switch (`occlusionOn`) off — this
 *      reduces to the exact old `sortY` comparator and the flat look is
 *      preserved (golden gate).
 *
 *      TIE RULE. On an EXACT depth tie a volume draws BEFORE a billboard
 *      at the same row, so a billboard whose foot equals the wall's near
 *      edge (a body standing at the base of a wall) draws IN FRONT of it —
 *      billboards paint no pixels below their feet, so a body at a wall's
 *      base must win. Volume-vs-volume and billboard-vs-billboard ties
 *      keep their prior (stable) order.
 */

/** The minimal shape the comparator reads — a structural subset of
 *  DrawItem, so the real DrawItem passes through unchanged. */
export interface DrawOrderItem {
  /** The item's raw world row (a billboard's foot; a volume's south edge). */
  sortY: number;
  /** The elevation shelf the item stands on (see THE SHELF LAW). */
  strat?: number;
  /** A5: a world-geometry volume's near (south) ground-edge row. Set only
   *  while the `occlusionOn` kill-switch is on; absent ⇒ this is a
   *  billboard and the depth term falls back to `sortY`. */
  nearRow?: number;
  /** THE STABLE TIEBREAK (grass G-PERF). A per-item sequence id — the
   *  collect-order index the renderer stamps on every item just before the
   *  sort. It is the FINAL key, so an EXACT (shelf, depth, rank) tie — a
   *  tall-grass band blit and a body whose foot lands on the band's row, say
   *  — resolves by this deliberate id, never by the accident of where in the
   *  array the item happened to land. Absent ⇒ 0 (the pre-tiebreak order,
   *  which relied on JS sort stability); with every item stamped it makes
   *  the comparator a TOTAL order, so the result is deterministic even under
   *  a non-stable sort and cannot flicker frame-to-frame. */
  seq?: number;
}

/** THE SHELF CLAMP: positive shelves flatten to ONE rank so raised-vs-
 *  raised resolves by row, not by rank (see renderer's DrawItem.strat). */
export const SHELF = (v: number | undefined): number => {
  const s = v ?? 0;
  return s > 1 ? 1 : s;
};

export const DRAW_ORDER = (a: DrawOrderItem, b: DrawOrderItem): number => {
  const shelf = SHELF(a.strat) - SHELF(b.strat);
  if (shelf !== 0) return shelf;
  const ad = a.nearRow ?? a.sortY;
  const bd = b.nearRow ?? b.sortY;
  if (ad !== bd) return ad - bd;
  // Tie: the volume (nearRow defined ⇒ rank 0) draws first, the billboard
  // (rank 1) after ⇒ in front.
  const rank = (a.nearRow === undefined ? 1 : 0) - (b.nearRow === undefined ? 1 : 0);
  if (rank !== 0) return rank;
  // THE STABLE TIEBREAK: equal ranks resolve by the deliberate per-item
  // sequence id, not by incidental array position — a total order that never
  // flickers. Absent ⇒ 0 (the old stable-sort order preserved).
  return (a.seq ?? 0) - (b.seq ?? 0);
};
