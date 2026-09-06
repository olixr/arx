import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FRONTIER, POI_DEFS, replacePoiDefs, validatePoiDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * BAND 7 ENGINE (L5): THE TOLL SURVEY. A pinned def declaring
 * `toll: true` counts for `world:toll_near` even on an authored cell
 * (the one exception to the authored skip), while `threat_near` and
 * `threat_bold` stay procedural-only. Slate convention (the
 * dialogueDoors pattern): private methods over plain maps.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

function withTestDef(raw: Record<string, unknown>, body: () => void): void {
  const res = validatePoiDef(raw);
  assert.ok(res.ok, JSON.stringify(res));
  if (!res.ok) return;
  const before = [...POI_DEFS.values()];
  replacePoiDefs([...before, res.def]);
  try {
    body();
  } finally {
    replacePoiDefs(before);
  }
}

const BAR = {
  id: 'test_toll_bar',
  name: 'Test bar',
  tiers: [1, 3],
  weight: 0,
  prefabs: ['poi_bandit_hollow'],
  garrison: [{ npc: 'brigand', count: [2, 2], role: 'holdfast' }],
  passFlag: 'charter_pass',
  toll: true,
};

const row = (defId: string, x: number, over: Record<string, unknown> = {}) => ({
  site: { defId, anchorX: x, anchorY: 0 },
  clearedAt: null,
  emberUntil: null,
  stage: 0,
  ...over,
});

function slate(rows: Array<[string, unknown]>, authored: string[]) {
  return {
    poiLedger: new Map(rows),
    authoredCells: () => new Map(authored.map((k) => [k, `site_${k}`])),
    poiThreatens: proto.poiThreatens,
    watchSurvey: proto.watchSurvey,
    strongholdLedger: undefined,
  };
}

test('THE TOLL SURVEY: a pinned toll def answers world:toll_near inside the watch, and nothing else', () => {
  withTestDef(BAR, () => {
    const s = slate([['0,0', row('test_toll_bar', 100)]], ['0,0']);
    const ask = (flag: string, sx: number) =>
      (proto.worldFlagAnswer as Fn).call(s, flag as never, {} as never, sx as never, 0 as never) as boolean;
    // Hale at the crofts, thirty tiles east of the bar: the toll is news.
    assert.equal(ask('world:toll_near', 130), true);
    // ...but an authored cell is never a THREAT: the near/bold reads stay procedural-only.
    assert.equal(ask('world:threat_near', 130), false);
    assert.equal(ask('world:threat_bold', 130), false);
    assert.equal(ask('world:calm', 130), true);
    // On Dawnmead's green, past the watch: no news.
    assert.equal(ask('world:toll_near', 100 + FRONTIER.watchTiles + 40), false);
    // A broken bar is over.
    s.poiLedger.set('0,0', row('test_toll_bar', 100, { clearedAt: 1 }));
    assert.equal(ask('world:toll_near', 130), false);
  });
});

test('THE TOLL SURVEY: an authored camp without the flag is not a toll; the rolled road_toll keeps its name-match', () => {
  const s = slate(
    [
      ['0,0', row('bandit_camp', 100)],
      ['1,0', row('road_toll', 160)],
    ],
    ['0,0'],
  );
  const survey = (sx: number) =>
    (proto.watchSurvey as Fn).call(s, sx as never, 0 as never) as { near: boolean; bold: boolean; toll: boolean };
  // Beside the authored camp only: nothing at all.
  s.poiLedger.delete('1,0');
  assert.deepEqual(survey(120), { near: false, bold: false, toll: false });
  // The rolled toll within the watch: near AND toll, exactly as shipped.
  s.poiLedger.set('1,0', row('road_toll', 160));
  assert.deepEqual(survey(120), { near: true, bold: false, toll: true });
});
