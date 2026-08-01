/**
 * THE DEVICE-TRUE GLYPH — the one legal way to name a button
 * (The Grand Refit, Phase 2).
 *
 * A seat chip carries BOTH languages — a key cap and a pad glyph —
 * and lets `body.pad-mode` pick which one shows, exactly the way the
 * hotbar and dock badges have always done it. Nothing that renders a
 * bare key letter into a sentence survives the refit: prose points at
 * a chip, the chip knows the device.
 *
 * Laws:
 * - EVERY GLYPH KNOWS ITS DEVICE. Never render `bindings.kbBadge()`
 *   output as text without its pad twin beside it.
 * - THE CHIP FOLLOWS THE KEYMAP. Callers re-render on
 *   `bindings.onChange` (the hotbar's discipline) — a chip is cheap,
 *   rebuild it, never mutate it.
 */

import { bindings, type ActionId } from '../../input/bindings.js';

/** A raw chip in one language. */
export function glyphChip(kind: 'kb' | 'pad', cls: string, text: string, small = false): HTMLElement {
  const chip = document.createElement('span');
  chip.className =
    kind === 'kb' ? `kb-glyph${small ? ' small' : ''}` : `pad-glyph ${cls}`;
  chip.textContent = text;
  return chip;
}

/**
 * The dual-language chip for an action: key cap + pad glyph, CSS-
 * swapped by device. Returns an empty span when the action has no
 * binding in either language (callers may hide it).
 */
export function seatChip(action: ActionId, opts: { small?: boolean } = {}): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'seat-chip';
  const kb = bindings.kbBadge(action);
  if (kb) wrap.appendChild(glyphChip('kb', '', kb, opts.small ?? true));
  const pad = bindings.padBadge(action);
  if (pad) wrap.appendChild(glyphChip('pad', pad.cls, pad.text));
  return wrap;
}

/**
 * A sentence with chips set into it: `glyphLine('Seat on •', chip)`
 * replaces each `•` with the next node — so prose never bakes a
 * letter in. Extra nodes append at the end.
 */
export function glyphLine(template: string, ...nodes: HTMLElement[]): HTMLElement {
  const line = document.createElement('span');
  line.className = 'glyph-line';
  const parts = template.split('•');
  parts.forEach((part, i) => {
    if (part) line.appendChild(document.createTextNode(part));
    if (i < parts.length - 1 && nodes[i]) line.appendChild(nodes[i]!);
  });
  for (let i = parts.length - 1; i < nodes.length; i++) {
    const extra = nodes[i];
    if (extra && !line.contains(extra)) line.appendChild(extra);
  }
  return line;
}
