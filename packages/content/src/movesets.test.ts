import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBO_GRACE_TICKS,
  FINISHER_DAMAGE_MULT,
  FINISHER_KNOCKBACK_MULT,
  FINISHER_RECOVERY_MULT,
  HEAVY_BOLT_MULT,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  PoseState,
  STRIKE_CLOCKS,
  TICK_MS,
  TWOHAND_COMBO_GRACE_TICKS,
  TWOHAND_FINISHER_DAMAGE_MULT,
  TWOHAND_FINISHER_RECOVERY_MULT,
  TWOHAND_KNOCKBACK_MULT,
  TWOHAND_STAGE2_DAMAGE_MULT,
} from '@arx/shared';
import { MOVESETS, PAGE_ROSTER, isDaggerStats, movesetFor, strikePose } from './movesets.js';
import { EQUIPMENT_DEFS } from './equipment/defs.js';

/**
 * THE MOVESET BOOK's contracts: default pages derive from the lane
 * constants (byte-law), grown strings hold the CADENCE CONTRACT
 * (±10%, dagger EXACT), every weapon resolves a page whose style
 * agrees, and the pose alternation law keeps the client's anim clock
 * honest for any string length.
 */

/** Cycle damage per weapon-cooldown-tick: Σ dmgMult / Σ recoveryMult. */
function cycleRate(beats: Array<{ dmgMult: number; recoveryMult: number }>): number {
  const dmg = beats.reduce((a, b) => a + b.dmgMult, 0);
  const cd = beats.reduce((a, b) => a + b.recoveryMult, 0);
  return dmg / cd;
}
/** The legacy three-beat line every string is measured against. */
const LEGACY_RATE = (1 + 1 + FINISHER_DAMAGE_MULT) / (1 + 1 + FINISHER_RECOVERY_MULT); // 1.125

test('byte-law: the default pages derive from the lane constants', () => {
  const g = MOVESETS.great_string.string;
  assert.equal(MOVESETS.great_string.graceTicks, TWOHAND_COMBO_GRACE_TICKS);
  assert.deepEqual(
    g.map((s) => [s.dmgMult, s.kbMult, s.sweepAll, s.recoveryMult]),
    [
      [1, TWOHAND_KNOCKBACK_MULT, true, 1],
      [TWOHAND_STAGE2_DAMAGE_MULT, TWOHAND_KNOCKBACK_MULT, true, 1],
      [
        TWOHAND_FINISHER_DAMAGE_MULT,
        MOVESETS.great_string.string[2]!.kbMult,
        true,
        TWOHAND_FINISHER_RECOVERY_MULT,
      ],
    ],
    'the great string IS the legacy lane',
  );
  const w = MOVESETS.wand_rhythm.string;
  assert.equal(MOVESETS.wand_rhythm.graceTicks, COMBO_GRACE_TICKS);
  assert.equal(w[2]!.dmgMult, HEAVY_BOLT_MULT);
  assert.equal(w[2]!.recoveryMult, HEAVY_BOLT_RECOVERY_MULT);
  assert.equal(w[2]!.splash, HEAVY_BOLT_SPLASH);
  assert.equal(w[2]!.speedMult, 0.8);
  assert.ok(w.every((s) => s.windupTicks === 0), 'bolts spawn at the press — flight is the delay');
  const sf = MOVESETS.sword_string.string[3]!;
  assert.equal(sf.dmgMult, FINISHER_DAMAGE_MULT);
  assert.equal(sf.kbMult, FINISHER_KNOCKBACK_MULT);
  assert.equal(sf.recoveryMult, FINISHER_RECOVERY_MULT);
  assert.equal(sf.sweepAll, true, 'hold-flow keeps the crowd-clear finisher');
});

test('CADENCE CONTRACT: every string holds the legacy line', () => {
  // The four-beat sword sits just under the line: the finisher is
  // EARNED, never a stealth buff.
  const sword = cycleRate(MOVESETS.sword_string.string);
  assert.ok(sword <= LEGACY_RATE && sword >= LEGACY_RATE * 0.95, `sword ${sword}`);
  // The rhythm tap's thrust: single-target only, inside +10%.
  const thrust = cycleRate([
    ...MOVESETS.sword_string.string.slice(0, 3),
    MOVESETS.sword_string.string[3]!.alt!,
  ]);
  assert.ok(thrust <= LEGACY_RATE * 1.1, `thrust ${thrust} inside the +10% band`);
  assert.equal(MOVESETS.sword_string.string[3]!.alt!.sweepAll, false, 'the thrust takes ONE body');
  // The dagger flurry: EXACT parity — identity is rhythm, not power.
  assert.equal(cycleRate(MOVESETS.dagger_flurry.string), LEGACY_RATE, 'flurry parity is EXACT');
  // THE OVERHEAD: the great tap-branch stays inside +10% of the great
  // line, and pays for its weight with a narrow falling lane.
  const greatLine = cycleRate(MOVESETS.great_string.string);
  const overheadLine = cycleRate([
    ...MOVESETS.great_string.string.slice(0, 2),
    MOVESETS.great_string.string[2]!.alt!,
  ]);
  assert.ok(overheadLine <= greatLine * 1.1, `overhead ${overheadLine} vs great ${greatLine}`);
  const overhead = MOVESETS.great_string.string[2]!.alt!;
  assert.ok(overhead.arcHalf! < 0.7, 'the mountain narrows to a falling line');
  assert.ok(overhead.kbMult > MOVESETS.great_string.string[2]!.kbMult, 'and shoves harder');
});

test('every weapon resolves a page whose style agrees; bows have none', () => {
  let flurry = 0;
  for (const d of EQUIPMENT_DEFS) {
    if (!d.weapon) continue;
    const page = movesetFor(d.weapon);
    if (d.weapon.style === 'archery') {
      assert.equal(page, null, `${d.id}: the bow's basic is the draw, not a string`);
      continue;
    }
    assert.ok(page, `${d.id} resolves a page`);
    assert.equal(page!.style, d.weapon.style, `${d.id} page speaks its own style`);
    if (page!.id === 'dagger_flurry') flurry++;
  }
  // The census dagger identity IS the flurry roster — all 58, no leaks.
  assert.equal(flurry, 58, 'the 58 census daggers fight the flurry');
  const one = EQUIPMENT_DEFS.filter((d) => d.weapon?.style === 'onehand');
  for (const d of one) {
    assert.equal(
      movesetFor(d.weapon!)!.id === 'dagger_flurry',
      isDaggerStats(d.weapon!),
      `${d.id} classified by the one three-dial law`,
    );
  }
});

test('THE PAGE ROSTER: every listed id is real, agrees in style, sits on one page', () => {
  const byId = new Map(EQUIPMENT_DEFS.map((d) => [d.id, d]));
  const seen = new Set<string>();
  for (const [pageId, ids] of Object.entries(PAGE_ROSTER)) {
    const page = MOVESETS[pageId as keyof typeof MOVESETS];
    for (const id of ids!) {
      const def = byId.get(id);
      assert.ok(def?.weapon, `${pageId}: ${id} is a real weapon`);
      assert.equal(def!.weapon!.style, page.style, `${pageId}: ${id} agrees in style`);
      assert.ok(!seen.has(id), `${id} sits on exactly one page`);
      seen.add(id);
      assert.equal(movesetFor(def!.weapon!, id)!.id, page.id, `${id} resolves its page`);
    }
  }
  // The curated counts — moving a family is a deliberate edit here.
  assert.equal(PAGE_ROSTER.fencer_line!.length, 14, 'the dueling swords');
  assert.equal(PAGE_ROSTER.reaver_arc!.length, 16, 'the falchion and scimitar lines');
  assert.equal(PAGE_ROSTER.crusher_drop!.length, 5, 'the mauls');
  assert.equal(PAGE_ROSTER.stormcall_weave!.length, 4, 'the battlestaffs');
  assert.deepEqual(PAGE_ROSTER.kingsbane_verdict, ['kingsbane'], 'the first signature');
  // The roster outranks the dagger classifier: a signature knife keeps
  // its own page even though it IS a census dagger.
  const kb = byId.get('kingsbane')!.weapon!;
  assert.ok(isDaggerStats(kb), 'kingsbane is a census dagger');
  assert.equal(movesetFor(kb, 'kingsbane')!.id, 'kingsbane_verdict', 'and fights its own fight');
});

test('CADENCE BANDS: every page holds within ±10% of its class default', () => {
  const baselines = {
    onehand: cycleRate(MOVESETS.sword_string.string),
    twohand: cycleRate(MOVESETS.great_string.string),
    arx: cycleRate(MOVESETS.wand_rhythm.string),
  };
  for (const m of Object.values(MOVESETS)) {
    const base = baselines[m.style];
    const rate = cycleRate(m.string);
    assert.ok(
      rate >= base * 0.9 && rate <= base * 1.1,
      `${m.id}: ${rate.toFixed(3)} within ±10% of the ${m.style} line ${base.toFixed(3)}`,
    );
    // Branches judged on their own whole cycle too.
    const last = m.string[m.string.length - 1]!;
    if (last.alt) {
      const altRate = cycleRate([...m.string.slice(0, -1), last.alt]);
      assert.ok(altRate <= base * 1.1, `${m.id} branch ${altRate.toFixed(3)} inside the band`);
    }
  }
  // The reaver keeps the EXACT legacy line — the old string survives
  // as an identity, not a default.
  assert.equal(cycleRate(MOVESETS.reaver_arc.string), LEGACY_RATE, 'the reaver IS the old chop');
});

test('the pages speak: every name is real prose, dash-free, unique', () => {
  const names = new Set<string>();
  for (const m of Object.values(MOVESETS)) {
    assert.ok(m.name.length >= 8, `${m.id} has a real name`);
    assert.ok(!/[—–-]/.test(m.name), `${m.id}: the dash ban holds in player text`);
    assert.ok(!names.has(m.name), `${m.id}: names never collide`);
    names.add(m.name);
  }
});

test('THE BRANCH: alts live on final beats and match their beat clocks', () => {
  for (const m of Object.values(MOVESETS)) {
    m.string.forEach((beat, i) => {
      if (!beat.alt) return;
      assert.equal(i, m.string.length - 1, `${m.id}: branches live on the payoff beat`);
      // The mirror predicts recovery and choreography without knowing
      // which branch the server took — the clocks must match.
      assert.equal(beat.alt.recoveryMult, beat.recoveryMult, `${m.id} alt recovery agrees`);
      assert.equal(beat.alt.windupTicks, beat.windupTicks, `${m.id} alt windup agrees`);
      assert.equal(beat.alt.alt, undefined, `${m.id} branches never nest`);
    });
  }
});

test('THE POSE ALTERNATION LAW: steel beats never share a pose, any length', () => {
  for (let len = 2; len <= 6; len++) {
    for (let stage = 0; stage < len - 1; stage++) {
      assert.notEqual(
        strikePose('steel', stage, len),
        strikePose('steel', stage + 1, len),
        `steel len ${len}: beats ${stage}→${stage + 1} must flip the pose byte`,
      );
    }
    // The wrap: a payoff flowing into a fresh opener flips too.
    assert.notEqual(
      strikePose('steel', len - 1, len),
      strikePose('steel', 0, len),
      `steel len ${len}: the wrap flips`,
    );
  }
  // The wand dialect repeats Cast by DESIGN (the bolt tracer is the
  // beat's feedback); only the payoff orb flips the byte.
  assert.equal(strikePose('wand', 0, 3), strikePose('wand', 1, 3));
  assert.notEqual(strikePose('wand', 1, 3), strikePose('wand', 2, 3));
  // The legacy three-beat mappings, byte-for-byte.
  assert.deepEqual(
    [0, 1, 2].map((s) => strikePose('steel', s, 3)),
    [PoseState.Attack, PoseState.Attack2, PoseState.Attack3],
  );
  assert.deepEqual(
    [0, 1, 2].map((s) => strikePose('wand', s, 3)),
    [PoseState.Cast, PoseState.Cast, PoseState.Attack3],
  );
});

test('THE HONEST SWING: windups land inside the pose hold and the class cadence', () => {
  const minCd: Record<string, number> = {};
  for (const d of EQUIPMENT_DEFS) {
    if (!d.weapon || d.weapon.style === 'archery') continue;
    minCd[d.weapon.style] = Math.min(minCd[d.weapon.style] ?? Infinity, d.weapon.cooldownTicks);
  }
  for (const m of Object.values(MOVESETS)) {
    const clocks = STRIKE_CLOCKS[m.style];
    m.string.forEach((beat, i) => {
      const clock = i === m.string.length - 1 ? clocks.finisher : clocks.swing;
      assert.ok(
        beat.windupTicks < clock.holdTicks,
        `${m.id}[${i}]: impact inside the pose hold`,
      );
      assert.ok(
        beat.windupTicks * TICK_MS <= clock.ms,
        `${m.id}[${i}]: impact inside the choreography`,
      );
      assert.ok(
        beat.windupTicks < (minCd[m.style] ?? Infinity),
        `${m.id}[${i}]: one blow in flight at a time (windup < fastest ${m.style} cadence)`,
      );
    });
  }
});
