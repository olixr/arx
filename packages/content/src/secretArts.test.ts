/**
 * THE SECRET SHELF CONTRACT — the secret ledger's balance and shape
 * tests. The value model is ladderModel.ts, shared with the rung
 * ladder's contract — one model, one law.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TECHNIQUE_MAX_RANK,
  honedAbility,
  techniqueAnchor,
  techniqueRankFor,
  type AbilityDef,
} from '@arx/shared';
import { TECHNIQUES, abilityDef, techniquesFor } from './abilities.js';
import { SECRET_ARTS, secretArtsFor } from './secretArts.js';
import { SECRET_RANKS } from './secretRanks.js';
import { HONABLE, cycleValue, isUtilityArt } from './ladderModel.js';
import { ITEMS } from './items.js';
import { NPCS, scaleNpcDef } from './npcs.js';

/** The four schools that own weapons — the only schools a secret may sit in. */
const WEAPON_SCHOOLS = ['onehand', 'twohand', 'archery', 'arx'] as const;

/**
 * THE RANK DEBT — PAID IN FULL by RANKS FOR THE SHELF: every secret
 * seat carries its three honed steps (secretRanks.ts). The counter
 * stays at zero forever — a new secret art ships WITH its ranks, in
 * the same commit that authors its seat.
 */
const SECRET_RANK_DEBT = 0;

/**
 * THE SECRET BAND's waiver ledger — arts the model flags as outside
 * their school's rung envelope, carried as authored Q-slot numbers
 * until THE PROVING (phase 5) tunes them. A waiver EXPIRES: if a
 * listed art comes back inside the band, the test demands its removal.
 * Never add a NEW art here to dodge the band — tune it instead.
 */
// THE PROVING (phase 5) paid the whole ledger down: the 22 launch
// outliers were tuned into their bands (cooldown-led, identity kept;
// two deep offenders took a damage trim; the three cold arts were
// BUFFED into the floor). The ledger stands empty and must stay so —
// tune new outliers, never waiver them.
const SECRET_BAND_WAIVERS: ReadonlySet<string> = new Set([]);

test('every secret seat sits in a weapon school with a sane anchor', () => {
  for (const seat of SECRET_ARTS) {
    assert.ok(
      (WEAPON_SCHOOLS as readonly string[]).includes(seat.style),
      `${seat.ability}: secrets are taught by weapons — school '${seat.style}' owns none`,
    );
    const anchor = techniqueAnchor(seat);
    assert.ok(
      anchor >= 1 && anchor <= 54,
      `${seat.ability}: anchor ${anchor} must let the art reach Rank IV before 99`,
    );
  }
});

test('THE ANCHOR RULER: anchors climb with the cheapest teacher, never against it', () => {
  // Cheapest teaching damage per art, straight from the weapon roster.
  const minDmg = new Map<string, number>();
  for (const [, item] of ITEMS) {
    const w = item.weapon;
    if (!w?.art) continue;
    minDmg.set(w.art, Math.min(minDmg.get(w.art) ?? Infinity, w.damage));
  }
  for (const style of WEAPON_SCHOOLS) {
    const shelf = secretArtsFor(style)
      .map((s) => ({ id: s.ability, anchor: techniqueAnchor(s), dmg: minDmg.get(s.ability)! }))
      .sort((a, b) => a.dmg - b.dmg);
    for (let i = 1; i < shelf.length; i++) {
      const prev = shelf[i - 1]!;
      const cur = shelf[i]!;
      assert.ok(
        cur.anchor >= prev.anchor,
        `${style}: ${cur.id} (dmg ${cur.dmg}, anchor ${cur.anchor}) anchors below ` +
          `${prev.id} (dmg ${prev.dmg}, anchor ${prev.anchor}) — retier the ruler, not one art`,
      );
    }
  }
});

test('THE SECRET BAND: every damage secret lands inside its school rung envelope, Rank I and Rank IV', () => {
  const breaches: string[] = [];
  const expired: string[] = [];
  for (const style of WEAPON_SCHOOLS) {
    // Two envelopes, one law: Rank I against the rung ladder's base
    // spread, Rank IV against the ladder fully honed — the shelf hones
    // WITH the ladder, never over it.
    const rungs = techniquesFor(style)
      .filter((t) => !t.hidden)
      .filter((t) => !isUtilityArt(abilityDef(t.ability)!));
    const envelope = (rank: number): [number, number] => {
      const vals = rungs.map((t) => cycleValue(honedAbility(abilityDef(t.ability)!, t.ranks, rank)));
      return [Math.min(...vals) * 0.8, Math.max(...vals) * 1.2];
    };
    const bands: Array<[number, [number, number]]> = [
      [1, envelope(1)],
      [TECHNIQUE_MAX_RANK, envelope(TECHNIQUE_MAX_RANK)],
    ];
    for (const seat of secretArtsFor(style)) {
      const ab = abilityDef(seat.ability)!;
      if (isUtilityArt(ab)) continue;
      for (const [rank, [lo, hi]] of bands) {
        const v = cycleValue(honedAbility(ab, seat.ranks, rank));
        const inside = v >= lo && v <= hi;
        if (SECRET_BAND_WAIVERS.has(seat.ability)) {
          if (inside) expired.push(`${style}/${seat.ability}@${rank}`);
          continue;
        }
        if (!inside) {
          breaches.push(
            `${style}/${seat.ability} rank ${rank} cycle ${v.toFixed(2)} outside [${lo.toFixed(2)}, ${hi.toFixed(2)}]`,
          );
        }
      }
    }
  }
  assert.deepEqual(breaches, [], 'tune these; the waiver ledger stays empty');
  assert.deepEqual(expired, [], 'back inside the band — remove the expired waivers');
});

test('THE RANK DEBT is counted, and any paid seat obeys the honed ladder laws', () => {
  let debt = 0;
  for (const seat of SECRET_ARTS) {
    const ab = abilityDef(seat.ability)!;
    if (!seat.ranks) {
      debt++;
      continue;
    }
    assert.equal(
      seat.ranks.length,
      TECHNIQUE_MAX_RANK - 1,
      `${seat.ability}: a ranked secret climbs to Rank ${TECHNIQUE_MAX_RANK}`,
    );
    let prev: AbilityDef = ab;
    seat.ranks.forEach((step, i) => {
      assert.ok(
        step.note.length > 0 && step.note.length <= 90,
        `${seat.ability} rank ${i + 2} note is one honest line`,
      );
      for (const key of Object.keys(step)) {
        assert.ok(HONABLE.has(key), `${seat.ability} rank ${i + 2} touches honable field ${key}`);
      }
      const honed = honedAbility(ab, seat.ranks, i + 2);
      assert.notDeepEqual(honed, prev, `${seat.ability} rank ${i + 2} actually changes the art`);
      prev = honed;
    });
    if (!isUtilityArt(ab)) {
      let prevV = cycleValue(ab);
      for (let rank = 2; rank <= TECHNIQUE_MAX_RANK; rank++) {
        const v = cycleValue(honedAbility(ab, seat.ranks, rank));
        assert.ok(v >= prevV - 1e-9, `${seat.ability} rank ${rank} must not degrade`);
        prevV = v;
      }
    }
  }
  assert.equal(
    debt,
    SECRET_RANK_DEBT,
    'the rank debt moved — decrement SECRET_RANK_DEBT in the commit that authors the ranks',
  );
});

test('THE PAYOFF BRACKET FOR THE SHELF: no secret, at any honed rank, deletes an at-level line fighter', () => {
  // The rung ladder's bracket, extended to the secrets — availability
  // read off the anchor (the band a player honestly holds the teaching
  // weapon at), the def honed to the rank a MASTERED hand would cast at
  // that level (the loan's Rank I is strictly weaker). Same line
  // fighter, same caps.
  const skeleton = NPCS.get('skeleton')!;
  const powerMult = (l: number): number => 1 + l * 0.05;
  const oneTargetBeats = (ab: AbilityDef): number => {
    switch (ab.shape) {
      case 'pulse_nova':
        return ab.pulses ?? 1;
      case 'ground_field':
        return Math.floor((ab.fieldTicks ?? 0) / (ab.pulseEveryTicks ?? 20));
      case 'flurry':
        return ab.hits ?? 1;
      default:
        return 1;
    }
  };
  for (const L of [10, 25, 50, 75, 95]) {
    const fighterHp = scaleNpcDef(skeleton, L).maxHp;
    for (const style of WEAPON_SCHOOLS) {
      for (const seat of secretArtsFor(style)) {
        if (techniqueAnchor(seat) > L) continue;
        const ab = honedAbility(abilityDef(seat.ability)!, seat.ranks, techniqueRankFor(seat, L));
        if (ab.damage < 3) continue;
        const perBeat = Math.round(ab.damage * powerMult(L));
        const beats = oneTargetBeats(ab);
        const instant = beats === 1 ? perBeat : 0;
        assert.ok(
          instant <= fighterHp * 0.75,
          `${style}/${seat.ability} @L${L}: instant ${instant} deletes the ${fighterHp}hp line fighter`,
        );
        assert.ok(
          perBeat * beats <= fighterHp * 1.1,
          `${style}/${seat.ability} @L${L}: full channel ${perBeat * beats} vs ${fighterHp}hp exceeds the payoff cap`,
        );
      }
    }
  }
});

test('RANKS FOR THE SHELF: the rank book covers every seat, and only the seats', () => {
  const seatIds = new Set(SECRET_ARTS.map((s) => s.ability));
  for (const seat of SECRET_ARTS) {
    assert.ok(SECRET_RANKS[seat.ability], `${seat.ability}: every secret seat carries its ranks`);
  }
  for (const key of Object.keys(SECRET_RANKS)) {
    assert.ok(seatIds.has(key), `rank book entry '${key}' names no seat — an orphan or a typo`);
  }
});

test('the shelf never doubles the ladder: shared abilities stay single-citizenship', () => {
  const rungIds = new Set(TECHNIQUES.map((t) => t.ability));
  for (const seat of SECRET_ARTS) {
    assert.ok(!rungIds.has(seat.ability), `${seat.ability} sits on both the ladder and the shelf`);
  }
});
