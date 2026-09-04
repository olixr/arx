/**
 * G4 — THE OVER-FOOT SKIRT: the grass-rooted predicate.
 *
 * An object reads as EMBEDDED in the meadow only when grass genuinely grows
 * at its foot — so a skirt is emitted only for a skirt-eligible object whose
 * base tile is surrounded by grass. Trees/rocks/bushes/props REPLACE the
 * ground tile they stand on (a tree tile is Tile.Tree, not Tile.Grass), so
 * "grass at the foot" is read off the four orthogonal NEIGHBOURS: an object
 * ringed by meadow gets a skirt; one in a stone courtyard, on a path, at a
 * shoreline, or indoors does not (its neighbours are not grass).
 *
 * Pure over a ground sampler + tile-set membership so it is node-testable
 * (grassSkirt.test.ts) with no renderer or GL.
 */
import { Tile } from '@arx/shared';
import { isCropTile } from '@arx/content';
import { TREE_TILES } from '@arx/shared';
import { ROCK_TILES } from './paintVocab.js';

/** A grass tile the meadow coat grows on (short coat or tall thicket). */
export function isGrassTile(t: number | undefined): boolean {
  return t === Tile.Grass || t === Tile.GrassTall;
}

/**
 * Is this object KIND one that should nestle into the meadow? Trees,
 * saplings, rocks, stumps, and the wild bushes/plants are the natural
 * wilds; other free-standing props on grass qualify too (a lamp post or
 * cairn embedded in the field reads better than one stickered on it). A
 * CROP is excluded — a planted row is deliberately tilled earth, not wild
 * meadow, so wild grass climbing it would read as a weed problem.
 */
export function isSkirtEligibleTile(tile: number): boolean {
  if (isCropTile(tile as Tile)) return false;
  return true;
}

/** Convenience membership for the clearly-natural wilds (used by tests and
 *  callers that want to restrict the skirt to trees/rocks/bushes only). */
export function isNaturalWild(tile: number): boolean {
  return (
    TREE_TILES.has(tile as Tile) ||
    ROCK_TILES.has(tile) ||
    tile === Tile.Sapling ||
    tile === Tile.SaplingOak ||
    tile === Tile.SaplingWillow ||
    tile === Tile.SaplingYew ||
    tile === Tile.SaplingPine ||
    tile === Tile.Stump ||
    tile === Tile.BerryBush ||
    tile === Tile.FibrePlant ||
    tile === Tile.WildSagewort ||
    tile === Tile.WildMoonbell
  );
}

/** Minimum grassy orthogonal neighbours to count an object as meadow-rooted.
 *  Two of four keeps a field-edge tree (grass on the meadow side, path on
 *  the other) skirted while excluding a lone object in mostly-stone ground. */
export const SKIRT_MIN_GRASS_NEIGHBORS = 2;

/**
 * True when a skirt-eligible object at (tx,ty) stands in the meadow: at
 * least SKIRT_MIN_GRASS_NEIGHBORS of its four orthogonal neighbours are
 * grass tiles. `sample` returns the ground tile id (undefined off-map).
 */
export function grassRootedSkirtAt(
  sample: (tx: number, ty: number) => number | undefined,
  tx: number,
  ty: number,
  tile: number,
): boolean {
  if (!isSkirtEligibleTile(tile)) return false;
  let grassy = 0;
  if (isGrassTile(sample(tx, ty - 1))) grassy++;
  if (isGrassTile(sample(tx, ty + 1))) grassy++;
  if (isGrassTile(sample(tx - 1, ty))) grassy++;
  if (isGrassTile(sample(tx + 1, ty))) grassy++;
  return grassy >= SKIRT_MIN_GRASS_NEIGHBORS;
}
