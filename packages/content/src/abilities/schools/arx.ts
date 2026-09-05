/**
 * THE ARX SCHOOL — its twenty rung arts (and its unwritten page) with
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
export const ARX_LICENSES: Record<string, string[]> = {};

export const ARX_ARTS: AbilityDef[] = [
  {
    id: 'arc_bolt',
    name: 'Arc Bolt',
    desc: 'A crack of lightning that leaps from foe to foe.',
    color: '#e8e06a',
    code: 'Ab',
    cooldownTicks: 160, // 8 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },

  {
    id: 'blink',
    name: 'Blink',
    desc: 'Step between places — arrive before your enemies notice.',
    color: '#b49af0',
    code: 'Bk',
    cooldownTicks: 200, // 10 s
    shape: 'dash_strike',
    damage: 0,
    dashTiles: 7.6,
    travel: 'blink',
  },

  {
    id: 'meteor_shard',
    name: 'Meteor Shard',
    desc: 'Call a burning shard down on your mark.',
    color: '#e85a3c',
    code: 'Ms',
    cooldownTicks: 260, // 13 s
    shape: 'ground_aoe',
    damage: 13,
    range: 12,
    radius: 2.2,
    fuseTicks: 20,
    knockback: 1.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'maelstrom',
    name: 'Maelstrom',
    desc: 'Hold the sea open on dry land — everything caught walks the drain.',
    color: '#6aa0c8',
    code: 'Mm',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE's pilot: the vortex is HELD open — 2.4s planted,
    // one drag of the drain per beat, staked where the ring released.
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.6,
    fuseTicks: 16,
    knockback: -2.2, // the drain: a hard drag into the eye, every beat
    status: { status: 'chill', power: 1, durationTicks: 80 },
  },

  // ---------------------- THE BREATH BETWEEN RUNGS — arx breath arts
  // The mage school's breath wave: ten new askings of the world
  // (originally seated between the founding rungs; THE LONG ROAD now
  // interleaves the whole school across 5..90), five casted and five channeled,
  // each speaking for ONE element the founding roster never claimed
  // whole (wick fire, the rime road, the gale, the quarry, the deep
  // well, the anvil cloud, the hollow, the lens, the early moon, the
  // far sky). Casted arts carry no castFreezeTicks; channels never
  // ride a ground_field.
  {
    id: 'wickfire',
    name: 'Wickfire',
    desc: 'Light the wick and let it fly. The flame arrives still hungry.',
    color: '#ff9a4a',
    code: 'Wk',
    cooldownTicks: 180, // 9 s
    castTicks: 18, // 0.9 s lit, 0.72 s planted
    shape: 'projectile_fan',
    damage: 10,
    range: 10,
    projectiles: 1,
    spreadArc: 0,
    projectileSpeed: 13,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'rime_river',
    name: 'Rime River',
    desc: 'Pour winter from your hand and hold the pour. The cold leaves a road.',
    color: '#9ad4ec',
    code: 'Rv',
    cooldownTicks: 200, // 10 s
    channelTicks: 48, // 2.4 s held, three reaches of the river
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 11,
    width: 0.5,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 70 },
  },

  {
    id: 'windshear',
    name: 'Windshear',
    desc: 'Draw the whole sky in, then hand it back all at once.',
    color: '#c2e8c8',
    code: 'Wn',
    cooldownTicks: 200, // 10 s
    castTicks: 20, // 1 s indrawn, 0.8 s planted
    shape: 'nova',
    damage: 11,
    radius: 2.6,
    knockback: 2.2,
    element: 'gale',
  },

  {
    id: 'stonerise',
    name: 'Stonerise',
    desc: 'Ask the ground to stand up. Every beat, another row answers.',
    color: '#c8a25f',
    code: 'Se',
    cooldownTicks: 220, // 11 s
    channelTicks: 48, // 2.4 s held, three rows of the quarry
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 9,
    radius: 2.0,
    fuseTicks: 12,
    knockback: 1.2,
    element: 'stone',
  },

  {
    id: 'geyser',
    name: 'Geyser',
    desc: 'Wake the deep water under their feet. It rises without asking twice.',
    color: '#8ec8dc',
    code: 'Gy',
    cooldownTicks: 220, // 11 s
    castTicks: 22, // 1.1 s drawn up, 0.88 s planted
    shape: 'ground_aoe',
    damage: 12,
    range: 10,
    radius: 2.0,
    fuseTicks: 14,
    knockback: 1.8,
    element: 'tide',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

  {
    id: 'anvil_sky',
    name: 'Anvil Sky',
    desc: 'Call the cloud down to forge height and hold it. Every beat, the hammer.',
    color: '#efe27a',
    code: 'Av',
    cooldownTicks: 240, // 12 s
    channelTicks: 64, // 3.2 s held, four falls of the hammer
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 3,
    radius: 2.4,
    element: 'storm',
    status: { status: 'shock', power: 1, durationTicks: 60 },
  },

  {
    id: 'hollowcall',
    name: 'Hollowcall',
    desc: 'Open a small nothing where you point. Everything nearby is invited.',
    color: '#8a6ad0',
    code: 'Ho',
    cooldownTicks: 240, // 12 s
    castTicks: 24, // 1.2 s opened, 0.96 s planted
    shape: 'ground_aoe',
    damage: 12,
    range: 11,
    radius: 2.2,
    fuseTicks: 16,
    knockback: -2.0, // the invitation: a pull to the hollow's mouth
    element: 'void',
  },

  {
    id: 'burning_glass',
    name: 'Burning Glass',
    desc: 'Narrow the noon through a held lens. What the line crosses smolders.',
    color: '#ffd98a',
    code: 'Bg',
    cooldownTicks: 220, // 11 s
    channelTicks: 48, // 2.4 s held, three focusings of the lens
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 10,
    width: 0.5,
    element: 'radiant',
    status: { status: 'burn', power: 1, durationTicks: 40 },
  },

  {
    id: 'moonrise',
    name: 'Moonrise',
    desc: 'Bring the moon up early. Everything under it slows in the silver.',
    color: '#d8e2f8',
    code: 'Mo',
    cooldownTicks: 240, // 12 s
    castTicks: 26, // 1.3 s raised, 1.04 s planted
    shape: 'nova',
    damage: 13,
    radius: 2.4,
    element: 'lunar',
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  {
    id: 'cometfall',
    name: 'Cometfall',
    desc: 'Ask the far sky for stones. Hold the asking, and they keep coming.',
    color: '#b8ecff',
    code: 'Cf',
    cooldownTicks: 260, // 13 s
    channelTicks: 64, // 3.2 s held, four visitors from far away
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 11,
    radius: 2.2,
    fuseTicks: 12,
    element: 'astral',
    status: { status: 'shock', power: 1, durationTicks: 50 },
  },

  // -------------------------------------- THE OPEN LADDER — new Arx arts
  {
    id: 'frost_lance',
    name: 'Frost Lance',
    desc: 'One cold line from your hand to the horizon — it holds.',
    color: '#8ac4e8',
    code: 'Fl',
    cooldownTicks: 180, // 9 s
    castFreezeTicks: 4,
    shape: 'beam',
    damage: 8,
    range: 12,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  {
    id: 'ward_shell',
    name: 'Ward Shell',
    desc: 'A shell of quiet light that takes the blows meant for you.',
    color: '#b49af0',
    code: 'Ws',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 10, durationTicks: 160 },
  },

  {
    id: 'ember_fan',
    name: 'Ember Fan',
    desc: 'Spread a hand of fire — every finger burns.',
    color: '#ff9a44',
    code: 'Ef',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 6,
    range: 9,
    projectiles: 3,
    spreadArc: 0.7,
    projectileSpeed: 14,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },

  {
    id: 'stormcall',
    name: 'Stormcall',
    desc: 'Ask the sky to strike here, and keep striking.',
    color: '#e8e06a',
    code: 'Sc',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 5,
    range: 11,
    radius: 2.2,
    fieldTicks: 100,
    pulseEveryTicks: 12,
    status: { status: 'shock', power: 1, durationTicks: 40 },
  },

  {
    id: 'mirror_image',
    name: 'Mirror Image',
    desc: 'Step aside and leave yourself standing there.',
    color: '#b8a8e8',
    code: 'Mi',
    cooldownTicks: 320, // 16 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'decoy', durationTicks: 160, radius: 5, power: 0 },
  },

  {
    id: 'daybreak',
    name: 'Daybreak',
    desc: 'Noon, delivered early, to an address of your choosing.',
    color: '#ffd98a',
    code: 'Db',
    cooldownTicks: 280, // 14 s
    // THE DRAWN BREATH's pilot: 1.2 s wound on the move, ~0.96 s
    // planted. The post-fire root retires — the wind-up IS the commit,
    // and THE PRICED BREATH pays it back in payload (14 → 15).
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 15,
    range: 12,
    radius: 2.4,
    fuseTicks: 22,
    element: 'radiant',
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'winters_fall',
    name: "Winter's Fall",
    desc: 'Choose a patch of sky and ask it for winter, then hold it to the bargain.',
    color: '#a8d8e8',
    code: 'Wf',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE: the icicle fall is HELD over its staked patch —
    // one volley of ice per beat while the caller stands the note.
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 11,
    radius: 2.2,
    fuseTicks: 12,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  {
    id: 'riftwalker_step',
    name: 'Riftwalker Step',
    desc: 'Step the way the rift taught you — through, and out the far side of them.',
    color: '#9a86d8',
    code: 'Rw',
    cooldownTicks: 190, // 9.5 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 8.8,
    travel: 'blink',
    element: 'void',
    status: { status: 'shock', power: 1, durationTicks: 50 },
  },
];

export const ARX_LADDER: TechniqueDef[] = [
  {
    ability: 'arc_bolt',
    style: 'arx',
    unlockLevel: 5,
    ranks: [
      { note: 'A hotter crack.', damage: 8 },
      { note: 'The sky reloads faster.', cooldownTicks: 140 },
      {
        note: 'One more throat to leap to, and the charge lingers.',
        chainTargets: 4,
        status: { status: 'shock', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'wickfire',
    style: 'arx',
    unlockLevel: 10,
    ranks: [
      { note: 'The flame flies heavier.', damage: 12 },
      {
        note: 'What it lights stays lit longer.',
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
      { note: 'The wick takes faster, and the hand learns the toss.', cooldownTicks: 170, castTicks: 16 },
    ],
  },
  {
    ability: 'frost_lance',
    style: 'arx',
    unlockLevel: 15,
    ranks: [
      { note: 'The cold line lands harder.', damage: 10 },
      { note: 'Winter answers sooner.', cooldownTicks: 160 },
      {
        note: 'Winter holds the line.',
        damage: 13,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'rime_river',
    style: 'arx',
    unlockLevel: 20,
    ranks: [
      { note: 'The river runs deeper.', damage: 5 },
      { note: 'The river reaches farther downhill.', range: 12.5 },
      {
        note: 'The cold outstays the pour.',
        cooldownTicks: 180,
        status: { status: 'chill', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'blink',
    style: 'arx',
    unlockLevel: 25,
    ranks: [
      { note: 'A longer stride between places.', dashTiles: 9.2 },
      { note: 'The door opens oftener.', cooldownTicks: 170 },
      { note: 'Distance stops being an argument.', dashTiles: 10.8, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'windshear',
    style: 'arx',
    unlockLevel: 30,
    ranks: [
      { note: 'The gale leans harder.', damage: 13 },
      { note: 'The whole field bows away from you.', radius: 3.0, knockback: 2.6 },
      { note: 'The sky refills sooner.', cooldownTicks: 180, castTicks: 18 },
    ],
  },
  {
    ability: 'ward_shell',
    style: 'arx',
    unlockLevel: 35,
    ranks: [
      { note: 'The shell thickens.', self: { shieldHp: 14, durationTicks: 160 } },
      { note: 'The light gathers again sooner.', cooldownTicks: 280 },
      { note: 'A shell that outlasts the storm.', self: { shieldHp: 18, durationTicks: 200 } },
    ],
  },
  {
    ability: 'stonerise',
    style: 'arx',
    unlockLevel: 40,
    ranks: [
      { note: 'The rows rise sharper.', damage: 5 },
      { note: 'A wider quarry answers.', radius: 2.4 },
      { note: 'The ground stands up angrier, oftener.', cooldownTicks: 200, knockback: 1.6 },
    ],
  },
  {
    ability: 'ember_fan',
    style: 'arx',
    unlockLevel: 45,
    ranks: [
      { note: 'Each finger burns hotter.', damage: 7 },
      { note: 'A fourth finger opens.', projectiles: 4 },
      {
        note: 'Every tongue leaves a lasting hunger.',
        status: { status: 'burn', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'geyser',
    style: 'arx',
    unlockLevel: 50,
    ranks: [
      { note: 'The deep water rises harder.', damage: 14 },
      { note: 'The well mouth widens.', radius: 2.4, knockback: 2.2 },
      { note: 'The deep answers the first knock.', cooldownTicks: 200, castTicks: 20 },
    ],
  },
  {
    ability: 'meteor_shard',
    style: 'arx',
    unlockLevel: 54,
    ranks: [
      { note: 'A heavier shard.', damage: 15 },
      { note: 'The burn spreads wider.', radius: 2.6 },
      {
        note: 'It keeps burning after it lands.',
        status: { status: 'burn', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'anvil_sky',
    style: 'arx',
    unlockLevel: 58,
    ranks: [
      { note: 'The hammer falls heavier.', damage: 4 },
      { note: 'The anvil widens.', radius: 2.8 },
      {
        note: 'The forge keeps longer hours, and the charge clings.',
        cooldownTicks: 220,
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'stormcall',
    style: 'arx',
    unlockLevel: 62,
    ranks: [
      { note: 'Each strike asks for more.', damage: 6 },
      { note: 'The appointment runs long, and wide.', radius: 2.6, fieldTicks: 120 },
      { note: 'The sky keeps the appointment.', cooldownTicks: 220 },
    ],
  },
  {
    ability: 'hollowcall',
    style: 'arx',
    unlockLevel: 66,
    ranks: [
      { note: 'The nothing bites deeper.', damage: 14 },
      { note: 'The invitation reaches farther.', radius: 2.6, knockback: -2.4 },
      { note: 'The hollow opens quicker, and closes on more.', cooldownTicks: 210, castTicks: 22, damage: 15 },
    ],
  },
  {
    ability: 'mirror_image',
    style: 'arx',
    unlockLevel: 70,
    ranks: [
      {
        note: 'The lie stands longer.',
        summon: { kind: 'decoy', durationTicks: 220, radius: 5, power: 0 },
      },
      { note: 'You can step aside oftener.', cooldownTicks: 280 },
      {
        note: 'The double walks farther from the truth.',
        summon: { kind: 'decoy', durationTicks: 260, radius: 7, power: 0 },
      },
    ],
  },
  {
    ability: 'burning_glass',
    style: 'arx',
    unlockLevel: 74,
    ranks: [
      { note: 'The line burns finer and hotter.', damage: 5 },
      {
        note: 'What it crosses keeps smoldering.',
        status: { status: 'burn', power: 1, durationTicks: 60 },
      },
      { note: 'The lens steadies sooner.', cooldownTicks: 200 },
    ],
  },
  {
    ability: 'maelstrom',
    style: 'arx',
    unlockLevel: 78,
    ranks: [
      { note: 'The drain pulls a deeper draught.', damage: 4 },
      { note: 'The eye widens.', radius: 3.0 },
      {
        note: 'The drain pulls the whole sea, and nothing swims out.',
        damage: 5,
        knockback: -2.6,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'moonrise',
    style: 'arx',
    unlockLevel: 82,
    ranks: [
      { note: 'A heavier moon.', damage: 15 },
      {
        note: 'The silver reaches farther, and the slow runs longer.',
        radius: 2.8,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'The moon answers the first call.', cooldownTicks: 220, castTicks: 24 },
    ],
  },
  {
    ability: 'cometfall',
    style: 'arx',
    unlockLevel: 86,
    ranks: [
      { note: 'Heavier stones from farther away.', damage: 5 },
      { note: 'The sky opens wider.', radius: 2.6 },
      { note: 'The visitors arrive closer together.', cooldownTicks: 240, pulseEveryTicks: 14 },
    ],
  },
  {
    ability: 'daybreak',
    style: 'arx',
    unlockLevel: 90,
    ranks: [
      { note: 'Noon weighs more.', damage: 17 },
      { note: 'A wider noon, delivered oftener.', radius: 2.8, cooldownTicks: 260 },
      {
        note: 'Noon arrives where you point, and stays to burn.',
        damage: 20,
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
    ],
  },
  // ------------------------- THE UNWRITTEN PAGE — deed-earned seats
  {
    ability: 'riftwalker_step',
    style: 'arx',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'You carry more of the far side back.', damage: 10 },
      { note: 'The step lengthens; the rift stays open longer for you.', dashTiles: 10.4, cooldownTicks: 170 },
      {
        note: 'The static of the crossing clings to everything you pass.',
        damage: 11,
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'winters_fall',
    style: 'arx',
    unlockLevel: 0,
    hidden: { anchorLevel: 38 },
    ranks: [
      { note: 'Heavier ice, asked for by name.', damage: 5 },
      { note: 'A wider patch of sky agrees.', radius: 2.6 },
      {
        note: 'The fall quickens, and the cold outstays it.',
        pulseEveryTicks: 13,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
    ],
  },
];
