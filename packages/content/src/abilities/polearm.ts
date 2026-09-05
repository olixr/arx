/**
 * THE REACHING SCHOOL — the polearm twenty and the armory’s weapon-taught secrets.
 * One shelf of the ability catalog (foundations F6.2). THE MASTERED HAND
 * (techniques v3, Phase 2) rebuilt the twenty on the school's own
 * grammar: ids untouched, mechanics reforged under them.
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/**
 * THE REGISTER, per school (see schools/onehand.ts): every polearm art
 * that lays a wave-one page, with the exact page list. The reach's
 * pages are the ROOT (the hook's hold and the sky's pin, both under
 * the HOLD BUDGET: 20-tick locks, fused or casted, a tenth of the
 * cycle at most) and the banner's QUICKEN on the caster's own hand.
 */
export const POLEARM_LICENSES: Record<string, string[]> = {
  hooking_reap: ['root'],
  stormpoint: ['root'],
  banner_advance: ['quicken'],
  // A READER, not an applier: Perfect Thrust never lays a root, it
  // reads one (`vs`) — the register's leak walk sees the page id and
  // the reading edge is registered here so the read is a conscious
  // ledger entry too.
};

export const POLEARM_DEFS: AbilityDef[] = [
  // ----------------- THE REACHING SCHOOL — the polearm arts (THE TWENTY)
  // THE REACH: distance control. The point ends arguments from outside
  // the answer, so the whole school is about putting bodies where the
  // point already is. Three words: ROOT (the hook behind the knee, the
  // sky's pin — a held body), HOOK (the row dragged onto one lane), LINE
  // (a corridor drawn or a formation planted). Openers hook and root;
  // payoffs skewer what is held or drive down what is drawn; sustains
  // are the station (the braced pike, the planted wall, the flickering
  // tongue); answers are the vault, the banner, the cleared yard. The
  // signature: Hooking Reap (fused, pull + root) → Perfect Thrust (the
  // rooted body takes it double) → The Sundering Lance (after root or
  // line, the whole road pierced and torn). Six casted, five channeled.
  {
    // Rung 5, PAYOFF: the school's first lesson is that the point comes
    // AFTER the hook. Follows root (Hooking Reap, Stormpoint) or hook
    // (Crescent Reap) at reach; a kill gives the seat back its breath.
    id: 'lunging_skewer',
    name: 'Lunging Skewer',
    desc: 'The point arrives from a county away. On a body held by the hook or the root it lands half again as hard, and a kill hands the lunge straight back.',
    color: '#c4d2e2',
    code: 'Ls',
    cooldownTicks: 130, // 6.5 s
    shape: 'melee_arc',
    damage: 9,
    range: 3.4,
    arc: 0.5,
    role: 'payoff',
    follow: { after: ['root', 'hook'], windowTicks: 50, damageMult: 1.5 },
    onKill: { refundTicks: 40 },
  },
  {
    // Rung 10, SUSTAIN: the close station. The butt end beats a rhythm at
    // the hip, each beat shoving and chilling, so nothing stands inside
    // the reach while the point waits. The hook's cousin, not its twin.
    id: 'haft_strike',
    name: 'Haft Strike',
    desc: 'Plant and beat the butt end of the haft at the hip, three rude beats. Every beat shoves them back off the point and leaves cold in their knees.',
    color: '#a08a68',
    code: 'Hs',
    cooldownTicks: 150, // 7.5 s
    channelTicks: 48, // 2.4 s of the rude rhythm, three beats
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 3,
    range: 1.7,
    arc: 1.2,
    knockback: 1.2,
    status: { status: 'chill', power: 1, durationTicks: 30 },
    role: 'sustain',
  },
  {
    // Rung 15, OPENER (the signature's first press): the hook behind the
    // knee, fused and honest, drags the ring onto the point and HOLDS it
    // for a second. Leaves the word ROOT for the skewer, the thrust, the
    // rain, the fall and the crown. Licensed root, under the budget.
    id: 'hooking_reap',
    name: 'Hooking Reap',
    desc: 'Mark the ground and the hook goes behind the knee. Everything there is dragged onto the point and held rooted for a breath. Come here.',
    color: '#7d8696',
    code: 'Hr',
    cooldownTicks: 130, // 6.5 s
    shape: 'ground_aoe',
    damage: 6,
    range: 3.4,
    radius: 1.1,
    fuseTicks: 10, // half a second of warning for a one second hold
    knockback: -2.5, // the hook PULLS
    status: { status: 'root', power: 1, durationTicks: 20 },
    role: 'opener',
    tag: 'root',
    onKill: { refundTicks: 60 },
  },
  {
    // Rung 20, ANSWER: the vault. Plant the haft, throw yourself, land
    // point first. The school's way in and its way out, and the reach's
    // one way to cross a room without losing the point.
    id: 'vaulting_step',
    name: 'Vaulting Step',
    desc: 'Plant the haft and let it throw you. Arrive point first, wherever you aimed the landing.',
    color: '#b09a6a',
    code: 'Vs',
    cooldownTicks: 120, // 6 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 8.0,
    role: 'answer',
  },
  {
    // Rung 25, PAYOFF (the signature's second press): one drawn breath,
    // one straight line. A ROOTED body takes it double, and a thrust that
    // follows the root hands the breath back. The cast is the skill: the
    // hook holds a second, the breath takes one.
    id: 'perfect_thrust',
    name: 'Perfect Thrust',
    desc: 'One drawn breath, one straight line. A rooted body takes it half again, and a thrust that follows the root gives back three seconds of its rest.',
    color: '#dce6f0',
    code: 'Pt',
    cooldownTicks: 200, // 10 s
    castTicks: 20, // 1 s drawn, 0.8 s planted
    shape: 'melee_arc',
    damage: 14,
    range: 3.6,
    arc: 0.35,
    role: 'payoff',
    vs: { status: 'root', mult: 1.5 },
    follow: { after: 'root', windowTicks: 60, refundTicks: 60 },
  },
  {
    // Rung 30, SUSTAIN: the rain down one lane, with a finale. Whatever
    // stands hooked or held eats the whole storm; the last point is the
    // one that matters.
    id: 'flurry_of_points',
    name: 'Flurry of Points',
    desc: 'Hold the lane and the point multiplies, three beats of rain and a last point that lands like a spear. A hooked or rooted body takes every drop harder.',
    color: '#c6d0dc',
    code: 'Fp',
    cooldownTicks: 190, // 9.5 s
    channelTicks: 48, // 2.4 s held, three beats of rain
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 3.4,
    arc: 0.35,
    role: 'sustain',
    finaleMult: 2,
    follow: { after: ['hook', 'root'], windowTicks: 60, damageMult: 1.3 },
  },
  {
    // Rung 35, OPENER: the hafted blade remembers it is a hook. One
    // moonwide stroke drags the whole row in onto one lane and chills it.
    // Leaves HOOK for the skewer, the rain, the drive and the fall.
    id: 'crescent_reap',
    name: 'Crescent Reap',
    desc: 'One moonwide stroke of the hafted blade, and the whole ring is dragged in cold onto one lane. The hook is the setup; the line is what follows it.',
    color: '#8a94a4',
    code: 'Cr',
    cooldownTicks: 150, // 7.5 s
    shape: 'nova',
    damage: 6,
    radius: 2.4,
    knockback: -1.6, // the crescent HOOKS the row in
    status: { status: 'chill', power: 1, durationTicks: 40 },
    role: 'opener',
    tag: 'hook',
    onKill: { refundTicks: 60 },
  },
  {
    // Rung 40, PAYOFF: the drawn corridor. After the hook has put the row
    // on one lane, drive the line through all of it. Leaves LINE for the
    // charge and the crown.
    id: 'impaling_drive',
    name: 'Impaling Drive',
    desc: 'Draw a breath and drive the line through the crowd. After the hook, when the row is on one lane, the drive lands half again as hard on every body along it.',
    color: '#b8c4d4',
    code: 'Id',
    cooldownTicks: 170, // 8.5 s
    castTicks: 22, // 1.1 s drawn, 0.88 s planted
    shape: 'beam',
    damage: 13,
    range: 5,
    width: 0.6,
    role: 'payoff',
    tag: 'line',
    follow: { after: 'hook', windowTicks: 60, damageMult: 1.5 },
  },
  {
    // Rung 45, SUSTAIN: the formation. A planted wall of points at the
    // feet, HELD GROUND: standing in it the caster wears armor, and every
    // foe inside is pricked and chilled. Leaves LINE.
    id: 'wall_of_points',
    name: 'Wall of Points',
    desc: 'Set the pikes and be a wall. The ground you plant them on pricks and chills whoever crosses it, and standing inside it you wear the formation as armor.',
    color: '#ccd6e2',
    code: 'Wp',
    cooldownTicks: 170, // 8.5 s
    shape: 'ground_field',
    damage: 5,
    range: 1.5,
    radius: 2.2,
    fieldTicks: 120,
    pulseEveryTicks: 20,
    status: { status: 'chill', power: 1, durationTicks: 30 },
    self: { armor: 6, durationTicks: 22 },
    role: 'sustain',
    tag: 'line',
  },
  {
    // Rung 50, PAYOFF: the road. Lower the point and spend it all at
    // once; down a drawn LINE (the drive, the wall, the stand) the charge
    // arrives with the whole road behind it.
    id: 'knights_charge',
    name: "Knight's Charge",
    desc: 'Lower the point and spend the whole road at once. Down a line you have already drawn, the arrival lands more than half again as hard. Knights are a weather.',
    color: '#e0b054',
    code: 'Kc',
    cooldownTicks: 180, // 9 s
    shape: 'dash_strike',
    damage: 12,
    dashTiles: 10.0,
    travel: 'charge',
    knockback: 2.4,
    role: 'payoff',
    follow: { after: 'line', windowTicks: 60, damageMult: 1.6 },
  },
  {
    // Rung 54, OPENER: the seam in the armor. A drawn breath that cracks
    // the wall open (sunder) for the executioner to read; a kill on the
    // breach gives the breath back.
    id: 'rampart_breaker',
    name: 'Rampart Breaker',
    desc: 'A drawn breath aimed at the seam in the armor. The crack stays open for four seconds and the Gatebreaker reads it. Walls open like doors.',
    color: '#a89a88',
    code: 'Rb',
    cooldownTicks: 170, // 8.5 s
    castTicks: 20, // 1 s drawn, 0.8 s planted
    shape: 'melee_arc',
    damage: 12,
    range: 3.2,
    arc: 0.6,
    status: { status: 'sunder', power: 12, durationTicks: 60 },
    role: 'opener',
    onKill: { refundTicks: 60 },
  },
  {
    // Rung 58, SUSTAIN: the tongue tastes twice and takes on the third.
    // A narrow held note at full reach whose finale is the whole point.
    id: 'serpents_tongue',
    name: "Serpent's Tongue",
    desc: 'The tongue flickers at full reach, two tastes and a bite. Hold the whole note and the last flicker lands at more than twice the weight.',
    color: '#d4e0ec',
    code: 'St',
    cooldownTicks: 200, // 10 s
    channelTicks: 48, // 2.4 s held, three flickers
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 5,
    range: 3.8,
    arc: 0.3,
    role: 'sustain',
    finaleMult: 2.5,
  },
  {
    // Rung 62, PAYOFF: the fall onto the pile. After the hook or the root
    // has gathered them, go up on the haft and come down point first on
    // the whole heap, wider and harder.
    id: 'skydriver_fall',
    name: 'Skydriver Fall',
    desc: 'Up on the haft, then down point first. On a ring you have hooked or rooted the crater spreads wider and lands half again as hard.',
    color: '#9a9484',
    code: 'Sf',
    cooldownTicks: 190, // 9.5 s
    shape: 'leap_slam',
    damage: 10,
    dashTiles: 8.0,
    radius: 1.6,
    role: 'payoff',
    follow: { after: ['root', 'hook'], windowTicks: 60, damageMult: 1.5, radiusMult: 1.3 },
  },
  {
    // Rung 66, ANSWER: the banner. Raise the point and the line moves
    // with you: speed, armor, and the hand quickens under it (the
    // school's licensed self page).
    id: 'banner_advance',
    name: 'Banner Advance',
    desc: 'Raise the point like a banner and the line moves forward with you: quicker feet, harder shoulders, and a quickened hand for as long as it flies.',
    color: '#e8c468',
    code: 'Ba',
    cooldownTicks: 320, // 16 s
    castTicks: 18, // 0.9 s raised, 0.72 s planted
    shape: 'self_buff',
    damage: 0,
    self: {
      speedMult: 1.15,
      armor: 4,
      durationTicks: 120,
      selfStatus: { status: 'quicken', power: 1, durationTicks: 120 },
    },
    role: 'answer',
  },
  {
    // Rung 70, SUSTAIN: the wheel. Three turns of the haft around you,
    // the last turn flinging, and a ring of splinters left on the ground
    // that chills whoever steps back in.
    id: 'moulinet_guard',
    name: 'Moulinet Guard',
    desc: 'Spin the haft in a wheel around you for three turns; the last turn flings. The wheel leaves a ring of splinters that cuts and chills whoever steps back into it.',
    color: '#b8a070',
    code: 'Mg',
    cooldownTicks: 200, // 10 s
    channelTicks: 48, // 2.4 s turned, three turns of the wheel
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 3,
    radius: 1.8,
    knockback: 0.6,
    role: 'sustain',
    finaleMult: 2,
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, radius: 1.8, status: { status: 'chill', power: 1, durationTicks: 30 } },
  },
  {
    // Rung 74, OPENER: the sky's pin. Hold the point up until the storm
    // takes an interest; the bolt nails them to the ground (root, casted
    // and licensed) and the charge stays in the ground a while. Leaves
    // ROOT for the thrust, the fall and the crown.
    id: 'stormpoint',
    name: 'Stormpoint',
    desc: 'Hold the point to the sky until the storm takes an interest, then point. The bolt nails them to the ground for a breath and leaves the charge crackling on it.',
    color: '#8cb4e8',
    code: 'Sp',
    cooldownTicks: 220, // 11 s
    castTicks: 24, // 1.2 s called, 0.96 s planted
    shape: 'melee_arc',
    damage: 15,
    range: 3.6,
    arc: 0.4,
    status: { status: 'root', power: 1, durationTicks: 20 },
    role: 'opener',
    tag: 'root',
    onKill: { refundTicks: 80 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'shock', power: 1, durationTicks: 20 } },
  },
  {
    // Rung 78, PAYOFF: the executioner. The heavy thrust kept for what is
    // already leaning: it reads the crack the Rampart Breaker left and
    // spends it, and a kill hands the seat back four seconds.
    id: 'gatebreaker',
    name: 'Gatebreaker',
    desc: 'The heavy thrust kept for whatever is already leaning. A body under a third takes it double, a cracked body pays half again and loses the crack, and a kill gives back four seconds.',
    color: '#6e7a8c',
    code: 'Gb',
    cooldownTicks: 180, // 9 s
    shape: 'melee_arc',
    damage: 12,
    range: 2.8,
    arc: 0.5,
    executeBelow: { frac: 0.3, mult: 2.0 },
    vs: { status: 'sunder', mult: 1.5, consume: true },
    role: 'payoff',
    onKill: { refundTicks: 80 },
  },
  {
    // Rung 82, ANSWER: the yard cleared. One full circle of the halberd
    // throws everything off the point; room is a weapon in this school.
    id: 'sweeping_gyre',
    name: 'Sweeping Gyre',
    desc: 'The halberd turns the full circle once and the yard is measured and cleared. Everything close is thrown off the point.',
    color: '#a89468',
    code: 'Sg',
    cooldownTicks: 144, // 7.2 s
    shape: 'nova',
    damage: 7,
    radius: 2.2,
    knockback: 1.6,
    role: 'answer',
  },
  {
    // Rung 86, SUSTAIN: the stand. Four braced beats that chill whatever
    // presses the line, a finale that breaks it, and the word LINE left
    // for the crown to run down.
    id: 'hold_the_line_polearm',
    name: 'Hold the Line',
    desc: 'Root, brace, and hold four beats. Whatever presses the line is pricked and slowed, the last beat breaks it, and the line stays drawn for the lance.',
    color: '#c2ccda',
    code: 'Ht',
    cooldownTicks: 200, // 10 s
    channelTicks: 64, // 3.2 s anchored, four beats of the stand
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 3.0,
    arc: 0.8,
    status: { status: 'chill', power: 1, durationTicks: 40 },
    role: 'sustain',
    tag: 'line',
    finaleMult: 2,
  },
  {
    // Rung 90, CROWN: three acts in one press. Couch the lance (cast),
    // run the whole road (a corridor that pierces every body on it and
    // cracks them), and leave the road torn (aftermath). After a root or
    // a drawn line it lands half again; a kill gives back four seconds.
    id: 'sundering_lance',
    name: 'The Sundering Lance',
    desc: 'Couch the lance and let the point run the whole road, every body on it pierced and cracked, the ground torn behind it. After a root or a drawn line it lands half again as hard.',
    color: '#e8b84c',
    code: 'Sl',
    cooldownTicks: 230, // 11.5 s
    castTicks: 24, // 1.2 s couched, 0.96 s planted
    shape: 'beam',
    damage: 15,
    range: 8,
    width: 0.7,
    status: { status: 'sunder', power: 12, durationTicks: 60 },
    role: 'crown',
    follow: { after: ['root', 'line'], windowTicks: 80, damageMult: 1.5 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'chill', power: 1, durationTicks: 40 } },
    onKill: { refundTicks: 80 },
  },

  // -------------- THE ARMORY: the polearm secret arts (weapon-taught).
  // Four instant seats for the knight's roster, one per weapon family:
  // the spear line's founding thrust, the glaive's wheel, the halberd's
  // hook (a PULL — ground_aoe negative knockback per the vortex law,
  // hooking_reap's grammar), and the lance's charge, priced honestly
  // under knights_charge (the L50 rung is the school's; the weapon's
  // cousin is smaller by design).
  {
    id: 'reaching_thrust',
    name: 'Reaching Thrust',
    desc: 'The school\'s first lesson at its full length. Everything begins out of reach.',
    color: '#c8d4e0',
    code: 'Rr',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 8,
    range: 3.6,
    arc: 0.4,
  },
  {
    id: 'reapers_turn',
    name: "Reaper's Turn",
    desc: 'The glaive remembers the harvest. One wide turn, and the row lies down.',
    color: '#aab6a0',
    code: 'Rn',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 9,
    range: 2.7,
    arc: 2.4,
    knockback: 1.5,
  },
  {
    id: 'skullhook',
    name: 'Skullhook',
    desc: 'The hook goes over the collar and the line runs backward. Yours now.',
    color: '#8a94a6',
    code: 'Sk',
    cooldownTicks: 180, // 9 s
    shape: 'ground_aoe',
    damage: 8,
    range: 3.4,
    radius: 1.0,
    fuseTicks: 6,
    knockback: -2.2, // the hook PULLS (the vortex law)
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'couched_charge',
    name: 'Couched Charge',
    desc: 'Set the lance in the crook and spend the road. The arrival signs for you.',
    color: '#d8c48a',
    code: 'Cq',
    cooldownTicks: 180, // 9 s
    shape: 'dash_strike',
    damage: 10,
    dashTiles: 7.0,
    travel: 'charge',
    knockback: 2.0,
  },
];

/** THE POLEARM SECRET SHELF's ranks (its four arts sit above, among the hafts). */
export const POLEARM_SECRET_RANKS: Record<string, Steps> = {
  // --------------------------------------------- polearm, the hafts
  reaching_thrust: [
    { note: 'The point lands heavier.', damage: 10 },
    { note: 'The reach lengthens and the hand asks again sooner.', range: 3.9, cooldownTicks: 140 },
    { note: 'The full extension becomes the whole argument.', damage: 11, cooldownTicks: 132 },
  ],
  reapers_turn: [
    { note: 'The wheel cuts deeper.', damage: 11 },
    { note: 'The turn opens wider and shoves harder.', arc: 2.7, knockback: 1.8 },
    { note: 'The row lies down, and the next row is soon.', damage: 12, cooldownTicks: 152 },
  ],
  skullhook: [
    { note: 'The hook bites deeper.', damage: 10 },
    { note: 'The drag comes harder, and the cold stays in the collar.', knockback: -2.6, status: { status: 'chill', power: 1, durationTicks: 60 } },
    { note: 'What the hook claims, it keeps claiming.', damage: 11, cooldownTicks: 170 },
  ],
  couched_charge: [
    { note: 'The arrival lands heavier.', damage: 12 },
    { note: 'The road runs longer and opens sooner.', dashTiles: 8.0, cooldownTicks: 170 },
    { note: 'The horizon signs the charge by name.', damage: 13, knockback: 2.4 },
  ],
};
