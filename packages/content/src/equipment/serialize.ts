import { compileEquipment } from './compile.js';
import type { EquipmentDef } from './types.js';

/**
 * EquipmentDef <-> JSON — the content-tool interchange surface.
 * Defs are JSON-shaped by construction, so this is stringify/parse plus
 * a compile pass: an authored or tool-exported file that doesn't
 * compile fails HERE, loudly, before any item reaches the game.
 */

export function equipmentDefsToJson(defs: readonly EquipmentDef[]): string {
  return JSON.stringify(defs, null, 2);
}

export function equipmentDefsFromJson(json: string): EquipmentDef[] {
  const defs = JSON.parse(json) as EquipmentDef[];
  if (!Array.isArray(defs)) throw new Error('malformed equipment JSON: expected an array');
  for (const def of defs) {
    if (typeof def !== 'object' || def === null || typeof def.id !== 'string') {
      throw new Error('malformed equipment JSON: bad def entry');
    }
  }
  compileEquipment(defs); // full validation — throws with the offending id
  return defs;
}
