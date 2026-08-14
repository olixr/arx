import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityKind } from '@arx/shared';
import {
  SPEECH_MAX_CHARS,
  SPEECH_MIN_MS,
  SPEECH_MAX_MS,
  anchorTiles,
  clipSpeech,
  placeBubble,
  speechLifeMs,
} from './speechBubbles.js';

describe('clipSpeech', () => {
  it('passes short speech through, trimmed', () => {
    assert.equal(clipSpeech('  Well met.  '), 'Well met.');
  });

  it('clips long speech at a word seam with an ellipsis', () => {
    const long = 'word '.repeat(60).trim();
    const out = clipSpeech(long);
    assert.ok(out.length <= SPEECH_MAX_CHARS + 1);
    assert.ok(out.endsWith('…'));
    // A word seam, never mid-word mush: strip the mark and the tail
    // must still be the whole word.
    assert.ok(out.slice(0, -1).endsWith('word'));
  });

  it('hard-cuts an unbroken run rather than hunting a distant seam', () => {
    const wall = 'a'.repeat(400);
    const out = clipSpeech(wall);
    assert.equal(out.length, SPEECH_MAX_CHARS + 1);
    assert.ok(out.endsWith('…'));
  });

  it('returns empty for whitespace-only lines (nothing to stand up)', () => {
    assert.equal(clipSpeech('   '), '');
  });
});

describe('speechLifeMs', () => {
  it('pays even the shortest word its minimum read', () => {
    assert.equal(speechLifeMs('ok'), SPEECH_MIN_MS + 2 * 55);
  });

  it('grows with the words and never outstays the cap', () => {
    assert.ok(speechLifeMs('a short line') < speechLifeMs('a rather longer line to read'));
    assert.equal(speechLifeMs('x'.repeat(500)), SPEECH_MAX_MS);
  });
});

describe('anchorTiles', () => {
  it('players stand a humanoid crown above the label lane', () => {
    assert.equal(anchorTiles({ kind: EntityKind.Player }), 1.85);
  });

  it('a dressed actor (appearance) reads as humanoid whatever its kind', () => {
    assert.equal(anchorTiles({ kind: EntityKind.Npc, appearance: {} }), 1.85);
  });

  it('an unknown beast falls back to the default radius lane', () => {
    // radius 0.3 default → 0.3 * 2.6 + 0.8
    assert.ok(Math.abs(anchorTiles({ kind: EntityKind.Npc, defId: 'no-such-def' }) - 1.58) < 1e-9);
  });
});

describe('placeBubble', () => {
  it('centers over the anchor when the viewport allows', () => {
    const p = placeBubble(400, 300, 100, 40, 800, 600);
    assert.equal(p.x, 400);
    assert.equal(p.y, 300);
    assert.equal(p.tailX, 50);
    assert.equal(p.clamped, false);
  });

  it('hugs the left edge and slides the tail toward the speaker', () => {
    const p = placeBubble(10, 300, 100, 40, 800, 600);
    assert.equal(p.x, 58); // w/2 + pad
    assert.ok(p.tailX < 50); // tail leans back toward the speaker...
    assert.ok(p.tailX >= 12); // ...but never off the card
    assert.equal(p.clamped, false);
  });

  it('a vertical clamp drops the tail — it would point at nothing', () => {
    const p = placeBubble(400, 4, 100, 40, 800, 600);
    assert.equal(p.y, 48); // h + pad
    assert.equal(p.clamped, true);
  });

  it('a card wider than the viewport centers instead of thrashing', () => {
    const p = placeBubble(5, 300, 900, 40, 800, 600);
    assert.equal(p.x, 400);
  });
});
