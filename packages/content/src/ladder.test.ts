/**
 * THE LADDER CONTRACT — the rung ladder's balance tests.
 *
 * The value model lives in ladderModel.ts (shared with the secret
 * shelf's contract in secretArts.test.ts — one model, one law). This
 * file keeps the LADDER honest: no rung, fully honed, may tower over
 * or sink under its style.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RANK_SURPLUS,
  TECHNIQUE_MAX_RANK,
  honedAbility,
  rankLevel,
  rankStride,
  techniqueAnchor,
  techniqueRankFor,
  type AbilityDef,
} from '@arx/shared';
import { ABILITIES, TECHNIQUES, abilityDef, techniquesFor } from './abilities.js';
import { HONABLE, channelBeats, cycleValue, isUtilityArt, rootedPremium } from './ladderModel.js';
import { NPCS, scaleNpcDef } from './npcs.js';

test('every technique carries a full honing ladder of well-formed steps', () => {
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability);
    assert.ok(ab, `${tech.ability} resolves`);
    assert.ok(tech.ranks, `${tech.ability} has rank steps`);
    assert.equal(
      tech.ranks!.length,
      TECHNIQUE_MAX_RANK - 1,
      `${tech.ability} climbs to Rank ${TECHNIQUE_MAX_RANK}`,
    );
    let prev = ab!;
    tech.ranks!.forEach((step, i) => {
      assert.ok(
        step.note.length > 0 && step.note.length <= 90,
        `${tech.ability} rank ${i + 2} note is one honest line`,
      );
      for (const key of Object.keys(step)) {
        assert.ok(HONABLE.has(key), `${tech.ability} rank ${i + 2} touches honable field ${key}`);
      }
      const honed = honedAbility(ab!, tech.ranks, i + 2);
      assert.notDeepEqual(honed, prev, `${tech.ability} rank ${i + 2} actually changes the art`);
      prev = honed;
    });
  }
});

test('rank steps never degrade a damage art (monotonic cycle value)', () => {
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    if (isUtilityArt(ab)) continue;
    let prev = cycleValue(ab);
    for (let rank = 2; rank <= TECHNIQUE_MAX_RANK; rank++) {
      const v = cycleValue(honedAbility(ab, tech.ranks, rank));
      assert.ok(
        v >= prev - 1e-9,
        `${tech.ability} rank ${rank} value ${v.toFixed(2)} must not fall below rank ${rank - 1}'s ${prev.toFixed(2)}`,
      );
      prev = v;
    }
  }
});

test('THE RELEVANCE LAW: every fully-honed art sits within ±20% of its style mean', () => {
  const styles = new Map<string, Array<{ id: string; v: number; hi: number }>>();
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    if (isUtilityArt(ab)) continue;
    const honed = honedAbility(ab, tech.ranks, TECHNIQUE_MAX_RANK);
    const list = styles.get(tech.style) ?? [];
    // THE ROOTED PREMIUM: rooted seconds widen the CEILING only —
    // commitment may buy payload above the mean, never excuse less.
    list.push({ id: tech.ability, v: cycleValue(honed), hi: 1.2 + rootedPremium(honed) });
    styles.set(tech.style, list);
  }
  for (const [style, arts] of styles) {
    const mean = arts.reduce((s, a) => s + a.v, 0) / arts.length;
    for (const { id, v, hi } of arts) {
      assert.ok(
        v >= mean * 0.8 && v <= mean * hi,
        `${style}/${id} Rank IV cycle ${v.toFixed(2)} outside band [${(mean * 0.8).toFixed(2)}, ${(mean * hi).toFixed(2)}]`,
      );
    }
  }
});

test('THE SHORTENED CLIMB: the rank clock masters every art exactly by 99', () => {
  assert.deepEqual([...RANK_SURPLUS], [0, 15, 30, 45]);
  for (const tech of TECHNIQUES) {
    const clock = techniqueAnchor(tech);
    // Anchors at 54 and below walk the standard +15 stride untouched.
    if (clock <= 54) assert.equal(rankStride(clock), 15, `${tech.ability} keeps the standard clock`);
    assert.ok(
      rankLevel(clock, TECHNIQUE_MAX_RANK) <= 99,
      `${tech.ability} reaches Rank IV by 99 (IV at ${rankLevel(clock, TECHNIQUE_MAX_RANK)})`,
    );
  }
});

/**
 * THE SECOND BREATH: every combat school walks the same twenty-seat
 * road onehand and arx opened — founding arts on the odd stride, the
 * breath wave interleaved, the capstone crowning at 90. One pinned
 * table per school: the deliberate record of what stands.
 */
const SECOND_BREATH_LADDERS: Record<string, ReadonlyArray<readonly [string, number]>> = {
  archery: [
    ['tumble_shot', 5], ['kingshot', 10], ['longshot', 15], ['stringsong', 20],
    ['rain_of_arrows', 25], ['hawks_hour', 30], ['snare_shot', 35], ['winterflight', 40],
    ['ricochet', 45], ['emberhead', 50], ['twin_strike', 54], ['skyloom', 58],
    ['skyfall_shot', 62], ['gloamshaft', 66], ['phantom_flight', 70], ['harrier', 74],
    ['storm_of_shafts', 78], ['zenith', 82], ['crowsong', 86], ['arrow_tempest', 90],
  ],
  sneak: [
    ['rend', 5], ['opened_vein', 10], ['ghost_step', 15], ['threadwork', 20],
    ['smoke_bomb', 25], ['nightshade_kiss', 30], ['caltrops', 35], ['quiet_knife', 40],
    ['fan_of_knives', 45], ['redwork', 50], ['envenom', 54], ['gallows_thread', 58],
    ['feint_double', 62], ['widows_draw', 66], ['exposing_strike', 70], ['bloodletting', 74],
    ['night_fangs', 78], ['lights_out', 82], ['red_hour', 86], ['thousand_cuts', 90],
  ],
  shield: [
    ['shield_bash', 5], ['iron_toll', 10], ['set_the_wall', 15], ['grindstone', 20],
    ['shield_rush', 25], ['doorfall', 30], ['draw_iron', 35], ['held_gate', 40],
    ['shield_roof', 45], ['sunbrass', 50], ['turned_blow', 54], ['millwall', 58],
    ['rampart_break', 62], ['anchorfall', 66], ['wheel_of_iron', 70], ['patient_wall', 74],
    ['hold_the_line', 78], ['standing_sun', 82], ['winterhold', 86], ['unbroken', 90],
  ],
  twohand: [
    ['wide_swath', 5], ['fell_timber', 10], ['haft_check', 15], ['quarry_work', 20],
    ['iron_pendulum', 25], ['forgefall', 30], ['fault_line', 35], ['wheelbreaker', 40],
    ['colossus_stance', 45], ['gravedigger', 50], ['skysunder', 54], ['ore_song', 58],
    ['executioners_arc', 62], ['skyweight', 66], ['avalanche', 70], ['long_lever', 74],
    ['breaker_charge', 78], ['sunhammer', 82], ['worlds_rim', 86], ['titans_verdict', 90],
  ],
  dualwield: [
    ['twin_cut', 5], ['two_bells', 10], ['heron_step', 15], ['ribbonwork', 20],
    ['crossed_throw', 25], ['twin_moons', 30], ['mirrored_hand', 35], ['silver_reel', 40],
    ['turning_reel', 45], ['matched_flame', 50], ['red_ribbons', 54], ['stormstitch', 58],
    ['swallows_dive', 62], ['mirrorfall', 66], ['the_shears', 70], ['the_weave', 74],
    ['storm_of_two', 78], ['first_and_last', 82], ['hummingbird', 86], ['hundred_hands', 90],
  ],
  combat: [
    ['first_blood', 5], ['measured_blow', 10], ['shoulder_check', 15], ['drumbeat', 20],
    ['war_shout', 25], ['thrown_iron', 30], ['second_breath', 35], ['ironbreath', 40],
    ['loose_iron', 45], ['fifth_road', 50], ['hold_fast', 54], ['old_thunder', 58],
    ['break_the_line', 62], ['gathered_breath', 66], ['the_opening', 70], ['long_watch', 74],
    ['no_quarter', 78], ['scarworn', 82], ['last_lesson', 86], ['the_long_fight', 90],
  ],
};

test('THE SECOND BREATH: every combat school holds exactly its authored twenty seats', () => {
  for (const [style, table] of Object.entries(SECOND_BREATH_LADDERS)) {
    const arts = techniquesFor(style).filter((t) => !t.hidden);
    assert.deepEqual(
      arts.map((t) => [t.ability, t.unlockLevel]),
      table.map((r) => [...r]),
      `the ${style} ladder is exactly its authored roster`,
    );
    assert.equal(new Set(arts.map((t) => t.ability)).size, arts.length);
    assertBreathWave(style);
  }
});

/**
 * THE LONG ROAD's deep-school clause: a twenty-art school still
 * carries THE DRAWN BREATH's whole wave — five casted and five
 * channeled voices — wherever its seats now stand.
 */
function assertBreathWave(style: string): void {
  const arts = techniquesFor(style).filter((t) => !t.hidden);
  const casted = arts.filter((t) => (abilityDef(t.ability)!.castTicks ?? 0) > 0);
  const channeled = arts.filter((t) => (abilityDef(t.ability)!.channelTicks ?? 0) > 0);
  assert.ok(casted.length >= 5, `${style} keeps its five casted breath arts`);
  assert.ok(channeled.length >= 5, `${style} keeps its five channeled breath arts`);
}

test('THE LONG ROAD: onehand holds exactly its authored ladder, 5 to 90', () => {
  // THE DRAWN BREATH's wave grew the school to twenty arts; THE LONG
  // ROAD stretches the whole roster in authored order — every 5 to
  // the founding 50, then every 4 to the capstone at 90. The pin
  // stays an authored table (the KEEPER LADDER pattern): the
  // deliberate record of what stands, never an accident.
  const arts = techniquesFor('onehand').filter((t) => !t.hidden);
  assert.deepEqual(
    arts.map((t) => [t.ability, t.unlockLevel]),
    [
      ['heavy_slam', 5],
      ['ember_edge', 10],
      ['bull_rush', 15],
      ['millwork', 20],
      ['whirlwind', 25],
      ['levinstroke', 30],
      ['warcry', 35],
      ['red_ledger', 40],
      ['steel_wave', 45],
      ['cold_iron', 50],
      ['bloodlust', 54],
      ['frostwork', 58],
      ['stagger_stomp', 62],
      ['first_light', 66],
      ['headsman_stroke', 70],
      ['live_iron', 74],
      ['earthbreaker', 78],
      ['gloomfall', 82],
      ['noonfall', 86],
      ['warlords_descent', 90],
    ],
    'the onehand ladder is exactly its authored roster',
  );
  assert.equal(new Set(arts.map((t) => t.ability)).size, arts.length);
  assertBreathWave('onehand');
});

test('THE LONG ROAD: arx holds exactly its authored ladder, 5 to 90', () => {
  // The mage school walks the same stretched road: authored order
  // kept whole, the founding ten every 5 to 50, the breath wave every
  // 4 above, Daybreak crowning the ladder at 90.
  const arts = techniquesFor('arx').filter((t) => !t.hidden);
  assert.deepEqual(
    arts.map((t) => [t.ability, t.unlockLevel]),
    [
      ['arc_bolt', 5],
      ['wickfire', 10],
      ['frost_lance', 15],
      ['rime_river', 20],
      ['blink', 25],
      ['windshear', 30],
      ['ward_shell', 35],
      ['stonerise', 40],
      ['ember_fan', 45],
      ['geyser', 50],
      ['meteor_shard', 54],
      ['anvil_sky', 58],
      ['stormcall', 62],
      ['hollowcall', 66],
      ['mirror_image', 70],
      ['burning_glass', 74],
      ['maelstrom', 78],
      ['moonrise', 82],
      ['cometfall', 86],
      ['daybreak', 90],
    ],
    'the arx ladder is exactly its authored roster',
  );
  assert.equal(new Set(arts.map((t) => t.ability)).size, arts.length);
  assertBreathWave('arx');
});

test('THE KEEPER LADDER: beastcraft holds exactly its authored rungs', () => {
  // The fourth citizenship of style (docs/beastcraft-arts-plan.md):
  // a non-combat school's ladder grows art by art — this pin is the
  // deliberate record of what stands, extended per new art, and it
  // guards against the school leaking into the combat-style pins.
  const arts = techniquesFor('beastcraft');
  assert.deepEqual(
    arts.map((t) => [t.ability, t.unlockLevel]),
    [
      ['soothe_the_wild', 5],
      ['gentle_the_wild', 10],
      ['come_to_heel', 15],
      ['point_the_fang', 20],
      ['keepers_balm', 30],
      ['strewn_bait', 40],
      ['the_quiet_walk', 50],
      ['blood_of_the_pack', 60],
      ['the_keepers_cry', 75],
      ['voice_of_the_wild', 90],
    ],
    'the beastcraft ladder is exactly its authored roster',
  );
  for (const t of arts) {
    const ab = abilityDef(t.ability)!;
    assert.equal(ab.damage, 0, `${t.ability}: a keeper art is a working, never a strike`);
    // THE HONED-ART LAW holds for the keeper too: three steps each.
    assert.equal(t.ranks?.length, 3, `${t.ability}: a keeper art carries its full rank ladder`);
  }
});


test('THE GREEN ARTS: farming = exactly its authored roster, every art damage 0', () => {
  const arts = TECHNIQUES.filter((t) => t.style === 'farming' && !t.hidden).sort(
    (a, b) => a.unlockLevel - b.unlockLevel,
  );
  assert.deepEqual(
    arts.map((t) => [t.ability, t.unlockLevel]),
    [
      ['sowers_step', 5],
      ['gardeners_mend', 15],
      ['earthen_brace', 30],
      ['hearthkeepers_calm', 50],
      ['quickening_touch', 75],
    ],
    'the farming ladder is exactly its authored roster',
  );
  for (const t of arts) {
    const ab = abilityDef(t.ability)!;
    assert.equal(ab.damage, 0, `${t.ability}: a green art grows, it never strikes`);
    assert.equal(t.ranks?.length, 3, `${t.ability}: a green art carries its full rank ladder`);
  }
});

test('THE UNWRITTEN PAGE: hidden arts are well-formed, one per style at launch', () => {
  const hidden = TECHNIQUES.filter((t) => t.hidden);
  const byStyle = new Map<string, number>();
  for (const t of hidden) {
    byStyle.set(t.style, (byStyle.get(t.style) ?? 0) + 1);
    assert.equal(t.unlockLevel, 0, `${t.ability}: a page has no rung`);
    const anchor = t.hidden!.anchorLevel;
    assert.ok(anchor >= 1 && anchor <= 54, `${t.ability}: anchor ${anchor} must mature before 99`);
    assert.ok(t.ranks?.length === TECHNIQUE_MAX_RANK - 1, `${t.ability} climbs to Rank IV too`);
    assert.ok(abilityDef(t.ability), `${t.ability} resolves`);
  }
  // THE NEW VOICES (THE DRAWN BREATH Phase 4): the channeled pages
  // joined twohand and arx — the pin grows deliberately, one deed at
  // a time, never by accident.
  const PAGES: Record<string, number> = {
    combat: 1,
    onehand: 1,
    archery: 1,
    arx: 2,
    sneak: 1,
    twohand: 2,
    shield: 1,
    dualwield: 1,
  };
  for (const [style, count] of Object.entries(PAGES)) {
    assert.equal(byStyle.get(style), count, `${style} carries its authored unwritten pages`);
  }
});

test('techniques never fork identity: rank steps leave id/shape/fx face alone', () => {
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    for (let rank = 2; rank <= TECHNIQUE_MAX_RANK; rank++) {
      const honed = honedAbility(ab, tech.ranks, rank);
      assert.equal(honed.id, ab.id);
      assert.equal(honed.shape, ab.shape);
      assert.equal(honed.name, ab.name);
      assert.equal(honed.color, ab.color);
      assert.equal(honed.code, ab.code);
    }
  }
});

test('every style ladder still resolves against the ability book', () => {
  for (const style of ['combat', 'onehand', 'archery', 'arx', 'sneak', 'twohand', 'shield', 'dualwield']) {
    for (const t of techniquesFor(style)) assert.ok(ABILITIES.has(t.ability));
  }
});

// ------------------------------------------------ THE PAYOFF BRACKET
// The player-side twin of THE THREAT LAW's TTK brackets: at any base
// level, the best technique payoff must stay a PAYOFF — meaningful
// against an at-level line fighter, never a delete button. The line
// fighter is the game's own scaling law (scaleNpcDef of the skeleton),
// so these brackets ride the same curve dungeons do.

test('THE PAYOFF BRACKET: one press never deletes an at-level line fighter', () => {
  const skeleton = NPCS.get('skeleton')!;
  const powerMult = (l: number): number => 1 + l * 0.05;
  const oneTargetBeats = (ab: AbilityDef): number => {
    const base = (() => {
      switch (ab.shape) {
        case 'pulse_nova':
          return ab.pulses ?? 1;
        case 'ground_field':
          return Math.floor((ab.fieldTicks ?? 0) / (ab.pulseEveryTicks ?? 20));
        case 'flurry':
          return ab.hits ?? 1;
        default:
          return 1; // fans/dashes: one shaft connects with ONE target
      }
    })();
    // THE HELD NOTE: a channel strikes its whole shape once per beat —
    // never an "instant", always judged as the full note it can sing.
    return base * channelBeats(ab);
  };
  for (const L of [10, 25, 50, 75, 95]) {
    const fighterHp = scaleNpcDef(skeleton, L).maxHp;
    for (const style of ['combat', 'onehand', 'archery', 'arx', 'sneak', 'twohand', 'shield', 'dualwield']) {
      let instantBest = 0;
      let channelBest = 0;
      for (const t of techniquesFor(style)) {
        if (!t.hidden && t.unlockLevel > L) continue;
        const ab = honedAbility(abilityDef(t.ability)!, t.ranks, techniqueRankFor(t, L));
        if (ab.damage < 3) continue;
        const perBeat = Math.round(ab.damage * powerMult(L));
        const beats = oneTargetBeats(ab);
        // THE PRICED BREATH: a casted art is never an "instant" — its
        // wind-up is a visible telegraph, so its one press is judged
        // under the full-payload cap, not the no-warning cap.
        const instant = beats === 1 && !ab.castTicks ? perBeat : 0;
        instantBest = Math.max(instantBest, instant);
        channelBest = Math.max(channelBest, perBeat * beats);
        assert.ok(
          instant <= fighterHp * 0.75,
          `${style}/${t.ability} @L${L}: instant ${instant} deletes the ${fighterHp}hp line fighter`,
        );
        assert.ok(
          perBeat * beats <= fighterHp * 1.1,
          `${style}/${t.ability} @L${L}: full channel ${perBeat * beats} vs ${fighterHp}hp exceeds the payoff cap`,
        );
      }
      assert.ok(
        channelBest >= fighterHp * 0.2,
        `${style} @L${L}: best payoff ${channelBest} vs ${fighterHp}hp — payoffs must stay meaningful`,
      );
    }
  }
});

test('honed defs obey the seeker laws at every rank', () => {
  // The base-def seeker test lives in content.test.ts; ranks must not
  // sneak past it — a step that adds homing to a piercing schoolless
  // art would orbit-farm in a way no base def is allowed to.
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    for (let rank = 1; rank <= TECHNIQUE_MAX_RANK; rank++) {
      const honed = honedAbility(ab, tech.ranks, rank);
      if (honed.homing === undefined) continue;
      assert.ok(honed.element, `${tech.ability} rank ${rank}: seekers must name a school`);
      assert.ok(!honed.pierce, `${tech.ability} rank ${rank}: homing + pierce orbit-farms`);
    }
  }
});
