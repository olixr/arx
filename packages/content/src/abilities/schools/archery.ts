/**
 * THE ARCHERY SCHOOL — its twenty rung arts (and its unwritten page) with
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
export const ARCHERY_LICENSES: Record<string, string[]> = {};

export const ARCHERY_ARTS: AbilityDef[] = [
  {
    id: 'tumble_shot',
    name: 'Tumble Shot',
    desc: 'Roll away from your aim and loose an arrow mid-tumble.',
    color: '#8a9a5a',
    code: 'Ts',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: -5.2, // away from the aim — the disengage tool
    projectiles: 1, // ...and the arrow flies at whatever you fled
    projectileSpeed: 16,
    range: 12,
  },

  {
    id: 'rain_of_arrows',
    name: 'Rain of Arrows',
    desc: 'Darken the sky over a patch of ground — then it lands.',
    color: '#6b8a5a',
    code: 'Ra',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 9,
    range: 12,
    radius: 2.0,
    fuseTicks: 18,
  },

  {
    id: 'twin_strike',
    name: 'Twin Strike',
    desc: 'Two heavy shafts, loosed as one, punching through the line.',
    color: '#5a7a4a',
    code: 'Tw',
    cooldownTicks: 180, // 9 s
    shape: 'projectile_fan',
    damage: 10,
    range: 16,
    projectiles: 2,
    spreadArc: 0.12,
    projectileSpeed: 18,
    pierce: true,
  },

  {
    id: 'storm_of_shafts',
    name: 'Storm of Shafts',
    desc: 'Blacken a patch of sky and keep it black — arrows on a schedule.',
    color: '#8ab4c8',
    code: 'Zh',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE (Phase 4b): the stand-in barrage finally STANDS —
    // the sky stays black only while the archer holds the note. The
    // fire-and-forget field retires; the volley is a staked channel.
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.2,
    fuseTicks: 12,
  },

  // ------------------- THE SECOND BREATH — the archery breath arts
  // THE LONG ROAD's content wave: every ten-art school grows the same
  // ten breath voices onehand and arx already carry, five casted and
  // five channeled, interleaved up the stretched ladder. The wave laws
  // hold: casted arts carry no castFreezeTicks (the wind-up IS the
  // commit); channels never ride a ground_field.
  {
    id: 'kingshot',
    name: 'Kingshot',
    desc: 'Draw until the bow remembers the forest. One shaft, and the whole lane kneels.',
    color: '#7a9a4a',
    code: 'Kg',
    cooldownTicks: 200, // 10 s
    castTicks: 22, // 1.1 s wound, 0.88 s planted
    shape: 'projectile_fan',
    damage: 16,
    range: 18,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true,
  },

  {
    id: 'stringsong',
    name: 'Stringsong',
    desc: 'Hold the note and the bow sings it. Arrows leave on every beat.',
    color: '#9ab86a',
    code: 'Sn',
    cooldownTicks: 160, // 8 s
    channelTicks: 48, // three beats of the string
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 4,
    range: 14,
    projectiles: 1,
    projectileSpeed: 18,
    element: 'storm',
  },

  {
    id: 'hawks_hour',
    name: "Hawk's Hour",
    desc: 'Mark the field the way the hawk does. What stands in it has already lost.',
    color: '#c8a44a',
    code: 'Hh',
    cooldownTicks: 190, // 9.5 s
    castTicks: 22,
    shape: 'ground_aoe',
    damage: 15,
    range: 13,
    radius: 2.0,
    fuseTicks: 14,
  },

  {
    id: 'winterflight',
    name: 'Winterflight',
    desc: 'Loose down one cold line and keep loosing. The wind does the rest.',
    color: '#8ac4e0',
    code: 'Wf',
    cooldownTicks: 170, // 8.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 9,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  {
    id: 'emberhead',
    name: 'Emberhead',
    desc: 'Two shafts tipped at the campfire. They finish burning where they land.',
    color: '#e08a4a',
    code: 'Ed',
    cooldownTicks: 210, // 10.5 s
    castTicks: 22,
    shape: 'projectile_fan',
    damage: 9,
    range: 15,
    projectiles: 2,
    spreadArc: 0.14,
    projectileSpeed: 17,
    splashRadius: 1.4,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'skyloom',
    name: 'Skyloom',
    desc: 'Set the shuttle flying and hold it. The thread stitches foe to foe.',
    color: '#6b9a7a',
    code: 'Sy',
    cooldownTicks: 200, // 10 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 12,
    radius: 3.5,
    chainTargets: 2,
  },

  {
    id: 'gloamshaft',
    name: 'Gloamshaft',
    desc: 'Draw in the last light and loose after it. The dark travels in a straight line.',
    color: '#5a5a78',
    code: 'Gf',
    cooldownTicks: 210, // 10.5 s
    castTicks: 24,
    shape: 'beam',
    damage: 19,
    range: 12,
    width: 0.55,
  },

  {
    id: 'harrier',
    name: 'Harrier',
    desc: 'The wing that circles back. Every pass takes its due twice.',
    color: '#a8946a',
    code: 'Hr',
    cooldownTicks: 220, // 11 s
    channelTicks: 64, // four passes of the wing
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 3,
    range: 10,
    projectiles: 1,
    projectileSpeed: 15,
    returns: true,
  },

  {
    id: 'zenith',
    name: 'Zenith',
    desc: 'Loose at the highest point of the sky. It comes down as noon.',
    color: '#e8c874',
    code: 'Zn',
    cooldownTicks: 230, // 11.5 s
    castTicks: 26,
    shape: 'ground_aoe',
    damage: 16,
    range: 15,
    radius: 2.2,
    fuseTicks: 12,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'crowsong',
    name: 'Crowsong',
    desc: 'Call the dark flock down on a field and keep calling. They are never full.',
    color: '#4a4458',
    code: 'Cw',
    cooldownTicks: 240, // 12 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 13,
    radius: 2.2,
    fuseTicks: 10,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  // ---------------------------------- THE OPEN LADDER — new archery arts
  {
    id: 'longshot',
    name: 'Longshot',
    desc: 'One arrow, one line, everything on it.',
    color: '#7a9a5a',
    code: 'Lo',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 9,
    range: 18,
    projectiles: 1,
    projectileSpeed: 20,
    pierce: true,
  },

  {
    id: 'snare_shot',
    name: 'Snare Shot',
    desc: 'Loose a trap instead of an arrow — the ground keeps it.',
    color: '#a08a4a',
    code: 'Ss',
    cooldownTicks: 260, // 13 s
    shape: 'summon',
    damage: 4,
    range: 8, // rides the arrow: the trap plants at the aimed point
    summon: { kind: 'snare_trap', durationTicks: 500, radius: 1.2, power: 1 },
  },

  {
    id: 'ricochet',
    name: 'Ricochet',
    desc: 'An arrow that changes its mind mid-air — twice.',
    color: '#8a7a4a',
    code: 'Rc',
    cooldownTicks: 170, // 8.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.5,
    chainTargets: 2,
  },

  {
    id: 'skyfall_shot',
    name: 'Skyfall Shot',
    desc: 'Loose it at the clouds and count to two.',
    color: '#6b8a6a',
    code: 'Sk',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 12,
    range: 13,
    radius: 1.8,
    fuseTicks: 16,
    knockback: 1.2,
  },

  {
    id: 'phantom_flight',
    name: 'Phantom Flight',
    desc: 'An arrow that flies out pale and comes home red.',
    color: '#9aa8b8',
    code: 'Pf',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 8,
    range: 11,
    projectiles: 1,
    projectileSpeed: 15,
    pierce: true,
    returns: true,
  },

  {
    id: 'arrow_tempest',
    name: 'Arrow Tempest',
    desc: 'Five shafts loosed as one storm, each picking its own throat.',
    color: '#5a7a8a',
    code: 'At',
    cooldownTicks: 240, // 12 s
    shape: 'projectile_fan',
    damage: 5,
    range: 10,
    projectiles: 5,
    spreadArc: 1.2,
    projectileSpeed: 15,
    homing: 5.0,
    element: 'storm', // storm-wreathed seekers — the school the eye reads
  },

  {
    id: 'warden_volley',
    name: "Warden's Volley",
    desc: 'The wall-top answer: a spread of shafts that says NO further.',
    color: '#8a9a78',
    code: 'Wv',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 6,
    range: 11,
    projectiles: 4,
    spreadArc: 0.9,
    projectileSpeed: 15,
    knockback: 1.2,
  },
];

export const ARCHERY_LADDER: TechniqueDef[] = [
  {
    ability: 'tumble_shot',
    style: 'archery',
    unlockLevel: 5,
    ranks: [
      { note: 'The parting arrow means it.', damage: 9 },
      { note: 'A longer roll, ready again sooner.', cooldownTicks: 140, dashTiles: -6.4 },
      { note: 'Two shafts, loosed mid-tumble.', projectiles: 2, spreadArc: 0.1 },
    ],
  },
  {
    ability: 'kingshot',
    style: 'archery',
    unlockLevel: 10,
    ranks: [
      { note: 'The draw grows heavier still.', damage: 18 },
      { note: 'The shaft carries further and faster.', range: 21, projectileSpeed: 24 },
      { note: 'The king takes the whole lane sooner.', damage: 20, cooldownTicks: 180, castTicks: 18 },
    ],
  },
  {
    ability: 'longshot',
    style: 'archery',
    unlockLevel: 15,
    ranks: [
      { note: 'The line lands heavier.', damage: 11 },
      { note: 'The draw comes back to you sooner.', cooldownTicks: 150 },
      { note: 'The line it draws does not bend, or end kindly.', damage: 13 },
    ],
  },
  {
    ability: 'stringsong',
    style: 'archery',
    unlockLevel: 20,
    ranks: [
      { note: 'The note lands harder.', damage: 5 },
      { note: 'The song holds a fourth beat.', channelTicks: 64 },
      { note: 'The arrows learn the tune and follow it home.', cooldownTicks: 150, homing: 5 },
    ],
  },
  {
    ability: 'rain_of_arrows',
    style: 'archery',
    unlockLevel: 25,
    ranks: [
      { note: 'The sky falls harder.', damage: 11 },
      { note: 'A wider patch of ruin, called sooner.', cooldownTicks: 190, radius: 2.4 },
      {
        note: 'Barbed heads — the wounds keep raining.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'hawks_hour',
    style: 'archery',
    unlockLevel: 30,
    ranks: [
      { note: 'The stoop strikes deeper.', damage: 17 },
      { note: 'The hour claims a wider field.', radius: 2.6, range: 15 },
      { note: 'What the hawk marks is opened to everyone.', cooldownTicks: 180, status: { status: 'sunder', power: 12, durationTicks: 60 } },
    ],
  },
  {
    ability: 'snare_shot',
    style: 'archery',
    unlockLevel: 35,
    ranks: [
      {
        note: 'The snare waits longer.',
        summon: { kind: 'snare_trap', durationTicks: 700, radius: 1.2, power: 1 },
      },
      { note: 'Another trap rides in the quiver sooner.', cooldownTicks: 220 },
      {
        note: 'It bites colder and reaches wider.',
        summon: { kind: 'snare_trap', durationTicks: 700, radius: 1.6, power: 2 },
      },
    ],
  },
  {
    ability: 'winterflight',
    style: 'archery',
    unlockLevel: 40,
    ranks: [
      { note: 'The wind cuts keener.', damage: 5 },
      { note: 'The cold clings longer and the line runs wider.', width: 0.8, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The flight holds a fourth breath.', channelTicks: 64, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'ricochet',
    style: 'archery',
    unlockLevel: 45,
    ranks: [
      { note: 'Each carom means it more.', damage: 9 },
      { note: 'A third change of mind.', chainTargets: 3 },
      { note: 'No wall ends the argument.', damage: 10, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'emberhead',
    style: 'archery',
    unlockLevel: 50,
    ranks: [
      { note: 'The heads burn hotter.', damage: 10 },
      { note: 'The fire keeps its grip longer.', range: 16, status: { status: 'burn', power: 1, durationTicks: 80 } },
      { note: 'The pair loose quicker and land harder.', damage: 11, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'twin_strike',
    style: 'archery',
    unlockLevel: 54,
    ranks: [
      { note: 'Heavier shafts.', damage: 11 },
      { note: 'The pair returns to your hand sooner.', cooldownTicks: 170 },
      { note: 'Two arguments, one conclusion — heavier.', damage: 12 },
    ],
  },
  {
    ability: 'skyloom',
    style: 'archery',
    unlockLevel: 58,
    ranks: [
      { note: 'The shuttle strikes harder.', damage: 5 },
      { note: 'The thread reaches further.', range: 14, cooldownTicks: 190 },
      { note: 'The loom takes a third thread.', chainTargets: 3 },
    ],
  },
  {
    ability: 'skyfall_shot',
    style: 'archery',
    unlockLevel: 62,
    ranks: [
      { note: 'It falls heavier.', damage: 14 },
      { note: 'A wider shadow, called sooner.', radius: 2.2, cooldownTicks: 200 },
      {
        note: 'It lands barbed.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'gloamshaft',
    style: 'archery',
    unlockLevel: 66,
    ranks: [
      { note: 'The dark line bites deeper.', damage: 21 },
      { note: 'The gloam runs longer and wider.', range: 15, width: 0.75 },
      { note: 'The last light leaves quicker, and harder.', damage: 24, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'phantom_flight',
    style: 'archery',
    unlockLevel: 70,
    ranks: [
      { note: 'The ghost cuts deeper.', damage: 10 },
      { note: 'It haunts you oftener.', cooldownTicks: 180 },
      {
        note: 'It comes home red, and leaves red behind.',
        damage: 11,
        status: { status: 'bleed', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'harrier',
    style: 'archery',
    unlockLevel: 74,
    ranks: [
      { note: 'The wing strikes harder.', damage: 4 },
      { note: 'The circuit runs longer and faster.', range: 12, projectileSpeed: 17 },
      { note: 'The wing opens what it passes.', cooldownTicks: 210, status: { status: 'bleed', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'storm_of_shafts',
    style: 'archery',
    unlockLevel: 78,
    ranks: [
      { note: 'Every falling shaft bites harder.', damage: 4 },
      { note: 'The patch grows.', radius: 2.6 },
      {
        note: 'The schedule tightens, and the caught walk slow.',
        pulseEveryTicks: 13,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'zenith',
    style: 'archery',
    unlockLevel: 82,
    ranks: [
      { note: 'Noon lands heavier.', damage: 17 },
      { note: 'The light claims a wider court.', radius: 2.6 },
      { note: 'The sun stays to see it finished.', damage: 18, cooldownTicks: 210, status: { status: 'burn', power: 1, durationTicks: 80 } },
    ],
  },
  {
    ability: 'crowsong',
    style: 'archery',
    unlockLevel: 86,
    ranks: [
      { note: 'The flock feeds harder.', damage: 4 },
      { note: 'The song calls a wider field.', radius: 2.6 },
      { note: 'The crows remember, and come back hungrier.', cooldownTicks: 220, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'arrow_tempest',
    style: 'archery',
    unlockLevel: 90,
    ranks: [
      { note: 'Each shaft asks for more.', damage: 6 },
      { note: 'The storm gathers again sooner.', cooldownTicks: 220 },
      { note: 'A sixth shaft joins the storm.', projectiles: 6 },
    ],
  },
  {
    ability: 'warden_volley',
    style: 'archery',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Each shaft means the NO harder.', damage: 7 },
      { note: 'A fifth shaft joins the answer.', projectiles: 5 },
      { note: 'The wall holds; they do not.', damage: 9, knockback: 2.0, cooldownTicks: 180 },
    ],
  },
];
