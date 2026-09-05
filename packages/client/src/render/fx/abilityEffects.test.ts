/**
 * THE LIBRARY IS THE VOICE — every cast on the wire speaks the library.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivePlan, MutedParticles, planCues, planEffects, planFor, scaleForRadius } from './abilityEffects.js';
import { EFFECTS } from './library/index.js';
import { PLANS } from './plans/index.js';
import { SIGNATURES } from '../fxSignatures.js';
import { FX_STYLES, fxStyleFor } from '../abilityFx.js';

const KINDS = ['nova', 'blast', 'arc', 'dash', 'bolt', 'beam', 'warp', 'summon', 'field', 'vanish', 'reaction'];

test('every signature and every styled ability resolves to a plan of existing effects, for every wire kind', () => {
  const ids = new Set([...Object.keys(SIGNATURES), ...Object.keys(FX_STYLES)]);
  assert.ok(ids.size > 200);
  for (const id of ids) {
    for (const kind of KINDS) {
      const plan = planFor(id, kind, fxStyleFor(id, undefined));
      assert.ok(plan && plan.cues.length > 0, `${id}/${kind} has no voice`);
      for (const cue of plan.cues) assert.ok(EFFECTS[cue.id], `${id}/${kind} cues ${cue.id}, which does not exist`);
    }
  }
});

test('pure instruments keep their own voice: no plan, no mute', () => {
  for (const kind of ['telegraph', 'charge', 'note']) {
    assert.equal(planFor('fireburst', kind, fxStyleFor('fireburst', undefined)), null);
    assert.equal(derivePlan(kind, fxStyleFor(undefined, '#ff8844')), null);
  }
});

test('an unknown ability still speaks: the wire color derives a family', () => {
  const plan = planFor('no_such_art', 'nova', fxStyleFor(undefined, '#88aaff'));
  assert.ok(plan && plan.cues.length > 0);
});

test('curated plans name real effects and standing cues carry a beat', () => {
  for (const [id, plan] of Object.entries(PLANS)) {
    assert.ok(plan.cues.length > 0, `${id} has no cues`);
    assert.equal(planEffects(plan).length, planCues(plan).length, `${id} cues an effect that does not exist`);
    for (const cue of planCues(plan)) {
      if (cue.every !== undefined) assert.ok(cue.every >= 0.5, `${id} re-speaks too fast`);
      if (cue.scale !== undefined) assert.ok(cue.scale > 0 && cue.scale <= 3, `${id} scale ${cue.scale}`);
    }
  }
});

test('the cast scale follows the wire radius inside its rails', () => {
  assert.equal(scaleForRadius(1), 1);
  assert.equal(scaleForRadius(0.2), 0.8);
  assert.equal(scaleForRadius(9), 2.4);
  assert.equal(planFor('envenom', 'nova', fxStyleFor('envenom', undefined))!.cues[0]!.id, 'venom.burst');
});

test('THE MUTED VOICE: nothing said through the mute reaches the pool', () => {
  const m = new MutedParticles();
  m.burst(0, 0, 50, ['#fff'], { life: 9 });
  const e = m.emit({ x: 0, y: 0, rate: 500, dur: 5, pops: [{ colors: ['#fff'], opts: { life: 9 } }] });
  const f = m.field({ kind: 'lift', x: 0, y: 0, radius: 2, strength: 5, dur: 5 });
  m.recipe();
  for (let i = 0; i < 30; i++) m.update(0.016);
  assert.equal(m.count(), 0);
  assert.equal(m.emitterCount(), 0);
  assert.equal(m.fieldCount(), 0);
  assert.equal(e.alive, false);
  assert.equal(f.alive, false);
  e.stop();
  f.stop();
});
