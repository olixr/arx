/**
 * THE SHIELD SCHOOL — THE HELD LINE (THE MASTERED HAND, techniques v3,
 * Phase 2). Twenty rung arts and the unwritten page, rebuilt on the
 * school's own grammar: the wall PLANTS ground and HOLDS it (the held
 * ground fields wear armor and reflect while you stand in them), the
 * openers TAUNT and STAGGER (every hold is casted or fused by law),
 * the payoffs read the word the wall left (a bash on a ringing body, a
 * door laid on the bodies that turned to you, the rampart broken under
 * a staggered ring), the sustains are the turning walls with a last
 * beat that pays the whole note, and the answers are the stance, the
 * rush, the roof and the turned blow. Tags: `stagger`, `taunt`, `wall`.
 *
 * The signature, three presses: Hold the Line (plant the ground, the
 * word is `wall`) → Iron Toll (cast, the ring staggers, the word is
 * `stagger`) → Rampart Break (follows stagger or wall: ×2 and the
 * armor cracks). A level-20 player already owns Iron Toll → Shield
 * Bash and Set the Wall → Grindstone.
 *
 * Ids never change (plates, faces, signatures, saved seats). Shapes,
 * numbers, descs and rank notes are the wave's to rewrite.
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
 * The shield's holds are all STAGGER, all casted: the bell (Iron
 * Toll), the anchor (Anchorfall) and the crown (Unbroken). Lock 14t
 * against a 56t immunity; every cycle sits under a twentieth.
 */
export const SHIELD_LICENSES: Record<string, string[]> = {
  iron_toll: ['stagger'],
  anchorfall: ['stagger'],
  unbroken: ['stagger'],
};

export const SHIELD_ARTS: AbilityDef[] = [
  // -------------------- THE SECOND BREATH — the shield breath arts
  // OPENER at 10: the school's first word. A casted ring that staggers
  // everything at arm's reach; Shield Bash (5) and Rampart Break (62)
  // read the stagger, and a staggered caster loses its breath.
  {
    id: 'iron_toll',
    name: 'Iron Toll',
    desc: 'Draw the shield back and ring it like a bell. Everything in reach stands staggered a breath, and a blow landed on a ringing body lands harder.',
    color: '#8ea4b8',
    code: 'Il',
    cooldownTicks: 150, // 7.5 s
    castTicks: 20,
    shape: 'nova',
    damage: 7,
    radius: 2.2,
    knockback: 0.8,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'opener',
    tag: 'stagger',
  },

  // SUSTAIN at 20: the millwork of the wall. A channel that grinds the
  // armor off and pays its last turn at a finale; braced on a set wall
  // it bites deeper. Wheel of Iron (70) spends the sunder it leaves.
  {
    id: 'grindstone',
    name: 'Grindstone',
    desc: 'Set the rim against them and turn. Every turn strips armor, the last turn strips most, and a wall set before you start grinds deeper.',
    color: '#9a9484',
    code: 'Gn',
    cooldownTicks: 200, // 10 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 1.2,
    status: { status: 'sunder', power: 10, durationTicks: 60 },
    role: 'sustain',
    finaleMult: 2,
    follow: { after: 'wall', windowTicks: 60, damageMult: 1.3 },
  },

  // PAYOFF at 30: the door comes down on the bodies that turned to you
  // or stand staggered, and at rank IV it lies where it fell, held
  // ground you stand on.
  {
    id: 'doorfall',
    name: 'Doorfall',
    desc: 'Lift the wall and lay it down on them. On bodies that turned to you or still stagger, the door lands half again as hard and wider.',
    color: '#7d8a9a',
    code: 'Do',
    cooldownTicks: 210, // 10.5 s
    castTicks: 22,
    shape: 'ground_aoe',
    damage: 12,
    range: 4,
    radius: 2.0,
    fuseTicks: 8,
    knockback: 1.4,
    role: 'payoff',
    follow: { after: ['taunt', 'stagger'], windowTicks: 70, damageMult: 1.5, radiusMult: 1.25 },
  },

  // SUSTAIN at 40: the lane held cold. A beam channel with a finale
  // that slams the gate, and the frost it leaves on the lane stays.
  {
    id: 'held_gate',
    name: 'Held Gate',
    desc: 'Brace and hold the cold line of the lane. Each breath chills what crosses, the last breath slams the gate shut, and the frost stays on the lane after.',
    color: '#7ab0cc',
    code: 'Hg',
    cooldownTicks: 190, // 9.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 6,
    width: 0.7,
    status: { status: 'chill', power: 1, durationTicks: 40 },
    role: 'sustain',
    finaleMult: 1.5,
    aftermath: { fieldTicks: 60, everyTicks: 20, damage: 2, radius: 1.4, status: { status: 'chill', power: 1, durationTicks: 30 } },
  },

  // PAYOFF at 50: noon turned loose on the bodies that turned to you
  // (Draw Iron's word), and the brass leaves fire on the yard.
  {
    id: 'sunbrass',
    name: 'Sunbrass',
    desc: 'Catch noon on the boss and turn it loose. Bodies that turned to you take it full in the face, and the ground keeps burning where it fell.',
    color: '#d9b45e',
    code: 'Sb',
    cooldownTicks: 230, // 11.5 s
    castTicks: 24,
    shape: 'nova',
    damage: 9,
    radius: 2.6,
    knockback: 1.0,
    status: { status: 'burn', power: 1, durationTicks: 50 },
    role: 'payoff',
    follow: { after: 'taunt', windowTicks: 70, damageMult: 1.6 },
    aftermath: { fieldTicks: 60, everyTicks: 20, damage: 2, status: { status: 'burn', power: 1, durationTicks: 30 } },
  },

  // SUSTAIN at 58: the wall turns like a mill wheel, throwing back the
  // bodies that came to it (after the taunt) and paying its last turn.
  {
    id: 'millwall',
    name: 'Millwall',
    desc: 'The wall turns like a mill wheel and throws the water back. Turn it on bodies that answered your shout and every turn lands harder; the last turn throws hardest.',
    color: '#8a94a4',
    code: 'Mw',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.1,
    knockback: 0.8,
    role: 'sustain',
    finaleMult: 2,
    follow: { after: 'taunt', windowTicks: 80, damageMult: 1.3 },
  },

  // OPENER at 66: the anchor. A casted leap whose landing staggers the
  // ring; Rampart Break and Shield Bash read it, and at rank IV the
  // parted sea stays parted as a frost sheet.
  {
    id: 'anchorfall',
    name: 'Anchorfall',
    desc: 'Be the anchor. Leap, and the ring you land in stands staggered a breath; break the rampart or bash while they ring.',
    color: '#6a94b0',
    code: 'Ac',
    cooldownTicks: 250, // 12.5 s
    castTicks: 22,
    shape: 'leap_slam',
    damage: 10,
    dashTiles: 8,
    radius: 2.2,
    knockback: 1.6,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'opener',
    tag: 'stagger',
  },

  // SUSTAIN at 74: the wall advances one strike at a time and keeps
  // the ground it took, armor while you stand on it. From a set wall
  // the advance lands heavier.
  {
    id: 'patient_wall',
    name: 'The Patient Wall',
    desc: 'The wall advances one strike at a time and keeps the ground it takes. Stand on that ground and it armors you; advance from a set wall and every strike lands heavier.',
    color: '#a4988a',
    code: 'Pl',
    cooldownTicks: 230, // 11.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.2,
    arc: 1.4,
    knockback: 0.5,
    role: 'sustain',
    finaleMult: 2,
    follow: { after: 'wall', windowTicks: 80, damageMult: 1.25 },
    aftermath: { fieldTicks: 60, everyTicks: 20, damage: 2, radius: 1.4, self: { armor: 6, durationTicks: 22 } },
  },

  // PAYOFF at 82: the standard planted on held ground burns wider, and
  // where it stands the day holds: a burning field that armors whoever
  // keeps it.
  {
    id: 'standing_sun',
    name: 'The Standing Sun',
    desc: 'Plant the light like a standard. Planted on a wall you set or a line you hold it burns wider, and where it stands the day holds: the ground burns them and armors you.',
    color: '#e8cc84',
    code: 'Su',
    cooldownTicks: 260, // 13 s
    castTicks: 26,
    shape: 'ground_aoe',
    damage: 12,
    range: 5,
    radius: 2.4,
    fuseTicks: 10,
    knockback: 1.2,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'payoff',
    follow: { after: 'wall', windowTicks: 80, damageMult: 1.5, radiusMult: 1.2 },
    aftermath: { fieldTicks: 80, everyTicks: 20, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 }, self: { armor: 6, durationTicks: 22 } },
  },

  // SUSTAIN at 86: the cold keep. A channel that freezes the court
  // outward, pays a last hard freeze, and leaves a frost court you
  // hold from inside, armored and turning blows.
  {
    id: 'winterhold',
    name: 'Winterhold',
    desc: 'The cold keep, held from behind the boss. Every breath chills the court, the last breath freezes it hard, and the frost that stays is your keep: armor and turned blows while you stand in it.',
    color: '#a0c8dc',
    code: 'Wt',
    cooldownTicks: 270, // 13.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.3,
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'sustain',
    finaleMult: 2,
    aftermath: { fieldTicks: 80, everyTicks: 20, damage: 2, status: { status: 'chill', power: 1, durationTicks: 40 }, self: { armor: 6, reflectFrac: 0.2, durationTicks: 22 } },
  },

  // ----------------------------- THE SHIELD SKILL — the wall's ladder
  // The school of the tank: control, protection, retribution. Damage
  // arts run leaner than melee's — the wall's worth is what it stops.

  // PAYOFF at 5: the first press that reads a word. Alone it is a
  // bash; on a body still ringing from Iron Toll it lands near twice
  // as hard and cracks the armor, and a kill gives the seat back.
  {
    id: 'shield_bash',
    name: 'Shield Bash',
    desc: 'Swing the wall itself. On a body still staggered from the toll it lands near twice as hard and cracks the armor, and a kill gives the bash back sooner.',
    color: '#8ea4b8',
    code: 'Ba',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 8,
    range: 1.9,
    arc: 1.0,
    knockback: 1.4,
    role: 'payoff',
    follow: { after: 'stagger', windowTicks: 60, damageMult: 1.75, status: { status: 'sunder', power: 15, durationTicks: 60 } },
    onKill: { refundTicks: 60 },
  },

  // ANSWER at 15: the stance, and the school's third word. Set the
  // wall and Grindstone, The Patient Wall and The Standing Sun read it.
  {
    id: 'set_the_wall',
    name: 'Set the Wall',
    desc: 'Plant your feet and become the thing they break against. The wall is a word: grind, advance or plant the sun from it and they land harder.',
    color: '#7d8a9a',
    code: 'Se',
    cooldownTicks: 240, // 12 s
    shape: 'self_buff',
    damage: 0,
    self: { armor: 8, durationTicks: 160 },
    role: 'answer',
    tag: 'wall',
  },

  // ANSWER at 25: the road. A charge that meets the bodies that
  // answered Draw Iron square, and opens again when it kills.
  {
    id: 'shield_rush',
    name: 'Shield Rush',
    desc: 'Boss first and drive, and the road opens where they stood. Bodies that turned to your shout meet the rush square and take half again.',
    color: '#9aa8b8',
    code: 'Sr',
    cooldownTicks: 180, // 9 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 7.2,
    travel: 'charge',
    knockback: 2.2,
    role: 'answer',
    follow: { after: 'taunt', windowTicks: 60, damageMult: 1.5 },
    onKill: { refundTicks: 60 },
  },

  // OPENER at 35: the taunt, drawn as a shout with a breath before it.
  // The word is `taunt`: Doorfall, Sunbrass, Shield Rush and Millwall
  // read the bodies that turned to you.
  {
    id: 'draw_iron',
    name: 'Draw Iron',
    desc: 'Draw a breath and shout with iron in it. Every blade in the yard turns to you, and the door, the sun, the rush and the mill all land harder on what turned.',
    color: '#c9a45e',
    code: 'Di',
    cooldownTicks: 300, // 15 s
    castTicks: 12,
    shape: 'nova',
    damage: 2, // the shout barely bruises — the TURNING is the payload
    radius: 3.2,
    tauntRadius: 3.2,
    role: 'opener',
    tag: 'taunt',
  },

  // ANSWER at 45: the roof. Shelter that slows you, and at rank IV the
  // rain runs off it back onto whoever sent it.
  {
    id: 'shield_roof',
    name: 'Shield Roof',
    desc: "Pull the sky down to arm's reach and wait out the rain of blows. Slower under it, but the roof soaks what falls.",
    color: '#8a7a5e',
    code: 'Ro',
    cooldownTicks: 340, // 17 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 16, speedMult: 0.85, durationTicks: 160 },
    role: 'answer',
  },

  // ANSWER at 54: the counter's first half. Angle the wall so blows go
  // home, and the angled wall is a `wall` word: Rampart Break follows
  // it as the counter.
  {
    id: 'turned_blow',
    name: 'Turned Blow',
    desc: 'Angle the wall so the blow goes home to whoever sent it. The angled wall is a set wall: break the rampart after it and the break lands double.',
    color: '#b87a5e',
    code: 'Tb',
    cooldownTicks: 300, // 15 s
    shape: 'self_buff',
    damage: 0,
    self: { reflectFrac: 0.3, durationTicks: 120 },
    role: 'answer',
    tag: 'wall',
  },

  // PAYOFF at 62: the signature's third press. Fused, quick, and on a
  // staggered ring or after the turned wall it lands double and cracks
  // the armor; a kill gives the seat back.
  {
    id: 'rampart_break',
    name: 'Rampart Break',
    desc: 'Drive the rim into the earth until the ground picks a side. After the toll, the anchor or the turned wall it lands double and cracks their armor, and a kill gives it back sooner.',
    color: '#7a8494',
    code: 'Rb',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'ground_aoe',
    damage: 10,
    range: 4,
    radius: 2.2,
    fuseTicks: 8,
    knockback: 1.5,
    role: 'payoff',
    follow: { after: ['stagger', 'wall'], windowTicks: 60, damageMult: 2, status: { status: 'sunder', power: 15, durationTicks: 60 } },
    onKill: { refundTicks: 60 },
  },

  // PAYOFF at 70: the thrown wall reads the crack the stone left.
  // Grindstone, Shield Bash and Rampart Break leave sunder; the wheel
  // spends it, out and back, and a kill returns it sooner.
  {
    id: 'wheel_of_iron',
    name: 'Wheel of Iron',
    desc: 'Loose the wall spinning; it remembers your arm and comes back. On cracked armor it breaks the crack wide and spends it, out and home again.',
    color: '#aab6c4',
    code: 'Wi',
    cooldownTicks: 210, // 10.5 s
    shape: 'projectile_fan',
    damage: 8,
    range: 9,
    projectiles: 1,
    projectileSpeed: 13,
    pierce: true,
    returns: true,
    knockback: 1.4,
    role: 'payoff',
    vs: { status: 'sunder', mult: 1.5, consume: true },
    onKill: { refundTicks: 60 },
  },

  // OPENER at 78: the signature's first press. Plant the ground you
  // keep (a breath to mark it); inside it you wear armor and turn
  // blows, and the word is `wall` for the sun and the break to read.
  {
    id: 'hold_the_line',
    name: 'Hold the Line',
    desc: 'Mark the ground you keep. Stand in it and you wear armor and turn blows; whoever crosses it slows and learns why it holds. Ring the toll and break the rampart from inside it.',
    color: '#8a94a4',
    code: 'Hl',
    cooldownTicks: 260, // 13 s
    castTicks: 16,
    shape: 'ground_field',
    damage: 4,
    range: 2,
    radius: 2.4,
    fieldTicks: 140,
    pulseEveryTicks: 20,
    status: { status: 'chill', power: 1, durationTicks: 30 },
    self: { armor: 8, reflectFrac: 0.25, durationTicks: 22 },
    role: 'opener',
    tag: 'wall',
  },

  // CROWN at 90: three acts in one press. The great ring staggers the
  // yard, dares the rest onto you, and the ground it breaks is your
  // stand: held, armored, shielded, turning every blow, until it ends.
  {
    id: 'unbroken',
    name: 'Unbroken',
    desc: 'The great stand. Ring the yard staggered, dare the rest onto you, and the ground you break is yours: stand in it armored, shielded and turning every blow, and no step backward.',
    color: '#e8d5a0',
    code: 'Un',
    cooldownTicks: 340, // 17 s
    castTicks: 24,
    shape: 'nova',
    damage: 12,
    radius: 2.6,
    knockback: 1.2,
    tauntRadius: 4.0,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'crown',
    tag: 'stagger',
    aftermath: { fieldTicks: 160, everyTicks: 20, damage: 3, status: { status: 'chill', power: 1, durationTicks: 30 }, self: { armor: 12, shieldHp: 16, reflectFrac: 0.35, durationTicks: 22 } },
  },

  // THE UNWRITTEN PAGE: the champion's ring, drawn with a breath, dares
  // the yard three times over. It leaves the `taunt` word for the door,
  // the sun, the rush and the mill.
  {
    id: 'champions_wall',
    name: "Champion's Wall",
    desc: 'The wall a champion could not carry past you. Draw a breath, and it rings three times and dares the whole yard onto you; the door and the sun land harder on what came.',
    color: '#d8b76a',
    code: 'Cw',
    cooldownTicks: 260, // 13 s
    castTicks: 16,
    shape: 'pulse_nova',
    damage: 6,
    radius: 2.3,
    pulses: 3,
    pulseEveryTicks: 10,
    knockback: 1.2,
    tauntRadius: 4.0,
    role: 'opener',
    tag: 'taunt',
  },
];

export const SHIELD_LADDER: TechniqueDef[] = [
  // --------------------------- THE SHIELD SKILL — the wall's rungs
  {
    ability: 'shield_bash',
    style: 'shield',
    unlockLevel: 5,
    ranks: [
      { note: 'The face lands heavier.', damage: 10 },
      { note: 'A kill gives more of the bash back.', onKill: { refundTicks: 80 } },
      { note: 'The Ringing Face: on a staggered body it lands double and the crack goes deeper.', damage: 11, knockback: 2.4, follow: { after: 'stagger', windowTicks: 60, damageMult: 2, status: { status: 'sunder', power: 20, durationTicks: 60 } } },
    ],
  },
  {
    ability: 'iron_toll',
    style: 'shield',
    unlockLevel: 10,
    ranks: [
      { note: 'The bell rings harder.', damage: 9 },
      { note: 'The toll carries further, and throws.', radius: 2.6, knockback: 1.2 },
      { note: 'The Second Peal: a bell rung over the dead rings again sooner.', damage: 11, castTicks: 18, cooldownTicks: 140, onKill: { refundTicks: 60 } },
    ],
  },
  {
    ability: 'set_the_wall',
    style: 'shield',
    unlockLevel: 15,
    ranks: [
      { note: 'The stance sets deeper.', self: { armor: 11, durationTicks: 160 } },
      { note: 'A skin of iron over the iron.', self: { armor: 11, shieldHp: 6, durationTicks: 160 } },
      { note: 'The Standing Word: while the wall stands, so do you, and it stands longer.', self: { armor: 14, shieldHp: 8, durationTicks: 200 } },
    ],
  },
  {
    ability: 'grindstone',
    style: 'shield',
    unlockLevel: 20,
    ranks: [
      { note: 'The rim grinds harder.', damage: 5 },
      { note: 'The stone turns a fourth time.', channelTicks: 64 },
      { note: 'The Last Turn: the final pass takes the plate clean off.', finaleMult: 2.5, status: { status: 'sunder', power: 15, durationTicks: 60 } },
    ],
  },
  {
    ability: 'shield_rush',
    style: 'shield',
    unlockLevel: 25,
    ranks: [
      { note: 'The drive hits harder.', damage: 10 },
      { note: 'A longer road, sooner open.', dashTiles: 8.8, cooldownTicks: 170 },
      { note: 'The Open Road: meet what turned to you and the road opens again at once.', knockback: 3.4, follow: { after: 'taunt', windowTicks: 60, damageMult: 1.5, refundTicks: 40 } },
    ],
  },
  {
    ability: 'doorfall',
    style: 'shield',
    unlockLevel: 30,
    ranks: [
      { note: 'The door lands heavier.', damage: 14 },
      { note: 'The frame is wider than they thought.', radius: 2.3, knockback: 1.8 },
      { note: 'Stand on the Door: where it fell it lies, and you wear it as armor while you stand on it.', damage: 15, cooldownTicks: 200, aftermath: { fieldTicks: 60, everyTicks: 20, damage: 0, self: { armor: 8, durationTicks: 22 } } },
    ],
  },
  {
    ability: 'draw_iron',
    style: 'shield',
    unlockLevel: 35,
    ranks: [
      { note: 'The shout carries farther.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 280 },
      { note: 'Iron answers those who answer.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 280, self: { armor: 6, durationTicks: 80 } },
      { note: 'The Whole Yard: every corner hears its name, and the iron on you is thicker for it.', radius: 5.0, tauntRadius: 5.0, cooldownTicks: 280, self: { armor: 8, durationTicks: 100 } },
    ],
  },
  {
    ability: 'held_gate',
    style: 'shield',
    unlockLevel: 40,
    ranks: [
      { note: 'The gate bites colder.', damage: 5 },
      { note: 'The cold holds them longer and the line runs wider.', width: 0.9, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The Gate Slams: a fourth breath, and the last one shuts the lane hard.', channelTicks: 64, finaleMult: 2, cooldownTicks: 190 },
    ],
  },
  {
    ability: 'shield_roof',
    style: 'shield',
    unlockLevel: 45,
    ranks: [
      { note: 'The roof bears more weather.', self: { shieldHp: 22, speedMult: 0.85, durationTicks: 160 } },
      { note: 'The weight learns your shoulders.', self: { shieldHp: 22, speedMult: 0.95, durationTicks: 160 } },
      { note: 'Let it Rain: the roof holds more, and the rain runs off it back onto whoever sent it.', self: { shieldHp: 30, speedMult: 0.95, reflectFrac: 0.2, durationTicks: 180 } },
    ],
  },
  {
    ability: 'sunbrass',
    style: 'shield',
    unlockLevel: 50,
    ranks: [
      { note: 'The brass burns brighter.', damage: 10 },
      { note: 'Noon reaches the whole yard.', radius: 2.9, status: { status: 'burn', power: 1, durationTicks: 60 } },
      { note: 'Noon Remembered: the ground burns longer where the sun fell.', damage: 11, cooldownTicks: 220, aftermath: { fieldTicks: 80, everyTicks: 20, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } } },
    ],
  },
  {
    ability: 'turned_blow',
    style: 'shield',
    unlockLevel: 54,
    ranks: [
      { note: 'More of the blow goes home.', self: { reflectFrac: 0.45, durationTicks: 120 } },
      { note: 'The angle hardens the arm that holds it.', self: { reflectFrac: 0.45, armor: 4, durationTicks: 120 } },
      { note: 'Nothing Kept: the wall keeps nothing that was sent to it, and holds the angle longer.', self: { reflectFrac: 0.6, armor: 4, durationTicks: 140 } },
    ],
  },
  {
    ability: 'millwall',
    style: 'shield',
    unlockLevel: 58,
    ranks: [
      { note: 'The wheel strikes harder.', damage: 5 },
      { note: 'The wall turns wider.', radius: 2.4 },
      { note: 'The Last Turn Throws: the final turn lands hardest and throws the water well back.', knockback: 1.2, finaleMult: 2.5, cooldownTicks: 250 },
    ],
  },
  {
    ability: 'rampart_break',
    style: 'shield',
    unlockLevel: 62,
    ranks: [
      { note: 'The rim bites deeper ground.', damage: 11 },
      { note: 'The break spreads wider.', radius: 2.6 },
      { note: 'The Yard Breaks With Them: on a ringing body the crack goes deeper and wider.', damage: 12, knockback: 2.4, follow: { after: ['stagger', 'wall'], windowTicks: 60, damageMult: 2, status: { status: 'sunder', power: 20, durationTicks: 80 } } },
    ],
  },
  {
    ability: 'anchorfall',
    style: 'shield',
    unlockLevel: 66,
    ranks: [
      { note: 'The anchor lands heavier.', damage: 12 },
      { note: 'The parted sea reaches further, and the anchor is raised sooner.', radius: 2.6, cooldownTicks: 220 },
      { note: 'The Parted Sea: where the anchor lands the water stays parted, a frost sheet.', damage: 14, cooldownTicks: 210, aftermath: { fieldTicks: 60, everyTicks: 20, damage: 2, status: { status: 'chill', power: 1, durationTicks: 30 } } },
    ],
  },
  {
    ability: 'wheel_of_iron',
    style: 'shield',
    unlockLevel: 70,
    ranks: [
      { note: 'The wheel spins heavier.', damage: 10 },
      { note: 'A longer arc out, a shorter wait after.', range: 11, cooldownTicks: 190 },
      { note: 'The Ringing Rim: it rings them senseless out and back, and a kill returns it sooner.', damage: 11, knockback: 2.2, status: { status: 'shock', power: 1, durationTicks: 30 }, onKill: { refundTicks: 80 } },
    ],
  },
  {
    ability: 'patient_wall',
    style: 'shield',
    unlockLevel: 74,
    ranks: [
      { note: 'The advance lands heavier.', damage: 5 },
      { note: 'The wall reaches wider.', arc: 1.7 },
      { note: 'Ground Taken: the last strike lands double, and the ground it took is held longer.', finaleMult: 2.5, knockback: 0.9, aftermath: { fieldTicks: 80, everyTicks: 20, damage: 2, radius: 1.4, self: { armor: 8, durationTicks: 22 } } },
    ],
  },
  {
    ability: 'hold_the_line',
    style: 'shield',
    unlockLevel: 78,
    ranks: [
      { note: 'The line argues harder.', damage: 6 },
      { note: 'The ground holds it longer.', fieldTicks: 180 },
      { note: 'This Far: the ground itself agrees, and inside it more of every blow goes home.', damage: 7, radius: 2.8, cooldownTicks: 250, self: { armor: 10, reflectFrac: 0.35, durationTicks: 22 }, status: { status: 'chill', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'standing_sun',
    style: 'shield',
    unlockLevel: 82,
    ranks: [
      { note: 'The standard burns brighter.', damage: 13 },
      { note: 'The day holds a wider ground.', radius: 2.8 },
      { note: 'The Long Day: the light is planted quicker and the day holds longer where it stands.', damage: 14, castTicks: 24, aftermath: { fieldTicks: 100, everyTicks: 20, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 }, self: { armor: 8, durationTicks: 22 } } },
    ],
  },
  {
    ability: 'winterhold',
    style: 'shield',
    unlockLevel: 86,
    ranks: [
      { note: 'The keep bites colder.', damage: 5 },
      { note: 'The court freezes wider.', radius: 2.7 },
      { note: 'The Deep Freeze: the last breath freezes hardest, and the keep stands longer around you.', finaleMult: 2.5, cooldownTicks: 270, aftermath: { fieldTicks: 100, everyTicks: 20, damage: 2, status: { status: 'chill', power: 1, durationTicks: 40 }, self: { armor: 8, reflectFrac: 0.25, durationTicks: 22 } } },
    ],
  },
  {
    ability: 'unbroken',
    style: 'shield',
    unlockLevel: 90,
    ranks: [
      { note: 'The stand holds more.', damage: 14, aftermath: { fieldTicks: 160, everyTicks: 20, damage: 3, status: { status: 'chill', power: 1, durationTicks: 30 }, self: { armor: 14, shieldHp: 22, reflectFrac: 0.4, durationTicks: 22 } } },
      { note: 'The stand turns more of what comes to it.', damage: 14, aftermath: { fieldTicks: 160, everyTicks: 20, damage: 4, status: { status: 'chill', power: 1, durationTicks: 30 }, self: { armor: 14, shieldHp: 22, reflectFrac: 0.45, durationTicks: 22 } } },
      { note: 'Unbroken Keeps Its Word: the stand holds longer, harder, and no step backward.', damage: 16, aftermath: { fieldTicks: 200, everyTicks: 20, damage: 4, status: { status: 'chill', power: 1, durationTicks: 30 }, self: { armor: 16, shieldHp: 28, reflectFrac: 0.5, durationTicks: 22 } } },
    ],
  },
  {
    ability: 'champions_wall',
    style: 'shield',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The wall rings louder.', damage: 7 },
      { note: 'A fourth ring answers the third.', pulses: 4 },
      { note: 'The Dare: it carries to the back of the yard and throws what answers.', tauntRadius: 5.0, knockback: 2.0 },
    ],
  },
];
