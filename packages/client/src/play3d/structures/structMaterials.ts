/**
 * THE STRUCTURE MATERIALS (play3d W2 scaffold) — two Lambert materials
 * per face-atlas page, shared by every chunk, minted on first use:
 *
 *  - 'opaque'  : MeshLambertMaterial{map} — prisms (walls, garrison,
 *                hedge mass, deck fascia, cliff). Front faces only; the
 *                shared-edge law means a run's inside is never seen.
 *  - 'cutout'  : MeshLambertMaterial{map, alphaTest 0.5, DoubleSide} —
 *                cards (fence posts/rails, iron bars, hedge lobes). A
 *                card is seen from both sides and must CUT the sun
 *                shadow through its holes, so it also owns a depth
 *                material with the same alpha test (three's shadow
 *                pass uses it in place of the flat depth material).
 *
 * Lambert, not Standard: the painters carry their own shading (THE
 * LIGHT GROUNDS, IT DOES NOT RE-SHADE — plan S1 law), and Lambert is
 * the cheapest lit material that receives the shadow map. Tones are
 * lifted a stop by the lanes (faceTone.ts) before they reach a face.
 *
 * ONE atlas texture per page — the FaceAtlas owns it; this factory
 * only wraps it. `dispose` drops the materials, never the pages.
 */
import * as THREE from 'three';
import type { FaceAtlas } from './faceAtlas.js';
import { bucketKey, type StructMaterialKind } from './structSink.js';

export const CUTOUT_ALPHA_TEST = 0.5;

export interface StructMaterialSet {
  material: THREE.MeshLambertMaterial;
  /** Alpha-tested depth material for the shadow pass (cutouts only). */
  depth: THREE.MeshDepthMaterial | null;
  castShadow: boolean;
  receiveShadow: boolean;
}

export class StructMaterials {
  private readonly sets = new Map<number, StructMaterialSet>();

  constructor(private readonly atlas: FaceAtlas) {}

  /** The material set for a sink bucket. */
  get(kind: StructMaterialKind, page: number): StructMaterialSet {
    const key = bucketKey(kind, page);
    const hit = this.sets.get(key);
    if (hit) return hit;
    const map = this.atlas.texture(page);
    let set: StructMaterialSet;
    if (kind === 'opaque') {
      const material = new THREE.MeshLambertMaterial({ map, side: THREE.FrontSide });
      material.name = `struct opaque p${page}`;
      set = { material, depth: null, castShadow: true, receiveShadow: true };
    } else {
      const material = new THREE.MeshLambertMaterial({
        map,
        alphaTest: CUTOUT_ALPHA_TEST,
        side: THREE.DoubleSide,
        transparent: false,
      });
      material.name = `struct cutout p${page}`;
      const depth = new THREE.MeshDepthMaterial({
        map,
        alphaTest: CUTOUT_ALPHA_TEST,
        depthPacking: THREE.RGBADepthPacking,
        side: THREE.DoubleSide,
      });
      set = { material, depth, castShadow: true, receiveShadow: true };
    }
    this.sets.set(key, set);
    return set;
  }

  get count(): number {
    return this.sets.size;
  }

  dispose(): void {
    for (const s of this.sets.values()) {
      s.material.dispose();
      s.depth?.dispose();
    }
    this.sets.clear();
  }
}
