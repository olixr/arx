import { Detail, Tile } from '@devcraft/shared';
import type { ZoneBuilder } from '../maps/builder.js';
import type { StructureTemplate } from './types.js';

/**
 * Template validation + stamping. Templates are validated once (at
 * module load for the built-in roster, at parse time for JSON imports)
 * so a typo'd legend char or a doorway buried mid-wall fails loudly in
 * tests instead of stamping a broken building into the world.
 */

export function templateWidth(tpl: StructureTemplate): number {
  return tpl.rows[0]?.length ?? 0;
}

export function templateHeight(tpl: StructureTemplate): number {
  return tpl.rows.length;
}

const DOORWAY_TILES: readonly Tile[] = [Tile.DoorwayStone, Tile.DoorwayWood];

/** Floors the story marker may ride on — interior cells by definition. */
const FLOOR_TILES: readonly Tile[] = [Tile.WoodFloor, Tile.StoneFloor];

/**
 * Validate a template, throwing with the template id and reason.
 * Checks: rows are non-empty and rectangular; every non-space char has
 * a legend entry; the legend never claims the transparent space char;
 * every doorway lies on the footprint perimeter (a doorway that opens
 * into more building is authoring nonsense). "Perimeter" includes cells
 * bordering a transparent hole so L-shaped footprints can put doors on
 * their inner edge. Returns the template for compile-on-assign use.
 */
export function compileTemplate(tpl: StructureTemplate): StructureTemplate {
  const fail = (reason: string): never => {
    throw new Error(`structure template '${tpl.id}': ${reason}`);
  };
  if (tpl.rows.length === 0) fail('has no rows');
  const w = tpl.rows[0]!.length;
  const h = tpl.rows.length;
  if (w === 0) fail('has empty rows');
  for (let y = 0; y < h; y++) {
    if (tpl.rows[y]!.length !== w) fail(`row ${y} is ${tpl.rows[y]!.length} wide, expected ${w}`);
  }
  if (' ' in tpl.legend) fail(`legend maps ' ' — space is reserved for transparency`);
  const at = (x: number, y: number): string =>
    x < 0 || y < 0 || x >= w || y >= h ? ' ' : tpl.rows[y]![x]!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = at(x, y);
      if (ch === ' ') continue;
      const cell = tpl.legend[ch];
      if (!cell) fail(`char '${ch}' at (${x},${y}) has no legend entry`);
      if (cell!.tile !== undefined && DOORWAY_TILES.includes(cell!.tile)) {
        const onPerimeter =
          x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
          [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes(' ');
        if (!onPerimeter) fail(`doorway at (${x},${y}) is not on the footprint perimeter`);
      }
    }
  }
  const chimney = tpl.meta?.chimney;
  if (chimney && (chimney.x < 0 || chimney.y < 0 || chimney.x >= w || chimney.y >= h)) {
    fail(`chimney at (${chimney.x},${chimney.y}) is outside the ${w}x${h} footprint`);
  }
  return tpl;
}

/**
 * Mirror a template left-right: each row string reverses and the
 * chimney x follows. flipX ONLY — no rotation exists, because the
 * renderer presents south faces and a rotated building would face away
 * from the camera.
 */
export function flipTemplate(tpl: StructureTemplate): StructureTemplate {
  const w = templateWidth(tpl);
  return {
    ...tpl,
    rows: tpl.rows.map((row) => [...row].reverse().join('')),
    meta: tpl.meta && {
      ...tpl.meta,
      chimney: tpl.meta.chimney && { x: w - 1 - tpl.meta.chimney.x, y: tpl.meta.chimney.y },
    },
  };
}

/**
 * Stamp a template onto a zone at local coords. Space cells are skipped
 * entirely — the ground beneath them survives, which is what makes open
 * corners and L-shapes composable. If the template declares stories,
 * the Story2/3 marker lands on the first interior floor cell that
 * carries no authored detail (never clobber a doormat or rug — the
 * facade renderer only needs ONE marker somewhere inside).
 */
export function stampTemplate(
  b: ZoneBuilder,
  tpl: StructureTemplate,
  x: number,
  y: number,
  opts?: { flipX?: boolean },
): void {
  const t = opts?.flipX ? flipTemplate(tpl) : tpl;
  const w = templateWidth(t);
  const h = templateHeight(t);
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const ch = t.rows[ty]![tx]!;
      if (ch === ' ') continue;
      const cell = t.legend[ch]!;
      if (cell.tile !== undefined) b.set(x + tx, y + ty, cell.tile);
      if (cell.detail !== undefined) b.setDetail(x + tx, y + ty, cell.detail);
    }
  }
  const stories = t.meta?.stories ?? 1;
  if (stories > 1) {
    marker: for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const ch = t.rows[ty]![tx]!;
        if (ch === ' ') continue;
        const cell = t.legend[ch]!;
        if (cell.tile !== undefined && FLOOR_TILES.includes(cell.tile) && cell.detail === undefined) {
          b.setDetail(x + tx, y + ty, stories === 3 ? Detail.Story3 : Detail.Story2);
          break marker;
        }
      }
    }
  }
}
