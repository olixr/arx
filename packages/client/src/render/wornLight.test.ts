import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENCHANT_DEFS } from '@arx/content';
import {
  ELEMENT_PRINT,
  ELEMENT_TINTS,
  PROC_VOICE,
  SLOT_GLINT_PHASE,
  TRAIL_FULL_SPEED,
  TRAIL_MIN_SPEED,
  TRAIL_PRINT_MS,
  arxMark,
  elementTint,
  glintAt,
  markPulse,
  printKind,
  procShape,
  procVoice,
  resolveWornLight,
  tierGlowAlpha,
  tierGlowRadius,
  tierMoteRate,
  trailPrintMs,
  trailStrength,
  wornLightFalloff,
} from './wornLight.js';

// ------------------------------------------------------- the roster holds

test('every school in the roster can be painted', () => {
  // A working whose element has no tint would draw arcane purple and
  // nobody would notice until an ember set shipped looking wrong.
  for (const e of ENCHANT_DEFS) {
    assert.ok(ELEMENT_TINTS[e.element], `no tint for ${e.element} (${e.id})`);
    assert.ok(ELEMENT_PRINT[e.element], `no ground print for ${e.element} (${e.id})`);
  }
});

test('every school writes a DIFFERENT mark on the ground', () => {
  // Nine schools, nine shapes. If two shared one, the trail would be a
  // palette swap and the whole grammar would collapse into a recolor.
  const kinds = new Set(Object.values(ELEMENT_PRINT));
  assert.equal(kinds.size, Object.keys(ELEMENT_PRINT).length);
});

test('every slot has its own glint phase', () => {
  // Shared phases would strobe a tier-1 kit in unison instead of
  // letting the glints travel around the body.
  const phases = Object.values(SLOT_GLINT_PHASE);
  assert.equal(new Set(phases).size, phases.length);
});

// ---------------------------------------------------------- resolution

test('resolving picks the loudest working for the corona', () => {
  const t1 = ENCHANT_DEFS.find((e) => e.tier === 1)!;
  const t3 = ENCHANT_DEFS.find((e) => e.tier === 3)!;
  const light = resolveWornLight({ [t1.slot]: t1.id, [t3.slot]: t3.id });
  assert.equal(light.any, true);
  assert.equal(light.best?.tier, 3);
  assert.equal(light.best?.element, t3.element);
});

test('nothing worn allocates nothing', () => {
  assert.equal(resolveWornLight(undefined).any, false);
  assert.equal(resolveWornLight({}).any, false);
  // An id that is not an enchant is not a crash and not a light.
  assert.equal(resolveWornLight({ body: 'not_a_real_enchant' }).any, false);
});

test('a mark carries its school through to the painters', () => {
  const e = ENCHANT_DEFS.find((x) => x.element === 'ember')!;
  const mark = arxMark(resolveWornLight({ [e.slot]: e.id }).slots[e.slot]!)!;
  assert.equal(mark.element, 'ember');
  assert.equal(mark.mid, elementTint('ember').mid);
  assert.equal(arxMark(undefined), undefined);
});

// ------------------------------------------------------- the tier grammar

test('THE TIER GRAMMAR: tier 1 is a mark and casts no light', () => {
  // A tier-1 working owns exactly one thing, the travelling glint. If
  // it glowed or shed motes there would be no headroom left to make
  // tier 3 feel like an achievement.
  assert.equal(tierGlowAlpha(1), 0);
  assert.equal(tierMoteRate(1), 0);
  assert.equal(markPulse({ mid: '#fff', core: '#fff', tier: 1, element: 'arcane' }, 0, 0), 0);
});

test('THE DARKNESS LAW: tier 2 and up are real light, and climb', () => {
  assert.ok(tierGlowAlpha(2) > 0);
  assert.ok(tierGlowAlpha(3) > tierGlowAlpha(2));
  assert.ok(tierMoteRate(3) > tierMoteRate(2));
  // Tiers 4 and 5 arrive with the roster; the dials must already
  // answer them rather than falling back to darkness.
  assert.ok(tierGlowAlpha(4) > 0);
  assert.ok(tierMoteRate(5) > 0);
});

test('TIER IS LOUDNESS all the way up: 5 > 4 > 3 on every dial', () => {
  // The high bands must never collapse back into tier 3 — that
  // regression shipped once (every dial stepped at 3 and stopped) and
  // made a 15-working tier-4 roster pixel-identical to tier 3.
  assert.ok(tierGlowAlpha(4) > tierGlowAlpha(3));
  assert.ok(tierGlowAlpha(5) > tierGlowAlpha(4));
  assert.ok(tierGlowRadius(4) > tierGlowRadius(3));
  assert.ok(tierGlowRadius(5) > tierGlowRadius(4));
  assert.ok(tierMoteRate(4) > tierMoteRate(3));
  assert.ok(tierMoteRate(5) > tierMoteRate(4));
});

test('the high bands LINGER on the ground: print life climbs 3 < 4 < 5', () => {
  assert.equal(trailPrintMs(3), TRAIL_PRINT_MS);
  assert.ok(trailPrintMs(4) > trailPrintMs(3));
  assert.ok(trailPrintMs(5) > trailPrintMs(4));
  // Tiers 1 and 2 stay on the short clock — the ground must clear.
  assert.equal(trailPrintMs(1), TRAIL_PRINT_MS);
  assert.equal(trailPrintMs(2), TRAIL_PRINT_MS);
});

test('the high bands breathe deeper: markPulse peaks climb with tier', () => {
  const peak = (tier: number): number => {
    const mark = { mid: '#fff', core: '#fff', tier, element: 'arcane' };
    let hi = 0;
    for (let ms = 0; ms < 4000; ms += 20) hi = Math.max(hi, markPulse(mark, ms, 0));
    return hi;
  };
  const p3 = peak(3);
  const p4 = peak(4);
  const p5 = peak(5);
  assert.ok(p4 > p3, `tier 4 must out-breathe tier 3 (${p4} vs ${p3})`);
  assert.ok(p5 > p4, `tier 5 must out-breathe tier 4 (${p5} vs ${p4})`);
  assert.ok(p5 <= 1.001, 'the pulse stays a usable alpha');
});

test('the glint is mostly dark — a glint, never a pulse', () => {
  let lit = 0;
  const steps = 400;
  for (let i = 0; i < steps; i++) if (glintAt((i / steps) * 4000, 0) > 0) lit++;
  const duty = lit / steps;
  assert.ok(duty > 0.05 && duty < 0.25, `glint duty cycle was ${duty}`);
});

// ------------------------------------------------------------- the trail

test('THE TRAIL IS SPEED-GATED: walking leaves nothing', () => {
  // The law the whole trail rests on. Without it a standing player
  // paints a puddle under every market stall in the game.
  assert.equal(trailStrength(0), 0);
  assert.equal(trailStrength(TRAIL_MIN_SPEED - 0.01), 0);
  assert.ok(trailStrength(TRAIL_MIN_SPEED + 0.01) > 0);
});

test('the trail reaches full voice at a run, and never past it', () => {
  assert.equal(trailStrength(TRAIL_FULL_SPEED), 1);
  assert.equal(trailStrength(TRAIL_FULL_SPEED * 4), 1);
  const mid = trailStrength((TRAIL_MIN_SPEED + TRAIL_FULL_SPEED) / 2);
  assert.ok(mid > 0.4 && mid < 0.6);
});

test('an unknown school still gets a print rather than nothing', () => {
  assert.equal(printKind('ember'), 'scorch');
  assert.equal(printKind('void'), 'shadow');
  assert.equal(printKind('nonsense'), 'sigil');
});

// ------------------------------------------------------ the readability cap

test('THE READABILITY CAP: your own light never fades, other people fade', () => {
  assert.equal(wornLightFalloff(0, true), 1);
  assert.equal(wornLightFalloff(1000, true), 1, 'own light is never cut');
  assert.equal(wornLightFalloff(2, false), 1);
  assert.equal(wornLightFalloff(1000, false), 0);
  const near = wornLightFalloff(10, false);
  const far = wornLightFalloff(15, false);
  assert.ok(near > far && far > 0, 'the falloff must be monotonic');
});

// ------------------------------------------------------- woken workings

test('a proc fx is shaped by its ACTION', () => {
  assert.equal(procShape('nova:emberwake'), 'nova');
  assert.equal(procShape('ward:stoneheart'), 'ward');
  assert.equal(procShape('mark:reveal'), 'mark');
  // An id from some future shape falls back rather than throwing.
  assert.equal(procShape('somethingelse:x'), undefined);
  assert.equal(procShape(undefined), undefined);
});

test('inward workings flow inward, outward ones outward', () => {
  // The one reading a player gets without words: did that happen TO me
  // or FROM me. Ward, heal, and surge are the things that happen to you.
  for (const k of ['ward', 'heal', 'surge', 'yield'] as const) {
    assert.ok(PROC_VOICE[k].flow < 0, `${k} should gather inward`);
  }
  for (const k of ['nova', 'bolt', 'chain', 'status'] as const) {
    assert.ok(PROC_VOICE[k].flow > 0, `${k} should throw outward`);
  }
});

test('no working ever shouts as loud as an ability', () => {
  // The grammar of scale: a proc punctuates a fight, it never
  // interrupts one. Nova is the loudest thing a working may be.
  for (const v of Object.values(PROC_VOICE)) {
    assert.ok(v.weight > 0 && v.weight <= 1);
    assert.ok(v.shards <= 6, 'an ability flourish must always out-shout a proc');
  }
  assert.ok(PROC_VOICE.yield.weight < PROC_VOICE.nova.weight);
  assert.ok(PROC_VOICE.mark.weight < PROC_VOICE.ward.weight);
});

test('an unknown proc id still draws something', () => {
  const v = procVoice('who:knows');
  assert.ok(v.weight > 0, 'a working with no shape must not vanish');
});
