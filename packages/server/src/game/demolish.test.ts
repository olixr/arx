import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Detail, Tile } from '@arx/shared';
import { BUILDABLES, buildableForTile } from '@arx/content';
import { GameServer } from './gameServer.js';
import { countItem, emptyInventory } from './inventory.js';
import type { InvSlot } from '@arx/shared';

/**
 * THE SALVAGE LAW + THE LAYER LAW (building v2, phase 2), pinned:
 * tearing down your own work is a short action that hands back half
 * of every material (rounded up, deterministic — no dice, no dials),
 * announces itself with a demolish fx BEFORE the tile patch, and
 * restores exactly ONE layer — a wall raised on your floor tears down
 * to the floor, which re-registers to you over the pristine ground.
 * tickDemolish runs here against a hand-built slate (poiWard idiom).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as { tickDemolish: Fn };

interface BuiltRec {
  tile: number;
  owner: number;
  prevTile: number;
}

function slate(opts: {
  built: BuiltRec | undefined;
  owner?: number;
  prevSolid?: boolean;
  bodyOnTile?: boolean;
  inventory?: InvSlot[];
  /** THE SECOND LAYER: a hanging on the doomed wall, if any. */
  hung?: { detail: number; owner: number; prevDetail: number };
  /** THE CANOPY FALLS: a built record on the tile SOUTH of the wall. */
  south?: BuiltRec;
}) {
  const events: string[] = [];
  const sent: Array<Record<string, unknown>> = [];
  const registered: Array<{ tile: number; owner: number; prevTile: number }> = [];
  const saved: Array<{ tile: number; owner: number; prevTile: number }> = [];
  const drops: Array<{ item: string; qty: number }> = [];
  let builtNow: BuiltRec | undefined = opts.built;
  let hungNow = opts.hung;
  let southNow: BuiltRec | undefined = opts.south;
  const player = {
    characterId: opts.owner ?? 7,
    home: null as { x: number; y: number } | null,
    inventory: opts.inventory ?? emptyInventory(),
    perks: { buildSpeedMult: 1 },
    action: { kind: 'demolish', tx: 4, ty: 5, ticksLeft: 1 },
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
  };
  return {
    players: new Map([[1, player]]),
    positions: { get: () => ({ x: 4.5, y: 6.5 }) },
    crops: new Map(),
    playerSigns: new Map(),
    homesByCharacter: new Map(),
    ringCache: null,
    world: {
      // The demolish action targets (4,5); (4,6) is the tile south of
      // the wall — the canopy-falls probe reads it.
      builtAt: (_tx: number, ty: number) => (ty === 6 ? southNow : ty === 5 ? builtNow : undefined),
      unregisterBuilt: (_tx: number, ty: number) => {
        events.push(ty === 6 ? 'unregisterSouth' : 'unregister');
        if (ty === 6) southNow = undefined;
        else builtNow = undefined;
      },
      naturalGround: () => Tile.Grass,
      registerBuilt: (_tx: number, _ty: number, tile: number, owner: number, prevTile: number) => {
        events.push('register');
        registered.push({ tile, owner, prevTile });
      },
      builtDetailAt: () => hungNow,
      unregisterBuiltDetail: () => {
        events.push('unregisterDetail');
        hungNow = undefined;
      },
    },
    accounts: {
      deleteBuiltTile: () => events.push('deleteRow'),
      saveBuiltTile: (_tx: number, _ty: number, tile: number, owner: number, prevTile: number) =>
        saved.push({ tile, owner, prevTile }),
      deleteBuiltDetail: () => events.push('deleteDetailRow'),
      deleteSign: () => {},
      clearHome: () => {},
    },
    setWorldDetail: (_tx: number, _ty: number, detail: number) =>
      events.push(`detailPatch:${detail}`),
    broadcastFx: (fx: Record<string, unknown>) => events.push(`fx:${fx['kind']}:${fx['id']}`),
    setWorldTile: (_tx: number, _ty: number, tile: number) => events.push(`patch:${tile}`),
    placeDrop: (item: string, qty: number) => drops.push({ item, qty }),
    tileHoldsBody: () => opts.bodyOnTile ?? false,
    cancelAction: (_eid: number, p: { action: unknown }, reason?: string) => {
      p.action = null;
      events.push(`cancel:${reason}`);
    },
    broadcastSign: () => {},
    noteHomeChanged: () => {},
    // observation taps
    events,
    sent,
    registered,
    saved,
    drops,
    player,
  };
}

test('salvage returns ceil-half of every material, deterministically', () => {
  const wall = BUILDABLES.get('wood_wall')!;
  assert.deepEqual(wall.materials, [{ item: 'board', qty: 4 }], 'ledger moved — retune this pin');
  const s = slate({ built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Grass } });
  proto.tickDemolish.call(s, 1, s.player);
  assert.equal(countItem(s.player.inventory, 'board'), 2, 'board×4 wall salvages 2 boards');
  assert.ok(
    s.sent.some((m) => m['t'] === 'chat' && String(m['text']).startsWith('Salvaged: 2 boards')),
    'the quartermaster reports the take',
  );
  assert.ok(s.events.includes('cancel:done'));
});

test('the collapse fx lands BEFORE the tile patch (smashProp precedent)', () => {
  const s = slate({ built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Grass } });
  proto.tickDemolish.call(s, 1, s.player);
  const fxAt = s.events.findIndex((e) => e.startsWith('fx:demolish'));
  const patchAt = s.events.findIndex((e) => e.startsWith('patch:'));
  assert.ok(fxAt >= 0 && patchAt >= 0 && fxAt < patchAt, `order was ${s.events.join(' → ')}`);
  assert.ok(s.events.includes(`fx:demolish:${Tile.WallWood}`), 'fx carries the falling tile id');
});

test('LAYER LAW: a wall on your floor tears down to the floor, re-registered to you', () => {
  const s = slate({ built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.WoodFloor } });
  proto.tickDemolish.call(s, 1, s.player);
  assert.ok(s.events.includes(`patch:${Tile.WoodFloor}`), 'the floor comes back, not grass');
  assert.deepEqual(s.registered, [{ tile: Tile.WoodFloor, owner: 7, prevTile: Tile.Grass }]);
  assert.deepEqual(s.saved, s.registered, 'memory and DB re-register in lockstep');
});

test('a restored plain ground re-registers nothing', () => {
  const s = slate({ built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Dirt } });
  proto.tickDemolish.call(s, 1, s.player);
  assert.equal(s.registered.length, 0);
  assert.ok(s.events.includes(`patch:${Tile.Dirt}`));
});

test('salvage overflow lands at the site instead of vanishing', () => {
  const full = emptyInventory();
  for (let i = 0; i < full.length; i++) full[i] = { item: 'log', qty: 1 };
  const s = slate({
    built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Grass },
    inventory: full,
  });
  proto.tickDemolish.call(s, 1, s.player);
  assert.deepEqual(s.drops, [{ item: 'board', qty: 2 }], 'the overflow becomes a ground pile');
});

test('a record that changed hands mid-swing refuses at the last tick', () => {
  const s = slate({ built: { tile: Tile.WallWood, owner: 9, prevTile: Tile.Grass } });
  proto.tickDemolish.call(s, 1, s.player);
  assert.ok(s.events.includes('cancel:blocked'));
  assert.ok(!s.events.some((e) => e.startsWith('patch:')), 'nothing torn down');
});

test('oriented corner variants salvage through their one corner def', () => {
  for (const t of [
    Tile.WallWoodDiagNE,
    Tile.WallWoodDiagNW,
    Tile.WallWoodDiagSE,
    Tile.WallWoodDiagSW,
  ]) {
    assert.equal(buildableForTile(t)?.id, 'wood_wall_corner', `tile ${t}`);
  }
  assert.equal(buildableForTile(Tile.FenceDiagNW)?.id, 'fence_corner');
  assert.equal(buildableForTile(Tile.Sawhorse)?.id, 'sawhorse');
});

test('THE SECOND LAYER: a hanging falls with its wall, record and all', () => {
  const s = slate({
    built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Grass },
    hung: { detail: Detail.WallBanner + 3, owner: 7, prevDetail: 0 },
  });
  proto.tickDemolish.call(s, 1, s.player);
  assert.ok(s.events.includes('unregisterDetail'), 'the memory record clears');
  assert.ok(s.events.includes('deleteDetailRow'), 'the DB row clears');
  assert.ok(s.events.includes('detailPatch:0'), 'the face goes bare on the wire');
  // The wall itself still tears down normally around it.
  assert.ok(s.events.includes(`patch:${Tile.Grass}`));
  assert.ok(s.events.includes('cancel:done'));
});

test('THE SECOND LAYER: a bare wall demolishes without touching the detail lane', () => {
  const s = slate({ built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Grass } });
  proto.tickDemolish.call(s, 1, s.player);
  assert.ok(!s.events.some((e) => e.startsWith('detailPatch:')), 'no detail patch for no hanging');
  assert.ok(!s.events.includes('deleteDetailRow'));
});

test('THE CANOPY FALLS WITH ITS WALL: a hosted awning drops, salvage spills at the site', () => {
  const shed = BUILDABLES.get('awning_shed')!;
  const s = slate({
    built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Grass },
    south: { tile: Tile.AwningShed + 3, owner: 9, prevTile: Tile.Grass },
  });
  proto.tickDemolish.call(s, 1, s.player);
  assert.ok(s.events.includes('unregisterSouth'), 'the awning record clears');
  // Ceil-half of the awning ledger lands as ground drops (the wall's
  // owner may not be the canopy's — an unowned pile is the honest cut).
  for (const m of shed.materials) {
    assert.ok(
      s.drops.some((d) => d.item === m.item && d.qty === Math.ceil(m.qty / 2)),
      `${m.item} salvage spills`,
    );
  }
  // Both fx fire, canopy first or wall first is not pinned — but both.
  assert.ok(s.events.filter((e) => e.startsWith('fx:demolish')).length >= 2);
  assert.ok(s.events.includes(`patch:${Tile.Grass}`));
});

test('a bare wall drops no canopy and probes no salvage', () => {
  const s = slate({ built: { tile: Tile.WallWood, owner: 7, prevTile: Tile.Grass } });
  proto.tickDemolish.call(s, 1, s.player);
  assert.ok(!s.events.includes('unregisterSouth'));
});
