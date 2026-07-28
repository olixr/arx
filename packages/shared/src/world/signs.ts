import { Tile } from './tiles.js';

/**
 * THE SIGN IS CONTENT — the world learns to speak in writing.
 *
 * A sign tile is a POINTER: the words themselves live in a record
 * addressed by the tile it stands on (`tx,ty`), never in the tile id.
 * Two sources feed the same record shape:
 *
 * - AUTHORED — `ZoneDef.signs`, written in content and edited in Map
 *   Studio. Town shingles, road directions, threshold warnings.
 * - PLAYER — a `signs` DB row keyed by the tile, owned by whoever
 *   built the post. Only that owner may ever rewrite it.
 *
 * Everything downstream (the approach plaque, the read sheet, the
 * editor) speaks this one shape, so a player's homestead marker and
 * the Undercroft's stair warning render through the same hand.
 *
 * The board is small, so the words must be: a title of a few words and
 * a handful of short lines. The caps here are the ONLY truth about
 * length — the client trims to them for feedback, the server trims to
 * them for safety, and the painter can size a board knowing no text
 * will ever overrun it.
 */

/** Characters in a sign's heading — the name on the board. */
export const SIGN_MAX_TITLE = 26;
/** Characters in one body line. */
export const SIGN_MAX_LINE = 34;
/** Body lines beneath the heading. */
export const SIGN_MAX_LINES = 4;

export interface SignText {
  /** The heading, painted large. May be empty if the sign is all body. */
  title: string;
  /** Body lines under the heading — directions, hours, a note. */
  lines: string[];
}

/**
 * Tiles that can carry words. The shingle hangs off a building and
 * names it; the post stands at the roadside and points.
 */
export const SIGN_TILES: ReadonlySet<Tile> = new Set([Tile.HangingSign, Tile.Signpost]);

export function isSignTile(id: number | undefined): boolean {
  return id !== undefined && SIGN_TILES.has(id as Tile);
}

/**
 * One line of sign copy, made safe: control characters stripped, runs
 * of whitespace collapsed, trimmed, and cut to the board's width.
 * Sanitizing is a SHARED law so the client's live preview shows
 * exactly what the server will store.
 */
export function sanitizeSignLine(raw: string, max: number): string {
  let out = '';
  for (const ch of String(raw ?? '')) {
    const code = ch.codePointAt(0)!;
    // Control characters would let one line break the board. They
    // become SPACES rather than vanishing: a smuggled newline must
    // separate the words it sat between, not fuse them into one.
    out += code < 0x20 || (code >= 0x7f && code <= 0x9f) ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** A whole sign record, made safe and normalized (empty tail lines dropped). */
export function sanitizeSignText(raw: Partial<SignText> | null | undefined): SignText {
  const title = sanitizeSignLine(raw?.title ?? '', SIGN_MAX_TITLE);
  // Only strings are copy: a non-string smuggled into the array is
  // dropped, never coerced into text nobody wrote.
  const lines = (Array.isArray(raw?.lines) ? raw!.lines : [])
    .filter((l): l is string => typeof l === 'string')
    .slice(0, SIGN_MAX_LINES)
    .map((l) => sanitizeSignLine(l, SIGN_MAX_LINE));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return { title, lines };
}

/** True when a record has nothing to say — a blank board. */
export function isSignBlank(text: SignText | null | undefined): boolean {
  if (!text) return true;
  return text.title === '' && text.lines.every((l) => l === '');
}

/** The map key a sign record is addressed by. */
export function signKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}
