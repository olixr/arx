/**
 * THE ONE MOUTH — the single-writer law, enforced by shape.
 *
 * The arms-v3 audit found the arm channels written from sites
 * scattered across 1500 lines (`heldAngle` had SEVEN writers with no
 * owner). Phase 2 fenced the whole pipeline between two markers in
 * drawHumanoid; this test walks the SOURCE and fails the build if:
 *   1. any write to an arm channel appears inside drawHumanoid but
 *      OUTSIDE the fence, or
 *   2. the per-channel writer census inside the fence drifts without
 *      this pin being deliberately updated (a new writer must be a
 *      decision, never an accident).
 *
 * Comments are stripped before scanning so prose about a channel can
 * never trip the census.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'rig.ts'), 'utf8');

/** The fenced arm channels and their PINNED writer counts. */
const CENSUS: Record<string, number> = {
  heldAngle: 9, // strike resolve · rest lerp · wrist-follow ×2 · pole ready carry · cast · bellows fill+throw (THE GIANT CAST) · sheathe
  mainX: 17, // work frame (THE WORK LIVES IN THE WORLD) · pose targets · rest · pump/sway/breath · seat · cast · draw · sheathe · strike arc
  mainY: 17, // (the old per-branch forage/milk drops died with the work engine)
  offX: 20, // work frame folded six off-hand branches (chop/mine, forage, milk, tongs, furnace) into ONE resolved write; + the pole's war-grip weld
  offY: 20,
  offAngle: 2, // counter-swing init (world engine) · echo brace
  offBladeAngle: 5, // guard init · echo · rest · flourish path · sheathe
  mainFore: 5, // strike resolve · rest lerp · pole ready carry · cast present (Phase 3) · bellows throw
  offFore: 3, // init · echo · rest lerp
  staffGrip: 7, // combat default · strike override · mountain-falls grip · great rest · pole rest · staff rest · sheathe
  armSwingK: 4, // default · great pumpK · pole pumpK · staff pumpK
};

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function writesOf(body: string, channel: string): number {
  // An assignment head: the bare identifier (no property access, no
  // wider word) followed by =, +=, -=, *=, /= — but never ==, =>.
  const re = new RegExp(`(?<![.\\w$])${channel}\\s*(?:[+\\-*/]?=)(?![=>])`, 'g');
  return (body.match(re) ?? []).length;
}

test('every arm-channel write lives inside THE ONE MOUTH fence', () => {
  const fnStart = SRC.indexOf('export function drawHumanoid');
  const fnEnd = SRC.indexOf('export function drawBackGear');
  assert.ok(fnStart > 0 && fnEnd > fnStart, 'drawHumanoid bounds');
  const begin = SRC.indexOf('THE ONE MOUTH BEGINS');
  const end = SRC.indexOf('THE ONE MOUTH ENDS');
  assert.ok(begin > fnStart && end > begin && end < fnEnd, 'fence markers present, in order');

  const before = stripComments(SRC.slice(fnStart, begin));
  const inside = stripComments(SRC.slice(begin, end));
  const after = stripComments(SRC.slice(end, fnEnd));

  for (const ch of Object.keys(CENSUS)) {
    assert.equal(
      writesOf(before, ch) + writesOf(after, ch),
      0,
      `${ch} is written outside the fence`,
    );
  }
});

test('the writer census matches the pin — a new writer is a decision', () => {
  const begin = SRC.indexOf('THE ONE MOUTH BEGINS');
  const end = SRC.indexOf('THE ONE MOUTH ENDS');
  const inside = stripComments(SRC.slice(begin, end));
  const actual: Record<string, number> = {};
  for (const ch of Object.keys(CENSUS)) actual[ch] = writesOf(inside, ch);
  assert.deepEqual(actual, CENSUS);
});
