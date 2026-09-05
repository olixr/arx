/**
 * THE DUALWIELD SCHOOL — THE WEAVE (THE MASTERED HAND, techniques v3).
 *
 * The school of flow and windows. Two knives spend rhythm the way a
 * greatblade spends weight: nearly every art leaves a hand's word in
 * the air (`left`, `right`) or opens the wound (`rend`), and nearly
 * every art follows another for a small, honest multiplier. The links
 * are many and short; the mastery is never dropping the thread. Bleed
 * stacks per hand, The Shears spend it, The Weave holds the loom to a
 * finale, and quicken is the self page the reel and the crown lay on
 * the caster's own hands.
 *
 * Signature: Twin Cut (left) → Two Bells (right follows left, ×1.5)
 * → Turning Reel (follows right, ×1.4 and a quicken stack).
 *
 * THE SECOND CADENCE (Phase 3): the weave's delivery is mostly instant
 * links — the whole signature and every link to level 15 is a press —
 * its casts are RARE and quick (the thrown orbit, the held wicks, the
 * gathered fall, the drawn execute, the spun-up storm: 14–20 ticks,
 * never the scholar's 24), and its channels are THE LOOM: a 12-tick
 * crossing, one beat quicker than every other school's held note, so
 * a weave note has four or five crossings where a beam has three.
 * The quickened hand is spoken by the LINK (`follow.self`): the reel
 * and the crown quicken only when they land inside the window.
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
 * The weave lays no hold at all: its control is the slow and the ring,
 * its page is the caster's own quickened hand.
 */
export const DUALWIELD_LICENSES: Record<string, string[]> = {
  mirrored_hand: ['quicken'],
  turning_reel: ['quicken'],
  hundred_hands: ['quicken'],
};

/** One stack of the quickened hand, laid on the caster by a landed weave. */
const QUICKEN_STACK = { status: 'quicken' as const, power: 0, durationTicks: 120 };

export const DUALWIELD_ARTS: AbilityDef[] = [
  // ----------------- THE SECOND BREATH — the dualwield breath arts

  // Rung 10, PAYOFF: the instant answer to the left hand's word. Two
  // Bells is the second press of the signature; rung 5's Twin Cut
  // leaves `left`, the bells ring ×1.5 inside the window and leave
  // `right` for the reel. THE SECOND CADENCE took its wind-up: a link
  // in a school of links is a press, never a breath — the level-10
  // player learns press, then press, and the bells trade the drawn
  // breath's weight for a shorter wait.
  {
    id: 'two_bells',
    name: 'Two Bells',
    desc: 'Both edges, rung together. Struck inside a left cut the peal lands half again and jars them still. Leaves the right hand open.',
    color: '#d9c46a',
    code: '2b',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.2,
    arc: 1.0,
    status: { status: 'shock', power: 1, durationTicks: 30 },
    role: 'payoff',
    tag: 'right',
    follow: { after: 'left', windowTicks: 60, damageMult: 1.5 },
  },

  // Rung 20, SUSTAIN: the first loom. The ribbons cross on the weave's
  // own 12-tick beat — four crossings where another school's note has
  // three — and the last crossing lands double; every pass leaves
  // bleed and the note itself leaves `rend`, the word The Shears and
  // First and Last read. The level-20 player's combo closer.
  {
    id: 'ribbonwork',
    name: 'Ribbonwork',
    desc: 'Hold the crossing. Four quick passes, every one a ribbon of blood, and the last pass cuts twice as deep. The wound stays open for the shears.',
    color: '#c45a4a',
    code: 'Rb',
    cooldownTicks: 220, // 11 s
    channelTicks: 48, // four crossings on the loom's 12-tick beat
    pulseEveryTicks: 12,
    shape: 'melee_arc',
    damage: 4,
    range: 2.1,
    arc: 1.1,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    role: 'sustain',
    tag: 'rend',
    finaleMult: 2,
  },

  // Rung 30, PAYOFF: the ranged reader of either hand. Thrown after
  // any hand's word the moons come home heavier; the throw is the
  // school's one way to spend a window from range, and its draw is a
  // knife hand's — sixteen ticks, quick and rare.
  {
    id: 'twin_moons',
    name: 'Twin Moons',
    desc: 'A short draw and both blades loosed on one orbit. They always come home, and thrown on the heels of either hand they come home heavier.',
    color: '#b8c4d8',
    code: 'Tn',
    cooldownTicks: 200, // 10 s
    castTicks: 16,
    shape: 'projectile_fan',
    damage: 6,
    range: 9,
    projectiles: 2,
    spreadArc: 0.18,
    projectileSpeed: 16,
    returns: true,
    role: 'payoff',
    follow: { after: ['left', 'right'], windowTicks: 60, damageMult: 1.4 },
  },

  // Rung 40, SUSTAIN: the cold circle. The slow is the weave's only
  // control; the reel holds the ring chilled while the last turn
  // lands double, and a chilled body is what Stormstitch reads.
  {
    id: 'silver_reel',
    name: 'Silver Reel',
    desc: 'Spin the pair into one cold circle and hold it. Four quick turns, everything in reach slows, and the last turn cuts twice as deep. Chilled bodies take the stitch harder.',
    color: '#a8c0cc',
    code: 'Sr',
    cooldownTicks: 240, // 12 s
    channelTicks: 48, // four turns on the loom's beat
    pulseEveryTicks: 12,
    shape: 'nova',
    damage: 3,
    radius: 1.9,
    status: { status: 'chill', power: 1, durationTicks: 40 },
    role: 'sustain',
    finaleMult: 2,
  },

  // Rung 50, OPENER: the burning left hand. A casted burst that lays
  // burn and leaves `left`; a kill inside it hands the wicks back.
  // The opener for Two Bells, Twin Moons and the dive at the high
  // rungs where the left word must keep flowing.
  {
    id: 'matched_flame',
    name: 'Matched Flame',
    desc: 'Two wicks, one short breath. The burst lands already burning and leaves the left hand open. A kill in the flame gives the breath back.',
    color: '#e0854a',
    code: 'Mf',
    cooldownTicks: 220, // 11 s
    castTicks: 18, // a knife hand's breath, not a scholar's
    shape: 'flurry',
    damage: 6,
    range: 2.1,
    arc: 1.1,
    hits: 3,
    pulseEveryTicks: 6,
    status: { status: 'burn', power: 1, durationTicks: 40 },
    role: 'opener',
    tag: 'left',
    onKill: { refundTicks: 30 },
  },

  // Rung 58, PAYOFF: the channel that reads the right hand. Begun
  // inside a right word the seam runs hotter foe to foe, and a body
  // chilled by the Silver Reel takes it harder still.
  {
    id: 'stormstitch',
    name: 'Stormstitch',
    desc: 'The left hand throws and the right answers, foe to foe. Begun on the heels of a right cut the seam runs hotter, and chilled bodies take it harder.',
    color: '#c8c86a',
    code: 'Sh',
    cooldownTicks: 220, // 11 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 8,
    radius: 3.0,
    chainTargets: 2,
    status: { status: 'shock', power: 1, durationTicks: 30 },
    role: 'payoff',
    follow: { after: 'right', windowTicks: 60, damageMult: 1.3 },
    vs: { status: 'chill', mult: 1.3 },
  },

  // Rung 66, OPENER: the casted fall that leaves a mirror of frost
  // on the ground and the right word in the air. The school's one
  // aftermath: the reflection stays where you landed.
  {
    id: 'mirrorfall',
    name: 'Mirrorfall',
    desc: 'Gather, leap, and land with your reflection. The mirror stays on the ground as a sheet of frost that slows whoever crosses it. Leaves the right hand open.',
    color: '#9ab8c8',
    code: 'Mi',
    cooldownTicks: 220, // 11 s
    castTicks: 16, // a short gather before the leap
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 8,
    radius: 1.9,
    status: { status: 'chill', power: 1, durationTicks: 40 },
    role: 'opener',
    tag: 'right',
    aftermath: { fieldTicks: 60, everyTicks: 20, damage: 2, status: { status: 'chill', power: 1, durationTicks: 40 } },
    onKill: { refundTicks: 30 },
  },

  // Rung 74, SUSTAIN: the loom itself. The longest note in the school,
  // five crossings on the 12-tick beat and a finale that lands triple;
  // every thread bleeds and the note leaves `rend` for the shears. The
  // held heart of the weave.
  {
    id: 'the_weave',
    name: 'The Weave',
    desc: 'Warp and weft, held to the count. Five crossings, every one bleeding, and the last lands three times over. Break the note early and you keep only the quiet beats.',
    color: '#b0a4c0',
    code: 'Wv',
    cooldownTicks: 240, // 12 s
    channelTicks: 60, // five crossings on the loom's beat
    pulseEveryTicks: 12,
    shape: 'melee_arc',
    damage: 3,
    range: 2.2,
    arc: 1.3,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    role: 'sustain',
    tag: 'rend',
    finaleMult: 2.5,
  },

  // Rung 82, PAYOFF: the casted executioner that reads the open wound.
  // After `rend` the first cut lands half again; on a bleeding body
  // the last cut reads deeper; a kill gives the door back.
  {
    id: 'first_and_last',
    name: 'First and Last',
    desc: 'One drawn breath, two cuts. Struck inside an open wound the first cut lands half again; the last cut closes hardest on the failing and on the bleeding. A kill gives the breath back.',
    color: '#e8d8a0',
    code: 'Fx',
    cooldownTicks: 200, // 10 s
    castTicks: 20, // the school's longest draw, and it is still a knife's
    shape: 'melee_arc',
    damage: 12,
    range: 2.3,
    arc: 1.0,
    executeBelow: { frac: 0.3, mult: 2.0 },
    role: 'payoff',
    follow: { after: 'rend', windowTicks: 60, damageMult: 1.5 },
    vs: { status: 'bleed', mult: 1.3 },
    onKill: { refundTicks: 40 },
  },

  // Rung 86, SUSTAIN: the ranged note. Both wings held on one flower
  // and the last visit lands double; the school's stand-off sustain
  // for the fight that will not close.
  {
    id: 'hummingbird',
    name: 'Hummingbird',
    desc: 'Wings too fast to see, held on one flower. Four visits, count them if you can; the last one lands twice as hard.',
    color: '#8ac4a8',
    code: 'Hm',
    cooldownTicks: 240, // 12 s
    channelTicks: 48, // four visits on the loom's beat
    pulseEveryTicks: 12,
    shape: 'projectile_fan',
    damage: 3,
    range: 9,
    projectiles: 2,
    spreadArc: 0.16,
    projectileSpeed: 17,
    role: 'sustain',
    finaleMult: 2,
  },

  // --------------------------- THE TWIN SCHOOL — the paired ladder
  // The school of tempo: everything arrives in pairs and the second
  // beat is the identity. Blows run lighter than melee's and land
  // oftener — two knives spend rhythm the way a greatblade spends
  // weight. Twin steel is melee steel; the school's own axis is time.

  // Rung 5, OPENER: the one-two that starts every weave. It bleeds,
  // it leaves `left`, and a kill hands the cut back. The first press
  // of the signature.
  {
    id: 'twin_cut',
    name: 'Twin Cut',
    desc: 'The one-two. Both edges bleed and the left hand stays open for the bells. A kill on the cut gives it back sooner.',
    color: '#d9a441',
    code: 'Tc',
    cooldownTicks: 150, // 7.5 s
    shape: 'flurry',
    damage: 7,
    range: 2.0,
    arc: 1.2,
    hits: 2,
    pulseEveryTicks: 5,
    status: { status: 'bleed', power: 1, durationTicks: 30 },
    role: 'opener',
    tag: 'left',
    onKill: { refundTicks: 40 },
  },

  // Rung 15, ANSWER: the step through. The school's mobility beat is
  // also a link: stepped inside a right word it hands its own
  // cooldown back, so the weave never stops moving.
  {
    id: 'heron_step',
    name: 'Heron Step',
    desc: 'Step through, not around. One edge going in, one coming out, both bleeding. Stepped on the heels of a right cut the step comes back sooner.',
    color: '#9ab4c4',
    code: 'He',
    cooldownTicks: 170, // 8.5 s
    shape: 'dash_strike',
    damage: 9,
    dashTiles: 6.8,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    role: 'answer',
    follow: { after: 'right', windowTicks: 60, refundTicks: 40 },
  },

  // Rung 25, OPENER: the right hand at range. Both knives cross,
  // bleed, and leave `right` for the reel and the step; a kill on the
  // throw hands the knives back.
  {
    id: 'crossed_throw',
    name: 'Crossed Throw',
    desc: 'Loose both at once; they cross halfway there and bleed where they land. Leaves the right hand open. A kill on the throw gives it back sooner.',
    color: '#c4b48a',
    code: 'Cx',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 6,
    range: 8,
    projectiles: 2,
    spreadArc: 0.15,
    projectileSpeed: 14,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    role: 'opener',
    tag: 'right',
    onKill: { refundTicks: 40 },
  },

  // Rung 35, ANSWER: the stance. There is no off hand for a while, and
  // the mirror lays one stack of the quickened hand on the caster —
  // the self page every weave builds toward.
  {
    id: 'mirrored_hand',
    name: 'Mirrored Hand',
    desc: 'For eight breaths there is no off hand, and both hands move a shade quicker.',
    color: '#e8d8a8',
    code: 'Mh',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { offhandWeight: 0.75, selfStatus: { ...QUICKEN_STACK, durationTicks: 160 }, durationTicks: 160 },
    role: 'answer',
  },

  // Rung 45, PAYOFF: the third press of the signature. Turned inside a
  // right word the ring lands harder and the LINK quickens the caster's
  // hands (`follow.self`, the door Phase 2 asked for): the reel pays
  // the weave in tempo only when the thread was kept.
  {
    id: 'turning_reel',
    name: 'Turning Reel',
    desc: 'One full turn, both edges out, and the ring around you empties. Turned on the heels of a right cut it lands harder and the link quickens your hands.',
    color: '#b8a88a',
    code: 'Tr',
    cooldownTicks: 160, // 8 s
    shape: 'nova',
    damage: 10,
    radius: 2.1,
    knockback: 1.1,
    role: 'payoff',
    follow: { after: 'right', windowTicks: 60, damageMult: 1.4, self: { selfStatus: QUICKEN_STACK, durationTicks: 1 } },
  },

  // Rung 54, SUSTAIN: the weaving stance. Every landed swing of either
  // hand lays a ribbon of bleed for the shears to spend; the stance
  // is the school's slow-burning sustain between notes.
  {
    id: 'red_ribbons',
    name: 'Red Ribbons',
    desc: 'A weaving stance. Every pass, either hand, leaves a ribbon of blood for the shears to close on.',
    color: '#c44a3a',
    code: 'Rr',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: {
      speedMult: 1.08,
      onHitStatus: { status: 'bleed', power: 1, durationTicks: 60 },
      durationTicks: 160,
    },
    role: 'sustain',
  },

  // Rung 62, ANSWER: the leap that scatters the ring. Dived on the
  // heels of a left word it comes back sooner; the school's escape is
  // still a link in the weave.
  {
    id: 'swallows_dive',
    name: "Swallow's Dive",
    desc: 'Up like a swallow, down like two knives, and the ring scatters. Dived on the heels of a left cut the wings come back sooner.',
    color: '#8ab4d8',
    code: 'Sd',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 3,
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 9.0,
    radius: 1.8,
    knockback: 1.2,
    role: 'answer',
    follow: { after: 'left', windowTicks: 60, refundTicks: 40 },
  },

  // Rung 70, PAYOFF: the school's consume. The shears close on a
  // bleeding body and SPEND every ribbon on it for half again; after
  // `rend` they close harder still; a kill gives them back.
  {
    id: 'the_shears',
    name: 'The Shears',
    desc: 'Two edges, closing. They spend every ribbon of blood on the body for half again, close hardest inside an open wound, and a kill gives them back.',
    color: '#b0a4b8',
    code: 'Ts',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 11,
    range: 2.2,
    arc: 0.9,
    executeBelow: { frac: 0.3, mult: 2.0 },
    role: 'payoff',
    follow: { after: 'rend', windowTicks: 60, damageMult: 1.4 },
    vs: { status: 'bleed', mult: 1.5, consume: true },
    onKill: { refundTicks: 40 },
  },

  // Rung 78, OPENER: the carried storm. THE SECOND CADENCE gave it the
  // wind-up Two Bells gave up — the storm is SPUN UP, a short gather
  // and then three rings that bleed and leave `left` for the high-rung
  // followers; a kill in the storm hands it back. The breath bought it
  // weight: heavier rings, a harder shove.
  {
    id: 'storm_of_two',
    name: 'Storm of Two',
    desc: 'Spin the storm up and carry it with you. It rings once for each hand, every ring bleeds and shoves, and the left hand stays open when it ends. A kill in the storm gives it back sooner.',
    color: '#a8b0c0',
    code: 'S2',
    cooldownTicks: 240, // 12 s
    castTicks: 14, // the spin-up: the school's shortest breath
    shape: 'pulse_nova',
    damage: 7,
    radius: 1.9,
    pulses: 3,
    pulseEveryTicks: 9,
    knockback: 1.0,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    role: 'opener',
    tag: 'left',
    onKill: { refundTicks: 30 },
  },

  // Rung 90, CROWN: the whole weave in one press. Five cuts that bleed,
  // land harder after any word in the air, close deeper on a bleeding
  // body, and come back on a kill; the LINK quickens the caster's
  // hands (`follow.self`) — the crown pays tempo for a kept thread.
  {
    id: 'hundred_hands',
    name: 'Hundred Hands',
    desc: 'Five cuts in a breath, every one bleeding. After any open hand they land harder and the link quickens your hands; they close deeper on a bleeding body. A kill gives them back.',
    color: '#e0c060',
    code: 'Hh',
    cooldownTicks: 300, // 15 s
    shape: 'flurry',
    damage: 5,
    range: 2.2,
    arc: 1.4,
    hits: 5,
    pulseEveryTicks: 5,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    role: 'crown',
    follow: { after: ['left', 'right', 'rend'], windowTicks: 60, damageMult: 1.3, self: { selfStatus: QUICKEN_STACK, durationTicks: 1 } },
    vs: { status: 'bleed', mult: 1.2 },
    onKill: { refundTicks: 40 },
  },

  // The page, PAYOFF: the champion's answer. Two cuts that drink, and
  // spoken inside either hand's word they drink deeper.
  {
    id: 'two_answers',
    name: 'Two Answers',
    desc: 'The champion asked once. You had two, and what they take you keep. Spoken inside either open hand both answers land harder.',
    color: '#e8c878',
    code: 'Tw',
    cooldownTicks: 220, // 11 s
    shape: 'flurry',
    damage: 9,
    range: 2.1,
    arc: 1.0,
    hits: 2,
    pulseEveryTicks: 3,
    drainFrac: 0.15,
    role: 'payoff',
    follow: { after: ['left', 'right'], windowTicks: 60, damageMult: 1.2 },
  },
];

export const DUALWIELD_LADDER: TechniqueDef[] = [
  // --------------------------- THE TWIN SCHOOL — the paired rungs
  {
    ability: 'twin_cut',
    style: 'dualwield',
    unlockLevel: 5,
    ranks: [
      { note: 'Both hands land heavier.', damage: 9 },
      { note: 'The wounds stay open longer.', status: { status: 'bleed', power: 1, durationTicks: 40 } },
      { note: 'The one-two comes back on every kill.', cooldownTicks: 140, onKill: { refundTicks: 60 } },
    ],
  },
  {
    ability: 'two_bells',
    style: 'dualwield',
    unlockLevel: 10,
    ranks: [
      { note: 'The bells ring harder.', damage: 12 },
      { note: 'The peal carries wider and holds them longer.', arc: 1.2, status: { status: 'shock', power: 1, durationTicks: 45 } },
      { note: 'The carillon: called sooner, and after a left cut the peal lands well over half again.', damage: 12, cooldownTicks: 140, follow: { after: 'left', windowTicks: 60, damageMult: 1.6 } },
    ],
  },
  {
    ability: 'heron_step',
    style: 'dualwield',
    unlockLevel: 15,
    ranks: [
      { note: 'The pass cuts deeper.', damage: 11 },
      { note: 'A longer stride through them.', dashTiles: 8.4, cooldownTicks: 160 },
      { note: 'The heron never lands: after a right cut the whole step comes back.', damage: 12, follow: { after: 'right', windowTicks: 60, refundTicks: 80 } },
    ],
  },
  {
    ability: 'ribbonwork',
    style: 'dualwield',
    unlockLevel: 20,
    ranks: [
      { note: 'The ribbons cut deeper.', damage: 5 },
      { note: 'The crossing takes a fifth pass.', channelTicks: 60 },
      { note: 'The red knot: the last pass lands half again over double.', finaleMult: 2.5 },
    ],
  },
  {
    ability: 'crossed_throw',
    style: 'dualwield',
    unlockLevel: 25,
    ranks: [
      { note: 'Each knife argues harder.', damage: 7 },
      { note: 'Thrown oftener, bitten deeper.', damage: 8, cooldownTicks: 150 },
      { note: 'They remember your hands, and come home.', returns: true, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'twin_moons',
    style: 'dualwield',
    unlockLevel: 30,
    ranks: [
      { note: 'The moons strike harder.', damage: 7 },
      { note: 'The orbit runs longer and faster.', range: 11, projectileSpeed: 18 },
      { note: 'Full moons: after either hand they come home at half again.', damage: 8, cooldownTicks: 190, follow: { after: ['left', 'right'], windowTicks: 60, damageMult: 1.6 } },
    ],
  },
  {
    ability: 'mirrored_hand',
    style: 'dualwield',
    unlockLevel: 35,
    ranks: [
      { note: 'The mirror holds longer.', self: { offhandWeight: 0.75, selfStatus: { ...QUICKEN_STACK, durationTicks: 200 }, durationTicks: 200 } },
      { note: 'The reflection sharpens.', self: { offhandWeight: 0.9, selfStatus: { ...QUICKEN_STACK, durationTicks: 200 }, durationTicks: 200 } },
      { note: 'For a while, the two hands are one.', self: { offhandWeight: 1.0, selfStatus: { ...QUICKEN_STACK, durationTicks: 220 }, durationTicks: 220 } },
    ],
  },
  {
    ability: 'silver_reel',
    style: 'dualwield',
    unlockLevel: 40,
    ranks: [
      { note: 'The reel cuts harder.', damage: 4 },
      { note: 'The reel winds a fifth turn.', channelTicks: 60 },
      { note: 'The circle widens, and the cold keeps.', radius: 2.2, status: { status: 'chill', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'turning_reel',
    style: 'dualwield',
    unlockLevel: 45,
    ranks: [
      { note: 'The turn cuts deeper.', damage: 12 },
      { note: 'A wider round, called oftener.', radius: 2.5, cooldownTicks: 150 },
      { note: 'The full turn: after a right cut the ring lands half again.', damage: 13, follow: { after: 'right', windowTicks: 60, damageMult: 1.5, self: { selfStatus: QUICKEN_STACK, durationTicks: 1 } } },
    ],
  },
  {
    ability: 'matched_flame',
    style: 'dualwield',
    unlockLevel: 50,
    ranks: [
      { note: 'The flames strike harder.', damage: 7 },
      { note: 'The burning lingers and the reach grows.', range: 2.3, status: { status: 'burn', power: 1, durationTicks: 50 } },
      { note: 'A fourth wick joins the burst, and a kill gives the whole breath back.', hits: 4, cooldownTicks: 200, onKill: { refundTicks: 50 } },
    ],
  },
  {
    ability: 'red_ribbons',
    style: 'dualwield',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The ribbons run redder.',
        self: { speedMult: 1.08, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 },
      },
      {
        note: 'The weave quickens.',
        self: { speedMult: 1.12, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 180 },
      },
      {
        note: 'Dance long enough and they wear the whole spool.',
        self: { speedMult: 1.12, onHitStatus: { status: 'bleed', power: 2, durationTicks: 80 }, durationTicks: 200 },
      },
    ],
  },
  {
    ability: 'stormstitch',
    style: 'dualwield',
    unlockLevel: 58,
    ranks: [
      { note: 'The seam strikes harder.', damage: 5 },
      { note: 'The stitch holds them longer.', status: { status: 'shock', power: 1, durationTicks: 40 } },
      { note: 'The long seam: a third foe, and after a right cut it runs at half again.', chainTargets: 3, follow: { after: 'right', windowTicks: 60, damageMult: 1.5 } },
    ],
  },
  {
    ability: 'swallows_dive',
    style: 'dualwield',
    unlockLevel: 62,
    ranks: [
      { note: 'The landing bites deeper.', damage: 14 },
      { note: 'A longer flight, a shorter wait.', dashTiles: 11.0, cooldownTicks: 210 },
      { note: 'The swallow turns: after a left cut the whole flight comes back.', damage: 16, radius: 2.1, knockback: 1.8, follow: { after: 'left', windowTicks: 60, refundTicks: 80 } },
    ],
  },
  {
    ability: 'mirrorfall',
    style: 'dualwield',
    unlockLevel: 66,
    ranks: [
      { note: 'The landing strikes harder.', damage: 13 },
      { note: 'The mirror spreads wider, colder.', radius: 2.2, status: { status: 'chill', power: 1, durationTicks: 50 } },
      { note: 'The mirror keeps: the frost stays a breath longer and bites.', damage: 15, aftermath: { fieldTicks: 80, everyTicks: 20, damage: 3, status: { status: 'chill', power: 1, durationTicks: 40 } } },
    ],
  },
  {
    ability: 'the_shears',
    style: 'dualwield',
    unlockLevel: 70,
    ranks: [
      { note: 'The blades close harder.', damage: 13 },
      { note: 'They read the thread earlier.', executeBelow: { frac: 0.35, mult: 2.2 }, cooldownTicks: 190 },
      { note: 'Most things were thread all along: inside an open wound they close double.', damage: 14, follow: { after: 'rend', windowTicks: 60, damageMult: 2 } },
    ],
  },
  {
    ability: 'the_weave',
    style: 'dualwield',
    unlockLevel: 74,
    ranks: [
      { note: 'The threads pull tighter.', damage: 4 },
      { note: 'The loom reaches wider.', arc: 1.6, range: 2.4 },
      { note: 'The weft runs red: the last crossing lands three times over.', cooldownTicks: 220, finaleMult: 3 },
    ],
  },
  {
    ability: 'storm_of_two',
    style: 'dualwield',
    unlockLevel: 78,
    ranks: [
      { note: 'Each ring lands heavier.', damage: 8 },
      { note: 'A fourth ring joins the round.', pulses: 4, cooldownTicks: 260 },
      { note: 'The storm spins up quicker and widens its round.', castTicks: 12, radius: 2.1, onKill: { refundTicks: 40 } },
    ],
  },
  {
    ability: 'first_and_last',
    style: 'dualwield',
    unlockLevel: 82,
    ranks: [
      { note: 'The first cut opens wider.', damage: 14 },
      { note: 'The door closes harder on the failing.', executeBelow: { frac: 0.35, mult: 2.2 } },
      { note: 'First and last arrive together: inside an open wound the first cut lands double.', damage: 15, castTicks: 18, follow: { after: 'rend', windowTicks: 60, damageMult: 2 } },
    ],
  },
  {
    ability: 'hummingbird',
    style: 'dualwield',
    unlockLevel: 86,
    ranks: [
      { note: 'The visits land harder.', damage: 4 },
      { note: 'The flower is further than it looks.', range: 10, projectileSpeed: 18 },
      { note: 'The last visit: both wings land three times over on the final beat.', finaleMult: 3 },
    ],
  },
  {
    ability: 'hundred_hands',
    style: 'dualwield',
    unlockLevel: 90,
    ranks: [
      { note: 'Every hand hits harder.', damage: 6 },
      { note: 'The breath shortens.', cooldownTicks: 280, pulseEveryTicks: 4 },
      { note: 'A sixth hand joins the count, and after any open hand they land half again.', hits: 6, follow: { after: ['left', 'right', 'rend'], windowTicks: 60, damageMult: 1.5, self: { selfStatus: QUICKEN_STACK, durationTicks: 1 } } },
    ],
  },
  {
    ability: 'two_answers',
    style: 'dualwield',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Both answers weigh more.', damage: 10 },
      { note: 'Spoken sooner.', damage: 11, cooldownTicks: 200 },
      { note: 'What the second answer takes, you keep.', damage: 12, drainFrac: 0.25 },
    ],
  },
];
