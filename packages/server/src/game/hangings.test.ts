import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Detail, Tile, wallBannerDetail } from '@arx/shared';
import { GameServer } from './gameServer.js';

/**
 * THE HANGING LAW (exterior decor Phase 0), pinned: a wall-hung detail
 * lands only on a wall tile that PRESENTS A SOUTH FACE (wall-run
 * member, south neighbour not), only over an empty face or your own
 * earlier hanging, and the record carries prev_detail at depth 1 —
 * the built_tiles layer law, one lane over. hangDetail/removeHanging
 * run here against a hand-built slate (the demolish.test idiom).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  hangDetail: Fn;
  removeHanging: Fn;
  hangFaceOk: Fn;
};

function slate(opts: {
  ground?: number;
  south?: number;
  detailNow?: number;
  hung?: { detail: number; owner: number; prevDetail: number };
  characterId?: number;
}) {
  const events: string[] = [];
  const sent: Array<Record<string, unknown>> = [];
  const registered: Array<{ detail: number; owner: number; prevDetail: number }> = [];
  const saved: Array<{ detail: number; owner: number; prevDetail: number }> = [];
  let hungNow = opts.hung;
  let detailNow = opts.detailNow ?? opts.hung?.detail ?? 0;
  const player = {
    characterId: opts.characterId ?? 7,
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
  };
  return {
    players: new Map([[1, player]]),
    positions: { get: () => ({ x: 4.5, y: 6.5 }) },
    world: {
      ensure: () => {},
      groundAt: (_tx: number, ty: number) =>
        ty === 5 ? (opts.ground ?? Tile.WallWood) : (opts.south ?? Tile.Grass),
      detailAt: () => detailNow,
      builtDetailAt: () => hungNow,
      registerBuiltDetail: (
        _tx: number,
        _ty: number,
        detail: number,
        owner: number,
        prevDetail: number,
      ) => {
        events.push('register');
        registered.push({ detail, owner, prevDetail });
        hungNow = { detail, owner, prevDetail };
        detailNow = detail;
      },
      unregisterBuiltDetail: () => {
        events.push('unregister');
        hungNow = undefined;
      },
    },
    accounts: {
      saveBuiltDetail: (_tx: number, _ty: number, detail: number, owner: number, prevDetail: number) =>
        saved.push({ detail, owner, prevDetail }),
      deleteBuiltDetail: () => events.push('deleteRow'),
    },
    setWorldDetail: (_tx: number, _ty: number, detail: number) => {
      events.push(`detailPatch:${detail}`);
      detailNow = detail;
    },
    // The slate is not a real instance — the prototype's own face
    // test binds here so `this.hangFaceOk(...)` resolves against the
    // mock world (it reads only world.groundAt).
    hangFaceOk: proto.hangFaceOk,
    // observation taps
    events,
    sent,
    registered,
    saved,
    player,
  };
}

const BANNER = wallBannerDetail(2);

test('a south-facing wall accepts a hanging; record, row and patch land together', () => {
  const s = slate({});
  assert.equal(proto.hangDetail.call(s, 1, 4, 5, BANNER), true);
  assert.deepEqual(s.registered, [{ detail: BANNER, owner: 7, prevDetail: 0 }]);
  assert.deepEqual(s.saved, s.registered, 'memory and DB register in lockstep');
  assert.ok(s.events.includes(`detailPatch:${BANNER}`));
});

test('no wall, no hanging — and a buried face refuses too', () => {
  // Open grass is not a wall.
  const bare = slate({ ground: Tile.Grass });
  assert.equal(proto.hangDetail.call(bare, 1, 4, 5, BANNER), false);
  assert.ok(bare.sent.some((m) => String(m['text']).includes('no wall face')));
  // A wall whose south neighbour is also wall presents no face.
  const buried = slate({ south: Tile.WallWood });
  assert.equal(proto.hangDetail.call(buried, 1, 4, 5, BANNER), false);
  assert.equal(buried.registered.length, 0);
});

test('only hangable walls carry cloth: doorways, windows and corners refuse', () => {
  // Every one of these is a WALL_RUN member whose painter never runs
  // the hangings pass — accepting a detail there would strand it as
  // invisible orphan state (the footing law's whole point).
  for (const t of [
    Tile.DoorwayWood,
    Tile.DoorwayStoneWide,
    Tile.WallWoodWindow,
    Tile.WallStoneWindow,
    Tile.WallWoodDiagNE,
    Tile.WallStoneDiagSW,
  ]) {
    const s = slate({ ground: t });
    assert.equal(proto.hangDetail.call(s, 1, 4, 5, BANNER), false, `tile ${t} must refuse`);
    assert.equal(s.registered.length, 0);
  }
  // The garrison curtain DOES dress faces — it hangs.
  const curtain = slate({ ground: Tile.WallGarrison });
  assert.equal(proto.hangDetail.call(curtain, 1, 4, 5, BANNER), true);
});

test('an occupied face refuses a stranger and yields to its own', () => {
  // Authored cloth (no built record) is never overwritten.
  const authored = slate({ detailNow: Detail.BannerCrown });
  assert.equal(proto.hangDetail.call(authored, 1, 4, 5, BANNER), false);
  assert.ok(authored.sent.some((m) => String(m['text']).includes('already bears')));
  // Someone else's hanging is theirs.
  const theirs = slate({ hung: { detail: BANNER, owner: 9, prevDetail: 0 } });
  assert.equal(proto.hangDetail.call(theirs, 1, 4, 5, BANNER), false);
  // Your own re-hangs freely, and the ORIGINAL prev carries through
  // (depth-1 layer law: the first hang's capture is the one restored).
  const mine = slate({ hung: { detail: BANNER, owner: 7, prevDetail: Detail.Tapestry } });
  assert.equal(proto.hangDetail.call(mine, 1, 4, 5, wallBannerDetail(5)), true);
  assert.deepEqual(mine.registered, [
    { detail: wallBannerDetail(5), owner: 7, prevDetail: Detail.Tapestry },
  ]);
});

test('only real hangings hang; guests and far walls refuse', () => {
  const s = slate({});
  assert.equal(proto.hangDetail.call(s, 1, 4, 5, Detail.Rug), false, 'ground decor never hangs');
  const guest = slate({ characterId: -1 });
  assert.equal(proto.hangDetail.call(guest, 1, 4, 5, BANNER), false);
  const far = slate({});
  assert.equal(proto.hangDetail.call(far, 1, 40, 5, BANNER), false, 'out of reach');
});

test('removal restores the prior detail and clears the row', () => {
  const s = slate({ hung: { detail: BANNER, owner: 7, prevDetail: Detail.Tapestry } });
  assert.equal(proto.removeHanging.call(s, 1, 4, 5), true);
  assert.ok(s.events.includes('unregister'));
  assert.ok(s.events.includes('deleteRow'));
  assert.ok(s.events.includes(`detailPatch:${Detail.Tapestry}`), 'the prior cloth returns');
  // A stranger's hanging refuses removal.
  const theirs = slate({ hung: { detail: BANNER, owner: 9, prevDetail: 0 } });
  assert.equal(proto.removeHanging.call(theirs, 1, 4, 5), false);
  assert.ok(theirs.sent.some((m) => String(m['text']).includes('Nothing of yours')));
});

test('hangVariant: dyes band, narrow rosters clamp home, anchors hold', () => {
  const hv = (a: number, v?: number) =>
    (proto as unknown as { hangVariant: Fn }).hangVariant.call({}, a, v);
  assert.equal(hv(Detail.WallBanner, 4), Detail.WallBanner + 4);
  assert.equal(hv(Detail.Pennant, 9), Detail.Pennant + 9);
  assert.equal(hv(Detail.BracketSign, 5), Detail.BracketSign + 5);
  // Motifs stop at 8, species at 3 — a wider dial clamps to anchor
  // instead of wandering into a neighbouring band.
  assert.equal(hv(Detail.BracketSign, 9), Detail.BracketSign);
  assert.equal(hv(Detail.Trellis, 2), Detail.Trellis + 2);
  assert.equal(hv(Detail.Trellis, 5), Detail.Trellis);
  assert.equal(hv(Detail.WallBasket, 7), Detail.WallBasket);
  assert.equal(hv(Detail.WallBanner, undefined), Detail.WallBanner);
  assert.equal(hv(Detail.WallBanner, 0), Detail.WallBanner);
});
