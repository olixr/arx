import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ClientGame } from './clientGame.js';
import { resetSpectrum, spectrumEpoch, spectrumSig } from '../render/fold.js';

// THE WIRE'S CHARACTER (foundations F5.2). The 72-arm message switch is
// becoming a total handler table; these pins were written against the
// switch FIRST and must read identically against the table — they drive
// the private handler through a hand-built slate, the same convention
// the server suites use.

type Fn = (msg: unknown) => void;
const proto = ClientGame.prototype as unknown as { handleMessage: Fn };
const call = (slate: object, msg: unknown) => proto.handleMessage.call(slate, msg);

test('chat rides straight to the one events door', () => {
  const seen: unknown[] = [];
  const slate = { events: { onChat: (l: unknown) => seen.push(l) } };
  call(slate, { t: 'chat', channel: 'local', from: 'Aef', eid: 7, text: 'well met' });
  assert.deepEqual(seen, [{ channel: 'local', from: 'Aef', eid: 7, text: 'well met' }]);
});

test('time sets the world clock offset and nothing else', () => {
  const slate = { timeOfs: 0 };
  call(slate, { t: 'time', ofs: 4321 });
  assert.equal(slate.timeOfs, 4321);
});

test('xp writes the skill and speaks both events in order', () => {
  const spoken: string[] = [];
  const slate = {
    skills: { mining: 10 } as Record<string, number>,
    events: {
      onSkills: () => spoken.push('skills'),
      onXp: (x: { skill: string; gained: number }) => spoken.push(`xp:${x.skill}+${x.gained}`),
    },
  };
  call(slate, { t: 'xp', skill: 'mining', xp: 25, gained: 15, level: 2, levelledUp: false });
  assert.equal(slate.skills['mining'], 25);
  assert.deepEqual(spoken, ['skills', 'xp:mining+15']);
});

test('ownbuilt replaces the set wholesale and speaks the optional door', () => {
  const seen: Array<Set<string>> = [];
  const slate = {
    ownBuilt: new Set(['old']),
    events: { onOwnBuilt: (s: Set<string>) => seen.push(s) },
  };
  call(slate, { t: 'ownbuilt', keys: ['1,2', '3,4'] });
  assert.deepEqual([...slate.ownBuilt], ['1,2', '3,4']);
  assert.equal(seen[0], slate.ownBuilt);
});

test("spectrum replaces the painter's registry whole and reads nothing off the game", () => {
  resetSpectrum();
  const e0 = spectrumEpoch();
  const stroke = { id: 'wold_gloom', axis: 'blight', shape: { kind: 'circle', x: 1000, y: 1000, r: 30 }, amp: 1, soft: 0.5, grain: 0.5, mode: 'max' };
  // An empty slate: the arm touches no field of the game — the fold is its own registry.
  call({}, { t: 'spectrum', strokes: [stroke], cores: [] });
  assert.equal(spectrumEpoch(), e0 + 1);
  assert.notEqual(spectrumSig(31, 31), 0); // chunk 31 spans 992..1023
  assert.equal(spectrumSig(0, 0), 0);
  call({}, { t: 'spectrum', strokes: [], cores: [] });
  assert.equal(spectrumSig(31, 31), 0);
  assert.equal(spectrumEpoch(), e0 + 2);
});
