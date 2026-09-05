/**
 * THE COMBAT SCHOOL — its twenty rung arts (and its unwritten page) with
 * their honing ladders, one file per school (THE MASTERED HAND,
 * techniques v3). Moved verbatim from techniqueArts/breaths/ladders and
 * techniqueLadder; the school waves rewrite the arts here.
 */
import type { AbilityDef, TechniqueDef } from '@arx/shared';

/**
 * THE REGISTER, per school: player-wielded wave-one pages
 * (root/stagger/weaken/quicken/mend/stonehide) this school's arts lay,
 * by art id → the exact page list (follow statuses, aftermath pages
 * and self pages count). statusWave.test.ts merges every school's
 * licenses; an unlisted page is refused; every hold is priced by the
 * player HOLD BUDGET in masteredHand.test.ts.
 */
export const COMBAT_LICENSES: Record<string, string[]> = {};

export const COMBAT_ARTS: AbilityDef[] = [
  // ------------------- THE SECOND BREATH — the combat breath arts
  {
    id: 'measured_blow',
    name: 'Measured Blow',
    desc: 'The breath before the fist. Measured twice, landed once.',
    color: '#b09a7a',
    code: 'Me',
    cooldownTicks: 170, // 8.5 s
    castTicks: 18,
    shape: 'melee_arc',
    damage: 11,
    range: 2.3,
    arc: 1.0,
  },

  {
    id: 'drumbeat',
    name: 'Drumbeat',
    desc: 'The old cadence, kept with your heels. The whole line moves to it.',
    color: '#c4885a',
    code: 'Dm',
    cooldownTicks: 240, // 12 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 5,
    radius: 2.0,
    knockback: 0.6,
  },

  {
    id: 'thrown_iron',
    name: 'Thrown Iron',
    desc: 'Whatever iron is near, thrown hard enough to matter. Everything is a weapon.',
    color: '#8a8f98',
    code: 'Th',
    cooldownTicks: 180, // 9 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 12,
    range: 9,
    projectiles: 1,
    projectileSpeed: 14,
    splashRadius: 1.3,
  },

  {
    id: 'ironbreath',
    name: 'Ironbreath',
    desc: 'The veteran exhales winter down the lane. Cold as pay day, twice as slow.',
    color: '#9ab4bc',
    code: 'Ih',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 5,
    range: 6,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  {
    id: 'fifth_road',
    name: 'The Fifth Road',
    desc: 'Four roads are taught. The fifth goes through whoever is standing on it.',
    color: '#7a6a80',
    code: '5r',
    cooldownTicks: 220, // 11 s
    castTicks: 22,
    shape: 'dash_strike',
    damage: 12,
    dashTiles: 9.0,
    travel: 'charge',
    status: { status: 'bleed', power: 1, durationTicks: 50 },
  },

  {
    id: 'old_thunder',
    name: 'Old Thunder',
    desc: 'The joints remember every storm they marched through. Let them speak.',
    color: '#b8a45a',
    code: 'Od',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.3,
    arc: 1.2,
    status: { status: 'shock', power: 1, durationTicks: 25 },
  },

  {
    id: 'gathered_breath',
    name: 'The Gathered Breath',
    desc: 'All of it, held as long as it keeps. Then all of it, at once.',
    color: '#d9c084',
    code: 'Gg',
    cooldownTicks: 210, // 10.5 s
    castTicks: 24,
    shape: 'nova',
    damage: 12,
    radius: 2.5,
    knockback: 1.0,
  },

  {
    id: 'long_watch',
    name: 'The Long Watch',
    desc: 'You know where they will stand before they do. The watch never lifted.',
    color: '#7a8a94',
    code: 'Lh',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 6,
    radius: 2.1,
    fuseTicks: 8,
  },

  {
    id: 'scarworn',
    name: 'Scarworn',
    desc: 'Every scar is a paid receipt. This is where you collect.',
    color: '#a05a48',
    code: 'Sx',
    cooldownTicks: 200, // 10 s
    castTicks: 24,
    shape: 'melee_arc',
    damage: 13,
    range: 2.4,
    arc: 1.2,
    drainFrac: 0.2,
  },

  {
    id: 'last_lesson',
    name: 'Last Lesson',
    desc: 'The lesson passes from one student to the next. Nobody graduates.',
    color: '#c9b46a',
    code: 'Ln',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 7,
    radius: 3.0,
    chainTargets: 2,
  },

  // ------------------------ THE VETERAN'S SCHOOL — the combat ladder
  // The school every fighter is already in. No weapon owns it: these
  // are the lessons the fight itself teaches — footing, breath, the
  // shout, the read of a guard — cast the same whatever the hand
  // holds. THE SHARED LESSON feeds the skill; this ladder spends it.
  // Grammar: dust and brass. Kicked grit, drill-yard iron, one horn
  // note — never an element, never a single school's steel.
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'The fight starts when you say it does.',
    color: '#c4553d',
    code: 'Fb',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.2,
    arc: 1.1,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },

  {
    id: 'shoulder_check',
    name: 'Shoulder Check',
    desc: 'No blade needed. The whole body says move.',
    color: '#b09a7a',
    code: 'Sk',
    cooldownTicks: 170, // 8.5 s
    shape: 'dash_strike',
    damage: 9,
    dashTiles: 6,
    travel: 'charge',
    knockback: 1.5,
  },

  {
    id: 'war_shout',
    name: 'War Shout',
    desc: 'The oldest weapon is the voice.',
    color: '#d9b04a',
    code: 'Wh',
    cooldownTicks: 170, // 8.5 s
    shape: 'nova',
    damage: 9,
    radius: 2.4,
    knockback: 1.0,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },

  {
    id: 'second_breath',
    name: 'Second Breath',
    desc: 'The fight is long. Breathe like it.',
    color: '#a8c4b0',
    code: 'Sb',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    self: { heal: 10, speedMult: 1.1, durationTicks: 100 },
  },

  {
    id: 'loose_iron',
    name: 'Loose Iron',
    desc: 'A buckle, a camp nail, the pommel stone. It all flies.',
    color: '#8a8f98',
    code: 'Li',
    cooldownTicks: 180, // 9 s
    shape: 'projectile_fan',
    damage: 5,
    range: 7,
    projectiles: 3,
    spreadArc: 0.18,
    projectileSpeed: 13,
  },

  {
    id: 'hold_fast',
    name: 'Hold Fast',
    desc: 'Feet planted. The word given. Held.',
    color: '#7a8494',
    code: 'Hf',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    self: { armor: 4, shieldHp: 8, durationTicks: 140 },
  },

  {
    id: 'break_the_line',
    name: 'Break the Line',
    desc: 'A wall is only a wall until somebody walks through.',
    color: '#b0623c',
    code: 'Bl',
    cooldownTicks: 200, // 10 s
    castFreezeTicks: 3,
    shape: 'melee_arc',
    damage: 13,
    range: 2.4,
    arc: 1.5,
    knockback: 1.8,
  },

  {
    id: 'the_opening',
    name: 'The Opening',
    desc: 'Every guard opens once. Be already moving.',
    color: '#e0d0a0',
    code: 'Op',
    cooldownTicks: 190, // 9.5 s
    shape: 'melee_arc',
    damage: 13,
    range: 2.3,
    arc: 0.8,
    executeBelow: { frac: 0.3, mult: 2.0 },
  },

  {
    id: 'no_quarter',
    name: 'No Quarter',
    desc: 'None asked. None given.',
    color: '#a83c32',
    code: 'Nq',
    cooldownTicks: 210, // 10.5 s
    shape: 'flurry',
    damage: 5,
    range: 2.1,
    arc: 1.0,
    hits: 4,
    pulseEveryTicks: 5,
    drainFrac: 0.2,
  },

  {
    id: 'the_long_fight',
    name: 'The Long Fight',
    desc: 'You have been here before. You will be here after.',
    color: '#c9a44a',
    code: 'Lf',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 4,
    shape: 'pulse_nova',
    damage: 7,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 10,
    knockback: 0.8,
  },

  {
    id: 'four_roads',
    name: 'Four Roads',
    desc: 'Blade, both hands, string, staff. Every road taught the same hand.',
    color: '#d8c080',
    code: 'Fr',
    cooldownTicks: 210, // 10.5 s
    castFreezeTicks: 3,
    shape: 'nova',
    damage: 10,
    radius: 2.2,
    knockback: 1.0,
    self: { speedMult: 1.1, durationTicks: 80 },
  },
];

export const COMBAT_LADDER: TechniqueDef[] = [
  // --------------------- THE VETERAN'S SCHOOL — the combat ladder
  {
    ability: 'first_blood',
    style: 'combat',
    unlockLevel: 5,
    ranks: [
      { note: 'The first one lands harder.', damage: 10 },
      {
        note: 'The wound stays open longer.',
        damage: 11,
        status: { status: 'bleed', power: 1, durationTicks: 70 },
      },
      {
        note: 'First blood wakes your feet.',
        damage: 12,
        status: { status: 'bleed', power: 1, durationTicks: 70 },
        self: { speedMult: 1.06, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'measured_blow',
    style: 'combat',
    unlockLevel: 10,
    ranks: [
      { note: 'The measure lands heavier.', damage: 13 },
      { note: 'The seam is read before the strike.', status: { status: 'sunder', power: 12, durationTicks: 60 } },
      { note: 'Measured once now. Landed just the same.', damage: 14, cooldownTicks: 150, castTicks: 16 },
    ],
  },
  {
    ability: 'shoulder_check',
    style: 'combat',
    unlockLevel: 15,
    ranks: [
      { note: 'More weight behind the shoulder.', damage: 11 },
      { note: 'A longer run at them.', damage: 12, dashTiles: 7.2 },
      {
        note: 'They stop being where they stood.',
        damage: 13,
        dashTiles: 7.2,
        knockback: 2.0,
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'drumbeat',
    style: 'combat',
    unlockLevel: 20,
    ranks: [
      { note: 'The drum strikes harder.', damage: 6 },
      { note: 'The cadence holds a fourth bar.', channelTicks: 64 },
      { note: 'The line is driven back to the beat.', radius: 2.3, knockback: 0.9 },
    ],
  },
  {
    ability: 'war_shout',
    style: 'combat',
    unlockLevel: 25,
    ranks: [
      { note: 'Louder, and it hurts more.', damage: 11 },
      { note: 'The yard hears it further out.', damage: 11, radius: 2.7 },
      {
        note: 'The shout holds them a beat longer.',
        damage: 12,
        radius: 2.7,
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'thrown_iron',
    style: 'combat',
    unlockLevel: 30,
    ranks: [
      { note: 'The iron lands harder.', damage: 13 },
      { note: 'The throw carries further.', range: 11, projectileSpeed: 16 },
      { note: 'Both hands throw now.', projectiles: 2, spreadArc: 0.15, cooldownTicks: 160, castTicks: 18 },
    ],
  },
  {
    ability: 'second_breath',
    style: 'combat',
    unlockLevel: 35,
    ranks: [
      { note: 'A deeper pull of air.', self: { heal: 14, speedMult: 1.1, durationTicks: 100 } },
      { note: 'The legs get their share.', self: { heal: 16, speedMult: 1.12, durationTicks: 100 } },
      {
        note: 'The breath steadies the arm too.',
        self: { heal: 18, speedMult: 1.12, armor: 2, durationTicks: 120 },
      },
    ],
  },
  {
    ability: 'ironbreath',
    style: 'combat',
    unlockLevel: 40,
    ranks: [
      { note: 'The breath bites colder.', damage: 6 },
      { note: 'The cold keeps them longer and the lane runs wider.', width: 0.8, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The exhale holds a fourth count.', channelTicks: 64, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'loose_iron',
    style: 'combat',
    unlockLevel: 45,
    ranks: [
      { note: 'Heavier iron in the hand.', damage: 6 },
      { note: 'A fourth thing finds your fingers.', projectiles: 4 },
      {
        note: 'Rough edges. Everything you throw bites.',
        status: { status: 'bleed', power: 1, durationTicks: 42 },
      },
    ],
  },
  {
    ability: 'fifth_road',
    style: 'combat',
    unlockLevel: 50,
    ranks: [
      { note: 'The road hits harder.', damage: 14 },
      { note: 'The fifth road runs further.', dashTiles: 11.0 },
      { note: 'The toll is taken quicker.', damage: 15, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'hold_fast',
    style: 'combat',
    unlockLevel: 54,
    ranks: [
      { note: 'The stance sets deeper.', self: { armor: 5, shieldHp: 10, durationTicks: 140 } },
      { note: 'Held longer.', self: { armor: 5, shieldHp: 12, durationTicks: 160 } },
      {
        note: 'What breaks on you, breaks back.',
        self: { armor: 6, shieldHp: 14, reflectFrac: 0.1, durationTicks: 160 },
      },
    ],
  },
  {
    ability: 'old_thunder',
    style: 'combat',
    unlockLevel: 58,
    ranks: [
      { note: 'The thunder lands harder.', damage: 5 },
      { note: 'The storm reaches wider, and holds.', arc: 1.5, status: { status: 'shock', power: 1, durationTicks: 40 } },
      { note: 'The old storm comes back sooner.', cooldownTicks: 190 },
    ],
  },
  {
    ability: 'break_the_line',
    style: 'combat',
    unlockLevel: 62,
    ranks: [
      { note: 'More of you arrives at once.', damage: 15 },
      { note: 'The line bends further back.', damage: 16, knockback: 2.2 },
      {
        note: 'Broken lines stay broken a while.',
        damage: 18,
        knockback: 2.2,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'gathered_breath',
    style: 'combat',
    unlockLevel: 66,
    ranks: [
      { note: 'The breath lands heavier.', damage: 14 },
      { note: 'The burst takes the whole square.', radius: 2.9, knockback: 1.3 },
      { note: 'Gathered quicker. Loosed just as whole.', damage: 15, cooldownTicks: 190, castTicks: 22 },
    ],
  },
  {
    ability: 'the_opening',
    style: 'combat',
    unlockLevel: 70,
    ranks: [
      { note: 'The answer arrives heavier.', damage: 15 },
      { note: 'Sharper eyes, sharper price.', damage: 16 },
      { note: 'A failing guard is an open door.', damage: 16, executeBelow: { frac: 0.3, mult: 2.3 } },
    ],
  },
  {
    ability: 'long_watch',
    style: 'combat',
    unlockLevel: 74,
    ranks: [
      { note: 'The watch strikes harder.', damage: 5 },
      { note: 'The ground covered grows.', radius: 2.5 },
      { note: 'The cold certainty settles on them.', cooldownTicks: 230, status: { status: 'chill', power: 1, durationTicks: 50 } },
    ],
  },
  {
    ability: 'no_quarter',
    style: 'combat',
    unlockLevel: 78,
    ranks: [
      { note: 'You keep more of what you take.', drainFrac: 0.3 },
      { note: 'Each refusal lands harder.', damage: 6, drainFrac: 0.3 },
      { note: 'The fight feeds you as fast as it costs them.', damage: 6, drainFrac: 0.4 },
    ],
  },
  {
    ability: 'scarworn',
    style: 'combat',
    unlockLevel: 82,
    ranks: [
      { note: 'The receipts collect deeper.', damage: 15 },
      { note: 'The taking is thorough.', drainFrac: 0.3 },
      { note: 'The scars answer at once.', damage: 16, cooldownTicks: 180, castTicks: 22 },
    ],
  },
  {
    ability: 'last_lesson',
    style: 'combat',
    unlockLevel: 86,
    ranks: [
      { note: 'The lesson lands harder.', damage: 5 },
      { note: 'The stunned silence holds the room.', status: { status: 'shock', power: 1, durationTicks: 30 } },
      { note: 'A third student is called on.', chainTargets: 3 },
    ],
  },
  {
    ability: 'the_long_fight',
    style: 'combat',
    unlockLevel: 90,
    ranks: [
      { note: 'Each wave lands heavier.', damage: 8 },
      { note: 'The fight widens around you.', damage: 8, radius: 2.4 },
      { note: 'It ends the way it always ends. You, standing.', damage: 9, radius: 2.4 },
    ],
  },
  {
    ability: 'four_roads',
    style: 'combat',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Each road adds its weight.', damage: 12 },
      { note: 'The circle widens to fit four schools.', damage: 13, radius: 2.5 },
      {
        note: 'All four roads, walked at once.',
        damage: 15,
        radius: 2.5,
        self: { speedMult: 1.14, armor: 2, durationTicks: 100 },
      },
    ],
  },
];
