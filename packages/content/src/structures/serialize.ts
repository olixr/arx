import { compileTemplate } from './stamp.js';
import type { StructureTemplate } from './types.js';

/**
 * Template <-> JSON. StructureTemplate is already JSON-shaped (legend
 * values are plain objects; Tile/Detail are numeric enums), so this is
 * stringify/parse — plus compile-on-load so a hand-edited or editor-
 * exported file fails loudly instead of stamping garbage.
 */

export function templateToJson(tpl: StructureTemplate): string {
  return JSON.stringify(tpl, null, 2);
}

export function templateFromJson(json: string): StructureTemplate {
  const tpl = JSON.parse(json) as StructureTemplate;
  if (
    typeof tpl !== 'object' || tpl === null ||
    typeof tpl.id !== 'string' ||
    !Array.isArray(tpl.rows) ||
    typeof tpl.legend !== 'object' || tpl.legend === null
  ) {
    throw new Error('malformed structure template JSON');
  }
  return compileTemplate(tpl);
}
