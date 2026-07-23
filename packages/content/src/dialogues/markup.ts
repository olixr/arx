/**
 * DIALOGUE MARKUP — the smallest vocabulary that lets a line ACT.
 *
 *   *word or phrase*   EMPHASIS — spoken with warmth and weight;
 *                      renders gold-inked and bold, the typewriter
 *                      leans in.
 *   _word or phrase_   FOREBODING — the temperature drops; renders
 *                      in cold ink, spaced and heavy, and the
 *                      typewriter slows to let it land.
 *   {item:bread}       AN ITEM SET INTO THE SENTENCE — icon and name
 *                      as one inline chip, revealed as a single beat.
 *
 * ONE PARSER, EVERY PATH: the validator refuses unbalanced or empty
 * markup at authoring/import time, and the client cinema walks the
 * SAME token stream to paint and pace the line — the two can never
 * disagree about what a line means.
 *
 * Deliberately not a rich-text format: no nesting, no attributes, no
 * escapes. If a line needs more theatre than this, that's a feature
 * conversation, not a markup extension.
 */

export type DialogueToken =
  | { kind: 'text'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'grim'; text: string }
  | { kind: 'item'; item: string };

export interface ParsedMarkup {
  tokens: DialogueToken[];
  /** Authoring mistakes — empty when the line is clean. */
  errors: string[];
}

const ITEM_DIRECTIVE = /^\{item:([a-z][a-z0-9_]*)\}/;

/** Parse one spoken line into its token stream. Never throws. */
export function parseDialogueMarkup(text: string): ParsedMarkup {
  const tokens: DialogueToken[] = [];
  const errors: string[] = [];
  let plain = '';
  let span: 'em' | 'grim' | null = null;
  let spanText = '';
  let i = 0;

  const flushPlain = (): void => {
    if (plain.length > 0) tokens.push({ kind: 'text', text: plain });
    plain = '';
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (ch === '*' || ch === '_') {
      const kind = ch === '*' ? 'em' : 'grim';
      if (span === null) {
        flushPlain();
        span = kind;
        spanText = '';
      } else if (span === kind) {
        if (spanText.length === 0) errors.push(`empty ${kind} span ('${ch}${ch}')`);
        else tokens.push({ kind: span, text: spanText });
        span = null;
      } else {
        errors.push(`'${ch}' opened inside a ${span} span — markup never nests`);
      }
      i++;
      continue;
    }
    if (ch === '{') {
      const m = ITEM_DIRECTIVE.exec(text.slice(i));
      if (!m) {
        errors.push(`malformed directive at '${text.slice(i, i + 16)}…' — only {item:<slug>} exists`);
        i++;
        continue;
      }
      if (span !== null) {
        errors.push('an item chip cannot sit inside an emphasis span');
        i += m[0].length;
        continue;
      }
      flushPlain();
      tokens.push({ kind: 'item', item: m[1]! });
      i += m[0].length;
      continue;
    }
    if (span !== null) spanText += ch;
    else plain += ch;
    i++;
  }

  if (span !== null) errors.push(`unclosed ${span} span — a '${span === 'em' ? '*' : '_'}' never found its partner`);
  flushPlain();
  return { tokens, errors };
}

/** The line with markup removed — for length checks and plain logs. */
export function stripDialogueMarkup(text: string): string {
  const { tokens } = parseDialogueMarkup(text);
  return tokens
    .map((t) => (t.kind === 'item' ? t.item.replace(/_/g, ' ') : t.text))
    .join('');
}
