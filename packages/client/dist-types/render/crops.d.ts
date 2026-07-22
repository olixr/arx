/**
 * Farm-crop art — the gardening system's plants, spoken in the
 * forage-flora dialect (render/flora.ts) at cultivated-row scale.
 *
 * THE CROP LAWS (the forage laws, tended by hand):
 * - A planted row is a PROUD PLANT, not ground clutter: bold blocky
 *   silhouettes, flat fills, hard chamfers — never wispy strokes.
 * - The HARVEST is the protagonist: what you pick is the biggest,
 *   brightest thing on the plant — fat orange carrot crowns, a
 *   nodding gold sunflower disc, heavy wheat heads, white cotton
 *   puffs, glowing lanterns. Ripe payloads TWINKLE (beacon law) so a
 *   field tells you what's ready from across the screen.
 * - STAGES read at a glance: sprout = hopeful shoots on a dug mound;
 *   mid = a lush green juvenile with the species' silhouette already
 *   forming; ripe = the payload arrives in its accent color, which
 *   appears at NO earlier stage.
 * - Grounded, always: parting shadow + turned-earth clods at the
 *   feet — a crop stands IN worked soil, not on it.
 * - ONE wind: primary sway samples the shared field; payloads ride a
 *   LAGGED secondary beat (heads bob after the stems).
 * - KIN LAW: field sagewort and moonbell are the SAME herbs as their
 *   wild cousins — they paint through the wild painters with tamer,
 *   tidier models, so forager and farmer learn one vocabulary.
 *
 * Scale (body-ruler law, rig ≈ 1.15 tiles): sprouts shin-high, most
 * ripe rows hip-high, wheat to the waist, sunflower/moonbell to the
 * chest — a field you visibly wade through.
 */
import { Tile } from '@devcraft/shared';
import { type FloraFrame, type FloraMass, type FloraModel, type FloraStem } from './flora.js';
/** A ripe carrot crown shouldering out of the soil. */
interface CropCrown {
    x: number;
    w: number;
    lift: number;
    seed: number;
}
/** One wheat stalk; ripe stalks carry the stacked kernel head. */
interface CropHead {
    x0: number;
    len: number;
    lean: number;
    tone: number;
    rungs: number;
    /** Mid-stage: a slim closed green spikelet at the tip (not yet headed out). */
    spike: boolean;
}
/** A cotton boll riding its foliage mass's rustle. */
interface CropBoll {
    x: number;
    y: number;
    r: number;
    mass: number;
    seed: number;
}
/** A chunky serrated plume blade (carrot tops). */
interface CropPlume {
    x0: number;
    len: number;
    lean: number;
    tone: number;
}
export interface CropModel {
    crop: number;
    stage: 0 | 1 | 2;
    variant: number;
    height: number;
    spread: number;
    seed: number;
    masses: FloraMass[];
    plumes: CropPlume[];
    crowns: CropCrown[];
    heads: CropHead[];
    bolls: CropBoll[];
    stems: FloraStem[];
    sun?: {
        lean: number;
        headR: number;
        leaves: Array<{
            hf: number;
            dir: number;
            len: number;
        }>;
    };
}
export type PlantModel = FloraModel | CropModel;
/**
 * The one model resolver for every grown plant tile — wild forage
 * nodes fall through to floraModel; crop tiles grow here.
 */
export declare function plantModel(tile: Tile, h: number): PlantModel;
/** Paint any grown plant — dispatches wild species to paintFlora. */
export declare function paintPlant(ctx: CanvasRenderingContext2D, m: PlantModel, f: FloraFrame): void;
export {};
//# sourceMappingURL=crops.d.ts.map