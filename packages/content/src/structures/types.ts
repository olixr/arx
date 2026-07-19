import type { Detail, Tile } from '@devcraft/shared';

/**
 * One legend entry: what a single template character paints. A cell may
 * set a ground tile, a detail-layer decoration, or both (e.g. a wood
 * floor with a rug baked on top).
 */
export interface CellDef {
  tile?: Tile;
  detail?: Detail;
}

/**
 * An ASCII-art building stamp. Rows-of-strings over tile arrays because
 * a building should be READABLE in a diff — you can see the doorway
 * move. The space character is transparent (skipped entirely at stamp
 * time) and is never allowed in the legend: that is what lets L-shapes
 * and open-cornered plazas stamp without clobbering the ground around
 * them.
 *
 * Templates flip horizontally but NEVER rotate — the renderer is
 * facing-sensitive (south faces are the presented face), so a rotated
 * building would show its blank back to the camera.
 */
export interface StructureTemplate {
  id: string;
  /** Single-char keys; ' ' (space) means transparent and is never here. */
  legend: Record<string, CellDef>;
  /** Row-major, all rows the same length. */
  rows: string[];
  meta?: {
    /** Stamps Detail.Story2/3 on an interior floor cell for the facade renderer. */
    stories?: 1 | 2 | 3;
    /** Consumed by the roof renderer (later commit). */
    roof?: 'thatch' | 'slate' | 'wood' | 'none';
    /** Template-local chimney cell; mirrored by flipX. */
    chimney?: { x: number; y: number };
    label?: string;
  };
}
