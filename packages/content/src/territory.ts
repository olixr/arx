import { hashCoords } from '@arx/shared';

/**
 * THE TERRITORY FIELD (docs/lived-in-land-plan.md Phase 5) — the slow
 * field that gives each region of the frontier a FAMILY: this is
 * goblin country, that ridge belongs to the wolfkin, the dead keep
 * the barrows east of the water. Sites, finds, and wild knots all
 * read the same field and LEAN toward the region's family — never
 * exclusively (THE TERRITORY LAW: bias is never a cage; every
 * eligible archetype still rolls everywhere, the land leans rather
 * than repeats).
 *
 * The field is a jittered-lattice voronoi over TERRITORY_SPAN-sized
 * country: each lattice point takes a hashed position jitter and a
 * hashed family from the SORTED family roster, and a world point
 * belongs to its nearest lattice point. Blobs run ~one span across
 * with wandering borders — organic countries, not a checkerboard.
 *
 * NO EPOCH FOLDS IN — country is geologic. Camps churn, holds rise
 * and fall, the fallow turns; the land under them keeps its name.
 * (Corollary: editing the family ROSTER redraws the map, exactly like
 * editing geography — sorted-name indexing keeps everything else
 * stable under content edits that don't touch the roster.)
 */

/** Country size in tiles (~three POI cells across). */
export const TERRITORY_SPAN = 384;

/** The field's named stream — the ST_* family's kin. */
const ST_TERRITORY = 0x7e2217;

/**
 * The family owning a world point, or null when the roster is empty.
 * `families` must be the deduplicated roster; order does not matter
 * (sorted internally — the stability law).
 */
export function territoryAt(
  seed: number,
  tx: number,
  ty: number,
  families: readonly string[],
): string | null {
  if (families.length === 0) return null;
  const sorted = [...families].sort();
  const base = (seed ^ ST_TERRITORY) >>> 0;
  const gx = Math.floor(tx / TERRITORY_SPAN);
  const gy = Math.floor(ty / TERRITORY_SPAN);
  let bestD = Infinity;
  let best: string | null = null;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = gx + ox;
      const cy = gy + oy;
      const h = hashCoords(base, cx, cy);
      // Jittered lattice point: anywhere in the middle ~80% of its
      // span cell, so borders wander instead of running grid-true.
      const px = (cx + 0.1 + ((h >>> 8) % 1000) / 1250) * TERRITORY_SPAN;
      const py = (cy + 0.1 + ((h >>> 18) % 1000) / 1250) * TERRITORY_SPAN;
      const d = (tx - px) * (tx - px) + (ty - py) * (ty - py);
      if (d < bestD) {
        bestD = d;
        best = sorted[h % sorted.length]!;
      }
    }
  }
  return best;
}

/**
 * The deduplicated family roster of a def list — the field's domain,
 * derived from content at call time (the live-registry law: a Studio
 * edit that adds a family joins the map on the next decision).
 */
export function familiesOf(defs: ReadonlyArray<{ family?: string }>): string[] {
  const out = new Set<string>();
  for (const d of defs) {
    if (d.family !== undefined) out.add(d.family);
  }
  return [...out];
}

/**
 * Weight a def list toward a territory's family: matching entries
 * multiply by `bias`, everything else keeps its own weight — the
 * bias-never-gates invariant, structurally.
 */
export function territoryWeight(
  weight: number,
  family: string | undefined,
  territory: string | null,
  bias: number,
): number {
  return territory !== null && family === territory ? weight * bias : weight;
}
