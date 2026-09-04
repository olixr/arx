import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spectrumAt, type SpectrumStroke } from '@arx/content';
import { GameServer } from './gameServer.js';

// THE SKIN-ONLY DOOR (docs/contested-lands-plan.md §12.2, LG-0). Slate
// convention: the prototype methods are driven against a hand-built
// slate, so the door proves what it touches by what the slate has to
// offer — a slate with no dropAll, no geographySweep, no rebuildHavens
// and no seat cache would throw the moment the door reached for one.

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

interface Sent {
  eid: number | null;
  msg: unknown;
}

function slate(): { sessions: Array<{ playerEid: number | null; sendJson: (m: unknown) => void }>; sent: Sent[] } & Record<string, unknown> {
  const sent: Sent[] = [];
  const session = (eid: number | null) => ({ playerEid: eid, sendJson: (msg: unknown) => sent.push({ eid, msg }) });
  return {
    sessions: [session(1), session(null), session(7)],
    sent,
    pushSpectrum: proto.pushSpectrum,
    spectrumWire: proto.spectrumWire,
    spectrumCores: proto.spectrumCores,
  };
}

const GLOOM: SpectrumStroke = {
  id: 'wold_gloom',
  axis: 'blight',
  shape: { kind: 'circle', x: 2000, y: 2000, r: 40 },
  amp: 1,
  soft: 0.5,
  grain: 0.5,
  mode: 'max',
};

test('replaceSpectrum swaps the content registry, tells every standing player, and touches nothing else', () => {
  const s = slate();
  const quiet = console.log;
  console.log = () => {};
  try {
    const res = (proto.replaceSpectrum as Fn).call(s, [GLOOM] as never);
    assert.deepEqual(res, { strokes: 1 });
    // The registry the welcome geo snapshot reads now folds the wold.
    assert.equal(spectrumAt('blight', 2000, 2000), 1);
    // Only sessions with a body in the world hear it; the record is whole.
    assert.deepEqual(
      s.sent.map((x) => x.eid),
      [1, 7],
    );
    for (const { msg } of s.sent) assert.deepEqual(msg, { t: 'spectrum', strokes: [GLOOM], cores: [] });
    // The wire never aliases the registry.
    const wire = s.sent[0]!.msg as { strokes: SpectrumStroke[] };
    wire.strokes[0]!.amp = 0;
    assert.equal(spectrumAt('blight', 2000, 2000), 1);
    // Back to nothing: the door is its own undo.
    s.sent.length = 0;
    (proto.replaceSpectrum as Fn).call(s, [] as never);
    assert.equal(spectrumAt('blight', 2000, 2000), 0);
    assert.deepEqual(s.sent.map((x) => x.msg), [
      { t: 'spectrum', strokes: [], cores: [] },
      { t: 'spectrum', strokes: [], cores: [] },
    ]);
  } finally {
    (proto.replaceSpectrum as Fn).call(slate(), [] as never); // leave the registry as found
    console.log = quiet;
  }
});

test('spectrumWire carries both keys, and the cores list is empty by law until LG-7', () => {
  const s = slate();
  const wire = (proto.spectrumWire as Fn).call(s) as { t: string; strokes: unknown[]; cores: unknown[] };
  assert.equal(wire.t, 'spectrum');
  assert.deepEqual(wire.strokes, []);
  assert.deepEqual(wire.cores, []);
  assert.deepEqual(Object.keys(wire).sort(), ['cores', 'strokes', 't']);
});
