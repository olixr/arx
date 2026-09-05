/**
 * THE TWOHAND SECRET SHELF — the weapon-taught arts of this school and
 * their honed ranks, one file per school (THE MASTERED HAND,
 * techniques v3, Phase 3). Seats and anchors stay in secretArts.ts
 * (THE ANCHOR RULER is not this file's to move).
 *
 * THE FALLING WEIGHT, taught by the weapon to any hand. A secret is
 * THE CROSS-SCHOOL SPICE: it speaks the school's spine (momentum and
 * the earth — the giant blow, the crack, the quake, the rift that
 * stays) but its combo reaches across a school line. The shelf reads
 * the duelist's riposte, the archer's root, the weaver's rend, the
 * knight's taunt and hook, the scholar's burn / chill / hollow, the
 * veteran's weaken, the shield's wall and line — and leaves words of
 * its own for other hands: chill for the frost lance, burn for the
 * thermal shock, shock for the shatter, venom for the thousand cuts,
 * root for the headsman, wall for the rampart.
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/**
 * THE REGISTER, per shelf (see schools/onehand.ts): the wave-one pages
 * this shelf's arts lay. Pale Crescent roots only at the end of a full
 * wind-up (a hold is a casted art by law); The Crown's Word weakens —
 * no hold, so no telegraph owed, but a page all the same.
 */
export const TWOHAND_SECRET_LICENSES: Record<string, string[]> = {
  pale_crescent: ['root'],
  crowns_word: ['weaken'],
};

export const TWOHAND_SECRET_ARTS: AbilityDef[] = [
  // The founding pair's Weapon Arts (the Q axis — no rungs; ranks by anchor).
  // PAYOFF. The greatblade's full turn is the answer to any blow that
  // took their footing — the school's own stagger, or the duelist's
  // riposte — and it SHOVES a reeling body (follow.knockbackMult).
  {
    id: 'colossus_arc',
    name: 'Colossus Arc',
    desc: "The greatblade's own word: one full turn, and the whole yard hears it. Turn it on a foe still reeling from a stagger or a riposte and it lands harder and throws them further.",
    color: '#9aa2ac',
    code: 'Ca',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 11,
    range: 2.9,
    arc: 2.6,
    knockback: 1.5,
    role: 'payoff',
    follow: { after: ['stagger', 'riposte'], windowTicks: 60, damageMult: 1.3, knockbackMult: 1.5 },
  },

  // OPENER. The maul's fall leaves the ground quaking (the school word
  // Avalanche and the Long Lever read) and, dropped on a foe held by
  // the feet (Cold Iron, Hooking Reap), lands with nowhere to run.
  {
    id: 'quakefall',
    name: 'Quakefall',
    desc: 'The maul goes up. The county comes down, and the ground keeps shaking where it landed. Drop it on a rooted foe and it lands far heavier. Avalanche onto the quake.',
    color: '#7d7468',
    code: 'Qf',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 5,
    shape: 'ground_aoe',
    damage: 14,
    range: 3.5,
    radius: 2.3,
    fuseTicks: 10,
    knockback: 2.0,
    role: 'opener',
    tag: 'quake',
    follow: { after: 'root', windowTicks: 60, damageMult: 1.4 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2 },
  },

  // THE ARMORY's Weapon Arts — one per bespoke greatweapon, plus the
  // greataxe line's shared design art.
  // PAYOFF. The double head goes the whole way round; on a body already
  // opened (the weaver's rend, the school's crack) it takes lengths.
  {
    id: 'hewers_wheel',
    name: "Hewer's Wheel",
    desc: 'The axe goes around once and leaves everyone in the round bleeding. Turn it on a foe already rent or cracked and it bites deeper.',
    color: '#9a8a6a',
    code: 'Hw',
    cooldownTicks: 210, // 10.5 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.7,
    arc: 3.1,
    knockback: 1.2,
    role: 'payoff',
    status: { status: 'bleed', power: 1, durationTicks: 50 },
    follow: { after: ['rend', 'sunder'], windowTicks: 60, damageMult: 1.3 },
  },

  // ANSWER. The flat of the blade collects the road's price: a shove.
  // A foe the shield already shouted onto you, or the hook already
  // dragged close, is thrown further and the due is collected sooner.
  {
    id: 'reavers_due',
    name: "Reaver's Due",
    desc: 'The road has a price. The flat of this collects it and throws them off the road. Collect from a foe you taunted or hooked in and they fly further; the flat is ready again sooner.',
    color: '#6e7c92',
    code: 'Rd',
    cooldownTicks: 180, // 9 s
    shape: 'melee_arc',
    damage: 9,
    range: 2.8,
    arc: 2.2,
    knockback: 2.6,
    role: 'answer',
    follow: { after: ['taunt', 'hook'], windowTicks: 60, knockbackMult: 1.5, refundTicks: 40 },
  },

  // SUSTAIN. A plot of slow ground that leaves the arx word `chill`
  // for the frost lance and the shatter; the mourner standing in his
  // own plot is armored by the grief (held ground).
  {
    id: 'mournfield',
    name: 'Mournfield',
    desc: 'Mark out a plot. Everything in it slows to a walk behind the coffin, and the cold it leaves is the cold a frost lance or an arc bolt reads. Stand in the plot yourself and you are harder to hurt.',
    color: '#8a90a8',
    code: 'Mf',
    cooldownTicks: 190, // 9.5 s
    shape: 'ground_field',
    damage: 3,
    range: 3,
    radius: 2.3,
    fieldTicks: 120,
    pulseEveryTicks: 20,
    role: 'sustain',
    tag: 'chill',
    status: { status: 'chill', power: 1, durationTicks: 35 },
    self: { armor: 4, durationTicks: 22 },
  },

  // OPENER. The reap lights the row and leaves embers on the ground; the
  // burn it leaves is the arx word a frost lance turns into thermal shock.
  {
    id: 'ash_harvest',
    name: 'Ash Harvest',
    desc: 'Reap once and set the row alight. What the wave-edge misses, the embers on the ground finish. The burn it leaves is the burn a frost lance shocks.',
    color: '#c47444',
    code: 'Ah',
    cooldownTicks: 220, // 11 s
    shape: 'melee_arc',
    damage: 11,
    range: 2.8,
    arc: 2.4,
    knockback: 1.3,
    role: 'opener',
    tag: 'burn',
    status: { status: 'burn', power: 1, durationTicks: 70 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, status: { status: 'burn', power: 1, durationTicks: 30 } },
  },

  // PAYOFF. The cold from above lands hardest on a body already burning
  // (the scholar's wickfire — the shock of the two together) or already
  // cracked; it leaves the yard chilled for whoever reads that.
  {
    id: 'glacier_sunder',
    name: 'Glacier Sunder',
    desc: 'The cold arrives all at once, from above, and leaves them chilled. Drop it on a burning or cracked foe and the glacier lands far heavier.',
    color: '#9cc4e0',
    code: 'Gs',
    cooldownTicks: 240, // 12 s
    castFreezeTicks: 4,
    shape: 'ground_aoe',
    damage: 12,
    range: 3.2,
    radius: 2.2,
    fuseTicks: 8,
    knockback: 1.2,
    role: 'payoff',
    status: { status: 'chill', power: 1, durationTicks: 60 },
    follow: { after: ['burn', 'sunder'], windowTicks: 60, damageMult: 1.4 },
  },

  // OPENER. The crown speaks twice: the court's arms drop (weaken — the
  // veteran's word, The Opening reads it) and the floor shakes (quake).
  {
    id: 'crowns_word',
    name: "The Crown's Word",
    desc: 'Spoken twice — once for the court, once for whoever missed it. Everyone who hears it strikes weaker for a while, and the floor shakes under them. Avalanche onto the quake, or The Opening onto the weakened.',
    color: '#e0b054',
    code: 'Cw',
    cooldownTicks: 240, // 12 s
    shape: 'pulse_nova',
    damage: 8,
    radius: 2.4,
    pulses: 2,
    pulseEveryTicks: 10,
    knockback: 1.4,
    role: 'opener',
    tag: 'quake',
    status: { status: 'weaken', power: 15, durationTicks: 60 },
  },

  // PAYOFF. The closing line: it reads the nearly done, lands hardest on
  // a foe whose arms the veteran's shout already dulled (or who is
  // reeling), and a kill hands the argument back.
  {
    id: 'last_argument',
    name: 'Last Argument',
    desc: 'Both hands, one argument. This is the closing line: far harder on the nearly done, harder still on a weakened or reeling foe. A kill hands the argument back to you.',
    color: '#efe6cc',
    code: 'La',
    cooldownTicks: 260, // 13 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 15,
    range: 3.1,
    arc: 2.8,
    knockback: 2.2,
    role: 'payoff',
    executeBelow: { frac: 0.3, mult: 1.8 },
    follow: { after: ['weaken', 'stagger'], windowTicks: 60, damageMult: 1.4 },
    onKill: { refundTicks: 80 },
  },

  // PAYOFF. The jaws feed: they spend every bleed on the body (the
  // weaver's rend, the hunter's cuts, the wheel's own) for half again,
  // drink from the wound, and leave it bleeding fresh.
  {
    id: 'barrow_bite',
    name: 'Barrow Bite',
    desc: 'The jaws remember being hungry. Feed them: a bleeding foe takes half again and the bleeding is spent, some of it comes back to you, and the bite leaves a fresh wound.',
    color: '#a89a84',
    code: 'Bb',
    cooldownTicks: 200, // 10 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.5,
    arc: 2.0,
    knockback: 1.0,
    role: 'payoff',
    status: { status: 'bleed', power: 2, durationTicks: 60 },
    vs: { status: 'bleed', mult: 1.5, consume: true },
    drainFrac: 0.25,
  },

  // OPENER. The stroke and the storm land together: shock on the body
  // (the scholar's shatter reads it on a chilled foe), static on the
  // ground after. On a chilled body the storm finds its way in.
  {
    id: 'thunder_fell',
    name: 'Thunderfell',
    desc: 'The stroke and the storm land together, and the static stays on the ground after. On a chilled foe the storm lands harder — and the shock it leaves is what an arc bolt shatters.',
    color: '#8ca0d4',
    code: 'Tf',
    cooldownTicks: 230, // 11.5 s
    castFreezeTicks: 3,
    shape: 'ground_aoe',
    damage: 12,
    range: 3.4,
    radius: 2.1,
    fuseTicks: 8,
    knockback: 1.4,
    role: 'opener',
    tag: 'shock',
    status: { status: 'shock', power: 1, durationTicks: 50 },
    follow: { after: 'chill', windowTicks: 60, damageMult: 1.3 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2 },
  },

  // ANSWER. The forge stance; lit from a fire already burning (the
  // scholar's wickfire) the temper is ready again sooner.
  {
    id: 'white_heat',
    name: 'White Heat',
    desc: "Work while the metal's willing: every blow keeps the temper and sets them burning. Take the stance while something already burns and it is ready again far sooner.",
    color: '#f0a050',
    code: 'Wh',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    role: 'answer',
    self: { speedMult: 1.12, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 150 },
    follow: { after: 'burn', windowTicks: 60, refundTicks: 80 },
  },

  // OPENER. The quiet moon-wide arc is CASTED now, and where it passes
  // the yard goes still: a root (the headsman's and the lance's word)
  // with a pale frost left on the ground behind it.
  {
    id: 'pale_crescent',
    name: 'Pale Crescent',
    desc: 'Draw the blade back and swing a quiet arc, moon-wide. The yard goes still where it passes: everyone in it is held by the feet for a breath, and a pale frost lies on the ground after. The Headsman reads the root.',
    color: '#d8dce8',
    code: 'Pc',
    cooldownTicks: 220, // 11 s
    castTicks: 20, // a hold is a casted art by law: the moon rises before it falls
    shape: 'melee_arc',
    damage: 11,
    range: 2.9,
    arc: 2.5,
    knockback: 1.0,
    role: 'opener',
    tag: 'root',
    status: { status: 'root', power: 1, durationTicks: 20 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 40 } },
  },

  // PAYOFF. You bring the mountain; bring it down on a heap the hook
  // dragged together (or a cracked body) and it lands wider and heavier.
  {
    id: 'horizon_fall',
    name: 'Horizon Fall',
    desc: 'The mountain does not come to you. You bring it. Bring it down on a foe you hooked in or cracked open and the landing spreads wider and lands heavier.',
    color: '#6a5e7a',
    code: 'Hf',
    cooldownTicks: 320, // 16 s
    castFreezeTicks: 4,
    shape: 'leap_slam',
    damage: 14,
    dashTiles: 12.0,
    radius: 2.4,
    knockback: 2.4,
    role: 'payoff',
    follow: { after: ['hook', 'sunder'], windowTicks: 60, damageMult: 1.2, radiusMult: 1.3 },
  },

  // THE VAULT OF NAMES' Weapon Arts — one per chase find.
  // ANSWER. The bar comes down and clears the road; a crowd the shield
  // shouted in or the lance's line held is thrown furthest, and the bar
  // is ready again sooner.
  {
    id: 'road_opens',
    name: 'The Road Opens',
    desc: 'The bar came down once. Everything in front of the blade learns how that went and leaves the road. Clear a crowd you taunted or lined up and they fly further; the bar comes up again sooner.',
    color: '#d9a441',
    code: 'R2',
    cooldownTicks: 220, // 11 s
    shape: 'melee_arc',
    damage: 10,
    range: 2.8,
    arc: 2.3,
    knockback: 3.2,
    role: 'answer',
    follow: { after: ['taunt', 'line'], windowTicks: 60, knockbackMult: 1.4, refundTicks: 50 },
  },

  // SUSTAIN. The fen light feeds and leaves the hunter's word: venom,
  // for the thousand cuts and the keeper's reading.
  {
    id: 'marsh_light',
    name: 'Marsh Light',
    desc: 'Set the light down and let it feed. Everything in the glow is envenomed, and the fen always collects. Thousand Cuts reads the venom it leaves.',
    color: '#b8e068',
    code: 'M2',
    cooldownTicks: 280, // 14 s
    shape: 'ground_field',
    damage: 4,
    range: 3,
    radius: 2.2,
    fieldTicks: 110,
    pulseEveryTicks: 18,
    role: 'sustain',
    tag: 'venom',
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },

  // PAYOFF. The sky behind the sky comes through edge first and stays
  // open — a rift that keeps cutting. Through a hollow the scholar
  // already tore (or onto quaking ground) it opens wider and harder.
  {
    id: 'riftfall',
    name: 'Riftfall',
    desc: 'For one breath the sky behind the sky comes through, edge first, and the rift stays open and cutting where it landed. Drop it through a hollow or onto quaking ground and it opens wider and lands heavier.',
    color: '#cabdf2',
    code: 'R3',
    cooldownTicks: 300, // 15 s
    castFreezeTicks: 4,
    shape: 'ground_aoe',
    damage: 15,
    range: 3.4,
    radius: 2.3,
    fuseTicks: 9,
    knockback: 1.6,
    role: 'payoff',
    follow: { after: ['hollow', 'quake'], windowTicks: 60, damageMult: 1.3, radiusMult: 1.2 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 3 },
  },

  // ANSWER. The bear's hunger: faster, every blow bleeds, and the
  // blood comes back to you. Wake it while blood already runs (the
  // weaver's rend, the hunter's venom) and it is ready again sooner.
  {
    id: 'winters_hunger',
    name: "Winter's Hunger",
    desc: 'The bear walked all winter on empty. Now you do: faster, everything you touch bleeds, and the blood feeds you. Wake the hunger while they already bleed or sicken and it is ready again sooner.',
    color: '#a08a70',
    code: 'W2',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    role: 'answer',
    self: { speedMult: 1.1, meleeLifesteal: 0.12, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 150 },
    follow: { after: ['rend', 'venom'], windowTicks: 60, refundTicks: 80 },
  },

  // SUSTAIN. A seam in the floor that keeps giving: every pulse cracks
  // whoever stands in it (sunder — the school's word, and the duelist's)
  // and opened on quaking ground it bites deeper.
  {
    id: 'open_seam',
    name: 'Open Seam',
    desc: 'Crack the floor like a seam and let it keep giving. Everyone standing in it is cracked open for the payoffs. Open it on quaking ground and the seam cuts deeper.',
    color: '#e8c04c',
    code: 'O2',
    cooldownTicks: 265, // 13.25 s
    shape: 'ground_field',
    damage: 5,
    range: 3,
    radius: 2.1,
    fieldTicks: 100,
    pulseEveryTicks: 16,
    role: 'sustain',
    tag: 'sunder',
    status: { status: 'sunder', power: 8, durationTicks: 40 },
    follow: { after: 'quake', windowTicks: 60, damageMult: 1.3 },
  },

  // CROWN. Three acts in one press: the bell is raised (a wind-up), it
  // tolls three times and shocks the county, then the ground keeps
  // ringing after. The shock it leaves is the scholar's shatter on a
  // chilled body; a kill hands the bell back.
  {
    id: 'last_toll',
    name: 'Last Toll',
    desc: 'Raise the bell, then ring it three times. The county answers whether it wants to or not, the shock rings in their bones, and the ground keeps ringing under them after. A kill hands the bell back.',
    color: '#e2c384',
    code: 'L2',
    cooldownTicks: 335, // 16.75 s
    castTicks: 24, // THE SECOND CADENCE: the crown of the shelf is raised before it rings
    shape: 'pulse_nova',
    damage: 10,
    radius: 2.5,
    pulses: 3,
    pulseEveryTicks: 12,
    knockback: 1.5,
    role: 'crown',
    tag: 'quake',
    status: { status: 'shock', power: 1, durationTicks: 45 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'shock', power: 1, durationTicks: 30 } },
    onKill: { refundTicks: 80 },
  },

  // ANSWER. THE DRAWN BREATH's stone voice, taught by kerbstone: a
  // casted summon. The stone is a wall (the shield's word — the
  // rampart reads it), and raised on a crowd already shouted in it is
  // ready again sooner.
  {
    id: 'standing_stone',
    name: 'The Standing Stone',
    desc: 'Raise a kerb stone where you point. Everything angry argues with the stone first, and it stands as a wall for a shield-hand to read. Raise it on a crowd you taunted and the ground gives it back sooner.',
    color: '#8a8a7a',
    code: 'Ss',
    cooldownTicks: 380, // 19 s
    castTicks: 24, // 1.2 s raised, 0.96 s planted
    shape: 'summon',
    damage: 0,
    range: 4, // point-aimed: the stone stands where the ring promised
    role: 'answer',
    tag: 'wall',
    summon: { kind: 'decoy', durationTicks: 180, radius: 6, power: 0 },
    follow: { after: 'taunt', windowTicks: 60, refundTicks: 100 },
  },
];

export const TWOHAND_SECRET_RANKS: Record<string, Steps> = {
  // ------------------------------------------- twohand, the great steel
  colossus_arc: [
    { note: 'The arc falls heavier.', damage: 13 },
    { note: 'The swing owns a wider circle, and the reeling wait a breath longer.', arc: 2.9, follow: { after: ['stagger', 'riposte'], windowTicks: 70, damageMult: 1.3, knockbackMult: 1.5 } },
    { note: 'The Whole Yard: a reeling foe is thrown clean out of it, and the arm is ready again.', knockback: 2.2, cooldownTicks: 175, follow: { after: ['stagger', 'riposte'], windowTicks: 70, damageMult: 1.4, knockbackMult: 1.8 } },
  ],
  hewers_wheel: [
    { note: 'The wheel bites deeper.', damage: 11 },
    { note: 'The turn sweeps fully round.', arc: 3.4 },
    { note: 'In Lengths: the hewing leaves the timber weeping, and the rent take it worst.', status: { status: 'bleed', power: 2, durationTicks: 50 }, follow: { after: ['rend', 'sunder'], windowTicks: 60, damageMult: 1.4 } },
  ],
  reavers_due: [
    { note: 'The due is collected heavier.', damage: 11 },
    { note: 'The reach of the reaving grows.', range: 3.0 },
    { note: 'Paid in Full: what is owed is thrown from the hall, and collected again soon.', knockback: 3.2, cooldownTicks: 154, follow: { after: ['taunt', 'hook'], windowTicks: 60, knockbackMult: 1.5, refundTicks: 60 } },
  ],
  mournfield: [
    { note: 'The mourning bites deeper.', damage: 4 },
    { note: 'The field of grief spreads wider, and the mourner stands harder in it.', radius: 2.6, self: { armor: 6, durationTicks: 22 } },
    { note: 'The Long Wake: the grieving runs longer, and cuts deeper.', fieldTicks: 140, damage: 5 },
  ],
  ash_harvest: [
    { note: 'The harvest cuts deeper.', damage: 12 },
    { note: 'The burning row grows wider, and the embers glow longer on the ground.', arc: 2.7, aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'burn', power: 1, durationTicks: 30 } } },
    { note: 'The Ash Keeps Its Heat: the burn it leaves is twice as hot.', status: { status: 'burn', power: 2, durationTicks: 70 } },
  ],
  barrow_bite: [
    { note: 'The bite closes harder.', damage: 11 },
    { note: 'The maw opens wider, and drinks deeper.', arc: 2.3, drainFrac: 0.3 },
    { note: 'The Barrow Does Not Let Go: the wound runs longer, and the bleeding feed it more.', status: { status: 'bleed', power: 2, durationTicks: 80 }, vs: { status: 'bleed', mult: 1.6, consume: true } },
  ],
  quakefall: [
    { note: 'The fall lands heavier.', damage: 15 },
    { note: 'The fracture spreads wider, and the ground shakes longer after.', radius: 2.6, aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2 } },
    { note: 'No Notice: the earth gives none, and the rooted take it hardest.', fuseTicks: 6, follow: { after: 'root', windowTicks: 60, damageMult: 1.5 } },
  ],
  road_opens: [
    { note: 'The toll is taken heavier.', damage: 12 },
    { note: 'The road claims a wider verge.', arc: 2.6 },
    { note: 'Milestones: whatever stood in the way is one now, and the bar comes up sooner still.', knockback: 3.8, cooldownTicks: 168, follow: { after: ['taunt', 'line'], windowTicks: 60, knockbackMult: 1.4, refundTicks: 70 } },
  ],
  standing_stone: [
    { note: 'The stone stands longer.', summon: { kind: 'decoy', durationTicks: 220, radius: 6, power: 0 } },
    { note: 'The stone speaks over a wider field.', summon: { kind: 'decoy', durationTicks: 220, radius: 7, power: 0 } },
    { note: 'The Kerb Remembers: the ground knows the stone now, and raises it sooner.', cooldownTicks: 320 },
  ],
  crowns_word: [
    { note: 'Each word lands heavier.', damage: 9 },
    { note: 'The argument carries wider, and the court kneels longer.', radius: 2.7, status: { status: 'weaken', power: 15, durationTicks: 80 } },
    { note: 'Thrice Spoken: the crown speaks a third time.', pulses: 3 },
  ],
  glacier_sunder: [
    { note: 'The sunder drives deeper.', damage: 13 },
    { note: 'The crevasse opens wider.', radius: 2.5 },
    { note: 'The Calving: the glacier falls without warning, and hardest into fire or a crack.', fuseTicks: 5, follow: { after: ['burn', 'sunder'], windowTicks: 60, damageMult: 1.5 } },
  ],
  marsh_light: [
    { note: 'The light draws blood now.', damage: 5 },
    { note: 'The fen glow spreads wider.', radius: 2.5 },
    { note: 'The Fen Collects: the marsh keeps its guests longer, and the venom runs longer.', fieldTicks: 144, status: { status: 'venom', power: 1, durationTicks: 70 } },
  ],
  thunder_fell: [
    { note: 'The fell strikes heavier.', damage: 13 },
    { note: 'The thunderhead spreads wider, and the static lingers.', radius: 2.4, aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2 } },
    { note: 'Storm First: the bolt outruns its own warning, and finds the chilled hardest.', fuseTicks: 5, follow: { after: 'chill', windowTicks: 60, damageMult: 1.4 } },
  ],
  white_heat: [
    { note: 'The heat works faster through the arms.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 150 } },
    { note: 'The forge holds its temper longer.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 180 } },
    { note: 'Off the Anvil: every blow brands deeper, and a lit forge gives the whole stance back.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 2, durationTicks: 60 }, durationTicks: 180 }, follow: { after: 'burn', windowTicks: 60, refundTicks: 120 } },
  ],
  winters_hunger: [
    { note: 'The hunger drives the arms faster.', self: { speedMult: 1.14, meleeLifesteal: 0.12, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 150 } },
    { note: 'The appetite lasts longer, and feeds better.', self: { speedMult: 1.14, meleeLifesteal: 0.16, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 180 } },
    { note: 'The Lean Season Ends: every bite tears wider, and running blood wakes the whole hunger.', self: { speedMult: 1.14, meleeLifesteal: 0.16, onHitStatus: { status: 'bleed', power: 2, durationTicks: 70 }, durationTicks: 180 }, follow: { after: ['rend', 'venom'], windowTicks: 60, refundTicks: 120 } },
  ],
  open_seam: [
    { note: 'The seam splits deeper.', damage: 6 },
    { note: 'The tear runs wider, and the crack it leaves runs deeper.', radius: 2.4, status: { status: 'sunder', power: 12, durationTicks: 40 } },
    { note: 'The Seam Stays Open: it gives longer, and cuts to the quick.', fieldTicks: 112, damage: 7 },
  ],
  pale_crescent: [
    { note: 'The crescent falls heavier.', damage: 12 },
    { note: 'The moon path sweeps wider, and the frost lies longer on the ground.', arc: 2.8, aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 40 } } },
    { note: 'The Still Yard: they stand held a breath longer, and the moon rises sooner.', status: { status: 'root', power: 1, durationTicks: 24 }, cooldownTicks: 192 },
  ],
  last_argument: [
    { note: 'The argument lands heavier.', damage: 17 },
    { note: 'It admits no one outside its reach, and reads the end sooner.', range: 3.3, arc: 3.0, executeBelow: { frac: 0.35, mult: 2.0 } },
    { note: 'No Rebuttal: the room is cleared, the dulled take it hardest, a kill hands it back.', knockback: 3.0, cooldownTicks: 230, follow: { after: ['weaken', 'stagger'], windowTicks: 60, damageMult: 1.5 }, onKill: { refundTicks: 100 } },
  ],
  horizon_fall: [
    { note: 'The fall lands heavier.', damage: 15 },
    { note: 'The horizon breaks wider.', radius: 2.7 },
    { note: 'The Mountain Arrives: the world makes room, the heap takes it worst, and the sky reloads.', knockback: 3.2, cooldownTicks: 300, follow: { after: ['hook', 'sunder'], windowTicks: 60, damageMult: 1.3, radiusMult: 1.3 } },
  ],
  riftfall: [
    { note: 'The rift bites deeper.', damage: 16 },
    { note: 'The tear opens wider, and stays open longer.', radius: 2.6, aftermath: { fieldTicks: 80, everyTicks: 16, damage: 4 } },
    { note: 'The Far Side: it arrives early and often, and widest through a hollow.', fuseTicks: 5, cooldownTicks: 270, follow: { after: ['hollow', 'quake'], windowTicks: 60, damageMult: 1.4, radiusMult: 1.2 } },
  ],
  last_toll: [
    { note: 'Each toll rings heavier.', damage: 11 },
    { note: 'The bell is heard wider.', radius: 2.8 },
    { note: 'The Last Toll: the final ring throws the room, and rings in the bones.', knockback: 2.5, status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],
};
