import { test } from 'node:test';
import assert from 'node:assert/strict';
import { honedAbility, xpForLevel } from '@arx/shared';
import { abilityDef, techniquePoolDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE MASTER'S LICENSE (callings-v2, THE FILLED HALL) — the fourth
 * citizenship in the technique pool, pinned on bare slates:
 *
 * - a licensed art SEATS whatever its rung, deed, or teacher says;
 * - it CASTS at max(natural rank, the license rank);
 * - withdraw the license and the seat sleeps (seatDormant), never
 *   emptied — the loan law's precedent, extended.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  setTechnique: AnyFn;
  seatAbility: AnyFn;
  seatDormant: AnyFn;
  masteredArt: AnyFn;
  equippedArtIds: AnyFn;
  techSeat: AnyFn;
  sendTechniques: AnyFn;
  sendCooldowns: AnyFn;
};
const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

// A rung art (farming 30) and a secret art (onehand, weapon-taught).
const RUNG = 'earthen_brace';
const SECRET = 'crescent_sweep';

function slate(opts: { farming: number; onehand: number; licensed: Array<[string, number]> }) {
  const sent: unknown[] = [];
  const player = {
    characterId: 0,
    skills: { farming: xpForLevel(opts.farming), onehand: xpForLevel(opts.onehand) },
    flags: new Map<string, number>(),
    techniques: [null, null] as [string | null, string | null],
    licensedArts: new Map(opts.licensed),
    equipment: {},
    session: { sendJson: (m: unknown) => sent.push(m) },
  };
  const s = {
    players: new Map([[1, player]]),
    techSeat: proto.techSeat,
    masteredArt: proto.masteredArt,
    equippedArtIds: () => new Set<string>(),
    sendTechniques: () => undefined,
    sendCooldowns: () => undefined,
    setTechnique: proto.setTechnique,
    seatAbility: proto.seatAbility,
    seatDormant: proto.seatDormant,
  };
  return { s, player, sent };
}

test('a rung art under its level refuses without a license and seats with one', () => {
  const bare = slate({ farming: 10, onehand: 1, licensed: [] });
  call(proto.setTechnique, bare.s, 1, RUNG, 0);
  assert.equal(bare.player.techniques[0], null, 'unlicensed and under-level: refused');
  assert.ok(String((bare.sent[0] as { text?: string })?.text ?? '').includes('unlocks at'), 'the refusal speaks');

  const lic = slate({ farming: 10, onehand: 1, licensed: [[RUNG, 2]] });
  call(proto.setTechnique, lic.s, 1, RUNG, 0);
  assert.equal(lic.player.techniques[0], RUNG, 'licensed: seated');
});

test('a secret art seats under license with no teaching weapon in hand', () => {
  const s = slate({ farming: 1, onehand: 1, licensed: [[SECRET, 1]] });
  call(proto.setTechnique, s.s, 1, SECRET, 0);
  assert.equal(s.player.techniques[0], SECRET);
  assert.equal(call(proto.seatDormant, s.s, s.player, 0), false, 'a licensed seat is awake');
});

test('a licensed art casts at max(natural, license) and sleeps when the license is withdrawn', () => {
  const tech = techniquePoolDef(RUNG)!;
  const base = abilityDef(RUNG)!;
  const s = slate({ farming: 10, onehand: 1, licensed: [[RUNG, 3]] });
  s.player.techniques[0] = RUNG;
  const cast = call(proto.seatAbility, s.s, s.player, 0);
  assert.deepEqual(cast, honedAbility(base, tech.ranks, 3), 'casts at the license rank III');
  // The hand climbs past the license: natural wins.
  s.player.skills.farming = xpForLevel(99);
  assert.deepEqual(call(proto.seatAbility, s.s, s.player, 0), honedAbility(base, tech.ranks, 4));
  // License withdrawn under level: the seat sleeps, never empties.
  s.player.skills.farming = xpForLevel(10);
  s.player.licensedArts.clear();
  assert.equal(call(proto.seatDormant, s.s, s.player, 0), true);
  assert.equal(s.player.techniques[0], RUNG, 'the arrangement is the player\'s');
  // At its rung again, awake.
  s.player.skills.farming = xpForLevel(30);
  assert.equal(call(proto.seatDormant, s.s, s.player, 0), false);
});
