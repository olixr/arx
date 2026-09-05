/**
 * THE TWOHAND SCHOOL — its twenty rung arts (and its unwritten page) with
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
export const TWOHAND_LICENSES: Record<string, string[]> = {};

export const TWOHAND_ARTS: AbilityDef[] = [
  // ------------------- THE SECOND BREATH — the twohand breath arts
  {
    id: 'fell_timber',
    name: 'Fell Timber',
    desc: 'The tree comes down where you say it does. Stand clear or be counted.',
    color: '#8a7a4e',
    code: 'Fe',
    cooldownTicks: 190, // 9.5 s
    castTicks: 20,
    shape: 'melee_arc',
    damage: 12,
    range: 2.7,
    arc: 1.3,
    knockback: 1.5,
  },

  {
    id: 'quarry_work',
    name: 'Quarry Work',
    desc: 'Swing after swing into the same seam. Every stone splits eventually.',
    color: '#9a8a78',
    code: 'Qy',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 5,
    range: 2.5,
    arc: 1.7,
    status: { status: 'sunder', power: 10, durationTicks: 60 },
  },

  {
    id: 'forgefall',
    name: 'Forgefall',
    desc: 'The hammer leaves the forge still glowing. It lands like a verdict.',
    color: '#d97a3d',
    code: 'Fo',
    cooldownTicks: 250, // 12.5 s
    castTicks: 22,
    shape: 'leap_slam',
    damage: 13,
    dashTiles: 9.0,
    radius: 2.2,
    knockback: 1.5,
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },

  {
    id: 'wheelbreaker',
    name: 'The Wheelbreaker',
    desc: 'Drive the haft down the lane like a ram. Wheels were a mistake.',
    color: '#b09a6a',
    code: 'Wk',
    cooldownTicks: 200, // 10 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 5,
    range: 7,
    width: 0.8,
    knockback: 0.6,
    status: { status: 'shock', power: 1, durationTicks: 30 },
  },

  {
    id: 'gravedigger',
    name: 'Gravedigger',
    desc: 'Open the ground and it wants filling. Everything nearby obliges.',
    color: '#6a5e6e',
    code: 'Gv',
    cooldownTicks: 240, // 12 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 15,
    range: 4.5,
    radius: 2.1,
    fuseTicks: 10,
    knockback: -1.0, // the grave PULLS
  },

  {
    id: 'ore_song',
    name: 'Ore Song',
    desc: 'The maul sings against the seam and the seam sings back. Keep time.',
    color: '#b8a488',
    code: 'Oe',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 5,
    radius: 2.4,
    knockback: 0.7,
  },

  {
    id: 'skyweight',
    name: 'Skyweight',
    desc: 'Lift the whole sky as high as it goes. Then let it remember the ground.',
    color: '#c9a24a',
    code: 'Sw',
    cooldownTicks: 250, // 12.5 s
    castTicks: 24,
    shape: 'pulse_nova',
    damage: 9,
    radius: 2.4,
    pulses: 2,
    pulseEveryTicks: 11,
    knockback: 1.4,
  },

  {
    id: 'long_lever',
    name: 'The Long Lever',
    desc: 'Given a place to stand, you move them. The lever is the whole lane.',
    color: '#a08a68',
    code: 'Lv',
    cooldownTicks: 230, // 11.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 8,
    width: 0.7,
    knockback: 0.5,
  },

  {
    id: 'sunhammer',
    name: 'Sunhammer',
    desc: 'Swing the noon itself. Everything it touches keeps a little of the heat.',
    color: '#e0a04c',
    code: 'Sm',
    cooldownTicks: 240, // 12 s
    castTicks: 26,
    shape: 'melee_arc',
    damage: 15,
    range: 2.8,
    arc: 1.6,
    knockback: 1.3,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },

  {
    id: 'worlds_rim',
    name: "World's Rim",
    desc: 'Grind the far edge of the world against a chosen field. It turns slowly.',
    color: '#8a9aa8',
    code: 'Wm',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 5,
    radius: 2.3,
    fuseTicks: 8,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

  // --------------------------- THE GREAT SCHOOL — the colossus's arts
  // The school of weight: huge dies on slow beats, arcs that treat the
  // crowd as one target, and momentum spent like coin. Damage runs
  // hot and wide — a greatweapon's worth is what it ends.
  {
    id: 'wide_swath',
    name: 'Wide Swath',
    desc: 'One level stroke at hip height. The front rank stops being a rank.',
    color: '#c47a3d',
    code: 'Ws',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.8,
    arc: 2.4,
    knockback: 1.2,
  },

  {
    id: 'haft_check',
    name: 'Haft Check',
    desc: 'The butt end, driven short and rude. It buys the next swing its room.',
    color: '#8a7a68',
    code: 'Hc',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 2, // the shove barely bruises — the STAGGER is the payload
    range: 1.7,
    arc: 1.1,
    knockback: 2.4,
    status: { status: 'shock', power: 1, durationTicks: 35 },
  },

  {
    id: 'iron_pendulum',
    name: 'Iron Pendulum',
    desc: 'Two full swings, no apology between them.',
    color: '#9a8a78',
    code: 'Ip',
    cooldownTicks: 210, // 10.5 s
    shape: 'flurry',
    damage: 8,
    range: 2.5,
    arc: 1.6,
    hits: 2,
    pulseEveryTicks: 8,
    knockback: 1.1,
  },

  {
    id: 'fault_line',
    name: 'Fault Line',
    desc: 'Bring the edge down until the ground takes a side.',
    color: '#a06a48',
    code: 'Fl',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'ground_aoe',
    damage: 13,
    range: 4,
    radius: 2.0,
    fuseTicks: 8,
    knockback: 1.3,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

  {
    id: 'colossus_stance',
    name: 'Colossus Stance',
    desc: 'Walk like something too big to argue with. What you touch stays hurt.',
    color: '#b85e3a',
    code: 'Cs',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { speedMult: 1.1, onHitStatus: { status: 'bleed', power: 1, durationTicks: 60 }, durationTicks: 160 },
  },

  {
    id: 'skysunder',
    name: 'Skysunder',
    desc: 'Leave the ground. Come back down with a verdict.',
    color: '#c9924a',
    code: 'Sk',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 4,
    shape: 'leap_slam',
    damage: 14,
    dashTiles: 10.0,
    radius: 2.2,
    knockback: 1.8,
  },

  {
    id: 'executioners_arc',
    name: "Executioner's Arc",
    desc: 'The stroke kept for the nearly-done. It finishes sentences.',
    color: '#8a5a4a',
    code: 'Ea',
    cooldownTicks: 240, // 12 s
    shape: 'melee_arc',
    damage: 12,
    range: 2.6,
    arc: 1.5,
    executeBelow: { frac: 0.35, mult: 2.0 },
  },

  {
    id: 'avalanche',
    name: 'Avalanche',
    desc: 'Three blows downhill. Nothing shovels itself out.',
    color: '#b0a494',
    code: 'Av',
    cooldownTicks: 260, // 13 s
    shape: 'flurry',
    damage: 7,
    range: 2.5,
    arc: 1.4,
    hits: 3,
    pulseEveryTicks: 9,
    knockback: 1.2,
  },

  {
    id: 'breaker_charge',
    name: 'Breaker Charge',
    desc: 'Shoulder the steel and go through, not around.',
    color: '#c47a3d',
    code: 'Bc',
    cooldownTicks: 220, // 11 s
    shape: 'dash_strike',
    damage: 13,
    dashTiles: 8.4,
    travel: 'charge',
    knockback: 2.6,
  },

  {
    id: 'titans_verdict',
    name: "Titan's Verdict",
    desc: 'Ring the earth three times. Let the rings do the talking.',
    color: '#e0a04c',
    code: 'Tv',
    cooldownTicks: 340, // 17 s
    castFreezeTicks: 5,
    shape: 'pulse_nova',
    damage: 9,
    radius: 2.6,
    pulses: 3,
    pulseEveryTicks: 11,
    knockback: 1.6,
  },

  // ------------------------- THE UNWRITTEN PAGE — deed-earned arts
  // These never sit on a rung: an `art:<id>` flag opens each, set by
  // a deed (never drop-luck). Invisible everywhere until earned.
  {
    id: 'whirling_ruin',
    name: 'Whirling Ruin',
    desc: 'Plant your feet, set the great steel turning, and be the calm at the middle of it.',
    color: '#c8b494',
    code: 'Wu',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE: the whirlwind is HELD — six turns of the wheel,
    // the whole circle each beat, for as long as the feet stay planted.
    channelTicks: 60,
    pulseEveryTicks: 10,
    shape: 'melee_arc',
    damage: 3, // six quick cuts, each light — the payoff bracket holds at every level
    range: 2.2,
    arc: 3.15, // the full turn: everything around the hub is in the cone
    knockback: 0.5,
  },

  {
    id: 'giantsfall',
    name: 'Giantsfall',
    desc: 'The stroke that felled the biggest thing you ever swung at. It remembers how.',
    color: '#d88a4a',
    code: 'Gf',
    cooldownTicks: 240, // 12 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 15,
    range: 2.8,
    arc: 0.7, // one mark, the whole weight
    knockback: 2.0,
  },
];

export const TWOHAND_LADDER: TechniqueDef[] = [
  // -------------------------- THE GREAT SCHOOL — the colossus's rungs
  {
    ability: 'wide_swath',
    style: 'twohand',
    unlockLevel: 5,
    ranks: [
      { note: 'The stroke lands heavier.', damage: 12 },
      { note: 'A wider horizon, a shorter wait.', arc: 2.8, cooldownTicks: 160 },
      { note: 'The front rank leaves the field.', damage: 14, cooldownTicks: 155, knockback: 1.8 },
    ],
  },
  {
    ability: 'fell_timber',
    style: 'twohand',
    unlockLevel: 10,
    ranks: [
      { note: 'The timber lands heavier.', damage: 14 },
      { note: 'The splinters draw blood.', status: { status: 'bleed', power: 1, durationTicks: 60 } },
      { note: 'The axe is loose again sooner, and throws.', damage: 15, knockback: 1.8, cooldownTicks: 170, castTicks: 18 },
    ],
  },
  {
    ability: 'haft_check',
    style: 'twohand',
    unlockLevel: 15,
    ranks: [
      { note: 'The shove learns its manners last.', knockback: 3.0 },
      { note: 'The jolt holds them a beat longer.', status: { status: 'shock', power: 1, durationTicks: 50 } },
      { note: 'Room enough for the whole next swing.', knockback: 3.4, status: { status: 'shock', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'quarry_work',
    style: 'twohand',
    unlockLevel: 20,
    ranks: [
      { note: 'The seam splits deeper.', damage: 6 },
      { note: 'The quarry takes a fourth swing.', channelTicks: 64 },
      { note: 'The stone comes apart at the grain.', status: { status: 'sunder', power: 14, durationTicks: 60 } },
    ],
  },
  {
    ability: 'iron_pendulum',
    style: 'twohand',
    unlockLevel: 25,
    ranks: [
      { note: 'The pendulum swings heavier.', damage: 10 },
      { note: 'The second swing comes sooner.', pulseEveryTicks: 6, cooldownTicks: 190 },
      { note: 'Back and forth until the yard is quiet.', damage: 11, knockback: 1.4 },
    ],
  },
  {
    ability: 'forgefall',
    style: 'twohand',
    unlockLevel: 30,
    ranks: [
      { note: 'The hammer lands heavier.', damage: 14 },
      { note: 'The glow spreads further, and lingers.', radius: 2.6, status: { status: 'burn', power: 1, durationTicks: 60 } },
      { note: 'The forge fires again sooner.', damage: 15, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'fault_line',
    style: 'twohand',
    unlockLevel: 35,
    ranks: [
      { note: 'The ground breaks deeper.', damage: 15 },
      { note: 'The crack runs wider.', radius: 2.4, cooldownTicks: 200 },
      { note: 'Nobody keeps their feet on a fault.', damage: 16, knockback: 1.8 },
    ],
  },
  {
    ability: 'wheelbreaker',
    style: 'twohand',
    unlockLevel: 40,
    ranks: [
      { note: 'The ram drives harder.', damage: 6 },
      { note: 'The lane holds a fourth breath.', channelTicks: 64 },
      { note: 'The wheels break the further way back.', knockback: 0.9, status: { status: 'shock', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'colossus_stance',
    style: 'twohand',
    unlockLevel: 45,
    ranks: [
      { note: 'The wounds you leave open wider.', self: { speedMult: 1.1, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'The stride lengthens with the temper.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'Too big to argue with. Most stop trying.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 80 }, durationTicks: 200 } },
    ],
  },
  {
    ability: 'gravedigger',
    style: 'twohand',
    unlockLevel: 50,
    ranks: [
      { note: 'The grave takes more.', damage: 16 },
      { note: 'The pull deepens and the pit widens.', radius: 2.4, knockback: -1.4 },
      { note: 'The digging is quicker now.', damage: 18, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'skysunder',
    style: 'twohand',
    unlockLevel: 54,
    ranks: [
      { note: 'The verdict lands heavier.', damage: 17 },
      { note: 'A longer leap, a shorter wait.', dashTiles: 12.0, cooldownTicks: 240 },
      { note: 'The landing empties its own crater.', damage: 18, radius: 2.6, knockback: 2.2 },
    ],
  },
  {
    ability: 'ore_song',
    style: 'twohand',
    unlockLevel: 58,
    ranks: [
      { note: 'The song strikes harder.', damage: 6 },
      { note: 'The ring carries wider.', radius: 2.7 },
      { note: 'The seam sings back sooner.', cooldownTicks: 250 },
    ],
  },
  {
    ability: 'executioners_arc',
    style: 'twohand',
    unlockLevel: 62,
    ranks: [
      { note: 'The stroke bites deeper.', damage: 14 },
      { note: 'It reads the sentence earlier.', executeBelow: { frac: 0.4, mult: 2.0 } },
      { note: 'Sentences end mid-word.', damage: 15, executeBelow: { frac: 0.4, mult: 2.4 } },
    ],
  },
  {
    ability: 'skyweight',
    style: 'twohand',
    unlockLevel: 66,
    ranks: [
      { note: 'The sky lands heavier.', damage: 10 },
      { note: 'The weight falls a third time.', pulses: 3 },
      { note: 'The whole horizon comes down.', radius: 2.6, cooldownTicks: 245 },
    ],
  },
  {
    ability: 'avalanche',
    style: 'twohand',
    unlockLevel: 70,
    ranks: [
      { note: 'Every blow falls heavier.', damage: 9 },
      { note: 'The slide starts sooner, ends sooner.', pulseEveryTicks: 7, cooldownTicks: 240 },
      { note: 'The mountain finishes what it starts.', damage: 10, knockback: 1.6 },
    ],
  },
  {
    ability: 'long_lever',
    style: 'twohand',
    unlockLevel: 74,
    ranks: [
      { note: 'The lever bears harder.', damage: 5 },
      { note: 'The reach runs longer and wider.', range: 10, width: 0.9 },
      { note: 'The world moves after all.', knockback: 0.9, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'breaker_charge',
    style: 'twohand',
    unlockLevel: 78,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 15 },
      { note: 'A longer road, sooner open.', dashTiles: 10.0, cooldownTicks: 200 },
      { note: 'Through is the only direction left.', damage: 16, knockback: 3.2 },
    ],
  },
  {
    ability: 'sunhammer',
    style: 'twohand',
    unlockLevel: 82,
    ranks: [
      { note: 'The noon swings heavier.', damage: 16 },
      { note: 'The arc takes the whole sky.', arc: 2, knockback: 1.5 },
      { note: 'The heat stays in the iron.', damage: 17, cooldownTicks: 220, status: { status: 'burn', power: 2, durationTicks: 60 } },
    ],
  },
  {
    ability: 'worlds_rim',
    style: 'twohand',
    unlockLevel: 86,
    ranks: [
      { note: 'The rim grinds deeper.', damage: 5 },
      { note: 'The far edge reaches wider.', radius: 2.7 },
      { note: 'The cold of the rim settles in.', cooldownTicks: 240, status: { status: 'chill', power: 1, durationTicks: 70 } },
    ],
  },
  {
    ability: 'titans_verdict',
    style: 'twohand',
    unlockLevel: 90,
    ranks: [
      { note: 'The rings strike heavier.', damage: 11 },
      { note: 'The rings come quicker, and shove.', damage: 11, radius: 2.7, pulseEveryTicks: 9, knockback: 2.0 },
      { note: 'The verdict stands. The earth signs it.', damage: 12, radius: 3.0, pulseEveryTicks: 9, knockback: 2.4 },
    ],
  },
  {
    ability: 'giantsfall',
    style: 'twohand',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The memory swings heavier.', damage: 19 },
      { note: 'It reaches the tall ones sooner.', range: 3.1, cooldownTicks: 220 },
      { note: 'Everything falls the same height in the end.', damage: 21, knockback: 2.6 },
    ],
  },
  // THE NEW VOICES (THE DRAWN BREATH Phase 4): the first channeled
  // pages — deed-earned, like every page before them.
  {
    ability: 'whirling_ruin',
    style: 'twohand',
    unlockLevel: 0,
    hidden: { anchorLevel: 38 },
    ranks: [
      { note: 'Each turn of the steel asks for more.', damage: 4 },
      { note: 'The wheel spins up sooner between rests.', cooldownTicks: 240 },
      { note: 'The storm refuses to sit down.', channelTicks: 70 },
    ],
  },
];
