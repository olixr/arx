import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUNDER_MAX_PCT, SKILL_IDS } from '@arx/shared';
import { NPCS } from './npcs.js';
import { LANE_RESIST_MULT, LANE_WEAK_MULT, NPC_LANES, laneOf } from './npcLanes.js';
import { SET_WORDS } from './equipment/setWords.js';
import { TEMPERS } from './equipment/tempers.js';
import { ENCHANT_DEFS, type EnchantEffect, type ProcAction } from './equipment/enchants.js';

/**
 * THE LEDGER (buildcraft Phase 6) — the cross-system balance
 * constitution, pinned where the per-system tests cannot see:
 *
 * - every lane temperament binds to a real body and the merge is
 *   live; no body is weak to and turns the same lane; the flesh
 *   stays fair (warm families carry no lanes);
 * - the lane multipliers stay categorical and bounded — a turned
 *   lane still hurts, a bitten lane never doubles;
 * - the vs-state ceiling holds across ALL THREE authoring systems
 *   (words, tempers, enchants) — the plan's 50% is the law's edge,
 *   the wave-one roster stays at or under 30;
 * - every authored sunder source respects SUNDER_MAX_PCT — the seam
 *   clamps anyway, but an authored number past the clamp is a lie
 *   on a card.
 */

test('every lane temperament binds to a live body, and the merge holds', () => {
  for (const [id, lanes] of Object.entries(NPC_LANES)) {
    const def = NPCS.get(id);
    assert.ok(def, `${id} has lanes but no body`);
    assert.deepEqual(def.lanes, lanes, `${id} lanes did not merge`);
    for (const lane of lanes.weak ?? []) {
      assert.ok(!(lanes.resist ?? []).includes(lane), `${id} both turns and fears ${lane}`);
    }
    assert.ok((lanes.weak?.length ?? 0) + (lanes.resist?.length ?? 0) > 0, `${id} lanes empty`);
  }
});

test('the flesh stays fair: warm families carry no lanes', () => {
  for (const id of ['wolf', 'brigand', 'goblin', 'boar', 'deer']) {
    if (!NPCS.has(id)) continue;
    assert.equal(NPCS.get(id)!.lanes, undefined, `${id} should keep no lanes`);
  }
});

test('lane multipliers stay categorical and bounded', () => {
  assert.ok(LANE_RESIST_MULT >= 0.75 && LANE_RESIST_MULT < 1, 'a turned lane still hurts');
  assert.ok(LANE_WEAK_MULT > 1 && LANE_WEAK_MULT <= 1.3, 'a bitten lane never doubles');
  for (const skill of SKILL_IDS) {
    // laneOf must total over every skill without throwing — the seam
    // feeds it whatever style a blow rode in on.
    const lane = laneOf(skill);
    assert.ok(lane === null || ['onehand', 'twohand', 'archery', 'arx'].includes(lane));
  }
});

function allEffects(): Array<{ owner: string; fx: EnchantEffect }> {
  const out: Array<{ owner: string; fx: EnchantEffect }> = [];
  for (const [set, words] of Object.entries(SET_WORDS)) {
    for (const w of words) for (const fx of w.effects) out.push({ owner: `word:${set}`, fx });
  }
  for (const [id, effects] of Object.entries(TEMPERS)) {
    for (const fx of effects) out.push({ owner: `temper:${id}`, fx });
  }
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) out.push({ owner: `enchant:${e.id}`, fx });
  }
  return out;
}

test('the vs-state ceiling holds across every authoring system', () => {
  for (const { owner, fx } of allEffects()) {
    if (fx.kind === 'vsState') {
      assert.ok(fx.pct <= 30, `${owner}: vsState ${fx.pct} past the wave-one line`);
      assert.ok(fx.pct > 0, `${owner}: a clause that pays nothing`);
    }
  }
});

test('every authored sunder source respects the mark ceiling', () => {
  const checkAction = (owner: string, a: ProcAction): void => {
    if (a.do === 'status' && a.status === 'sunder') {
      assert.ok(a.power <= SUNDER_MAX_PCT, `${owner}: sunder ${a.power} past the clamp`);
      assert.ok(a.power >= 10, `${owner}: a crack under 10 reads as nothing`);
    }
  };
  for (const { owner, fx } of allEffects()) {
    if (fx.kind === 'proc') checkAction(owner, fx.action);
    if (fx.kind === 'onHitStatus' && fx.status === 'sunder') {
      assert.ok(fx.power <= SUNDER_MAX_PCT, `${owner}: sunder ${fx.power} past the clamp`);
    }
  }
});
