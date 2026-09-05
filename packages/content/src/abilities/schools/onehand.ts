/**
 * THE ONEHAND SCHOOL — its twenty rung arts (and its unwritten page) with
 * their honing ladders, one file per school (THE MASTERED HAND,
 * techniques v3, Phase 2 rebuild).
 *
 * THE DUELIST'S TEMPO. The one-hand blade reads the foe's rhythm. Its
 * openers are casted and fused blows that STAGGER (the short true hold)
 * or SUNDER (crack the guard) or ROOT (cold iron in the ring); its
 * payoffs are ripostes that follow inside the window and read what the
 * opener left; its sustains are the millwork press with a thrown
 * finale; its answers are the step and the guard. Four words hang in
 * the air: `stagger`, `sunder`, `riposte`, `root`.
 *
 * Signature: Whirlwind (sunder the ring) → Cold Iron (casted, roots the
 * ring) → Headsman's Stroke (follows root, reads sunder, executes).
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
 * Every stagger here is 14 ticks (the page's cap) behind a cast of at
 * least 10; the one root is 30 ticks behind a 24-tick cast and a
 * 14-tick fuse. Duty at every rank stays under a tenth of the cycle.
 */
export const ONEHAND_LICENSES: Record<string, string[]> = {
  heavy_slam: ['stagger'],
  cold_iron: ['root'],
  stagger_stomp: ['stagger'],
  warlords_descent: ['stagger'],
};

export const ONEHAND_ARTS: AbilityDef[] = [
  // Rung 5, OPENER. The first word a duelist learns: a wound-up overhead that staggers, so Ember Edge at 10 already has a riposte to land.
  {
    id: 'heavy_slam',
    name: 'Heavy Slam',
    desc: 'Raise the blade and bring it down. What it lands on staggers for a breath, and your riposte is waiting.',
    color: '#b8865a',
    code: 'Hs',
    cooldownTicks: 170, // 8.5 s
    castTicks: 14, // 0.7 s raised, 0.56 s planted: the warning is the whole hold
    shape: 'melee_arc',
    damage: 9,
    range: 2.2,
    arc: 1.1,
    knockback: 1.6,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'opener',
    tag: 'stagger',
    onKill: { refundTicks: 60 },
  },

  // Rung 10, PAYOFF. The riposte itself: a casted cut that burns, half again on a staggered body or from the guard, and leaves its own word for the wheel.
  {
    id: 'ember_edge',
    name: 'Ember Edge',
    desc: 'Draw the cut through a held breath of fire. On a staggered foe, or straight out of your guard, it lands half again and burns.',
    color: '#e8763c',
    code: 'Ee',
    cooldownTicks: 200, // 10 s
    castTicks: 18, // 0.9 s wound, 0.72 s planted
    shape: 'melee_arc',
    damage: 8,
    range: 2.2,
    arc: 1.2,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'payoff',
    tag: 'riposte',
    follow: { after: ['stagger', 'riposte'], windowTicks: 60, damageMult: 1.5 },
  },

  // Rung 15, ANSWER. The step: a charge that closes or breaks distance and cracks the guard it hits, so the sunder readers (Levinstroke, Gloomfall) have a mark.
  {
    id: 'bull_rush',
    name: 'Bull Rush',
    desc: 'Lower the shoulder and go through them. Whatever you hit is cracked open for the next stroke.',
    color: '#c48a5a',
    code: 'Br',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 6.4,
    travel: 'charge',
    knockback: 2.0,
    status: { status: 'sunder', power: 15, durationTicks: 60 },
    role: 'answer',
    tag: 'sunder',
  },

  // Rung 20, SUSTAIN. The millwork press: a held wheel of cuts that grinds harder after a riposte and, mastered, throws the stone on its last turn.
  {
    id: 'millwork',
    name: 'Millwork',
    desc: 'Set your feet and turn the blade like the wheel. Begun on a riposte it grinds harder, and the last turn throws the stone.',
    color: '#c8b088',
    code: 'Mk',
    cooldownTicks: 200, // 10 s
    channelTicks: 48, // 2.4 s held, three turns of the wheel
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 2.4,
    role: 'sustain',
    follow: { after: 'riposte', windowTicks: 60, damageMult: 1.25 },
  },

  // Rung 25, OPENER. The wide opener: three light turns that crack every guard in the ring, the first press of the signature.
  {
    id: 'whirlwind',
    name: 'Whirlwind',
    desc: 'Three spinning cuts while you keep moving. They do not bite deep, but every guard they touch is cracked open.',
    color: '#d9a05a',
    code: 'Ww',
    cooldownTicks: 240, // 12 s
    shape: 'pulse_nova',
    damage: 3,
    radius: 1.8,
    pulses: 3,
    pulseEveryTicks: 8,
    knockback: 0.6,
    status: { status: 'sunder', power: 10, durationTicks: 60 },
    role: 'opener',
    tag: 'sunder',
    onKill: { refundTicks: 60 },
  },

  // Rung 30, PAYOFF. The line payoff: a casted bolt that pierces the file and lands half again down a line you just cracked open.
  {
    id: 'levinstroke',
    name: 'Levinstroke',
    desc: 'Hold the blade high until it crackles, then loose the levin down the line. Loosed at a cracked guard it lands half again.',
    color: '#8ab8f0',
    code: 'Lv',
    cooldownTicks: 200, // 10 s
    castTicks: 20, // 1 s drawn, 0.8 s planted
    shape: 'projectile_fan',
    damage: 11,
    range: 14,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true, // the storm does not stop for the first opinion
    status: { status: 'shock', power: 1, durationTicks: 60 },
    role: 'payoff',
    follow: { after: 'sunder', windowTicks: 70, damageMult: 1.5 },
  },

  // Rung 35, ANSWER. The guard: a shout that hardens into a shield and opens the riposte window, so Ember Edge, Millwork and First Light read it.
  {
    id: 'warcry',
    name: 'Warcry',
    desc: 'A shout that hardens into armor around you. Take the guard, and the riposte that follows it lands harder.',
    color: '#d9b05a',
    code: 'Wc',
    cooldownTicks: 280, // 14 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 6, speedMult: 1.1, durationTicks: 120 },
    role: 'answer',
    tag: 'riposte',
  },

  // Rung 40, SUSTAIN. The held point: a draining beam that reads a cracked guard and, mastered, closes the account on its last beat.
  {
    id: 'red_ledger',
    name: 'Red Ledger',
    desc: 'Hold the point out and open the account. Every beat takes its due in red and pays you, more from a cracked guard.',
    color: '#c03848',
    code: 'Rl',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48, // 2.4 s held, three entries in the book
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 6,
    width: 0.5, // the tether's corridor, red_thread's proven slimness
    drainFrac: 0.35, // what the ledger takes, it pays you
    vs: { status: 'sunder', mult: 1.3 },
    role: 'sustain',
  },

  // Rung 45, PAYOFF. The thrown riposte: edges hurled into a staggered line land half again and come back to the hand sooner.
  {
    id: 'steel_wave',
    name: 'Steel Wave',
    desc: 'Hurl the swing itself, an arc of edges that keeps going. Thrown at a staggered foe it bites half again and is sooner back in hand.',
    color: '#b8bec8',
    code: 'Sw',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 6,
    range: 4.5,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 14,
    pierce: true,
    role: 'payoff',
    follow: { after: 'stagger', windowTicks: 60, damageMult: 1.5, refundTicks: 40 },
  },

  // Rung 50, OPENER. The signature's second press: a long cast and a fuse, then cold iron roots the ring for the Headsman.
  {
    id: 'cold_iron',
    name: 'Cold Iron',
    desc: 'Plant cold iron at your mark. Winter roots everything in the ring for a breath and a half, and the headsman reads a rooted neck.',
    color: '#9cc8dc',
    code: 'Ci',
    cooldownTicks: 220, // 11 s: 30t of root against 340t of cycle is under the tenth
    castTicks: 24, // 1.2 s wound, 0.96 s planted
    shape: 'ground_aoe',
    damage: 10,
    range: 8,
    radius: 2.0,
    fuseTicks: 14, // cast plus fuse warns 38t for a 30t hold
    status: { status: 'root', power: 1, durationTicks: 30 },
    role: 'opener',
    tag: 'root',
  },

  // Rung 54, ANSWER. The hunger: lifesteal for the long fight, and every plain cut cracks the guard so the ledger and the headsman always have a mark.
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    desc: 'For six seconds every wound your blade deals feeds you, and every plain cut cracks the guard it lands on.',
    color: '#c4372a',
    code: 'Bl',
    cooldownTicks: 280, // 14 s
    shape: 'self_buff',
    damage: 0,
    self: {
      meleeLifesteal: 0.4,
      onHitStatus: { status: 'sunder', power: 10, durationTicks: 40 },
      durationTicks: 120,
    },
    role: 'answer',
  },

  // Rung 58, SUSTAIN. Cold footwork: a held pattern of frost rings that keeps the ring from stepping out, with a freezing last ring at mastery.
  {
    id: 'frostwork',
    name: 'Frostwork',
    desc: 'Stand fast and let the cold work outward in rings. Nothing in the pattern keeps its stride, and the last ring bites hardest.',
    color: '#bce4f0',
    code: 'Fw',
    cooldownTicks: 240, // 12 s
    channelTicks: 64, // 3.2 s held, four rings of the pattern
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 3,
    radius: 2.2,
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'sustain',
  },

  // Rung 62, OPENER. The late stagger: a short raised heel, then the whole ring reels, so the high ripostes (Steel Wave, Headsman) have their window in a crowd.
  {
    id: 'stagger_stomp',
    name: 'Stagger Stomp',
    desc: 'Raise the heel and bring it down. Everything around you staggers for a breath, and your riposte is open on all of them.',
    color: '#a4886a',
    code: 'Sp',
    cooldownTicks: 200, // 10 s
    castTicks: 10, // 0.5 s raised: warns 10t for a 14t hold
    shape: 'nova',
    damage: 7,
    radius: 2.0,
    knockback: 1.2,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'opener',
    tag: 'stagger',
    onKill: { refundTicks: 60 },
  },

  // Rung 66, ANSWER. The long step: a gathered charge that crosses the yard, and out of the guard or a riposte it arrives harder.
  {
    id: 'first_light',
    name: 'First Light',
    desc: 'Plant your feet and gather the dawn, then arrive like light through a doorway. Out of the guard or a riposte you arrive harder.',
    color: '#f0dca0',
    code: 'Fl',
    cooldownTicks: 200, // 10 s
    castTicks: 20, // 1 s gathered, 0.8 s planted
    shape: 'dash_strike',
    damage: 12,
    dashTiles: 7.0,
    travel: 'charge',
    role: 'answer',
    follow: { after: 'riposte', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 70, PAYOFF. The signature's third press: the execute that follows a root or stagger, reads a cracked guard, and gives the seat back on a kill.
  {
    id: 'headsman_stroke',
    name: "Headsman's Stroke",
    desc: 'One clean arc for those already kneeling. On a rooted or staggered neck it lands harder, a cracked guard lets more through, and a kill returns it to your hand.',
    color: '#8a4a3a',
    code: 'Hk',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'melee_arc',
    damage: 12,
    range: 2.2,
    arc: 0.9,
    executeBelow: { frac: 0.3, mult: 1.8 },
    vs: { status: 'sunder', mult: 1.3 },
    role: 'payoff',
    follow: { after: ['root', 'stagger'], windowTicks: 60, damageMult: 1.3 },
    onKill: { refundTicks: 80 },
  },

  // Rung 74, SUSTAIN. The held storm: a channeled circuit that leaps throat to throat and, mastered, throws its whole charge on the last peal.
  {
    id: 'live_iron',
    name: 'Live Iron',
    desc: 'Hold the blade up and let the storm take it. Every beat leaps for the next throat, and the last peal throws the whole charge.',
    color: '#e8d84a',
    code: 'Li',
    cooldownTicks: 240, // 12 s
    channelTicks: 48, // 2.4 s held, three peals of the circuit
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 3,
    range: 8,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'sustain',
  },

  // Rung 78, OPENER. The falling opener: a leap that cracks every guard in the ring and leaves the ground broken under them for the payoffs to read.
  {
    id: 'earthbreaker',
    name: 'Earthbreaker',
    desc: 'Leap to your mark and land like a verdict. Every guard in the ring is cracked, and the broken ground keeps biting.',
    color: '#a4744b',
    code: 'Ek',
    cooldownTicks: 240, // 12 s
    shape: 'leap_slam',
    damage: 10,
    dashTiles: 9.0,
    radius: 2.2,
    knockback: 2.0,
    status: { status: 'sunder', power: 15, durationTicks: 60 },
    role: 'opener',
    tag: 'sunder',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, radius: 2.2 },
    onKill: { refundTicks: 60 },
  },

  // Rung 82, PAYOFF. The ring payoff: a gathered night that spends every cracked guard around you for half again and spreads wider after a sunder.
  {
    id: 'gloomfall',
    name: 'Gloomfall',
    desc: 'Gather the dark along the edge, then pour out night in a ring. It takes every cracked guard with it for half again, and drags at the heels.',
    color: '#6a5a88',
    code: 'Gf',
    cooldownTicks: 250, // 12.5 s
    castTicks: 26, // 1.3 s gathered, 1.04 s planted
    shape: 'nova',
    damage: 13,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 60 }, // the gloom drags at the heels
    vs: { status: 'sunder', mult: 1.5, consume: true },
    role: 'payoff',
    follow: { after: 'sunder', windowTicks: 70, radiusMult: 1.3 },
  },

  // Rung 86, SUSTAIN. The staked ring: noon held over a mark, hammering every beat, with the noon stroke on the last fall at mastery.
  {
    id: 'noonfall',
    name: 'Noonfall',
    desc: 'Stake a ring and hold noon over it. Shafts of light hammer every beat, and the last fall is the noon stroke.',
    color: '#f8e8b0',
    code: 'Nn',
    cooldownTicks: 260, // 13 s
    channelTicks: 64, // 3.2 s held, four falls of the light
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 10,
    radius: 2.2,
    fuseTicks: 12,
    role: 'sustain',
  },

  // Rung 90, CROWN. Three acts in one press: the raised banner, the landing that staggers the ring, and the planted ground that keeps you shielded and quick while you stand on it.
  {
    id: 'warlords_descent',
    name: "Warlord's Descent",
    desc: 'Raise the banner, then come down on them. The ring staggers, the ground you land on is yours, and standing on it you are shielded and quick.',
    color: '#d9a05a',
    code: 'Wd',
    cooldownTicks: 270, // 13.5 s
    castTicks: 16, // 0.8 s raised: warns 16t for a 14t hold
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 8.0,
    radius: 2.3,
    knockback: 1.6,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'crown',
    tag: 'stagger',
    aftermath: {
      fieldTicks: 80,
      everyTicks: 16,
      damage: 2,
      radius: 2.3,
      self: { shieldHp: 4, speedMult: 1.1, durationTicks: 18 },
    },
    onKill: { refundTicks: 80 },
  },

  // The unwritten page, PAYOFF. A sworn riposte: from the guard or an Ember Edge it lands harder and the oath repays the arm.
  {
    id: 'oathbound_edge',
    name: 'Oathbound Edge',
    desc: 'A sworn stroke. Out of the guard or a riposte it lands harder, and the oath repays the arm in blood.',
    color: '#e8c04c',
    code: 'Oe',
    cooldownTicks: 200, // 10 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 11,
    range: 2.3,
    arc: 1.2,
    drainFrac: 0.2,
    role: 'payoff',
    follow: { after: 'riposte', windowTicks: 60, damageMult: 1.4 },
  },
];

export const ONEHAND_LADDER: TechniqueDef[] = [
  {
    ability: 'heavy_slam',
    style: 'onehand',
    unlockLevel: 5,
    ranks: [
      { note: 'The blow lands heavier.', damage: 11 },
      { note: 'The blade is raised quicker, and ready again sooner.', castTicks: 12, cooldownTicks: 160 },
      {
        note: 'THE QUICK RETURN: they fly farther, and a kill on the slam returns the blade at once.',
        knockback: 2.4,
        onKill: { refundTicks: 90 },
      },
    ],
  },
  {
    ability: 'ember_edge',
    style: 'onehand',
    unlockLevel: 10,
    ranks: [
      { note: 'The edge bites deeper.', damage: 10 },
      {
        note: 'A riposte burns twice as hot.',
        follow: {
          after: ['stagger', 'riposte'],
          windowTicks: 60,
          damageMult: 1.5,
          status: { status: 'burn', power: 2, durationTicks: 60 },
        },
      },
      {
        note: 'THE RETURNED BLADE: a landed riposte gives two seconds back to the hand.',
        castTicks: 16,
        follow: {
          after: ['stagger', 'riposte'],
          windowTicks: 60,
          damageMult: 1.5,
          status: { status: 'burn', power: 2, durationTicks: 60 },
          refundTicks: 40,
        },
      },
    ],
  },
  {
    ability: 'bull_rush',
    style: 'onehand',
    unlockLevel: 15,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 9 },
      { note: 'A longer charge, sooner ready.', dashTiles: 8.4, cooldownTicks: 150 },
      {
        note: 'THE SPLIT GUARD: nothing stands where you arrive, and the crack goes deeper.',
        knockback: 2.8,
        status: { status: 'sunder', power: 20, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'millwork',
    style: 'onehand',
    unlockLevel: 20,
    ranks: [
      { note: 'Every pass grinds harder.', damage: 5 },
      { note: 'The stone is ready again sooner.', cooldownTicks: 180 },
      { note: 'THE THROWN STONE: the last turn of the wheel lands at twice the weight.', finaleMult: 2.0 },
    ],
  },
  {
    ability: 'whirlwind',
    style: 'onehand',
    unlockLevel: 25,
    ranks: [
      { note: 'Each cut bites deeper.', damage: 4 },
      { note: 'The blade reaches a step farther, sooner.', radius: 2.1, cooldownTicks: 220 },
      {
        note: 'THE FOURTH TURN: the storm turns again, and the crack it leaves goes deeper.',
        pulses: 4,
        status: { status: 'sunder', power: 20, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'levinstroke',
    style: 'onehand',
    unlockLevel: 30,
    ranks: [
      { note: 'The stroke lands heavier.', damage: 13 },
      {
        note: 'The charge clings longer to what it strikes.',
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
      { note: 'THE SHORT WIND: the levin leaps from a shorter draw, and sooner.', castTicks: 14, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'warcry',
    style: 'onehand',
    unlockLevel: 35,
    ranks: [
      {
        note: 'The shout holds more of the blow.',
        self: { shieldHp: 8, speedMult: 1.1, durationTicks: 120 },
      },
      { note: 'Your voice recovers faster.', cooldownTicks: 240 },
      {
        note: 'THE LONG GUARD: the war hears you and hurries, and the guard holds longer.',
        self: { shieldHp: 8, speedMult: 1.15, durationTicks: 140 },
      },
    ],
  },
  {
    ability: 'red_ledger',
    style: 'onehand',
    unlockLevel: 40,
    ranks: [
      { note: 'The toll rises.', damage: 5 },
      { note: 'More of the red comes home to you.', drainFrac: 0.5, cooldownTicks: 200 },
      { note: 'THE CLOSED ACCOUNT: the last beat takes the whole balance at twice the weight.', finaleMult: 2.0 },
    ],
  },
  {
    ability: 'steel_wave',
    style: 'onehand',
    unlockLevel: 45,
    ranks: [
      { note: 'The edges bite deeper.', damage: 8 },
      { note: 'The wave rolls out oftener.', cooldownTicks: 190 },
      { note: 'THE FOURTH EDGE: a fourth blade joins the wave.', projectiles: 4, spreadArc: 0.6 },
    ],
  },
  {
    ability: 'cold_iron',
    style: 'onehand',
    unlockLevel: 50,
    ranks: [
      { note: 'The frost bites deeper.', damage: 12 },
      { note: 'Winter spreads wider, and is sooner recalled.', radius: 2.3, cooldownTicks: 200 },
      {
        note: 'THE RIME RING: the iron goes in quicker and leaves a frost sheet that drags every heel.',
        castTicks: 20,
        aftermath: {
          fieldTicks: 48,
          everyTicks: 16,
          damage: 1,
          radius: 2.3,
          status: { status: 'chill', power: 1, durationTicks: 40 },
        },
      },
    ],
  },
  {
    ability: 'bloodlust',
    style: 'onehand',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The red joy holds for eight seconds.',
        self: {
          meleeLifesteal: 0.4,
          onHitStatus: { status: 'sunder', power: 10, durationTicks: 40 },
          durationTicks: 160,
        },
      },
      {
        note: 'Every wound feeds you more.',
        self: {
          meleeLifesteal: 0.55,
          onHitStatus: { status: 'sunder', power: 10, durationTicks: 40 },
          durationTicks: 160,
        },
      },
      {
        note: 'THE DEEP HUNGER: the hunger quickens your stride, and every plain cut cracks deeper.',
        self: {
          meleeLifesteal: 0.55,
          speedMult: 1.12,
          onHitStatus: { status: 'sunder', power: 15, durationTicks: 40 },
          durationTicks: 160,
        },
      },
    ],
  },
  {
    ability: 'frostwork',
    style: 'onehand',
    unlockLevel: 58,
    ranks: [
      { note: 'Each ring etches deeper.', damage: 4 },
      {
        note: 'The pattern reaches farther and grips longer.',
        radius: 2.5,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'THE LAST RING: the fourth ring lands at twice the weight.', finaleMult: 2.0 },
    ],
  },
  {
    ability: 'stagger_stomp',
    style: 'onehand',
    unlockLevel: 62,
    ranks: [
      { note: 'The heel falls heavier.', damage: 9 },
      { note: 'The floor passes it farther, sooner.', radius: 2.4, cooldownTicks: 180 },
      {
        note: 'THE RINGING FLOOR: the heel falls heavier, they fly farther, a kill returns it at once.',
        damage: 10,
        knockback: 1.8,
        onKill: { refundTicks: 90 },
      },
    ],
  },
  {
    ability: 'first_light',
    style: 'onehand',
    unlockLevel: 66,
    ranks: [
      { note: 'You arrive harder.', damage: 14 },
      { note: 'The doorway opens farther off.', dashTiles: 9.0, cooldownTicks: 190 },
      { note: 'THE SHORT GATHER: first light breaks from a shorter gather.', castTicks: 16 },
    ],
  },
  {
    ability: 'headsman_stroke',
    style: 'onehand',
    unlockLevel: 70,
    ranks: [
      { note: 'The arc lands heavier.', damage: 14 },
      { note: 'The stroke returns to the shoulder sooner.', cooldownTicks: 200 },
      {
        note: 'THE WIDER VERDICT: more necks are kneeling, and a kill returns the stroke sooner still.',
        executeBelow: { frac: 0.35, mult: 2.0 },
        onKill: { refundTicks: 100 },
      },
    ],
  },
  {
    ability: 'live_iron',
    style: 'onehand',
    unlockLevel: 74,
    ranks: [
      { note: 'The current bites deeper.', damage: 4 },
      { note: 'A fourth throat joins the circuit.', chainTargets: 4 },
      {
        note: 'THE LAST PEAL: the charge clings longer, and the third peal throws half again.',
        status: { status: 'shock', power: 1, durationTicks: 90 },
        finaleMult: 1.5,
      },
    ],
  },
  {
    ability: 'earthbreaker',
    style: 'onehand',
    unlockLevel: 78,
    ranks: [
      { note: 'You land heavier.', damage: 12 },
      { note: 'The leap carries farther; the verdict spreads wider.', dashTiles: 11.0, radius: 2.5 },
      {
        note: 'THE OPENED EARTH: the broken ground bites harder and longer; the mountain falls oftener.',
        cooldownTicks: 230,
        aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 2.5 },
      },
    ],
  },
  {
    ability: 'gloomfall',
    style: 'onehand',
    unlockLevel: 82,
    ranks: [
      { note: 'The dark falls heavier.', damage: 15 },
      {
        note: 'Night spreads wider and drags at more heels.',
        radius: 2.7,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'THE QUICK DARK: the gloom gathers quicker, and deeper.', damage: 16, castTicks: 22 },
    ],
  },
  {
    ability: 'noonfall',
    style: 'onehand',
    unlockLevel: 86,
    ranks: [
      { note: 'The light hammers harder.', damage: 5 },
      { note: 'The ring widens.', radius: 2.5 },
      { note: 'THE NOON STROKE: the fourth fall lands at twice the weight.', finaleMult: 2.0 },
    ],
  },
  {
    ability: 'warlords_descent',
    style: 'onehand',
    unlockLevel: 90,
    ranks: [
      { note: 'You land heavier still.', damage: 14 },
      { note: 'The banner spreads wider, oftener.', radius: 2.6, cooldownTicks: 250 },
      {
        note: 'THE PLANTED BANNER: the held ground bites harder; stand on it shielded and quick.',
        knockback: 2.2,
        aftermath: {
          fieldTicks: 80,
          everyTicks: 16,
          damage: 3,
          radius: 2.6,
          self: { shieldHp: 6, speedMult: 1.15, durationTicks: 18 },
        },
      },
    ],
  },
  {
    ability: 'oathbound_edge',
    style: 'onehand',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The oath weighs more.', damage: 13 },
      { note: 'The vow opens wider, oftener.', arc: 1.4, cooldownTicks: 180 },
      { note: 'THE FULL OATH: the oath repays in full.', drainFrac: 0.3 },
    ],
  },
];
