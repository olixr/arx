/**
 * THE TWOHAND SCHOOL — its twenty rung arts (and its unwritten page) with
 * their honing ladders, one file per school (THE MASTERED HAND,
 * techniques v3, Phase 2).
 *
 * THE FALLING WEIGHT. Momentum and the earth. The school's three words:
 * `stagger` (the casted giant blow that takes their feet), `sunder`
 * (the crack every maul leaves in the iron) and `quake` (the ground
 * itself, broken and still moving). Openers are slow, casted,
 * enormous, and leave one of those words; payoffs read the word
 * (Skysunder spends sunder, the Executioner reads it, Avalanche rides
 * the quake, Wide Swath and Forgefall follow the stagger); sustains
 * are held notes with a finale that lands like the last blow of a
 * felling; the rifts stay open after the blow; answers are the shove,
 * the charge and the stone skin. Signature: Fell Timber (cast, stagger)
 * → Gravedigger (pull + sunder) → Skysunder (consume sunder ×2.2).
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
 * Every hold here is a CASTED or FUSED art by law: Fell Timber and
 * Sunhammer stagger only at the end of a full wind-up, Fault Line
 * roots only after its fuse, Titan's Verdict staggers after its cast.
 * Colossus Stance lays stonehide on the caster alone.
 */
export const TWOHAND_LICENSES: Record<string, string[]> = {
  fell_timber: ['stagger'],
  fault_line: ['root'],
  colossus_stance: ['stonehide'],
  sunhammer: ['stagger'],
  titans_verdict: ['stagger'],
};

export const TWOHAND_ARTS: AbilityDef[] = [
  // ------------------- THE SECOND BREATH — the twohand breath arts
  // Rung 10, OPENER, the signature's first press: the one casted blow a
  // level-ten player owns, and it takes their feet. Wide Swath (5) and
  // Haft Check (15) both read the stagger it leaves.
  {
    id: 'fell_timber',
    name: 'Fell Timber',
    desc: 'Wind up and bring the tree down. Whoever it lands on loses their feet for a breath. Follow with Wide Swath while they reel.',
    color: '#8a7a4e',
    code: 'Fe',
    cooldownTicks: 150, // 7.5 s
    castTicks: 20,
    shape: 'melee_arc',
    damage: 11,
    range: 2.7,
    arc: 1.3,
    knockback: 1.0,
    role: 'opener',
    tag: 'stagger',
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    onKill: { refundTicks: 60 },
  },

  // Rung 20, SUSTAIN: the first held note. Every beat deepens the crack
  // and the held last beat splits the stone. Leaves sunder for
  // Skysunder, the Executioner and Forgefall.
  {
    id: 'quarry_work',
    name: 'Quarry Work',
    desc: 'Plant your feet and swing into the same seam, beat after beat. Every swing cracks them wider. Hold to the last swing and the stone comes apart.',
    color: '#9a8a78',
    code: 'Qy',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 5,
    range: 2.5,
    arc: 1.7,
    role: 'sustain',
    tag: 'sunder',
    status: { status: 'sunder', power: 10, durationTicks: 60 },
    finaleMult: 2,
  },

  // Rung 30, PAYOFF: the hammer that lands on a body already reeling
  // or cracked (follows stagger or sunder) and leaves the forge floor
  // burning where it landed.
  {
    id: 'forgefall',
    name: 'Forgefall',
    desc: 'Leap and bring the hammer down still glowing. On a reeling or cracked foe it lands half again as hard, and the ground where it fell keeps burning.',
    color: '#d97a3d',
    code: 'Fo',
    cooldownTicks: 250, // 12.5 s
    castTicks: 22,
    shape: 'leap_slam',
    damage: 12,
    dashTiles: 9.0,
    radius: 2.2,
    knockback: 1.2,
    role: 'payoff',
    follow: { after: ['stagger', 'sunder'], windowTicks: 60, damageMult: 1.5 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'burn', power: 1, durationTicks: 40 } },
  },

  // Rung 40, SUSTAIN: the ram down the lane. A reeling foe cannot step
  // out of it (follows stagger), and the last beat is the wheel breaking.
  {
    id: 'wheelbreaker',
    name: 'The Wheelbreaker',
    desc: 'Drive the haft down the lane like a ram, shoving everything in it back. A reeling foe takes it harder. Hold to the last beat and the wheel breaks.',
    color: '#b09a6a',
    code: 'Wk',
    cooldownTicks: 230, // 11.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 5,
    range: 7,
    width: 0.8,
    knockback: 0.6,
    role: 'sustain',
    follow: { after: 'stagger', windowTicks: 60, damageMult: 1.3 },
    finaleMult: 2,
  },

  // Rung 50, OPENER, the signature's middle press: the grave pulls the
  // yard into one heap and cracks every body in it. Skysunder lands next.
  {
    id: 'gravedigger',
    name: 'Gravedigger',
    desc: 'Open the ground and it wants filling. Everything nearby is dragged into the pit and cracked open. Skysunder onto the heap.',
    color: '#6a5e6e',
    code: 'Gv',
    cooldownTicks: 220, // 11 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 13,
    range: 4.5,
    radius: 2.1,
    fuseTicks: 10,
    knockback: -1.2, // the grave PULLS
    role: 'opener',
    tag: 'sunder',
    status: { status: 'sunder', power: 15, durationTicks: 60 },
  },

  // Rung 58, SUSTAIN: the ringing note. Every ring cracks the seam a
  // little; the last ring, held, is the one that splits it.
  {
    id: 'ore_song',
    name: 'Ore Song',
    desc: 'Plant the maul and ring the ground around you, beat after beat. Every ring cracks whoever stands in it. Hold to the last ring and it lands twice over.',
    color: '#b8a488',
    code: 'Oe',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.4,
    knockback: 0.5,
    role: 'sustain',
    tag: 'sunder',
    status: { status: 'sunder', power: 8, durationTicks: 40 },
    finaleMult: 2,
  },

  // Rung 66, OPENER: the sky comes down twice and the ground remembers
  // it. Leaves the quake for Avalanche and the crack for the payoffs.
  {
    id: 'skyweight',
    name: 'Skyweight',
    desc: 'Lift the whole sky as high as it goes, then let it fall twice. The ground quakes under everyone near you and cracks them. Avalanche rides the quake.',
    color: '#c9a24a',
    code: 'Sw',
    cooldownTicks: 250, // 12.5 s
    castTicks: 24,
    shape: 'pulse_nova',
    damage: 8,
    radius: 2.4,
    pulses: 2,
    pulseEveryTicks: 11,
    knockback: 1.4,
    role: 'opener',
    tag: 'quake',
    status: { status: 'sunder', power: 12, durationTicks: 60 },
  },

  // Rung 74, SUSTAIN: the long lane. Given a place to stand (quaking
  // ground from Fault Line or Skyweight) the lever moves everything in
  // reach; the held last heave is the world moving.
  {
    id: 'long_lever',
    name: 'The Long Lever',
    desc: 'Set the haft into the lane and bear down, beat after beat, as far as the reach runs. On quaking ground the lever bites harder. Hold to the last heave and the world moves.',
    color: '#a08a68',
    code: 'Lv',
    cooldownTicks: 240, // 12 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 8,
    width: 0.7,
    knockback: 0.4,
    role: 'sustain',
    follow: { after: 'quake', windowTicks: 60, damageMult: 1.3 },
    finaleMult: 2,
  },

  // Rung 82, OPENER: the second great casted blow. It cracks the iron
  // and takes their feet, and the noon stays burning on the ground.
  {
    id: 'sunhammer',
    name: 'Sunhammer',
    desc: 'Wind up and swing the noon itself. Everyone it touches is cracked open and loses their feet, and the ground it crossed keeps burning.',
    color: '#e0a04c',
    code: 'Sm',
    cooldownTicks: 240, // 12 s
    castTicks: 26,
    shape: 'melee_arc',
    damage: 12,
    range: 2.8,
    arc: 1.6,
    knockback: 1.3,
    role: 'opener',
    tag: 'stagger',
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 3, status: { status: 'burn', power: 1, durationTicks: 40 } },
  },

  // Rung 86, SUSTAIN: the slow grind that ends with the rim falling.
  // Chill keeps them in the field for the finale.
  {
    id: 'worlds_rim',
    name: "World's Rim",
    desc: 'Grind the far edge of the world against a chosen patch of ground. It turns slowly and the cold keeps them in it. Hold to the end and the rim falls.',
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
    role: 'sustain',
    status: { status: 'chill', power: 1, durationTicks: 50 },
    finaleMult: 2,
  },

  // --------------------------- THE GREAT SCHOOL — the colossus's arts
  // Rung 5, PAYOFF: the level stroke that takes the front rank apart
  // when it is already reeling. A level-ten player owns the combo:
  // Fell Timber, then this.
  {
    id: 'wide_swath',
    name: 'Wide Swath',
    desc: 'One level stroke at hip height across the whole front rank. Swing it while they reel from Fell Timber and it lands half again as hard.',
    color: '#c47a3d',
    code: 'Ws',
    cooldownTicks: 174, // 8.7 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.8,
    arc: 2.4,
    knockback: 1.2,
    role: 'payoff',
    follow: { after: 'stagger', windowTicks: 50, damageMult: 1.4 },
  },

  // Rung 15, ANSWER: the room-maker. A rude shove that buys the next
  // swing its space; shoving a reeling foe costs the check nothing.
  {
    id: 'haft_check',
    name: 'Haft Check',
    desc: 'The butt end, driven short and rude. It shoves them well back and buys your next swing its room. Check a reeling foe and the haft is ready again at once.',
    color: '#8a7a68',
    code: 'Hc',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 2, // the shove barely bruises — the ROOM is the payload
    range: 1.7,
    arc: 1.1,
    knockback: 2.4,
    role: 'answer',
    follow: { after: 'stagger', windowTicks: 50, refundTicks: 60 },
  },

  // Rung 25, OPENER: two full swings that each crack the iron. The cheap
  // sunder for a mid-level Executioner or Skysunder.
  {
    id: 'iron_pendulum',
    name: 'Iron Pendulum',
    desc: 'Two full swings, no apology between them. Both crack whatever they hit, so the next blow lands on broken iron.',
    color: '#9a8a78',
    code: 'Ip',
    cooldownTicks: 190, // 9.5 s
    shape: 'flurry',
    damage: 7,
    range: 2.5,
    arc: 1.6,
    hits: 2,
    pulseEveryTicks: 8,
    knockback: 1.1,
    role: 'opener',
    tag: 'sunder',
    status: { status: 'sunder', power: 12, durationTicks: 60 },
    onKill: { refundTicks: 60 },
  },

  // Rung 35, OPENER: the fused crack. The ground takes a side, catches
  // their feet, and the rift stays open and cold for Avalanche.
  {
    id: 'fault_line',
    name: 'Fault Line',
    desc: 'Bring the edge down until the ground takes a side. Whoever stands on the crack is caught by the feet, and the rift stays open and cold after. Avalanche onto it.',
    color: '#a06a48',
    code: 'Fl',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'ground_aoe',
    damage: 10,
    range: 4,
    radius: 2.0,
    fuseTicks: 10,
    knockback: 1.0,
    role: 'opener',
    tag: 'quake',
    status: { status: 'root', power: 1, durationTicks: 20 },
    aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, status: { status: 'chill', power: 1, durationTicks: 40 } },
  },

  // Rung 45, ANSWER: the stone skin. Every plain swing while it stands
  // cracks the iron, so the stance itself feeds the payoffs.
  {
    id: 'colossus_stance',
    name: 'Colossus Stance',
    desc: 'Set your skin to stone and walk like something too big to argue with. While it holds, every plain swing cracks what it hits.',
    color: '#b85e3a',
    code: 'Cs',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    role: 'answer',
    self: {
      speedMult: 1.06,
      selfStatus: { status: 'stonehide', power: 1, durationTicks: 300 },
      onHitStatus: { status: 'sunder', power: 8, durationTicks: 40 },
      durationTicks: 160,
    },
  },

  // Rung 54, PAYOFF, the signature's last press: leave the ground and
  // come down on the cracked heap. Spends the sunder for the verdict.
  {
    id: 'skysunder',
    name: 'Skysunder',
    desc: 'Leave the ground and come back down with a verdict. A cracked foe takes half again as much and the crack is spent. Onto a fresh crack the crater spreads wider.',
    color: '#c9924a',
    code: 'Sk',
    cooldownTicks: 250, // 12.5 s
    castFreezeTicks: 4,
    shape: 'leap_slam',
    damage: 14,
    dashTiles: 10.0,
    radius: 2.2,
    knockback: 1.8,
    role: 'payoff',
    vs: { status: 'sunder', mult: 1.6, consume: true },
    follow: { after: 'sunder', windowTicks: 60, radiusMult: 1.3 },
  },

  // Rung 62, PAYOFF: the stroke for the nearly done. It reads the crack
  // without spending it, and a kill gives the seat its time back.
  {
    id: 'executioners_arc',
    name: "Executioner's Arc",
    desc: 'The stroke kept for the nearly done. It lands harder on a cracked foe and far harder on one close to death. A kill hands the stroke back to you.',
    color: '#8a5a4a',
    code: 'Ea',
    cooldownTicks: 230, // 11.5 s
    shape: 'melee_arc',
    damage: 12,
    range: 2.6,
    arc: 1.5,
    role: 'payoff',
    executeBelow: { frac: 0.35, mult: 2.0 },
    vs: { status: 'sunder', mult: 1.5 },
    onKill: { refundTicks: 100 },
  },

  // Rung 70, PAYOFF: three blows downhill onto ground still moving
  // (follows the quake from Fault Line, Skyweight or the Verdict).
  {
    id: 'avalanche',
    name: 'Avalanche',
    desc: 'Three blows downhill, one after another. Swing them while the ground still quakes from Fault Line or Skyweight and every blow lands far harder.',
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
    role: 'payoff',
    follow: { after: 'quake', windowTicks: 60, damageMult: 1.6 },
  },

  // Rung 78, ANSWER: the charge. Through the first body to the next,
  // and a kill on the way hands the road back.
  {
    id: 'breaker_charge',
    name: 'Breaker Charge',
    desc: 'Shoulder the steel and go through, not around. Whatever you hit is thrown clear. Kill it on the way and the charge is ready again sooner.',
    color: '#c47a3d',
    code: 'Bc',
    cooldownTicks: 230, // 11.5 s
    shape: 'dash_strike',
    damage: 10,
    dashTiles: 8.4,
    travel: 'charge',
    knockback: 2.4,
    role: 'answer',
  },

  // Rung 90, CROWN: three acts in one press. The wind-up, the toll that
  // takes every foot in the ring, then the earth keeps ringing under
  // them while you stand in the crater as stone.
  {
    id: 'titans_verdict',
    name: "Titan's Verdict",
    desc: 'Wind up and toll the earth once. Everyone in the ring loses their feet, then the ground keeps ringing under them. Stand in the crater and you are armored like stone.',
    color: '#e0a04c',
    code: 'Tv',
    cooldownTicks: 320, // 16 s
    castTicks: 20,
    shape: 'nova',
    damage: 14,
    radius: 2.6,
    knockback: 1.6,
    role: 'crown',
    tag: 'quake',
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    aftermath: { fieldTicks: 80, everyTicks: 16, damage: 3, self: { armor: 6, durationTicks: 18 } },
  },

  // ------------------------- THE UNWRITTEN PAGE — deed-earned arts
  // These never sit on a rung: an `art:<id>` flag opens each, set by
  // a deed (never drop-luck). Invisible everywhere until earned.
  // The page's SUSTAIN: the wheel that never stops, and its last turn
  // is the one that takes the yard.
  {
    id: 'whirling_ruin',
    name: 'Whirling Ruin',
    desc: 'Plant your feet, set the great steel turning, and be the calm at the middle of it. Hold to the last turn and it lands like a felling.',
    color: '#c8b494',
    code: 'Wu',
    cooldownTicks: 260, // 13 s
    channelTicks: 60,
    pulseEveryTicks: 10,
    shape: 'melee_arc',
    damage: 3, // six quick cuts, each light — the payoff bracket holds at every level
    range: 2.2,
    arc: 3.15, // the full turn: everything around the hub is in the cone
    knockback: 0.5,
    role: 'sustain',
    finaleMult: 2,
  },

  // The page's PAYOFF: one mark, the whole weight, on a foe already
  // reeling or cracked. A kill hands the memory back.
  {
    id: 'giantsfall',
    name: 'Giantsfall',
    desc: 'The stroke that felled the biggest thing you ever swung at. Swung at a reeling or cracked foe it comes back to the hand four seconds sooner, and a kill hands it back whole.',
    color: '#d88a4a',
    code: 'Gf',
    cooldownTicks: 240, // 12 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 15,
    range: 2.8,
    arc: 0.7, // one mark, the whole weight
    knockback: 2.0,
    role: 'payoff',
    follow: { after: ['stagger', 'sunder'], windowTicks: 60, refundTicks: 80 },
    onKill: { refundTicks: 80 },
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
      { note: 'A wider horizon, and the reeling rank waits a breath longer.', arc: 2.8, follow: { after: 'stagger', windowTicks: 60, damageMult: 1.5 } },
      { note: 'The Reaping Line: the front rank leaves the field.', damage: 13, knockback: 1.3 },
    ],
  },
  {
    ability: 'fell_timber',
    style: 'twohand',
    unlockLevel: 10,
    ranks: [
      { note: 'The timber lands heavier.', damage: 12 },
      { note: 'The axe is loose again sooner, and a felling hands more time back.', cooldownTicks: 145, onKill: { refundTicks: 80 } },
      { note: 'Timber!: the wind-up shortens, the throw lengthens, the tree falls hardest.', damage: 13, castTicks: 18, cooldownTicks: 140, knockback: 1.4 },
    ],
  },
  {
    ability: 'haft_check',
    style: 'twohand',
    unlockLevel: 15,
    ranks: [
      { note: 'The shove learns its manners last.', knockback: 3.0 },
      { note: 'A reeling foe checked gives the whole haft back.', follow: { after: 'stagger', windowTicks: 60, refundTicks: 100 } },
      { note: 'The Rude End: room enough for the whole next swing, and sooner.', knockback: 3.4, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'quarry_work',
    style: 'twohand',
    unlockLevel: 20,
    ranks: [
      { note: 'The seam splits deeper.', damage: 6 },
      { note: 'Every swing cracks the stone wider.', status: { status: 'sunder', power: 14, durationTicks: 60 } },
      { note: 'The Split: the held last swing brings the whole face down.', finaleMult: 2.5 },
    ],
  },
  {
    ability: 'iron_pendulum',
    style: 'twohand',
    unlockLevel: 25,
    ranks: [
      { note: 'The pendulum swings heavier.', damage: 8 },
      { note: 'The second swing comes sooner, and the crack runs deeper.', pulseEveryTicks: 6, status: { status: 'sunder', power: 15, durationTicks: 60 } },
      { note: 'Back and Forth: the yard is quiet sooner, and a felling hands the swing back.', damage: 9, cooldownTicks: 185, onKill: { refundTicks: 80 } },
    ],
  },
  {
    ability: 'forgefall',
    style: 'twohand',
    unlockLevel: 30,
    ranks: [
      { note: 'The hammer lands heavier.', damage: 13 },
      { note: 'The forge floor burns wider, and longer.', radius: 2.5, aftermath: { fieldTicks: 80, everyTicks: 16, damage: 1, status: { status: 'burn', power: 1, durationTicks: 40 } } },
      { note: 'The Verdict Glows: the hammer lands heavier and throws the reeling further.', damage: 14, knockback: 1.5 },
    ],
  },
  {
    ability: 'fault_line',
    style: 'twohand',
    unlockLevel: 35,
    ranks: [
      { note: 'The ground breaks deeper.', damage: 12 },
      { note: 'The crack runs wider, and the rift stays open longer.', radius: 2.3, aftermath: { fieldTicks: 96, everyTicks: 16, damage: 2, status: { status: 'chill', power: 1, durationTicks: 40 } } },
      { note: 'The Open Rift: the ground breaks deepest, and the fault is ready sooner.', damage: 13, cooldownTicks: 215 },
    ],
  },
  {
    ability: 'wheelbreaker',
    style: 'twohand',
    unlockLevel: 40,
    ranks: [
      { note: 'The ram drives harder.', damage: 6 },
      { note: 'The lane runs longer and the wheels break the further way back.', range: 8, knockback: 0.9 },
      { note: 'The Broken Wheel: the last beat of the ram lands twice over and further.', finaleMult: 2.5, knockback: 1.0 },
    ],
  },
  {
    ability: 'colossus_stance',
    style: 'twohand',
    unlockLevel: 45,
    ranks: [
      { note: 'The cracks you leave run deeper.', self: { speedMult: 1.06, selfStatus: { status: 'stonehide', power: 1, durationTicks: 300 }, onHitStatus: { status: 'sunder', power: 12, durationTicks: 40 }, durationTicks: 160 } },
      { note: 'The stride lengthens with the temper.', self: { speedMult: 1.12, selfStatus: { status: 'stonehide', power: 1, durationTicks: 300 }, onHitStatus: { status: 'sunder', power: 12, durationTicks: 40 }, durationTicks: 160 } },
      { note: 'The Standing Stone: the stone skin holds as long as the stance does.', self: { speedMult: 1.12, selfStatus: { status: 'stonehide', power: 1, durationTicks: 360 }, onHitStatus: { status: 'sunder', power: 12, durationTicks: 60 }, durationTicks: 200 } },
    ],
  },
  {
    ability: 'gravedigger',
    style: 'twohand',
    unlockLevel: 50,
    ranks: [
      { note: 'The grave takes more.', damage: 15 },
      { note: 'The pull deepens and the pit widens.', radius: 2.4, knockback: -1.5 },
      { note: 'THE OPEN GRAVE: the digging is quicker; the crack it leaves is the widest a maul makes.', damage: 16, cooldownTicks: 205, status: { status: 'sunder', power: 20, durationTicks: 60 } },
    ],
  },
  {
    ability: 'skysunder',
    style: 'twohand',
    unlockLevel: 54,
    ranks: [
      { note: 'The verdict lands heavier.', damage: 16 },
      { note: 'A longer leap, a shorter wait.', dashTiles: 12.0, cooldownTicks: 245 },
      { note: 'The Crater: the landing empties its own pit, twice as wide on a fresh crack.', damage: 18, radius: 2.4, knockback: 2.2, follow: { after: 'sunder', windowTicks: 60, radiusMult: 1.5 } },
    ],
  },
  {
    ability: 'ore_song',
    style: 'twohand',
    unlockLevel: 58,
    ranks: [
      { note: 'The ring carries wider.', radius: 2.6 },
      { note: 'Every ring cracks the seam deeper, and the maul shoves.', status: { status: 'sunder', power: 10, durationTicks: 40 }, knockback: 0.8 },
      { note: 'The Last Ring: hold the whole song and the last ring lands twice over.', finaleMult: 2.5 },
    ],
  },
  {
    ability: 'executioners_arc',
    style: 'twohand',
    unlockLevel: 62,
    ranks: [
      { note: 'The stroke bites deeper.', damage: 14 },
      { note: 'It reads the sentence earlier.', executeBelow: { frac: 0.4, mult: 2.0 } },
      { note: 'The Last Word: sentences end mid-word, and a kill hands the whole stroke back.', damage: 15, executeBelow: { frac: 0.4, mult: 2.4 }, onKill: { refundTicks: 120 } },
    ],
  },
  {
    ability: 'skyweight',
    style: 'twohand',
    unlockLevel: 66,
    ranks: [
      { note: 'The sky lands heavier.', damage: 9 },
      { note: 'The weight falls a third time.', pulses: 3 },
      { note: 'The Whole Horizon: the third fall reaches wider.', radius: 2.6 },
    ],
  },
  {
    ability: 'avalanche',
    style: 'twohand',
    unlockLevel: 70,
    ranks: [
      { note: 'Every blow falls heavier.', damage: 8 },
      { note: 'The slide starts sooner.', pulseEveryTicks: 7 },
      { note: 'The Mountain Finishes: every blow lands heavier and nothing shovels itself out.', damage: 9, knockback: 1.6 },
    ],
  },
  {
    ability: 'long_lever',
    style: 'twohand',
    unlockLevel: 74,
    ranks: [
      { note: 'The lever bears harder.', damage: 5 },
      { note: 'The reach runs longer and wider.', range: 10, width: 0.9 },
      { note: 'The World Moves: the lever bears down further and the last heave lands twice over.', knockback: 0.6, finaleMult: 2.5 },
    ],
  },
  {
    ability: 'breaker_charge',
    style: 'twohand',
    unlockLevel: 78,
    ranks: [
      { note: 'The shoulder hits harder, and a felling on the road hands time back.', damage: 12, onKill: { refundTicks: 60 } },
      { note: 'A longer road, sooner open.', dashTiles: 10.0, cooldownTicks: 210 },
      { note: 'Through: the only direction left, and a felling on the road hands it all back.', damage: 14, knockback: 3.0, cooldownTicks: 200, onKill: { refundTicks: 100 } },
    ],
  },
  {
    ability: 'sunhammer',
    style: 'twohand',
    unlockLevel: 82,
    ranks: [
      { note: 'The noon swings heavier.', damage: 14 },
      { note: 'The arc takes the whole sky.', arc: 2, knockback: 1.5 },
      { note: 'High Noon: the heat stays on the ground longer, and the iron is loose sooner.', damage: 15, cooldownTicks: 220, aftermath: { fieldTicks: 80, everyTicks: 16, damage: 3, status: { status: 'burn', power: 1, durationTicks: 40 } } },
    ],
  },
  {
    ability: 'worlds_rim',
    style: 'twohand',
    unlockLevel: 86,
    ranks: [
      { note: 'The far edge reaches wider.', radius: 2.7 },
      { note: 'The cold of the rim settles in.', status: { status: 'chill', power: 1, durationTicks: 70 } },
      { note: 'The Rim Falls: hold the whole turn and the last grind lands twice over.', finaleMult: 2.5 },
    ],
  },
  {
    ability: 'titans_verdict',
    style: 'twohand',
    unlockLevel: 90,
    ranks: [
      { note: 'The toll strikes heavier.', damage: 16 },
      { note: 'The ring reaches wider, and the earth rings longer under them.', radius: 3.0, aftermath: { fieldTicks: 96, everyTicks: 16, damage: 3, self: { armor: 6, durationTicks: 18 } } },
      { note: 'The Verdict Stands: the earth signs it, and the crater is a fortress to stand in.', cooldownTicks: 280, aftermath: { fieldTicks: 96, everyTicks: 16, damage: 4, self: { armor: 10, durationTicks: 18 } } },
    ],
  },
  {
    ability: 'giantsfall',
    style: 'twohand',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The memory swings heavier.', damage: 17 },
      { note: 'It reaches the tall ones.', range: 3.1 },
      { note: 'Everything Falls: the same height in the end.', damage: 19, knockback: 2.6 },
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
      { note: 'The wheel throws what it catches.', knockback: 0.8 },
      { note: 'The Felling Turn: the storm refuses to sit down.', channelTicks: 70 },
    ],
  },
];
