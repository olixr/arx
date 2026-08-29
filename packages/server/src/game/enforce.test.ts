import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACTIONS } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE WATCH HAS EYES (docs/factions-plan.md Phase 2) — the one aggro
 * door's faction guard, and the assault deed, exercised for real on
 * minimal fake hosts (the standing.test rig pattern).
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  npcAggro: AnyFn;
  cancelNpcCast: AnyFn;
  resetBossEngagement: AnyFn;
  npcRefillGrit: AnyFn;
  npcTemper: AnyFn;
  npcFactionOf: AnyFn;
  npcEnforcerFid: AnyFn;
  playerBandWith: AnyFn;
  chargeAssault: AnyFn;
  creditDeed: AnyFn;
  creditStanding: AnyFn;
};

function fakeNpc(defId: string): Record<string, unknown> {
  return {
    state: 'idle',
    targetEid: null,
    def: { id: defId, pack: undefined },
    navBest: 0,
    navStuck: 0,
    navRefX: 0,
    navRefY: 0,
    steer: { side: 0, ticks: 0 },
    nav: null,
    progressLane: null,
    nextRepathTick: 0,
    losUntilTick: 0,
    alert: 0,
    alertEid: null,
    alertVelX: 0,
    alertVelY: 0,
    alertSeenTick: 0,
    alertX: 0,
    alertY: 0,
    huntWps: null,
    huntIdx: 0,
    huntWaitUntilTick: 0,
    standTicks: 0,
  };
}

interface FakePlayer {
  characterId: number;
  standing: Map<string, number>;
  repSig: string;
  flags: Map<string, number>;
  session: { sendJson: () => void };
}

function slate(opts: {
  standing?: Record<string, number>;
  actorSlug?: string;
}): { s: Record<string, unknown>; player: FakePlayer } {
  const player: FakePlayer = {
    characterId: 7,
    standing: new Map(Object.entries(opts.standing ?? {})),
    repSig: '',
    flags: new Map(),
    session: { sendJson: () => {} },
  };
  const s: Record<string, unknown> = {
    tickCount: 100,
    players: new Map([[11, player]]),
    positions: new Map([[11, { x: 5, y: 5 }]]),
    pets: new Map(), companions: new Map(),
    livestock: new Map(),
    // THE WILD TAKES SIDES: the door now reads the npc roster for
    // NPC-shaped targets (kin peace) — empty here, players only.
    npcs: new Map(),
    actors: new Map(opts.actorSlug ? [[21, { actor: { id: opts.actorSlug } }]] : []),
    npcAggro: proto.npcAggro,
    cancelNpcCast: proto.cancelNpcCast,
    // THE HUNTER'S HEART: the door seeds the grit ledger (long pull).
    npcRefillGrit: proto.npcRefillGrit,
    npcTemper: proto.npcTemper,
    // The retarget teardown is one owned act now (audit 2026-08-15).
    resetBossEngagement: proto.resetBossEngagement,
    npcFactionOf: proto.npcFactionOf,
    npcEnforcerFid: proto.npcEnforcerFid,
    playerBandWith: proto.playerBandWith,
    chargeAssault: proto.chargeAssault,
    creditDeed: proto.creditDeed,
    creditStanding: proto.creditStanding,
    pushRep: () => {},
    pushQuestAvail: () => {},
    accounts: { saveStanding: () => {} },
  };
  return { s, player };
}

const aggro = (
  s: Record<string, unknown>,
  npc: Record<string, unknown>,
  opts?: { force?: boolean },
): void => {
  (proto.npcAggro as (...a: unknown[]) => void).call(s, 21, npc, 11, opts ?? {});
};

test('THE PEACE HOLDS AT THE DOOR: a camp never opens on a friend', () => {
  const trusted = FACTIONS.bands.trusted;
  const { s } = slate({ standing: { reavers: trusted } });
  const npc = fakeNpc('brigand');
  aggro(s, npc);
  assert.equal(npc.state, 'idle', 'unforced aggro on a trusted friend is refused');
  aggro(s, npc, { force: true });
  assert.equal(npc.state, 'chase', 'a blow always forces');
});

test('below the peace band the camp opens as ever', () => {
  const { s } = slate({ standing: { reavers: FACTIONS.bands.known } });
  const npc = fakeNpc('brigand');
  aggro(s, npc);
  assert.equal(npc.state, 'chase', 'known is not the peace band');
});

test('an enforcer opens ONLY on an outlaw', () => {
  const neutral = slate({ actorSlug: 'captain_aldis' });
  const guard = fakeNpc('actor:captain_aldis');
  aggro(neutral.s, guard);
  assert.equal(guard.state, 'idle', 'the law never opens on the lawful');

  const outlaw = slate({
    actorSlug: 'captain_aldis',
    standing: { fordgate: FACTIONS.bands.outlaw },
  });
  const guard2 = fakeNpc('actor:captain_aldis');
  aggro(outlaw.s, guard2);
  assert.equal(guard2.state, 'chase', 'an outlaw is hunted on sight');
});

test('non-faction bodies are untouched by the guard', () => {
  const { s } = slate({ standing: { reavers: 100 } });
  const wolf = fakeNpc('wolf');
  aggro(s, wolf);
  assert.equal(wolf.state, 'chase', 'a wolf reads no ledger');
});

test('the assault deed charges enforcers only, through the one door', () => {
  const { s, player } = slate({ actorSlug: 'captain_aldis' });
  (proto.chargeAssault as (...a: unknown[]) => void).call(s, 11, 21);
  assert.equal(
    player.standing.get('fordgate'),
    FACTIONS.deeds.assaultEnforcer,
    'drawing on the watch is the assault deed',
  );

  const civ = slate({ actorSlug: 'banker_cormund' });
  (proto.chargeAssault as (...a: unknown[]) => void).call(civ.s, 11, 21);
  assert.equal(civ.player.standing.size, 0, 'a member who is not the law charges nothing');
});
