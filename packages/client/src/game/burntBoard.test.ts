import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { BURNT_BOARD_LINE, BURNT_BOARD_WORD, ClientGame, WORD_LIFE_MS } from './clientGame.js';
import type { InteractTarget, RisenWord } from './clientGame.js';

// THE BURNT BOARD (contested lands band 8, owed F7): a scorched board
// (SignpostBurnt 540) offers a read and answers one RISEN WORD standing
// ON the board, with the sentence in the log, and never asks the server
// (reading is a client act; a burnt board streamed nothing). The pins
// drive the private methods through hand-built slates, the messageLaws
// convention.

type Slate = {
  world: { groundAt: (tx: number, ty: number) => Tile | undefined };
  signs: Map<string, unknown>;
  words: RisenWord[];
  predictor: { renderPos: () => { x: number; y: number } };
  events: { onChat: (l: { channel: string; text: string }) => void };
  log: string[];
  sent: unknown[];
  conn: { send: (m: unknown) => void };
  raiseWord: unknown;
};

function slate(ground: Tile): Slate {
  const s: Slate = {
    world: { groundAt: (tx, ty) => (tx === 4 && ty === 7 ? ground : Tile.Grass) },
    signs: new Map(),
    words: [],
    predictor: { renderPos: () => ({ x: 4.5, y: 9.5 }) },
    events: { onChat: (l) => s.log.push(`${l.channel}:${l.text}`) },
    log: [],
    sent: [],
    conn: { send: (m) => s.sent.push(m) },
    // The one door, bound onto the slate (the server harnesses' speak: proto.speak pattern).
    raiseWord: (ClientGame.prototype as unknown as { raiseWord: unknown }).raiseWord,
  };
  return s;
}

const proto = ClientGame.prototype as unknown as {
  targetAt: (this: Slate, tx: number, ty: number) => InteractTarget | null;
  readBurntBoard: (this: Slate, tx: number, ty: number) => void;
  raiseWord: (this: Slate, word: string, text: string, x?: number, y?: number, tone?: RisenWord['tone']) => void;
  handleMessage: (this: Slate, msg: unknown) => void;
};

test('the burnt board offers a read; a plain post with no words offers nothing; a living board with words offers the sign', () => {
  const burnt = slate(Tile.SignpostBurnt);
  assert.deepEqual(proto.targetAt.call(burnt, 4, 7), { kind: 'burnt', tx: 4, ty: 7 });
  // Off the board: grass offers nothing.
  assert.equal(proto.targetAt.call(burnt, 5, 7), null);
  // A blank living board that is not yours offers nothing (the shipped law).
  const blank = slate(Tile.Signpost);
  assert.equal(proto.targetAt.call(blank, 4, 7), null);
  const worded = slate(Tile.Signpost);
  worded.signs.set('4,7', { title: 'THE TALLY', lines: ['gnolls eleven'], mine: false });
  assert.equal(proto.targetAt.call(worded, 4, 7)?.kind, 'sign');
});

test('the read answers one risen word ON the board and the sentence in the log, and never asks the server', () => {
  const s = slate(Tile.SignpostBurnt);
  proto.readBurntBoard.call(s, 4, 7);
  assert.equal(s.words.length, 1);
  const w = s.words[0]!;
  assert.equal(w.word, BURNT_BOARD_WORD);
  // THE ANCHOR GRAMMAR: an object's state stands on the object, not over your head.
  assert.equal(w.x, 4.5);
  assert.equal(w.y, 7.5);
  // Nothing was refused: the note tone, not the deny shiver.
  assert.equal(w.tone, 'note');
  assert.deepEqual(s.log, [`system:${BURNT_BOARD_LINE}`]);
  assert.deepEqual(s.sent, [], 'the client asked the server nothing');
});

test('the sentence obeys the register: whole sentences, no dash of any kind, the word two or three words at most', () => {
  assert.equal(BURNT_BOARD_LINE, 'Char. Whatever it said went up with it.');
  assert.ok(!/[-–—]/.test(BURNT_BOARD_LINE), 'no dash');
  assert.ok(/\.$/.test(BURNT_BOARD_LINE), 'a whole sentence ends with its stop');
  assert.ok(BURNT_BOARD_WORD.split(' ').length <= 3, 'a risen word is two or three words at most');
  assert.equal(BURNT_BOARD_WORD, BURNT_BOARD_WORD.toUpperCase(), 'the renderer stands words upper case; the source agrees');
  const banned = ['wi-tch', 'h-ex', 'co-ven', 'war-lock', 'de-mon', 'de-vil', 'in-fernal', 'oc-cult', 'he-ll'].map((x) => x.replace('-', ''));
  for (const word of banned) assert.ok(!new RegExp(`\\b${word}`, 'i').test(BURNT_BOARD_LINE), 'the boundary holds');
});

test('THE DEDUPE LAW: reading the board again re-bumps the standing word instead of stacking a second', () => {
  const s = slate(Tile.SignpostBurnt);
  proto.readBurntBoard.call(s, 4, 7);
  const born = s.words[0]!.bornAt;
  proto.readBurntBoard.call(s, 4, 7);
  assert.equal(s.words.length, 1, 'one standing word');
  assert.ok(s.words[0]!.bornAt >= born, 're-popped, not stacked');
  // A dead word (past its life) is replaced by a fresh one.
  s.words[0]!.bornAt -= WORD_LIFE_MS + 1;
  proto.readBurntBoard.call(s, 4, 7);
  assert.equal(s.words.length, 2, 'a word past its life no longer dedupes');
});

test('the server\'s notice walks through the same door: no anchor stands the word over your own head, deny is the default tone', () => {
  const s = slate(Tile.Grass);
  proto.handleMessage.call(s, { t: 'notice', text: 'Your pack is full.', word: 'PACK FULL' });
  assert.equal(s.words.length, 1);
  assert.deepEqual([s.words[0]!.x, s.words[0]!.y, s.words[0]!.tone], [4.5, 9.5, 'deny']);
  assert.deepEqual(s.log, ['system:Your pack is full.']);
  proto.handleMessage.call(s, { t: 'notice', text: 'Locked.', word: 'LOCKED', x: 1.5, y: 2.5, tone: 'deny' });
  assert.equal(s.words.length, 2);
  assert.deepEqual([s.words[1]!.x, s.words[1]!.y], [1.5, 2.5]);
});
