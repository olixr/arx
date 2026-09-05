/**
 * THE ARX SCHOOL — THE ELEMENTAL LEDGER (THE MASTERED HAND, Phase 2).
 *
 * The grammar: reactions. An opener lays ONE spark (burn / chill /
 * shock) wide and cheap and leaves its word in the air; a payoff lays
 * the SECOND spark on a body already sparked, so the reaction table
 * (Thermal Shock, Combust, Shatter) fires through the follow, and the
 * ground keeps what the press began (fire that stays, frost sheets,
 * the scald pool, the storm). Sustains are beams and held skies with
 * a finale; answers are the blink, the ward circle, the mirror, and
 * the one crack that stops a caster mid word.
 *
 * The signature (three presses): Wickfire (cast, burn, fire on the
 * ground) → Frost Lance (follows burn: Thermal Shock, leaves ice) →
 * Arc Bolt (follows chill: Shatter, the stun). Every art below names
 * which word it leaves and which word it reads.
 */
import type { AbilityDef, TechniqueDef } from '@arx/shared';

/**
 * THE REGISTER, per school: player-wielded wave-one pages
 * (root/stagger/weaken/quicken/mend/stonehide) this school's arts lay,
 * by art id → the exact page list (follow statuses, aftermath pages
 * and self pages count). statusWave.test.ts merges every school's
 * licenses; an unlisted page is refused; every hold is priced by the
 * player HOLD BUDGET in masteredHand.test.ts.
 *
 * Hollowcall is arx's one hold: a casted, fused void that pulls the
 * yard to its mouth and roots it there (lock 40 t, cooldown ≥ 280 t
 * at every rank, warn 38–40 t ≥ half the lock).
 */
export const ARX_LICENSES: Record<string, string[]> = {
  hollowcall: ['root'],
};

export const ARX_ARTS: AbilityDef[] = [
  // Rung 5, ANSWER: the school's interrupt (shock stops an NPC caster's breath) and the
  // third press of the signature: cast on a chilled body it is Shatter. Reads chill; leaves shock.
  {
    id: 'arc_bolt',
    name: 'Arc Bolt',
    desc: 'A crack of lightning that leaps from foe to foe and stops a caster mid word. Thrown at a chilled body, the ice shatters and they stand stunned.',
    color: '#e8e06a',
    code: 'Ab',
    cooldownTicks: 220, // 11 s
    shape: 'chain_zap',
    damage: 6,
    range: 12,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'answer',
    tag: 'shock',
    follow: { after: 'chill', windowTicks: 60, damageMult: 1.6 },
  },

  // Rung 25, ANSWER: the step between places. Spending a riding spark word buys the
  // door back sooner: escape or combo, the player chooses. Reads any spark.
  {
    id: 'blink',
    name: 'Blink',
    desc: 'Step between places and arrive before your enemies notice. Step right after a spark and the door opens again sooner, but the spark is spent.',
    color: '#b49af0',
    code: 'Bk',
    cooldownTicks: 200, // 10 s
    shape: 'dash_strike',
    damage: 0,
    dashTiles: 7.6,
    travel: 'blink',
    role: 'answer',
    follow: { after: ['burn', 'chill', 'shock'], windowTicks: 60, refundTicks: 60 },
  },

  // Rung 54, OPENER: the fused stone that lays burn wide, shoves, and leaves fire on the
  // ground; a kill inside its fall gives the seat back. Leaves burn for Frost Lance / Stormcall.
  {
    id: 'meteor_shard',
    name: 'Meteor Shard',
    desc: 'Call a burning shard down on your mark. Everything near it burns, and the fire stays on the ground after the stone is gone. Follow with cold or lightning.',
    color: '#e85a3c',
    code: 'Ms',
    cooldownTicks: 320, // 16 s
    shape: 'ground_aoe',
    damage: 11,
    range: 12,
    radius: 2.2,
    fuseTicks: 20,
    knockback: 1.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'opener',
    tag: 'burn',
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
    onKill: { refundTicks: 60 },
  },

  // Rung 78, PAYOFF: the held drain drags the burning yard into one eye and chills it,
  // so Thermal Shock fires body to body inside the pull. Reads burn; leaves chill.
  {
    id: 'maelstrom',
    name: 'Maelstrom',
    desc: 'Hold the sea open on dry land and everything caught walks the drain. Open it on a burning yard and the cold meets the fire in every body it pulls in.',
    color: '#6aa0c8',
    code: 'Mm',
    cooldownTicks: 260, // 13 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.6,
    fuseTicks: 16,
    knockback: -2.2,
    status: { status: 'chill', power: 1, durationTicks: 80 },
    role: 'payoff',
    tag: 'chill',
    follow: { after: 'burn', windowTicks: 60, damageMult: 1.5 },
  },

  // Rung 10, OPENER: the signature's first press. A cast bolt of wick fire that burns
  // the body and leaves fire on the ground under it. Leaves burn for Frost Lance.
  {
    id: 'wickfire',
    name: 'Wickfire',
    desc: 'Light the wick and let it fly. The flame arrives still hungry and stays burning on the ground where it lands. Lay cold on that fire and you have Thermal Shock.',
    color: '#ff9a4a',
    code: 'Wk',
    cooldownTicks: 200, // 10 s
    castTicks: 18,
    shape: 'projectile_fan',
    damage: 8,
    range: 10,
    projectiles: 1,
    spreadArc: 0,
    projectileSpeed: 13,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'opener',
    tag: 'burn',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } },
    onKill: { refundTicks: 60 },
  },

  // Rung 20, SUSTAIN: the held pour of winter down a line; the last reach of the river
  // is the finale. Leaves chill for Arc Bolt and Stonerise.
  {
    id: 'rime_river',
    name: 'Rime River',
    desc: 'Pour winter from your hand and hold the pour. Every reach chills the line, and the last reach lands hardest. What it leaves chilled is ready for lightning.',
    color: '#9ad4ec',
    code: 'Rv',
    cooldownTicks: 240, // 12 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 11,
    width: 0.5,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 70 },
    role: 'sustain',
    tag: 'chill',
    finaleMult: 2.5,
  },

  // Rung 30, OPENER: the indrawn sky handed back all at once, static in the gale; it clears
  // the ring and leaves every body crackling. Leaves shock for Geyser.
  {
    id: 'windshear',
    name: 'Windshear',
    desc: 'Draw the whole sky in, then hand it back all at once. The gale throws them back and leaves static on every body. Bring cold or fire next.',
    color: '#c2e8c8',
    code: 'Wn',
    cooldownTicks: 220, // 11 s
    castTicks: 20,
    shape: 'nova',
    damage: 9,
    radius: 2.6,
    knockback: 2.2,
    element: 'gale',
    status: { status: 'shock', power: 1, durationTicks: 50 },
    role: 'opener',
    tag: 'shock',
  },

  // Rung 40, SUSTAIN: the held quarry, rows of stone rising every beat with the last row
  // as the finale; through frozen bodies the rows break harder. Reads chill.
  {
    id: 'stonerise',
    name: 'Stonerise',
    desc: 'Ask the ground to stand up and hold the asking. Every beat another row answers, and the last row is the tallest. Raise it under chilled bodies and the ice breaks with them.',
    color: '#c8a25f',
    code: 'Se',
    cooldownTicks: 300, // 15 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 9,
    radius: 2.0,
    fuseTicks: 12,
    knockback: 1.2,
    element: 'stone',
    role: 'sustain',
    finaleMult: 2.5,
    follow: { after: 'chill', windowTicks: 60, damageMult: 1.4 },
  },

  // Rung 50, PAYOFF: the deep water woken under a shocked body is Shatter; the well keeps
  // scalding after it falls back. Reads shock; leaves chill.
  {
    id: 'geyser',
    name: 'Geyser',
    desc: 'Wake the deep water under their feet. It throws them up cold and leaves a scalding pool behind. Wake it under a shocked body and the cold shatters the charge.',
    color: '#8ec8dc',
    code: 'Gy',
    cooldownTicks: 240, // 12 s
    castTicks: 22,
    shape: 'ground_aoe',
    damage: 11,
    range: 10,
    radius: 2.0,
    fuseTicks: 14,
    knockback: 1.8,
    element: 'tide',
    status: { status: 'chill', power: 1, durationTicks: 50 },
    role: 'payoff',
    tag: 'chill',
    follow: { after: 'shock', windowTicks: 60, damageMult: 1.6 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2 },
  },

  // Rung 58, SUSTAIN: the forge cloud held at hammer height, one fall per beat, the last
  // fall the heaviest. Leaves shock for Geyser and Combust.
  {
    id: 'anvil_sky',
    name: 'Anvil Sky',
    desc: 'Call the cloud down to forge height and hold it. Every beat the hammer falls and leaves the ring charged, and the last fall rings loudest.',
    color: '#efe27a',
    code: 'Av',
    cooldownTicks: 300, // 15 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 3,
    radius: 2.4,
    element: 'storm',
    status: { status: 'shock', power: 1, durationTicks: 60 },
    role: 'sustain',
    tag: 'shock',
    finaleMult: 2.5,
  },

  // Rung 66, OPENER: the school's one hold. Casted and fused, the hollow pulls the yard to
  // its mouth and roots it there for the channels to eat. Leaves the word hollow for Cometfall.
  {
    id: 'hollowcall',
    name: 'Hollowcall',
    desc: 'Open a small nothing where you point. Everything nearby is pulled to its mouth and held there a breath. Pour a channel into the hollow while they cannot leave.',
    color: '#8a6ad0',
    code: 'Ho',
    cooldownTicks: 300, // 15 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 10,
    range: 11,
    radius: 2.2,
    fuseTicks: 16,
    knockback: -2.0,
    element: 'void',
    status: { status: 'root', power: 1, durationTicks: 40 },
    role: 'opener',
    tag: 'hollow',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, knockback: -1.0 },
  },

  // Rung 74, SUSTAIN: the held lens narrowing the noon down a line; the last focusing is a
  // point of white. Leaves burn for Frost Lance and Maelstrom.
  {
    id: 'burning_glass',
    name: 'Burning Glass',
    desc: 'Narrow the noon through a held lens. What the line crosses smolders, and the last focusing burns white. Cross the line with cold and the fire answers.',
    color: '#ffd98a',
    code: 'Bg',
    cooldownTicks: 240, // 12 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 10,
    width: 0.5,
    element: 'radiant',
    status: { status: 'burn', power: 1, durationTicks: 40 },
    role: 'sustain',
    tag: 'burn',
    finaleMult: 2.5,
  },

  // Rung 82, OPENER: the early moon chills the whole ring and leaves a silver sheet of
  // frost on the ground under it. Leaves chill for Arc Bolt and Stonerise.
  {
    id: 'moonrise',
    name: 'Moonrise',
    desc: 'Bring the moon up early. Everything under it slows in the silver, and the ground keeps the frost after the moon is gone. Lightning on that silver is Shatter.',
    color: '#d8e2f8',
    code: 'Mo',
    cooldownTicks: 240, // 12 s
    castTicks: 26,
    shape: 'nova',
    damage: 12,
    radius: 2.4,
    element: 'lunar',
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'opener',
    tag: 'chill',
    aftermath: { fieldTicks: 80, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
  },

  // Rung 86, SUSTAIN: stones from the far sky held over a patch; into an open hollow they
  // fall heavier, and the last visitor is the finale. Reads hollow; leaves shock.
  {
    id: 'cometfall',
    name: 'Cometfall',
    desc: 'Ask the far sky for stones and hold the asking. They keep coming, the last one biggest. Ask over an open hollow and every stone falls heavier on what is held there.',
    color: '#b8ecff',
    code: 'Cf',
    cooldownTicks: 340, // 17 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 11,
    radius: 2.2,
    fuseTicks: 12,
    element: 'astral',
    status: { status: 'shock', power: 1, durationTicks: 50 },
    role: 'sustain',
    tag: 'shock',
    finaleMult: 2,
    follow: { after: 'hollow', windowTicks: 60, damageMult: 1.5 },
  },

  // Rung 15, PAYOFF: the signature's second press. A cold line down a burning body is
  // Thermal Shock, and the road it leaves is ice. Reads burn; leaves chill.
  {
    id: 'frost_lance',
    name: 'Frost Lance',
    desc: 'One cold line from your hand to the horizon. Cast it down a burning body and the fire answers with Thermal Shock. The road it leaves is ice, ready for lightning.',
    color: '#8ac4e8',
    code: 'Fl',
    cooldownTicks: 200, // 10 s
    castFreezeTicks: 4,
    shape: 'beam',
    damage: 8,
    range: 12,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'payoff',
    tag: 'chill',
    follow: { after: 'burn', windowTicks: 60, damageMult: 1.7 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'chill', power: 1, durationTicks: 30 } },
  },

  // Rung 35, ANSWER: THE HELD GROUND. The ward is a circle on the floor, not a coat: stand
  // in it and wear the shell, step out and the shell fades. The channels want it.
  {
    id: 'ward_shell',
    name: 'Ward Shell',
    desc: 'Draw a circle of quiet light on the ground. While you stand inside it, the blows meant for you fall on the light instead. Hold your channels from the circle.',
    color: '#b49af0',
    code: 'Ws',
    cooldownTicks: 320, // 16 s
    shape: 'ground_field',
    damage: 0,
    range: 2,
    radius: 2.0,
    fieldTicks: 160,
    pulseEveryTicks: 16,
    self: { shieldHp: 10, armor: 2, durationTicks: 18 },
    role: 'answer',
  },

  // Rung 45, OPENER: the cheap wide burn, three tongues on three bodies; a kill inside the
  // throw gives the seat back. Leaves burn for Frost Lance, Stormcall and Maelstrom.
  {
    id: 'ember_fan',
    name: 'Ember Fan',
    desc: 'Spread a hand of fire and every finger burns a different foe. Lay it wide, then bring the cold or the storm down on the burning.',
    color: '#ff9a44',
    code: 'Ef',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 5,
    range: 9,
    projectiles: 3,
    spreadArc: 0.7,
    projectileSpeed: 14,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 50 },
    role: 'opener',
    tag: 'burn',
    onKill: { refundTicks: 60 },
  },

  // Rung 62, PAYOFF: the standing storm asked down on a burning yard; every strike on a burning
  // body is Combust. Reads burn; leaves shock.
  {
    id: 'stormcall',
    name: 'Stormcall',
    desc: 'Ask the sky to strike here, and keep striking. Ask it over a burning yard and every strike on the burning is Combust.',
    color: '#e8e06a',
    code: 'Sc',
    cooldownTicks: 300, // 15 s
    shape: 'ground_field',
    damage: 5,
    range: 11,
    radius: 2.2,
    fieldTicks: 100,
    pulseEveryTicks: 12,
    status: { status: 'shock', power: 1, durationTicks: 40 },
    role: 'payoff',
    tag: 'shock',
    follow: { after: 'burn', windowTicks: 60, damageMult: 1.2 },
  },

  // Rung 70, ANSWER: the double that takes the yard's eyes while the caster steps back and
  // lays the next spark from behind it.
  {
    id: 'mirror_image',
    name: 'Mirror Image',
    desc: 'Step aside and leave yourself standing there. While they beat the lie, lay your next spark from behind it.',
    color: '#b8a8e8',
    code: 'Mi',
    cooldownTicks: 320, // 16 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'decoy', durationTicks: 160, radius: 5, power: 0 },
    role: 'answer',
  },

  // Rung 90, CROWN: the three-act press. Noon falls (act one), on a chilled or shocked yard
  // it reacts wider (act two), and the ground burns for four seconds after (act three).
  {
    id: 'daybreak',
    name: 'Daybreak',
    desc: 'Noon, delivered early, to an address of your choosing. It burns everything there and the ground goes on burning after. Deliver it onto a chilled or charged yard and noon comes down wider and harder.',
    color: '#ffd98a',
    code: 'Db',
    cooldownTicks: 420, // 21 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 15,
    range: 12,
    radius: 2.4,
    fuseTicks: 22,
    element: 'radiant',
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'crown',
    tag: 'burn',
    follow: { after: ['chill', 'shock'], windowTicks: 80, damageMult: 1.5, radiusMult: 1.25 },
    aftermath: { fieldTicks: 80, everyTicks: 16, damage: 3, status: { status: 'burn', power: 1, durationTicks: 40 } },
    onKill: { refundTicks: 80 },
  },

  // PAGE (anchor 38), SUSTAIN: winter held over a staked patch, the last volley the finale.
  // Leaves chill for Arc Bolt and Stonerise.
  {
    id: 'winters_fall',
    name: "Winter's Fall",
    desc: 'Choose a patch of sky and ask it for winter, then hold it to the bargain. The last volley falls hardest, and what it leaves chilled is ready for lightning.',
    color: '#a8d8e8',
    code: 'Wf',
    cooldownTicks: 320, // 16 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 11,
    radius: 2.2,
    fuseTicks: 12,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'sustain',
    tag: 'chill',
    finaleMult: 2,
  },

  // PAGE (anchor 30), ANSWER: the rift step that carries static through the line; taken through
  // a chilled body the crossing is Shatter. Reads chill; leaves shock.
  {
    id: 'riftwalker_step',
    name: 'Riftwalker Step',
    desc: 'Step the way the rift taught you, through them and out the far side. The crossing leaves static on everything you pass, and through chilled bodies it shatters.',
    color: '#9a86d8',
    code: 'Rw',
    cooldownTicks: 200, // 10 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 8.8,
    travel: 'blink',
    element: 'void',
    status: { status: 'shock', power: 1, durationTicks: 50 },
    role: 'answer',
    tag: 'shock',
    follow: { after: 'chill', windowTicks: 60, damageMult: 1.5 },
  },
];

export const ARX_LADDER: TechniqueDef[] = [
  {
    ability: 'arc_bolt',
    style: 'arx',
    unlockLevel: 5,
    ranks: [
      { note: 'A hotter crack.', damage: 7 },
      { note: 'One more throat to leap to.', chainTargets: 4 },
      {
        note: 'Shatterbolt: broken ice hits harder, and the seat gives back what it broke.',
        cooldownTicks: 200,
        follow: { after: 'chill', windowTicks: 60, damageMult: 1.8, refundTicks: 40 },
      },
    ],
  },
  {
    ability: 'wickfire',
    style: 'arx',
    unlockLevel: 10,
    ranks: [
      { note: 'The flame flies heavier.', damage: 10 },
      {
        note: 'The fire on the ground spreads wider and stays longer.',
        aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.8, status: { status: 'burn', power: 1, durationTicks: 40 } },
      },
      { note: 'The long wick: the toss comes quicker, and a kill in the flame relights the seat.', castTicks: 16, onKill: { refundTicks: 80 } },
    ],
  },
  {
    ability: 'frost_lance',
    style: 'arx',
    unlockLevel: 15,
    ranks: [
      { note: 'The cold line lands harder.', damage: 10 },
      {
        note: 'The ice road stays longer under them.',
        aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'chill', power: 1, durationTicks: 30 } },
      },
      {
        note: 'Glasswork: down a burning body the lance strikes twice over.',
        cooldownTicks: 180,
        follow: { after: 'burn', windowTicks: 60, damageMult: 2 },
      },
    ],
  },
  {
    ability: 'rime_river',
    style: 'arx',
    unlockLevel: 20,
    ranks: [
      { note: 'The river runs deeper.', damage: 5 },
      {
        note: 'The river reaches farther, and the cold outstays the pour.',
        range: 12.5,
        status: { status: 'chill', power: 1, durationTicks: 90 },
      },
      { note: 'The river breaks its bank: the last pour lands three times over.', finaleMult: 3 },
    ],
  },
  {
    ability: 'blink',
    style: 'arx',
    unlockLevel: 25,
    ranks: [
      { note: 'A longer stride between places.', dashTiles: 9.2 },
      { note: 'The door opens oftener.', cooldownTicks: 180 },
      {
        note: 'Sparkstep: a spent spark buys the whole door back.',
        dashTiles: 10.8,
        follow: { after: ['burn', 'chill', 'shock'], windowTicks: 60, refundTicks: 100 },
      },
    ],
  },
  {
    ability: 'windshear',
    style: 'arx',
    unlockLevel: 30,
    ranks: [
      { note: 'The gale leans harder.', damage: 11 },
      { note: 'The whole field bows away from you.', radius: 3.0, knockback: 2.6 },
      {
        note: 'The charged gale: the static clings long after the wind, and the sky refills sooner.',
        cooldownTicks: 170,
        castTicks: 18,
        damage: 13,
        status: { status: 'shock', power: 1, durationTicks: 70 },
      },
    ],
  },
  {
    ability: 'ward_shell',
    style: 'arx',
    unlockLevel: 35,
    ranks: [
      { note: 'The light in the circle thickens.', self: { shieldHp: 14, armor: 2, durationTicks: 18 } },
      { note: 'The circle stands longer and gathers again sooner.', fieldTicks: 200, cooldownTicks: 280 },
      {
        note: 'The wide ward: a bigger circle, and a shell that shrugs the storm.',
        radius: 2.4,
        self: { shieldHp: 18, armor: 4, durationTicks: 18 },
      },
    ],
  },
  {
    ability: 'stonerise',
    style: 'arx',
    unlockLevel: 40,
    ranks: [
      { note: 'The rows rise sharper.', damage: 5 },
      { note: 'A wider quarry answers, and it shoves harder.', radius: 2.4, knockback: 1.6 },
      { note: 'The keystone: the last row rises three times as tall.', finaleMult: 3 },
    ],
  },
  {
    ability: 'ember_fan',
    style: 'arx',
    unlockLevel: 45,
    ranks: [
      { note: 'Each finger burns hotter.', damage: 6 },
      { note: 'A fourth finger opens.', projectiles: 4 },
      {
        note: 'The hungry hand: every tongue leaves a lasting burn.',
        status: { status: 'burn', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'geyser',
    style: 'arx',
    unlockLevel: 50,
    ranks: [
      { note: 'The deep water rises harder.', damage: 13 },
      { note: 'The well mouth widens, and the scald pool lasts.', radius: 2.4, knockback: 2.2, aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2 } },
      {
        note: 'Shatterwell: under a charged body the deep answers with everything it has.',
        cooldownTicks: 220,
        castTicks: 20,
        follow: { after: 'shock', windowTicks: 60, damageMult: 1.8 },
      },
    ],
  },
  {
    ability: 'meteor_shard',
    style: 'arx',
    unlockLevel: 54,
    ranks: [
      { note: 'A heavier shard.', damage: 13 },
      {
        note: 'The fire it leaves spreads wider and burns longer.',
        radius: 2.6,
        aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
      },
      {
        note: 'The cinder field: the burn outlasts the stone, and the sky reloads sooner.',
        cooldownTicks: 300,
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'anvil_sky',
    style: 'arx',
    unlockLevel: 58,
    ranks: [
      { note: 'The hammer falls heavier.', damage: 4 },
      { note: 'The anvil widens, and the charge clings.', radius: 2.8, status: { status: 'shock', power: 1, durationTicks: 80 } },
      { note: 'The forge bell: the last fall rings three times over, and the forge keeps longer hours.', cooldownTicks: 280, finaleMult: 3 },
    ],
  },
  {
    ability: 'stormcall',
    style: 'arx',
    unlockLevel: 62,
    ranks: [
      { note: 'Each strike asks for more.', damage: 6 },
      { note: 'The appointment runs long, and wide.', radius: 2.6, fieldTicks: 120 },
      {
        note: 'Combust rain: the burning yard waits longer for the sky, and the charge clings.',
        status: { status: 'shock', power: 1, durationTicks: 60 },
        follow: { after: 'burn', windowTicks: 80, damageMult: 1.5 },
      },
    ],
  },
  {
    ability: 'hollowcall',
    style: 'arx',
    unlockLevel: 66,
    ranks: [
      { note: 'The nothing bites deeper.', damage: 13 },
      {
        note: 'The invitation reaches farther, and the mouth keeps chewing longer.',
        radius: 2.6,
        knockback: -2.4,
        aftermath: { fieldTicks: 64, everyTicks: 16, damage: 3, knockback: -1.0 },
      },
      {
        note: 'The wide mouth: it opens quicker, closes on more, and a death inside it reopens the seat.',
        cooldownTicks: 280,
        castTicks: 22,
        damage: 13,
        onKill: { refundTicks: 100 },
      },
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
        note: 'The far double: it walks farther from the truth and holds more eyes.',
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
      { note: 'The white point: the last focusing burns three times over.', finaleMult: 3 },
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
        note: 'The whole sea: nothing swims out, and a burning yard boils in the drain.',
        damage: 5,
        knockback: -2.6,
        status: { status: 'chill', power: 1, durationTicks: 100 },
        follow: { after: 'burn', windowTicks: 60, damageMult: 1.7 },
      },
    ],
  },
  {
    ability: 'moonrise',
    style: 'arx',
    unlockLevel: 82,
    ranks: [
      { note: 'A heavier moon.', damage: 14 },
      {
        note: 'The silver reaches farther, and the slow runs longer.',
        radius: 2.8,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      {
        note: 'The long silver: the frost sheet outlasts the moon, and the moon answers the first call.',
        cooldownTicks: 220,
        castTicks: 24,
        damage: 16,
        aftermath: { fieldTicks: 100, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
      },
    ],
  },
  {
    ability: 'cometfall',
    style: 'arx',
    unlockLevel: 86,
    ranks: [
      { note: 'Heavier stones from farther away.', damage: 5 },
      { note: 'The sky opens wider.', radius: 2.6 },
      { note: 'The last visitor: the final stone falls at two and a half times its weight.', finaleMult: 2.5 },
    ],
  },
  {
    ability: 'daybreak',
    style: 'arx',
    unlockLevel: 90,
    ranks: [
      { note: 'Noon weighs more.', damage: 17 },
      { note: 'A wider noon.', radius: 2.8 },
      {
        note: 'The long noon: it burns hotter and the ground burns a full breath longer.',
        damage: 20,
        status: { status: 'burn', power: 1, durationTicks: 80 },
        aftermath: { fieldTicks: 100, everyTicks: 16, damage: 3, status: { status: 'burn', power: 1, durationTicks: 40 } },
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
      { note: 'The step lengthens; the rift stays open longer for you.', dashTiles: 10.4, cooldownTicks: 180 },
      {
        note: 'The shattering crossing: through chilled bodies the step strikes twice over.',
        status: { status: 'shock', power: 1, durationTicks: 80 },
        follow: { after: 'chill', windowTicks: 60, damageMult: 2 },
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
      { note: 'A wider patch of sky agrees, and the cold outstays it.', radius: 2.6, status: { status: 'chill', power: 1, durationTicks: 80 } },
      {
        note: 'The closing of winter: the last volley falls at two and a half times its weight.',
        pulseEveryTicks: 14,
        finaleMult: 2.5,
      },
    ],
  },
];
